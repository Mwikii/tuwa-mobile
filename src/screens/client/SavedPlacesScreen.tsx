import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Alert,
  TextInput,
  ActivityIndicator,
  Modal,
} from 'react-native';
import api from '../../services/api';

const GOOGLE_MAPS_KEY = 'AIzaSyBZfHuQrKFSQwcXDvWhmEXEVnukhiToCC4';

export default function SavedPlacesScreen({ navigation }: any) {
  const [home, setHome] = useState<any>(null);
  const [work, setWork] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'home' | 'work' | 'custom'>('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    loadSavedPlaces();
  }, []);

  const loadSavedPlaces = async () => {
    try {
      const res = await api.get('/api/location/saved-places');
      const places = res.data.places;
      setHome(places.find((p: any) => p.type === 'HOME'));
      setWork(places.find((p: any) => p.type === 'WORK'));
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const searchPlaces = async (text: string) => {
    setSearchQuery(text);
    if (text.length < 3) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(text)}&location=-1.2921,36.8219&radius=30000&components=country:ke&key=${GOOGLE_MAPS_KEY}`
      );
      const data = await res.json();
      setSearchResults(data.predictions || []);
    } catch (error) {
    } finally {
      setSearching(false);
    }
  };

  const selectPlace = async (place: any) => {
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(place.description)}&key=${GOOGLE_MAPS_KEY}`
      );
      const data = await res.json();
      const coords = data.results[0].geometry.location;

      await api.post('/api/location/saved-places', {
        type: modalType.toUpperCase(),
        address: place.description,
        lat: coords.lat,
        lng: coords.lng,
      });

      setModalVisible(false);
      setSearchQuery('');
      setSearchResults([]);
      loadSavedPlaces();
    } catch (error) {
      Alert.alert('Error', 'Failed to save place');
    }
  };

  const openModal = (type: 'home' | 'work' | 'custom') => {
    setModalType(type);
    setModalVisible(true);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Saved Places</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#000" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.menuGroup}>
            <TouchableOpacity style={styles.placeItem} onPress={() => openModal('home')}>
              <View style={styles.placeIcon}>
                <Text style={styles.placeIconText}>🏠</Text>
              </View>
              <View style={styles.placeInfo}>
                <Text style={styles.placeLabel}>Home</Text>
                <Text style={styles.placeAddress} numberOfLines={1}>
                  {home?.address || 'Add home address'}
                </Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.placeItem} onPress={() => openModal('work')}>
              <View style={styles.placeIcon}>
                <Text style={styles.placeIconText}>💼</Text>
              </View>
              <View style={styles.placeInfo}>
                <Text style={styles.placeLabel}>Work</Text>
                <Text style={styles.placeAddress} numberOfLines={1}>
                  {work?.address || 'Add work address'}
                </Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {modalType === 'home' ? 'Set Home' : modalType === 'work' ? 'Set Work' : 'Add Place'}
            </Text>
            <TouchableOpacity onPress={() => { setModalVisible(false); setSearchQuery(''); setSearchResults([]); }}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalSearch}>
            <TextInput
              style={styles.modalInput}
              placeholder="Search for a location"
              placeholderTextColor="#bbb"
              value={searchQuery}
              onChangeText={searchPlaces}
              autoFocus
            />
            {searching && <ActivityIndicator color="#000" style={{ marginTop: 8 }} />}
          </View>

          {searchResults.map((item) => (
            <TouchableOpacity
              key={item.place_id}
              style={styles.resultItem}
              onPress={() => selectPlace(item)}
            >
              <Text style={styles.resultMain}>{item.structured_formatting.main_text}</Text>
              <Text style={styles.resultSub}>{item.structured_formatting.secondary_text}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f7f7' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  backText: { fontSize: 24, color: '#000' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#000' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 16 },
  menuGroup: {
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
  },
  placeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  placeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  placeIconText: { fontSize: 18 },
  placeInfo: { flex: 1 },
  placeLabel: { fontSize: 15, fontWeight: '700', color: '#000' },
  placeAddress: { fontSize: 13, color: '#bbb', marginTop: 2 },
  chevron: { fontSize: 20, color: '#ccc' },
  modal: { flex: 1, backgroundColor: '#fff', padding: 24 },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    marginBottom: 24,
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#000' },
  modalClose: { fontSize: 18, color: '#999' },
  modalSearch: { marginBottom: 16 },
  modalInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 14,
    padding: 16,
    fontSize: 16,
    color: '#000',
  },
  resultItem: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  resultMain: { fontSize: 15, fontWeight: '600', color: '#000' },
  resultSub: { fontSize: 12, color: '#bbb', marginTop: 2 },
});
