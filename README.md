# chunk-file-load

文件分片上传工具

## 测试
具体实例及测试请在[github](https://github.com/food-billboard/chunk-file-load)进行`fork`后运行以下命令  

1. cmd分别命令执行查看相关示例
`npm start`
`npm run server`
* 这里默认认为本机安装了node和nodemon

2. cmd执行下面命令进行测试
`npm run test`
* 需要安装`jest`

## 简单介绍

* 工具可以使上传文件变为可控，包括多任务同时上传、暂停任务、取消任务以及查看上传进度、断点续传，但是中间相关细节需要后端进行配合
**new**
* 此次更新增加了更多的文件上传流程控制，以及更改了相关`api`的名称，配合`worker`进行文件解析。
* 分离了兼容小程序的上传方法，小程序端`import { WeUpload } from 'chunk-file-upload'`, 反之`import { Upload } from 'chunk-file-upload'` 

### 简单使用
```js
//in react
import { Upload } from 'chunk-file-upload'

function UploadFile() {

    const onChange = (e) => {
        const [ file ] = e.target.files
        const upload = new Upload({
            lifecycle: {
                
            },
            config: {},
            ignores: []
        })
        upload.upload({
            file: {
                file
            },
            request: {
                uploadFn: (data) => {
                    //request(data)
                }
            }
        })
    }

    return (
        <input type="file" onChange={onChange} />
    )

}
```

### 使用 upload.upload(...args) 上传文件

* 传入相关参数
* 支持传入多个任务参数
* 文件会自动进行分片并上传
* 返回自动生成的唯一文件名称集合

``` typescript
const upload = new Upload()
let config: {
    config?: {
        retry?: {
            times: number
        }
        chunkSize?: number
        parseIgnore?: boolean 
    }
    file: {
        mime?: string
        file: File | Blob | ArrayBuffer | string
        md5?: string
        chunks?: (File | Blob | ArrayBuffer | string)[]
    }
    lifecycle /*具体查看下面生命周期*/
    request: {
        exitDataFn?: (params: {
            filename: string
            md5: string
            suffix: string
            size: number
            chunkSize: number
            chunksLength: number
        }, name: Symbol) => Promise<{
            data: Array<number> | string | number
            [key: string]: any
        }>
        uploadFn: (data: FormData | { 
            file: Blob | string
            md5: string
            index: number 
        }, name: Symbol) => Promise<{
            data: Array<number> | string | number
            [key: string]: any
        } | void>
        completeFn?: (params : { name: Symbol, md5: string }) => any
        callback?: (err: any, data: any) => any
    }
} = {
    file: {
        file,   //文件 支持file blob arraybuffer 以及base64格式的文件, 并且尽量传递mime类型，否则后台对文件合并时无法获取文件mime类型
        md5, //加密后的名称，用于跳过加密过程，配合chunks使用，单独传递无效
        mime, //mime类型(/.+\/.+/)
        chunks //事先完成的分片，用于跳过分片过程，具体参照下面的 uploading 方法
    },
    request: {
        exitDataFn, //验证后端是否存在文件的方法(可选，不传则每一次上传都会全部重新上传)
        uploadFn,   //上传方法
        completeFn, //完成上传后通知后端的方法(可选，如果后端有自己的验证方式则无需传递)
        callback,    //回调函数(可选)
    },
    config: {   //相关配置(可选)
        retry: { //是否错误重试 默认不重试
            times
        },
        chunkSize //分片大小 默认500k
        parseIgnore //跳过文件解析
    },
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
}, name)
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
        data: Array<string> | number | string | false
        [key: string]: any
    }
```

* about callback 第一参数为`error`, 第二参数为`completeFn`或是在秒传时`exitDataFn`除`data`外的其余数据
like this `callback(err: null | any, data: null | any) => any`

- 使用不同类型的文件
```js
    const upload = new Upload()
    upload.upload({
        file: {
            file: new File([new ArrayBuffer(1024)], 'filename'), 
        },
        request: {
            uploadFn
        },
    })
```
- 预先解析完成(可跳过解析流程)
```js
    const upload = new Upload()
    upload.upload({
        file: {
            file: new File([new ArrayBuffer(1024)], 'filename'), 
            md5: 'xxxxxxxxxxxx'
        },
        request: {
            uploadFn
        },
    })
```
- 预先完成分片
```js
        const upload = new Upload()
    upload.upload({
        file: {
            md5: 'xxxxxxxxxxxx',
            mime: 'image/png',
            chunks: [ new ArrayBuffer(1024), new Blob([new ArrayBuffer(1024)]) ]
        },
        request: {
            uploadFn
        },
    })
```

### 调用 upload.add(...tasks) 加入上传文件队列

* 传入相关参数(参数类型与上面的`upload`方法相同)
* 支持传入多个任务参数
* 不会自动触发上传，需要调用`upload.deal`
* 返回自动生成的唯一文件名称集合

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

### 调用 upload.deal(...names) 执行指定的队列任务

* 参数为绑定上传任务时返回的给定任务文件名称
* 支持传入多个参数
* 返回所有状态的任务名称

```typescript 
const [ name ] = upload.add(/*params...*/)
upload.deal(name)
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

### 搭配生命周期更细粒度的控制上传过程
```typescript
    type responseType = boolean | Promise<boolean>
    type TLifeCycleParams = {
        name: Symbol
        task: TWrapperTask //参照api
    }
    //序列化前
    beforeRead?: (params: TLifeCycleParams) => responseType
    //序列化中
    reading?: (params: TLifeCycleParams & { current: number, total: number }) => responseType
    //MD5序列化后，检查请求前
    beforeCheck?: (params: TLifeCycleParams) => responseType
    //检查请求响应后
    afterCheck?: (params: TLifeCycleParams & { isExists: boolean }) => responseType
    //分片上传后(多次执行)
    uploading?: (params: TLifeCycleParams & { current: number, total: number, complete: number }) => responseType
    //触发暂停响应后
    afterStop?: (params: TLifeCycleParams & { current: number }) => responseType
    //触发取消响应后
    afterCancel?: (params: TLifeCycleParams & { current: number }) => responseType
    //完成请求前
    beforeComplete?: (params: TLifeCycleParams & { isExists: boolean }) => responseType
    //完成请求后
    afterComplete?: (params: TLifeCycleParams & { success: boolean }) => responseType
    //触发重试任务执行
    retry?: (params: TLifeCycleParams & { rest: number }) => responseType
```

生命周期包括全局和单一任务生命周期  
- 全局  
```js
const upload = new Upload({
    lifecycle: {
        beforeCheck() {
            //在文件检查前停止上传(相当于stop)
            return false
        }
    }
})
```
- 局部
```js
    const upload = new Upload()
    upload.add({
        /*其他配置*/
        lifecycle: {
            beforeUpload({ name, task }) {
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

- 全局的生命周期执行在局部之前  
- 如果希望能使用this来获取实例属性方法等，请不要使用箭头函数  
- 返回false或reject则停止后续生命周期执行  

## API

### dispose

* 销毁实例
`upload.dispose()`

### start

* 执行指定队列任务，与`deal`功能相同
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
* 一旦取消了上传任务则需要重新通过`upload`或`add`等方法进行添加才能上传

```js
upload.cancel(...names)
```

### cancelAdd

* 取消队列中的任务
* 返回被取消绑定的任务文件名称集合
* 只对加入队列但还处于等待状态的任务有效

```js
upload.cancelAdd(...names)    //不传则取消所有任务
```

### watch

* 查看上传进度  
* 返回指定任务的上传进度集合  
* 你也可以在任务中的`watch`属性方法来获取对应的任务进度。  

```js
//return [{ error, name, progress, status, total, current, complete } || null]
upload.watch(...names) //不传则返回所有进度
```

### getTask

* 获取指定的任务信息  

### getOriginFile

* 获取源文件  

### getStatus

* 获取任务当前状态  

### static isSupport

* 当前环境是否支持  

## static API  

### install 

* 插件注册(具体查看下方`Changelog 1.0.7`)  

## Changelog

[1.0.7](https://github.com/food-billboard/chunk-file-load/tree/master/doc/1.0.7/changelog.md)  
[1.0.6](https://github.com/food-billboard/chunk-file-load/tree/master/doc/1.0.6/index.md)  
[1.0.5](https://github.com/food-billboard/chunk-file-load/tree/master/doc/1.0.5.md)

## 总结

文件分片上传是为了能在后端限制上传文件大小的情况下，也为了能有更好的用户体验，将体积大的文件分成等体积的小文件进行分别上传，也保证了当用户在不明情况下中断上传可以继续上传。
