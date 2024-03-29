const Router = require('@koa/router')
const multiparty = require('koa2-multiparty')
const { 
    getUploadFileFolder,
    mkBlob,
    getChunkList,
    mergeChunk,
    getExtName
} = require('./utils')
const router = new Router()

const cache = {}

router
.get('/api/check', async(ctx) => {
    
    const query = ctx.request.query
    const {
        md5,
        chunksLength,
    } = query
    
    if(!cache[md5]) cache[md5] = {
        ...query,
        completeChunks: 0,
        status: 'load'
    }

    if(cache[md5]['status'] === 'complete') {
        ctx.body = JSON.stringify({
            success: true,
            res: {
                data: false
            }
        })
    }else {
        const chunkList = getUploadFileFolder(md5)
        let result
        if(chunkList.some(chunk => (getExtName(chunk) !== '' ? chunk.split('.')[0] : chunk) === md5)) {
            cache[md5]['status'] = 'complete'
            result = false
        }else {
            result = getChunkList(md5).map(item => parseInt(item.split('-')[1]))
        }
        result = !!result ? new Array(parseInt(chunksLength)).fill(0).map((_, index) => index).filter((item, index) => !result.includes(item)) : result

        ctx.body = JSON.stringify({
            success: true,
            res: {
                data: result
            }
        })
    }
})
.post('/api/load', multiparty(), async(ctx) => {
    const data = ctx.req.body
    const files = ctx.req.files
    const {
        md5,
        index
    } = data
    let nextOffset = (+index + 1) * cache[md5].chunkSize
    nextOffset = nextOffset > cache[md5].size ? cache[md5].size : nextOffset
    ctx.body = JSON.stringify({
        success: true,
        res: {
            data: nextOffset
        }
    })
    if(cache[md5]['completeChunks'] !== cache[md5]['chunksLength']) {
        cache[md5]['completeChunks'] ++
    }
    mkBlob(files.file.path, md5, index)
    .then(_ => {
        if(cache[md5]['completeChunks'] == cache[md5]['chunksLength']) {
            mergeChunk(md5, cache)
        }
    })
    .catch(err => {
        console.log(err)
    })
})
.get('/api/complete', async(ctx) => {
    const query = ctx.request.query
    const { md5 } = query

    if(!cache[md5]) {
        ctx.body = JSON.stringify({
            success: false,
            res: '文件不存在'
        })
        console.log('上传文件不存在')
    }else {
        const file = cache[md5]
        const { completeChunks, chunksLength } = file
        if(completeChunks == chunksLength) {
            ctx.body = JSON.stringify({
                success: true,
                res: '上传成功'
            })
        }else {
            ctx.body = JSON.stringify({
                success: false,
                res: '上传失败'
            })
        }
    }
})

module.exports = router