import { WeUpload } from '../src'

describe('weapp upload chunk test', () => {

  describe('weapp upload chunk success test', () => {

    it('weapp upload chunk success', () => {

    })

    it('weapp uplopad chunk success and upload the base64 file', () => {

    })

    it('weapp upload chunk success and upload the arraybuffer file', () => {

    })

    it('weapp upload chunk success and upload the chunks file', () => {
      
    })

  })

  describe('weapp upload chunk fail test', () => {
    
    it('weapp upload chunk fail because the slice function is not support', () => {

    })

  })

})


  // describe('mini app analog', () => {

  //   //临时保存全局变量模拟小程序环境
  //   let Blob = window.Blob
  //   let File = window.File
  //   let FileReader = window.FileReader
  //   // let atob = window.atob
  //   let upload

  //   beforeAll(() => {
  //     window.Blob = undefined
  //     window.File = undefined
  //     window.FileReader = undefined
  //     // window.atob = undefined
  //     upload = new Upload({
  //       //模拟小程序的arraybuffer与base64互相转换的方法
  //       base64ToArrayBuffer,
  //       arrayBufferToBase64
  //     })
  //   })

  //   afterAll(() => {
  //     window.Blob = Blob
  //     window.File = File
  //     window.FileReader = FileReader
  //     // window.atob = atob
  //   })

  //   describe('mini app analog success test', () => {

  //     test('mini app analog with arraybuffer success', async () => {

  //       const tasks = upload.on({
  //         uploadFn,
  //         file: arrayBufferFile,
  //         completeFn,
  //         mime
  //       })

  //       const result = await upload.emit(tasks) 
        
  //       emitExpect(result, 'fulfilled')

  //     })

  //     test('mini app analog with base64 success', async () => {

  //       const tasks = upload.on({
  //         uploadFn,
  //         file: base64File,
  //         mime,
  //         completeFn
  //       })

  //       const result = await upload.emit(tasks)

  //       emitExpect(result, 'fulfilled')

  //     })

  //     test('mini app analog with chunks success', async () => {

  //       let chunks = []

  //       let totalChunks = Math.ceil(FILE_SIZE / config.chunkSize),
  //           bufferSlice = ArrayBuffer.prototype.slice

  //       while(chunks.length < totalChunks) {
  //         let start = currentChunk * config.chunkSize,
  //             end = currentChunk + 1 === totalChunks ? FILE_SIZE : ( currentChunk + 1 ) * config.chunkSize
  //         const chunk = bufferSlice.call(arrayBufferFile, start, end)

  //         chunks.push(chunk)
  //       }

  //       const tasks = upload.on({
  //         uploadFn,
  //         chunks,
  //         mime,
  //         completeFn
  //       })

  //       const result = await upload.emit(tasks)

  //       emitExpect(result, 'fulfilled')

  //     })

  //   })

  //   describe('mini app analog fail test', () => {

  //     let upload = new Upload()

  //     test('mini app analog fail becasue lack of the file transform api', () => {
  //       //未指定base64转换方法相关

  //       const result = upload.on({
  //         exitDataFn,
  //         file: base64File,
  //         mime,
  //         completeFn
  //       })

  //       expect(result).toBeInstanceOf(Array)
  //       expect(result).toHaveLength(0)

  //     })

  //   })

  // })