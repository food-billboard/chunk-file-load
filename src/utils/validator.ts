import { isFile, isFunc, isBlob, isArrayBuffer, isObject, isBase64 } from './tool'
//策略模式
const NESS_Argument: string[] = ['file', 'uploadFn']

type TFileType = File| string | ArrayBuffer | Blob

interface IFileRecord {
  _cp_?: boolean
  file: TFileType
}

interface ILoadConfig {
  args: Array<string>
  init: () => void
  findIndexAndDelete: (name: string) => void
  restArguments: () => boolean
  file: (value: any, acc: IFileRecord) => boolean
  mime: (value: any, acc: IFileRecord) => boolean
  exitDataFn: (value: any, acc: IFileRecord) => boolean
  uploadFn: (value: any, acc: IFileRecord) => boolean
  completeFn: (value: any, acc: IFileRecord) => boolean
  callback: (value: any, acc: IFileRecord) => boolean
  config: (value: any, acc: IFileRecord) => boolean
  chunks: (value: any, acc: IFileRecord) => boolean
}

interface IValidator {
  cache: Function[]
  loadConfig: ILoadConfig
  init: () => void
  add: (value: any, method: Exclude<keyof ILoadConfig, 'init' | 'args' | 'findIndexAndDelete' | 'restArguments'>, acc: IFileRecord) => void
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

  file(value: TFileType, acc: IFileRecord) {
    this.findIndexAndDelete('file')
    const { _cp_ } = acc
    return !!_cp_ ? true : isFile(value) || isArrayBuffer(value) || isBlob(value) || isBase64(value)
  }

  mime(value:any, acc: IFileRecord) { 
    return value ? typeof value === 'string' && /[a-zA-Z]{1,20}\/[a-zA-Z]{1-20}/.test(value) : ( acc ? ( isFile(acc.file) || isBase64([acc.file]) )  : false ) 
  }

  exitDataFn = function(value: any) { return value ? isFunc(value) : true }

  uploadFn(value: any) { 
    this.findIndexAndDelete('uploadFn')
    return isFunc(value) && value.length == 1
  }

  completeFn(value: any) { return value ? isFunc(value) : true }
  callback(value: any) { return value ? isFunc(value) : true }
  config(value: any) { return value ? isObject(value) : true }
  chunks(value: any, acc: IFileRecord) {
    const { _cp_ } = acc
    return !!_cp_ ? Array.isArray(value) && !!value.length && value.every(v => isFile(v) || isArrayBuffer(v) || isBlob(v) || isBase64(v)) : true
  }

}

class Validator implements IValidator {

  cache:Function[] = []

  loadConfig: ILoadConfig = new LoadConfig()

  init() { 
    this.cache = [] 
    this.loadConfig = new LoadConfig()
  }

  add(value: any, method: Exclude<keyof ILoadConfig, 'init' | 'args' | 'findIndexAndDelete' | 'restArguments'>, acc: IFileRecord) {
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