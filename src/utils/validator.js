//策略模式
const loadConfig = {
  file(value) {
    return isFile(value)
  },
  exitDataFn(value) {
    return isFunc(value) && value.length == 1
  },
  uploadFn(value) {
    return isFunc(value) && value.length == 1
  },
  callback(value) {
    return isFunc(value)
  }
}

export default class Validator {

  add(value, method) {
    this.cache.push(function() {
      return loadConfig[method] && loadConfig[method](value)
    })
  }

  validate() {
    let cache = [...this.cache]
    this.cache = []
    return cache.every(type => type())
  }
}