const fs = require('fs');

let kc = fs.readFileSync('src/pages/KanbanClientes.jsx', 'utf-8');

// 1. Replace import
kc = kc.replace(
  `import { triggerN8nWebhook } from '../utils/n8n';`,
  `import { sendTelegramNotification, createCalendarEvent } from '../lib/notifications';`
);

// 2. Replace existing VERCEL SERVERLESS TRIGGERS (CITA) block (already correct from previous patch)
// – nothing needed there.

// 3. In handleSaveLead: find the block right after setClientes([mapToKanbanForm...
// We do a targeted string replace of the block:
const OLD_SAVE_LEAD = `if (data && data.length > 0) {
          setClientes([mapToKanbanForm(data[0]), ...clientes]);
          logAuditoria(user, 'Pipeline Comercial', 'CRIAR', \`Novo prospecto adicionado: \${payload.negocio_nombre}\`);
          setShowLeadModal(false);`;

// The actual string in the committed file (read it first)
const FIND_MARKER = `setClientes([mapToKanbanForm(data[0]), ...clientes]);`;
const INJECT_AFTER_MARKER = `logAuditoria(user, 'Pipeline Comercial', 'CREAR', \`Novo prospecto adicionado: \${payload.negocio_nombre}\`);
          setShowLeadModal(false);`;

// Safer: find where setShowLeadModal(false) appears inside handleSaveLead context
// and inject BEFORE it.
const AUDIT_LINE_RE = /logAuditoria\(user, 'Pipeline Comercial', 'CRIAR',.*\);\n\s+setShowLeadModal\(false\)/;

const TELEGRAM_INJECT = `logAuditoria(user, 'Pipeline Comercial', 'CRIAR', \`Novo prospecto adicionado: \${payload.negocio_nombre}\`);

          // TELEGRAM: nuevo prospecto registrado
          sendTelegramNotification(
            \`🏥 <b>NUEVO PROSPECTO REGISTRADO</b>\\n\\n<b>Clínica:</b> \${payload.negocio_nombre}\\n<b>Contacto:</b> \${leadForm.nombre_contacto || 'N/A'}\\n<b>Teléfono:</b> \${leadForm.telefono || 'N/A'}\\n<b>Interés:</b> \${(leadForm.interes || []).join(', ') || 'N/A'}\\n<b>Valor est.:</b> $\${leadForm.valor || '0'}\\n<b>Etapa:</b> \${leadForm.columna}\`,
            'group'
          );
          // CALENDAR: si hay fecha de próxima acción
          if (leadForm.fecha_accion) {
            const accionISO = new Date(leadForm.fecha_accion).toISOString();
            const accionEndISO = new Date(new Date(leadForm.fecha_accion).getTime() + 60 * 60 * 1000).toISOString();
            createCalendarEvent({
              title: \`Acción: \${payload.negocio_nombre}\`,
              description: \`Interés: \${(leadForm.interes || []).join(', ')}\`,
              startDateTime: accionISO,
              endDateTime: accionEndISO,
            });
            sendTelegramNotification(
              \`📅 <b>ACCIÓN AGENDADA EN CALENDARIO</b>\\n\\n<b>Prospecto:</b> \${payload.negocio_nombre}\\n<b>Fecha:</b> \${new Date(leadForm.fecha_accion).toLocaleString('es-CO')}\`,
              'group'
            );
          }
          setShowLeadModal(false)`;

// try to find the CREAR pattern in Spanish (what's actually in the committed version)
// First, print what the committed version has so we can craft the right replacement
const idx = kc.indexOf(`logAuditoria(user, 'Pipeline Comercial', 'CREAR', \`Nuevo prospecto agregado:`);
if (idx === -1) {
  console.log('⚠️ CREAR Nuevo prospecto aggregado not found, searching alternatives...');
  // find what's around setClientes([mapToKanban...
  const idx2 = kc.indexOf(FIND_MARKER);
  console.log('setClientes marker found at index:', idx2);
  if (idx2 !== -1) {
    console.log('Context around it:\n', kc.slice(idx2, idx2 + 400));
  }
  process.exit(1);
}

// The actual line in the committed file:
const actualBlock = kc.slice(idx, idx + 150);
console.log('Found audit line:', actualBlock.substring(0, 100));

// Get exact end of that line
const lineEnd = kc.indexOf('\n', idx);
const auditLine = kc.slice(idx, lineEnd);

const nextLineStart = lineEnd + 1;
// Find setShowLeadModal(false) after the audit line
const showModalIdx = kc.indexOf('setShowLeadModal(false);', nextLineStart);
const showModalLine = kc.slice(showModalIdx, showModalIdx + 50);
console.log('setShowLeadModal line:', showModalLine);

// Now we replace EXACTLY: auditLine + "\n" + whitespace + "setShowLeadModal(false);"
// with the same audit line + telegram + calendar + setShowLeadModal
const searchStr = auditLine + '\n          setShowLeadModal(false);';
if (!kc.includes(searchStr)) {
  // Try with different whitespace
  const searchStr2 = auditLine + '\n        setShowLeadModal(false);';
  if (!kc.includes(searchStr2)) {
    console.log('⚠️ Could not find exact string. Trying indexOf approach...');
    // just splice it
    const beforeModal = kc.slice(0, showModalIdx);
    const afterModal = kc.slice(showModalIdx);
    const injection = `// TELEGRAM: nuevo prospecto registrado
          sendTelegramNotification(
            \`🏥 <b>NUEVO PROSPECTO REGISTRADO</b>\\n\\n<b>Clínica:</b> \${payload.negocio_nombre}\\n<b>Contacto:</b> \${leadForm.nombre_contacto || 'N/A'}\\n<b>Teléfono:</b> \${leadForm.telefono || 'N/A'}\\n<b>Interés:</b> \${(leadForm.interes || []).join(', ') || 'N/A'}\\n<b>Valor est.:</b> $\${leadForm.valor || '0'}\\n<b>Etapa:</b> \${leadForm.columna}\`,
            'group'
          );
          if (leadForm.fecha_accion) {
            const accionISO = new Date(leadForm.fecha_accion).toISOString();
            const accionEndISO = new Date(new Date(leadForm.fecha_accion).getTime() + 60 * 60 * 1000).toISOString();
            createCalendarEvent({ title: \`Acción: \${payload.negocio_nombre}\`, description: \`Interés: \${(leadForm.interes || []).join(', ')}\`, startDateTime: accionISO, endDateTime: accionEndISO });
            sendTelegramNotification(\`📅 <b>ACCIÓN AGENDADA</b>\\n\\n<b>Prospecto:</b> \${payload.negocio_nombre}\\n<b>Fecha:</b> \${new Date(leadForm.fecha_accion).toLocaleString('es-CO')}\`, 'group');
          }
          `;
    kc = beforeModal + injection + afterModal;
    console.log('✅ Injected via splice');
  } else {
    kc = kc.replace(searchStr2, auditLine + '\n' + `          // TELEGRAM: nuevo prospecto
          sendTelegramNotification(\`🏥 <b>NUEVO PROSPECTO REGISTRADO</b>\\n\\n<b>Clínica:</b> \${payload.negocio_nombre}\\n<b>Contacto:</b> \${leadForm.nombre_contacto || 'N/A'}\\n<b>Interés:</b> \${(leadForm.interes || []).join(', ') || 'N/A'}\\n<b>Etapa:</b> \${leadForm.columna}\`, 'group');
          if (leadForm.fecha_accion) { const ai = new Date(leadForm.fecha_accion).toISOString(); createCalendarEvent({ title: \`Acción: \${payload.negocio_nombre}\`, startDateTime: ai, endDateTime: new Date(new Date(leadForm.fecha_accion).getTime() + 3600000).toISOString() }); }
          setShowLeadModal(false);`);
    console.log('✅ Replaced with searchStr2');
  }
} else {
  kc = kc.replace(searchStr, auditLine + '\n' + `          // TELEGRAM: nuevo prospecto
          sendTelegramNotification(\`🏥 <b>NUEVO PROSPECTO REGISTRADO</b>\\n\\n<b>Clínica:</b> \${payload.negocio_nombre}\\n<b>Contacto:</b> \${leadForm.nombre_contacto || 'N/A'}\\n<b>Interés:</b> \${(leadForm.interes || []).join(', ') || 'N/A'}\\n<b>Etapa:</b> \${leadForm.columna}\`, 'group');
          if (leadForm.fecha_accion) { const ai = new Date(leadForm.fecha_accion).toISOString(); createCalendarEvent({ title: \`Acción: \${payload.negocio_nombre}\`, startDateTime: ai, endDateTime: new Date(new Date(leadForm.fecha_accion).getTime() + 3600000).toISOString() }); }
          setShowLeadModal(false);`);
  console.log('✅ Replaced with searchStr');
}

fs.writeFileSync('src/pages/KanbanClientes.jsx', kc, 'utf-8');
console.log('✅ KanbanClientes.jsx written.');
