import { useState, useEffect } from 'react';
import { hotelRpc } from '../lib/supabase';
import type { MenuCategory, MenuItem } from '../types';
import { 
  Utensils, Loader2, LogOut, ShoppingBag, Plus, Minus, ArrowRight, User, Hash, Lock, CheckCircle2, ArrowLeft
} from 'lucide-react';

interface PublicRoomServicePortalProps {
  companyId: string;
}

interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  notes: string;
}

interface RoomServiceSession {
  booking_id?: string;
  room_id?: string;
  guest_name?: string;
  room_number?: string;
  is_table?: boolean;
  table_number?: string;
}

const DISH_IMAGES: Record<string, string> = {
  'empanaditas de queso': 'https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=400&auto=format&fit=crop',
  'ceviche mixto': 'https://images.unsplash.com/photo-1535400255456-984241443b27?q=80&w=400&auto=format&fit=crop',
  'lomo a lo pobre': 'https://images.unsplash.com/photo-1600891964599-f61ba0e24092?q=80&w=400&auto=format&fit=crop',
  'salmón grillado con puré': 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?q=80&w=400&auto=format&fit=crop',
  'fettuccine al pesto': 'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?q=80&w=400&auto=format&fit=crop',
  'torta tres leches': 'https://images.unsplash.com/photo-1535141192574-5d4897c13636?q=80&w=400&auto=format&fit=crop',
  'mousse de chocolate': 'https://images.unsplash.com/photo-1541795795328-f073b763494e?q=80&w=400&auto=format&fit=crop',
  'pisco sour peruano': 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?q=80&w=400&auto=format&fit=crop',
  'jugo natural de frambuesa': 'https://images.unsplash.com/photo-1553530666-ba11a7da3888?q=80&w=400&auto=format&fit=crop',
  'bebida lata (coca-cola)': 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?q=80&w=400&auto=format&fit=crop'
};

const getDishImageFallback = (name: string, dbUrl?: string | null) => {
  if (dbUrl) return dbUrl;
  const key = name.toLowerCase().trim();
  for (const [dishName, url] of Object.entries(DISH_IMAGES)) {
    if (key.includes(dishName) || dishName.includes(key)) {
      return url;
    }
  }
  return 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=400&auto=format&fit=crop';
};

const playBeep = () => {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(1200, audioCtx.currentTime);
    gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
    
    oscillator.start();
    setTimeout(() => {
      oscillator.stop();
      audioCtx.close();
    }, 150);
  } catch (e) {
    console.log('Error de AudioContext:', e);
  }
};

export function PublicRoomServicePortal({ companyId }: PublicRoomServicePortalProps) {
  // Session states
  const [session, setSession] = useState<RoomServiceSession | null>(null);
  const [accessMode, setAccessMode] = useState<'select' | 'room' | 'table'>('select');
  const [roomNumber, setRoomNumber] = useState('');
  const [guestRut, setGuestRut] = useState('');
  const [tableNumber, setTableNumber] = useState('1');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [scanningQr, setScanningQr] = useState(false);

  // Menu states
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [loadingMenu, setLoadingMenu] = useState(false);

  // Cart states
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [orderNotes, setOrderNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'charged_to_room' | 'pending'>('charged_to_room');
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [lastOrderNumber, setLastOrderNumber] = useState('');

  // States for table-room validation (when at a table but charging to a room)
  const [chargeRoomNumber, setChargeRoomNumber] = useState('');
  const [chargeGuestRut, setChargeGuestRut] = useState('');
  const [chargeError, setChargeError] = useState('');
  const [validatingCharge, setValidatingCharge] = useState(false);

  // Item note modal helper
  const [noteModalItem, setNoteModalItem] = useState<MenuItem | null>(null);
  const [tempItemNote, setTempItemNote] = useState('');

  useEffect(() => {
    // 1. Detectar si hay parámetro de mesa en la URL (ej: ?table=5 o ?mesa=5)
    const params = new URLSearchParams(window.location.search);
    const tableParam = params.get('table') || params.get('mesa');
    if (tableParam) {
      const activeSession: RoomServiceSession = {
        is_table: true,
        table_number: tableParam
      };
      setSession(activeSession);
      sessionStorage.setItem('nexus_room_service_session', JSON.stringify(activeSession));
      setAccessMode('table');
      setPaymentMethod('pending');
      
      // Limpiar parámetros para un refresh limpio
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
      
      // Emitir bip de éxito
      playBeep();
      return;
    }

    // 2. Cargar sesión previa si existe
    const saved = sessionStorage.getItem('nexus_room_service_session');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSession(parsed);
        if (parsed.is_table) {
          setAccessMode('table');
        } else {
          setAccessMode('room');
        }
      } catch (e) {
        sessionStorage.removeItem('nexus_room_service_session');
      }
    }
  }, []);

  const handleSimulatedQrScan = (table: string) => {
    playBeep();
    const activeSession: RoomServiceSession = {
      is_table: true,
      table_number: table
    };
    setSession(activeSession);
    sessionStorage.setItem('nexus_room_service_session', JSON.stringify(activeSession));
    setScanningQr(false);
    setAccessMode('table');
    setPaymentMethod('pending');
  };

  useEffect(() => {
    if (session && companyId) {
      loadMenu();
    }
  }, [session, companyId]);

  async function loadMenu() {
    setLoadingMenu(true);
    try {
      const { data: catData, error: catError } = await hotelRpc.restaurantGetCategories(companyId);
      if (catError) throw catError;
      setCategories((catData as any[]) || []);

      const { data: itemData, error: itemError } = await hotelRpc.restaurantGetMenuItems(companyId);
      if (itemError) throw itemError;
      // Filter only available items
      const availableItems = ((itemData as MenuItem[]) || []).filter(item => item.is_available);
      setMenuItems(availableItems);
    } catch (err) {
      console.error('Error al cargar menú:', err);
    } finally {
      setLoadingMenu(false);
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomNumber.trim() || !guestRut.trim() || !companyId) return;
    setAuthLoading(true);
    setAuthError('');
    try {
      const { data, error } = await hotelRpc.validateRoomAccess(companyId, roomNumber, guestRut);
      if (error) throw error;
      
      const results = data as any[];
      if (results && results.length > 0) {
        const activeSession: RoomServiceSession = {
          booking_id: results[0].booking_id,
          room_id: results[0].room_id,
          guest_name: results[0].guest_name,
          room_number: results[0].room_number,
          is_table: false
        };
        setSession(activeSession);
        sessionStorage.setItem('nexus_room_service_session', JSON.stringify(activeSession));
      } else {
        setAuthError('Acceso denegado. Verifica el N° de habitación y tu RUT de reserva (debe estar en Check-In activo).');
      }
    } catch (err) {
      console.error('Error al validar acceso:', err);
      setAuthError('Ocurrió un error al validar tus datos. Inténtalo nuevamente.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleTableLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tableNumber) return;
    const activeSession: RoomServiceSession = {
      is_table: true,
      table_number: tableNumber
    };
    setSession(activeSession);
    sessionStorage.setItem('nexus_room_service_session', JSON.stringify(activeSession));
    // Por defecto, al estar en mesa el método de pago inicial es pagar en restaurante
    setPaymentMethod('pending');
  };

  const handleLogout = () => {
    sessionStorage.removeItem('nexus_room_service_session');
    setSession(null);
    setAccessMode('select');
    setCart([]);
    setOrderSuccess(false);
    setChargeRoomNumber('');
    setChargeGuestRut('');
    setChargeError('');
  };

  // Cart operations
  const addToCart = (item: MenuItem, quantity: number = 1, notes: string = '') => {
    setCart(prev => {
      const existing = prev.find(ci => ci.menuItem.id === item.id);
      if (existing) {
        return prev.map(ci => 
          ci.menuItem.id === item.id 
            ? { ...ci, quantity: ci.quantity + quantity, notes: notes || ci.notes } 
            : ci
        );
      }
      return [...prev, { menuItem: item, quantity, notes }];
    });
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setCart(prev => {
      return prev.map(ci => {
        if (ci.menuItem.id === itemId) {
          const newQty = ci.quantity + delta;
          return newQty > 0 ? { ...ci, quantity: newQty } : null;
        }
        return ci;
      }).filter(Boolean) as CartItem[];
    });
  };

  const handleOpenNoteModal = (item: MenuItem) => {
    const cartItem = cart.find(ci => ci.menuItem.id === item.id);
    setTempItemNote(cartItem ? cartItem.notes : '');
    setNoteModalItem(item);
  };

  const handleSaveItemNote = () => {
    if (noteModalItem) {
      const existing = cart.find(ci => ci.menuItem.id === noteModalItem.id);
      if (existing) {
        setCart(prev => prev.map(ci => 
          ci.menuItem.id === noteModalItem.id ? { ...ci, notes: tempItemNote } : ci
        ));
      } else {
        addToCart(noteModalItem, 1, tempItemNote);
      }
      setNoteModalItem(null);
    }
  };

  const cartTotal = cart.reduce((sum, ci) => sum + (ci.menuItem.price * ci.quantity), 0);

  const handleSubmitOrder = async () => {
    if (cart.length === 0 || !session || !companyId) return;
    setSubmittingOrder(true);
    setChargeError('');
    try {
      const orderItems = cart.map(ci => ({
        menu_item_id: ci.menuItem.id,
        quantity: ci.quantity,
        unit_price: ci.menuItem.price,
        notes: ci.notes || null
      }));

      let finalRoomId: string | null = null;
      let finalBookingId: string | null = null;
      let finalPaymentStatus = paymentMethod;

      if (session.is_table) {
        if (paymentMethod === 'charged_to_room') {
          if (!chargeRoomNumber.trim() || !chargeGuestRut.trim()) {
            throw new Error('Debes ingresar tu N° de habitación y RUT del huésped.');
          }
          
          setValidatingCharge(true);
          const { data, error: validationError } = await hotelRpc.validateRoomAccess(
            companyId,
            chargeRoomNumber.trim(),
            chargeGuestRut.trim()
          );
          setValidatingCharge(false);

          if (validationError) throw validationError;

          const results = data as any[];
          if (results && results.length > 0) {
            finalRoomId = results[0].room_id;
            finalBookingId = results[0].booking_id;
          } else {
            throw new Error('Validación fallida: Habitación o RUT no corresponden a un Check-In activo.');
          }
        } else {
          finalPaymentStatus = 'pending'; // Pagar en caja/mesa
        }
      } else {
        finalRoomId = session.room_id || null;
        finalBookingId = session.booking_id || null;
      }

      const { data, error } = await hotelRpc.restaurantCreateOrder({
        companyId,
        source: session.is_table ? 'table' : 'room_service',
        tableNumber: session.is_table ? session.table_number || null : null,
        roomId: finalRoomId,
        bookingId: finalBookingId,
        paymentStatus: finalPaymentStatus,
        notes: orderNotes || null,
        items: orderItems
      });

      if (error) throw error;
      setLastOrderNumber(String(data).substring(0, 8));
      setOrderSuccess(true);
      setCart([]);
      setOrderNotes('');
      setCartOpen(false);
      
      // Reset temporal checkout charge states
      setChargeRoomNumber('');
      setChargeGuestRut('');
    } catch (err: any) {
      console.error('Error al procesar pedido:', err);
      if (session.is_table && paymentMethod === 'charged_to_room') {
        setChargeError(err.message || 'Error al validar el cargo a la habitación.');
      } else {
        alert('Error: ' + (err.message || 'No se pudo registrar el pedido. Valida que tu habitación tenga check-in activo.'));
      }
    } finally {
      setSubmittingOrder(false);
    }
  };

  // Filtered menu items
  const filteredItems = selectedCategoryId === 'all'
    ? menuItems
    : menuItems.filter(item => item.category_id === selectedCategoryId);

  // Login Form View
  if (!session) {
    if (scanningQr) {
      return (
        <div className="max-w-md mx-auto my-6 sm:my-12 px-4">
          <div className="glass-card border border-white/5 p-8 relative overflow-hidden shadow-2xl bg-[#090e17] rounded-none text-center">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-amber-500" />
            
            <div className="flex items-center gap-2 mb-6 text-left">
              <button 
                onClick={() => setScanningQr(false)}
                className="p-1.5 bg-white/5 hover:bg-white/10 border border-white/5 text-slate-450 hover:text-white cursor-pointer rounded-none transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider">Atrás</span>
            </div>

            <div className="mb-6">
              <h2 className="text-md font-black text-white uppercase tracking-wider">Escaneo de Código QR</h2>
              <p className="text-[9px] text-slate-400 mt-0.5 uppercase font-bold tracking-widest">Apunte la cámara a la mesa</p>
            </div>

            {/* Caja que emula la cámara activa */}
            <div className="w-full aspect-square max-w-[280px] mx-auto bg-black/80 border border-white/10 relative overflow-hidden flex items-center justify-center mb-6">
              {/* Esquinas del visor de escaneo */}
              <div className="absolute top-3 left-3 w-6 h-6 border-t-2 border-l-2 border-amber-500" />
              <div className="absolute top-3 right-3 w-6 h-6 border-t-2 border-r-2 border-amber-500" />
              <div className="absolute bottom-3 left-3 w-6 h-6 border-b-2 border-l-2 border-amber-500" />
              <div className="absolute bottom-3 right-3 w-6 h-6 border-b-2 border-r-2 border-amber-500" />

              {/* Línea láser animada */}
              <div className="absolute left-0 right-0 h-0.5 bg-amber-500/80 shadow-[0_0_8px_rgba(245,158,11,0.8)] animate-scanner-laser" />

              {/* Simulación visual de cámara activa en modo oscuro */}
              <div className="text-center space-y-2 px-6 z-10">
                <Loader2 className="w-8 h-8 text-amber-500/40 animate-spin mx-auto" />
                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Buscando código QR...</p>
              </div>
            </div>

            {/* Panel de simulación interactivo para depuración */}
            <div className="space-y-3 p-4 bg-white/5 border border-white/5 rounded-none text-left">
              <p className="text-[9px] text-amber-500 font-black uppercase tracking-widest text-center mb-1">Simulador de Códigos QR Físicos</p>
              <p className="text-[9px] text-slate-400 leading-relaxed text-center mb-3">En un restaurante real, el cliente sólo escanea el código en su mesa. Selecciona una mesa abajo para simular el escaneo:</p>
              <div className="grid grid-cols-5 gap-1.5">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                  <button
                    key={n}
                    onClick={() => handleSimulatedQrScan(String(n))}
                    className="py-1.5 bg-black/45 hover:bg-amber-500 hover:text-black border border-white/5 text-slate-300 font-mono text-xs font-bold transition-all cursor-pointer rounded-none"
                  >
                    M{n}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="max-w-md mx-auto my-6 sm:my-12 px-4">
        <div className="glass-card border border-white/5 p-8 relative overflow-hidden shadow-2xl bg-[#090e17] rounded-none">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-amber-500" />
          
          {accessMode === 'select' && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-14 h-14 bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center rounded-none mx-auto mb-3">
                  <Utensils className="w-7 h-7" />
                </div>
                <h2 className="text-lg font-black text-white uppercase tracking-wider">Restaurante Grand Hotel</h2>
                <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-widest">Portal de Pedidos Digital</p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => setAccessMode('room')}
                  className="w-full p-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-amber-500/30 text-left transition-all rounded-none group cursor-pointer"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-black text-white uppercase tracking-wider group-hover:text-amber-500 transition-colors">Pedir a la Habitación</span>
                    <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-amber-500 transition-all group-hover:translate-x-1" />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">Servicio a la Habitación. Carga directo a tu cuenta del hotel al hacer el check-out.</p>
                </button>

                <button
                  onClick={() => setAccessMode('table')}
                  className="w-full p-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-amber-500/30 text-left transition-all rounded-none group cursor-pointer"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-black text-white uppercase tracking-wider group-hover:text-amber-500 transition-colors">Pedir desde la Mesa</span>
                    <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-amber-500 transition-all group-hover:translate-x-1" />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">Ordena desde tu mesa actual. Puedes pagar directo al mesero/caja o bien cargar a tu habitación.</p>
                </button>

                <button
                  onClick={() => setScanningQr(true)}
                  className="w-full p-4 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 hover:border-amber-500 text-left transition-all rounded-none group cursor-pointer flex items-center justify-between"
                >
                  <div>
                    <span className="text-xs font-black text-amber-500 uppercase tracking-wider">Escanear Código QR de Mesa</span>
                    <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">Apunte con la cámara del celular al código QR pegado en su mesa para iniciar el pedido al instante.</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-amber-500 group-hover:translate-x-1 transition-all shrink-0" />
                </button>
              </div>
            </div>
          )}

          {accessMode === 'room' && (
            <div>
              <div className="flex items-center gap-2 mb-6">
                <button 
                  onClick={() => { setAccessMode('select'); setAuthError(''); }}
                  className="p-1.5 bg-white/5 hover:bg-white/10 border border-white/5 text-slate-450 hover:text-white cursor-pointer rounded-none transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider">Atrás</span>
              </div>

              <div className="text-center mb-6">
                <h2 className="text-md font-black text-white uppercase tracking-wider">Servicio de Habitación</h2>
                <p className="text-[9px] text-slate-400 mt-0.5 uppercase font-bold tracking-widest">Valida tu Habitación</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-[9px] text-slate-450 uppercase font-black tracking-widest mb-1.5 flex items-center gap-1.5">
                    <Hash className="w-3 h-3 text-amber-500" /> N° Habitación
                  </label>
                  <input
                    type="text"
                    required
                    value={roomNumber}
                    onChange={(e) => setRoomNumber(e.target.value)}
                    className="w-full px-3.5 py-3 bg-black/40 border border-white/10 rounded-none text-white font-semibold outline-none text-xs focus:border-amber-500/30 transition-colors"
                    placeholder="Ej: 101"
                  />
                </div>

                <div>
                  <label className="block text-[9px] text-slate-450 uppercase font-black tracking-widest mb-1.5 flex items-center gap-1.5">
                    <User className="w-3 h-3 text-amber-500" /> RUT del Huésped
                  </label>
                  <input
                    type="text"
                    required
                    value={guestRut}
                    onChange={(e) => setGuestRut(e.target.value)}
                    className="w-full px-3.5 py-3 bg-black/40 border border-white/10 rounded-none text-white font-semibold outline-none text-xs focus:border-amber-500/30 transition-colors"
                    placeholder="Ej: 17257060-7"
                  />
                </div>

                {authError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-none text-xs font-semibold leading-relaxed">
                    {authError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 text-black rounded-none font-black uppercase tracking-widest text-[10px] transition-colors flex items-center justify-center gap-2 border-none cursor-pointer"
                >
                  {authLoading ? 'Verificando...' : 'Acceder al Menú'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}

          {accessMode === 'table' && (
            <div>
              <div className="flex items-center gap-2 mb-6">
                <button 
                  onClick={() => { setAccessMode('select'); setAuthError(''); }}
                  className="p-1.5 bg-white/5 hover:bg-white/10 border border-white/5 text-slate-450 hover:text-white cursor-pointer rounded-none transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider">Atrás</span>
              </div>

              <div className="text-center mb-6">
                <h2 className="text-md font-black text-white uppercase tracking-wider">Comensal en Mesa</h2>
                <p className="text-[9px] text-slate-400 mt-0.5 uppercase font-bold tracking-widest">Selecciona tu Mesa</p>
              </div>

              <form onSubmit={handleTableLogin} className="space-y-5">
                <div>
                  <label className="block text-[9px] text-slate-450 uppercase font-black tracking-widest mb-1.5 flex items-center gap-1.5">
                    <Hash className="w-3 h-3 text-amber-500" /> N° de Mesa
                  </label>
                  <select
                    value={tableNumber}
                    onChange={(e) => setTableNumber(e.target.value)}
                    className="w-full px-3.5 py-3 bg-black border border-white/10 rounded-none text-white font-semibold outline-none text-xs focus:border-amber-500/30 transition-colors"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                      <option key={n} value={String(n)}>Mesa {n}</option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 text-black rounded-none font-black uppercase tracking-widest text-[10px] transition-colors flex items-center justify-center gap-2 border-none cursor-pointer"
                >
                  Ver Menú del Restaurante
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}
          
          <div className="mt-6 border-t border-white/5 pt-4 flex gap-3 text-[9px] leading-relaxed text-slate-450 font-bold uppercase tracking-wider">
            <Lock className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
            <div>
              {accessMode === 'room' 
                ? 'Solo los huéspedes con habitaciones activas en check-in pueden ingresar. El cargo a la cuenta se liquida en recepción.'
                : 'Acceso directo para pedidos en mesa. El cobro puede liquidarse en el restaurante o cargarse a la habitación al checkout.'}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main Room Service Menu View
  return (
    <div className="max-w-4xl mx-auto px-4 pb-24 space-y-6 relative">
      {/* Session Header */}
      <div className="flex justify-between items-center bg-black/40 border border-white/5 p-4 rounded-none">
        <div>
          {session.is_table ? (
            <>
              <p className="text-[9px] text-amber-500 font-black uppercase tracking-widest">Pedido desde Mesa</p>
              <h2 className="text-sm font-black text-white uppercase tracking-tight">Mesa {session.table_number}</h2>
            </>
          ) : (
            <>
              <p className="text-[9px] text-amber-500 font-black uppercase tracking-widest">Sesión de Habitación {session.room_number}</p>
              <h2 className="text-sm font-black text-white uppercase tracking-tight">Bienvenido, {session.guest_name}</h2>
            </>
          )}
        </div>
        <button
          onClick={handleLogout}
          className="p-2 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/5 cursor-pointer rounded-none transition-colors"
          title="Cerrar Sesión"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>

      {orderSuccess ? (
        <div className="glass-card border border-white/5 bg-black/30 p-8 text-center space-y-4 rounded-none">
          <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center rounded-none mx-auto">
            <CheckCircle2 className="w-9 h-9" />
          </div>
          <h2 className="text-xl font-black text-white uppercase tracking-tight">¡Tu pedido ha sido recibido!</h2>
          <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
            {session.is_table
              ? `Hemos enviado tu pedido directamente a la cocina. Nuestro personal lo llevará a la Mesa ${session.table_number} a la brevedad.`
              : 'Hemos enviado tu pedido directamente a la cocina del restaurante. Nuestro personal lo llevará a tu habitación a la brevedad.'
            }
          </p>
          <div className="py-2.5 px-4 bg-white/5 rounded-none inline-block border border-white/5 font-mono text-xs text-slate-400">
            N° de Pedido: <span className="text-white font-extrabold uppercase">{lastOrderNumber}</span>
          </div>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
            Tiempo estimado: 25 - 35 minutos
          </p>
          <button
            onClick={() => setOrderSuccess(false)}
            className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-black text-xs font-black uppercase tracking-wider rounded-none cursor-pointer mt-4"
          >
            Hacer Otro Pedido
          </button>
        </div>
      ) : (
        <>
          {/* Menu category selectors */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none -mx-4 px-4">
            <button
              onClick={() => setSelectedCategoryId('all')}
              className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-none shrink-0 cursor-pointer border transition-all ${
                selectedCategoryId === 'all'
                  ? 'bg-amber-500 text-black border-amber-500'
                  : 'bg-black/30 text-slate-400 border-white/5 hover:text-white'
              }`}
            >
              Todo
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategoryId(cat.id)}
                className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-none shrink-0 cursor-pointer border transition-all ${
                  selectedCategoryId === cat.id
                    ? 'bg-amber-500 text-black border-amber-500'
                    : 'bg-black/30 text-slate-400 border-white/5 hover:text-white'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Dishes list */}
          {loadingMenu ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredItems.map((item) => {
                const inCart = cart.find(ci => ci.menuItem.id === item.id);
                const imageUrl = getDishImageFallback(item.name, item.image_url);
                return (
                  <div key={item.id} className="glass-card border border-white/5 bg-black/30 flex flex-col sm:flex-row rounded-none overflow-hidden hover:border-amber-500/20 transition-all duration-300">
                    {imageUrl && (
                      <div className="w-full sm:w-28 h-36 sm:h-auto shrink-0 relative overflow-hidden bg-slate-900 border-b sm:border-b-0 sm:border-r border-white/5">
                        <img 
                          src={imageUrl} 
                          alt={item.name} 
                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" 
                        />
                      </div>
                    )}
                    <div className="p-4 flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="text-sm font-extrabold text-white tracking-tight uppercase mb-1">{item.name}</h3>
                        <p className="text-[11px] text-slate-400 leading-relaxed mb-4">{item.description || 'Delicioso plato preparado al instante por nuestro chef.'}</p>
                      </div>

                      <div className="flex justify-between items-center border-t border-white/5 pt-4 mt-auto">
                        <span className="text-sm font-black text-amber-500 font-mono">
                          ${Number(item.price).toLocaleString('es-CL')}
                        </span>
                        
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleOpenNoteModal(item)}
                            className="px-2.5 py-1.5 border border-white/10 hover:border-amber-500/30 text-[10px] text-slate-400 hover:text-amber-500 font-bold uppercase tracking-wider rounded-none cursor-pointer transition-colors"
                          >
                            {inCart && inCart.notes ? 'Ver Nota' : 'Nota'}
                          </button>
                          
                          {inCart ? (
                            <div className="flex items-center bg-white/5 border border-white/5 rounded-none">
                              <button
                                onClick={() => updateQuantity(item.id, -1)}
                                className="p-1.5 text-slate-400 hover:text-white cursor-pointer"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="px-2.5 text-xs font-black text-white font-mono">{inCart.quantity}</span>
                              <button
                                onClick={() => updateQuantity(item.id, 1)}
                                className="p-1.5 text-slate-400 hover:text-white cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => addToCart(item)}
                              className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-black text-[10px] font-black uppercase tracking-widest rounded-none cursor-pointer transition-colors"
                            >
                              Agregar
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {filteredItems.length === 0 && (
                <div className="col-span-full text-center py-20 text-slate-500 border border-dashed border-white/5 rounded-none">
                  <p className="text-[10px] font-black uppercase tracking-wider">No hay platos disponibles en esta categoría</p>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Floating Cart Bar (Bottom screen) */}
      {cart.length > 0 && !orderSuccess && (
        <div className="fixed bottom-4 left-4 right-4 z-50 max-w-lg mx-auto">
          <button
            onClick={() => setCartOpen(true)}
            className="w-full p-4 bg-amber-500 hover:bg-amber-600 text-black font-black uppercase tracking-widest text-[11px] rounded-none cursor-pointer shadow-2xl flex justify-between items-center transition-all animate-bounce"
          >
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4" />
              <span>Ver Pedido ({cart.reduce((s, ci) => s + ci.quantity, 0)})</span>
            </div>
            <span className="font-mono text-xs">${cartTotal.toLocaleString('es-CL')}</span>
          </button>
        </div>
      )}

      {/* Item Note Modal */}
      {noteModalItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-sm glass-card border border-white/10 bg-[#090e17] rounded-none shadow-2xl overflow-hidden">
            <div className="h-1 bg-amber-500 w-full" />
            <div className="p-6">
              <h3 className="text-sm font-black uppercase tracking-wider text-white mb-2">Instrucciones Especiales</h3>
              <p className="text-[10px] text-slate-450 uppercase font-black tracking-widest mb-4">{noteModalItem.name}</p>
              <textarea
                value={tempItemNote}
                onChange={(e) => setTempItemNote(e.target.value)}
                rows={3}
                className="w-full px-3 py-2.5 bg-black/40 border border-white/5 rounded-none text-white font-semibold outline-none text-xs focus:border-amber-500/30 transition-colors resize-none"
                placeholder="Ej: Sin sal, cocción media, aderezos aparte..."
              />
              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setNoteModalItem(null)}
                  className="flex-1 py-2 bg-white/5 hover:bg-white/10 text-slate-400 rounded-none text-[10px] font-black uppercase tracking-wider cursor-pointer border border-white/5"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveItemNote}
                  className="flex-1 py-2 bg-amber-500 hover:bg-amber-600 text-black rounded-none text-[10px] font-black uppercase tracking-wider cursor-pointer"
                >
                  Confirmar Nota
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cart Sidebar/Overlay Drawer */}
      {cartOpen && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-md bg-[#090e17] border-l border-white/10 p-6 flex flex-col justify-between shadow-2xl relative">
            <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />
            
            {/* Drawer Header */}
            <div>
              <div className="flex justify-between items-center border-b border-white/5 pb-4 mb-4">
                <h3 className="text-sm font-black uppercase tracking-widest text-white flex items-center gap-2">
                  <ShoppingBag className="w-4.5 h-4.5 text-amber-500" />
                  Tu Pedido
                </h3>
                <button
                  onClick={() => setCartOpen(false)}
                  className="text-slate-400 hover:text-white font-extrabold uppercase text-[10px] tracking-wider cursor-pointer border border-white/5 px-2.5 py-1.5"
                >
                  Cerrar
                </button>
              </div>

              {/* Cart Items List */}
              <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-1">
                {cart.map((ci) => (
                  <div key={ci.menuItem.id} className="flex justify-between items-start gap-4 border-b border-white/5 pb-3">
                    <div className="space-y-1">
                      <p className="text-xs font-black text-white uppercase tracking-wide">{ci.menuItem.name}</p>
                      {ci.notes && (
                        <p className="text-[9px] text-amber-500 italic font-semibold">Obs: {ci.notes}</p>
                      )}
                      <div className="flex items-center gap-1 mt-1">
                        <button
                          onClick={() => updateQuantity(ci.menuItem.id, -1)}
                          className="p-1 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-2 text-xs font-extrabold text-white font-mono">{ci.quantity}</span>
                        <button
                          onClick={() => updateQuantity(ci.menuItem.id, 1)}
                          className="p-1 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <span className="font-mono text-xs text-amber-500 shrink-0">
                      ${(ci.menuItem.price * ci.quantity).toLocaleString('es-CL')}
                    </span>
                  </div>
                ))}
              </div>

              {/* Order payment option */}
              <div className="space-y-3 pt-6 border-t border-white/5 mt-4">
                <label className="block text-[9px] text-slate-450 uppercase font-black tracking-widest mb-1.5">Forma de Cobro</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      setPaymentMethod('charged_to_room');
                      setChargeError('');
                    }}
                    className={`py-2 px-3 text-[9px] font-black uppercase tracking-wider rounded-none cursor-pointer border transition-colors ${
                      paymentMethod === 'charged_to_room'
                        ? 'bg-amber-500 text-black border-amber-500'
                        : 'bg-black/30 text-slate-400 border-white/5 hover:text-white'
                    }`}
                  >
                    Cargo a Habitación
                  </button>
                  <button
                    onClick={() => {
                      setPaymentMethod('pending');
                      setChargeError('');
                    }}
                    className={`py-2 px-3 text-[9px] font-black uppercase tracking-wider rounded-none cursor-pointer border transition-colors ${
                      paymentMethod === 'pending'
                        ? 'bg-amber-500 text-black border-amber-500'
                        : 'bg-black/30 text-slate-400 border-white/5 hover:text-white'
                    }`}
                  >
                    {session.is_table ? 'Pagar en Restaurante' : 'Pagar al Recibir'}
                  </button>
                </div>

                {session.is_table && paymentMethod === 'charged_to_room' && (
                  <div className="space-y-3 p-3 bg-white/5 border border-white/5 rounded-none mt-2">
                    <p className="text-[9px] text-amber-500 font-bold uppercase tracking-wider">Datos del Huésped (Check-In Activo)</p>
                    
                    <div>
                      <label className="block text-[8px] text-slate-400 uppercase font-bold tracking-widest mb-1">N° Habitación</label>
                      <input
                        type="text"
                        required
                        value={chargeRoomNumber}
                        onChange={(e) => setChargeRoomNumber(e.target.value)}
                        className="w-full px-2 py-1.5 bg-black/60 border border-white/10 rounded-none text-white outline-none text-xs focus:border-amber-500/30 transition-colors"
                        placeholder="Ej: 101"
                      />
                    </div>

                    <div>
                      <label className="block text-[8px] text-slate-400 uppercase font-bold tracking-widest mb-1">RUT del Huésped</label>
                      <input
                        type="text"
                        required
                        value={chargeGuestRut}
                        onChange={(e) => setChargeGuestRut(e.target.value)}
                        className="w-full px-2 py-1.5 bg-black/60 border border-white/10 rounded-none text-white outline-none text-xs focus:border-amber-500/30 transition-colors"
                        placeholder="Ej: 17257060-7"
                      />
                    </div>

                    {chargeError && (
                      <div className="p-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-none text-[10px] font-semibold leading-relaxed">
                        {chargeError}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Global order notes */}
              <div className="space-y-1.5 pt-4">
                <label className="block text-[9px] text-slate-450 uppercase font-black tracking-widest">Notas del Pedido</label>
                <textarea
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 bg-black/40 border border-white/5 rounded-none text-white font-semibold outline-none text-xs focus:border-amber-500/30 transition-colors resize-none"
                  placeholder="Ej: Traer platos hondos, cubiertos para 2 personas..."
                />
              </div>
            </div>

            {/* Total and Submit */}
            <div className="space-y-4 pt-4 border-t border-white/5 mt-auto">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-450">Total Pedido</span>
                <span className="text-lg font-black text-white font-mono">${cartTotal.toLocaleString('es-CL')}</span>
              </div>
              <button
                onClick={handleSubmitOrder}
                disabled={submittingOrder || cart.length === 0 || (session.is_table && paymentMethod === 'charged_to_room' && (!chargeRoomNumber || !chargeGuestRut)) || validatingCharge}
                className="w-full py-4 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-700 text-black rounded-none font-black uppercase tracking-widest text-xs cursor-pointer transition-colors flex items-center justify-center gap-2"
              >
                {submittingOrder ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Procesando Pedido...
                  </>
                ) : (
                  <>
                    <span>
                      {session.is_table
                        ? `Confirmar Pedido Mesa ${session.table_number}`
                        : `Confirmar Pedido Habitación ${session.room_number}`
                      }
                    </span>
                    <ArrowRight className="w-4.5 h-4.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
