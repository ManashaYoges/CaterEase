import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Bell, User, Calendar, Utensils, Edit2 } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNewEvent } from '@/context/NewEventContext';
import StepIndicator from '@/components/StepIndicator';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '@/context/LanguageContext';
import { F, scaleFont } from '@/utils/fonts';
import Colors from '@/constants/Colors';

export default function ReviewOrderScreen() {
  const router = useRouter();
  const { data, update } = useNewEvent();
  const insets = useSafeAreaInsets();
  const { t, language } = useLanguage();

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString(language === 'ta' ? 'ta-IN' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const draftId = `#CE-${new Date().getFullYear()}-${new Date().toISOString().slice(5,7)}${new Date().toISOString().slice(8,10)}`;

  // Build per-date review data
  const dateReviews = data.eventDates.map(ed => {
    const dateMenu = data.dateMenus.find(dm => dm.dateId === ed.id);
    const items = dateMenu?.selectedItems || [];
    const guests = dateMenu?.guestCount ?? data.guestCount;
    const mealTimings = dateMenu?.mealTimings || ed.mealTimings || {};

    // Group items by meal category
    const groups: Record<string, typeof items> = {};
    for (const item of items) {
      const cat = item.mealCategory.toUpperCase();
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    }

    const menuPerPlate = items.reduce((sum, i) => sum + (i.price || 0), 0);
    const dateTotal = menuPerPlate * guests;

    return { ed, items, guests, groups, menuPerPlate, dateTotal, mealTimings };
  });

  const grandTotal = dateReviews.reduce((sum, dr) => sum + dr.dateTotal, 0);
  const totalGuests = dateReviews.reduce((sum, dr) => sum + dr.guests, 0);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient colors={['#1B5E20', '#1B5E20']} style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: Colors.white }]}>{t('Review Order')}</Text>
        <TouchableOpacity><Bell size={22} color="#FFFFFF" /></TouchableOpacity>
      </LinearGradient>

      <StepIndicator current={4} total={4} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Customer Details */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIconWrap}><User size={16} color="#1B4332" /></View>
            <Text style={styles.cardTitle}>{t('Customer Details')}</Text>
            <TouchableOpacity style={styles.editBtn} onPress={() => router.push('/new-event/customer-details')}>
              <Edit2 size={14} color="#1B4332" /><Text style={styles.editText}>{t('Edit')}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.detailRow}><Text style={styles.detailLabel}>{t('Name')}</Text><Text style={styles.detailValue}>{data.customerName || '-'}</Text></View>
          <View style={styles.detailRow}><Text style={styles.detailLabel}>{t('Phone')}</Text><Text style={styles.detailValue}>{data.customerPhone || '-'}</Text></View>
          {data.customerEmail ? <View style={styles.detailRow}><Text style={styles.detailLabel}>{t('Email')}</Text><Text style={styles.detailValue}>{data.customerEmail}</Text></View> : null}
          {data.customerAddress ? <View style={styles.detailRow}><Text style={styles.detailLabel}>{t('Address')}</Text><Text style={styles.detailValue}>{data.customerAddress}</Text></View> : null}
        </View>

        {/* Event Details */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIconWrap}><Calendar size={16} color="#1B4332" /></View>
            <Text style={styles.cardTitle}>{t('Event Details')}</Text>
            <TouchableOpacity style={styles.editBtn} onPress={() => router.push('/new-event')}>
              <Edit2 size={14} color="#1B4332" /><Text style={styles.editText}>{t('Edit')}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.detailRow}><Text style={styles.detailLabel}>{t('Name')}</Text>
            <View style={styles.detailValueRow}>
              <Text style={styles.detailValue}>{data.eventName}</Text>
              <View style={styles.confirmedBadge}><Text style={styles.confirmedText}>{t('Confirmed')}</Text></View>
            </View>
          </View>
          <View style={styles.detailRow}><Text style={styles.detailLabel}>{t('Venue')}</Text><Text style={styles.detailValue}>{data.venue}</Text></View>
          <View style={styles.detailRow}><Text style={styles.detailLabel}>{t('Dates')}</Text><Text style={styles.detailValue}>{data.eventDates.length} {t('date(s)')}</Text></View>
          <View style={styles.detailRow}><Text style={styles.detailLabel}>{t('Total Guests')}</Text><Text style={styles.detailValue}>{totalGuests} {t('Persons')}</Text></View>
        </View>

        {/* Per-date menu cards */}
        {dateReviews.map((dr, idx) => (
          <View key={dr.ed.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardIconWrap}><Utensils size={16} color="#1B4332" /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{formatDate(dr.ed.date)}</Text>
                <View style={styles.mealListContainer}>
                  {(dr.ed.mealTypes || []).map((meal, mIdx) => (
                    <Text key={mIdx} style={styles.cardSubtitle}>
                      {t(meal)}
                    </Text>
                  ))}
                </View>
                <Text style={styles.cardGuestCount}>
                  {dr.guests} {t('Guests')}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.editBtn}
                onPress={() => {
                  update({ currentDateIndex: idx });
                  router.push('/new-event/build-menu');
                }}
              >
                <Edit2 size={14} color="#1B4332" /><Text style={styles.editText}>{t('Edit')}</Text>
              </TouchableOpacity>
            </View>

            {dr.items.length === 0 ? (
              <Text style={styles.noMenuText}>{t('No menu selected for this date')}</Text>
            ) : (
              <>
                {Object.entries(dr.groups).map(([cat, items]) => {
                  const subtotal = items.reduce((s, i) => s + (i.price || 0), 0);
                  const mealTime = dr.mealTimings[cat.toLowerCase()];
                  const mealTimeText = mealTime?.from && mealTime?.to ? ` - ${mealTime.from} ${t('to')} ${mealTime.to}` : '';
                  return (
                    <View key={cat}>
                      <Text style={styles.menuCatTitle}>
                        {t(cat)} ({items.length} {t('ITEMS')}){mealTimeText}
                      </Text>
                      {items.map(item => {
                        const isEdited = (item as any).isPriceEdited || ((item as any).originalPrice !== undefined && item.price !== (item as any).originalPrice);
                        return (
                          <View key={item.id} style={styles.menuItemRow}>
                            <Text style={styles.menuItemName}>{item.name}</Text>
                            <Text style={styles.menuItemPrice}>
                              ₹ {item.price || 0}
                              {isEdited && <Text style={styles.editedText}> ({t('edited')})</Text>}
                            </Text>
                          </View>
                        );
                      })}
                      <View style={styles.subtotalRow}>
                        <Text style={styles.subtotalLabel}>{t(cat.charAt(0) + cat.slice(1).toLowerCase())} {t('Subtotal')}</Text>
                        <Text style={styles.subtotalValue}>₹ {subtotal}</Text>
                      </View>
                      <View style={styles.divider} />
                    </View>
                  );
                })}

                {/* Per-date cost summary */}
                <View style={styles.dateCostRow}>
                  <Text style={styles.dateCostLabel}>₹ {dr.menuPerPlate} / {t('plate')} × {dr.guests} {t('guests')}</Text>
                  <Text style={styles.dateCostValue}>₹ {dr.dateTotal.toLocaleString()}</Text>
                </View>
              </>
            )}
          </View>
        ))}

        {/* Grand Total */}
        <View style={styles.estimatedCard}>
          <View style={styles.estimatedContent}>
            <Text style={styles.estimatedLabel}>{t('Total Estimated Cost')}</Text>
            <Text style={styles.estimatedValue}>₹ {grandTotal.toLocaleString()}</Text>
            <Text style={styles.estimatedSub}>
              {data.eventDates.length} {t('date(s)')} • {totalGuests} {t('total guests')}
            </Text>
          </View>
          <View style={styles.draftBadge}>
            <Text style={styles.draftLabel}>{t('DRAFT ID')}</Text>
            <Text style={styles.draftId}>{draftId}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.nextBtn} onPress={() => router.push('/new-event/confirm-save')}>
          <Text style={styles.nextBtnText}>{t('Next: Confirm & Save')}</Text>
          <Text style={styles.nextArrow}>→</Text>
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255, 255, 255, 0.15)' },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, fontSize: 14.5, fontFamily: F.bold, color: Colors.white, marginHorizontal: 8 },
  scroll: { padding: 16, paddingBottom: 40 },
  card: { backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.borderGreenLight, borderRadius: 14, padding: 16, marginBottom: 12, shadowColor: Colors.primary, shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 12 },
  cardIconWrap: { width: 28, height: 28, backgroundColor: Colors.lightGreen, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  cardTitle: { fontSize: 13, fontFamily: F.bold, color: Colors.textPrimary },
  mealListContainer: { marginTop: 6, marginBottom: 6 },
  cardSubtitle: { fontSize: 10.5, fontFamily: F.regular, color: Colors.textSecondary, marginTop: 2 },
  cardGuestCount: { fontSize: 10.5, fontFamily: F.regular, color: Colors.textSecondary },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  editText: { fontSize: 11.5, color: Colors.primary, fontFamily: F.semibold },
  detailRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5, justifyContent: 'space-between' },
  detailLabel: { fontSize: 11.5, fontFamily: F.regular, color: Colors.textSecondary, flexShrink: 0, paddingRight: 10, lineHeight: 16 },
  detailValue: { flex: 1, fontSize: 11.5, fontFamily: F.semibold, color: Colors.textPrimary, textAlign: 'right' },
  detailValueRow: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8 },
  confirmedBadge: { backgroundColor: Colors.lightGreen, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  confirmedText: { fontSize: 9.5, fontFamily: F.bold, color: Colors.primary },
  noMenuText: { fontSize: 11.5, fontFamily: F.regular, color: Colors.textMuted, fontStyle: 'italic', textAlign: 'center', paddingVertical: 8 },
  menuCatTitle: { fontSize: 9.5, fontFamily: F.extrabold, color: Colors.primaryAccent, letterSpacing: 0.8, marginBottom: 6, marginTop: 8 },
  menuItemRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  menuItemName: { fontSize: 11.5, fontFamily: F.regular, color: Colors.textPrimary },
  menuItemPrice: { fontSize: 11.5, color: Colors.textPrimary, fontFamily: F.semibold },
  editedText: { fontSize: 9.5, color: '#D97706', fontFamily: F.bold },
  subtotalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, marginTop: 4 },
  subtotalLabel: { fontSize: 11.5, fontFamily: F.bold, color: Colors.textPrimary },
  subtotalValue: { fontSize: 11.5, fontFamily: F.bold, color: Colors.textPrimary },
  divider: { height: 1, backgroundColor: Colors.borderGreenLight, marginVertical: 4 },
  dateCostRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.lightGreen, borderRadius: 10, padding: 12, marginTop: 8 },
  dateCostLabel: { fontSize: 10.5, fontFamily: F.regular, color: Colors.textSecondary },
  dateCostValue: { fontSize: 13, fontFamily: F.extrabold, color: Colors.primary },
  estimatedCard: { backgroundColor: Colors.primary, borderRadius: 14, padding: 20, marginBottom: 16 },
  estimatedContent: { marginBottom: 12 },
  estimatedLabel: { fontSize: 11.5, fontFamily: F.regular, color: '#A7F3D0', marginBottom: 6 },
  estimatedValue: { fontSize: 21, fontFamily: F.extrabold, color: Colors.white },
  estimatedSub: { fontSize: 9.5, fontFamily: F.regular, color: '#A7F3D0', marginTop: 4 },
  draftBadge: { alignItems: 'flex-start' },
  draftLabel: { fontSize: 8.5, fontFamily: F.bold, color: '#A7F3D0', letterSpacing: 1 },
  draftId: { fontSize: 11.5, color: Colors.white, fontFamily: F.bold, marginTop: 2, flexWrap: 'wrap' },
  nextBtn: { backgroundColor: Colors.primary, borderRadius: 12, height: 52, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  nextBtnText: { fontSize: 14, fontFamily: F.bold, color: Colors.white },
  nextArrow: { fontSize: 15.5, color: Colors.white },
});
