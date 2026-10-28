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
const POPULAR = ['btc', 'eth', 'xrp', 'sol'];

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
    <button class="see-all press" data-soon>Varlıklarıma Git <svg width="6" height="10"><use href="#i-chev-right"/></svg></button>`;
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

/* ---------- Ekranlar: alt menü sekmeleri ve üstten açılan ekranlar ---------- */
let current = 'k-home';
function tabbarHTML(active) {
  const t = (id, icon, label, w = 24) => `<button class="tab${active === id ? ' on' : ''}" ${id ? `data-ktabgo="${id}"` : 'data-soon'}><svg width="${w}" height="24"><use href="#${icon}"/></svg>${label}</button>`;
  return t('k-home', 't-home', 'Ana Sayfa', 23) + t('k-markets', 't-chart', 'Piyasalar')
    + '<div class="tab fab-slot"><button class="fab k-fab press" data-soon>Al/Sat<svg width="26" height="22"><use href="#i-transfer"/></svg></button></div>'
    + t(null, 't-pie', 'Varlıklarım') + t(null, 't-user', 'Profil');
}
function showTab(id) {
  if (id === current) return;
  $(`#${current}`).classList.remove('active');
  $(`#${id}`).classList.add('active');
  current = id;
  if (id === 'k-markets') renderMarkets();
}
function pushScreen(id) {
  if (id === 'k-search') { $('#ks-q').value = ''; renderSearch(); }
  const s = $(`#${id}`);
  s.classList.add('active');
  requestAnimationFrame(() => requestAnimationFrame(() => s.classList.add('open')));
}
function popScreen() {
  const s = $('.k-push.open');
  if (!s) return;
  $('#ks-q').blur();
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
  renderTotal(); renderList();
  $$('[data-ktabbar]').forEach((n) => (n.innerHTML = tabbarHTML(n.dataset.ktabbar)));
  $('#ks-q').addEventListener('input', renderSearch);
  $('#ks-q').addEventListener('keydown', (e) => { if (e.key === 'Enter') e.target.blur(); });

  document.addEventListener('click', (e) => {
    const b = e.target.closest('button, [data-soon], [data-kpair], [data-kpick]');
    if (!b) return;
    if (b.hasAttribute('data-bank')) return window.parent.postMessage({ type: 'halkkripto:back' }, location.origin);
    if (b.dataset.ktabgo) return showTab(b.dataset.ktabgo);
    if (b.dataset.kpush) return pushScreen(b.dataset.kpush);
    if (b.hasAttribute('data-kpop')) return popScreen();
    if (b.dataset.ksheet) return openSheet(b.dataset.ksheet);
    if (b.hasAttribute('data-kclose')) return closeSheet();
    if (b.dataset.kq) { km.quote = b.dataset.kq; return renderMarkets(); }
    if (b.dataset.ksort) return setSort(b.dataset.ksort);
    if (b.dataset.kpm) { km.pm = b.dataset.kpm; renderMarkets(); return setTimeout(closeSheet, 180); }
    if (b.id === 'ks-clear') { recents = []; return renderSearch(); }
    if (b.dataset.kpick) return pickPair(b.dataset.kpick);
    if (b.dataset.kpair) { const [k, q] = b.dataset.kpair.split('/'); return toast(`${COINS.find((x) => x.k === k).c}/${q} Al/Sat ekranı sıradaki adımda tasarlanacak`); }
    if (b.id === 'k-promo-x') return $('#k-promo').classList.add('gone');
    if (b.hasAttribute('data-eye')) { state.hidden = !state.hidden; return renderTotal(); }
    if (b.hasAttribute('data-cursheet')) return openSheet();
    if (b.dataset.dcur) {
      state.cur = b.dataset.dcur;
      $$('#cur-sheet [data-dcur]').forEach((x) => x.classList.toggle('on', x === b));
      renderTotal(); renderList(); renderMarkets();
      return setTimeout(closeSheet, 180);
    }
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
