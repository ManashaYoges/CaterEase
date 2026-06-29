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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Event } from '@/types';
import { useFocusEffect } from 'expo-router';

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
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<{ full_name: string | null } | null>(null);
  const [stats, setStats] = useState({ upcoming: 0, today: 0, confirmed: 0, totalCustomers: 0 });
  const [upcomingRows, setUpcomingRows] = useState<EventDateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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
          // Fallback to event_date if no event_dates saved
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

  useFocusEffect(useCallback(() => { load(); }, [user]));
  const onRefresh = () => { setRefreshing(true); load(); };
  const ownerName = profile?.full_name?.split(' ')[0] || 'Owner';

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#1B4332" /></View>;
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity><Menu size={22} color="#374151" /></TouchableOpacity>
        <Text style={styles.headerTitle}>Dashboard</Text>
        <TouchableOpacity><Bell size={22} color="#374151" /></TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <View style={styles.greetRow}>
          <Text style={styles.greetText}>Hello, {ownerName} 👋</Text>
        </View>
        <Text style={styles.greetSub}>Here's what's happening today.</Text>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Upcoming Events</Text>
            <Text style={styles.statNum}>{stats.upcoming}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Today's Events</Text>
            <Text style={[styles.statNum, { color: '#1B4332' }]}>{stats.today}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Confirmed</Text>
            <Text style={styles.statNum}>{stats.confirmed}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Total Customers</Text>
            <Text style={styles.statNum}>{stats.totalCustomers}</Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Upcoming Events</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/events')}>
            <Text style={styles.viewAll}>View All</Text>
          </TouchableOpacity>
        </View>

        {upcomingRows.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No upcoming events. Create one!</Text>
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
                    <Text style={styles.eventName}>{row.eventName}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                      <Text style={[styles.statusText, { color: statusStyle.text }]}>
                        {row.status.charAt(0).toUpperCase() + row.status.slice(1)}
                      </Text>
                    </View>
                  </View>
                  {row.mealTypes.length > 0 && (
                    <Text style={styles.mealTypes}>{row.mealTypes.join(' · ')}</Text>
                  )}
                  <View style={styles.eventMeta}>
                    <Users size={13} color="#6B7280" />
                    <Text style={styles.metaText}>{row.guestCount} Guests</Text>
                  </View>
                  <View style={styles.eventMeta}>
                    <MapPin size={13} color="#6B7280" />
                    <Text style={styles.metaText}>{row.venue}</Text>
                  </View>
                </View>
                <ChevronRight size={18} color="#9CA3AF" />
              </TouchableOpacity>
            );
          })
        )}

        <View style={{ height: 24 }} />
      </ScrollView>

      <TouchableOpacity style={styles.newEventFab} onPress={() => router.push('/new-event/customer-details')}>
        <Text style={styles.fabPlus}>+</Text>
        <Text style={styles.fabText}>New Event</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  greetRow: { paddingHorizontal: 20, paddingTop: 20 },
  greetText: { fontSize: 22, fontWeight: '700', color: '#111827' },
  greetSub: { fontSize: 14, color: '#6B7280', paddingHorizontal: 20, marginTop: 2, marginBottom: 16 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 10, marginBottom: 24 },
  statCard: { flex: 1, minWidth: '45%', backgroundColor: '#fff', borderRadius: 14, padding: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  statLabel: { fontSize: 13, color: '#6B7280', marginBottom: 8 },
  statNum: { fontSize: 32, fontWeight: '800', color: '#111827' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  viewAll: { fontSize: 13, color: '#1B4332', fontWeight: '600' },
  emptyCard: { margin: 20, padding: 24, backgroundColor: '#fff', borderRadius: 14, alignItems: 'center' },
  emptyText: { color: '#6B7280', fontSize: 14 },
  eventCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 10, borderRadius: 14, padding: 14, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  dateBadge: { width: 48, height: 56, backgroundColor: '#1B4332', borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  dateMonth: { fontSize: 11, fontWeight: '600', color: '#A7F3D0', letterSpacing: 0.5 },
  dateDay: { fontSize: 22, fontWeight: '800', color: '#fff' },
  eventInfo: { flex: 1 },
  eventTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  eventName: { fontSize: 15, fontWeight: '700', color: '#111827', flex: 1, marginRight: 8 },
  mealTypes: { fontSize: 11, color: '#1B4332', fontWeight: '600', marginBottom: 2 },
  statusBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontSize: 11, fontWeight: '600' },
  eventMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  metaText: { fontSize: 12, color: '#6B7280' },
  newEventFab: { position: 'absolute', bottom: 80, alignSelf: 'center', backgroundColor: '#1B4332', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderRadius: 30, shadowColor: '#1B4332', shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 8, gap: 6 },
  fabPlus: { fontSize: 20, color: '#fff', fontWeight: '300', lineHeight: 22 },
  fabText: { fontSize: 15, color: '#fff', fontWeight: '700' },
});