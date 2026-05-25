const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  "react-native-nitro-modules": path.resolve(__dirname, "mocks/react-native-nitro-modules.js"),
};

module.exports = config;
