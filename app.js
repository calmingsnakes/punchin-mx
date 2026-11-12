/* Punchin by Wulden demo — browser-local data, no backend */
'use strict';

const TZ = 'America/Mexico_City';
const ADMIN_PIN = '2468';
const K = { EMP: 'pmx_emps', PUNCH: 'pmx_punches', ME: 'pmx_me', OFF: 'pmx_office', CONSENT: 'pmx_consent' };
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const esc = (v) => String(v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/* ---------- store ---------- */
const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set(k, v) { localStorage.setItem(k, JSON.stringify(v)); },
};
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const emps = () => store.get(K.EMP, []);
const punches = () => store.get(K.PUNCH, []);
const office = () => store.get(K.OFF, { name: 'Mexico City office — Polanco', lat: 19.4257, lng: -99.1733, radius: 250 });
const me = () => store.get(K.ME, null);

/* ---------- geo & time ---------- */
const haversine = (a, b, c, d) => {
  const R = 6371000, r = Math.PI / 180;
  const [φ1, φ2, dφ, dλ] = [a * r, c * r, (c - a) * r, (d - b) * r];
  const x = Math.sin(dφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(dλ / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(x)));
};
const fdate = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });
const ftime = new Intl.DateTimeFormat('en-US', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false });
const fshort = new Intl.DateTimeFormat('en-US', { timeZone: TZ, weekday: 'short', day: 'numeric', month: 'short' });
const dayKey = (d = new Date()) => fdate.format(d);
const timeStr = (iso) => ftime.format(new Date(iso));
const dateStr = (iso) => fshort.format(new Date(iso));

/* ---------- illustrative daytime hours and overtime estimates ---------- */
function workMs(dayPunches) {
  let total = 0, open = null;
  for (const p of dayPunches.sort((a, b) => a.ts.localeCompare(b.ts))) {
    if (p.dir === 'ENTRADA') open = Date.parse(p.ts);
    else if (p.dir === 'SALIDA' && open) { total += Math.max(0, Date.parse(p.ts) - open); open = null; }
  }
  if (open) total += Math.max(0, Date.now() - open); // turno abierto
  return total;
}
const hm = (ms) => `${Math.floor(ms / 3600000)}h ${String(Math.floor(ms % 3600000 / 60000)).padStart(2, '0')}m`;
function xtSplit(ms) {
  const over = Math.max(0, ms - 8 * 3600000);
  const doble = Math.min(over, 2 * 3600000);
  const triple = Math.max(0, over - doble);
  return { doble, triple };
}

/* ---------- seed ---------- */
(function seed() {
  if (emps().length) return;
  const E = [
    { id: 'e1', name: 'Ana Torres' }, { id: 'e2', name: 'Diego Ramírez' },
    { id: 'e3', name: 'Sofía Vega' }, { id: 'e4', name: 'Mauricio Cruz' },
  ];
  store.set(K.EMP, E);
  const o = office();
  const P = [];
  const mxNow = new Date(Date.now() - 6 * 3600e3); // CDMX = UTC-6 estable
  for (let d = 6; d >= 1; d--) {
    const day = new Date(mxNow - d * 864e5);
    if ([0, 6].includes(day.getUTCDay())) continue;
    E.forEach((e, i) => {
      const late = d === 1 && i === 2;
      const hIn = 8.7 + Math.random() * (late ? 1.9 : .6);
      const span = 8 + Math.random() * (i === 1 ? 2.9 : .9);
      const mk = (hr, dir) => {
        // hr es hora CDMX; CDMX = UTC-6 (sin DST desde 2022): 15 UTC = 9:00 CDMX
        const t = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), 15) + (hr - 9) * 3600e3);
        const fromOffice = late && dir === 'SALIDA';
        const lat = o.lat + (fromOffice ? .043 : (Math.random() - .5) * .0009);
        const lng = o.lng + (fromOffice ? .025 : (Math.random() - .5) * .0009);
        P.push({ id: uid() + Math.random(), empId: e.id, ts: t.toISOString(), dir,
          lat: +lat.toFixed(6), lng: +lng.toFixed(6), acc: Math.round(5 + Math.random() * 20),
          dist: haversine(o.lat, o.lng, lat, lng), inside: null, photo: null,
          note: fromOffice ? 'Worked from home (supervisor approved)' : '' });
        P[P.length - 1].inside = P[P.length - 1].dist <= o.radius;
      };
      mk(hIn, 'ENTRADA'); mk(Math.min(20, hIn + span), 'SALIDA');
    });
  }
  store.set(K.PUNCH, P);
})();

/* ---------- toast ---------- */
let toastT;
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('on');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 2400);
}

/* ---------- sheets ---------- */
function openSheet(sel) { $('#backdrop').classList.add('on'); $(sel).classList.add('on'); }
function closeSheets() {
  $('#backdrop').classList.remove('on');
  $$('.sheet').forEach(s => s.classList.remove('on'));
  stopCam();
}
$('#backdrop').onclick = closeSheets;
$$('[data-close]').forEach(b => b.onclick = closeSheets);

/* ---------- tabs ---------- */
let screen = 'chequear';
$$('.tab').forEach(t => t.onclick = () => {
  $$('.tab').forEach(x => x.classList.toggle('on', x === t));
  screen = t.dataset.screen;
  $$('.screen').forEach(s => s.classList.remove('active'));
  $(`#screen-${screen}`).classList.add('active');
  $('#screen-title').textContent = { chequear: 'Punchin', midia: 'My day', admin: 'Supervisor' }[screen];
  if (screen === 'midia') renderMidia();
  if (screen === 'admin') renderAdmin();
  if (screen === 'chequear') renderIdentity();
});

/* ---------- identity ---------- */
function renderIdentity() {
  const m = me(); const o = office();
  if (m) {
    $('#emp-name').textContent = m.name;
    $('#emp-avatar').textContent = m.name.split(' ').map(x => x[0]).slice(0, 2).join('');
    $('#office-line').textContent = `${o.name} · geofence ${o.radius} m`;
  } else { $('#emp-name').textContent = 'Select your profile'; $('#office-line').textContent = '—'; }
}
$('#btn-change-emp').onclick = () => { openEmpPicker(); };
function openEmpPicker() {
  const list = $('#emp-picker'); list.innerHTML = '';
  emps().forEach(e => {
    const row = document.createElement('div'); row.className = 'list-row';
    row.innerHTML = `<span class="mini-photo">👤</span><span style="flex:1;font-weight:600">${esc(e.name)}</span>`;
    const btn = document.createElement('button'); btn.textContent = 'Select';
    btn.onclick = () => { store.set(K.ME, e); closeSheets(); renderIdentity(); pingGps(); };
    row.append(btn); list.append(row);
  });
  openSheet('#sheet-emp');
}
$('#btn-add-emp').onclick = () => {
  const name = prompt('Employee name (demo data only):'); if (!name?.trim()) return;
  const E = emps(); E.push({ id: uid(), name: name.trim() });
  store.set(K.EMP, E); store.set(K.ME, E[E.length - 1]);
  closeSheets(); renderIdentity(); pingGps(); toast(`Hello, ${name.trim()} 👋`);
};

/* ---------- clock ---------- */
setInterval(() => { $('#now-clock').textContent = timeStr(new Date().toISOString()); }, 1000);

/* ---------- GPS ping ---------- */
function getLocation() {
  return new Promise(res => {
    if (!('geolocation' in navigator)) return res(null);
    navigator.geolocation.getCurrentPosition(
      p => res({ lat: p.coords.latitude, lng: p.coords.longitude, acc: Math.round(p.coords.accuracy) }),
      () => res(null), { enableHighAccuracy: true, timeout: 6000, maximumAge: 0 });
  });
}
async function pingGps() {
  const chip = $('#chip-gps'), fence = $('#chip-fence');
  if (!me()) return;
  const g = await getLocation();
  if (g) {
    chip.textContent = `📡 Location ±${g.acc} m`; chip.className = 'chip ok';
    const d = haversine(office().lat, office().lng, g.lat, g.lng);
    const inF = d <= office().radius;
    fence.textContent = inF ? '⭕ At the office' : `⭕ ${(d / 1000).toFixed(1)} km from office`;
    fence.className = 'chip ' + (inF ? 'ok' : 'warn');
  } else {
    chip.textContent = '📡 Location unavailable (demo)'; chip.className = 'chip warn';
    fence.textContent = '⭕ Simulated location'; fence.className = 'chip warn';
  }
}

/* ---------- camera ---------- */
let stream = null, frozen = null;
async function startCam() {
  frozen = null; $('#cam-fallback').hidden = true;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
    $('#cam-video').srcObject = stream;
  } catch { stream = null; $('#cam-fallback').hidden = false; }
}
function stopCam() { if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; } }
function freeze() {
  if (!stream) return null;
  const v = $('#cam-video');
  const c = document.createElement('canvas');
  const size = 240, s = Math.min(v.videoWidth, v.videoHeight) || size;
  c.width = c.height = size;
  c.getContext('2d').drawImage(v, (v.videoWidth - s) / 2, (v.videoHeight - s) / 2, s, s, 0, 0, size, size);
  return c.toDataURL('image/jpeg', .55); // ~6-8 KB, en dispositivo (demo)
}

/* ---------- punch flow ---------- */
let dir = 'ENTRADA', pending = null;
$$('#dir-seg button').forEach(b => b.onclick = () => {
  dir = b.dataset.dir;
  $$('#dir-seg button').forEach(x => x.classList.toggle('on', x === b));
  $('#btn-punch').classList.toggle('out', dir === 'SALIDA');
});

$('#btn-punch').onclick = async () => {
  if (!me()) return openEmpPicker();
  if (!store.get(K.CONSENT, false)) return openSheet('#sheet-consent');
  pending = { dir };
  await startCam();
  openSheet('#sheet-camera');
};
$('#btn-consent').onclick = () => { store.set(K.CONSENT, true); closeSheets(); toast('Demo notice acknowledged ✓'); };
$('#btn-capture').onclick = () => { if (stream) pending.photo = freeze(); stopCam(); confirmPunch(); };
$('#btn-skip-photo').onclick = () => { pending.photo = null; stopCam(); confirmPunch(); };

async function confirmPunch() {
  closeSheets();
  const o = office();
  let g = await getLocation();
  if (!g) { // demo fallback: GPS simulado, marcado como tal
    const jitter = () => (Math.random() - .5) * o.radius / 111000;
    g = { lat: +(o.lat + jitter()).toFixed(6), lng: +(o.lng + jitter()).toFixed(6), acc: 25, demo: true };
  }
  const dist = haversine(o.lat, o.lng, g.lat, g.lng);
  pending = { ...pending, ...g, dist, inside: dist <= o.radius };
  $('#confirm-title').textContent = dir === 'ENTRADA' ? 'Confirm clock-in' : 'Confirm clock-out';
  $('#confirm-photo').innerHTML = pending.photo ? `<img src="${pending.photo}">` : '<span style="font-size:34px">👤</span>';
  const fence = pending.inside
    ? `<span class="badge-of">🏢 At office</span>`
    : `<span class="badge-fu">⚠️ Outside geofence</span> · ${(pending.dist / 1000).toFixed(1)} km away`;
  $('#confirm-data').innerHTML = `
    <div class="big">${timeStr(new Date().toISOString())}</div>
    <div>${dateStr(new Date().toISOString())} · Mexico City time</div>
    <div><b>${esc(me().name)}</b></div>
    <div>${fence}</div>
    <div>±${pending.acc} m ${pending.demo ? '· <span class="badge-fu">SIMULATED LOCATION</span>' : '· device location'}</div>`;
  $('#note-input').value = '';
  openSheet('#sheet-confirm');
}

$('#btn-confirm').onclick = () => {
  const p = { id: uid(), empId: me().id, ts: new Date().toISOString(), ...pending,
    note: $('#note-input').value.trim(), tz: TZ };
  const P = punches(); P.push(p); store.set(K.PUNCH, P);
  $('#success-title').textContent = p.dir === 'ENTRADA' ? 'Clock-in saved ✓' : 'Clock-out saved ✓';
  $('#success-sub').innerHTML = `${timeStr(p.ts)} · ${p.inside ? 'at office' : 'outside geofence'}` +
    (p.demo ? '<br><b>Simulated location — not evidence of attendance.</b>' : '') +
    (!p.inside ? '<br><b>Marked for supervisor review.</b>' : '') +
    '<br>Stored only in this browser (demo).';
  pending = null;
  openSheet('#sheet-success');
  pingGps();
};

/* ---------- Mi día ---------- */
function renderMidia() {
  const m = me(); if (!m) return;
  const today = dayKey();
  const mine = punches().filter(p => p.empId === m.id).sort((a, b) => b.ts.localeCompare(a.ts));
  const todays = mine.filter(p => p.ts && dayKey(new Date(p.ts)) === today);
  const ms = workMs(todays.map(t => ({ ...t })));
  $('#day-worked').textContent = hm(ms);
  const { doble, triple } = xtSplit(ms);
  $('#day-xt').textContent = doble + triple > 0
    ? `${hm(doble)} ${triple ? `+ ${hm(triple)}` : ''}` : '—';
  const wk = mine.filter(p => Date.parse(p.ts) > Date.now() - 6 * 864e5);
  const byDay = {}; wk.forEach(p => (byDay[dayKey(new Date(p.ts))] ??= []).push(p));
  $('#week-worked').textContent = hm(Object.values(byDay).reduce((a, d) => a + workMs(d), 0));
  const list = $('#my-day-list'); list.innerHTML = '';
  if (!todays.length) { list.innerHTML = '<div class="list-row" style="color:var(--ink2)">No events today.</div>'; return; }
  todays.forEach(p => list.append(punchRow(p, false)));
}
function punchRow(p, withName) {
  const e = emps().find(x => x.id === p.empId);
  const r = document.createElement('div'); r.className = 'list-row';
  const geo = p.demo ? '<span class="badge-fu">SIMULATED LOCATION</span>' : p.inside ? '<span class="badge-of">🏢 office</span>' : `<span class="badge-fu">⚠️ ${(p.dist / 1000).toFixed(1)} km away</span>`;
  const photo = p.photo ? `<img class="mini-photo" src="${p.photo}">` : `<span class="mini-photo">👤</span>`;
  r.innerHTML = `${photo}
    <span class="p-time">${timeStr(p.ts)}</span>
    <span class="p-dir ${p.dir === 'ENTRADA' ? 'IN' : 'OUT'}">${p.dir === 'ENTRADA' ? 'IN' : 'OUT'}</span>
    <span class="p-loc">${withName ? `<b>${esc(e?.name ?? '?')}</b><br>` : ''}${dateStr(p.ts)} · ${geo}${p.note ? `<br>“${esc(p.note)}”` : ''}</span>`;
  return r;
}

/* ---------- Admin ---------- */
function renderAdmin() {
  if (sessionStorage.getItem('pmx_admin') !== '1') { $('#admin-gate').classList.remove('hidden'); $('#admin-body').classList.add('hidden'); return; }
  $('#admin-gate').classList.add('hidden'); $('#admin-body').classList.remove('hidden');
  const today = dayKey();
  const P = punches().sort((a, b) => b.ts.localeCompare(a.ts));
  const tP = P.filter(p => dayKey(new Date(p.ts)) === today);
  const ins = tP.filter(p => p.inside).length;
  $('#k-attend').textContent = new Set(tP.map(p => p.empId)).size;
  $('#k-inside').textContent = tP.length ? Math.round(ins / tP.length * 100) + '%' : '—';
  const byEmpDay = {};
  P.forEach(p => (byEmpDay[p.empId + dayKey(new Date(p.ts))] ??= []).push(p));
  const xtToday = Object.entries(byEmpDay).filter(([k2]) => k2.endsWith(today))
    .reduce((a, [, d]) => a + Math.max(0, workMs(d) - 8 * 3600000), 0);
  $('#k-xt').textContent = xtToday ? `${Math.round(xtToday / 60000)}m` : '0m';

  // filters
  const days = [...new Set(P.map(p => dayKey(new Date(p.ts))))].sort().reverse();
  const fD = $('#f-day'), fE = $('#f-emp');
  const keepD = fD.value, keepE = fE.value;
  fD.innerHTML = `<option value="">All days</option>` + days.map(d => `<option ${d === today ? 'selected' : ''}>${d}</option>`).join('');
  fE.innerHTML = `<option value="">All employees</option>` + emps().map(e => `<option value="${esc(e.id)}">${esc(e.name)}</option>`).join('');
  if (keepD) fD.value = keepD; if (keepE) fE.value = keepE;
  const show = P.filter(p => (!fD.value || dayKey(new Date(p.ts)) === fD.value) && (!fE.value || p.empId === fE.value)).slice(0, 120);
  const list = $('#admin-list'); list.innerHTML = '';
  if (!show.length) list.innerHTML = '<div class="list-row" style="color:var(--ink2)">No events.</div>';
  show.forEach(p => list.append(punchRow(p, true)));

  // Recent recorded days; illustrative totals, not a payroll calculation.
  const days7 = [...new Set(P.map(p => dayKey(new Date(p.ts))))].sort().reverse().slice(0, 7);
  let html = `<table><tr><th>Employee</th>${days7.map(d => `<th>${d.slice(5)}</th>`).join('')}<th>Total</th></tr>`;
  for (const e of emps()) {
    let wk = 0; const cells = days7.map(d => {
      const dp = P.filter(p => p.empId === e.id && dayKey(new Date(p.ts)) === d);
      if (!dp.length) return '<td>—</td>';
      const ms = workMs(dp); wk += ms;
      const { doble, triple } = xtSplit(ms);
      const hrs = (ms / 3600000).toFixed(1);
      const cls = triple > 0 ? 'xt3' : doble > 0 ? 'xt2' : '';
      return `<td class="${cls}">${hrs}</td>`;
    }).join('');
    const wkCls = wk > 48 * 3600000 ? 'xt3' : '';
    html += `<tr><td>${esc(e.name)}</td>${cells}<td class="${wkCls}">${(wk / 3600000).toFixed(1)}h</td></tr>`;
  }
  $('#week-report').innerHTML = html + '</table><p style="font-size:11px;color:var(--ink2);margin-top:8px">Illustrative hours only. Orange = over 8h/day; red = over 10h/day or 48h across displayed days. Not a payroll or legal determination.</p>';
}
$('#btn-pin').onclick = () => {
  if ($('#pin-input').value === ADMIN_PIN) { sessionStorage.setItem('pmx_admin', '1'); renderAdmin(); }
  else toast('Incorrect demo PIN');
};
[f => f].forEach(() => {});
document.addEventListener('input', e => {
  if (e.target.id === 'f-day' || e.target.id === 'f-emp') renderAdmin();
});

/* config */
$('#btn-config').onclick = () => {
  const c = $('#config-card'); c.style.display = c.style.display === 'none' ? 'block' : 'none';
  const o = office();
  $('#c-name').value = o.name; $('#c-lat').value = o.lat; $('#c-lng').value = o.lng; $('#c-rad').value = o.radius;
};
$('#btn-save-config').onclick = () => {
  store.set(K.OFF, { name: $('#c-name').value, lat: +$('#c-lat').value, lng: +$('#c-lng').value, radius: +$('#c-rad').value });
  toast('Geofence updated ✓'); renderIdentity(); renderAdmin();
};

/* CSV */
$('#btn-csv').onclick = () => {
  const cols = ['date_Mexico_City', 'time_Mexico_City', 'event', 'employee', 'lat', 'lng', 'accuracy_m', 'distance_m', 'inside_geofence', 'simulated_gps', 'note'];
  const rows = punches().sort((a, b) => a.ts.localeCompare(b.ts)).map(p => {
    const e = emps().find(x => x.id === p.empId);
    return [fdate.format(new Date(p.ts)), timeStr(p.ts), p.dir === 'ENTRADA' ? 'CLOCK_IN' : 'CLOCK_OUT', e?.name ?? p.empId, p.lat, p.lng, p.acc, p.dist, p.inside ? 'YES' : 'NO', p.demo ? 'YES' : 'NO', p.note || ''];
  });
  const csv = [cols, ...rows].map(r => r.map(v => `"${String(v ?? '').replaceAll('"', '""')}"`).join(',')).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }));
  a.download = `punchin_${dayKey()}.csv`; a.click(); toast('CSV exported ✓');
};

$('#btn-reset').onclick = () => {
  if (!confirm('Delete all browser-local demo data?')) return;
  Object.values(K).forEach(k => localStorage.removeItem(k));
  location.reload();
};

/* ---------- boot ---------- */
renderIdentity(); pingGps();
if (!store.get(K.CONSENT, false)) setTimeout(() => openSheet('#sheet-consent'), 800);
