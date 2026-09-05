import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Bell, CheckCircle } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNewEvent } from '@/context/NewEventContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import OnboardingGuidancePopup from '@/components/OnboardingGuidancePopup';
import { useLanguage } from '@/context/LanguageContext';
import { F, scaleFont } from '@/utils/fonts';
import { T } from '@/utils/typography';

import Colors from '@/constants/Colors';

export default function SelectMenuTypeScreen() {
  const router = useRouter();
  const { data, update } = useNewEvent();
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();

  const select = (type: string) => {
    if (type !== data.menuType) {
      update({ menuType: type, currentDateIndex: 0, dateMenus: [], selectedItems: [] });
    } else {
      update({ menuType: type });
    }
    router.push('/new-event/menu-selection');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient colors={['#1B5E20', '#2E7D32']} style={styles.topHeaderGradient}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <ArrowLeft size={18} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: Colors.white }]}>{t('Select Menu Type')}</Text>
          <TouchableOpacity><Bell size={20} color="#FFFFFF" /></TouchableOpacity>
        </View>
        <Text style={styles.subtitle}>{t('Choose your catering preference to see available menus.')}</Text>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        <OnboardingGuidancePopup
          message={t('Choose the menu type.')}
          pointerPosition="bottom"
          containerStyle={{ marginBottom: 14 }}
        />

        <TouchableOpacity style={styles.menuCard} onPress={() => select('veg')} activeOpacity={0.9}>
          <Image
            source={{ uri: 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg' }}
            style={styles.menuImage}
          />
          <View style={styles.overlay} />
          <View style={styles.vegBadge}>
            <View style={styles.vegDot} />
            <Text style={styles.badgeText}>{t('Pure Veg')}</Text>
          </View>
          <View style={styles.menuContent}>
            <Text style={styles.menuTitle}>{t('Pure Vegetarian')}</Text>
            <Text style={styles.menuDesc}>{t('Over 45+ organic garden-to-table specialties including regional delicacies and seasonal salads.')}</Text>
            <View style={styles.menuFooter}>
              <Text style={styles.itemCount}>45+ {t('ITEMS AVAILABLE')}</Text>
              <TouchableOpacity style={styles.exploreBtn} onPress={() => select('veg')}>
                <Text style={styles.exploreBtnText}>{t('Explore Menu →')}</Text>
              </TouchableOpacity>
            </View>
          </View>
          {data.menuType === 'veg' && (
            <View style={styles.selectedIndicator}>
              <CheckCircle size={22} color={Colors.white} fill={Colors.primary} />
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuCard} onPress={() => select('non_veg')} activeOpacity={0.9}>
          <Image
            source={{ uri: 'https://images.pexels.com/photos/1640807/pexels-photo-1640807.jpeg' }}
            style={styles.menuImage}
          />
          <View style={styles.overlay} />
          <View style={[styles.vegBadge, styles.nonVegBadge]}>
            <View style={[styles.vegDot, styles.nonVegDot]} />
            <Text style={styles.badgeText}>{t('Non-Veg')}</Text>
          </View>
          <View style={styles.menuContent}>
            <Text style={styles.menuTitle}>{t('Non-Vegetarian')}</Text>
            <Text style={styles.menuDesc}>{t('A premium selection of sustainably sourced meats, poultry, and seafood prepared with artisanal techniques.')}</Text>
            <View style={styles.menuFooter}>
              <Text style={styles.itemCount}>32+ {t('ITEMS AVAILABLE')}</Text>
              <TouchableOpacity style={styles.exploreBtn} onPress={() => select('non_veg')}>
                <Text style={styles.exploreBtnText}>{t('Explore Menu →')}</Text>
              </TouchableOpacity>
            </View>
          </View>
          {data.menuType === 'non_veg' && (
            <View style={styles.selectedIndicator}>
              <CheckCircle size={22} color={Colors.white} fill={Colors.primary} />
            </View>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  topHeaderGradient: { paddingBottom: 14 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255, 255, 255, 0.15)' },
  backBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { ...T.h2, color: Colors.white },
  scroll: { padding: 14, paddingBottom: 36 },
  subtitle: { ...T.bodySm, color: '#E8F5E9', paddingHorizontal: 16, marginTop: 8 },
  menuCard: { borderRadius: 14, overflow: 'hidden', marginBottom: 16, height: 180, shadowColor: Colors.primary, shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
  menuImage: { width: '100%', height: '100%', position: 'absolute' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15, 35, 25, 0.48)' },
  vegBadge: { position: 'absolute', top: 10, right: 10, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.white, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  nonVegBadge: {},
  vegDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#16A34A' },
  nonVegDot: { backgroundColor: '#DC2626' },
  badgeText: { fontSize: scaleFont(9.5), fontFamily: F.semibold, color: Colors.textPrimary },
  menuContent: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 14 },
  menuTitle: { fontSize: scaleFont(14.5), fontFamily: F.bold, color: Colors.white, marginBottom: 4 },
  menuDesc: { fontSize: scaleFont(9.5), color: 'rgba(255,255,255,0.9)', lineHeight: 14, marginBottom: 10, fontFamily: F.regular },
  menuFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  itemCount: { fontSize: scaleFont(8.5), color: 'rgba(255,255,255,0.75)', fontFamily: F.medium, letterSpacing: 0.5 },
  exploreBtn: {},
  exploreBtnText: { ...T.btnSm, fontSize: scaleFont(10.5), color: '#A7F3D0' },
  selectedIndicator: { position: 'absolute', top: 10, left: 10 },
});

