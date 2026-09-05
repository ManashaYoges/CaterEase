import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, Image, Alert, TextInput, Dimensions, Modal, Pressable,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { ArrowLeft, Search, X, Trash2, ChevronDown, Edit3, Plus, Users, MapPin, Check, MoreVertical } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNewEvent, SelectedMenuItem, DateMenu } from '@/context/NewEventContext';
import { collection, getDocs, query, where, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { MenuItem } from '@/types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { getDishImageUrl } from '@/utils/dishImage';
import { F, scaleFont } from '@/utils/fonts';
import { matchesCategory } from '@/utils/categories';
import OnboardingGuidancePopup from '@/components/OnboardingGuidancePopup';
import Colors from '@/constants/Colors';

export interface MenuSection {
  id: string;
  label: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snacks';
  categoryKind: 'main' | 'desserts' | 'beverages' | 'snacks';
  icon: string;
}

export const MENU_SECTIONS: MenuSection[] = [
  { id: 'breakfast',           label: 'Breakfast',          mealType: 'breakfast', categoryKind: 'main',      icon: '🌅' },
  { id: 'breakfast_desserts',  label: 'Breakfast Desserts', mealType: 'breakfast', categoryKind: 'desserts',  icon: '🍰' },
  { id: 'breakfast_beverages', label: 'Breakfast Beverages',mealType: 'breakfast', categoryKind: 'beverages', icon: '☕' },
  { id: 'lunch',              label: 'Lunch',              mealType: 'lunch',     categoryKind: 'main',      icon: '☀️' },
  { id: 'lunch_desserts',     label: 'Lunch Desserts',     mealType: 'lunch',     categoryKind: 'desserts',  icon: '🍨' },
  { id: 'lunch_beverages',    label: 'Lunch Beverages',    mealType: 'lunch',     categoryKind: 'beverages', icon: '🥤' },
  { id: 'dinner',             label: 'Dinner',             mealType: 'dinner',    categoryKind: 'main',      icon: '🌙' },
  { id: 'dinner_desserts',    label: 'Dinner Desserts',    mealType: 'dinner',    categoryKind: 'desserts',  icon: '🍮' },
  { id: 'dinner_beverages',   label: 'Dinner Beverages',   mealType: 'dinner',    categoryKind: 'beverages', icon: '🍷' },
  { id: 'snacks',             label: 'Snacks',             mealType: 'snacks',    categoryKind: 'snacks',    icon: '🍟' },
];

export function isDishInMenuType(dish: MenuItem, menuType: 'veg' | 'non_veg'): boolean {
  if (menuType === 'veg') {
    return dish.menu_type === 'veg' || dish.categoryType === 'veg';
  } else {
    return dish.menu_type === 'non_veg' || dish.categoryType === 'nonVeg';
  }
}

export function isDishInSection(dish: MenuItem, section: MenuSection): boolean {
  const dishMeal = (dish.meal_type || '').toLowerCase();
  if (dishMeal !== section.mealType) return false;

  if (section.categoryKind === 'desserts') {
    return matchesCategory(dish.meal_category, 'Desserts');
  }

  if (section.categoryKind === 'beverages') {
    return matchesCategory(dish.meal_category, 'Hot/Soft Beverages');
  }

  if (section.categoryKind === 'snacks') {
    return true;
  }

  if (section.categoryKind === 'main') {
    return matchesCategory(dish.meal_category, 'Main');
  }

  return true;
}

export default function BuildMenuScreen() {
  const router = useRouter();
  const { data, update } = useNewEvent();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { t, language } = useLanguage();

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString(language === 'ta' ? 'ta-IN' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const currentIndex = data.currentDateIndex ?? 0;
  const currentEventDate = data.eventDates[currentIndex];
  const totalDates = data.eventDates.length;

  const activeMenuType: 'veg' | 'non_veg' = (data.menuType as any) === 'non_veg' ? 'non_veg' : 'veg';
  const [selectedSectionId, setSelectedSectionId] = useState<string>('breakfast');
  const [showDropdown, setShowDropdown] = useState(false);
  const [dropdownLayout, setDropdownLayout] = useState<{ top: number; left: number; width: number }>({ top: 60, left: 16, width: 230 });
  const dropdownTriggerRef = useRef<View>(null);

  const openDropdown = () => {
    if (dropdownTriggerRef.current) {
      dropdownTriggerRef.current.measureInWindow((x, y, width, height) => {
        const windowHeight = Dimensions.get('window').height;
        const windowWidth = Dimensions.get('window').width;
        const topPos = y > 0 ? y + height + 4 : insets.top + 50;
        const leftPos = Math.max(8, Math.min(x > 0 ? x : 16, windowWidth - 250));
        const popWidth = Math.max(width, Math.max(230, Math.min(270, windowWidth - leftPos - 16)));

        setDropdownLayout({
          top: topPos,
          left: leftPos,
          width: popWidth,
        });
        setShowDropdown(true);
      });
    } else {
      setShowDropdown(true);
    }
  };

  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState<SelectedMenuItem[]>([]);
  const [dateGuestCount, setDateGuestCount] = useState<number>(data.guestCount);
  const [searchText, setSearchText] = useState('');
  
  const [showAddDish, setShowAddDish] = useState(false);
  const [newDishName, setNewDishName] = useState('');
  const [addDishCategory, setAddDishCategory] = useState<'main' | 'sweet' | 'bev'>('main');
  const [newDishPrice, setNewDishPrice] = useState('');
  const [savingDish, setSavingDish] = useState(false);
  const [addDishError, setAddDishError] = useState('');

  const [activeMenuDish, setActiveMenuDish] = useState<SelectedMenuItem | null>(null);
  const [editingDish, setEditingDish] = useState<SelectedMenuItem | null>(null);
  const [editPriceInput, setEditPriceInput] = useState<string>('');
  const [deletingDish, setDeletingDish] = useState<SelectedMenuItem | null>(null);

  const buildMenuSearchRef = useRef<TextInput>(null);
  const buildMenuDishNameRef = useRef<TextInput>(null);
  const buildMenuDishPriceRef = useRef<TextInput>(null);

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const snapshot = await getDocs(
        query(collection(db, 'menu_items'),
          where('user_id', '==', user.uid),
          where('is_active', '==', true)
        )
      );
      setMenuItems(snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as MenuItem[]);
    } catch (err) {
      console.error('Error loading menu items in BuildMenu:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  useEffect(() => {
    const existing = data.dateMenus.find(dm => dm.dateId === currentEventDate?.id);
    const initialItems = existing?.selectedItems ?? (currentIndex === 0 ? data.selectedItems : []);
    setSelectedItems(initialItems || []);
    setDateGuestCount(existing?.guestCount ?? data.guestCount);
  }, [currentIndex, currentEventDate, data.dateMenus, data.guestCount, data.selectedItems]);

  const currentSection = useMemo(() => {
    return MENU_SECTIONS.find(s => s.id === selectedSectionId) || MENU_SECTIONS[0];
  }, [selectedSectionId]);

  const sectionAvailableDishes = useMemo(() => {
    let items = menuItems.filter(i => isDishInMenuType(i, activeMenuType) && isDishInSection(i, currentSection));
    if (searchText.trim()) {
      const q = searchText.toLowerCase().trim();
      items = items.filter(i => i.name.toLowerCase().includes(q));
    }
    return items;
  }, [menuItems, activeMenuType, currentSection, searchText]);

  const sectionSelectedCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    MENU_SECTIONS.forEach(s => { counts[s.id] = 0; });
    selectedItems.forEach(item => {
      if (isDishInMenuType(item, activeMenuType)) {
        const matchingSection = MENU_SECTIONS.find(s => isDishInSection(item, s));
        if (matchingSection) {
          counts[matchingSection.id] = (counts[matchingSection.id] || 0) + 1;
        }
      }
    });
    return counts;
  }, [selectedItems, activeMenuType]);

  const mealGroupSelectedCounts = useMemo(() => {
    const counts: Record<string, number> = { breakfast: 0, lunch: 0, dinner: 0, snacks: 0 };
    selectedItems.forEach(item => {
      if (isDishInMenuType(item, activeMenuType)) {
        const itemMeal = (item.meal_type || '').toLowerCase();
        if (Object.prototype.hasOwnProperty.call(counts, itemMeal)) {
          counts[itemMeal] += 1;
        }
      }
    });
    return counts;
  }, [selectedItems, activeMenuType]);

  const ALL_BOTTOM_TABS = useMemo(() => [
    { id: 'breakfast', label: 'Breakfast', icon: '🌅', defaultSectionId: 'breakfast' },
    { id: 'lunch',     label: 'Lunch',     icon: '☀️', defaultSectionId: 'lunch' },
    { id: 'dinner',    label: 'Dinner',    icon: '🌙', defaultSectionId: 'dinner' },
    { id: 'snacks',    label: 'Snacks',    icon: '🍟', defaultSectionId: 'snacks' },
  ], []);

  const selectedMealTypes = useMemo(() => {
    const userMealTypes: string[] = currentEventDate?.mealTypes || (currentEventDate as any)?.meal_types || [];
    if (!userMealTypes || !Array.isArray(userMealTypes) || userMealTypes.length === 0) {
      return ['breakfast', 'lunch', 'dinner', 'snacks'];
    }
    return userMealTypes.map(m => m.toLowerCase());
  }, [currentEventDate]);

  const visibleBottomTabs = useMemo(() => {
    return ALL_BOTTOM_TABS.filter(tab => selectedMealTypes.includes(tab.id.toLowerCase()));
  }, [ALL_BOTTOM_TABS, selectedMealTypes]);

  useEffect(() => {
    if (visibleBottomTabs.length > 0) {
      const isCurrentSectionValid = visibleBottomTabs.some(
        tab => tab.id === currentSection.mealType
      );
      if (!isCurrentSectionValid) {
        setSelectedSectionId(visibleBottomTabs[0].defaultSectionId);
      }
    }
  }, [visibleBottomTabs, currentSection.mealType]);

  const isSelected = (itemId: string) => selectedItems.some(s => s.id === itemId);

  const toggleItemSelection = (item: MenuItem) => {
    if (isSelected(item.id)) {
      setSelectedItems(prev => prev.filter(s => s.id !== item.id));
    } else {
      const mealCat = currentSection.mealType.charAt(0).toUpperCase() + currentSection.mealType.slice(1);
      setSelectedItems(prev => [...prev, {
        ...item,
        mealCategory: mealCat,
        meal_category: item.meal_category || 'Main',
        originalPrice: item.price,
        isPriceEdited: false,
      } as SelectedMenuItem]);
    }
  };

  const removeItem = (itemId: string) => {
    setSelectedItems(prev => prev.filter(s => s.id !== itemId));
  };

  const saveNewDish = async () => {
    if (!newDishName.trim()) {
      setAddDishError(t('Dish name is required'));
      return;
    }
    if (!user) return;
    setSavingDish(true);
    setAddDishError('');

    const targetMenuType = activeMenuType;
    const targetCatType = activeMenuType === 'veg' ? 'veg' : 'nonVeg';
    const targetMealType = currentSection.mealType;

    let targetCatName = 'Main';
    if (addDishCategory === 'sweet') {
      targetCatName = 'Desserts';
    } else if (addDishCategory === 'bev') {
      targetCatName = 'Hot/Soft Beverages';
    } else {
      if (currentSection.categoryKind === 'desserts') {
        targetCatName = 'Desserts';
      } else if (currentSection.categoryKind === 'beverages') {
        targetCatName = 'Hot/Soft Beverages';
      } else {
        targetCatName = 'Main';
      }
    }

    try {
      const docRef = await addDoc(collection(db, 'menu_items'), {
        user_id: user.uid,
        name: newDishName.trim(),
        menu_type: targetMenuType,
        categoryType: targetCatType,
        meal_type: targetMealType,
        meal_category: targetCatName,
        price: parseFloat(newDishPrice) || 0,
        description: null,
        image_url: null,
        is_active: true,
        created_at: new Date().toISOString(),
      });

      const newItem: MenuItem = {
        id: docRef.id,
        user_id: user.uid,
        name: newDishName.trim(),
        menu_type: targetMenuType,
        categoryType: targetCatType,
        meal_type: targetMealType,
        meal_category: targetCatName,
        price: parseFloat(newDishPrice) || 0,
        description: null,
        image_url: null,
        is_active: true,
      } as any;

      setMenuItems(prev => [...prev, newItem]);
      setNewDishName('');
      setNewDishPrice('');
      setAddDishCategory('main');
      setShowAddDish(false);
    } catch (err: any) {
      setAddDishError(err.message || 'Failed to save dish');
    } finally {
      setSavingDish(false);
    }
  };

  const handleDeleteDish = (id: string, name: string) => {
    Alert.alert(
      t('Delete Dish'),
      t('Are you sure you want to delete "{name}"?', { name }),
      [
        { text: t('Cancel'), style: 'cancel' },
        {
          text: t('Delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'menu_items', id));
              setMenuItems(prev => prev.filter(item => item.id !== id));
              setSelectedItems(prev => prev.filter(item => item.id !== id));
            } catch (err: any) {
              Alert.alert(t('Error'), err.message || 'Failed to delete dish');
            }
          },
        },
      ]
    );
  };

  const totalSelected = selectedItems.length;

  const clearAll = () => {
    Alert.alert(t('Clear All'), t('Remove all selected items?'), [
      { text: t('Cancel'), style: 'cancel' },
      { text: t('Clear'), style: 'destructive', onPress: () => setSelectedItems([]) },
    ]);
  };

  const handleReviewAndSave = () => {
    if (selectedItems.length === 0) {
      Alert.alert(t('No Items'), t('Please select at least one menu item.'));
      return;
    }
    const newDateMenu: DateMenu = {
      dateId: currentEventDate.id,
      selectedItems,
      guestCount: dateGuestCount,
      mealTimings: currentEventDate?.mealTimings || {},
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

  const selectedInSection = useMemo(() => {
    return selectedItems.filter(item => isDishInMenuType(item, activeMenuType) && isDishInSection(item, currentSection));
  }, [selectedItems, activeMenuType, currentSection]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>

      {/* TOP HEADER */}
      <LinearGradient colors={['#1B5E20', '#2E7D32']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
            <ArrowLeft size={18} color="#FFFFFF" />
          </TouchableOpacity>

          {/* HEADER TITLE */}
          <Text style={[styles.headerTitle, language === 'ta' && styles.headerTitleTa]} numberOfLines={1} ellipsizeMode="tail">
            {t('Menu Builder')}
          </Text>

          {/* EVENT METADATA */}
          <View style={styles.headerMeta}>
            <View style={[styles.metaPill, activeMenuType === 'veg' ? styles.vegBadgePill : styles.nonVegBadgePill]}>
              <Text style={[styles.metaPillText, activeMenuType === 'veg' ? styles.vegPillText : styles.nonVegPillText]}>
                {activeMenuType === 'veg' ? '🥗' : '🍗'}
              </Text>
            </View>
            <View style={styles.metaPill}>
              <Users size={10} color="#FFFFFF" />
              <Text style={[styles.metaPillText, { color: '#FFFFFF' }]}>{dateGuestCount}</Text>
            </View>
          </View>

          {/* NEXT BUTTON - Fixed size & unclipped */}
          <TouchableOpacity style={styles.reviewBtn} onPress={handleReviewAndSave} activeOpacity={0.8}>
            <Text style={styles.reviewBtnText} numberOfLines={1}>
              {t('Next →')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* SECTION DROPDOWN - Second Row */}
        <View style={styles.secondHeaderRow}>
          <View ref={dropdownTriggerRef} collapsable={false} style={styles.dropdownWrap}>
            <TouchableOpacity
              style={styles.dropdownTrigger}
              onPress={openDropdown}
              activeOpacity={0.8}
            >
              <Text style={styles.dropdownLabel}>{t('SECTION')}</Text>
              <View style={styles.dropdownValueRow}>
                <Text style={styles.dropdownValueText} numberOfLines={1} ellipsizeMode="tail">
                  {currentSection.icon} {t(currentSection.label)}
                </Text>
                <ChevronDown size={12} color="#1B4332" />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* DATE BANNER */}
        {totalDates > 1 && (
          <View style={styles.dateBanner}>
            <Text style={styles.dateBannerText}>
              {'📅 '}
              <Text style={styles.dateBannerBold}>{formatDate(currentEventDate?.date || '')}</Text>
            </Text>
            <Text style={styles.dateBannerProgress}>{currentIndex + 1} / {totalDates}</Text>
          </View>
        )}
      </LinearGradient>

      <OnboardingGuidancePopup
        message={t('Select dishes and review your menu.')}
        pointerPosition="top"
        containerStyle={{ marginTop: 6, marginBottom: 4 }}
      />

      {/* 2-COLUMN LAYOUT: Left (Available Items), Right (Your Selected Menu) */}
      <View style={styles.twoColumnRow}>

        {/* LEFT PANEL: AVAILABLE ITEMS */}
        <View style={styles.leftHalfPanel}>

          {/* LEFT PANEL HEADER: Available [count] [+] [✕] */}
          <View style={styles.panelHeaderRight}>
            <View style={styles.rightHeaderTitleWrap}>
              <Text style={styles.rightHeaderTitle} numberOfLines={1}>
                {t('Available')}
              </Text>
              <View style={styles.availDishCountBadge}>
                <Text style={styles.availDishCountText}>
                  {sectionAvailableDishes.length}
                </Text>
              </View>
            </View>

            <View style={styles.rightHeaderActionGroup}>
              <TouchableOpacity
                style={[styles.headerIconButton, showAddDish && styles.headerIconButtonActive]}
                onPress={() => {
                  setShowAddDish(prev => !prev);
                  setAddDishError('');
                }}
                activeOpacity={0.7}
              >
                <Plus size={16} color={showAddDish ? '#fff' : '#1B4332'} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.headerIconButton}
                onPress={() => {
                  setShowAddDish(false);
                  setSearchText('');
                }}
                activeOpacity={0.7}
              >
                <X size={16} color="#4B5563" />
              </TouchableOpacity>
            </View>
          </View>

          {/* SEARCH BAR: Immediately below header */}
          <View style={styles.searchBox}>
            <Search size={13} color="#9CA3AF" />
            <TextInput
              ref={buildMenuSearchRef}
              style={styles.searchInput}
              placeholder={t('Search...')}
              placeholderTextColor="#9CA3AF"
              value={searchText}
              onChangeText={setSearchText}
              returnKeyType="search"
              onSubmitEditing={() => buildMenuSearchRef.current?.blur()}
            />
            {searchText.length > 0 && (
              <TouchableOpacity onPress={() => setSearchText('')}>
                <X size={13} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>

          {loading ? (
            <ActivityIndicator color="#1B4332" style={{ marginTop: 30 }} />
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingBottom: 30, paddingHorizontal: 8 }}
              keyboardShouldPersistTaps="handled"
            >
              {/* ADD NEW DISH PANEL: Displayed below search bar when open */}
              {showAddDish && (
                <View style={styles.addDishForm}>
                  <Text style={styles.addDishFormTitle}>{t('Add New Dish')}</Text>
                  {addDishError ? <Text style={styles.addDishError}>{addDishError}</Text> : null}

                  <Text style={styles.inputLabel}>{t('Dish Name')}</Text>
                  <View style={styles.addDishInputWrap}>
                    <TextInput
                      ref={buildMenuDishNameRef}
                      style={styles.addDishInput}
                      placeholder={t('Enter dish name')}
                      placeholderTextColor="#9CA3AF"
                      value={newDishName}
                      onChangeText={setNewDishName}
                      autoCapitalize="words"
                      returnKeyType="next"
                      onSubmitEditing={() => buildMenuDishPriceRef.current?.focus()}
                      multiline={false}
                    />
                  </View>

                  <Text style={styles.inputLabel}>{t('Category')}</Text>
                  <View style={styles.addDishCategoryBanner}>
                    <Text style={styles.addDishCategoryText}>
                      {t(currentSection.label)}
                    </Text>
                  </View>
                  <View style={styles.categoryButtonsRow}>
                    <TouchableOpacity
                      style={[
                        styles.categoryBtn,
                        addDishCategory === 'main' && styles.categoryBtnActive,
                      ]}
                      onPress={() => setAddDishCategory('main')}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.categoryBtnText,
                          addDishCategory === 'main' && styles.categoryBtnTextActive,
                        ]}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {t('Main')}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.categoryBtn,
                        addDishCategory === 'sweet' && styles.categoryBtnActive,
                      ]}
                      onPress={() => setAddDishCategory('sweet')}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.categoryBtnText,
                          addDishCategory === 'sweet' && styles.categoryBtnTextActive,
                        ]}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {t('Sweet')}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.categoryBtn,
                        addDishCategory === 'bev' && styles.categoryBtnActive,
                      ]}
                      onPress={() => setAddDishCategory('bev')}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.categoryBtnText,
                          addDishCategory === 'bev' && styles.categoryBtnTextActive,
                        ]}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {t('Beverages')}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.inputLabel}>{t('Price')}</Text>
                  <View style={styles.addDishInputWrap}>
                    <TextInput
                      ref={buildMenuDishPriceRef}
                      style={styles.addDishInput}
                      placeholder={t('₹ Price (optional)')}
                      placeholderTextColor="#9CA3AF"
                      value={newDishPrice}
                      onChangeText={t => setNewDishPrice(t.replace(/[^0-9.]/g, ''))}
                      keyboardType="decimal-pad"
                      returnKeyType="done"
                      onSubmitEditing={saveNewDish}
                      multiline={false}
                    />
                  </View>

                  <TouchableOpacity
                    style={[styles.addDishSaveBtn, savingDish && { opacity: 0.6 }]}
                    onPress={saveNewDish}
                    disabled={savingDish}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.addDishSaveBtnText}>
                      {savingDish ? t('Saving...') : t('Save')}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Dish List for Selected Section */}
              {sectionAvailableDishes.length === 0 ? (
                <View style={styles.emptyWrap}>
                  <Text style={styles.emptyText}>
                    {activeMenuType === 'veg' ? t('No Veg dishes found in') : t('No Non-Veg dishes found in')} {t(currentSection.label)}.
                  </Text>
                  <Text style={styles.emptySubText}>
                    {t('Click "+" in top header to add a new dish.')}
                  </Text>
                </View>
              ) : (
                <View style={styles.availDishList}>
                  {sectionAvailableDishes.map(item => {
                    const sel = isSelected(item.id);
                    const cardInner = (
                      <>
                        {/* Square Dish Image on Left */}
                        <Image
                          source={{ uri: item.image_url || getDishImageUrl(item.name) }}
                          style={styles.dishRowImage}
                        />

                        {/* Dish Name */}
                        <Text
                          style={[styles.dishRowName, sel && styles.dishRowNameSelected]}
                          numberOfLines={2}
                          ellipsizeMode="tail"
                        >
                          {item.name}
                        </Text>

                        {/* Selected State Checkmark Badge */}
                        {sel && (
                          <View style={styles.dishRowCheckBadge}>
                            <Check size={11} color="#1B5E20" strokeWidth={3} />
                          </View>
                        )}
                      </>
                    );

                    return sel ? (
                      <TouchableOpacity
                        key={item.id}
                        onPress={() => toggleItemSelection(item)}
                        activeOpacity={0.8}
                        style={{ width: '100%' }}
                      >
                        <LinearGradient
                          colors={['#1B5E20', '#2E7D32']}
                          style={styles.dishRowCard}
                        >
                          {cardInner}
                        </LinearGradient>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        key={item.id}
                        style={styles.dishRowCard}
                        onPress={() => toggleItemSelection(item)}
                        activeOpacity={0.8}
                      >
                        {cardInner}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </ScrollView>
          )}
        </View>

        {/* RIGHT PANEL: SELECTED MENU */}
        <View style={styles.rightHalfPanel}>
          <View style={styles.panelHeaderLeft}>
            <View style={styles.panelTitleRow}>
              <Text style={styles.panelTitleText} numberOfLines={1}>{t('Selected Menu')}</Text>
              <View style={styles.sectionCountBadge}>
                <Text style={styles.sectionCountBadgeText}>{selectedInSection.length}</Text>
              </View>
            </View>
            <Text style={styles.panelSubText} numberOfLines={1}>{t(currentSection.label)}</Text>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={styles.panelScrollContent}>
            {selectedInSection.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyText}>{t('No items selected for')} {t(currentSection.label)}.</Text>
                <Text style={styles.emptySubText}>{t('Press "+" on dishes in Available Items on the left to add them here.')}</Text>
              </View>
            ) : (
              selectedInSection.map(item => {
                const isEdited = item.isPriceEdited || (item.originalPrice !== undefined && item.price !== item.originalPrice);
                return (
                  <View key={item.id} style={styles.selectedDishCard}>
                    <Image
                      source={{ uri: item.image_url || getDishImageUrl(item.name) }}
                      style={styles.selectedDishImg}
                    />
                    <View style={styles.selectedDishInfo}>
                      <Text style={styles.selectedDishName} numberOfLines={2} ellipsizeMode="tail">{item.name}</Text>
                      {item.price !== undefined && item.price !== null && (
                        <Text style={styles.selectedDishPrice}>
                          ₹{item.price}
                          {isEdited && (
                            <Text style={styles.editedTag}> ({t('edited')})</Text>
                          )}
                        </Text>
                      )}
                    </View>
                    <TouchableOpacity
                      style={styles.dishMenuBtn}
                      onPress={() => setActiveMenuDish(item)}
                      activeOpacity={0.7}
                    >
                      <MoreVertical size={16} color="#4B5563" />
                    </TouchableOpacity>
                  </View>
                );
              })
            )}
          </ScrollView>

          {/* TOTAL SELECTED ITEMS AT THE BOTTOM OF THE SECOND COLUMN */}
          <View style={styles.leftColumnFooter}>
            <View style={styles.summaryTotalTextWrap}>
              <Text style={styles.summaryTotalLabel} numberOfLines={2} ellipsizeMode="tail">{t('Total Selected Items')}</Text>
              <Text style={styles.summaryTotalValue}>{totalSelected}</Text>
            </View>
            {totalSelected > 0 && (
              <TouchableOpacity
                style={styles.summaryClearBtn}
                onPress={clearAll}
                activeOpacity={0.7}
              >
                <Trash2 size={11} color="#EA580C" />
                <Text style={styles.summaryClearText}>{t('Clear')}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* BOTTOM SUMMARY BAR */}
      <View style={[styles.bottomSummaryBar, { paddingBottom: Math.max(insets.bottom, 6) }]}>
        <View style={styles.summaryBarInner}>
          {visibleBottomTabs.map(tab => {
            const isActive = currentSection.mealType === tab.id;
            const count = mealGroupSelectedCounts[tab.id] || 0;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[
                  styles.summaryTabCard,
                  isActive ? styles.summaryTabCardActive : styles.summaryTabCardInactive,
                ]}
                onPress={() => setSelectedSectionId(tab.defaultSectionId)}
                activeOpacity={0.7}
              >
                <View style={styles.summaryTabTitleRow}>
                  <Text style={styles.summaryTabIcon}>{tab.icon}</Text>
                  <Text
                    style={[
                      styles.summaryTabLabel,
                      isActive ? styles.summaryTabLabelActive : styles.summaryTabLabelInactive,
                    ]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {t(tab.label)}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.summaryTabCountText,
                    isActive ? styles.summaryTabCountTextActive : styles.summaryTabCountTextInactive,
                  ]}
                  numberOfLines={1}
                >
                  {count} {t('Items Count')}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* SECTION DROPDOWN MODAL */}
      <Modal
        visible={showDropdown}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDropdown(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowDropdown(false)}>
          <View
            style={[
              styles.dropdownMenuModal,
              {
                top: dropdownLayout.top,
                left: dropdownLayout.left,
                width: dropdownLayout.width,
                maxHeight: Math.min(420, Dimensions.get('window').height - dropdownLayout.top - 20),
              },
            ]}
          >
            <ScrollView
              style={styles.dropdownScrollView}
              contentContainerStyle={styles.dropdownScrollContent}
              nestedScrollEnabled={true}
              showsVerticalScrollIndicator={true}
              scrollEnabled={true}
              keyboardShouldPersistTaps="handled"
            >
              {MENU_SECTIONS.map(section => {
                const isSelectedSec = selectedSectionId === section.id;
                const count = sectionSelectedCounts[section.id] || 0;
                return (
                  <TouchableOpacity
                    key={section.id}
                    style={[styles.dropdownItem, isSelectedSec && styles.dropdownItemActive]}
                    onPress={() => {
                      setSelectedSectionId(section.id);
                      setShowDropdown(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.dropdownItemIcon}>{section.icon}</Text>
                    <Text style={[styles.dropdownItemText, isSelectedSec && styles.dropdownItemTextActive]}>
                      {t(section.label)}
                    </Text>
                    {count > 0 && (
                      <View style={styles.dropdownItemBadge}>
                        <Text style={styles.dropdownItemBadgeText}>{count}</Text>
                      </View>
                    )}
                    {isSelectedSec && <Text style={styles.dropdownCheck}>✓</Text>}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      {/* THREE-DOT DISH OPTIONS MODAL */}
      <Modal
        visible={!!activeMenuDish}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setActiveMenuDish(null)}
      >
        <Pressable style={styles.modalCenterOverlay} onPress={() => setActiveMenuDish(null)}>
          <Pressable style={styles.modalCardBox} onPress={e => e.stopPropagation()}>
            <Text style={styles.modalHeaderTitle} numberOfLines={1}>{activeMenuDish?.name}</Text>
            <Text style={styles.modalSubtitle}>{t('Dish Options')}</Text>

            <TouchableOpacity
              style={styles.dishOptionRow}
              onPress={() => {
                const dish = activeMenuDish;
                setActiveMenuDish(null);
                if (dish) {
                  setEditingDish(dish);
                  setEditPriceInput((dish.price ?? 0).toString());
                }
              }}
              activeOpacity={0.7}
            >
              <Edit3 size={16} color="#1B4332" />
              <Text style={styles.dishOptionRowText}>{t('Edit Price')}</Text>
            </TouchableOpacity>

            <View style={styles.dishOptionDivider} />

            <TouchableOpacity
              style={styles.dishOptionRow}
              onPress={() => {
                const dish = activeMenuDish;
                setActiveMenuDish(null);
                if (dish) {
                  setDeletingDish(dish);
                }
              }}
              activeOpacity={0.7}
            >
              <Trash2 size={16} color="#EF4444" />
              <Text style={[styles.dishOptionRowText, { color: '#EF4444' }]}>{t('Delete')}</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* EDIT PRICE MODAL */}
      <Modal
        visible={!!editingDish}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setEditingDish(null)}
      >
        <Pressable style={styles.modalCenterOverlay} onPress={() => setEditingDish(null)}>
          <Pressable style={styles.modalCardBox} onPress={e => e.stopPropagation()}>
            <Text style={styles.modalHeaderTitle}>{t('Edit Price')}</Text>
            <Text style={styles.modalSubtitle} numberOfLines={1}>
              {editingDish?.name} • {t('Original')}: ₹{editingDish?.originalPrice ?? editingDish?.price ?? 0}
            </Text>

            <TextInput
              style={styles.priceInput}
              value={editPriceInput}
              onChangeText={t => setEditPriceInput(t.replace(/[^0-9.]/g, ''))}
              keyboardType="decimal-pad"
              placeholder={t('Enter customer price')}
              placeholderTextColor="#9CA3AF"
              autoFocus
            />

            <View style={styles.dialogActionRow}>
              <TouchableOpacity
                style={styles.dialogBtnNo}
                onPress={() => setEditingDish(null)}
                activeOpacity={0.8}
              >
                <Text style={styles.dialogBtnNoText}>{t('Cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.dialogBtnSave}
                onPress={() => {
                  if (editingDish) {
                    const newPrice = parseFloat(editPriceInput);
                    if (!isNaN(newPrice) && newPrice >= 0) {
                      const origPrice = editingDish.originalPrice ?? editingDish.price;
                      const isEdited = newPrice !== origPrice;
                      setSelectedItems(prev => prev.map(s => {
                        if (s.id === editingDish.id) {
                          return {
                            ...s,
                            price: newPrice,
                            originalPrice: origPrice,
                            isPriceEdited: isEdited,
                          };
                        }
                        return s;
                      }));
                      setEditingDish(null);
                    }
                  }
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.dialogBtnSaveText}>{t('Save')}</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* DELETE CONFIRMATION DIALOG */}
      <Modal
        visible={!!deletingDish}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setDeletingDish(null)}
      >
        <Pressable style={styles.modalCenterOverlay} onPress={() => setDeletingDish(null)}>
          <Pressable style={styles.modalCardBox} onPress={e => e.stopPropagation()}>
            <Text style={styles.modalHeaderTitle}>{t('Delete Selected Dish')}</Text>
            <Text style={[styles.modalSubtitle, { color: '#374151', marginBottom: 8 }]}>
              {t('Are you sure you want to delete "{name}"?', { name: deletingDish?.name || '' })}
            </Text>

            <View style={styles.dialogActionRow}>
              <TouchableOpacity
                style={styles.dialogBtnNo}
                onPress={() => setDeletingDish(null)}
                activeOpacity={0.8}
              >
                <Text style={styles.dialogBtnNoText}>{t('No')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.dialogBtnYes}
                onPress={() => {
                  if (deletingDish) {
                    setSelectedItems(prev => prev.filter(s => s.id !== deletingDish.id));
                    setDeletingDish(null);
                  }
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.dialogBtnYesText}>{t('Yes')}</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  
  /* TOP HEADER */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 8,
    gap: 6,
    zIndex: 100,
    width: '100%',
  },
  headerTitle: {
    fontSize: scaleFont(14.5),
    fontFamily: F.bold,
    color: '#FFFFFF',
    flexShrink: 1,
  },
  headerTitleTa: {
    fontSize: scaleFont(12),
  },
  secondHeaderRow: {
    paddingHorizontal: 12,
    paddingBottom: 8,
    paddingTop: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  
  /* SECTION DROPDOWN */
  dropdownWrap: {
    position: 'relative',
    zIndex: 200,
    flexShrink: 1,
    minWidth: 200,
    maxWidth: 300,
  },
  dropdownTrigger: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1E7DD',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  dropdownLabel: {
    fontSize: scaleFont(7.5),
    fontFamily: F.bold,
    color: '#065F46',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  dropdownValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
  },
  dropdownValueText: {
    fontSize: scaleFont(9.5),
    fontFamily: F.bold,
    color: '#111827',
    flexShrink: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
  },
  dropdownMenuModal: {
    position: 'absolute',
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 20,
    overflow: 'hidden',
  },
  dropdownScrollView: {
    flexGrow: 0,
  },
  dropdownScrollContent: {
    paddingVertical: 4,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  dropdownItemActive: {
    backgroundColor: '#F0FDF4',
  },
  dropdownItemIcon: {
    fontSize: 14,
  },
  dropdownItemText: {
    flex: 1,
    fontSize: scaleFont(10),
    fontFamily: F.medium,
    color: '#374151',
  },
  dropdownItemTextActive: {
    fontFamily: F.bold,
    color: '#065F46',
  },
  dropdownItemBadge: {
    backgroundColor: '#D1FAE5',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  dropdownItemBadgeText: {
    fontSize: scaleFont(8),
    fontFamily: F.bold,
    color: '#065F46',
  },
  dropdownCheck: {
    fontSize: 12,
    fontFamily: F.bold,
    color: '#1B4332',
  },

  /* HEADER META & REVIEW BUTTON */
  headerMeta: { flexDirection: 'row', gap: 4, overflow: 'hidden', alignItems: 'center', flexShrink: 0 },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  vegBadgePill: {
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  nonVegBadgePill: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  metaPillText: { fontSize: scaleFont(8.5), fontFamily: F.regular, color: '#374151', flexShrink: 1 },
  vegPillText: { fontSize: scaleFont(8.5), fontFamily: F.bold, color: '#166534' },
  nonVegPillText: { fontSize: scaleFont(8.5), fontFamily: F.bold, color: '#991B1B' },

  reviewBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexShrink: 0,
    minHeight: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reviewBtnText: { fontSize: scaleFont(9.5), fontFamily: F.bold, color: '#1B5E20' },

  /* DATE BANNER */
  dateBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.15)',
  },
  dateBannerText: { fontSize: scaleFont(9.5), fontFamily: F.regular, color: '#FFFFFF' },
  dateBannerBold: { fontFamily: F.bold, color: '#FFFFFF' },
  dateBannerProgress: { fontSize: scaleFont(9.5), fontFamily: F.bold, color: '#FFFFFF' },

  /* 2-COLUMN LAYOUT */
  twoColumnRow: { flex: 1, flexDirection: 'row', width: '100%' },

  /* LEFT PANEL: YOUR SELECTED MENU */
  leftHalfPanel: {
    flex: 1,
    backgroundColor: '#fff',
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
    overflow: 'hidden',
  },
  panelHeaderLeft: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  panelTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  panelTitleText: {
    fontSize: scaleFont(10.5),
    fontFamily: F.bold,
    color: '#111827',
    flexShrink: 1,
  },
  sectionCountBadge: {
    backgroundColor: '#1B4332',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  sectionCountBadgeText: {
    fontSize: scaleFont(8.5),
    fontFamily: F.bold,
    color: '#fff',
  },
  panelSubText: {
    fontSize: scaleFont(8.5),
    fontFamily: F.regular,
    color: '#6B7280',
    marginTop: 2,
  },
  panelScrollContent: {
    padding: 8,
    paddingBottom: 20,
  },
  selectedDishCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 6,
    marginBottom: 6,
    gap: 8,
    width: '100%',
  },
  selectedDishImg: {
    width: 36,
    height: 36,
    borderRadius: 6,
    flexShrink: 0,
  },
  selectedDishInfo: {
    flex: 1,
    overflow: 'hidden',
  },
  selectedDishName: {
    fontSize: scaleFont(9.5),
    fontFamily: F.bold,
    color: '#1B4332',
  },
  selectedDishPrice: {
    fontSize: scaleFont(8.5),
    fontFamily: F.semibold,
    color: '#059669',
    marginTop: 1,
  },
  removeDishBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },

  leftColumnFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0FDF4',
    borderTopWidth: 1,
    borderTopColor: '#BBF7D0',
    paddingHorizontal: 6,
    paddingVertical: 6,
    minHeight: 38,
  },

  /* BOTTOM SUMMARY BAR STYLES */
  bottomSummaryBar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 8,
    zIndex: 90,
    width: '100%',
  },
  summaryBarInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
    paddingVertical: 6,
    gap: 4,
    width: '100%',
  },
  summaryTabCard: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 5,
    paddingHorizontal: 2,
    borderRadius: 8,
    borderWidth: 1.5,
    gap: 2,
  },
  summaryTabTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  summaryTabCardActive: {
    backgroundColor: '#F0FDF4',
    borderColor: '#86EFAC',
  },
  summaryTabCardInactive: {
    backgroundColor: '#F9FAFB',
    borderColor: '#E5E7EB',
  },
  summaryTabIcon: {
    fontSize: 13,
  },
  summaryTabLabel: {
    fontSize: scaleFont(8.5),
    fontFamily: F.bold,
    textAlign: 'center',
  },
  summaryTabLabelActive: {
    color: '#166534',
  },
  summaryTabLabelInactive: {
    color: '#374151',
  },
  summaryTabCountText: {
    fontSize: scaleFont(7.5),
    fontFamily: F.medium,
    textAlign: 'center',
  },
  summaryTabCountTextActive: {
    color: '#15803D',
  },
  summaryTabCountTextInactive: {
    color: '#6B7280',
  },
  summaryTotalTextWrap: {
    flex: 1,
    flexShrink: 1,
    alignItems: 'flex-start',
    marginRight: 4,
  },
  summaryTotalLabel: {
    fontSize: scaleFont(7),
    fontFamily: F.bold,
    color: '#065F46',
    textTransform: 'uppercase',
    letterSpacing: 0.2,
  },
  summaryTotalValue: {
    fontSize: scaleFont(11.5),
    fontFamily: F.extrabold,
    color: '#1B4332',
  },
  summaryClearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FFEDD5',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 6,
    flexShrink: 0,
  },
  summaryClearText: {
    fontSize: scaleFont(8.5),
    fontFamily: F.bold,
    color: '#EA580C',
    includeFontPadding: false,
    textAlignVertical: 'center',
    flexShrink: 0,
  },

  /* RIGHT PANEL: AVAILABLE ITEMS */
  rightHalfPanel: {
    flex: 1,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  panelHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: '#F0FDF4',
    borderBottomWidth: 1,
    borderBottomColor: '#BBF7D0',
  },
  rightHeaderTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
    flexShrink: 1,
  },
  rightHeaderTitle: {
    fontSize: scaleFont(10),
    fontFamily: F.bold,
    color: '#111827',
    flexShrink: 1,
  },
  availDishCountBadge: {
    backgroundColor: '#D1FAE5',
    borderRadius: 12,
    paddingHorizontal: 5,
    paddingVertical: 2,
    flexShrink: 0,
  },
  availDishCountText: {
    fontSize: scaleFont(8.5),
    fontFamily: F.bold,
    color: '#065F46',
  },
  rightHeaderActionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerIconButton: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerIconButtonActive: {
    backgroundColor: '#1B4332',
    borderColor: '#1B4332',
  },

  /* SEARCH BOX */
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 8,
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    paddingHorizontal: 8,
    height: 36,
    gap: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: scaleFont(10),
    fontFamily: F.regular,
    color: '#111827',
    padding: 0,
  },

  /* ADD NEW DISH FORM */
  addDishForm: {
    backgroundColor: '#F0FDF4',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    padding: 12,
    marginBottom: 10,
    gap: 6,
  },
  addDishFormTitle: {
    fontSize: scaleFont(11),
    fontFamily: F.bold,
    color: '#1B4332',
    marginBottom: 2,
  },
  addDishError: {
    fontSize: scaleFont(8.5),
    fontFamily: F.regular,
    color: '#EF4444',
  },
  inputLabel: {
    fontSize: scaleFont(8.5),
    fontFamily: F.semibold,
    color: '#374151',
    marginTop: 2,
  },
  addDishCategoryBanner: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    width: '100%',
  },
  addDishCategoryText: {
    fontSize: scaleFont(10),
    fontFamily: F.bold,
    color: '#1B4332',
  },
  addDishInputWrap: {
    width: '100%',
  },
  addDishInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 0,
    height: 40,
    fontSize: scaleFont(10),
    fontFamily: F.regular,
    color: '#111827',
    textAlignVertical: 'center',
  },
  categoryButtonsRow: {
    flexDirection: 'row',
    gap: 4,
  },
  categoryBtn: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryBtnActive: {
    backgroundColor: '#1B4332',
    borderColor: '#1B4332',
  },
  categoryBtnText: {
    fontSize: scaleFont(8.5),
    fontFamily: F.medium,
    color: '#374151',
    textAlign: 'center',
  },
  categoryBtnTextActive: {
    fontFamily: F.bold,
    color: '#fff',
  },
  addDishSaveBtn: {
    backgroundColor: '#1B4332',
    borderRadius: 8,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
  },
  addDishSaveBtnText: {
    fontSize: scaleFont(10.5),
    fontFamily: F.bold,
    color: '#fff',
  },

  /* EMPTY STATE */
  emptyWrap: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: scaleFont(10),
    fontFamily: F.medium,
    color: '#6B7280',
    textAlign: 'center',
  },
  emptySubText: {
    fontSize: scaleFont(9),
    fontFamily: F.regular,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 4,
  },

  /* AVAILABLE DISH LIST & ROW CARD */
  availDishList: {
    flexDirection: 'column',
    gap: 6,
    paddingTop: 4,
  },
  dishRowCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 6,
    gap: 8,
  },
  dishRowCardSelected: {
    backgroundColor: '#1B5E20',
    borderColor: '#1B5E20',
  },
  dishRowImage: {
    width: 36,
    height: 36,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
    flexShrink: 0,
  },
  dishRowName: {
    flex: 1,
    fontSize: scaleFont(9.5),
    fontFamily: F.bold,
    color: '#111827',
  },
  dishRowNameSelected: {
    color: '#FFFFFF',
  },
  dishRowCheckBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  dishMenuBtn: {
    width: 24,
    height: 24,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  editedTag: {
    fontSize: scaleFont(8),
    fontFamily: F.bold,
    color: '#D97706',
  },
  modalCenterOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCardBox: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeaderTitle: {
    fontSize: scaleFont(12.5),
    fontFamily: F.bold,
    color: '#111827',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: scaleFont(9.5),
    fontFamily: F.regular,
    color: '#6B7280',
    marginBottom: 12,
  },
  dishOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    gap: 10,
  },
  dishOptionRowText: {
    fontSize: scaleFont(11),
    fontFamily: F.semibold,
    color: '#111827',
  },
  dishOptionDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 2,
  },
  dialogActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 14,
  },
  dialogBtnNo: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  dialogBtnNoText: {
    fontSize: scaleFont(10),
    fontFamily: F.semibold,
    color: '#374151',
  },
  dialogBtnYes: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#EF4444',
  },
  dialogBtnYesText: {
    fontSize: scaleFont(10),
    fontFamily: F.bold,
    color: '#FFFFFF',
  },
  dialogBtnSave: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#1B4332',
  },
  dialogBtnSaveText: {
    fontSize: scaleFont(10),
    fontFamily: F.bold,
    color: '#FFFFFF',
  },
  priceInput: {
    height: 40,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: scaleFont(11),
    fontFamily: F.regular,
    color: '#111827',
    backgroundColor: '#F9FAFB',
  },
});
