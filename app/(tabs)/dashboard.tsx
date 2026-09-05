import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Bell, Menu, ChevronRight, MapPin, Users } from 'lucide-react-native';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { useNewEvent } from '@/context/NewEventContext';
import { useLanguage } from '@/context/LanguageContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Event } from '@/types';
import { useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { F, scaleFont } from '@/utils/fonts';
import { T } from '@/utils/typography';
import Colors from '@/constants/Colors';

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  confirmed: { bg: '#D1FAE5', text: '#065F46' },
  enquiry:   { bg: '#FEF3C7', text: '#92400E' },
  draft:     { bg: '#F3F4F6', text: '#374151' },
};

const MONTHS_SHORT = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];

// One display row per event-date combination
interface EventDateRow {
  eventId: string;
  eventName: string;
  venue: string;
  status: string;
  guestCount: number;
  date: string;        // YYYY-MM-DD for this specific date
  mealTypes: string[];
}

export default function DashboardScreen() {
  const { user } = useAuth();
  const { reset } = useNewEvent();
  const router = useRouter();
  const { t } = useLanguage();

  const handleNewEvent = () => {
    reset();
    router.push('/new-event/customer-details');
  };
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<{ full_name: string | null } | null>(null);
  const [stats, setStats] = useState({ upcoming: 0, today: 0, confirmed: 0, totalCustomers: 0 });
  const [upcomingRows, setUpcomingRows] = useState<EventDateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasCreatedFirstEvent, setHasCreatedFirstEvent] = useState<boolean>(true);
  const [dismissedOnboard, setDismissedOnboard] = useState<boolean>(false);

  const load = async () => {
    if (!user) { setLoading(false); setRefreshing(false); return; }
    const today = new Date().toISOString().split('T')[0];

    try {
      const [profileSnap, eventsSnap, customersSnap] = await Promise.all([
        getDoc(doc(db, 'profiles', user.uid)),
        getDocs(query(collection(db, 'events'), where('user_id', '==', user.uid))),
        getDocs(query(collection(db, 'customers'), where('user_id', '==', user.uid))),
      ]);

      setProfile(profileSnap.exists() ? (profileSnap.data() as { full_name: string | null }) : null);

      const events = eventsSnap.docs.map(d => ({ id: d.id, ...d.data() }) as Event);
      setHasCreatedFirstEvent(events.length > 0);

      // Fetch all event_dates for all events in parallel
      const eventDatesResults = await Promise.all(
        events.map(ev =>
          getDocs(collection(db, 'event_dates'))
            .then(snap => snap.docs
              .filter(d => d.data().event_id === ev.id)
              .map(d => ({ ...d.data(), id: d.id }))
            )
        )
      );

      // Build one row per date per event
      const allRows: EventDateRow[] = [];
      events.forEach((ev, idx) => {
        const dates = eventDatesResults[idx];
        if (dates.length === 0) {
          allRows.push({
            eventId: ev.id,
            eventName: ev.event_name,
            venue: ev.venue,
            status: ev.status,
            guestCount: ev.guest_count,
            date: ev.event_date,
            mealTypes: [],
          });
        } else {
          dates.forEach((ed: any) => {
            allRows.push({
              eventId: ev.id,
              eventName: ev.event_name,
              venue: ev.venue,
              status: ev.status,
              guestCount: ev.guest_count,
              date: ed.event_date,
              mealTypes: ed.meal_types || [],
            });
          });
        }
      });

      allRows.sort((a, b) => a.date.localeCompare(b.date));

      const upcoming = allRows.filter(r => r.date >= today);
      const todayRows = allRows.filter(r => r.date === today);
      const confirmed = events.filter(e => e.status === 'confirmed').length;

      setStats({
        upcoming: upcoming.length,
        today: todayRows.length,
        confirmed,
        totalCustomers: customersSnap.size,
      });
      setUpcomingRows(upcoming.slice(0, 5));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => {
    setDismissedOnboard(false);
    load();
  }, [user]));

  const onRefresh = () => { setRefreshing(true); load(); };
  const ownerName = profile?.full_name?.split(' ')[0] || 'Owner';

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#1B4332" /></View>;
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity><Menu size={20} color="#374151" /></TouchableOpacity>
        <Text style={styles.headerTitle}>{t('Dashboard')}</Text>
        <TouchableOpacity><Bell size={20} color="#374151" /></TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <LinearGradient colors={['#1B5E20', '#2E7D32']} style={styles.topBannerGradient}>
          <View style={styles.greetRow}>
            <Text style={styles.greetText}>{t('Hello, {name} 👋', { name: ownerName })}</Text>
          </View>
          <Text style={styles.greetSub}>{t("Here's what's happening today.")}</Text>

          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.8}>{t('Upcoming Events')}</Text>
              <Text style={styles.statNum}>{stats.upcoming}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.8}>{t("Today's Events")}</Text>
              <Text style={[styles.statNum, { color: '#1B4332' }]}>{stats.today}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.8}>{t('Confirmed')}</Text>
              <Text style={styles.statNum}>{stats.confirmed}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.8}>{t('Total Customers')}</Text>
              <Text style={styles.statNum}>{stats.totalCustomers}</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle} numberOfLines={1}>{t('Upcoming Events')}</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/events')}>
            <Text style={styles.viewAll} numberOfLines={1}>{t('View All')}</Text>
          </TouchableOpacity>
        </View>

        {upcomingRows.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>{t('No upcoming events. Create one!')}</Text>
          </View>
        ) : (
          upcomingRows.map((row, idx) => {
            const d = new Date(row.date + 'T00:00:00');
            const month = MONTHS_SHORT[d.getMonth()];
            const day = d.getDate();
            const statusStyle = STATUS_COLORS[row.status] || STATUS_COLORS.draft;
            return (
              <TouchableOpacity
                key={`${row.eventId}-${row.date}-${idx}`}
                style={styles.eventCard}
                onPress={() => router.push({ pathname: '/event-detail', params: { id: row.eventId } })}
              >
                <View style={styles.dateBadge}>
                  <Text style={styles.dateMonth}>{month}</Text>
                  <Text style={styles.dateDay}>{day}</Text>
                </View>
                <View style={styles.eventInfo}>
                  <View style={styles.eventTitleRow}>
                    <Text style={styles.eventName} numberOfLines={1} ellipsizeMode="tail">{row.eventName}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                      <Text style={[styles.statusText, { color: statusStyle.text }]} numberOfLines={1}>
                        {t(row.status)}
                      </Text>
                    </View>
                  </View>
                  {row.mealTypes.length > 0 && (
                    <Text style={styles.mealTypes} numberOfLines={1} ellipsizeMode="tail">{row.mealTypes.map(m => t(m)).join(' · ')}</Text>
                  )}
                  <View style={styles.eventMeta}>
                    <Users size={12} color="#6B7280" />
                    <Text style={styles.metaText} numberOfLines={1} ellipsizeMode="tail">{row.guestCount} {t('Guests')}</Text>
                  </View>
                  <View style={styles.eventMeta}>
                    <MapPin size={12} color="#6B7280" />
                    <Text style={styles.metaText} numberOfLines={1} ellipsizeMode="tail">{row.venue}</Text>
                  </View>
                </View>
                <ChevronRight size={16} color="#9CA3AF" />
              </TouchableOpacity>
            );
          })
        )}

        <View style={{ height: 24 }} />
      </ScrollView>

      <TouchableOpacity style={styles.newEventFab} onPress={handleNewEvent}>
        <Text style={styles.fabPlus}>+</Text>
        <Text style={styles.fabText}>{t('New Event')}</Text>
      </TouchableOpacity>

      {!hasCreatedFirstEvent && !dismissedOnboard && (
        <View style={styles.onboardingTooltipContainer} pointerEvents="box-none">
          <View style={styles.onboardingTooltip}>
            <Text style={styles.onboardingText}>
              {t('👋 Welcome! Tap New Event to get started.')}
            </Text>
            <TouchableOpacity
              style={styles.onboardingDoneBtn}
              onPress={() => setDismissedOnboard(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.onboardingDoneText}>{t('Done')}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.tooltipPointer} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.borderGreenLight },
  headerTitle: { ...T.h2, fontSize: scaleFont(14.5), color: Colors.primary },
  onboardingTooltipContainer: {
    position: 'absolute',
    bottom: 134,
    alignSelf: 'center',
    width: '52%',
    maxWidth: 220,
    minWidth: 180,
    alignItems: 'center',
    zIndex: 100,
    elevation: 10,
  },
  onboardingTooltip: {
    width: '100%',
    backgroundColor: Colors.emeraldTint,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  onboardingText: {
    fontSize: scaleFont(10),
    fontFamily: F.regular,
    color: '#065F46',
    lineHeight: 14,
    textAlign: 'center',
  },
  onboardingBold: {
    fontFamily: F.bold,
    color: Colors.primary,
  },
  onboardingDoneBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 12,
    marginTop: 8,
    alignSelf: 'center',
  },
  onboardingDoneText: {
    fontSize: scaleFont(9.5),
    fontFamily: F.medium,
    color: Colors.white,
  },
  tooltipPointer: {
    width: 12,
    height: 12,
    backgroundColor: Colors.emeraldTint,
    borderColor: Colors.primary,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    transform: [{ rotate: '45deg' }],
    marginTop: -6,
    zIndex: 101,
  },
  topBannerGradient: { paddingTop: 4, paddingBottom: 16, marginBottom: 16 },
  greetRow: { paddingHorizontal: 16, paddingTop: 12 },
  greetText: { ...T.pageTitle, fontSize: scaleFont(15.5), lineHeight: scaleFont(22), color: Colors.white },
  greetSub: { ...T.bodySm, color: '#E8F5E9', paddingHorizontal: 16, marginTop: 4, marginBottom: 14, lineHeight: scaleFont(16) },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 14, gap: 8 },
  statCard: { width: '48%', backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.borderGreenLight, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 8, minHeight: 64, justifyContent: 'space-between', shadowColor: Colors.primary, shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  statLabel: { ...T.statLabel, fontSize: scaleFont(8.5), lineHeight: scaleFont(12), color: Colors.textSecondary, flexShrink: 1 },
  statNum: { ...T.statNum, fontSize: scaleFont(15.5), marginTop: 4, color: Colors.primary },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 10 },
  sectionTitle: { ...T.sectionHeader, color: Colors.primary, flex: 1, marginRight: 8 },
  viewAll: { ...T.btnSm, color: Colors.primary, fontFamily: F.semibold },
  emptyCard: { margin: 16, padding: 20, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.borderGreenLight, borderRadius: 12, alignItems: 'center' },
  emptyText: { ...T.body, color: Colors.textSecondary },
  eventCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.borderGreenLight, marginHorizontal: 14, marginBottom: 8, borderRadius: 12, padding: 12, shadowColor: Colors.primary, shadowOpacity: 0.04, shadowRadius: 5, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  dateBadge: { width: 44, height: 50, backgroundColor: Colors.primary, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12, paddingVertical: 2 },
  dateMonth: { fontSize: scaleFont(8.5), fontFamily: F.medium, color: '#A7F3D0', letterSpacing: 0.5, includeFontPadding: false },
  dateDay: { fontSize: scaleFont(14.5), fontFamily: F.bold, color: Colors.white, includeFontPadding: false },
  eventInfo: { flex: 1, minWidth: 0 },
  eventTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  eventName: { ...T.eventName, flex: 1, marginRight: 6, color: Colors.textPrimary },
  mealTypes: { fontSize: scaleFont(9.5), color: Colors.primaryAccent, fontFamily: F.medium, marginBottom: 2 },
  statusBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, flexShrink: 0 },
  statusText: { fontSize: scaleFont(8.5), fontFamily: F.medium },
  eventMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1, flexShrink: 1 },
  metaText: { ...T.cardContent, fontSize: scaleFont(9.5), color: Colors.textSecondary, flex: 1 },
  newEventFab: { position: 'absolute', bottom: 76, alignSelf: 'center', backgroundColor: Colors.primary, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 12, borderRadius: 24, shadowColor: Colors.primary, shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 6, gap: 6 },
  fabPlus: { fontSize: scaleFont(15.5), color: Colors.white, fontFamily: F.regular, lineHeight: 18 },
  fabText: { ...T.btnMd, fontSize: scaleFont(12.5), color: Colors.white },
});