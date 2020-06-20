import { isFile, isFunc } from './tool'
//策略模式
const NESS_Argument = ['file', 'uploadFn']

function LoadConfig() { this.init() }
LoadConfig.prototype.args = []
LoadConfig.prototype.init = function() { this.args = [ ...NESS_Argument ] }
LoadConfig.prototype.findIndexAndDelete = function(name) {
  const index = this.args.indexOf(name)
  if(~index) {
    this.args.splice(index, 1)
  }
}
LoadConfig.prototype.restArguments = function() { return !this.args.length }
LoadConfig.prototype.file = function(value) {
  this.findIndexAndDelete('file')
  return isFile(value)
}
LoadConfig.prototype.exitDataFn = function(value) { return isFunc(value) && value.length == 1 }
LoadConfig.prototype.uploadFn = function(value) { 
  this.findIndexAndDelete('uploadFn')
  return isFunc(value) && value.length == 1
}
LoadConfig.prototype.completeFn = function(value) { return isFunc(value) }
LoadConfig.prototype.callback = function(value) { return isFunc(value) }

function Validator() { this.init() }
Validator.prototype.cache = []
Validator.prototype.init = function() { 
  this.cache = [] 
  this.loadConfig = new LoadConfig()
}
Validator.prototype.add = function(value, method) {
  this.cache.push(() => {
    return this.loadConfig[method] && this.loadConfig[method](value)
  })
}
Validator.prototype.validate = function() {
  let cache = [...this.cache]
  this.cache = []
  const result = cache.every(type => type()) && this.loadConfig.restArguments()
  this.loadConfig.init()
  return result
}

export default Validator