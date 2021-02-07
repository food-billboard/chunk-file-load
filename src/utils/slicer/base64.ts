import Upload from '../../upload'
import ArrayBufferSlicer from './base'
import { base64ToArrayBuffer } from '../tool'

export default class extends ArrayBufferSlicer<ArrayBuffer> {

  constructor(context: Upload, file?: string) {
    super(context, file ? base64ToArrayBuffer(file) : undefined)
  }

}