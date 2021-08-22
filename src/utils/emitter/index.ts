import merge from 'lodash/merge'
import mergeWith from 'lodash/mergeWith'
import { STATUS_MAP } from './status.map'
import Upload from '../../upload/index'
import FileTool from '../file'
import { flat, base64Size } from '../tool'
import { ECACHE_STATUS, EActionType } from '../constant'
import { Ttask, TWrapperTask, TWraperFile, TFile, SuperPartial, TLifecycle, TRequestType } from '../../upload/type'

export default class Emitter {

  constructor(context: Upload) {
    this.context = context
  }

  private context: Upload

  public tasks: TWrapperTask[] = []

  public getTask(name: Symbol): [number, TWrapperTask | null] {
    const index = this.tasks.findIndex(task => task.symbol === name)
    return !!~index ? [ index, this.tasks[index] ] : [ -1, null ]
  }

  public getTasks() {
    return this.tasks
  }

  //获取文件信息
  private FILE_TYPE(unWrapperFile: TFile): TWraperFile {

    const { file, mime } = unWrapperFile

    let fileType = Object.prototype.toString.call(file);
    try {
      [ fileType ] = fileType.match(/(?<=\[object ).+(?=\])/) || []
    }catch(err) {
      fileType = fileType.replace("[object ", "").replace("]", "")
    }
    fileType = fileType.toLowerCase().trim()

    let baseFileInfo: Partial<TWraperFile> = merge({
      size: 0,
      name: '',
      file: file || null,
      action: EActionType.MD5,
    }, unWrapperFile)

    switch(fileType) {
      case 'file':
        baseFileInfo = merge(baseFileInfo, {
          size: (file as File)?.size ?? 0,
          name: (file as File)?.name ?? null,
          action: EActionType.FILE,
          mime: mime ? mime : (file as File).type,
        })
        break
      case 'blob':
        baseFileInfo = merge(baseFileInfo, {
          size: (file as Blob)?.size ?? 0,
          action: EActionType.FILE,
        })
        break
      case 'arraybuffer':
        baseFileInfo = merge(baseFileInfo, {
          size: (file as ArrayBuffer)?.byteLength ?? 0,
          action: EActionType.BUFFER
        })
        break
      case 'string':
        baseFileInfo = merge(baseFileInfo, {
          size: base64Size(file as string),
          action: EActionType.BASE64
        })
        break
      default:
        
    }
    return baseFileInfo as TWraperFile

  }

  private lifecycleBinding = (lifecycle:TLifecycle ={}) => {
    const entries = Object.entries(lifecycle) as [
      keyof TLifecycle, TLifecycle[keyof TLifecycle]
    ][]
    return entries.reduce<{
      [K in keyof TLifecycle]: TLifecycle[K]
    }>((acc, cur) => {
      const [ key, value ] = cur 
      acc[key] = value!.bind(this.context) as any
      return acc
    }, {})
  }

  private requestBinding = (request: TRequestType) => {
    const requestList = Object.entries(request) as [ keyof TRequestType, TRequestType[keyof TRequestType] ][]
    return requestList.reduce<{
      [K in keyof TRequestType]: TRequestType[K]
    }>((acc, cur) => {
      const [ key, value ] = cur
      acc[key] = value?.bind(this.context) as any
      return acc
    }, {} as { [K in keyof TRequestType]: TRequestType[K] })
  }

  private generateTask(task: Ttask, name: symbol): TWrapperTask{
    const { config={}, file, lifecycle, request, ...nextTask } = task
    const realConfig = merge({}, this.context.defaultConfig, config)

    return merge(nextTask, {
      request: this.requestBinding(request),
      process: {
        current: 0,
        complete: 0,
        total: 0
      },
      lifecycle: this.lifecycleBinding(lifecycle || {}),
      file: this.FILE_TYPE(file),
      config: realConfig,
      symbol: name,
      status: ECACHE_STATUS.pending
    }) as TWrapperTask
  }

  public add(...tasks: Ttask[]): Symbol[] {
    if(!tasks.length) return []

    let names: Symbol[] = []

    const result: TWrapperTask[] = flat(tasks)
    .reduce((acc: TWrapperTask[], task: Ttask) => {
      const { file } = task
      const symbol: unique symbol = Symbol()
      let newTask = FileTool(() => {
        const [ , task ] = this.getTask(symbol)
        return task!
      })
      newTask = merge({}, newTask, task)
      if(newTask.tool.file.isTaskValid(file)) {
        if(newTask.tool.file.isChunkComplete(file)) {
          newTask = merge(newTask, { file: merge(file, { _cp_: true }) })
        }
        newTask = this.generateTask(newTask, symbol)
        acc.push(newTask)
        names.push(newTask.symbol)
      }
      return acc
    }, [])

    //加入事件队列
    this.tasks.push(...result)

    return names
  }

  public deal(...names: Symbol[]): TWrapperTask[] {
    let tasks: TWrapperTask[] = []
    names.forEach(name => {
      const [ index, task ] = this.getTask(name)
      if(task?.tool.file.isTaskDeal() && task?.symbol === name) {
        this.statusChange(ECACHE_STATUS.waiting, index)
        tasks.push(task)
      }
    })

    return tasks

  }

  public statusChange(status: ECACHE_STATUS, index: number | Symbol) {
    if(typeof index === 'number') {
      this.tasks[index].status = status
    }else {
      const [ target, task ] = this.getTask(index)
      this.tasks[target] = merge(task, { status })
    }
  }

  private dealDoingTaskStatus(status: ECACHE_STATUS.cancel | ECACHE_STATUS.stopping, ...names: Symbol[]) {
    return names.reduce((acc: Symbol[], cur: Symbol) => {
      const [index, task] = this.getTask(cur)
      if(!!task && task.tool.file.isTaskStopOrCancel()) {
        acc.push(cur)
        this.statusChange(status, index)
      }
      return acc
    }, [])
  }

  public stop(...names: Symbol[]): Symbol[] {
    return this.dealDoingTaskStatus(ECACHE_STATUS.stopping, ...names)
  }

  public cancel(...names: Symbol[]): Symbol[] {
    return this.dealDoingTaskStatus(ECACHE_STATUS.cancel, ...names)
  }

  public cancelAdd(...names: Symbol[]): Symbol[] {
    const tasks = this.tasks 
    const dealTasks = tasks.filter(task => task.tool.file.isTaskCancelAdd() && names.includes(task.symbol))
    if(!dealTasks.length) return []
    return this.off(...dealTasks.map(task => task.symbol))
  }

  public off(...names: Symbol[]): Symbol[] {
    const tasks = this.tasks
    if(!names.length) {
      const names = tasks.map(task => task.symbol)
      this.clean()
      return names
    }
    this.tasks = this.tasks.filter(task => !names.includes(task.symbol))
    return names
  }

  public clean() {
    this.tasks = []
  }

  private customerMergeMethod = (objValue: TWrapperTask, srcValue: SuperPartial<TWrapperTask>): any => {
    if (Array.isArray(objValue) && Array.isArray(srcValue)) {
      return mergeWith(objValue.slice(0, srcValue.length), srcValue, this.customerMergeMethod)
    }
  }

  public setState = (name: Symbol, value: SuperPartial<TWrapperTask>={}): TWrapperTask => {
    const [ index, task ] = this.getTask(name)
    const nowStatus = task?.status
    const nextStatus = value.status
    let status = typeof nextStatus === 'number' ? STATUS_MAP[nowStatus!](nextStatus, task) ?? nowStatus : nowStatus
    this.tasks[index] = mergeWith(task, value, { status }, this.customerMergeMethod)
    return this.tasks[index]
  }

}