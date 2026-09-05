import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Phone, ArrowRight, ShieldCheck, CheckCircle2, Check } from 'lucide-react-native';
import { F, scaleFont } from '@/utils/fonts';
import { T } from '@/utils/typography';
import KeyboardAwareScrollView from '@/components/KeyboardAwareScrollView';

export default function LoginScreen() {
  const router = useRouter();
  const phoneRef = useRef<TextInput>(null);

  const [phone, setPhone] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handlePhoneChange = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, 10);
    setPhone(digits);
    if (error) setError('');
  };

  const handleGenerateOtp = async () => {
    const cleanPhone = phone.trim();
    if (!cleanPhone || cleanPhone.length < 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    if (!acceptedTerms) {
      setError('Please agree to the Terms of Service and Privacy Policy.');
      return;
    }

    setError('');
    setLoading(true);

    // Simulate OTP generation API call
    setTimeout(() => {
      setLoading(false);
      router.push({
        pathname: '/(auth)/otp',
        params: { phone: cleanPhone },
      });
    }, 600);
  };

  const isValid = phone.length === 10;

  return (
    <KeyboardAwareScrollView contentContainerStyle={styles.scroll}>
      {/* Background Decorative Accents */}
      <View style={styles.topDecor}>
        <View style={styles.leaf1} />
        <View style={styles.leaf2} />
      </View>

      {/* Header Branding */}
      <View style={styles.logoContainer}>
        <View style={styles.logoBox}>
          <Text style={styles.logoIcon}>🍽</Text>
        </View>
        <Text style={styles.logoText}>CaterEase</Text>
        <Text style={styles.logoSub}>CATERING MADE SIMPLE</Text>
      </View>

      {/* Hero Visual - Increased illustration size */}
      <View style={styles.heroWrapper}>
        <Image
          source={{ uri: 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg' }}
          style={styles.heroImage}
        />
        <View style={styles.premiumBadge}>
          <Text style={styles.premiumText}>✦ Premium Service</Text>
        </View>
      </View>

      {/* Welcome Text - Smiling Emoji */}
      <Text style={styles.welcomeTitle}>Welcome to CaterEase 😊</Text>

      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {/* Phone Input Field */}
      <Text style={styles.label}>
        Mobile Number <Text style={styles.required}>*</Text>
      </Text>
      <View style={[styles.phoneInputRow, isValid && styles.phoneInputRowValid]}>
        <View style={styles.countryCodeBadge}>
          <Text style={styles.flagEmoji}>🇮🇳</Text>
          <Text style={styles.countryCodeText}>+91</Text>
        </View>
        <View style={styles.divider} />
        <TextInput
          ref={phoneRef}
          style={styles.input}
          placeholder="Enter 10-digit mobile number"
          placeholderTextColor="#9CA3AF"
          value={phone}
          onChangeText={handlePhoneChange}
          keyboardType="number-pad"
          maxLength={10}
          autoFocus={true}
          returnKeyType="done"
          onSubmitEditing={handleGenerateOtp}
        />
        {isValid ? (
          <CheckCircle2 size={16} color="#10B981" style={{ marginRight: 10 }} />
        ) : null}
      </View>

      {/* Terms & Privacy Consent Box */}
      <TouchableOpacity
        style={styles.consentBox}
        onPress={() => setAcceptedTerms(!acceptedTerms)}
        activeOpacity={0.7}
      >
        <View style={[styles.checkbox, acceptedTerms && styles.checkboxChecked]}>
          {acceptedTerms ? <Check size={12} color="#fff" strokeWidth={3} /> : null}
        </View>
        <Text style={styles.consentText}>
          I agree to the Terms of Service and Privacy Policy.
        </Text>
      </TouchableOpacity>

      {/* Generate OTP Button */}
      <TouchableOpacity
        style={[styles.btn, (!isValid || !acceptedTerms || loading) && styles.btnDisabled]}
        onPress={handleGenerateOtp}
        disabled={!isValid || !acceptedTerms || loading}
        activeOpacity={0.8}
      >
        {loading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <View style={styles.btnContent}>
            <Text style={styles.btnText}>Generate OTP</Text>
            <ArrowRight size={16} color="#fff" />
          </View>
        )}
      </TouchableOpacity>
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 22,
    paddingTop: 44,
    paddingBottom: 24,
  },
  topDecor: { position: 'absolute', top: 0, right: 0 },
  leaf1: {
    width: 80,
    height: 110,
    backgroundColor: '#D1FAE5',
    borderBottomLeftRadius: 80,
    opacity: 0.5,
  },
  leaf2: {
    width: 45,
    height: 75,
    backgroundColor: '#A7F3D0',
    borderBottomLeftRadius: 45,
    opacity: 0.4,
    marginTop: -20,
    alignSelf: 'flex-end',
  },
  logoContainer: { alignItems: 'center', marginTop: 6 },
  logoBox: {
    width: 48,
    height: 48,
    backgroundColor: '#1B4332',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#1B4332',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  logoIcon: { fontSize: scaleFont(17) },
  logoText: {
    fontSize: scaleFont(16),
    fontFamily: F.semibold,
    color: '#1B4332',
    marginTop: 6,
  },
  logoSub: {
    fontSize: scaleFont(8.5),
    fontFamily: F.medium,
    color: '#6B7280',
    letterSpacing: 1.2,
    marginTop: 1,
  },
  heroWrapper: {
    width: '100%',
    marginTop: 16,
    alignItems: 'center',
  },
  heroImage: {
    width: '100%',
    height: 175,
    borderRadius: 16,
    resizeMode: 'cover',
  },
  premiumBadge: {
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 13,
    paddingVertical: 4,
    marginTop: -14,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
    borderWidth: 1,
    borderColor: '#ECFDF5',
  },
  premiumText: {
    fontSize: scaleFont(9),
    color: '#1B4332',
    fontFamily: F.semibold,
  },
  welcomeTitle: {
    fontSize: scaleFont(15.5),
    fontFamily: F.semibold,
    color: '#111827',
    marginTop: 18,
    textAlign: 'center',
    marginBottom: 16,
  },
  errorBanner: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 10,
    paddingVertical: 7,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  errorText: {
    color: '#DC2626',
    fontSize: scaleFont(10),
    fontFamily: F.medium,
    textAlign: 'center',
  },
  label: { ...T.label, marginBottom: 6, fontSize: scaleFont(10) },
  required: { color: '#DC2626' },
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    height: 48,
    backgroundColor: '#F9FAFB',
    marginBottom: 16,
    paddingLeft: 12,
  },
  phoneInputRowValid: {
    borderColor: '#10B981',
    backgroundColor: '#F0FDF4',
  },
  countryCodeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingRight: 8,
  },
  flagEmoji: { fontSize: scaleFont(13) },
  countryCodeText: {
    fontSize: scaleFont(11.5),
    fontFamily: F.medium,
    color: '#111827',
  },
  divider: {
    width: 1,
    height: 22,
    backgroundColor: '#D1D5DB',
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: scaleFont(12),
    fontFamily: F.regular,
    color: '#111827',
    letterSpacing: 0.5,
  },
  consentBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#ECFDF5',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    marginBottom: 16,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#059669',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  consentText: {
    fontSize: scaleFont(9.5),
    fontFamily: F.regular,
    color: '#047857',
    flex: 1,
  },
  btn: {
    backgroundColor: '#1B4332',
    borderRadius: 12,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#1B4332',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  btnDisabled: {
    backgroundColor: '#9CA3AF',
    shadowOpacity: 0,
    elevation: 0,
  },
  btnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  btnText: {
    fontSize: scaleFont(12.5),
    fontFamily: F.semibold,
    color: '#fff',
  },
});
