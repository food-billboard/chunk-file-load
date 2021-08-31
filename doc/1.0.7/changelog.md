## Changelog

1. Weapp 
小程序文件上传方法返回的文件分片类型从`base64`更改为`ArrayBuffer`。  

2. 插件注册  
 - 可以在`read`和`slice`两个阶段使用对应的插件对任务进行自定义处理  
```tsx
  import { Upload } from 'chunk-file-upload'
  Upload.install('slicer', function(task, start, end, chunk) {
    return chunk // return the chunk 
  })
```

3. new config props 
 - 新增全局或任务 `config`属性: `parseIgnore`，可跳过文件解析过程，但是无法对文件的上传历史进度进行判断，每一次都会是`重新上传`。
 - `new Upload({ config: { parseIgnore: true } })`

4. 取消 `Web Worker`  
 - 由于本人技术不过关，对`Web Worker`不够了解，暂时在内部去除了`Worker`的功能  
 - 外部使用不受影响  
 - 见谅  

5. `lifecycle`  
 - 生命周期新增第二参数，参数值为前生命周期的`return`值集合。  

6. `resumeTask`  
 - 可用于恢复之前失败或取消的任务  

7. `uploading`  
 - 修改了`uploading`方法的参数格式，可以支持传递与`resumeTask`相同的参数格式  
 - 不同于`resumeTask`的地方在于 `resumeTask`需要手动执行上传任务，此方法会自动上传  