import ArrayBufferSlicer from './base'
import { base64ToArrayBuffer } from '../tool'

export default class extends ArrayBufferSlicer<ArrayBuffer> {

  constructor(file?: string) {
    super(file ? base64ToArrayBuffer(file) : undefined)
  }

}