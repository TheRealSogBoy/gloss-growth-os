const fs = require('fs');
let content = fs.readFileSync('src/pages/KanbanClientes.jsx', 'utf-8');

const target = `        // VERCEL SERVERLESS TRIGGERS (CITA)
          if (selectedCliente.notas?.tipoCita && selectedCliente.notas?.tipoCita !== 'Ninguna' && selectedCliente.notas?.fechaCita) {
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
            );
          }`;

// Let's replace whatever is currently there. Let's find the `logAuditoria` line.
const badBlockRegex = /\/\/ VERCEL SERVERLESS TRIGGERS \(CITA\)[\s\S]*?sendTelegramNotification\([\s\S]*?'group'\s*\);\s*}/;

if (content.match(badBlockRegex)) {
  content = content.replace(badBlockRegex, target);
} else {
  console.log("Could not find bad block in KanbanClientes");
}

fs.writeFileSync('src/pages/KanbanClientes.jsx', content, 'utf-8');
