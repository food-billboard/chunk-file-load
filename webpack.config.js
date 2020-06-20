const path = require('path')
const webpack = require('webpack')
const ExtractTextPlugin = require("extract-text-webpack-plugin")
var HtmlWebpackPlugin = require('html-webpack-plugin')
const { CleanWebpackPlugin } = require('clean-webpack-plugin')
const os = require('os')

function getIp() {
    const ifaces = os.networkInterfaces()
    let ip = '', result = []
    for(var dev in ifaces) {
        ifaces[dev].forEach(function(details) {
            if(ip === '' && details.family === 'IPv4' && !details.internal) {
                ip = details.address
                return;
            }
        })
    }

    return ip || '127.0.0.1'
}

module.exports = {
    entry: './src/test/client/index.js',
    output: {
        path: path.resolve(__dirname, 'src/test/dist'),
        filename: '[name].bundle.[hash].js'
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
            },
            {
                test: /\.(png|jpg|gif)$/,
                loader: ['file-loader']
            },
            { 
                test: /\.js$/, 
                exclude: /node_modules/, 
                loader: "babel-loader" 
            }
        ]
    },
    plugins: [
        new ExtractTextPlugin("styles.css"),
        new CleanWebpackPlugin(),
        new HtmlWebpackPlugin({
            template: './src/test/client/index.html'
        }),
        new webpack.HotModuleReplacementPlugin(),
        new webpack.NamedModulesPlugin(),
    ],
    devServer: {
        proxy: {
            '/api': `http://${getIp()}:3000`
        },
        contentBase: path.join(__dirname, "src/test/dist"),
        compress: true,
        port: 8000
    }
}