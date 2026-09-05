import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  TextInput, ActivityIndicator, Alert, Platform, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronDown, ChevronUp, Plus, Trash2, Check, Leaf, Drumstick } from 'lucide-react-native';
import { collection, addDoc, doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import KeyboardAwareScrollView from '@/components/KeyboardAwareScrollView';
import { F, scaleFont } from '@/utils/fonts';
import { T } from '@/utils/typography';
import { MenuCategory } from '@/types';
import { DEFAULT_VEG_CATEGORIES, DEFAULT_NON_VEG_CATEGORIES } from '@/utils/categories';

const MEAL_TYPES = [
  { key: 'breakfast', label: 'Breakfast', icon: '🌅' },
  { key: 'lunch',     label: 'Lunch',     icon: '☀️' },
  { key: 'dinner',    label: 'Dinner',    icon: '🌙' },
  { key: 'snacks',    label: 'Snacks',    icon: '☕' },
];

interface DishEntry {
  id: string;
  name: string;
  price: string;
  meal_type: string;
  meal_category: string;
  categoryType: 'veg' | 'nonVeg';
  menu_type: 'veg' | 'non_veg';
}

function genId() { return Math.random().toString(36).slice(2, 10); }

export default function SetupMenuScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const setupDishNameRef = useRef<TextInput>(null);
  const setupDishPriceRef = useRef<TextInput>(null);

  const [activeTab, setActiveTab] = useState<'veg' | 'nonVeg'>('veg');
  const [categories] = useState<MenuCategory[]>([
    ...DEFAULT_VEG_CATEGORIES,
    ...DEFAULT_NON_VEG_CATEGORIES,
  ]);

  const [expandedMeal, setExpandedMeal] = useState<string>('lunch');
  const [dishes, setDishes] = useState<DishEntry[]>([]);
  const [saving, setSaving] = useState(false);

  // Inline add dish state per meal+category
  const [addingIn, setAddingIn] = useState<{ meal: string; catName: string; categoryType: 'veg' | 'nonVeg' } | null>(null);
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState('');

  const currentCategories = categories.filter(c => c.categoryType === activeTab);

  const getDishes = (meal: string, catName: string, catType: 'veg' | 'nonVeg') =>
    dishes.filter(d => d.meal_type === meal && d.meal_category === catName && d.categoryType === catType);

  const startAddingDish = (meal: string, catName: string, categoryType: 'veg' | 'nonVeg') => {
    setAddingIn({ meal, catName, categoryType });
    setNewName('');
    setNewPrice('');
  };

  const addDish = () => {
    if (!newName.trim() || !addingIn) return;
    const dish: DishEntry = {
      id: genId(),
      name: newName.trim(),
      price: newPrice.trim(),
      meal_type: addingIn.meal,
      meal_category: addingIn.catName,
      categoryType: addingIn.categoryType,
      menu_type: addingIn.categoryType === 'veg' ? 'veg' : 'non_veg',
    };
    setDishes(prev => [...prev, dish]);
    setNewName('');
    setNewPrice('');
    setAddingIn(null);
  };

  const removeDish = (id: string) => {
    setDishes(prev => prev.filter(d => d.id !== id));
  };

  const totalDishes = dishes.length;

  const handleSkip = async () => {
    if (user) {
      try {
        await setDoc(doc(db, 'profiles', user.uid), {
          onboardingCompleted: true,
          updated_at: new Date().toISOString(),
        }, { merge: true });
      } catch (err) {
        console.error('Error setting onboarding completed on skip:', err);
      }
    }
    router.replace('/(tabs)/dashboard');
  };

  const handleSaveAndContinue = async () => {
    if (!user) return;
    if (dishes.length === 0) {
      Alert.alert(
        'No dishes added',
        'You can skip this step and add dishes later from the Dishes tab.',
        [
          { text: 'Skip for now', onPress: handleSkip },
          { text: 'Add dishes', style: 'cancel' },
        ]
      );
      return;
    }
    setSaving(true);
    try {
      await setDoc(doc(db, 'profiles', user.uid), {
        onboardingCompleted: true,
        updated_at: new Date().toISOString(),
      }, { merge: true });

      // Save custom categories if any exist
      const customCats = categories.filter(c => !c.id.startsWith('def_'));
      if (customCats.length > 0) {
        await Promise.all(
          customCats.map(cat =>
            addDoc(collection(db, 'categories'), {
              user_id: user.uid,
              name: cat.name,
              categoryType: cat.categoryType,
              created_at: new Date().toISOString(),
            })
          )
        );
      }

      // Save dishes
      await Promise.all(
        dishes.map(dish =>
          addDoc(collection(db, 'menu_items'), {
            user_id: user.uid,
            name: dish.name,
            menu_type: dish.menu_type,
            categoryType: dish.categoryType,
            meal_type: dish.meal_type,
            meal_category: dish.meal_category,
            price: parseFloat(dish.price) || 0,
            description: null,
            image_url: null,
            is_active: true,
            created_at: new Date().toISOString(),
          })
        )
      );
      router.replace('/(tabs)/dashboard');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save dishes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header with Dashboard dark green background */}
      <LinearGradient colors={['#1B5E20', '#2E7D32']} style={styles.header}>
        <View style={styles.logoRow}>
          <View style={styles.logoBox}><Text style={styles.logoIcon}>🍽</Text></View>
          <Text style={styles.logoText}>CaterEase</Text>
        </View>
        <View style={styles.stepRow}>
          {[1, 2, 3, 4].map(s => (
            <View key={s} style={[styles.stepDot, s <= 4 && styles.stepDotActive, s === 4 && styles.stepDotCurrent]}>
              <Text style={[styles.stepDotText, s <= 4 && styles.stepDotTextActive, s === 4 && styles.stepDotTextCurrent]}>{s}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.title}>Set Up Your Menu 🍴</Text>
        <Text style={styles.subtitle}>
          Organize your dishes separately by Vegetarian and Non-Vegetarian categories.
        </Text>
        {totalDishes > 0 && (
          <View style={styles.countBadge}>
            <Check size={12} color="#065F46" />
            <Text style={styles.countBadgeText}>{totalDishes} dish{totalDishes > 1 ? 'es' : ''} added</Text>
          </View>
        )}
      </LinearGradient>

      <KeyboardAwareScrollView disableKeyboardAvoidingView contentContainerStyle={styles.scroll}>

        {/* Veg / Non-Veg Section Toggle */}
        <View style={styles.sectionToggleRow}>
          <TouchableOpacity
            style={[styles.sectionToggleBtn, activeTab === 'veg' && styles.sectionToggleBtnActiveVeg]}
            onPress={() => setActiveTab('veg')}
            activeOpacity={0.8}
          >
            <Leaf size={16} color={activeTab === 'veg' ? '#fff' : '#16A34A'} />
            <Text
              style={[styles.sectionToggleText, activeTab === 'veg' && styles.sectionToggleTextActive]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              Pure Veg Menu
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sectionToggleBtn, activeTab === 'nonVeg' && styles.sectionToggleBtnActiveNonVeg]}
            onPress={() => setActiveTab('nonVeg')}
            activeOpacity={0.8}
          >
            <Drumstick size={16} color={activeTab === 'nonVeg' ? '#fff' : '#DC2626'} />
            <Text
              style={[styles.sectionToggleText, activeTab === 'nonVeg' && styles.sectionToggleTextActive]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              Non-Veg Menu
            </Text>
          </TouchableOpacity>
        </View>

        {/* Meals Loop */}
        {MEAL_TYPES.map(meal => {
          const isExpanded = expandedMeal === meal.key;
          const mealDishes = dishes.filter(d => d.meal_type === meal.key && d.categoryType === activeTab);

          return (
            <View key={meal.key} style={styles.mealCard}>
              <TouchableOpacity
                style={[styles.mealHeader, isExpanded && styles.mealHeaderExpanded]}
                onPress={() => setExpandedMeal(isExpanded ? '' : meal.key)}
              >
                <Text style={styles.mealIcon}>{meal.icon}</Text>
                <Text style={styles.mealLabel}>{meal.label}</Text>
                {mealDishes.length > 0 && (
                  <View style={styles.mealBadge}>
                    <Text style={styles.mealBadgeText}>{mealDishes.length}</Text>
                  </View>
                )}
                {isExpanded
                  ? <ChevronUp size={16} color="#1B4332" />
                  : <ChevronDown size={16} color="#9CA3AF" />
                }
              </TouchableOpacity>

              {isExpanded && (
                <View style={styles.mealBody}>
                  {currentCategories.map(cat => {
                    const catDishes = getDishes(meal.key, cat.name, activeTab);
                    const isAddingHere = addingIn?.meal === meal.key && addingIn?.catName === cat.name && addingIn?.categoryType === activeTab;

                    return (
                      <View key={cat.id || cat.name} style={styles.subCatBlock}>
                        <View style={styles.subCatHeader}>
                          <Text style={styles.subCatLabel}>{cat.name}</Text>
                          {catDishes.length > 0 && (
                            <View style={styles.subBadge}>
                              <Text style={styles.subBadgeText}>{catDishes.length}</Text>
                            </View>
                          )}
                        </View>

                        <View style={styles.subCatBody}>
                          {catDishes.map(dish => (
                            <View key={dish.id} style={styles.dishRow}>
                              <View style={[styles.dishDot, activeTab === 'nonVeg' && { backgroundColor: '#DC2626' }]} />
                              <Text style={styles.dishName} numberOfLines={1}>{dish.name}</Text>
                              {dish.price ? (
                                <Text style={styles.dishPrice}>₹{dish.price}</Text>
                              ) : null}
                              <TouchableOpacity onPress={() => removeDish(dish.id)} style={styles.deleteBtn}>
                                <Trash2 size={13} color="#DC2626" />
                              </TouchableOpacity>
                            </View>
                          ))}

                          {isAddingHere ? (
                            <View style={styles.addForm}>
                              <Text style={styles.inheritsBadge}>
                                Automatically inherits {activeTab === 'veg' ? '🥗 Veg' : '🍗 Non-Veg'} classification
                              </Text>
                              <TextInput
                                ref={setupDishNameRef}
                                style={styles.addInput}
                                placeholder="Dish name *"
                                placeholderTextColor="#9CA3AF"
                                value={newName}
                                onChangeText={setNewName}
                                autoFocus
                                autoCapitalize="words"
                                returnKeyType="next"
                                onSubmitEditing={() => setupDishPriceRef.current?.focus()}
                                blurOnSubmit={false}
                                multiline={false}
                                scrollEnabled={false}
                              />
                              <TextInput
                                ref={setupDishPriceRef}
                                style={styles.addInput}
                                placeholder="Price per plate (₹)"
                                placeholderTextColor="#9CA3AF"
                                value={newPrice}
                                onChangeText={t => setNewPrice(t.replace(/[^0-9.]/g, ''))}
                                keyboardType="decimal-pad"
                                returnKeyType="done"
                                onSubmitEditing={addDish}
                                multiline={false}
                                scrollEnabled={false}
                              />
                              <View style={styles.addFormBtns}>
                                <TouchableOpacity
                                  style={styles.addCancelBtn}
                                  onPress={() => setAddingIn(null)}
                                >
                                  <Text style={styles.addCancelText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                  style={[styles.addConfirmBtn, !newName.trim() && { opacity: 0.4 }]}
                                  onPress={addDish}
                                  disabled={!newName.trim()}
                                >
                                  <Text style={styles.addConfirmText}>Add Dish</Text>
                                </TouchableOpacity>
                              </View>
                            </View>
                          ) : (
                            <TouchableOpacity
                              style={styles.addDishBtn}
                              onPress={() => startAddingDish(meal.key, cat.name, activeTab)}
                            >
                              <Plus size={13} color="#1B4332" />
                              <Text style={styles.addDishBtnText}>Add {cat.name} dish</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          );
        })}
      </KeyboardAwareScrollView>

      {/* Bottom actions - fixed position docked to bottom */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <TouchableOpacity
          style={styles.skipBtn}
          onPress={handleSkip}
        >
          <Text style={styles.skipBtnText}>Skip for now</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.saveBtn, saving && { opacity: 0.7 }]}
          onPress={handleSaveAndContinue}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveBtnText}>
              {totalDishes > 0 ? `Save ${totalDishes} Dish${totalDishes > 1 ? 'es' : ''} & Go to Dashboard →` : 'Go to Dashboard →'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', position: 'relative' },

  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  logoBox: { width: 36, height: 36, backgroundColor: 'rgba(255, 255, 255, 0.2)', borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  logoIcon: { fontSize: 16 },
  logoText: { fontSize: 15.5, fontWeight: '700', color: '#FFFFFF' },
  stepRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  stepDot: { width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(255, 255, 255, 0.2)', justifyContent: 'center', alignItems: 'center' },
  stepDotActive: { backgroundColor: '#A7F3D0' },
  stepDotCurrent: { backgroundColor: '#FFFFFF' },
  stepDotText: { fontSize: 9.5, fontWeight: '700', color: 'rgba(255, 255, 255, 0.7)' },
  stepDotTextActive: { color: '#065F46' },
  stepDotTextCurrent: { color: '#1B4332' },

  title: { fontSize: scaleFont(16.5), fontWeight: '800', color: '#FFFFFF', marginTop: 14, marginBottom: 4 },
  subtitle: { fontSize: scaleFont(10.5), color: '#E8F5E9', lineHeight: 16 },
  countBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 10, backgroundColor: '#D1FAE5', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, alignSelf: 'flex-start' },
  countBadgeText: { fontSize: 11.5, fontWeight: '700', color: '#065F46' },

  scroll: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 140 },

  sectionToggleRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  sectionToggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    minHeight: 44,
  },
  sectionToggleBtnActiveVeg: { backgroundColor: '#16A34A', borderColor: '#16A34A' },
  sectionToggleBtnActiveNonVeg: { backgroundColor: '#DC2626', borderColor: '#DC2626' },
  sectionToggleText: { fontSize: 11.5, fontWeight: '600', color: '#4B5563', textAlign: 'center' },
  sectionToggleTextActive: { color: '#fff', fontWeight: '700' },

  addCategoryBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 14, backgroundColor: '#E8F5E9', borderRadius: 10, borderWidth: 1, borderColor: '#C8E6C9', marginBottom: 14 },
  addCategoryBannerText: { fontSize: 11.5, fontWeight: '700', color: '#1B4332' },

  mealCard: { marginBottom: 10, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 14, overflow: 'hidden' },
  mealHeader: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10, backgroundColor: '#F9FAFB' },
  mealHeaderExpanded: { backgroundColor: '#F0FDF4', borderBottomWidth: 1, borderBottomColor: '#D1FAE5' },
  mealIcon: { fontSize: 19 },
  mealLabel: { flex: 1, fontSize: 14, fontWeight: '700', color: '#111827' },
  mealBadge: { backgroundColor: '#1B4332', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  mealBadgeText: { fontSize: 10.5, fontWeight: '700', color: '#fff' },
  mealBody: { backgroundColor: '#fff' },

  subCatBlock: { borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  subCatHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, gap: 8 },
  subCatLabel: { flex: 1, fontSize: 11.5, fontWeight: '700', color: '#374151' },
  subBadge: { backgroundColor: '#F0FDF4', borderRadius: 20, paddingHorizontal: 7, paddingVertical: 1 },
  subBadgeText: { fontSize: 9.5, fontWeight: '700', color: '#1B4332' },
  subCatBody: { paddingHorizontal: 14, paddingBottom: 10 },

  dishRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: '#F9FAFB', gap: 8 },
  dishDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#16A34A', flexShrink: 0 },
  dishName: { flex: 1, fontSize: 11.5, fontWeight: '500', color: '#374151' },
  dishPrice: { fontSize: 11.5, fontWeight: '700', color: '#1B4332' },
  deleteBtn: { width: 28, height: 28, justifyContent: 'center', alignItems: 'center' },

  addForm: { backgroundColor: '#F9FAFB', borderRadius: 10, padding: 10, marginTop: 6, gap: 8 },
  inheritsBadge: { fontSize: 9.5, fontWeight: '600', color: '#059669', fontStyle: 'italic' },
  addInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    height: Platform.OS === 'android' ? 46 : 42,
    fontSize: 12.5,
    color: '#111827',
    width: '100%',
    textAlignVertical: 'center',
  },
  addFormBtns: { flexDirection: 'row', gap: 8 },
  addCancelBtn: { flex: 1, height: 38, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8 },
  addCancelText: { fontSize: 11.5, fontWeight: '600', color: '#6B7280' },
  addConfirmBtn: { flex: 2, height: 38, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1B4332', borderRadius: 8 },
  addConfirmText: { fontSize: 11.5, fontWeight: '700', color: '#fff' },

  addDishBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 4 },
  addDishBtnText: { fontSize: 11.5, color: '#1B4332', fontWeight: '600' },

  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    backgroundColor: '#fff',
    gap: 10,
    zIndex: 10,
  },
  skipBtn: { height: 44, justifyContent: 'center', alignItems: 'center' },
  skipBtnText: { fontSize: 12.5, color: '#9CA3AF', fontWeight: '500' },
  saveBtn: { backgroundColor: '#1B4332', borderRadius: 12, height: 52, justifyContent: 'center', alignItems: 'center' },
  saveBtnText: { fontSize: 13.5, fontWeight: '700', color: '#fff' },
});