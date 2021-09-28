import { omit } from 'lodash'
import { Upload } from '../src'
import { 
  exitDataFn, 
  uploadFn, 
  completeFn, 
  config, 
  FILE_SIZE,
  BASE_SIZE,
  arrayBufferFile,
  base64File,
  file,
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

describe('config test', () => {

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
            const _uploading = ++uploading
            collection(() => {
              expect(current).toBe(_uploading)
              expect(total).toBe(totalChunks)
              expect(complete).toEqual(_uploading)
            })
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
            mime
          },
          request: {
            exitDataFn,
            uploadFn,
            completeFn,
            callback(error) {
              if(error) return done(error)
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
            mime,
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

  describe('ignore analysis file test', () => {

    test('ignore analysis file success test', (done) => {
      let beforeRead = 0
      let reading = 0
      let uploading = 0
      let beforeCheck = 0
      let afterCheck = 0
      let beforeComplete = 0
      let afterComplete = 0

      const upload = new Upload({
        lifecycle: {
          beforeRead: () => {
            beforeRead ++
          },
          reading: () => {
            reading ++
          },
          beforeCheck() {
            beforeCheck ++
          },
          afterCheck() {
            afterCheck ++
          },
          uploading() {
            uploading ++
          },
          beforeComplete() {
            beforeComplete ++
          },
          afterComplete: () => {
            afterComplete ++
          }
        },
        config: {
          parseIgnore: true 
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
              expect(!!error).toBeFalsy
              expect(beforeRead).toBe(0)
              expect(reading).toBe(0)
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

})