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
  StatusBar,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Linking,
  Keyboard,
  Animated,
  Easing,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import Svg, { Circle as SvgCircle, Rect } from 'react-native-svg';
import * as Location from 'expo-location';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import decode from '@mapbox/polyline';



// === LOCATION DOT ===
// Container: 80×80. Rings absolutely centered via (80 - ringSize) / 2.
function PulsingBlueDot() {
  const ring1Opacity = useRef(new Animated.Value(0.5)).current;
  const ring2Opacity = useRef(new Animated.Value(0.25)).current;

  useEffect(() => {
    const loop = (anim: Animated.Value, startOpacity: number, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, { toValue: startOpacity, duration: 0, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration: 1600, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        ])
      );
    const l1 = loop(ring1Opacity, 0.5, 0);
    const l2 = loop(ring2Opacity, 0.25, 800);
    l1.start();
    l2.start();
    return () => { l1.stop(); l2.stop(); };
  }, []);

  return (
    // 80×80 container — rings use explicit top/left so Android centers them perfectly
    <View style={{ width: 80, height: 80 }}>
      {/* Large ring 66×66 → top/left = (80-66)/2 = 7 */}
      <Animated.View style={{
        position: 'absolute', top: 7, left: 7,
        width: 66, height: 66, borderRadius: 33,
        backgroundColor: '#4285F4',
        opacity: ring1Opacity,
      }} />
      {/* Medium ring 46×46 → top/left = (80-46)/2 = 17 */}
      <Animated.View style={{
        position: 'absolute', top: 17, left: 17,
        width: 46, height: 46, borderRadius: 23,
        backgroundColor: '#4285F4',
        opacity: ring2Opacity,
      }} />
      {/* Core dot 24×24 → top/left = (80-24)/2 = 28 */}
      <View style={{
        position: 'absolute', top: 28, left: 28,
        width: 24, height: 24, borderRadius: 12,
        backgroundColor: '#fff',
        justifyContent: 'center', alignItems: 'center',
        elevation: 6,
      }}>
        <View style={{
          width: 14, height: 14, borderRadius: 7,
          backgroundColor: '#4285F4',
        }} />
      </View>
    </View>
  );
}

// === PICKUP PIN (white circle, dark border + dot) ===
function PickupPin() {
  return (
    <View style={{
      width: 36, height: 36, borderRadius: 18,
      backgroundColor: '#fff',
      borderWidth: 3, borderColor: '#111',
      justifyContent: 'center', alignItems: 'center',
      elevation: 8,
      shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3, shadowRadius: 4,
    }}>
      <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#111' }} />
    </View>
  );
}

// === DESTINATION PIN (white square, dark border + square dot) ===
function DestPin() {
  return (
    <View style={{
      width: 36, height: 36, borderRadius: 4,
      backgroundColor: '#fff',
      borderWidth: 3, borderColor: '#111',
      justifyContent: 'center', alignItems: 'center',
      elevation: 8,
      shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3, shadowRadius: 4,
    }}>
      <View style={{ width: 12, height: 12, borderRadius: 1, backgroundColor: '#111' }} />
    </View>
  );
}

const { height } = Dimensions.get('window');
const GOOGLE_MAPS_KEY = 'AIzaSyBZfHuQrKFSQwcXDvWhmEXEVnukhiToCC4';

const NAIROBI_REGION = {
  latitude: -1.2921,
  longitude: 36.8219,
  latitudeDelta: 0.035,
  longitudeDelta: 0.035,
};

const getTierLow = (tier: any) => tier?.low ?? tier?.estimatedFare?.low ?? tier?.exact ?? 0;
const getTierHigh = (tier: any) => tier?.high ?? tier?.estimatedFare?.high ?? tier?.exact ?? 0;
const getTierMarketPrice = (tier: any) => tier?.marketPrice ?? getTierHigh(tier);
const getTierSavings = (tier: any) => Math.max(getTierMarketPrice(tier) - getTierLow(tier), 0);

export default function ClientHomeScreen() {
  const { user, logout } = useAuth();
  const mapRef = useRef<MapView>(null);
  const autocompleteTimer = useRef<any>(null);
  const sessionToken = useRef(`${Date.now()}`);
  const locationWatcher = useRef<any>(null);

  const [location, setLocation] = useState<any>(null);
  const [heading, setHeading] = useState<number>(0);
  const [destination, setDestination] = useState('');
  const [destCoords, setDestCoords] = useState<any>(null);
  const [tiers, setTiers] = useState<any[]>([]);
  const [selectedTier, setSelectedTier] = useState<any>(null);
  const [routeCoords, setRouteCoords] = useState<any[]>([]);
  const [autocompleteResults, setAutocompleteResults] = useState<any[]>([]);
  const [autocompleteError, setAutocompleteError] = useState('');
  const [searchHistory, setSearchHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [sheetCollapsed, setSheetCollapsed] = useState(false);
  const [tripId, setTripId] = useState<string | null>(null);
  const [tripStatus, setTripStatus] = useState<string | null>(null);
  const [driver, setDriver] = useState<any>(null);

  useEffect(() => {
    getCurrentLocation();
    loadSearchHistory();

    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, (e) => {
      setKeyboardOpen(true);
      setKeyboardHeight(e.endCoordinates.height);
      setSheetCollapsed(false);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardOpen(false);
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
      if (autocompleteTimer.current) clearTimeout(autocompleteTimer.current);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (locationWatcher.current) {
        locationWatcher.current.remove();
      }
    };
  }, []);

  const animateToUser = (coords: any) => {
    mapRef.current?.animateToRegion(
      {
        latitude: coords.latitude,
        longitude: coords.longitude,
        latitudeDelta: 0.035,
        longitudeDelta: 0.035,
      },
      450
    );
  };

  const collapseSheetForMap = () => {
    Keyboard.dismiss();
    setSheetCollapsed(true);
  };

  const recenterMap = () => {
    if (location) {
      animateToUser(location);
    }
    setSheetCollapsed(true);
  };

  const getCurrentLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission denied', 'Tuwa needs location access to work');
      return;
    }

    const loc = await Location.getCurrentPositionAsync({});
    setLocation(loc.coords);
    animateToUser(loc.coords);

    if (locationWatcher.current) {
      locationWatcher.current.remove();
    }

    locationWatcher.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 2000,
        distanceInterval: 5,
      },
      (newLoc) => {
        setLocation(newLoc.coords);
        if (newLoc.coords.heading !== null && newLoc.coords.heading >= 0) {
          setHeading(newLoc.coords.heading);
        }
      }
    );
  };

  const loadSearchHistory = async () => {
    try {
      const res = await api.get('/api/location/history');
      setSearchHistory(res.data.history || []);
    } catch (error) {}
  };

  const handleDestinationChange = (text: string) => {
    setDestination(text);
    setAutocompleteError('');
    if (autocompleteTimer.current) clearTimeout(autocompleteTimer.current);

    if (text.trim().length < 3) {
      setAutocompleteResults([]);
      return;
    }

    autocompleteTimer.current = setTimeout(() => {
      fetchAutocomplete(text.trim());
    }, 300);
  };

  const fetchAutocomplete = async (text: string) => {
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
          text
        )}&location=-1.2921,36.8219&radius=50000&components=country:ke&sessiontoken=${sessionToken.current}&key=${GOOGLE_MAPS_KEY}`
      );
      const data = await res.json();

      if (data.status === 'OK') {
        setAutocompleteResults(data.predictions || []);
        setAutocompleteError('');
        return;
      }

      setAutocompleteResults([]);
      if (data.status !== 'ZERO_RESULTS') {
        setAutocompleteError(data.error_message || data.status || 'Places search unavailable');
      }
    } catch (error) {
      setAutocompleteResults([]);
      setAutocompleteError('Places search could not connect');
    }
  };

  const getPlaceDetails = async (placeId: string) => {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=geometry,formatted_address,name&sessiontoken=${sessionToken.current}&key=${GOOGLE_MAPS_KEY}`
    );
    const data = await res.json();

    if (data.status !== 'OK') {
      throw new Error(data.error_message || data.status || 'Place details failed');
    }

    return data.result;
  };

  const selectPlace = async (place: any) => {
    const label = place.description;
    setDestination(label);
    setAutocompleteResults([]);
    setAutocompleteError('');
    Keyboard.dismiss();

    try {
      const details = await getPlaceDetails(place.place_id);
      const coords = details.geometry.location;
      await searchDestination(details.formatted_address || label, {
        latitude: coords.lat,
        longitude: coords.lng,
      });
      sessionToken.current = `${Date.now()}`;
    } catch (error: any) {
      setAutocompleteError(error.message);
      await searchDestination(label);
    }
  };

  const searchDestination = async (addr?: string, knownCoords?: any) => {
    const query = addr || destination;
    if (!query || !location) return;

    setLoading(true);
    try {
      let coords: { lat: number; lng: number };

      if (knownCoords) {
        coords = { lat: knownCoords.latitude, lng: knownCoords.longitude };
      } else {
        const geoRes = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
            query
          )}&components=country:KE&key=${GOOGLE_MAPS_KEY}`
        );
        const geoData = await geoRes.json();

        if (geoData.status !== 'OK' || !geoData.results.length) {
          Alert.alert('Not found', geoData.error_message || 'Could not find that location');
          return;
        }
        coords = geoData.results[0].geometry.location;
      }

      setDestination(query);
      setDestCoords({ latitude: coords.lat, longitude: coords.lng });

      const fareRes = await api.post('/api/location/fare-estimate', {
        pickupLat: location.latitude,
        pickupLng: location.longitude,
        destLat: coords.lat,
        destLng: coords.lng,
      });
      const fareTiers = (fareRes.data.tiers || []).filter(Boolean);
      setTiers(fareTiers);
      setSelectedTier(fareTiers.find((tier: any) => tier.type === 'CAR') || fareTiers[0]);

      const routeRes = await fetch(
        `https://maps.googleapis.com/maps/api/directions/json?origin=${location.latitude},${location.longitude}&destination=${coords.lat},${coords.lng}&key=${GOOGLE_MAPS_KEY}`
      );
      const routeData = await routeRes.json();
      if (routeData.routes.length > 0) {
        const points = decode.decode(routeData.routes[0].overview_polyline.points);
        setRouteCoords(points.map((p: any) => ({ latitude: p[0], longitude: p[1] })));
      } else {
        setRouteCoords([]);
      }

      mapRef.current?.fitToCoordinates(
        [
          { latitude: location.latitude, longitude: location.longitude },
          { latitude: coords.lat, longitude: coords.lng },
        ],
        {
          edgePadding: { top: 90, right: 70, bottom: keyboardOpen ? 320 : 410, left: 70 },
          animated: true,
        }
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to search location');
    } finally {
      setLoading(false);
    }
  };

  const requestTrip = async () => {
    if (!selectedTier || !destCoords || !location) return;
    setRequesting(true);
    try {
      const res = await api.post('/api/trips/request', {
        pickupLat: location.latitude,
        pickupLng: location.longitude,
        pickupAddress: 'My Location',
        destLat: destCoords.latitude,
        destLng: destCoords.longitude,
        destAddress: destination,
        vehicleType: selectedTier.type,
        fare: selectedTier.exact ?? getTierLow(selectedTier),
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
    setTiers([]);
    setSelectedTier(null);
    setRouteCoords([]);
    setAutocompleteResults([]);
    setAutocompleteError('');
    setTripId(null);
    setTripStatus(null);
    setDriver(null);
    loadSearchHistory();
  };

  const shareTrip = () => {
    const msg = `I'm on my way! Tracking my Tuwa trip.\nTrip ID: ${tripId?.slice(0, 8).toUpperCase()}\nFrom: My Location\nTo: ${destination}`;
    Linking.openURL(`whatsapp://send?text=${encodeURIComponent(msg)}`);
  };

  const callDriver = () => {
    if (driver?.phone) {
      Linking.openURL(`tel:${driver.phone}`);
    }
  };

  const getTripStatusText = () => {
    switch (tripStatus) {
      case 'REQUESTED': return 'Finding your driver...';
      case 'ACCEPTED': return 'Driver is on the way';
      case 'DRIVER_ARRIVING': return 'Driver is arriving';
      case 'IN_PROGRESS': return 'Trip in progress';
      case 'COMPLETED': return 'You have arrived';
      default: return '';
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={NAIROBI_REGION}
        mapType="standard"
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsBuildings
        showsPointsOfInterest
        loadingEnabled
        moveOnMarkerPress={false}
        onPress={collapseSheetForMap}
        onPanDrag={collapseSheetForMap}
      >
        {false && routeCoords.length > 0 && (
          <>
            <Polyline
              coordinates={routeCoords}
              strokeColor="rgba(0,0,0,0.3)"
              strokeWidth={8}
              lineCap="round"
              lineJoin="round"
              zIndex={1}
            />
            <Polyline
              coordinates={routeCoords}
              strokeColor="#000"
              strokeWidth={5}
              lineCap="round"
              lineJoin="round"
              zIndex={2}
            />
          </>
        )}

        {/* Custom location marker */}
        {location && (
          <Marker
            coordinate={{
              latitude: location.latitude,
              longitude: location.longitude,
            }}
            anchor={{ x: 0.5, y: 0.5 }}
            flat
            rotation={heading}
            zIndex={30}
            tracksViewChanges
          >
            <View collapsable={false} style={styles.locationSvgMarker}>
              <Svg width={40} height={40} viewBox="0 0 40 40">
                {/* Outer pulse ring */}
                <SvgCircle
                  cx={20}
                  cy={20}
                  r={18}
                  fill="rgba(0,0,0,0.08)"
                />
                {/* White border */}
                <SvgCircle
                  cx={20}
                  cy={20}
                  r={10}
                  fill="white"
                />
                {/* Black center dot */}
                <SvgCircle
                  cx={20}
                  cy={20}
                  r={7}
                  fill="black"
                />
              </Svg>
            </View>
          </Marker>
        )}

        {/* Destination pin — shown once destCoords is set */}
        {destCoords && (
          <Marker
            coordinate={destCoords}
            anchor={{ x: 0.5, y: 0.5 }}
            zIndex={41}
            tracksViewChanges
          >
            <View collapsable={false} style={styles.destinationSvgMarker}>
              <Svg width={32} height={32} viewBox="0 0 32 32">
                {/* Outer ring */}
                <Rect
                  x={2}
                  y={2}
                  width={28}
                  height={28}
                  rx={6}
                  ry={6}
                  fill="rgba(0,0,0,0.08)"
                />
                {/* White border */}
                <Rect
                  x={6}
                  y={6}
                  width={20}
                  height={20}
                  rx={4}
                  ry={4}
                  fill="white"
                />
                {/* Black center square */}
                <Rect
                  x={10}
                  y={10}
                  width={12}
                  height={12}
                  rx={2}
                  ry={2}
                  fill="black"
                />
              </Svg>
            </View>
          </Marker>
        )}

        {/* Route polyline — Uber style with shadow + main line */}
        {routeCoords.length > 0 && (
          <>
            <Polyline
              coordinates={routeCoords}
              strokeColor="rgba(0,0,0,0.3)"
              strokeWidth={8}
              lineCap="round"
              lineJoin="round"
              zIndex={1}
            />
            <Polyline
              coordinates={routeCoords}
              strokeColor="#000"
              strokeWidth={5}
              lineCap="round"
              lineJoin="round"
              zIndex={2}
            />
          </>
        )}
      </MapView>

      <TouchableOpacity
        style={[
          styles.recenterBtn,
          sheetCollapsed ? styles.recenterBtnCollapsed : styles.recenterBtnRaised,
        ]}
        onPress={recenterMap}
        activeOpacity={0.85}
      >
        <View style={styles.recenterRing}>
          <View style={styles.recenterDot} />
        </View>
      </TouchableOpacity>

      {!location && (
        <View style={styles.locatingPill}>
          <ActivityIndicator size="small" color="#000" />
          <Text style={styles.locatingText}>Finding you</Text>
        </View>
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
        style={styles.kavContainer}
      >
        <View style={[
          styles.sheet,
          keyboardOpen && styles.sheetKeyboard,
          sheetCollapsed && styles.sheetCollapsed,
        ]}>
          <TouchableOpacity
            style={styles.sheetHandleWrap}
            activeOpacity={0.8}
            onPress={() => setSheetCollapsed((current) => !current)}
          >
            <View style={styles.sheetHandle} />
          </TouchableOpacity>

          {sheetCollapsed ? null : (
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.sheetContent}
          >
            {!tripId ? (
              <>
                <View style={styles.sheetHeader}>
                  <View>
                    <Text style={styles.greeting}>{user?.name.split(' ')[0]}</Text>
                    <Text style={styles.whereLabel}>Where to?</Text>
                  </View>
                  <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
                    <Text style={styles.logoutText}>Sign out</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.searchRow}>
                  <View style={styles.searchDot} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Enter your destination"
                    placeholderTextColor="#aaa"
                    value={destination}
                    onChangeText={handleDestinationChange}
                    onSubmitEditing={() => {
                      Keyboard.dismiss();
                      searchDestination();
                    }}
                    returnKeyType="search"
                  />
                  {loading ? (
                    <ActivityIndicator color="#000" size="small" style={styles.inputLoader} />
                  ) : (
                    <TouchableOpacity
                      style={styles.goBtn}
                      onPress={() => {
                        Keyboard.dismiss();
                        searchDestination();
                      }}
                    >
                      <Text style={styles.goBtnText}>→</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {!!autocompleteError && (
                  <Text style={styles.autocompleteError}>{autocompleteError}</Text>
                )}

                {autocompleteResults.length > 0 && (
                  <View style={styles.autocompleteContainer}>
                    {autocompleteResults.slice(0, 5).map((item) => (
                      <TouchableOpacity
                        key={item.place_id}
                        style={styles.autocompleteItem}
                        onPress={() => selectPlace(item)}
                      >
                        <Text style={styles.autocompleteMain}>
                          {item.structured_formatting?.main_text || item.description}
                        </Text>
                        <Text style={styles.autocompleteSub} numberOfLines={1}>
                          {item.structured_formatting?.secondary_text || item.description}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {!tiers.length && autocompleteResults.length === 0 && searchHistory.length > 0 && (
                  <>
                    <Text style={styles.historyLabel}>Recent</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={styles.historyScroll}
                      keyboardShouldPersistTaps="handled"
                    >
                      {searchHistory.map((item) => (
                        <TouchableOpacity
                          key={item.id}
                          style={styles.historyChip}
                          onPress={() => {
                            setDestination(item.address);
                            searchDestination(item.address, {
                              latitude: item.lat,
                              longitude: item.lng,
                            });
                          }}
                        >
                          <Text style={styles.historyChipText} numberOfLines={1}>
                            {item.address.split(',')[0]}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </>
                )}

                {tiers.length > 0 && (
                  <>
                    <Text style={styles.tiersLabel}>Choose your ride</Text>
                    {tiers.filter(Boolean).map((tier) => (
                      <TouchableOpacity
                        key={tier.type}
                        style={[
                          styles.tierCard,
                          selectedTier?.type === tier.type && styles.tierCardSelected,
                          !tier.available && styles.tierCardDisabled,
                        ]}
                        onPress={() => tier.available && setSelectedTier(tier)}
                        activeOpacity={tier.available ? 0.7 : 1}
                      >
                        <Text style={styles.tierIcon}>{tier.icon}</Text>

                        <View style={styles.tierInfo}>
                          <View style={styles.tierNameRow}>
                            <Text style={[
                              styles.tierLabel,
                              selectedTier?.type === tier.type && styles.tierLabelSelected,
                              !tier.available && styles.tierLabelDisabled,
                            ]}>
                              {tier.label}
                            </Text>
                            {!tier.available && (
                              <View style={styles.comingSoonBadge}>
                                <Text style={styles.comingSoonText}>Soon</Text>
                              </View>
                            )}
                          </View>
                          {tier.available && (
                            <Text style={[
                              styles.tierEta,
                              selectedTier?.type === tier.type && styles.tierEtaSelected,
                            ]}>
                              {tier.etaMinutes} min away
                            </Text>
                          )}
                        </View>

                        {tier.available ? (
                          <View style={styles.tierPriceContainer}>
                            <Text style={[
                              styles.tierPrice,
                              selectedTier?.type === tier.type && styles.tierPriceSelected,
                            ]}>
                              KES {getTierLow(tier)}-{getTierHigh(tier)}
                            </Text>
                            <Text style={[
                              styles.tierMarketPrice,
                              selectedTier?.type === tier.type && styles.tierMarketPriceSelected,
                            ]}>
                              KES {getTierMarketPrice(tier)}
                            </Text>
                            <View style={[
                              styles.promoBadge,
                              selectedTier?.type === tier.type && styles.promoBadgeSelected,
                            ]}>
                              <Text style={[
                                styles.promoText,
                                selectedTier?.type === tier.type && styles.promoTextSelected,
                              ]}>
                                Save KES {tier.savings ?? getTierSavings(tier)}
                              </Text>
                            </View>
                          </View>
                        ) : (
                          <View style={styles.tierPriceContainer}>
                            <Text style={styles.tierLabelDisabled}>-</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    ))}

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
                          <Text style={styles.requestBtnText}>Confirm Ride</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </>
            ) : (
              <View style={styles.tripActiveContainer}>
                <Text style={styles.tripStatusText}>{getTripStatusText()}</Text>
                <Text style={styles.tripIdText}>
                  #{tripId?.slice(0, 8).toUpperCase()}
                </Text>

                {tripStatus === 'REQUESTED' && (
                  <ActivityIndicator color="#000" style={{ marginTop: 20 }} />
                )}

                {driver && (
                  <View style={styles.driverCard}>
                    <View style={styles.driverAvatar}>
                      <Text style={styles.driverAvatarText}>
                        {driver.name?.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.driverInfo}>
                      <Text style={styles.driverName}>{driver.name}</Text>
                      <Text style={styles.driverPlate}>
                        {driver.vehicle?.plate}
                      </Text>
                      <Text style={styles.driverVehicle}>
                        {driver.vehicle?.color} {driver.vehicle?.model}
                      </Text>
                    </View>
                    <TouchableOpacity style={styles.callBtn} onPress={callDriver}>
                      <Text style={styles.callBtnText}>Call</Text>
                    </TouchableOpacity>
                  </View>
                )}

                <View style={styles.tripActions}>
                  <TouchableOpacity style={styles.shareBtn} onPress={shareTrip}>
                    <Text style={styles.shareBtnText}>Share Trip</Text>
                  </TouchableOpacity>

                  {(tripStatus === 'REQUESTED' || tripStatus === 'ACCEPTED') && (
                    <TouchableOpacity style={styles.cancelBtn} onPress={cancelSearch}>
                      <Text style={styles.cancelBtnText}>Cancel</Text>
                    </TouchableOpacity>
                  )}

                  {tripStatus === 'COMPLETED' && (
                    <TouchableOpacity style={styles.requestBtn} onPress={cancelSearch}>
                      <Text style={styles.requestBtnText}>Done</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}
          </ScrollView>
          )}
        </View>
        {keyboardOpen && Platform.OS === 'android' && (
          <View style={{ height: keyboardHeight, backgroundColor: '#fff' }} />
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  map: { ...StyleSheet.absoluteFillObject },
  locationSvgMarker: {
    width: 40,
    height: 40,
  },
  destinationSvgMarker: {
    width: 32,
    height: 32,
  },

  // Modern pulsing blue dot — fixed-size rings, opacity only
  blueDotContainer: {
    width: 70,
    height: 70,
    justifyContent: 'center',
    alignItems: 'center',
  },
  blueDotRing: {
    position: 'absolute',
    backgroundColor: '#4285F4',
    borderRadius: 999,
    alignSelf: 'center',
  },
  blueDotRingLg: {
    width: 60,
    height: 60,
  },
  blueDotRingMd: {
    width: 40,
    height: 40,
  },
  blueDotOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
  },
  blueDotInner: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#4285F4',
  },

  // Pickup dot — gray circle with white border
  uberPickupDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 3,
    borderColor: '#111',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.28,
    shadowRadius: 6,
    elevation: 10,
  },
  uberPickupDotCore: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#111',
  },

  // Destination — black square with white border
  uberDestSquare: {
    width: 32,
    height: 32,
    borderRadius: 4,
    backgroundColor: '#fff',
    borderWidth: 3,
    borderColor: '#111',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.28,
    shadowRadius: 6,
    elevation: 10,
  },
  uberDestSquareCore: {
    width: 12,
    height: 12,
    borderRadius: 1,
    backgroundColor: '#111',
  },

  locatingPill: {
    position: 'absolute',
    top: 54,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  locatingText: { fontSize: 12, color: '#000', fontWeight: '700' },
  recenterBtn: {
    position: 'absolute',
    right: 22,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#111',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 10,
  },
  recenterBtnRaised: {
    bottom: height * 0.58 + 22,
  },
  recenterBtnCollapsed: {
    bottom: 96,
  },
  recenterRing: {
    width: 27,
    height: 27,
    borderRadius: 14,
    borderWidth: 4,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recenterDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#fff',
  },
  kavContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: height * 0.58,
    paddingHorizontal: 24,
    paddingTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
    elevation: 18,
  },
  sheetKeyboard: {
    maxHeight: height * 0.48,
  },
  sheetCollapsed: {
    height: 42,
    maxHeight: 42,
    paddingHorizontal: 0,
    paddingBottom: 0,
  },
  sheetContent: {
    paddingBottom: 30,
  },
  sheetHandleWrap: {
    alignSelf: 'center',
    width: 96,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  sheetHandle: {
    width: 54,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#d9d9d9',
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  greeting: {
    fontSize: 12,
    color: '#bbb',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  whereLabel: {
    fontSize: 26,
    fontWeight: '800',
    color: '#000',
    letterSpacing: -0.5,
  },
  logoutBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#e8e8e8',
    borderRadius: 20,
  },
  logoutText: { fontSize: 12, color: '#999', fontWeight: '500' },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginBottom: 8,
  },
  searchDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#000',
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
    paddingVertical: 14,
  },
  inputLoader: { marginRight: 8 },
  goBtn: {
    backgroundColor: '#000',
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  goBtnText: { color: '#fff', fontSize: 19, fontWeight: '800' },
  autocompleteError: {
    color: '#b00020',
    fontSize: 12,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  autocompleteContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ededed',
    marginBottom: 8,
    overflow: 'hidden',
  },
  autocompleteItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  autocompleteMain: { fontSize: 14, fontWeight: '700', color: '#000' },
  autocompleteSub: { fontSize: 12, color: '#888', marginTop: 3 },
  historyLabel: {
    fontSize: 11,
    color: '#aaa',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 10,
    marginTop: 6,
  },
  historyScroll: { marginBottom: 8 },
  historyChip: {
    backgroundColor: '#f3f3f3',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    maxWidth: 150,
  },
  historyChipText: { fontSize: 13, color: '#333', fontWeight: '600' },
  tiersLabel: {
    fontSize: 11,
    color: '#aaa',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 10,
    marginTop: 4,
  },
  tierCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#efefef',
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  tierCardSelected: {
    borderColor: '#000',
    backgroundColor: '#000',
  },
  tierCardDisabled: {
    opacity: 0.4,
    borderColor: '#f0f0f0',
  },
  tierIcon: { fontSize: 24, marginRight: 14 },
  tierInfo: { flex: 1 },
  tierNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tierLabel: { fontSize: 15, fontWeight: '800', color: '#000' },
  tierLabelSelected: { color: '#fff' },
  tierLabelDisabled: {
    color: '#bbb',
  },
  comingSoonBadge: {
    backgroundColor: '#f0f0f0',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  comingSoonText: {
    fontSize: 9,
    color: '#999',
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  tierEta: { fontSize: 12, color: '#888', marginTop: 2 },
  tierEtaSelected: { color: '#aaa' },
  tierPriceContainer: { alignItems: 'flex-end' },
  tierPrice: { fontSize: 15, fontWeight: '800', color: '#000' },
  tierPriceSelected: { color: '#fff' },
  tierMarketPrice: {
    fontSize: 11,
    color: '#bbb',
    textDecorationLine: 'line-through',
    textAlign: 'right',
    marginTop: 2,
  },
  tierMarketPriceSelected: {
    color: '#666',
  },
  promoBadge: {
    backgroundColor: '#f0f0f0',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 3,
    alignSelf: 'flex-end',
  },
  promoBadgeSelected: {
    backgroundColor: '#333',
  },
  promoText: {
    fontSize: 9,
    color: '#666',
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  promoTextSelected: {
    color: '#fff',
  },
  tierPayBadge: { fontSize: 10, color: '#999', marginTop: 2 },
  tierPayBadgeSelected: { color: '#aaa' },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  cancelBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#e8e8e8',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelBtnText: { color: '#000', fontWeight: '700', fontSize: 14 },
  requestBtn: {
    flex: 1,
    backgroundColor: '#000',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  requestBtnText: { color: '#fff', fontWeight: '800', fontSize: 14, letterSpacing: 0.3 },
  tripActiveContainer: {
    alignItems: 'center',
    paddingTop: 8,
  },
  tripStatusText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#000',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  tripIdText: {
    fontSize: 11,
    color: '#aaa',
    letterSpacing: 2,
    marginTop: 4,
    textAlign: 'center',
  },
  driverCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f7f7f7',
    borderRadius: 20,
    padding: 16,
    marginTop: 20,
    width: '100%',
  },
  driverAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  driverAvatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
  },
  driverInfo: { flex: 1 },
  driverName: { fontSize: 16, fontWeight: '700', color: '#000' },
  driverPlate: {
    fontSize: 18,
    fontWeight: '800',
    color: '#000',
    letterSpacing: 1,
    marginTop: 2,
  },
  driverVehicle: { fontSize: 12, color: '#999', marginTop: 2 },
  callBtn: {
    minWidth: 54,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  callBtnText: { fontSize: 13, fontWeight: '800', color: '#000' },
  tripActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
    width: '100%',
  },
  shareBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#e8e8e8',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  shareBtnText: { color: '#000', fontWeight: '700', fontSize: 14 },
});
