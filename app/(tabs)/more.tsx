import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView, Image } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { LogOut, User, Bell, Shield, ChevronRight, Info, Globe } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/context/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '@/context/LanguageContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function MoreScreen() {
  const { signOut, user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { language, setLanguage, t } = useLanguage();
  const [profile, setProfile] = useState<{ full_name?: string; catering_name?: string; phone?: string; profile_image?: string | null } | null>(null);

  const fetchProfile = async () => {
    if (!user) return;
    try {
      const snap = await getDoc(doc(db, 'profiles', user.uid));
      if (snap.exists()) {
        setProfile(snap.data() as any);
      }
    } catch (err) {
      console.error('Error fetching profile in MoreScreen:', err);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchProfile();
    }, [user])
  );

  const handleLanguageSelect = () => {
    Alert.alert(
      t('Select Language'),
      '',
      [
        {
          text: 'English',
          onPress: () => setLanguage('en'),
        },
        {
          text: 'தமிழ் (Tamil)',
          onPress: () => setLanguage('ta'),
        },
        {
          text: t('Cancel'),
          style: 'cancel',
        },
      ]
    );
  };

  const handleSignOut = () => {
    Alert.alert(t('Sign Out'), t('Are you sure you want to sign out?'), [
      { text: t('Cancel'), style: 'cancel' },
      {
        text: t('Sign Out'), style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/(auth)');
        },
      },
    ]);
  };

  const cateringOrBusinessName = profile?.catering_name?.trim() || profile?.full_name?.trim() || t('CaterEase Owner');
  const avatarLetter = profile?.catering_name?.trim()
    ? profile.catering_name.trim().charAt(0).toUpperCase()
    : profile?.full_name?.trim()
    ? profile.full_name.trim().charAt(0).toUpperCase()
    : 'C';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient colors={['#1B5E20', '#2E7D32']} style={styles.topHeaderGradient}>
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: '#FFFFFF' }]}>{t('More')}</Text>
        </View>

        <TouchableOpacity style={styles.profileCard} onPress={() => router.push('/(auth)/setup-profile' as any)}>
          <View style={styles.avatar}>
            {profile?.profile_image ? (
              <Image source={{ uri: profile.profile_image }} style={{ width: 56, height: 56, borderRadius: 28 }} />
            ) : (
              <Text style={styles.avatarText}>{avatarLetter}</Text>
            )}
          </View>
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: '#FFFFFF' }]}>{cateringOrBusinessName}</Text>
            <Text style={[styles.profileEmail, { color: '#E8F5E9' }]}>{user?.email || profile?.phone || ''}</Text>
          </View>
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false}>

        <Text style={styles.sectionTitle}>{t('Account')}</Text>
        <View style={styles.menuGroup}>
          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/(auth)/setup-profile' as any)}>
            <View style={[styles.menuIcon, { backgroundColor: '#D1FAE5' }]}>
              <User size={18} color="#065F46" />
            </View>
            <Text style={styles.menuLabel}>{t('Profile')}</Text>
            <ChevronRight size={16} color="#9CA3AF" />
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.menuItem}>
            <View style={[styles.menuIcon, { backgroundColor: '#FEF3C7' }]}>
              <Bell size={18} color="#92400E" />
            </View>
            <Text style={styles.menuLabel}>{t('Notifications')}</Text>
            <ChevronRight size={16} color="#9CA3AF" />
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.menuItem}>
            <View style={[styles.menuIcon, { backgroundColor: '#EDE9FE' }]}>
              <Shield size={18} color="#5B21B6" />
            </View>
            <Text style={styles.menuLabel}>{t('Privacy & Security')}</Text>
            <ChevronRight size={16} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>{t('App')}</Text>
        <View style={styles.menuGroup}>
          <TouchableOpacity style={styles.menuItem} onPress={handleLanguageSelect}>
            <View style={[styles.menuIcon, { backgroundColor: '#E0F2FE' }]}>
              <Globe size={18} color="#0284C7" />
            </View>
            <Text style={styles.menuLabel}>{t('Language')}</Text>
            <View style={styles.langPill}>
              <Text style={styles.langPillText}>{language === 'en' ? 'English' : 'தமிழ்'}</Text>
            </View>
            <ChevronRight size={16} color="#9CA3AF" />
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.menuItem}>
            <View style={[styles.menuIcon, { backgroundColor: '#F3F4F6' }]}>
              <Info size={18} color="#374151" />
            </View>
            <Text style={styles.menuLabel}>{t('About CaterEase')}</Text>
            <ChevronRight size={16} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
          <LogOut size={18} color="#DC2626" />
          <Text style={styles.signOutText}>{t('Sign Out')}</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>CaterEase v1.0.0</Text>
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  topHeaderGradient: { paddingBottom: 6 },
  header: { paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255, 255, 255, 0.15)' },
  headerTitle: { fontSize: 14.5, fontWeight: '700', color: '#FFFFFF' },
  profileCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.15)', marginHorizontal: 16, marginTop: 8, marginBottom: 12, borderRadius: 16, padding: 16, gap: 14, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.25)' },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#1B4332', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 20, fontWeight: '700', color: '#fff' },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 14.5, fontWeight: '700', color: '#111827' },
  profileEmail: { fontSize: 11.5, color: '#6B7280', marginTop: 2 },
  sectionTitle: { fontSize: 10.5, fontWeight: '700', color: '#9CA3AF', letterSpacing: 1, paddingHorizontal: 20, marginBottom: 8, marginTop: 8 },
  menuGroup: { backgroundColor: '#fff', marginHorizontal: 16, borderRadius: 14, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  menuIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  menuLabel: { flex: 1, fontSize: 13, fontWeight: '500', color: '#111827' },
  langPill: { backgroundColor: '#F0FDF4', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: '#D1FAE5' },
  langPillText: { fontSize: 12, fontWeight: '600', color: '#166534' },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginLeft: 64 },
  signOutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#FEF2F2', marginHorizontal: 16, borderRadius: 12, padding: 16, marginTop: 8 },
  signOutText: { fontSize: 13, fontWeight: '700', color: '#DC2626' },
  versionText: { textAlign: 'center', fontSize: 10.5, color: '#9CA3AF', marginTop: 20 },
});
