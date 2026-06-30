import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Bell, Folder, Plus, Clock, ChevronRight } from 'lucide-react-native';
import { useNewEvent } from '@/context/NewEventContext';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';

export default function MenuSelectionScreen() {
  const router = useRouter();
  const { data } = useNewEvent();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
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
    if (hrs < 1) return 'Just now';
    if (hrs < 24) return `${hrs} hrs ago`;
    return `${Math.floor(hrs / 24)} days ago`;
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerBrand}>CaterEase</Text>
        <TouchableOpacity><Bell size={22} color="#374151" /></TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Menu Selection</Text>
        <Text style={styles.subtitle}>How would you like to begin your event planning today?</Text>

        // REPLACE the first optionCard's onPress and the "Browse Drafts" onPress:
<TouchableOpacity style={styles.optionCard} onPress={() => router.push('/new-event/load-saved-menu')}>
  <View style={styles.optionIcon}>
    <Folder size={28} color="#1B4332" />
  </View>
  <View style={styles.optionContent}>
    <Text style={styles.optionTitle}>Open Saved Menu</Text>
    <Text style={styles.optionDesc}>Continue working on your drafts or use a saved template for faster setup.</Text>
    <TouchableOpacity style={styles.optionAction} onPress={() => router.push('/new-event/load-saved-menu')}>
      <Text style={styles.optionActionText}>Browse Drafts</Text>
      <Clock size={14} color="#1B4332" />
    </TouchableOpacity>
  </View>
</TouchableOpacity>

        <TouchableOpacity style={styles.optionCard} onPress={() => router.push('/new-event/build-menu')}>
          <View style={styles.optionIcon}>
            <Plus size={28} color="#1B4332" />
          </View>
          <View style={styles.optionContent}>
            <Text style={styles.optionTitle}>Create a New Menu</Text>
            <Text style={styles.optionDesc}>Start building a custom menu for your event from scratch with our intuitive builder.</Text>
            <TouchableOpacity style={styles.optionAction} onPress={() => router.push('/new-event/build-menu')}>
              <Text style={styles.optionActionText}>Get Started</Text>
              <Text style={styles.arrow}>→</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>

        {recentEvents.length > 0 && (
          <>
            <View style={styles.recentHeader}>
              <Text style={styles.recentTitle}>Recently Modified</Text>
              <TouchableOpacity><Text style={styles.viewAll}>View All</Text></TouchableOpacity>
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
                  <Text style={styles.recentName}>{event.event_name} - {event.status.charAt(0).toUpperCase() + event.status.slice(1)}</Text>
                  <Text style={styles.recentTime}>Last edited {timeAgo(event.updated_at)}</Text>
                </View>
                <ChevronRight size={16} color="#9CA3AF" />
              </TouchableOpacity>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  headerBrand: { fontSize: 17, fontWeight: '700', color: '#1B4332' },
  scroll: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: '800', color: '#111827', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#6B7280', marginBottom: 24 },
  optionCard: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#E5E7EB', gap: 16, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  optionIcon: { width: 56, height: 56, backgroundColor: '#F0FDF4', borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  optionContent: { flex: 1 },
  optionTitle: { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 6 },
  optionDesc: { fontSize: 13, color: '#6B7280', lineHeight: 20, marginBottom: 12 },
  optionAction: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  optionActionText: { fontSize: 13, color: '#1B4332', fontWeight: '700' },
  arrow: { fontSize: 14, color: '#1B4332', fontWeight: '700' },
  recentHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, marginTop: 8 },
  recentTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  viewAll: { fontSize: 13, color: '#1B4332', fontWeight: '600' },
  recentCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#E5E7EB', gap: 12 },
  recentIcon: { width: 40, height: 40, backgroundColor: '#F0FDF4', borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  docIcon: { width: 20, height: 24, borderWidth: 2, borderColor: '#1B4332', borderRadius: 3 },
  recentInfo: { flex: 1 },
  recentName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  recentTime: { fontSize: 12, color: '#6B7280', marginTop: 2 },
});
