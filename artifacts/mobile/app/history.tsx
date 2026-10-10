import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, SafeAreaView } from 'react-native';
import { Stack } from 'expo-router';

// Define the TypeScript types for your data
type Prediction = {
  id: string;
  sport: string;
  match: string;
  prediction: string;
  result: 'win' | 'loss' | 'pending';
  odds: string;
};

type AccuracyData = {
  winRate: number;
  totalSettled: number;
  history: Prediction[];
};

export default function HistoryScreen() {
  const [data, setData] = useState<AccuracyData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      // Replace this with your actual production API URL
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://your-server-ip:8080';
      const response = await fetch(`${apiUrl}/predictions/accuracy`);
      const json = await response.json();
      setData(json);
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }: { item: Prediction }) => {
    const isWin = item.result === 'win';
    
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.sportBadge}>{item.sport.toUpperCase()}</Text>
          <Text style={[styles.resultBadge, isWin ? styles.winBadge : styles.lossBadge]}>
            {isWin ? '✅ WIN' : '❌ LOSS'}
          </Text>
        </View>
        <Text style={styles.matchText}>{item.match}</Text>
        <View style={styles.predictionRow}>
          <Text style={styles.predictionText}>Pick: {item.prediction}</Text>
          <Text style={styles.oddsText}>{item.odds}</Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#00ff00" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: 'Past Results', headerStyle: { backgroundColor: '#121212' }, headerTintColor: '#fff' }} />
      
      {/* Summary Header */}
      {data && (
        <View style={styles.summaryContainer}>
          <Text style={styles.summaryTitle}>Monthly Accuracy</Text>
          <Text style={styles.winRate}>{data.winRate.toFixed(1)}%</Text>
          <Text style={styles.totalText}>{data.totalSettled} Matches Settled</Text>
        </View>
      )}

      {/* History List */}
      <FlatList
        data={data?.history || []}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={<Text style={styles.emptyText}>No settled matches yet.</Text>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#121212' },
  summaryContainer: { alignItems: 'center', padding: 24, backgroundColor: '#1e1e1e', borderBottomWidth: 1, borderColor: '#333' },
  summaryTitle: { color: '#888', fontSize: 16, marginBottom: 8 },
  winRate: { color: '#00ff00', fontSize: 48, fontWeight: 'bold' },
  totalText: { color: '#ccc', fontSize: 14, marginTop: 8 },
  listContainer: { padding: 16 },
  card: { backgroundColor: '#1e1e1e', padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#333' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  sportBadge: { color: '#fff', backgroundColor: '#333', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, fontSize: 12, fontWeight: 'bold' },
  resultBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, fontSize: 12, fontWeight: 'bold', overflow: 'hidden' },
  winBadge: { backgroundColor: 'rgba(0, 255, 0, 0.2)', color: '#00ff00' },
  lossBadge: { backgroundColor: 'rgba(255, 0, 0, 0.2)', color: '#ff4444' },
  matchText: { color: '#fff', fontSize: 16, fontWeight: '600', marginBottom: 12 },
  predictionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  predictionText: { color: '#aaa', fontSize: 14 },
  oddsText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  emptyText: { color: '#888', textAlign: 'center', marginTop: 40, fontSize: 16 },
});