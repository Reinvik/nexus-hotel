import { useState, useEffect } from 'react';
import { hotelRpc } from '../lib/supabase';
import { 
  RefreshCw, ChefHat, Play, CheckCircle2, DollarSign, XCircle, Clock, MapPin, Coffee
} from 'lucide-react';

interface RestaurantKitchenDashboardProps {
  companyId: string;
}

export function RestaurantKitchenDashboard({ companyId }: RestaurantKitchenDashboardProps) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'completed' | 'all'>('active');
  const [timeTrigger, setTimeTrigger] = useState(0);

  useEffect(() => {
    // Forzar re-renderizado de cronómetros visuales cada 60 segundos
    const timer = setInterval(() => setTimeTrigger(prev => prev + 1), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    loadOrders();
    // Poll orders every 10 seconds for real-time kitchen experience
    const interval = setInterval(loadOrders, 10000);
    return () => clearInterval(interval);
  }, [companyId]);

  const getMinutesElapsed = (createdAtString: string) => {
    const created = new Date(createdAtString);
    const now = new Date();
    const diffMs = now.getTime() - created.getTime();
    return Math.max(0, Math.floor(diffMs / 60000));
  };

  async function loadOrders() {
    if (!companyId) return;
    try {
      const { data, error } = await hotelRpc.restaurantGetOrders(companyId);
      if (error) throw error;
      setOrders(data || []);
    } catch (err) {
      console.error('Error al cargar órdenes del restaurante:', err);
    }
  }

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await hotelRpc.restaurantUpdateOrderStatus(orderId, newStatus);
      if (error) throw error;
      loadOrders();
    } catch (err) {
      console.error('Error al actualizar estado de orden:', err);
    }
  };

  const handleUpdatePayment = async (orderId: string, newPaymentStatus: string) => {
    try {
      const { error } = await hotelRpc.restaurantUpdateOrderPayment(orderId, newPaymentStatus);
      if (error) throw error;
      loadOrders();
    } catch (err) {
      console.error('Error al actualizar estado de pago:', err);
    }
  };

  // Filter orders
  const filteredOrders = orders.filter((o) => {
    if (activeTab === 'active') {
      return o.status === 'pending' || o.status === 'preparing';
    } else if (activeTab === 'completed') {
      return o.status === 'delivered';
    }
    return true; // All
  });

  const getSourceLabel = (source: string) => {
    switch (source) {
      case 'room_service': return 'Servicio a Habitación';
      case 'table': return 'Mesa';
      case 'walk_in': return 'Llevar / Directo';
      default: return source;
    }
  };

  const getSourceStyles = (source: string) => {
    switch (source) {
      case 'room_service': return 'bg-purple-500/10 text-purple-400 border border-purple-500/20';
      case 'table': return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
      default: return 'bg-slate-500/10 text-slate-400 border border-slate-500/20';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'Pendiente';
      case 'preparing': return 'En Cocina';
      case 'delivered': return 'Entregado';
      case 'cancelled': return 'Cancelado';
      default: return status;
    }
  };

  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20';
      case 'preparing': return 'bg-blue-500/10 text-blue-400 border border-blue-500/20 animate-pulse';
      case 'delivered': return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      default: return 'bg-red-500/10 text-red-400 border border-red-500/20';
    }
  };

  const getPaymentLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'Pendiente Cobro';
      case 'paid_direct': return 'Pagado Directo';
      case 'charged_to_room': return 'Cargo Habitación';
      default: return status;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-4">
        <div>
          <div className="flex items-center gap-2 text-amber-500 font-bold uppercase tracking-wider text-[10px] mb-1">
            <ChefHat className="w-3.5 h-3.5" />
            <span>Monitoreo de Cocina y Servicio</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight uppercase">Dashboard del Restaurante</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setLoading(true);
              loadOrders().finally(() => setLoading(false));
            }}
            disabled={loading}
            className="p-2.5 bg-white/5 hover:bg-white/10 text-slate-400 rounded-none border border-white/5 cursor-pointer transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/5 bg-black/40">
        <button
          onClick={() => setActiveTab('active')}
          className={`px-6 py-3.5 text-xs font-black uppercase tracking-wider transition-all border-b-2 rounded-none cursor-pointer ${
            activeTab === 'active'
              ? 'border-amber-500 text-amber-400 bg-white/2'
              : 'border-transparent text-slate-400 hover:text-white hover:bg-white/1'
          }`}
        >
          Activos (Pendiente / En Cocina)
        </button>
        <button
          onClick={() => setActiveTab('completed')}
          className={`px-6 py-3.5 text-xs font-black uppercase tracking-wider transition-all border-b-2 rounded-none cursor-pointer ${
            activeTab === 'completed'
              ? 'border-amber-500 text-amber-400 bg-white/2'
              : 'border-transparent text-slate-400 hover:text-white hover:bg-white/1'
          }`}
        >
          Entregados
        </button>
        <button
          onClick={() => setActiveTab('all')}
          className={`px-6 py-3.5 text-xs font-black uppercase tracking-wider transition-all border-b-2 rounded-none cursor-pointer ${
            activeTab === 'all'
              ? 'border-amber-500 text-amber-400 bg-white/2'
              : 'border-transparent text-slate-400 hover:text-white hover:bg-white/1'
          }`}
        >
          Todos
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-time-trigger={timeTrigger}>
        {filteredOrders.map((order) => {
          const minutesElapsed = getMinutesElapsed(order.created_at);
          const isOverSla = minutesElapsed >= 20 && (order.status === 'pending' || order.status === 'preparing');

          return (
            <div 
              key={order.id} 
              className={`glass-card p-5 flex flex-col justify-between space-y-4 transition-all duration-300 ${
                isOverSla 
                  ? 'border-red-500/80 bg-red-950/15 shadow-[0_0_15px_rgba(239,68,68,0.15)] animate-pulse-subtle' 
                  : 'border-white/5 bg-black/30'
              }`}
            >
              
              {/* Top Info */}
              <div>
                <div className="flex justify-between items-start gap-2 mb-3">
                  <span className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-none ${getSourceStyles(order.source)}`}>
                    {getSourceLabel(order.source)}
                  </span>
                  
                  <div className="flex items-center gap-1.5">
                    {(order.status === 'pending' || order.status === 'preparing') && (
                      <span className={`flex items-center gap-1 text-[9px] font-bold font-mono px-1.5 py-0.5 rounded-none border ${
                        isOverSla 
                          ? 'text-red-400 border-red-500/30 bg-red-500/10' 
                          : 'text-slate-400 border-white/5 bg-white/5'
                      }`}>
                        <Clock className="w-2.5 h-2.5" />
                        {minutesElapsed}m
                      </span>
                    )}
                    <span className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-none ${getStatusStyles(order.status)}`}>
                      {getStatusLabel(order.status)}
                    </span>
                  </div>
                </div>

              {/* Destination/Location Detail */}
              <div className="flex items-center gap-2 text-white font-black text-sm uppercase tracking-tight mb-3">
                {order.source === 'room_service' && (
                  <>
                    <MapPin className="w-4 h-4 text-purple-400 shrink-0" />
                    <span>Habitación {order.room_number || 'N/A'}</span>
                  </>
                )}
                {order.source === 'table' && (
                  <>
                    <Coffee className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Mesa {order.table_number || 'N/A'}</span>
                  </>
                )}
                {order.source === 'walk_in' && (
                  <>
                    <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>Llevar / Mostrador</span>
                  </>
                )}
              </div>

              {order.guest_name && (
                <p className="text-[10px] font-semibold text-slate-400 mb-4 uppercase tracking-wider">
                  Huésped: <span className="text-white">{order.guest_name}</span>
                </p>
              )}

              {/* Items List */}
              <div className="border-t border-b border-white/5 py-3 my-3 space-y-2">
                {order.items && JSON.parse(JSON.stringify(order.items)).map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-start gap-4 text-xs">
                    <div className="space-y-0.5">
                      <p className="text-white font-extrabold uppercase tracking-wide">
                        <span className="text-amber-500 font-mono mr-1.5">{item.quantity}x</span>
                        {item.name}
                      </p>
                      {item.notes && (
                        <p className="text-[9px] text-red-400 italic font-medium">
                          Obs: {item.notes}
                        </p>
                      )}
                    </div>
                    <span className="font-mono text-slate-400 text-[10px] shrink-0">
                      ${(item.unit_price * item.quantity).toLocaleString('es-CL')}
                    </span>
                  </div>
                ))}
              </div>

              {order.notes && (
                <div className="p-2.5 bg-white/5 border border-white/5 rounded-none text-[10px] text-slate-400 mb-3">
                  <span className="block text-[8px] uppercase tracking-wider font-black text-slate-500 mb-1">Notas del Pedido:</span>
                  {order.notes}
                </div>
              )}
            </div>

            {/* Bottom Actions and Price */}
            <div className="space-y-3 pt-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Total</span>
                <span className="text-base font-black text-white font-mono">
                  ${Number(order.total_price).toLocaleString('es-CL')}
                </span>
              </div>

              <div className="flex justify-between items-center text-[10px] uppercase font-black tracking-wider text-slate-400">
                <span>Estado Pago:</span>
                <span className={`px-2 py-0.5 rounded-none font-bold text-[9px] ${
                  order.payment_status === 'paid_direct' 
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : order.payment_status === 'charged_to_room'
                    ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                    : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                }`}>
                  {getPaymentLabel(order.payment_status)}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                {order.status === 'pending' && (
                  <button
                    onClick={() => handleUpdateStatus(order.id, 'preparing')}
                    className="flex-1 py-2 bg-blue-500 hover:bg-blue-600 text-black text-[10px] font-black uppercase tracking-widest rounded-none cursor-pointer flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Play className="w-3.5 h-3.5" />
                    Preparar
                  </button>
                )}

                {order.status === 'preparing' && (
                  <button
                    onClick={() => handleUpdateStatus(order.id, 'delivered')}
                    className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-600 text-black text-[10px] font-black uppercase tracking-widest rounded-none cursor-pointer flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Entregar
                  </button>
                )}

                {/* Direct bill payment trigger */}
                {order.payment_status === 'pending' && (order.source === 'table' || order.source === 'walk_in') && (
                  <button
                    onClick={() => handleUpdatePayment(order.id, 'paid_direct')}
                    className="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-black text-[10px] font-black uppercase tracking-widest rounded-none cursor-pointer flex items-center justify-center gap-1.5 transition-colors"
                    title="Cobrar en Restaurante"
                  >
                    <DollarSign className="w-3.5 h-3.5" />
                    Cobrar
                  </button>
                )}

                {order.status !== 'delivered' && order.status !== 'cancelled' && (
                  <button
                    onClick={() => {
                      if(confirm('¿Deseas cancelar este pedido?')) {
                        handleUpdateStatus(order.id, 'cancelled');
                      }
                    }}
                    className="p-2 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/10 rounded-none cursor-pointer transition-colors"
                    title="Cancelar Orden"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

          </div>
        )})}

        {filteredOrders.length === 0 && (
          <div className="col-span-full text-center py-20 text-slate-500 border border-dashed border-white/5 rounded-none">
            <ChefHat className="w-8 h-8 mx-auto mb-3 text-slate-600" />
            <p className="text-[10px] font-black uppercase tracking-wider">No hay pedidos en esta sección</p>
          </div>
        )}
      </div>
    </div>
  );
}
