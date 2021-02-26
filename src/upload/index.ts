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

  protected emitter: Emitter = new Emitter()

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
    return this.emitter.off(...names)
  }

  //停止任务执行
  public stop(...names: Symbol[]): Symbol[] {
    return this.emitter.stop(...names)
  }

  //取消任务执行
  public cancel(...names: Symbol[]): Symbol[] {
    return this.emitter.stop(...names)
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
  public watch(...names: Symbol[]): ({ error: string | null, name: Symbol, progress: number, status: ECACHE_STATUS, total: number, current: number } | null)[] {
    const tasks = this.emitter.tasks
    return names.map(name => {
      const target = tasks.find(task => task.symbol == name)
      if(!target) return null
      const { process: { current, complete, total }, status,  } = target
      return {
        error: null,
        name,
        status: status,
        progress: parseFloat((complete / total).toFixed(4)),
        total,
        current
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
    return task?.status || null
  }

  //任务执行
  private performanceTask(tasks: TWrapperTask[]) {
    this.workerPool.enqueue(...tasks.map(task => task.symbol))
    .then(processes => {
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
            error: null
          }
        })
        .catch(err => {
          console.warn(err)
          const response = {
            error: err,
            name: symbol,
            remove: false
          }

          const { status } = task!

          if(status !== ECACHE_STATUS.stopping && status !== ECACHE_STATUS.cancel) {
            this.emitter.setState(symbol, { status: ECACHE_STATUS.rejected })
          }

          return response
        })
        .then(async (response) => {
          WorkerPool.worker_clean(process)
          const { error, name, remove } = response
          let callbackError = null
          let needRetry = error && retry.times > 0

          if(needRetry) {
            callbackError = {
              error,
              retry: true
            }
            try {
              await this.LIFECYCLE_EMIT('retry', {
                name: symbol,
                status: ECACHE_STATUS.pending,
                rest: retry.times - 1
              })
            }catch(err) {
              callbackError.retry = false
            }
          }
          callback && callback(callbackError, name)
          this.lifecycle.onWithObject(lifecycle, name, 'off')
          if(remove || !!!callbackError?.retry) {
            this.emitter.off(symbol)
          }else if(needRetry && !!callbackError?.retry) {
            this.deal(symbol)
          }
        })
      }))
    })
  }

  //执行声明周期
  private LIFECYCLE_EMIT: TProcessLifeCycle = async (lifecycle, params) => {
    const { name, status } = params
    const [ , task ] = this.emitter.getTask(name)
    const { status: originStatus, symbol } = task!
    let state: SuperPartial<TWrapperTask> = {
      status
    }
    if(!task) return Promise.reject('not found the task')
    let error: unknown = false
    let response
    try {
      response = await this.lifecycle.emit(lifecycle, { ...params, task })
      if((response as any) instanceof Object) {
        state = merge(state, response)
      }
    }catch(err) {
      error = err
    }finally {
      if(originStatus === ECACHE_STATUS.stopping || originStatus === ECACHE_STATUS.cancel) {
        if(originStatus === ECACHE_STATUS.stopping) {
          try {
            await this.lifecycle.emit('afterStop', {
              name: symbol,
              status: ECACHE_STATUS.stopping,
              current: task!.process.current,
              task
            })
          }catch(err) {}
          error = 'stop'
        }
        if(originStatus === ECACHE_STATUS.cancel) {
          try {
            await this.lifecycle.emit('afterStop', {
              name: symbol,
              status: ECACHE_STATUS.cancel,
              current: task!.process.current,
              task
            })
          }catch(err) {}

          error = 'cancel'
        }
        state.status = originStatus
      }

      this.emitter.setState(name, state)

      if(error) {
        return Promise.reject(error)
      } 
    }
  }

}