import { useState, useMemo, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { 
  Search, Plus, X, Phone, Mail, Building2, MapPin, 
  Edit3, CheckCircle, Clock, AlertCircle, 
  FileText, Link as LinkIcon, CreditCard,
  ChevronRight, Calendar, User, Save, Target, Globe, Trash2, Cloud,
  List
} from 'lucide-react';

// === FUNCIONES DE APOYO ===
const normalizeText = (str) => {
  if (!str) return '';
  return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};

const formatCurrency = (val, divisa = 'COP') => {
  if (!val) return '';
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: divisa, minimumFractionDigits: 0 }).format(val);
};

// === AUTOMATIZACIÓN DE ESTADO DE PAGO ===
const getAutomatedEstadoPago = (cliente) => {
  const hoy = new Date();
  
  // Si tiene un plan de pagos (cuotas fraccionadas), evaluar la cuota más próxima pendiente
  if (cliente.contrato.planPagos && cliente.contrato.planPagos.length > 0) {
    const cuotasPendientes = cliente.contrato.planPagos.filter(p => p.estado === 'Pendiente');
    if (cuotasPendientes.length === 0) return 'Pagado al 100%';
    
    // Evaluar la fecha de la cuota más vieja pendiente
    const cuotaCritica = cuotasPendientes.sort((a, b) => new Date(a.fechaLimite) - new Date(b.fechaLimite))[0];
    const limite = new Date(cuotaCritica.fechaLimite);
    
    if (hoy > limite) return 'Cuota Vencida';
    
    const diffTime = Math.abs(limite - hoy);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    if (diffDays <= 3) return `Vence en ${diffDays} días`;
    return 'Al día (Cuotas pendientes)';
  }

  // Lógica legacy para recurrente básico (por si no usa plan de pagos)
  const mesActual = hoy.getMonth();
  const añoActual = hoy.getFullYear();
  const haPagadoEsteMes = cliente.contrato.historialPagos?.some(p => {
    const [year, month] = p.fecha.split('-');
    return Number(month) - 1 === mesActual && Number(year) === añoActual;
  });

  if (haPagadoEsteMes) return 'Al día';

  if (cliente.contrato.esquema === 'Recurrente' && cliente.contrato.diaCorte) {
    const diaCorte = Number(cliente.contrato.diaCorte);
    const diaHoy = hoy.getDate();
    if (diaHoy < diaCorte && (diaCorte - diaHoy) <= 3) return 'Cobro por emitir (Próximo)';
    if (diaHoy < diaCorte) return 'Al día';
    if (diaHoy === diaCorte) return 'Emitir Cobro Hoy';
    return 'Vencido';
  }
  
  return 'Cobro pendiente';
};

// === DATOS INICIALES MOCK ===



const mapToForm = (row) => ({
  id: row.id,
  negocio: {
    nombre: row.negocio_nombre || '',
    nit: row.negocio_nit || '',
    pais: row.negocio_pais || '',
    ciudad: row.negocio_ciudad || '',
    categoria: row.negocio_categoria || '',
    direcciones: row.negocio_direcciones || [],
    telefonos: row.negocio_telefonos || [],
    correos: row.negocio_correos || [],
    submarcas: row.negocio_submarcas || []
  },
  contactos: row.contactos || [],
  enlaces: row.enlaces || [],
  linkDrive: row.link_drive || '',
  contrato: {
    esquema: row.contrato_esquema || '',
    valor: row.contrato_valor || 0,
    divisa: row.contrato_divisa || 'COP',
    medioPago: row.contrato_medio_pago || '',
    diaCorte: row.contrato_dia_corte || '',
    estadoContrato: row.estado_contrato || 'Prospecto',
    notas: row.contrato_notas || '',
    accesos: row.contrato_accesos || '',
    objetivos: row.contrato_objetivos || '',
    planPagos: row.plan_pagos || [],
    historialPagos: row.historial_pagos || []
  },
  notas: row.notas_kanban || {}
});

const mapToRow = (form) => ({
  negocio_nombre: form.negocio?.nombre,
  negocio_nit: form.negocio?.nit,
  negocio_pais: form.negocio?.pais,
  negocio_ciudad: form.negocio?.ciudad,
  negocio_categoria: form.negocio?.categoria,
  negocio_direcciones: form.negocio?.direcciones,
  negocio_telefonos: form.negocio?.telefonos,
  negocio_correos: form.negocio?.correos,
  negocio_submarcas: form.negocio?.submarcas,
  contactos: form.contactos,
  enlaces: form.enlaces,
  link_drive: form.linkDrive,
  contrato_esquema: form.contrato?.esquema,
  contrato_valor: Number(form.contrato?.valor) || 0,
  contrato_divisa: form.contrato?.divisa,
  contrato_medio_pago: form.contrato?.medioPago,
  contrato_dia_corte: form.contrato?.diaCorte,
  estado_contrato: form.contrato?.estadoContrato,
  contrato_notas: form.contrato?.notas,
  contrato_accesos: form.contrato?.accesos,
  contrato_objetivos: form.contrato?.objetivos,
  plan_pagos: form.contrato?.planPagos,
  historial_pagos: form.contrato?.historialPagos
});

export default function Directorio() {
  
  const [clientes, setClientes] = useState([]);
  const [loadingClientes, setLoadingClientes] = useState(true);

  useEffect(() => {
    fetchClientes();
  }, []);

  const fetchClientes = async () => {
    try {
      const { data, error } = await supabase.from('clientes').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      if (data) {
        setClientes(data.map(mapToForm));
      }
    } catch (e) {
      console.error('Error fetching clientes:', e);
    } finally {
      setLoadingClientes(false);
    }
  };

  const [search, setSearch] = useState('');
  
  // === ESTADOS UI ===
  const [selectedClient, setSelectedClient] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  // === ESTADO DEL FORMULARIO ===
  const defaultForm = {
    id: null,
    negocio: { nombre: '', nit: '', pais: 'Colombia', categoria: 'Medicina Estética', direcciones: [''], telefonos: [''], correos: [''], submarcas: [] },
    contactos: [{ nombre: '', apellidos: '', tipoDoc: 'Cédula / Documento de Identidad Nacional', numDoc: '', rol: 'Propietario', telefono: '', correo: '' }],
    enlaces: [], linkDrive: '',
    contrato: { 
      esquema: 'Recurrente', valor: '', divisa: 'COP', medioPago: 'Transferencia', diaCorte: '', 
      estadoContrato: 'Onboarding', notas: '', accesos: '', objetivos: '',
      planPagos: [{ id: Date.now(), concepto: 'Cuota / Anticipo', monto: '', fechaLimite: '', estado: 'Pendiente' }],
      historialPagos: []
    }
  };
  const [form, setForm] = useState(JSON.parse(JSON.stringify(defaultForm)));

  // === BÚSQUEDA PREDICTIVA ===
  const filteredClientes = useMemo(() => {
    const query = normalizeText(search);
    if (!query) return clientes;
    return clientes.filter(c => {
      const matchNombre = normalizeText(c.negocio.nombre).includes(query);
      const matchDir = c.negocio.direcciones?.some(dir => normalizeText(dir).includes(query));
      const matchCat = normalizeText(c.negocio.categoria).includes(query);
      return matchNombre || matchDir || matchCat;
    });
  }, [clientes, search]);

  // === MANEJADORES UI ===
  const openDrawer = (client) => { setSelectedClient(client); setIsDrawerOpen(true); };
  const closeDrawer = () => { setIsDrawerOpen(false); setTimeout(() => setSelectedClient(null), 300); };

  const openNewModal = () => {
    setIsEditMode(false);
    setForm(JSON.parse(JSON.stringify(defaultForm)));
    setIsModalOpen(true);
  };

  const openEditModal = (client) => {
    setIsEditMode(true);
    setForm(JSON.parse(JSON.stringify(client))); 
    setIsModalOpen(true);
  };

  // === HELPERS DE FORMULARIO PARA ARRAYS ===
  const handleArrayChange = (section, field, index, value) => {
    const updated = [...form[section][field]];
    updated[index] = value;
    setForm({ ...form, [section]: { ...form[section], [field]: updated } });
  };
  const addArrayItem = (section, field, emptyValue = '') => setForm({ ...form, [section]: { ...form[section], [field]: [...(form[section][field] || []), emptyValue] } });
  const removeArrayItem = (section, field, index) => {
    const updated = [...form[section][field]];
    updated.splice(index, 1);
    setForm({ ...form, [section]: { ...form[section], [field]: updated } });
  };

  const handleContactoChange = (index, field, value) => {
    const updated = [...form.contactos];
    updated[index] = { ...updated[index], [field]: value };
    setForm({ ...form, contactos: updated });
  };
  const addContacto = () => setForm({...form, contactos: [...form.contactos, { nombre: '', apellidos: '', tipoDoc: 'Cédula / Documento de Identidad Nacional', numDoc: '', rol: '', telefono: '', correo: '' }]});
  const removeContacto = (index) => setForm({...form, contactos: form.contactos.filter((_, i) => i !== index)});

  const handleEnlaceChange = (index, field, value) => {
    const updated = [...form.enlaces];
    updated[index] = { ...updated[index], [field]: value };
    setForm({ ...form, enlaces: updated });
  };
  const addEnlace = () => setForm({...form, enlaces: [...form.enlaces, { red: 'Instagram', url: '' }]});
  const removeEnlace = (index) => setForm({...form, enlaces: form.enlaces.filter((_, i) => i !== index)});

  const handlePlanPagoChange = (index, field, value) => {
    const updated = [...form.contrato.planPagos];
    updated[index] = { ...updated[index], [field]: value };
    setForm({ ...form, contrato: { ...form.contrato, planPagos: updated }});
  };
  const addPlanPago = () => setForm({...form, contrato: {...form.contrato, planPagos: [...form.contrato.planPagos, { id: Date.now(), concepto: '', monto: '', fechaLimite: '', estado: 'Pendiente' }]}});
  const removePlanPago = (index) => setForm({...form, contrato: {...form.contrato, planPagos: form.contrato.planPagos.filter((_, i) => i !== index)}});


  const handleDeleteCliente = async (id, e) => {
    if (e) e.stopPropagation();
    if (window.confirm('¿Seguro que deseas eliminar a este cliente? Esta acción borrará sus datos permanentemente de Supabase.')) {
      try {
        await supabase.from('clientes').delete().eq('id', id);
        setClientes(prev => prev.filter(c => c.id !== id));
        if (selectedClient && selectedClient.id === id) {
          closeDrawer();
        }
        setIsModalOpen(false); // Cierra el modal de edición si estaba abierto
      } catch (error) {
        console.error('Error al eliminar cliente:', error);
        alert('Hubo un error al eliminar el cliente');
      }
    }
  };

  // === GUARDAR FICHA ===

  const handleSave = async (e) => {
    e.preventDefault();
    const payload = mapToRow(form);
    try {
      if (isEditMode) {
        const { data, error } = await supabase.from('clientes').update(payload).eq('id', form.id).select();
        if (error) throw error;
        if (data && data.length > 0) {
          const updated = mapToForm(data[0]);
          setClientes(clientes.map(c => c.id === form.id ? updated : c));
          if (selectedClient?.id === form.id) setSelectedClient(updated);
        }
      } else {
        const { data, error } = await supabase.from('clientes').insert([payload]).select();
        if (error) throw error;
        if (data && data.length > 0) {
          const inserted = mapToForm(data[0]);
          setClientes([inserted, ...clientes]);
        }
      }
      setIsModalOpen(false);
    } catch(err) {
      console.error('Error saving client:', err);
    }
  };

  // === BADGES ===
  const getEstadoContratoBadge = (estado) => {
    const colors = { 'Onboarding': 'bg-blue-100 text-blue-700', 'Setup': 'bg-purple-100 text-purple-700', 'Ejecución': 'bg-orange-100 text-orange-700', 'Activo': 'bg-green-100 text-green-700', 'Pausado': 'bg-gray-100 text-gray-700' };
    return <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${colors[estado] || 'bg-gray-100'}`}>{estado}</span>;
  };

  const getEstadoPagoBadge = (estado) => {
    let color = 'text-gray-600 bg-gray-50 border-gray-200';
    let Icon = Clock;
    if (estado.includes('Al día') || estado.includes('100%')) { color = 'text-green-600 bg-green-50 border-green-200'; Icon = CheckCircle; }
    else if (estado.includes('Vencid') || estado.includes('Vence en')) { color = 'text-red-600 bg-red-50 border-red-200'; Icon = AlertCircle; }
    else if (estado.includes('Emitir')) { color = 'text-orange-600 bg-orange-50 border-orange-200'; }
    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-medium border flex items-center gap-1 w-max ${color}`}>
        <Icon size={12} /> {estado}
      </span>
    );
  };

  const redesOpciones = ['Instagram', 'Facebook', 'WhatsApp', 'TikTok', 'LinkedIn', 'YouTube', 'Sitio Web', 'Google Maps', 'Apple Maps', 'Doctoralia'];
  const documentosOpciones = ['Cédula / Documento de Identidad Nacional', 'Pasaporte', 'Licencia de Conducir'];

  return (
    <div className="relative h-full animate-fade-in pb-12">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-zodiak font-bold text-gloss-burgundy dark:text-gloss-inverted">Directorio 360º</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Directorio inteligente de clientes y facturación automatizada</p>
        </div>
        <button onClick={openNewModal} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gloss-burgundy hover:bg-gloss-burgundy/90 text-white font-medium transition-colors shadow-sm">
          <Plus size={16} /> Nueva Estética
        </button>
      </div>

      <div className="mb-6 flex gap-4">
        <div className="relative flex-1 max-w-xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" placeholder="Busca por clínica, ciudad o especialidad (Ej. 'bogota', 'estetica')..." 
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gloss-black focus:outline-none focus:ring-2 focus:ring-gloss-burgundy transition-all shadow-sm"
          />
        </div>
      </div>

      <div className="bg-white dark:bg-gloss-black rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm min-w-[900px]">
            <thead className="bg-gray-50 dark:bg-gray-900/80 text-gray-500 border-b border-gray-200 dark:border-gray-800">
              <tr>
                <th className="p-4 font-medium">Clínica / Estética</th>
                <th className="p-4 font-medium">Contacto Principal</th>
                <th className="p-4 font-medium">Plan Comercial</th>
                <th className="p-4 font-medium">Estatus Operativo</th>
                <th className="p-4 font-medium">Estatus Financiero</th>
                <th className="p-4 font-medium text-center">Ficha 360º</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {filteredClientes.length === 0 && <tr><td colSpan="6" className="p-8 text-center text-gray-500">No se encontraron coincidencias para "{search}".</td></tr>}
              {filteredClientes.map(c => (
                <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors cursor-pointer" onClick={() => openDrawer(c)}>
                  <td className="p-4">
                    <div className="font-bold text-gray-900 dark:text-white text-base">{c.negocio.nombre}</div>
                    <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                      <MapPin size={12}/> {(c.negocio.direcciones && c.negocio.direcciones[0]) || 'Sin dirección'} • {c.negocio.categoria}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="font-medium text-gray-800 dark:text-gray-200">{c.contactos?.[0]?.nombre} {c.contactos?.[0]?.apellidos}</div>
                    <div className="text-xs text-gray-500 flex items-center gap-1 mt-1"><Phone size={12}/> {c.contactos?.[0]?.telefono || 'N/A'}</div>
                  </td>
                  <td className="p-4">
                    <span className="font-medium text-gray-700 dark:text-gray-300">{c.contrato.esquema}</span>
                    <div className="text-xs font-bold text-gloss-burgundy mt-1">{formatCurrency(c.contrato.valor, c.contrato.divisa)}</div>
                  </td>
                  <td className="p-4">{getEstadoContratoBadge(c.contrato.estadoContrato)}</td>
                  <td className="p-4">{getEstadoPagoBadge(getAutomatedEstadoPago(c))}</td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={(e) => handleDeleteCliente(c.id, e)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors" title="Eliminar Cliente" type="button"><Trash2 size={18} /></button>
                        <button className="p-2 text-gloss-burgundy hover:bg-gloss-pink/20 rounded-full transition-colors" type="button"><ChevronRight size={18} /></button>
                      </div>
                    </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* DRAWER 360º */}
      {isDrawerOpen && <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm transition-opacity" onClick={closeDrawer}/>}
      <div className={`fixed top-0 right-0 h-full w-full max-w-lg bg-white dark:bg-[#1a1412] shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col border-l border-gray-200 dark:border-gray-800 ${isDrawerOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        {selectedClient && (
          <>
            <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex justify-between items-start bg-gray-50/50 dark:bg-gray-900/30">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Building2 size={18} className="text-gloss-burgundy" />
                  <span className="text-xs font-bold tracking-wider uppercase text-gloss-burgundy">{selectedClient.negocio.categoria}</span>
                </div>
                <h2 className="text-2xl font-zodiak font-bold text-gray-900 dark:text-white">{selectedClient.negocio.nombre}</h2>
                <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-500">
                  <span className="flex items-center gap-1"><MapPin size={14}/> {selectedClient.negocio.pais}</span>
                  <span className="flex items-center gap-1"><FileText size={14}/> NIT: {selectedClient.negocio.nit}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => handleDeleteCliente(selectedClient.id)} className="p-2 text-red-500 hover:text-red-700 bg-red-50 dark:bg-red-900/20 rounded-lg transition-colors" title="Eliminar Cliente" type="button"><Trash2 size={18} /></button>
                <button onClick={() => openEditModal(selectedClient)} className="p-2 text-gray-500 hover:text-gloss-burgundy hover:bg-gloss-pink/20 rounded-full transition-colors" title="Editar Ficha" type="button"><Edit3 size={18} /></button>
                <button onClick={closeDrawer} className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors" type="button"><X size={20} /></button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
              
              <section>
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2"><Target size={14}/> Objetivos y Metas</h4>
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-100 dark:border-blue-800/50">
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-200 italic">"{selectedClient.contrato.objetivos || 'Aún no se han definido metas estratégicas.'}"</p>
                </div>
              </section>

              <section>
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2"><Globe size={14}/> Ecosistema Digital y Drive</h4>
                <div className="flex flex-col gap-3">
                  <a href={selectedClient.linkDrive} target="_blank" rel="noreferrer" className="w-full flex justify-between items-center px-4 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 rounded-xl transition-colors font-medium text-sm shadow-sm">
                    <span className="flex items-center gap-2"><Cloud size={18}/> Carpeta Maestra de Google Drive</span>
                    <ChevronRight size={16}/>
                  </a>
                  {selectedClient.enlaces?.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {selectedClient.enlaces.map((link, idx) => (
                        <a key={idx} href={link.url.startsWith('http') ? link.url : `https://${link.url}`} target="_blank" rel="noreferrer" className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-xs font-medium rounded-lg transition-colors border border-gray-200 dark:border-gray-700 flex items-center gap-1">
                          <LinkIcon size={12}/> {link.red}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </section>

              <section>
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2"><User size={14}/> Personas de Contacto</h4>
                <div className="space-y-3">
                  {selectedClient.contactos?.map((c, idx) => (
                    <div key={idx} className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 border border-gray-100 dark:border-gray-800">
                      <p className="font-bold text-lg">{c.nombre} {c.apellidos}</p>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="px-2 py-0.5 bg-gray-200 dark:bg-gray-800 text-xs font-medium rounded text-gray-700 dark:text-gray-300">{c.rol}</span>
                        <span className="text-xs text-gray-500 font-medium border-l border-gray-300 pl-2">{c.tipoDoc}: {c.numDoc}</span>
                      </div>
                      <div className="flex flex-col gap-2">
                        <a href={`https://wa.me/${c.telefono.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-green-600 hover:underline"><Phone size={16}/> {c.telefono}</a>
                        {c.correo && <a href={`mailto:${c.correo}`} className="flex items-center gap-2 text-sm text-blue-600 hover:underline"><Mail size={16}/> {c.correo}</a>}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2"><FileText size={14}/> Esquema Comercial y Pagos</h4>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-3 border border-gray-100 dark:border-gray-800">
                    <p className="text-xs text-gray-500 mb-1">Modelo / Divisa</p>
                    <p className="font-semibold text-sm">{selectedClient.contrato.esquema} ({selectedClient.contrato.divisa})</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-3 border border-gray-100 dark:border-gray-800">
                    <p className="text-xs text-gray-500 mb-1">Estado de la Cuenta</p>
                    <div className="mt-1">{getEstadoPagoBadge(getAutomatedEstadoPago(selectedClient))}</div>
                  </div>
                </div>

                {/* Plan de Pagos / Cuotas */}
                <div className="border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden mb-4">
                  <div className="bg-gray-100 dark:bg-gray-800/80 px-4 py-2 border-b border-gray-200 dark:border-gray-800 flex items-center gap-2">
                    <List size={14} className="text-gray-500"/>
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Plan de Pagos / Cuotas</span>
                  </div>
                  <div className="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-900/30">
                    {selectedClient.contrato.planPagos?.length === 0 && <p className="p-4 text-xs text-center text-gray-500">Sin cuotas programadas.</p>}
                    {selectedClient.contrato.planPagos?.map((cuota, idx) => (
                      <div key={idx} className="p-3 flex justify-between items-center">
                        <div>
                          <p className="text-sm font-medium">{cuota.concepto}</p>
                          <p className="text-xs text-gray-500">Límite: {cuota.fechaLimite}</p>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-bold ${cuota.estado === 'Pagado' ? 'text-green-600' : 'text-orange-500'}`}>{formatCurrency(cuota.monto, selectedClient.contrato.divisa)}</p>
                          <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${cuota.estado === 'Pagado' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>{cuota.estado}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </section>
            </div>
          </>
        )}
      </div>

      {/* MODAL FORMULARIO CLIENTE */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-gloss-black rounded-2xl w-full max-w-4xl p-6 md:p-8 shadow-xl border border-gray-200 dark:border-gray-800 my-8 relative">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 text-gray-400 hover:text-gray-700"><X size={20}/></button>
            <h3 className="text-2xl font-zodiak font-bold mb-6 text-gloss-burgundy dark:text-gloss-inverted">
              {isEditMode ? 'Editar Ficha 360º' : 'Registrar Nueva Estética'}
            </h3>
            
            <form onSubmit={handleSave} className="space-y-8 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
              
              {/* BLOQUE: NEGOCIO */}
              <div className="p-5 bg-gray-50 dark:bg-gray-900/40 rounded-xl border border-gray-100 dark:border-gray-800">
                <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase mb-4 flex items-center gap-2"><Building2 size={16}/> Datos del Negocio</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div><label className="block text-xs font-medium mb-1">Nombre Comercial</label><input required value={form.negocio.nombre} onChange={e=>setForm({...form, negocio:{...form.negocio, nombre: e.target.value}})} className="w-full px-3 py-2 text-sm rounded-lg border dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-1 focus:ring-gloss-burgundy"/></div>
                  <div><label className="block text-xs font-medium mb-1">Razón Social / NIT</label><input value={form.negocio.nit} onChange={e=>setForm({...form, negocio:{...form.negocio, nit: e.target.value}})} className="w-full px-3 py-2 text-sm rounded-lg border dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-1 focus:ring-gloss-burgundy"/></div>
                  <div>
                    <label className="block text-xs font-medium mb-1">País</label>
                    <select value={form.negocio.pais} onChange={e=>setForm({...form, negocio:{...form.negocio, pais: e.target.value}})} className="w-full px-3 py-2 text-sm rounded-lg border dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-1 focus:ring-gloss-burgundy">
                      <option>Colombia</option><option>México</option><option>España</option><option>Estados Unidos</option><option>Perú</option><option>Chile</option><option>Argentina</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Categoría</label>
                    <select value={form.negocio.categoria} onChange={e=>setForm({...form, negocio:{...form.negocio, categoria: e.target.value}})} className="w-full px-3 py-2 text-sm rounded-lg border dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-1 focus:ring-gloss-burgundy">
                      <option>Medicina Estética</option><option>Spa</option><option>Odontología Estética</option><option>Dermatología</option><option>Independiente</option><option>Tratamientos Corporales</option><option>Centro de Bienestar</option><option>Fisioterapia / Rehabilitación</option><option>Nutrición Estética</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* BLOQUE: CONTACTOS */}
              <div className="p-5 bg-gray-50 dark:bg-gray-900/40 rounded-xl border border-gray-100 dark:border-gray-800">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase flex items-center gap-2"><User size={16}/> Personas de Contacto</h4>
                  <button type="button" onClick={addContacto} className="text-xs font-medium text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-blue-100"><Plus size={14}/> Añadir Persona</button>
                </div>
                <div className="space-y-4">
                  {form.contactos.map((c, idx) => (
                    <div key={idx} className="p-4 border border-gray-200 dark:border-gray-700 rounded-xl relative bg-white dark:bg-gray-900/50">
                      {idx > 0 && <button type="button" onClick={()=>removeContacto(idx)} className="absolute -top-2 -right-2 p-1.5 bg-red-100 text-red-600 rounded-full shadow-sm"><X size={12}/></button>}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div><label className="block text-xs font-medium mb-1">Nombre</label><input required value={c.nombre} onChange={e=>handleContactoChange(idx, 'nombre', e.target.value)} className="w-full px-3 py-2 text-sm rounded-lg border dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-1 focus:ring-gloss-burgundy"/></div>
                        <div><label className="block text-xs font-medium mb-1">Apellidos</label><input required value={c.apellidos} onChange={e=>handleContactoChange(idx, 'apellidos', e.target.value)} className="w-full px-3 py-2 text-sm rounded-lg border dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-1 focus:ring-gloss-burgundy"/></div>
                        <div>
                          <label className="block text-xs font-medium mb-1">Tipo de Documento</label>
                          <select value={c.tipoDoc} onChange={e=>handleContactoChange(idx, 'tipoDoc', e.target.value)} className="w-full px-3 py-2 text-sm rounded-lg border dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-1 focus:ring-gloss-burgundy">
                            {documentosOpciones.map(opt => <option key={opt}>{opt}</option>)}
                          </select>
                        </div>
                        <div><label className="block text-xs font-medium mb-1">Número de Documento</label><input required value={c.numDoc} onChange={e=>handleContactoChange(idx, 'numDoc', e.target.value)} className="w-full px-3 py-2 text-sm rounded-lg border dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-1 focus:ring-gloss-burgundy"/></div>
                        
                        <div><label className="block text-xs font-medium mb-1">Cargo / Rol</label><input value={c.rol} onChange={e=>handleContactoChange(idx, 'rol', e.target.value)} className="w-full px-3 py-2 text-sm rounded-lg border dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-1 focus:ring-gloss-burgundy"/></div>
                        <div><label className="block text-xs font-medium mb-1">WhatsApp (Móvil)</label><input required value={c.telefono} onChange={e=>handleContactoChange(idx, 'telefono', e.target.value)} className="w-full px-3 py-2 text-sm rounded-lg border dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-1 focus:ring-gloss-burgundy"/></div>
                        <div className="lg:col-span-2"><label className="block text-xs font-medium mb-1">Correo Electrónico</label><input type="email" value={c.correo} onChange={e=>handleContactoChange(idx, 'correo', e.target.value)} className="w-full px-3 py-2 text-sm rounded-lg border dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-1 focus:ring-gloss-burgundy"/></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* BLOQUE: GOOGLE DRIVE Y ENLACES */}
              <div className="p-5 bg-gray-50 dark:bg-gray-900/40 rounded-xl border border-gray-100 dark:border-gray-800">
                <div className="mb-6">
                  <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase flex items-center gap-2 mb-2"><Cloud size={16}/> Carpeta de Google Drive (Obligatorio)</h4>
                  <p className="text-xs text-gray-500 mb-3">Pega aquí el enlace raíz de la carpeta maestra del cliente donde se alojan sus recursos, contratos y diseños.</p>
                  <input required type="url" value={form.linkDrive} onChange={e=>setForm({...form, linkDrive: e.target.value})} placeholder="https://drive.google.com/..." className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-1 focus:ring-gloss-burgundy"/>
                </div>

                <div className="flex justify-between items-center mb-4 border-t border-gray-200 dark:border-gray-800 pt-4">
                  <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase flex items-center gap-2"><Globe size={16}/> Enlaces y Redes Sociales</h4>
                  <button type="button" onClick={addEnlace} className="text-xs font-medium text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-blue-100"><Plus size={14}/> Añadir Enlace</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {form.enlaces?.map((enlace, idx) => (
                    <div key={idx} className="flex flex-col gap-2 p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900/50">
                      <div className="flex justify-between items-center">
                        <select value={enlace.red} onChange={e=>handleEnlaceChange(idx, 'red', e.target.value)} className="text-xs font-medium bg-transparent border-none focus:ring-0 p-0 text-gray-700 dark:text-gray-300">
                          {redesOpciones.map(opt => <option key={opt}>{opt}</option>)}
                        </select>
                        <button type="button" onClick={()=>removeEnlace(idx)} className="text-red-500 hover:text-red-700"><Trash2 size={14}/></button>
                      </div>
                      <input value={enlace.url} onChange={e=>handleEnlaceChange(idx, 'url', e.target.value)} placeholder="URL" className="w-full px-3 py-1.5 text-xs rounded-md border dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-1 focus:ring-gloss-burgundy"/>
                    </div>
                  ))}
                </div>
              </div>

              {/* BLOQUE: CONTRATO, PAGOS FRACCIONADOS Y METAS */}
              <div className="p-5 bg-gray-50 dark:bg-gray-900/40 rounded-xl border border-gray-100 dark:border-gray-800">
                <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase mb-4 flex items-center gap-2"><FileText size={16}/> Plan de Cobro Flexible y Estrategia</h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div>
                    <label className="block text-xs font-medium mb-1">Modelo Comercial</label>
                    <select value={form.contrato.esquema} onChange={e=>setForm({...form, contrato:{...form.contrato, esquema: e.target.value}})} className="w-full px-3 py-2 text-sm rounded-lg border dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-1 focus:ring-gloss-burgundy">
                      <option>Recurrente</option><option>Pago Único</option><option>Mixto / Proyecto</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Valor Total (Meta)</label>
                    <input required type="number" min="0" value={form.contrato.valor} onChange={e=>setForm({...form, contrato:{...form.contrato, valor: e.target.value}})} className="w-full px-3 py-2 text-sm rounded-lg border dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-1 focus:ring-gloss-burgundy"/>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Divisa</label>
                    <select value={form.contrato.divisa} onChange={e=>setForm({...form, contrato:{...form.contrato, divisa: e.target.value}})} className="w-full px-3 py-2 text-sm rounded-lg border dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-1 focus:ring-gloss-burgundy">
                      <option>COP</option><option>USD</option><option>MXN</option><option>EUR</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Medio de Pago Principal</label>
                    <select value={form.contrato.medioPago} onChange={e=>setForm({...form, contrato:{...form.contrato, medioPago: e.target.value}})} className="w-full px-3 py-2 text-sm rounded-lg border dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-1 focus:ring-gloss-burgundy">
                      <option>Transferencia Bancaria</option><option>Stripe / Tarjeta</option><option>Efectivo</option>
                    </select>
                  </div>
                </div>

                {/* Sub-Bloque: Plan de Pagos Fraccionado */}
                <div className="mb-6 p-4 bg-white dark:bg-gray-900/80 border border-gray-200 dark:border-gray-700 rounded-xl">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h5 className="text-sm font-bold text-gray-800 dark:text-gray-200">Plan de Pagos / Cuotas Esperadas</h5>
                      <p className="text-xs text-gray-500">Divide el cobro en anticipos, cuotas mensuales o hitos de entrega.</p>
                    </div>
                    <button type="button" onClick={addPlanPago} className="text-xs font-medium text-gloss-burgundy bg-gloss-pink/10 px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-gloss-pink/20"><Plus size={14}/> Añadir Cuota</button>
                  </div>
                  
                  {form.contrato.esquema === 'Recurrente' && (
                    <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-xs rounded-lg border border-blue-100 flex items-center gap-2">
                      <Calendar size={14}/> <span>Al ser un modelo Recurrente, también puedes fijar el <strong>Día de Corte Mensual:</strong></span>
                      <input type="number" min="1" max="31" value={form.contrato.diaCorte} onChange={e=>setForm({...form, contrato:{...form.contrato, diaCorte: e.target.value}})} className="w-16 px-2 py-1 text-xs rounded border border-blue-200 dark:border-blue-700 bg-white dark:bg-blue-900/50" placeholder="Ej: 5"/>
                    </div>
                  )}

                  <div className="space-y-2">
                    {form.contrato.planPagos.map((cuota, idx) => (
                      <div key={idx} className="flex flex-col md:flex-row gap-3 items-end md:items-center p-3 border border-gray-100 dark:border-gray-800 rounded-lg bg-gray-50 dark:bg-gray-900/40">
                        <div className="w-full md:flex-1">
                          <label className="block text-[10px] font-medium uppercase text-gray-500 mb-1">Concepto / Hito</label>
                          <input required value={cuota.concepto} onChange={e=>handlePlanPagoChange(idx, 'concepto', e.target.value)} placeholder="Ej: Anticipo 50%" className="w-full px-2 py-1.5 text-sm rounded border dark:border-gray-700 bg-white dark:bg-gray-800"/>
                        </div>
                        <div className="w-full md:w-32">
                          <label className="block text-[10px] font-medium uppercase text-gray-500 mb-1">Monto Esperado</label>
                          <input required type="number" value={cuota.monto} onChange={e=>handlePlanPagoChange(idx, 'monto', e.target.value)} className="w-full px-2 py-1.5 text-sm rounded border dark:border-gray-700 bg-white dark:bg-gray-800"/>
                        </div>
                        <div className="w-full md:w-40">
                          <label className="block text-[10px] font-medium uppercase text-gray-500 mb-1">Fecha Límite</label>
                          <input required type="date" value={cuota.fechaLimite} onChange={e=>handlePlanPagoChange(idx, 'fechaLimite', e.target.value)} className="w-full px-2 py-1.5 text-sm rounded border dark:border-gray-700 bg-white dark:bg-gray-800"/>
                        </div>
                        <div className="w-full md:w-32">
                          <label className="block text-[10px] font-medium uppercase text-gray-500 mb-1">Estado</label>
                          <select value={cuota.estado} onChange={e=>handlePlanPagoChange(idx, 'estado', e.target.value)} className="w-full px-2 py-1.5 text-sm rounded border dark:border-gray-700 bg-white dark:bg-gray-800 font-medium">
                            <option>Pendiente</option><option>Pagado</option>
                          </select>
                        </div>
                        <button type="button" onClick={()=>removePlanPago(idx)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16}/></button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-xs font-medium mb-1 flex items-center gap-1"><Target size={14}/> Objetivos y Metas Estratégicas</label>
                    <textarea value={form.contrato.objetivos} onChange={e=>setForm({...form, contrato:{...form.contrato, objetivos: e.target.value}})} placeholder="Ej. Lanzamiento de nueva sucursal..." className="w-full px-3 py-2 text-sm rounded-lg border dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-1 focus:ring-gloss-burgundy" rows="2"></textarea>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center pt-6 pb-2 sticky bottom-0 bg-white dark:bg-gloss-black">
                <div>
                  {isEditMode && (
                    <button type="button" onClick={() => handleDeleteCliente(form.id)} className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg flex items-center gap-2 transition-colors shadow-sm">
                      <Trash2 size={16} /> Eliminar Cliente
                    </button>
                  )}
                </div>
                <div className="flex justify-end gap-3">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">Cancelar</button>
                  <button type="submit" className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gloss-burgundy text-white font-medium hover:bg-gloss-burgundy/90 transition-colors shadow-lg shadow-gloss-burgundy/20">
                    <Save size={18} /> {isEditMode ? 'Guardar Cambios' : 'Crear Ficha'}
                  </button>
                </div>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
