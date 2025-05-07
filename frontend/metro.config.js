// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

// Find the project and workspace directories
const projectRoot = __dirname;

const config = getDefaultConfig(projectRoot);

// Add custom resolver for problematic modules
config.resolver.extraNodeModules = {
  // Provide a fallback for form-data/lib/populate.js
  'form-data/lib/populate.js': path.resolve(__dirname, 'metro/populate.js')
};

// Add custom transformer options
config.transformer = {
  ...config.transformer,
  assetPlugins: ['expo-asset/tools/hashAssetFiles'],
};

module.exports = config;