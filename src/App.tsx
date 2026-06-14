import { useState, useEffect } from 'react';
import { supabase, hotelRpc } from './lib/supabase';
import type { Profile } from './types';
import { PublicBookingPortal } from './components/PublicBookingPortal';
import { RoomKanban } from './components/RoomKanban';
import { BookingCalendar } from './components/BookingCalendar';
import { CleaningDashboard } from './components/CleaningDashboard';
import { AdminSettings } from './components/AdminSettings';
import { NexusOwnerDashboard } from './components/NexusOwnerDashboard';
import { RestaurantMenuAdmin } from './components/RestaurantMenuAdmin';
import { RestaurantKitchenDashboard } from './components/RestaurantKitchenDashboard';
import { PublicRoomServicePortal } from './components/PublicRoomServicePortal';
import { 
  LogOut, 
  User, 
  Lock, 
  Menu, 
  X, 
  Info,
  Sliders,
  Globe,
  Building2,
  MapPin,
  Phone,
  Mail
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type ViewMode = 'portal' | 'kanban' | 'calendar' | 'cleaning' | 'admin' | 'login' | 'nexusowner' | 'restaurant_admin' | 'kitchen' | 'room_service';
const NEXUS_OWNERS = ['ariel.mellag@gmail.com', 'fariacricardog@gmail.com', 'equipo@belean.cl', 'nbl@sns.cl'];
const isNexusOwnerEmail = (email?: string) => {
  return NEXUS_OWNERS.includes(email?.toLowerCase() || '');
};

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
    const params = new URLSearchParams(window.location.search);
    const viewParam = params.get('view');
    if (viewParam === 'room_service') {
      setActiveView('room_service');
    }

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
    if (profile && (profile.role === 'admin' || isNexusOwnerEmail(profile.email))) {
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
          
          // Inyectar dinámicamente las variables de color del tema en el DOM
          const primaryColor = setData?.theme_primary || '#8b5cf6';
          document.documentElement.style.setProperty('--primary', primaryColor);
          document.documentElement.style.setProperty('--primary-shadow', `${primaryColor}33`); // 33 es 20% opacidad en hex
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

  // Actualizador dinámico de Favicon
  useEffect(() => {
    const favicon = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
    if (favicon) {
      favicon.href = logoUrl || '/favicon.svg';
    }
  }, [logoUrl]);

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex flex-col font-sans relative overflow-hidden transition-colors duration-300">
      {/* Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-blue-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-emerald-500/5 blur-[120px] pointer-events-none" />

      {/* Main Header / Top Navbar */}
      <header className="sticky top-0 z-50 bg-black border-b border-white/10 px-3 py-2 md:px-6 md:py-4 flex items-center justify-between shadow-xl">
        <div className="flex items-center gap-3">
          {logoUrl ? (
            <div className="h-14 w-auto max-w-[120px] shrink-0 flex items-center justify-center overflow-hidden bg-white/5 p-1 rounded">
              <img src={logoUrl} alt="Logo" className="h-full w-auto object-contain" />
            </div>
          ) : (
            <div className="w-9 h-9 rounded-none border border-white/30 flex items-center justify-center text-white font-light text-base tracking-widest font-mono shrink-0 select-none">
              {(currentCompany?.name || 'NH').substring(0, 2).toUpperCase()}
            </div>
          )}
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-light tracking-[0.25em] text-white uppercase font-sans leading-none">{currentCompany?.name || 'Nexus Hotel'}</span>
            </div>
            <p className="text-[8px] text-slate-500 font-bold uppercase tracking-[0.3em] mt-1.5 leading-none">
              {profile?.company_id ? 'Consola Operativa' : 'Hotel Boutique'}
            </p>
          </div>
        </div>

        {/* Desktop Navigation Tabs */}
        {activeView === 'portal' ? (
          <nav className="hidden lg:flex items-center gap-8">
            <button
              onClick={() => document.getElementById('about-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-300 hover:text-white transition-all duration-300 cursor-pointer bg-transparent border-none outline-none"
            >
              Nuestra Identidad
            </button>
            <button
              onClick={() => document.getElementById('services-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-300 hover:text-white transition-all duration-300 cursor-pointer bg-transparent border-none outline-none"
            >
              Servicios
            </button>
            <button
              onClick={() => document.getElementById('booking-portal-content')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-300 hover:text-white transition-all duration-300 cursor-pointer bg-transparent border-none outline-none"
            >
              Habitaciones
            </button>
            <button
              onClick={() => setActiveView('room_service')}
              className="text-[10px] font-black uppercase tracking-[0.25em] text-amber-500 hover:text-amber-400 transition-all duration-300 cursor-pointer bg-transparent border-none outline-none"
            >
              Restaurante
            </button>
            <button
              onClick={() => document.getElementById('contacto')?.scrollIntoView({ behavior: 'smooth', block: 'end' })}
              className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-300 hover:text-white transition-all duration-300 cursor-pointer bg-transparent border-none outline-none"
            >
              Contacto
            </button>
          </nav>
        ) : session ? (
          <nav className="hidden lg:flex items-center gap-3">
            <button
              onClick={() => setActiveView('portal')}
              className={`px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em] transition-all border-b-2 bg-transparent border-none outline-none cursor-pointer ${
                (activeView as string) === 'portal'
                  ? 'text-white font-black'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
              style={{ borderColor: (activeView as string) === 'portal' ? 'var(--primary)' : 'transparent', borderBottomWidth: '2px' }}
            >
              Portal Público
            </button>

            {profile && (
              <>
                {(profile.role === 'admin' || profile.role === 'receptionist') && (
                  <>
                    <button
                      onClick={() => setActiveView('kanban')}
                      className={`px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em] transition-all border-b-2 bg-transparent border-none outline-none cursor-pointer ${
                        activeView === 'kanban'
                          ? 'text-white font-black'
                          : 'border-transparent text-slate-400 hover:text-white'
                      }`}
                      style={{ borderColor: activeView === 'kanban' ? 'var(--primary)' : 'transparent', borderBottomWidth: '2px' }}
                    >
                      Gemba Kanban
                    </button>
                    <button
                      onClick={() => setActiveView('calendar')}
                      className={`px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em] transition-all border-b-2 bg-transparent border-none outline-none cursor-pointer ${
                        activeView === 'calendar'
                          ? 'text-white font-black'
                          : 'border-transparent text-slate-400 hover:text-white'
                      }`}
                      style={{ borderColor: activeView === 'calendar' ? 'var(--primary)' : 'transparent', borderBottomWidth: '2px' }}
                    >
                      Calendario
                    </button>
                  </>
                )}

                {(profile.role === 'admin' || profile.role === 'cleaner') && (
                  <button
                    onClick={() => setActiveView('cleaning')}
                    className={`px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em] transition-all border-b-2 bg-transparent border-none outline-none cursor-pointer ${
                      activeView === 'cleaning'
                        ? 'text-white font-black'
                        : 'border-transparent text-slate-400 hover:text-white'
                    }`}
                    style={{ borderColor: activeView === 'cleaning' ? 'var(--primary)' : 'transparent', borderBottomWidth: '2px' }}
                  >
                    Limpieza
                  </button>
                )}

                {profile.role === 'admin' && (
                  <button
                    onClick={() => setActiveView('admin')}
                    className={`px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em] transition-all border-b-2 bg-transparent border-none outline-none cursor-pointer ${
                      activeView === 'admin'
                        ? 'text-white font-black'
                        : 'border-transparent text-slate-400 hover:text-white'
                    }`}
                    style={{ borderColor: activeView === 'admin' ? 'var(--primary)' : 'transparent', borderBottomWidth: '2px' }}
                  >
                    Ajustes
                  </button>
                )}

                {(profile.role === 'admin' || profile.role === 'receptionist' || profile.role === 'cleaner') && (
                  <button
                    onClick={() => setActiveView('kitchen')}
                    className={`px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em] transition-all border-b-2 bg-transparent border-none outline-none cursor-pointer ${
                      activeView === 'kitchen'
                        ? 'text-white font-black'
                        : 'border-transparent text-slate-400 hover:text-white'
                    }`}
                    style={{ borderColor: activeView === 'kitchen' ? 'var(--primary)' : 'transparent', borderBottomWidth: '2px' }}
                  >
                    Cocina
                  </button>
                )}

                {profile.role === 'admin' && (
                  <button
                    onClick={() => setActiveView('restaurant_admin')}
                    className={`px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em] transition-all border-b-2 bg-transparent border-none outline-none cursor-pointer ${
                      activeView === 'restaurant_admin'
                        ? 'text-white font-black'
                        : 'border-transparent text-slate-400 hover:text-white'
                    }`}
                    style={{ borderColor: activeView === 'restaurant_admin' ? 'var(--primary)' : 'transparent', borderBottomWidth: '2px' }}
                  >
                    Menú Rest.
                  </button>
                )}

                {isNexusOwnerEmail(profile.email) && (
                  <button
                    onClick={() => setActiveView('nexusowner')}
                    className={`px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em] transition-all border-b-2 flex items-center gap-1.5 bg-transparent border-none outline-none cursor-pointer ${
                      activeView === 'nexusowner'
                        ? 'text-white font-black'
                        : 'border-transparent text-amber-500/70 hover:text-amber-400'
                    }`}
                    style={{ borderColor: activeView === 'nexusowner' ? 'var(--primary)' : 'transparent', borderBottomWidth: '2px' }}
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
        <div className="flex items-center gap-4">
          {/* Hotel Selector (visible to admin or Ariel Mellag) */}
          {(profile?.role === 'admin' || isNexusOwnerEmail(profile?.email)) && companies.length > 0 && (
            <div className="hidden md:flex items-center gap-1.5 bg-black px-3 py-2 rounded-none border border-white/10 shadow-sm transition-colors duration-200 hover:border-white/20">
              {logoUrl ? (
                <div className="w-3.5 h-3.5 shrink-0 rounded-none bg-white/10 flex items-center justify-center p-0.5 overflow-hidden border border-white/10">
                  <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
                </div>
              ) : (
                <Building2 className="w-3.5 h-3.5 shrink-0 text-slate-400" />
              )}
              <select
                value={companyId}
                onChange={(e) => setSelectedCompanyId(e.target.value)}
                className="bg-transparent border-none text-[10px] font-black uppercase tracking-wider text-slate-300 outline-none cursor-pointer pr-1"
              >
                {companies.map((c) => (
                  <option key={c.id} value={c.id} className="bg-black text-slate-350">
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Quick View selector (visible only to logged-in users) */}
          {session && (
            <div className="hidden md:flex items-center gap-1.5 bg-black px-3 py-2 rounded-none border border-white/10 shadow-sm transition-colors duration-200 hover:border-white/20">
              <Sliders className="w-3.5 h-3.5 shrink-0 text-slate-400" style={{ color: 'var(--primary, #8b5cf6)' }} />
              <select
                value={activeView === 'portal' && !session ? 'guest' : profile?.role || 'guest'}
                onChange={(e) => handleQuickViewChange(e.target.value as any)}
                className="bg-transparent border-none text-[10px] font-black uppercase tracking-wider text-slate-300 outline-none cursor-pointer pr-1"
              >
                <option value="guest" className="bg-black text-slate-350">Huésped</option>
                <option value="receptionist" className="bg-black text-slate-350">Recepcionista</option>
                <option value="cleaner" className="bg-black text-slate-350">Camarera</option>
                <option value="admin" className="bg-black text-slate-350">Administrador</option>
              </select>
            </div>
          )}

          {/* Desktop Right Side Controls */}
          <div className="hidden lg:flex items-center gap-4">
            {activeView === 'portal' && (
              <button
                onClick={() => document.getElementById('booking-portal-content')?.scrollIntoView({ behavior: 'smooth' })}
                className="px-6 py-2.5 text-white rounded-none text-[10px] font-black uppercase tracking-[0.2em] transition-all hover:scale-105 cursor-pointer shadow-lg border-none outline-none"
                style={{ 
                  backgroundColor: 'var(--primary, #8b5cf6)',
                  boxShadow: '0 4px 14px 0 var(--primary-shadow, rgba(139, 92, 246, 0.2))'
                }}
              >
                Reservar
              </button>
            )}

            {loading ? (
              <div className="w-8 h-8 rounded-none bg-slate-900 border border-white/10 animate-pulse" />
            ) : session && profile ? (
              <div className="flex items-center gap-3 bg-black py-1.5 pl-3 pr-2.5 rounded-none border border-white/10 shadow-sm">
                <div className="text-left">
                  <span className="text-xs font-extrabold text-white block leading-tight">{profile.name || profile.email}</span>
                  <span className="text-[9px] text-slate-500 font-extrabold uppercase tracking-widest block mt-0.5">
                    {profile.role === 'admin' ? 'Administrador' : profile.role === 'cleaner' ? 'Camarera' : 'Recepcionista'}
                  </span>
                </div>
                <div 
                  className="w-8 h-8 rounded-none border flex items-center justify-center font-bold text-xs uppercase transition-all duration-300"
                  style={{ 
                    backgroundColor: 'var(--primary-shadow, rgba(139, 92, 246, 0.1))',
                    borderColor: 'var(--primary, #8b5cf6)',
                    color: 'var(--primary, #8b5cf6)'
                  }}
                >
                  {profile.role.substring(0, 2)}
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 hover:bg-red-500/10 text-slate-500 hover:text-red-500 rounded-none transition-all bg-transparent border-none outline-none cursor-pointer"
                  title="Cerrar Sesión"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : null}
          </div>

          {/* Subtle Staff login for non-logged in users when viewing portal */}
          {!session && activeView === 'portal' && (
            <button
              onClick={() => setActiveView('login')}
              className="hidden lg:flex px-3 py-2 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 hover:text-white transition-all items-center gap-1.5 bg-transparent border-none outline-none cursor-pointer"
            >
              <Lock className="w-3 h-3" />
              Staff
            </button>
          )}

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
                {activeView === 'portal' ? (
                  <>
                    <button
                      onClick={() => { document.getElementById('about-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); setMobileMenuOpen(false); }}
                      className="w-full py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider text-left text-slate-350 hover:bg-white/5 cursor-pointer bg-transparent border-none outline-none"
                    >
                      Nuestra Identidad
                    </button>
                    <button
                      onClick={() => { document.getElementById('services-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); setMobileMenuOpen(false); }}
                      className="w-full py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider text-left text-slate-350 hover:bg-white/5 cursor-pointer bg-transparent border-none outline-none"
                    >
                      Servicios
                    </button>
                    <button
                      onClick={() => { document.getElementById('booking-portal-content')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); setMobileMenuOpen(false); }}
                      className="w-full py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider text-left text-slate-350 hover:bg-white/5 cursor-pointer bg-transparent border-none outline-none"
                    >
                      Habitaciones
                    </button>
                    <button
                      onClick={() => { setActiveView('room_service'); setMobileMenuOpen(false); }}
                      className="w-full py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider text-left text-amber-500 hover:bg-white/5 cursor-pointer bg-transparent border-none outline-none"
                    >
                      Restaurante
                    </button>
                    <button
                      onClick={() => { document.getElementById('contacto')?.scrollIntoView({ behavior: 'smooth', block: 'end' }); setMobileMenuOpen(false); }}
                      className="w-full py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider text-left text-slate-350 hover:bg-white/5 cursor-pointer bg-transparent border-none outline-none"
                    >
                      Contacto
                    </button>
                    
                    {session && (
                      <button
                        onClick={() => { setActiveView('kanban'); setMobileMenuOpen(false); }}
                        className="w-full py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider text-left text-blue-400 hover:bg-white/5 cursor-pointer bg-transparent border-none outline-none border-t border-white/5 mt-2"
                      >
                        Consola Operativa
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => { setActiveView('portal'); setMobileMenuOpen(false); }}
                      className={`w-full py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider text-left transition-all ${
                        (activeView as string) === 'portal' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-white/5'
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

                        {(profile.role === 'admin' || profile.role === 'receptionist' || profile.role === 'cleaner') && (
                          <button
                            onClick={() => { setActiveView('kitchen'); setMobileMenuOpen(false); }}
                            className={`w-full py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider text-left transition-all ${
                              activeView === 'kitchen' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-white/5'
                            }`}
                          >
                            Cocina
                          </button>
                        )}

                        {profile.role === 'admin' && (
                          <button
                            onClick={() => { setActiveView('restaurant_admin'); setMobileMenuOpen(false); }}
                            className={`w-full py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider text-left transition-all ${
                              activeView === 'restaurant_admin' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-white/5'
                            }`}
                          >
                            Menú Rest.
                          </button>
                        )}
                      </>
                    )}
                  </>
                )}
              </div>

              {/* Selectores para personal en móvil */}
              {session && (
                <div className="flex flex-col gap-3 px-4 py-2 border-t border-white/5 lg:hidden">
                  {/* Selector de Hotel en móvil */}
                  {(profile?.role === 'admin' || isNexusOwnerEmail(profile?.email)) && companies.length > 0 && (
                    <div className="flex items-center gap-2 bg-black/40 px-3 py-2 border border-white/10">
                      {logoUrl ? (
                        <div className="w-4 h-4 shrink-0 rounded-none bg-white/10 flex items-center justify-center p-0.5 overflow-hidden border border-white/10">
                          <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
                        </div>
                      ) : (
                        <Building2 className="w-4 h-4 shrink-0 text-slate-400" />
                      )}
                      <select
                        value={companyId}
                        onChange={(e) => {
                          setSelectedCompanyId(e.target.value);
                          setMobileMenuOpen(false);
                        }}
                        className="bg-transparent border-none text-xs font-black uppercase tracking-wider text-slate-350 outline-none cursor-pointer pr-1 flex-grow"
                      >
                        {companies.map((c) => (
                          <option key={c.id} value={c.id} className="bg-slate-900 text-slate-300">
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Selector de Vista Rápida en móvil */}
                  <div className="flex items-center gap-2 bg-black/40 px-3 py-2 border border-white/10">
                    <Sliders className="w-4 h-4 shrink-0 text-slate-400" style={{ color: 'var(--primary, #8b5cf6)' }} />
                    <select
                      value={activeView === 'portal' && !session ? 'guest' : profile?.role || 'guest'}
                      onChange={(e) => {
                        handleQuickViewChange(e.target.value as any);
                        setMobileMenuOpen(false);
                      }}
                      className="bg-transparent border-none text-xs font-black uppercase tracking-wider text-slate-350 outline-none cursor-pointer pr-1 flex-grow"
                    >
                      <option value="guest" className="bg-slate-900 text-slate-300">Huésped</option>
                      <option value="receptionist" className="bg-slate-900 text-slate-300">Recepcionista</option>
                      <option value="cleaner" className="bg-slate-900 text-slate-300">Camarera</option>
                      <option value="admin" className="bg-slate-900 text-slate-300">Administrador</option>
                    </select>
                  </div>
                </div>
              )}

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
                    className="w-full py-3 bg-transparent text-slate-500 hover:text-white transition-all text-xs font-black uppercase tracking-widest flex items-center justify-center gap-1.5 border border-white/10 rounded-xl cursor-pointer"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    Staff Access
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Container */}
      <main className="flex-1 px-3 sm:px-4 md:px-8 pt-16 sm:pt-20 md:pt-24 pb-16 relative z-10">
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
            {activeView === 'nexusowner' && <NexusOwnerDashboard ownerEmail={profile?.email} />}

            {/* 1. PUBLIC BOOKING PORTAL */}
            {activeView === 'portal' && <PublicBookingPortal profile={profile} session={session} setActiveView={setActiveView} />}

            {/* 2. KANBAN OPERATION BOARD */}
            {activeView === 'kanban' && <RoomKanban companyId={companyId} />}

            {/* 3. RESERVATIONS CALENDAR */}
            {activeView === 'calendar' && <BookingCalendar companyId={companyId} />}

            {/* 4. CLEANING OPERATION MODULE */}
            {activeView === 'cleaning' && <CleaningDashboard companyId={companyId} />}

            {/* 5. HOTEL INVENTORY & SETTINGS */}
            {activeView === 'admin' && <AdminSettings companyId={companyId} />}

            {/* 7. RESTAURANT MENU ADMIN */}
            {activeView === 'restaurant_admin' && <RestaurantMenuAdmin companyId={companyId} />}

            {/* 8. RESTAURANT KITCHEN DASHBOARD */}
            {activeView === 'kitchen' && <RestaurantKitchenDashboard companyId={companyId} />}

            {/* 9. GUEST ROOM SERVICE PORTAL */}
            {activeView === 'room_service' && <PublicRoomServicePortal companyId={companyId} />}

            {/* 6. STAFF LOGIN CARD */}
            {activeView === 'login' && (
              <div className="max-w-md mx-auto my-4 sm:my-12">
                <div className="glass-card border border-white/5 p-8 relative overflow-hidden shadow-2xl">
                  <div className="absolute top-0 left-0 right-0 h-1.5" style={{ backgroundColor: 'var(--primary, #8b5cf6)' }} />
                  
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
                      className="w-full py-3.5 text-white rounded-none font-extrabold uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-2 border-none outline-none cursor-pointer hover:brightness-110 active:brightness-95"
                      style={{ 
                        backgroundColor: 'var(--primary, #8b5cf6)',
                        boxShadow: '0 4px 14px var(--primary-shadow, rgba(139, 92, 246, 0.2))'
                      }}
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
                      className="font-bold bg-transparent border-none cursor-pointer outline-none hover:underline"
                      style={{ color: 'var(--primary, #8b5cf6)' }}
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

      {/* Premium Elegant Footer */}
      <footer id="contacto" className="bg-black text-slate-400 border-t border-white/5 py-16 px-6 md:px-12 mt-16 text-left scroll-mt-24">
        <div className="max-w-6xl mx-auto space-y-10">
          
          {/* Top Links Row */}
          <div className="flex flex-wrap gap-x-8 gap-y-3 border-b border-white/5 pb-6 text-[9px] font-extrabold uppercase tracking-[0.3em] text-white">
            <a href="#contacto" className="hover:text-violet-400 transition-colors duration-300">Contacto & Ayuda</a>
            <a href="#terminos" className="hover:text-violet-400 transition-colors duration-300">Términos & Condiciones</a>
            <a href="#privacidad" className="hover:text-violet-400 transition-colors duration-300">Política de Privacidad</a>
          </div>

          {/* Core Info Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            {/* Left: Dynamic Company Details */}
            <div className="space-y-4 text-[11px] font-medium tracking-wide">
              <span className="text-xs font-bold tracking-[0.25em] text-white uppercase block">
                {currentCompany?.name || 'Nexus Hotel'}
              </span>
              <div className="space-y-2.5 text-slate-400">
                <p className="flex items-center gap-2.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span>
                    {currentCompany?.address || 'Av. Providencia 1234'}
                    {currentCompany?.city && `, ${currentCompany?.city}`}
                  </span>
                </p>
                {currentCompany?.phone && (
                  <p className="flex items-center gap-2.5">
                    <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span>{currentCompany.phone}</span>
                  </p>
                )}
                {currentCompany?.email && (
                  <p className="flex items-center gap-2.5">
                    <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <a href={`mailto:${currentCompany.email}`} className="hover:text-white transition-colors underline decoration-white/10">
                      {currentCompany.email}
                    </a>
                  </p>
                )}
              </div>
            </div>

            {/* Right: Social & Copyright */}
            <div className="flex flex-col md:items-end justify-between h-full gap-6">
              {/* Social Icons */}
              <div className="flex items-center gap-5 text-white">
                <a href="https://facebook.com" target="_blank" rel="noreferrer" className="text-white hover:text-violet-400 transition-colors duration-300" title="Facebook">
                  <svg className="w-4 h-4 fill-current hover:scale-110 transition-all duration-300" viewBox="0 0 24 24">
                    <path d="M9 8H7v3h2v9h4v-9h3.6l.4-3H13V6c0-.5.5-1 1-1h2V1h-3c-3 0-5 2-5 5v2z" />
                  </svg>
                </a>
                <a href="https://instagram.com" target="_blank" rel="noreferrer" className="text-white hover:text-violet-400 transition-colors duration-300" title="Instagram">
                  <svg className="w-4 h-4 hover:scale-110 transition-all duration-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                  </svg>
                </a>
                <a href="https://wa.me" target="_blank" rel="noreferrer" className="text-white hover:text-violet-400 transition-colors duration-300" title="WhatsApp">
                  <svg className="w-4 h-4 fill-current hover:text-violet-455 hover:scale-115 transition-all duration-300" viewBox="0 0 24 24">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.73-1.45L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.42 9.864-9.864.002-2.637-1.03-5.114-2.905-6.99C16.658 1.875 14.183 1.84 11.55 1.84c-5.442 0-9.869 4.426-9.873 9.87.002 1.902.506 3.758 1.47 5.416L2.146 20.91l3.96-.948l.54.322z"/>
                  </svg>
                </a>
              </div>

              {/* Copyright & Designed By */}
              <div className="text-[9px] font-extrabold uppercase tracking-widest text-slate-500 text-left md:text-right space-y-2">
                <p>© {new Date().getFullYear()} {currentCompany?.name || 'Nexus Hotel'} — FILOSOFÍA SMARTLEAN</p>
                <div className="flex flex-wrap md:justify-end gap-x-4 gap-y-1">
                  <p>
                    <span>DESIGNED BY </span>
                    <a href="https://smartlean.cl" target="_blank" rel="noreferrer" className="text-slate-400 hover:text-white transition-colors duration-300">
                      smartlean.cl
                    </a>
                  </p>
                  <span className="text-slate-700 hidden md:inline">|</span>
                  <a href="#cookies" className="text-slate-500 hover:text-white transition-colors duration-300">
                    Manage Cookies
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
