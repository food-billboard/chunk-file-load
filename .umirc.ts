import { defineConfig } from 'dumi';

const isDev = process.env.NODE_ENV === 'development';
const reactTag = isDev ? 'development' : 'production.min';

export default defineConfig({
  title: 'chunk-file-load-component',
  favicon:
    'https://user-images.githubusercontent.com/9554297/83762004-a0761b00-a6a9-11ea-83b4-9c8ff721d4b8.png',
  logo: 'https://user-images.githubusercontent.com/9554297/83762004-a0761b00-a6a9-11ea-83b4-9c8ff721d4b8.png',
  outputPath: 'docs-dist',
  extraBabelPlugins: [
    [
      'import',
      {
        libraryName: 'antd',
        libraryDirector: 'es',
        style: true,
      },
    ],
  ],
  links: [
    {
      rel: 'stylesheet',
      type: 'text/css',
      href: 'https://gw.alipayobjects.com/os/lib/antd/4.16.11/dist/antd.css',
    },
  ],
  scripts: [
    `https://cdn.bootcdn.net/ajax/libs/react/16.14.0/umd/react.${reactTag}.js`,
    `https://cdn.bootcdn.net/ajax/libs/react-dom/16.14.0/umd/react-dom.${reactTag}.js`,
    'https://cdn.bootcdn.net/ajax/libs/antd/4.16.11/antd.min.js',
  ],
  externals: {
    react: 'React',
    'react-dom': 'ReactDOM',
    antd: 'antd',
  },
  history: { type: 'hash' },
  publicPath: './',
  hash: true,
  dynamicImport: {},
  exportStatic: {},
  proxy: {
    '/api': {
      target: 'http://localhost:4000/',
      changeOrigin: true,
    },
  },
  // more config: https://d.umijs.org/config
});
