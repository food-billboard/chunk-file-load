import { merge, omit } from 'lodash'
import { Upload } from '../src'
import { isSymbol } from '../src/utils/tool'
import { WorkerPool } from '../src/utils'
import { 
  exitDataFn, 
  uploadFn, 
  completeFn, 
  config, 
  callback, 
  FILE_SIZE,
  BASE_SIZE,
  arrayBufferFile,
  base64File,
  file,
  blobFile,
  chunks,
  mime,
  totalChunks,
  getFileMd5,
  emitterCollection,
  dealResultExpect,
  arrayBufferChunks
} from './constants'

const md5 = getFileMd5()

let upload = new Upload()

describe('upload chunk test', () => {

  describe('upload api', () => {

    describe('upload api success test', () => {
  
      test('upload api success', (done) => {
  
        const { collection, emit } = emitterCollection()
        
        let beforeRead = 0,
            reading = 0,
            beforeCheck = 0,
            afterCheck = 0,
            uploading = 0,
            beforeComplete = 0,
            afterComplete = 0,
            result
  
        result = upload.upload({
          config,
          request: {
            exitDataFn,
            uploadFn,
            completeFn,
            callback: (err) => {
              try {
                emit()
                const _times = Math.ceil(FILE_SIZE / config.chunkSize)
  
                expect(beforeRead).toBe(1)
                expect(reading).toBe(_times)
                expect(beforeCheck).toBe(1)
                expect(afterCheck).toBe(1)
                expect(uploading).toBe(_times)
                expect(beforeComplete).toBe(1)
                expect(afterComplete).toBe(1)
  
                if(err) {
                  done(err)
                }else {
                  done()
                }
              }catch(err) {
                done(err)
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
            reading({ name, task, current, total }) {
              const _reading = ++ reading
              collection(() => {
                const _current = _reading * config.chunkSize
                expect(current).toBe(_reading == totalChunks ? FILE_SIZE : _current)
                expect(total).toBe(FILE_SIZE)
                // expect(end).toBe(reading * config.chunkSize > FILE_SIZE ? FILE_SIZE : reading * config.chunkSize)
              })
            },
            beforeCheck({ name, task }) {
              beforeCheck ++
            },
            afterCheck({ name, task, isExists }) {
              afterCheck ++
              collection(() => {
                expect(isExists).toBe(false)
              })
            },
            uploading({ name, task, current, total, complete }) {
              const expectFn = (uploading) => {
                expect(current).toBe(uploading)
                expect(total).toBe(totalChunks)
                expect(complete).toBe(uploading)
              }
              uploading ++
              collection(expectFn.bind(this, uploading))
            },
            beforeComplete({ name, task, isExists }) {
              beforeComplete ++
              collection(() => {
                expect(isExists).toBe(false)
              })
            },
            afterComplete({ name, task, success }) {
              afterComplete ++
              collection(() => {
                expect(success).toBe(true)
              })
            }
          }
        })
  
        expect(result).toBeInstanceOf(Array)
      
        result.forEach(name => expect(isSymbol(name)).toBeTruthy())
  
      })
  
    })
  
  })
  
  describe('add api', () => {
  
    describe('add api success test', () => {
  
      it('add api success', () => {
  
        const tasks = upload.add({
          config,
          request: {
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
      request: {
        exitDataFn,
        uploadFn,
        completeFn,
      },
      config
    }
  
    const add = (config={}) => {
      [tasks] = upload.add(merge({}, _config, config))
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
        const result = upload.deal(tasks)
        dealResultExpect(result)
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
        const result = upload.deal(tasks)
        dealResultExpect(result)
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
        const result = upload.deal(tasks)
        dealResultExpect(result)
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
        const result = upload.deal(tasks)
        dealResultExpect(result)
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
        const result = upload.deal(tasks)
        dealResultExpect(result)
      })
  
      test('deal api success but the exitFn return the not verify data and all the chunks need upload', (done) => {
        let times = 0
  
        add({
          file: {
            file,
          },
          request: {
            exitDataFn: () => {
              return null
            },
            uploadFn: (data) => {
              times ++
            },
            callback: (error) => {
              try {
                if(error) {
                  done(error)
                }else {
                  expect(times).toBe(Math.ceil(FILE_SIZE / config.chunkSize))
                  done()
                }
              }catch(err) {
                done(err)
              }
            }
          }
        })
  
        const result = upload.deal(tasks)
        dealResultExpect(result)
  
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
              try{
                if(error) {
                  done(error)
                }else {
                  expect(times).toBe(Math.ceil(FILE_SIZE / config.chunkSize))
                  done()
                }
              }catch(err) {
                done(err)
              }
            }
          }
        }))
  
        const result =upload.deal(tasks)
        dealResultExpect(result)
      })
  
      test('deal api success and exitFn return the number list uploaded chunk', (done) => {
        let times = 0
  
        add({
          config,
          file: {
            file
          },
          request: {
            exitDataFn: () => {
              return {
                data: new Array(totalChunks - 1).fill(0).map((_, index) => index + 1)
              }
            },
            uploadFn: (data) => {
              times ++
            },
            callback: (error) => {
              try {
                if(error) {
                  done(error)
                }else {
                  expect(times).toBe(totalChunks - 1)
                  done()
                }
              }catch(err) {
                done(err)
              }
            }
          }
        })
  
        const result = upload.deal(tasks)
        dealResultExpect(result)
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
              try {
                if(error) {
                  done(error)
                }else {
                  expect(times).toBe(Math.ceil(FILE_SIZE / config.chunkSize) - 1)
                  done()
                }
              }catch(err) {
                done(err)
              }
            }
          }
        }))
  
        const result = upload.deal(tasks)
        dealResultExpect(result)
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
              try {
                if(error) {
                  done(error)
                }else {
                  expect(times).toBe(Math.ceil(FILE_SIZE / config.chunkSize) - 1)
                  done()
                }
              }catch(err) {
                done(err)
              }
            }
          }
        }))
  
        const result = upload.deal(tasks)
        dealResultExpect(result)
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
              try {
                if(error) {
                  done(error)
                }else {
                  expect(times).toBe(Math.ceil(FILE_SIZE / config.chunkSize) - 1)
                  done()
                }
              }catch(err) {
                done(err)
              }
            }
          }
        }))
  
        const result = upload.deal(tasks)
        dealResultExpect(result)
      })
  
      // test('deal api success and uploadFn no response', async () => {
  
      // })
  
    })
  
    describe('deal api fail test', () => {
  
      test('deal api fail because the task name is not found', () => {
        const result = upload.deal(null)
        expect(result.length).toBe(0)
      })
  
      test('deal api fail because the task not the uploadFn', (done) => {
        let times = 0
        const names = upload.add({
          config,
          file: {
            file
          },
          request: {
            callback: (error, value) => {
              try {
                expect(!!error).toBe(true)
                expect(times).toBe(0)
                done()
              }catch(err) {
                done(err)
              }
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
        const [tasks] = upload.add({
          config,
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
  
        const result = upload.start(tasks)
        dealResultExpect(result)
      })
  
    })
  
  })
  
  describe('stop api', () => {
  
    describe('stop api success test', () => {
  
      const total = Math.ceil(FILE_SIZE / config.chunkSize)
      let times = Array.from({ length: total }, (_, index) => index)
  
      test('stop api success and with api', (done) => {
  
        let count = 0,
            tasks,
            stop = true;
  
        [tasks] = upload.add({
          config,
          request: {
            completeFn,
            exitDataFn: () => {
              if(stop) return false 
              return {
                data: config.chunkSize
              }
            },
            uploadFn: (data) => {
              count ++
            },
            callback: (error) => {
              try {
                if(stop) {
                  expect(!!error).toBeTruthy()
                  stop = false
                  const result = upload.start(tasks)
                  expect(result).toBeInstanceOf(Array)
                  expect(result.length).toBe(1)
                }else {
                  expect(!!error).toBeFalsy()
                  expect(count).toEqual(times.length)
                  done()
                }
              }catch(err) {
                done(err)
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
  
        const result = upload.deal(tasks)
        dealResultExpect(result)
  
      })
  
      test('stop api success and stop in uploading', (done) => {
  
        let count = 0,
            reading = 0,
            stop = true,
            tasks;
  
        [tasks] = upload.add({
          config,
          request: {
            completeFn,
            uploadFn: (data) => {
              count ++
            },
            callback: (error) => {
              try {
                if(stop) {
                  expect(!!error).toBeTruthy()
                  stop = false
                  const nextTasks = upload.start(tasks)
                  expect(nextTasks).toBeInstanceOf(Array)
                  expect(nextTasks.length).toBe(1)
                }else {
                  expect(!!error).toBeFalsy()
                  expect(count).toEqual(times.length + 1)
                  expect(reading).toBe(times.length)
                  done()
                }
              }catch(err) {
                done(err)
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
  
        const result = upload.deal(tasks)
        dealResultExpect(result)
  
      })
  
      test('stop api success and stop in reading', (done) => {
  
        let count = 0,
            tasks,
            stop = true;
  
        //在emit中的stop中能找到当前指定队列名称任务
        [tasks] = upload.add({
          config,
          request: {
            completeFn,
            uploadFn: (data) => {
              
            },
            callback: (error) => {
              try {
                if(stop) {
                  expect(!!error).toBeTruthy()
                  stop = false
                  const nextTasks = upload.start(tasks)
                  dealResultExpect(nextTasks)
                }else {
                  expect(!!error).toBeFalsy()
                  expect(count).toEqual(times.length + 1)
                  done()
                }
              }catch(err) {
                done(err)
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
  
        const result = upload.deal(tasks)
        dealResultExpect(result)
  
      })
  
      test('stop api success and stop in beforeRead', (done) => {
  
        let count = 0,
            tasks,
            stop = true;
  
        [tasks] = upload.add({
          config,
          request: {
            completeFn,
            uploadFn: (data) => {
              
            },
            callback: (error) => {
              try {
                if(stop) {
                  expect(!!error).toBeTruthy()
                  stop = false
                  const nextTasks = upload.start(tasks)
                  expect(nextTasks).toBeInstanceOf(Array)
                  expect(nextTasks.length).toBe(1)
                }else {
                  expect(!!error).toBeFalsy()
                  expect(count).toEqual(2)
                  done()
                }
              }catch(err) {
                done(err)
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
  
        const result = upload.deal(tasks)
        dealResultExpect(result)
      })
  
      test('stop api success and stop in beforeCheck', (done) => {
  
        let beforeCheck = 0,
            reading = 0,
            tasks,
            stop = true;
  
        [tasks] = upload.add({
          config,
          request: {
            completeFn,
            uploadFn: (data) => {
              
            },
            callback: (error) => {
              try {
                if(stop) {
                  expect(!!error).toBeTruthy()
                  stop = false
                  const nextTasks = upload.start(tasks)
                  expect(nextTasks).toBeInstanceOf(Array)
                  expect(nextTasks.length).toBe(1)
                }else {
                  expect(!!error).toBeFalsy()
                  expect(beforeCheck).toEqual(2)
                  expect(reading).toBe(times.length)
                  done()
                }
              }catch(err) {
                done(err)
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
  
        const result = upload.deal(tasks)
        dealResultExpect(result)
  
      })
  
      test('stop api success and stop in afterCheck', (done) => {
  
        let uploadCount = 0,
            reading = 0,
            tasks,
            stop = true;
  
        [tasks] = upload.add({
          config,
          request: {
            completeFn,
            uploadFn: (data) => {
              uploadCount ++
            },
            callback: (error) => {
              try {
                if(stop) {
                  expect(!!error).toBeTruthy()
                  stop = false
                  upload.start(tasks)
                }else {
                  expect(!!error).toBeFalsy()
                  expect(uploadCount).toEqual(times.length)
                  expect(reading).toBe(2)
                  done()
                }
              }catch(err) {
                done(err)
              }
            }
          },
          file: {
            file
          },
          lifecycle: {
            afterCheck({ name }) {
              if(stop) {
                this.stop(name)
              }
              reading ++
            },
          }
        })
  
        const result = upload.deal(tasks)
        dealResultExpect(result)
      })
  
      test('stop api success and stop in afterStop and not use', (done) => {
  
        const { collection, emit } = emitterCollection()
  
        let count = 0,
            tasks,
            stop = true;
  
        [tasks] = upload.add({
          config,
          request: {
            completeFn,
            uploadFn: (data) => {
              
            },
            callback: (error) => {
              try {
                if(stop) {
                  emit()
                  expect(!!error).toBeTruthy()
                  stop = false
                  const nextTasks = upload.start(tasks)
                  expect(nextTasks).toBeInstanceOf(Array)
                  expect(nextTasks.length).toBe(1)
                }else {
                  expect(count).toBe(1)
                  expect(!!error).toBeFalsy()
                  done()
                }
              }catch(err) {
                done(err)
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
                collection(() => {
                  expect(names).toBeInstanceOf(Array)
                  expect(names.length).toBe(0)
                })
              }
              count ++
            },
          }
        })
  
        const result = upload.deal(tasks)
        dealResultExpect(result)
  
      })
  
      test('stop api success and stop in afterCancel and not use', (done) => {
  
        const { collection, emit } = emitterCollection()
        let count = 0,
            tasks,
            stop = true,
            reading = 0;
  
        [tasks] = upload.add({
          config: omit(config, ['retry']),
          request: {
            completeFn,
            uploadFn: (data) => {
              
            },
            callback: (error) => {
              try {
                if(stop) {
                  emit()
                  expect(!!error).toBeTruthy()
                  stop = false
                  const nextTasks = upload.start(tasks)
                  expect(nextTasks).toBeInstanceOf(Array)
                  expect(nextTasks.length).toBe(0)
                  expect(reading).toBe(1)
                  done()
                }else {
                  expect(count).toBe(1)
                  expect(reading).toBe(1)
                  expect(!!error).toBeTruthy
                  done()
                }
              }catch(err) {
                done(err)
              }
            }
          },
          file: {
            file
          },
          lifecycle: {
            reading({ name }) {
              if(stop) {
                this.cancel(name)
              }
              reading ++
            },
            afterCancel({ name }) {
              if(stop) {
                const names = this.stop(name)
                collection(() => {
                  expect(names).toBeInstanceOf(Array)
                  expect(names.length).toBe(0)
                })
              }
              count ++
            },
          }
        })
  
        const result = upload.deal(tasks)
        dealResultExpect(result)
  
      })
  
      test('stop api success and stop in beforeComplete', (done) => {
        const { collection, emit } = emitterCollection()
        let count = 0,
            tasks,
            stop = true,
            reading = 0,
            uploading = 0;
  
        [tasks] = upload.add({
          config,
          request: {
            completeFn,
            uploadFn: (data) => {
              
            },
            callback: (error) => {
              try {
                if(stop) {
                  emit()
                  expect(!!error).toBeTruthy()
                  stop = false
                  const nextTasks = upload.start(tasks)
                  expect(nextTasks).toBeInstanceOf(Array)
                  expect(nextTasks.length).toBe(1)
                  expect(reading).toBe(totalChunks)
                  expect(uploading).toBe(totalChunks)
                }else {
                  expect(count).toBe(2)
                  expect(!!error).toBeFalsy()
                  done()
                }
              }catch(err) {
                done(err)
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
                collection(() => {
                  expect(names).toBeInstanceOf(Array)
                  expect(names.length).toBe(1)
                })
              }
              count ++
            },
          }
        })
  
        const result = upload.deal(tasks)
        dealResultExpect(result)
  
      })
  
      test('stop api success and stop in retry and no use', (done) => {
        const { collection, emit } = emitterCollection()
        let count = 0,
            tasks,
            stop = true,
            uploading = 0;
  
        [tasks] = upload.add({
          config,
          request: {
            completeFn,
            uploadFn: (data) => {
              if(stop) {
                throw new Error()
              }
            },
            callback(error) {
              try {
                if(stop) {
                  emit()
                  expect(!!error).toBeTruthy()
                  expect(error.retry).toBeFalsy()
                  stop = false
                  const nextTasks = upload.start(tasks)
                  expect(nextTasks).toBeInstanceOf(Array)
                  expect(nextTasks.length).toBe(0)
                  done()
                }else {
                  expect(count).toBe(1)
                  expect(!!error).toBeFalsy()
                  expect(uploading).toBe(times.length)
                  done()
                }
              }catch(err) {
                done(err)
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
                collection(() => {
                  expect(names).toBeInstanceOf(Array)
                  expect(names.length).toBe(0)
                })
              }
              count ++
            },
          }
        })
  
        const result = upload.deal(tasks)
        dealResultExpect(result)
  
      })
  
      test('stop api success and with error and can not start', (done) => {
  
        let count = 0,
            tasks;
  
        [tasks] = upload.add({
          config: omit(config, ['retry']),
          request: {
            completeFn,
            uploadFn: (data) => {
              count ++
            },
            callback: (error) => {
              try {
                expect(!!error).toBeTruthy()
                stop = false
                const result = upload.start(tasks)
                expect(result.length).toBe(0)
                done()
              }catch(err) {
                done(err)
              }
            }
          },
          file: {
            file
          },
          lifecycle: {
            uploading({ name }) {
              throw new Error()
            },
          }
        })
  
        const result = upload.deal(tasks)
        dealResultExpect(result)
  
      })
  
      test('stop api success and with boolean', (done) => {
  
        let count = 0,
            tasks,
            stop = true;
  
        //在emit中的stop中能找到当前指定队列名称任务
        [tasks] = upload.add({
          config: omit(config, ['retry']),
          request: {
            completeFn,
            uploadFn: (data) => {
              count ++
            },
            callback: (error) => {
              try {
                if(stop) {
                  expect(!!error).toBeTruthy()
                  stop = false
                  const result = upload.start(tasks)
                  dealResultExpect(result)
                }else {
                  expect(!!error).toBeFalsy()
                  expect(count).toEqual(totalChunks + 1)
                  done()
                }
              }catch(err) {
                done(err)
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
  
        const result = upload.deal(tasks)
        dealResultExpect(result)
  
      })
  
      test('stop api success and with promise', (done) => {
  
        let count = 0,
            tasks,
            stop = true;
  
        [tasks] = upload.add({
          config: omit(config, ['retry']),
          request: {
            completeFn,
            uploadFn: (data) => {
              count ++
            },
            callback: (error) => {
              try {
                if(stop) {
                  expect(!!error).toBeTruthy()
                  stop = false
                  const result = upload.start(tasks)
                  dealResultExpect(result)
                }else {
                  expect(!!error).toBeFalsy()
                  expect(count).toEqual(totalChunks + 1)
                  done()
                }
              }catch(err) {
                done(err)
              }
            }
          },
          file: {
            file
          },
          lifecycle: {
            async uploading({ name }) {
              if(stop) {
                await new Promise((resolve) => setTimeout(resolve, 1000))
                return false
              }
            },
          }
        })
  
        const result = upload.deal(tasks)
        dealResultExpect(result)
  
      })
  
    })
  
    describe('stop api fail test', () => {
  
      test('stop api fail because the task name is not found', () => {
  
        const result = upload.stop(null)
  
        //断言测试
        expect(result).toBeInstanceOf(Array)
        expect(result).toHaveLength(0)
  
      })
  
      test('stop api fail and stop in afterComplete and can not stop the task', (done) => {
        const { collection, emit } = emitterCollection()
        let count = 0,
            tasks,
            stop = true,
            reading = 0,
            uploading = 0;
  
        [tasks] = upload.add({
          config,
          request: {
            completeFn,
            uploadFn: (data) => {
              
            },
            callback: (error) => {
              try {
                if(stop) {
                  emit()
                  expect(!!error).toBeFalsy()
                  stop = false
                  const nextTasks = upload.start(tasks)
                  expect(nextTasks).toBeInstanceOf(Array)
                  expect(nextTasks.length).toBe(0)
                  expect(reading).toBe(totalChunks)
                  expect(uploading).toBe(totalChunks)
                  done()
                }else {
                  expect(count).toBe(2)
                  expect(!!error).toBeFalsy()
                  done()
                }
              }catch(err) {
                done(err)
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
                collection(() => {
                  expect(names).toBeInstanceOf(Array)
                  expect(names.length).toBe(0)
                })
              }
              count ++
            },
          }
        })
  
        const result = upload.deal(tasks)
        dealResultExpect(result)
  
      })
  
    })
  
  })
  
  describe('cancel api', () => {
  
    describe('cancel api success test', () => {
  
      test('cancel api success with api', async (done) => {
  
        let tasks
        const { collection, emit } = emitterCollection();
  
        [tasks] = upload.add({
          config,
          request: {
            exitDataFn,
            completeFn,
            uploadFn,
            callback: (error) => {
              try {
                emit()
                expect(!!error).toBeTruthy()
                const result = upload.start(tasks)
                expect(result).toBeInstanceOf(Array)
                expect(result.length).toBe(0)
                done()
              }catch(err) {
                done(err)
              }
            }
          },
          file: {
            file,
          },
          lifecycle: {
            uploading({ name }) {
              const _result = this.cancel(name)
              collection(() => {
                expect(_result).toBeInstanceOf(Array)
                expect(_result).toHaveLength(1)
                expect(_result[0]).toEqual(name)
              })
            }
          }
        })
  
        const result = upload.deal(tasks)
        dealResultExpect(result)
  
      })
  
      test('cancel api success with error', (done) => {
  
        let tasks;
  
        [tasks] = upload.add({
          config,
          request: {
            exitDataFn,
            completeFn,
            uploadFn,
            callback: (error) => {
              try {
                expect(!!error).toBeTruthy()
                const result = upload.start(tasks)
                expect(result).toBeInstanceOf(Array)
                expect(result.length).toBe(0)
                done()
              }catch(err) {
                done(err)
              }
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
  
        const result = upload.deal(tasks)
        dealResultExpect(result)
  
      })
  
  
      test('cancel api success and cancel in uploading', (done) => {
  
        let tasks
        let cancel = true
  
        tasks = upload.add({
          config,
          request: {
            completeFn,
            uploadFn: (data) => {
              
            },
            callback: (error) => {
              try {
                if(cancel) {
                  expect(!!error).toBeTruthy()
                  stop = false
                  const nextTasks = upload.start(tasks)
                  expect(nextTasks).toBeInstanceOf(Array)
                  expect(nextTasks.length).toBe(0)
                  done()
                }
              }catch(err) {
                done(err)
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
          config,
          request: {
            completeFn,
            uploadFn: (data) => {
              
            },
            callback: (error) => {
              try {
                expect(!!error).toBeTruthy()
                const nextTasks = upload.start(tasks)
                expect(nextTasks).toBeInstanceOf(Array)
                expect(nextTasks.length).toBe(0)
                done()
              }catch(err) {
                done(err)
              }
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
          config,
          request: {
            completeFn,
            uploadFn: (data) => {
              
            },
            callback: (error) => {
              try {
                expect(!!error).toBeTruthy()
                const nextTasks = upload.start(tasks)
                expect(nextTasks).toBeInstanceOf(Array)
                expect(nextTasks.length).toBe(0)
                done()
              }catch(err) {
                done(err)
              }
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
          config,
          request: {
            completeFn,
            uploadFn: (data) => {
              
            },
            callback: (error) => {
              try {
                expect(!!error).toBeTruthy()
                const nextTasks = upload.start(tasks)
                expect(nextTasks).toBeInstanceOf(Array)
                expect(nextTasks.length).toBe(0)
                done()
              }catch(err) {
                done(err)
              }
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
          config,
          request: {
            completeFn,
            uploadFn: (data) => {
              uploadCount ++
            },
            callback: (error) => {
              try {
                expect(!!error).toBeTruthy()
                const nextTasks = upload.start(tasks)
                expect(nextTasks).toBeInstanceOf(Array)
                expect(nextTasks.length).toBe(0)
                done()
              }catch(err) {
                done(err)
              }
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
        const { collection, emit } = emitterCollection()
  
        tasks = upload.add({
          config,
          request: {
            completeFn,
            uploadFn: (data) => {
              
            },
            callback: (error) => {
              try {
                if(stop) {
                  emit()
                  expect(!!error).toBeTruthy()
                  stop = false
                  const nextTasks = upload.start(...tasks)
                  expect(nextTasks).toBeInstanceOf(Array)
                  expect(nextTasks.length).toBe(1)
                }else {
                  expect(!!error).toBeFalsy()
                  done()
                }
              }catch(err) {
                done(err)
              }
            },
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
              collection(() => {
                expect(names).toBeInstanceOf(Array)
                expect(names.length).toBe(0)
              })
            },
          }
        })
  
        expect(tasks).toBeInstanceOf(Array)
        expect(tasks).toHaveLength(1)
  
        const names = upload.deal(...tasks)
        dealResultExpect(names)
  
      })
  
      test('cancel api success and cancel in afterCancel and not use', (done) => {
  
        let tasks
        const { collection, emit } = emitterCollection()
  
        tasks = upload.add({
          config,
          request: {
            completeFn,
            uploadFn: (data) => {
              
            },
            callback: (error) => {
              try {
                emit()
                expect(!!error).toBeTruthy()
                const nextTasks = upload.start(tasks)
                expect(nextTasks).toBeInstanceOf(Array)
                expect(nextTasks.length).toBe(0)
                done()
              }catch(err) {
                done(err)
              }
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
              collection(() => {
                expect(names).toBeInstanceOf(Array)
                expect(names.length).toBe(0)
              })
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
        const { collection, emit } = emitterCollection();
  
        tasks = upload.add({
          config,
          request: {
            completeFn,
            uploadFn: (data) => {
              
            },
            callback: (error) => {
              try {
                emit()
                expect(!!error).toBeTruthy()
                const nextTasks = upload.start(...tasks)
                expect(nextTasks).toBeInstanceOf(Array)
                expect(nextTasks.length).toBe(0)
                done()
              }catch(err) {
                done(err)
              }
            }
          },
          file: {
            file
          },
          lifecycle: {
            beforeComplete({ name }) {
              const names = this.cancel(name)
              collection(() => {
                expect(names).toBeInstanceOf(Array)
                expect(names.length).toBe(1)
              })
            },
          }
        })
  
        expect(tasks).toBeInstanceOf(Array)
        expect(tasks).toHaveLength(1)
  
        const names = upload.deal(...tasks)
        dealResultExpect(names)
  
      })
  
      test('cancel api success and cancel in retry and no use', (done) => {
  
        let tasks
        const { collection, emit } = emitterCollection();
  
        tasks = upload.add({
          config: omit(config, ['retry']),
          request: {
            completeFn,
            uploadFn: (data) => {
              throw new Error()
            },
            callback: (error) => {
              try{
                emit()
                expect(!!error).toBeTruthy()
                expect(error.retry).toBeFalsy()
                const nextTasks = upload.start(...tasks)
                expect(nextTasks).toBeInstanceOf(Array)
                expect(nextTasks.length).toBe(0)
                done()
              }catch(err) {
                done(err)
              }
            }
          },
          file: {
            file
          },
          lifecycle: {
            retry({ name }) {
              const names = this.cancel(name)
              collection(() => {
                expect(names).toBeInstanceOf(Array)
                expect(names.length).toBe(0)
              })
            },
          }
        })
  
        dealResultExpect(tasks)
  
        const names = upload.deal(...tasks)
        dealResultExpect(names)
  
      })
  
    })
  
    describe('cancel api fail test', () => {
  
      test('cancel api fail because the tak name is not found', () => {
        //返回指定正确的队列名称
        
        const result = upload.cancel(null)
        
        expect(result).toBeInstanceOf(Array)
        expect(result).toHaveLength(0)
  
      })
  
      test('cancel api fail and cancel in afterComplete and not cancel the task', (done) => {
  
        let tasks
        const { collection, emit } = emitterCollection()
  
        tasks = upload.add({
          config,
          request: {
            completeFn,
            uploadFn: (data) => {
              
            },
            callback: (error) => {
              try {
                emit()
                expect(!!error).toBeFalsy()
                const nextTasks = upload.start(...tasks)
                expect(nextTasks).toBeInstanceOf(Array)
                expect(nextTasks.length).toBe(0)
                done()
              }catch(err) {
                done(err)
              }
            }
          },
          file: {
            file
          },
          lifecycle: {
            afterComplete({ name }) {
              const names = this.cancel(name)
              collection(() => {
                expect(names).toBeInstanceOf(Array)
                expect(names.length).toBe(0)
              })
            },
          }
        })
  
        expect(tasks).toBeInstanceOf(Array)
        expect(tasks).toHaveLength(1)
  
        const names = upload.deal(...tasks)
        dealResultExpect(names)
  
      })
  
    })
  
  })
  
  describe('cancelAdd api', () => {
  
    describe('cancelAdd api success test', () => {
  
      test('cancelAdd api success', (done) => {
  
        const [tasks] = upload.add({
          config,
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
        expect(cancelResult[0]).toEqual(tasks)
  
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
        const { collection, emit } = emitterCollection()
  
        const tasks = upload.upload({
          config,
          request: {
            completeFn,
            uploadFn(data) {
              times ++
            },
            exitDataFn,
            callback(error) {
              try {
                emit()
                expect(!!error).toBeFalsy()
                expect(times).toBe(totalChunks)
                done()
              }catch(err) {
                done(err)
              }
            }
          },
          file: {
            file
          },
          lifecycle: {
            uploading({ name }) {
              const _result = this.cancelAdd(name)
              collection(() => {
                expect(_result).toBeInstanceOf(Array)
                expect(_result).toHaveLength(0)
              })
            }
          }
        })   
  
        dealResultExpect(tasks)
  
      })
  
      test('cancelAdd api fail because the task name is not found', () => {
        //在之后能再次执行任务
  
        const result = upload.cancelAdd(null)
  
        expect(result).toBeInstanceOf(Array)
        expect(result).toHaveLength(0)
  
      })
  
    })
  
  })

  describe('upload file without worker api', () => {

    describe('upload file without worker api success test', () => {

      // let _Worker = window.Worker
      // let upload 

      // beforeAll(() => {
      //   window.Worker = undefined
      //   upload = new Upload()
      // })

      // afterAll(() => {
      //   window.Worker = _Worker
      // })

      test('upload file without worker api load file', (done) => {

        const [tasks] = upload.add({
          config,
          file: {
            file
          },
          request: {
            uploadFn,
            callback: callback(done)
          }
        })

        const result = upload.deal(tasks)
        dealResultExpect(result)

      })

    })

  })

  describe('upload file instance test', () => {

    const instanceTest = (context) => expect(context).toBeInstanceOf(Upload)

    test('upload file instance success test', (done) => {

      upload.upload({
        file: {
          file
        },
        request: {
          exitDataFn() {
            instanceTest(this)
          },
          uploadFn() {
            instanceTest(this)
          },
          completeFn() {
            instanceTest(this)
          },
          callback() {
            instanceTest(this)
            done()
          }
        },
        lifecycle: {
          beforeRead() {
            instanceTest(this)
          },
          reading() {
            instanceTest(this)
          },
          beforeCheck() {
            instanceTest(this)
          },
          afterCheck() {
            instanceTest(this)
          },
          uploading() {
            instanceTest(this)
          },
          beforeComplete() {
            instanceTest(this)
          },
          afterComplete() {
            instanceTest(this)
          }
        }
      })

    })

    test('upload file instance stop api success test', (done) => {

      upload.upload({
        file: {
          file
        },
        request: {
          uploadFn() {
            
          },
          callback() {
            instanceTest(this)
            done()
          }
        },
        lifecycle: {
          beforeRead({ name }) {
            this.stop(name)
          },
          afterStop() {
            instanceTest(this)
          }
        }
      })

    })

    test('upload file instance cancel api success test', (done) => {

      upload.upload({
        file: {
          file
        },
        request: {
          uploadFn() {
            
          },
          callback() {
            instanceTest(this)
            done()
          }
        },
        lifecycle: {
          beforeRead({ name }) {
            this.cancel(name)
          },
          afterCancel() {
            instanceTest(this)
          }
        }
      })

    })

    test('upload file instance retry success test', (done) => {

      upload.upload({
        config,
        file: {
          file
        },
        request: {
          uploadFn() {
            
          },
          callback() {
            instanceTest(this)
            done()
          }
        },
        lifecycle: {
          beforeRead({ name }) {
            this.cancel(name)
          },
          retry() {
            instanceTest(this)
          }
        }
      })

    })

  })

  describe(`uploading api`, () => {

    test(`upload the chunk complete task`, (done) => {
      const { collection, emit } = emitterCollection()

      const bufferFile = arrayBufferFile.slice(0, arrayBufferFile.byteLength - 1000)
      const size = bufferFile.byteLength
      const file = new File([bufferFile], mime)
      const totalChunks = Math.ceil(size / config.chunkSize)
      const arrayBufferChunks = new Array(totalChunks).fill(0).map((_, index) => {
        const start = (index) * config.chunkSize
        const end = (index + 1) * config.chunkSize
        return bufferFile.slice(start, end > size ? size : end)
      })
        
      let beforeRead = 0,
          reading = 0,
          beforeCheck = 0,
          afterCheck = 0,
          uploading = 0,
          beforeComplete = 0,
          afterComplete = 0,
          result

      result = upload.uploading({
        config,
        request: {
          exitDataFn,
          uploadFn: (data) => {
            const index = data.get ? data.get("index") : data.index 
            const nextOffset = (+index + 1) * BASE_SIZE
            return {
              data: nextOffset > size ? size : nextOffset
            } 
          },
          completeFn,
          callback: (err) => {
            try {
              emit()
              const _times = Math.ceil(FILE_SIZE / config.chunkSize)

              expect(beforeRead).toBe(1)
              expect(reading).toBe(_times)
              expect(beforeCheck).toBe(1)
              expect(afterCheck).toBe(1)
              expect(uploading).toBe(_times)
              expect(beforeComplete).toBe(1)
              expect(afterComplete).toBe(1)

              if(err) {
                done(err)
              }else {
                done()
              }
            }catch(err) {
              done(err)
            }
          },
        },
        file: {
          file,
          chunks: arrayBufferChunks,
          mime
        },
        lifecycle: {
          beforeRead() {
            beforeRead ++
          },
          reading({ current, total }) {
            const _reading = ++ reading
            collection(() => {
              const _current = _reading * config.chunkSize
              expect(current).toBe(_reading == totalChunks ? size : _current)
              expect(total === size).toBe(true)
            })
          },
          beforeCheck({ task }) {
            beforeCheck ++
            collection(() => {
              expect(size === FILE_SIZE).toBe(false)
              expect(task.file.size === size).toBe(true)
            })
          },
          afterCheck({ name, task, isExists }) {
            afterCheck ++
            collection(() => {
              expect(isExists).toBe(false)
            })
          },
          uploading({ name, task, current, total, complete }) {
            const expectFn = (uploading) => {
              expect(current).toBe(uploading)
              expect(total).toBe(totalChunks)
              expect(complete).toBe(uploading)
            }
            uploading ++
            collection(expectFn.bind(this, uploading))
          },
          beforeComplete({ name, task, isExists }) {
            beforeComplete ++
            collection(() => {
              expect(isExists).toBe(false)
            })
          },
          afterComplete({ name, task, success }) {
            afterComplete ++
            collection(() => {
              expect(success).toBe(true)
            })
          }
        }
      })

      expect(result).toBeInstanceOf(Array)
    
      result.forEach(name => expect(isSymbol(name)).toBeTruthy())
    })

    test(`upload the chunk complete task and md5 is parsed`, (done) => {
      const { collection, emit } = emitterCollection()
        
      let beforeRead = 0,
          reading = 0,
          beforeCheck = 0,
          afterCheck = 0,
          uploading = 0,
          beforeComplete = 0,
          afterComplete = 0,
          result

      result = upload.uploading({
        config,
        request: {
          exitDataFn,
          uploadFn,
          completeFn,
          callback: (err) => {
            try {
              emit()
              const _times = Math.ceil(FILE_SIZE / config.chunkSize)

              expect(beforeRead).toBe(0)
              expect(reading).toBe(0)
              expect(beforeCheck).toBe(1)
              expect(afterCheck).toBe(1)
              expect(uploading).toBe(_times)
              expect(beforeComplete).toBe(1)
              expect(afterComplete).toBe(1)

              if(err) {
                done(err)
              }else {
                done()
              }
            }catch(err) {
              done(err)
            }
          },
        },
        file: {
          file,
          chunks: arrayBufferChunks,
          md5
        },
        lifecycle: {
          beforeRead({ name, task }) {
            beforeRead ++
          },
          reading({ name, task, current, total }) {
            const _reading = ++ reading
            collection(() => {
              const _current = _reading * config.chunkSize
              expect(current).toBe(_reading == totalChunks ? FILE_SIZE : _current)
              expect(total).toBe(FILE_SIZE)
            })
          },
          beforeCheck({ name, task }) {
            beforeCheck ++
          },
          afterCheck({ name, task, isExists }) {
            afterCheck ++
            collection(() => {
              expect(isExists).toBe(false)
            })
          },
          uploading({ name, task, current, total, complete }) {
            const expectFn = (uploading) => {
              expect(current).toBe(uploading)
              expect(total).toBe(totalChunks)
              expect(complete).toBe(uploading)
            }
            uploading ++
            collection(expectFn.bind(this, uploading))
          },
          beforeComplete({ name, task, isExists }) {
            beforeComplete ++
            collection(() => {
              expect(isExists).toBe(false)
            })
          },
          afterComplete({ name, task, success }) {
            afterComplete ++
            collection(() => {
              expect(success).toBe(true)
            })
          }
        }
      })

      expect(result).toBeInstanceOf(Array)
    
      result.forEach(name => expect(isSymbol(name)).toBeTruthy())
    })

    test(`upload the exists task and the task is cancelAdd`, (done) => {
      const { collection, emit } = emitterCollection()
        
      let beforeRead = 0,
          reading = 0,
          beforeCheck = 0,
          afterCheck = 0,
          uploading = 0,
          beforeComplete = 0,
          afterComplete = 0,
          result;

      result = upload.add({
        config,
        request: {
          exitDataFn,
          uploadFn,
          completeFn,
          callback: (err) => {
            try {
              emit()
              const _times = Math.ceil(FILE_SIZE / config.chunkSize)

              expect(beforeRead).toBe(1)
              expect(reading).toBe(_times)
              expect(beforeCheck).toBe(1)
              expect(afterCheck).toBe(1)
              expect(uploading).toBe(_times)
              expect(beforeComplete).toBe(1)
              expect(afterComplete).toBe(1)

              if(err) {
                done(err)
              }else {
                done()
              }
            }catch(err) {
              done(err)
            }
          },
        },
        file: {
          file,
        },
        lifecycle: {
          beforeRead({ name, task }) {
            beforeRead ++
          },
          reading({ name, task, current, total }) {
            const _reading = ++ reading
            collection(() => {
              const _current = _reading * config.chunkSize
              expect(current).toBe(_reading == totalChunks ? FILE_SIZE : _current)
              expect(total).toBe(FILE_SIZE)
            })
          },
          beforeCheck({ name, task }) {
            beforeCheck ++
          },
          afterCheck({ name, task, isExists }) {
            afterCheck ++
            collection(() => {
              expect(isExists).toBe(false)
            })
          },
          uploading({ name, task, current, total, complete }) {
            const expectFn = (uploading) => {
              expect(current).toBe(uploading)
              expect(total).toBe(totalChunks)
              expect(complete).toBe(uploading)
            }
            uploading ++
            collection(expectFn.bind(this, uploading))
          },
          beforeComplete({ name, task, isExists }) {
            beforeComplete ++
            collection(() => {
              expect(isExists).toBe(false)
            })
          },
          afterComplete({ name, task, success }) {
            afterComplete ++
            collection(() => {
              expect(success).toBe(true)
            })
          }
        }
      })

      expect(result).toBeInstanceOf(Array)
    
      result.forEach(name => expect(isSymbol(name)).toBeTruthy())

      const task = upload.getTask(result[0])
      
      result = upload.cancelAdd(result[0])
      expect(result).toBeInstanceOf(Array)
      result.forEach(name => expect(isSymbol(name)).toBeTruthy())

      result = upload.uploading(task)
      expect(result).toBeInstanceOf(Array)
      result.forEach(name => expect(isSymbol(name)).toBeTruthy())

    })

    test(`upload the exists task and the task is upload reject`, (done) => {
      const { collection, emit } = emitterCollection()
        
      let beforeRead = 0,
          reading = 0,
          beforeCheck = 0,
          afterCheck = 0,
          uploading = 0,
          beforeComplete = 0,
          afterComplete = 0,
          result,
          isFirst = true;

      result = upload.add({
        config,
        request: {
          exitDataFn,
          uploadFn,
          completeFn,
          callback: (err) => {
            try {
              if(err && isFirst) {
                isFirst = false 
                result = upload.uploading(task)
                expect(result).toBeInstanceOf(Array)
                result.forEach(name => expect(isSymbol(name)).toBeTruthy())
              }else {
                emit()
                const _times = Math.ceil(FILE_SIZE / config.chunkSize)
  
                expect(beforeRead).toBe(1)
                expect(reading).toBe(_times)
                expect(beforeCheck).toBe(1)
                expect(afterCheck).toBe(1)
                expect(uploading).toBe(_times)
                expect(beforeComplete).toBe(1)
                expect(afterComplete).toBe(1)
  
                if(err) {
                  done(err)
                }else {
                  done()
                }
              }
            }catch(err) {
              done(err)
            }
          },
        },
        file: {
          file,
        },
        lifecycle: {
          beforeRead({ name, task }) {
            if(isFirst) {
              throw new Error("upload error")
            }
            beforeRead ++
          },
          reading({ name, task, current, total }) {
            const _reading = ++ reading
            collection(() => {
              const _current = _reading * config.chunkSize
              expect(current).toBe(_reading == totalChunks ? FILE_SIZE : _current)
              expect(total).toBe(FILE_SIZE)
            })
          },
          beforeCheck({ name, task }) {
            beforeCheck ++
          },
          afterCheck({ name, task, isExists }) {
            afterCheck ++
            collection(() => {
              expect(isExists).toBe(false)
            })
          },
          uploading({ name, task, current, total, complete }) {
            const expectFn = (uploading) => {
              expect(current).toBe(uploading)
              expect(total).toBe(totalChunks)
              expect(complete).toBe(uploading)
            }
            uploading ++
            collection(expectFn.bind(this, uploading))
          },
          beforeComplete({ name, task, isExists }) {
            beforeComplete ++
            collection(() => {
              expect(isExists).toBe(false)
            })
          },
          afterComplete({ name, task, success }) {
            afterComplete ++
            collection(() => {
              expect(success).toBe(true)
            })
          }
        }
      })

      expect(result).toBeInstanceOf(Array)
    
      result.forEach(name => expect(isSymbol(name)).toBeTruthy())

      const task = upload.getTask(result[0])
      
      result = upload.deal(result[0])
      expect(result).toBeInstanceOf(Array)
      result.forEach(name => expect(isSymbol(name)).toBeTruthy())

    })

    test(`upload the exists task and the task is uploading`, (done) => {
      const { collection, emit } = emitterCollection()
        
      let beforeRead = 0,
          reading = 0,
          beforeCheck = 0,
          afterCheck = 0,
          uploading = 0,
          beforeComplete = 0,
          afterComplete = 0,
          result;

      result = upload.upload({
        config,
        request: {
          exitDataFn,
          uploadFn,
          completeFn,
          callback: (err) => {
            try {
              emit()
              const _times = Math.ceil(FILE_SIZE / config.chunkSize)

              expect(beforeRead).toBe(1)
              expect(reading).toBe(_times)
              expect(beforeCheck).toBe(1)
              expect(afterCheck).toBe(1)
              expect(uploading).toBe(_times)
              expect(beforeComplete).toBe(1)
              expect(afterComplete).toBe(1)

              if(err) {
                done(err)
              }else {
                done()
              }
            }catch(err) {
              done(err)
            }
          },
        },
        file: {
          file,
        },
        lifecycle: {
          beforeRead({ name, task }) {
            beforeRead ++
          },
          reading({ name, task, current, total }) {
            const _reading = ++ reading
            collection(() => {
              const _current = _reading * config.chunkSize
              expect(current).toBe(_reading == totalChunks ? FILE_SIZE : _current)
              expect(total).toBe(FILE_SIZE)
            })
          },
          beforeCheck({ name, task }) {
            beforeCheck ++
          },
          afterCheck({ name, task, isExists }) {
            afterCheck ++
            collection(() => {
              expect(isExists).toBe(false)
            })
          },
          uploading({ name, task, current, total, complete }) {
            const expectFn = (uploading) => {
              expect(current).toBe(uploading)
              expect(total).toBe(totalChunks)
              expect(complete).toBe(uploading)
            }
            uploading ++
            collection(expectFn.bind(this, uploading))
          },
          beforeComplete({ name, task, isExists }) {
            beforeComplete ++
            collection(() => {
              expect(isExists).toBe(false)
            })
          },
          afterComplete({ name, task, success }) {
            afterComplete ++
            collection(() => {
              expect(success).toBe(true)
            })
          }
        }
      })

      expect(result).toBeInstanceOf(Array)
    
      result.forEach(name => expect(isSymbol(name)).toBeTruthy())

      const task = upload.getTask(result[0])

      result = upload.uploading(task)
      expect(result).toBeInstanceOf(Array)
      expect(result.length).toBe(0)
    })

  })

  describe(`resumeTask api`, () => {

    test(`resumeTask the task`, (done) => {
        
      let result;

      result = upload.add({
        config,
        request: {
          exitDataFn,
          uploadFn,
          completeFn,
          callback: (err) => {
            done("unknown error")
          },
        },
        file: {
          file,
        },
      })

      expect(result).toBeInstanceOf(Array)
    
      result.forEach(name => expect(isSymbol(name)).toBeTruthy())

      const task = upload.getTask(result[0])
      
      result = upload.cancelAdd(result[0])
      expect(result).toBeInstanceOf(Array)
      result.forEach(name => expect(isSymbol(name)).toBeTruthy())

      result = upload.resumeTask(task)
      expect(result).toBeInstanceOf(Array)
      expect(result.length).toBe(1)
      result.forEach(name => expect(isSymbol(name)).toBeTruthy())

      done()
    })

  })

  describe("dispose test", () => {

    test("dispose test", () => {

      const upload = new Upload()

      const result = upload.add({
        config,
        request: {
          exitDataFn,
          uploadFn,
          completeFn,
          callback: (err) => {},
        },
        file: {
          file
        },
        lifecycle: {
          beforeRead() {},
        }
      })
      expect(result).toBeInstanceOf(Array)
      expect(result.length).toEqual(1)
      result.forEach(name => expect(isSymbol(name)).toBeTruthy())
      upload.dispose()
      expect(WorkerPool.queueIsEmpty()).toBeTruthy()

    })

  })

})