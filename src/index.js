import { isArray, isFile, flat, isEmpty, isObject, isFunc } from './tool'
import Validator from './utils/validator'
import { CACHE_STATUS, CACHE_TEMPLATE, MIN_CHUNK } from './utils/constant'
import SparkMd5 from 'spark-md5'

//发布订阅模式

class MediaTools {

  instance 

  //文件缓存
  files = {
    upload: {

    },
    download: {

    }
  }

  //事件队列
  events = {
    download: [

    ],
    upload: [
      {
        file
      }
    ]
  }

  constructor() {
    if(this.instance) return this.instance
    this.instance = this
  }

  //订阅
  on(type, ...args) {
    if(isEmpty(args)) return []
    if(!this.events[type]) this.events[type] = []
    let _callback
    let symbolList = []
    let result = []
    //参数验证
    this.dealArguments(args)(function({data, callback}) {
      _callback = callback

      let validate = new Validator()
      result = data.reduce((acc, d) => {
        if(isObject(d)) {
          Object.keys(d).forEach(t => {
            validate.add(d[t])
          })
          if(validate.validate()) {
            acc.push(d)
          }
        }
        return acc
      }, [])
    })
    this.events[type] = [ ...this.events[type], ...(result.map(r => {
      let symbol = Symbol()
      symbolList.push(symbol)
      return {
        symbol,
        ...r
      }
    })) ]
    //返回成功项
    _callback && _callback(result.length)
    return symbolList
  }

  //发布
  emit(type, ...args) {
    //收集需要触发的任务
    let activeEmit
    if(!args.length) {
      activeEmit = [...this.events[type]]
      this.events[type] = []
    }else {
      let newTask = flat(args)
      let restEmit = []
      //筛选需要执行的任务
      this.events[type].forEach(task => {
        const { symbol } = task
        if(newTask.includes(symbol)) {
          activeEmit.push(task)
        }else {
          restEmit.push(task)
        }
      })
      this.events[type] = [...restEmit]
      restEmit = null
    }

    //处理任务
    return Promise.allSettled(activeEmit.map(task => {
      const method = type === 'upload' ? 'dealUploadChunk' : 'download'
      return this[method](task)
    }))
    .then(res => {
      let rejected = []
      let fulfilled = []
      let stopping = []
      let cancel = []

      res.forEach((result, index) => {
        const { status, reason, value } = result
        let task = activeEmit[index]
        let name = task.symbol
        let fileCache = this.files[type][name]

        //记录失败项
        if(status === 'rejected') {
          let fileStatus = fileCache.status
          switch(fileStatus) {
            case CACHE_STATUS.rejected: 
              rejected.push({
                reason,
                data: task
              })
              break
            case CACHE_STATUS.stopping:
              stopping.push({
                reason: 'stopping',
                data: task
              })
              break
            case CACHE_STATUS.cancel:
              cancel.push({
                reason: 'cancel',
                data: task
              })
          }

          //将暂停项重新添加至事件队列中, 其余失败项需要重新手动添加至事件队列中
          if(fileStatus === CACHE_STATUS.stopping) {
            this.events[type].push(task)
          }

        }
        //记录成功项
        else {
          fulfilled.push({
            value,
            data: task
          })
        }

        //将执行文件从文件缓存中删除
        delete this.files[type][name]

      })

      activeEmit = null

      return {
        rejected,
        fulfilled,
        stopping,
        cancel
      }
    })

  }

  //对下载的参数进行验证并收集
  getDownloadValidArguments(array, callbackLast=true) {

    return {
      callback: null,
      args: []
    }
  }

  //剩余参数处理
  dealArguments(args, callbackLast=true) {
    let _args = [...args]
    _args = flat(_args)
    let callback
    if(callbackLast) {
      let last = _args.slice(_args.length - 1)
      callback = isFunc(last) ? last : null
      _args = isFunc(last) ? _args.slice(0, _args.length - 1) : _args
    }else {
      callback = null
    }
    return function(validate) {
      if(isFunc(validate)) {
        return validate({ data: _args, callback })
      }else {
        return { data: _args, callback }
      }
    }
  }

  //取消监听(不能取消正在执行的任务)
  cancelEmit(...args) {
    if(!args.length) {
      this.events[type] = []
    }else {
      //参数筛选
      let rest = []
      let result = []
      let callback 
      let last = args.slice(args.length - 1)
      callback = isFunc(last) ? last : null
      args = isFunc(last) ? args.slice(0, args.length - 1) : args
      this.events[type].forEach(event => {
        const { symbol } = event
        if(args.includes(symbol)){
          result.push(event)
        }else {
          rest.push(event)
        }
      })


      this.events[type] = [ ...rest ]
      //执行回调并返回剩余队列中的事件数量
      callback && callback(result)
      return result.length
    }

  }

  //开始任务(需要本身存在于队列中, 对于正在进行上传的任务不产生影响)返回开始上传和下载的数量
  start(type, ...args) {
    let result = []
    //全部开始
    if(!args.length) {
      result = this.events[type]
    }else {
      result = [...args]
    }

    this.emit(type, result)

  }

  //暂停任务(暂停的项目为存在于文件缓存中的内容)
  stop(type, ...args) {
    let result = []
    let last
    let callback
    let newFiles = {}
    const files = this.files[type]
    args = flat(args)
    last = args.slice(args.length - 1)
    callback = isFunc(last) ? last : null
    args = isFunc(last) ? args.slice(0, args.length - 1) : args
    newFiles = Object.keys(files).forEach(file => {
      if(args.includes(file)) {
        result.push(file)
        this.files[type][file].status = CACHE_STATUS.stopping
      }else {
        acc[file] = {...files[file]}
      }
      return acc
    })
    
    callback && callback(result)
    return result.length
  }

  //取消任务(取消的项目为存在于文件缓存中的内容)
  cancel(type, ...args) {
    let result = []
    let last
    let callback
    let newFiles = {}
    const files = this.files[type]
    args = flat(args)
    last = args.slice(args.length - 1)
    callback = isFunc(last) ? last : null
    args = isFunc(last) ? args.slice(0, args.length - 1) : args
    newFiles = Object.keys(files).forEach(file => {
      if(args.includes(file)) {
        result.push(file)
        this.files[type][file].status = CACHE_STATUS.stopping
      }else {
        acc[file] = {...files[file]}
      }
      return acc
    })

    callback && callback(result)
    return result.length
  }

  //监听文件load进度
  watch(...args) {
    
  } 

  //上传
  /**
   * 
   * @param {*} file 
   * @param {判断后台是否存在文件} exitDataFn 
   * @param {分片上传} uploadFn 
   * @param {回调} callback 
   */
  upload({file, exitDataFn, uploadFn, callback}) {
    let fileType = isFile(file)
    if(!fileType) throw new Error('arguments error')
    const symbol = this.on('upload', {file, exitDataFn, uploadFn, callback})
    if(!symbol.length) return new Error('fail upload')
    this.emit('upload', symbol[0])
    //返回用于控制load的标识符
    return symbol[0]
  }

  //下载
  download() {

  }

  //处理上传文件分片
  dealUploadChunk({file, exitDataFn, uploadFn, callback, symbol}) {
    const { name, type, size } = file
    //添加记录至文件缓存中
    if(!this.files['upload'][symbol]) this.files['upload'][symbol] = { ...CACHE_TEMPLATE, file, symbol }
    this.files['upload'][symbol]['status'] = CACHE_STATUS.doing

    //md5加密
    return this.getFileMd5(file)
    //向后端保存文件的相关信息为后面分片上传做验证准备
    .then(md5 => {
      this.files['upload'][symbol]['file']['md5'] = md5
      this.files['upload'][symbol]['md5'] = md5
      //将加密后的文件返回
      return exitDataFn && exitDataFn({
        fileName: name,
        md5,
        type,
        size,
        chunkSize: MIN_CHUNK,
        chunksLength: this.files['upload'][symbol]['chunks'].length
      })
    })
    //分片上传
    .then(res => {
      /**
       * 列表展示为未上传的部分
       * data: {
       *  list: [每一分片的索引]
       * }
       */
      const { data } = res
      return new Promise((resolve, reject) => {
        //后台不存在当前文件的情况下上传
        if(data) {
          this.chunkInternalUpload(data.list, symbol, uploadFn)
          .then(_ => {
            callback && callback(null)
            this.files['upload'][symbol]['status'] = CACHE_STATUS.fulfilled
            resolve(symbol)
          })
          .catch(err => {
            callback && callback(err)
            this.files['upload'][symbol]['status'] = CACHE_STATUS.rejected
            reject({
              err,
              name: symbol
            })
          })
        }
        //文件存在则直接回调
        else {
          callback && callback(null)
          this.files['upload'][symbol]['status'] = CACHE_STATUS.fulfilled
          resolve(symbol)
        }
      })
    })
    .catch(err => {
      callback && callback(err)
      this.files['upload'][symbol]['status'] = CACHE_STATUS.rejected
      return {
        err,
        name: symbol
      }
    })
  }

  //分片下载+断点续载
  chunkDownload() {

  }

  //分片上传
  chunkInternalUpload(unUploadList, name, upload) {
    if(!isArray(unUploadList)) unUploadList = []
    //将已上传的记录存至缓存中
    this.files['upload'][name]['completeChunks'] = unUploadList
    let files = this.files['upload'][name]
    return Promise.all(this.files['upload'][name]['chunks'].map((chunk, index) => {
      //处理用户的取消或暂停
      if(this.files['upload'][name]['status'] === CACHE_STATUS.stopping || this.files['upload'][name]['status'] === CACHE_STATUS.cancel) return Promise.reject('internal')
      let formData = new FormData()
        //只上传未上传过的内容
        if(!unUploadList.includes(index)) {
          formData.append('file', chunk)
          formData.append('md5', files['md5'])
          formData.append('index', index)
          upload(formData)
        }
    }))
    .finally(_ => formData = null)
  }

  //简单上传
  miniUpload(file, callback) {

  }

  //简单下载
  miniDownload() {

  }

  //获取md5
  getFileMd5(file) {
    const { size, name } = file
    const that = this
    let currentChunk = 0,
        fileReader = new FileReader(),
        totalChunks = Math.ceil(size / MIN_CHUNK),
        spark = new SparkMd5.ArrayBuffer(),
        fileSlice = File.prototype.slice
    return new Promise((resolve, reject) => {

      fileReader.onload = (e) => {
        if(!e.target) return
        //添加读取的内容
        spark.append(e.target.result)
        currentChunk ++
        //继续读取
        if(currentChunk < totalChunks) {
          loadNext()
        }
        //读取完毕
        else {
          resolve(spark.end())
        }
      }
  
      //错误处理
      fileReader.onerror = reject

      //文件内容读取
      function loadNext() {
        let start = currentChunk * MIN_CHUNK,
            end = currentChunk + 1 === totalChunks ? size : (currentChunk + 1) * MIN_CHUNK
        const chunks = fileSlice.call(file, start, end)
        that.files[name]['chunks'].push(chunks)
        fileReader.readAsArrayBuffer(chunks)
      }

      loadNext()

    })

  }

  //将数据保存在本地localStorage中
  //获取数据
  getLocalStorageItem(key) {

  }

  //设置数据
  setLocalStorageItem(key, value) {

  }

}

export {
  MediaTools
}