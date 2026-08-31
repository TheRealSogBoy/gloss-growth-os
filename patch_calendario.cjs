const fs = require('fs');

let fj = fs.readFileSync('src/pages/Calendario.jsx', 'utf-8');

const modalRegex = /\{selectedEvent && \([\s\S]*?<ArrowUpRight size=\{18\}\/>\s*<\/a>\s*<\/div>\s*<\/div>\s*<\/div>\s*\)\}/;

const newModal = `{selectedEvent && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-md p-6 shadow-2xl border border-gray-200 dark:border-gray-800 relative animate-scale-in my-8">
            <button onClick={() => { setSelectedEvent(null); setEditEventForm(null); }} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 bg-gray-100 dark:bg-gray-800 p-2 rounded-full transition-colors"><X size={16}/></button>
            
            <div className={\`w-12 h-12 rounded-2xl mb-4 flex items-center justify-center shadow-inner \${getEventStyles(selectedEvent.type).bg}\`}>
              {(() => { const Ico = getEventStyles(selectedEvent.type).icon; return <Ico size={24}/>; })()}
            </div>
            
            <form onSubmit={handleReagendar} className="flex flex-col gap-4 w-full">
              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Título / Asunto</label>
                <input required value={editEventForm?.title ?? selectedEvent.title} onChange={e => setEditEventForm({...editEventForm, title: e.target.value})} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 font-bold" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Fecha</label>
                  <input required type="date" value={editEventForm?.date ?? (selectedEvent.date.split('T')[0])} onChange={e => setEditEventForm({...editEventForm, date: e.target.value})} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 font-medium" />
                </div>
                <div>
                   <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Hora Inicio</label>
                   <input type="time" value={editEventForm?.time ?? (selectedEvent.date.includes('T') ? selectedEvent.date.split('T')[1].substring(0,5) : '')} onChange={e => setEditEventForm({...editEventForm, time: e.target.value})} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 font-medium" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Hora Fin (Opcional)</label>
                <input type="time" value={editEventForm?.endTime ?? ''} onChange={e => setEditEventForm({...editEventForm, endTime: e.target.value})} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 font-medium" />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Ubicación / Notas</label>
                <textarea rows="3" value={editEventForm?.description ?? (selectedEvent.description || '')} onChange={e => setEditEventForm({...editEventForm, description: e.target.value})} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 font-medium whitespace-pre-wrap"></textarea>
              </div>

              <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                <button type="submit" className="w-full bg-gloss-burgundy hover:bg-red-800 text-white font-bold py-3 rounded-xl transition-colors shadow-md">
                  Guardar Cambios / Reagendar
                </button>
                <button type="button" onClick={handleEliminarEvento} className="w-full bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 font-bold py-3 rounded-xl hover:bg-red-200 dark:hover:bg-red-900/40 transition-colors">
                  Cancelar / Eliminar Evento
                </button>
              </div>
            </form>

          </div>
        </div>
      )}`;

if (fj.match(modalRegex)) {
  fj = fj.replace(modalRegex, newModal);
  
  const handleLogicRegex = /const handleReagendar = async \(e\) => \{[\s\S]*?\} catch \(err\) \{\s*alert\('Error al reagendar: ' \+ err\.message\);\s*\}\s*\};/;
  
  const newLogic = `const handleEliminarEvento = async () => {
    if (!window.confirm('¿Estás seguro de que deseas cancelar/eliminar este evento?')) return;
    try {
      const type = selectedEvent.type;
      
      if (type === 'tarea') {
        const id = selectedEvent.id.replace('tarea_', '');
        await supabase.from('tareas').delete().eq('id', id);
      } else if (type === 'reunion') {
        const id = selectedEvent.id.replace('cita_', '');
        const {data: cData} = await supabase.from('clientes').select('notas_kanban').eq('id', id).single();
        if (cData) {
          await supabase.from('clientes').update({notas_kanban: {...cData.notas_kanban, fechaCita: null}}).eq('id', id);
        }
      } else if (type === 'manual') {
        await supabase.from('eventos').delete().eq('id', selectedEvent.id);
      } else {
        alert('Este evento es cíclico y debe eliminarse desde su módulo origen.');
        return;
      }

      await fetchEvents();
      
      const eventDateLabel = selectedEvent.date.includes('T')
        ? new Date(selectedEvent.date).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })
        : new Date(selectedEvent.date).toLocaleDateString('es-CO', { dateStyle: 'medium' });

      sendTelegramNotification(
        \`❌ <b>EVENTO CANCELADO / ELIMINADO</b>\\n\\n<b>Título:</b> \${selectedEvent.title}\\n<b>Fecha Original:</b> \${eventDateLabel}\`,
        'group'
      );
      
      setSelectedEvent(null);
      setEditEventForm(null);
    } catch (err) {
      alert('Error eliminando evento: ' + err.message);
    }
  };

  const handleReagendar = async (e) => {
    e.preventDefault();
    
    const finalDate = editEventForm?.date ?? selectedEvent.date.split('T')[0];
    const finalTime = editEventForm?.time ?? (selectedEvent.date.includes('T') ? selectedEvent.date.split('T')[1].substring(0,5) : '');
    const finalTitle = editEventForm?.title ?? selectedEvent.title;
    const finalDesc = editEventForm?.description ?? (selectedEvent.description || '');
    const finalEndTime = editEventForm?.endTime ?? '';
    
    const dateTimeStr = finalTime ? \`\${finalDate}T\${finalTime}\` : finalDate;
    
    let errorUpdate = null;
    const type = selectedEvent.type;
    
    try {
      if (type === 'tarea') {
        const id = selectedEvent.id.replace('tarea_', '');
        const {error} = await supabase.from('tareas').update({titulo: finalTitle, descripcion: finalDesc, fecha_limite: dateTimeStr}).eq('id', id);
        errorUpdate = error;
      } else if (type === 'reunion') {
        const id = selectedEvent.id.replace('cita_', '');
        const {data: cData} = await supabase.from('clientes').select('notas_kanban').eq('id', id).single();
        if (cData) {
          const {error} = await supabase.from('clientes').update({notas_kanban: { ...cData.notas_kanban, fechaCita: dateTimeStr, tipoCita: finalDesc }}).eq('id', id);
          errorUpdate = error;
        }
      } else if (type === 'manual') {
        const {error} = await supabase.from('eventos').update({title: finalTitle, description: finalDesc, date: dateTimeStr}).eq('id', selectedEvent.id);
        errorUpdate = error;
      } else {
        alert('Este tipo de evento (cobro/gasto) es cíclico y debe editarse desde el módulo Origen.');
        return;
      }

      if (errorUpdate) throw errorUpdate;

      await fetchEvents();

      const startISO = new Date(finalTime ? \`\${finalDate}T\${finalTime}\` : \`\${finalDate}T09:00:00\`).toISOString();
      const endISO = new Date(finalEndTime ? \`\${finalDate}T\${finalEndTime}\` : new Date(new Date(startISO).getTime() + 60*60*1000).toISOString()).toISOString();
      
      createCalendarEvent({
        title: finalTitle,
        description: finalDesc,
        startDateTime: startISO,
        endDateTime: endISO
      });

      sendTelegramNotification(
        \`📅 <b>EVENTO REAGENDADO / EDITADO</b>\\n\\n<b>Título:</b> \${finalTitle}\\n<b>Nueva Fecha:</b> \${new Date(startISO).toLocaleString('es-CO')}\`,
        'group'
      );

      setEditEventForm(null);
      setSelectedEvent(null);
    } catch (err) {
      alert('Error al reagendar: ' + err.message);
    }
  };`;

  fj = fj.replace(handleLogicRegex, newLogic);
  
  fj = fj.replace(/setSelectedEvent\(ev\);\s*setEditEventForm\(null\);/g, "setSelectedEvent(ev); setEditEventForm({});");

  fs.writeFileSync('src/pages/Calendario.jsx', fj, 'utf-8');
  console.log('✅ Calendario fully patched.');
} else {
  console.log('❌ Could not match modal via regex.');
}
