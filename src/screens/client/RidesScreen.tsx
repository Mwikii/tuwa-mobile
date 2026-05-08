import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../services/api';

const statusLabel: Record<string, string> = {
  REQUESTED: 'Requested',
  ACCEPTED: 'Accepted',
  DRIVER_ARRIVING: 'Driver Arriving',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

const statusColor: Record<string, string> = {
  COMPLETED: '#000',
  IN_PROGRESS: '#444',
  CANCELLED: '#bbb',
  REQUESTED: '#999',
  ACCEPTED: '#555',
  DRIVER_ARRIVING: '#333',
};

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString('en-KE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function RidesScreen() {
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadTrips = async () => {
    try {
      const res = await api.get('/api/trips/history');
      setTrips(res.data.trips);
    } catch (e) {
      // silent fail
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadTrips();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadTrips();
  };

  const renderTrip = ({ item }: any) => (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.cardLeft}>
          <Text style={styles.destText} numberOfLines={1}>
            {item.destAddress}
          </Text>
          <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
        </View>
        <View style={[styles.statusBadge, { borderColor: statusColor[item.status] }]}>
          <Text style={[styles.statusText, { color: statusColor[item.status] }]}>
            {statusLabel[item.status]}
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.cardBottom}>
        <View style={styles.metaItem}>
          <Text style={styles.metaLabel}>Distance</Text>
          <Text style={styles.metaValue}>{item.distance} km</Text>
        </View>
        <View style={styles.metaDivider} />
        <View style={styles.metaItem}>
          <Text style={styles.metaLabel}>Fare</Text>
          <Text style={styles.metaValue}>KES {item.fare}</Text>
        </View>
        <View style={styles.metaDivider} />
        <View style={styles.metaItem}>
          <Text style={styles.metaLabel}>Driver</Text>
          <Text style={styles.metaValue} numberOfLines={1}>
            {item.driver?.user?.name ?? '—'}
          </Text>
        </View>
      </View>

      {item.driver?.vehicle && (
        <Text style={styles.plateText}>
          {item.driver.vehicle.color} {item.driver.vehicle.model} · {item.driver.vehicle.plate}
        </Text>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Your Rides</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#000" />
        </View>
      ) : trips.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>🚗</Text>
          <Text style={styles.emptyTitle}>No rides yet</Text>
          <Text style={styles.emptySub}>Your trip history will show up here</Text>
        </View>
      ) : (
        <FlatList
          data={trips}
          keyExtractor={(item) => item.id}
          renderItem={renderTrip}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#000" />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#000',
    letterSpacing: -0.5,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyIcon: { fontSize: 40, marginBottom: 16 },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 6,
  },
  emptySub: { fontSize: 14, color: '#bbb' },
  list: { padding: 16, gap: 12 },
  card: {
    backgroundColor: '#f9f9f9',
    borderRadius: 20,
    padding: 18,
    marginBottom: 4,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  cardLeft: { flex: 1, marginRight: 12 },
  destText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  dateText: { fontSize: 12, color: '#bbb' },
  statusBadge: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
  divider: { height: 1, backgroundColor: '#efefef', marginBottom: 14 },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaItem: { flex: 1, alignItems: 'center' },
  metaLabel: { fontSize: 10, color: '#bbb', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 },
  metaValue: { fontSize: 13, fontWeight: '700', color: '#000' },
  metaDivider: { width: 1, backgroundColor: '#efefef' },
  plateText: {
    fontSize: 11,
    color: '#bbb',
    marginTop: 12,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
});
