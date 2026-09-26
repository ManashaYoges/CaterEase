import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Leaf, Drumstick } from 'lucide-react-native';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { getDishDisplayName, getEnglishDishName } from '@/utils/translations';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import KeyboardAwareScrollView from '@/components/KeyboardAwareScrollView';
import { F, scaleFont } from '@/utils/fonts';
import { T } from '@/utils/typography';
import { fetchUserCategories } from '@/utils/categories';
import { MenuCategory } from '@/types';

const MEAL_TYPES = [
  { key: 'breakfast', label: 'Breakfast' },
  { key: 'lunch',     label: 'Lunch' },
  { key: 'dinner',    label: 'Dinner' },
  { key: 'snacks',    label: 'Snacks' },
];

export default function AddDishScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ menuType?: string; category?: string }>();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { t, language } = useLanguage();

  const nameRef = useRef<TextInput>(null);
  const priceRef = useRef<TextInput>(null);
  const descriptionRef = useRef<TextInput>(null);

  const initialMenuType = params.menuType === 'non_veg' ? 'non_veg' : 'veg';
  const [menuType, setMenuType] = useState<'veg' | 'non_veg'>(initialMenuType);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  const [name, setName] = useState('');
  const [mealType, setMealType] = useState('lunch');
  const [mealCategory, setMealCategory] = useState(params.category || '');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    async function loadCats() {
      if (!user) return;
      const cats = await fetchUserCategories(user.uid);
      setCategories(cats);
      setLoadingCategories(false);

      const matching = cats.filter(c =>
        initialMenuType === 'veg' ? c.categoryType === 'veg' : c.categoryType === 'nonVeg'
      );
      if (matching.length > 0 && !params.category) {
        setMealCategory(matching[0].name);
      }
    }
    loadCats();
  }, [user]);

  const targetCategoryType: 'veg' | 'nonVeg' = menuType === 'veg' ? 'veg' : 'nonVeg';
  const availableCategories = categories.filter(c => c.categoryType === targetCategoryType);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = t('Dish name is required');
    if (!mealCategory) e.category = t('Category is required');
    return e;
  };

  const handleSave = async () => {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    if (!user) return;
    setSaving(true);
    try {
      const trimmed = name.trim();
      const tamilName = language === 'ta' ? trimmed : getDishDisplayName(trimmed, 'ta');
      const englishName = language === 'ta' ? getEnglishDishName(trimmed) : trimmed;

      await addDoc(collection(db, 'menu_items'), {
        user_id: user.uid,
        name: englishName,
        name_ta: tamilName,
        menu_type: menuType,
        categoryType: targetCategoryType,
        meal_type: mealType,
        meal_category: mealCategory,
        price: parseFloat(price) || 0,
        description: description.trim() || null,
        image_url: null,
        is_active: true,
        created_at: new Date().toISOString(),
      });
      router.back();
    } catch (err: any) {
      setErrors({ general: err.message || 'Failed to save dish' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={18} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('Add New Dish')}</Text>
        <View style={{ width: 36 }} />
      </View>

      <KeyboardAwareScrollView contentContainerStyle={styles.scroll}>
        {errors.general ? <Text style={styles.errorText}>{errors.general}</Text> : null}

        {/* Inherited Classification Badge */}
        <View style={[styles.inheritsBox, menuType === 'non_veg' && styles.inheritsBoxNonVeg]}>
          {menuType === 'veg' ? (
            <>
              <Leaf size={16} color="#16A34A" />
              <Text style={styles.inheritsTextVeg}>{t('Adding to 🥗 Veg Menu')}</Text>
            </>
          ) : (
            <>
              <Drumstick size={16} color="#DC2626" />
              <Text style={styles.inheritsTextNonVeg}>{t('Adding to 🍗 Non-Veg Menu')}</Text>
            </>
          )}
        </View>

        <Text style={styles.label}>{t('Dish Name')} <Text style={styles.required}>*</Text></Text>
        <TextInput
          ref={nameRef}
          style={[styles.input, errors.name && styles.inputError]}
          placeholder="e.g. Paneer Butter Masala, Chicken Biryani"
          placeholderTextColor="#9CA3AF"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          returnKeyType="next"
          onSubmitEditing={() => priceRef.current?.focus()}
          blurOnSubmit={false}
          autoFocus
        />
        {errors.name ? <Text style={styles.fieldError}>{errors.name}</Text> : null}

        <Text style={styles.label}>{t('Category')} <Text style={styles.required}>*</Text></Text>
        <Text style={styles.hint}>
          {menuType === 'veg' ? t('Categories for Veg') : t('Categories for Non-Veg')}
        </Text>
        {loadingCategories ? (
          <ActivityIndicator color="#1B4332" size="small" style={{ marginVertical: 8 }} />
        ) : (
          <View style={styles.chipRow}>
            {availableCategories.map(cat => (
              <TouchableOpacity
                key={cat.id || cat.name}
                style={[styles.chip, mealCategory === cat.name && styles.chipActive]}
                onPress={() => setMealCategory(cat.name)}
              >
                <Text style={[styles.chipText, mealCategory === cat.name && styles.chipTextActive]}>
                  {t(cat.name)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        {errors.category ? <Text style={styles.fieldError}>{errors.category}</Text> : null}

        <Text style={styles.label}>{t('Meal Type')} <Text style={styles.required}>*</Text></Text>
        <View style={styles.chipRow}>
          {MEAL_TYPES.map(item => (
            <TouchableOpacity
              key={item.key}
              style={[styles.chip, mealType === item.key && styles.chipActive]}
              onPress={() => setMealType(item.key)}
            >
              <Text style={[styles.chipText, mealType === item.key && styles.chipTextActive]}>
                {t(item.label)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>{t('Price per plate (₹)')}</Text>
        <TextInput
          ref={priceRef}
          style={styles.input}
          placeholder="0"
          placeholderTextColor="#9CA3AF"
          value={price}
          onChangeText={t => setPrice(t.replace(/[^0-9.]/g, ''))}
          keyboardType="decimal-pad"
          returnKeyType="next"
          onSubmitEditing={() => descriptionRef.current?.focus()}
          blurOnSubmit={false}
        />

        <Text style={styles.label}>{t('Description (Optional)')}</Text>
        <TextInput
          ref={descriptionRef}
          style={[styles.input, { height: 72, textAlignVertical: 'top', paddingTop: 10 }]}
          placeholder={t('Short description...')}
          placeholderTextColor="#9CA3AF"
          value={description}
          onChangeText={setDescription}
          multiline
          returnKeyType="done"
          blurOnSubmit={true}
          onSubmitEditing={handleSave}
        />

        <TouchableOpacity
          style={[styles.saveBtn, saving && { opacity: 0.7 }]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveBtnText}>{saving ? t('Saving...') : t('Save Dish')}</Text>
        </TouchableOpacity>
      </KeyboardAwareScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  backBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { ...T.h2 },
  scroll: { padding: 16, paddingBottom: 20 },
  errorText: { color: '#EF4444', fontSize: scaleFont(10.5), marginBottom: 10, backgroundColor: '#FEF2F2', padding: 8, borderRadius: 8 },
  inheritsBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F0FDF4', padding: 10, borderRadius: 10, borderLeftWidth: 4, borderLeftColor: '#16A34A', marginBottom: 14 },
  inheritsBoxNonVeg: { backgroundColor: '#FEF2F2', borderLeftColor: '#DC2626' },
  inheritsTextVeg: { fontSize: 11.5, fontWeight: '700', color: '#16A34A' },
  inheritsTextNonVeg: { fontSize: 11.5, fontWeight: '700', color: '#DC2626' },
  label: { ...T.label, marginBottom: 4, marginTop: 12 },
  hint: { ...T.caption, color: '#9CA3AF', marginBottom: 6, marginTop: -2 },
  required: { color: '#DC2626' },
  input: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 12, height: 44, fontSize: scaleFont(11.5), color: '#111827', backgroundColor: '#F9FAFB', fontFamily: F.regular },
  inputError: { borderColor: '#EF4444' },
  fieldError: { color: '#EF4444', fontSize: scaleFont(9.5), marginTop: 3 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#F9FAFB' },
  chipActive: { backgroundColor: '#1B4332', borderColor: '#1B4332' },
  chipText: { fontSize: scaleFont(10.5), fontFamily: F.medium, color: '#374151' },
  chipTextActive: { color: '#fff', fontFamily: F.semibold },
  saveBtn: { backgroundColor: '#1B4332', borderRadius: 10, height: 46, justifyContent: 'center', alignItems: 'center', marginTop: 24 },
  saveBtnText: { ...T.btnLg, fontSize: scaleFont(12.5) },
});