import { Upload, ECACHE_STATUS } from '../src'
import { arrayBufferToBase64, isSymbol } from '../src/utils/tool'
import SparkMd5 from 'spark-md5'
import { merge } from 'lodash'

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
            request: {
              exitDataFn,
              uploadFn,
              completeFn,
              callback: (err) => {
                if(err) {
                  reject(err)
                }else {
                  resolve()
                }
              },
            },
            file: {
              file
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
          upload: {
            exitDataFn,
            uploadFn,
            completeFn,
            callback: callback(() => {}),
          },
          file: {
            file
          },
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
      tasks = upload.add(merge({}, _config, config))
    }

    describe('deal api success test', () => {

      test('deal api success width base64', (done) => {
        add({ 
          file: {
            file: base64File,
            mime
          }, 
          request: {
            callback: callback(done)
          }, 
        })
        upload.deal(tasks)
      })

      test('deal api success with file', (done) => {
        add({ 
          file: {
            file
          }, 
          request: {
            callback: callback(done)
          }
        })
        upload.deal(tasks)
      })

      test('deal api success with blob', (done) => {
        add({ 
          file: {
            file: blobFile,
            mime
          },
          request: {
            callback: callback(done)
          }
        })
        upload.deal(tasks)
      })

      test('deal api success with arraybuffer', (done) => {
        add({ 
          file: {
            file: arrayBufferFile, 
            mime
          }, 
          request: {
            callback: callback(done) 
          }
        })
        upload.deal(tasks)
      })

      test('deal api success with chunks list file', (done) => {
        add({
          file: {
            chunks,
            mime,
            md5,
          },
          request: {
            callback: callback(done)
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

        add(merge({}, {
          config,
          file: {
            file
          },
          request: {
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
          }
        }))

        upload.deal(tasks)
      })

      test('deal api success and exitFn return the number list uploaded chunk', (done) => {
        let times = 0

        add(merge({
          config,
          file: {
            file
          },
          request: {
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
          }
        }))

        upload.deal(tasks)
      })

      test('deal api success and exitFn return the string list uploaded chunk', async () => {
        let times = 0

        add(merge({
          config,
          file: {
            file
          },
          request: {
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
          }
        }))

        upload.deal(tasks)
      })

      test('deal api success and exitFn return the number of next need upload chunk', (done) => {
        let times = 0

        add(merge({
          config,
          file: {
            file
          },
          request: {
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
          }
        }))

        upload.deal(tasks)
      })

      test('deal api success and uploadFn return the string of next need upload chunk', (done) => {
        let times = 0

        add(merge({
          config,
          file: {
            file
          },
          request: {
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
          }
        }))

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
          file: {
            file
          },
          request: {
            callback: (error) => {
              expect(!!error).toBe(true)
              expect(times).toBe(0)
              done()
            },
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
        const tasks = upload.add({
          request: {
            exitDataFn,
            completeFn,
            uploadFn,
            callback: callback(done)
          },
          file: {
            file
          },
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

      test('stop api success and with api', (done) => {

        let count = 0
        let tasks
        let stop = true

        //在emit中的stop中能找到当前指定队列名称任务
        tasks = upload.add({
          request: {
            completeFn,
            uploadFn: (data) => {
              count ++
            },
            callback: (error) => {
              if(stop) {
                expect(!!error).toBeTruthy
                stop = false
                upload.start(tasks)
              }else {
                expect(!!error).toBeFalsy
                expect(count).toEqual(times)
                done()
              }
            }
          },
          file: {
            file
          },
          lifecycle: {
            uploading({ name }) {
              if(stop) {
                this.stop(name)
              }
            },
          }
        })

        expect(tasks).toBeInstanceOf(Array)
        expect(tasks).toHaveLength(1)

        upload.deal(...tasks)

      })

      test('stop api success and stop in uploading', (done) => {

        let count = 0
        let reading = 0
        let tasks
        let stop = true

        //在emit中的stop中能找到当前指定队列名称任务
        tasks = upload.add({
          request: {
            completeFn,
            uploadFn: (data) => {
              count ++
            },
            callback: (error) => {
              if(stop) {
                expect(!!error).toBeTruthy
                stop = false
                const nextTasks = upload.start(tasks)
                expect(nextTasks).toBeInstanceOf(Array)
                expect(nextTasks.length).toBe(1)
              }else {
                expect(!!error).toBeFalsy
                expect(count).toEqual(times)
                expect(reading).toBe(times)
                done()
              }
            }
          },
          file: {
            file
          },
          lifecycle: {
            reading() {
              reading ++
            },
            uploading({ name }) {
              if(stop) {
                this.stop(name)
              }
            },
          }
        })

        expect(tasks).toBeInstanceOf(Array)
        expect(tasks).toHaveLength(1)

        upload.deal(...tasks)

      })

      test('stop api success and stop in reading', (done) => {

        let count = 0
        let tasks
        let stop = true

        //在emit中的stop中能找到当前指定队列名称任务
        tasks = upload.add({
          request: {
            completeFn,
            uploadFn: (data) => {
              
            },
            callback: (error) => {
              if(stop) {
                expect(!!error).toBeTruthy
                stop = false
                const nextTasks = upload.start(tasks)
                expect(nextTasks).toBeInstanceOf(Array)
                expect(nextTasks.length).toBe(1)
              }else {
                expect(!!error).toBeFalsy
                expect(count).toEqual(times + 1)
                done()
              }
            }
          },
          file: {
            file
          },
          lifecycle: {
            reading({ name }) {
              if(stop) {
                this.stop(name)
              }
              count ++
            },
          }
        })

        expect(tasks).toBeInstanceOf(Array)
        expect(tasks).toHaveLength(1)

        upload.deal(...tasks)

      })

      test('stop api success and stop in beforeRead', (done) => {

        let count = 0
        let tasks
        let stop = true

        //在emit中的stop中能找到当前指定队列名称任务
        tasks = upload.add({
          request: {
            completeFn,
            uploadFn: (data) => {
              
            },
            callback: (error) => {
              if(stop) {
                expect(!!error).toBeTruthy
                stop = false
                const nextTasks = upload.start(tasks)
                expect(nextTasks).toBeInstanceOf(Array)
                expect(nextTasks.length).toBe(1)
              }else {
                expect(!!error).toBeFalsy
                expect(count).toEqual(2)
                done()
              }
            }
          },
          file: {
            file
          },
          lifecycle: {
            beforeRead({ name }) {
              if(stop) {
                this.stop(name)
              }
              count ++
            },
          }
        })

        expect(tasks).toBeInstanceOf(Array)
        expect(tasks).toHaveLength(1)

        upload.deal(...tasks)

      })

      test('stop api success and stop in beforeCheck', (done) => {

        let beforeCheck = 0
        let reading = 0
        let tasks
        let stop = true

        //在emit中的stop中能找到当前指定队列名称任务
        tasks = upload.add({
          request: {
            completeFn,
            uploadFn: (data) => {
              
            },
            callback: (error) => {
              if(stop) {
                expect(!!error).toBeTruthy
                stop = false
                const nextTasks = upload.start(tasks)
                expect(nextTasks).toBeInstanceOf(Array)
                expect(nextTasks.length).toBe(1)
              }else {
                expect(!!error).toBeFalsy
                expect(beforeCheck).toEqual(2)
                expect(reading).toBe(times)
                done()
              }
            }
          },
          file: {
            file
          },
          lifecycle: {
            reading() {
              reading ++
            },
            beforeCheck({ name }) {
              if(stop) {
                this.stop(name)
              }
              beforeCheck ++
            },
          }
        })

        expect(tasks).toBeInstanceOf(Array)
        expect(tasks).toHaveLength(1)

        upload.deal(...tasks)

      })

      test('stop api success and stop in afterCheck', (done) => {

        let uploadCount = 0
        let reading = 0
        let tasks
        let stop = true

        //在emit中的stop中能找到当前指定队列名称任务
        tasks = upload.add({
          request: {
            completeFn,
            uploadFn: (data) => {
              uploadCount ++
            },
            callback: (error) => {
              if(stop) {
                expect(!!error).toBeTruthy
                stop = false
                upload.start(tasks)
              }else {
                expect(!!error).toBeFalsy
                expect(uploadCount).toEqual(times)
                expect(reading).toBe(times)
                done()
              }
            }
          },
          file: {
            file
          },
          lifecycle: {
            reading({ name }) {
              if(stop) {
                this.stop(name)
              }
              reading ++
            },
          }
        })

        expect(tasks).toBeInstanceOf(Array)
        expect(tasks).toHaveLength(1)

        upload.deal(...tasks)

      })

      test('stop api success and stop in afterStop and not use', (done) => {

        let count = 0
        let tasks
        let stop = true

        //在emit中的stop中能找到当前指定队列名称任务
        tasks = upload.add({
          request: {
            completeFn,
            uploadFn: (data) => {
              
            },
            callback: (error) => {
              if(stop) {
                expect(!!error).toBeTruthy
                stop = false
                const nextTasks = upload.start(tasks)
                expect(nextTasks).toBeInstanceOf(Array)
                expect(nextTasks.length).toBe(1)
              }else {
                expect(count).toBe(1)
                expect(!!error).toBeFalsy
                done()
              }
            }
          },
          file: {
            file
          },
          lifecycle: {
            reading({ name }) {
              if(stop) {
                this.stop(name)
              }
            },
            afterStop({ name }) {
              if(stop) {
                const names = this.stop(name)
                expect(names).toBeInstanceOf(Array)
                expect(names.length).toBe(0)
              }
              count ++
            },
          }
        })

        expect(tasks).toBeInstanceOf(Array)
        expect(tasks).toHaveLength(1)

        upload.deal(...tasks)

      })

      test('stop api success and stop in afterCancel and not use', (done) => {

        let count = 0
        let tasks
        let cancel = true
        let reading = 0

        //在emit中的stop中能找到当前指定队列名称任务
        tasks = upload.add({
          request: {
            completeFn,
            uploadFn: (data) => {
              
            },
            callback: (error) => {
              if(stop) {
                expect(!!error).toBeTruthy
                stop = false
                const nextTasks = upload.start(tasks)
                expect(nextTasks).toBeInstanceOf(Array)
                expect(nextTasks.length).toBe(1)
                expect(reading).toBe(1)
              }else {
                expect(count).toBe(1)
                expect(reading).toBe(1)
                expect(!!error).toBeTruthy
                done()
              }
            }
          },
          file: {
            file
          },
          lifecycle: {
            reading({ name }) {
              if(cancel) {
                this.cancel(name)
              }
              reading ++
            },
            afterCancel({ name }) {
              if(cancel) {
                const names = this.stop(name)
                expect(names).toBeInstanceOf(Array)
                expect(names.length).toBe(0)
              }
              count ++
            },
          }
        })

        expect(tasks).toBeInstanceOf(Array)
        expect(tasks).toHaveLength(1)

        upload.deal(...tasks)

      })

      test('stop api success and stop in beforeComplete', (done) => {

        let count = 0
        let tasks
        let stop = true
        let reading = 0
        let uploading = 0

        //在emit中的stop中能找到当前指定队列名称任务
        tasks = upload.add({
          request: {
            completeFn,
            uploadFn: (data) => {
              
            },
            callback: (error) => {
              if(stop) {
                expect(!!error).toBeTruthy
                stop = false
                const nextTasks = upload.start(tasks)
                expect(nextTasks).toBeInstanceOf(Array)
                expect(nextTasks.length).toBe(1)
                expect(reading).toBe(times)
                expect(uploading).toBe(times)
              }else {
                expect(count).toBe(2)
                expect(!!error).toBeFalsy
                done()
              }
            }
          },
          file: {
            file
          },
          lifecycle: {
            reading({ name }) {
              reading ++
            },
            uploading({ name }) {
              uploading ++
            },
            beforeComplete({ name }) {
              if(stop) {
                const names = this.stop(name)
                expect(names).toBeInstanceOf(Array)
                expect(names.length).toBe(1)
              }
              count ++
            },
          }
        })

        expect(tasks).toBeInstanceOf(Array)
        expect(tasks).toHaveLength(1)

        upload.deal(...tasks)

      })

      test('stop api success and stop in afterComplete', (done) => {

        let count = 0
        let tasks
        let stop = true
        let reading = 0
        let uploading = 0

        //在emit中的stop中能找到当前指定队列名称任务
        tasks = upload.add({
          request: {
            completeFn,
            uploadFn: (data) => {
              
            },
            callback: (error) => {
              if(stop) {
                expect(!!error).toBeTruthy
                stop = false
                const nextTasks = upload.start(tasks)
                expect(nextTasks).toBeInstanceOf(Array)
                expect(nextTasks.length).toBe(1)
                expect(reading).toBe(times)
                expect(uploading).toBe(times)
              }else {
                expect(count).toBe(2)
                expect(!!error).toBeFalsy
                done()
              }
            }
          },
          file: {
            file
          },
          lifecycle: {
            reading({ name }) {
              reading ++
            },
            uploading({ name }) {
              uploading ++
            },
            afterComplete({ name }) {
              if(stop) {
                const names = this.stop(name)
                expect(names).toBeInstanceOf(Array)
                expect(names.length).toBe(1)
              }
              count ++
            },
          }
        })

        expect(tasks).toBeInstanceOf(Array)
        expect(tasks).toHaveLength(1)

        upload.deal(...tasks)

      })

      test('stop api success and stop in retry', (done) => {

        let count = 0
        let tasks
        let stop = true
        let uploading = 0

        //在emit中的stop中能找到当前指定队列名称任务
        tasks = upload.add({
          request: {
            completeFn,
            uploadFn: (data) => {
              if(stop) {
                throw new Error()
              }
            },
            callback: (error) => {
              if(stop) {
                expect(!!error).toBeTruthy
                expect(error.retry).toBeFalsy
                stop = false
                const nextTasks = upload.start(tasks)
                expect(nextTasks).toBeInstanceOf(Array)
                expect(nextTasks.length).toBe(1)
              }else {
                expect(count).toBe(1)
                expect(!!error).toBeFalsy
                expect(uploading).toBe(times)
                done()
              }
            }
          },
          file: {
            file
          },
          lifecycle: {
            uploading({ name }) {
              uploading ++
            },
            retry({ name }) {
              if(stop) {
                const names = this.stop(name)
                expect(names).toBeInstanceOf(Array)
                expect(names.length).toBe(1)
              }
              count ++
            },
          }
        })

        expect(tasks).toBeInstanceOf(Array)
        expect(tasks).toHaveLength(1)

        upload.deal(...tasks)

      })

      test('stop api success and with error', (done) => {

        let count = 0
        let tasks
        stop = true

        //在emit中的stop中能找到当前指定队列名称任务
        tasks = upload.add({
          request: {
            completeFn,
            uploadFn: (data) => {
              count ++
            },
            callback: (error) => {
              if(stop) {
                expect(!!error).toBeTruthy
                stop = false
                upload.start(tasks)
              }else {
                expect(!!error).toBeFalsy
                expect(count).toEqual(times)
                done()
              }
            }
          },
          file: {
            file
          },
          lifecycle: {
            uploading({ name }) {
              if(stop) {
                throw new Error()
              }
            },
          }
        })

        expect(tasks).toBeInstanceOf(Array)
        expect(tasks).toHaveLength(1)

        upload.deal(...tasks)

      })

      test('stop api success and with boolean', (done) => {

        let count = 0
        let tasks
        stop = true

        //在emit中的stop中能找到当前指定队列名称任务
        tasks = upload.add({
          request: {
            completeFn,
            uploadFn: (data) => {
              count ++
            },
            callback: (error) => {
              if(stop) {
                expect(!!error).toBeTruthy
                stop = false
                upload.start(tasks)
              }else {
                expect(!!error).toBeFalsy
                expect(count).toEqual(times)
                done()
              }
            }
          },
          file: {
            file
          },
          lifecycle: {
            uploading({ name }) {
              if(stop) {
                return false
              }
            },
          }
        })

        expect(tasks).toBeInstanceOf(Array)
        expect(tasks).toHaveLength(1)

        upload.deal(...tasks)

      })

      test('stop api success and with promise', (done) => {

        let count = 0
        let tasks
        let stop = true

        //在emit中的stop中能找到当前指定队列名称任务
        tasks = upload.add({
          request: {
            completeFn,
            uploadFn: (data) => {
              count ++
            },
            callback: (error) => {
              if(stop) {
                expect(!!error).toBeTruthy
                stop = false
                upload.start(tasks)
              }else {
                expect(!!error).toBeFalsy
                expect(count).toEqual(times)
                done()
              }
            }
          },
          file: {
            file
          },
          lifecycle: {
            async uploading({ name }) {
              await new Promise((resolve) => setTimeout(resolve, 1000))
              if(stop) {
                return false
              }
            },
          }
        })

        expect(tasks).toBeInstanceOf(Array)
        expect(tasks).toHaveLength(1)

        upload.deal(...tasks)

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

      test('cancel api success with api', async () => {

        let tasks

        tasks = upload.add({
          request: {
            exitDataFn,
            completeFn,
            uploadFn,
            callback: (error) => {
              expect(!!error).toBeTruthy
              const result = upload.start(...tasks)
              expect(result).toBeInstanceOf(Array)
              expect(result.length).toBe(0)
              done()
            }
          },
          file: {
            file,
          },
          lifecycle: {
            uploading({ name }) {
              const _result = this.cancel(name)
              expect(_result).toBeInstanceOf(Array)
              expect(_result).toHaveLength(1)
              expect(_result[0]).toEqual(name)
            }
          }
        })

        const result = upload.deal(tasks)
        expect(result).toBeInstanceOf(Array)
        expect(result.length).toBe(1)

      })

      test('cancel api success with error', (done) => {

        let tasks

        tasks = upload.add({
          request: {
            exitDataFn,
            completeFn,
            uploadFn,
            callback: (error) => {
              expect(!!error).toBeTruthy
              const result = upload.start(...tasks)
              expect(result).toBeInstanceOf(Array)
              expect(result.length).toBe(0)
              done()
            }
          },
          file: {
            file,
          },
          lifecycle: {
            uploading({ name }) {
              throw new Error()
            }
          }
        })

        const result = upload.emit(tasks)
        expect(result).toBeInstanceOf(Array)
        expect(result.length).toBe(1)

      })

      test('cancel api success with boolean', (done) => {

        let tasks

        tasks = upload.add({
          request: {
            exitDataFn,
            completeFn,
            uploadFn,
            callback: (error) => {
              expect(!!error).toBeTruthy
              const result = upload.start(...tasks)
              expect(result).toBeInstanceOf(Array)
              expect(result.length).toBe(0)
              done()
            }
          },
          file: {
            file,
          },
          lifecycle: {
            uploading({ name }) {
              return false
            }
          }
        })

        const result = upload.emit(tasks)
        expect(result).toBeInstanceOf(Array)
        expect(result.length).toBe(1)

      })

      test('cancel api success and with promise', (done) => {

        let tasks
        let cancel = true

        //在emit中的stop中能找到当前指定队列名称任务
        tasks = upload.add({
          request: {
            completeFn,
            uploadFn: (data) => {
             
            },
            callback: (error) => {
              if(stop) {
                expect(!!error).toBeTruthy
                stop = false
                const nextTasks = upload.start(tasks)
                expect(nextTasks).toBeInstanceOf(Array)
                expect(nextTasks.length).toBe(0)
                done()
              }
            }
          },
          file: {
            file
          },
          lifecycle: {
            async uploading({ name }) {
              await new Promise((resolve) => setTimeout(resolve, 1000))
              if(stop) {
                return false
              }
            },
          }
        })

        expect(tasks).toBeInstanceOf(Array)
        expect(tasks).toHaveLength(1)

        const names = upload.deal(...tasks)
        expect(names).toBeInstanceOf(Array)
        expect(names.length).toBe(0)

      })

      test('cancel api success and cancel in uploading', (done) => {

        let tasks
        let cancel = true

        tasks = upload.add({
          request: {
            completeFn,
            uploadFn: (data) => {
              
            },
            callback: (error) => {
              if(cancel) {
                expect(!!error).toBeTruthy
                stop = false
                const nextTasks = upload.start(tasks)
                expect(nextTasks).toBeInstanceOf(Array)
                expect(nextTasks.length).toBe(0)
                done()
              }
            }
          },
          file: {
            file
          },
          lifecycle: {
            uploading({ name }) {
              if(cancel) {
                this.cancel(name)
              }
            },
          }
        })

        expect(tasks).toBeInstanceOf(Array)
        expect(tasks).toHaveLength(1)

        const names = upload.deal(...tasks)
        expect(names).toBeInstanceOf(Array)
        expect(names.length).toBe(1)

      })

      test('cancel api success and cancel in reading', (done) => {

        let tasks

        tasks = upload.add({
          request: {
            completeFn,
            uploadFn: (data) => {
              
            },
            callback: (error) => {
              expect(!!error).toBeTruthy
              const nextTasks = upload.start(tasks)
              expect(nextTasks).toBeInstanceOf(Array)
              expect(nextTasks.length).toBe(0)
              done()
            }
          },
          file: {
            file
          },
          lifecycle: {
            reading({ name }) {
              this.cancel(name)
            },
          }
        })

        expect(tasks).toBeInstanceOf(Array)
        expect(tasks).toHaveLength(1)

        const names = upload.deal(...tasks)
        expect(names).toBeInstanceOf(Array)
        expect(names.length).toBe(1)

      })

      test('cancel api success and cancel in beforeRead', (done) => {

        let tasks

        tasks = upload.add({
          request: {
            completeFn,
            uploadFn: (data) => {
              
            },
            callback: (error) => {
              expect(!!error).toBeTruthy
              const nextTasks = upload.start(tasks)
              expect(nextTasks).toBeInstanceOf(Array)
              expect(nextTasks.length).toBe(0)
              done()
            }
          },
          file: {
            file
          },
          lifecycle: {
            beforeRead({ name }) {
              this.cancel(name)
            },
          }
        })

        expect(tasks).toBeInstanceOf(Array)
        expect(tasks).toHaveLength(1)

        const names = upload.deal(...tasks)
        expect(names).toBeInstanceOf(Array)
        expect(names.length).toBe(1)

      })

      test('cancel api success and cancel in beforeCheck', (done) => {

        let tasks

        tasks = upload.add({
          request: {
            completeFn,
            uploadFn: (data) => {
              
            },
            callback: (error) => {
              expect(!!error).toBeTruthy
              const nextTasks = upload.start(tasks)
              expect(nextTasks).toBeInstanceOf(Array)
              expect(nextTasks.length).toBe(0)
              done()
            }
          },
          file: {
            file
          },
          lifecycle: {
            beforeCheck({ name }) {
              this.cancel(name)
            },
          }
        })

        expect(tasks).toBeInstanceOf(Array)
        expect(tasks).toHaveLength(1)

        const names = upload.deal(...tasks)
        expect(names).toBeInstanceOf(Array)
        expect(names.length).toBe(1)

      })

      test('cancel api success and cancel in afterCheck', (done) => {

        let tasks

        tasks = upload.add({
          request: {
            completeFn,
            uploadFn: (data) => {
              uploadCount ++
            },
            callback: (error) => {
              expect(!!error).toBeTruthy
              const nextTasks = upload.start(tasks)
              expect(nextTasks).toBeInstanceOf(Array)
              expect(nextTasks.length).toBe(0)
              done()
            }
          },
          file: {
            file
          },
          lifecycle: {
            reading({ name }) {
              this.cancel(name)
            },
          }
        })

        expect(tasks).toBeInstanceOf(Array)
        expect(tasks).toHaveLength(1)

        const names = upload.deal(...tasks)
        expect(names).toBeInstanceOf(Array)
        expect(names.length).toBe(1)

      })

      test('cancel api success and cancel in afterStop and not use', (done) => {

        let tasks
        let stop = true

        tasks = upload.add({
          request: {
            completeFn,
            uploadFn: (data) => {
              
            },
            callback: (error) => {
              if(stop) {
                expect(!!error).toBeTruthy
                stop = false
                const nextTasks = upload.start(tasks)
                expect(nextTasks).toBeInstanceOf(Array)
                expect(nextTasks.length).toBe(1)
              }else {
                expect(!!error).toBeFalsy
                done()
              }
            }
          },
          file: {
            file
          },
          lifecycle: {
            reading({ name }) {
              if(stop) {
                this.stop(name)
              }
            },
            afterStop({ name }) {
              const names = this.cancel(name)
              expect(names).toBeInstanceOf(Array)
              expect(names.length).toBe(0)
            },
          }
        })

        expect(tasks).toBeInstanceOf(Array)
        expect(tasks).toHaveLength(1)

        const names = upload.deal(...tasks)
        expect(names).toBeInstanceOf(Array)
        expect(names.length).toBe(1)

      })

      test('cancel api success and cancel in afterCancel and not use', (done) => {

        let tasks

        tasks = upload.add({
          request: {
            completeFn,
            uploadFn: (data) => {
              
            },
            callback: (error) => {
              expect(!!error).toBeTruthy
              const nextTasks = upload.start(tasks)
              expect(nextTasks).toBeInstanceOf(Array)
              expect(nextTasks.length).toBe(0)
              done()
            }
          },
          file: {
            file
          },
          lifecycle: {
            reading({ name }) {
              this.cancel(name)
            },
            afterCancel({ name }) {
              const names = this.cancel(name)
              expect(names).toBeInstanceOf(Array)
              expect(names.length).toBe(0)
            },
          }
        })

        expect(tasks).toBeInstanceOf(Array)
        expect(tasks).toHaveLength(1)

        const names = upload.deal(...tasks)
        expect(names).toBeInstanceOf(Array)
        expect(names.length).toBe(1)

      })

      test('cancel api success and cancel in beforeComplete', (done) => {

        let tasks

        tasks = upload.add({
          request: {
            completeFn,
            uploadFn: (data) => {
              
            },
            callback: (error) => {
              expect(!!error).toBeTruthy
              const nextTasks = upload.start(tasks)
              expect(nextTasks).toBeInstanceOf(Array)
              expect(nextTasks.length).toBe(0)
              done()
            }
          },
          file: {
            file
          },
          lifecycle: {
            beforeComplete({ name }) {
              const names = this.cancel(name)
              expect(names).toBeInstanceOf(Array)
              expect(names.length).toBe(0)
            },
          }
        })

        expect(tasks).toBeInstanceOf(Array)
        expect(tasks).toHaveLength(1)

        const names = upload.deal(...tasks)
        expect(names).toBeInstanceOf(Array)
        expect(names.length).toBe(1)

      })

      test('cancel api success and cancel in afterComplete', (done) => {

        let tasks

        tasks = upload.add({
          request: {
            completeFn,
            uploadFn: (data) => {
              
            },
            callback: (error) => {
              expect(!!error).toBeTruthy
              const nextTasks = upload.start(tasks)
              expect(nextTasks).toBeInstanceOf(Array)
              expect(nextTasks.length).toBe(0)
              done()
            }
          },
          file: {
            file
          },
          lifecycle: {
            afterComplete({ name }) {
              const names = this.cancel(name)
              expect(names).toBeInstanceOf(Array)
              expect(names.length).toBe(1)
            },
          }
        })

        expect(tasks).toBeInstanceOf(Array)
        expect(tasks).toHaveLength(1)

        const names = upload.deal(...tasks)
        expect(names).toBeInstanceOf(Array)
        expect(names.length).toBe(1)

      })

      test('cancel api success and cancel in retry', (done) => {

        let tasks

        tasks = upload.add({
          request: {
            completeFn,
            uploadFn: (data) => {
              throw new Error()
            },
            callback: (error) => {
              expect(!!error).toBeTruthy
              expect(error.retry).toBeFalsy
              const nextTasks = upload.start(tasks)
              expect(nextTasks).toBeInstanceOf(Array)
              expect(nextTasks.length).toBe(0)
            }
          },
          file: {
            file
          },
          lifecycle: {
            retry({ name }) {
              const names = this.cancel(name)
              expect(names).toBeInstanceOf(Array)
              expect(names.length).toBe(1)
            },
          }
        })

        expect(tasks).toBeInstanceOf(Array)
        expect(tasks).toHaveLength(1)

        const names = upload.deal(...tasks)
        expect(names).toBeInstanceOf(Array)
        expect(names.length).toBe(1)

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

      test('cancelAdd api success', (done) => {

        const tasks = upload.add({
          request: {
            exitDataFn,
            completeFn,
            uploadFn
          },
          file: {
            file
          },
        })

        const cancelResult = upload.cancelAdd(tasks)

        expect(cancelResult).toBeInstanceOf(Array)
        expect(cancelResult).toHaveLength(1)
        expect(cancelResult[0]).toEqual(tasks[0])

        //无法继续上传，需要重新订阅
        const result = upload.deal(tasks)
        expect(result).toBeInstanceOf(Array)
        expect(result.length).toBe(0)

        done()

      })

    })

    describe('cancelAdd api fail test', () => {

      test('cancelAdd api fail because the task is uploading', (done) => {

        let times = 0

        const tasks = upload.upload({
          request: {
            completeFn,
            uploadFn(data) {
              times ++
            },
            exitDataFn,
            callback(error) {
              expect(!!error).toBeFalsy
              expect(times).toBe(totalChunks)
              done()
            }
          },
          file: {
            file
          },
          lifecycle: {
            uploading({ name }) {
              const _result = this.cancelAdd(name)
              expect(_result).toBeInstanceOf(Array)
              expect(_result).toHaveLength(0)
            }
          }
        })   

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

    describe('isSupport api success test', () => {

      test('isSupport api success', () => {

        const result = Upload.isSupport()
        expect(result).toBeTruthy()

      })

    })

    describe('isSupport api fail test', () => {

      test('isSupport api fail because the environment is not support', (done) => {

        let _ArrayBuffer = window.ArrayBuffer
        window.ArrayBuffer = undefined
        const result = Upload.isSupport()
        expect(result).toBeFalsy
        window.ArrayBuffer = _ArrayBuffer
        done()

      })

    })

  })

  describe('getTask api', () => {

    describe('getTask api success test', () => {

      let name

      beforeAll((done) => {
        [ name ] = upload.add({
          request: {
            uploadFn,
            completeFn
          },
          file: {
            file
          }
        })
      })

      test('getTask api success', (done) => {

        const task = upload.getTask(name)
        expect(!!task).toBeTruthy
        done()

      })

      test('getTask api success but the task not found ', (done) => {

        const task = upload.getTask(null)
        expect(!!task).toBeFalsy
        done()

      })

    })

  })

  describe('getOriginFile api', () => {
    
    describe('getOriginFile api success test', () => {

      let name

      beforeAll((done) => {
        [ name ] = upload.add({
          request: {
            uploadFn,
            completeFn
          },
          file: {
            file
          }
        })
      })

      test('getOriginFile api success', (done) => {
        const task = upload.getOriginFile(name)
        expect(!!task).toBeTruthy
        done()
      })

      test('getOriginFile api success but the task not found ', () => {
        const task = upload.getOriginFile(null)
        expect(!!task).toBeFalsy
        done()
      })

    })

  })

  describe('getStatus api', () => {
    
    describe('getStatus api success test', () => {

      test('getStatus api success', (done) => {

        let name
        const expectStatus = (expectValue) => {
          const status = upload.getStatus(name)
          expect(status).toEqual(expectValue)
        }

        [ name ] = upload.add({
          request: {
            uploadFn() {
              expectStatus(ECACHE_STATUS.uploading)
            },
            completeFn() {
              expectStatus(ECACHE_STATUS.uploading)
            },
            exitDataFn() {
              expectStatus(ECACHE_STATUS.uploading)
            },
            callback() {
              expectStatus(ECACHE_STATUS.fulfilled)
              done()
            }
          },
          file: {
            file
          },
          lifecycle: {
            reading({ name }) {
              expectStatus(ECACHE_STATUS.reading)
            },
            beforeRead({ name }) {
              expectStatus(ECACHE_STATUS.waiting)
            },
            beforeCheck({ name }) {
              expectStatus(ECACHE_STATUS.reading)
            },
            afterCheck({ name }) {
              expectStatus(ECACHE_STATUS.reading)
            },
            uploading({ name }) {
              expectStatus(ECACHE_STATUS.uploading)
            },
            beforeComplete({ name }) {
              expectStatus(ECACHE_STATUS.uploading)
            },
            afterComplete({ name }) {
              expectStatus(ECACHE_STATUS.uploading)
            }
          }
        })

        expectStatus(ECACHE_STATUS.pending)

        upload.deal(name)

      })

      test('getStatus api success and in other situation', (done) => {

        let name

        [ name ] = upload.add({
          file: {
            file
          },
          request: {
            uploadFn() {
              throw new Error()
            },
            callback(error) {
              const status = upload.getStatus(name)
              expect(status).toEqual(ECACHE_STATUS.rejected)
              done()
            }
          }
        })

        upload.deal(name)

      })

      test('getStatus api success and stop', (done) => {

        let name

        [ name ] = upload.add({
          file: {
            file
          },
          request: {
            uploadFn() {
              this.stop(name)
            },
            callback(error) {
              const status = upload.getStatus(name)
              expect(status).toEqual(ECACHE_STATUS.stopping)
              done()
            }
          }
        })

        upload.deal(name)

      })

      test('getStatus api success and cancel', (done) => {

        let name

        [ name ] = upload.add({
          file: {
            file
          },
          request: {
            uploadFn() {
              this.cancel(name)
            },
            callback(error) {
              const status = upload.getStatus(name)
              expect(status).toEqual(ECACHE_STATUS.cancel)
              done()
            }
          }
        })

        upload.deal(name)

      })

      test('getStatus api success but the task not found ', () => {

        const status = upload.getStatus(null)
        expect(!!status).toBeFalsy

      })

    })

  })

  describe('watch api', () => {

    describe('watch api success test', () => {

      const expectWatch = (value, property) => {
        expect(value).toBeInstanceOf(Object)
        expect(value).toHaveProperty('progress')
        expect(value.progress).toEqual(property.progress)
        expect(value).toHaveProperty('name')
        expect(value.name).toEqual(property.name)
        expect(value).toHaveProperty('error')
        expect(value.error).toEqual(property.error)
        expect(value).toHaveProperty('status')
        expect(value.status).toEqual(property.status)
        expect(value).toHaveProperty('total')
        expect(value.total).toEqual(property.total)
        expect(value).toHaveProperty('current')
        expect(value.current).toEqual(property.current)
      }

      const progress = (target) => {
        const { progress: { complete, total } } = target
        return parseFloat((complete - 1 / total).toFixed(4))
      }

      test('watch api success', (done) => {

        let reading = 0
        let beforeRead = 0
        let beforeCheck = 0
        let afterCheck = 0
        let uploading = 0
        let beforeComplete = 0
        let afterComplete = 0

        //返回正确的参数
        const tasks = upload.add({
          file: {
            file
          },
          request: {
            uploadFn: (data) => {},
            completeFn,
            callback(error) {
              expect(!!error).toBeFalsy
              expect(beforeRead).toBe(1)
              expect(reading).toBe(totalChunks)
              expect(beforeCheck).toBe(1)
              expect(afterCheck).toBe(1)
              expect(uploading).toBe(totalChunks)
              expect(beforeComplete).toBe(1)
              expect(afterComplete).toBe(1)
              done()
            }
          },
          lifecycle: {
            beforeRead({ name, task }) {
              const [ result ] = upload.watch(name)
              expectWatch(result, {
                progress: 0,
                name,
                error: null,
                status: ECACHE_STATUS.waiting,
                total: 0,
                current: 0
              })
              beforeRead ++
            },
            reading({ name, current, total }) {
              const [ result ] = upload.watch(name)
              expectWatch(result, {
                progress: progress(result),
                name,
                error: null,
                status: ECACHE_STATUS.reading,
                total,
                current: current == 0 ? 0 : current - config.chunkSize
              })
              reading ++
            },
            beforeCheck({ name }) {
              const [ result ] = upload.watch(name)
              expectWatch(result, {
                progress: 100,
                name,
                error: null,
                status: ECACHE_STATUS.reading,
                total: FILE_SIZE,
                current: FILE_SIZE
              })
              beforeCheck ++
            },
            afterCheck({ name }) {
              const [ result ] = upload.watch(name)
              expectWatch(result, {
                progress: 0,
                name,
                error: null,
                status: ECACHE_STATUS.reading,
                total: FILE_SIZE,
                current: 0
              })
              afterCheck ++
            },
            uploading({ name, current, total, complete }) {
              const [ result ] = upload.watch(name)
              expectWatch(result, {
                progress: progress(result),
                name,
                error: null,
                status: ECACHE_STATUS.uploading,
                total: FILE_SIZE,
                current: current == 0 ? 0 : current
              })
              uploading ++
            },
            beforeComplete({ name }) {
              const [ result ] = upload.watch(name)
              expectWatch(result, {
                progress: 100,
                name,
                error: null,
                status: ECACHE_STATUS.uploading,
                total: FILE_SIZE,
                current: FILE_SIZE
              })
              beforeComplete ++
            },
            afterComplete({ name }) {
              const [ result ] = upload.watch(name)
              expectWatch(result, {
                progress: 100,
                name,
                error: null,
                status: ECACHE_STATUS.fulfilled,
                total: FILE_SIZE,
                current: FILE_SIZE
              })
              afterComplete ++
            }
          }
        })

        upload.deal(tasks)

      })

      test('watch api success and stop', (done) => {

        let tasks
        let afterStop = 0

        //返回正确的参数
        [ tasks ] = upload.add({
          file: {
            file
          },
          request: {
            uploadFn: (data) => {
              this.stop(tasks)
            },
            completeFn,
            callback(error) {
              expect(!!error).toBeTruthy
              expect(afterStop).toBe(1)
              done()
            }
          },
          lifecycle: {
            afterStop({ name }) {
              const [ result ] = upload.watch(name)
              expectWatch(result, {
                progress: 0,
                name,
                error: null,
                status: ECACHE_STATUS.reading,
                total: FILE_SIZE,
                current: 0
              })
              afterStop ++
            }
          }
        })

        const names = upload.deal(tasks)
        expect(names).toBeInstanceOf(Array)
        expect(names.length).toBe(1)

      })

      test('watch api success and cancel', (done) => {

        let tasks
        let afterCancel = 0

        //返回正确的参数
        [ tasks ] = upload.add({
          file: {
            file
          },
          request: {
            uploadFn: (data) => {
              this.stop(tasks)
            },
            completeFn,
            callback(error) {
              expect(!!error).toBeTruthy
              expect(afterCancel).toBe(1)
              done()
            }
          },
          lifecycle: {
            afterCancel({ name }) {
              const [ result ] = upload.watch(name)
              expectWatch(result, {
                progress: 0,
                name,
                error: null,
                status: ECACHE_STATUS.reading,
                total: FILE_SIZE,
                current: 0
              })
              afterCancel ++
            }
          }
        })

        const names = upload.deal(tasks)
        expect(names).toBeInstanceOf(Array)
        expect(names.length).toBe(1)

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

    const getUpload = (lifecycle={}) => {
      upload = new Upload({
        lifecycle
      })
    }

    describe('lifecycle success test', () => {

      test('lifecycle success', (done) => {

        let beforeRead = 0
        let reading = 0
        let uploading = 0
        let beforeCheck = 0
        let afterCheck = 0
        let beforeComplete = 0
        let afterComplete = 0

        getUpload({
          beforeRead: ({ name, task }) => {
            beforeRead ++
          },
          reading: ({ name, task, current, total }) => {
            expect(total).toBe(totalChunks)
            const endSize = (reading + 1) * config.chunkSize
            expect(current).toBe(endSize >= FILE_SIZE ? FILE_SIZE : endSize)
            reading ++
          },
          beforeCheck({ name, task }) {
            expect(task.file.md5).toBe(md5)
            beforeCheck ++
          },
          afterCheck({ name, task, isExists }) {
            expect(isExists).toBeFalsy
            afterCheck ++
          },
          uploading({ name, current, total, complete }) {
            expect(current).toBe(uploading)
            expect(total).toBe(totalChunks)
            expect(complete).toEqual(uploading)
            uploading ++
          },
          beforeComplete({ isExists }) {
            expect(isExists).toBeFalsy
            beforeComplete ++
          },
          afterComplete: ({ name, task, success }) => {
            expect(success).toBeTruthy
            afterComplete ++
          }
        })

        const tasks = upload.add({
          file: {
            file
          },
          request: {
            exitDataFn,
            uploadFn,
            completeFn,
            callback(error) {
              expect(!!error).toBeFalsy
              expect(beforeRead).toBe(1)
              expect(reading).toBe(totalChunks)
              expect(uploading).toBe(totalChunks)
              expect(beforeCheck).toBe(1)
              expect(afterCheck).toBe(1)
              expect(beforeComplete).toBe(1)
              expect(afterComplete).toBe(1)
              done()
            }
          }
        })

        const result = upload.deal(tasks)
        expect(result).toBeInstanceOf(Array)
        expect(result.length).toBe(1)

      })

      test('lifecycle success and stop the process the next lifecycle not performance', (done) => {
        let reading = 0

        getUpload({
          reading: ({  }) => {
            uploading ++
            throw new Error()
          },
        })

        const tasks = upload.add({
          file: {
            file
          },
          request: {
            exitDataFn,
            uploadFn,
            completeFn,
            callback(error) {
              expect(!!error).toBeTruthy
              expect(reading).toBe(1)
              done()
            }
          },
          lifecycle: {
            reading() {
              uploading ++
            }
          }
        })

        const result = upload.deal(tasks)
        expect(result).toBeInstanceOf(Array)
        expect(result.length).toBe(1)
      })

    })

  })

  describe('error retry', () => {

    describe('error retry success test', () => {

      let times = 0
      let count = 0

      test('error retry success', (done) => {

        //错误自动重试
        const tasks = upload.add({
          file: {
            file
          },
          request: {
            completeFn,
            uploadFn: (formData) => {
              if(times < 3) {
                times ++
                throw new Error('retry test error')
              }else {
                return true
              }
            },
            callback(error) {
              expect(!!error).toBeFalsy
              expect(count).toBe(3)
              done()
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

        const result = upload.deal(tasks)
        expect(result).toBeInstanceOf(Array)
        expect(result.length).toBe(1)

      })

      test('error retry success and all the upload times all fail', (done) => {

        //错误自动重试
        const tasks = upload.add({
          file: {
            file
          },
          request: {
            completeFn,
            uploadFn: (data) => {
              throw new Error('retry test all fail error')
            },
            callback(error) {
              expect(!!error).toBeTruthy
              done()
            }
          },
          config,
        })

        const result = upload.deal(tasks)
        expect(result).toBeInstanceOf(Array)
        expect(result.length).toBe(1)

      })

      test('error retry success and in retry lifecycle stop the performance', (done) => {

        let count = 0

        //错误自动重试
        const tasks = upload.add({
          file: {
            file
          },
          request: {
            completeFn,
            uploadFn: (data) => {
              if(count == 0) {
                throw new Error('retry test all fail error')
              }
              count ++
            },
            callback(error) {
              expect(!!error).toBeFalsy
              expect(count).toBe(1)
              done()
            }
          },
          lifecycle: {
            retry({ name }) {
              this.stop(name)
              count ++
            }
          },
          config,
        })

        const result = upload.deal(tasks)
        expect(result).toBeInstanceOf(Array)
        expect(result.length).toBe(1)
      })

    })

  })

  describe('install api', () => {

    let ignoreReader = false
    let ignoreSlicer = false
    let readerCount = 0
    let slicerCount = 0
    let slicerIndex = 0
    let readerIgnoreCount = 0
    let slicerIgnoreCount = 0
    let _Upload = Upload

    const reader = (context) => {
      if(!ignoreReader) {
        readerCount ++
      }else {
        readerIgnoreCount ++
      }
    }

    const slicer = (context) => {
      context.on('slicer', (start, end, file, complete) => {
        if(!ignoreSlicer) {
          expect(start).toEqual(slicerIndex * config.chunkSize)
          let _end = slicerIndex * config.chunkSize
          _end = _end >= FILE_SIZE ? FILE_SIZE : _end
          expect(end).toEqual(_end)
          expect(file instanceof ArrayBuffer || file instanceof Blob || typeof file === 'string').toBeTruthy
          expect(typeof complete).toBe('function')
          slicerCount ++
          slicerIndex ++
          if(slicerIndex == times) slicerIndex = 0
        }else {
          slicerIgnoreCount ++
        }
      })
    }

    beforeAll(() => {
      _Upload.install('slicer', slicer)
      _Upload.install('reader', reader)
    })

    afterAll(() => {
      _Upload = undefined
    })

    test('install success', (done) => {

      const upload = new _Upload()
      upload.add({
        file: {
          file,
        },
        request: {
          uploadFn() {

          }
        },
        callback(error) {
          expect(!!error).toBeFalsy
          expect(slicerCount).toBe(times * 2)
          expect(slicerIndex).toBe(0)
          expect(readerCount).toBe(times)
        }
      })

    })

    test('install success and ignore the plugin', (done) => {
      ignoreSlicer = true
      ignoreReader = true
      const upload = new _Upload({
        ignores: ['reader', 'slicer']
      })
      upload.add({
        file: {
          file,
        },
        request: {
          uploadFn() {}
        },
        callback(error) {
          expect(!!error).toBeFalsy
          expect(slicerIgnoreCount).toBe(0)
          expect(readerIgnoreCount).toBe(0)
        }
      })
    })

  })

  describe('upload file without worker api', () => {

    describe('upload file without worker api success test', () => {

      let _Worker = window.Worker
      let upload 

      beforeAll(() => {
        window.Worker = undefined
        upload = new Upload()
      })

      afterAll(() => {
        window.Worker = _Worker
      })

      test('upload file without worker api load file', () => {

        upload.add({
          file: {
            file
          },
          request: {
            uploadFn,
            callback(error) {
              expect(!!error).toBeFalsy
            }
          }
        })

      })

    })

  })

})