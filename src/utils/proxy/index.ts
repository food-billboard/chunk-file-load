import EventEmitter from 'eventemitter3'
import { TProcessLifeCycle, TSetState, TGetState, UploadContext } from '../../upload/type'

export default class {

  constructor(context: UploadContext) {
    this.context = context
    this.init()
  }

  private init() {
    this.emit = this.context.emit
    this.dealLifecycle = this.context.LIFECYCLE_EMIT
    this.setState = this.context.emitter.setState.bind(this.context.emitter)
    this.getState = this.context.emitter.getTask.bind(this.context.emitter)
  }

  public context 

  public emit!: <T extends EventEmitter.EventNames<string>>(
    event: T,
    ...args: EventEmitter.EventArgs<string, T>
  ) => boolean

  public dealLifecycle!: TProcessLifeCycle 

  public setState!: TSetState

  public getState!: TGetState 

  public hasReaderEmit = () => {
    return this.hasEmit('reader') 
  }

  public hasSliceEmit = () => {
    return this.hasEmit('slicer')
  }

  public hasEmit = (name: string) => {
    return this.context.eventNames().includes(name)
  }

}