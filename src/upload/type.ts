import { ECACHE_STATUS, EActionType } from '../utils/constant'
import Upload from './index'
import { FileTool } from '../utils/file'

  export type TFailEmitReturnType = {
    reason: any
    data: TWrapperTask
  }
  
  export type TRejectEmitReturnType = {
    reason: any
    data: TWrapperTask | null
  }
  
  export type TSuccessReturnType = {
    value: { name: string, err: null }
    data: TWrapperTask
  }
  
  export type TEmitReturnType = {
    rejected: TRejectEmitReturnType[]
    fulfilled: TSuccessReturnType[]
    stopping: TFailEmitReturnType[]
    cancel: TFailEmitReturnType[]
  }
  
  export type TFileType = ArrayBuffer | string | Blob | File
  
  export type TUploadFormData = {
    file: TFileType
    md5: string
    index: number
    [key: string]: any
  }
  
  export type TUploadFn = (data: FormData | TUploadFormData, name: Symbol) => ReturnType<TExitDataFn>
  
  type TLifeCycleParams = {
    name: Symbol
    task: TWrapperTask
  }

  export type TLifecycle<R=boolean | Promise<boolean>> = {
    //序列化前
    beforeRead?: (params: TLifeCycleParams, response?: any) => R
    //序列化中
    reading?: (params: TLifeCycleParams & { current: number, total: number }, response?: any) => R
    //MD5序列化后，检查请求前
    beforeCheck?: (params: TLifeCycleParams, response?: any) => R
    //检查请求响应后
    afterCheck?: (params: TLifeCycleParams & { isExists: boolean }, response?: any) => R
    //分片上传后(多次执行)
    uploading?: (params: TLifeCycleParams & { current: number, total: number, complete: number }, response?: any) => R
    //触发暂停响应后
    afterStop?: (params: TLifeCycleParams & { current: number }, response?: any) => R
    //触发取消响应后
    afterCancel?: (params: TLifeCycleParams & { current: number }, response?: any) => R
    //完成请求前
    beforeComplete?: (params: TLifeCycleParams & { isExists: boolean }, response?: any) => R
    //完成请求后
    afterComplete?: (params: TLifeCycleParams & { success: boolean }, response?: any) => R
    //触发重试任务执行
    retry?: (params: TLifeCycleParams & { rest: number }, response?: any) => R
  }
  
  export type TConfig = {
    retry?: {
      times: number
    }
    chunkSize?: number
    parseIgnore?: boolean 
  }

  export type TExitDataFnReturnValue = {
    data: Array<number> | string | number
    [key: string]: any
  }

  export type TExitDataFn = (params: {
    filename: string
    md5: string
    suffix: string
    size: number
    chunkSize: number
    chunksLength: number
  }, name: Symbol) => Promise<TExitDataFnReturnValue>

  export type TFile<T=TFileType> = {
    md5?: string
    mime?: string
    file: T
    chunks?: TFileType[]
  }

  export type TWraperFile<T=TFileType> = TFile<T> & {
    mime: string
    chunks: TFileType[]
    _cp_: boolean
    size: number
    name?: string
    action: EActionType
    unComplete: number[]
  }

  export interface TWrapperTask<T=TFileType> extends Omit<Ttask<T>, 'file'> {
    config: Required<TConfig>
    process: {
      current: number
      complete: number
      total: number
    }
    file: TWraperFile<T>
    symbol: symbol
    status: ECACHE_STATUS
    tool: {
      file: FileTool
    }
  }

  export interface TRequestType {
    exitDataFn?: TExitDataFn
    uploadFn: TUploadFn
    completeFn?: (params : { name: Symbol, md5: string }) => any
    callback?: (err: {
      retry?: boolean
      error: any
    } | null, data: any) => any
  }
  
  export interface Ttask<T=TFileType> {
    config?: TConfig
    lifecycle?: TLifecycle
    file: TFile<T>
    request: TRequestType
  }

  export type TFileParseProcess = ({ name, start, end, chunk }: { name: Symbol, start: number, end: number, chunk: Blob }, stop: () =>  void) => Promise<void>

  export type TProcessLifeCycle<T=Promise<void | boolean>> = (
    lifecycle: keyof TLifecycle, 
    data: { 
      name: Symbol, 
      status?: ECACHE_STATUS
      [key: string]: any 
    },
  ) => T

  export type SuperPartial<T> = {
    [P in keyof T]?: T[P] extends object ? SuperPartial<T[P]> : T[P]
  }

  export type TSetState = (name: Symbol, value: SuperPartial<TWrapperTask>) => TWrapperTask
  export type TGetState = (name: Symbol) => [ number, TWrapperTask | null ]

  export type TPluginsReader = (this: Upload, task: TWrapperTask, stepValue?: any) => Promise<string | any>
  export type TPluginsSlicer = (this: Upload, task: TWrapperTask, start: number, end: number, file: TFileType, stepValue?: any) => Promise<ArrayBuffer | any>
  export type TPlugins = {
    reader: TPluginsReader[]
    slicer: TPluginsSlicer[]
  }