import FileParse from './parse'
import WorkerPool from '../worker/worker.pool'
import { ECACHE_STATUS, EActionType } from '../constant'
import { isMd5 } from '../tool'
import { TProcessLifeCycle, TSetState, TGetState, TWrapperTask } from '../../upload/index.d'

class FileReader {

  constructor(emitter: {
    setState: TSetState
    getState: TGetState
  }, process: TProcessLifeCycle) {
    this.lifecycle = process
    this.emitter = emitter
  }

  protected tasks: string[] = []
  protected lifecycle: TProcessLifeCycle
  public emitter

  //清空
  public clean(name?: string) {
    let names
    if(name) {
      names = [ name ]
    }else { 
      names = this.tasks
    }
    names.forEach(name => {
      WorkerPool.worker_clean(name)
      const index = this.tasks.indexOf(name)
      if(!!~index) this.tasks.splice(index, 1)
    })
  }

  public async addFile(worker_id: string): Promise<string | null> {
    if(!this.tasks.includes(worker_id)) {
      this.tasks.push(worker_id)
    }
    return this.start(worker_id)
    .then((md5) => {
      if(!md5) return null
      const process = WorkerPool.getProcess(worker_id)
      const [ , task ] = this.emitter.getState(process?.task!)
      this.emitter.setState(task!.symbol, { file: { md5 } })
      return md5
    })
  }

  //任务执行
  public async start(worker_id: string) {
    const process = WorkerPool.getProcess(worker_id)
    if(!process) return this.clean(worker_id)
    const [ , task ] = this.emitter.getState(process.task!)
    const md5 = task!.file!.md5
    if(!!isMd5(md5 as string)) {
      return Promise.resolve(md5)
    }

    //read
    try {
      await this.lifecycle('beforeRead', {
        name: task!.symbol,
        status: ECACHE_STATUS.reading
      })
    }catch(err) {
      console.warn(err)
      return Promise.reject(err)
    }
    
    const action = task!.file.action
    const fileParse = new FileParse(worker_id)
    switch(action) {
      case EActionType.MD5: 
        return this.GET_MD5(task!, fileParse)
      case EActionType.BASE64:
        return this.GET_BASE64_MD5(task!, fileParse)
      case EActionType.BUFFER:
        return this.GET_BUFFER_MD5(task!, fileParse)
      case EActionType.FILE:
        return this.GET_FILE_MD5(task!, fileParse)
      default:
        break
    }
  }

  //获取MD5(分片已预先完成)
  private async GET_MD5(task: TWrapperTask, fileParse: FileParse): Promise<string> {
    this.emitter.setState(task.symbol, { file: { chunks: [] } })  
    return fileParse.files(task, this.lifecycle)
  }

  //获取base64的MD5
  private async GET_BASE64_MD5(task: TWrapperTask, fileParse: FileParse): Promise<string> {
    return fileParse.base64(task, this.lifecycle)
  }

  //获取arraybuffer类型md5
  private async GET_BUFFER_MD5(task: TWrapperTask, fileParse: FileParse): Promise<string> {
    return fileParse.arraybuffer(task, this.lifecycle)
  }

  //获取文件md5
  private async GET_FILE_MD5(task: TWrapperTask, fileParse: FileParse): Promise<string> {
    return fileParse.blob(task, this.lifecycle)
  }

}

export default FileReader