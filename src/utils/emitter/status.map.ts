import { ECACHE_STATUS } from '../constant'
import { TWrapperTask } from '../../upload/type'

const map: {
  [key: string]: (ECACHE_STATUS | ((status: ECACHE_STATUS, task: TWrapperTask) => boolean))[]
} = {
  pending: [ECACHE_STATUS.waiting, ECACHE_STATUS.pending],
  waiting: [ECACHE_STATUS.waiting, ECACHE_STATUS.reading, ECACHE_STATUS.rejected, ECACHE_STATUS.cancel, ECACHE_STATUS.stopping, (status, task) => {
    if(status === ECACHE_STATUS.uploading) {
      return task.tool.file.isParseIgnore()
    } 
    return false 
  }],
  reading: [ECACHE_STATUS.reading, ECACHE_STATUS.cancel, ECACHE_STATUS.rejected, ECACHE_STATUS.stopping, ECACHE_STATUS.uploading],
  uploading: [ECACHE_STATUS.rejected, ECACHE_STATUS.stopping, ECACHE_STATUS.cancel, ECACHE_STATUS.uploading, ECACHE_STATUS.fulfilled],
  fulfilled: [],
  rejected: [ECACHE_STATUS.rejected, ECACHE_STATUS.pending],
  cancel: [ECACHE_STATUS.rejected],
  stopping: [ECACHE_STATUS.stopping, ECACHE_STATUS.pending]
}

const isExistsOrValid = (status: ECACHE_STATUS, task: TWrapperTask, origin: (ECACHE_STATUS | ((status: ECACHE_STATUS, task: TWrapperTask) => boolean))[]) => {
  return origin.some(item => {
    if(typeof item === "number") return item === status
    return item(status, task)
  })
}


export const STATUS_MAP: {
  [key: string]: any
} = {
  [ECACHE_STATUS.pending](status: ECACHE_STATUS, task: TWrapperTask) {
    const target = isExistsOrValid(status, task, map.pending)
    return target ? status : undefined
  }, 
  [ECACHE_STATUS.waiting](status: ECACHE_STATUS, task: TWrapperTask) {
    const target = isExistsOrValid(status, task, map.waiting)
    return target ? status : undefined
  }, 
  [ECACHE_STATUS.reading](status: ECACHE_STATUS, task: TWrapperTask) {
    const target = isExistsOrValid(status, task, map.reading)
    return target ? status : undefined
  }, 
  [ECACHE_STATUS.uploading](status: ECACHE_STATUS, task: TWrapperTask) {
    const target = isExistsOrValid(status, task, map.uploading)
    return target ? status : undefined
  }, 
  [ECACHE_STATUS.fulfilled](status: ECACHE_STATUS, task: TWrapperTask) {
    const target = isExistsOrValid(status, task, map.fulfilled)
    return target ? status : undefined
  }, 
  [ECACHE_STATUS.stopping](status: ECACHE_STATUS, task: TWrapperTask) {
    const target = isExistsOrValid(status, task, map.stopping)
    return target ? status : undefined
  }, 
  [ECACHE_STATUS.cancel](status: ECACHE_STATUS, task: TWrapperTask) {
    const target = isExistsOrValid(status, task, map.cancel)
    return target ? status : undefined
  }, 
  [ECACHE_STATUS.rejected](status: ECACHE_STATUS, task: TWrapperTask) {
    const target = isExistsOrValid(status, task, map.rejected)
    return target ? status : undefined
  }, 
}