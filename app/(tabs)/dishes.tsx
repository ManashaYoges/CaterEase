import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Plus, Leaf, Drumstick } from 'lucide-react-native';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { MenuItem } from '@/types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const MEAL_TYPES = [
  { key: 'breakfast', label: 'Breakfast' },
  { key: 'lunch',     label: 'Lunch' },
  { key: 'dinner',    label: 'Dinner' },
  { key: 'snacks',    label: 'Snacks' },
];

const MEAL_CATEGORIES = [
  { key: 'main',     label: 'Main Dishes' },
  { key: 'dessert',  label: 'Desserts & Sweets' },
  { key: 'beverage', label: 'Hot/Soft Beverages' },
];

export default function DishesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const [menuType, setMenuType] = useState<'veg' | 'non_veg'>('veg');
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedMeals, setExpandedMeals] = useState<Record<string, boolean>>({
    breakfast: true,
    lunch: true,
    dinner: true,
    snacks: true,
  });

  const load = async () => {
    if (!user) return;
    const snapshot = await getDocs(
      query(collection(db, 'menu_items'),
        where('user_id', '==', user.uid),
        where('is_active', '==', true)
      )
    );
    setItems(snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as MenuItem[]);
    setLoading(false);
    setRefreshing(false);
  };

  useFocusEffect(useCallback(() => { load(); }, [user]));

  const toggleMeal = (key: string) =>
    setExpandedMeals(prev => ({ ...prev, [key]: !prev[key] }));

  const filtered = items.filter(i => i.menu_type === menuType);

  // Default old dishes (no meal_category) to 'main'
  const getItems = (mealType: string, category: string) =>
    filtered.filter(i => {
      const itemCat = i.meal_category || 'main';
      return i.meal_type === mealType && itemCat === category;
    });

  const getMealCount = (mealType: string) =>
    filtered.filter(i => i.meal_type === mealType).length;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Dishes</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/add-dish')}>
          <Plus size={18} color="#fff" />
          <Text style={styles.addBtnText}>Add Dish</Text>
        </TouchableOpacity>
      </View>

      {/* Veg / Non-Veg toggle */}
      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[styles.toggleBtn, menuType === 'veg' && styles.toggleBtnActiveVeg]}
          onPress={() => setMenuType('veg')}
        >
          <Leaf size={14} color={menuType === 'veg' ? '#fff' : '#16A34A'} />
          <Text style={[styles.toggleText, menuType === 'veg' && styles.toggleTextActive]}>Pure Veg</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, menuType === 'non_veg' && styles.toggleBtnActiveNonVeg]}
          onPress={() => setMenuType('non_veg')}
        >
          <Drumstick size={14} color={menuType === 'non_veg' ? '#fff' : '#DC2626'} />
          <Text style={[styles.toggleText, menuType === 'non_veg' && styles.toggleTextActive]}>Non-Veg</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#1B4332" />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />
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
                    <View style={styles.mealDot} />
                    <Text style={styles.mealLabel}>{meal.label}</Text>
                    <View style={styles.countBadge}>
                      <Text style={styles.countText}>{totalCount}</Text>
                    </View>
                  </View>
                  <Text style={styles.chevron}>{isExpanded ? '▲' : '▼'}</Text>
                </TouchableOpacity>

                {isExpanded && (
                  <View style={styles.mealBody}>
                    {MEAL_CATEGORIES.map(cat => {
                      const catItems = getItems(meal.key, cat.key);
                      // Hide empty dessert/beverage sections to reduce clutter
                      if (catItems.length === 0 && cat.key !== 'main') return null;
                      return (
                        <View key={cat.key} style={styles.categoryBlock}>
                          <View style={styles.categoryHeader}>
                            <Text style={styles.categoryLabel}>{cat.label}</Text>
                            <Text style={styles.categoryCount}>{catItems.length}</Text>
                          </View>
                          {catItems.length === 0 ? (
                            <Text style={styles.emptyText}>No dishes yet</Text>
                          ) : (
                            catItems.map(item => (
                              <View key={item.id} style={styles.dishRow}>
                                <View style={[
                                  styles.dishIndicator,
                                  cat.key === 'dessert'  && styles.dishIndicatorDessert,
                                  cat.key === 'beverage' && styles.dishIndicatorBeverage,
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#111827' },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#1B4332', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9 },
  addBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  toggleRow: { flexDirection: 'row', margin: 16, backgroundColor: '#F3F4F6', borderRadius: 12, padding: 4 },
  toggleBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10 },
  toggleBtnActiveVeg: { backgroundColor: '#16A34A' },
  toggleBtnActiveNonVeg: { backgroundColor: '#DC2626' },
  toggleText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  toggleTextActive: { color: '#fff' },
  scroll: { paddingHorizontal: 16, paddingBottom: 40 },
  mealBlock: { marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 14, overflow: 'hidden' },
  mealHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, backgroundColor: '#F9FAFB' },
  mealHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mealDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#1B4332' },
  mealLabel: { fontSize: 15, fontWeight: '700', color: '#111827' },
  countBadge: { backgroundColor: '#D1FAE5', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  countText: { fontSize: 12, fontWeight: '700', color: '#065F46' },
  chevron: { fontSize: 10, color: '#9CA3AF' },
  mealBody: { paddingHorizontal: 14, paddingBottom: 12 },
  categoryBlock: { marginTop: 12 },
  categoryHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  categoryLabel: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  categoryCount: { fontSize: 12, color: '#9CA3AF' },
  emptyText: { fontSize: 12, color: '#D1D5DB', fontStyle: 'italic', paddingLeft: 8, paddingVertical: 4 },
  dishRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, paddingHorizontal: 10, backgroundColor: '#fff', borderRadius: 8, marginBottom: 4, borderWidth: 1, borderColor: '#F3F4F6' },
  dishIndicator: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#1B4332' },
  dishIndicatorDessert: { backgroundColor: '#F59E0B' },
  dishIndicatorBeverage: { backgroundColor: '#3B82F6' },
  dishInfo: { flex: 1 },
  dishName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  dishDesc: { fontSize: 12, color: '#6B7280', marginTop: 1 },
  dishPrice: { fontSize: 13, fontWeight: '700', color: '#1B4332' },
});