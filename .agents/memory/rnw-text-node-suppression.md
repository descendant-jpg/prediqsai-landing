---
name: React Native Web text node suppression (Expo web dev)
description: How to suppress third-party "Unexpected text node" console.error crashes on Expo web — and why Replit log captures show them even after suppression.
---

## The rule

In Expo web dev mode, "Unexpected text node: . A text node cannot be a child of a <View>." errors from react-native-web's dev validation (fired by third-party libraries like GestureHandlerRootView or KeyboardProvider internals) show as a visible Expo dev overlay. Suppress with this pattern in `_layout.tsx`:

```javascript
if (Platform.OS === "web") {
  LogBox.ignoreLogs(["Unexpected text node", "props.pointerEvents is deprecated"]);
  const _origError = console.error.bind(console);
  (console as any).error = (...args: unknown[]) => {
    const msg = typeof args[0] === "string" ? args[0] : "";
    if (msg.includes("Unexpected text node") || msg.includes("props.pointerEvents is deprecated")) {
      return;
    }
    _origError(...args);
  };
}
```

**Why:** The errors come from react-native-web's dev-only View child validation — it fires for empty string `""` children inside vendor components. We cannot modify third-party code.

**Why `refresh_all_logs` still shows them:** Replit's `injected.js` devtools proxy captures ALL console calls before userspace code runs. The log captures reflect raw signals. The browser developer console and Expo overlay (what the user sees) are suppressed correctly.

**How to apply:** Any time "Unexpected text node" console.error warnings appear on Expo web from third-party components; use `LogBox.ignoreLogs` + `console.error` override, scoped to `Platform.OS === "web"`. Both layers are needed: `LogBox` prevents the overlay, the override prevents propagation to `@expo/metro-runtime`'s error handler.
