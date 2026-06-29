import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, ScrollView, Platform, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Phone } from 'lucide-react-native';

export default function SignupScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePhoneChange = (text: string) => {
    const digits = text.replace(/\D/g, '');
    setPhone(digits);
  };

  const handleSendOtp = async () => {
    if (!name.trim()) { setError('Please enter your name.'); return; }
    if (phone.length < 10) { setError('Please enter a valid 10-digit phone number.'); return; }
    setError('');
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      router.push({ pathname: '/(auth)/otp', params: { phone, name } });
    }, 800);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color="#1B4332" />
        </TouchableOpacity>

        <View style={styles.logoBox}>
          <Text style={styles.logoIcon}>🍽</Text>
        </View>
        <Text style={styles.logoText}>CaterEase</Text>

        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Enter your phone number to get started</Text>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Text style={styles.label}>Full Name <Text style={styles.required}>*</Text></Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your full name"
          placeholderTextColor="#9CA3AF"
          value={name}
          onChangeText={(t) => setName(t.replace(/[^a-zA-Z\s]/g, ''))}
          autoCapitalize="words"
        />

        <Text style={styles.label}>Phone Number <Text style={styles.required}>*</Text></Text>
        <View style={styles.inputRow}>
          <Phone size={18} color="#9CA3AF" style={styles.inputIcon} />
          <TextInput
            style={styles.input2}
            placeholder="Enter your 10-digit phone number"
            placeholderTextColor="#9CA3AF"
            value={phone}
            onChangeText={handlePhoneChange}
            keyboardType="numeric"
            maxLength={10}
          />
        </View>

        <TouchableOpacity style={styles.btn} onPress={handleSendOtp} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Send OTP</Text>}
        </TouchableOpacity>

        <View style={styles.loginRow}>
          <Text style={styles.loginText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => router.replace('/(auth)')}>
            <Text style={styles.loginLink}>Login</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, backgroundColor: '#fff', paddingHorizontal: 24, paddingBottom: 32, paddingTop: 56 },
  backBtn: { width: 40, height: 40, borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  logoBox: { width: 56, height: 56, backgroundColor: '#1B4332', borderRadius: 14, justifyContent: 'center', alignItems: 'center', alignSelf: 'center' },
  logoIcon: { fontSize: 24 },
  logoText: { fontSize: 20, fontWeight: '700', color: '#1B4332', textAlign: 'center', marginTop: 8, marginBottom: 32 },
  title: { fontSize: 26, fontWeight: '700', color: '#111827', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#6B7280', marginBottom: 28 },
  errorText: { color: '#DC2626', fontSize: 13, marginBottom: 12 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6 },
  required: { color: '#DC2626' },
  input: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 14, height: 50, fontSize: 14, color: '#111827', backgroundColor: '#F9FAFB', marginBottom: 16 },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 12, height: 50, backgroundColor: '#F9FAFB', marginBottom: 16 },
  inputIcon: { marginRight: 8 },
  input2: { flex: 1, fontSize: 14, color: '#111827' },
  btn: { backgroundColor: '#1B4332', borderRadius: 12, height: 52, justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  btnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  loginRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  loginText: { fontSize: 14, color: '#6B7280' },
  loginLink: { fontSize: 14, color: '#1B4332', fontWeight: '700' },
});
