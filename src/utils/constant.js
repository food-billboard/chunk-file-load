const MIN_CHUNK = 1024 * 1024 * 5

const CACHE_TEMPLATE = {
  file: null,
  chunks: [],
  completeChunks: [],
  watch: false,
  md5: null,
  status: CACHE_STATUS.pending
}

const CACHE_STATUS = {
  pending: 'pending',
  fulfilled: 'fulfilled',
  rejected: 'rejected',
  cancel: 'cancel',
  stopping: 'stopping',
  doing: 'doing'
}

export {
  MIN_CHUNK,
  CACHE_STATUS,
  CACHE_TEMPLATE
}