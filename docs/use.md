
## 基本使用示例

下面的示例都是基于普通`Upload`的例子  

### 基础使用 
```jsx
  import React, { useRef, useState } from 'react'
  import { Button } from 'antd'
  import { Upload } from 'chunk-file-upload'

  const UploadInstance = new Upload()

  const sleep = async (times=1000) => new Promise(resolve => setTimeout(resolve, times))

  export default () => {

    const inputRef = useRef()
    const [ processMessageList, setProcessMessageList ] = useState([])

    const handleUpload = () => {
      inputRef.current.click()
    }

    const exitDataFn = async () => {
      setProcessMessageList(prev => {
        prev.push(`文件存在检查中`)
        return prev 
      })
      await sleep()
      return {
        data: 0
      }
    }

    const uploadFn = async (data, name) => {
      const index = data.get("index")
      const task = UploadInstance.getTask(name)
      const size = task.file.size 
      const chunkSize = task.config.chunkSize 
      const nextOffset = chunkSize * Number(index)
      setProcessMessageList(prev => {
        prev.push(`文件上传中: 第${index}片`)
        return [
          ...prev
        ] 
      })
      await sleep()
      return {
        data: nextOffset > size ? size : nextOffset 
      }
    }

    const completeFn = () => {
      setProcessMessageList(prev => {
        prev.push(`文件完成保存中`)
        return [
          ...prev
        ] 
      })
    }

    const callback = (error) => {
      let message = ""
      if(error) {
        message = `文件上传出错: ${error.error}`
      }else {
        message = "文件上传成功"
      }
      setProcessMessageList(prev => {
        prev.push(message)
        return [
          ...prev
        ]  
      })
    }

    const reading = async ({ current }) => {
      await sleep()
      setProcessMessageList(prev => {
        prev.push(`文件解析中，当前索引: ${current}`)
        return [
          ...prev
        ]  
      })
    }

    const onFileChange = (e) => {
      const [ file ] = e.target.files
      if(!file) return  
      setProcessMessageList([])
      UploadInstance.upload({
        file: {
          file,
        },
        request: {
          exitDataFn,
          uploadFn,
          completeFn,
          callback
        },
        lifecycle: {
          reading
        }
      })
    }

    return (
      <>
        <input onChange={onFileChange} style={{display: 'none'}} type="file" ref={inputRef} />
        <Button onClick={handleUpload}>
          点击上传
        </Button>
        <ul style={{marginTop: 24}}>
          <li>上传进度: </li>
          {
            processMessageList.map(item => {
              return (
                <li key={item}> 
                  {item}
                </li>
              )
            })
          }
        </ul>
      </>
    )

  }

```

### 生命周期  
```jsx
  import React, { useRef, useState } from 'react'
  import { Button } from 'antd'
  import { Upload } from 'chunk-file-upload'

  const UploadInstance = new Upload()

  const sleep = async (times=1000) => new Promise(resolve => setTimeout(resolve, times))

  export default () => {

    const inputRef = useRef()
    const [ processMessageList, setProcessMessageList ] = useState([])

    const handleUpload = () => {
      inputRef.current.click()
    }

    const exitDataFn = async () => {
      await sleep()
      return {
        data: 0
      }
    }

    const uploadFn = async (data, name) => {
      const index = data.get("index")
      const task = UploadInstance.getTask(name)
      const size = task.file.size 
      const chunkSize = task.config.chunkSize 
      const nextOffset = chunkSize * Number(index)
      await sleep()
      return {
        data: nextOffset > size ? size : nextOffset 
      }
    }

    const callback = (error) => {
      let message = ""
      if(error) {
        message = `文件上传出错: ${error.error}`
      }else {
        message = "文件上传成功"
      }
      setProcessMessageList(prev => {
        prev.push(message)
        return [
          ...prev
        ]  
      })
    }

    const beforeRead = async () => {
      await sleep()
      setProcessMessageList(prev => {
        prev.push(`文件解析前`)
        return [
          ...prev
        ]  
      })
    } 

    const reading = async ({ current }) => {
      await sleep()
      setProcessMessageList(prev => {
        prev.push(`文件解析中，当前索引: ${current}`)
        return [
          ...prev
        ]  
      })
    }

    const beforeCheck = async () => {
      await sleep()
      setProcessMessageList(prev => {
        prev.push(`文件存在检查前`)
        return [
          ...prev
        ]  
      })
    }

    const afterCheck = async ({ isExists }) => {
      await sleep()
      setProcessMessageList(prev => {
        prev.push(`文件存在检查完成，文件${isExists ? "" : "不"}存在`)
        return [
          ...prev
        ]  
      })
    }

    const uploading = async ({ current }) => {
      await sleep()
      setProcessMessageList(prev => {
        prev.push(`文件上传中，当前分片: ${current}`)
        return [
          ...prev
        ]  
      })
    }

    const beforeComplete = async () => {
      await sleep()
      setProcessMessageList(prev => {
        prev.push(`文件上传完成保存`)
        return [
          ...prev
        ]  
      })
    }

    const afterComplete = async ({ current }) => {
      await sleep()
      setProcessMessageList(prev => {
        prev.push(`文件上传完成保存成功`)
        return [
          ...prev
        ]  
      })
    }

    const onFileChange = (e) => {
      const [ file ] = e.target.files
      if(!file) return  
      setProcessMessageList([])
      UploadInstance.upload({
        file: {
          file,
        },
        request: {
          exitDataFn,
          uploadFn,
          callback
        },
        lifecycle: {
          beforeRead,
          reading,
          beforeCheck,
          afterCheck,
          uploading,
          beforeComplete,
          afterComplete
        }
      })
    }

    return (
      <>
        <input onChange={onFileChange} style={{display: 'none'}} type="file" ref={inputRef} />
        <Button onClick={handleUpload}>
          点击上传
        </Button>
        <ul style={{marginTop: 24}}>
          <li>上传进度: </li>
          {
            processMessageList.map(item => {
              return (
                <li key={item}> 
                  {item}
                </li>
              )
            })
          }
        </ul>
      </>
    )

  }

```

### Blob 上传  
```jsx
  import React, { useRef, useState } from 'react'
  import { Button } from 'antd'
  import { Upload } from 'chunk-file-upload'

  const UploadInstance = new Upload()

  const sleep = async (times=1000) => new Promise(resolve => setTimeout(resolve, times))

  export default () => {

    const inputRef = useRef()
    const [ processMessageList, setProcessMessageList ] = useState([])

    const handleUpload = () => {
      inputRef.current.click()
    }

    const exitDataFn = async () => {
      setProcessMessageList(prev => {
        prev.push(`文件存在检查中`)
        return prev 
      })
      await sleep()
      return {
        data: 0
      }
    }

    const uploadFn = async (data, name) => {
      const index = data.get("index")
      const task = UploadInstance.getTask(name)
      const size = task.file.size 
      const chunkSize = task.config.chunkSize 
      const nextOffset = chunkSize * Number(index)
      setProcessMessageList(prev => {
        prev.push(`文件上传中: 第${index}片`)
        return [
          ...prev
        ] 
      })
      await sleep()
      return {
        data: nextOffset > size ? size : nextOffset 
      }
    }

    const completeFn = () => {
      setProcessMessageList(prev => {
        prev.push(`文件完成保存中`)
        return [
          ...prev
        ] 
      })
    }

    const callback = (error) => {
      let message = ""
      if(error) {
        message = `文件上传出错: ${error.error}`
      }else {
        message = "文件上传成功"
      }
      setProcessMessageList(prev => {
        prev.push(message)
        return [
          ...prev
        ]  
      })
    }

    const reading = async ({ current }) => {
      await sleep()
      setProcessMessageList(prev => {
        prev.push(`文件解析中，当前索引: ${current}`)
        return [
          ...prev
        ]  
      })
    }

    const onFileChange = async (e) => {
      const [ file ] = e.target.files
      if(!file) return  
      setProcessMessageList([])
      const blobFile = await Upload.file2Blob(file)
      UploadInstance.upload({
        file: {
          file: blobFile,
        },
        request: {
          exitDataFn,
          uploadFn,
          completeFn,
          callback
        },
        lifecycle: {
          reading
        }
      })
    }

    return (
      <>
        <input onChange={onFileChange} style={{display: 'none'}} type="file" ref={inputRef} />
        <p>文件会被转换成<strong>Blob</strong>格式</p>
        <Button onClick={handleUpload}>
          点击上传
        </Button>
        <ul style={{marginTop: 24}}>
          <li>上传进度: </li>
          {
            processMessageList.map(item => {
              return (
                <li key={item}> 
                  {item}
                </li>
              )
            })
          }
        </ul>
      </>
    )

  } 
```

### ArrayBuffer 上传  
```jsx
  import React, { useRef, useState } from 'react'
  import { Button } from 'antd'
  import { Upload } from 'chunk-file-upload'

  const UploadInstance = new Upload()

  const sleep = async (times=1000) => new Promise(resolve => setTimeout(resolve, times))

  export default () => {

    const inputRef = useRef()
    const [ processMessageList, setProcessMessageList ] = useState([])

    const handleUpload = () => {
      inputRef.current.click()
    }

    const exitDataFn = async () => {
      setProcessMessageList(prev => {
        prev.push(`文件存在检查中`)
        return prev 
      })
      await sleep()
      return {
        data: 0
      }
    }

    const uploadFn = async (data, name) => {
      const index = data.get("index")
      const task = UploadInstance.getTask(name)
      const size = task.file.size 
      const chunkSize = task.config.chunkSize 
      const nextOffset = chunkSize * Number(index)
      setProcessMessageList(prev => {
        prev.push(`文件上传中: 第${index}片`)
        return [
          ...prev
        ] 
      })
      await sleep()
      return {
        data: nextOffset > size ? size : nextOffset 
      }
    }

    const completeFn = () => {
      setProcessMessageList(prev => {
        prev.push(`文件完成保存中`)
        return [
          ...prev
        ] 
      })
    }

    const callback = (error) => {
      let message = ""
      if(error) {
        message = `文件上传出错: ${error.error}`
      }else {
        message = "文件上传成功"
      }
      setProcessMessageList(prev => {
        prev.push(message)
        return [
          ...prev
        ]  
      })
    }

    const reading = async ({ current }) => {
      await sleep()
      setProcessMessageList(prev => {
        prev.push(`文件解析中，当前索引: ${current}`)
        return [
          ...prev
        ]  
      })
    }

    const onFileChange = async (e) => {
      const [ file ] = e.target.files
      if(!file) return  
      setProcessMessageList([])
      const bufferFile = await Upload.file2arraybuffer(file)
      UploadInstance.upload({
        file: {
          file: bufferFile,
          mime: file.type 
        },
        request: {
          exitDataFn,
          uploadFn,
          completeFn,
          callback
        },
        lifecycle: {
          reading
        }
      })
    }

    return (
      <>
        <input onChange={onFileChange} style={{display: 'none'}} type="file" ref={inputRef} />
        <p>文件会被转换成<strong>ArrayBuffer</strong>格式</p>
        <Button onClick={handleUpload}>
          点击上传
        </Button>
        <ul style={{marginTop: 24}}>
          <li>上传进度: </li>
          {
            processMessageList.map(item => {
              return (
                <li key={item}> 
                  {item}
                </li>
              )
            })
          }
        </ul>
      </>
    )

  } 
```

### Base64 上传  
```jsx
  import React, { useRef, useState } from 'react'
  import { Button, message } from 'antd'
  import { Upload } from 'chunk-file-upload'

  const UploadInstance = new Upload()

  const sleep = async (times=1000) => new Promise(resolve => setTimeout(resolve, times))

  export default () => {

    const inputRef = useRef()
    const [ processMessageList, setProcessMessageList ] = useState([])

    const handleUpload = () => {
      inputRef.current.click()
    }

    const exitDataFn = async () => {
      setProcessMessageList(prev => {
        prev.push(`文件存在检查中`)
        return prev 
      })
      await sleep()
      return {
        data: 0
      }
    }

    const uploadFn = async (data, name) => {
      const index = data.get("index")
      const task = UploadInstance.getTask(name)
      const size = task.file.size 
      const chunkSize = task.config.chunkSize 
      const nextOffset = chunkSize * Number(index)
      setProcessMessageList(prev => {
        prev.push(`文件上传中: 第${index}片`)
        return [
          ...prev
        ] 
      })
      await sleep()
      return {
        data: nextOffset > size ? size : nextOffset 
      }
    }

    const completeFn = () => {
      setProcessMessageList(prev => {
        prev.push(`文件完成保存中`)
        return [
          ...prev
        ] 
      })
    }

    const callback = (error) => {
      let message = ""
      if(error) {
        message = `文件上传出错: ${error.error}`
      }else {
        message = "文件上传成功"
      }
      setProcessMessageList(prev => {
        prev.push(message)
        return [
          ...prev
        ]  
      })
    }

    const reading = async ({ current }) => {
      await sleep()
      setProcessMessageList(prev => {
        prev.push(`文件解析中，当前索引: ${current}`)
        return [
          ...prev
        ]  
      })
    }

    const onFileChange = async (e) => {
      const [ file ] = e.target.files
      if(!file) return
      if(file.size > 1024 * 500) {
        message.info("文件过大")
        return 
      }  
      setProcessMessageList([])
      const base64File = await Upload.file2base64(file)
      UploadInstance.upload({
        file: {
          file: base64File,
          mime: file.type,
        },
        request: {
          exitDataFn,
          uploadFn,
          completeFn,
          callback
        },
        lifecycle: {
          reading
        }
      })
    }

    return (
      <>
        <input onChange={onFileChange} style={{display: 'none'}} type="file" ref={inputRef} />
        <p>文件会被转换成<strong>Base64</strong>格式</p>
        <p>尽量上传小一点的文件</p>
        <Button onClick={handleUpload}>
          点击上传
        </Button>
        <ul style={{marginTop: 24}}>
          <li>上传进度: </li>
          {
            processMessageList.map(item => {
              return (
                <li key={item}> 
                  {item}
                </li>
              )
            })
          }
        </ul>
      </>
    )

  } 
```

### 监听文件上传进度  
```jsx
  import React, { useRef, useState } from 'react'
  import { Button, Progress, message } from 'antd'
  import { Upload } from 'chunk-file-upload'

  const UploadInstance = new Upload()

  const sleep = async (times=1000) => new Promise(resolve => setTimeout(resolve, times))

  export default () => {

    const inputRef = useRef()
    const [ process, setProcess ] = useState(0)
    let isError = false 

    const handleUpload = () => {
      inputRef.current.click()
    }

    const exitDataFn = async () => {
      setProcess(_ => {
        return 0 
      })
      await sleep()
      return {
        data: 0
      }
    }

    const uploadFn = async (data, name) => {
      const index = data.get("index")
      const task = UploadInstance.getTask(name)
      const size = task.file.size 
      const chunkSize = task.config.chunkSize 
      let nextOffset = chunkSize * Number(index)
      nextOffset = nextOffset > size ? size : nextOffset 
      setProcess(_ => {
        return nextOffset / size 
      })
      await sleep()
      return {
        data: nextOffset
      }
    }

    const completeFn = () => {
      setProcess(_ => {
        return 1
      })
    }

    const callback = (error) => {
      if(error) {
        message.error(`文件上传出错: ${error.error}`)
        isError = true 
      }else {
        message.info("文件上传成功")
      }
      setProcess(prev => {
        return prev
      })
    }

    const onFileChange = (e) => {
      const [ file ] = e.target.files
      if(!file) return  
      setProcess(0)
      UploadInstance.upload({
        file: {
          file,
        },
        request: {
          exitDataFn,
          uploadFn,
          completeFn,
          callback
        },
      })
    }

    return (
      <>
        <input onChange={onFileChange} style={{display: 'none'}} type="file" ref={inputRef} />
        <Button onClick={handleUpload}>
          点击上传
        </Button>
        <p>上传进度</p>
        <div style={{width: "60%"}}>
          <Progress percent={process * 100} status={isError ? "exception" : undefined} />
        </div>
      </>
    )

  }
```

### 控制上传
```jsx
  import React, { useRef, useState } from 'react'
  import { Button, Space } from 'antd'
  import { Upload } from 'chunk-file-upload'

  const UploadInstance = new Upload()

  const sleep = async (times=1000) => new Promise(resolve => setTimeout(resolve, times))

  export default () => {

    const inputRef = useRef()
    const [ processMessageList, setProcessMessageList ] = useState([])
    const [ isStop, setIsStop ] = useState(false)
    const [ loading, setLoading ] = useState(false)
    const [ fileList, setFileList ] = useState([])

    const handleUpload = () => {
      inputRef.current.click()
    }

    const exitDataFn = async () => {
      setProcessMessageList(prev => {
        prev.push(`文件存在检查中, ${new Date().toString()}`)
        return prev 
      })
      await sleep()
      return {
        data: 0
      }
    }

    const uploadFn = async (data, name) => {
      const index = data.get("index")
      const task = UploadInstance.getTask(name)
      const size = task.file.size 
      const chunkSize = task.config.chunkSize 
      const nextOffset = chunkSize * Number(index)
      setProcessMessageList(prev => {
        prev.push(`文件上传中: 第${index}片, ${new Date().toString()}`)
        return [
          ...prev
        ] 
      })
      await sleep()
      return {
        data: nextOffset > size ? size : nextOffset 
      }
    }

    const completeFn = () => {
      setProcessMessageList(prev => {
        prev.push(`文件完成保存中, ${new Date().toString()}`)
        return [
          ...prev
        ] 
      })
    }

    const callback = (error) => {
      let message = ""
      if(error) {
        message = `文件上传出错: ${error.error}, ${new Date().toString()}`
      }else {
        message = `文件上传成功, ${new Date().toString()}`
      }
      setProcessMessageList(prev => {
        prev.push(message)
        return [
          ...prev
        ]  
      })
    }

    const reading = async ({ current }) => {
      await sleep()
      setProcessMessageList(prev => {
        prev.push(`文件解析中，当前索引: ${current}, ${new Date().toString()}`)
        return [
          ...prev
        ]  
      })
    }

    const afterStop = async () => {
      await sleep()
      setProcessMessageList(prev => {
        prev.push(`任务上传暂停, ${new Date().toString()}`)
        return [
          ...prev
        ]  
      })
    }

    const afterCancel = async () => {
      await sleep()
      setProcessMessageList(prev => {
        prev.push(`任务上传取消, ${new Date().toString()}`)
        return [
          ...prev
        ]  
      })
    }

    const onFileChange = (e) => {
      const [ file ] = e.target.files
      if(!file) return  
      setProcessMessageList([])
      const result = UploadInstance.upload({
        file: {
          file,
        },
        request: {
          exitDataFn,
          uploadFn,
          completeFn,
          callback
        },
        lifecycle: {
          reading,
          afterStop,
          afterCancel
        }
      })
      setFileList(result)
    }

    const handleStop = async () => {
       const [ fileName ] = fileList
      if(loading || !fileName) return 
      setLoading(true)
      const method = isStop ? UploadInstance.start : UploadInstance.stop 
      const message = isStop ? "你执行了继续上传操作" : "你执行了暂停上传操作"
      await sleep()
      method.call(UploadInstance, fileName)
      setIsStop(prev => !prev)
      setProcessMessageList(prev => {
        prev.push(`${message}, ${new Date().toString()}`)
        return prev 
      })
      setLoading(false)
    }

    const handleCancel = async () => {
      const [ fileName ] = fileList
      if(loading || !fileName) return 
      setLoading(true)
      const task = UploadInstance.getTask(fileName)
      const isTaskCancelAdd = task.tool.file.isTaskCancelAdd()
      const method = isTaskCancelAdd ? UploadInstance.cancelAdd : UploadInstance.cancel 
      const message = isTaskCancelAdd ? "你执行了取消添加任务操作" : "你执行了取消任务上传操作"
      await sleep()
      method.call(UploadInstance, fileName)
      setProcessMessageList(prev => {
        prev.push(`${message}, ${new Date().toString()}`)
        return prev 
      })
      setFileList([])
      setLoading(false)
    }

    return (
      <>
        <input onChange={onFileChange} style={{display: 'none'}} type="file" ref={inputRef} />
        <Space>
          <Button loading={loading} onClick={handleUpload}>
            点击上传
          </Button>
          <Button loading={loading} onClick={handleStop}>
            {
              isStop ? "继续上传" : "暂停上传"
            }
          </Button>
          <Button loading={loading} onClick={handleCancel}>
            取消上传
          </Button>
        </Space>
        <ul style={{marginTop: 24}}>
          <li>上传进度: </li>
          {
            processMessageList.map(item => {
              return (
                <li key={item}> 
                  {item}
                </li>
              )
            })
          }
        </ul>
      </>
    )

  }
```

### 错误重试  
```jsx
  import React, { useRef, useState } from 'react'
  import { Button } from 'antd'
  import { Upload } from 'chunk-file-upload'

  const UploadInstance = new Upload()

  const sleep = async (times=1000) => new Promise(resolve => setTimeout(resolve, times))

  export default () => {

    const inputRef = useRef()
    const [ processMessageList, setProcessMessageList ] = useState([])
    let errorTimes = 0 

    const handleUpload = () => {
      inputRef.current.click()
    }

    const exitDataFn = async () => {
      setProcessMessageList(prev => {
        prev.push(`文件存在检查中, ${new Date().toString()}`)
        return prev 
      })
      await sleep()
      return {
        data: 0
      }
    }

    const uploadFn = async (data, name) => {
      errorTimes ++ 
      if(errorTimes <= 2) {
        throw new Error("上传失败重试测试")
      }
      const index = data.get("index")
      const task = UploadInstance.getTask(name)
      const size = task.file.size 
      const chunkSize = task.config.chunkSize 
      const nextOffset = chunkSize * Number(index)
      setProcessMessageList(prev => {
        prev.push(`文件上传中: 第${index}片, ${new Date().toString()}`)
        return [
          ...prev
        ] 
      })
      await sleep()
      return {
        data: nextOffset > size ? size : nextOffset 
      }
    }

    const completeFn = () => {
      setProcessMessageList(prev => {
        prev.push(`文件完成保存中, ${new Date().toString()}`)
        return [
          ...prev
        ] 
      })
    }

    const callback = (error) => {
      let message = ""
      if(error) {
        message = `文件上传出错: ${error.error}, ${new Date().toString()}`
      }else {
        message = `文件上传成功, ${new Date().toString()}`
      }
      setProcessMessageList(prev => {
        prev.push(message)
        return [
          ...prev
        ]  
      })
    }

    const reading = async ({ current }) => {
      await sleep()
      setProcessMessageList(prev => {
        prev.push(`文件解析中，当前索引: ${current}, ${new Date().toString()}`)
        return [
          ...prev
        ]  
      })
    }

    const retry = async () => {
      await sleep()
      setProcessMessageList(prev => {
        prev.push(`文件上传重试, ${new Date().toString()}`)
        return [
          ...prev
        ]  
      })
    }

    const onFileChange = (e) => {
      const [ file ] = e.target.files
      if(!file) return  
      setProcessMessageList([])
      UploadInstance.upload({
        config: {
          retry: {
            times: 2
          }
        },
        file: {
          file,
        },
        request: {
          exitDataFn,
          uploadFn,
          completeFn,
          callback
        },
        lifecycle: {
          reading,
          retry 
        }
      })
    }

    return (
      <>
        <input onChange={onFileChange} style={{display: 'none'}} type="file" ref={inputRef} />
        <p>以下上传流程会出现两次上传失败</p>
        <Button onClick={handleUpload}>
          点击上传
        </Button>
        <ul style={{marginTop: 24}}>
          <li>上传进度: </li>
          {
            processMessageList.map(item => {
              return (
                <li key={item}> 
                  {item}
                </li>
              )
            })
          }
        </ul>
      </>
    )

  }

```

### 设置单次上传大小  
```jsx
  import React, { useRef, useState } from 'react'
  import { Button } from 'antd'
  import { Upload } from 'chunk-file-upload'

  const UploadInstance = new Upload()

  const sleep = async (times=1000) => new Promise(resolve => setTimeout(resolve, times))

  export default () => {

    const inputRef = useRef()
    const [ processMessageList, setProcessMessageList ] = useState([])

    const handleUpload = () => {
      inputRef.current.click()
    }

    const exitDataFn = async () => {
      setProcessMessageList(prev => {
        prev.push(`文件存在检查中`)
        return prev 
      })
      await sleep()
      return {
        data: 0
      }
    }

    const uploadFn = async (data, name) => {
      const index = data.get("index")
      const task = UploadInstance.getTask(name)
      const size = task.file.size 
      const chunkSize = task.config.chunkSize 
      const nextOffset = chunkSize * Number(index)
      setProcessMessageList(prev => {
        prev.push(`文件上传中: 第${index}片`)
        return [
          ...prev
        ] 
      })
      await sleep()
      return {
        data: nextOffset > size ? size : nextOffset 
      }
    }

    const completeFn = () => {
      setProcessMessageList(prev => {
        prev.push(`文件完成保存中`)
        return [
          ...prev
        ] 
      })
    }

    const callback = (error) => {
      let message = ""
      if(error) {
        message = `文件上传出错: ${error.error}`
      }else {
        message = "文件上传成功"
      }
      setProcessMessageList(prev => {
        prev.push(message)
        return [
          ...prev
        ]  
      })
    }

    const reading = async ({ current }) => {
      await sleep()
      setProcessMessageList(prev => {
        prev.push(`文件解析中，当前索引: ${current}`)
        return [
          ...prev
        ]  
      })
    }

    const onFileChange = (e) => {
      const [ file ] = e.target.files
      if(!file) return  
      setProcessMessageList([])
      UploadInstance.upload({
        config: {
          chunkSize: 1024 * 1024 * 10
        },
        file: {
          file,
        },
        request: {
          exitDataFn,
          uploadFn,
          completeFn,
          callback
        },
        lifecycle: {
          reading
        }
      })
    }

    return (
      <>
        <input onChange={onFileChange} style={{display: 'none'}} type="file" ref={inputRef} />
        <p>设置分片大小为<strong>10M</strong></p>
        <Button onClick={handleUpload}>
          点击上传
        </Button>
        <ul style={{marginTop: 24}}>
          <li>上传进度: </li>
          {
            processMessageList.map(item => {
              return (
                <li key={item}> 
                  {item}
                </li>
              )
            })
          }
        </ul>
      </>
    )

  }
```

### 跳过文件解析  
```jsx
  import React, { useRef, useState } from 'react'
  import { Button } from 'antd'
  import { Upload } from 'chunk-file-upload'

  const UploadInstance = new Upload()

  const sleep = async (times=1000) => new Promise(resolve => setTimeout(resolve, times))

  export default () => {

    const inputRef = useRef()
    const [ processMessageList, setProcessMessageList ] = useState([])

    const handleUpload = () => {
      inputRef.current.click()
    }

    const exitDataFn = async () => {
      setProcessMessageList(prev => {
        prev.push(`文件存在检查中`)
        return prev 
      })
      await sleep()
      return {
        data: 0
      }
    }

    const uploadFn = async (data, name) => {
      const index = data.get("index")
      const task = UploadInstance.getTask(name)
      const size = task.file.size 
      const chunkSize = task.config.chunkSize 
      const nextOffset = chunkSize * Number(index)
      setProcessMessageList(prev => {
        prev.push(`文件上传中: 第${index}片`)
        return [
          ...prev
        ] 
      })
      await sleep()
      return {
        data: nextOffset > size ? size : nextOffset 
      }
    }

    const completeFn = () => {
      setProcessMessageList(prev => {
        prev.push(`文件完成保存中`)
        return [
          ...prev
        ] 
      })
    }

    const callback = (error) => {
      let message = ""
      if(error) {
        message = `文件上传出错: ${error.error}`
      }else {
        message = "文件上传成功"
      }
      setProcessMessageList(prev => {
        prev.push(message)
        return [
          ...prev
        ]  
      })
    }

    const reading = async ({ current }) => {
      await sleep()
      setProcessMessageList(prev => {
        prev.push(`文件解析中，当前索引: ${current}`)
        return [
          ...prev
        ]  
      })
    }

    const onFileChange = (e) => {
      const [ file ] = e.target.files
      if(!file) return  
      setProcessMessageList([])
      UploadInstance.upload({
        config: {
          parseIgnore: true 
        },
        file: {
          file,
        },
        request: {
          exitDataFn,
          uploadFn,
          completeFn,
          callback
        },
        lifecycle: {
          reading
        }
      })
    }

    return (
      <>
        <input onChange={onFileChange} style={{display: 'none'}} type="file" ref={inputRef} />
        <p>以下不会显示解析的进度信息</p>
        <Button onClick={handleUpload}>
          点击上传
        </Button>
        <ul style={{marginTop: 24}}>
          <li>上传进度: </li>
          {
            processMessageList.map(item => {
              return (
                <li key={item}> 
                  {item}
                </li>
              )
            })
          }
        </ul>
      </>
    )

  }
```

### 预先完成解析  
```jsx
  import React, { useRef, useState } from 'react'
  import { Button, Input } from 'antd'
  import { Upload } from 'chunk-file-upload'

  const UploadInstance = new Upload() 

  const sleep = async (times=1000) => new Promise(resolve => setTimeout(resolve, times))
  const isMd5 = (str) => typeof str === 'string' && /([a-f\d]{32}|[A-F\d]{32})/.test(str)

  export default () => {

    const inputRef = useRef()
    const [ processMessageList, setProcessMessageList ] = useState([])
    const [ md5, setMd5 ] = useState("")

    const handleUpload = () => {
      inputRef.current.click()
    }

    const exitDataFn = async () => {
      setProcessMessageList(prev => {
        prev.push(`文件存在检查中`)
        return prev 
      })
      await sleep()
      return {
        data: 0
      }
    }

    const uploadFn = async (data, name) => {
      const index = data.get("index")
      const task = UploadInstance.getTask(name)
      const size = task.file.size 
      const chunkSize = task.config.chunkSize 
      const nextOffset = chunkSize * Number(index)
      setProcessMessageList(prev => {
        prev.push(`文件上传中: 第${index}片`)
        return [
          ...prev
        ] 
      })
      await sleep()
      return {
        data: nextOffset > size ? size : nextOffset 
      }
    }

    const completeFn = () => {
      setProcessMessageList(prev => {
        prev.push(`文件完成保存中`)
        return [
          ...prev
        ] 
      })
    }

    const callback = (error) => {
      let message = ""
      if(error) {
        message = `文件上传出错: ${error.error}`
      }else {
        message = "文件上传成功"
      }
      setProcessMessageList(prev => {
        prev.push(message)
        return [
          ...prev
        ]  
      })
    }

    const reading = async ({ current }) => {
      await sleep()
      setProcessMessageList(prev => {
        prev.push(`文件解析中，当前索引: ${current}`)
        return [
          ...prev
        ]  
      })
    }

    const onFileChange = (e) => {
      const [ file ] = e.target.files
      if(!file) return  
      setProcessMessageList([])
      UploadInstance.upload({
        file: {
          file,
          md5
        },
        request: {
          exitDataFn,
          uploadFn,
          completeFn,
          callback
        },
        lifecycle: {
          reading
        }
      })
    }

    return (
      <>
        <input onChange={onFileChange} style={{display: 'none'}} type="file" ref={inputRef} />
        <p>提前传入文件<strong>md5</strong>配置</p>
        <p>以下上传流程会跳过文件解析过程</p>
        <Input value={md5} onChange={e => setMd5(e.target.value)} placeholder="请先写入要上传文件的md5" />
        <Button onClick={handleUpload} disabled={!isMd5(md5)}>
          点击上传
        </Button>
        <ul style={{marginTop: 24}}>
          <li>上传进度: </li>
          {
            processMessageList.map(item => {
              return (
                <li key={item}> 
                  {item}
                </li>
              )
            })
          }
        </ul>
      </>
    )

  }
```

### 恢复文件上传 
```jsx
  import React, { useRef, useState } from 'react'
  import { Button, Space } from 'antd'
  import { Upload } from 'chunk-file-upload'

  const UploadInstance = new Upload()

  const sleep = async (times=1000) => new Promise(resolve => setTimeout(resolve, times))

  export default () => {

    const inputRef = useRef()
    const [ processMessageList, setProcessMessageList ] = useState([])
    const [ task, setTask ] = useState(null)

    const handleUpload = () => {
      inputRef.current.click()
    }

    const exitDataFn = async () => {
      setProcessMessageList(prev => {
        prev.push(`文件存在检查中, ${new Date().toString()}`)
        return prev 
      })
      await sleep()
      return {
        data: 0
      }
    }

    const uploadFn = async (data, name) => {
      const index = data.get("index")
      const task = UploadInstance.getTask(name)
      const size = task.file.size 
      const chunkSize = task.config.chunkSize 
      const nextOffset = chunkSize * Number(index)
      setProcessMessageList(prev => {
        prev.push(`文件上传中: 第${index}片, ${new Date().toString()}`)
        return [
          ...prev
        ] 
      })
      await sleep()
      return {
        data: nextOffset > size ? size : nextOffset 
      }
    }

    const completeFn = () => {
      setProcessMessageList(prev => {
        prev.push(`文件完成保存中, ${new Date().toString()}`)
        return [
          ...prev
        ] 
      })
    }

    const callback = (error) => {
      let message = ""
      if(error) {
        message = `文件上传出错: ${error.error}, ${new Date().toString()}`
      }else {
        message = `文件上传成功, ${new Date().toString()}`
      }
      setProcessMessageList(prev => {
        prev.push(message)
        return [
          ...prev
        ]  
      })
    }

    const reading = async ({ current }) => {
      await sleep()
      setProcessMessageList(prev => {
        prev.push(`文件解析中，当前索引: ${current}, ${new Date().toString()}`)
        return [
          ...prev
        ]  
      })
    }

    const handleResumeUpload = () => {
      setProcessMessageList(prev => {
        prev.push(`恢复文件上传, ${new Date().toString()}`)
        return [
          ...prev
        ]  
      })
      UploadInstance.resumeTask(task)
      UploadInstance.deal(task.symbol)
    }

    const onFileChange = (e) => {
      const [ file ] = e.target.files
      if(!file) return  
      setProcessMessageList([])
      setTask(null)
      const [ result ] = UploadInstance.upload({
        file: {
          file,
        },
        request: {
          exitDataFn,
          uploadFn,
          completeFn,
          callback
        },
        lifecycle: {
          reading
        }
      })
      const task = UploadInstance.getTask(result)
      setTask(task)
    }

    return (
      <>
        <input onChange={onFileChange} style={{display: 'none'}} type="file" ref={inputRef} />
        <Space>
          <Button onClick={handleUpload}>
            点击上传
          </Button>
          <Button onClick={handleResumeUpload} disabled={!task || task.tool.file.isTaskDealing()}>
            恢复上传
          </Button>
        </Space>
        <ul style={{marginTop: 24}}>
          <li>上传进度: </li>
          {
            processMessageList.map(item => {
              return (
                <li key={item}> 
                  {item}
                </li>
              )
            })
          }
        </ul>
      </>
    )

  }

```

### 自定义文件上传插件  

自定义切片方法，控制文件切片的具体逻辑  

```jsx
  import React, { useRef, useState } from 'react'
  import { Button } from 'antd'
  import { Upload } from 'chunk-file-upload'

  Upload.install("slicer", async (task, start, end, file, stepValue) => {
    const result = await Upload.blob2arraybuffer(file.slice(start, end))
    return result
  })

  const UploadInstance = new Upload()

  const sleep = async (times=1000) => new Promise(resolve => setTimeout(resolve, times))

  export default () => {

    const inputRef = useRef()
    const [ processMessageList, setProcessMessageList ] = useState([])

    const handleUpload = () => {
      inputRef.current.click()
    }

    const exitDataFn = async () => {
      setProcessMessageList(prev => {
        prev.push(`文件存在检查中`)
        return prev 
      })
      await sleep()
      return {
        data: 0
      }
    }

    const uploadFn = async (data, name) => {
      const index = data.get("index")
      const task = UploadInstance.getTask(name)
      const size = task.file.size 
      const chunkSize = task.config.chunkSize 
      const nextOffset = chunkSize * Number(index)
      setProcessMessageList(prev => {
        prev.push(`文件上传中: 第${index}片`)
        return [
          ...prev
        ] 
      })
      await sleep()
      return {
        data: nextOffset > size ? size : nextOffset 
      }
    }

    const completeFn = () => {
      setProcessMessageList(prev => {
        prev.push(`文件完成保存中`)
        return [
          ...prev
        ] 
      })
    }

    const callback = (error) => {
      let message = ""
      if(error) {
        message = `文件上传出错: ${error.error}`
      }else {
        message = "文件上传成功"
      }
      setProcessMessageList(prev => {
        prev.push(message)
        return [
          ...prev
        ]  
      })
    }

    const reading = async ({ current }) => {
      await sleep()
      setProcessMessageList(prev => {
        prev.push(`文件解析中，当前索引: ${current}`)
        return [
          ...prev
        ]  
      })
    }

    const onFileChange = (e) => {
      const [ file ] = e.target.files
      if(!file) return  
      setProcessMessageList([])
      UploadInstance.upload({
        file: {
          file,
        },
        request: {
          exitDataFn,
          uploadFn,
          completeFn,
          callback
        },
        lifecycle: {
          reading
        }
      })
    }

    return (
      <>
        <input onChange={onFileChange} style={{display: 'none'}} type="file" ref={inputRef} />
        <Button onClick={handleUpload}>
          点击上传
        </Button>
        <ul style={{marginTop: 24}}>
          <li>上传进度: </li>
          {
            processMessageList.map(item => {
              return (
                <li key={item}> 
                  {item}
                </li>
              )
            })
          }
        </ul>
      </>
    )

  }

```

<!-- ### 缓存请求的响应内容   -->

### 本地实际后台上传  
```jsx
  import React, { useRef, useState } from 'react'
  import { Button } from 'antd'
  import { Upload } from 'chunk-file-upload'
  import axios from 'axios'

  const UploadInstance = new Upload()

  const sleep = async (times=1000) => new Promise(resolve => setTimeout(resolve, times))

  const isDevelopmentEnv = process.env.NODE_ENV === "development"

  export default () => {

    const inputRef = useRef()
    const [ processMessageList, setProcessMessageList ] = useState([])

    const handleUpload = () => {
      inputRef.current.click()
    }

    const exitDataFn = async (data) => {
      const size = data.size
      return axios.get('/api/check', {
        params: data
      })
      .then(data => {
        const res = data.data.res
        const isExists = res.data === false 
        setProcessMessageList(prev => {
          prev.push(`文件存在检查中，文件是否存在：${isExists ? "" : "不"}存在`)
          return prev 
        })
        return isExists ? { data: size } : res 
      })
    }

    const uploadFn = async (data, name) => {
      const index = data.get("index")
      setProcessMessageList(prev => {
        prev.push(`文件上传中: 第${index}片`)
        return [
          ...prev
        ] 
      })
      await sleep()
      return axios.post('/api/load', data)
      .then(data => data.data.res)
    }

    const completeFn = ({ md5 }) => {
      setProcessMessageList(prev => {
        prev.push(`文件完成保存中`)
        return [
          ...prev
        ] 
      })
      return axios.get('/api/complete', {
        params: {
          md5
        }
      })
    }

    const callback = (error) => {
      let message = ""
      if(error) {
        message = `文件上传出错: ${error.error}`
      }else {
        message = "文件上传成功"
      }
      setProcessMessageList(prev => {
        prev.push(message)
        return [
          ...prev
        ]  
      })
    }

    const reading = async ({ current }) => {
      await sleep()
      setProcessMessageList(prev => {
        prev.push(`文件解析中，当前索引: ${current}`)
        return [
          ...prev
        ]  
      })
    }

    const onFileChange = (e) => {
      const [ file ] = e.target.files
      if(!file) return  
      setProcessMessageList([])
      UploadInstance.upload({
        file: {
          file,
        },
        request: {
          exitDataFn,
          uploadFn,
          completeFn,
          callback
        },
        lifecycle: {
          reading
        }
      })
    }

    return (
      <>
        <input onChange={onFileChange} style={{display: 'none'}} type="file" ref={inputRef} />
        <p>{isDevelopmentEnv ? "" : "只有在本地开发环境下本示例才可执行（并且需要在本地启动后台服务：执行 npm run server）"}</p>
        <p>上传完成的文件可在当前项目目录下面的<strong>/mock_data/server/upload</strong>查看</p>
        <Button disabled={!isDevelopmentEnv} onClick={handleUpload}>
          点击上传
        </Button>
        <ul style={{marginTop: 24}}>
          <li>上传进度: </li>
          {
            processMessageList.map(item => {
              return (
                <li key={item}> 
                  {item}
                </li>
              )
            })
          }
        </ul>
      </>
    )

  }

```

<style>
  .ant-btn {
    margin: 16px 0;
  }
</style>
