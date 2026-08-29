import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { 
  Plus, GripVertical, Calendar, User, Clock, AlertCircle, 
  CheckCircle, X, Building2, Tag, CheckSquare, AlignLeft, 
  MessageSquare, Link2, Trash2, Send, CreditCard, Flag
} from 'lucide-react';
import { useConfig } from '../context/ConfigContext';

const COLUMNAS = ['Por Hacer', 'En Progreso', 'Revisión', 'Completado'];
const DEFAULT_RESPONSABLES = ['Davilson', 'Santiago', 'Laura', 'Equipo Diseño', 'Equipo Ads', 'Sin Asignar', 'Yo (Actual)'];
const CLIENTES_MOCK = ['SkinGlow Spa', 'Dr. Aesthetic Clinic', 'Dra. Elena Derma', 'Body & Soul Center', 'Interno (Agencia)'];

const ETIQUETAS_COLORES = [
  { class: 'bg-red-100 text-red-700 border-red-200' },
  { class: 'bg-orange-100 text-orange-700 border-orange-200' },
  { class: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  { class: 'bg-green-100 text-green-700 border-green-200' },
  { class: 'bg-blue-100 text-blue-700 border-blue-200' },
  { class: 'bg-purple-100 text-purple-700 border-purple-200' },
  { class: 'bg-pink-100 text-pink-700 border-pink-200' },
  { class: 'bg-gray-100 text-gray-700 border-gray-200' },
];

const getTodayFormatted = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};



const getDueDateStatus = (dateString, estado) => {
  if (!dateString) return null;
  if (estado === 'Completado') return { text: 'Completada', color: 'text-green-600 bg-green-50 border-green-200', icon: CheckCircle };
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dateString);
  due.setMinutes(due.getMinutes() + due.getTimezoneOffset());
  const diffDays = Math.ceil((due - today) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return { text: 'Vencida', color: 'text-red-600 bg-red-50 border-red-200', icon: AlertCircle };
  if (diffDays === 0) return { text: 'Vence Hoy', color: 'text-orange-600 bg-orange-50 border-orange-200', icon: Clock };
  if (diffDays <= 2) return { text: `Vence en ${diffDays} d`, color: 'text-orange-500 bg-orange-50 border-orange-100', icon: Clock };
  return { text: `En ${diffDays} d`, color: 'text-gray-500 bg-gray-100 border-gray-200', icon: Calendar };
};

const getPrioridadBadge = (prio) => {
  if (prio === 'Alta') return { class: 'bg-red-100 text-red-700', icon: Flag };
  if (prio === 'Media') return { class: 'bg-yellow-100 text-yellow-700', icon: Flag };
  if (prio === 'Baja') return { class: 'bg-blue-100 text-blue-700', icon: Flag };
  return null;
};


const mapToForm = (row) => ({
  id: row.id,
  titulo: row.titulo,
  cliente: row.cliente,
  responsable: row.responsable,
  fechaLimite: row.fecha_limite,
  estado: row.estado,
  descripcion: row.descripcion,
  prioridad: row.prioridad,
  etiquetas: row.etiquetas || [],
  checklist: row.checklist || [],
  enlaces: row.enlaces || [],
  comentarios: row.comentarios || []
});

const mapToRow = (form) => ({
  titulo: form.titulo,
  cliente: form.cliente,
  responsable: form.responsable,
  fecha_limite: form.fechaLimite,
  estado: form.estado,
  descripcion: form.descripcion,
  prioridad: form.prioridad,
  etiquetas: form.etiquetas,
  checklist: form.checklist,
  enlaces: form.enlaces,
  comentarios: form.comentarios
});

export default function KanbanTareas() {
  const { responsablesList } = useConfig();
  const listaResponsables = responsablesList?.length 
    ? [...responsablesList, 'Sin Asignar', 'Yo (Actual)'] 
    : DEFAULT_RESPONSABLES;

  
  const [tareas, setTareas] = useState([]);
  const [loadingTareas, setLoadingTareas] = useState(true);

  useEffect(() => {
    fetchTareas();
  }, []);

  const fetchTareas = async () => {
    try {
      const { data, error } = await supabase.from('tareas').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      if (data) {
        setTareas(data.map(mapToForm));
      }
    } catch (e) {
      console.error('Error fetching tareas:', e);
    } finally {
      setLoadingTareas(false);
    }
  };

  
  // === ESTADOS PARA MODAL DETALLADO ===
  const [selectedTarea, setSelectedTarea] = useState(null);
  
  // === ESTADOS PARA CREACIÓN RÁPIDA INLINE ===
  const [addingCol, setAddingCol] = useState(null);
  const [quickTitle, setQuickTitle] = useState('');

  // === UI SECUNDARIOS DEL MODAL ===
  const [newComment, setNewComment] = useState('');
  const [newCheckItem, setNewCheckItem] = useState('');
  
  // Menús desplegables Sidebar
  const [showTagMenu, setShowTagMenu] = useState(false);
  const [newTagText, setNewTagText] = useState('');
  
  const [showLinkMenu, setShowLinkMenu] = useState(false);
  const [newLinkTitle, setNewLinkTitle] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  
  const [showDateMenu, setShowDateMenu] = useState(false);

  // === DRAG & DROP ===
  const onDragStart = (e, id) => e.dataTransfer.setData('taskId', id);
  const onDragOver = (e) => e.preventDefault();
  const onDrop = (e, nuevaColumna) => {
    const id = parseInt(e.dataTransfer.getData('taskId'));
    if (!id) return;
    setTareas(prev => prev.map(t => t.id === id ? { ...t, estado: nuevaColumna } : t));
  };

  // === ACTUALIZACIÓN EN TIEMPO REAL DEL MODAL ===
  const updateSelected = (updates) => {
    const updatedTask = { ...selectedTarea, ...updates };
    setSelectedTarea(updatedTask);
    setTareas(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
  };

  // === CREACIÓN RÁPIDA (Estilo Trello) ===
  const handleQuickAdd = async (e, columna) => {
    e.preventDefault();
    if (!quickTitle.trim()) { setAddingCol(null); return; }
    
    const nuevaTarea = {
      titulo: quickTitle.trim(),
      estado: columna,
      responsable: 'Sin Asignar',
      prioridad: 'Media',
      fechaLimite: getTodayFormatted(),
      cliente: '', descripcion: '', etiquetas: [], checklist: [], enlaces: [], comentarios: []
    };
    
    try {
      const { data, error } = await supabase.from('tareas').insert([mapToRow(nuevaTarea)]).select();
      if (!error && data && data.length > 0) {
        setTareas([...tareas, mapToForm(data[0])]);
      }
    } catch(err) {}
    
    setQuickTitle('');
    setAddingCol(null);
  };

  return (
    <div className="h-full flex flex-col animate-fade-in pb-8">
      <div className="mb-6">
        <h1 className="text-3xl font-zodiak font-bold text-gloss-burgundy dark:text-gloss-inverted">Operación del Equipo</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Gestión avanzada de tareas, checklist y plazos al estilo Kanban.</p>
      </div>

      {/* TABLERO KANBAN */}
      <div className="flex-1 overflow-x-auto custom-scrollbar">
        <div className="flex gap-6 min-w-max pb-4 h-full items-start">
          
          {COLUMNAS.map(columna => {
            const tareasColumna = tareas.filter(t => t.estado === columna);
            return (
              <div 
                key={columna}
                className="w-[320px] bg-gray-100 dark:bg-gray-900/60 rounded-xl flex flex-col max-h-full border border-gray-200 dark:border-gray-800"
                onDragOver={onDragOver}
                onDrop={(e) => onDrop(e, columna)}
              >
                {/* Cabecera Columna */}
                <div className="p-3 flex justify-between items-center cursor-pointer">
                  <h3 className="font-bold text-gray-800 dark:text-gray-200 text-sm">{columna}</h3>
                  <span className="bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs font-bold px-2 py-0.5 rounded-md">
                    {tareasColumna.length}
                  </span>
                </div>

                {/* Tarjetas */}
                <div className="p-2 flex-1 overflow-y-auto space-y-2.5 custom-scrollbar">
                  {tareasColumna.map(t => {
                    const dueStatus = getDueDateStatus(t.fechaLimite, t.estado);
                    const prioBadge = getPrioridadBadge(t.prioridad);
                    const checkTotal = t.checklist?.length || 0;
                    const checkDone = t.checklist?.filter(c => c.completado).length || 0;

                    return (
                      <div 
                        key={t.id} draggable onDragStart={(e) => onDragStart(e, t.id)}
                        onClick={() => setSelectedTarea(t)}
                        className="bg-white dark:bg-gloss-black p-3 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 cursor-pointer hover:border-gloss-burgundy/50 transition-colors group relative"
                      >
                        {/* Etiquetas y Prioridad */}
                        <div className="flex flex-wrap gap-1 mb-2">
                          {prioBadge && (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 ${prioBadge.class}`}>
                              <prioBadge.icon size={10}/> {t.prioridad}
                            </span>
                          )}
                          {t.etiquetas?.map((tag, i) => (
                            <span key={i} className={`text-[10px] font-bold px-2 py-0.5 rounded ${tag.colorClass}`}>{tag.text}</span>
                          ))}
                        </div>
                        
                        <h4 className="font-medium text-sm text-gray-900 dark:text-white leading-snug">{t.titulo}</h4>

                        {/* Badges Inferiores */}
                        <div className="flex flex-wrap items-center gap-2 mt-3">
                          {dueStatus && (
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border flex items-center gap-1 ${dueStatus.color}`}>
                              <dueStatus.icon size={10}/> {dueStatus.text}
                            </span>
                          )}
                          {checkTotal > 0 && (
                            <span className={`flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded ${checkDone === checkTotal ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                              <CheckSquare size={10}/> {checkDone}/{checkTotal}
                            </span>
                          )}
                          {t.comentarios?.length > 0 && (
                            <span className="flex items-center gap-1 text-[10px] font-medium text-gray-500">
                              <MessageSquare size={10}/> {t.comentarios.length}
                            </span>
                          )}
                          <div className="ml-auto w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-[10px] font-bold text-gray-600 dark:text-gray-300 border border-white dark:border-gloss-black" title={t.responsable}>
                            {t.responsable?.substring(0, 2).toUpperCase() || '?'}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Creación Rápida */}
                  {addingCol === columna ? (
                    <form onSubmit={(e) => handleQuickAdd(e, columna)} className="bg-white dark:bg-gloss-black p-2 rounded-lg shadow-sm border border-gloss-burgundy">
                      <textarea 
                        autoFocus
                        value={quickTitle} onChange={e=>setQuickTitle(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleQuickAdd(e, columna); } }}
                        placeholder="Título de la tarjeta..."
                        className="w-full text-sm bg-transparent border-none resize-none focus:ring-0 p-1 mb-2 outline-none"
                        rows="2"
                      />
                      <div className="flex items-center gap-2">
                        <button type="submit" className="px-3 py-1 bg-gloss-burgundy text-white text-xs font-medium rounded-md">Añadir</button>
                        <button type="button" onClick={() => setAddingCol(null)} className="p-1 text-gray-500 hover:text-gray-700"><X size={16}/></button>
                      </div>
                    </form>
                  ) : (
                    <button onClick={() => setAddingCol(columna)} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors">
                      <Plus size={16}/> Añada una tarjeta
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================= */}
      {/* MODAL DETALLADO DE TARJETA (ESTILO TRELLO)                  */}
      {/* ========================================================= */}
      {selectedTarea && (
        <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-2 sm:p-4 backdrop-blur-sm">
          
          {/* Contenedor central robusto para evitar recortes de zoom/altura */}
          <div className="bg-gray-50 dark:bg-gloss-black rounded-xl w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] shadow-2xl relative flex flex-col md:flex-row overflow-hidden border border-gray-200 dark:border-gray-800">
            
            {/* Botón de cierre siempre visible (Z-index alto) */}
            <button 
              onClick={handleSaveModal} 
              className="absolute top-3 right-3 sm:top-4 sm:right-4 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white bg-gray-200/80 dark:bg-gray-800/80 rounded-full p-2 z-50 transition-colors shadow-sm"
            >
              <X size={20}/>
            </button>
            
            {/* COLUMNA IZQUIERDA (Principal) - Desplazamiento interno independiente */}
            <div className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto custom-scrollbar relative z-10 w-full">
              
              {/* Título y Estado */}
              <div className="flex items-start gap-3 mb-6 pr-10">
                <CreditCard className="text-gray-500 mt-1 flex-shrink-0" size={24}/>
                <div className="flex-1 min-w-0">
                  <textarea 
                    value={selectedTarea.titulo}
                    onChange={(e) => updateSelected({ titulo: e.target.value })}
                    className="w-full text-xl sm:text-2xl font-bold bg-transparent border-none focus:ring-0 p-0 text-gray-900 dark:text-white resize-none outline-none leading-tight"
                    rows={2}
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    En la lista <span className="font-semibold underline cursor-pointer">{selectedTarea.estado}</span> 
                  </p>
                </div>
              </div>

              {/* Badges (Miembros, Etiquetas, Prioridad, Fecha) */}
              <div className="ml-0 sm:ml-9 flex flex-wrap gap-x-6 gap-y-4 mb-8">
                
                {/* Responsable */}
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Responsable</h4>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gloss-burgundy text-white flex items-center justify-center text-xs font-bold shadow-sm">
                      {selectedTarea.responsable?.substring(0, 2).toUpperCase() || '?'}
                    </div>
                    <select 
                      value={selectedTarea.responsable} onChange={(e) => updateSelected({ responsable: e.target.value })}
                      className="bg-transparent border-none focus:ring-0 p-0 text-sm font-medium cursor-pointer"
                    >
                      {listaResponsables.map(r => <option key={r}>{r}</option>)}
                    </select>
                  </div>
                </div>

                {/* Prioridad NATIVA */}
                {selectedTarea.prioridad && selectedTarea.prioridad !== 'Ninguna' && (
                  <div>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Prioridad</h4>
                    <span className={`text-xs font-bold px-3 py-1.5 rounded border flex items-center gap-1 ${getPrioridadBadge(selectedTarea.prioridad)?.class}`}>
                      <Flag size={12}/> {selectedTarea.prioridad}
                    </span>
                  </div>
                )}

                {/* Etiquetas */}
                {selectedTarea.etiquetas?.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Etiquetas</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedTarea.etiquetas?.map((tag, i) => (
                        <span key={i} className={`text-xs font-bold px-3 py-1.5 rounded border ${tag.colorClass} flex items-center gap-1 group`}>
                          {tag.text} 
                          <X size={12} className="cursor-pointer opacity-50 group-hover:opacity-100 transition-opacity" onClick={() => {
                            const nt = [...selectedTarea.etiquetas]; nt.splice(i, 1); updateSelected({ etiquetas: nt });
                          }}/>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Vencimiento */}
                {selectedTarea.fechaLimite && (
                  <div>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Vencimiento</h4>
                    <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded text-sm shadow-sm border border-gray-200 dark:border-gray-700">
                      <input type="date" value={selectedTarea.fechaLimite} onChange={(e) => updateSelected({ fechaLimite: e.target.value })} className="bg-transparent border-none p-0 h-auto font-medium focus:ring-0 text-gray-800 dark:text-gray-200 cursor-pointer"/>
                    </div>
                  </div>
                )}
              </div>

              {/* Descripción */}
              <div className="flex items-start gap-3 mb-8">
                <AlignLeft className="text-gray-500 mt-0.5 flex-shrink-0" size={24}/>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold mb-3">Descripción</h3>
                  <textarea 
                    value={selectedTarea.descripcion} onChange={(e) => updateSelected({ descripcion: e.target.value })}
                    placeholder="Añadir una descripción más detallada..."
                    className="w-full bg-gray-100 dark:bg-gray-800/50 border-none rounded-xl p-4 text-sm focus:bg-white dark:focus:bg-gray-900 focus:ring-2 focus:ring-gloss-burgundy min-h-[100px] transition-colors resize-y"
                  />
                </div>
              </div>

              {/* Checklist */}
              <div className="flex items-start gap-3 mb-8">
                <CheckSquare className="text-gray-500 mt-0.5 flex-shrink-0" size={24}/>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold mb-3 flex justify-between items-center">
                    Checklist
                    <span className="text-xs font-medium text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full">
                      {selectedTarea.checklist?.length > 0 ? Math.round(((selectedTarea.checklist?.filter(c=>c.completado).length || 0) / (selectedTarea.checklist?.length || 1)) * 100) : 0}%
                    </span>
                  </h3>
                  
                  <div className="space-y-2 mb-3">
                    {selectedTarea.checklist?.map(c => (
                      <div key={c.id} className="flex items-center gap-3 group bg-white dark:bg-gray-900/40 p-2 rounded-lg border border-gray-100 dark:border-gray-800">
                        <input 
                          type="checkbox" checked={c.completado}
                          onChange={() => {
                            const nc = selectedTarea.checklist.map(item => item.id === c.id ? {...item, completado: !item.completado} : item);
                            updateSelected({ checklist: nc });
                          }}
                          className="w-4 h-4 rounded text-gloss-burgundy focus:ring-gloss-burgundy border-gray-300 cursor-pointer"
                        />
                        <input 
                          value={c.text}
                          onChange={(e) => {
                            const nc = selectedTarea.checklist.map(item => item.id === c.id ? {...item, text: e.target.value} : item);
                            updateSelected({ checklist: nc });
                          }}
                          className={`flex-1 bg-transparent border-none p-1 text-sm focus:ring-1 focus:ring-gray-300 rounded ${c.completado ? 'line-through text-gray-400' : 'text-gray-800 dark:text-gray-200'}`}
                        />
                        <button onClick={() => updateSelected({ checklist: selectedTarea.checklist.filter(i => i.id !== c.id) })} className="opacity-50 group-hover:opacity-100 text-red-500 hover:text-red-700 p-1 transition-opacity"><Trash2 size={16}/></button>
                      </div>
                    ))}
                  </div>

                  <form onSubmit={(e) => {
                    e.preventDefault();
                    if(!newCheckItem.trim()) return;
                    updateSelected({ checklist: [...(selectedTarea.checklist||[]), { id: Date.now(), text: newCheckItem, completado: false }] });
                    setNewCheckItem('');
                  }} className="mt-2">
                    <input value={newCheckItem} onChange={e=>setNewCheckItem(e.target.value)} placeholder="Añadir un elemento al checklist..." className="w-full text-sm bg-gray-100 dark:bg-gray-800 border-none rounded-lg p-2.5 focus:ring-2 focus:ring-gloss-burgundy"/>
                  </form>
                </div>
              </div>

              {/* Comentarios */}
              <div className="flex items-start gap-3 mb-4">
                <MessageSquare className="text-gray-500 mt-0.5 flex-shrink-0" size={24}/>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold mb-4">Actividad</h3>
                  
                  <div className="flex gap-3 mb-6">
                    <div className="w-8 h-8 rounded-full bg-gloss-pink/30 text-gloss-burgundy border border-gloss-pink flex items-center justify-center text-xs font-bold flex-shrink-0">YO</div>
                    <form onSubmit={(e) => {
                      e.preventDefault();
                      if(!newComment.trim()) return;
                      const date = new Date();
                      updateSelected({ comentarios: [{ id: Date.now(), usuario: 'Yo (Actual)', fecha: `${date.getDate()}/${date.getMonth()+1} ${date.getHours()}:${String(date.getMinutes()).padStart(2,'0')}`, texto: newComment }, ...(selectedTarea.comentarios||[])] });
                      setNewComment('');
                    }} className="flex-1 relative">
                      <textarea value={newComment} onChange={e=>setNewComment(e.target.value)} placeholder="Escriba un comentario..." className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-sm focus:ring-2 focus:ring-gloss-burgundy min-h-[80px]" />
                      <button type="submit" disabled={!newComment.trim()} className="absolute bottom-3 right-3 p-1.5 bg-gloss-burgundy text-white rounded-lg disabled:opacity-50 hover:bg-gloss-burgundy/90"><Send size={14}/></button>
                    </form>
                  </div>

                  <div className="space-y-4">
                    {selectedTarea.comentarios?.map(c => (
                      <div key={c.id} className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-300 flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {c.usuario?.substring(0,2).toUpperCase() || '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2 mb-1">
                            <span className="font-bold text-sm text-gray-900 dark:text-gray-100">{c.usuario}</span>
                            <span className="text-xs text-gray-500">{c.fecha}</span>
                          </div>
                          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-3 rounded-xl rounded-tl-none text-sm shadow-sm break-words">
                            {c.texto}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

            </div>

            {/* COLUMNA DERECHA (Sidebar de acciones) - Fixed width on Desktop, full width on Mobile */}
            <div className="w-full md:w-64 bg-gray-50/50 dark:bg-[#1a1412] p-4 sm:p-6 border-t md:border-t-0 md:border-l border-gray-200 dark:border-gray-800 flex flex-col gap-6 flex-shrink-0 overflow-y-auto">
              
              {/* Prioridad (Native Select) */}
              <div>
                <h4 className="text-xs font-bold text-gray-500 uppercase mb-3">Prioridad General</h4>
                <select 
                  value={selectedTarea.prioridad || 'Ninguna'} 
                  onChange={e=>updateSelected({ prioridad: e.target.value })}
                  className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-2 text-sm focus:ring-1 focus:ring-gloss-burgundy font-medium shadow-sm"
                >
                  <option>Alta</option><option>Media</option><option>Baja</option><option>Ninguna</option>
                </select>
              </div>

              {/* Cliente */}
              <div>
                <h4 className="text-xs font-bold text-gray-500 uppercase mb-3">Cliente Asignado</h4>
                <select 
                  value={selectedTarea.cliente} onChange={e=>updateSelected({ cliente: e.target.value })}
                  className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-2 text-sm focus:ring-1 focus:ring-gloss-burgundy shadow-sm"
                >
                  {CLIENTES_MOCK.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>

              {/* Acciones principales */}
              <div>
                <h4 className="text-xs font-bold text-gray-500 uppercase mb-3">Añadir a la tarjeta</h4>
                <div className="space-y-2">
                  <button onClick={() => updateSelected({ responsable: 'Yo (Actual)' })} className="w-full flex items-center gap-2 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-sm font-medium p-2 rounded-lg transition-colors"><User size={16}/> Unirse</button>
                  
                  {/* Etiquetas Dropdown */}
                  <div className="relative">
                    <button onClick={() => setShowTagMenu(!showTagMenu)} className="w-full flex items-center gap-2 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-sm font-medium p-2 rounded-lg transition-colors"><Tag size={16}/> Etiquetas</button>
                    {showTagMenu && (
                      <div className="absolute top-full right-0 md:left-0 mt-1 w-64 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-3 shadow-xl z-20">
                        <input value={newTagText} onChange={e=>setNewTagText(e.target.value)} placeholder="Título de etiqueta..." className="w-full text-sm p-2 mb-3 border border-gray-200 dark:border-gray-700 rounded focus:ring-1 focus:ring-gloss-burgundy bg-transparent"/>
                        <div className="grid grid-cols-4 gap-2 mb-2">
                          {ETIQUETAS_COLORES.map((c, i) => (
                            <button key={i} onClick={() => {
                              if(!newTagText) return;
                              updateSelected({ etiquetas: [...(selectedTarea.etiquetas||[]), { text: newTagText, colorClass: c.class }] });
                              setNewTagText(''); setShowTagMenu(false);
                            }} className={`w-full h-8 rounded-md ${c.class.split(' ')[0]} hover:opacity-80 border border-black/10`}/>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Fechas Dropdown */}
                  <div className="relative">
                    <button onClick={() => setShowDateMenu(!showDateMenu)} className="w-full flex items-center gap-2 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-sm font-medium p-2 rounded-lg transition-colors"><Calendar size={16}/> Fechas</button>
                    {showDateMenu && (
                      <div className="absolute top-full right-0 md:left-0 mt-1 w-64 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-3 shadow-xl z-20">
                        <label className="block text-xs font-medium text-gray-500 mb-2">Seleccionar Vencimiento</label>
                        <input 
                          type="date" 
                          value={selectedTarea.fechaLimite} 
                          onChange={(e) => { updateSelected({ fechaLimite: e.target.value }); setShowDateMenu(false); }} 
                          className="w-full text-sm p-2 border border-gray-200 dark:border-gray-700 rounded focus:ring-1 focus:ring-gloss-burgundy bg-transparent cursor-pointer"
                        />
                      </div>
                    )}
                  </div>
                  
                  {/* Adjunto Dropdown */}
                  <div className="relative">
                    <button onClick={() => setShowLinkMenu(!showLinkMenu)} className="w-full flex items-center gap-2 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-sm font-medium p-2 rounded-lg transition-colors"><Link2 size={16}/> Adjunto</button>
                    {showLinkMenu && (
                      <div className="absolute top-full right-0 md:left-0 mt-1 w-64 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-3 shadow-xl z-20">
                        <input value={newLinkTitle} onChange={e=>setNewLinkTitle(e.target.value)} placeholder="Título (Ej. Drive, Figma)" className="w-full text-sm p-2 mb-2 border border-gray-200 dark:border-gray-700 rounded focus:ring-1 focus:ring-gloss-burgundy bg-transparent"/>
                        <input value={newLinkUrl} onChange={e=>setNewLinkUrl(e.target.value)} type="url" placeholder="https://..." className="w-full text-sm p-2 mb-3 border border-gray-200 dark:border-gray-700 rounded focus:ring-1 focus:ring-gloss-burgundy bg-transparent"/>
                        <div className="flex justify-end gap-2">
                          <button onClick={() => setShowLinkMenu(false)} className="px-3 py-1.5 text-xs text-gray-500 bg-gray-100 dark:bg-gray-800 rounded">Cancelar</button>
                          <button onClick={() => {
                            if(!newLinkUrl) return;
                            updateSelected({ enlaces: [...(selectedTarea.enlaces||[]), { title: newLinkTitle || 'Link Adjunto', url: newLinkUrl }] });
                            setNewLinkTitle(''); setNewLinkUrl(''); setShowLinkMenu(false);
                          }} className="px-3 py-1.5 text-xs text-white bg-gloss-burgundy rounded">Adjuntar</button>
                        </div>
                      </div>
                    )}
                  </div>

                </div>
              </div>

              {selectedTarea.enlaces?.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-gray-500 uppercase mb-3">Adjuntos de la Tarea</h4>
                  <div className="space-y-2">
                    {selectedTarea.enlaces?.map((link, i) => (
                      <div key={i} className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 p-2 rounded-lg group">
                        <a href={link.url.startsWith('http') ? link.url : `https://${link.url}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-400 hover:underline min-w-0">
                          <Link2 size={14} className="flex-shrink-0"/> <span className="truncate">{link.title}</span>
                        </a>
                        <button onClick={() => { const nl = [...selectedTarea.enlaces]; nl.splice(i,1); updateSelected({ enlaces: nl }); }} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 p-1"><Trash2 size={14}/></button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-auto pt-6">
                <button onClick={async () => {
                    if (window.confirm('¿Seguro que deseas eliminar esta tarea?')) {
                      try {
                        await supabase.from('tareas').delete().eq('id', selectedTarea.id);
                        setTareas(tareas.filter(t => t.id !== selectedTarea.id));
                        setSelectedTarea(null);
                      } catch(e) {}
                    }
                  }} className="w-full flex items-center justify-center gap-2 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 text-sm font-medium p-2 rounded-lg transition-colors"><Trash2 size={16}/> Eliminar Tarea</button>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
