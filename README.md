# chunk-file-load

文件分片上传工具

## cmd分别命令执行查看事例
`npm start`
`npm run server`
* 这里默认认为本机安装了node

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
    file,   //文件
    exitDataFn, //验证后端是否存在文件的方法(可选，不传则每一次上传都会全部重新上传)
    uploadFn,   //上传方法
    completeFn, //完成上传后通知后端的方法(可选，如果后端有自己的验证方式则无需传递)
    callback    //回调函数(可选)
})
```

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
* 返回所有状态的任务(rejected fulfilled cancel stopping)

```js
upload.emit(name)
```

## API

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
upload.watch(names) //不传则返回所有进度
```

### setChunkSize

* 设置每一分片的大小(默认5M)
* 对于已经初始过的任务，其大小则被固定，无法再次修改
* 尽量不要修改分片大小，这可能会导致执行断点续传时前后传递的数据不一致导致全部重新上传


## 总结

文件分片上传是为了能在后端限制上传文件大小的情况下，也为了能有更好的用户体验，将体积大的文件分成等体积的小文件进行分别上传，也保证了当用户在不明情况下中断上传可以继续上传。