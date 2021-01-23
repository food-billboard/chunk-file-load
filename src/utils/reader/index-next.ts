import Reader from './reader'
import WorkerPool from '../worker/worker.pool'
import { TFileParseProcess } from '../../upload/index.d'

function createId():string {
  return Date.now() + '' + Math.random()
}

export default class Wrapper {

  private static id: string

  public static createInstance(): {
    clean: () => any,
    id: string
  } {
    const id = createId()
    Wrapper.id = id
    return {
      clean: () => Reader.clean(id),
      id
    }
  }

  public static createReader(workerId: string, process: TFileParseProcess): Reader | null {
    if(!Wrapper.id) throw new Error('must to init')
    const worker = WorkerPool.getProcess(workerId)
    if(!worker) return null
    Reader.addFile(Wrapper.id, file)
    return new Reader(parentId, workerId, process)
  }

}

export const ACTION_TYPE = Reader.ACTION_TYPE