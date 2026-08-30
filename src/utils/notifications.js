import { supabase } from '../supabaseClient';

const formatCOP = (val) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(Number(val) || 0);

const getDaysUntilDayOfMonth = (targetDay) => {
  const target = parseInt(targetDay, 10);
  if (isNaN(target) || target < 1 || target > 31) return null;
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const currentDay = now.getDate();

  let targetDate = new Date(currentYear, currentMonth, target);
  if (targetDate.getMonth() !== currentMonth) {
    targetDate = new Date(currentYear, currentMonth + 1, 0);
  }

  const todayMidnight = new Date(currentYear, currentMonth, currentDay);
  let diffDays = Math.round((targetDate.getTime() - todayMidnight.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    let nextMonthDate = new Date(currentYear, currentMonth + 1, target);
    if (nextMonthDate.getMonth() !== (currentMonth + 1) % 12) {
      nextMonthDate = new Date(currentYear, currentMonth + 2, 0);
    }
    diffDays = Math.round((nextMonthDate.getTime() - todayMidnight.getTime()) / (1000 * 60 * 60 * 24));
  }

  return diffDays;
};

export const generarNotificacionesAutomaticas = async () => {
  try {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const startOfToday = `${todayStr}T00:00:00.000Z`;

    // 1. Fetch existing notifications created today to prevent duplicates
    const { data: existingToday } = await supabase
      .from('notificaciones')
      .select('titulo, tipo')
      .gte('created_at', startOfToday);

    const existingKeys = new Set(
      (existingToday || []).map((n) => `${n.tipo}__${n.titulo}`)
    );

    // 2. Fetch clients, fixed expenses, and tasks in parallel
    const [clRes, gfRes, trRes] = await Promise.all([
      supabase.from('clientes').select('id, negocio_nombre, contrato_dia_corte, contrato_valor, notas_kanban'),
      supabase.from('finanzas_gastos_fijos').select('id, concepto, categoria, monto, dia_cobro'),
      supabase.from('tareas').select('id, titulo, responsable, fecha_limite, estado'),
    ]);

    const newNotifications = [];

    // --- A. Cobros Próximos (Próximos 3 días) ---
    if (clRes.data) {
      clRes.data.forEach((c) => {
        if (c.contrato_dia_corte && c.contrato_valor) {
          const days = getDaysUntilDayOfMonth(c.contrato_dia_corte);
          if (days !== null && days >= 0 && days <= 3) {
            const titulo = `💰 Cobro próximo: ${c.negocio_nombre || 'Cliente'}`;
            const key = `cobro__${titulo}`;
            if (!existingKeys.has(key)) {
              existingKeys.add(key);
              newNotifications.push({
                tipo: 'cobro',
                titulo,
                mensaje: `Vence ${days === 0 ? 'hoy' : days === 1 ? 'mañana (en 1 día)' : `en ${days} días`} por ${formatCOP(c.contrato_valor)}`,
                enlace: '/directorio',
                leido: false,
              });
            }
          }
        }

        // --- B. Reuniones / Citas hoy ---
        const notas = c.notas_kanban || {};
        if (notas.fechaCita && notas.fechaCita.startsWith(todayStr)) {
          const titulo = `📞 Reunión hoy: ${c.negocio_nombre || 'Prospecto'}`;
          const key = `reunion__${titulo}`;
          if (!existingKeys.has(key)) {
            existingKeys.add(key);
            newNotifications.push({
              tipo: 'reunion',
              titulo,
              mensaje: `Reunión agendada para hoy con ${c.negocio_nombre} (${notas.tipoCita || 'Cita'})`,
              enlace: '/kanban-clientes',
              leido: false,
            });
          }
        }
      });
    }

    // --- C. Vencimiento de Gastos Fijos (Próximos 2 días) ---
    if (gfRes.data) {
      gfRes.data.forEach((gf) => {
        if (gf.dia_cobro) {
          const days = getDaysUntilDayOfMonth(gf.dia_cobro);
          if (days !== null && days >= 0 && days <= 2) {
            const titulo = `📉 Pago SaaS / Gasto próximo: ${gf.concepto}`;
            const key = `gasto__${titulo}`;
            if (!existingKeys.has(key)) {
              existingKeys.add(key);
              newNotifications.push({
                tipo: 'gasto',
                titulo,
                mensaje: `Vence ${days === 0 ? 'hoy' : days === 1 ? 'mañana (en 1 día)' : `en ${days} días`} por ${formatCOP(gf.monto)} (${gf.categoria || 'Gasto Fijo'})`,
                enlace: '/finanzas',
                leido: false,
              });
            }
          }
        }
      });
    }

    // --- D. Tareas pendientes que vencen hoy ---
    if (trRes.data) {
      trRes.data.forEach((t) => {
        const isDone = ['Completado', 'Hecho', 'Finalizado'].includes(t.estado);
        if (!isDone && t.fecha_limite && t.fecha_limite <= todayStr) {
          const titulo = `📋 Tarea pendiente: ${t.titulo}`;
          const key = `tarea__${titulo}`;
          if (!existingKeys.has(key)) {
            existingKeys.add(key);
            newNotifications.push({
              tipo: 'tarea',
              titulo,
              mensaje: `${t.fecha_limite === todayStr ? 'Vence hoy' : 'Vencida'} - Asignado a: ${t.responsable || 'Sin Asignar'}`,
              enlace: '/kanban-tareas',
              leido: false,
            });
          }
        }
      });
    }

    // 3. Batch insert new notifications if any
    if (newNotifications.length > 0) {
      await supabase.from('notificaciones').insert(newNotifications);
    }
  } catch (err) {
    console.error('Error generating automated notifications:', err);
  }
};
