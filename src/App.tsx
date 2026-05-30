import { useState, useEffect } from 'react';
import { supabase, hotelRpc } from './lib/supabase';
import type { Profile } from './types';
import { PublicBookingPortal } from './components/PublicBookingPortal';
import { RoomKanban } from './components/RoomKanban';
import { BookingCalendar } from './components/BookingCalendar';
import { CleaningDashboard } from './components/CleaningDashboard';
import { AdminSettings } from './components/AdminSettings';
import { NexusOwnerDashboard } from './components/NexusOwnerDashboard';
import { 
  LogOut, 
  User, 
  Lock, 
  Menu, 
  X, 
  LogIn, 
  Info,
  ExternalLink,
  Sliders,
  Globe,
  Building2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type ViewMode = 'portal' | 'kanban' | 'calendar' | 'cleaning' | 'admin' | 'login' | 'nexusowner';
const NEXUS_OWNER_EMAIL = 'ariel.mellag@gmail.com';

function App() {
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<ViewMode>('portal');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Auth form states
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  // Selected company and available companies list for Ariel Mellag / admin switching views
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [companies, setCompanies] = useState<any[]>([]);

  // Fetch session and profile
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch all companies when profile changes if user is admin or Ariel
  useEffect(() => {
    if (profile && (profile.role === 'admin' || profile.email === NEXUS_OWNER_EMAIL)) {
      hotelRpc.getCompanies().then(({ data, error }) => {
        if (!error && data) {
          setCompanies(data);
        }
      });
    } else {
      setCompanies([]);
    }
  }, [profile]);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await hotelRpc.getProfile(userId);

      if (error) throw error;
      // RPC returns array, take first item
      const profileData = Array.isArray(data) ? data[0] : data;
      if (!profileData) throw new Error('Profile not found');

      setProfile(profileData as Profile);

      // Auto route based on role when logging in
      if (activeView === 'login' || activeView === 'portal') {
        if (profileData.role === 'cleaner') {
          setActiveView('cleaning');
        } else {
          setActiveView('kanban');
        }
      }
    } catch (err) {
      console.error('Error fetching user profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);

    try {
      if (isRegister) {
        // Register user
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name: fullName
            }
          }
        });
        if (error) throw error;
        if (data.user) {
          alert('¡Registro exitoso! Ya puedes iniciar sesión.');
          setIsRegister(false);
        }
      } else {
        // Login user
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (error) throw error;
      }
    } catch (err: any) {
      setAuthError(err.message || 'Ocurrió un error en la autenticación.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSelectedCompanyId(null);
    setActiveView('portal');
  };
 
  const handleQuickViewChange = (role: 'guest' | 'receptionist' | 'cleaner' | 'admin') => {
    setSelectedCompanyId(null);
    if (role === 'guest') {
      supabase.auth.signOut().then(() => {
        setActiveView('portal');
      });
    } else {
      const mockEmail = role === 'admin' 
        ? 'ariel.mellag@gmail.com' 
        : role === 'cleaner' 
          ? 'camarera.demo@nexusgrand.cl' 
          : 'recepcion.demo@nexusgrand.cl';
      
      const mockProfile: Profile = {
        id: role === 'admin' ? '94b8bae5-0ec2-409d-8937-bbaa2f710018' : 'mock-id-' + role,
        email: mockEmail,
        name: role === 'admin' ? 'Ariel Mellag' : role === 'cleaner' ? 'Demo Camarera' : 'Demo Recepcionista',
        role: role === 'admin' ? 'admin' : role === 'cleaner' ? 'cleaner' : 'receptionist',
        company_id: '20a9a13f-e8b2-4d2d-a16b-d36c57f7eb9b',
        is_authorized: true,
        created_at: new Date().toISOString()
      };
 
      setSession({ user: { id: mockProfile.id, email: mockEmail } });
      setProfile(mockProfile);
      
      if (role === 'cleaner') {
        setActiveView('cleaning');
      } else {
        setActiveView('kanban');
      }
    }
  };
 
  const companyId = selectedCompanyId || profile?.company_id || '20a9a13f-e8b2-4d2d-a16b-d36c57f7eb9b'; // Fallback to selected hotel or profile or demo hotel ID

  const [logoUrl, setLogoUrl] = useState<string>('');
  const [currentCompany, setCurrentCompany] = useState<any>(null);

  useEffect(() => {
    if (!companyId) return;
    
    const fetchCompanyAndLogo = async () => {
      try {
        const { data, error } = await hotelRpc.getSettings(companyId);
        if (!error && data) {
          const setData = Array.isArray(data) ? data[0] : data;
          setLogoUrl(setData?.logo_url || '');
        }

        const { data: compData, error: compError } = await hotelRpc.getCompany(companyId);
        if (!compError && compData) {
          const c = Array.isArray(compData) ? compData[0] : compData;
          setCurrentCompany(c);
        }
      } catch (err) {
        console.error('Error fetching company details:', err);
      }
    };

    fetchCompanyAndLogo();

    // Listen to settings update events to refetch logo in live editing
    window.addEventListener('hotel-settings-updated', fetchCompanyAndLogo);
    return () => {
      window.removeEventListener('hotel-settings-updated', fetchCompanyAndLogo);
    };
  }, [companyId]);

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex flex-col font-sans relative overflow-hidden transition-colors duration-300">
      {/* Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-blue-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-emerald-500/5 blur-[120px] pointer-events-none" />

      {/* Main Header / Top Navbar */}
      <header className="sticky top-0 z-50 bg-[#0d1424]/95 backdrop-blur-md border-b border-white/10 px-6 py-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          {logoUrl ? (
            <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center p-1 shadow-lg shadow-blue-500/15 border border-white/10 overflow-hidden">
              <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 text-white font-black text-sm uppercase tracking-wider">
              {(currentCompany?.name || 'Nexus Hotel').substring(0, 2)}
            </div>
          )}
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-base font-black tracking-tight text-white uppercase font-sans">{currentCompany?.name || 'Nexus Hotel'}</span>
            </div>
            <p className="text-[9px] text-slate-500 font-extrabold uppercase tracking-widest mt-0.5">
              {profile?.company_id ? 'Consola Operativa' : 'Portal de Reserva'}
            </p>
          </div>
        </div>

        {/* Desktop Navigation Tabs */}
        {session ? (
          <nav className="hidden lg:flex items-center gap-1 bg-[#121b2d] p-1.5 rounded-2xl border border-white/5">
            <button
              onClick={() => setActiveView('portal')}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                activeView === 'portal'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Portal Público
            </button>

            {profile && (
              <>
                {(profile.role === 'admin' || profile.role === 'receptionist') && (
                  <>
                    <button
                      onClick={() => setActiveView('kanban')}
                      className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                        activeView === 'kanban'
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Gemba Kanban
                    </button>
                    <button
                      onClick={() => setActiveView('calendar')}
                      className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                        activeView === 'calendar'
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Calendario
                    </button>
                  </>
                )}

                {(profile.role === 'admin' || profile.role === 'cleaner') && (
                  <button
                    onClick={() => setActiveView('cleaning')}
                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                      activeView === 'cleaning'
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Limpieza
                  </button>
                )}

                {profile.role === 'admin' && (
                  <button
                    onClick={() => setActiveView('admin')}
                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                      activeView === 'admin'
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Ajustes
                  </button>
                )}

                {profile.email === NEXUS_OWNER_EMAIL && (
                  <button
                    onClick={() => setActiveView('nexusowner')}
                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                      activeView === 'nexusowner'
                        ? 'bg-amber-500 text-black shadow-md'
                        : 'text-amber-400/70 hover:text-amber-400'
                    }`}
                  >
                    <Globe className="w-3.5 h-3.5" />
                    NexusOwner
                  </button>
                )}
              </>
            )}
          </nav>
        ) : null}

        {/* Right controls wrapper with Quick View selector */}
        <div className="flex items-center gap-3">
          {/* Hotel Selector (visible to admin or Ariel Mellag) */}
          {(profile?.role === 'admin' || profile?.email === NEXUS_OWNER_EMAIL) && companies.length > 0 && (
            <div className="flex items-center gap-1.5 bg-[#121b2d] px-2.5 py-1.5 rounded-xl border border-white/5 shadow-sm">
              {logoUrl ? (
                <div className="w-3.5 h-3.5 shrink-0 rounded bg-white flex items-center justify-center p-0.5 overflow-hidden border border-white/10">
                  <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
                </div>
              ) : (
                <Building2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              )}
              <select
                value={companyId}
                onChange={(e) => setSelectedCompanyId(e.target.value)}
                className="bg-transparent border-none text-[10px] font-black uppercase tracking-wider text-slate-300 outline-none cursor-pointer pr-1"
              >
                {companies.map((c) => (
                  <option key={c.id} value={c.id} className="bg-[#0c1221] text-slate-300">
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Quick View selector (visible only to logged-in users) */}
          {session && (
            <div className="flex items-center gap-1.5 bg-[#121b2d] px-2.5 py-1.5 rounded-xl border border-white/5 shadow-sm">
              <Sliders className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <select
                value={activeView === 'portal' && !session ? 'guest' : profile?.role || 'guest'}
                onChange={(e) => handleQuickViewChange(e.target.value as any)}
                className="bg-transparent border-none text-[10px] font-black uppercase tracking-wider text-slate-300 outline-none cursor-pointer pr-1"
              >
                <option value="guest" className="bg-[#0c1221] text-slate-300">Huésped</option>
                <option value="receptionist" className="bg-[#0c1221] text-slate-300">Recepcionista</option>
                <option value="cleaner" className="bg-[#0c1221] text-slate-300">Camarera</option>
                <option value="admin" className="bg-[#0c1221] text-slate-300">Administrador</option>
              </select>
            </div>
          )}

          {/* Desktop Right Side Controls */}
          <div className="hidden lg:flex items-center gap-4">
            {loading ? (
              <div className="w-8 h-8 rounded-full bg-slate-800 animate-pulse" />
            ) : session && profile ? (
              <div className="flex items-center gap-3 bg-[#121b2d] py-1.5 pl-3 pr-2.5 rounded-2xl border border-white/5">
                <div className="text-left">
                  <span className="text-xs font-extrabold text-white block leading-tight">{profile.name || profile.email}</span>
                  <span className="text-[9px] text-slate-500 font-extrabold uppercase tracking-widest block mt-0.5">
                    {profile.role === 'admin' ? 'Administrador' : profile.role === 'cleaner' ? 'Camarera' : 'Recepcionista'}
                  </span>
                </div>
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-xs uppercase">
                  {profile.role.substring(0, 2)}
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 hover:bg-red-500/10 text-slate-500 hover:text-red-500 rounded-xl transition-all"
                  title="Cerrar Sesión"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setActiveView('login')}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-md shadow-blue-500/10 active:scale-[0.98]"
              >
                <LogIn className="w-4 h-4" />
                Acceso Staff
              </button>
            )}
          </div>

          {/* Mobile menu trigger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 text-slate-400 hover:text-white bg-[#121b2d] rounded-xl border border-white/5"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile Navigation Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden bg-[#0d1424] border-b border-white/5 overflow-hidden shadow-2xl relative z-40"
          >
            <div className="p-6 space-y-4">
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => { setActiveView('portal'); setMobileMenuOpen(false); }}
                  className={`w-full py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider text-left transition-all ${
                    activeView === 'portal' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-white/5'
                  }`}
                >
                  Portal Público
                </button>

                {session && profile && (
                  <>
                    {(profile.role === 'admin' || profile.role === 'receptionist') && (
                      <>
                        <button
                          onClick={() => { setActiveView('kanban'); setMobileMenuOpen(false); }}
                          className={`w-full py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider text-left transition-all ${
                            activeView === 'kanban' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-white/5'
                          }`}
                        >
                          Gemba Kanban
                        </button>
                        <button
                          onClick={() => { setActiveView('calendar'); setMobileMenuOpen(false); }}
                          className={`w-full py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider text-left transition-all ${
                            activeView === 'calendar' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-white/5'
                          }`}
                        >
                          Calendario
                        </button>
                      </>
                    )}

                    {(profile.role === 'admin' || profile.role === 'cleaner') && (
                      <button
                        onClick={() => { setActiveView('cleaning'); setMobileMenuOpen(false); }}
                        className={`w-full py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider text-left transition-all ${
                          activeView === 'cleaning' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-white/5'
                        }`}
                      >
                        Limpieza
                      </button>
                    )}

                    {profile.role === 'admin' && (
                      <button
                        onClick={() => { setActiveView('admin'); setMobileMenuOpen(false); }}
                        className={`w-full py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider text-left transition-all ${
                          activeView === 'admin' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-white/5'
                        }`}
                      >
                        Ajustes
                      </button>
                    )}
                  </>
                )}
              </div>

              <div className="h-[1px] bg-white/5" />

              <div className="pt-2">
                {session && profile ? (
                  <div className="flex items-center justify-between bg-white/5 p-4 rounded-2xl border border-white/5">
                    <div>
                      <span className="text-xs font-extrabold text-white block leading-tight">{profile.name || profile.email}</span>
                      <span className="text-[9px] text-slate-500 font-extrabold uppercase tracking-widest block mt-1">
                        {profile.role === 'admin' ? 'Administrador' : profile.role === 'cleaner' ? 'Camarera' : 'Recepcionista'}
                      </span>
                    </div>
                    <button
                      onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                      className="p-2.5 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white rounded-xl transition-all"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => { setActiveView('login'); setMobileMenuOpen(false); }}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2"
                  >
                    <LogIn className="w-4 h-4" />
                    Acceso Staff
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Container */}
      <main className="flex-1 px-4 md:px-8 py-8 relative z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeView}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="w-full h-full"
          >
            {/* 0. NEXUS OWNER — Superadmin global */}
            {activeView === 'nexusowner' && <NexusOwnerDashboard ownerEmail={NEXUS_OWNER_EMAIL} />}

            {/* 1. PUBLIC BOOKING PORTAL */}
            {activeView === 'portal' && <PublicBookingPortal profile={profile} session={session} />}

            {/* 2. KANBAN OPERATION BOARD */}
            {activeView === 'kanban' && <RoomKanban companyId={companyId} />}

            {/* 3. RESERVATIONS CALENDAR */}
            {activeView === 'calendar' && <BookingCalendar companyId={companyId} />}

            {/* 4. CLEANING OPERATION MODULE */}
            {activeView === 'cleaning' && <CleaningDashboard companyId={companyId} />}

            {/* 5. HOTEL INVENTORY & SETTINGS */}
            {activeView === 'admin' && <AdminSettings companyId={companyId} />}

            {/* 6. STAFF LOGIN CARD */}
            {activeView === 'login' && (
              <div className="max-w-md mx-auto my-12">
                <div className="glass-card border border-white/5 p-8 relative overflow-hidden shadow-2xl">
                  <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-600 to-indigo-600" />
                  
                  <div className="text-center mb-6">
                    <h2 className="text-2xl font-black tracking-tight text-white">Consola Nexus Hotel</h2>
                    <p className="text-[10px] text-slate-500 font-extrabold uppercase tracking-widest mt-1">
                      Acceso exclusivo para el personal
                    </p>
                  </div>

                  <form onSubmit={handleAuth} className="space-y-4">
                    {isRegister && (
                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Nombre Completo</label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                          <input
                            type="text"
                            required
                            placeholder="Ej: María José"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-[#131c2e] border border-white/5 rounded-xl text-white font-bold outline-none text-xs"
                          />
                        </div>
                      </div>
                    )}

                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Correo Electrónico</label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                          type="email"
                          required
                          placeholder="nombre@correo.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 bg-[#131c2e] border border-white/5 rounded-xl text-white font-bold outline-none text-xs"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Contraseña</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                          type="password"
                          required
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 bg-[#131c2e] border border-white/5 rounded-xl text-white font-bold outline-none text-xs"
                        />
                      </div>
                    </div>

                    {authError && (
                      <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs font-semibold leading-relaxed">
                        {authError}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={authLoading}
                      className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-extrabold uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-2"
                    >
                      {authLoading ? 'Procesando...' : isRegister ? 'Registrar Personal' : 'Ingresar'}
                    </button>
                  </form>

                  {/* Informative testing card */}
                  <div className="mt-6 bg-blue-600/5 border border-blue-500/10 p-4 rounded-2xl flex gap-3 text-[10px] leading-relaxed text-blue-300 font-medium">
                    <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-white mb-1 uppercase tracking-wider">Acceso de prueba inteligente</p>
                      Al registrar un correo cualquiera (ej: <code className="text-white">camarera@gmail.com</code>), el sistema lo vinculará automáticamente al hotel de prueba <strong className="text-white">Nexus Grand Hotel</strong> y autorizará su ingreso.
                      <p className="mt-1">
                        - Si el email contiene <code className="text-white">limpieza</code> o <code className="text-white">cleaner</code>, se le asignará rol de <strong>Camarera</strong>.
                        <br />- De lo contrario, se le asignará rol de <strong>Recepcionista</strong>.
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 text-center text-xs">
                    <button
                      onClick={() => {
                        setIsRegister(!isRegister);
                        setAuthError(null);
                      }}
                      className="text-blue-400 hover:text-blue-300 font-bold"
                    >
                      {isRegister ? '¿Ya tienes cuenta? Inicia Sesión' : '¿Nuevo personal? Regístrate aquí'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Lean Footer */}
      <footer className="py-6 px-8 border-t border-white/5 text-center text-[10px] text-slate-500 font-extrabold uppercase tracking-wider flex flex-col sm:flex-row justify-between items-center gap-4 bg-[#0a0f19] mt-12">
        <div className="flex items-center gap-2 mx-auto sm:mx-0">
          <span>© 2026 NEXUS HOTEL — FILOSOFÍA SMARTLEAN</span>
          <span className="h-3.5 w-[1px] bg-white/10" />
          <a href="https://smartlean.cl" target="_blank" rel="noreferrer" className="hover:text-white flex items-center gap-0.5">
            smartlean.cl <ExternalLink className="w-2.5 h-2.5" />
          </a>
        </div>
      </footer>
    </div>
  );
}

export default App;
