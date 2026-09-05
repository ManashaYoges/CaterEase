import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Edit2, CheckCircle2, RotateCcw } from 'lucide-react-native';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, fetchSignInMethodsForEmail } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { F, scaleFont } from '@/utils/fonts';
import KeyboardAwareScrollView from '@/components/KeyboardAwareScrollView';

const RESEND_COOLDOWN = 30;

export default function OtpScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { phone } = useLocalSearchParams<{ phone: string }>();

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(RESEND_COOLDOWN);
  const [canResend, setCanResend] = useState(false);
  const [resendNotice, setResendNotice] = useState('');

  const inputs = useRef<(TextInput | null)[]>([]);

  // Auto focus first OTP input on mount
  useEffect(() => {
    const timerTimeout = setTimeout(() => {
      inputs.current[0]?.focus();
    }, 300);

    return () => clearTimeout(timerTimeout);
  }, []);

  // Countdown timer for Resend OTP
  useEffect(() => {
    let interval: any = null;
    if (timer > 0) {
      setCanResend(false);
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else {
      setCanResend(true);
      if (interval) clearInterval(interval);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timer]);

  const handleChange = (text: string, index: number) => {
    const digits = text.replace(/\D/g, '');

    // Handle paste of full 6-digit code
    if (digits.length === 6 && index === 0) {
      const newOtp = digits.split('');
      setOtp(newOtp);
      inputs.current[5]?.focus();
      return;
    }

    const singleDigit = digits.slice(-1);
    const newOtp = [...otp];
    newOtp[index] = singleDigit;
    setOtp(newOtp);

    if (error) setError('');

    if (singleDigit) {
      if (index < 5) {
        inputs.current[index + 1]?.focus();
      } else {
        inputs.current[5]?.blur();
      }
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handleResendOtp = () => {
    if (!canResend) return;
    setOtp(['', '', '', '', '', '']);
    setError('');
    setTimer(RESEND_COOLDOWN);
    setCanResend(false);
    setResendNotice('New OTP has been sent!');
    setTimeout(() => {
      setResendNotice('');
      inputs.current[0]?.focus();
    }, 4000);
  };

  const handleVerifyOtp = async () => {
    const code = otp.join('');
    if (code.length < 6) {
      setError('Please enter the 6-digit OTP.');
      return;
    }

    setError('');
    setLoading(true);

    const cleanPhone = (phone || '').replace(/\D/g, '');
    const syntheticEmail = `${cleanPhone}@caterease.app`;
    const syntheticPassword = `CaterEase_OTP_Secret_${cleanPhone}`;

    try {
      let firebaseUser: any = auth.currentUser?.email === syntheticEmail ? auth.currentUser : null;

      if (!firebaseUser) {
        try {
          const cred = await signInWithEmailAndPassword(auth, syntheticEmail, syntheticPassword);
          firebaseUser = cred.user;
        } catch (signInErr: any) {
          let accountExists = false;

          try {
            const methods = await fetchSignInMethodsForEmail(auth, syntheticEmail);
            if (methods && methods.length > 0) {
              accountExists = true;
            }
          } catch (e) {
            // Ignore sign-in methods fetch error
          }

          if (!accountExists) {
            try {
              const q = query(collection(db, 'profiles'), where('phone', '==', cleanPhone));
              const querySnap = await getDocs(q);
              if (!querySnap.empty) {
                accountExists = true;
              }
            } catch (e) {
              // Ignore profile query error
            }
          }

          if (accountExists) {
            if (auth.currentUser) {
              firebaseUser = auth.currentUser;
            } else {
              try {
                const cred = await signInWithEmailAndPassword(auth, syntheticEmail, syntheticPassword);
                firebaseUser = cred.user;
              } catch (retryErr) {
                firebaseUser = auth.currentUser;
              }
            }
          } else {
            try {
              const cred = await createUserWithEmailAndPassword(auth, syntheticEmail, syntheticPassword);
              firebaseUser = cred.user;
            } catch (createErr: any) {
              if (createErr.code === 'auth/email-already-in-use') {
                if (auth.currentUser) {
                  firebaseUser = auth.currentUser;
                } else {
                  const cred = await signInWithEmailAndPassword(auth, syntheticEmail, syntheticPassword);
                  firebaseUser = cred.user;
                }
              } else {
                throw createErr;
              }
            }
          }
        }
      }

      const uid = firebaseUser?.uid || auth.currentUser?.uid;

      if (!uid) {
        throw new Error('Failed to authenticate session.');
      }

      let profileDocSnap = await getDoc(doc(db, 'profiles', uid));
      let isExistingUser = false;

      if (profileDocSnap.exists()) {
        const data = profileDocSnap.data();
        if (data && (data.onboardingCompleted === true || data.full_name)) {
          isExistingUser = true;
        }
      } else {
        const q = query(collection(db, 'profiles'), where('phone', '==', cleanPhone));
        const querySnap = await getDocs(q);
        if (!querySnap.empty) {
          const data = querySnap.docs[0].data();
          if (data && (data.onboardingCompleted === true || data.full_name)) {
            isExistingUser = true;
          }
        }
      }

      setLoading(false);

      if (isExistingUser) {
        router.replace('/(tabs)/dashboard');
      } else {
        router.replace({
          pathname: '/(auth)/setup-profile',
          params: { phone: cleanPhone },
        });
      }
    } catch (err: any) {
      console.error('Verification Error:', err);
      setLoading(false);
      setError(err.message || 'OTP verification failed. Please try again.');
    }
  };

  const isOtpComplete = otp.join('').length === 6;

  return (
    <View style={styles.container}>
      {/* Top Header Section */}
      <LinearGradient
        colors={['#1B5E20', '#2E7D32']}
        style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.headerBackBtn}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <ArrowLeft size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Enter OTP</Text>
          <View style={{ width: 36 }} />
        </View>
      </LinearGradient>

      <KeyboardAwareScrollView contentContainerStyle={styles.scroll}>
        {/* Phone Display */}
        <Text style={styles.subtitle}>Enter the 6-digit code sent to</Text>
        <View style={styles.phoneDisplayRow}>
          <Text style={styles.phoneText}>+91 {phone || 'XXXXXXXXXX'}</Text>
          <TouchableOpacity
            style={styles.editPhoneBtn}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Edit2 size={12} color="#1B4332" />
            <Text style={styles.editPhoneText}>Edit</Text>
          </TouchableOpacity>
        </View>

        {resendNotice ? (
          <View style={styles.noticeBanner}>
            <CheckCircle2 size={14} color="#059669" />
            <Text style={styles.noticeText}>{resendNotice}</Text>
          </View>
        ) : null}

        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

      {/* OTP 6-Digit Inputs */}
      <View style={styles.otpRow}>
        {otp.map((digit, i) => (
          <TextInput
            key={i}
            ref={(r) => {
              inputs.current[i] = r;
            }}
            style={[
              styles.otpInput,
              digit ? styles.otpFilled : null,
            ]}
            value={digit}
            onChangeText={(t) => handleChange(t, i)}
            onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, i)}
            keyboardType="number-pad"
            maxLength={6}
            textAlign="center"
            selectTextOnFocus
            returnKeyType={i === 5 ? 'done' : 'next'}
            onSubmitEditing={() => {
              if (i < 5) {
                inputs.current[i + 1]?.focus();
              } else {
                handleVerifyOtp();
              }
            }}
            textContentType="oneTimeCode"
            autoComplete="sms-otp"
          />
        ))}
      </View>

      {/* Verify OTP Button */}
      <TouchableOpacity
        style={[styles.btn, (!isOtpComplete || loading) && styles.btnDisabled]}
        onPress={handleVerifyOtp}
        disabled={!isOtpComplete || loading}
        activeOpacity={0.8}
      >
        {loading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={styles.btnText}>Verify OTP & Continue</Text>
        )}
      </TouchableOpacity>

      {/* Resend OTP Row & Countdown Timer */}
      <View style={styles.resendContainer}>
        {canResend ? (
          <TouchableOpacity
            style={styles.resendBtnActive}
            onPress={handleResendOtp}
          >
            <RotateCcw size={13} color="#1B4332" />
            <Text style={styles.resendActiveText}>Resend OTP</Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.resendDisabledText}>
            Resend OTP in <Text style={styles.timerText}>{timer}s</Text>
          </Text>
        )}
      </View>
    </KeyboardAwareScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 44,
  },
  headerBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: scaleFont(16),
    fontFamily: F.semibold,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  scroll: {
    flexGrow: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 22,
    paddingBottom: 24,
    paddingTop: 24,
  },
  subtitle: {
    fontSize: scaleFont(10.5),
    fontFamily: F.regular,
    color: '#6B7280',
    lineHeight: 15,
  },
  phoneDisplayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    marginBottom: 16,
  },
  phoneText: {
    fontSize: scaleFont(12.5),
    fontFamily: F.semibold,
    color: '#111827',
  },
  editPhoneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    backgroundColor: '#F0FDF4',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  editPhoneText: {
    fontSize: scaleFont(9.5),
    fontFamily: F.medium,
    color: '#1B4332',
  },
  noticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  noticeText: {
    fontSize: scaleFont(10),
    color: '#047857',
    fontFamily: F.regular,
  },
  errorBanner: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  errorText: {
    color: '#DC2626',
    fontSize: scaleFont(10),
    fontFamily: F.medium,
    textAlign: 'center',
  },
  otpRow: {
    flexDirection: 'row',
    gap: 7,
    marginBottom: 24,
    justifyContent: 'center',
  },
  otpInput: {
    width: 42,
    height: 48,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    fontSize: scaleFont(15),
    fontFamily: F.semibold,
    color: '#111827',
    backgroundColor: '#F9FAFB',
  },
  otpFilled: {
    borderColor: '#1B4332',
    backgroundColor: '#F0FDF4',
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
  btnText: {
    fontSize: scaleFont(12.5),
    fontFamily: F.semibold,
    color: '#fff',
  },
  resendContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  resendDisabledText: {
    fontSize: scaleFont(11),
    fontFamily: F.regular,
    color: '#9CA3AF',
  },
  timerText: {
    color: '#1B4332',
    fontFamily: F.semibold,
  },
  resendBtnActive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  resendActiveText: {
    fontSize: scaleFont(11),
    fontFamily: F.semibold,
    color: '#1B4332',
  },
});
