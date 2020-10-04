const path = require('path')
const HtmlWebPackPlugin = require('html-webpack-plugin')
const { CleanWebpackPlugin } = require('clean-webpack-plugin')
const webpack = require('webpack')

module.exports = {
  entry: ['./test/client/index.js', './src/index.ts'],
  output: {
    filename: '[name].[hash].bundle.js',
    path: path.resolve(__dirname, 'test/dist')
  },
  module: {
    rules: [
      {
        test: /\.(t|j)sx?/,
        use: [
          {
            loader: 'babel-loader',
          },
          // {
          //   loader: 'ts-loader'
          // }
        ],
        exclude: '/node_modules/'
      }
    ]
  },
  plugins: [
    new CleanWebpackPlugin(),
    new HtmlWebPackPlugin({ 
      template: './test/client/index.html',
      cache: false
    }),
    // new webpack.optimize.CommonsChunkPlugin({
    //   name: [ 'vendor' ],
    //   filename: '[name].js',
    //   minChunk: function(module, _) {
    //     return (
    //       module.resource &&
    //       /\,js$/.test(module.resource) &&
    //       module.resource.indexOf(path.join('./node_module')) === 0
    //     )
    //   }
    // }),
    // new webpack.optimize.CommonsChunkPlugin({
    //   name: 'runtime',
    //   filename: '[name].js',
    //   chunks: ['vendor']
    // })
  ],
  resolve: {
  //   alias: {
  //     Module: path.resolve(__dirname, 'lib/module')
  //   },
    extensions: [".ts", ".tsx", ".js", '.jsx']
  },
  optimization: {
    splitChunks: {
      chunks: 'all'
    }
  },
}