import { useState, useEffect } from 'react';
import { hotelRpc } from '../lib/supabase';
import { 
  RefreshCw, ChefHat, Play, CheckCircle2, DollarSign, XCircle, Clock, MapPin, Coffee,
  Timer, ShoppingBag, Award, AlertCircle, UtensilsCrossed
} from 'lucide-react';

interface RestaurantKitchenDashboardProps {
  companyId: string;
}

export function RestaurantKitchenDashboard({ companyId }: RestaurantKitchenDashboardProps) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'completed' | 'all' | 'kpis'>('active');
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

  // Lógica de cálculo de KPIs e informes de rendimiento
  const getKpiStats = () => {
    const totalOrders = orders.length;
    const deliveredOrders = orders.filter(o => o.status === 'delivered');
    const preparingOrders = orders.filter(o => o.status === 'preparing');
    const pendingOrders = orders.filter(o => o.status === 'pending');
    const cancelledOrders = orders.filter(o => o.status === 'cancelled');
    
    // Ingresos
    let roomRevenue = 0;
    let tableRevenue = 0;
    let walkInRevenue = 0;
    
    // Cantidades
    let roomCount = 0;
    let tableCount = 0;
    let walkInCount = 0;
    
    orders.forEach(o => {
      if (o.status !== 'cancelled') {
        const val = Number(o.total_price) || 0;
        if (o.source === 'room_service') {
          roomRevenue += val;
          roomCount++;
        } else if (o.source === 'table') {
          tableRevenue += val;
          tableCount++;
        } else if (o.source === 'walk_in') {
          walkInRevenue += val;
          walkInCount++;
        }
      }
    });

    const totalRevenue = roomRevenue + tableRevenue + walkInRevenue;

    // Cálculo de tiempos promedio (en minutos)
    let totalAcceptanceMs = 0;
    let acceptanceCount = 0;
    let totalPrepMs = 0;
    let prepCount = 0;
    let totalCycleMs = 0;
    let cycleCount = 0;

    let slaMetCount = 0;
    let slaTotalCount = 0;

    deliveredOrders.forEach(o => {
      if (o.created_at) {
        const created = new Date(o.created_at).getTime();
        
        // Tiempo de Aceptación (created_at -> preparing_at)
        if (o.preparing_at) {
          const prepStart = new Date(o.preparing_at).getTime();
          totalAcceptanceMs += Math.max(0, prepStart - created);
          acceptanceCount++;
          
          // Tiempo de Preparación (preparing_at -> delivered_at)
          if (o.delivered_at) {
            const delivered = new Date(o.delivered_at).getTime();
            const prepDurationMs = Math.max(0, delivered - prepStart);
            totalPrepMs += prepDurationMs;
            prepCount++;

            // SLA de preparación: Meta <= 20 min
            const prepMinutes = prepDurationMs / 60000;
            if (prepMinutes <= 20) {
              slaMetCount++;
            }
            slaTotalCount++;
          }
        }

        // Tiempo de Ciclo Total (created_at -> delivered_at)
        if (o.delivered_at) {
          const delivered = new Date(o.delivered_at).getTime();
          totalCycleMs += Math.max(0, delivered - created);
          cycleCount++;
        }
      }
    });

    const avgAcceptance = acceptanceCount > 0 ? Math.round((totalAcceptanceMs / 60000) / acceptanceCount * 10) / 10 : 0;
    const avgPrep = prepCount > 0 ? Math.round((totalPrepMs / 60000) / prepCount * 10) / 10 : 0;
    const avgCycle = cycleCount > 0 ? Math.round((totalCycleMs / 60000) / cycleCount * 10) / 10 : 0;
    const slaPercentage = slaTotalCount > 0 ? Math.round((slaMetCount / slaTotalCount) * 100) : 100;

    // Platos más solicitados (Top 5)
    const dishCounts: Record<string, { name: string; count: number; total: number }> = {};
    orders.forEach(o => {
      if (o.status !== 'cancelled' && o.items) {
        try {
          const items = typeof o.items === 'string' ? JSON.parse(o.items) : o.items;
          const itemsArray = Array.isArray(items) ? items : [];
          itemsArray.forEach((item: any) => {
            const name = item.name;
            const qty = Number(item.quantity) || 0;
            const price = Number(item.unit_price) || 0;
            if (dishCounts[name]) {
              dishCounts[name].count += qty;
              dishCounts[name].total += price * qty;
            } else {
              dishCounts[name] = { name, count: qty, total: price * qty };
            }
          });
        } catch (_) {}
      }
    });

    const topDishes = Object.values(dishCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Listado de últimos pedidos entregados con desglose detallado de tiempos
    const recentCompletedOrders = deliveredOrders
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 8)
      .map(o => {
        const created = new Date(o.created_at).getTime();
        let queueMin = 0;
        let prepMin = 0;
        let totalMin = 0;

        if (o.preparing_at) {
          queueMin = Math.round((new Date(o.preparing_at).getTime() - created) / 60000);
          if (o.delivered_at) {
            prepMin = Math.round((new Date(o.delivered_at).getTime() - new Date(o.preparing_at).getTime()) / 60000);
          }
        }
        if (o.delivered_at) {
          totalMin = Math.round((new Date(o.delivered_at).getTime() - created) / 60000);
        }

        const isSlaMet = prepMin > 0 && prepMin <= 20;

        return {
          id: o.id.substring(0, 8),
          source: o.source,
          location: o.source === 'room_service' ? `Hab. ${o.room_number}` : o.source === 'table' ? `Mesa ${o.table_number}` : 'Llevar',
          queueMin,
          prepMin,
          totalMin,
          isSlaMet,
          totalPrice: o.total_price
        };
      });

    return {
      totalOrders,
      deliveredOrdersCount: deliveredOrders.length,
      preparingOrdersCount: preparingOrders.length,
      pendingOrdersCount: pendingOrders.length,
      cancelledOrdersCount: cancelledOrders.length,
      totalRevenue,
      roomRevenue,
      tableRevenue,
      walkInRevenue,
      roomCount,
      tableCount,
      walkInCount,
      avgAcceptance,
      avgPrep,
      avgCycle,
      slaPercentage,
      topDishes,
      recentCompletedOrders
    };
  };

  const renderKpisView = () => {
    const stats = getKpiStats();

    return (
      <div className="space-y-6 animate-pulse-subtle">
        {/* Fila 1: KPIs Principales */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-card p-5 border-white/5 bg-black/30 flex items-center gap-4">
            <div className="p-3 bg-blue-500/10 rounded-none border border-blue-500/20 text-blue-400">
              <Timer className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Tiempo en Cola</p>
              <h3 className="text-xl font-black text-white font-mono mt-0.5">{stats.avgAcceptance} min</h3>
              <p className="text-[9px] text-slate-400">Pedido ➔ Preparando</p>
            </div>
          </div>

          <div className="glass-card p-5 border-white/5 bg-black/30 flex items-center gap-4">
            <div className="p-3 bg-amber-500/10 rounded-none border border-amber-500/20 text-amber-400">
              <ChefHat className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Tiempo en Cocina</p>
              <h3 className="text-xl font-black text-white font-mono mt-0.5">{stats.avgPrep} min</h3>
              <p className="text-[9px] text-slate-400">Preparando ➔ Entregado</p>
            </div>
          </div>

          <div className="glass-card p-5 border-white/5 bg-black/30 flex items-center gap-4">
            <div className="p-3 bg-purple-500/10 rounded-none border border-purple-500/20 text-purple-400">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Ciclo de Entrega</p>
              <h3 className="text-xl font-black text-white font-mono mt-0.5">{stats.avgCycle} min</h3>
              <p className="text-[9px] text-slate-400">Tiempo total promedio</p>
            </div>
          </div>

          <div className="glass-card p-5 border-white/5 bg-black/30 flex items-center gap-4">
            <div className="p-3 bg-emerald-500/10 rounded-none border border-emerald-500/20 text-emerald-400">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Cumplimiento SLA</p>
              <h3 className="text-xl font-black text-white font-mono mt-0.5">{stats.slaPercentage}%</h3>
              <p className="text-[9px] text-slate-400">Meta: Cocina ≤ 20 min</p>
            </div>
          </div>
        </div>

        {/* Fila 2: Resumen del Negocio e Ingresos */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Card de Ventas / Ingresos */}
          <div className="glass-card p-6 border-white/5 bg-black/30 col-span-1 lg:col-span-2 space-y-6">
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-black text-white uppercase tracking-tight">Ingresos del Servicio</h3>
              </div>
              <span className="text-lg font-black text-emerald-400 font-mono">
                ${stats.totalRevenue.toLocaleString('es-CL')}
              </span>
            </div>

            {/* Barras de progreso de Ingresos */}
            <div className="space-y-4">
              {[
                { label: 'Servicio a Habitación', count: stats.roomCount, val: stats.roomRevenue, pct: stats.totalRevenue > 0 ? (stats.roomRevenue / stats.totalRevenue) * 100 : 0, color: 'bg-purple-500' },
                { label: 'Consumo en Mesa', count: stats.tableCount, val: stats.tableRevenue, pct: stats.totalRevenue > 0 ? (stats.tableRevenue / stats.totalRevenue) * 100 : 0, color: 'bg-amber-500' },
                { label: 'Mostrador / Walk-In', count: stats.walkInCount, val: stats.walkInRevenue, pct: stats.totalRevenue > 0 ? (stats.walkInRevenue / stats.totalRevenue) * 100 : 0, color: 'bg-slate-500' }
              ].map((c, i) => (
                <div key={i} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${c.color}`} />
                      {c.label} <span className="text-slate-500">({c.count} ped.)</span>
                    </span>
                    <span className="font-mono text-white">${c.val.toLocaleString('es-CL')} ({Math.round(c.pct)}%)</span>
                  </div>
                  <div className="w-full bg-white/5 h-2.5 rounded-none overflow-hidden">
                    <div className={`${c.color} h-full transition-all duration-500`} style={{ width: `${c.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Card de Resumen de Pedidos por Estado */}
          <div className="glass-card p-6 border-white/5 bg-black/30 space-y-6">
            <div className="flex items-center gap-2 border-b border-white/5 pb-3">
              <ShoppingBag className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-black text-white uppercase tracking-tight">Embudo de Pedidos</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-white/5 border border-white/5 text-center">
                <span className="block text-[9px] uppercase tracking-wider text-slate-500 font-bold">Total Pedidos</span>
                <span className="text-2xl font-black text-white font-mono mt-1 block">{stats.totalOrders}</span>
              </div>
              <div className="p-3 bg-emerald-500/5 border border-emerald-500/10 text-center">
                <span className="block text-[9px] uppercase tracking-wider text-emerald-400 font-bold">Entregados</span>
                <span className="text-2xl font-black text-emerald-400 font-mono mt-1 block">{stats.deliveredOrdersCount}</span>
              </div>
              <div className="p-3 bg-blue-500/5 border border-blue-500/10 text-center">
                <span className="block text-[9px] uppercase tracking-wider text-blue-400 font-bold">En Cocina</span>
                <span className="text-2xl font-black text-blue-400 font-mono mt-1 block">{stats.preparingOrdersCount}</span>
              </div>
              <div className="p-3 bg-yellow-500/5 border border-yellow-500/10 text-center">
                <span className="block text-[9px] uppercase tracking-wider text-yellow-400 font-bold">Pendientes</span>
                <span className="text-2xl font-black text-yellow-400 font-mono mt-1 block">{stats.pendingOrdersCount}</span>
              </div>
            </div>

            <div className="text-center pt-2 text-[10px] text-slate-500 uppercase font-black tracking-wider flex justify-center items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-red-500" />
              <span>Pedidos Cancelados: <span className="text-white font-mono">{stats.cancelledOrdersCount}</span></span>
            </div>
          </div>
        </div>

        {/* Fila 3: Platos Más Solicitados y Desglose de Pedidos Recientes */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Top Platos */}
          <div className="glass-card p-6 border-white/5 bg-black/30 space-y-5">
            <div className="flex items-center gap-2 border-b border-white/5 pb-3">
              <UtensilsCrossed className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-black text-white uppercase tracking-tight">Platos Más Solicitados</h3>
            </div>
            
            <div className="space-y-4">
              {stats.topDishes.map((dish, index) => {
                const maxCount = stats.topDishes[0]?.count || 1;
                const widthPct = (dish.count / maxCount) * 100;
                
                return (
                  <div key={index} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-extrabold text-white uppercase tracking-wide">
                        <span className="text-amber-500 font-mono mr-1.5">#{index + 1}</span>
                        {dish.name}
                      </span>
                      <span className="font-mono text-slate-400">{dish.count} uds.</span>
                    </div>
                    <div className="w-full bg-white/5 h-1.5 rounded-none overflow-hidden">
                      <div className="bg-amber-500 h-full transition-all duration-500" style={{ width: `${widthPct}%` }} />
                    </div>
                  </div>
                );
              })}
              {stats.topDishes.length === 0 && (
                <div className="text-center py-10 text-xs text-slate-500">
                  No hay datos de platos disponibles
                </div>
              )}
            </div>
          </div>

          {/* Detalle de Tiempos de los Pedidos Recientes */}
          <div className="glass-card p-6 border-white/5 bg-black/30 col-span-1 lg:col-span-2 space-y-4">
            <div className="flex items-center gap-2 border-b border-white/5 pb-3">
              <Timer className="w-4 h-4 text-purple-400" />
              <h3 className="text-sm font-black text-white uppercase tracking-tight">Desglose de Tiempos (Últimos Pedidos)</h3>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/5 text-[9px] uppercase tracking-wider text-slate-500 font-bold">
                    <th className="py-2.5">Pedido</th>
                    <th>Ubicación</th>
                    <th>En Cola</th>
                    <th>En Cocina</th>
                    <th>Ciclo Total</th>
                    <th>Estado SLA</th>
                    <th className="text-right">Monto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-medium">
                  {stats.recentCompletedOrders.map((ord, idx) => (
                    <tr key={idx} className="hover:bg-white/1 text-slate-300">
                      <td className="py-2.5 font-mono text-[10px] text-white">#{ord.id}</td>
                      <td className="uppercase font-bold text-[10px]">{ord.location}</td>
                      <td className="font-mono text-slate-400">{ord.queueMin}m</td>
                      <td className={`font-mono font-extrabold ${ord.isSlaMet ? 'text-emerald-400' : 'text-red-400'}`}>
                        {ord.prepMin}m
                      </td>
                      <td className="font-mono text-slate-400">{ord.totalMin}m</td>
                      <td>
                        <span className={`px-1.5 py-0.5 text-[8px] font-black uppercase rounded-none tracking-wider ${
                          ord.isSlaMet 
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                            : 'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}>
                          {ord.isSlaMet ? 'Cumple' : 'Fuera SLA'}
                        </span>
                      </td>
                      <td className="font-mono text-right text-white font-extrabold">
                        ${Number(ord.totalPrice).toLocaleString('es-CL')}
                      </td>
                    </tr>
                  ))}
                  {stats.recentCompletedOrders.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-10 text-slate-500">
                        No hay pedidos entregados en esta sesión
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
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
        <button
          onClick={() => setActiveTab('kpis')}
          className={`px-6 py-3.5 text-xs font-black uppercase tracking-wider transition-all border-b-2 rounded-none cursor-pointer ${
            activeTab === 'kpis'
              ? 'border-amber-500 text-amber-400 bg-white/2'
              : 'border-transparent text-slate-400 hover:text-white hover:bg-white/1'
          }`}
        >
          Rendimiento y KPIs
        </button>
      </div>

      {activeTab === 'kpis' ? (
        renderKpisView()
      ) : (
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
      )}
    </div>
  );
}
