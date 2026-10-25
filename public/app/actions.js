(function () {
'use strict';
var Z = window.Z, S = Z.S, $ = Z.$, esc = Z.esc, ic = Z.ic, zmk = Z.zmk, money = Z.money, SCR = Z.SCR, H = Z.helpers, toast = Z.toast, num = Z.num;
var sb = null, PUB = null, lastKey = null, pendingAfter = null, pendingConfirm = null, deferredInstall = null, obShown = false, loadErr = null;
S.authMode = 'in';

function route() { var h = location.hash.replace(/^#\/?/, ''); var parts = h.split('?')[0].split('/'); return { n: parts[0] || '', a: parts[1] || '', q: h.split('?')[1] || '' }; }
function qparam(q, k) { var m = new RegExp('(?:^|&)' + k + '=([^&]*)').exec(q || ''); return m ? decodeURIComponent(m[1]) : ''; }
function go(h) { if (location.hash === h) render(); else location.hash = h; }
function closeThen(fn) { if (!Z.isSheetOpen()) return fn(); pendingAfter = fn; Z.closeSheet(); if (!Z.isSheetOpen() && pendingAfter) { var f = pendingAfter; pendingAfter = null; fn = null; f(); } }
window.addEventListener('popstate', function () { if (pendingAfter) { var f = pendingAfter; pendingAfter = null; setTimeout(f, 0); } });
function val(id) { var e = document.getElementById(id); return e ? String(e.value).trim() : ''; }
function setBusy(btn, on, label) { if (!btn) return; btn.disabled = !!on; if (label) btn.textContent = label; }
function confirmSheet(title, text, label, fn, danger) {
  pendingConfirm = fn;
  Z.openSheet(title, '<p style="margin:0;color:var(--muted)">' + esc(text) + '</p><div class="btn-row"><button class="btn btn-grow" data-act="sheet-close">Keep it</button><button class="btn ' + (danger ? 'btn-danger' : 'btn-gold') + ' btn-grow" data-act="confirm-yes">' + esc(label) + '</button></div>');
}

/* ================= render ================= */
async function render() {
  var r = route(), el = $('#app'), key = location.hash;
  document.title = 'Zyron Studio — Build your online store';
  if (r.n === 'i') { return renderPublic(r.a); }
  if (r.n === 'terms' || r.n === 'privacy') { el.innerHTML = r.n === 'terms' ? SCR.terms() : SCR.privacy(); window.scrollTo(0, 0); lastKey = key; return; }
  if (!S.user) {
    if (r.n !== 'auth') { location.replace('#/auth'); return; }
    el.innerHTML = SCR.auth(); if (key !== lastKey) window.scrollTo(0, 0); lastKey = key; return;
  }
  if (r.n === 'auth') { location.replace('#/home'); return; }
  if (loadErr) { el.innerHTML = '<div class="auth">' + '<div class="logo">' + zmk() + '</div><h1>Couldn’t load your workspace</h1><p class="sub">' + esc(loadErr) + '</p><button class="btn btn-gold btn-block" data-act="retry">Try again</button><button class="link-btn" data-act="signout" style="align-self:center">Sign out</button></div>'; return; }
  if (!S.loaded) { el.innerHTML = '<div class="screen">' + H.skeleton(5) + '</div>'; return; }
  if (r.n !== 'new' && r.n !== 'edit') Z.setE(null);
  var html = '';
  switch (r.n) {
    case '': case 'home': html = SCR.shome ? SCR.shome() : '<div class="screen">' + H.skeleton(4) + '</div>'; setTimeout(Z.tourMaybe, 0); break;
    case 'billing': html = SCR.home(); break;
    case 'products': html = SCR.sproducts ? SCR.sproducts() : '<div class="screen">' + H.skeleton(4) + '</div>'; break;
    case 'orders': html = SCR.sorders ? SCR.sorders() : '<div class="screen">' + H.skeleton(4) + '</div>'; break;
    case 'invoices': html = SCR.invoices(); break;
    case 'inv': html = SCR.detail(r.a); loadDetail(r.a); break;
    case 'new': case 'edit':
      if (!Z.getE() || Z.getE().key !== key) { await initEditor(r, key); }
      if (location.hash !== key) return;
      html = SCR.editor(); break;
    case 'clients': html = SCR.clients(); break;
    case 'more': html = SCR.more(); break;
    case 'analytics': html = SCR.analytics(); break;
    case 'templates': html = SCR.templates(); break;
    case 'settings': html = SCR.settings(); break;
    case 'plan': html = SCR.plan(); break;
    case 'help': html = SCR.help(); break;
    default: html = SCR.home();
  }
  el.innerHTML = html; if (key !== lastKey) window.scrollTo(0, 0); lastKey = key;
}
async function renderPublic(tok) {
  var el = $('#app');
  if (!/^[0-9a-f-]{36}$/i.test(tok)) { el.innerHTML = SCR.publicMissing(); return; }
  if (PUB && PUB.token === tok) { el.innerHTML = SCR.publicInvoice(PUB.d, tok); return; }
  el.innerHTML = SCR.publicLoading();
  try {
    var d = await Z.q(sb.rpc('get_public_invoice', { p_token: tok }));
    if (!d) { el.innerHTML = SCR.publicMissing(); return; }
    PUB = { d: d, token: tok }; var b = d.business || {};
    document.title = 'Invoice ' + d.invoice.invoice_number + ' from ' + (b.business_name || b.full_name || 'your supplier');
    el.innerHTML = SCR.publicInvoice(d, tok);
  } catch (e) { el.innerHTML = '<div class="pub" style="min-height:70dvh;justify-content:center">' + H.empty('Couldn’t open this invoice', Z.errMsg(e), '<button class="btn btn-gold" data-act="retry">Try again</button>') + '</div>'; }
}
async function loadDetail(id) {
  if (S.detail[id] || !Z.invById(id)) return;
  try {
    var r = await Promise.all([sb.from('invoice_items').select('*').eq('invoice_id', id).order('position'), sb.from('activity').select('*').eq('invoice_id', id).order('created_at')]);
    if (r[0].error) throw r[0].error; if (r[1].error) throw r[1].error;
    S.detail[id] = { items: r[0].data || [], activity: r[1].data || [] };
    if (route().n === 'inv' && route().a === id && !Z.isSheetOpen()) render();
  } catch (e) { toast(Z.errMsg(e), true); }
}
async function refresh() { try { await Z.loadAll(true); } catch (e) { toast(Z.errMsg(e), true); } render(); }

/* ================= editor ================= */
async function initEditor(r, key) {
  var p = S.profile, today = Z.lagosToday(), dd = Number(p.default_due_days);
  var e = { key: key, id: null, number: '', client_id: '', currency: p.default_currency || 'NGN', issue_date: today, items: [{ d: '', q: '1', p: '' }], disc: '', discMode: 'amt', vat: '0', vatCustom: false, termsKey: [0, 7, 14, 30].indexOf(dd) >= 0 ? String(dd) : 'custom', due_date: Z.addDaysISO(today, dd), notes: '', terms: p.default_terms || '', theme: p.default_theme || 'midnight_gold', mode: 'edit', saving: false };
  if (r.n === 'new') { var c = qparam(r.q, 'client'); if (c && Z.clientById(c)) e.client_id = c; }
  if (r.n === 'edit') {
    var inv = Z.invById(r.a);
    if (!inv || inv.status !== 'draft') { Z.setE(null); location.replace('#/inv/' + r.a); return; }
    try {
      var items = await Z.q(sb.from('invoice_items').select('*').eq('invoice_id', inv.id).order('position'));
      var sub = Z.calcTotals(items.map(function (i) { return { q: i.quantity, p: i.unit_price }; }), 0, 0).sub;
      var vatNum = Number(inv.vat_rate);
      e.id = inv.id; e.number = inv.invoice_number; e.client_id = inv.client_id; e.currency = inv.currency; e.issue_date = inv.issue_date; e.due_date = inv.due_date;
      e.items = items.length ? items.map(function (i) { return { d: i.description, q: String(Number(i.quantity)), p: String(Number(i.unit_price)) }; }) : e.items;
      e.disc = Number(inv.discount) ? String(Number(inv.discount)) : ''; e.vat = String(vatNum); e.vatCustom = vatNum !== 0 && vatNum !== 7.5;
      e.notes = inv.notes || ''; e.terms = inv.terms || ''; e.theme = inv.theme; var dif = Z.diffDays(inv.due_date, inv.issue_date); e.termsKey = [0, 7, 14, 30].indexOf(dif) >= 0 ? String(dif) : 'custom';
      void sub;
    } catch (er) { toast(Z.errMsg(er), true); location.replace('#/invoices'); return; }
  }
  Z.setE(e);
}
function liveEditor() {
  var e = Z.getE(); if (!e) return; var t = Z.calcTotals(e.items, Z.discAmount(), e.vat);
  var b = $('#barTotal'); if (b) b.textContent = money(t.total, e.currency);
  var d = $('#ed_due'); if (d) d.textContent = (e.due_date === e.issue_date ? 'Due on receipt, ' : 'Due ') + Z.fmtDate(e.due_date);
}
function validateEditor(forSend) {
  var e = Z.getE(); if (!e.client_id) return 'Choose a client first.';
  var items = e.items.filter(function (i) { return i.d.trim(); });
  if (!items.length) return 'Add at least one item with a description.';
  for (var k = 0; k < items.length; k++) { if (num(items[k].q) <= 0) return 'Quantity must be above zero.'; if (num(items[k].p) < 0) return 'Price cannot be negative.'; }
  if (!e.issue_date || !e.due_date) return 'Pick the dates.'; if (e.due_date < e.issue_date) return 'Due date cannot be before the issue date.';
  var vat = num(e.vat); if (vat < 0 || vat > 100) return 'Tax must be between 0 and 100%.';
  if (forSend && Z.calcTotals(items.map(function (i) { return { q: i.q, p: i.p }; }), Z.discAmount(), e.vat).total <= 0) return 'The total must be above zero before sending.';
  return '';
}
async function saveInvoice(send) {
  var e = Z.getE(); if (!e || e.saving) return;
  var msg = validateEditor(send); if (msg) { toast(msg, true); return; }
  e.saving = true; $$btns(true);
  try {
    var items = e.items.filter(function (i) { return i.d.trim(); });
    var payload = { client_id: e.client_id, currency: e.currency, issue_date: e.issue_date, due_date: e.due_date, notes: e.notes.trim() || null, terms: e.terms.trim() || null, vat_rate: num(e.vat), discount: Z.discAmount(), theme: e.theme };
    if (e.id) { await Z.q(sb.from('invoices').update(payload).eq('id', e.id)); await Z.q(sb.from('invoice_items').delete().eq('invoice_id', e.id)); }
    else { var row = await Z.q(sb.from('invoices').insert(Object.assign({ user_id: S.user.id }, payload)).select('id').single()); e.id = row.id; }
    await Z.q(sb.from('invoice_items').insert(items.map(function (it, k) { return { invoice_id: e.id, user_id: S.user.id, description: it.d.trim(), quantity: num(it.q), unit_price: num(it.p), position: k + 1 }; })));
    if (send) await Z.q(sb.rpc('send_invoice', { p_id: e.id }));
    var id = e.id; Z.setE(null); await Z.loadAll(true);
    location.replace('#/inv/' + id); toast(send ? 'Invoice ready to share' : 'Draft saved');
    if (send) setTimeout(function () { shareSheet(id); }, 350);
  } catch (er) { e.saving = false; $$btns(false); toast(Z.errMsg(er), true); }
}
function $$btns(dis) { Z.$$('.totalbar .btn').forEach(function (b) { b.disabled = dis; }); }

/* ================= sheets ================= */
function shareSheet(id) {
  var i = Z.invById(id); if (!i) return; var c = Z.clientById(i.client_id) || {}, link = Z.shareUrl(i.share_token);
  var mail = 'mailto:' + encodeURIComponent(c.email || '') + '?subject=' + encodeURIComponent('Invoice ' + i.invoice_number + ' from ' + (S.profile.business_name || S.profile.full_name || '')) + '&body=' + encodeURIComponent(Z.shareText(i));
  Z.openSheet('Share invoice', '<div class="card" style="padding:12px 14px"><div class="eyebrow">Secure link</div><div class="mono" style="font-size:12px;overflow-wrap:anywhere;margin-top:4px;color:var(--muted)">' + esc(link) + '</div></div>' +
    '<a class="btn btn-gold btn-block" target="_blank" rel="noopener" href="' + esc(Z.waLink(c.phone, Z.shareText(i))) + '">' + ic('chat', 'ic-sm') + 'Send on WhatsApp' + (c.phone ? '' : ' (choose contact)') + '</a>' +
    '<div class="share"><button class="btn" data-act="copy" data-v="' + esc(link) + '">' + ic('copy', 'ic-sm') + 'Copy link</button><a class="btn" href="' + esc(mail) + '">' + ic('mail', 'ic-sm') + 'Email</a><button class="btn" data-act="native-share" data-id="' + esc(id) + '">' + ic('share', 'ic-sm') + 'More</button><button class="btn" data-act="print-inv" data-id="' + esc(id) + '">' + ic('pdf', 'ic-sm') + 'PDF</button></div>' +
    '<p class="hint" style="margin:0;text-align:center">You will see here the moment ' + esc(c.name || 'your client') + ' opens it.</p>');
}
function remindSheet(id, kind) {
  var i = Z.invById(id); if (!i) return; kind = kind || Z.reminderKind(i); var c = Z.clientById(i.client_id) || {}, t = Z.reminderText(i, kind);
  var kinds = { soon: 'Before due', today: 'Due today', late: 'Overdue', nudge: 'Friendly nudge' };
  var body = '<div class="chips">' + Object.keys(kinds).map(function (k) { return '<button class="chip" data-act="remind-kind" data-id="' + esc(id) + '" data-kind="' + k + '" aria-pressed="' + (k === kind) + '">' + kinds[k] + '</button>'; }).join('') + '</div><div class="reminder">' + esc(t.replace(/https?:\/\/\S+/, '[secure invoice link]')) + '</div>' +
    '<div class="btn-row"><button class="btn btn-gold btn-grow" data-act="copy" data-v="' + esc(t) + '">' + ic('copy', 'ic-sm') + 'Copy</button><a class="btn btn-grow" target="_blank" rel="noopener" href="' + esc(Z.waLink(c.phone, t)) + '">' + ic('chat', 'ic-sm') + 'WhatsApp</a></div>';
  if (Z.isSheetOpen() && S._remindOpen) Z.setSheetBody(body); else { S._remindOpen = true; Z.openSheet('Remind ' + (c.name || 'client'), body, function () { S._remindOpen = false; }); }
}
function paySheet(id) {
  var i = Z.invById(id); if (!i) return; var b = Z.bal(i);
  Z.openSheet('Record payment', '<form id="payform" data-id="' + esc(id) + '" novalidate><div class="card" style="padding:10px 16px;margin-bottom:12px"><div class="kv" style="border:0"><span>Balance due</span><b>' + money(b, i.currency) + '</b></div></div>' +
    '<div class="field"><label for="p_amt">Amount received</label><input class="in" id="p_amt" type="number" inputmode="decimal" step="any" min="0" value="' + b + '"></div><div class="chips" style="margin-top:8px"><button type="button" class="chip" data-act="pay-full" data-v="' + b + '">Full balance</button><button type="button" class="chip" data-act="pay-full" data-v="' + Z.r2(b / 2) + '">Half</button></div>' +
    '<div class="two" style="margin-top:12px"><div class="field"><label for="p_method">Method</label><select class="in" id="p_method">' + Object.keys(Z.METHODS).map(function (k) { return '<option value="' + k + '">' + Z.METHODS[k] + '</option>'; }).join('') + '</select></div><div class="field"><label for="p_date">Date received</label><input class="in" id="p_date" type="date" value="' + Z.lagosToday() + '" max="' + Z.addDaysISO(Z.lagosToday(), 1) + '"></div></div>' +
    '<div class="field" style="margin-top:12px"><label for="p_note">Note (optional)</label><input class="in" id="p_note" maxlength="300" placeholder="e.g. Transfer from GTBank"></div><div class="err" id="p_err" role="alert"></div>' +
    '<button class="btn btn-gold btn-block" type="submit" id="p_btn" style="margin-top:6px">Save payment</button></form>');
}
function bellSheet() {
  Z.openSheet('Notifications', S.activity.length ? '<div>' + S.activity.slice(0, 40).map(H.actRow).join('') + '</div>' : H.empty('Nothing yet', 'When a client opens, pays or is overdue, you will see it here.', ''), function () { render(); });
  try { if (S.activity[0]) localStorage.setItem('zy_seen_' + S.user.id, S.activity[0].created_at); } catch (e) { /* ignore */ }
}
function installSheet() {
  if (deferredInstall) { deferredInstall.prompt(); deferredInstall = null; return; }
  Z.openSheet('Install Zyron', '<p style="margin:0;color:var(--muted)">Add Zyron to your home screen so it opens like an app, full screen and fast.</p><div class="card" style="display:flex;flex-direction:column;gap:10px"><div><b>Android (Chrome)</b><div class="hint">Tap ⋮ (top right), then <b>Install app</b> or <b>Add to Home screen</b>.</div></div><div><b>iPhone (Safari)</b><div class="hint">Tap the Share icon, then <b>Add to Home Screen</b>.</div></div></div>');
}

/* ================= onboarding ================= */
var OB = { step: 1 };
function obSheet() {
  var p = S.profile, s = OB.step, steps = '<div class="steps">' + [1, 2, 3].map(function (n) { return '<i class="' + (n <= s ? 'on' : '') + '"></i>'; }).join('') + '</div>', body = '';
  if (s === 1) body = '<h3 style="margin:0">Your business</h3><p class="hint" style="margin:0">This appears at the top of every invoice.</p>' +
    '<div class="field"><label for="o_biz">Business name *</label><input class="in" id="o_biz" maxlength="120" value="' + esc(p.business_name || '') + '" placeholder="e.g. Nova Creative Studio" autocomplete="off"></div>' +
    '<div class="two"><div class="field"><label for="o_phone">Phone / WhatsApp</label><input class="in" id="o_phone" type="tel" inputmode="tel" value="' + esc(p.phone || '') + '"></div><div class="field"><label for="o_addr">City</label><input class="in" id="o_addr" maxlength="120" value="' + esc(p.address || '') + '" placeholder="Lagos"></div></div>';
  if (s === 2) body = '<h3 style="margin:0">How you get paid</h3><p class="hint" style="margin:0">Clients see these details on your invoice. You can skip and add later.</p>' +
    '<div class="field"><label for="o_bank">Bank</label><input class="in" id="o_bank" maxlength="80" value="' + esc(p.bank_name || '') + '" placeholder="e.g. GTBank"></div><div class="two"><div class="field"><label for="o_acct">Account number</label><input class="in" id="o_acct" maxlength="34" value="' + esc(p.account_number || '') + '"></div><div class="field"><label for="o_aname">Account name</label><input class="in" id="o_aname" maxlength="120" value="' + esc(p.account_name || '') + '"></div></div>' +
    '<div class="field"><span class="lbl">Invoice style</span><div class="swatches" id="o_themes">' + Z.THEMES.map(function (t) { return '<button class="sw" type="button" data-act="ob-theme" data-v="' + t.id + '" aria-pressed="' + ((OB.theme || p.default_theme) === t.id) + '"><i style="background:linear-gradient(135deg,' + t.b + ' 50%,' + t.a + ' 50%)"></i>' + esc(t.name.split(' ')[0]) + '</button>'; }).join('') + '</div></div>';
  if (s === 3) body = '<h3 style="margin:0">Add your first client</h3><p class="hint" style="margin:0">Optional. You can add clients any time.</p>' +
    '<div class="field"><label for="o_cname">Client name</label><input class="in" id="o_cname" maxlength="200" placeholder="e.g. Acme Studio"></div><div class="two"><div class="field"><label for="o_cphone">WhatsApp</label><input class="in" id="o_cphone" type="tel" inputmode="tel"></div><div class="field"><label for="o_cmail">Email</label><input class="in" id="o_cmail" type="email" inputmode="email" autocapitalize="none"></div></div>';
  var h = steps + body + '<div class="err" id="o_err" role="alert"></div><div class="btn-row">' + (s > 1 ? '<button class="btn" data-act="ob-back">Back</button>' : '') + '<button class="btn btn-gold btn-grow" data-act="ob-next">' + (s === 3 ? 'Create my first invoice' : 'Continue') + '</button></div>' + (s > 1 ? '<button class="link-btn" data-act="ob-skip" style="align-self:center">Skip for now</button>' : '');
  if (Z.isSheetOpen() && S._obOpen) Z.setSheetBody(h); else { S._obOpen = true; Z.openSheet('Welcome to Zyron', h, function () { S._obOpen = false; }); }
}
async function profileUpdate(patch) { await Z.q(sb.from('profiles').update(patch).eq('id', S.user.id)); }
async function obNext() {
  var s = OB.step, err = $('#o_err'); err.textContent = '';
  try {
    if (s === 1) { var biz = val('o_biz'); if (!biz) { err.textContent = 'Enter your business name.'; return; } await profileUpdate({ business_name: biz, phone: val('o_phone') || null, address: val('o_addr') || null, onboarded: true }); await Z.loadAll(true); OB.step = 2; obSheet(); return; }
    if (s === 2) { var ac = val('o_acct'); if (ac && !/^[A-Za-z0-9 -]{4,34}$/.test(ac)) { err.textContent = 'Account number looks wrong. Use letters, numbers and spaces only.'; return; } await profileUpdate({ bank_name: val('o_bank') || null, account_number: ac || null, account_name: val('o_aname') || null, default_theme: OB.theme || S.profile.default_theme }); await Z.loadAll(true); OB.step = 3; obSheet(); return; }
    var cn = val('o_cname'), cid = '';
    if (cn) { var row = await Z.q(sb.from('clients').insert({ user_id: S.user.id, name: cn, phone: val('o_cphone') || null, email: val('o_cmail') || null }).select('id').single()); cid = row.id; }
    await Z.loadAll(true); OB.step = 1; closeThen(function () { go('#/new' + (cid ? '?client=' + cid : '')); });
  } catch (e) { err.textContent = Z.errMsg(e); }
}

/* ================= auth ================= */
async function authSubmit() {
  var up = S.authMode === 'up', email = val('a_email').toLowerCase(), pw = document.getElementById('a_pw').value, err = $('#a_err'), btn = $('#a_btn');
  err.textContent = '';
  if (!/^\S+@\S+\.\S+$/.test(email)) { err.textContent = 'Enter a valid email address.'; return; }
  if (up && pw.length < 8) { err.textContent = 'Use a password of at least 8 characters.'; return; }
  if (!up && !pw) { err.textContent = 'Enter your password.'; return; }
  setBusy(btn, true, up ? 'Creating…' : 'Signing in…');
  try {
    if (up) {
      var r = await sb.auth.signUp({ email: email, password: pw, options: { data: { full_name: val('a_name') } } });
      if (r.error) throw r.error;
      if (!r.data.session) { setBusy(btn, false, 'Create my account'); err.style.color = 'var(--emerald)'; err.textContent = 'Check your email to confirm your account, then sign in.'; return; }
    } else {
      var r2 = await sb.auth.signInWithPassword({ email: email, password: pw });
      if (r2.error) throw r2.error;
    }
  } catch (e) { err.style.color = ''; err.textContent = Z.errMsg(e); setBusy(btn, false, up ? 'Create my account' : 'Sign in'); }
}
function forgotSheet() {
  Z.openSheet('Reset password', '<form id="forgotform" novalidate><p class="hint" style="margin:0 0 12px">Enter your email and we will send you a reset link.</p><div class="field"><label for="f_email">Email</label><input class="in" id="f_email" type="email" inputmode="email" autocapitalize="none" value="' + esc(val('a_email')) + '"></div><div class="err" id="f_err" role="alert"></div><button class="btn btn-gold btn-block" type="submit" style="margin-top:6px">Send reset link</button></form>');
}
function newPwSheet() {
  Z.openSheet('Set a new password', '<form id="newpwform" novalidate><div class="field"><label for="n_pw">New password</label><input class="in" id="n_pw" type="password" autocomplete="new-password" placeholder="At least 8 characters"></div><div class="err" id="n_err" role="alert"></div><button class="btn btn-gold btn-block" type="submit" style="margin-top:6px">Update password</button></form>');
}

/* ================= logo upload ================= */
function resizeImage(file, max) {
  return new Promise(function (res, rej) {
    var url = URL.createObjectURL(file), img = new Image();
    img.onload = function () {
      var tries = [[max, .85], [max, .7], [Math.round(max * .75), .6], [Math.round(max * .5), .5]], i = 0, LIMIT = 120 * 1024;
      function attempt() {
        var t = tries[i], s = Math.min(1, t[0] / Math.max(img.width, img.height)), w = Math.max(1, Math.round(img.width * s)), h = Math.max(1, Math.round(img.height * s)), cv = document.createElement('canvas'); cv.width = w; cv.height = h;
        cv.getContext('2d').drawImage(img, 0, 0, w, h);
        cv.toBlob(function (b) {
          if (!b) { URL.revokeObjectURL(url); rej(new Error('Could not process that image')); return; }
          var isWebp = b.type === 'image/webp';
          if ((b.size > LIMIT && isWebp && i < tries.length - 1) || (!isWebp && b.size > LIMIT && i < tries.length - 1)) { i++; attempt(); return; }
          URL.revokeObjectURL(url); res(b);
        }, 'image/webp', t[1]);
      }
      attempt();
    };
    img.onerror = function () { URL.revokeObjectURL(url); rej(new Error('That file is not a valid image')); }; img.src = url;
  });
}
async function uploadLogo(file) {
  if (!file) return; if (!/^image\/(png|jpe?g|webp)$/.test(file.type)) { toast('Use a PNG, JPG or WebP image', true); return; }
  try {
    toast('Uploading logo…'); var blob = await resizeImage(file, 512), ext = blob.type === 'image/webp' ? 'webp' : 'png', path = S.user.id + '/logo.' + ext;
    if (blob.size > 300 * 1024) throw new Error('That logo is too large. Try a simpler or smaller image.');
    var up = await sb.storage.from('logos').upload(path, blob, { upsert: true, contentType: blob.type || 'image/png', cacheControl: '3600' }); if (up.error) throw up.error;
    var pu = sb.storage.from('logos').getPublicUrl(path).data.publicUrl + '?v=' + Date.now();
    await profileUpdate({ logo_url: pu }); await Z.loadAll(true); render(); toast('Logo saved');
  } catch (e) { toast(Z.errMsg(e), true); }
}
var pendingPrint = null;
function printHTML(html, white, theme) {
  var pa = $('#printArea'), de = document.documentElement; pa.innerHTML = html;
  de.classList.toggle('pw', !!white); de.style.setProperty('--pbg', Z.themeOf(theme).b);
  setTimeout(function () { window.print(); }, 80);
}
function printChoice(html, theme) {
  pendingPrint = { html: html, theme: theme };
  Z.openSheet('Save as PDF',
    '<p class="hint" style="margin:0 0 14px">Pick a look, then choose <b>Save as PDF</b> on the next screen.</p>' +
    '<div class="stack" style="display:flex;flex-direction:column;gap:10px">' +
    '<button class="btn btn-gold btn-block" data-act="pdf-go" data-w="0">Elite dark (recommended)</button>' +
    '<button class="btn btn-block" data-act="pdf-go" data-w="1">Print-friendly white</button></div>');
}

/* ================= push, export, delete account ================= */
function swReady() { return Promise.race([navigator.serviceWorker.ready, new Promise(function (_, rej) { setTimeout(function () { rej(new Error('Notifications are not ready yet. Reload and try again.')); }, 4000); })]); }
function b64ToU8(b) { var p = '='.repeat((4 - b.length % 4) % 4), s = (b + p).replace(/-/g, '+').replace(/_/g, '/'), r = atob(s), o = new Uint8Array(r.length); for (var i = 0; i < r.length; i++) o[i] = r.charCodeAt(i); return o; }
async function pushRefresh() { if (!Z.pushSupported()) { S.pushOn = false; return; } try { var reg = await navigator.serviceWorker.getRegistration(); if (!reg) { S.pushOn = false; return; } var sub = await reg.pushManager.getSubscription(); S.pushOn = !!sub && Notification.permission === 'granted'; } catch (e) { S.pushOn = false; } }
async function pushEnable() {
  if (!Z.pushSupported()) throw new Error('This browser does not support notifications.');
  var perm = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
  if (perm !== 'granted') throw new Error('Notifications were not allowed.');
  var reg = await swReady(), sub = await reg.pushManager.getSubscription();
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToU8(Z.VAPID_PUBLIC) });
  var j = sub.toJSON();
  await Z.q(sb.rpc('save_push_sub', { p_endpoint: j.endpoint, p_p256dh: j.keys.p256dh, p_auth: j.keys.auth }));
  S.pushOn = true;
}
async function pushDisable() {
  if (!Z.pushSupported()) { S.pushOn = false; return; }
  try { var reg = await navigator.serviceWorker.getRegistration(); var sub = reg ? await reg.pushManager.getSubscription() : null; if (sub) { var ep = sub.endpoint; try { await sub.unsubscribe(); } catch (e) { /* ignore */ } try { await sb.rpc('remove_push_sub', { p_endpoint: ep }); } catch (e) { /* ignore */ } } } catch (e) { /* ignore */ }
  S.pushOn = false;
}
function pushAskMaybe() {
  var r = route();
  if (!S.user || !S.loaded || !Z.pushSupported() || Notification.permission !== 'default' || Z.isSheetOpen() || (r.n !== 'home' && r.n !== '')) return;
  var k = 'zy_pushask_' + S.user.id; try { if (localStorage.getItem(k)) return; localStorage.setItem(k, '1'); } catch (e) { return; }
  Z.openSheet('Get notified', '<p style="margin:0;color:var(--muted)">Know the moment a client opens or pays an invoice, or when one goes overdue, even when Zyron is closed.</p><div class="btn-row"><button class="btn btn-grow" data-act="sheet-close">Not now</button><button class="btn btn-gold btn-grow" data-act="push-ask-yes">Turn on</button></div>');
}
async function fetchAll(table, order) {
  var out = [], from = 0, step = 1000;
  for (;;) { var r = await sb.from(table).select('*').order(order).range(from, from + step - 1); if (r.error) throw r.error; out = out.concat(r.data || []); if (!r.data || r.data.length < step) break; from += step; }
  return out;
}
function csvCell(v) { if (v == null) return '""'; if (typeof v === 'string' && /^[=+\-@\t\r]/.test(v)) v = "'" + v; return '"' + String(v).replace(/"/g, '""') + '"'; }
async function exportCsv() {
  var items = await fetchAll('invoice_items', 'created_at'), by = {};
  items.forEach(function (i) { (by[i.invoice_id] = by[i.invoice_id] || []).push(i); });
  var rows = [['Invoice', 'Status', 'Client', 'Issue date', 'Due date', 'Currency', 'Item', 'Quantity', 'Unit price', 'Line total', 'Invoice total', 'Amount paid']];
  S.invoices.slice().sort(function (a, b) { return String(a.issue_date).localeCompare(String(b.issue_date)); }).forEach(function (i) {
    var c = Z.clientById(i.client_id) || {}, its = (by[i.id] || []).sort(function (a, b) { return a.position - b.position; }); if (!its.length) its = [{}];
    its.forEach(function (t) { rows.push([i.invoice_number, i.status, c.name, i.issue_date, i.due_date, i.currency, t.description, t.quantity, t.unit_price, t.line_total, i.total, i.amount_paid]); });
  });
  var csv = '﻿' + rows.map(function (r) { return r.map(csvCell).join(','); }).join('\r\n');
  var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); a.download = 'zyron-invoices-' + Z.lagosToday() + '.csv';
  document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
}
async function removeLogos() { try { var l = await sb.storage.from('logos').list(S.user.id); if (l.data && l.data.length) await sb.storage.from('logos').remove(l.data.map(function (x) { return S.user.id + '/' + x.name; })); } catch (e) { /* ignore */ } }
function delAcctSheet() {
  Z.openSheet('Delete your account', '<p style="margin:0;color:var(--muted)">This permanently deletes your profile, clients, invoices, payments and logo. Invoice links you already sent will stop working. It cannot be undone, and this email cannot start a new free trial.</p><button class="btn btn-block" type="button" data-act="export-data">Download my invoices first (CSV)</button><form id="delform" novalidate><div class="field"><label for="d_txt">Type DELETE to confirm</label><input class="in" id="d_txt" autocomplete="off" autocapitalize="characters"></div><div class="err" id="d_err" role="alert"></div><button class="btn btn-danger btn-block" type="submit" id="d_btn" style="margin-top:6px">Delete my account forever</button></form>');
}

var settingsBase = SCR.settings;
SCR.settings = function () {
  var h = settingsBase(), k = h.lastIndexOf('</form>');
  var add = '<div class="card" style="display:flex;flex-direction:column;gap:12px"><div class="eyebrow">Notifications</div><p class="hint" style="margin:0">Get a message on this phone when a client opens or pays an invoice, or when one goes overdue, even when Zyron is closed.</p>' +
    (Z.pushSupported() ? '<button class="btn ' + (S.pushOn ? '' : 'btn-gold') + ' btn-block" type="button" data-act="push-toggle" id="push_btn">' + (S.pushOn ? 'Turn notifications off' : 'Turn notifications on') + '</button>' + (Z.pushBlocked() ? '<p class="hint" style="margin:0;color:var(--ruby)">Notifications are blocked for Zyron in your browser settings. Allow them there, then try again.</p>' : '') : '<p class="hint" style="margin:0">This browser does not support notifications. Install Zyron to your home screen and try again.</p>') + '</div>' +
    '<div class="card" style="display:flex;flex-direction:column;gap:12px"><div class="eyebrow">Your data</div>' +
    '<button class="btn btn-block" type="button" data-act="export-data">' + ic('pdf', 'ic-sm') + 'Download my invoices (CSV)</button>' +
    '<button class="btn btn-danger btn-block" type="button" data-act="del-acct">' + ic('trash', 'ic-sm') + 'Delete my account</button>' +
    '<p class="hint" style="margin:0">Accounts with no activity are deleted automatically after 120 days (180 days if notifications are off). We warn you first when notifications are on.</p></div>';
  return k < 0 ? h : h.slice(0, k) + add + h.slice(k);
};

/* ================= actions ================= */
var ACT = {
  noop: function () { },
  go: function (t) { go(t.dataset.to); },
  back: function () { if (history.length > 1) history.back(); else go('#/home'); },
  'sheet-close': function () { Z.closeSheet(); },
  'confirm-yes': function () { var f = pendingConfirm; pendingConfirm = null; closeThen(function () { if (f) f(); }); },
  copy: function (t) { Z.copyText(t.dataset.v); },
  retry: function () { loadErr = null; if (S.user) loadApp(); else render(); },
  'new-inv': function (t) { var c = t.dataset.client; closeThen(function () { go('#/new' + (c ? '?client=' + c : '')); }); },
  'home-filter': function (t) { S.filter = t.dataset.v === 'sent' ? 'sent' : t.dataset.v; S.q = ''; go('#/invoices'); },
  invfilter: function (t) { S.filter = t.dataset.v; render(); },
  dcur: function (t) { S.dcur = t.dataset.v; render(); },
  bell: bellSheet,
  'open-inv': function (t) { var id = t.dataset.id; closeThen(function () { go('#/inv/' + id); }); },
  'edit-inv': function (t) { go('#/edit/' + t.dataset.id); },
  'send-inv': function (t) {
    var id = t.dataset.id; var i = Z.invById(id);
    confirmSheet('Send this invoice?', 'Once sent, the amounts are locked and your client can open it from a secure link. To change anything later you would duplicate it.', 'Send invoice', async function () {
      try { await Z.q(sb.rpc('send_invoice', { p_id: id })); await Z.loadAll(true); S.detail[id] = null; render(); setTimeout(function () { shareSheet(id); }, 250); } catch (e) { toast(Z.errMsg(e), true); }
    });
    void i;
  },
  'share-inv': function (t) { shareSheet(t.dataset.id); },
  'native-share': function (t) { var i = Z.invById(t.dataset.id); if (navigator.share) navigator.share({ title: 'Invoice ' + i.invoice_number, text: Z.shareText(i) }).catch(function () { }); else Z.copyText(Z.shareText(i), 'Message copied'); },
  'print-inv': function (t) { var i = Z.invById(t.dataset.id), d = S.detail[t.dataset.id]; if (!d) { toast('Still loading, try again', true); return; } closeThen(function () { printChoice(Z.ownerPaper(i, d.items, { growth: true }), i.theme); }); },
  'pdf-go': function (t) { var pp = pendingPrint, w = t.dataset.w === '1'; closeThen(function () { if (pp) printHTML(pp.html, w, pp.theme); }); },
  'pub-print': function () { if (PUB) printChoice(Z.invoiceHTML(PUB.d, { growth: true }), PUB.d.invoice.theme); },
  'dup-inv': async function (t) { try { var id = await Z.q(sb.rpc('duplicate_invoice', { p_id: t.dataset.id })); await Z.loadAll(true); toast('Duplicated as a new draft'); go('#/edit/' + id); } catch (e) { toast(Z.errMsg(e), true); } },
  'del-inv': function (t) { var id = t.dataset.id; confirmSheet('Delete this draft?', 'This cannot be undone.', 'Delete draft', async function () { try { await Z.q(sb.from('invoices').delete().eq('id', id)); await Z.loadAll(true); toast('Draft deleted'); location.replace('#/invoices'); } catch (e) { toast(Z.errMsg(e), true); } }, true); },
  'cancel-inv': function (t) { var id = t.dataset.id; confirmSheet('Cancel this invoice?', 'Your client’s link will stop working. This is for invoices that were sent by mistake and have no payments.', 'Cancel invoice', async function () { try { await Z.q(sb.rpc('cancel_invoice', { p_id: id })); await refreshDetail(id); toast('Invoice cancelled'); } catch (e) { toast(Z.errMsg(e), true); } }, true); },
  'pay-inv': function (t) { paySheet(t.dataset.id); },
  'pay-full': function (t) { var a = $('#p_amt'); if (a) a.value = t.dataset.v; },
  'remind-inv': function (t) { remindSheet(t.dataset.id); },
  'remind-kind': function (t) { remindSheet(t.dataset.id, t.dataset.kind); },
  'copy-reminder': function (t) { var i = Z.invById(t.dataset.id); Z.copyText(Z.reminderText(i, t.dataset.kind), 'Reminder copied'); },
  'wa-remind': function (t) { var i = Z.invById(t.dataset.id), c = Z.clientById(i.client_id) || {}; window.open(Z.waLink(c.phone, Z.reminderText(i, t.dataset.kind)), '_blank', 'noopener'); },
  /* editor */
  'ed-mode': function (t) { Z.getE().mode = t.dataset.v; render(); window.scrollTo(0, 0); },
  'ed-add': function () { var e = Z.getE(); if (e.items.length >= 40) { toast('That is the maximum of 40 items', true); return; } e.items.push({ d: '', q: '1', p: '' }); $('#ed_items').innerHTML = Z.itemsHTML(); var inp = Z.$$('#ed_items .item'); inp[inp.length - 1].querySelector('input').focus(); liveEditor(); },
  'ed-rm': function (t) { var e = Z.getE(); if (e.items.length <= 1) { e.items[0] = { d: '', q: '1', p: '' }; } else e.items.splice(+t.dataset.i, 1); $('#ed_items').innerHTML = Z.itemsHTML(); liveEditor(); },
  'ed-vat': function (t) { var e = Z.getE(), v = t.dataset.v; if (v === 'custom') { e.vatCustom = true; if (num(e.vat) === 0 || num(e.vat) === 7.5) e.vat = ''; } else { e.vatCustom = false; e.vat = v; } render(); },
  'ed-discmode': function (t) { Z.getE().discMode = t.dataset.v; render(); },
  'ed-terms': function (t) { var e = Z.getE(), v = t.dataset.v; e.termsKey = v; if (v !== 'custom') e.due_date = Z.addDaysISO(e.issue_date, +v); render(); },
  'ed-theme': function (t) { Z.getE().theme = t.dataset.v; render(); },
  'ed-note': function (t) { var e = Z.getE(); e.notes = Z.NOTE_PRESETS[+t.dataset.k]; var n = $('#ed_notes'); if (n) n.value = e.notes; },
  'ed-newclient': function () { S._afterClient = function (id) { var e = Z.getE(); if (e) e.client_id = id; }; Z.openSheet('New client', Z.clientFormHTML()); },
  'ed-save': function () { saveInvoice(false); },
  'ed-send': function () { saveInvoice(true); },
  'ed-tpl': function () { var e = Z.getE(); var m = validateEditor(false); if (m && m !== 'Choose a client first.') { toast(m, true); return; } tplNameSheet(null); },
  /* clients */
  'client-new': function () { S._afterClient = null; Z.openSheet('New client', Z.clientFormHTML()); },
  'client-open': function (t) { Z.openSheet('Client', Z.clientSheetHTML(t.dataset.id)); },
  'client-edit': function (t) { S._afterClient = null; Z.openSheet('Edit client', Z.clientFormHTML(Z.clientById(t.dataset.id))); },
  'client-del': function (t) { var id = t.dataset.id; confirmSheet('Delete this client?', 'Clients that have invoices cannot be deleted.', 'Delete client', async function () { try { await Z.q(sb.from('clients').delete().eq('id', id)); await refresh(); toast('Client deleted'); } catch (e) { toast(Z.errMsg(e), true); } }, true); },
  /* templates */
  'tpl-from-inv': function (t) { tplNameSheet(t.dataset.id); },
  'tpl-open': function (t) { var tp = S.templates.filter(function (x) { return x.id === t.dataset.id; })[0]; if (tp) Z.openSheet('Template', Z.tplSheetHTML(tp)); },
  'tpl-use': function (t) { var id = t.dataset.id; closeThen(async function () { try { var nid = await Z.q(sb.rpc('create_invoice_from_template', { p_id: id })); await Z.loadAll(true); toast('Draft created'); go('#/edit/' + nid); } catch (e) { toast(Z.errMsg(e), true); } }); },
  'tpl-del': function (t) { var id = t.dataset.id; confirmSheet('Delete template?', 'Invoices you already made from it are not affected.', 'Delete', async function () { try { await Z.q(sb.from('invoice_templates').delete().eq('id', id)); await refresh(); toast('Template deleted'); } catch (e) { toast(Z.errMsg(e), true); } }, true); },
  /* settings + misc */
  'logo-pick': function () { $('#logofile').click(); },
  'pw-change': newPwSheet,
  'toggle-pw': function (t) { var i = $('#a_pw'); i.type = i.type === 'password' ? 'text' : 'password'; t.textContent = i.type === 'password' ? 'Show' : 'Hide'; },
  'auth-mode': function (t) { S.authMode = t.dataset.v; render(); },
  forgot: forgotSheet,
  google: async function () {
    var err = $('#a_err'), btn = $('#a_btn'); if (err) err.textContent = ''; S.authNotice = '';
    try {
      setBusy(btn, true);
      var gr = await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + location.pathname, queryParams: { prompt: 'select_account' } } });
      if (gr.error) throw gr.error;
    } catch (e) { if (err) err.textContent = Z.errMsg(e); setBusy(btn, false); }
  },
  'wl-join': async function () {
    var ph = $('#wl_phone'), ck = $('#wl_ck'), er = $('#wl_err'), b = $('#wl_btn'); if (er) er.textContent = '';
    if (!ck || !ck.checked) { if (er) er.textContent = 'Please tick the box so we can message you.'; return; }
    try {
      setBusy(b, true, 'Joining…'); await Z.q(sb.rpc('join_waitlist', { p_phone: ph ? ph.value : '', p_consent: true }));
      var card = b.closest('.card'); if (card) card.innerHTML = '<div class="eyebrow">You are on the list</div><p style="margin:6px 0 0">Thank you. We will message you on WhatsApp when a spot opens.</p>';
    } catch (e) { if (er) er.textContent = Z.errMsg(e); setBusy(b, false); }
  },
  'terms-accept': async function () {
    var ck = document.getElementById('tg_ck'), er = $('#tg_err'), b = $('#tg_btn');
    if (!ck || !ck.checked) { if (er) er.textContent = 'Please tick the box to continue.'; return; }
    try {
      setBusy(b, true, 'Saving…'); await Z.q(sb.rpc('accept_terms', { p_version: Z.TERMS_VERSION }));
      S.profile.terms_version = Z.TERMS_VERSION; closeThen(function () { postLoad(); });
    } catch (e) { if (er) er.textContent = Z.errMsg(e); setBusy(b, false, 'Accept and continue'); }
  },
  'push-toggle': async function (t) {
    t.disabled = true;
    try { if (S.pushOn) { await pushDisable(); toast('Notifications off'); } else { await pushEnable(); toast('Notifications on'); } } catch (e) { toast(Z.errMsg(e), true); }
    t.disabled = false; t.textContent = S.pushOn ? 'Turn notifications off' : 'Turn notifications on'; t.classList.toggle('btn-gold', !S.pushOn);
  },
  'push-ask-yes': async function (t) {
    t.disabled = true;
    try { await pushEnable(); closeThen(function () { toast('Notifications on'); }); } catch (e) { closeThen(function () { toast(Z.errMsg(e), true); }); }
  },
  'export-data': async function (t) { t.disabled = true; try { await exportCsv(); toast('Downloaded'); } catch (e) { toast(Z.errMsg(e), true); } t.disabled = false; },
  'del-acct': delAcctSheet,
  'tour-open': function () { Z.tourOpen(); },
  'tour-next': function () { Z.tourNext(); },
  'tour-skip': function () { Z.closeSheet(); },
  'cl-hide': function () { Z.checklistHide(); render(); },
  'pub-claim': function (t) {
    var tok = t.dataset.tok;
    confirmSheet('Have you paid?', 'Only tap yes if you have already sent the money. We will let the business know so they can check their account.', 'Yes, I have paid', async function () {
      try { await Z.q(sb.rpc('claim_paid', { p_token: tok })); if (PUB && PUB.d) { PUB.d.invoice.claimed_at = new Date().toISOString(); $('#app').innerHTML = SCR.publicInvoice(PUB.d, PUB.token); } toast('Thank you. We have let them know.'); } catch (e) { toast(Z.errMsg(e), true); }
    });
  },
  signout: async function () { closeThen(async function () { try { await pushDisable(); } catch (e) { /* ignore */ } await sb.auth.signOut(); }); },
  'ob-open': function () { OB.step = 1; obSheet(); },
  'ob-next': obNext,
  'ob-back': function () { OB.step = Math.max(1, OB.step - 1); obSheet(); },
  'ob-skip': function () { if (OB.step < 3) { OB.step++; obSheet(); } else closeThen(function () { go('#/new'); }); },
  'ob-theme': function (t) { OB.theme = t.dataset.v; Z.$$('#o_themes .sw').forEach(function (b) { b.setAttribute('aria-pressed', String(b === t)); }); },
  invite: function () { var u = location.origin + location.pathname; window.open('https://wa.me/?text=' + encodeURIComponent('I use Zyron to send professional invoices and see when clients open them. Try it free for 2 months: ' + u), '_blank', 'noopener'); },
  install: installSheet,
  'plan-soon': function () { Z.openSheet('Plans open soon', '<p style="margin:0;color:var(--muted)">Subscriptions (₦10,000 per month or ₦100,000 per year) are being switched on. Your free trial continues and nothing you have created is affected. We will let you know here before your trial ends.</p><button class="btn btn-gold btn-block" data-act="sheet-close">Got it</button>'); }
};
async function refreshDetail(id) { S.detail[id] = null; await Z.loadAll(true); render(); }
function tplNameSheet(invId) {
  var def = '';
  if (invId) { var i = Z.invById(invId), c = Z.clientById(i.client_id); def = (c ? c.name + ' ' : '') + 'invoice'; }
  Z.openSheet('Save as template', '<form id="tplnew" data-inv="' + esc(invId || '') + '" novalidate><div class="field"><label for="tn_name">Template name</label><input class="in" id="tn_name" maxlength="80" value="' + esc(def) + '" placeholder="e.g. Monthly retainer"></div><div class="err" id="tn_err" role="alert"></div><button class="btn btn-gold btn-block" type="submit" style="margin-top:6px">Save template</button></form>');
}

document.addEventListener('click', function (e) {
  var t = e.target.closest('[data-act]'); if (!t) return; var a = ACT[t.dataset.act]; if (!a) return;
  if (t.tagName === 'A' && t.dataset.act === 'x') return; e.preventDefault(); a(t, e);
});
document.addEventListener('submit', async function (e) {
  var f = e.target; e.preventDefault();
  try {
    if (f.id === 'authform') return authSubmit();
    if (f.id === 'clform') {
      var name = val('c_name'), err = $('#c_err'); err.textContent = ''; if (!name) { err.textContent = 'Enter the client’s name.'; return; }
      var em = val('c_email'); if (em && !/^\S+@\S+\.\S+$/.test(em)) { err.textContent = 'That email does not look right.'; return; }
      var rec = { name: name, phone: val('c_phone') || null, email: em || null, address: val('c_addr') || null, notes: val('c_notes') || null }, id = f.dataset.id, nid = id;
      if (id) await Z.q(sb.from('clients').update(rec).eq('id', id)); else { var row = await Z.q(sb.from('clients').insert(Object.assign({ user_id: S.user.id }, rec)).select('id').single()); nid = row.id; }
      await Z.loadAll(true); var cb = S._afterClient; S._afterClient = null; closeThen(function () { if (cb) cb(nid); render(); toast('Client saved'); }); return;
    }
    if (f.id === 'payform') {
      var amt = num(val('p_amt')), pe = $('#p_err'); pe.textContent = ''; if (amt <= 0) { pe.textContent = 'Enter an amount above zero.'; return; }
      var pb = $('#p_btn'); setBusy(pb, true, 'Saving…'); var iid = f.dataset.id;
      try { await Z.q(sb.rpc('record_payment', { p_id: iid, p_amount: amt, p_method: val('p_method'), p_paid_on: val('p_date') || Z.lagosToday(), p_note: val('p_note') || null })); }
      catch (er) { pe.textContent = Z.errMsg(er); setBusy(pb, false, 'Save payment'); return; }
      await Z.loadAll(true); S.detail[iid] = null; closeThen(function () { render(); toast('Payment recorded'); }); return;
    }
    if (f.id === 'tplnew') {
      var nm = val('tn_name'), te = $('#tn_err'); if (!nm) { te.textContent = 'Give the template a name.'; return; }
      var rowT, srcId = f.dataset.inv;
      if (srcId) {
        var inv = Z.invById(srcId), its = await Z.q(sb.from('invoice_items').select('*').eq('invoice_id', srcId).order('position'));
        rowT = { client_id: inv.client_id, currency: inv.currency, vat_rate: inv.vat_rate, discount: inv.discount, due_days: Math.max(0, Z.diffDays(inv.due_date, inv.issue_date)), notes: inv.notes, terms: inv.terms, items: its.map(function (i) { return { description: i.description, quantity: Number(i.quantity), unit_price: Number(i.unit_price) }; }) };
      } else {
        var ed = Z.getE(), good = ed.items.filter(function (i) { return i.d.trim(); }); if (!good.length) { te.textContent = 'Add at least one item first.'; return; }
        rowT = { client_id: ed.client_id || null, currency: ed.currency, vat_rate: num(ed.vat), discount: Z.discAmount(), due_days: Math.max(0, Z.diffDays(ed.due_date, ed.issue_date)), notes: ed.notes.trim() || null, terms: ed.terms.trim() || null, items: good.map(function (i) { return { description: i.d.trim(), quantity: num(i.q), unit_price: num(i.p) }; }) };
      }
      await Z.q(sb.from('invoice_templates').insert(Object.assign({ user_id: S.user.id, name: nm, recurrence: 'none', active: false }, rowT)));
      await Z.loadAll(true); closeThen(function () { toast('Template saved'); }); return;
    }
    if (f.id === 'tplform') {
      var tn = val('t_name'), terr = $('#t_err'); if (!tn) { terr.textContent = 'Name is required.'; return; }
      var rec2 = val('t_rec'), nx = val('t_next') || null; if (rec2 !== 'none' && !nx) { terr.textContent = 'Pick the date for the next draft.'; return; }
      if (rec2 !== 'none' && !val('t_client')) { terr.textContent = 'Recurring templates need a client.'; return; }
      await Z.q(sb.from('invoice_templates').update({ name: tn, client_id: val('t_client') || null, recurrence: rec2, next_run: rec2 === 'none' ? null : nx, active: rec2 !== 'none' && document.getElementById('t_active').checked }).eq('id', f.dataset.id));
      await Z.loadAll(true); closeThen(function () { render(); toast('Template updated'); }); return;
    }
    if (f.id === 'setform') {
      var se = $('#s_err'); se.textContent = ''; var ac = val('s_acct'), pre = val('s_prefix').toUpperCase(), due = parseInt(val('s_due'), 10);
      if (ac && !/^[A-Za-z0-9 -]{4,34}$/.test(ac)) { se.textContent = 'Account number looks wrong. Use letters, numbers and spaces only.'; return; }
      if (!/^[A-Z0-9]{2,6}$/.test(pre)) { se.textContent = 'Prefix must be 2 to 6 letters or numbers.'; return; }
      if (!(due >= 0 && due <= 365)) { se.textContent = 'Due days must be between 0 and 365.'; return; }
      var em2 = val('s_email'); if (em2 && !/^\S+@\S+\.\S+$/.test(em2)) { se.textContent = 'That business email does not look right.'; return; }
      var pl = val('s_paylink'); if (pl && !/^https:\/\/\S+$/i.test(pl)) { se.textContent = 'The payment link must start with https://'; return; }
      var sbtn = $('#s_btn'); setBusy(sbtn, true, 'Saving…');
      try {
        await profileUpdate({ business_name: val('s_biz') || null, full_name: val('s_name') || null, phone: val('s_phone') || null, email: em2 || null, address: val('s_addr') || null, website: val('s_web') || null, bank_name: val('s_bank') || null, account_number: ac || null, account_name: val('s_aname') || null, intl_bank: val('s_intl') || null, invoice_prefix: pre, default_currency: val('s_cur'), default_due_days: due, default_theme: val('s_theme'), default_terms: val('s_terms') || null, pay_link: pl || null, onboarded: true });
        S.dcur = null; await Z.loadAll(true); toast('Saved'); setBusy(sbtn, false, 'Save changes'); history.length > 1 ? history.back() : go('#/more');
      } catch (er) { se.textContent = Z.errMsg(er); setBusy(sbtn, false, 'Save changes'); }
      return;
    }
    if (f.id === 'delform') {
      var de = $('#d_err'), db = $('#d_btn'); de.textContent = '';
      if (val('d_txt').toUpperCase() !== 'DELETE') { de.textContent = 'Type DELETE to confirm.'; return; }
      setBusy(db, true, 'Deleting…');
      try { await removeLogos(); await pushDisable(); await Z.q(sb.rpc('delete_my_account')); }
      catch (er2) { de.textContent = Z.errMsg(er2); setBusy(db, false, 'Delete my account forever'); return; }
      try { await sb.auth.signOut({ scope: 'local' }); } catch (e) { /* ignore */ }
      try { localStorage.clear(); } catch (e) { /* ignore */ }
      setTimeout(function () { toast('Your account was deleted'); }, 400); return;
    }
    if (f.id === 'forgotform') {
      var fe = $('#f_err'), mail = val('f_email').toLowerCase(); if (!/^\S+@\S+\.\S+$/.test(mail)) { fe.textContent = 'Enter a valid email.'; return; }
      var rr = await sb.auth.resetPasswordForEmail(mail, { redirectTo: location.origin + location.pathname }); if (rr.error) throw rr.error;
      Z.setSheetBody('<p style="margin:0;color:var(--muted)">If an account exists for <b style="color:var(--text)">' + esc(mail) + '</b>, a reset link is on its way. Check your inbox and spam.</p><button class="btn btn-gold btn-block" data-act="sheet-close">Done</button>'); return;
    }
    if (f.id === 'newpwform') {
      var npw = document.getElementById('n_pw').value, ne = $('#n_err'); if (npw.length < 8) { ne.textContent = 'Use at least 8 characters.'; return; }
      var ur = await sb.auth.updateUser({ password: npw }); if (ur.error) throw ur.error; closeThen(function () { toast('Password updated'); go('#/home'); }); return;
    }
  } catch (er) { var any = $('.err', f); if (any) any.textContent = Z.errMsg(er); else toast(Z.errMsg(er), true); }
});
document.addEventListener('input', function (e) {
  var t = e.target;
  if (t.id === 'invsearch') { S.q = t.value; render(); var s = $('#invsearch'); if (s) { s.focus(); s.setSelectionRange(s.value.length, s.value.length); } return; }
  if (t.id === 'clsearch') { S.cq = t.value; render(); var c = $('#clsearch'); if (c) { c.focus(); c.setSelectionRange(c.value.length, c.value.length); } return; }
  var f = t.dataset && t.dataset.f; if (!f || !Z.getE()) return; var ed = Z.getE();
  if (f === 'd' || f === 'q' || f === 'p') { ed.items[+t.dataset.i][f] = t.value; liveEditor(); return; }
  if (f === 'client_id' || f === 'currency') { ed[f] = t.value; render(); return; }
  if (f === 'issue_date') { if (t.value) { ed.issue_date = t.value; if (ed.termsKey !== 'custom') ed.due_date = Z.addDaysISO(t.value, +ed.termsKey); render(); } return; }
  if (f === 'due_date') { if (t.value) { ed.due_date = t.value; liveEditor(); } return; }
  ed[f] = t.value; liveEditor();
});
document.addEventListener('change', function (e) { if (e.target.id === 'logofile') uploadLogo(e.target.files[0]); });
window.addEventListener('hashchange', render);
document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible' && S.user && S.loaded) { sb.rpc('touch_active').then(function () { }, function () { }); } });
window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); deferredInstall = e; });
window.addEventListener('afterprint', function () { var pa = $('#printArea'); if (pa) pa.innerHTML = ''; document.documentElement.classList.remove('pw'); });

/* ================= splash + boot ================= */
function splash() {
  try { if (sessionStorage.getItem('zy_sp')) return; sessionStorage.setItem('zy_sp', '1'); } catch (e) { /* ignore */ }
  var Zp = 'M9 8H58V18L25 45H58V56H6V46L39 19H9Z', el = document.createElement('div'); el.className = 'splash'; el.setAttribute('role', 'presentation');
  el.innerHTML = '<div class="bloom"></div><svg class="mk" viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="sl" x1="0.2" y1="0" x2="0.6" y2="1"><stop offset="0" stop-color="#f9e3a4"/><stop offset="1" stop-color="#c99a3b"/></linearGradient><linearGradient id="sd" x1="0.2" y1="0" x2="0.6" y2="1"><stop offset="0" stop-color="#c39434"/><stop offset="1" stop-color="#6a4811"/></linearGradient><clipPath id="su"><path d="M-2 36.3 66 20.3V-10H-2Z"/></clipPath><clipPath id="sn"><path d="M-2 39.7 66 23.7V80H-2Z"/></clipPath><clipPath id="sz"><path d="' + Zp + '"/></clipPath></defs>' +
    '<g clip-path="url(#su)"><path class="pc" style="--dx:22px;--dy:-10px" fill="url(#sl)" d="' + Zp + '"/></g><g clip-path="url(#sn)"><path class="pc r" style="--dx:-22px;--dy:10px" fill="url(#sd)" d="' + Zp + '"/></g><g clip-path="url(#sz)"><line class="gleam" pathLength="1" x1="-2" y1="38" x2="66" y2="22"/></g></svg><div class="word">ZYRON STUDIO</div><div class="tag">BUILD YOUR STORE. GET PAID.</div><div class="skip">TAP TO SKIP</div>';
  document.body.appendChild(el); var done = false;
  function out() { if (done) return; done = true; el.classList.add('out'); setTimeout(function () { el.remove(); }, 600); }
  el.addEventListener('click', out); setTimeout(out, 4000);
}
async function loadApp() {
  loadErr = null; S.loaded = false; render();
  try { await Z.loadAll(false); } catch (e) { loadErr = Z.errMsg(e); render(); return; }
  render();
  var warned = S.profile && S.profile.delete_warned_at;
  sb.rpc('touch_active').then(function () { }, function () { });
  pushRefresh();
  if (warned) setTimeout(function () { toast('Welcome back! Your account is safe and will not be deleted.'); }, 900);
  if (S.profile.terms_version !== Z.TERMS_VERSION) termsGate(); else postLoad();
}
function postLoad() {
  if (!obShown && !S.profile.business_name && !S.profile.onboarded) { obShown = true; OB.step = 1; setTimeout(obSheet, 500); }
  else Z.tourMaybe();
  setTimeout(pushAskMaybe, 4500);
}
function termsGate() {
  var base = location.origin + location.pathname;
  Z.openSheet('Terms and Privacy',
    '<p class="hint" style="margin:0 0 12px">Please read and accept our Terms of Use and Privacy Policy to continue.</p>' +
    '<p style="margin:0 0 14px"><a class="inl" target="_blank" rel="noopener" href="' + esc(base) + '#/terms">Terms of Use</a> · <a class="inl" target="_blank" rel="noopener" href="' + esc(base) + '#/privacy">Privacy Policy</a></p>' +
    '<label style="display:flex;gap:10px;align-items:flex-start;margin-bottom:14px;font-size:14px"><input type="checkbox" id="tg_ck" style="width:22px;height:22px;flex:none"><span>I have read and agree to the Terms of Use and Privacy Policy (version ' + esc(Z.TERMS_VERSION) + ').</span></label>' +
    '<div class="err" id="tg_err" role="alert"></div><button class="btn btn-gold btn-block" id="tg_btn" data-act="terms-accept">Accept and continue</button>' +
    '<div style="text-align:center;margin-top:8px"><button class="link-btn" data-act="signout">Sign out</button></div>',
    function () { if (S.user && S.profile && S.profile.terms_version !== Z.TERMS_VERSION) setTimeout(termsGate, 250); });
}
async function start() {
  var em = /error_description=([^&#]+)/.exec(location.hash + '&' + location.search);
  if (em) { try { S.authNotice = Z.errMsg({ message: decodeURIComponent(em[1].replace(/\+/g, ' ')) }); } catch (e) { S.authNotice = 'Sign-in did not complete. Please try again.'; } }
  var r = route();
  if (r.n !== 'i') splash();
  if (!Z.initSB()) { $('#app').innerHTML = '<div class="auth"><div class="logo">' + zmk() + '</div><h1>Can’t reach Zyron</h1><p class="sub">Check your internet connection and reload the page.</p><button class="btn btn-gold btn-block" onclick="location.reload()">Reload</button></div>'; return; }
  sb = Z.getSB();
  sb.auth.onAuthStateChange(function (ev, session) {
    setTimeout(function () {
      if (ev === 'PASSWORD_RECOVERY') { if (session) { S.user = session.user; } newPwSheet(); return; }
      if (session && session.user) {
        if (!S.user || S.user.id !== session.user.id) { S.user = session.user; if (route().n === 'i') return; loadApp().then(function () { if (route().n === 'auth' || route().n === '') go('#/home'); }); }
      } else if (ev === 'SIGNED_OUT') {
        S.user = null; S.profile = null; S.loaded = false; S.invoices = []; S.clients = []; S.payments = []; S.activity = []; S.templates = []; S.detail = {}; if (Z.storeReset) Z.storeReset(); Z.setE(null); obShown = false; lastKey = null; PUB = null;
        if (Z.isSheetOpen()) Z.hideSheet(); if (route().n !== 'i') { location.replace('#/auth'); render(); }
      }
    }, 0);
  });
  if (r.n === 'i') { render(); return; }
  var sess = await sb.auth.getSession();
  if (sess.data && sess.data.session) { S.user = sess.data.session.user; if (r.n === '' || r.n === 'auth') location.replace('#/home'); await loadApp(); }
  else {
    if (r.n !== 'auth' && r.n !== 'terms' && r.n !== 'privacy') location.replace('#/auth'); render();
    sb.rpc('get_signup_status').then(function (x) {
      if (x && x.data && typeof x.data.cap === 'number') { S.signup = x.data; if (!S.user && route().n === 'auth') { var keep = $('#wl_phone') ? $('#wl_phone').value : ''; render(); if (keep && $('#wl_phone')) $('#wl_phone').value = keep; } }
    }).catch(function () { });
  }
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(function () { });
}
window.ZA = { start: start, render: render, ACT: ACT, resize: resizeImage };
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
