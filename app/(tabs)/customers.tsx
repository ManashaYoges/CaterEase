import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, TextInput,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Bell, Search, Plus, User, Phone } from 'lucide-react-native';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Customer } from '@/types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';

export default function CustomersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
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
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Customers</Text>
        <TouchableOpacity><Bell size={22} color="#374151" /></TouchableOpacity>
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Search size={16} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search customers..."
            placeholderTextColor="#9CA3AF"
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/add-customer')}>
          <Plus size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#1B4332" /></View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {filtered.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>{search ? 'No results found' : 'No customers yet'}</Text>
              <Text style={styles.emptyText}>Add your first customer to get started</Text>
              {!search && (
                <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/add-customer')}>
                  <Text style={styles.emptyBtnText}>+ Add Customer</Text>
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
          <View style={{ height: 100 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 80 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  searchRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingVertical: 12 },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 12, height: 44, borderWidth: 1, borderColor: '#E5E7EB' },
  searchInput: { flex: 1, fontSize: 14, color: '#111827' },
  addBtn: { width: 44, height: 44, backgroundColor: '#1B4332', borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  emptyCard: { margin: 20, padding: 32, backgroundColor: '#fff', borderRadius: 16, alignItems: 'center' },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 20 },
  emptyBtn: { backgroundColor: '#1B4332', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 8, borderRadius: 14, padding: 14, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#D1FAE5', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { fontSize: 18, fontWeight: '700', color: '#065F46' },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 13, color: '#6B7280' },
  address: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
});
