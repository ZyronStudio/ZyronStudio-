(function () {
'use strict';
var Z = window.Z, S = Z.S, esc = Z.esc, ic = Z.ic, zmk = Z.zmk, money = Z.money;
var SCR = {};

function bar(title, opts) {
  opts = opts || {};
  return '<div class="topbar">' + (opts.back === false ? '' : '<button class="icon-btn" data-act="back" aria-label="Back">' + ic('back') + '</button>') +
    '<h1>' + esc(title) + '</h1>' + (opts.right || '') + '</div>';
}
function pill(st) { return '<span class="pill ' + esc(st) + '">' + esc(Z.STATUS_LABEL[st] || st) + '</span>'; }
function skeleton(n) { var s = ''; for (var i = 0; i < (n || 3); i++) s += '<div class="skel"></div>'; return s; }
function empty(title, sub, btn) {
  return '<div class="card empty">' + zmk() + '<b>' + esc(title) + '</b><span>' + esc(sub) + '</span>' + (btn || '') + '</div>';
}
function navHTML(active) {
  function b(id, icon, label, to) { return '<button type="button" data-act="go" data-to="' + to + '"' + (active === id ? ' aria-current="page"' : '') + '>' + ic(icon) + label + '</button>'; }
  return '<nav class="nav" aria-label="Main">' + b('home', 'home', 'Home', '#/home') + b('products', 'box', 'Products', '#/products') + b('orders', 'file', 'Orders', '#/orders') + b('more', 'more', 'More', '#/more') + '</nav>';
}
function sparkSVG(vals) {
  var W = 320, H = 84, pad = 8, max = Math.max.apply(null, vals.concat([1])), step = W / (vals.length - 1);
  var pts = vals.map(function (v, i) { return [i * step, H - pad - (v / max) * (H - pad * 2)]; });
  var d = 'M' + pts[0][0] + ',' + pts[0][1];
  for (var i = 1; i < pts.length; i++) { var cx = (pts[i - 1][0] + pts[i][0]) / 2; d += ' C' + cx + ',' + pts[i - 1][1] + ' ' + cx + ',' + pts[i][1] + ' ' + pts[i][0] + ',' + pts[i][1]; }
  return '<svg class="spark" viewBox="0 0 320 84" preserveAspectRatio="none" role="img" aria-label="Money received over the last 8 weeks"><defs><linearGradient id="sg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d9b45b" stop-opacity=".38"/><stop offset="1" stop-color="#d9b45b" stop-opacity="0"/></linearGradient></defs>' +
    '<path d="' + d + ' L' + W + ',' + H + ' L0,' + H + ' Z" fill="url(#sg)"/><path d="' + d + '" fill="none" stroke="#d9b45b" stroke-width="2.2" stroke-linecap="round" vector-effect="non-scaling-stroke"/></svg>';
}
function clientName(i) { var c = Z.clientById(i.client_id); return c ? c.name : 'Client'; }
function dueText(i) {
  if (i.status === 'paid') return 'Paid ' + (i.paid_at ? Z.fmtDate(i.paid_at.slice(0, 10)) : '');
  if (i.status === 'draft') return 'Draft';
  if (i.status === 'void') return 'Cancelled';
  var d = Z.diffDays(i.due_date, Z.lagosToday());
  return d < 0 ? Math.abs(d) + ' d late' : d === 0 ? 'Due today' : 'Due ' + Z.fmtDate(i.due_date);
}
function invRow(i) {
  var left = (i.status === 'partially_paid' || (i.status === 'overdue' && Number(i.amount_paid) > 0)) ? money(Z.bal(i), i.currency) + ' left' : money(i.total, i.currency);
  return '<button class="li" data-act="open-inv" data-id="' + esc(i.id) + '"><b>' + esc(clientName(i)) + '</b><span class="amt">' + left + '</span><span class="ref">' + esc(i.invoice_number) + ' · ' + esc(dueText(i)) + '</span><span class="st">' + pill(i.status) + '</span></button>';
}
function actRow(a) {
  var k = a.kind, icn = { viewed: 'eye', paid: 'check', payment: 'check', overdue: 'clock', claimed: 'check', sent: 'chat', created: 'file', cancelled: 'x', duplicated: 'copy', recurring: 'repeat' }[k] || 'file';
  return '<div class="act ' + esc(k) + '"><i>' + ic(icn, 'ic-sm') + '</i><div><p>' + esc(a.message) + '</p><small>' + Z.timeAgo(a.created_at) + '</small></div></div>';
}

/* ================= AUTH ================= */
function spotsHTML() {
  var g = S.signup, h = '';
  if (g && g.cap > 0) {
    var left = Math.max(0, g.cap - g.taken), pct = Math.min(100, Math.round(g.taken / g.cap * 100));
    h += '<div class="card" style="display:flex;flex-direction:column;gap:8px;padding:14px"><div class="eyebrow">Founding access</div>' +
      '<div style="font-size:15px"><b style="color:var(--gold)">' + (g.open ? left.toLocaleString('en-NG') + '</b> of ' + g.cap.toLocaleString('en-NG') + ' spots left' : 'All ' + g.cap.toLocaleString('en-NG') + '</b> spots are taken') + '</div>' +
      '<div style="height:6px;border-radius:6px;background:rgba(255,255,255,.1);overflow:hidden"><i style="display:block;height:100%;width:' + Math.max(2, pct) + '%;background:linear-gradient(90deg,#b8892f,#f1d38a)"></i></div>' +
      (g.open ? '<small class="hint" style="margin:0">Access is limited so every member gets a fast, reliable Zyron.</small>' : '<small class="hint" style="margin:0">Already a member? Continue with Google above. New here? Join the waitlist below.</small>') + '</div>';
    if (!g.open) {
      h += '<div class="card" style="display:flex;flex-direction:column;gap:10px;padding:14px"><div class="eyebrow">Join the waitlist</div>' +
        '<input class="in" id="wl_phone" type="tel" inputmode="tel" placeholder="WhatsApp number, e.g. 0803 000 0000" autocomplete="tel">' +
        '<label style="display:flex;gap:10px;align-items:flex-start;font-size:13px"><input type="checkbox" id="wl_ck" style="width:20px;height:20px;flex:none"><span>I agree that Zyron can message me on WhatsApp about my spot. I can opt out any time.</span></label>' +
        '<div class="err" id="wl_err" role="alert"></div><button class="btn btn-gold btn-block" id="wl_btn" data-act="wl-join">Join the waitlist</button></div>';
    }
  }
  var ch = Z.SUPPORT && Z.SUPPORT.channel;
  if (ch) h += '<a class="btn btn-block" target="_blank" rel="noopener" href="' + esc(ch) + '">' + ic('chat', 'ic-sm') + 'Join our WhatsApp channel</a>';
  return h;
}
SCR.auth = function () {
  var G = '<svg viewBox="0 0 48 48" width="20" height="20" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>';
  return '<div class="auth"><div class="logo">' + zmk() + '<div class="word">ZYRON STUDIO</div></div>' +
    '<h1>Build your store.<br>Get paid.</h1>' +
    '<p class="sub">Your own online store in minutes. Share the link, get orders on WhatsApp, and send invoices when you need them.</p>' +
    '<button class="btn btn-block gbtn" type="button" id="a_btn" data-act="google" style="background:#fff;color:#1f1f1f;border-color:#fff;gap:10px;font-weight:600">' + G + 'Continue with Google</button>' +
    '<div class="err" id="a_err" role="alert">' + esc(S.authNotice || '') + '</div>' +
    spotsHTML() +
    '<p class="hint" style="text-align:center;margin:0">Free for your first 2 months. No card needed.<br>By continuing you agree to the <a href="#/terms" class="inl">Terms</a> and <a href="#/privacy" class="inl">Privacy Policy</a>.</p>' +
    '<div class="perks">' +
      '<div class="perk"><i>' + ic('box', 'ic-sm') + '</i><span><b style="color:var(--text)">A store that builds itself.</b> Pick your category, add products, publish.</span></div>' +
      '<div class="perk"><i>' + ic('chat', 'ic-sm') + '</i><span><b style="color:var(--text)">Orders on WhatsApp.</b> Customers order from your link. No account needed.</span></div>' +
      '<div class="perk"><i>' + ic('file', 'ic-sm') + '</i><span><b style="color:var(--text)">Invoices when you need them.</b> Send, track when opened, get paid.</span></div></div>' +
    '</div>';
};

/* ================= HOME ================= */
SCR.home = function () {
  var p = S.profile, cur = S.dcur, m = Z.metrics(cur), curs = Z.currenciesUsed(), ins = Z.insights();
  var first = String(p.full_name || '').split(' ')[0];
  var dot = hasUnseen() ? '<i class="dot"></i>' : '';
  var h = '<div class="screen"><div class="appbar">' + zmk() + '<div class="who"><small>' + esc(first ? 'Hi ' + first : 'Workspace') + '</small><b>' + esc(p.business_name || 'Set up your business') + '</b></div>' +
    '<button class="icon-btn" data-act="bell" aria-label="Notifications">' + ic('bell') + dot + '</button></div>';
  if (!p.business_name) {
    h += '<div class="card banner"><div style="flex:1"><b>Finish setting up</b><span>Add your business name and bank details so invoices look professional.</span></div><button class="btn btn-gold" data-act="ob-open">Set up</button></div>';
  } else if (S.cap && S.cap.plan === 'trial' && S.cap.trial_ends_at) {
    var dl = Math.max(0, Math.ceil((new Date(S.cap.trial_ends_at) - Date.now()) / 86400000));
    h += '<button class="card banner" data-act="go" data-to="#/plan" style="text-align:left;color:inherit;width:100%"><div style="flex:1"><b>Free trial · ' + dl + ' day' + (dl === 1 ? '' : 's') + ' left</b><span>Everything is unlocked. Plans open soon.</span></div>' + ic('chev') + '</button>';
  }
  h += Z.checklistHTML ? Z.checklistHTML() : '';
  var mp = Z.moneyParts(m.thisMonth, cur);
  var deltaTxt = m.delta === null ? (m.thisMonth > 0 ? 'No earlier month to compare yet' : 'Nothing received yet this month') : '<span class="' + (m.delta >= 0 ? 'up' : 'down') + '">' + (m.delta >= 0 ? '↑ ' : '↓ ') + Math.abs(Math.round(m.delta)) + '%</span> vs last month';
  var hasFlow = m.weeks.filter(function (v) { return v > 0; }).length >= 2;
  h += '<section class="card core" aria-label="Revenue"><div class="eyebrow">Flow Core · received this month</div>' +
    '<div class="big"><small>' + esc(mp.sym) + '</small>' + esc(mp.rest) + '</div><div class="line">' + deltaTxt + '</div>' +
    (hasFlow ? sparkSVG(m.weeks) : '<p class="hint" style="margin:14px 0 6px">Your money-flow line appears once payments arrive in two or more weeks.</p>') +
    '<div class="trio"><button class="paid" data-act="home-filter" data-v="paid"><b>' + m.paid + '</b><span>Paid</span></button><button class="pend" data-act="home-filter" data-v="sent"><b>' + m.pending + '</b><span>Pending</span></button><button class="over" data-act="home-filter" data-v="overdue"><b>' + m.overdue + '</b><span>Overdue</span></button></div></section>';
  if (curs.length > 1) h += '<div class="chips">' + curs.map(function (c) { return '<button class="chip" data-act="dcur" data-v="' + c + '" aria-pressed="' + (c === cur) + '">' + c + '</button>'; }).join('') + '</div>';
  h += '<div class="duo"><div class="card"><div class="eyebrow">Outstanding</div><div class="amt">' + money(m.outstanding, cur) + '</div></div><div class="card"><div class="eyebrow" style="color:var(--ruby)">Overdue</div><div class="amt">' + money(m.overdueAmt, cur) + '</div></div></div>';
  if (ins.length) {
    var t = ins[0], rem = '', btns = '';
    if (t.inv) {
      rem = '<div class="reminder">' + esc(Z.reminderText(t.inv, t.kind).replace(/https?:\/\/\S+/, '[secure invoice link]')) + '</div>';
      btns = '<div class="btn-row"><button class="btn btn-gold btn-grow" data-act="copy-reminder" data-id="' + esc(t.inv.id) + '" data-kind="' + t.kind + '">' + ic('copy', 'ic-sm') + 'Copy reminder</button><button class="btn btn-grow" data-act="wa-remind" data-id="' + esc(t.inv.id) + '" data-kind="' + t.kind + '">' + ic('chat', 'ic-sm') + 'WhatsApp</button></div>';
    } else if (t.nav) btns = '<div class="btn-row"><button class="btn btn-grow" data-act="go" data-to="' + t.nav + '">View</button></div>';
    h += '<section class="card pulse ' + (t.tone === 'warn' ? 'warn' : t.tone === 'gold' ? 'gold' : '') + '" aria-label="Flow intelligence"><div class="pulse-head"><div class="pulse-ic">' + ic(t.icon) + '</div><div><b>' + esc(t.title) + '</b><span>' + esc(t.sub) + '</span></div></div>' + rem + btns + '</section>';
    if (ins.length > 1) {
      h += '<div class="card list" style="padding-block:4px">' + ins.slice(1, 4).map(function (x) {
        return '<button class="li" data-act="' + (x.inv ? 'open-inv' : x.nav ? 'go' : 'noop') + '" data-id="' + (x.inv ? esc(x.inv.id) : '') + '" data-to="' + (x.nav || '') + '"><b>' + esc(x.title) + '</b><span class="st">' + ic(x.icon, 'ic-sm') + '</span><span class="ref" style="grid-column:1/-1;font-family:var(--font-ui)">' + esc(x.sub) + '</span></button>';
      }).join('') + '</div>';
    }
  }
  if (S.cap) {
    var used = S.cap.used, lim = S.cap.limit, pct = Math.min(100, Math.round(used / lim * 100)), left = lim - used;
    var rs = Math.max(0, Math.ceil((new Date(S.cap.resets_at) - Date.now()) / 86400000));
    h += '<section class="card" aria-label="Flow cap"><div class="cap-top"><div class="eyebrow">' + (S.cap.plan === 'trial' ? 'Trial cap' : 'Flow Cap') + '</div><div class="cap-n">' + used + ' <small>/ ' + lim + '</small></div></div><div class="meter' + (pct >= 90 ? ' hot' : '') + '" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pct + '"><i style="width:' + pct + '%"></i></div><div class="cap-foot"><span>' + left + ' invoice' + (left === 1 ? '' : 's') + ' remaining</span><span>Resets in ' + rs + ' day' + (rs === 1 ? '' : 's') + '</span></div></section>';
  }
  if (!S.invoices.length) {
    h += empty('Create your first invoice', 'It takes under a minute. Add a client, add what you did, send it on WhatsApp.', '<button class="btn btn-gold" data-act="new-inv">' + ic('plus', 'ic-sm') + 'New invoice</button>');
  } else {
    h += '<div class="section-title"><b>Recent invoices</b><button class="link-btn" data-act="go" data-to="#/invoices">See all</button></div><div class="card list" style="padding-block:4px 6px">' + S.invoices.slice(0, 5).map(invRow).join('') + '</div>';
    if (S.activity.length) h += '<div class="section-title"><b>Recent activity</b></div><div class="card" style="padding-block:6px">' + S.activity.slice(0, 5).map(actRow).join('') + '</div>';
  }
  return h + '</div>' + navHTML('more');
};
function hasUnseen() { try { var seen = localStorage.getItem('zy_seen_' + S.user.id) || ''; return S.activity.length && S.activity[0].created_at > seen; } catch (e) { return false; } }

/* ================= INVOICES ================= */
function filterMatch(i, f) {
  if (f === 'all') return true; if (f === 'sent') return i.status === 'sent' || i.status === 'viewed';
  return i.status === f;
}
SCR.invoices = function () {
  var f = S.filter, qq = S.q.trim().toLowerCase();
  var counts = {}; ['all', 'draft', 'sent', 'partially_paid', 'overdue', 'paid'].forEach(function (k) { counts[k] = S.invoices.filter(function (i) { return filterMatch(i, k); }).length; });
  var labels = { all: 'All', draft: 'Drafts', sent: 'Sent', partially_paid: 'Part paid', overdue: 'Overdue', paid: 'Paid' };
  var rows = S.invoices.filter(function (i) { return filterMatch(i, f) && (!qq || (clientName(i) + ' ' + i.invoice_number).toLowerCase().indexOf(qq) >= 0); });
  var h = '<div class="screen">' + bar('Invoices', { back: false, right: '<button class="btn btn-gold" data-act="new-inv" style="min-height:40px;padding:8px 14px">' + ic('plus', 'ic-sm') + 'New</button>' });
  h += '<div class="search">' + ic('search') + '<input class="in" id="invsearch" type="search" placeholder="Search client or number" value="' + esc(S.q) + '" autocomplete="off"></div>';
  h += '<div class="chiprow">' + Object.keys(labels).map(function (k) { return '<button class="chip" data-act="invfilter" data-v="' + k + '" aria-pressed="' + (f === k) + '">' + labels[k] + ' ' + counts[k] + '</button>'; }).join('') + '</div>';
  h += rows.length ? '<div class="card list" id="invlist" style="padding-block:4px 6px">' + rows.map(invRow).join('') + '</div>' :
    empty(S.invoices.length ? 'No invoices match' : 'No invoices yet', S.invoices.length ? 'Try another filter or search.' : 'Create one and it will show up here.', S.invoices.length ? '' : '<button class="btn btn-gold" data-act="new-inv">New invoice</button>');
  return h + '</div>' + navHTML('more');
};

/* ================= INVOICE DETAIL ================= */
SCR.detail = function (id) {
  var i = Z.invById(id);
  if (!i) return '<div class="screen">' + bar('Invoice') + empty('Invoice not found', 'It may have been deleted.', '<button class="btn" data-act="go" data-to="#/invoices">Back to invoices</button>') + '</div>' + navHTML('more');
  var det = S.detail[id], c = Z.clientById(i.client_id) || { name: 'Client' };
  var paid = Number(i.amount_paid), total = Number(i.total), pct = total > 0 ? Math.min(100, Math.round(paid / total * 100)) : 0;
  var st = i.status, open = Z.OPEN.indexOf(st) >= 0;
  var h = '<div class="screen">' + bar(i.invoice_number, { right: pill(st) });
  h += '<section class="card core"><div class="eyebrow">' + esc(c.name) + '</div><div class="big">' + (function () { var p = Z.moneyParts(st === 'paid' ? total : Z.bal(i), i.currency); return '<small>' + esc(p.sym) + '</small>' + esc(p.rest); })() + '</div>' +
    '<div class="line">' + (st === 'paid' ? 'Paid in full' : st === 'draft' ? 'Draft · ' + esc(dueText(i)) : st === 'void' ? 'Cancelled' : 'Balance due · ' + esc(dueText(i))) + '</div>' +
    (paid > 0 && st !== 'void' ? '<div class="meter" style="margin-top:14px"><i style="width:' + pct + '%"></i></div><div class="cap-foot"><span>Paid ' + money(paid, i.currency) + '</span><span>Total ' + money(total, i.currency) + '</span></div>' : '') + '</section>';
  var acts = '';
  if (st === 'draft') acts = '<div class="btn-row"><button class="btn btn-gold btn-grow" data-act="send-inv" data-id="' + esc(id) + '">' + ic('chat', 'ic-sm') + 'Send invoice</button><button class="btn btn-grow" data-act="edit-inv" data-id="' + esc(id) + '">' + ic('edit', 'ic-sm') + 'Edit</button></div>' +
    '<div class="btn-row"><button class="btn btn-grow" data-act="dup-inv" data-id="' + esc(id) + '">' + ic('copy', 'ic-sm') + 'Duplicate</button><button class="btn btn-grow" data-act="tpl-from-inv" data-id="' + esc(id) + '">' + ic('repeat', 'ic-sm') + 'Save template</button><button class="btn btn-danger" data-act="del-inv" data-id="' + esc(id) + '" aria-label="Delete draft">' + ic('trash', 'ic-sm') + '</button></div>';
  else if (open) acts = '<div class="btn-row"><button class="btn btn-gold btn-grow" data-act="pay-inv" data-id="' + esc(id) + '">' + ic('check', 'ic-sm') + 'Record payment</button><button class="btn btn-grow" data-act="share-inv" data-id="' + esc(id) + '">' + ic('share', 'ic-sm') + 'Share</button></div>' +
    '<div class="btn-row"><button class="btn btn-grow" data-act="remind-inv" data-id="' + esc(id) + '">' + ic('bell', 'ic-sm') + 'Remind</button><button class="btn btn-grow" data-act="dup-inv" data-id="' + esc(id) + '">' + ic('copy', 'ic-sm') + 'Duplicate</button>' + (paid === 0 ? '<button class="btn btn-danger" data-act="cancel-inv" data-id="' + esc(id) + '" aria-label="Cancel invoice">' + ic('x', 'ic-sm') + '</button>' : '') + '</div>';
  else if (st === 'paid') acts = '<div class="btn-row"><button class="btn btn-grow" data-act="share-inv" data-id="' + esc(id) + '">' + ic('share', 'ic-sm') + 'Share receipt</button><button class="btn btn-grow" data-act="dup-inv" data-id="' + esc(id) + '">' + ic('copy', 'ic-sm') + 'Duplicate</button><button class="btn btn-grow" data-act="tpl-from-inv" data-id="' + esc(id) + '">' + ic('repeat', 'ic-sm') + 'Template</button></div>';
  else acts = '<div class="btn-row"><button class="btn btn-grow" data-act="dup-inv" data-id="' + esc(id) + '">' + ic('copy', 'ic-sm') + 'Duplicate</button></div>';
  if (open && i.claimed_at) h += '<div class="card banner" style="border-color:var(--gold,#d9b45b)"><div style="flex:1"><b>' + esc(c.name) + ' says they have paid</b><span>' + Z.timeAgo(i.claimed_at) + '. Check your account, then record the payment.</span></div></div>';
  h += acts;
  if (i.sent_at) {
    h += '<div class="card" style="padding:6px 16px"><div class="kv"><span>Sent</span><b>' + Z.fmtDateTime(i.sent_at) + '</b></div><div class="kv"><span>Client opened</span><b>' + (i.viewed_at ? Z.fmtDateTime(i.viewed_at) + ' · ' + i.view_count + '×' : 'Not yet') + '</b></div><div class="kv"><span>Due</span><b>' + Z.fmtDate(i.due_date) + '</b></div></div>';
  }
  var pays = S.payments.filter(function (p) { return p.invoice_id === id; });
  if (pays.length) h += '<div class="section-title"><b>Payments</b></div><div class="card list" style="padding-block:4px">' + pays.map(function (p) { return '<div class="li"><b>' + money(p.amount, i.currency) + '</b><span class="st muted" style="font-size:12px">' + esc(Z.fmtDate(p.paid_on)) + '</span><span class="ref" style="font-family:var(--font-ui)">' + esc(Z.METHODS[p.method] || p.method) + (p.note ? ' · ' + esc(p.note) : '') + '</span></div>'; }).join('') + '</div>';
  h += '<div class="section-title"><b>Activity</b></div>';
  if (!det) h += '<div class="skel"></div>';
  else h += '<div class="card" style="padding:16px"><div class="tl">' + (det.activity.length ? det.activity.map(function (a) { return '<div>' + esc(a.message) + '<small>' + Z.fmtDateTime(a.created_at) + '</small></div>'; }).join('') : '<div>Created<small>' + Z.fmtDateTime(i.created_at) + '</small></div>') + '</div></div>';
  h += '<div class="section-title"><b>Invoice</b><span class="eyebrow">' + esc(Z.themeOf(i.theme).name) + '</span></div>';
  h += det ? Z.ownerPaper(i, det.items, { preview: st === 'draft' }) : '<div class="skel" style="min-height:260px"></div>';
  return h + '</div>' + navHTML('more');
};

/* ================= EDITOR ================= */
function editorInvoiceData() {
  var t = Z.calcTotals(E().items, discAmount(), E().vat);
  var c = Z.clientById(E().client_id);
  return { invoice: { invoice_number: E().number || 'Draft', status: 'draft', theme: E().theme, issue_date: E().issue_date, due_date: E().due_date, currency: E().currency, notes: E().notes, terms: E().terms, subtotal: t.sub, discount: t.disc, vat_rate: Z.num(E().vat), vat_amount: t.vat, total: t.total, amount_paid: 0 },
    client: c || { name: 'Choose a client' }, business: S.profile,
    items: E().items.map(function (i) { return { description: i.d || 'Item', quantity: Z.num(i.q), unit_price: Z.num(i.p) }; }), payments: [] };
}
function E() { return Z.getE(); }
function discAmount() {
  var e = E(), sub = Z.calcTotals(e.items, 0, 0).sub;
  return e.discMode === 'pct' ? Z.r2(sub * Math.min(Math.max(Z.num(e.disc), 0), 100) / 100) : Math.min(Math.max(Z.num(e.disc), 0), sub);
}
Z.discAmount = discAmount;
function itemsHTML() {
  return E().items.map(function (it, idx) {
    return '<div class="item"><input class="in" data-f="d" data-i="' + idx + '" placeholder="Description, e.g. Logo design" maxlength="500" aria-label="Item description" value="' + esc(it.d) + '">' +
      '<div class="r2"><label>Qty<input class="in" data-f="q" data-i="' + idx + '" type="number" inputmode="decimal" min="0" step="any" value="' + esc(it.q) + '" aria-label="Quantity"></label>' +
      '<label>Unit price (' + esc(Z.CURRENCIES.indexOf(E().currency) >= 0 ? E().currency : '') + ')<input class="in" data-f="p" data-i="' + idx + '" type="number" inputmode="decimal" min="0" step="any" value="' + esc(it.p) + '" aria-label="Unit price"></label>' +
      '<button class="rm" type="button" data-act="ed-rm" data-i="' + idx + '" aria-label="Remove item">' + ic('x', 'ic-sm') + '</button></div></div>';
  }).join('');
}
SCR.editor = function () {
  var e = E(), t = Z.calcTotals(e.items, discAmount(), e.vat), prev = e.mode === 'prev';
  var h = '<div class="screen nonav">' + bar(e.id ? 'Edit draft' : 'New invoice', { right: '<span class="ref">' + esc(e.number || 'Number assigned on save') + '</span>' });
  h += '<div class="seg" role="group"><button type="button" data-act="ed-mode" data-v="edit" aria-pressed="' + !prev + '">Edit</button><button type="button" data-act="ed-mode" data-v="prev" aria-pressed="' + prev + '">Preview</button></div>';
  if (prev) {
    h += '<div id="edprev">' + Z.invoiceHTML(editorInvoiceData(), { preview: true }) + '</div><p class="hint" style="text-align:center">This is exactly what your client will see.</p>';
  } else {
    h += '<div class="field"><label for="ed_client">Client</label><div style="display:flex;gap:8px"><select class="in" id="ed_client" data-f="client_id"><option value="">Choose a client</option>' + S.clients.map(function (c) { return '<option value="' + esc(c.id) + '"' + (c.id === e.client_id ? ' selected' : '') + '>' + esc(c.name) + '</option>'; }).join('') + '</select><button class="btn" type="button" data-act="ed-newclient" aria-label="New client" style="min-width:48px">' + ic('plus', 'ic-sm') + '</button></div></div>';
    h += '<div class="two"><div class="field"><label for="ed_cur">Currency</label><select class="in" id="ed_cur" data-f="currency">' + Z.CURRENCIES.map(function (c) { return '<option' + (c === e.currency ? ' selected' : '') + '>' + c + '</option>'; }).join('') + '</select></div>' +
      '<div class="field"><label for="ed_issue">Issue date</label><input class="in" id="ed_issue" type="date" data-f="issue_date" value="' + esc(e.issue_date) + '"></div></div>';
    h += '<div class="field"><span class="lbl">Items</span><div id="ed_items" style="display:flex;flex-direction:column;gap:10px">' + itemsHTML() + '</div><button class="add" type="button" data-act="ed-add">' + ic('plus', 'ic-sm') + 'Add item</button></div>';
    h += '<div class="field"><span class="lbl">Discount</span><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><div class="seg"><button type="button" data-act="ed-discmode" data-v="amt" aria-pressed="' + (e.discMode !== 'pct') + '">Amount</button><button type="button" data-act="ed-discmode" data-v="pct" aria-pressed="' + (e.discMode === 'pct') + '">Percent</button></div><input class="in" data-f="disc" type="number" inputmode="decimal" min="0" step="any" placeholder="0" value="' + esc(e.disc) + '" aria-label="Discount"></div></div>';
    h += '<div class="field"><span class="lbl">Tax</span><div class="chips"><button class="chip" type="button" data-act="ed-vat" data-v="0" aria-pressed="' + (Z.num(e.vat) === 0 && !e.vatCustom) + '">No tax</button>' + (e.currency === 'NGN' ? '<button class="chip" type="button" data-act="ed-vat" data-v="7.5" aria-pressed="' + (Z.num(e.vat) === 7.5 && !e.vatCustom) + '">VAT 7.5%</button>' : '') + '<button class="chip" type="button" data-act="ed-vat" data-v="custom" aria-pressed="' + !!e.vatCustom + '">Custom</button></div>' +
      (e.vatCustom ? '<input class="in" data-f="vat" type="number" inputmode="decimal" min="0" max="100" step="any" placeholder="Rate %" value="' + esc(e.vat) + '" aria-label="Tax rate percent">' : '') + '</div>';
    h += '<div class="field"><span class="lbl">Payment terms</span><div class="chips">' + Z.TERMS_PRESETS.map(function (p) { return '<button class="chip" type="button" data-act="ed-terms" data-v="' + p.d + '" aria-pressed="' + (String(e.termsKey) === String(p.d)) + '">' + p.l + '</button>'; }).join('') + '</div>' +
      (e.termsKey === 'custom' ? '<input class="in" type="date" data-f="due_date" value="' + esc(e.due_date) + '" aria-label="Due date">' : '') + '<span class="hint" id="ed_due">' + (e.due_date === e.issue_date ? 'Due on receipt, ' : 'Due ') + esc(Z.fmtDate(e.due_date)) + '</span></div>';
    h += '<div class="field"><label for="ed_notes">Notes</label><textarea class="in" id="ed_notes" data-f="notes" maxlength="1000" placeholder="Anything your client should know">' + esc(e.notes) + '</textarea><div class="chips">' + Z.NOTE_PRESETS.map(function (n, k) { return '<button class="chip" type="button" data-act="ed-note" data-k="' + k + '">' + esc(n.length > 34 ? n.slice(0, 32) + '…' : n) + '</button>'; }).join('') + '</div></div>';
    h += '<div class="field"><label for="ed_terms">Terms</label><textarea class="in" id="ed_terms" data-f="terms" maxlength="1000" placeholder="Late fees, deposits, delivery terms">' + esc(e.terms) + '</textarea></div>';
    h += '<div class="field"><span class="lbl">Invoice theme</span><div class="swatches">' + Z.THEMES.map(function (t2) { return '<button class="sw" type="button" data-act="ed-theme" data-v="' + t2.id + '" aria-pressed="' + (e.theme === t2.id) + '"><i style="background:linear-gradient(135deg,' + t2.b + ' 50%,' + t2.a + ' 50%)"></i>' + esc(t2.name) + '</button>'; }).join('') + '</div></div>';
    h += '<button class="link-btn" type="button" data-act="ed-tpl" style="align-self:flex-start">' + ic('repeat', 'ic-sm') + ' Save this as a template</button>';
  }
  h += '</div><div class="totalbar"><div class="t"><span class="eyebrow">Total</span><b id="barTotal">' + money(t.total, e.currency) + '</b></div><div class="btn-row">' +
    '<button class="btn btn-grow" type="button" data-act="ed-save"' + (e.saving ? ' disabled' : '') + '>Save draft</button>' +
    (prev ? '<button class="btn btn-gold btn-grow" type="button" data-act="ed-send"' + (e.saving ? ' disabled' : '') + '>Save &amp; send</button>' : '<button class="btn btn-gold btn-grow" type="button" data-act="ed-mode" data-v="prev">Preview invoice</button>') + '</div></div>';
  return h;
};
Z.itemsHTML = itemsHTML;

/* ================= CLIENTS ================= */
SCR.clients = function () {
  var qq = S.cq.trim().toLowerCase(), cur = (S.profile && S.profile.default_currency) || 'NGN';
  var rows = S.clients.filter(function (c) { return !qq || (c.name + ' ' + (c.email || '') + ' ' + (c.phone || '')).toLowerCase().indexOf(qq) >= 0; });
  var h = '<div class="screen">' + bar('Clients', { back: false, right: '<button class="btn btn-gold" data-act="client-new" style="min-height:40px;padding:8px 14px">' + ic('plus', 'ic-sm') + 'Add</button>' });
  if (S.clients.length > 4) h += '<div class="search">' + ic('search') + '<input class="in" id="clsearch" type="search" placeholder="Search clients" value="' + esc(S.cq) + '" autocomplete="off"></div>';
  h += rows.length ? '<div class="card" style="padding:4px 16px" id="cllist">' + rows.map(function (c) {
    var st = S.stats[c.id] || {}, out = Number(st.outstanding || 0), cc = clientCur(c.id) || cur;
    return '<button class="clientrow" data-act="client-open" data-id="' + esc(c.id) + '"><span class="av">' + esc(Z.initials(c.name)) + '</span><span class="m"><b>' + esc(c.name) + '</b><small>' + (st.invoice_count || 0) + ' invoice' + (st.invoice_count == 1 ? '' : 's') + '</small></span><span class="r">' + (out > 0 ? money(out, cc) + '<small>outstanding</small>' : '<small>settled</small>') + '</span></button>';
  }).join('') + '</div>' : empty(S.clients.length ? 'No clients match' : 'Add your first client', S.clients.length ? 'Try a different search.' : 'Clients keep their invoices, payments and history in one place.', S.clients.length ? '' : '<button class="btn btn-gold" data-act="client-new">Add client</button>');
  return h + '</div>' + navHTML('more');
};
function clientCur(id) { var i = S.invoices.filter(function (x) { return x.client_id === id; })[0]; return i ? i.currency : null; }
Z.clientCur = clientCur;
function clientSheetHTML(id) {
  var c = Z.clientById(id); if (!c) return '<p class="muted">Client not found.</p>';
  var st = S.stats[id] || {}, cur = clientCur(id) || (S.profile && S.profile.default_currency) || 'NGN';
  var invs = S.invoices.filter(function (i) { return i.client_id === id; });
  var h = '<div style="display:flex;gap:14px;align-items:center"><span class="av" style="width:52px;height:52px;font-size:18px">' + esc(Z.initials(c.name)) + '</span><div style="min-width:0"><b style="font-size:17px;display:block;overflow-wrap:anywhere">' + esc(c.name) + '</b><span class="muted" style="font-size:13px;overflow-wrap:anywhere">' + esc([c.email, c.phone].filter(Boolean).join(' · ') || 'No contact details') + '</span></div></div>';
  h += '<div class="kpis"><div class="card"><div class="eyebrow">Invoiced</div><div class="v">' + money(st.total_invoiced || 0, cur) + '</div></div><div class="card"><div class="eyebrow">Paid</div><div class="v" style="color:var(--emerald)">' + money(st.total_paid || 0, cur) + '</div></div></div>';
  h += '<div class="card" style="padding:6px 16px"><div class="kv"><span>Outstanding</span><b>' + money(st.outstanding || 0, cur) + '</b></div><div class="kv"><span>Last activity</span><b>' + (st.last_activity ? Z.timeAgo(st.last_activity) : '—') + '</b></div>' + (c.address ? '<div class="kv"><span>Address</span><b>' + esc(c.address) + '</b></div>' : '') + (c.notes ? '<div class="kv"><span>Notes</span><b>' + esc(c.notes) + '</b></div>' : '') + '</div>';
  h += '<div class="btn-row"><button class="btn btn-gold btn-grow" data-act="new-inv" data-client="' + esc(id) + '">' + ic('plus', 'ic-sm') + 'New invoice</button><button class="btn btn-grow" data-act="client-edit" data-id="' + esc(id) + '">' + ic('edit', 'ic-sm') + 'Edit</button></div>';
  if (c.phone) h += '<div class="btn-row"><a class="btn btn-grow" href="' + esc(Z.waLink(c.phone, '')) + '" target="_blank" rel="noopener">' + ic('chat', 'ic-sm') + 'WhatsApp</a><a class="btn btn-grow" href="tel:' + esc(c.phone.replace(/[^\d+]/g, '')) + '">' + ic('phone', 'ic-sm') + 'Call</a></div>';
  if (invs.length) h += '<div class="section-title"><b>Invoices</b></div><div class="list">' + invs.slice(0, 20).map(invRow).join('') + '</div>';
  return h;
}
Z.clientSheetHTML = clientSheetHTML;
function clientFormHTML(c) {
  c = c || {};
  return '<form id="clform" data-id="' + esc(c.id || '') + '" novalidate><div class="field"><label for="c_name">Name *</label><input class="in" id="c_name" maxlength="200" value="' + esc(c.name || '') + '" placeholder="Client or company name" autocomplete="off"></div>' +
    '<div class="two" style="margin-top:12px"><div class="field"><label for="c_phone">WhatsApp / phone</label><input class="in" id="c_phone" type="tel" inputmode="tel" value="' + esc(c.phone || '') + '" placeholder="0803 123 4567"></div><div class="field"><label for="c_email">Email</label><input class="in" id="c_email" type="email" inputmode="email" autocapitalize="none" value="' + esc(c.email || '') + '"></div></div>' +
    '<div class="field" style="margin-top:12px"><label for="c_addr">Address</label><input class="in" id="c_addr" maxlength="300" value="' + esc(c.address || '') + '"></div>' +
    '<div class="field" style="margin-top:12px"><label for="c_notes">Notes</label><textarea class="in" id="c_notes" maxlength="500">' + esc(c.notes || '') + '</textarea></div>' +
    '<div class="err" id="c_err" role="alert"></div><div class="btn-row" style="margin-top:6px"><button class="btn btn-gold btn-grow" type="submit">Save client</button>' + (c.id ? '<button class="btn btn-danger" type="button" data-act="client-del" data-id="' + esc(c.id) + '" aria-label="Delete client">' + ic('trash', 'ic-sm') + '</button>' : '') + '</div></form>';
}
Z.clientFormHTML = clientFormHTML;

/* ================= MORE / ANALYTICS / TEMPLATES / SETTINGS / PLAN ================= */
SCR.more = function () {
  var p = S.profile;
  function m(icon, t, sub, to, act) { return '<button data-act="' + (act || 'go') + '"' + (to ? ' data-to="' + to + '"' : '') + '><span class="ico">' + ic(icon) + '</span><span><b>' + t + '</b><small>' + sub + '</small></span>' + ic('chev', 'chev') + '</button>'; }
  return '<div class="screen">' + bar('More', { back: false }) +
    '<div class="card" style="display:flex;gap:14px;align-items:center">' + (Z.safeLogo(p.logo_url) ? '<span class="logo-prev" style="border-style:solid"><img src="' + esc(Z.safeLogo(p.logo_url)) + '" alt=""></span>' : '<span class="av" style="width:52px;height:52px;font-size:18px">' + esc(Z.initials(p.business_name || p.full_name)) + '</span>') +
    '<div style="min-width:0"><b style="display:block;overflow-wrap:anywhere">' + esc(p.business_name || p.full_name || 'Your business') + '</b><span class="muted" style="font-size:13px;overflow-wrap:anywhere">' + esc(p.email || (S.user && S.user.email) || '') + '</span></div></div>' +
    '<div class="card menu" style="padding:0 14px">' +
    m('file', 'Invoices', 'Create invoices and track payments', '#/billing') +
    m('users', 'Customers', 'People you sell to and invoice', '#/clients') +
    m('spark', 'Theme Studio', 'Colours, logo and store style', '#/theme') +
    m('user', 'Store settings', 'Logo, WhatsApp, colour, link', null, 'st-settings') +
    m('chart', 'Analytics', 'Revenue, trends, top clients', '#/analytics') +
    m('repeat', 'Templates & recurring', 'Reuse invoices and repeat monthly', '#/templates') +
    m('user', 'Business profile', 'Logo, bank details, invoice defaults', '#/settings') +
    m('card', 'Plan & billing', 'Trial status and pricing', '#/plan') +
    m('help', 'Help & FAQ', 'Tutorial, answers and support', '#/help') +
    m('share', 'Invite a friend', 'Share Zyron on WhatsApp', null, 'invite') +
    m('phone', 'Install the app', 'Add Zyron to your home screen', null, 'install') +
    m('out', 'Sign out', 'See you soon', null, 'signout') + '</div>' +
    '<p class="hint" style="text-align:center"><a class="inl" href="#/terms">Terms</a> · <a class="inl" href="#/privacy">Privacy</a></p>' +
    '<p class="hint" style="text-align:center">Zyron · Built in Lagos by Zyron Studio</p></div>' + navHTML('more');
};
SCR.analytics = function () {
  var curs = Z.currenciesUsed(), cur = S.dcur, m = Z.metrics(cur), max = Math.max.apply(null, m.months.map(function (x) { return x.v; }).concat([1]));
  var h = '<div class="screen">' + bar('Analytics');
  if (curs.length > 1) h += '<div class="chips">' + curs.map(function (c) { return '<button class="chip" data-act="dcur" data-v="' + c + '" aria-pressed="' + (c === cur) + '">' + c + '</button>'; }).join('') + '</div>';
  h += '<div class="kpis"><div class="card"><div class="eyebrow">Total received</div><div class="v">' + money(m.total, cur) + '</div></div><div class="card"><div class="eyebrow">Outstanding</div><div class="v">' + money(m.outstanding, cur) + '</div></div>' +
    '<div class="card"><div class="eyebrow" style="color:var(--ruby)">Overdue</div><div class="v">' + money(m.overdueAmt, cur) + '</div></div><div class="card"><div class="eyebrow">Invoices sent</div><div class="v">' + m.count + '</div></div>' +
    '<div class="card"><div class="eyebrow">Avg. invoice value</div><div class="v">' + (m.count ? money(m.avg, cur) : '<span class="muted" style="font-size:14px;font-weight:500">No data yet</span>') + '</div></div><div class="card"><div class="eyebrow">Avg. time to pay</div><div class="v">' + (m.avgDays === null ? '<span class="muted" style="font-size:14px;font-weight:500">No data yet</span>' : (m.avgDays < 1 ? 'Same day' : Math.round(m.avgDays) + ' days')) + '</div></div></div>';
  h += '<div class="card"><div class="eyebrow">Received, last 6 months</div><div class="bars">' + m.months.map(function (x) { return '<div title="' + esc(money(x.v, cur)) + '"><i style="height:' + Math.max(3, Math.round(x.v / max * 100)) + '%"></i><span>' + esc(x.label) + '</span></div>'; }).join('') + '</div></div>';
  h += '<div class="card"><div class="eyebrow" style="margin-bottom:12px">Top clients by money received</div>' + (m.top.length ? '<div class="rank">' + m.top.map(function (t) { var pc = m.total ? Math.round(t.v / m.total * 100) : 0; return '<div class="r"><b>' + esc(t.name) + '</b><span class="num">' + money(t.v, cur) + ' · ' + pc + '%</span><div class="bar"><i style="width:' + pc + '%"></i></div></div>'; }).join('') + '</div>' : '<p class="hint" style="margin:0">Record a payment and your best clients will appear here.</p>') + '</div>';
  return h + '</div>' + navHTML('more');
};
SCR.templates = function () {
  var h = '<div class="screen">' + bar('Templates & recurring');
  h += '<p class="hint" style="margin:0">Save an invoice as a template, then create new drafts from it in one tap. Recurring templates create a <b>draft</b> on schedule for you to review and send.</p>';
  h += S.templates.length ? '<div class="card list" style="padding-block:4px">' + S.templates.map(function (t) {
    var c = Z.clientById(t.client_id);
    return '<button class="li" data-act="tpl-open" data-id="' + esc(t.id) + '"><b>' + esc(t.name) + '</b><span class="st">' + (t.recurrence !== 'none' && t.active ? '<span class="pill viewed">' + esc(t.recurrence) + '</span>' : '') + '</span><span class="ref" style="font-family:var(--font-ui)">' + esc(c ? c.name : 'No client') + (t.recurrence !== 'none' && t.next_run ? ' · next ' + esc(Z.fmtDate(t.next_run)) : '') + '</span></button>';
  }).join('') + '</div>' : empty('No templates yet', 'Open any invoice and tap “Save template”.', '<button class="btn" data-act="go" data-to="#/invoices">Go to invoices</button>');
  return h + '</div>' + navHTML('more');
};
function tplSheetHTML(t) {
  var c = Z.clientById(t.client_id), items = Array.isArray(t.items) ? t.items : [];
  var tot = Z.calcTotals(items.map(function (i) { return { q: i.quantity, p: i.unit_price }; }), t.discount, t.vat_rate);
  return '<div class="card" style="padding:6px 16px"><div class="kv"><span>Client</span><b>' + esc(c ? c.name : 'Not set') + '</b></div><div class="kv"><span>Items</span><b>' + items.length + '</b></div><div class="kv"><span>Total</span><b>' + money(tot.total, t.currency) + '</b></div><div class="kv"><span>Due after</span><b>' + t.due_days + ' days</b></div></div>' +
    '<button class="btn btn-gold btn-block" data-act="tpl-use" data-id="' + esc(t.id) + '">' + ic('plus', 'ic-sm') + 'Create invoice from this</button>' +
    '<form id="tplform" data-id="' + esc(t.id) + '" novalidate><div class="field"><label for="t_name">Template name</label><input class="in" id="t_name" maxlength="80" value="' + esc(t.name) + '"></div>' +
    '<div class="field" style="margin-top:12px"><label for="t_client">Client</label><select class="in" id="t_client"><option value="">No client</option>' + S.clients.map(function (cl) { return '<option value="' + esc(cl.id) + '"' + (cl.id === t.client_id ? ' selected' : '') + '>' + esc(cl.name) + '</option>'; }).join('') + '</select></div>' +
    '<div class="two" style="margin-top:12px"><div class="field"><label for="t_rec">Repeat</label><select class="in" id="t_rec"><option value="none"' + (t.recurrence === 'none' ? ' selected' : '') + '>Never</option><option value="weekly"' + (t.recurrence === 'weekly' ? ' selected' : '') + '>Weekly</option><option value="monthly"' + (t.recurrence === 'monthly' ? ' selected' : '') + '>Monthly</option></select></div><div class="field"><label for="t_next">Next draft on</label><input class="in" id="t_next" type="date" value="' + esc(t.next_run || '') + '"></div></div>' +
    '<label style="display:flex;gap:10px;align-items:center;margin-top:12px;font-size:14px"><input type="checkbox" id="t_active"' + (t.active ? ' checked' : '') + ' style="width:20px;height:20px;accent-color:#d9b45b"> Recurring is switched on</label>' +
    '<div class="err" id="t_err"></div><div class="btn-row" style="margin-top:6px"><button class="btn btn-grow" type="submit">Save changes</button><button class="btn btn-danger" type="button" data-act="tpl-del" data-id="' + esc(t.id) + '" aria-label="Delete template">' + ic('trash', 'ic-sm') + '</button></div></form>';
}
Z.tplSheetHTML = tplSheetHTML;
SCR.settings = function () {
  var p = S.profile, logo = Z.safeLogo(p.logo_url);
  function f(id, label, v, o) { o = o || {}; return '<div class="field"><label for="' + id + '">' + label + '</label><input class="in" id="' + id + '" value="' + esc(v || '') + '"' + (o.type ? ' type="' + o.type + '"' : '') + (o.mode ? ' inputmode="' + o.mode + '"' : '') + (o.max ? ' maxlength="' + o.max + '"' : '') + (o.ph ? ' placeholder="' + o.ph + '"' : '') + ' autocomplete="off"></div>'; }
  return '<div class="screen nonav">' + bar('Business profile') + '<form id="setform" novalidate style="display:flex;flex-direction:column;gap:14px">' +
    '<div class="card" style="display:flex;flex-direction:column;gap:14px"><div class="eyebrow">Business</div><div class="logo-up"><div class="logo-prev" id="logoprev">' + (logo ? '<img src="' + esc(logo) + '" alt="Logo">' : ic('user', 'ic-lg')) + '</div><div><button class="btn" type="button" data-act="logo-pick">' + (logo ? 'Change logo' : 'Upload logo') + '</button><div class="hint" style="margin-top:6px">PNG or JPG. Shown on every invoice.</div></div></div><input type="file" id="logofile" accept="image/png,image/jpeg,image/webp" hidden>' +
    f('s_biz', 'Business name', p.business_name, { max: 120, ph: 'e.g. Nova Creative Studio' }) + f('s_name', 'Your name', p.full_name, { max: 80 }) +
    '<div class="two">' + f('s_phone', 'Phone / WhatsApp', p.phone, { type: 'tel', mode: 'tel' }) + f('s_email', 'Business email', p.email, { type: 'email', mode: 'email' }) + '</div>' + f('s_addr', 'Address', p.address, { max: 200, ph: 'City, State' }) + f('s_web', 'Website', p.website, { max: 200, ph: 'optional' }) + '</div>' +
    '<div class="card" style="display:flex;flex-direction:column;gap:14px"><div class="eyebrow">Where clients pay you</div>' + f('s_bank', 'Bank name', p.bank_name, { max: 80, ph: 'e.g. GTBank' }) + '<div class="two">' + f('s_acct', 'Account number or IBAN', p.account_number, { max: 34, ph: 'e.g. 0123456789' }) + f('s_aname', 'Account name', p.account_name, { max: 120 }) + '</div>' + f('s_paylink', 'Payment link (optional)', p.pay_link, { type: 'url', mode: 'url', max: 500, ph: 'https://paystack.com/pay/yourname' }) + '<p class="hint" style="margin:0">Clients get a Pay now button and a QR code. Use a link from your own Paystack, Flutterwave or bank payment page. Zyron never handles the money.</p>' + f('s_intl', 'International transfers (optional)', p.intl_bank, { max: 300, ph: 'SWIFT/BIC, routing number, bank address' }) + '<p class="hint" style="margin:0">For clients abroad: add SWIFT/BIC, routing number or IBAN. Shown on invoices under International.</p><p class="hint" style="margin:0">Shown on your invoices so clients can transfer straight to you. Use an account you control.</p></div>' +
    '<div class="card" style="display:flex;flex-direction:column;gap:14px"><div class="eyebrow">Invoice defaults</div><div class="two">' + f('s_prefix', 'Number prefix', p.invoice_prefix, { max: 6, ph: 'ZY' }) +
    '<div class="field"><label for="s_cur">Currency</label><select class="in" id="s_cur">' + Z.CURRENCIES.map(function (c) { return '<option' + (c === p.default_currency ? ' selected' : '') + '>' + c + '</option>'; }).join('') + '</select></div></div>' +
    '<div class="two"><div class="field"><label for="s_due">Default due (days)</label><input class="in" id="s_due" type="number" inputmode="numeric" min="0" max="365" value="' + esc(p.default_due_days) + '"></div><div class="field"><label for="s_theme">Theme</label><select class="in" id="s_theme">' + Z.THEMES.map(function (t) { return '<option value="' + t.id + '"' + (t.id === p.default_theme ? ' selected' : '') + '>' + t.name + '</option>'; }).join('') + '</select></div></div>' +
    '<div class="field"><label for="s_terms">Default terms</label><textarea class="in" id="s_terms" maxlength="1000" placeholder="Shown on every new invoice">' + esc(p.default_terms || '') + '</textarea></div></div>' +
    '<div class="err" id="s_err" role="alert"></div>' +
    '<div class="card" style="display:flex;flex-direction:column;gap:10px"><div class="eyebrow">Account</div><div class="kv" style="border:0"><span>Signed in as</span><b>' + esc((S.user && S.user.email) || '') + '</b></div></div></form>' +
    '</div><div class="totalbar"><button class="btn btn-gold btn-block" type="submit" form="setform" id="s_btn">Save changes</button></div>';
};
SCR.plan = function () {
  var c = S.cap || {}, dl = c.trial_ends_at ? Math.max(0, Math.ceil((new Date(c.trial_ends_at) - Date.now()) / 86400000)) : 0;
  return '<div class="screen">' + bar('Plan & billing') +
    '<section class="card core"><div class="eyebrow">Your plan</div><div class="big" style="font-size:28px">' + (c.plan === 'trial' ? 'Free trial' : esc(String(c.plan || '').replace(/^./, function (x) { return x.toUpperCase(); }))) + '</div><div class="line">' + (c.plan === 'trial' ? dl + ' day' + (dl === 1 ? '' : 's') + ' left · everything unlocked' : 'Active') + '</div></section>' +
    '<div class="two"><div class="card"><div class="eyebrow">Monthly</div><div class="amt" style="font-size:22px;font-weight:700;margin-top:4px">₦10,000</div><div class="hint">per month</div></div><div class="card" style="border-color:var(--gold)"><div class="eyebrow" style="color:var(--gold)">Yearly · save ₦20,000</div><div class="amt" style="font-size:22px;font-weight:700;margin-top:4px">₦100,000</div><div class="hint">per year</div></div></div>' +
    '<div class="card" style="display:flex;flex-direction:column;gap:10px">' + ['100 invoices every 30 days', 'Send on WhatsApp, email or link', 'Know when clients open invoices', 'Part payments, reminders and overdue tracking', '5 premium invoice themes with your logo', 'Templates and recurring drafts'].map(function (x) { return '<div style="display:flex;gap:10px;align-items:center">' + ic('check', 'ic-sm') + '<span>' + x + '</span></div>'; }).join('') + '</div>' +
    '<button class="btn btn-gold btn-block" data-act="plan-soon">Choose a plan</button><p class="hint" style="text-align:center;margin:0">Card and bank payments for plans are being switched on. Your trial and your invoices are unaffected.</p></div>' + navHTML('more');
};

/* ================= PUBLIC INVOICE (client view) ================= */
SCR.publicLoading = function () { return '<div class="pub"><div class="skel" style="min-height:420px"></div></div>'; };
SCR.publicInvoice = function (d, token) {
  var inv = d.invoice, b = d.business || {}, phone = b.phone;
  var h = '<div class="pub"><div class="clientbar">' + ic('lock', 'ic-sm') + '<span>Secure invoice from ' + esc(b.business_name || b.full_name || 'your supplier') + '</span></div>' + Z.invoiceHTML(d, { growth: true, shareUrl: Z.shareUrl(token) });
  var openSt = ['sent', 'viewed', 'partially_paid', 'overdue'].indexOf(inv.status) >= 0;
  if (openSt) h += '<div class="btn-row noprint">' + (inv.pay_link ? '<a class="btn btn-gold btn-grow" target="_blank" rel="noopener noreferrer" href="' + esc(inv.pay_link) + '">Pay now</a>' : '') + (inv.claimed_at ? '' : '<button class="btn btn-grow" data-act="pub-claim" data-tok="' + esc(token) + '">I have paid</button>') + '</div>';
  if (openSt && inv.claimed_at) h += '<div class="card noprint" style="text-align:center;padding:12px"><b>Thanks, we told ' + esc(String(b.business_name || b.full_name || 'the business')) + ' you have paid.</b><span class="muted" style="display:block;font-size:12px;margin-top:4px">They will confirm once the money shows in their account.</span></div>';
  h += '<div class="btn-row noprint"><button class="btn btn-gold btn-grow" data-act="pub-print">' + ic('pdf', 'ic-sm') + 'Download PDF</button>' + (phone ? '<a class="btn btn-grow" target="_blank" rel="noopener" href="' + esc(Z.waLink(phone, 'Hi, about invoice ' + inv.invoice_number)) + '">' + ic('chat', 'ic-sm') + 'Message ' + esc(String(b.business_name || b.full_name || '').split(' ')[0] || 'business') + '</a>' : '') + '</div>';
  h += '<div class="cta">' + zmk() + '<span>Invoices that look this good take about a minute.</span><a class="btn" href="' + esc(location.origin + location.pathname) + '" style="margin-top:4px">Try Zyron free for 2 months</a></div></div>';
  return h;
};
SCR.publicMissing = function () {
  return '<div class="pub" style="min-height:80dvh;justify-content:center">' + empty('This invoice link isn’t available', 'It may have been cancelled, or the link is incomplete. Please ask the sender for a new link.', '') + '</div>';
};

Z.SCR = SCR; Z.helpers = { bar: bar, pill: pill, skeleton: skeleton, empty: empty, navHTML: navHTML, invRow: invRow, actRow: actRow, clientName: clientName, hasUnseen: hasUnseen };
})();
