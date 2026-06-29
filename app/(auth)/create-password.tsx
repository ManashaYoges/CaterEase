import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Eye, EyeOff, Lock } from 'lucide-react-native';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

export default function CreatePasswordScreen() {
  const router = useRouter();
  const { phone, name } = useLocalSearchParams<{ phone: string; name: string }>();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    const cleanPhone = String(phone || '').replace(/\D/g, '');
    if (!cleanPhone || !name) { setError('Signup details are missing. Please start again.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setError('');
    setLoading(true);
    const email = `${cleanPhone}@caterease.app`;
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, 'profiles', cred.user.uid), {
        full_name: name,
        phone: cleanPhone,
        created_at: new Date().toISOString(),
      });
      setLoading(false);
      router.replace('/(tabs)/dashboard');
    } catch (err: any) {
      setLoading(false);
      if (err.code === 'auth/email-already-in-use') {
        setError('This phone number is already registered. Please login.');
      } else {
        setError(err.message || 'Something went wrong. Please try again.');
      }
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.container}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color="#1B4332" />
        </TouchableOpacity>

        <View style={styles.logoBox}>
          <Text style={styles.logoIcon}>🍽</Text>
        </View>
        <Text style={styles.logoText}>CaterEase</Text>

        <Text style={styles.title}>Create Password</Text>
        <Text style={styles.subtitle}>Set a secure password for your account</Text>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Text style={styles.label}>New Password <Text style={styles.required}>*</Text></Text>
        <View style={styles.inputRow}>
          <Lock size={18} color="#9CA3AF" style={styles.icon} />
          <TextInput
            style={styles.input}
            placeholder="Enter password (min 6 characters)"
            placeholderTextColor="#9CA3AF"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPass}
          />
          <TouchableOpacity onPress={() => setShowPass(!showPass)}>
            {showPass ? <EyeOff size={18} color="#9CA3AF" /> : <Eye size={18} color="#9CA3AF" />}
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Confirm Password <Text style={styles.required}>*</Text></Text>
        <View style={styles.inputRow}>
          <Lock size={18} color="#9CA3AF" style={styles.icon} />
          <TextInput
            style={styles.input}
            placeholder="Confirm your password"
            placeholderTextColor="#9CA3AF"
            value={confirm}
            onChangeText={setConfirm}
            secureTextEntry={!showConfirm}
          />
          <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)}>
            {showConfirm ? <EyeOff size={18} color="#9CA3AF" /> : <Eye size={18} color="#9CA3AF" />}
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.btn} onPress={handleCreate} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Create Account</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingHorizontal: 24, paddingTop: 56 },
  backBtn: { width: 40, height: 40, borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  logoBox: { width: 56, height: 56, backgroundColor: '#1B4332', borderRadius: 14, justifyContent: 'center', alignItems: 'center', alignSelf: 'center' },
  logoIcon: { fontSize: 24 },
  logoText: { fontSize: 20, fontWeight: '700', color: '#1B4332', textAlign: 'center', marginTop: 8, marginBottom: 32 },
  title: { fontSize: 26, fontWeight: '700', color: '#111827', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#6B7280', marginBottom: 28 },
  errorText: { color: '#DC2626', fontSize: 13, marginBottom: 12 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6 },
  required: { color: '#DC2626' },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 12, height: 50, backgroundColor: '#F9FAFB', marginBottom: 16 },
  icon: { marginRight: 8 },
  input: { flex: 1, fontSize: 14, color: '#111827' },
  btn: { backgroundColor: '#1B4332', borderRadius: 12, height: 52, justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  btnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
