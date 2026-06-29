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

  const groups: Record<string, typeof data.selectedItems> = {};
  for (const item of data.selectedItems) {
    const cat = item.mealCategory.toUpperCase();
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(item);
  }
  const menuTotal = data.selectedItems.reduce((s, i) => s + i.price, 0);
  const totalEstimated = menuTotal * data.guestCount;
  const primaryDate = data.eventDates[0]?.date || new Date().toISOString().split('T')[0];

  const saveEvent = async (createAnother = false) => {
    if (!user) {
      Alert.alert('Error', 'Please login again before saving an event.');
      return;
    }
    setLoading(true);
    try {
      let customerId = data.customerId;

      // Create customer if name/phone provided but no ID
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
        guest_count: data.guestCount,
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

      // Save event dates
      if (data.eventDates.length > 0) {
        await Promise.all(
          data.eventDates.map(ed =>
            addDoc(collection(db, 'event_dates'), {
              event_id: eventId,
              event_date: ed.date,
              meal_types: ed.mealTypes,
              user_id: user.uid,
            })
          )
        );
      }

      // Save menu items. We denormalize the menu item's own fields onto
      // `menu_items` here because Firestore can't join collections the way
      // Supabase's `select('*, menu_items(*)')` did — this keeps
      // event-detail.tsx's `item.menu_items?.name` lookup working with a
      // single read instead of N extra queries.
      if (data.selectedItems.length > 0) {
        await Promise.all(
          data.selectedItems.map(item =>
            addDoc(collection(db, 'event_menu_items'), {
              event_id: eventId,
              menu_item_id: item.id,
              meal_type: item.mealCategory.toLowerCase(),
              price_override: item.price,
              menu_items: { name: item.name, image_url: item.image_url || null },
              user_id: user.uid,
            })
          )
        );
      }

      setLoading(false);
      reset();

      if (createAnother) {
        router.replace('/new-event');
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
        <TouchableOpacity onPress={() => router.replace('/(tabs)/dashboard')}>
          <X size={22} color="#374151" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.almostDoneCard}>
          <View style={styles.checkCircle}>
            <Text style={styles.checkIcon}>✓</Text>
          </View>
          <Text style={styles.almostTitle}>Almost Done!</Text>
          <Text style={styles.almostSubtitle}>Please confirm the details and save your event.</Text>
        </View>

        <StepIndicator current={3} />

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <CreditCard size={18} color="#1B4332" />
            <Text style={styles.cardTitle}>Payment & Advance</Text>
          </View>
          <Text style={styles.fieldLabel}>Advance Amount</Text>
          <TextInput
            style={styles.input}
            placeholder="Optional"
            placeholderTextColor="#9CA3AF"
            value={advanceAmount}
            onChangeText={(t) => setAdvanceAmount(t.replace(/\D/g, ''))}
            keyboardType="numeric"
          />
          <Text style={styles.fieldLabel}>Payment Status</Text>
          <TouchableOpacity style={styles.dropdown} onPress={() => setShowStatusPicker(!showStatusPicker)}>
            <Text style={styles.dropdownText}>{paymentStatus}</Text>
            <Text style={styles.dropdownArrow}>▾</Text>
          </TouchableOpacity>
          {showStatusPicker && (
            <View style={styles.dropdownList}>
              {PAYMENT_STATUSES.map(s => (
                <TouchableOpacity key={s} style={styles.dropdownItem} onPress={() => { setPaymentStatus(s); setShowStatusPicker(false); }}>
                  <Text style={[styles.dropdownItemText, paymentStatus === s && styles.dropdownItemActive]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Add Attachments (Optional)</Text>
          <View style={styles.attachRow}>
            <TouchableOpacity style={styles.attachBtn}>
              <ImageIcon size={22} color="#1B4332" />
              <Text style={styles.attachText}>Add Photos</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.attachBtn}>
              <FileText size={22} color="#1B4332" />
              <Text style={styles.attachText}>Add Documents</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.attachHint}>Menu photos, Venue details, Decoration, etc.</Text>
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={() => saveEvent(false)} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>💾  Save Event</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={styles.saveAnotherBtn} onPress={() => saveEvent(true)} disabled={loading}>
          <Text style={styles.saveAnotherText}>Save & Create Another Event</Text>
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
  almostDoneCard: { backgroundColor: '#fff', borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  checkCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#D1FAE5', justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#1B4332', marginBottom: 12 },
  checkIcon: { fontSize: 28, color: '#1B4332', fontWeight: '700' },
  almostTitle: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 6 },
  almostSubtitle: { fontSize: 14, color: '#6B7280', textAlign: 'center' },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 4 },
  input: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 14, height: 46, fontSize: 14, color: '#111827', backgroundColor: '#F9FAFB', marginBottom: 12 },
  dropdown: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 14, height: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F9FAFB' },
  dropdownText: { fontSize: 14, color: '#111827' },
  dropdownArrow: { fontSize: 16, color: '#6B7280' },
  dropdownList: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, marginTop: 4, backgroundColor: '#fff', overflow: 'hidden' },
  dropdownItem: { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  dropdownItemText: { fontSize: 14, color: '#374151' },
  dropdownItemActive: { color: '#1B4332', fontWeight: '700' },
  attachRow: { flexDirection: 'row', gap: 12, marginTop: 12, marginBottom: 8 },
  attachBtn: { flex: 1, height: 70, borderWidth: 1.5, borderColor: '#E5E7EB', borderStyle: 'dashed', borderRadius: 12, justifyContent: 'center', alignItems: 'center', gap: 6 },
  attachText: { fontSize: 12, color: '#6B7280', fontWeight: '500' },
  attachHint: { fontSize: 11, color: '#9CA3AF', textAlign: 'center' },
  saveBtn: { backgroundColor: '#1B4332', borderRadius: 12, height: 52, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  saveAnotherBtn: { borderWidth: 1.5, borderColor: '#1B4332', borderRadius: 12, height: 52, justifyContent: 'center', alignItems: 'center' },
  saveAnotherText: { fontSize: 16, fontWeight: '700', color: '#1B4332' },
});
