export interface Company {
  id: string;
  name: string;
  slug?: string | null;
  address?: string | null;
  city?: string | null;
  phone?: string | null;
  email?: string | null;
  is_active?: boolean;
  flow_settings?: {
    apiKey: string;
    secret: string;
    isSandbox: boolean;
  };
  created_at: string;
}

export type ProfileRole = 'admin' | 'receptionist' | 'cleaner';

export interface Profile {
  id: string;
  email: string;
  name?: string | null;
  role: ProfileRole;
  company_id?: string | null;
  is_authorized: boolean;
  avatar_url?: string | null;
  created_at: string;
}

export type RoomStatus = 'Available' | 'Occupied' | 'Dirty' | 'Cleaning' | 'Maintenance';
export type RoomType = 'Single' | 'Double' | 'Suite' | 'Deluxe';

export interface Room {
  id: string;
  company_id: string;
  room_number: string;
  name: string;
  type: RoomType;
  price_per_day: number;
  status: RoomStatus;
  description?: string | null;
  image_url?: string | null;
  created_at: string;
}

export type BookingStatus = 'pending' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled';
export type PaymentStatus = 'pending' | 'paid' | 'failed';

export interface Booking {
  id: string;
  company_id: string;
  room_id: string;
  guest_name: string;
  guest_phone?: string | null;
  guest_email?: string | null;
  guest_rut?: string | null;
  check_in_date: string; // YYYY-MM-DD
  check_out_date: string; // YYYY-MM-DD
  total_price: number;
  status: BookingStatus;
  payment_status: PaymentStatus;
  flow_token?: string | null;
  flow_payment_url?: string | null;
  flow_order_id?: string | null;
  notes?: string | null;
  created_at: string;
  
  // Joins
  room?: Room;
}

export type CleaningStatus = 'pending' | 'in_progress' | 'completed';

export interface CleaningTask {
  id: string;
  company_id: string;
  room_id: string;
  cleaner_id?: string | null;
  status: CleaningStatus;
  booking_id?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  notes?: string | null;
  created_at: string;

  // Joins
  room?: Room;
  cleaner?: Profile;
}

export interface HotelSettings {
  id: string;
  company_id: string;
  check_in_time: string;
  check_out_time: string;
  logo_url?: string | null;
  theme_primary: string;
  theme_secondary: string;
  theme_accent: string;
  theme_is_dark: boolean;
  hero_title?: string | null;
  hero_subtitle?: string | null;
  about_text?: string | null;
  banner_url?: string | null;
  features?: string[] | null;
  created_at: string;
}

export interface PricingRule {
  id: string;
  company_id: string;
  room_id?: string | null;
  name: string;
  rule_type: 'day_of_week' | 'special_date';
  day_of_week?: number | null;
  special_date?: string | null;
  adjustment_type: 'fixed' | 'multiplier' | 'percentage';
  adjustment_value: number;
  created_at: string;
}

export interface MenuCategory {
  id: string;
  company_id: string;
  name: string;
  sort_order: number;
  created_at: string;
}

export interface MenuItem {
  id: string;
  company_id: string;
  category_id?: string | null;
  name: string;
  description?: string | null;
  price: number;
  image_url?: string | null;
  is_available: boolean;
  created_at: string;
  
  // Joins
  category?: MenuCategory;
}

export type RestaurantOrderSource = 'room_service' | 'table' | 'walk_in';
export type RestaurantOrderStatus = 'pending' | 'preparing' | 'delivered' | 'cancelled';
export type RestaurantPaymentStatus = 'pending' | 'paid_direct' | 'charged_to_room';

export interface RestaurantOrder {
  id: string;
  company_id: string;
  source: RestaurantOrderSource;
  table_number?: string | null;
  room_id?: string | null;
  booking_id?: string | null;
  status: RestaurantOrderStatus;
  payment_status: RestaurantPaymentStatus;
  total_price: number;
  notes?: string | null;
  created_at: string;

  // Joins
  room?: Room;
  booking?: Booking;
  items?: RestaurantOrderItem[];
}

export interface RestaurantOrderItem {
  id: string;
  order_id: string;
  menu_item_id: string;
  quantity: number;
  unit_price: number;
  notes?: string | null;
  created_at: string;

  // Joins
  menu_item?: MenuItem;
}

