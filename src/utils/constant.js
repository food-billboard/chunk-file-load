const MIN_CHUNK = 1024 * 1024 * 5

const CACHE_STATUS = {
  pending: 'pending',
  fulfilled: 'fulfilled',
  rejected: 'rejected',
  cancel: 'cancel',
  stopping: 'stopping',
  doing: 'doing'
}

const CACHE_TEMPLATE = {
  file: null,
  chunks: [],
  completeChunks: [],
  watch: false,
  md5: null,
  status: CACHE_STATUS.pending
}

const DEFAULT_CONFIG = {
  retry: false,
  retyrTimes: 1,
  chunkSize: MIN_CHUNK
}

Object.seal(CACHE_STATUS)
Object.seal(CACHE_TEMPLATE)
Object.seal(DEFAULT_CONFIG)

export {
  MIN_CHUNK,
  CACHE_STATUS,
  CACHE_TEMPLATE,
  DEFAULT_CONFIG
}