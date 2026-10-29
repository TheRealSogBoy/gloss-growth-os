import test from 'node:test';
import assert from 'node:assert/strict';
import { compile, createPaused, MetaClient, preflight } from '../integrations/meta/core.mjs';
import handler from '../api/meta.js';

const config = { accounts: [{ key: 'test', id: 'act_123', currency: 'COP', pageId: '456', whatsapp: '573001234567', maxDailyMinor: 5000000, tokenEnv: 'META_TOKEN_TEST' }] };
function plan() { return { account: 'test', name: 'Prueba', dailyBudget: '20000', startTime: '2030-01-01T00:00:00-05:00', endTime: '2030-01-08T00:00:00-05:00', pixelId: null, specialAdCategories: [], targeting: { geo_locations: { countries: ['CO'] }, age_min: 25, age_max: 60 }, placements: { publisher_platforms: ['facebook'], facebook_positions: ['feed'] }, ads: [{ name: 'Imagen', message: 'Texto de prueba', title: 'Título', imageHash: 'a'.repeat(32) }] }; }
test('presupuesto COP exacto, revisión y todos los objetos pausados', () => {
  const p = compile(plan(), config); assert.equal(p.adset.daily_budget, '2000000'); assert.equal(p.review.nominalPeriodBudget, '140000.00'); assert.equal(p.campaign.status, 'PAUSED'); assert.equal(p.adset.status, 'PAUSED'); assert.equal(p.adset.destination_type, 'WHATSAPP'); assert.equal(p.adset.optimization_goal, 'CONVERSATIONS'); assert.equal(p.creatives[0].object_story_spec.link_data.link, 'https://wa.me/573001234567');
});
test('cualquier cambio de presupuesto, público o destino cambia digest', () => {
  const original = compile(plan(), config).digest;
  const p = plan(); p.dailyBudget = '20001'; assert.notEqual(compile(p, config).digest, original);
  p.dailyBudget = '20000'; p.targeting.age_min = 30; assert.notEqual(compile(p, config).digest, original);
  const c = structuredClone(config); c.accounts[0].whatsapp = '573009999999'; assert.notEqual(compile(plan(), c).digest, original);
});
test('rechaza datos incompletos, ACTIVE, moneda desconocida y exceso de presupuesto', () => {
  for (const change of [p => p.status = 'ACTIVE', p => p.dailyBudget = '999999', p => p.dailyBudget = '20.000,00', p => p.dailyBudget = '-10', p => p.account = 'otro', p => p.pixelId = '999', p => p.specialAdCategories = ['HOUSING'], p => p.startTime = '2030-01-01', p => p.targeting.age_min = 12, p => p.ads[0].videoId = '99']) {
    const p = plan(); change(p); assert.throws(() => compile(p, config));
  }
  const c = structuredClone(config); c.accounts[0].currency = 'JPY'; assert.throws(() => compile(plan(), c));
});
test('video requiere miniatura y conserva destino WhatsApp', () => {
  const p = plan(); delete p.ads[0].imageHash; p.ads[0].videoId = '999';
  assert.throws(() => compile(p, config)); p.ads[0].thumbnailHash = 'b'.repeat(32);
  assert.equal(compile(p, config).creatives[0].object_story_spec.video_data.video_id, '999');
});
test('cliente impide ACTIVE, actualizar IDs existentes y rutas externas', async () => {
  let calls = 0; const client = new MetaClient({ token: 'secret', appSecret: 'app', fetcher: async () => { calls++; return { ok: true, json: async () => ({ id: '1' }) }; } });
  await assert.rejects(client.request('act_123/ads', { method: 'POST', body: { status: 'ACTIVE' } }));
  await assert.rejects(client.request('123', { method: 'POST', body: { status: 'ACTIVE' } }));
  await assert.rejects(client.request('https://example.com')); assert.equal(calls, 0);
});
test('tokens solo en Authorization; errores no repiten secretos de Meta', async () => {
  const client = new MetaClient({ token: 'very-secret-token', appSecret: 'app', fetcher: async (url, opts) => { assert.ok(!String(url).includes('very-secret-token')); assert.equal(opts.headers.Authorization, 'Bearer very-secret-token'); return { ok: false, status: 400, json: async () => ({ error: { code: 190, message: 'very-secret-token', fbtrace_id: 'trace' } }) }; } });
  await assert.rejects(client.request('me'), e => !e.message.includes('very-secret-token') && e.message.includes('190'));
});
test('paginación usa cursores en host fijo e ignora URL next externa', async () => {
  let n = 0; const client = new MetaClient({ token: 'secret', appSecret: 'app', fetcher: async url => { assert.equal(url.hostname, 'graph.facebook.com'); n++; return { ok: true, json: async () => n === 1 ? { data: [1], paging: { next: 'https://evil.example', cursors: { after: 'cursor' } } } : { data: [2] } }; } });
  assert.deepEqual(await client.list('me/adaccounts'), [1, 2]);
});
test('preflight bloquea moneda de cuenta diferente y permisos faltantes', async () => {
  await assert.rejects(preflight({ request: async () => ({ id: 'act_123', currency: 'USD', account_status: 1 }) }, config.accounts[0]));
  await assert.rejects(preflight({ request: async () => ({ id: 'act_123', currency: 'COP', account_status: 1 }), list: async () => [] }, config.accounts[0]));
});
function memoryJournal() { const map = new Map(); return { get: k => map.get(k), set: (k,v) => map.set(k,v) }; }
test('creación completa lee PAUSED y una repetición no vuelve a escribir', async () => {
  let writes = 0; const client = { request: async (path, opts) => opts.method === 'POST' ? (writes++, { id: String(writes) }) : { status: 'PAUSED' } };
  const journal = memoryJournal(), p = compile(plan(), config);
  assert.equal((await createPaused(p, client, journal)).status, 'PAUSED_VERIFIED'); assert.equal(writes, 4);
  await createPaused(p, client, journal); assert.equal(writes, 4);
});
test('timeout deja paso pendiente y no duplica campaña en reintento', async () => {
  let writes = 0; const client = { request: async () => { writes++; throw new Error('timeout'); } };
  const journal = memoryJournal(), p = compile(plan(), config);
  await assert.rejects(createPaused(p, client, journal)); await assert.rejects(createPaused(p, client, journal), /sin confirmar/); assert.equal(writes, 1);
});
test('fallo parcial no continúa y readback ACTIVE bloquea éxito', async () => {
  let writes = 0; const journal = memoryJournal(), p = compile(plan(), config);
  const client = { request: async (_, opts) => { if (opts.method === 'POST') { writes++; if (writes === 2) throw new Error('failed'); return { id: '1' }; } return { status: 'ACTIVE' }; } };
  await assert.rejects(createPaused(p, client, journal)); assert.equal(writes, 2); assert.equal(journal.get('campaign').state, 'done');
  await assert.rejects(createPaused(p, { request: async (_, opts) => opts.method === 'POST' ? { id: '1' } : { status: 'ACTIVE' } }, memoryJournal()), /Estado no confirmado/);
});
const response = () => ({ code: 0, body: null, setHeader() {}, status(n) { this.code = n; return this; }, json(b) { this.body = b; return this; } });
test('API web rechaza escrituras y lectura sin sesión', async () => {
  let res = response(); await handler({ method: 'POST', headers: {} }, res); assert.equal(res.code, 405);
  res = response(); await handler({ method: 'GET', headers: {} }, res); assert.equal(res.code, 401);
});
test('API web falla cerrada sin configuración y aplica autorización de servidor', async () => {
  const names = ['SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY', 'META_ALLOWED_USER_IDS', 'META_ACCOUNTS_JSON', 'META_APP_SECRET', 'META_TOKEN_TEST'];
  const saved = Object.fromEntries(names.map(k => [k, process.env[k]])); const originalFetch = globalThis.fetch;
  try {
    for (const k of names) delete process.env[k];
    let res = response(); await handler({ method: 'GET', headers: { authorization: 'Bearer session' } }, res); assert.equal(res.code, 503);
    Object.assign(process.env, { SUPABASE_URL: 'https://test.supabase.co', SUPABASE_PUBLISHABLE_KEY: 'publishable', META_ALLOWED_USER_IDS: 'allowed-user', META_ACCOUNTS_JSON: JSON.stringify(config), META_APP_SECRET: 'app', META_TOKEN_TEST: 'meta-secret' });
    globalThis.fetch = async () => ({ ok: true, json: async () => ({ id: 'other-user', user_metadata: { role: 'superadmin' } }) });
    res = response(); await handler({ method: 'GET', headers: { authorization: 'Bearer session' } }, res); assert.equal(res.code, 403);
    globalThis.fetch = async url => {
      if (String(url).includes('/auth/v1/user')) return { ok: true, json: async () => ({ id: 'allowed-user' }) };
      return { ok: true, json: async () => String(url).includes('/insights') ? { data: [{ spend: '10', date_start: '2026-10-22', date_stop: '2026-10-28' }] } : { id: 'act_123', currency: 'COP' } };
    };
    res = response(); await handler({ method: 'GET', headers: { authorization: 'Bearer session' } }, res); assert.equal(res.code, 200); assert.equal(res.body.accounts[0].insights[0].spend, '10'); assert.ok(!JSON.stringify(res.body).includes('meta-secret'));
  } finally { globalThis.fetch = originalFetch; for (const k of names) { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k]; } }
});
