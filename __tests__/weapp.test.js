import { WeUpload } from '../src'
import { arrayBufferToBase64, base64ToArrayBuffer } from '../src/utils/tool'
import {
  config,
  uploadFn,
  callback,
  FILE_SIZE,
  BASE_SIZE,
  arrayBufferFile,
  base64File,
  file,
  chunks,
  mime,
  getFileMd5,
  dealResultExpect,
  totalChunks
} from './constants'

const slice = ArrayBuffer.prototype.slice

const md5 = getFileMd5()

window.Worker = undefined

describe('weapp upload chunk test', () => {

  let _File = window.File
  let _Blob = window.Blob
  let _FileReader = window.FileReader
  let _FormData = window.FormData

  beforeAll((done) => {
    window.File = undefined
    window.Blob = undefined
    window.FileReader = undefined
    window.FormData = undefined
    done()
  })

  afterAll((done) => {
    window.File = _File
    window.Blob = _Blob
    window.FileReader = _FileReader
    window.FormData = _FormData
    done()
  })

  describe('weapp upload chunk success test', () => {

    let upload 
    let _WeUpload 

    beforeAll((done) => {
      _WeUpload = WeUpload
      _WeUpload.setOptions({
        arrayBufferToBase64,
        base64ToArrayBuffer
      })
      upload = new _WeUpload()
      done()
    })

    test('weapp upload chunk success', (done) => {

      let tasks 

      [ tasks ] = upload.add({
        config: {
          chunkSize: BASE_SIZE
        },
        file: {
          file: arrayBufferFile,
          mime
        },
        request: {
          uploadFn,
          callback(error) {
            try {
              expect(!!error).toBeFalsy
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

    test('weapp upload chunk success and upload the base64 file', (done) => {
      let tasks;
      let times = 0;
      const totalChunks = 1;

      [ tasks ] = upload.add({
        file: {
          file: base64File
        },
        request: {
          uploadFn,
          callback(error) {
            try {
              expect(!!error).toBeFalsy
              expect(times).toBe(totalChunks)
              done()
            }catch(err) {
              done(err)
            }
          }
        },
        lifecycle: {
          reading({ name, task }) {
            times ++
          },
        }
      })

      upload.deal(tasks)
    })

    test('weapp upload chunk success and upload the arraybuffer file', (done) => {
      let tasks;

      [ tasks ] = upload.add({
        config: {
          chunkSize: BASE_SIZE
        },
        file: {
          file: arrayBufferFile
        },
        request: {
          uploadFn,
          callback(error) {
            try {
              expect(!!error).toBeFalsy
              done()
            }catch(err) {
              done(err)
            }
          }
        }
      })

      const names = upload.deal(tasks)
      dealResultExpect(names)
    })

    test('weapp upload chunk success and upload the chunks file', (done) => {
      let tasks;

      [ tasks ] = upload.add({
        config: {
          chunkSize: BASE_SIZE
        },
        file: {
          chunks,
          mime,
          md5
        },
        request: {
          uploadFn,
          callback(error) {
            try {
              expect(!!error).toBeFalsy
              done()
            }catch(err) {
              done(err)
            }
          }
        }
      })

      const names = upload.deal(tasks)
      dealResultExpect(names)
    })

  })

  describe('weapp upload chunk fail test', () => {

    let upload 
    let _WeUpload 

    beforeAll((done) => {
      _WeUpload = WeUpload
      upload = new _WeUpload()
      done()
    })
    
    test('weapp upload chunk fail because the slice function is not support', (done) => {

      let tasks;

      [ tasks ] = upload.add({
        file: {
          file: base64File
        },
        request: {
          uploadFn,
          callback(error) {
            try {
              expect(!!error).toBeTruthy
              done()
            }catch(err) {
              done(err)
            }
          }
        }
      })

      const names = upload.deal(tasks)
      dealResultExpect(names)

    })

  })

  describe('add api test', () => {

    let upload 
    let _WeUpload 

    beforeAll((done) => {
      _WeUpload = WeUpload
      _WeUpload.setOptions({
        arrayBufferToBase64,
        base64ToArrayBuffer
      })
      upload = new _WeUpload()
      done()
    })

    test('add api success test', (done) => {

      let tasks;
      [ tasks ] = upload.add({
        file: {
          file: base64File
        },
        request: {
          uploadFn({ file }) {
            expect(typeof file).toBe('string')
          },
          callback: callback(done)
        }
      })

      const names = upload.deal(tasks)
      dealResultExpect(names)

    })

  })

})