'use strict';

/* ================= Veri ================= */
// Fiyatlar 28 Ekim 2026 piyasa seviyelerine göre (demo, canlı değil). 1 USD ≈ 49,68 TL
const USD_RATE = 49.68;

const COINS = [
  { k: 'btc', n: 'Bitcoin', c: 'BTC', tl: 4038500, d: 0, ch: -0.15 },
  { k: 'eth', n: 'Ethereum', c: 'ETH', tl: 117344.16, d: 0, ch: -0.62 },
  { k: 'xrp', n: 'Ripple', c: 'XRP', tl: 66.07, d: 2, ch: 0.76 },
  { k: 'sol', n: 'Solana', c: 'SOL', tl: 5081.77, d: 2, ch: 1.12 },
  { k: 'usdc', n: 'USD Coin', c: 'USDC', tl: 49.68, d: 2, ch: 0 },
  { k: 'uni', n: 'UNISWAP', c: 'UNI', tl: 343.29, d: 2, ch: 2.84 },
];

// v: varlığın güncel TL değeri, pct: alış maliyetine göre kar/zarar oranı (%), dq: miktar ondalığı.
// Toplam değer Halk Kripto hesabındaki "Kripto Varlıklarım" (70.150 TL) ile aynıdır.
// Miktar = değer / güncel fiyat, kar/zarar = değer - maliyet olarak hesaplanır.
const ASSETS = [
  { k: 'btc', n: 'Bitcoin', c: 'BTC', v: 24552.50, pct: 14.2, dq: 8 },
  { k: 'eth', n: 'Ethereum', c: 'ETH', v: 15433.00, pct: 6.8, dq: 5 },
  { k: 'sol', n: 'Solana', c: 'SOL', v: 10522.50, pct: -3.4, dq: 4 },
  { k: 'xrp', n: 'Ripple', c: 'XRP', v: 9821.00, pct: 22.5, dq: 2 },
  { k: 'usdc', n: 'USD Coin', c: 'USDC', v: 9821.00, pct: 0, dq: 2 },
];
function assetCalc(a) {
  const price = COINS.find((x) => x.k === a.k).tl;
  const pl = a.v - a.v / (1 + a.pct / 100);
  return { qty: `${fmt(a.v / price, a.dq)} ${a.c}`, pl };
}
function portfolioPL() {
  const pl = ASSETS.reduce((t, a) => t + assetCalc(a).pl, 0);
  const value = ASSETS.reduce((t, a) => t + a.v, 0);
  return { pl, pct: (pl / (value - pl)) * 100 };
}
const signed = (n) => `${n > 0 ? '+' : n < 0 ? '-' : ''}${fmt(Math.abs(n))}`;

const MONTHS = ['OCA', 'ŞUB', 'MAR', 'NİS', 'MAY', 'HAZ', 'TEM', 'AĞU', 'EYL', 'EKİ', 'KAS', 'ARA'];

const state = {
  vadesiz: 250000,
  kredili: 250000,
  nakit: 30200,
  kripto: 70150, // ASSETS değerlerinin toplamı
  cur: 'TL', // Halk Kripto ekranlarında görüntüleme para birimi
  hidden: false,
  amt: '',          // klavyeden girilen ham tutar, ör. "50000,5"
  last: null,       // son başarılı işlem
  moves: [
    { m: 'EKİ', d: 16, y: 2026, t: 'Para Transferi', s: 'ECE CAN’DAN GELEN HAVALE', a: 75000 },
    { m: 'EKİ', d: 12, y: 2026, t: 'Para Transferi', s: '98745625879798QR PARA ÇEKME', a: -50000 },
  ],
};

/* ================= Yardımcılar ================= */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

function fmt(n, dec = 2) {
  return n.toLocaleString('tr-TR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}
// "250.000" + "<small>,00 TL</small>"
function money(n, cur = 'TL') {
  const [i, f] = fmt(n).split(',');
  return `${i}<small>,${f} ${cur}</small>`;
}
// Halk Kripto tutarları seçili görüntüleme para biriminde (TL / USD)
const inCur = (nTL, cur = state.cur) => (cur === 'USD' ? nTL / USD_RATE : nTL);
const moneyC = (nTL) => money(inCur(nTL), state.cur);
function parseAmt(s) { return s ? parseFloat(s.replace(',', '.')) : 0; }
function amtDisplay(s) {
  if (!s) return '';
  const [i, f] = s.split(',');
  const int = i ? Number(i).toLocaleString('tr-TR') : '0';
  return f !== undefined ? `${int},${f}` : int;
}
function today(withTime) {
  const d = new Date();
  const p = (x) => String(x).padStart(2, '0');
  const s = `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()}`;
  return withTime ? `${s} - ${p(d.getHours())}:${p(d.getMinutes())}` : s;
}
function chClass(ch) { return ch > 0 ? 'up' : ch < 0 ? 'down' : 'flat'; }
function coinIcon(k) { return `<span class="coin-ic"><svg width="24" height="24"><use href="#c-${k}"/></svg></span>`; }

/* ================= Çizim ================= */
function renderBalances() {
  const total = state.nakit + state.kripto;
  const tp = portfolioPL();
  $$('[data-k="vadesiz-big"]').forEach((e) => (e.innerHTML = money(state.vadesiz)));
  $$('[data-k="kredili"]').forEach((e) => (e.innerHTML = money(state.kredili)));
  $$('[data-k="vadesiz-blue"]').forEach((e) => (e.innerHTML = money(state.vadesiz)));
  $$('[data-k="kredili-blue"]').forEach((e) => (e.innerHTML = money(state.kredili)));
  const eye = `<button class="eye-btn press" data-eye><svg width="17" height="13"><use href="#${state.hidden ? 'i-eye-off' : 'i-eye'}"/></svg></button>`;
  const head = `
    <div class="acct-head">
      <svg class="coin-badge" width="17" height="17"><use href="#i-coinbadge"/></svg>
      <span class="name">Halk Kripto Hesabım</span>${eye}
      <button class="pill-orange press" data-cursheet style="margin-left:16px">${state.cur} <svg width="13" height="8"><use href="#i-chev-down"/></svg></button>
    </div>
    <div class="lbl" style="margin-top:13px">Kripto ve Nakit Bakiye</div>
    <div class="amt-big amt">${moneyC(total)}</div>
    <div class="pl-row"><span class="lbl">Olası Kar / Zarar</span><b class="${chClass(tp.pct)} amt">%${fmt(Math.abs(tp.pct))}</b><b class="${chClass(tp.pl)} money-sm amt">${signed(inCur(tp.pl)).split(',')[0]}<small>,${fmt(inCur(tp.pl)).split(',')[1]} ${state.cur}</small></b></div>`;
  $('[data-kcard]').innerHTML = head;
  $('[data-vcard]').innerHTML = head + `
    <hr>
    <div class="vrow"><span class="lbl">Nakit Varlıklarım</span><b class="amt">${moneyC(state.nakit)}</b></div>
    <div class="vrow"><span class="lbl">Kripto Varlıklarım</span><b class="amt">${moneyC(state.kripto)}</b></div>`;
  $$('[data-eye] use').forEach((u) => u.setAttribute('href', state.hidden ? '#i-eye-off' : '#i-eye'));
  $('#device').classList.toggle('hidden-amt', state.hidden);
}

function renderMoves() {
  $('#moves').innerHTML = state.moves.slice(0, 2).map((m) => `
    <div class="mv">
      <div class="datebox"><span class="m">${m.m}</span><span class="d">${m.d}</span><span class="y">${m.y}</span></div>
      <div class="mv-body">
        <div class="mv-top"><b>${m.t}</b><span class="${m.a > 0 ? 'pos' : 'neg'} amt">${m.a < 0 ? '-' : ''}${fmt(Math.abs(m.a))}TL</span></div>
        <div class="mv-bot"><span>${m.s}</span><svg width="17" height="19" style="color:#0576b8;flex:none;margin-left:10px"><use href="#i-receipt"/></svg></div>
      </div>
    </div>`).join('');
}

function coinRow(c, cur, pair) {
  const usd = cur === 'USD';
  const p = c.tl / USD_RATE;
  const price = usd ? `${fmt(p, p < 1 ? 4 : 2)} USD` : `${fmt(c.tl, c.d)} TL`;
  const code = pair ? `${c.c}/${cur}` : c.c;
  return `
    <div class="coin-row tap" data-coin="${c.k}" data-cur="${usd ? 'USD' : 'TL'}">
      ${coinIcon(c.k)}
      <div class="coin-name"><b>${c.n}</b><span>${code}</span></div>
      <div class="coin-val"><b>${price}</b><span class="${chClass(c.ch)}">%${fmt(Math.abs(c.ch))}</span></div>
    </div>`;
}

function renderKriptoList() {
  $('#kripto-list').innerHTML = COINS.map((c) => coinRow(c, state.cur)).join('');
}

let marketCur = 'TL';
function renderMarket() {
  const q = $('#q').value.trim().toLocaleLowerCase('tr-TR');
  const list = COINS.filter((c) => !q || c.n.toLocaleLowerCase('tr-TR').includes(q) || c.c.toLocaleLowerCase('tr-TR').includes(q));
  let html;
  if (marketCur === 'all') html = list.flatMap((c) => [coinRow(c, 'TL', true), coinRow(c, 'USD', true)]).join('');
  else html = list.map((c) => coinRow(c, marketCur)).join('');
  $('#market-list').innerHTML = html || '<div class="empty">Sonuç bulunamadı</div>';
  $$('#chips .chip').forEach((b) => b.classList.toggle('on', b.dataset.cur === marketCur));
}

function renderAssets() {
  $('#asset-list').innerHTML = ASSETS.map((a) => `
    <div class="asset-row tap" data-coin="${a.k}" data-cur="${state.cur}">
      ${coinIcon(a.k)}
      <div class="coin-name">
        <b>${a.n}</b><span>${a.c}</span>
        <div class="plr"><em>Kar/Zarar</em><span class="${chClass(a.pct)}">%${fmt(Math.abs(a.pct))}</span></div>
      </div>
      <div class="coin-val"><b class="amt">~ ${fmt(inCur(a.v))} ${state.cur}</b><b class="amt" style="margin-top:5px">${assetCalc(a).qty}</b><span class="${chClass(a.pct)} amt">${signed(inCur(assetCalc(a).pl))} ${state.cur}</span></div>
    </div>`).join('');
}

/* ================= Kripto detay ================= */
// Piyasa bilgileri demo amaçlıdır (USD cinsinden; arzlar adet).
const COIN_INFO = {
  btc: { name: 'Bitcoin', rank: 1, circ: 20.1e6, total: 20.1e6, max: 21e6, dom: 60.07, ath: [126254, '06.10.2025'], atl: [57734, '01.07.2026'] },
  eth: { name: 'Ethereum', rank: 2, circ: 120.7e6, total: 120.7e6, max: null, dom: 11.82, ath: [4953.73, '24.08.2025'], atl: [1385.12, '09.04.2025'] },
  xrp: { name: 'Ripple', rank: 4, circ: 60.1e9, total: 99.99e9, max: 100e9, dom: 3.21, ath: [3.65, '18.07.2025'], atl: [0.0028, '07.07.2014'] },
  sol: { name: 'Solana', rank: 6, circ: 552e6, total: 610e6, max: null, dom: 2.38, ath: [293.31, '19.01.2025'], atl: [0.50, '11.05.2020'] },
  usdc: { name: 'USD Coin', rank: 7, circ: 76.2e9, total: 76.2e9, max: null, dom: 2.12, ath: [1.17, '28.05.2019'], atl: [0.88, '11.03.2023'] },
  uni: { name: 'Uniswap', rank: 30, circ: 630e6, total: 1e9, max: 1e9, dom: 0.18, ath: [44.97, '03.05.2021'], atl: [1.03, '17.09.2020'] },
};
const RANGES = {
  '1S': { n: 60, vol: 0.0009, step: 60e3 },
  '24S': { n: 72, vol: 0.003, step: 20 * 60e3 },
  '1H': { n: 84, vol: 0.008, step: 2 * 3600e3 },
  '1A': { n: 90, vol: 0.012, step: 8 * 3600e3 },
  '3A': { n: 90, vol: 0.02, step: 24 * 3600e3 },
  '6A': { n: 90, vol: 0.028, step: 2 * 24 * 3600e3 },
  '1Y': { n: 104, vol: 0.035, step: 3.5 * 24 * 3600e3 },
};
const TR_MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const favs = new Set();
const cd = { k: 'btc', cur: 'TL', range: '1S', pts: [] };

function bigNum(n, unit) {
  const steps = [[1e12, 'trilyon'], [1e9, 'milyar'], [1e6, 'milyon']];
  for (const [v, w] of steps) if (n >= v) return `${fmt(n / v, 1)} ${w} ${unit}`;
  return `${fmt(n, 0)} ${unit}`;
}
function priceIn(k, cur) {
  const c = COINS.find((x) => x.k === k);
  return cur === 'USD' ? c.tl / USD_RATE : c.tl;
}
function fmtPrice(v) { return fmt(v, v < 1 ? 4 : 2); }
function dateTime(d, withSec) {
  const p = (x) => String(x).padStart(2, '0');
  return `${d.getDate()} ${TR_MONTHS[d.getMonth()]} ${d.getFullYear()}, ${p(d.getHours())}:${p(d.getMinutes())}${withSec ? ':' + p(d.getSeconds()) : ''}`;
}

// Seçilen aralık için tekrarlanabilir (her açılışta aynı) fiyat serisi üretir; son nokta güncel fiyattır
function series(k, range, last) {
  const R = RANGES[range];
  let seed = [...(k + range)].reduce((a, ch) => a * 31 + ch.charCodeAt(0), 7) % 2147483647 || 1;
  const rnd = () => (seed = (seed * 48271) % 2147483647) / 2147483647;
  const vol = k === 'usdc' ? R.vol * 0.04 : R.vol;
  const steps = [];
  for (let i = 1; i < R.n; i++) steps.push((rnd() - 0.5) * 2 * vol + (rnd() < 0.08 ? (rnd() - 0.5) * vol * 5 : 0));
  const pts = [last];
  for (let i = steps.length - 1; i >= 0; i--) pts.unshift(pts[0] / (1 + steps[i]));
  return pts;
}

function drawChart(animate) {
  const W = 402, H = 250, padT = 26, padB = 14, padR = 22, padL = 20;
  const last = priceIn(cd.k, cd.cur);
  const pts = (cd.pts = series(cd.k, cd.range, last));
  const lo = Math.min(...pts), hi = Math.max(...pts), span = hi - lo || 1;
  const x = (i) => padL + (i / (pts.length - 1)) * (W - padL - padR);
  const y = (v) => padT + (1 - (v - lo) / span) * (H - padT - padB);
  cd.x = x; cd.y = y;
  const up = pts[pts.length - 1] >= pts[0];
  const color = up ? '#0b9a4a' : '#e0393e';
  const d = pts.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join('');
  const area = `${d}L${x(pts.length - 1).toFixed(1)} ${H}L${x(0).toFixed(1)} ${H}Z`;
  const by = y(pts[0]).toFixed(1);
  $('#chart-svg').innerHTML = `
    <defs><linearGradient id="cg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity=".18"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient></defs>
    <line x1="0" x2="${W}" y1="${by}" y2="${by}" stroke="#9aa7b6" stroke-width="1.2" stroke-dasharray="3 4"/>
    <path d="${area}" fill="url(#cg)"/>
    <path class="ln${animate ? ' draw' : ''}" d="${d}" stroke="${color}"/>
    <circle class="dot" cx="${x(pts.length - 1)}" cy="${y(last)}" r="5.5" fill="${color}"/>
    <g id="scrub" style="display:none"><line id="scrub-l" y1="0" y2="${H}" stroke="#7d848a" stroke-width="1" stroke-dasharray="3 3"/><circle id="scrub-c" r="6" fill="#fff" stroke="${color}" stroke-width="3"/></g>`;
  if (animate) {
    const ln = $('#chart-svg .ln');
    const len = ln.getTotalLength();
    ln.style.strokeDasharray = len;
    ln.style.setProperty('--len', len);
  }
}

function setupChartScrub() {
  const box = $('#chart'), tip = $('#chart-tip');
  const move = (clientX) => {
    if (!cd.pts.length) return;
    const r = box.getBoundingClientRect();
    const lx = ((clientX - r.left) / r.width) * 402;
    const n = cd.pts.length;
    const i = Math.max(0, Math.min(n - 1, Math.round(((lx - 20) / (402 - 42)) * (n - 1))));
    const v = cd.pts[i];
    const g = $('#scrub');
    g.style.display = '';
    $('#scrub-l').setAttribute('x1', cd.x(i)); $('#scrub-l').setAttribute('x2', cd.x(i));
    $('#scrub-c').setAttribute('cx', cd.x(i)); $('#scrub-c').setAttribute('cy', cd.y(v));
    const t = new Date(Date.now() - (n - 1 - i) * RANGES[cd.range].step);
    tip.innerHTML = `${fmtPrice(v)} ${cd.cur}<small>${dateTime(t, false)}</small>`;
    tip.style.left = `${Math.max(70, Math.min(332, cd.x(i))) / 402 * 100}%`;
    tip.classList.add('show');
  };
  const end = () => { tip.classList.remove('show'); const g = $('#scrub'); if (g) g.style.display = 'none'; };
  box.addEventListener('touchstart', (e) => move(e.touches[0].clientX), { passive: true });
  box.addEventListener('touchmove', (e) => move(e.touches[0].clientX), { passive: true });
  box.addEventListener('touchend', end);
  box.addEventListener('mousemove', (e) => move(e.clientX));
  box.addEventListener('mouseleave', end);
}

function renderCoin() {
  const c = COINS.find((x) => x.k === cd.k), info = COIN_INFO[cd.k];
  const cur = cd.cur, price = priceIn(cd.k, cur);
  const curName = cur === 'USD' ? 'Amerikan Doları' : 'Türk Lirası';
  $('#coin-title').textContent = `${c.c}/${cur}`;
  $('#coin-fav').classList.toggle('on', favs.has(cd.k));
  $('#cd-ic').innerHTML = `<svg width="24" height="24"><use href="#c-${cd.k}"/></svg>`;
  $('#cd-pair').textContent = `${c.c}/${cur}`;
  $('#cd-name').textContent = `${info.name}/${curName}`;
  const [i, f] = fmtPrice(price).split(',');
  $('#cd-price').innerHTML = `${i}<small>,${f} ${cur}</small>`;
  const ch = $('#cd-ch');
  ch.className = `cd-ch ${chClass(c.ch)}`;
  ch.innerHTML = `%${fmt(Math.abs(c.ch))}${c.ch ? '<i></i>' : ''}`;
  $('#cd-time').textContent = dateTime(new Date(), true);
  $$('#ranges button').forEach((b) => b.classList.toggle('on', b.dataset.r === cd.range));
  drawChart(true);

  // Fiyat aralığı: alış/satış makası %0,05
  const toCur = (usd) => (cur === 'USD' ? usd : usd * USD_RATE);
  $('#cd-range').innerHTML = `
    <div class="info-row"><span>En İyi Alış Fiyatı</span><b>${fmtPrice(price * 0.99975)} ${cur}</b></div>
    <div class="info-row"><span>En İyi Satış Fiyatı</span><b>${fmtPrice(price * 1.00025)} ${cur}</b></div>
    <div class="info-row"><span>Ortalama Fiyat</span><b>${fmtPrice(price)} ${cur}</b></div>
    <hr>
    <div class="info-row"><span>Tüm Zamanlar En Yüksek</span><b>${fmtPrice(toCur(info.ath[0]))} ${cur}<small>${info.ath[1]}</small></b></div>
    <div class="info-row"><span>Tüm Zamanlar En Düşük</span><b>${fmtPrice(toCur(info.atl[0]))} ${cur}<small>${info.atl[1]}</small></b></div>`;
  const cap = c.tl * info.circ, fdv = c.tl * (info.max || info.total);
  $('#cd-market').innerHTML = `
    <div class="info-row"><span>Piyasa Değeri Sıralaması</span><b>${info.rank}</b></div>
    <div class="info-row"><span>Piyasa Değeri</span><b>${bigNum(cap, 'TL')}</b></div>
    <div class="info-row"><span>Seyreltilmiş Piyasa Değeri</span><b>${bigNum(fdv, 'TL')}</b></div>
    <div class="info-row"><span>Piyasa Hakimiyeti</span><b>%${fmt(info.dom)}</b></div>
    <hr>
    <div class="info-row"><span>Dolaşımdaki Arz</span><b>${bigNum(info.circ, c.c)}</b></div>
    <div class="info-row"><span>Toplam Arz</span><b>${bigNum(info.total, c.c)}</b></div>
    <div class="info-row"><span>Maksimum Arz</span><b>${info.max ? bigNum(info.max, c.c) : 'Sınırsız'}</b></div>`;

  const a = ASSETS.find((x) => x.k === cd.k);
  // Özet / Durumum sekmeleri yalnızca kullanıcının bu varlığı varsa gösterilir
  $('#coin-seg').hidden = !a;
  if (!a) setSeg('ozet');
  if (a) {
    const share = (a.v / ASSETS.reduce((t, x) => t + x.v, 0)) * 100;
    $('#cd-hold-head').innerHTML = `
      <div class="cd-head">
        <span class="coin-ic"><svg width="24" height="24"><use href="#c-${cd.k}"/></svg></span>
        <div><b>${c.c}/${cur}</b><span>${info.name}/${curName}</span></div>
      </div>
      <div class="coin-val"><b>${fmtPrice(price)} ${cur}</b><span class="cd-ch ${chClass(c.ch)}">%${fmt(Math.abs(c.ch))}${c.ch ? '<i></i>' : ''}</span></div>`;
    $('#cd-hold').innerHTML = `
      <div class="info-row"><span>Kullanılabilir Tutar</span><b class="amt">${assetCalc(a).qty}<em>${fmt(a.v / USD_RATE)} USD</em><em>${fmt(a.v)} TL</em></b></div>
      <div class="info-row"><span>Toplam Olası Kar / Zarar</span><b class="${chClass(a.pct)} amt">${signed(inCur(assetCalc(a).pl, cur))} ${cur}<em>${a.pct > 0 ? '+' : a.pct < 0 ? '-' : ''}%${fmt(Math.abs(a.pct))}</em></b></div>
      <hr>
      <div class="info-row"><span>Portföy Dağılımı</span><b class="plain">%${fmt(share)}</b></div>`;
  }
}

function openCoin(k, cur) {
  cd.k = k; cd.cur = cur || 'TL'; cd.range = '1S';
  setSeg('ozet');
  push('coin');
}
function setSeg(name) {
  $$('#coin-seg button').forEach((b) => b.classList.toggle('on', b.dataset.seg === name));
  $$('#coin [data-pane]').forEach((p) => (p.hidden = p.dataset.pane !== name));
}

function renderTabbars() {
  $$('[data-tabbar]').forEach((t) => {
    t.innerHTML = `
      <button class="tab on" data-popto="home"><svg width="23" height="24"><use href="#t-home"/></svg>Ana Sayfa</button>
      <button class="tab" data-soon><svg width="24" height="24"><use href="#t-wallet"/></svg>Hesap/Kart</button>
      <div class="tab fab-slot"><button class="fab press" data-soon>İşlemler<svg width="30" height="16"><use href="#t-fab"/></svg></button></div>
      <button class="tab" data-soon><svg width="24" height="24"><use href="#t-apply"/></svg>Başvuru</button>
      <button class="tab" data-soon><svg width="24" height="24"><use href="#t-pie"/></svg>Varlıklar</button>`;
  });
}

function renderAmountBits() {
  const v = state.last ? state.last.amount : parseAmt(state.amt);
  $$('[data-k="amount"]').forEach((e) => (e.textContent = `${fmt(v)} TL`));
  $$('[data-k="today"]').forEach((e) => (e.textContent = today()));
  $$('[data-k="ref"]').forEach((e) => (e.textContent = state.last ? state.last.ref : ''));
}

function fakeQR(seed) {
  let x = seed % 2147483647 || 1;
  const rnd = () => (x = (x * 48271) % 2147483647) / 2147483647;
  const N = 25, cells = [];
  const finder = (r, c) => [[0, 0], [0, N - 7], [N - 7, 0]].some(([a, b]) => r >= a && r < a + 7 && c >= b && c < b + 7);
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (!finder(r, c) && rnd() > 0.52) cells.push(`M${c} ${r}h1v1h-1z`);
  const f = (a, b) => `<path d="M${b} ${a}h7v7h-7zM${b + 1} ${a + 1}v5h5v-5z" fill-rule="evenodd"/><path d="M${b + 2} ${a + 2}h3v3h-3z"/>`;
  return `<svg class="qr" viewBox="0 0 ${N} ${N}" shape-rendering="crispEdges"><g fill="#111">${f(0, 0)}${f(0, N - 7)}${f(N - 7, 0)}<path d="${cells.join('')}"/></g></svg>`;
}

function renderDekont() {
  const t = state.last;
  if (!t) return;
  const a = fmt(t.amount);
  $('#doc').innerHTML = `
    <div class="doc-head">
      <span class="doc-brand"><svg width="12" height="12" viewBox="0 0 12 12"><g fill="#1d4f8f"><rect x="0" y="1" width="1.2" height="10"/><rect x="2" y="0" width="1.2" height="12"/><rect x="8.8" y="0" width="1.2" height="12"/><rect x="10.8" y="1" width="1.2" height="10"/><rect x="3.2" y="5.4" width="5.6" height="1.2"/></g></svg>HALKBANK</span>
      <span class="doc-title">DEKONT</span>
    </div>
    <div class="box cols">
      <pre>MÜŞTERİ NO   : 52247128
TCKN/VKN/YKN : 1222409****
IBAN         : TR** **** **** **** **** **
ETTN         : -</pre>
      <pre>İŞLEM TARİHİ : ${t.time.replace(/\./g, '/')}
VALÖR TARİHİ : ${t.date.replace(/\./g, '/')}
BELGE NO     : -
İŞLEM KANALI : MOBİL</pre>
      ${fakeQR(Number(t.ref))}
    </div>
    <div class="box"><pre>İŞLEM TÜRÜ      : HALK KRİPTO HESABINA TRANSFER
GÖNDEREN HESAP  : 1658 - 01106845 NİŞANTAŞI/İSTANBUL ŞB.
ALICI HESAP     : HALK KRİPTO HESABIM
SORGU NO        : ${t.ref.slice(0, 9)}
İŞLEM TUTARI (TL) :        ${a}
İŞLEM ÜCRETİ (TL) :             0,00
BSMV         (TL) :             0,00

TOPLAM (TL) : ${a}
AÇIKLAMA : HALK KRİPTO HESABINA TL TRANSFERİ


</pre></div>
    <div class="box"><pre>AD SOYAD : DEMO KULLANICI</pre></div>
    <div class="box"><pre>BİMREF-SERİSIRANO : M-${t.date.split('.').reverse().join('-')}-${t.ref}      REFERANS : ${t.ref}</pre></div>
    <div class="note">Bu dekont bilgi amaçlıdır. Banka kayıtları ile arasında farklılık olması halinde Banka kayıtları geçerlidir.</div>`;
}

/* ================= Navigasyon ================= */
const stack = [];
let busy = false;
const DUR = 380;
const el = (id) => document.getElementById(id);
const cur = () => el(stack[stack.length - 1]);

function onEnter(id) {
  if (id === 'gonder') updateAmount();
  if (id === 'ozet') renderAmountBits();
  if (id === 'sonuc') { renderAmountBits(); const c = $('#check'); c.classList.remove('pop'); void c.offsetWidth; c.classList.add('pop'); }
  if (id === 'dekont') renderDekont();
  if (id === 'piyasalar') renderMarket();
  if (id === 'coin') renderCoin();
  const sc = $('.scroll', el(id));
  if (sc && id !== 'home') sc.scrollTop = 0;
}

function finish(fn) { setTimeout(() => { fn(); busy = false; }, DUR + 20); }

function push(id, opts = {}) {
  if (busy || id === stack[stack.length - 1]) return;
  busy = true;
  closeKeypad();
  const from = cur(), to = el(id);
  onEnter(id);
  to.classList.remove('anim'); from.classList.remove('anim');
  to.style.transform = 'translateX(100%)';
  to.classList.add('moving');
  from.classList.add('under');
  void to.offsetWidth;
  to.classList.add('anim'); from.classList.add('anim');
  to.style.transform = 'translateX(0)';
  from.style.transform = 'translateX(-30%)';
  from.classList.add('dim');
  if (opts.base) stack.length = stack.indexOf(opts.base) + 1;
  stack.push(id);
  finish(() => {
    from.classList.remove('active', 'under', 'dim', 'anim'); from.style.transform = '';
    to.classList.remove('moving', 'anim'); to.classList.add('active'); to.style.transform = '';
  });
}

function popTo(id, fromDrag) {
  const idx = stack.lastIndexOf(id);
  if (idx < 0 || idx === stack.length - 1) return;
  if (busy && !fromDrag) return;
  busy = true;
  closeKeypad();
  const from = cur(), to = el(id);
  onEnter(id);
  if (!fromDrag) {
    from.classList.remove('anim'); to.classList.remove('anim');
    to.style.transform = 'translateX(-30%)';
    to.classList.add('under', 'dim');
    from.classList.add('moving');
    void to.offsetWidth;
  }
  to.classList.add('anim'); from.classList.add('anim');
  to.style.transform = 'translateX(0)';
  to.classList.remove('dim');
  from.style.transform = 'translateX(100%)';
  stack.length = idx + 1;
  finish(() => {
    from.classList.remove('active', 'moving', 'anim'); from.style.transform = '';
    to.classList.remove('under', 'anim'); to.classList.add('active'); to.style.transform = '';
  });
}
const back = () => stack.length > 1 && popTo(stack[stack.length - 2]);

/* Sol kenardan kaydırarak geri gitme (iOS hareketi) */
function setupEdgeSwipe() {
  const dev = $('#device');
  let drag = null;
  const toLocal = (t) => (t.clientX - view.x) / view.z;
  dev.addEventListener('touchstart', (e) => {
    if (busy || stack.length < 2 || keypadOpen || sheetOpen) return;
    const x = toLocal(e.touches[0]);
    if (x > 26) return;
    drag = { x0: x, dx: 0, t0: Date.now(), from: cur(), to: el(stack[stack.length - 2]), started: false };
  }, { passive: true });
  dev.addEventListener('touchmove', (e) => {
    if (!drag) return;
    const dx = Math.max(0, toLocal(e.touches[0]) - drag.x0);
    if (!drag.started) {
      if (dx < 6) return;
      drag.started = true;
      drag.to.classList.add('under', 'dim');
      drag.from.classList.add('moving');
      drag.to.classList.remove('anim'); drag.from.classList.remove('anim');
    }
    e.preventDefault();
    drag.dx = dx;
    drag.from.style.transform = `translateX(${dx}px)`;
    drag.to.style.transform = `translateX(${-132 + dx * 0.3}px)`;
  }, { passive: false });
  const end = () => {
    if (!drag) return;
    const d = drag; drag = null;
    if (!d.started) return;
    const v = d.dx / Math.max(1, Date.now() - d.t0);
    if (d.dx > 140 || v > 0.6) popTo(stack[stack.length - 2], true);
    else {
      busy = true;
      d.from.classList.add('anim'); d.to.classList.add('anim');
      d.from.style.transform = 'translateX(0)';
      d.to.style.transform = 'translateX(-30%)';
      finish(() => {
        d.to.classList.remove('under', 'dim', 'anim'); d.to.style.transform = '';
        d.from.classList.remove('moving', 'anim'); d.from.style.transform = '';
      });
    }
  };
  dev.addEventListener('touchend', end);
  dev.addEventListener('touchcancel', end);
}

/* Ana sayfada aşağı çekerek yenileme (iOS esneme hareketi ile) */
function setupPullToRefresh() {
  const sc = $('#home-scroll'), content = $('#home-content'), ptr = $('#ptr');
  let pull = 0, busyRefresh = false;
  sc.addEventListener('scroll', () => {
    if (busyRefresh) return;
    pull = Math.max(0, -sc.scrollTop);
    ptr.style.opacity = Math.min(1, pull / 60);
    ptr.style.transform = `rotate(${pull * 4}deg)`;
  }, { passive: true });
  sc.addEventListener('touchend', () => {
    if (busyRefresh || pull < 70) return;
    busyRefresh = true;
    content.classList.add('refreshing');
    ptr.style.opacity = 1; ptr.style.transform = '';
    ptr.classList.add('spin');
    setTimeout(() => {
      content.classList.remove('refreshing');
      ptr.classList.remove('spin');
      ptr.style.opacity = 0;
      setTimeout(() => { busyRefresh = false; pull = 0; }, 350);
    }, 1100);
  }, { passive: true });
}

/* ================= Tutar girişi / klavye ================= */
let keypadOpen = false;
function openKeypad() { keypadOpen = true; $('#keypad').classList.add('open'); $('#amount-field').classList.add('focus'); }
function closeKeypad() { keypadOpen = false; $('#keypad').classList.remove('open'); $('#amount-field').classList.remove('focus'); }

function buildKeypad() {
  const keys = [['1', ''], ['2', 'ABC'], ['3', 'DEF'], ['4', 'GHI'], ['5', 'JKL'], ['6', 'MNO'], ['7', 'PQRS'], ['8', 'TUV'], ['9', 'WXYZ'], [',', ''], ['0', ''], ['del', '']];
  $('#kp-keys').innerHTML = keys.map(([k, l]) => {
    if (k === ',') return `<button class="key blank" data-key=","><b style="font-size:24px">,</b></button>`;
    if (k === 'del') return `<button class="key blank" data-key="del"><svg width="26" height="20"><use href="#i-bksp"/></svg></button>`;
    return `<button class="key" data-key="${k}"><b>${k}</b>${l ? `<span>${l}</span>` : ''}</button>`;
  }).join('');
}

function typeKey(k) {
  let s = state.amt;
  if (k === 'del') s = s.slice(0, -1);
  else if (k === ',') { if (!s.includes(',')) s = (s || '0') + ','; }
  else {
    const [i, f] = s.split(',');
    if (f !== undefined) { if (f.length < 2) s += k; }
    else if (i === '0') s = k;
    else if (i.length < 9) s += k;
  }
  state.amt = s;
  updateAmount();
}

function updateAmount() {
  const v = parseAmt(state.amt);
  $('#amount-text').textContent = amtDisplay(state.amt);
  const f = $('#amount-field');
  f.classList.toggle('filled', !!state.amt);
  let err = '';
  if (v > state.vadesiz) err = 'Tutar, kullanılabilir bakiyenizi aşıyor.';
  f.classList.toggle('err', !!err);
  $('#amount-err').textContent = err;
  $('#devam').disabled = !(v > 0) || !!err;
}

/* ================= Para birimi seçimi (alttan açılan menü) ================= */
let sheetOpen = false;
function openCurSheet() {
  sheetOpen = true;
  $$('#cur-sheet [data-dcur]').forEach((b) => b.classList.toggle('on', b.dataset.dcur === state.cur));
  $('#sheet-bg').classList.add('show');
  $('#cur-sheet').classList.add('open');
}
function closeCurSheet() {
  sheetOpen = false;
  $('#sheet-bg').classList.remove('show');
  $('#cur-sheet').classList.remove('open');
}
function setDisplayCur(cur) {
  $$('#cur-sheet [data-dcur]').forEach((b) => b.classList.toggle('on', b.dataset.dcur === cur));
  state.cur = cur;
  marketCur = cur;
  renderBalances(); renderKriptoList(); renderAssets(); renderMarket();
  setTimeout(closeCurSheet, 180);
}

/* ================= Bildirim ================= */
let toastT;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.remove('show'), 1800);
}

/* ================= Olaylar ================= */
function setupEvents() {
  document.addEventListener('click', (e) => {
    const row = e.target.closest('[data-coin]');
    if (row) return openCoin(row.dataset.coin, row.dataset.cur);
    const b = e.target.closest('button, [data-soon], [data-go]');
    if (!b) return;
    if (b.dataset.go) return push(b.dataset.go);
    if (b.dataset.seg) return setSeg(b.dataset.seg);
    if (b.dataset.r) { cd.range = b.dataset.r; $$('#ranges button').forEach((x) => x.classList.toggle('on', x === b)); return drawChart(true); }
    if (b.dataset.trade) return toast(`Kripto ${b.dataset.trade} işlemi demoda yakında`);
    if (b.id === 'coin-fav') { favs.has(cd.k) ? favs.delete(cd.k) : favs.add(cd.k); b.classList.toggle('on', favs.has(cd.k)); return toast(favs.has(cd.k) ? 'Favorilere eklendi' : 'Favorilerden çıkarıldı'); }
    if (b.hasAttribute('data-back')) return back();
    if (b.dataset.popto) return popTo(b.dataset.popto);
    if (b.hasAttribute('data-cursheet')) return openCurSheet();
    if (b.dataset.dcur) return setDisplayCur(b.dataset.dcur);
    if (b.hasAttribute('data-soon')) return toast('Bu özellik demoda yer almıyor');
    if (b.dataset.toast) return toast(b.dataset.toast);
    if (b.hasAttribute('data-eye')) { state.hidden = !state.hidden; return renderBalances(); }
    if (b.dataset.key) return typeKey(b.dataset.key);
    if (b.dataset.cur) { marketCur = b.dataset.cur; return renderMarket(); }
  });

  $('#amount-field').addEventListener('click', openKeypad);
  $('#sheet-bg').addEventListener('click', closeCurSheet);
  $('#kp-done').addEventListener('click', closeKeypad);
  $('#gonder-scroll').addEventListener('click', (e) => { if (keypadOpen && !e.target.closest('#amount-field')) closeKeypad(); });
  $('#devam').addEventListener('click', () => { state.last = null; push('ozet'); });
  $('#q').addEventListener('input', renderMarket);
  $('#q').addEventListener('keydown', (e) => { if (e.key === 'Enter') e.target.blur(); });

  $('#onayla').addEventListener('click', (e) => {
    const btn = e.currentTarget;
    if (btn.dataset.loading) return;
    btn.dataset.loading = '1';
    btn.innerHTML = '<span class="spinner"></span>';
    setTimeout(() => {
      const amount = parseAmt(state.amt);
      const d = new Date();
      state.vadesiz -= amount;
      state.kredili -= amount;
      state.nakit += amount;
      state.amt = ''; // sonraki gönderim boş tutarla başlasın
      state.last = { amount, ref: String(7683000000 + Math.floor(Math.random() * 999999)), date: today(), time: today(true) };
      state.moves.unshift({ m: MONTHS[d.getMonth()], d: d.getDate(), y: d.getFullYear(), t: 'Halk Kripto Transferi', s: 'HALK KRİPTO HESABIMA GÖNDERİLEN', a: -amount });
      renderBalances(); renderMoves();
      push('sonuc');
      setTimeout(() => { btn.textContent = 'Onayla'; delete btn.dataset.loading; }, DUR + 50);
    }, 900);
  });

  $('#yeni-transfer').addEventListener('click', () => {
    state.amt = '';
    state.last = null;
    push('gonder', { base: 'kripto' });
  });
}

/* ================= Ölçekleme =================
   JS yalnızca genişliğe göre ölçeği (--z) belirler. Yükseklik, üst/alt
   güvenli alanlar ve sabitleme tamamen CSS'tedir (styles.css → #device). */
const view = { z: 1, x: 0, y: 0 };
function layout() {
  const dev = $('#device');
  const W = window.innerWidth, H = window.innerHeight;
  const standalone = window.navigator.standalone || matchMedia('(display-mode: standalone)').matches;
  const framed = !standalone && W >= 640;
  document.body.classList.toggle('framed', framed);
  document.documentElement.classList.toggle('standalone', !!standalone);
  document.documentElement.classList.toggle('notch-sim', location.search.includes('notch')); // yalnızca test için
  if (framed) {
    const z = Math.min((H - 48) / 956, (W - 48) / 440, 1);
    view.z = z; view.x = (W - 440 * z) / 2; view.y = (H - 956 * z) / 2;
    dev.style.setProperty('--z', 1);
    dev.style.transform = `translate(${view.x}px, ${view.y}px) scale(${z})`;
    return;
  }
  view.z = W / 440; view.x = 0; view.y = 0;
  dev.style.transform = '';
  dev.style.setProperty('--z', view.z);
  // iOS ana ekran modu hatası: görünür alan, durum çubuğu (güvenli alan üstü) kadar
  // kısa bildiriliyorsa CSS bu farkı env(safe-area-inset-top) ile kapatır.
  const safeTop = parseFloat(getComputedStyle($('#safe-probe')).paddingTop) || 0;
  const screenH = W <= Math.min(screen.width, screen.height) + 1 ? Math.max(screen.width, screen.height) : Math.min(screen.width, screen.height);
  const missing = screenH - H;
  document.documentElement.classList.toggle('vh-bug', !!standalone && safeTop > 0 && Math.abs(missing - safeTop) <= 4);
}

/* ================= Başlat ================= */
function init() {
  const probe = document.createElement('div');
  probe.id = 'safe-probe';
  probe.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:0;visibility:hidden;pointer-events:none;padding-top:env(safe-area-inset-top)';
  document.body.appendChild(probe);

  renderTabbars(); buildKeypad();
  renderBalances(); renderMoves(); renderKriptoList(); renderMarket(); renderAssets(); updateAmount();
  setupEvents(); setupEdgeSwipe(); setupPullToRefresh(); setupChartScrub();
  setInterval(() => { if (stack[stack.length - 1] === 'coin') $('#cd-time').textContent = dateTime(new Date(), true); }, 1000);
  layout();
  window.addEventListener('resize', layout);
  window.addEventListener('orientationchange', () => setTimeout(layout, 300));
  window.addEventListener('pageshow', layout);

  // Açılış ekranı → Ana Sayfa
  stack.push('home');
  el('home').classList.add('active');
  const splash = el('splash');
  splash.classList.add('anim-fade');
  setTimeout(() => {
    splash.classList.add('gone');
    setTimeout(() => splash.remove(), 600);
  }, 1700);

  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
}

init();
