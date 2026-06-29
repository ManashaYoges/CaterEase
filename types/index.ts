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
  draft_id: string | null;
  created_at: string;
  updated_at: string;
  customers?: Customer;
  event_dates?: EventDate[];
  event_menu_items?: EventMenuItem[];
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
  meal_category: string;
  price: number;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
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
