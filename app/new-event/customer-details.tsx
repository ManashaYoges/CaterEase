import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform, Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, X } from 'lucide-react-native';
import { useNewEvent } from '@/context/NewEventContext';
import { collection, getDocs, query, where, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Customer } from '@/types';
import StepIndicator from '@/components/StepIndicator';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';

export default function CustomerDetailsScreen() {
  const router = useRouter();
  const { data, update } = useNewEvent();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  // Mode: 'select' = choose existing, 'new' = fill new customer form
  const [mode, setMode] = useState<'select' | 'new'>('select');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // New customer form fields
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    getDocs(query(collection(db, 'customers'), where('user_id', '==', user.uid)))
      .then(snapshot => {
        const list = snapshot.docs
          .map(d => ({ id: d.id, ...d.data() }) as Customer)
          .sort((a, b) => a.full_name.localeCompare(b.full_name));
        setCustomers(list);
      });
  }, [user]);

  const filtered = customers.filter(c =>
    c.full_name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search)
  );

  const handleSelectCustomer = (c: Customer) => {
    setSelectedCustomer(c);
    update({
      customerId: c.id,
      customerName: c.full_name,
      customerPhone: c.phone,
      customerEmail: c.email || '',
      customerAddress: c.address || '',
    });
  };

  const validateNew = () => {
    const e: Record<string, string> = {};
    if (!fullName.trim()) e.fullName = 'Full name is required';
    if (!phone.trim()) e.phone = 'Phone number is required';
    else if (phone.replace(/\D/g, '').length < 10) e.phone = 'Enter a valid 10-digit number';
    return e;
  };

  // Save new customer to Firestore, then proceed
  const handleSaveNewAndContinue = async () => {
    const e = validateNew();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    if (!user) return;
    setSaving(true);
    try {
      const docRef = await addDoc(collection(db, 'customers'), {
        full_name: fullName.trim(),
        phone: phone.trim(),
        address: address.trim() || null,
        notes: notes.trim() || null,
        add_to_contacts: true,
        user_id: user.uid,
        created_at: new Date().toISOString(),
      });
      update({
        customerId: docRef.id,
        customerName: fullName.trim(),
        customerPhone: phone.trim(),
        customerAddress: address.trim(),
        customerEmail: '',
      });
      router.push('/new-event');
    } catch (err: any) {
      setErrors({ general: err.message || 'Failed to save customer' });
    } finally {
      setSaving(false);
    }
  };

  const handleContinueWithSelected = () => {
    if (!selectedCustomer) {
      setErrors({ select: 'Please select a customer or add a new one' });
      return;
    }
    router.push('/new-event');
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <ArrowLeft size={20} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Event</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Show step 1 of 3 — customer is step 1 now */}
        <StepIndicator current={1} total={4} />

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          <Text style={styles.title}>Customer Details</Text>
          <Text style={styles.subtitle}>Select an existing customer or add a new one</Text>

          {/* Toggle between select and new */}
          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[styles.toggleBtn, mode === 'select' && styles.toggleBtnActive]}
              onPress={() => setMode('select')}
            >
              <Text style={[styles.toggleText, mode === 'select' && styles.toggleTextActive]}>
                Existing Customer
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, mode === 'new' && styles.toggleBtnActive]}
              onPress={() => setMode('new')}
            >
              <Text style={[styles.toggleText, mode === 'new' && styles.toggleTextActive]}>
                Add New
              </Text>
            </TouchableOpacity>
          </View>

          {mode === 'select' ? (
            <>
              <TextInput
                style={styles.searchInput}
                placeholder="Search by name or phone"
                placeholderTextColor="#9CA3AF"
                value={search}
                onChangeText={setSearch}
              />
              {errors.select ? <Text style={styles.fieldError}>{errors.select}</Text> : null}
              {filtered.length === 0 ? (
                <Text style={styles.emptyText}>No customers found. Add a new one.</Text>
              ) : (
                filtered.map(c => (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.customerCard, selectedCustomer?.id === c.id && styles.customerCardSelected]}
                    onPress={() => handleSelectCustomer(c)}
                  >
                    <View style={styles.customerInfo}>
                      <Text style={styles.customerName}>{c.full_name}</Text>
                      <Text style={styles.customerPhone}>{c.phone}</Text>
                    </View>
                    {selectedCustomer?.id === c.id && (
                      <View style={styles.checkCircle}>
                        <Text style={styles.checkMark}>✓</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))
              )}
              <TouchableOpacity style={styles.nextBtn} onPress={handleContinueWithSelected}>
                <Text style={styles.nextBtnText}>Next: Event Details →</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              {errors.general ? <Text style={styles.fieldError}>{errors.general}</Text> : null}

              <Text style={styles.label}>Full Name <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={[styles.input, errors.fullName && styles.inputError]}
                placeholder="Sathish"
                placeholderTextColor="#9CA3AF"
                value={fullName}
                onChangeText={t => setFullName(t.replace(/[^a-zA-Z\s]/g, ''))}
                autoCapitalize="words"
              />
              {errors.fullName ? <Text style={styles.fieldError}>{errors.fullName}</Text> : null}

              <Text style={styles.label}>Phone Number <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={[styles.input, errors.phone && styles.inputError]}
                placeholder="1234567890"
                placeholderTextColor="#9CA3AF"
                value={phone}
                onChangeText={t => setPhone(t.replace(/\D/g, '').slice(0, 10))}
                keyboardType="phone-pad"
              />
              {errors.phone ? <Text style={styles.fieldError}>{errors.phone}</Text> : null}

              <Text style={styles.label}>Address</Text>
              <TextInput
                style={styles.input}
                placeholder="Karaikudi, Sivagangai, Tamil Nadu"
                placeholderTextColor="#9CA3AF"
                value={address}
                onChangeText={setAddress}
              />

              <Text style={styles.label}>Notes (Optional)</Text>
              <TextInput
                style={[styles.input, { height: 80, textAlignVertical: 'top', paddingTop: 12 }]}
                placeholder="VIP Customer"
                placeholderTextColor="#9CA3AF"
                value={notes}
                onChangeText={setNotes}
                multiline
              />

              <TouchableOpacity
                style={[styles.nextBtn, saving && { opacity: 0.7 }]}
                onPress={handleSaveNewAndContinue}
                disabled={saving}
              >
                <Text style={styles.nextBtnText}>
                  {saving ? 'Saving...' : 'Save & Next: Event Details →'}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  scroll: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#6B7280', marginBottom: 20 },
  toggleRow: { flexDirection: 'row', backgroundColor: '#F3F4F6', borderRadius: 10, padding: 4, marginBottom: 20 },
  toggleBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  toggleBtnActive: { backgroundColor: '#1B4332' },
  toggleText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  toggleTextActive: { color: '#fff' },
  searchInput: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 14, height: 48, fontSize: 14, color: '#111827', backgroundColor: '#F9FAFB', marginBottom: 12 },
  emptyText: { color: '#9CA3AF', fontSize: 14, textAlign: 'center', marginVertical: 20 },
  customerCard: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB' },
  customerCardSelected: { borderColor: '#1B4332', backgroundColor: '#F0FDF4' },
  customerInfo: { flex: 1 },
  customerName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  customerPhone: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  checkCircle: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#1B4332', justifyContent: 'center', alignItems: 'center' },
  checkMark: { color: '#fff', fontWeight: '700', fontSize: 14 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 8 },
  required: { color: '#DC2626' },
  input: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 14, height: 50, fontSize: 14, color: '#111827', backgroundColor: '#F9FAFB', marginBottom: 4 },
  inputError: { borderColor: '#EF4444' },
  fieldError: { color: '#EF4444', fontSize: 12, marginBottom: 8 },
  nextBtn: { backgroundColor: '#1B4332', borderRadius: 12, height: 52, justifyContent: 'center', alignItems: 'center', marginTop: 24 },
  nextBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});