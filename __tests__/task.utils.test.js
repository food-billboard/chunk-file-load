import { Upload, ECACHE_STATUS } from '../src'
import { 
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
  emitterCollection,
  dealResultExpect,
} from './constants'

let upload = new Upload()

describe('task utils method test', () => {

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

})