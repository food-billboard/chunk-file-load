import CustomProxy from '../proxy'
import { TFileType, TWrapperTask, UploadContext } from '../../upload/type'

export type TSlice<T=any> = (start: number, end?: number, file?: TFileType) => T

export default class Slicer<T extends TFileType> extends CustomProxy {

  constructor(context: UploadContext, task: TWrapperTask, file?: T) {
    super(context)
    this.task = task
    if(file) {
      this.file = file
    }
  }

  protected file!: T
  protected task!: TWrapperTask

  public error(err: any) {
    return Promise.reject(err)
  }

  protected async pluginEmit(origin: any, ...args: any[]) {
    if(this.hasSliceEmit()) {
      return new Promise<ArrayBuffer>((resolve, reject) => {
        this.emit('slicer', this.task, ...args, (err: any, chunk: ArrayBuffer) => {
          if(err) {
            reject(err)
          }else {
            resolve(chunk)
          }
        })
        setTimeout(() => {
          reject('timeout')
        }, 24 * 60 * 60 * 1000)
      })
    }else {
      return origin(...args)
    }
  }

}