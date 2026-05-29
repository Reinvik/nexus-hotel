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
