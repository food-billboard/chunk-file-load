import { ECACHE_STATUS } from '../utils/constant'

export type TFailEmitReturnType = {
    reason: any
    data: TEvents
  }
  
  export type TRejectEmitReturnType = {
    reason: any
    data: TEvents | null
  }
  
  export type TSuccessReturnType = {
    value: { name: string, err: null }
    data: TEvents
  }
  
  export type TEmitReturnType = {
    rejected: TRejectEmitReturnType[]
    fulfilled: TSuccessReturnType[]
    stopping: TFailEmitReturnType[]
    cancel: TFailEmitReturnType[]
  }
  
  export type TFiles<T=(TFileType | null)> = Pick<TEvents<T>, 'mime' | 'file' | 'name' | 'symbol' | '_cp_' | 'lifecycle'> & {
    name: string | null
    size: number
    chunks: TFileType[]
    unCompleteChunks: number[]
    completeChunks: number[] //兼容
    watch: () => null | { progress: number, name: Symbol }
    md5: string
    chunkSize: number
    status: ECACHE_STATUS
    retry: {
      times: number 
    } | false
  } & {
    request: Pick<TEvents<T>, 'exitDataFn' | 'uploadFn' | 'completeFn'>
  }
  
  export type TFileType = ArrayBuffer | string | Blob | File
  
  export type TEvents<T=TWraperFile> = Ttask<T> & {
    symbol: Symbol
  }
  
  export type TUploadFormData = {
    file: TFileType
    md5: string
    index: number
    [key: string]: any
  }
  
  export type TUploadFn = (data: FormData | TUploadFormData) => ReturnType<TExitDataFn> | void
  
  export type TLifecycle = {
    //序列化前
    beforeRead?: (params: { name: Symbol, task: TFiles }) => any
    //序列化中
    reading?: (params: { name: Symbol, task: TFiles, start?: number, end?: number }) => boolean | Promise<boolean>
    //MD5序列化后，检查请求前
    beforeCheck?: (params: { name: Symbol, task: TFiles | null }) => boolean | Promise<boolean>
    //检查请求响应后
    afterCheck?: (params: { name: Symbol, task: TFiles | null, isExists?: boolean }) => any
    //分片上传前(可以在这里执行stop或cancel，任务会立即停止, 或者直接return false表示暂停)
    beforeUpload?: (params: { name: Symbol, task: TFiles | null }) => boolean | Promise<boolean>
    //分片上传后(多次执行)
    afterUpload?: (params: { name: Symbol,  task: TFiles | null, index?: number, success?: boolean }) => any
    //触发暂停响应后
    afterStop?: (params: { name: Symbol, task: TFiles | null, index?: number }) => any
    //触发取消响应后
    afterCancel?: (params: { name: Symbol, task: TFiles | null, index?: number }) => any
    //完成请求前
    beforeComplete?: (params: { name: Symbol, task: TFiles | null, isExists?: boolean }) => any
    //完成请求后
    afterComplete?: (params: { name: Symbol, task: TFiles | null, success?: boolean }) => any
    //触发重试任务执行
    retry?: (params: { name: Symbol, task: TFiles | null }) => any
  }
  
  export type TConfig = {
    retry?: {
        times: number
    }
    chunkSize?: number
  }

  export type TExitDataFnReturnValue = {
    data: Array<number> | string | number
    [key: string]: any
  }

  export type TExitDataFn = ({ 
    filename,
    md5,
    suffix,
    size,
    chunkSize,
    chunksLength
  }: {
    filename: string
    md5: string
    suffix: string
    size: number
    chunkSize: number
    chunksLength: number
  }) => Promise<TExitDataFnReturnValue>
  
  export type Ttask<T> = {
    config: TConfig
    lifecycle: TLifecycle,
    md5?: string | null
    mime?: string
    file: T
    chunks?: TFileType[]
    _cp_?: boolean
    exitDataFn?: TExitDataFn
    uploadFn: TUploadFn
    completeFn?: ({ name, md5 } : { name: Symbol, md5: string }) => any
    callback?: (err: any, data: any) => any
    [key: string]: any
  }
  
  export type TWraperFile = {
    size: number
    name: string | null
    file: TFileType | null
    // action: (name: Symbol) => Promise<string> 
    action: string
  }

  export type TMessagetYPE = {
    
  }

  export type TWorkerResponse = {
    data: any
    error: any

    [key: string]: any
  }

  export type TFileParseProcess = ({ name, start, end, chunk }: { name: Symbol, start: number, end: number, chunk: Blob }, stop: () =>  void) => Promise<void>

  export type TProcessLifeCycle = (
    lifecycle: keyof TLifecycle, 
    data: { 
      name: Symbol, 
      status?: ECACHE_STATUS
      [key: string]: any 
    },
  ) => Promise<any>

  export type TSetState = (name: Symbol, value: Partial<Ttask<TWraperFile>>) => Ttask<TWraperFile>