import { getDefaultConfig } from 'expo/metro-config';
import path from 'path';
import { wrapWithReanimatedMetroConfig } from 'react-native-reanimated/metro-config';

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [monorepoRoot];
(config.resolver || {}).nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

module.exports = wrapWithReanimatedMetroConfig(config);
