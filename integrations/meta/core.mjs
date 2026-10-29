import { createHash, createHmac } from 'node:crypto';

export const API_VERSION = 'v26.0';
export function assert(ok, message) { if (!ok) throw new Error(message); }
export function hash(value) { return createHash('sha256').update(JSON.stringify(value)).digest('hex'); }
const id = value => typeof value === 'string' && /^\d+$/.test(value);
const text = value => typeof value === 'string' && value.trim().length > 0;
function keys(value, allowed, label) {
  assert(value && typeof value === 'object' && !Array.isArray(value), `${label}: objeto requerido`);
  assert(Object.keys(value).every(k => allowed.includes(k)), `${label}: campos no admitidos`);
}
export function accountConfig(config, key) {
  const a = config.accounts?.find(a => a.key === key);
  assert(a && /^act_\d+$/.test(a.id), 'Cuenta no autorizada o ID inválido');
  assert(['COP', 'USD', 'EUR', 'MXN'].includes(a.currency), 'Moneda no soportada en MVP');
  assert(id(a.pageId) && /^\d{8,15}$/.test(a.whatsapp), 'Falta página o WhatsApp autorizado');
  assert(Number.isSafeInteger(a.maxDailyMinor) && a.maxDailyMinor > 0, 'Falta límite diario de la cuenta');
  assert(/^META_TOKEN_[A-Z0-9_]+$/.test(a.tokenEnv), 'Nombre de variable de token inválido');
  return a;
}
export function compile(plan, config, now = Date.now()) {
  keys(plan, ['account', 'name', 'dailyBudget', 'startTime', 'endTime', 'targeting', 'placements', 'ads', 'pixelId', 'specialAdCategories'], 'Plan');
  const account = accountConfig(config, plan.account);
  assert(text(plan.name) && plan.name.length <= 150, 'Nombre requerido (máximo 150 caracteres)');
  assert(typeof plan.dailyBudget === 'string' && /^\d+(\.\d{1,2})?$/.test(plan.dailyBudget), 'Presupuesto: texto decimal sin separadores de miles');
  const [whole, fraction = ''] = plan.dailyBudget.split('.');
  const minor = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
  assert(minor > 0n && minor <= BigInt(account.maxDailyMinor), 'Presupuesto fuera del límite autorizado');
  const start = Date.parse(plan.startTime), end = Date.parse(plan.endTime);
  assert(/(Z|[+-]\d\d:\d\d)$/.test(plan.startTime) && /(Z|[+-]\d\d:\d\d)$/.test(plan.endTime), 'Fechas deben incluir zona horaria');
  assert(start > now && end > start && end - start <= 90 * 86400000, 'Fechas inválidas; inicio futuro y máximo 90 días');
  assert(Array.isArray(plan.specialAdCategories) && plan.specialAdCategories.length === 0, 'MVP solo admite campañas sin categoría especial; confirmar explícitamente []');
  assert(plan.pixelId === null, 'WhatsApp: pixelId debe ser null. Conversiones web requieren otro flujo');
  keys(plan.targeting, ['geo_locations', 'age_min', 'age_max', 'genders', 'flexible_spec', 'custom_audiences', 'excluded_custom_audiences'], 'Segmentación');
  assert(plan.targeting.geo_locations && Object.keys(plan.targeting.geo_locations).length, 'Ubicación geográfica requerida');
  assert(Number.isInteger(plan.targeting.age_min) && plan.targeting.age_min >= 18 && Number.isInteger(plan.targeting.age_max) && plan.targeting.age_max <= 65 && plan.targeting.age_max >= plan.targeting.age_min, 'Rango de edad inválido');
  keys(plan.placements, ['publisher_platforms', 'facebook_positions', 'instagram_positions', 'device_platforms'], 'Ubicaciones');
  assert(Array.isArray(plan.placements.publisher_platforms) && plan.placements.publisher_platforms.length > 0 && plan.placements.publisher_platforms.every(p => ['facebook', 'instagram'].includes(p)), 'Selecciona Facebook y/o Instagram');
  assert(Array.isArray(plan.ads) && plan.ads.length > 0 && plan.ads.length <= 10, 'Se requieren entre 1 y 10 anuncios');
  const destination = `https://wa.me/${account.whatsapp}`;
  const creatives = plan.ads.map(ad => {
    keys(ad, ['name', 'message', 'title', 'imageHash', 'videoId', 'thumbnailHash'], 'Anuncio');
    assert(text(ad.name) && text(ad.message) && text(ad.title), 'Nombre, texto y título requeridos');
    assert(Boolean(ad.imageHash) !== Boolean(ad.videoId), 'Usa una imagen o un video por anuncio');
    const call_to_action = { type: 'WHATSAPP_MESSAGE', value: { link: destination } };
    const story = { page_id: account.pageId };
    if (account.instagramId) { assert(id(account.instagramId), 'Instagram ID inválido'); story.instagram_user_id = account.instagramId; }
    if (ad.videoId) {
      assert(id(ad.videoId) && /^[a-f0-9]{32}$/i.test(ad.thumbnailHash), 'Video ID y hash de miniatura requeridos');
      story.video_data = { video_id: ad.videoId, image_hash: ad.thumbnailHash, message: ad.message, title: ad.title, call_to_action };
    } else {
      assert(/^[a-f0-9]{32}$/i.test(ad.imageHash), 'Hash de imagen inválido');
      story.link_data = { image_hash: ad.imageHash, link: destination, message: ad.message, name: ad.title, call_to_action };
    }
    return { name: ad.name, object_story_spec: story };
  });
  const result = {
    version: API_VERSION, accountId: account.id,
    campaign: { name: plan.name, objective: 'OUTCOME_ENGAGEMENT', buying_type: 'AUCTION', special_ad_categories: [], status: 'PAUSED', is_adset_budget_sharing_enabled: false },
    adset: { name: `${plan.name} · WhatsApp`, daily_budget: String(minor), billing_event: 'IMPRESSIONS', optimization_goal: 'CONVERSATIONS', bid_strategy: 'LOWEST_COST_WITHOUT_CAP', destination_type: 'WHATSAPP', promoted_object: { page_id: account.pageId, whatsapp_phone_number: account.whatsapp }, targeting: { ...plan.targeting, ...plan.placements }, start_time: plan.startTime, end_time: plan.endTime, status: 'PAUSED' },
    creatives,
    review: { account: account.key, currency: account.currency, dailyBudget: plan.dailyBudget, nominalPeriodBudget: (Number(minor) / 100 * ((end - start) / 86400000)).toFixed(2), budgetNote: 'Estimación nominal; el presupuesto diario no es un tope exacto de gasto por día. Todo se crea PAUSED.', destination, pixel: 'No aplica a conversaciones de WhatsApp', status: 'PAUSED', start: plan.startTime, end: plan.endTime }
  };
  return { ...result, digest: hash(result) };
}

export class MetaClient {
  constructor({ token, appSecret, fetcher = fetch }) {
    assert(token && appSecret, 'Faltan credenciales de Meta en el entorno seguro');
    this.token = token; this.proof = createHmac('sha256', appSecret).update(token).digest('hex'); this.fetcher = fetcher;
  }
  async request(path, { method = 'GET', params = {}, body } = {}) {
    assert(/^(me|search|act_\d+|\d+)(\/[a-z_]+)?$/.test(path), 'Ruta Meta no permitida');
    if (method !== 'GET') {
      assert(method === 'POST' && /^act_\d+\/(campaigns|adsets|adcreatives|ads|adimages|advideos)$/.test(path), 'Solo se permite crear objetos; activación y edición bloqueadas');
      const status = body instanceof FormData ? body.get('status') : body?.status;
      if (/\/(campaigns|adsets|ads)$/.test(path)) assert(status === 'PAUSED', 'Todo objeto entregable debe crearse PAUSED');
    }
    const url = new URL(`https://graph.facebook.com/${API_VERSION}/${path}`);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, typeof v === 'object' ? JSON.stringify(v) : String(v));
    url.searchParams.set('appsecret_proof', this.proof);
    let payload;
    if (body instanceof FormData) payload = body;
    else if (body) { payload = new URLSearchParams(); for (const [k,v] of Object.entries(body)) payload.set(k, typeof v === 'object' ? JSON.stringify(v) : String(v)); }
    let response, data;
    try {
      response = await this.fetcher(url, { method, headers: { Authorization: `Bearer ${this.token}` }, body: payload, signal: AbortSignal.timeout(60000), redirect: 'error' });
      data = await response.json();
    } catch { throw new Error('Meta no confirmó la respuesta. No reintentar escrituras sin reconciliar el registro.'); }
    if (!response.ok || data.error) {
      const e = data.error || {};
      // Do not expose upstream text: it may echo credentials or supplied content.
      throw new Error(`Meta rechazó la solicitud (HTTP ${response.status}, código ${e.code ?? '-'}, subcódigo ${e.error_subcode ?? '-'}, referencia ${String(e.fbtrace_id ?? '-').replace(/[^\w-]/g, '')}).`);
    }
    return data;
  }
  async list(path, params = {}) {
    const rows = []; let after;
    for (let page = 0; page < 100; page++) {
      const result = await this.request(path, { params: { ...params, limit: 100, ...(after ? { after } : {}) } });
      assert(Array.isArray(result.data), 'Respuesta de lista inválida'); rows.push(...result.data);
      if (!result.paging?.next) return rows;
      const next = result.paging?.cursors?.after;
      assert(next && next !== after, 'Paginación inválida'); after = next;
    }
    throw new Error('Más de 100 páginas: reducir el periodo');
  }
}

export async function preflight(client, a) {
  const actual = await client.request(a.id, { params: { fields: 'id,name,currency,account_status,timezone_name' } });
  assert(actual.id === a.id && actual.currency === a.currency && actual.account_status === 1, 'Cuenta, moneda o estado no coinciden con la configuración');
  const permissions = await client.list('me/permissions');
  for (const p of ['ads_management', 'ads_read']) assert(permissions.some(v => v.permission === p && v.status === 'granted'), `Falta permiso ${p}`);
  return actual;
}

export async function createPaused(compiled, client, journal) {
  const run = async (key, endpoint, body) => {
    const previous = journal.get(key);
    if (previous?.state === 'done') return previous.result;
    assert(!previous, `Paso ${key} sin confirmar. Reconciliar en Meta antes de continuar; no se reintentó.`);
    journal.set(key, { state: 'pending', at: new Date().toISOString() });
    const result = await client.request(`${compiled.accountId}/${endpoint}`, { method: 'POST', body });
    assert(id(result.id), 'Meta no devolvió un ID; reconciliar registro');
    journal.set(key, { state: 'done', result: { id: result.id } });
    return result;
  };
  const campaign = await run('campaign', 'campaigns', compiled.campaign);
  const adset = await run('adset', 'adsets', { ...compiled.adset, campaign_id: campaign.id });
  const ads = [];
  for (const [i, creative] of compiled.creatives.entries()) {
    const c = await run(`creative-${i}`, 'adcreatives', creative);
    ads.push(await run(`ad-${i}`, 'ads', { name: creative.name, adset_id: adset.id, creative: { creative_id: c.id }, status: 'PAUSED' }));
  }
  for (const object of [campaign, adset, ...ads]) {
    const actual = await client.request(object.id, { params: { fields: 'id,status,effective_status' } });
    assert(actual.status === 'PAUSED', `Estado no confirmado PAUSED para ${object.id}. Revisar en Meta.`);
  }
  return { campaign, adset, ads, status: 'PAUSED_VERIFIED' };
}
