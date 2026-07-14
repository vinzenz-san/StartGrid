import { rspack, type Configuration } from '@rspack/core';
import path from 'path';

export default (env: { target?: string } = {}) => {
  const target = (env.target === 'chrome' ? 'chrome' : 'firefox') as 'firefox' | 'chrome';

  const config: Configuration = {
    entry: {
      newtab: './src/main.tsx',
    },
    output: {
      path: path.resolve(__dirname, 'dist', target),
      filename: '[name].js',
      clean: true,
    },
    module: {
      rules: [
        {
          test: /\.(tsx?|jsx?)$/,
          use: {
            loader: 'builtin:swc-loader',
            options: {
              jsc: {
                parser: {
                  syntax: 'typescript',
                  tsx: true,
                },
                transform: {
                  react: {
                    runtime: 'automatic',
                  },
                },
              },
            },
          },
          exclude: /node_modules/,
        },
        {
          test: /\.css$/,
          type: 'css',
        },
      ],
    },
    plugins: [
      new rspack.HtmlRspackPlugin({
        template: './src/newtab.html',
        filename: 'newtab.html',
        chunks: ['newtab'],
      }),
      new rspack.CopyRspackPlugin({
        patterns: [
          {
            from: 'public',
            to: '.',
            filter: (resourcePath: string) => !resourcePath.endsWith('manifest.json'),
          },
          {
            from: `src/manifest.${target}.json`,
            to: 'manifest.json',
          },
        ],
      }),
    ],
    resolve: {
      extensions: ['.tsx', '.ts', '.jsx', '.js'],
    },
    experiments: {
      css: true,
    },
    mode: 'development',
    devtool: 'source-map',
  };

  return config;
};
