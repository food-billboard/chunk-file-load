# chunk-file-load

文件分片上传工具

## 测试
具体实例及测试请在[github](https://github.com/food-billboard/chunk-file-load)进行`fork`后运行一下命令

1. cmd分别命令执行查看相关示例
`npm start`
`npm run server`
* 这里默认认为本机安装了node和nodemon

2. cmd执行下面命令进行测试
`npm run test`
* 需要安装`jest`

## 简单介绍

* 工具可以使上传文件变为可控，包括多任务同时上传、暂停任务、取消任务以及查看上传进度、断点续传，但是中间相关细节需要后端进行配合

### 调用 new Upload()
因为小程序端无法使用诸如`Blob`、`File`、`FileRader`等的API，所以为了勉强能在小程序端运行    
这里采用在小程序端使用`base64`作为分片的类型。   
所以在构造函数中添加了可选的配置参数，如下  
```js
    //以微信小程序为例
    const upload = new Upload({
        base64ToArrayBuffer: wx.base64ToArrayBuffer,
        arrayBufferToBase64: wx.arrayBufferToBase64
    })
```
通过注入两个相互转换的方法来实现分片转换  

### 使用 upload.upload(...args) 上传文件

* 传入相关参数
* 支持传入多个任务参数
* 文件会自动进行分片并上传
* 返回自动生成的唯一文件名称集合

``` typescript
const upload = new Upload()
let config: {
    file: File | Blob | ArrayBuffer | base64
    md5?: string
    config: {
        retry?: {
            times: number
        }
        chunkSize?: number
    }
    mime?: string
    exitDataFn?: ({ 
        filename,
        md5,
        suffix,
        size,
        chunkSize,
        chunksLength
    }: {
        filename: string
        md5: string
        suffix: string
        size: number
        chunkSize: number
        chunksLength: number
    }) => Promise<{
        data: Array<string | number>
        [key: string]: any
    }> | {
        data: Array<string | number>
        [key: string]: any
    }
    uploadFn: TUploadFn
    completeFn?: ({ name, md5 } : { name: Symbol, md5: string }) => any
    callback?: (err: any, data: any) => any
} = {
    file,   //文件 支持file blob arraybuffer 以及base64格式的文件, 并且尽量传递mime类型，否则后台对文件合并时无法获取文件mime类型
    md5, //加密后的名称，用于跳过加密过程，配合chunks使用，单独传递无效
    mime, //mime类型(/.+\/.+/)
    exitDataFn, //验证后端是否存在文件的方法(可选，不传则每一次上传都会全部重新上传)
    uploadFn,   //上传方法
    completeFn, //完成上传后通知后端的方法(可选，如果后端有自己的验证方式则无需传递)
    callback,    //回调函数(可选)
    config: {   //相关配置(可选)
        retry: { //是否错误重试 默认不重试
            times
        },
        chunkSize //分片大小 默认500k
    },
    chunks //事先完成的分片，用于跳过分片过程，具体参照下面的 uploading 方法
}
let names = upload.upload(config)
```

* 相关回调参数
```js
exitDatFn({
    filename: '文件名称',
    md5: '加密文件名称',
    suffix: '文件后缀名称',
    size: '文件大小',
    chunkSize: '文件单分片大小',
    chunksLength: '文件总分片数量'
})
uploadFn(data/*
包含文件的formData
{
    file: '分片文件',
    md5: '加密文件名称',
    index: '当前文件分片索引'
}
*如果不支持formData则为普通对象/)
completeFn({
    name: '上传队列中的文件唯一索引',
    md5: '加密文件名称'
})
callback(err/*任务错误信息, 没有则为null*/, res/*不为null则表示任务成功*/)
```

* about exitDataFn 因为无法得知服务端的数据返回格式, 可以进行相应的定义来适应数据格式
* like this
```js
exitDataFn: function(...someparams) {
    //得到相应的数据
    const data = {  }

    //返回格式(如果服务端指定为全部上传完成，格式为false)
    return {
        data: [/*数字或字符串数字索引*/] || false
    }
}
```
响应类型格式如下: 
```typescript
    type response = {
        //data索引必传
        data: Array<string | number> | false
        [key: string]: any
    }
```

* about callback 第一参数为`error`, 第二参数为`completeFn`或是在秒传时`exitDataFn`除`data`外的其余数据
like this `callback(err: null | any, data: null | any) => any`

### 调用 upload.on(...tasks) 加入上传文件队列

* 传入相关参数(参数类型与上面的`upload`方法相同)
* 支持传入多个任务参数
* 不会自动触发上传，需要调用`upload.emit`
* 返回自动生成的唯一文件名称集合

```js
//支持任意格式的对象参数，但是需要保证对象内的必要参数都正确
let names = upload.on({
    file,   
    exitDataFn, 
    uploadFn,  
    completeFn,
    callback    
})

let names = upload.on({/*同上参数*/}, {/*同上参数*/}, callback)

let names = upload.on([{/*同上参数*/}, {/*同上参数*/}], callback)

let names = upload.on([{/*同上参数*/}, {/*同上参数*/}], {/*同上参数*/}, callback)
```

### 调用 upload.emit(...names) 执行指定的队列任务

* 参数为绑定上传任务时返回的给定任务文件名称
* 支持传入多个参数
* 返回所有状态的任务(rejected fulfilled cancel stopping)

```typescript 
type TEevents //具体参考上面的`upload`方法参数，多了一个唯一名称`symbol`
const response: {
    rejected: {
        reason: any
        data: TEvents | null
    }[]
    fulfilled: { 
        value: { name: string, err: null }
        data: TEvents 
    }[] 
    cancel: {
        reason: any
        data: TEvents
    }[]
    stopping: {
        reason: any
        data: TEvents
    }[] 
} = await upload.emit(name)
```

### upload.uploading(...tasks)
效果类似于上面的`upload`   
但是此方法适用于在外部事先完成了分片工作，并配置`chunks`  
使用`upload`一样可以实现，只是语义上的不同
分片的大小不能超过指定的单个分片大小，否则会失败
若`md5`和`chunks`都有配置，则可以跳过加密的过程  
只有`chunks`则需要经过加密
分片同上类型所示，且不限制需要相同类型

**保证分片列表的顺序正确**  
分片会被统一转换成一种格式，按照`api`的支持程度顺序为`Blob -> File -> base64`  

```typescript
upload.uploading({
    //其他配置
    chunks: [ new File(), new Blob() ],
    md5: '.....' //md5加密名称
})
```

### 搭配生命周期更细粒度的控制上传过程
```typescript
//序列化前
beforeRead?: (params: { name: Symbol, task: TFiles }) => any
//序列化中
reading?: (params: { name: Symbol, task: TFiles, start?: number, end?: number }) => boolean | Promise<boolean>
//MD5序列化后，检查请求前
beforeCheck?: (params: { name: Symbol, task: TFiles | null }) => boolean | Promise<boolean>
//检查请求响应后
afterCheck?: (params: { name: Symbol, task: TFiles | null, isExists?: boolean }) => any
//分片上传前(可以在这里执行stop或cancel，任务会立即停止, 或者直接return false表示暂停)
beforeUpload?: (params: { name: Symbol, task: TFiles | null }) => boolean | Promise<boolean>
//分片上传后(多次执行)
afterUpload?: (params: { name: Symbol,  task: TFiles | null, index?: number, success?: boolean }) => any
//触发暂停响应后
afterStop?: (params: { name: Symbol, task: TFiles | null, index?: index }) => any
//触发取消响应后
afterCancel?: (params: { name: Symbol, task: TFiles | null, index?: index }) => any
//完成请求前
beforeComplete?: (params: { name: Symbol, task: TFiles | null, isExists?: boolean }) => any
//完成请求后
afterComplete?: (params: { name: Symbol, task: TFiles | null, success?: boolean }) => any
//触发重试任务执行
retry?: (params: { name: Symbol, task: TFiles | null }) => any
```

生命周期包括全局和单一任务生命周期  
- 全局  
```js
const upload = new Upload({
    lifecycle: {
        beforeCheck: () => {
            //在文件检查前停止上传(相当于stop)
            return false
        }
    }
})
```
- 局部
```js
    const upload = new Upload()
    upload.on({
        /*其他配置*/
        lifecycle: {
            beforeUpload: ({ name, task }) => {
                //暂停
                this.stop(name)
                //查看进度
                console.log(task.watch(), this.watch(name))
                //取消
                this.cancel(name)
            }
        }
    })
```

**全局的生命周期执行在局部之前**  
**如果希望能使用this来获取实例属性方法等，请不要使用箭头函数**

## API

### init

* 重置或初始化
* 将待执行任务全部清除
`upload.init()`

### start

* 执行指定队列任务，与emit功能相同
* 对于处于上传中的任务无效
`upload.start(...names)` 

### stop

* 暂停上传中的任务
* 返回执行暂停操作的任务文件名称集合
* 只对上传中的任务有效
* 对于暂停的任务可以通过emit继续上传

```js
upload.stop(...names) //不传参数则暂停所有任务
```

### cancel

* 取消上传中的任务
* 返回执行取消操作的任务文件名称集合
* 只对上传中的任务有效
* 一旦取消了上传任务则需要重新通过upload或on进行添加才能上传

```js
upload.cancel(...names)
```

### cancelEmit

* 取消队列中的任务
* 返回被取消绑定的任务文件名称集合
* 只对加入队列但还处于等待状态的任务有效

```js
upload.cancelEmit(...names)    //不传则取消所有任务
```

### watch

* 查看上传进度
* 返回指定任务的上传进度集合
* 你也可以在任务中的`watch`属性方法来获取对应的任务进度。

```js
//return { name, progress }
upload.watch(...names) //不传则返回所有进度
```

## ps 

小程序方面的限制虽然得到了解决，但是因为`base64`的转换使得原本的分片体积增大，这可能会导致转换时出现相关的性能问题，所以尽量不要设置太大的文件分片。当前设置的上限分片大小为**500k**。
并且对于`base64`的文件，因为转换性能较差所以没有办法传递较大文件，对`base64`类型文件最大为**500k**。

## 总结

文件分片上传是为了能在后端限制上传文件大小的情况下，也为了能有更好的用户体验，将体积大的文件分成等体积的小文件进行分别上传，也保证了当用户在不明情况下中断上传可以继续上传。
