import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform, Image, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Eye, EyeOff, Mail, Lock, ArrowRight } from 'lucide-react-native';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export default function LoginScreen() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!identifier || !password) {
      setError('Please enter your email/phone and password.');
      return;
    }
    setError('');
    setLoading(true);
    const trimmedIdentifier = identifier.trim();
    const email = trimmedIdentifier.includes('@')
      ? trimmedIdentifier.toLowerCase()
      : `${trimmedIdentifier.replace(/\D/g, '')}@caterease.app`;
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.replace('/(tabs)/dashboard');
    } catch (err: any) {
      setError('Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.topDecor}>
          <View style={styles.leaf1} />
          <View style={styles.leaf2} />
        </View>

        <View style={styles.logoContainer}>
          <View style={styles.logoBox}>
            <Text style={styles.logoIcon}>🍽</Text>
          </View>
          <Text style={styles.logoText}>CaterEase</Text>
          <Text style={styles.logoSub}>CATERING MADE SIMPLE</Text>
        </View>

        <Image
          source={{ uri: 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg' }}
          style={styles.heroImage}
        />

        <View style={styles.premiumBadge}>
          <Text style={styles.premiumText}>✦ Premium Service</Text>
        </View>

        <Text style={styles.welcomeTitle}>Welcome Back! 😊</Text>
        <Text style={styles.welcomeSub}>Login to continue managing your events</Text>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Text style={styles.label}>Email or Phone</Text>
        <View style={styles.inputRow}>
          <Mail size={18} color="#9CA3AF" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Enter your email or phone"
            placeholderTextColor="#9CA3AF"
            value={identifier}
            onChangeText={setIdentifier}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        <View style={styles.passwordHeader}>
          <Text style={styles.label}>Password</Text>
          <TouchableOpacity onPress={() => {}}>
            <Text style={styles.forgotText}>Forgot Password?</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.inputRow}>
          <Lock size={18} color="#9CA3AF" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Enter your password"
            placeholderTextColor="#9CA3AF"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPass}
          />
          <TouchableOpacity onPress={() => setShowPass(!showPass)}>
            {showPass ? <EyeOff size={18} color="#9CA3AF" /> : <Eye size={18} color="#9CA3AF" />}
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.loginBtn} onPress={handleLogin} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.loginBtnText}>Login</Text>
              <ArrowRight size={20} color="#fff" />
            </>
          )}
        </TouchableOpacity>

        <View style={styles.signupRow}>
          <Text style={styles.signupText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/signup')}>
            <Text style={styles.signupLink}>Sign up</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, backgroundColor: '#fff', paddingHorizontal: 24, paddingBottom: 32 },
  topDecor: { position: 'absolute', top: 0, right: 0 },
  leaf1: { width: 80, height: 120, backgroundColor: '#D1FAE5', borderBottomLeftRadius: 80, opacity: 0.5 },
  leaf2: { width: 50, height: 80, backgroundColor: '#A7F3D0', borderBottomLeftRadius: 50, opacity: 0.4, marginTop: -20, alignSelf: 'flex-end' },
  logoContainer: { alignItems: 'center', paddingTop: 48 },
  logoBox: { width: 64, height: 64, backgroundColor: '#1B4332', borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  logoIcon: { fontSize: 28 },
  logoText: { fontSize: 22, fontWeight: '700', color: '#1B4332', marginTop: 8 },
  logoSub: { fontSize: 11, color: '#6B7280', letterSpacing: 1.5, marginTop: 2 },
  heroImage: { width: '100%', height: 180, borderRadius: 16, marginTop: 24, resizeMode: 'cover' },
  premiumBadge: {
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    alignSelf: 'center',
    marginTop: -20,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  premiumText: { fontSize: 12, color: '#1B4332', fontWeight: '600' },
  welcomeTitle: { fontSize: 22, fontWeight: '700', color: '#111827', marginTop: 24, textAlign: 'center' },
  welcomeSub: { fontSize: 14, color: '#6B7280', marginTop: 4, textAlign: 'center', marginBottom: 24 },
  errorText: { color: '#DC2626', fontSize: 13, marginBottom: 8, textAlign: 'center' },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6 },
  passwordHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  forgotText: { fontSize: 13, color: '#1B4332', fontWeight: '500' },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10,
    paddingHorizontal: 12, height: 50, backgroundColor: '#F9FAFB', marginBottom: 4,
  },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, fontSize: 14, color: '#111827' },
  loginBtn: {
    backgroundColor: '#1B4332', borderRadius: 12, height: 52,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginTop: 24, gap: 8,
  },
  loginBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  signupRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  signupText: { fontSize: 14, color: '#6B7280' },
  signupLink: { fontSize: 14, color: '#1B4332', fontWeight: '700' },
});
