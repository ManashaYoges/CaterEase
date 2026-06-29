import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const MENU_TYPES = [
  { key: 'veg',     label: 'Pure Veg' },
  { key: 'non_veg', label: 'Non-Veg' },
];

// Only 4 main meals — NO separate Desserts/Beverages here
const MEAL_TYPES = [
  { key: 'breakfast', label: 'Breakfast' },
  { key: 'lunch',     label: 'Lunch' },
  { key: 'dinner',    label: 'Dinner' },
  { key: 'snacks',    label: 'Snacks' },
];

// Dessert/Beverage are sub-categories under whichever meal is chosen
const MEAL_CATEGORIES = [
  { key: 'main',     label: 'Main Dish' },
  { key: 'dessert',  label: 'Dessert / Sweet' },
  { key: 'beverage', label: 'Hot/Soft Beverage' },
];

export default function AddDishScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const [name, setName] = useState('');
  const [menuType, setMenuType] = useState('veg');
  const [mealType, setMealType] = useState('breakfast');
  const [mealCategory, setMealCategory] = useState('main');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Dish name is required';
    return e;
  };

  const handleSave = async () => {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    if (!user) return;
    setSaving(true);
    try {
      await addDoc(collection(db, 'menu_items'), {
        user_id: user.uid,
        name: name.trim(),
        menu_type: menuType,
        meal_type: mealType,           // breakfast | lunch | dinner | snacks
        meal_category: mealCategory,   // main | dessert | beverage
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
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <ArrowLeft size={20} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add Dish</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {errors.general ? <Text style={styles.errorText}>{errors.general}</Text> : null}

          <Text style={styles.label}>Dish Name <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={[styles.input, errors.name && styles.inputError]}
            placeholder="e.g. Idly, Biryani, Gulab Jamun"
            placeholderTextColor="#9CA3AF"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />
          {errors.name ? <Text style={styles.fieldError}>{errors.name}</Text> : null}

          <Text style={styles.label}>Menu Type <Text style={styles.required}>*</Text></Text>
          <View style={styles.chipRow}>
            {MENU_TYPES.map(t => (
              <TouchableOpacity
                key={t.key}
                style={[styles.chip, menuType === t.key && styles.chipActive]}
                onPress={() => setMenuType(t.key)}
              >
                <Text style={[styles.chipText, menuType === t.key && styles.chipTextActive]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Meal <Text style={styles.required}>*</Text></Text>
          <Text style={styles.hint}>Which meal does this dish belong to?</Text>
          <View style={styles.chipRow}>
            {MEAL_TYPES.map(t => (
              <TouchableOpacity
                key={t.key}
                style={[styles.chip, mealType === t.key && styles.chipActive]}
                onPress={() => setMealType(t.key)}
              >
                <Text style={[styles.chipText, mealType === t.key && styles.chipTextActive]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Category <Text style={styles.required}>*</Text></Text>
          <Text style={styles.hint}>Is this a main dish, dessert, or beverage for the above meal?</Text>
          <View style={styles.chipRow}>
            {MEAL_CATEGORIES.map(t => (
              <TouchableOpacity
                key={t.key}
                style={[styles.chip, mealCategory === t.key && styles.chipActive]}
                onPress={() => setMealCategory(t.key)}
              >
                <Text style={[styles.chipText, mealCategory === t.key && styles.chipTextActive]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Live preview */}
          <View style={styles.previewBox}>
            <Text style={styles.previewLabel}>This dish will appear under:</Text>
            <Text style={styles.previewValue}>
              {MEAL_TYPES.find(t => t.key === mealType)?.label}
              {' → '}
              {MEAL_CATEGORIES.find(t => t.key === mealCategory)?.label}
            </Text>
          </View>

          <Text style={styles.label}>Price per plate (₹)</Text>
          <TextInput
            style={styles.input}
            placeholder="0"
            placeholderTextColor="#9CA3AF"
            value={price}
            onChangeText={t => setPrice(t.replace(/[^0-9.]/g, ''))}
            keyboardType="decimal-pad"
          />

          <Text style={styles.label}>Description (Optional)</Text>
          <TextInput
            style={[styles.input, { height: 80, textAlignVertical: 'top', paddingTop: 12 }]}
            placeholder="Short description..."
            placeholderTextColor="#9CA3AF"
            value={description}
            onChangeText={setDescription}
            multiline
          />

          <TouchableOpacity
            style={[styles.saveBtn, saving && { opacity: 0.7 }]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save Dish'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  scroll: { padding: 20, paddingBottom: 40 },
  errorText: { color: '#EF4444', fontSize: 13, marginBottom: 12, backgroundColor: '#FEF2F2', padding: 10, borderRadius: 8 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 16 },
  hint: { fontSize: 12, color: '#9CA3AF', marginBottom: 8, marginTop: -4 },
  required: { color: '#DC2626' },
  input: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 14, height: 50, fontSize: 14, color: '#111827', backgroundColor: '#F9FAFB' },
  inputError: { borderColor: '#EF4444' },
  fieldError: { color: '#EF4444', fontSize: 12, marginTop: 4 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#F9FAFB' },
  chipActive: { backgroundColor: '#1B4332', borderColor: '#1B4332' },
  chipText: { fontSize: 13, fontWeight: '500', color: '#374151' },
  chipTextActive: { color: '#fff' },
  previewBox: { backgroundColor: '#F0FDF4', borderRadius: 10, padding: 12, marginTop: 12, borderWidth: 1, borderColor: '#BBF7D0' },
  previewLabel: { fontSize: 12, color: '#6B7280', marginBottom: 4 },
  previewValue: { fontSize: 14, fontWeight: '700', color: '#1B4332' },
  saveBtn: { backgroundColor: '#1B4332', borderRadius: 12, height: 52, justifyContent: 'center', alignItems: 'center', marginTop: 32 },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});