import React, { useEffect, useState, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, Image, Alert, TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Search, X, Plus, Trash2, ChevronDown, ChevronRight, Users, MapPin } from 'lucide-react-native';
import { useNewEvent, SelectedMenuItem, DateMenu } from '@/context/NewEventContext';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { MenuItem } from '@/types';
import StepIndicator from '@/components/StepIndicator';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';

const MEAL_CATEGORIES = [
  { key: 'breakfast', label: 'Breakfast', icon: '🌅', sub: 'Build your breakfast menu' },
  { key: 'lunch',     label: 'Lunch',     icon: '☀️',  sub: 'Build your lunch menu' },
  { key: 'dinner',    label: 'Dinner',    icon: '🌙', sub: 'Build your dinner menu' },
  { key: 'snacks',    label: 'Snacks',    icon: '☕', sub: 'Add evening snacks' },
];

const FILTER_TABS = ['All', 'Breakfast', 'Lunch', 'Dinner', 'Snacks'];

const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function formatDate(dateStr: string) {
  if (!dateStr) return '';
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

  const [activeMeal, setActiveMeal] = useState('breakfast');
  const [mobilePanel, setMobilePanel] = useState<'left' | 'center' | 'right'>('left');
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState<SelectedMenuItem[]>([]);
  const [dateGuestCount, setDateGuestCount] = useState<number>(data.guestCount);
  const [searchText, setSearchText] = useState('');
  const [filterTab, setFilterTab] = useState('All');
  const [expandedMealGroups, setExpandedMealGroups] = useState<Record<string, boolean>>({});

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

  useEffect(() => {
    const existing = data.dateMenus.find(dm => dm.dateId === currentEventDate?.id);
    setSelectedItems(existing?.selectedItems || []);
    setDateGuestCount(existing?.guestCount ?? data.guestCount);
    setActiveMeal('breakfast');
    setMobilePanel('left');
    setExpandedMealGroups({});
  }, [currentIndex]);

  const availableItems = useMemo(() => {
    let items = menuItems.filter(i =>
      data.menuType === 'veg' ? i.menu_type === 'veg' : true
    );
    if (searchText.trim()) {
      items = items.filter(i => i.name.toLowerCase().includes(searchText.toLowerCase()));
    }
    if (filterTab !== 'All') {
      const key = filterTab.toLowerCase();
      if (key === 'desserts') items = items.filter(i => (i.meal_category || 'main') === 'dessert');
      else if (key === 'beverages') items = items.filter(i => (i.meal_category || 'main') === 'beverage');
      else items = items.filter(i => i.meal_type === key);
    }
    return items;
  }, [menuItems, searchText, filterTab, data.menuType]);

  // FIX 1: explicit return type on useMemo
  // FIX 2: icon added to early return path
const groupedAvailable = useMemo((): { title: string; icon: string; items: MenuItem[] }[] => {
  // Search path — flat results
  if (searchText.trim()) {
    return [{ title: 'Results', icon: '🍴', items: availableItems }];
  }

  // All tab — show every meal with sub-sections
  if (filterTab === 'All') {
    const groups: { title: string; icon: string; items: MenuItem[] }[] = [];
    MEAL_CATEGORIES.forEach(meal => {
      const main = availableItems.filter(i =>
        i.meal_type === meal.key && (i.meal_category || 'main') === 'main'
      );
      const desserts = availableItems.filter(i =>
        i.meal_type === meal.key && (i.meal_category || 'main') === 'dessert'
      );
      const beverages = availableItems.filter(i =>
        i.meal_type === meal.key && (i.meal_category || 'main') === 'beverage'
      );
      if (main.length) groups.push({ title: `${meal.label} · Main Course`, icon: meal.icon, items: main });
      if (desserts.length) groups.push({ title: `${meal.label} · Desserts`, icon: '🍮', items: desserts });
      if (beverages.length) groups.push({ title: `${meal.label} · Beverages`, icon: '☕', items: beverages });
    });
    return groups;
  }

  // Specific meal tab (Breakfast / Lunch / Dinner / Snacks)
  // Show 3 sub-sections: Main Course, Desserts, Beverages
  const meal = MEAL_CATEGORIES.find(m => m.label === filterTab);
  if (meal) {
    const groups: { title: string; icon: string; items: MenuItem[] }[] = [];
    const main = availableItems.filter(i =>
      i.meal_type === meal.key && (i.meal_category || 'main') === 'main'
    );
    const desserts = availableItems.filter(i =>
      i.meal_type === meal.key && (i.meal_category || 'main') === 'dessert'
    );
    const beverages = availableItems.filter(i =>
      i.meal_type === meal.key && (i.meal_category || 'main') === 'beverage'
    );
    groups.push({ title: 'Main Course', icon: meal.icon, items: main });
groups.push({ title: 'Desserts', icon: '🍮', items: desserts });
groups.push({ title: 'Beverages', icon: '☕', items: beverages });
return groups;
  }

  return [{ title: 'Results', icon: '🍴', items: availableItems }];
}, [availableItems, searchText, filterTab]);

  const isSelected = (itemId: string) => selectedItems.some(s => s.id === itemId);

  const addItem = (item: MenuItem) => {
    if (isSelected(item.id)) return;
    const mealCat = activeMeal.charAt(0).toUpperCase() + activeMeal.slice(1);
    setSelectedItems(prev => [...prev, {
      ...item,
      mealCategory: mealCat,
      meal_category: (item as any).meal_category || 'main',
    } as SelectedMenuItem]);
  };

  const removeItem = (itemId: string) => {
    setSelectedItems(prev => prev.filter(s => s.id !== itemId));
  };

  const selectedByMeal = useMemo(() => {
    const groups: Record<string, SelectedMenuItem[]> = {};
    MEAL_CATEGORIES.forEach(m => { groups[m.key] = []; });
    selectedItems.forEach(item => {
      const meal = item.mealCategory.toLowerCase();
      if (groups[meal] !== undefined) groups[meal].push(item);
    });
    return groups;
  }, [selectedItems]);

  const mealItemCount = (mealKey: string) => (selectedByMeal[mealKey] || []).length;
  const totalSelected = selectedItems.length;

  const clearAll = () => {
    Alert.alert('Clear All', 'Remove all selected items?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: () => setSelectedItems([]) },
    ]);
  };

  const handleReviewAndSave = () => {
    if (selectedItems.length === 0) {
      Alert.alert('No Items', 'Please select at least one menu item.');
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

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Menu Builder</Text>
        <View style={styles.headerRight}>
          <View style={styles.metaChip}>
            <Users size={11} color="#6B7280" />
            <Text style={styles.metaChipText} numberOfLines={1}>{dateGuestCount}</Text>
          </View>
          <View style={styles.metaChip}>
            <MapPin size={11} color="#6B7280" />
            <Text style={styles.metaChipText} numberOfLines={1}>{(data.venue || 'Venue').split(',')[0]}</Text>
          </View>
          <TouchableOpacity style={styles.reviewBtn} onPress={handleReviewAndSave}>
            <Text style={styles.reviewBtnText}>
              {currentIndex < totalDates - 1 ? 'Next →' : 'Review & Save →'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {totalDates > 1 && (
        <View style={styles.dateBanner}>
          <View style={styles.dateBannerLeft}>
            <Text style={styles.dateBannerEmoji}>📅</Text>
            <Text style={styles.dateBannerDate}>{formatDate(currentEventDate?.date || '')}</Text>
          </View>
          <Text style={styles.dateBannerProgress}>{currentIndex + 1} / {totalDates}</Text>
        </View>
      )}

      <View style={styles.panelTabs}>
        {(['left', 'center', 'right'] as const).map((panel, i) => {
          const labels = ['1 Meal', '2 Selected', '3 Available'];
          const isActive = mobilePanel === panel;
          return (
            <TouchableOpacity
              key={panel}
              style={[styles.panelTab, isActive && styles.panelTabActive]}
              onPress={() => setMobilePanel(panel)}
            >
              <Text style={[styles.panelTabText, isActive && styles.panelTabTextActive]}>
                {labels[i]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── LEFT PANEL ── */}
      {mobilePanel === 'left' && (
        <View style={styles.panelContainer}>
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle}>Select Meal Category</Text>
            <Text style={styles.panelSub}>Choose a meal to build your menu</Text>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {MEAL_CATEGORIES.map(meal => (
              <TouchableOpacity
                key={meal.key}
                style={[styles.mealItem, activeMeal === meal.key && styles.mealItemActive]}
                onPress={() => {
                  setActiveMeal(meal.key);
                  setFilterTab(meal.label);
                  setMobilePanel('right');
                }}
              >
                <View style={[styles.mealIconBox, activeMeal === meal.key && styles.mealIconBoxActive]}>
                  <Text style={styles.mealIcon}>{meal.icon}</Text>
                </View>
                <View style={styles.mealItemInfo}>
                  <Text style={[styles.mealItemLabel, activeMeal === meal.key && styles.mealItemLabelActive]}>
                    {meal.label}
                  </Text>
                  <Text style={styles.mealItemSub}>{meal.sub}</Text>
                </View>
                {mealItemCount(meal.key) > 0 && (
                  <View style={styles.mealBadge}>
                    <Text style={styles.mealBadgeText}>{mealItemCount(meal.key)}</Text>
                  </View>
                )}
                <ChevronRight size={16} color={activeMeal === meal.key ? '#1B4332' : '#D1D5DB'} />
              </TouchableOpacity>
            ))}

            <View style={styles.tipBox}>
              <Text style={styles.tipEmoji}>💡</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.tipTitle}>Tip</Text>
                <Text style={styles.tipText}>
                  Select a meal, then tap + in Available Items to add dishes including desserts and beverages — they'll appear under that meal.
                </Text>
              </View>
            </View>
            <View style={{ height: 80 }} />
          </ScrollView>

          <View style={styles.totalBar}>
            <Text style={styles.totalBarLabel}>Total Items Selected</Text>
            <Text style={styles.totalBarValue}>{totalSelected} Items</Text>
          </View>
        </View>
      )}

      {/* ── CENTER PANEL ── */}
      {mobilePanel === 'center' && (
        <View style={styles.panelContainer}>
          <View style={styles.panelHeaderRow}>
            <View>
              <Text style={styles.panelTitle}>Your Selected Menu</Text>
              <Text style={styles.panelSub}>Tap × to remove items</Text>
            </View>
            {totalSelected > 0 && (
              <TouchableOpacity style={styles.clearBtn} onPress={clearAll}>
                <Trash2 size={13} color="#DC2626" />
                <Text style={styles.clearBtnText}>Clear All</Text>
              </TouchableOpacity>
            )}
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {MEAL_CATEGORIES.map(meal => {
              const items = selectedByMeal[meal.key] || [];
              if (items.length === 0) return null;
              const isExp = expandedMealGroups[meal.key] !== false;
              return (
                <View key={meal.key} style={styles.selectedGroup}>
                  <TouchableOpacity
                    style={styles.selectedGroupHeader}
                    onPress={() => setExpandedMealGroups(p => ({ ...p, [meal.key]: !isExp }))}
                  >
                    <Text style={styles.selectedGroupIcon}>{meal.icon}</Text>
                    <Text style={styles.selectedGroupLabel}>{meal.label}</Text>
                    <View style={styles.selectedGroupBadge}>
                      <Text style={styles.selectedGroupBadgeText}>{items.length} Items</Text>
                    </View>
                    {isExp ? <ChevronDown size={15} color="#374151" /> : <ChevronRight size={15} color="#374151" />}
                  </TouchableOpacity>

                  {isExp && items.map(item => (
                    <View key={item.id} style={styles.selectedItem}>
                      <Image
                        source={{ uri: item.image_url || 'https://images.pexels.com/photos/5560763/pexels-photo-5560763.jpeg' }}
                        style={styles.selectedItemImg}
                      />
                      <View style={styles.selectedItemInfo}>
                        <Text style={styles.selectedItemName} numberOfLines={1}>{item.name}</Text>
                        {(item as any).meal_category && (item as any).meal_category !== 'main' && (
                          <Text style={styles.selectedItemSub}>
                            {(item as any).meal_category === 'dessert' ? '🍮 Dessert' : '☕ Beverage'}
                          </Text>
                        )}
                      </View>
                      <TouchableOpacity style={styles.removeBtn} onPress={() => removeItem(item.id)}>
                        <X size={13} color="#9CA3AF" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              );
            })}

            {totalSelected === 0 && (
              <View style={styles.emptyCenter}>
                <Text style={styles.emptyCenterEmoji}>🍽️</Text>
                <Text style={styles.emptyCenterTitle}>No items selected yet</Text>
                <Text style={styles.emptyCenterSub}>Go to Available Items to add dishes</Text>
                <TouchableOpacity style={styles.browseBtn} onPress={() => setMobilePanel('right')}>
                  <Text style={styles.browseBtnText}>Browse Available Items</Text>
                </TouchableOpacity>
              </View>
            )}
            <View style={{ height: 16 }} />
          </ScrollView>

          <View style={styles.summaryBar}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.summaryScroll}>
              {MEAL_CATEGORIES.map(meal => (
                <View key={meal.key} style={styles.summaryItem}>
                  <Text style={styles.summaryItemIcon}>{meal.icon}</Text>
                  <Text style={styles.summaryItemLabel}>{meal.label}</Text>
                  <Text style={styles.summaryItemCount}>{mealItemCount(meal.key)} Items</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      )}

      {/* ── RIGHT PANEL ── */}
      {mobilePanel === 'right' && (
        <View style={styles.panelContainer}>
          <View style={styles.searchBox}>
            <Search size={15} color="#9CA3AF" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search items..."
              placeholderTextColor="#9CA3AF"
              value={searchText}
              onChangeText={setSearchText}
            />
            {searchText.length > 0 && (
              <TouchableOpacity onPress={() => setSearchText('')}>
                <X size={15} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
            {FILTER_TABS.map(tab => (
              <TouchableOpacity
                key={tab}
                style={[styles.filterPill, filterTab === tab && styles.filterPillActive]}
                onPress={() => {
  setFilterTab(tab);
  const meal = MEAL_CATEGORIES.find(m => m.label === tab);
  if (meal) setActiveMeal(meal.key);
}}
              >
                <Text style={[styles.filterPillText, filterTab === tab && styles.filterPillTextActive]}>
                  {tab}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.activeMealBanner}>
            <Text style={styles.activeMealText}>
              Adding to:{' '}
              <Text style={styles.activeMealBold}>
                {MEAL_CATEGORIES.find(m => m.key === activeMeal)?.label}
              </Text>
            </Text>
            <TouchableOpacity onPress={() => setMobilePanel('left')}>
              <Text style={styles.changeMealText}>Change</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator color="#1B4332" style={{ marginTop: 40 }} />
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.availScroll}>
              {groupedAvailable.length === 0 ? (
                <Text style={styles.noResultsText}>No items found</Text>
              ) : (
                groupedAvailable.map(group => (
                  <View key={group.title} style={styles.availGroup}>
                    <View style={styles.availGroupTitleRow}>
                      <Text style={styles.availGroupIcon}>{group.icon}</Text>
                      <Text style={styles.availGroupTitle}>{group.title}</Text>
                    </View>
// REPLACE the availGrid block:
<View style={styles.availGrid}>
  {group.items.map(item => {
    const sel = isSelected(item.id);
    return (
      <View key={item.id} style={[styles.availCard, sel && styles.availCardSelected]}>
        <Image
          source={{ uri: item.image_url || 'https://images.pexels.com/photos/5560763/pexels-photo-5560763.jpeg' }}
          style={styles.availCardImg}
        />
        <Text style={styles.availCardName} numberOfLines={2}>{item.name}</Text>
        <TouchableOpacity
          style={[styles.availAddBtn, sel && styles.availAddBtnSel]}
          onPress={() => sel ? removeItem(item.id) : addItem(item)}
        >
          {sel ? <X size={13} color="#fff" /> : <Plus size={13} color="#1B4332" />}
        </TouchableOpacity>
      </View>
    );
  })}
  {group.items.length === 0 && (
      <View style={styles.emptyGroupWrap}>
    <Text style={styles.emptyGroupText}>No dishes added yet. Go to Dishes tab to add.</Text>
  </View>
  )}
</View>
                  </View>
                ))
              )}
            </ScrollView>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', gap: 8 },
  backBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#111827', flexShrink: 0 },
  headerRight: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 6, overflow: 'hidden' },
  metaChip: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#F3F4F6', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 5, maxWidth: 90 },
  metaChipText: { fontSize: 11, color: '#6B7280', flexShrink: 1 },
  reviewBtn: { backgroundColor: '#1B4332', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, flexShrink: 0 },
  reviewBtnText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  dateBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F0FDF4', paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#BBF7D0' },
  dateBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dateBannerEmoji: { fontSize: 14 },
  dateBannerDate: { fontSize: 13, fontWeight: '700', color: '#1B4332' },
  dateBannerProgress: { fontSize: 13, fontWeight: '700', color: '#1B4332' },
  panelTabs: { flexDirection: 'row', backgroundColor: '#F9FAFB', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  panelTab: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  panelTabActive: { borderBottomWidth: 2, borderBottomColor: '#1B4332', backgroundColor: '#fff' },
  panelTabText: { fontSize: 13, color: '#9CA3AF', fontWeight: '500' },
  panelTabTextActive: { color: '#1B4332', fontWeight: '700' },
  panelContainer: { flex: 1 },
  panelHeader: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  panelHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  panelTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  panelSub: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  mealItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', gap: 12 },
  mealItemActive: { backgroundColor: '#F0FDF4' },
  mealIconBox: { width: 44, height: 44, backgroundColor: '#F3F4F6', borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  mealIconBoxActive: { backgroundColor: '#D1FAE5' },
  mealIcon: { fontSize: 22 },
  mealItemInfo: { flex: 1 },
  mealItemLabel: { fontSize: 15, fontWeight: '600', color: '#374151' },
  mealItemLabelActive: { color: '#1B4332' },
  mealItemSub: { fontSize: 12, color: '#9CA3AF', marginTop: 1 },
  mealBadge: { backgroundColor: '#D1FAE5', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2, marginRight: 4 },
  mealBadgeText: { fontSize: 12, fontWeight: '700', color: '#065F46' },
  tipBox: { flexDirection: 'row', gap: 10, margin: 16, backgroundColor: '#F0FDF4', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#BBF7D0' },
  tipEmoji: { fontSize: 18 },
  tipTitle: { fontSize: 13, fontWeight: '700', color: '#1B4332' },
  tipText: { fontSize: 12, color: '#374151', marginTop: 2, lineHeight: 18 },
  totalBar: { borderTopWidth: 1, borderTopColor: '#E5E7EB', padding: 16, backgroundColor: '#F9FAFB' },
  totalBarLabel: { fontSize: 12, color: '#6B7280' },
  totalBarValue: { fontSize: 22, fontWeight: '800', color: '#1B4332', marginTop: 2 },
  clearBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  clearBtnText: { fontSize: 13, color: '#DC2626', fontWeight: '600' },
  selectedGroup: { borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  selectedGroupHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  selectedGroupIcon: { fontSize: 18 },
  selectedGroupLabel: { flex: 1, fontSize: 14, fontWeight: '700', color: '#111827' },
  selectedGroupBadge: { backgroundColor: '#F0FDF4', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  selectedGroupBadgeText: { fontSize: 12, fontWeight: '600', color: '#1B4332' },
  selectedItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#F9FAFB', gap: 10 },
  selectedItemImg: { width: 38, height: 38, borderRadius: 8 },
  selectedItemInfo: { flex: 1 },
  selectedItemName: { fontSize: 13, fontWeight: '600', color: '#374151' },
  selectedItemSub: { fontSize: 11, color: '#9CA3AF', marginTop: 1 },
  removeBtn: { width: 28, height: 28, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 14 },
  emptyCenter: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
  emptyCenterEmoji: { fontSize: 48, marginBottom: 12 },
  emptyGroupText: { fontSize: 12, color: '#D1D5DB', fontStyle: 'italic', paddingVertical: 8, paddingHorizontal: 4 },
  emptyCenterTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 4 },
  emptyCenterSub: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', marginBottom: 20 },
  emptyGroupWrap: { paddingVertical: 8, paddingHorizontal: 4 },
  browseBtn: { backgroundColor: '#1B4332', borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
  browseBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  summaryBar: { borderTopWidth: 1, borderTopColor: '#E5E7EB', backgroundColor: '#F9FAFB', paddingVertical: 10 },
  summaryScroll: { paddingHorizontal: 12, gap: 4 },
  summaryItem: { alignItems: 'center', paddingHorizontal: 14 },
  summaryItemIcon: { fontSize: 16, marginBottom: 2 },
  summaryItemLabel: { fontSize: 11, fontWeight: '600', color: '#374151' },
  summaryItemCount: { fontSize: 11, color: '#6B7280' },
  searchBox: { flexDirection: 'row', alignItems: 'center', margin: 12, backgroundColor: '#F9FAFB', borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB', paddingHorizontal: 12, height: 42, gap: 8 },
  searchInput: { flex: 1, fontSize: 14, color: '#111827' },
  filterRow: { paddingHorizontal: 12, paddingBottom: 10, gap: 6 },
  filterPill: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#F9FAFB' },
  filterPillActive: { backgroundColor: '#1B4332', borderColor: '#1B4332' },
  filterPillText: { fontSize: 12, color: '#6B7280', fontWeight: '500' },
  filterPillTextActive: { color: '#fff', fontWeight: '700' },
  activeMealBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#F0FDF4', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#BBF7D0', marginBottom: 4 },
  activeMealText: { fontSize: 12, color: '#374151' },
  activeMealBold: { fontWeight: '700', color: '#1B4332' },
  changeMealText: { fontSize: 12, fontWeight: '700', color: '#1B4332' },
  availScroll: { paddingHorizontal: 12, paddingBottom: 24 },
  noResultsText: { textAlign: 'center', color: '#9CA3AF', fontSize: 14, marginTop: 40 },
  availGroup: { marginBottom: 16 },
  availGroupTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10, marginTop: 4 },
  availGroupIcon: { fontSize: 14 },
  availGroupTitle: { fontSize: 13, fontWeight: '700', color: '#1B4332' },
  availGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 4 },
  availCard: { width: 100, alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 12, padding: 8, borderWidth: 1, borderColor: '#E5E7EB', margin: 4 },  availCardSelected: { borderColor: '#1B4332', backgroundColor: '#F0FDF4' },
  availCardImg: { width: 54, height: 54, borderRadius: 27, marginBottom: 6 },
  availCardName: { fontSize: 11, fontWeight: '500', color: '#374151', textAlign: 'center', marginBottom: 6, minHeight: 28 },
  availAddBtn: { width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, borderColor: '#1B4332', justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  availAddBtnSel: { backgroundColor: '#1B4332', borderColor: '#1B4332' },
});