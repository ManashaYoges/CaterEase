import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNewEvent } from '@/context/NewEventContext';
import { collection, getDocs, query, where, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Customer } from '@/types';
import StepIndicator from '@/components/StepIndicator';
import OnboardingGuidancePopup from '@/components/OnboardingGuidancePopup';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import KeyboardAwareScrollView from '@/components/KeyboardAwareScrollView';
import { F, scaleFont } from '@/utils/fonts';
import { T } from '@/utils/typography';
import Colors from '@/constants/Colors';

export default function CustomerDetailsScreen() {
  const router = useRouter();
  const { data, update } = useNewEvent();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { t } = useLanguage();

  const fullNameRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const addressRef = useRef<TextInput>(null);
  const notesRef = useRef<TextInput>(null);
  const searchRef = useRef<TextInput>(null);

  const [mode, setMode] = useState<'select' | 'new'>('select');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      const snapshot = await getDocs(
        query(collection(db, 'customers'), where('user_id', '==', user.uid))
      );
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }) as Customer);
      setCustomers(list);
      if (data.customerId) {
        const found = list.find(c => c.id === data.customerId);
        if (found) {
          setSelectedCustomer(found);
          setMode('select');
        } else if (data.customerName) {
          setMode('new');
        }
      } else if (data.customerName) {
        setMode('new');
      } else {
        setSelectedCustomer(null);
        setMode('select');
      }
      setLoading(false);
    };
    load();
  }, [user, data.customerId, data.customerName]);

  useEffect(() => {
    setFullName(data.customerName || '');
    setPhone(data.customerPhone || '');
    setAddress(data.customerAddress || '');
  }, [data.customerName, data.customerPhone, data.customerAddress]);

  const filtered = customers.filter(
    c =>
      c.full_name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search)
  );

  const handleSelectCustomer = (c: Customer) => {
    setSelectedCustomer(c);
  };

  const handleContinueWithSelected = () => {
    if (!selectedCustomer) {
      setErrors({ select: t('Please select a customer or add a new one.') });
      return;
    }
    update({
      customerId: selectedCustomer.id,
      customerName: selectedCustomer.full_name,
      customerPhone: selectedCustomer.phone,
      customerAddress: selectedCustomer.address || '',
      customerEmail: selectedCustomer.email || '',
    });
    router.push('/new-event');
  };

  const validateNew = () => {
    const e: Record<string, string> = {};
    if (!fullName.trim()) e.fullName = t('Full name is required');
    if (!phone.trim()) e.phone = t('Phone number is required');
    else if (phone.replace(/\D/g, '').length < 10) e.phone = t('Enter a valid 10-digit number');
    return e;
  };

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
        email: null,
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

      setSaving(false);
      router.push('/new-event');
    } catch (err: any) {
      setSaving(false);
      setErrors({ general: err.message || 'Failed to save customer' });
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient colors={['#1B5E20', '#1B5E20']} style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={18} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: Colors.white }]}>{t('Create Event')}</Text>
        <View style={{ width: 36 }} />
      </LinearGradient>

      <StepIndicator current={1} total={4} />

      <LinearGradient colors={['#1B5E20', '#2E7D32']} style={styles.topInfoBanner}>
        <Text style={[styles.title, { color: Colors.white }]}>{t('Customer Details')}</Text>
        <Text style={[styles.subtitle, { color: '#E8F5E9' }]}>{t('Select an existing customer or add a new one')}</Text>

        {/* Toggle between select and new */}
        <View style={styles.toggleRow}>
          <TouchableOpacity
            style={[styles.toggleBtn, mode === 'select' && styles.toggleBtnActive]}
            onPress={() => setMode('select')}
          >
            <Text style={[styles.toggleText, mode === 'select' && styles.toggleTextActive]}>
              {t('Existing Customer')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, mode === 'new' && styles.toggleBtnActive]}
            onPress={() => setMode('new')}
          >
            <Text style={[styles.toggleText, mode === 'new' && styles.toggleTextActive]}>
              {t('Add New')}
            </Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <KeyboardAwareScrollView disableKeyboardAvoidingView contentContainerStyle={styles.scroll}>

        <OnboardingGuidancePopup
          message={t('Fill the mandatory customer fields.')}
          pointerPosition="top"
          containerStyle={{ marginBottom: 12 }}
        />

        {mode === 'select' ? (
          <>
            <TextInput
              ref={searchRef}
              style={styles.searchInput}
              placeholder={t('Search by name or phone')}
              placeholderTextColor="#9CA3AF"
              value={search}
              onChangeText={setSearch}
              returnKeyType="search"
              onSubmitEditing={() => searchRef.current?.blur()}
            />
            {errors.select ? <Text style={styles.fieldError}>{errors.select}</Text> : null}
            {filtered.length === 0 ? (
              <Text style={styles.emptyText}>{t('No customers found. Add a new one.')}</Text>
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
              <Text style={styles.nextBtnText}>{t('Next: Event Details →')}</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            {errors.general ? <Text style={styles.fieldError}>{errors.general}</Text> : null}

            <Text style={styles.label}>{t('Full Name')} <Text style={styles.required}>*</Text></Text>
            <TextInput
              ref={fullNameRef}
              style={[styles.input, errors.fullName && styles.inputError]}
              placeholder="Sathish"
              placeholderTextColor="#9CA3AF"
              value={fullName}
              onChangeText={t => setFullName(t.replace(/[^a-zA-Z\s]/g, ''))}
              autoCapitalize="words"
              returnKeyType="next"
              onSubmitEditing={() => phoneRef.current?.focus()}
              blurOnSubmit={false}
            />
            {errors.fullName ? <Text style={styles.fieldError}>{errors.fullName}</Text> : null}

            <Text style={styles.label}>{t('Phone Number')} <Text style={styles.required}>*</Text></Text>
            <TextInput
              ref={phoneRef}
              style={[styles.input, errors.phone && styles.inputError]}
              placeholder="1234567890"
              placeholderTextColor="#9CA3AF"
              value={phone}
              onChangeText={t => setPhone(t.replace(/\D/g, '').slice(0, 10))}
              keyboardType="phone-pad"
              returnKeyType="next"
              onSubmitEditing={() => addressRef.current?.focus()}
              blurOnSubmit={false}
            />
            {errors.phone ? <Text style={styles.fieldError}>{errors.phone}</Text> : null}

            <Text style={styles.label}>{t('Address')}</Text>
            <TextInput
              ref={addressRef}
              style={styles.input}
              placeholder="Karaikudi, Sivagangai, Tamil Nadu"
              placeholderTextColor="#9CA3AF"
              value={address}
              onChangeText={setAddress}
              returnKeyType="next"
              onSubmitEditing={() => notesRef.current?.focus()}
              blurOnSubmit={false}
            />

            <Text style={styles.label}>{t('Notes (Optional)')}</Text>
            <TextInput
              ref={notesRef}
              style={[styles.input, { height: 72, textAlignVertical: 'top', paddingTop: 10 }]}
              placeholder="VIP Customer"
              placeholderTextColor="#9CA3AF"
              value={notes}
              onChangeText={setNotes}
              multiline
              returnKeyType="done"
              blurOnSubmit={true}
              onSubmitEditing={handleSaveNewAndContinue}
            />

            <TouchableOpacity
              style={[styles.nextBtn, saving && { opacity: 0.7 }]}
              onPress={handleSaveNewAndContinue}
              disabled={saving}
            >
              <Text style={styles.nextBtnText}>
                {saving ? t('Saving...') : t('Save & Next: Event Details →')}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </KeyboardAwareScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255, 255, 255, 0.15)' },
  backBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { ...T.h2, color: Colors.white },
  topInfoBanner: { padding: 16, paddingBottom: 16 },
  scroll: { padding: 16, paddingBottom: 20 },
  title: { ...T.pageTitle, fontSize: scaleFont(15.5), marginBottom: 2, color: Colors.white },
  subtitle: { ...T.bodySm, color: '#E8F5E9', marginBottom: 14 },
  toggleRow: { flexDirection: 'row', backgroundColor: 'rgba(255, 255, 255, 0.18)', borderRadius: 8, padding: 3 },
  toggleBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 6 },
  toggleBtnActive: { backgroundColor: Colors.white },
  toggleText: { fontSize: scaleFont(10.5), fontFamily: F.medium, color: Colors.white },
  toggleTextActive: { color: '#1B5E20', fontFamily: F.semibold },
  searchInput: { borderWidth: 1, borderColor: Colors.borderGreenLight, borderRadius: 10, paddingHorizontal: 12, height: 44, fontSize: scaleFont(11.5), color: Colors.textPrimary, backgroundColor: Colors.white, marginBottom: 10, fontFamily: F.regular },
  emptyText: { ...T.bodySm, color: Colors.textMuted, textAlign: 'center', marginVertical: 16 },
  customerCard: { borderWidth: 1, borderColor: Colors.borderGreenLight, borderRadius: 10, padding: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white },
  customerCardSelected: { borderColor: Colors.primary, backgroundColor: Colors.lightGreen },
  customerInfo: { flex: 1 },
  customerName: { ...T.customerName, marginBottom: 1, color: Colors.textPrimary },
  customerPhone: { ...T.caption, color: Colors.textSecondary },
  checkCircle: { width: 24, height: 24, borderRadius: 12, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  checkMark: { color: Colors.white, fontFamily: F.bold, fontSize: scaleFont(10.5) },
  label: { ...T.label, marginBottom: 4, marginTop: 6, color: Colors.textPrimary },
  required: { color: '#DC2626' },
  input: { borderWidth: 1, borderColor: Colors.borderGreenLight, borderRadius: 10, paddingHorizontal: 12, height: 44, fontSize: scaleFont(11.5), color: Colors.textPrimary, backgroundColor: Colors.white, marginBottom: 4, fontFamily: F.regular },
  inputError: { borderColor: '#EF4444' },
  fieldError: { color: '#EF4444', fontSize: scaleFont(9.5), marginBottom: 6 },
  nextBtn: { backgroundColor: Colors.primary, borderRadius: 10, height: 46, justifyContent: 'center', alignItems: 'center', marginTop: 20 },
  nextBtnText: { ...T.btnLg, fontSize: scaleFont(12.5), color: Colors.white },
});
