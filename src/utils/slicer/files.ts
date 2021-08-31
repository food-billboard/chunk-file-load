import Upload from '../../upload'
import { TFileType, TWrapperTask } from '../../upload/type'
import ArrayBufferSlicer from './arraybuffer'
import Base64Slicer from './base64'
import BlobSlicer from './blob'

export default class {

  constructor(context: Upload, task: TWrapperTask) {
    this.base64 = new Base64Slicer(context, task)
    this.blob = new BlobSlicer(context, task)
    this.arraybuffer = new ArrayBufferSlicer(context, task)
  }

  private arraybuffer: ArrayBufferSlicer
  private base64: Base64Slicer
  private blob: BlobSlicer

  public async slice(file: TFileType, _start?: number, _end?: number) {

    let start = _start || 0
    let end = _end

    if(typeof file === 'string') {
      return (this.base64 as any).slice(start, end, file)
    }else if(Object.prototype.toString.call(file) === '[object ArrayBuffer]') {
      return this.arraybuffer.slice(start, end, file)
    }else if(file instanceof File || file instanceof Blob) {
      return this.blob.slice(start, end, file)
    }

    console.log(file, 11111111)
    return Promise.reject('the file type is not support')

  }

}