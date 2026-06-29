import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform, Switch, ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Upload } from 'lucide-react-native';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Props {
  onSaved?: (customerId: string, customerName: string, customerPhone: string) => void;
}

export default function AddCustomerScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ fromEvent?: string }>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [addToContacts, setAddToContacts] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!fullName.trim()) e.fullName = 'Full name is required';
    if (!phone.trim()) e.phone = 'Phone number is required';
    else if (phone.length < 10) e.phone = 'Enter a valid 10-digit number';
    return e;
  };

  const handleSave = async () => {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    if (!user) {
      setErrors({ general: 'Please login again before saving a customer' });
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      const docRef = await addDoc(collection(db, 'customers'), {
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
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <ArrowLeft size={20} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add Customer</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {errors.general ? <Text style={styles.errorText}>{errors.general}</Text> : null}

          <Text style={styles.label}>Full Name <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={[styles.input, errors.fullName ? styles.inputError : null]}
            placeholder="Sathish"
            placeholderTextColor="#9CA3AF"
            value={fullName}
            onChangeText={(t) => setFullName(t.replace(/[^a-zA-Z\s]/g, ''))}
            autoCapitalize="words"
          />
          {errors.fullName ? <Text style={styles.fieldError}>{errors.fullName}</Text> : null}

          <Text style={styles.label}>Phone Number <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={[styles.input, errors.phone ? styles.inputError : null]}
            placeholder="1234567891"
            placeholderTextColor="#9CA3AF"
            value={phone}
            onChangeText={(t) => setPhone(t.replace(/\D/g, ''))}
            keyboardType="numeric"
            maxLength={10}
          />
          {errors.phone ? <Text style={styles.fieldError}>{errors.phone}</Text> : null}

          <View style={styles.importRow}>
            <Text style={styles.importLabel}>Import Contact</Text>
            <TouchableOpacity style={styles.importBtn}>
              <Upload size={18} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Address</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            placeholder="Karaikudi, Sivagangai, Tamil Nadu"
            placeholderTextColor="#9CA3AF"
            value={address}
            onChangeText={setAddress}
            multiline
            numberOfLines={3}
          />

          <Text style={styles.label}>Notes (Optional)</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            placeholder="VIP Customer"
            placeholderTextColor="#9CA3AF"
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={2}
          />

          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Add to Contacts</Text>
            <Switch
              value={addToContacts}
              onValueChange={setAddToContacts}
              trackColor={{ false: '#E5E7EB', true: '#1B4332' }}
              thumbColor="#fff"
            />
          </View>

          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save Customer</Text>}
          </TouchableOpacity>
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
  errorText: { color: '#DC2626', fontSize: 13, marginBottom: 12, backgroundColor: '#FEF2F2', padding: 10, borderRadius: 8 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 4 },
  required: { color: '#DC2626' },
  input: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 14, height: 50, fontSize: 14, color: '#111827', backgroundColor: '#fff', marginBottom: 4 },
  inputError: { borderColor: '#EF4444' },
  multiline: { height: 80, paddingTop: 14, textAlignVertical: 'top' },
  fieldError: { color: '#EF4444', fontSize: 12, marginBottom: 8, marginTop: 2 },
  importRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, marginTop: 4 },
  importLabel: { fontSize: 14, fontWeight: '600', color: '#374151' },
  importBtn: { width: 36, height: 36, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, marginBottom: 16 },
  toggleLabel: { fontSize: 15, fontWeight: '600', color: '#111827' },
  saveBtn: { backgroundColor: '#1B4332', borderRadius: 12, height: 52, justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
