import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { accountConfig, assert, compile, createPaused, hash, MetaClient, preflight } from './core.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const local = path.join(root, '.local');
fs.mkdirSync(local, { recursive: true });
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const print = data => process.stdout.write(JSON.stringify(data, null, 2) + '\n');
const [command, ...args] = process.argv.slice(2);
const help = 'Comandos: doctor CUENTA | preview PLAN.json | create PLAN.json DIGEST | image CUENTA ARCHIVO | video CUENTA ARCHIVO | video-status CUENTA ID | insights CUENTA | assets CUENTA | locations CUENTA CONSULTA | ad-preview CUENTA AD_ID';

function locked(file, callback) {
  const fd = fs.openSync(`${file}.lock`, 'wx');
  return Promise.resolve().then(callback).finally(() => { fs.closeSync(fd); fs.unlinkSync(`${file}.lock`); });
}
function store(file, binding) {
  let data = fs.existsSync(file) ? read(file) : { binding, steps: {} };
  assert(data.binding === binding, 'El registro pertenece a otra configuración');
  return {
    get: key => data.steps[key],
    set(key, value) {
      data.steps[key] = value;
      const temp = `${file}.tmp`;
      const fd = fs.openSync(temp, 'w', 0o600);
      try { fs.writeFileSync(fd, JSON.stringify(data, null, 2)); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
      fs.renameSync(temp, file);
    }
  };
}
try {
  if (!command || command === 'help') { print({ help }); process.exit(0); }
  const config = read(path.join(local, 'accounts.json'));
  if (command === 'preview' || command === 'create') {
    const plan = read(args[0]); const compiled = compile(plan, config);
    if (command === 'preview') { print(compiled); process.exit(0); }
    assert(args[1] === compiled.digest, 'Debes revisar el plan y proporcionar su digest exacto; cualquier cambio exige otra revisión');
    const a = accountConfig(config, plan.account);
    const client = new MetaClient({ token: process.env[a.tokenEnv], appSecret: process.env.META_APP_SECRET });
    await preflight(client, a);
    const pages = await client.list(`${a.id}/promote_pages`, { fields: 'id' });
    assert(pages.some(p => p.id === a.pageId), 'La página no está disponible para esta cuenta');
    // Asset availability is checked before the first creation; videos must finish processing.
    const images = await client.list(`${a.id}/adimages`, { fields: 'hash' });
    for (const ad of plan.ads) {
      assert(images.some(i => i.hash === (ad.imageHash || ad.thumbnailHash)), 'Imagen o miniatura no pertenece a la cuenta');
      if (ad.videoId) {
        const videos = await client.list(`${a.id}/advideos`, { fields: 'id' });
        assert(videos.some(v => v.id === ad.videoId), 'Video no pertenece a la cuenta');
        const video = await client.request(ad.videoId, { params: { fields: 'status' } });
        assert(video.status?.video_status === 'ready', 'El video todavía no está listo');
      }
    }
    const journalFile = path.join(local, `run-${compiled.digest}.json`);
    await locked(journalFile, async () => print(await createPaused(compiled, client, store(journalFile, compiled.digest))));
    process.exit(0);
  }
  const a = accountConfig(config, args[0]);
  const client = new MetaClient({ token: process.env[a.tokenEnv], appSecret: process.env.META_APP_SECRET });
  if (command === 'doctor') print({ account: await preflight(client, a), note: 'Falta comprobar acceso avanzado, página y vínculo de WhatsApp en la app de Meta. No se creó ningún anuncio.' });
  else if (command === 'assets') print({ pages: await client.list(`${a.id}/promote_pages`, { fields: 'id,name' }), pixels: await client.list(`${a.id}/adspixels`, { fields: 'id,name' }) });
  else if (command === 'locations') print(await client.list('search', { type: 'adgeolocation', q: args[1], country_code: 'CO' }));
  else if (command === 'insights') print({ account: await client.request(a.id, { params: { fields: 'id,name,currency,timezone_name' } }), rows: await client.list(`${a.id}/insights`, { date_preset: 'last_7d', level: 'campaign', fields: 'campaign_id,campaign_name,spend,impressions,clicks,cpc,ctr,actions', time_increment: 1 }) });
  else if (command === 'ad-preview') {
    assert(/^\d+$/.test(args[1]), 'ID inválido');
    const ad = await client.request(args[1], { params: { fields: 'account_id' } });
    assert(`act_${ad.account_id}` === a.id, 'Anuncio de otra cuenta');
    print(await client.list(`${args[1]}/previews`, { ad_format: 'DESKTOP_FEED_STANDARD' }));
  } else if (command === 'video-status') {
    assert(/^\d+$/.test(args[1]), 'ID inválido');
    const videos = await client.list(`${a.id}/advideos`, { fields: 'id' });
    assert(videos.some(v => v.id === args[1]), 'Video de otra cuenta');
    print(await client.request(args[1], { params: { fields: 'status' } }));
  } else if (command === 'image' || command === 'video') {
    const file = path.resolve(args[1]); const stat = fs.statSync(file);
    const image = command === 'image';
    assert(stat.isFile() && stat.size > 0 && stat.size <= (image ? 30 : 100) * 1024 * 1024, 'MVP: imágenes hasta 30 MB; videos hasta 100 MB');
    assert((image ? /\.(png|jpe?g)$/i : /\.(mp4|mov)$/i).test(file), 'Formato no soportado');
    await preflight(client, a);
    const bytes = fs.readFileSync(file);
    const digest = hash({ account: a.id, command, bytes: bytes.toString('base64') });
    const journalFile = path.join(local, `upload-${digest}.json`);
    await locked(journalFile, async () => {
      const journal = store(journalFile, digest); const previous = journal.get('upload');
      if (previous?.state === 'done') { print(previous.result); return; }
      assert(!previous, 'Carga sin confirmar: reconciliar antes de repetir');
      journal.set('upload', { state: 'pending' });
      const form = new FormData();
      form.set(image ? 'filename' : 'source', new Blob([bytes]), path.basename(file));
      const result = await client.request(`${a.id}/${image ? 'adimages' : 'advideos'}`, { method: 'POST', body: form });
      const safe = image ? { images: Object.values(result.images || {}).map(i => ({ hash: i.hash, name: i.name })) } : { videoId: result.id, note: 'Consultar video-status antes de usar' };
      assert(image ? safe.images.length > 0 : /^\d+$/.test(safe.videoId), 'Respuesta de carga incompleta; reconciliar');
      journal.set('upload', { state: 'done', result: safe }); print(safe);
    });
  } else throw new Error(help);
} catch (error) {
  // No stack traces, request objects, token values or environment dumps.
  process.stderr.write(`${error.code === 'EEXIST' ? 'Operación bloqueada por un registro de ejecución. Reconciliar antes de retirar el bloqueo.' : error.message}\n`);
  process.exitCode = 1;
}
