import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const { height } = Dimensions.get('window');
const GOOGLE_MAPS_API_KEY = 'AIzaSyBZfHuQrKFSQwcXDvWhmEXEVnukhiToCC4';

export default function ClientHomeScreen() {
  const { user } = useAuth();
  const mapRef = useRef<MapView>(null);

  const [location, setLocation] = useState<any>(null);
  const [destination, setDestination] = useState('');
  const [destCoords, setDestCoords] = useState<any>(null);
  const [fareEstimate, setFareEstimate] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [tripId, setTripId] = useState<string | null>(null);
  const [tripStatus, setTripStatus] = useState<string | null>(null);

  useEffect(() => {
    getCurrentLocation();
  }, []);

  const getCurrentLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission denied', 'Tuwa needs location access to work');
      return;
    }
    const loc = await Location.getCurrentPositionAsync({});
    setLocation(loc.coords);
  };

  const searchDestination = async () => {
    if (!destination) return;
    setLoading(true);
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(destination + ', Nairobi')}&key=${GOOGLE_MAPS_API_KEY}`
      );
      const data = await response.json();
      if (data.results.length > 0) {
        const coords = data.results[0].geometry.location;
        setDestCoords({ latitude: coords.lat, longitude: coords.lng });

        const fareRes = await api.post('/api/location/fare-estimate', {
          pickupLat: location.latitude,
          pickupLng: location.longitude,
          destLat: coords.lat,
          destLng: coords.lng,
        });
        setFareEstimate(fareRes.data);

        mapRef.current?.fitToCoordinates(
          [
            { latitude: location.latitude, longitude: location.longitude },
            { latitude: coords.lat, longitude: coords.lng },
          ],
          { edgePadding: { top: 80, right: 80, bottom: 300, left: 80 }, animated: true }
        );
      } else {
        Alert.alert('Not found', 'Could not find that location in Nairobi');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to search location');
    } finally {
      setLoading(false);
    }
  };

  const requestTrip = async () => {
    if (!destCoords || !fareEstimate) return;
    setRequesting(true);
    try {
      const res = await api.post('/api/trips/request', {
        pickupLat: location.latitude,
        pickupLng: location.longitude,
        pickupAddress: 'My Location',
        destLat: destCoords.latitude,
        destLng: destCoords.longitude,
        destAddress: destination,
      });
      setTripId(res.data.tripId);
      setTripStatus('REQUESTED');
    } catch (error) {
      Alert.alert('Error', 'Failed to request trip');
    } finally {
      setRequesting(false);
    }
  };

  const cancelSearch = () => {
    setDestination('');
    setDestCoords(null);
    setFareEstimate(null);
    setTripId(null);
    setTripStatus(null);
  };

  return (
    <View style={styles.container}>
      {location ? (
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={PROVIDER_GOOGLE}
          initialRegion={{
            latitude: location.latitude,
            longitude: location.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
          showsUserLocation
          showsMyLocationButton
        >
          {destCoords && (
            <Marker
              coordinate={destCoords}
              title="Destination"
              pinColor="black"
            />
          )}
        </MapView>
      ) : (
        <View style={styles.mapLoading}>
          <ActivityIndicator size="large" color="#000" />
          <Text style={styles.mapLoadingText}>Getting your location...</Text>
        </View>
      )}

      <View style={styles.sheet}>
        {!tripId ? (
          <>
            <Text style={styles.greeting}>Hello, {user?.name.split(' ')[0]}</Text>
            <Text style={styles.label}>Where to?</Text>

            <View style={styles.searchRow}>
              <TextInput
                style={styles.searchInput}
                placeholder="Enter destination"
                placeholderTextColor="#999"
                value={destination}
                onChangeText={setDestination}
                onSubmitEditing={searchDestination}
                returnKeyType="search"
              />
              <TouchableOpacity style={styles.searchBtn} onPress={searchDestination}>
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.searchBtnText}>Go</Text>
                )}
              </TouchableOpacity>
            </View>

            {fareEstimate && (
              <View style={styles.fareCard}>
                <View style={styles.fareRow}>
                  <Text style={styles.fareLabel}>Distance</Text>
                  <Text style={styles.fareValue}>{fareEstimate.distanceKm} km</Text>
                </View>
                <View style={styles.fareRow}>
                  <Text style={styles.fareLabel}>Estimated fare</Text>
                  <Text style={styles.fareValue}>
                    KES {fareEstimate.estimatedFare.low} - {fareEstimate.estimatedFare.high}
                  </Text>
                </View>

                <View style={styles.actionRow}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={cancelSearch}>
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.requestBtn}
                    onPress={requestTrip}
                    disabled={requesting}
                  >
                    {requesting ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.requestBtnText}>Request Ride</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </>
        ) : (
          <View style={styles.tripStatus}>
            <Text style={styles.tripStatusTitle}>
              {tripStatus === 'REQUESTED' && 'Looking for a driver...'}
              {tripStatus === 'ACCEPTED' && 'Driver is on the way!'}
              {tripStatus === 'DRIVER_ARRIVING' && 'Driver is arriving!'}
              {tripStatus === 'IN_PROGRESS' && 'Trip in progress'}
              {tripStatus === 'COMPLETED' && 'Trip completed!'}
            </Text>
            <Text style={styles.tripStatusSub}>Trip ID: {tripId?.slice(0, 8)}...</Text>
            {tripStatus === 'REQUESTED' && (
              <ActivityIndicator color="#000" style={{ marginTop: 16 }} />
            )}
            {tripStatus === 'COMPLETED' && (
              <TouchableOpacity style={styles.requestBtn} onPress={cancelSearch}>
                <Text style={styles.requestBtnText}>Done</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  map: { width: '100%', height: height * 0.6 },
  mapLoading: {
    width: '100%',
    height: height * 0.6,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  mapLoadingText: { marginTop: 12, color: '#999', fontSize: 14 },
  sheet: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -24,
    padding: 24,
  },
  greeting: { fontSize: 13, color: '#999', marginBottom: 4 },
  label: { fontSize: 22, fontWeight: '800', color: '#000', marginBottom: 16 },
  searchRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#000',
  },
  searchBtn: {
    backgroundColor: '#000',
    borderRadius: 12,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  searchBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  fareCard: {
    backgroundColor: '#f5f5f5',
    borderRadius: 16,
    padding: 16,
  },
  fareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  fareLabel: { color: '#666', fontSize: 14 },
  fareValue: { color: '#000', fontWeight: '600', fontSize: 14 },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  cancelBtnText: { color: '#000', fontWeight: '600' },
  requestBtn: {
    flex: 1,
    backgroundColor: '#000',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  requestBtnText: { color: '#fff', fontWeight: '700' },
  tripStatus: { alignItems: 'center', paddingTop: 16 },
  tripStatusTitle: { fontSize: 20, fontWeight: '800', color: '#000', marginBottom: 8 },
  tripStatusSub: { fontSize: 13, color: '#999' },
});
