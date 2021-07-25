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
  parseIgnore: false 
}

Object.seal(DEFAULT_CONFIG)

export {
  MAX_FILE_CHUNK,
  ECACHE_STATUS,
  DEFAULT_CONFIG,
  EActionType
}