import Upload from '../../upload'
import { TWrapperTask } from '../../upload/type'
import Slicer, { TSlice } from './base'

type TReaderResult = ProgressEvent<FileReader>

export default class extends Slicer<File | Blob> {

  constructor(context: Upload, task: TWrapperTask, file?: File | Blob, returnBlob: boolean = false) {
    super(context, task, file)
    this.returnBlob = returnBlob
    this.slicer = Blob?.prototype.slice
    if(typeof FileReader != 'undefined') this.fileReader = new FileReader()
  }

  private slicer
  private returnBlob: boolean = false
  private fileReader

  public _slice: TSlice<Promise<ArrayBuffer | Blob>> = async (start, end=this.file?.size, file) => {
    if(this.fileReader == undefined) return Promise.reject('this environment is not support the FileReader api')
    const chunk = this.slicer.call(this.file || file, start, end)
    if(this.returnBlob) return Promise.resolve(chunk)
    return new Promise((resolve, reject) => {
      this.fileReader!.onload = function(e: TReaderResult) {
        if(!e.target) return reject('读取错误')
        resolve(e.target.result as ArrayBuffer)
      }
      this.fileReader!.onerror = super.error
      this.fileReader!.readAsArrayBuffer(chunk)
    })
  }

  public slice: TSlice<Promise<ArrayBuffer | Blob>> = async (start, end=this.file?.size, file=this.file) => {
    const _start = start ?? 0
    const _file = (file ?? this.file) as File | Blob 
    const _end = end ?? _file.size
    return this.pluginEmit(this._slice, _start, _end, _file)
  }

}