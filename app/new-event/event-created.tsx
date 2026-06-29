import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Share,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Calendar, Clock, MapPin, Users } from 'lucide-react-native';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Event } from '@/types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function EventCreatedScreen() {
  const router = useRouter();
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const insets = useSafeAreaInsets();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (eventId) {
      getDoc(doc(db, 'events', eventId)).then((snap) => {
        setEvent(snap.exists() ? ({ id: snap.id, ...snap.data() } as Event) : null);
        setLoading(false);
      });
    }
  }, [eventId]);

  const formatDate = (d: string) => {
    if (!d) return '';
    const dt = new Date(d + 'T00:00:00');
    return dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) +
      ` (${dt.toLocaleDateString('en-GB', { weekday: 'short' })})`;
  };

  const handleShare = async () => {
    if (!event) return;
    await Share.share({ message: `Event: ${event.event_name}\nDate: ${formatDate(event.event_date)}\nVenue: ${event.venue}\nGuests: ${event.guest_count}` });
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#1B4332" /></View>;
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.topSection}>
        <View style={styles.starsRow}>
          {[...Array(6)].map((_, i) => <View key={i} style={[styles.star, { top: Math.random() * 40, left: (i * 60) + Math.random() * 20 }]} />)}
        </View>
        <View style={styles.checkCircle}>
          <Text style={styles.checkMark}>✓</Text>
        </View>
        <Text style={styles.successTitle}>Event Created Successfully!</Text>
        <Text style={styles.successSubtitle}>Your event has been saved and is now ready for management.</Text>
      </View>

      <View style={styles.eventCard}>
        <View style={styles.eventCardHeader}>
          <Text style={styles.eventName}>{event?.event_name}</Text>
          <View style={styles.confirmedBadge}><Text style={styles.confirmedText}>Confirmed</Text></View>
        </View>

        <View style={styles.detailItem}>
          <Calendar size={16} color="#6B7280" />
          <Text style={styles.detailText}>{formatDate(event?.event_date || '')}</Text>
        </View>
        <View style={styles.detailItem}>
          <Clock size={16} color="#6B7280" />
          <Text style={styles.detailText}>07:00 PM Onwards</Text>
        </View>
        <View style={styles.detailItem}>
          <MapPin size={16} color="#6B7280" />
          <Text style={styles.detailText}>{event?.venue}</Text>
        </View>
        <View style={styles.detailItem}>
          <Users size={16} color="#6B7280" />
          <Text style={styles.detailText}>{event?.guest_count} Guests</Text>
        </View>

        <TouchableOpacity
          style={styles.viewDetailsBtn}
          onPress={() => router.push({ pathname: '/event-detail', params: { id: eventId } })}
        >
          <Text style={styles.viewDetailsBtnText}>View Event Details</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.bottomSection}>
        <TouchableOpacity style={styles.dashBtn} onPress={() => router.replace('/(tabs)/dashboard')}>
          <Text style={styles.dashBtnText}>Go to Dashboard</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
          <Text style={styles.shareIcon}>↑</Text>
          <Text style={styles.shareBtnText}>Share Event</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1B4332' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1B4332' },
  topSection: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24, paddingTop: 40 },
  starsRow: { position: 'absolute', top: 20, left: 0, right: 0, height: 60, overflow: 'hidden' },
  star: { position: 'absolute', width: 6, height: 6, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 3 },
  checkCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', marginBottom: 20, borderWidth: 4, borderColor: '#A7F3D0' },
  checkMark: { fontSize: 36, color: '#1B4332', fontWeight: '800' },
  successTitle: { fontSize: 24, fontWeight: '800', color: '#fff', textAlign: 'center', marginBottom: 10 },
  successSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.7)', textAlign: 'center', lineHeight: 22 },
  eventCard: { backgroundColor: '#fff', marginHorizontal: 20, borderRadius: 20, padding: 20, marginBottom: 20 },
  eventCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  eventName: { fontSize: 18, fontWeight: '800', color: '#111827', flex: 1 },
  confirmedBadge: { backgroundColor: '#D1FAE5', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  confirmedText: { fontSize: 11, fontWeight: '700', color: '#065F46' },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  detailText: { fontSize: 14, color: '#374151', fontWeight: '500' },
  viewDetailsBtn: { borderWidth: 1.5, borderColor: '#1B4332', borderRadius: 12, height: 46, justifyContent: 'center', alignItems: 'center', marginTop: 12 },
  viewDetailsBtnText: { fontSize: 14, fontWeight: '700', color: '#1B4332' },
  bottomSection: { paddingHorizontal: 20, paddingBottom: 32, gap: 12 },
  dashBtn: { backgroundColor: '#16A34A', borderRadius: 14, height: 54, justifyContent: 'center', alignItems: 'center' },
  dashBtnText: { fontSize: 16, fontWeight: '800', color: '#fff' },
  shareBtn: { borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)', borderRadius: 14, height: 54, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 8 },
  shareIcon: { fontSize: 16, color: '#fff' },
  shareBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
