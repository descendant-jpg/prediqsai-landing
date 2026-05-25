import * as Haptics from "expo-haptics";
import { ArrowLeft, Send, Zap } from "lucide-react-native";
import { useRouter } from "expo-router";
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
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { useLanguage } from "@/context/LanguageContext";
import { getApiBaseUrl } from "@/lib/api";
import type { ChatMessage } from "@/types";

function generateId(): string {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

const FREE_MSG_LIMIT = 3;
const TIMEOUT_MS = 30_000;

export default function OracleChatScreen() {
  const colors  = useColors();
  const insets  = useSafeAreaInsets();
  const router  = useRouter();
  const { language } = useLanguage();
  const { user } = useAuth();

  const isFree = !user || user.tier !== "premium";

  const [messages,    setMessages]    = useState<ChatMessage[]>([]);
  const [input,       setInput]       = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const abortRef    = useRef<AbortController | null>(null);

  const userMsgCount = messages.filter((m) => m.role === "user").length;
  const hitLimit = isFree && userMsgCount >= FREE_MSG_LIMIT;

  const topPaddingWeb    = Platform.OS === "web" ? 67 : 0;
  const topPadding       = insets.top + topPaddingWeb;
  const bottomPaddingWeb = Platform.OS === "web" ? 34 : 0;
  const bottomPadding    = insets.bottom + bottomPaddingWeb;

  async function sendMessage(content: string) {
    if (!content.trim() || isStreaming || hitLimit) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const userMsg: ChatMessage = {
      id: generateId(), role: "user",
      content: content.trim(), createdAt: new Date().toISOString(),
    };

    setInput("");
    setIsStreaming(true);

    const assistantId = generateId();
    const assistantMsg: ChatMessage = {
      id: assistantId, role: "assistant",
      content: "", createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [assistantMsg, userMsg, ...prev]);

    // Build message history for API (oldest first)
    const apiMessages = [...messages, userMsg]
      .slice()
      .reverse()
      .map((m) => ({ role: m.role, content: m.content }));

    // Abort controller with 30s timeout
    const controller = new AbortController();
    abortRef.current = controller;
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const res = await fetch(`${getApiBaseUrl()}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages, language: language.claudeInstruction }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(errBody.error ?? `Server error ${res.status}`);
      }

      const data = await res.json() as { reply?: string; error?: string };

      if (data.error) throw new Error(data.error);
      if (!data.reply) throw new Error("Empty response from AI");

      setMessages((prev) =>
        prev.map((m) => m.id === assistantId ? { ...m, content: data.reply! } : m),
      );
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      const isTimeout = (err as any)?.name === "AbortError";
      const msg = isTimeout
        ? "Response taking too long. Please try again."
        : ((err as Error)?.message || "Unable to analyze right now. Please check your connection and try again.");
      setMessages((prev) =>
        prev.map((m) => m.id === assistantId ? { ...m, content: msg } : m),
      );
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
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
              <Text style={[styles.typingText, { color: colors.textSecondary }]}>PrediQs AI is analyzing...</Text>
            </View>
          ) : (
            <Text style={[styles.bubbleText, { color: isUser ? colors.background : colors.text }]}>
              {message.content}
            </Text>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding + 12, borderBottomColor: colors.border, backgroundColor: colors.background }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={[styles.aiIcon, { backgroundColor: colors.cyan }]}>
          <Zap size={16} color={colors.background} />
        </View>
        <View>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Oracle AI Chat</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>Sports Intelligence Engine</Text>
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
                <Text style={[styles.emptyTitle, { color: colors.text }]}>⚡ PrediQs AI Sports Intelligence</Text>
                <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                  {"I analyze real-time data from:\n📊 Odds across 40+ bookmakers\n⚡ Live match statistics\n📰 Latest injury & team news\n🌤️ Stadium weather conditions\n💰 Sharp money movements\n🧠 5 AI prediction models"}
                </Text>
                <View style={styles.prompts}>
                  {SUGGESTED_PROMPTS.slice(0, 4).map((prompt, i) => (
                    <TouchableOpacity
                      key={i}
                      style={[styles.promptBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                      onPress={() => sendMessage(prompt)}
                      activeOpacity={0.75}
                    >
                      <Text style={[styles.promptText, { color: colors.textSecondary }]}>{prompt}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ) : null
          }
        />

        <View style={[styles.inputContainer, { backgroundColor: colors.background, borderTopColor: colors.border, paddingBottom: bottomPadding + 12 }]}>
          {hitLimit ? (
            <View style={[styles.limitBanner, { backgroundColor: "rgba(255,215,0,0.08)", borderColor: "rgba(255,215,0,0.35)" }]}>
              <Text style={[styles.limitTitle, { color: "#FFD700" }]}>⭐ {FREE_MSG_LIMIT}/{FREE_MSG_LIMIT} free messages used</Text>
              <Text style={[styles.limitSub, { color: colors.textSecondary }]}>Upgrade to Premium for unlimited Oracle AI</Text>
              <TouchableOpacity
                style={[styles.limitBtn, { backgroundColor: "#FFD700" }]}
                onPress={() => router.push("/settings" as any)}
                activeOpacity={0.85}
              >
                <Text style={[styles.limitBtnText, { color: "#070B12" }]}>Upgrade — $39.99/mo</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {isFree && (
                <Text style={[styles.msgCount, { color: colors.textMuted }]}>
                  {userMsgCount}/{FREE_MSG_LIMIT} free messages
                </Text>
              )}
              <View style={[styles.inputRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  value={input}
                  onChangeText={setInput}
                  placeholder="Ask PrediQs AI anything..."
                  placeholderTextColor={colors.textMuted}
                  multiline
                  maxLength={500}
                  editable={!isStreaming}
                  returnKeyType="send"
                  onSubmitEditing={() => sendMessage(input)}
                  blurOnSubmit={false}
                />
                <TouchableOpacity
                  style={[styles.sendBtn, { backgroundColor: input.trim() && !isStreaming ? colors.cyan : colors.border }]}
                  onPress={() => sendMessage(input)}
                  disabled={!input.trim() || isStreaming}
                  activeOpacity={0.8}
                >
                  {isStreaming ? (
                    <ActivityIndicator size="small" color={colors.background} />
                  ) : (
                    <Send size={16} color={input.trim() ? colors.background : colors.textMuted} />
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}
          <Text style={[styles.disclaimer, { color: colors.textMuted }]}>For informational purposes only. Gamble responsibly.</Text>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1 },
  flex:           { flex: 1 },
  header:         { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  backBtn:        { padding: 4 },
  aiIcon:         { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  headerTitle:    { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  headerSubtitle: { fontSize: 11, fontFamily: "Inter_400Regular" },
  messagesList:   { padding: 16, gap: 12, flexGrow: 1, justifyContent: "flex-end" },
  bubble:         { flexDirection: "row", alignItems: "flex-end", gap: 8, marginBottom: 4 },
  userBubble:     { flexDirection: "row-reverse" },
  aiBubble:       { flexDirection: "row" },
  aiAvatar:       { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  bubbleContent:  { maxWidth: "78%", borderRadius: 16, padding: 12 },
  bubbleText:     { fontSize: 15, lineHeight: 22, fontFamily: "Inter_400Regular" },
  typingRow:      { flexDirection: "row", alignItems: "center", gap: 8 },
  typingText:     { fontSize: 14, fontFamily: "Inter_400Regular" },
  emptyState:     { alignItems: "center", paddingTop: 40, paddingHorizontal: 20, gap: 12 },
  emptyIcon:      { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center" },
  emptyTitle:     { fontSize: 20, fontFamily: "Inter_700Bold", textAlign: "center" },
  emptySubtitle:  { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 21 },
  prompts:        { width: "100%", gap: 8, marginTop: 8 },
  promptBtn:      { padding: 14, borderRadius: 12, borderWidth: 1 },
  promptText:     { fontSize: 14, fontFamily: "Inter_400Regular" },
  inputContainer: { padding: 12, borderTopWidth: 1, gap: 6 },
  inputRow:       { flexDirection: "row", alignItems: "flex-end", borderRadius: 24, borderWidth: 1, paddingLeft: 16, paddingRight: 6, paddingVertical: 6, gap: 8 },
  input:          { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular", maxHeight: 100, paddingVertical: 6 },
  sendBtn:        { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  disclaimer:     { fontSize: 10, fontFamily: "Inter_400Regular", textAlign: "center" },
  limitBanner:   { padding: 16, borderRadius: 16, borderWidth: 1, alignItems: "center", gap: 8, marginBottom: 8 },
  limitTitle:    { fontSize: 14, fontFamily: "Inter_700Bold" },
  limitSub:      { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center" },
  limitBtn:      { paddingHorizontal: 24, paddingVertical: 11, borderRadius: 20, marginTop: 4 },
  limitBtnText:  { fontSize: 13, fontFamily: "Inter_700Bold" },
  msgCount:      { fontSize: 10, fontFamily: "Inter_400Regular", textAlign: "right", marginBottom: 4 },
});
