import SparkMd5 from 'spark-md5'
import { 
    flat, 
    isObject, 
    isArrayBuffer, 
    isFile, 
    isBlob, 
    isBase64, 
    base64Size, 
    allSettled,
    base64ToArrayBuffer as internalBase64ToArrayBuffer, 
    arrayBufferToBase64 as internalArrayBufferToBase64
} from '../utils/tool'
import Validator from '../utils/validator'
import { ECACHE_STATUS, DEFAULT_CONFIG, MAX_FILE_CHUNK } from '../utils/constant'
import { 
    TFailEmitReturnType, 
    TRejectEmitReturnType, 
    TSuccessReturnType, 
    TEmitReturnType,
    TFiles,
    TFileType,
    TEvents,
    TUploadFormData,
    TUploadFn,
    TLifecycle,
    Ttask,
    TWraperFile
} from './index.d'

class Upload {

    #Blob: boolean = false

    #FileReader: boolean = false

    #ArrayBuffer: boolean = false

    #File: boolean = false

    #Btoa: boolean | Function = false

    #Atob: boolean | Function = false

    #lifecycle:TLifecycle = {}

    #FILES:TFiles[] = []

    #EVENTS: Array<TEvents> = []

    constructor({
        base64ToArrayBuffer,
        arrayBufferToBase64,
        lifecycle
    }: {
        base64ToArrayBuffer?: (data: string) => ArrayBuffer
        arrayBufferToBase64?: (data: ArrayBuffer) => string
        lifecycle?: TLifecycle
    }={}) {
        this.init()
        this.SUPPORT_CHECK({ base64ToArrayBuffer, arrayBufferToBase64 })
        this.#lifecycle = lifecycle || {}
    }

    private SUPPORT_CHECK({ base64ToArrayBuffer, arrayBufferToBase64 }: {
        base64ToArrayBuffer?: (data: string) => ArrayBuffer
        arrayBufferToBase64?: (data: ArrayBuffer) => string
    }) {
        allSettled([
            new Promise((resolve) => {
                resolve(this.#Blob = !!Blob)
            }),
            new Promise((resolve) => {
                resolve(this.#FileReader = !!FileReader)
            }),
            new Promise((resolve) => {
                resolve(this.#ArrayBuffer = !!ArrayBuffer)
            }),
            new Promise((resolve) => {
                resolve(this.#File = !!File)
            }),
            new Promise((resolve) => {
                resolve(this.#Btoa = !!arrayBufferToBase64 ? arrayBufferToBase64 : (!!btoa ? internalArrayBufferToBase64 : false))
            }),
            new Promise((resolve) => {
                resolve(this.#Atob = !!base64ToArrayBuffer ? base64ToArrayBuffer : (!!atob ? internalBase64ToArrayBuffer : false))
            })
        ])
        .then(_ => {
            let notSupport:string[] = []
            if(!this.#Blob) {
                notSupport.push('Blob')
            }
            if(!this.#FileReader) {
                notSupport.push('FileReader')
            }
            if(!this.#ArrayBuffer) {
                notSupport.push('ArrayBuffer')
            }
            if(!this.#File) {
                notSupport.push('File')
            }
            if(!this.#Btoa) {
                notSupport.push('btoa')
            }
            if(!this.#Atob) {
                notSupport.push('atob')
            }

            if(!this.#ArrayBuffer) throw new Error('this tool must be support for the ArrayBuffer')
            
            if(!!notSupport.length) console.warn('these api is not support: ', notSupport.join(','))
        })
    }

    public init(): void {
        this.cancelEmit()
        this.cancel()
    }

    //获取文件信息
    private FILE_TYPE(file: any): TWraperFile {
        if(isBlob(file)) {
            return {
                size: file?.size || 0,
                name: null,
                file,
                action: (name:Symbol): Promise<string> => {
                    if(!this.#Blob || !this.#FileReader || !this.#File ) {
                        console.warn('this environment is not support')
                        return Promise.reject('this environment is not support')
                    }
                    return this.GET_FILE_MD5(name)
                }
            }
        }else if(isFile(file)) {

            return {
                size: file?.size || 0,
                name: file?.name || null,
                file,
                action: (name: Symbol): Promise<string> => {
                    if(!this.#Blob || !this.#FileReader || !this.#File ) {
                        console.warn('this environment is not support')
                        return Promise.reject('this environment is not support')
                    }
                    return this.GET_FILE_MD5(name)
                }
            }
        }else if(isArrayBuffer(file)) {
            return {
                size: file?.byteLength || 0,
                name: null,
                file,
                action: (name: Symbol): Promise<string> => {
                    console.log(this.#Blob, this.#Btoa)
                    if(!this.#Blob && !this.#Btoa) {
                        console.warn('this environment is not support')
                        return Promise.reject('this environment is not support')
                    }
                    return this.GET_BUFFER_MD5(name)
                }
            }
        }else if(isBase64(file)) {
            return {
                size: base64Size(file),
                name: null,
                file,
                action: (name: Symbol): Promise<string> => {
                    if(!this.#Blob && !this.#Atob) {
                        console.warn('this environment is not support')
                        return Promise.reject('this environment is not support')
                    }
                    return this.GET_BASE64_MD5(name)
                }
            }
        }else {
            return {
                size: 0,
                name: null,
                file: null,
                action: this.GET_MD5
            }
        }
    }

    public on(...tasks: Array<Ttask<TFileType>>): Array<Symbol> {
        if(!tasks.length) return []
        let symbolList: Array<Symbol> = []
        let result: Array<Ttask<TWraperFile>> = []
        const that = this
        let validate
        result = flat(tasks).map((item: Ttask<TFileType>) => {
            const { chunks } = item
            if(!!chunks) {
                return {
                    ...item,
                    _cp_: true
                }
            }
            return item
        }).reduce((acc: Array<Ttask<TWraperFile>>, d: Ttask<TFileType>) => {
            if(isObject(d)) {
                //参数验证
                validate = new Validator()
                // Object.keys(d).forEach((t: any ) => {
                //     validate.add(d[t], t, d)
                // })
                validate.add(d)
                const valid = validate.validate()
                if(valid === true) {
                    const { config={}, file, mime, lifecycle, ...nextD } = d
                    acc.push({
                        ...nextD,
                        lifecycle: lifecycle || {},
                        mime: mime ? mime : (typeof file === 'string' || file instanceof ArrayBuffer ? undefined : file?.type),
                        file: that.FILE_TYPE(file),
                        config: {
                            ...DEFAULT_CONFIG,
                            ...config,
                        }
                    })
                }else {
                    console.warn(`the params ${typeof valid == 'string' ? valid : ''} is not verify`)
                }
            }
            return acc
        }, [])
    
        //加入事件队列
        this.#EVENTS = [ ...this.#EVENTS, ...(result.map(r => {
            const symbol: unique symbol = Symbol()
            symbolList.push(symbol)
            return {
                symbol,
                ...r
            }
        })) ]

        return symbolList
    }

    //发布
    public emit(...names: Array<Symbol>): Promise<TEmitReturnType> {
        //收集需要触发的任务
        let activeEmit: Array<TEvents> = []
        if(!names.length) {
            activeEmit = [ ...this.#EVENTS ]
            this.#EVENTS = []
        }else {
            let newTasks: Symbol[] = flat(names)
            let restEmit: TEvents[] = []
            //筛选需要执行的任务
            this.#EVENTS.forEach((task: TEvents) => {
                const { symbol } = task
                if(newTasks.includes(symbol)) {
                    activeEmit.push(task)
                }else {
                    restEmit.push(task)
                }
            })
            this.#EVENTS = [...restEmit]
        }

        //处理任务
        return this.EMIT_UPLOAD_TASKS(...activeEmit)

    }

    //执行声明周期
    private LIFECYCLE_EMIT = async (lifecycle: keyof TLifecycle, params: {
        name: Symbol
        [key: string]: any
    }): Promise<any> => {
        let returnValue: any
        const { name } = params
        const [file] = this.GET_TARGET_FILE(name)
        if(!file) return
        const globalLifecycle = this.#lifecycle[lifecycle]
        const templateLifecycle = file.lifecycle[lifecycle]
        if(typeof globalLifecycle === 'function') {
            try {
                returnValue = await globalLifecycle.bind(this)({
                    ...params,
                    task: file
                })
            }catch(err) {
                console.error(err)
            }
        }
        if(typeof templateLifecycle === 'function') {
            try {
                returnValue = await templateLifecycle.bind(this)(
                    {
                        ...params,
                        task: file
                    }
                )
            }catch(err) {
                console.error(err)
            }
        }

        return returnValue
    }

    //获取指定任务
    private GET_TARGET_FILE(name: Symbol):[TFiles | false, number | null] {
        const index = this.#FILES.findIndex((file: TFiles) => {
            const { symbol } = file
            return name === symbol
        })
        if(!~index) return [false, null]
        return [this.#FILES[index], index]
    }

    //任务执行
    private EMIT_UPLOAD_TASKS(...tasks: TEvents[]): Promise<TEmitReturnType> {

        return allSettled(tasks.map((task: TEvents) => {
            return this.DEAL_UPLOAD_CHUNK(task)
        }))
        .then(async (res) => {
            let rejected: TRejectEmitReturnType[] = []
            let fulfilled: TSuccessReturnType[] = []
            let stopping: TFailEmitReturnType[] = []
            let cancel: TFailEmitReturnType[] = []
            let retry: Symbol[] = []
            let history: Partial<TEmitReturnType> = {}

            res.forEach(async (result: any, index: number) => {
                const { value } = result
                const { name, err } = value
                let task: TEvents = tasks[index]
                let [fileCache]: [TFiles | false, number | null] = this.GET_TARGET_FILE(name)

                if(fileCache) {
                    const { status }:{ status: ECACHE_STATUS } = fileCache

                    switch(status) {
                        case ECACHE_STATUS.rejected: 
                            const { config = {}, symbol } = task
                            const { retry:retfyConfig, ...nextConfig } = config
                            if(!!retfyConfig && retfyConfig.times > 0) {
                                const times = retfyConfig.times - 1
                                const newTask: TEvents = {
                                    ...task,
                                    // retry: true,
                                    config: {
                                        ...nextConfig,
                                        ...(times > 0 ? { retry: { times } } : {})
                                    }
                                }
                                this.#EVENTS.push(newTask)
                                retry.push(symbol)
                                await this.LIFECYCLE_EMIT('retry', {
                                    name
                                })
                            }else {
                                rejected.push({
                                    reason: `${err} and retry times is empty`,
                                    data: task
                                })
                            }
                            break
                        case ECACHE_STATUS.stopping:
                            stopping.push({
                                reason: 'stopping',
                                data: task
                            })
                            this.#EVENTS.push(task)
                            break
                        case ECACHE_STATUS.cancel:
                            cancel.push({
                                reason: 'cancel',
                                data: task
                            })
                            break
                        default: fulfilled.push({
                            value,
                            data: task
                        })
                    }
                }else {
                    rejected.push({
                        reason: 'not found',
                        data: null
                    })  
                }

            })

            //将执行文件从文件缓存中删除
            this.#FILES = []

            //重试
            if(!!retry.length) {
                history = await this.emit(...retry)
            }

            return {
                rejected: [
                    ...rejected,
                    ...(history.rejected || []).filter((item: TRejectEmitReturnType) => {
                        return !rejected.some((reject: TRejectEmitReturnType) => reject.data?.symbol == item.data?.symbol)
                    })
                ],
                fulfilled: [
                    ...fulfilled,
                    ...(history.fulfilled || []).filter((item: TSuccessReturnType) => {
                        return !fulfilled.some((fulfill: TSuccessReturnType) => fulfill.data?.symbol == item.data?.symbol)
                    })
                ],
                stopping: [
                    ...stopping,
                    ...(history.stopping || []).filter((item: TFailEmitReturnType) => {
                        return !stopping.some((stop: TFailEmitReturnType) => stop.data?.symbol == item.data?.symbol)
                    })
                ],
                cancel: [
                    ...cancel,
                    ...(history.cancel || []).filter((item: TFailEmitReturnType) => {
                        return !cancel.some((canc: TFailEmitReturnType) => canc.data?.symbol == item.data?.symbol)
                    })
                ],
            }
        })
        .catch(err => {
            console.error(err)
            return {
                fulfilled: [],
                stopping: [],
                cancel: [],
                rejected: []
            }
        })

    }

    //取消监听(不能取消正在执行的任务)
    public cancelEmit(...names: Symbol[]): Symbol[] {
        let result: Symbol[] = []
        if(!names.length) {
            result = [ ...this.#EVENTS.map((event: TEvents) => event.symbol) ]
            this.#EVENTS = []
            return result
        }else {
            //参数筛选
            let rest: TEvents[] = []
            const newTasks = flat(names)
            this.#EVENTS.forEach((event: TEvents) => {
                const { symbol } = event
                if(newTasks.includes(symbol)) {
                    result.push(symbol)
                }else {
                    rest.push(event)
                }
            })

            this.#EVENTS = [ ...rest ]

            return result
        }

    }

    //开始任务(需要本身存在于队列中, 对于正在进行上传的任务不产生影响)返回开始上传和下载的数量
    public start(...names: Symbol[]): Promise<TEmitReturnType> {
        let result: Symbol[] = []
        //全部开始
        if(!names.length) {
            result = this.#EVENTS.map((event: TEvents) => event.symbol)
        }else {
            result = [...names]
        }

        return this.emit(...result)
    }

    //暂停任务(暂停的项目为存在于文件缓存中的内容)
    public stop(...names: Symbol[]): Symbol[] {
        let result: Symbol[] = []
        const files: TFiles[] = this.#FILES
        const newNames = flat(names)
        files.forEach((file: TFiles) => {
            const { symbol } = file
            const index = newNames.indexOf(symbol)
            if(!!~index) {
                result.push(symbol)
                const target = this.#FILES[index]
                this.#FILES.splice(index, 1, {
                    ...target,
                    status: ECACHE_STATUS.stopping
                })
            }
        })
        
        return result
    }

    //取消任务(取消的项目为存在于文件缓存中的内容)
    public cancel(...names: Symbol[]): Symbol[] {
        let result: Symbol[] = []
        const files: TFiles[] = this.#FILES
        const newNames = flat(names)
        files.forEach((file: TFiles) => {
            const { symbol } = file
            const index = newNames.indexOf(symbol)
            if(!!~index) {
                result.push(symbol)
                const target = this.#FILES[index]
                this.#FILES.splice(index, 1, {
                    ...target,
                    status: ECACHE_STATUS.cancel
                })
            }
        })

        return result
    }

    //监听文件load进度
    public watch(...names: Symbol[]): Array<{ progress: number, name: Symbol } | null> {
        let newNames:Symbol[] = []
        const originNames: Symbol[] = this.#FILES.map((file: TFiles) => file.symbol)
        if(!names.length) {
            newNames = [...originNames]
        }else {
            newNames = flat(names).filter(name => typeof name === 'symbol' && originNames.includes(name))
        }
        return newNames.map((name: Symbol) => {
            const [files]: [TFiles | false, number | null] = this.GET_TARGET_FILE(name)
            if(!files) return null
            const { chunks, completeChunks, retry: retrying, retry } = files
            return {
                progress: Number(completeChunks.length) / Number(chunks.length),
                name,
                // ...((retry && retrying) ? { retry: {
                //     times: retryTimes
                // } } : {})
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
    public upload(...tasks: Ttask<TFileType>[]): Promise<string | [Array<Symbol>, TEmitReturnType]> {
        const symbol = this.on(...tasks)
        if(Array.isArray(symbol) && !!symbol.length) {
            return Promise.all([
                symbol,
                this.emit(...symbol)
            ])
        }
        return Promise.reject('fail upload')
    }

    //处理上传文件分片(文件分片预先完成)，相当于emit
    public uploading(...tasks: Ttask<TFileType>[]): Promise<string | [Array<Symbol>, TEmitReturnType]>  {
        return this.upload(...tasks.map((task: Ttask<TFileType>) => ({ ...task, _cp_: true })))
    }

    //处理上传文件分片
    private async DEAL_UPLOAD_CHUNK(task: TEvents<TWraperFile>): Promise<{ err: any, name: Symbol }> {
        const { file:wrapperFile, mime, chunks, _cp_, exitDataFn, uploadFn, completeFn, callback, symbol, config: { chunkSize, retry }, md5, lifecycle } = task
        const { name, size, file, action } = wrapperFile
        let index:number = this.#FILES.findIndex((file: TFiles) => file.symbol == symbol)
        //添加记录至文件缓存中
        if(!~index) {
            this.#FILES.push({
                mime,
                file,
                name,
                size,
                symbol,
                chunks: chunks || [],
                completeChunks: [],
                watch: () => {
                    return (this.watch(symbol) || [])[0]
                },
                md5: md5 || '',
                chunkSize: chunkSize || MAX_FILE_CHUNK,
                status: ECACHE_STATUS.pending,
                retry: !!retry ? retry : false,
                _cp_: !!_cp_,
                lifecycle
            })
            index = this.#FILES.length - 1
        }
        this.#FILES[index].status = ECACHE_STATUS.doing

        await this.LIFECYCLE_EMIT('beforeRead', { name: symbol })

        //md5加密
        return action.call(this, symbol)
        //向后端保存文件的相关信息为后面分片上传做验证准备
        .then(async (md5: string): Promise<{ data: Array<string | number>, [key: string]: any }> => {
            this.#FILES[index].md5 = md5
            
            const returnValue = await this.LIFECYCLE_EMIT('beforeCheck', { name: symbol })

            if(typeof returnValue === 'boolean' && !returnValue) {
                this.stop(symbol)
                return Promise.reject('before check stop')
            }

            //将加密后的文件返回
            return (
                typeof exitDataFn === 'function' 
                ? exitDataFn({
                    filename: name || '',
                    md5,
                    suffix: mime || '',
                    size,
                    chunkSize: this.#FILES[index].chunkSize,
                    chunksLength: this.#FILES[index].chunks.length
                })
                : 
                {
                    data: []
                }
            )
        })
        //分片上传
        .then(async (res: { data: Array<string | number> | false, [key: string]: any }) => {
            /**
             * 列表展示为未上传的部分
             * data: {
             *  list: [每一分片的索引]
             * }
             */
            const { data, ...nextRes } = res || {}

            const isExists = data === false

            await this.LIFECYCLE_EMIT('afterCheck', { name: symbol, isExists })

            //后台不存在当前文件的情况下上传
            if(!isExists) {
                return this.CHUNK_INTERNAL_UPLOAD(Array.isArray(data) ? data : [], symbol, uploadFn)
                .then(async (_) => {
                    const { md5 } = this.#FILES[index]
                    await this.LIFECYCLE_EMIT('beforeComplete', {name: symbol, isExists: false})
                    return typeof completeFn === 'function' ? completeFn({name: symbol, md5 }) : nextRes
                })
            }
            //文件存在则直接回调
            else {
                await this.LIFECYCLE_EMIT('beforeComplete', {name: symbol, isExists: true})
                return nextRes
            }
            
        })
        .then(async (data) => {
            typeof callback === 'function' && callback(null, data)
            this.#FILES[index].status = ECACHE_STATUS.fulfilled
            await this.LIFECYCLE_EMIT('afterComplete',{ name: symbol, success: true })
            return {
                err: null,
                name: symbol
            }
        })
        .catch(async (err) => {
            typeof callback === 'function' && callback(err, null)
            const { status, symbol } = this.#FILES[index]
            //非人为主动错误
            if(status !== ECACHE_STATUS.stopping && status !== ECACHE_STATUS.cancel ) {
                this.#FILES[index].status = ECACHE_STATUS.rejected
            }
            await this.LIFECYCLE_EMIT('afterComplete',{ name: symbol, success: false })
            return {
                err,
                name: symbol
            }
        })
    }

    //分片上传
    private async CHUNK_INTERNAL_UPLOAD(unUploadList: Array<string | number>, name: Symbol, upload: TUploadFn): Promise<any> {
        if(!Array.isArray(unUploadList)) unUploadList = []
        //将已上传的记录存至缓存中
        const [, fileIndex]: [TFiles | false, number | null] = this.GET_TARGET_FILE(name)

        const returnValue = await this.LIFECYCLE_EMIT('beforeUpload', { name })

        if(typeof returnValue === 'boolean' && !returnValue) this.stop(name)

        if(fileIndex == null) {
            await this.LIFECYCLE_EMIT('afterUpload', { name, index: -1, success: false })
            return Promise.reject('file not found')
        }else {
            this.#FILES[fileIndex].completeChunks = unUploadList.map(item => Number(item)).filter(item => !Number.isNaN(item) && item >= 0)
            for(let i = 0; i < this.#FILES[fileIndex].chunks.length; i ++) {
                //处理用户的取消或暂停
                if(this.#FILES[fileIndex].status === ECACHE_STATUS.stopping || this.#FILES[fileIndex].status === ECACHE_STATUS.cancel) {
                    if(this.#FILES[fileIndex].status === ECACHE_STATUS.stopping) await this.LIFECYCLE_EMIT('afterStop', { name, index: fileIndex })
                    if(this.#FILES[fileIndex].status === ECACHE_STATUS.cancel) await this.LIFECYCLE_EMIT('afterCancel', { name, index: fileIndex })
                    await this.LIFECYCLE_EMIT('afterUpload', { name, index: fileIndex, success: false })
                    return Promise.reject('stop or cancel')
                }
    
                //只上传未上传过的内容
                if(!unUploadList.some(item => item == i)) {
                    const params: TUploadFormData = {
                        file: this.#FILES[fileIndex].chunks[i],
                        md5: this.#FILES[fileIndex].md5,
                        index: i,
                    }
                    let formData: any
                    if(window && window.FormData) {
                        formData = new FormData()
                        Object.keys(params).forEach((key: string) => {
                            formData.append(key, params[key])
                        })
                    }else {
                        formData = params
                    }
    
                    this.#FILES[fileIndex].completeChunks.push(i)

                    try {
                        await upload.call(this, formData) 
                    }catch(err) {
                        await this.LIFECYCLE_EMIT('afterUpload', { name, index: i, success: false })
                        return Promise.reject(err)
                    }
                    
                    await this.LIFECYCLE_EMIT('afterUpload', { name, index: i, success: true })
                }
            }
            return Promise.resolve()
        }
    }

    //获取MD5(分片已预先完成)
    private async GET_MD5(name: Symbol): Promise<string> {

        const [, index]:[TFiles | false, number | null] = this.GET_TARGET_FILE(name)

        if(index == null) return Promise.reject('task not found')

        const { chunks, chunkSize, md5 } = this.#FILES[index]

        let newChunks = []
        let singleChunkVerify: boolean = true
        let fileReader:FileReader
        let verify:boolean = true
        let spark: any = new SparkMd5.ArrayBuffer()
        let existsMdt = !!md5.length
        let stop:boolean = false
        let completeChunks:number = 0

        const append = (data: ArrayBuffer) => {
            if(existsMdt) return
            if(!spark) spark = new SparkMd5.ArrayBuffer()
            spark.append(data)
        }

        // blob -> file -> base64

        verify = chunks.every(async (chunk: TFileType) => {
            let size!: number
            let data: any
            if(typeof chunk === 'string') {
                try {
                    size = base64Size(chunk)
                    data = typeof this.#Atob !== 'boolean' && this.#Atob(chunk)
                    append(data)
                    if(this.#Blob) {
                        data = new Blob([data])
                    }else if(this.#File) {
                        data = new File([data], 'chunk')
                    }
                }catch(err) {
                    data = false
                }finally {
                    newChunks.push(data)
                    singleChunkVerify = !!data
                }
            }else if(chunk instanceof ArrayBuffer) {
                try {
                    size = chunk.byteLength
                    append(chunk)
                    if(this.#Blob) {
                        data = new Blob([data])
                    }else if(this.#File) {
                        data = new File([data], 'chunk')
                    }else if(typeof this.#Btoa !== 'boolean') {
                        data = this.#Btoa(data)
                    }else {
                        data = false
                    }
                }catch(err) {
                    data = false
                }finally {
                    newChunks.push(data)
                    singleChunkVerify = !!data
                }
            }else {
                try {
                    if(!fileReader) fileReader = new FileReader()
                    if(chunk instanceof File || chunk instanceof Blob) {
                        size = chunk.size
                        fileReader.readAsArrayBuffer(chunk)
                        data = chunk
                        await new Promise((resolve, _) => {
                            fileReader.onload = function(e: any) {
                                append(e.target.result)
                                resolve(null)
                            }
                        })
                    }else {
                        data = false
                    }
                }catch(_) {
                    data = false
                }finally {
                    newChunks.push(data)
                    singleChunkVerify = !!data
                }
            }
            
            const returnValue = await this.LIFECYCLE_EMIT('reading', { name, start: completeChunks, end: completeChunks += (Number.isNaN(size) ? 0 : size) })
            
            if(typeof returnValue === 'boolean' && !returnValue && singleChunkVerify) {
                this.stop(name)
                stop = true
                return false
            } 

            return singleChunkVerify
        })

        if(stop) return Promise.reject('stop')
        //分片格式是否正确
        // if(!singleChunkVerify) return Promise.reject("every chunk's size must be equal")
        if(!verify) return Promise.reject('chunk list have some not verify chunk')

        return Promise.resolve(spark.end())
    }

    //获取base64的MD5
    private async GET_BASE64_MD5(name: Symbol): Promise<string> {

        const [, index]:[TFiles | false, number | null] = this.GET_TARGET_FILE(name)

        if(index == null) return Promise.reject('task not found')

        const { file, chunkSize, size } = this.#FILES[index]

        if(typeof this.#Atob === 'boolean' || typeof this.#Btoa === 'boolean') return Promise.reject('some unkonwn error')

        let currentChunk: number = 0,
            totalChunks: number = Math.ceil(size / chunkSize),
            spark = new SparkMd5.ArrayBuffer(),
            bufferSlice: (start: number, end: number) => ArrayBuffer = ArrayBuffer.prototype.slice,
            bufferFile = this.#Atob(file)

        while(currentChunk < totalChunks) {
            let start:number = currentChunk * chunkSize,
                end:number = currentChunk + 1 === totalChunks ? size : ( currentChunk + 1 ) * chunkSize
            const chunks: ArrayBuffer = bufferFile.slice(start, end)
            //支持blob
            if(this.#Blob) {
                this.#FILES[index].chunks.push(new Blob([chunks]))
            }else {
                //转base64
                this.#FILES[index].chunks.push(this.#Btoa(chunks))
            }
            currentChunk ++
            spark.append(chunks)
            
            const returnValue = await this.LIFECYCLE_EMIT('reading', { name, start, end })
            if(typeof returnValue === 'boolean' && !returnValue) {
                this.stop(name)
                return Promise.reject('stop')
            }
        }

        return Promise.resolve(spark.end())

    }

    //获取arraybuffer类型md5
    private async GET_BUFFER_MD5(name: Symbol): Promise<string> {

        const [, index]:[TFiles | false, number | null] = this.GET_TARGET_FILE(name)

        if(index == null) return Promise.reject('task not found')

        const { file, chunkSize, size } = this.#FILES[index]

        if(typeof this.#Atob === 'boolean' || typeof this.#Btoa === 'boolean') return Promise.reject('some unkonwn error')

        let currentChunk:number = 0,
            totalChunks: number = Math.ceil(size / chunkSize),
            spark = new SparkMd5.ArrayBuffer(),
            bufferSlice: (start: number, end: number) => ArrayBuffer = ArrayBuffer.prototype.slice

        while(currentChunk < totalChunks) {
            let start: number = currentChunk * chunkSize,
                end: number = currentChunk + 1 === totalChunks ? size : ( currentChunk + 1 ) * chunkSize
            const chunks: ArrayBuffer = bufferSlice.call(file, start, end)
            //支持blob
            if(this.#Blob) {
                this.#FILES[index].chunks.push(new Blob([chunks]))
            }else {
                //转base64
                this.#FILES[index].chunks.push(this.#Btoa(chunks))
            }

            currentChunk ++
            spark.append(chunks)

            const returnValue = await this.LIFECYCLE_EMIT('reading', { name, start, end })
            if(typeof returnValue === 'boolean' && !returnValue) {
                this.stop(name)
                return Promise.reject('stop')
            }
        }

        return Promise.resolve(spark.end())
    }

    //获取文件md5
    private async GET_FILE_MD5(name: Symbol): Promise<string> {

        const [, index]:[TFiles | false, number | null] = this.GET_TARGET_FILE(name)

        if(index == null) return Promise.reject('task not found')

        const { file, chunkSize, size } = this.#FILES[index]
        const that = this
        let error = false

        let currentChunk:number = 0,
            fileReader:FileReader = new FileReader(),
            totalChunks: number = Math.ceil(size / chunkSize),
            spark = new SparkMd5.ArrayBuffer(),
            fileSlice: (start: number, end: number) => Blob = File.prototype.slice

        return new Promise(async (resolve, reject) => {

            fileReader.onload = async (e: any) => {
                if(!e.target || error) return reject('读取错误')
                //添加读取的内容
                spark.append(e.target.result)
                currentChunk ++
                //继续读取
                if(currentChunk < totalChunks) {
                    await loadNext()
                }
                //读取完毕
                else {
                    resolve(spark.end())
                }
            }

            //错误处理
            fileReader.onerror = reject

            //文件内容读取
            async function loadNext() {
                let start: number = currentChunk * chunkSize,
                    end: number = currentChunk + 1 === totalChunks ? size : (currentChunk + 1) * chunkSize
                const chunks: Blob = fileSlice.call(file, start, end)
                if(index == null) {
                    error = true
                    return
                }
                that.#FILES[index].chunks.push(chunks)
                const returnValue = await that.LIFECYCLE_EMIT('reading', { name, start, end })
                if(typeof returnValue === 'boolean' && !returnValue) {
                    that.stop(name)
                    return reject('stop')
                }
                fileReader.readAsArrayBuffer(chunks)
            }

            await loadNext()

        })

    }
    
}

export default Upload