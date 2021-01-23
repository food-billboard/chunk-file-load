import SparkMD5 from 'spark-md5'
import { noop } from 'lodash'
import { base64ToArrayBuffer, base64Size, isMd5 } from '../tool'
import WorkerPool, { TProcess } from '../worker/worker.pool'
import { Ttask, TWraperFile, TProcessLifeCycle } from '../../upload/index.d'

export default class {

  constructor(worker_id: string) {
    const worker = WorkerPool.getProcess(worker_id)
    this.worker = worker
  }

  worker: TProcess | null

  public async blob(file: Ttask<TWraperFile>, process: TProcessLifeCycle): Promise<string> {

    const { file: originFile, chunkSize, size, symbol } = file
    const that = this

    let currentChunk:number = 0,
      fileReader:FileReader = new FileReader(),
      totalChunks: number = Math.ceil(size / chunkSize),
      spark!:SparkMD5.ArrayBuffer,
      fileSlice: (start: number, end: number) => Blob = File.prototype.slice
    
      console.log(Date.now())

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
              await worker.postFileData(buffer)
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
              console.log(Date.now())
              resolve(worker.getFileResult())
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
        const chunks: Blob = fileSlice.call(originFile, start, end)

        try {
          await process({
            name: symbol,
            start,
            end,
            chunk: chunks
          }, reject)
        }catch(err) {
          reject(err)
        }

        fileReader.readAsArrayBuffer(chunks)
      }

      await loadNext()

    })

  }

  public async arraybuffer(file: Ttask<TWraperFile>, process: TProcessLifeCycle): Promise<string> {

    const that = this

    const { file: originFile, chunkSize, size, symbol } = file

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
          await worker.postFileData(data)
          //读取完毕
          if(currentChunk >= totalChunks) {
            resolve(worker.getFileResult())
          }
        }
      }

      while(currentChunk < totalChunks) {
        let start: number = currentChunk * chunkSize,
          end: number = currentChunk + 1 === totalChunks ? size : ( currentChunk + 1 ) * chunkSize
        const chunks: ArrayBuffer = bufferSlice.call(originFile, start, end)
  
        currentChunk ++
  
        try {
          await getSparkMethod(chunks)
          await process({
            name: symbol,
            start,
            end,
            chunk: new Blob([chunks])
          }, reject)
        }catch(err) {
          reject(err)
        }
  
      }

    })


  }

  public async base64(file: Ttask<TWraperFile>, process: TProcessLifeCycle): Promise<string> {

    const { file: originFile } = file
    const bufferFile = base64ToArrayBuffer(originFile as string)
    return this.arraybuffer({
      ...file,
      file: bufferFile
    }, process)

  }

  public async files(file: Ttask<TWraperFile>, process: TProcessLifeCycle): Promise<string> {

    const { chunks, md5, symbol } = file

    let fileReader:FileReader
    let spark: SparkMD5.ArrayBuffer
    let completeChunks:number = 0
    let totalChunks = chunks.length

    let append: (data: ArrayBuffer) => Promise<void> | void

    // blob -> file -> base64

    return new Promise(async (resolve, reject) => {

      let currentChunk = 0

      if(isMd5(md5)) {
        append = noop
      }else if(!worker) {
        append = (data: ArrayBuffer) => {
          if(!spark) spark = new SparkMD5.ArrayBuffer()
          spark.append(data)
          if(currentChunk >= totalChunks) {
            resolve(spark.end())
          }
        }
      }else {
        append = async (data: ArrayBuffer) => {
          await worker.postFileData(data)
          if(currentChunk >= totalChunks) {
            resolve(worker.getFileResult())
          }
        }
      }

      for(let i = 0; i < totalChunks; i ++) {

        currentChunk = i
        const chunk = chunks[i]
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
          const chunks = new Blob([data])
          await append(data)
          await process({
            name: symbol,
            start: completeChunks, 
            end: completeChunks += (Number.isNaN(size) ? 0 : size),
            chunk: chunks
          }, reject)
        }catch(err) {
          return reject(err)
        }

      }

      

    })

  }

}
