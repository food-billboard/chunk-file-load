import Upload from './index'
import { TLifecycle, TPlugins, TConfig } from './type'

class WeUpload extends Upload {

protected static plugins: Partial<TPlugins> = {
	slicer: [
		async function(_, __, ___, file) {
			//在这里处理分片
			if(typeof file === 'string') {
				return WeUpload.atob(file)
			}else if(file instanceof ArrayBuffer) {
				return file 
			}else {
				return Promise.reject('can not slice this type file')
			}
		}
	]
}

	public static setOptions({
		arrayBufferToBase64,
		base64ToArrayBuffer
	}: {
		arrayBufferToBase64: (chunk: ArrayBuffer) => string,
		base64ToArrayBuffer: (chunk: string) => ArrayBuffer
	}) {
		WeUpload.btoa = arrayBufferToBase64
		WeUpload.atob = base64ToArrayBuffer
	}
  
	constructor(options: {
		lifecycle?: TLifecycle,
		ignores?: string[],
		config?: TConfig
	}) {
		super(options)
	}

}

export default WeUpload

