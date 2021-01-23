import { flat, isObject, base64Size } from '../tool'
import { merge } from 'lodash'
import Validator from '../validator'
import Reader from '../reader'
import { Ttask, TFileType, TEvents, TWraperFile } from '../../upload/index.d'
import { DEFAULT_CONFIG, ECACHE_STATUS } from '../constant'

export default class Emitter {

  public tasks: TEvents[] = []

  public getTask(name: Symbol):[number, TEvents | null] {
    const index = this.tasks.findIndex(task => task.symbol === name)
    return !!~index ? [ index, this.tasks[index] ] : [ -1, null ]
  }

  //获取文件信息
  private FILE_TYPE(file: any): TWraperFile {

    let fileType = Object.prototype.toString.call(file);
    [ fileType ] = fileType.match(/(?<=\[object ).+(?=\])/) || []

    let baseFileInfo: TWraperFile = {
      size: 0,
      name: null,
      file: file || null,
      action: Reader.ACTION_TYPE.MD5
    }

    switch(fileType.toLowerCase().trim()) {
      case 'file':
        return merge(baseFileInfo, {
          size: file?.size ?? 0,
          name: file?.name ?? null,
          action: Reader.ACTION_TYPE.FILE
        })
      case 'blob':
        return merge(baseFileInfo, {
          size: file?.size ?? 0,
          action: Reader.ACTION_TYPE.FILE
        })
      case 'arraybuffer':
        return merge(baseFileInfo, {
          size: file?.byteLength ?? 0,
          action: Reader.ACTION_TYPE.BUFFER
        })
      case 'string':
        return merge(baseFileInfo, {
          size: base64Size(file),
          action: Reader.ACTION_TYPE.BASE64
        })
      default:
        return baseFileInfo
    }
  }

  private taskValid(task: Ttask<TFileType>) {
    if(isObject(task)) {
      //参数验证
      const validate = new Validator()
      validate.add(task)
      const valid = validate.validate()
      if(valid === true) {
        return true
      }else {
        console.warn(`the params ${typeof valid == 'string' ? valid : ''} is not verify`)
      }
    }
    return false
  }

  private generateTask(task: Ttask<TFileType>): Ttask<TWraperFile> {
    const symbol: unique symbol = Symbol()
    const { config={}, file, mime, lifecycle, ...nextTask } = task
    return merge(nextTask, {
      lifecycle: lifecycle || {},
      mime: mime ? mime : (typeof file === 'string' || file instanceof ArrayBuffer ? undefined : file?.type),
      file: this.FILE_TYPE(file),
      config: merge(DEFAULT_CONFIG, config),
      symbol,
      status: ECACHE_STATUS.pending
    }) as Ttask<TWraperFile>
  }

  public on(...tasks: Ttask<TFileType>[]): Symbol[] {
    if(!tasks.length) return []

    let names: Symbol[] = []

    const result: Ttask<TWraperFile>[] = flat(tasks)
    .reduce((acc: Ttask<TWraperFile>[], task: Ttask<TFileType>) => {
      const { chunks } = task
      let newTask = task
      if(!!chunks) {
        newTask = merge(newTask, { _cp_: true })
      }

      if(this.taskValid(newTask)) {
        acc.push(this.generateTask(newTask))
        names.push(newTask.symbol)
      }
      return acc
    }, [])

    //加入事件队列
    this.tasks = merge(this.tasks, result)

    return names
  }

  public emit(...names: Symbol[]): TEvents<TWraperFile>[] {
    let tasks: TEvents<TWraperFile>[] = []
    names.forEach(name => {
      const [ index, task ] = this.getTask(name)
      if(task?.status === ECACHE_STATUS.pending && task?.symobl === name) {
        this.statusChange(ECACHE_STATUS.waiting, index)
        console.log('查看是否修改了状态变成了waiting' + task.status)
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
      if(!!task && task.status !== ECACHE_STATUS.pending) {
        acc.push(cur)
        this.statusChange(ECACHE_STATUS[status], index)
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

  public off(...names: Symbol[]) {
    if(!names.length) {
      this.clean()
      return 
    }
    this.tasks = this.tasks.filter(task => !names.includes(task.symbol))
  }

  public clean() {
    this.tasks = []
  }

  public setState(name: Symbol, value: Partial<Ttask<TWraperFile>>={}): Ttask<TWraperFile> {
    const [ index, task ] = this.getTask(name)
    this.tasks[index] = merge(task, value)
    return this.tasks[index]
  }

}