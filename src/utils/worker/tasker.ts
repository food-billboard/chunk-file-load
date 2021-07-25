import { ArrayBuffer as SparkMD5ArrayBuffer } from 'spark-md5'

export class Tasker {

  spark!: SparkMD5ArrayBuffer
  uploader: any
  cache: (Blob | ArrayBuffer)[] = []

  constructor() {
    this.init()
  }

  public static support() {
    try {
      return !!(typeof Worker != 'undefined')
    }catch(err) {
      return false
    }
  }

  public ping() {
    return 'pong'
  }

  public init() {
    this.spark = new SparkMD5ArrayBuffer()
    this.cache = []
  }

  private generateCacheChunk = (chunk: ArrayBuffer) => {
    return typeof Blob === 'undefined' ? chunk : new Blob([chunk])
  }

  public read(chunk: ArrayBuffer) {
    this.spark.append(chunk)
    this.cache && this.cache.push(this.generateCacheChunk(chunk))
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

  public close() {
    if(Tasker.support()) {
      return self.close()
    }
  }

  public cacheExists(length?: number) {
    return !!this.cache.length && ( typeof length === 'number' ? this.cache.length === length : true )
  }

}