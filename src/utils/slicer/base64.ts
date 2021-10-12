import { TWrapperTask, UploadContext } from '../../upload/type'
import Slicer, { TSlice } from './base'
import ArrayBufferSlicer from './arraybuffer'
export default class extends Slicer<string> {

  constructor(context: UploadContext, task: TWrapperTask) {
    super(context, task)
    this.slicer = new ArrayBufferSlicer(context, task)
  }

  private slicer:ArrayBufferSlicer

  public slice: TSlice<Promise<ArrayBuffer>> = async(start, end, file) => {
    const _start = start ?? 0
    let _file = this.context.atob(file as string)
    const _end = end ?? _file.byteLength
    return this.slicer.slice(_start, _end, _file)
  }

}