import { useState, useEffect } from 'react';
import { hotelRpc } from '../lib/supabase';
import type { Company } from '../types';
import {
  Building2, Users, BedDouble, Calendar, TrendingUp,
  PlusCircle, Settings, Globe, Phone, Mail, MapPin,
  ChevronRight, BarChart3, Activity, Sparkles, RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface HotelStats {
  company: Company;
  roomCount: number;
  activeBookings: number;
  staffCount: number;
  occupancyRate: number;
}

interface NexusOwnerDashboardProps {
  ownerEmail?: string;
}

export function NexusOwnerDashboard({ ownerEmail: _ownerEmail }: NexusOwnerDashboardProps = {}) {
  const [hotelStats, setHotelStats] = useState<HotelStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedHotel, setSelectedHotel] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // New hotel form
  const [newHotelName, setNewHotelName] = useState('');
  const [newHotelEmail, setNewHotelEmail] = useState('');
  const [newHotelPhone, setNewHotelPhone] = useState('');
  const [newHotelAddress, setNewHotelAddress] = useState('');
  const [newHotelCity, setNewHotelCity] = useState('');
  const [creatingHotel, setCreatingHotel] = useState(false);

  useEffect(() => {
    loadAllHotels();
  }, [refreshKey]);

  const loadAllHotels = async () => {
    setLoading(true);
    try {
      const { data: companies, error: companiesError } = await hotelRpc.getCompanies();
      if (companiesError) throw companiesError;
      if (!companies) return;

      // Fetch stats for each company in parallel
      const statsPromises = (companies as any[]).map(async (company: Company) => {
        const [roomsRes, bookingsRes, staffRes] = await Promise.all([
          hotelRpc.getRooms(company.id),
          hotelRpc.getBookings(company.id),
          hotelRpc.getCleaners(company.id),
        ]);

        const roomCount = (roomsRes.data as any[])?.length || 0;
        const activeBookings = ((bookingsRes.data as any[]) || []).filter((b: any) => ['confirmed','checked_in'].includes(b.status)).length;
        const staffCount = (staffRes.data as any[])?.length || 0;
        const occupancyRate = roomCount > 0 ? Math.round((activeBookings / roomCount) * 100) : 0;

        return { company, roomCount, activeBookings, staffCount, occupancyRate };
      });

      const stats = await Promise.all(statsPromises);
      setHotelStats(stats);
    } catch (err) {
      console.error('Error loading hotels:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateHotel = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingHotel(true);
    try {
      // Use the hotel_create_company RPC via hotelRpc
      const { error } = await hotelRpc.createCompany({
        name: newHotelName,
        email: newHotelEmail || undefined,
        phone: newHotelPhone || undefined,
        address: newHotelAddress || undefined,
        city: newHotelCity || undefined
      });
      if (error) throw error;
      alert(`✅ Hotel creado exitosamente.`);
      setShowCreateModal(false);
      setNewHotelName('');
      setNewHotelEmail('');
      setNewHotelPhone('');
      setNewHotelAddress('');
      setNewHotelCity('');
      setRefreshKey(k => k + 1);
    } catch (err: any) {
      alert('Error al crear hotel: ' + err.message);
    } finally {
      setCreatingHotel(false);
    }
  };

  const totalRooms = hotelStats.reduce((acc, s) => acc + s.roomCount, 0);
  const totalBookings = hotelStats.reduce((acc, s) => acc + s.activeBookings, 0);
  const avgOccupancy = hotelStats.length > 0
    ? Math.round(hotelStats.reduce((acc, s) => acc + s.occupancyRate, 0) / hotelStats.length)
    : 0;

  return (
    <div className="space-y-6 staff-dashboard">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Globe className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-xl font-black text-white tracking-tight">Nexus Owner</h1>
            <span className="text-[9px] bg-amber-500/20 text-amber-400 font-extrabold uppercase px-1.5 py-0.5 rounded tracking-widest border border-amber-500/10">
              Superadmin
            </span>
          </div>
          <p className="text-[11px] text-slate-500 font-semibold">
            Panel de control de todos los hoteles del ecosistema
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setRefreshKey(k => k + 1)}
            className="p-2 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/5"
            title="Recargar"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-black font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-amber-500/20"
          >
            <PlusCircle className="w-4 h-4" />
            Nuevo Hotel
          </button>
        </div>
      </div>

      {/* Global Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Hoteles Activos', value: hotelStats.length, icon: Building2, color: 'blue', gradient: 'from-blue-600 to-indigo-600' },
          { label: 'Total Habitaciones', value: totalRooms, icon: BedDouble, color: 'emerald', gradient: 'from-emerald-500 to-teal-500' },
          { label: 'Reservas Activas', value: totalBookings, icon: Calendar, color: 'violet', gradient: 'from-violet-500 to-purple-600' },
          { label: 'Ocup. Promedio', value: `${avgOccupancy}%`, icon: TrendingUp, color: 'amber', gradient: 'from-amber-500 to-orange-500' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className="glass-card border border-white/5 p-4 relative overflow-hidden group"
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-0 group-hover:opacity-5 transition-opacity`} />
            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center mb-3 shadow-lg`}>
              <stat.icon className="w-4.5 h-4.5 text-white" style={{ width: '18px', height: '18px' }} />
            </div>
            <p className="text-2xl font-black text-white">{loading ? '—' : stat.value}</p>
            <p className="text-[10px] text-slate-500 font-extrabold uppercase tracking-widest mt-0.5">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Hotels Grid */}
      {loading ? (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="glass-card border border-white/5 p-5 animate-pulse">
              <div className="h-5 bg-white/5 rounded w-3/4 mb-3" />
              <div className="h-3 bg-white/5 rounded w-1/2 mb-6" />
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3].map(j => <div key={j} className="h-12 bg-white/5 rounded-xl" />)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {hotelStats.map((stat, i) => (
            <motion.div
              key={stat.company.id}
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.06 }}
              onClick={() => setSelectedHotel(selectedHotel === stat.company.id ? null : stat.company.id)}
              className={`glass-card border cursor-pointer transition-all hover:border-amber-500/20 hover:shadow-lg hover:shadow-amber-500/5 ${
                selectedHotel === stat.company.id ? 'border-amber-500/30 shadow-lg shadow-amber-500/10' : 'border-white/5'
              }`}
            >
              <div className="p-5">
                {/* Hotel header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/20 flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-amber-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-white leading-tight">{stat.company.name}</h3>
                      <div className="flex items-center gap-1 mt-0.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${stat.company.is_active ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                          {stat.company.is_active ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className={`w-4 h-4 text-slate-600 transition-transform ${selectedHotel === stat.company.id ? 'rotate-90' : ''}`} />
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-white/3 rounded-xl p-2.5 text-center border border-white/5">
                    <BedDouble className="w-3.5 h-3.5 text-blue-400 mx-auto mb-1" />
                    <p className="text-sm font-black text-white">{stat.roomCount}</p>
                    <p className="text-[8px] text-slate-500 font-bold uppercase">Hab.</p>
                  </div>
                  <div className="bg-white/3 rounded-xl p-2.5 text-center border border-white/5">
                    <Calendar className="w-3.5 h-3.5 text-violet-400 mx-auto mb-1" />
                    <p className="text-sm font-black text-white">{stat.activeBookings}</p>
                    <p className="text-[8px] text-slate-500 font-bold uppercase">Reservas</p>
                  </div>
                  <div className="bg-white/3 rounded-xl p-2.5 text-center border border-white/5">
                    <Activity className="w-3.5 h-3.5 text-emerald-400 mx-auto mb-1" />
                    <p className="text-sm font-black text-white">{stat.occupancyRate}%</p>
                    <p className="text-[8px] text-slate-500 font-bold uppercase">Ocup.</p>
                  </div>
                </div>

                {/* Occupancy bar */}
                <div className="mt-3">
                  <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-700"
                      style={{ width: `${stat.occupancyRate}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Expanded details */}
              <AnimatePresence>
                {selectedHotel === stat.company.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden border-t border-white/5"
                  >
                    <div className="p-4 space-y-2.5">
                      {stat.company.email && (
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <Mail className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                          <span>{stat.company.email}</span>
                        </div>
                      )}
                      {stat.company.phone && (
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <Phone className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                          <span>{stat.company.phone}</span>
                        </div>
                      )}
                      {stat.company.address && (
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <MapPin className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                          <span>{stat.company.address}{stat.company.city ? `, ${stat.company.city}` : ''}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <Users className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                        <span>{stat.staffCount} miembros de personal</span>
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button className="flex-1 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-black text-slate-400 hover:text-white uppercase tracking-wider transition-all flex items-center justify-center gap-1.5">
                          <BarChart3 className="w-3 h-3" />
                          Ver Reportes
                        </button>
                        <button className="flex-1 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-black text-slate-400 hover:text-white uppercase tracking-wider transition-all flex items-center justify-center gap-1.5">
                          <Settings className="w-3 h-3" />
                          Configurar
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}

          {/* Add hotel card */}
          <motion.button
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: hotelStats.length * 0.06 }}
            onClick={() => setShowCreateModal(true)}
            className="glass-card border border-dashed border-white/10 hover:border-amber-500/30 p-5 flex flex-col items-center justify-center gap-3 min-h-[200px] transition-all group cursor-pointer"
          >
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
              <PlusCircle className="w-6 h-6 text-amber-400" />
            </div>
            <div className="text-center">
              <p className="text-xs font-black text-slate-400 group-hover:text-white uppercase tracking-wider transition-colors">Agregar Hotel</p>
              <p className="text-[10px] text-slate-600 mt-0.5">Onboardear nuevo cliente</p>
            </div>
          </motion.button>
        </div>
      )}

      {/* Create Hotel Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
            onClick={(e) => e.target === e.currentTarget && setShowCreateModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-md glass-card border border-white/10 overflow-hidden shadow-2xl"
            >
              <div className="h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
              <div className="p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/20 flex items-center justify-center">
                    <Sparkles className="w-4.5 h-4.5 text-amber-400" style={{ width: '18px', height: '18px' }} />
                  </div>
                  <div>
                    <h2 className="text-base font-black text-white">Nuevo Hotel</h2>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider">Onboarding de cliente</p>
                  </div>
                </div>

                <form onSubmit={handleCreateHotel} className="space-y-3">
                  {[
                    { label: 'Nombre del Hotel *', key: 'name', placeholder: 'Ej: Hotel Boutique Pacífico', value: newHotelName, setter: setNewHotelName, required: true },
                    { label: 'Email de Contacto', key: 'email', placeholder: 'hotel@ejemplo.com', value: newHotelEmail, setter: setNewHotelEmail, required: false },
                    { label: 'Teléfono', key: 'phone', placeholder: '+56 9 1234 5678', value: newHotelPhone, setter: setNewHotelPhone, required: false },
                    { label: 'Dirección', key: 'address', placeholder: 'Av. Principal 123', value: newHotelAddress, setter: setNewHotelAddress, required: false },
                    { label: 'Ciudad', key: 'city', placeholder: 'Santiago', value: newHotelCity, setter: setNewHotelCity, required: false },
                  ].map((field) => (
                    <div key={field.key} className="space-y-1">
                      <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider">{field.label}</label>
                      <input
                        type="text"
                        required={field.required}
                        placeholder={field.placeholder}
                        value={field.value}
                        onChange={(e) => field.setter(e.target.value)}
                        className="w-full px-3 py-2.5 bg-[#131c2e] border border-white/5 rounded-xl text-white font-semibold outline-none text-xs focus:border-amber-500/30 transition-colors"
                      />
                    </div>
                  ))}

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowCreateModal(false)}
                      className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-slate-400 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={creatingHotel}
                      className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-black rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                    >
                      {creatingHotel ? 'Creando...' : 'Crear Hotel'}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
