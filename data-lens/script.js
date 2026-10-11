'use strict';
/* ---------- helpers ---------- */
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const money = n => '$' + Math.round(n).toLocaleString('en-US');
const pct = n => (n >= 0 ? '+' : '') + (n * 100).toFixed(1) + '%';
const sum = a => a.reduce((t, o) => t + o.revenue, 0);
const END = Date.UTC(2026, 8, 30), DAY = 864e5, iso = t => new Date(t).toISOString().slice(0, 10);
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const icons = () => window.lucide && lucide.createIcons();
const CAT_COLORS = ['#8b5cf6', '#22d3ee', '#6366f1', '#38bdf8', '#a78bfa'];

/* ---------- demo data (seeded, so the story is repeatable) ---------- */
const PRODUCTS = [['Aero Laptop 14', 'Electronics', 1150], ['Nova Phone', 'Electronics', 799], ['Pulse Earbuds', 'Electronics', 129],
  ['Trail Jacket', 'Apparel', 140], ['Flex Sneakers', 'Apparel', 95], ['Merino Sweater', 'Apparel', 110],
  ['Oak Desk', 'Home', 420], ['Aura Lamp', 'Home', 65], ['Brew Kettle', 'Home', 80], ['Yoga Mat Pro', 'Sports', 55], ['Trail Helmet', 'Sports', 120]];
const SEGS = ['Consumer', 'Corporate', 'Small Business'];
function genDemo() {
  let s = 42; const r = () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296, out = [];
  for (let i = 0; i < 1200; i++) {
    const d = Math.floor(Math.sqrt(r()) * 180), p = PRODUCTS[Math.floor(r() * r() * PRODUCTS.length)];
    const region = r() < .38 ? 'West' : r() < .6 ? 'North' : r() < .85 ? 'East' : 'South';
    const qty = r() < .012 ? 20 + Math.floor(r() * 10) : 1 + Math.floor(r() * r() * 4); // rare bulk orders = outliers
    const price = +(p[2] * (.95 + r() * .1)).toFixed(2);
    out.push({ id: 'ORD-' + (10001 + i), date: iso(END - (179 - d) * DAY), product: p[0], category: p[1], region, qty, price, revenue: +(qty * price).toFixed(2), segment: SEGS[Math.floor(r() * 3)] });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}
let demo = genDemo(), charts = {}, firstKpi = true;
const st = { days: 90, cat: 'all', view: 'overview', q: '' };

/* ---------- toast ---------- */
function toast(msg, err) {
  const t = document.createElement('div'); t.className = 'toast' + (err ? ' err' : '');
  const m = document.createElement('span'); m.textContent = msg;
  const b = document.createElement('button'); b.textContent = '✕'; b.setAttribute('aria-label', 'Dismiss');
  b.onclick = () => t.remove(); t.append(m, b); $('#toasts').append(t); setTimeout(() => t.remove(), 4500);
}

/* ---------- filtering & aggregation ---------- */
function rowsIn(k) { // k=0 current period, k=1 previous period of equal length
  const hi = iso(END - k * st.days * DAY), lo = iso(END - (k + 1) * st.days * DAY), q = st.q.toLowerCase();
  return demo.filter(o => o.date > lo && o.date <= hi && (st.cat === 'all' || o.category === st.cat) &&
    (!q || (o.id + o.product + o.region + o.segment + o.category).toLowerCase().includes(q)));
}
function by(rows, f) { const m = new Map(); rows.forEach(o => { const k = f(o); m.set(k, (m.get(k) || 0) + o.revenue); }); return m; }
const weekKey = d => { const t = new Date(d + 'T00:00:00Z'); t.setUTCDate(t.getUTCDate() - ((t.getUTCDay() + 6) % 7)); return iso(t); };
const quant = (a, p) => { const i = (a.length - 1) * p, f = Math.floor(i); return a[f] + (a[Math.min(f + 1, a.length - 1)] - a[f]) * (i - f); };

/* ---------- table helper (safe: textContent only) ---------- */
function fill(tbl, head, rows, emptyMsg) {
  tbl.replaceChildren(); const tr = document.createElement('tr');
  head.forEach(h => { const th = document.createElement('th'); th.scope = 'col'; th.textContent = h; tr.append(th); });
  const th = document.createElement('thead'); th.append(tr); const tb = document.createElement('tbody');
  if (!rows.length) { const r = tb.insertRow(), c = r.insertCell(); c.colSpan = head.length; c.textContent = emptyMsg || 'No records match the current filters.'; }
  rows.forEach(r => { const row = tb.insertRow(); r.forEach(v => { row.insertCell().textContent = v; }); });
  tbl.append(th, tb);
}

/* ---------- KPIs ---------- */
function spark(rows, fn) {
  const lo = END - st.days * DAY, a = Array.from({ length: 10 }, () => []);
  rows.forEach(o => { const i = Math.min(9, Math.max(0, Math.floor((Date.parse(o.date) - lo) / (st.days * DAY) * 10))); a[i].push(o); });
  const v = a.map(fn), mx = Math.max(...v, 1), mn = Math.min(...v);
  const pts = v.map((y, i) => `${(i * 100 / 9).toFixed(1)},${(34 - (y - mn) / (mx - mn || 1) * 30).toFixed(1)}`).join(' ');
  return `<svg class="sp" viewBox="0 0 100 36" preserveAspectRatio="none" aria-hidden="true"><polyline fill="none" stroke="var(--c)" stroke-width="2" vector-effect="non-scaling-stroke" points="${pts}"/></svg>`;
}
function renderKpis(cur, prev) {
  const rev = sum(cur), pr = sum(prev), aov = cur.length ? rev / cur.length : 0, paov = prev.length ? pr / prev.length : 0;
  const g = pr ? rev / pr - 1 : null, delta = (a, b) => b ? a / b - 1 : null;
  const K = [['Total Revenue', rev, money, delta(rev, pr), x => sum(x)], ['Total Orders', cur.length, n => Math.round(n).toLocaleString(), delta(cur.length, prev.length), x => x.length],
    ['Avg Order Value', aov, n => '$' + n.toFixed(2), delta(aov, paov), x => x.length ? sum(x) / x.length : 0], ['Revenue Growth', g ?? 0, n => pct(n), null, x => sum(x)]];
  $('#kpis').innerHTML = K.map((k, i) => {
    const d = i === 3 ? (pr ? `vs ${money(pr)} prior period` : 'n/a — no prior period in data') : k[3] == null ? 'n/a' : `${k[3] >= 0 ? '▲' : '▼'} ${pct(k[3])} vs prior period`;
    return `<div class="kpi"><small>${k[0]}</small><b data-i="${i}">${k[2](k[1])}</b><span class="d ${k[3] == null ? '' : k[3] >= 0 ? 'up' : 'dn'}">${d}</span>${spark(cur, k[4])}</div>`;
  }).join('');
  if (firstKpi && !reduced) { // count-up only on first display
    $$('#kpis b').forEach(b => { const k = K[+b.dataset.i], t0 = performance.now(); (function f(t) { const p = Math.min(1, (t - t0) / 900); b.textContent = k[2](k[1] * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(f); })(t0); });
  }
  firstKpi = false;
}

/* ---------- charts ---------- */
function mk(id, cfg) {
  charts[id]?.destroy();
  const cs = getComputedStyle(document.documentElement);
  Chart.defaults.color = cs.getPropertyValue('--muted').trim(); Chart.defaults.borderColor = cs.getPropertyValue('--line').trim();
  cfg.options = Object.assign({ responsive: true, maintainAspectRatio: false, animation: reduced ? false : { duration: 700 } }, cfg.options);
  charts[id] = new Chart($('#' + id), cfg);
}
function renderCharts(cur) {
  const W = by(cur, o => weekKey(o.date)), wl = [...W.keys()].sort();
  mk('cRev', { type: 'line', data: { labels: wl, datasets: [{ label: 'Revenue ($)', data: wl.map(k => Math.round(W.get(k))), borderColor: '#8b5cf6', backgroundColor: '#8b5cf622', tension: .35, pointRadius: 2 }] } });
  const C = [...by(cur, o => o.category)].sort((a, b) => b[1] - a[1]);
  mk('cCat', { type: 'doughnut', data: { labels: C.map(c => c[0]), datasets: [{ data: C.map(c => Math.round(c[1])), backgroundColor: CAT_COLORS, borderWidth: 0 }] }, options: { plugins: { legend: { position: 'bottom' } }, cutout: '65%' } });
  const R = [...by(cur, o => o.region)].sort((a, b) => b[1] - a[1]);
  mk('cReg', { type: 'bar', data: { labels: R.map(r => r[0]), datasets: [{ label: 'Revenue ($)', data: R.map(r => Math.round(r[1])), backgroundColor: '#22d3ee', borderRadius: 6 }] } });
  const M = new Map(); cur.forEach(o => M.set(o.date.slice(0, 7), (M.get(o.date.slice(0, 7)) || 0) + 1)); const ml = [...M.keys()].sort();
  mk('cOrd', { type: 'line', data: { labels: ml, datasets: [{ label: 'Orders', data: ml.map(k => M.get(k)), fill: true, borderColor: '#22d3ee', backgroundColor: '#22d3ee33', tension: .35 }] } });
}

/* ---------- smart insights (rule-based) ---------- */
function renderInsights(cur) {
  const out = [], n = cur.length; if (n < 10) { out.push(['Not enough data', 'Fewer than 10 orders match the current filters.', 'n = ' + n, 'Widen the date range or clear filters.', 'Widen the date range.']); }
  else {
    const mid = iso(END - st.days / 2 * DAY), a = sum(cur.filter(o => o.date <= mid)), b = sum(cur.filter(o => o.date > mid));
    out.push(['Revenue Trend', `Revenue in the second half of the window is ${a ? pct(b / a - 1) : 'n/a'} vs the first half.`, `${money(a)} → ${money(b)}`, 'Hypothesis: seasonality or growth in order volume; not proven from this data alone.', 'Compare order count vs average order value to see which moved.']);
    const v = cur.map(o => o.revenue).sort((x, y) => x - y), q1 = quant(v, .25), q3 = quant(v, .75), fence = q3 + 1.5 * (q3 - q1), big = cur.filter(o => o.revenue > fence), top = big.sort((x, y) => y.revenue - x.revenue)[0];
    out.push(['Unusual Sales Activity', `${big.length} orders exceed the IQR upper fence (Q3 + 1.5×IQR).`, `Fence ${money(fence)}; ${big.length ? 'largest ' + top.id + ' at ' + money(top.revenue) : 'none flagged'}; ${n ? (sum(big) / sum(cur) * 100).toFixed(1) : 0}% of revenue`, 'Hypothesis: bulk or corporate purchases rather than errors.', 'Review flagged orders for quantity-entry mistakes.']);
    const C = [...by(cur, o => o.category)].sort((x, y) => y[1] - x[1]);
    out.push(['Best-Performing Category', `${C[0][0]} leads on revenue.`, `${money(C[0][1])} (${(C[0][1] / sum(cur) * 100).toFixed(1)}% share)`, 'Hypothesis: higher unit prices drive share, not necessarily demand.', 'Compare units sold against revenue by category.']);
    const R = [...by(cur, o => o.region)].sort((x, y) => y[1] - x[1]), lo = R[R.length - 1];
    out.push(['Regional Performance Gap', `${R[0][0]} out-earns ${lo[0]} by ${lo[1] ? ((R[0][1] / lo[1] - 1) * 100).toFixed(0) : '—'}%.`, `${money(R[0][1])} vs ${money(lo[1])}`, 'Hypothesis: differences in customer base size or product mix.', `Check ${lo[0]}'s order count and category mix.`]);
    const S = SEGS.map(s => { const x = cur.filter(o => o.segment === s); return [s, x.length ? sum(x) / x.length : 0]; }).sort((x, y) => y[1] - x[1]);
    out.push(['Customer / Order Pattern', `${S[0][0]} has the highest average order value.`, `${S.map(s => s[0] + ' $' + s[1].toFixed(0)).join(' · ')}`, 'Hypothesis: segment-specific buying behaviour or pricing.', 'Segment the outlier orders to see if they skew this average.']);
  }
  const g = $('#iGrid'); g.replaceChildren();
  out.forEach(([t, o, e, h, nx]) => {
    const c = document.createElement('article'); c.className = 'icard reveal in'; const h3 = document.createElement('h3'); h3.textContent = t; c.append(h3);
    [['Observed', o], ['Evidence', e], ['Possible explanation', h], ['Next step', nx]].forEach(([l, v]) => { const p = document.createElement('p'), b = document.createElement('b'); b.textContent = l + ': '; p.append(b, v); c.append(p); });
    g.append(c);
  });
}

/* ---------- dashboard render ---------- */
function render() {
  const cur = rowsIn(0), prev = rowsIn(1);
  $('#empty').hidden = cur.length > 0 || !['overview', 'sales', 'products', 'customers'].includes(st.view);
  renderKpis(cur, prev); renderCharts(cur); renderInsights(cur);
  const P = [...cur.reduce((m, o) => { const x = m.get(o.product) || [o.product, o.category, 0, 0]; x[2] += o.qty; x[3] += o.revenue; return m.set(o.product, x); }, new Map()).values()].sort((a, b) => b[3] - a[3]).slice(0, 6);
  fill($('#tTop'), ['Product', 'Category', 'Units', 'Revenue'], P.map(p => [p[0], p[1], p[2], money(p[3])]));
  fill($('#tRec'), ['Order', 'Date', 'Product', 'Region', 'Segment', 'Qty', 'Revenue'], cur.slice(-8).reverse().map(o => [o.id, o.date, o.product, o.region, o.segment, o.qty, '$' + o.revenue.toFixed(2)]));
  fill($('#tSeg'), ['Segment', 'Orders', 'Revenue', 'Avg order'], SEGS.map(s => { const x = cur.filter(o => o.segment === s); return [s, x.length, money(sum(x)), x.length ? '$' + (sum(x) / x.length).toFixed(2) : '—']; }));
  const pr = sum(prev), rev = sum(cur);
  $('#pvGrowth').textContent = pr ? pct(rev / pr - 1) : 'n/a';
  const v = cur.map(o => o.revenue).sort((a, b) => a - b); $('#pvOut').textContent = v.length > 9 ? cur.filter(o => o.revenue > quant(v, .75) + 1.5 * (quant(v, .75) - quant(v, .25))).length : 0;
}
function load(fn) { // short simulated loading state (frontend only)
  const g = $('#grid'); g.classList.add('loading'); $('#kpis').classList.add('loading');
  setTimeout(() => { fn(); g.classList.remove('loading'); $('#kpis').classList.remove('loading'); }, reduced ? 0 : 450);
}

/* ---------- view switching ---------- */
const TITLES = { overview: 'Overview', sales: 'Sales Analytics', customers: 'Customer Insights', products: 'Product Performance', explorer: 'Data Explorer', settings: 'Settings' };
function setView(v) {
  st.view = v; $('#vtitle').textContent = $('#crumb').textContent = TITLES[v];
  $$('#sideNav button').forEach(b => { b.classList.toggle('on', b.dataset.view === v); b.setAttribute('aria-current', b.dataset.view === v ? 'page' : 'false'); });
  $$('.panel').forEach(p => { p.hidden = !p.dataset.views.split(',').includes(v); });
  $('#empty').hidden = true; render();
  if (v === 'explorer' && !ex.ds) setDS('Demo e-commerce (synthetic)', DEMO_HEADERS, demo.map(o => [o.id, o.date, o.product, o.category, o.region, o.qty, o.price, o.revenue, o.segment]));
}

/* ---------- exports ---------- */
const DEMO_HEADERS = ['Order ID', 'Order Date', 'Product', 'Category', 'Region', 'Quantity', 'Unit Price', 'Revenue', 'Customer Segment'];
function csvCell(v) { v = String(v ?? ''); if (/^[=+\-@]/.test(v) && isNaN(Number(v))) v = "'" + v; return /[",\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; } // also blunts spreadsheet-formula injection
function download(name, text, type) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 500); }
function toCSV(h, rows) { return [h, ...rows].map(r => r.map(csvCell).join(',')).join('\n'); }
$('#expCsv').onclick = () => { const c = rowsIn(0); if (!c.length) return toast('Nothing to export: no records match the filters.', true); download('datalens-records.csv', toCSV(DEMO_HEADERS, c.map(o => [o.id, o.date, o.product, o.category, o.region, o.qty, o.price, o.revenue, o.segment])), 'text/csv'); toast(`Exported ${c.length} records.`); };
$('#expRpt').onclick = () => {
  const c = rowsIn(0), p = rowsIn(1); if (!c.length) return toast('Nothing to report: no records match the filters.', true);
  const rev = sum(c), R = [...by(c, o => o.region)].sort((a, b) => b[1] - a[1]), C = [...by(c, o => o.category)].sort((a, b) => b[1] - a[1]);
  download('datalens-report.txt', ['DataLens summary (SYNTHETIC DEMO DATA)', `Window: last ${st.days} days, category: ${st.cat}`, `Revenue: ${money(rev)}`, `Orders: ${c.length}`, `Avg order value: $${(rev / c.length).toFixed(2)}`, `Growth vs prior period: ${sum(p) ? pct(rev / sum(p) - 1) : 'n/a'}`, '', 'By category:', ...C.map(x => `  ${x[0]}: ${money(x[1])}`), 'By region:', ...R.map(x => `  ${x[0]}: ${money(x[1])}`)].join('\n'), 'text/plain'); toast('Report downloaded.');
};

/* ---------- Data Explorer ---------- */
const ex = { ds: null, q: '', sort: null, hidden: new Set(), imported: false };
function parseCSV(t) {
  const rows = []; let r = [], f = '', q = false; t = t.replace(/^\uFEFF/, '');
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) { if (c === '"') { if (t[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"' && f === '') q = true;
    else if (c === ',') { r.push(f); f = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && t[i + 1] === '\n') i++; r.push(f); rows.push(r); r = []; f = ''; }
    else f += c;
  }
  if (q) throw new Error('Malformed CSV: a quoted field is never closed.');
  if (f !== '' || r.length) { r.push(f); rows.push(r); }
  return rows.filter(x => x.some(v => v.trim() !== ''));
}
const blank = v => v == null || String(v).trim() === '';
function inferType(vals) {
  const v = vals.filter(x => !blank(x)); if (!v.length) return 'empty';
  if (v.every(x => Number.isFinite(Number(x)))) return 'number';
  if (v.every(x => /[-\/]/.test(x) && !isNaN(Date.parse(x)))) return 'date';
  return 'text';
}
function setDS(name, headers, rows) {
  const w = headers.length; rows = rows.map(r => { r = r.slice(0, w); while (r.length < w) r.push(''); return r; }); // pad ragged rows
  ex.ds = { name, headers, rows, types: headers.map((_, i) => inferType(rows.map(r => r[i]))) }; ex.sort = null; ex.hidden.clear(); ex.q = ''; $('#exq').value = '';
  renderEx();
}
function exView() {
  const d = ex.ds, q = ex.q.toLowerCase(); let rows = q ? d.rows.filter(r => r.some(v => String(v).toLowerCase().includes(q))) : d.rows.slice();
  if (ex.sort) { const { i, dir } = ex.sort, num = d.types[i] === 'number'; rows.sort((a, b) => dir * (num ? Number(a[i]) - Number(b[i]) : String(a[i]).localeCompare(String(b[i])))); }
  return rows;
}
function renderEx() {
  const d = ex.ds; if (!d) return; const vis = d.headers.map((_, i) => i).filter(i => !ex.hidden.has(i)), rows = exView();
  const missing = d.rows.reduce((t, r) => t + r.filter(blank).length, 0), seen = new Set(); let dup = 0; d.rows.forEach(r => { const k = JSON.stringify(r); seen.has(k) ? dup++ : seen.add(k); });
  const meta = $('#meta'); meta.replaceChildren(); [`Dataset: ${d.name}`, `${d.rows.length.toLocaleString()} rows`, `${d.headers.length} columns`, `${missing} missing values`, `${dup} duplicate rows`, `Showing ${Math.min(100, rows.length)} of ${rows.length}`].forEach(t => { const s = document.createElement('span'); s.textContent = t; meta.append(s); });
  const tbl = $('#exTbl'); tbl.replaceChildren(); const tr = document.createElement('tr');
  vis.forEach(i => { const th = document.createElement('th'), b = document.createElement('button'), sm = document.createElement('small'); th.scope = 'col'; th.setAttribute('aria-sort', ex.sort?.i === i ? (ex.sort.dir > 0 ? 'ascending' : 'descending') : 'none'); b.textContent = d.headers[i] + (ex.sort?.i === i ? (ex.sort.dir > 0 ? ' ▲' : ' ▼') : ''); b.tabIndex = 0; b.onclick = () => { ex.sort = ex.sort?.i === i ? { i, dir: -ex.sort.dir } : { i, dir: 1 }; renderEx(); }; sm.textContent = d.types[i]; th.append(b, sm); tr.append(th); });
  const th = document.createElement('thead'), tb = document.createElement('tbody'); th.append(tr);
  rows.slice(0, 100).forEach(r => { const row = tb.insertRow(); vis.forEach(i => { const c = row.insertCell(); c.textContent = blank(r[i]) ? '—' : r[i]; }); });
  if (!rows.length) { const c = tb.insertRow().insertCell(); c.colSpan = vis.length || 1; c.textContent = 'No rows match your search.'; }
  tbl.append(th, tb);
  const cl = $('#colList'); cl.replaceChildren(); d.headers.forEach((h, i) => { const l = document.createElement('label'), c = document.createElement('input'); c.type = 'checkbox'; c.checked = !ex.hidden.has(i); c.onchange = () => { c.checked ? ex.hidden.delete(i) : ex.hidden.add(i); renderEx(); }; l.append(c, document.createTextNode(h)); cl.append(l); });
  const stats = []; d.types.forEach((t, i) => { if (t !== 'number') return; const v = d.rows.map(r => r[i]).filter(x => !blank(x)).map(Number).sort((a, b) => a - b); if (!v.length) return; const mean = v.reduce((a, b) => a + b, 0) / v.length; stats.push([d.headers[i], v.length, +mean.toFixed(2), v[0], v[v.length - 1], quant(v, .5)]); });
  fill($('#exStats'), ['Column', 'Count', 'Mean', 'Min', 'Max', 'Median'], stats, 'No numeric columns detected.');
}
function handleFile(f) {
  if (!f) return; if (!/\.csv$/i.test(f.name) && f.type !== 'text/csv') return toast('Unsupported file. Please choose a .csv file.', true);
  if (f.size === 0) return toast('That file is empty.', true); if (f.size > 25e6) return toast('File is over 25 MB — please use a smaller sample.', true);
  const rd = new FileReader(); rd.onerror = () => toast('Could not read the file.', true);
  rd.onload = () => { try { const all = parseCSV(String(rd.result)); if (all.length < 2) throw new Error('No data rows found. A header row and at least one data row are required.');
      const h = all[0].map((x, i) => x.trim() || 'Column ' + (i + 1)); setDS(f.name, h, all.slice(1)); ex.imported = true;
      const o = $('#dsSel option[value=imp]'); o.disabled = false; o.textContent = 'Imported: ' + f.name; $('#dsSel').value = 'imp'; toast(`Loaded ${all.length - 1} rows from ${f.name}.`); }
    catch (e) { toast(e.message, true); } };
  rd.readAsText(f);
}
const useDemo = () => { $('#dsSel').value = 'demo'; setDS('Demo e-commerce (synthetic)', DEMO_HEADERS, demo.map(o => [o.id, o.date, o.product, o.category, o.region, o.qty, o.price, o.revenue, o.segment])); };
const drop = $('#drop'), fileIn = $('#file');
drop.onclick = () => fileIn.click(); drop.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileIn.click(); } };
fileIn.onchange = () => { handleFile(fileIn.files[0]); fileIn.value = ''; };
['dragover', 'dragenter'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('over'); }));
['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('over'); }));
drop.addEventListener('drop', e => handleFile(e.dataTransfer.files[0]));
$('#exq').oninput = e => { ex.q = e.target.value; renderEx(); };
$('#exDl').onclick = () => { if (!ex.ds) return; const vis = ex.ds.headers.map((_, i) => i).filter(i => !ex.hidden.has(i)), rows = exView(); if (!rows.length) return toast('No rows to download.', true); download('datalens-view.csv', toCSV(vis.map(i => ex.ds.headers[i]), rows.map(r => vis.map(i => r[i]))), 'text/csv'); toast('Downloaded current view.'); };
$('#exDemo').onclick = () => { useDemo(); toast('Demo data loaded.'); };

/* ---------- controls ---------- */
$('#catSel').innerHTML += [...new Set(PRODUCTS.map(p => p[1]))].map(c => `<option>${c}</option>`).join('');
$('#rangeSel').onchange = e => { st.days = +e.target.value; load(render); };
$('#catSel').onchange = e => { st.cat = e.target.value; load(render); };
let qt; $('#q').oninput = e => { clearTimeout(qt); qt = setTimeout(() => { st.q = e.target.value.trim(); render(); }, 200); };
$('#refresh').onclick = () => load(() => { demo = genDemo(); render(); toast('Demo dataset regenerated (synthetic).'); });
$('#dsSel').onchange = e => { if (e.target.value === 'imp' && ex.imported) setView('explorer'); else { useDemo(); } };
$('#setReset').onclick = () => { $('#refresh').click(); }; 
$('#setClear').onclick = () => { if (!ex.imported) return toast('No imported CSV to clear.', true); ex.imported = false; const o = $('#dsSel option[value=imp]'); o.disabled = true; o.textContent = 'Imported CSV (none yet)'; useDemo(); toast('Imported data cleared.'); };
$('#sideNav').onclick = e => { const b = e.target.closest('button'); if (b) setView(b.dataset.view); };
document.addEventListener('click', e => { const g = e.target.closest('[data-go]'); if (g) setView(g.dataset.go); });
function theme(t) { document.documentElement.dataset.theme = t; try { localStorage.setItem('dl-theme', t); } catch (e) { } render(); }
const flip = () => theme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
$('#theme').onclick = $('#setTheme').onclick = flip;
$('#burger').onclick = () => { const o = $('#menu').classList.toggle('open'); $('#burger').setAttribute('aria-expanded', o); };
$$('#menu a').forEach(a => a.addEventListener('click', () => { $('#menu').classList.remove('open'); $('#burger').setAttribute('aria-expanded', 'false'); }));

/* ---------- features, hero preview, observers ---------- */
const FEATURES = [['layout-dashboard', 'Interactive Dashboards', 'Filter by date and category and watch KPIs, charts and tables update together.', 'overview'], ['shield-check', 'Data Quality Checks', 'Missing values, duplicate rows and detected column types at a glance.', 'explorer'], ['trending-up', 'Trend Analysis', 'Period-over-period comparisons and weekly revenue trends.', 'sales'], ['triangle-alert', 'Anomaly Detection', 'Outliers flagged with an explainable IQR rule.', 'overview'], ['gauge', 'Automated KPI Summaries', 'Revenue, orders, AOV and growth computed from the records.', 'overview'], ['file-down', 'Exportable Reports', 'Download filtered records as CSV or a text summary.', 'overview']];
$('#fGrid').replaceChildren(...FEATURES.map(f => { const b = document.createElement('button'); b.className = 'fcard reveal'; b.innerHTML = `<i data-lucide="${f[0]}"></i><h3></h3><p></p>`; b.querySelector('h3').textContent = f[1]; b.querySelector('p').textContent = f[2]; b.onclick = () => { setView(f[3]); $('#dashboard').scrollIntoView(); }; return b; }));
$('#pvKpis').innerHTML = ['Revenue', 'Orders', 'AOV'].map(l => `<div><small>${l}</small><b>—</b></div>`).join('');
$('#pvBars').innerHTML = [38, 52, 44, 60, 55, 72, 66, 84, 78, 92].map((h, i) => `<i style="height:${h}%;animation-delay:${i * 70}ms"></i>`).join('');
function heroKpis() { const c = rowsIn(0); const b = $$('#pvKpis b'); b[0].textContent = money(sum(c)); b[1].textContent = c.length; b[2].textContent = '$' + (c.length ? sum(c) / c.length : 0).toFixed(0); }
const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .12 });
$$('.reveal').forEach((el, i) => { el.style.transitionDelay = (i % 6) * 60 + 'ms'; io.observe(el); });
const links = $$('#menu a'), so = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) links.forEach(a => a.classList.toggle('on', a.getAttribute('href') === '#' + e.target.id)); }), { rootMargin: '-40% 0px -55% 0px' });
['overview', 'dashboard', 'insights', 'about'].forEach(id => so.observe($('#' + id)));

/* ---------- init ---------- */
try { const t = localStorage.getItem('dl-theme'); if (t) document.documentElement.dataset.theme = t; } catch (e) { }
if (!window.Chart) toast('Chart.js failed to load (check your connection). Tables still work.', true);
else { setView('overview'); heroKpis(); }
icons();
