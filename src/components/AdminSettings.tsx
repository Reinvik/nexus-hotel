import React, { useState, useEffect } from 'react';
import { hotelRpc } from '../lib/supabase';
import type { Room } from '../types';
import { 
  Loader2, KeyRound, Palette, Bed, Save, Plus, Trash2, Mail, Building, Phone, MapPin, 
  Image, Sparkles, X, Calendar, Wifi, Waves, Coffee, Tv, Car, Flame, Wind, Key, Utensils, 
  Shield, Wine, Bike, Bath
} from 'lucide-react';

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

const LANDING_BANNER_PRESETS = [
  { name: 'Resort Paradisíaco', url: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1200&q=80' },
  { name: 'Lobby Elegante', url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80' },
  { name: 'Boutique Urbano', url: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=1200&q=80' },
  { name: 'Cabaña de Montaña', url: 'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&w=1200&q=80' }
];

const AVAILABLE_ICONS = [
  { id: 'Sparkles', name: 'Destacado', component: Sparkles },
  { id: 'Wifi', name: 'Internet / Wifi', component: Wifi },
  { id: 'Coffee', name: 'Desayuno / Café', component: Coffee },
  { id: 'Car', name: 'Estacionamiento / Auto', component: Car },
  { id: 'Waves', name: 'Piscina / Spa / Jacuzzi', component: Waves },
  { id: 'Tv', name: 'Televisión / Tv', component: Tv },
  { id: 'Flame', name: 'Calefacción', component: Flame },
  { id: 'Wind', name: 'Aire Acondicionado', component: Wind },
  { id: 'Key', name: 'Cerradura / Llave', component: Key },
  { id: 'Utensils', name: 'Restaurante / Comida', component: Utensils },
  { id: 'Shield', name: 'Seguridad', component: Shield },
  { id: 'Bed', name: 'Cama / Descanso', component: Bed },
  { id: 'Wine', name: 'Bar / Bebidas', component: Wine },
  { id: 'Bike', name: 'Bicicleta / Actividades', component: Bike },
  { id: 'Bath', name: 'Tina / Baño', component: Bath }
];

const getFeatureLabel = (feature: string) => {
  if (feature.includes('||')) {
    return feature.split('||')[0];
  }
  return feature;
};

const getFeatureIcon = (feature: string) => {
  let iconId = '';
  let name = feature;
  if (feature.includes('||')) {
    const parts = feature.split('||');
    name = parts[0];
    iconId = parts[1];
  }
  
  if (iconId) {
    const found = AVAILABLE_ICONS.find(i => i.id === iconId);
    if (found) {
      const IconComponent = found.component;
      return <IconComponent className="w-4 h-4" />;
    }
  }
  
  const f = name.toLowerCase();
  if (f.includes('wifi') || f.includes('internet')) return <Wifi className="w-4 h-4" />;
  if (f.includes('piscina') || f.includes('alberca') || f.includes('agua') || f.includes('spa') || f.includes('jacuzzi') || f.includes('tina')) return <Waves className="w-4 h-4" />;
  if (f.includes('desayuno') || f.includes('café') || f.includes('cafe') || f.includes('comida') || f.includes('bar') || f.includes('restaurante')) return <Coffee className="w-4 h-4" />;
  if (f.includes('tv') || f.includes('cable') || f.includes('netflix') || f.includes('pantalla')) return <Tv className="w-4 h-4" />;
  if (f.includes('estacionamiento') || f.includes('auto') || f.includes('cochera') || f.includes('parking') || f.includes('vehiculo')) return <Car className="w-4 h-4" />;
  if (f.includes('aire') || f.includes('clima') || f.includes('wind')) return <Wind className="w-4 h-4" />;
  if (f.includes('calefac') || f.includes('chimenea') || f.includes('fuego')) return <Flame className="w-4 h-4" />;
  if (f.includes('llave') || f.includes('domotica') || f.includes('domotizado') || f.includes('key')) return <Key className="w-4 h-4" />;
  return <Sparkles className="w-4 h-4" />;
};

interface AdminSettingsProps {
  companyId: string;
}

export function AdminSettings({ companyId }: AdminSettingsProps) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

  // Form states for general info
  const [companyName, setCompanyName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  // Form states for Flow
  const [flowApiKey, setFlowApiKey] = useState('');
  const [flowSecret, setFlowSecret] = useState('');
  const [flowSandbox, setFlowSandbox] = useState(true);

  // Form states for new Room
  const [newRoomNumber, setNewRoomNumber] = useState('');
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomType, setNewRoomType] = useState<'Single' | 'Double' | 'Suite' | 'Deluxe'>('Single');
  const [newRoomPrice, setNewRoomPrice] = useState(0);
  const [newRoomDesc, setNewRoomDesc] = useState('');
  const [newRoomImageUrl, setNewRoomImageUrl] = useState('');

  // Form states for settings
  const [checkInTime, setCheckInTime] = useState('14:00');
  const [checkOutTime, setCheckOutTime] = useState('11:00');
  const [themePrimary, setThemePrimary] = useState('#3b82f6');
  const [themeIsDark, setThemeIsDark] = useState(true);
  const [logoUrl, setLogoUrl] = useState('');

  // Form states for landing page customization
  const [heroTitle, setHeroTitle] = useState('');
  const [heroSubtitle, setHeroSubtitle] = useState('');
  const [aboutText, setAboutText] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [features, setFeatures] = useState<string[]>([]);
  const [newFeature, setNewFeature] = useState('');
  const [newFeatureIcon, setNewFeatureIcon] = useState('Sparkles');

  // Form states for new Pricing Rule
  const [pricingRules, setPricingRules] = useState<any[]>([]);
  const [newRuleName, setNewRuleName] = useState('');
  const [newRuleType, setNewRuleType] = useState<'day_of_week' | 'special_date'>('day_of_week');
  const [newRuleDayOfWeek, setNewRuleDayOfWeek] = useState<number>(5); // default Viernes
  const [newRuleSpecialDate, setNewRuleSpecialDate] = useState('');
  const [newRuleRoomId, setNewRuleRoomId] = useState<string>(''); // vacio = global
  const [newRuleAdjustmentType, setNewRuleAdjustmentType] = useState<'fixed' | 'multiplier' | 'percentage'>('multiplier');
  const [newRuleAdjustmentValue, setNewRuleAdjustmentValue] = useState<number>(1.2);
 
  async function loadAdminData() {
    if (!companyId) return;
    setLoading(true);
    try {
      // Fetch company/hotel
      const { data: compDataArr, error: compError } = await hotelRpc.getCompany(companyId);
      if (compError) throw compError;
      const compData = Array.isArray(compDataArr) ? compDataArr[0] : compDataArr;
      if (compData) {
        setCompanyName(compData.name);
        setAddress(compData.address || '');
        setPhone(compData.phone || '');
        setEmail(compData.email || '');
        // Load Flow keys
        const flow = compData.flow_settings || {};
        setFlowApiKey(flow.apiKey || '');
        setFlowSecret(flow.secret || '');
        setFlowSandbox(flow.isSandbox !== false);
      }

      // Fetch rooms
      const { data: roomsData, error: roomsError } = await hotelRpc.getRooms(companyId);
      if (roomsError) throw roomsError;
      setRooms((roomsData as any[]) || []);

      // Fetch hotel settings
      const { data: setDataArr, error: setError } = await hotelRpc.getSettings(companyId);
      if (setError) throw setError;
      const setData = Array.isArray(setDataArr) ? setDataArr[0] : setDataArr;
      if (setData) {
        setCheckInTime(setData.check_in_time || '14:00');
        setCheckOutTime(setData.check_out_time || '11:00');
        setThemePrimary(setData.theme_primary || '#3b82f6');
        setThemeIsDark(setData.theme_is_dark !== false);
        setHeroTitle(setData.hero_title || '');
        setHeroSubtitle(setData.hero_subtitle || '');
        setAboutText(setData.about_text || '');
        setBannerUrl(setData.banner_url || '');
        setFeatures(Array.isArray(setData.features) ? setData.features : []);
        setLogoUrl(setData.logo_url || '');
      }

      // Fetch pricing rules
      const { data: rulesData, error: rulesError } = await hotelRpc.getPricingRules(companyId);
      if (!rulesError && rulesData) {
        setPricingRules(rulesData as any[]);
      }
    } catch (err) {
      console.error('Error loading admin settings:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAdminData();
  }, [companyId]);

  const handleAddRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuleName.trim()) {
      alert('Por favor, ingresa un nombre para la regla de tarifa.');
      return;
    }
    if (newRuleType === 'special_date' && !newRuleSpecialDate) {
      alert('Por favor, selecciona una fecha para la regla.');
      return;
    }

    setSaveLoading(true);
    try {
      const { error } = await hotelRpc.upsertPricingRule({
        companyId,
        roomId: newRuleRoomId || null,
        name: newRuleName,
        ruleType: newRuleType,
        dayOfWeek: newRuleType === 'day_of_week' ? Number(newRuleDayOfWeek) : null,
        specialDate: newRuleType === 'special_date' ? newRuleSpecialDate : null,
        adjustmentType: newRuleAdjustmentType,
        adjustmentValue: Number(newRuleAdjustmentValue)
      });

      if (error) throw error;
      
      alert('Regla de tarifa registrada con éxito.');
      setNewRuleName('');
      setNewRuleSpecialDate('');
      
      // Reload rules
      const { data: rulesData, error: rulesError } = await hotelRpc.getPricingRules(companyId);
      if (!rulesError && rulesData) {
        setPricingRules(rulesData as any[]);
      }
      
      window.dispatchEvent(new CustomEvent('hotel-settings-updated'));
    } catch (err: any) {
      alert(`Error al crear regla de tarifa: ${err.message}`);
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm('¿Estás seguro de eliminar esta regla de tarifa?')) return;
    setSaveLoading(true);
    try {
      const { error } = await hotelRpc.deletePricingRule(ruleId);
      if (error) throw error;
      setPricingRules(prev => prev.filter(r => r.id !== ruleId));
      alert('Regla de tarifa eliminada.');
      window.dispatchEvent(new CustomEvent('hotel-settings-updated'));
    } catch (err: any) {
      alert(`Error al eliminar regla de tarifa: ${err.message}`);
    } finally {
      setSaveLoading(false);
    }
  };

  // Save General & Flow Settings
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId) return;
    setSaveLoading(true);

    try {
      // 1. Update company details
      const { error: compError } = await hotelRpc.updateCompany({
        companyId,
        name: companyName,
        address,
        phone,
        email,
        flowSettings: { apiKey: flowApiKey, secret: flowSecret, isSandbox: flowSandbox }
      });
      if (compError) throw compError;

      // 2. Upsert settings
      const { error } = await hotelRpc.upsertSettings({
        companyId,
        checkInTime,
        checkOutTime,
        themePrimary,
        themeIsDark,
        heroTitle: heroTitle || undefined,
        heroSubtitle: heroSubtitle || undefined,
        aboutText: aboutText || undefined,
        bannerUrl: bannerUrl || undefined,
        features: features.length > 0 ? features : undefined,
        logoUrl: logoUrl || undefined,
      });
      if (error) throw error;

      alert('Configuración guardada correctamente.');
      window.dispatchEvent(new CustomEvent('hotel-settings-updated'));
      await loadAdminData();
    } catch (err: any) {
      alert(`Error al guardar: ${err.message}`);
    } finally {
      setSaveLoading(false);
    }
  };

  // Add new Room
  const handleAddRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomNumber || !newRoomName || !newRoomPrice) {
      alert('Por favor, completa los campos de habitación obligatorios.');
      return;
    }
    setSaveLoading(true);

    try {
      const { data, error } = await hotelRpc.createRoom({
        companyId,
        roomNumber: newRoomNumber,
        name: newRoomName,
        type: newRoomType,
        pricePerDay: Number(newRoomPrice),
        description: newRoomDesc,
        imageUrl: newRoomImageUrl || undefined,
      });
      if (error) throw error;
      const room = Array.isArray(data) ? data[0] : data;
      setRooms(prev => [...prev, { ...room, price_per_day: Number(newRoomPrice), description: newRoomDesc, image_url: newRoomImageUrl, company_id: companyId, created_at: new Date().toISOString() } as any].sort((a, b) => a.room_number.localeCompare(b.room_number)));
      setNewRoomNumber('');
      setNewRoomName('');
      setNewRoomPrice(0);
      setNewRoomDesc('');
      setNewRoomImageUrl('');
      alert('Habitación agregada con éxito.');
    } catch (err: any) {
      alert(`Error al crear habitación: ${err.message}`);
    } finally {
      setSaveLoading(false);
    }
  };

  // Delete Room
  const handleDeleteRoom = async (roomId: string) => {
    if (!confirm('¿Estás seguro de eliminar esta habitación? Se borrarán sus reservas asociadas.')) return;
    setSaveLoading(true);

    try {
      const { error } = await hotelRpc.deleteRoom(roomId);
      if (error) throw error;
      setRooms(prev => prev.filter(r => r.id !== roomId));
      alert('Habitación eliminada.');
    } catch (err: any) {
      alert(`Error al borrar habitación: ${err.message}`);
    } finally {
      setSaveLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 staff-dashboard">
      {loading ? (
        <div className="col-span-12 flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      ) : (
        <>
          {/* Settings form */}
          <div className="lg:col-span-7 space-y-8">
            <form onSubmit={handleSaveConfig} className="glass-card p-6 border border-white/5 space-y-6">
              <div className="border-b border-white/5 pb-4">
                <h3 className="text-base font-black text-white tracking-tight flex items-center gap-2">
                  <Building className="w-5 h-5 text-blue-400" />
                  Ajustes Generales del Hotel
                </h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
                  Datos de contacto e identidad corporativa
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Nombre del Hotel</label>
                  <input
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[#131c2e] border border-white/5 rounded-xl text-white font-bold outline-none text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Correo de Recepción</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 bg-[#131c2e] border border-white/5 rounded-xl text-white font-bold outline-none text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Teléfono / WhatsApp</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 bg-[#131c2e] border border-white/5 rounded-xl text-white font-bold outline-none text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Dirección Física</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 bg-[#131c2e] border border-white/5 rounded-xl text-white font-bold outline-none text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Booking rules */}
              <div className="border-t border-white/5 pt-6 space-y-4">
                <h4 className="text-xs font-black uppercase text-slate-400 tracking-widest">Reglas de Operación</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Hora Check-in</label>
                    <input
                      type="text"
                      value={checkInTime}
                      onChange={(e) => setCheckInTime(e.target.value)}
                      placeholder="14:00"
                      className="w-full px-4 py-2.5 bg-[#131c2e] border border-white/5 rounded-xl text-white font-bold outline-none text-xs text-center"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Hora Check-out</label>
                    <input
                      type="text"
                      value={checkOutTime}
                      onChange={(e) => setCheckOutTime(e.target.value)}
                      placeholder="11:00"
                      className="w-full px-4 py-2.5 bg-[#131c2e] border border-white/5 rounded-xl text-white font-bold outline-none text-xs text-center"
                    />
                  </div>
                </div>
              </div>

              {/* Theme custom colors */}
              <div className="border-t border-white/5 pt-6 space-y-4">
                <h4 className="text-xs font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                  <Palette className="w-4 h-4 text-blue-400" /> Visualización de la Marca
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Color Principal</label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="color"
                        value={themePrimary}
                        onChange={(e) => setThemePrimary(e.target.value)}
                        className="w-10 h-10 border-0 bg-transparent rounded-lg cursor-pointer shrink-0"
                      />
                      <code className="text-xs uppercase font-black text-slate-350">{themePrimary}</code>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-4">
                    <input
                      type="checkbox"
                      id="theme_dark"
                      checked={themeIsDark}
                      onChange={(e) => setThemeIsDark(e.target.checked)}
                      className="w-4 h-4 text-blue-500 border-white/10 rounded focus:ring-blue-500 bg-[#131c2e]"
                    />
                    <label htmlFor="theme_dark" className="text-xs font-extrabold text-white uppercase tracking-wider cursor-pointer">
                      Modo Oscuro por defecto
                    </label>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider block">Logotipo del Hotel</label>
                  
                  {/* File Upload Input */}
                  <div className="bg-[#131c2e] p-4 rounded-xl border border-white/5 space-y-2.5 text-center">
                    <span className="text-[9px] font-extrabold text-slate-400 block uppercase tracking-wider">Subir archivo de imagen (PNG, JPG, SVG)</span>
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
                      id="logo-file-upload-admin"
                    />
                    <label
                      htmlFor="logo-file-upload-admin"
                      className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-black uppercase tracking-widest cursor-pointer transition-colors"
                    >
                      Seleccionar Archivo de Logo
                    </label>
                  </div>

                  {/* Or URL input */}
                  <div className="space-y-1">
                    <span className="text-[8px] font-black uppercase text-slate-500 block">O ingresa la URL de la imagen del logotipo:</span>
                    <input
                      type="text"
                      placeholder="https://ejemplo.com/logo.png"
                      value={logoUrl}
                      onChange={(e) => setLogoUrl(e.target.value)}
                      className="w-full px-4 py-2.5 bg-[#131c2e] border border-white/5 rounded-xl text-white font-bold outline-none text-xs"
                    />
                  </div>

                  {logoUrl && (
                    <div className="mt-2 p-2 bg-white/5 border border-white/10 rounded-xl inline-block relative group">
                      <img src={logoUrl} alt="Logo" className="h-10 object-contain rounded" onError={(e) => { (e.target as any).style.display = 'none'; }} />
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
              </div>

              {/* Landing Page modular settings */}
              <div className="border-t border-white/5 pt-6 space-y-6">
                <h4 className="text-xs font-black uppercase text-emerald-400 tracking-widest flex items-center gap-2">
                  <Sparkles className="w-4 h-4" /> Personalización de Landing Page Modular
                </h4>

                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Título de Bienvenida (Hero Title)</label>
                    <input
                      type="text"
                      value={heroTitle}
                      onChange={(e) => setHeroTitle(e.target.value)}
                      placeholder="Ej: Tu Estadía de Ensueño"
                      className="w-full px-4 py-2.5 bg-[#131c2e] border border-white/5 rounded-xl text-white font-bold outline-none text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Subtítulo Hero</label>
                    <textarea
                      rows={2}
                      value={heroSubtitle}
                      onChange={(e) => setHeroSubtitle(e.target.value)}
                      placeholder="Ej: Disfruta de la mejor experiencia de hospitalidad con servicios premium..."
                      className="w-full px-4 py-2.5 bg-[#131c2e] border border-white/5 rounded-xl text-white font-medium outline-none text-xs resize-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Sobre Nosotros (About Text)</label>
                    <textarea
                      rows={3}
                      value={aboutText}
                      onChange={(e) => setAboutText(e.target.value)}
                      placeholder="Escribe la historia o lema de tu hotel..."
                      className="w-full px-4 py-2.5 bg-[#131c2e] border border-white/5 rounded-xl text-white font-medium outline-none text-xs resize-none"
                    />
                  </div>

                  {/* Banner image and presets */}
                  <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Fondo Principal (Hero Banner URL)</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={bannerUrl}
                        onChange={(e) => setBannerUrl(e.target.value)}
                        placeholder="Enlace de imagen de fondo..."
                        className="w-full px-4 py-2.5 bg-[#131c2e] border border-white/5 rounded-xl text-white font-bold outline-none text-xs"
                      />
                    </div>
                    {/* Presets */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                      {LANDING_BANNER_PRESETS.map((preset, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setBannerUrl(preset.url)}
                          className={`group relative h-14 rounded-lg overflow-hidden border transition-all ${
                            bannerUrl === preset.url ? 'border-emerald-500 scale-[0.98]' : 'border-white/5 hover:border-white/20'
                          }`}
                        >
                          <img src={preset.url} alt={preset.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform" />
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center p-1">
                            <span className="text-[8px] font-extrabold text-white text-center leading-none">{preset.name}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Features Tag Editor */}
                  <div className="space-y-3">
                    <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Servicios y Amenidades</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newFeature}
                        onChange={(e) => setNewFeature(e.target.value)}
                        placeholder="Ej: Piscina Climatizada"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const val = newFeature.trim();
                            if (val) {
                              const featureWithIcon = newFeatureIcon !== 'Sparkles' ? `${val}||${newFeatureIcon}` : val;
                              if (!features.some(f => getFeatureLabel(f) === val)) {
                                setFeatures(prev => [...prev, featureWithIcon]);
                                setNewFeature('');
                              }
                            }
                          }
                        }}
                        className="w-full px-4 py-2.5 bg-[#131c2e] border border-white/5 rounded-xl text-white font-bold outline-none text-xs"
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          const val = newFeature.trim();
                          if (val) {
                            const featureWithIcon = newFeatureIcon !== 'Sparkles' ? `${val}||${newFeatureIcon}` : val;
                            if (!features.some(f => getFeatureLabel(f) === val)) {
                              setFeatures(prev => [...prev, featureWithIcon]);
                              setNewFeature('');
                            }
                          }
                        }}
                        className="px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-colors"
                      >
                        Añadir
                      </button>
                    </div>

                    {/* Icon Selection Horizontal Scroll */}
                    <div className="space-y-1.5">
                      <span className="text-[8px] font-black uppercase text-slate-500 block">Elegir Ícono para este Servicio:</span>
                      <div className="flex gap-2 overflow-x-auto pb-1.5 scrollbar-thin scrollbar-thumb-white/10 custom-scrollbar">
                        {AVAILABLE_ICONS.map((ico) => {
                          const IconComp = ico.component;
                          const isSel = newFeatureIcon === ico.id;
                          return (
                            <button
                              key={ico.id}
                              type="button"
                              onClick={() => setNewFeatureIcon(ico.id)}
                              className={`p-2.5 rounded-none border shrink-0 transition-all flex flex-col items-center gap-1 min-w-[50px] cursor-pointer ${
                                isSel 
                                  ? 'text-white border-none' 
                                  : 'bg-white/5 border-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                              }`}
                              style={{
                                backgroundColor: isSel ? 'var(--primary, #8b5cf6)' : '',
                                boxShadow: isSel ? '0 4px 10px var(--primary-shadow)' : ''
                              }}
                              title={ico.name}
                            >
                              <IconComp className="w-4 h-4" />
                              <span className="text-[7px] font-black uppercase tracking-wider">{ico.name.split(' ')[0]}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Tags List */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {features.map((feat, idx) => {
                        const label = getFeatureLabel(feat);
                        const icon = getFeatureIcon(feat);
                        return (
                          <div
                            key={idx}
                            className="flex items-center gap-2 px-2.5 py-1.5 bg-white/5 border border-white/5 rounded-none text-[10px] font-extrabold text-slate-300"
                          >
                            <div className="text-slate-400 flex items-center justify-center shrink-0">
                              {icon}
                            </div>
                            <span>{label}</span>
                            <button
                              type="button"
                              onClick={() => setFeatures(prev => prev.filter(f => f !== feat))}
                              className="text-slate-500 hover:text-red-400 transition-colors bg-transparent border-none cursor-pointer p-0"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })}
                      {features.length === 0 && (
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider py-1">Sin amenidades configuradas.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Flow Integration */}
              <div className="border-t border-white/5 pt-6 space-y-4">
                <h4 className="text-xs font-black uppercase text-orange-400 tracking-widest flex items-center gap-2">
                  <KeyRound className="w-4 h-4" /> Integración con Flow.cl (Chile)
                </h4>
                
                <div className="bg-orange-500/5 p-4 rounded-2xl border border-orange-500/10 text-[10px] text-orange-300 font-medium">
                  Configura tus llaves de comercio para activar los cobros reales o pruebas (Sandbox) de Flow.cl.
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Flow API Key</label>
                    <input
                      type="password"
                      value={flowApiKey}
                      onChange={(e) => setFlowApiKey(e.target.value)}
                      placeholder="Ingrese API Key..."
                      className="w-full px-4 py-2.5 bg-[#131c2e] border border-white/5 rounded-xl text-white font-bold outline-none text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Flow Secret Key</label>
                    <input
                      type="password"
                      value={flowSecret}
                      onChange={(e) => setFlowSecret(e.target.value)}
                      placeholder="Ingrese Secret..."
                      className="w-full px-4 py-2.5 bg-[#131c2e] border border-white/5 rounded-xl text-white font-bold outline-none text-xs"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="flow_sandbox"
                    checked={flowSandbox}
                    onChange={(e) => setFlowSandbox(e.target.checked)}
                    className="w-4 h-4 text-orange-500 border-white/10 rounded focus:ring-orange-500 bg-[#131c2e]"
                  />
                  <label htmlFor="flow_sandbox" className="text-xs font-extrabold text-white uppercase tracking-wider cursor-pointer">
                    Habilitar Modo Pruebas (Flow Sandbox)
                  </label>
                </div>
              </div>

              <button
                type="submit"
                disabled={saveLoading}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-extrabold uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2"
              >
                {saveLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Guardar Configuración
              </button>
            </form>
          </div>

          {/* Rooms inventory */}
          <div className="lg:col-span-5 space-y-8">
            {/* Add Room form */}
            <form onSubmit={handleAddRoom} className="glass-card p-6 border border-white/5 space-y-4">
              <div className="border-b border-white/5 pb-4">
                <h3 className="text-base font-black text-white tracking-tight flex items-center gap-2">
                  <Plus className="w-5 h-5 text-emerald-400" />
                  Agregar Nueva Habitación
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Número *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: 101"
                    value={newRoomNumber}
                    onChange={(e) => setNewRoomNumber(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[#131c2e] border border-white/5 rounded-xl text-white font-bold outline-none text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Nombre *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Matrimonial Vista"
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[#131c2e] border border-white/5 rounded-xl text-white font-bold outline-none text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Tipo *</label>
                  <select
                    value={newRoomType}
                    onChange={(e) => {
                      setNewRoomType(e.target.value as any);
                      // Auto-select first preset for the selected type to be user friendly
                      const typePresets = ROOM_PRESETS[e.target.value as keyof typeof ROOM_PRESETS];
                      if (typePresets && typePresets.length > 0) {
                        setNewRoomImageUrl(typePresets[0].url);
                      }
                    }}
                    className="w-full px-4 py-2.5 bg-[#131c2e] border border-white/5 rounded-xl text-white font-bold outline-none text-xs cursor-pointer"
                  >
                    <option value="Single">Single</option>
                    <option value="Double">Double</option>
                    <option value="Suite">Suite</option>
                    <option value="Deluxe">Deluxe</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Precio por día ($) *</label>
                  <input
                    type="number"
                    required
                    placeholder="Ej: 45000"
                    value={newRoomPrice || ''}
                    onChange={(e) => setNewRoomPrice(Number(e.target.value))}
                    className="w-full px-4 py-2.5 bg-[#131c2e] border border-white/5 rounded-xl text-white font-bold outline-none text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Descripción</label>
                <textarea
                  rows={2}
                  placeholder="Detalles de camas, vistas, servicios..."
                  value={newRoomDesc}
                  onChange={(e) => setNewRoomDesc(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#131c2e] border border-white/5 rounded-xl text-white font-medium outline-none text-xs resize-none"
                />
              </div>

              {/* Room Image URL input & Presets */}
              <div className="space-y-2 border-t border-white/5 pt-3">
                <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1">
                  <Image className="w-3 h-3 text-emerald-400" /> Foto de la Habitación (URL)
                </label>
                <input
                  type="text"
                  placeholder="Enlace de imagen de la habitación (Unsplash, etc.)..."
                  value={newRoomImageUrl}
                  onChange={(e) => setNewRoomImageUrl(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#131c2e] border border-white/5 rounded-xl text-white font-bold outline-none text-xs"
                />
                
                {/* Visual Presets Selector */}
                <div className="space-y-1">
                  <span className="text-[8px] font-black uppercase text-slate-500 block">Presets recomendados para {newRoomType}:</span>
                  <div className="flex gap-2">
                    {ROOM_PRESETS[newRoomType].map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setNewRoomImageUrl(preset.url)}
                        className={`flex-1 group relative h-10 rounded-lg overflow-hidden border transition-all ${
                          newRoomImageUrl === preset.url ? 'border-emerald-500 scale-[0.98]' : 'border-white/5 hover:border-white/20'
                        }`}
                      >
                        <img src={preset.url} alt={preset.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform" />
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center p-1">
                          <span className="text-[8px] font-extrabold text-white text-center leading-none">{preset.name}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={saveLoading}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-extrabold uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-1"
              >
                <Plus className="w-4 h-4" /> Registrar Habitación
              </button>
            </form>

            {/* Rooms list */}
            <div className="glass-card p-6 border border-white/5 space-y-4">
              <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                <Bed className="w-5 h-5 text-blue-400" />
                Inventario de Habitaciones ({rooms.length})
              </h3>

              <div className="space-y-3 overflow-y-auto max-h-[400px] pr-1 custom-scrollbar">
                {rooms.map(room => (
                  <div 
                    key={room.id}
                    className="flex justify-between items-center p-3 bg-white/5 border border-white/5 rounded-xl text-xs gap-3"
                  >
                    <div className="flex items-center gap-3">
                      {/* Mini Thumbnail */}
                      <div className="w-12 h-12 rounded-lg overflow-hidden border border-white/10 shrink-0 bg-[#131c2e] flex items-center justify-center text-slate-500">
                        {room.image_url ? (
                          <img src={room.image_url} alt={room.name} className="w-full h-full object-cover" />
                        ) : (
                          <Bed className="w-5 h-5" />
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 bg-blue-600/20 text-blue-400 rounded font-black text-[10px] tracking-wide">
                            #{room.room_number}
                          </span>
                          <span className="font-extrabold text-white">{room.name}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1 font-bold">
                          {room.type} — ${room.price_per_day.toLocaleString('es-CL')}/noche
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteRoom(room.id)}
                      className="p-2 hover:bg-red-500/10 text-slate-500 hover:text-red-500 rounded-lg transition-colors shrink-0"
                      title="Eliminar Habitación"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}

                {rooms.length === 0 && (
                  <div className="text-center py-8 text-slate-500 font-bold uppercase tracking-wider">
                    Sin habitaciones registradas
                  </div>
                )}
              </div>
            </div>

            {/* Gestión de Tarifas Dinámicas */}
            <div className="glass-card p-6 border border-white/5 space-y-6">
              <div className="border-b border-white/5 pb-4">
                <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-amber-400" />
                  Tarifas y Precios Dinámicos
                </h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
                  Configura precios para días específicos o días de la semana
                </p>
              </div>

              {/* Form to add rule */}
              <form onSubmit={handleAddRule} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Nombre de la Regla *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Fin de Semana Premium, Año Nuevo"
                    value={newRuleName}
                    onChange={(e) => setNewRuleName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[#131c2e] border border-white/5 rounded-xl text-white font-bold outline-none text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Tipo de Regla *</label>
                    <select
                      value={newRuleType}
                      onChange={(e) => setNewRuleType(e.target.value as any)}
                      className="w-full px-4 py-2.5 bg-[#131c2e] border border-white/5 rounded-xl text-white font-bold outline-none text-xs cursor-pointer"
                    >
                      <option value="day_of_week">Día de la Semana</option>
                      <option value="special_date">Fecha Especial</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Habitación (Opcional)</label>
                    <select
                      value={newRuleRoomId}
                      onChange={(e) => setNewRuleRoomId(e.target.value)}
                      className="w-full px-4 py-2.5 bg-[#131c2e] border border-white/5 rounded-xl text-white font-bold outline-none text-xs cursor-pointer"
                    >
                      <option value="">Todas las Habitaciones</option>
                      {rooms.map(r => (
                        <option key={r.id} value={r.id}>#{r.room_number} - {r.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {newRuleType === 'day_of_week' ? (
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Seleccionar Día *</label>
                      <select
                        value={newRuleDayOfWeek}
                        onChange={(e) => setNewRuleDayOfWeek(Number(e.target.value))}
                        className="w-full px-4 py-2.5 bg-[#131c2e] border border-white/5 rounded-xl text-white font-bold outline-none text-xs cursor-pointer"
                      >
                        <option value={0}>Domingo</option>
                        <option value={1}>Lunes</option>
                        <option value={2}>Martes</option>
                        <option value={3}>Miércoles</option>
                        <option value={4}>Jueves</option>
                        <option value={5}>Viernes</option>
                        <option value={6}>Sábado</option>
                      </select>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Seleccionar Fecha *</label>
                      <input
                        type="date"
                        required
                        value={newRuleSpecialDate}
                        onChange={(e) => setNewRuleSpecialDate(e.target.value)}
                        className="w-full px-4 py-2.5 bg-[#131c2e] border border-white/5 rounded-xl text-white font-bold outline-none text-xs"
                      />
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Tipo de Ajuste *</label>
                    <select
                      value={newRuleAdjustmentType}
                      onChange={(e) => {
                        setNewRuleAdjustmentType(e.target.value as any);
                        setNewRuleAdjustmentValue(e.target.value === 'multiplier' ? 1.2 : e.target.value === 'percentage' ? 20 : 50000);
                      }}
                      className="w-full px-4 py-2.5 bg-[#131c2e] border border-white/5 rounded-xl text-white font-bold outline-none text-xs cursor-pointer"
                    >
                      <option value="multiplier">Multiplicador (x)</option>
                      <option value="percentage">Porcentaje (%)</option>
                      <option value="fixed">Precio Fijo ($)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider">
                    {newRuleAdjustmentType === 'multiplier' 
                      ? 'Valor del Multiplicador (ej: 1.25 para +25%, 0.9 para -10%)'
                      : newRuleAdjustmentType === 'percentage'
                        ? 'Porcentaje de Ajuste (ej: 20 para +20%, -15 para -15%)'
                        : 'Monto de Precio Fijo en CLP (ej: 65000)'} *
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={newRuleAdjustmentValue || ''}
                    onChange={(e) => setNewRuleAdjustmentValue(Number(e.target.value))}
                    className="w-full px-4 py-2.5 bg-[#131c2e] border border-white/5 rounded-xl text-white font-bold outline-none text-xs"
                  />
                </div>

                <button
                  type="submit"
                  disabled={saveLoading}
                  className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-black rounded-xl font-extrabold uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> Registrar Regla de Tarifa
                </button>
              </form>

              {/* List of pricing rules */}
              <div className="border-t border-white/5 pt-4 space-y-3">
                <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                  Reglas Activas ({pricingRules.length})
                </h4>

                <div className="space-y-2 overflow-y-auto max-h-[300px] pr-1 custom-scrollbar">
                  {pricingRules.map((rule) => {
                    const ruleRoom = rooms.find(r => r.id === rule.room_id);
                    const isDow = rule.rule_type === 'day_of_week';
                    
                    const dowNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
                    const condLabel = isDow 
                      ? `Cada ${dowNames[rule.day_of_week]}`
                      : rule.special_date;

                    const adjLabel = rule.adjustment_type === 'fixed'
                      ? `$${rule.adjustment_value.toLocaleString('es-CL')} Fijo`
                      : rule.adjustment_type === 'multiplier'
                        ? `x${rule.adjustment_value} (Multiplicador)`
                        : `${rule.adjustment_value >= 0 ? '+' : ''}${rule.adjustment_value}% (Porcentaje)`;

                    return (
                      <div 
                        key={rule.id}
                        className="p-3 bg-white/5 border border-white/5 rounded-xl flex justify-between items-center text-xs gap-3"
                      >
                        <div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-extrabold text-white">{rule.name}</span>
                            <span className="px-1.5 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded text-[8px] font-extrabold uppercase tracking-wider">
                              {isDow ? 'Semanal' : 'Fecha'}
                            </span>
                            {ruleRoom && (
                              <span className="px-1.5 py-0.5 bg-blue-600/10 text-blue-400 border border-blue-600/20 rounded text-[8px] font-extrabold uppercase tracking-wider">
                                #{ruleRoom.room_number}
                              </span>
                            )}
                          </div>
                          <div className="text-[9px] text-slate-400 mt-1 font-bold">
                            Condición: <strong className="text-white">{condLabel}</strong>
                            <span className="mx-1.5 text-slate-600">|</span>
                            Ajuste: <strong className="text-orange-400">{adjLabel}</strong>
                          </div>
                        </div>

                        <button
                          onClick={() => handleDeleteRule(rule.id)}
                          className="p-2 hover:bg-red-500/10 text-slate-500 hover:text-red-500 rounded-lg transition-colors shrink-0"
                          title="Eliminar Regla"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}

                  {pricingRules.length === 0 && (
                    <div className="text-center py-6 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                      Sin tarifas dinámicas configuradas. Todas las habitaciones cotizan a valor estándar.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
