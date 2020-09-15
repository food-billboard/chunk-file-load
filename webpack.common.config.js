const path = require('path')

module.exports = {
  module: {
    rules: [
      {
        test: /\.(png|jpg|gif)$/,
        loader: ['file-loader']
      },
      { 
          test: /\.js$/, 
          exclude: /node_modules/, 
          loader: "babel-loader",
          include: /src/
      }
    ]
  },
  resolve: {
    alias: {
      "@":path.resolve(__dirname, "src")
    },
    extensions: [".ts", ".tsx", ".js"]
  },
}