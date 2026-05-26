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
      <Stack.Screen name="predictions" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="health" />
      <Stack.Screen name="errors" />
      <Stack.Screen name="revenue" />
      <Stack.Screen name="worldcup" />
      <Stack.Screen name="affiliates" />
    </Stack>
  );
}
