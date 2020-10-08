const MAX_FILE_CHUNK = 1024 * 500

enum ECACHE_STATUS {
  pending ='pending',
  fulfilled = 'fulfilled',
  rejected = 'rejected',
  cancel = 'cancel',
  stopping = 'stopping',
  doing = 'doing'
}

const DEFAULT_CONFIG = {
  chunkSize: MAX_FILE_CHUNK
}

Object.seal(DEFAULT_CONFIG)

export {
  MAX_FILE_CHUNK,
  ECACHE_STATUS,
  DEFAULT_CONFIG
}