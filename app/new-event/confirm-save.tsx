import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, X, CreditCard, Image as ImageIcon, FileText } from 'lucide-react-native';
import { useNewEvent } from '@/context/NewEventContext';
import StepIndicator from '@/components/StepIndicator';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const PAYMENT_STATUSES = ['Not Received', 'Partial', 'Received'];

export default function ConfirmSaveScreen() {
  const router = useRouter();
  const { data, reset } = useNewEvent();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [advanceAmount, setAdvanceAmount] = useState(data.advanceAmount || '');
  const [paymentStatus, setPaymentStatus] = useState('Not Received');
  const [loading, setLoading] = useState(false);
  const [showStatusPicker, setShowStatusPicker] = useState(false);

  // Compute grand total across ALL dates using per-date menus + guest counts
  const totalEstimated = data.eventDates.reduce((grand, ed) => {
    const dm = data.dateMenus.find(d => d.dateId === ed.id);
    const items = dm?.selectedItems || [];
    const guests = dm?.guestCount ?? data.guestCount;
    const perPlate = items.reduce((s, i) => s + (i.price || 0), 0);
    return grand + perPlate * guests;
  }, 0);

  const totalGuests = data.eventDates.reduce((sum, ed) => {
    const dm = data.dateMenus.find(d => d.dateId === ed.id);
    return sum + (dm?.guestCount ?? data.guestCount);
  }, 0);

  const primaryDate = data.eventDates[0]?.date || new Date().toISOString().split('T')[0];

  const saveEvent = async (createAnother = false) => {
    if (!user) {
      Alert.alert('Error', 'Please login again before saving an event.');
      return;
    }
    setLoading(true);
    try {
      let customerId = data.customerId;

      if (!customerId && data.customerName && data.customerPhone) {
        const custRef = await addDoc(collection(db, 'customers'), {
          full_name: data.customerName,
          phone: data.customerPhone,
          email: data.customerEmail || null,
          address: data.customerAddress || null,
          user_id: user.uid,
          created_at: new Date().toISOString(),
        });
        customerId = custRef.id;
      }

      const draftId = `CE-${new Date().getFullYear()}-${new Date().toISOString().slice(5, 7)}${new Date().toISOString().slice(8, 10)}`;
      const nowIso = new Date().toISOString();

      const eventRef = await addDoc(collection(db, 'events'), {
        customer_id: customerId || null,
        event_name: data.eventName,
        event_type: data.eventType,
        event_date: primaryDate,
        venue: data.venue,
        guest_count: totalGuests || data.guestCount,
        status: 'confirmed',
        menu_type: data.menuType,
        advance_amount: parseFloat(advanceAmount || '0'),
        payment_status: paymentStatus.toLowerCase().replace(' ', '_'),
        total_amount: totalEstimated,
        draft_id: draftId,
        user_id: user.uid,
        created_at: nowIso,
        updated_at: nowIso,
      });
      const eventId = eventRef.id;

      // Save each event date AND its own menu items
      if (data.eventDates.length > 0) {
        await Promise.all(
          data.eventDates.map(async (ed) => {
            const dm = data.dateMenus.find(d => d.dateId === ed.id);
            const items = dm?.selectedItems || data.selectedItems; // fallback for single-date old flow
            const guestsForDate = dm?.guestCount ?? data.guestCount;

            const dateRef = await addDoc(collection(db, 'event_dates'), {
              event_id: eventId,
              event_date: ed.date,
              meal_types: ed.mealTypes,
              guest_count: guestsForDate,
              user_id: user.uid,
            });

            if (items.length > 0) {
              await Promise.all(
                items.map(item =>
                  addDoc(collection(db, 'event_menu_items'), {
                    event_id: eventId,
                    event_date_id: dateRef.id,   // ← link menu item to its specific date
                    menu_item_id: item.id,
                    meal_type: item.mealCategory.toLowerCase(),
                    meal_category: (item as any).meal_category || 'main',
                    price_override: item.price,
                    menu_items: { name: item.name, image_url: item.image_url || null },
                    user_id: user.uid,
                  })
                )
              );
            }
          })
        );
      }

      setLoading(false);
      reset();

      if (createAnother) {
        router.replace('/new-event/customer-details');
      } else {
        router.replace({ pathname: '/new-event/event-created', params: { eventId } });
      }
    } catch (err: any) {
      setLoading(false);
      Alert.alert('Error', err.message || 'Failed to save event. Please try again.');
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Confirm & Save</Text>
        <TouchableOpacity onPress={() => router.push('/(tabs)/dashboard')}>
          <X size={22} color="#374151" />
        </TouchableOpacity>
      </View>

      <StepIndicator current={4} total={4} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.successIcon}>
          <View style={styles.successCircle}>
            <Text style={styles.successCheck}>✓</Text>
          </View>
        </View>
        <Text style={styles.almostDone}>Almost Done!</Text>
        <Text style={styles.almostSub}>Please confirm the details and save your event.</Text>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <CreditCard size={16} color="#1B4332" />
            <Text style={styles.cardTitle}>Payment & Advance</Text>
          </View>

          <Text style={styles.label}>Advance Amount</Text>
          <View style={styles.inputRow}>
            <Text style={styles.currencyPrefix}>₹</Text>
            <TextInput
              style={styles.amountInput}
              placeholder="Optional"
              placeholderTextColor="#9CA3AF"
              value={advanceAmount}
              onChangeText={t => setAdvanceAmount(t.replace(/[^0-9.]/g, ''))}
              keyboardType="decimal-pad"
            />
          </View>

          <Text style={styles.label}>Payment Status</Text>
          <TouchableOpacity style={styles.statusSelect} onPress={() => setShowStatusPicker(!showStatusPicker)}>
            <Text style={styles.statusSelectText}>{paymentStatus}</Text>
          </TouchableOpacity>
          {showStatusPicker && (
            <View style={styles.statusOptions}>
              {PAYMENT_STATUSES.map(s => (
                <TouchableOpacity
                  key={s}
                  style={styles.statusOption}
                  onPress={() => { setPaymentStatus(s); setShowStatusPicker(false); }}
                >
                  <Text style={styles.statusOptionText}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Add Attachments (Optional)</Text>
          <Text style={styles.attachSub}>Menu photos, Venue details, Decoration, etc.</Text>
          <View style={styles.attachRow}>
            <TouchableOpacity style={styles.attachBtn}>
              <ImageIcon size={18} color="#374151" />
              <Text style={styles.attachBtnText}>Add Photos</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.attachBtn}>
              <FileText size={18} color="#374151" />
              <Text style={styles.attachBtnText}>Add Documents</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>Total Estimated Cost</Text>
          <Text style={styles.totalValue}>₹ {totalEstimated.toLocaleString()}</Text>
          <Text style={styles.totalSub}>{data.eventDates.length} date(s) • {totalGuests} total guests</Text>
        </View>

        {loading ? (
          <ActivityIndicator color="#1B4332" style={{ marginVertical: 16 }} />
        ) : (
          <>
            <TouchableOpacity style={styles.saveBtn} onPress={() => saveEvent(false)}>
              <Text style={styles.saveBtnText}>Save Event</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveAnotherBtn} onPress={() => saveEvent(true)}>
              <Text style={styles.saveAnotherBtnText}>Save & Create Another Event</Text>
            </TouchableOpacity>
          </>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  scroll: { padding: 20, paddingBottom: 40 },
  successIcon: { alignItems: 'center', marginBottom: 12 },
  successCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#D1FAE5', justifyContent: 'center', alignItems: 'center' },
  successCheck: { fontSize: 28, color: '#1B4332', fontWeight: '700' },
  almostDone: { fontSize: 20, fontWeight: '800', color: '#111827', textAlign: 'center', marginBottom: 4 },
  almostSub: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 24 },
  card: { backgroundColor: '#F9FAFB', borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#E5E7EB' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 10 },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, backgroundColor: '#fff', paddingHorizontal: 14, height: 48 },
  currencyPrefix: { fontSize: 15, color: '#6B7280', marginRight: 6 },
  amountInput: { flex: 1, fontSize: 15, color: '#111827' },
  statusSelect: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, backgroundColor: '#fff', paddingHorizontal: 14, height: 48, justifyContent: 'center' },
  statusSelectText: { fontSize: 14, color: '#111827' },
  statusOptions: { marginTop: 6, backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  statusOption: { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  statusOptionText: { fontSize: 14, color: '#374151' },
  attachSub: { fontSize: 12, color: '#9CA3AF', marginBottom: 12 },
  attachRow: { flexDirection: 'row', gap: 10 },
  attachBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingVertical: 12, backgroundColor: '#fff' },
  attachBtnText: { fontSize: 13, color: '#374151', fontWeight: '500' },
  totalCard: { backgroundColor: '#1B4332', borderRadius: 14, padding: 18, marginBottom: 20 },
  totalLabel: { fontSize: 13, color: '#A7F3D0', marginBottom: 4 },
  totalValue: { fontSize: 26, fontWeight: '800', color: '#fff' },
  totalSub: { fontSize: 12, color: '#A7F3D0', marginTop: 4 },
  saveBtn: { backgroundColor: '#1B4332', borderRadius: 12, height: 52, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  saveAnotherBtn: { backgroundColor: '#fff', borderRadius: 12, height: 52, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#1B4332' },
  saveAnotherBtnText: { fontSize: 15, fontWeight: '700', color: '#1B4332' },
});