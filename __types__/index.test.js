import { Upload } from '../src'
import { base64ToArrayBuffer, arrayBufferToBase64 } from '../src/utils/tool'

const exitDataFn = ({ filename, md5, suffix, size, chunkSize, chunksLength }) => {
  // data: Array<string | number>
  return []
}

const uploadFn = (data) => {}

const completeFn = ({ name: md5 }) => {}

const config = {
  retry: true,
  retryTimes: 3,
  chunkSize: 1024 * 500 * 20
}

const callback = (err, data) => {}

const arrayBufferFile = new ArrayBuffer(1024 * 1024 * 100)
const base64File = arrayBufferToBase64(arrayBufferFile)
const file = new File([arrayBufferFile], 'image/jpeg')
const blobFile = new Blob([arrayBufferFile])

const chunks = ['file', 'blob', 'base64', 'arraybuffer']

const mime = 'image/jpeg'

const md5 = '文件加密名称'

// let upload = new Upload({
//   //模拟小程序的arraybuffer与base64互相转换的方法
//   base64ToArrayBuffer,
//   arrayBufferToBase64
// })

const emitExpect = (target, targetKey) => {
  expect(target).toBeInstanceOf(Object)

  Object.keys(target).forEach(key => {
    if(key !== targetKey) {
      expect(target[key]).toBeInstanceOf(Array)
      expect(target[key]).toHaveLength(0)
    }else {
      expect(target[key]).toBeInstanceOf(Array)
      expect(target[key]).toHaveLength(1)
    }
  })
}



describe('upload chunk test', () => {

  describe('upload api', () => {

    describe('upload api success test', () => {

      test('upload api success', async () => {
        // const result = await upload.upload({
        //   exitDataFn,
        //   uploadFn,
        //   file,
        //   completeFn,
        //   callback,
        // })

        // expect(result).toBeInstanceOf(Array)
        // const [ names, emitResult ] = result

        // expect(names).toBeInstanceOf(Symbol)

        // emitExpect(emitResult, 'fulfilled')

      })

    })

  })

  // describe('on api', () => {

  //   describe('on api success test', () => {

  //     it('on api success', () => {

  //       const tasks = upload.on({
  //         exitDataFn,
  //         uploadFn,
  //         file,
  //         completeFn,
  //         callback,
  //       })
  //       expect(tasks).toBeInstanceOf(Array)
  //       expect(tasks.length).toBe(1)
  //       tasks.forEach(task => {
  //         expect(task).toBeInstanceOf(Symbol)
  //       })

  //     })

  //   })

    // describe('on api fail test', () => {

    //   test('on api fail because the task params of exitDataFn is not verify', () => {

    //     const tasks = upload.on({
    //       exitDataFn: null,
    //       uploadFn,
    //       file,
    //       completeFn,
    //       callback,
    //     })

    //     expect(tasks).toBeInstanceOf(Array)
    //     expect(tasks.length).toBe(0)

    //   })

    //   test('on api fail because the task params of uploadFn is not verify', () => {
        
    //     const tasks = upload.on({
    //       exitDataFn,
    //       uploadFn: null,
    //       file,
    //       completeFn,
    //       callback,
    //     })

    //     expect(tasks).toBeInstanceOf(Array)
    //     expect(tasks.length).toBe(0)

    //   })

    //   test('on api fail because lack of the task params of uploadFn', () => {
       
    //     const tasks = upload.on({
    //       exitDataFn,
    //       file,
    //       completeFn,
    //       callback,
    //     })

    //     expect(tasks).toBeInstanceOf(Array)
    //     expect(tasks.length).toBe(0)

    //   })

    //   test('on api fail because the task params of file is not verify', () => {
        
    //     const tasks = upload.on({
    //       exitDataFn,
    //       uploadFn,
    //       file: null,
    //       completeFn,
    //       callback,
    //     })

    //     expect(tasks).toBeInstanceOf(Array)
    //     expect(tasks.length).toBe(0)

    //   })

    //   test('on api fail because lack of the task params of file', () => {
        
    //     const tasks = upload.on({
    //       exitDataFn,
    //       uploadFn,
    //       completeFn,
    //       callback,
    //     })

    //     expect(tasks).toBeInstanceOf(Array)
    //     expect(tasks.length).toBe(0)

    //   })

    //   test('on api fail because lack of the task params of mime and the file type can not get the mime', () => {
        
    //     const tasks = upload.on({
    //       exitDataFn,
    //       uploadFn,
    //       file: blobFile,
    //       completeFn,
    //       callback,
    //     })

    //     expect(tasks).toBeInstanceOf(Array)
    //     expect(tasks.length).toBe(0)

    //   })

    //   test('on api fail because the chunks is post but the content is not verify file type', () => {
        
    //     const tasks = upload.on({
    //       exitDataFn,
    //       uploadFn,
    //       chunks: [ null, null ],
    //       completeFn,
    //       callback,
    //     })

    //     expect(tasks).toBeInstanceOf(Array)
    //     expect(tasks.length).toBe(0)

    //   })

    // })

  // })

  // describe('emit api', () => {

  //   describe('emit api success test', () => {

  //     let tasks 
  //     let _config = {
  //       exitDataFn,
  //       uploadFn,
  //       completeFn
  //     }

  //     const on = (config={}) => {
  //       tasks = upload.upload({
  //         ..._config,
  //         ...config,
  //       })
  //     }

  //     test('emit api success with file ', async () => {

  //       tasks = on({file})
  //       const result = await upload.emit(tasks)

  //       emitExpect(result, 'fulfilled')
        
  //     })

  //     test('emit api success with blob ', async () => {

  //       tasks = on({ 
  //         file: blobFile,
  //         mime
  //       })
  //       const result = await upload.emit(tasks)

  //       emitExpect(result, 'fulfilled')

  //     })

  //     test('emit api success with arraybuffer ', async () => {

  //       tasks = on({ file: arrayBufferFile, mime })
  //       const result = await upload.emit(tasks)

  //       emitExpect(result, 'fulfilled')

  //     })

  //     test('emit api success with chunks list file', async () => {

  //       //chunks分片预先分片

  //       tasks = on({
  //         chunks: [],
  //         mime,
  //         md5
  //       })
  //       const result = await upload.emit(tasks)

  //       emitExpect(result, 'fulfilled')

  //     })

  //     test('emit api success but the exitFn return the not verify data and all the chunks need upload', async () => {

  //       let times = 0

  //       tasks = on({
  //         ...config,
  //         file,
  //         exitDataFn: () => {
  //           return null
  //         },
  //         uploadFn: () => {
  //           times ++
  //         }
  //       })
  //       const result = await upload.emit(tasks)

  //       emitExpect(result, 'fulfilled')
  //       expect(times).toBe(20)

  //     })

  //   })

  //   describe('emit api fail test', () => {

  //     test('emit api fail because the task name is not found', async () => {

  //       const result = await upload.emit(null)

  //       expect(result).toBeInstanceOf(Array)
  //       expect(result).toHaveLength(2)
  //       expect(result[0]).toEqual(false)
  //       expect(result[1]).toBeNull

  //     })

  //   })

  // })

  // describe('start api', () => {

  //   describe('start api success test', () => {

  //     test('start api success', async () => {

  //       const tasks = uploa.on({
  //         exitDataFn,
  //         file,
  //         completeFn,
  //         uploadFn
  //       })

  //       const result = await upload.start(tasks)

  //       emitExpect(result, 'fulfilled')

  //     })

  //   })

  // })

  // describe('stop api', () => {

  //   describe('stop api success test', () => {

  //     let times = 0

  //     test('stop api success', async () => {

  //       //在emit中的stop中能找到当前指定队列名称任务
  //       const tasks = uploa.on({
  //         exitDataFn,
  //         file,
  //         completeFn,
  //         uploadFn: () => {
  //           times ++
  //         }
  //       })

  //       const result = upload.stop(tasks)

  //       expect(result).toBeInstanceOf(Array)
  //       expect(result).toHaveLength(1)

  //       //可以继续上传
  //       await upload.start(result)

  //       expect(times).toBe(20)

  //     })

  //   })

  //   describe('stop api fail test', () => {

  //     test('stop api fail because the task name is not found', () => {

  //       const result = upload.stop(null)

  //       //断言测试
  //       expect(result).toBeInstanceOf(Array)
  //       expect(result).toHaveLength(0)

  //     })

  //   })

  // })

  // describe('cancel api', () => {

  //   describe('cancel api success test', () => {

  //     test('cancel api success', async () => {
  //       //在emit中的stop中能找到当前指定队列名称任务
  //               //返回指定正确的队列名称
  //        //在emit中的stop中能找到当前指定队列名称任务
  //        const tasks = uploa.upload({
  //         exitDataFn,
  //         file,
  //         completeFn,
  //         uploadFn
  //       })

  //       const cancelResult = upload.cancel(tasks)

  //       expect(cancelResult).toBeInstanceOf(Array)
  //       expect(cancelResult).toHaveLength(1)

  //       //无法继续上传
  //       const result = await upload.start(result)

  //       expect(result).toBeInstanceOf(Array)
  //       expect(result).toHaveLength(0)

  //     })

  //   })

  //   describe('cancel api fail test', () => {

  //     test('cancel api fail because the tak name is not found', () => {
  //       //返回指定正确的队列名称
        
  //       const result = upload.cancel(null)
        
  //       expect(result).toBeInstanceOf(Array)
  //       expect(result).toHaveLength(0)

  //     })

  //   })

  // })

  // describe('cancelEmit api', () => {

  //   describe('cancelEmit api success test', () => {

  //     test('cancel api success', async () => {
  //       //取消了任务，在之后emit则表示无任务
  //               //返回指定正确的队列名称
  //        //在emit中的stop中能找到当前指定队列名称任务
  //        const tasks = uploa.on({
  //         exitDataFn,
  //         file,
  //         completeFn,
  //         uploadFn
  //       })

  //       const cancelResult = upload.cancelEmit(tasks)

  //       expect(cancelResult).toBeInstanceOf(Array)
  //       expect(cancelResult).toHaveLength(1)

  //       //无法继续上传，需要重新订阅
  //       const result = await upload.emit(result)

  //       emitExpect(null, result)

  //     })

  //   })

  //   describe('cancelEmit api fail test', () => {

  //     test('cancel api fail because the task is uploading', async () => {
  //       //在之后能再次执行任务

  //       let times = 0

  //       const tasks = uploa.upload({
  //         exitDataFn,
  //         file,
  //         completeFn,
  //         uploadFn: () => {
  //           times ++
  //         }
  //       })

  //       const result = upload.cancelEmit(tasks)

  //       expect(result).toBeInstanceOf(Array)
  //       expect(result).toHaveLength(0)

  //       //断言测试
  //       //无法停止正在执行的任务

  //       await new Promise((resolve, reject) => {
  //         setTimeout(() => {
  //           resolve()
  //         }, 3000)
  //       })

  //       expect(times).toBe(20)

  //     })

  //     test('cancel api fail because the task name is not found', () => {
  //       //在之后能再次执行任务

  //       const result = upload.cancelEmit(null)

  //       expect(result).toBeInstanceOf(Array)
  //       expect(result).toHaveLength(0)

  //     })

  //   })

  // })

  // describe('watch api', () => {

  //   describe('watch api success test', () => {

  //     test('watch api success', async () => {

  //       //返回正确的参数
  //       const tasks = upload.on({
  //         file,
  //         uploadFn: () => {
  //           const watch = upload.watch(tasks)
  //           expect(watch).toBeInstanceOf(Array)
  //           expect(watch).toHaveLength(1)
  //           watch.forEach(wa => {
  //             expect(wa).toBeInstanceOf(Object)
  //             expect(wa).toHaveProperty('process')
  //             expect(wa).toHaveProperty('name')
  //           })
  //         },
  //         completeFn
  //       })

  //       const result = await upload.emit(tasks)

  //     })

  //   })

  //   describe('watch api fail test', () => {

  //     test('watch api fail because the task name is not found', () => {

  //       //不返回参数
  //       const uploading = upload.watch(null)

  //       expect(uploading).toBeInstanceOf(Array)
  //       expect(uploading).toHaveLength(0)

  //     })

  //   })

  // })

  // describe('mini app analog', () => {

  //   //临时保存全局变量模拟小程序环境
  //   let Blob = window.Blob
  //   let File = window.File
  //   let FileReader = window.FileReader

  //   beforeAll(() => {
  //     window.Blob = undefined
  //     window.File = undefined
  //     window.FileReader = undefined
  //   })

  //   afterAll(() => {
  //     window.Blob = Blob
  //     window.File = File
  //     window.FileReader = FileReader
  //   })

  //   describe('mini app analog success test', () => {

  //     test('mini app analog with arraybuffer success', async () => {

  //       const tasks = upload.on({
  //         uploadFn,
  //         arrayBufferFile,
  //         completeFn,
  //         mime
  //       })

  //       const result = await upload.emit(tasks) 
        
  //       emitExpect('fulfilled', result)

  //     })

  //     test('mini app analog with base64 success', async () => {

  //       const tasks = upload.on({
  //         uploadFn,
  //         base64File,
  //         mime,
  //         completeFn
  //       })

  //       const result = await upload.emit(tasks)

  //       emitExpect('fulfilled', result)

  //     })

  //     test('mini app analog with chunks success', async () => {

  //       const tasks = upload.on({
  //         uploadFn,
  //         chunks,
  //         mime,
  //         completeFn
  //       })

  //       const result = await upload.emit(tasks)

  //       emitExpect('fulfilled', result)

  //     })

  //   })

  //   describe('mini app analog fail test', () => {

  //     let upload = new Upload()

  //     test('mini app analog fail becasue lack of the file transform api', () => {
  //       //未指定base64转换方法相关

  //       const result = upload.on({
  //         exitDataFn,
  //         base64File,
  //         mime,
  //         completeFn
  //       })

  //       expect(result).toBeInstanceOf(Array)
  //       expect(result).toHaveLength(0)

  //     })

  //   })

  // })

  // describe('error retry', () => {

  //   describe('error retry success test', () => {

  //     let times = 0
  //     let count = 0

  //     test('error retry success', async () => {

  //       //错误自动重试
  //       const tasks = upload.on({
  //         file,
  //         completeFn,
  //         uploadFn: () => {
  //           if(times < 3) {
  //             times ++
  //             throw new Error('retry test error')
  //           }else {
  //             return true
  //           }
  //         },
  //         config: {
  //           retry: true,
  //           retryTimes: 3,
  //           retryCallback: () => {
  //             count ++
  //           }
  //         }
  //       })

  //       const result = await upload.emit(tasks)

  //       emitExpect('fulfilled', result)
  //       expect(count).toBe(3)

  //     })

  //       test('error retry success and all the upload times all fail', async () => {

  //         //错误自动重试
  //         const tasks = upload.on({
  //           file,
  //           completeFn,
  //           uploadFn: () => {
  //             throw new Error('retry test all fail error')
  //           },
  //           config,
  //         })

  //         const result = await upload.emit(tasks)

  //         emitExpect('rejected', result)

  //     })

  //   })

  // })

})