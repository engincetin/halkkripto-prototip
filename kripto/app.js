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
const km = { list: 'all', pm: 'ask', sort: null, dir: 1 };
// Arama geçmişi (çift: kripto + kotasyon)
let recents = [{ k: 'btc', q: 'TL' }, { k: 'usdc', q: 'USD' }, { k: 'eth', q: 'TL' }];
const POPULAR = ['btc', 'eth', 'sol', 'doge', 'link', 'avax'];

const inCur = (nTL, cur = state.cur) => (cur === 'USD' ? nTL / USD_RATE : nTL);
const cashTL = () => state.nakit + state.nakitUsd * USD_RATE;

/* ---------- Çizim ---------- */
// Ana kart: Halkbank'taki gibi "Tümü" ile seçilen hesap (Toplam Varlığım / nakit hesaplar / kripto hesapları)
let homeAcc = 'all';
const eyeHtml = () => `<button class="eye-btn press" data-eye><svg width="17" height="13"><use href="#${state.hidden ? 'i-eye-off' : 'i-eye'}"/></svg></button>`;
const TUMU = '<button class="pill-orange press" data-allacc>Tümü</button>';
function cashAcc(cur) { return { id: cur, name: `Halk Kripto ${cur} Hesabı`, no: ACCT_NO[cur], bal: cashOf(cur) }; }
function renderTotal() {
  const cur = state.cur;
  if (loggedOut) {
    $('#k-total').innerHTML = `
      <div class="kw-card">
        <img src="icons/icon-192.png" alt="">
        <div><b>Halk Kripto’ya hoş geldiniz.</b><p>Hızlı ve kolay bir şekilde kripto alım satımı yapmak için giriş yapın.</p>
        <button class="see-all press" data-klogin>Giriş Yap <svg width="6" height="10"><use href="#i-chev-right"/></svg></button></div>
      </div>`;
    return;
  }
  if (homeAcc === 'TL' || homeAcc === 'USD') {
    const a = cashAcc(homeAcc);
    $('#k-total').innerHTML = `
      <div class="acct-head">${a.id === 'TL' ? '<span class="star"><svg width="10" height="10"><use href="#i-star"/></svg></span>' : coinIcon('usd')}<span class="name">${a.name}</span>${eyeHtml()}${TUMU}</div>
      <div class="acct-no k-no">${a.no}</div>
      <div class="lbl" style="margin-top:13px">Kullanılabilir Bakiye</div>
      <div class="amt-big amt">${money(a.bal, a.id)}</div>
      <div class="pl-row"><span class="lbl">${a.id === 'TL' ? 'USD' : 'TL'} Karşılığı</span><b class="money-sm amt">${money(a.id === 'TL' ? a.bal / USD_RATE : a.bal * USD_RATE, a.id === 'TL' ? 'USD' : 'TL')}</b></div>
      <hr>
      <button class="see-all press" data-khacc="${a.id === 'TL' ? 'try' : 'usd'}">Hesap Hareketleri <svg width="6" height="10"><use href="#i-chev-right"/></svg></button>`;
  } else if (homeAcc !== 'all') {
    const as = ASSETS.find((x) => x.k === homeAcc), c = coinOf(homeAcc);
    const q = as ? as.v / c.tl : 0, calc = as ? assetCalc(as) : { pl: 0 };
    const [i, f] = fmt(q, qtyDec(c)).split(',');
    $('#k-total').innerHTML = `
      <div class="acct-head">${coinIcon(c.k)}<span class="name">Halk Kripto ${c.c} Hesabı</span>${eyeHtml()}${TUMU}</div>
      <div class="acct-no k-no">${nameOf(c)} · ${c.c}</div>
      <div class="lbl" style="margin-top:13px">Mevcut Miktar</div>
      <div class="amt-big amt">${i}<small>${f ? `,${f}` : ''} ${c.c}</small></div>
      <div class="pl-row"><span class="lbl">${cur} Karşılığı</span><b class="money-sm amt">${money(inCur(as ? as.v : 0), cur)}</b>${as ? `<b class="${chClass(as.pct)} amt">%${fmt(Math.abs(as.pct))}</b>` : ''}</div>
      <hr>
      <button class="see-all press" data-ktrade="${c.k}/${cur}/buy">${c.c} Al/Sat <svg width="6" height="10"><use href="#i-chev-right"/></svg></button>`;
    void calc;
  } else {
    const total = cashTL() + state.kripto, tp = portfolioPL(), plv = inCur(tp.pl);
    $('#k-total').innerHTML = `
      <div class="acct-head"><svg class="coin-badge" width="17" height="17"><use href="#i-coinbadge"/></svg><span class="name">Toplam Varlığım</span>${eyeHtml()}${TUMU}</div>
      <div class="lbl" style="margin-top:13px">Kripto ve Nakit Bakiye</div>
      <div class="amt-big amt">${money(inCur(total), cur)}</div>
      <div class="pl-row"><span class="lbl">Olası Kar / Zarar</span><b class="${chClass(tp.pct)} amt">%${fmt(Math.abs(tp.pct))}</b><b class="${chClass(tp.pl)} money-sm amt">${signed(plv).split(',')[0]}<small>,${fmt(plv).split(',')[1]} ${cur}</small></b></div>
      <hr>
      <button class="see-all press" data-ktabgo="k-assets">Varlıklarıma Git <svg width="6" height="10"><use href="#i-chev-right"/></svg></button>`;
  }
  $('#device').classList.toggle('hidden-amt', state.hidden);
  renderSlides();
}
// "Tümü": Halkbank Tüm Hesaplar menüsünün aynısı
function openAllAcc() {
  const cur = state.cur;
  const card = (id, head, no, cols) => `
    <button class="acs-card press${homeAcc === id ? ' on' : ''}" data-homeacc="${id}"><i class="radio"></i>
      <div class="acs-title">${head}</div><div class="acs-no">${no}</div>
      <div class="acs-cols">${cols.map(([l, v, cls = '']) => `<div><span>${l}</span><b class="amt ${cls}">${v}</b></div>`).join('')}</div>
    </button>`;
  const tp = portfolioPL();
  const crypto = ASSETS.filter((a) => a.v > 0.005).sort((x, y) => y.v - x.v).map((a) => {
    const c = coinOf(a.k), q = a.v / c.tl, [i, f] = fmt(q, qtyDec(c)).split(',');
    return card(a.k, `${coinIcon(a.k)}<b>Halk Kripto ${c.c} Hesabı</b>`, nameOf(c), [['Mevcut Miktar', `${i}<small>${f ? `,${f}` : ''} ${c.c}</small>`], [`${cur} Karşılığı`, money(inCur(a.v), cur)]]);
  }).join('');
  $('#allacc-list').innerHTML = `
    ${card('all', '<svg class="coin-badge" width="17" height="17"><use href="#i-coinbadge"/></svg><b>Toplam Varlığım</b>', 'Tüm nakit ve kripto hesaplarınız', [['Kripto ve Nakit Bakiye', money(inCur(cashTL() + state.kripto), cur)], ['Olası Kar / Zarar', money(inCur(tp.pl), cur), chClass(tp.pl)]])}
    <div class="acs-sec">NAKİT HESAPLARIM</div>
    ${['TL', 'USD'].map((c) => { const a = cashAcc(c); return card(c, `${c === 'TL' ? '<span class="star"><svg width="10" height="10"><use href="#i-star"/></svg></span>' : ''}<b>${a.name}</b>`, a.no, [['Kullanılabilir Bakiye', money(a.bal, c)], [`${c === 'TL' ? 'USD' : 'TL'} Karşılığı`, money(c === 'TL' ? a.bal / USD_RATE : a.bal * USD_RATE, c === 'TL' ? 'USD' : 'TL')]]); }).join('')}
    <div class="acs-sec">KRİPTO HESAPLARIM</div>
    ${crypto}`;
  openSheet('allacc-sheet');
}

// Ana sayfa "Son İşlemlerim": Halkbank ana sayfasındaki Hesap Hareketleri kartının aynısı (son 2 işlem)
function renderHomeMoves() {
  const key = homeAcc === 'all' ? null : homeAcc === 'TL' ? 'try' : homeAcc === 'USD' ? 'usd' : homeAcc;
  const list = buildTx().filter((x) => !key || x.k === key).slice(0, 2);
  $('#k-moves').innerHTML = list.map((x) => txRow(x, false)).join('') || '<div class="k-empty">Bu hesapta henüz işlem yok</div>';
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
    <div class="coin-row tap" data-coin="${c.k}" data-cur="${cur}">
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
const slDismissed = new Set();
// Kart süsü: yarı saydam yükselen çubuklar + yumuşak eğri + parlayan uç noktası (düşüşte ters yön)
function trendArt(rate, id) {
  const up = rate >= 0, g = `g${id}`;
  const ys = up ? [70, 62, 66, 50, 40, 28, 18] : [20, 30, 26, 42, 52, 62, 72];
  const xs = ys.map((_, i) => 6 + i * 16.3);
  const pts = xs.map((x, i) => [x, ys[i]]);
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], cx = (x0 + x1) / 2; d += ` C${cx} ${y0} ${cx} ${y1} ${x1} ${y1}`; }
  const [ex, ey] = pts.at(-1), halo = up ? '#3ddc84' : '#ff6b6b';
  const bars = [0, 1, 2, 3].map((i) => { const h = up ? 18 + i * 14 : 60 - i * 14; return `<rect x="${14 + i * 24}" y="${96 - h}" width="14" height="${h}" rx="5" fill="#fff" opacity="${0.1 + i * 0.04}"/>`; }).join('');
  return `<svg class="km-ill" viewBox="0 0 112 100" width="112" height="100">
    <defs><linearGradient id="${g}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>
    ${bars}
    <path d="${d} L${ex} 100 L${pts[0][0]} 100Z" fill="url(#${g})"/>
    <path d="${d}" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/>
    <circle cx="${ex}" cy="${ey}" r="11" fill="${halo}" opacity=".35"/><circle cx="${ex}" cy="${ey}" r="5.5" fill="#fff"/><circle cx="${ex}" cy="${ey}" r="2.6" fill="${halo}"/>
  </svg>`;
}
// Ana sayfa "Günün Özeti": Halkbank ana sayfasındaki kaydırmalı bilgi kartları gibi; kişisel durum + kampanya
function renderSlides() {
  const cur = state.cur;
  const held = ASSETS.filter((a) => a.v > 0.005).map((a) => ({ a, c: coinOf(a.k) })).sort((x, y) => y.a.v - x.a.v);
  const val = held.reduce((t, h) => t + h.a.v, 0);
  const chg = held.reduce((t, h) => t + h.a.v - h.a.v / (1 + h.c.ch / 100), 0);
  const pct = val ? (chg / (val - chg)) * 100 : 0;
  const up = held.filter((h) => h.c.ch > 0), down = held.filter((h) => h.c.ch < 0);
  const top = held[0], gainer = [...COINS].sort((x, y) => y.ch - x.ch)[0];
  const favUp = COINS.filter((c) => favs.has(c.k) && c.ch > 0).length;
  const slides = [
    held.length && { id: 'day', tone: 'gold', title: 'Varlıklarınız Bugün', text: `Varlıklarınız bugün <b>%${fmt(Math.abs(pct))}</b> ${pct >= 0 ? 'değer kazandı' : 'değer kaybetti'}; ${up.length} yükselişte, ${down.length} düşüşte.`, act: 'Varlıklarım', attr: 'data-ktabgo="k-assets"', ic: 'i-pie', rate: pct, cap: 'Bugün' },
    top && { id: 'top', tone: 'blue', title: `En Büyük Payınız: ${top.c.c}`, text: `Varlıklarınızın <b>%${fmt((top.a.v / val) * 100, 0)}</b>’i ${nameOf(top.c)}; maliyetinize göre ${top.a.pct >= 0 ? 'kârdasınız' : 'zarardasınız'}.`, act: `${top.c.c} Al/Sat`, attr: `data-ktrade="${top.a.k}/${cur}/buy"`, coin: top.a.k, rate: top.a.pct, cap: 'Kâr / Zarar' },
    { id: 'gain', tone: 'sky', title: `Günün Yükseleni: ${nameOf(gainer)}`, text: `Son 24 saatte <b>%${fmt(gainer.ch)}</b> yükseldi.${held.some((h) => h.a.k === gainer.k) ? ' Portföyünüzde bulunuyor.' : ' Portföyünüzde bulunmuyor.'}`, act: 'İncele', attr: `data-ktrade="${gainer.k}/${cur}/buy"`, coin: gainer.k, rate: gainer.ch, cap: '24 saat' },
    { id: 'promo', tone: 'navy', title: 'Ücretsiz Transfer', text: 'Halkbank’tan Halk Kripto’ya 7/24, anında ve ücretsiz para gönderin.', act: 'Para Yatır', attr: 'data-kpush="k-dep"', ic: 'k-deposit', ratio: '0 TL', cap: 'Ücret' },
    favs.size && { id: 'fav', tone: 'navy', title: 'Favorileriniz', text: `Favori listenizdeki <b>${favs.size}</b> kriptodan ${favUp ? `<b>${favUp}</b>’i yükselişte.` : 'hiçbiri bugün yükselişte değil.'}`, act: 'Favorilerim', attr: 'data-ktab="fav"', ic: 'k-star', ratio: `${favUp}/${favs.size}`, cap: 'Yükselişte' },
  ].filter((x) => x && !slDismissed.has(x.id));
  $('#km-slider').innerHTML = slides.map((x) => `
    <div class="km-sl ${x.tone}">
      <b><svg width="14" height="14"><use href="#k-spark"/></svg>${x.title}</b>
      <p>${x.text}</p>
      <div class="km-sl-btns"><button class="press" data-kslx="${x.id}">Kapat</button><button class="press" ${x.attr}>${x.act}</button></div>
      <span class="km-sl-art">${x.ratio ? `<span class="km-ill-ic"><svg width="44" height="44"><use href="#${x.ic}"/></svg></span>` : trendArt(x.rate, x.id)}</span>
    </div>`).join('');
  $('#km-dots').innerHTML = slides.length > 1 ? slides.map((_, i) => `<i${i ? '' : ' class="on"'}></i>`).join('') : '';
  $('#km-slider').scrollLeft = 0;
}
function renderMarkets() {
  renderMarketCard();
  const quote = state.cur;
  let list = km.list === 'fav' ? COINS.filter((c) => favs.has(c.k)) : [...COINS];
  if (km.sort) {
    const key = { name: (c) => nameOf(c).toLocaleLowerCase('tr-TR'), price: (c) => c.tl, ch: (c) => c.ch }[km.sort];
    list.sort((a, b) => (key(a) > key(b) ? 1 : key(a) < key(b) ? -1 : 0) * km.dir);
  }
  $('#km-list').innerHTML = list.length ? list.map((c) => pairRow(c, quote, km.pm, `data-coin="${c.k}" data-cur="${quote}"`)).join('') : '<div class="k-empty">Favori listeniz boş</div>';
  $$('#km-tabs [data-kml]').forEach((b) => b.classList.toggle('on', b.dataset.kml === km.list));
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
  openCoin(k, q);
}

/* ---------- Varlıklarım ---------- */
// Daha önce işlem yapılmış ama şu an bakiyesi olmayan varlıklar ("Sıfır bakiyeli varlıkları gizle" kapatılınca görünür)
const ZERO = ['usdt', 'avax', 'doge'];
const ka = { hideZero: true, open: { cash: true, crypto: true }, chart: false, sel: null };
const SEG_COLORS = ['#f2a900', '#f0700d', '#02a6e6', '#7fcdf2', '#9aa3ad', '#ffd36b', '#025193'];
// Halkbank Varlıklar ekranındaki gibi iki ana grup: Nakit (mavi) ve Kripto (turuncu-altın)
const GROUP_COLORS = { cash: '#0576b8', crypto: '#f2a900' };
function donut(parts, sel = null) {
  const R = 92, C = 2 * Math.PI * R; let off = 0;
  const segs = parts.map((p, i) => {
    if (!(p.pct > 0)) return '';
    const len = Math.max((p.pct / 100) * C - 2, 1);
    const on = sel === null || sel === i;
    const seg = `<circle data-kaseg="${i}" cx="120" cy="120" r="${R}" fill="none" stroke="${p.color}" stroke-width="${sel === i ? 26 : 20}" stroke-opacity="${on ? 1 : 0.22}" stroke-dasharray="${len} ${C - len}" stroke-dashoffset="${-off}" transform="rotate(-90 120 120)" style="cursor:pointer;transition:stroke-width .2s,stroke-opacity .2s"/>`;
    off += (p.pct / 100) * C; return seg;
  }).join('');
  return `<svg viewBox="0 0 240 240" class="ka-donut-svg"><circle cx="120" cy="120" r="116" fill="none" stroke="#dfe3e8" stroke-width="1.5"/>${segs}</svg>`;
}
function groupHead(id, title, valTL) {
  const cur = state.cur;
  return `<button class="ka-head press" data-kagroup="${id}"><i class="ka-dot" style="background:${GROUP_COLORS[id]}"></i><b>${title}</b><span class="amt">≈ ${fmt(inCur(valTL))} ${cur}</span><svg class="ka-chev" width="14" height="8"><use href="#i-chev-down"/></svg></button>`;
}

function renderAssets() {
  const cur = state.cur, total = cashTL() + state.kripto, tp = portfolioPL(), plv = inCur(tp.pl);
  // Üst kart: önce sayısal cüzdan; isteyen "Varlık Dağılımı" grafiğini açar (Halkbank Varlıklar ekranındaki etkileşim)
  const parts = [{ n: 'Nakit', v: cashTL(), color: '#0576b8' }, ...ASSETS.filter((a) => a.v > 0.005).sort((x, y) => y.v - x.v).map((a, i) => ({ n: coinOf(a.k).c, v: a.v, color: SEG_COLORS[i % SEG_COLORS.length] }))]
    .map((p) => ({ ...p, pct: (p.v / total) * 100 }));
  if (ka.sel !== null && !parts[ka.sel]) ka.sel = null;
  const sp = ka.sel === null ? null : parts[ka.sel];
  $('#ka-total').innerHTML = `
    <div class="acct-head"><svg class="coin-badge" width="17" height="17"><use href="#i-coinbadge"/></svg><span class="name">Toplam Varlığım</span>${eyeHtml()}</div>
    <div class="lbl" style="margin-top:13px">Kripto ve Nakit Bakiye</div>
    <div class="amt-big amt">${money(inCur(total), cur)}</div>
    <div class="pl-row"><span class="lbl">Olası Kar / Zarar</span><b class="${chClass(tp.pct)} amt">%${fmt(Math.abs(tp.pct))}</b><b class="${chClass(tp.pl)} money-sm amt">${signed(plv).split(',')[0]}<small>,${fmt(plv).split(',')[1]} ${cur}</small></b></div>
    <div class="kt-cols ka-cols"><div><span>Nakit Bakiye</span><b class="amt">${money(inCur(cashTL()), cur)}</b></div><div><span>Kripto Bakiye</span><b class="amt">${money(inCur(state.kripto), cur)}</b></div></div>
    <div class="ka-chart${ka.chart ? ' open' : ''}">
      <div class="ka-donut">${donut(parts, ka.sel)}<div><span>${sp ? sp.n : 'Toplam Varlık'}</span><b class="amt">${fmt(inCur(sp ? sp.v : total))} ${cur}</b>${sp ? `<em>%${fmt(sp.pct)}</em>` : ''}</div></div>
      <div class="ka-chips">${parts.map((p, i) => `<button class="press${ka.sel === i ? ' on' : ''}" data-kaseg="${i}" style="--c:${p.color}"><i></i>${p.n} %${fmt(p.pct)}</button>`).join('')}</div>
    </div>
    <hr>
    <button class="see-all press ka-chartbtn" data-kachart>${ka.chart ? 'Varlık Dağılımını Gizle' : 'Varlık Dağılımını Göster'} <svg width="12" height="7"><use href="#i-chev-down"/></svg></button>`;

  const q = $('#ka-q').value.trim().toLocaleLowerCase('tr-TR');
  const match = (...t) => !q || t.join(' ').toLocaleLowerCase('tr-TR').includes(q);
  const open = (id) => !!q || ka.open[id];

  // Nakit
  const cash = [
    { k: 'try', n: 'Türk Lirası', c: 'TL', v: state.nakit, eq: `≈ ${fmt(state.nakit / USD_RATE)} USD` },
    { k: 'usd', n: 'Amerikan Doları', c: 'USD', v: state.nakitUsd, eq: `≈ ${fmt(state.nakitUsd * USD_RATE)} TL` },
  ].filter((r) => match(r.n, r.c));
  $('#ka-cash').classList.toggle('open', open('cash'));
  $('#ka-cash').hidden = !!q && !cash.length;
  $('#ka-cash').innerHTML = groupHead('cash', 'Nakit Varlıklarım', cashTL()) + `
    <div class="ka-body">${cash.map((r) => `
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
    <div class="ka-body">${rows.map((a) => {
      const calc = a.v ? assetCalc(a) : { qty: `0 ${a.c}`, pl: 0 };
      return `
      <div class="asset-row tap" data-coin="${a.k}" data-cur="${cur}">
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
function txTitle(x) { if (x.t === 'wd' && !isCash(x)) return `${assetCode(x.k)} Çekme`; return isCash(x) ? `${assetCode(x.k)} ${TX_TYPE[x.t].n}` : `${assetCode(x.k)}/${txCur(x)}`; }
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
// Liste satırı: Halkbank ana sayfasındaki hesap hareketiyle aynı düzen (tarih kutusu, başlık, tutar)
const MON3 = ['OCA', 'ŞUB', 'MAR', 'NİS', 'MAY', 'HAZ', 'TEM', 'AĞU', 'EYL', 'EKİ', 'KAS', 'ARA'];
// Hareket satırı: Halkbank Hesap Hareketleri düzeni (tarih kutusu, başlık, açıklama, tutar; altta Tekrarla + dekont)
// Kripto çekme satırı: miktar coin cinsinden, açıklamada ağ ve alıcı adres
function cwRow(x, full) {
  const d = new Date(x.ts), [i, f] = fmt(x.q, decOf(x.q) + 2).split(',');
  return `
    <div class="mv kh-mv tap${full ? ' full' : ''}" data-tx="${x.id}">
      <div class="datebox"><span class="m">${MON3[d.getMonth()]}</span><span class="d">${d.getDate()}</span><span class="y">${d.getFullYear()}</span></div>
      <div class="mv-body">
        <div class="mv-top"><b>Kripto Çekme</b><span class="neg amt">-${i}<small>,${f} ${assetCode(x.k)}</small></span></div>
        <div class="mv-bot"><span>${assetCode(x.k)} · ${x.net.toLocaleUpperCase('tr-TR')} · ALICI: ${shortAddr(x.addr)}</span>${full ? '' : `<button class="mv-rc press" data-dekont="${x.id}" aria-label="Dekont"><svg width="17" height="19"><use href="#i-receipt"/></svg></button>`}</div>
        ${full ? `<div class="mv-act"><button class="mv-rc press" data-dekont="${x.id}" aria-label="Dekont"><svg width="17" height="19"><use href="#i-receipt"/></svg></button></div>` : ''}
      </div>
    </div>`;
}
function txRow(x, full = true) {
  if (x.t === 'wd' && !isCash(x)) return cwRow(x, full);
  const d = new Date(x.ts), cancel = x.st === 'cancel', cash = isCash(x);
  const plus = x.t === 'sell' || x.t === 'dep';
  const amt = cash ? x.q : inTx(x, x.t === 'buy' ? x.total + x.fee : x.total - x.fee);
  const cur = cash ? assetCode(x.k) : txCur(x);
  const [i, f] = fmt(amt).split(',');
  const title = cash ? (x.t === 'dep' ? 'Para Yatırma' : 'Para Çekme') : `Kripto ${TX_TYPE[x.t].n}`;
  const up = (t) => t.toLocaleUpperCase('tr-TR');
  const desc = cash ? `HALKBANK VADESİZ ${assetCode(x.k)} HESABINIZ${x.t === 'dep' ? 'DAN GELEN' : 'A GİDEN'}`
    : `${assetCode(x.k)}/${cur} ${up(TX_TYPE[x.t].n)}${cancel ? ' · İPTAL EDİLDİ' : `, FİYAT: ${txPrice(x)}`}`;
  const sub = !cash && !cancel ? `${plus ? '-' : '+'}${qtyText(x)}` : '';
  const again = !cash && !cancel && full ? `<button class="mv-again press" data-ktrade="${x.k}/${cur}/${x.t}">Tekrarla</button>` : '';
  return `
    <div class="mv kh-mv tap${cancel ? ' cancel' : ''}${full ? ' full' : ''}" data-tx="${x.id}">
      <div class="datebox"><span class="m">${MON3[d.getMonth()]}</span><span class="d">${d.getDate()}</span><span class="y">${d.getFullYear()}</span></div>
      <div class="mv-body">
        <div class="mv-top"><b>${title}</b><span class="${cancel ? 'off' : plus ? 'pos' : 'neg'} amt">${plus ? '' : '-'}${i}<small>,${f} ${cur}</small></span></div>
        <div class="mv-bot"><span>${desc}</span>${full ? `<em class="amt">${sub}</em>` : `<button class="mv-rc press" data-dekont="${x.id}" aria-label="Dekont"><svg width="17" height="19"><use href="#i-receipt"/></svg></button>`}</div>
        ${full ? `<div class="mv-act">${again}<button class="mv-rc press" data-dekont="${x.id}" aria-label="Dekont"><svg width="17" height="19"><use href="#i-receipt"/></svg></button></div>` : ''}
      </div>
    </div>`;
}
function renderHistory() {
  // Üst kart: Halkbank Hesap Detayı gibi hesap bilgisi (iki sütun bakiye) + bu ayın özeti
  const now = new Date(), m0 = new Date(now.getFullYear(), now.getMonth(), 1).getTime(), cur = state.cur;
  const month = buildTx().filter((x) => x.ts >= m0 && x.st === 'done');
  const sumTL = (t) => month.filter((x) => x.t === t).reduce((a, x) => a + (x.k === 'usd' ? x.total * USD_RATE : x.total + (x.t === 'buy' ? x.fee : x.t === 'sell' ? -x.fee : 0)), 0);
  renderHistTop();

  // Detaylı Arama'da seçilenler listenin üstünde etiket olarak görünür (dokununca kalkar)
  const tags = [];
  if (kh.period !== '90') tags.push(['period', PERIODS.find((p) => p[0] === kh.period)[1]]);
  if (kh.type !== 'all') tags.push(['type', TYPES.find((p) => p[0] === kh.type)[1]]);
  if (kh.status !== 'all') tags.push(['status', STATUSES.find((p) => p[0] === kh.status)[1]]);
  if (kh.asset !== 'all') tags.push(['asset', assetCode(kh.asset)]);
  $('#kh-active').innerHTML = tags.map(([k, n]) => `<button class="kh-tag press" data-khclear="${k}">${n}<svg width="10" height="10" viewBox="0 0 18 18"><path d="m3 3 12 12M15 3 3 15" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg></button>`).join('');
  $('#kh-badge').hidden = !tags.length;
  $('#kh-badge').textContent = tags.length;

  const list = filteredTx();
  $('#kh-list').classList.toggle('empty', !list.length);
  $('#kh-list').innerHTML = list.length ? list.map((x) => txRow(x, true)).join('')
    : `<div class="kh-empty"><span><svg width="34" height="34"><use href="#k-hist"/></svg></span><b>İşlem bulunamadı</b><p>Seçtiğiniz filtrelere uygun işlem yok.</p><button class="see-all press" data-khreset>Filtreleri Temizle</button></div>`;
}
function renderHfSheet() {
  const d = hfDraft;
  const chips = (arr, key) => arr.map(([k, n]) => `<button class="kh-chip press${d[key] === k ? ' on' : ''}" data-hf="${key}:${k}">${n}</button>`).join('');
  $('#hf-period').innerHTML = chips(PERIODS, 'period');
  $('#hf-type').innerHTML = chips(TYPES, 'type');
  $('#hf-status').innerHTML = chips(STATUSES, 'status');
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
  if (x.t === 'wd' && !cash) {
    const u = assetCode(x.k), q = (v) => `${fmt(v, decOf(v) + 2)} ${u}`;
    main += r('Varlık', `${u} ${assetName(x.k)}`) + r('Ağ', x.net) + r('Tutar', q(x.q));
    extra = r('Alıcı Adres', `<span class="wx-mono">${x.addr}</span>`) + r('Gönderim Yapılan Platform', x.plat) + r('Gönderim Ücreti', q(x.nfee)) + r('Gönderilen Tutar', q(x.q - x.nfee));
    second = `<div class="section-title">GERÇEKLEŞME BİLGİSİ</div><div class="card kh-dcard">${r('Gönderim Tarihi', dt(x.ts + 2000))}${r('Ağ Onayı', 'Tamamlandı')}${r('Gönderilen Tutar', q(x.q - x.nfee))}</div>`;
  } else if (cash) {
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
      ${cash || x.t === 'wd' ? '' : `<button class="btn-primary press" data-kpair=""${x.k}/${txCur(x)}">Tekrar İşlem Yap</button>`}
    </div>`;
  $('#txd-body').dataset.more = more ? '1' : '';
}

// Dekont: Halkbank "Dekont Görüntüleme" sayfası düzeni (demo kullanıcı)
function openDekont(id) {
  const x = buildTx().find((t) => t.id === id), d = new Date(x.ts), cash = isCash(x), cancel = x.st === 'cancel';
  const L = (k, v) => `<div><span>${k}</span>: ${v}</div>`;
  const up = (t) => t.toLocaleUpperCase('tr-TR');
  const p2d = `${p2(d.getDate())}/${p2(d.getMonth() + 1)}/${d.getFullYear()}`;
  let body;
  if (x.t === 'wd' && !cash) {
    const u = assetCode(x.k), q = (v) => `${fmt(v, decOf(v) + 2)} ${u}`;
    body = L('İŞLEM TÜRÜ', 'KRİPTO VARLIK ÇEKME') + L('VARLIK', `${u} ${up(assetName(x.k))}`) + L('AĞ', up(x.net)) + L('ALICI ADRES', x.addr)
      + L('PLATFORM', up(x.plat)) + L('TUTAR', q(x.q)) + L('GÖNDERİM ÜCRETİ', q(x.nfee)) + L('GÖNDERİLEN', q(x.q - x.nfee));
  } else if (cash) {
    body = L('İŞLEM TÜRÜ', x.t === 'dep' ? 'HALK KRİPTO PARA YATIRMA' : 'HALK KRİPTO PARA ÇEKME')
      + L(x.t === 'dep' ? 'GÖNDEREN HESAP' : 'ALICI HESAP', `HALKBANK VADESİZ ${assetCode(x.k)} HESABI`)
      + L('İŞLEM TUTARI', `${fmt(x.q)} ${assetCode(x.k)}`) + L('İŞLEM ÜCRETİ', `0,00 ${assetCode(x.k)}`);
  } else {
    const cur = txCur(x);
    body = L('İŞLEM TÜRÜ', `KRİPTO VARLIK ${up(TX_TYPE[x.t].n)}`) + L('İŞLEM ÇİFTİ', `${assetCode(x.k)}/${cur}`)
      + L('MİKTAR', up(qtyText(x))) + L('FİYAT', cancel ? '-' : txPrice(x)) + L('TUTAR', cancel ? '-' : txMoney(x, x.total))
      + L('KOMİSYON (%0,20)', cancel ? '-' : txMoney(x, x.fee)) + L(x.t === 'buy' ? 'HESAPTAN ÇIKAN' : 'HESABA GEÇEN', cancel ? '-' : (x.t === 'buy' ? outAmt(x) : inAmt(x)))
      + L('İŞLEM DURUMU', cancel ? 'İPTAL EDİLDİ' : 'GERÇEKLEŞTİ');
  }
  $('#kdk-paper').innerHTML = `
    <div class="kdk-page">1 / 1</div>
    <div class="kdk-doc">
      <div class="kdk-top"><img src="icons/icon-180.png" alt=""><b>HALK KRİPTO</b><span>DEKONT</span></div>
      <div class="kdk-box kdk-2">
        <div>${L('MÜŞTERİ NO', CUSTOMER_NO)}${L('AD SOYAD', 'DENİZ YILMAZ')}${L('HESAP', 'HK 48215903')}</div>
        <div>${L('İŞLEM TARİHİ', `${p2d} - ${d.toTimeString().slice(0, 5)}`)}${L('VALÖR TARİHİ', p2d)}${L('İŞLEM KANALI', 'MOBİL')}</div>
        <div class="kdk-qr">${qrSVG(x.id).replace('width="220" height="220"', 'width="54" height="54"')}</div>
      </div>
      <div class="kdk-box">${body}</div>
      <div class="kdk-box">${L('REFERANS', x.id)}</div>
      <p class="kdk-foot">Halk Kripto Varlık Alım Satım Platformu A.Ş. · Demo amaçlıdır.<br>Bu dekont bilgi amaçlıdır. Kayıtlar arasında farklılık olması halinde Halk Kripto kayıtları geçerlidir.</p>
    </div>`;
  closeSheet();
  pushScreen('k-dekont');
}

/* ---------- Profil ---------- */
// Limitler: kullanılan tutar demo; günlük alım kullanımı geçmişteki bugünkü/dünkü alımlarla uyumlu
const LIMITS = {
  d: [['Kripto Alış', 1774.54, 250000], ['Kripto Satış', 0, 250000], ['TL Yatırma', 0, 500000], ['TL Çekme', 0, 100000], ['Kripto Transfer (Gönderme)', 0, 50000]],
  m: [['Kripto Alış', 23128.04, 2500000], ['Kripto Satış', 35770, 2500000], ['TL Yatırma', 15000, 5000000], ['TL Çekme', 5000, 1000000], ['Kripto Transfer (Gönderme)', 0, 500000]],
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
  // İstenen yön her zaman açılır; satılacak varlık yoksa Satış sekmesinde bilgi notu görünür
  Object.assign(tr, { k, cur: cur === 'USD' ? 'USD' : 'TL', side: side === 'sell' ? 'sell' : 'buy', qty: 0, amt: 0, drift: 1, upd: new Date() });
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
      <div class="kt-cols">${balCol('Kullanılabilir Bakiye', money(cashOf(cur), cur))}${balCol(`${cur === 'TL' ? 'USD' : 'TL'} Karşılığı`, money(cur === 'TL' ? cashOf(cur) / USD_RATE : cashOf(cur) * USD_RATE, cur === 'TL' ? 'USD' : 'TL'))}</div>
    </button>`;
}
function assetCard(k, sell) {
  const c = coinOf(k), q = holdQty(k);
  if (!q && sell) {
    return `<div class="card kt-note"><span class="kt-note-ic"><svg width="22" height="22"><use href="#i-info"/></svg></span><span><b>Halk Kripto ${c.c} Hesabı</b><small>Satılabilir ${c.c} varlığınız bulunmuyor.</small></span></div>`;
  }
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
    addNotif({ k: 'trade', title: 'İşleminiz Gerçekleşti', text: `${fmt(tr.qty, qtyDec(c))} ${c.c} ${buy ? 'alış' : 'satış'} işleminiz gerçekleşti.`, go: { tx: id } });
    $('#ktr-text').innerHTML = buy
      ? `Halk Kripto ${cur} Hesabınızdan <b>${fmt(total)} ${cur}</b> karşılığında <b>${fmt(tr.qty, qtyDec(c))} ${c.c}</b> alınmıştır.`
      : `<b>${fmt(tr.qty, qtyDec(c))} ${c.c}</b> satılarak Halk Kripto ${cur} Hesabınıza <b>${fmt(total)} ${cur}</b> aktarılmıştır.`;
    $('#ktr-text').innerHTML += `<span class="ktr-fill">İşlem fiyatı: <b>${fmt(p, priceDec(p))} ${cur}</b></span>`;
    $('#ktr-ref').textContent = id;
    renderTotal(); renderList(); renderAssets(); renderHomeMoves();
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
  if (next === 'info' || next === 'wd') dep.net = 0;
  if (next === 'wdchange') dep.net = wd.net;
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

/* ---------- Bildirimler (Profil içinde; okunmamış sayısı fotoğraf rozetinde) ---------- */
const NOTIF_KIND = {
  alarm: { icon: 'i-bell', color: 'var(--blue)' }, trade: { icon: 'i-transfer', color: 'var(--green)' },
  dep: { icon: 'k-deposit', color: 'var(--blue)' }, promo: { icon: 'k-mega', color: 'var(--orange)' },
};
const notifs = [
  { id: 'n1', k: 'alarm', title: 'Fiyat Alarmı', text: 'Bitcoin 4.000.000 TL seviyesinin üzerine çıktı.', ts: Date.now() - 35 * 60e3, read: false, go: { trade: 'btc' } },
  { id: 'n2', k: 'trade', title: 'İşleminiz Gerçekleşti', text: '0,35 SOL alış işleminiz gerçekleşti.', ts: Date.now() - 864e5, read: false, go: { tx: 'HK48213907' } },
  { id: 'n3', k: 'dep', title: 'Para Yatırma', text: '15.000,00 TL Halk Kripto TL hesabınıza geçti.', ts: Date.now() - 4 * 864e5, read: true },
  { id: 'n4', k: 'promo', title: 'Kampanya', text: 'Halkbank hesabınızdan Halk Kripto’ya 7/24 ücretsiz para gönderebilirsiniz.', ts: Date.now() - 6 * 864e5, read: true },
];
function agoText(ts) {
  const m = Math.round((Date.now() - ts) / 60e3);
  if (m < 1) return 'Şimdi';
  if (m < 60) return `${m} dk önce`;
  if (m < 1440) return `${Math.round(m / 60)} saat önce`;
  const d = Math.round(m / 1440);
  return d === 1 ? 'Dün' : `${d} gün önce`;
}
function updateBadges() {
  const n = notifs.filter((x) => !x.read).length;
  $$('[data-nbadge]').forEach((b) => { b.textContent = n; b.hidden = !n; });
  const sub = $('#kp-notif-sub'); if (sub) sub.textContent = n ? `${n} okunmamış bildiriminiz var` : 'Yeni bildiriminiz yok';
}
function renderNotifs() {
  $('#kn-list').innerHTML = `<div class="card kn-card">${notifs.sort((a, b) => b.ts - a.ts).map((x) => `
    <button class="kn-row press${x.read ? '' : ' unread'}" data-knotif="${x.id}">
      <span class="kn-ic" style="background:${NOTIF_KIND[x.k].color}"><svg width="16" height="16"><use href="#${NOTIF_KIND[x.k].icon}"/></svg></span>
      <span class="kn-txt"><b>${x.title}</b><span>${x.text}</span><small>${agoText(x.ts)}</small></span>
      ${x.read ? '' : '<i class="kn-dot"></i>'}
    </button>`).join('')}</div>`;
  updateBadges();
}
function addNotif(n) { notifs.unshift({ id: `n${Date.now()}`, ts: Date.now(), read: false, ...n }); updateBadges(); }

/* ---------- Kripto detay (../coin.js) ---------- */
function openCoin(k, cur) {
  cd.k = k; cd.cur = cur === 'USD' ? 'USD' : 'TL'; cd.range = '1S';
  $('#cd-buy').dataset.ktrade = `${k}/${cd.cur}/buy`;
  $('#cd-sell').dataset.ktrade = `${k}/${cd.cur}/sell`;
  setSeg('ozet');
  renderCoin();
  if (!stack.includes('coin')) pushScreen('coin');
  $('#coin-scroll').scrollTop = 0;
}

/* ---------- Çek (para ve kripto çekme) ---------- */
// Kimlik doğrulama adımları demoda atlanır; kullanıcının kayıtlı hesap/adresleri varmış gibi davranılır.
const BANK_ACC = {
  TL: { name: 'Halkbank Vadesiz TL Hesabım', iban: 'TR12 0001 2009 1658 0011 0684 50' },
  USD: { name: 'Halkbank Vadesiz USD Hesabım', iban: 'TR85 0001 2009 1658 0011 0685 21' },
};
const PLATFORMS = ['Kişisel Cüzdan (MetaMask)', 'Kişisel Cüzdan (Ledger)', 'Binance TR', 'BTCTurk', 'Paribu', 'OKX TR', 'Bitexen', 'Diğer'];
const PURPOSES = ['Kendi cüzdanlarım arasında saklama amaçlı transfer', 'Kendi hesabıma alım-satım amaçlı transfer', 'Diğer'];
const SENDTO = ['Kendi Cüzdanıma Transfer', 'Başkasının Cüzdanına Transfer'];
const WD_STEPS = { fiat: ['Bilgiler', 'Onay', 'Doğrulama'], crypto: ['Adres', 'Alıcı', 'Onay', 'Doğrulama'] };
const wd = { kind: 'fiat', k: 'try', cur: 'TL', net: 0, step: 0, amt: '', saved: 0, own: true, addr: '', plat: 0, name: 'Deniz', sur: 'Yılmaz', sendto: 0, purpose: 0, decl: false, code: '', id: '' };
let wdTimer = null, wdLeft = 0, infoCb = null, pickCb = null;

function savedAddrs(k, net) {
  const f = netsOf(k)[net][1], c = coinOf(k);
  const wallet = f === 'btc' || f === 'ltc' || f === 'doge' ? 1 : 0;
  return [
    { label: `${wallet ? 'Ledger' : 'MetaMask'} Cüzdanım`, addr: fakeAddr(`${k}w1`, f), plat: wallet },
    { label: `Binance TR ${c.c} Adresim`, addr: fakeAddr(`${k}w2`, f), plat: 2 },
  ];
}
const coinBal = (k) => holdQty(k);
const netFee = (k) => { const usd = coinOf(k).tl / USD_RATE, raw = 1.5 / usd, mag = 10 ** Math.floor(Math.log10(raw)); return Math.ceil(raw / mag) * mag; };
const decOf = (v) => (v < 1 ? Math.min(8, String(v).split('.')[1]?.length || 2) : 2);
const shortAddr = (a) => `${a.slice(0, 6)}…${a.slice(-5)}`;

function renderWdList() {
  $('#kw-fiat').innerHTML = ['TL', 'USD'].map((cur) => {
    const v = cashOf(cur);
    return `<button class="kd-row press" data-wdfiat="${cur}">${coinIcon(cur === 'USD' ? 'usd' : 'try')}<span><b>${cur}</b> ${cur === 'USD' ? 'Amerikan Doları' : 'Türk Lirası'}</span><em class="kw-bal amt">${fmt(v)} ${cur}<small>${cur === 'USD' ? `≈ ${fmt(v * USD_RATE)} TL` : `≈ ${fmt(v / USD_RATE)} USD`}</small></em><svg class="kp-chev" width="7" height="12"><use href="#i-chev-right"/></svg></button>`;
  }).join('');
  const held = ASSETS.filter((a) => a.v > 0.005).sort((x, y) => y.v - x.v);
  $('#kw-list').innerHTML = held.map((a) => {
    const c = coinOf(a.k), q = coinBal(a.k);
    return `<button class="kd-row press" data-wdcoin="${a.k}">${coinIcon(a.k)}<span><b>${c.c}</b> ${nameOf(c)}</span><em class="kw-bal amt">${fmt(q, qtyDec(c))} ${c.c}<small>≈ ${fmt(a.v)} TL</small></em><svg class="kp-chev" width="7" height="12"><use href="#i-chev-right"/></svg></button>`;
  }).join('') || '<div class="k-empty">Çekilebilir kripto varlığınız yok</div>';
}
function showInfo(title, items, btn, cb) {
  $('#di-title').textContent = title;
  $('#di-list').innerHTML = items.map((t) => `<li>${t}</li>`).join('');
  $('#di-ok').textContent = btn;
  infoCb = cb;
  openSheet('dinfo-sheet');
}
function startWdFiat(cur) {
  Object.assign(wd, { kind: 'fiat', k: cur === 'USD' ? 'usd' : 'try', cur, step: 0, amt: '', saved: 0, own: true, decl: true, code: '' });
  wd.addr = BANK_ACC[cur].iban;
  showInfo(`Halk Kripto’dan ${cur} transferi yapmadan önce bilmeniz gerekenler`, [
    `Yalnızca <b>kendinize ait</b> ${cur} banka hesaplarına transfer yapabilirsiniz.`,
    'IBAN’ın eksik veya hatalı olması durumunda transferiniz gerçekleşmeyecektir.',
    'Üçüncü kişilere ait hesaplara transfer yapılmamaktadır.',
    'Halkbank hesaplarınıza yapılan transferler 7/24 anında hesabınıza geçer.',
  ], 'Anladım, Devam Et', openWdx);
}
function startWdCrypto(k) {
  Object.assign(wd, { kind: 'crypto', k, cur: coinOf(k).c, net: 0, step: 0, amt: '', saved: 0, plat: 0, name: 'Deniz', sur: 'Yılmaz', sendto: 0, purpose: 0, decl: false, code: '' });
  showInfo('Halk Kripto’dan transfer yapmadan önce bilmeniz gerekenler', [
    'Diğer platformlara yapacağınız çekme işlemlerini;<ol><li>Kimlik bilgilerinizle adınıza açılan,</li><li>Kripto Varlık Hizmet Sağlayıcı kuruluş tarafından sunulan</li></ol>bir hesaba yapabilirsiniz.',
    'Kişisel cüzdanlarınıza yapacağınız transferlerde cüzdanın size ait olduğunu beyan etmeniz gerekir.',
    'Seçtiğiniz ağ ile alıcı platformun desteklediği ağın <b>aynı olduğundan</b> emin olun; hatalı ağ ile yapılan transferler geri alınamaz.',
  ], 'Anladım, Devam Et', () => {
    if (netsOf(k).length > 1) return openNetSheet(k, 'wd');
    pickSaved(0); openWdx();
  });
}
function pickSaved(i) {
  wd.saved = i;
  if (i < 0) { wd.addr = ''; wd.plat = 7; return; }
  const s = savedAddrs(wd.k, wd.net)[i];
  wd.addr = s.addr; wd.plat = s.plat; wd.sendto = 0; wd.purpose = s.plat >= 2 ? 1 : 0;
}
function openWdx() {
  wd.step = 0;
  renderWdx();
  if (!stack.includes('k-wdx')) pushScreen('k-wdx');
}
function openPick(title, opts, sel, cb) {
  $('#wxp-title').textContent = title;
  $('#wxp-list').innerHTML = opts.map((o, i) => `<button class="opt press${i === sel ? ' on' : ''}" data-wxp="${i}"><span class="lbl2"><b>${o.label}</b>${o.sub ? `<span>${o.sub}</span>` : ''}</span><i class="radio"></i></button>`).join('');
  pickCb = cb;
  openSheet('wx-pick');
}

const wxRow = (label, val, attr = '', chev = false, cls = '') => `<button class="wx-field press ${cls}" ${attr}><span>${label}</span><b>${val}</b>${chev ? '<svg class="kp-chev" width="7" height="12"><use href="#i-chev-right"/></svg>' : ''}</button>`;
const sumRow = (a, b) => `<div class="sum-row"><span>${a}</span><b>${b}</b></div>`;
function wdNums() {
  const v = parseNum(wd.amt);
  if (wd.kind === 'fiat') return { v, fee: 0, send: v, max: cashOf(wd.cur), min: 1 };
  const fee = netFee(wd.k), min = netsOf(wd.k)[wd.net][2];
  return { v, fee, send: Math.max(0, v - fee), max: coinBal(wd.k), min };
}
function wdError() {
  const { v, max, min, fee } = wdNums(), u = wd.kind === 'fiat' ? wd.cur : coinOf(wd.k).c;
  if (!v) return '';
  if (v > max * 1.000001) return `Yetersiz bakiye. Çekilebilir: ${fmt(max, wd.kind === 'fiat' ? 2 : qtyDec(coinOf(wd.k)))} ${u}`;
  if (v < min) return `Minimum işlem tutarı ${fmt(min, decOf(min))} ${u}`;
  if (wd.kind === 'crypto' && v <= fee) return 'Tutar gönderim ücretinden büyük olmalıdır';
  return '';
}
function renderWdx() {
  const fiat = wd.kind === 'fiat', c = fiat ? null : coinOf(wd.k), unit = fiat ? wd.cur : c.c;
  const steps = WD_STEPS[wd.kind], done = wd.step >= steps.length;
  $('#wx-title').textContent = `${unit} Çek`;
  $('#wx-steps').hidden = done;
  $('#wx-steps').innerHTML = steps.map((n, i) => `<div class="${i < wd.step ? 'done' : i === wd.step ? 'on' : ''}"><i>${i < wd.step ? '<svg width="12" height="10" viewBox="0 0 12 10"><path d="m1.5 5 3 3 6-6.5" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>' : i + 1}</i><span>${n}</span></div>`).join('');
  $('#k-wdx [data-wdback]').hidden = done;
  stopWdTimer(); $('#wx-notif').classList.remove('show');
  const B = $('#wx-body'), N = wdNums(), err = wdError();
  const asset = `<div class="card wx-asset">${coinIcon(fiat ? wd.k : wd.k)}<div><span>${fiat ? 'Varlık' : 'Kripto Varlık'}</span><b>${unit} ${fiat ? (wd.cur === 'USD' ? 'Amerikan Doları' : 'Türk Lirası') : nameOf(c)}</b></div><em><small>Kullanılabilir Bakiye</small><b class="amt">${fmt(N.max, fiat ? 2 : qtyDec(c))} ${unit}</b></em></div>`;
  const amountBox = `
    <label class="kt-in wx-amt"><input id="wx-amt" inputmode="decimal" autocomplete="off" placeholder="Tutar" value="${wd.amt}"><span>${unit}</span></label>
    <div class="wx-hints"><span>Minimum İşlem Tutarı: ${fmt(N.min, fiat ? 2 : decOf(N.min))} ${unit}</span><button class="see-all press" data-wdall>Tüm bakiyemi kullan</button></div>
    ${err ? `<div class="kt-err wx-err">${err}</div>` : ''}
    <div class="card wx-total">${sumRow('Gönderim Ücreti', `${fmt(N.fee, fiat ? 2 : decOf(N.fee))} ${unit}`)}${sumRow('Gönderilecek Tutar', `${fmt(N.send, fiat ? 2 : decOf(N.min) + 2)} ${unit}`)}</div>`;
  const go = (label, ok, attr = 'data-wdnext') => `<div class="kt-go-wrap"><button class="btn-primary press" ${attr} ${ok ? '' : 'disabled'}>${label}</button></div>`;
  const okAmt = N.v > 0 && !err;

  if (done) {
    const sent = fmt(N.v, fiat ? 2 : decOf(N.min) + 2);
    B.innerHTML = `
      <div class="card res-card wx-res">
        <div class="check pop"><i><svg width="40" height="28"><use href="#i-check"/></svg></i></div>
        <h2>${fiat ? 'Para çekme talebiniz alındı.' : 'Kripto çekme talebiniz alındı.'}</h2>
        <p>${fiat ? `${sent} ${unit} tutarındaki para çekme işleminiz ${BANK_ACC[wd.cur].name.replace('Hesabım', 'Hesabınıza')} gönderildi.` : `${sent} ${unit} tutarındaki kripto çekme talebiniz alındı. Ağ onayları tamamlanınca alıcı adrese ulaşacaktır.`}</p>
        <p class="ref">İşlem No: ${wd.id}</p>
        <div class="res-btns">
          <button class="btn-row press" data-dekont="${wd.id}"><svg width="17" height="19" style="color:#fff"><use href="#i-receipt"/></svg>Dekont Görüntüle</button>
          <button class="btn-row press" data-wdhist><svg width="20" height="20"><use href="#t-tx"/></svg>İşlem Geçmişi</button>
          <button class="btn-row press" data-kpopall><svg width="20" height="20"><use href="#t-home"/></svg>Ana Sayfaya Dön</button>
        </div>
      </div>`;
    return;
  }
  const last = steps.length - 1;
  if (wd.step === last) {
    // SMS doğrulama
    B.innerHTML = `
      <div class="wx-lead"><b>Çekme işleminizi doğrulayın.</b><p><b>+90 5** *** ** 47</b> telefon numarasına gönderilen 6 haneli doğrulama kodunu girin.</p></div>
      <label class="kt-in wx-code"><span class="wx-code-l">SMS Doğrulama Kodu</span><input id="wx-code" inputmode="numeric" maxlength="6" autocomplete="one-time-code" value="${wd.code}"><em class="wx-timer"><svg width="18" height="18" viewBox="0 0 20 20"><circle cx="10" cy="11" r="7.2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M10 7.5V11l2.4 1.6M7.5 1.8h5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg><small>Kalan Süre</small><b id="wx-left">03:00</b></em></label>
      <button class="see-all press wx-resend" data-wdresend disabled>Tekrar Kod Gönder</button>
      ${go('Onayla', wd.code.length === 6, 'data-wdfinish')}`;
    startWdTimer();
    setTimeout(() => showSmsBanner(), 900);
    return;
  }
  if (fiat && wd.step === 0) {
    B.innerHTML = asset
      + wxRow('Kayıtlı Hesaplar', wd.saved >= 0 ? BANK_ACC[wd.cur].name : 'Kayıtlı hesaptan seç', 'data-wdsaved', true)
      + `<label class="kt-in wx-iban"><span class="wx-code-l">IBAN</span><input id="wx-iban" autocomplete="off" value="${wd.addr}"></label>
      <label class="wx-check"><input type="checkbox" id="wx-own" ${wd.own ? 'checked' : ''}><i></i><span>Gönderim yapacağım banka hesabı bana aittir.</span></label>`
      + amountBox + go('Devam', okAmt && wd.own && wd.addr.replace(/\s/g, '').length >= 26);
    return;
  }
  if (fiat && wd.step === 1) {
    B.innerHTML = `<div class="wx-lead"><b>İşleminizi onaylayın.</b></div><div class="card sum-card">
      ${sumRow('Varlık', `${unit} ${wd.cur === 'USD' ? 'Amerikan Doları' : 'Türk Lirası'}`)}${sumRow('Alıcı Hesap', BANK_ACC[wd.cur].name)}${sumRow('IBAN', wd.addr)}${sumRow('Tutar', `${fmt(N.v)} ${unit}`)}${sumRow('Gönderim Ücreti', `0,00 ${unit}`)}${sumRow('Gönderilecek Tutar', `${fmt(N.send)} ${unit}`)}</div>
      ${go('Onayla', true)}<div class="kt-go-wrap wx-edit"><button class="btn-secondary press" data-wdback>Düzenle</button></div>`;
    return;
  }
  const [netName] = netsOf(wd.k)[wd.net], saved = savedAddrs(wd.k, wd.net);
  if (wd.step === 0) {
    B.innerHTML = asset
      + wxRow('Ağ', netName, 'data-wdnet', false, 'info')
      + wxRow('Kayıtlı Adresler', wd.saved >= 0 ? saved[wd.saved].label : 'Kayıtlı adresten seç (zorunlu değil)', 'data-wdsaved', true)
      + `<label class="kt-in wx-iban"><span class="wx-code-l">Alıcı Adres</span><input id="wx-addr" autocomplete="off" value="${wd.addr}" placeholder="Adres girin"><button class="wx-qr press" data-wdqr aria-label="QR okut"><svg width="22" height="22"><use href="#i-qr"/></svg></button></label>`
      + wxRow('Gönderim Yapılan Platform', PLATFORMS[wd.plat], 'data-wdplat', true)
      + amountBox + go('Devam', okAmt && wd.addr.length > 20);
    return;
  }
  if (wd.step === 1) {
    B.innerHTML = `<div class="wx-lead"><b>Alıcı bilgilerini girin.</b><p>Kayıtlı adresiniz için bilgiler otomatik dolduruldu.</p></div>
      <label class="kt-in wx-iban"><span class="wx-code-l">Alıcının Adı</span><input id="wx-name" value="${wd.name}"></label>
      <label class="kt-in wx-iban"><span class="wx-code-l">Alıcının Soyadı</span><input id="wx-sur" value="${wd.sur}"></label>
      ${wxRow('Adres Gönderimi', SENDTO[wd.sendto], 'data-wdsend', true)}${wxRow('İşlem Amacı', PURPOSES[wd.purpose], 'data-wdpurp', true)}
      <label class="wx-check card"><input type="checkbox" id="wx-decl" ${wd.decl ? 'checked' : ''}><i></i><span>Yukarıda belirttiğim bilgilerin doğruluğunu ve gönderim yapacağım hesabın bana ait olduğunu beyan ederim.</span></label>
      ${go('Devam', wd.decl && wd.name.trim() && wd.sur.trim())}`;
    return;
  }
  if (wd.step === 2) {
    B.innerHTML = `<div class="wx-lead"><b>Lütfen işleminizi onaylayın.</b></div><div class="card sum-card">
      ${sumRow('Kripto Varlık', `${c.c} ${nameOf(c)}`)}${sumRow('Ağ', netName)}${sumRow('Alıcı Adres', `<span class="wx-mono">${wd.addr}</span>`)}${sumRow('Gönderim Yapılan Platform', PLATFORMS[wd.plat])}${sumRow('Alıcı', `${wd.name} ${wd.sur}`)}${sumRow('Adres Gönderimi', SENDTO[wd.sendto])}${sumRow('İşlem Amacı', PURPOSES[wd.purpose])}${sumRow('Tutar', `${fmt(N.v, decOf(N.min) + 2)} ${unit}`)}${sumRow('Gönderim Ücreti', `${fmt(N.fee, decOf(N.fee))} ${unit}`)}${sumRow('Gönderilecek Tutar', `${fmt(N.send, decOf(N.min) + 2)} ${unit}`)}</div>
      <p class="wx-warn">Ağ onay süreçleri tamamlanmış bir transferin durdurulması veya iptali teknik olarak mümkün değildir.</p>
      <div class="k-info ka-note"><svg width="20" height="20"><use href="#i-info"/></svg><span>Transferinizin tamamlanma süresi ağ yoğunluğuna bağlı olarak değişiklik gösterebilir (${netsOf(wd.k)[wd.net][3]}).</span></div>
      ${go('SMS Onayı İle Devam Et', true)}<div class="kt-go-wrap wx-edit"><button class="btn-secondary press" data-wdedit>Düzenle</button></div>`;
  }
}
function stopWdTimer() { clearInterval(wdTimer); wdTimer = null; }
function startWdTimer() {
  wdLeft = 180;
  const tick = () => {
    const m = String(Math.floor(wdLeft / 60)).padStart(2, '0'), s2 = String(wdLeft % 60).padStart(2, '0');
    const el = $('#wx-left'); if (el) el.textContent = `${m}:${s2}`;
    if (wdLeft <= 0) { stopWdTimer(); const r = $('[data-wdresend]'); if (r) r.disabled = false; }
    wdLeft -= 1;
  };
  tick(); wdTimer = setInterval(tick, 1000);
}
// Demo: SMS geldi gibi üstte bildirim; dokununca kod otomatik dolar
function showSmsBanner() {
  if (!stack.includes('k-wdx') || wd.step !== WD_STEPS[wd.kind].length - 1) return;
  wd.sms = String(100000 + Math.floor(Math.random() * 899999));
  $('#wx-notif').innerHTML = `<img src="icons/icon-180.png" alt=""><div><b>HALK KRİPTO <small>şimdi</small></b><span>Çekme işleminiz için doğrulama kodunuz: <b>${wd.sms}</b>. Bu kodu kimseyle paylaşmayınız.</span></div>`;
  $('#wx-notif').classList.add('show');
  setTimeout(() => $('#wx-notif').classList.remove('show'), 6000);
}
function wdFinish() {
  const N = wdNums(), fiat = wd.kind === 'fiat';
  const id = `HK${48300000 + Math.floor(Math.random() * 90000)}`;
  state.ktx = state.ktx || [];
  if (fiat) {
    if (wd.cur === 'USD') state.nakitUsd -= N.v; else state.nakit -= N.v;
    // Halkbank'tan açıldıysa para Halkbank vadesiz hesabına geçer
    if (embedded && state.moves) {
      if (wd.cur === 'USD') state.usd = (state.usd || 0) + N.v; else { state.vadesiz += N.v; state.kredili += N.v; }
      const d = new Date(), MON = ['OCA', 'ŞUB', 'MAR', 'NİS', 'MAY', 'HAZ', 'TEM', 'AĞU', 'EYL', 'EKİ', 'KAS', 'ARA'];
      state.moves.unshift({ m: MON[d.getMonth()], d: d.getDate(), y: d.getFullYear(), t: 'Para Transferi', s: 'HALK KRİPTO HESABINDAN GELEN', a: N.v, cur: wd.cur });
    }
    state.ktx.push({ t: 'wd', k: wd.k, q: N.v, total: N.v, fee: 0, st: 'done', ts: Date.now(), id, cur: wd.cur, iban: wd.addr });
    LIMITS.d[3][1] += wd.cur === 'USD' ? N.v * USD_RATE : N.v; LIMITS.m[3][1] += wd.cur === 'USD' ? N.v * USD_RATE : N.v;
  } else {
    const a = ASSETS.find((x) => x.k === wd.k), c = coinOf(wd.k);
    const left = coinBal(wd.k) - N.v;
    a.v = left <= coinBal(wd.k) * 0.0005 ? 0 : left * c.tl;
    if (a.v < 0.005) { a.v = 0; ASSETS.splice(ASSETS.indexOf(a), 1); if (!ZERO.includes(a.k)) ZERO.unshift(a.k); }
    state.kripto = ASSETS.reduce((t, x) => t + x.v, 0);
    state.ktx.push({ t: 'wd', k: wd.k, q: N.v, p: c.tl, total: N.v * c.tl, fee: 0, nfee: N.fee, st: 'done', ts: Date.now(), id, cur: 'TL', addr: wd.addr, net: netsOf(wd.k)[wd.net][0], plat: PLATFORMS[wd.plat] });
    LIMITS.d[4][1] += N.v * c.tl; LIMITS.m[4][1] += N.v * c.tl;
  }
  wd.id = id;
  addNotif({ k: 'dep', title: fiat ? 'Para Çekme' : 'Kripto Çekme', text: `${fmt(N.v, fiat ? 2 : decOf(N.min) + 2)} ${fiat ? wd.cur : coinOf(wd.k).c} çekme talebiniz alındı.`, go: { tx: id } });
  renderTotal(); renderList(); renderAssets(); renderHomeMoves();
  wd.step = WD_STEPS[wd.kind].length;
  renderWdx();
  $('#wx-scroll').scrollTop = 0;
}
function wdInput(e) {
  const t = e.target;
  if (t.id === 'wx-amt') { wd.amt = t.value; const keep = t.selectionStart; renderWdxKeep('#wx-amt', keep); }
  else if (t.id === 'wx-iban') { wd.addr = t.value.toUpperCase(); wd.saved = -1; renderWdxKeep('#wx-iban', t.selectionStart); }
  else if (t.id === 'wx-addr') { wd.addr = t.value.trim(); wd.saved = -1; renderWdxKeep('#wx-addr', t.selectionStart); }
  else if (t.id === 'wx-name') { wd.name = t.value; renderWdxKeep('#wx-name', t.selectionStart); }
  else if (t.id === 'wx-sur') { wd.sur = t.value; renderWdxKeep('#wx-sur', t.selectionStart); }
  else if (t.id === 'wx-code') { wd.code = t.value.replace(/\D/g, '').slice(0, 6); t.value = wd.code; const b = $('[data-wdfinish]'); if (b) b.disabled = wd.code.length < 6; }
}
// Yazarken yeniden çizim odak kaybettirmesin
function renderWdxKeep(sel, pos) {
  if (wd.step === WD_STEPS[wd.kind].length - 1) return;
  const sc = $('#wx-scroll').scrollTop;
  renderWdx();
  const el = $(sel); if (el) { el.focus(); try { el.setSelectionRange(pos, pos); } catch (e) { /* number input */ } }
  $('#wx-scroll').scrollTop = sc;
}
function wdClick(b) {
  const d = b.dataset;
  if (d.wdfiat) { startWdFiat(d.wdfiat); return true; }
  if (d.wdcoin) { startWdCrypto(d.wdcoin); return true; }
  if (b.hasAttribute('data-wdback')) { if (wd.step > 0 && wd.step < WD_STEPS[wd.kind].length) { wd.step -= 1; wd.code = ''; renderWdx(); } else { stopWdTimer(); popScreen(); } return true; }
  if (b.hasAttribute('data-wdedit')) { wd.step = 0; renderWdx(); return true; }
  if (b.hasAttribute('data-wdnext')) { wd.step += 1; wd.code = ''; renderWdx(); $('#wx-scroll').scrollTop = 0; return true; }
  if (b.hasAttribute('data-wdfinish')) { b.disabled = true; b.textContent = 'İşleniyor…'; stopWdTimer(); setTimeout(wdFinish, 800); return true; }
  if (b.hasAttribute('data-wdall')) { const N = wdNums(); wd.amt = fmt(N.max, wd.kind === 'fiat' ? 2 : qtyDec(coinOf(wd.k))); renderWdx(); return true; }
  if (b.hasAttribute('data-wdresend')) { b.disabled = true; startWdTimer(); showSmsBanner(); return true; }
  if (b.hasAttribute('data-wdqr')) { toast('Kamera ile QR okutma bu demoda yer almıyor'); return true; }
  if (b.hasAttribute('data-wdhist')) { popAll(); showTab('k-history'); return true; }
  if (b.id === 'wx-notif' || b.closest('#wx-notif')) { wd.code = wd.sms; const i = $('#wx-code'); if (i) { i.value = wd.code; } const f = $('[data-wdfinish]'); if (f) f.disabled = false; $('#wx-notif').classList.remove('show'); return true; }
  if (b.hasAttribute('data-wdnet')) { openNetSheet(wd.k, 'wdchange'); return true; }
  if (b.hasAttribute('data-wdsaved')) {
    if (wd.kind === 'fiat') openPick('Kayıtlı Hesaplar', [{ label: BANK_ACC[wd.cur].name, sub: BANK_ACC[wd.cur].iban }], wd.saved, () => { wd.saved = 0; wd.addr = BANK_ACC[wd.cur].iban; wd.own = true; });
    else openPick('Kayıtlı Adresler', savedAddrs(wd.k, wd.net).map((s) => ({ label: s.label, sub: shortAddr(s.addr) })), wd.saved, (i) => pickSaved(i));
    return true;
  }
  if (b.hasAttribute('data-wdplat')) { openPick('Gönderim Yapılan Platform', PLATFORMS.map((label) => ({ label })), wd.plat, (i) => { wd.plat = i; }); return true; }
  if (b.hasAttribute('data-wdsend')) { openPick('Adres Gönderimi', SENDTO.map((label) => ({ label })), wd.sendto, (i) => { wd.sendto = i; if (i === 1) { wd.name = ''; wd.sur = ''; } else { wd.name = 'Deniz'; wd.sur = 'Yılmaz'; } }); return true; }
  if (b.hasAttribute('data-wdpurp')) { openPick('İşlem Amacı', PURPOSES.map((label) => ({ label })), wd.purpose, (i) => { wd.purpose = i; }); return true; }
  if (d.wxp !== undefined) { const i = +d.wxp; $$('#wxp-list .opt').forEach((o) => o.classList.toggle('on', o === b)); if (pickCb) pickCb(i); setTimeout(() => { closeSheet(); renderWdx(); }, 160); return true; }
  return false;
}

/* ---------- Piyasalar ve İşlemler üst alanı (tasarım denemeleri) ---------- */
// DV.m: Piyasalar 1 = Bugün Piyasada kaydırıcısı, 2 = tek özet kartı, 3 = grafikli kart
// DV.h: İşlemler 1 = son işlemler kaydırıcısı, 2 = son işlem detay kartı
const DV = (() => {
  let v = { m: 1, h: 1 };
  try { v = { ...v, ...JSON.parse(localStorage.getItem('hk-dv') || '{}') }; } catch (e) { /* depolama yok */ }
  const q = new URLSearchParams(location.search);
  if (q.get('pv')) v.m = +q.get('pv');
  if (q.get('hv')) v.h = +q.get('hv');
  return v;
})();
const saveDV = () => { try { localStorage.setItem('hk-dv', JSON.stringify(DV)); } catch (e) { /* depolama yok */ } };

function spark(k, w = 360, h = 56, range = '24S') {
  const c = coinOf(k), pts = series(k, range, c.tl), lo = Math.min(...pts), hi = Math.max(...pts), sp = hi - lo || 1;
  const xy = pts.map((v, i) => [(i / (pts.length - 1)) * w, 4 + (1 - (v - lo) / sp) * (h - 8)]);
  const d = xy.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join('');
  const col = pts.at(-1) >= pts[0] ? 'var(--green)' : 'var(--red)', id = `sp${k}${w}`;
  return { lo, hi, svg: `<svg class="kx-spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${col}" stop-opacity=".16"/><stop offset="1" stop-color="${col}" stop-opacity="0"/></linearGradient></defs><path d="${d}L${w} ${h}L0 ${h}Z" fill="url(#${id})"/><path d="${d}" fill="none" stroke="${col}" stroke-width="2" vector-effect="non-scaling-stroke"/></svg>` };
}
const chPill = (ch) => `<span class="kx-pill ${chClass(ch)}">${ch > 0 ? '+' : ch < 0 ? '−' : ''}%${fmt(Math.abs(ch))}</span>`;
const priceTL = (c, cur) => priceText(c, cur, 'last');
function breadth() {
  const up = COINS.filter((c) => c.ch > 0).length, down = COINS.filter((c) => c.ch < 0).length, flat = COINS.length - up - down;
  const avg = COINS.reduce((t, c) => t + c.ch, 0) / COINS.length;
  return { up, down, flat, avg, pct: (up / COINS.length) * 100 };
}
function breadthBar(b) {
  return `<div class="kx-bar"><i class="g" style="flex:${b.up}"></i><i class="f" style="flex:${b.flat}"></i><i class="r" style="flex:${b.down}"></i></div>
    <div class="kx-barl"><span class="up">${b.up} yükselen</span><span>${b.flat} sabit</span><span class="down">${b.down} düşen</span></div>`;
}
const moverRow = (c, cur) => `<button class="kx-mrow press" data-coin="${c.k}" data-cur="${cur}">${coinIcon(c.k)}<b>${c.c}<small>${nameOf(c)}</small></b><span class="amt">${priceTL(c, cur)}</span>${chPill(c.ch)}</button>`;
function dotsHTML(n) { return n > 1 ? Array.from({ length: n }, (_, i) => `<i${i ? '' : ' class="on"'}></i>`).join('') : ''; }
function bindDots(sl, dots) {
  sl.onscroll = () => { const w = sl.firstElementChild ? sl.firstElementChild.offsetWidth + 10 : 1, i = Math.round(sl.scrollLeft / w); $$('i', dots).forEach((d, j) => d.classList.toggle('on', j === i)); };
}

// Kaydırıcı 5 sn'de bir sonraki karta geçer; kullanıcı dokununca 8 sn bekler, sona gelince başa döner
let autoT = null, autoHold = 0;
function autoSlide(sl) {
  clearInterval(autoT);
  const hold = () => { autoHold = Date.now() + 8000; };
  sl.addEventListener('touchstart', hold, { passive: true });
  sl.addEventListener('pointerdown', hold);
  autoT = setInterval(() => {
    if (!document.body.contains(sl)) return clearInterval(autoT);
    if (current !== 'k-markets' || stack.length || Date.now() < autoHold || document.hidden) return;
    const w = sl.firstElementChild.offsetWidth + 10, n = sl.children.length, i = Math.round(sl.scrollLeft / w);
    sl.scrollTo({ left: ((i + 1) % n) * w, behavior: 'smooth' });
  }, 5000);
}
function renderMarketCard() {
  const cur = state.cur, b = breadth();
  const gain = [...COINS].sort((x, y) => y.ch - x.ch), lose = [...COINS].sort((x, y) => x.ch - y.ch);
  const head = (icon, name, right = '') => `<div class="acct-head">${icon}<span class="name">${name}</span>${right}</div>`;
  const badge = '<svg class="coin-badge" width="17" height="17"><use href="#i-coinbadge"/></svg>';
  const btc = coinOf('btc');
  if (DV.m === 2) {
    const tile = (k) => { const c = coinOf(k), s = spark(k, 120, 34); return `<button class="kx-tile press" data-coin="${k}" data-cur="${cur}"><span>${coinIcon(k)}<b>${c.c}</b></span><strong class="amt">${priceTL(c, cur)}</strong>${chPill(c.ch)}${s.svg}</button>`; };
    $('#km-top').innerHTML = `<div class="card kcard k-total kx-one">
      ${head(badge, 'Bugün Piyasada', `<span class="kx-mood ${chClass(b.avg)}">${b.avg >= 0 ? 'Yükselişte' : 'Düşüşte'}</span>`)}
      <div class="kx-tiles">${tile('btc')}${tile('eth')}${tile('sol')}</div>
      ${breadthBar(b)}
      <hr>
      <button class="see-all press" data-coin="${gain[0].k}" data-cur="${cur}">Günün yükseleni ${nameOf(gain[0])} ${chPill(gain[0].ch)} <svg width="6" height="10"><use href="#i-chev-right"/></svg></button>
    </div>`;
    return;
  }
  if (DV.m === 3) {
    const k = km.feat || 'btc', c = coinOf(k), s = spark(k, 360, 86);
    const [i, f] = priceTL(c, cur).replace(` ${cur}`, '').split(',');
    $('#km-top').innerHTML = `<div class="card kcard k-total kx-one">
      ${head(coinIcon(k), `${nameOf(c)} <small class="kx-pair">${c.c}/${cur}</small>`, chPill(c.ch))}
      <div class="amt-big kx-price">${i}<small>${f ? `,${f}` : ''} ${cur}</small></div>
      <div class="kx-chart">${s.svg}</div>
      <div class="kx-feat">${['btc', 'eth', 'sol', 'xrp', 'usdt'].map((x) => `<button class="press${x === k ? ' on' : ''}" data-kfeat="${x}">${coinOf(x).c}</button>`).join('')}</div>
      <hr>
      <button class="see-all press" data-coin="${k}" data-cur="${cur}">${nameOf(c)} Detayı <svg width="6" height="10"><use href="#i-chev-right"/></svg></button>
    </div>`;
    return;
  }
  // 1: Bugün Piyasada kaydırıcısı (her kart ana kart ölçüsünde; 5 sn'de bir kendiliğinden kayar)
  const NEW = [['virtual', '28 Ekim'], ['zro', '21 Ekim'], ['ena', '14 Ekim']];
  const newRow = ([k, d]) => { const c = coinOf(k); return `<button class="kx-mrow press" data-coin="${k}" data-cur="${cur}">${coinIcon(k)}<b>${c.c}<small>${d}’de listelendi</small></b><span class="amt">${priceTL(c, cur)}</span>${chPill(c.ch)}</button>`; };
  const cards = [
    `${head(`<span class="kx-hic up"><svg width="14" height="14"><use href="#k-up"/></svg></span>`, 'Günün Yükselenleri')}<div class="kx-movers">${gain.slice(0, 3).map((c) => moverRow(c, cur)).join('')}</div>`,
    `${head(`<span class="kx-hic down"><svg width="14" height="14"><use href="#k-up"/></svg></span>`, 'Günün Düşenleri')}<div class="kx-movers">${lose.slice(0, 3).map((c) => moverRow(c, cur)).join('')}</div>`,
    `${head(`<span class="kx-hic new"><svg width="13" height="13"><use href="#k-spark"/></svg></span>`, 'Yeni Listelenenler', '<span class="kx-mood new">Yeni</span>')}<div class="kx-movers">${NEW.map(newRow).join('')}</div>`,
    `${head(badge, 'Piyasa Nabzı', `<span class="kx-mood ${chClass(b.avg)}">${b.avg >= 0 ? 'Yükselişte' : 'Düşüşte'}</span>`)}
     <div class="kx-pulse"><b class="${chClass(b.avg)}">%${fmt(b.pct, 0)}</b><span>kripto bugün<br>yükselişte</span></div>
     ${breadthBar(b)}
     <p class="kx-note">Ortalama 24 saatlik değişim <b class="${chClass(b.avg)}">${b.avg >= 0 ? '+' : '−'}%${fmt(Math.abs(b.avg))}</b></p>`,
  ];
  $('#km-top').innerHTML = `<div class="kx-slider" id="km-sl">${cards.map((h) => `<div class="card kx-sc">${h}</div>`).join('')}</div><div class="km-dots" id="km-sld">${dotsHTML(cards.length)}</div>`;
  autoSlide($('#km-sl'));
  bindDots($('#km-sl'), $('#km-sld'));
}

function txLine(x) {
  if (x.t === 'wd' && !isCash(x)) return `${x.net} · Alıcı ${shortAddr(x.addr)}`;
  if (isCash(x)) return x.t === 'dep' ? 'Halkbank Vadesiz Hesabınızdan' : 'Halkbank Vadesiz Hesabınıza';
  return `${qtyText(x)} · Fiyat ${txPrice(x)}`;
}
function txAmount(x) {
  if (x.t === 'wd' && !isCash(x)) return { s: '-', v: fmt(x.q, decOf(x.q) + 2), u: assetCode(x.k), cls: 'neg' };
  const cash = isCash(x), plus = x.t === 'sell' || x.t === 'dep';
  const v = cash ? x.q : inTx(x, x.t === 'buy' ? x.total + x.fee : x.total - x.fee);
  return { s: plus ? '+' : '-', v: fmt(v), u: cash ? assetCode(x.k) : txCur(x), cls: x.st === 'cancel' ? 'off' : plus ? 'pos' : 'neg' };
}
const txName = (x) => (x.t === 'wd' && !isCash(x) ? 'Kripto Çekme' : isCash(x) ? (x.t === 'dep' ? 'Para Yatırma' : 'Para Çekme') : `${assetCode(x.k)} ${TX_TYPE[x.t].n}`);
function txCardHTML(x, label) {
  const a = txAmount(x), d = new Date(x.ts), [i, f] = a.v.split(',');
  const st = x.st === 'cancel' ? '<span class="kx-st off">İptal</span>' : '<span class="kx-st">Gerçekleşti</span>';
  const again = !isCash(x) && x.t !== 'wd' && x.st !== 'cancel' ? `<button class="see-all press" data-ktrade="${x.k}/${txCur(x)}/${x.t}">Tekrarla <svg width="6" height="10"><use href="#i-chev-right"/></svg></button>` : '';
  const rows = `<div class="kx-rows">
      <div><span>İşlem No</span><b>${x.id}</b></div>
      ${isCash(x) || x.t === 'wd' ? `<div><span>İşlem Ücreti</span><b class="amt">${x.t === 'wd' && !isCash(x) ? `${fmt(x.nfee, decOf(x.nfee))} ${assetCode(x.k)}` : `0,00 ${assetCode(x.k)}`}</b></div>` : `<div><span>Komisyon</span><b class="amt">${txMoney(x, x.fee)}</b></div>`}
    </div>`;
  return `
    <div class="acct-head">${coinIcon(x.k)}<span class="name">${label || txName(x)}</span>${st}</div>
    <div class="lbl kx-when">${label ? `${txName(x)} · ` : ''}${dayLabel(x.ts)}, ${d.toTimeString().slice(0, 5)}</div>
    <div class="amt-big amt kx-amt ${a.cls}">${a.s}${i}<small>${f ? `,${f}` : ''} ${a.u}</small></div>
    <div class="kx-line">${txLine(x)}</div>
    ${rows}
    <hr>
    <div class="kx-links"><button class="see-all press" data-tx="${x.id}">Detay Gör <svg width="6" height="10"><use href="#i-chev-right"/></svg></button>${again}</div>`;
}
function renderDVSheet() {
  const opt = (k, v, t, d) => `<button class="opt press${DV[k] === v ? ' on' : ''}" data-kdv="${k}:${v}"><span class="lbl2"><b>${t}</b><span>${d}</span></span><i class="radio"></i></button>`;
  $('#dv-list').innerHTML = `<div class="hf-title">Piyasalar</div>${opt('m', 1, '1 · Bugün Piyasada kaydırıcısı', 'Yükselenler, düşenler, yeni listelenenler, piyasa nabzı; 5 sn’de bir kayar')}${opt('m', 2, '2 · Tek özet kartı', 'BTC / ETH / SOL ve piyasa dengesi')}${opt('m', 3, '3 · Grafikli kart', 'Seçilen kriptonun 24 saatlik grafiği')}
    <div class="hf-title">İşlemler</div>${opt('h', 1, '1 · Son işlemler kaydırıcısı', 'Son 5 işlem kart kart')}${opt('h', 2, '2 · Son işlem detay kartı', 'En son işlemin ayrıntıları')}`;
}
function renderHistTop() {
  const all = buildTx();
  if (DV.h === 2) {
    const x = all.find((t) => t.st === 'done') || all[0];
    const now = new Date(), m0 = new Date(now.getFullYear(), now.getMonth(), 1).getTime(), n = all.filter((t) => t.ts >= m0 && t.st === 'done').length;
    $('#kh-top').innerHTML = `<div class="card kcard k-total bal kx-one">${txCardHTML(x, 'Son İşleminiz')}</div>
      <p class="kx-sub">${TR_MONTHS[now.getMonth()]} ayında <b>${n}</b> işlem yaptınız.</p>`;
    return;
  }
  const last = all.slice(0, 5);
  $('#kh-top').innerHTML = `<div class="kx-slider" id="kh-sl">${last.map((x, i) => `<div class="card kx-sc bal">${txCardHTML(x, i === 0 ? 'Son İşleminiz' : '')}</div>`).join('')}</div><div class="km-dots" id="kh-sld">${dotsHTML(last.length)}</div>`;
  bindDots($('#kh-sl'), $('#kh-sld'));
}

/* ---------- Ekranlar: alt menü sekmeleri ve üstten açılan ekranlar ---------- */
let current = 'k-home';
function tabbarHTML(active) {
  const t = (id, icon, label, w = 24) => `<button class="tab${active === id ? ' on' : ''}" ${id ? `data-ktabgo="${id}"` : 'data-soon'}><svg width="${w}" height="24"><use href="#${icon}"/></svg>${label}</button>`;
  return t('k-home', 't-home', 'Ana Sayfa') + t('k-markets', 't-chart', 'Piyasalar')
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
  if (id === 'k-home') renderHomeMoves();
}
const stack = []; // üst üste açılan ekranlar (Al/Sat → Özet → Sonuç)
function pushScreen(id) {
  if (id === 'k-search') { $('#ks-q').value = ''; renderSearch(); }
  if (id === 'k-profile') { renderProfile(); updateBadges(); }
  if (id === 'k-notifs') renderNotifs();
  if (id === 'k-limits') renderLimits();
  if (id === 'k-ekstre') { const t = new Date(), f = new Date(Date.now() - 7 * 864e5), iso = (d) => d.toISOString().slice(0, 10); $('#ke-from').value = iso(f); $('#ke-to').value = iso(t); }
  if (id === 'k-dep') { $('#kd-q').value = ''; renderDepList(); }
  if (id === 'k-wd') renderWdList();
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
  setTimeout(() => { if (!stack.includes(id)) s.classList.remove('active'); }, 360);
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
// Çıkış: uygulama "giriş yapılmamış" ana sayfaya döner; piyasalar açık, diğer her şey giriş ister
let loggedOut = false;
function logout() {
  state.kAuthed = false;
  stack.length = 0;
  $$('.k-push.open').forEach((x) => x.classList.remove('open', 'active'));
  $(`#${current}`).classList.remove('active');
  current = 'k-home';
  $('#k-home').classList.add('active');
  $('#k-home-scroll').scrollTop = 0;
  setLoggedOut(true);
}
function setLoggedOut(v) {
  loggedOut = v;
  $('#device').classList.toggle('k-out', v);
  renderTotal(); renderHomeMoves(); updateBadges();
}
// İzin verilenler: ana sayfa / piyasalar, arama, sıralama ve liste seçimleri, giriş paneli
function allowedOut(b) {
  const d = b.dataset;
  if (d.ktabgo) return d.ktabgo === 'k-home' || d.ktabgo === 'k-markets';
  if (d.kpush) return d.kpush === 'k-search';
  if (d.ksheet) return d.ksheet === 'filter-sheet';
  return ['kpop', 'ksort', 'kml', 'ktab', 'kpm', 'kclose', 'bank', 'klogin', 'kloginGo', 'kforgot', 'kq', 'coin', 'seg', 'r', 'toast', 'kfeat'].some((k) => k in d) || b.id === 'ks-clear';
}
let lgBusy = false;
function openLogin() {
  $('#kl-pass').value = ''; drawDots(); lgBusy = false; $('#kl-sheet').classList.remove('busy');
  openSheet('kl-sheet');
  setTimeout(() => $('#kl-pass').focus(), 350);
}
function drawDots() {
  const n = $('#kl-pass').value.length;
  $$('#kl-dots i').forEach((d, i) => d.classList.toggle('on', i < n));
  $('#kl-go').classList.toggle('on', n === 6);
}
// Test betikleri için (?skiplogin): giriş adımını atlar
const testSkipLogin = (() => { try { return /skiplogin/.test(location.search + window.parent.location.search); } catch (e) { return false; } })();
let intentDone = false;
// Halkbank'taki Al/Sat düğmesinden gelindiyse (#pair=BTC/TL&side=Al) Al/Sat ekranı doğrudan açılır
function afterAuth() {
  if (intentDone) return;
  intentDone = true;
  const h = new URLSearchParams(location.hash.slice(1));
  if (h.get('pair')) {
    const [code, q] = h.get('pair').split('/');
    const c = COINS.find((x) => x.c === code);
    if (c) setTimeout(() => openTrade(c.k, q, h.get('side') === 'Sat' ? 'sell' : 'buy'), 250);
  }
}
function doLogin() {
  if (lgBusy || $('#kl-pass').value.length < 6) return;
  lgBusy = true; $('#kl-pass').blur(); $('#kl-sheet').classList.add('busy');
  setTimeout(() => { closeSheet(); setLoggedOut(false); state.kAuthed = true; afterAuth(); }, 900);
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
  renderTotal(); renderList(); renderAssets(); renderProfile(); renderHomeMoves(); updateBadges();
  $$('[data-ktabbar]').forEach((n) => (n.innerHTML = tabbarHTML(n.dataset.ktabbar)));
  $('#ks-q').addEventListener('input', renderSearch);
  $('#ka-q').addEventListener('input', renderAssets);
  $('#kt-qty').addEventListener('input', onQty);
  $('#kt-amt').addEventListener('input', onAmt);
  $('#cs-q').addEventListener('input', renderCoinSheet);
  $('#kd-q').addEventListener('input', renderDepList);
  $('#wx-body').addEventListener('input', wdInput);
  $('#wx-body').addEventListener('change', (e) => { if (e.target.id === 'wx-own') { wd.own = e.target.checked; renderWdx(); } if (e.target.id === 'wx-decl') { wd.decl = e.target.checked; renderWdx(); } });
  setupChartScrub();
  $('#kl-pass').addEventListener('input', (e) => { e.target.value = e.target.value.replace(/\D/g, '').slice(0, 6); drawDots(); if (e.target.value.length === 6) doLogin(); });
  $('#km-slider').addEventListener('scroll', (e) => { const el = e.target, i = Math.round(el.scrollLeft / (el.firstElementChild ? el.firstElementChild.offsetWidth + 10 : 1)); $$('#km-dots i').forEach((d, j) => d.classList.toggle('on', j === i)); }, { passive: true });
  ['#kt-qty', '#kt-amt', '#cs-q', '#kd-q'].forEach((q) => $(q).addEventListener('keydown', (e) => { if (e.key === 'Enter') e.target.blur(); }));
  $('#ka-q').addEventListener('keydown', (e) => { if (e.key === 'Enter') e.target.blur(); });
  $('#ks-q').addEventListener('keydown', (e) => { if (e.key === 'Enter') e.target.blur(); });

  document.addEventListener('click', (e) => {
    const b = e.target.closest('button, [data-soon], [data-kpair], [data-kpick], [data-tx], [data-kdfiat], [data-kaseg], [data-coin], #wx-notif');
    if (!b) return;
    if (loggedOut && !allowedOut(b)) { e.preventDefault(); return openLogin(); }
    if (b.hasAttribute('data-klogin')) return openLogin();
    if (wdClick(b)) return;
    if (b.dataset.coin) return openCoin(b.dataset.coin, b.dataset.cur);
    if (b.dataset.seg) return setSeg(b.dataset.seg);
    if (b.dataset.r) { cd.range = b.dataset.r; $$('#ranges button').forEach((x) => x.classList.toggle('on', x === b)); return drawChart(true); }
    if (b.id === 'coin-fav') { favs.has(cd.k) ? favs.delete(cd.k) : favs.add(cd.k); b.classList.toggle('on', favs.has(cd.k)); renderList(); renderMarkets(); return toast(favs.has(cd.k) ? 'Favorilere eklendi' : 'Favorilerden çıkarıldı'); }
    if (b.dataset.toast) return toast(b.dataset.toast);
    if (b.hasAttribute('data-klogin-go')) return doLogin();
    if (b.hasAttribute('data-kforgot')) return toast('Bu özellik demoda yer almıyor');
    if (b.hasAttribute('data-bank')) return window.parent.postMessage({ type: 'halkkripto:back' }, location.origin);
    if (b.dataset.ktabgo) return showTab(b.dataset.ktabgo);
    if (b.dataset.kpush) return pushScreen(b.dataset.kpush);
    if (b.hasAttribute('data-kpop')) return popScreen();
    if (b.hasAttribute('data-kpopall')) return popAll();
    if (b.hasAttribute('data-allacc')) return openAllAcc();
    if (b.dataset.homeacc) { homeAcc = b.dataset.homeacc; $$('#allacc-list .acs-card').forEach((x) => x.classList.toggle('on', x === b)); renderTotal(); renderHomeMoves(); return setTimeout(closeSheet, 200); }
    if (b.dataset.khacc) { Object.assign(kh, { asset: b.dataset.khacc, period: 'all' }); return showTab('k-history'); }
    if (b.hasAttribute('data-knall')) { notifs.forEach((x) => (x.read = true)); return renderNotifs(); }
    if (b.dataset.knotif) {
      const n = notifs.find((x) => x.id === b.dataset.knotif); n.read = true; renderNotifs();
      if (n.go && n.go.trade) return openTrade(n.go.trade, state.cur, 'buy');
      if (n.go && n.go.tx) return openTx(n.go.tx);
      return;
    }
    if (b.dataset.ktrade !== undefined) { const [k, q, sd] = (b.dataset.ktrade || 'btc').split('/'); closeSheet(); return openTrade(k, q || state.cur, sd || 'buy'); }
    if (b.dataset.kside) { tr.side = b.dataset.kside; tr.qty = tr.amt = 0; $('#kt-qty').value = ''; $('#kt-amt').value = ''; return renderTrade(); }
    if (b.hasAttribute('data-krefresh')) return refreshPrice();
    if (b.dataset.kdcoin) return openNetSheet(b.dataset.kdcoin, 'info');
    if (b.dataset.kdfiat) { dep.fiat = b.dataset.kdfiat; return openInfo(dep.fiat, 'detail'); }
    if (b.dataset.knet) { dep.net = +b.dataset.knet; $$('#net-list [data-knet]').forEach((x) => x.classList.toggle('on', x === b)); return; }
    if (b.id === 'net-go' && (dep.next === 'wd' || dep.next === 'wdchange')) { closeSheet(); wd.net = dep.net; pickSaved(0); if (dep.next === 'wd') return setTimeout(openWdx, 300); return renderWdx(); }
    if (b.id === 'net-go') { closeSheet(); dep.fiat = null; if (dep.next === 'info') return setTimeout(() => openInfo('crypto', 'detail'), 320); return renderDepDetail(); }
    if (b.id === 'di-ok' && infoCb) { const f = infoCb; infoCb = null; closeSheet(); return setTimeout(f, 320); }
    if (b.id === 'di-ok') { closeSheet(); if (dep.next === 'detail') openDepDetail(); return; }
    if (b.hasAttribute('data-kdhow')) return openInfo('crypto', null);
    if (b.hasAttribute('data-kdnet')) return openNetSheet(dep.k, 'detail');
    if (b.hasAttribute('data-kdqr')) return openQR();
    if (b.dataset.kcopy) return copyText(b.dataset.kcopy);
    if (b.hasAttribute('data-kshare')) return toast('Paylaşım bu demoda yer almıyor');
    if (b.dataset.kbanksend) {
      if (embedded) return window.parent.postMessage({ type: 'halkkripto:send', cur: b.dataset.kbanksend }, location.origin);
      return toast('Bu özellik Halkbank uygulamasından açıldığında çalışır');
    }
    if (b.dataset.kpct) return setPct(+b.dataset.kpct);
    if (b.id === 'kt-go') return goSummary();
    if (b.id === 'kt-confirm') return confirmTrade();
    if (b.dataset.kcoin) { tr.k = b.dataset.kcoin; tr.qty = tr.amt = 0; $('#kt-qty').value = ''; $('#kt-amt').value = ''; renderTrade(); return setTimeout(closeSheet, 150); }
    if (b.dataset.kacct) { tr.cur = b.dataset.kacct; tr.qty = tr.amt = 0; $('#kt-qty').value = ''; $('#kt-amt').value = ''; renderTrade(); return setTimeout(closeSheet, 150); }
    if (b.id === 'ktr-dekont') return openDekont(tr.lastId);
    if (b.id === 'ktr-assets') { popAll(); return showTab('k-assets'); }
    if (b.id === 'ktr-new') { popScreen(); popScreen(); tr.qty = tr.amt = 0; $('#kt-qty').value = ''; $('#kt-amt').value = ''; return renderTrade(); }
    if (b.dataset.ksheet) { if (b.dataset.ksheet === 'hf-sheet') { hfDraft = { ...kh }; renderHfSheet(); } if (b.dataset.ksheet === 'coin-sheet') { $('#cs-q').value = ''; renderCoinSheet(); } if (b.dataset.ksheet === 'acct-sheet') renderAcctSheet(); return openSheet(b.dataset.ksheet); }
    if (b.dataset.kpsw) { b.classList.toggle('on'); b.setAttribute('aria-checked', b.classList.contains('on')); return; }
    if (b.dataset.kplim) { limTab = b.dataset.kplim; return renderLimits(); }
    if (b.dataset.klang) { if (b.dataset.klang === 'en') return toast('İngilizce dil seçeneği demoda yer almıyor'); return closeSheet(); }
    if (b.dataset.ktheme) { if (b.dataset.ktheme !== 'light') return toast('Koyu tema demoda yer almıyor'); return closeSheet(); }
    if (b.hasAttribute('data-kedit')) return toast('Bilgilerinizi Halkbank uygulamasından güncelleyebilirsiniz');
    if (b.hasAttribute('data-kclosego')) { closeSheet(); return toast('Hesap kapatma demoda yer almıyor'); }
    if (b.hasAttribute('data-klogout')) { closeSheet(); return logout(); }
    if (b.dataset.khclear) { kh[b.dataset.khclear] = b.dataset.khclear === 'period' ? '90' : 'all'; return renderHistory(); }
    if (b.hasAttribute('data-khreset')) { Object.assign(kh, { type: 'all', period: '90', status: 'all', asset: 'all' }); return renderHistory(); }
    if (b.hasAttribute('data-ktxmore')) return renderTxDetail(!$('#txd-body').dataset.more);
    if (b.dataset.kcopytx) { try { navigator.clipboard.writeText(b.dataset.kcopytx).catch(() => {}); } catch (err) { /* izin yoksa da bildir */ } return toast('İşlem numarası kopyalandı'); }
    if (b.dataset.hf) { const [key, v] = b.dataset.hf.split(':'); hfDraft[key] = v; return renderHfSheet(); }
    if (b.id === 'hf-clear') { hfDraft = { ...hfDraft, period: '90', type: 'all', status: 'all', asset: 'all' }; return renderHfSheet(); }
    if (b.id === 'hf-apply') { Object.assign(kh, hfDraft); renderHistory(); return closeSheet(); }
    if (b.dataset.dekont) return openDekont(b.dataset.dekont);
    if (b.dataset.tx) return openTx(b.dataset.tx);
    if (b.hasAttribute('data-txshare')) { if (b.closest('#k-txd')) return openDekont(txOpen.id); return toast('Paylaşım bu demoda yer almıyor'); }
    if (b.id === 'ke-go') { popScreen(); return toast(`Hesap ekstreniz ${$('#ke-mail').value} adresine gönderildi`); }
    if (b.hasAttribute('data-kclose')) return closeSheet();
    if (b.hasAttribute('data-kdvsheet')) { renderDVSheet(); return openSheet('dv-sheet'); }
    if (b.dataset.kfeat) { km.feat = b.dataset.kfeat; return renderMarketCard(); }
    if (b.dataset.kdv) { const [k, v] = b.dataset.kdv.split(':'); DV[k] = +v; saveDV(); renderDVSheet(); renderMarketCard(); return renderHistory(); }
    if (b.dataset.kslx) { slDismissed.add(b.dataset.kslx); return renderSlides(); }
    if (b.dataset.kml) { km.list = b.dataset.kml; return renderMarkets(); }
    if (b.dataset.ksort) return setSort(b.dataset.ksort);
    if (b.dataset.kpm) { km.pm = b.dataset.kpm; renderMarkets(); return setTimeout(closeSheet, 180); }
    if (b.id === 'ks-clear') { recents = []; return renderSearch(); }
    if (b.dataset.kpick) return pickPair(b.dataset.kpick);
    if (b.dataset.kpair) { closeSheet(); const [k, q] = b.dataset.kpair.split('/'); return openTrade(k, q, 'buy'); }
    if (b.hasAttribute('data-eye')) { state.hidden = !state.hidden; renderTotal(); renderHistory(); renderMarketCard(); return renderAssets(); }
    if (b.hasAttribute('data-cursheet')) return openSheet();
    if (b.dataset.dcur) {
      state.cur = b.dataset.dcur;
      $$('#cur-sheet [data-dcur]').forEach((x) => x.classList.toggle('on', x === b));
      renderTotal(); renderList(); renderMarkets(); renderAssets(); renderProfile(); renderHistory();
      return setTimeout(closeSheet, 180);
    }
    if (b.hasAttribute('data-kachart')) { ka.chart = !ka.chart; ka.sel = null; return renderAssets(); }
    if (b.dataset.kaseg !== undefined) { const i = +b.dataset.kaseg; ka.sel = ka.sel === i ? null : i; return renderAssets(); }
    if (b.dataset.kagroup) { ka.open[b.dataset.kagroup] = !ka.open[b.dataset.kagroup]; return b.parentElement.classList.toggle('open'); }
    if (b.id === 'ka-zero') { ka.hideZero = !ka.hideZero; return renderAssets(); }
    if (b.dataset.ktab) { kTab = b.dataset.ktab; return renderList(); }
    if (b.hasAttribute('data-soon')) return toast('Bu özellik demoda yer almıyor');
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
    // İlk girişte (Halkbank'tan geçişte de) önce dijital parola istenir; sonra gidilmek istenen ekran açılır
    if (state.kAuthed || testSkipLogin) afterAuth();
    else { setLoggedOut(true); setTimeout(openLogin, 350); }
  }, 1400);
}
init();
