const fs = require('fs');

// ── api/calendar.ts ───────────────────────────────────────────
// Already confirmed working. Update scope to include full calendar access.
let cal = fs.readFileSync('api/calendar.ts', 'utf-8');
if (!cal.includes("'https://www.googleapis.com/auth/calendar'")) {
  cal = cal.replace(
    `scopes: ['https://www.googleapis.com/auth/calendar.events'],`,
    `scopes: ['https://www.googleapis.com/auth/calendar.events', 'https://www.googleapis.com/auth/calendar'],`
  );
  fs.writeFileSync('api/calendar.ts', cal, 'utf-8');
  console.log('✅ api/calendar.ts scopes expanded');
} else {
  console.log('✓ api/calendar.ts scopes already complete');
}

// ── Calendario.jsx ────────────────────────────────────────────
let cj = fs.readFileSync('src/pages/Calendario.jsx', 'utf-8');

// 1. Add import after last existing import line
if (!cj.includes('sendTelegramNotification')) {
  cj = cj.replace(
    `import { useConfig } from '../context/ConfigContext';`,
    `import { useConfig } from '../context/ConfigContext';
import { sendTelegramNotification, createCalendarEvent } from '../lib/notifications';`
  );
  console.log('✅ Calendario.jsx: import added');
} else {
  console.log('✓ Calendario.jsx: import already present');
}

// 2. Inject triggers inside handleCreate, right before setIsCreateOpen(false)
const CLOSE_LINE = `setIsCreateOpen(false);`;

// We need to find the one inside handleCreate (not elsewhere)
// Search for the try/catch block inside handleCreate then the closing
const handleCreateBlock = `    try {
        const { data, error } = await supabase.from('eventos').insert([newEvent]).select();
        if (!error && data && data.length > 0) {
          setRawEventos([...rawEventos, data[0]]);
        }
      } catch(err) {}
      
      setIsCreateOpen(false);`;

const handleCreateBlockReplaced = `    try {
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

if (cj.includes(handleCreateBlock)) {
  cj = cj.replace(handleCreateBlock, handleCreateBlockReplaced);
  console.log('✅ Calendario.jsx: handleCreate triggers injected');
} else {
  // Try normalizing whitespace
  const trimSearch = handleCreateBlock.replace(/\r\n/g, '\n');
  const trimContent = cj.replace(/\r\n/g, '\n');
  if (trimContent.includes(trimSearch)) {
    const replaced = trimContent.replace(trimSearch, handleCreateBlockReplaced);
    cj = replaced;
    console.log('✅ Calendario.jsx: handleCreate triggers injected (CRLF normalized)');
  } else {
    console.log('⚠️  handleCreate block not matched exactly. Trying regex...');
    const regex = /try \{[\s\S]*?supabase\.from\('eventos'\)\.insert[\s\S]*?catch\(err\) \{\}[\s\r\n]+\s*setIsCreateOpen\(false\);/;
    if (cj.match(regex)) {
      cj = cj.replace(regex, handleCreateBlockReplaced.trim());
      console.log('✅ Calendario.jsx: handleCreate triggers injected (regex)');
    } else {
      console.log('❌ Could not patch Calendario.jsx handleCreate. Manual inspection needed.');
    }
  }
}

fs.writeFileSync('src/pages/Calendario.jsx', cj, 'utf-8');

// ── Verify KanbanTareas already has createCalendarEvent ───────
let kt = fs.readFileSync('src/pages/KanbanTareas.jsx', 'utf-8');
if (kt.includes('createCalendarEvent')) {
  console.log('✓ KanbanTareas.jsx: createCalendarEvent already present');
} else {
  console.log('⚠️  KanbanTareas.jsx: createCalendarEvent NOT present - check needed');
}

// ── Verify Finanzas already has createCalendarEvent ───────────
let fin = fs.readFileSync('src/pages/Finanzas.jsx', 'utf-8');
if (fin.includes('createCalendarEvent')) {
  console.log('✓ Finanzas.jsx: createCalendarEvent already present');
} else {
  console.log('⚠️  Finanzas.jsx: createCalendarEvent NOT present - check needed');
}

console.log('\n✅ All patches complete.');
