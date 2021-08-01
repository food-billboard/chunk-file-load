import merge from 'lodash/merge'
import noop from 'lodash/noop'
import EventEmitter from 'eventemitter3'
import { 
  Emitter, 
  FileReader as Reader, 
  LifeCycle, 
  Uploader, 
  WorkerPool,
  allSettled,
  ECACHE_STATUS,
  base64ToArrayBuffer as internalBase64ToArrayBuffer,
  arrayBufferToBase64 as internalArrayBufferToBase64,
  isBase64,
  withTry,
  DEFAULT_CONFIG
} from '../utils'
import { 
  TLifecycle, 
  Ttask, 
  TFileType, 
  TWrapperTask, 
  TProcessLifeCycle, 
  SuperPartial, 
  TPlugins,
  TPluginsReader,
  TPluginsSlicer,
  TConfig
} from './type'

export default class Upload extends EventEmitter {

  protected static plugins: Partial<TPlugins> = {}

  public static install(name: keyof TPlugins, descriptor: TPluginsReader | TPluginsSlicer) {
    if (!Upload.plugins) {
      Upload.plugins = {}
    }
    if(!Upload.plugins[name]) Upload.plugins[name] = []
    Upload.plugins[name]?.push(descriptor as any)
  }

  protected lifecycle: LifeCycle = new LifeCycle()

  protected emitter: Emitter = new Emitter(this)

  protected reader!: Reader

  protected uploader!: Uploader

  protected workerPool!: WorkerPool

  public static btoa = internalArrayBufferToBase64
	public static atob = internalBase64ToArrayBuffer
  public static async file2Blob(file: File, options?: BlobPropertyBag | undefined): Promise<Blob> {
    if(!(file instanceof File)) return file
    const buffer = await Upload.file2arraybuffer(file)
    return new Blob([buffer as ArrayBuffer], options)
  }
  public static blob2file(file: Blob, fileName: string, options?: FilePropertyBag | undefined): File {
    if(!(file instanceof Blob)) return file
    return new File([file], fileName, options)
  }
  public static async file2arraybuffer(file: File): Promise<unknown> {
    if(!(file instanceof File)) return file
    return Upload.blob2arraybuffer(file.slice(0, file.size))
  }
  public static blob2arraybuffer(file: Blob): Promise<unknown> {
    if(!(file instanceof Blob)) return file
    return new Promise((resolve, reject) => {
      const fileReader = new FileReader()
      fileReader.onload = function(e) {
        resolve(e.target?.result)
      }
      fileReader.onerror = reject
      fileReader.readAsArrayBuffer(file)
    })
  }
  public static async file2base64(file: File) {
    if(!(file instanceof File)) return file
    const buffer = await Upload.file2arraybuffer(file)
    return Upload.btoa(buffer as ArrayBuffer)
  }
  public static async blob2base64(file: File) {
    if(!(file instanceof Blob)) return file
    const buffer = await Upload.blob2arraybuffer(file)
    return Upload.btoa(buffer as ArrayBuffer)
  }
  public static arraybuffer2file(file: ArrayBuffer, fileName: string, options?: FilePropertyBag | undefined): File {
    if(!(file instanceof ArrayBuffer)) return file
    return new File([file], fileName, options)
  }
  public static arraybuffer2blob(file: ArrayBuffer, options?: BlobPropertyBag | undefined) {
    if(!(file instanceof ArrayBuffer)) return file
    return new Blob([file], options)
  }
  public static base642blob(file: string, options?: BlobPropertyBag | undefined) {
    if(!isBase64(file)) return file 
    const buffer = Upload.atob(file)
    return new Blob([buffer], options)
  }
  public static base642file(file: string, fileName: string, options?: FilePropertyBag | undefined) {
    if(!isBase64(file)) return file 
    const buffer = Upload.atob(file)
    return new File([buffer], fileName, options)
  }

  protected _defaultConfig = merge({}, DEFAULT_CONFIG)

  public get defaultConfig() {
    return this._defaultConfig
  }

  public set defaultConfig(value: Partial<TConfig & { internal?: true }>) {
    const { internal, ...nextValue } = value 
    if(internal) {
      this._defaultConfig = merge({}, this._defaultConfig, nextValue)
    }
  }

  constructor(options?: {
    lifecycle?: TLifecycle,
    config?: TConfig
    ignores?: string[]
  }) {
    super()
    if(!Upload.isSupport()) throw new Error('this tool must be support for the ArrayBuffer')
    this.reader = new Reader(this)
    this.uploader = new Uploader(this)
    this.lifecycle.onWithObject(options?.lifecycle || {})
    this.defaultConfig = merge({}, this.defaultConfig, options?.config || {}, { internal: true })
    this.workerPool = new WorkerPool()
    this.pluginsCall(options?.ignores)
  }



  //插件注册
  private pluginsCall(ignores: string[]=[]) {
    if (Upload.plugins) {
      const keys = Object.keys(Upload.plugins) as (keyof TPlugins)[]
      keys.forEach((name) => {
        if(!ignores.includes(name)) {
          let descriptors = Upload.plugins[name] || []

          const event = async (...args: any[]) => {
            const tempArgs = args.slice(0, -1)
            const [callback] = args.slice(-1)
            let stepValue: any = undefined
            for(let i = 0; i < descriptors.length; i ++) {
              const descriptor = descriptors[i]
              const [err, value] = await withTry(descriptor)(...tempArgs, stepValue)
              stepValue = value 
              if(err) {
                console.error(err)
                callback(err, null)
                return 
              }
            }
            callback(null, stepValue)
          }

          this.on(name, event, this)
          this.once(name, this.off.bind(this, name, event), this)
        }
      })
    }
  }

  //销毁
  public async dispose() {
    const tasks = this.emitter.getTasks()
    const process = WorkerPool.getProcesses()
    for(let i = 0; i < tasks.length; i ++) {
      const { symbol, status } = tasks[i]
      const target = process.find(pro => pro.task == symbol)
      if(status >= ECACHE_STATUS.waiting && !!target) {
        this.cancel(symbol)
      }
    }
    
    let tempTasks = []
    while(!WorkerPool.queueIsEmpty()) {
      tempTasks.push(this.workerPool.dequeue())
    }
    tempTasks.forEach(task => {
      if(!task) return 
      const target = tasks.find(_task => _task.symbol == task)
      if(!target) {
        this.workerPool.enqueue(task)
      }
    })

    this.emitter?.clean()
    this.reader?.clean()
    this.lifecycle.init()
  }

  //是否支持
  public static isSupport():boolean {
    return typeof ArrayBuffer !== 'undefined'
  }

  //添加任务
  public add(...tasks: Ttask<TFileType>[]): Symbol[] {
    return this.emitter.add(...tasks)
  }

  //执行任务
  public deal(...names: Symbol[]) {
    const tasks = this.emitter.deal(...names)
    this.performanceTask(tasks.map(task => {
      const { lifecycle, symbol } = task
      this.lifecycle.onWithObject(lifecycle || {}, symbol) 
      return task
    }))
    return tasks.map(task => task.symbol)
  }

  //执行任务
  public start(...names: Symbol[]) {
    names.forEach(name => this.emitter.statusChange(ECACHE_STATUS.pending, name))
    return this.deal(...names)
  }

  //取消绑定的任务
  public cancelAdd(...names: Symbol[]) {
    return this.emitter.cancelAdd(...names)
  }

  //停止任务执行
  public stop(...names: Symbol[]): Symbol[] {
    return this.emitter.stop(...names)
  }

  //取消任务执行
  public cancel(...names: Symbol[]): Symbol[] {
    return this.emitter.cancel(...names)
  }

  //预加密上传
  public uploading(...tasks: Ttask<TFileType>[]): Symbol[] {
    return this.upload(...tasks.map(task => ({ ...task, _cp_: true })))
  }

  //上传
  public upload(...tasks: Ttask<TFileType>[]): Symbol[] {
    const names = this.add(...tasks)
    this.deal(...names)
    return names
  }

  //进度查看
  public watch(...names: Symbol[]): ({ complete: number, error: string | null, name: Symbol, progress: number, status: ECACHE_STATUS, total: number, current: number } | null)[] {
    const tasks = this.emitter.tasks
    return names.map(name => {
      const target = tasks.find(task => task.symbol == name)
      if(!target) return null
      const { process: { current, complete, total }, status } = target
      return {
        error: null,
        name,
        status,
        complete,
        progress: parseFloat((complete / total).toFixed(4)) || 0,
        total: total || 0,
        current: current || 0
      }
    })
    
  }

  //获取任务
  public getTask(name: Symbol): TWrapperTask | null {
    const [ , task ] = this.emitter.getTask(name)
    return task
  }

  //获取原始文件
  public getOriginFile(name: Symbol): TFileType | null {
    const task = this.getTask(name)
    return task?.file?.file || null
  }

  //任务状态
  public getStatus(name: Symbol): ECACHE_STATUS | null {
    const task = this.getTask(name)
    return task?.status ?? null
  }

  //任务执行
  private performanceTask(tasks: TWrapperTask[]) {
    this.workerPool.enqueue(...tasks.map(task => task.symbol))
    .then(async (processes) => {
      return allSettled(processes.map(async (process: string) => {
        const target = WorkerPool.getProcess(process)
  
        const taskName = target!.task
        const [ , task ] = this.emitter.getTask(taskName!)
        const { request: { callback: _callback }, symbol, config: { retry }, lifecycle={} } = task!
        const callback = typeof _callback === 'function' ? _callback : noop
        return this.reader.addFile(process)
        .then(_ => this.uploader.addFile(process))
        .then(_ => {
          return {
            remove: true,
            name: symbol,
            error: null,
            retry: false 
          }
        })
        .catch(async (err) => {
          console.warn(err)
          let response = {
            error: err,
            name: symbol,
            remove: true,
            retry: false
          }

          const { status } = task!

          //retry
          if(status !== ECACHE_STATUS.stopping && status !== ECACHE_STATUS.cancel) {
            this.emitter.setState(symbol, { status: ECACHE_STATUS.rejected })
            response.retry = retry?.times > 0
            if(response.retry) {
              try {
                await this.LIFECYCLE_EMIT('retry', {
                  name: symbol,
                  status: ECACHE_STATUS.pending,
                  rest: retry.times - 1
                })
              }catch(err) {
                response.retry = false
              }finally {
                response.remove = !response.retry
                const status = this.getStatus(symbol)
                if(status === ECACHE_STATUS.stopping) {
                  response.retry = false
                  response.remove = false 
                }
              }
            }
          }else {
            if(status === ECACHE_STATUS.stopping) {
              response.remove = false
            }
          }

          return response
        })
        .then(async (response) => {
          WorkerPool.worker_clean(process)
          const { error, name, remove, retry } = response
          let callbackError = error ? {
            error,
          } : null
          this.lifecycle.onWithObject(lifecycle, name, 'off')
          if(remove) {
            this.emitter.off(symbol)
            callback(callbackError, name)
          }else if(retry) {
            const tasks = this.deal(symbol)
            if(!tasks.length) {
              this.emitter.off(symbol)
              callback(merge({}, callbackError, { error: {
                error: callbackError?.error,
                description: 'unknown error'
              } }), name)
            }
          }else {
            callback(callbackError, name)
          }
        })
        .catch(err => {
          console.error(err)
          callback(err, null)
        })
      }))
    })
    .catch(err => {
      console.error(err)
    })
  }

  //执行声明周期
  private LIFECYCLE_EMIT: TProcessLifeCycle = async (lifecycle, params) => {
    const { name, status } = params
    const [ , task ] = this.emitter.getTask(name)
    const { symbol } = task!
    let state: SuperPartial<TWrapperTask> = {}
    if(!task) return Promise.reject('not found the task')
    let error: unknown = false
    let response
    try {
      this.emitter.setState(name, { status })
      response = await this.lifecycle.emit(lifecycle, { ...params, task })
      if((response as any) instanceof Object) {
        this.emitter.setState(name, response)
      }
    }catch(err) {
      error = err
    }finally {
      const status = this.getStatus(name)
      if(status === ECACHE_STATUS.stopping || status === ECACHE_STATUS.cancel) {
        let lifecycle!: keyof TLifecycle
        if(status === ECACHE_STATUS.stopping) {
          error = 'stop'
          lifecycle = 'afterStop'
        }
        if(status === ECACHE_STATUS.cancel) {
          error = 'cancel'
          lifecycle = 'afterCancel'
        }
        try {
          const [target] = this.watch(symbol)
          await this.lifecycle.emit(lifecycle, {
            name: symbol,
            status,
            current: target?.current,
            task
          })
        }catch(err) {}
        state.status = status
      }

      this.emitter.setState(name, state)

      if(error) {
        return Promise.reject(error)
      } 
    }
  }

}