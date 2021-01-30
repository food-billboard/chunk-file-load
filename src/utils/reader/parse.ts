import SparkMD5 from 'spark-md5'
import { transfer } from 'comlink'
import { noop, merge } from 'lodash'
import { base64ToArrayBuffer, base64Size, isMd5 } from '../tool'
import WorkerPool, { TProcess } from '../worker/worker.pool'
import { TWrapperTask, TProcessLifeCycle } from '../../upload/index.d'
import { ECACHE_STATUS } from '../constant'

export default class {

  constructor(worker_id: string) {
    const worker = WorkerPool.getProcess(worker_id)
    this.worker = worker
  }

  worker: TProcess | null

  public async blob(task: TWrapperTask, process: TProcessLifeCycle): Promise<string> {

    const { file: { size, file }, config: { chunkSize }, symbol } = task
    const that = this

    let currentChunk:number = 0,
      fileReader:FileReader = new FileReader(),
      totalChunks: number = Math.ceil(size / chunkSize),
      spark!:SparkMD5.ArrayBuffer,
      fileSlice: (start: number, end: number) => Blob = File.prototype.slice

    return new Promise(async (resolve, reject) => {

      function getSparkMethod() {

        if(!that.worker) {
          if(!spark) spark = new SparkMD5.ArrayBuffer()
  
          return async function(e: any) {
  
            if(!e.target) return reject('读取错误')
            //添加读取的内容
            spark.append(e.target.result)
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
  
        return async function(e: any) {
  
          if(!e.target) return reject('读取错误')
            //添加读取的内容
            const buffer = e.target.result
            try {
              await that.worker!.worker.read(transfer(buffer, [buffer]))
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
              resolve(that.worker!.worker.readEnd())
            }

        }
    
      }

      fileReader.onload = getSparkMethod()

      //错误处理
      fileReader.onerror = reject

      //文件内容读取
      async function loadNext() {
        let start: number = currentChunk * chunkSize,
          end: number = currentChunk + 1 === totalChunks ? size : (currentChunk + 1) * chunkSize
        const chunks: Blob = fileSlice.call(file, start, end)

        try {
          await process('reading', {
            name: symbol,
            status: ECACHE_STATUS.reading,
            current: start,
            // end,
            total: size
            // chunk: chunks
          })
        }catch(err) {
          reject(err)
        }

        fileReader.readAsArrayBuffer(chunks)
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
      bufferSlice: (start: number, end: number) => ArrayBuffer = ArrayBuffer.prototype.slice,
      getSparkMethod: (data: ArrayBuffer) => Promise<void>

    return new Promise(async (resolve, reject) => {

      if(!that.worker) {
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
          await that.worker!.worker.read(transfer(data, [data]))
          //读取完毕
          if(currentChunk >= totalChunks) {
            resolve(that.worker!.worker.readEnd())
          }
        }
      }

      while(currentChunk < totalChunks) {
        let start: number = currentChunk * chunkSize,
          end: number = currentChunk + 1 === totalChunks ? size : ( currentChunk + 1 ) * chunkSize
        const chunks: ArrayBuffer = bufferSlice.call(file, start, end)
  
        currentChunk ++
  
        try {
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

    const { file: { chunks, md5 }, symbol } = task

    let fileReader:FileReader
    let spark: SparkMD5.ArrayBuffer
    let completeChunks:number = 0
    let totalChunks = chunks!.length

    let append: (data: ArrayBuffer) => Promise<void> | void

    // blob -> file -> base64

    return new Promise(async (resolve, reject) => {

      let currentChunk = 0

      if(isMd5(md5!)) {
        append = noop
      }else if(!this.worker) {
        append = (data: ArrayBuffer) => {
          if(!spark) spark = new SparkMD5.ArrayBuffer()
          spark.append(data)
          if(currentChunk >= totalChunks) {
            resolve(spark.end())
          }
        }
      }else {
        append = async (data: ArrayBuffer) => {
          await this.worker!.worker.read(transfer(data, [data]))
          if(currentChunk >= totalChunks) {
            resolve(this.worker!.worker.readEnd())
          }
        }
      }

      for(let i = 0; i < totalChunks; i ++) {

        currentChunk = i
        const chunk = chunks![i]
        let size!: number
        let data: any = false
        if(typeof chunk === 'string') {
          try {
            size = base64Size(chunk)
            data = base64ToArrayBuffer(chunk)
          }catch(err) {
            return reject(err)
          }
        }else if(chunk instanceof ArrayBuffer) {
          try {
            size = chunk.byteLength
            data = chunk
          }catch(err) {
            return reject(err)
          }
        }else {
          if(!fileReader) fileReader = new FileReader()
          try {
            if(chunk instanceof File || chunk instanceof Blob) {
              size = chunk.size
              fileReader.readAsArrayBuffer(chunk)
              await new Promise((resolve, _) => {
                fileReader.onload = function(e: any) {
                  data = e.target.result
                  resolve(null)
                }
              })
            }
          }catch(err) {
            return reject(err)
          }
        }
  
        try {
          await append(data)
          await process('reading', {
            name: symbol,
            status: ECACHE_STATUS.reading,
            start: completeChunks,
            // end: completeChunks += (Number.isNaN(size) ? 0 : size),
            total: size,
            // chunk: new Blob([data])
          })
        }catch(err) {
          return reject(err)
        }

      }

      

    })

  }

}