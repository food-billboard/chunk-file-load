import merge from 'lodash/merge'
import EventEmitter from 'eventemitter3'
import { 
  Emitter, 
  FileReader as Reader, 
  LifeCycle, 
  Uploader, 
  WorkerPool,
  allSettled,
  ECACHE_STATUS
} from '../utils'
import { TLifecycle, Ttask, TFileType, TWrapperTask, TProcessLifeCycle, SuperPartial, TPlugins } from './type'

export default class Upload extends EventEmitter {

  protected static plugins: Partial<TPlugins> = {}

  public static install(name: keyof TPlugins, descriptor: TPlugins[keyof TPlugins]) {
    if (!Upload.plugins) {
      Upload.plugins = {}
    }
    Upload.plugins[name] = descriptor
  }

  protected lifecycle: LifeCycle = new LifeCycle()

  protected emitter: Emitter = new Emitter(this)

  protected reader!: Reader

  protected uploader!: Uploader

  protected workerPool!: WorkerPool

  constructor(options?: {
    lifecycle?: TLifecycle,
    ignores?: string[]
  }) {
    super()
    if(!Upload.isSupport()) throw new Error('this tool must be support for the ArrayBuffer')
    this.reader = new Reader(this)
    this.uploader = new Uploader(this)
    this.lifecycle.onWithObject(options?.lifecycle || {})
    this.workerPool = new WorkerPool()
    this.pluginsCall(options?.ignores)
  }

  //插件注册
  private pluginsCall(ignores: string[]=[]) {
    if (Upload.plugins) {
      const keys = Object.keys(Upload.plugins) as (keyof TPlugins)[]
      keys.forEach((name) => {
        if(!ignores.includes(name)) {
          let descriptor = Upload.plugins[name]
          descriptor!.call(this, this)
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
    try {
      return !!ArrayBuffer
    }catch(err) {
      return false
    }
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
        const { request: { callback }, symbol, config: { retry }, lifecycle } = task!
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
            retry
          } : null
          this.lifecycle.onWithObject(lifecycle, name, 'off')
          if(remove) {
            this.emitter.off(symbol)
            callback && callback(callbackError, name)
          }else if(retry) {
            this.deal(symbol)
          }else {
            callback && callback(callbackError, name)
          }
        })
        .catch(err => {
          console.error(err)
          callback && callback(err, null)
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
    let state: SuperPartial<TWrapperTask> = {
      status
    }
    if(!task) return Promise.reject('not found the task')
    let error: unknown = false
    let response
    try {
      this.emitter.setState(name, state)
      state = {}
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