
## 基本使用示例

下面的示例都是基于普通`Upload`的例子  

- 基础使用 
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
        prev.push(`文件解析中: 第${index}片`)
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

- 生命周期  
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

- Blob 上传  
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
        prev.push(`文件解析中: 第${index}片`)
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

- ArrayBuffer 上传  
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
        prev.push(`文件解析中: 第${index}片`)
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

- Base64 上传  
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
        prev.push(`文件解析中: 第${index}片`)
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

- 监听文件上传进度  
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

- 控制上传
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
        prev.push(`文件解析中: 第${index}片`)
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

    const afterStop = () => {

    }

    const afterCancel = () => {

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
          reading,
          afterStop,
          afterCancel
        }
      })
    }

    const handleStop = () => {

    }

    const handleCancel = () => {

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

- 错误重试  

- 设置单次上传大小  

- 跳过文件解析  

- 预先完成解析  

- 恢复文件上传  

- 自定义文件上传插件  

- 缓存请求的响应内容  

- 本地实际后台上传  
