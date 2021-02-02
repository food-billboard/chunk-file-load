import { merge } from 'lodash'
import Emitter from '../utils/emitter'
import Reader from '../utils/reader'
import LifeCycle from '../utils/lifecycle'
import WorkerPool from '../utils/worker/worker.pool'
import Uploader from '../utils/uploader'
import { allSettled } from '../utils/tool'

import { TLifecycle, Ttask, TFileType, TWrapperTask, TProcessLifeCycle, SuperPartial } from './index.d'
import { ECACHE_STATUS } from '../utils/constant'

export default class Upload {

  private lifecycle: LifeCycle = new LifeCycle()

  private emitter: Emitter = new Emitter()

  private reader!: Reader

  private uploader!: Uploader

  private wokerPool!: WorkerPool

  constructor(options?: {
    lifecycle?: TLifecycle
  }) {
    if(!Upload.isSupport()) throw new Error('this tool must be support for the ArrayBuffer')
    this.init()
    const emitter = {
      setState: this.emitter.setState,
      getState: this.emitter.getTask.bind(this.emitter)
    }
    this.reader = new Reader(emitter, this.LIFECYCLE_EMIT)
    this.uploader = new Uploader(emitter, this.LIFECYCLE_EMIT)
    this.lifecycle.onWithObject(options?.lifecycle || {})
    this.wokerPool = new WorkerPool()
  }

  //初始化
  public init() {
    this.emitter?.clean()
    this.reader?.clean()
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
  public on(...tasks: Ttask<TFileType>[]): Symbol[] {
    return this.emitter.on(...tasks)
  }

  //执行任务
  public emit(...names: Symbol[]) {
    const tasks = this.emitter.emit(...names)
    this.performanceTask(tasks.map(task => {
      const { lifecycle, symbol } = task
      this.lifecycle.onWithObject(lifecycle || {}, symbol) 
      return task
    }))
    return tasks.map(task => task.symbol)
  }

  //执行任务
  public start(...names: Symbol[]) {
    return this.emitter.emit(...names)
  }

  //取消绑定的任务
  public cancelEmit(...names: Symbol[]) {
    return this.emitter.off(...names)
  }

  //停止任务执行
  public stop(...names: Symbol[]) {
    return this.emitter.stop(...names)
  }

  //取消任务执行
  public cancel(...names: Symbol[]) {
    return this.emitter.stop(...names)
  }

  //预加密上传
  public uploading(...tasks: Ttask<TFileType>[]): Symbol[] {
    return this.upload(...tasks.map(task => ({ ...task, _cp_: true })))
  }

  //上传
  public upload(...tasks: Ttask<TFileType>[]): Symbol[] {
    const names = this.on(...tasks)
    this.emit(...names)
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

  //获取原始文件
  public getOriginFile(name: Symbol): TFileType | null {
    const [ , file ] = this.emitter.getTask(name)
    return file?.file?.file || null
  }

  //任务执行
  private performanceTask(tasks: TWrapperTask[]) {
    this.wokerPool.enqueue(...tasks.map(task => task.symbol))
    .then(processes => {
      return allSettled(processes.map(async (process: string) => {
        const target = WorkerPool.getProcess(process)
        const taskName = target!.task
        const [ , task ] = this.emitter.getTask(taskName!)
        const { request: { callback }, status, symbol, config: { retry }, lifecycle } = task!
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

          if(status !== ECACHE_STATUS.stopping && status !== ECACHE_STATUS.cancel) {
            this.emitter.setState(symbol, { status: ECACHE_STATUS.rejected })
          }
          if(status === ECACHE_STATUS.stopping) {
            this.LIFECYCLE_EMIT('afterStop', {
              name: symbol,
              status: ECACHE_STATUS.stopping,
              current: task!.process.current
            })
          }
          if(status === ECACHE_STATUS.cancel) {
            this.LIFECYCLE_EMIT('afterCancel', {
              name: symbol,
              status: ECACHE_STATUS.cancel,
              current: task!.process.current
            })
            return merge(response, { remove: true })
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
          if(remove) {
            this.emitter.off(symbol)
          }else if(needRetry && !!callbackError?.retry) {
            this.emit(symbol)
          }
        })
      }))
    })
  }

  //执行声明周期
  private LIFECYCLE_EMIT: TProcessLifeCycle = async (lifecycle, params) => {
    const { name, status } = params
    const [ , task ] = this.emitter.getTask(name)
    let state: SuperPartial<TWrapperTask> = {
      status
    }
    if(!task) return Promise.reject('not found the task')
    const response = await this.lifecycle.emit(lifecycle, params)
    if((response as any) instanceof Object) {
      state = merge(state, response)
    }
    this.emitter.setState(name, state)
  }

}