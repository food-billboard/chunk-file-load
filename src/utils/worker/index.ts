import Worker from './file.worker'

export class FileWorker {

  private worker!: any

  private id: string 

  constructor(id: string) {
    this.id = id
    this.worker = new Worker()
  }

  public close() {
    this.worker.postMessage({
      type: 'close'
    })
    setTimeout(() => {
      this.worker.terminate()
    }, 0)
    THREAD_QUEUE = THREAD_QUEUE.filter(thread => thread.id != this.id)
  }

  public async postFileData(data: ArrayBuffer): Promise<any> {

    this.worker.postMessage({
      data,
      type: 'update'
    }, [data])
    return new Promise((resolve, reject) => {
      this.worker.onmessage = this.resolveResponse(resolve, reject)
      this.worker.onerror = reject
    })

  }

  resolveResponse(resolve: any, reject: any) {
    return function(event: any) {
      const { data: { done, error } } = event
      if(error) return reject(error)
      resolve(done)
    }
  }

  public async getFileResult(): Promise<string> {

    this.worker.postMessage({
      type: 'result'
    })
    return new Promise((resolve, reject) => {
      this.worker.onmessage = this.resolveResponse(resolve, reject)
      this.worker.onerror = reject
    })

  }

}

let THREAD_QUEUE: { id: string, worker: FileWorker }[] = []

function create() {
  return (Date.now() + Math.random()).toString()
}

export default function() {
  if(typeof Worker === 'undefined') {
    console.warn(`this environment is not support about the api of "Worker"`)
    return null
  }
  if(THREAD_QUEUE.length > 10) {
    console.warn('the number of child thread is limited')
    return null
  }
  const id = create()
  const worker: FileWorker = new FileWorker(id)
  THREAD_QUEUE.push({
    id,
    worker
  })

  return worker

}