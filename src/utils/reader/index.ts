import FileParse from './parse'
import WorkerPool from '../worker/worker.pool'
import { ECACHE_STATUS } from '../constant'
import { TProcessLifeCycle, Ttask, TWraperFile, TSetState } from '../../upload/index.d'

class FileReader {

  constructor(setState: TSetState, process: TProcessLifeCycle) {
    this.emitter = process
    this.setState = setState
  }

  private tasks: string[] = []
  private emitter!: TProcessLifeCycle
  public setState: TSetState

  //清空
  public clean(name?: string) {
    let names
    if(name) {
      names = [ name ]
    }else { 
      names = this.tasks
    }
    names.forEach(name => {
      WorkerPool.complete(name)
      const index = this.tasks.indexOf(name)
      if(!!~index) this.tasks.splice(index, 1)
    })
  }

  public static readonly ACTION_TYPE = {
    MD5: "GET_MD5",
    BASE64: "GET_BASE64_MD5",
    BUFFER: "GET_BUFFER_MD5",
    FILE: "GET_FILE_MD5"
  }

  public addFile(worker_id: string) {
    if(!this.tasks.includes(worker_id)) {
      this.tasks.push(worker_id)
      this.start(worker_id)
    }
    return this.tasks.length
  }

  //任务执行
  public async start(worker_id: string) {
    const process = WorkerPool.getProcess(worker_id)
    if(!process) return this.clean(worker_id)
    const task = process.task!
    await this.emitter('beforeRead', {
      name: task.symbol,
      task: task,
      status: ECACHE_STATUS.doing
    })
    const action = task.file.action
    switch(action) {
      case 'GET_MD5': 
        this.GET_MD5(worker_id, task)
        break
      case 'GET_BASE64_MD5':
        this.GET_BASE64_MD5(worker_id, task)
        break
      case 'GET_BUFFER_MD5':
        this.GET_BUFFER_MD5(worker_id, task)
        break
      case 'GET_FILE_MD5':
        this.GET_FILE_MD5(worker_id, task)
        break
      default:
        break
    }
  }

  //获取MD5(分片已预先完成)
  private async GET_MD5(worker_id: string, task: Ttask<TWraperFile>): Promise<string> {
    const fileParse = new FileParse(worker_id)
    this.setState(task.symbol, { chunks: [] })  
    return fileParse.files(task, this.emitter)
  }

  //获取base64的MD5
  private async GET_BASE64_MD5(worker_id: string, task: Ttask<TWraperFile>): Promise<string> {
    const fileParse = new FileParse(worker_id)
    return fileParse.base64(task, this.emitter)
  }

  //获取arraybuffer类型md5
  private async GET_BUFFER_MD5(worker_id: string, task: Ttask<TWraperFile>): Promise<string> {
    const fileParse = new FileParse(worker_id)
    return fileParse.arraybuffer(task, this.emitter)
  }

  //获取文件md5
  private async GET_FILE_MD5(worker_id: string, task: Ttask<TWraperFile>): Promise<string> {
    const fileParse = new FileParse(worker_id)
    return fileParse.blob(task, this.emitter)
  }

}

export default FileReader