const path = require('path')
const webpack = require('webpack')
const ExtractTextPlugin = require("extract-text-webpack-plugin")
var HtmlWebpackPlugin = require('html-webpack-plugin')
const { CleanWebpackPlugin } = require('clean-webpack-plugin')
const commonConfig = require('./webpack.common.config')
const { merge } = require('webpack-merge')
const os = require('os')

function getIp() {
    const ifaces = os.networkInterfaces()
    let ip = '', result = []
    for(var dev in ifaces) {
        if(!!ifaces[dev]) {
            ifaces[dev].forEach(function(details) {
                if(ip === '' && details.family === 'IPv4' && !details.internal) {
                    ip = details.address
                    return;
                }
            })
        }
    }

    return ip || '127.0.0.1'
}

module.exports = merge(commonConfig, {
    entry: path.resolve(__dirname, './src/test-entry.js'),
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: '[name].bundle.[hash].js',
        globalObject: 'this'
    },
    mode: 'development',
    devtool: 'inline-source-map',
    module: {
        rules: [
            {
              test: /\.css$/,
              use: ExtractTextPlugin.extract({
                  fallback: "style-loader",
                  use: "css-loader"
              })
            }
        ]
    },
    plugins: [
        new ExtractTextPlugin("styles.css"),
        new CleanWebpackPlugin(),
        new HtmlWebpackPlugin({
            template: path.resolve(__dirname, './src/test/client/index.html')
        }),
        new webpack.HotModuleReplacementPlugin(),
        new webpack.NamedModulesPlugin(),
        // new webpack.optimize.NamedModulesPlugin()
    ],
    devServer: {
        proxy: {
            '/api': `http://${getIp()}:3000`
        },
        contentBase: path.join(__dirname, "dist"),
        compress: true,
        port: 8000
    },
    optimization: {
        splitChunks: {
            chunks: 'all'
        }
    },
    externals: {
    //   react: {
    //     root: "React",
    //     commonjs2: "react",
    //     commonjs: "react",
    //     amd: "react"
    //   },
    //   "react-dom": {
    //     root: "ReactDom",
    //     commonjs2: "react-dom",
    //     commonjs: "react",
    //     amd: "react-dom"
    //   },
      // lodash: {
      //   root: '_',
      //   commonjs2: 'lodash',
      //   commonjs: 'lodash',
      //   amd: 'lodash'
      // }
    }
})