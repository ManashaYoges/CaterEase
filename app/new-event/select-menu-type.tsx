import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Bell, CheckCircle } from 'lucide-react-native';
import { useNewEvent } from '@/context/NewEventContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SelectMenuTypeScreen() {
  const router = useRouter();
  const { data, update } = useNewEvent();
  const insets = useSafeAreaInsets();

  const select = (type: string) => {
    update({ menuType: type, currentDateIndex: 0, dateMenus: []  });
    router.push('/new-event/menu-selection');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Select Menu Type</Text>
        <TouchableOpacity><Bell size={22} color="#374151" /></TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <Text style={styles.subtitle}>Choose your catering preference to see available menus.</Text>

        <TouchableOpacity style={styles.menuCard} onPress={() => select('veg')} activeOpacity={0.9}>
          <Image
            source={{ uri: 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg' }}
            style={styles.menuImage}
          />
          <View style={styles.overlay} />
          <View style={styles.vegBadge}>
            <View style={styles.vegDot} />
            <Text style={styles.badgeText}>Pure Veg</Text>
          </View>
          <View style={styles.menuContent}>
            <Text style={styles.menuTitle}>Pure Vegetarian</Text>
            <Text style={styles.menuDesc}>Over 45+ organic garden-to-table specialties including regional delicacies and seasonal salads.</Text>
            <View style={styles.menuFooter}>
              <Text style={styles.itemCount}>45+ ITEMS AVAILABLE</Text>
              <TouchableOpacity style={styles.exploreBtn} onPress={() => select('veg')}>
                <Text style={styles.exploreBtnText}>Explore Menu →</Text>
              </TouchableOpacity>
            </View>
          </View>
          {data.menuType === 'veg' && (
            <View style={styles.selectedIndicator}>
              <CheckCircle size={24} color="#fff" fill="#1B4332" />
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
            <Text style={styles.badgeText}>Non-Veg</Text>
          </View>
          <View style={styles.menuContent}>
            <Text style={styles.menuTitle}>Non-Vegetarian</Text>
            <Text style={styles.menuDesc}>A premium selection of sustainably sourced meats, poultry, and seafood prepared with artisanal techniques.</Text>
            <View style={styles.menuFooter}>
              <Text style={styles.itemCount}>32+ ITEMS AVAILABLE</Text>
              <TouchableOpacity style={styles.exploreBtn} onPress={() => select('non_veg')}>
                <Text style={styles.exploreBtnText}>Explore Menu →</Text>
              </TouchableOpacity>
            </View>
          </View>
          {data.menuType === 'non_veg' && (
            <View style={styles.selectedIndicator}>
              <CheckCircle size={24} color="#fff" fill="#1B4332" />
            </View>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  scroll: { padding: 16, paddingBottom: 40 },
  subtitle: { fontSize: 14, color: '#6B7280', marginBottom: 20 },
  menuCard: { borderRadius: 16, overflow: 'hidden', marginBottom: 20, height: 200, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  menuImage: { width: '100%', height: '100%', position: 'absolute' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  vegBadge: { position: 'absolute', top: 12, right: 12, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#fff', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  nonVegBadge: {},
  vegDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#16A34A' },
  nonVegDot: { backgroundColor: '#DC2626' },
  badgeText: { fontSize: 11, fontWeight: '700', color: '#111827' },
  menuContent: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16 },
  menuTitle: { fontSize: 20, fontWeight: '800', color: '#fff', marginBottom: 6 },
  menuDesc: { fontSize: 12, color: 'rgba(255,255,255,0.85)', lineHeight: 18, marginBottom: 12 },
  menuFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  itemCount: { fontSize: 10, color: 'rgba(255,255,255,0.7)', fontWeight: '700', letterSpacing: 1 },
  exploreBtn: {},
  exploreBtnText: { fontSize: 13, color: '#fff', fontWeight: '700' },
  selectedIndicator: { position: 'absolute', top: 12, left: 12 },
});
