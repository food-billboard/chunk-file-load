import { Upload } from '../src'
import { isSymbol } from '../src/utils/tool'
import { 
  exitDataFn, 
  uploadFn, 
  completeFn, 
  config, 
  file,
  isTask
} from './constants'

let upload = new Upload()

describe('request method test', () => {

  describe('request params test', () => {

    test('request params test', (done) => {

      const result = upload.upload({
        config,
        request: {
          exitDataFn: (params, name, task) => {
            expect(params).toBeInstanceOf(Object)
            const { filename, md5, suffix, size, chunksLength, chunkSize } = params 
            expect(typeof filename).toEqual("string")
            expect(typeof md5).toEqual("string")
            expect(typeof suffix).toEqual("string")
            expect(typeof size).toEqual("number")
            expect(typeof chunksLength).toEqual("number")
            expect(typeof chunkSize).toEqual("number")
            expect(typeof name).toEqual("symbol")
            isTask(task)
            return exitDataFn(params, name, task)
          },
          uploadFn: (data, name, task) => {
            isTask(task)
            let file, md5, index;
            if(data.get) {
              file = data.get("file")
              md5 = data.get("md5")
              index = data.get("index")
            }else {
              file = data.file 
              md5 = data.md5 
              index = data.index 
            }
            expect(file).toBeDefined()
            expect(typeof md5).toEqual("string")
            expect(typeof index === "number" || typeof index === "string").toBeTruthy()
            expect()
            expect(typeof name).toEqual("symbol")
            return uploadFn(data, name, task)
          },
          completeFn: (params, paramsName, task) => {
            expect(params).toBeDefined()
            const { name, md5 } = params
            expect(typeof name).toEqual("symbol")
            expect(typeof md5).toEqual("string")
            isTask(task)
            expect(typeof paramsName).toEqual("symbol")
            return completeFn(params, paramsName, task)
          },
          callback: (err, value) => {
            try {
              if(err) {
                done(err)
              }else {
                expect(typeof value).toEqual("symbol")
                done()
              }
            }catch(err) {
              done(err)
            }
          },
        },
        file: {
          file
        }
      })

      expect(result).toBeInstanceOf(Array)
    
      result.forEach(name => expect(isSymbol(name)).toBeTruthy())

    })

  })

})