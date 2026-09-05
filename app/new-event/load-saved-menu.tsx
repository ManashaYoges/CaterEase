import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Calendar, Users, MapPin, ChevronRight } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { useNewEvent, EventDate, DateMenu, SelectedMenuItem } from '@/context/NewEventContext';
import { Event } from '@/types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '@/context/LanguageContext';

function genId() { return Math.random().toString(36).slice(2, 10); }

export default function LoadSavedMenuScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { update } = useNewEvent();
  const params = useLocalSearchParams<{ autoLoad?: string }>();
  const { t, language } = useLanguage();

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString(language === 'ta' ? 'ta-IN' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingEventId, setLoadingEventId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!user) { setLoading(false); return; }
      const snapshot = await getDocs(query(collection(db, 'events'), where('user_id', '==', user.uid)));
      const data = (snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Event[])
        .sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''));
      setEvents(data);
      setLoading(false);

      // If navigated here with autoLoad param, immediately load that event
      if (params.autoLoad) {
        const target = data.find(e => e.id === params.autoLoad);
        if (target) handleSelectEvent(target);
      }
    };
    load();
  }, [user]);

  const handleSelectEvent = async (event: Event) => {
    if (!user) return;
    setLoadingEventId(event.id);
    try {
      // Fetch this event's dates
      const dateSnap = await getDocs(
        query(collection(db, 'event_dates'), where('event_id', '==', event.id))
      );
      const savedDates = dateSnap.docs.map(d => ({ id: d.id, ...d.data() }) as any);

      // Fetch this event's menu items
      const menuSnap = await getDocs(
        query(collection(db, 'event_menu_items'), where('event_id', '==', event.id))
      );
      const savedMenuItems = menuSnap.docs.map(d => ({ id: d.id, ...d.data() }) as any);

      // Build new EventDate[] with fresh ids (so editing doesn't touch the original event)
      const newEventDates: EventDate[] = savedDates.length > 0
        ? savedDates.map(sd => ({
            id: genId(),
            date: sd.event_date,
            mealTypes: sd.meal_types || [],
            _originalDateId: sd.id, // temp field used below to map menu items
          } as any))
        : [{ id: genId(), date: event.event_date, mealTypes: [], _originalDateId: null } as any];

      // Build DateMenu[] — map saved menu items to their matching new date
      const newDateMenus: DateMenu[] = newEventDates.map((nd: any) => {
        const itemsForThisDate = savedMenuItems.filter(
          mi => mi.event_date_id === nd._originalDateId || !mi.event_date_id // fallback for old single-date events
        );
        const selectedItems: SelectedMenuItem[] = itemsForThisDate.map(mi => ({
          id: mi.menu_item_id,
          name: mi.menu_items?.name || 'Item',
          image_url: mi.menu_items?.image_url || null,
          price: mi.price_override || 0,
          mealCategory: mi.meal_type
            ? mi.meal_type.charAt(0).toUpperCase() + mi.meal_type.slice(1)
            : 'Breakfast',
          meal_category: mi.meal_category || 'main',
          meal_type: mi.meal_type || 'breakfast',
          menu_type: event.menu_type || 'veg',
          user_id: user.uid,
          description: null,
          is_active: true,
        } as any));

        const savedDateMatch = savedDates.find(sd => sd.id === nd._originalDateId);
        return {
          dateId: nd.id,
          selectedItems,
          guestCount: savedDateMatch?.guest_count ?? event.guest_count,
        };
      });

      // Strip temp field before saving to context
      const cleanEventDates: EventDate[] = newEventDates.map(({ _originalDateId, ...rest }: any) => rest);

      update({
        customerId: event.customer_id || '',
        customerName: '', // customer name not denormalized on event; user can re-pick if needed
        customerPhone: '',
        customerEmail: '',
        customerAddress: '',
        eventName: `${event.event_name} (${t('Copy')})`,
        eventType: event.event_type,
        eventDates: cleanEventDates,
        venue: event.venue,
        guestCount: event.guest_count,
        menuType: event.menu_type || 'veg',
        dateMenus: newDateMenus,
        currentDateIndex: 0,
        selectedItems: newDateMenus[0]?.selectedItems || [],
        advanceAmount: '',
        paymentStatus: 'not_received',
      });

      // Skip straight to build-menu — fully editable, then continues to review/confirm normally
      router.push('/new-event/build-menu');
    } catch (err: any) {
      console.error('Failed to load saved menu:', err);
    } finally {
      setLoadingEventId(null);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient colors={['#1B5E20', '#2E7D32']} style={styles.topHeaderGradient}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <ArrowLeft size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: '#FFFFFF' }]}>{t('Saved Events & Menus')}</Text>
          <View style={{ width: 40 }} />
        </View>
        <Text style={[styles.subtitle, { color: '#E8F5E9', paddingHorizontal: 16, paddingBottom: 14 }]}>
          {t("Select a past event to duplicate its menu. You'll be able to edit everything before saving.")}
        </Text>
      </LinearGradient>

      {loading ? (
        <ActivityIndicator color="#1B4332" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

          {events.length === 0 ? (
            <Text style={styles.emptyText}>{t('No saved events found.')}</Text>
          ) : (
            events.map(event => (
              <TouchableOpacity
                key={event.id}
                style={styles.eventCard}
                onPress={() => handleSelectEvent(event)}
                disabled={loadingEventId !== null}
              >
                <View style={styles.eventCardTop}>
                  <Text style={styles.eventName} numberOfLines={1}>{event.event_name}</Text>
                  {loadingEventId === event.id ? (
                    <ActivityIndicator size="small" color="#1B4332" />
                  ) : (
                    <ChevronRight size={18} color="#9CA3AF" />
                  )}
                </View>
                <View style={styles.metaRow}>
                  <Calendar size={13} color="#6B7280" />
                  <Text style={styles.metaText}>{formatDate(event.event_date)}</Text>
                </View>
                <View style={styles.metaRow}>
                  <Users size={13} color="#6B7280" />
                  <Text style={styles.metaText}>{event.guest_count} {t('Guests')}</Text>
                </View>
                <View style={styles.metaRow}>
                  <MapPin size={13} color="#6B7280" />
                  <Text style={styles.metaText}>{event.venue}</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
          <View style={{ height: 32 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  topHeaderGradient: { paddingBottom: 4 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255, 255, 255, 0.15)' },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 14.5, fontWeight: '700', color: '#FFFFFF' },
  scroll: { padding: 16, paddingBottom: 40 },
  subtitle: { fontSize: 11.5, color: '#6B7280', marginBottom: 16 },
  emptyText: { fontSize: 12.5, color: '#9CA3AF', textAlign: 'center', marginTop: 40 },
  eventCard: { backgroundColor: '#F9FAFB', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  eventCardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  eventName: { fontSize: 13, fontWeight: '700', color: '#111827', flex: 1, marginRight: 8 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  metaText: { fontSize: 10.5, color: '#6B7280' },
});