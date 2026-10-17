import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, SafeAreaView, RefreshControl, TouchableOpacity } from 'react-native';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

type Prediction = {
  id: string;
  sport: string;
  match: string;
  prediction: string;
  result: 'win' | 'loss' | 'pending';
  odds: string;
  date?: string;
};

type AccuracyData = {
  winRate: number;
  totalSettled: number;
  history: Prediction[];
};

type FilterType = 'all' | 'win' | 'loss';

export default function HistoryScreen() {
  const [data, setData] = useState<AccuracyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');

  const fetchHistory = async () => {
    try {
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://your-server-ip:8080';
      
      const [json] = await Promise.all([
        fetch(`${apiUrl}/api/predictions/accuracy`)
          .then((res) => (res.ok ? res.json() : null))
          .catch(() => null),
        new Promise((resolve) => setTimeout(resolve, 1500))
      ]);

      setData(json && Array.isArray(json.history) ? json : null);
    } catch (error) {
      setData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchHistory();
  }, []);

  const filteredHistory = data?.history?.filter((item) => {
    if (filter === 'all') return true;
    return item.result === filter;
  }) || [];

  const renderItem = ({ item }: { item: Prediction }) => {
    const isWin = item.result === 'win';
    
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.sportTag}>
            <Text style={styles.sportBadge}>{item.sport.toUpperCase()}</Text>
            {item.date && <Text style={styles.dateText}>{item.date}</Text>}
          </View>
          <Text style={[styles.resultBadge, isWin ? styles.winBadge : styles.lossBadge]}>
            {isWin ? '✅ WON' : '❌ LOST'}
          </Text>
        </View>
        <Text style={styles.matchText}>{item.match}</Text>
        <View style={styles.predictionRow}>
          <Text style={styles.predictionText}>Pick: <Text style={styles.pickHighlight}>{item.prediction}</Text></Text>
          <Text style={styles.oddsText}>{item.odds}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'Past Results', 
          headerShown: true,
          headerStyle: { backgroundColor: '#0B1014' }, 
          headerTintColor: '#fff',
          headerShadowVisible: false,
          headerLeft: () => (
            <TouchableOpacity 
              onPress={() => {
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace('/');
                }
              }}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
          ),
        }} 
      />
      
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#00D09E" />
        </View>
      ) : (
        <>
          {data && data.history && data.history.length > 0 && (
            <>
              <View style={styles.summaryContainer}>
                <Text style={styles.summaryTitle}>30-Day Performance</Text>
                <Text style={styles.winRate}>{Number(data.winRate ?? 0).toFixed(1)}%</Text>
                <Text style={styles.totalText}>{data.totalSettled} Matches Settled</Text>
              </View>

              <View style={styles.filterContainer}>
                {(['all', 'win', 'loss'] as FilterType[]).map((f) => (
                  <TouchableOpacity 
                    key={f} 
                    style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
                    onPress={() => setFilter(f)}
                  >
                    <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
                      {f.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          <FlatList
            data={filteredHistory}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContainer}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00D09E" />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No settled matches found</Text>
                <Text style={styles.pullToRefreshText}>Pull to refresh</Text>
              </View>
            }
          />
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B1014' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0B1014' },
  backButton: { padding: 8, marginLeft: -8 },
  summaryContainer: { alignItems: 'center', padding: 24, backgroundColor: '#131A22', borderBottomWidth: 1, borderColor: '#1F2937' },
  summaryTitle: { color: '#9CA3AF', fontSize: 14, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
  winRate: { color: '#00D09E', fontSize: 48, fontWeight: '800' },
  totalText: { color: '#9CA3AF', fontSize: 14, marginTop: 8 },
  filterContainer: { flexDirection: 'row', padding: 16, justifyContent: 'center', gap: 12 },
  filterBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: '#131A22', borderWidth: 1, borderColor: '#1F2937' },
  filterBtnActive: { backgroundColor: '#00D09E', borderColor: '#00D09E' },
  filterText: { color: '#9CA3AF', fontSize: 12, fontWeight: 'bold' },
  filterTextActive: { color: '#0B1014' },
  listContainer: { padding: 16, paddingBottom: 40, flexGrow: 1 },
  card: { backgroundColor: '#131A22', padding: 16, borderRadius: 16, marginBottom: 16, borderWidth: 1, borderColor: '#1F2937' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sportTag: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sportBadge: { color: '#0B1014', backgroundColor: '#F3F4F6', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, fontSize: 10, fontWeight: '900' },
  dateText: { color: '#6B7280', fontSize: 12 },
  resultBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, fontSize: 11, fontWeight: 'bold', overflow: 'hidden' },
  winBadge: { backgroundColor: 'rgba(0, 208, 158, 0.1)', color: '#00D09E' },
  lossBadge: { backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#EF4444' },
  matchText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', marginBottom: 14, letterSpacing: 0.3 },
  predictionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#0F151B', padding: 12, borderRadius: 8 },
  predictionText: { color: '#9CA3AF', fontSize: 13 },
  pickHighlight: { color: '#FFFFFF', fontWeight: 'bold' },
  oddsText: { color: '#00D09E', fontSize: 14, fontWeight: '800' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 80 },
  emptyText: { color: '#6B7280', textAlign: 'center', fontSize: 15 },
  pullToRefreshText: { color: '#00D09E', fontWeight: 'bold', marginTop: 12 },
});