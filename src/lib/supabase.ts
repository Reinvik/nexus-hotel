import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase URL or Anon Key is missing in environment variables.');
}

// Main client — uses public schema for auth + RPC calls
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true
  }
});

// ─────────────────────────────────────────────
// Hotel RPC Helpers
// Proxy all hotel.* queries through public RPC
// functions (SECURITY DEFINER) since the hotel
// schema PostgREST exposure requires a restart.
// ─────────────────────────────────────────────
export const hotelRpc = {
  getCompanies: () =>
    supabase.rpc('hotel_get_companies'),

  getProfile: (userId: string) =>
    supabase.rpc('hotel_get_profile', { p_user_id: userId }),

  getRooms: (companyId: string) =>
    supabase.rpc('hotel_get_rooms', { p_company_id: companyId }),

  getBookings: (companyId: string) =>
    supabase.rpc('hotel_get_bookings', { p_company_id: companyId }),

  getCleaningTasks: (companyId: string) =>
    supabase.rpc('hotel_get_cleaning_tasks', { p_company_id: companyId }),

  updateRoomStatus: (roomId: string, status: string) =>
    supabase.rpc('hotel_update_room_status', { p_room_id: roomId, p_status: status }),

  updateBookingStatus: (bookingId: string, status: string) =>
    supabase.rpc('hotel_update_booking_status', { p_booking_id: bookingId, p_status: status }),

  createBooking: (params: {
    company_id: string; room_id: string; guest_name: string;
    guest_phone?: string; guest_email?: string; guest_rut?: string;
    check_in: string; check_out: string; total_price: number; notes?: string;
  }) =>
    supabase.rpc('hotel_create_booking', {
      p_company_id: params.company_id,
      p_room_id: params.room_id,
      p_guest_name: params.guest_name,
      p_guest_phone: params.guest_phone ?? null,
      p_guest_email: params.guest_email ?? null,
      p_guest_rut: params.guest_rut ?? null,
      p_check_in: params.check_in,
      p_check_out: params.check_out,
      p_total_price: params.total_price,
      p_notes: params.notes ?? null,
    }),

  upsertProfile: (params: {
    id: string; email: string; name: string; role: string; company_id: string;
  }) =>
    supabase.rpc('hotel_upsert_profile', {
      p_id: params.id,
      p_email: params.email,
      p_name: params.name,
      p_role: params.role,
      p_company_id: params.company_id,
    }),

  // Cleaning Dashboard
  getCleaningTasksWithRooms: (companyId: string) =>
    supabase.rpc('hotel_get_cleaning_tasks_with_rooms', { p_company_id: companyId }),

  getCleaners: (companyId: string) =>
    supabase.rpc('hotel_get_cleaners', { p_company_id: companyId }),

  updateCleaningTask: (params: {
    taskId: string; status?: string; cleanerId?: string | null;
    startedAt?: string | null; completedAt?: string | null;
  }) =>
    supabase.rpc('hotel_update_cleaning_task', {
      p_task_id: params.taskId,
      p_status: params.status ?? null,
      p_cleaner_id: params.cleanerId ?? null,
      p_started_at: params.startedAt ?? null,
      p_completed_at: params.completedAt ?? null,
    }),

  createCleaningTask: (params: {
    companyId: string; roomId: string; bookingId?: string; cleanerId?: string; notes?: string;
  }) =>
    supabase.rpc('hotel_create_cleaning_task', {
      p_company_id: params.companyId,
      p_room_id: params.roomId,
      p_booking_id: params.bookingId ?? null,
      p_cleaner_id: params.cleanerId ?? null,
      p_notes: params.notes ?? null,
    }),

  // Admin / Room management
  createRoom: (params: {
    companyId: string; roomNumber: string; name: string;
    type: string; pricePerDay: number; description?: string;
    imageUrl?: string;
  }) =>
    supabase.rpc('hotel_create_room', {
      p_company_id: params.companyId,
      p_room_number: params.roomNumber,
      p_name: params.name,
      p_type: params.type,
      p_price_per_day: params.pricePerDay,
      p_description: params.description ?? null,
      p_image_url: params.imageUrl ?? null,
    }),

  updateRoom: (params: {
    roomId: string; name?: string; type?: string;
    pricePerDay?: number; description?: string; status?: string;
    imageUrl?: string;
  }) =>
    supabase.rpc('hotel_update_room', {
      p_room_id: params.roomId,
      p_name: params.name ?? null,
      p_type: params.type ?? null,
      p_price_per_day: params.pricePerDay ?? null,
      p_description: params.description ?? null,
      p_status: params.status ?? null,
      p_image_url: params.imageUrl ?? null,
    }),

  deleteRoom: (roomId: string) =>
    supabase.rpc('hotel_delete_room', { p_room_id: roomId }),

  // Company / Settings admin
  createCompany: (params: {
    name: string; email?: string; phone?: string;
    address?: string; city?: string;
  }) =>
    supabase.rpc('hotel_create_company', {
      p_name: params.name,
      p_email: params.email ?? null,
      p_phone: params.phone ?? null,
      p_address: params.address ?? null,
      p_city: params.city ?? null,
    }),

  getCompany: (companyId: string) =>
    supabase.rpc('hotel_get_company', { p_company_id: companyId }),

  updateCompany: (params: {
    companyId: string; name?: string; address?: string;
    phone?: string; email?: string; flowSettings?: object;
  }) =>
    supabase.rpc('hotel_update_company', {
      p_company_id: params.companyId,
      p_name: params.name ?? null,
      p_address: params.address ?? null,
      p_phone: params.phone ?? null,
      p_email: params.email ?? null,
      p_flow_settings: params.flowSettings ? JSON.stringify(params.flowSettings) : null,
    }),

  getSettings: (companyId: string) =>
    supabase.rpc('hotel_get_settings', { p_company_id: companyId }),

  upsertSettings: (params: {
    companyId: string; checkInTime?: string; checkOutTime?: string;
    themePrimary?: string; themeIsDark?: boolean;
    heroTitle?: string; heroSubtitle?: string;
    aboutText?: string; bannerUrl?: string;
    features?: string[];
  }) =>
    supabase.rpc('hotel_upsert_settings', {
      p_company_id: params.companyId,
      p_check_in_time: params.checkInTime ?? '14:00',
      p_check_out_time: params.checkOutTime ?? '11:00',
      p_theme_primary: params.themePrimary ?? '#3b82f6',
      p_theme_is_dark: params.themeIsDark ?? true,
      p_hero_title: params.heroTitle ?? null,
      p_hero_subtitle: params.heroSubtitle ?? null,
      p_about_text: params.aboutText ?? null,
      p_banner_url: params.bannerUrl ?? null,
      p_features: params.features ?? null,
    }),
};
