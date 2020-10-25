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
        exclude:/node_modules/, 
        use: [
          {
            loader: 'babel-loader'
          }
        ],
      },
      {
        test: /\.ts$/,
        use: [
          {
            loader: 'ts-loader'
          }
        ]
      }
    ]
  },
  resolve: {
    alias: {
      "~":path.resolve(__dirname, "src")
    },
    extensions: [".ts", ".tsx", ".js", 'jsx']
  }
}