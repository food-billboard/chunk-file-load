import EventEmitter from 'eventemitter3'

type eventFunc = (...args: any[]) => any
type TActionType =  keyof Pick<EventEmitter, 'on' | 'addListener' | 'off' | 'once' | 'removeListener'>

export function defaultDeal(eventFunc: eventFunc) {
  return async function(...args: any[]) {
    let params = args.slice(0, -1)
    let [reject] = args.slice(-1)
    if(typeof reject !== 'function') params.push(reject)
    const response = await eventFunc(...params)
    if(typeof reject === 'function') return reject(response)
  }
}

export default class LifeCycle {

  private emitter: EventEmitter = new EventEmitter()

  private wrapper: Function = defaultDeal

  constructor(wrapper?: Function) {
    if(typeof wrapper === 'function') this.wrapper = wrapper
  }

  public onWithObject(events: {
    [name: string]: any
  }, action: TActionType='on') {

    Object.entries(events).forEach(event => {
      const [ eventName, eventFunc ] = event
      this.on(eventName, eventFunc, action)
    })

  }

  public onWithArray(events: { [name: string]: any }[], action: TActionType='on') {

    events.forEach(event => {
      this.onWithObject(event, action)
    })

  }

  public on(eventName: string, eventFunc: any, action: TActionType='on') {
    if(typeof eventName !== 'string' || typeof eventFunc !== 'function') return 
    const method: any = this.emitter[action]
    method(eventName, this.wrapper(eventFunc))
  }

  public emit(event: string, ...args: any[]) {
    this.emitter.emit(event, ...args)
  }

}