import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  TextInput, ActivityIndicator, Alert, Image, Platform, KeyboardAvoidingView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, X, CreditCard, FileText, Camera, File } from 'lucide-react-native';
import { useNewEvent } from '@/context/NewEventContext';
import StepIndicator from '@/components/StepIndicator';
import { addDoc, collection, doc, updateDoc, deleteDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import KeyboardAwareScrollView from '@/components/KeyboardAwareScrollView';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useLanguage } from '@/context/LanguageContext';
import { F, scaleFont } from '@/utils/fonts';
import { T } from '@/utils/typography';
import { saveCustomEventType } from '@/utils/eventTypeStorage';

export default function ConfirmSaveScreen() {
  const router = useRouter();
  const { data, reset, update } = useNewEvent();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { t } = useLanguage();

  const advanceAmountRef = useRef<TextInput>(null);

  const formatInitialPaymentStatus = (status: string) => {
    if (!status) return t('Not Received');
    const s = status.toLowerCase().replace(/_/g, ' ');
    if (s === 'received') return t('Received');
    if (s === 'partial') return t('Partial');
    return t('Not Received');
  };

  const [advanceAmount, setAdvanceAmount] = useState(data.advanceAmount || '');
  const [paymentStatus, setPaymentStatus] = useState(formatInitialPaymentStatus(data.paymentStatus));
  const [loading, setLoading] = useState(false);
  const [showStatusPicker, setShowStatusPicker] = useState(false);

  // Attachments state — local URIs
  const [photos, setPhotos] = useState<string[]>(data.attachmentPhotos || []);
  const [docs, setDocs] = useState<{ name: string; uri: string }[]>(data.attachmentDocs || []);

  useEffect(() => {
    if (data.advanceAmount !== undefined) setAdvanceAmount(data.advanceAmount);
    if (data.paymentStatus) setPaymentStatus(formatInitialPaymentStatus(data.paymentStatus));
    if (data.attachmentPhotos) setPhotos(data.attachmentPhotos);
    if (data.attachmentDocs) setDocs(data.attachmentDocs);
  }, [data.advanceAmount, data.paymentStatus, data.attachmentPhotos, data.attachmentDocs]);

  const PAYMENT_STATUSES = [t('Not Received'), t('Partial'), t('Received')];

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

  // Pick photos
  const pickPhotos = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('Permission needed'), t('Please allow access to your photo library.'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.7,
      selectionLimit: 10,
    });
    if (!result.canceled) {
      const newUris = result.assets.map(a => a.uri);
      setPhotos(prev => [...prev, ...newUris]);
    }
  };

  // Pick documents
  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*', 'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        multiple: true,
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets) {
        const newDocs = result.assets.map(a => ({ name: a.name, uri: a.uri }));
        setDocs(prev => [...prev, ...newDocs]);
      }
    } catch (err) {
      Alert.alert(t('Error'), 'Failed to pick document');
    }
  };

  const removePhoto = (idx: number) => setPhotos(prev => prev.filter((_, i) => i !== idx));
  const removeDoc = (idx: number) => setDocs(prev => prev.filter((_, i) => i !== idx));

  const saveEvent = async (createAnother = false) => {
    if (!user) {
      Alert.alert(t('Error'), 'Please login again before saving an event.');
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
      } else if (customerId && data.customerName && data.customerPhone) {
        try {
          await updateDoc(doc(db, 'customers', customerId), {
            full_name: data.customerName,
            phone: data.customerPhone,
            email: data.customerEmail || null,
            address: data.customerAddress || null,
          });
        } catch (e) {
        }
      }

      const nowIso = new Date().toISOString();
      const formattedPaymentStatus = paymentStatus.toLowerCase().replace(/ /g, '_');
      const advanceNum = parseFloat(advanceAmount || '0');

      if (data.eventType) {
        await saveCustomEventType(data.eventType);
      }

      let eventId = data.eventId;

      if (eventId) {
        // UPDATE EXISTING EVENT
        await updateDoc(doc(db, 'events', eventId), {
          customer_id: customerId || null,
          event_name: data.eventName,
          event_type: data.eventType,
          event_date: primaryDate,
          venue: data.venue,
          guest_count: totalGuests || data.guestCount,
          menu_type: data.menuType,
          notes: data.notes?.trim() || null,
          advance_amount: advanceNum,
          payment_status: formattedPaymentStatus,
          total_amount: totalEstimated,
          attachment_photos: photos,
          attachment_docs: docs,
          updated_at: nowIso,
        });

        const oldDatesSnap = await getDocs(
          query(collection(db, 'event_dates'), where('event_id', '==', eventId))
        );
        await Promise.all(oldDatesSnap.docs.map(d => deleteDoc(doc(db, 'event_dates', d.id))));

        const oldMenuItemsSnap = await getDocs(
          query(collection(db, 'event_menu_items'), where('event_id', '==', eventId))
        );
        await Promise.all(oldMenuItemsSnap.docs.map(d => deleteDoc(doc(db, 'event_menu_items', d.id))));

      } else {
        // CREATE NEW EVENT
        const draftId = `CE-${new Date().getFullYear()}-${new Date().toISOString().slice(5, 7)}${new Date().toISOString().slice(8, 10)}`;
        const eventRef = await addDoc(collection(db, 'events'), {
          customer_id: customerId || null,
          event_name: data.eventName,
          event_type: data.eventType,
          event_date: primaryDate,
          venue: data.venue,
          guest_count: totalGuests || data.guestCount,
          status: 'confirmed',
          menu_type: data.menuType,
          notes: data.notes?.trim() || null,
          advance_amount: advanceNum,
          payment_status: formattedPaymentStatus,
          total_amount: totalEstimated,
          draft_id: draftId,
          attachment_photos: photos,
          attachment_docs: docs,
          user_id: user.uid,
          created_at: nowIso,
          updated_at: nowIso,
        });
        eventId = eventRef.id;
      }

      if (data.eventDates.length > 0) {
        await Promise.all(
          data.eventDates.map(async (ed) => {
            const dm = data.dateMenus.find(d => d.dateId === ed.id);
            const items = dm?.selectedItems || data.selectedItems;
            const guestsForDate = dm?.guestCount ?? data.guestCount;
            const mealTimings = dm?.mealTimings || ed.mealTimings || {};

            const dateRef = await addDoc(collection(db, 'event_dates'), {
              event_id: eventId,
              event_date: ed.date,
              meal_types: ed.mealTypes,
              meal_timings: mealTimings,
              guest_count: guestsForDate,
              user_id: user.uid,
            });

            if (items.length > 0) {
              await Promise.all(
                items.map(item =>
                  addDoc(collection(db, 'event_menu_items'), {
                    event_id: eventId,
                    event_date_id: dateRef.id,
                    menu_item_id: item.id,
                    meal_type: item.mealCategory.toLowerCase(),
                    meal_time: mealTimings[item.mealCategory.toLowerCase()] || null,
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
        router.replace('/new-event/customer-details' as any);
      } else {
        router.replace({ pathname: '/new-event/event-created', params: { eventId } });
      }
    } catch (err: any) {
      setLoading(false);
      Alert.alert(t('Error'), err.message || 'Failed to save event. Please try again.');
    }
  };

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={18} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('Confirm & Save')}</Text>
        <TouchableOpacity onPress={() => router.push('/(tabs)/dashboard' as any)}>
          <X size={20} color="#374151" />
        </TouchableOpacity>
      </View>

      <StepIndicator current={4} total={4} />

      <KeyboardAwareScrollView disableKeyboardAvoidingView contentContainerStyle={styles.scroll}>
        <View style={styles.successIcon}>
          <View style={styles.successCircle}>
            <Text style={styles.successCheck}>✓</Text>
          </View>
        </View>
        <Text style={styles.almostDone}>{t('Almost Done!')}</Text>
        <Text style={styles.almostSub}>{t('Please confirm the details and save your event.')}</Text>

        {/* Payment */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <CreditCard size={14} color="#1B4332" />
            <Text style={styles.cardTitle}>{t('Payment & Advance')}</Text>
          </View>
          <Text style={styles.label}>{t('Advance Amount')}</Text>
          <View style={styles.inputRow}>
            <Text style={styles.currencyPrefix}>₹</Text>
            <TextInput
              ref={advanceAmountRef}
              style={styles.amountInput}
              placeholder={t('Optional')}
              placeholderTextColor="#9CA3AF"
              value={advanceAmount}
              onChangeText={t => setAdvanceAmount(t.replace(/[^0-9.]/g, ''))}
              keyboardType="decimal-pad"
              returnKeyType="done"
              onSubmitEditing={() => advanceAmountRef.current?.blur()}
            />
          </View>
          <Text style={styles.label}>{t('Payment Status')}</Text>
          <TouchableOpacity
            style={styles.statusSelect}
            onPress={() => setShowStatusPicker(!showStatusPicker)}
          >
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

        {/* Attachments */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <FileText size={14} color="#1B4332" />
            <Text style={styles.cardTitle}>{t('Add Attachments (Optional)')}</Text>
          </View>
          <Text style={styles.attachSub}>{t('Menu photos, Venue details, Decoration, etc.')}</Text>

          {/* Photo picker button */}
          <TouchableOpacity style={styles.attachBtn} onPress={pickPhotos}>
            <Camera size={16} color="#1B4332" />
            <Text style={styles.attachBtnText}>{t('Add Photos')}</Text>
          </TouchableOpacity>

          {/* Photo previews */}
          {photos.length > 0 && (
            <View style={styles.photoGrid}>
              {photos.map((uri, idx) => (
                <View key={idx} style={styles.photoThumbWrap}>
                  <Image source={{ uri }} style={styles.photoThumb} />
                  <TouchableOpacity
                    style={styles.removeThumb}
                    onPress={() => removePhoto(idx)}
                  >
                    <X size={10} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {/* Doc picker button */}
          <TouchableOpacity style={[styles.attachBtn, { marginTop: 8 }]} onPress={pickDocument}>
            <File size={16} color="#1B4332" />
            <Text style={styles.attachBtnText}>{t('Add Documents')}</Text>
          </TouchableOpacity>

          {/* Doc list */}
          {docs.length > 0 && (
            <View style={styles.docList}>
              {docs.map((d, idx) => (
                <View key={idx} style={styles.docItem}>
                  <FileText size={14} color="#1B4332" />
                  <Text style={styles.docName} numberOfLines={1}>{d.name}</Text>
                  <TouchableOpacity onPress={() => removeDoc(idx)}>
                    <X size={14} color="#9CA3AF" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Total */}
        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>{t('Total Estimated Cost')}</Text>
          <Text style={styles.totalValue}>₹ {totalEstimated.toLocaleString()}</Text>
          <Text style={styles.totalSub}>
            {data.eventDates.length} {t('date(s)')} • {totalGuests} {t('total guests')}
          </Text>
        </View>

        {loading ? (
          <ActivityIndicator color="#1B4332" style={{ marginVertical: 16 }} />
        ) : (
          <>
            <TouchableOpacity style={styles.saveBtn} onPress={() => saveEvent(false)}>
              <Text style={styles.saveBtnText}>{t('Save Event')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveAnotherBtn} onPress={() => saveEvent(true)}>
              <Text style={styles.saveAnotherBtnText}>{t('Save & Create Another Event')}</Text>
            </TouchableOpacity>
          </>
        )}
      </KeyboardAwareScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  backBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { ...T.h2 },
  scroll: { padding: 16, paddingBottom: 20 },
  successIcon: { alignItems: 'center', marginBottom: 10 },
  successCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#D1FAE5', justifyContent: 'center', alignItems: 'center' },
  successCheck: { fontSize: scaleFont(18), color: '#1B4332', fontFamily: F.bold },
  almostDone: { fontSize: scaleFont(14.5), fontFamily: F.bold, color: '#111827', textAlign: 'center', marginBottom: 2 },
  almostSub: { ...T.bodySm, color: '#6B7280', textAlign: 'center', marginBottom: 16 },
  card: { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  cardTitle: { ...T.cardTitle },
  label: { ...T.label, marginBottom: 4, marginTop: 8 },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, backgroundColor: '#fff', paddingHorizontal: 12, height: 42 },
  currencyPrefix: { fontSize: scaleFont(12.5), color: '#6B7280', marginRight: 4, fontFamily: F.medium },
  amountInput: { flex: 1, fontSize: scaleFont(11.5), color: '#111827', fontFamily: F.regular },
  statusSelect: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, backgroundColor: '#fff', paddingHorizontal: 12, height: 42, justifyContent: 'center' },
  statusSelectText: { fontSize: scaleFont(11.5), color: '#111827', fontFamily: F.regular },
  statusOptions: { marginTop: 4, backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  statusOption: { paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  statusOptionText: { fontSize: scaleFont(11.5), color: '#374151', fontFamily: F.regular },
  attachSub: { ...T.caption, color: '#9CA3AF', marginBottom: 10 },
  attachBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#1B4332', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 14, backgroundColor: '#F0FDF4' },
  attachBtnText: { fontSize: scaleFont(11.5), color: '#1B4332', fontFamily: F.semibold },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  photoThumbWrap: { position: 'relative', width: 60, height: 60, borderRadius: 8, overflow: 'hidden' },
  photoThumb: { width: 60, height: 60, borderRadius: 8 },
  removeThumb: { position: 'absolute', top: 2, right: 2, width: 16, height: 16, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  docList: { marginTop: 8, gap: 4 },
  docItem: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fff', borderRadius: 6, padding: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  docName: { flex: 1, fontSize: scaleFont(10.5), color: '#374151', fontFamily: F.regular },
  totalCard: { backgroundColor: '#1B4332', borderRadius: 12, padding: 14, marginBottom: 16 },
  totalLabel: { ...T.caption, color: '#A7F3D0', marginBottom: 2 },
  totalValue: { fontSize: scaleFont(18), fontFamily: F.bold, color: '#fff' },
  totalSub: { fontSize: scaleFont(9.5), color: '#A7F3D0', marginTop: 2, fontFamily: F.regular },
  saveBtn: { backgroundColor: '#1B4332', borderRadius: 10, height: 46, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  saveBtnText: { ...T.btnLg, fontSize: scaleFont(12.5) },
  saveAnotherBtn: { backgroundColor: '#fff', borderRadius: 10, minHeight: 46, paddingVertical: 8, paddingHorizontal: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#1B4332' },
  saveAnotherBtnText: { fontSize: scaleFont(11.5), fontFamily: F.semibold, color: '#1B4332', textAlign: 'center' },
});