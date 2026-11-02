'use strict';
// Kripto detay ekranı: Halkbank ve Halk Kripto'da ortak (fiyat, grafik, fiyat aralığı, piyasa bilgileri, Durumum).
// Her uygulama kendi favs (favori kümesi), inCur ve ekranı açan openCoin işlevini tanımlar.
// Piyasa bilgileri demo amaçlıdır (USD cinsinden; arzlar adet).
const COIN_INFO = {
  btc: { name: 'Bitcoin', rank: 1, circ: 20.1e6, total: 20.1e6, max: 21e6, dom: 60.07, ath: [126254, '06.10.2025'], atl: [57734, '01.07.2026'] },
  eth: { name: 'Ethereum', rank: 2, circ: 120.7e6, total: 120.7e6, max: null, dom: 11.82, ath: [4953.73, '24.08.2025'], atl: [1385.12, '09.04.2025'] },
  xrp: { name: 'Ripple', rank: 4, circ: 60.1e9, total: 99.99e9, max: 100e9, dom: 3.21, ath: [3.65, '18.07.2025'], atl: [0.0028, '07.07.2014'] },
  sol: { name: 'Solana', rank: 6, circ: 552e6, total: 610e6, max: null, dom: 2.38, ath: [293.31, '19.01.2025'], atl: [0.50, '11.05.2020'] },
  usdc: { name: 'USD Coin', rank: 7, circ: 76.2e9, total: 76.2e9, max: null, dom: 2.12, ath: [1.17, '28.05.2019'], atl: [0.88, '11.03.2023'] },
  uni: { name: 'Uniswap', rank: 30, circ: 630e6, total: 1e9, max: 1e9, dom: 0.18, ath: [44.97, '03.05.2021'], atl: [1.03, '17.09.2020'] },
  usdt: { name: 'Tether', rank: 3, circ: 185e9, total: 185e9, max: null, dom: 4.91, ath: [1.32, '24.07.2018'], atl: [0.5683, '02.03.2015'] },
  ada: { name: 'Cardano', rank: 12, circ: 36.5e9, total: 45e9, max: 45e9, dom: 0.20, ath: [3.10, '02.09.2021'], atl: [0.0192, '01.10.2017'] },
  doge: { name: 'Dogecoin', rank: 9, circ: 151e9, total: 151e9, max: null, dom: 0.82, ath: [0.7376, '08.05.2021'], atl: [0.000087, '06.05.2015'] },
  ltc: { name: 'Litecoin', rank: 22, circ: 76.5e6, total: 84e6, max: 84e6, dom: 0.12, ath: [410.26, '10.05.2021'], atl: [1.11, '14.01.2015'] },
  ondo: { name: 'Ondo', rank: 45, circ: 3.16e9, total: 10e9, max: 10e9, dom: 0.04, ath: [2.14, '03.12.2024'], atl: [0.0838, '18.01.2024'] },
  avax: { name: 'Avalanche', rank: 25, circ: 425e6, total: 460e6, max: 720e6, dom: 0.10, ath: [144.96, '21.11.2021'], atl: [2.80, '31.12.2020'] },
  grt: { name: 'The Graph', rank: 120, circ: 10.7e9, total: 10.8e9, max: null, dom: 0.01, ath: [2.84, '12.02.2021'], atl: [0.0201, '14.10.2026'] },
  aave: { name: 'Aave', rank: 35, circ: 15.2e6, total: 16e6, max: 16e6, dom: 0.05, ath: [661.69, '18.05.2021'], atl: [26.02, '05.11.2020'] },
  ena: { name: 'Ethena', rank: 50, circ: 7.5e9, total: 15e9, max: 15e9, dom: 0.04, ath: [1.52, '11.04.2024'], atl: [0.1950, '10.10.2025'] },
  ldo: { name: 'Lido DAO', rank: 90, circ: 900e6, total: 1e9, max: 1e9, dom: 0.01, ath: [7.30, '20.08.2021'], atl: [0.3300, '10.10.2026'] },
  dot: { name: 'Polkadot', rank: 40, circ: 1.65e9, total: 1.65e9, max: null, dom: 0.04, ath: [55.00, '04.11.2021'], atl: [0.9300, '15.10.2026'] },
  link: { name: 'Chainlink', rank: 15, circ: 700e6, total: 1e9, max: 1e9, dom: 0.21, ath: [52.70, '10.05.2021'], atl: [0.1263, '23.09.2017'] },
  pendle: { name: 'Pendle', rank: 110, circ: 170e6, total: 280e6, max: null, dom: 0.01, ath: [7.52, '11.04.2024'], atl: [0.0334, '05.11.2022'] },
  chz: { name: 'Chiliz', rank: 150, circ: 10.1e9, total: 10.1e9, max: null, dom: 0.01, ath: [0.8915, '13.03.2021'], atl: [0.0039, '13.03.2020'] },
  sand: { name: 'The Sandbox', rank: 160, circ: 2.6e9, total: 3e9, max: 3e9, dom: 0.01, ath: [8.40, '25.11.2021'], atl: [0.0279, '05.11.2020'] },
  mana: { name: 'Decentraland', rank: 140, circ: 1.97e9, total: 2.19e9, max: 2.19e9, dom: 0.01, ath: [5.85, '25.11.2021'], atl: [0.0079, '28.10.2017'] },
  pol: { name: 'Polygon', rank: 80, circ: 10.5e9, total: 10.5e9, max: null, dom: 0.03, ath: [1.29, '13.03.2024'], atl: [0.0850, '10.10.2026'] },
  zro: { name: 'LayerZero', rank: 100, circ: 300e6, total: 1e9, max: 1e9, dom: 0.01, ath: [7.53, '03.12.2024'], atl: [1.25, '10.10.2025'] },
  virtual: { name: 'Virtuals', rank: 95, circ: 656e6, total: 1e9, max: 1e9, dom: 0.01, ath: [5.25, '02.01.2025'], atl: [0.0074, '17.12.2023'] },
  inj: { name: 'Injective', rank: 85, circ: 100e6, total: 100e6, max: 100e6, dom: 0.02, ath: [52.75, '14.03.2024'], atl: [0.6572, '03.11.2020'] },
  ens: { name: 'Ethereum Name Service', rank: 130, circ: 37e6, total: 100e6, max: 100e6, dom: 0.01, ath: [85.69, '11.11.2021'], atl: [4.86, '10.10.2025'] },
  qnt: { name: 'Quant', rank: 75, circ: 14.5e6, total: 14.6e6, max: 14.6e6, dom: 0.01, ath: [427.42, '11.09.2021'], atl: [0.1636, '23.08.2018'] },
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
function fmtPrice(v) { return fmt(v, v < 1 ? 4 : v < 20 ? 3 : 2); }
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

function setSeg(name) {
  $$('#coin-seg button').forEach((b) => b.classList.toggle('on', b.dataset.seg === name));
  $$('#coin [data-pane]').forEach((p) => (p.hidden = p.dataset.pane !== name));
}
