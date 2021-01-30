import SparkMD5 from "spark-md5"
import { expose } from 'comlink'

export class Reader {
  async compile(source) {
    // console.log(source.b, typeof source.b)
    const data = source()
    console.log(data)
  }
}

expose(Reader)