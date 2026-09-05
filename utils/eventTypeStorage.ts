import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const CUSTOM_EVENT_TYPES_KEY = '@cater_ease_custom_event_types';

export const DEFAULT_EVENT_TYPES = [
  'Wedding',
  'Corporate',
  'Birthday',
  'Reception',
  'Engagement',
  'Anniversary',
  'Private Party',
];

export async function getCustomEventTypes(userId?: string): Promise<string[]> {
  const customTypesSet = new Set<string>();

  // 1. Get from AsyncStorage
  try {
    const json = await AsyncStorage.getItem(CUSTOM_EVENT_TYPES_KEY);
    if (json) {
      const arr = JSON.parse(json);
      if (Array.isArray(arr)) {
        arr.forEach((item: any) => {
          if (typeof item === 'string' && item.trim()) {
            customTypesSet.add(item.trim());
          }
        });
      }
    }
  } catch (e) {
    console.error('Error reading custom event types from AsyncStorage:', e);
  }

  // 2. Fetch unique event_type from Firestore events for the user (if userId provided)
  if (userId) {
    try {
      const snap = await getDocs(query(collection(db, 'events'), where('user_id', '==', userId)));
      snap.docs.forEach(doc => {
        const data = doc.data();
        if (data.event_type && typeof data.event_type === 'string') {
          const raw = data.event_type.trim();
          if (raw) {
            const formatted = raw.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
            const isDefault = DEFAULT_EVENT_TYPES.some(d => d.toLowerCase() === formatted.toLowerCase());
            if (!isDefault) {
              customTypesSet.add(formatted);
            }
          }
        }
      });
    } catch (e) {
      // ignore offline/permission errors
    }
  }

  // Filter out any default types (case-insensitive)
  const result: string[] = [];
  customTypesSet.forEach(type => {
    const isDefault = DEFAULT_EVENT_TYPES.some(d => d.toLowerCase() === type.toLowerCase());
    if (!isDefault) {
      result.push(type);
    }
  });

  return result;
}

export async function saveCustomEventType(newType: string): Promise<string[]> {
  const trimmed = newType.trim();
  if (!trimmed) return await getCustomEventTypes();

  // If it's a default type, no need to save as custom
  const isDefault = DEFAULT_EVENT_TYPES.some(d => d.toLowerCase() === trimmed.toLowerCase());
  if (isDefault) return await getCustomEventTypes();

  try {
    const existing = await getCustomEventTypes();
    const formattedNew = trimmed.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

    const exists = existing.some(e => e.toLowerCase() === formattedNew.toLowerCase());
    let updated = existing;
    if (!exists) {
      updated = [...existing, formattedNew];
      await AsyncStorage.setItem(CUSTOM_EVENT_TYPES_KEY, JSON.stringify(updated));
    }
    return updated;
  } catch (e) {
    console.error('Error saving custom event type:', e);
    return [];
  }
}
