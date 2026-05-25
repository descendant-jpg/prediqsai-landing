/**
 * Stub for react-native-nitro-modules
 * Used in web / Expo Go environments where native JSI modules are unavailable.
 * react-native-iap v15 depends on this package; without the stub the bundler
 * throws "NitroModules are required by expo prebuild" at startup.
 */

class HybridObject {}
class HybridView {}

const NitroModules = {
  createHybridObject: () => ({}),
  hasHybridObject: () => false,
  box: (v) => v,
};

module.exports = {
  NitroModules,
  HybridObject,
  HybridView,
  AnyHybridObject: {},
  BoxedHybridObject: class BoxedHybridObject {},
  getHybridObjectConstructor: () => class {},
  getHostComponent: () => null,
  Int64: class Int64 { constructor(v) { this.value = v; } },
  AnyMap: class AnyMap extends Map {},
  installWorkletsSupport: () => {},
};
