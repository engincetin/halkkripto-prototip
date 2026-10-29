'use strict';
// Halkbank ve Halk Kripto uygulamalarının ortak verisi ve yardımcıları (iki uygulama aynı rakamları gösterir)

/* ================= Veri ================= */
// Fiyatlar 28 Ekim 2026 piyasa seviyelerine göre (demo, canlı değil). 1 USD ≈ 49,68 TL
const USD_RATE = 49.68;

const COINS = [
  { k: 'btc', n: 'Bitcoin', c: 'BTC', tl: 4038500, d: 0, ch: -0.15 },
  { k: 'eth', n: 'Ethereum', c: 'ETH', tl: 117344.16, d: 0, ch: -0.62 },
  { k: 'usdt', n: 'Tether', c: 'USDT', tl: 49.70, d: 2, ch: 0.02 },
  { k: 'usdc', n: 'USD Coin', c: 'USDC', tl: 49.68, d: 2, ch: 0 },
  { k: 'xrp', n: 'Ripple', c: 'XRP', tl: 66.07, d: 2, ch: 0.76 },
  { k: 'sol', n: 'Solana', c: 'SOL', tl: 5081.77, d: 2, ch: 1.12 },
  { k: 'ada', n: 'Cardano', c: 'ADA', tl: 10.098, d: 3, ch: -0.27 },
  { k: 'doge', n: 'Dogecoin', c: 'DOGE', tl: 10.171, d: 3, ch: 1.24 },
  { k: 'ltc', n: 'Litecoin', c: 'LTC', tl: 2879.01, d: 2, ch: -0.75 },
  { k: 'ondo', n: 'Ondo', c: 'ONDO', tl: 20.827, d: 3, ch: 0.38 },
  { k: 'avax', n: 'Avalanche', c: 'AVAX', tl: 441.34, d: 2, ch: -0.46 },
  { k: 'grt', n: 'The Graph', c: 'GRT', tl: 1.093, d: 3, ch: -1.97 },
  { k: 'uni', n: 'UNISWAP', c: 'UNI', tl: 343.29, d: 2, ch: 2.84 },
  { k: 'aave', n: 'Aave', c: 'AAVE', tl: 6633.70, d: 2, ch: -0.03 },
  { k: 'ena', n: 'Ethena', c: 'ENA', tl: 10.488, d: 3, ch: 5.49 },
  { k: 'ldo', n: 'Lido DAO', c: 'LDO', tl: 18.156, d: 3, ch: -2.28 },
  { k: 'dot', n: 'Polkadot', c: 'DOT', tl: 49.05, d: 2, ch: -1.86 },
  { k: 'link', n: 'Chainlink', c: 'LINK', tl: 582.68, d: 2, ch: 0.60 },
  { k: 'pendle', n: 'Pendle', c: 'PENDLE', tl: 97.17, d: 2, ch: -0.61 },
  { k: 'chz', n: 'Chiliz', c: 'CHZ', tl: 0.643, d: 3, ch: 0.31 },
  { k: 'sand', n: 'The Sandbox', c: 'SAND', tl: 2.398, d: 3, ch: 1.95 },
  { k: 'mana', n: 'Decentraland', c: 'MANA', tl: 3.853, d: 3, ch: -1.48 },
  { k: 'pol', n: 'Polygon', c: 'POL', tl: 4.580, d: 3, ch: 0.28 },
  { k: 'zro', n: 'LayerZero', c: 'ZRO', tl: 85.04, d: 2, ch: 0.95 },
  { k: 'virtual', n: 'Virtuals', c: 'VIRTUAL', tl: 30.398, d: 3, ch: -1.90 },
  { k: 'inj', n: 'Injective', c: 'INJ', tl: 397.24, d: 2, ch: 1.92 },
  { k: 'ens', n: 'Ethereum Name Service', c: 'ENS', tl: 262.96, d: 2, ch: 0 },
  { k: 'qnt', n: 'Quant', c: 'QNT', tl: 9521.04, d: 2, ch: -1.59 },
];

// v: varlığın güncel TL değeri, pct: alış maliyetine göre kar/zarar oranı (%), dq: miktar ondalığı.
// Toplam değer Halk Kripto hesabındaki "Kripto Varlıklarım" (70.150 TL) ile aynıdır.
// Miktar = değer / güncel fiyat, kar/zarar = değer - maliyet olarak hesaplanır.
// Halk Kripto, Halkbank içinde (iframe) açıldığında aynı listeyi kullanır: alım/satım iki uygulamada da görünür
const ASSETS = (() => {
  try { if (window.parent !== window && window.parent.hkAssets) return window.parent.hkAssets; } catch (e) { /* farklı köken */ }
  return [
  { k: 'btc', n: 'Bitcoin', c: 'BTC', v: 24552.50, pct: 14.2, dq: 8 },
  { k: 'eth', n: 'Ethereum', c: 'ETH', v: 15433.00, pct: 6.8, dq: 5 },
  { k: 'sol', n: 'Solana', c: 'SOL', v: 10522.50, pct: -3.4, dq: 4 },
  { k: 'xrp', n: 'Ripple', c: 'XRP', v: 9821.00, pct: 22.5, dq: 2 },
  { k: 'usdc', n: 'USD Coin', c: 'USDC', v: 9821.00, pct: 0, dq: 2 },
];
})();
window.hkAssets = ASSETS;
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
