const type = process.env.BUILD_TYPE;

let config = {};

if(type === "umd") {
  config = {
    umd: {
      file: 'ChunkUpload',
      name: 'ChunkUpload',
      sourcemap: true,
    },
    nodeResolveOpts: {
      browser: true,
    },
    runtimeHelpers: true,
    extraBabelPlugins: [
      [
        'babel-plugin-import',
        {
          libraryName: 'lodash',
          libraryDirectory: '',
          camel2DashComponentName: false, // default: true
        },
        'lodash',
      ],
    ],
  }
}else if (type === 'lib') {
  config = {
    extractCSS: true,
    esm: false,
    cjs: 'babel',
    extraBabelPlugins: [
      [
        'babel-plugin-import',
        {
          libraryName: 'lodash',
          libraryDirectory: '',
          camel2DashComponentName: false, // default: true
        },
        'lodash',
      ],
    ],
  };
} else {
  config = {
    extractCSS: true,
    esm: {
      type: 'babel',
      importLibToEs: true,
    },
    cjs: false,
    extraBabelPlugins: [
      [
        'babel-plugin-import',
        {
          libraryName: 'lodash',
          libraryDirectory: '',
          camel2DashComponentName: false, // default: true
        },
        'lodash',
      ],
    ],
  };
}

export default config;
