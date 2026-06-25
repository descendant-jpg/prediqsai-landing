import { DollarSign, Link, Plus, RefreshCw, Trash2 } from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";

import { AdminTabBar } from "@/components/AdminTabBar";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AffiliatePartner {
  id: string;
  bookName: string;
  logo: string | null;
  affiliateUrl: string;
  bonusText: string | null;
  commissionType: string | null;
  commissionAmount: number | null;
  commissionCurrency: string | null;
  minPayout: number | null;
  paymentSchedule: string | null;
  isActive: boolean | null;
  notes: string | null;
  regions: string[] | null;
  createdAt: string | null;
  totalClicks: number;
  totalConversions: number;
  totalEarned: number;
}

interface AffiliateSummary {
  totalClicks: number;
  totalConversions: number;
  totalEarned: number;
  pendingPayout: number;
  totalPaid: number;
  conversionRate: string;
}

interface AffiliateEarningsData {
  summary: AffiliateSummary;
  byPartner: { partnerId: string | null; bookName: string | null; clicks: number; earned: string | null }[];
  recent: { id: string; bookName: string | null; source: string | null; converted: boolean | null; commissionEarned: number | null; commissionCurrency: string | null; clickedAt: string | null; paymentStatus: string | null }[];
}

interface PartnerBalance {
  partnerId: string;
  bookName: string;
  logo: string | null;
  totalEarned: number;
  totalPaid: number;
  balanceOwed: number;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SummaryCard({ label, value, color, prefix }: { label: string; value: string | number; color: string; prefix?: string }) {
  const colors = useColors();
  return (
    <View style={[s.summaryCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
      <Text style={[s.summaryValue, { color }]}>{prefix ?? ""}{String(value)}</Text>
      <Text style={[s.summaryLabel, { color: colors.textMuted }]}>{label}</Text>
    </View>
  );
}

function PartnerRow({ partner, onEdit, onDelete, onToggle }: {
  partner: AffiliatePartner;
  onEdit: (p: AffiliatePartner) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string, active: boolean) => void;
}) {
  const colors = useColors();
  return (
    <View style={[s.partnerRow, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
      <View style={s.partnerHeader}>
        <Text style={[s.partnerLogo, {}]}>{partner.logo ?? "🏦"}</Text>
        <View style={{ flex: 1 }}>
          <Text style={[s.partnerName, { color: colors.text }]}>{partner.bookName}</Text>
          <Text style={[s.partnerBonus, { color: colors.textMuted }]} numberOfLines={1}>{partner.bonusText ?? "—"}</Text>
        </View>
        <Switch
          value={partner.isActive ?? false}
          onValueChange={(v) => onToggle(partner.id, v)}
          trackColor={{ false: colors.border, true: "#00E5FF40" }}
          thumbColor={partner.isActive ? "#00E5FF" : colors.textMuted}
        />
      </View>

      {partner.regions && partner.regions.length > 0 && (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4, paddingHorizontal: 12, paddingBottom: 8 }}>
          {partner.regions.map((r) => (
            <View key={r} style={[s.regionBadge, { backgroundColor: "rgba(0,229,255,0.08)", borderColor: "rgba(0,229,255,0.2)" }]}>
              <Text style={{ color: "#00E5FF", fontSize: 9, fontWeight: "600" }}>{r.replace("_", " ")}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={[s.partnerStats, { borderTopColor: colors.border }]}>
        <View style={s.partnerStat}>
          <Text style={[s.partnerStatVal, { color: colors.cyan }]}>{partner.totalClicks}</Text>
          <Text style={[s.partnerStatLabel, { color: colors.textMuted }]}>Clicks</Text>
        </View>
        <View style={s.partnerStat}>
          <Text style={[s.partnerStatVal, { color: "#00FF94" }]}>{partner.totalConversions}</Text>
          <Text style={[s.partnerStatLabel, { color: colors.textMuted }]}>Conv.</Text>
        </View>
        <View style={s.partnerStat}>
          <Text style={[s.partnerStatVal, { color: "#FFD700" }]}>${partner.totalEarned.toFixed(2)}</Text>
          <Text style={[s.partnerStatLabel, { color: colors.textMuted }]}>Earned</Text>
        </View>
        <View style={s.partnerStat}>
          <Text style={[s.partnerStatVal, { color: colors.textMuted }]}>{partner.commissionType ?? "—"}</Text>
          <Text style={[s.partnerStatLabel, { color: colors.textMuted }]}>Type</Text>
        </View>
      </View>

      <View style={s.partnerActions}>
        <TouchableOpacity
          style={[s.actionBtn, { backgroundColor: "rgba(0,229,255,0.1)", borderColor: "rgba(0,229,255,0.3)" }]}
          onPress={() => onEdit(partner)}
          activeOpacity={0.8}
        >
          <Text style={{ color: "#00E5FF", fontSize: 12 }}>✏️ Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.actionBtn, { backgroundColor: "rgba(255,77,77,0.1)", borderColor: "rgba(255,77,77,0.3)" }]}
          onPress={() => onDelete(partner.id)}
          activeOpacity={0.8}
        >
          <Trash2 size={13} color="#FF4D4D" />
          <Text style={{ color: "#FF4D4D", fontSize: 12 }}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Partner Form Modal ───────────────────────────────────────────────────────

function PartnerFormModal({
  visible, onClose, existing, token, onSaved,
}: {
  visible: boolean;
  onClose: () => void;
  existing: AffiliatePartner | null;
  token: string;
  onSaved: () => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const [bookName, setBookName] = useState("");
  const [logo, setLogo] = useState("");
  const [affiliateUrl, setAffiliateUrl] = useState("");
  const [bonusText, setBonusText] = useState("");
  const [commissionType, setCommissionType] = useState("cpa");
  const [commissionAmount, setCommissionAmount] = useState("");
  const [commissionCurrency, setCommissionCurrency] = useState("USD");
  const [minPayout, setMinPayout] = useState("");
  const [paymentSchedule, setPaymentSchedule] = useState("monthly");
  const [isActive, setIsActive] = useState(true);
  const [notes, setNotes] = useState("");
  const [regions, setRegions] = useState<string[]>(["GLOBAL"]);
  const [saving, setSaving] = useState(false);

  const ALL_REGIONS: { id: string; label: string }[] = [
    { id: "UK_IRELAND", label: "🇬🇧 UK & Ireland" },
    { id: "EUROPE",     label: "🌍 Europe" },
    { id: "EUROPE_DE",  label: "🇩🇪 Germany" },
    { id: "EUROPE_ES",  label: "🇪🇸 Spain" },
    { id: "EUROPE_FR",  label: "🇫🇷 France" },
    { id: "EUROPE_IT",  label: "🇮🇹 Italy" },
    { id: "AFRICA",     label: "🌍 Africa" },
    { id: "USA",        label: "🇺🇸 USA" },
    { id: "ASIA",       label: "🌏 Asia" },
    { id: "GLOBAL",     label: "🌐 Global" },
  ];

  const toggleRegion = (r: string) => {
    setRegions((prev) =>
      prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r],
    );
  };

  useEffect(() => {
    if (existing) {
      setBookName(existing.bookName);
      setLogo(existing.logo ?? "");
      setAffiliateUrl(existing.affiliateUrl);
      setBonusText(existing.bonusText ?? "");
      setCommissionType(existing.commissionType ?? "cpa");
      setCommissionAmount(String(existing.commissionAmount ?? ""));
      setCommissionCurrency(existing.commissionCurrency ?? "USD");
      setMinPayout(String(existing.minPayout ?? ""));
      setPaymentSchedule(existing.paymentSchedule ?? "monthly");
      setIsActive(existing.isActive ?? true);
      setNotes(existing.notes ?? "");
      setRegions(existing.regions && existing.regions.length > 0 ? existing.regions : ["GLOBAL"]);
    } else {
      setBookName(""); setLogo(""); setAffiliateUrl(""); setBonusText("");
      setCommissionType("cpa"); setCommissionAmount(""); setCommissionCurrency("USD");
      setMinPayout(""); setPaymentSchedule("monthly"); setIsActive(true); setNotes("");
      setRegions(["GLOBAL"]);
    }
  }, [existing, visible]);

  async function save() {
    if (!bookName.trim() || !affiliateUrl.trim()) {
      Alert.alert("Error", "Book name and affiliate URL are required");
      return;
    }
    setSaving(true);
    try {
      const body = {
        bookName, logo, affiliateUrl, bonusText, commissionType,
        commissionAmount: commissionAmount ? parseFloat(commissionAmount) : undefined,
        commissionCurrency, minPayout: minPayout ? parseFloat(minPayout) : undefined,
        paymentSchedule, isActive, notes, regions,
      };
      const method = existing ? "PUT" : "POST";
      const url = existing ? `/api/admin/affiliates/partners/${existing.id}` : "/api/admin/affiliates/partners";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Save failed");
      onSaved();
      onClose();
    } catch {
      Alert.alert("Error", "Failed to save partner");
    } finally {
      setSaving(false);
    }
  }

  const labelStyle = [s.formLabel, { color: colors.textMuted }];
  const inputStyle = [s.formInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }];

  const COMM_TYPES = ["cpa", "revenue_share", "hybrid"];
  const CURRENCIES = ["USD", "GBP", "EUR", "NGN"];
  const SCHEDULES = ["weekly", "monthly", "on_request"];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="formSheet" onRequestClose={onClose}>
      <View style={[s.formModal, { backgroundColor: colors.background }]}>
        <View style={[s.formHeader, { borderBottomColor: colors.border }]}>
          <Text style={[s.formTitle, { color: colors.text }]}>{existing ? "Edit Partner" : "Add New Partner"}</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={{ color: colors.textMuted }}>Cancel</Text>
          </TouchableOpacity>
        </View>
        <KeyboardAwareScrollViewCompat contentContainerStyle={[s.formBody, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
          <Text style={labelStyle}>Book Name *</Text>
          <TextInput style={inputStyle} value={bookName} onChangeText={setBookName} placeholder="e.g. Bet365" placeholderTextColor={colors.textMuted} />

          <Text style={labelStyle}>Logo (emoji or URL)</Text>
          <TextInput style={inputStyle} value={logo} onChangeText={setLogo} placeholder="🟢" placeholderTextColor={colors.textMuted} />

          <Text style={labelStyle}>Affiliate URL *</Text>
          <TextInput style={inputStyle} value={affiliateUrl} onChangeText={setAffiliateUrl} placeholder="https://..." placeholderTextColor={colors.textMuted} autoCapitalize="none" keyboardType="url" />

          <Text style={labelStyle}>Welcome Bonus Text</Text>
          <TextInput style={inputStyle} value={bonusText} onChangeText={setBonusText} placeholder="Bet $10 Get $200" placeholderTextColor={colors.textMuted} />

          <Text style={labelStyle}>Commission Type</Text>
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
            {COMM_TYPES.map((t) => (
              <TouchableOpacity
                key={t}
                style={[s.pill, { backgroundColor: commissionType === t ? colors.cyan : colors.card, borderColor: commissionType === t ? colors.cyan : colors.border }]}
                onPress={() => setCommissionType(t)}
              >
                <Text style={{ color: commissionType === t ? colors.background : colors.text, fontSize: 11 }}>{t.toUpperCase()}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={labelStyle}>Commission Amount</Text>
          <TextInput style={inputStyle} value={commissionAmount} onChangeText={setCommissionAmount} placeholder="25" placeholderTextColor={colors.textMuted} keyboardType="decimal-pad" />

          <Text style={labelStyle}>Commission Currency</Text>
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
            {CURRENCIES.map((c) => (
              <TouchableOpacity
                key={c}
                style={[s.pill, { backgroundColor: commissionCurrency === c ? colors.cyan : colors.card, borderColor: commissionCurrency === c ? colors.cyan : colors.border }]}
                onPress={() => setCommissionCurrency(c)}
              >
                <Text style={{ color: commissionCurrency === c ? colors.background : colors.text, fontSize: 11 }}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={labelStyle}>Minimum Payout</Text>
          <TextInput style={inputStyle} value={minPayout} onChangeText={setMinPayout} placeholder="50" placeholderTextColor={colors.textMuted} keyboardType="decimal-pad" />

          <Text style={labelStyle}>Payment Schedule</Text>
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
            {SCHEDULES.map((s) => (
              <TouchableOpacity
                key={s}
                style={[{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, backgroundColor: paymentSchedule === s ? colors.cyan : colors.card, borderColor: paymentSchedule === s ? colors.cyan : colors.border }]}
                onPress={() => setPaymentSchedule(s)}
              >
                <Text style={{ color: paymentSchedule === s ? colors.background : colors.text, fontSize: 11 }}>{s.replace("_", " ")}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={labelStyle}>Regions (select all that apply)</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
            {ALL_REGIONS.map((r) => {
              const active = regions.includes(r.id);
              return (
                <TouchableOpacity
                  key={r.id}
                  style={[s.pill, {
                    backgroundColor: active ? "rgba(0,229,255,0.15)" : colors.card,
                    borderColor: active ? colors.cyan : colors.border,
                  }]}
                  onPress={() => toggleRegion(r.id)}
                >
                  <Text style={{ color: active ? colors.cyan : colors.text, fontSize: 11 }}>{r.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={labelStyle}>Notes</Text>
          <TextInput
            style={[inputStyle, { height: 80, textAlignVertical: "top" }]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Internal notes..."
            placeholderTextColor={colors.textMuted}
            multiline
          />

          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <Text style={[s.formLabel, { color: colors.text }]}>Active</Text>
            <Switch
              value={isActive}
              onValueChange={setIsActive}
              trackColor={{ false: colors.border, true: "#00E5FF40" }}
              thumbColor={isActive ? "#00E5FF" : colors.textMuted}
            />
          </View>

          <TouchableOpacity
            style={[s.saveBtn, { backgroundColor: colors.cyan, opacity: saving ? 0.7 : 1 }]}
            onPress={save}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving ? <ActivityIndicator color={colors.background} size="small" /> : <Text style={[s.saveBtnText, { color: colors.background }]}>Save Partner</Text>}
          </TouchableOpacity>
        </KeyboardAwareScrollViewCompat>
      </View>
    </Modal>
  );
}

// ─── Log Earning Modal ─────────────────────────────────────────────────────────

function LogEarningModal({
  visible, onClose, partners, token, onSaved,
}: {
  visible: boolean;
  onClose: () => void;
  partners: AffiliatePartner[];
  token: string;
  onSaved: () => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [partnerId, setPartnerId] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [status, setStatus] = useState("pending");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible && partners.length > 0) setPartnerId(partners[0]!.id);
  }, [visible, partners]);

  async function save() {
    if (!partnerId || !amount) { Alert.alert("Error", "Partner and amount required"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/affiliates/earnings", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ partnerId, commissionAmount: parseFloat(amount), commissionCurrency: currency, paymentStatus: status, notes }),
      });
      if (!res.ok) throw new Error("Failed");
      onSaved();
      onClose();
    } catch {
      Alert.alert("Error", "Failed to log earning");
    } finally {
      setSaving(false);
    }
  }

  const inputStyle = [s.formInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="formSheet" onRequestClose={onClose}>
      <View style={[s.formModal, { backgroundColor: colors.background }]}>
        <View style={[s.formHeader, { borderBottomColor: colors.border }]}>
          <Text style={[s.formTitle, { color: colors.text }]}>Log Earning</Text>
          <TouchableOpacity onPress={onClose}><Text style={{ color: colors.textMuted }}>Cancel</Text></TouchableOpacity>
        </View>
        <KeyboardAwareScrollViewCompat contentContainerStyle={[s.formBody, { paddingBottom: insets.bottom + 32 }]}>
          <Text style={[s.formLabel, { color: colors.textMuted }]}>Select Partner</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {partners.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={[s.pill, { backgroundColor: partnerId === p.id ? colors.cyan : colors.card, borderColor: partnerId === p.id ? colors.cyan : colors.border }]}
                  onPress={() => setPartnerId(p.id)}
                >
                  <Text style={{ color: partnerId === p.id ? colors.background : colors.text, fontSize: 12 }}>{p.logo ?? "🏦"} {p.bookName}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <Text style={[s.formLabel, { color: colors.textMuted }]}>Amount Earned</Text>
          <TextInput style={inputStyle} value={amount} onChangeText={setAmount} placeholder="25.00" placeholderTextColor={colors.textMuted} keyboardType="decimal-pad" />

          <Text style={[s.formLabel, { color: colors.textMuted }]}>Currency</Text>
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
            {["USD", "GBP", "EUR", "NGN"].map((c) => (
              <TouchableOpacity key={c} style={[s.pill, { backgroundColor: currency === c ? colors.cyan : colors.card, borderColor: currency === c ? colors.cyan : colors.border }]} onPress={() => setCurrency(c)}>
                <Text style={{ color: currency === c ? colors.background : colors.text, fontSize: 11 }}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[s.formLabel, { color: colors.textMuted }]}>Payment Status</Text>
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
            {["pending", "paid"].map((st) => (
              <TouchableOpacity key={st} style={[s.pill, { backgroundColor: status === st ? "#00FF94" : colors.card, borderColor: status === st ? "#00FF94" : colors.border }]} onPress={() => setStatus(st)}>
                <Text style={{ color: status === st ? "#000" : colors.text, fontSize: 12 }}>{st.toUpperCase()}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[s.formLabel, { color: colors.textMuted }]}>Notes</Text>
          <TextInput style={[inputStyle, { height: 60, textAlignVertical: "top" }]} value={notes} onChangeText={setNotes} placeholder="e.g. October CPA batch" placeholderTextColor={colors.textMuted} multiline />

          <TouchableOpacity style={[s.saveBtn, { backgroundColor: "#00FF94", opacity: saving ? 0.7 : 1 }]} onPress={save} disabled={saving} activeOpacity={0.85}>
            {saving ? <ActivityIndicator color="#000" size="small" /> : <Text style={[s.saveBtnText, { color: "#000" }]}>Log Earning</Text>}
          </TouchableOpacity>
        </KeyboardAwareScrollViewCompat>
      </View>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

type ScreenTab = "partners" | "earnings" | "payouts";

export default function AdminAffiliatesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();

  const [tab, setTab] = useState<ScreenTab>("partners");
  const [partners, setPartners] = useState<AffiliatePartner[]>([]);
  const [earnings, setEarnings] = useState<AffiliateEarningsData | null>(null);
  const [balances, setBalances] = useState<PartnerBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [formVisible, setFormVisible] = useState(false);
  const [earningFormVisible, setEarningFormVisible] = useState(false);
  const [editingPartner, setEditingPartner] = useState<AffiliatePartner | null>(null);
  const [seeding, setSeeding] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [p, e, py] = await Promise.all([
        fetch("/api/admin/affiliates/partners", { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()) as Promise<{ partners: AffiliatePartner[] }>,
        fetch("/api/admin/affiliates/earnings", { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()) as Promise<AffiliateEarningsData>,
        fetch("/api/admin/affiliates/payouts", { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()) as Promise<{ balances: PartnerBalance[] }>,
      ]);
      setPartners(p.partners ?? []);
      setEarnings(e);
      setBalances(py.balances ?? []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  async function deletePartner(id: string) {
    Alert.alert("Delete Partner", "This will remove the partner and all associated click data. Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          await fetch(`/api/admin/affiliates/partners/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
          load();
        },
      },
    ]);
  }

  async function togglePartner(id: string, active: boolean) {
    await fetch(`/api/admin/affiliates/partners/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ isActive: active }),
    });
    load();
  }

  async function seedPartners() {
    setSeeding(true);
    try {
      const res = await fetch("/api/admin/affiliates/seed", { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      const d = await res.json() as { inserted: number; skipped: number };
      Alert.alert("Seed Complete", `Inserted: ${d.inserted}, Skipped: ${d.skipped}`);
      load();
    } catch {
      Alert.alert("Error", "Seed failed");
    } finally {
      setSeeding(false);
    }
  }

  async function logPayout(partnerId: string) {
    Alert.prompt?.("Log Payout", "Enter amount paid:", async (amtStr) => {
      if (!amtStr) return;
      await fetch("/api/admin/affiliates/payouts", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ partnerId, amount: parseFloat(amtStr), currency: "USD" }),
      });
      load();
    });
  }

  const TABS: { id: ScreenTab; label: string }[] = [
    { id: "partners", label: "🔗 Partners" },
    { id: "earnings", label: "💰 Earnings" },
    { id: "payouts", label: "💳 Payouts" },
  ];

  const summary = earnings?.summary;

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <View style={[s.header, { paddingTop: insets.top + 12, borderBottomColor: colors.border }]}>
        <View style={{ flex: 1 }}>
          <Text style={[s.headerTitle, { color: colors.text }]}>🤝 Affiliate Management</Text>
          <Text style={[s.headerSub, { color: colors.textMuted }]}>{partners.length} partners · {summary?.totalClicks ?? 0} clicks</Text>
        </View>
        <TouchableOpacity onPress={() => load()} style={{ padding: 8 }}>
          <RefreshCw size={18} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      <View style={[s.tabBar, { borderBottomColor: colors.border }]}>
        {TABS.map((t) => (
          <TouchableOpacity
            key={t.id}
            style={[s.tabBtn, tab === t.id && { borderBottomColor: colors.cyan, borderBottomWidth: 2 }]}
            onPress={() => setTab(t.id)}
          >
            <Text style={[s.tabLabel, { color: tab === t.id ? colors.cyan : colors.textMuted }]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.cyan} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={[s.content, { paddingBottom: 100 }]} showsVerticalScrollIndicator={false}>

          {/* PARTNERS TAB */}
          {tab === "partners" && (
            <>
              <View style={s.actionRow}>
                <TouchableOpacity
                  style={[s.addBtn, { backgroundColor: colors.cyan }]}
                  onPress={() => { setEditingPartner(null); setFormVisible(true); }}
                  activeOpacity={0.85}
                >
                  <Plus size={16} color={colors.background} />
                  <Text style={[s.addBtnText, { color: colors.background }]}>Add Partner</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.seedBtn, { borderColor: colors.border }]}
                  onPress={seedPartners}
                  disabled={seeding}
                  activeOpacity={0.85}
                >
                  {seeding ? <ActivityIndicator size="small" color={colors.textMuted} /> : <Text style={{ color: colors.textMuted, fontSize: 13 }}>🌱 Seed Defaults</Text>}
                </TouchableOpacity>
              </View>

              {partners.length === 0 ? (
                <View style={s.emptyState}>
                  <Link size={32} color={colors.textMuted} />
                  <Text style={[s.emptyText, { color: colors.textMuted }]}>No partners yet. Add one or seed defaults.</Text>
                </View>
              ) : (
                partners.map((p) => (
                  <PartnerRow
                    key={p.id}
                    partner={p}
                    onEdit={(partner) => { setEditingPartner(partner); setFormVisible(true); }}
                    onDelete={deletePartner}
                    onToggle={togglePartner}
                  />
                ))
              )}
            </>
          )}

          {/* EARNINGS TAB */}
          {tab === "earnings" && (
            <>
              {summary && (
                <>
                  <Text style={[s.sectionLabel, { color: colors.textMuted }]}>SUMMARY</Text>
                  <View style={s.summaryGrid}>
                    <SummaryCard label="Total Clicks" value={summary.totalClicks} color={colors.cyan} />
                    <SummaryCard label="Conversions" value={summary.totalConversions} color="#00FF94" />
                    <SummaryCard label="Earned" value={summary.totalEarned.toFixed(2)} color="#FFD700" prefix="$" />
                    <SummaryCard label="Pending" value={summary.pendingPayout.toFixed(2)} color="#FF9900" prefix="$" />
                    <SummaryCard label="Conv. Rate" value={`${summary.conversionRate}%`} color="#9B59B6" />
                    <SummaryCard label="Paid Out" value={summary.totalPaid.toFixed(2)} color={colors.textMuted} prefix="$" />
                  </View>
                </>
              )}

              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8, marginBottom: 4 }}>
                <Text style={[s.sectionLabel, { color: colors.textMuted }]}>BY PARTNER</Text>
              </View>
              {(earnings?.byPartner ?? []).map((bp, i) => (
                <View key={i} style={[s.earningRow, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                  <Text style={[{ color: colors.text, fontSize: 13, flex: 1 }]}>{bp.bookName ?? "Unknown"}</Text>
                  <Text style={[{ color: colors.cyan, fontSize: 12 }]}>{bp.clicks} clicks</Text>
                  <Text style={[{ color: "#00FF94", fontSize: 12, marginLeft: 12 }]}>${Number(bp.earned ?? 0).toFixed(2)}</Text>
                </View>
              ))}

              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 16, marginBottom: 4 }}>
                <Text style={[s.sectionLabel, { color: colors.textMuted }]}>RECENT ACTIVITY</Text>
                <TouchableOpacity
                  style={[s.logEarningBtn, { borderColor: "#00FF94" }]}
                  onPress={() => setEarningFormVisible(true)}
                  activeOpacity={0.85}
                >
                  <DollarSign size={13} color="#00FF94" />
                  <Text style={{ color: "#00FF94", fontSize: 12 }}>Log Earning</Text>
                </TouchableOpacity>
              </View>
              {(earnings?.recent ?? []).map((r) => (
                <View key={r.id} style={[s.recentRow, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[{ color: colors.text, fontSize: 12 }]}>{r.bookName ?? "?"} · <Text style={{ color: colors.textMuted }}>{r.source ?? "?"}</Text></Text>
                    <Text style={[{ color: colors.textMuted, fontSize: 10 }]}>{r.clickedAt ? new Date(r.clickedAt).toLocaleDateString() : "—"}</Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={[{ fontSize: 11, color: r.converted ? "#00FF94" : colors.textMuted }]}>{r.converted ? "✅ Converted" : "Click"}</Text>
                    {r.converted && <Text style={{ color: "#FFD700", fontSize: 11 }}>${Number(r.commissionEarned ?? 0).toFixed(2)}</Text>}
                    <Text style={[{ fontSize: 10, color: r.paymentStatus === "paid" ? "#00FF94" : "#FF9900" }]}>{r.paymentStatus ?? "pending"}</Text>
                  </View>
                </View>
              ))}
            </>
          )}

          {/* PAYOUTS TAB */}
          {tab === "payouts" && (
            <>
              <Text style={[s.sectionLabel, { color: colors.textMuted }]}>BALANCE OWED PER PARTNER</Text>
              {balances.length === 0 ? (
                <View style={s.emptyState}>
                  <Text style={[s.emptyText, { color: colors.textMuted }]}>No affiliate earnings recorded yet.</Text>
                </View>
              ) : (
                balances.map((b) => (
                  <View key={b.partnerId} style={[s.balanceRow, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[{ color: colors.text, fontSize: 14, fontWeight: "700" }]}>{b.logo ?? "🏦"} {b.bookName}</Text>
                      <View style={{ flexDirection: "row", gap: 16, marginTop: 6 }}>
                        <View>
                          <Text style={{ color: colors.textMuted, fontSize: 10 }}>EARNED</Text>
                          <Text style={{ color: "#FFD700", fontSize: 13 }}>${b.totalEarned.toFixed(2)}</Text>
                        </View>
                        <View>
                          <Text style={{ color: colors.textMuted, fontSize: 10 }}>PAID</Text>
                          <Text style={{ color: "#00FF94", fontSize: 13 }}>${b.totalPaid.toFixed(2)}</Text>
                        </View>
                        <View>
                          <Text style={{ color: colors.textMuted, fontSize: 10 }}>OWED</Text>
                          <Text style={{ color: b.balanceOwed > 0 ? "#FF9900" : colors.textMuted, fontSize: 13 }}>${b.balanceOwed.toFixed(2)}</Text>
                        </View>
                      </View>
                    </View>
                    {b.balanceOwed > 0 && (
                      <TouchableOpacity
                        style={[s.markPaidBtn, { borderColor: "#00FF94" }]}
                        onPress={() => logPayout(b.partnerId)}
                        activeOpacity={0.8}
                      >
                        <Text style={{ color: "#00FF94", fontSize: 12 }}>Mark Paid</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))
              )}
            </>
          )}
        </ScrollView>
      )}

      <PartnerFormModal
        visible={formVisible}
        onClose={() => setFormVisible(false)}
        existing={editingPartner}
        token={token ?? ""}
        onSaved={load}
      />

      <LogEarningModal
        visible={earningFormVisible}
        onClose={() => setEarningFormVisible(false)}
        partners={partners}
        token={token ?? ""}
        onSaved={load}
      />

      <AdminTabBar />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  headerSub: { fontSize: 12, marginTop: 2 },
  tabBar: { flexDirection: "row", borderBottomWidth: 1 },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: "center" },
  tabLabel: { fontSize: 12, fontWeight: "600" },
  content: { padding: 14, gap: 10 },
  sectionLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 1, marginTop: 4 },
  actionRow: { flexDirection: "row", gap: 10, marginBottom: 4 },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  addBtnText: { fontWeight: "700", fontSize: 14 },
  seedBtn: { borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  emptyState: { alignItems: "center", paddingVertical: 48, gap: 12 },
  emptyText: { fontSize: 14, textAlign: "center" },
  partnerRow: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  partnerHeader: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12 },
  partnerLogo: { fontSize: 24, width: 36, textAlign: "center" },
  partnerName: { fontSize: 15, fontWeight: "700" },
  partnerBonus: { fontSize: 11, marginTop: 2 },
  partnerStats: { flexDirection: "row", borderTopWidth: 1, paddingVertical: 10, paddingHorizontal: 12 },
  partnerStat: { flex: 1, alignItems: "center" },
  partnerStatVal: { fontSize: 15, fontWeight: "700" },
  partnerStatLabel: { fontSize: 9, marginTop: 2 },
  partnerActions: { flexDirection: "row", gap: 8, padding: 10 },
  actionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  summaryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  summaryCard: { width: "30%", flexGrow: 1, padding: 12, borderRadius: 12, borderWidth: 1, alignItems: "center", gap: 4 },
  summaryValue: { fontSize: 20, fontWeight: "700" },
  summaryLabel: { fontSize: 10, textAlign: "center" },
  earningRow: { flexDirection: "row", alignItems: "center", padding: 10, borderRadius: 10, borderWidth: 1 },
  recentRow: { flexDirection: "row", alignItems: "center", padding: 10, borderRadius: 10, borderWidth: 1 },
  balanceRow: { flexDirection: "row", alignItems: "center", padding: 14, borderRadius: 14, borderWidth: 1 },
  logEarningBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  markPaidBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  formModal: { flex: 1 },
  formHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, borderBottomWidth: 1 },
  formTitle: { fontSize: 17, fontWeight: "700" },
  formBody: { padding: 16, gap: 4 },
  formLabel: { fontSize: 12, marginTop: 10, marginBottom: 6, fontWeight: "600" },
  formInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, marginBottom: 4 },
  pill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  regionBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1 },
  saveBtn: { paddingVertical: 14, borderRadius: 12, alignItems: "center", marginTop: 16 },
  saveBtnText: { fontSize: 16, fontWeight: "700" },
});
