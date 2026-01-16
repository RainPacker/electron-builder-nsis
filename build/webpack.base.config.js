const path = require("path");
const nodeExternals = require("webpack-node-externals");

const envName = (env) => {
  if (env.production) {
    return "production";
  }
  if (env.test) {
    return "test";
  }
  return "development";
};

const envToMode = (env) => {
  if (env.production) {
    return "production";
  }
  return "development";
};

module.exports = env => {
  return {
    target: "electron-renderer",
    mode: envToMode(env),
    node: {
      __dirname: false,
      __filename: false
    },
    externals: [nodeExternals()],
    resolve: {
      alias: {
        env: path.resolve(__dirname, `../config/env_${envName(env)}.json`)
      }
    },
    devtool: "source-map",
    module: {
      rules: [
        {
          test: /\.js$/,
          exclude: /node_modules/,
          use: ["babel-loader"]
        },
        {
          test: /\.css$/,
          use: ["style-loader", "css-loader"]
        }
      ]
    },
    plugins: [
      // 定义 process 变量以避免 "process is not defined" 错误
      new (require('webpack')).DefinePlugin({
        'process': 'window.process',
        'process.env.NODE_ENV': JSON.stringify(envToMode(env))
      })
    ]
  };
};