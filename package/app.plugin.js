const { withPlugins } = require('@expo/config-plugins')

const withMyConfigPlugins = (config) => {
  return withPlugins(config, [require('./plugin/withIosDeploymentTarget')])
}

module.exports = withMyConfigPlugins
