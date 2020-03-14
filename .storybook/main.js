module.exports = {
  stories: ['../src/**/*.stories.tsx'],
  webpackFinal: async config => {
    config.module.rules.push({
      test: /\.(ts|tsx)$/,
      loader: require.resolve('babel-loader'),
      options: {
        presets: [
          require.resolve('@babel/preset-env'),
          require.resolve('@babel/preset-react'),
          require.resolve('@babel/preset-typescript'),
        ],
        plugins: [],
      },
    })
    config.resolve.extensions.push('.ts', '.tsx')
    return config
  },
}
