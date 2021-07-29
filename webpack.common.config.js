const path = require('path')
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const WorkerPlugin = require('worker-plugin')

module.exports = {
  module: {
    rules: [
      {
        test: /\.(png|jpg|gif)$/,
        loader: ['file-loader']
      },
      { 
        test: /\.jsx?$/, 
        exclude:/node_modules/, 
        use: [
          {
            loader: 'babel-loader'
          }
        ],
      },
      {
        test: /\.tsx?$/,
        exclude:/node_modules/, 
        use: [
          {
            loader: 'ts-loader',
            options: {
              // transpileOnly: true,
              // onlyCompileBundledFiles: true,
              // happyPackMode: true
            }
          },
        ]
      }
    ]
  },
  plugins: [
    new ForkTsCheckerWebpackPlugin(),
    new WorkerPlugin()
  ],
  resolve: {
    alias: {
      "~":path.resolve(__dirname, "src")
    },
    extensions: [".ts", ".tsx", ".js", 'jsx']
  }
}