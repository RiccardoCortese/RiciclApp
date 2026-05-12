const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// .cjs files are needed by some react-leaflet / leaflet internals
config.resolver.sourceExts.push('cjs');

module.exports = config;
