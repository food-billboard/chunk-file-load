import Upload from './base'
import {
    arrayBufferToBase64 as internalArrayBufferToBase64,
    base64ToArrayBuffer as internalBase64ToArrayBuffer, 
} from '../utils/tool'

class WeappUpload extends Upload {

  constructor() {
    super(...arguments)
  }

  #Blob: boolean = true

  #FileReader: boolean = true

  #ArrayBuffer: boolean = true

  #File: boolean = true

  #Btoa: boolean | Function = false

  #Atob: boolean | Function = false

  private SUPPORT_CHECK({ base64ToArrayBuffer, arrayBufferToBase64 }: {
        base64ToArrayBuffer?: (data: string) => ArrayBuffer
        arrayBufferToBase64?: (data: ArrayBuffer) => string
    }) {

        let notSupport:string[] = []
        if(typeof Blob === 'undefined') {
            notSupport.push('Blob')
            this.#Blob = false
        }
        if(typeof FileReader === 'undefined' ) {
            notSupport.push('FileReader')
            this.#FileReader = false
        }
        if(typeof ArrayBuffer === 'undefined') {
            notSupport.push('ArrayBuffer')
            this.#ArrayBuffer = false
        }
        if(typeof File === 'undefined') {
            notSupport.push('File')
            this.#File = false
        }
        if(!arrayBufferToBase64 && typeof btoa === 'undefined') {
            notSupport.push('btoa')
        }else {
            this.#Btoa = arrayBufferToBase64 || internalArrayBufferToBase64
        }
        if(!base64ToArrayBuffer && typeof atob === 'undefined') {
            notSupport.push('atob')
        }else {
            this.#Atob = base64ToArrayBuffer || internalBase64ToArrayBuffer
        }

        if(!this.#ArrayBuffer) throw new Error('this tool must be support for the ArrayBuffer')
        
        if(!!notSupport.length) console.warn('these api is not support: ', notSupport.join(','))
    }

}

export default WeappUpload

