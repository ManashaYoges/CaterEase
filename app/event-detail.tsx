import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator,
  Image, Linking, ScrollView as HScroll, Modal, Share, Alert, Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Edit2, MoreHorizontal, Share2, FileText, CheckSquare, Clock, ChevronDown, ChevronRight } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { collection, doc, getDoc, getDocs, query, where, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Event, EventMenuItem } from '@/types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { Image as ImageIcon } from 'lucide-react-native';
import * as Sharing from 'expo-sharing';
import { getDishImageUrl } from '@/utils/dishImage';
import { F, scaleFont } from '@/utils/fonts';
import { T } from '@/utils/typography';
import { generateAndShareInvoiceFromEventId } from '@/utils/generateEventPDF';

import { useNewEvent, EventDate, DateMenu, SelectedMenuItem } from '@/context/NewEventContext';

const TABS = ['Details', 'Menu', 'Guests', 'Notes','Attachments'];

export default function EventDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { update } = useNewEvent();
  const { t, language } = useLanguage();

  const [event, setEvent] = useState<Event | null>(null);
  const [menuItems, setMenuItems] = useState<EventMenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('Details');
  const [expandedMeals, setExpandedMeals] = useState<Record<string, boolean>>({});

  const [viewingPhoto, setViewingPhoto] = useState<string | null>(null);
  const [generatingInvoice, setGeneratingInvoice] = useState(false);

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

  const handleEditEvent = async () => {
    if (!id || !user || !event) return;
    setEditing(true);
    try {
      let customerData: any = null;
      if (event.customer_id) {
        const custSnap = await getDoc(doc(db, 'customers', event.customer_id));
        if (custSnap.exists()) {
          customerData = custSnap.data();
        }
      }

      const datesSnap = await getDocs(
        query(collection(db, 'event_dates'), where('event_id', '==', id))
      );
      const savedDates = datesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      const menuSnap = await getDocs(
        query(collection(db, 'event_menu_items'), where('event_id', '==', id))
      );
      const savedMenuItems = menuSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      const mappedDates: EventDate[] = savedDates.length > 0
        ? savedDates.map((sd: any) => ({
            id: sd.id,
            date: sd.event_date,
            mealTypes: (sd.meal_types || []).map((m: string) =>
              m.charAt(0).toUpperCase() + m.slice(1).toLowerCase()
            ),
            mealTimings: sd.meal_timings || {},
          }))
        : [{
            id: Math.random().toString(36).slice(2, 10),
            date: event.event_date,
            mealTypes: [],
            mealTimings: {},
          }];

      const mappedDateMenus: DateMenu[] = mappedDates.map((ed, idx) => {
        const itemsForThisDate = savedMenuItems.filter(
          (mi: any) => mi.event_date_id === ed.id || (!mi.event_date_id && idx === 0)
        );
        const selectedItems: SelectedMenuItem[] = itemsForThisDate.map((mi: any) => ({
          id: mi.menu_item_id,
          name: mi.menu_items?.name || 'Item',
          image_url: mi.menu_items?.image_url || null,
          price: mi.price_override ?? mi.menu_items?.price ?? 0,
          mealCategory: mi.meal_type
            ? mi.meal_type.charAt(0).toUpperCase() + mi.meal_type.slice(1)
            : 'Breakfast',
          meal_category: mi.meal_category || 'main',
          meal_type: mi.meal_type || 'breakfast',
          menu_type: event.menu_type || 'veg',
          categoryType: (event.menu_type || 'veg') === 'non_veg' ? 'nonVeg' : 'veg',
          user_id: user.uid,
          description: null,
          is_active: true,
          quantity: mi.quantity || null,
        } as SelectedMenuItem));

        const sdMatch = savedDates.find((sd: any) => sd.id === ed.id);
        return {
          dateId: ed.id,
          selectedItems,
          guestCount: (sdMatch as any)?.guest_count ?? event.guest_count,
          mealTimings: (sdMatch as any)?.meal_timings || ed.mealTimings || {},
        };
      });

      update({
        eventId: event.id,
        customerId: event.customer_id || '',
        customerName: customerData?.full_name || event.customers?.full_name || '',
        customerPhone: customerData?.phone || event.customers?.phone || '',
        customerEmail: customerData?.email || event.customers?.email || '',
        customerAddress: customerData?.address || event.customers?.address || '',
        eventName: event.event_name || '',
        eventType: event.event_type || 'wedding',
        eventDates: mappedDates,
        venue: event.venue || '',
        guestCount: event.guest_count || 100,
        notes: event.notes || '',
        menuType: event.menu_type || 'veg',
        dateMenus: mappedDateMenus,
        currentDateIndex: 0,
        selectedItems: mappedDateMenus[0]?.selectedItems || [],
        advanceAmount: event.advance_amount ? String(event.advance_amount) : '',
        paymentStatus: event.payment_status || 'not_received',
        attachmentPhotos: event.attachment_photos || [],
        attachmentDocs: event.attachment_docs || [],
      });

      setEditing(false);
      router.push('/new-event');
    } catch (err) {
      console.error('Error starting Edit Event:', err);
      setEditing(false);
    }
  };

  const handleShareEvent = async () => {
    if (!event) return;
    try {
      const formattedDate = formatDate(event.event_date);
      const eventTypeStr = event.event_type
        ? t(event.event_type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()))
        : '';
      const shareMessage =
        `🍽 *${event.event_name}*\n` +
        `📅 ${t('Date')}: ${formattedDate}\n` +
        `📍 ${t('Venue')}: ${event.venue || 'N/A'}\n` +
        `👥 ${t('Guests')}: ${event.guest_count}\n` +
        `🎉 ${t('Type')}: ${eventTypeStr}\n` +
        `💰 ${t('Total Estimated Cost')}: ₹${(event.total_amount || 0).toLocaleString('en-IN')}\n\n` +
        `Shared via CaterEase`;

      await Share.share({
        title: event.event_name,
        message: shareMessage,
      });
    } catch (err: any) {
      Alert.alert(t('Error'), err.message || 'Failed to share event details');
    }
  };

  const handleInvoice = () => {
    if (!id) return;
    Alert.alert(
      t('Download/Print Event PDF'),
      t('Select PDF option:'),
      [
        {
          text: t('With Price'),
          onPress: async () => {
            setGeneratingInvoice(true);
            try {
              await generateAndShareInvoiceFromEventId(id, true);
            } catch (err: any) {
              Alert.alert(t('Error'), err.message || 'Failed to generate invoice');
            } finally {
              setGeneratingInvoice(false);
            }
          },
        },
        {
          text: t('Without Price'),
          onPress: async () => {
            setGeneratingInvoice(true);
            try {
              await generateAndShareInvoiceFromEventId(id, false);
            } catch (err: any) {
              Alert.alert(t('Error'), err.message || 'Failed to generate invoice');
            } finally {
              setGeneratingInvoice(false);
            }
          },
        },
        { text: t('Cancel'), style: 'cancel' },
      ]
    );
  };

  const handleOpenDocument = async (d: { name: string; uri?: string; url?: string }) => {
    const docUri = d.uri || d.url;
    if (!docUri) {
      Alert.alert(t('Error'), 'Document link is invalid or missing.');
      return;
    }
    try {
      if (Platform.OS === 'web') {
        Linking.openURL(docUri).catch(() => {
          Alert.alert(t('Error'), 'Could not open document link.');
        });
        return;
      }
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(docUri, { dialogTitle: d.name });
      } else {
        await Linking.openURL(docUri);
      }
    } catch (err: any) {
      Alert.alert(t('Error'), err.message || 'Could not open or download document');
    }
  };

  const handleChecklist = () => {
    if (!event) return;
    const paymentStatusStr = t(event.payment_status || 'Not Received');
    Alert.alert(
      t('Event Checklist'),
      `✓ ${t('Event Name')}: ${event.event_name}\n` +
      `✓ ${t('Status') || 'Status'}: ${t(event.status).toUpperCase()}\n` +
      `✓ ${t('Venue')}: ${event.venue}\n` +
      `✓ ${t('Guests')}: ${event.guest_count}\n` +
      `✓ ${t('Payment Status')}: ${paymentStatusStr}\n` +
      `✓ ${t('Menu')}: ${menuItems.length} items added`,
      [{ text: 'OK' }]
    );
  };

  const handleAddPayment = () => {
    if (!event || !id) return;
    const currentStatus = t(event.payment_status || 'not_received').toUpperCase();
    const advanceAmount = event.advance_amount || 0;

    Alert.alert(
      t('Payment Details'),
      `${t('Current Advance')}: ₹${advanceAmount.toLocaleString('en-IN')}\n${t('Payment Status')}: ${currentStatus}`,
      [
        {
          text: t('Mark as Received'),
          onPress: async () => {
            try {
              await updateDoc(doc(db, 'events', id), { payment_status: 'received' });
              setEvent(prev => prev ? { ...prev, payment_status: 'received' } : null);
              Alert.alert(t('Success'), 'Payment status updated to Received');
            } catch (e: any) {
              Alert.alert(t('Error'), e.message || 'Failed to update payment status');
            }
          },
        },
        {
          text: t('Mark as Partial'),
          onPress: async () => {
            try {
              await updateDoc(doc(db, 'events', id), { payment_status: 'partial' });
              setEvent(prev => prev ? { ...prev, payment_status: 'partial' } : null);
              Alert.alert(t('Success'), 'Payment status updated to Partial');
            } catch (e: any) {
              Alert.alert(t('Error'), e.message || 'Failed to update payment status');
            }
          },
        },
        {
          text: t('Edit Event Payment'),
          onPress: handleEditEvent,
        },
        { text: t('Cancel'), style: 'cancel' },
      ]
    );
  };

  const handleMoreOptions = () => {
    Alert.alert(
      t('Event Actions'),
      t('Select an action for this event:'),
      [
        { text: t('Edit Event'), onPress: handleEditEvent },
        { text: t('Share Event'), onPress: handleShareEvent },
        { text: t('Download Invoice'), onPress: handleInvoice },
        { text: t('Add Payment'), onPress: handleAddPayment },
        { text: t('Cancel'), style: 'cancel' },
      ]
    );
  };

  const formatDate = (d: string) => {
    if (!d) return '';
    const dt = new Date(d + 'T00:00:00');
    return dt.toLocaleDateString(language === 'ta' ? 'ta-IN' : 'en-GB', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });
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
      <LinearGradient colors={['#1B5E20', '#2E7D32']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <ArrowLeft size={18} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: '#FFFFFF' }]} numberOfLines={1}>{event?.event_name}</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={handleEditEvent} disabled={editing}>
              {editing ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Edit2 size={16} color="#FFFFFF" />}
            </TouchableOpacity>
            <TouchableOpacity onPress={handleMoreOptions}>
              <MoreHorizontal size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Event Title */}
        <View style={styles.titleSection}>
          <View style={styles.titleIcon}>
            <Text style={styles.titleIconText}>🍽</Text>
          </View>
          <View style={styles.titleInfo}>
            <Text style={[styles.eventTitle, { color: '#FFFFFF' }]}>{event?.event_name}</Text>
            <View style={styles.statusRow}>
              <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
                <Text style={[styles.statusText, { color: sc.text }]}>
                  {t(event?.status || 'draft')}
                </Text>
              </View>
              <Text style={[styles.eventDate, { color: '#E8F5E9' }]}> · {formatDate(event?.event_date || '')}</Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          {[
            { icon: <Share2 size={18} color="#FFFFFF" />, label: t('Share'), action: handleShareEvent },
            { icon: generatingInvoice ? <ActivityIndicator size="small" color="#FFFFFF" /> : <FileText size={18} color="#FFFFFF" />, label: t('Invoice'), action: handleInvoice },
            { icon: <CheckSquare size={18} color="#FFFFFF" />, label: t('Checklist'), action: handleChecklist },
            { icon: <MoreHorizontal size={18} color="#FFFFFF" />, label: t('More'), action: handleMoreOptions },
          ].map(a => (
            <TouchableOpacity key={a.label} style={styles.actionItem} onPress={a.action}>
              <View style={styles.actionIcon}>{a.icon}</View>
              <Text style={[styles.actionLabel, { color: '#FFFFFF' }]}>{a.label}</Text>
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
              <Text style={[styles.tabText, activeTab === tab ? styles.tabTextActive : null]}>{t(tab)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false}>

        {activeTab === 'Details' && (
          <View style={styles.detailsContent}>
            <View style={styles.detailCard}>
              <View style={styles.detailRow}><Text style={styles.detailLabel}>{t('Event Name')}</Text><Text style={styles.detailValue}>{event?.event_name}</Text></View>
              <View style={styles.detailRow}><Text style={styles.detailLabel}>{t('Date')}</Text><Text style={styles.detailValue}>{formatDate(event?.event_date || '')}</Text></View>
              <View style={styles.detailRow}><Text style={styles.detailLabel}>{t('Venue')}</Text><Text style={styles.detailValue}>{event?.venue}</Text></View>
              <View style={styles.detailRow}><Text style={styles.detailLabel}>{t('Guests')}</Text><Text style={styles.detailValue}>{event?.guest_count} {t('Persons')}</Text></View>
              <View style={styles.detailRow}><Text style={styles.detailLabel}>{t('Type')}</Text><Text style={styles.detailValue}>{t(event?.event_type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || '')}</Text></View>
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
                        <Text style={styles.mealTitle}>{t(meal)} ({items.length})</Text>
                        {mealTimes[meal] ? <Text style={styles.mealTime}>{mealTimes[meal]}</Text> : null}
                      </View>
                      {isExpanded ? <ChevronDown size={16} color="#374151" /> : <ChevronRight size={16} color="#374151" />}
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
          <View style={styles.notesContent}>
            {event?.notes && event.notes.trim() ? (
              <View style={styles.notesCard}>
                <View style={styles.notesHeader}>
                  <FileText size={16} color="#1B4332" />
                  <Text style={styles.notesCardTitle}>{t('Notes')}</Text>
                </View>
                <Text style={styles.notesText}>{event.notes.trim()}</Text>
              </View>
            ) : (
              <View style={styles.emptyTabContent}>
                <Text style={styles.emptyText}>{t('No notes added yet.')}</Text>
              </View>
            )}
          </View>
        )}
        {activeTab === 'Attachments' && (
          <View style={styles.attachContent}>
            {/* Photos section */}
            <View style={styles.attachSection}>
              <View style={styles.attachSectionHeader}>
                <ImageIcon size={14} color="#1B4332" />
                <Text style={styles.attachSectionTitle}>{t('Photos')}</Text>
                <Text style={styles.attachSectionCount}>
                  {(event?.attachment_photos?.length ?? 0)} photo{(event?.attachment_photos?.length ?? 0) !== 1 ? 's' : ''}
                </Text>
              </View>

              {(event?.attachment_photos?.length ?? 0) === 0 ? (
                <View style={styles.emptyAttach}>
                  <Text style={styles.emptyAttachIcon}>🖼️</Text>
                  <Text style={styles.emptyAttachText}>No photos added</Text>
                </View>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoRow}>
                  {event?.attachment_photos?.map((uri, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={styles.photoThumbWrap}
                      activeOpacity={0.85}
                      onPress={() => setViewingPhoto(uri)}
                    >
                      <Image
                        source={{ uri }}
                        style={styles.photoThumb}
                        resizeMode="cover"
                      />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>

            {/* Documents section */}
            <View style={styles.attachSection}>
              <View style={styles.attachSectionHeader}>
                <FileText size={14} color="#1B4332" />
                <Text style={styles.attachSectionTitle}>{t('Documents')}</Text>
                <Text style={styles.attachSectionCount}>
                  {(event?.attachment_docs?.length ?? 0)} file{(event?.attachment_docs?.length ?? 0) !== 1 ? 's' : ''}
                </Text>
              </View>

              {(event?.attachment_docs?.length ?? 0) === 0 ? (
                <View style={styles.emptyAttach}>
                  <Text style={styles.emptyAttachIcon}>📄</Text>
                  <Text style={styles.emptyAttachText}>No documents added</Text>
                </View>
              ) : (
                <View style={styles.docList}>
                  {event?.attachment_docs?.map((d: any, idx: number) => (
                    <TouchableOpacity
                      key={idx}
                      style={styles.docItem}
                      onPress={() => handleOpenDocument(d)}
                    >
                      <View style={styles.docIconWrap}>
                        <FileText size={16} color="#1B4332" />
                      </View>
                      <View style={styles.docInfo}>
                        <Text style={styles.docName} numberOfLines={1}>{d.name}</Text>
                        <Text style={styles.docTap}>{t('Tap to view/download')}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </View>
        )}
        <View style={{ height: 90 + Math.max(insets.bottom, 14) }} />
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 14) }]}>
        <TouchableOpacity style={styles.editEventBtn} onPress={handleEditEvent} disabled={editing} activeOpacity={0.8}>
          {editing ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Edit2 size={16} color="#FFFFFF" />}
          <Text style={styles.editEventText}>{editing ? 'Loading...' : t('Edit Event')}</Text>
        </TouchableOpacity>
      </View>

      {/* Photo Viewer Modal */}
      <Modal
        visible={!!viewingPhoto}
        transparent
        animationType="fade"
        onRequestClose={() => setViewingPhoto(null)}
      >
        <View style={styles.modalBg}>
          <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setViewingPhoto(null)}>
            <Text style={styles.modalCloseText}>✕ Close</Text>
          </TouchableOpacity>
          {viewingPhoto && (
            <Image
              source={{ uri: viewingPhoto }}
              style={styles.modalImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255, 255, 255, 0.15)', gap: 8 },
  backBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, ...T.h2 },
  headerActions: { flexDirection: 'row', gap: 12 },
  titleSection: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 },
  titleIcon: { width: 42, height: 42, backgroundColor: 'rgba(255, 255, 255, 0.2)', borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  titleIconText: { fontSize: scaleFont(15.5) },
  titleInfo: { flex: 1 },
  eventTitle: { ...T.pageTitle, fontSize: scaleFont(14.5), marginBottom: 2 },
  statusRow: { flexDirection: 'row', alignItems: 'center' },
  statusBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  statusText: { fontSize: scaleFont(8.5), fontFamily: F.medium },
  eventDate: { ...T.caption },
  quickActions: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 12 },
  actionItem: { alignItems: 'center', gap: 3 },
  actionIcon: { width: 38, height: 38, backgroundColor: 'rgba(255, 255, 255, 0.2)', borderRadius: 19, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.3)' },
  actionLabel: { ...T.captionMed },
  tabs: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: 'rgba(255, 255, 255, 0.15)' },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: '#FFFFFF' },
  tabText: { ...T.tab, color: 'rgba(255, 255, 255, 0.75)' },
  tabTextActive: { ...T.tabActive, color: '#FFFFFF' },
  detailsContent: { padding: 14 },
  detailCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14 },
  detailRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: '#F9FAFB' },
  detailLabel: { ...T.labelSm, fontSize: scaleFont(10), flexShrink: 0, paddingRight: 8, lineHeight: scaleFont(14) },
  detailValue: { ...T.value, fontSize: scaleFont(11.5), textAlign: 'right', flex: 1 },
  menuContent: { padding: 14 },
  emptyTabContent: { padding: 24, alignItems: 'center' },
  emptyText: { ...T.bodySm, color: '#9CA3AF' },
  notesContent: { padding: 14 },
  notesCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#E5E7EB' },
  notesHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  notesCardTitle: { ...T.cardTitle, fontSize: scaleFont(12.5), color: '#1B4332' },
  notesText: { fontSize: scaleFont(11.5), fontFamily: F.regular, color: '#374151', lineHeight: scaleFont(18) },
  mealGroup: { backgroundColor: '#fff', borderRadius: 12, marginBottom: 8, overflow: 'hidden' },
  mealGroupHeader: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 8 },
  mealIconWrap: { width: 32, height: 32, backgroundColor: '#F0FDF4', borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  mealIcon: { fontSize: scaleFont(12.5) },
  mealHeaderInfo: { flex: 1 },
  mealTitle: { ...T.cardTitle, fontSize: scaleFont(12.5) },
  mealTime: { ...T.caption, marginTop: 1 },
  mealItems: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, padding: 12, paddingTop: 0 },
  mealItemChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F0FDF4', borderRadius: 16, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: '#D1FAE5' },
  mealItemDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#16A34A' },
  mealItemText: { fontSize: scaleFont(10.5), color: '#065F46', fontFamily: F.regular },
  attachContent: { padding: 14 },
  attachSection: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  attachSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  attachSectionTitle: { flex: 1, ...T.cardTitle, fontSize: scaleFont(12.5) },
  attachSectionCount: { ...T.caption },
  emptyAttach: { alignItems: 'center', paddingVertical: 16 },
  emptyAttachIcon: { fontSize: scaleFont(20), marginBottom: 4 },
  emptyAttachText: { ...T.caption, fontStyle: 'italic' },
  photoRow: { flexDirection: 'row', gap: 8, paddingBottom: 4 },
  photoThumbWrap: { borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: '#E5E7EB' },
  photoThumb: { width: 80, height: 80, borderRadius: 10 },
  docList: { gap: 6 },
  docItem: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#F9FAFB', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  docIconWrap: { width: 32, height: 32, backgroundColor: '#F0FDF4', borderRadius: 8, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  docInfo: { flex: 1 },
  docName: { fontSize: scaleFont(11.5), fontFamily: F.regular, color: '#111827' },
  docTap: { ...T.caption, marginTop: 1 },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    zIndex: 10,
  },
  editEventBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1B4332',
    borderRadius: 12,
    height: 48,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  editEventText: {
    fontFamily: F.bold,
    color: '#FFFFFF',
    fontSize: scaleFont(12.5),
  },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
  modalCloseBtn: { position: 'absolute', top: 40, right: 20, zIndex: 10, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20 },
  modalCloseText: { color: '#fff', fontSize: scaleFont(12), fontFamily: F.bold },
  modalImage: { width: '90%', height: '75%' },
});
