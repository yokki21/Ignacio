// Utilidades de interfaz: escape, formato, hojas modales, avisos y gráficos SVG.
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const r0 = (n) => Math.round(n || 0);
export const r1 = (n) => (Math.round((n || 0) * 10) / 10).toLocaleString('es-ES');
export const n0 = (n) => r0(n).toLocaleString('es-ES');
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
export function fdate(s, withDay = true) {
  const d = new Date(s.length === 10 ? s + 'T12:00:00' : s);
  return `${withDay ? DIAS[d.getDay()] + ' ' : ''}${d.getDate()} ${MESES[d.getMonth()]}`;
}
export const fshort = (s) => { const d = new Date(s.length === 10 ? s + 'T12:00:00' : s); return `${d.getDate()}/${d.getMonth() + 1}`; };

// ---- hoja modal ----
let sheetClose = null;
export function sheet(html, { onMount, full = false, onClose } = {}) {
  closeSheet();
  const wrap = document.createElement('div');
  wrap.className = 'sheet-wrap';
  wrap.innerHTML = `<div class="sheet-bg"></div><div class="sheet ${full ? 'full' : ''}" role="dialog">${html}</div>`;
  document.body.appendChild(wrap);
  document.body.classList.add('noscroll');
  requestAnimationFrame(() => wrap.classList.add('open'));
  const close = () => {
    wrap.classList.remove('open');
    document.body.classList.remove('noscroll');
    setTimeout(() => wrap.remove(), 200);
    sheetClose = null;
    onClose && onClose();
  };
  wrap.querySelector('.sheet-bg').addEventListener('click', close);
  wrap.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', close));
  sheetClose = close;
  onMount && onMount(wrap.querySelector('.sheet'), close);
  return close;
}
export function closeSheet() { if (sheetClose) sheetClose(); }

export function toast(msg, ms = 2500) {
  const t = document.createElement('div');
  t.className = 'toast'; t.textContent = msg;
  document.body.appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, ms);
}

export function confirmSheet(text, okLabel = 'Aceptar') {
  return new Promise(res => {
    let done = false;
    sheet(`<h3>${esc(text)}</h3><div class="row gap end"><button class="btn ghost" data-close>Cancelar</button><button class="btn primary" id="cf-ok">${esc(okLabel)}</button></div>`, {
      onMount: (el, close) => el.querySelector('#cf-ok').addEventListener('click', () => { done = true; close(); res(true); }),
      onClose: () => { if (!done) res(false); },
    });
  });
}

// ---- gráficos ----
export function ring(value, max, { size = 132, stroke = 12, color = 'var(--accent)', label = '', sub = '' } = {}) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r;
  const pct = max > 0 ? Math.min(1, value / max) : 0;
  const over = value > max;
  return `<svg class="ring" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="var(--track)" stroke-width="${stroke}"/>
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${over ? 'var(--warn)' : color}" stroke-width="${stroke}" stroke-linecap="round"
      stroke-dasharray="${c * pct} ${c}" transform="rotate(-90 ${size / 2} ${size / 2})"/>
    <text x="50%" y="47%" text-anchor="middle" class="ring-num">${esc(label)}</text>
    <text x="50%" y="63%" text-anchor="middle" class="ring-sub">${esc(sub)}</text></svg>`;
}

export function bar(label, value, max, color) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return `<div class="mbar"><div class="mbar-top"><span>${esc(label)}</span><span><b>${r0(value)}</b> / ${r0(max)} g</span></div>
    <div class="mbar-track"><div class="mbar-fill" style="width:${pct}%;background:${value > max * 1.08 ? 'var(--warn)' : color}"></div></div></div>`;
}

// Gráfico de líneas. series: [{ points: [{x: 'YYYY-MM-DD', y}], color, dots, width }]
export function lineChart(series, { height = 170, unit = '', yPad = 0.5 } = {}) {
  const W = 340, H = height, L = 34, R = 8, T = 10, B = 22;
  const all = series.flatMap(s => s.points);
  if (all.length < 2) return '<p class="muted small">Necesitas al menos dos datos para ver el gráfico.</p>';
  const xs = all.map(p => new Date(p.x).getTime());
  const ys = all.map(p => p.y);
  const x0 = Math.min(...xs), x1 = Math.max(...xs) || x0 + 1;
  let y0 = Math.min(...ys) - yPad, y1 = Math.max(...ys) + yPad;
  if (y1 - y0 < 1) { y0 -= 0.5; y1 += 0.5; }
  const X = (t) => L + ((t - x0) / (x1 - x0 || 1)) * (W - L - R);
  const Y = (v) => T + (1 - (v - y0) / (y1 - y0)) * (H - T - B);
  let svg = `<svg viewBox="0 0 ${W} ${H}" class="chart">`;
  for (let i = 0; i <= 3; i++) {
    const v = y0 + ((y1 - y0) * i) / 3;
    svg += `<line x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}" class="grid"/><text x="${L - 4}" y="${Y(v) + 3}" text-anchor="end" class="axis">${r1(v)}</text>`;
  }
  svg += `<text x="${L}" y="${H - 6}" class="axis">${fshort(new Date(x0).toISOString())}</text><text x="${W - R}" y="${H - 6}" text-anchor="end" class="axis">${fshort(new Date(x1).toISOString())}</text>`;
  for (const s of series) {
    const pts = s.points.map(p => [X(new Date(p.x).getTime()), Y(p.y)]);
    if (s.dots) svg += pts.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.6" fill="${s.color}" opacity=".55"/>`).join('');
    if (s.line !== false && pts.length > 1) svg += `<polyline fill="none" stroke="${s.color}" stroke-width="${s.width || 2.2}" stroke-linejoin="round" points="${pts.map(p => p.join(',')).join(' ')}"/>`;
  }
  return svg + `</svg>${unit ? `<div class="muted small right">${esc(unit)}</div>` : ''}`;
}

// Redimensiona una imagen a JPEG (para fotos de progreso)
export function compressImage(file, max = 1080, q = 0.8) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = img.width * k; c.height = img.height * k;
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      res(c.toDataURL('image/jpeg', q));
      URL.revokeObjectURL(img.src);
    };
    img.onerror = rej;
    img.src = URL.createObjectURL(file);
  });
}

// Pitido + vibración al terminar el descanso
let actx = null;
export function beep() {
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    const o = actx.createOscillator(), g = actx.createGain();
    o.frequency.value = 880; o.connect(g); g.connect(actx.destination);
    g.gain.setValueAtTime(0.25, actx.currentTime); g.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 0.6);
    o.start(); o.stop(actx.currentTime + 0.6);
  } catch { /* sin audio */ }
  if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
}
