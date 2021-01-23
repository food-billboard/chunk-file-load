
declare namespace NFileWorker {

  export type TWorkerMessageType = 'close' | 'post' | 'log4upload' | 'result' | 'log4read'

  type TCloseData = undefined
  type TPostData = ArrayBuffer
  type TLogUploadData = {
    current: number
    precent: number
    total: number
    current_size: number
    total_size: number
  }
  type TLoadReadData = {

  }
  type TResultData = string

  export interface IWorkerMessageResponse<T=TCloseData | TPostData | TLogUploadData | TResultData | TLoadReadData> {
    error: any
    data: T
  }

  export interface IWorkerMessageRequest {
    type: TWorkerMessageType
    data: any
  }

}