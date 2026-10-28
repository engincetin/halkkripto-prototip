'use strict';
// Halkbank ve Halk Kripto uygulamalarının ortak verisi ve yardımcıları (iki uygulama aynı rakamları gösterir)

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
function chClass(ch) { return ch > 0 ? 'up' : ch < 0 ? 'down' : 'flat'; }
function coinIcon(k) { return `<span class="coin-ic"><svg width="24" height="24"><use href="#c-${k}"/></svg></span>`; }
