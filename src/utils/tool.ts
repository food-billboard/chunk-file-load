const types = ['String', 'Object', 'Number', 'Array', 'Undefined', 'Fucntion', 'Null', 'Symbol', 'File', 'Blob', 'ArrayBuffer']

const is = (type: string) => (val: any) => Object.prototype.toString.call(val) === `[object ${type}]`

export const isNumber = is('Number')

export const isObject = is('Object')

export const isArray = is('Array')

export const isUndef = (val: any) => val === null || val === undefined

export const isDef = (val: any) => val !== null || val !== undefined

export const isTrue = (val: any) => val === true

export const isFalse = (val: any) => val === false

export const isFile = is('File')

export const isBlob = is('Blob')

export const isFunc = is('Function')

export const isSymbol = is('Symbol')

export const isArrayBuffer = is('ArrayBuffer')

export const isMd5 = (str: string) => typeof str === 'string' && /([a-f\d]{32}|[A-F\d]{32})/.test(str)

export const isBase64 = (file: any) => typeof file === 'string' && (/^\s*data:([a-z]+\/[a-z0-9-+.]+(;[a-z-]+=[a-z0-9-]+)?)?(;base64)?,([a-z0-9!$&',()*+;=\-._~:@\/?%\s]*?)\s*$/i.test(file) || /^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{4}|[A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{2}==)$/.test(file))

export const base64Size = (base64: string): number => {
  if(!isBase64(base64)) return 0
  let body:any = base64.split(",")
  body = body.length == 1 ? body[0] : body[1]
  const equalIndex = body.indexOf('=')
  if(body.indexOf('=') > 0) {
    body = body.substring(0, equalIndex)
  }
  const length = body.length
  return parseInt( (length - ( length / 8 ) * 2).toString() )
}

//类型判断
export const isType = (detect: any, type: string): boolean => {
  const prototype = Object.prototype.toString.call(detect)
  if(!prototype) return false
  const detectType = prototype.replace(/^\[object\s([A-Za-z]+)\]$/, '$1')
  if(types.indexOf(detectType) < 0) return false
  return detectType === type
}

//判断内容是否为空
export const size = (detect: any):number => {
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
  return 0
}

//数组扩展
export const flat = (arr: Array<any>): Array<any> => {
  if(!Array.isArray(arr)) return arr
  if(arr.flat) return arr.flat(Infinity)
  let newArray: Array<any> = []
  arr.forEach((item: any) => {
    if(Array.isArray(item)) {
      let data:Array<any> = flat(item)
      newArray = [ ...newArray, ...data ]
    }else {
      newArray.push(item)
    }
  })
  return newArray
}

export const isEmpty = (data: any): boolean => {
  if(isType(data, 'string')) {
    return !!!data.length
  }else if(isType(data, 'null') || isType(data, 'undefined')) {
    return true
  }else if(isType(data, 'array')) {
    return !!!data.length
  }else if(isType(data, 'object')) {
    return !!!Object.keys(data).length
  }
  return false
}

//allSettled
export function allSettled(promises: Array<any>): Promise<any> {
  if(!promises) return Promise.reject('params is not array')
  // if(Promise.allSettled) return Promise.allSettled(promises)
  if(promises.length == 0) return Promise.resolve(promises)
  return new Promise((resolve) => {
    const length = promises.length
    let completeCounter = 0
    let values: any[] = []
    for(let i = 0; i < length; i ++) {
      Promise.resolve(promises[i])
      .then(
        function(value) {
          completeCounter ++
          values.push({
            status: 'fulfilled',
            value
          })
          if(completeCounter == length) return resolve(values)
        },
        function(reason) {
          completeCounter ++
          values.push({
            status: 'rejected',
            reason
          })
          if(completeCounter == length) return resolve(values)
        }
      )
    }
  })
}

export const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
  if(!isBase64(base64)) throw new Error('the params is not a base64 type')
  // const padding = '='.repeat((4 - base64.length % 4) % 4)
  // const base64Data = (base64 + padding)
  // .replace(/-/g, '+')
  // .replace(/_/g, '/')
  const base64Data = base64.replace(/^data:.+?\/.+;base64,/, '')
  const rawData = window.atob(base64Data)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray.buffer
}


export const arrayBufferToBase64 = (arraybuffer: ArrayBuffer): string => {

  let binary: string = ''
  let bytes = new Uint8Array(arraybuffer)
  const len = bytes.length
  if(len > 1024 * 500) {
    throw new Error('buffer is too large')
  }
  for(let i = 0; i < len; i ++) {
    binary += String.fromCharCode(bytes[i])
  }

  return btoa(binary)

}

export function withTry<T=any> (func: Function) {
  return async function(...args: any[]): Promise<[any, T | null]> {
    try {
      const data = await func(...args)
      return [null, data]
    }catch(err) {
      return [err, null]
    }
  }
}

export function promisify(callback: any, ...args: any[]) {
  return new Promise((resolve) => {
    callback(...args, resolve)
  })
}