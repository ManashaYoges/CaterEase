import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Bell, User, Calendar, Utensils, Edit2 } from 'lucide-react-native';
import { useNewEvent } from '@/context/NewEventContext';
import StepIndicator from '@/components/StepIndicator';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function formatDate(dateStr: string) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

export default function ReviewOrderScreen() {
  const router = useRouter();
  const { data } = useNewEvent();
  const insets = useSafeAreaInsets();

  const draftId = `#CE-${new Date().getFullYear()}-${new Date().toISOString().slice(5,7)}${new Date().toISOString().slice(8,10)}`;

  // Build per-date review data
  const dateReviews = data.eventDates.map(ed => {
    const dateMenu = data.dateMenus.find(dm => dm.dateId === ed.id);
    const items = dateMenu?.selectedItems || [];
    const guests = dateMenu?.guestCount ?? data.guestCount;

    // Group items by meal category
    const groups: Record<string, typeof items> = {};
    for (const item of items) {
      const cat = item.mealCategory.toUpperCase();
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    }

    const menuPerPlate = items.reduce((sum, i) => sum + (i.price || 0), 0);
    const dateTotal = menuPerPlate * guests;

    return { ed, items, guests, groups, menuPerPlate, dateTotal };
  });

  const grandTotal = dateReviews.reduce((sum, dr) => sum + dr.dateTotal, 0);
  const totalGuests = dateReviews.reduce((sum, dr) => sum + dr.guests, 0);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Review Order</Text>
        <TouchableOpacity><Bell size={22} color="#374151" /></TouchableOpacity>
      </View>

      <StepIndicator current={4} total={4} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Customer Details */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIconWrap}><User size={16} color="#1B4332" /></View>
            <Text style={styles.cardTitle}>Customer Details</Text>
            <TouchableOpacity style={styles.editBtn} onPress={() => router.push('/new-event/customer-details')}>
              <Edit2 size={14} color="#1B4332" /><Text style={styles.editText}>Edit</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.detailRow}><Text style={styles.detailLabel}>Name</Text><Text style={styles.detailValue}>{data.customerName || '-'}</Text></View>
          <View style={styles.detailRow}><Text style={styles.detailLabel}>Phone</Text><Text style={styles.detailValue}>{data.customerPhone || '-'}</Text></View>
          {data.customerEmail ? <View style={styles.detailRow}><Text style={styles.detailLabel}>Email</Text><Text style={styles.detailValue}>{data.customerEmail}</Text></View> : null}
          {data.customerAddress ? <View style={styles.detailRow}><Text style={styles.detailLabel}>Address</Text><Text style={styles.detailValue}>{data.customerAddress}</Text></View> : null}
        </View>

        {/* Event Details */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIconWrap}><Calendar size={16} color="#1B4332" /></View>
            <Text style={styles.cardTitle}>Event Details</Text>
            <TouchableOpacity style={styles.editBtn} onPress={() => router.push('/new-event')}>
              <Edit2 size={14} color="#1B4332" /><Text style={styles.editText}>Edit</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.detailRow}><Text style={styles.detailLabel}>Name</Text>
            <View style={styles.detailValueRow}>
              <Text style={styles.detailValue}>{data.eventName}</Text>
              <View style={styles.confirmedBadge}><Text style={styles.confirmedText}>Confirmed</Text></View>
            </View>
          </View>
          <View style={styles.detailRow}><Text style={styles.detailLabel}>Venue</Text><Text style={styles.detailValue}>{data.venue}</Text></View>
          <View style={styles.detailRow}><Text style={styles.detailLabel}>Dates</Text><Text style={styles.detailValue}>{data.eventDates.length} date(s)</Text></View>
          <View style={styles.detailRow}><Text style={styles.detailLabel}>Total Guests</Text><Text style={styles.detailValue}>{totalGuests} Persons</Text></View>
        </View>

        {/* Per-date menu cards */}
        {dateReviews.map((dr, idx) => (
          <View key={dr.ed.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardIconWrap}><Utensils size={16} color="#1B4332" /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{formatDate(dr.ed.date)}</Text>
                <Text style={styles.cardSubtitle}>
                  {dr.ed.mealTypes.join(', ')} • {dr.guests} guests
                </Text>
              </View>
              <TouchableOpacity
                style={styles.editBtn}
                onPress={() => {
                  // Go back to build-menu for this date
                  // Reset currentDateIndex to this date's index
                  router.push('/new-event/build-menu');
                }}
              >
                <Edit2 size={14} color="#1B4332" /><Text style={styles.editText}>Edit</Text>
              </TouchableOpacity>
            </View>

            {dr.items.length === 0 ? (
              <Text style={styles.noMenuText}>No menu selected for this date</Text>
            ) : (
              <>
                {Object.entries(dr.groups).map(([cat, items]) => {
                  const subtotal = items.reduce((s, i) => s + (i.price || 0), 0);
                  return (
                    <View key={cat}>
                      <Text style={styles.menuCatTitle}>{cat} ({items.length} ITEMS)</Text>
                      {items.map(item => (
                        <View key={item.id} style={styles.menuItemRow}>
                          <Text style={styles.menuItemName}>{item.name}</Text>
                          <Text style={styles.menuItemPrice}>₹ {item.price || 0}</Text>
                        </View>
                      ))}
                      <View style={styles.subtotalRow}>
                        <Text style={styles.subtotalLabel}>{cat.charAt(0) + cat.slice(1).toLowerCase()} Subtotal</Text>
                        <Text style={styles.subtotalValue}>₹ {subtotal}</Text>
                      </View>
                      <View style={styles.divider} />
                    </View>
                  );
                })}

                {/* Per-date cost summary */}
                <View style={styles.dateCostRow}>
                  <Text style={styles.dateCostLabel}>₹ {dr.menuPerPlate} / plate × {dr.guests} guests</Text>
                  <Text style={styles.dateCostValue}>₹ {dr.dateTotal.toLocaleString()}</Text>
                </View>
              </>
            )}
          </View>
        ))}

        {/* Grand Total */}
        <View style={styles.estimatedCard}>
          <View>
            <Text style={styles.estimatedLabel}>Total Estimated Cost</Text>
            <Text style={styles.estimatedValue}>₹ {grandTotal.toLocaleString()}</Text>
            <Text style={styles.estimatedSub}>
              {data.eventDates.length} date(s) • {totalGuests} total guests
            </Text>
          </View>
          <View style={styles.draftBadge}>
            <Text style={styles.draftLabel}>DRAFT ID</Text>
            <Text style={styles.draftId}>{draftId}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.nextBtn} onPress={() => router.push('/new-event/confirm-save')}>
          <Text style={styles.nextBtnText}>Next: Confirm & Save</Text>
          <Text style={styles.nextArrow}>→</Text>
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  scroll: { padding: 16, paddingBottom: 40 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  cardIconWrap: { width: 28, height: 28, backgroundColor: '#F0FDF4', borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  cardTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: '#111827' },
  cardSubtitle: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  editText: { fontSize: 13, color: '#1B4332', fontWeight: '600' },
  detailRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 4, justifyContent: 'space-between' },
  detailLabel: { fontSize: 13, color: '#9CA3AF', width: 80 },
  detailValue: { flex: 1, fontSize: 13, fontWeight: '600', color: '#111827', textAlign: 'right' },
  detailValueRow: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8 },
  confirmedBadge: { backgroundColor: '#D1FAE5', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  confirmedText: { fontSize: 11, fontWeight: '700', color: '#065F46' },
  noMenuText: { fontSize: 13, color: '#9CA3AF', fontStyle: 'italic', textAlign: 'center', paddingVertical: 8 },
  menuCatTitle: { fontSize: 11, fontWeight: '800', color: '#9CA3AF', letterSpacing: 0.8, marginBottom: 6, marginTop: 8 },
  menuItemRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  menuItemName: { fontSize: 13, color: '#374151' },
  menuItemPrice: { fontSize: 13, color: '#374151', fontWeight: '600' },
  subtotalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, marginTop: 4 },
  subtotalLabel: { fontSize: 13, fontWeight: '700', color: '#111827' },
  subtotalValue: { fontSize: 13, fontWeight: '700', color: '#111827' },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 4 },
  dateCostRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F0FDF4', borderRadius: 10, padding: 12, marginTop: 8 },
  dateCostLabel: { fontSize: 12, color: '#374151' },
  dateCostValue: { fontSize: 15, fontWeight: '800', color: '#1B4332' },
  estimatedCard: { backgroundColor: '#1B4332', borderRadius: 14, padding: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  estimatedLabel: { fontSize: 13, color: '#A7F3D0', marginBottom: 6 },
  estimatedValue: { fontSize: 26, fontWeight: '800', color: '#fff' },
  estimatedSub: { fontSize: 11, color: '#A7F3D0', marginTop: 4 },
  draftBadge: { alignItems: 'flex-end' },
  draftLabel: { fontSize: 10, color: '#A7F3D0', fontWeight: '700', letterSpacing: 1 },
  draftId: { fontSize: 13, color: '#fff', fontWeight: '700', marginTop: 4 },
  nextBtn: { backgroundColor: '#1B4332', borderRadius: 12, height: 52, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  nextBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  nextArrow: { fontSize: 18, color: '#fff' },
});