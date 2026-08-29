import { useState, useMemo, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp, TrendingDown, Users, AlertCircle, CheckSquare, Calendar, DollarSign,
  Phone, Video, MapPin, ArrowUpRight, Plus, Clock, User, Zap,
  Activity, ChevronRight, Star, Circle, BarChart2, FileText, X, Briefcase
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// DATOS MOCK SINCRONIZADOS CON EL RESTO DE MÓDULOS
// ─────────────────────────────────────────────────────────────────────────────

const hoy = new Date();
const fmtDate = (iso) => new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
const fmtCurrency = (v) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(v);


export default function Dashboard() {
  const [CLIENTES, setClientes] = useState([]);
  const [TAREAS, setTareas] = useState([]);
  const [CITAS, setCitas] = useState([]);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [cliRes, tarRes, evtRes] = await Promise.all([
          supabase.from('clientes').select('*'),
          supabase.from('tareas').select('*'),
          supabase.from('eventos').select('*')
        ]);
        
        if (cliRes.data) {
          setClientes(cliRes.data.map(r => ({
            id: r.id, 
            nombre: r.negocio_nombre, 
            valor: Number(r.contrato_valor) || 0,
            estado: r.estado_contrato || 'Prospecto',
            diasVencimiento: 10
          })));
        }
        
        if (tarRes.data) {
          setTareas(tarRes.data.map(r => ({
            id: r.id,
            titulo: r.titulo,
            prioridad: r.prioridad,
            responsable: r.responsable,
            vence: r.fecha_limite,
            cliente: r.cliente
          })));
        }
        
        if (evtRes.data) {
          setCitas(evtRes.data.map(r => ({
            id: r.id,
            tipo: r.type,
            titulo: r.title,
            cliente: r.cliente,
            hora: r.date.includes('T') ? r.date.split('T')[1] : '',
            fecha: r.date.split('T')[0],
            link: ''
          })));
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      }
    };
    fetchData();
  }, []);

  const COBROS = CLIENTES.filter(c => ['Activo','Retención','Onboarding'].includes(c.estado)).map(c => ({ id: c.id, cliente: c.nombre, monto: c.valor, dias: c.diasVencimiento || 15 }));
  
  const activos = CLIENTES.filter(c => c.estado === 'Activo');
  const onboarding = CLIENTES.filter(c => c.estado === 'Onboarding');
  const prospectos = CLIENTES.filter(c => ['Prospecto', 'Interesado', 'Llamada / Reunión Agendada'].includes(c.estado));
  
  const mrr = activos.reduce((s, c) => s + c.valor, 0);
  const cartera = COBROS.filter(c => c.dias <= 15).reduce((s, c) => s + c.monto, 0);
  const tareasAlta = TAREAS.filter(t => t.prioridad === 'Alta').length;
  const citasHoy = CITAS.filter(c => c.fecha === new Date().toISOString().split('T')[0]).length;

  const navigate = useNavigate();
  const [quickAction, setQuickAction] = useState(null);

  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Buenos días' : now.getHours() < 18 ? 'Buenas tardes' : 'Buenas noches';
  const todayCitas  = CITAS.filter(c => c.fecha === now.toISOString().split('T')[0]);
  const tomorrowCitas = CITAS.filter(c => {
    const mañana = new Date(); mañana.setDate(mañana.getDate() + 1);
    return c.fecha === mañana.toISOString().split('T')[0];
  });

  const interesados = CLIENTES.filter(c => ['Interesado', 'Llamada / Reunión Agendada'].includes(c.estado));

  return (
    <div className="h-full flex flex-col animate-fade-in pb-12">

      {/* ── SALUDO ───────────────────────────────────────────────────── */}
      <div className="mb-8 flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{greeting}, equipo Gloss Growth 👋</p>
          <h1 className="text-3xl font-zodiak font-bold text-gloss-burgundy dark:text-gloss-inverted mt-0.5">Panel de Control</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {now.toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            {' · '}<span className="font-semibold text-gloss-burgundy dark:text-gloss-pink">{citasHoy} {citasHoy === 1 ? 'cita' : 'citas'} hoy</span>
            {' · '}<span className="font-semibold text-red-600">{tareasAlta} tarea{tareasAlta !== 1 && 's'} urgente{tareasAlta !== 1 && 's'}</span>
          </p>
        </div>

        {/* Barra Quick Actions */}
        <div className="flex flex-wrap gap-2">
          {[
            { key: 'cliente',    label: '+ Cliente',     icon: Users        },
            { key: 'ingreso',    label: '+ Ingreso',     icon: DollarSign   },
            { key: 'tarea',      label: '+ Tarea',       icon: CheckSquare  },
            { key: 'cita',       label: '+ Cita',        icon: Calendar     },
            { key: 'cotizacion', label: '+ Cotización',  icon: FileText     },
          ].map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setQuickAction(key)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 hover:border-gloss-burgundy hover:text-gloss-burgundy dark:hover:border-gloss-pink dark:hover:text-gloss-pink transition-all shadow-sm">
              <Icon size={14}/>{label}
            </button>
          ))}
        </div>
      </div>

      {/* ── KPI ROW ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KPICard
          icon={TrendingUp} label="MRR Activo" trend={12}
          value={fmtCurrency(mrr)}
          sub={`${activos.length} contratos activos`}
          color="bg-green-100 text-green-600"
        />
        <KPICard
          icon={DollarSign} label="Cartera próxima (<15 días)"
          value={fmtCurrency(cartera)}
          sub={`${COBROS.filter(c=>c.dias<=15).length} cobros por vencer`}
          color="bg-orange-100 text-orange-600"
        />
        <KPICard
          icon={Activity} label="Pipeline Comercial"
          value={`${activos.length} activos`}
          sub={`${onboarding.length} en onboarding · ${prospectos.length} prospectos`}
          color="bg-blue-100 text-blue-600"
        />
        <KPICard
          icon={AlertCircle} label="Carga Operativa (Alta)" trend={-8}
          value={`${tareasAlta} urgentes`}
          sub={`${TAREAS.length} tareas en total`}
          color="bg-red-100 text-red-600"
        />
      </div>

      {/* ── WIDGETS GRID ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">

        {/* WIDGET 1: Agenda del Día */}
        <div className="bg-white dark:bg-gloss-black rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col">
          <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
            <h3 className="font-zodiak font-bold text-base text-gray-900 dark:text-white flex items-center gap-2">
              <Calendar size={18} className="text-gloss-burgundy"/> Agenda de Citas
            </h3>
            <button onClick={() => navigate('/calendario')} className="text-xs font-bold text-gloss-burgundy dark:text-gloss-pink hover:underline flex items-center gap-0.5">Ver más <ChevronRight size={14}/></button>
          </div>
          <div className="p-4 flex-1 overflow-y-auto custom-scrollbar space-y-1">
            {todayCitas.length > 0 && (
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2 mb-2">Hoy</p>
            )}
            {todayCitas.map(cita => (
              <div key={cita.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors group cursor-pointer">
                <CitaIcon tipo={cita.tipo}/>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-gray-900 dark:text-white truncate">{cita.titulo}</p>
                  <p className="text-xs text-gray-500 truncate">{cita.cliente}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs font-bold text-gray-700 dark:text-gray-300">{cita.hora}</p>
                  {cita.link && (
                    <a href={cita.link} target="_blank" rel="noreferrer" className="text-[10px] text-blue-500 hover:underline font-bold">Meet →</a>
                  )}
                </div>
              </div>
            ))}
            {tomorrowCitas.length > 0 && (
              <>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2 mt-4 mb-2">Mañana</p>
                {tomorrowCitas.map(cita => (
                  <div key={cita.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors opacity-80 cursor-pointer">
                    <CitaIcon tipo={cita.tipo}/>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-gray-900 dark:text-white truncate">{cita.titulo}</p>
                      <p className="text-xs text-gray-500 truncate">{cita.cliente}</p>
                    </div>
                    <p className="text-xs font-bold text-gray-700 dark:text-gray-300 flex-shrink-0">{cita.hora}</p>
                  </div>
                ))}
              </>
            )}
            {todayCitas.length === 0 && tomorrowCitas.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                <Calendar size={32} className="mb-2 opacity-30"/>
                <p className="text-sm">Sin citas próximas</p>
              </div>
            )}
          </div>
        </div>

        {/* WIDGET 2: Próximos Cobros */}
        <div className="bg-white dark:bg-gloss-black rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col">
          <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
            <h3 className="font-zodiak font-bold text-base text-gray-900 dark:text-white flex items-center gap-2">
              <DollarSign size={18} className="text-green-600"/> Próximos Cobros
            </h3>
            <button onClick={() => navigate('/finanzas')} className="text-xs font-bold text-gloss-burgundy dark:text-gloss-pink hover:underline flex items-center gap-0.5">Finanzas <ChevronRight size={14}/></button>
          </div>
          <div className="p-4 flex-1 overflow-y-auto custom-scrollbar">
            <div className="space-y-2">
              {COBROS.map(cobro => (
                <div key={cobro.id} onClick={() => navigate('/directorio')} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-900/50 cursor-pointer transition-colors group">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-gray-900 dark:text-white truncate">{cobro.cliente}</p>
                    <p className="text-xs text-gray-500">{fmtDate(cobro.fecha)} · en {cobro.dias} días</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-sm font-black text-green-700 dark:text-green-400">{fmtCurrency(cobro.monto)}</span>
                    <EstadoBadge dias={cobro.dias}/>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* WIDGET 3: Sprint de Tareas */}
        <div className="bg-white dark:bg-gloss-black rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col">
          <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
            <h3 className="font-zodiak font-bold text-base text-gray-900 dark:text-white flex items-center gap-2">
              <CheckSquare size={18} className="text-purple-600"/> Sprint del Equipo
            </h3>
            <button onClick={() => navigate('/kanban-tareas')} className="text-xs font-bold text-gloss-burgundy dark:text-gloss-pink hover:underline flex items-center gap-0.5">Ver tablero <ChevronRight size={14}/></button>
          </div>
          <div className="p-4 flex-1 overflow-y-auto custom-scrollbar space-y-2">
            {TAREAS.map(t => (
              <div key={t.id} onClick={() => navigate('/kanban-tareas')} className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-900/50 cursor-pointer transition-colors group">
                <PrioridadDot p={t.prioridad}/>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-gray-900 dark:text-white leading-tight">{t.titulo}</p>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">{t.cliente}</p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-[10px] font-bold flex items-center gap-1 text-gray-500"><User size={11}/>{t.responsable}</span>
                    <span className="text-[10px] font-bold flex items-center gap-1 text-gray-500"><Clock size={11}/>{fmtDate(t.vence)}</span>
                  </div>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${t.prioridad === 'Alta' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : t.prioridad === 'Media' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                  {t.prioridad}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* WIDGET 4: Pipeline — Prospectos Calientes */}
        <div className="lg:col-span-2 bg-white dark:bg-gloss-black rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col">
          <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
            <h3 className="font-zodiak font-bold text-base text-gray-900 dark:text-white flex items-center gap-2">
              <Zap size={18} className="text-yellow-500"/> Prospectos Calientes en Pipeline
            </h3>
            <button onClick={() => navigate('/kanban-clientes')} className="text-xs font-bold text-gloss-burgundy dark:text-gloss-pink hover:underline flex items-center gap-0.5">CRM <ChevronRight size={14}/></button>
          </div>
          <div className="p-4 flex-1 overflow-y-auto custom-scrollbar">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {interesados.map(c => (
                <div key={c.id} onClick={() => navigate('/kanban-clientes')}
                  className="p-4 rounded-xl border border-gray-100 dark:border-gray-800 hover:border-gloss-burgundy/40 hover:shadow-sm cursor-pointer transition-all group bg-gray-50/50 dark:bg-gray-900/20">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-xl bg-gloss-burgundy/10 dark:bg-gloss-burgundy/20 flex items-center justify-center flex-shrink-0">
                      <Briefcase size={17} className="text-gloss-burgundy dark:text-gloss-pink"/>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-sm text-gray-900 dark:text-white truncate">{c.nombre}</p>
                      <p className="text-xs text-gray-500 truncate">{c.contacto}</p>
                    </div>
                    <ArrowUpRight size={16} className="text-gray-300 group-hover:text-gloss-burgundy transition-colors flex-shrink-0"/>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                      {c.estado}
                    </span>
                    <span className="text-sm font-black text-green-700 dark:text-green-400">{fmtCurrency(c.valor)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* WIDGET 5: Salud del Sistema */}
        <div className="bg-white dark:bg-gloss-black rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col">
          <div className="p-5 border-b border-gray-100 dark:border-gray-800">
            <h3 className="font-zodiak font-bold text-base text-gray-900 dark:text-white flex items-center gap-2">
              <BarChart2 size={18} className="text-blue-500"/> Distribución del Pipeline
            </h3>
          </div>
          <div className="p-5 flex-1 space-y-4">
            {[
              { label: 'Activos',                count: activos.length,    total: CLIENTES.length, color: 'bg-green-500',      icon: '🟢' },
              { label: 'Onboarding',             count: onboarding.length, total: CLIENTES.length, color: 'bg-blue-400',       icon: '🔵' },
              { label: 'Prospectos/Interesados', count: prospectos.length, total: CLIENTES.length, color: 'bg-yellow-400',     icon: '🟡' },
              { label: 'Retención',              count: CLIENTES.filter(c=>c.estado==='Retención').length, total: CLIENTES.length, color: 'bg-purple-400', icon: '🟣' },
            ].map(({ label, count, total, color, icon }) => (
              <div key={label}>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <span className="text-base">{icon}</span> {label}
                  </span>
                  <span className="text-sm font-bold text-gray-900 dark:text-white">{count} <span className="font-normal text-gray-400">/ {total}</span></span>
                </div>
                <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${(count / total) * 100}%` }}/>
                </div>
              </div>
            ))}

            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
              <div className="flex justify-between text-sm">
                <span className="font-medium text-gray-500">Revenue potencial pipeline:</span>
                <span className="font-black text-gloss-burgundy dark:text-gloss-pink">{fmtCurrency(prospectos.reduce((s,c)=>s+c.valor,0))}</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* ── QUICK ACTION MODAL ─────────────────────────────────────── */}
      {quickAction && <QuickModal type={quickAction} onClose={() => setQuickAction(null)}/>}

    </div>
  );
}



const KPICard = ({ icon: Icon, label, value, sub, color, trend }) => (
  <div className={`bg-white dark:bg-gloss-black rounded-2xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm hover:shadow-md transition-all group overflow-hidden relative`}>
    <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity ${color} opacity-5 rounded-2xl`}/>
    <div className="flex justify-between items-start mb-4 relative">
      <div className={`p-3 rounded-xl ${color} bg-opacity-10 dark:bg-opacity-20`}>
        <Icon size={20} className={color.split(' ')[1]}/>
      </div>
      {trend && (
        <span className={`text-xs font-bold px-2 py-1 rounded-full ${trend > 0 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'} flex items-center gap-0.5`}>
          {trend > 0 ? <ArrowUpRight size={12}/> : <TrendingDown size={12}/>}
          {Math.abs(trend)}%
        </span>
      )}
    </div>
    <div className="relative">
      <h4 className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">{label}</h4>
      <p className="text-2xl font-black text-gray-900 dark:text-white font-zodiak">{value}</p>
      {sub && <p className="text-[10px] text-gray-400 mt-2 font-medium">{sub}</p>}
    </div>
  </div>
);

const PrioridadDot = ({ p }) => (
  <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${p==='Alta'?'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]':p==='Media'?'bg-yellow-500':'bg-blue-500'}`}/>
);

const CitaIcon = ({ tipo }) => (
  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${tipo==='virtual'?'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400':tipo==='presencial'?'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400':'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400'}`}>
    {tipo === 'virtual' ? <Video size={18}/> : tipo === 'presencial' ? <MapPin size={18}/> : <Phone size={18}/>}
  </div>
);

const QuickModal = ({ type, onClose }) => {
  const navigate = useNavigate();
  const handleNav = (path) => { onClose(); navigate(path); };
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white dark:bg-gray-900 w-full max-w-sm rounded-3xl p-6 shadow-2xl relative animate-scale-in border border-gray-100 dark:border-gray-800">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 bg-gray-100 dark:bg-gray-800 p-2 rounded-full transition-colors"><X size={16}/></button>
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gloss-burgundy/10 dark:bg-gloss-burgundy/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Zap size={28} className="text-gloss-burgundy dark:text-gloss-pink"/>
          </div>
          <h3 className="text-xl font-zodiak font-bold text-gray-900 dark:text-white mb-1">Acción Rápida</h3>
          <p className="text-sm text-gray-500">¿Qué deseas crear hoy?</p>
        </div>
        <div className="space-y-3">
          {type === 'cliente'  && <button onClick={() => handleNav('/directorio')} className="w-full bg-gloss-burgundy text-white py-3 rounded-xl font-bold hover:bg-gloss-burgundy/90 flex items-center justify-center gap-2"><Users size={18}/> Ir al Directorio</button>}
          {type === 'ingreso'  && <button onClick={() => handleNav('/finanzas')} className="w-full bg-gloss-burgundy text-white py-3 rounded-xl font-bold hover:bg-gloss-burgundy/90 flex items-center justify-center gap-2"><DollarSign size={18}/> Ir a Finanzas</button>}
          {type === 'tarea'    && <button onClick={() => handleNav('/kanban-tareas')} className="w-full bg-gloss-burgundy text-white py-3 rounded-xl font-bold hover:bg-gloss-burgundy/90 flex items-center justify-center gap-2"><CheckSquare size={18}/> Ir al Kanban de Tareas</button>}
          {type === 'cita'     && <button onClick={() => handleNav('/calendario')} className="w-full bg-gloss-burgundy text-white py-3 rounded-xl font-bold hover:bg-gloss-burgundy/90 flex items-center justify-center gap-2"><Calendar size={18}/> Ir al Calendario</button>}
          {type === 'cotizacion' && <button onClick={() => handleNav('/catalogo')} className="w-full bg-gloss-burgundy text-white py-3 rounded-xl font-bold hover:bg-gloss-burgundy/90 flex items-center justify-center gap-2"><FileText size={18}/> Ir al Catálogo / Cotizador</button>}
        </div>
      </div>
    </div>
  );
};


const EstadoBadge = ({ dias }) => {
  if (dias < 0) return <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Vencido</span>;
  if (dias === 0) return <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">Vence Hoy</span>;
  if (dias <= 5) return <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">En {dias} días</span>;
  return <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">En {dias} días</span>;
};
