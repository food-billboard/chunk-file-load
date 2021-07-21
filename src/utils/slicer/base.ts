import Upload from '../../upload'
import Proxy from '../proxy'
import { TFileType, TWrapperTask } from '../../upload/type'

export type TSlice<T=any> = (start: number, end?: number, file?: TFileType) => T

export default class Slicer<T extends TFileType> extends Proxy {

  constructor(context: Upload, task: TWrapperTask, file?: T) {
    super(context)
    if(file) {
      this.file = file
      this.task = task
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
        this.emit('slicer', this.task, ...args, (chunk: ArrayBuffer) => {
          resolve(chunk)
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