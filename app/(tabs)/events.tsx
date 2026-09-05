import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Bell, MapPin, Users, ChevronRight, Plus, Calendar } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Event } from '@/types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { useNewEvent } from '@/context/NewEventContext';
import { useLanguage } from '@/context/LanguageContext';
import { F, scaleFont } from '@/utils/fonts';
import { T } from '@/utils/typography';
import Colors from '@/constants/Colors';

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
  const { reset } = useNewEvent();
  const { t } = useLanguage();

  const handleNewEvent = () => {
    reset();
    router.push('/new-event/customer-details');
  };
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
      <LinearGradient colors={['#1B5E20', '#2E7D32']} style={styles.topHeaderGradient}>
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: Colors.white }]}>{t('CaterEase')}</Text>
          <TouchableOpacity><Bell size={20} color="#FFFFFF" /></TouchableOpacity>
        </View>

        <View style={styles.titleRow}>
          <Text style={[styles.pageTitle, { color: Colors.white }]}>{t('Events')}</Text>
          <TouchableOpacity style={[styles.addBtn, { backgroundColor: Colors.white }]} onPress={handleNewEvent}>
            <Plus size={18} color="#1B5E20" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#1B4332" /></View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {rows.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>{t('No events yet')}</Text>
              <Text style={styles.emptyText}>{t('Create your first event to get started')}</Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={handleNewEvent}>
                <Text style={styles.emptyBtnText}>{t('+ New Event')}</Text>
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
                          {t(row.status)}
                        </Text>
                      </View>
                    </View>
                    {row.mealTypes.length > 0 && (
                      <View style={styles.mealRow}>
                        <Calendar size={11} color="#1B4332" />
                        <Text style={styles.mealText}>{row.mealTypes.map(m => t(m)).join(' · ')}</Text>
                      </View>
                    )}
                    <View style={styles.metaRow}>
                      <Users size={12} color="#6B7280" />
                      <Text style={styles.metaText}>{row.guestCount} {t('Guests')}</Text>
                    </View>
                    <View style={styles.metaRow}>
                      <MapPin size={12} color="#6B7280" />
                      <Text style={styles.metaText}>{row.venue}</Text>
                    </View>
                  </View>
                  <ChevronRight size={16} color="#9CA3AF" />
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
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 80 },
  topHeaderGradient: { paddingBottom: 4 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255, 255, 255, 0.15)' },
  headerTitle: { ...T.h2, color: Colors.white },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  pageTitle: { ...T.pageTitle, color: Colors.white },
  addBtn: { width: 36, height: 36, backgroundColor: Colors.white, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  emptyCard: { margin: 16, padding: 24, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.borderGreenLight, borderRadius: 14, alignItems: 'center' },
  emptyTitle: { ...T.sectionHeader, marginBottom: 6, color: Colors.primary },
  emptyText: { ...T.bodySm, color: Colors.textSecondary, textAlign: 'center', marginBottom: 16 },
  emptyBtn: { backgroundColor: Colors.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  emptyBtnText: { ...T.btnSm, color: Colors.white },
  eventCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.borderGreenLight, marginHorizontal: 14, marginBottom: 8, borderRadius: 12, padding: 12, shadowColor: Colors.primary, shadowOpacity: 0.04, shadowRadius: 5, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  dateBadge: { width: 44, height: 50, backgroundColor: Colors.primary, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12, paddingVertical: 2 },
  dateMonth: { fontSize: scaleFont(8.5), fontFamily: F.medium, color: '#A7F3D0', letterSpacing: 0.5, includeFontPadding: false },
  dateDay: { fontSize: scaleFont(14.5), fontFamily: F.bold, color: Colors.white, includeFontPadding: false },
  eventInfo: { flex: 1 },
  titleRow2: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  eventName: { ...T.eventName, flex: 1, marginRight: 6, color: Colors.textPrimary },
  badge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  badgeText: { fontSize: scaleFont(8.5), fontFamily: F.medium },
  mealRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
  mealText: { fontSize: scaleFont(9.5), color: Colors.primaryAccent, fontFamily: F.medium },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 },
  metaText: { ...T.cardContent, fontSize: scaleFont(9.5), color: Colors.textSecondary },
});