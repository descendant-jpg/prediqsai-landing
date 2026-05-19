import { Stack } from "expo-router";

export default function AdminLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="users" />
      <Stack.Screen name="user-detail" />
      <Stack.Screen name="config" />
      <Stack.Screen name="logs" />
      <Stack.Screen name="api-keys" />
    </Stack>
  );
}
