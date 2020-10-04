const MIN_CHUNK = 1024 * 1024 * 5

enum ECACHE_STATUS {
  pending ='pending',
  fulfilled = 'fulfilled',
  rejected = 'rejected',
  cancel = 'cancel',
  stopping = 'stopping',
  doing = 'doing'
}

const DEFAULT_CONFIG = {
  chunkSize: MIN_CHUNK
}

Object.seal(DEFAULT_CONFIG)

export {
  MIN_CHUNK,
  ECACHE_STATUS,
  DEFAULT_CONFIG
}