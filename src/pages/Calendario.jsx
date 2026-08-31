import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { 
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, 
  MapPin, User, Video, Phone, CheckSquare, DollarSign, Filter, 
  Plus, X, ArrowUpRight, AlertCircle, Building2, AlignLeft
} from 'lucide-react';
import { useConfig } from '../context/ConfigContext';
import { sendTelegramNotification, createCalendarEvent } from '../lib/notifications';

const today = new Date();
const currentMonth = today.getMonth();
const currentYear = today.getFullYear();

// === MOCK DATA OMNI-CANAL ===
const getTodayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const initialEvents = [
  { id: 1, type: 'cobro', title: 'Cobro: SkinGlow Spa', description: 'Facturación mensual', date: '2026-08-30', amount: 2000000, origin: '/directorio', responsable: 'Finanzas', cliente: 'SkinGlow Spa' },
  { id: 2, type: 'reunion', title: 'Reunión Presencial: Dra. Elena', description: 'Presentación de propuesta comercial', date: '2026-09-05T15:30', origin: '/kanban-clientes', responsable: 'Santiago', cliente: 'Dra. Elena Derma' },
  { id: 3, type: 'tarea', title: 'Configurar Campaña Meta Ads', description: 'Subir creativos y configurar públicos', date: '2026-08-30T10:00', origin: '/kanban-tareas', responsable: 'Davilson', cliente: 'Body & Soul Center' },
  { id: 4, type: 'remarketing', title: 'Remarketing: Dr. Aesthetic', description: 'Confirmar si recibieron el correo', date: '2026-08-29', origin: '/kanban-clientes', responsable: 'Equipo Comercial', cliente: 'Dr. Aesthetic Clinic' },
  { id: 5, type: 'cobro', title: 'Renovación: Body & Soul', description: 'Pago de anualidad', date: '2026-09-10', amount: 3000000, origin: '/directorio', responsable: 'Finanzas', cliente: 'Body & Soul Center' },
];

const CATEGORIAS = ['Todos', 'cobro', 'gasto', 'reunion', 'tarea', 'manual'];
const VISTAS = ['Agenda', 'Día', 'Semana', 'Mes']; 

const DEFAULT_MIEMBROS = ['Santiago', 'Davilson', 'Laura', 'Equipo Comercial', 'Equipo Ads', 'Finanzas'];


// Generar slots de 30 mins para el selector de tiempo (AM/PM)
const generateTimeSlots = () => {
  const slots = [{ val: '', label: 'Todo el día' }];
  for (let i = 7; i <= 21; i++) {
    for (let m = 0; m < 60; m += 30) {
      const h24 = String(i).padStart(2, '0');
      const min = String(m).padStart(2, '0');
      const val = `${h24}:${min}`;
      
      const ampm = i >= 12 ? 'PM' : 'AM';
      let h12 = i % 12;
      if (h12 === 0) h12 = 12;
      const label = `${String(h12).padStart(2, '0')}:${min} ${ampm}`;
      
      slots.push({ val, label });
    }
  }
  return slots;
};
const TIME_SLOTS = generateTimeSlots();

const getDaysInMonth = (month, year) => new Date(year, month + 1, 0).getDate();
const getFirstDayOfMonth = (month, year) => new Date(year, month, 1).getDay();

const MONTH_NAMES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

export default function Calendario() {
  const navigate = useNavigate();
  const { responsablesList } = useConfig();
  const miembrosEquipo = responsablesList?.length ? responsablesList : DEFAULT_MIEMBROS;
  
  const [rawEventos, setRawEventos] = useState([]);
  const [rawClientes, setRawClientes] = useState([]);
  const [rawGastos, setRawGastos] = useState([]);
  const [rawTareas, setRawTareas] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const [evData, clData, gfData, trData] = await Promise.all([
        supabase.from('eventos').select('*').order('created_at', { ascending: false }),
        supabase.from('clientes').select('*'),
        supabase.from('finanzas_gastos_fijos').select('*'),
        supabase.from('tareas').select('*')
      ]);
      if (evData.data) setRawEventos(evData.data);
      if (clData.data) setRawClientes(clData.data);
      if (gfData.data) setRawGastos(gfData.data);
      if (trData.data) setRawTareas(trData.data);
    } catch (e) {
      console.error('Error fetching calendar data:', e);
    } finally {
      setLoadingEvents(false);
    }
  };

  
  // Controles de Vista
  const [vista, setVista] = useState('Mes');
  const [mesActual, setMesActual] = useState(currentMonth);
  const [añoActual, setAñoActual] = useState(currentYear);
  
  // Filtros
  const [filtroTipo, setFiltroTipo] = useState('Todos');
  
  // Modales
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [editEventForm, setEditEventForm] = useState(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', type: 'tarea', date: '', time: '', responsable: 'Santiago', cliente: 'Interno (Sin Cliente)' });

  // === MOTOR DEL CALENDARIO ===
  const changeDateRange = (offset) => {
    if (vista === 'Mes' || vista === 'Agenda') {
      let newMonth = mesActual + offset;
      let newYear = añoActual;
      if (newMonth > 11) { newMonth = 0; newYear++; }
      else if (newMonth < 0) { newMonth = 11; newYear--; }
      setMesActual(newMonth);
      setAñoActual(newYear);
    }
  };

  const events = useMemo(() => {
    const all = [];
    
    // 1. Manuales
    rawEventos.forEach(ev => {
        all.push({ ...ev, type: ev.type || 'manual' });
    });

    const yearStart = añoActual - 1;
    const yearEnd = añoActual + 1;

    // 2. Cobros de Clientes
    rawClientes.forEach(cl => {
        const plan = cl.plan_pagos || [];
        const cuotasPendientes = plan.filter(p => p.estado === 'Pendiente');
        const isActive = plan.length > 0 && cuotasPendientes.length === 0;
        
        if (isActive && cl.contrato_dia_corte) {
            for (let y = yearStart; y <= yearEnd; y++) {
                for (let m = 0; m < 12; m++) {
                    const d = new Date(y, m, cl.contrato_dia_corte);
                    if (d.getMonth() === m) {
                        all.push({
                            id: `cobro_${cl.id}_${y}_${m}`,
                            type: 'cobro',
                            title: `💰 Cobro: ${cl.negocio_nombre}`,
                            description: `Monto: ${cl.contrato_valor}`,
                            date: `${y}-${String(m + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
                            amount: cl.contrato_valor,
                            origin: '/directorio',
                            cliente: cl.negocio_nombre
                        });
                    }
                }
            }
        }

        // 3. Reuniones
        const notas = cl.notas_kanban || {};
        if (notas.fechaCita) {
            const loc = cl.direccion_cita || notas.direccion_cita;
            const desc = (notas.tipoCita || 'Cita') + (loc ? ` - 📍 ${loc}` : '');
            all.push({
                id: `cita_${cl.id}`,
                type: 'reunion',
                title: `📞 Reunión: ${cl.negocio_nombre}`,
                description: desc,
                date: notas.fechaCita,
                origin: '/kanban-clientes',
                cliente: cl.negocio_nombre
            });
        }
    });

    // 4. Gastos Fijos
    rawGastos.forEach(gf => {
        if (gf.dia_cobro) {
            for (let y = yearStart; y <= yearEnd; y++) {
                for (let m = 0; m < 12; m++) {
                    const d = new Date(y, m, gf.dia_cobro);
                    if (d.getMonth() === m) {
                        all.push({
                            id: `gf_${gf.id}_${y}_${m}`,
                            type: 'gasto',
                            title: `📉 Pago SaaS: ${gf.concepto}`,
                            description: gf.categoria,
                            date: `${y}-${String(m + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
                            amount: gf.monto,
                            origin: '/finanzas'
                        });
                    }
                }
            }
        }
    });

    // 5. Tareas Kanban
    rawTareas.forEach(tr => {
        if (tr.fecha_limite) {
            all.push({
                id: `tarea_${tr.id}`,
                type: 'tarea',
                title: `📋 Tarea: ${tr.titulo}`,
                description: tr.descripcion || '',
                date: tr.fecha_limite,
                origin: '/kanban-tareas',
                responsable: tr.responsable
            });
        }
    });

    return all;
  }, [rawEventos, rawClientes, rawGastos, rawTareas, añoActual]);

  const filteredEvents = useMemo(() => {
    return events.filter(e => filtroTipo === 'Todos' || e.type === filtroTipo)
                 .sort((a,b) => new Date(a.date) - new Date(b.date));
  }, [events, filtroTipo]);

  const eventsByDay = useMemo(() => {
    const map = {};
    filteredEvents.forEach(e => {
      const d = new Date(e.date);
      d.setMinutes(d.getMinutes() + d.getTimezoneOffset());
      if (d.getMonth() === mesActual && d.getFullYear() === añoActual) {
        const day = d.getDate();
        if (!map[day]) map[day] = [];
        map[day].push(e);
      }
    });
    return map;
  }, [filteredEvents, mesActual, añoActual]);

  
  const handleEliminarEvento = async () => {
    if (!window.confirm('¿Estás seguro de que deseas cancelar/eliminar este evento?')) return;
    try {
      const type = selectedEvent.type;
      
      if (type === 'tarea') {
        const id = selectedEvent.id.replace('tarea_', '');
        await supabase.from('tareas').delete().eq('id', id);
      } else if (type === 'reunion') {
        const id = selectedEvent.id.replace('cita_', '');
        const {data: cData} = await supabase.from('clientes').select('notas_kanban').eq('id', id).single();
        if (cData) {
          await supabase.from('clientes').update({notas_kanban: {...cData.notas_kanban, fechaCita: null}}).eq('id', id);
        }
      } else if (type === 'manual') {
        await supabase.from('eventos').delete().eq('id', selectedEvent.id);
      } else {
        alert('Este evento es cíclico y debe eliminarse desde su módulo origen.');
        return;
      }

      await fetchEvents();
      
      const eventDateLabel = selectedEvent.date.includes('T')
        ? new Date(selectedEvent.date).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })
        : new Date(selectedEvent.date).toLocaleDateString('es-CO', { dateStyle: 'medium' });

      sendTelegramNotification(
        `❌ <b>EVENTO CANCELADO / ELIMINADO</b>\n\n<b>Título:</b> ${selectedEvent.title}\n<b>Fecha Original:</b> ${eventDateLabel}`,
        'group'
      );
      
      setSelectedEvent(null);
      setEditEventForm(null);
    } catch (err) {
      alert('Error eliminando evento: ' + err.message);
    }
  };

  const handleReagendar = async (e) => {
    e.preventDefault();
    
    const finalDate = editEventForm?.date ?? selectedEvent.date.split('T')[0];
    const finalTime = editEventForm?.time ?? (selectedEvent.date.includes('T') ? selectedEvent.date.split('T')[1].substring(0,5) : '');
    const finalTitle = editEventForm?.title ?? selectedEvent.title;
    const finalDesc = editEventForm?.description ?? (selectedEvent.description || '');
    const finalEndTime = editEventForm?.endTime ?? '';
    
    const dateTimeStr = finalTime ? `${finalDate}T${finalTime}` : finalDate;
    
    let errorUpdate = null;
    const type = selectedEvent.type;
    
    try {
      if (type === 'tarea') {
        const id = selectedEvent.id.replace('tarea_', '');
        const {error} = await supabase.from('tareas').update({titulo: finalTitle, descripcion: finalDesc, fecha_limite: dateTimeStr}).eq('id', id);
        errorUpdate = error;
      } else if (type === 'reunion') {
        const id = selectedEvent.id.replace('cita_', '');
        const {data: cData} = await supabase.from('clientes').select('notas_kanban').eq('id', id).single();
        if (cData) {
          const {error} = await supabase.from('clientes').update({notas_kanban: { ...cData.notas_kanban, fechaCita: dateTimeStr, tipoCita: finalDesc }}).eq('id', id);
          errorUpdate = error;
        }
      } else if (type === 'manual') {
        const {error} = await supabase.from('eventos').update({title: finalTitle, description: finalDesc, date: dateTimeStr}).eq('id', selectedEvent.id);
        errorUpdate = error;
      } else {
        alert('Este tipo de evento (cobro/gasto) es cíclico y debe editarse desde el módulo Origen.');
        return;
      }

      if (errorUpdate) throw errorUpdate;

      await fetchEvents();

      const startISO = new Date(finalTime ? `${finalDate}T${finalTime}` : `${finalDate}T09:00:00`).toISOString();
      const endISO = new Date(finalEndTime ? `${finalDate}T${finalEndTime}` : new Date(new Date(startISO).getTime() + 60*60*1000).toISOString()).toISOString();
      
      createCalendarEvent({
        title: finalTitle,
        description: finalDesc,
        startDateTime: startISO,
        endDateTime: endISO
      });

      sendTelegramNotification(
        `📅 <b>EVENTO REAGENDADO / EDITADO</b>\n\n<b>Título:</b> ${finalTitle}\n<b>Nueva Fecha:</b> ${new Date(startISO).toLocaleString('es-CO')}`,
        'group'
      );

      setEditEventForm(null);
      setSelectedEvent(null);
    } catch (err) {
      alert('Error al reagendar: ' + err.message);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    const newDate = form.time ? `${form.date}T${form.time}` : form.date;
    const newEvent = {
      type: form.type,
      title: form.title,
      description: form.description,
      date: newDate,
      origin: '/calendario',
      responsable: form.responsable,
      cliente: form.cliente
    };
    
    try {
      const { data, error } = await supabase.from('eventos').insert([newEvent]).select();
      if (!error && data && data.length > 0) {
        setRawEventos([...rawEventos, data[0]]);
      }
    } catch(err) {}

    // TELEGRAM: notificar nuevo evento desde Calendario
    const eventDateLabel = form.time
      ? new Date(`${form.date}T${form.time}`).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })
      : new Date(form.date).toLocaleDateString('es-CO', { dateStyle: 'medium' });

    sendTelegramNotification(
      `📆 <b>NUEVO EVENTO EN CALENDARIO</b>\n\n<b>Título:</b> ${form.title}\n<b>Tipo:</b> ${form.type}\n<b>Fecha:</b> ${eventDateLabel}\n<b>Cliente:</b> ${form.cliente}\n<b>Responsable:</b> ${form.responsable}${form.description ? '\n<b>Notas:</b> ' + form.description : ''}`,
      'group'
    );

    // GOOGLE CALENDAR: sincronizar evento
    if (form.date) {
      const startISO = new Date(form.time ? `${form.date}T${form.time}` : `${form.date}T09:00:00`).toISOString();
      const endISO = new Date(new Date(startISO).getTime() + 60 * 60 * 1000).toISOString();
      createCalendarEvent({
        title: form.title,
        description: `Tipo: ${form.type} | Cliente: ${form.cliente} | Responsable: ${form.responsable}\n${form.description || ''}`,
        startDateTime: startISO,
        endDateTime: endISO,
      });
    }
    
    setIsCreateOpen(false);
    setForm({ title: '', description: '', type: 'tarea', date: '', time: '', responsable: 'Santiago', cliente: 'Interno (Sin Cliente)' });
  };

  const getEventStyles = (type) => {
    switch(type) {
      case 'cobro': return { bg: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800', icon: DollarSign };
      case 'gasto': return { bg: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800', icon: AlertCircle };
      case 'reunion': return { bg: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800', icon: Video };
      case 'tarea': return { bg: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800', icon: CheckSquare };
      case 'manual': return { bg: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800', icon: CalendarIcon };
      default: return { bg: 'bg-gray-100 dark:bg-gray-800 text-gray-700', icon: CalendarIcon };
    }
  };

  const formatCurrency = (val) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(val);

  // === RENDERIZADORES ===
  const renderMonthView = () => {
    const daysInMonth = getDaysInMonth(mesActual, añoActual);
    const firstDay = getFirstDayOfMonth(mesActual, añoActual);
    const adjustedFirstDay = firstDay === 0 ? 6 : firstDay - 1;
    const blanks = Array.from({ length: adjustedFirstDay });
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    return (
      <div className="bg-white dark:bg-gloss-black rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden flex-1 flex flex-col min-h-[500px]">
        {/* Cabecera Días */}
        <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
          {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(d => (
            <div key={d} className="p-3 text-center text-xs font-bold text-gray-500 uppercase">{d}</div>
          ))}
        </div>
        {/* Cuadrícula interactiva */}
        <div className="grid grid-cols-7 flex-1 auto-rows-fr">
          {blanks.map((_, i) => <div key={`blank-${i}`} className="border-r border-b border-gray-100 dark:border-gray-800/50 bg-gray-50/50 dark:bg-transparent min-h-[100px]"></div>)}
          {days.map(day => {
            const dayEvents = eventsByDay[day] || [];
            const isToday = day === today.getDate() && mesActual === today.getMonth() && añoActual === today.getFullYear();
            
            return (
              <div key={day} className={`border-r border-b border-gray-100 dark:border-gray-800/50 min-h-[100px] p-1.5 transition-colors hover:bg-gray-50 dark:hover:bg-gray-900/20 flex flex-col ${isToday ? 'bg-red-50/30 dark:bg-gloss-burgundy/10' : ''}`}>
                <div className="flex justify-between items-center mb-1 px-1">
                  <span className={`text-sm font-medium ${isToday ? 'bg-gloss-burgundy text-white w-7 h-7 rounded-full flex items-center justify-center shadow-md' : 'text-gray-700 dark:text-gray-300'}`}>{day}</span>
                </div>
                <div className="space-y-1.5 flex-1 overflow-y-auto custom-scrollbar pr-1">
                  {dayEvents.map(e => {
                    const style = getEventStyles(e.type);
                    return (
                      <div key={e.id} onClick={() => setSelectedEvent(e)} className={`text-[10px] p-1.5 rounded-lg border cursor-pointer truncate font-medium flex items-center gap-1.5 hover:brightness-95 hover:shadow-sm transition-all ${style.bg}`}>
                        <style.icon size={12} className="flex-shrink-0 opacity-70"/> {e.title}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderAgendaView = () => {
    return (
      <div className="bg-white dark:bg-gloss-black rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-4 flex-1 overflow-y-auto custom-scrollbar space-y-4">
        {filteredEvents.length === 0 ? (
          <div className="text-center text-gray-500 py-10">No hay eventos para mostrar.</div>
        ) : (
          filteredEvents.map(e => {
            const style = getEventStyles(e.type);
            const dateObj = new Date(e.date);
            dateObj.setMinutes(dateObj.getMinutes() + dateObj.getTimezoneOffset());
            const isTimeIncluded = e.date.includes('T');
            
            return (
              <div key={e.id} onClick={() => setSelectedEvent(e)} className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-xl border border-gray-100 dark:border-gray-800 hover:border-gloss-burgundy/40 dark:hover:border-gloss-burgundy/40 cursor-pointer transition-all bg-gray-50/50 dark:bg-gray-900/20 group">
                {/* Fecha Izquierda */}
                <div className="flex flex-row sm:flex-col items-center justify-center sm:w-20 flex-shrink-0 sm:border-r border-gray-200 dark:border-gray-800 sm:pr-4 gap-2 sm:gap-0 bg-white sm:bg-transparent dark:bg-gray-800 sm:dark:bg-transparent p-2 sm:p-0 rounded-lg sm:rounded-none">
                  <span className="text-xs text-gray-500 font-bold uppercase">{MONTH_NAMES[dateObj.getMonth()].substring(0,3)}</span>
                  <span className="text-xl sm:text-3xl font-zodiak font-bold text-gray-900 dark:text-white">{dateObj.getDate()}</span>
                </div>
                
                {/* Contenido */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase flex items-center gap-1 ${style.bg}`}>
                      <style.icon size={10}/> {e.type}
                    </span>
                    {isTimeIncluded && (
                      <span className="text-[11px] font-medium text-gray-500 bg-white dark:bg-gray-800 px-2 py-0.5 rounded border dark:border-gray-700 flex items-center gap-1">
                        <Clock size={12}/> {dateObj.toLocaleTimeString([], {timeStyle: 'short'})}
                      </span>
                    )}
                  </div>
                  <h4 className="font-bold text-gray-900 dark:text-white text-base sm:text-lg truncate">{e.title}</h4>
                  <div className="flex flex-wrap items-center gap-4 mt-2">
                    <span className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded"><User size={12} className="text-gray-400"/> {e.responsable}</span>
                    <span className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded"><Building2 size={12} className="text-gray-400"/> {e.cliente}</span>
                    {e.amount && <span className="text-xs font-bold text-green-700 dark:text-green-400 flex items-center gap-1 bg-green-50 dark:bg-green-900/30 px-2 py-1 rounded">{formatCurrency(e.amount)}</span>}
                  </div>
                </div>

                <ChevronRight size={24} className="text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 hidden sm:block"/>
              </div>
            );
          })
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col animate-fade-in pb-8">
      
      {/* HEADER CALENDARIO */}
      <div className="mb-6 flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-zodiak font-bold text-gloss-burgundy dark:text-gloss-inverted">Calendario Maestro</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Visión omni-canal de reuniones, tareas, cobros y remarketing.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Navegación Meses */}
          <div className="flex items-center bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-1 shadow-sm">
            <button onClick={() => changeDateRange(-1)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"><ChevronLeft size={18}/></button>
            <span className="w-32 text-center text-sm font-bold capitalize">{MONTH_NAMES[mesActual]} {añoActual}</span>
            <button onClick={() => changeDateRange(1)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"><ChevronRight size={18}/></button>
          </div>
          
          {/* Vistas */}
          <div className="flex bg-gray-100 dark:bg-gray-900 p-1 rounded-xl shadow-inner border border-gray-200 dark:border-gray-800 overflow-x-auto">
            {VISTAS.map(v => (
              <button 
                key={v} onClick={() => setVista(v)}
                className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${vista === v ? 'bg-white dark:bg-gray-800 shadow-sm text-gloss-burgundy dark:text-gloss-inverted' : 'text-gray-500 hover:text-gray-700'}`}
              >
                {v}
              </button>
            ))}
          </div>

          <select 
            value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}
            className="pl-3 pr-8 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-1 focus:ring-gloss-burgundy shadow-sm uppercase font-bold cursor-pointer"
          >
            {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <button onClick={() => setIsCreateOpen(true)} className="flex items-center gap-2 bg-gloss-burgundy text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-gloss-burgundy/90 transition-colors shadow-md">
            <Plus size={16}/> Evento
          </button>
        </div>
      </div>

      {/* RENDERIZADO DE VISTA */}
      {['Mes', 'Semana', 'Día'].includes(vista) ? renderMonthView() : renderAgendaView()}

      {/* ========================================= */}
      {/* MODAL CREAR EVENTO / TAREA                */}
      {/* ========================================= */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-gloss-black rounded-2xl w-full max-w-lg p-6 shadow-xl border border-gray-200 dark:border-gray-800 relative my-8">
            <button onClick={() => setIsCreateOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors bg-gray-100 dark:bg-gray-800 p-1.5 rounded-full"><X size={18}/></button>
            
            <h3 className="text-2xl font-zodiak font-bold mb-6 text-gloss-burgundy dark:text-gloss-inverted border-b border-gray-100 dark:border-gray-800 pb-4">Nuevo Evento</h3>
            
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Título del evento</label>
                <input required value={form.title} onChange={e=>setForm({...form, title: e.target.value})} placeholder="Ej: Llamada de Onboarding..." className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:ring-1 focus:ring-gloss-burgundy transition-all"/>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Tipo de Evento</label>
                  <select value={form.type} onChange={e=>setForm({...form, type: e.target.value})} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:ring-1 focus:ring-gloss-burgundy uppercase font-medium cursor-pointer">
                    {CATEGORIAS.filter(c=>c!=='Todos').map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Cliente Asociado</label>
                  <select value={form.cliente} onChange={e=>setForm({...form, cliente: e.target.value})} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:ring-1 focus:ring-gloss-burgundy cursor-pointer">
                    {['Interno (Sin Cliente)', ...rawClientes.map(c => c.negocio_nombre)].filter(Boolean).map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Fecha</label>
                  <input required type="date" value={form.date} onChange={e=>setForm({...form, date: e.target.value})} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:ring-1 focus:ring-gloss-burgundy"/>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Hora (Opcional)</label>
                  <select value={form.time} onChange={e=>setForm({...form, time: e.target.value})} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:ring-1 focus:ring-gloss-burgundy cursor-pointer font-medium">
                    {TIME_SLOTS.map(t => <option key={t.val} value={t.val}>{t.label}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Miembro Responsable</label>
                <select required value={form.responsable} onChange={e=>setForm({...form, responsable: e.target.value})} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:ring-1 focus:ring-gloss-burgundy cursor-pointer">
                  {miembrosEquipo.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Descripción y Notas</label>
                <textarea value={form.description} onChange={e=>setForm({...form, description: e.target.value})} placeholder="Añade contexto, enlaces de meet, o instrucciones..." className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:ring-1 focus:ring-gloss-burgundy min-h-[80px] resize-y"></textarea>
              </div>

              <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
                <button type="submit" className="w-full bg-gloss-burgundy text-white py-3 rounded-xl font-medium hover:bg-gloss-burgundy/90 transition-colors shadow-md">
                  Agendar Evento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================= */}
      {/* MODAL DETALLE DE EVENTO (Deep Linking)      */}
      {/* ========================================= */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-md p-6 shadow-2xl border border-gray-200 dark:border-gray-800 relative animate-scale-in my-8">
            <button onClick={() => { setSelectedEvent(null); setEditEventForm(null); }} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 bg-gray-100 dark:bg-gray-800 p-2 rounded-full transition-colors"><X size={16}/></button>
            
            <div className={`w-12 h-12 rounded-2xl mb-4 flex items-center justify-center shadow-inner ${getEventStyles(selectedEvent.type).bg}`}>
              {(() => { const Ico = getEventStyles(selectedEvent.type).icon; return <Ico size={24}/>; })()}
            </div>
            
            <form onSubmit={handleReagendar} className="flex flex-col gap-4 w-full">
              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Título / Asunto</label>
                <input required value={editEventForm?.title ?? selectedEvent.title} onChange={e => setEditEventForm({...editEventForm, title: e.target.value})} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 font-bold" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Fecha</label>
                  <input required type="date" value={editEventForm?.date ?? (selectedEvent.date.split('T')[0])} onChange={e => setEditEventForm({...editEventForm, date: e.target.value})} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 font-medium" />
                </div>
                <div>
                   <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Hora Inicio</label>
                   <input type="time" value={editEventForm?.time ?? (selectedEvent.date.includes('T') ? selectedEvent.date.split('T')[1].substring(0,5) : '')} onChange={e => setEditEventForm({...editEventForm, time: e.target.value})} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 font-medium" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Hora Fin (Opcional)</label>
                <input type="time" value={editEventForm?.endTime ?? ''} onChange={e => setEditEventForm({...editEventForm, endTime: e.target.value})} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 font-medium" />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Ubicación / Notas</label>
                <textarea rows="3" value={editEventForm?.description ?? (selectedEvent.description || '')} onChange={e => setEditEventForm({...editEventForm, description: e.target.value})} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 font-medium whitespace-pre-wrap"></textarea>
              </div>

              <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                <button type="submit" className="w-full bg-gloss-burgundy hover:bg-red-800 text-white font-bold py-3 rounded-xl transition-colors shadow-md">
                  Guardar Cambios / Reagendar
                </button>
                <button type="button" onClick={handleEliminarEvento} className="w-full bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 font-bold py-3 rounded-xl hover:bg-red-200 dark:hover:bg-red-900/40 transition-colors">
                  Cancelar / Eliminar Evento
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
