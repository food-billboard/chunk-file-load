const { merge } = require('webpack-merge')
const webpackCommon = require('./webpack.common')
const webpack = require('webpack')

module.exports = merge(webpackCommon, {
  devtool: 'inline-source-map',
  devServer: {
    contentBase: './test/dist',
    hot: true,
    proxy: {
      '/api': {
        target: 'http://192.168.1.100:3000',
        secure: false,
      }
    }
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      },
      {
        test: /\.(png|jpg|gif|jpeg)$/,
        use: 'file-loader'
      },
    ]
  },
  plugins: [
    new webpack.NamedModulesPlugin(),
    new webpack.HotModuleReplacementPlugin(),
  ],
  mode: 'development'
})