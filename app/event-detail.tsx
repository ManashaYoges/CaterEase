import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Edit2, MoreHorizontal, Share2, FileText, CheckSquare, Clock, ChevronDown, ChevronRight } from 'lucide-react-native';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Event, EventMenuItem } from '@/types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';

const TABS = ['Details', 'Menu', 'Guests', 'Notes'];

export default function EventDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [event, setEvent] = useState<Event | null>(null);
  const [menuItems, setMenuItems] = useState<EventMenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Details');
  const [expandedMeals, setExpandedMeals] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!id || !user) {
      setLoading(false);
      return;
    }
    Promise.all([
      getDoc(doc(db, 'events', id)),
      getDocs(query(collection(db, 'event_menu_items'), where('user_id', '==', user.uid))),
    ]).then(([eventSnap, menuSnap]) => {
      setEvent(eventSnap.exists() ? ({ id: eventSnap.id, ...eventSnap.data() } as Event) : null);
      const items = (menuSnap.docs.map(d => ({ id: d.id, ...d.data() })) as EventMenuItem[])
        .filter(item => item.event_id === id);
      setMenuItems(items);
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });
  }, [id, user]);

  const formatDate = (d: string) => {
    if (!d) return '';
    const dt = new Date(d + 'T00:00:00');
    return dt.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });
  };

  const getStatusStyle = (status: string) => {
    const map: Record<string, { bg: string; text: string }> = {
      confirmed: { bg: '#D1FAE5', text: '#065F46' },
      enquiry: { bg: '#FEF3C7', text: '#92400E' },
      draft: { bg: '#F3F4F6', text: '#374151' },
    };
    return map[status] || map.draft;
  };

  // Group menu items by meal type
  const mealGroups: Record<string, EventMenuItem[]> = {};
  for (const item of menuItems) {
    const cat = item.meal_type.charAt(0).toUpperCase() + item.meal_type.slice(1);
    if (!mealGroups[cat]) mealGroups[cat] = [];
    mealGroups[cat].push(item);
  }

  const mealTimes: Record<string, string> = {
    Breakfast: '07:30 AM - 09:30 AM',
    Lunch: '01:00 PM - 03:00 PM',
    Dinner: '07:30 PM - 09:30 PM',
    Snacks: '04:00 PM - 05:00 PM',
    Desserts: '',
    Beverages: '',
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#1B4332" /></View>;
  }

  const sc = event ? getStatusStyle(event.status) : { bg: '#F3F4F6', text: '#374151' };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{event?.event_name}</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity><Edit2 size={18} color="#374151" /></TouchableOpacity>
          <TouchableOpacity><MoreHorizontal size={20} color="#374151" /></TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Event Title */}
        <View style={styles.titleSection}>
          <View style={styles.titleIcon}>
            <Text style={styles.titleIconText}>🍽</Text>
          </View>
          <View style={styles.titleInfo}>
            <Text style={styles.eventTitle}>{event?.event_name}</Text>
            <View style={styles.statusRow}>
              <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
                <Text style={[styles.statusText, { color: sc.text }]}>
                  {event?.status.charAt(0).toUpperCase()}{event?.status.slice(1)}
                </Text>
              </View>
              <Text style={styles.eventDate}> · {formatDate(event?.event_date || '')}</Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          {[
            { icon: <Share2 size={20} color="#374151" />, label: 'Share' },
            { icon: <FileText size={20} color="#374151" />, label: 'Invoice' },
            { icon: <CheckSquare size={20} color="#374151" />, label: 'Checklist' },
            { icon: <MoreHorizontal size={20} color="#374151" />, label: 'More' },
          ].map(a => (
            <TouchableOpacity key={a.label} style={styles.actionItem}>
              <View style={styles.actionIcon}>{a.icon}</View>
              <Text style={styles.actionLabel}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          {TABS.map(tab => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab ? styles.tabActive : null]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab ? styles.tabTextActive : null]}>{tab}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {activeTab === 'Details' && (
          <View style={styles.detailsContent}>
            <View style={styles.detailCard}>
              <View style={styles.detailRow}><Text style={styles.detailLabel}>Event Name</Text><Text style={styles.detailValue}>{event?.event_name}</Text></View>
              <View style={styles.detailRow}><Text style={styles.detailLabel}>Date</Text><Text style={styles.detailValue}>{formatDate(event?.event_date || '')}</Text></View>
              <View style={styles.detailRow}><Text style={styles.detailLabel}>Venue</Text><Text style={styles.detailValue}>{event?.venue}</Text></View>
              <View style={styles.detailRow}><Text style={styles.detailLabel}>Guests</Text><Text style={styles.detailValue}>{event?.guest_count} Persons</Text></View>
              <View style={styles.detailRow}><Text style={styles.detailLabel}>Type</Text><Text style={styles.detailValue}>{event?.event_type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</Text></View>
            </View>
          </View>
        )}

        {activeTab === 'Menu' && (
          <View style={styles.menuContent}>
            {Object.entries(mealGroups).length === 0 ? (
              <Text style={styles.emptyText}>No menu items added yet.</Text>
            ) : (
              Object.entries(mealGroups).map(([meal, items]) => {
                const isExpanded = expandedMeals[meal] !== false;
                return (
                  <View key={meal} style={styles.mealGroup}>
                    <TouchableOpacity
                      style={styles.mealGroupHeader}
                      onPress={() => setExpandedMeals(prev => ({ ...prev, [meal]: !isExpanded }))}
                    >
                      <View style={styles.mealIconWrap}>
                        <Text style={styles.mealIcon}>🍽</Text>
                      </View>
                      <View style={styles.mealHeaderInfo}>
                        <Text style={styles.mealTitle}>{meal} ({items.length})</Text>
                        {mealTimes[meal] ? <Text style={styles.mealTime}>{mealTimes[meal]}</Text> : null}
                      </View>
                      {isExpanded ? <ChevronDown size={18} color="#374151" /> : <ChevronRight size={18} color="#374151" />}
                    </TouchableOpacity>
                    {isExpanded && (
                      <View style={styles.mealItems}>
                        {items.map(item => (
                          <View key={item.id} style={styles.mealItemChip}>
                            <View style={styles.mealItemDot} />
                            <Text style={styles.mealItemText}>{item.menu_items?.name}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </View>
        )}

        {activeTab === 'Guests' && (
          <View style={styles.emptyTabContent}>
            <Text style={styles.emptyText}>Guest list management coming soon.</Text>
          </View>
        )}

        {activeTab === 'Notes' && (
          <View style={styles.emptyTabContent}>
            <Text style={styles.emptyText}>No notes added yet.</Text>
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.editEventBtn}>
          <Edit2 size={16} color="#1B4332" />
          <Text style={styles.editEventText}>Edit Event</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.paymentBtn}>
          <Text style={styles.paymentIcon}>💳</Text>
          <Text style={styles.paymentText}>Add Payment</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F3F4F6', gap: 10 },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: '#111827' },
  headerActions: { flexDirection: 'row', gap: 16 },
  titleSection: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#fff', gap: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  titleIcon: { width: 48, height: 48, backgroundColor: '#1B4332', borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  titleIconText: { fontSize: 22 },
  titleInfo: { flex: 1 },
  eventTitle: { fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 4 },
  statusRow: { flexDirection: 'row', alignItems: 'center' },
  statusBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontSize: 11, fontWeight: '700' },
  eventDate: { fontSize: 12, color: '#6B7280' },
  quickActions: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: '#fff', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  actionItem: { alignItems: 'center', gap: 4 },
  actionIcon: { width: 44, height: 44, backgroundColor: '#F9FAFB', borderRadius: 22, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB' },
  actionLabel: { fontSize: 11, color: '#6B7280', fontWeight: '500' },
  tabs: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: '#1B4332' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#9CA3AF' },
  tabTextActive: { color: '#1B4332' },
  detailsContent: { padding: 16 },
  detailCard: { backgroundColor: '#fff', borderRadius: 14, padding: 16 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F9FAFB' },
  detailLabel: { fontSize: 13, color: '#9CA3AF' },
  detailValue: { fontSize: 13, fontWeight: '600', color: '#111827' },
  menuContent: { padding: 16 },
  emptyTabContent: { padding: 32, alignItems: 'center' },
  emptyText: { fontSize: 14, color: '#9CA3AF' },
  mealGroup: { backgroundColor: '#fff', borderRadius: 14, marginBottom: 10, overflow: 'hidden' },
  mealGroupHeader: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 },
  mealIconWrap: { width: 36, height: 36, backgroundColor: '#F0FDF4', borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  mealIcon: { fontSize: 16 },
  mealHeaderInfo: { flex: 1 },
  mealTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  mealTime: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  mealItems: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 14, paddingTop: 0 },
  mealItemChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F0FDF4', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: '#D1FAE5' },
  mealItemDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#16A34A' },
  mealItemText: { fontSize: 13, color: '#065F46', fontWeight: '500' },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', gap: 10, padding: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  editEventBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1.5, borderColor: '#1B4332', borderRadius: 12, height: 48 },
  editEventText: { fontSize: 14, fontWeight: '700', color: '#1B4332' },
  paymentBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#1B4332', borderRadius: 12, height: 48 },
  paymentIcon: { fontSize: 16 },
  paymentText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
