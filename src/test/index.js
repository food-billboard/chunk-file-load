const Router = require('./server/router')
const Cors = require('koa-cors')
const Koa = require('koa')
const path = require('path')

const app = new Koa()
app.use(Cors())
app.use(Router.routes()).use(Router.allowedMethods())

app.listen(4000, () => {
    console.log('Server is run in port 4000')
})