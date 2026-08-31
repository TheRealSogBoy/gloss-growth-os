const fs = require('fs');

// ─── KanbanClientes.jsx ───────────────────────────────────────────────
let kc = fs.readFileSync('src/pages/KanbanClientes.jsx', 'utf-8');

// 1. Ensure correct import (idempotent)
if (!kc.includes('sendTelegramNotification')) {
  kc = kc.replace(
    /import \{ triggerN8nWebhook \} from '\.\.\/utils\/n8n';/,
    `import { sendTelegramNotification, createCalendarEvent } from '../lib/notifications';`
  );
}

// 2. Inject Telegram trigger inside handleSaveLead after logAuditoria
const saveLeadLogAudit = `logAuditoria(user, 'Pipeline Comercial', 'CREAR', \`Nuevo prospecto agregado: \${payload.negocio_nombre}\`);
          setShowLeadModal(false);`;

const saveLeadReplacement = `logAuditoria(user, 'Pipeline Comercial', 'CREAR', \`Nuevo prospecto agregado: \${payload.negocio_nombre}\`);

          // TELEGRAM: nuevo prospecto creado
          sendTelegramNotification(
            \`🏥 <b>NUEVO PROSPECTO REGISTRADO</b>\\n\\n<b>Clínica:</b> \${payload.negocio_nombre}\\n<b>Contacto:</b> \${leadForm.nombre_contacto || 'N/A'}\\n<b>Teléfono:</b> \${leadForm.telefono || 'N/A'}\\n<b>Interés:</b> \${(leadForm.interes || []).join(', ') || 'N/A'}\\n<b>Valor:</b> $\${leadForm.valor || '0'}\\n<b>Etapa:</b> \${leadForm.columna}\`,
            'group'
          );

          // CALENDAR + TELEGRAM: si hay fecha de próxima acción
          if (leadForm.fecha_accion) {
            const fechaISO = new Date(leadForm.fecha_accion).toISOString();
            const endISO = new Date(new Date(leadForm.fecha_accion).getTime() + 60 * 60 * 1000).toISOString();
            createCalendarEvent({
              title: \`Acción: \${payload.negocio_nombre}\`,
              description: \`Interés: \${(leadForm.interes || []).join(', ')}\`,
              startDateTime: fechaISO,
              endDateTime: endISO,
            });
            sendTelegramNotification(
              \`📅 <b>ACCIÓN AGENDADA EN CALENDARIO</b>\\n\\n<b>Prospecto:</b> \${payload.negocio_nombre}\\n<b>Fecha:</b> \${new Date(leadForm.fecha_accion).toLocaleString('es-CO')}\`,
              'group'
            );
          }

          setShowLeadModal(false);`;

if (kc.includes(saveLeadLogAudit)) {
  kc = kc.replace(saveLeadLogAudit, saveLeadReplacement);
  console.log('✅ KanbanClientes: handleSaveLead trigger injected');
} else {
  console.log('⚠️  KanbanClientes: handleSaveLead pattern not found');
}

fs.writeFileSync('src/pages/KanbanClientes.jsx', kc, 'utf-8');

// ─── KanbanTareas.jsx ────────────────────────────────────────────────
let kt = fs.readFileSync('src/pages/KanbanTareas.jsx', 'utf-8');

const oldTareaBlock = /\/\/ VERCEL SERVERLESS TRIGGERS \(TAREA\)[\s\S]*?sendTelegramNotification\([\s\S]*?'group'\s*\);\s*(?!\})/;
const newTareaBlock = `// VERCEL SERVERLESS TRIGGERS (TAREA)
            if (nuevaTarea.fechaLimite) {
              createCalendarEvent({
                title: \`Tarea: \${nuevaTarea.titulo}\`,
                description: nuevaTarea.descripcion || '',
                startDateTime: new Date(nuevaTarea.fechaLimite).toISOString(),
                endDateTime: new Date(new Date(nuevaTarea.fechaLimite).getTime() + 60 * 60 * 1000).toISOString(),
              });
            }

            sendTelegramNotification(
              \`📋 <b>NUEVA TAREA CREADA</b>\\n\\n<b>Tarea:</b> \${nuevaTarea.titulo}\\n<b>Límite:</b> \${nuevaTarea.fechaLimite ? new Date(nuevaTarea.fechaLimite).toLocaleDateString('es-CO') : 'Sin límite'}\\n<b>Asignado a:</b> \${nuevaTarea.responsable}\\n<b>Prioridad:</b> \${nuevaTarea.prioridad || 'Normal'}\`,
              'group'
            );`;

if (kt.match(oldTareaBlock)) {
  kt = kt.replace(oldTareaBlock, newTareaBlock);
  console.log('✅ KanbanTareas: trigger updated with calendar');
} else {
  console.log('⚠️  KanbanTareas: trigger pattern not found, trying alternate');
  // Alternate: inject after logAuditoria in handleQuickAdd
  kt = kt.replace(
    `logAuditoria(user, 'Kanban Tareas', 'CREAR', \`Nueva tarea creada: \${nuevaTarea.titulo}\`);`,
    `logAuditoria(user, 'Kanban Tareas', 'CREAR', \`Nueva tarea creada: \${nuevaTarea.titulo}\`);
          
          ${newTareaBlock}`
  );
}

fs.writeFileSync('src/pages/KanbanTareas.jsx', kt, 'utf-8');

// ─── Finanzas.jsx ────────────────────────────────────────────────────
let fin = fs.readFileSync('src/pages/Finanzas.jsx', 'utf-8');

const oldFinanzasBlock = /\/\/ VERCEL SERVERLESS TRIGGERS \(COBRO\)[\s\S]*?sendTelegramNotification\([\s\S]*?'group'\s*\);/;
const newFinanzasBlock = `// VERCEL SERVERLESS TRIGGERS (COBRO)
        sendTelegramNotification(
          \`💰 <b>NUEVO INGRESO REGISTRADO</b>\\n\\n<b>Concepto:</b> \${payload.concepto}\\n<b>Cliente:</b> \${payload.cliente}\\n<b>Tipo:</b> \${payload.tipo}\\n<b>Monto:</b> $\${Number(payload.monto).toLocaleString('es-CO')}\\n<b>Fecha:</b> \${payload.fecha}\`,
          'group'
        );

        // CALENDAR: crear recordatorio si hay fecha futura de cobro
        if (payload.fecha) {
          const fechaISO = new Date(payload.fecha + 'T08:00:00').toISOString();
          const endISO = new Date(payload.fecha + 'T09:00:00').toISOString();
          createCalendarEvent({
            title: \`💰 Cobro: \${payload.concepto} - \${payload.cliente}\`,
            description: \`Monto: $\${Number(payload.monto).toLocaleString('es-CO')} | Tipo: \${payload.tipo}\`,
            startDateTime: fechaISO,
            endDateTime: endISO,
          });
        }`;

if (fin.match(oldFinanzasBlock)) {
  fin = fin.replace(oldFinanzasBlock, newFinanzasBlock);
  console.log('✅ Finanzas: trigger updated with calendar + client detail');
} else {
  console.log('⚠️  Finanzas: trigger pattern not found');
}

fs.writeFileSync('src/pages/Finanzas.jsx', fin, 'utf-8');

console.log('✅ All patches applied.');
