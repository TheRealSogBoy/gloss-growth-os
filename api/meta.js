import { MetaClient, accountConfig } from '../integrations/meta/core.mjs';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return res.status(405).json({ error: 'Este panel solo consulta. La creación pausada se ejecuta desde Work.' }); }
  const authorization = req.headers.authorization;
  if (!/^Bearer \S+$/.test(authorization || '')) return res.status(401).json({ error: 'Inicia sesión para consultar Meta.' });
  const required = ['SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY', 'META_ALLOWED_USER_IDS', 'META_ACCOUNTS_JSON', 'META_APP_SECRET'];
  if (required.some(key => !process.env[key])) return res.status(503).json({ error: 'Conexión pendiente: faltan variables seguras del servidor.' });
  try {
    const auth = await fetch(`${process.env.SUPABASE_URL}/auth/v1/user`, { headers: { Authorization: authorization, apikey: process.env.SUPABASE_PUBLISHABLE_KEY }, signal: AbortSignal.timeout(10000), redirect: 'error' });
    if (!auth.ok) return res.status(401).json({ error: 'Sesión vencida o inválida.' });
    const user = await auth.json();
    if (!process.env.META_ALLOWED_USER_IDS.split(',').map(v => v.trim()).includes(user.id)) return res.status(403).json({ error: 'Tu usuario no está autorizado para administrar las cuentas de Meta.' });
    const config = JSON.parse(process.env.META_ACCOUNTS_JSON);
    if (!Array.isArray(config.accounts) || config.accounts.length > 12) throw new Error('Configuración inválida');
    const accounts = [];
    // Sequential calls constrain rate use and preserve account-specific failures.
    for (const entry of config.accounts) {
      try {
        const a = accountConfig(config, entry.key);
        const client = new MetaClient({ token: process.env[a.tokenEnv], appSecret: process.env.META_APP_SECRET });
        const details = await client.request(a.id, { params: { fields: 'id,name,currency,timezone_name' } });
        const insights = await client.list(`${a.id}/insights`, { date_preset: 'last_7d', level: 'account', fields: 'spend,impressions,clicks,ctr,cpc,actions,date_start,date_stop' });
        accounts.push({ key: a.key, ...details, insights });
      } catch { accounts.push({ key: entry.key, error: 'No fue posible consultar esta cuenta. Revisar permisos, token y límites de API.' }); }
    }
    return res.status(200).json({ accounts, fetchedAt: new Date().toISOString(), period: 'last_7d' });
  } catch { return res.status(502).json({ error: 'No se pudo consultar la conexión. Revisa la configuración del servidor.' }); }
}
