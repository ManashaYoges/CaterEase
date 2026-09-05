import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Calendar, Clock, MapPin, Users } from 'lucide-react-native';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Event } from '@/types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '@/context/LanguageContext';
import { F, scaleFont } from '@/utils/fonts';
import { T } from '@/utils/typography';
import { generateAndShareInvoiceFromEventId } from '@/utils/generateEventPDF';

export default function EventCreatedScreen() {
  const router = useRouter();
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const insets = useSafeAreaInsets();
  const { t, language } = useLanguage();

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingPDF, setGeneratingPDF] = useState(false);

  const formatDateLong = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString(language === 'ta' ? 'ta-IN' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric', weekday: 'short' });
  };

  useEffect(() => {
    if (!eventId) return;
    getDoc(doc(db, 'events', eventId)).then(snap => {
      setEvent(snap.exists() ? ({ id: snap.id, ...snap.data() } as Event) : null);
      setLoading(false);
    });
  }, [eventId]);

  const handleSharePDF = () => {
    if (!eventId || !event) return;
    Alert.alert(
      t('Download/Print Event PDF'),
      t('Select PDF option:'),
      [
        {
          text: t('With Price'),
          onPress: async () => {
            setGeneratingPDF(true);
            try {
              await generateAndShareInvoiceFromEventId(eventId, true);
            } catch (err: any) {
              Alert.alert(t('Error'), err.message || 'Failed to generate PDF');
            } finally {
              setGeneratingPDF(false);
            }
          },
        },
        {
          text: t('Without Price'),
          onPress: async () => {
            setGeneratingPDF(true);
            try {
              await generateAndShareInvoiceFromEventId(eventId, false);
            } catch (err: any) {
              Alert.alert(t('Error'), err.message || 'Failed to generate PDF');
            } finally {
              setGeneratingPDF(false);
            }
          },
        },
        { text: t('Cancel'), style: 'cancel' },
      ]
    );
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#1B4332" /></View>;
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.topSection}>
        <View style={styles.starsRow}>
          {[...Array(6)].map((_, i) => (
            <View key={i} style={[styles.star, { top: i * 8, left: i * 55 + 10 }]} />
          ))}
        </View>
        <View style={styles.checkCircle}>
          <Text style={styles.checkMark}>✓</Text>
        </View>
        <Text style={styles.successTitle}>{t('Event Created Successfully!')}</Text>
        <Text style={styles.successSubtitle}>
          {t('Your event has been saved and is now ready for management.')}
        </Text>
      </View>

      <View style={styles.eventCard}>
        <View style={styles.eventCardHeader}>
          <Text style={styles.eventName}>{event?.event_name}</Text>
          <View style={styles.confirmedBadge}>
            <Text style={styles.confirmedText}>{t('Confirmed')}</Text>
          </View>
        </View>
        <View style={styles.detailItem}>
          <Calendar size={14} color="#6B7280" />
          <Text style={styles.detailText}>{formatDateLong(event?.event_date || '')}</Text>
        </View>
        <View style={styles.detailItem}>
          <MapPin size={14} color="#6B7280" />
          <Text style={styles.detailText}>{event?.venue}</Text>
        </View>
        <View style={styles.detailItem}>
          <Users size={14} color="#6B7280" />
          <Text style={styles.detailText}>{event?.guest_count} {t('Guests')}</Text>
        </View>
        <TouchableOpacity
          style={styles.viewDetailsBtn}
          onPress={() => router.push({ pathname: '/event-detail', params: { id: eventId } })}
        >
          <Text style={styles.viewDetailsBtnText}>{t('View Event Details')}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.bottomSection}>
        <TouchableOpacity
          style={styles.dashBtn}
          onPress={() => router.replace('/(tabs)/dashboard')}
        >
          <Text style={styles.dashBtnText}>{t('Go to Dashboard')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.pdfBtn, generatingPDF && { opacity: 0.7 }]}
          onPress={handleSharePDF}
          disabled={generatingPDF}
        >
          {generatingPDF
            ? <ActivityIndicator size="small" color="#1B4332" />
            : <Text style={styles.pdfBtnText}>📄 {t('Share as PDF')}</Text>
          }
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1B4332' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1B4332' },
  topSection: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20, paddingTop: 30 },
  starsRow: { position: 'absolute', top: 20, left: 0, right: 0, height: 60, overflow: 'hidden' },
  star: { position: 'absolute', width: 5, height: 5, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 2.5 },
  checkCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', marginBottom: 16, borderWidth: 3, borderColor: '#A7F3D0' },
  checkMark: { fontSize: scaleFont(24), color: '#1B4332', fontFamily: F.bold },
  successTitle: { fontSize: scaleFont(17.5), fontFamily: F.bold, color: '#fff', textAlign: 'center', marginBottom: 6 },
  successSubtitle: { ...T.bodySm, color: 'rgba(255,255,255,0.7)', textAlign: 'center', lineHeight: 16 },
  eventCard: { backgroundColor: '#fff', marginHorizontal: 16, borderRadius: 16, padding: 16, marginBottom: 16 },
  eventCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  eventName: { ...T.eventName, fontSize: scaleFont(13), color: '#111827', flex: 1 },
  confirmedBadge: { backgroundColor: '#D1FAE5', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  confirmedText: { ...T.badgeSm, color: '#065F46' },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  detailText: { ...T.bodySm, color: '#374151' },
  viewDetailsBtn: { borderWidth: 1, borderColor: '#1B4332', borderRadius: 10, height: 42, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  viewDetailsBtnText: { ...T.btnLg, fontSize: scaleFont(11.5), color: '#1B4332' },
  bottomSection: { paddingHorizontal: 16, paddingBottom: 24, gap: 10 },
  dashBtn: { backgroundColor: '#16A34A', borderRadius: 12, height: 48, justifyContent: 'center', alignItems: 'center' },
  dashBtnText: { ...T.btnLg, fontSize: scaleFont(12.5) },
  pdfBtn: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)', borderRadius: 12, height: 48, justifyContent: 'center', alignItems: 'center' },
  pdfBtnText: { fontSize: scaleFont(12.5), fontFamily: F.semibold, color: '#fff' },
  shareBtn: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', borderRadius: 12, height: 48, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 6 },
  shareIcon: { fontSize: scaleFont(12.5) },
  shareBtnText: { fontSize: scaleFont(12.5), fontFamily: F.semibold, color: '#fff' },
});