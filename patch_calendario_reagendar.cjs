const fs = require('fs');

let cj = fs.readFileSync('src/pages/Calendario.jsx', 'utf-8');

// 1. Add `editEventForm` state
if (!cj.includes('editEventForm')) {
  cj = cj.replace(
    /const \[selectedEvent, setSelectedEvent\] = useState\(null\);/,
    `const [selectedEvent, setSelectedEvent] = useState(null);\n  const [editEventForm, setEditEventForm] = useState(null);`
  );
}

// 2. Add `handleReagendar` function near `handleCreate`
const handleReagendarFunc = `
  const handleReagendar = async (e) => {
    e.preventDefault();
    if (!editEventForm || !editEventForm.date) return;
    
    const newDate = editEventForm.date;
    const newTime = editEventForm.time;
    const dateTimeStr = newTime ? \`\${newDate}T\${newTime}\` : newDate;
    
    let errorUpdate = null;
    const type = selectedEvent.type;
    
    try {
      if (type === 'tarea') {
        const id = selectedEvent.id.replace('tarea_', '');
        const {error} = await supabase.from('tareas').update({fecha_limite: dateTimeStr}).eq('id', id);
        errorUpdate = error;
      } else if (type === 'reunion') {
        const id = selectedEvent.id.replace('cita_', '');
        const {data: cData} = await supabase.from('clientes').select('notas_kanban').eq('id', id).single();
        if (cData) {
          const nuevasNotas = { ...cData.notas_kanban, fechaCita: dateTimeStr };
          const {error} = await supabase.from('clientes').update({notas_kanban: nuevasNotas}).eq('id', id);
          errorUpdate = error;
        }
      } else if (type === 'manual') {
        const {error} = await supabase.from('eventos').update({date: dateTimeStr}).eq('id', selectedEvent.id);
        errorUpdate = error;
      } else {
        alert('Este tipo de evento (cobro/gasto) es cíclico y debe editarse desde el módulo Origen.');
        return;
      }

      if (errorUpdate) throw errorUpdate;

      // Refrescar datos locales de forma silenciosa si es posible, o llamar fetchEvents()
      await fetchEvents();

      // Enviar a Google Calendar y Telegram
      const startISO = new Date(newTime ? \`\${newDate}T\${newTime}\` : \`\${newDate}T09:00:00\`).toISOString();
      const endISO = new Date(new Date(startISO).getTime() + 60*60*1000).toISOString();
      
      createCalendarEvent({
        title: \`\${selectedEvent.title}\`,
        description: selectedEvent.description || '',
        startDateTime: startISO,
        endDateTime: endISO
      });

      sendTelegramNotification(
        \`📅 <b>EVENTO REAGENDADO</b>\\n\\n<b>Título:</b> \${selectedEvent.title}\\n<b>Nueva Fecha:</b> \${new Date(startISO).toLocaleString('es-CO')}\`,
        'group'
      );

      setEditEventForm(null);
      setSelectedEvent(null);
    } catch (err) {
      alert('Error al reagendar: ' + err.message);
    }
  };
`;

if (!cj.includes('const handleReagendar')) {
  cj = cj.replace('const handleCreate = async (e) => {', handleReagendarFunc + '\n  const handleCreate = async (e) => {');
}

// 3. Inject edit form into selectedEvent modal
// Find the span that renders the date:
const dateSpanRegex = /<span className="font-medium">\{new Date\(selectedEvent\.date\)\.toLocaleString\(\[\], \{ dateStyle: 'full', timeStyle: selectedEvent\.date\.includes\('T'\) \? 'short' : undefined \}\)\}<\/span>/;

const editableDateCode = `
                  <div className="flex-1">
                    {!editEventForm ? (
                      <div className="flex justify-between items-center w-full">
                        <span className="font-medium">{new Date(selectedEvent.date).toLocaleString([], { dateStyle: 'full', timeStyle: selectedEvent.date.includes('T') ? 'short' : undefined })}</span>
                        {['tarea', 'reunion', 'manual'].includes(selectedEvent.type) && (
                           <button onClick={() => {
                              const d = new Date(selectedEvent.date);
                              const offset = d.getTimezoneOffset() * 60000;
                              const localISOTime = (new Date(d.getTime() - offset)).toISOString().slice(0, 16);
                              setEditEventForm({
                                date: localISOTime.split('T')[0],
                                time: selectedEvent.date.includes('T') ? localISOTime.split('T')[1] : ''
                              });
                           }} className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded text-gray-700 dark:text-gray-200 font-bold hover:bg-gray-300 dark:hover:bg-gray-600">Editar</button>
                        )}
                      </div>
                    ) : (
                      <form onSubmit={handleReagendar} className="flex flex-col gap-2 w-full mt-2">
                        <div className="flex gap-2">
                          <input type="date" required value={editEventForm.date} onChange={e => setEditEventForm({...editEventForm, date: e.target.value})} className="px-2 py-1 text-sm border rounded dark:bg-gray-900 dark:border-gray-700 w-full"/>
                          <input type="time" value={editEventForm.time} onChange={e => setEditEventForm({...editEventForm, time: e.target.value})} className="px-2 py-1 text-sm border rounded dark:bg-gray-900 dark:border-gray-700 w-full"/>
                        </div>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => setEditEventForm(null)} className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-xs font-bold py-1.5 rounded">Cancelar</button>
                          <button type="submit" className="flex-1 bg-gloss-burgundy text-white text-xs font-bold py-1.5 rounded">Guardar Cambios</button>
                        </div>
                      </form>
                    )}
                  </div>
`;

if (cj.match(dateSpanRegex)) {
  cj = cj.replace(dateSpanRegex, editableDateCode);
  
  // also add a reset in the close button
  cj = cj.replace(
    `onClick={() => setSelectedEvent(null)} className="absolute top-4`,
    `onClick={() => { setSelectedEvent(null); setEditEventForm(null); }} className="absolute top-4`
  );
  
  // and in the navigate link
  cj = cj.replace(
    `onClick={(e) => { e.preventDefault(); navigate(selectedEvent.origin); setSelectedEvent(null); }}`,
    `onClick={(e) => { e.preventDefault(); navigate(selectedEvent.origin); setSelectedEvent(null); setEditEventForm(null); }}`
  );
  
  console.log('✅ Injected Reagendar UI in Calendario.jsx');
} else {
  console.log('❌ Could not find date span in Calendario.jsx');
}

fs.writeFileSync('src/pages/Calendario.jsx', cj, 'utf-8');
