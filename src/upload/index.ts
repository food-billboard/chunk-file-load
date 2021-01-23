import Emitter from '../utils/emitter'
import Reader from '../utils/reader'
import LifeCycle from '../utils/lifecycle'
import WorkerPool from '../utils/worker/worker.pool'

import { TLifecycle, Ttask, TFileType, TEvents, TWraperFile, TProcessLifeCycle } from './index.d'

export default class Upload {

  private lifecycle: LifeCycle = new LifeCycle()

  private emitter: Emitter = new Emitter()

  private reader!: Reader

  private wokerPool!: WorkerPool

  constructor(options?: {
    lifecycle?: TLifecycle
  }) {
    if(!Upload.isSupport()) throw new Error('this tool must be support for the ArrayBuffer')
    this.init()
    this.reader = new Reader(this.emitter.setState, this.LIFECYCLE_EMIT)
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
    this.performanceTask(...tasks)
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
  public watch(...names: Symbol[]) {

  }

  //获取原始文件
  public getOriginFile(name: Symbol): TFileType | null {
    const [ , file ] = this.emitter.getTask(name)
    return file?.file?.file || null
  }

  //任务执行
  private performanceTask(...tasks: TEvents<TWraperFile>[]) {
    this.wokerPool.enqueue(...tasks)
    .then(processes => {
      processes.forEach(process => {
        this.reader.addFile(process)
      })
    })
  }

  //执行声明周期
  private LIFECYCLE_EMIT: TProcessLifeCycle = async (lifecycle, params) => {
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

}