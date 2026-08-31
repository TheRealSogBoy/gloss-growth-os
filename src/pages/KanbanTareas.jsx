import KanbanTareasModal from '../components/KanbanTareasModal';
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { 
  Plus, Calendar, AlertCircle, 
  CheckCircle, X, CheckSquare, 
  MessageSquare, Flag
} from 'lucide-react';
import { useConfig } from '../context/ConfigContext';
import { useAuth } from '../context/AuthContext';
import { logAuditoria } from '../utils/audit';
import { sendTelegramNotification, createCalendarEvent } from '../lib/notifications';

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
  if (diffDays === 0) return { text: 'Vence Hoy', color: 'text-orange-600 bg-orange-50 border-orange-200', icon: AlertCircle };
  if (diffDays <= 2) return { text: `Vence en ${diffDays} d`, color: 'text-orange-500 bg-orange-50 border-orange-100', icon: Calendar };
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
  etiquetas: Array.isArray(row.etiquetas) ? row.etiquetas : [],
  checklist: Array.isArray(row.checklist) ? row.checklist : [],
  enlaces: Array.isArray(row.enlaces) ? row.enlaces : [],
  comentarios: Array.isArray(row.comentarios) ? row.comentarios : [],
  asignados: Array.isArray(row.asignados) ? row.asignados : []
});

const mapToRow = (form) => ({
  titulo: form.titulo,
  cliente: form.cliente,
  responsable: form.responsable,
  fecha_limite: form.fechaLimite,
  estado: form.estado,
  descripcion: form.descripcion,
  prioridad: form.prioridad,
  etiquetas: form.etiquetas || [],
  checklist: form.checklist || [],
  enlaces: form.enlaces || [],
  comentarios: form.comentarios || [],
  asignados: form.asignados || []
});

export default function KanbanTareas() {
  const { user } = useAuth();
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

  // === DRAG & DROP CON UUID STRING Y PERSISTENCIA SUPABASE ===
  const onDragStart = (e, id) => {
    e.dataTransfer.setData('taskId', String(id));
  };

  const onDragOver = (e) => {
    e.preventDefault();
  };

  const onDrop = async (e, nuevaColumna) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('taskId');
    if (!id) return;

    // Actualización optimista en estado local
    setTareas(prev => prev.map(t => String(t.id) === String(id) ? { ...t, estado: nuevaColumna } : t));
    
    if (selectedTarea && String(selectedTarea.id) === String(id)) {
      setSelectedTarea(prev => ({ ...prev, estado: nuevaColumna }));
    }

    // Persistencia real en Supabase
    try {
      const { error } = await supabase.from('tareas').update({ estado: nuevaColumna }).eq('id', id);
      if (!error) {
        logAuditoria(user, 'Kanban Tareas', 'EDITAR', `Tarea movida a columna: ${nuevaColumna}`);
      }
    } catch (err) {
      console.error('Error actualizando estado de tarea en Supabase:', err);
    }
  };

  // === ACTUALIZACIÓN EN TIEMPO REAL DEL MODAL Y SUPABASE ===
  const updateSelected = async (updates) => {
    const updatedTask = { ...selectedTarea, ...updates };
    setSelectedTarea(updatedTask);
    setTareas(prev => prev.map(t => String(t.id) === String(updatedTask.id) ? updatedTask : t));

    // Disparar UPDATE persistente
    try {
      await supabase.from('tareas').update(mapToRow(updatedTask)).eq('id', updatedTask.id);
    } catch (err) {
      console.error('Error persistiendo cambios de tarea:', err);
    }
  };

  // === GUARDAR Y CERRAR MODAL ===
  const handleSaveModal = async () => {
    if (selectedTarea) {
      try {
        await supabase.from('tareas').update(mapToRow(selectedTarea)).eq('id', selectedTarea.id);
        logAuditoria(user, 'Kanban Tareas', 'EDITAR', `Tarea actualizada: ${selectedTarea.titulo}`);
      } catch (err) {
        console.error('Error guardando modal de tarea:', err);
      }
    }
    setSelectedTarea(null);
  };

  // === CREACIÓN RÁPIDA (Estilo Trello) ===
  const handleQuickAdd = async (e, columna) => {
    e.preventDefault();
    if (!quickTitle.trim()) { setAddingCol(null); return; }
    
    const activeUserName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Sin Asignar';
    const nuevaTarea = {
      titulo: quickTitle.trim(),
      estado: columna,
      responsable: 'Sin Asignar',
      prioridad: 'Media',
      fechaLimite: getTodayFormatted(),
      cliente: '',
      descripcion: '',
      etiquetas: [],
      checklist: [],
      enlaces: [],
      comentarios: [],
      asignados: []
    };
    
    try {
      const { data, error } = await supabase.from('tareas').insert([mapToRow(nuevaTarea)]).select();
      if (!error && data && data.length > 0) {
        setTareas([...tareas, mapToForm(data[0])]);
        logAuditoria(user, 'Kanban Tareas', 'CREAR', `Nueva tarea creada: ${nuevaTarea.titulo}`);
        
        // VERCEL SERVERLESS TRIGGERS (TAREA)
            if (nuevaTarea.fechaLimite) {
              createCalendarEvent({
                title: `Tarea: ${nuevaTarea.titulo}`,
                description: nuevaTarea.descripcion || '',
                startDateTime: new Date(nuevaTarea.fechaLimite).toISOString(),
                endDateTime: new Date(new Date(nuevaTarea.fechaLimite).getTime() + 60 * 60 * 1000).toISOString(),
              });
            }

            sendTelegramNotification(
              `📋 <b>NUEVA TAREA CREADA</b>\n\n<b>Tarea:</b> ${nuevaTarea.titulo}\n<b>Límite:</b> ${nuevaTarea.fechaLimite ? new Date(nuevaTarea.fechaLimite).toLocaleDateString('es-CO') : 'Sin límite'}\n<b>Asignado a:</b> ${nuevaTarea.responsable}\n<b>Prioridad:</b> ${nuevaTarea.prioridad || 'Normal'}`,
              'group'
            ); }
    } catch (err) {
      console.error('Error insertando nueva tarea:', err);
    }
    
    setQuickTitle('');
    setAddingCol(null);
  };

  return (
    <div className="h-full flex flex-col animate-fade-in pb-8">
      <div className="mb-6">
        <h1 className="text-3xl font-zodiak font-bold text-gloss-burgundy dark:text-gloss-inverted">Operación del Equipo</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Gestión avanzada de tareas, checklist dinámico y plazos al estilo Kanban.</p>
      </div>

      {/* TABLERO KANBAN */}
      <div className="flex-1 overflow-x-auto custom-scrollbar">
        <div className="flex gap-6 min-w-max pb-4 h-full items-start">
          
          {COLUMNAS.map(columna => {
            const tareasColumna = tareas.filter(t => t.estado === columna);
            return (
              <div 
                key={columna}
                className="w-[320px] bg-gray-100 dark:bg-gray-900/60 rounded-2xl flex flex-col max-h-full border border-gray-200 dark:border-gray-800"
                onDragOver={onDragOver}
                onDrop={(e) => onDrop(e, columna)}
              >
                {/* Cabecera Columna */}
                <div className="p-3.5 flex justify-between items-center border-b border-gray-200/60 dark:border-gray-800">
                  <h3 className="font-bold text-gray-800 dark:text-gray-200 text-sm">{columna}</h3>
                  <span className="bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs font-bold px-2.5 py-0.5 rounded-full shadow-inner">
                    {tareasColumna.length}
                  </span>
                </div>

                {/* Tarjetas */}
                <div className="p-2.5 flex-1 overflow-y-auto space-y-2.5 custom-scrollbar min-h-[120px]">
                  {tareasColumna.map(t => {
                    const dueStatus = getDueDateStatus(t.fechaLimite, t.estado);
                    const prioBadge = getPrioridadBadge(t.prioridad);
                    const checkTotal = t.checklist?.length || 0;
                    const checkDone = t.checklist?.filter(c => c.completado).length || 0;

                    return (
                      <div 
                        key={t.id} 
                        draggable 
                        onDragStart={(e) => onDragStart(e, t.id)}
                        onClick={() => setSelectedTarea(t)}
                        className="bg-white dark:bg-gloss-black p-3.5 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 cursor-grab active:cursor-grabbing hover:border-gloss-burgundy/50 transition-all group relative"
                      >
                        {/* Etiquetas y Prioridad */}
                        <div className="flex flex-wrap gap-1 mb-2">
                          {prioBadge && (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 ${prioBadge.class}`}>
                              <prioBadge.icon size={10}/> {t.prioridad}
                            </span>
                          )}
                          {(t.etiquetas || []).map((tag, i) => (
                            <span key={i} className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${tag.colorClass || 'bg-gray-100 text-gray-700'}`}>
                              {tag.text}
                            </span>
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
                            <span className={`flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded ${checkDone === checkTotal ? 'bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'}`}>
                              <CheckSquare size={10}/> {checkDone}/{checkTotal}
                            </span>
                          )}
                          {t.comentarios?.length > 0 && (
                            <span className="flex items-center gap-1 text-[10px] font-medium text-gray-400">
                              <MessageSquare size={10}/> {t.comentarios.length}
                            </span>
                          )}
                          <div className="ml-auto w-6 h-6 rounded-full bg-gloss-burgundy/10 dark:bg-gloss-pink/10 flex items-center justify-center text-[10px] font-bold text-gloss-burgundy dark:text-gloss-pink border border-gloss-burgundy/20" title={t.responsable || 'Sin asignar'}>
                            {t.responsable?.substring(0, 2).toUpperCase() || 'SA'}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Creación Rápida */}
                  {addingCol === columna ? (
                    <form onSubmit={(e) => handleQuickAdd(e, columna)} className="bg-white dark:bg-gloss-black p-2.5 rounded-xl shadow-sm border border-gloss-burgundy">
                      <textarea 
                        autoFocus
                        value={quickTitle} 
                        onChange={e => setQuickTitle(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleQuickAdd(e, columna); } }}
                        placeholder="Título de la tarjeta..."
                        className="w-full text-xs sm:text-sm bg-transparent border-none resize-none focus:ring-0 p-1 mb-2 outline-none"
                        rows="2"
                      />
                      <div className="flex items-center gap-2">
                        <button type="submit" className="px-3 py-1 bg-gloss-burgundy text-white text-xs font-bold rounded-lg shadow-sm">Añadir</button>
                        <button type="button" onClick={() => setAddingCol(null)} className="p-1 text-gray-400 hover:text-gray-600"><X size={15}/></button>
                      </div>
                    </form>
                  ) : (
                    <button onClick={() => setAddingCol(columna)} className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-xl transition-colors">
                      <Plus size={15}/> Añada una tarjeta
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
        <KanbanTareasModal
          selectedTarea={selectedTarea}
          setSelectedTarea={setSelectedTarea}
          updateSelected={updateSelected}
          tareas={tareas}
          setTareas={setTareas}
          handleSaveModal={handleSaveModal}
          CLIENTES_MOCK={CLIENTES_MOCK}
          ETIQUETAS_COLORES={ETIQUETAS_COLORES}
        />
      )}
    </div>
  );
}
