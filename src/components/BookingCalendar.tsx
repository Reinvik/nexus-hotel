import { useState, useEffect } from 'react';
import { hotelRpc } from '../lib/supabase';
import type { Room, Booking } from '../types';
import { Loader2, Calendar as CalendarIcon, ChevronLeft, ChevronRight, User, Phone, Mail, FileText, CheckCircle2, Bed } from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
 
interface BookingCalendarProps {
  companyId: string;
}
 
export function BookingCalendar({ companyId }: BookingCalendarProps) {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [selectedRoomForBooking, setSelectedRoomForBooking] = useState<Room | null>(null);
 
  const start = startOfMonth(currentDate);
  const end = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start, end });
 
  async function loadCalendarData() {
    if (!companyId) return;
    setLoading(true);
    try {
      // Fetch rooms
      const { data: roomsData, error: roomsError } = await hotelRpc.getRooms(companyId);
      if (roomsError) throw roomsError;
      setRooms((roomsData as any[]) || []);
 
      const { data: bookingsData, error: bookingsError } = await hotelRpc.getBookings(companyId);
      if (bookingsError) throw bookingsError;
      setBookings(((bookingsData as any[]) || []).filter((b: any) => b.status !== 'cancelled'));
    } catch (err) {
      console.error('Error loading calendar data:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCalendarData();
  }, [companyId, currentDate]);

  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const handleToday = () => setCurrentDate(new Date());

  // Find booking for a specific room and day
  const getBookingForDay = (roomId: string, date: Date) => {
    return bookings.find(b => {
      if (b.room_id !== roomId) return false;
      const bStart = parseISO(b.check_in_date);
      const bEnd = parseISO(b.check_out_date);
      
      // Check if current date falls within interval [check_in_date, check_out_date]
      // In hotel systems, check-out date is usually the checkout day (morning), so the guest stays the night BEFORE.
      // So we check if date is >= check_in_date AND date < check_out_date (guest stays until the checkout morning).
      return (isSameDay(date, bStart) || isAfter(date, bStart)) && isBefore(date, bEnd);
    });
  };

  // Helper to determine date conditions
  const isBefore = (date1: Date, date2: Date) => {
    const d1 = new Date(date1.getFullYear(), date1.getMonth(), date1.getDate());
    const d2 = new Date(date2.getFullYear(), date2.getMonth(), date2.getDate());
    return d1.getTime() < d2.getTime();
  };

  const isAfter = (date1: Date, date2: Date) => {
    const d1 = new Date(date1.getFullYear(), date1.getMonth(), date1.getDate());
    const d2 = new Date(date2.getFullYear(), date2.getMonth(), date2.getDate());
    return d1.getTime() > d2.getTime();
  };

  const handleCellClick = (booking: Booking, room: Room) => {
    setSelectedBooking(booking);
    setSelectedRoomForBooking(room);
  };

  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm('¿Estás seguro de cancelar esta reserva?')) return;
    setLoading(true);
    try {
      const { error } = await hotelRpc.updateBookingStatus(bookingId, 'cancelled');
      if (error) throw error;
      setBookings(prev => prev.filter(b => b.id !== bookingId));
      
      // Update room status back to Available if room was occupied
      if (selectedRoomForBooking && selectedRoomForBooking.status === 'Occupied') {
        const todayStr = format(new Date(), 'yyyy-MM-dd');
        const b = bookings.find(b => b.id === bookingId);
        if (b && b.check_in_date <= todayStr && b.check_out_date >= todayStr) {
          await hotelRpc.updateRoomStatus(selectedRoomForBooking.id, 'Available');
          setRooms(prev => prev.map(r => r.id === selectedRoomForBooking.id ? { ...r, status: 'Available' } : r));
        }
      }

      setSelectedBooking(null);
      setSelectedRoomForBooking(null);
    } catch (err: any) {
      alert(`Error al cancelar: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 staff-dashboard">
      {/* Header controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#0e1726] p-6 rounded-3xl border border-white/5">
        <div>
          <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            Calendario de Ocupación
            <CalendarIcon className="w-5 h-5 text-blue-400" />
          </h2>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">
            Visualización mensual del rack de reservas y huéspedes por día
          </p>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto justify-between">
          <div className="flex items-center gap-1.5">
            <button 
              onClick={handlePrevMonth}
              className="p-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-lg transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-black text-white uppercase tracking-wider px-3 min-w-36 text-center">
              {format(currentDate, 'MMMM yyyy', { locale: es })}
            </span>
            <button 
              onClick={handleNextMonth}
              className="p-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-lg transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={handleToday}
            className="px-4 py-2 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white rounded-lg text-xs font-black uppercase tracking-wider border border-blue-500/20 transition-all"
          >
            Hoy
          </button>
        </div>
      </div>

      {/* Grid calendar view */}
      {loading && rooms.length === 0 ? (
        <div className="flex items-center justify-center h-64 bg-white/5 border border-white/5 rounded-3xl">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      ) : (
        <div className="glass-card border border-white/5 overflow-x-auto custom-scrollbar shadow-2xl">
          <table className="w-full border-collapse text-left text-xs min-w-[800px]">
            <thead>
              <tr className="border-b border-white/5 bg-white/20">
                <th className="p-4 font-black uppercase text-slate-400 tracking-wider w-40 sticky left-0 bg-[#0e1726] border-r border-white/5">
                  Habitación
                </th>
                {daysInMonth.map(day => {
                  const dayNum = format(day, 'd');
                  const dayName = format(day, 'eee', { locale: es }).substring(0, 1).toUpperCase();
                  const isTodayDate = isSameDay(day, new Date());
                  return (
                    <th 
                      key={day.toString()} 
                      className={`p-2 font-black text-center border-r border-white/5 min-w-10 ${
                        isTodayDate ? 'bg-blue-600/20 text-blue-400' : 'text-slate-500'
                      }`}
                    >
                      <div className="text-[10px]">{dayName}</div>
                      <div className="text-xs font-extrabold mt-0.5">{dayNum}</div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {rooms.map(room => (
                <tr key={room.id} className="border-b border-white/5 hover:bg-white/[0.01] transition-colors">
                  <td className="p-4 font-extrabold text-white sticky left-0 bg-[#0c1221] border-r border-white/5 shadow-[5px_0_10px_rgba(0,0,0,0.5)]">
                    <div className="flex items-center gap-2">
                      <Bed className="w-4 h-4 text-blue-400" />
                      <div>
                        <span className="block font-black text-sm">#{room.room_number}</span>
                        <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider">{room.type}</span>
                      </div>
                    </div>
                  </td>
                  {daysInMonth.map(day => {
                    const booking = getBookingForDay(room.id, day);
                    const isStart = booking && isSameDay(parseISO(booking.check_in_date), day);
                    const isPaid = booking?.payment_status === 'paid';
                    
                    return (
                      <td 
                        key={day.toString()} 
                        className={`p-1 border-r border-white/5 text-center align-middle h-14 relative`}
                      >
                        {booking ? (
                          <button
                            onClick={() => handleCellClick(booking, room)}
                            className={`w-full h-10 rounded-lg flex items-center justify-center p-1.5 transition-all text-left text-[10px] font-black uppercase overflow-hidden hover:scale-[1.02] active:scale-[0.98] select-none ${
                              isPaid 
                                ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 shadow-sm' 
                                : 'bg-orange-600/20 text-orange-400 border border-orange-500/20 shadow-sm'
                            }`}
                          >
                            <span className="truncate">
                              {isStart ? booking.guest_name : '•'}
                            </span>
                          </button>
                        ) : null}
                      </td>
                    );
                  })}
                </tr>
              ))}

              {rooms.length === 0 && (
                <tr>
                  <td colSpan={daysInMonth.length + 1} className="p-12 text-center text-slate-500">
                    <p className="text-sm font-bold uppercase tracking-wider">No hay habitaciones registradas para graficar</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Booking Detail Modal */}
      {selectedBooking && selectedRoomForBooking && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[150] flex items-center justify-center p-4">
          <div className="glass-card max-w-md w-full border border-white/10 overflow-hidden relative shadow-2xl">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
            
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-[#0d1525]">
              <div>
                <h3 className="text-base font-black text-white tracking-tight uppercase">
                  Detalles de Reserva
                </h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">
                  Habitación #{selectedRoomForBooking.room_number} — {selectedRoomForBooking.name}
                </p>
              </div>
              <button 
                onClick={() => { setSelectedBooking(null); setSelectedRoomForBooking(null); }}
                className="text-xs text-slate-500 hover:text-white uppercase font-black tracking-wider"
              >
                Cerrar
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Guest Card */}
              <div className="space-y-3 bg-[#111827]/60 p-4 rounded-2xl border border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                    <User className="w-4 h-4 text-blue-400" />
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-500 uppercase font-black block">Nombre Huésped</span>
                    <span className="text-sm font-bold text-white block">{selectedBooking.guest_name}</span>
                  </div>
                </div>

                {selectedBooking.guest_phone && (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-slate-500/10 border border-white/5 flex items-center justify-center">
                      <Phone className="w-4 h-4 text-slate-400" />
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 uppercase font-black block">WhatsApp</span>
                      <span className="text-xs font-semibold text-slate-300 block">{selectedBooking.guest_phone}</span>
                    </div>
                  </div>
                )}

                {selectedBooking.guest_email && (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-slate-500/10 border border-white/5 flex items-center justify-center">
                      <Mail className="w-4 h-4 text-slate-400" />
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 uppercase font-black block">Email</span>
                      <span className="text-xs font-semibold text-slate-300 block">{selectedBooking.guest_email}</span>
                    </div>
                  </div>
                )}

                {selectedBooking.guest_rut && (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-slate-500/10 border border-white/5 flex items-center justify-center">
                      <FileText className="w-4 h-4 text-slate-400" />
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 uppercase font-black block">RUT</span>
                      <span className="text-xs font-semibold text-slate-300 block">{selectedBooking.guest_rut}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Dates & Billing */}
              <div className="grid grid-cols-2 gap-3 bg-[#111827]/40 p-4 rounded-2xl border border-white/5">
                <div>
                  <span className="text-[9px] text-slate-500 uppercase font-black block">Check-in</span>
                  <span className="text-xs font-bold text-white block">{selectedBooking.check_in_date}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 uppercase font-black block">Check-out</span>
                  <span className="text-xs font-bold text-white block">{selectedBooking.check_out_date}</span>
                </div>
                <div className="pt-2">
                  <span className="text-[9px] text-slate-500 uppercase font-black block">Precio Total</span>
                  <span className="text-xs font-bold text-orange-400 block">${selectedBooking.total_price.toLocaleString('es-CL')} CLP</span>
                </div>
                <div className="pt-2">
                  <span className="text-[9px] text-slate-500 uppercase font-black block">Medio de Pago</span>
                  <span className="text-xs font-bold text-white block">Flow.cl</span>
                </div>
              </div>

              {/* Status and Actions */}
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5 text-xs font-bold">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="uppercase text-[10px] tracking-wider text-slate-300">Pago Aprobado</span>
                </div>
                <span className="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-full text-[9px] font-black uppercase tracking-wider">
                  {selectedBooking.payment_status}
                </span>
              </div>

              {selectedBooking.notes && (
                <div className="p-3 bg-white/5 rounded-xl border border-white/5 text-xs text-slate-400">
                  <span className="text-[9px] text-slate-500 uppercase font-black block mb-1">Notas</span>
                  {selectedBooking.notes}
                </div>
              )}
            </div>

            <div className="p-5 bg-[#0a0f18] border-t border-white/5 flex gap-3">
              <button
                onClick={() => handleCancelBooking(selectedBooking.id)}
                className="flex-1 py-3 bg-red-600/10 border border-red-500/20 hover:bg-red-600 text-red-400 hover:text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all"
              >
                Anular Reserva
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
