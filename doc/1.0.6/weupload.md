# 构造函数

1. new WeUpload(options)
  options 包含`Upload`对应的属性以及`arrayBufferToBase64` 和 `base64ToArrayBuffer`  

  因为小程序端无法使用诸如`Blob`、`File`、`FileReader`等的API，所以为了勉强能在小程序端运行    
  这里采用在小程序端使用`base64`作为分片的类型。   
  所以在构造函数中添加了可选的配置参数，具体使用如下  
  ```js
      //以微信小程序为例
      const upload = new Upload({
          base64ToArrayBuffer: wx.base64ToArrayBuffer,
          arrayBufferToBase64: wx.arrayBufferToBase64
      })
  ```
  通过注入两个相互转换的方法来实现分片转换  