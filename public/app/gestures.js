/* Phone gestures: swipe tabs, pull to refresh, drag a sheet down to close, light haptics. */
(function () {
'use strict';
if (!('ontouchstart' in window)) return;
var Z = window.Z, TABS = ['#/home', '#/products', '#/orders', '#/more'];
var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion:reduce)').matches;
function route() { var h = location.hash || '#/home'; if (h === '#/' || h === '#' || h === '') h = '#/home'; return h.split('?')[0]; }
function sheetOpen() { return Z.isSheetOpen && Z.isSheetOpen(); }
function hScroll(el) { while (el && el !== document.body) { if (el.scrollWidth > el.clientWidth + 4) { var o = getComputedStyle(el).overflowX; if (o === 'auto' || o === 'scroll') return true; } el = el.parentElement; } return false; }
var ind = document.createElement('div');
ind.style.cssText = 'position:fixed;top:-48px;left:50%;margin-left:-20px;width:40px;height:40px;border-radius:50%;background:var(--surface2,#171b26);border:1px solid var(--gold,#e2bb62);color:var(--gold,#e2bb62);display:grid;place-items:center;z-index:70;font-size:18px;pointer-events:none;box-shadow:0 8px 24px #0008';
ind.textContent = '↓'; document.body.appendChild(ind);
var g = null;
document.addEventListener('touchstart', function (e) {
  if (e.touches.length !== 1) { g = null; return; }
  var t = e.touches[0], el = e.target;
  g = { x: t.clientX, y: t.clientY, t0: Date.now(), mode: '', el: el };
  var grab = el.closest && el.closest('#sheet .grab, #sheet .sh-head');
  if (sheetOpen() && grab) g.mode = 'sheet';
  else if (sheetOpen()) g.mode = 'none';
  else if (TABS.indexOf(route()) > -1 && !(el.closest && el.closest('input,textarea,select,video,.noswipe'))) g.mode = 'free';
  else g.mode = 'none';
}, { passive: true });
document.addEventListener('touchmove', function (e) {
  if (!g || g.mode === 'none') return; var t = e.touches[0], dx = t.clientX - g.x, dy = t.clientY - g.y;
  if (g.mode === 'sheet') { if (dy > 0) { var sh = document.getElementById('sheet'); sh.style.transition = 'none'; sh.style.transform = 'translateY(' + dy + 'px)'; } return; }
  if (g.mode === 'free' && !g.locked) {
    if (Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx) && dy > 0 && window.scrollY <= 0) g.locked = 'pull';
    else if (Math.abs(dx) > 18 && Math.abs(dx) > Math.abs(dy) * 1.6) g.locked = 'swipe';
  }
  if (g.locked === 'pull') { var p = Math.min(dy, 140); ind.style.transition = 'none'; ind.style.top = (p * .6 - 40) + 'px'; ind.style.transform = 'rotate(' + (p * 2.5) + 'deg)'; ind.textContent = p > 90 ? '↻' : '↓'; g.pull = p; }
}, { passive: true });
function resetInd() { ind.style.transition = 'top .25s'; ind.style.top = '-48px'; }
document.addEventListener('touchend', function (e) {
  if (!g) return; var m = g.mode, lk = g.locked, ch = e.changedTouches[0], dx = ch.clientX - g.x, dy = ch.clientY - g.y, dt = Date.now() - g.t0; var gg = g; g = null;
  if (m === 'sheet') { var sh = document.getElementById('sheet'); sh.style.transition = ''; sh.style.transform = ''; if (dy > 110 || (dy > 50 && dt < 200)) Z.closeSheet(); return; }
  if (m !== 'free') return;
  if (lk === 'pull') {
    var go = (gg.pull || 0) > 90; resetInd();
    if (go) { try { navigator.vibrate && navigator.vibrate(12); } catch (x) { } Z.toast && Z.toast('Refreshing…'); try { Z.storeReset && Z.storeReset(); } catch (x) { } Promise.resolve(Z.loadAll ? Z.loadAll(true) : 0).catch(function () { }).then(function () { window.ZA && window.ZA.render && window.ZA.render(); }); }
    return;
  }
  if (lk === 'swipe' && Math.abs(dx) > 80 && Math.abs(dy) < 60 && dt < 700 && !hScroll(gg.el)) {
    var i = TABS.indexOf(route()), n = dx < 0 ? i + 1 : i - 1; if (n >= 0 && n < TABS.length) { try { navigator.vibrate && navigator.vibrate(8); } catch (x) { } location.hash = TABS[n]; }
  }
}, { passive: true });
document.addEventListener('touchcancel', function () { if (g && g.mode === 'sheet') { var sh = document.getElementById('sheet'); sh.style.transition = ''; sh.style.transform = ''; } g = null; resetInd(); }, { passive: true });
document.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('.btn-gold,.nav button,.qa,.chip')) { try { navigator.vibrate && navigator.vibrate(6); } catch (x) { } } }, true);
})();
