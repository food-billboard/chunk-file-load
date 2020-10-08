import { isFile, isFunc, isBlob, isArrayBuffer, isObject, isBase64, base64Size } from './tool'
import { MAX_FILE_CHUNK } from './constant'
import { TConfig, Ttask, TFileType } from '../upload'

//策略模式
const NESS_Argument: string[] = ['file', 'uploadFn', 'mime']

type TConfigFuncType = (value: any, acc: Ttask<TFileType>) => boolean

interface ILoadConfig {
  args: Array<string>
  init: () => void
  findIndexAndDelete: (name: string) => void
  restArguments: () => boolean
  file: TConfigFuncType
  mime: TConfigFuncType
  exitDataFn: TConfigFuncType
  uploadFn: TConfigFuncType
  completeFn: TConfigFuncType
  callback: TConfigFuncType
  config: TConfigFuncType
  chunks: TConfigFuncType
}

interface IValidator {
  cache: Function[]
  loadConfig: ILoadConfig
  init: () => void
  add: (value: any, method: Exclude<keyof ILoadConfig, 'init' | 'args' | 'findIndexAndDelete' | 'restArguments'>, acc: Ttask<TFileType>) => void
  validate: () => boolean
}

class LoadConfig implements ILoadConfig {

  args: string[] = []

  init() {
    this.args = [ ...NESS_Argument ]
  }

  findIndexAndDelete(name: string) {
    const index = this.args.indexOf(name)
    if(!!~index) {
      this.args.splice(index, 1)
    }
  }

  restArguments() { return !this.args.length }

  file(value: TFileType, acc: Ttask<TFileType>) {
    this.findIndexAndDelete('file')
    const { _cp_ } = acc
    return !!_cp_ ? this.chunks(acc.chunks, acc) : (isFile(value) || isArrayBuffer(value) || isBlob(value) || (typeof value === 'string' && isBase64(value) && base64Size(value) <= MAX_FILE_CHUNK))
  }

  mime(value:any, acc: Ttask<TFileType>) { 
    return value !== undefined ? typeof value === 'string' && /[a-zA-Z]{1,20}\/[a-zA-Z]{1-20}/.test(value) : ( acc ? ( isFile(acc.file) || isBase64([acc.file]) )  : false ) 
  }

  exitDataFn = function(value: any) {
    return value !== undefined ? isFunc(value) : true
  }

  uploadFn(value: any) { 
    this.findIndexAndDelete('uploadFn')
    return isFunc(value) && value.length == 1
  }

  completeFn(value: any) {
    return value !== undefined ? isFunc(value) : true
  }
  callback(value: any) { return value === undefined ? isFunc(value) : true }
  config(value: TConfig) { 
    const { chunkSize, retry } = value
    return (value !== undefined ? isObject(value) : true) && (!!chunkSize ? chunkSize <= MAX_FILE_CHUNK && chunkSize > 0 : true) && (!!retry ? retry.times > 0 : true)
  }
  chunks(value: any, acc: Ttask<TFileType>) {
    const { _cp_, config: { chunkSize=MAX_FILE_CHUNK }={} } = acc
    return !!_cp_ ? Array.isArray(value) && !!value.length && value.every(v => ((v instanceof File || v instanceof Blob) && v.size < chunkSize) || ( v instanceof ArrayBuffer && v.byteLength < chunkSize) || ( typeof v === 'string' && isBase64(v) && base64Size(v) < chunkSize )) : true
  }

}

class Validator implements IValidator {

  cache:Function[] = []

  loadConfig: ILoadConfig = new LoadConfig()

  init() { 
    this.cache = [] 
    this.loadConfig = new LoadConfig()
  }

  add(acc: Ttask<TFileType>) {
    [...Object.keys(acc), ...NESS_Argument].forEach((t: any) => {
      this.internalAdd(acc[t], t, acc)
    })
  }

  private internalAdd(value: any, method: Exclude<keyof ILoadConfig, 'init' | 'args' | 'findIndexAndDelete' | 'restArguments'>, acc: Ttask<TFileType>) {
    this.cache.push(() => {
      return typeof this.loadConfig[method] === 'function' ? this.loadConfig[method](value, acc) : true
    })
  }

  validate() {
    let cache:Function[] = [...this.cache]
    this.cache = []
    const result = cache.every(type => typeof type === 'function' ? type() : false) && this.loadConfig.restArguments()
    this.loadConfig.init()
    return result
  }

}

export default Validator