import SparkMD5 from 'spark-md5'
import { transfer } from 'comlink'
import { noop, merge } from 'lodash'
import { base64ToArrayBuffer, isMd5 } from '../tool'
import WorkerPool, { TProcess } from '../worker/worker.pool'
import { TWrapperTask, TProcessLifeCycle } from '../../upload/index.d'
import { ECACHE_STATUS } from '../constant'
import { BlobSlicer, ArrayBufferSlicer, FilesSlicer } from '../slicer'

export default class {

  constructor(worker_id: string) {
    const worker = WorkerPool.getProcess(worker_id)
    this.worker = worker
  }

  worker: TProcess | null

  protected workerExists(): boolean {
    return !!this.worker
  }

  protected async read(buffer: ArrayBuffer) {
    return this.worker!.worker.read(transfer(buffer, [buffer]))
  }

  protected async readEnd() {
    return this.worker!.worker.readEnd()
  }

  public async blob(task: TWrapperTask, process: TProcessLifeCycle): Promise<string> {

    const { file: { size, file }, config: { chunkSize }, symbol } = task
    const that = this

    let currentChunk:number = 0,
      totalChunks: number = Math.ceil(size / chunkSize),
      spark!:SparkMD5.ArrayBuffer
    const blobSlicer = new BlobSlicer(file as Blob)
    const workerExists = this.workerExists()

    return new Promise(async (resolve, reject) => {

      function getSparkMethod() {

        if(!workerExists) {
          if(!spark) spark = new SparkMD5.ArrayBuffer()
  
          return async function(buffer: ArrayBuffer) {
            //添加读取的内容
            spark.append(buffer)
            currentChunk ++
            //继续读取
            if(currentChunk < totalChunks) {
              await loadNext()
            }
            //读取完毕
            else {
              const result = spark.end()
              spark.destroy()
              resolve(result)
            }
    
          }
        }
  
        return async function(buffer: ArrayBuffer) {

            try {
              await that.read(buffer)
            }catch(err) {
              return reject(err)
            }

            currentChunk ++
            //继续读取
            if(currentChunk < totalChunks) {
              await loadNext()
            }
            //读取完毕
            else {
              resolve(that.readEnd())
            }

        }
    
      }

      const sparkMethod = getSparkMethod()

      //文件内容读取
      async function loadNext() {
        let start: number = currentChunk * chunkSize,
          end: number = currentChunk + 1 === totalChunks ? size : (currentChunk + 1) * chunkSize,
          chunks: ArrayBuffer

        try {
          chunks = await blobSlicer.slice(start, end) as ArrayBuffer
          await process('reading', {
            name: symbol,
            status: ECACHE_STATUS.reading,
            current: start,
            // end,
            total: size
            // chunk: chunks
          })
          await sparkMethod(chunks)
        }catch(err) {
          reject(err)
        }

      }

      await loadNext()

    })

  }

  public async arraybuffer(task: TWrapperTask, process: TProcessLifeCycle): Promise<string> {

    const that = this

    const { file: { size, file }, config: { chunkSize }, symbol } = task

    let currentChunk:number = 0,
      totalChunks: number = Math.ceil(size / chunkSize),
      spark!:SparkMD5.ArrayBuffer,
      getSparkMethod: (data: ArrayBuffer) => Promise<void>
    const arraybufferSlicer = new ArrayBufferSlicer(file as ArrayBuffer)
    const workerExists = this.workerExists()

    return new Promise(async (resolve, reject) => {

      if(!workerExists) {
        if(!spark) spark = new SparkMD5.ArrayBuffer()
        getSparkMethod = async (data) => {
          //添加读取的内容
          spark.append(data)
          //读取完毕
          if(currentChunk >= totalChunks) {
            const result = spark.end()
            spark.destroy()
            resolve(result)
          }
        }
      }else {
        getSparkMethod = async (data) => {
          await that.read(data)
          //读取完毕
          if(currentChunk >= totalChunks) {
            resolve(that.readEnd())
          }
        }
      }

      while(currentChunk < totalChunks) {
        let start: number = currentChunk * chunkSize,
          end: number = currentChunk + 1 === totalChunks ? size : ( currentChunk + 1 ) * chunkSize
  
        try {
          const chunks: ArrayBuffer = await arraybufferSlicer.slice(start, end)
          currentChunk ++
          await getSparkMethod(chunks)

          await process('reading', {
            name: symbol,
            current: start,
            total: size,
            // end,
            status: ECACHE_STATUS.reading,
            // chunk: new Blob([chunks])
          })
        }catch(err) {
          reject(err)
        }
  
      }

    })


  }

  public async base64(task: TWrapperTask, process: TProcessLifeCycle): Promise<string> {
    const { file } = task
    const bufferFile = base64ToArrayBuffer(file.file as string)
    return this.arraybuffer(merge(task, { file: merge(file, { file: bufferFile }) }), process)
  }

  public async files(task: TWrapperTask, process: TProcessLifeCycle): Promise<string> {

    const { file: { chunks, md5 }, symbol, config: { chunkSize } } = task

    let spark: SparkMD5.ArrayBuffer
    let completeChunks:number = 0
    let totalChunks = chunks!.length
    const filesSlicer = new FilesSlicer()
    const total = chunkSize * chunks.length
    const workerExists = this.workerExists()

    let append: (data: ArrayBuffer) => Promise<void> | void

    // blob -> file -> base64

    return new Promise(async (resolve, reject) => {

      let currentChunk = 0

      if(isMd5(md5!)) {
        append = noop
      }else if(!workerExists) {
        append = (data: ArrayBuffer) => {
          if(!spark) spark = new SparkMD5.ArrayBuffer()
          spark.append(data)
          if(currentChunk >= totalChunks) {
            resolve(spark.end())
          }
        }
      }else {
        append = async (data: ArrayBuffer) => {
          await this.read(data)
          if(currentChunk >= totalChunks) {
            resolve(this.readEnd())
          }
        }
      }

      for(let i = 0; i < totalChunks; i ++) {

        currentChunk = i
        const chunk = chunks![i]
  
        try {
          const data = await filesSlicer.slice(chunk)
          let size: number = data.byteLength
          await append(data)
          completeChunks += (Number.isNaN(size) ? 0 : size)
          await process('reading', {
            name: symbol,
            status: ECACHE_STATUS.reading,
            start: completeChunks,
            // end: completeChunks += (Number.isNaN(size) ? 0 : size),
            total, //暂时无法知道总的文件大小
            // chunk: new Blob([data])
          })
        }catch(err) {
          return reject(err)
        }

      }

    })

  }

}