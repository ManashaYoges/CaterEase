import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Leaf, Drumstick, Trash2 } from 'lucide-react-native';
import { doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import KeyboardAwareScrollView from '@/components/KeyboardAwareScrollView';
import { F, scaleFont } from '@/utils/fonts';
import { T } from '@/utils/typography';
import { fetchUserCategories } from '@/utils/categories';
import { MenuItem, MenuCategory } from '@/types';

const MEAL_TYPES = [
  { key: 'breakfast', label: 'Breakfast' },
  { key: 'lunch',     label: 'Lunch' },
  { key: 'dinner',    label: 'Dinner' },
  { key: 'snacks',    label: 'Snacks' },
];

export default function EditDishScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();

  const nameRef = useRef<TextInput>(null);
  const priceRef = useRef<TextInput>(null);
  const descriptionRef = useRef<TextInput>(null);

  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  
  const [name, setName] = useState('');
  const [menuType, setMenuType] = useState<'veg' | 'non_veg'>('veg');
  const [mealType, setMealType] = useState('lunch');
  const [mealCategory, setMealCategory] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    async function loadDishAndCats() {
      if (!user || !id) return;
      try {
        const cats = await fetchUserCategories(user.uid);
        setCategories(cats);

        const dishDoc = await getDoc(doc(db, 'menu_items', id));
        if (dishDoc.exists()) {
          const data = dishDoc.data() as MenuItem;
          setName(data.name || '');
          const mt = data.menu_type === 'non_veg' ? 'non_veg' : 'veg';
          setMenuType(mt);
          setMealType(data.meal_type || 'lunch');
          setMealCategory(data.meal_category || 'Main Course');
          setPrice(data.price ? data.price.toString() : '');
          setDescription(data.description || '');
        } else {
          Alert.alert(t('Error'), 'Dish not found');
          router.back();
        }
      } catch (err: any) {
        Alert.alert(t('Error'), err.message || 'Failed to load dish details');
      } finally {
        setLoading(false);
      }
    }
    loadDishAndCats();
  }, [user, id]);

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
    if (!user || !id) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'menu_items', id), {
        name: name.trim(),
        menu_type: menuType,
        categoryType: targetCategoryType,
        meal_type: mealType,
        meal_category: mealCategory,
        price: parseFloat(price) || 0,
        description: description.trim() || null,
        updated_at: new Date().toISOString(),
      });
      router.back();
    } catch (err: any) {
      setErrors({ general: err.message || 'Failed to update dish' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      t('Delete Dish'),
      t('Are you sure you want to delete "{name}"?', { name }),
      [
        { text: t('Cancel'), style: 'cancel' },
        {
          text: t('Delete'),
          style: 'destructive',
          onPress: async () => {
            if (!id) return;
            setDeleting(true);
            try {
              await deleteDoc(doc(db, 'menu_items', id));
              router.back();
            } catch (err: any) {
              Alert.alert(t('Error'), err.message || 'Failed to delete dish');
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color="#1B4332" size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={18} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('Edit Dish')}</Text>
        <TouchableOpacity style={styles.deleteHeaderBtn} onPress={handleDelete} disabled={deleting}>
          <Trash2 size={18} color="#DC2626" />
        </TouchableOpacity>
      </View>

      <KeyboardAwareScrollView contentContainerStyle={styles.scroll}>
        {errors.general ? <Text style={styles.errorText}>{errors.general}</Text> : null}

        {/* Classification Badge & Toggle */}
        <View style={styles.typeToggleRow}>
          <TouchableOpacity
            style={[styles.typeBtn, menuType === 'veg' && styles.typeBtnVegActive]}
            onPress={() => {
              setMenuType('veg');
              const vegCats = categories.filter(c => c.categoryType === 'veg');
              if (vegCats.length > 0 && !vegCats.some(c => c.name === mealCategory)) {
                setMealCategory(vegCats[0].name);
              }
            }}
          >
            <Leaf size={14} color={menuType === 'veg' ? '#fff' : '#16A34A'} />
            <Text style={[styles.typeText, menuType === 'veg' && styles.typeTextActive]}>{t('Pure Veg')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.typeBtn, menuType === 'non_veg' && styles.typeBtnNonVegActive]}
            onPress={() => {
              setMenuType('non_veg');
              const nonVegCats = categories.filter(c => c.categoryType === 'nonVeg');
              if (nonVegCats.length > 0 && !nonVegCats.some(c => c.name === mealCategory)) {
                setMealCategory(nonVegCats[0].name);
              }
            }}
          >
            <Drumstick size={14} color={menuType === 'non_veg' ? '#fff' : '#DC2626'} />
            <Text style={[styles.typeText, menuType === 'non_veg' && styles.typeTextActive]}>{t('Non-Veg')}</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>{t('Dish Name')} <Text style={styles.required}>*</Text></Text>
        <TextInput
          ref={nameRef}
          style={[styles.input, errors.name && styles.inputError]}
          placeholder="Dish name"
          placeholderTextColor="#9CA3AF"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          returnKeyType="next"
          onSubmitEditing={() => priceRef.current?.focus()}
          blurOnSubmit={false}
        />
        {errors.name ? <Text style={styles.fieldError}>{errors.name}</Text> : null}

        <Text style={styles.label}>{t('Category')} <Text style={styles.required}>*</Text></Text>
        <Text style={styles.hint}>
          {menuType === 'veg' ? t('Categories for Veg') : t('Categories for Non-Veg')}
        </Text>
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
          <Text style={styles.saveBtnText}>{saving ? t('Updating...') : t('Update Dish')}</Text>
        </TouchableOpacity>
      </KeyboardAwareScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  backBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  deleteHeaderBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { ...T.h2 },
  scroll: { padding: 16, paddingBottom: 20 },
  errorText: { color: '#EF4444', fontSize: scaleFont(10.5), marginBottom: 10, backgroundColor: '#FEF2F2', padding: 8, borderRadius: 8 },
  typeToggleRow: { flexDirection: 'row', gap: 8, backgroundColor: '#F3F4F6', padding: 4, borderRadius: 10, marginBottom: 14 },
  typeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, borderRadius: 8 },
  typeBtnVegActive: { backgroundColor: '#16A34A' },
  typeBtnNonVegActive: { backgroundColor: '#DC2626' },
  typeText: { fontSize: 11.5, fontWeight: '600', color: '#6B7280' },
  typeTextActive: { color: '#fff', fontWeight: '700' },
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
