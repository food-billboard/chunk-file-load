const path = require('path')

module.exports = {
  module: {
    rules: [
      {
        test: /\.(png|jpg|gif)$/,
        loader: ['file-loader']
      },
      {
        test: /\.worker\.(t|j)s$/,
        exclude:/node_modules/, 
        use: { 
          loader: "worker-loader",
          options: {
            inline: "fallback",
          }
        },
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