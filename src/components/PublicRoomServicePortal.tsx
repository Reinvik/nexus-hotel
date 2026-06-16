import { useState, useEffect } from 'react';
import { hotelRpc } from '../lib/supabase';
import type { MenuCategory, MenuItem } from '../types';
import {
  Utensils, Loader2, LogOut, ShoppingBag, Plus, Minus, ArrowRight,
  User, Hash, Lock, CheckCircle2, ArrowLeft, Clock,
  CreditCard, Key, Trash2, Check
} from 'lucide-react';

interface PublicRoomServicePortalProps { companyId: string; }
interface CartItem { menuItem: MenuItem; quantity: number; notes: string; }
interface RoomServiceSession {
  booking_id?: string; room_id?: string; guest_name?: string;
  room_number?: string; is_table?: boolean; table_number?: string;
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
  'bebida lata (coca-cola)': 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?q=80&w=400&auto=format&fit=crop',
};

const getDishImage = (name: string, dbUrl?: string | null) => {
  if (dbUrl) return dbUrl;
  const key = name.toLowerCase().trim();
  for (const [k, url] of Object.entries(DISH_IMAGES))
    if (key.includes(k) || k.includes(key)) return url;
  return 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=400&auto=format&fit=crop';
};

const playBeep = () => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator(); const g = ctx.createGain();
    osc.connect(g); g.connect(ctx.destination);
    osc.type = 'sine'; osc.frequency.setValueAtTime(1200, ctx.currentTime);
    g.gain.setValueAtTime(0.08, ctx.currentTime);
    osc.start(); setTimeout(() => { osc.stop(); ctx.close(); }, 150);
  } catch (_) {}
};

export function PublicRoomServicePortal({ companyId }: PublicRoomServicePortalProps) {
  const [session, setSession]         = useState<RoomServiceSession | null>(null);
  const [accessMode, setAccessMode]   = useState<'select' | 'room' | 'table'>('select');
  const [roomNumber, setRoomNumber]   = useState('');
  const [guestRut, setGuestRut]       = useState('');
  const [tableNumber, setTableNumber] = useState('1');
  const [authError, setAuthError]     = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [scanningQr, setScanningQr]   = useState(false);

  const [activeOrderIds, setActiveOrderIds] = useState<string[]>([]);
  const [activeOrders, setActiveOrders]     = useState<any[]>([]);

  const [categories, setCategories]             = useState<MenuCategory[]>([]);
  const [menuItems, setMenuItems]               = useState<MenuItem[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [loadingMenu, setLoadingMenu]           = useState(false);

  const [cart, setCart]                   = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen]           = useState(false);
  const [orderNotes, setOrderNotes]       = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'charged_to_room' | 'pending'>('charged_to_room');
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [orderSuccess, setOrderSuccess]   = useState(false);
  const [lastOrderNumber, setLastOrderNumber] = useState('');

  const [chargeRoomNumber, setChargeRoomNumber] = useState('');
  const [chargeGuestRut, setChargeGuestRut]     = useState('');
  const [chargeError, setChargeError]           = useState('');
  const [validatingCharge, setValidatingCharge] = useState(false);

  const [noteModalItem, setNoteModalItem] = useState<MenuItem | null>(null);
  const [tempItemNote, setTempItemNote]   = useState('');

  useEffect(() => {
    const saved = sessionStorage.getItem('nexus_active_order_ids');
    if (saved) { try { setActiveOrderIds(JSON.parse(saved)); } catch (_) { sessionStorage.removeItem('nexus_active_order_ids'); } }
  }, []);

  useEffect(() => {
    if (activeOrderIds.length > 0 && companyId) {
      loadActiveOrders();
      const iv = setInterval(loadActiveOrders, 10000);
      return () => clearInterval(iv);
    } else setActiveOrders([]);
  }, [activeOrderIds, companyId]);

  async function loadActiveOrders() {
    if (!companyId || activeOrderIds.length === 0) return;
    try {
      const { data, error } = await hotelRpc.restaurantGetOrders(companyId);
      if (error) throw error;
      setActiveOrders(((data as any[]) || [])
        .filter(o => activeOrderIds.includes(o.id))
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    } catch (_) {}
  }

  const handleCancelOrder = async (orderId: string) => {
    if (!confirm('¿Seguro que deseas cancelar este pedido?')) return;
    try {
      const { error } = await hotelRpc.restaurantUpdateOrderStatus(orderId, 'cancelled');
      if (error) throw error;
      loadActiveOrders();
    } catch (err: any) { alert('Error al cancelar: ' + (err.message || '')); }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tableParam = params.get('table') || params.get('mesa');
    if (tableParam) {
      const s: RoomServiceSession = { is_table: true, table_number: tableParam };
      setSession(s); sessionStorage.setItem('nexus_room_service_session', JSON.stringify(s));
      setAccessMode('table'); setPaymentMethod('pending');
      window.history.replaceState({}, document.title, window.location.pathname);
      playBeep(); return;
    }
    const saved = sessionStorage.getItem('nexus_room_service_session');
    if (saved) { try { const p = JSON.parse(saved); setSession(p); setAccessMode(p.is_table ? 'table' : 'room'); } catch (_) { sessionStorage.removeItem('nexus_room_service_session'); } }
  }, []);

  const handleSimulatedQrScan = (table: string) => {
    playBeep();
    const s: RoomServiceSession = { is_table: true, table_number: table };
    setSession(s); sessionStorage.setItem('nexus_room_service_session', JSON.stringify(s));
    setScanningQr(false); setAccessMode('table'); setPaymentMethod('pending');
  };

  useEffect(() => { if (session && companyId) loadMenu(); }, [session, companyId]);

  async function loadMenu() {
    setLoadingMenu(true);
    try {
      const { data: cD, error: cE } = await hotelRpc.restaurantGetCategories(companyId);
      if (cE) throw cE; setCategories((cD as any[]) || []);
      const { data: iD, error: iE } = await hotelRpc.restaurantGetMenuItems(companyId);
      if (iE) throw iE; setMenuItems(((iD as MenuItem[]) || []).filter(i => i.is_available));
    } catch (_) {} finally { setLoadingMenu(false); }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); if (!roomNumber || !guestRut || !companyId) return;
    setAuthLoading(true); setAuthError('');
    try {
      const { data, error } = await hotelRpc.validateRoomAccess(companyId, roomNumber, guestRut);
      if (error) throw error;
      const r = data as any[];
      if (r && r.length > 0) {
        const s: RoomServiceSession = { booking_id: r[0].booking_id, room_id: r[0].room_id, guest_name: r[0].guest_name, room_number: r[0].room_number, is_table: false };
        setSession(s); sessionStorage.setItem('nexus_room_service_session', JSON.stringify(s));
      } else setAuthError('Acceso denegado. Verifica el N° de habitación y tu RUT (debe estar en Check-In activo).');
    } catch (_) { setAuthError('Error al validar tus datos. Inténtalo nuevamente.'); }
    finally { setAuthLoading(false); }
  };

  const handleTableLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const s: RoomServiceSession = { is_table: true, table_number: tableNumber };
    setSession(s); sessionStorage.setItem('nexus_room_service_session', JSON.stringify(s));
    setPaymentMethod('pending');
  };

  const handleLogout = () => {
    sessionStorage.removeItem('nexus_room_service_session');
    setSession(null); setAccessMode('select'); setCart([]); setOrderSuccess(false);
    setChargeRoomNumber(''); setChargeGuestRut(''); setChargeError('');
  };

  const addToCart = (item: MenuItem, qty = 1, notes = '') =>
    setCart(prev => {
      const ex = prev.find(ci => ci.menuItem.id === item.id);
      if (ex) return prev.map(ci => ci.menuItem.id === item.id ? { ...ci, quantity: ci.quantity + qty, notes: notes || ci.notes } : ci);
      return [...prev, { menuItem: item, quantity: qty, notes }];
    });

  const updateQuantity = (id: string, delta: number) =>
    setCart(prev => prev.map(ci => ci.menuItem.id === id ? { ...ci, quantity: ci.quantity + delta } : ci).filter(ci => ci.quantity > 0) as CartItem[]);

  const handleOpenNoteModal = (item: MenuItem) => {
    const ci = cart.find(c => c.menuItem.id === item.id);
    setTempItemNote(ci ? ci.notes : ''); setNoteModalItem(item);
  };

  const handleSaveItemNote = () => {
    if (!noteModalItem) return;
    const ex = cart.find(c => c.menuItem.id === noteModalItem.id);
    if (ex) setCart(prev => prev.map(ci => ci.menuItem.id === noteModalItem.id ? { ...ci, notes: tempItemNote } : ci));
    else addToCart(noteModalItem, 1, tempItemNote);
    setNoteModalItem(null);
  };

  const cartTotal = cart.reduce((s, ci) => s + ci.menuItem.price * ci.quantity, 0);

  const handleSubmitOrder = async () => {
    if (!cart.length || !session || !companyId) return;
    setSubmittingOrder(true); setChargeError('');
    try {
      const items = cart.map(ci => ({ menu_item_id: ci.menuItem.id, quantity: ci.quantity, unit_price: ci.menuItem.price, notes: ci.notes || null }));
      let finalRoomId: string | null = null, finalBookingId: string | null = null, finalPayment = paymentMethod;
      if (session.is_table) {
        if (paymentMethod === 'charged_to_room') {
          if (!chargeRoomNumber.trim() || !chargeGuestRut.trim()) throw new Error('Debes ingresar N° de habitación y RUT del huésped.');
          setValidatingCharge(true);
          const { data, error } = await hotelRpc.validateRoomAccess(companyId, chargeRoomNumber.trim(), chargeGuestRut.trim());
          setValidatingCharge(false);
          if (error) throw error;
          const r = data as any[];
          if (r && r.length > 0) { finalRoomId = r[0].room_id; finalBookingId = r[0].booking_id; }
          else throw new Error('Validación fallida: habitación o RUT no corresponden a un Check-In activo.');
        } else finalPayment = 'pending';
      } else { finalRoomId = session.room_id || null; finalBookingId = session.booking_id || null; }

      const { data, error } = await hotelRpc.restaurantCreateOrder({ companyId, source: session.is_table ? 'table' : 'room_service', tableNumber: session.is_table ? session.table_number || null : null, roomId: finalRoomId, bookingId: finalBookingId, paymentStatus: finalPayment, notes: orderNotes || null, items });
      if (error) throw error;
      const newId = String(data);
      setLastOrderNumber(newId.substring(0, 8));
      const updatedIds = [...activeOrderIds, newId];
      setActiveOrderIds(updatedIds); sessionStorage.setItem('nexus_active_order_ids', JSON.stringify(updatedIds));
      setOrderSuccess(true); setCart([]); setOrderNotes(''); setCartOpen(false);
      setChargeRoomNumber(''); setChargeGuestRut('');
    } catch (err: any) {
      if (session.is_table && paymentMethod === 'charged_to_room') setChargeError(err.message || 'Error al validar el cargo.');
      else alert('Error: ' + (err.message || 'No se pudo registrar el pedido.'));
    } finally { setSubmittingOrder(false); }
  };

  const filteredItems = selectedCategoryId === 'all' ? menuItems : menuItems.filter(i => i.category_id === selectedCategoryId);

  /* ─── Estilos inline del sistema de diseño oscuro ─── */
  const S = {
    wrap:    { minHeight: '100vh', fontFamily: 'Inter, system-ui, sans-serif', fontSize: '14px' },
    card:    { background: '#0d1117', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px' },
    cardSm:  { background: '#111827', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px' },
    input:   { background: 'rgba(0,0,0,0.5)', color: '#f1f5f9', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '10px 14px', outline: 'none', fontSize: '13px', width: '100%', boxSizing: 'border-box' as const },
    btnGold: { background: 'linear-gradient(135deg, #f59e0b, #ea580c)', color: '#0f172a', border: 'none', borderRadius: '12px', padding: '14px 20px', fontWeight: 900, fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase' as const, cursor: 'pointer', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' },
    btnGhost:{ background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '8px 14px', fontWeight: 700, fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase' as const, cursor: 'pointer' },
    label:   { color: '#64748b', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.1em', display: 'block', marginBottom: '6px' },
    h1:      { color: '#f1f5f9', fontWeight: 900, textTransform: 'uppercase' as const, letterSpacing: '0.08em' },
    h2:      { color: '#e2e8f0', fontWeight: 900, textTransform: 'uppercase' as const, letterSpacing: '0.06em' },
    text:    { color: '#cbd5e1' },
    muted:   { color: '#94a3b8' },
    faint:   { color: '#64748b' },
    gold:    { color: '#f59e0b' },
    goldBg:  { background: 'rgba(245,158,11,0.1)', borderColor: '#f59e0b' },
    errBox:  { background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', borderRadius: '10px', padding: '10px 14px', fontSize: '12px' },
    divider: { borderTop: '1px solid rgba(255,255,255,0.06)', margin: '0' },
  };

  /* ─── Vista de ESCANEO QR ─── */
  if (!session && scanningQr) return (
    <div data-portal="restaurant" className="keep-dark" style={{ ...S.wrap, display: 'flex', justifyContent: 'center', padding: '48px 16px' }}>
      <div style={{ ...S.card, width: '100%', maxWidth: '400px', overflow: 'hidden' }}>
        <div style={{ height: '4px', background: 'linear-gradient(90deg, #f59e0b, #ea580c)' }} />
        <div style={{ padding: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
            <button onClick={() => setScanningQr(false)} style={{ ...S.btnGhost, padding: '6px 10px' }}><ArrowLeft style={{ width: 14, height: 14 }} /></button>
            <span style={{ ...S.faint, fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Atrás</span>
          </div>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <h2 style={{ ...S.h2, fontSize: '15px', marginBottom: '4px' }}>Escaneo de Código QR</h2>
            <p style={{ ...S.muted, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Apunte la cámara a la mesa</p>
          </div>
          <div style={{ width: '100%', aspectRatio: '1', maxWidth: '260px', margin: '0 auto 24px', background: 'rgba(0,0,0,0.7)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {['tl','tr','bl','br'].map(p => (
              <div key={p} style={{ position: 'absolute', width: 20, height: 20, ...(p.includes('t') ? { top: 10 } : { bottom: 10 }), ...(p.includes('l') ? { left: 10 } : { right: 10 }), borderTop: p.includes('t') ? '2px solid #f59e0b' : 'none', borderBottom: p.includes('b') ? '2px solid #f59e0b' : 'none', borderLeft: p.includes('l') ? '2px solid #f59e0b' : 'none', borderRight: p.includes('r') ? '2px solid #f59e0b' : 'none' }} />
            ))}
            <div className="animate-scanner-laser" style={{ position: 'absolute', left: 0, right: 0, height: '2px', background: 'rgba(245,158,11,0.8)', boxShadow: '0 0 8px rgba(245,158,11,0.8)' }} />
            <div style={{ textAlign: 'center', zIndex: 10 }}>
              <Loader2 className="animate-spin" style={{ width: 28, height: 28, color: 'rgba(245,158,11,0.4)', margin: '0 auto 6px' }} />
              <p style={{ ...S.faint, fontSize: '9px', textTransform: 'uppercase', fontWeight: 700 }}>Buscando código QR...</p>
            </div>
          </div>
          <div style={{ ...S.cardSm, padding: '16px' }}>
            <p style={{ ...S.gold, fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', textAlign: 'center', marginBottom: '4px' }}>Simulador de Mesas</p>
            <p style={{ ...S.muted, fontSize: '9px', textAlign: 'center', marginBottom: '12px', lineHeight: '1.5' }}>Selecciona una mesa para simular el escaneo QR</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px' }}>
              {[1,2,3,4,5,6,7,8,9,10].map(n => (
                <button key={n} onClick={() => handleSimulatedQrScan(String(n))}
                  style={{ ...S.btnGhost, padding: '8px 4px', fontSize: '11px', borderRadius: '8px', fontFamily: 'monospace' }}>
                  M{n}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  /* ─── Vista de LOGIN / SELECCIÓN ─── */
  if (!session) return (
    <div data-portal="restaurant" className="keep-dark" style={{ ...S.wrap, display: 'flex', justifyContent: 'center', padding: '48px 16px' }}>
      <div style={{ ...S.card, width: '100%', maxWidth: '420px', overflow: 'hidden' }}>
        <div style={{ height: '4px', background: 'linear-gradient(90deg, #f59e0b, #ea580c)' }} />
        <div style={{ padding: '32px' }}>

          {/* SELECTOR DE MODO */}
          {accessMode === 'select' && (
            <div>
              <div style={{ textAlign: 'center', marginBottom: '28px' }}>
                <div style={{ width: 56, height: 56, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <Utensils style={{ width: 26, height: 26, color: '#f59e0b' }} />
                </div>
                <h1 style={{ ...S.h1, fontSize: '17px', marginBottom: '4px' }}>Restaurante Grand Hotel</h1>
                <p style={{ ...S.faint, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Portal de Pedidos Digital</p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[
                  { mode: 'room' as const, label: 'Pedir a la Habitación', desc: 'Servicio a la Habitación. Carga directo a tu cuenta del hotel al hacer el check-out.' },
                  { mode: 'table' as const, label: 'Pedir desde la Mesa', desc: 'Ordena desde tu mesa. Puedes pagar al mesero o cargar a tu habitación.' },
                ].map(({ mode, label, desc }) => (
                  <button key={mode} onClick={() => setAccessMode(mode)} style={{ ...S.cardSm, cursor: 'pointer', padding: '16px', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'border-color 0.2s' }}>
                    <div>
                      <p style={{ ...S.h2, fontSize: '12px', marginBottom: '4px' }}>{label}</p>
                      <p style={{ ...S.muted, fontSize: '10px', lineHeight: '1.5' }}>{desc}</p>
                    </div>
                    <ArrowRight style={{ width: 16, height: 16, color: '#475569', flexShrink: 0 }} />
                  </button>
                ))}
                <button onClick={() => setScanningQr(true)} style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: '12px', cursor: 'pointer', padding: '16px', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ color: '#f59e0b', fontSize: '12px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>Escanear Código QR de Mesa</p>
                    <p style={{ ...S.muted, fontSize: '10px', lineHeight: '1.5' }}>Apunte la cámara al código QR de su mesa para iniciar al instante.</p>
                  </div>
                  <ArrowRight style={{ width: 16, height: 16, color: '#f59e0b', flexShrink: 0 }} />
                </button>
              </div>
            </div>
          )}

          {/* LOGIN HABITACIÓN */}
          {accessMode === 'room' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
                <button onClick={() => { setAccessMode('select'); setAuthError(''); }} style={{ ...S.btnGhost, padding: '6px 10px' }}><ArrowLeft style={{ width: 14, height: 14 }} /></button>
                <span style={{ ...S.faint, fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Atrás</span>
              </div>
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <h2 style={{ ...S.h2, fontSize: '15px', marginBottom: '4px' }}>Servicio de Habitación</h2>
                <p style={{ ...S.faint, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Valida tu Habitación</p>
              </div>
              <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ ...S.label, display: 'flex', alignItems: 'center', gap: '6px' }}><Hash style={{ width: 11, height: 11, color: '#f59e0b' }} /> N° Habitación</label>
                  <input type="text" required value={roomNumber} onChange={e => setRoomNumber(e.target.value)} style={S.input} placeholder="Ej: 101" />
                </div>
                <div>
                  <label style={{ ...S.label, display: 'flex', alignItems: 'center', gap: '6px' }}><User style={{ width: 11, height: 11, color: '#f59e0b' }} /> RUT del Huésped</label>
                  <input type="text" required value={guestRut} onChange={e => setGuestRut(e.target.value)} style={S.input} placeholder="Ej: 17257060-7" />
                </div>
                {authError && <div style={S.errBox}>{authError}</div>}
                <button type="submit" disabled={authLoading} style={{ ...S.btnGold, opacity: authLoading ? 0.7 : 1 }}>
                  {authLoading ? 'Verificando...' : 'Acceder al Menú'} <ArrowRight style={{ width: 15, height: 15 }} />
                </button>
              </form>
            </div>
          )}

          {/* LOGIN MESA */}
          {accessMode === 'table' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
                <button onClick={() => { setAccessMode('select'); setAuthError(''); }} style={{ ...S.btnGhost, padding: '6px 10px' }}><ArrowLeft style={{ width: 14, height: 14 }} /></button>
                <span style={{ ...S.faint, fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Atrás</span>
              </div>
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <h2 style={{ ...S.h2, fontSize: '15px', marginBottom: '4px' }}>Comensal en Mesa</h2>
                <p style={{ ...S.faint, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Selecciona tu Mesa</p>
              </div>
              <form onSubmit={handleTableLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ ...S.label, display: 'flex', alignItems: 'center', gap: '6px' }}><Hash style={{ width: 11, height: 11, color: '#f59e0b' }} /> N° de Mesa</label>
                  <select value={tableNumber} onChange={e => setTableNumber(e.target.value)} style={S.input}>
                    {[1,2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={String(n)} style={{ background: '#111827', color: '#f1f5f9' }}>Mesa {n}</option>)}
                  </select>
                </div>
                <button type="submit" style={S.btnGold}>
                  Ver Menú del Restaurante <ArrowRight style={{ width: 15, height: 15 }} />
                </button>
              </form>
            </div>
          )}

          <div style={{ ...S.divider, marginTop: '24px', paddingTop: '16px', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
            <Lock style={{ width: 14, height: 14, color: '#475569', flexShrink: 0, marginTop: 1 }} />
            <p style={{ ...S.faint, fontSize: '9px', lineHeight: '1.6', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>
              {accessMode === 'room' ? 'Solo huéspedes con check-in activo pueden ingresar. El cargo se liquida en recepción.' : 'Acceso directo para pedidos en mesa. El cobro puede liquidarse en el restaurante o cargarse al checkout.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  /* ─── Vista PRINCIPAL DEL MENÚ ─── */
  return (
    <div data-portal="restaurant" className="keep-dark" style={{ ...S.wrap, maxWidth: '900px', margin: '0 auto', padding: '0 16px 120px' }}>

      {/* Header de sesión */}
      <div style={{ ...S.cardSm, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', marginBottom: '20px' }}>
        <div>
          {session.is_table ? (
            <>
              <p style={{ ...S.gold, fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Pedido desde Mesa</p>
              <p style={{ ...S.h2, fontSize: '14px' }}>Mesa {session.table_number}</p>
            </>
          ) : (
            <>
              <p style={{ ...S.gold, fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Sesión Habitación {session.room_number}</p>
              <p style={{ ...S.h2, fontSize: '14px' }}>Bienvenido, {session.guest_name}</p>
            </>
          )}
        </div>
        <button onClick={handleLogout} title="Cerrar Sesión" style={{ ...S.btnGhost, padding: '8px' }}>
          <LogOut style={{ width: 15, height: 15 }} />
        </button>
      </div>

      {orderSuccess ? (
        <div style={{ ...S.card, textAlign: 'center', padding: '48px 32px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: 64, height: 64, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle2 style={{ width: 32, height: 32, color: '#34d399' }} />
          </div>
          <h2 style={{ ...S.h1, fontSize: '18px' }}>¡Tu pedido fue recibido!</h2>
          <p style={{ ...S.muted, fontSize: '13px', maxWidth: '320px', lineHeight: '1.6' }}>
            {session.is_table ? `Hemos enviado tu pedido a la cocina. Lo llevamos a la Mesa ${session.table_number} a la brevedad.` : 'Hemos enviado tu pedido a la cocina. Lo llevamos a tu habitación a la brevedad.'}
          </p>
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '8px', padding: '8px 18px' }}>
            <span style={{ ...S.muted, fontSize: '11px' }}>N° de Pedido: </span>
            <span style={{ ...S.h2, fontSize: '11px', fontFamily: 'monospace' }}>{lastOrderNumber}</span>
          </div>
          <p style={{ ...S.faint, fontSize: '10px', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.08em' }}>Tiempo estimado: 25–35 minutos</p>
          <button onClick={() => setOrderSuccess(false)} style={{ ...S.btnGold, width: 'auto', padding: '12px 28px', marginTop: '8px' }}>Hacer Otro Pedido</button>
        </div>
      ) : (
        <>
          {/* Seguimiento de pedidos activos */}
          {activeOrders.length > 0 && (
            <div style={{ marginBottom: '28px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <Clock className="animate-pulse" style={{ width: 15, height: 15, color: '#f59e0b' }} />
                <span style={{ ...S.gold, fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Seguimiento de tus Pedidos</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' }}>
                {activeOrders.map(order => {
                  const statusMap: Record<string, { label: string; color: string; bg: string }> = {
                    pending:   { label: 'Pendiente',    color: '#fbbf24', bg: 'rgba(251,191,36,0.08)' },
                    preparing: { label: 'En Cocina',    color: '#60a5fa', bg: 'rgba(96,165,250,0.08)' },
                    delivered: { label: 'Entregado',    color: '#34d399', bg: 'rgba(52,211,153,0.08)' },
                    cancelled: { label: 'Cancelado',    color: '#f87171', bg: 'rgba(248,113,113,0.08)' },
                  };
                  const st = statusMap[order.status] || statusMap.cancelled;
                  return (
                    <div key={order.id} style={{ ...S.cardSm, padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ ...S.faint, fontSize: '10px', fontFamily: 'monospace' }}>#{order.id.substring(0, 8)}</span>
                        <span style={{ background: st.bg, color: st.color, border: `1px solid ${st.color}30`, padding: '2px 8px', borderRadius: '20px', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{st.label}</span>
                      </div>
                      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '10px 0', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {order.items && JSON.parse(JSON.stringify(order.items)).map((item: any, idx: number) => (
                          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ ...S.text, fontSize: '12px' }}><span style={{ ...S.gold, fontFamily: 'monospace' }}>{item.quantity}x</span> {item.name}</span>
                            <span style={{ ...S.muted, fontSize: '11px', fontFamily: 'monospace' }}>${(item.unit_price * item.quantity).toLocaleString('es-CL')}</span>
                          </div>
                        ))}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <p style={{ ...S.faint, fontSize: '9px', textTransform: 'uppercase', fontWeight: 700 }}>Total</p>
                          <p style={{ ...S.gold, fontSize: '13px', fontWeight: 900, fontFamily: 'monospace' }}>${Number(order.total_price).toLocaleString('es-CL')}</p>
                        </div>
                        {order.status === 'pending' && (
                          <button onClick={() => handleCancelOrder(order.id)} style={{ background: 'rgba(239,68,68,0.08)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', padding: '6px 12px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', cursor: 'pointer' }}>Cancelar</button>
                        )}
                        {order.status === 'preparing' && (
                          <span style={{ ...S.faint, fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', background: 'rgba(255,255,255,0.04)', padding: '4px 10px', borderRadius: '6px' }}>En Preparación</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={S.divider} />
            </div>
          )}

          {/* Selectores de categoría */}
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '12px', marginBottom: '16px', scrollbarWidth: 'none' }}>
            {['all', ...categories.map(c => c.id)].map(id => {
              const label = id === 'all' ? 'Todo' : categories.find(c => c.id === id)?.name || '';
              const active = selectedCategoryId === id;
              return (
                <button key={id} onClick={() => setSelectedCategoryId(id)} style={{ background: active ? '#f59e0b' : 'rgba(255,255,255,0.05)', color: active ? '#0f172a' : '#94a3b8', border: `1px solid ${active ? '#f59e0b' : 'rgba(255,255,255,0.07)'}`, borderRadius: '20px', padding: '7px 18px', fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', cursor: 'pointer', flexShrink: 0, transition: 'all 0.2s' }}>
                  {label}
                </button>
              );
            })}
          </div>

          {/* Grilla de platos */}
          {loadingMenu ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '80px 0' }}>
              <Loader2 className="animate-spin" style={{ width: 32, height: 32, color: '#f59e0b' }} />
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
              {filteredItems.map(item => {
                const inCart = cart.find(ci => ci.menuItem.id === item.id);
                const img = getDishImage(item.name, item.image_url);
                return (
                  <div key={item.id} style={{ ...S.cardSm, display: 'flex', flexDirection: 'column', overflow: 'hidden', transition: 'border-color 0.2s' }}>
                    {img && (
                      <div style={{ height: '150px', overflow: 'hidden', background: '#111827' }}>
                        <img src={img} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.4s' }} />
                      </div>
                    )}
                    <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', flex: 1, gap: '8px' }}>
                      <div>
                        <h3 style={{ ...S.h2, fontSize: '13px', marginBottom: '4px' }}>{item.name}</h3>
                        <p style={{ ...S.muted, fontSize: '11px', lineHeight: '1.55' }}>{item.description || 'Delicioso plato preparado al instante por nuestro chef.'}</p>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px', marginTop: 'auto' }}>
                        <span style={{ ...S.gold, fontSize: '15px', fontWeight: 900, fontFamily: 'monospace' }}>${Number(item.price).toLocaleString('es-CL')}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <button onClick={() => handleOpenNoteModal(item)} style={{ ...S.btnGhost, padding: '5px 10px', fontSize: '9px' }}>
                            {inCart && inCart.notes ? 'Ver Nota' : 'Nota'}
                          </button>
                          {inCart ? (
                            <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px' }}>
                              <button onClick={() => updateQuantity(item.id, -1)} style={{ ...S.btnGhost, border: 'none', background: 'transparent', padding: '6px 10px' }}><Minus style={{ width: 12, height: 12 }} /></button>
                              <span style={{ ...S.text, fontFamily: 'monospace', fontWeight: 900, fontSize: '13px', minWidth: '20px', textAlign: 'center' }}>{inCart.quantity}</span>
                              <button onClick={() => updateQuantity(item.id, 1)} style={{ ...S.btnGhost, border: 'none', background: 'transparent', padding: '6px 10px' }}><Plus style={{ width: 12, height: 12 }} /></button>
                            </div>
                          ) : (
                            <button onClick={() => addToCart(item)} style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.25)', borderRadius: '8px', padding: '6px 14px', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', cursor: 'pointer', transition: 'all 0.2s' }}>
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
                <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '80px 20px', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: '12px' }}>
                  <p style={{ ...S.faint, fontSize: '11px', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.08em' }}>No hay platos disponibles en esta categoría</p>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Barra flotante del carrito */}
      {cart.length > 0 && !orderSuccess && (
        <div style={{ position: 'fixed', bottom: '16px', left: '16px', right: '16px', zIndex: 50, maxWidth: '480px', margin: '0 auto' }}>
          <button onClick={() => setCartOpen(true)} style={{ ...S.btnGold, boxShadow: '0 8px 32px rgba(245,158,11,0.25)', animation: 'pulse 2s infinite', borderRadius: '14px', padding: '16px 20px', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <ShoppingBag style={{ width: 18, height: 18 }} />
              <span>Ver Pedido ({cart.reduce((s, ci) => s + ci.quantity, 0)})</span>
            </div>
            <span style={{ fontFamily: 'monospace', fontSize: '14px' }}>${cartTotal.toLocaleString('es-CL')}</span>
          </button>
        </div>
      )}

      {/* Modal de nota del ítem */}
      {noteModalItem && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}>
          <div style={{ ...S.card, width: '100%', maxWidth: '360px', overflow: 'hidden' }}>
            <div style={{ height: '4px', background: 'linear-gradient(90deg, #f59e0b, #ea580c)' }} />
            <div style={{ padding: '24px' }}>
              <h3 style={{ ...S.h2, fontSize: '14px', marginBottom: '4px' }}>Instrucciones Especiales</h3>
              <p style={{ ...S.gold, fontSize: '10px', textTransform: 'uppercase', fontWeight: 900, letterSpacing: '0.1em', marginBottom: '16px' }}>{noteModalItem.name}</p>
              <textarea value={tempItemNote} onChange={e => setTempItemNote(e.target.value)} rows={3} style={{ ...S.input, resize: 'none' }} placeholder="Ej: Sin sal, cocción media, aderezos aparte..." />
              <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                <button onClick={() => setNoteModalItem(null)} style={{ ...S.btnGhost, flex: 1, padding: '10px', textAlign: 'center', borderRadius: '10px' }}>Cancelar</button>
                <button onClick={handleSaveItemNote} style={{ ...S.btnGold, flex: 1, borderRadius: '10px', padding: '10px' }}>Confirmar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DRAWER DEL CARRITO */}
      {cartOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ width: '100%', maxWidth: '440px', background: '#0a0e16', borderLeft: '1px solid rgba(255,255,255,0.07)', display: 'flex', flexDirection: 'column', position: 'relative', overflowY: 'auto' }}>
            <div style={{ height: '4px', background: 'linear-gradient(90deg, #f59e0b, #f97316, #eab308)', flexShrink: 0 }} />

            {/* Header del drawer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <ShoppingBag style={{ width: 18, height: 18, color: '#f59e0b' }} />
                <span style={{ ...S.h1, fontSize: '14px' }}>Tu Pedido</span>
              </div>
              <button onClick={() => setCartOpen(false)} style={{ ...S.btnGhost, padding: '6px 12px', fontSize: '9px' }}>Cerrar</button>
            </div>

            {/* Items del carrito */}
            <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', maxHeight: '35vh' }}>
              {cart.map(ci => {
                const img = getDishImage(ci.menuItem.name, ci.menuItem.image_url);
                return (
                  <div key={ci.menuItem.id} style={{ display: 'flex', gap: '12px', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ width: 48, height: 48, borderRadius: '10px', overflow: 'hidden', flexShrink: 0, background: '#111827' }}>
                      <img src={img} alt={ci.menuItem.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ ...S.text, fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ci.menuItem.name}</p>
                      {ci.notes && <p style={{ color: '#f59e0b', fontSize: '9px', fontStyle: 'italic' }}>Obs: {ci.notes}</p>}
                      <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '7px', width: 'fit-content', marginTop: '6px' }}>
                        <button onClick={() => updateQuantity(ci.menuItem.id, -1)} style={{ ...S.btnGhost, border: 'none', background: 'transparent', padding: '4px 8px' }}><Minus style={{ width: 11, height: 11 }} /></button>
                        <span style={{ ...S.text, fontFamily: 'monospace', fontWeight: 900, fontSize: '12px', padding: '0 4px' }}>{ci.quantity}</span>
                        <button onClick={() => updateQuantity(ci.menuItem.id, 1)} style={{ ...S.btnGhost, border: 'none', background: 'transparent', padding: '4px 8px' }}><Plus style={{ width: 11, height: 11 }} /></button>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <span style={{ ...S.gold, fontFamily: 'monospace', fontSize: '13px', fontWeight: 900, display: 'block', marginBottom: '4px' }}>${(ci.menuItem.price * ci.quantity).toLocaleString('es-CL')}</span>
                      <button onClick={() => updateQuantity(ci.menuItem.id, -ci.quantity)} title="Eliminar" style={{ ...S.btnGhost, padding: '4px 6px', borderRadius: '6px' }}><Trash2 style={{ width: 12, height: 12, color: '#f87171' }} /></button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Forma de cobro */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
              <p style={{ ...S.label, marginBottom: '10px' }}>Forma de Cobro</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {[
                  { method: 'charged_to_room' as const, icon: Key,        title: 'Cargar Habitación', sub: 'Liquida al checkout' },
                  { method: 'pending'          as const, icon: CreditCard, title: session.is_table ? 'Pagar en Mesa' : 'Pagar al Recibir', sub: session.is_table ? 'Efectivo o tarjeta' : 'Al repartidor' },
                ].map(({ method, icon: Icon, title, sub }) => {
                  const active = paymentMethod === method;
                  return (
                    <button key={method} onClick={() => { setPaymentMethod(method); setChargeError(''); }}
                      style={{ background: active ? 'rgba(245,158,11,0.1)' : 'rgba(255,255,255,0.04)', border: `1px solid ${active ? '#f59e0b' : 'rgba(255,255,255,0.07)'}`, borderRadius: '12px', padding: '14px 12px', cursor: 'pointer', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '12px', transition: 'all 0.2s', height: '90px', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ background: active ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.06)', borderRadius: '7px', padding: '5px' }}>
                          <Icon style={{ width: 15, height: 15, color: '#f59e0b' }} />
                        </div>
                        {active && (
                          <div style={{ width: 16, height: 16, background: '#f59e0b', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Check style={{ width: 9, height: 9, color: '#0f172a', strokeWidth: 3 }} />
                          </div>
                        )}
                      </div>
                      <div>
                        <p style={{ color: active ? '#fbbf24' : '#cbd5e1', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{title}</p>
                        <p style={{ color: '#64748b', fontSize: '8px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '2px' }}>{sub}</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Campos de validación de habitación (desde mesa) */}
              {session.is_table && paymentMethod === 'charged_to_room' && (
                <div style={{ ...S.cardSm, padding: '16px', marginTop: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                    <Key style={{ width: 12, height: 12, color: '#f59e0b' }} />
                    <p style={{ color: '#f59e0b', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Verificación de Huésped</p>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={S.label}>N° Habitación</label>
                      <input type="text" value={chargeRoomNumber} onChange={e => setChargeRoomNumber(e.target.value)} style={S.input} placeholder="Ej: 101" />
                    </div>
                    <div>
                      <label style={S.label}>RUT del Huésped</label>
                      <input type="text" value={chargeGuestRut} onChange={e => setChargeGuestRut(e.target.value)} style={S.input} placeholder="Ej: 17257060-7" />
                    </div>
                  </div>
                  {chargeError && <div style={{ ...S.errBox, marginTop: '10px', fontSize: '11px' }}>{chargeError}</div>}
                </div>
              )}

              {/* Notas del pedido */}
              <div style={{ marginTop: '14px' }}>
                <label style={S.label}>Notas del Pedido</label>
                <textarea value={orderNotes} onChange={e => setOrderNotes(e.target.value)} rows={2} style={{ ...S.input, resize: 'none' }} placeholder="Ej: Traer cubiertos para 2 personas..." />
              </div>
            </div>

            {/* Total y botón de confirmar */}
            <div style={{ padding: '16px 24px 24px', marginTop: 'auto', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.04)', borderRadius: '12px', padding: '14px 18px', marginBottom: '14px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div>
                  <p style={{ ...S.faint, fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Total del Pedido</p>
                  <p style={{ ...S.muted, fontSize: '8px', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '2px' }}>Servicio e Impuestos Incluidos</p>
                </div>
                <span style={{ ...S.gold, fontSize: '22px', fontWeight: 900, fontFamily: 'monospace' }}>${cartTotal.toLocaleString('es-CL')}</span>
              </div>
              <button
                onClick={handleSubmitOrder}
                disabled={submittingOrder || cart.length === 0 || (session.is_table && paymentMethod === 'charged_to_room' && (!chargeRoomNumber || !chargeGuestRut)) || validatingCharge}
                style={{ ...S.btnGold, borderRadius: '14px', padding: '16px', fontSize: '11px', gap: '10px', opacity: (submittingOrder || validatingCharge) ? 0.75 : 1 }}
              >
                {submittingOrder ? (
                  <><Loader2 className="animate-spin" style={{ width: 16, height: 16 }} /><span>Procesando Pedido...</span></>
                ) : (
                  <>
                    <span>{session.is_table ? `Confirmar Pedido Mesa ${session.table_number}` : `Confirmar Pedido Hab. ${session.room_number}`}</span>
                    <ArrowRight style={{ width: 17, height: 17, flexShrink: 0 }} />
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
