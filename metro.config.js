// metro.config.js - Optimized for PioX Camera App
const { getDefaultConfig } = require("expo/metro-config");
const path = require('path');
const { FileStore } = require('metro-cache');

const config = getDefaultConfig(__dirname);

// Use a stable on-disk store (shared across web/android) for faster rebuilds
const root = process.env.METRO_CACHE_ROOT || path.join(__dirname, '.metro-cache');
config.cacheStores = [
  new FileStore({ root: path.join(root, 'cache') }),
];

// Optimize transformer for faster builds
config.transformer = {
  ...config.transformer,
  minifierPath: 'metro-minify-terser',
  minifierConfig: {
    compress: {
      drop_console: false, // Keep console for debugging
      dead_code: true,
      unused: true,
    },
    mangle: {
      toplevel: false,
    },
  },
};

// Optimize resolver for faster module resolution
config.resolver = {
  ...config.resolver,
  // Enable package exports resolution for better tree-shaking
  unstable_enablePackageExports: true,
};

// Reduce the number of workers to decrease resource usage
config.maxWorkers = 2;

// Enable symlinks for the project structure
config.resolver.unstable_enableSymlinks = true;

module.exports = config;
