import SparkMd5 from 'spark-md5'
import { WeUpload } from '../src'
import { arrayBufferToBase64, base64ToArrayBuffer } from '../src/utils/tool'

const uploadFn = (data) => {}

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

describe.skip('weapp upload chunk test', () => {

  let _File = window.File
  let _Blob = window.Blob
  let _FileReader = window.FileReader
  let _FormData = window.FormData

  beforeAll((done) => {
    window.File = undefined
    window.Blob = undefined
    window.FileReader = undefined
    window.FormData = undefined
  })

  afterAll(() => {
    window.File = _File
    window.Blob = _Blob
    window.FileReader = _FileReader
    window.FormData = _FormData
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
    })

    it('weapp upload chunk success', (done) => {

      let tasks 

      [ tasks ] = upload.add({
        file: {
          file
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

      upload.deal(tasks)

    })

    it('weapp uplopad chunk success and upload the base64 file', (done) => {
      let tasks 
      let times = 0

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

    it('weapp upload chunk success and upload the arraybuffer file', (done) => {
      let tasks 

      [ tasks ] = upload.add({
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

      upload.deal(tasks)
    })

    it('weapp upload chunk success and upload the chunks file', (done) => {
      let tasks 

      [ tasks ] = upload.add({
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

      upload.deal(tasks)
    })

  })

  describe('weapp upload chunk fail test', () => {

    let upload 
    let _WeUpload 

    beforeAll((done) => {
      _WeUpload = WeUpload
      upload = new _WeUpload()
    })
    
    it('weapp upload chunk fail because the slice function is not support', (done) => {

      let tasks 

      [ tasks ] = upload.add({
        file: {
          file
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

      upload.deal(tasks)

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
    })

    test('add api success test', (done) => {

      let tasks
      [ tasks ] = upload.add({
        file: {
          file
        },
        uploadFn({ file }) {
          expect(file).toBeInstanceOf(String)
        },
        callback: callback(done)
      })

      upload.deal(tasks)

    })

  })

})