import SparkMd5 from 'spark-md5'
import { 
    flat, 
    isObject, 
    isFunc, 
    isArrayBuffer, 
    isFile, 
    isBlob, 
    isSymbol, 
    isBase64, 
    base64Size, 
    allSettled,
    base64ToArrayBuffer
} from './utils/tool'
import Validator from './utils/validator'
import { CACHE_STATUS, DEFAULT_CONFIG } from './utils/constant'

const FILES = Symbol('FILES')
const EVENTS = Symbol('EVENTS')
const DEAL_ARGUMENTS = Symbol('DEAL_ARGUMENTS')
const CHUNK_INTERNAL_UPLOAD = Symbol('CHUNK_INTERNAL_UPLOAD')
const DEAL_UPLOAD_CHUNK = Symbol('DEAL_UPLOAD_CHUNK')
const GET_FILE_MD5 = Symbol('GET_FILE_MD5')
const GET_BUFFER_MD5 = Symbol('GET_BUFFER_MD5')
const GET_BASE64_MD5 = Symbol('GET_BASE64_MD5')
const FILE_TYPE = Symbol('FILE_TYPE')
const EMIT_UPLOAD_TASKS = Symbol('EMIT_UPLOAD_TASKS')
const GET_MD5 = Symbol('GET_MD5')

function Upload() {
    this.init()
}

Upload.prototype[FILE_TYPE] = function(file) {
    if(isBlob(file)) {
        const { size } = file
        return {
            size,
            name: null,
            file,
            action: this[GET_FILE_MD5]
        }
    }else if(isFile(file)) {
        const { size, name } = file
        return {
            size,
            name,
            file,
            action: this[GET_FILE_MD5]
        }
    }else if(isArrayBuffer(file)) {
        const len = file.byteLength
        return {
            size: len,
            name: null,
            file,
            action: this[GET_BUFFER_MD5]
        }
    }else if(isBase64(file)) {
        return {
            size: base64Size(file),
            name: null,
            file,
            action: this[GET_BASE64_MD5]
        }
    }else {
        return {
            size: 0,
            name: null,
            file: null,
            action: this[GET_MD5]
        }
    }
}
Upload.prototype[FILES] = {}
Upload.prototype[EVENTS] = []
Upload.prototype.init = function() {
    //文件缓存
    this[FILES] = {}
    //事件队列
    this[EVENTS] = []
}
Upload.prototype.on = function(...tasks) {
    if(!tasks.length) return []
    let _callback
    let symbolList = []
    let result = []
    const that = this
    //参数验证
    this[DEAL_ARGUMENTS](tasks)(function({data, callback}) {
        _callback = callback
        let validate = new Validator()
        result = data.reduce((acc, d) => {
            if(isObject(d)) {
                Object.keys(d).forEach(t => {
                    validate.add(d[t], t, d)
                })
                if(validate.validate()) {
                    const { config={}, file, mime, ...nextD } = d
                    acc.push({
                        ...nextD,
                        mime: mime ? mime : file.type,
                        file: that[FILE_TYPE](file),
                        config: {
                            ...DEFAULT_CONFIG,
                            ...config,
                        }
                    })
                }else {
                    console.warn(d, 'the params is not verify')
                }
            }
            return acc
        }, [])
    })

    //加入事件队列
    this[EVENTS] = [ ...this[EVENTS], ...(result.map(r => {
        let symbol = Symbol()
        symbolList.push(symbol)
        return {
            symbol,
            ...r
        }
    })) ]
    //返回成功项
    _callback && _callback(result.length)
    return symbolList
}
//发布
Upload.prototype.emit = function(...tasks) {
    //收集需要触发的任务
    let activeEmit = []
    if(!tasks.length) {
        activeEmit = [ ...this[EVENTS] ]
        this[EVENTS] = []
    }else {
        let newTasks = flat(tasks)
        let restEmit = []
        //筛选需要执行的任务
        this[EVENTS].forEach(task => {
            const { symbol } = task
            if(newTasks.includes(symbol)) {
                activeEmit.push(task)
            }else {
                restEmit.push(task)
            }
        })
        this[EVENTS] = [...restEmit]
        restEmit = null
    }

    //处理任务
    return this[EMIT_UPLOAD_TASKS](...activeEmit)

}
//任务执行
Upload.prototype[EMIT_UPLOAD_TASKS] = function(...tasks) {

    return allSettled(tasks.map(task => {
        return this[DEAL_UPLOAD_CHUNK](task)
    }))
    .then(res => {
        let rejected = []
        let fulfilled = []
        let stopping = []
        let cancel = []
        let retry = []
        let retryRejected = []
        res.forEach((result, index) => {
            const { value } = result
            const { name, err } = value
            let task = tasks[index]
            let fileCache = this[FILES][name]
            const { status } = fileCache

            switch(status) {
                case CACHE_STATUS.rejected: 
                const { config = {} } = task
                const { retry:isRetry, retryTimes } = config
                if(isRetry && retryTimes > 0) {
                    const newTask = {
                        ...task,
                        retry: true,
                        config: {
                            ...config,
                            retry: retryTimes - 1 > 0,
                            retryTimes: retryTimes - 1
                        }
                    }
                    this[EVENTS].push(newTask)
                    retry.push(newTask)
                    retryRejected.push({
                        reason: 'retry',
                        data: task
                    })
                }
                rejected.push({
                    reason: err,
                    data: task
                })
                break
                case CACHE_STATUS.stopping:
                stopping.push({
                    reason: 'stopping',
                    data: task
                })
                this[EVENTS].push(task)
                break
                case CACHE_STATUS.cancel:
                cancel.push({
                    reason: 'cancel',
                    data: task
                })
                default: fulfilled.push({
                    value,
                    data: task
                })
            }

            //将执行文件从文件缓存中删除
            delete this[FILES][name]

        })

        //重试
        if(!!retry.length) {
            this.emit(...retry)
        }

        return {
            retry: retryRejected,
            rejected,
            fulfilled,
            stopping,
            cancel,
        }
    })
}
//取消监听(不能取消正在执行的任务)
Upload.prototype.cancelEmit = function(...tasks) {
    let result = []
    if(!tasks.length) {
        result = [ ...this[EVENTS] ]
        this[EVENTS] = []
        return result
    }else {
        //参数筛选
        let rest = []
        const { callback, data:newTasks } = this[DEAL_ARGUMENTS](tasks)()
        this[EVENTS].forEach(event => {
            const { symbol } = event
            if(newTasks.includes(symbol)) {
                result.push(symbol)
            }else {
                rest.push(event)
            }
        })

        this[EVENTS] = [ ...rest ]
        //执行回调并返回剩余队列中的事件数量
        isFunc(callback) && callback(result)
        return result
    }

}
//剩余参数处理
Upload.prototype[DEAL_ARGUMENTS] = function(args, callbackLast=true) {
    let _args = [...args]
    _args = flat(_args)
    let callback
    if(callbackLast) {
        let last = _args.slice(_args.length - 1)
        callback = isFunc(last) ? last : null
        _args = isFunc(last) ? _args.slice(0, _args.length - 1) : _args
    }else {
        callback = null
    }
    return function(validate) {
        if(isFunc(validate)) {
            return validate({ data: _args, callback })
        }else {
            return { data: _args, callback }
        }
    }
}

//开始任务(需要本身存在于队列中, 对于正在进行上传的任务不产生影响)返回开始上传和下载的数量
Upload.prototype.start = function(...tasks) {
    let result = []
    //全部开始
    if(!tasks.length) {
        result = this[EVENTS]
    }else {
        result = [...tasks]
    }

    this.emit(result)
}

//暂停任务(暂停的项目为存在于文件缓存中的内容)
Upload.prototype.stop = function(...names) {
    let result = []
    const files = this[FILES]
    const { callback, data:newNames } = this[DEAL_ARGUMENTS](names)()
    Object.getOwnPropertySymbols(files).forEach(name => {
        if(newNames.includes(name)) {
            result.push(name)
            this[FILES][name].status = CACHE_STATUS.stopping
        }
    })
    
    isFunc(callback) && callback(result)
    return result
}

//取消任务(取消的项目为存在于文件缓存中的内容)
Upload.prototype.cancel = function(...names) {
    let result = []
    const { callback, data:newNames } = this[DEAL_ARGUMENTS](names)()
    Object.getOwnPropertySymbols(this[FILES]).forEach(name => {
        if(newNames.includes(name)) {
            result.push(name)
            this[FILES][name].status = CACHE_STATUS.cancel
        }
    })

    isFunc(callback) && callback(result)
    return result
}

//监听文件load进度
Upload.prototype.watch = function(...names) {
    let newNames = []
    const originNames = Object.getOwnPropertySymbols(this[FILES])
    if(!names.length) {
        newNames = [...originNames]
    }else {
        newNames = flat(names).filter(name => isSymbol(name) && originNames.includes(name))
    }
    return newNames.map(name => {
        const { chunks, completeChunks, retry: retrying, config: { retry, retryTimes } = {} } = this[FILES][name]
        return {
            progress: Number(completeChunks.length) / Number(chunks.length),
            name,
            ...((retry && retrying) ? { retry: {
                times: retryTimes
            } } : {})
        }
    })
} 

//上传
/**
 * @param {文件} file 
 * @param {mime类型} mime?
 * @param {上传配置} config?
 * @param {判断后台是否存在文件} exitDataFn 
 * @param {分片上传} uploadFn 
 * @param {上传完成} completeFn
 * @param {回调} callback 
 * 
 * return [symbol, uploadResult]
 */
Upload.prototype.upload = function(...tasks) {
    const symbol = this.on(tasks)
    if(Array.isArray(symbol) && !!symbol.length) {
        return Promise.all([
            symbol,
            this.emit(symbol)
        ])
    }
    return Promise.reject('fail upload')
}

//处理上传文件分片(文件分片预先完成)，相当于emit
Upload.prototype.uploading = function(...tasks) {
    return this.upload(...tasks.map(task => ({ ...task, _cp_: true })))
}

//处理上传文件分片
Upload.prototype[DEAL_UPLOAD_CHUNK] = function(task) {
    const { file:wrapperFile, mime, chunks, _cp_, exitDataFn, uploadFn, completeFn, callback, symbol, config: { chunkSize, retry, retyrTimes } } = task
    const { name, size, file, action } = wrapperFile
    //添加记录至文件缓存中
    if(!this[FILES][symbol]) {
        this[FILES][symbol] = {
            mime,
            file,
            name,
            size,
            symbol,
            chunks: chunks || [],
            completeChunks: [],
            watch: false,
            md5: null,
            chunkSize,
            status: CACHE_STATUS.pending,
            retry,
            retyrTimes,
            _cp_: !!_cp_
        }
    }
    this[FILES][symbol]['status'] = CACHE_STATUS.doing
    //md5加密
    return action.call(this, symbol)
    //向后端保存文件的相关信息为后面分片上传做验证准备
    .then(async (md5) => {
        // this[FILES][symbol]['file']['md5'] = md5
        this[FILES][symbol]['md5'] = md5
        //将加密后的文件返回
        return (
            isFunc(exitDataFn) 
            ? exitDataFn({
                filename: name,
                md5,
                suffix: mime,
                size,
                chunkSize: this[FILES][symbol]['chunkSize'],
                chunksLength: this[FILES][symbol]['chunks'].length
            })
            : 
            {
                data: []
            }
        )
    })
    //分片上传
    .then(res => {
        /**
         * 列表展示为未上传的部分
         * data: {
         *  list: [每一分片的索引]
         * }
         */
        const { data, ...nextRes } = res
        return new Promise((resolve, reject) => {
            //后台不存在当前文件的情况下上传
            if(Array.isArray(data) && data.length !== 0) {
                this[CHUNK_INTERNAL_UPLOAD](data, symbol, uploadFn)
                .then(_ => {
                    return isFunc(completeFn) ? resolve(completeFn({name: symbol, md5: this[FILES][symbol]['md5']})) : resolve(nextRes)
                })
            }
            //文件存在则直接回调
            else {
                resolve(nextRes)
            }
        })
    })
    .then(data => {
        isFunc(callback) && callback(null, data)
        this[FILES][symbol]['status'] = CACHE_STATUS.fulfilled
        return {
            err: null,
            name: symbol
        }
    })
    .catch(err => {
        isFunc(callback) && callback(err, null)
        const status = this[FILES][symbol].status
        //非人为主动错误
        if(status !== CACHE_STATUS.stopping && status !== CACHE_STATUS.cancel ) {
            this[FILES][symbol]['status'] = CACHE_STATUS.rejected
        }
        return {
            err,
            name: symbol
        }
    })
}

//分片上传
Upload.prototype[CHUNK_INTERNAL_UPLOAD] = async function (unUploadList, name, upload) {
    if(!Array.isArray(unUploadList)) unUploadList = []
    //将已上传的记录存至缓存中
    this[FILES][name]['completeChunks'] = unUploadList.map(item => parseInt(item)).filter(item => !Number.isNaN(item) && item >= 0)
    for(let i = 0; i < this[FILES][name]['chunks'].length; i ++) {
        //处理用户的取消或暂停
        if(this[FILES][name]['status'] === CACHE_STATUS.stopping || this[FILES][name]['status'] === CACHE_STATUS.cancel) return Promise.reject('stop or cancel')

        //只上传未上传过的内容
        if(!unUploadList.some(item => item == i)) {
            const params = {
                file: this[FILES][name]['chunks'][i],
                md5: this[FILES][name]['md5'],
                index: i,
            }
            let formData
            if(window && window.FormData) {
                formData = new FormData()
                Object.keys(params).forEach(key => {
                    formData.append(key, params[key])
                })
            }else {
                formData = params
            }

            this[FILES][name]['completeChunks'].push(i)
            await upload(formData)
        }
    }
    return Promise.resolve()
}

//获取MD5
Upload.prototype[GET_MD5] = function(name) {

}

//获取base64的MD5
Upload.prototype[GET_BASE64_MD5] = function() {

    if(!this[FILES][name]) return Promise.reject('task not found')
    const { file, chunkSize } = this[FILES][name]
    const { size } = file
    let currentChunk = 0,
        totalChunks = Math.ceil(size / chunkSize),
        spark = new SparkMd5.ArrayBuffer(),
        bufferSlice = ArrayBuffer.prototype.slice,
        bufferFile = base64ToArrayBuffer(file)
    while(currentChunk < totalChunks) {
        let start = currentChunk * chunkSize,
            end = currentChunk + 1 === totalChunks ? size : ( currentChunk + 1 ) * chunkSize
        const chunks = bufferSlice.call(bufferFile, start, end)
        this[FILES][name]['chunks'].push(new Blob([chunks]))
        currentChunk ++
        spark.append(chunks)
    }
    return Promise.resolve(spark.end())

}

//获取arraybuffer类型md5
Upload.prototype[GET_BUFFER_MD5] = function(name) {
    if(!this[FILES][name]) return Promise.reject('task not found')
    const { file, chunkSize, size } = this[FILES][name]
    let currentChunk = 0,
        totalChunks = Math.ceil(size / chunkSize),
        spark = new SparkMd5.ArrayBuffer(),
        bufferSlice = ArrayBuffer.prototype.slice
    while(currentChunk < totalChunks) {
        let start = currentChunk * chunkSize,
            end = currentChunk + 1 === totalChunks ? size : ( currentChunk + 1 ) * chunkSize
        const chunks = bufferSlice.call(file, start, end)
        this[FILES][name]['chunks'].push(new Blob([chunks]))
        currentChunk ++
        spark.append(chunks)
    }
    return Promise.resolve(spark.end())
}

//获取文件md5
Upload.prototype[GET_FILE_MD5] = function(name) {
    if(!this[FILES][name]) return Promise.reject('task not found')
    const { file, chunkSize, size } = this[FILES][name]
    const that = this

    let currentChunk = 0,
        fileReader = new FileReader(),
        totalChunks = Math.ceil(size / chunkSize),
        spark = new SparkMd5.ArrayBuffer(),
        fileSlice = File.prototype.slice
    return new Promise((resolve, reject) => {

        fileReader.onload = (e) => {
            if(!e.target) return
            //添加读取的内容
            spark.append(e.target.result)
            currentChunk ++
            //继续读取
            if(currentChunk < totalChunks) {
                loadNext()
            }
            //读取完毕
            else {
                resolve(spark.end())
            }
        }

        //错误处理
        fileReader.onerror = reject

        //文件内容读取
        function loadNext() {
            let start = currentChunk * chunkSize,
                end = currentChunk + 1 === totalChunks ? size : (currentChunk + 1) * chunkSize
            const chunks = fileSlice.call(file, start, end)
            that[FILES][name]['chunks'].push(chunks)
            fileReader.readAsArrayBuffer(chunks)
        }

        loadNext()

    })

}

export default Upload