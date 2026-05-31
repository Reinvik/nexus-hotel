import { useState, useEffect } from 'react';
import { hotelRpc } from '../lib/supabase';
import type { CleaningTask, Profile, Room } from '../types';
import { Loader2, Play, CheckCircle2, User, RefreshCw, Clock, Sparkles, AlertCircle } from 'lucide-react';
import { format, differenceInMinutes, parseISO } from 'date-fns';

interface CleaningDashboardProps {
  companyId: string;
}

export function CleaningDashboard({ companyId }: CleaningDashboardProps) {
  const [tasks, setTasks] = useState<CleaningTask[]>([]);
  const [cleaners, setCleaners] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [activeCleanerId, setActiveCleanerId] = useState<string>('');

  async function loadCleaningData() {
    if (!companyId) return;
    setLoading(true);
    try {
      // 1. Fetch cleaning tasks with room info
      const { data: tasksData, error: tasksError } = await hotelRpc.getCleaningTasksWithRooms(companyId);
      if (tasksError) throw tasksError;
      
      const mappedTasks = ((tasksData as any[]) || []).map((t: any) => ({
        ...t,
        room: { room_number: t.room_number, name: t.room_name }
      }));

      // 2. Reconcile: Fetch all rooms to check for missing cleaning tasks for dirty/cleaning rooms
      const { data: roomsData, error: roomsError } = await hotelRpc.getRooms(companyId);
      if (roomsError) throw roomsError;
      
      const allRooms = (roomsData as Room[]) || [];
      const dirtyOrCleaningRooms = allRooms.filter(r => r.status === 'Dirty' || r.status === 'Cleaning');
      
      // Find rooms that don't have a pending or in-progress cleaning task
      const missingTasks = dirtyOrCleaningRooms.filter(room => {
        const hasActiveTask = mappedTasks.some(
          t => t.room_id === room.id && (t.status === 'pending' || t.status === 'in_progress')
        );
        return !hasActiveTask;
      });

      // 3. Create missing cleaning tasks in the database
      if (missingTasks.length > 0) {
        console.log(`Reconciliación: Creando ${missingTasks.length} tareas de aseo para habitaciones sucias sin tarea registrada...`);
        for (const room of missingTasks) {
          try {
            await hotelRpc.createCleaningTask({
              companyId,
              roomId: room.id,
              notes: room.status === 'Cleaning' 
                ? 'Aseo en curso (reconciliado automáticamente).' 
                : 'Habitación sucia pendiente de aseo (reconciliado automáticamente).'
            });
          } catch (createErr) {
            console.error(`Error autocreando tarea de aseo para pieza #${room.room_number}:`, createErr);
          }
        }
        
        // Refetch cleaning tasks to display the new ones
        const { data: refetchedData, error: refetchError } = await hotelRpc.getCleaningTasksWithRooms(companyId);
        if (!refetchError && refetchedData) {
          const finalTasks = (refetchedData as any[]).map((t: any) => ({
            ...t,
            room: { room_number: t.room_number, name: t.room_name }
          }));
          setTasks(finalTasks);
        } else {
          setTasks(mappedTasks);
        }
      } else {
        setTasks(mappedTasks);
      }

      // Fetch cleaners profiles
      const { data: profilesData, error: profilesError } = await hotelRpc.getCleaners(companyId);
      if (profilesError) throw profilesError;
      setCleaners((profilesData as any[]) || []);
    } catch (err) {
      console.error('Error loading cleaning data:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCleaningData();
  }, [companyId]);

  // Start Cleaning Task
  const handleStartCleaning = async (task: CleaningTask) => {
    setActionLoading(task.id);
    const nowStr = new Date().toISOString();
    try {
      // 1. Update cleaning task via RPC
      const { error: tError } = await hotelRpc.updateCleaningTask({
        taskId: task.id,
        status: 'in_progress',
        startedAt: nowStr,
        cleanerId: activeCleanerId || null,
      });
      if (tError) throw tError;

      // 2. Update room status to Cleaning
      const { error: rError } = await hotelRpc.updateRoomStatus(task.room_id, 'Cleaning');
      if (rError) throw rError;

      // Refresh local list
      await loadCleaningData();
    } catch (err: any) {
      alert(`Error al iniciar limpieza: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  // Complete Cleaning Task
  const handleCompleteCleaning = async (task: CleaningTask) => {
    setActionLoading(task.id);
    const nowStr = new Date().toISOString();
    try {
      // 1. Update cleaning task via RPC
      const { error: tError } = await hotelRpc.updateCleaningTask({
        taskId: task.id,
        status: 'completed',
        completedAt: nowStr,
      });
      if (tError) throw tError;

      // 2. Update room status to Available
      const { error: rError } = await hotelRpc.updateRoomStatus(task.room_id, 'Available');
      if (rError) throw rError;

      // Refresh local list
      await loadCleaningData();
    } catch (err: any) {
      alert(`Error al completar limpieza: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  // Assign cleaner to a pending task manually
  const handleAssignCleaner = async (taskId: string, cleanerId: string) => {
    try {
      const { error } = await hotelRpc.updateCleaningTask({ taskId, cleanerId: cleanerId || null });
      if (error) throw error;
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, cleaner_id: cleanerId } : t));
    } catch (err: any) {
      alert(`Error al asignar: ${err.message}`);
    }
  };

  // Calculate duration metrics (Takt time)
  const getCleaningDuration = (task: CleaningTask) => {
    if (!task.started_at || !task.completed_at) return null;
    return differenceInMinutes(parseISO(task.completed_at), parseISO(task.started_at));
  };

  const pendingTasks = tasks.filter(t => t.status === 'pending');
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress');
  const completedTasks = tasks.filter(t => t.status === 'completed');

  return (
    <div className="space-y-6 max-w-4xl mx-auto staff-dashboard">
      {/* Header controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#0e1726] p-6 rounded-3xl border border-white/5">
        <div>
          <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            Módulo de Limpieza
            <Sparkles className="w-5 h-5 text-orange-400" />
          </h2>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">
            Gestión operacional de aseos y tiempos de rotación
          </p>
        </div>

        {/* Cleaner identity selector */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="flex-1 sm:w-56">
            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">
              ¿Quién limpia? (Identidad)
            </label>
            <select
              value={activeCleanerId}
              onChange={(e) => setActiveCleanerId(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#131c2e] border border-white/5 rounded-xl text-white font-bold outline-none cursor-pointer text-xs"
            >
              <option value="">Selecciona Camarera...</option>
              {cleaners.map(c => (
                <option key={c.id} value={c.id}>{c.name || c.email}</option>
              ))}
            </select>
          </div>
          <button
            onClick={loadCleaningData}
            disabled={loading}
            className="p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-all self-end"
            title="Recargar"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {loading && tasks.length === 0 ? (
        <div className="flex items-center justify-center h-64 bg-white/5 border border-white/5 rounded-3xl">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      ) : (
        <div className="space-y-8">
          {/* 1. In Progress List */}
          {inProgressTasks.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-black uppercase tracking-widest text-orange-400 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-ping" />
                Limpiezas en Curso ({inProgressTasks.length})
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {inProgressTasks.map(task => (
                  <div 
                    key={task.id} 
                    className="glass-card p-5 border border-orange-500/20 relative overflow-hidden"
                  >
                    {actionLoading === task.id && (
                      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-10">
                        <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                      </div>
                    )}
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <span className="px-2 py-0.5 bg-orange-500/10 text-orange-400 rounded text-[10px] font-black tracking-widest border border-orange-500/20">
                          #{task.room?.room_number}
                        </span>
                        <h4 className="font-extrabold text-white text-base mt-2">{task.room?.name}</h4>
                      </div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        Iniciado: {task.started_at ? format(parseISO(task.started_at), 'HH:mm') : ''}
                      </span>
                    </div>

                    <p className="text-xs text-slate-400 font-medium mb-4">{task.notes || 'Sin notas.'}</p>

                    <button
                      onClick={() => handleCompleteCleaning(task)}
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-extrabold uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Completar Aseo (Habilitar Habitación)
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 2. Pending List */}
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-widest text-red-400 flex items-center gap-2">
              Habitaciones Sucias / Aseos Requeridos ({pendingTasks.length})
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingTasks.map(task => (
                <div 
                  key={task.id} 
                  className="glass-card p-5 border border-white/5 relative overflow-hidden"
                >
                  {actionLoading === task.id && (
                    <div className="absolute inset-0 bg-black/60 bg-opacity-70 flex items-center justify-center z-10">
                      <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                    </div>
                  )}
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <span className="px-2 py-0.5 bg-red-500/10 text-red-400 rounded text-[10px] font-black tracking-widest border border-red-500/20">
                        #{task.room?.room_number}
                      </span>
                      <h4 className="font-extrabold text-white text-base mt-2">{task.room?.name}</h4>
                    </div>
                    <span className="text-[10px] text-red-400 font-black uppercase tracking-wider flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> Sucia
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 font-medium mb-4">{task.notes || 'Limpieza requerida.'}</p>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleStartCleaning(task)}
                      className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-extrabold uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-2"
                    >
                      <Play className="w-3.5 h-3.5" />
                      Iniciar Aseo
                    </button>
                    
                    {/* Manual Assign dropdown on card */}
                    <div className="w-36">
                      <select
                        value={task.cleaner_id || ''}
                        onChange={(e) => handleAssignCleaner(task.id, e.target.value)}
                        className="w-full px-2 py-3 bg-[#131c2e] border border-white/5 rounded-xl text-white font-bold outline-none cursor-pointer text-[10px] h-full"
                      >
                        <option value="">Asignar a...</option>
                        {cleaners.map(c => (
                          <option key={c.id} value={c.id}>{c.name || c.email}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              ))}

              {pendingTasks.length === 0 && (
                <div className="col-span-2 text-center py-12 bg-white/5 rounded-3xl border border-dashed border-white/5 text-slate-500">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500/30 mx-auto mb-4" />
                  <p className="text-sm font-bold uppercase tracking-wider">No hay habitaciones sucias pendientes de aseo</p>
                </div>
              )}
            </div>
          </div>

          {/* 3. Completed List (Takt Time Metrics) */}
          {completedTasks.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                Aseos Completados Hoy ({completedTasks.length})
              </h3>
              
              <div className="bg-[#0e1726]/40 rounded-3xl border border-white/5 overflow-hidden">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/5 bg-white/5">
                      <th className="p-4 font-black uppercase text-slate-400 tracking-wider">Habitación</th>
                      <th className="p-4 font-black uppercase text-slate-400 tracking-wider">Limpio Por</th>
                      <th className="p-4 font-black uppercase text-slate-400 tracking-wider">Duración</th>
                      <th className="p-4 font-black uppercase text-slate-400 tracking-wider">Completado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {completedTasks.map(task => {
                      const duration = getCleaningDuration(task);
                      return (
                        <tr key={task.id} className="border-b border-white/5 hover:bg-white/[0.01]">
                          <td className="p-4 font-extrabold text-white">
                            #{task.room?.room_number} — {task.room?.name}
                          </td>
                          <td className="p-4 font-semibold text-slate-300">
                            <div className="flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5 text-slate-500" />
                              <span>{task.cleaner?.name || task.cleaner?.email || 'Sin asignar'}</span>
                            </div>
                          </td>
                          <td className="p-4 font-bold">
                            {duration !== null ? (
                              <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                duration > 30 ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'
                              }`}>
                                {duration} min (Takt)
                              </span>
                            ) : '--'}
                          </td>
                          <td className="p-4 text-slate-500 font-medium">
                            {task.completed_at ? format(parseISO(task.completed_at), 'HH:mm') : ''}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
