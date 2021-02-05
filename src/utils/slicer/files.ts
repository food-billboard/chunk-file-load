import { TFileType } from '../../upload/index.d'
import ArrayBufferSlicer from './arraybuffer'
import Base64Slicer from './base64'
import BlobSlicer from './blob'

export default class {

  constructor() {
    this.base64 = new Base64Slicer()
    this.blob = new BlobSlicer()
    this.arraybuffer = new ArrayBufferSlicer()
  }

  private arraybuffer: ArrayBufferSlicer
  private base64: Base64Slicer
  private blob: BlobSlicer

  public async slice(file: TFileType, _start?: number, _end?: number) {

    const start = _start || 0
    const end = _end

    if(typeof file === 'string') {
      return (this.base64 as any).slice(start, end, file)
    }else if(file instanceof ArrayBuffer) {
      return this.arraybuffer.slice(start, end, file)
    }else if(file instanceof File || file instanceof Blob){
      return this.blob.slice(start, end, file)
    }
    return Promise.reject()

  }

}