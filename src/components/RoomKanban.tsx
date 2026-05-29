import { useState, useEffect } from 'react';
import { hotelRpc } from '../lib/supabase';
import type { Room, Booking, RoomStatus } from '../types';
import { 
  User, Loader2, ArrowRight, Play, CheckCircle2, RefreshCw,
  Phone, Mail, FileText, Moon 
} from 'lucide-react';

interface RoomKanbanProps {
  companyId: string;
}

const calculateNights = (checkIn: string, checkOut: string) => {
  try {
    const inDate = new Date(checkIn);
    const outDate = new Date(checkOut);
    // Add timezone offset correction or simple date diff
    const diffTime = Math.abs(outDate.getTime() - inDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays || 1;
  } catch (e) {
    return 1;
  }
};

const STATUS_COLUMNS: { key: RoomStatus; label: string; color: string; bg: string }[] = [
  { key: 'Available', label: 'Disponible', color: 'text-emerald-400 border-emerald-500/20', bg: 'bg-emerald-500/5' },
  { key: 'Occupied', label: 'Ocupada', color: 'text-blue-400 border-blue-500/20', bg: 'bg-blue-500/5' },
  { key: 'Dirty', label: 'Sucia', color: 'text-red-400 border-red-500/20', bg: 'bg-red-500/5' },
  { key: 'Cleaning', label: 'En Limpieza', color: 'text-orange-400 border-orange-500/20', bg: 'bg-orange-500/5' },
  { key: 'Maintenance', label: 'Mantenimiento', color: 'text-slate-400 border-slate-500/20', bg: 'bg-slate-500/5' }
];

export function RoomKanban({ companyId }: RoomKanbanProps) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [activeBookings, setActiveBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  async function loadKanbanData() {
    if (!companyId) return;
    setLoading(true);
    try {
      // Fetch rooms
      const { data: roomsData, error: roomsError } = await hotelRpc.getRooms(companyId);
      if (roomsError) throw roomsError;
      setRooms((roomsData as any[]) || []);

      // Fetch bookings currently checked in or confirmed (filter client-side)
      const { data: bookingsData, error: bookingsError } = await hotelRpc.getBookings(companyId);
      if (bookingsError) throw bookingsError;
      setActiveBookings(((bookingsData as any[]) || []).filter((b: any) => ['confirmed','checked_in'].includes(b.status)));
    } catch (err) {
      console.error('Error loading Kanban data:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadKanbanData();
  }, [companyId]);

  // Update room status
  const updateRoomStatus = async (roomId: string, newStatus: RoomStatus) => {
    setActionLoading(roomId);
    try {
      const { error } = await hotelRpc.updateRoomStatus(roomId, newStatus);
      if (error) throw error;
      setRooms(prev => prev.map(r => r.id === roomId ? { ...r, status: newStatus } : r));
    } catch (err: any) {
      alert(`Error al actualizar estado: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  // Check-out Guest
  const handleCheckOut = async (room: Room) => {
    const booking = activeBookings.find(b => b.room_id === room.id && (b.status === 'confirmed' || b.status === 'checked_in'));
    if (!booking) {
      // If no booking found, just transition room to Dirty
      await updateRoomStatus(room.id, 'Dirty');
      return;
    }

    setActionLoading(room.id);
    try {
      // 1. Update booking status to checked_out
      const { error: bError } = await hotelRpc.updateBookingStatus(booking.id, 'checked_out');
      if (bError) throw bError;

      // 2. Update room status to Dirty
      const { error: rError } = await hotelRpc.updateRoomStatus(room.id, 'Dirty');
      if (rError) throw rError;

      // 3. Create cleaning task via direct hotel schema (using supabase.rpc)
      // For now refresh data — cleaning task creation handled separately
      await loadKanbanData();
    } catch (err: any) {
      console.error(err);
      alert(`Error al realizar Check-out: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  // Find guest info for an occupied room
  const getRoomGuestInfo = (roomId: string) => {
    return activeBookings.find(b => b.room_id === roomId && (b.status === 'confirmed' || b.status === 'checked_in'));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            Kanban de Operaciones (Gemba Board)
          </h2>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">
            Control visual del estado de las habitaciones en tiempo real
          </p>
        </div>
        <button
          onClick={loadKanbanData}
          disabled={loading}
          className="p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-all"
          title="Refrescar Tablero"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading && rooms.length === 0 ? (
        <div className="flex items-center justify-center h-64 bg-white/5 border border-white/5 rounded-3xl">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {STATUS_COLUMNS.map(col => {
            const colRooms = rooms.filter(r => r.status === col.key);

            return (
              <div 
                key={col.key}
                className={`rounded-2xl border border-white/5 p-4 flex flex-col min-h-[500px] ${col.bg}`}
              >
                {/* Column Title */}
                <div className="flex justify-between items-center border-b border-white/5 pb-3 mb-4">
                  <span className={`text-xs font-black uppercase tracking-wider ${col.color}`}>
                    {col.label}
                  </span>
                  <span className="px-2 py-0.5 bg-white/5 rounded-md text-[10px] font-black text-slate-400">
                    {colRooms.length}
                  </span>
                </div>

                {/* Column Cards */}
                <div className="flex-1 space-y-3 overflow-y-auto max-h-[70vh] pr-1 custom-scrollbar">
                  {colRooms.map(room => {
                    const guest = getRoomGuestInfo(room.id);
                    const isOccupied = room.status === 'Occupied';
                    const isDirty = room.status === 'Dirty';
                    const isCleaning = room.status === 'Cleaning';
                    const isAvailable = room.status === 'Available';
                    const isActionLoading = actionLoading === room.id;

                    return (
                      <div
                        key={room.id}
                        className="bg-[#0e1726]/80 border border-white/5 hover:border-white/10 rounded-xl p-4 space-y-3 shadow-md hover:shadow-lg transition-all relative overflow-hidden group"
                      >
                        {isActionLoading && (
                          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-10">
                            <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                          </div>
                        )}

                        {/* Room Number & Title */}
                        <div className="flex justify-between items-start">
                          <span className="px-2 py-0.5 bg-white/5 rounded text-[10px] font-black tracking-widest text-slate-400 border border-white/5">
                            #{room.room_number}
                          </span>
                          <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">
                            {room.type}
                          </span>
                        </div>

                        <div>
                          <h4 className="font-extrabold text-white text-sm">{room.name}</h4>
                          <p className="text-[10px] text-slate-400 mt-1">${room.price_per_day.toLocaleString('es-CL')}/noche</p>
                        </div>

                        {/* Guest info card */}
                        {guest && (
                          <div className="bg-[#10192a] p-3 rounded-xl border border-white/5 space-y-2 relative overflow-hidden">
                            {/* Nights badge / length of stay */}
                            <div className="absolute top-2 right-2 bg-blue-500/10 text-blue-400 font-extrabold text-[8px] uppercase tracking-wider px-1.5 py-0.5 rounded border border-blue-500/10 flex items-center gap-1">
                              <Moon className="w-2.5 h-2.5" />
                              <span>{calculateNights(guest.check_in_date, guest.check_out_date)} Noches</span>
                            </div>

                            {/* Guest main name & role */}
                            <div className="flex items-center gap-2 pr-12">
                              <div className="w-6 h-6 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/10 text-blue-400">
                                <User className="w-3 h-3" />
                              </div>
                              <div className="overflow-hidden">
                                <span className="font-extrabold text-white text-xs block truncate leading-tight">
                                  {guest.guest_name}
                                </span>
                                {guest.guest_rut && (
                                  <span className="text-[8px] text-slate-500 font-black uppercase block tracking-wider mt-0.5">
                                    RUT: {guest.guest_rut}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Divider line */}
                            <div className="h-[1px] bg-white/5 my-1.5" />

                            {/* Contact Details */}
                            <div className="space-y-1">
                              {guest.guest_phone && (
                                <div className="flex items-center gap-1.5 text-[9px] text-slate-400 font-semibold">
                                  <Phone className="w-3 h-3 text-slate-500 shrink-0" />
                                  <span className="truncate">{guest.guest_phone}</span>
                                </div>
                              )}
                              {guest.guest_email && (
                                <div className="flex items-center gap-1.5 text-[9px] text-slate-400 font-semibold">
                                  <Mail className="w-3 h-3 text-slate-500 shrink-0" />
                                  <span className="truncate">{guest.guest_email}</span>
                                </div>
                              )}
                            </div>

                            {/* Check In / Out Dates info */}
                            <div className="flex justify-between items-center bg-white/5 px-2 py-1.5 rounded-lg border border-white/5 text-[9px]">
                              <div>
                                <span className="text-slate-500 font-black uppercase block tracking-wider text-[7px]">Entrada</span>
                                <span className="font-bold text-slate-300">{new Date(guest.check_in_date).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })}</span>
                              </div>
                              <ArrowRight className="w-3 h-3 text-slate-500 shrink-0" />
                              <div className="text-right">
                                <span className="text-slate-500 font-black uppercase block tracking-wider text-[7px]">Salida</span>
                                <span className="font-bold text-slate-300">{new Date(guest.check_out_date).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })}</span>
                              </div>
                            </div>

                            {/* Payment Status Badges & Booking Notes */}
                            <div className="flex items-center justify-between gap-2 mt-1">
                              <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border ${
                                guest.payment_status === 'paid' 
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                                  : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              }`}>
                                {guest.payment_status === 'paid' ? 'Pagado' : 'Pendiente'}
                              </span>

                              {guest.notes && (
                                <div 
                                  className="flex items-center gap-1 text-[8px] text-slate-400 bg-white/5 px-1.5 py-0.5 rounded border border-white/5 max-w-[120px]"
                                  title={guest.notes}
                                >
                                  <FileText className="w-2.5 h-2.5 text-blue-400 shrink-0" />
                                  <span className="truncate">{guest.notes}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Card Actions (Operations flow) */}
                        <div className="pt-2 flex flex-col gap-2 border-t border-white/5">
                          {isOccupied && (
                            <button
                              onClick={() => handleCheckOut(room)}
                              className="w-full py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-1"
                            >
                              Check-out <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {isDirty && (
                            <button
                              onClick={() => updateRoomStatus(room.id, 'Cleaning')}
                              className="w-full py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-1"
                            >
                              Iniciar Limpieza <Play className="w-3 h-3" />
                            </button>
                          )}

                          {isCleaning && (
                            <button
                              onClick={() => updateRoomStatus(room.id, 'Available')}
                              className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-1"
                            >
                              Completar Limpieza <CheckCircle2 className="w-3 h-3" />
                            </button>
                          )}

                          {/* Options to manually transition rooms to other states */}
                          <div className="flex justify-between items-center text-[9px] text-slate-500 uppercase font-black tracking-widest mt-1">
                            <span>Mover a:</span>
                            <div className="flex gap-1.5">
                              {!isAvailable && (
                                <button
                                  onClick={() => updateRoomStatus(room.id, 'Available')}
                                  className="hover:text-emerald-400 font-black transition-colors"
                                  title="Disponible"
                                >
                                  DISP
                                </button>
                              )}
                              {!isDirty && !isOccupied && (
                                <button
                                  onClick={() => updateRoomStatus(room.id, 'Dirty')}
                                  className="hover:text-red-400 font-black transition-colors"
                                  title="Sucia"
                                >
                                  SUC
                                </button>
                              )}
                              {room.status !== 'Maintenance' ? (
                                <button
                                  onClick={() => updateRoomStatus(room.id, 'Maintenance')}
                                  className="hover:text-slate-400 font-black transition-colors"
                                  title="Mantenimiento"
                                >
                                  MANT
                                </button>
                              ) : (
                                <button
                                  onClick={() => updateRoomStatus(room.id, 'Available')}
                                  className="hover:text-emerald-400 font-black transition-colors"
                                  title="Habilitar"
                                >
                                  HAB
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {colRooms.length === 0 && (
                    <div className="text-center py-8 text-slate-600 border border-dashed border-white/5 rounded-xl">
                      <p className="text-[10px] font-black uppercase tracking-widest">Vacío</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
