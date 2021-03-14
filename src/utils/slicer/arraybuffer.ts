import Slicer, { TSlice } from './base'

export default class extends Slicer<ArrayBuffer> {

  private slicer = ArrayBuffer.prototype.slice

  public slice: TSlice<Promise<ArrayBuffer>> = async(start, end=this.file?.byteLength, file) => {
    const _start = start ?? 0
    const _file = (file ?? this.file) as ArrayBuffer 
    const _end = end ?? _file.byteLength
    return this.pluginEmit(this._slice, _start, _end, _file)
  }

  private _slice: TSlice<Promise<ArrayBuffer>> = async (start, end=this.file?.byteLength, file) => {
    return Promise.resolve(this.slicer.call(this.file || file, start, end))
  }

}