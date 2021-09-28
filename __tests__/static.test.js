import { omit } from 'lodash'
import { Upload } from '../src'
import { 
  config, 
  FILE_SIZE,
  arrayBufferFile,
  file,
  totalChunks,
  getFileMd5,
  dealResultExpect,
} from './constants'

const md5 = getFileMd5()

describe('static api test', () => {

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

  describe('install api', () => {

    let readerCount = 0
    let slicerCount = 0
    let slicerIndex = 0
    let readerIgnoreCount = 0
    let slicerIgnoreCount = 0
    let _Upload

    beforeEach(() => {
      _Upload = undefined 
      _Upload = Upload
    })

    afterAll(() => {
      _Upload = undefined
    })

    test('install success', (done) => {

      async function reader(task, stepValue) {
        readerCount ++ 
        return md5 
      }
  
      async function slicer(task, start, end, file, stepValue) {
        expect(start).toEqual(slicerIndex * config.chunkSize)
        let _end = (slicerIndex + 1) * config.chunkSize
        _end = _end >= FILE_SIZE ? FILE_SIZE : _end
        expect(end).toEqual(_end)
        expect(file instanceof ArrayBuffer || file instanceof Blob || typeof file === 'string').toBeTruthy
        slicerCount ++
        slicerIndex ++
        if(slicerIndex == totalChunks) {
          slicerIndex = 0
        }
        return arrayBufferFile.slice(start, end)
      }

      _Upload.install('slicer', slicer)
      _Upload.install('reader', reader)

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

      async function reader(task, stepValue) {
        readerIgnoreCount ++
      }

      async function slicer(start, end, file, stepValue) {
        slicerIgnoreCount ++
      }

      _Upload.install('slicer', slicer)
      _Upload.install('reader', reader)

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

})