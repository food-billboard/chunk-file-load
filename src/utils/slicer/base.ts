import { TFileType } from '../../upload/index.d'

export default class Slicer<T extends TFileType> {

  constructor(file?: T) {
    if(file) {
      this.file = file
    }
  }

  protected file!: T

  public error(err: any) {
    return Promise.reject(err)
  }

}