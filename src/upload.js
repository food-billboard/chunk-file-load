import { isArray, flat, isEmpty, isObject, isFunc, isSymbol, getFileType } from './utils/tool'
import Validator from './utils/validator'
import { CACHE_STATUS } from './utils/constant'
import SparkMd5 from 'spark-md5'

const FILES = Symbol('FILES')
const EVENTS = Symbol('EVENTS')
const DEAL_ARGUMENTS = Symbol('DEAL_ARGUMENTS')
const CHUNK_INTERNAL_UPLOAD = Symbol('CHUNK_INTERNAL_UPLOAD')
const DEAL_UPLOAD_CHUNK = Symbol('DEAL_UPLOAD_CHUNK')
const GET_FILE_MD5 = Symbol('GET_FILE_MD5')

function Upload() {
    this.init()
}
Upload.prototype.init = function() {
    //文件缓存
    this[FILES] = {}
    //事件队列
    this[EVENTS] = []
    this.MIN_CHUNK = 1024 * 1024 * 5
}
Upload.prototype.on = function(...tasks) {
    if(isEmpty(tasks)) return []
    let _callback
    let symbolList = []
    let result = []
    //参数验证
    this[DEAL_ARGUMENTS](tasks)(function({data, callback}) {
        _callback = callback
        let validate = new Validator()
        result = data.reduce((acc, d) => {
            if(isObject(d)) {
                Object.keys(d).forEach(t => {
                    validate.add(d[t], t)
                })
                if(validate.validate()) {
                    acc.push(d)
                }
            }
            return acc
        }, [])
    })
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
        activeEmit = [...activeEmit, ...this[EVENTS]]
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
    return Promise.allSettled(activeEmit.map(task => {
        return this[DEAL_UPLOAD_CHUNK](task)
    }))
    .then(res => {
        let rejected = []
        let fulfilled = []
        let stopping = []
        let cancel = []

        res.forEach((result, index) => {
            const { status, reason, value } = result
            let task = activeEmit[index]
            let name = task.symbol
            let fileCache = this[FILES][name]

            //记录失败项
            if(status === 'rejected' || (value && value.err)) {
                let fileStatus = fileCache.status
                switch(fileStatus) {
                    case CACHE_STATUS.rejected: 
                    rejected.push({
                        reason,
                        data: task
                    })
                    break
                    case CACHE_STATUS.stopping:
                    stopping.push({
                        reason: 'stopping',
                        data: task
                    })
                    break
                    case CACHE_STATUS.cancel:
                    cancel.push({
                        reason: 'cancel',
                        data: task
                    })
                }

                //将暂停项重新添加至事件队列中, 其余失败项需要重新手动添加至事件队列中
                if(fileStatus === CACHE_STATUS.stopping) {
                    this[EVENTS].push(task)
                }

            }
            //记录成功项
            else {
                fulfilled.push({
                    value,
                    data: task
                })
            }

            //将执行文件从文件缓存中删除
            delete this[FILES][name]

        })

        activeEmit = null

        return {
            rejected,
            fulfilled,
            stopping,
            cancel
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
        callback && callback(result)
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
    
    callback && callback(result)
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

    callback && callback(result)
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
        const file = this[FILES][name]
        return {
            progress: Number(file.completeChunks.length) / Number(file.chunks.length),
            name
        }
    })
} 

//设置分片大小(只能影响到还未分配分片大小的任务)
Upload.prototype.setChunkSize = function(size) {
    size = Number(size)
    if(typeof size == 'number') {
        this.MIN_CHUNK = size
        return size
    }
    return this.MIN_CHUNK
}

//上传
/**
 * 
 * @param {文件} file 
 * @param {判断后台是否存在文件} exitDataFn 
 * @param {分片上传} uploadFn 
 * @param {上传完成} completeFn
 * @param {回调} callback 
 */
Upload.prototype.upload = function(...tasks) {
    const symbol = this.on(tasks)
    if(!symbol.length) throw new Error('fail upload')
    this.emit(symbol)
    //返回用于控制load的标识符
    return symbol
}

  //处理上传文件分片
  Upload.prototype[DEAL_UPLOAD_CHUNK] = function({file, exitDataFn, uploadFn, completeFn, callback, symbol}) {
    const { name, size } = file
    //添加记录至文件缓存中
    if(!this[FILES][symbol]) {
        this[FILES][symbol] = {
            file,
            symbol,
            chunks: [],
            completeChunks: [],
            watch: false,
            md5: null,
            chunkSize: this.MIN_CHUNK,
            status: CACHE_STATUS.pending
        }
    }
    this[FILES][symbol]['status'] = CACHE_STATUS.doing

    //md5加密
    return this[GET_FILE_MD5](symbol)
    //向后端保存文件的相关信息为后面分片上传做验证准备
    .then(md5 => {
        this[FILES][symbol]['file']['md5'] = md5
        this[FILES][symbol]['md5'] = md5
        //将加密后的文件返回
        return (
            exitDataFn ? 
            isFunc(exitDataFn) && exitDataFn({
                filename: name,
                md5,
                suffix: getFileType(name),
                size,
                chunkSize: this[FILES][symbol]['chunkSize'],
                chunksLength: this[FILES][symbol]['chunks'].length
            })
            : {
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
            if(data) {
                this[CHUNK_INTERNAL_UPLOAD](data, symbol, uploadFn)
                .then(_ => {
                    completeFn ? resolve(completeFn({name: symbol, md5: this[FILES][symbol]['md5']})) : resolve(nextRes)
                })
                .catch(reject)
            }
            //文件存在则直接回调
            else {
                resolve(nextRes)
            }
        })
        .then(data => {
            callback && callback(null, data)
            this[FILES][symbol]['status'] = CACHE_STATUS.fulfilled
            return {
                err: null,
                name: symbol
            }
        })
        .catch(err => {
            callback && callback(err, null)
            const status = this[FILES][symbol].status
            if(status !== CACHE_STATUS.stopping && status !== CACHE_STATUS.cancel ) {
                this[FILES][symbol]['status'] = CACHE_STATUS.rejected
            }
            return {
                err,
                name: symbol
            }
        })
    })
    .catch(err => {
        callback && callback(err, null)
        const status = this[FILES][symbol].status
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
    if(!isArray(unUploadList)) unUploadList = []
    //将已上传的记录存至缓存中
    this[FILES][name]['completeChunks'] = unUploadList
    for(let i = 0; i < this[FILES][name]['chunks'].length; i ++) {
        //处理用户的取消或暂停
        if(this[FILES][name]['status'] === CACHE_STATUS.stopping || this[FILES][name]['status'] === CACHE_STATUS.cancel) return Promise.reject('stop or cancel')
        let formData = new FormData()
        //只上传未上传过的内容
        if(!unUploadList.includes(i+'')) {
            formData.append('file', this[FILES][name]['chunks'][i])
            formData.append('md5', this[FILES][name]['md5'])
            formData.append('index', i)
            this[FILES][name]['completeChunks'].push(i)
            await upload(formData)
        }
    }
    return Promise.resolve()
}

//获取md5
Upload.prototype[GET_FILE_MD5] = function(name) {
    const { file, chunkSize } = this[FILES][name]
    const { size } = file
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