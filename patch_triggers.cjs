const fs = require('fs');

function patchFile(filePath, type) {
  let content = fs.readFileSync(filePath, 'utf-8');

  // Replace import
  content = content.replace(
    /import \{ triggerN8nWebhook \} from '\.\.\/utils\/n8n';/,
    `import { sendTelegramNotification, createCalendarEvent } from '../lib/notifications';`
  );

  // Replace trigger
  if (type === 'cita') {
    const triggerRegex = /\/\/ TRIGGER n8n WEBHOOK \(CITA\)[\s\S]*?triggerN8nWebhook\(\{[\s\S]*?\}\);/m;
    const replacement = `// VERCEL SERVERLESS TRIGGERS (CITA)
          const startDate = new Date(selectedCliente.notas.fechaCita).toISOString();
          const endDate = new Date(new Date(selectedCliente.notas.fechaCita).getTime() + 60*60*1000).toISOString();
          
          createCalendarEvent({
            title: \`Cita: \${selectedCliente.negocio?.nombre || 'Cliente'}\`,
            description: selectedCliente.notas.texto || '',
            startDateTime: startDate,
            endDateTime: endDate,
            location: selectedCliente.direccion_cita || ''
          });

          sendTelegramNotification(
            \`🔔 <b>NUEVA CITA AGENDADA</b>\\n\\n<b>Cliente:</b> \${selectedCliente.negocio?.nombre}\\n<b>Fecha:</b> \${new Date(startDate).toLocaleString('es-CO')}\\n<b>Tipo:</b> \${selectedCliente.notas.tipoCita}\`,
            'group'
          );`;
    content = content.replace(triggerRegex, replacement);
  } else if (type === 'tarea') {
    const triggerRegex = /\/\/ TRIGGER n8n WEBHOOK \(TAREA\)[\s\S]*?triggerN8nWebhook\(\{[\s\S]*?\}\);/m;
    const replacement = `// VERCEL SERVERLESS TRIGGERS (TAREA)
          const startDate = new Date().toISOString();
          const endDate = nuevaTarea.fechaLimite ? new Date(nuevaTarea.fechaLimite).toISOString() : new Date().toISOString();
          
          createCalendarEvent({
            title: \`Tarea: \${nuevaTarea.titulo}\`,
            description: nuevaTarea.descripcion || '',
            startDateTime: startDate,
            endDateTime: endDate
          });

          sendTelegramNotification(
            \`📋 <b>NUEVA TAREA ASIGNADA</b>\\n\\n<b>Tarea:</b> \${nuevaTarea.titulo}\\n<b>Límite:</b> \${nuevaTarea.fechaLimite || 'Sin límite'}\\n<b>Asignado a:</b> \${nuevaTarea.responsable}\`,
            'group'
          );`;
    content = content.replace(triggerRegex, replacement);
  } else if (type === 'cobro') {
    const triggerRegex = /\/\/ TRIGGER n8n WEBHOOK \(COBRO\)[\s\S]*?triggerN8nWebhook\(\{[\s\S]*?\}\);/m;
    const replacement = `// VERCEL SERVERLESS TRIGGERS (COBRO)
        sendTelegramNotification(
          \`💰 <b>NUEVO INGRESO REGISTRADO</b>\\n\\n<b>Concepto:</b> \${payload.concepto}\\n<b>Monto:</b> $\${payload.monto}\\n<b>Origen:</b> \${payload.origen}\`,
          'group'
        );`;
    content = content.replace(triggerRegex, replacement);
  }

  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(filePath + ' patched successfully.');
}

patchFile('src/pages/KanbanClientes.jsx', 'cita');
patchFile('src/pages/KanbanTareas.jsx', 'tarea');
patchFile('src/pages/Finanzas.jsx', 'cobro');
