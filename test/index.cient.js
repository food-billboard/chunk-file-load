
const SingleFile = document.getElementsByClassName('single-file')[0]
const MultiFile = document.getElementsByClassName('multi-file')[0]
const ControlFile = document.getElementsByClassName('control-file')[0]
const button = document.getElementsByTagName('button')[0]

SingleFile.onchange = function(e) {
    const file = e.target.files[0]
}

MultiFile.onchange = function(e) {
    const files = Object.values(e.target.files)

}

ControlFile.onchange = function(e) {
    const file = e.target.files[0]
}

button.onclick = function() {
    console.log('上传')
}