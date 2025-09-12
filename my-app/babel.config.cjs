module.exports = function(api) {
  api.cache(true);

  return {
    presets: ['babel-preset-expo'],
    plugins: [
      ['babel-plugin-transform-remove-console', { exclude: ['error', 'warn'] }],
      'babel-plugin-minify-dead-code-elimination',
      'babel-plugin-transform-inline-environment-variables',
      'babel-plugin-transform-remove-undefined',
    ],
    env: {
      production: {
        plugins: [
          ['babel-plugin-transform-remove-console', { exclude: ['error'] }],
          'babel-plugin-minify-mangle-names',
          'babel-plugin-minify-dead-code-elimination',
          ['babel-plugin-transform-remove-undefined', { tdz: true }],
        ],
      },
    },
  };
};