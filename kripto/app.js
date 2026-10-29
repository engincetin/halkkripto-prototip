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
  const c = COINS.find((x) => x.k === k);
  toast(`${c.c}/${q} Al/Sat ekranı sıradaki adımda tasarlanacak`);
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
      <div class="coin-row tap" data-soon>
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
        <svg class="ka-go" width="7" height="12"><use href="#i-chev-right"/></svg>
      </div>`;
    }).join('') || '<div class="k-empty">Sonuç bulunamadı</div>'}</div>`;

  $('#ka-zero').classList.toggle('on', ka.hideZero);
  $('#ka-zero').setAttribute('aria-checked', ka.hideZero);
  $('#ka-empty')?.remove();
  if (q && !cash.length && !rows.length) $('#ka-crypto').insertAdjacentHTML('afterend', '<div class="k-empty" id="ka-empty">Sonuç bulunamadı</div>');
}

/* ---------- İşlem Geçmişi ---------- */
// Demo işlemleri: g = kaç gün önce, h = saat. Sıfır bakiyeli USDT / AVAX / DOGE alınıp tamamen satılmış görünür.
// Fiyatlar TL; TL limit emirlerde komisyon %0 (kampanya), piyasa emirlerinde %0,20.
const TX_SEED = [
  { g: 1, h: '16:42', t: 'buy', k: 'sol', o: 'Piyasa', q: 0.35, p: 5060 },
  { g: 2, h: '10:15', t: 'sell', k: 'doge', o: 'Piyasa', q: 1500, p: 10.32 },
  { g: 3, h: '21:08', t: 'buy', k: 'xrp', o: 'Limit', q: 40, p: 61.5, st: 'cancel' },
  { g: 4, h: '09:30', t: 'dep', k: 'try', q: 15000 },
  { g: 6, h: '14:22', t: 'buy', k: 'btc', o: 'Limit', q: 0.0015, p: 3985000 },
  { g: 8, h: '11:47', t: 'sell', k: 'avax', o: 'Limit', q: 12, p: 452.1 },
  { g: 10, h: '19:05', t: 'buy', k: 'eth', o: 'Piyasa', q: 0.03, p: 115200 },
  { g: 12, h: '13:12', t: 'dep', k: 'usd', q: 200 },
  { g: 15, h: '16:40', t: 'sell', k: 'usdt', o: 'Piyasa', q: 300, p: 49.55 },
  { g: 18, h: '10:02', t: 'buy', k: 'usdc', o: 'Limit', q: 197.69, p: 49.66 },
  { g: 21, h: '15:33', t: 'wd', k: 'try', q: 5000 },
  { g: 25, h: '12:20', t: 'buy', k: 'doge', o: 'Piyasa', q: 1500, p: 9.6 },
  { g: 29, h: '20:11', t: 'buy', k: 'sol', o: 'Limit', q: 1.2, p: 5250 },
  { g: 34, h: '09:58', t: 'buy', k: 'avax', o: 'Piyasa', q: 12, p: 470 },
  { g: 40, h: '17:25', t: 'buy', k: 'btc', o: 'Limit', q: 0.002, p: 3850000, st: 'cancel' },
  { g: 45, h: '11:11', t: 'buy', k: 'xrp', o: 'Limit', q: 108.65, p: 54 },
  { g: 52, h: '14:45', t: 'buy', k: 'usdt', o: 'Piyasa', q: 300, p: 48.9 },
  { g: 60, h: '10:30', t: 'dep', k: 'try', q: 50000 },
  { g: 66, h: '16:00', t: 'buy', k: 'eth', o: 'Limit', q: 0.1, p: 108000 },
  { g: 75, h: '13:37', t: 'buy', k: 'btc', o: 'Piyasa', q: 0.0046, p: 3520000 },
  { g: 88, h: '09:12', t: 'dep', k: 'try', q: 40000 },
  { g: 124, h: '15:50', t: 'dep', k: 'try', q: 25000 },
];
const TX_TYPE = {
  buy: { n: 'Alım', icon: 'i-plus' }, sell: { n: 'Satım', icon: 'i-minus' },
  dep: { n: 'Yatırma', icon: 'k-deposit' }, wd: { n: 'Çekme', icon: 'k-withdraw' },
};
const PERIODS = [['7', 'Son 7 Gün'], ['30', 'Son 30 Gün'], ['90', 'Son 3 Ay'], ['all', 'Tümü']];
const STATUSES = [['all', 'Tümü'], ['done', 'Gerçekleşen'], ['cancel', 'İptal Edilen']];
const kh = { type: 'all', period: '90', status: 'all', asset: 'all' };
let hfDraft = null;

function buildTx() {
  const now = new Date();
  const list = TX_SEED.map((x, i) => {
    const d = new Date(now); d.setDate(d.getDate() - x.g);
    const [hh, mm] = x.h.split(':'); d.setHours(+hh, +mm, 0, 0);
    const cash = x.k === 'try' || x.k === 'usd';
    const total = cash ? x.q : x.q * x.p;
    const fee = cash || x.st === 'cancel' ? 0 : x.o === 'Limit' ? 0 : total * 0.002;
    return { ...x, id: `HK${String(48213907 - i * 3711)}`, ts: d.getTime(), total, fee, st: x.st || 'done' };
  });
  // Halkbank'tan gönderilen paralar Halk Kripto'da "Yatırma" olarak görünür
  (state.moves || []).filter((m) => m.ts && m.t === 'Halk Kripto Transferi').forEach((m) => {
    list.push({ t: 'dep', k: m.cur === 'USD' ? 'usd' : 'try', q: -m.a, total: -m.a, fee: 0, st: 'done', ts: m.ts, id: `HK${m.ref}`, live: true });
  });
  return list.sort((a, b) => b.ts - a.ts);
}
const assetCode = (k) => (k === 'try' ? 'TL' : k === 'usd' ? 'USD' : COINS.find((c) => c.k === k).c);
const assetName = (k) => (k === 'try' ? 'Türk Lirası' : k === 'usd' ? 'Amerikan Doları' : nameOf(COINS.find((c) => c.k === k)));
const qtyText = (x) => (x.k === 'try' || x.k === 'usd' ? fmt(x.q) : fmt(x.q, x.q < 1 ? 4 : x.q < 100 ? 2 : 0)) + ' ' + assetCode(x.k);
function txTitle(x) {
  if (x.t === 'dep' || x.t === 'wd') return `${assetCode(x.k)} ${TX_TYPE[x.t].n}`;
  return `${assetCode(x.k)} ${TX_TYPE[x.t].n}`;
}
function txSub(x) {
  const time = new Date(x.ts).toTimeString().slice(0, 5);
  if (x.t === 'dep') return `Halkbank'tan · ${time}`;
  if (x.t === 'wd') return `Halkbank'a · ${time}`;
  return `${x.o} Emir · ${time}`;
}
function dayLabel(ts) {
  const d = new Date(ts), t = new Date(); t.setHours(0, 0, 0, 0);
  const diff = Math.round((t - new Date(d).setHours(0, 0, 0, 0)) / 864e5);
  if (diff === 0) return 'Bugün';
  if (diff === 1) return 'Dün';
  return `${d.getDate()} ${TR_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}
const TR_MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

function filteredTx(ignoreType) {
  const q = $('#kh-q').value.trim().toLocaleLowerCase('tr-TR');
  const from = kh.period === 'all' ? 0 : Date.now() - +kh.period * 864e5;
  return buildTx().filter((x) => x.ts >= from
    && (ignoreType || kh.type === 'all' || x.t === kh.type)
    && (kh.status === 'all' || x.st === kh.status)
    && (kh.asset === 'all' || x.k === kh.asset)
    && (!q || `${assetCode(x.k)} ${assetName(x.k)} ${x.id} ${TX_TYPE[x.t].n}`.toLocaleLowerCase('tr-TR').includes(q)));
}
function txRow(x) {
  const cash = x.k === 'try' || x.k === 'usd';
  const sign = x.t === 'buy' || x.t === 'dep' ? '+' : '-';
  const main = `${sign}${qtyText(x)}`;
  const sub = cash ? '' : `${x.t === 'buy' ? '-' : '+'}${fmt(x.total + (x.t === 'buy' ? x.fee : -x.fee))} TL`;
  const ic = cash ? coinIcon(x.k) : coinIcon(x.k);
  return `
    <div class="kh-row tap${x.st === 'cancel' ? ' cancel' : ''}" data-tx="${x.id}">
      <span class="kh-ic">${ic}<i class="kh-badge ${x.t}"><svg width="10" height="10"><use href="#${TX_TYPE[x.t].icon}"/></svg></i></span>
      <div class="coin-name"><b>${txTitle(x)}</b><span>${txSub(x)}</span></div>
      <div class="coin-val">${x.st === 'cancel' ? '<em class="kh-st">İptal Edildi</em>' : ''}<b class="amt ${x.st === 'cancel' ? '' : x.t}">${main}</b>${sub && x.st !== 'cancel' ? `<span class="amt">${sub}</span>` : ''}</div>
    </div>`;
}
function renderHistory() {
  // Özet: seçili tarih aralığındaki gerçekleşen işlemler (tür filtresi hariç)
  const base = filteredTx(true).filter((x) => x.st === 'done');
  const sum = (t) => base.filter((x) => x.t === t).reduce((a, x) => a + (x.k === 'usd' ? x.total * USD_RATE : x.total), 0);
  const per = PERIODS.find((p) => p[0] === kh.period)[1];
  $('#kh-sum').innerHTML = `
    <div class="kh-sum-head"><span>${per}</span><b>${base.length} gerçekleşen işlem</b></div>
    <div class="kh-sum-grid">
      <div><span>Alım</span><b class="amt">${fmt(sum('buy'), 0)} <small>TL</small></b></div>
      <div><span>Satım</span><b class="amt">${fmt(sum('sell'), 0)} <small>TL</small></b></div>
      <div><span>Net Yatırma</span><b class="amt">${fmt(sum('dep') - sum('wd'), 0)} <small>TL</small></b></div>
    </div>`;
  const counts = { all: filteredTx(true).length };
  Object.keys(TX_TYPE).forEach((t) => (counts[t] = filteredTx(true).filter((x) => x.t === t).length));
  $('#kh-types').innerHTML = [['all', 'Tümü'], ...Object.entries(TX_TYPE).map(([k, v]) => [k, v.n])]
    .map(([k, n]) => `<button class="kh-chip press${kh.type === k ? ' on' : ''}" data-khtype="${k}">${n}<small>${counts[k]}</small></button>`).join('');

  // Etkin filtre etiketleri
  const tags = [];
  if (kh.period !== '90') tags.push(['period', PERIODS.find((p) => p[0] === kh.period)[1]]);
  if (kh.status !== 'all') tags.push(['status', STATUSES.find((p) => p[0] === kh.status)[1]]);
  if (kh.asset !== 'all') tags.push(['asset', assetCode(kh.asset)]);
  $('#kh-active').innerHTML = tags.map(([k, n]) => `<button class="kh-tag press" data-khclear="${k}">${n}<svg width="10" height="10" viewBox="0 0 18 18"><path d="m3 3 12 12M15 3 3 15" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg></button>`).join('');
  $('#kh-badge').hidden = !tags.length;
  $('#kh-badge').textContent = tags.length;

  const list = filteredTx();
  if (!list.length) {
    $('#kh-list').innerHTML = `<div class="kh-empty"><span><svg width="34" height="34"><use href="#k-hist"/></svg></span><b>İşlem bulunamadı</b><p>Seçtiğiniz filtrelere uygun işlem yok.</p><button class="see-all press" data-khreset>Filtreleri Temizle</button></div>`;
    return;
  }
  const groups = [];
  list.forEach((x) => { const l = dayLabel(x.ts); (groups.at(-1)?.l === l ? groups.at(-1).items : (groups.push({ l, items: [] }), groups.at(-1).items)).push(x); });
  $('#kh-list').innerHTML = groups.map((g) => `<div class="section-title kh-day">${g.l}</div><div class="list-card">${g.items.map(txRow).join('')}</div>`).join('');
}
function renderHfSheet() {
  const d = hfDraft;
  const chips = (arr, key) => arr.map(([k, n]) => `<button class="kh-chip press${d[key] === k ? ' on' : ''}" data-hf="${key}:${k}">${n}</button>`).join('');
  $('#hf-period').innerHTML = chips(PERIODS, 'period');
  $('#hf-status').innerHTML = chips(STATUSES, 'status');
  const assets = [...new Set(buildTx().map((x) => x.k))];
  $('#hf-asset').innerHTML = chips([['all', 'Tümü'], ...assets.map((k) => [k, assetCode(k)])], 'asset');
}
function openTx(id) {
  const x = buildTx().find((t) => t.id === id);
  const cash = x.k === 'try' || x.k === 'usd';
  const d = new Date(x.ts);
  const row = (a, b) => `<div class="info-row"><span>${a}</span><b>${b}</b></div>`;
  const stTxt = x.st === 'cancel' ? 'İptal Edildi' : 'Gerçekleşti';
  let rows = row('İşlem No', x.id) + row('Tarih', `${d.getDate()} ${TR_MONTHS[d.getMonth()]} ${d.getFullYear()}, ${d.toTimeString().slice(0, 5)}`);
  if (cash) {
    rows += row(x.t === 'dep' ? 'Gönderen Hesap' : 'Alıcı Hesap', `Halkbank Vadesiz ${x.k === 'usd' ? 'USD' : 'TL'} Hesabı`)
      + row('Tutar', qtyText(x)) + row('İşlem Ücreti', `0,00 ${assetCode(x.k)}`);
  } else {
    const net = x.t === 'buy' ? x.total + x.fee : x.total - x.fee;
    rows += row('İşlem Çifti', `${assetCode(x.k)}/TL`) + row('Emir Tipi', `${x.o} ${TX_TYPE[x.t].n}`)
      + row('Fiyat', `${fmt(x.p, x.p < 20 ? 3 : 2)} TL`) + row('Miktar', qtyText(x)) + row('Tutar', `${fmt(x.total)} TL`)
      + row('Komisyon', x.st === 'cancel' ? '-' : x.fee ? `${fmt(x.fee)} TL <small>%0,20</small>` : `0,00 TL <small>%0 kampanya</small>`)
      + (x.st === 'cancel' ? '' : `<hr>${row(x.t === 'buy' ? 'Ödenen Toplam' : 'Hesaba Geçen', `${fmt(net)} TL`)}`);
  }
  $('#tx-body').innerHTML = `
    <div class="k-sheet-head"><h3>İşlem Detayı</h3><button class="press" data-kclose aria-label="Kapat"><svg width="18" height="18" viewBox="0 0 18 18"><path d="m3 3 12 12M15 3 3 15" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg></button></div>
    <div class="tx-hero">
      <span class="kh-ic">${coinIcon(x.k)}<i class="kh-badge ${x.t}"><svg width="10" height="10"><use href="#${TX_TYPE[x.t].icon}"/></svg></i></span>
      <div><b>${txTitle(x)}</b><span>${assetName(x.k)}</span></div>
      <em class="tx-st ${x.st}">${stTxt}</em>
    </div>
    <div class="tx-amt ${x.st === 'cancel' ? '' : x.t}">${x.t === 'buy' || x.t === 'dep' ? '+' : '-'}${qtyText(x)}</div>
    <div class="tx-rows">${rows}</div>
    <div class="hf-btns">
      <button class="btn-secondary press" data-txshare>Dekont Paylaş</button>
      <button class="btn-primary press" ${cash ? 'data-kclose' : `data-kpair="${x.k}/TL"`}>${cash ? 'Tamam' : 'Tekrar İşlem Yap'}</button>
    </div>`;
  openSheet('tx-sheet');
}

/* ---------- Ekranlar: alt menü sekmeleri ve üstten açılan ekranlar ---------- */
let current = 'k-home';
function tabbarHTML(active) {
  const t = (id, icon, label, w = 24) => `<button class="tab${active === id ? ' on' : ''}" ${id ? `data-ktabgo="${id}"` : 'data-soon'}><svg width="${w}" height="24"><use href="#${icon}"/></svg>${label}</button>`;
  return t('k-home', 't-home', 'Ana Sayfa', 23) + t('k-markets', 't-chart', 'Piyasalar')
    + '<div class="tab fab-slot"><button class="fab k-fab press" data-soon>Al/Sat<svg width="26" height="22"><use href="#i-transfer"/></svg></button></div>'
    + t('k-assets', 't-pie', 'Varlıklarım') + t(null, 't-user', 'Profil');
}
function showTab(id) {
  if (id === current) return;
  $(`#${current}`).classList.remove('active');
  $(`#${id}`).classList.add('active');
  current = id;
  if (id === 'k-markets') renderMarkets();
  if (id === 'k-assets') renderAssets();
}
function pushScreen(id) {
  if (id === 'k-search') { $('#ks-q').value = ''; renderSearch(); }
  if (id === 'k-history') { $('#kh-q').value = ''; renderHistory(); }
  const s = $(`#${id}`);
  s.classList.add('active');
  requestAnimationFrame(() => requestAnimationFrame(() => s.classList.add('open')));
}
function popScreen() {
  const s = $('.k-push.open');
  if (!s) return;
  $('#ks-q').blur(); $('#kh-q').blur();
  s.classList.remove('open');
  setTimeout(() => s.classList.remove('active'), 360);
}

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
  renderTotal(); renderList(); renderAssets();
  $$('[data-ktabbar]').forEach((n) => (n.innerHTML = tabbarHTML(n.dataset.ktabbar)));
  $('#ks-q').addEventListener('input', renderSearch);
  $('#ka-q').addEventListener('input', renderAssets);
  $('#kh-q').addEventListener('input', renderHistory);
  $('#kh-q').addEventListener('keydown', (e) => { if (e.key === 'Enter') e.target.blur(); });
  $('#ka-q').addEventListener('keydown', (e) => { if (e.key === 'Enter') e.target.blur(); });
  $('#ks-q').addEventListener('keydown', (e) => { if (e.key === 'Enter') e.target.blur(); });

  document.addEventListener('click', (e) => {
    const b = e.target.closest('button, [data-soon], [data-kpair], [data-kpick], [data-tx]');
    if (!b) return;
    if (b.hasAttribute('data-bank')) return window.parent.postMessage({ type: 'halkkripto:back' }, location.origin);
    if (b.dataset.ktabgo) return showTab(b.dataset.ktabgo);
    if (b.dataset.kpush) return pushScreen(b.dataset.kpush);
    if (b.hasAttribute('data-kpop')) return popScreen();
    if (b.dataset.ksheet) { if (b.dataset.ksheet === 'hf-sheet') { hfDraft = { ...kh }; renderHfSheet(); } return openSheet(b.dataset.ksheet); }
    if (b.dataset.khtype) { kh.type = b.dataset.khtype; return renderHistory(); }
    if (b.dataset.khclear) { kh[b.dataset.khclear] = b.dataset.khclear === 'period' ? '90' : 'all'; return renderHistory(); }
    if (b.hasAttribute('data-khreset')) { Object.assign(kh, { type: 'all', period: '90', status: 'all', asset: 'all' }); $('#kh-q').value = ''; return renderHistory(); }
    if (b.dataset.hf) { const [key, v] = b.dataset.hf.split(':'); hfDraft[key] = v; return renderHfSheet(); }
    if (b.id === 'hf-clear') { hfDraft = { ...hfDraft, period: '90', status: 'all', asset: 'all' }; return renderHfSheet(); }
    if (b.id === 'hf-apply') { Object.assign(kh, hfDraft); renderHistory(); return closeSheet(); }
    if (b.dataset.tx) return openTx(b.dataset.tx);
    if (b.hasAttribute('data-txshare')) return toast('Dekont paylaşım menüsü demoda yer almıyor');
    if (b.hasAttribute('data-kclose')) return closeSheet();
    if (b.dataset.kq) { km.quote = b.dataset.kq; return renderMarkets(); }
    if (b.dataset.ksort) return setSort(b.dataset.ksort);
    if (b.dataset.kpm) { km.pm = b.dataset.kpm; renderMarkets(); return setTimeout(closeSheet, 180); }
    if (b.id === 'ks-clear') { recents = []; return renderSearch(); }
    if (b.dataset.kpick) return pickPair(b.dataset.kpick);
    if (b.dataset.kpair) { closeSheet(); const [k, q] = b.dataset.kpair.split('/'); return toast(`${COINS.find((x) => x.k === k).c}/${q} Al/Sat ekranı sıradaki adımda tasarlanacak`); }
    if (b.id === 'k-promo-x') return $('#k-promo').classList.add('gone');
    if (b.hasAttribute('data-eye')) { state.hidden = !state.hidden; renderTotal(); return renderAssets(); }
    if (b.hasAttribute('data-cursheet')) return openSheet();
    if (b.dataset.dcur) {
      state.cur = b.dataset.dcur;
      $$('#cur-sheet [data-dcur]').forEach((x) => x.classList.toggle('on', x === b));
      renderTotal(); renderList(); renderMarkets(); renderAssets();
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
  }, 1400);
}
init();
