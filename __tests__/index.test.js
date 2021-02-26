import { Upload } from '../src'
import { base64ToArrayBuffer, arrayBufferToBase64, isSymbol } from '../src/utils/tool'
import SparkMd5 from 'spark-md5'

const exitDataFn = ({ filename, md5, suffix, size, chunkSize, chunksLength }) => {
  return false
}

const uploadFn = (data) => {
 
}

const completeFn = ({ name: md5 }) => {}

const config = {
  retry: {
    times: 3
  },
  chunkSize: 1024 * 1024 * 5
}

const callback = (done) => (error) => {
  if(error) {
    done(error)
  }else {
    done()
  }
}

const FILE_SIZE = 1024 * 1024 * 20
const BASE_SIZE = 1024 * 500

const arrayBufferFile = new ArrayBuffer(FILE_SIZE)
const base64File = arrayBufferToBase64(new ArrayBuffer(BASE_SIZE))
const file = new File([arrayBufferFile], 'image/jpeg')
const blobFile = new Blob([arrayBufferFile])
const slice = ArrayBuffer.prototype.slice

const prevLen = Math.floor(FILE_SIZE / 4 / config.chunkSize)

const chunks = [
  ...(new Array(prevLen).fill(0).map((_, index) => {
    return new File([slice.call(arrayBufferFile, index * config.chunkSize, (index + 1) * config.chunkSize)], 'chunk-test')
  })),
  ...(new Array(prevLen).fill(0).map((_, index) => {
    return new Blob([slice.call(arrayBufferFile, (index + prevLen) * config.chunkSize, (index + 1 + prevLen) * config.chunkSize)])
  })),
  ...(new Array(prevLen).fill(0).map((_, index) => {
    return slice.call(arrayBufferFile, (index + prevLen * 2) * config.chunkSize, (index + 1 + prevLen * 2) * config.chunkSize)
  })),
  ...(new Array((Math.ceil((FILE_SIZE - (prevLen * 3 * config.chunkSize)) / config.chunkSize))).fill(0).map((_, index) => {
    return arrayBufferToBase64(slice.call(arrayBufferFile, (index + prevLen * 3) * config.chunkSize, (index + 1 + prevLen * 3) * config.chunkSize))
  }))
]

const mime = 'image/jpeg'

let currentChunk = 0,
    totalChunks = Math.ceil(FILE_SIZE / config.chunkSize)
const spark = new SparkMd5.ArrayBuffer()
while(currentChunk < totalChunks) {
  let start = currentChunk * config.chunkSize,
      end = currentChunk + 1 === totalChunks ? FILE_SIZE : ( currentChunk + 1 ) * config.chunkSize
  const _chunks = slice.call(arrayBufferFile, start, end)

  currentChunk ++
  spark.append(_chunks)
}

const md5 = spark.end()
spark.destroy()

let upload = new Upload()

const emitExpect = (target, targetKey) => {
  expect(target).toBeInstanceOf(Object)

  const { history, ...nextTarget } = target

  Object.keys(nextTarget).forEach(key => {
    if(key !== targetKey) {
      expect(nextTarget[key]).toBeInstanceOf(Array)
      expect(nextTarget[key]).toHaveLength(0)
    }else {
      expect(nextTarget[key]).toBeInstanceOf(Array)
      expect(nextTarget[key]).toHaveLength(1)
    }
  })
}

describe('upload chunk test', () => {

  describe('upload api', () => {

    describe('upload api success test', () => {

      test('upload api success', async () => {
        let beforeRead = 0,
            reading = 0,
            beforeCheck = 0,
            afterCheck = 0,
            uploading = 0,
            beforeComplete = 0,
            afterComplete = 0,
            result
        await new Promise((resolve, reject) => {
          result = upload.upload({
            exitDataFn,
            uploadFn,
            file,
            completeFn,
            callback: (err) => {
              if(err) {
                reject(err)
              }else {
                resolve()
              }
            },
            lifecycle: {
              beforeRead({ name, task }) {
                beforeRead ++
              },
              reading({ name, task, start, end }) {
                expect(start).toBe((reading ++) * config.chunkSize)
                expect(end).toBe(reading * config.chunkSize > FILE_SIZE ? FILE_SIZE : reading * config.chunkSize)
              },
              beforeCheck({ name, task }) {
                beforeCheck ++
              },
              afterCheck({ name, task, isExists }) {
                afterCheck ++
                expect(isExists).toBe(false)
              },
              uploading({ name, task, index, success }) {
                expect(index).toBe(uploading)
                uploading ++
              },
              beforeComplete({ name, task, isExists }) {
                beforeComplete ++
                expect(isExists).toBe(false)
              },
              afterComplete({ name, task, success }) {
                afterComplete ++
                expect(success).toBe(true)
              }
            }
          })
        })

        expect(result).toBeInstanceOf(Array)
      
        result.forEach(name => expect(isSymbol(name)).toBeTruthy)

        const _times = Math.ceil(FILE_SIZE / config.chunkSize)

        expect(beforeRead).toBe(1)
        expect(reading).toBe(_times)
        expect(beforeCheck).toBe(1)
        expect(afterCheck).toBe(1)
        expect(uploading).toBe(_times)
        expect(beforeComplete).toBe(1)
        expect(afterComplete).toBe(1)

      })

    })

  })

  describe('add api', () => {

    describe('add api success test', () => {

      it('add api success', () => {

        const tasks = upload.add({
          exitDataFn,
          uploadFn,
          file,
          completeFn,
          callback: callback(() => {}),
        })
        expect(tasks).toBeInstanceOf(Array)
        expect(tasks.length).toBe(1)
        tasks.forEach(task => {
          expect(isSymbol(task)).toBeTruthy
        })

      })

    })

  })

  describe('deal api', () => {

    let tasks 
    let _config = {
      exitDataFn,
      uploadFn,
      completeFn,
    }

    const add = (config={}) => {
      tasks = upload.add({
        ..._config,
        ...config,
      })
    }

    describe('deal api success test', () => {

      test('deal api success width base64', (done) => {
        add({ file: base64File, mime, callback: callback(done) })
        upload.deal(tasks)
      })

      test('deal api success with file', (done) => {
        add({ file, callback: callback(done) })
        upload.deal(tasks)
      })

      test('deal api success with blob', (done) => {
        add({ 
          file: blobFile,
          mime,
          callback: callback(done)
        })
        upload.deal(tasks)
      })

      test('deal api success with arraybuffer', (done) => {
        add({ file: arrayBufferFile, mime, callback: callback(done) })
        upload.deal(tasks)
      })

      test('deal api success with chunks list file', (done) => {
        add({
          chunks,
          mime,
          md5,
          callback: callback(done)
        })
        upload.deal(tasks)
      })

      test('deal api success but the exitFn return the not verify data and all the chunks need upload', (done) => {
        let times = 0

        add({
          ...config,
          file,
          exitDataFn: () => {
            return null
          },
          uploadFn: (data) => {
            times ++
          },
          callback: (error) => {
            if(error) {
              done(error)
            }else {
              expect(times).toBe(Math.ceil(FILE_SIZE / config.chunkSize))
              done()
            }
          }
        })

        upload.deal(tasks)
      })

      test('deal api success but the exitFn return the not verify data and all the chunks need upload', (done) => {
        let times = 0

        add({
          ...config,
          file,
          exitDataFn: () => {
            return {
              data: config.chunkSize + 1
            }
          },
          uploadFn: (data) => {
            times ++
          },
          callback: (error) => {
            if(error) {
              done(error)
            }else {
              expect(times).toBe(Math.ceil(FILE_SIZE / config.chunkSize))
              done()
            }
          }
        })

        upload.deal(tasks)
      })

      test('deal api success and exitFn return the number list uploaded chunk', (done) => {
        let times = 0

        add({
          ...config,
          file,
          exitDataFn: () => {
            return {
              data: [0]
            }
          },
          uploadFn: (data) => {
            times ++
          },
          callback: (error) => {
            if(error) {
              done(error)
            }else {
              expect(times).toBe(Math.ceil(FILE_SIZE / config.chunkSize) - 1)
              done()
            }
          }
        })

        upload.deal(tasks)
      })

      test('deal api success and exitFn return the string list uploaded chunk', async () => {
        let times = 0

        add({
          ...config,
          file,
          exitDataFn: () => {
            return {
              data: ['0']
            }
          },
          uploadFn: (data) => {
            times ++
          },
          callback: (error) => {
            if(error) {
              done(error)
            }else {
              expect(times).toBe(Math.ceil(FILE_SIZE / config.chunkSize) - 1)
              done()
            }
          }
        })

        upload.deal(tasks)
      })

      test('deal api success and exitFn return the number of next need upload chunk', (done) => {
        let times = 0

        add({
          ...config,
          file,
          exitDataFn: () => {
            return {
              data: config.chunkSize
            }
          },
          uploadFn: (data) => {
            times ++
          },
          callback: (error) => {
            if(error) {
              done(error)
            }else {
              expect(times).toBe(Math.ceil(FILE_SIZE / config.chunkSize) - 1)
              done()
            }
          }
        })

        upload.deal(tasks)
      })

      test('deal api success and uploadFn return the string of next need upload chunk', (done) => {
        let times = 0

        add({
          ...config,
          file,
          exitDataFn: () => {
            return {
              data: config.chunkSize.toString()
            }
          },
          uploadFn: (data) => {
            times ++
          },
          callback: (error) => {
            if(error) {
              done(error)
            }else {
              expect(times).toBe(Math.ceil(FILE_SIZE / config.chunkSize) - 1)
              done()
            }
          }
        })

        upload.deal(tasks)
      })

      // test('deal api success and uploadFn no response', async () => {

      // })

    })

    describe('deal api fail test', () => {

      test('deal api fail because the task name is not found', () => {
        const result = upload.emit(null)
        expect(result.length).toBe(0)
      })

      test('deal api fail because the task not the uploadFn', (done) => {
        let times = 0
        const names = upload.add({
          file,
          callback: (error) => {
            expect(!!error).toBe(true)
            expect(times).toBe(0)
            done()
          },
          lifecycle: {
            uploading: () => {
              times ++
            }
          }
        })
        upload.deal(...names)
      })

      test('deal api fail because not hava the file and not have the chunk', () => {
        const names = upload.add({})
        expect(names.length).toBe(0)
      })

    })

  })

  describe('start api', () => {

    describe('start api success test', () => {

      test('start api success', (done) => {
        const tasks = upload.on({
          exitDataFn,
          file,
          completeFn,
          uploadFn,
          callback: callback(done)
        })

        upload.start(tasks)

        expect(tasks.length).toBe(0)
      })

    })

  })

  describe('stop api', () => {

    describe('stop api success test', () => {

      const total = Math.ceil(FILE_SIZE / config.chunkSize)
      let times = Array.from({ length: total }, (_, index) => index)
      let stop = false

      test('stop api success', async () => {

        //在emit中的stop中能找到当前指定队列名称任务
        const tasks = upload.add({
          exitDataFn() {
            return times
          },
          file,
          completeFn,
          uploadFn: (data) => {
            const index = data.get('index')
            const _index = times.indexOf(parseInt(index))
            if(!!~_index) {
              times.splice(_index, 1)
            }
          },
          lifecycle: {
            beforeUpload({ name }) {
              if(!stop) {
                const _result = this.stop(name)

                expect(_result).toBeInstanceOf(Array)
                expect(_result).toHaveLength(1)
                expect(_result[0]).toEqual(name)
              }
            },
            afterStop() {
              stop = true
            },
          }
        })

        expect(tasks).toBeInstanceOf(Array)
        expect(tasks).toHaveLength(1)

        const result = await upload.emit(tasks)

        emitExpect(result, 'stopping')

        expect(stop).toBe(true)

        //可以继续上传
        await upload.start(tasks)

        expect(times).toBeInstanceOf(Array)
        expect(times).toHaveLength(0)

      })

    })

    describe('stop api fail test', () => {

      test('stop api fail because the task name is not found', () => {

        const result = upload.stop(null)

        //断言测试
        expect(result).toBeInstanceOf(Array)
        expect(result).toHaveLength(0)

      })

    })

  })

  describe('cancel api', () => {

    describe('cancel api success test', () => {

      test('cancel api success', async () => {

        let cancel = false

         const tasks = upload.on({
          exitDataFn,
          file,
          completeFn,
          uploadFn,
          lifecycle: {
            beforeUpload({ name }) {
              if(!cancel) {
                const _result = this.cancel(name)
                expect(_result).toBeInstanceOf(Array)
                expect(_result).toHaveLength(1)
                expect(_result[0]).toEqual(name)
              }
            },
            afterCancel({ name }) {
              cancel = true
            }
          }
        })

        const result = await upload.emit(tasks)

        emitExpect(result, 'cancel')

        //无法继续上传
        const start = await upload.start(tasks)

        emitExpect(start, 'other')

      })

    })

    describe('cancel api fail test', () => {

      test('cancel api fail because the tak name is not found', () => {
        //返回指定正确的队列名称
        
        const result = upload.cancel(null)
        
        expect(result).toBeInstanceOf(Array)
        expect(result).toHaveLength(0)

      })

    })

  })

  describe('cancelAdd api', () => {

    describe('cancelAdd api success test', () => {

      test('cancelAdd api success', async () => {

         const tasks = upload.on({
          exitDataFn,
          file,
          completeFn,
          uploadFn
        })

        const cancelResult = upload.cancelEmit(tasks)

        expect(cancelResult).toBeInstanceOf(Array)
        expect(cancelResult).toHaveLength(1)
        expect(cancelResult[0]).toEqual(tasks[0])

        //无法继续上传，需要重新订阅
        const result = await upload.emit(tasks)

        emitExpect(result, 'other')

      })

    })

    describe('cancelAdd api fail test', () => {

      test('cancelAdd api fail because the task is uploading', async () => {

        let times = 0

        const tasks = await upload.upload({
          exitDataFn,
          file,
          completeFn,
          uploadFn(data) {
            times ++
          },
          lifecycle: {
            beforeUpload({ name }) {
              const _result = this.cancelEmit(name)
              expect(_result).toBeInstanceOf(Array)
              expect(_result).toHaveLength(0)
            }
          }
        })   
        
        expect(times).toBe(Math.ceil(FILE_SIZE / config.chunkSize))

      })

      test('cancelAdd api fail because the task name is not found', () => {
        //在之后能再次执行任务

        const result = upload.cancelEmit(null)

        expect(result).toBeInstanceOf(Array)
        expect(result).toHaveLength(0)

      })

    })

  })

  describe('isSupport api', () => {

    describe('isSupport api sucess test', () => {

      test('isSupport api sucess', () => {

      })

    })

  })

  describe('getTask api', () => {

    describe('getTask api sucess test', () => {

      test('getTask api sucess', () => {

      })

      test('getTask api sucess but the task not found ', () => {

      })

    })

  })

  describe('getOriginFile api', () => {
    
    describe('getOriginFile api sucess test', () => {

      test('getOriginFile api sucess', () => {

      })

      test('getOriginFile api sucess but the task not found ', () => {

      })

    })

  })

  describe('getStatus api', () => {
    
    describe('getStatus api sucess test', () => {

      test('getStatus api sucess', () => {

      })

      test('getStatus api sucess but the task not found ', () => {

      })

    })

  })

  describe('watch api', () => {

    describe('watch api success test', () => {

      test('watch api success', async () => {

        //返回正确的参数
        const tasks = upload.on({
          file,
          uploadFn: (data) => {
            const watch = upload.watch(tasks)
            expect(watch).toBeInstanceOf(Array)
            expect(watch).toHaveLength(1)
            watch.forEach(wa => {
              expect(wa).toBeInstanceOf(Object)
              expect(wa).toHaveProperty('progress')
              expect(wa).toHaveProperty('name')
            })
          },
          completeFn
        })

        const result = await upload.emit(tasks)

        emitExpect(result, 'fulfilled')

      })

    })

    describe('watch api fail test', () => {

      test('watch api fail because the task name is not found', () => {

        //不返回参数
        const uploading = upload.watch(null)

        expect(uploading).toBeInstanceOf(Array)
        expect(uploading).toHaveLength(0)

      })

    })

  })

  describe('lifecycle test', () => {

    let lifecycle = {
      afterCheck: ({ name, task, isExists }) => {
        expect(isExists).toBeFalsy
      },
      beforeComplete: ({ name, task, isExists }) => {
        expect(isExists).toBeFalsy
      },
      afterComplete: ({ name, task, success }) => {
        expect(success).toBe(true)
      }
    }

    let upload

    const getUpload = (config={}) => {
      upload = new Upload({
        lifecycle: {
          ...lifecycle,
          ...config
        }
      })
    }

    describe('lifecycle success test', () => {

      test('lifecycle success', async() => {

        let beforeRead = 0
        let reading = 0

        getUpload({
          beforeRead: ({ name, task }) => {
            beforeRead ++
          },
          reading: ({ name, task, start, end }) => {
            expect(start).toBe(reading * config.chunkSize)
            const endSize = (reading + 1) * config.chunkSize
            expect(end).toBe(endSize >= FILE_SIZE ? FILE_SIZE : endSize)
            reading ++
          },
          beforeUpload({  }) {
            return false
          },
          afterComplete: ({ name, task, success }) => {
            expect(success).toBe(false)
          }
        })

        const tasks = upload.on({
          file,
          exitDataFn,
          uploadFn,
          completeFn
        })

        const result = await upload.emit(tasks)
        emitExpect(result, 'stopping')
        expect(beforeRead).toBe(1)

      })

      test('lifecycle stop the task in reading with file', async () => {

        let reading = 0

        getUpload({
          reading() {
            if(reading > 3) {
              return false
            }
            reading ++
          },
          afterComplete({ success }) {
            expect(success).toBe(false)
          }
        })

        await upload.upload({
          exitDataFn,
          file,
          uploadFn,
          completeFn,
          mime
        })

        expect(reading).toBe(4)

      })

      test('lifecycle stop the task in reading with arraybuffer file', async () => {

        let reading = 0

        getUpload({
          reading() {
            if(reading > 3) {
              return false
            }
            reading ++
          },
          afterComplete({ success }) {
            expect(success).toBe(false)
          }
        })

        await upload.upload({
          exitDataFn,
          file: arrayBufferFile,
          uploadFn,
          completeFn,
          mime
        })

        expect(reading).toBe(4)

      })

      test('lifecycle stop the task in reading width base64 file', async () => {

        getUpload({
          reading() {
            return false
          },
          afterComplete({ success }) {
            expect(success).toBe(false)
          }
        })

        await upload.upload({
          exitDataFn,
          file: base64File,
          uploadFn,
          completeFn,
          mime
        })

      })

      test('lifecycle stop the task in reading width chunks file', async () => {

        getUpload({
          reading() {
            return false
          },
          afterComplete({ success }) {
            expect(success).toBe(false)
          }
        })

        await upload.upload({
          exitDataFn,
          chunks,
          uploadFn,
          completeFn,
          mime
        })

      })

      test('lifecycle stop the task before red', async () => {

        getUpload({
          beforeUpload() {
            return false
          },  
          afterComplete({ success }) {
            expect(success).toBeFalsy
          }
        })

        const tasks = upload.on({
          file,
          exitDataFn,
          uploadFn,
          completeFn
        })

        const result = await upload.emit(tasks)

        emitExpect(result, 'stopping')

      })

      test('lifecycle stop the task before check', async () => {

        getUpload({
          beforeUpload() {
            return false
          },  
          afterComplete({ success }) {
            expect(success).toBeFalsy
          }
        })

        const tasks = upload.on({
          file,
          exitDataFn,
          uploadFn,
          completeFn
        })

        const result = await upload.emit(tasks)

        emitExpect(result, 'stopping')

      })

      test('lifecycle stop the task after check', async () => {

        getUpload({
          beforeUpload() {
            return false
          },  
          afterComplete({ success }) {
            expect(success).toBeFalsy
          }
        })

        const tasks = upload.on({
          file,
          exitDataFn,
          uploadFn,
          completeFn
        })

        const result = await upload.emit(tasks)

        emitExpect(result, 'stopping')

      })

      test('lifecycle stop the task uploading', async () => {

        getUpload({
          beforeUpload() {
            return false
          },  
          afterComplete({ success }) {
            expect(success).toBeFalsy
          }
        })

        const tasks = upload.on({
          file,
          exitDataFn,
          uploadFn,
          completeFn
        })

        const result = await upload.emit(tasks)

        emitExpect(result, 'stopping')

      })

      test('lifecycle stop the task before complete', async () => {

        getUpload({
          beforeUpload() {
            return false
          },  
          afterComplete({ success }) {
            expect(success).toBeFalsy
          }
        })

        const tasks = upload.on({
          file,
          exitDataFn,
          uploadFn,
          completeFn
        })

        const result = await upload.emit(tasks)

        emitExpect(result, 'stopping')

      })

      test('lifecycle stop the task after complete', async () => {

        getUpload({
          beforeUpload() {
            return false
          },  
          afterComplete({ success }) {
            expect(success).toBeFalsy
          }
        })

        const tasks = upload.on({
          file,
          exitDataFn,
          uploadFn,
          completeFn
        })

        const result = await upload.emit(tasks)

        emitExpect(result, 'stopping')

      })

      test('lifecycle stop the task on retry', async () => {

      })

    })

  })

  describe('error retry', () => {

    describe('error retry success test', () => {

      let times = 0
      let count = 0

      test('error retry success', async () => {

        //错误自动重试
        const tasks = upload.on({
          file,
          completeFn,
          uploadFn: (formData) => {
            if(times < 3) {
              times ++
              throw new Error('retry test error')
            }else {
              return true
            }
          },
          config: {
            retry: {
              times: 3
            },
          },
          lifecycle: {
            retry({ name }) {
              count ++
            }
          }
        })

        const result = await upload.emit(tasks)

        emitExpect(result, 'fulfilled')
        expect(count).toBe(3)

      })

      test('error retry success and all the upload times all fail', async () => {

        //错误自动重试
        const tasks = upload.on({
          file,
          completeFn,
          uploadFn: (data) => {
            throw new Error('retry test all fail error')
          },
          config,
        })

        const result = await upload.emit(tasks)

        emitExpect(result, 'rejected')

      })

    })

  })

  describe('install api', () => {

    test('install success', () => {

    })

    test('install success and ignore the plguin', () => {

    })

  })

  describe('reader plugin test', () => {

    test('reader plugin success deal test', () => {

    })

  })

  describe('slicer plguin test', () => {

    test('slicer plguin success deal test', () => {

    })

  })

})