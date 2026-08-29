import React, { useState } from 'react';
import { 
  X, Users, Building2, Plus, Pencil, Trash2, Check, 
  Mail, Briefcase, Phone, MapPin, FileText, Sparkles, ShieldCheck
} from 'lucide-react';
import { useConfig } from '../context/ConfigContext';

const COLOR_OPTIONS = [
  { label: 'Borgoña', class: 'bg-rose-600 text-white' },
  { label: 'Púrpura', class: 'bg-purple-600 text-white' },
  { label: 'Rosa', class: 'bg-pink-600 text-white' },
  { label: 'Ámbar', class: 'bg-amber-600 text-white' },
  { label: 'Azul', class: 'bg-blue-600 text-white' },
  { label: 'Esmeralda', class: 'bg-emerald-600 text-white' },
  { label: 'Índigo', class: 'bg-indigo-600 text-white' },
  { label: 'Gris Oscuro', class: 'bg-gray-800 text-white' },
];

export default function ConfigModal({ isOpen, onClose }) {
  const { 
    equipo, 
    datosAgencia, 
    addMiembro, 
    updateMiembro, 
    deleteMiembro, 
    updateDatosAgencia 
  } = useConfig();

  const [activeTab, setActiveTab] = useState('equipo'); // 'equipo' | 'agencia'
  
  // Estado para formulario de miembro (crear / editar)
  const [editingMember, setEditingMember] = useState(null); // null = no form, {} = nuevo o edit
  const [memberForm, setMemberForm] = useState({
    nombre: '',
    cargo: '',
    correo: '',
    color: 'bg-rose-600 text-white'
  });

  // Estado para formulario de agencia
  const [agenciaForm, setAgenciaForm] = useState({ ...datosAgencia });
  const [savedAgenciaAlert, setSavedAgenciaAlert] = useState(false);

  if (!isOpen) return null;

  const handleOpenAddMember = () => {
    setMemberForm({
      nombre: '',
      cargo: '',
      correo: '',
      color: 'bg-rose-600 text-white'
    });
    setEditingMember('new');
  };

  const handleOpenEditMember = (m) => {
    setMemberForm({
      nombre: m.nombre,
      cargo: m.cargo,
      correo: m.correo,
      color: m.color || 'bg-rose-600 text-white'
    });
    setEditingMember(m.id);
  };

  const handleSaveMember = (e) => {
    e.preventDefault();
    if (!memberForm.nombre.trim()) return;

    if (editingMember === 'new') {
      addMiembro(memberForm);
    } else if (typeof editingMember === 'number') {
      updateMiembro(editingMember, memberForm);
    }
    setEditingMember(null);
  };

  const handleSaveAgencia = (e) => {
    e.preventDefault();
    updateDatosAgencia(agenciaForm);
    setSavedAgenciaAlert(true);
    setTimeout(() => setSavedAgenciaAlert(false), 3000);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[90] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-gloss-black rounded-2xl w-full max-w-3xl shadow-2xl border border-gray-200 dark:border-gray-800 flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gloss-burgundy/10 dark:bg-gloss-burgundy/20 flex items-center justify-center text-gloss-burgundy dark:text-gloss-pink">
              <Sparkles size={20} />
            </div>
            <div>
              <h2 className="text-2xl font-zodiak font-bold text-gloss-burgundy dark:text-gloss-inverted">
                Configuración del Sistema
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Gestión de equipo interno y branding oficial de Gloss Growth OS
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
        <div className="flex border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/20 px-6 pt-3 gap-3 flex-shrink-0">
          <button
            onClick={() => { setActiveTab('equipo'); setEditingMember(null); }}
            className={`flex items-center gap-2 pb-3 px-4 text-sm font-bold border-b-2 transition-all ${
              activeTab === 'equipo'
                ? 'border-gloss-burgundy text-gloss-burgundy dark:border-gloss-pink dark:text-gloss-pink'
                : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-300'
            }`}
          >
            <Users size={16} />
            <span>Equipo de la Agencia ({equipo.length})</span>
          </button>

          <button
            onClick={() => { setActiveTab('agencia'); setEditingMember(null); }}
            className={`flex items-center gap-2 pb-3 px-4 text-sm font-bold border-b-2 transition-all ${
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
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
          
          {/* TAB 1: EQUIPO */}
          {activeTab === 'equipo' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white text-base">
                    Miembros del Equipo
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Alimentan automáticamente los selectores de responsable en Tareas, Calendario y CRM.
                  </p>
                </div>
                {!editingMember && (
                  <button
                    onClick={handleOpenAddMember}
                    className="flex items-center gap-1.5 bg-gloss-burgundy text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-gloss-burgundy/90 transition-all shadow-sm"
                  >
                    <Plus size={15} /> Añadir Miembro
                  </button>
                )}
              </div>

              {/* Formulario Inline de Crear/Editar */}
              {editingMember && (
                <form onSubmit={handleSaveMember} className="bg-gray-50 dark:bg-gray-900/60 p-5 rounded-2xl border border-gloss-burgundy/30 animate-scale-in space-y-4">
                  <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-800 pb-3">
                    <h4 className="font-bold text-sm text-gloss-burgundy dark:text-gloss-pink flex items-center gap-2">
                      <Briefcase size={16} />
                      {editingMember === 'new' ? 'Registrar Nuevo Miembro' : 'Editar Datos de Miembro'}
                    </h4>
                    <button 
                      type="button" 
                      onClick={() => setEditingMember(null)}
                      className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                    >
                      Cancelar
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">
                        Nombre Completo / Rol
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ej. Davilson"
                        value={memberForm.nombre}
                        onChange={(e) => setMemberForm({ ...memberForm, nombre: e.target.value })}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-gloss-burgundy outline-none font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">
                        Cargo / Especialidad
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ej. Director Creativo & Ads"
                        value={memberForm.cargo}
                        onChange={(e) => setMemberForm({ ...memberForm, cargo: e.target.value })}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-gloss-burgundy outline-none font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">
                        Correo Corporativo
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="ejemplo@glossgrowth.com"
                        value={memberForm.correo}
                        onChange={(e) => setMemberForm({ ...memberForm, correo: e.target.value })}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-gloss-burgundy outline-none font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">
                        Color de Avatar / Identificador
                      </label>
                      <div className="flex flex-wrap gap-2 pt-1">
                        {COLOR_OPTIONS.map((c, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setMemberForm({ ...memberForm, color: c.class })}
                            className={`w-7 h-7 rounded-full ${c.class.split(' ')[0]} flex items-center justify-center transition-transform ${
                              memberForm.color === c.class ? 'ring-2 ring-offset-2 ring-gloss-burgundy scale-110' : 'opacity-70 hover:opacity-100'
                            }`}
                            title={c.label}
                          >
                            {memberForm.color === c.class && <Check size={14} className="text-white" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setEditingMember(null)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-800"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl text-xs font-bold bg-gloss-burgundy text-white hover:bg-gloss-burgundy/90 shadow-sm"
                    >
                      Guardar Miembro
                    </button>
                  </div>
                </form>
              )}

              {/* Lista de Miembros */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {equipo.map((m) => (
                  <div
                    key={m.id}
                    className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/40 hover:border-gray-300 dark:hover:border-gray-700 flex items-center justify-between gap-3 transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0 ${m.color || 'bg-rose-600 text-white'}`}>
                        {m.iniciales || m.nombre.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-sm text-gray-900 dark:text-white truncate">
                          {m.nombre}
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {m.cargo}
                        </p>
                        <p className="text-[11px] text-gray-400 truncate flex items-center gap-1 mt-0.5">
                          <Mail size={11} /> {m.correo}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => handleOpenEditMember(m)}
                        className="p-1.5 text-gray-400 hover:text-gloss-burgundy hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                        title="Editar Miembro"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm(`¿Seguro que deseas eliminar a "${m.nombre}" del equipo?`)) {
                            deleteMiembro(m.id);
                          }
                        }}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Eliminar Miembro"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: DATOS DE LA AGENCIA */}
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
                  <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">
                    Correo Electrónico de Contacto
                  </label>
                  <input
                    type="email"
                    required
                    value={agenciaForm.correo}
                    onChange={(e) => setAgenciaForm({ ...agenciaForm, correo: e.target.value })}
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
          <span>Gloss Growth OS • Sistema de Gestión y Branding</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-semibold hover:opacity-80 transition-opacity"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
}
