import { isFile, isFunc } from './tool'
//策略模式
const NESS_Argument = ['file', 'uploadFn']
class LoadConfig {

  args

  constructor() {
    this.init()
  }

  init() {
    this.args = [ ...NESS_Argument ]
  }

  findIndexAndDelete(name) {
    const index = this.args.indexOf(name)
    if(~index) {
      this.args.splice(index, 1)
    }
  }

  restArguments() {
    return !this.args.length
  }

  file(value) {
    this.findIndexAndDelete('file')
    return isFile(value)
  }

  exitDataFn(value) {
    return isFunc(value) && value.length == 1
  }

  uploadFn(value) {
    this.findIndexAndDelete('uploadFn')
    return isFunc(value) && value.length == 1
  }

  completeFn(value) {
    return isFunc(value)
  }

  callback(value) {
    return isFunc(value)
  }
}

const loadConfig = new LoadConfig()

export default class Validator {

  cache = []

  add(value, method) {
    this.cache.push(function() {
      return loadConfig[method] && loadConfig[method](value)
    })
  }

  validate() {
    let cache = [...this.cache]
    this.cache = []
    const result = cache.every(type => type()) && loadConfig.restArguments()
    loadConfig.init()
    return result
  }
}