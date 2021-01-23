import { merge, omit } from 'lodash'
import {
  flat,
  isObject,
  base64Size,
  allSettled,
} from '../utils/tool'
import Validator from '../utils/validator'
import { ECACHE_STATUS, DEFAULT_CONFIG, MAX_FILE_CHUNK } from '../utils/constant'
import Reader from '../utils/reader'
import {
  TFailEmitReturnType,
  TRejectEmitReturnType,
  TSuccessReturnType,
  TEmitReturnType,
  TFiles,
  TFileType,
  TEvents,
  TUploadFormData,
  TLifecycle,
  Ttask,
  TWraperFile,
  TExitDataFn,
  TExitDataFnReturnValue,
  TFileParseProcess
} from './index.d'

class Upload {

  #lifecycle:TLifecycle = {}

  // #lifecycle = new LifeCycle()

  #FILES:TFiles[] = []

  #EVENTS: Array<TEvents> = []

  constructor(options: {
    lifecycle?: TLifecycle
  }={}) {
    const { lifecycle } = options
    this.init()
    if(!Upload.isSupport()) throw new Error('this tool must be support for the ArrayBuffer')
    this.#lifecycle = lifecycle || {}
  }

  public static isSupport():boolean {
    try {
      return !!ArrayBuffer
    }catch(err) {
      return false
    }
  }

  public init(): void {
    this.cancelEmit()
    this.cancel()
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
        return merge(item, { _cp_: true })
      }
      return item
    }).reduce((acc: Array<Ttask<TWraperFile>>, d: Ttask<TFileType>) => {
      if(isObject(d)) {
        //参数验证
        validate = new Validator()
        validate.add(d)
        const valid = validate.validate()
        if(valid === true) {
          const { config={}, file, mime, lifecycle, ...nextD } = d
          acc.push(merge(nextD, {
            lifecycle: lifecycle || {},
            mime: mime ? mime : (typeof file === 'string' || file instanceof ArrayBuffer ? undefined : file?.type),
            file: that.FILE_TYPE(file),
            config: merge(DEFAULT_CONFIG, config)
          }))
        }else {
          console.warn(`the params ${typeof valid == 'string' ? valid : ''} is not verify`)
        }
      }
      return acc
    }, [])

    //加入事件队列
    this.#EVENTS = merge(this.#EVENTS, result.map(r => {
      const symbol: unique symbol = Symbol()
      symbolList.push(symbol)
      return merge({ symbol }, r)
    }))

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
      this.#EVENTS = restEmit
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
  private async EMIT_UPLOAD_TASKS(...tasks: TEvents[]): Promise<TEmitReturnType> {

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
      const { chunks, completeChunks } = files
      return {
        progress: Number(completeChunks.length) / Number(chunks.length),
        name,
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
  public async upload(...tasks: Ttask<TFileType>[]): Promise<string | [Array<Symbol>, TEmitReturnType]> {
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

  //获取原始文件
  public getOriginFile(name: Symbol): TFileType | null {

    const [target] = this.GET_TARGET_FILE(name)
    return target ? target.file : null

  }

  //文件存在验证
  private exitDataFn({ index }: { index: number }) {

    const that = this
    
    return async function(md5: string):ReturnType<TExitDataFn> {

      that.#FILES[index].md5 = md5

      const { symbol, chunkSize, chunks, size, mime, name, request: { exitDataFn } } = that.#FILES[index]
      const returnValue = await that.LIFECYCLE_EMIT('beforeCheck', { name: symbol })
      const status = that.#FILES[index].status
      if(status === ECACHE_STATUS.stopping || status === ECACHE_STATUS.cancel) return Promise.reject('stop or cancel')
      if(typeof returnValue === 'boolean' && !returnValue) {
        that.stop(symbol)
        return Promise.reject('before check stop')
      }

      if(typeof exitDataFn !== 'function') return { data: [] }

      const params = {
        filename: name ?? '',
        md5,
        suffix: mime || '',
        size,
        chunkSize: chunkSize,
        chunksLength: chunks.length
      }
      return exitDataFn(params)

    }
  }

  private getUnCompleteIndexs(index: number, response: TExitDataFnReturnValue): number[] {
    const { data } = response
    const { chunks, size, chunkSize } = this.#FILES[index]
    const chunksLength = chunks.length

    const parseNumber = (target: string | number):number => {
      return typeof target === 'string' ? parseInt(target) : Number(target.toFixed(0))
    }

    if(Array.isArray(data)) {
      this.#FILES[index].unCompleteChunks = data
      .filter(ind => {
        const index = parseNumber(ind)
        return !Number.isNaN(index) && chunksLength > index
      })
    }else {
      let nextIndex = parseNumber(data)
      nextIndex = Number.isNaN(nextIndex) || nextIndex > size ? 0 : nextIndex
      let offset = nextIndex / chunkSize
      if(Math.round(offset) == offset) {
        this.#FILES[index].unCompleteChunks = new Array(chunksLength - offset).fill(0).map((_, ind) => ind + offset)
      }else {
        this.#FILES[index].unCompleteChunks = new Array(chunksLength).fill(0).map((_, index) => index)
      }

    }

    return this.#FILES[index].unCompleteChunks

  }

  //文件上传
  private uploadFn({ index }: { index: number }) {

    const that = this

    return async function(res: TExitDataFnReturnValue) {
      /**
       * 列表展示为未上传的部分
       * data: {
       *  list: [每一分片的索引]
       * } | nextIndex 下一分片索引
       */
      const { data, ...nextRes } = res || {}

      const unComplete = that.getUnCompleteIndexs(index, res)
      const isExists = !unComplete.length
      const { symbol } = that.#FILES[index]

      await that.LIFECYCLE_EMIT('afterCheck', { name: symbol, isExists })

      //后台不存在当前文件的情况下上传
      if(!isExists) {
        return that.CHUNK_INTERNAL_UPLOAD({ index })
        .then(that.completeFn({ index, response: res }))
      }
      //文件存在则直接回调
      else {
        await that.LIFECYCLE_EMIT('beforeComplete', { name: symbol, isExists: true })
        return nextRes
      }
    }
  }

  //文件上传完成
  private completeFn({ index, response }: { index: number, response: TExitDataFnReturnValue }) {

    const that = this

    return async function() {

      const { md5, symbol, request: { completeFn } } = that.#FILES[index]
      await that.LIFECYCLE_EMIT('beforeComplete', { name: symbol, isExists: false })
      return typeof completeFn === 'function' ? completeFn({ name: symbol, md5 }) : omit(response, [ 'data' ])
    
    }

  }

  //处理上传文件分片
  private async DEAL_UPLOAD_CHUNK(task: TEvents<TWraperFile>): Promise<{ err: any, name: Symbol }> {
    const { file:wrapperFile, mime, chunks, _cp_, exitDataFn, uploadFn, completeFn, callback, symbol, config: { chunkSize, retry }, md5, lifecycle } = task
    const { name, size, file, action } = wrapperFile
    // let index:number = this.#FILES.findIndex((file: TFiles) => file.symbol == symbol)
    // //添加记录至文件缓存中
    // if(!~index) {
    //   index = this.#FILES.push({
    //     mime,
    //     file,
    //     name,
    //     size,
    //     symbol,
    //     chunks: chunks || [],
    //     completeChunks: [],
    //     unCompleteChunks: [],
    //     watch: () => (this.watch(symbol) || [])[0],
    //     md5: md5 || '',
    //     chunkSize: chunkSize || MAX_FILE_CHUNK,
    //     status: ECACHE_STATUS.pending,
    //     retry: !!retry ? retry : false,
    //     _cp_: !!_cp_,
    //     lifecycle,
    //     request: {
    //       exitDataFn,
    //       uploadFn,
    //       completeFn
    //     }
    //   }) - 1
    // }

    const readerFile = new Reader({
      mime,
      file,
      name,
      size,
      symbol,
      chunks: chunks || [],
      completeChunks: [],
      unCompleteChunks: [],
      // watch: () => (this.watch(symbol) || [])[0],
      md5: md5 || '',
      chunkSize: chunkSize || MAX_FILE_CHUNK,
      // status: ECACHE_STATUS.pending,
      retry: !!retry ? retry : false,
      _cp_: !!_cp_,
      lifecycle,
      request: {
        exitDataFn,
        uploadFn,
        completeFn
      },
    }, this.processReading())

    // this.#FILES[index].status = ECACHE_STATUS.doing

    await this.LIFECYCLE_EMIT('beforeRead', { name: symbol })

    //md5加密
    return action.call(this, symbol)
    //向后端保存文件的相关信息为后面分片上传做验证准备
    .then(this.exitDataFn({ index }))
    //分片上传
    .then(this.uploadFn({ index }))
    .then(async (data) => {
      typeof callback === 'function' && callback(null, data)
      this.#FILES[index].status = ECACHE_STATUS.fulfilled
      await this.LIFECYCLE_EMIT('afterComplete', { name: symbol, success: true })
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
  private async CHUNK_INTERNAL_UPLOAD({ index }: { index: number }): Promise<any> {

    const { symbol, chunks, md5, request: { uploadFn } } = this.#FILES[index]

    const returnValue = await this.LIFECYCLE_EMIT('beforeUpload', { name: symbol })
    if(typeof returnValue === 'boolean' && !returnValue) this.stop(symbol)

    //upload
    for(let i = 0; i < chunks.length; i ++) {
      //处理用户的取消或暂停
      const { status, unCompleteChunks } = this.#FILES[index]
      if(status === ECACHE_STATUS.stopping || status === ECACHE_STATUS.cancel) {
        if(status === ECACHE_STATUS.stopping) await this.LIFECYCLE_EMIT('afterStop', { name: symbol, index })
        if(status === ECACHE_STATUS.cancel) await this.LIFECYCLE_EMIT('afterCancel', { name: symbol, index })
        await this.LIFECYCLE_EMIT('afterUpload', { name: symbol, index, success: false })
        return Promise.reject('stop or cancel')
      }

      //只上传未上传过的内容
      const newUnUploadChunks = unCompleteChunks.filter(item => item !== i)
      if(newUnUploadChunks.length !== unCompleteChunks.length) {
        const params: TUploadFormData = {
          file: chunks[i],
          md5: md5,
          index: i,
        }
        let formData: any
        if(typeof FormData !== 'undefined') {
          formData = new FormData()
          Object.keys(params).forEach((key: string) => {
            formData.append(key, params[key])
          })
        }else {
          formData = params
        }

        // delete next version
        this.#FILES[index].completeChunks.push(i)

        try {
          const response = await uploadFn.call(this, formData)
          let unchunks = newUnUploadChunks
          if(!!response) {
            unchunks = this.getUnCompleteIndexs(index, response)
          }
          this.#FILES[index].unCompleteChunks = unchunks
        }catch(err) {
          await this.LIFECYCLE_EMIT('afterUpload', { name: symbol, index: i, success: false })
          return Promise.reject(err)
        }

        await this.LIFECYCLE_EMIT('afterUpload', { name: symbol, index: i, success: true })
      }
    }
    return Promise.resolve()

  }

  // //获取MD5(分片已预先完成)
  // private async GET_MD5(name: Symbol): Promise<string> {

  //   const [, index]:[TFiles | false, number | null] = this.GET_TARGET_FILE(name)

  //   if(index == null) return Promise.reject('task not found')

  //   this.#FILES[index].chunks = []    
  //   const target = this.#FILES[index]
  //   const fileParse = new FileParse()
  //   return fileParse.files(target, this.processReading(index))

  // }

  // //获取base64的MD5
  // private async GET_BASE64_MD5(name: Symbol): Promise<string> {

  //   const [, index]:[TFiles | false, number | null] = this.GET_TARGET_FILE(name)

  //   if(index == null) return Promise.reject('task not found')

  //   const target = this.#FILES[index]

  //   const fileParse = new FileParse()
  //   return fileParse.base64(target, this.processReading(index))

  // }

  private processReading() {

    const process: TFileParseProcess = async (data, stop) => {
      const {
        name,
        start,
        end,
        chunk
      } = data



      // this.#FILES[index].chunks.push(chunk)
      const returnValue = await this.LIFECYCLE_EMIT('reading', { name, start, end })
      // const { status } = this.#FILES[index]
      if(status === ECACHE_STATUS.cancel || status === ECACHE_STATUS.stopping) return stop()
      if(typeof returnValue === 'boolean' && !returnValue) {
        this.stop(name)
        return stop()
      }
    }
    
    return process

  }

  // //获取arraybuffer类型md5
  // private async GET_BUFFER_MD5(name: Symbol): Promise<string> {

  //   const [, index]:[TFiles | false, number | null] = this.GET_TARGET_FILE(name)

  //   if(index == null) return Promise.reject('task not found')

  //   const target = this.#FILES[index]

  //   const fileParse = new FileParse()
  //   return fileParse.arraybuffer(target, this.processReading(index))

  // }

  // //获取文件md5
  // private async GET_FILE_MD5(name: Symbol): Promise<string> {

  //   const [, index]:[TFiles | false, number | null] = this.GET_TARGET_FILE(name)

  //   if(index == null) return Promise.reject('task not found')

  //   const target = this.#FILES[index]

  //   const fileParse = new FileParse()
  //   return fileParse.blob(target, this.processReading(index))

  // }

}

export default Upload