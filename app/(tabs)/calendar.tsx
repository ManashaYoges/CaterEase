import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Bell, Menu, ChevronLeft, ChevronRight, Clock, MapPin, Users } from 'lucide-react-native';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Event } from '@/types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';

const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  confirmed: { bg: '#D1FAE5', text: '#065F46' },
  enquiry:   { bg: '#FEF3C7', text: '#92400E' },
  draft:     { bg: '#F3F4F6', text: '#374151' },
};

interface EventDateRow {
  eventId: string;
  eventName: string;
  venue: string;
  status: string;
  guestCount: number;
  date: string;
  mealTypes: string[];
}

export default function CalendarScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState(today.toISOString().split('T')[0]);
  const [rows, setRows] = useState<EventDateRow[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    const load = async () => {
      if (!user) { setRows([]); setLoading(false); return; }
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

  const getDaysInMonth = (m: number, y: number) => new Date(y, m + 1, 0).getDate();
  const getFirstDay = (m: number, y: number) => new Date(y, m, 1).getDay();
  const pad = (n: number) => n.toString().padStart(2, '0');
  const makeDate = (day: number) => `${currentYear}-${pad(currentMonth + 1)}-${pad(day)}`;
  const todayStr = today.toISOString().split('T')[0];

  const rowsOnDate = (dateStr: string) => rows.filter(r => r.date === dateStr);
  const hasRows = (dateStr: string) => rowsOnDate(dateStr).length > 0;

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); }
    else setCurrentMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); }
    else setCurrentMonth(m => m + 1);
  };

  const daysInMonth = getDaysInMonth(currentMonth, currentYear);
  const firstDay = getFirstDay(currentMonth, currentYear);
  const selectedRows = rowsOnDate(selectedDate);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity><Menu size={22} color="#374151" /></TouchableOpacity>
        <Text style={styles.headerTitle}>CaterEase</Text>
        <TouchableOpacity><Bell size={22} color="#374151" /></TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.calendarCard}>
          <View style={styles.calHeader}>
            <TouchableOpacity onPress={prevMonth} style={styles.navBtn}>
              <ChevronLeft size={18} color="#374151" />
            </TouchableOpacity>
            <Text style={styles.monthTitle}>{MONTHS[currentMonth]} {currentYear}</Text>
            <TouchableOpacity onPress={nextMonth} style={styles.navBtn}>
              <ChevronRight size={18} color="#374151" />
            </TouchableOpacity>
          </View>

          <View style={styles.daysRow}>
            {DAYS.map(d => <Text key={d} style={styles.dayLabel}>{d}</Text>)}
          </View>

          <View style={styles.datesGrid}>
            {Array.from({ length: firstDay }).map((_, i) => <View key={`empty-${i}`} style={styles.dateCell} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = makeDate(day);
              const isToday = dateStr === todayStr;
              const isSel = dateStr === selectedDate;
              const hasEv = hasRows(dateStr);
              // Count unique events on this date for multi-dot indicator
              const count = rowsOnDate(dateStr).length;
              return (
                <TouchableOpacity key={day} style={styles.dateCell} onPress={() => setSelectedDate(dateStr)}>
                  <View style={[styles.dateBubble, isSel && styles.selectedBubble, isToday && !isSel && styles.todayBubble]}>
                    <Text style={[styles.dateNum, isSel && styles.selectedNum, isToday && !isSel && styles.todayNum]}>{day}</Text>
                  </View>
                  {hasEv && (
                    <View style={styles.dotsRow}>
                      {Array.from({ length: Math.min(count, 3) }).map((_, di) => (
                        <View key={di} style={[styles.dot, isSel && styles.dotSelected]} />
                      ))}
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.selectedSection}>
          <View style={styles.selectedHeader}>
            <Text style={styles.selectedDate}>
              {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </Text>
            {selectedRows.length > 0 && (
              <View style={styles.countBadge}>
                <Text style={styles.countText}>{selectedRows.length} Event{selectedRows.length > 1 ? 's' : ''}</Text>
              </View>
            )}
          </View>

          {loading ? (
            <ActivityIndicator color="#1B4332" style={{ marginTop: 20 }} />
          ) : selectedRows.length === 0 ? (
            <Text style={styles.noEventsText}>No events on this date.</Text>
          ) : (
            selectedRows.map((row, idx) => {
              const sc = STATUS_COLORS[row.status] || STATUS_COLORS.draft;
              return (
                <TouchableOpacity
                  key={`${row.eventId}-${idx}`}
                  style={styles.eventCard}
                  onPress={() => router.push({ pathname: '/event-detail', params: { id: row.eventId } })}
                >
                  <View style={styles.eventTop}>
                    <Text style={styles.eventName}>{row.eventName}</Text>
                    <View style={[styles.badge, { backgroundColor: sc.bg }]}>
                      <Text style={[styles.badgeText, { color: sc.text }]}>
                        {row.status.charAt(0).toUpperCase() + row.status.slice(1)}
                      </Text>
                    </View>
                  </View>
                  {row.mealTypes.length > 0 && (
                    <Text style={styles.mealTypes}>{row.mealTypes.join(' · ')}</Text>
                  )}
                  <View style={styles.metaRow}><MapPin size={13} color="#6B7280" /><Text style={styles.metaText}>{row.venue}</Text></View>
                  <View style={styles.metaRow}><Users size={13} color="#6B7280" /><Text style={styles.metaText}>{row.guestCount} Guests</Text></View>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        {/* Upcoming dates after selected */}
        {rows.filter(r => r.date > selectedDate).slice(0, 2).map((row, idx) => {
          const d = new Date(row.date + 'T00:00:00');
          const labelColor = row.status === 'enquiry' ? '#92400E' : '#1B4332';
          const label = row.status === 'enquiry' ? 'PENDING ENQUIRY' : 'NEXT UPCOMING';
          return (
            <TouchableOpacity
              key={`upcoming-${row.eventId}-${idx}`}
              style={styles.upcomingCard}
              onPress={() => router.push({ pathname: '/event-detail', params: { id: row.eventId } })}
            >
              <Text style={[styles.upcomingLabel, { color: labelColor }]}>{label}</Text>
              <View style={styles.upcomingRow}>
                <View style={styles.upcomingInfo}>
                  <Text style={styles.upcomingName}>{row.eventName}</Text>
                  <Text style={styles.upcomingMeta}>
                    {d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    {row.mealTypes.length > 0 ? ` · ${row.mealTypes.join(', ')}` : ''}
                    {' · '}{row.guestCount} Guests
                  </Text>
                </View>
                <ChevronRight size={18} color="#9CA3AF" />
              </View>
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity style={styles.fab} onPress={() => router.push('/new-event/customer-details')}>
          <Text style={styles.fabIcon}>+</Text>
        </TouchableOpacity>
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#1B4332' },
  calendarCard: { backgroundColor: '#fff', margin: 16, borderRadius: 16, padding: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  calHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  navBtn: { width: 32, height: 32, justifyContent: 'center', alignItems: 'center' },
  monthTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  daysRow: { flexDirection: 'row', marginBottom: 8 },
  dayLabel: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '600', color: '#9CA3AF' },
  datesGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dateCell: { width: `${100 / 7}%`, alignItems: 'center', paddingVertical: 4 },
  dateBubble: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  selectedBubble: { backgroundColor: '#1B4332' },
  todayBubble: { borderWidth: 1.5, borderColor: '#1B4332' },
  dateNum: { fontSize: 13, fontWeight: '500', color: '#374151' },
  selectedNum: { color: '#fff', fontWeight: '700' },
  todayNum: { color: '#1B4332', fontWeight: '700' },
  dotsRow: { flexDirection: 'row', gap: 2, marginTop: 2 },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#1B4332' },
  dotSelected: { backgroundColor: '#A7F3D0' },
  selectedSection: { paddingHorizontal: 16, marginBottom: 8 },
  selectedHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  selectedDate: { fontSize: 16, fontWeight: '700', color: '#111827' },
  countBadge: { backgroundColor: '#F0FDF4', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  countText: { fontSize: 12, fontWeight: '600', color: '#1B4332' },
  noEventsText: { fontSize: 14, color: '#9CA3AF', marginTop: 8, marginBottom: 16 },
  eventCard: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  eventTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  eventName: { fontSize: 15, fontWeight: '700', color: '#111827', flex: 1, marginRight: 8 },
  mealTypes: { fontSize: 11, color: '#1B4332', fontWeight: '600', marginBottom: 4 },
  badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  metaText: { fontSize: 12, color: '#6B7280' },
  upcomingCard: { backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 10, borderRadius: 14, padding: 14, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  upcomingLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 6 },
  upcomingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  upcomingInfo: { flex: 1 },
  upcomingName: { fontSize: 14, fontWeight: '700', color: '#111827' },
  upcomingMeta: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  fab: { position: 'absolute', right: 20, bottom: 20, width: 52, height: 52, backgroundColor: '#1B4332', borderRadius: 26, justifyContent: 'center', alignItems: 'center', shadowColor: '#1B4332', shadowOpacity: 0.4, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 8 },
  fabIcon: { fontSize: 28, color: '#fff', fontWeight: '300', lineHeight: 30 },
});