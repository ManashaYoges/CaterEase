import { collection, getDocs, query, where, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { MenuCategory } from '@/types';

export const DEFAULT_VEG_CATEGORIES: MenuCategory[] = [
  { id: 'def_veg_main', user_id: 'default', name: 'Main', categoryType: 'veg' },
  { id: 'def_veg_dessert', user_id: 'default', name: 'Desserts', categoryType: 'veg' },
  { id: 'def_veg_bev', user_id: 'default', name: 'Hot/Soft Beverages', categoryType: 'veg' },
];

export const DEFAULT_NON_VEG_CATEGORIES: MenuCategory[] = [
  { id: 'def_nonveg_main', user_id: 'default', name: 'Main', categoryType: 'nonVeg' },
  { id: 'def_nonveg_dessert', user_id: 'default', name: 'Desserts', categoryType: 'nonVeg' },
  { id: 'def_nonveg_bev', user_id: 'default', name: 'Hot/Soft Beverages', categoryType: 'nonVeg' },
];

export const ALLOWED_CATEGORY_NAMES = ['Main', 'Desserts', 'Hot/Soft Beverages'];

export function matchesCategory(dishCategory: string | undefined, targetCategoryName: string): boolean {
  const cat = (dishCategory || '').toLowerCase().trim();
  const target = targetCategoryName.toLowerCase().trim();

  if (target === 'main') {
    return (
      cat === 'main' ||
      cat === 'main course' ||
      cat.includes('biryani') ||
      cat.includes('starter') ||
      cat.includes('appetizer') ||
      cat.includes('snack') ||
      (!cat.includes('dessert') && !cat.includes('sweet') && !cat.includes('beverage') && !cat.includes('drink'))
    );
  }

  if (target === 'desserts') {
    return cat === 'desserts' || cat.includes('dessert') || cat.includes('sweet');
  }

  if (
    target === 'hot/soft beverages' ||
    target === 'hot beverages' ||
    target === 'cold beverages' ||
    target === 'beverages'
  ) {
    return (
      cat === 'hot/soft beverages' ||
      cat === 'hot beverages' ||
      cat === 'cold beverages' ||
      cat === 'beverages' ||
      cat.includes('beverage') ||
      cat.includes('drink') ||
      cat.includes('tea') ||
      cat.includes('coffee') ||
      cat.includes('juice')
    );
  }

  return cat === target;
}

export async function fetchUserCategories(userId: string): Promise<MenuCategory[]> {
  try {
    const snapshot = await getDocs(
      query(collection(db, 'categories'), where('user_id', '==', userId))
    );
    const dbCats = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as MenuCategory[];

    const filteredDbCats = dbCats.filter(c => ALLOWED_CATEGORY_NAMES.includes(c.name));

    if (filteredDbCats.length > 0) {
      const result: MenuCategory[] = [...filteredDbCats];
      (['veg', 'nonVeg'] as const).forEach((type) => {
        ALLOWED_CATEGORY_NAMES.forEach((name) => {
          if (!result.some(c => c.categoryType === type && c.name === name)) {
            const def = (type === 'veg' ? DEFAULT_VEG_CATEGORIES : DEFAULT_NON_VEG_CATEGORIES)
              .find(d => d.name === name);
            if (def) result.push(def);
          }
        });
      });
      return result;
    }
    return [...DEFAULT_VEG_CATEGORIES, ...DEFAULT_NON_VEG_CATEGORIES];
  } catch (err) {
    console.error('Error fetching categories:', err);
    return [...DEFAULT_VEG_CATEGORIES, ...DEFAULT_NON_VEG_CATEGORIES];
  }
}

export async function createMenuCategory(
  userId: string,
  name: string,
  categoryType: 'veg' | 'nonVeg'
): Promise<MenuCategory> {
  const catData = {
    user_id: userId,
    name: name.trim(),
    categoryType,
    created_at: new Date().toISOString(),
  };
  const docRef = await addDoc(collection(db, 'categories'), catData);
  return {
    id: docRef.id,
    ...catData,
  };
}
