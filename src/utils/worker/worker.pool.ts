import { merge, noop } from 'lodash'
// import { Remote, wrap, releaseProxy } from 'comlink'
import Queue from '../queue'
import { Tasker } from './tasker'
import { TWrapperTask } from '../../upload/type'

export type TProcess = {
  id: string
  busy: boolean
  task?: Symbol
  worker?: any
  release?: () => void,
}

const inspectIntervalTime = 10 * 1000

//线程池
class WorkerPool {

  private static dealLoading = false 

  public static getProcess(id: string): TProcess | null {
    if(!id) return null
    return WorkerPool.process.find(procs => procs.id == id) || null
  }

  public static getProcesses():TProcess[] {
    return WorkerPool.process
  }

  private static readonly QUEUE = new Queue<TWrapperTask>()

  private static async inspectThreads() {
    if (WorkerPool.process.length > 0) {
      for(let i = 0; i < WorkerPool.process.length; i ++) {
        const thread = WorkerPool.process[i]
        const res = await thread.worker?.ping()
        if(res != 'pong') {
          WorkerPool.worker_clean(thread.id)
        }
      }
    }
  }

  //线程池最大数量
  private static readonly PROCESS_LIMIT = typeof window !== "undefined" ? window?.navigator.hardwareConcurrency || 4 : 4

  private static inspectTimer:NodeJS.Timeout

  //初始化
  private static initProcessPool(): TProcess[] {
    if(typeof WorkerPool.inspectTimer !== 'number') {
      WorkerPool.inspectTimer = setInterval(WorkerPool.inspectThreads, inspectIntervalTime)
    }
    return new Array(WorkerPool.PROCESS_LIMIT).fill(0).map((_, index) => ({ id: index + '', busy: false }))
  }

  //线程创建
  private static async createThread (id: string): Promise<TProcess> {
    let baseThread = {
      id,
      busy: false,
    }

    const hack = () => {
      baseThread = merge(baseThread, {
        worker: new Tasker(),
        release: noop
      })
    }

    hack()

    // try {
    //   if(Tasker.support()) {
    //     const originWorker = new Worker('./file.worker.ts', { type: 'module' })
    //     const worker: Remote<any> = wrap<Tasker>((originWorker as any))
    //     const instance = await new (worker as any)()
    //     baseThread = merge(baseThread, {
    //       worker: instance,
    //       release: () => worker[releaseProxy]()
    //     })
    //   }else {
    //     hack()
    //   }
    // }catch(err) {
    //   hack()
    // }

    return baseThread
  }

  //线程池
  private static process:TProcess[] = WorkerPool.initProcessPool()

  //入队
  public async enqueue (...tasks: Symbol[]): Promise<string[]> {
    tasks.forEach(task => {
      WorkerPool.QUEUE.enqueue(task as any)
    })
    return this.taskDeal()
  }

  //出队
  public dequeue(): Symbol | null {
    return (WorkerPool.QUEUE.dequeue() as any) || null
  }

  public static queueIsEmpty() {
    return WorkerPool.QUEUE.isEmpty()
  }

  //线程是否在工作中
  public static isBusy(id?: string): boolean {
    if(!!id) {
      const worker = WorkerPool.process.find(worker => worker?.id == id)
      return !!worker?.busy
    }
    if(WorkerPool.process.length < WorkerPool.PROCESS_LIMIT) return false
    return WorkerPool.process.every(worker => worker.busy)
  }

  //未繁忙的线程
  private static getUnBusyProcess() {
    return WorkerPool.process.filter(procs => !procs.busy && !procs.task)
  }

  //设置线程信息
  private static setProcessInfo(values: Partial<TProcess>={}): undefined | TProcess {
    const { id } = values
    const index = WorkerPool.process.findIndex(procs => procs.id === id)
    let newProcess
    if(!!~index) {
      newProcess = {
        ...WorkerPool.process[index],
        ...values
      }
      WorkerPool.process[index] = newProcess
    }
    return newProcess
  }

  //任务执行
  private async taskDeal(): Promise<string[]> {
    if(WorkerPool.queueIsEmpty() || WorkerPool.isBusy() || WorkerPool.dealLoading) return []
    WorkerPool.dealLoading = true 

    let workers: string[] = []
    const process = WorkerPool.getUnBusyProcess()
    
    for(let i = 0; i < process.length; i ++) {
      if(WorkerPool.queueIsEmpty()) break

      const task = this.dequeue() as Symbol

      const { worker, id } = process[i]
      let newProcess: TProcess  = merge(process[i], { busy: false, task })
      if(!worker) {
        const process = await WorkerPool.createThread(id)
        newProcess = merge(process, { busy: true })
      }
      WorkerPool.setProcessInfo(newProcess)
      workers.push(newProcess.id)
    }
    WorkerPool.dealLoading = false 
    return workers
  }

  //线程任务完成
  public static worker_clean(worker_id: string) {
    const process = WorkerPool.getProcess(worker_id)
    let baseConfig: Partial<TProcess> = {
      id: worker_id,
      busy: false,
      task: undefined,
    }
    
    if(WorkerPool.queueIsEmpty()) {
      process?.worker?.close()
      process?.release && process?.release()
      baseConfig = {
        ...baseConfig,
        release: noop, 
        worker: null
      }
    }else {
      process?.worker?.clean()
    }
    WorkerPool.setProcessInfo(baseConfig)
  } 

}

export default WorkerPool