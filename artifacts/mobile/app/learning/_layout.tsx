import { Stack } from "expo-router";
import React from "react";

export default function LearningLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="videos" />
      <Stack.Screen name="lessons" />
      <Stack.Screen name="lesson-detail" />
      <Stack.Screen name="quizzes" />
      <Stack.Screen name="quiz-session" />
      <Stack.Screen name="dictionary" />
    </Stack>
  );
}
