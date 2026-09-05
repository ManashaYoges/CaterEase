import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  TextInput, ActivityIndicator, Platform, Image, Alert, Keyboard,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Camera, User, Phone, MapPin, UtensilsCrossed, Building2 } from 'lucide-react-native';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import KeyboardAwareScrollView from '@/components/KeyboardAwareScrollView';
import { F, scaleFont } from '@/utils/fonts';
import { T } from '@/utils/typography';

export default function SetupProfileScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ phone?: string }>();

  const ownerNameRef = useRef<TextInput>(null);
  const cateringNameRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const businessPlaceRef = useRef<TextInput>(null);
  const businessStateRef = useRef<TextInput>(null);

  const [fullName, setFullName] = useState('');
  const [cateringName, setCateringName] = useState('');
  const [phone, setPhone] = useState(params.phone || '');
  const [businessPlace, setBusinessPlace] = useState('');
  const [businessState, setBusinessState] = useState('');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [isOnboarded, setIsOnboarded] = useState(false);

  useEffect(() => {
    if (params.phone && !phone) {
      setPhone(params.phone);
    }
  }, [params.phone]);

  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      try {
        const snap = await getDoc(doc(db, 'profiles', user.uid));
        if (snap.exists()) {
          const data = snap.data();
          if (data.full_name) setFullName(data.full_name);
          if (data.catering_name) setCateringName(data.catering_name);
          if (data.phone && !params.phone) setPhone(data.phone);
          if (data.business_place) setBusinessPlace(data.business_place);
          if (data.business_state) setBusinessState(data.business_state);
          if (data.profile_image) setProfileImage(data.profile_image);
          if (data.onboardingCompleted) setIsOnboarded(true);
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
      }
    };
    fetchProfile();
  }, [user]);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photo library.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setProfileImage(result.assets[0].uri);
    }
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!fullName.trim()) e.fullName = 'Name is required';
    if (!cateringName.trim()) e.cateringName = 'Catering name is required';
    if (!phone.trim()) e.phone = 'Phone number is required';
    else if (phone.replace(/\D/g, '').length < 10) e.phone = 'Enter a valid 10-digit number';
    if (!businessPlace.trim()) e.businessPlace = 'Place of business is required';
    if (!businessState.trim()) e.businessState = 'State of business is required';
    return e;
  };

  const handleSave = async () => {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    if (!user) return;
    setSaving(true);
    try {
      const profileData: any = {
        user_id: user.uid,
        full_name: fullName.trim(),
        catering_name: cateringName.trim(),
        phone: phone.trim(),
        business_place: businessPlace.trim(),
        business_state: businessState.trim(),
        profile_image: profileImage || null,
        updated_at: new Date().toISOString(),
      };
      if (isOnboarded) {
        profileData.onboardingCompleted = true;
      }
      await setDoc(doc(db, 'profiles', user.uid), profileData, { merge: true });
      if (isOnboarded) {
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace('/(tabs)/more' as any);
        }
      } else {
        router.replace('/(auth)/setup-menu' as any);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = async () => {
    if (user) {
      try {
        const skipData: any = {
          user_id: user.uid,
          phone: (phone || params.phone || '').trim(),
          full_name: fullName.trim() || 'Catering Owner',
          catering_name: cateringName.trim(),
          business_state: businessState.trim(),
          updated_at: new Date().toISOString(),
        };
        if (isOnboarded) {
          skipData.onboardingCompleted = true;
        }
        await setDoc(doc(db, 'profiles', user.uid), skipData, { merge: true });
      } catch (err) {
        console.error('Error saving profile on skip:', err);
      }
    }
    if (isOnboarded) {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(tabs)/more' as any);
      }
    } else {
      router.replace('/(auth)/setup-menu' as any);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header with Dashboard dark green background */}
      <LinearGradient colors={['#1B5E20', '#2E7D32']} style={styles.header}>
        <View style={styles.logoRow}>
          <View style={styles.logoBox}>
            <Text style={styles.logoIcon}>🍽</Text>
          </View>
          <Text style={styles.logoText}>CaterEase</Text>
        </View>
        {/* Step indicator — step 3 of 4 */}
        <View style={styles.stepRow}>
          {[1, 2, 3, 4].map(s => (
            <View key={s} style={[
              styles.stepDot,
              s <= 3 && styles.stepDotDone,
              s === 3 && styles.stepDotCurrent,
            ]}>
              <Text style={[
                styles.stepDotText,
                s <= 3 && styles.stepDotTextDone,
                s === 3 && styles.stepDotTextCurrent,
              ]}>
                {s < 3 ? '✓' : s}
              </Text>
            </View>
          ))}
          <View style={styles.stepLine} />
        </View>

        <Text style={styles.title}>Set Up Your Profile</Text>
        <Text style={styles.subtitle}>
          Tell us about yourself and your catering business.
        </Text>
      </LinearGradient>

      <KeyboardAwareScrollView
        disableKeyboardAvoidingView={false}
        extraHeight={280}
        targetTopOffset={90}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
        contentContainerStyle={styles.scroll}
      >

        {/* Profile image picker */}
        <View style={styles.imagePicker}>
          <TouchableOpacity style={styles.imageCircle} onPress={pickImage}>
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.profileImg} />
            ) : (
              <View style={styles.imageEmpty}>
                <User size={32} color="#9CA3AF" />
              </View>
            )}
            <View style={styles.cameraBtn}>
              <Camera size={12} color="#fff" />
            </View>
          </TouchableOpacity>
          <Text style={styles.imageHint}>Tap to add profile photo</Text>
        </View>

        {/* Full Name */}
        <Text style={styles.label}>
          Catering Owner Name <Text style={styles.required}>*</Text>
        </Text>
        <View style={[styles.inputRow, errors.fullName && styles.inputRowError]}>
          <User size={16} color="#9CA3AF" />
          <TextInput
            ref={ownerNameRef}
            style={styles.input}
            placeholder="e.g. Sathish Kumar"
            placeholderTextColor="#9CA3AF"
            value={fullName}
            onChangeText={t => setFullName(t.replace(/[^a-zA-Z\s]/g, ''))}
            autoCapitalize="words"
            returnKeyType="next"
            onSubmitEditing={() => cateringNameRef.current?.focus()}
            blurOnSubmit={false}
          />
        </View>
        {errors.fullName ? <Text style={styles.fieldError}>{errors.fullName}</Text> : null}

        {/* Catering Name */}
        <Text style={styles.label}>
          Catering Name <Text style={styles.required}>*</Text>
        </Text>
        <View style={[styles.inputRow, errors.cateringName && styles.inputRowError]}>
          <UtensilsCrossed size={16} color="#9CA3AF" />
          <TextInput
            ref={cateringNameRef}
            style={styles.input}
            placeholder="e.g. Royal Catering Services"
            placeholderTextColor="#9CA3AF"
            value={cateringName}
            onChangeText={setCateringName}
            autoCapitalize="words"
            returnKeyType="next"
            onSubmitEditing={() => phoneRef.current?.focus()}
            blurOnSubmit={false}
          />
        </View>
        {errors.cateringName ? <Text style={styles.fieldError}>{errors.cateringName}</Text> : null}

        {/* Phone */}
        <Text style={styles.label}>
          Mobile Number <Text style={styles.required}>*</Text>
        </Text>
        <View style={[styles.inputRow, errors.phone && styles.inputRowError]}>
          <Phone size={16} color="#9CA3AF" />
          <TextInput
            ref={phoneRef}
            style={styles.input}
            placeholder="10-digit mobile number"
            placeholderTextColor="#9CA3AF"
            value={phone}
            onChangeText={t => setPhone(t.replace(/\D/g, '').slice(0, 10))}
            keyboardType="phone-pad"
            returnKeyType="next"
            onSubmitEditing={() => businessPlaceRef.current?.focus()}
            blurOnSubmit={false}
          />
        </View>
        {errors.phone ? <Text style={styles.fieldError}>{errors.phone}</Text> : null}

        {/* Place of Business */}
        <Text style={styles.label}>
          Place of Business <Text style={styles.required}>*</Text>
        </Text>
        <View style={[styles.inputRow, errors.businessPlace && styles.inputRowError]}>
          <MapPin size={16} color="#9CA3AF" />
          <TextInput
            ref={businessPlaceRef}
            style={styles.input}
            placeholder="e.g. Chennai"
            placeholderTextColor="#9CA3AF"
            value={businessPlace}
            onChangeText={setBusinessPlace}
            autoCapitalize="words"
            returnKeyType="next"
            onSubmitEditing={() => businessStateRef.current?.focus()}
            blurOnSubmit={false}
          />
        </View>
        {errors.businessPlace ? <Text style={styles.fieldError}>{errors.businessPlace}</Text> : null}

        {/* State of Business */}
        <Text style={styles.label}>
          State of Business <Text style={styles.required}>*</Text>
        </Text>
        <View style={[styles.inputRow, errors.businessState && styles.inputRowError]}>
          <Building2 size={16} color="#9CA3AF" />
          <TextInput
            ref={businessStateRef}
            style={styles.input}
            placeholder="e.g. Tamil Nadu"
            placeholderTextColor="#9CA3AF"
            value={businessState}
            onChangeText={setBusinessState}
            autoCapitalize="words"
            returnKeyType="done"
            onSubmitEditing={handleSave}
          />
        </View>
        {errors.businessState ? <Text style={styles.fieldError}>{errors.businessState}</Text> : null}
      </KeyboardAwareScrollView>

      {/* Bottom action bar - fixed docked at bottom */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
          <Text style={styles.skipBtnText}>Skip for now</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.saveBtn, saving && { opacity: 0.7 }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveBtnText}>Save & Continue →</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', position: 'relative' },

  // Header
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  logoBox: { width: 34, height: 34, backgroundColor: 'rgba(255, 255, 255, 0.2)', borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  logoIcon: { fontSize: 14 },
  logoText: { fontSize: scaleFont(14.5), fontFamily: F.semibold, color: '#FFFFFF' },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 6, position: 'relative' },
  stepDot: { width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(255, 255, 255, 0.2)', justifyContent: 'center', alignItems: 'center', zIndex: 1 },
  stepDotDone: { backgroundColor: '#A7F3D0' },
  stepDotCurrent: { backgroundColor: '#FFFFFF' },
  stepDotText: { fontSize: scaleFont(9), fontFamily: F.semibold, color: 'rgba(255, 255, 255, 0.7)' },
  stepDotTextDone: { color: '#065F46' },
  stepDotTextCurrent: { color: '#1B4332' },
  stepLine: { position: 'absolute', left: 13, right: 13, height: 2, backgroundColor: 'rgba(255, 255, 255, 0.3)', top: 12, zIndex: 0 },

  scroll: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 140 },

  // Title
  title: { fontSize: scaleFont(16.5), fontFamily: F.bold, color: '#FFFFFF', marginTop: 14, marginBottom: 4 },
  subtitle: { fontSize: scaleFont(10.5), color: '#E8F5E9', lineHeight: 15, fontFamily: F.regular },

  // Profile image
  imagePicker: { alignItems: 'center', marginBottom: 20 },
  imageCircle: { width: 88, height: 88, borderRadius: 44, position: 'relative' },
  imageEmpty: { width: 88, height: 88, borderRadius: 44, backgroundColor: '#F3F4F6', borderWidth: 1.5, borderColor: '#E5E7EB', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center' },
  profileImg: { width: 88, height: 88, borderRadius: 44, borderWidth: 2, borderColor: '#1B4332' },
  cameraBtn: { position: 'absolute', bottom: 2, right: 2, width: 26, height: 26, borderRadius: 13, backgroundColor: '#1B4332', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
  imageHint: { fontSize: scaleFont(9.5), color: '#9CA3AF', marginTop: 6, fontFamily: F.regular },

  // Form fields
  label: { ...T.label, marginBottom: 6, marginTop: 12 },
  required: { color: '#DC2626' },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 12, height: 46, backgroundColor: '#F9FAFB', gap: 8 },
  inputRowError: { borderColor: '#EF4444' },
  input: { flex: 1, fontSize: scaleFont(11.5), fontFamily: F.regular, color: '#111827' },
  fieldError: { color: '#EF4444', fontSize: scaleFont(9.5), marginTop: 3 },

  // Bottom bar - fixed position docked at bottom
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    backgroundColor: '#fff',
    gap: 8,
    zIndex: 10,
  },
  skipBtn: { height: 38, justifyContent: 'center', alignItems: 'center' },
  skipBtnText: { fontSize: scaleFont(11), color: '#9CA3AF', fontFamily: F.regular },
  saveBtn: { backgroundColor: '#1B4332', borderRadius: 10, height: 48, justifyContent: 'center', alignItems: 'center' },
  saveBtnText: { fontSize: scaleFont(12.5), fontFamily: F.semibold, color: '#fff' },
});