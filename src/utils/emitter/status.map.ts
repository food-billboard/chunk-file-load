import { ECACHE_STATUS } from '../constant'
import { TWrapperTask } from '../../upload/type'

const map: {
  [key: string]: ECACHE_STATUS[]
} = {
  pending: [ECACHE_STATUS.waiting, ECACHE_STATUS.pending],
  waiting: [ECACHE_STATUS.waiting, ECACHE_STATUS.reading, ECACHE_STATUS.rejected, ECACHE_STATUS.cancel, ECACHE_STATUS.stopping],
  reading: [ECACHE_STATUS.reading, ECACHE_STATUS.cancel, ECACHE_STATUS.rejected, ECACHE_STATUS.stopping, ECACHE_STATUS.uploading],
  uploading: [ECACHE_STATUS.rejected, ECACHE_STATUS.stopping, ECACHE_STATUS.cancel, ECACHE_STATUS.uploading, ECACHE_STATUS.fulfilled],
  fulfilled: [],
  rejected: [ECACHE_STATUS.rejected, ECACHE_STATUS.pending],
  cancel: [ECACHE_STATUS.rejected],
  stopping: [ECACHE_STATUS.stopping, ECACHE_STATUS.pending]
}


export const STATUS_MAP: {
  [key: string]: any
} = {
  [ECACHE_STATUS.pending](status: ECACHE_STATUS, _: TWrapperTask) {
    const target = map.pending.includes(status)
    return target ? status : undefined
  }, 
  [ECACHE_STATUS.waiting](status: ECACHE_STATUS, _: TWrapperTask) {
    const target = map.waiting.includes(status)
    return target ? status : undefined
  }, 
  [ECACHE_STATUS.reading](status: ECACHE_STATUS, _: TWrapperTask) {
    const target = map.reading.includes(status)
    return target ? status : undefined
  }, 
  [ECACHE_STATUS.uploading](status: ECACHE_STATUS, _: TWrapperTask) {
    const target = map.uploading.includes(status)
    return target ? status : undefined
  }, 
  [ECACHE_STATUS.fulfilled](status: ECACHE_STATUS, _: TWrapperTask) {
    const target = map.fulfilled.includes(status)
    return target ? status : undefined
  }, 
  [ECACHE_STATUS.stopping](status: ECACHE_STATUS, _: TWrapperTask) {
    const target = map.waiting.includes(status)
    return target ? status : undefined
  }, 
  [ECACHE_STATUS.cancel](status: ECACHE_STATUS, _: TWrapperTask) {
    const target = map.waiting.includes(status)
    return target ? status : undefined
  }, 
  [ECACHE_STATUS.rejected](status: ECACHE_STATUS, _: TWrapperTask) {
    const target = map.waiting.includes(status)
    return target ? status : undefined
  }, 
}