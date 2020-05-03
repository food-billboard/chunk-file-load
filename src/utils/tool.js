const is = (type) => (val) => Object.prototype.toString.call(val) === `[object ${type}]`

export const isNumber = is('Number')

export const isObject = is('Object')

export const isArray = is('Array')

export const isUndef = val => val === null || val === undefined

export const isDef = val => val !== null || val !== undefined

export const isTrue = val => val === true

export const isFalse = val => val === false

export const isFile = is('File')

export const isBlob = is('Blob')

export const isFunc = is('Function')

export const isSymbol = is('Symbol')

//类型判断
export const isType = (detect, type) => {
  const types = ['String', 'Object', 'Number', 'Array', 'Undefined', 'Fucntion', 'Null', 'Symbol', 'File', 'Blob']
  const prototype = Object.prototype.toString.call(detect)
  if(!prototype) return false
  const detectType = prototype.replace(/^\[object\s([A-Za-z]+)\]$/, '$1')
  if(types.indexOf(detectType) < 0) return false
  return detectType === type
}

//判断内容是否为空
export const size = (detect) => {
  if(detect === undefined || detect === null) {
      return 0
  }
  if(isType(detect, 'Number')) {
      return detect
  }
  if(isType(detect, 'String')) {
      return detect.length
  }
  if(isType(detect, 'Object')) {
      return Object.keys(detect).length  
  }
  if(isType(detect, 'Array')) {
      return detect.length
  }
}

//数组扩展
export const flat = (arr) => {
  if(!isArray(arr)) return arr
  if(arr.flat) return arr.flat(Infinity)
  let newArray = []
  arr.forEach((item) => {
      if(isArray(item)) {
          let data = flat(item)
          newArray = [ ...newArray, ...data ]
      }else {
          newArray.push(item)
      }
  })
  return newArray
}

export const isEmpty = (data) => {
    if(isType(data, 'string')) {
        return !!data.length
      }else if(isType(data, 'null') || isType(data, 'undefined')) {
        return true
      }else if(isType(data, 'array')) {
        return !!data.length
      }else if(isType(data, 'object')) {
        return !!Object.keys(data).length
      }
      return false
}

export const getFileType = (filename) => {
  if(!filename.includes('.')) return ''
  const split = filename.split('.')
  return split[split.length - 1]
}