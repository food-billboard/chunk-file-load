import Slicer from './base'
import { TFileType } from '../../upload/index.d'

export default class extends Slicer<ArrayBuffer> {

  private slicer = ArrayBuffer.prototype.slice

  public async slice(start: number, end: number=this.file.byteLength, file?: TFileType) {
    return Promise.resolve(this.slicer.call(this.file || file, start, end))
  }

}