const MAX_FILE_CHUNK = 1024 * 1024 * 5

enum ECACHE_STATUS {
  pending ='pending',
  waiting = 'waiting',
  doing = 'doing',
  fulfilled = 'fulfilled',
  rejected = 'rejected',
  cancel = 'cancel',
  stopping = 'stopping',
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