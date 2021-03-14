import Upload from '../../upload'
import Slicer, { TSlice } from './base'

type TReaderResult = ProgressEvent<FileReader>

export default class extends Slicer<File | Blob> {

  constructor(context: Upload, file?: File | Blob, returnBlob: boolean = false) {
    super(context, file)
    this.returnBlob = returnBlob
  }

  private slicer = Blob.prototype.slice
  private returnBlob: boolean = false
  private fileReader = new FileReader()

  public _slice: TSlice<Promise<ArrayBuffer | Blob>> = async (start, end=this.file?.size, file) => {
    const chunk = this.slicer.call(this.file || file, start, end)
    if(this.returnBlob) return Promise.resolve(chunk)
    return new Promise((resolve, reject) => {
      this.fileReader.onload = function(e: TReaderResult) {
        if(!e.target) return reject('读取错误')
        resolve(e.target.result as ArrayBuffer)
      }
      this.fileReader.onerror = super.error
      this.fileReader.readAsArrayBuffer(chunk)
    })
  }

  public slice: TSlice<Promise<ArrayBuffer | Blob>> = async (start, end=this.file?.size, file=this.file) => {
    const _start = start ?? 0
    const _file = (file ?? this.file) as File | Blob 
    const _end = end ?? _file.size
    return this.pluginEmit(this._slice, _start, _end, _file)
  }

}