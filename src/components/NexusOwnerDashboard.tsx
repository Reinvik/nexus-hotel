import { useState, useEffect } from 'react';
import { hotelRpc } from '../lib/supabase';
import type { Company } from '../types';
import {
  Building2, Users, BedDouble, Calendar, TrendingUp,
  PlusCircle, Settings, Globe, Phone, Mail, MapPin,
  ChevronRight, BarChart3, Activity, Sparkles, RefreshCw,
  Search, UserCheck, UserX, Trash2, UserPlus, X
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

  // User management states
  const [activeTab, setActiveTab] = useState<'hotels' | 'users'>('hotels');
  const [profiles, setProfiles] = useState<any[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  // New user form states
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('Nexus1234!');
  const [newUserName, setNewUserName] = useState('');
  const [newUserRole, setNewUserRole] = useState('receptionist');
  const [newUserCompanyId, setNewUserCompanyId] = useState('');
  const [newUserAuthorized, setNewUserAuthorized] = useState(true);
  const [creatingUser, setCreatingUser] = useState(false);

  useEffect(() => {
    loadAllHotels();
    loadProfiles();
  }, [refreshKey]);

  const loadProfiles = async () => {
    try {
      const { data, error } = await hotelRpc.getAllProfiles();
      if (error) throw error;
      setProfiles(data || []);
    } catch (err) {
      console.error('Error loading profiles:', err);
    }
  };

  const loadAllHotels = async () => {
    setLoading(true);
    try {
      const { data: companiesRes, error: companiesError } = await hotelRpc.getCompanies();
      if (companiesError) throw companiesError;
      if (!companiesRes) return;
      setCompanies(companiesRes as Company[]);

      // Fetch stats for each company in parallel
      const statsPromises = (companiesRes as any[]).map(async (company: Company) => {
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

  const handleUpdateProfile = async (id: string, name: string, role: string, companyId: string | null, isAuthorized: boolean) => {
    setUpdatingUserId(id);
    try {
      const { error } = await hotelRpc.updateProfileAdmin({ id, name, role, companyId, isAuthorized });
      if (error) throw error;
      await loadProfiles();
    } catch (err: any) {
      alert('Error al actualizar usuario: ' + err.message);
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleDeleteProfile = async (id: string, name: string) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar el perfil de ${name}? Esta acción no se puede deshacer.`)) return;
    setUpdatingUserId(id);
    try {
      const { error } = await hotelRpc.deleteProfileAdmin(id);
      if (error) throw error;
      await loadProfiles();
      alert('✅ Usuario eliminado correctamente.');
    } catch (err: any) {
      alert('Error al eliminar usuario: ' + err.message);
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleCreateUserAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserEmail || !newUserPassword || !newUserName || !newUserCompanyId) {
      alert('Por favor, rellene todos los campos requeridos (*).');
      return;
    }
    setCreatingUser(true);
    try {
      const { data, error } = await hotelRpc.createUserAdmin({
        email: newUserEmail,
        password: newUserPassword,
        name: newUserName,
        role: newUserRole,
        companyId: newUserCompanyId || null,
        isAuthorized: newUserAuthorized
      });

      if (error) throw error;

      const res = Array.isArray(data) ? data[0] : data;
      if (res && res.success === false) {
        throw new Error(res.message);
      }

      alert(`✅ Usuario ${newUserName} creado exitosamente con la contraseña especificada.`);
      setShowInviteModal(false);

      // Limpiar formulario
      setNewUserEmail('');
      setNewUserPassword('Nexus1234!');
      setNewUserName('');
      setNewUserRole('receptionist');
      setNewUserCompanyId('');
      setNewUserAuthorized(true);

      await loadProfiles();
    } catch (err: any) {
      alert('Error al crear usuario: ' + err.message);
    } finally {
      setCreatingUser(false);
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
            <div className="w-8 h-8 rounded-none bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Globe className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-xl font-black text-white tracking-tight">Nexus Owner</h1>
            <span className="text-[9px] bg-amber-500/20 text-amber-400 font-extrabold uppercase px-1.5 py-0.5 rounded-none tracking-widest border border-amber-500/10">
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
            className="p-2 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-none transition-all border border-white/5 cursor-pointer"
            title="Recargar"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              if (activeTab === 'hotels') {
                setShowCreateModal(true);
              } else {
                setShowInviteModal(true);
              }
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-black font-black text-xs uppercase tracking-wider rounded-none transition-all shadow-md shadow-amber-500/20 cursor-pointer"
          >
            {activeTab === 'hotels' ? (
              <>
                <PlusCircle className="w-4 h-4" />
                Nuevo Hotel
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                Agregar Miembro
              </>
            )}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10">
        <button
          onClick={() => setActiveTab('hotels')}
          className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider transition-all rounded-none border-b-2 cursor-pointer ${
            activeTab === 'hotels'
              ? 'border-amber-500 text-amber-500 bg-white/5 font-black'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          Gestión de Hoteles
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider transition-all rounded-none border-b-2 cursor-pointer ${
            activeTab === 'users'
              ? 'border-amber-500 text-amber-500 bg-white/5 font-black'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          Gestión de Usuarios
        </button>
      </div>

      {activeTab === 'hotels' ? (
        <>

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
                  <div className="h-1 bg-white/5 rounded-none overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-none transition-all duration-700"
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
                        <button className="flex-1 py-2 bg-white/5 hover:bg-white/10 rounded-none text-[10px] font-black text-slate-400 hover:text-white uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer">
                          <BarChart3 className="w-3 h-3" />
                          Ver Reportes
                        </button>
                        <button className="flex-1 py-2 bg-white/5 hover:bg-white/10 rounded-none text-[10px] font-black text-slate-400 hover:text-white uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer">
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
            className="glass-card border border-dashed border-white/10 hover:border-amber-500/30 p-5 flex flex-col items-center justify-center gap-3 min-h-[200px] transition-all group cursor-pointer rounded-none"
          >
            <div className="w-12 h-12 rounded-none bg-amber-500/10 border border-amber-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
              <PlusCircle className="w-6 h-6 text-amber-400" />
            </div>
            <div className="text-center">
              <p className="text-xs font-black text-slate-400 group-hover:text-white uppercase tracking-wider transition-colors">Agregar Hotel</p>
              <p className="text-[10px] text-slate-600 mt-0.5">Onboardear nuevo cliente</p>
            </div>
          </motion.button>
        </div>
      )}
        </>
      ) : (
        <div className="space-y-4">
          {/* Search & Action bar */}
          <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
            <div className="relative flex-grow max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Buscar usuario por nombre o correo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-[#131c2e] border border-white/5 rounded-none text-white font-semibold outline-none text-xs focus:border-amber-500/30 transition-colors"
              />
            </div>
            <button
              onClick={() => setShowInviteModal(true)}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-black font-black text-xs uppercase tracking-wider rounded-none transition-all shadow-md shadow-amber-500/20 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              Agregar Miembro
            </button>
          </div>

          {/* Users Table */}
          <div className="overflow-x-auto border border-white/5 rounded-none bg-black/40">
            <table className="w-full border-collapse text-left text-xs text-slate-350">
              <thead className="bg-white/5 uppercase font-bold tracking-widest border-b border-white/10 text-slate-450">
                <tr>
                  <th className="p-4 text-[10px]">Usuario</th>
                  <th className="p-4 text-[10px]">Hotel Asignado</th>
                  <th className="p-4 text-[10px]">Rol</th>
                  <th className="p-4 text-[10px]">Acceso</th>
                  <th className="p-4 text-[10px] text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {profiles
                  .filter(p => {
                    const term = searchTerm.toLowerCase();
                    return (
                      p.name?.toLowerCase().includes(term) ||
                      p.email?.toLowerCase().includes(term)
                    );
                  })
                  .map((p) => {
                    const isUpdating = updatingUserId === p.id;
                    return (
                      <tr key={p.id} className="hover:bg-white/2 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-black rounded-none text-sm uppercase shrink-0">
                              {p.name ? p.name.substring(0, 2) : p.email.substring(0, 2)}
                            </div>
                            <div className="min-w-0">
                              <p className="font-extrabold text-white leading-none mb-1.5 truncate">{p.name || 'Sin Nombre'}</p>
                              <p className="text-[10px] text-slate-500 truncate leading-none">{p.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <select
                            value={p.company_id || ''}
                            disabled={isUpdating}
                            onChange={(e) => handleUpdateProfile(p.id, p.name || '', p.role, e.target.value || null, p.is_authorized)}
                            className="bg-[#131c2e] border border-white/5 text-xs text-white rounded-none p-2.5 outline-none w-full max-w-[220px] focus:border-amber-500/30 transition-colors cursor-pointer"
                          >
                            <option value="">Sin Asignar / Externo</option>
                            {companies.map(c => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </select>
                        </td>
                        <td className="p-4">
                          <select
                            value={p.role}
                            disabled={isUpdating}
                            onChange={(e) => handleUpdateProfile(p.id, p.name || '', e.target.value, p.company_id, p.is_authorized)}
                            className="bg-[#131c2e] border border-white/5 text-xs text-white rounded-none p-2.5 outline-none w-full max-w-[150px] focus:border-amber-500/30 transition-colors cursor-pointer"
                          >
                            <option value="admin">Administrador</option>
                            <option value="receptionist">Recepcionista</option>
                            <option value="cleaner">Camarera</option>
                          </select>
                        </td>
                        <td className="p-4">
                          <button
                            disabled={isUpdating}
                            onClick={() => handleUpdateProfile(p.id, p.name || '', p.role, p.company_id, !p.is_authorized)}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-none font-extrabold text-[9px] uppercase tracking-widest border transition-all cursor-pointer ${
                              p.is_authorized
                                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25'
                                : 'bg-red-500/15 border-red-500/30 text-red-400 hover:bg-red-500/25'
                            }`}
                          >
                            {p.is_authorized ? (
                              <>
                                <UserCheck className="w-3.5 h-3.5" />
                                Autorizado
                              </>
                            ) : (
                              <>
                                <UserX className="w-3.5 h-3.5" />
                                Bloqueado
                              </>
                            )}
                          </button>
                        </td>
                        <td className="p-4 text-right">
                          <button
                            disabled={isUpdating}
                            onClick={() => handleDeleteProfile(p.id, p.name || p.email)}
                            className="p-2 text-slate-500 hover:text-red-500 hover:bg-red-500/10 border border-transparent rounded-none transition-all cursor-pointer"
                            title="Eliminar Usuario"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                {profiles.filter(p => {
                  const term = searchTerm.toLowerCase();
                  return p.name?.toLowerCase().includes(term) || p.email?.toLowerCase().includes(term);
                }).length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-550 font-bold uppercase tracking-wider text-[10px]">
                      No se encontraron usuarios.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
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
              className="w-full max-w-md glass-card border border-white/10 overflow-hidden shadow-2xl rounded-none"
            >
              <div className="h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
              <div className="p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-9 h-9 rounded-none bg-amber-500/20 border border-amber-500/20 flex items-center justify-center">
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
                        className="w-full px-3 py-2.5 bg-[#131c2e] border border-white/5 rounded-none text-white font-semibold outline-none text-xs focus:border-amber-500/30 transition-colors"
                      />
                    </div>
                  ))}

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowCreateModal(false)}
                      className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-slate-400 rounded-none text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={creatingHotel}
                      className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-black rounded-none text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
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

      {/* Invite/Add Member Modal -> Formulario de creación de usuario */}
      <AnimatePresence>
        {showInviteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
            onClick={(e) => e.target === e.currentTarget && setShowInviteModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-md glass-card border border-white/10 overflow-hidden shadow-2xl rounded-none"
            >
              <div className="h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-none bg-amber-500/20 border border-amber-500/20 flex items-center justify-center">
                      <UserPlus className="w-4.5 h-4.5 text-amber-400" style={{ width: '18px', height: '18px' }} />
                    </div>
                    <div>
                      <h2 className="text-base font-black text-white">Nuevo Miembro</h2>
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider">Creación de usuario administrativa</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowInviteModal(false)}
                    className="p-1 text-slate-500 hover:text-white bg-transparent border-none outline-none cursor-pointer"
                  >
                    <X className="w-4.5 h-4.5" />
                  </button>
                </div>

                <form onSubmit={handleCreateUserAdmin} className="space-y-3.5">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Nombre Completo *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Juan Pérez"
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                      className="w-full px-3 py-2.5 bg-[#131c2e] border border-white/5 rounded-none text-white font-semibold outline-none text-xs focus:border-amber-500/30 transition-colors"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Correo Electrónico *</label>
                    <input
                      type="email"
                      required
                      placeholder="juan@hotel.com"
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      className="w-full px-3 py-2.5 bg-[#131c2e] border border-white/5 rounded-none text-white font-semibold outline-none text-xs focus:border-amber-500/30 transition-colors"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Contraseña Temporal *</label>
                    <input
                      type="text"
                      required
                      placeholder="Clave para iniciar sesión"
                      value={newUserPassword}
                      onChange={(e) => setNewUserPassword(e.target.value)}
                      className="w-full px-3 py-2.5 bg-[#131c2e] border border-white/5 rounded-none text-white font-semibold outline-none text-xs focus:border-amber-500/30 transition-colors"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Rol inicial</label>
                      <select
                        value={newUserRole}
                        onChange={(e) => setNewUserRole(e.target.value)}
                        className="w-full px-3 py-2.5 bg-[#131c2e] border border-white/5 rounded-none text-white font-semibold outline-none text-xs focus:border-amber-500/30 transition-colors cursor-pointer"
                      >
                        <option value="receptionist">Recepcionista</option>
                        <option value="admin">Administrador</option>
                        <option value="cleaner">Camarera</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Acceso inicial</label>
                      <select
                        value={newUserAuthorized ? 'true' : 'false'}
                        onChange={(e) => setNewUserAuthorized(e.target.value === 'true')}
                        className="w-full px-3 py-2.5 bg-[#131c2e] border border-white/5 rounded-none text-white font-semibold outline-none text-xs focus:border-amber-500/30 transition-colors cursor-pointer"
                      >
                        <option value="true">Autorizado</option>
                        <option value="false">Bloqueado</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Hotel Asignado *</label>
                    <select
                      required
                      value={newUserCompanyId}
                      onChange={(e) => setNewUserCompanyId(e.target.value)}
                      className="w-full px-3 py-2.5 bg-[#131c2e] border border-white/5 rounded-none text-white font-semibold outline-none text-xs focus:border-amber-500/30 transition-colors cursor-pointer"
                    >
                      <option value="" disabled>Selecciona un Hotel</option>
                      {companies.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex gap-2 pt-3">
                    <button
                      type="button"
                      onClick={() => setShowInviteModal(false)}
                      className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-slate-400 rounded-none text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={creatingUser}
                      className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-black rounded-none text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
                    >
                      {creatingUser ? 'Creando...' : 'Crear Usuario'}
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
