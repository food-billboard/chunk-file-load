import SparkMd5 from 'spark-md5'
import Emitter from 'eventemitter3'
import { arrayBufferToBase64, base64Size, base64ToArrayBuffer } from '../src/utils/tool'

export const exitDataFn = ({ filename, md5, suffix, size, chunkSize, chunksLength }) => {
  return false
}

export const uploadFn = (data) => {
  const index = data.get ? data.get("index") : data.index 
  const nextOffset = (+index + 1) * BASE_SIZE
  return {
    data: nextOffset > FILE_SIZE ? FILE_SIZE : nextOffset
  } 
}

export const completeFn = ({ name: md5 }) => {}

export const config = {
  retry: {
    times: 3
  },
  chunkSize: 1024 * 500
}

export const callback = (done) => (error) => {
  if(error) {
    done(error)
  }else {
    done()
  }
}

export const FILE_SIZE = 1024 * 1024 * 20
export const BASE_SIZE = 1024 * 500
export const mime = 'image/jpeg'

export const arrayBufferFile = new ArrayBuffer(FILE_SIZE)
export const base64File = arrayBufferToBase64(new ArrayBuffer(BASE_SIZE))
export const file = new File([arrayBufferFile], mime)
export const blobFile = new Blob([arrayBufferFile])
const slice = ArrayBuffer.prototype.slice

const prevLen = Math.floor(FILE_SIZE / 4 / config.chunkSize)

export const chunks = [
  ...(new Array(prevLen).fill(0).map((_, index) => {
    return new File([slice.call(arrayBufferFile, index * config.chunkSize, (index + 1) * config.chunkSize)], 'chunk-test')
  })),
  ...(new Array(prevLen).fill(0).map((_, index) => {
    return new Blob([slice.call(arrayBufferFile, (index + prevLen) * config.chunkSize, (index + 1 + prevLen) * config.chunkSize)])
  })),
  ...(new Array(prevLen).fill(0).map((_, index) => {
    return slice.call(arrayBufferFile, (index + prevLen * 2) * config.chunkSize, (index + 1 + prevLen * 2) * config.chunkSize)
  })),
  ...(new Array((Math.ceil((FILE_SIZE - (prevLen * 3 * config.chunkSize)) / config.chunkSize))).fill(0).map((_, index) => {
    return arrayBufferToBase64(slice.call(arrayBufferFile, (index + prevLen * 3) * config.chunkSize, (index + 1 + prevLen * 3) * config.chunkSize))
  }))
]

export const totalChunks = Math.ceil(FILE_SIZE / config.chunkSize)

export const getBase64Md5 = () => {
  let currentChunk = 0
  const spark = new SparkMd5.ArrayBuffer()
  const totalChunks = Math.ceil(base64Size(base64File) / config.chunkSize)
  const arraybuffer = base64ToArrayBuffer(base64File)
  while(currentChunk < totalChunks) {
    let start = currentChunk * config.chunkSize,
        end = currentChunk + 1 === totalChunks ? BASE_SIZE : ( currentChunk + 1 ) * config.chunkSize
    const _chunks = slice.call(arraybuffer, start, end)

    currentChunk ++
    spark.append(_chunks)
  }

  const md5 = spark.end()
  spark.destroy()
  return md5
}

export const getFileMd5 = () => {
  let currentChunk = 0;
  const spark = new SparkMd5.ArrayBuffer()
  while(currentChunk < totalChunks) {
    let start = currentChunk * config.chunkSize,
        end = currentChunk + 1 === totalChunks ? FILE_SIZE : ( currentChunk + 1 ) * config.chunkSize
    const _chunks = slice.call(arrayBufferFile, start, end)

    currentChunk ++
    spark.append(_chunks)
  }

  const md5 = spark.end()
  spark.destroy()
  return md5
}

const emitter = new Emitter()
let index = 0
export const emitterCollection = () => {
  index ++
  const name = index.toString()
  return {
    collection: function(method) {
      emitter.once(name, method)
    },
    emit: () => {
      emitter.emit(name)
    }
  }
}

export const dealResultExpect = (result) => {
  expect(result).toBeInstanceOf(Array)
  expect(result.length).toBe(1)
}