import Upload from '../src/upload/index'
import { file, arrayBufferFile, blobFile, base64File, BASE_SIZE } from './constants'

describe('file transform tool test', () => {

  describe('btoa api test', () => {

    test('btoa api success test', () => {
      const file =  Upload.btoa(arrayBufferFile.slice(0, BASE_SIZE))
      expect(typeof file).toBe('string')
    })

  })

  describe('atob api test', () => {

    test('atob api success test', () => {
      const file = Upload.atob(base64File)
      expect(Object.prototype.toString.call(file)).toBe('[object ArrayBuffer]')
    })

  })

  describe('file2Blob api test', () => {

    test('file2Blob api success test', () => {
      return Upload.file2Blob(file)
      .then(file => expect(file).toBeInstanceOf(Blob))
    })

  })

  describe('blob2file api test', () => {

    test('blob2file api success test', () => {
      const file = Upload.blob2file(blobFile)
      expect(file).toBeInstanceOf(File)
    })

  })

  describe('file2arraybuffer api test', () => {

    test('file2arraybuffer api success test', () => {
      return Upload.file2arraybuffer(file)
      .then(file => expect(file).toBeInstanceOf(ArrayBuffer))
    })

  })

  describe('blob2arraybuffer api test', () => {

    test('blob2arraybuffer api success test', () => {
      return Upload.blob2arraybuffer(blobFile)
      .then(file => expect(file).toBeInstanceOf(ArrayBuffer))
    })

  })

  describe('file2base64 api test', () => {

    test('file2base64 api success test', () => {
      const _file = new File([new ArrayBuffer(BASE_SIZE)], 'test.jpg', { type: 'image/jpeg' })
      return Upload.file2base64(_file)
      .then(file => expect(typeof file).toBe('string'))
    })

  })

  describe('blob2base64 api test', () => {

    test('blob2base64 api success test', () => {
      return Upload.blob2base64(blobFile.slice(0, BASE_SIZE))
      .then(file => expect(typeof file).toBe('string'))
    })

  })

  describe('arraybuffer2file api test', () => {

    test('arraybuffer2file api success test', () => {
      const file = Upload.arraybuffer2file(arrayBufferFile)
      expect(file).toBeInstanceOf(File)
    })

  })

  describe('arraybuffer2blob api test', () => {

    test('arraybuffer2blob api success test', () => {
      const file = Upload.arraybuffer2blob(arrayBufferFile)
      expect(file).toBeInstanceOf(Blob)
    })

  })

  describe('base642blob api test', () => {

    test('base642blob api success test', () => {
      const file = Upload.base642blob(base64File)
      expect(file).toBeInstanceOf(Blob)
    })

  })

  describe('base642file api test', () => {

    test('base642file api success test', () => {
      const file = Upload.base642file(base64File)
      expect(file).toBeInstanceOf(File)
    })

  })

})