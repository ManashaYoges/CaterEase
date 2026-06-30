import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Bell, MapPin, Users, ChevronRight, Plus, Calendar } from 'lucide-react-native';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Event } from '@/types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  confirmed: { bg: '#D1FAE5', text: '#065F46' },
  enquiry:   { bg: '#FEF3C7', text: '#92400E' },
  draft:     { bg: '#F3F4F6', text: '#374151' },
};

const MONTHS_SHORT = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];

interface EventDateRow {
  eventId: string;
  eventName: string;
  venue: string;
  status: string;
  guestCount: number;
  date: string;
  mealTypes: string[];
}

export default function EventsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [rows, setRows] = useState<EventDateRow[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    const load = async () => {
      if (!user) { setRows([]); setLoading(false); return; }
      setLoading(true);
      try {
        const snapshot = await getDocs(query(collection(db, 'events'), where('user_id', '==', user.uid)));
        const events = snapshot.docs.map(d => ({ id: d.id, ...d.data() }) as Event);

        const eventDatesResults = await Promise.all(
          events.map(ev =>
            getDocs(collection(db, 'event_dates'))
              .then(snap => snap.docs
                .filter(d => d.data().event_id === ev.id)
                .map(d => ({ ...d.data(), id: d.id }))
              )
          )
        );

        const allRows: EventDateRow[] = [];
        events.forEach((ev, idx) => {
          const dates = eventDatesResults[idx];
          if (dates.length === 0) {
            allRows.push({
              eventId: ev.id, eventName: ev.event_name,
              venue: ev.venue, status: ev.status,
              guestCount: ev.guest_count, date: ev.event_date, mealTypes: [],
            });
          } else {
            dates.forEach((ed: any) => {
              allRows.push({
                eventId: ev.id, eventName: ev.event_name,
                venue: ev.venue, status: ev.status,
                guestCount: ev.guest_count,
                date: ed.event_date, mealTypes: ed.meal_types || [],
              });
            });
          }
        });

        allRows.sort((a, b) => a.date.localeCompare(b.date));
        setRows(allRows);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]));

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>CaterEase</Text>
        <TouchableOpacity><Bell size={22} color="#374151" /></TouchableOpacity>
      </View>

      <View style={styles.titleRow}>
        <Text style={styles.pageTitle}>Events</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/new-event/customer-details')}>
          <Plus size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#1B4332" /></View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {rows.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No events yet</Text>
              <Text style={styles.emptyText}>Create your first event to get started</Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/new-event/customer-details')}>
                <Text style={styles.emptyBtnText}>+ New Event</Text>
              </TouchableOpacity>
            </View>
          ) : (
            rows.map((row, idx) => {
              const d = new Date(row.date + 'T00:00:00');
              const month = MONTHS_SHORT[d.getMonth()];
              const day = d.getDate();
              const sc = STATUS_COLORS[row.status] || STATUS_COLORS.draft;
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
                    <View style={styles.titleRow2}>
                      <Text style={styles.eventName} numberOfLines={1}>{row.eventName}</Text>
                      <View style={[styles.badge, { backgroundColor: sc.bg }]}>
                        <Text style={[styles.badgeText, { color: sc.text }]}>
                          {row.status.charAt(0).toUpperCase() + row.status.slice(1)}
                        </Text>
                      </View>
                    </View>
                    {row.mealTypes.length > 0 && (
                      <View style={styles.mealRow}>
                        <Calendar size={11} color="#1B4332" />
                        <Text style={styles.mealText}>{row.mealTypes.join(' · ')}</Text>
                      </View>
                    )}
                    <View style={styles.metaRow}>
                      <Users size={13} color="#6B7280" />
                      <Text style={styles.metaText}>{row.guestCount} Guests</Text>
                    </View>
                    <View style={styles.metaRow}>
                      <MapPin size={13} color="#6B7280" />
                      <Text style={styles.metaText}>{row.venue}</Text>
                    </View>
                  </View>
                  <ChevronRight size={18} color="#9CA3AF" />
                </TouchableOpacity>
              );
            })
          )}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 80 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#1B4332' },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 },
  pageTitle: { fontSize: 24, fontWeight: '800', color: '#111827' },
  addBtn: { width: 38, height: 38, backgroundColor: '#1B4332', borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  emptyCard: { margin: 20, padding: 32, backgroundColor: '#fff', borderRadius: 16, alignItems: 'center' },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 20 },
  emptyBtn: { backgroundColor: '#1B4332', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  eventCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 10, borderRadius: 14, padding: 14, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  dateBadge: { width: 48, height: 56, backgroundColor: '#1B4332', borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 14, paddingVertical: 4 },
dateMonth: { fontSize: 11, fontWeight: '600', color: '#A7F3D0', letterSpacing: 0.5, lineHeight: 14, includeFontPadding: false, textAlignVertical: 'center' },
dateDay: { fontSize: 22, fontWeight: '800', color: '#fff', lineHeight: 24, includeFontPadding: false, textAlignVertical: 'center' },
  eventInfo: { flex: 1 },
  titleRow2: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  eventName: { fontSize: 15, fontWeight: '700', color: '#111827', flex: 1, marginRight: 8 },
  badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  mealRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
  mealText: { fontSize: 11, color: '#1B4332', fontWeight: '600' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  metaText: { fontSize: 12, color: '#6B7280' },
});