export interface Profile {
  id: string;
  full_name: string | null;
  phone: string | null;
  created_at: string;
}

export interface Customer {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  email: string | null;
  address: string | null;
  notes: string | null;
  add_to_contacts: boolean;
  created_at: string;
}

// ADD to Event interface:
export interface Event {
  id: string;
  user_id: string;
  customer_id: string | null;
  event_name: string;
  event_type: string;
  event_date: string;
  venue: string;
  guest_count: number;
  status: string;
  menu_type: string;
  advance_amount: number;
  payment_status: string;
  total_amount: number;
  draft_id: string;
  notes?: string | null;
  attachment_photos: string[];        // ← ADD
  attachment_docs: { name: string; uri: string }[];  // ← ADD
  created_at: string;
  updated_at: string;
  customers?: any;
  event_dates?: any[];
  event_menu_items?: any[];
}
export interface EventDate {
  id: string;
  event_id: string;
  event_date: string;
  meal_types: string[];
}

export interface MenuItem {
  id: string;
  user_id: string;
  name: string;
  meal_type: string;
  menu_type: string;
  categoryType?: 'veg' | 'nonVeg';
  meal_category: string;
  price: number;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
}

export interface MenuCategory {
  id: string;
  user_id: string;
  name: string;
  categoryType: 'veg' | 'nonVeg';
  meal_type?: string;
  created_at?: string;
}

export interface EventMenuItem {
  id: string;
  event_id: string;
  menu_item_id: string;
  meal_type: string;
  quantity: string | null;
  price_override: number | null;
  menu_items?: MenuItem;
}

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snacks' | 'desserts' | 'beverages';
export type EventType = 'wedding' | 'corporate' | 'birthday' | 'anniversary' | 'private_party';
export type MenuType = 'veg' | 'non_veg';

