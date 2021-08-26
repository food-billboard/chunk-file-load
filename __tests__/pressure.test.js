import { Upload } from '../src'
import { 
  sleep,
  totalChunks,
  file,
  BASE_SIZE,
  FILE_SIZE
} from './constants'

let upload = new Upload()

describe(`pressure test`, () => {

  test(`many task add and deal`, (done) => {

    const totalTask = 20

    let names = []
    let results = []
    let resultCounter = 0 
    const defaultValue = {
      exitDataFn: 0,
      uploadFn: 0,
      completeFn: 0,
      callback: false,
      beforeRead: 0,
      reading: 0,
      beforeCheck: 0,
      afterCheck: 0,
      uploading: 0,
      beforeComplete: 0,
      afterComplete: 0,
      retry: 0,
    }
    const validValue = {
      exitDataFn: 1,
      uploadFn: totalChunks,
      completeFn: 1,
      callback: true,
      beforeRead: 1,
      reading: totalChunks,
      beforeCheck: 1,
      afterCheck: 1,
      uploading: totalChunks,
      beforeComplete: 1,
      afterComplete: 1,
      retry: 0,
    }

    const validate = () => {
      try {
        results.forEach((result, index) => {
          Object.entries(result).forEach(item => {
            const [ key, value ] = item
            expect(validValue[key] === value).toBe(true) 
          })
        })
        done()
      }catch(err) {
        done(err)
      }
    }

    const defaultConfig = (index) => {
      return {
        config: {
          chunkSize: BASE_SIZE,
        },
        file: {
          file
        },
        request: {
          exitDataFn(){
            results[index].exitDataFn ++
            return {
              data: 0
            }
          },
          uploadFn(data) {
            const currIndex = data.get("index")
            results[index].uploadFn ++
            const result = BASE_SIZE * (+currIndex + 1)
            return {
              data: FILE_SIZE < result ? FILE_SIZE : result 
            }
          },
          completeFn() {
            results[index].completeFn ++
          },
          callback(err, value) {
            results[index].callback = !!value
            resultCounter ++
            expect(!!err).toBe(false)
            if(resultCounter === totalTask) {
              validate()
            }
          }
        },
        lifecycle: {
          beforeRead: ({ name, task }) => {
            results[index].beforeRead ++
          },
          reading: ({ name, task, current, total }) => {
            results[index].reading ++
          },
          beforeCheck({ name, task }) {
            results[index].beforeCheck ++
          },
          afterCheck({ name, task, isExists }) {
            results[index].afterCheck ++
          },
          uploading({ name, current, total, complete }) {
            results[index].uploading ++
          },
          beforeComplete({ isExists }) {
            results[index].beforeComplete ++
          },
          afterComplete({ name, task, success }) {
            results[index].afterComplete ++
          },
          retry() {
            results[index].retry ++
          }
        }
      }
    }

    async function addTask() {
      
      for(let i = 0; i < totalTask; i ++) {
        await sleep()
        const config = defaultConfig(i)
        const [ name ] = upload.add(config)
        expect(!!name).toBe(true)
        names.push(name)
        results.push({ ...defaultValue })
      }

    }

    async function dealTask() {
      for(let i = 0; i < names.length; i ++) {
        await sleep()
        const [ name ] = upload.deal(names[i])
        expect(!!name).toBe(true)
      }
    }

    addTask()
    .then(() => dealTask())
    .catch(err => {
      done(err)
    })

  })

  test(`stop the task and the process will be unBusy`, (done) => {

    let totalTask = 5 
    try {
      totalTask = window.navigator.hardwareConcurrency || totalTask
    }catch(err) {}

    let names = []
    let results = []
    let resultCounter = 0 
    const defaultValue = {
      exitDataFn: 0,
      uploadFn: 0,
      completeFn: 0,
      callback: false,
      beforeRead: 0,
      reading: 0,
      beforeCheck: 0,
      afterCheck: 0,
      uploading: 0,
      beforeComplete: 0,
      afterComplete: 0,
      retry: 0,
    }
    const validValue = {
      exitDataFn: 1,
      uploadFn: totalChunks,
      completeFn: 1,
      callback: true,
      beforeRead: 1,
      reading: totalChunks,
      beforeCheck: 1,
      afterCheck: 1,
      uploading: totalChunks,
      beforeComplete: 1,
      afterComplete: 1,
      retry: 0,
    }

    const validate = () => {
      try {
        const [ stopTarget ] = results
        expect(stopTarget.exitDataFn).toBe(validValue.exitDataFn)
        expect(stopTarget.uploadFn).toBe(defaultValue.uploadFn)
        expect(stopTarget.completeFn).toBe(defaultValue.completeFn)
        expect(stopTarget.callback).toBe(validValue.callback)
        expect(stopTarget.beforeRead).toBe(validValue.beforeRead)
        expect(stopTarget.reading).toBe(validValue.reading)
        expect(stopTarget.beforeCheck).toBe(validValue.beforeCheck)
        expect(stopTarget.afterCheck).toBe(validValue.afterCheck)
        expect(stopTarget.uploading).toBe(defaultValue.uploading)
        expect(stopTarget.beforeComplete).toBe(defaultValue.beforeComplete)
        expect(stopTarget.afterComplete).toBe(defaultValue.afterComplete)
        expect(stopTarget.retry).toBe(defaultValue.retry)

        results.slice(1).forEach((result, index) => {
          Object.entries(result).forEach(item => {
            const [ key, value ] = item
            expect(validValue[key] === value).toBe(true) 
          })
        })
        done()
      }catch(err) {
        done(err)
      }
    }

    const defaultConfig = (index) => {
      return {
        config: {
          chunkSize: BASE_SIZE,
        },
        file: {
          file
        },
        request: {
          exitDataFn(){
            results[index].exitDataFn ++
            return {
              data: 0
            }
          },
          uploadFn(data) {
            const currIndex = data.get("index")
            results[index].uploadFn ++
            const result = BASE_SIZE * (+currIndex + 1)
            return {
              data: FILE_SIZE < result ? FILE_SIZE : result 
            }
          },
          completeFn() {
            results[index].completeFn ++
          },
          callback(err, value) {
            results[index].callback = !!value
            resultCounter ++
            expect(!!err).toBe(index == 0)
            if(resultCounter === totalTask) {
              validate()
            }
          }
        },
        lifecycle: {
          beforeRead: () => {
            results[index].beforeRead ++
          },
          reading: () => {
            results[index].reading ++
          },
          beforeCheck() {
            results[index].beforeCheck ++
          },
          afterCheck({ name }) {
            if(index === 0) upload.stop(name)
            results[index].afterCheck ++
          },
          uploading() {
            results[index].uploading ++
          },
          beforeComplete() {
            results[index].beforeComplete ++
          },
          afterComplete() {
            results[index].afterComplete ++
          },
          retry() {
            results[index].retry ++
          }
        }
      }
    }

    async function addTask() {
      
      for(let i = 0; i < totalTask; i ++) {
        await sleep()
        const config = defaultConfig(i)
        const [ name ] = upload.add(config)
        expect(!!name).toBe(true)
        names.push(name)
        results.push({ ...defaultValue })
      }

    }

    async function dealTask() {
      for(let i = 0; i < names.length; i ++) {
        await sleep()
        const [ name ] = upload.deal(names[i])
        expect(!!name).toBe(true)
      }
    }

    addTask()
    .then(() => dealTask())
    .catch(err => {
      done(err)
    })

  })

})