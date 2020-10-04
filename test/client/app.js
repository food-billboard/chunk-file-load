import React, { Component } from 'react'
import { Upload } from '../../src'
import { base64ToArrayBuffer, arrayBufferToBase64 } from '../../src/utils/tool'
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
    name: null
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
  exitDataFn(data) {
    return Axios.get('/api/check', {
      params: {
        ...data
      }
    })
  }

  //上传
  uploadFn(data) {
    const { name } = this.state
    if(!!name) {
      this.setState({
        progress: this.upload.watch(name)[0]['progress'] * 100
      })
    }
    return Axios.post('/api/load', data)
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
    this.upload.upload({
      file,
      exitDataFn: this.exitDataFn,
      uploadFn: this.uploadFn,
      completeFn: (...values) => {
        this.setState({
          single: null
        })
        this.completeFn(...values)
      },
      callback: this.callback
    })
  }

  //多文件上传
  handleMultipleFileUpload = (e) => {
    if(this.state.multiple) return
    const files = Object.values(e.target.files)
    const common = {
      exitDataFn: this.exitDataFn,
      uploadFn: this.uploadFn,
      completeFn: (...values) => {
        this.setState({
          multiple: null
        })
        this.completeFn(...values)
      },
      callback: this.callback
    }
    this.setState({
      multiple: files
    })
    this.upload.upload(files.map(file => {
        return {
          ...common,
          file
        }
    }))
  }

  //控制上传
  handleControlFileUpload = (e) => {
    if(this.state.control) return
    const file = e.target.files[0]
    const [name] = this.upload.on({
      file,
      exitDataFn: this.exitDataFn,
      uploadFn: this.uploadFn,
      completeFn: (...values) => {
        this.setState({
          name: null,
          control: null
        })
        this.completeFn(...values)
      },
      callback: this.callback
    })
    this.setState({
      name
    })
  }

  //上传
  handleUpload = () => {
    const { control, name } = this.state
    if(!control || !name) return
    this.upload.emit(name)
  }

  //错误自动重试上传
  handleErrorRetryFileUpload = async (e) => {
    if(this.state.error) return
    const file = e.target.files[0]
    const result = await this.upload.upload({
      file,
      exitDataFn: this.exitDataFn,
      uploadFn: this.uploadFn,
      completeFn: (...values) => {
        this.setState({
          name: null,
          control: null
        })
        this.completeFn(...values)
      },
      callback: this.callback,
      config: {
        retry: true,
        retryTimes: 3
      }
    })
    console.log(result)
    this.setState({
      error: file
    })
  }

  render = () => {

    const { activeSelect, progress } = this.state

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
            <h3>单文件上传</h3>
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
              <span className="button" onClick={this.handleUpload}>点我上传</span>
              <div class="progress">
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
