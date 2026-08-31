const fs = require('fs');
let cj = fs.readFileSync('src/pages/Calendario.jsx', 'utf-8');

// 1. Add imports
cj = cj.replace(
  `import { useConfig } from '../context/ConfigContext';`,
  `import { useConfig } from '../context/ConfigContext';\nimport { sendTelegramNotification, createCalendarEvent } from '../lib/notifications';`
);

// 2. Inject safely inside handleCreate
const oldHandleCreateStart = `  const handleCreate = async (e) => {
    e.preventDefault();
    const newDate = form.time ? \`\${form.date}T\${form.time}\` : form.date;
    const newEvent = {
      type: form.type,
      title: form.title,
      description: form.description,
      date: newDate,
      origin: '/calendario',
      responsable: form.responsable,
      cliente: form.cliente
    };
    
    try {
      const { data, error } = await supabase.from('eventos').insert([newEvent]).select();
      if (!error && data && data.length > 0) {
        setRawEventos([...rawEventos, data[0]]);
      }
    } catch(err) {}
    
    setIsCreateOpen(false);`;

const newHandleCreateStart = `  const handleCreate = async (e) => {
    e.preventDefault();
    const newDate = form.time ? \`\${form.date}T\${form.time}\` : form.date;
    const newEvent = {
      type: form.type,
      title: form.title,
      description: form.description,
      date: newDate,
      origin: '/calendario',
      responsable: form.responsable,
      cliente: form.cliente
    };
    
    try {
      const { data, error } = await supabase.from('eventos').insert([newEvent]).select();
      if (!error && data && data.length > 0) {
        setRawEventos([...rawEventos, data[0]]);
      }
    } catch(err) {}

    // TELEGRAM: notificar nuevo evento desde Calendario
    const eventDateLabel = form.time
      ? new Date(\`\${form.date}T\${form.time}\`).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })
      : new Date(form.date).toLocaleDateString('es-CO', { dateStyle: 'medium' });

    sendTelegramNotification(
      \`📆 <b>NUEVO EVENTO EN CALENDARIO</b>\\n\\n<b>Título:</b> \${form.title}\\n<b>Tipo:</b> \${form.type}\\n<b>Fecha:</b> \${eventDateLabel}\\n<b>Cliente:</b> \${form.cliente}\\n<b>Responsable:</b> \${form.responsable}\${form.description ? '\\n<b>Notas:</b> ' + form.description : ''}\`,
      'group'
    );

    // GOOGLE CALENDAR: sincronizar evento
    if (form.date) {
      const startISO = new Date(form.time ? \`\${form.date}T\${form.time}\` : \`\${form.date}T09:00:00\`).toISOString();
      const endISO = new Date(new Date(startISO).getTime() + 60 * 60 * 1000).toISOString();
      createCalendarEvent({
        title: form.title,
        description: \`Tipo: \${form.type} | Cliente: \${form.cliente} | Responsable: \${form.responsable}\\n\${form.description || ''}\`,
        startDateTime: startISO,
        endDateTime: endISO,
      });
    }
    
    setIsCreateOpen(false);`;

if (cj.includes(oldHandleCreateStart)) {
  cj = cj.replace(oldHandleCreateStart, newHandleCreateStart);
  console.log("✅ Successfully patched handleCreate using exact string replacement!");
} else {
  // Try CRLF normalization
  const normCj = cj.replace(/\r\n/g, '\n');
  if (normCj.includes(oldHandleCreateStart)) {
      cj = normCj.replace(oldHandleCreateStart, newHandleCreateStart);
      console.log("✅ Successfully patched handleCreate after CRLF normalization!");
  } else {
      console.log("❌ Could not match oldHandleCreateStart!");
  }
}

fs.writeFileSync('src/pages/Calendario.jsx', cj, 'utf-8');
