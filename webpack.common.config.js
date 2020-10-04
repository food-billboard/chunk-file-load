const path = require('path')

module.exports = {
  module: {
    rules: [
      {
        test: /\.(png|jpg|gif)$/,
        loader: ['file-loader']
      },
      { 
        test: /\.jsx?$/, 
        exclude: /node_modules/, 
        use: [
          {
            loader: 'babel-loader'
          },
          // {
          //   loader: 'ts-loader'
          // }
        ],
    },
    ]
  },
  resolve: {
    alias: {
      "~":path.resolve(__dirname, "src"),
      '@': path.resolve(__dirname, 'test')
    },
    extensions: [".ts", ".tsx", ".js", 'jsx']
  },
  optimization: {
    splitChunks: {
      chunks: 'all'
    }
  },
}