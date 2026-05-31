import { useState, useEffect } from 'react';
import { hotelRpc } from '../lib/supabase';
import type { Company, Room, Booking, Profile } from '../types';
import { 
  Calendar, User, Phone, Mail, FileText, Loader2, Bed, Check, 
  ArrowRight, ShieldCheck, Sparkles, Edit3, Wifi, Waves, Coffee, 
  Tv, X, Save, Image as ImageIcon, Palette, History
} from 'lucide-react';
import { format, parseISO, addDays, isAfter, isBefore, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { FlowPaymentMock } from './FlowPaymentMock';
import { motion, AnimatePresence } from 'framer-motion';

const ROOM_PRESETS = {
  Single: [
    { name: 'Acogedora Estándar', url: 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=800&q=80' },
    { name: 'Moderna Mínima', url: 'https://images.unsplash.com/photo-1508253053914-934aea2b3c12?auto=format&fit=crop&w=800&q=80' },
  ],
  Double: [
    { name: 'Doble Deluxe', url: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80' },
    { name: 'Estilo Nórdico', url: 'https://images.unsplash.com/photo-1568495248636-6432b97bd949?auto=format&fit=crop&w=800&q=80' },
  ],
  Suite: [
    { name: 'Suite Premium', url: 'https://images.unsplash.com/photo-1582719478250-c89cae4db85b?auto=format&fit=crop&w=800&q=80' },
    { name: 'Suite Panorámica', url: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=800&q=80' },
  ],
  Deluxe: [
    { name: 'Lujo Imperial', url: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=800&q=80' },
    { name: 'Frente al Mar', url: 'https://images.unsplash.com/photo-1540518614846-7eded433c457?auto=format&fit=crop&w=800&q=80' },
  ]
};

const ROOM_FALLBACK_IMAGES = {
  Single: 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=800&q=80',
  Double: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80',
  Suite: 'https://images.unsplash.com/photo-1582719478250-c89cae4db85b?auto=format&fit=crop&w=800&q=80',
  Deluxe: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=800&q=80'
};

const LANDING_BANNER_PRESETS = [
  { name: 'Resort Paradisíaco', url: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1200&q=80' },
  { name: 'Lobby Elegante', url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80' },
  { name: 'Boutique Urbano', url: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=1200&q=80' },
  { name: 'Cabaña de Montaña', url: 'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&w=1200&q=80' }
];

interface PublicBookingPortalProps {
  profile?: Profile | null;
  session?: any;
}

export function PublicBookingPortal({ profile, session: _session }: PublicBookingPortalProps) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [rooms, setRooms] = useState<Room[]>([]);
  const [existingBookings, setExistingBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [saveSettingsLoading, setSaveSettingsLoading] = useState(false);

  // Search Dates
  const [checkIn, setCheckIn] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [checkOut, setCheckOut] = useState<string>(format(addDays(new Date(), 1), 'yyyy-MM-dd'));

  // Booking Form State
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestRut, setGuestRut] = useState('');
  const [notes, setNotes] = useState('');

  // Payment State
  const [showPayment, setShowPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [confirmedBookingInfo, setConfirmedBookingInfo] = useState<any>(null);

  // Hotel Settings & Landing State
  const [settings, setSettings] = useState<any>(null);
  const [heroTitle, setHeroTitle] = useState('Tu Estadía de Ensueño');
  const [heroSubtitle, setHeroSubtitle] = useState('Disfruta de la mejor experiencia de hospitalidad con servicios premium y atención personalizada.');
  const [aboutText, setAboutText] = useState('En nuestro hotel nos esforzamos por ofrecerte la máxima comodidad, elegancia y tranquilidad. Cada habitación está diseñada para brindarte una experiencia inolvidable.');
  const [bannerUrl, setBannerUrl] = useState('https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1200&q=80');
  const [features, setFeatures] = useState<string[]>(['Wi-Fi de Alta Velocidad', 'Desayuno Buffet Incluido', 'Servicio a la Habitación 24/7', 'Estacionamiento Gratuito']);
  const [themePrimary, setThemePrimary] = useState('#8b5cf6');
  const [logoUrl, setLogoUrl] = useState('');
  const [pricingRules, setPricingRules] = useState<any[]>([]);
  
  // Live Editor State
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [activeEditorTab, setActiveEditorTab] = useState<'cover' | 'history' | 'services' | 'rooms'>('cover');
  const [newFeatureTag, setNewFeatureTag] = useState('');
  
  // Live Room Editor Sub-state
  const [selectedRoomToEdit, setSelectedRoomToEdit] = useState<Room | null>(null);
  const [roomEditName, setRoomEditName] = useState('');
  const [roomEditPrice, setRoomEditPrice] = useState(0);
  const [roomEditDesc, setRoomEditDesc] = useState('');
  const [roomEditImageUrl, setRoomEditImageUrl] = useState('');
  const [roomEditType, setRoomEditType] = useState<'Single' | 'Double' | 'Suite' | 'Deluxe'>('Single');
  const [roomSaveLoading, setRoomSaveLoading] = useState(false);

  // Check if current user is admin of selected company or Ariel Mellag
  const isAdminForThisCompany = 
    (profile?.role === 'admin' && profile?.company_id === selectedCompanyId) || 
    (profile?.email === 'ariel.mellag@gmail.com');

  // Fetch hotels/companies on load
  useEffect(() => {
    async function loadCompanies() {
      setLoading(true);
      try {
        const { data, error } = await hotelRpc.getCompanies();
        if (error) throw error;
        
        if (data && data.length > 0) {
          setCompanies(data as any[]);
          const defaultCompany = (profile?.role === 'admin' && profile?.company_id) 
            ? (data as any[]).find((c: any) => c.id === profile.company_id)?.id || data[0].id
            : data[0].id;
          setSelectedCompanyId(defaultCompany);
        }
      } catch (err) {
        console.error('Error fetching hotels:', err);
      } finally {
        setLoading(false);
      }
    }
    loadCompanies();
  }, [profile]);

  // Fetch rooms, bookings, settings, and pricing rules for selected hotel
  useEffect(() => {
    if (!selectedCompanyId) return;

    const loadHotelData = async () => {
      setLoading(true);
      try {
        // Fetch rooms
        const { data: roomsData, error: roomsError } = await hotelRpc.getRooms(selectedCompanyId);
        if (roomsError) throw roomsError;
        setRooms((roomsData as any[]) || []);

        // Fetch active bookings
        const { data: bookingsData, error: bookingsError } = await hotelRpc.getBookings(selectedCompanyId);
        if (bookingsError) throw bookingsError;
        setExistingBookings(((bookingsData as any[]) || []).filter((b: any) => b.status !== 'cancelled'));

        // Fetch settings
        const { data: settingsData, error: settingsError } = await hotelRpc.getSettings(selectedCompanyId);
        if (settingsError) throw settingsError;
        
        const setData = Array.isArray(settingsData) ? settingsData[0] : settingsData;
        if (setData) {
          setSettings(setData);
          setHeroTitle(setData.hero_title || 'Tu Estadía de Ensueño');
          setHeroSubtitle(setData.hero_subtitle || 'Disfruta de la mejor experiencia de hospitalidad con servicios premium y atención personalizada.');
          setAboutText(setData.about_text || 'En nuestro hotel nos esforzamos por ofrecerte la máxima comodidad, elegancia y tranquilidad. Cada habitación está diseñada para brindarte una experiencia inolvidable.');
          setBannerUrl(setData.banner_url || 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1200&q=80');
          setFeatures(Array.isArray(setData.features) ? setData.features : ['Wi-Fi de Alta Velocidad', 'Desayuno Buffet Incluido', 'Servicio a la Habitación 24/7', 'Estacionamiento Gratuito']);
          setThemePrimary(setData.theme_primary || '#3b82f6');
          setLogoUrl(setData.logo_url || '');
        } else {
          setSettings(null);
          // Set defaults
          setHeroTitle('Tu Estadía de Ensueño');
          setHeroSubtitle('Disfruta de la mejor experiencia de hospitalidad con servicios premium y atención personalizada.');
          setAboutText('En nuestro hotel nos esforzamos por ofrecerte la máxima comodidad, elegancia y tranquilidad. Cada habitación está diseñada para brindarte una experiencia inolvidable.');
          setBannerUrl('https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1200&q=80');
          setFeatures(['Wi-Fi de Alta Velocidad', 'Desayuno Buffet Incluido', 'Servicio a la Habitación 24/7', 'Estacionamiento Gratuito']);
          setThemePrimary('#3b82f6');
          setLogoUrl('');
        }

        // Fetch pricing rules
        const { data: rulesData, error: rulesError } = await hotelRpc.getPricingRules(selectedCompanyId);
        if (!rulesError && rulesData) {
          setPricingRules(rulesData as any[]);
        }
      } catch (err) {
        console.error('Error loading hotel data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadHotelData();

    // Listen to settings update events to refetch rules in live editing
    window.addEventListener('hotel-settings-updated', loadHotelData);
    return () => {
      window.removeEventListener('hotel-settings-updated', loadHotelData);
    };
  }, [selectedCompanyId]);

  // Handle date changes
  const handleCheckInChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newIn = e.target.value;
    setCheckIn(newIn);
    if (!isBefore(parseISO(newIn), parseISO(checkOut))) {
      setCheckOut(format(addDays(parseISO(newIn), 1), 'yyyy-MM-dd'));
    }
  };

  // Determine availability
  const isRoomAvailable = (roomId: string) => {
    const room = rooms.find(r => r.id === roomId);
    if (!room || room.status === 'Maintenance') return false;

    const startSearch = parseISO(checkIn);
    const endSearch = parseISO(checkOut);

    const isOverlap = existingBookings.some(b => {
      if (b.room_id !== roomId) return false;
      const bStart = parseISO(b.check_in_date);
      const bEnd = parseISO(b.check_out_date);
      return isBefore(bStart, endSearch) && isAfter(bEnd, startSearch);
    });

    return !isOverlap;
  };

  const daysCount = Math.max(differenceInDays(parseISO(checkOut), parseISO(checkIn)), 1);

  const getDynamicCalculation = () => {
    if (!selectedRoom) return { total: 0, breakdown: [] };
    
    const start = parseISO(checkIn);
    const breakdown = [];
    let total = 0;

    for (let i = 0; i < daysCount; i++) {
      const currentDate = addDays(start, i);
      const dateStr = format(currentDate, 'yyyy-MM-dd');
      const dayOfWeek = currentDate.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

      const basePrice = selectedRoom.price_per_day;
      let finalPrice = basePrice;
      let appliedRule = null;

      // Filter rules that are either global (room_id is null) or specific to this room
      const relevantRules = pricingRules.filter(r => !r.room_id || r.room_id === selectedRoom.id);

      // 1. Look for special date rule
      const specialDateRule = relevantRules.find(
        r => r.rule_type === 'special_date' && r.special_date === dateStr
      );

      if (specialDateRule) {
        appliedRule = specialDateRule;
      } else {
        // 2. Look for day of week rule
        const dowRule = relevantRules.find(
          r => r.rule_type === 'day_of_week' && r.day_of_week === dayOfWeek
        );
        if (dowRule) {
          appliedRule = dowRule;
        }
      }

      if (appliedRule) {
        const val = Number(appliedRule.adjustment_value);
        if (appliedRule.adjustment_type === 'fixed') {
          finalPrice = val;
        } else if (appliedRule.adjustment_type === 'multiplier') {
          finalPrice = basePrice * val;
        } else if (appliedRule.adjustment_type === 'percentage') {
          finalPrice = basePrice * (1 + val / 100);
        }
      }

      total += finalPrice;
      breakdown.push({
        date: currentDate,
        dateStr,
        basePrice,
        finalPrice: Math.round(finalPrice),
        ruleName: appliedRule?.name,
        adjustmentType: appliedRule?.adjustment_type,
        adjustmentValue: appliedRule?.adjustment_value
      });
    }

    return { total: Math.round(total), breakdown };
  };

  const { total: dynamicTotal, breakdown: pricingBreakdown } = getDynamicCalculation();

  const getRoomCalculation = (room: Room) => {
    const start = parseISO(checkIn);
    let total = 0;
    let hasRules = false;

    for (let i = 0; i < daysCount; i++) {
      const currentDate = addDays(start, i);
      const dateStr = format(currentDate, 'yyyy-MM-dd');
      const dayOfWeek = currentDate.getDay();

      const basePrice = room.price_per_day;
      let finalPrice = basePrice;
      let appliedRule = null;

      const relevantRules = pricingRules.filter(r => !r.room_id || r.room_id === room.id);

      const specialDateRule = relevantRules.find(
        r => r.rule_type === 'special_date' && r.special_date === dateStr
      );

      if (specialDateRule) {
        appliedRule = specialDateRule;
      } else {
        const dowRule = relevantRules.find(
          r => r.rule_type === 'day_of_week' && r.day_of_week === dayOfWeek
        );
        if (dowRule) {
          appliedRule = dowRule;
        }
      }

      if (appliedRule) {
        hasRules = true;
        const val = Number(appliedRule.adjustment_value);
        if (appliedRule.adjustment_type === 'fixed') {
          finalPrice = val;
        } else if (appliedRule.adjustment_type === 'multiplier') {
          finalPrice = basePrice * val;
        } else if (appliedRule.adjustment_type === 'percentage') {
          finalPrice = basePrice * (1 + val / 100);
        }
      }

      total += finalPrice;
    }

    return { total: Math.round(total), avg: Math.round(total / daysCount), hasRules };
  };

  // Recalculate dynamic payment amount based on nights count and selected room
  useEffect(() => {
    if (selectedRoom) {
      setPaymentAmount(dynamicTotal);
    }
  }, [selectedRoom, dynamicTotal]);

  const handleStartBooking = (room: Room) => {
    setSelectedRoom(room);
    const calc = getRoomCalculation(room);
    setPaymentAmount(calc.total);
    setTimeout(() => {
      document.getElementById('booking-form-section')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleOpenPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName || !guestPhone || !guestEmail) {
      alert('Por favor, completa los campos de contacto obligatorios.');
      return;
    }
    setShowPayment(true);
  };

  const handlePaymentSuccess = async () => {
    if (!selectedRoom || !selectedCompanyId) return;
    
    setBookingLoading(true);
    setShowPayment(false);

    try {
      const { data, error } = await hotelRpc.createBooking({
        company_id: selectedCompanyId,
        room_id: selectedRoom.id,
        guest_name: guestName,
        guest_phone: guestPhone,
        guest_email: guestEmail,
        guest_rut: guestRut || undefined,
        check_in: checkIn,
        check_out: checkOut,
        total_price: paymentAmount,
        notes: notes || undefined,
      });

      if (error) throw error;

      const todayStr = format(new Date(), 'yyyy-MM-dd');
      if (checkIn === todayStr) {
        await hotelRpc.updateRoomStatus(selectedRoom.id, 'Occupied');
        setRooms(prev => prev.map(r => r.id === selectedRoom.id ? { ...r, status: 'Occupied' } : r));
      }

      const bookingResult = Array.isArray(data) ? data[0] : data;
      setExistingBookings(prev => [...prev, bookingResult as any]);
      setConfirmedBookingInfo(bookingResult);
      setBookingSuccess(true);
    } catch (err: any) {
      console.error('Error creating booking:', err);
      alert(`Error al guardar la reserva: ${err.message}`);
    } finally {
      setBookingLoading(false);
    }
  };

  const handleReset = () => {
    setBookingSuccess(false);
    setSelectedRoom(null);
    setGuestName('');
    setGuestPhone('');
    setGuestEmail('');
    setGuestRut('');
    setNotes('');
  };

  // Save changes to settings (Supabase remote)
  const handleSaveLandingSettings = async () => {
    if (!selectedCompanyId) return;
    setSaveSettingsLoading(true);
    try {
      const { error } = await hotelRpc.upsertSettings({
        companyId: selectedCompanyId,
        checkInTime: settings?.check_in_time || '14:00',
        checkOutTime: settings?.check_out_time || '11:00',
        themePrimary,
        themeIsDark: settings?.theme_is_dark !== false,
        heroTitle,
        heroSubtitle,
        aboutText,
        bannerUrl,
        features,
        logoUrl: logoUrl || undefined
      });

      if (error) throw error;
      alert('¡Landing Page actualizada y guardada correctamente en vivo!');
      window.dispatchEvent(new CustomEvent('hotel-settings-updated'));
      setIsEditorOpen(false);
    } catch (err: any) {
      alert(`Error al guardar cambios: ${err.message}`);
    } finally {
      setSaveSettingsLoading(false);
    }
  };

  // Quick Room Editing directly from public portal
  const handleOpenRoomEditor = (room: Room) => {
    setSelectedRoomToEdit(room);
    setRoomEditName(room.name);
    setRoomEditPrice(room.price_per_day);
    setRoomEditDesc(room.description || '');
    setRoomEditImageUrl(room.image_url || '');
    setRoomEditType(room.type);
    setActiveEditorTab('rooms');
    setIsEditorOpen(true);
  };

  const handleSaveRoomEdits = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoomToEdit) return;

    setRoomSaveLoading(true);
    try {
      const { error } = await hotelRpc.updateRoom({
        roomId: selectedRoomToEdit.id,
        name: roomEditName,
        pricePerDay: Number(roomEditPrice),
        description: roomEditDesc,
        imageUrl: roomEditImageUrl || undefined,
        type: roomEditType
      });

      if (error) throw error;

      // Update rooms local state
      setRooms(prev => prev.map(r => r.id === selectedRoomToEdit.id ? { 
        ...r, 
        name: roomEditName, 
        price_per_day: Number(roomEditPrice),
        description: roomEditDesc,
        image_url: roomEditImageUrl,
        type: roomEditType
      } : r));

      alert('¡Habitación actualizada correctamente!');
      setSelectedRoomToEdit(null);
    } catch (err: any) {
      alert(`Error al actualizar habitación: ${err.message}`);
    } finally {
      setRoomSaveLoading(false);
    }
  };

  // Maps standard feature strings to corresponding premium Lucide Icons
  const getFeatureIcon = (feature: string) => {
    const f = feature.toLowerCase();
    if (f.includes('wifi') || f.includes('internet')) return <Wifi className="w-5 h-5" />;
    if (f.includes('piscina') || f.includes('alberca') || f.includes('agua') || f.includes('spa') || f.includes('jacuzzi')) return <Waves className="w-5 h-5" />;
    if (f.includes('desayuno') || f.includes('café') || f.includes('comida') || f.includes('bar') || f.includes('restaurante')) return <Coffee className="w-5 h-5" />;
    if (f.includes('tv') || f.includes('cable') || f.includes('netflix') || f.includes('pantalla')) return <Tv className="w-5 h-5" />;
    return <Sparkles className="w-5 h-5" />;
  };

  const activeCompany = companies.find(c => c.id === selectedCompanyId);

  return (
    <div 
      className="space-y-12 pb-12"
      style={{ '--theme-primary': themePrimary } as React.CSSProperties}
    >
      {/* Live Editor Sticky Status Bar */}
      {isAdminForThisCompany && (
        <div className="bg-[#121c30]/90 backdrop-blur border border-emerald-500/20 p-4 rounded-3xl flex flex-col sm:flex-row justify-between items-center gap-3 shadow-lg shadow-emerald-500/5 relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-emerald-500" />
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <div className="text-left">
              <span className="text-xs font-black uppercase text-white block">Modo Edición en Vivo Activo</span>
              <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest block">
                Eres administrador. Los cambios se reflejarán instantáneamente para tus clientes.
              </span>
            </div>
          </div>
          <button
            onClick={() => {
              setSelectedRoomToEdit(rooms[0] || null);
              if (rooms[0]) {
                setRoomEditName(rooms[0].name);
                setRoomEditPrice(rooms[0].price_per_day);
                setRoomEditDesc(rooms[0].description || '');
                setRoomEditImageUrl(rooms[0].image_url || '');
                setRoomEditType(rooms[0].type);
              }
              setActiveEditorTab('cover');
              setIsEditorOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md active:scale-95 shrink-0"
          >
            <Edit3 className="w-3.5 h-3.5" />
            Editar Plantilla Modular
          </button>
        </div>
      )}

      {showPayment && selectedRoom && (
        <FlowPaymentMock
          amount={paymentAmount}
          email={guestEmail}
          guestName={guestName}
          roomName={`${selectedRoom.room_number} - ${selectedRoom.name} (${daysCount} noche${daysCount > 1 ? 's' : ''})`}
          onSuccess={handlePaymentSuccess}
          onCancel={() => setShowPayment(false)}
        />
      )}

      {bookingSuccess && confirmedBookingInfo && selectedRoom && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card max-w-2xl mx-auto p-8 text-center border border-emerald-500/20 relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 to-teal-400" />
          
          {logoUrl ? (
            <div className="h-24 w-auto max-w-[200px] flex items-center justify-center p-1 mx-auto mb-6 overflow-hidden">
              <img src={logoUrl} alt="Logo Hotel" className="h-full w-auto object-contain" />
            </div>
          ) : (
            <div className="w-16 h-16 bg-emerald-500/10 rounded-full border border-emerald-500/30 flex items-center justify-center mx-auto mb-6">
              <ShieldCheck className="w-8 h-8 text-emerald-500 animate-bounce" />
            </div>
          )}

          <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2">¡Reserva Confirmada!</h2>
          <p className="text-sm text-slate-500 uppercase tracking-widest font-black mb-8">Pago procesado vía Flow.cl</p>

          <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200/60 text-left space-y-4 mb-8">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-xs text-slate-500 uppercase font-black block">Huésped</span>
                <span className="text-slate-800 font-bold">{guestName}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 uppercase font-black block">Habitación</span>
                <span className="text-slate-800 font-bold">{selectedRoom.room_number} — {selectedRoom.name}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 uppercase font-black block">Check-in</span>
                <span className="text-slate-800 font-bold">
                  {format(parseISO(checkIn), "dd 'de' MMMM, yyyy", { locale: es })}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-500 uppercase font-black block">Check-out</span>
                <span className="text-slate-800 font-bold">
                  {format(parseISO(checkOut), "dd 'de' MMMM, yyyy", { locale: es })}
                </span>
              </div>
            </div>
            <div className="h-[1px] bg-slate-200 my-2" />
            <div className="flex justify-between items-center text-sm font-black">
              <span className="text-slate-500 uppercase">Monto Total Pagado</span>
              <span className="text-emerald-600 text-lg">${paymentAmount.toLocaleString('es-CL')} CLP</span>
            </div>
          </div>

          <button
            onClick={handleReset}
            className="btn-primary mx-auto tracking-widest text-xs uppercase"
            style={{ backgroundColor: 'var(--theme-primary)' }}
          >
            Hacer otra reserva
          </button>
        </motion.div>
      )}

      {!bookingSuccess && (
        <div className="space-y-16">
          {/* Dynamic Hero Section with Parallax Background & Custom Title */}
          <div className="relative h-[480px] rounded-3xl overflow-hidden flex items-end p-8 md:p-12 border border-white/5 shadow-2xl group keep-dark">
            <div 
              className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
              style={{ backgroundImage: `url(${bannerUrl})` }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#090d16] via-[#090d16]/50 to-transparent" />
            
            <div className="relative z-10 max-w-2xl space-y-4 text-left">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 bg-white/10 backdrop-blur rounded-lg text-[9px] font-black uppercase tracking-widest text-white border border-white/15">
                  Estadía Premium
                </span>
                {isAdminForThisCompany && (
                  <button
                    onClick={() => {
                      setActiveEditorTab('cover');
                      setIsEditorOpen(true);
                    }}
                    className="p-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-all scale-90"
                    title="Editar Título y Portada"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-none uppercase">
                {heroTitle}
              </h1>
              
              <p className="text-sm md:text-base text-slate-300 font-medium max-w-xl leading-relaxed">
                {heroSubtitle}
              </p>

              <div className="pt-2">
                <button 
                  onClick={() => document.getElementById('booking-portal-content')?.scrollIntoView({ behavior: 'smooth' })}
                  className="px-6 py-3 rounded-none text-[10px] font-black uppercase tracking-[0.2em] text-white flex items-center gap-2 transition-all hover:translate-y-[-2px] shadow-lg shadow-black/30 border-none outline-none cursor-pointer"
                  style={{ backgroundColor: themePrimary }}
                >
                  Reservar Habitación
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Core Content Booking Section */}
          <div id="booking-portal-content" className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start scroll-mt-24">
            
            {/* Left panel: Filters, About, Amenities, and Room Grid */}
            <div className="lg:col-span-8 space-y-12">
              
              {/* Hotel History & Presentation Section */}
              <div id="about-section" className="relative group glass-card p-6 md:p-8 border border-white/5 grid grid-cols-1 md:grid-cols-12 gap-6 items-center scroll-mt-24">
                {isAdminForThisCompany && (
                  <button
                    onClick={() => {
                      setActiveEditorTab('history');
                      setIsEditorOpen(true);
                    }}
                    className="absolute top-4 right-4 p-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-all opacity-0 group-hover:opacity-100 shadow-md"
                    title="Editar Historia"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                )}

                {/* Left side: Premium Image */}
                <div className="md:col-span-5 h-48 md:h-full min-h-[180px] rounded-2xl overflow-hidden relative border border-white/10 shadow-lg shadow-black/20">
                  <img 
                    src="https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80" 
                    alt="Hotel lobby" 
                    className="w-full h-full object-cover" 
                  />
                  <div className="absolute inset-0 bg-blue-600/10" />
                </div>

                {/* Right side: Story & Contact */}
                <div className="md:col-span-7 space-y-4 text-left">
                  <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-widest block">Nuestra Identidad</span>
                  <h2 className="text-xl md:text-2xl font-black text-white uppercase tracking-tight">
                    Sobre {activeCompany?.name || 'Nosotros'}
                  </h2>
                  <p className="text-xs md:text-sm text-slate-400 leading-relaxed font-medium">
                    {aboutText}
                  </p>
                  
                  {/* Hotel Coordinates */}
                  <div className="grid grid-cols-2 gap-3 pt-2 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    {activeCompany?.phone && (
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-500" />
                        <span>{activeCompany.phone}</span>
                      </div>
                    )}
                    {activeCompany?.email && (
                      <div className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-slate-500" />
                        <span>{activeCompany.email}</span>
                      </div>
                    )}
                    {activeCompany?.address && (
                      <div className="col-span-2 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-slate-500" />
                        <span>{activeCompany.address} {activeCompany.city && `, ${activeCompany.city}`}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Amenities Grid ("Servicios Exclusivos") */}
              <div id="services-section" className="relative group glass-card p-6 md:p-8 border border-white/5 space-y-6 text-left scroll-mt-24">
                {isAdminForThisCompany && (
                  <button
                    onClick={() => {
                      setActiveEditorTab('services');
                      setIsEditorOpen(true);
                    }}
                    className="absolute top-4 right-4 p-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-all opacity-0 group-hover:opacity-100 shadow-md"
                    title="Editar Servicios"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                )}

                <div>
                  <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-widest block">Amenidades y Comodidad</span>
                  <h2 className="text-xl font-black text-white uppercase tracking-tight">Servicios de Clase Mundial</h2>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {features.map((feat, idx) => (
                    <div 
                      key={idx}
                      className="p-4 bg-white/5 border border-white/5 rounded-2xl flex flex-col items-center justify-center text-center gap-2.5 transition-all hover:scale-105 hover:bg-white/10"
                    >
                      <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-white" style={{ color: 'var(--theme-primary)', backgroundColor: `${themePrimary}15` }}>
                        {getFeatureIcon(feat)}
                      </div>
                      <span className="text-[10px] font-black uppercase text-slate-300 tracking-wider line-clamp-2 leading-tight">
                        {feat}
                      </span>
                    </div>
                  ))}
                  {features.length === 0 && (
                    <p className="col-span-4 text-center text-xs text-slate-500 font-bold uppercase tracking-wider py-4">Sin servicios configurados.</p>
                  )}
                </div>
              </div>

              {/* Booking Controls & Search Dates */}
              <div className="glass-card p-6 border-white/5 space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-white/5 pb-4">
                  <div className="text-left">
                    <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Calendar className="w-4 h-4" style={{ color: 'var(--theme-primary)' }} />
                      Fechas de Estadía
                    </h3>
                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">
                      Introduce tus fechas para filtrar habitaciones disponibles
                    </p>
                  </div>
                  
                  {/* Client Portal Selector */}
                  <div className="w-full sm:w-48 shrink-0">
                    <select
                      value={selectedCompanyId}
                      onChange={(e) => setSelectedCompanyId(e.target.value)}
                      className="w-full px-3 py-2 bg-[#0e1726] border border-white/5 rounded-xl text-white font-extrabold text-[10px] uppercase outline-none cursor-pointer"
                    >
                      {companies.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1 text-left">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Fecha de Ingreso (Check-in)</label>
                    <input
                      type="date"
                      value={checkIn}
                      min={format(new Date(), 'yyyy-MM-dd')}
                      onChange={handleCheckInChange}
                      className="w-full px-4 py-2.5 bg-[#131c2e] border border-white/5 rounded-xl text-white font-bold outline-none text-xs"
                    />
                  </div>

                  <div className="space-y-1 text-left">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Fecha de Salida (Check-out)</label>
                    <input
                      type="date"
                      value={checkOut}
                      min={format(addDays(parseISO(checkIn), 1), 'yyyy-MM-dd')}
                      onChange={(e) => setCheckOut(e.target.value)}
                      className="w-full px-4 py-2.5 bg-[#131c2e] border border-white/5 rounded-xl text-white font-bold outline-none text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Rooms List Grid */}
              <div className="space-y-4">
                <h2 className="text-lg font-black text-white uppercase tracking-wider text-left">
                  Tarifas y Habitaciones ({daysCount} noche{daysCount > 1 ? 's' : ''})
                </h2>

                {loading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-44 w-full bg-slate-800 animate-pulse rounded-2xl" />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {rooms.map(room => {
                      const available = isRoomAvailable(room.id);
                      const isSelected = selectedRoom?.id === room.id;
                      const coverImage = room.image_url || ROOM_FALLBACK_IMAGES[room.type as keyof typeof ROOM_FALLBACK_IMAGES] || ROOM_FALLBACK_IMAGES.Single;
                      const { total: roomTotal, avg: roomAvg, hasRules: roomHasRules } = getRoomCalculation(room);

                      return (
                        <div 
                          key={room.id}
                          className={`group glass-card overflow-hidden border transition-all flex flex-col md:flex-row relative text-left ${
                            available ? 'border-white/5' : 'border-red-500/10 opacity-60'
                          }`}
                          style={{
                            borderColor: isSelected ? 'var(--theme-primary)' : 'rgba(255,255,255,0.05)',
                            boxShadow: isSelected ? `0 0 15px ${themePrimary}20` : 'none'
                          }}
                        >
                          {/* Live room pencil edit trigger */}
                          {isAdminForThisCompany && (
                            <button
                              onClick={() => handleOpenRoomEditor(room)}
                              className="absolute top-3 right-3 z-20 p-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-all shadow-lg active:scale-95"
                              title="Editar Habitación Rápido"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Left: Thumbnail cover */}
                          <div className="md:w-56 h-48 md:h-auto shrink-0 relative overflow-hidden bg-[#0d1424] border-r border-white/5">
                            <img 
                              src={coverImage} 
                              alt={room.name} 
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                            />
                            <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-black/60 to-transparent pointer-events-none" />
                            <span className="absolute bottom-3 left-3 px-2 py-0.5 bg-[#090d16]/80 backdrop-blur rounded font-black text-[9px] tracking-wide text-blue-400 border border-white/5 uppercase">
                              #{room.room_number}
                            </span>
                          </div>

                          {/* Right: Content details */}
                          <div className="flex-1 p-6 flex flex-col justify-between gap-4">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <h3 className="font-extrabold text-white text-base leading-snug">{room.name}</h3>
                                <span className="px-2 py-0.5 bg-white/5 rounded text-[8px] font-extrabold uppercase text-slate-400 tracking-wider">
                                  {room.type}
                                </span>
                              </div>
                              <p className="text-xs text-slate-400 leading-relaxed font-medium">
                                {room.description || 'Habitación equipada con comodidades de primer nivel y ambiente impecable.'}
                              </p>
                              
                              <div className="flex items-center gap-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider pt-1">
                                {available ? (
                                  <span className="text-emerald-400 font-black flex items-center gap-1">
                                    <Check className="w-3.5 h-3.5" /> Disponible para tus fechas
                                  </span>
                                ) : (
                                  <span className="text-red-400 font-black">No Disponible (Reservado)</span>
                                )}
                              </div>
                            </div>

                            <div className="flex justify-between items-center border-t border-white/5 pt-4">
                              <div>
                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">
                                  {daysCount > 1 ? 'Promedio por noche' : 'Precio por noche'}
                                </span>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-base font-black text-white">
                                    ${(daysCount > 1 ? roomAvg : roomTotal).toLocaleString('es-CL')} CLP
                                  </span>
                                  {roomHasRules && (
                                    <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-md text-[8px] font-extrabold uppercase tracking-wider">
                                      Tarifa Especial
                                    </span>
                                  )}
                                </div>
                                {daysCount > 1 && (
                                  <span className="text-[9px] font-bold text-slate-400 block mt-0.5">
                                    Total: ${roomTotal.toLocaleString('es-CL')} por {daysCount} noches
                                  </span>
                                )}
                              </div>
                              
                              {available && (
                                <button
                                  onClick={() => handleStartBooking(room)}
                                  className={`px-5 py-2.5 rounded-none text-[10px] font-extrabold uppercase tracking-[0.2em] transition-all cursor-pointer border-none outline-none ${
                                    isSelected 
                                      ? 'text-white shadow-lg' 
                                      : 'bg-white/5 text-slate-350 hover:bg-slate-800'
                                  }`}
                                  style={{
                                    backgroundColor: isSelected ? themePrimary : '',
                                    boxShadow: isSelected ? `0 4px 12px ${themePrimary}4d` : ''
                                  }}
                                >
                                  {isSelected ? 'Seleccionada' : 'Reservar'}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {rooms.length === 0 && (
                      <div className="text-center py-12 bg-white/5 rounded-3xl border border-dashed border-white/5">
                        <Bed className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                        <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">No hay habitaciones registradas en este hotel</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Right panel: Booking Registration Form */}
            <div className="lg:col-span-4 lg:sticky lg:top-8">
              <div id="booking-form-section" className="glass-card p-6 border border-white/5 space-y-6 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: 'var(--theme-primary)' }} />
                
                <div className="border-b border-slate-100 pb-4 text-left">
                  <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                    Detalles de la Reserva
                  </h2>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
                    {activeCompany?.name || 'Hotel'}
                  </p>
                </div>

                {logoUrl && (
                  <div className="w-full flex justify-center py-8 bg-slate-50 rounded-none border border-slate-200/60 shadow-sm">
                    <img src={logoUrl} alt="Logo" className="h-28 max-w-[90%] object-contain" />
                  </div>
                )}

                {selectedRoom ? (
                  <form onSubmit={handleOpenPayment} className="space-y-4">
                    {/* Inputs de fecha interactivos integrados en la tarjeta lateral */}
                    <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-2xl space-y-3">
                      <span className="text-[10px] text-slate-700 font-black uppercase tracking-wider block border-b border-slate-200 pb-1.5">
                        Ajustar Fechas de Estadía
                      </span>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1 text-left">
                          <label className="text-[8px] font-black text-slate-550 uppercase tracking-widest">Check-in</label>
                          <input
                            type="date"
                            value={checkIn}
                            min={format(new Date(), 'yyyy-MM-dd')}
                            onChange={handleCheckInChange}
                            className="w-full px-2 py-1.5 bg-white border border-slate-350 rounded-lg text-slate-800 font-bold outline-none text-[11px] cursor-pointer"
                          />
                        </div>
                        <div className="space-y-1 text-left">
                          <label className="text-[8px] font-black text-slate-550 uppercase tracking-widest">Check-out</label>
                          <input
                            type="date"
                            value={checkOut}
                            min={format(addDays(parseISO(checkIn), 1), 'yyyy-MM-dd')}
                            onChange={(e) => setCheckOut(e.target.value)}
                            className="w-full px-2 py-1.5 bg-white border border-slate-350 rounded-lg text-slate-800 font-bold outline-none text-[11px] cursor-pointer"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Summary Box */}
                    <div className="bg-[#121c30] rounded-2xl p-4 border border-white/5 space-y-2 text-xs text-left">
                      <div className="flex justify-between">
                        <span className="text-slate-500 uppercase font-black">Habitación</span>
                        <span className="text-white font-bold">#{selectedRoom.room_number} — {selectedRoom.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 uppercase font-black">Noches</span>
                        <span className="text-white font-bold">{daysCount} noche{daysCount > 1 ? 's' : ''}</span>
                      </div>
                      
                      {/* Desglose interactivo noche a noche */}
                      {pricingBreakdown.length > 0 && (
                        <div className="bg-[#090d16]/60 rounded-xl p-3 border border-white/5 space-y-2 mt-2">
                          <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest block border-b border-white/5 pb-1">
                            Desglose de Tarifas
                          </span>
                          <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                            {pricingBreakdown.map((item, idx) => (
                              <div key={idx} className="flex justify-between items-start text-[10px]">
                                <div className="text-slate-350">
                                  <span className="capitalize">{format(item.date, "eeee dd 'de' MMM", { locale: es })}</span>
                                  {item.ruleName && (
                                    <span className="text-[8px] text-emerald-455 font-black block uppercase tracking-tight leading-none mt-0.5" style={{ color: '#10b981' }}>
                                      {item.ruleName}
                                    </span>
                                  )}
                                </div>
                                <div className="text-right">
                                  <span className="text-white font-bold">
                                    ${item.finalPrice.toLocaleString('es-CL')}
                                  </span>
                                  {item.ruleName && (
                                    <span className="text-[8px] text-slate-500 block line-through">
                                      ${item.basePrice.toLocaleString('es-CL')}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="h-[1px] bg-white/5 my-1" />
                      <div className="flex justify-between items-center text-sm font-black pt-1">
                        <span className="text-slate-400 uppercase">Monto Total</span>
                        <span className="text-orange-400">${paymentAmount.toLocaleString('es-CL')} CLP</span>
                      </div>
                    </div>

                    {/* Form Inputs */}
                    <div className="space-y-3 text-left">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1">
                          <User className="w-3 h-3" /> Nombre Huésped *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Nombre y Apellido"
                          value={guestName}
                          onChange={(e) => setGuestName(e.target.value)}
                          className="w-full px-4 py-2.5 bg-[#131c2e] border border-white/5 rounded-xl text-white font-bold outline-none text-xs"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1">
                          <Phone className="w-3 h-3" /> WhatsApp de Contacto *
                        </label>
                        <input
                          type="tel"
                          required
                          placeholder="Ej: +56 9 1234 5678"
                          value={guestPhone}
                          onChange={(e) => setGuestPhone(e.target.value)}
                          className="w-full px-4 py-2.5 bg-[#131c2e] border border-white/5 rounded-xl text-white font-bold outline-none text-xs"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1">
                          <Mail className="w-3 h-3" /> Correo Electrónico *
                        </label>
                        <input
                          type="email"
                          required
                          placeholder="ejemplo@correo.com"
                          value={guestEmail}
                          onChange={(e) => setGuestEmail(e.target.value)}
                          className="w-full px-4 py-2.5 bg-[#131c2e] border border-white/5 rounded-xl text-white font-bold outline-none text-xs"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1">
                          <FileText className="w-3 h-3" /> RUT (Para facturación)
                        </label>
                        <input
                          type="text"
                          placeholder="Ej: 12.345.678-9"
                          value={guestRut}
                          onChange={(e) => setGuestRut(e.target.value)}
                          className="w-full px-4 py-2.5 bg-[#131c2e] border border-white/5 rounded-xl text-white font-bold outline-none text-xs"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Notas adicionales</label>
                        <textarea
                          rows={2}
                          placeholder="Peticiones especiales, horario de arribo, etc."
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          className="w-full px-4 py-2.5 bg-[#131c2e] border border-white/5 rounded-xl text-white font-medium outline-none text-xs resize-none"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={bookingLoading}
                      className="w-full py-4 text-white rounded-none font-black uppercase tracking-[0.2em] text-[10px] transition-all flex items-center justify-center gap-2 active:scale-[0.98] shadow-lg cursor-pointer border-none outline-none"
                      style={{ 
                        backgroundColor: themePrimary, 
                        boxShadow: `0 4px 14px ${themePrimary}4d` 
                      }}
                    >
                      {bookingLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <span>Proceder al Pago con Flow</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </form>
                ) : (
                  <div className="text-center py-8 text-slate-500 space-y-2">
                    <Bed className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                    <p className="text-xs uppercase font-black tracking-wider">Sin selección</p>
                    <p className="text-xs font-medium">Elige una habitación disponible a la izquierda para iniciar tu reserva.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Slide-over Panel (Modo Edición en Vivo) */}
      <AnimatePresence>
        {isEditorOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex justify-end"
            onClick={() => setIsEditorOpen(false)}
          >
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="w-full max-w-lg bg-[#0d1424] border-l border-white/10 h-full overflow-hidden flex flex-col relative shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Slideover Header */}
              <div className="p-6 border-b border-white/5 flex justify-between items-center bg-[#0e1726]/60">
                <div className="text-left">
                  <h3 className="text-base font-black text-white uppercase tracking-tight flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    Editor en Vivo
                  </h3>
                  <p className="text-[9px] text-slate-500 font-extrabold uppercase tracking-widest mt-0.5">
                    Personaliza la Landing de {activeCompany?.name}
                  </p>
                </div>
                <button
                  onClick={() => setIsEditorOpen(false)}
                  className="p-2 hover:bg-white/5 text-slate-400 hover:text-white rounded-xl transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Navigation Tabs */}
              <div className="flex border-b border-white/5 p-2 bg-[#0a0f18] shrink-0 overflow-x-auto">
                <button
                  onClick={() => setActiveEditorTab('cover')}
                  className={`flex-1 py-2 px-3 text-[10px] font-black uppercase tracking-wider rounded-lg transition-colors flex items-center justify-center gap-1 ${
                    activeEditorTab === 'cover' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  Hero
                </button>
                <button
                  onClick={() => setActiveEditorTab('history')}
                  className={`flex-1 py-2 px-3 text-[10px] font-black uppercase tracking-wider rounded-lg transition-colors flex items-center justify-center gap-1 ${
                    activeEditorTab === 'history' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <History className="w-3.5 h-3.5" />
                  Historia
                </button>
                <button
                  onClick={() => setActiveEditorTab('services')}
                  className={`flex-1 py-2 px-3 text-[10px] font-black uppercase tracking-wider rounded-lg transition-colors flex items-center justify-center gap-1 ${
                    activeEditorTab === 'services' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Palette className="w-3.5 h-3.5" />
                  Servicios
                </button>
                <button
                  onClick={() => {
                    setActiveEditorTab('rooms');
                    if (rooms.length > 0 && !selectedRoomToEdit) {
                      handleOpenRoomEditor(rooms[0]);
                    }
                  }}
                  className={`flex-1 py-2 px-3 text-[10px] font-black uppercase tracking-wider rounded-lg transition-colors flex items-center justify-center gap-1 ${
                    activeEditorTab === 'rooms' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Bed className="w-3.5 h-3.5" />
                  Habitación
                </button>
              </div>

              {/* Editor Fields Scrollable Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 text-left">
                {/* 1. Tab Cover/Portada */}
                {activeEditorTab === 'cover' && (
                  <div className="space-y-4">
                     <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Título de Bienvenida (Hero Title)</label>
                      <input
                        type="text"
                        value={heroTitle}
                        onChange={(e) => setHeroTitle(e.target.value)}
                        className="w-full px-4 py-2.5 bg-[#131c2e] border border-white/5 rounded-xl text-white font-bold outline-none text-xs"
                      />
                    </div>

                    <div className="space-y-3">
                      <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider block">Logotipo del Hotel</label>
                      
                      {/* File Upload Input */}
                      <div className="bg-[#131c2e] p-4 rounded-xl border border-white/5 space-y-2 text-center">
                        <span className="text-[9px] font-extrabold text-slate-400 block uppercase tracking-wider leading-tight">Subir archivo de imagen (PNG, JPG, SVG)</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setLogoUrl(reader.result as string);
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                          className="hidden"
                          id="logo-file-upload-live"
                        />
                        <label
                          htmlFor="logo-file-upload-live"
                          className="inline-block px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[9px] font-black uppercase tracking-widest cursor-pointer transition-colors mt-1"
                        >
                          Seleccionar Archivo de Logo
                        </label>
                      </div>

                      {/* Or URL input */}
                      <div className="space-y-1">
                        <span className="text-[8px] font-black uppercase text-slate-500 block">O ingresa la URL de la imagen del logotipo:</span>
                        <input
                          type="text"
                          value={logoUrl}
                          onChange={(e) => setLogoUrl(e.target.value)}
                          placeholder="https://ejemplo.com/logo.png"
                          className="w-full px-4 py-2.5 bg-[#131c2e] border border-white/5 rounded-xl text-white font-bold outline-none text-xs"
                        />
                      </div>

                      {logoUrl && (
                        <div className="mt-2 p-2 bg-[#0e1726] rounded-xl inline-block border border-white/5 relative group">
                          <img src={logoUrl} alt="Vista previa logo" className="h-10 object-contain rounded" onError={(e) => { (e.target as any).style.display = 'none'; }} />
                          <button
                            type="button"
                            onClick={() => setLogoUrl('')}
                            className="absolute -top-1.5 -right-1.5 bg-red-600 hover:bg-red-700 text-white p-1 rounded-full text-[8px] font-black w-4 h-4 flex items-center justify-center shadow-lg border border-red-700"
                            title="Quitar Logo"
                          >
                            ×
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Subtítulo Hero</label>
                      <textarea
                        rows={3}
                        value={heroSubtitle}
                        onChange={(e) => setHeroSubtitle(e.target.value)}
                        className="w-full px-4 py-2.5 bg-[#131c2e] border border-white/5 rounded-xl text-white font-medium outline-none text-xs resize-none"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider">URL del Banner Principal</label>
                      <input
                        type="text"
                        value={bannerUrl}
                        onChange={(e) => setBannerUrl(e.target.value)}
                        className="w-full px-4 py-2.5 bg-[#131c2e] border border-white/5 rounded-xl text-white font-bold outline-none text-xs"
                      />
                      {/* Presets banner */}
                      <span className="text-[8px] font-black uppercase text-slate-500 block mt-1">Presets Recomendados:</span>
                      <div className="grid grid-cols-2 gap-2">
                        {LANDING_BANNER_PRESETS.map((p, idx) => (
                          <button
                            key={idx}
                            onClick={() => setBannerUrl(p.url)}
                            className={`group relative h-12 rounded-lg overflow-hidden border transition-all ${
                              bannerUrl === p.url ? 'border-emerald-500 scale-[0.98]' : 'border-white/5 hover:border-white/20'
                            }`}
                          >
                            <img src={p.url} alt={p.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform" />
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center p-1">
                              <span className="text-[8px] font-extrabold text-white text-center leading-none">{p.name}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. Tab History/Nosotros */}
                {activeEditorTab === 'history' && (
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Historia / Descripción del Hotel</label>
                      <textarea
                        rows={8}
                        value={aboutText}
                        onChange={(e) => setAboutText(e.target.value)}
                        className="w-full px-4 py-3 bg-[#131c2e] border border-white/5 rounded-xl text-white font-medium outline-none text-xs resize-y"
                        placeholder="Cuenta de forma elegante la historia, servicios o entorno del hotel..."
                      />
                    </div>
                  </div>
                )}

                {/* 3. Tab Services/Color */}
                {activeEditorTab === 'services' && (
                  <div className="space-y-6">
                    {/* Brand Primary Color */}
                    <div className="space-y-2">
                      <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider block">Color de Marca (Botones y Detalles)</label>
                      <div className="flex gap-3 items-center">
                        <input
                          type="color"
                          value={themePrimary}
                          onChange={(e) => setThemePrimary(e.target.value)}
                          className="w-12 h-12 border-0 bg-transparent rounded-lg cursor-pointer shrink-0"
                        />
                        <div>
                          <code className="text-xs uppercase font-black text-slate-300 block">{themePrimary}</code>
                          <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest block mt-0.5">
                            Modifica este selector para cambiar la paleta al instante
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Features/Amenities Management */}
                    <div className="space-y-2 border-t border-white/5 pt-4">
                      <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider block">Gestor de Amenidades</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newFeatureTag}
                          onChange={(e) => setNewFeatureTag(e.target.value)}
                          placeholder="Añadir ej: Jacuzzi Privado"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              if (newFeatureTag.trim() && !features.includes(newFeatureTag.trim())) {
                                setFeatures(prev => [...prev, newFeatureTag.trim()]);
                                setNewFeatureTag('');
                              }
                            }
                          }}
                          className="w-full px-4 py-2.5 bg-[#131c2e] border border-white/5 rounded-xl text-white font-bold outline-none text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (newFeatureTag.trim() && !features.includes(newFeatureTag.trim())) {
                              setFeatures(prev => [...prev, newFeatureTag.trim()]);
                              setNewFeatureTag('');
                            }
                          }}
                          className="px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-colors"
                        >
                          Añadir
                        </button>
                      </div>

                      {/* Tag List display */}
                      <div className="flex flex-wrap gap-1.5 pt-2">
                        {features.map((feat, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-1.5 px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-[10px] font-extrabold text-slate-300"
                          >
                            <span>{feat}</span>
                            <button
                              type="button"
                              onClick={() => setFeatures(prev => prev.filter(f => f !== feat))}
                              className="text-slate-500 hover:text-red-400 transition-colors"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. Tab Rooms visual selector & content update */}
                {activeEditorTab === 'rooms' && (
                  <div className="space-y-6">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Selecciona Habitación a Editar</label>
                      <select
                        value={selectedRoomToEdit?.id || ''}
                        onChange={(e) => {
                          const room = rooms.find(r => r.id === e.target.value);
                          if (room) {
                            setSelectedRoomToEdit(room);
                            setRoomEditName(room.name);
                            setRoomEditPrice(room.price_per_day);
                            setRoomEditDesc(room.description || '');
                            setRoomEditImageUrl(room.image_url || '');
                            setRoomEditType(room.type);
                          }
                        }}
                        className="w-full px-4 py-2.5 bg-[#131c2e] border border-white/5 rounded-xl text-white font-bold outline-none text-xs cursor-pointer"
                      >
                        {rooms.map(r => (
                          <option key={r.id} value={r.id}>#{r.room_number} — {r.name}</option>
                        ))}
                      </select>
                    </div>

                    {selectedRoomToEdit && (
                      <form onSubmit={handleSaveRoomEdits} className="space-y-4 bg-white/5 border border-white/5 p-4 rounded-2xl">
                        <div className="border-b border-white/5 pb-2">
                          <span className="text-[9px] font-extrabold text-slate-500 uppercase tracking-widest">
                            Editando Registro Habitación #{selectedRoomToEdit.room_number}
                          </span>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Nombre Habitación</label>
                          <input
                            type="text"
                            required
                            value={roomEditName}
                            onChange={(e) => setRoomEditName(e.target.value)}
                            className="w-full px-3 py-2 bg-[#131c2e] border border-white/5 rounded-xl text-white font-bold outline-none text-xs"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Tipo</label>
                            <select
                              value={roomEditType}
                              onChange={(e) => setRoomEditType(e.target.value as any)}
                              className="w-full px-3 py-2 bg-[#131c2e] border border-white/5 rounded-xl text-white font-bold outline-none text-xs"
                            >
                              <option value="Single">Single</option>
                              <option value="Double">Double</option>
                              <option value="Suite">Suite</option>
                              <option value="Deluxe">Deluxe</option>
                            </select>
                          </div>
                          
                          <div className="space-y-1">
                            <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Tarifa Diaria ($)</label>
                            <input
                              type="number"
                              required
                              value={roomEditPrice}
                              onChange={(e) => setRoomEditPrice(Number(e.target.value))}
                              className="w-full px-3 py-2 bg-[#131c2e] border border-white/5 rounded-xl text-white font-bold outline-none text-xs"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Descripción Breve</label>
                          <textarea
                            rows={2}
                            value={roomEditDesc}
                            onChange={(e) => setRoomEditDesc(e.target.value)}
                            className="w-full px-3 py-2 bg-[#131c2e] border border-white/5 rounded-xl text-white font-medium outline-none text-xs resize-none"
                          />
                        </div>

                        {/* Room Image Selection */}
                        <div className="space-y-2">
                          <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Enlace de Foto Habitación (URL)</label>
                          <input
                            type="text"
                            value={roomEditImageUrl}
                            onChange={(e) => setRoomEditImageUrl(e.target.value)}
                            className="w-full px-3 py-2 bg-[#131c2e] border border-white/5 rounded-xl text-white font-bold outline-none text-xs"
                            placeholder="https://..."
                          />

                          {/* Quick presets for selected room type */}
                          <span className="text-[8px] font-black uppercase text-slate-500 block">Presets Recomendados ({roomEditType}):</span>
                          <div className="grid grid-cols-2 gap-2">
                            {ROOM_PRESETS[roomEditType as keyof typeof ROOM_PRESETS]?.map((p, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => setRoomEditImageUrl(p.url)}
                                className={`group relative h-10 rounded-lg overflow-hidden border transition-all ${
                                  roomEditImageUrl === p.url ? 'border-emerald-500 scale-[0.98]' : 'border-white/5 hover:border-white/20'
                                }`}
                              >
                                <img src={p.url} alt={p.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center p-1">
                                  <span className="text-[8px] font-extrabold text-white text-center leading-none">{p.name}</span>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>

                        <button
                          type="submit"
                          disabled={roomSaveLoading}
                          className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-extrabold uppercase tracking-widest transition-all flex items-center justify-center gap-1"
                        >
                          {roomSaveLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                          Actualizar Habitación
                        </button>
                      </form>
                    )}
                  </div>
                )}
              </div>

              {/* Editor Actions Footer (Guardar Cambios globales) */}
              <div className="p-6 border-t border-white/5 bg-[#0a0f18] shrink-0">
                <button
                  type="button"
                  onClick={handleSaveLandingSettings}
                  disabled={saveSettingsLoading}
                  className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-extrabold uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-1.5 shadow-lg active:scale-95"
                >
                  {saveSettingsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Guardar Plantilla Modular
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
