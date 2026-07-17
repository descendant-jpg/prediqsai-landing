import { AlertCircle, AlertTriangle, ArrowLeft, CheckCircle, ChevronDown, ChevronUp, ExternalLink, FileText, Lock, RefreshCw, Shield, XCircle } from "lucide-react-native";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { api, type SetupVar } from "@/lib/api";

interface SetupStatus {
  allCriticalOk: boolean;
  configuredCount: number;
  totalCount: number;
  critical: SetupVar[];
  optional: SetupVar[];
}

function VarRow({ v, expanded, onToggle }: { v: SetupVar; expanded: boolean; onToggle: () => void }) {
  const colors = useColors();

  return (
    <TouchableOpacity
      style={[
        styles.varRow,
        {
          backgroundColor: colors.card,
          borderColor: v.configured
            ? "rgba(0,255,148,0.2)"
            : v.critical
              ? "rgba(255,77,77,0.3)"
              : colors.cardBorder,
        },
      ]}
      onPress={onToggle}
      activeOpacity={0.85}
    >
      <View style={styles.varHeader}>
        <View
          style={[
            styles.statusDot,
            { backgroundColor: v.configured ? "#00FF94" : v.critical ? "#FF4D4D" : "#FF6B35" },
          ]}
        />
        <View style={styles.varTitleGroup}>
          <Text style={[styles.varLabel, { color: colors.text }]}>{v.label}</Text>
          <Text style={[styles.varKey, { color: colors.textMuted }]}>{v.key}</Text>
        </View>
        <View style={styles.varBadgeGroup}>
          {v.critical && !v.configured && (
            <View style={[styles.criticalBadge, { backgroundColor: "rgba(255,77,77,0.15)" }]}>
              <Text style={[styles.criticalBadgeText, { color: "#FF4D4D" }]}>CRITICAL</Text>
            </View>
          )}
          {expanded ? (
            <ChevronUp size={16} color={colors.textMuted} />
          ) : (
            <ChevronDown size={16} color={colors.textMuted} />
          )}
        </View>
      </View>

      {expanded && (
        <View style={[styles.varDetails, { borderTopColor: colors.border }]}>
          <View style={[styles.statusRow, { backgroundColor: v.configured ? "rgba(0,255,148,0.07)" : "rgba(255,77,77,0.07)", borderRadius: 8 }]}>
            {v.configured ? (
              <CheckCircle size={14} color="#00FF94" />
            ) : (
              <XCircle size={14} color="#FF4D4D" />
            )}
            <Text style={[styles.statusText, { color: v.configured ? "#00FF94" : "#FF4D4D" }]}>
              {v.configured ? "Configured" : "Missing"}
            </Text>
            {v.hasFree && (
              <View style={[styles.freeBadge, { backgroundColor: "rgba(0,229,255,0.1)" }]}>
                <Text style={[styles.freeBadgeText, { color: "#00E5FF" }]}>Free tier available</Text>
              </View>
            )}
          </View>

          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>What it does</Text>
          <Text style={[styles.detailText, { color: colors.text }]}>{v.description}</Text>

          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Features affected</Text>
          <Text style={[styles.detailText, { color: colors.text }]}>{v.affectsFeatures}</Text>

          {!v.configured && (
            <>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Step-by-step</Text>
              {v.steps.map((step, i) => (
                <View key={i} style={styles.stepRow}>
                  <View style={[styles.stepNumber, { backgroundColor: "rgba(0,229,255,0.1)" }]}>
                    <Text style={[styles.stepNumberText, { color: "#00E5FF" }]}>{i + 1}</Text>
                  </View>
                  <Text style={[styles.stepText, { color: colors.text }]}>{step}</Text>
                </View>
              ))}

              {v.signupUrl && (
                <TouchableOpacity
                  style={[styles.linkBtn, { borderColor: "#00E5FF" }]}
                  onPress={() => Linking.openURL(v.signupUrl!)}
                  activeOpacity={0.8}
                >
                  <ExternalLink size={14} color="#00E5FF" />
                  <Text style={[styles.linkBtnText, { color: "#00E5FF" }]}>
                    Open {v.signupUrl.replace("https://", "")}
                  </Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function SetupScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { token, user } = useAuth();

  const [status, setStatus] = useState<SetupStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const topPaddingWeb = Platform.OS === "web" ? 67 : 0;
  const topPadding = insets.top + topPaddingWeb;

  const load = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setError("");
    try {
      const data = await api.setup.status(token);
      setStatus(data);
      const missingCritical = data.critical.filter((v) => !v.configured).map((v) => v.key);
      setExpanded(new Set(missingCritical));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load setup status");
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  function exitAdmin() {
    // Return to the previous user screen if there is history; otherwise
    // route safely to the main app home (dashboard tab).
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)" as any);
    }
  }

  function toggleExpand(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  if (user?.id !== 1) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.accessDenied, { paddingTop: topPadding + 40 }]}>
          <Lock size={40} color={colors.textMuted} />
          <Text style={[styles.accessTitle, { color: colors.text }]}>Admin Only</Text>
          <Text style={[styles.accessSub, { color: colors.textSecondary }]}>
            This page is only accessible to the first registered admin user.
          </Text>
          <TouchableOpacity
            style={[styles.backBtn, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
            onPress={exitAdmin}
          >
            <Text style={[styles.backBtnText, { color: colors.text }]}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: topPadding + 16, paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 32 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.pageHeader}>
          <TouchableOpacity onPress={exitAdmin} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <ArrowLeft size={22} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.pageTitleGroup}>
            <Text style={[styles.pageTitle, { color: colors.text }]}>API Keys Setup</Text>
            <View style={[styles.adminBadge, { backgroundColor: "rgba(0,229,255,0.1)", borderColor: "#00E5FF" }]}>
              <Shield size={10} color="#00E5FF" />
              <Text style={[styles.adminBadgeText, { color: "#00E5FF" }]}>ADMIN</Text>
            </View>
          </View>
          <TouchableOpacity onPress={load} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <RefreshCw size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <Text style={[styles.pageSubtitle, { color: colors.textSecondary }]}>
          Configure all secrets in Replit → Secrets (lock icon). Changes take effect after restarting the server.
        </Text>

        {isLoading && (
          <View style={styles.centered}>
            <ActivityIndicator color={colors.cyan} />
          </View>
        )}

        {error && !isLoading && (
          <View style={[styles.errorBanner, { backgroundColor: "rgba(255,77,77,0.08)", borderColor: "rgba(255,77,77,0.3)" }]}>
            <AlertCircle size={14} color="#FF4D4D" />
            <Text style={[styles.errorText, { color: "#FF4D4D" }]}>{error}</Text>
          </View>
        )}

        {status && !isLoading && (
          <>
            <View
              style={[
                styles.overallCard,
                {
                  backgroundColor: status.allCriticalOk ? "rgba(0,255,148,0.06)" : "rgba(255,77,77,0.06)",
                  borderColor: status.allCriticalOk ? "rgba(0,255,148,0.25)" : "rgba(255,77,77,0.3)",
                },
              ]}
            >
              {status.allCriticalOk ? (
                <CheckCircle size={28} color="#00FF94" />
              ) : (
                <AlertTriangle size={28} color="#FF4D4D" />
              )}
              <View style={styles.overallText}>
                <Text style={[styles.overallTitle, { color: colors.text }]}>
                  {status.allCriticalOk ? "All systems ready" : "Setup incomplete"}
                </Text>
                <Text style={[styles.overallSub, { color: colors.textSecondary }]}>
                  {status.configuredCount} of {status.totalCount} secrets configured
                  {!status.allCriticalOk ? " — critical items missing" : ""}
                </Text>
              </View>
            </View>

            <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${(status.configuredCount / status.totalCount) * 100}%` as any,
                    backgroundColor: status.allCriticalOk ? "#00FF94" : "#00E5FF",
                  },
                ]}
              />
            </View>

            <View style={styles.sectionHeader}>
              <View style={[styles.sectionDot, { backgroundColor: "#FF4D4D" }]} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Critical</Text>
              <Text style={[styles.sectionDesc, { color: colors.textSecondary }]}>App breaks without these</Text>
            </View>

            {status.critical.map((v) => (
              <VarRow key={v.key} v={v} expanded={expanded.has(v.key)} onToggle={() => toggleExpand(v.key)} />
            ))}

            <View style={[styles.sectionHeader, { marginTop: 8 }]}>
              <View style={[styles.sectionDot, { backgroundColor: "#FF6B35" }]} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Optional</Text>
              <Text style={[styles.sectionDesc, { color: colors.textSecondary }]}>Degrades gracefully if missing</Text>
            </View>

            {status.optional.map((v) => (
              <VarRow key={v.key} v={v} expanded={expanded.has(v.key)} onToggle={() => toggleExpand(v.key)} />
            ))}

            <View style={[styles.hintCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <FileText size={16} color={colors.textMuted} />
              <Text style={[styles.hintText, { color: colors.textSecondary }]}>
                A{" "}
                <Text style={{ color: colors.text }}>.env.example</Text>
                {" "}file in the project root lists all variables. Never commit real secrets to version control.
              </Text>
            </View>
          </>
        )}

        <TouchableOpacity
          style={[styles.exitAdminBtn, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
          onPress={exitAdmin}
          activeOpacity={0.8}
        >
          <ArrowLeft size={16} color={colors.text} />
          <Text style={[styles.exitAdminText, { color: colors.text }]}>Exit Admin</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 14 },
  pageHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 4 },
  pageTitleGroup: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  pageTitle: { fontSize: 22, letterSpacing: -0.4 },
  adminBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, borderWidth: 1 },
  adminBadgeText: { fontSize: 9, letterSpacing: 1 },
  pageSubtitle: { fontSize: 13, lineHeight: 19 },
  centered: { paddingVertical: 40, alignItems: "center" },
  errorBanner: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 10, borderWidth: 1 },
  errorText: { fontSize: 13, flex: 1 },
  overallCard: { flexDirection: "row", alignItems: "center", gap: 14, padding: 18, borderRadius: 16, borderWidth: 1 },
  overallText: { flex: 1, gap: 3 },
  overallTitle: { fontSize: 17 },
  overallSub: { fontSize: 13 },
  progressBar: { height: 6, borderRadius: 3, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 3 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
  sectionDot: { width: 8, height: 8, borderRadius: 4 },
  sectionTitle: { fontSize: 14, letterSpacing: 0.2 },
  sectionDesc: { fontSize: 12 },
  varRow: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  varHeader: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  statusDot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  varTitleGroup: { flex: 1, gap: 2 },
  varLabel: { fontSize: 14 },
  varKey: { fontSize: 11 },
  varBadgeGroup: { flexDirection: "row", alignItems: "center", gap: 8 },
  criticalBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  criticalBadgeText: { fontSize: 9, letterSpacing: 0.5 },
  varDetails: { padding: 14, paddingTop: 12, borderTopWidth: 1, gap: 8 },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 8, padding: 10, marginBottom: 4 },
  statusText: { fontSize: 13, flex: 1 },
  freeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  freeBadgeText: { fontSize: 11 },
  detailLabel: { fontSize: 11, letterSpacing: 0.5, textTransform: "uppercase" },
  detailText: { fontSize: 13, lineHeight: 19, marginTop: -4 },
  stepRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  stepNumber: { width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 },
  stepNumberText: { fontSize: 11 },
  stepText: { fontSize: 13, lineHeight: 19, flex: 1 },
  linkBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1, marginTop: 4 },
  linkBtnText: { fontSize: 13 },
  hintCard: { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 14, borderRadius: 12, borderWidth: 1, marginTop: 4 },
  hintText: { fontSize: 13, flex: 1, lineHeight: 19 },
  accessDenied: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14, padding: 40 },
  accessTitle: { fontSize: 22 },
  accessSub: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  backBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, borderWidth: 1, marginTop: 8 },
  backBtnText: { fontSize: 15 },
  exitAdminBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 12, borderWidth: 1, marginTop: 8 },
  exitAdminText: { fontSize: 15 },
});
