import { useState, useEffect } from 'react';
import { 
  X, CreditCard, AlignLeft, CheckSquare, MessageSquare, Send, 
  User, Tag, Calendar, Link2, Trash2, Plus, Check, Users
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';

export default function KanbanTareasModal({ 
  selectedTarea, 
  setSelectedTarea, 
  updateSelected, 
  tareas, 
  setTareas, 
  handleSaveModal, 
  CLIENTES_MOCK = [], 
  ETIQUETAS_COLORES = [] 
}) {
  const { user } = useAuth();
  const [showTagMenu, setShowTagMenu] = useState(false);
  const [newTagText, setNewTagText] = useState('');
  const [selectedTagColor, setSelectedTagColor] = useState(ETIQUETAS_COLORES[0]?.class || 'bg-blue-100 text-blue-700 border-blue-200');
  
  const [showLinkMenu, setShowLinkMenu] = useState(false);
  const [showAsignadosMenu, setShowAsignadosMenu] = useState(false);
  const [newLinkTitle, setNewLinkTitle] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [showDateMenu, setShowDateMenu] = useState(false);
  const [newCheckItem, setNewCheckItem] = useState('');
  const [newComment, setNewComment] = useState('');
  
  // Real team members fetched from Supabase database
  const [dbMiembros, setDbMiembros] = useState([]);
  const [loadingMiembros, setLoadingMiembros] = useState(false);

  useEffect(() => {
    const fetchMiembros = async () => {
      setLoadingMiembros(true);
      try {
        const { data, error } = await supabase
          .from('perfiles_usuarios')
          .select('id, nombre_completo, email, rol')
          .eq('perfil_completado', true)
          .order('nombre_completo', { ascending: true });

        if (!error && data && data.length > 0) {
          setDbMiembros(data);
        } else {
          // Fallback if no members have completed profile yet
          const { data: allUsers } = await supabase
            .from('perfiles_usuarios')
            .select('id, nombre_completo, email, rol');
          if (allUsers && allUsers.length > 0) {
            setDbMiembros(allUsers);
          }
        }
      } catch (err) {
        console.error('Error fetching perfiles_usuarios:', err);
      } finally {
        setLoadingMiembros(false);
      }
    };

    fetchMiembros();
  }, []);

  if (!selectedTarea) return null;
  const tarea = selectedTarea || {};

  // Normalizar checklist para garantizar formato { id, texto, completado }
  const checklist = (tarea.checklist || []).map((c, idx) => ({
    id: c.id || idx + 1,
    texto: c.texto || c.text || '',
    completado: Boolean(c.completado)
  }));

  const totalCheck = checklist.length;
  const completedCheck = checklist.filter(c => c.completado).length;
  const progressPercent = totalCheck > 0 ? Math.round((completedCheck / totalCheck) * 100) : 0;

  // Añadir ítem a checklist
  const handleAddCheckItem = (e) => {
    if (e) e.preventDefault();
    if (!newCheckItem.trim()) return;
    const newItem = {
      id: Date.now(),
      texto: newCheckItem.trim(),
      completado: false
    };
    updateSelected({ checklist: [...checklist, newItem] });
    setNewCheckItem('');
  };

  // Alternar estado de ítem en checklist
  const handleToggleCheck = (id) => {
    const updated = checklist.map(item => item.id === id ? { ...item, completado: !item.completado } : item);
    updateSelected({ checklist: updated });
  };

  // Eliminar ítem de checklist
  const handleDeleteCheckItem = (id) => {
    const updated = checklist.filter(item => item.id !== id);
    updateSelected({ checklist: updated });
  };

  // Editar texto de ítem
  const handleEditCheckText = (id, newText) => {
    const updated = checklist.map(item => item.id === id ? { ...item, texto: newText } : item);
    updateSelected({ checklist: updated });
  };

  // Añadir etiqueta
  const handleAddTag = () => {
    if (!newTagText.trim()) return;
    const newTag = {
      id: Date.now(),
      text: newTagText.trim(),
      colorClass: selectedTagColor
    };
    updateSelected({ etiquetas: [...(tarea.etiquetas || []), newTag] });
    setNewTagText('');
    setShowTagMenu(false);
  };

  // Eliminar etiqueta
  const handleRemoveTag = (indexToRemove) => {
    const updated = (tarea.etiquetas || []).filter((_, idx) => idx !== indexToRemove);
    updateSelected({ etiquetas: updated });
  };

  // Asignar Miembro Real de la Base de Datos
  const handleAssignUser = (miembro) => {
    const nombreCompleto = typeof miembro === 'string' ? miembro : miembro.nombre_completo || miembro.email;
    const miembroId = typeof miembro === 'object' ? miembro.id : null;
    const miembroEmail = typeof miembro === 'object' ? miembro.email : null;

    const currentAsignados = tarea.asignados || [];
    const alreadyJoined = currentAsignados.some(a => 
      (typeof a === 'string' && a.toLowerCase() === nombreCompleto.toLowerCase()) || 
      (typeof a === 'object' && (a?.nombre?.toLowerCase() === nombreCompleto.toLowerCase() || a?.nombre_completo?.toLowerCase() === nombreCompleto.toLowerCase() || (miembroId && a?.id === miembroId)))
    );
    
    const newAsignados = alreadyJoined 
      ? currentAsignados 
      : [...currentAsignados, { id: miembroId, nombre: nombreCompleto, nombre_completo: nombreCompleto, email: miembroEmail }];

    updateSelected({ 
      responsable: nombreCompleto,
      asignados: newAsignados
    });
    setShowAsignadosMenu(false);
  };

  const handleRemoveAsignado = (nombre) => {
    const currentAsignados = tarea.asignados || [];
    const filtered = currentAsignados.filter(a => {
      const nom = typeof a === 'string' ? a : a?.nombre || a?.nombre_completo;
      return nom !== nombre;
    });
    
    const newResp = tarea.responsable === nombre 
      ? (filtered.length > 0 ? (typeof filtered[0] === 'string' ? filtered[0] : filtered[0].nombre || filtered[0].nombre_completo) : 'Sin Asignar')
      : tarea.responsable;

    updateSelected({
      responsable: newResp,
      asignados: filtered
    });
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-2 sm:p-4 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-gloss-black rounded-3xl w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] shadow-2xl relative flex flex-col md:flex-row overflow-hidden border border-gray-200 dark:border-gray-800">
        
        {/* Botón cerrar */}
        <button 
          onClick={handleSaveModal} 
          className="absolute top-3 right-3 sm:top-4 sm:right-4 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white bg-gray-100 dark:bg-gray-800 rounded-full p-2 z-50 transition-colors shadow-sm"
          title="Cerrar y Guardar"
        >
          <X size={18}/>
        </button>
        
        {/* Lado Principal (Detalles, Checklist, Comentarios) */}
        <div className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto custom-scrollbar relative z-10 w-full space-y-6">
          
          {/* Cabecera / Título */}
          <div className="flex items-start gap-3 pr-10">
            <CreditCard className="text-gloss-burgundy dark:text-gloss-pink mt-1 flex-shrink-0" size={22}/>
            <div className="flex-1 min-w-0">
              <input 
                value={tarea.titulo || ''} 
                onChange={(e) => updateSelected({ titulo: e.target.value })}
                className="w-full text-xl sm:text-2xl font-bold bg-transparent border-none p-0 focus:ring-0 text-gray-900 dark:text-white placeholder-gray-400 outline-none"
                placeholder="Título de la tarea..."
              />
              <p className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                En la columna <span className="font-bold text-gloss-burgundy dark:text-gloss-pink">{tarea.estado || 'Por Hacer'}</span>
              </p>
            </div>
          </div>

          {/* Asignados Visuales */}
          {(tarea.asignados || []).length > 0 && (
            <div>
              <h4 className="text-[11px] font-bold uppercase text-gray-400 mb-2 flex items-center gap-1">
                <Users size={12} /> Miembros Asignados
              </h4>
              <div className="flex flex-wrap gap-2">
                {tarea.asignados.map((asig, idx) => {
                  const nombre = typeof asig === 'string' ? asig : asig?.nombre || asig?.nombre_completo || 'Miembro';
                  return (
                    <div 
                      key={idx}
                      className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-2.5 py-1 rounded-xl text-xs font-bold text-gray-800 dark:text-gray-200"
                    >
                      <div className="w-5 h-5 rounded-full bg-gloss-burgundy/20 text-gloss-burgundy dark:text-gloss-pink flex items-center justify-center text-[9px]">
                        {nombre.substring(0, 2).toUpperCase()}
                      </div>
                      <span>{nombre}</span>
                      <button 
                        onClick={() => handleRemoveAsignado(nombre)}
                        className="text-gray-400 hover:text-red-500 p-0.5 rounded ml-1"
                        title="Quitar asignación"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Etiquetas visuales en modal */}
          {(tarea.etiquetas || []).length > 0 && (
            <div>
              <h4 className="text-[11px] font-bold uppercase text-gray-400 mb-2">Etiquetas</h4>
              <div className="flex flex-wrap gap-1.5">
                {tarea.etiquetas.map((tag, idx) => (
                  <span 
                    key={idx} 
                    className={`text-xs font-bold px-2.5 py-1 rounded-lg border flex items-center gap-1.5 ${tag.colorClass || 'bg-gray-100 text-gray-800'}`}
                  >
                    {tag.text}
                    <button 
                      onClick={() => handleRemoveTag(idx)} 
                      className="hover:opacity-70 text-current p-0.5 rounded"
                      title="Eliminar etiqueta"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Descripción */}
          <div className="flex items-start gap-3">
            <AlignLeft className="text-gray-400 mt-1 flex-shrink-0" size={20}/>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-2">Descripción</h3>
              <textarea 
                value={tarea.descripcion || ''} 
                onChange={(e) => updateSelected({ descripcion: e.target.value })}
                placeholder="Añade una descripción más detallada sobre los objetivos de esta tarea..."
                className="w-full bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 rounded-2xl p-3 text-sm focus:ring-2 focus:ring-gloss-burgundy outline-none min-h-[90px] transition-colors resize-y text-gray-800 dark:text-gray-200"
              />
            </div>
          </div>

          {/* CHECKLIST DINÁMICO CON BARRA DE PROGRESO */}
          <div className="flex items-start gap-3">
            <CheckSquare className="text-gloss-burgundy dark:text-gloss-pink mt-1 flex-shrink-0" size={20}/>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  Checklist 
                  <span className="text-xs font-bold text-gray-500">
                    ({completedCheck}/{totalCheck})
                  </span>
                </h3>
                <span className="text-xs font-bold text-gloss-burgundy dark:text-gloss-pink bg-gloss-burgundy/10 dark:bg-gloss-pink/10 px-2 py-0.5 rounded-full">
                  {progressPercent}%
                </span>
              </div>

              {/* Barra de progreso */}
              <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden mb-4">
                <div 
                  className="h-full bg-gradient-to-r from-gloss-burgundy to-gloss-pink transition-all duration-300 rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              
              {/* Lista de ítems */}
              <div className="space-y-2 mb-3">
                {checklist.map(c => (
                  <div 
                    key={c.id} 
                    className="flex items-center gap-3 group bg-gray-50 dark:bg-gray-900/40 p-2.5 rounded-xl border border-gray-100 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 transition-colors"
                  >
                    <input 
                      type="checkbox" 
                      checked={c.completado}
                      onChange={() => handleToggleCheck(c.id)}
                      className="w-4 h-4 rounded text-gloss-burgundy focus:ring-gloss-burgundy border-gray-300 cursor-pointer"
                    />
                    <input 
                      type="text"
                      value={c.texto}
                      onChange={(e) => handleEditCheckText(c.id, e.target.value)}
                      className={`flex-1 bg-transparent border-none p-0 text-xs sm:text-sm outline-none ${c.completado ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-800 dark:text-gray-200 font-medium'}`}
                    />
                    <button 
                      onClick={() => handleDeleteCheckItem(c.id)} 
                      className="opacity-40 group-hover:opacity-100 text-gray-400 hover:text-red-500 p-1 transition-all"
                      title="Eliminar elemento"
                    >
                      <Trash2 size={14}/>
                    </button>
                  </div>
                ))}
              </div>

              {/* Formulario para añadir ítem */}
              <form onSubmit={handleAddCheckItem} className="flex gap-2">
                <input 
                  value={newCheckItem} 
                  onChange={e => setNewCheckItem(e.target.value)} 
                  placeholder="Añadir nuevo elemento al checklist..." 
                  className="flex-1 text-xs sm:text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-gloss-burgundy"
                />
                <button 
                  type="submit" 
                  disabled={!newCheckItem.trim()}
                  className="px-3 py-2 bg-gloss-burgundy text-white rounded-xl text-xs font-bold hover:bg-gloss-burgundy/90 disabled:opacity-40 flex items-center gap-1 shadow-sm transition-all"
                >
                  <Plus size={14} /> Añadir
                </button>
              </form>
            </div>
          </div>

          {/* Actividad y Comentarios */}
          <div className="flex items-start gap-3">
            <MessageSquare className="text-gray-400 mt-1 flex-shrink-0" size={20}/>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3">Actividad & Comentarios</h3>
              
              <form onSubmit={(e) => {
                e.preventDefault();
                if (!newComment.trim()) return;
                const date = new Date();
                const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Miembro';
                updateSelected({ 
                  comentarios: [
                    { 
                      id: Date.now(), 
                      usuario: userName, 
                      fecha: `${date.getDate()}/${date.getMonth()+1} ${date.getHours()}:${String(date.getMinutes()).padStart(2,'0')}`, 
                      texto: newComment.trim() 
                    }, 
                    ...(tarea.comentarios || [])
                  ] 
                });
                setNewComment('');
              }} className="relative mb-4">
                <textarea 
                  value={newComment} 
                  onChange={e => setNewComment(e.target.value)} 
                  placeholder="Escriba un comentario o actualización..." 
                  className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-3 text-xs sm:text-sm focus:ring-2 focus:ring-gloss-burgundy outline-none min-h-[75px]" 
                />
                <button 
                  type="submit" 
                  disabled={!newComment.trim()} 
                  className="absolute bottom-3 right-3 p-1.5 bg-gloss-burgundy text-white rounded-xl disabled:opacity-40 hover:bg-gloss-burgundy/90 shadow-sm"
                >
                  <Send size={13}/>
                </button>
              </form>

              <div className="space-y-3 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                {(tarea.comentarios || []).map(c => (
                  <div key={c.id} className="flex gap-2.5">
                    <div className="w-7 h-7 rounded-xl bg-gloss-burgundy/10 text-gloss-burgundy dark:bg-gloss-pink/10 dark:text-gloss-pink flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                      {c.usuario?.substring(0, 2).toUpperCase() || '??'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 mb-0.5">
                        <span className="font-bold text-xs text-gray-900 dark:text-gray-100">{c.usuario}</span>
                        <span className="text-[10px] text-gray-400">{c.fecha}</span>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-2.5 rounded-xl rounded-tl-none text-xs text-gray-700 dark:text-gray-300 break-words">
                        {c.texto}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Barra Lateral Derecha (Acciones y Controles) */}
        <div className="w-full md:w-72 bg-gray-50/80 dark:bg-[#1a1412] p-4 sm:p-6 border-t md:border-t-0 md:border-l border-gray-200 dark:border-gray-800 flex flex-col gap-5 flex-shrink-0 overflow-y-auto">
          
          {/* Prioridad */}
          <div>
            <h4 className="text-[11px] font-bold text-gray-500 uppercase mb-1.5">Prioridad</h4>
            <select 
              value={tarea.prioridad || 'Media'} 
              onChange={e => updateSelected({ prioridad: e.target.value })}
              className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-2 text-xs font-bold focus:ring-2 focus:ring-gloss-burgundy shadow-sm outline-none cursor-pointer"
            >
              <option value="Alta">Alta</option>
              <option value="Media">Media</option>
              <option value="Baja">Baja</option>
              <option value="Ninguna">Ninguna</option>
            </select>
          </div>

          {/* Responsable Principal */}
          <div>
            <h4 className="text-[11px] font-bold text-gray-500 uppercase mb-1.5">Responsable Principal</h4>
            <div className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-2 rounded-xl">
              <div className="w-6 h-6 rounded-full bg-gloss-burgundy/10 text-gloss-burgundy dark:bg-gloss-pink/10 dark:text-gloss-pink flex items-center justify-center text-[10px] font-bold">
                {tarea.responsable?.substring(0,2).toUpperCase() || 'SA'}
              </div>
              <span className="text-xs font-bold truncate flex-1">{tarea.responsable || 'Sin Asignar'}</span>
            </div>
          </div>

          {/* Acciones Rápidas */}
          <div>
            <h4 className="text-[11px] font-bold text-gray-500 uppercase mb-2">Acciones</h4>
            <div className="space-y-2">
              
              {/* Selector de Miembros Dinámico desde Base de Datos */}
              <div className="relative">
                <button 
                  type="button"
                  onClick={() => setShowAsignadosMenu(!showAsignadosMenu)} 
                  className="w-full flex items-center gap-2 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 text-xs font-bold p-2.5 rounded-xl transition-all shadow-sm"
                >
                  <User size={15}/> Añadir Miembro
                </button>
                {showAsignadosMenu && (
                  <div className="absolute top-full right-0 md:left-0 mt-1 w-64 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-2 shadow-2xl z-50 max-h-60 overflow-y-auto custom-scrollbar">
                    <p className="text-[11px] font-bold text-gray-500 uppercase px-2 mb-2">
                      Miembros Registrados ({dbMiembros.length}):
                    </p>
                    {loadingMiembros ? (
                      <p className="text-xs text-gray-400 p-2">Cargando miembros...</p>
                    ) : dbMiembros.length === 0 ? (
                      <p className="text-xs text-gray-400 p-2">No hay miembros registrados.</p>
                    ) : (
                      <div className="space-y-1">
                        {dbMiembros.map((m) => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => handleAssignUser(m)}
                            className="w-full text-left px-3 py-2 text-xs font-bold hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors flex items-center gap-2"
                          >
                            <div className="w-6 h-6 rounded-full bg-gloss-burgundy/15 text-gloss-burgundy dark:bg-gloss-pink/15 dark:text-gloss-pink flex items-center justify-center text-[10px] flex-shrink-0">
                              {(m.nombre_completo || m.email).substring(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-gray-900 dark:text-white font-bold">
                                {m.nombre_completo || m.email}
                              </p>
                              <span className="text-[10px] text-gray-400 block truncate">
                                {m.rol || 'Miembro'}
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {/* Selector de Etiquetas */}
              <div className="relative">
                <button 
                  type="button"
                  onClick={() => setShowTagMenu(!showTagMenu)} 
                  className="w-full flex items-center gap-2 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 text-xs font-bold p-2.5 rounded-xl transition-colors shadow-sm"
                >
                  <Tag size={15}/> Añadir Etiqueta
                </button>
                {showTagMenu && (
                  <div className="absolute top-full right-0 md:left-0 mt-1 w-64 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-3 shadow-2xl z-50 animate-fade-in">
                    <p className="text-[11px] font-bold text-gray-500 uppercase mb-2">Crear Etiqueta</p>
                    <input 
                      value={newTagText} 
                      onChange={e => setNewTagText(e.target.value)} 
                      placeholder="Nombre etiqueta (ej. Urgente)..." 
                      className="w-full text-xs p-2 mb-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-1 focus:ring-gloss-burgundy bg-transparent outline-none"
                    />
                    
                    <p className="text-[10px] text-gray-400 mb-1.5 font-bold">Seleccionar Color:</p>
                    <div className="grid grid-cols-4 gap-1.5 mb-3">
                      {ETIQUETAS_COLORES.map((c, i) => (
                        <button 
                          key={i} 
                          type="button"
                          onClick={() => setSelectedTagColor(c.class)} 
                          className={`w-full h-7 rounded-lg ${c.class.split(' ')[0]} border transition-all flex items-center justify-center ${selectedTagColor === c.class ? 'ring-2 ring-gloss-burgundy font-bold' : 'hover:opacity-80'}`}
                        >
                          {selectedTagColor === c.class && <Check size={12} />}
                        </button>
                      ))}
                    </div>

                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => setShowTagMenu(false)} className="px-2.5 py-1 text-[11px] font-bold text-gray-500">Cancelar</button>
                      <button type="button" onClick={handleAddTag} disabled={!newTagText.trim()} className="px-3 py-1 text-[11px] font-bold bg-gloss-burgundy text-white rounded-lg disabled:opacity-40 shadow-sm">Añadir</button>
                    </div>
                  </div>
                )}
              </div>

              {/* Selector de Fechas */}
              <div className="relative">
                <button 
                  type="button"
                  onClick={() => setShowDateMenu(!showDateMenu)} 
                  className="w-full flex items-center gap-2 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 text-xs font-bold p-2.5 rounded-xl transition-colors shadow-sm"
                >
                  <Calendar size={15}/> 
                  {tarea.fecha_limite || tarea.fechaLimite ? (
                    (() => {
                      const d = new Date(tarea.fecha_limite || tarea.fechaLimite);
                      if(isNaN(d.getTime())) return 'Fecha Límite';
                      return `📅 ${d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}`;
                    })()
                  ) : 'Fecha Límite'}
                </button>
                {showDateMenu && (
                  <div className="absolute top-full right-0 md:left-0 mt-1 w-64 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-3 shadow-2xl z-50">
                    <label className="block text-xs font-bold text-gray-500 mb-2">Seleccionar Vencimiento</label>
                    <input 
                      type="date" 
                      value={tarea.fecha_limite || tarea.fechaLimite || ''} 
                      onChange={(e) => { updateSelected({ fecha_limite: e.target.value }); setShowDateMenu(false); }} 
                      className="w-full text-xs p-2 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-1 focus:ring-gloss-burgundy bg-transparent cursor-pointer"
                    />
                  </div>
                )}
              </div>
              
              {/* Selector de Enlace / Adjunto */}
              <div className="relative">
                <button 
                  type="button"
                  onClick={() => setShowLinkMenu(!showLinkMenu)} 
                  className="w-full flex items-center gap-2 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 text-xs font-bold p-2.5 rounded-xl transition-colors shadow-sm"
                >
                  <Link2 size={15}/> Adjuntar Enlace
                </button>
                {showLinkMenu && (
                  <div className="absolute top-full right-0 md:left-0 mt-1 w-64 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-3 shadow-2xl z-50">
                    <input value={newLinkTitle} onChange={e=>setNewLinkTitle(e.target.value)} placeholder="Título (Figma, Drive...)" className="w-full text-xs p-2 mb-2 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-1 focus:ring-gloss-burgundy bg-transparent"/>
                    <input value={newLinkUrl} onChange={e=>setNewLinkUrl(e.target.value)} type="url" placeholder="https://..." className="w-full text-xs p-2 mb-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-1 focus:ring-gloss-burgundy bg-transparent"/>
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => setShowLinkMenu(false)} className="px-2.5 py-1 text-xs text-gray-500">Cancelar</button>
                      <button type="button" onClick={() => {
                        let finalUrl = newLinkUrl.trim();
                        if (!finalUrl) return;
                        if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
                          finalUrl = `https://${finalUrl}`;
                        }
                        updateSelected({ enlaces: [...(tarea.enlaces || []), { title: newLinkTitle || 'Link Adjunto', url: finalUrl }] });
                        setNewLinkTitle(''); setNewLinkUrl(''); setShowLinkMenu(false);
                      }} className="px-3 py-1 text-xs text-white bg-gloss-burgundy rounded-lg font-bold">Adjuntar</button>
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* Enlaces Adjuntos */}
          {(tarea.enlaces || []).length > 0 && (
            <div>
              <h4 className="text-[11px] font-bold text-gray-500 uppercase mb-2">Enlaces Adjuntos</h4>
              <div className="space-y-1.5">
                {tarea.enlaces.map((link, i) => (
                  <div key={i} className="flex items-center justify-between bg-blue-50 dark:bg-blue-950/30 p-2 rounded-xl border border-blue-100 dark:border-blue-900/40 group">
                    <a href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs text-blue-700 dark:text-blue-400 hover:underline min-w-0">
                      <Link2 size={13} className="flex-shrink-0"/> <span className="truncate">{link.title || link.url}</span>
                    </a>
                    <button onClick={() => { const nl = [...(tarea.enlaces || [])]; nl.splice(i, 1); updateSelected({ enlaces: nl }); }} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 p-0.5"><Trash2 size={13}/></button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Botón Guardar y Eliminar */}
          <div className="mt-auto pt-4 border-t border-gray-200 dark:border-gray-800 space-y-2">
            <button 
              type="button"
              onClick={handleSaveModal}
              className="w-full py-2.5 bg-gloss-burgundy hover:bg-gloss-burgundy/90 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center justify-center gap-1.5"
            >
              Guardar y Cerrar
            </button>
            <button 
              type="button"
              onClick={async () => {
                if (window.confirm('¿Seguro que deseas eliminar esta tarea permanentemente?')) {
                  try {
                    await supabase.from('tareas').delete().eq('id', tarea.id);
                    setTareas(tareas.filter(t => t.id !== tarea.id));
                    setSelectedTarea(null);
                  } catch (e) {
                    console.error('Error al eliminar tarea', e);
                  }
                }
              }} 
              className="w-full flex items-center justify-center gap-1.5 text-xs text-red-500 hover:text-red-700 py-1.5 font-bold transition-colors"
            >
              <Trash2 size={13}/> Eliminar Tarea
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
