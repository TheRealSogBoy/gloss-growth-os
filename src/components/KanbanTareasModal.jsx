import { useState } from 'react';
import { X, CreditCard, AlignLeft, CheckSquare, MessageSquare, Send, User, Tag, Calendar, Link2, Trash2 } from 'lucide-react';
import { supabase } from '../supabaseClient';

export default function KanbanTareasModal({ 
  selectedTarea, 
  setSelectedTarea, 
  updateSelected, 
  tareas, 
  setTareas, 
  handleSaveModal, 
  CLIENTES_MOCK, 
  ETIQUETAS_COLORES 
}) {
  const [showTagMenu, setShowTagMenu] = useState(false);
  const [newTagText, setNewTagText] = useState('');
  const [showLinkMenu, setShowLinkMenu] = useState(false);
  const [newLinkTitle, setNewLinkTitle] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [showDateMenu, setShowDateMenu] = useState(false);
  const [newCheckItem, setNewCheckItem] = useState('');
  const [newComment, setNewComment] = useState('');

  if (!selectedTarea) return null;
  const tarea = selectedTarea || {};

  return (
    <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-2 sm:p-4 backdrop-blur-sm">
      <div className="bg-gray-50 dark:bg-gloss-black rounded-xl w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] shadow-2xl relative flex flex-col md:flex-row overflow-hidden border border-gray-200 dark:border-gray-800">
        
        <button 
          onClick={handleSaveModal} 
          className="absolute top-3 right-3 sm:top-4 sm:right-4 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white bg-gray-200/80 dark:bg-gray-800/80 rounded-full p-2 z-50 transition-colors shadow-sm"
        >
          <X size={20}/>
        </button>
        
        <div className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto custom-scrollbar relative z-10 w-full">
          <div className="flex items-start gap-3 mb-6 pr-10">
            <CreditCard className="text-gray-500 mt-1 flex-shrink-0" size={24}/>
            <div className="flex-1 min-w-0">
              <input 
                value={tarea.titulo || ''} onChange={(e) => updateSelected({ titulo: e.target.value })}
                className="w-full text-2xl font-bold bg-transparent border-none p-0 focus:ring-0 text-gray-900 dark:text-white placeholder-gray-400 mb-1"
                placeholder="Ttulo de la tarea"
              />
              <p className="text-sm text-gray-500 flex items-center gap-2">
                En la columna <span className="font-semibold underline decoration-gray-300">{tarea.estado}</span>
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 mb-8">
            <AlignLeft className="text-gray-500 mt-0.5 flex-shrink-0" size={24}/>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold mb-3">Descripcin</h3>
              <textarea 
                value={tarea.descripcion || ''} onChange={(e) => updateSelected({ descripcion: e.target.value })}
                placeholder="Aadir una descripcin ms detallada..."
                className="w-full bg-gray-100 dark:bg-gray-800/50 border-none rounded-xl p-4 text-sm focus:bg-white dark:focus:bg-gray-900 focus:ring-2 focus:ring-gloss-burgundy min-h-[100px] transition-colors resize-y"
              />
            </div>
          </div>

          <div className="flex items-start gap-3 mb-8">
            <CheckSquare className="text-gray-500 mt-0.5 flex-shrink-0" size={24}/>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold mb-3 flex justify-between items-center">
                Checklist
                <span className="text-xs font-medium text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full">
                  {tarea.checklist?.length > 0 ? Math.round(((tarea.checklist?.filter(c=>c.completado).length || 0) / (tarea.checklist?.length || 1)) * 100) : 0}%
                </span>
              </h3>
              
              <div className="space-y-2 mb-3">
                {tarea.checklist?.map(c => (
                  <div key={c.id} className="flex items-center gap-3 group bg-white dark:bg-gray-900/40 p-2 rounded-lg border border-gray-100 dark:border-gray-800">
                    <input 
                      type="checkbox" checked={c.completado}
                      onChange={() => {
                        const nc = (tarea.checklist || []).map(item => item.id === c.id ? {...item, completado: !item.completado} : item);
                        updateSelected({ checklist: nc });
                      }}
                      className="w-4 h-4 rounded text-gloss-burgundy focus:ring-gloss-burgundy border-gray-300 cursor-pointer"
                    />
                    <input 
                      value={c.text}
                      onChange={(e) => {
                        const nc = (tarea.checklist || []).map(item => item.id === c.id ? {...item, text: e.target.value} : item);
                        updateSelected({ checklist: nc });
                      }}
                      className={`flex-1 bg-transparent border-none p-1 text-sm focus:ring-1 focus:ring-gray-300 rounded ${c.completado ? 'line-through text-gray-400' : 'text-gray-800 dark:text-gray-200'}`}
                    />
                    <button onClick={() => updateSelected({ checklist: (tarea.checklist || []).filter(i => i.id !== c.id) })} className="opacity-50 group-hover:opacity-100 text-red-500 hover:text-red-700 p-1 transition-opacity"><Trash2 size={16}/></button>
                  </div>
                ))}
              </div>

              <form onSubmit={(e) => {
                e.preventDefault();
                if(!newCheckItem.trim()) return;
                updateSelected({ checklist: [...(tarea.checklist||[]), { id: Date.now(), text: newCheckItem, completado: false }] });
                setNewCheckItem('');
              }} className="mt-2">
                <input value={newCheckItem} onChange={e=>setNewCheckItem(e.target.value)} placeholder="Aadir un elemento al checklist..." className="w-full text-sm bg-gray-100 dark:bg-gray-800 border-none rounded-lg p-2.5 focus:ring-2 focus:ring-gloss-burgundy"/>
              </form>
            </div>
          </div>

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
                  updateSelected({ comentarios: [{ id: Date.now(), usuario: 'Yo (Actual)', fecha: `${date.getDate()}/${date.getMonth()+1} ${date.getHours()}:${String(date.getMinutes()).padStart(2,'0')}`, texto: newComment }, ...(tarea.comentarios||[])] });
                  setNewComment('');
                }} className="flex-1 relative">
                  <textarea value={newComment} onChange={e=>setNewComment(e.target.value)} placeholder="Escriba un comentario..." className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-sm focus:ring-2 focus:ring-gloss-burgundy min-h-[80px]" />
                  <button type="submit" disabled={!newComment.trim()} className="absolute bottom-3 right-3 p-1.5 bg-gloss-burgundy text-white rounded-lg disabled:opacity-50 hover:bg-gloss-burgundy/90"><Send size={14}/></button>
                </form>
              </div>

              <div className="space-y-4">
                {tarea.comentarios?.map(c => (
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

        <div className="w-full md:w-64 bg-gray-50/50 dark:bg-[#1a1412] p-4 sm:p-6 border-t md:border-t-0 md:border-l border-gray-200 dark:border-gray-800 flex flex-col gap-6 flex-shrink-0 overflow-y-auto">
          <div>
            <h4 className="text-xs font-bold text-gray-500 uppercase mb-3">Prioridad General</h4>
            <select 
              value={tarea.prioridad || 'Ninguna'} 
              onChange={e=>updateSelected({ prioridad: e.target.value })}
              className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-2 text-sm focus:ring-1 focus:ring-gloss-burgundy font-medium shadow-sm"
            >
              <option>Alta</option><option>Media</option><option>Baja</option><option>Ninguna</option>
            </select>
          </div>

          <div>
            <h4 className="text-xs font-bold text-gray-500 uppercase mb-3">Cliente Asignado</h4>
            <select 
              value={tarea.cliente || ''} onChange={e=>updateSelected({ cliente: e.target.value })}
              className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-2 text-sm focus:ring-1 focus:ring-gloss-burgundy shadow-sm"
            >
              {CLIENTES_MOCK.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <h4 className="text-xs font-bold text-gray-500 uppercase mb-3">Aadir a la tarjeta</h4>
            <div className="space-y-2">
              <button onClick={() => updateSelected({ responsable: 'Yo (Actual)' })} className="w-full flex items-center gap-2 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-sm font-medium p-2 rounded-lg transition-colors"><User size={16}/> Unirse</button>
              
              <div className="relative">
                <button onClick={() => setShowTagMenu(!showTagMenu)} className="w-full flex items-center gap-2 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-sm font-medium p-2 rounded-lg transition-colors"><Tag size={16}/> Etiquetas</button>
                {showTagMenu && (
                  <div className="absolute top-full right-0 md:left-0 mt-1 w-64 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-3 shadow-xl z-20">
                    <input value={newTagText} onChange={e=>setNewTagText(e.target.value)} placeholder="Ttulo de etiqueta..." className="w-full text-sm p-2 mb-3 border border-gray-200 dark:border-gray-700 rounded focus:ring-1 focus:ring-gloss-burgundy bg-transparent"/>
                    <div className="grid grid-cols-4 gap-2 mb-2">
                      {ETIQUETAS_COLORES.map((c, i) => (
                        <button key={i} onClick={() => {
                          if(!newTagText) return;
                          updateSelected({ etiquetas: [...(tarea.etiquetas||[]), { text: newTagText, colorClass: c.class }] });
                          setNewTagText(''); setShowTagMenu(false);
                        }} className={`w-full h-8 rounded-md ${c.class.split(' ')[0]} hover:opacity-80 border border-black/10`}/>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="relative">
                <button onClick={() => setShowDateMenu(!showDateMenu)} className="w-full flex items-center gap-2 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-sm font-medium p-2 rounded-lg transition-colors"><Calendar size={16}/> Fechas</button>
                {showDateMenu && (
                  <div className="absolute top-full right-0 md:left-0 mt-1 w-64 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-3 shadow-xl z-20">
                    <label className="block text-xs font-medium text-gray-500 mb-2">Seleccionar Vencimiento</label>
                    <input 
                      type="date" 
                      value={tarea.fechaLimite || ''} 
                      onChange={(e) => { updateSelected({ fechaLimite: e.target.value }); setShowDateMenu(false); }} 
                      className="w-full text-sm p-2 border border-gray-200 dark:border-gray-700 rounded focus:ring-1 focus:ring-gloss-burgundy bg-transparent cursor-pointer"
                    />
                  </div>
                )}
              </div>
              
              <div className="relative">
                <button onClick={() => setShowLinkMenu(!showLinkMenu)} className="w-full flex items-center gap-2 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-sm font-medium p-2 rounded-lg transition-colors"><Link2 size={16}/> Adjunto</button>
                {showLinkMenu && (
                  <div className="absolute top-full right-0 md:left-0 mt-1 w-64 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-3 shadow-xl z-20">
                    <input value={newLinkTitle} onChange={e=>setNewLinkTitle(e.target.value)} placeholder="Ttulo (Ej. Drive, Figma)" className="w-full text-sm p-2 mb-2 border border-gray-200 dark:border-gray-700 rounded focus:ring-1 focus:ring-gloss-burgundy bg-transparent"/>
                    <input value={newLinkUrl} onChange={e=>setNewLinkUrl(e.target.value)} type="url" placeholder="https://..." className="w-full text-sm p-2 mb-3 border border-gray-200 dark:border-gray-700 rounded focus:ring-1 focus:ring-gloss-burgundy bg-transparent"/>
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setShowLinkMenu(false)} className="px-3 py-1.5 text-xs text-gray-500 bg-gray-100 dark:bg-gray-800 rounded">Cancelar</button>
                      <button onClick={() => {
                        if(!newLinkUrl) return;
                        updateSelected({ enlaces: [...(tarea.enlaces||[]), { title: newLinkTitle || 'Link Adjunto', url: newLinkUrl }] });
                        setNewLinkTitle(''); setNewLinkUrl(''); setShowLinkMenu(false);
                      }} className="px-3 py-1.5 text-xs text-white bg-gloss-burgundy rounded">Adjuntar</button>
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>

          {tarea.enlaces?.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-gray-500 uppercase mb-3">Adjuntos de la Tarea</h4>
              <div className="space-y-2">
                {tarea.enlaces?.map((link, i) => (
                  <div key={i} className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 p-2 rounded-lg group">
                    <a href={link.url.startsWith('http') ? link.url : `https://${link.url}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-400 hover:underline min-w-0">
                      <Link2 size={14} className="flex-shrink-0"/> <span className="truncate">{link.title}</span>
                    </a>
                    <button onClick={() => { const nl = [...(tarea.enlaces || [])]; nl.splice(i,1); updateSelected({ enlaces: nl }); }} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 p-1"><Trash2 size={14}/></button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-auto pt-6">
            <button onClick={async () => {
                if (window.confirm('Seguro que deseas eliminar esta tarea?')) {
                  try {
                    await supabase.from('tareas').delete().eq('id', tarea.id);
                    setTareas(tareas.filter(t => t.id !== tarea.id));
                    setSelectedTarea(null);
                  } catch(e) {}
                }
              }} className="w-full flex items-center justify-center gap-2 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 text-sm font-medium p-2 rounded-lg transition-colors"><Trash2 size={16}/> Eliminar Tarea</button>
          </div>

        </div>
      </div>
    </div>
  );
}
