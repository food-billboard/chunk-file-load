import React, { Component } from 'react'
import { Upload } from '~/index.ts'
import Axios from 'axios'
import './index.css'

function File({ onClick, ...nextProps }) {
  return (
    <div {...nextProps} onClick={onClick} className="input">点击上传</div>
  )
}

export default class extends Component {

  upload = new Upload()

  state = {
    activeSelect: '1',
    single: null,
    multiple: null,
    control: null,
    error: null,
    progress: 0,
    name: null,
    stop: false
  }

  select = [
    {
      key: '0',
      value: 'base64上传'
    },
    {
      key: '1',
      value: 'file上传'
    },
    {
      key: '2',
      value: 'blob上传'
    },
    {
      key: '3',
      value: 'arraybuffer上传'
    }
  ]

  singleRef
  multipleRef
  controlRef
  errorRef

  //验证存在
  async exitDataFn(data) {
    const size = data.size
    return Axios.get('/api/check', {
      params: data
    })
    .then(data => {
      const res = data.data.res
      if(res.data === false) return { data: size }
      return res
    })
  }

  //上传
  uploadFn = async (data) => {
    await new Promise(resolve => setTimeout(resolve, 1000))
    return Axios.post('/api/load', data)
    .then(data => data.data.res)
    .then(_ => undefined)
  } 

  //回调
  callback(err, rest) {
    console.log('完成了', err, rest)
  }

  //完成通知
  completeFn({name, md5}) {
    return Axios.get('/api/complete', {
      params: {
        md5
      }
    })
  }

  handleSelect = (key) => {
    this.setState({ activeSelect: key })
  }

  chansformFile = (file) => {
    const { activeSelect } = this.state
    if(!Array.isArray(file)) file = [file]
    if(activeSelect == '0') {
      return Promise.all(file.map(fi => {
        const fileReader = new FileReader()
        
        return new Promise((resolve, reject) => {

          fileReader.onload = function(e) {
            resolve(e.target.result)
          }

          fileReader.readAsDataURL(fi)

        })
      }))
    }else if(activeSelect == '1') {
      return Promise.resolve(file)
    }else if(activeSelect == '2') {
      return Promise.all(file.map(fi => {
        const fileReader = new FileReader()
        
        return new Promise((resolve, reject) => {

          fileReader.onload = function(e) {
            resolve(new Blob([e.target.result]))
          }

          fileReader.readAsArrayBuffer(fi)

        })
      }))
    }else if(activeSelect == '3') {
      return Promise.all(file.map(fi => {
          const fileReader = new FileReader()
          
          return new Promise((resolve, reject) => {
  
            fileReader.onload = function(e) {
              resolve(e.target.result)
            }
  
            fileReader.readAsArrayBuffer(fi)
  
          })
        }))
    }
  }

  //单文件上传
  handleSingleFileUpload = (e) => {
    if(this.state.single) return
    const { activeSelect } = this.state
    let file = e.target.files[0]
    const that = this
    if(activeSelect == '0') {
      if(file.size > 1024 * 1024 * 5) {
        alert('不要使用太大的文件用于base64上传')
        return 
      }
      const fileReader = new FileReader()
      fileReader.onload = function(e) {
        that.upload.upload({
          lifecycle: {
            reading({ name, task, current, total }) {
              console.log('loading: ', current, 'total', total)
            }
          },
          file: {
            file: e.target.result,
            mime: file.type,
          },
          request: {
            exitDataFn: that.exitDataFn,
            uploadFn: that.uploadFn,
            completeFn: (...values) => {
              return that.completeFn(...values)
            },
            callback: (err, value) => {
              that.callback(err, value)
              that.setState({
                single: null
              })
            },
          }
        })
      }
      fileReader.readAsDataURL(file)
    }else if(activeSelect == '1') {
      this.upload.upload({
        file: {
          file,
        },
        request: {
          exitDataFn: this.exitDataFn,
          uploadFn: this.uploadFn,
          completeFn: (...values) => {
            return this.completeFn(...values)
          },
          callback: (err, value) => {
            that.callback(err, value)
            that.setState({
              single: null
            })
          },
        },
        lifecycle: {
          reading({ name, task, current, total }) {
            console.log('loading: ', current, 'total', total)
          }
        }
      })
    }else if(activeSelect == '2') {
      this.upload.upload({
        file: {
          file: file.slice(0, file.size),
          mime: file.type,
        },
        request: {
          exitDataFn: this.exitDataFn,
          uploadFn: this.uploadFn,
          completeFn: (...values) => {
            return this.completeFn(...values)
          },
          callback: (err, value) => {
            this.callback(err, value)
            this.setState({
              single: null
            })
          },
        },
        lifecycle: {
          reading({ name, task, current, total }) {
            console.log('loading: ', current, 'total', total)
          }
        }
      })
    }else {
      const fileReader = new FileReader()
      const that = this
      fileReader.onload = function(e) {
        that.upload.upload({
          file: {
            file: e.target.result,
            mime: file.type,
          },
          request: {
            exitDataFn: that.exitDataFn,
            uploadFn: that.uploadFn,
            completeFn: (...values) => {
              that.completeFn(...values)
            },
            callback: (err, value) => {
              that.callback(err, value)
              that.setState({
                single: null
              })
            },
          },
          lifecycle: {
            reading({ name, task, current, total }) {
              console.log('loading: ', current, 'total', total)
            }
          }
        })
      }
      fileReader.readAsArrayBuffer(file)
    }
    
  }

  //多文件上传
  handleMultipleFileUpload = (e) => {
    if(this.state.multiple) return
    const files = Object.values(e.target.files)
    const common = {
      request: {
        exitDataFn: this.exitDataFn,
        uploadFn: this.uploadFn,
        completeFn: (...values) => {
          this.completeFn(...values)
        },
        callback: (err, value) => {
          this.callback(err, value)
          this.setState({
            multiple: null
          })
        },
      },
      lifecycle: {
        reading({ name, task, current, total }) {
          console.log('loading: ', current, 'total', total)
        }
      }
    }
    this.setState({
      multiple: files
    })
    this.upload.upload(files.map(file => {
        return {
          ...common,
          file: {
            file,
            mime: file.type,
          }
        }
    }))
  }

  //控制上传
  handleControlFileUpload = (e) => {
    if(this.state.control) return
    const file = e.target.files[0]
    const that = this
    const [name] = this.upload.add({
      file: {
        file,
        mime: file.type
      },
      request: {
        exitDataFn: this.exitDataFn,
        uploadFn: this.uploadFn,
        completeFn: (...values) => {
          this.completeFn(...values)
        },
        callback: (err, value) => {
          this.callback(err, value)
          if(err && err.error !== "stop") {
            this.setState({
              control: null,
              name: null
            })
          }
        },
      },
      lifecycle: {
        reading({ name, task, current, total }) {
          console.log('loading: ', current, 'total', total)
        },
        uploading({ complete, total, task }) {
          that.setState({
            progress: Math.ceil(complete / total * 100)
          })
        }
      }
    })
    this.setState({
      name,
      control: file
    })
  }

  //上传
  handleUpload = () => {
    const { control, name } = this.state
    if(!control || !name) return
    this.upload.deal(name)
  }

  //暂停
  handleStop = () => {
    const { stop, name, control } = this.state
    if(!control || !name) return
    if(stop) {
      this.upload.start(name)
    }else {
      this.upload.stop(name)
    }
    this.setState({
      stop: !stop
    })
  }

  handleCancel = () => {
    const { control, name } = this.state
    if(!control || !name) return
    const status = this.upload.getStatus(name)
    if(status == 0) {
      this.upload.cancelAdd(name)
      console.log('清除任务')
    }else {
      this.upload.cancel(name)
      console.log('取消任务')
    }
    this.upload.cancel()
    this.setState({
      control: null,
      name: null
    })
  }

  //错误自动重试上传
  handleErrorRetryFileUpload = async (e) => {
    if(this.state.error) return
    const file = e.target.files[0]
    this.setState({
      error: file
    })
    const result = await this.upload.upload({
      file: {
        file
      },
      request: {
        exitDataFn: this.exitDataFn,
        uploadFn: this.uploadFn,
        completeFn: (...values) => {
          this.completeFn(...values)
        },
        callback: (err, value) => {
          this.callback(err, value)
          this.setState({
            error: null,
            name: null,
          })
        },
      },
      config: {
        retry: {
          times: 3
        },
      }
    })
  }

  render = () => {

    const { activeSelect, progress, stop } = this.state

    return (
      <div className="upload">
        <header>文件分片上传</header>
        <main>
          <div className="upload-select-list">
            <h2>通过以下选择控制上传的文件格式</h2>
            <div className="upload-select-list-content">
              {
                this.select.map(item => {
                  const { key, value } = item
                  return (
                    <div onClick={this.handleSelect.bind(this, key)} className={`upload-select-item ${activeSelect == key ? 'active-select' : ''}`} key={key}>{value}</div>
                  )
                })
              }
            </div>
          </div>
          <section>
            <h3>单文件上传(尝试不用类型文件上传在这里)</h3>
            <div>
              <input ref={ref => this.singleRef = ref} type="file" onChange={this.handleSingleFileUpload} />
              <File onClick={() => this.singleRef.click()}></File>
            </div>
          </section>
          <section>
            <h3>多文件上传</h3>
            <div>
              <input ref={ref => this.multipleRef = ref} type="file" multiple onChange={this.handleMultipleFileUpload} />
              <File onClick={() => this.multipleRef.click()}></File>
            </div>
          </section>
          <section>
            <h3>文件控制上传</h3>
            <div>
              <input ref={ref => this.controlRef = ref} type="file" onChange={this.handleControlFileUpload} />
              <File onClick={() => this.controlRef.click()}></File>
            </div>
            <div style={{marginTop: 20}}>
              <span className="button" style={{marginRight: 20}} onClick={this.handleUpload}>点我上传</span>
              <span className="button stop" style={{marginRight: 20}} onClick={this.handleStop}>{stop ? '继续' : '暂停'}(在解析中暂停需要从头开始解析)</span>
              <span className="button" onClick={this.handleCancel}>取消(取消后无法继续上传)</span>
              <div className="progress">
                <p style={{width:`${progress}%`}}></p>
              </div>
            </div>
          </section>
          <section>
            <h3>上传错误自动重试</h3>
            <input type="file" ref={ref => this.errorRef = ref} onChange={this.handleErrorRetryFileUpload} />
            <File onClick={() => this.errorRef.click()}></File>
          </section>
        </main>
        <footer>你可以在test/server/upload目录下查看合成的文件</footer>
      </div>
    )

  }

}
