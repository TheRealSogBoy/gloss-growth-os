import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { logAuditoria } from '../utils/audit';
import { INITIAL_CATALOGO } from './Catalogo';
import { 
  Building2, User, DollarSign, GripVertical, MapPin, 
  X, Phone, Mail, FileText, Filter, Video, Calendar, AlertCircle, Clock, Plus, CheckCircle2
} from 'lucide-react';

const COLUMNAS = ['Prospecto', 'Llamada / Reunión Agendada', 'Interesado', 'Activo', 'Retención', 'Inactivo', 'Descartados'];
const CATEGORIAS = ['Todas', 'Medicina Estética', 'Spa', 'Dermatología', 'Centro de Bienestar', 'Independiente'];

const formatCurrency = (val, divisa = 'COP') => {
  if (!val) return '$0';
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: divisa, minimumFractionDigits: 0 }).format(val);
};

// Helpers de insignias visuales
const getMeetingBadgeInfo = (tipoCita) => {
  switch (tipoCita) {
    case 'Llamada': return { color: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800', icon: Phone };
    case 'Reunión Presencial': return { color: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800', icon: MapPin };
    case 'Reunión Virtual Meet': return { color: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-950/60 dark:text-green-300 dark:border-green-800', icon: Video };
    default: return null;
  }
};

const getRemarketingStatus = (dateString) => {
  if (!dateString) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const remarkDate = new Date(dateString);
  remarkDate.setMinutes(remarkDate.getMinutes() + remarkDate.getTimezoneOffset());
  
  const diffDays = Math.ceil((remarkDate - today) / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) return { text: '¡Seguimiento Vencido!', color: 'bg-red-100 text-red-700 border-red-300', icon: AlertCircle, urgent: true };
  if (diffDays === 0) return { text: '¡Seguimiento Hoy!', color: 'bg-red-100 text-red-700 border-red-300 animate-pulse', icon: AlertCircle, urgent: true };
  if (diffDays <= 2) return { text: `Seguimiento en ${diffDays}d`, color: 'bg-orange-100 text-orange-700 border-orange-200', icon: Clock, urgent: false };
  return { text: `Seguimiento en ${diffDays}d`, color: 'bg-blue-50 text-blue-600 border-blue-200', icon: Calendar, urgent: false };
};

const mapToKanbanForm = (row = {}) => {
  let columna = 'Prospecto';
  if (COLUMNAS.includes(row.estado_contrato)) {
    columna = row.estado_contrato;
  } else if (['Activo', 'Onboarding', 'Setup', 'Ejecución'].includes(row.estado_contrato)) {
    columna = 'Activo';
  } else if (row.estado_contrato === 'Pausado') {
    columna = 'Inactivo';
  }

  const notas = row.notas_kanban && typeof row.notas_kanban === 'object' ? { ...row.notas_kanban } : {};
  if (row.direccion_cita && !notas.direccion_cita) {
    notas.direccion_cita = row.direccion_cita;
  }

  return {
    id: row.id,
    negocio: {
      nombre: row.negocio_nombre || 'Sin nombre',
      categoria: row.negocio_categoria || 'Sin categoría',
      ciudad: row.negocio_ciudad || 'N/A'
    },
    contactos: Array.isArray(row.contactos) ? row.contactos : [],
    contrato: {
      valor: row.contrato_valor || 0,
      divisa: row.contrato_divisa || 'COP',
      estadoContrato: columna,
      modeloComercial: row.contrato_esquema || 'Fijo Mensual'
    },
    direccion_cita: row.direccion_cita || notas.direccion_cita || '',
    estado_contrato: columna,
    notas: notas
  };
};

export default function KanbanClientes() {
  const { user } = useAuth();
  
  const [clientes, setClientes] = useState([]);
  const [catalogo, setCatalogo] = useState([]);
  const [loadingClientes, setLoadingClientes] = useState(true);

  // Filtros
  const [filtroCategoria, setFiltroCategoria] = useState('Todas');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modales
  const [selectedCliente, setSelectedCliente] = useState(null);
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [leadForm, setLeadForm] = useState({ 
    nombre_clinica: '', 
    nombre_contacto: '', 
    telefono: '', 
    interes: [], 
    valor: '', 
    fecha_accion: '', 
    columna: 'Prospecto', 
    facebook: '', 
    instagram: '', 
    tiktok: '', 
    sitio_web: '', 
    google: '',
    direccion_cita: ''
  });

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

      if (resClientes.error) throw resClientes.error;
      if (resClientes.data) {
        setClientes(resClientes.data.map(mapToKanbanForm));
      }
    } catch (e) {
      console.error('Error fetching clientes:', e);
    } finally {
      setLoadingClientes(false);
    }
  };

  const handleSaveLead = async (e) => {
    e.preventDefault();
    if (!leadForm.nombre_clinica?.trim()) {
      alert('Por favor ingrese el nombre de la Clínica / Estética.');
      return;
    }

    const enlacesGenerados = [];
    if (leadForm.facebook) enlacesGenerados.push({ red: 'Facebook', url: leadForm.facebook });
    if (leadForm.instagram) enlacesGenerados.push({ red: 'Instagram', url: leadForm.instagram });
    if (leadForm.tiktok) enlacesGenerados.push({ red: 'TikTok', url: leadForm.tiktok });
    if (leadForm.sitio_web) enlacesGenerados.push({ red: 'Sitio Web', url: leadForm.sitio_web });
    if (leadForm.google) enlacesGenerados.push({ red: 'Perfil de Google', url: leadForm.google });

    const payload = {
      negocio_nombre: leadForm.nombre_clinica.trim(),
      contactos: [{ nombre: leadForm.nombre_contacto || 'Sin nombre', telefono: leadForm.telefono || 'Sin teléfono', rol: 'Prospecto' }],
      enlaces: enlacesGenerados,
      contrato_notas: `Interés: ${(leadForm.interes || []).join(', ')}. Próxima acción: ${leadForm.fecha_accion}`,
      contrato_valor: Number(leadForm.valor) || 0,
      estado_contrato: leadForm.columna,
      direccion_cita: leadForm.direccion_cita || null,
      notas_kanban: {
        direccion_cita: leadForm.direccion_cita || ''
      }
    };

    try {
      let { data, error } = await supabase.from('clientes').insert([payload]).select();
      if (error && error.message?.includes('direccion_cita')) {
        delete payload.direccion_cita;
        const retry = await supabase.from('clientes').insert([payload]).select();
        data = retry.data;
        error = retry.error;
      }
      if (error) throw error;

      if (data && data.length > 0) {
        setClientes([mapToKanbanForm(data[0]), ...clientes]);
        logAuditoria(user, 'Pipeline Comercial', 'CREAR', `Nuevo prospecto agregado: ${payload.negocio_nombre}`);
        setShowLeadModal(false);
        setLeadForm({ nombre_clinica: '', nombre_contacto: '', telefono: '', interes: [], valor: '', fecha_accion: '', columna: 'Prospecto', facebook: '', instagram: '', tiktok: '', sitio_web: '', google: '', direccion_cita: '' });
      }
    } catch (error) {
      console.error('Error insertando cliente:', error);
      alert('Hubo un error al guardar: ' + error.message);
    }
  };

  // === FILTRADO ===
  const clientesFiltrados = useMemo(() => {
    return clientes.filter(c => {
      const matchCat = filtroCategoria === 'Todas' || c?.negocio?.categoria === filtroCategoria;
      const matchSearch = (c?.negocio?.nombre || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (c?.negocio?.ciudad || '').toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [clientes, filtroCategoria, searchQuery]);

  // === DRAG & DROP CON UUID STRING Y PERSISTENCIA ===
  const onDragStart = (e, id) => {
    e.dataTransfer.setData('clientId', String(id));
  };

  const onDragOver = (e) => {
    e.preventDefault();
  };

  const onDrop = async (e, nuevaColumna) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('clientId');
    if (!id) return;
    
    setClientes(prev => prev.map(c => 
      String(c.id) === String(id) 
        ? { ...c, estado_contrato: nuevaColumna, contrato: { ...(c.contrato || {}), estadoContrato: nuevaColumna } } 
        : c
    ));

    if (selectedCliente && String(selectedCliente.id) === String(id)) {
      setSelectedCliente(prev => ({
        ...prev,
        estado_contrato: nuevaColumna,
        contrato: { ...(prev?.contrato || {}), estadoContrato: nuevaColumna }
      }));
    }

    try {
      await supabase.from('clientes').update({ estado_contrato: nuevaColumna }).eq('id', id);
      logAuditoria(user, 'Pipeline Comercial', 'EDITAR', `Cliente movido a ${nuevaColumna}`);
    } catch (err) {
      console.error('Error actualizando cliente en Supabase:', err);
    }
  };

  const changeStatus = async (id, newStatus) => {
    setClientes(prev => prev.map(c => 
      String(c.id) === String(id) 
        ? { ...c, estado_contrato: newStatus, contrato: { ...(c.contrato || {}), estadoContrato: newStatus } } 
        : c
    ));

    try {
      await supabase.from('clientes').update({ estado_contrato: newStatus }).eq('id', id);
      logAuditoria(user, 'Pipeline Comercial', 'EDITAR', `Cliente movido a ${newStatus}`);
    } catch (err) {
      console.error('Error cambiando estado:', err);
    }
  };

  // === ACTUALIZACIÓN DEL MODAL Y SUPABASE ===
  const updateSelected = async (updates) => {
    const updated = { ...selectedCliente, ...updates };
    setSelectedCliente(updated);
    setClientes(prev => prev.map(c => String(c.id) === String(updated.id) ? updated : c));

    try {
      const payload = {
        estado_contrato: updated.contrato?.estadoContrato || updated.estado_contrato,
        notas_kanban: updated.notas || {}
      };
      if (updated.direccion_cita !== undefined) {
        payload.direccion_cita = updated.direccion_cita;
      }
      const { error } = await supabase.from('clientes').update(payload).eq('id', updated.id);
      if (error && error.message?.includes('direccion_cita')) {
        delete payload.direccion_cita;
        await supabase.from('clientes').update(payload).eq('id', updated.id);
      }
    } catch (err) {
      console.error('Error persistiendo notas kanban:', err);
    }
  };

  const handleSaveModal = async () => {
    if (selectedCliente) {
      try {
        const payload = {
          estado_contrato: selectedCliente.contrato?.estadoContrato || selectedCliente.estado_contrato,
          notas_kanban: selectedCliente.notas || {}
        };
        if (selectedCliente.direccion_cita !== undefined) {
          payload.direccion_cita = selectedCliente.direccion_cita;
        }
        const { error } = await supabase.from('clientes').update(payload).eq('id', selectedCliente.id);
        if (error && error.message?.includes('direccion_cita')) {
          delete payload.direccion_cita;
          await supabase.from('clientes').update(payload).eq('id', selectedCliente.id);
        }
        logAuditoria(user, 'Pipeline Comercial', 'EDITAR', `Notas guardadas para ${selectedCliente.negocio?.nombre}`);
      } catch (err) {
        console.error('Error guardando modal de cliente:', err);
      }
    }
    setSelectedCliente(null);
  };

  return (
    <div className="h-full flex flex-col animate-fade-in pb-8">
      
      <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-zodiak font-bold text-gloss-burgundy dark:text-gloss-inverted">Pipeline Comercial</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Gestión integral del flujo de ventas, citas y remarketing de clínicas.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 items-center">
          <button 
            onClick={() => { 
              setLeadForm({ nombre_clinica: '', nombre_contacto: '', telefono: '', interes: [], valor: '', fecha_accion: '', columna: 'Prospecto', facebook: '', instagram: '', tiktok: '', sitio_web: '', google: '', direccion_cita: '' }); 
              setShowLeadModal(true); 
            }} 
            className="bg-gloss-burgundy text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-gloss-burgundy/90 transition-all flex items-center gap-2 shadow-md whitespace-nowrap"
          >
            <Plus size={15}/> Nuevo Prospecto
          </button>

          <div className="relative">
            <Filter size={14} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"/>
            <select 
              value={filtroCategoria} 
              onChange={(e) => setFiltroCategoria(e.target.value)}
              className="pl-8 pr-4 py-2 text-xs bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-gloss-burgundy font-bold shadow-sm outline-none cursor-pointer"
            >
              {CATEGORIAS.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>

          <input 
            type="text" 
            placeholder="Buscar negocio o ciudad..." 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-4 py-2 text-xs bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-gloss-burgundy shadow-sm w-full sm:w-64 outline-none"
          />
        </div>
      </div>

      {/* TABLERO KANBAN */}
      <div className="flex-1 overflow-x-auto custom-scrollbar">
        <div className="flex gap-6 min-w-max pb-4 h-full items-start">
          
          {COLUMNAS.map(columna => {
            const clientesColumna = clientesFiltrados.filter(c => (c?.contrato?.estadoContrato || c?.estado_contrato) === columna);
            
            return (
              <div 
                key={columna}
                className="w-[320px] bg-gray-50/90 dark:bg-gray-900/40 rounded-2xl border border-gray-200 dark:border-gray-800 flex flex-col max-h-full shadow-sm"
                onDragOver={onDragOver}
                onDrop={(e) => onDrop(e, columna)}
              >
                {/* Cabecera Columna */}
                <div className="p-3.5 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-white/50 dark:bg-black/20 rounded-t-2xl">
                  <h3 className="font-bold text-gray-800 dark:text-gray-200 text-sm">{columna}</h3>
                  <span className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-bold px-2.5 py-0.5 rounded-full shadow-inner">
                    {clientesColumna.length}
                  </span>
                </div>

                {/* Tarjetas */}
                <div className="p-3 flex-1 overflow-y-auto space-y-3 custom-scrollbar min-h-[140px]">
                  {clientesColumna.map(c => {
                    const meetingBadge = getMeetingBadgeInfo(c?.notas?.tipoCita);
                    const remarketingStatus = getRemarketingStatus(c?.notas?.fechaRemarketing);
                    
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
                              <Building2 size={16} className="flex-shrink-0"/>
                              <span className="font-bold text-sm truncate max-w-[200px]">{c?.negocio?.nombre || 'Sin nombre'}</span>
                            </div>
                            <GripVertical size={16} className="text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"/>
                          </div>
                          
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
                              {c?.negocio?.categoria || 'Sin categoría'}
                            </span>
                            <span className="flex items-center gap-1 text-[10px] font-medium text-gray-500">
                              <MapPin size={10} className="flex-shrink-0"/> {c?.negocio?.ciudad || 'N/A'}
                            </span>
                          </div>

                          {/* REUNIONES Y REMARKETING VISUALES */}
                          <div className="space-y-1.5 mb-3">
                            {meetingBadge && (
                              <div className={`flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 rounded-lg border ${meetingBadge.color}`}>
                                <meetingBadge.icon size={12} className="flex-shrink-0"/> 
                                <span className="truncate">
                                  {c?.notas?.tipoCita} {c?.notas?.fechaCita ? `- ${new Date(c.notas.fechaCita).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}` : ''}
                                </span>
                              </div>
                            )}
                            
                            {c?.notas?.tipoCita === 'Reunión Presencial' && (c?.notas?.direccion_cita || c?.direccion_cita) && (
                              <div className="flex items-center gap-1.5 text-[10px] font-medium px-2 py-0.5 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-100 dark:border-purple-900/40">
                                <MapPin size={11} className="flex-shrink-0 text-purple-600 dark:text-purple-400" />
                                <span className="truncate">{c?.notas?.direccion_cita || c?.direccion_cita}</span>
                              </div>
                            )}

                            {remarketingStatus && (
                              <div className={`flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 rounded-lg border ${remarketingStatus.color}`}>
                                <remarketingStatus.icon size={12} className="flex-shrink-0"/> 
                                <span className="truncate">{remarketingStatus.text}</span>
                              </div>
                            )}
                          </div>

                          <div className="space-y-2 mb-4 mt-2">
                            <div className="flex items-center justify-between text-xs text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900/50 px-3 py-2 rounded-xl border border-gray-100 dark:border-gray-800">
                              <div className="flex items-center gap-2 min-w-0">
                                <User size={13} className="text-gray-400 flex-shrink-0"/>
                                <span className="truncate font-medium">{c?.contactos?.[0]?.nombre || 'Sin contacto'}</span>
                              </div>
                            </div>
                            
                            <div className="flex items-center justify-between text-xs text-gray-700 dark:text-gray-300 bg-green-50/50 dark:bg-green-900/10 px-3 py-2 rounded-xl border border-green-100 dark:border-green-900/30">
                              <div className="flex items-center gap-2">
                                <DollarSign size={13} className="text-green-600 dark:text-green-500 flex-shrink-0"/>
                                <span className="font-bold text-green-700 dark:text-green-400">{formatCurrency(c?.contrato?.valor, c?.contrato?.divisa)}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Selector Rápido */}
                        <div className="relative z-10 mt-2 pt-3 border-t border-gray-100 dark:border-gray-800">
                          <select 
                            value={c?.contrato?.estadoContrato || c?.estado_contrato || ''}
                            onChange={(e) => changeStatus(c.id, e.target.value)}
                            className="w-full text-xs bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-2 text-gray-600 dark:text-gray-300 focus:ring-1 focus:ring-gloss-burgundy font-bold cursor-pointer"
                          >
                            {COLUMNAS.map(opt => <option key={opt} value={opt}>Mover a: {opt}</option>)}
                          </select>
                        </div>
                      </div>
                    );
                  })}

                  {clientesColumna.length === 0 && (
                    <div className="h-24 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-xl flex items-center justify-center text-gray-400 text-xs font-medium bg-white/30 dark:bg-black/10">
                      Sin prospectos
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================= */}
      {/* MODAL FICHA RESUMIDA DEL CLIENTE                          */}
      {/* ========================================================= */}
      {selectedCliente && (
        <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-2 sm:p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-gloss-black rounded-3xl w-full max-w-lg shadow-2xl relative border border-gray-200 dark:border-gray-800 flex flex-col max-h-[90vh] sm:max-h-[85vh] overflow-hidden">
            
            {/* Header decorativo fijo con Botón X */}
            <div className="h-24 bg-gradient-to-r from-gloss-burgundy to-pink-800 relative rounded-t-3xl flex-shrink-0">
              <button 
                onClick={handleSaveModal} 
                className="absolute top-4 right-4 text-white hover:text-white bg-black/30 hover:bg-black/50 rounded-full p-2 transition-colors z-[110]"
                title="Cerrar y Guardar"
              >
                <X size={18}/>
              </button>
            </div>

            {/* Cuerpo desplazable */}
            <div className="px-6 pb-6 relative overflow-y-auto custom-scrollbar flex-1 pt-0">
              {/* Avatar flotante */}
              <div className="w-16 h-16 rounded-2xl bg-white dark:bg-gray-900 border-4 border-white dark:border-gloss-black flex items-center justify-center shadow-md absolute -top-8 left-6 text-gloss-burgundy z-10">
                <Building2 size={26}/>
              </div>

              <div className="pt-12 mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white leading-tight">{selectedCliente?.negocio?.nombre || 'Sin nombre'}</h2>
                <div className="flex items-center gap-3 mt-2 text-xs">
                  <span className="font-bold text-gloss-burgundy dark:text-gloss-pink">{selectedCliente?.negocio?.categoria || 'Sin categoría'}</span>
                  <span className="text-gray-300 dark:text-gray-700">•</span>
                  <span className="flex items-center gap-1 text-gray-500 font-medium"><MapPin size={13}/> {selectedCliente?.negocio?.ciudad || 'N/A'}</span>
                </div>
              </div>

              <div className="space-y-4 px-1">
                {/* Contacto Principal */}
                <div className="border border-gray-200 dark:border-gray-800 rounded-2xl p-4">
                  <h4 className="text-[11px] font-bold text-gray-500 uppercase mb-2 flex items-center gap-1.5"><User size={13}/> Contacto Principal</h4>
                  <p className="font-bold text-sm text-gray-900 dark:text-white mb-2">{selectedCliente?.contactos?.[0]?.nombre || 'Sin nombre asignado'}</p>
                  <div className="flex flex-col gap-2 text-xs text-gray-600 dark:text-gray-400">
                    <a href={`https://wa.me/${(selectedCliente?.contactos?.[0]?.telefono || '').replace(/\D/g,'')}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:text-green-600 transition-colors font-medium">
                      <Phone size={13}/> {selectedCliente?.contactos?.[0]?.telefono || 'Sin teléfono'}
                    </a>
                    <a href={`mailto:${selectedCliente?.contactos?.[0]?.email}`} className="flex items-center gap-2 hover:text-gloss-burgundy transition-colors font-medium">
                      <Mail size={13}/> {selectedCliente?.contactos?.[0]?.email || 'Sin correo'}
                    </a>
                  </div>
                </div>

                {/* Citas y Reuniones */}
                <div className="border border-gray-200 dark:border-gray-800 rounded-2xl p-4 bg-gray-50 dark:bg-gray-900/50">
                  <h4 className="text-[11px] font-bold text-gray-500 uppercase mb-3 flex items-center gap-1.5"><Calendar size={13}/> Agendamiento de Citas</h4>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="text-[10px] font-bold uppercase text-gray-500 mb-1 block">Tipo de Cita</label>
                      <select 
                        value={selectedCliente?.notas?.tipoCita || 'Ninguna'}
                        onChange={e => updateSelected({ notas: { ...(selectedCliente?.notas || {}), tipoCita: e.target.value }})}
                        className="w-full text-xs p-2.5 border rounded-xl bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-gloss-burgundy outline-none font-bold cursor-pointer"
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
                        value={selectedCliente?.notas?.fechaCita || ''}
                        onChange={e => updateSelected({ notas: { ...(selectedCliente?.notas || {}), fechaCita: e.target.value }})}
                        className="w-full text-xs p-2.5 border rounded-xl bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-gloss-burgundy outline-none font-medium"
                      />
                    </div>
                  </div>

                  {/* Campo Dinámico: Llamada (Input con padding y alineación limpia) */}
                  {selectedCliente?.notas?.tipoCita === 'Llamada' && (
                    <div className="mt-3 animate-fade-in">
                      <label className="text-[10px] font-bold uppercase text-gray-500 mb-1 flex items-center gap-1.5">
                        <Phone size={12} className="flex-shrink-0 text-blue-600 dark:text-blue-400"/> Número de Teléfono / WhatsApp
                      </label>
                      <div className="relative flex items-center w-full">
                        <div className="absolute left-3 flex items-center justify-center pointer-events-none text-blue-600 dark:text-blue-400">
                          <Phone size={14} className="flex-shrink-0" />
                        </div>
                        <input 
                          type="tel" 
                          placeholder="Ej. +57 314 590 4933"
                          value={selectedCliente?.notas?.telefonoLlamada || selectedCliente?.contactos?.[0]?.telefono || ''}
                          onChange={e => updateSelected({ notas: { ...(selectedCliente?.notas || {}), telefonoLlamada: e.target.value }})}
                          className="w-full text-xs pl-9 pr-3 py-2.5 border rounded-xl bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-gloss-burgundy outline-none font-medium text-gray-900 dark:text-white"
                        />
                      </div>
                    </div>
                  )}

                  {/* Campo Dinámico: Reunión Presencial (Dirección / Ubicación) */}
                  {selectedCliente?.notas?.tipoCita === 'Reunión Presencial' && (
                    <div className="mt-3 animate-fade-in">
                      <label className="text-[10px] font-bold uppercase text-gray-500 mb-1 flex items-center gap-1.5">
                        <MapPin size={12} className="flex-shrink-0 text-purple-600 dark:text-purple-400"/> Dirección / Ubicación
                      </label>
                      <div className="relative flex items-center w-full">
                        <div className="absolute left-3 flex items-center justify-center pointer-events-none text-purple-600 dark:text-purple-400">
                          <MapPin size={14} className="flex-shrink-0" />
                        </div>
                        <input 
                          type="text" 
                          placeholder="Ej. Edificio Empresarial, Oficina 302"
                          value={selectedCliente?.direccion_cita || selectedCliente?.notas?.direccion_cita || ''}
                          onChange={e => {
                            const val = e.target.value;
                            updateSelected({ 
                              direccion_cita: val,
                              notas: { ...(selectedCliente?.notas || {}), direccion_cita: val }
                            });
                          }}
                          className="w-full text-xs pl-9 pr-3 py-2.5 border rounded-xl bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-gloss-burgundy outline-none font-medium text-gray-900 dark:text-white"
                        />
                      </div>
                    </div>
                  )}

                  {/* Campo Dinámico: Reunión Virtual Meet */}
                  {selectedCliente?.notas?.tipoCita === 'Reunión Virtual Meet' && (
                    <div className="mt-3 animate-fade-in">
                      <label className="text-[10px] font-bold uppercase text-gray-500 mb-1 flex items-center gap-1.5">
                        <Video size={12} className="flex-shrink-0 text-green-600 dark:text-green-400"/> Enlace de Meet / Zoom
                      </label>
                      <div className="relative flex items-center w-full">
                        <div className="absolute left-3 flex items-center justify-center pointer-events-none text-green-600 dark:text-green-400">
                          <Video size={14} className="flex-shrink-0" />
                        </div>
                        <input 
                          type="url" 
                          placeholder="https://meet.google.com/..."
                          value={selectedCliente?.notas?.enlaceReunion || ''}
                          onChange={e => updateSelected({ notas: { ...(selectedCliente?.notas || {}), enlaceReunion: e.target.value }})}
                          className="w-full text-xs pl-9 pr-3 py-2.5 border rounded-xl bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-gloss-burgundy outline-none font-medium text-gray-900 dark:text-white"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Remarketing */}
                <div className="border border-red-100 dark:border-red-900/30 rounded-2xl p-4 bg-red-50/50 dark:bg-red-900/10">
                  <h4 className="text-[11px] font-bold text-red-700 dark:text-red-400 uppercase mb-3 flex items-center gap-1.5"><AlertCircle size={13}/> Seguimiento (Remarketing)</h4>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] font-bold uppercase text-red-600 mb-1 block">Fecha Límite de Contacto</label>
                      <input 
                        type="date" 
                        value={selectedCliente?.notas?.fechaRemarketing || ''}
                        onChange={e => updateSelected({ notas: { ...(selectedCliente?.notas || {}), fechaRemarketing: e.target.value }})}
                        className="w-full text-xs p-2.5 border rounded-xl bg-white dark:bg-gray-800 border-red-200 dark:border-red-800 focus:ring-1 focus:ring-red-500 text-red-900 dark:text-red-100 font-medium"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase text-red-600 mb-1 block">Compromiso / Razón de Seguimiento</label>
                      <input 
                        type="text" 
                        value={selectedCliente?.notas?.notaRemarketing || ''}
                        onChange={e => updateSelected({ notas: { ...(selectedCliente?.notas || {}), notaRemarketing: e.target.value }})}
                        placeholder="Ej. Escribir para enviar propuesta PDF..."
                        className="w-full text-xs p-2.5 border rounded-xl bg-white dark:bg-gray-800 border-red-200 dark:border-red-800 focus:ring-1 focus:ring-red-500 text-red-900 dark:text-red-100 font-medium"
                      />
                    </div>
                  </div>
                </div>

                {/* Notas Comerciales */}
                <div className="border border-gray-200 dark:border-gray-800 rounded-2xl p-4">
                  <h4 className="text-[11px] font-bold text-gray-500 uppercase mb-2 flex items-center gap-1.5"><FileText size={13}/> Historial / Notas de Venta</h4>
                  <textarea 
                    value={selectedCliente?.notas?.texto || ''}
                    onChange={e => updateSelected({ notas: { ...(selectedCliente?.notas || {}), texto: e.target.value }})}
                    placeholder="Escribe detalles del prospecto, presupuestos conversados..."
                    className="w-full text-xs sm:text-sm p-3 border rounded-2xl bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-gloss-burgundy min-h-[85px] outline-none resize-y text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800">
                <button 
                  onClick={handleSaveModal}
                  className="w-full flex items-center justify-center gap-2 bg-gloss-burgundy hover:bg-gloss-burgundy/90 text-white py-2.5 rounded-xl text-xs font-bold transition-all shadow-md"
                >
                  <CheckCircle2 size={15}/> Guardar Cambios y Cerrar
                </button>
              </div>
              
            </div>
          </div>
        </div>
      )}

      {/* LEAD MODAL RÁPIDO */}
      {showLeadModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in" onClick={() => setShowLeadModal(false)}>
          <div className="bg-white dark:bg-gloss-black rounded-3xl w-full max-w-xl p-6 shadow-2xl border border-gray-200 dark:border-gray-800" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-zodiak font-bold text-gray-900 dark:text-white">Registro Rápido de Prospecto</h3>
              <button onClick={() => setShowLeadModal(false)} className="p-1 rounded-full text-gray-400 hover:text-gray-700 dark:hover:text-white"><X size={18}/></button>
            </div>

            <form onSubmit={handleSaveLead} className="space-y-4 max-h-[75vh] overflow-y-auto px-1 custom-scrollbar">
              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Clínica / Estética *</label>
                <input required value={leadForm.nombre_clinica} onChange={e=>setLeadForm({...leadForm, nombre_clinica: e.target.value})} className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 font-medium outline-none focus:ring-2 focus:ring-gloss-burgundy" placeholder="Nombre comercial"/>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Nombre Contacto *</label>
                  <input required value={leadForm.nombre_contacto} onChange={e=>setLeadForm({...leadForm, nombre_contacto: e.target.value})} className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 font-medium outline-none focus:ring-2 focus:ring-gloss-burgundy" placeholder="Dr. o Dra."/>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-500 mb-1">WhatsApp / Teléfono *</label>
                  <input required value={leadForm.telefono} onChange={e=>setLeadForm({...leadForm, telefono: e.target.value})} className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 font-medium outline-none focus:ring-2 focus:ring-gloss-burgundy" placeholder="+57..."/>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-500 mb-2">Servicios de Interés</label>
                  <div className="flex flex-wrap gap-1.5">
                    {catalogo.map((svc, idx) => {
                      const isSelected = (leadForm.interes || []).includes(svc.nombre);
                      return (
                        <button 
                          key={svc.id || idx}
                          type="button"
                          onClick={() => {
                            const newInteres = isSelected 
                              ? (leadForm.interes || []).filter(i => i !== svc.nombre)
                              : [...(leadForm.interes || []), svc.nombre];
                            setLeadForm({...leadForm, interes: newInteres});
                          }}
                          className={`px-3 py-1 text-xs font-bold rounded-full border transition-all ${isSelected ? 'bg-gloss-burgundy text-white border-gloss-burgundy shadow-sm' : 'bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-gloss-burgundy'}`}
                        >
                          {svc.nombre}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Valor Estimado (COP)</label>
                  <input type="number" min="0" value={leadForm.valor} onChange={e=>setLeadForm({...leadForm, valor: e.target.value})} className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 font-bold outline-none focus:ring-2 focus:ring-gloss-burgundy" placeholder="0"/>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Columna Inicial</label>
                  <select value={leadForm.columna} onChange={e=>setLeadForm({...leadForm, columna: e.target.value})} className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 font-bold outline-none cursor-pointer">
                    <option>Prospecto</option>
                    <option>Llamada / Reunión Agendada</option>
                    <option>Interesado</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Próxima Acción (Fecha)</label>
                  <input type="date" value={leadForm.fecha_accion} onChange={e=>setLeadForm({...leadForm, fecha_accion: e.target.value})} className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 font-medium outline-none"/>
                </div>
              </div>

              <div className="border-t border-gray-200 dark:border-gray-800 pt-4 mt-2">
                <label className="block text-xs font-bold uppercase mb-3 text-gray-700 dark:text-gray-300">Enlaces y Redes Sociales</label>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 mb-1">Instagram</label>
                    <input value={leadForm.instagram} onChange={e=>setLeadForm({...leadForm, instagram: e.target.value})} className="w-full px-3 py-1.5 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 font-medium outline-none" placeholder="@usuario o url"/>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 mb-1">Facebook</label>
                    <input value={leadForm.facebook} onChange={e=>setLeadForm({...leadForm, facebook: e.target.value})} className="w-full px-3 py-1.5 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 font-medium outline-none" placeholder="url de página"/>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 mb-1">TikTok</label>
                    <input value={leadForm.tiktok} onChange={e=>setLeadForm({...leadForm, tiktok: e.target.value})} className="w-full px-3 py-1.5 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 font-medium outline-none" placeholder="@usuario"/>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 mb-1">Sitio Web</label>
                    <input value={leadForm.sitio_web} onChange={e=>setLeadForm({...leadForm, sitio_web: e.target.value})} className="w-full px-3 py-1.5 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 font-medium outline-none" placeholder="https://..."/>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={()=>setShowLeadModal(false)} className="flex-1 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-xs font-bold">Cancelar</button>
                <button type="submit" className="flex-1 py-2.5 rounded-xl bg-gloss-burgundy text-white text-xs font-bold shadow-md hover:bg-gloss-burgundy/90">Crear Prospecto</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
