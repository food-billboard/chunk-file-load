import merge from 'lodash/merge'
import get from 'lodash/get'
import { isMd5, isObject } from '../tool' 
import { ECACHE_STATUS } from '../constant'
import { TWrapperTask, TFile } from '../../upload/type'

export class FileTool {

  constructor(getTask: () => TWrapperTask) {
    this.getTask = getTask 
  }

  private getTask: () => TWrapperTask

  private get file() {
    return this.getTask()
  }

  //是否忽略文件解析
  public isParseIgnore() {
    return !!this.file?.config.parseIgnore || !!isMd5(this.file?.file.md5!)
  } 

  //md5 是否合理
  public isMd5(md5: string) {
    return !!this.file?.config.parseIgnore ? true : !!isMd5(md5)
  }

  //exitFn 是否执行
  public isExitFnEmit() {
    return !this.file?.config.parseIgnore
  }

  //任务格式是否正确
  public isTaskValid(file: TFile) {
    if(isObject(file)) {
      //参数验证
      if(!file?.file && !file?.chunks) {
        console.warn('the params is not verify')
        return false
      }
      return true
    }
    return false
  }

  //任务是否可执行
  public isTaskDeal(task?: TWrapperTask) {
    const status = this.getStatus(task)
    return status === ECACHE_STATUS.pending
  }

  //任务是否可取消任务新增
  public isTaskCancelAdd(task?: TWrapperTask) {
    const status = this.getStatus(task)
    return status === ECACHE_STATUS.pending
  }

  //任务是否可停止或取消
  public isTaskStopOrCancel(task?: TWrapperTask) {
    const status = this.getStatus(task)
    return status > ECACHE_STATUS.pending
  }

  //文件是否分片完成
  public isChunkComplete(file: TFile) {
    return Array.isArray(file?.chunks) && !!file?.chunks.length
  }

  //文件是否开始上传
  public isFileUploadStart(task?: TWrapperTask) {
    const status = this.getStatus(task)
    return status === ECACHE_STATUS.reading 
    || status === ECACHE_STATUS.uploading 
    || status === ECACHE_STATUS.rejected
    || status === ECACHE_STATUS.stopping
  }

  private getStatus(task?:TWrapperTask) {
    return task?.status ?? this.file?.status
  }

  //是否暂停
  public isStop(task?: TWrapperTask) {
    const status = this.getStatus(task)
    return status === ECACHE_STATUS.stopping
  }

  //是否取消
  public isCancel(task?: TWrapperTask) {
    const status = this.getStatus(task)
    return status === ECACHE_STATUS.cancel
  }

  //是否队列中
  public isPending(task?:TWrapperTask) {
    const status = this.getStatus(task)
    return status === ECACHE_STATUS.pending 
  }

  //是否失败
  public isRejected(task?:TWrapperTask) {
    const status = this.getStatus(task)
    return status === ECACHE_STATUS.rejected 
  }

  //文件类型
  public getFileType() {
    const mime = get(this.file, "file.mime")
    const defaultType = get(this.file, "file.file.type")
    return defaultType || mime
  }

  //文件是否上传完成
  public isTaskComplete(task?: TWrapperTask) {
    const status = this.getStatus(task)
    return status === ECACHE_STATUS.fulfilled
  }

  //任务是否正在执行
  public isTaskDealing(task?: TWrapperTask) {
    const status = this.getStatus(task)
    return status > ECACHE_STATUS.pending && status < ECACHE_STATUS.fulfilled
  }

}

export default function(getTask: () => TWrapperTask): TWrapperTask {
  const file = getTask()
  return merge({}, file || {}, {
    tool: {
      file: new FileTool(getTask)
    }
  })
}