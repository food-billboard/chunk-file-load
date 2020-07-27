const fs = require('fs')
const path = require('path')

function getExtName(name) {
    return path.extname(name)
}

function getUploadFileFolder(filename, folderPath='upload') {
    //文件分片总目录
    const entryPath = path.join(__dirname, folderPath)
    //不存在则直接创建
    if(!fs.existsSync(entryPath) || !fs.statSync(entryPath).isDirectory()) {
        fs.mkdirSync(entryPath)
    }
    const filePath = path.join(entryPath, filename)
    //不存在则直接创建
    if(!fs.existsSync(filePath) || !fs.statSync(filePath).isDirectory()) {
        fs.mkdirSync(filePath)
    }

    return fs.readdirSync(filePath)
}

//生成blob文件保存本地
function mkBlob(file, filename, index, folderPath='upload') {
    const uploadPath = path.join(__dirname, folderPath, filename, '/')
    const readPath = file
    const writePath = uploadPath + filename + '-' + index
    //创建读写流
    const readStream = fs.createReadStream(readPath)
    const writeStream = fs.createWriteStream(writePath)
    // 创建文件并将其保存在指定目录下
    readStream.pipe(writeStream)
    return new Promise((resolve, _) => {
        readStream.on('end', function(err, res) {
            fs.unlinkSync(file)
            resolve()
        })
    })
}

//返回收到的文件的分片
function getChunkList(filename) {
    const chunkList = getUploadFileFolder(filename)
    return chunkList
            .filter(item => getExtName(item) === '' && item !== filename && item.includes('-'))
}

//分片合并
function mergeChunk(filename, store, folderPath="upload") {
    const file = path.join(__dirname, folderPath, filename)
    const chunkList = getChunkList(filename).sort(function(chunkA, chunkB) {
        const suffixA = chunkA.split('-')[1]
        const suffixB = chunkB.split('-')[1]
        return ~~suffixA - ~~suffixB
    })
    const type = store[filename]['suffix']
    
    //创建集合文件
    fs.writeFileSync(path.resolve(file, filename), '')

    chunkList.forEach(chunk => {
        fs.appendFileSync(path.resolve(file, filename), fs.readFileSync(file + '/' + chunk))
        fs.unlinkSync(path.resolve(file, chunk))
    })
    console.log(type)
    fs.renameSync(path.resolve(file, filename), path.resolve(file, `${filename}.${type.includes('/') ? type.split('/')[1] : type}`))
    store[filename]['status'] = 'complete'
}

module.exports = {
    getUploadFileFolder,
    mkBlob,
    getChunkList,
    mergeChunk,
    getExtName
}