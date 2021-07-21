import merge from 'lodash/merge'
import { isMd5 } from '../tool' 
import { TWrapperTask } from '../../upload/type'

export class FileTool {

  constructor(file: Omit<TWrapperTask, 'tool'>) {
    this.file = file 
  }

  private file: Omit<TWrapperTask, 'tool'>

  // //是否忽略文件解析
  // public isParseIgnore() {
  //   return !!this.file.config.parseIgnore || !!isMd5(this.file.file.md5!)
  // } 

  // //是否需要压缩文件
  // public isZipFile() {
  //   return !!this.file.config.zip
  // }

}

export default function(file: Omit<TWrapperTask, 'tool'>): TWrapperTask {
  return merge({}, file, {
    tool: {
      file: new FileTool(file)
    }
  })
}