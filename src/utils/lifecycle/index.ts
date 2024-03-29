import { merge, omit } from 'lodash'
import { SuperPartial, TLifecycle, TProcessLifeCycle, TWrapperTask } from '../../upload/type'
import { ECACHE_STATUS } from '../constant'

type TActionType = 'on' | 'addListener' | 'off' | 'once' | 'removeListener'

const PERFORMANCE_COUNTER_MAP: {
  [P in TActionType]: number
} = {
  on: -1,
  addListener: -1,
  off: 0,
  once: 1,
  removeListener: 0
}

const BASE_GLOBAL_LIFECYCLE_CONFIG = {
  key: "_internal_lifecycle_" as any,
  counter: -1,
}

export default class LifeCycle {

  constructor() {
    this.init()
  }

  public init() {
    this.lifecycleMap = {
      beforeRead: [],
      reading: [
        merge({}, BASE_GLOBAL_LIFECYCLE_CONFIG, { action({ current, total }: { current: number, total: number }) {
          return {
            process: {
              current,
              complete: current,
              total
            }
          }
        } })
      ],
      beforeCheck: [
        merge({}, BASE_GLOBAL_LIFECYCLE_CONFIG, { action({ task }: { task: TWrapperTask }) {
          const total = Math.ceil(task.process.total / task.config.chunkSize)
          return {
            process: {
              current: 0,
              complete: 0,
              total
            }
          }
        } })
      ],
      afterCheck: [],
      uploading: [
        merge({}, BASE_GLOBAL_LIFECYCLE_CONFIG, { action({ current, total, complete }: { current: number, total: number, complete: number }) {
          return {
            process: {
              current,
              total,
              complete
            }
          }
        } })
      ],
      afterCancel: [],
      afterComplete: [],
      beforeComplete: [
        merge({}, BASE_GLOBAL_LIFECYCLE_CONFIG, { action({ task }: { name: Symbol, task: TWrapperTask }) {
          const total = Math.ceil(task.file.size / task.config.chunkSize)
          return {
            process: {
              current: total,
              total: total,
              complete: total
            }
          }
        } })
      ],
      afterStop: [],
      retry: [
        merge({}, BASE_GLOBAL_LIFECYCLE_CONFIG, { action({ rest }: { rest: number }) {
          return {
            config: {
              retry: {
                times: rest
              }
            }
          }
        } })
      ],
    }
  }

  protected lifecycleMap!: {
    [P in keyof Required<TLifecycle>]: Array<{
      key: Symbol | null | "_internal_lifecycle_"
      action: TLifecycle<Promise<SuperPartial<TWrapperTask>> | SuperPartial<TWrapperTask>>[P]
      counter: number // -1 不销毁 0 销毁
      skip?: true
    }> }

  private wrapper(_/*licycle_name 暂时无用*/: keyof TLifecycle, eventFunc: Function) {
    return async function(params: any, response: any) {
      let state: SuperPartial<TWrapperTask> & { error: boolean } = {
        error: false
      }
      try {
        const value = await eventFunc(params, response)
        if(value == false) state = merge(state, { status: ECACHE_STATUS.stopping })
      }catch(err) {
        state.error = true
      }finally {
        const { error } = state
        if(!!error) return Promise.reject(state)
        return Promise.resolve(state)
      }
    }
  }

  public onWithObject(events: {
    [P in keyof TLifecycle]: TLifecycle[P]
  }, name: Symbol | null=null, action: TActionType='on') {
    Object.entries(events).forEach(event => {
      const [ eventName, eventFunc ] = event
      this.on(eventName as keyof TLifecycle, eventFunc as TLifecycle, name, action)
    })

  }

  public onWithArray(events: { [P in keyof TLifecycle]: TLifecycle[P] }[], name: Symbol | null=null, action: TActionType='on') {
    events.forEach(event => {
      this.onWithObject(event, name, action)
    })
  }

  public on(eventName: keyof TLifecycle, eventFunc: TLifecycle, name: Symbol | null, action: TActionType='on') {
    if(typeof eventName !== 'string' || typeof eventFunc !== 'function' || !this.lifecycleMap[eventName]) return 
    const index = this.lifecycleMap[eventName].findIndex((item: any) => item.key == name)

    if(action === 'off' || action === 'removeListener') {
      if(!~index) return 
      this.lifecycleMap[eventName].splice(index, 1)
    }else {
      let lifecycleState = {
        key: name,
        action: this.wrapper(eventName, eventFunc),
        counter: PERFORMANCE_COUNTER_MAP[action]
      }
      if(!!~index) {
        this.lifecycleMap[eventName].splice(index, 1, lifecycleState)
      }else {
        this.lifecycleMap[eventName].push(lifecycleState)
      }
    }
  }

  public emit: TProcessLifeCycle<Promise<SuperPartial<TWrapperTask>>> = async (event, params) => {
    let targetEventQueue = this.lifecycleMap[event]
    let error:any = false
    let response: SuperPartial<TWrapperTask> | false = {}
    const { name } = params 
    for(let i = 0; i < targetEventQueue.length; i ++) {
      const { key, counter, action } = targetEventQueue[i]
      if(typeof key === "symbol" && key !== name) continue
      let res = {}
      if(!!~counter) {
        targetEventQueue[i].counter --
      }
      if(counter == 0) {
        targetEventQueue[i].skip = true
      }
      try {
        res = await action!(params as any, response)
      }catch(err) {
        error = err
        if(typeof error === 'object') {
          res = merge(res, omit(error, ['error']))
        }
        break
      }finally {
        response = merge({}, response, res instanceof Object ? res : {})
      }
    }
    targetEventQueue = (targetEventQueue as Array<any>).filter(event => !event.skip)

    if(error) return Promise.reject(error)
    return Promise.resolve(response)

  }

}