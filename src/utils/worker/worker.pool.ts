import { merge } from 'lodash'
import { Remote, wrap } from 'comlink'
import Queue from '../queue'
import Worker, { Reader } from './file.worker'
import { TEvents, TWraperFile } from '../../upload/index.d'

export type TProcess = {
  id: string
  busy: boolean
  task?: TEvents<TWraperFile>
  worker?: any
}

export type TWorkerMessageType = 'close' | 'post' | 'log4upload' | 'result' | 'log4read'

type TCloseData = undefined
type TPostData = ArrayBuffer
type TLogUploadData = {
  current: number
  precent: number
  total: number
  current_size: number
  total_size: number
}
type TLoadReadData = {

}
type TResultData = string

type TResponseData<T=TCloseData | TPostData | TLogUploadData | TResultData | TLoadReadData> = {
  threadCode: 0 | 1
  threadData: {
    // taskId, 
    data: T, 
    // code, 
    // msg
  }
  threadMsg:  string
  channel: 'close' | 'post' | 'log4upload' | 'result' | 'log4read' | 'pong'
}

const inspectIntervalTime = 10 * 1000

//线程池
class WorkerPool {

  public static getProcess(id: string): TProcess | null {
    if(!id) return null
    return WorkerPool.process.find(procs => procs.id == id) || null
  }

  private static readonly QUEUE = new Queue()

  private static inspectThreads() {
    if (WorkerPool.process.length > 0) {
      WorkerPool.process.forEach(thread => {
        console.info(`Inspection thread ${thread.id} starts.`);
        thread.worker.postMessage({
          channel: 'ping',
          data: { id: thread.id }
        })
      })
    }
  }

  //线程池最大数量
  private static readonly PROCESS_LIMIT = window.navigator.hardwareConcurrency || 4

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
    const worker: Remote<any> = wrap<Reader>(new (Worker as any)())
    const instance = await new (worker as any)()
    return {
      worker: instance,
      id,
      busy: false,
    }
  }

  //线程池
  private static process:TProcess[] = WorkerPool.initProcessPool()

  //入队
  public enqueue(...tasks: TEvents<TWraperFile>[]) {
    tasks.forEach(task => {
      WorkerPool.QUEUE.enqueue(task)
    })
    return this.taskDeal()
  }

  //出队
  public dequeue(): TEvents<TWraperFile> {
    return this.dequeue()
  }

  //线程是否在工作中
  public static isBusy(id?: string): boolean {
    if(!!id) {
      const worker = WorkerPool.process.find(worker => worker?.id == id)
      return !!worker?.busy
    }
    if(WorkerPool.process.length < WorkerPool.PROCESS_LIMIT) return false
    return WorkerPool.process.some(worker => !worker.busy)
  }

  //未繁忙的线程
  private static getUnBusyProcess() {
    return WorkerPool.process.filter(procs => !procs.busy)
  }

  //设置线程信息
  private static setProcessInfo(values: Partial<TProcess>={}): undefined | TProcess {
    const { id } = values
    const index = WorkerPool.process.findIndex(procs => procs.id === id)
    let newProcess
    if(!!~index) {
      newProcess = merge(WorkerPool.process[index], values)
      WorkerPool.process[index] = newProcess
    }
    return newProcess
  }

  //任务执行
  private async taskDeal(): Promise<string[]> {
    if(WorkerPool.QUEUE.isEmpty() || WorkerPool.isBusy()) return []

    let workers: string[] = []
    const process = WorkerPool.getUnBusyProcess()
    
    for(let i = 0; i < process.length; i ++) {
      if(WorkerPool.QUEUE.isEmpty()) return []

      const task: TEvents<TWraperFile> = this.dequeue()

      const { worker, id } = process[i]
      let newProcess: TProcess  = merge(process[i], { busy: false, task })
      if(!worker) {
        const process = await WorkerPool.createThread(id)
        newProcess = merge(process, { busy: true })
      }
      WorkerPool.setProcessInfo(newProcess)

      workers.push(newProcess.id)
    }

    return workers
  }

  //线程任务完成
  public static complete(id: string) {

  } 

}

export default WorkerPool