import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Linking,
  LayoutAnimation,
} from 'react-native';

const faqs = [
  {
    q: 'How do I request a ride?',
    a: 'Enter your destination in the search bar on the Home tab. Select your ride type and tap Confirm Ride.',
  },
  {
    q: 'How do I pay for my ride?',
    a: 'You pay the driver directly via M-Pesa or cash at the end of your trip. Tuwa does not process trip payments.',
  },
  {
    q: 'Can I cancel a ride?',
    a: 'Yes. Tap Cancel on the active trip screen before the driver arrives.',
  },
  {
    q: 'What if my driver does not show up?',
    a: 'Contact us via WhatsApp and we will assist you immediately.',
  },
  {
    q: 'How is the fare calculated?',
    a: 'Fares are based on distance. Boda fares start at KES 80 plus KES 25 per km. Economy car fares start at KES 220 plus KES 50 per km.',
  },
  {
    q: 'Is Tuwa safe?',
    a: 'All drivers are vetted and verified before being allowed on the platform. You can share your trip with a contact for added safety.',
  },
];

const FAQItem = ({ item }: { item: typeof faqs[0] }) => {
  const [open, setOpen] = useState(false);

  return (
    <TouchableOpacity
      style={styles.faqItem}
      onPress={() => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setOpen(!open);
      }}
      activeOpacity={0.7}
    >
      <View style={styles.faqHeader}>
        <Text style={styles.faqQ}>{item.q}</Text>
        <Text style={styles.faqChevron}>{open ? '−' : '+'}</Text>
      </View>
      {open && <Text style={styles.faqA}>{item.a}</Text>}
    </TouchableOpacity>
  );
};

export default function HelpScreen({ navigation }: any) {
  const openWhatsApp = () => {
    Linking.openURL('whatsapp://send?phone=254700000000&text=Hi Tuwa Support,');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help & Support</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.contactCard} onPress={openWhatsApp}>
          <Text style={styles.contactIcon}>💬</Text>
          <View style={styles.contactInfo}>
            <Text style={styles.contactTitle}>Chat with us</Text>
            <Text style={styles.contactSub}>We typically reply within minutes</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>

        <Text style={styles.sectionLabel}>Frequently Asked Questions</Text>

        <View style={styles.faqGroup}>
          {faqs.map((item, index) => (
            <FAQItem key={index} item={item} />
          ))}
        </View>

        <Text style={styles.sectionLabel}>About Tuwa</Text>
        <View style={styles.aboutCard}>
          <Text style={styles.aboutText}>
            Tuwa is a Nairobi-based ride-hailing platform built to give riders
            better value and drivers fairer earnings. We charge drivers a flat
            daily fee instead of taking a commission — meaning drivers keep
            100% of every fare.
          </Text>
          <Text style={styles.aboutVersion}>Version 1.0.0</Text>
        </View>
      </ScrollView>
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
  content: { padding: 16 },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000',
    borderRadius: 20,
    padding: 18,
    marginBottom: 24,
  },
  contactIcon: { fontSize: 28, marginRight: 14 },
  contactInfo: { flex: 1 },
  contactTitle: { fontSize: 16, fontWeight: '700', color: '#fff' },
  contactSub: { fontSize: 13, color: '#888', marginTop: 2 },
  chevron: { fontSize: 20, color: '#fff' },
  sectionLabel: {
    fontSize: 11,
    color: '#bbb',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 10,
    marginTop: 8,
    marginHorizontal: 4,
  },
  faqGroup: {
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 24,
  },
  faqItem: {
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  faqQ: { fontSize: 14, fontWeight: '600', color: '#000', flex: 1, marginRight: 12 },
  faqChevron: { fontSize: 18, color: '#bbb', fontWeight: '300' },
  faqA: { fontSize: 14, color: '#666', marginTop: 10, lineHeight: 20 },
  aboutCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
  },
  aboutText: { fontSize: 14, color: '#666', lineHeight: 22 },
  aboutVersion: { fontSize: 12, color: '#ccc', marginTop: 12 },
});
