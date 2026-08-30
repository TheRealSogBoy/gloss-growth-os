import { supabase } from '../supabaseClient';

export const logAuditoria = async (user, modulo, accion, detalle) => {
  if (!user) return;
  const userName = user.user_metadata?.full_name || user.email;
  try {
    // 1. Insert into auditoria_logs
    await supabase.from('auditoria_logs').insert([{
      usuario_email: user.email,
      usuario_nombre: userName,
      modulo,
      accion,
      detalle
    }]);

    // 2. Determine target link and notification type based on module
    let enlace = '/';
    let tipo = 'sistema';
    if (modulo === 'Finanzas') {
      enlace = '/finanzas';
      tipo = 'gasto';
    } else if (modulo === 'Directorio') {
      enlace = '/directorio';
      tipo = 'cobro';
    } else if (modulo === 'Pipeline Comercial' || modulo === 'Kanban Clientes') {
      enlace = '/kanban-clientes';
      tipo = 'reunion';
    } else if (modulo === 'Kanban Tareas') {
      enlace = '/kanban-tareas';
      tipo = 'tarea';
    } else if (modulo === 'Catálogo') {
      enlace = '/catalogo';
      tipo = 'sistema';
    }

    // 3. Insert notification for partner action
    await supabase.from('notificaciones').insert([{
      titulo: `Nuevo movimiento: ${userName}`,
      mensaje: `${accion} en ${modulo}: ${detalle}`,
      tipo,
      enlace,
      leido: false
    }]);
  } catch (err) {
    console.error('Error logging audit and notification:', err);
  }
};
