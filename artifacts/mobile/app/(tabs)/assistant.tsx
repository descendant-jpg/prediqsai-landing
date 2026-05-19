import * as Haptics from "expo-haptics";
import { fetch } from "expo/fetch";
import { Send, Zap } from "lucide-react-native";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SUGGESTED_PROMPTS } from "@/constants/mockData";
import { useColors } from "@/hooks/useColors";
import { useLanguage } from "@/context/LanguageContext";
import { chatUrl } from "@/lib/api";
import type { ChatMessage } from "@/types";

const SYSTEM_PROMPT_DISPLAY =
  "PrediQs AI — your sports analytics education assistant";

function generateId(): string {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

export default function AssistantScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { language } = useLanguage();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const topPaddingWeb = Platform.OS === "web" ? 67 : 0;
  const topPadding = insets.top + topPaddingWeb;
  const bottomPaddingWeb = Platform.OS === "web" ? 34 : 0;
  const bottomPadding = insets.bottom + bottomPaddingWeb;

  async function sendMessage(content: string) {
    if (!content.trim() || isStreaming) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const userMsg: ChatMessage = {
      id: generateId(),
      role: "user",
      content: content.trim(),
      createdAt: new Date().toISOString(),
    };

    const newMessages = [userMsg, ...messages];
    setMessages(newMessages);
    setInput("");
    setIsStreaming(true);

    const assistantId = generateId();
    const assistantMsg: ChatMessage = {
      id: assistantId,
      role: "assistant",
      content: "",
      createdAt: new Date().toISOString(),
    };

    setMessages([assistantMsg, userMsg, ...messages]);

    try {
      const apiMessages = [...messages, userMsg]
        .reverse()
        .map((m) => ({ role: m.role, content: m.content }));

      const response = await fetch(chatUrl(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages, language: language.claudeInstruction }),
      });

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";
      let lineBuffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        lineBuffer += decoder.decode(value, { stream: true });
        const lines = lineBuffer.split("\n");
        lineBuffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.content) {
              accumulated += data.content;
              const snap = accumulated;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, content: snap } : m,
                ),
              );
            }
          } catch {}
        }
      }
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: "Sorry, I'm having trouble connecting. Please try again." }
            : m,
        ),
      );
    } finally {
      setIsStreaming(false);
    }
  }

  function MessageBubble({ message }: { message: ChatMessage }) {
    const isUser = message.role === "user";
    return (
      <View style={[styles.bubble, isUser ? styles.userBubble : styles.aiBubble]}>
        {!isUser && (
          <View style={[styles.aiAvatar, { backgroundColor: colors.cyan }]}>
            <Zap size={12} color={colors.background} />
          </View>
        )}
        <View
          style={[
            styles.bubbleContent,
            isUser
              ? { backgroundColor: colors.cyan }
              : { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 },
          ]}
        >
          {!isUser && message.content === "" ? (
            <View style={styles.typingRow}>
              <ActivityIndicator size="small" color={colors.cyan} />
              <Text style={[styles.typingText, { color: colors.textSecondary }]}>
                Analyzing...
              </Text>
            </View>
          ) : (
            <Text
              style={[
                styles.bubbleText,
                { color: isUser ? colors.background : colors.text },
              ]}
            >
              {message.content}
            </Text>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          { paddingTop: topPadding + 16, borderBottomColor: colors.border, backgroundColor: colors.background },
        ]}
      >
        <View style={[styles.aiIcon, { backgroundColor: colors.cyan }]}>
          <Zap size={16} color={colors.background} />
        </View>
        <View>
          <Text style={[styles.headerTitle, { color: colors.text }]}>AI Assistant</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            {SYSTEM_PROMPT_DISPLAY}
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <MessageBubble message={item} />}
          inverted
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          scrollEnabled={!!messages.length}
          ListFooterComponent={
            messages.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={[styles.emptyIcon, { backgroundColor: "rgba(0,229,255,0.1)" }]}>
                  <Zap size={32} color={colors.cyan} />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>
                  PrediQs AI
                </Text>
                <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                  Ask me anything about sports analytics, match analysis, or finance tracking.
                </Text>
                <View style={styles.prompts}>
                  {SUGGESTED_PROMPTS.slice(0, 4).map((prompt, i) => (
                    <TouchableOpacity
                      key={i}
                      style={[styles.promptBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                      onPress={() => sendMessage(prompt)}
                      activeOpacity={0.75}
                    >
                      <Text style={[styles.promptText, { color: colors.textSecondary }]}>
                        {prompt}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ) : null
          }
        />

        <View
          style={[
            styles.inputContainer,
            {
              backgroundColor: colors.background,
              borderTopColor: colors.border,
              paddingBottom: bottomPadding + 12,
            },
          ]}
        >
          <View style={[styles.inputRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TextInput
              style={[styles.input, { color: colors.text }]}
              value={input}
              onChangeText={setInput}
              placeholder="Ask about match analysis, odds education..."
              placeholderTextColor={colors.textMuted}
              multiline
              maxLength={500}
              editable={!isStreaming}
              returnKeyType="send"
              onSubmitEditing={() => sendMessage(input)}
              blurOnSubmit={false}
            />
            <TouchableOpacity
              style={[
                styles.sendBtn,
                {
                  backgroundColor:
                    input.trim() && !isStreaming ? colors.cyan : colors.border,
                },
              ]}
              onPress={() => sendMessage(input)}
              disabled={!input.trim() || isStreaming}
              activeOpacity={0.8}
            >
              {isStreaming ? (
                <ActivityIndicator size="small" color={colors.background} />
              ) : (
                <Send
                  size={16}
                  color={input.trim() ? colors.background : colors.textMuted}
                />
              )}
            </TouchableOpacity>
          </View>
          <Text style={[styles.disclaimer, { color: colors.textMuted }]}>
            For informational purposes only. Gamble responsibly.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  aiIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 17 },
  headerSubtitle: { fontSize: 12 },
  messagesList: {
    padding: 16,
    gap: 12,
    flexGrow: 1,
    justifyContent: "flex-end",
  },
  bubble: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    marginBottom: 4,
  },
  userBubble: { flexDirection: "row-reverse" },
  aiBubble: { flexDirection: "row" },
  aiAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  bubbleContent: {
    maxWidth: "78%",
    borderRadius: 16,
    padding: 12,
  },
  bubbleText: { fontSize: 15, lineHeight: 22 },
  typingRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  typingText: { fontSize: 14 },
  emptyState: {
    alignItems: "center",
    paddingTop: 40,
    paddingHorizontal: 20,
    gap: 12,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: { fontSize: 22 },
  emptySubtitle: { fontSize: 14, textAlign: "center", lineHeight: 21 },
  prompts: { width: "100%", gap: 8, marginTop: 8 },
  promptBtn: { padding: 14, borderRadius: 12, borderWidth: 1 },
  promptText: { fontSize: 14 },
  inputContainer: { padding: 12, borderTopWidth: 1, gap: 6 },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    borderRadius: 24,
    borderWidth: 1,
    paddingLeft: 16,
    paddingRight: 6,
    paddingVertical: 6,
    gap: 8,
  },
  input: { flex: 1, fontSize: 15, maxHeight: 100, paddingVertical: 6 },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  disclaimer: { fontSize: 10, textAlign: "center" },
});
