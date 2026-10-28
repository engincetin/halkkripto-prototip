'use strict';

/* ================= Veri ================= */
const USD_RATE = 49.63; // USDC = 49,63 TL (tasarımdaki değer)

const COINS = [
  { k: 'btc', n: 'Bitcoin', c: 'BTC', tl: 4001989, d: 0, ch: 0.10 },
  { k: 'eth', n: 'Ethereum', c: 'ETH', tl: 115808, d: 0, ch: 0.83 },
  { k: 'xrp', n: 'Ripple', c: 'XRP', tl: 64.070, d: 3, ch: -1.05 },
  { k: 'sol', n: 'Solana', c: 'SOL', tl: 5036.86, d: 2, ch: 0.19 },
  { k: 'usdc', n: 'USD Coin', c: 'USDC', tl: 49.63, d: 2, ch: 0 },
  { k: 'uni', n: 'UNISWAP', c: 'UNI', tl: 354.29, d: 2, ch: 5.61 },
];

const ASSETS = [
  { k: 'btc', n: 'Bitcoin', c: 'BTC', tl: '~ 50.234,00 TL', qty: '0,0313 BTC', pct: '%0,85', pl: '+5.002,82 TL' },
  { k: 'eth', n: 'Ethereum', c: 'ETH', tl: '~ 30.123,60 TL', qty: '2,43 ETH', pct: '%0,42', pl: '+2.002,82 TL' },
  { k: 'usdc', n: 'USD Coin', c: 'USDC', tl: '~ 19.879,21 TL', qty: '1.540,05 USDC', pct: '%0,01', pl: '+402,23 TL' },
  { k: 'sol', n: 'Solana', c: 'SOL', tl: '~ 19.879,21 TL', qty: '3,9467 SOL', pct: '%0,01', pl: '+402,23 TL' },
  { k: 'xrp', n: 'Ripple', c: 'XRP', tl: '~ 19.879,21 TL', qty: '310,27 XRP', pct: '%0,01', pl: '+402,23 TL' },
];

const MONTHS = ['OCA', 'ŞUB', 'MAR', 'NİS', 'MAY', 'HAZ', 'TEM', 'AĞU', 'EYL', 'EKİ', 'KAS', 'ARA'];

const state = {
  vadesiz: 250000,
  kredili: 250000,
  nakit: 30200,
  kripto: 70150,
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
function money(n) {
  const [i, f] = fmt(n).split(',');
  return `${i}<small>,${f} TL</small>`;
}
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
  $$('[data-k="vadesiz-big"]').forEach((e) => (e.innerHTML = money(state.vadesiz)));
  $$('[data-k="kredili"]').forEach((e) => (e.innerHTML = money(state.kredili)));
  $$('[data-k="vadesiz-blue"]').forEach((e) => (e.innerHTML = money(state.vadesiz)));
  $$('[data-k="kredili-blue"]').forEach((e) => (e.innerHTML = money(state.kredili)));
  const eye = `<button class="eye-btn press" data-eye><svg width="17" height="13"><use href="#${state.hidden ? 'i-eye-off' : 'i-eye'}"/></svg></button>`;
  const head = `
    <div class="acct-head">
      <svg class="coin-badge" width="17" height="17"><use href="#i-coinbadge"/></svg>
      <span class="name">Halk Kripto Hesabım</span>${eye}
      <button class="pill-orange press" data-soon style="margin-left:16px">TL <svg width="13" height="8"><use href="#i-chev-down"/></svg></button>
    </div>
    <div class="lbl" style="margin-top:13px">Kripto ve Nakit Bakiye</div>
    <div class="amt-big amt">${money(total)}</div>
    <div class="pl-row"><span class="lbl">Olası Kar / Zarar</span><b class="up amt">%10,02</b><b class="up money-sm amt">+25.401<small>,43 TL</small></b></div>`;
  $('[data-kcard]').innerHTML = head;
  $('[data-vcard]').innerHTML = head + `
    <hr>
    <div class="vrow"><span class="lbl">Nakit Varlıklarım</span><b class="amt">${money(state.nakit)}</b></div>
    <div class="vrow"><span class="lbl">Kripto Varlıklarım</span><b class="amt">${money(state.kripto)}</b></div>`;
  $$('[data-eye] use').forEach((u) => u.setAttribute('href', state.hidden ? '#i-eye-off' : '#i-eye'));
  $('#device').classList.toggle('hidden-amt', state.hidden);
}

function renderMoves() {
  $('#moves').innerHTML = state.moves.map((m) => `
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
  const price = usd ? `${fmt(p, p >= 1000 ? 0 : 2)} USD` : `${fmt(c.tl, c.d)} TL`;
  const code = pair ? `${c.c}/${cur}` : c.c;
  return `
    <div class="coin-row">
      ${coinIcon(c.k)}
      <div class="coin-name"><b>${c.n}</b><span>${code}</span></div>
      <div class="coin-val"><b>${price}</b><span class="${chClass(c.ch)}">%${fmt(Math.abs(c.ch))}</span></div>
    </div>`;
}

function renderKriptoList() {
  $('#kripto-list').innerHTML = COINS.map((c) => coinRow(c, 'TL')).join('');
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
    <div class="asset-row">
      ${coinIcon(a.k)}
      <div class="coin-name">
        <b>${a.n}</b><span>${a.c}</span>
        <div class="plr"><em>Kar/Zarar</em><span class="up">${a.pct}</span></div>
      </div>
      <div class="coin-val"><b class="amt">${a.tl}</b><b class="amt" style="margin-top:5px">${a.qty}</b><span class="up amt">${a.pl}</span></div>
    </div>`).join('');
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
    if (busy || stack.length < 2 || keypadOpen) return;
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
    const b = e.target.closest('button, [data-soon], [data-go]');
    if (!b) return;
    if (b.dataset.go) return push(b.dataset.go);
    if (b.hasAttribute('data-back')) return back();
    if (b.dataset.popto) return popTo(b.dataset.popto);
    if (b.hasAttribute('data-soon')) return toast('Bu özellik demoda yer almıyor');
    if (b.dataset.toast) return toast(b.dataset.toast);
    if (b.hasAttribute('data-eye')) { state.hidden = !state.hidden; return renderBalances(); }
    if (b.dataset.key) return typeKey(b.dataset.key);
    if (b.dataset.cur) { marketCur = b.dataset.cur; return renderMarket(); }
  });

  $('#amount-field').addEventListener('click', openKeypad);
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
  setupEvents(); setupEdgeSwipe();
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
