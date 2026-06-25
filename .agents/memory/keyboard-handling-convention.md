---
name: Keyboard handling convention (mobile)
description: Standard way to keep text inputs from being covered by the on-screen keyboard in the Expo app
---

When adding any text input on a screen, prevent the keyboard from covering it using ONE of two standard wrappers (do not invent a new approach):

- **Scrollable form screens** (content already in a `<ScrollView>`): use `KeyboardAwareScrollViewCompat` from `@/components/KeyboardAwareScrollViewCompat` instead of a raw `ScrollView`. It uses `react-native-keyboard-controller`'s `KeyboardAwareScrollView` on native and falls back to a plain `ScrollView` on web.
- **Modal content NOT in a scroll view** (bottom-sheets, centered/formSheet modals): wrap the modal's content as the DIRECT child of `<Modal>` in `<KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>`.

**Why:** `KeyboardProvider` is already mounted at the app root (`app/_layout.tsx`), so the keyboard-controller components work everywhere — including inside Modals (React context flows through Modal). Using these two wrappers consistently is what was applied app-wide for the keyboard-overlap fix.

**How to apply:** new screen with a form → KeyboardAwareScrollViewCompat. New modal with an input → KeyboardAvoidingView wrap. Caveat: `behavior="height"` in short non-scroll modals is fine, but on very small Android screens/landscape a tight form can still clip — if so, convert that modal body to KeyboardAwareScrollViewCompat.
