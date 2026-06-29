import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, Image, Alert, TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Trash2, ChevronDown, ChevronRight, Minus, Plus } from 'lucide-react-native';
import { useNewEvent, SelectedMenuItem, DateMenu } from '@/context/NewEventContext';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { MenuItem } from '@/types';
import StepIndicator from '@/components/StepIndicator';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';

const MAIN_MEALS = ['Breakfast', 'Lunch', 'Dinner', 'Snacks'];
const SUB_CATS = [
  { key: 'dessert',  label: 'Desserts' },
  { key: 'beverage', label: 'Hot/Soft Beverages' },
];

type MealTab = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snacks';

const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

export default function BuildMenuScreen() {
  const router = useRouter();
  const { data, update } = useNewEvent();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const currentIndex = data.currentDateIndex ?? 0;
  const currentEventDate = data.eventDates[currentIndex];
  const totalDates = data.eventDates.length;

  const [activeTab, setActiveTab] = useState<MealTab>('Breakfast');
  const [subPanel, setSubPanel] = useState<string | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState<SelectedMenuItem[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  // Per-date guest count — pre-fill from existing dateMenu or fall back to event default
  const [dateGuestCount, setDateGuestCount] = useState<number>(data.guestCount);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      const snapshot = await getDocs(
        query(collection(db, 'menu_items'),
          where('user_id', '==', user.uid),
          where('is_active', '==', true)
        )
      );
      setMenuItems(snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as MenuItem[]);
      setLoading(false);
    };
    load();
  }, [user]);

  // When date index changes, restore saved state for that date
  useEffect(() => {
    const existing = data.dateMenus.find(dm => dm.dateId === currentEventDate?.id);
    setSelectedItems(existing?.selectedItems || []);
    setDateGuestCount(existing?.guestCount ?? data.guestCount);
    setSubPanel(null);
    setActiveTab('Breakfast');
    setExpandedGroups({});
  }, [currentIndex]);

  const getMainItems = (tab: string) => {
    const mealKey = tab.toLowerCase();
    return menuItems.filter(i => {
      const cat = i.meal_category || 'main';
      if (data.menuType === 'veg') return i.meal_type === mealKey && cat === 'main' && i.menu_type === 'veg';
      return i.meal_type === mealKey && cat === 'main';
    });
  };

  const getSubItems = (tab: string, subCat: string) => {
    const mealKey = tab.toLowerCase();
    return menuItems.filter(i => {
      const cat = i.meal_category || 'main';
      if (data.menuType === 'veg') return i.meal_type === mealKey && cat === subCat && i.menu_type === 'veg';
      return i.meal_type === mealKey && cat === subCat;
    });
  };

  const isSelected = (itemId: string) => selectedItems.some(s => s.id === itemId);

  const toggleItem = (item: MenuItem) => {
    if (isSelected(item.id)) {
      setSelectedItems(prev => prev.filter(s => s.id !== item.id));
    } else {
      setSelectedItems(prev => [...prev, { ...item, mealCategory: activeTab }]);
    }
  };

  const getSelectedByMeal = () => {
    const groups: Record<string, SelectedMenuItem[]> = {};
    for (const item of selectedItems) {
      const cat = item.mealCategory.toUpperCase();
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    }
    return groups;
  };

  const clearAll = () => {
    Alert.alert('Clear All', 'Remove all selected items?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: () => setSelectedItems([]) },
    ]);
  };

  const handleNext = () => {
    if (selectedItems.length === 0) {
      Alert.alert('No Items', 'Please select at least one menu item.');
      return;
    }
    if (!dateGuestCount || dateGuestCount < 1) {
      Alert.alert('Guest Count', 'Please enter number of guests for this date.');
      return;
    }

    const newDateMenu: DateMenu = {
      dateId: currentEventDate.id,
      selectedItems,
      guestCount: dateGuestCount,
    };
    const updatedDateMenus = [
      ...data.dateMenus.filter(dm => dm.dateId !== currentEventDate.id),
      newDateMenu,
    ];

    const isLastDate = currentIndex >= totalDates - 1;

    if (isLastDate) {
      update({ dateMenus: updatedDateMenus, selectedItems });
      router.push('/new-event/review-order');
    } else {
      update({ dateMenus: updatedDateMenus, currentDateIndex: currentIndex + 1 });
    }
  };

  const selectedGroups = getSelectedByMeal();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Build Menu</Text>
        <View style={{ width: 40 }} />
      </View>

      <StepIndicator current={3} total={4} />

      {/* Date progress banner */}
      <View style={styles.dateBanner}>
        <Text style={styles.dateBannerText}>
          📅 <Text style={styles.dateBannerDate}>{formatDate(currentEventDate?.date || '')}</Text>
        </Text>
        <Text style={styles.dateBannerProgress}>{currentIndex + 1} / {totalDates}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Guest count for this date */}
        <View style={styles.guestCountCard}>
          <Text style={styles.guestCountLabel}>
            Guests for {formatDate(currentEventDate?.date || '')}
          </Text>
          <View style={styles.counterRow}>
            <TouchableOpacity
              style={styles.counterBtn}
              onPress={() => setDateGuestCount(g => Math.max(1, g - 10))}
            >
              <Minus size={16} color="#374151" />
            </TouchableOpacity>
            <TextInput
              style={styles.counterInput}
              value={String(dateGuestCount)}
              onChangeText={t => setDateGuestCount(parseInt(t.replace(/\D/g, '') || '1', 10))}
              keyboardType="numeric"
              textAlign="center"
            />
            <TouchableOpacity
              style={styles.counterBtn}
              onPress={() => setDateGuestCount(g => g + 10)}
            >
              <Plus size={16} color="#374151" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Available Items */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Available Items</Text>
            <Text style={styles.dragHint}>Tap to add</Text>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll}>
            {MAIN_MEALS.map(tab => (
              <TouchableOpacity
                key={tab}
                style={[styles.tab, activeTab === tab && styles.tabActive]}
                onPress={() => { setActiveTab(tab as MealTab); setSubPanel(null); }}
              >
                <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {loading ? (
            <ActivityIndicator color="#1B4332" style={{ marginVertical: 20 }} />
          ) : (
            <>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.itemsRow}>
                {getMainItems(activeTab).map(item => (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.itemChip, isSelected(item.id) && styles.itemChipSelected]}
                    onPress={() => toggleItem(item)}
                  >
                    <Image
                      source={{ uri: item.image_url || 'https://images.pexels.com/photos/5560763/pexels-photo-5560763.jpeg' }}
                      style={styles.itemImage}
                    />
                    <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                    {isSelected(item.id) && <View style={styles.selectedDot} />}
                  </TouchableOpacity>
                ))}
                {getMainItems(activeTab).length === 0 && (
                  <Text style={styles.emptyTabText}>No main dishes for {activeTab}</Text>
                )}
              </ScrollView>

              {/* Sub-category buttons */}
              <View style={styles.subCatRow}>
                {SUB_CATS.map(cat => {
                  const catItems = getSubItems(activeTab, cat.key);
                  if (catItems.length === 0) return null;
                  const isOpen = subPanel === cat.key;
                  const selectedCount = selectedItems.filter(
                    s => s.mealCategory === activeTab && ((s as any).meal_category || 'main') === cat.key
                  ).length;
                  return (
                    <TouchableOpacity
                      key={cat.key}
                      style={[styles.subCatBtn, (isOpen || selectedCount > 0) && styles.subCatBtnActive]}
                      onPress={() => setSubPanel(isOpen ? null : cat.key)}
                    >
                      <Text style={[styles.subCatText, (isOpen || selectedCount > 0) && styles.subCatTextActive]}>
                        {cat.label}{selectedCount > 0 ? ` (${selectedCount})` : ''}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Sub-category individual dish panel */}
              {subPanel && (
                <View style={styles.subPanel}>
                  <Text style={styles.subPanelTitle}>
                    {SUB_CATS.find(c => c.key === subPanel)?.label} — {activeTab}
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {getSubItems(activeTab, subPanel).map(item => (
                      <TouchableOpacity
                        key={item.id}
                        style={[styles.itemChip, isSelected(item.id) && styles.itemChipSelected]}
                        onPress={() => toggleItem(item)}
                      >
                        <Image
                          source={{ uri: item.image_url || 'https://images.pexels.com/photos/5560763/pexels-photo-5560763.jpeg' }}
                          style={styles.itemImage}
                        />
                        <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                        {isSelected(item.id) && <View style={styles.selectedDot} />}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </>
          )}
        </View>

        {/* Selected Menu */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Selected Menu</Text>
          <Text style={styles.sectionSubtitle}>Tap items to remove</Text>

          {Object.keys(selectedGroups).length === 0 && (
            <Text style={styles.emptyTabText}>No items selected yet</Text>
          )}

          {Object.entries(selectedGroups).map(([group, items]) => {
            const isExpanded = expandedGroups[group] !== false;
            return (
              <View key={group} style={styles.group}>
                <TouchableOpacity
                  style={styles.groupHeader}
                  onPress={() => setExpandedGroups(prev => ({ ...prev, [group]: !isExpanded }))}
                >
                  <View style={styles.groupDot} />
                  <Text style={styles.groupTitle}>{group} ({items.length})</Text>
                  {isExpanded
                    ? <ChevronDown size={16} color="#374151" />
                    : <ChevronRight size={16} color="#374151" />}
                </TouchableOpacity>
                {isExpanded && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.itemsRow}>
                    {items.map(item => (
                      <TouchableOpacity
                        key={item.id}
                        style={styles.selectedItemChip}
                        onPress={() => toggleItem(item)}
                      >
                        <Image
                          source={{ uri: item.image_url || 'https://images.pexels.com/photos/5560763/pexels-photo-5560763.jpeg' }}
                          style={styles.itemImage}
                        />
                        <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
              </View>
            );
          })}
        </View>

        {selectedItems.length > 0 && (
          <TouchableOpacity style={styles.clearBtn} onPress={clearAll}>
            <Trash2 size={14} color="#DC2626" />
            <Text style={styles.clearBtnText}>Clear All</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
          <Text style={styles.nextBtnText}>
            {currentIndex < totalDates - 1
              ? `Save & Next: ${formatDate(data.eventDates[currentIndex + 1]?.date || '')} →`
              : 'Next: Review →'}
          </Text>
        </TouchableOpacity>

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
  dateBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F0FDF4', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#BBF7D0' },
  dateBannerText: { fontSize: 13, color: '#374151' },
  dateBannerDate: { fontWeight: '700', color: '#1B4332' },
  dateBannerProgress: { fontSize: 13, fontWeight: '700', color: '#1B4332' },
  guestCountCard: { margin: 16, backgroundColor: '#F9FAFB', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#E5E7EB', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  guestCountLabel: { fontSize: 13, fontWeight: '600', color: '#374151', flex: 1 },
  counterRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, overflow: 'hidden', height: 40 },
  counterBtn: { width: 40, height: '100%', justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  counterInput: { width: 60, fontSize: 16, fontWeight: '700', color: '#111827' },
  section: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  sectionSubtitle: { fontSize: 12, color: '#9CA3AF', marginBottom: 10 },
  dragHint: { fontSize: 12, color: '#9CA3AF' },
  tabsScroll: { marginBottom: 12 },
  tab: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, marginRight: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  tabActive: { backgroundColor: '#1B4332', borderColor: '#1B4332' },
  tabText: { fontSize: 13, color: '#6B7280', fontWeight: '500' },
  tabTextActive: { color: '#fff', fontWeight: '700' },
  itemsRow: { flexDirection: 'row' },
  itemChip: { alignItems: 'center', marginRight: 12, width: 72 },
  itemChipSelected: { opacity: 0.5 },
  itemImage: { width: 60, height: 60, borderRadius: 30, marginBottom: 4 },
  itemName: { fontSize: 11, color: '#374151', textAlign: 'center', fontWeight: '500' },
  selectedDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#1B4332', marginTop: 2 },
  emptyTabText: { fontSize: 13, color: '#9CA3AF', padding: 12 },
  subCatRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  subCatBtn: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#F9FAFB' },
  subCatBtnActive: { backgroundColor: '#1B4332', borderColor: '#1B4332' },
  subCatText: { fontSize: 13, color: '#374151', fontWeight: '500' },
  subCatTextActive: { color: '#fff' },
  subPanel: { marginTop: 12, backgroundColor: '#F9FAFB', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  subPanelTitle: { fontSize: 12, fontWeight: '700', color: '#6B7280', marginBottom: 10 },
  group: { marginBottom: 12 },
  groupHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  groupDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#16A34A' },
  groupTitle: { flex: 1, fontSize: 13, fontWeight: '700', color: '#111827' },
  selectedItemChip: { alignItems: 'center', marginRight: 12, width: 72 },
  clearBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, marginHorizontal: 16, borderRadius: 10 },
  clearBtnText: { fontSize: 13, color: '#DC2626', fontWeight: '600' },
  nextBtn: { backgroundColor: '#1B4332', borderRadius: 12, height: 52, justifyContent: 'center', alignItems: 'center', marginHorizontal: 16, marginTop: 8 },
  nextBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});