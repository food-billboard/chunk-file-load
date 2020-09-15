import Upload from './upload'

if(!window || (!!window && !window.Blob)) console.log('this tool in this devlopment environment is not support!')

export {
  Upload
}