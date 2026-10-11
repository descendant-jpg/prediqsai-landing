import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, SafeAreaView, RefreshControl, TouchableOpacity, Platform } from 'react-native';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons'; // Standard premium icons included in Expo

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
  const [error, setError] = useState<string | null>(null); // Added error handling

  const fetchHistory = async () => {
    try {
      setError(null);
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://your-server-ip:8080';
      const response = await fetch(`${apiUrl}/predictions/accuracy`);
      
      if (!response.ok) throw new Error('Network response was not ok');
      
      const json = await response.json();
      setData(json);
    } catch (err) {
      console.error('Error fetching history:', err);
      setError('Unable to load past results. Please try again.');
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

  // Safe data extraction
  const filteredHistory = data?.history?.filter(item => {
    if (filter === 'all') return true;
    return item.result === filter;
  }) || [];

  const renderItem = ({ item }: { item: Prediction }) => {
    const isWin = item.result === 'win';
    
    // Dynamic styling based on result
    const resultColor = isWin ? '#00D09E' : '#EF4444';
    const resultBg = isWin ? 'rgba(0, 208, 158, 0.1)' : 'rgba(239, 68, 68, 0.1)';
    const resultIcon = isWin ? 'checkmark-circle' : 'close-circle';
    const resultText = isWin ? 'WON' : 'LOST';

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.sportTag}>
            <Text style={styles.sportBadge}>{item.sport.toUpperCase()}</Text>
            {item.date && <Text style={styles.dateText}>{item.date}</Text>}
          </View>
          <View style={[styles.resultBadgeContainer, { backgroundColor: resultBg }]}>
            <Ionicons name={resultIcon} size={14} color={resultColor} style={{ marginRight: 4 }} />
            <Text style={[styles.resultBadgeText, { color: resultColor }]}>{resultText}</Text>
          </View>
        </View>
        
        <Text style={styles.matchText}>{item.match}</Text>
        
        <View style={styles.predictionRow}>
          <View style={styles.pickContainer}>
            <Ionicons name="analytics" size={14} color="#9CA3AF" style={{ marginRight: 6 }} />
            <Text style={styles.predictionText}>Pick: <Text style={styles.pickHighlight}>{item.prediction}</Text></Text>
          </View>
          <Text style={styles.oddsText}>{item.odds}</Text>
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="document-text-outline" size={64} color="#1F2937" />
      <Text style={styles.emptyTitle}>No Results Found</Text>
      <Text style={styles.emptyText}>
        No {filter !== 'all' ? filter : 'settled'} matches are available right now.
      </Text>
    </View>
  );

  // Full-screen loading state
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#00D09E" />
      </View>
    );
  }

  // Full-screen error state with retry button
  if (error && !data) {
    return (
      <View style={styles.center}>
        <Ionicons name="cloud-offline-outline" size={64} color="#1F2937" style={{ marginBottom: 16 }} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={fetchHistory}>
          <Text style={styles.retryBtnText}>Tap to Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* 
        BULLETPROOF HEADER: 
        We force 'headerShown: true' and inject a custom Left button.
        This guarantees the back button ALWAYS shows, even on web reload.
      */}
      <Stack.Screen 
        options={{ 
          title: 'Past Results', 
          headerShown: true, 
          headerStyle: { backgroundColor: '#0B1014' }, 
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: '700', fontSize: 18 },
          headerShadowVisible: false,
          headerLeft: () => (
            <TouchableOpacity 
              activeOpacity={0.7}
              style={styles.headerBackBtn}
              onPress={() => {
                // If there's a screen to go back to, go back. 
                // If they refreshed the web browser (no history), safely send them home!
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace('/'); 
                }
              }}
            >
              <Ionicons name="chevron-back" size={28} color="#00D09E" />
              {Platform.OS === 'ios' && <Text style={styles.headerBackText}>Back</Text>}
            </TouchableOpacity>
          ),
        }} 
      />
      
      {/* Premium Summary Widget */}
      {data && (
        <View style={styles.summaryContainer}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>30-Day Performance</Text>
            <View style={styles.winRateContainer}>
              <Text style={styles.winRate}>{data.winRate.toFixed(1)}%</Text>
              <Ionicons name="trending-up" size={24} color="#00D09E" style={{ marginLeft: 8, marginTop: 8 }} />
            </View>
            <Text style={styles.totalText}>{data.totalSettled} Matches Settled</Text>
          </View>
        </View>
      )}

      {/* Interactive Filters */}
      <View style={styles.filterContainer}>
        {(['all', 'win', 'loss'] as FilterType[]).map((f) => (
          <TouchableOpacity 
            key={f} 
            activeOpacity={0.7}
            style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* History List */}
      <FlatList
        data={filteredHistory}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00D09E" colors={['#00D09E']} />
        }
        ListEmptyComponent={renderEmptyState}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B1014' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0B1014', padding: 20 },
  
  // Custom Header Styles
  headerBackBtn: { flexDirection: 'row', alignItems: 'center', paddingRight: 20, paddingLeft: Platform.OS === 'ios' ? 0 : 8, paddingVertical: 8, marginLeft: -8 },
  headerBackText: { color: '#00D09E', fontSize: 17, marginLeft: -4 },
  
  // Premium Summary Widget
  summaryContainer: { padding: 16, backgroundColor: '#0B1014' },
  summaryCard: { alignItems: 'center', padding: 24, backgroundColor: '#131A22', borderRadius: 20, borderWidth: 1, borderColor: '#1F2937', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 5 },
  summaryTitle: { color: '#9CA3AF', fontSize: 13, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1.2, fontWeight: '600' },
  winRateContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  winRate: { color: '#00D09E', fontSize: 56, fontWeight: '900', letterSpacing: -1 },
  totalText: { color: '#6B7280', fontSize: 14, marginTop: 4, fontWeight: '500' },
  
  // Filters
  filterContainer: { flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 16, justifyContent: 'center', gap: 12 },
  filterBtn: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 100, backgroundColor: '#131A22', borderWidth: 1, borderColor: '#1F2937' },
  filterBtnActive: { backgroundColor: '#00D09E', borderColor: '#00D09E', shadowColor: '#00D09E', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 4 },
  filterText: { color: '#9CA3AF', fontSize: 13, fontWeight: '700', letterSpacing: 0.5 },
  filterTextActive: { color: '#0B1014', fontWeight: '800' },
  
  // List & Cards
  listContainer: { paddingHorizontal: 16, paddingBottom: 40, flexGrow: 1 },
  card: { backgroundColor: '#131A22', padding: 18, borderRadius: 20, marginBottom: 16, borderWidth: 1, borderColor: '#1F2937' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sportTag: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sportBadge: { color: '#0B1014', backgroundColor: '#F3F4F6', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  dateText: { color: '#6B7280', fontSize: 12, fontWeight: '500' },
  
  // Custom Result Badges
  resultBadgeContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  resultBadgeText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  
  matchText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', marginBottom: 16, letterSpacing: 0.3, lineHeight: 22 },
  
  predictionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#0A0E12', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#1F2937' },
  pickContainer: { flexDirection: 'row', alignItems: 'center' },
  predictionText: { color: '#9CA3AF', fontSize: 14, fontWeight: '500' },
  pickHighlight: { color: '#FFFFFF', fontWeight: '800' },
  oddsText: { color: '#00D09E', fontSize: 15, fontWeight: '900' },
  
  // Empty State
  emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 60, padding: 20 },
  emptyTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '700', marginTop: 16, marginBottom: 8 },
  emptyText: { color: '#6B7280', textAlign: 'center', fontSize: 14, lineHeight: 20, paddingHorizontal: 20 },
  
  // Error State
  errorText: { color: '#EF4444', textAlign: 'center', fontSize: 15, marginBottom: 20, fontWeight: '500', paddingHorizontal: 20 },
  retryBtn: { backgroundColor: '#1F2937', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 100 },
  retryBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
});