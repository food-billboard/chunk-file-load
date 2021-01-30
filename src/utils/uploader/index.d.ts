
type TProcess = 'upload' | 'complete' | 'check'
export type TResponse = { error: null | string, done: boolean, value: { process: TProcess, next: TProcess, [key: string]: any } }
export type TRequest = Omit<TResponse, 'value'>

export type TRequestCommunication = (response: TResponse) => Promise<TRequest>