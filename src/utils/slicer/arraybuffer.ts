import Slicer, { TSlice } from './base'

export default class extends Slicer<ArrayBuffer> {

  private slicer = ArrayBuffer.prototype.slice

  public slice: TSlice<Promise<ArrayBuffer>> = async(start, end=this.file.byteLength, file) => {
    return this.pluginEmit(this._slice, start, end, this.file || file)
  }

  private _slice: TSlice<Promise<ArrayBuffer>> = async (start, end=this.file.byteLength, file) => {
    return Promise.resolve(this.slicer.call(this.file || file, start, end))
  }

}