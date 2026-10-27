(function () {
'use strict';
/* =====================================================================
   ZYRON — invoicing that gets you paid.  Single-file PWA.
   Security model: this file holds ONLY the public (publishable) key.
   All money, status, numbering, ownership and limits are enforced by the
   database (RLS + guard triggers + RPCs). Nothing here is trusted.
   ===================================================================== */
var CFG = {
  URL: 'https://tnjgkxdjejjvujtteyfx.supabase.co',
  KEY: 'sb_publishable_i0cGrY8cPpKIN3zsss1a-w_I6qJ8xqK'
};
var THEMES = [
  { id: 'midnight_gold', name: 'Midnight Gold', a: '#d9b45b', b: '#0b0c10' },
  { id: 'emerald_elite', name: 'Emerald Elite', a: '#3ed6a0', b: '#06110d' },
  { id: 'royal_violet', name: 'Royal Violet', a: '#a99bff', b: '#0c0a17' },
  { id: 'ocean_luxe', name: 'Ocean Luxe', a: '#4cc9f0', b: '#060d15' },
  { id: 'ruby_noir', name: 'Ruby Noir', a: '#ff5468', b: '#0e0709' }
];
var CURRENCIES = ['NGN', 'USD', 'GBP', 'EUR', 'CAD', 'AUD'];
var METHODS = { bank_transfer: 'Bank transfer', cash: 'Cash', card: 'Card', pos: 'POS', other: 'Other' };
var STATUS_LABEL = { draft: 'Draft', sent: 'Sent', viewed: 'Viewed', partially_paid: 'Part paid', overdue: 'Overdue', paid: 'Paid', void: 'Cancelled' };
var OPEN = ['sent', 'viewed', 'partially_paid', 'overdue'];
var TERMS_PRESETS = [
  { l: 'Due on receipt', d: 0 }, { l: '7 days', d: 7 }, { l: '14 days', d: 14 }, { l: '30 days', d: 30 }, { l: 'Custom', d: 'custom' }
];
var NOTE_PRESETS = [
  'Thank you for your business.',
  'Payment is due by the date shown. Please use the invoice number as your transfer reference.',
  '50% deposit is required to begin work. Balance is due on delivery.'
];

var sb = null;
var S = {
  user: null, profile: null, clients: [], invoices: [], payments: [], activity: [], templates: [], stats: {}, cap: null,
  loaded: false, filter: 'all', q: '', cq: '', dcur: null, detail: {}, ready: false
};
var E = null; // invoice editor state

/* ---------- tiny helpers ---------- */
function $(s, r) { return (r || document).querySelector(s); }
function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function r2(n) { return Math.round((Number(n) + Number.EPSILON) * 100) / 100; }
function num(v) { var n = parseFloat(String(v == null ? '' : v).replace(/,/g, '')); return isFinite(n) ? n : 0; }
function fmtNum(v) { var s = String(v == null ? '' : v).replace(/[^0-9.]/g, ''); var i = s.indexOf('.'); if (i >= 0) s = s.slice(0, i + 1) + s.slice(i + 1).replace(/\./g, ''); var a = s.split('.'); a[0] = a[0].replace(/^0+(?=\d)/, '').replace(/\B(?=(\d{3})+(?!\d))/g, ','); return a.length > 1 ? a[0] + '.' + a[1].slice(0, 2) : a[0]; }
document.addEventListener('input', function (e) {
  var t = e.target; if (!t || !t.classList || !t.classList.contains('money')) return;
  var pos = t.selectionStart, before = t.value, digits = before.slice(0, pos).replace(/[^0-9.]/g, '').length, out = fmtNum(before);
  if (out !== before) { t.value = out; var n = 0, k = 0; while (k < out.length && n < digits) { if (/[0-9.]/.test(out[k])) n++; k++; } try { t.setSelectionRange(k, k); } catch (er) { } }
}, true);
function countUp(root) {
  var els = (root || document).querySelectorAll('.kpi b'); if (matchMedia('(prefers-reduced-motion:reduce)').matches) return;
  Array.prototype.forEach.call(els, function (el) {
    if (el.dataset.cu) return; var t = el.textContent, m = t.match(/^(\D*)([\d,]+(?:\.\d+)?)(.*)$/); if (!m) return;
    var end = parseFloat(m[2].replace(/,/g, '')); if (!(end > 0)) return; el.dataset.cu = 1; var t0 = performance.now(), dec = (m[2].split('.')[1] || '').length;
    (function f(now) { var p = Math.min(1, (now - t0) / 900), e = 1 - Math.pow(1 - p, 3), v = end * e; el.textContent = m[1] + v.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec }) + m[3]; if (p < 1) requestAnimationFrame(f); })(t0);
  });
}
new MutationObserver(function () { countUp(); }).observe(document.documentElement, { childList: true, subtree: true });
var SYM = { NGN: '₦', USD: '$', GBP: '£', EUR: '€', CAD: 'CA$', AUD: 'A$' };
var nfCache = {};
function money(n, cur) {
  cur = cur || (S.profile && S.profile.default_currency) || 'NGN'; n = Number(n) || 0;
  var whole = Math.abs(n) % 1 === 0, k = whole ? 'w' : 'f', f = nfCache[k];
  if (!f) { try { f = nfCache[k] = new Intl.NumberFormat('en-NG', { maximumFractionDigits: 2, minimumFractionDigits: whole ? 0 : 2 }); } catch (e) { f = nfCache[k] = { format: function (x) { return String(x); } }; } }
  return (n < 0 ? '−' : '') + (SYM[cur] || cur + ' ') + f.format(Math.abs(n));
}
function moneyParts(n, cur) { var m = money(n, cur); var sym = SYM[cur] || cur + ' '; return { sym: sym, rest: m.replace(sym, '') }; }
function lagosToday() { return new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Lagos' }); }
function isoToMs(iso) { return Date.parse(String(iso).slice(0, 10) + 'T12:00:00Z'); }
function addDaysISO(iso, d) { return new Date(isoToMs(iso) + d * 86400000).toISOString().slice(0, 10); }
function diffDays(aIso, bIso) { return Math.round((isoToMs(aIso) - isoToMs(bIso)) / 86400000); }
function fmtDate(iso) { if (!iso) return '—'; return new Date(isoToMs(iso)).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }); }
function fmtDateTime(ts) { return new Date(ts).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Africa/Lagos' }); }
function timeAgo(ts) {
  var s = Math.max(0, (Date.now() - new Date(ts).getTime()) / 1000);
  if (s < 60) return 'just now'; if (s < 3600) return Math.floor(s / 60) + ' min ago';
  if (s < 86400) return Math.floor(s / 3600) + ' h ago'; if (s < 604800) return Math.floor(s / 86400) + ' d ago';
  return fmtDate(new Date(ts).toISOString().slice(0, 10));
}
function ic(n, c) { return '<svg class="ic ' + (c || '') + '" aria-hidden="true"><use href="#ic-' + n + '"/></svg>'; }
function zmk(c) { return '<svg class="zmk ' + (c || '') + '" viewBox="0 0 64 64" aria-hidden="true"><use href="#zlogo"/></svg>'; }
function initials(n) { n = String(n || '?').trim().split(/\s+/); return ((n[0] || '?')[0] + (n.length > 1 ? n[n.length - 1][0] : '')).toUpperCase(); }
function themeOf(id) { return THEMES.filter(function (t) { return t.id === id; })[0] || THEMES[0]; }
function clientById(id) { return S.clients.filter(function (c) { return c.id === id; })[0]; }
function invById(id) { return S.invoices.filter(function (i) { return i.id === id; })[0]; }
function bal(i) { return r2(Number(i.total) - Number(i.amount_paid)); }
function safeLogo(u) { return u && String(u).indexOf(CFG.URL + '/storage/') === 0 ? u : ''; }
function normPhone(p) {
  var d = String(p || '').replace(/[^\d]/g, ''); if (!d) return '';
  if (d.indexOf('00') === 0) d = d.slice(2);
  if (d.charAt(0) === '0' && d.length === 11) return '234' + d.slice(1);
  if (d.length === 10 && /^[789]/.test(d)) return '234' + d;
  return d;
}
function shareUrl(tok) { return location.origin + location.pathname + '#/i/' + tok; }
function errMsg(e) {
  var m = (e && (e.message || e.error_description || e.msg)) || String(e || 'Something went wrong');
  if (/Failed to fetch|NetworkError|Load failed/i.test(m)) return 'No connection. Check your data and try again.';
  if (/Invoice limit reached/i.test(m)) return 'You have reached 100 invoices for this 30-day cycle.';
  if (/Invalid login/i.test(m)) return 'Wrong email or password.';
  if (/already registered|already been registered/i.test(m)) return 'That email already has an account. Sign in instead.';
  if (/password/i.test(m) && /(6|8|short|weak)/i.test(m)) return 'Choose a stronger password (8+ characters).';
  if (/rate limit|too many/i.test(m)) return 'Too many attempts. Please wait a minute and try again.';
  if (/provider is not enabled|Unsupported provider/i.test(m)) return 'Google sign-in is not switched on yet. Please try again shortly.';
  if (/Trial limit reached/i.test(m)) return 'Your free trial includes 15 invoices. Choose a plan to keep going.';
  if (/ZY_EMAIL_BLOCKED/.test(m)) return 'Please use your real email address. Temporary email services are not allowed.';
  if (/ZY_FULL/.test(m) || (/Database error saving new user/.test(m) && S.signup && S.signup.open === false)) return 'Zyron is full right now. Join the waitlist below and we will message you when more spots open.';
  if (/ZY_EMAIL_USED|Database error saving new user|ZY_EMAIL_INVALID/.test(m)) return 'This email has already used a Zyron trial, or cannot be used. Sign in instead, or try a different email.';
  if (/row-level security|not authorized|unauthorized|JWT/i.test(m)) return 'That action was not allowed. Please sign in again and retry.';
  if (/violates foreign key/i.test(m)) return 'This item is still in use, so it cannot be removed.';
  return m.replace(/^.*?ERROR:\s*/, '');
}

/* ---------- toast / sheet (back-gesture aware) ---------- */
var toastT;
function toast(msg, bad) {
  var t = $('#toast'); if (!t) return; t.textContent = msg; t.className = 'toast on' + (bad ? ' bad' : '');
  clearTimeout(toastT); toastT = setTimeout(function () { t.className = 'toast'; }, bad ? 3800 : 2200);
}
var sheetOpen = false, sheetOnClose = null;
function openSheet(title, html, onClose) {
  var sh = $('#sheet'), sc = $('#scrim');
  sh.innerHTML = '<div class="grab"></div><div class="sh-head"><h2>' + esc(title) + '</h2><button class="icon-btn" data-act="sheet-close" aria-label="Close">' + ic('x') + '</button></div><div class="sh-body" id="shbody">' + html + '</div>';
  sheetOnClose = onClose || null;
  if (!sheetOpen) { history.pushState({ zsheet: 1 }, ''); }
  sheetOpen = true; sh.classList.add('on'); sc.classList.add('on'); document.body.classList.add('locked');
  var b = $('#shbody'); if (b) b.scrollTop = 0;
}
function setSheetBody(html) { var b = $('#shbody'); if (b) { b.innerHTML = html; } }
function hideSheet() {
  var sh = $('#sheet'), sc = $('#scrim'); sh.classList.remove('on'); sc.classList.remove('on'); document.body.classList.remove('locked');
  sheetOpen = false; var cb = sheetOnClose; sheetOnClose = null; if (cb) cb();
}
function closeSheet() { if (!sheetOpen) return; if (history.state && history.state.zsheet) history.back(); else hideSheet(); }
window.addEventListener('popstate', function () { if (sheetOpen) hideSheet(); });

/* ---------- supabase ---------- */
function initSB() {
  if (!window.supabase || !window.supabase.createClient) return false;
  sb = window.supabase.createClient(CFG.URL, CFG.KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
  return true;
}
async function q(p) { var r = await p; if (r && r.error) throw r.error; return r.data; }

async function loadAll(silent) {
  var uid = S.user.id;
  if (!silent) { try { await sb.rpc('sync_overdue'); await sb.rpc('run_due_templates'); } catch (e) { /* non-fatal */ } }
  var r = await Promise.all([
    sb.from('profiles').select('*').eq('id', uid).single(),
    sb.from('clients').select('*').order('name'),
    sb.from('invoices').select('*').order('created_at', { ascending: false }).limit(500),
    sb.from('payments').select('*').order('paid_on', { ascending: false }).limit(1000),
    sb.from('activity').select('*').order('created_at', { ascending: false }).limit(80),
    sb.from('invoice_templates').select('*').order('created_at', { ascending: false }),
    sb.from('client_stats').select('*'),
    sb.rpc('get_capacity')
  ]);
  for (var i = 0; i < r.length; i++) { if (r[i].error) throw r[i].error; }
  S.profile = r[0].data; S.clients = r[1].data || []; S.invoices = r[2].data || []; S.payments = r[3].data || [];
  S.activity = r[4].data || []; S.templates = r[5].data || [];
  S.stats = {}; (r[6].data || []).forEach(function (s) { S.stats[s.client_id] = s; });
  S.cap = r[7].data; S.loaded = true; S.detail = {};
  if (!S.dcur) S.dcur = (S.profile && S.profile.default_currency) || 'NGN';
}

/* ---------- money math (mirror of the database, preview only) ---------- */
function calcTotals(items, discount, vatRate) {
  var sub = 0; items.forEach(function (i) { sub += r2(num(i.q) * num(i.p)); }); sub = r2(sub);
  var disc = Math.min(Math.max(num(discount), 0), sub);
  var base = Math.max(sub - disc, 0); var vat = r2(base * num(vatRate) / 100);
  return { sub: sub, disc: disc, vat: vat, total: r2(base + vat) };
}

/* ---------- invoice paper (shared by owner view, preview, public page) ---------- */
function statusLine(inv) {
  var due = fmtDate(inv.due_date);
  if (inv.status === 'draft') return 'Draft';
  if (inv.status === 'paid') return 'Paid in full';
  if (inv.status === 'void') return 'Cancelled';
  if (inv.status === 'overdue') return 'Overdue · was due ' + due;
  if (inv.status === 'partially_paid') return 'Part paid · due ' + due;
  return 'Awaiting payment · due ' + due;
}
function invoiceHTML(d, opt) {
  opt = opt || {};
  var inv = d.invoice, b = d.business || {}, cur = inv.currency;
  var due = Math.max(r2(Number(inv.total) - Number(inv.amount_paid || 0)), 0);
  var lines = (d.items || []).map(function (i) {
    return '<div class="inv-line"><b>' + esc(i.description || 'Item') + '</b><span>' + esc(num(i.quantity)) + ' × ' + money(i.unit_price, cur) + '</span><span class="a">' + money(i.line_total != null ? i.line_total : r2(num(i.quantity) * num(i.unit_price)), cur) + '</span></div>';
  }).join('') || '<div class="inv-line"><b style="color:var(--iv-muted)">No items yet</b><span></span></div>';
  var rows = '<div><dt>Subtotal</dt><dd>' + money(inv.subtotal, cur) + '</dd></div>';
  if (Number(inv.discount) > 0) rows += '<div><dt>Discount</dt><dd>−' + money(inv.discount, cur) + '</dd></div>';
  if (Number(inv.vat_rate) > 0) rows += '<div><dt>' + (inv.currency === 'NGN' ? 'VAT' : 'Tax') + ' (' + esc(num(inv.vat_rate)) + '%)</dt><dd>' + money(inv.vat_amount, cur) + '</dd></div>';
  rows += '<div><dt>Total</dt><dd>' + money(inv.total, cur) + '</dd></div>';
  var paidRows = '';
  if ((d.payments || []).length) {
    paidRows = '<div class="inv-paid">' + d.payments.map(function (p) { return '<div><span>Paid ' + fmtDate(p.paid_on) + ' · ' + esc(METHODS[p.method] || p.method) + '</span><span>−' + money(p.amount, cur) + '</span></div>'; }).join('') + '</div>';
  }
  var logo = safeLogo(b.logo_url);
  var brand = (logo ? '<img class="lg" src="' + esc(logo) + '" alt="">' : '<svg class="ic-mark" viewBox="0 0 64 64" aria-hidden="true"><use href="#zlogo"/></svg>') +
    '<div><b>' + esc(b.business_name || b.full_name || 'Your business') + '</b><span>' + esc([b.address, b.phone, b.email, b.website].filter(Boolean).join(' · ')) + '</span></div>';
  var showPay = inv.status !== 'draft' && inv.status !== 'void' && inv.status !== 'paid' && (b.account_number || b.bank_name || b.intl_bank);
  var pay = '';
  if (showPay || (opt.preview && (b.account_number || b.bank_name || b.intl_bank))) {
    pay = '<div class="inv-pay"><small>Pay by bank transfer</small>' +
      (b.bank_name ? '<div class="row"><span>Bank</span><b>' + esc(b.bank_name) + '</b></div>' : '') +
      (b.account_name ? '<div class="row"><span>Account name</span><b>' + esc(b.account_name) + '</b></div>' : '') +
      (b.account_number ? '<div class="row"><span>Account number</span><b>' + esc(b.account_number) + '</b><button class="inv-copy noprint" type="button" data-act="copy" data-v="' + esc(b.account_number) + '" aria-label="Copy account number">' + ic('copy', 'ic-sm') + '</button></div>' : '') +
      (b.intl_bank ? '<div class="row"><span>International</span><b style="white-space:pre-line;text-align:right">' + esc(b.intl_bank) + '</b></div>' : '') +
      '<div class="row"><span>Reference</span><b>' + esc(inv.invoice_number) + '</b></div></div>';
  }
  var payUrl = (inv.pay_link && /^https:\/\/\S+$/.test(inv.pay_link)) ? inv.pay_link : '';
  var qrTarget = payUrl || opt.shareUrl || '', qrBlock = '';
  if (inv.status !== 'void' && inv.status !== 'paid' && qrTarget && window.ZQR) {
    var host = ''; try { host = new URL(payUrl).hostname; } catch (e) { host = ''; }
    var bizName = b.business_name || b.full_name || 'the business';
    qrBlock = '<div class="inv-qr' + (payUrl ? '' : ' printonly') + '"><div class="qrbox">' + window.ZQR.svg(qrTarget, { label: payUrl ? 'QR code to pay' : 'QR code to open this invoice' }) + '</div><div><b>' + (payUrl ? 'Scan to pay' : 'Scan to view online') + '</b><span>' + (payUrl ? 'Opens the payment page set by ' + esc(bizName) + (host ? ' (' + esc(host) + ')' : '') + '.' : 'Opens this invoice on your phone.') + '</span>' +
      (payUrl ? '<a class="paynow noprint" href="' + esc(payUrl) + '" target="_blank" rel="noopener noreferrer">Pay now</a>' : '') + '</div></div>';
  }
  var notes = '';
  if (inv.notes) notes += '<p class="inv-note"><b>Notes.</b> ' + esc(inv.notes) + '</p>';
  if (inv.terms) notes += '<p class="inv-note"><b>Terms.</b> ' + esc(inv.terms) + '</p>';
  var by = opt.growth ? '<a class="by" href="' + esc(location.origin + location.pathname) + '" target="_blank" rel="noopener"><svg viewBox="0 0 64 64" aria-hidden="true"><use href="#zlogo"/></svg>Sent with Zyron</a>' : '<span class="by"><svg viewBox="0 0 64 64" aria-hidden="true"><use href="#zlogo"/></svg>Zyron</span>';
  var trial = !!(opt.trial || inv.trial);
  var wm = trial ? '<div class="inv-wm" aria-hidden="true"><span>Zyron Trial</span><span>Zyron Trial</span><span>Zyron Trial</span></div>' : '';
  return '<article class="inv" data-theme="' + esc(inv.theme || 'midnight_gold') + '">' + wm +
    '<div class="inv-head"><div class="inv-brand">' + brand + '</div><div class="inv-title"><small>Invoice</small><b>' + esc(inv.invoice_number || 'Draft') + '</b></div></div>' +
    '<div class="inv-meta"><div><small>Billed to</small><b>' + esc((d.client && d.client.name) || '—') + '</b></div><div><small>Issued</small><b>' + fmtDate(inv.issue_date) + '</b></div><div><small>Due</small><b>' + fmtDate(inv.due_date) + '</b></div></div>' +
    '<span class="inv-pill">' + esc(statusLine(inv)) + '</span>' +
    '<div class="inv-lines">' + lines + '</div>' +
    '<dl class="inv-totals">' + rows + '</dl>' + paidRows +
    '<div class="inv-hero"><small>' + (inv.status === 'paid' ? 'Paid' : 'Amount due') + '</small><b>' + money(inv.status === 'paid' ? inv.total : due, cur) + '</b></div>' +
    pay + qrBlock + notes +
    '<div class="inv-foot"><span class="secure">' + ic('lock', 'ic-sm') + 'Secure invoice</span>' + by + '</div></article>';
}
function ownerPaper(inv, items, opt) {
  var c = clientById(inv.client_id) || { name: '—' };
  var pays = S.payments.filter(function (p) { return p.invoice_id === inv.id; }).slice().reverse();
  opt = opt || {}; opt.trial = S.cap ? (S.cap.plan || 'trial') === 'trial' : true;
  if (inv.share_token && inv.status !== 'draft') opt.shareUrl = shareUrl(inv.share_token);
  inv = Object.assign({}, inv, { pay_link: inv.pay_link || (S.profile && S.profile.pay_link) || '' });
  return invoiceHTML({ invoice: inv, client: c, business: S.profile, items: items || [], payments: pays }, opt);
}

/* ---------- reminders + sharing text ---------- */
function reminderKind(inv) {
  var today = lagosToday(), d = diffDays(inv.due_date, today);
  if (d < 0) return 'late'; if (d === 0) return 'today'; if (d <= 3) return 'soon'; return 'nudge';
}
function reminderText(inv, kind) {
  var c = clientById(inv.client_id) || { name: 'there' }, p = S.profile || {}, biz = p.business_name || p.full_name || 'Zyron';
  var link = shareUrl(inv.share_token), amt = money(bal(inv), inv.currency), first = String(c.name).split(' ')[0];
  kind = kind || reminderKind(inv);
  var body = {
    soon: 'Hi ' + first + ', a friendly reminder that invoice ' + inv.invoice_number + ' for ' + amt + ' is due on ' + fmtDate(inv.due_date) + '.',
    today: 'Hi ' + first + ', invoice ' + inv.invoice_number + ' for ' + amt + ' is due today.',
    late: 'Hi ' + first + ', invoice ' + inv.invoice_number + ' for ' + amt + ' was due on ' + fmtDate(inv.due_date) + ' and is still open. Could you please arrange payment today?',
    nudge: 'Hi ' + first + ', just checking in on invoice ' + inv.invoice_number + ' for ' + amt + ', due ' + fmtDate(inv.due_date) + '.'
  }[kind];
  return body + '\nView and pay: ' + link + '\nThank you. ' + biz;
}
function shareText(inv) {
  var c = clientById(inv.client_id) || { name: 'there' }, p = S.profile || {}, biz = p.business_name || p.full_name || '';
  return 'Hi ' + String(c.name).split(' ')[0] + ', here is invoice ' + inv.invoice_number + (biz ? ' from ' + biz : '') + ' for ' + money(inv.total, inv.currency) + ', due ' + fmtDate(inv.due_date) + '.\nView and pay: ' + shareUrl(inv.share_token);
}
function waLink(phone, text) { var n = normPhone(phone); return 'https://wa.me/' + n + '?text=' + encodeURIComponent(text); }
function copyText(t, msg) {
  function fb() { try { var a = document.createElement('textarea'); a.value = t; a.style.position = 'fixed'; a.style.opacity = '0'; document.body.appendChild(a); a.select(); document.execCommand('copy'); a.remove(); toast(msg || 'Copied'); } catch (e) { toast('Could not copy', true); } }
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(function () { toast(msg || 'Copied'); }, fb); else fb();
}

/* ---------- metrics + insights (rule-based, no fake AI) ---------- */
function monthKey(iso) { return String(iso).slice(0, 7); }
function metrics(cur) {
  var ids = {}; S.invoices.forEach(function (i) { if (i.currency === cur) ids[i.id] = i; });
  var pays = S.payments.filter(function (p) { return ids[p.invoice_id]; });
  var today = lagosToday(), thisM = monthKey(today), prevM = monthKey(addDaysISO(thisM + '-01', -1));
  var m = { cur: cur, thisMonth: 0, prevMonth: 0, paid: 0, pending: 0, overdue: 0, outstanding: 0, overdueAmt: 0, total: 0, avg: 0, avgDays: null, count: 0, weeks: [], months: [], top: [], delta: null };
  pays.forEach(function (p) { var k = monthKey(p.paid_on); m.total += Number(p.amount); if (k === thisM) m.thisMonth += Number(p.amount); if (k === prevM) m.prevMonth += Number(p.amount); });
  var sumTot = 0, n = 0, dsum = 0, dn = 0;
  S.invoices.forEach(function (i) {
    if (i.currency !== cur) return;
    if (i.status === 'paid') m.paid++; else if (i.status === 'overdue') m.overdue++; else if (i.status === 'sent' || i.status === 'viewed' || i.status === 'partially_paid') m.pending++;
    if (OPEN.indexOf(i.status) >= 0) { m.outstanding += bal(i); if (i.status === 'overdue') m.overdueAmt += bal(i); }
    if (i.status !== 'draft' && i.status !== 'void') { sumTot += Number(i.total); n++; }
    if (i.status === 'paid' && i.sent_at && i.paid_at) { dsum += Math.max(0, (new Date(i.paid_at) - new Date(i.sent_at)) / 86400000); dn++; }
  });
  m.count = n; m.avg = n ? sumTot / n : 0; m.avgDays = dn ? dsum / dn : null;
  m.delta = m.prevMonth > 0 ? ((m.thisMonth - m.prevMonth) / m.prevMonth) * 100 : null;
  // 8 weekly buckets ending today
  for (var w = 7; w >= 0; w--) {
    var to = addDaysISO(today, -w * 7), from = addDaysISO(to, -6), s = 0;
    pays.forEach(function (p) { if (p.paid_on >= from && p.paid_on <= to) s += Number(p.amount); });
    m.weeks.push(s);
  }
  // 6 month bars
  for (var k = 5; k >= 0; k--) {
    var d = new Date(isoToMs(thisM + '-01')); d.setUTCMonth(d.getUTCMonth() - k);
    var key = d.toISOString().slice(0, 7), sm = 0; pays.forEach(function (p) { if (monthKey(p.paid_on) === key) sm += Number(p.amount); });
    m.months.push({ k: key, label: d.toLocaleDateString('en-GB', { month: 'short', timeZone: 'UTC' }), v: sm });
  }
  var byC = {}; pays.forEach(function (p) { var inv = ids[p.invoice_id]; byC[inv.client_id] = (byC[inv.client_id] || 0) + Number(p.amount); });
  m.top = Object.keys(byC).map(function (id) { return { id: id, name: (clientById(id) || { name: 'Client' }).name, v: byC[id] }; }).sort(function (a, b) { return b.v - a.v; }).slice(0, 5);
  return m;
}
function currenciesUsed() {
  var seen = {}; S.invoices.forEach(function (i) { seen[i.currency] = (seen[i.currency] || 0) + 1; });
  var arr = Object.keys(seen).sort(function (a, b) { return seen[b] - seen[a]; });
  var d = (S.profile && S.profile.default_currency) || 'NGN'; if (arr.indexOf(d) < 0) arr.unshift(d);
  return arr;
}
function insights() {
  var out = [], now = Date.now(), today = lagosToday();
  var open = S.invoices.filter(function (i) { return OPEN.indexOf(i.status) >= 0; });
  open.filter(function (i) { return i.claimed_at && now - new Date(i.claimed_at).getTime() < 7 * 86400000; }).slice(0, 1).forEach(function (i) {
    var cc = clientById(i.client_id) || { name: 'Your client' };
    out.push({ tone: 'gold', icon: 'check', title: cc.name + ' says they have paid', sub: i.invoice_number + ' · check your account, then record the payment', nav: '#/inv/' + i.id });
  });
  var overdue = open.filter(function (i) { return i.status === 'overdue'; }).sort(function (a, b) { return a.due_date < b.due_date ? -1 : 1; });
  if (overdue.length) {
    var o = overdue[0], c = clientById(o.client_id) || { name: 'A client' }, tot = {}; overdue.forEach(function (i) { tot[i.currency] = (tot[i.currency] || 0) + bal(i); });
    var cur = o.currency;
    out.push({ tone: 'warn', icon: 'clock', title: overdue.length === 1 ? c.name + ' is overdue' : overdue.length + ' invoices are overdue', sub: money(tot[cur], cur) + ' waiting · oldest is ' + Math.abs(diffDays(o.due_date, today)) + ' days late', inv: o, kind: 'late' });
  }
  var viewed = open.filter(function (i) { return i.viewed_at && now - new Date(i.viewed_at).getTime() < 3 * 86400000 && i.status !== 'overdue'; }).sort(function (a, b) { return a.viewed_at < b.viewed_at ? 1 : -1; });
  if (viewed.length) {
    var v = viewed[0], vc = clientById(v.client_id) || { name: 'Your client' };
    out.push({ tone: 'blue', icon: 'eye', title: vc.name + ' opened your invoice', sub: v.invoice_number + ' · ' + timeAgo(v.viewed_at) + ' · opened ' + v.view_count + '×', inv: v, kind: 'nudge' });
  }
  var soon = open.filter(function (i) { var d = diffDays(i.due_date, today); return d >= 0 && d <= 3 && i.status !== 'overdue'; }).sort(function (a, b) { return a.due_date < b.due_date ? -1 : 1; });
  if (soon.length) {
    var s = soon[0], sc = clientById(s.client_id) || { name: 'A client' }, dd = diffDays(s.due_date, today);
    out.push({ tone: 'gold', icon: 'bell', title: sc.name + ' is due ' + (dd === 0 ? 'today' : dd === 1 ? 'tomorrow' : 'in ' + dd + ' days'), sub: s.invoice_number + ' · ' + money(bal(s), s.currency) + ' to collect', inv: s, kind: dd === 0 ? 'today' : 'soon' });
  }
  var m = metrics(S.dcur || 'NGN');
  if (m.delta !== null && m.thisMonth > 0) out.push({ tone: 'gold', icon: 'chart', title: 'Revenue flow ' + (m.delta >= 0 ? 'up ' : 'down ') + Math.abs(Math.round(m.delta)) + '%', sub: 'You have received ' + money(m.thisMonth, m.cur) + ' this month vs ' + money(m.prevMonth, m.cur) + ' last month', nav: '#/analytics' });
  if (S.cap && S.cap.limit - S.cap.used <= 10) out.push({ tone: 'warn', icon: 'file', title: 'Invoice capacity is low', sub: (S.cap.limit - S.cap.used) + ' invoices left' + (S.cap.plan === 'trial' ? ' in your trial' : ' this cycle') });
  if (S.cap && S.cap.plan === 'trial' && S.cap.trial_ends_at) {
    var dl = Math.ceil((new Date(S.cap.trial_ends_at) - now) / 86400000);
    if (dl <= 3 && dl >= 0) out.push({ tone: 'gold', icon: 'spark', title: 'Your trial ends in ' + dl + ' day' + (dl === 1 ? '' : 's'), sub: 'Plans open soon. Nothing changes until you choose one.', nav: '#/plan' });
  }
  return out;
}

window.Z = { CFG: CFG, THEMES: THEMES, CURRENCIES: CURRENCIES, METHODS: METHODS, STATUS_LABEL: STATUS_LABEL, OPEN: OPEN, TERMS_PRESETS: TERMS_PRESETS, NOTE_PRESETS: NOTE_PRESETS,
  S: S, $: $, $$: $$, esc: esc, r2: r2, num: num, money: money, moneyParts: moneyParts, lagosToday: lagosToday, addDaysISO: addDaysISO, diffDays: diffDays, fmtDate: fmtDate, fmtDateTime: fmtDateTime, timeAgo: timeAgo,
  ic: ic, zmk: zmk, initials: initials, themeOf: themeOf, clientById: clientById, invById: invById, bal: bal, safeLogo: safeLogo, normPhone: normPhone, shareUrl: shareUrl, errMsg: errMsg,
  toast: toast, openSheet: openSheet, setSheetBody: setSheetBody, closeSheet: closeSheet, hideSheet: hideSheet, isSheetOpen: function () { return sheetOpen; },
  fmtNum: fmtNum, initSB: initSB, getSB: function () { return sb; }, q: q, loadAll: loadAll, calcTotals: calcTotals, statusLine: statusLine, invoiceHTML: invoiceHTML, ownerPaper: ownerPaper,
  reminderKind: reminderKind, reminderText: reminderText, shareText: shareText, waLink: waLink, copyText: copyText, metrics: metrics, currenciesUsed: currenciesUsed, insights: insights,
  getE: function () { return E; }, setE: function (e) { E = e; }
};
})();
