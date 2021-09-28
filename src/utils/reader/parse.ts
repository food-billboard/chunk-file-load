import { ArrayBuffer as SparkMD5ArrayBuffer } from 'spark-md5'
// import { transfer } from 'comlink'
import { noop, merge } from 'lodash'
import Upload from '../../upload'
import Proxy from '../proxy'
import WorkerPool, { TProcess } from '../worker/worker.pool'
import { TWrapperTask } from '../../upload/type'
import { ECACHE_STATUS } from '../constant'
import { BlobSlicer, ArrayBufferSlicer, FilesSlicer } from '../slicer'

type TNext = () => Promise<void>
type TDone = (value: string | PromiseLike<string>) => void
type TError = (err: any) => void

export default class extends Proxy {

  constructor(context: Upload, worker_id: string) {
    super(context)
    this.worker = WorkerPool.getProcess(worker_id)
  }

  worker: TProcess | null

  protected workerExists(): boolean {
    return !!this.worker
  }

  protected async read(buffer: ArrayBuffer) {
    // return this.worker!.worker.read(transfer(buffer, [buffer]))
    return this.worker!.worker.read(buffer)
  }

  protected async readEnd() {
    return this.worker!.worker.readEnd()
  }

  sparkMethod() {
    const workerExists = this.workerExists()
    const that = this

    if(workerExists) {
      const spark = new SparkMD5ArrayBuffer()

      return async function(buffer: ArrayBuffer, { next, done }: { next: TNext | false, done: TDone | false, error: TError }) {
        //添加读取的内容
        spark.append(buffer)
        if(next) {
          await next()
        }
        //读取完毕
        else if(done){
          const result = spark.end()
          spark.destroy()
          done(result)
        }
      }
    }

    return async function(buffer: ArrayBuffer, { next, done, error }: { next: TNext | false, done: TDone | false, error: TError }) {
      try {
        await that.read(buffer)
      }catch(err) {
        return error(err)
      }

      //继续读取
      if(next) {
        await next()
      }
      //读取完毕
      else if(done){
        const result = await that.readEnd()
        done(result)
      }
    }

  }

  public async blob(task: TWrapperTask): Promise<string> {

    const { file: { size, file }, config: { chunkSize }, symbol } = task
    const that = this

    let currentChunk:number = 0,
      totalChunks: number = Math.ceil(size / chunkSize)
    const blobSlicer = new BlobSlicer(this.context, task, file as Blob)

    return new Promise(async (resolve, reject) => {

      const sparkMethod = that.sparkMethod()

      //文件内容读取
      async function loadNext() {
        let start: number = currentChunk * chunkSize,
            end: number = currentChunk + 1 === totalChunks ? size : (currentChunk + 1) * chunkSize,
            chunks: ArrayBuffer
        try {
          chunks = await blobSlicer.slice(start, end) as ArrayBuffer
          await that.dealLifecycle('reading', {
            name: symbol,
            status: ECACHE_STATUS.reading,
            current: end,
            // end,
            total: size
            // chunk: chunks
          })
          
          let next: TNext | false = false
          let done: TDone | false = false
          let error = reject

          if(++currentChunk < totalChunks) {
            next = loadNext
          }else {
            done = resolve
          }

          await sparkMethod(chunks, { next, done, error })
        }catch(err) {
          reject(err)
        }

      }

      await loadNext()

    })

  }

  public async arraybuffer(task: TWrapperTask): Promise<string> {

    const that = this
    const { file: { size, file }, config: { chunkSize }, symbol } = task

    let currentChunk:number = 0,
      totalChunks: number = Math.ceil(size / chunkSize),
      sparkMethod = this.sparkMethod()
    const arraybufferSlicer = new ArrayBufferSlicer(this.context, task, file as ArrayBuffer)

    return new Promise(async (resolve, reject) => {

      async function loadNext() {
        let start: number = currentChunk * chunkSize,
          end: number = currentChunk + 1 === totalChunks ? size : ( currentChunk + 1 ) * chunkSize,
          chunks: ArrayBuffer
        try {
          chunks = await arraybufferSlicer.slice(start, end)

          await that.dealLifecycle('reading', {
            name: symbol,
            status: ECACHE_STATUS.reading,
            current: end,
            // end,
            total: size
            // chunk: chunks
          })
          
          let next: TNext | false = false
          let done: TDone | false = false
          let error = reject

          if(++currentChunk < totalChunks) {
            next = loadNext
          }else {
            done = resolve
          }

          await sparkMethod(chunks, { next, done, error })
        }catch(err) {
          reject(err)
        }
      }

      await loadNext()

    })


  }

  public async base64(task: TWrapperTask): Promise<string> {
    const { file } = task
    const bufferFile = Upload.atob(file.file as string)
    return this.arraybuffer(merge(task, { file: merge(file, { file: bufferFile }) }))
  }

  public async files(task: TWrapperTask): Promise<string> {

    const that = this

    const { file: { chunks, md5, size }, symbol, config: { chunkSize }, tool } = task

    let completeChunks:number = 0
    let totalChunks = chunks!.length
    let currentChunk:number = 0
    const filesSlicer = new FilesSlicer(this.context, task)
    const total = typeof size === 'number' && size > 0 ? size : chunkSize * chunks.length
    let realTotal = 0

    let sparkMethod = this.sparkMethod()

    // blob -> file -> base64

    return new Promise(async (resolve, reject) => {

      if(tool.file.isParseIgnore()) {
        sparkMethod = noop as any
      }

      async function loadNext() {
        try {
          const chunk = chunks![currentChunk]
          const data = await filesSlicer.slice(chunk)
          let size: number = data.byteLength
          realTotal += size
          completeChunks += (Number.isNaN(size) ? 0 : size)
          await that.dealLifecycle('reading', {
            name: symbol,
            status: ECACHE_STATUS.reading,
            current: completeChunks,
            // end: completeChunks += (Number.isNaN(size) ? 0 : size),
            total, //暂时无法知道总的文件大小
            // chunk: new Blob([data])
          })
          
          let next: TNext | false = false
          let done: TDone | false = false
          let error = reject

          if(++currentChunk < totalChunks) {
            next = loadNext
          }else {
            that.setState(symbol, {
              file: {
                size: realTotal
              }
            })
            done = resolve
          }

          await sparkMethod(data, { next, done, error })
        }catch(err) {
          reject(err)
        }
      }

      await loadNext()

    })

  }

}