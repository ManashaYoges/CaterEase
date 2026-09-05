import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Bell, Folder, Plus, Clock, ChevronRight } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNewEvent } from '@/context/NewEventContext';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import OnboardingGuidancePopup from '@/components/OnboardingGuidancePopup';
import { useLanguage } from '@/context/LanguageContext';

import Colors from '@/constants/Colors';

export default function MenuSelectionScreen() {
  const router = useRouter();
  const { data } = useNewEvent();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [recentEvents, setRecentEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!user) {
        setRecentEvents([]);
        setLoading(false);
        return;
      }
      const snapshot = await getDocs(
        query(
          collection(db, 'events'),
          where('user_id', '==', user.uid)
        )
      );
      const events = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter((event: any) => ['confirmed', 'draft'].includes(event.status))
        .sort((a: any, b: any) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
        .slice(0, 3);
      setRecentEvents(events);
      setLoading(false);
    };
    load();
  }, [user]);

  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const hrs = Math.floor(diff / 3600000);
    if (hrs < 1) return t('Just now');
    if (hrs < 24) return `${hrs} ${t('hrs ago')}`;
    return `${Math.floor(hrs / 24)} ${t('days ago')}`;
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient colors={['#1B5E20', '#2E7D32']} style={styles.topHeaderGradient}>
        <View style={styles.header}>
          <Text style={[styles.headerBrand, { color: Colors.white }]}>{t('CaterEase')}</Text>
          <TouchableOpacity><Bell size={22} color="#FFFFFF" /></TouchableOpacity>
        </View>
        <View style={styles.titleWrap}>
          <Text style={[styles.title, { color: Colors.white }]}>{t('Menu Selection')}</Text>
          <Text style={[styles.subtitle, { color: '#E8F5E9' }]}>{t('How would you like to begin your event planning today?')}</Text>
        </View>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        <OnboardingGuidancePopup
          message={t('Select a saved menu or create a new one.')}
          pointerPosition="bottom"
          containerStyle={{ marginBottom: 14 }}
        />

        <TouchableOpacity style={styles.optionCard} onPress={() => router.push('/new-event/load-saved-menu')}>
          <View style={styles.optionIcon}>
            <Folder size={28} color={Colors.primary} />
          </View>
          <View style={styles.optionContent}>
            <Text style={styles.optionTitle}>{t('Open Saved Menu')}</Text>
            <Text style={styles.optionDesc}>{t('Continue working on your drafts or use a saved template for faster setup.')}</Text>
            <TouchableOpacity style={styles.optionAction} onPress={() => router.push('/new-event/load-saved-menu')}>
              <Text style={styles.optionActionText}>{t('Browse Drafts')}</Text>
              <Clock size={14} color={Colors.primary} />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.optionCard} onPress={() => router.push('/new-event/build-menu')}>
          <View style={styles.optionIcon}>
            <Plus size={28} color={Colors.primary} />
          </View>
          <View style={styles.optionContent}>
            <Text style={styles.optionTitle}>{t('Create a New Menu')}</Text>
            <Text style={styles.optionDesc}>{t('Start building a custom menu for your event from scratch with our intuitive builder.')}</Text>
            <TouchableOpacity style={styles.optionAction} onPress={() => router.push('/new-event/build-menu')}>
              <Text style={styles.optionActionText}>{t('Get Started')}</Text>
              <Text style={styles.arrow}>→</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>

        {recentEvents.length > 0 && (
          <>
            <View style={styles.recentHeader}>
              <Text style={styles.recentTitle}>{t('Recently Modified')}</Text>
              <TouchableOpacity><Text style={styles.viewAll}>{t('View All')}</Text></TouchableOpacity>
            </View>
            {recentEvents.map(event => (
              <TouchableOpacity
                key={event.id}
                style={styles.recentCard}
                onPress={() => router.push({ pathname: '/new-event/load-saved-menu', params: { autoLoad: event.id } })}
              >
                <View style={styles.recentIcon}>
                  <View style={styles.docIcon} />
                </View>
                <View style={styles.recentInfo}>
                  <Text style={styles.recentName}>{event.event_name} - {t(event.status)}</Text>
                  <Text style={styles.recentTime}>{t('Last edited')} {timeAgo(event.updated_at)}</Text>
                </View>
                <ChevronRight size={16} color={Colors.textMuted} />
              </TouchableOpacity>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  topHeaderGradient: { paddingBottom: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255, 255, 255, 0.15)' },
  headerBrand: { fontSize: 14.5, fontWeight: '700', color: Colors.white },
  titleWrap: { paddingHorizontal: 20, paddingTop: 14 },
  scroll: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 20, fontWeight: '800', color: Colors.white, marginBottom: 6 },
  subtitle: { fontSize: 12.5, color: '#E8F5E9', marginBottom: 6 },
  optionCard: { flexDirection: 'row', backgroundColor: Colors.white, borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: Colors.borderGreenLight, gap: 16, shadowColor: Colors.primary, shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  optionIcon: { width: 56, height: 56, backgroundColor: Colors.lightGreen, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  optionContent: { flex: 1 },
  optionTitle: { fontSize: 14.5, fontWeight: '700', color: Colors.textPrimary, marginBottom: 6 },
  optionDesc: { fontSize: 11.5, color: Colors.textSecondary, lineHeight: 17, marginBottom: 12 },
  optionAction: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  optionActionText: { fontSize: 11.5, color: Colors.primary, fontWeight: '700' },
  arrow: { fontSize: 12.5, color: Colors.primary, fontWeight: '700' },
  recentHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, marginTop: 8 },
  recentTitle: { fontSize: 14, fontWeight: '700', color: Colors.primary },
  viewAll: { fontSize: 11.5, color: Colors.primary, fontWeight: '600' },
  recentCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: Colors.borderGreenLight, gap: 12 },
  recentIcon: { width: 40, height: 40, backgroundColor: Colors.lightGreen, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  docIcon: { width: 20, height: 24, borderWidth: 2, borderColor: Colors.primary, borderRadius: 3 },
  recentInfo: { flex: 1 },
  recentName: { fontSize: 12.5, fontWeight: '600', color: Colors.textPrimary },
  recentTime: { fontSize: 10.5, color: Colors.textSecondary, marginTop: 2 },
});
