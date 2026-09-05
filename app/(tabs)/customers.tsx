import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, TextInput,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Bell, Search, Plus, User, Phone } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Customer } from '@/types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { F, scaleFont } from '@/utils/fonts';
import { T } from '@/utils/typography';
import Colors from '@/constants/Colors';

export default function CustomersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useFocusEffect(useCallback(() => {
    const load = async () => {
      if (!user) {
        setCustomers([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const snapshot = await getDocs(query(collection(db, 'customers'), where('user_id', '==', user.uid)));
        const data = snapshot.docs
          .map(d => ({ id: d.id, ...d.data() }) as Customer)
          .sort((a, b) => a.full_name.localeCompare(b.full_name));
        setCustomers(data as Customer[]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]));

  const filtered = customers.filter(c =>
    c.full_name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search)
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient colors={['#1B5E20', '#2E7D32']} style={styles.header}>
        <Text style={[styles.headerTitle, { color: Colors.white }]}>{t('Customers')}</Text>
        <TouchableOpacity><Bell size={20} color="#FFFFFF" /></TouchableOpacity>
      </LinearGradient>

      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Search size={16} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder={t('Search customers...')}
            placeholderTextColor="#9CA3AF"
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            onSubmitEditing={() => {}}
          />
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/add-customer')}>
          <Plus size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#1B4332" /></View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets={true}
          keyboardDismissMode="on-drag"
          contentContainerStyle={{ paddingBottom: 20 }}
        >
          {filtered.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>{search ? t('No results found') : t('No customers yet')}</Text>
              <Text style={styles.emptyText}>{t('Add your first customer to get started')}</Text>
              {!search && (
                <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/add-customer')}>
                  <Text style={styles.emptyBtnText}>{t('+ Add Customer')}</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            filtered.map(customer => (
              <View key={customer.id} style={styles.card}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{customer.full_name.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={styles.info}>
                  <Text style={styles.name}>{customer.full_name}</Text>
                  <View style={styles.metaRow}>
                    <Phone size={12} color="#6B7280" />
                    <Text style={styles.metaText}>{customer.phone}</Text>
                  </View>
                  {customer.address ? (
                    <Text style={styles.address} numberOfLines={1}>{customer.address}</Text>
                  ) : null}
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 80 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255, 255, 255, 0.15)' },
  headerTitle: { ...T.h2, color: Colors.white },
  searchRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 14, paddingVertical: 10 },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.white, borderRadius: 10, paddingHorizontal: 12, height: 42, borderWidth: 1, borderColor: Colors.borderGreenLight },
  searchInput: { flex: 1, ...T.body, fontSize: scaleFont(11.5), color: Colors.textPrimary },
  addBtn: { width: 42, height: 42, backgroundColor: Colors.primary, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  emptyCard: { margin: 16, padding: 24, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.borderGreenLight, borderRadius: 14, alignItems: 'center' },
  emptyTitle: { ...T.sectionHeader, marginBottom: 6, color: Colors.primary },
  emptyText: { ...T.bodySm, color: Colors.textSecondary, textAlign: 'center', marginBottom: 16 },
  emptyBtn: { backgroundColor: Colors.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  emptyBtnText: { ...T.btnSm, color: Colors.white },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.borderGreenLight, marginHorizontal: 14, marginBottom: 8, borderRadius: 12, padding: 12, shadowColor: Colors.primary, shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.lightGreen, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { fontSize: scaleFont(13), fontFamily: F.semibold, color: Colors.primary },
  info: { flex: 1 },
  name: { ...T.customerName, marginBottom: 2, color: Colors.textPrimary },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { ...T.cardContent, fontSize: scaleFont(10.5), color: Colors.textSecondary },
  address: { ...T.caption, marginTop: 2, color: Colors.textMuted },
});

