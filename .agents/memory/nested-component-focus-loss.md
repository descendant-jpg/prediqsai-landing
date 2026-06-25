---
name: Nested component definitions cause input focus loss (mobile)
description: Why React Native TextInputs drop focus on each keystroke, and the standard fix in this app
---

Never define a React component (function or arrow) INSIDE another component's body if it is rendered as a JSX element (`<Foo/>`). On every parent re-render the nested component gets a new identity, so React unmounts/remounts its subtree — a `TextInput` inside it loses focus after one character, and `FlatList` rows flicker/remount.

**Fix (standard here):** hoist the component to module level and pass everything it closed over as props — most commonly `colors` (from `useColors()`; the type is `ReturnType<typeof useColors>`, often aliased `Colors`/`ThemeColors`). Module-level `StyleSheet.create` styles and `function` declarations are fine to reference regardless of source order.

**How to find them:** ripgrep for INDENTED (nested) PascalCase defs: `^[[:space:]]+(function [A-Z]|const [A-Z][A-Za-z0-9]* *=)` across `*.tsx`. Column-0 definitions (even helper components defined after the screen in the same file) are module-level and SAFE — do not "fix" those. An explorer/grep that reports module-level helpers as nested is wrong; confirm indentation before editing.

**Why:** users reported the Change Password inputs dropping focus per keystroke; the cause was an inline `PasswordInput`. The same pattern existed (without inputs, but still causing remounts) in oracle-chat `MessageBubble` and match-detail `EdgeRow`.

Related but NOT this bug: unstable `key` props on inputs, and swapping between two different subtrees while typing — audit those only if focus loss persists after nested-component extraction.
