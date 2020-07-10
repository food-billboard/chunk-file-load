# chunk-file-load

文件分片上传工具

## cmd分别命令执行查看事例
`npm start`
`npm run server`
* 这里默认认为本机安装了node和nodemon

## 调用 new Upload()

* 工具可以使上传文件变为可控，包括多任务同时上传、暂停任务、取消任务以及查看上传进度、断点续传，但是中间相关细节需要后端进行配合

## 使用 upload.upload(...args) 上传文件

* 传入相关参数
* 支持传入多个任务参数
* 文件会自动进行分片并上传
* 返回自动生成的唯一文件名称集合

``` js
const upload = new Upload()
let names = upload.upload({
    file,   //文件 支持file blob arraybuffer格式的文件, 需要指定mime类型
    mime, //mime类型
    exitDataFn, //验证后端是否存在文件的方法(可选，不传则每一次上传都会全部重新上传)
    uploadFn,   //上传方法
    completeFn, //完成上传后通知后端的方法(可选，如果后端有自己的验证方式则无需传递)
    callback,    //回调函数(可选)
    config: {   //相关配置(可选)
        retry, //是否错误重试 默认不重试
        retryTimes, //重试次数, 默认1
        chunkSize //分片大小 默认5m
    }
})
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
*/)
completeFn({
    name: '上传队列中的文件唯一索引',
    md5: '加密文件名称'
})
callback(err/*任务错误信息, 没有则为null*/, res/*不为null则表示任务成功*/)
```
```
* about exitDataFn 因为无法得知服务端的数据返回格式, 可以进行相应的定义来适应数据格式
* like this
```js
exitDataFn: function(...someparams) {
    //得到相应的数据
    const data = {  }

    //返回格式(如果服务端指定为全部上传完成，格式为false)
    return {
        data: [/*索引*/] || false
    }
}
```
* about callback 第一参数为error, 第二参数为completeFn或是在秒传时exitDataFn除data外的其余数据
like this `callback(null, data)`

## 调用 upload.on(...args) 加入上传文件队列

* 传入相关参数
* 支持传入多个任务参数
* 如果最后一个参数是函数则会被当做回调函数
* 不会自动触发上传，需要调用upload.emit
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

## 调用 upload.emit(...args) 执行指定的队列任务

* 参数为绑定上传任务时返回的给定任务文件名称
* 支持传入多个参数
* 返回所有状态的任务(rejected fulfilled cancel stopping retry)

```js
upload.emit(name)
```

## API

### init

* 重置或初始化
* 将待执行任务全部清除

### start

* 执行指定队列任务，与emit功能相同
* 对于处于上传中的任务无效

### stop

* 暂停上传中的任务
* 返回执行暂停操作的任务文件名称集合
* 只对上传中的任务有效
* 对于暂停的任务可以通过emit继续上传

```js
upload.stop(names) //不传参数则暂停所有任务
```

### cancel

* 取消上传中的任务
* 返回执行取消操作的任务文件名称集合
* 只对上传中的任务有效
* 一旦取消了上传任务则需要重新通过upload或on进行添加才能上传

```js
upload.cancel(names)
```

### cancelEmit

* 取消队列中的任务
* 返回被取消绑定的任务文件名称集合
* 只对加入队列但还处于等待状态的任务有效

```js
upload.cancelEmit(names)    //不传则取消所有任务
```

### watch

* 查看上传进度
* 返回指定任务的上传进度集合

```js
//return { name, progress, retry?:{ times } }
upload.watch(names) //不传则返回所有进度
```

## 总结

文件分片上传是为了能在后端限制上传文件大小的情况下，也为了能有更好的用户体验，将体积大的文件分成等体积的小文件进行分别上传，也保证了当用户在不明情况下中断上传可以继续上传。
