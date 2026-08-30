import { supabase } from '../supabaseClient';

export const logAuditoria = async (user, modulo, accion, detalle) => {
  if (!user) return;
  try {
    await supabase.from('auditoria_logs').insert([{
      usuario_email: user.email,
      usuario_nombre: user.user_metadata?.full_name || user.email,
      modulo,
      accion,
      detalle
    }]);
  } catch (err) {
    console.error('Error logging audit', err);
  }
};
