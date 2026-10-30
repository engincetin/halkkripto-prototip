'use strict';
// Halk Kripto: Halkbank uygulamasından "Al/Sat" ile açılır (iframe içinde) ya da tek başına çalışır.
// Halkbank'tan açıldığında adres: kripto/?embed=1&sat=..&sab=..#pair=BTC/TL&side=Al
// Ortak veri ve yardımcılar ../common.js'ten gelir (iki uygulama aynı rakamları gösterir).

const params = new URLSearchParams(location.search);
const embedded = params.has('embed') && window.parent !== window;

// Halkbank'tan açıldıysa güncel bakiyeler oradan okunur; tek başına açıldıysa başlangıç değerleri
let bank = null;
try { bank = embedded && window.parent.hkState ? window.parent.hkState : null; } catch (e) { bank = null; }
const state = bank || { nakit: 20264, nakitUsd: 200, kripto: 70150, cur: 'TL', hidden: false };
const favs = new Set(['btc', 'eth', 'sol']);
let kTab = 'up';
// Piyasalar ekranı durumu
const km = { quote: 'TL', pm: 'ask', sort: null, dir: 1 };
// Arama geçmişi (çift: kripto + kotasyon)
let recents = [{ k: 'btc', q: 'TL' }, { k: 'usdc', q: 'USD' }, { k: 'eth', q: 'TL' }];
const POPULAR = ['btc', 'eth', 'sol', 'doge', 'link', 'avax'];

const inCur = (nTL, cur = state.cur) => (cur === 'USD' ? nTL / USD_RATE : nTL);
const cashTL = () => state.nakit + state.nakitUsd * USD_RATE;

/* ---------- Çizim ---------- */
function renderTotal() {
  const total = cashTL() + state.kripto;
  const tp = portfolioPL();
  const plv = inCur(tp.pl);
  // Halkbank'taki Halk Kripto Hesabım kartıyla aynı yazı boyutları ve sıra
  $('#k-total').innerHTML = `
    <div class="acct-head">
      <svg class="coin-badge" width="17" height="17"><use href="#i-coinbadge"/></svg>
      <span class="name">Toplam Varlığım</span>
      <button class="eye-btn press" data-eye><svg width="17" height="13"><use href="#${state.hidden ? 'i-eye-off' : 'i-eye'}"/></svg></button>
      <button class="pill-orange press" data-cursheet>${state.cur} <svg width="13" height="8"><use href="#i-chev-down"/></svg></button>
    </div>
    <div class="lbl" style="margin-top:13px">Kripto ve Nakit Bakiye</div>
    <div class="amt-big amt">${money(inCur(total), state.cur)}</div>
    <div class="pl-row"><span class="lbl">Olası Kar / Zarar</span><b class="${chClass(tp.pct)} amt">%${fmt(Math.abs(tp.pct))}</b><b class="${chClass(tp.pl)} money-sm amt">${signed(plv).split(',')[0]}<small>,${fmt(plv).split(',')[1]} ${state.cur}</small></b></div>
    <hr>
    <button class="see-all press" data-ktabgo="k-assets">Varlıklarıma Git <svg width="6" height="10"><use href="#i-chev-right"/></svg></button>`;
  $('#device').classList.toggle('hidden-amt', state.hidden);
}

function renderList() {
  let list;
  if (kTab === 'up') list = COINS.filter((c) => c.ch > 0).sort((a, b) => b.ch - a.ch);
  else if (kTab === 'down') list = COINS.filter((c) => c.ch < 0).sort((a, b) => a.ch - b.ch);
  else list = COINS.filter((c) => favs.has(c.k));
  const cur = state.cur;
  $('#k-list').innerHTML = list.length ? list.map((c) => {
    const p = inCur(c.tl, cur);
    const price = cur === 'USD' ? fmt(p, p < 1 ? 4 : 2) : fmt(c.tl, c.d);
    return `
    <div class="coin-row tap" data-soon>
      ${coinIcon(c.k)}
      <div class="coin-name"><b>${c.n}</b><span>${c.c}/${cur}</span></div>
      <div class="coin-val"><b>${price} ${cur}</b><span class="${chClass(c.ch)}">%${fmt(Math.abs(c.ch))}${c.ch ? '<i class="k-arrow"></i>' : ''}</span></div>
    </div>`;
  }).join('') : '<div class="k-empty">Bu listede henüz varlık yok</div>';
  $$('#k-tabs button').forEach((b) => b.classList.toggle('on', b.dataset.ktab === kTab));
}

/* ---------- Fiyat ---------- */
const PM_LABEL = { last: 'Son Fiyat', bid: 'En İyi Alış Fiyatı', ask: 'En İyi Satış Fiyatı', avg: 'Ortalama Fiyat' };
// Alış/satış makası %0,05 (kripto detaydaki ile aynı)
function priceOf(c, quote, pm = 'last') {
  const f = pm === 'bid' ? 0.99975 : pm === 'ask' ? 1.00025 : 1;
  return (quote === 'USD' ? c.tl / USD_RATE : c.tl) * f;
}
function priceText(c, quote, pm) {
  const p = priceOf(c, quote, pm);
  if (quote === 'USD') return `${fmt(p, p < 1 ? 4 : 2)} USD`;
  return `${fmt(p, c.d)} TL`;
}
const nameOf = (c) => (c.n === 'UNISWAP' ? 'Uniswap' : c.n);
function pairRow(c, quote, pm, attrs = '') {
  return `
    <div class="coin-row tap" ${attrs}>
      ${coinIcon(c.k)}
      <div class="coin-name"><b>${nameOf(c)}</b><span>${c.c}/${quote}</span></div>
      <div class="coin-val"><b>${priceText(c, quote, pm)}</b><span class="${chClass(c.ch)}">%${fmt(Math.abs(c.ch))}${c.ch ? '<i class="k-arrow"></i>' : ''}</span></div>
    </div>`;
}

/* ---------- Piyasalar ---------- */
function renderMarkets() {
  const quote = km.quote === 'fav' ? state.cur : km.quote;
  let list = km.quote === 'fav' ? COINS.filter((c) => favs.has(c.k)) : [...COINS];
  if (km.sort) {
    const key = { name: (c) => nameOf(c).toLocaleLowerCase('tr-TR'), price: (c) => c.tl, ch: (c) => c.ch }[km.sort];
    list.sort((a, b) => (key(a) > key(b) ? 1 : key(a) < key(b) ? -1 : 0) * km.dir);
  }
  $('#km-list').innerHTML = list.length ? list.map((c) => pairRow(c, quote, km.pm, `data-kpair="${c.k}/${quote}"`)).join('') : '<div class="k-empty">Favori listeniz boş</div>';
  $$('#km-quotes [data-kq]').forEach((b) => b.classList.toggle('on', b.dataset.kq === km.quote));
  $('#km-price-lbl').textContent = PM_LABEL[km.pm];
  $$('#km-sort [data-ksort]').forEach((b) => {
    b.classList.toggle('on', b.dataset.ksort === km.sort);
    b.dataset.dir = b.dataset.ksort === km.sort ? (km.dir > 0 ? 'asc' : 'desc') : '';
  });
  $$('#filter-sheet [data-kpm]').forEach((b) => b.classList.toggle('on', b.dataset.kpm === km.pm));
}
function setSort(key) {
  // İlk dokunuş: isimde A→Z, fiyat ve değişimde büyükten küçüğe; ikinci dokunuş ters; üçüncü kapatır
  if (km.sort !== key) { km.sort = key; km.dir = key === 'name' ? 1 : -1; }
  else if (km.dir === (key === 'name' ? 1 : -1)) km.dir = -km.dir;
  else km.sort = null;
  renderMarkets();
}

/* ---------- Arama ---------- */
function renderSearch() {
  const q = $('#ks-q').value.trim().toLocaleLowerCase('tr-TR');
  $('#ks-idle').hidden = !!q;
  $('#ks-results').hidden = !q;
  if (q) {
    const hits = [];
    ['TL', 'USD'].forEach((quote) => COINS.forEach((c) => {
      const hay = `${nameOf(c)} ${c.c} ${c.c}/${quote}`.toLocaleLowerCase('tr-TR');
      if (hay.includes(q)) hits.push(pairRow(c, quote, 'last', `data-kpick="${c.k}/${quote}"`));
    }));
    $('#ks-list').innerHTML = hits.join('') || '<div class="k-empty">Sonuç bulunamadı</div>';
    return;
  }
  $('#ks-recent-wrap').hidden = !recents.length;
  $('#ks-recent').innerHTML = recents.map((r) => pairRow(COINS.find((c) => c.k === r.k), r.q, 'last', `data-kpick="${r.k}/${r.q}"`)).join('');
  $('#ks-pop').innerHTML = POPULAR.map((k) => {
    const c = COINS.find((x) => x.k === k);
    return `
      <button class="k-pop-card press" data-kpick="${k}/TL">
        ${coinIcon(k)}
        <b>${c.c} <small>/ TL</small></b><span>${nameOf(c)}</span>
        <strong>${priceText(c, 'TL', 'last')}</strong>
        <em class="${chClass(c.ch)}">%${fmt(Math.abs(c.ch))}${c.ch ? '<i class="k-arrow"></i>' : ''}</em>
      </button>`;
  }).join('');
}
function pickPair(pair) {
  const [k, q] = pair.split('/');
  recents = [{ k, q }, ...recents.filter((r) => !(r.k === k && r.q === q))].slice(0, 5);
  renderSearch();
  popScreen();
  openTrade(k, q, 'buy');
}

/* ---------- Varlıklarım ---------- */
// Daha önce işlem yapılmış ama şu an bakiyesi olmayan varlıklar ("Sıfır bakiyeli varlıkları gizle" kapatılınca görünür)
const ZERO = ['usdt', 'avax', 'doge'];
const ka = { hideZero: true, open: { cash: true, crypto: true } };
// Dağılım çubuğu renkleri: Halkbank mavileri + turuncu
const DIST_COLORS = ['#025193', '#0576b8', '#02a6e6', '#7fcdf2', '#f39200', '#c3cbd4'];

function distribution() {
  const parts = ASSETS.map((a) => ({ c: a.c, v: a.v }));
  parts.push({ c: 'Nakit', v: cashTL() });
  parts.sort((a, b) => b.v - a.v);
  const top = parts.slice(0, 5);
  const rest = parts.slice(5).reduce((t, p) => t + p.v, 0);
  if (rest) top.push({ c: 'Diğer', v: rest });
  const total = parts.reduce((t, p) => t + p.v, 0);
  return top.map((p, i) => ({ ...p, pct: (p.v / total) * 100, color: DIST_COLORS[i] }));
}

function groupHead(id, title, valTL) {
  const cur = state.cur;
  return `<button class="ka-head press" data-kagroup="${id}"><b>${title}</b><span class="amt">≈ ${fmt(inCur(valTL))} ${cur}</span><svg class="ka-chev" width="14" height="8"><use href="#i-chev-down"/></svg></button>`;
}

function renderAssets() {
  const cur = state.cur, total = cashTL() + state.kripto, tp = portfolioPL(), plv = inCur(tp.pl);
  const dist = distribution();
  $('#ka-total').innerHTML = `
    <div class="acct-head">
      <svg class="coin-badge" width="17" height="17"><use href="#i-coinbadge"/></svg>
      <span class="name">Toplam Varlığım</span>
      <button class="eye-btn press" data-eye><svg width="17" height="13"><use href="#${state.hidden ? 'i-eye-off' : 'i-eye'}"/></svg></button>
      <button class="pill-orange press" data-cursheet>${cur} <svg width="13" height="8"><use href="#i-chev-down"/></svg></button>
    </div>
    <div class="lbl" style="margin-top:13px">Kripto ve Nakit Bakiye</div>
    <div class="amt-big amt">${money(inCur(total), cur)}</div>
    <div class="pl-row"><span class="lbl">Olası Kar / Zarar</span><b class="${chClass(tp.pct)} amt">%${fmt(Math.abs(tp.pct))}</b><b class="${chClass(tp.pl)} money-sm amt">${signed(plv).split(',')[0]}<small>,${fmt(plv).split(',')[1]} ${cur}</small></b></div>
    <div class="ka-dist">${dist.map((d) => `<i style="flex:${d.pct};background:${d.color}"></i>`).join('')}</div>
    <div class="ka-legend">${dist.map((d) => `<span><i style="background:${d.color}"></i>${d.c} <b>%${fmt(d.pct, d.pct < 10 ? 1 : 0)}</b></span>`).join('')}</div>
`;

  const q = $('#ka-q').value.trim().toLocaleLowerCase('tr-TR');
  const match = (...t) => !q || t.join(' ').toLocaleLowerCase('tr-TR').includes(q);
  const open = (id) => !!q || ka.open[id];
  const pending = (label) => `<div class="ka-pending"><span>${label}</span><b class="amt">≈ 0,00 ${cur}</b></div>`;

  // Nakit
  const cash = [
    { k: 'try', n: 'Türk Lirası', c: 'TL', v: state.nakit, eq: `≈ ${fmt(state.nakit / USD_RATE)} USD` },
    { k: 'usd', n: 'Amerikan Doları', c: 'USD', v: state.nakitUsd, eq: `≈ ${fmt(state.nakitUsd * USD_RATE)} TL` },
  ].filter((r) => match(r.n, r.c));
  $('#ka-cash').classList.toggle('open', open('cash'));
  $('#ka-cash').hidden = !!q && !cash.length;
  $('#ka-cash').innerHTML = groupHead('cash', 'Nakit Varlıklarım', cashTL()) + `
    <div class="ka-body">${pending('Emirdeki Nakit Tutar')}${cash.map((r) => `
      <div class="coin-row tap" data-kdfiat="${r.c}">
        ${coinIcon(r.k)}
        <div class="coin-name"><b>${r.c}</b><span>${r.n}</span></div>
        <div class="coin-val"><b class="amt">${fmt(r.v)} ${r.c}</b><span class="flat amt">${r.eq}</span></div>
        <svg class="ka-go" width="7" height="12"><use href="#i-chev-right"/></svg>
      </div>`).join('')}</div>`;

  // Kripto
  const rows = [...ASSETS, ...ZERO.map((k) => { const c = COINS.find((x) => x.k === k); return { k, n: c.n, c: c.c, v: 0, pct: 0, dq: 2 }; })]
    .filter((a) => !(ka.hideZero && !a.v) && match(a.n, a.c));
  $('#ka-crypto').classList.toggle('open', open('crypto'));
  $('#ka-crypto').hidden = !!q && !rows.length;
  $('#ka-crypto').innerHTML = groupHead('crypto', 'Kripto Varlıklarım', state.kripto) + `
    <div class="ka-body">${pending('Emirdeki Kripto Tutar')}${rows.map((a) => {
      const calc = a.v ? assetCalc(a) : { qty: `0 ${a.c}`, pl: 0 };
      return `
      <div class="asset-row tap" data-kpair="${a.k}/${cur}">
        ${coinIcon(a.k)}
        <div class="coin-name">
          <b>${a.c}</b><span>${a.n}</span>
          ${a.v ? `<div class="plr"><em>Kar/Zarar</em><span class="${chClass(a.pct)}">%${fmt(Math.abs(a.pct))}</span></div>` : ''}
        </div>
        <div class="coin-val"><b class="amt">${calc.qty}</b><b class="amt ka-eq">≈ ${fmt(inCur(a.v))} ${cur}</b>${a.v ? `<span class="${chClass(a.pct)} amt">${signed(inCur(calc.pl))} ${cur}</span>` : ''}</div>
      </div>
      <div class="ka-trade"><button class="press" data-ktrade="${a.k}/${cur}/buy">Al</button><button class="press${a.v ? '' : ' off'}" data-ktrade="${a.k}/${cur}/sell"${a.v ? '' : ' disabled'}>Sat</button></div>`;
    }).join('') || '<div class="k-empty">Sonuç bulunamadı</div>'}</div>`;

  $('#ka-zero').classList.toggle('on', ka.hideZero);
  $('#ka-zero').setAttribute('aria-checked', ka.hideZero);
  $('#ka-empty')?.remove();
  if (q && !cash.length && !rows.length) $('#ka-crypto').insertAdjacentHTML('afterend', '<div class="k-empty" id="ka-empty">Sonuç bulunamadı</div>');
}

/* ---------- İşlemler ---------- */
// Demo işlemleri: g = kaç gün önce, h = saat. Sıfır bakiyeli USDT / AVAX / DOGE alınıp tamamen satılmış görünür.
// Tutarlar TL; alış/satışta komisyon %0,20. İptal edilenlerde why = iptal nedeni.
const TX_SEED = [
  { g: 1, h: '16:42', t: 'buy', k: 'sol', q: 0.35, p: 5060 },
  { g: 2, h: '10:15', t: 'sell', k: 'doge', q: 1500, p: 10.32 },
  { g: 3, h: '21:08', t: 'buy', k: 'xrp', q: 40, p: 61.5, st: 'cancel', why: 'Müşteri Talebi' },
  { g: 4, h: '09:30', t: 'dep', k: 'try', q: 15000 },
  { g: 6, h: '14:22', t: 'buy', k: 'btc', q: 0.0015, p: 3985000 },
  { g: 8, h: '11:47', t: 'sell', k: 'avax', q: 12, p: 452.1 },
  { g: 10, h: '19:05', t: 'buy', k: 'eth', q: 0.03, p: 115200 },
  { g: 12, h: '13:12', t: 'dep', k: 'usd', q: 200 },
  { g: 15, h: '16:40', t: 'sell', k: 'usdt', q: 300, p: 49.55 },
  { g: 18, h: '10:02', t: 'buy', k: 'usdc', q: 197.69, p: 49.66 },
  { g: 21, h: '15:33', t: 'wd', k: 'try', q: 5000 },
  { g: 25, h: '12:20', t: 'buy', k: 'doge', q: 1500, p: 9.6 },
  { g: 29, h: '20:11', t: 'buy', k: 'sol', q: 1.2, p: 5250 },
  { g: 34, h: '09:58', t: 'buy', k: 'avax', q: 12, p: 470 },
  { g: 40, h: '17:25', t: 'buy', k: 'btc', q: 0.002, p: 3850000, st: 'cancel', why: 'Fiyat Değişimi' },
  { g: 45, h: '11:11', t: 'buy', k: 'xrp', q: 108.65, p: 54 },
  { g: 52, h: '14:45', t: 'buy', k: 'usdt', q: 300, p: 48.9 },
  { g: 60, h: '10:30', t: 'dep', k: 'try', q: 50000 },
  { g: 66, h: '16:00', t: 'buy', k: 'eth', q: 0.1, p: 108000 },
  { g: 75, h: '13:37', t: 'buy', k: 'btc', q: 0.0046, p: 3520000 },
  { g: 88, h: '09:12', t: 'dep', k: 'try', q: 40000 },
  { g: 124, h: '15:50', t: 'dep', k: 'try', q: 25000 },
];
const TX_TYPE = {
  buy: { n: 'Alış', icon: 'i-plus' }, sell: { n: 'Satış', icon: 'i-minus' },
  dep: { n: 'Yatırma', icon: 'k-deposit' }, wd: { n: 'Çekme', icon: 'k-withdraw' },
};
const PERIODS = [['7', 'Son 7 Gün'], ['30', 'Son 30 Gün'], ['90', 'Son 3 Ay'], ['all', 'Tümü']];
const STATUSES = [['all', 'Tümü'], ['done', 'Gerçekleşti'], ['cancel', 'İptal']];
const TYPES = [['all', 'Tümü'], ...Object.entries(TX_TYPE).map(([k, v]) => [k, v.n])];
const kh = { type: 'all', period: '90', status: 'all', asset: 'all' };
let hfDraft = null;

function buildTx() {
  const now = new Date();
  const list = TX_SEED.map((x, i) => {
    const d = new Date(now); d.setDate(d.getDate() - x.g);
    const [hh, mm] = x.h.split(':'); d.setHours(+hh, +mm, (i * 17) % 60, 0);
    const cash = x.k === 'try' || x.k === 'usd';
    const total = cash ? x.q : x.q * x.p;
    const fee = cash || x.st === 'cancel' ? 0 : total * 0.002;
    return { ...x, id: `HK${String(48213907 - i * 3711)}`, ts: d.getTime(), total, fee, st: x.st || 'done' };
  });
  // Halkbank'tan gönderilen paralar Halk Kripto'da "Yatırma" olarak görünür
  (state.moves || []).filter((m) => m.ts && m.t === 'Halk Kripto Transferi').forEach((m) => {
    list.push({ t: 'dep', k: m.cur === 'USD' ? 'usd' : 'try', q: -m.a, total: -m.a, fee: 0, st: 'done', ts: m.ts, id: `HK${m.ref}`, live: true });
  });
  (state.ktx || []).forEach((x) => list.push({ ...x }));
  return list.sort((a, b) => b.ts - a.ts);
}
const isCash = (x) => x.k === 'try' || x.k === 'usd';
const assetCode = (k) => (k === 'try' ? 'TL' : k === 'usd' ? 'USD' : COINS.find((c) => c.k === k).c);
const assetName = (k) => (k === 'try' ? 'Türk Lirası' : k === 'usd' ? 'Amerikan Doları' : nameOf(COINS.find((c) => c.k === k)));
const qtyText = (x) => (isCash(x) ? fmt(x.q) : fmt(x.q, x.q < 1 ? 6 : x.q < 10000 ? 2 : 0)) + ' ' + assetCode(x.k);
// Al/Sat ekranından USD hesabıyla yapılan işlemler kendi para biriminde gösterilir
const txCur = (x) => (x.cur === 'USD' ? 'USD' : 'TL');
const inTx = (x, vTL) => (txCur(x) === 'USD' ? vTL / USD_RATE : vTL);
const txMoney = (x, vTL) => `${fmt(inTx(x, vTL))} ${txCur(x)}`;
const txPrice = (x) => { const v = inTx(x, x.p); return `${fmt(v, v < 1 ? 4 : v < 20 ? 3 : 2)} ${txCur(x)}`; };
function txTitle(x) { return isCash(x) ? `${assetCode(x.k)} ${TX_TYPE[x.t].n}` : `${assetCode(x.k)}/${txCur(x)}`; }
const signedQty = (x) => `${x.t === 'buy' || x.t === 'dep' ? '+' : '-'}${qtyText(x)}`;
const outAmt = (x) => (x.t === 'buy' ? txMoney(x, x.total + x.fee) : qtyText(x)); // hesaptan çıkan
const inAmt = (x) => (x.t === 'buy' ? qtyText(x) : txMoney(x, x.total - x.fee)); // hesaba geçen
const p2 = (n) => String(n).padStart(2, '0');
const dt = (ts) => { const d = new Date(ts); return `${p2(d.getDate())}.${p2(d.getMonth() + 1)}.${d.getFullYear()} - ${d.toTimeString().slice(0, 8)}`; };
function dayLabel(ts) {
  const d = new Date(ts), t = new Date(); t.setHours(0, 0, 0, 0);
  const diff = Math.round((t - new Date(d).setHours(0, 0, 0, 0)) / 864e5);
  if (diff === 0) return 'Bugün';
  if (diff === 1) return 'Dün';
  return `${d.getDate()} ${TR_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}
const TR_MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const stDot = (x) => `<em class="kh-dot ${x.st}">${x.st === 'cancel' ? 'İptal' : 'Gerçekleşti'}</em>`;
const typeTxt = (x) => `<b class="kh-type ${x.t}">${TX_TYPE[x.t].n}</b>`;

function filteredTx() {
  const from = kh.period === 'all' ? 0 : Date.now() - +kh.period * 864e5;
  return buildTx().filter((x) => x.ts >= from
    && (kh.type === 'all' || x.t === kh.type)
    && (kh.status === 'all' || x.st === kh.status)
    && (kh.asset === 'all' || x.k === kh.asset));
}
// Liste kaydı: referanstaki emir kartı düzeni (emir tipi yok)
let txAll = [];
function txItem(x) {
  const r = (a, b) => `<div class="kh-r"><span>${a}</span>${b}</div>`;
  const dash = '<b>—</b>', cancel = x.st === 'cancel';
  let rows = r('İşlem', typeTxt(x));
  if (isCash(x)) {
    rows += r(x.t === 'dep' ? 'Gönderen Hesap' : 'Alıcı Hesap', `<b>Halkbank Vadesiz ${assetCode(x.k)}</b>`)
      + r(x.t === 'dep' ? 'Hesaba Geçen Tutar' : 'Hesaptan Çıkan Tutar', `<b>${qtyText(x)}</b>`);
  } else {
    rows += r('İşlem Fiyatı', cancel ? dash : `<b>${txPrice(x)}</b>`)
      + r(x.t === 'buy' ? 'Hesaptan Çıkan Tutar' : 'Hesaba Geçen Tutar', cancel ? dash : `<b>${x.t === 'buy' ? outAmt(x) : inAmt(x)}</b>`);
  }
  if (isTrade(x)) { const pn = txPnl(x, txAll); rows += r(x.t === 'buy' ? 'Güncel K/Z' : 'Gerçekleşen K/Z', `<b class="${chClass(pn.v)}">${pctTxt(pn.pct)} <small>(${pnlTxt(pn.v)})</small></b>`); }
  rows += r('İşlem Durumu', stDot(x));
  return `
    <div class="kh-item tap${cancel ? ' cancel' : ''}" data-tx="${x.id}">
      ${coinIcon(x.k)}
      <div class="kh-body">
        <div class="kh-top"><b>${txTitle(x)}</b>${cancel ? '' : `<b class="amt ${x.t}">${signedQty(x)}</b>`}</div>
        ${rows}
        <small>İşlem Saati ${new Date(x.ts).toTimeString().slice(0, 8)}</small>
      </div>
      <svg class="kp-chev" width="7" height="12"><use href="#i-chev-right"/></svg>
    </div>`;
}
/* İşlem performansı: alışlarda işlemden bu yana fiyat değişimi (güncel K/Z),
   satışlarda aynı kriptonun ortalama alış fiyatına göre gerçekleşen K/Z */
const shortDay = (ts) => { const l = dayLabel(ts); if (l === 'Bugün' || l === 'Dün') return l; const d = new Date(ts); return `${d.getDate()} ${TR_MONTHS[d.getMonth()].slice(0, 3)}`; };
const isTrade = (x) => (x.t === 'buy' || x.t === 'sell') && x.st === 'done';
function avgBuy(k, all) {
  const b = all.filter((x) => x.k === k && x.t === 'buy' && x.st === 'done');
  const q = b.reduce((t, x) => t + x.q, 0);
  return q ? b.reduce((t, x) => t + x.q * x.p, 0) / q : null;
}
function txPnl(x, all) {
  const now = coinOf(x.k).tl;
  if (x.t === 'buy') { const v = x.q * (now - x.p) - x.fee; return { v, pct: (v / (x.total + x.fee)) * 100, now, kind: 'open' }; }
  const ab = avgBuy(x.k, all) || x.p / 1.04;
  const v = x.q * (x.p - ab) - x.fee;
  return { v, pct: (v / (x.q * ab)) * 100, now, ab, kind: 'real' };
}
const pnlTxt = (v, cur = 'TL') => `${v > 0 ? '+' : v < 0 ? '−' : ''}${fmt(Math.abs(v))} ${cur}`;
const pctTxt = (p) => `${p > 0 ? '+' : p < 0 ? '−' : ''}%${fmt(Math.abs(p))}`;
// İşlemden bugüne fiyat çizgisi (demo, işlem başına hep aynı)
function sparkline(x, w = 180, h = 44) {
  const r = seeded(x.id), n = 26, now = coinOf(x.k).tl, pts = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1), base = x.p + (now - x.p) * t;
    pts.push(i === 0 || i === n - 1 ? base : base * (1 + (r() - 0.5) * 0.02 * Math.sin(Math.PI * t)));
  }
  const lo = Math.min(...pts), hi = Math.max(...pts), sp = hi - lo || 1;
  const xy = pts.map((v, i) => [(i / (n - 1)) * w, h - 4 - ((v - lo) / sp) * (h - 8)]);
  const d = xy.map(([a, b], i) => `${i ? 'L' : 'M'}${a.toFixed(1)} ${b.toFixed(1)}`).join('');
  const up = x.t === 'buy' ? now >= x.p : now <= x.p;
  const col = up ? 'var(--green)' : 'var(--red)';
  return `<svg class="kx-spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><path d="${d}L${w} ${h}L0 ${h}Z" fill="${col}" opacity=".1"/><path d="${d}" fill="none" stroke="${col}" stroke-width="2" vector-effect="non-scaling-stroke"/><circle cx="${xy[0][0] + 3}" cy="${xy[0][1]}" r="3" fill="${col}"/></svg>`;
}
function recentCard(x, all) {
  const pn = txPnl(x, all), buy = x.t === 'buy';
  return `
    <button class="kh-rc kx-rc press" data-tx="${x.id}">
      <div class="kh-rc-top">${coinIcon(x.k)}<span><b>${txTitle(x)}</b>${typeTxt(x)}</span><small>${shortDay(x.ts)}</small></div>
      <div class="kx-rc-pnl ${chClass(pn.v)}"><strong>${pctTxt(pn.pct)}</strong><span class="amt">${pnlTxt(pn.v)}</span></div>
      <em>${buy ? 'Alıştan bu yana' : 'Gerçekleşen kâr / zarar'}</em>
      ${sparkline(x)}
      <div class="kx-rc-foot"><span>${buy ? 'Alış' : 'Satış'} <b>${fmt(x.p, priceDec(x.p))}</b></span><span>${buy ? 'Şimdi' : 'Ort. alış'} <b>${fmt(buy ? pn.now : pn.ab, priceDec(x.p))}</b></span></div>
      <small class="kx-qty">${signedQty(x)}</small>
    </button>`;
}
// Dönem grafiği: alış (yukarı, yeşil) ve satış (aşağı, kırmızı) hacmi
function volumeChart(list) {
  const P = kh.period, days = P === 'all' ? 126 : +P, nb = P === '7' ? 7 : P === '30' ? 10 : 13, span = (days / nb) * 864e5;
  const start = Date.now() - days * 864e5;
  const bins = Array.from({ length: nb }, () => ({ b: 0, s: 0 }));
  list.filter(isTrade).forEach((x) => { const i = Math.min(nb - 1, Math.floor((x.ts - start) / span)); if (i >= 0) bins[i][x.t === 'buy' ? 'b' : 's'] += x.total; });
  const mx = Math.max(1, ...bins.map((v) => Math.max(v.b, v.s))), W = 360, H = 86, mid = 52, bw = W / nb;
  const bars = bins.map((v, i) => {
    const x = i * bw + bw * 0.22, w = bw * 0.56, hb = (v.b / mx) * (mid - 6), hs = (v.s / mx) * (H - mid - 4);
    return `${v.b ? `<rect x="${x}" y="${mid - hb}" width="${w}" height="${hb}" rx="2.5" fill="var(--green)"/>` : `<rect x="${x}" y="${mid - 2}" width="${w}" height="2" rx="1" fill="#dfe4ea"/>`}${v.s ? `<rect x="${x}" y="${mid + 1}" width="${w}" height="${hs}" rx="2.5" fill="var(--red)" opacity=".85"/>` : ''}`;
  }).join('');
  return `<svg class="kx-chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><line x1="0" x2="${W}" y1="${mid}" y2="${mid}" stroke="#e3e5e8"/>${bars}</svg>`;
}
function renderHero() {
  const all = buildTx(), from = kh.period === 'all' ? 0 : Date.now() - +kh.period * 864e5;
  const inP = all.filter((x) => x.ts >= from), trades = inP.filter(isTrade);
  const pn = trades.map((x) => txPnl(x, all));
  const real = pn.filter((v) => v.kind === 'real').reduce((t, v) => t + v.v, 0);
  const open = pn.filter((v) => v.kind === 'open').reduce((t, v) => t + v.v, 0);
  const tot = real + open, base = trades.reduce((t, x) => t + x.total, 0) || 1;
  const vol = trades.reduce((t, x) => t + x.total, 0), win = pn.filter((v) => v.v > 0).length;
  const per = PERIODS.find((p) => p[0] === kh.period)[1];
  $('#kx-hero').innerHTML = `
    <div class="acct-head">
      <svg class="coin-badge" width="17" height="17"><use href="#i-coinbadge"/></svg>
      <span class="name">İşlem Performansım</span>
      <button class="pill-orange press" data-khsel="period">${per} <svg width="13" height="8"><use href="#i-chev-down"/></svg></button>
    </div>
    <div class="lbl" style="margin-top:13px">Toplam Kâr / Zarar</div>
    <div class="kx-big amt ${chClass(tot)}"><span>${pnlTxt(tot).replace(/,(\d\d) TL$/, '<small>,$1 TL</small>')}</span><em>${pctTxt((tot / base) * 100)}</em></div>
    <div class="kx-split">
      <div><span>Gerçekleşen</span><b class="amt ${chClass(real)}">${pnlTxt(real)}</b></div>
      <div><span>Açık İşlemler</span><b class="amt ${chClass(open)}">${pnlTxt(open)}</b></div>
    </div>
    ${volumeChart(inP)}
    <div class="kx-legend"><span><i class="g"></i>Alış</span><span><i class="r"></i>Satış</span><span class="sp"></span><span>İşlem hacmi</span></div>
    <hr>
    <div class="kx-stats">
      <div><b class="amt">${fmt(vol, 0)} <small>TL</small></b><span>İşlem Hacmi</span></div>
      <div><b>${trades.length}</b><span>Alış / Satış</span></div>
      <div><b>%${fmt(trades.length ? (win / trades.length) * 100 : 0, 0)}</b><span>Kârlı İşlem</span></div>
    </div>`;
  // Öne çıkanlar: en kârlı işlem ve en çok işlem yapılan kripto
  const best = trades.map((x, i) => [x, pn[i]]).sort((a, b) => b[1].pct - a[1].pct)[0];
  const cnt = {}; trades.forEach((x) => (cnt[x.k] = (cnt[x.k] || 0) + 1));
  const top = Object.entries(cnt).sort((a, b) => b[1] - a[1])[0];
  $('#kx-insights').innerHTML = best ? `
    <button class="card kx-ins press" data-tx="${best[0].id}"><span class="kx-ins-ic up"><svg width="16" height="16"><use href="#i-plus"/></svg></span><small>En Kârlı İşlem</small><b>${txTitle(best[0])} ${TX_TYPE[best[0].t].n}</b><em class="up">${pctTxt(best[1].pct)}</em></button>
    <button class="card kx-ins press" data-kpair="${top[0]}/TL">${coinIcon(top[0])}<small>En Çok İşlem</small><b>${nameOf(coinOf(top[0]))}</b><em>${top[1]} işlem</em></button>` : '';
  $('#kh-recent').innerHTML = all.filter(isTrade).slice(0, 6).map((x) => recentCard(x, all)).join('') || '<div class="k-empty">Henüz işleminiz yok</div>';
}
function renderHistory() {
  renderHero();
  $('#khs-type').textContent = TYPES.find((t) => t[0] === kh.type)[1];
  $('#khs-status').textContent = STATUSES.find((t) => t[0] === kh.status)[1];
  $$('.kh-sel').forEach((b) => b.classList.toggle('on', kh[b.dataset.khsel] !== 'all'));

  // Detaylı arama etiketleri (tarih, varlık)
  const tags = [];
  if (kh.period !== '90') tags.push(['period', PERIODS.find((p) => p[0] === kh.period)[1]]);
  if (kh.asset !== 'all') tags.push(['asset', assetCode(kh.asset)]);
  $('#kh-active').innerHTML = tags.map(([k, n]) => `<button class="kh-tag press" data-khclear="${k}">${n}<svg width="10" height="10" viewBox="0 0 18 18"><path d="m3 3 12 12M15 3 3 15" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg></button>`).join('');
  $('#kh-badge').hidden = !tags.length;
  $('#kh-badge').textContent = tags.length;

  txAll = buildTx();
  const list = filteredTx();
  if (!list.length) {
    $('#kh-list').innerHTML = `<div class="kh-empty"><span><svg width="34" height="34"><use href="#k-hist"/></svg></span><b>İşlem bulunamadı</b><p>Seçtiğiniz filtrelere uygun işlem yok.</p><button class="see-all press" data-khreset>Filtreleri Temizle</button></div>`;
    return;
  }
  const groups = [];
  list.forEach((x) => { const l = dayLabel(x.ts); (groups.at(-1)?.l === l ? groups.at(-1).items : (groups.push({ l, items: [] }), groups.at(-1).items)).push(x); });
  $('#kh-list').innerHTML = groups.map((g) => `<div class="kh-day">${g.l}</div><div class="list-card kh-card">${g.items.map(txItem).join('')}</div>`).join('');
}
function openSel(key) {
  $('#sel-title').textContent = { type: 'İşlem', status: 'İşlem Durumu', period: 'Dönem' }[key];
  $('#sel-list').innerHTML = ({ type: TYPES, status: STATUSES, period: PERIODS })[key].map(([k, n]) => `<button class="kh-opt press${kh[key] === k ? ' on' : ''}" data-ksel="${key}:${k}"><span>${n}</span><svg width="18" height="14" viewBox="0 0 18 14"><path d="m2 7 5 5L16 2" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></button>`).join('');
  openSheet('sel-sheet');
}
function renderHfSheet() {
  const d = hfDraft;
  const chips = (arr, key) => arr.map(([k, n]) => `<button class="kh-chip press${d[key] === k ? ' on' : ''}" data-hf="${key}:${k}">${n}</button>`).join('');
  $('#hf-period').innerHTML = chips(PERIODS, 'period');
  const assets = [...new Set(buildTx().map((x) => x.k))];
  $('#hf-asset').innerHTML = chips([['all', 'Tümü'], ...assets.map((k) => [k, assetCode(k)])], 'asset');
}
// İşlem detayı: referanstaki gibi özet + "Daha Fazla Göster" + gerçekleşme / iptal bilgisi
let txOpen = null;
function openTx(id) {
  txOpen = buildTx().find((t) => t.id === id);
  renderTxDetail(false);
  if (!stack.includes('k-txd')) pushScreen('k-txd');
  $('#k-txd .scroll').scrollTop = 0;
}
function renderTxDetail(more) {
  const x = txOpen, cash = isCash(x), cancel = x.st === 'cancel';
  const r = (a, b) => `<div class="kh-r"><span>${a}</span><b>${b}</b></div>`;
  $('#txd-title').textContent = txTitle(x);
  let main = r('İşlem Tarihi', dt(x.ts))
    + `<div class="kh-r"><span>İşlem Numarası</span><button class="kd-copy press" data-kcopytx="${x.id}"><b>${x.id}</b><svg width="18" height="18"><use href="#i-copy"/></svg></button></div>`
    + `<div class="kh-r"><span>İşlem Türü</span>${typeTxt(x)}</div>`;
  let extra = '', second = '';
  if (cash) {
    main += r('Varlık', `${assetCode(x.k)} ${assetName(x.k)}`) + r('Tutar', qtyText(x));
    extra = r(x.t === 'dep' ? 'Gönderen Hesap' : 'Alıcı Hesap', `Halkbank Vadesiz ${assetCode(x.k)} Hesabı`) + r('İşlem Ücreti', `0,00 ${assetCode(x.k)}`)
      + r(x.t === 'dep' ? 'Hesaba Geçen Tutar' : 'Hesaptan Çıkan Tutar', qtyText(x));
    second = `<div class="section-title">GERÇEKLEŞME BİLGİSİ</div><div class="card kh-dcard">${r(x.t === 'dep' ? 'Hesaba Geçiş Tarihi' : 'Gönderim Tarihi', dt(x.ts + 2000))}${r(x.t === 'dep' ? 'Hesaba Geçen Tutar' : 'Gönderilen Tutar', qtyText(x))}</div>`;
  } else {
    main += r('İşlem Değeri', x.t === 'buy' ? txMoney(x, x.total) : qtyText(x));
    if (!cancel) main += r('Gerçekleşme Oranı', '%100');
    extra = r('İşlem Fiyatı', cancel ? '—' : txPrice(x)) + r('Gerçekleşen Tutar', cancel ? '—' : txMoney(x, x.total))
      + r('Komisyon Tutarı (%0,20)', cancel ? '—' : txMoney(x, x.fee)) + r('Hesaptan Çıkan Tutar', cancel ? '—' : outAmt(x)) + r('Hesaba Geçen Tutar', cancel ? '—' : inAmt(x));
    second = cancel
      ? `<div class="section-title">İPTAL BİLGİSİ</div><div class="card kh-dcard">${r('İptal Tarihi', dt(x.ts + 12000))}${r('İptal Edilen Tutar', x.t === 'buy' ? txMoney(x, x.total) : qtyText(x))}${r('İptal Nedeni', x.why || 'Müşteri Talebi')}</div>`
      : `<div class="section-title">GERÇEKLEŞME BİLGİSİ</div><div class="card kh-dcard">${r('Gerçekleşme Tarihi', dt(x.ts + 1000))}${r('Gerçekleşme Fiyatı', txPrice(x))}${r('Hesaptan Çıkan Tutar', outAmt(x))}${r('Hesaba Geçen Tutar', inAmt(x))}${r('Komisyon Tutarı', txMoney(x, x.fee))}</div>`;
  }
  main += `<div class="kh-r"><span>İşlem Durumu</span>${stDot(x)}</div>`;
  $('#txd-body').innerHTML = `
    <div class="card kh-dcard kh-dmain">
      <div class="kh-dhead">${coinIcon(x.k)}<div><b>${txTitle(x)}</b><span>${assetName(x.k)}</span></div>${cancel ? '' : `<strong class="amt ${x.t}">${signedQty(x)}</strong>`}</div>
      ${main}
      <div class="kh-more${more ? ' open' : ''}">${extra}</div>
      <button class="kh-morebtn press" data-ktxmore>${more ? 'Daha Az Göster' : 'Daha Fazla Göster'} <svg width="14" height="8"><use href="#i-chev-down"/></svg></button>
    </div>
    ${second}
    <div class="hf-btns kh-dbtns">
      <button class="btn-secondary press" data-txshare>Dekont Paylaş</button>
      ${cash ? '' : `<button class="btn-primary press" data-kpair="${x.k}/${txCur(x)}">Tekrar İşlem Yap</button>`}
    </div>`;
  $('#txd-body').dataset.more = more ? '1' : '';
}

/* ---------- Profil ---------- */
// Limitler: kullanılan tutar demo; günlük alım kullanımı geçmişteki bugünkü/dünkü alımlarla uyumlu
const LIMITS = {
  d: [['Kripto Alım', 1774.54, 250000], ['Kripto Satım', 0, 250000], ['TL Yatırma', 0, 500000], ['TL Çekme', 0, 100000], ['Kripto Transfer (Gönderme)', 0, 50000]],
  m: [['Kripto Alım', 23128.04, 2500000], ['Kripto Satım', 35770, 2500000], ['TL Yatırma', 15000, 5000000], ['TL Çekme', 5000, 1000000], ['Kripto Transfer (Gönderme)', 0, 500000]],
};
let limTab = 'd';
function renderLimits() {
  $$('#kp-ltabs [data-kplim]').forEach((b) => b.classList.toggle('on', b.dataset.kplim === limTab));
  $('#kp-limits').innerHTML = LIMITS[limTab].map(([n, used, max]) => {
    const pct = Math.max((used / max) * 100, used ? 1.5 : 0);
    return `
    <div class="card kp-lim">
      <div class="kp-lim-head"><b>${n}</b><span>${limTab === 'd' ? 'Günlük' : 'Aylık'} limit <em>${fmt(max, 0)} TL</em></span></div>
      <div class="kp-bar"><i style="width:${pct}%"></i></div>
      <div class="kp-lim-foot"><span>Kullanılan <b>${fmt(used)} TL</b></span><span>Kalan <b>${fmt(max - used)} TL</b></span></div>
    </div>`;
  }).join('');
}
const prefs = { lang: 'tr', theme: 'light' };
function renderProfile() {
  $('#kp-cur').textContent = state.cur;
  $$('#lang-sheet [data-klang]').forEach((b) => b.classList.toggle('on', b.dataset.klang === prefs.lang));
  $$('#theme-sheet [data-ktheme]').forEach((b) => b.classList.toggle('on', b.dataset.ktheme === prefs.theme));
  const total = cashTL() + state.kripto;
  $('#kp-close-txt').innerHTML = `Hesabınızı kapatmadan önce kripto varlıklarınızı satmanız ve nakit bakiyenizi Halkbank hesabınıza aktarmanız gerekir. Güncel toplam varlığınız: <b>${fmt(inCur(total))} ${state.cur}</b>`;
}

/* ---------- Kripto Al/Sat (Halkbank döviz alış/satış akışıyla aynı) ---------- */
// Piyasa emri; komisyon %0,20. Alışta en iyi satış fiyatı, satışta en iyi alış fiyatı kullanılır.
const FEE = 0.002;
const tr = { k: 'btc', cur: 'TL', side: 'buy', qty: 0, amt: 0, drift: 1, upd: new Date() };
const coinOf = (k) => COINS.find((c) => c.k === k);
const holding = (k) => ASSETS.find((a) => a.k === k && a.v > 0.005);
const qtyDec = (c) => (c.tl >= 100000 ? 8 : c.tl >= 1000 ? 6 : c.tl >= 10 ? 4 : 2);
const cashOf = (cur) => (cur === 'USD' ? state.nakitUsd : state.nakit);
const priceDec = (p) => (p < 1 ? 4 : p < 20 ? 3 : 2);
function tradePrice() { return priceOf(coinOf(tr.k), tr.cur, tr.side === 'buy' ? 'ask' : 'bid') * tr.drift; }
function holdQty(k) { const a = holding(k); return a ? a.v / coinOf(k).tl : 0; }
function parseNum(v) {
  v = String(v).trim();
  if (!v) return 0;
  v = v.includes(',') ? v.replace(/\./g, '').replace(',', '.') : v;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}
const timeStr = (d) => d.toTimeString().slice(0, 8);

function openTrade(k = 'btc', cur = state.cur, side = 'buy') {
  Object.assign(tr, { k, cur: cur === 'USD' ? 'USD' : 'TL', side: side === 'sell' && holding(k) ? 'sell' : 'buy', qty: 0, amt: 0, drift: 1, upd: new Date() });
  if (side === 'sell' && !holding(k)) toast(`${coinOf(k).c} varlığınız bulunmuyor, Alış ekranı açıldı`);
  $('#kt-qty').value = ''; $('#kt-amt').value = '';
  renderTrade();
  if (!stack.includes('k-trade')) pushScreen('k-trade');
}

// Kartlar Halkbank döviz alış/satış ekranındaki hesap kartlarıyla aynı düzende: ad, hesap no, iki sütun bakiye
const ACCT_NO = { TL: 'HK 48215903 - 01', USD: 'HK 48215903 - 02' };
function balCol(label, html) { return `<div><span>${label}</span><b class="amt">${html}</b></div>`; }
function bigQty(q, dec, unit) { const [i, f] = fmt(q, dec).split(','); return `${i}<small>${f ? `,${f}` : ''} ${unit}</small>`; }
function acctCard(cur, attrs) {
  return `
    <button class="card kt-acct press" ${attrs}>
      <div class="kt-acct-head"><span class="star"><svg width="10" height="10"><use href="#i-star"/></svg></span><b>Halk Kripto ${cur} Hesabı</b><svg class="kt-acct-chev" width="14" height="8"><use href="#i-chev-down"/></svg></div>
      <div class="kt-acct-no">${ACCT_NO[cur]} · Nakit Varlık</div>
      <div class="kt-cols">${balCol('Kullanılabilir Bakiye', money(cashOf(cur), cur))}${balCol('Emirdeki Tutar', money(0, cur))}</div>
    </button>`;
}
function assetCard(k, sell) {
  const c = coinOf(k), q = holdQty(k);
  if (!q) {
    return `<div class="card kt-note"><span class="kt-note-ic"><svg width="22" height="22"><use href="#i-info"/></svg></span><span><b>Halk Kripto ${c.c} Hesabı</b><small>${c.c} hesabınız işlem sonunda açılacaktır.</small></span></div>`;
  }
  return `
    <div class="card kt-acct">
      <div class="kt-acct-head">${coinIcon(k)}<b>Halk Kripto ${c.c} Hesabı</b></div>
      <div class="kt-acct-no">${nameOf(c)}</div>
      <div class="kt-cols">${balCol(sell ? 'Satılabilir Miktar' : 'Mevcut Miktar', bigQty(q, qtyDec(c), c.c))}${balCol(`${tr.cur} Karşılığı`, money(inCur(q * c.tl, tr.cur), tr.cur))}</div>
    </div>`;
}

function renderTrade() {
  const c = coinOf(tr.k), buy = tr.side === 'buy', p = tradePrice();
  $$('#kt-seg [data-kside]').forEach((b) => b.classList.toggle('on', b.dataset.kside === tr.side));
  $('#kt-pick').innerHTML = `${coinIcon(tr.k)}<span><small>Kripto Tipi</small><b>${nameOf(c)}</b></span><svg width="14" height="8"><use href="#i-chev-down"/></svg>`;
  $('#kt-price').innerHTML = `<b>${nameOf(c)}</b><b>${fmt(p, priceDec(p))} ${tr.cur}</b>`;
  $('#kt-price').title = `Son güncelleme: ${timeStr(tr.upd)}`;
  $('#kt-t1').textContent = buy ? 'PARANIN ÇEKİLECEĞİ HESAP' : 'KRİPTONUN ÇEKİLECEĞİ HESAP';
  $('#kt-t2').textContent = buy ? 'KRİPTONUN AKTARILACAĞI HESAP' : 'PARANIN AKTARILACAĞI HESAP';
  $('#kt-t3').textContent = buy ? 'ALIŞ BİLGİLERİ' : 'SATIŞ BİLGİLERİ';
  $('#kt-from').innerHTML = buy ? acctCard(tr.cur, 'data-ksheet="acct-sheet"') : assetCard(tr.k, true);
  $('#kt-to').innerHTML = buy ? assetCard(tr.k, false) : acctCard(tr.cur, 'data-ksheet="acct-sheet"');
  $('#kt-qty-u').textContent = c.c; $('#kt-amt-u').textContent = tr.cur;
  $('#kt-go').textContent = buy ? 'Al' : 'Sat';
  $('#kt-go').classList.toggle('kt-sell', !buy);
  renderCalc();
}
function tradeTotals() {
  const fee = tr.amt * FEE;
  const total = tr.side === 'buy' ? tr.amt + fee : tr.amt - fee;
  return { fee, total };
}
function tradeError() {
  if (!tr.amt) return '';
  const c = coinOf(tr.k);
  const minTL = 10, min = tr.cur === 'USD' ? minTL / USD_RATE : minTL;
  if (tr.amt < min) return `En düşük işlem tutarı ${fmt(min)} ${tr.cur}`;
  if (tr.side === 'buy' && tradeTotals().total > cashOf(tr.cur) + 1e-9) return `Yetersiz bakiye. Kullanılabilir: ${fmt(cashOf(tr.cur))} ${tr.cur}`;
  if (tr.side === 'sell' && tr.qty > holdQty(tr.k) * 1.000001) return `Yetersiz varlık. Satılabilir: ${fmt(holdQty(tr.k), qtyDec(c))} ${c.c}`;
  return '';
}
function renderCalc() {
  const { fee, total } = tradeTotals(), err = tradeError(), cur = tr.cur;
  // Döviz ekranındaki gibi sade: yalnızca tutar girilince tek satır özet ya da hata
  $('#kt-calc').innerHTML = !tr.amt ? `<button class="see-all kt-all press" data-kpct="100">${tr.side === 'buy' ? 'Tüm bakiyeyi kullan' : 'Tümünü sat'} <svg width="6" height="10"><use href="#i-chev-right"/></svg></button>` : err ? `<div class="kt-err">${err}</div>`
    : `<div class="kt-sumline">Komisyon (%0,20) <b>${fmt(fee)} ${cur}</b><span>·</span>${tr.side === 'buy' ? 'Toplam' : 'Hesaba Geçecek'} <b>${fmt(total)} ${cur}</b></div>`;
  $('#kt-go').disabled = !tr.amt || !!err;
}
function onQty() {
  tr.qty = parseNum($('#kt-qty').value); tr.amt = tr.qty * tradePrice();
  $('#kt-amt').value = tr.qty ? fmt(tr.amt) : '';
  renderCalc();
}
function onAmt() {
  const c = coinOf(tr.k);
  tr.amt = parseNum($('#kt-amt').value); tr.qty = tr.amt / tradePrice();
  $('#kt-qty').value = tr.amt ? fmt(tr.qty, qtyDec(c)) : '';
  renderCalc();
}
function setPct(pct) {
  const c = coinOf(tr.k), p = tradePrice();
  if (tr.side === 'buy') {
    tr.amt = Math.floor((cashOf(tr.cur) / (1 + FEE)) * pct) / 100;
    tr.qty = tr.amt / p;
  } else {
    const dec = 10 ** qtyDec(c);
    tr.qty = Math.floor(holdQty(tr.k) * pct / 100 * dec) / dec;
    tr.amt = tr.qty * p;
  }
  $('#kt-qty').value = tr.qty ? fmt(tr.qty, qtyDec(c)) : '';
  $('#kt-amt').value = tr.amt ? fmt(tr.amt) : '';
  renderCalc();
}
function refreshPrice(quiet) {
  // Demo: fiyat her yenilemede çok küçük oynar
  tr.drift = 1 + (Math.random() - 0.5) * 0.0012;
  tr.upd = new Date();
  if (tr.qty) tr.amt = tr.qty * tradePrice();
  if ($('#kt-amt').value) $('#kt-amt').value = fmt(tr.amt);
  renderTrade();
  if (!quiet) toast('Fiyatlar güncellendi');
}

// Coin seçimi: satışta yalnızca sahip olunan kriptolar
function renderCoinSheet() {
  const q = $('#cs-q').value.trim().toLocaleLowerCase('tr-TR');
  const sell = tr.side === 'sell';
  $('#cs-title').textContent = sell ? 'Satılacak Kripto' : 'Kripto Tipi Seçimi';
  const list = COINS.filter((c) => (!sell || holding(c.k)) && (!q || `${nameOf(c)} ${c.c}`.toLocaleLowerCase('tr-TR').includes(q)));
  $('#cs-list').innerHTML = list.map((c) => {
    const h = holdQty(c.k);
    return `
    <button class="opt press${c.k === tr.k ? ' on' : ''}" data-kcoin="${c.k}">
      <i class="radio"></i>${coinIcon(c.k)}
      <span class="lbl2"><b>${c.c}</b><span>${nameOf(c)}</span></span>
      <span class="cs-r"><b>${priceText(c, tr.cur, sell ? 'bid' : 'ask')}</b>${h ? `<small>${fmt(h, qtyDec(c))} ${c.c}</small>` : ''}</span>
    </button>`;
  }).join('') || '<div class="k-empty">Sonuç bulunamadı</div>';
}
function renderAcctSheet() {
  $('#as-title').textContent = tr.side === 'buy' ? 'Paranın Çekileceği Hesap' : 'Paranın Aktarılacağı Hesap';
  $('#as-list').innerHTML = ['TL', 'USD'].map((cur) => `
    <button class="opt press${cur === tr.cur ? ' on' : ''}" data-kacct="${cur}">
      ${coinIcon(cur === 'USD' ? 'usd' : 'try')}
      <span class="lbl2"><b>Halk Kripto ${cur} Hesabı</b><span class="bal">${money(cashOf(cur), cur)}</span></span><i class="radio"></i>
    </button>`).join('');
}

function renderSummary() {
  const c = coinOf(tr.k), buy = tr.side === 'buy', p = tradePrice(), cur = tr.cur;
  const { fee, total } = tradeTotals();
  const has = !!holdQty(tr.k);
  const row = (a, b) => `<div class="sum-row"><span>${a}</span><b>${b}</b></div>`;
  $('#kts-title').textContent = buy ? 'ALIŞ BİLGİLERİ' : 'SATIŞ BİLGİLERİ';
  // Alışta tutar, satışta miktar sabittir; diğeri işlem anındaki fiyata göre küçük farklılık gösterebilir (≈)
  $('#kts-card').innerHTML = row('İşlem Türü', `Kripto ${buy ? 'Alış' : 'Satış'}`)
    + (buy ? row('Paranın Çekileceği Hesap', `Halk Kripto ${cur} Hesabı`) + row('Kriptonun Aktarılacağı Hesap', has ? `Halk Kripto ${c.c} Hesabı` : 'İşlem sonunda açılacaktır.')
      : row('Kriptonun Çekileceği Hesap', `Halk Kripto ${c.c} Hesabı`) + row('Paranın Aktarılacağı Hesap', `Halk Kripto ${cur} Hesabı`))
    + row(`${c.c} ${buy ? 'Alış' : 'Satış'} Fiyatı`, `${fmt(p, priceDec(p))} ${cur}`)
    + (buy ? row('Alınacak Kripto Miktarı', `≈ ${fmt(tr.qty, qtyDec(c))} ${c.c}`) + row(`${cur} Tutarı`, `${fmt(tr.amt)} ${cur}`)
      : row('Satılacak Kripto Miktarı', `${fmt(tr.qty, qtyDec(c))} ${c.c}`) + row(`${cur} Karşılığı`, `≈ ${fmt(tr.amt)} ${cur}`))
    + row('Komisyon (%0,20)', `${buy ? '' : '≈ '}${fmt(fee)} ${cur}`)
    + row(buy ? 'Toplam İşlem Tutarı' : 'Hesabınıza Geçecek Tutar', `${buy ? '' : '≈ '}${fmt(total)} ${cur}`);
}
function goSummary() {
  if ($('#kt-go').disabled) return;
  $$('input').forEach((i) => i.blur());
  renderSummary();
  pushScreen('k-tsum');
}

// Onay: bakiyeler, varlıklar, geçmiş ve limitler güncellenir (Halkbank ile ortak veri)
function confirmTrade() {
  const btn = $('#kt-confirm');
  if (btn.dataset.loading) return;
  btn.dataset.loading = '1'; btn.textContent = 'İşleniyor…';
  setTimeout(() => {
    const c = coinOf(tr.k), buy = tr.side === 'buy', cur = tr.cur, shown = tradePrice();
    // İşlem onay anındaki fiyattan gerçekleşir (demo: gösterilen fiyattan ±%0,2)
    const p = shown * (1 + (Math.random() - 0.5) * 0.004);
    if (buy) tr.qty = tr.amt / p; else tr.amt = tr.qty * p;
    const { fee, total } = tradeTotals();
    const valTL = tr.qty * c.tl; // varlığın güncel TL değeri
    if (buy) {
      if (cur === 'USD') state.nakitUsd -= total; else state.nakit -= total;
      const costTL = cur === 'USD' ? total * USD_RATE : total;
      const a = ASSETS.find((x) => x.k === tr.k);
      if (a && a.v > 0.005) {
        const cost = a.v / (1 + a.pct / 100) + costTL;
        a.v += valTL; a.pct = (a.v / cost - 1) * 100;
      } else if (a) { a.v = valTL; a.pct = (valTL / costTL - 1) * 100; }
      else ASSETS.push({ k: c.k, n: nameOf(c), c: c.c, v: valTL, pct: (valTL / costTL - 1) * 100, dq: qtyDec(c) });
    } else {
      if (cur === 'USD') state.nakitUsd += total; else state.nakit += total;
      const a = ASSETS.find((x) => x.k === tr.k);
      // Tamamına yakını satıldıysa (ondalık yuvarlama artığı) varlık sıfırlanır
      a.v = tr.qty >= holdQty(tr.k) * 0.9995 ? 0 : Math.max(0, a.v - valTL);
      if (a.v < 0.005) { a.v = 0; ASSETS.splice(ASSETS.indexOf(a), 1); if (!ZERO.includes(a.k)) ZERO.unshift(a.k); }
    }
    state.kripto = ASSETS.reduce((t, a) => t + a.v, 0);
    const id = `HK${48213907 + Math.floor(Math.random() * 90000) + 1000}`;
    state.ktx = state.ktx || [];
    const amtTL = cur === 'USD' ? tr.amt * USD_RATE : tr.amt;
    state.ktx.push({ t: tr.side, k: tr.k, o: 'Piyasa', q: tr.qty, p: cur === 'USD' ? p * USD_RATE : p, total: amtTL, fee: cur === 'USD' ? fee * USD_RATE : fee, st: 'done', ts: Date.now(), id, cur });
    LIMITS.d[buy ? 0 : 1][1] += amtTL; LIMITS.m[buy ? 0 : 1][1] += amtTL;
    tr.lastId = id;
    $('#ktr-text').innerHTML = buy
      ? `Halk Kripto ${cur} Hesabınızdan <b>${fmt(total)} ${cur}</b> karşılığında <b>${fmt(tr.qty, qtyDec(c))} ${c.c}</b> alınmıştır.`
      : `<b>${fmt(tr.qty, qtyDec(c))} ${c.c}</b> satılarak Halk Kripto ${cur} Hesabınıza <b>${fmt(total)} ${cur}</b> aktarılmıştır.`;
    $('#ktr-text').innerHTML += `<span class="ktr-fill">İşlem fiyatı: <b>${fmt(p, priceDec(p))} ${cur}</b></span>`;
    $('#ktr-ref').textContent = id;
    renderTotal(); renderList(); renderAssets();
    pushScreen('k-tres');
    const ck = $('#kt-check'); ck.classList.remove('pop'); void ck.offsetWidth; ck.classList.add('pop');
    btn.textContent = 'Onayla'; delete btn.dataset.loading;
  }, 900);
}

/* ---------- Yatır ---------- */
// Ağlar: [ad, adres biçimi, minimum (adet), tahmini onay süresi]. Belirtilmeyen tokenlar Ethereum (ERC-20) ağındadır.
const NETS = {
  btc: [['Bitcoin', 'btc', 0.0001, '~30 dk (3 onay)']],
  eth: [['Ethereum (ERC-20)', 'evm', 0.002, '~5 dk (12 onay)']],
  usdt: [['Ethereum (ERC-20)', 'evm', 10, '~5 dk (12 onay)'], ['Tron (TRC-20)', 'trx', 5, '~2 dk (20 onay)'], ['Avalanche C-Chain', 'evm', 5, '~1 dk']],
  usdc: [['Ethereum (ERC-20)', 'evm', 10, '~5 dk (12 onay)'], ['Solana (SPL)', 'sol', 5, '~1 dk'], ['Avalanche C-Chain', 'evm', 5, '~1 dk']],
  xrp: [['XRP Ledger', 'xrp', 10, '~1 dk']],
  sol: [['Solana', 'sol', 0.05, '~1 dk']],
  ada: [['Cardano', 'ada', 10, '~10 dk (15 onay)']],
  doge: [['Dogecoin', 'doge', 20, '~20 dk (20 onay)']],
  ltc: [['Litecoin', 'ltc', 0.01, '~15 dk (6 onay)']],
  avax: [['Avalanche C-Chain', 'evm', 0.1, '~1 dk']],
  dot: [['Polkadot', 'dot', 2, '~2 dk']],
  pol: [['Polygon PoS', 'evm', 5, '~5 dk (128 onay)'], ['Ethereum (ERC-20)', 'evm', 10, '~5 dk (12 onay)']],
  inj: [['Injective', 'inj', 0.5, '~1 dk']],
};
const CUSTOMER_NO = '48215903';
const FIAT = {
  TL: { iban: 'TR12 0001 2009 4520 0058 0012 34', lim: [500000, 5000000] },
  USD: { iban: 'TR85 0001 2009 4520 0058 0012 41', lim: [250000, 1000000] },
};
const PAYEE = 'Halk Kripto Varlık Alım Satım Platformu A.Ş.';
const dep = { k: null, net: 0, fiat: null, next: null };

function netsOf(k) {
  if (NETS[k]) return NETS[k];
  // ERC-20 tokenlar: minimum ≈ 15 USD, okunaklı bir sayıya yuvarlanır
  const usd = coinOf(k).tl / USD_RATE, raw = 15 / usd, mag = 10 ** Math.floor(Math.log10(raw));
  return [['Ethereum (ERC-20)', 'evm', Math.ceil(raw / mag) * mag, '~5 dk (12 onay)']];
}
// Demo adresleri: her kripto + ağ için hep aynı, gerçekçi biçimde ama gerçek olmayan adres
function seeded(str) {
  let h = 2166136261;
  for (const ch of str) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
}
function fakeAddr(k, fmtKey) {
  const r = seeded(`${k}:${fmtKey}:halk`);
  const pick = (abc, n) => Array.from({ length: n }, () => abc[Math.floor(r() * abc.length)]).join('');
  const HEX = '0123456789abcdef', B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz', B32 = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';
  return {
    evm: () => `0x${pick(HEX, 40)}`, btc: () => `bc1q${pick(B32, 38)}`, trx: () => `T${pick(B58, 33)}`,
    sol: () => pick(B58, 44), xrp: () => `r${pick(B58, 33)}`, ada: () => `addr1q${pick(B32, 52)}`,
    doge: () => `D${pick(B58, 33)}`, ltc: () => `ltc1q${pick(B32, 38)}`, dot: () => `1${pick(B58, 46)}`, inj: () => `inj1${pick(B32, 38)}`,
  }[fmtKey]();
}
const xrpTag = () => String(100000000 + Math.floor(seeded('tag')() * 899999999));

function renderDepList() {
  $('#kd-fiat').innerHTML = ['TL', 'USD'].map((cur) => `
    <button class="kd-row press" data-kdfiat="${cur}">${coinIcon(cur === 'USD' ? 'usd' : 'try')}<span><b>${cur}</b> ${cur === 'USD' ? 'Amerikan Doları' : 'Türk Lirası'}</span><svg class="kp-chev" width="7" height="12"><use href="#i-chev-right"/></svg></button>`).join('');
  const q = $('#kd-q').value.trim().toLocaleLowerCase('tr-TR');
  const list = COINS.filter((c) => !q || `${nameOf(c)} ${c.c}`.toLocaleLowerCase('tr-TR').includes(q));
  $('#kd-list').innerHTML = list.map((c) => `
    <button class="kd-row press" data-kdcoin="${c.k}">${coinIcon(c.k)}<span><b>${c.c}</b> ${nameOf(c)}</span>${netsOf(c.k).length > 1 ? `<em>${netsOf(c.k).length} ağ</em>` : ''}<svg class="kp-chev" width="7" height="12"><use href="#i-chev-right"/></svg></button>`).join('') || '<div class="k-empty">Sonuç bulunamadı</div>';
}
function openNetSheet(k, next) {
  dep.k = k; dep.next = next;
  if (next === 'info') dep.net = 0;
  $('#net-list').innerHTML = netsOf(k).map(([n, , min], i) => `
    <button class="opt press${i === dep.net ? ' on' : ''}" data-knet="${i}"><span class="lbl2"><b>${n}</b><span>Minimum ${fmt(min, min < 1 ? String(min).split('.')[1].length : 0)} ${coinOf(k).c}</span></span><i class="radio"></i></button>`).join('');
  openSheet('net-sheet');
}
const RULES = {
  crypto: ['Diğer platformlardan yapacağınız yatırma işlemlerini;<ol><li>Kimlik bilgilerinizle adınıza açılan,</li><li>Kripto Varlık Hizmet Sağlayıcı kuruluş tarafından sunulan</li></ol>bir hesap üzerinden yapabilirsiniz.',
    'Transferiniz gerçekleştikten sonra hesabın size ait olduğunu doğrulamak için bilgi ve belge yükleme adımına yönlendirileceksiniz.',
    'Bu koşullar sağlanmazsa tutar hesabınıza yansımaz; iade yalnızca koşulları sağlayan farklı bir hesabınıza yapılabilir.'],
  TL: ['TL transferlerinizi <b>kendinize ait bir banka hesabından</b> Havale / EFT ile yapabilirsiniz.', 'Açıklama alanına <b>müşteri numaranızı</b> yazmayı unutmayın.', 'Halkbank hesaplarınızdan yapılan transferler anında hesabınıza geçer.', 'ATM ve kredi kartı ile yapılan transferler kabul edilmez.'],
  USD: ['USD transferlerinizi <b>kendinize ait bir Halkbank USD hesabından</b> IBAN’a transfer ile yapabilirsiniz.', 'Açıklama alanına <b>müşteri numaranızı</b> yazmayı unutmayın.', 'ATM ve kredi kartı ile yapılan transferler kabul edilmez.'],
};
function openInfo(kind, then) {
  dep.next = then;
  $('#di-title').textContent = kind === 'crypto' ? 'Halk Kripto’ya gönderim yapmadan önce bilmeniz gerekenler' : `Halk Kripto’ya ${kind} transferi yapmadan önce bilmeniz gerekenler`;
  const extra = kind === 'crypto' && dep.k === 'xrp' ? ['XRP gönderimlerinde <b>Hedef Etiket (Destination Tag)</b> yazmanız zorunludur; etiketsiz gönderimler hesabınıza yansımaz.'] : [];
  $('#di-list').innerHTML = [...extra, ...RULES[kind]].map((t) => `<li>${t}</li>`).join('');
  $('#di-ok').textContent = then ? 'Anladım, Devam Et' : 'Tamam';
  openSheet('dinfo-sheet');
}
function copyRow(label, val, key, mono) {
  return `<div class="kd-irow"><span>${label}</span><button class="kd-copy press" data-kcopy="${key}"><b class="${mono ? 'mono' : ''}">${val}</b><svg width="20" height="20"><use href="#i-copy"/></svg></button></div>`;
}
function depValue(key) {
  if (dep.fiat) return { iban: FIAT[dep.fiat].iban.replace(/ /g, ''), name: PAYEE, ref: CUSTOMER_NO }[key];
  const [, f] = netsOf(dep.k)[dep.net];
  return key === 'tag' ? xrpTag() : fakeAddr(dep.k, f);
}
function renderDepDetail() {
  if (dep.fiat) {
    const cur = dep.fiat, F = FIAT[cur], li = (i) => (cur === 'TL' ? [LIMITS.d[2], LIMITS.m[2]][i] : [null, null][i]);
    const lim = [0, 1].map((i) => { const L = li(i); const max = F.lim[i]; const used = L ? L[1] : 0; return [max - used, max]; });
    $('#kdd-title').textContent = `${cur} Yatır`;
    $('#kdd-body').innerHTML = `
      <p class="kd-lead"><b>Halkbank’ta Kripto İşlemleri → Kripto’ya Para Gönder</b> adımından IBAN ve alıcı adı girmeden hızlıca transferinizi yapabilirsiniz.</p>
      <button class="see-all kd-link press" data-kbanksend="${cur}">Halkbank’tan Para Gönder <svg width="6" height="10"><use href="#i-chev-right"/></svg></button>
      <div class="section-title">HESAP BİLGİLERİ</div>
      <div class="card kd-card">
        <div class="kd-irow"><span>Varlık</span><b class="kd-asset">${coinIcon(cur === 'USD' ? 'usd' : 'try')}${cur} ${cur === 'USD' ? 'Amerikan Doları' : 'Türk Lirası'}</b></div>
        ${copyRow('IBAN', F.iban, 'iban', true)}
        ${copyRow('Alıcı Adı', PAYEE, 'name')}
        ${copyRow('Açıklama', CUSTOMER_NO, 'ref', true)}
      </div>
      <div class="row-title kd-limh"><span class="section-title">İŞLEM LİMİTLERİ</span><small>Kullanılabilir / Toplam</small></div>
      <div class="card kd-card kd-lims">
        ${['Günlük Limit', 'Aylık Limit'].map((n, i) => `<div class="info-row"><span>${n}</span><b>${fmt(lim[i][0])} / ${fmt(lim[i][1])} ${cur}</b></div>`).join('')}
      </div>
      <div class="k-info ka-note"><svg width="20" height="20"><use href="#i-info"/></svg><span>Hafta sonu ve resmi tatillerde EFT ile gönderilen tutarlar ilk iş günü hesabınıza geçer. Halkbank’tan yapılan transferler 7/24 anında geçer.</span></div>`;
    return;
  }
  const c = coinOf(dep.k), [net, f, min, eta] = netsOf(dep.k)[dep.net];
  $('#kdd-title').textContent = `${c.c} Yatır`;
  $('#kdd-body').innerHTML = `
    <p class="kd-lead">Halk Kripto’ya ${nameOf(c)} göndermek için adres ve QR bilgileriniz aşağıdadır.</p>
    <button class="see-all kd-link press" data-kdhow>Yatırma işlemini nasıl yaparım? <svg width="6" height="10"><use href="#i-chev-right"/></svg></button>
    <div class="section-title">ADRES BİLGİLERİ</div>
    <div class="card kd-card">
      <div class="kd-irow"><span>Kripto Varlık</span><b class="kd-asset">${coinIcon(c.k)}${nameOf(c)}</b></div>
      <div class="kd-irow"><span>Ağ</span><button class="kd-copy press" data-kdnet><b>${net}</b><svg width="20" height="20"><use href="#i-info"/></svg></button></div>
      ${copyRow(`${c.c} Adresi`, depValue('addr'), 'addr', true)}
      ${f === 'xrp' ? copyRow('Hedef Etiket (Tag)', xrpTag(), 'tag', true) : ''}
      <div class="kd-irow"><span>Adres QR Kodu</span><button class="kd-copy press" data-kdqr><b>QR Görüntüle</b><svg width="20" height="20"><use href="#i-qr"/></svg></button></div>
    </div>
    <div class="card kd-card kd-lims">
      <div class="info-row"><span>Minimum Yatırma Tutarı</span><b>${fmt(min, min < 1 ? String(min).split('.')[1].length : 0)} ${c.c}</b></div>
      <div class="info-row"><span>Maksimum Yatırma Tutarı</span><b>Limitsiz</b></div>
      <div class="info-row"><span>Tahmini Süre</span><b>${eta}</b></div>
    </div>
    <div class="kd-warn"><svg width="22" height="22"><use href="#i-info"/></svg><span>Bu adrese yalnızca <b>${net}</b> ağı üzerinden <b>${c.c}</b> gönderin. Minimum tutarın altındaki yatırma işlemleri iade edilmez.</span></div>`;
}
// Demo QR: adrese göre hep aynı desen (taranabilir değildir)
function qrSVG(text) {
  const N = 29, r = seeded(text), cells = [];
  const finder = (x, y) => [x, y, x + 6, y + 6];
  const inF = (x, y) => [finder(0, 0), finder(N - 7, 0), finder(0, N - 7)].some(([a, b, c2, d]) => x >= a - 1 && x <= c2 + 1 && y >= b - 1 && y <= d + 1);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (!inF(x, y) && r() > 0.52) cells.push(`M${x} ${y}h1v1h-1z`);
  const fp = (x, y) => `<path d="M${x} ${y}h7v7h-7zM${x + 1} ${y + 1}v5h5v-5z" fill-rule="evenodd"/><path d="M${x + 2} ${y + 2}h3v3h-3z"/>`;
  return `<svg viewBox="-2 -2 ${N + 4} ${N + 4}" width="220" height="220" shape-rendering="crispEdges"><rect x="-2" y="-2" width="${N + 4}" height="${N + 4}" fill="#fff"/><g fill="#0b2545">${fp(0, 0)}${fp(N - 7, 0)}${fp(0, N - 7)}<path d="${cells.join('')}"/></g></svg>`;
}
function openQR() {
  const c = coinOf(dep.k), [net] = netsOf(dep.k)[dep.net], addr = depValue('addr');
  $('#qr-title').textContent = `${c.c} Adres QR Kodu`;
  $('#qr-box').innerHTML = `<div class="kd-qr-img">${qrSVG(addr)}<span>${coinIcon(c.k)}</span></div><b>${nameOf(c)} · ${net}</b><code>${addr}</code>`;
  openSheet('qr-sheet');
}
async function copyText(key) {
  const v = depValue(key);
  try { await navigator.clipboard.writeText(v); } catch (e) { /* demo: izin yoksa yine de bildir */ }
  toast({ addr: 'Adres kopyalandı', tag: 'Hedef etiket kopyalandı', iban: 'IBAN kopyalandı', name: 'Alıcı adı kopyalandı', ref: 'Müşteri numarası kopyalandı' }[key]);
}
function openDepDetail() {
  renderDepDetail();
  if (!stack.includes('k-depd')) pushScreen('k-depd');
}

/* ---------- Ekranlar: alt menü sekmeleri ve üstten açılan ekranlar ---------- */
let current = 'k-home';
function tabbarHTML(active) {
  const t = (id, icon, label, w = 24) => `<button class="tab${active === id ? ' on' : ''}" ${id ? `data-ktabgo="${id}"` : 'data-soon'}><svg width="${w}" height="24"><use href="#${icon}"/></svg>${label}</button>`;
  return t('k-home', 't-home', 'Ana Sayfa', 23) + t('k-markets', 't-chart', 'Piyasalar')
    + '<div class="tab fab-slot"><button class="fab k-fab press" data-ktrade="">Al/Sat<svg width="26" height="22"><use href="#i-transfer"/></svg></button></div>'
    + t('k-assets', 't-pie', 'Varlıklarım') + t('k-history', 't-tx', 'İşlemler');
}
function showTab(id) {
  if (id === current) return;
  $(`#${current}`).classList.remove('active');
  $(`#${id}`).classList.add('active');
  current = id;
  if (id === 'k-markets') renderMarkets();
  if (id === 'k-assets') renderAssets();
  if (id === 'k-history') renderHistory();
}
const stack = []; // üst üste açılan ekranlar (Al/Sat → Özet → Sonuç)
function pushScreen(id) {
  if (id === 'k-search') { $('#ks-q').value = ''; renderSearch(); }
  if (id === 'k-profile') renderProfile();
  if (id === 'k-limits') renderLimits();
  if (id === 'k-dep') { $('#kd-q').value = ''; renderDepList(); }
  const s = $(`#${id}`);
  if (stack.includes(id)) return;
  stack.push(id);
  s.style.zIndex = 19 + stack.length;
  s.classList.add('active');
  requestAnimationFrame(() => requestAnimationFrame(() => s.classList.add('open')));
}
function popScreen() {
  const id = stack.pop();
  if (!id) return;
  const s = $(`#${id}`);
  $$('input').forEach((i) => i.blur());
  s.classList.remove('open');
  setTimeout(() => s.classList.remove('active'), 360);
}
function popAll() { while (stack.length) popScreen(); }

/* ---------- Alttan açılan menüler ---------- */
function openSheet(id = 'cur-sheet') {
  $$('#cur-sheet [data-dcur]').forEach((b) => b.classList.toggle('on', b.dataset.dcur === state.cur));
  $$('#filter-sheet [data-kpm]').forEach((b) => b.classList.toggle('on', b.dataset.kpm === km.pm));
  $('#sheet-bg').classList.add('show'); $(`#${id}`).classList.add('open');
}
function closeSheet() { $('#sheet-bg').classList.remove('show'); $$('.sheet.open').forEach((s) => s.classList.remove('open')); }

let toastT;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 1800);
}

// Çıkış: açılış ekranı yeniden gelir ve uygulama ana sayfadan başlar
function logout() {
  const sp = $('#k-splash');
  sp.classList.add('active');
  requestAnimationFrame(() => sp.classList.remove('gone'));
  setTimeout(() => {
    stack.length = 0;
    $$('.k-push.open').forEach((x) => x.classList.remove('open', 'active'));
    $(`#${current}`).classList.remove('active');
    current = 'k-home';
    $('#k-home').classList.add('active');
    sp.classList.add('gone');
    setTimeout(() => sp.classList.remove('active'), 600);
  }, 1600);
}

/* ---------- Ölçek (Halkbank uygulamasıyla aynı mantık) ---------- */
function layout() {
  const dev = $('#device');
  const W = window.innerWidth, H = window.innerHeight;
  const standalone = window.navigator.standalone || matchMedia('(display-mode: standalone)').matches;
  const framed = !embedded && !standalone && W >= 640;
  document.body.classList.toggle('framed', framed);
  document.documentElement.classList.toggle('standalone', !!standalone);
  document.documentElement.classList.toggle('notch-sim', location.search.includes('notch')); // yalnızca test için
  if (framed) {
    const z = Math.min((H - 48) / 956, (W - 48) / 440, 1);
    dev.style.setProperty('--z', 1);
    dev.style.transform = `translate(${(W - 440 * z) / 2}px, ${(H - 956 * z) / 2}px) scale(${z})`;
    return;
  }
  dev.style.transform = '';
  dev.style.setProperty('--z', W / 440);
  if (embedded) {
    // Halkbank uygulaması güvenli alanları (tasarım px) iletir; iframe içinde env() çalışmaz
    dev.style.setProperty('--sat', `${params.get('sat') || 0}px`);
    dev.style.setProperty('--sab', `${params.get('sab') || 0}px`);
  } else if (standalone) {
    const probe = document.createElement('div');
    probe.style.cssText = 'position:fixed;visibility:hidden;padding-top:env(safe-area-inset-top)';
    document.body.appendChild(probe);
    const safeTop = parseFloat(getComputedStyle(probe).paddingTop) || 0;
    probe.remove();
    const screenH = W <= Math.min(screen.width, screen.height) + 1 ? Math.max(screen.width, screen.height) : Math.min(screen.width, screen.height);
    document.documentElement.classList.toggle('vh-bug', safeTop > 0 && Math.abs(screenH - H - safeTop) <= 4);
  }
}

/* ---------- Başlat ---------- */
function init() {
  layout();
  window.addEventListener('resize', layout);
  renderTotal(); renderList(); renderAssets(); renderProfile();
  $$('[data-ktabbar]').forEach((n) => (n.innerHTML = tabbarHTML(n.dataset.ktabbar)));
  $('#ks-q').addEventListener('input', renderSearch);
  $('#ka-q').addEventListener('input', renderAssets);
  $('#kt-qty').addEventListener('input', onQty);
  $('#kt-amt').addEventListener('input', onAmt);
  $('#cs-q').addEventListener('input', renderCoinSheet);
  $('#kd-q').addEventListener('input', renderDepList);
  ['#kt-qty', '#kt-amt', '#cs-q', '#kd-q'].forEach((q) => $(q).addEventListener('keydown', (e) => { if (e.key === 'Enter') e.target.blur(); }));
  $('#ka-q').addEventListener('keydown', (e) => { if (e.key === 'Enter') e.target.blur(); });
  $('#ks-q').addEventListener('keydown', (e) => { if (e.key === 'Enter') e.target.blur(); });

  document.addEventListener('click', (e) => {
    const b = e.target.closest('button, [data-soon], [data-kpair], [data-kpick], [data-tx], [data-kdfiat]');
    if (!b) return;
    if (b.hasAttribute('data-bank')) return window.parent.postMessage({ type: 'halkkripto:back' }, location.origin);
    if (b.dataset.ktabgo) return showTab(b.dataset.ktabgo);
    if (b.dataset.kpush) return pushScreen(b.dataset.kpush);
    if (b.hasAttribute('data-kpop')) return popScreen();
    if (b.hasAttribute('data-kpopall')) return popAll();
    if (b.dataset.ktrade !== undefined) { const [k, q, sd] = (b.dataset.ktrade || 'btc').split('/'); closeSheet(); return openTrade(k, q || state.cur, sd || 'buy'); }
    if (b.dataset.kside) { if (b.dataset.kside === 'sell' && !holding(tr.k)) { const h = ASSETS.find((a) => a.v > 0.005); if (!h) return toast('Satılabilir kripto varlığınız yok'); toast(`${coinOf(tr.k).c} varlığınız yok, ${h.c} seçildi`); tr.k = h.k; } tr.side = b.dataset.kside; tr.qty = tr.amt = 0; $('#kt-qty').value = ''; $('#kt-amt').value = ''; return renderTrade(); }
    if (b.hasAttribute('data-krefresh')) return refreshPrice();
    if (b.dataset.kdcoin) return openNetSheet(b.dataset.kdcoin, 'info');
    if (b.dataset.kdfiat) { dep.fiat = b.dataset.kdfiat; return openInfo(dep.fiat, 'detail'); }
    if (b.dataset.knet) { dep.net = +b.dataset.knet; $$('#net-list [data-knet]').forEach((x) => x.classList.toggle('on', x === b)); return; }
    if (b.id === 'net-go') { closeSheet(); dep.fiat = null; if (dep.next === 'info') return setTimeout(() => openInfo('crypto', 'detail'), 320); return renderDepDetail(); }
    if (b.id === 'di-ok') { closeSheet(); if (dep.next === 'detail') openDepDetail(); return; }
    if (b.hasAttribute('data-kdhow')) return openInfo('crypto', null);
    if (b.hasAttribute('data-kdnet')) return openNetSheet(dep.k, 'detail');
    if (b.hasAttribute('data-kdqr')) return openQR();
    if (b.dataset.kcopy) return copyText(b.dataset.kcopy);
    if (b.hasAttribute('data-kshare')) return toast('Paylaşım menüsü demoda yer almıyor');
    if (b.dataset.kbanksend) {
      if (embedded) return window.parent.postMessage({ type: 'halkkripto:send', cur: b.dataset.kbanksend }, location.origin);
      return toast('Bu adım Halkbank uygulamasında açılır');
    }
    if (b.dataset.kpct) return setPct(+b.dataset.kpct);
    if (b.id === 'kt-go') return goSummary();
    if (b.id === 'kt-confirm') return confirmTrade();
    if (b.dataset.kcoin) { tr.k = b.dataset.kcoin; tr.qty = tr.amt = 0; $('#kt-qty').value = ''; $('#kt-amt').value = ''; renderTrade(); return setTimeout(closeSheet, 150); }
    if (b.dataset.kacct) { tr.cur = b.dataset.kacct; tr.qty = tr.amt = 0; $('#kt-qty').value = ''; $('#kt-amt').value = ''; renderTrade(); return setTimeout(closeSheet, 150); }
    if (b.id === 'ktr-dekont') return openTx(tr.lastId);
    if (b.id === 'ktr-assets') { popAll(); return showTab('k-assets'); }
    if (b.id === 'ktr-new') { popScreen(); popScreen(); tr.qty = tr.amt = 0; $('#kt-qty').value = ''; $('#kt-amt').value = ''; return renderTrade(); }
    if (b.dataset.ksheet) { if (b.dataset.ksheet === 'hf-sheet') { hfDraft = { ...kh }; renderHfSheet(); } if (b.dataset.ksheet === 'coin-sheet') { $('#cs-q').value = ''; renderCoinSheet(); } if (b.dataset.ksheet === 'acct-sheet') renderAcctSheet(); return openSheet(b.dataset.ksheet); }
    if (b.dataset.kpsw) { b.classList.toggle('on'); b.setAttribute('aria-checked', b.classList.contains('on')); return; }
    if (b.dataset.kplim) { limTab = b.dataset.kplim; return renderLimits(); }
    if (b.dataset.klang) { if (b.dataset.klang === 'en') return toast('İngilizce dil seçeneği demoda yer almıyor'); return closeSheet(); }
    if (b.dataset.ktheme) { if (b.dataset.ktheme !== 'light') return toast('Koyu tema sıradaki adımda tasarlanacak'); return closeSheet(); }
    if (b.hasAttribute('data-kedit')) return toast('Bilgilerinizi Halkbank uygulamasından güncelleyebilirsiniz');
    if (b.hasAttribute('data-kclosego')) { closeSheet(); return toast('Hesap kapatma demoda yer almıyor'); }
    if (b.hasAttribute('data-klogout')) { closeSheet(); return logout(); }
    if (b.dataset.khclear) { kh[b.dataset.khclear] = b.dataset.khclear === 'period' ? '90' : 'all'; return renderHistory(); }
    if (b.hasAttribute('data-khreset')) { Object.assign(kh, { type: 'all', period: '90', status: 'all', asset: 'all' }); return renderHistory(); }
    if (b.dataset.khsel) return openSel(b.dataset.khsel);
    if (b.dataset.ksel) { const [key, v] = b.dataset.ksel.split(':'); kh[key] = v; renderHistory(); $$('#sel-list .kh-opt').forEach((o) => o.classList.toggle('on', o === b)); return setTimeout(closeSheet, 160); }
    if (b.hasAttribute('data-ktxmore')) return renderTxDetail(!$('#txd-body').dataset.more);
    if (b.dataset.kcopytx) { try { navigator.clipboard.writeText(b.dataset.kcopytx); } catch (err) { /* izin yoksa da bildir */ } return toast('İşlem numarası kopyalandı'); }
    if (b.dataset.hf) { const [key, v] = b.dataset.hf.split(':'); hfDraft[key] = v; return renderHfSheet(); }
    if (b.id === 'hf-clear') { hfDraft = { ...hfDraft, period: '90', asset: 'all' }; return renderHfSheet(); }
    if (b.id === 'hf-apply') { Object.assign(kh, hfDraft); renderHistory(); return closeSheet(); }
    if (b.dataset.tx) return openTx(b.dataset.tx);
    if (b.hasAttribute('data-txshare')) return toast('Dekont paylaşım menüsü demoda yer almıyor');
    if (b.hasAttribute('data-kclose')) return closeSheet();
    if (b.dataset.kq) { km.quote = b.dataset.kq; return renderMarkets(); }
    if (b.dataset.ksort) return setSort(b.dataset.ksort);
    if (b.dataset.kpm) { km.pm = b.dataset.kpm; renderMarkets(); return setTimeout(closeSheet, 180); }
    if (b.id === 'ks-clear') { recents = []; return renderSearch(); }
    if (b.dataset.kpick) return pickPair(b.dataset.kpick);
    if (b.dataset.kpair) { closeSheet(); const [k, q] = b.dataset.kpair.split('/'); return openTrade(k, q, 'buy'); }
    if (b.id === 'k-promo-x') return $('#k-promo').classList.add('gone');
    if (b.hasAttribute('data-eye')) { state.hidden = !state.hidden; renderTotal(); return renderAssets(); }
    if (b.hasAttribute('data-cursheet')) return openSheet();
    if (b.dataset.dcur) {
      state.cur = b.dataset.dcur;
      $$('#cur-sheet [data-dcur]').forEach((x) => x.classList.toggle('on', x === b));
      renderTotal(); renderList(); renderMarkets(); renderAssets(); renderProfile();
      return setTimeout(closeSheet, 180);
    }
    if (b.dataset.kagroup) { ka.open[b.dataset.kagroup] = !ka.open[b.dataset.kagroup]; return b.parentElement.classList.toggle('open'); }
    if (b.id === 'ka-zero') { ka.hideZero = !ka.hideZero; return renderAssets(); }
    if (b.dataset.ktab) { kTab = b.dataset.ktab; return renderList(); }
    if (b.hasAttribute('data-soon')) return toast('Bu ekran sıradaki adımda tasarlanacak');
  });
  $('#sheet-bg').addEventListener('click', closeSheet);

  if (embedded) $$('[data-bank]').forEach((b) => (b.hidden = false));

  // Pencere ve yüzey kaymaz; yalnızca ekran içi listeler kayar
  window.addEventListener('scroll', () => (window.scrollX || window.scrollY) && window.scrollTo(0, 0), { passive: true });
  [$('#device'), ...$$('.screen')].forEach((el) => el.addEventListener('scroll', () => { if (el.scrollTop) el.scrollTop = 0; }, { passive: true }));

  setTimeout(() => {
    $('#k-home').classList.add('active');
    $('#k-splash').classList.add('gone');
    setTimeout(() => $('#k-splash').classList.remove('active'), 600);
    // Halkbank'taki Al/Sat düğmesinden gelindiyse (#pair=BTC/TL&side=Al) Al/Sat ekranı doğrudan açılır
    const h = new URLSearchParams(location.hash.slice(1));
    if (h.get('pair')) {
      const [code, q] = h.get('pair').split('/');
      const c = COINS.find((x) => x.c === code);
      if (c) setTimeout(() => openTrade(c.k, q, h.get('side') === 'Sat' ? 'sell' : 'buy'), 250);
    }
  }, 1400);
}
init();
