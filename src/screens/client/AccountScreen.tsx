import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Switch,
  Alert,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';

const SectionHeader = ({ title }: { title: string }) => (
  <Text style={styles.sectionHeader}>{title}</Text>
);

const MenuItem = ({
  icon,
  label,
  onPress,
  danger,
  right,
}: {
  icon: string;
  label: string;
  onPress?: () => void;
  danger?: boolean;
  right?: React.ReactNode;
}) => (
  <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.6}>
    <View style={styles.menuLeft}>
      <Text style={styles.menuIcon}>{icon}</Text>
      <Text style={[styles.menuLabel, danger && styles.menuLabelDanger]}>{label}</Text>
    </View>
    {right ?? <Text style={styles.menuChevron}>›</Text>}
  </TouchableOpacity>
);

export default function AccountScreen() {
  const { user, logout } = useAuth();
  const [notifications, setNotifications] = useState(true);

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  };

  const comingSoon = () =>
    Alert.alert('Coming Soon', 'This feature will be available in a future update.');

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Account</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Profile card */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.name?.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.name}</Text>
            <Text style={styles.profilePhone}>{user?.phone}</Text>
          </View>
          <TouchableOpacity style={styles.editBtn} onPress={comingSoon}>
            <Text style={styles.editBtnText}>Edit</Text>
          </TouchableOpacity>
        </View>

        {/* Rides & Payments */}
        <SectionHeader title="Rides & Payments" />
        <View style={styles.menuGroup}>
          <MenuItem icon="📍" label="Saved Places" onPress={comingSoon} />
          <MenuItem icon="💳" label="Payment Methods" onPress={comingSoon} />
          <MenuItem icon="🎁" label="Promotions" onPress={comingSoon} />
        </View>

        {/* Safety */}
        <SectionHeader title="Safety" />
        <View style={styles.menuGroup}>
          <MenuItem icon="🛡️" label="Safety Center" onPress={comingSoon} />
          <MenuItem icon="📱" label="Emergency Contacts" onPress={comingSoon} />
        </View>

        {/* Preferences */}
        <SectionHeader title="Preferences" />
        <View style={styles.menuGroup}>
          <MenuItem
            icon="🔔"
            label="Notifications"
            right={
              <Switch
                value={notifications}
                onValueChange={setNotifications}
                trackColor={{ false: '#e0e0e0', true: '#000' }}
                thumbColor="#fff"
              />
            }
          />
          <MenuItem icon="🌍" label="Language" onPress={comingSoon} />
        </View>

        {/* Support */}
        <SectionHeader title="Support" />
        <View style={styles.menuGroup}>
          <MenuItem icon="💬" label="Help & Support" onPress={comingSoon} />
          <MenuItem icon="⭐" label="Rate the App" onPress={comingSoon} />
          <MenuItem icon="📄" label="Terms & Privacy" onPress={comingSoon} />
        </View>

        {/* Sign out */}
        <View style={[styles.menuGroup, { marginTop: 8 }]}>
          <MenuItem icon="🚪" label="Sign Out" onPress={handleLogout} danger />
        </View>

        <Text style={styles.version}>Tuwa v1.0.0 · Made in Nairobi</Text>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f7f7' },
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#000',
    letterSpacing: -0.5,
  },

  // Profile
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 20,
    padding: 18,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  avatarText: { color: '#fff', fontSize: 22, fontWeight: '800' },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 17, fontWeight: '700', color: '#000' },
  profilePhone: { fontSize: 13, color: '#bbb', marginTop: 2 },
  editBtn: {
    borderWidth: 1,
    borderColor: '#e8e8e8',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  editBtnText: { fontSize: 13, color: '#000', fontWeight: '600' },

  // Sections
  sectionHeader: {
    fontSize: 11,
    color: '#bbb',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginTop: 24,
    marginBottom: 8,
    marginHorizontal: 24,
  },
  menuGroup: {
    backgroundColor: '#fff',
    borderRadius: 20,
    marginHorizontal: 16,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  menuLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  menuIcon: { fontSize: 18 },
  menuLabel: { fontSize: 15, color: '#000', fontWeight: '500' },
  menuLabelDanger: { color: '#e00' },
  menuChevron: { fontSize: 20, color: '#ccc', fontWeight: '300' },

  version: {
    textAlign: 'center',
    fontSize: 12,
    color: '#ccc',
    marginTop: 32,
    marginBottom: 40,
    letterSpacing: 0.5,
  },
});
