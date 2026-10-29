import { useState } from 'react';
import { supabase } from '../supabaseClient';

const money = (value, currency) => new Intl.NumberFormat('es-CO', { style: 'currency', currency }).format(Number(value || 0));
export default function MetaAds() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState(null);
  async function refresh() {
    setLoading(true); setError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Inicia sesión para consultar las cuentas.');
      const response = await fetch('/api/meta', { headers: { Authorization: `Bearer ${session.access_token}` } });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'No se pudo consultar Meta.');
      setData(result);
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  }
  async function loadDraft(event) {
    try {
      const file = event.target.files?.[0]; if (!file) return;
      if (file.size > 1000000) throw new Error('El archivo de revisión supera 1 MB.');
      const value = JSON.parse((await file.text()).replace(/^\uFEFF/, ''));
      if (!value.review || !value.adset || !Array.isArray(value.creatives) || !value.creatives.every(c => c && typeof c === 'object') || !/^[a-f0-9]{64}$/.test(value.digest) || !['COP', 'USD', 'EUR', 'MXN'].includes(value.review.currency) || !Number.isFinite(Number(value.review.dailyBudget)) || !Number.isFinite(Number(value.review.nominalPeriodBudget))) throw new Error('Selecciona el archivo generado por preview.');
      setDraft(value); setError('');
    } catch (e) { setError(e.message); }
  }
  return <main className="p-6 max-w-6xl mx-auto space-y-6">
    <header><p className="text-sm uppercase tracking-widest text-gloss-burgundy">Gloss Growth · Meta</p><h1 className="text-3xl font-zodiak mt-2">Campañas y cuentas</h1><p className="mt-3 text-gray-500">Prepara tus campañas desde Work, revisa la configuración y créalas pausadas. La activación no está habilitada en esta versión.</p></header>
    <section className="border rounded-xl p-5 space-y-3"><h2 className="text-xl font-semibold">Revisar un borrador</h2><p>En Work, indica el cliente, presupuesto, fechas, público, ubicaciones y las piezas. Carga aquí el archivo de revisión que genere el conector.</p><input aria-label="Archivo de revisión del borrador" type="file" accept=".json" onChange={loadDraft}/><p className="text-sm text-gray-500">Esta vista muestra el archivo local. El conector vuelve a validar la configuración antes de crear. Cargarlo aquí no envía nada a Meta.</p>
    {draft && <div className="space-y-3"><div className="grid md:grid-cols-3 gap-4"><div><p>Cuenta</p><strong>{String(draft.review.account)}</strong></div><div><p>Presupuesto diario</p><strong>{money(draft.review.dailyBudget, draft.review.currency)}</strong></div><div><p>Estimación nominal del periodo</p><strong>{money(draft.review.nominalPeriodBudget, draft.review.currency)}</strong></div></div><p>{String(draft.review.budgetNote)}</p><p>Destino: {String(draft.review.destination)} · {String(draft.review.pixel)}</p><p>Desde {String(draft.review.start)} hasta {String(draft.review.end)}</p><p>Estado previsto: <strong>PAUSED</strong> · Objetivo: {String(draft.campaign?.objective)}</p><details><summary className="cursor-pointer">Ver público, ubicaciones y configuración completa</summary><pre className="text-xs whitespace-pre-wrap overflow-auto mt-3">{JSON.stringify(draft.adset, null, 2)}</pre></details>{draft.creatives.map((creative, i) => <article key={i} className="border rounded-lg p-4"><h3 className="font-semibold">{String(creative.name)}</h3><pre className="text-sm whitespace-pre-wrap mt-2">{JSON.stringify(creative.object_story_spec, null, 2)}</pre></article>)}<p className="text-xs break-all">Identificador del plan: {String(draft.digest)}</p></div>}
    </section>
    <section className="space-y-4"><div className="flex items-center justify-between gap-4"><h2 className="text-xl font-semibold">Últimos 7 días completos</h2><button disabled={loading} onClick={refresh} className="bg-gloss-burgundy text-white px-4 py-2 rounded-lg disabled:opacity-50">{loading ? 'Consultando…' : 'Consultar cuentas'}</button></div><p className="text-sm text-gray-500">Cada cuenta conserva su moneda y zona horaria. No se suman monedas distintas. Las acciones de Meta no equivalen automáticamente a citas o ventas.</p>
    {data && <><p className="text-sm">Última consulta: {new Date(data.fetchedAt).toLocaleString('es-CO')}</p><div className="grid md:grid-cols-2 gap-4">{data.accounts.map(a => <article className="border rounded-xl p-5 space-y-2" key={a.key}><h3 className="font-semibold">{a.name || a.key}</h3>{a.error ? <p role="alert">{a.error}</p> : <><p className="text-sm">{a.id} · {a.currency} · {a.timezone_name}</p>{a.insights.length === 0 ? <p>Sin datos reportados para este periodo.</p> : a.insights.map((row, i) => <div key={i}><p>{row.date_start} — {row.date_stop}</p><p className="text-2xl mt-2">{money(row.spend, a.currency)}</p><p>{row.impressions || 0} impresiones · {row.clicks || 0} clics</p><p>CTR: {row.ctr ?? '—'}% · CPC: {row.cpc ? money(row.cpc, a.currency) : '—'}</p><details><summary>Acciones reportadas por Meta</summary><pre className="whitespace-pre-wrap text-xs">{JSON.stringify(row.actions || [], null, 2)}</pre></details></div>)}</>}</article>)}</div></>}
    </section>{error && <p role="alert" className="border border-red-300 rounded-lg p-4 text-red-700">{error}</p>}
  </main>;
}
