import SparkMd5 from 'spark-md5'
import { expose } from 'comlink'

export class Tasker {

  spark!: SparkMd5.ArrayBuffer
  uploader: any
  cache: Blob[] = []

  constructor() {
    this.init()
  }

  public ping() {
    return 'pong'
  }

  public init() {
    this.spark = new SparkMd5.ArrayBuffer()
    this.cache = []
  }

  public read(chunk: ArrayBuffer) {
    this.spark.append(chunk)
    this.cache && this.cache.push(new Blob([chunk]))
  }

  public readEnd(): string {
    return this.spark.end()
  }

  public getChunk(index: number) {
    return this.cache[index]
  }

  public clean() {
    this.init()
  }

}

expose(Tasker)

export default null as any