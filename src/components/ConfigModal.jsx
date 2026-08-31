import React, { useState, useEffect, useCallback } from 'react';
import { 
  X, Users, Building2, Plus, Trash2, Check, 
  Mail, Phone, Sparkles, ShieldCheck, KeyRound, Copy,
  CheckCheck, Crown, RefreshCw, AlertCircle, Globe,
  Megaphone, Send, BellRing, AlertTriangle, Info, Clock
} from 'lucide-react';
import { useConfig } from '../context/ConfigContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';
import { logAuditoria } from '../utils/audit';

export default function ConfigModal({ isOpen, onClose }) {
  const { 
    datosAgencia, 
    updateDatosAgencia 
  } = useConfig();

  const { user, perfil, isSuperAdmin } = useAuth();

  const [activeTab, setActiveTab] = useState('miembros_db'); // 'miembros_db' | 'anuncios' | 'agencia'
  
  // Database-backed perfiles_usuarios list
  const [dbMembers, setDbMembers] = useState([]);
  const [loadingDbMembers, setLoadingDbMembers] = useState(false);

  // New Member Modal / Form
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newMemberForm, setNewMemberForm] = useState({
    email: '',
    rol: 'socio',
    codigo_acceso: '',
  });
  const [copiedCode, setCopiedCode] = useState(null);
  const [addError, setAddError] = useState('');
  const [lastCreatedInvitation, setLastCreatedInvitation] = useState(null);

  // SuperAdmin Announcement Panel State
  const [anuncioForm, setAnuncioForm] = useState({
    titulo: '',
    mensaje: '',
    prioridad: 'Normal', // 'Normal' | 'Importante' | 'Urgente'
  });
  const [anuncioSending, setAnuncioSending] = useState(false);
  const [anuncioSuccess, setAnuncioSuccess] = useState(false);
  const [historialAnuncios, setHistorialAnuncios] = useState([]);
  const [loadingAnuncios, setLoadingAnuncios] = useState(false);

  // Agency Form
  const [agenciaForm, setAgenciaForm] = useState({ ...datosAgencia });
  const [savedAgenciaAlert, setSavedAgenciaAlert] = useState(false);

  const generateRandomCode = () => {
    return `GLOSS-${Math.floor(1000 + Math.random() * 9000)}`;
  };

  const fetchDbMembers = useCallback(async () => {
    setLoadingDbMembers(true);
    try {
      const { data, error } = await supabase
        .from('perfiles_usuarios')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setDbMembers(data);
      }
    } catch (err) {
      console.error('Error loading db members:', err);
    } finally {
      setLoadingDbMembers(false);
    }
  }, []);

  const fetchHistorialAnuncios = useCallback(async () => {
    setLoadingAnuncios(true);
    try {
      const { data, error } = await supabase
        .from('notificaciones')
        .select('*')
        .in('tipo', ['anuncio', 'sistema', 'anuncio_urgente', 'anuncio_importante'])
        .order('created_at', { ascending: false })
        .limit(20);

      if (!error && data) {
        setHistorialAnuncios(data);
      }
    } catch (err) {
      console.error('Error fetching announcements:', err);
    } finally {
      setLoadingAnuncios(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchDbMembers();
      if (isSuperAdmin) {
        fetchHistorialAnuncios();
      }
      setAgenciaForm({ ...datosAgencia });
      setLastCreatedInvitation(null);
      setAddError('');
      setAnuncioSuccess(false);
    }
  }, [isOpen, fetchDbMembers, fetchHistorialAnuncios, datosAgencia, isSuperAdmin]);

  if (!isOpen) return null;

  const handleOpenAddModal = () => {
    setNewMemberForm({
      email: '',
      rol: 'socio',
      codigo_acceso: generateRandomCode(),
    });
    setAddError('');
    setLastCreatedInvitation(null);
    setIsAddModalOpen(true);
  };

  const handleSaveNewMember = async (e) => {
    e.preventDefault();
    setAddError('');

    const emailTrimmed = (newMemberForm.email || '').trim().toLowerCase();
    const codeTrimmed = (newMemberForm.codigo_acceso || '').trim().toUpperCase();

    if (!emailTrimmed) {
      setAddError('Ingresa un correo electrónico válido.');
      return;
    }
    if (!codeTrimmed) {
      setAddError('Ingresa o genera un código de acceso.');
      return;
    }

    // Check if email already exists
    const exists = dbMembers.some((m) => m.email?.toLowerCase() === emailTrimmed);
    if (exists) {
      setAddError('Ya existe un miembro o invitación registrada con este correo.');
      return;
    }

    try {
      const payload = {
        email: emailTrimmed,
        rol: newMemberForm.rol,
        codigo_acceso: codeTrimmed,
        perfil_completado: false,
        activo: true,
        nombre_completo: emailTrimmed.split('@')[0],
      };

      const { data, error } = await supabase
        .from('perfiles_usuarios')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;

      await logAuditoria(
        user,
        'Configuración / Equipo',
        'CREAR',
        `Invitación creada para ${emailTrimmed} con rol ${newMemberForm.rol}`
      );

      setLastCreatedInvitation(data);
      setIsAddModalOpen(false);
      fetchDbMembers();
    } catch (err) {
      console.error('Error inserting member:', err);
      setAddError(err.message || 'Error al guardar la invitación.');
    }
  };

  const handleDeleteMember = async (memberId, memberEmail) => {
    if (memberEmail?.toLowerCase() === user?.email?.toLowerCase()) {
      alert('No puedes eliminar tu propia cuenta de administrador.');
      return;
    }

    if (
      window.confirm(
        `¿Seguro que deseas revocar el acceso y eliminar a "${memberEmail}" de Gloss Growth OS?`
      )
    ) {
      try {
        await supabase.from('perfiles_usuarios').delete().eq('id', memberId);
        await logAuditoria(
          user,
          'Configuración / Equipo',
          'ELIMINAR',
          `Acceso revocado a ${memberEmail}`
        );
        fetchDbMembers();
      } catch (err) {
        console.error('Error deleting member:', err);
        alert('Hubo un error al eliminar el miembro.');
      }
    }
  };

  // Enviar Anuncio a Todo el Equipo (SuperAdmin Exclusivo)
  const handleEnviarAnuncio = async (e) => {
    e.preventDefault();
    if (!anuncioForm.titulo.trim() || !anuncioForm.mensaje.trim()) {
      alert('Por favor completa el título y los detalles del anuncio.');
      return;
    }

    setAnuncioSending(true);
    setAnuncioSuccess(false);

    const autorNombre = perfil?.nombre_completo || user?.user_metadata?.full_name || user?.email || 'SuperAdmin';
    const tipoFinal = anuncioForm.prioridad === 'Urgente' 
      ? 'anuncio_urgente' 
      : anuncioForm.prioridad === 'Importante' 
      ? 'anuncio_importante' 
      : 'anuncio';

    const tituloConPrioridad = anuncioForm.prioridad === 'Urgente'
      ? `🚨 [URGENTE] ${anuncioForm.titulo.trim()}`
      : anuncioForm.prioridad === 'Importante'
      ? `📢 [IMPORTANTE] ${anuncioForm.titulo.trim()}`
      : `📣 ${anuncioForm.titulo.trim()}`;

    const payload = {
      titulo: tituloConPrioridad,
      mensaje: anuncioForm.mensaje.trim(),
      tipo: tipoFinal,
      enlace: '/',
      leido: false,
    };

    try {
      // Intentar insertar con campo autor si la tabla lo soporta
      let { data, error } = await supabase.from('notificaciones').insert([{ ...payload, autor: autorNombre }]).select();
      
      if (error && error.message?.includes('autor')) {
        // Si no existe la columna autor en la tabla, insertar payload estándar
        const retry = await supabase.from('notificaciones').insert([payload]).select();
        data = retry.data;
        error = retry.error;
      }

      if (error) throw error;

      await logAuditoria(
        user,
        'Panel de Anuncios',
        'CREAR',
        `Anuncio emitido a todo el equipo: "${anuncioForm.titulo}" (Prioridad: ${anuncioForm.prioridad})`
      );

      setAnuncioSuccess(true);
      setAnuncioForm({ titulo: '', mensaje: '', prioridad: 'Normal' });
      fetchHistorialAnuncios();
      setTimeout(() => setAnuncioSuccess(false), 4000);
    } catch (err) {
      console.error('Error al emitir anuncio:', err);
      alert('Hubo un error al enviar el anuncio: ' + err.message);
    } finally {
      setAnuncioSending(false);
    }
  };

  
  const handleClearHistorial = async () => {
    if (window.confirm('¿ATENCIÓN: Estás a punto de VACIAR todo el historial de notificaciones. Esta acción no se puede deshacer. ¿Deseas continuar?')) {
      try {
        await supabase.from('notificaciones').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        setHistorialAnuncios([]);
        alert('Historial de notificaciones vaciado con éxito.');
      } catch (err) {
        console.error('Error clearing announcements:', err);
      }
    }
  };

  const handleDeleteAnuncio = async (id) => {
    if (window.confirm('¿Eliminar este anuncio del historial de notificaciones?')) {
      try {
        await supabase.from('notificaciones').delete().eq('id', id);
        setHistorialAnuncios(prev => prev.filter(a => a.id !== id));
      } catch (err) {
        console.error('Error deleting announcement:', err);
      }
    }
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const handleSaveAgencia = (e) => {
    e.preventDefault();
    updateDatosAgencia(agenciaForm);
    setSavedAgenciaAlert(true);
    setTimeout(() => setSavedAgenciaAlert(false), 3000);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[90] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-gloss-black rounded-3xl w-full max-w-4xl shadow-2xl border border-gray-200 dark:border-gray-800 flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gloss-burgundy/10 dark:bg-gloss-pink/10 flex items-center justify-center text-gloss-burgundy dark:text-gloss-pink">
              <Sparkles size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-zodiak font-bold text-gloss-burgundy dark:text-gloss-inverted">
                  Configuración del Sistema
                </h2>
                {isSuperAdmin && (
                  <span className="bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700/60 text-[10px] font-black uppercase px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Crown size={11} /> SuperAdmin
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Control de acceso, gestión de miembros, anuncios del equipo e identidad oficial
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-full text-gray-400 hover:text-gray-700 dark:hover:text-white bg-gray-200 dark:bg-gray-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/20 px-6 pt-3 gap-2 flex-shrink-0 overflow-x-auto custom-scrollbar">
          <button
            onClick={() => setActiveTab('miembros_db')}
            className={`flex items-center gap-2 pb-3 px-4 text-xs sm:text-sm font-bold border-b-2 whitespace-nowrap transition-all ${
              activeTab === 'miembros_db'
                ? 'border-gloss-burgundy text-gloss-burgundy dark:border-gloss-pink dark:text-gloss-pink'
                : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-300'
            }`}
          >
            <Users size={16} />
            <span>Miembros & Invitaciones ({dbMembers.length})</span>
          </button>

          {/* SuperAdmin Exclusive Tab */}
          {isSuperAdmin && (
            <button
              onClick={() => setActiveTab('anuncios')}
              className={`flex items-center gap-2 pb-3 px-4 text-xs sm:text-sm font-bold border-b-2 whitespace-nowrap transition-all ${
                activeTab === 'anuncios'
                  ? 'border-amber-600 text-amber-700 dark:border-amber-400 dark:text-amber-300'
                  : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-300'
              }`}
            >
              <Megaphone size={16} className="text-amber-600 dark:text-amber-400" />
              <span>Panel de Anuncios</span>
              <span className="text-[9px] bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 px-1.5 py-0.2 rounded font-black uppercase">
                Admin
              </span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('agencia')}
            className={`flex items-center gap-2 pb-3 px-4 text-xs sm:text-sm font-bold border-b-2 whitespace-nowrap transition-all ${
              activeTab === 'agencia'
                ? 'border-gloss-burgundy text-gloss-burgundy dark:border-gloss-pink dark:text-gloss-pink'
                : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-300'
            }`}
          >
            <Building2 size={16} />
            <span>Datos de la Agencia & PDF</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
          
          {/* TAB 1: GESTIÓN DE MIEMBROS */}
          {activeTab === 'miembros_db' && (
            <div className="space-y-5">
              
              {/* Header Action Bar */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white text-base">
                    Equipo Autorizado de Gloss Growth
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Solo los usuarios con una invitación registrada pueden acceder con Google OAuth.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={fetchDbMembers}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                    title="Actualizar lista"
                  >
                    <RefreshCw size={15} className={loadingDbMembers ? 'animate-spin' : ''} />
                  </button>

                  {isSuperAdmin && (
                    <button
                      onClick={handleOpenAddModal}
                      className="flex items-center gap-1.5 bg-gloss-burgundy text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-gloss-burgundy/90 transition-all shadow-md"
                    >
                      <Plus size={15} /> Añadir Miembro / Invitar
                    </button>
                  )}
                </div>
              </div>

              {/* Banner with Last Created Invitation Details */}
              {lastCreatedInvitation && (
                <div className="p-4 bg-gloss-pink/15 dark:bg-gloss-pink/10 border border-gloss-pink/40 rounded-2xl animate-scale-in">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <KeyRound size={18} className="text-gloss-burgundy dark:text-gloss-pink" />
                      <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                        ¡Invitación Generada con Éxito!
                      </h4>
                    </div>
                    <button
                      onClick={() => setLastCreatedInvitation(null)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                    Envía este código de acceso a <strong className="text-gloss-burgundy dark:text-gloss-pink">{lastCreatedInvitation.email}</strong> para que complete su registro al iniciar sesión con Google:
                  </p>
                  <div className="mt-2.5 flex items-center gap-2">
                    <span className="font-mono text-sm font-black bg-white dark:bg-gray-900 px-3 py-1.5 rounded-xl border border-gloss-burgundy/30 text-gloss-burgundy dark:text-gloss-pink">
                      {lastCreatedInvitation.codigo_acceso}
                    </span>
                    <button
                      onClick={() => copyToClipboard(lastCreatedInvitation.codigo_acceso, 'last_created')}
                      className="flex items-center gap-1 text-xs bg-white dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 font-semibold"
                    >
                      {copiedCode === 'last_created' ? (
                        <>
                          <CheckCheck size={14} className="text-green-500" />
                          <span className="text-green-600 dark:text-green-400">¡Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy size={14} />
                          <span>Copiar Código</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Members Table */}
              <div className="border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden bg-white dark:bg-gloss-black">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs min-w-[650px]">
                    <thead className="bg-gray-50/80 dark:bg-gray-900/60 border-b border-gray-100 dark:border-gray-800 text-gray-400 dark:text-gray-500 uppercase tracking-wider font-bold text-[10px]">
                      <tr>
                        <th className="py-3 px-4">Miembro / Correo</th>
                        <th className="py-3 px-4">Rol</th>
                        <th className="py-3 px-4">Código de Acceso</th>
                        <th className="py-3 px-4">Estado</th>
                        <th className="py-3 px-4">Teléfono</th>
                        {isSuperAdmin && <th className="py-3 px-4 text-center">Acciones</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {dbMembers.map((m) => {
                        const isYou = m.email?.toLowerCase() === user?.email?.toLowerCase();
                        const isComplete = m.perfil_completado;

                        return (
                          <tr 
                            key={m.id} 
                            className={`hover:bg-gray-50 dark:hover:bg-gray-900/40 transition-colors ${
                              isYou ? 'bg-gloss-burgundy/[0.02] dark:bg-gloss-pink/[0.02]' : ''
                            }`}
                          >
                            {/* Member info */}
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-gloss-burgundy/10 dark:bg-gloss-pink/15 flex items-center justify-center font-bold text-gloss-burgundy dark:text-gloss-pink flex-shrink-0">
                                  {(m.nombre_completo || m.email).slice(0, 2).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-gray-900 dark:text-white truncate">
                                      {m.nombre_completo || 'Invitación Pendiente'}
                                    </span>
                                    {isYou && (
                                      <span className="text-[9px] bg-gloss-burgundy text-white px-1.5 py-0.2 rounded font-bold">
                                        Tú
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[11px] text-gray-400 block truncate">
                                    {m.email}
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* Rol */}
                            <td className="py-3.5 px-4">
                              <span className={`px-2 py-0.5 rounded-full font-bold uppercase text-[9px] border ${
                                m.rol === 'superadmin' 
                                  ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300' 
                                  : m.rol === 'socio'
                                  ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border-purple-300'
                                  : m.rol === 'comercial'
                                  ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border-blue-300'
                                  : m.rol === 'media_buyer'
                                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300'
                                  : m.rol === 'edicion_multimedia'
                                  ? 'bg-fuchsia-100 dark:bg-fuchsia-950/60 text-fuchsia-800 dark:text-fuchsia-300 border-fuchsia-300'
                                  : m.rol === 'closer'
                                  ? 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border-indigo-300'
                                  : m.rol === 'setter'
                                  ? 'bg-cyan-100 dark:bg-cyan-950/60 text-cyan-800 dark:text-cyan-300 border-cyan-300'
                                  : m.rol === 'lavaculos'
                                  ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-300'
                                  : m.rol === 'junior'
                                  ? 'bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border-sky-300'
                                  : m.rol === 'social_media'
                                  ? 'bg-violet-100 dark:bg-violet-950/60 text-violet-800 dark:text-violet-300 border-violet-300'
                                  : m.rol === 'comunicaciones'
                                  ? 'bg-teal-100 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border-teal-300'
                                  : m.rol === 'ugc'
                                  ? 'bg-orange-100 dark:bg-orange-950/60 text-orange-800 dark:text-orange-300 border-orange-300'
                                  : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 border-gray-300'
                              }`}>
                                {m.rol === 'edicion_multimedia' ? 'Edición Multimedia' : m.rol === 'social_media' ? 'Social Media' : m.rol}
                              </span>
                            </td>

                            {/* Código de Acceso */}
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-1.5">
                                <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded font-mono font-bold text-gray-800 dark:text-gray-200">
                                  {m.codigo_acceso}
                                </code>
                                <button
                                  onClick={() => copyToClipboard(m.codigo_acceso, m.id)}
                                  className="p-1 text-gray-400 hover:text-gloss-burgundy dark:hover:text-gloss-pink rounded transition-colors"
                                  title="Copiar código"
                                >
                                  {copiedCode === m.id ? (
                                    <CheckCheck size={13} className="text-green-500" />
                                  ) : (
                                    <Copy size={13} />
                                  )}
                                </button>
                              </div>
                            </td>

                            {/* Estado */}
                            <td className="py-3.5 px-4">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isComplete 
                                  ? 'bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400' 
                                  : 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${isComplete ? 'bg-green-500' : 'bg-amber-500'}`} />
                                {isComplete ? 'Activo' : 'Pendiente Onboarding'}
                              </span>
                            </td>

                            {/* Teléfono */}
                            <td className="py-3.5 px-4 text-gray-500 dark:text-gray-400">
                              {m.telefono || '—'}
                            </td>

                            {/* Acciones */}
                            {isSuperAdmin && (
                              <td className="py-3.5 px-4 text-center">
                                {!isYou ? (
                                  <button
                                    onClick={() => handleDeleteMember(m.id, m.email)}
                                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                    title="Revocar acceso"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                ) : (
                                  <span className="text-gray-300 dark:text-gray-700 text-[11px] font-mono">—</span>
                                )}
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PANEL DE ANUNCIOS (EXCLUSIVO SUPERADMIN) */}
          {activeTab === 'anuncios' && isSuperAdmin && (
            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-gray-900 dark:text-white text-base">
                    Panel de Anuncios y Comunicados Oficiales
                  </h3>
                  <span className="bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-[10px] font-black uppercase px-2 py-0.5 rounded-full">
                    SuperAdmin
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Emite alertas prioritarias y notificaciones en tiempo real que se proyectarán en la campana de todos los miembros del equipo.
                </p>
              </div>

              {anuncioSuccess && (
                <div className="p-4 bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 rounded-2xl text-xs text-green-800 dark:text-green-300 font-bold flex items-center gap-2.5 animate-scale-in">
                  <CheckCircle2 size={18} className="text-green-600 dark:text-green-400 flex-shrink-0" />
                  <span>¡Anuncio publicado y transmitido con éxito a todo el equipo de Gloss Growth OS!</span>
                </div>
              )}

              {/* Formulario de Emisión */}
              <form onSubmit={handleEnviarAnuncio} className="p-5 bg-gray-50/80 dark:bg-gray-900/50 rounded-2xl border border-gray-200 dark:border-gray-800 space-y-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-gray-600 dark:text-gray-400 mb-1.5">
                    Título del Anuncio *
                  </label>
                  <input 
                    type="text"
                    required
                    value={anuncioForm.titulo}
                    onChange={(e) => setAnuncioForm({ ...anuncioForm, titulo: e.target.value })}
                    placeholder="Ej. Nueva Actualización: Directrices de entregables para clientes..."
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 font-bold outline-none focus:ring-2 focus:ring-amber-500 text-gray-900 dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold uppercase text-gray-600 dark:text-gray-400 mb-1.5">
                      Detalles del Anuncio *
                    </label>
                    <textarea 
                      required
                      rows={3}
                      value={anuncioForm.mensaje}
                      onChange={(e) => setAnuncioForm({ ...anuncioForm, mensaje: e.target.value })}
                      placeholder="Escribe el cuerpo del comunicado, indicaciones o fechas límite para el equipo..."
                      className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 font-medium outline-none focus:ring-2 focus:ring-amber-500 text-gray-900 dark:text-white resize-y"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase text-gray-600 dark:text-gray-400 mb-1.5">
                      Nivel de Prioridad
                    </label>
                    <select
                      value={anuncioForm.prioridad}
                      onChange={(e) => setAnuncioForm({ ...anuncioForm, prioridad: e.target.value })}
                      className="w-full px-3 py-2.5 text-xs font-bold rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer text-gray-900 dark:text-white"
                    >
                      <option value="Normal">Normal (Gris)</option>
                      <option value="Importante">Importante (Azul)</option>
                      <option value="Urgente">Urgente (Rojo)</option>
                    </select>

                    <div className="mt-3 p-2.5 rounded-xl border text-[11px] font-semibold flex items-center gap-1.5 ${
                      anuncioForm.prioridad === 'Urgente'
                        ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800'
                        : anuncioForm.prioridad === 'Importante'
                        ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
                        : 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700'
                    }">
                      {anuncioForm.prioridad === 'Urgente' ? (
                        <AlertTriangle size={13} className="text-red-600 flex-shrink-0" />
                      ) : anuncioForm.prioridad === 'Importante' ? (
                        <Info size={13} className="text-blue-600 flex-shrink-0" />
                      ) : (
                        <BellRing size={13} className="text-gray-500 flex-shrink-0" />
                      )}
                      <span>Vista previa: {anuncioForm.prioridad}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={anuncioSending}
                    className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-md flex items-center gap-2 text-xs disabled:opacity-50"
                  >
                    <Send size={14} />
                    <span>{anuncioSending ? 'Transmitiendo...' : 'Enviar a todo el equipo'}</span>
                  </button>
                </div>
              </form>

              {/* Historial de Anuncios Publicados */}
              
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Clock size={14} /> Historial de Anuncios Recientes
                    </h4>
                    {(isSuperAdmin ?? false) && (
                      <button 
                        onClick={handleClearHistorial}
                        className="text-[10px] bg-red-50 dark:bg-red-900/20 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/40 px-2 py-1 rounded font-bold transition-colors"
                      >
                        Vaciar Historial
                      </button>
                    )}
                  </div>

                <div className="border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden bg-white dark:bg-gloss-black divide-y divide-gray-100 dark:divide-gray-800 max-h-56 overflow-y-auto custom-scrollbar">
                  {loadingAnuncios ? (
                    <div className="p-6 text-center text-gray-400 text-xs">Cargando historial...</div>
                  ) : historialAnuncios.length === 0 ? (
                    <div className="p-6 text-center text-gray-400 text-xs">No hay comunicados registrados aún.</div>
                  ) : (
                    historialAnuncios.map((item) => (
                      <div key={item.id} className="p-3.5 flex items-start justify-between gap-3 hover:bg-gray-50 dark:hover:bg-gray-900/30 transition-colors">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                              item.tipo === 'anuncio_urgente'
                                ? 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300'
                                : item.tipo === 'anuncio_importante'
                                ? 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300'
                                : 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300'
                            }`}>
                              {item.tipo === 'anuncio_urgente' ? 'Urgente' : item.tipo === 'anuncio_importante' ? 'Importante' : 'Normal'}
                            </span>
                            <span className="font-bold text-xs text-gray-900 dark:text-white truncate">
                              {item.titulo}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                            {item.mensaje}
                          </p>
                          <span className="text-[10px] text-gray-400 mt-1 block">
                            {new Date(item.created_at).toLocaleString()}
                          </span>
                        </div>
                        <button
                          onClick={() => handleDeleteAnuncio(item.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex-shrink-0"
                          title="Eliminar comunicado"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: DATOS DE LA AGENCIA */}
          {activeTab === 'agencia' && (
            <form onSubmit={handleSaveAgencia} className="space-y-6">
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white text-base">
                  Identidad y Datos Fiscales de la Agencia
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Esta información alimenta automáticamente los encabezados, membretes y términos legales de las cotizaciones PDF.
                </p>
              </div>

              {savedAgenciaAlert && (
                <div className="p-3 bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-xl text-xs text-green-800 dark:text-green-300 font-bold flex items-center gap-2 animate-scale-in">
                  <ShieldCheck size={16} /> ¡Datos de la agencia actualizados y sincronizados con éxito!
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">
                    Nombre Oficial / Razón Social
                  </label>
                  <input
                    type="text"
                    required
                    value={agenciaForm.nombre}
                    onChange={(e) => setAgenciaForm({ ...agenciaForm, nombre: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-gloss-burgundy outline-none font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">
                    NIT / Identificación Tributaria
                  </label>
                  <input
                    type="text"
                    required
                    value={agenciaForm.nit}
                    onChange={(e) => setAgenciaForm({ ...agenciaForm, nit: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-gloss-burgundy outline-none font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">
                    Dirección Física / Oficina
                  </label>
                  <input
                    type="text"
                    required
                    value={agenciaForm.direccion}
                    onChange={(e) => setAgenciaForm({ ...agenciaForm, direccion: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-gloss-burgundy outline-none font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">
                    Ciudad y País
                  </label>
                  <input
                    type="text"
                    required
                    value={agenciaForm.ciudad}
                    onChange={(e) => setAgenciaForm({ ...agenciaForm, ciudad: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-gloss-burgundy outline-none font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">
                    Teléfono / WhatsApp Comercial
                  </label>
                  <input
                    type="text"
                    required
                    value={agenciaForm.telefono}
                    onChange={(e) => setAgenciaForm({ ...agenciaForm, telefono: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-gloss-burgundy outline-none font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1 flex items-center gap-1">
                    <Globe size={12} className="text-gloss-burgundy dark:text-gloss-pink" />
                    Sitio Web / URL Oficial
                  </label>
                  <input
                    type="url"
                    placeholder="https://glossgrowthhq.com/"
                    value={agenciaForm.sitio_web || agenciaForm.website || ''}
                    onChange={(e) => setAgenciaForm({ ...agenciaForm, sitio_web: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-gloss-burgundy outline-none font-medium"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">
                    Lema / Subtítulo Corporativo (Membrete PDF)
                  </label>
                  <input
                    type="text"
                    required
                    value={agenciaForm.lema}
                    onChange={(e) => setAgenciaForm({ ...agenciaForm, lema: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-gloss-burgundy outline-none font-medium"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex justify-end">
                <button
                  type="submit"
                  className="bg-gloss-burgundy text-white px-8 py-2.5 rounded-xl font-bold hover:bg-gloss-burgundy/90 transition-all shadow-md flex items-center gap-2 text-sm"
                >
                  <Check size={16} /> Guardar Cambios de la Agencia
                </button>
              </div>
            </form>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/20 flex-shrink-0 text-xs text-gray-500">
          <span>Gloss Growth OS • Sistema de Seguridad y Control de Acceso</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-semibold hover:opacity-80 transition-opacity"
          >
            Cerrar
          </button>
        </div>

      </div>

      {/* SUBMODAL: AÑADIR MIEMBRO / GENERAR INVITACIÓN */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-gloss-black rounded-3xl w-full max-w-md p-6 shadow-2xl border border-gray-200 dark:border-gray-800 relative">
            <button
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full text-gray-400 hover:text-gray-700 dark:hover:text-white"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-2.5 mb-5 border-b border-gray-100 dark:border-gray-800 pb-3">
              <div className="w-9 h-9 rounded-xl bg-gloss-burgundy/10 dark:bg-gloss-pink/10 flex items-center justify-center text-gloss-burgundy dark:text-gloss-pink font-bold">
                <Plus size={18} />
              </div>
              <div>
                <h3 className="font-zodiak font-bold text-lg text-gray-900 dark:text-white">
                  Añadir Miembro al Equipo
                </h3>
                <p className="text-xs text-gray-400">
                  Genera una invitación por código para un nuevo socio o colaborador
                </p>
              </div>
            </div>

            {addError && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-700 dark:text-red-300 flex items-start gap-2">
                <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
                <span>{addError}</span>
              </div>
            )}

            <form onSubmit={handleSaveNewMember} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase text-gray-500 mb-1">
                  Correo Electrónico (Google)
                </label>
                <input
                  type="email"
                  required
                  placeholder="socio@gmail.com"
                  value={newMemberForm.email}
                  onChange={(e) => setNewMemberForm({ ...newMemberForm, email: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-gloss-burgundy outline-none font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-gray-500 mb-1">
                  Rol en la Agencia
                </label>
                <select
                  value={newMemberForm.rol}
                  onChange={(e) => setNewMemberForm({ ...newMemberForm, rol: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-gloss-burgundy outline-none font-medium cursor-pointer"
                >
                  <option value="socio">Socio / Director</option>
                  <option value="comercial">Equipo Comercial / Ventas</option>
                  <option value="media_buyer">Media Buyer / Trafficker</option>
                  <option value="edicion_multimedia">Edición Multimedia</option>
                  <option value="closer">Closer</option>
                  <option value="setter">Setter</option>
                  <option value="lavaculos">Lavaculos</option>
                  <option value="junior">Junior</option>
                  <option value="social_media">Social Media</option>
                  <option value="comunicaciones">Comunicaciones</option>
                  <option value="ugc">UGC</option>
                  <option value="superadmin">SuperAdmin</option>
                </select>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-[11px] font-bold uppercase text-gray-500">
                    Código de Acceso / Invitación
                  </label>
                  <button
                    type="button"
                    onClick={() => setNewMemberForm({ ...newMemberForm, codigo_acceso: generateRandomCode() })}
                    className="text-[11px] text-gloss-burgundy dark:text-gloss-pink hover:underline font-semibold flex items-center gap-1"
                  >
                    <RefreshCw size={11} /> Regenerar
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={newMemberForm.codigo_acceso}
                  onChange={(e) => setNewMemberForm({ ...newMemberForm, codigo_acceso: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-gloss-burgundy outline-none font-mono font-bold tracking-wider uppercase text-gray-900 dark:text-white"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-gloss-burgundy text-white hover:bg-gloss-burgundy/90 shadow-md"
                >
                  Crear Invitación
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
