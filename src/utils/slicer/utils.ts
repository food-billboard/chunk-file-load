import { TFileType } from '../../upload/type'
import { base64Size } from '../tool'

export function getChunkSize(chunk:TFileType): number {
  if(!chunk) return 0
  let fileType = Object.prototype.toString.call(chunk);

  switch(fileType) {
    case '[object File]':
      return (chunk as File).size
    case '[object Blob]':
      return (chunk as Blob).size
    case '[object ArrayBuffer]':
      return (chunk as ArrayBuffer).byteLength
    case '[object String]':
      return base64Size(chunk as string)
    default:
      return 0
  }

}