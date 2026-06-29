import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';

export default function OtpScreen() {
  const router = useRouter();
  const { phone, name } = useLocalSearchParams<{ phone: string; name: string }>();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const inputs = useRef<(TextInput | null)[]>([]);

  const handleChange = (text: string, index: number) => {
    const digit = text.replace(/\D/g, '').slice(-1);
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);
    if (digit && index < 5) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handleVerify = () => {
    const code = otp.join('');
    if (code.length < 6) { setError('Please enter the 6-digit OTP.'); return; }
    // For demo, OTP is 123456
    if (code !== '123456') { setError('Invalid OTP. Use 123456 for demo.'); return; }
    setError('');
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      router.push({ pathname: '/(auth)/create-password', params: { phone, name } });
    }, 600);
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

        <Text style={styles.title}>Verify OTP</Text>
        <Text style={styles.subtitle}>
          Enter the 6-digit code sent to{'\n'}+91 {phone}
        </Text>
        <Text style={styles.demoNote}>(Demo: use 123456)</Text>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <View style={styles.otpRow}>
          {otp.map((digit, i) => (
            <TextInput
              key={i}
              ref={(r) => { inputs.current[i] = r; }}
              style={[styles.otpInput, digit ? styles.otpFilled : null]}
              value={digit}
              onChangeText={(t) => handleChange(t, i)}
              onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, i)}
              keyboardType="numeric"
              maxLength={1}
              textAlign="center"
            />
          ))}
        </View>

        <TouchableOpacity style={styles.btn} onPress={handleVerify} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Verify OTP</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={styles.resendRow} onPress={() => {}}>
          <Text style={styles.resendText}>Didn't receive? </Text>
          <Text style={styles.resendLink}>Resend OTP</Text>
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
  subtitle: { fontSize: 14, color: '#6B7280', marginBottom: 4, lineHeight: 22 },
  demoNote: { fontSize: 12, color: '#1B4332', marginBottom: 20, fontStyle: 'italic' },
  errorText: { color: '#DC2626', fontSize: 13, marginBottom: 12 },
  otpRow: { flexDirection: 'row', gap: 10, marginBottom: 32, justifyContent: 'center' },
  otpInput: {
    width: 48, height: 56, borderWidth: 1.5, borderColor: '#E5E7EB',
    borderRadius: 12, fontSize: 22, fontWeight: '700', color: '#111827',
    backgroundColor: '#F9FAFB',
  },
  otpFilled: { borderColor: '#1B4332', backgroundColor: '#F0FDF4' },
  btn: { backgroundColor: '#1B4332', borderRadius: 12, height: 52, justifyContent: 'center', alignItems: 'center' },
  btnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  resendRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  resendText: { fontSize: 14, color: '#6B7280' },
  resendLink: { fontSize: 14, color: '#1B4332', fontWeight: '700' },
});
