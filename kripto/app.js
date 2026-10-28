'use strict';
// Halk Kripto: Halkbank uygulamasından "Al/Sat" ile açılır (iframe içinde) ya da tek başına çalışır.
// Halkbank'tan açıldığında adres: kripto/?embed=1&sat=..&sab=..#pair=BTC/TL&side=Al

const $ = (s) => document.querySelector(s);
const params = new URLSearchParams(location.search);
const embedded = params.has('embed') && window.parent !== window;

function layout() {
  const dev = $('#device');
  const W = window.innerWidth, H = window.innerHeight;
  const standalone = window.navigator.standalone || matchMedia('(display-mode: standalone)').matches;
  const framed = !embedded && !standalone && W >= 640;
  document.body.classList.toggle('framed', framed);
  if (framed) {
    const z = Math.min((H - 48) / 956, (W - 48) / 440, 1);
    dev.style.setProperty('--z', 1);
    dev.style.transform = `translate(${(W - 440 * z) / 2}px, ${(H - 956 * z) / 2}px) scale(${z})`;
    return;
  }
  const z = W / 440;
  dev.style.transform = '';
  dev.style.setProperty('--z', z);
  if (standalone && !embedded) {
    // iOS ana ekran modu hatası (Halkbank uygulamasındaki ile aynı düzeltme)
    const probe = document.createElement('div');
    probe.style.cssText = 'position:fixed;visibility:hidden;padding-top:env(safe-area-inset-top)';
    document.body.appendChild(probe);
    const safeTop = parseFloat(getComputedStyle(probe).paddingTop) || 0;
    probe.remove();
    const screenH = W <= Math.min(screen.width, screen.height) + 1 ? Math.max(screen.width, screen.height) : Math.min(screen.width, screen.height);
    document.documentElement.classList.toggle('vh-bug', safeTop > 0 && Math.abs(screenH - H - safeTop) <= 4);
  }
  if (embedded) {
    // Halkbank uygulaması güvenli alanları (tasarım px) iletir
    dev.style.setProperty('--sat', `${params.get('sat') || 0}px`);
    dev.style.setProperty('--sab', `${params.get('sab') || 0}px`);
  }
}

function showIntent() {
  const h = new URLSearchParams(location.hash.slice(1));
  const pair = h.get('pair'), side = h.get('side');
  $('#intent-card').hidden = !pair;
  if (pair) {
    $('#intent-pair').textContent = pair;
    $('#intent-side').textContent = side || 'Al/Sat';
    $('#intent-side').classList.toggle('sell', side === 'Sat');
  }
}

function init() {
  layout();
  window.addEventListener('resize', layout);
  showIntent();
  window.addEventListener('hashchange', showIntent);
  if (embedded) {
    $('#back-to-bank').hidden = false;
    $('#back-to-bank').addEventListener('click', () => window.parent.postMessage({ type: 'halkkripto:back' }, location.origin));
  }
  setTimeout(() => {
    $('#welcome').classList.add('active');
    $('#splash').classList.add('gone');
  }, 1500);
  window.addEventListener('scroll', () => (window.scrollX || window.scrollY) && window.scrollTo(0, 0), { passive: true });
}
init();
