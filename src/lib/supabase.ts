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
    logoUrl?: string;
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
      p_logo_url: params.logoUrl ?? null,
    }),

  // Dynamic Pricing Rules
  getPricingRules: (companyId: string) =>
    supabase.rpc('hotel_get_pricing_rules', { p_company_id: companyId }),

  upsertPricingRule: (params: {
    id?: string | null; companyId: string; roomId?: string | null; name: string;
    ruleType: 'day_of_week' | 'special_date'; dayOfWeek?: number | null;
    specialDate?: string | null; adjustmentType: 'fixed' | 'multiplier' | 'percentage';
    adjustmentValue: number;
  }) =>
    supabase.rpc('hotel_upsert_pricing_rule', {
      p_id: params.id ?? null,
      p_company_id: params.companyId,
      p_room_id: params.roomId ?? null,
      p_name: params.name,
      p_rule_type: params.ruleType,
      p_day_of_week: params.dayOfWeek ?? null,
      p_special_date: params.specialDate ?? null,
      p_adjustment_type: params.adjustmentType,
      p_adjustment_value: params.adjustmentValue,
    }),

  deletePricingRule: (ruleId: string) =>
    supabase.rpc('hotel_delete_pricing_rule', { p_rule_id: ruleId }),

  // User Management (Nexus Owner / Superadmin)
  getAllProfiles: () =>
    supabase.rpc('hotel_get_all_profiles'),

  updateProfileAdmin: (params: {
    id: string; name: string; role: string; companyId: string | null; isAuthorized: boolean;
  }) =>
    supabase.rpc('hotel_update_profile_admin', {
      p_id: params.id,
      p_name: params.name,
      p_role: params.role,
      p_company_id: params.companyId,
      p_is_authorized: params.isAuthorized,
    }),

  deleteProfileAdmin: (userId: string) =>
    supabase.rpc('hotel_delete_profile_admin', { p_id: userId }),

  createUserAdmin: (params: {
    email: string; password: string; name: string; role: string; companyId: string | null; isAuthorized: boolean;
  }) =>
    supabase.rpc('hotel_create_user_admin', {
      p_email: params.email,
      p_password: params.password,
      p_name: params.name,
      p_role: params.role,
      p_company_id: params.companyId,
      p_is_authorized: params.isAuthorized,
    }),

  // Restaurant RPC Helpers
  restaurantGetCategories: (companyId: string) =>
    supabase.rpc('restaurant_get_categories', { p_company_id: companyId }),

  restaurantGetMenuItems: (companyId: string) =>
    supabase.rpc('restaurant_get_menu_items', { p_company_id: companyId }),

  restaurantUpsertCategory: (params: {
    id: string | null; companyId: string; name: string; sortOrder: number;
  }) =>
    supabase.rpc('restaurant_upsert_category', {
      p_id: params.id,
      p_company_id: params.companyId,
      p_name: params.name,
      p_sort_order: params.sortOrder,
    }),

  restaurantUpsertMenuItem: (params: {
    id: string | null; companyId: string; categoryId: string | null;
    name: string; description: string | null; price: number;
    imageUrl: string | null; isAvailable: boolean;
  }) =>
    supabase.rpc('restaurant_upsert_menu_item', {
      p_id: params.id,
      p_company_id: params.companyId,
      p_category_id: params.categoryId,
      p_name: params.name,
      p_description: params.description,
      p_price: params.price,
      p_image_url: params.imageUrl,
      p_is_available: params.isAvailable,
    }),

  restaurantDeleteCategory: (id: string) =>
    supabase.rpc('restaurant_delete_category', { p_id: id }),

  restaurantDeleteMenuItem: (id: string) =>
    supabase.rpc('restaurant_delete_menu_item', { p_id: id }),

  restaurantCreateOrder: (params: {
    companyId: string; source: string; tableNumber: string | null;
    roomId: string | null; bookingId: string | null;
    paymentStatus: string; notes: string | null; items: any[];
  }) =>
    supabase.rpc('restaurant_create_order', {
      p_company_id: params.companyId,
      p_source: params.source,
      p_table_number: params.tableNumber,
      p_room_id: params.roomId,
      p_booking_id: params.bookingId,
      p_payment_status: params.paymentStatus,
      p_notes: params.notes,
      p_items: params.items,
    }),

  restaurantGetOrders: (companyId: string) =>
    supabase.rpc('restaurant_get_orders', { p_company_id: companyId }),

  restaurantUpdateOrderStatus: (orderId: string, status: string) =>
    supabase.rpc('restaurant_update_order_status', { p_order_id: orderId, p_status: status }),

  restaurantUpdateOrderPayment: (orderId: string, paymentStatus: string) =>
    supabase.rpc('restaurant_update_order_payment', { p_order_id: orderId, p_payment_status: paymentStatus }),

  validateRoomAccess: (companyId: string, roomNumber: string, guestRut: string) =>
    supabase.rpc('hotel_validate_room_access', {
      p_company_id: companyId,
      p_room_number: roomNumber,
      p_guest_rut: guestRut,
    }),
};

