import SparkMd5 from 'spark-md5'
import { expose } from 'comlink'

let WORKER_TYPE: "reader" | "uploader"

export class Reader {

  spark!: SparkMd5.ArrayBuffer
  uploader: any

  constructor() {
    this.spark = new SparkMd5.ArrayBuffer()
  }

  public setUploader(uploader: any) {
    this.uploader = uploader
  }

  public read(chunk: ArrayBuffer) {
    this.spark.append(chunk)
  }

  public result(): string {
    return this.spark.end()
  }

}

expose(Reader)

export default null as any