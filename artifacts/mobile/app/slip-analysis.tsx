import { ArrowLeft, ArrowRight, Check, ChevronRight, FileText, Lightbulb, Star, Upload, X, Zap } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { api } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SlipSelection {
  match: string;
  home_team: string;
  away_team: string;
  market: string;
  selection: string;
  odds: number;
  sport: string;
  league: string;
  match_date: string;
  ai_confidence: number;
  status: "STRONG" | "GOOD" | "RISKY" | "AVOID";
  reasoning: string;
  alternative: string | null;
}

interface SlipAnalysis {
  bookmaker: string;
  slip_type: "single" | "accumulator" | "system";
  total_odds: number;
  stake: number | null;
  potential_payout: number | null;
  selections: SlipSelection[];
  overall_rating: number;
  verdict: "PLACE IT" | "MODIFY" | "AVOID";
  verdict_reason: string;
  weakest_leg: string;
  strongest_leg: string;
  win_probability: number;
  recommendations: string[];
  safer_alternative: string | null;
  kelly_stake: number | null;
}

type ScreenState = "upload" | "scanning" | "results" | "manual";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  STRONG: { color: "#00FF94", bg: "rgba(0,255,148,0.12)", icon: "✅" },
  GOOD: { color: "#00E5FF", bg: "rgba(0,229,255,0.12)", icon: "👍" },
  RISKY: { color: "#FFD700", bg: "rgba(255,215,0,0.12)", icon: "⚠️" },
  AVOID: { color: "#FF4D4D", bg: "rgba(255,77,77,0.12)", icon: "❌" },
};

const VERDICT_CONFIG = {
  "PLACE IT": { color: "#00FF94", bg: "rgba(0,255,148,0.12)", icon: "✅" },
  MODIFY: { color: "#FFD700", bg: "rgba(255,215,0,0.12)", icon: "⚠️" },
  AVOID: { color: "#FF4D4D", bg: "rgba(255,77,77,0.12)", icon: "❌" },
};

function StarRating({ value, max = 10 }: { value: number; max?: number }) {
  const stars = Math.round((value / max) * 5);
  return (
    <View style={{ flexDirection: "row", gap: 3 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} size={16} color="#FFD700" fill={i < stars ? "#FFD700" : "transparent"} />
      ))}
    </View>
  );
}

// ─── Scan animation ───────────────────────────────────────────────────────────

function ScanningScreen({ colors }: { colors: ReturnType<typeof import("@/hooks/useColors").useColors> }) {
  const scanAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanAnim, { toValue: 1, duration: 1400, useNativeDriver: true }),
        Animated.timing(scanAnim, { toValue: 0, duration: 1400, useNativeDriver: true }),
      ]),
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.5, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      ]),
    ).start();
  }, []);

  const translateY = scanAnim.interpolate({ inputRange: [0, 1], outputRange: [-120, 120] });

  return (
    <View style={[styles.centeredFull, { backgroundColor: colors.background }]}>
      <View style={[styles.scanBox, { borderColor: colors.cyan, backgroundColor: colors.card }]}>
        <View style={[styles.scanContent, { borderColor: colors.border }]}>
          <FileText size={60} color={colors.textMuted} />
          <Animated.View
            style={[
              styles.scanLine,
              { backgroundColor: colors.cyan, transform: [{ translateY }] },
            ]}
          />
        </View>
      </View>
      <Animated.Text style={[styles.scanningTitle, { color: colors.text, opacity: pulseAnim }]}>
        🔍 AI is scanning your slip...
      </Animated.Text>
      <Text style={[styles.scanningSubtitle, { color: colors.textSecondary }]}>
        Extracting selections and analysing each leg
      </Text>
      <ActivityIndicator color={colors.cyan} style={{ marginTop: 12 }} />
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function SlipAnalysisScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { token, user } = useAuth();

  const [screen, setScreen] = useState<ScreenState>("upload");
  const [analysis, setAnalysis] = useState<SlipAnalysis | null>(null);
  const [manualText, setManualText] = useState("");
  const [error, setError] = useState("");

  const tier = (user as { tier?: string })?.tier ?? "free";
  const isLocked = tier === "free";

  async function analyzeImage(base64: string, mediaType: string) {
    setScreen("scanning");
    setError("");
    try {
      const result = await api.slip.analyze(token!, { imageBase64: base64, mediaType });
      setAnalysis(result.analysis as SlipAnalysis);
      setScreen("results");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
      setScreen("upload");
    }
  }

  async function analyzeText() {
    if (!manualText.trim()) return;
    setScreen("scanning");
    setError("");
    try {
      const result = await api.slip.analyze(token!, { textInput: manualText });
      setAnalysis(result.analysis as SlipAnalysis);
      setScreen("results");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
      setScreen("manual");
    }
  }

  async function pickImage(fromCamera: boolean) {
    if (isLocked) return;
    const perm = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (perm.status !== "granted") {
      setError("Permission denied");
      return;
    }

    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ base64: true, quality: 0.8 })
      : await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.8 });

    if (!result.canceled && result.assets[0]?.base64) {
      const asset = result.assets[0];
      const mimeType = asset.mimeType ?? "image/jpeg";
      await analyzeImage(asset.base64!, mimeType);
    }
  }

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  // ── Upload screen ──
  if (screen === "upload") {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.navHeader, { paddingTop: topPad + 12, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <X size={22} color={colors.textSecondary} />
          </TouchableOpacity>
          <Text style={[styles.navTitle, { color: colors.text }]}>Analyze My Slip</Text>
          <View style={{ width: 22 }} />
        </View>

        <ScrollView contentContainerStyle={{ padding: 24, gap: 0 }} showsVerticalScrollIndicator={false}>
          <View style={[styles.heroBox, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={{ fontSize: 48 }}>🎟️</Text>
            <Text style={[styles.heroTitle, { color: colors.text }]}>AI Slip Analyser</Text>
            <Text style={[styles.heroSub, { color: colors.textSecondary }]}>
              Upload or photograph your bet slip and Claude AI will analyse every leg, rate your chances, and spot weak selections instantly.
            </Text>
          </View>

          {isLocked ? (
            <View style={[styles.lockedBox, { backgroundColor: "rgba(255,107,53,0.08)", borderColor: "rgba(255,107,53,0.3)" }]}>
              <Text style={{ fontSize: 32 }}>🔒</Text>
              <Text style={[styles.lockedTitle, { color: "#FF6B35" }]}>PRO Feature</Text>
              <Text style={[styles.lockedSub, { color: colors.textSecondary }]}>
                Upgrade to PRO for 5 daily slip analyses, or Elite for unlimited.
              </Text>
              <TouchableOpacity
                style={[styles.upgradeBtn, { backgroundColor: "#FF6B35" }]}
                onPress={() => router.back()}
              >
                <Text style={[styles.upgradeBtnText, { color: "#fff" }]}>Upgrade Now</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.optionsList}>
              <TouchableOpacity
                style={[styles.optionCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
                onPress={() => pickImage(true)}
                activeOpacity={0.8}
              >
                <View style={[styles.optionIcon, { backgroundColor: "rgba(0,229,255,0.12)" }]}>
                  <Text style={{ fontSize: 24 }}>📷</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.optionTitle, { color: colors.text }]}>Take Photo</Text>
                  <Text style={[styles.optionSub, { color: colors.textSecondary }]}>Photograph your slip with the camera</Text>
                </View>
                <ChevronRight size={18} color={colors.textMuted} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.optionCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
                onPress={() => pickImage(false)}
                activeOpacity={0.8}
              >
                <View style={[styles.optionIcon, { backgroundColor: "rgba(0,229,255,0.12)" }]}>
                  <Text style={{ fontSize: 24 }}>🖼️</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.optionTitle, { color: colors.text }]}>Upload from Gallery</Text>
                  <Text style={[styles.optionSub, { color: colors.textSecondary }]}>Choose a screenshot or saved image</Text>
                </View>
                <ChevronRight size={18} color={colors.textMuted} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.optionCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
                onPress={() => setScreen("manual")}
                activeOpacity={0.8}
              >
                <View style={[styles.optionIcon, { backgroundColor: "rgba(0,229,255,0.12)" }]}>
                  <Text style={{ fontSize: 24 }}>✏️</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.optionTitle, { color: colors.text }]}>Enter Manually</Text>
                  <Text style={[styles.optionSub, { color: colors.textSecondary }]}>Type your selections in free text</Text>
                </View>
                <ChevronRight size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          )}

          {error ? (
            <Text style={[styles.errorText, { color: colors.red }]}>{error}</Text>
          ) : null}
        </ScrollView>
      </View>
    );
  }

  // ── Manual entry screen ──
  if (screen === "manual") {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.navHeader, { paddingTop: topPad + 12, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => setScreen("upload")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <ArrowLeft size={22} color={colors.textSecondary} />
          </TouchableOpacity>
          <Text style={[styles.navTitle, { color: colors.text }]}>Enter Slip Manually</Text>
          <View style={{ width: 22 }} />
        </View>
        <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
          <Text style={[styles.manualInstructions, { color: colors.textSecondary }]}>
            Type or paste your selections — team names, markets, and odds. Example:{"\n\n"}
            Arsenal vs Chelsea — Arsenal Win @ 1.85{"\n"}
            Man City vs Liverpool — Over 2.5 @ 1.72{"\n"}
            Stake: $20
          </Text>
          <View style={[styles.manualInputBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TextInput
              style={[styles.manualInput, { color: colors.text }]}
              value={manualText}
              onChangeText={setManualText}
              multiline
              numberOfLines={8}
              placeholder="Paste or type your slip selections here..."
              placeholderTextColor={colors.textMuted}
              textAlignVertical="top"
            />
          </View>
          {error ? <Text style={[styles.errorText, { color: colors.red }]}>{error}</Text> : null}
          <TouchableOpacity
            style={[styles.analyzeBtn, { backgroundColor: manualText.trim() ? colors.cyan : colors.border }]}
            onPress={analyzeText}
            disabled={!manualText.trim()}
            activeOpacity={0.85}
          >
            <Ionicons name="flash" size={18} color={manualText.trim() ? colors.background : colors.textMuted} />
            <Text style={[styles.analyzeBtnText, { color: manualText.trim() ? colors.background : colors.textMuted }]}>
              Analyse with AI
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // ── Scanning screen ──
  if (screen === "scanning") {
    return <ScanningScreen colors={colors} />;
  }

  // ── Results screen ──
  if (screen === "results" && analysis) {
    const verdict = VERDICT_CONFIG[analysis.verdict];
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.navHeader, { paddingTop: topPad + 12, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => setScreen("upload")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <ArrowLeft size={22} color={colors.textSecondary} />
          </TouchableOpacity>
          <Text style={[styles.navTitle, { color: colors.text }]}>Slip Analysis</Text>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <X size={22} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: insets.bottom + 40 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Verdict card */}
          <View style={[styles.verdictCard, { backgroundColor: verdict.bg, borderColor: verdict.color + "66" }]}>
            <Text style={[styles.verdictIcon]}>{verdict.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.verdictLabel, { color: colors.textSecondary }]}>AI Verdict</Text>
              <Text style={[styles.verdictText, { color: verdict.color }]}>{analysis.verdict}</Text>
              <Text style={[styles.verdictReason, { color: colors.textSecondary }]}>{analysis.verdict_reason}</Text>
            </View>
          </View>

          {/* Overview row */}
          <View style={[styles.overviewCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.overviewRow}>
              <View style={styles.overviewItem}>
                <Text style={[styles.overviewLabel, { color: colors.textMuted }]}>Bookmaker</Text>
                <Text style={[styles.overviewValue, { color: colors.text }]}>{analysis.bookmaker}</Text>
              </View>
              <View style={styles.overviewItem}>
                <Text style={[styles.overviewLabel, { color: colors.textMuted }]}>Type</Text>
                <Text style={[styles.overviewValue, { color: colors.text }]}>{analysis.slip_type}</Text>
              </View>
              <View style={styles.overviewItem}>
                <Text style={[styles.overviewLabel, { color: colors.textMuted }]}>Total Odds</Text>
                <Text style={[styles.overviewValue, { color: colors.cyan }]}>{analysis.total_odds.toFixed(2)}</Text>
              </View>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.overviewRow}>
              {analysis.stake != null && (
                <View style={styles.overviewItem}>
                  <Text style={[styles.overviewLabel, { color: colors.textMuted }]}>Stake</Text>
                  <Text style={[styles.overviewValue, { color: colors.text }]}>${analysis.stake}</Text>
                </View>
              )}
              {analysis.potential_payout != null && (
                <View style={styles.overviewItem}>
                  <Text style={[styles.overviewLabel, { color: colors.textMuted }]}>Potential</Text>
                  <Text style={[styles.overviewValue, { color: colors.green }]}>${analysis.potential_payout.toFixed(2)}</Text>
                </View>
              )}
              <View style={styles.overviewItem}>
                <Text style={[styles.overviewLabel, { color: colors.textMuted }]}>Win Prob</Text>
                <Text style={[styles.overviewValue, { color: analysis.win_probability >= 50 ? colors.green : colors.red }]}>
                  {analysis.win_probability}%
                </Text>
              </View>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={[styles.overviewLabel, { color: colors.textMuted }]}>AI Rating</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <StarRating value={analysis.overall_rating} />
                <Text style={[styles.overviewValue, { color: colors.text }]}>{analysis.overall_rating}/10</Text>
              </View>
            </View>
          </View>

          {/* Selections */}
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Selections ({analysis.selections.length} legs)
          </Text>
          {analysis.selections.map((sel, idx) => {
            const cfg = STATUS_CONFIG[sel.status];
            return (
              <View
                key={idx}
                style={[styles.legCard, { backgroundColor: colors.card, borderColor: cfg.color + "44" }]}
              >
                <View style={styles.legHeader}>
                  <Text style={[styles.legNumber, { color: colors.textMuted }]}>LEG {idx + 1}</Text>
                  <View style={[styles.legStatusBadge, { backgroundColor: cfg.bg, borderColor: cfg.color }]}>
                    <Text style={[styles.legStatusText, { color: cfg.color }]}>
                      {cfg.icon} {sel.status}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.legMatch, { color: colors.text }]}>{sel.match}</Text>
                <View style={styles.legDetailRow}>
                  <Text style={[styles.legMarket, { color: colors.textSecondary }]}>{sel.market}</Text>
                  <Text style={[styles.legSelection, { color: colors.cyan }]}>{sel.selection}</Text>
                  <Text style={[styles.legOdds, { color: colors.gold }]}>@ {sel.odds.toFixed(2)}</Text>
                </View>
                <View style={styles.legConfRow}>
                  <View style={[styles.legConfBar, { backgroundColor: colors.border }]}>
                    <View
                      style={[
                        styles.legConfFill,
                        {
                          width: `${sel.ai_confidence}%`,
                          backgroundColor: sel.ai_confidence >= 70 ? colors.green : sel.ai_confidence >= 50 ? colors.gold : colors.red,
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.legConfText, { color: colors.textSecondary }]}>
                    AI: {sel.ai_confidence}%
                  </Text>
                </View>
                <Text style={[styles.legReasoning, { color: colors.textSecondary }]}>"{sel.reasoning}"</Text>
                {sel.alternative && (
                  <View style={[styles.altRow, { backgroundColor: "rgba(0,229,255,0.06)", borderColor: colors.border }]}>
                    <ArrowRight size={12} color={colors.cyan} />
                    <Text style={[styles.altText, { color: colors.cyan }]}>Better: {sel.alternative}</Text>
                  </View>
                )}
              </View>
            );
          })}

          {/* Weakest / Strongest */}
          <View style={styles.hiLoRow}>
            <View style={[styles.hiLoCard, { backgroundColor: "rgba(255,77,77,0.08)", borderColor: "rgba(255,77,77,0.3)" }]}>
              <Text style={[styles.hiLoLabel, { color: colors.red }]}>⚠️ Weakest Leg</Text>
              <Text style={[styles.hiLoValue, { color: colors.text }]}>{analysis.weakest_leg}</Text>
            </View>
            <View style={[styles.hiLoCard, { backgroundColor: "rgba(0,255,148,0.08)", borderColor: "rgba(0,255,148,0.3)" }]}>
              <Text style={[styles.hiLoLabel, { color: colors.green }]}>✅ Strongest</Text>
              <Text style={[styles.hiLoValue, { color: colors.text }]}>{analysis.strongest_leg}</Text>
            </View>
          </View>

          {/* Recommendations */}
          {analysis.recommendations.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>AI Recommendations</Text>
              <View style={[styles.recsCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                {analysis.recommendations.map((rec, i) => (
                  <View key={i} style={styles.recRow}>
                    <Lightbulb size={14} color={colors.cyan} />
                    <Text style={[styles.recText, { color: colors.textSecondary }]}>{rec}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* Safer alternative */}
          {analysis.safer_alternative && (
            <View style={[styles.saferCard, { backgroundColor: "rgba(0,229,255,0.06)", borderColor: colors.cyan + "44" }]}>
              <Text style={[styles.saferTitle, { color: colors.cyan }]}>💡 Safer Alternative</Text>
              <Text style={[styles.saferText, { color: colors.textSecondary }]}>{analysis.safer_alternative}</Text>
            </View>
          )}

          {/* Kelly stake */}
          {analysis.kelly_stake != null && (
            <View style={[styles.kellyCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <Text style={[styles.kellyLabel, { color: colors.textMuted }]}>Kelly Criterion Suggested Stake</Text>
              <Text style={[styles.kellyValue, { color: colors.gold }]}>${analysis.kelly_stake.toFixed(2)}</Text>
            </View>
          )}

          {/* Actions */}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.card, borderColor: colors.border, flex: 1 }]}
              onPress={() => setScreen("upload")}
            >
              <Upload size={16} color={colors.textSecondary} />
              <Text style={[styles.actionBtnText, { color: colors.textSecondary }]}>New Slip</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.cyan, flex: 1 }]}
              onPress={() => router.back()}
            >
              <Check size={16} color={colors.background} />
              <Text style={[styles.actionBtnText, { color: colors.background }]}>Done</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  return null;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  centeredFull: { flex: 1, alignItems: "center", justifyContent: "center", gap: 20, padding: 40 },

  navHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  navTitle: { fontSize: 17 },

  heroBox: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    gap: 10,
    marginBottom: 20,
  },
  heroTitle: { fontSize: 20 },
  heroSub: { fontSize: 14, textAlign: "center", lineHeight: 21 },

  lockedBox: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    gap: 10,
  },
  lockedTitle: { fontSize: 20 },
  lockedSub: { fontSize: 14, textAlign: "center" },
  upgradeBtn: { paddingHorizontal: 28, paddingVertical: 12, borderRadius: 12, marginTop: 8 },
  upgradeBtnText: { fontSize: 15 },

  optionsList: { gap: 12 },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    padding: 18,
    borderRadius: 14,
    borderWidth: 1,
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  optionTitle: { fontSize: 15 },
  optionSub: { fontSize: 12, marginTop: 2 },

  errorText: { fontSize: 13, textAlign: "center", marginTop: 8 },

  manualInstructions: { fontSize: 13, lineHeight: 20 },
  manualInputBox: { borderRadius: 12, borderWidth: 1, padding: 14 },
  manualInput: { fontSize: 14, minHeight: 140 },
  analyzeBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 16, borderRadius: 14 },
  analyzeBtnText: { fontSize: 16 },

  scanBox: { width: 200, height: 260, borderRadius: 16, borderWidth: 2, padding: 12, overflow: "hidden" },
  scanContent: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    position: "relative",
  },
  scanLine: { position: "absolute", left: 0, right: 0, height: 2, opacity: 0.8 },
  scanningTitle: { fontSize: 18 },
  scanningSubtitle: { fontSize: 14, textAlign: "center" },

  verdictCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    padding: 18,
    borderRadius: 16,
    borderWidth: 2,
  },
  verdictIcon: { fontSize: 28 },
  verdictLabel: { fontSize: 11, letterSpacing: 0.5 },
  verdictText: { fontSize: 22 },
  verdictReason: { fontSize: 13, marginTop: 4, lineHeight: 19 },

  overviewCard: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 12 },
  overviewRow: { flexDirection: "row", justifyContent: "space-between" },
  overviewItem: { flex: 1, alignItems: "center", gap: 4 },
  overviewLabel: { fontSize: 10, letterSpacing: 0.5 },
  overviewValue: { fontSize: 15 },
  divider: { height: 1 },

  sectionTitle: { fontSize: 16 },

  legCard: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 8 },
  legHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  legNumber: { fontSize: 11, letterSpacing: 0.5 },
  legStatusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  legStatusText: { fontSize: 10 },
  legMatch: { fontSize: 14 },
  legDetailRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  legMarket: { fontSize: 12 },
  legSelection: { fontSize: 12 },
  legOdds: { fontSize: 13 },
  legConfRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  legConfBar: { flex: 1, height: 4, borderRadius: 2, overflow: "hidden" },
  legConfFill: { height: "100%", borderRadius: 2 },
  legConfText: { fontSize: 11, width: 60 },
  legReasoning: { fontSize: 12, fontStyle: "italic", lineHeight: 18 },
  altRow: { flexDirection: "row", alignItems: "center", gap: 6, padding: 8, borderRadius: 8, borderWidth: 1 },
  altText: { fontSize: 12, flex: 1 },

  hiLoRow: { flexDirection: "row", gap: 12 },
  hiLoCard: { flex: 1, borderRadius: 12, borderWidth: 1, padding: 14, gap: 4 },
  hiLoLabel: { fontSize: 11 },
  hiLoValue: { fontSize: 12 },

  recsCard: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 10 },
  recRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  recText: { flex: 1, fontSize: 13, lineHeight: 19 },

  saferCard: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 6 },
  saferTitle: { fontSize: 13 },
  saferText: { fontSize: 13, lineHeight: 19 },

  kellyCard: { borderRadius: 14, borderWidth: 1, padding: 16, alignItems: "center", gap: 4 },
  kellyLabel: { fontSize: 11, letterSpacing: 0.5 },
  kellyValue: { fontSize: 28 },

  actionsRow: { flexDirection: "row", gap: 12 },
  actionBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 14, borderRadius: 14, borderWidth: 1 },
  actionBtnText: { fontSize: 14 },
});
