import { TFileType } from '../../upload/index.d'
import { base64Size } from '../tool'

export function getChunkSize(chunk:TFileType): number {
  if(!chunk) return 0
  let fileType = Object.prototype.toString.call(chunk);
  [ fileType ] = fileType.match(/(?<=\[object ).+(?=\])/) || []

  switch(fileType.toLowerCase().trim()) {
    case 'file':
      return (chunk as File).size
    case 'blob':
      return (chunk as Blob).size
    case 'arraybuffer':
      return (chunk as ArrayBuffer).byteLength
    case 'string':
      return base64Size(chunk as string)
    default:
      return 0
  }

}