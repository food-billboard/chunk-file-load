import Upload from '../../upload'
import Reader from '../reader'
import WorkerPool from '../worker/worker.pool'
import { ECACHE_STATUS } from '../constant'
import { TWrapperTask, TExitDataFnReturnValue, TUploadFormData } from '../../upload/type'
import { TProcess } from '../worker/worker.pool'
import { FilesSlicer } from '../slicer'

export default class Uploader extends Reader {

  constructor(context: Upload) {
    super(context)
  }

  public async addFile(worker_id: string): Promise<string> {
    if(!this.tasks.includes(worker_id)) {
      this.tasks.push(worker_id)
    }
    return this.start(worker_id)
  }

  public async start(worker_id: string): Promise<any> {

    const process = WorkerPool.getProcess(worker_id)

    if(!process) {
      this.clean(worker_id)
      return Promise.reject('process not found')
    }
    const [ , task ] = this.getState(process.task!)

    await this.exitDataFn(task!)
    .then(res => this.uploadFn(res, process))

  }

  private getUnCompleteIndexes(task: TWrapperTask, response: TExitDataFnReturnValue, mis: boolean): number[] {
    const { data } = response || { data: undefined }
    const { file: { size }, config: { chunkSize }, symbol } = task
    const chunksLength = Math.ceil(size / chunkSize)
    let unComplete = []

    const parseNumber = (target: string | number):number => {
      return typeof target === 'string' ? parseInt(target) : Number(target?.toFixed(0))
    }

    if(Array.isArray(data)) {
      unComplete = data
      .filter(ind => {
        const index = parseNumber(ind)
        return !Number.isNaN(index) && chunksLength > index
      })
    }else {
      let nextIndex = parseNumber(data)
      if(Number.isNaN(nextIndex) || nextIndex > size) {
        if(!mis) {
          throw new Error("upload function response data is not valid")
        }else {
          console.warn("exit function response data is not valid")
        }
        nextIndex = 0 
      }
      let offset = nextIndex / chunkSize
      if(nextIndex == size) {
        unComplete = [] as any
      }else if(Math.round(offset) == offset) {
        unComplete = new Array(chunksLength - offset).fill(0).map((_, ind) => ind + offset)
      }else {
        unComplete = new Array(chunksLength).fill(0).map((_, index) => index)
      }

    }

    this.setState(symbol, {
      file: {
        unComplete
      },
      process: {
        complete: chunksLength - (unComplete?.length || chunksLength),
        current: 0
      }
    })

    return unComplete

  }

  //文件存在验证
  private async exitDataFn(task: TWrapperTask) {
    const { symbol, config: { chunkSize }, file: { size, mime, name, md5 }, request: { exitDataFn }, tool } = task
    const INIT_RESPONSE = {
      data: 0 
    }
    if(!tool!.file.isExitFnEmit()) return INIT_RESPONSE

    await this.dealLifecycle('beforeCheck', {
      name: symbol,
      status: ECACHE_STATUS.uploading
    })

    if(typeof exitDataFn !== 'function') return INIT_RESPONSE

    const params = {
      filename: name ?? '',
      md5: md5!,
      suffix: mime || '',
      size,
      chunkSize,
      chunksLength: Math.ceil(size / chunkSize)
    }
    return exitDataFn(params, symbol)
  }

  //文件上传
  private async uploadFn(res: TExitDataFnReturnValue, process: TProcess) {
    /**
     * 列表展示为未上传的部分
     * data: {
     *  list: [每一分片的索引]
     * } | nextIndex 下一分片索引
     */
    const [, task] = this.getState(process?.task!)
    const unComplete = this.getUnCompleteIndexes(task!, res, true)
    const isExists = !unComplete.length
    const { symbol } = task!

    await this.dealLifecycle('afterCheck', {
      name: symbol,
      status: ECACHE_STATUS.uploading,
      isExists,
    })

    const lifecycleParams = {
      name: symbol,
      status: ECACHE_STATUS.uploading,
      isExists
    }

    if(!isExists) {
      return this.upload(process)
      .then(() => this.dealLifecycle('beforeComplete', lifecycleParams))
      .then(() => {
        return this.completeFn({ task: task!, response: res })
      })
    }
    else {
      const { data, ...nextRes } = res || {}
      return this.dealLifecycle('beforeComplete', lifecycleParams)
      .then(_ => nextRes) 
    }
  }

  //分片上传
  private async upload(process: TProcess): Promise<any> {

    const { task: taskName, worker } = process
    const [, task] = this.getState(taskName!)

    const { symbol, file: { md5, unComplete, size, file, _cp_, chunks }, request: { uploadFn }, config: { chunkSize } } = task!
    let newUnUploadChunks = [...unComplete]
    const total = Math.ceil(size / chunkSize)

    //get chunk method
    let getChunkMethod: (index: number) => Promise<Blob>
    const workerExists = await worker?.cacheExists(total)
    
    if(workerExists) {
      getChunkMethod = async (index) => {
        return worker.getChunk(index)
      }
    }else {
      const slicer = new FilesSlicer(this.context, task!)
      if(_cp_) {
        getChunkMethod = async (index) => {
          const buffer = await slicer.slice(chunks[index])
          return typeof Blob === 'undefined' ? buffer : new Blob([buffer])
        }
      }else {
        getChunkMethod = async (index) => {
          const start = index * chunkSize
          let end = start + chunkSize
          end = end >= size ? size : end
          const buffer = await slicer.slice(file, start, end)
          return typeof Blob === 'undefined' ? buffer : new Blob([buffer])
        }
      }
    }

    for(let i = 0; i < total; i ++) {

      let currentIndex = newUnUploadChunks.indexOf(i)

      if(!!~currentIndex) {
        newUnUploadChunks.splice(currentIndex, 1)
        const chunk = await getChunkMethod(i)
        const params: TUploadFormData = {
          file: chunk,
          md5: md5!,
          index: i,
        }

        let formData: FormData | TUploadFormData
        if(typeof FormData !== 'undefined') {
          formData = new FormData()
          Object.keys(params).forEach((key: string) => {
            (formData as FormData).append(key, params[key])
          })
        }else {
          formData = params
        }

        const response = await uploadFn(formData, symbol)

        await this.dealLifecycle('uploading', {
          name: symbol,
          status: ECACHE_STATUS.uploading,
          current: i + 1,
          total,
          complete: total - newUnUploadChunks.length,
        })

        if(!!response) {
          newUnUploadChunks = this.getUnCompleteIndexes(task!, response, false)
        }
        this.setState(symbol, {
          file: {
            unComplete: newUnUploadChunks
          }
        })

      }
    }

    return Promise.resolve()

  }

  //文件上传完成
  private async completeFn({ task, response }: { task: TWrapperTask, response: TExitDataFnReturnValue }) {
    const { file: { md5 }, symbol, request: { completeFn } } = task
    return Promise.resolve(typeof completeFn === 'function' ? completeFn({ name: symbol, md5: md5! }) : response)
    .then(_ => this.dealLifecycle('afterComplete', {
      success: true,
      name: symbol,
      status: ECACHE_STATUS.fulfilled,
    }))
  }

} 