const path = require('path')
const { merge } = require('webpack-merge')
const commonConfig = require('./webpack.common.config')
const TerserPlugin = require('terser-webpack-plugin')
const DashboardPlugin = require('webpack-dashboard/plugin')
const BundleAnalyzerPlugin  = require('webpack-bundle-analyzer').BundleAnalyzerPlugin  
const webpack = require('webpack')

module.exports = merge(commonConfig, {
  mode: 'production',
  entry: path.resolve(__dirname, 'src/index.ts'),
  output: {
    path: path.resolve(__dirname, './lib'),
    filename: 'index.js',
    library: 'Upload',
    libraryTarget: 'umd',
    globalObject: 'this'
    // libraryExport: 'default',
    // chunkFilename: '[name].[chunkhash:8].chunk.js',
  },
  node: {
    process: false
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify('production')
    }),
    new webpack.HashedModuleIdsPlugin(),
    new BundleAnalyzerPlugin(),
    new DashboardPlugin(),
  ],
  optimization: {
    concatenateModules: true,
    sideEffects: false,
    minimize: true,
    minimizer: [ new TerserPlugin({
      terserOptions: {
        compress: {
          warnings: false
        }
      }
    }) ],
    // splitChunks:{
    //   cacheGroups:{
    //     vendors:{//node_modules里的代码
    //       test:/[\\/]node_modules[\\/]/,
    //       chunks: "initial",
    //       name:'vendors', //chunks name
    //       priority:10, //优先级
    //       enforce:true 
    //     }
    //   }
    // }
  }
})