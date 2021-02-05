import Reader from '../reader'
import WorkerPool from '../worker/worker.pool'
import { ECACHE_STATUS } from '../constant'
import { TProcessLifeCycle, TWrapperTask, TSetState, TGetState, TExitDataFnReturnValue, TUploadFormData } from '../../upload/index.d'
import { TProcess } from '../worker/worker.pool'
import { FilesSlicer } from '../slicer'

export default class Uploader extends Reader {

  constructor(emitter: {
    setState: TSetState
    getState: TGetState
  }, process: TProcessLifeCycle) {
    super(emitter, process)
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
    const [ , task ] = this.emitter.getState(process.task!)

    await this.exitDataFn(task!)
    .then(res => this.uploadFn(res, process))

  }

  private getUnCompleteIndexs(task: TWrapperTask, response: TExitDataFnReturnValue): number[] {
    const { data } = response
    const { file: { size }, config: { chunkSize }, symbol } = task
    const chunksLength = Math.ceil(size / chunkSize)
    let unComplete = []

    const parseNumber = (target: string | number):number => {
      return typeof target === 'string' ? parseInt(target) : Number(target.toFixed(0))
    }

    if(Array.isArray(data)) {
      unComplete = data
      .filter(ind => {
        const index = parseNumber(ind)
        return !Number.isNaN(index) && chunksLength > index
      })
    }else {
      let nextIndex = parseNumber(data)
      nextIndex = Number.isNaN(nextIndex) || nextIndex > size ? 0 : nextIndex
      let offset = nextIndex / chunkSize
      if(Math.round(offset) == offset) {
        unComplete = new Array(chunksLength - offset).fill(0).map((_, ind) => ind + offset)
      }else {
        unComplete = new Array(chunksLength).fill(0).map((_, index) => index)
      }

    }

    this.emitter.setState(symbol, {
      file: {
        unComplete
      }
    })

    return unComplete

  }

  //文件存在验证
  private async exitDataFn(task: TWrapperTask) {
    const { symbol, config: { chunkSize }, file: { size, mime, name, md5 }, request: { exitDataFn } } = task

    await this.lifecycle('beforeCheck', {
      name: symbol,
      status: ECACHE_STATUS.uploading
    })

    if(typeof exitDataFn !== 'function') return { data: [] }

    const params = {
      filename: name ?? '',
      md5: md5!,
      suffix: mime || '',
      size,
      chunkSize,
      chunksLength: Math.ceil(size / chunkSize)
    }
    return exitDataFn(params)
  }

  //文件上传
  private async uploadFn(res: TExitDataFnReturnValue, process: TProcess) {
    /**
     * 列表展示为未上传的部分
     * data: {
     *  list: [每一分片的索引]
     * } | nextIndex 下一分片索引
     */
    const { data, ...nextRes } = res || {}
    const [, task] = this.emitter.getState(process?.task!)
    const unComplete = this.getUnCompleteIndexs(task!, res)
    const isExists = !unComplete.length
    const { symbol } = task!

    await this.lifecycle('afterCheck', {
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
      .then(() => this.lifecycle('beforeComplete', lifecycleParams))
      .then(() => {
        return this.completeFn({ task: task!, response: res })
      })
    }
    else {
      return this.lifecycle('beforeComplete', lifecycleParams)
      .then(_ => nextRes) 
    }
  }

  //分片上传
  private async upload(process: TProcess): Promise<any> {

    const { task: taskName, worker } = process
    const [, task] = this.emitter.getState(taskName!)

    const { symbol, file: { md5, unComplete, size, file }, request: { uploadFn }, config: { chunkSize } } = task!
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
      const slicer = new FilesSlicer()
      getChunkMethod = async (index) => {
        const start = index * chunkSize
        let end = start + chunkSize
        end = end >= size ? size : end
        const buffer = await slicer.slice(file, start, end)
        return new Blob([buffer])
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

        await this.lifecycle('uploading', {
          name: symbol,
          status: ECACHE_STATUS.uploading,
          current: i,
          total,
          complete: total - newUnUploadChunks.length,
        })

        const response = await uploadFn(formData)
        if(!!response) {
          newUnUploadChunks = this.getUnCompleteIndexs(task!, response)
        }
        this.emitter.setState(symbol, {
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
    return typeof completeFn === 'function' ? completeFn({ name: symbol, md5: md5! }) : Promise.resolve(response)
    .then(_ => this.lifecycle('afterComplete', {
      success: true,
      name: symbol,
      status: ECACHE_STATUS.fulfilled,
    }))
  }

} 