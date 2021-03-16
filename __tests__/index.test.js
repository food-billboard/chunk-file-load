import { merge, omit } from 'lodash'
import { Upload, ECACHE_STATUS } from '../src'
import { isSymbol } from '../src/utils/tool'
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
  getBase64Md5,
  emitterCollection,
  dealResultExpect,
} from './constants'

const md5 = getFileMd5()
const base64Md5 = getBase64Md5()

let upload = new Upload()

// jest.mock('../src/utils/worker/__mocks__/file.worker.js')

window.Worker = undefined

describe.skip('upload chunk test', () => {

  let _Worker = window.Worker

  beforeAll((done) => {
    window.Worker = undefined
    done()
  })
  
  afterAll((done) => {
    window.Worker = _Worker
    done()
  })

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
      
        result.forEach(name => expect(isSymbol(name)).toBeTruthy)

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
                  expect(!!error).toBeTruthy
                  stop = false
                  const result = upload.start(tasks)
                  expect(result).toBeInstanceOf(Array)
                  expect(result.length).toBe(1)
                }else {
                  expect(!!error).toBeFalsy
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
                  expect(!!error).toBeTruthy
                  stop = false
                  const nextTasks = upload.start(tasks)
                  expect(nextTasks).toBeInstanceOf(Array)
                  expect(nextTasks.length).toBe(1)
                }else {
                  expect(!!error).toBeFalsy
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
                  expect(!!error).toBeTruthy
                  stop = false
                  const nextTasks = upload.start(tasks)
                  dealResultExpect(nextTasks)
                }else {
                  expect(!!error).toBeFalsy
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
                  expect(!!error).toBeTruthy
                  stop = false
                  const nextTasks = upload.start(tasks)
                  expect(nextTasks).toBeInstanceOf(Array)
                  expect(nextTasks.length).toBe(1)
                }else {
                  expect(!!error).toBeFalsy
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
                  expect(!!error).toBeTruthy
                  stop = false
                  upload.start(tasks)
                }else {
                  expect(!!error).toBeFalsy
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
                  expect(!!error).toBeTruthy
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
                  expect(!!error).toBeTruthy
                  stop = false
                  const nextTasks = upload.start(tasks)
                  expect(nextTasks).toBeInstanceOf(Array)
                  expect(nextTasks.length).toBe(1)
                  expect(reading).toBe(totalChunks)
                  expect(uploading).toBe(totalChunks)
                }else {
                  expect(count).toBe(2)
                  expect(!!error).toBeFalsy
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

      test('stop api success and stop in afterComplete', (done) => {
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
                  expect(!!error).toBeTruthy
                  stop = false
                  const nextTasks = upload.start(tasks)
                  expect(nextTasks).toBeInstanceOf(Array)
                  expect(nextTasks.length).toBe(1)
                  expect(reading).toBe(totalChunks)
                  expect(uploading).toBe(totalChunks)
                }else {
                  expect(count).toBe(2)
                  expect(!!error).toBeFalsy
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
                  expect(!!error).toBeTruthy
                  expect(error.retry).toBeFalsy
                  stop = false
                  const nextTasks = upload.start(tasks)
                  expect(nextTasks).toBeInstanceOf(Array)
                  expect(nextTasks.length).toBe(0)
                  done()
                }else {
                  expect(count).toBe(1)
                  expect(!!error).toBeFalsy
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
                expect(!!error).toBeTruthy
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
                  expect(!!error).toBeTruthy
                  stop = false
                  const result = upload.start(tasks)
                  dealResultExpect(result)
                }else {
                  expect(!!error).toBeFalsy
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
                  expect(!!error).toBeTruthy
                  stop = false
                  const result = upload.start(tasks)
                  dealResultExpect(result)
                }else {
                  expect(!!error).toBeFalsy
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
                expect(!!error).toBeTruthy
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
                expect(!!error).toBeTruthy
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
                  expect(!!error).toBeTruthy
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
                expect(!!error).toBeTruthy
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
                expect(!!error).toBeTruthy
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
                expect(!!error).toBeTruthy
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
                expect(!!error).toBeTruthy
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
                  expect(!!error).toBeTruthy
                  stop = false
                  const nextTasks = upload.start(...tasks)
                  expect(nextTasks).toBeInstanceOf(Array)
                  expect(nextTasks.length).toBe(1)
                }else {
                  expect(!!error).toBeFalsy
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
                expect(!!error).toBeTruthy
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
                expect(!!error).toBeTruthy
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

      test('cancel api success and cancel in afterComplete', (done) => {

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
                expect(!!error).toBeTruthy
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
                expect(!!error).toBeTruthy
                expect(error.retry).toBeFalsy
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
                expect(!!error).toBeFalsy
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
          config,
          request: {
            uploadFn,
            completeFn
          },
          file: {
            file
          }
        })
        done()
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
          config,
          request: {
            uploadFn,
            completeFn
          },
          file: {
            file
          }
        })
        done()
      })

      test('getOriginFile api success', (done) => {
        const task = upload.getOriginFile(name)
        expect(!!task).toBeTruthy
        done()
      })

      test('getOriginFile api success but the task not found ', (done) => {
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
        const { collection, emit } = emitterCollection()
        const expectStatus = (expectValue) => {
          const status = upload.getStatus(name)
          collection(() => {
            expect(status).toEqual(expectValue)
          })
        }

        [ name ] = upload.add({
          config,
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
              try {
                emit()
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
              expectStatus(ECACHE_STATUS.reading)
            },
            beforeRead({ name }) {
              expectStatus(ECACHE_STATUS.reading)
            },
            beforeCheck({ name }) {
              expectStatus(ECACHE_STATUS.uploading)
            },
            afterCheck({ name }) {
              expectStatus(ECACHE_STATUS.uploading)
            },
            uploading({ name }) {
              expectStatus(ECACHE_STATUS.uploading)
            },
            beforeComplete({ name }) {
              expectStatus(ECACHE_STATUS.uploading)
            },
            afterComplete({ name }) {
              expectStatus(ECACHE_STATUS.fulfilled)
            }
          }
        })

        expectStatus(ECACHE_STATUS.pending)

        const result = upload.deal(name)
        dealResultExpect(result)

      })

      test('getStatus api success but the task not found ', () => {

        const status = upload.getStatus(null)
        expect(!!status).toBeFalsy

      })

    })

  })

  describe('watch api', () => {

    describe('watch api success test', () => {

      const expectWatch = (value, property, collection) => {
        collection(() => {
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
        })
      }

      const readingProgress = (target) => {
        const { complete, total, progress } = target
        if(total == 0) return 0
        // console.log(complete, total)
        return parseFloat((complete / total).toFixed(4))
      }

      const uploadingProgress = (target) => {
        const { complete, total, progress } = target
        if(total == 0) return 0
        return parseFloat((complete / total).toFixed(4))
      }

      test('watch api success', (done) => {

        let reading = 0
        let beforeRead = 0
        let beforeCheck = 0
        let afterCheck = 0
        let uploading = 0
        let beforeComplete = 0
        let afterComplete = 0
        const { collection, emit } = emitterCollection()

        //返回正确的参数
        const [tasks] = upload.add({
          config,
          file: {
            file
          },
          request: {
            uploadFn: (data) => {},
            completeFn,
            callback(error) {
              try {
                emit()
                expect(!!error).toBeFalsy
                expect(beforeRead).toBe(1)
                expect(reading).toBe(totalChunks)
                expect(beforeCheck).toBe(1)
                expect(afterCheck).toBe(1)
                expect(uploading).toBe(totalChunks)
                expect(beforeComplete).toBe(1)
                expect(afterComplete).toBe(1)
                done()
              }catch(err) {
                done(err)
              }
            }
          },
          lifecycle: {
            beforeRead({ name, task }) {
              const [ result ] = upload.watch(name)
              expectWatch(result, {
                progress: 0,
                name,
                error: null,
                status: ECACHE_STATUS.reading,
                total: 0,
                current: 0
              }, collection)
              beforeRead ++
            },
            reading({ name, current, total }) {
              const [ result ] = upload.watch(name)
              expectWatch(result, {
                progress: readingProgress(result),
                name,
                error: null,
                status: ECACHE_STATUS.reading,
                total: reading == 0 ? 0 : total,
                current: (reading == totalChunks) ? FILE_SIZE : (reading * config.chunkSize)
              }, collection)
              reading ++
            },
            beforeCheck({ name }) {
              const [ result ] = upload.watch(name)
              expectWatch(result, {
                progress: 1,
                name,
                error: null,
                status: ECACHE_STATUS.uploading,
                total: FILE_SIZE,
                current: FILE_SIZE
              }, collection)
              beforeCheck ++
            },
            afterCheck({ name }) {
              const [ result ] = upload.watch(name)
              expectWatch(result, {
                progress: 0,
                name,
                error: null,
                status: ECACHE_STATUS.uploading,
                total: totalChunks,
                current: 0
              }, collection)
              afterCheck ++
            },
            uploading({ name, current, total, complete }) {
              const [ result ] = upload.watch(name)
              expectWatch(result, {
                progress: uploadingProgress(result),
                name,
                error: null,
                status: ECACHE_STATUS.uploading,
                total: totalChunks,
                current: current - 1
              }, collection)
              uploading ++
            },
            beforeComplete({ name }) {
              const [ result ] = upload.watch(name)
              expectWatch(result, {
                progress: 1,
                name,
                error: null,
                status: ECACHE_STATUS.uploading,
                total: totalChunks,
                current: totalChunks
              }, collection)
              beforeComplete ++
            },
            afterComplete({ name }) {
              const [ result ] = upload.watch(name)
              expectWatch(result, {
                progress: 1,
                name,
                error: null,
                status: ECACHE_STATUS.fulfilled,
                total: totalChunks,
                current: totalChunks
              }, collection)
              afterComplete ++
            }
          }
        })

        const names = upload.deal(tasks)
        dealResultExpect(names)

      })

      test('watch api success and upload chunks', (done) => {

        let reading = 0
        let beforeRead = 0
        let beforeCheck = 0
        let afterCheck = 0
        let uploading = 0
        let beforeComplete = 0
        let afterComplete = 0
        const { collection, emit } = emitterCollection()

        //返回正确的参数
        const [tasks] = upload.add({
          config,
          file: {
            chunks,
            mime,
          },
          request: {
            uploadFn: (data) => {},
            completeFn,
            callback(error) {
              try {
                emit()
                expect(!!error).toBeFalsy
                expect(beforeRead).toBe(1)
                expect(reading).toBe(totalChunks)
                expect(beforeCheck).toBe(1)
                expect(afterCheck).toBe(1)
                expect(uploading).toBe(totalChunks)
                expect(beforeComplete).toBe(1)
                expect(afterComplete).toBe(1)
                done()
              }catch(err) {
                done(err)
              }
            }
          },
          lifecycle: {
            beforeRead({ name, task }) {
              const [ result ] = upload.watch(name)
              expectWatch(result, {
                progress: 0,
                name,
                error: null,
                status: ECACHE_STATUS.reading,
                total: 0,
                current: 0
              }, collection)
              beforeRead ++
            },
            reading({ name, current, total }) {
              const [ result ] = upload.watch(name)
              expectWatch(result, {
                progress: readingProgress(result),
                name,
                error: null,
                status: ECACHE_STATUS.reading,
                total: reading == 0 ? 0 : total,
                current: (reading == totalChunks) ? FILE_SIZE : (reading * config.chunkSize)
              }, collection)
              reading ++
            },
            beforeCheck({ name }) {
              const [ result ] = upload.watch(name)
              expectWatch(result, {
                progress: result.progress,
                name,
                error: null,
                status: ECACHE_STATUS.uploading,
                total: result.total,
                current: result.current
              }, collection)
              beforeCheck ++
            },
            afterCheck({ name }) {
              const [ result ] = upload.watch(name)
              expectWatch(result, {
                progress: 0,
                name,
                error: null,
                status: ECACHE_STATUS.uploading,
                total: totalChunks,
                current: 0
              }, collection)
              afterCheck ++
            },
            uploading({ name, current, total, complete }) {
              const [ result ] = upload.watch(name)
              expectWatch(result, {
                progress: uploadingProgress(result),
                name,
                error: null,
                status: ECACHE_STATUS.uploading,
                total: totalChunks,
                current: current - 1
              }, collection)
              uploading ++
            },
            beforeComplete({ name }) {
              const [ result ] = upload.watch(name)
              expectWatch(result, {
                progress: 1,
                name,
                error: null,
                status: ECACHE_STATUS.uploading,
                total: totalChunks,
                current: totalChunks
              }, collection)
              beforeComplete ++
            },
            afterComplete({ name }) {
              const [ result ] = upload.watch(name)
              expectWatch(result, {
                progress: 1,
                name,
                error: null,
                status: ECACHE_STATUS.fulfilled,
                total: totalChunks,
                current: totalChunks
              }, collection)
              afterComplete ++
            }
          }
        })

        const names = upload.deal(tasks)
        dealResultExpect(names)

      })

      test('watch api success adn upload arraybuffer', (done) => {

        let reading = 0
        let beforeRead = 0
        let beforeCheck = 0
        let afterCheck = 0
        let uploading = 0
        let beforeComplete = 0
        let afterComplete = 0
        const { collection, emit } = emitterCollection()

        //返回正确的参数
        const [tasks] = upload.add({
          config,
          file: {
            file: arrayBufferFile
          },
          request: {
            uploadFn: (data) => {},
            completeFn,
            callback(error) {
              try {
                emit()
                expect(!!error).toBeFalsy
                expect(beforeRead).toBe(1)
                expect(reading).toBe(totalChunks)
                expect(beforeCheck).toBe(1)
                expect(afterCheck).toBe(1)
                expect(uploading).toBe(totalChunks)
                expect(beforeComplete).toBe(1)
                expect(afterComplete).toBe(1)
                done()
              }catch(err) {
                done(err)
              }
            }
          },
          lifecycle: {
            beforeRead({ name, task }) {
              const [ result ] = upload.watch(name)
              expectWatch(result, {
                progress: 0,
                name,
                error: null,
                status: ECACHE_STATUS.reading,
                total: 0,
                current: 0
              }, collection)
              beforeRead ++
            },
            reading({ name, current, total }) {
              const [ result ] = upload.watch(name)
              expectWatch(result, {
                progress: readingProgress(result),
                name,
                error: null,
                status: ECACHE_STATUS.reading,
                total: reading == 0 ? 0 : total,
                current: (reading == totalChunks) ? FILE_SIZE : (reading * config.chunkSize)
              }, collection)
              reading ++
            },
            beforeCheck({ name }) {
              const [ result ] = upload.watch(name)
              expectWatch(result, {
                progress: 1,
                name,
                error: null,
                status: ECACHE_STATUS.uploading,
                total: FILE_SIZE,
                current: FILE_SIZE
              }, collection)
              beforeCheck ++
            },
            afterCheck({ name }) {
              const [ result ] = upload.watch(name)
              expectWatch(result, {
                progress: 0,
                name,
                error: null,
                status: ECACHE_STATUS.uploading,
                total: totalChunks,
                current: 0
              }, collection)
              afterCheck ++
            },
            uploading({ name, current, total, complete }) {
              const [ result ] = upload.watch(name)
              expectWatch(result, {
                progress: uploadingProgress(result),
                name,
                error: null,
                status: ECACHE_STATUS.uploading,
                total: totalChunks,
                current: current - 1
              }, collection)
              uploading ++
            },
            beforeComplete({ name }) {
              const [ result ] = upload.watch(name)
              expectWatch(result, {
                progress: 1,
                name,
                error: null,
                status: ECACHE_STATUS.uploading,
                total: totalChunks,
                current: totalChunks
              }, collection)
              beforeComplete ++
            },
            afterComplete({ name }) {
              const [ result ] = upload.watch(name)
              expectWatch(result, {
                progress: 1,
                name,
                error: null,
                status: ECACHE_STATUS.fulfilled,
                total: totalChunks,
                current: totalChunks
              }, collection)
              afterComplete ++
            }
          }
        })

        const names = upload.deal(tasks)
        dealResultExpect(names)

      })

      test('watch api success and upload base64', (done) => {

        let reading = 0
        let beforeRead = 0
        let beforeCheck = 0
        let afterCheck = 0
        let uploading = 0
        let beforeComplete = 0
        let afterComplete = 0
        const totalChunks = BASE_SIZE / BASE_SIZE
        const { collection, emit } = emitterCollection()

        //返回正确的参数
        const [tasks] = upload.add({
          config,
          file: {
            file: base64File
          },
          request: {
            uploadFn: (data) => {},
            completeFn,
            callback(error) {
              try {
                emit()
                expect(!!error).toBeFalsy
                expect(beforeRead).toBe(1)
                expect(reading).toBe(totalChunks)
                expect(beforeCheck).toBe(1)
                expect(afterCheck).toBe(1)
                expect(uploading).toBe(totalChunks)
                expect(beforeComplete).toBe(1)
                expect(afterComplete).toBe(1)
                done()
              }catch(err) {
                done(err)
              }
            }
          },
          lifecycle: {
            beforeRead({ name, task }) {
              const [ result ] = upload.watch(name)
              expectWatch(result, {
                progress: 0,
                name,
                error: null,
                status: ECACHE_STATUS.reading,
                total: 0,
                current: 0
              }, collection)
              beforeRead ++
            },
            reading({ name, current, total }) {
              const [ result ] = upload.watch(name)
              expectWatch(result, {
                progress: readingProgress(result),
                name,
                error: null,
                status: ECACHE_STATUS.reading,
                total: reading == 0 ? 0 : total,
                current: (reading == totalChunks) ? FILE_SIZE : (reading * config.chunkSize)
              }, collection)
              reading ++
            },
            beforeCheck({ name }) {
              const [ result ] = upload.watch(name)
              expectWatch(result, {
                progress: 1,
                name,
                error: null,
                status: ECACHE_STATUS.uploading,
                total: BASE_SIZE,
                current: BASE_SIZE
              }, collection)
              beforeCheck ++
            },
            afterCheck({ name }) {
              const [ result ] = upload.watch(name)
              expectWatch(result, {
                progress: 0,
                name,
                error: null,
                status: ECACHE_STATUS.uploading,
                total: totalChunks,
                current: 0
              }, collection)
              afterCheck ++
            },
            uploading({ name, current, total, complete }) {
              const [ result ] = upload.watch(name)
              expectWatch(result, {
                progress: uploadingProgress(result),
                name,
                error: null,
                status: ECACHE_STATUS.uploading,
                total: totalChunks,
                current: current - 1
              }, collection)
              uploading ++
            },
            beforeComplete({ name }) {
              const [ result ] = upload.watch(name)
              expectWatch(result, {
                progress: 1,
                name,
                error: null,
                status: ECACHE_STATUS.uploading,
                total: totalChunks,
                current: totalChunks
              }, collection)
              beforeComplete ++
            },
            afterComplete({ name }) {
              const [ result ] = upload.watch(name)
              expectWatch(result, {
                progress: 1,
                name,
                error: null,
                status: ECACHE_STATUS.fulfilled,
                total: totalChunks,
                current: totalChunks
              }, collection)
              afterComplete ++
            }
          }
        })

        const names = upload.deal(tasks)
        dealResultExpect(names)

      })

      test('watch api success and stop', (done) => {

        let afterStop = 0
        let tasks;
        const { collection, emit } = emitterCollection();

        //返回正确的参数
        [ tasks ] = upload.add({
          config,
          file: {
            file
          },
          request: {
            uploadFn(data) {
              this.stop(tasks)
            },
            completeFn,
            callback(error) {
              try {
                emit()
                expect(!!error).toBeTruthy
                expect(afterStop).toBe(1)
                done()
              }catch(err) {
                done(err)
              }
            }
          },
          lifecycle: {
            afterStop({ name }) {
              const [ result ] = upload.watch(name)
              expectWatch(result, {
                progress: parseFloat((1 / totalChunks).toFixed(4)),
                name,
                error: null,
                status: ECACHE_STATUS.stopping,
                total: totalChunks,
                current: 1
              }, collection)
              afterStop ++
            }
          }
        })

        const names = upload.deal(tasks)
        dealResultExpect(names)

      })

      test('watch api success and cancel', (done) => {

        let afterCancel = 0
        let tasks;
        const { collection, emit } = emitterCollection();

        //返回正确的参数
        [ tasks ] = upload.add({
          config,
          file: {
            file
          },
          request: {
            uploadFn(data) {
              this.cancel(tasks)
            },
            completeFn,
            callback(error) {
              try {
                emit()
                expect(!!error).toBeTruthy
                expect(afterCancel).toBe(1)
                done()
              }catch(err) {
                done(err)
              }
            }
          },
          lifecycle: {
            afterCancel({ name }) {
              const [ result ] = upload.watch(name)
              expectWatch(result, {
                progress: parseFloat((1/totalChunks).toFixed(4)),
                name,
                error: null,
                status: ECACHE_STATUS.cancel,
                total: totalChunks,
                current: 1
              }, collection)
              afterCancel ++
            }
          }
        })

        const names = upload.deal(tasks)
        dealResultExpect(names)

      })

    })

    describe('watch api fail test', () => {

      test('watch api fail because the task name is not found', () => {

        //不返回参数
        const uploading = upload.watch(null)

        expect(uploading).toBeInstanceOf(Array)
        expect(uploading).toHaveLength(1)
        expect(uploading[0]).toEqual(null)

      })

    })

  })

  describe('lifecycle test', () => {

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
        const { collection, emit } = emitterCollection()

        getUpload({
          beforeRead: ({ name, task }) => {
            beforeRead ++
          },
          reading: ({ name, task, current, total }) => {
            const endSize = (reading + 1) * config.chunkSize
            collection(() => {
              expect(total).toBe(FILE_SIZE)
              expect(current).toBe(endSize >= FILE_SIZE ? FILE_SIZE : endSize)
            })
            reading ++
          },
          beforeCheck({ name, task }) {
            collection(() => {
              expect(task.file.md5).toBe(md5)
            })
            beforeCheck ++
          },
          afterCheck({ name, task, isExists }) {
            collection(() => {
              expect(isExists).toBeFalsy
            })
            afterCheck ++
          },
          uploading({ name, current, total, complete }) {
            const index = uploading + 1
            collection(() => {
              expect(current).toBe(index)
              expect(total).toBe(totalChunks)
              expect(complete).toEqual(index)
            })
            uploading ++
          },
          beforeComplete({ isExists }) {
            collection(() => {
              expect(isExists).toBeFalsy
            })
            beforeComplete ++
          },
          afterComplete: ({ name, task, success }) => {
            collection(() => {
              expect(success).toBeTruthy
            })
            afterComplete ++
          }
        })

        const [tasks] = upload.add({
          config,
          file: {
            file
          },
          request: {
            exitDataFn,
            uploadFn,
            completeFn,
            callback(error) {
              try{
                emit()
                expect(!!error).toBeFalsy
                expect(beforeRead).toBe(1)
                expect(reading).toBe(totalChunks)
                expect(uploading).toBe(totalChunks)
                expect(beforeCheck).toBe(1)
                expect(afterCheck).toBe(1)
                expect(beforeComplete).toBe(1)
                expect(afterComplete).toBe(1)
                done()
              }catch(err) {
                done(err)
              }
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
            reading ++
            throw new Error('11111111')
          },
        })

        const [tasks] = upload.add({
          config: omit(config, ['retry']),
          file: {
            file
          },
          request: {
            exitDataFn,
            uploadFn,
            completeFn,
            callback(error) {
              try {
                expect(!!error).toBeTruthy
                expect(reading).toBe(1)
                done()
              }catch(err) {
                done(err)
              }
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

      test('lifecycle upload base64 file success', (done) => {

        let beforeRead = 0
        let reading = 0
        let uploading = 0
        let beforeCheck = 0
        let afterCheck = 0
        let beforeComplete = 0
        let afterComplete = 0
        const { collection, emit } = emitterCollection()
        const totalChunks = BASE_SIZE / config.chunkSize

        getUpload({
          beforeRead: ({ name, task }) => {
            beforeRead ++
          },
          reading: ({ name, task, current, total }) => {
            const endSize = (reading + 1) * config.chunkSize
            collection(() => {
              expect(total).toBe(BASE_SIZE)
              expect(current).toBe(endSize >= BASE_SIZE ? BASE_SIZE : endSize)
            })
            reading ++
          },
          beforeCheck({ name, task }) {
            collection(() => {
              console.log(task.file.md5, base64Md5)
              expect(task.file.md5).toBe(base64Md5)
            })
            beforeCheck ++
          },
          afterCheck({ name, task, isExists }) {
            collection(() => {
              expect(isExists).toBeFalsy
            })
            afterCheck ++
          },
          uploading({ name, current, total, complete }) {
            collection(() => {
              expect(current).toBe(uploading)
              expect(total).toBe(totalChunks)
              expect(complete).toEqual(uploading)
            })
            uploading ++
          },
          beforeComplete({ isExists }) {
            collection(() => {
              expect(isExists).toBeFalsy
            })
            beforeComplete ++
          },
          afterComplete: ({ name, task, success }) => {
            collection(() => {
              expect(success).toBeTruthy
            })
            afterComplete ++
          }
        })

        const [tasks] = upload.add({
          config,
          file: {
            file: base64File
          },
          request: {
            exitDataFn,
            uploadFn,
            completeFn,
            callback(error) {
              try{
                emit()
                expect(!!error).toBeFalsy
                expect(beforeRead).toBe(1)
                expect(reading).toBe(totalChunks)
                expect(uploading).toBe(totalChunks)
                expect(beforeCheck).toBe(1)
                expect(afterCheck).toBe(1)
                expect(beforeComplete).toBe(1)
                expect(afterComplete).toBe(1)
                done()
              }catch(err) {
                done(err)
              }
            }
          }
        })

        const result = upload.deal(tasks)
        expect(result).toBeInstanceOf(Array)
        expect(result.length).toBe(1)

      })

      test('lifecycle upload base64 file success and stop the process the next lifecycle not performance', (done) => {
        let reading = 0

        getUpload({
          reading: ({  }) => {
            reading ++
            throw new Error()
          },
        })

        const [tasks] = upload.add({
          config,
          file: {
            file: base64File
          },
          request: {
            exitDataFn,
            uploadFn,
            completeFn,
            callback(error) {
              try {
                expect(!!error).toBeTruthy
                expect(reading).toBe(1)
                done()
              }catch(err) {
                done(err)
              }
            }
          },
          lifecycle: {
            reading() {
              uploading ++
            }
          }
        })

        const result = upload.deal(tasks)
        dealResultExpect(result)
      })

      test('lifecycle upload arraybuffer file success', (done) => {

        let beforeRead = 0
        let reading = 0
        let uploading = 0
        let beforeCheck = 0
        let afterCheck = 0
        let beforeComplete = 0
        let afterComplete = 0
        const { collection, emit } = emitterCollection()

        getUpload({
          beforeRead: ({ name, task }) => {
            beforeRead ++
          },
          reading: ({ name, task, current, total }) => {
            const endSize = (reading + 1) * config.chunkSize
            collection(() => {
              expect(total).toBe(FILE_SIZE)
              expect(current).toBe(endSize >= FILE_SIZE ? FILE_SIZE : endSize)
            })
            reading ++
          },
          beforeCheck({ name, task }) {
            collection(() => {
              expect(task.file.md5).toBe(md5)
            })
            beforeCheck ++
          },
          afterCheck({ name, task, isExists }) {
            collection(() => {
              expect(isExists).toBeFalsy
            })
            afterCheck ++
          },
          uploading({ name, current, total, complete }) {
            const _uploading = uploading + 1
            collection(() => {
              expect(current).toBe(_uploading)
              expect(total).toBe(totalChunks)
              expect(complete).toEqual(_uploading)
            })
            uploading ++
          },
          beforeComplete({ isExists }) {
            collection(() => {
              expect(isExists).toBeFalsy
            })
            beforeComplete ++
          },
          afterComplete: ({ name, task, success }) => {
            collection(() => {
              expect(success).toBeTruthy
            })
            afterComplete ++
          }
        })

        const [tasks] = upload.add({
          config,
          file: {
            file: arrayBufferFile
          },
          request: {
            exitDataFn,
            uploadFn,
            completeFn,
            callback(error) {
              try{
                emit()
                expect(!!error).toBeFalsy
                expect(beforeRead).toBe(1)
                expect(reading).toBe(totalChunks)
                expect(uploading).toBe(totalChunks)
                expect(beforeCheck).toBe(1)
                expect(afterCheck).toBe(1)
                expect(beforeComplete).toBe(1)
                expect(afterComplete).toBe(1)
                done()
              }catch(err) {
                done(err)
              }
            }
          }
        })

        const result = upload.deal(tasks)
        dealResultExpect(result)

      })

      test('lifecycle upload arraybuffer file success and stop the process the next lifecycle not performance', (done) => {
        let reading = 0

        getUpload({
          reading: ({  }) => {
            reading ++
            throw new Error()
          },
        })

        const [tasks] = upload.add({
          config: omit(config, ['retry']),
          file: {
            file: arrayBufferFile
          },
          request: {
            exitDataFn,
            uploadFn,
            completeFn,
            callback(error) {
              try {
                expect(!!error).toBeTruthy
                expect(reading).toBe(1)
                done()
              }catch(err) {
                done(err)
              }
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

      test('lifecycle upload chunks file success', (done) => {

        let beforeRead = 0
        let reading = 0
        let uploading = 0
        let beforeCheck = 0
        let afterCheck = 0
        let beforeComplete = 0
        let afterComplete = 0
        const { collection, emit } = emitterCollection()

        getUpload({
          beforeRead: ({ name, task }) => {
            beforeRead ++
          },
          reading: ({ name, task, current, total }) => {
            const endSize = (reading + 1) * config.chunkSize
            collection(() => {
              expect(total).toBe(totalChunks * config.chunkSize)
              expect(current).toBe(endSize >= FILE_SIZE ? FILE_SIZE : endSize)
            })
            reading ++
          },
          beforeCheck({ name, task }) {
            collection(() => {
              expect(task.file.md5).toBe(md5)
            })
            beforeCheck ++
          },
          afterCheck({ name, task, isExists }) {
            collection(() => {
              expect(isExists).toBeFalsy
            })
            afterCheck ++
          },
          uploading({ name, current, total, complete }) {
            const _uploading = uploading + 1
            collection(() => {
              expect(current).toBe(_uploading)
              expect(total).toBe(totalChunks)
              expect(complete).toEqual(_uploading)
            })
            uploading ++
          },
          beforeComplete({ isExists }) {
            collection(() => {
              expect(isExists).toBeFalsy
            })
            beforeComplete ++
          },
          afterComplete: ({ name, task, success }) => {
            collection(() => {
              expect(success).toBeTruthy
            })
            afterComplete ++
          }
        })

        const [tasks] = upload.add({
          config,
          file: {
            chunks
          },
          request: {
            exitDataFn,
            uploadFn,
            completeFn,
            callback(error) {
              try{
                emit()
                expect(!!error).toBeFalsy
                expect(beforeRead).toBe(1)
                expect(reading).toBe(totalChunks)
                expect(uploading).toBe(totalChunks)
                expect(beforeCheck).toBe(1)
                expect(afterCheck).toBe(1)
                expect(beforeComplete).toBe(1)
                expect(afterComplete).toBe(1)
                done()
              }catch(err) {
                done(err)
              }
            }
          }
        })

        const result = upload.deal(tasks)
        dealResultExpect(result)

      })

      test('lifecycle upload chunks file success and stop the process the next lifecycle not performance', (done) => {
        let reading = 0

        getUpload({
          reading: ({  }) => {
            reading ++
            throw new Error()
          },
        })

        const [tasks] = upload.add({
          config: omit(config, ['retry']),
          file: {
            chunks
          },
          request: {
            exitDataFn,
            uploadFn,
            completeFn,
            callback(error) {
              try {
                expect(!!error).toBeTruthy
                expect(reading).toBe(1)
                done()
              }catch(err) {
                done(err)
              }
            }
          },
          lifecycle: {
            reading() {
              reading ++
            }
          }
        })

        const result = upload.deal(tasks)
        expect(result).toBeInstanceOf(Array)
        expect(result.length).toBe(1)
      })

      test('lifecycle upload chunks and with the file size file success', (done) => {

        let beforeRead = 0
        let reading = 0
        let uploading = 0
        let beforeCheck = 0
        let afterCheck = 0
        let beforeComplete = 0
        let afterComplete = 0
        const { collection, emit } = emitterCollection()

        getUpload({
          beforeRead: ({ name, task }) => {
            beforeRead ++
          },
          reading: ({ name, task, current, total }) => {
            const endSize = (reading + 1) * config.chunkSize
            collection(() => {
              expect(total).toBe(FILE_SIZE)
              expect(current).toBe(endSize >= FILE_SIZE ? FILE_SIZE : endSize)
            })
            reading ++
          },
          beforeCheck({ name, task }) {
            collection(() => {
              expect(task.file.md5).toBe(md5)
            })
            beforeCheck ++
          },
          afterCheck({ name, task, isExists }) {
            collection(() => {
              expect(isExists).toBeFalsy
            })
            afterCheck ++
          },
          uploading({ name, current, total, complete }) {
            const _uploading = uploading + 1
            collection(() => {
              expect(current).toBe(_uploading)
              expect(total).toBe(totalChunks)
              expect(complete).toEqual(_uploading)
            })
            uploading ++
          },
          beforeComplete({ isExists }) {
            collection(() => {
              expect(isExists).toBeFalsy
            })
            beforeComplete ++
          },
          afterComplete: ({ name, task, success }) => {
            collection(() => {
              expect(success).toBeTruthy
            })
            afterComplete ++
          }
        })

        const [tasks] = upload.add({
          config,
          file: {
            chunks,
            size: FILE_SIZE
          },
          request: {
            exitDataFn,
            uploadFn,
            completeFn,
            callback(error) {
              try{
                emit()
                expect(!!error).toBeFalsy
                expect(beforeRead).toBe(1)
                expect(reading).toBe(totalChunks)
                expect(uploading).toBe(totalChunks)
                expect(beforeCheck).toBe(1)
                expect(afterCheck).toBe(1)
                expect(beforeComplete).toBe(1)
                expect(afterComplete).toBe(1)
                done()
              }catch(err) {
                done(err)
              }
            }
          }
        })

        const result = upload.deal(tasks)
        dealResultExpect(result)

      })

    })

  })

  describe('error retry', () => {

    describe('error retry success test', () => {

      let times = 0
      let count = 0

      test('error retry success', (done) => {

        //错误自动重试
        const [tasks] = upload.add({
          config,
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
              try {
                expect(!!error).toBeFalsy
                expect(count).toBe(3)
                done()
              }catch(err) {
                done(err)
              }
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
        dealResultExpect(result)

      })

      test('error retry success and all the upload times all fail', (done) => {

        //错误自动重试
        const [tasks] = upload.add({
          config,
          file: {
            file
          },
          request: {
            completeFn,
            uploadFn: (data) => {
              throw new Error('retry test all fail error')
            },
            callback(error) {
              try {
                expect(!!error).toBeTruthy
                done()
              }catch(err) {
                done(err)
              }
            }
          },
          config,
        })

        const result = upload.deal(tasks)
        dealResultExpect(result)

      })

      test('error retry success and in retry lifecycle stop the performance', (done) => {

        let count = 0

        //错误自动重试
        const [tasks] = upload.add({
          config,
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
              try {
                expect(!!error).toBeFalsy
                expect(count).toBe(totalChunks + 1)
                done()
              }catch(err) {
                done(err)
              }
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
        dealResultExpect(result)
      })

      test('error retry success and in retry lifecycle cancel the performance', (done) => {

        let count = 0

        //错误自动重试
        const [tasks] = upload.add({
          config,
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
              try {
                expect(!!error).toBeFalsy
                expect(count).toBe(totalChunks + 1)
                done()
              }catch(err) {
                done(err)
              }
            }
          },
          lifecycle: {
            retry({ name }) {
              const names = this.cancel(name)
              expect(names.length).toBe(0)
              count ++
            }
          },
          config,
        })

        const result = upload.deal(tasks)
        dealResultExpect(result)
      })

      test('error retry success and in retry lifecycle cancelAdd the performance', (done) => {

        let count = 0

        //错误自动重试
        const [tasks] = upload.add({
          config,
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
              try {
                expect(!!error).toBeFalsy
                expect(count).toBe(1)
                done()
              }catch(err) {
                done(err)
              }
            }
          },
          lifecycle: {
            retry({ name }) {
              this.cancelAdd(name)
              count ++
            }
          },
          config,
        })

        const result = upload.deal(tasks)
        dealResultExpect(result)
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
        context.on('reader', (task, resolve) => {
          resolve(md5)
        })
      }else {
        readerIgnoreCount ++
      }
    }

    const slicer = (context) => {
      context.on('slicer', (start, end, file, complete) => {
        if(!ignoreSlicer) {
          expect(start).toEqual(slicerIndex * config.chunkSize)
          let _end = (slicerIndex + 1) * config.chunkSize
          _end = _end >= FILE_SIZE ? FILE_SIZE : _end
          expect(end).toEqual(_end)
          expect(file instanceof ArrayBuffer || file instanceof Blob || typeof file === 'string').toBeTruthy
          expect(typeof complete).toBe('function')
          slicerCount ++
          slicerIndex ++
          if(slicerIndex == totalChunks) {
            slicerIndex = 0
          }
          complete(arrayBufferFile.slice(start, end))
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
      const [ tasks ] = upload.add({
        config: omit(config, ['retry']),
        file: {
          file,
        },
        request: {
          uploadFn() {

          },
          callback(error) {
            try {
              expect(!!error).toBeFalsy
              expect(slicerCount).toBe(totalChunks)
              expect(slicerIndex).toBe(0)
              expect(readerCount).toBe(1)
              done()
            }catch(err) {
              done(err)
            }
          }
        },
      })

      const names = upload.deal(tasks)
      dealResultExpect(names)

    })

    test('install success and ignore the plugin', (done) => {
      ignoreSlicer = true
      ignoreReader = true
      const upload = new _Upload({
        ignores: ['reader', 'slicer']
      })
      const [ tasks ] = upload.add({
        config,
        file: {
          file,
        },
        request: {
          uploadFn() {},
          callback(error) {
            try {
              expect(!!error).toBeFalsy
              expect(slicerIgnoreCount).toBe(0)
              expect(readerIgnoreCount).toBe(0)
              done()
            }catch(err) {
              done(err)
            }
          }
        },
      })
      const names = upload.deal(tasks)
      expect(names).toBeInstanceOf(Array)
      expect(names.length).toBe(1)
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

})