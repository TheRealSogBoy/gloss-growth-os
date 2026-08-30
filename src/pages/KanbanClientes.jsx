import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { INITIAL_CATALOGO } from './Catalogo';
import { 
  Building2, User, DollarSign, GripVertical, MapPin, 
  X, Phone, Mail, FileText, ChevronRight, Filter, Video, Calendar, AlertCircle, Clock, Plus
} from 'lucide-react';

// === DATOS SIMULADOS ===
const getTodayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};



const COLUMNAS = ['Prospecto', 'Llamada / Reunión Agendada', 'Interesado', 'Activo', 'Retención', 'Inactivo', 'Descartados'];
const CATEGORIAS = ['Todas', 'Medicina Estética', 'Spa', 'Dermatología', 'Centro de Bienestar', 'Independiente'];

const formatCurrency = (val, divisa = 'COP') => {
  if (!val) return '';
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: divisa, minimumFractionDigits: 0 }).format(val);
};

// Helpers de insignias visuales
const getMeetingBadgeInfo = (tipoCita) => {
  switch (tipoCita) {
    case 'Llamada': return { color: 'bg-blue-100 text-blue-700 border-blue-200', icon: Phone };
    case 'Reunión Presencial': return { color: 'bg-purple-100 text-purple-700 border-purple-200', icon: MapPin };
    case 'Reunión Virtual Meet': return { color: 'bg-green-100 text-green-700 border-green-200', icon: Video };
    default: return null;
  }
};

const getRemarketingStatus = (dateString) => {
  if (!dateString) return null;
  const today = new Date();
  today.setHours(0,0,0,0);
  const remarkDate = new Date(dateString);
  remarkDate.setMinutes(remarkDate.getMinutes() + remarkDate.getTimezoneOffset());
  
  const diffDays = Math.ceil((remarkDate - today) / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) return { text: '¡Seguimiento Vencido!', color: 'bg-red-100 text-red-700 border-red-300', icon: AlertCircle, urgent: true };
  if (diffDays === 0) return { text: '¡Seguimiento Hoy!', color: 'bg-red-100 text-red-700 border-red-300 animate-pulse', icon: AlertCircle, urgent: true };
  if (diffDays <= 2) return { text: `Seguimiento en ${diffDays}d`, color: 'bg-orange-100 text-orange-700 border-orange-200', icon: Clock, urgent: false };
  return { text: `Seguimiento en ${diffDays}d`, color: 'bg-blue-50 text-blue-600 border-blue-200', icon: Calendar, urgent: false };
};


const mapToKanbanForm = (row) => ({
  id: row.id,
  negocio: {
    nombre: row.negocio_nombre,
    categoria: row.negocio_categoria,
    ciudad: row.negocio_ciudad
  },
  contactos: row.contactos || [],
  contrato: {
    valor: row.contrato_valor,
    divisa: row.contrato_divisa,
    estadoContrato: COLUMNAS.includes(row.etapa_comercial) ? row.etapa_comercial : 'Prospecto',
    modeloComercial: row.contrato_esquema
  },
  etapa_comercial: row.etapa_comercial,
  notas: row.notas_kanban || {}
});

const mapToRow = (form) => ({
  etapa_comercial: form.contrato?.estadoContrato, // El Kanban actualiza la etapa
  notas_kanban: form.notas || {}
});

export default function KanbanClientes() {
  const navigate = useNavigate();
  
  const [clientes, setClientes] = useState([]);
    const [catalogo, setCatalogo] = useState([]);
    const [loadingClientes, setLoadingClientes] = useState(true);

  useEffect(() => {
    fetchClientes();
  }, []);

  const fetchClientes = async () => {
      try {
        const [resClientes, resCatalogo] = await Promise.all([
          supabase.from('clientes').select('*').order('created_at', { ascending: false }),
          supabase.from('catalogo_servicios').select('id, nombre, categoria').order('nombre', { ascending: true })
        ]);
        
        if (resCatalogo.data && resCatalogo.data.length > 0) {
          setCatalogo(resCatalogo.data);
        } else {
          setCatalogo(INITIAL_CATALOGO);
        }

        const { data, error } = resClientes;
      if (error) throw error;
      if (data) {
        setClientes(data.map(mapToKanbanForm));
      }
    } catch (e) {
      console.error('Error fetching clientes:', e);
    } finally {
      setLoadingClientes(false);
    }
  };

  
  // Filtros
  const [filtroCategoria, setFiltroCategoria] = useState('Todas');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal
  const [selectedCliente, setSelectedCliente] = useState(null);
    const [showLeadModal, setShowLeadModal] = useState(false);
    const [leadForm, setLeadForm] = useState({ nombre_clinica: '', nombre_contacto: '', telefono: '', interes: [], valor: '', fecha_accion: '', columna: 'Prospecto', facebook: '', instagram: '', tiktok: '', sitio_web: '', google: '' });

    const handleSaveLead = async (e) => {
      e.preventDefault();
      const enlacesGenerados = [];
      if (leadForm.facebook) enlacesGenerados.push({ red: 'Facebook', url: leadForm.facebook });
      if (leadForm.instagram) enlacesGenerados.push({ red: 'Instagram', url: leadForm.instagram });
      if (leadForm.tiktok) enlacesGenerados.push({ red: 'TikTok', url: leadForm.tiktok });
      if (leadForm.sitio_web) enlacesGenerados.push({ red: 'Sitio Web', url: leadForm.sitio_web });
      if (leadForm.google) enlacesGenerados.push({ red: 'Perfil de Google', url: leadForm.google });

      const payload = {
        negocio_nombre: leadForm.nombre_clinica,
        contactos: [{ nombre: leadForm.nombre_contacto, telefono: leadForm.telefono, rol: 'Prospecto' }],
        enlaces: enlacesGenerados,
        contrato_notas: `Interés: ${(leadForm.interes || []).join(', ')}. Próxima acción: ${leadForm.fecha_accion}`,
        contrato_valor: leadForm.valor,
        etapa_comercial: leadForm.columna,
        estado_contrato: 'Prospecto'
      };
      const { data, error } = await supabase.from('clientes').insert([payload]).select();
      if (!error && data && data.length > 0) {
        setClientes([mapToKanbanForm(data[0]), ...clientes]);
        setShowLeadModal(false);
      }
    };

  // === FILTRADO ===
  const clientesFiltrados = useMemo(() => {
    return clientes.filter(c => {
      const matchCat = filtroCategoria === 'Todas' || c.negocio?.categoria === filtroCategoria;
      const matchSearch = (c.negocio?.nombre || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (c.negocio?.ciudad || '').toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [clientes, filtroCategoria, searchQuery]);

  // === DRAG & DROP ===
  const onDragStart = (e, id) => e.dataTransfer.setData('clientId', id);
  const onDragOver = (e) => e.preventDefault();
  const onDrop = async (e, nuevaColumna) => {
      const id = parseInt(e.dataTransfer.getData('clientId'));
      if(!id) return;
      
      setClientes(prev => prev.map(c => 
        c.id === id ? { ...c, contrato: { ...(c.contrato || {}), estadoContrato: nuevaColumna } } : c
      ));

      // Sincronizar con Supabase
      const payload = { etapa_comercial: nuevaColumna };
      if (nuevaColumna === 'Activo') payload.estado_contrato = 'Activo';
      await supabase.from('clientes').update(payload).eq('id', id);
    };

  const changeStatus = async (id, newStatus) => {
      setClientes(prev => prev.map(c => 
        c.id === id ? { ...c, contrato: { ...(c.contrato || {}), estadoContrato: newStatus } } : c
      ));

      const payload = { etapa_comercial: newStatus };
      if (newStatus === 'Activo') payload.estado_contrato = 'Activo';
      await supabase.from('clientes').update(payload).eq('id', id);
    };

  // === ACTUALIZACIÓN DEL MODAL ===
  const updateSelected = (updates) => {
    const updated = { ...selectedCliente, ...updates };
    setSelectedCliente(updated);
    setClientes(prev => prev.map(c => c.id === updated.id ? updated : c));
  };

  return (
    <div className="h-full flex flex-col animate-fade-in pb-8">
      
      <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-zodiak font-bold text-gloss-burgundy dark:text-gloss-inverted">Pipeline Comercial</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Gestión del flujo de ventas y remarketing.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 items-center">
          <button onClick={() => { setLeadForm({ nombre_clinica: '', nombre_contacto: '', telefono: '', interes: [], valor: '', fecha_accion: '', columna: 'Prospecto', facebook: '', instagram: '', tiktok: '', sitio_web: '', google: '' }); setShowLeadModal(true); }} className="bg-gloss-burgundy text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-gloss-burgundy/90 transition-colors flex items-center gap-2 shadow-sm whitespace-nowrap">
              <Plus size={16}/> Nuevo Prospecto
            </button>
          <div className="relative">
            <Filter size={14} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"/>
            <select 
              value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)}
              className="pl-8 pr-4 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-1 focus:ring-gloss-burgundy font-medium shadow-sm"
            >
              {CATEGORIAS.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>
          <input 
            type="text" placeholder="Buscar negocio o ciudad..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            className="px-4 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-1 focus:ring-gloss-burgundy shadow-sm w-full sm:w-64"
          />
        </div>
      </div>

      {/* TABLERO KANBAN */}
      <div className="flex-1 overflow-x-auto custom-scrollbar">
        <div className="flex gap-6 min-w-max pb-4 h-full items-start">
          
          {COLUMNAS.map(columna => {
            const clientesColumna = clientesFiltrados.filter(c => c.contrato?.estadoContrato === columna);
            
            return (
              <div 
                key={columna}
                className="w-[320px] bg-gray-50/80 dark:bg-gray-900/40 rounded-2xl border border-gray-200 dark:border-gray-800 flex flex-col max-h-full"
                onDragOver={onDragOver}
                onDrop={(e) => onDrop(e, columna)}
              >
                {/* Cabecera Columna */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-white/50 dark:bg-black/20 rounded-t-2xl">
                  <h3 className="font-bold text-gray-800 dark:text-gray-200 text-sm">{columna}</h3>
                  <span className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-bold px-2.5 py-1 rounded-full shadow-inner">
                    {clientesColumna.length}
                  </span>
                </div>

                {/* Tarjetas */}
                <div className="p-3 flex-1 overflow-y-auto space-y-3 custom-scrollbar">
                  {clientesColumna.map(c => {
                    const meetingBadge = getMeetingBadgeInfo(c.notas?.tipoCita);
                    const remarketingStatus = getRemarketingStatus(c.notas?.fechaRemarketing);
                    
                    return (
                      <div 
                        key={c.id}
                        draggable
                        onDragStart={(e) => onDragStart(e, c.id)}
                        className={`bg-white dark:bg-gloss-black p-4 rounded-xl shadow-sm transition-all cursor-grab active:cursor-grabbing group relative hover:border-gloss-burgundy/40 border-2 ${remarketingStatus?.urgent ? 'border-red-400' : 'border-gray-200 dark:border-gray-700'}`}
                      >
                        {/* Click Area for Modal */}
                        <div className="absolute inset-0 z-0 cursor-pointer" onClick={() => setSelectedCliente(c)}></div>

                        <div className="relative z-10 pointer-events-none">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2 text-gloss-burgundy dark:text-gloss-pink">
                              <Building2 size={16}/>
                              <span className="font-bold text-sm truncate max-w-[200px]">{c.negocio?.nombre || 'Sin nombre'}</span>
                            </div>
                            <GripVertical size={16} className="text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"/>
                          </div>
                          
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
                              {c.negocio?.categoria || 'Sin categoría'}
                            </span>
                            <span className="flex items-center gap-1 text-[10px] font-medium text-gray-500">
                              <MapPin size={10}/> {c.negocio?.ciudad || 'N/A'}
                            </span>
                          </div>

                          {/* REUNIONES Y REMARKETING VISUALES */}
                          {/* KEY props added to prevent React DOM tree insertBefore crash during HMR/state change */}
                          <div className="space-y-1.5 mb-3">
                            {meetingBadge && (
                              <div key={`meet-${c.id}-${c.notas.tipoCita}`} className={`flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 rounded border ${meetingBadge.color}`}>
                                <meetingBadge.icon size={12}/> 
                                {c.notas.tipoCita} {c.notas.fechaCita ? `- ${new Date(c.notas.fechaCita).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}` : ''}
                              </div>
                            )}
                            
                            {remarketingStatus && (
                              <div key={`rem-${c.id}-${c.notas.fechaRemarketing}`} className={`flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 rounded border ${remarketingStatus.color}`}>
                                <remarketingStatus.icon size={12}/> 
                                {remarketingStatus.text}
                              </div>
                            )}
                          </div>

                          <div className="space-y-2 mb-4 mt-2">
                            <div className="flex items-center justify-between text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900/50 px-3 py-2 rounded-lg border border-gray-100 dark:border-gray-800">
                              <div className="flex items-center gap-2">
                                <User size={14} className="text-gray-400"/>
                                <span className="truncate font-medium text-xs">{c.contactos?.[0]?.nombre || 'Sin contacto'}</span>
                              </div>
                            </div>
                            
                            <div className="flex items-center justify-between text-sm text-gray-700 dark:text-gray-300 bg-green-50/50 dark:bg-green-900/10 px-3 py-2 rounded-lg border border-green-100 dark:border-green-900/30">
                              <div className="flex items-center gap-2">
                                <DollarSign size={14} className="text-green-600 dark:text-green-500"/>
                                <span className="font-bold text-green-700 dark:text-green-400">{formatCurrency(c.contrato?.valor, c.contrato?.divisa)}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Selector Rápido para Móviles (Requires pointer-events-auto) */}
                        <div className="relative z-10 mt-2 pt-3 border-t border-gray-100 dark:border-gray-800">
                          <select 
                            value={c.contrato?.estadoContrato || ''}
                            onChange={(e) => changeStatus(c.id, e.target.value)}
                            className="w-full text-xs bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-2 text-gray-600 dark:text-gray-400 focus:ring-1 focus:ring-gloss-burgundy font-medium cursor-pointer"
                          >
                            {COLUMNAS.map(opt => <option key={opt} value={opt}>Mover a: {opt}</option>)}
                          </select>
                        </div>
                      </div>
                    );
                  })}

                  {clientesColumna.length === 0 && (
                    <div className="h-24 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-xl flex items-center justify-center text-gray-400 text-xs font-medium bg-white/30 dark:bg-black/10">
                      Sin clientes
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================= */}
      {/* MODAL FICHA RESUMIDA DEL CLIENTE (CORREGIDO)                */}
      {/* ========================================================= */}
      {selectedCliente && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-2 sm:p-4 backdrop-blur-sm">
          {/* 
            Contenedor flex-col estricto: Header fijo, cuerpo scrolleable 
            max-h-[90vh] asegura que nunca se desborde fuera de la pantalla
          */}
          <div className="bg-white dark:bg-gloss-black rounded-2xl w-full max-w-lg shadow-2xl relative border border-gray-200 dark:border-gray-800 animate-scale-in flex flex-col max-h-[90vh] sm:max-h-[85vh]">
            
            {/* Header decorativo fijo con Botón X siempre visible */}
            <div className="h-24 bg-gradient-to-r from-gloss-burgundy to-pink-800 relative rounded-t-2xl flex-shrink-0">
              <button 
                onClick={handleSaveModal} 
                className="absolute top-4 right-4 text-white hover:text-white bg-black/30 hover:bg-black/50 rounded-full p-2 transition-colors z-[110]"
              >
                <X size={20}/>
              </button>
            </div>

            {/* Cuerpo desplazable (Scroll) */}
            <div className="px-6 pb-6 relative overflow-y-auto custom-scrollbar flex-1 pt-0">
              {/* Avatar flotante - Posición corregida relativa a la vista de scroll */}
              <div className="w-16 h-16 rounded-2xl bg-white dark:bg-gray-900 border-4 border-white dark:border-gloss-black flex items-center justify-center shadow-md absolute -top-8 left-6 text-gloss-burgundy z-10">
                <Building2 size={28}/>
              </div>

              {/* Ajuste de pt-12 para garantizar separación del avatar */}
              <div className="pt-12 mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white leading-tight">{selectedCliente.negocio?.nombre}</h2>
                <div className="flex items-center gap-3 mt-2 text-sm">
                  <span className="font-medium text-gloss-burgundy dark:text-gloss-pink">{selectedCliente.negocio?.categoria}</span>
                  <span className="text-gray-300 dark:text-gray-700">•</span>
                  <span className="flex items-center gap-1 text-gray-500"><MapPin size={14}/> {selectedCliente.negocio?.ciudad}</span>
                </div>
              </div>

              <div className="space-y-4 max-h-[75vh] overflow-y-auto px-1">
                <div className="border border-gray-200 dark:border-gray-800 rounded-xl p-4">
                  <h4 className="text-xs font-bold text-gray-500 uppercase mb-3 flex items-center gap-2"><User size={14}/> Contacto Principal</h4>
                  <p className="font-bold text-gray-900 dark:text-white mb-2">{selectedCliente.contactos?.[0]?.nombre}</p>
                  <div className="flex flex-col gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <a href={`https://wa.me/${selectedCliente.contactos?.[0]?.telefono?.replace(/\D/g,'')}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:text-green-600 transition-colors">
                      <Phone size={14}/> {selectedCliente.contactos?.[0]?.telefono || 'Sin teléfono'}
                    </a>
                    <a href={`mailto:${selectedCliente.contactos?.[0]?.email}`} className="flex items-center gap-2 hover:text-gloss-burgundy transition-colors">
                      <Mail size={14}/> {selectedCliente.contactos?.[0]?.email || 'Sin correo'}
                    </a>
                  </div>
                </div>

                {/* ===== MÓDULO: CITAS Y REUNIONES ===== */}
                <div className="border border-gray-200 dark:border-gray-800 rounded-xl p-4 bg-gray-50 dark:bg-gray-900/50">
                  <h4 className="text-xs font-bold text-gray-500 uppercase mb-3 flex items-center gap-2"><Calendar size={14}/> Agendamiento de Citas</h4>
                  
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="text-[10px] font-bold uppercase text-gray-500 mb-1 block">Tipo de Cita</label>
                      <select 
                        value={selectedCliente.notas?.tipoCita || 'Ninguna'}
                        onChange={e => updateSelected({ notas: { ...(selectedCliente.notas || {}), tipoCita: e.target.value }})}
                        className="w-full text-xs p-1.5 border rounded-lg bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:ring-1 focus:ring-gloss-burgundy"
                      >
                        <option>Ninguna</option>
                        <option>Llamada</option>
                        <option>Reunión Presencial</option>
                        <option>Reunión Virtual Meet</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase text-gray-500 mb-1 block">Fecha y Hora</label>
                      <input 
                        type="datetime-local" 
                        value={selectedCliente.notas?.fechaCita || ''}
                        onChange={e => updateSelected({ notas: { ...(selectedCliente.notas || {}), fechaCita: e.target.value }})}
                        className="w-full text-xs p-1.5 border rounded-lg bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:ring-1 focus:ring-gloss-burgundy"
                      />
                    </div>
                  </div>

                  {selectedCliente.notas?.tipoCita === 'Reunión Virtual Meet' && (
                    <div className="mb-1 mt-3">
                      <label className="text-[10px] font-bold uppercase text-gray-500 mb-1 flex items-center gap-1"><Video size={10}/> Enlace de Meet / Zoom</label>
                      <input 
                        type="url" placeholder="https://meet.google.com/..."
                        value={selectedCliente.notas?.enlaceReunion || ''}
                        onChange={e => updateSelected({ notas: { ...(selectedCliente.notas || {}), enlaceReunion: e.target.value }})}
                        className="w-full text-xs p-1.5 border rounded-lg bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:ring-1 focus:ring-gloss-burgundy"
                      />
                    </div>
                  )}
                </div>

                {/* ===== MÓDULO: REMARKETING ===== */}
                <div className="border border-red-100 dark:border-red-900/30 rounded-xl p-4 bg-red-50/50 dark:bg-red-900/10">
                  <h4 className="text-xs font-bold text-red-700 dark:text-red-400 uppercase mb-3 flex items-center gap-2"><AlertCircle size={14}/> Seguimiento (Remarketing)</h4>
                  
                  <div className="grid grid-cols-1 gap-3 mb-3">
                    <div>
                      <label className="text-[10px] font-bold uppercase text-red-600 mb-1 block">Fecha Límite de Contacto</label>
                      <input 
                        type="date" 
                        value={selectedCliente.notas?.fechaRemarketing || ''}
                        onChange={e => updateSelected({ notas: { ...(selectedCliente.notas || {}), fechaRemarketing: e.target.value }})}
                        className="w-full text-xs p-1.5 border rounded-lg bg-white dark:bg-gray-800 border-red-200 dark:border-red-800 focus:ring-1 focus:ring-red-500 text-red-900 dark:text-red-100"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase text-red-600 mb-1 block">Compromiso / Razón de Seguimiento</label>
                      <input 
                        type="text" 
                        value={selectedCliente.notas?.notaRemarketing || ''}
                        onChange={e => updateSelected({ notas: { ...(selectedCliente.notas || {}), notaRemarketing: e.target.value }})}
                        placeholder="Ej. Escribir para enviar el PDF con precios..."
                        className="w-full text-sm p-2 border rounded-lg bg-white dark:bg-gray-800 border-red-200 dark:border-red-800 focus:ring-1 focus:ring-red-500 text-red-900 dark:text-red-100"
                      />
                    </div>
                  </div>
                </div>

                {/* ===== MÓDULO: NOTAS COMERCIALES GENERALES ===== */}
                <div className="border border-gray-200 dark:border-gray-800 rounded-xl p-4">
                  <h4 className="text-xs font-bold text-gray-500 uppercase mb-3 flex items-center gap-2"><FileText size={14}/> Historial / Notas de Venta</h4>
                  <textarea 
                    value={selectedCliente.notas?.texto || ''}
                    onChange={e => updateSelected({ notas: { ...(selectedCliente.notas || {}), texto: e.target.value }})}
                    placeholder="Escribe detalles del negocio, presupuestos discutidos..."
                    className="w-full text-sm p-3 border rounded-lg bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700 focus:ring-1 focus:ring-gloss-burgundy min-h-[80px] resize-y shadow-sm"
                  />
                </div>

              </div>

              <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800">
                <button 
                  onClick={() => setSelectedCliente(null)}
                  className="w-full flex items-center justify-center gap-2 bg-gloss-burgundy hover:bg-gloss-burgundy/90 text-white py-2.5 rounded-xl font-medium transition-colors shadow-md"
                >
                  Guardar Cambios
                </button>
              </div>
              
            </div>
          </div>
        </div>
      )}

      {/* LEAD MODAL RÁPIDO */}
      {showLeadModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowLeadModal(false)}>
          <div className="bg-white dark:bg-gloss-black rounded-2xl w-full max-w-xl p-6 shadow-xl border border-gray-200 dark:border-gray-800" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-zodiak font-bold mb-4">Registro Rápido de Prospecto</h3>
            <form onSubmit={handleSaveLead} className="space-y-4 max-h-[75vh] overflow-y-auto px-1">
              <div>
                <label className="block text-sm mb-1">Clínica / Estética *</label>
                <input required value={leadForm.nombre_clinica} onChange={e=>setLeadForm({...leadForm, nombre_clinica: e.target.value})} className="w-full px-3 py-2 rounded-lg border dark:border-gray-700 bg-transparent" placeholder="Nombre comercial"/>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm mb-1">Nombre Contacto *</label>
                  <input required value={leadForm.nombre_contacto} onChange={e=>setLeadForm({...leadForm, nombre_contacto: e.target.value})} className="w-full px-3 py-2 rounded-lg border dark:border-gray-700 bg-transparent" placeholder="Dr. o Dra."/>
                </div>
                <div>
                  <label className="block text-sm mb-1">WhatsApp / Teléfono *</label>
                  <input required value={leadForm.telefono} onChange={e=>setLeadForm({...leadForm, telefono: e.target.value})} className="w-full px-3 py-2 rounded-lg border dark:border-gray-700 bg-transparent" placeholder="+57..."/>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-sm mb-2">Servicios de Interés (Puede elegir varios)</label>
                  <div className="flex flex-wrap gap-2">
                    {catalogo.map((svc, idx) => {
                      const isSelected = leadForm.interes.includes(svc.nombre);
                      return (
                        <button 
                          key={svc.id || idx}
                          type="button"
                          onClick={() => {
                            const newInteres = isSelected 
                              ? leadForm.interes.filter(i => i !== svc.nombre)
                              : [...leadForm.interes, svc.nombre];
                            setLeadForm({...leadForm, interes: newInteres});
                          }}
                          className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${isSelected ? 'bg-gloss-burgundy text-white border-gloss-burgundy shadow-sm' : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-gloss-burgundy/50'}`}
                        >
                          {svc.nombre}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <label className="block text-sm mb-1">Valor Estimado (Total)</label>
                  <input type="number" min="0" value={leadForm.valor} onChange={e=>setLeadForm({...leadForm, valor: e.target.value})} className="w-full px-3 py-2 rounded-lg border dark:border-gray-700 bg-transparent" placeholder="0"/>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm mb-1">Columna Inicial</label>
                  <select value={leadForm.columna} onChange={e=>setLeadForm({...leadForm, columna: e.target.value})} className="w-full px-3 py-2 rounded-lg border dark:border-gray-700 bg-transparent dark:bg-gray-900">
                    <option>Prospecto</option>
                    <option>Llamada / Reunión Agendada</option>
                    <option>Interesado</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm mb-1">Próxima Acción (Fecha)</label>
                  <input type="date" value={leadForm.fecha_accion} onChange={e=>setLeadForm({...leadForm, fecha_accion: e.target.value})} className="w-full px-3 py-2 rounded-lg border dark:border-gray-700 bg-transparent"/>
                </div>
              </div>
              <div className="border-t border-gray-200 dark:border-gray-800 pt-4 mt-2">
                <label className="block text-sm font-bold mb-3 text-gray-700 dark:text-gray-300">Enlaces y Redes (Opcional)</label>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-xs mb-1 text-gray-500">Instagram</label>
                    <input value={leadForm.instagram} onChange={e=>setLeadForm({...leadForm, instagram: e.target.value})} className="w-full px-3 py-1.5 text-sm rounded-lg border dark:border-gray-700 bg-transparent" placeholder="@usuario o url"/>
                  </div>
                  <div>
                    <label className="block text-xs mb-1 text-gray-500">Facebook</label>
                    <input value={leadForm.facebook} onChange={e=>setLeadForm({...leadForm, facebook: e.target.value})} className="w-full px-3 py-1.5 text-sm rounded-lg border dark:border-gray-700 bg-transparent" placeholder="url de la página"/>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-xs mb-1 text-gray-500">TikTok</label>
                    <input value={leadForm.tiktok} onChange={e=>setLeadForm({...leadForm, tiktok: e.target.value})} className="w-full px-3 py-1.5 text-sm rounded-lg border dark:border-gray-700 bg-transparent" placeholder="@usuario o url"/>
                  </div>
                  <div>
                    <label className="block text-xs mb-1 text-gray-500">Sitio Web</label>
                    <input value={leadForm.sitio_web} onChange={e=>setLeadForm({...leadForm, sitio_web: e.target.value})} className="w-full px-3 py-1.5 text-sm rounded-lg border dark:border-gray-700 bg-transparent" placeholder="https://..."/>
                  </div>
                </div>
                <div className="grid grid-cols-1 mb-3">
                  <div>
                    <label className="block text-xs mb-1 text-gray-500">Perfil de Google</label>
                    <input value={leadForm.google} onChange={e=>setLeadForm({...leadForm, google: e.target.value})} className="w-full px-3 py-1.5 text-sm rounded-lg border dark:border-gray-700 bg-transparent" placeholder="Enlace de Google Maps / My Business"/>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={()=>setShowLeadModal(false)} className="flex-1 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 font-medium">Cancelar</button>
                <button type="submit" className="flex-1 py-2 rounded-lg bg-gloss-burgundy text-white font-medium">Crear Prospecto</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
