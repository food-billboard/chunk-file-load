import Upload from '../../upload'
import Slicer, { TSlice } from './base'
import ArrayBufferSlicer from './arraybuffer'
export default class extends Slicer<string> {

  constructor(context: Upload) {
    super(context)
    this.slicer = new ArrayBufferSlicer(context)
  }

  private slicer:ArrayBufferSlicer

  public slice: TSlice<Promise<ArrayBuffer>> = async(start, end, file) => {
    const _start = start ?? 0
    let _file = Upload.atob(file as string)
    const _end = end ?? _file.byteLength
    return this.slicer.slice(_start, _end, _file)
  }

}