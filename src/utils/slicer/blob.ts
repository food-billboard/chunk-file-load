import { TFileType } from '../../upload/index.d'
import Slicer from './base'

type TReaderResult = ProgressEvent<FileReader>

export default class extends Slicer<File | Blob> {

  constructor(file?: File | Blob, returnBlob: boolean = false) {
    super(file)
    this.returnBlob = returnBlob
  }

  private slicer = Blob.prototype.slice
  private returnBlob: boolean = false
  private fileReader = new FileReader()

  public async slice(start: number, end: number=this.file.size, file?: TFileType): Promise<ArrayBuffer | Blob> {
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

}