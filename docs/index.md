# chunk-file-load 

## 介绍 
文件分片上传工具  
支持`Blob`、`File`、`ArrayBuffer`、`Base64`类型的文件上传  
支持断点续传
支持控制上传  
支持小程序端文件上传  

## Demo  
- 实际文件上传`Demo`  
`fork`[github](https://github.com/food-billboard/chunk-file-load)代码  
本地执行`npm run start`和`npm run server` 执行本地调试  
- `mock`后台`Demo`  
当前页面`Demo`为`Mock`版本。

## 实例  
[React组件](https://food-billboard.github.io/chunk-file-load-component/#/)  

## API 

### 方法属性

### add 
添加任务 
```js
//支持任意格式的对象参数，但是需要保证对象内的必要参数都正确
let names = upload.add({
    file: {
        file: new File([new ArrayBuffer(1024)], 'filename')
    },   
    request: {
        exitDataFn, 
        uploadFn,  
        completeFn,
        callback   
    } 
})
```

### deal
执行指定的队列任务 
```js 
const [ name ] = upload.add(/*params...*/)
upload.deal(name)
``` 

### start
执行指定队列任务，与`deal`功能类似  
对于处于上传中的任务无效  
当文件暂停时，需要通过此方法继续任务执行  
`upload.start(name)`  

### stop
暂停上传中的任务  
只对上传中的任务有效  
对于暂停的任务可以通过`start`继续上传  
```js
upload.stop(...names) //不传参数则暂停所有任务
```

### cancel
取消上传中的任务
只对上传中的任务有效
一旦取消了上传任务则需要重新通过`upload`或`add`等方法重新进行添加才能上传  

```js
upload.cancel(...names)
```

### upload 
上传文件

``` js
const upload = new Upload()
let config = {
  file: {
    file
  },
  request: {
    exitDataFn,
    uploadFn,
    completeFn, 
    callback,
  },
}
upload.upload(config)
```

### uploading 
- 效果类似于上面的`upload`   
- 但是此方法适用于在外部事先完成了分片工作，并配置`chunks` 或者是恢复之前上传失败的任务  
- 如果不是恢复上传的任务  
1. 分片的大小不能超过指定的单个分片大小，否则会失败
2. 若`md5`和`chunks`都有配置，则可以跳过加密的过程  
3. 只有`chunks`则需要经过加密
4. 分片同上类型所示，且不限制需要相同类型
5. 如果没有配置传递原始文件，则需要传递`mime`属性  

**保证分片列表的顺序正确**  
分片会被统一转换成一种格式，按照`api`的支持程度顺序为`Blob -> File -> base64`  

### cancelAdd
取消队列中的任务
只对加入队列但还处于等待状态的任务有效

```js
upload.cancelAdd(...names)    //不传则取消所有任务
```

### resumeTask 

恢复之前失败或取消的任务  
需要传递完整的任务格式  

```js
upload.resumeTask(task) 
```

### watch

查看上传进度  
返回指定任务的上传进度集合  
你也可以在任务中的`watch`属性方法来获取对应的任务进度。  

```js
//return [{ error, name, progress, status, total, current, complete } || null]
upload.watch(...names) //不传则返回所有进度
```

### getTask
获取指定的任务信息  
`upload.getTask(name)`

### getOriginFile
获取源文件  
`upload.getOriginFile(name)`

### getStatus
获取任务当前状态  
`upload.getStatus(name)`




### dispose

销毁实例
`upload.dispose()`

### static install
插件注册  
 可以在`read`和`slice`两个阶段使用对应的插件对任务进行自定义处理  
```js
  import { Upload } from 'chunk-file-upload'
  Upload.install('slicer', function(task, start, end, chunk) {
    return chunk // return the chunk 
  })
```

### isSupport

当前环境是否支持  
`Upload.isSupport()`  

### btoa  
`ArrayBuffer`转`Base64`  

### atob  
`Base64`转`ArrayBuffer`  

### file2Blob  
`File`转`Blob`  

### blob2file  
`Blob`转`File`  

### file2arraybuffer  
`File`转`ArrayBuffer`  

### blob2arraybuffer  
`Blob`转`ArrayBuffer`  

### file2base64  
`File`转`Base64`  

### blob2base64  
`Blob`转`Base64`  

### arraybuffer2file  
`ArrayBuffer`转`File`  

### arraybuffer2blob  
`ArrayBuffer`转`Blob`  

### base642blob  
`Base64`转`Blob`  

### base642file  
`Base64`转`File`  

### 数据类型 

#### Ttask 

| 参数 | 说明 | 类型  | 默认值  |
| --------------- | ---------- | --------- | ----- |  
| config | 全局配置 | `TConfig` | `{ chunkSize: 1024 * 1024 * 5, parseIgnore: false }` | 
| lifecycle | 生命周期 | `TLifecycle` | - | 
| file | 文件信息 | `TFile<T>` | - | 
| request | 请求方法 | `TRequestType` | - | 

#### TConfig 

| 参数 | 说明 | 类型  | 默认值  |
| --------------- | ---------- | --------- | ----- |  
| retry | 重试次数，不传则不重试 | `{ times: number }` | - | 
| chunkSize | 单一分片的大小 | `number` | `1024 * 1024 * 5` | 
| parseIgnore | 是否跳过解析 | `boolean` | `false` | 

#### TLifecycle 

- 下面所有生命周期的返回值`R`，都表示为： `boolean | Promise<boolean>`  
- 下面所有生命周期的参数的`TLifeCycleParams`，都表示为`{ name: Symbol, task: TWrapperTask }`

| 参数 | 说明 | 类型  | 默认值  |
| --------------- | ---------- | --------- | ----- |  
| beforeRead | 文件解析前 | `(params: TLifeCycleParams, response?: any) => R` | - | 
| reading | 文件解析时 | `(params: TLifeCycleParams & { current: number, total: number }, response?: any) => R` | - | 
| beforeCheck | 文件解析完成，上传检查前 | `(params: TLifeCycleParams, response?: any) => R` | - | 
| afterCheck | 检查请求响应后 | `(params: TLifeCycleParams & { isExists: boolean }, response?: any) => R` | - | 
| uploading | 分片上传后 | `(params: TLifeCycleParams & { current: number, total: number, complete: number }, response?: any) => R` | - | 
| beforeComplete | 完成请求前 | `(params: TLifeCycleParams & { isExists: boolean }, response?: any) => R` | - | 
| afterComplete | 完成请求后 | `(params: TLifeCycleParams & { success: boolean }, response?: any) => R` | - | 
| afterStop | 触发暂停响应后 | `(params: TLifeCycleParams & { current: number }, response?: any) => R` | - | 
| afterCancel | 触发取消响应后 | `(params: TLifeCycleParams & { current: number }, response?: any) => R` | - | 
| retry | 触发重试任务执行 | `(params: TLifeCycleParams & { rest: number }, response?: any) => R` | - | 

#### TFile 

| 参数 | 说明 | 类型  | 默认值  |
| --------------- | ---------- | --------- | ----- |  
| md5 | 文件md5，预先设置这个值可以跳过解析过程 | `string` | - | 
| mime | 文件mime，当无法从源文件中获取`mime`时，此参数必填 | `string` | - | 
| file | 文件，必填 | `ArrayBuffer | string | Blob | File` | - | 
| chunks | 文件分片，预先设置这个值可跳过分片 | `(ArrayBuffer | string | Blob | File)[]` | - | 

- tips: `md5`和`chunks`的区别
设置了`md5`则可跳过解析，但是文件上传时仍需要做文件分片处理  
设置了`chunks`则可跳过文件分片，但是仍需要做文件解析  
同时设置两个值可以跳过解析和分片，加快文件上传流程  


#### TRequestType 
| 参数 | 说明 | 类型  | 默认值  |
| --------------- | ---------- | --------- | ----- |  
| exitDataFn | 文件存在验证 | `TExitDataFn` | - | 
| uploadFn | 分片上传(必填) | `TUploadFn` | - | 
| completeFn | 完成上传 | `(params : { name: Symbol, md5: string }) => any` | - | 
| callback | 完成回调 | `(err: { retry?: boolean, error: any }, data: any) => any` | - | 

- TExitDataFn 类型  
```ts | pure 
  type TExitDataFnReturnValue = {
    data: Array<number> | string | number
    [key: string]: any
  }

  type TExitDataFn = (params: {
    filename: string
    md5: string
    suffix: string
    size: number
    chunkSize: number
    chunksLength: number
  }, name: Symbol) => Promise<TExitDataFnReturnValue>

```

- TUploadFn 类型  
```ts | pure 
  type TFileType = ArrayBuffer | string | Blob | File

  type TUploadFormData = {
    file: TFileType
    md5: string
    index: number
    [key: string]: any
  }

  type TUploadFn = (data: FormData | TUploadFormData, name: Symbol) => ReturnType<TExitDataFn>
```

