import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Bell, Menu, ChevronLeft, ChevronRight, Clock, MapPin, Users } from 'lucide-react-native';
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

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
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
  const { reset } = useNewEvent();
  const { t, language } = useLanguage();

  const handleNewEvent = () => {
    reset();
    router.push('/new-event/customer-details');
  };
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

  const daysHeaders = language === 'ta'
    ? ['ஞா', 'தி', 'செ', 'பு', 'வி', 'வெ', 'ச']
    : ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient colors={['#1B5E20', '#2E7D32']} style={styles.header}>
        <TouchableOpacity><Menu size={20} color="#FFFFFF" /></TouchableOpacity>
        <Text style={[styles.headerTitle, { color: '#FFFFFF' }]}>{t('CaterEase')}</Text>
        <TouchableOpacity><Bell size={20} color="#FFFFFF" /></TouchableOpacity>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.calendarCard}>
          <View style={styles.calHeader}>
            <TouchableOpacity onPress={prevMonth} style={styles.navBtn}>
              <ChevronLeft size={18} color="#374151" />
            </TouchableOpacity>
            <Text style={styles.monthTitle}>{t(MONTHS[currentMonth])} {currentYear}</Text>
            <TouchableOpacity onPress={nextMonth} style={styles.navBtn}>
              <ChevronRight size={18} color="#374151" />
            </TouchableOpacity>
          </View>

          <View style={styles.daysRow}>
            {daysHeaders.map(d => <Text key={d} style={styles.dayLabel}>{d}</Text>)}
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
              {new Date(selectedDate + 'T00:00:00').toLocaleDateString(language === 'ta' ? 'ta-IN' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </Text>
            {selectedRows.length > 0 && (
              <View style={styles.countBadge}>
                <Text style={styles.countText}>{selectedRows.length} {t('Events Count')}</Text>
              </View>
            )}
          </View>

          {loading ? (
            <ActivityIndicator color="#1B4332" style={{ marginTop: 20 }} />
          ) : selectedRows.length === 0 ? (
            <Text style={styles.noEventsText}>{t('No events on this date.')}</Text>
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
                        {t(row.status)}
                      </Text>
                    </View>
                  </View>
                  {row.mealTypes.length > 0 && (
                    <Text style={styles.mealTypes}>{row.mealTypes.map(m => t(m)).join(' · ')}</Text>
                  )}
                  <View style={styles.metaRow}><MapPin size={12} color="#6B7280" /><Text style={styles.metaText}>{row.venue}</Text></View>
                  <View style={styles.metaRow}><Users size={12} color="#6B7280" /><Text style={styles.metaText}>{row.guestCount} {t('Guests')}</Text></View>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        {/* Upcoming dates after selected */}
        {rows.filter(r => r.date > selectedDate).slice(0, 2).map((row, idx) => {
          const d = new Date(row.date + 'T00:00:00');
          const labelColor = row.status === 'enquiry' ? '#92400E' : '#1B4332';
          const labelKey = row.status === 'enquiry' ? 'PENDING ENQUIRY' : 'NEXT UPCOMING';
          return (
            <TouchableOpacity
              key={`upcoming-${row.eventId}-${idx}`}
              style={styles.upcomingCard}
              onPress={() => router.push({ pathname: '/event-detail', params: { id: row.eventId } })}
            >
              <Text style={[styles.upcomingLabel, { color: labelColor }]}>{t(labelKey)}</Text>
              <View style={styles.upcomingRow}>
                <View style={styles.upcomingInfo}>
                  <Text style={styles.upcomingName}>{row.eventName}</Text>
                  <Text style={styles.upcomingMeta}>
                    {d.toLocaleDateString(language === 'ta' ? 'ta-IN' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    {row.mealTypes.length > 0 ? ` · ${row.mealTypes.map(m => t(m)).join(', ')}` : ''}
                    {' · '}{row.guestCount} {t('Guests')}
                  </Text>
                </View>
                <ChevronRight size={16} color="#9CA3AF" />
              </View>
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity style={styles.fab} onPress={handleNewEvent}>
          <Text style={styles.fabIcon}>+</Text>
        </TouchableOpacity>
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255, 255, 255, 0.15)' },
  headerTitle: { ...T.h2, color: '#1B4332' },
  calendarCard: { backgroundColor: '#fff', margin: 14, borderRadius: 14, padding: 14, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  calHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  navBtn: { width: 30, height: 30, justifyContent: 'center', alignItems: 'center' },
  monthTitle: { ...T.sectionHeader },
  daysRow: { flexDirection: 'row', marginBottom: 6 },
  dayLabel: { flex: 1, textAlign: 'center', ...T.labelSm, color: '#9CA3AF' },
  datesGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dateCell: { width: `${100 / 7}%`, alignItems: 'center', paddingVertical: 3 },
  dateBubble: { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  selectedBubble: { backgroundColor: '#1B4332' },
  todayBubble: { borderWidth: 1.5, borderColor: '#1B4332' },
  dateNum: { fontSize: scaleFont(10.5), fontFamily: F.regular, color: '#374151' },
  selectedNum: { color: '#fff', fontFamily: F.semibold },
  todayNum: { color: '#1B4332', fontFamily: F.semibold },
  dotsRow: { flexDirection: 'row', gap: 2, marginTop: 2 },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#1B4332' },
  dotSelected: { backgroundColor: '#A7F3D0' },
  selectedSection: { paddingHorizontal: 14, marginBottom: 8 },
  selectedHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  selectedDate: { ...T.sectionHeader },
  countBadge: { backgroundColor: '#F0FDF4', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  countText: { fontSize: scaleFont(9.5), fontFamily: F.medium, color: '#1B4332' },
  noEventsText: { ...T.bodySm, color: '#9CA3AF', marginTop: 6, marginBottom: 14 },
  eventCard: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 8, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 5, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  eventTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  eventName: { ...T.eventName, flex: 1, marginRight: 6 },
  mealTypes: { fontSize: scaleFont(9.5), color: '#1B4332', fontFamily: F.medium, marginBottom: 2 },
  badge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  badgeText: { fontSize: scaleFont(8.5), fontFamily: F.medium },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  metaText: { ...T.cardContent, fontSize: scaleFont(9.5) },
  upcomingCard: { backgroundColor: '#fff', marginHorizontal: 14, marginBottom: 8, borderRadius: 12, padding: 12, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  upcomingLabel: { fontSize: scaleFont(8.5), fontFamily: F.semibold, letterSpacing: 0.5, marginBottom: 4 },
  upcomingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  upcomingInfo: { flex: 1 },
  upcomingName: { ...T.eventName },
  upcomingMeta: { ...T.cardContent, fontSize: scaleFont(9.5), marginTop: 1 },
  fab: { position: 'absolute', right: 16, bottom: 16, width: 48, height: 48, backgroundColor: '#1B4332', borderRadius: 24, justifyContent: 'center', alignItems: 'center', shadowColor: '#1B4332', shadowOpacity: 0.3, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 6 },
  fabIcon: { fontSize: scaleFont(20), color: '#fff', fontFamily: F.regular, lineHeight: 22 },
});