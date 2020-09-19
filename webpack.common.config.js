const path = require('path')

module.exports = {
  module: {
    rules: [
      {
        test: /\.(png|jpg|gif)$/,
        loader: ['file-loader']
      },
      { 
        test: /\.[jt]sx?$/, 
        exclude: /node_modules/, 
        use: [
          {
            loader: 'babel-loader'
          },
          // {
          //   loader: 'ts-loader'
          // }
        ],
        include:/test/
    },
    ]
  },
  resolve: {
    alias: {
      "~":path.resolve(__dirname, "src"),
      '@': path.resolve(__dirname, 'test')
    },
    // extensions: [".ts", ".tsx", ".js", 'jsx']
  },
}