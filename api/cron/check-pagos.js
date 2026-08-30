import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://rtgfncnkdfwiazzfosms.supabase.co';
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_y1DrmaVw6y6ye4kh6bRUpA_YsOo2z6F';
    const supabase = createClient(supabaseUrl, supabaseKey);

    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const CHAT_ID = '-1004490736144';

    const sendTelegram = async (text) => {
        if (!TELEGRAM_BOT_TOKEN) {
            console.log("No TELEGRAM_BOT_TOKEN found. Cannot send message:", text);
            return;
        }
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: CHAT_ID, text, parse_mode: 'HTML' })
        });
    };

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const { data: clientes } = await supabase.from('clientes').select('negocio_nombre, contrato');
    const { data: fijos } = await supabase.from('finanzas_gastos_fijos').select('concepto, monto, dia_cobro');
    const { data: deudas } = await supabase.from('finanzas_deudas').select('concepto, monto, fecha_limite');

    const alertas = [];

    const checkDiff = (targetDateStr) => {
        if (!targetDateStr) return null;
        const target = new Date(targetDateStr);
        target.setHours(0, 0, 0, 0);
        const diffTime = target.getTime() - today.getTime();
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays === 5 || diffDays === 1 || diffDays === 0) return diffDays;
        return null;
    };

    // 1. Cobros (Clientes)
    if (clientes) {
        clientes.forEach(c => {
            if (c.contrato && Array.isArray(c.contrato.planPagos)) {
                c.contrato.planPagos.forEach(pago => {
                    if (pago.estado === 'Pendiente') {
                        const days = checkDiff(pago.fechaLimite);
                        if (days !== null) {
                            alertas.push({
                                tipo: 'cobro',
                                titulo: `Cobro: ${c.negocio_nombre} - ${pago.concepto} ($${pago.monto})`,
                                dias: days
                            });
                        }
                    }
                });
            }
        });
    }

    // 2. Deudas
    if (deudas) {
        deudas.forEach(d => {
            const days = checkDiff(d.fecha_limite);
            if (days !== null) {
                alertas.push({
                    tipo: 'pago',
                    titulo: `Deuda: ${d.concepto} ($${d.monto})`,
                    dias: days
                });
            }
        });
    }

    // 3. Fijos
    if (fijos) {
        fijos.forEach(f => {
            if (f.dia_cobro) {
                let targetThisMonth = new Date(today.getFullYear(), today.getMonth(), Number(f.dia_cobro));
                targetThisMonth.setHours(0, 0, 0, 0);
                if (targetThisMonth < today) {
                    targetThisMonth.setMonth(targetThisMonth.getMonth() + 1);
                }
                const diffTime = targetThisMonth.getTime() - today.getTime();
                const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
                if (diffDays === 5 || diffDays === 1 || diffDays === 0) {
                    alertas.push({
                        tipo: 'pago_fijo',
                        titulo: `Gasto Fijo: ${f.concepto} ($${f.monto})`,
                        dias: diffDays
                    });
                }
            }
        });
    }

    if (alertas.length > 0) {
        let msg = `🔔 <b>RESUMEN FINANCIERO (VENCIMIENTOS)</b>\n\n`;
        
        for (const a of alertas) {
            const timeLabel = a.dias === 0 ? 'HOY 🚨' : `en ${a.dias} día(s) ⏳`;
            msg += `• ${a.titulo} - Vence: ${timeLabel}\n`;
            
            await supabase.from('notificaciones').insert([{
                titulo: a.titulo,
                tipo: 'alerta_financiera',
                mensaje: `Vence ${timeLabel}`,
                leido: false
            }]);
        }

        await sendTelegram(msg);
    }

    return res.status(200).json({ success: true, alertas_enviadas: alertas.length });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
}
