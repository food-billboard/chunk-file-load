import merge from 'lodash/merge'
import Upload from './index'
import {
    arrayBufferToBase64 as internalArrayBufferToBase64,
    base64ToArrayBuffer as internalBase64ToArrayBuffer, 
} from '../utils/tool'
import { TLifecycle, TPlugins, Ttask, TFileType, TUploadFormData } from './type'

class WeUpload extends Upload {

	protected static plugins: Partial<TPlugins> = {
		slicer: (context: Upload) => {
			context.on('slicer', (_, __, file, complete) => {
				//在这里处理分片
				if(typeof file === 'string') {
					complete(WeUpload.atob(file))
				}else if(file instanceof ArrayBuffer) {
					complete(file)
				}else {
					throw new Error('can not slice this type file')
				}
			})
		}
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
		ignores?: string[]
	}) {
		super(options)
	}

	public static btoa = internalArrayBufferToBase64
	public static atob = internalBase64ToArrayBuffer

  //添加任务
  public add(...tasks: Ttask<TFileType>[]): Symbol[] {
    return this.emitter.add(...tasks.map(task => {
			const { request } = task
			const { uploadFn } = request
			//wrap uploadFn
			return merge(task, {
				request: merge(request, {
					uploadFn: function(formData: TUploadFormData) {
						const newFile = WeUpload.btoa(formData.file as ArrayBuffer)
						return uploadFn(merge(formData, {
							file: newFile
						}))
					}
				})
			})
		}))
  }

}

export default WeUpload

