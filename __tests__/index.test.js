import { Upload } from '../src'
import { base64ToArrayBuffer, arrayBufferToBase64, isSymbol, isFalse } from '../src/utils/tool'
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
  chunkSize: 1024 * 500
}

const callback = (err, data) => {}

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

let upload = new Upload({
  //模拟小程序的arraybuffer与base64互相转换的方法
  base64ToArrayBuffer,
  arrayBufferToBase64
})

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
            beforeUpload = 0,
            afterUpload = 0,
            beforeComplete = 0,
            afterComplete = 0
        const result = await upload.upload({
          exitDataFn,
          uploadFn,
          file,
          completeFn,
          callback,
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
            beforeUpload({ name, task }) {
              beforeUpload ++
            },
            afterUpload({ name, task, index, success }) {
              expect(index).toBe(afterUpload)
              afterUpload ++
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

        expect(result).toBeInstanceOf(Array)
        const [ names, emitResult ] = result

        expect(names).toBeInstanceOf(Array)
      
        names.forEach(name => expect(isSymbol(name)).toBeTruthy)

        emitExpect(emitResult, 'fulfilled')

        const _times = Math.ceil(FILE_SIZE / config.chunkSize)

        expect(beforeRead).toBe(1)
        expect(reading).toBe(_times)
        expect(beforeCheck).toBe(1)
        expect(afterCheck).toBe(1)
        expect(beforeUpload).toBe(1)
        expect(afterUpload).toBe(_times)
        expect(beforeComplete).toBe(1)
        expect(afterComplete).toBe(1)

      })

    })

  })

  describe('on api', () => {

    describe('on api success test', () => {

      it('on api success', () => {

        const tasks = upload.on({
          exitDataFn,
          uploadFn,
          file,
          completeFn,
          callback,
        })
        expect(tasks).toBeInstanceOf(Array)
        expect(tasks.length).toBe(1)
        tasks.forEach(task => {
          expect(isSymbol(task)).toBeTruthy
        })

      })

    })

    describe('on api fail test', () => {

      test('on api fail because the task params of exitDataFn is not verify', () => {

        const tasks = upload.on({
          exitDataFn: null,
          uploadFn,
          file,
          completeFn,
          callback,
        })

        expect(tasks).toBeInstanceOf(Array)
        expect(tasks.length).toBe(0)

      })

      test('on api fail because the task params of uploadFn is not verify', () => {
        
        const tasks = upload.on({
          exitDataFn,
          uploadFn: null,
          file,
          completeFn,
          callback,
        })

        expect(tasks).toBeInstanceOf(Array)
        expect(tasks.length).toBe(0)

      })

      test('on api fail because lack of the task params of uploadFn', () => {
       
        const tasks = upload.on({
          exitDataFn,
          file,
          completeFn,
          callback,
        })

        expect(tasks).toBeInstanceOf(Array)
        expect(tasks.length).toBe(0)

      })

      test('on api fail because the task params of file is not verify', () => {
        
        const tasks = upload.on({
          exitDataFn,
          uploadFn,
          file: null,
          completeFn,
          callback,
        })

        expect(tasks).toBeInstanceOf(Array)
        expect(tasks.length).toBe(0)

      })
 
      test('on api fail because lack of the task params of file', () => {
        
        const tasks = upload.on({
          exitDataFn,
          uploadFn,
          completeFn,
          callback,
        })

        expect(tasks).toBeInstanceOf(Array)
        expect(tasks.length).toBe(0)

      })

      test('on api fail because lack of the task params of mime and the file type can not get the mime', () => {
        
        const tasks = upload.on({
          exitDataFn,
          uploadFn,
          file: blobFile,
          completeFn,
          callback,
        })

        expect(tasks).toBeInstanceOf(Array)
        expect(tasks.length).toBe(0)

      })

      test('on api fail because the chunks is post but the content is not verify file type', () => {
        
        const tasks = upload.on({
          exitDataFn,
          uploadFn,
          chunks: [ null, null ],
          completeFn,
          callback,
        })

        expect(tasks).toBeInstanceOf(Array)
        expect(tasks.length).toBe(0)

      })

    })

  })

  describe('emit api', () => {

    describe('emit api success test', () => {

      let tasks 
      let _config = {
        exitDataFn,
        uploadFn,
        completeFn
      }

      const on = (config={}) => {
        tasks = upload.on({
          ..._config,
          ...config,
        })
      }

      test('emit api success with file ', async () => {

        on({file})
        const result = await upload.emit(tasks)

        emitExpect(result, 'fulfilled')
        
      })

      test('emit api success with blob ', async () => {

        on({ 
          file: blobFile,
          mime
        })
        const result = await upload.emit(tasks)

        emitExpect(result, 'fulfilled')

      })

      test('emit api success with arraybuffer ', async () => {

        on({ file: arrayBufferFile, mime })
        const result = await upload.emit(tasks)

        emitExpect(result, 'fulfilled')

      })

      test('emit api success with chunks list file', async () => {

        on({
          chunks,
          mime,
          md5
        })

        const result = await upload.emit(tasks)

        emitExpect(result, 'fulfilled')

      })

      test('emit api success but the exitFn return the not verify data and all the chunks need upload', async () => {

        let times = 0

        on({
          ...config,
          file,
          exitDataFn: () => {
            return null
          },
          uploadFn: (data) => {
            times ++
          }
        })
        const result = await upload.emit(tasks)

        emitExpect(result, 'fulfilled')
        expect(times).toBe(Math.ceil(FILE_SIZE / config.chunkSize))

      })

    })

    describe('emit api fail test', () => {

      test('emit api fail because the task name is not found', async () => {

        const result = await upload.emit(null)

        emitExpect(result, 'other')

      })

    })

  })

  describe('start api', () => {

    describe('start api success test', () => {

      test('start api success', async () => {

        const tasks = upload.on({
          exitDataFn,
          file,
          completeFn,
          uploadFn
        })

        const result = await upload.start(tasks)

        emitExpect(result, 'fulfilled')

      })

    })

  })

  describe('stop api', () => {

    describe('stop api success test', () => {

      const total = Math.ceil(FILE_SIZE / config.chunkSize)
      let times = new Array(total).fill(0).map((_, index) => index)
      let stop = false

      test('stop api success', async () => {

        //在emit中的stop中能找到当前指定队列名称任务
        const tasks = upload.on({
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

  describe('cancelEmit api', () => {

    describe('cancelEmit api success test', () => {

      test('cancelEmit api success', async () => {

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

    describe('cancelEmit api fail test', () => {

      test('cancelEmit api fail because the task is uploading', async () => {

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

      test('cancelEmit api fail because the task name is not found', () => {
        //在之后能再次执行任务

        const result = upload.cancelEmit(null)

        expect(result).toBeInstanceOf(Array)
        expect(result).toHaveLength(0)

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

      test('lifecycle stop the task in reading', async () => {

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

      test('lifecycle stop the task in reading', async () => {

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

      test('lifecycle stop the task in reading', async () => {

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

      test('lifecycle stop the task in reading', async () => {

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

      test('lifecycle stop the task before upload', async () => {

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

      test('lifecycle stop in check', async () => {

        getUpload({
          beforeCheck() {
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

    })

  })

  describe('mini app analog', () => {

    //临时保存全局变量模拟小程序环境
    let Blob = window.Blob
    let File = window.File
    let FileReader = window.FileReader
    // let atob = window.atob
    let upload

    beforeAll(() => {
      window.Blob = undefined
      window.File = undefined
      window.FileReader = undefined
      // window.atob = undefined
      upload = new Upload({
        //模拟小程序的arraybuffer与base64互相转换的方法
        base64ToArrayBuffer,
        arrayBufferToBase64
      })
    })

    afterAll(() => {
      window.Blob = Blob
      window.File = File
      window.FileReader = FileReader
      // window.atob = atob
    })

    describe('mini app analog success test', () => {

      test('mini app analog with arraybuffer success', async () => {

        const tasks = upload.on({
          uploadFn,
          file: arrayBufferFile,
          completeFn,
          mime
        })

        const result = await upload.emit(tasks) 
        
        emitExpect(result, 'fulfilled')

      })

      test('mini app analog with base64 success', async () => {

        const tasks = upload.on({
          uploadFn,
          file: base64File,
          mime,
          completeFn
        })

        const result = await upload.emit(tasks)

        emitExpect(result, 'fulfilled')

      })

      test('mini app analog with chunks success', async () => {

        let chunks = []

        let totalChunks = Math.ceil(FILE_SIZE / config.chunkSize),
            bufferSlice = ArrayBuffer.prototype.slice

        while(chunks.length < totalChunks) {
          let start = currentChunk * config.chunkSize,
              end = currentChunk + 1 === totalChunks ? FILE_SIZE : ( currentChunk + 1 ) * config.chunkSize
          const chunk = bufferSlice.call(arrayBufferFile, start, end)

          chunks.push(chunk)
        }

        const tasks = upload.on({
          uploadFn,
          chunks,
          mime,
          completeFn
        })

        const result = await upload.emit(tasks)

        emitExpect(result, 'fulfilled')

      })

    })

    describe('mini app analog fail test', () => {

      let upload = new Upload()

      test('mini app analog fail becasue lack of the file transform api', () => {
        //未指定base64转换方法相关

        const result = upload.on({
          exitDataFn,
          file: base64File,
          mime,
          completeFn
        })

        expect(result).toBeInstanceOf(Array)
        expect(result).toHaveLength(0)

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

})