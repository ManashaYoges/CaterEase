import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Plus, Leaf, Drumstick, Edit3, Trash2 } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { collection, getDocs, query, where, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { MenuItem, MenuCategory } from '@/types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { F, scaleFont } from '@/utils/fonts';
import { T } from '@/utils/typography';
import { fetchUserCategories, matchesCategory } from '@/utils/categories';

const MEAL_TYPES = [
  { key: 'breakfast', label: 'Breakfast' },
  { key: 'lunch',     label: 'Lunch' },
  { key: 'dinner',    label: 'Dinner' },
  { key: 'snacks',    label: 'Snacks' },
];

export default function DishesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();

  const [menuType, setMenuType] = useState<'veg' | 'non_veg'>('veg');
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [expandedMeals, setExpandedMeals] = useState<Record<string, boolean>>({
    breakfast: true,
    lunch: true,
    dinner: true,
    snacks: true,
  });

  const loadData = async () => {
    if (!user) return;
    try {
      const [cats, dishSnap] = await Promise.all([
        fetchUserCategories(user.uid),
        getDocs(
          query(collection(db, 'menu_items'),
            where('user_id', '==', user.uid),
            where('is_active', '==', true)
          )
        ),
      ]);
      setCategories(cats);
      setItems(dishSnap.docs.map(d => ({ id: d.id, ...d.data() })) as MenuItem[]);
    } catch (err) {
      console.error('Error loading dishes data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { loadData(); }, [user]));

  const toggleMeal = (key: string) =>
    setExpandedMeals(prev => ({ ...prev, [key]: !prev[key] }));

  // Target category type string
  const currentCategoryType: 'veg' | 'nonVeg' = menuType === 'veg' ? 'veg' : 'nonVeg';
  
  // Filtered categories for active tab
  const activeCategories = categories.filter(c => c.categoryType === currentCategoryType);

  // Filtered dishes for active tab
  const filteredDishes = items.filter(i => {
    const isVegMatch = menuType === 'veg'
      ? (i.menu_type === 'veg' || i.categoryType === 'veg')
      : (i.menu_type === 'non_veg' || i.categoryType === 'nonVeg');
    return isVegMatch;
  });

  const getDishesByMealAndCategory = (mealType: string, catName: string) =>
    filteredDishes.filter(i => {
      return i.meal_type === mealType && matchesCategory(i.meal_category, catName);
    });

  const getMealCount = (mealType: string) =>
    filteredDishes.filter(i => i.meal_type === mealType).length;

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
              setItems(prev => prev.filter(item => item.id !== id));
            } catch (err: any) {
              Alert.alert(t('Error'), err.message || 'Failed to delete dish');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient colors={['#1B5E20', '#2E7D32']} style={styles.topHeaderGradient}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: '#FFFFFF' }]}>{t('Dishes Catalog')}</Text>
          <View style={styles.headerBtns}>
            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: '#FFFFFF' }]}
              onPress={() => router.push(`/add-dish?menuType=${menuType}`)}
            >
              <Plus size={16} color="#1B5E20" />
              <Text style={[styles.addBtnText, { color: '#1B5E20' }]}>{t('Add Dish')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Veg / Non-Veg toggle */}
        <View style={styles.toggleRow}>
          <TouchableOpacity
            style={[styles.toggleBtn, menuType === 'veg' && styles.toggleBtnActiveVeg]}
            onPress={() => setMenuType('veg')}
          >
            <Leaf size={14} color={menuType === 'veg' ? '#16A34A' : '#FFFFFF'} />
            <Text style={[styles.toggleText, menuType === 'veg' && styles.toggleTextActiveVeg]}>{t('Pure Veg')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, menuType === 'non_veg' && styles.toggleBtnActiveNonVeg]}
            onPress={() => setMenuType('non_veg')}
          >
            <Drumstick size={14} color={menuType === 'non_veg' ? '#DC2626' : '#FFFFFF'} />
            <Text style={[styles.toggleText, menuType === 'non_veg' && styles.toggleTextActiveNonVeg]}>{t('Non-Veg')}</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#1B4332" />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />
          }
        >
          {MEAL_TYPES.map(meal => {
            const isExpanded = expandedMeals[meal.key] === true;
            const totalCount = getMealCount(meal.key);

            return (
              <View key={meal.key} style={styles.mealBlock}>
                <TouchableOpacity
                  style={styles.mealHeader}
                  onPress={() => toggleMeal(meal.key)}
                >
                  <View style={styles.mealHeaderLeft}>
                    <View style={[styles.mealDot, menuType === 'non_veg' && { backgroundColor: '#DC2626' }]} />
                    <Text style={styles.mealLabel}>{t(meal.label)}</Text>
                    <View style={[styles.countBadge, menuType === 'non_veg' && { backgroundColor: '#FEE2E2' }]}>
                      <Text style={[styles.countText, menuType === 'non_veg' && { color: '#991B1B' }]}>{totalCount}</Text>
                    </View>
                  </View>
                  <Text style={styles.chevron}>{isExpanded ? '▲' : '▼'}</Text>
                </TouchableOpacity>

                {isExpanded && (
                  <View style={styles.mealBody}>
                    {activeCategories.map(cat => {
                      const catItems = getDishesByMealAndCategory(meal.key, cat.name);
                      
                      return (
                        <View key={cat.id || cat.name} style={styles.categoryBlock}>
                          <View style={styles.categoryHeader}>
                            <Text style={styles.categoryLabel}>{t(cat.name)}</Text>
                            <Text style={styles.categoryCount}>{catItems.length}</Text>
                          </View>
                          {catItems.length === 0 ? (
                            <Text style={styles.emptyText}>
                              {menuType === 'veg' ? t('No Veg dishes in this category') : t('No Non-Veg dishes in this category')}
                            </Text>
                          ) : (
                            catItems.map(item => (
                              <View key={item.id} style={styles.dishRow}>
                                <View style={[
                                  styles.dishIndicator,
                                  menuType === 'non_veg' && { backgroundColor: '#DC2626' }
                                ]} />
                                <View style={styles.dishInfo}>
                                  <Text style={styles.dishName}>{item.name}</Text>
                                  {item.description ? (
                                    <Text style={styles.dishDesc}>{item.description}</Text>
                                  ) : null}
                                </View>
                                {item.price > 0 && (
                                  <Text style={styles.dishPrice}>₹{item.price}</Text>
                                )}
                                <View style={styles.dishActions}>
                                  <TouchableOpacity
                                    style={styles.actionIconBtn}
                                    onPress={() => router.push(`/edit-dish?id=${item.id}` as any)}
                                  >
                                    <Edit3 size={14} color="#6B7280" />
                                  </TouchableOpacity>
                                  <TouchableOpacity
                                    style={styles.actionIconBtn}
                                    onPress={() => handleDeleteDish(item.id, item.name)}
                                  >
                                    <Trash2 size={14} color="#EF4444" />
                                  </TouchableOpacity>
                                </View>
                              </View>
                            ))
                          )}
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  topHeaderGradient: { paddingBottom: 10 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255, 255, 255, 0.15)' },
  headerTitle: { ...T.pageTitle, color: '#FFFFFF' },
  headerBtns: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFFFFF', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
  addBtnText: { ...T.btnSm, color: '#1B5E20' },
  toggleRow: { flexDirection: 'row', marginHorizontal: 14, marginTop: 4, marginBottom: 8, backgroundColor: 'rgba(255, 255, 255, 0.18)', borderRadius: 10, padding: 3 },
  toggleBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, borderRadius: 8 },
  toggleBtnActiveVeg: { backgroundColor: '#FFFFFF' },
  toggleBtnActiveNonVeg: { backgroundColor: '#FFFFFF' },
  toggleText: { fontSize: scaleFont(11.5), fontFamily: F.medium, color: '#FFFFFF' },
  toggleTextActiveVeg: { color: '#16A34A', fontFamily: F.semibold },
  toggleTextActiveNonVeg: { color: '#DC2626', fontFamily: F.semibold },
  scroll: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 40 },
  mealBlock: { marginBottom: 10, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, overflow: 'hidden' },
  mealHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, backgroundColor: '#F9FAFB' },
  mealHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mealDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#16A34A' },
  mealLabel: { ...T.cardTitle, fontSize: scaleFont(12.5) },
  countBadge: { backgroundColor: '#D1FAE5', borderRadius: 16, paddingHorizontal: 6, paddingVertical: 2 },
  countText: { fontSize: scaleFont(9.5), fontFamily: F.medium, color: '#065F46' },
  chevron: { fontSize: scaleFont(8.5), color: '#9CA3AF' },
  mealBody: { paddingHorizontal: 12, paddingBottom: 10 },
  categoryBlock: { marginTop: 10 },
  categoryHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  categoryLabel: { ...T.labelSm, fontWeight: '700' },
  categoryCount: { ...T.caption },
  emptyText: { ...T.caption, fontStyle: 'italic', paddingLeft: 6, paddingVertical: 4 },
  dishRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 7, paddingHorizontal: 10, backgroundColor: '#fff', borderRadius: 8, marginBottom: 4, borderWidth: 1, borderColor: '#F3F4F6' },
  dishIndicator: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#16A34A' },
  dishInfo: { flex: 1 },
  dishName: { fontSize: scaleFont(11.5), fontFamily: F.regular, color: '#111827' },
  dishDesc: { ...T.description, marginTop: 1 },
  dishPrice: { ...T.price },
  dishActions: { flexDirection: 'row', gap: 4 },
  actionIconBtn: { width: 28, height: 28, justifyContent: 'center', alignItems: 'center', borderRadius: 6, backgroundColor: '#F9FAFB' },
});