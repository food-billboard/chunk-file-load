import './index.css'
import { Upload } from '../../index'
const SingleFile = document.getElementsByClassName('single-file')[0]
const MultiFile = document.getElementsByClassName('multi-file')[0]
const ControlFile = document.getElementsByClassName('control-file')[0]
const button = document.getElementsByTagName('button')[0]
const progress = document.getElementsByClassName('progress')[0]
const progressContent = progress.getElementsByTagName('p')[0]
const clickList = document.getElementsByTagName('h2')
const sectionList = document.getElementsByTagName('section')
const one = clickList[0]
const two = clickList[1]
const three = clickList[2]
const oneSection = sectionList[0]
const twoSection = sectionList[1]
const threeSection = sectionList[2]

one.onclick = function() {
    if(uploading) return
    oneSection.setAttribute('class', 'active')
    twoSection.removeAttribute('class')
    threeSection.removeAttribute('class')
}

two.onclick = function() {
    if(uploading) return
    twoSection.setAttribute('class', 'active')
    oneSection.removeAttribute('class')
    threeSection.removeAttribute('class')
}

three.onclick = function() {
    if(uploading) return
    threeSection.setAttribute('class', 'active')
    twoSection.removeAttribute('class')
    oneSection.removeAttribute('class')
}

function ajax(url, method, data) {
    method = method.toLowerCase()
    const isGet = method === 'get'
    let newUrl = url
    if(isGet) {
        if(data) {
        if(Object.prototype.toString.call(data) === '[object Object]') {
            if(newUrl[newUrl.lnegth - 1] != '?') newUrl += '?'
            let arr = Object.keys(data)
            const length = arr.length
            newUrl += arr.reduce((acc, d, index) => {
            acc += (d + '=' + data[d])
            if(index != length - 1) acc += '&'
            return acc
            }, '')
        }else if(typeof data === 'string') {
            if(newUrl[newUrl.length - 1] === '?') {
            if(data[0] === '?') {
                data = data.slice(1)
            }
            newUrl += data
            }else {
            if(data[0] !== '?') {
                newUrl += '?'
            }
            newUrl += data
            }
        }
        } 
    }
    const xhr = new XMLHttpRequest()
    xhr.open(method, newUrl, true)

    if(isGet) {
        xhr.send()
    }else {
        xhr.send(data)
    }

    return new Promise((resolve, reject) => {
        xhr.onreadystatechange = function(e) {
        if(xhr.readyState == 4) {
            if((xhr.status >= 200 && xhr.status <=300) || xhr.status == 304 ) {
            let data = JSON.parse(e.target.response)
            const { success, res } = data
            if(success) {
                resolve(res)
            }else {
                reject('请求失败')
            }
            }
        }
        }
    })

}

const upload = new Upload()

let uploading = false

let oneFiles, twoFiles, threeFiles

//验证存在
function exitDataFn(data) {
    return ajax('/api/check', 'get', data)
}

//上传
function uploadFn(data) {
    if(threeFiles && threeFiles.length) {
        progressContent.style.width = upload.watch()[0]['progress'] * 100 + '%'
    }
    return ajax('/api/load', 'post', data)
} 

//回调
function callback(err, rest) {
    console.log('完成了', err, rest)
    oneFiles = []
    twoFiles = []
    threeFiles = []
    uploading = false
}

//完成通知
function completeFn({name, md5}) {
    return ajax('/api/complete', 'get', {md5})
}

SingleFile.onchange = function(e) {
    uploading = true
    const file = e.target.files[0]
    const _files = upload.upload({
        file,
        exitDataFn,
        uploadFn,
        completeFn,
        callback
    })
    oneFiles = [..._files]
}

MultiFile.onchange = function(e) {
    uploading = true
    const _files = Object.values(e.target.files)
    const common = {
        exitDataFn,
        uploadFn,
        completeFn,
        callback
    }
    const __files = upload.upload(_files.map(file => {
        return {
            ...common,
            file
        }
    }))
    twoFiles = [...__files]
}

ControlFile.onchange = function(e) {
    const file = e.target.files[0]
    const files = upload.on({
        file,
        exitDataFn,
        uploadFn,
        completeFn,
        callback
    })
    threeFiles = [...files]
}

button.onclick = function() {
    uploading = true
    upload.emit(threeFiles)
}