import { useRouter } from "expo-router";
import { ArrowLeft, ChevronRight, Search, X } from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AdminTabBar } from "@/components/AdminTabBar";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { api, type AdminUser } from "@/lib/api";

const FILTERS = [
  { id: "all",       label: "All" },
  { id: "premium",   label: "Premium" },
  { id: "free",      label: "Free" },
  { id: "banned",    label: "Banned" },
  { id: "suspended", label: "Susp." },
];

function tierColor(tier: string) {
  if (tier === "premium") return "#FFD700";
  return "#94A3B8";
}

function UserRow({ user, onPress }: { user: AdminUser; onPress: () => void }) {
  const colors = useColors();
  const tColor = tierColor(user.effectiveTier);
  const isBad = user.isBanned || user.isSuspended;
  return (
    <TouchableOpacity
      style={[styles.userRow, { backgroundColor: colors.card, borderColor: isBad ? "#FF4D4D44" : colors.cardBorder }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[styles.avatar, { backgroundColor: `${tColor}22`, borderColor: `${tColor}44` }]}>
        <Text style={{ fontSize: 16 }}>{user.username[0]?.toUpperCase() ?? "?"}</Text>
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>{user.username}</Text>
        <Text style={[styles.userEmail, { color: colors.textMuted }]} numberOfLines={1}>{user.email}</Text>
        <View style={{ flexDirection: "row", gap: 6 }}>
          <View style={[styles.tierPill, { borderColor: `${tColor}55`, backgroundColor: `${tColor}15` }]}>
            <Text style={[styles.tierText, { color: tColor }]}>{user.effectiveTier.toUpperCase()}</Text>
          </View>
          {user.isBanned && <View style={styles.badPill}><Text style={styles.badText}>BANNED</Text></View>}
          {user.isSuspended && !user.isBanned && <View style={[styles.badPill, { backgroundColor: "#FF990015", borderColor: "#FF990055" }]}><Text style={[styles.badText, { color: "#FF9900" }]}>SUSP</Text></View>}
          {user.manualTierOverride && <View style={styles.overridePill}><Text style={styles.overrideText}>OVERRIDE</Text></View>}
        </View>
      </View>
      <View style={{ alignItems: "flex-end", gap: 4 }}>
        <Text style={[styles.joinDate, { color: colors.textMuted }]}>
          {new Date(user.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </Text>
        <ChevronRight size={16} color={colors.textMuted} />
      </View>
    </TouchableOpacity>
  );
}

export default function AdminUsersScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { token } = useAuth();

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const load = useCallback(async (newPage = 1, newFilter = filter, newSearch = search) => {
    if (!token) return;
    setLoading(true);
    try {
      const r = await api.admin.users(token, {
        filter: newFilter !== "all" ? newFilter : undefined,
        search: newSearch || undefined,
        page: newPage,
      });
      if (newPage === 1) setUsers(r.users);
      else setUsers((prev) => [...prev, ...r.users]);
      setHasMore(r.users.length === r.limit);
      setPage(newPage);
    } catch {
      //
    } finally {
      setLoading(false);
    }
  }, [token, filter, search]);

  useEffect(() => { load(1, filter, search); }, [filter]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSearch() { load(1, filter, search); }
  function handleFilter(f: string) { setFilter(f); }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>👥 Users</Text>
      </View>

      <View style={[styles.searchRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Search size={16} color={colors.textMuted} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search email or username…"
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
          autoCapitalize="none"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => { setSearch(""); load(1, filter, ""); }}>
            <X size={15} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.filterScroll, { borderBottomColor: colors.border }]} contentContainerStyle={styles.filterContent}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.id}
            style={[styles.filterPill, {
              backgroundColor: filter === f.id ? colors.cyan : colors.card,
              borderColor: filter === f.id ? colors.cyan : colors.border,
            }]}
            onPress={() => handleFilter(f.id)}
          >
            <Text style={[styles.filterText, { color: filter === f.id ? colors.background : colors.text }]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView style={styles.list} contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 20 }]}>
        {loading && users.length === 0 ? (
          <ActivityIndicator color={colors.cyan} style={{ marginTop: 40 }} />
        ) : users.length === 0 ? (
          <Text style={[styles.empty, { color: colors.textMuted }]}>No users found</Text>
        ) : (
          <>
            {users.map((u) => (
              <UserRow
                key={u.id}
                user={u}
                onPress={() => router.push({ pathname: "/admin/user-detail", params: { id: String(u.id) } })}
              />
            ))}
            {hasMore && (
              <TouchableOpacity style={[styles.loadMore, { borderColor: colors.border }]} onPress={() => load(page + 1)}>
                <Text style={{ color: colors.cyan }}>Load more</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </ScrollView>
      <AdminTabBar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  searchRow: { flexDirection: "row", alignItems: "center", gap: 10, margin: 12, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  searchInput: { flex: 1, fontSize: 14 },
  filterScroll: { borderBottomWidth: 1, maxHeight: 48 },
  filterContent: { paddingHorizontal: 12, paddingVertical: 8, gap: 8, flexDirection: "row", alignItems: "center" },
  filterPill: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  filterText: { fontSize: 12, fontWeight: "600" },
  list: { flex: 1 },
  listContent: { padding: 12, gap: 8 },
  userRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 14, borderWidth: 1 },
  avatar: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  userName: { fontSize: 14, fontWeight: "600" },
  userEmail: { fontSize: 12 },
  tierPill: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, borderWidth: 1 },
  tierText: { fontSize: 9, fontWeight: "700", letterSpacing: 0.4 },
  badPill: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, borderWidth: 1, backgroundColor: "#FF4D4D15", borderColor: "#FF4D4D55" },
  badText: { fontSize: 9, fontWeight: "700", letterSpacing: 0.4, color: "#FF4D4D" },
  overridePill: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, borderWidth: 1, backgroundColor: "#FFD70015", borderColor: "#FFD70055" },
  overrideText: { fontSize: 9, fontWeight: "700", letterSpacing: 0.4, color: "#FFD700" },
  joinDate: { fontSize: 11 },
  empty: { textAlign: "center", marginTop: 60, fontSize: 14 },
  loadMore: { padding: 14, borderRadius: 12, borderWidth: 1, alignItems: "center", marginTop: 8 },
});
