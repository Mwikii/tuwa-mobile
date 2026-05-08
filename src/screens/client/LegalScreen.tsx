import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
} from 'react-native';

export default function LegalScreen({ navigation, route }: any) {
  const type = route.params?.type || 'terms';
  const isTerms = type === 'terms';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isTerms ? 'Terms & Conditions' : 'Privacy Notice'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {isTerms ? (
          <>
            <Text style={styles.lastUpdated}>Last updated: May 2026</Text>
            <Text style={styles.sectionTitle}>1. Acceptance of Terms</Text>
            <Text style={styles.body}>
              By using the Tuwa app, you agree to these terms. If you do not agree, please do not use the app.
            </Text>
            <Text style={styles.sectionTitle}>2. Our Service</Text>
            <Text style={styles.body}>
              Tuwa connects clients with independent drivers. We are a technology platform and not a transport provider. Drivers are independent contractors, not Tuwa employees.
            </Text>
            <Text style={styles.sectionTitle}>3. Payments</Text>
            <Text style={styles.body}>
              All trip payments are made directly between the client and driver via M-Pesa or cash. Tuwa does not process or hold trip payments.
            </Text>
            <Text style={styles.sectionTitle}>4. Driver Access Fee</Text>
            <Text style={styles.body}>
              Drivers pay a flat daily access fee to use the Tuwa platform. This fee is non-refundable.
            </Text>
            <Text style={styles.sectionTitle}>5. User Conduct</Text>
            <Text style={styles.body}>
              Users must treat drivers and other users with respect. Tuwa reserves the right to suspend accounts for misconduct.
            </Text>
            <Text style={styles.sectionTitle}>6. Limitation of Liability</Text>
            <Text style={styles.body}>
              Tuwa is not liable for any damages arising from the use of the platform, including but not limited to accidents, delays, or disputes between clients and drivers.
            </Text>
            <Text style={styles.sectionTitle}>7. Changes to Terms</Text>
            <Text style={styles.body}>
              We may update these terms at any time. Continued use of the app constitutes acceptance of the updated terms.
            </Text>
            <Text style={styles.sectionTitle}>8. Contact</Text>
            <Text style={styles.body}>
              For any questions regarding these terms, contact us via the Help section in the app.
            </Text>
          </>
        ) : (
          <>
            <Text style={styles.lastUpdated}>Last updated: May 2026</Text>
            <Text style={styles.sectionTitle}>What we collect</Text>
            <Text style={styles.body}>
              We collect your name, phone number, email address, and location data when you use the app. Location data is only collected during active trips.
            </Text>
            <Text style={styles.sectionTitle}>How we use your data</Text>
            <Text style={styles.body}>
              Your data is used to provide the Tuwa service — matching you with drivers, calculating fares, and maintaining your account. We do not sell your data to third parties.
            </Text>
            <Text style={styles.sectionTitle}>Data storage</Text>
            <Text style={styles.body}>
              Your data is stored securely on servers hosted in the cloud. We use industry-standard encryption to protect your information.
            </Text>
            <Text style={styles.sectionTitle}>Your rights</Text>
            <Text style={styles.body}>
              You may request deletion of your account and associated data at any time by contacting us through the Help section.
            </Text>
            <Text style={styles.sectionTitle}>Cookies & Tracking</Text>
            <Text style={styles.body}>
              We do not use cookies or third-party tracking in the Tuwa app.
            </Text>
            <Text style={styles.sectionTitle}>Contact</Text>
            <Text style={styles.body}>
              For privacy-related queries, contact us via the Help section in the app.
            </Text>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  backText: { fontSize: 24, color: '#000' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#000' },
  content: { padding: 24, paddingBottom: 48 },
  lastUpdated: { fontSize: 12, color: '#bbb', marginBottom: 24 },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000',
    marginTop: 20,
    marginBottom: 8,
  },
  body: { fontSize: 14, color: '#666', lineHeight: 22 },
});
