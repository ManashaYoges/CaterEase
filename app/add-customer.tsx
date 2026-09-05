import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Switch, ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Upload } from 'lucide-react-native';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import KeyboardAwareScrollView from '@/components/KeyboardAwareScrollView';
import { F, scaleFont } from '@/utils/fonts';
import { T } from '@/utils/typography';

interface Props {
  onSaved?: (customerId: string, customerName: string, customerPhone: string) => void;
}

export default function AddCustomerScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ fromEvent?: string }>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { t } = useLanguage();

  const fullNameRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const addressRef = useRef<TextInput>(null);
  const notesRef = useRef<TextInput>(null);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [addToContacts, setAddToContacts] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!fullName.trim()) e.fullName = t('Full name is required');
    if (!phone.trim()) e.phone = t('Phone number is required');
    else if (phone.length < 10) e.phone = t('Enter a valid 10-digit number');
    return e;
  };

  const handleSave = async () => {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    if (!user) {
      setErrors({ general: t('Please login again before saving a customer') });
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      await addDoc(collection(db, 'customers'), {
        full_name: fullName.trim(),
        phone,
        address: address.trim() || null,
        notes: notes.trim() || null,
        add_to_contacts: addToContacts,
        user_id: user.uid,
        created_at: new Date().toISOString(),
      });
      setLoading(false);
      router.back();
    } catch (err: any) {
      setLoading(false);
      setErrors({ general: err.message || 'Failed to save customer' });
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={18} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('Add Customer')}</Text>
        <View style={{ width: 36 }} />
      </View>

      <KeyboardAwareScrollView contentContainerStyle={styles.scroll}>
        {errors.general ? <Text style={styles.errorText}>{errors.general}</Text> : null}

        <Text style={styles.label}>{t('Full Name')} <Text style={styles.required}>*</Text></Text>
        <TextInput
          ref={fullNameRef}
          style={[styles.input, errors.fullName ? styles.inputError : null]}
          placeholder="Sathish"
          placeholderTextColor="#9CA3AF"
          value={fullName}
          onChangeText={(t) => setFullName(t.replace(/[^a-zA-Z\s]/g, ''))}
          autoCapitalize="words"
          returnKeyType="next"
          onSubmitEditing={() => phoneRef.current?.focus()}
          blurOnSubmit={false}
        />
        {errors.fullName ? <Text style={styles.fieldError}>{errors.fullName}</Text> : null}

        <Text style={styles.label}>{t('Phone Number')} <Text style={styles.required}>*</Text></Text>
        <TextInput
          ref={phoneRef}
          style={[styles.input, errors.phone ? styles.inputError : null]}
          placeholder="1234567891"
          placeholderTextColor="#9CA3AF"
          value={phone}
          onChangeText={(t) => setPhone(t.replace(/\D/g, ''))}
          keyboardType="numeric"
          maxLength={10}
          returnKeyType="next"
          onSubmitEditing={() => addressRef.current?.focus()}
          blurOnSubmit={false}
        />
        {errors.phone ? <Text style={styles.fieldError}>{errors.phone}</Text> : null}

        <View style={styles.importRow}>
          <Text style={styles.importLabel}>{t('Import Contact')}</Text>
          <TouchableOpacity style={styles.importBtn}>
            <Upload size={16} color="#6B7280" />
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>{t('Address')}</Text>
        <TextInput
          ref={addressRef}
          style={[styles.input, styles.multiline]}
          placeholder="Karaikudi, Sivagangai, Tamil Nadu"
          placeholderTextColor="#9CA3AF"
          value={address}
          onChangeText={setAddress}
          multiline
          numberOfLines={3}
          returnKeyType="next"
          blurOnSubmit={false}
          onSubmitEditing={() => notesRef.current?.focus()}
        />

        <Text style={styles.label}>{t('Notes (Optional)')}</Text>
        <TextInput
          ref={notesRef}
          style={[styles.input, styles.multiline]}
          placeholder="VIP Customer"
          placeholderTextColor="#9CA3AF"
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={2}
          returnKeyType="done"
          blurOnSubmit={true}
          onSubmitEditing={handleSave}
        />

        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>{t('Add to Contacts')}</Text>
          <Switch
            value={addToContacts}
            onValueChange={setAddToContacts}
            trackColor={{ false: '#E5E7EB', true: '#1B4332' }}
            thumbColor="#fff"
          />
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>{t('Save Customer')}</Text>}
        </TouchableOpacity>
      </KeyboardAwareScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  backBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { ...T.h2 },
  scroll: { padding: 16, paddingBottom: 20 },
  errorText: { color: '#DC2626', fontSize: scaleFont(10.5), marginBottom: 10, backgroundColor: '#FEF2F2', padding: 8, borderRadius: 8 },
  label: { ...T.label, marginBottom: 6, marginTop: 10 },
  required: { color: '#DC2626' },
  input: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 12, height: 44, fontSize: scaleFont(11.5), color: '#111827', backgroundColor: '#fff', marginBottom: 4, fontFamily: F.regular },
  inputError: { borderColor: '#EF4444' },
  multiline: { height: 72, paddingTop: 10, textAlignVertical: 'top' },
  fieldError: { color: '#EF4444', fontSize: scaleFont(9.5), marginBottom: 6, marginTop: 1 },
  importRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, marginTop: 4 },
  importLabel: { ...T.label },
  importBtn: { width: 34, height: 34, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, paddingHorizontal: 12, backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB', marginTop: 10, marginBottom: 4 },
  toggleLabel: { fontSize: scaleFont(11.5), fontFamily: F.medium, color: '#111827' },
  saveBtn: { backgroundColor: '#1B4332', borderRadius: 12, height: 48, justifyContent: 'center', alignItems: 'center', marginTop: 24 },
  saveBtnText: { ...T.btnLg, fontSize: scaleFont(12.5) },
});
