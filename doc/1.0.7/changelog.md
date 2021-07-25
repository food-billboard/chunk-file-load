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