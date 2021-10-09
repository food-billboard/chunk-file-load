import { merge } from 'lodash'

const MAX_FILE_CHUNK = 1024 * 1024 * 5

enum ECACHE_STATUS {
  pending = 0,
  waiting = 1,
  reading = 2,
  uploading = 3,
  fulfilled = 4,
  rejected = -3,
  cancel = -2,
  stopping = -1,
}

enum EActionType {
  MD5,
  FILE,
  BUFFER,
  BASE64
}

const DEFAULT_CONFIG = {
  chunkSize: MAX_FILE_CHUNK,
  parseIgnore: false,
  requestCache: false 
}

function mergeConfig(config: any={}) {
  const newConfig = merge({}, DEFAULT_CONFIG, config)
  if(newConfig.requestCache === true) {
    newConfig.requestCache = {
      exitDataFn: true,
      uploadFn: true,
      completeFn: true 
    }
  }
  return newConfig
}

Object.seal(DEFAULT_CONFIG)

export {
  MAX_FILE_CHUNK,
  ECACHE_STATUS,
  mergeConfig,
  EActionType
}