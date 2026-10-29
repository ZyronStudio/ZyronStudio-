/* Zyron Store: the online store lives inside the same app, same login, same look. */
(function () {
'use strict';
var Z = window.Z, S = Z.S, esc = Z.esc, ic = Z.ic, SCR = Z.SCR, H = Z.helpers, toast = Z.toast, ACT = window.ZA.ACT;
var SB_URL = 'https://tnjgkxdjejjvujtteyfx.supabase.co';
var CATS = [['fashion', 'Fashion'], ['shoes_accessories', 'Shoes & accessories'], ['beauty_wigs', 'Beauty & wigs'], ['perfume_cosmetics', 'Perfume & cosmetics'], ['electronics', 'Electronics'], ['restaurant', 'Restaurant & food'], ['rental', 'Rentals'], ['services', 'Services & bookings'], ['general', 'General']];
var CURS = [['NGN', '₦ Nigerian Naira (NGN)'], ['USD', '$ US Dollar (USD)'], ['GBP', '£ British Pound (GBP)'], ['EUR', '€ Euro (EUR)'], ['CAD', '$ Canadian Dollar (CAD)'], ['AUD', '$ Australian Dollar (AUD)']];
var ACC = { fashion: '#e7c4b0', shoes_accessories: '#7fb2ff', beauty_wigs: '#f0a6ca', perfume_cosmetics: '#c7a8ff', electronics: '#4fe0cf', general: '#d4af37' };
var ST = { loaded: false, loading: false, store: null, sub: null, prods: [], orders: [], q: '', sec: '', err: '' };
var NEXT = { awaiting_confirmation: ['confirmed', 'cancelled'], confirmed: ['preparing', 'cancelled'], preparing: ['ready'], ready: ['completed'] };
var CC = [['234', 'Nigeria +234'], ['233', 'Ghana +233'], ['254', 'Kenya +254'], ['27', 'South Africa +27'], ['1', 'USA / Canada +1'], ['44', 'United Kingdom +44'], ['971', 'UAE +971']];
function phoneField(id, label, full, cc0, no0) {
  var cc = '234', no;
  if (cc0 !== undefined) { cc = cc0 || '234'; no = no0 || ''; }
  else { full = String(full || '').replace(/\D/g, ''); no = full; CC.slice().sort(function (a, b) { return b[0].length - a[0].length; }).some(function (c) { if (full.indexOf(c[0]) === 0 && full.length > c[0].length + 6) { cc = c[0]; no = full.slice(c[0].length); return true; } }); }
  return '<div class="field"><label for="' + id + '_no">' + label + '</label><div style="display:grid;grid-template-columns:152px 1fr;gap:8px"><select class="in" id="' + id + '_cc" aria-label="Country code">' + CC.map(function (c) { return '<option value="' + c[0] + '"' + (c[0] === cc ? ' selected' : '') + '>' + c[1] + '</option>'; }).join('') + '</select><input class="in" id="' + id + '_no" type="tel" inputmode="tel" placeholder="801 234 5678" value="' + esc(no) + '"></div></div>';
}
function getPhone(id) { var no = val(id + '_no').replace(/\D/g, '').replace(/^0+/, ''), full = val(id + '_cc') + no; return no.length >= 6 && full.length <= 15 ? full : ''; }
function sb() { return Z.getSB(); }
function val(id) { var e = document.getElementById(id); return e ? String(e.value).trim() : ''; }
function m(minor, cur) { try { return new Intl.NumberFormat(cur === 'NGN' || !cur ? 'en-NG' : 'en', { style: 'currency', currency: cur || 'NGN', maximumFractionDigits: 0 }).format((minor || 0) / 100); } catch (e) { return String(minor / 100) + ' ' + cur; } }
function img(p) { return SB_URL + '/storage/v1/object/public/store-media/' + p; }
function slugify(s) { return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40); }
function link(s) { return location.origin + '/store/' + s.slug; }
function opts(list, cur) { return list.map(function (c) { var v = c[0] || c, l = c[1] || c; return '<option value="' + v + '"' + (v === cur ? ' selected' : '') + '>' + l + '</option>'; }).join(''); }
function logoEl(sz) { var s = ST.store; return s && s.logo_path ? '<img alt="" src="' + esc(img(s.logo_path)) + '" style="width:' + sz + 'px;height:' + sz + 'px;border-radius:14px;object-fit:cover;flex:none">' : '<span style="width:' + sz + 'px;height:' + sz + 'px;border-radius:14px;background:var(--gold-soft);color:var(--gold);display:grid;place-items:center;font-weight:800;flex:none">' + esc(((s && s.name) || 'S').charAt(0).toUpperCase()) + '</span>'; }

function rerender() { window.ZA.render(); }

async function load(force) {
  if (ST.loading || (ST.loaded && !force)) return;
  ST.loading = true; ST.err = '';
  try {
    var c = sb(), r = await c.from('stores').select('*').eq('owner_id', S.user.id).maybeSingle();
    if (r.error) throw r.error; ST.store = r.data; ST.prods = []; ST.orders = [];
    if (r.data) {
      var a = await Promise.all([
        c.from('store_subscriptions').select('*').eq('owner_id', S.user.id).maybeSingle(),
        c.from('store_products').select('*, store_product_images(id,path,sort_order)').eq('store_id', r.data.id).neq('status', 'archived').order('created_at', { ascending: false }),
        c.from('store_orders').select('*, store_order_items(*)').eq('store_id', r.data.id).order('created_at', { ascending: false }).limit(50)]);
      ST.sub = a[0].data; ST.prods = a[1].data || []; ST.orders = a[2].data || [];
    }
    ST.loaded = true;
  } catch (e) { ST.err = Z.errMsg(e); }
  ST.loading = false; rerender();
}

/* ---------------- Store setup: 4 steps (Business, Details, Design, Review) ---------------- */
var SU = null;
function suReset() {
  var cur = (S.profile && S.profile.currency) || 'NGN'; if (!CURS.some(function (c) { return c[0] === cur; })) cur = 'NGN';
  SU = { step: 0, name: '', slug: '', cat: 'fashion', cc: '234', no: '', cur: cur, desc: '', ig: '', addr: '', logo: null, th: Object.assign(ZTheme.defaults('fashion'), { preset: '' }), thTouched: false };
}
function suStepper(n) {
  var L = ['Business', 'Details', 'Design', 'Review'];
  return '<div style="display:flex;align-items:flex-start;margin:4px 0 18px">' + L.map(function (l, i) {
    var on = i === n, done = i < n;
    return '<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:6px;position:relative">' +
      (i ? '<span style="position:absolute;top:15px;right:50%;width:100%;height:2px;background:' + (i <= n ? 'var(--gold)' : 'var(--line)') + '"></span>' : '') +
      '<span style="position:relative;z-index:1;width:32px;height:32px;border-radius:99px;display:grid;place-items:center;font-weight:700;font-size:14px;border:2px solid ' + (on || done ? 'var(--gold)' : 'var(--line)') + ';background:' + (on ? 'var(--gold)' : 'var(--surface)') + ';color:' + (on ? '#17120a' : done ? 'var(--gold)' : 'var(--muted)') + '">' + (done ? '✓' : (i + 1)) + '</span>' +
      '<span style="font-size:12px;color:' + (on ? 'var(--text)' : 'var(--muted)') + '">' + l + '</span></div>';
  }).join('') + '</div>';
}
function suPreview(tk) {
  var nm = SU.name.trim() || 'Your store', btn = tk.button === 'outline' ? 'background:transparent;color:var(--acc);border:2px solid var(--acc)' : 'background:var(--acc);color:var(--onacc);border:2px solid var(--acc)';
  var logo = SU.logo ? '<img alt="" src="' + esc(SU.logo.url) + '" style="width:40px;height:40px;object-fit:cover;border-radius:calc(var(--r) - 4px)">' : '<span style="width:40px;height:40px;border-radius:calc(var(--r) - 4px);background:var(--acc);color:var(--onacc);display:grid;place-items:center;font-weight:800">' + esc(nm.charAt(0).toUpperCase()) + '</span>';
  var tile = '<div style="flex:1;min-width:0"><div style="aspect-ratio:4/5;background:var(--surface);border:1px solid var(--line);border-radius:var(--r)"></div><div style="font-size:12px;margin-top:5px;font-weight:600">Product name</div><div style="font-size:12px;color:var(--acc);font-weight:700">' + m(2500000, SU.cur) + '</div></div>';
  return '<div style="' + styleStr(tk) + ';background:var(--bg);color:var(--tx);font-family:var(--font);border:1px solid var(--line);border-radius:18px;padding:16px;display:flex;flex-direction:column;gap:12px"><div style="display:flex;gap:10px;align-items:center">' + logo + '<b style="font-size:17px;letter-spacing:-.02em">' + esc(nm) + '</b></div>' +
    '<div style="color:var(--mut);font-size:13px">' + esc(SU.desc.trim() || 'Your products, your brand.') + '</div><div style="display:flex;gap:10px">' + tile + tile + '</div><div style="' + btn + ';border-radius:var(--rb);padding:11px;text-align:center;font-weight:700;font-size:14px">Add to order</div></div>';
}
function suPrevRefresh() {
  var tk = ZTheme.build(SU.th, SU.cat), el = document.getElementById('su_prev'); if (el) el.innerHTML = suPreview(tk);
  var w = document.getElementById('su_warn'); if (w) w.innerHTML = tk.notes.length ? tk.notes.map(function (n) { return '<div class="hint" style="margin:0;color:var(--gold)">• ' + esc(n) + '</div>'; }).join('') : '<div class="hint" style="margin:0">✓ Text and buttons are easy to read.</div>';
  var hx = document.getElementById('su_hex'), co = document.getElementById('su_col'); if (hx && document.activeElement !== hx) hx.value = SU.th.primary; if (co) co.value = SU.th.primary;
}
function suLink() { return esc(location.host) + '/store/<b>' + esc(slugify(SU.slug || SU.name) || 'your-store') + '</b>'; }
function suRow(label, value, step) { return '<div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;padding:10px 0;border-bottom:1px solid var(--line)"><div style="min-width:0"><div class="hint" style="margin:0">' + label + '</div><div style="overflow-wrap:anywhere">' + value + '</div></div><button class="link-btn" data-act="su-go" data-s="' + step + '">Edit</button></div>'; }
function setup() {
  if (!SU) suReset();
  var n = SU.step, body = '';
  if (n === 0) body =
    '<div class="field"><label for="su_name">Business name *</label><input class="in" id="su_name" maxlength="60" placeholder="Maison Adé" value="' + esc(SU.name) + '"></div>' +
    '<div class="field"><label for="su_slug">Store link</label><input class="in" id="su_slug" maxlength="40" autocapitalize="off" spellcheck="false" placeholder="maison-ade" value="' + esc(SU.slug) + '"><span class="hint" style="margin:0" id="su_linkhint">' + suLink() + '</span></div>' +
    '<div class="field"><label for="su_cat">What do you sell?</label><select class="in" id="su_cat">' + opts(CATS, SU.cat) + '</select></div>' +
    phoneField('su_wa', 'WhatsApp number for orders *', '', SU.cc, SU.no) +
    '<div class="field"><label for="su_cur">Currency your prices are in</label><select class="in" id="su_cur">' + opts(CURS, SU.cur) + '</select><span class="hint" style="margin:0">Most Nigerian sellers choose Naira.</span></div>';
  else if (n === 1) body =
    '<div class="field"><label>Store logo (optional)</label><div style="display:flex;gap:12px;align-items:center"><span>' + (SU.logo ? '<img alt="" src="' + esc(SU.logo.url) + '" style="width:56px;height:56px;border-radius:14px;object-fit:cover;display:block">' : '<span style="width:56px;height:56px;border-radius:14px;background:var(--gold-soft);color:var(--gold);display:grid;place-items:center;font-weight:800">' + esc((SU.name.trim() || 'S').charAt(0).toUpperCase()) + '</span>') + '</span>' +
    '<div style="flex:1"><label class="btn btn-block" for="su_logo" style="cursor:pointer">' + (SU.logo ? 'Change logo' : 'Upload logo') + '</label><input id="su_logo" type="file" accept="image/*" style="position:absolute;left:-9999px;width:1px;height:1px;opacity:0"></div></div><span class="hint" style="margin:0">No logo? We show your name in a clean style.</span></div>' +
    '<div class="field"><label for="su_desc">About your business</label><textarea class="in" id="su_desc" maxlength="500" placeholder="Elegant everyday wear, made in Lagos.">' + esc(SU.desc) + '</textarea></div>' +
    '<div class="field"><label for="su_ig">Instagram (optional)</label><input class="in" id="su_ig" maxlength="31" autocapitalize="off" spellcheck="false" placeholder="yourhandle" value="' + esc(SU.ig) + '"></div>' +
    '<div class="field"><label for="su_addr">Area or address (optional)</label><input class="in" id="su_addr" maxlength="200" placeholder="Lekki, Lagos" value="' + esc(SU.addr) + '"></div>';
  else if (n === 2) body =
    '<div id="su_prev">' + suPreview(ZTheme.build(SU.th, SU.cat)) + '</div>' +
    '<div class="field"><label>Quick look</label><div class="chiprow">' + ZTheme.PRESETS.map(function (p) { return '<button class="chip" data-act="su-preset" data-v="' + p.id + '" aria-pressed="' + (SU.th.preset === p.id) + '"><span style="display:inline-block;width:10px;height:10px;border-radius:99px;background:' + p.primary + ';margin-right:6px"></span>' + p.name + '</button>'; }).join('') + '</div></div>' +
    '<div class="field"><label for="su_hex">Main colour</label><div style="display:grid;grid-template-columns:56px 1fr;gap:8px"><input class="in" id="su_col" type="color" value="' + SU.th.primary + '" style="padding:4px;height:46px"><input class="in" id="su_hex" maxlength="7" autocapitalize="off" spellcheck="false" value="' + SU.th.primary + '"></div><span class="hint" style="margin:0">Pick one colour. The rest is built for you.</span></div>' +
    '<div class="field"><label>Mode</label><div class="seg"><button type="button" data-act="su-mode" data-v="dark" aria-pressed="' + (SU.th.mode === 'dark') + '">Dark</button><button type="button" data-act="su-mode" data-v="light" aria-pressed="' + (SU.th.mode === 'light') + '">Light</button></div></div><div id="su_warn"></div>';
  else {
    var catL = (CATS.filter(function (c) { return c[0] === SU.cat; })[0] || [0, ''])[1], curL = (CURS.filter(function (c) { return c[0] === SU.cur; })[0] || [0, SU.cur])[1];
    body = '<div id="su_prev">' + suPreview(ZTheme.build(SU.th, SU.cat)) + '</div><div>' + suRow('Business', esc(SU.name.trim()), 0) + suRow('Store link', suLink(), 0) + suRow('Category', esc(catL), 0) + suRow('WhatsApp for orders', '+' + esc(SU.cc) + ' ' + esc(SU.no.replace(/^0+/, '')), 0) + suRow('Currency', esc(curL), 0) +
      suRow('About', esc(SU.desc.trim() || 'Not added'), 1) + suRow('Instagram', esc(SU.ig ? '@' + SU.ig : 'Not added'), 1) + suRow('Area', esc(SU.addr.trim() || 'Not added'), 1) + suRow('Look', esc(SU.th.preset ? (ZTheme.PRESETS.filter(function (p) { return p.id === SU.th.preset; })[0] || {}).name : 'Custom colour') + ', ' + SU.th.mode, 2) + '</div>' +
      '<p class="hint" style="margin:0">Your store stays private until you add a product and tap Publish.</p>';
  }
  var nav = '<div class="btn-row" style="margin-top:14px">' + (n ? '<button class="btn btn-grow" data-act="su-back">Back</button>' : '') + '<button class="btn btn-gold btn-grow" data-act="' + (n === 3 ? 'su-create' : 'su-next') + '">' + (n === 3 ? 'Create store' : 'Next') + '</button></div>';
  setTimeout(function () { if (SU && SU.step === 2) suPrevRefresh(); }, 0);
  return '<div class="screen">' + H.bar('Set up your store', { back: false }) + suStepper(n) + '<div class="card" style="display:flex;flex-direction:column;gap:12px">' + body + '<div class="err" id="s_err" role="alert"></div></div>' + nav +
    (n === 0 ? '<p class="hint" style="text-align:center;margin-top:14px">Only need invoices? <button class="link-btn" data-act="go" data-to="#/billing">Open invoices</button></p>' : '') + '</div>' + H.navHTML('home');
}
function suSync(e) {
  var t = e.target, i = t && t.id; if (!SU || !i || i.indexOf('su_') !== 0) return;
  var map = { su_name: 'name', su_slug: 'slug', su_cat: 'cat', su_wa_cc: 'cc', su_wa_no: 'no', su_cur: 'cur', su_desc: 'desc', su_ig: 'ig', su_addr: 'addr' };
  if (map[i]) {
    SU[map[i]] = t.value;
    if (i === 'su_cat' && !SU.thTouched) SU.th = Object.assign(ZTheme.defaults(SU.cat), { preset: '' });
    if (i === 'su_name' || i === 'su_slug') { var lh = document.getElementById('su_linkhint'); if (lh) lh.innerHTML = suLink(); }
  }
  if (i === 'su_col') { SU.th.primary = t.value.toLowerCase(); SU.th.preset = ''; SU.thTouched = true; suPrevRefresh(); }
  if (i === 'su_hex') { var v = t.value.trim(); if (v.charAt(0) !== '#') v = '#' + v; if (/^#[0-9a-fA-F]{6}$/.test(v)) { SU.th.primary = v.toLowerCase(); SU.th.preset = ''; SU.thTouched = true; suPrevRefresh(); } }
  if (i === 'su_logo' && e.type === 'change') {
    var f = t.files && t.files[0]; t.value = ''; if (!f) return; perr('s_err', '');
    prepImage(f, 512).then(function (p) { if (SU.logo) { try { URL.revokeObjectURL(SU.logo.url); } catch (x) { } } SU.logo = p; rerender(); }).catch(function (er) { perr('s_err', er.message); });
  }
}
document.addEventListener('input', suSync); document.addEventListener('change', suSync);
ACT['su-preset'] = function (t) { var p = ZTheme.PRESETS.filter(function (x) { return x.id === t.dataset.v; })[0]; if (!p) return; SU.th = { preset: p.id, primary: p.primary, mode: p.mode, font: p.font, radius: p.radius, button: p.button }; SU.thTouched = true; rerender(); };
ACT['su-mode'] = function (t) { SU.th.mode = t.dataset.v; SU.th.preset = ''; SU.thTouched = true; rerender(); };
ACT['su-back'] = function () { if (SU && SU.step > 0) { SU.step--; rerender(); window.scrollTo(0, 0); } };
ACT['su-go'] = function (t) { SU.step = parseInt(t.dataset.s, 10) || 0; rerender(); window.scrollTo(0, 0); };
ACT['su-next'] = async function (t) {
  perr('s_err', ''); var n = SU.step;
  if (n === 0) {
    var name = SU.name.trim(); if (name.length < 2) return perr('s_err', 'Enter your business name');
    var slug = slugify(SU.slug || name); if (slug.length < 3) return perr('s_err', 'Your store link needs at least 3 letters or numbers');
    if (!getPhone('su_wa')) return perr('s_err', 'Enter a valid WhatsApp number');
    t.disabled = true;
    try { var ok = await sb().rpc('store_slug_available', { p_slug: slug }); if (ok.error) throw ok.error; if (!ok.data) { t.disabled = false; return perr('s_err', 'That store link is taken or not allowed. Try another.'); } }
    catch (e) { t.disabled = false; return perr('s_err', Z.errMsg(e)); }
    SU.slug = slug; SU.no = SU.no.replace(/\D/g, '').replace(/^0+/, '');
  }
  if (n === 1) {
    var ig = SU.ig.trim().replace(/^@/, ''); if (ig && !/^[A-Za-z0-9._]{1,30}$/.test(ig)) return perr('s_err', 'Instagram handles use only letters, numbers, dots and underscores');
    SU.ig = ig;
  }
  SU.step = n + 1; rerender(); window.scrollTo(0, 0);
};
ACT['su-create'] = async function (t) {
  t.disabled = true; perr('s_err', '');
  var wa = SU.cc + String(SU.no).replace(/\D/g, '').replace(/^0+/, '');
  try {
    var c = sb(), th = { primary: SU.th.primary, mode: SU.th.mode, font: SU.th.font, radius: SU.th.radius, button: SU.th.button }; if (SU.th.preset) th.preset = SU.th.preset;
    var ok = await c.rpc('store_slug_available', { p_slug: SU.slug }); if (ok.error) throw ok.error; if (!ok.data) throw new Error('That store link was just taken. Tap Edit next to Store link and choose another.');
    var row = { owner_id: S.user.id, name: SU.name.trim(), slug: SU.slug, category: SU.cat, whatsapp: wa, currency: SU.cur, theme: th };
    if (SU.desc.trim()) row.description = SU.desc.trim(); if (SU.ig) row.instagram = SU.ig; if (SU.addr.trim()) row.address = SU.addr.trim();
    var r = await c.from('stores').insert(row).select('id').single(); if (r.error) throw r.error;
    if (SU.logo) { try { await putLogoPrepared(SU.logo, r.data.id, null); } catch (e2) { toast('Store created, but the logo could not upload. Add it in Theme Studio.', true); } }
    if (SU.logo) { try { URL.revokeObjectURL(SU.logo.url); } catch (x) { } }
    SU = null; ST.loaded = false; await load(true); toast('Your store is ready. Add your first product.'); location.hash = '#/products';
  } catch (e) { t.disabled = false; perr('s_err', Z.errMsg(e)); }
};

function prodCard(p) {
  var im = (p.store_product_images || []).slice().sort(function (a, b) { return a.sort_order - b.sort_order; })[0];
  return '<button class="card st-pc" data-act="st-edit" data-id="' + esc(p.id) + '" style="text-align:left;padding:10px;display:flex;flex-direction:column;gap:4px"><span style="aspect-ratio:1;background:var(--surface2);border-radius:10px;overflow:hidden;display:block">' + (im ? '<img loading="lazy" decoding="async" alt="" style="width:100%;height:100%;object-fit:cover" src="' + esc(img(im.path)) + '">' : '') + '</span>' +
    '<b style="overflow-wrap:anywhere">' + esc(p.name) + '</b><span style="color:var(--gold)">' + m(p.price_minor, ST.store.currency) + '</span><span class="hint" style="margin:0">' + (p.status === 'draft' ? 'Hidden · ' : '') + p.stock_status.replace(/_/g, ' ') + '</span></button>';
}
function orderCard(o) {
  var acts = (NEXT[o.status] || []).map(function (s) { return '<button class="btn ' + (s === 'cancelled' ? '' : 'btn-gold') + ' btn-grow" data-act="st-ord" data-id="' + esc(o.id) + '" data-s="' + s + '">Mark ' + s + '</button>'; }).join('');
  return '<div class="card" style="display:flex;flex-direction:column;gap:6px"><div style="display:flex;justify-content:space-between;gap:8px"><b>' + esc(o.reference) + '</b><span class="pill">' + esc(o.status.replace(/_/g, ' ')) + '</span></div>' +
    '<span>' + m(o.total_minor, ST.store.currency) + ' · ' + esc(o.customer_name) + '</span><a class="inl" target="_blank" rel="noopener" href="https://wa.me/' + esc(o.customer_phone.replace(/\D/g, '')) + '">' + esc(o.customer_phone) + '</a>' +
    '<span class="hint" style="margin:0">' + (o.store_order_items || []).map(function (i) { return i.quantity + '× ' + esc(i.name_snapshot); }).join(', ') + '</span>' + (o.note ? '<span class="hint" style="margin:0">Note: ' + esc(o.note) + '</span>' : '') +
    (acts ? '<div class="btn-row">' + acts + '</div>' : '') + '<button class="link-btn" style="align-self:flex-start" data-act="st-inv" data-id="' + esc(o.id) + '">Create an invoice from this order</button></div>';
}

function shell(title, body, opt) { return '<div class="screen">' + H.bar(title, Object.assign({ back: false }, opt || {})) + body + '</div>'; }
function gate() {
  if (!ST.loaded) { load(); return ST.err ? H.empty('Couldn’t load your store', ST.err, '<button class="btn btn-gold" data-act="st-reload">Try again</button>') : H.skeleton(4); }
  return null;
}
function tile(n, label) { return '<div class="card" style="padding:14px;margin:0"><b style="font-size:26px;letter-spacing:-.02em">' + n + '</b><span class="hint" style="display:block;margin:2px 0 0">' + label + '</span></div>'; }
function dash() {
  var cur = ST.store.currency, now = new Date(), days = [], i;
  var good = ST.orders.filter(function (o) { return ['confirmed', 'preparing', 'ready', 'completed'].indexOf(o.status) > -1; });
  for (i = 6; i >= 0; i--) { var d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i); days.push({ d: d, v: 0 }); }
  good.forEach(function (o) { var t = new Date(o.created_at), k = Math.floor((new Date(now.getFullYear(), now.getMonth(), now.getDate()) - new Date(t.getFullYear(), t.getMonth(), t.getDate())) / 864e5); if (k >= 0 && k < 7) days[6 - k].v += o.total_minor; });
  var sales = good.reduce(function (a, o) { return a + o.total_minor; }, 0), cust = {}, cnt = ST.orders.filter(function (o) { return o.status !== 'cancelled'; }).length;
  ST.orders.forEach(function (o) { cust[o.customer_phone] = 1; });
  var mx = Math.max.apply(null, days.map(function (x) { return x.v; }).concat([1])), W = 300, H2 = 90, bw = 28, pts = days.map(function (x, k) { return [20 + k * 43.3, 80 - (x.v / mx) * 62]; });
  var line = pts.map(function (q, k) { return (k ? 'L' : 'M') + q[0].toFixed(1) + ' ' + q[1].toFixed(1); }).join(' '), area = line + ' L' + pts[6][0].toFixed(1) + ' 84 L' + pts[0][0].toFixed(1) + ' 84 Z';
  var lbl = days.map(function (x, k) { return '<text x="' + pts[k][0].toFixed(1) + '" y="98" text-anchor="middle" font-size="9" fill="var(--muted)">' + ['S', 'M', 'T', 'W', 'T', 'F', 'S'][x.d.getDay()] + '</text>'; }).join('');
  var kpi = function (n, l, sub) { return '<div class="kpi"><span class="hint" style="margin:0">' + l + '</span><b>' + n + '</b>' + (sub ? '<small>' + sub + '</small>' : '') + '</div>'; };
  var qa = function (ic, t, act, to) { return '<button class="qa" data-act="' + act + '"' + (to ? ' data-to="' + to + '"' : '') + '><span>' + ic + '</span>' + t + '</button>'; };
  return '<div class="welcome"><span class="hint" style="margin:0">Welcome back</span><b>' + esc(ST.store.name) + '</b></div>' +
    '<div class="kpis">' + kpi(m(sales, cur), 'Confirmed sales', 'orders you confirmed') + kpi(cnt, 'Orders', 'excluding cancelled') + kpi(Object.keys(cust).length, 'Customers', 'unique phone numbers') + kpi(ST.prods.filter(function (p) { return p.status === 'published'; }).length, 'Products live', '') + '</div>' +
    '<div class="card" style="padding:14px 14px 8px"><div style="display:flex;justify-content:space-between;align-items:baseline"><b>Sales, last 7 days</b><span class="hint" style="margin:0">' + (sales ? 'from your orders' : 'no sales yet') + '</span></div>' +
    '<svg viewBox="0 0 ' + W + ' 104" width="100%" role="img" aria-label="Confirmed sales over the last 7 days"><defs><linearGradient id="dg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--gold)" stop-opacity=".35"/><stop offset="1" stop-color="var(--gold)" stop-opacity="0"/></linearGradient></defs><path d="' + area + '" fill="url(#dg)"/><path d="' + line + '" fill="none" stroke="var(--gold)" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>' + pts.map(function (q) { return '<circle cx="' + q[0].toFixed(1) + '" cy="' + q[1].toFixed(1) + '" r="2.6" fill="var(--gold)"/>'; }).join('') + lbl + '</svg></div>' +
    '<div class="lbl" style="margin:4px 0 -2px">Quick actions</div><div class="qas">' + qa('＋', 'Add product', 'st-new') + qa('◐', 'Customise', 'go', '#/theme') + qa('▤', 'Quick invoice', 'qi-open') + qa('⧉', 'Copy link', 'st-copy') + '</div>';
}
SCR.shome = function () {
  var g = gate(); if (g) return shell('Home', g) + H.navHTML('home');
  var s = ST.store; if (!s) return setup();
  var live = s.status === 'published', pend = ST.orders.filter(function (o) { return o.status === 'awaiting_confirmation'; }), pub = ST.prods.filter(function (p) { return p.status === 'published'; }).length;
  var tr = ST.sub && ST.sub.status === 'trialing' && ST.sub.trial_ends_at ? 'Free trial until ' + new Date(ST.sub.trial_ends_at).toLocaleDateString() : '';
  var unpaid = (S.invoices || []).filter(function (i) { return ['sent', 'viewed', 'partial', 'overdue'].indexOf(i.status) > -1; }).length;
  var h = vidCard() + dash() + '<div class="card" style="display:flex;gap:14px;align-items:center">' + logoEl(56) + '<div style="min-width:0"><b style="font-size:19px;display:block;overflow-wrap:anywhere">' + esc(s.name) + '</b><span class="pill ' + (live ? 'paid' : '') + '">' + (live ? 'Live' : s.status === 'suspended' ? 'Suspended' : 'Not published') + '</span></div></div>' +
    '<div class="card" style="display:flex;flex-direction:column;gap:12px"><span class="lbl">Your store link</span><b style="overflow-wrap:anywhere;color:var(--gold)">' + esc(location.host + '/store/' + s.slug) + '</b>' +
    '<div class="btn-row"><a class="btn btn-grow" target="_blank" rel="noopener" href="/store/' + esc(s.slug) + '">' + (live ? 'View store' : 'Preview') + '</a>' + '<button class="btn btn-grow" data-act="st-copy">Copy link</button>' + (live ? '<button class="btn btn-gold btn-grow" data-act="st-share">Share link</button>' : s.status === 'suspended' ? '' : '<button class="btn btn-gold btn-grow" data-act="st-publish">Publish</button>') + '</div>' +
    (!live && s.status !== 'suspended' && !pub ? '<span class="hint" style="margin:0">Add at least one product, then publish.</span>' : '') + (live ? '<button class="link-btn" style="align-self:flex-start" data-act="st-unpublish">Take store offline</button>' : '') + '</div>' +
    '<button class="card" data-act="go" data-to="#/theme" style="width:100%;text-align:left;display:flex;justify-content:space-between;align-items:center;margin-top:0"><span><b>Customise your store</b><span class="hint" style="display:block;margin:2px 0 0">Theme, colours, logo and style</span></span><span style="font-size:20px">›</span></button>' +
    (pend.length ? '<button class="card" data-act="go" data-to="#/orders" style="width:100%;text-align:left;border-color:var(--gold);margin:12px 0 0"><b>' + pend.length + ' order' + (pend.length > 1 ? 's' : '') + ' to confirm</b><span class="hint" style="display:block;margin:2px 0 0">Tap to review</span></button>' : '');
  if (unpaid) h += '<button class="card" data-act="go" data-to="#/billing" style="width:100%;text-align:left;display:flex;justify-content:space-between"><span><b>' + unpaid + ' unpaid invoice' + (unpaid > 1 ? 's' : '') + '</b><span class="hint" style="display:block;margin:2px 0 0">Tap to follow up</span></span><span>›</span></button>';
  h += '<div class="lbl" style="margin:16px 0 8px">Recent orders</div>' + (ST.orders.length ? ST.orders.slice(0, 3).map(orderCard).join('') + '<button class="link-btn" data-act="go" data-to="#/orders">See all orders</button>' : '<p class="hint">No orders yet. Share your link and they will show up here.</p>');
  h += '<p class="hint" style="text-align:center;margin-top:18px">Need an invoice for a customer? <button class="link-btn" data-act="qi-open">Create one in seconds</button></p>';
  if (tr) h += '<p class="hint" style="text-align:center;margin-top:18px">' + esc(tr) + '</p>';
  return shell(s.name, h, { right: '<button class="icon-btn" data-act="st-settings" aria-label="Store settings">' + ic('user') + '</button>' }) + H.navHTML('home');
};
function gridHTML() {
  var q = (ST.q || '').toLowerCase(), list = ST.prods.filter(function (p) { return (!ST.sec || p.category === ST.sec) && (!q || (p.name + ' ' + (p.category || '')).toLowerCase().indexOf(q) > -1); });
  return list.length ? list.map(prodCard).join('') : (ST.prods.length ? '<p class="hint" style="grid-column:1/-1">No products match.</p>' : '<div class="empty-st"><span class="ico">＋</span><b>Add your first product</b><span>A photo, a name and a price is all it takes. Then publish and share your link.</span></div>');
}
SCR.sproducts = function () {
  var g = gate(); if (g) return shell('Products', g) + H.navHTML('products');
  if (!ST.store) return setup();
  var secs = sections(), chips = secs.length ? '<div class="chiprow"><button class="chip" data-act="st-sec" data-s="" aria-pressed="' + !ST.sec + '">All</button>' + secs.map(function (c) { return '<button class="chip" data-act="st-sec" data-s="' + esc(c) + '" aria-pressed="' + (ST.sec === c) + '">' + esc(c) + '</button>'; }).join('') + '</div>' : '';
  return shell('Products', '<button class="btn btn-gold btn-block" data-act="st-new">+ Add product</button>' + (ST.prods.length > 3 ? '<input class="in" id="st_q" style="margin-top:12px" placeholder="Search products" value="' + esc(ST.q || '') + '">' : '') + chips +
    '<div id="st_grid" style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-top:12px">' + gridHTML() + '</div>') + H.navHTML('products');
};
SCR.sorders = function () {
  var g = gate(); if (g) return shell('Orders', g) + H.navHTML('orders');
  if (!ST.store) return setup();
  return shell('Orders', alertCard() + (ST.orders.length ? ST.orders.map(orderCard).join('') : H.empty('No orders yet', 'When a customer orders from your store, it appears here and on your WhatsApp.', ''))) + H.navHTML('orders');
};
document.addEventListener('input', function (e) { if (e.target && e.target.id === 'st_q') { ST.q = e.target.value; var g = document.getElementById('st_grid'); if (g) g.innerHTML = gridHTML(); } });
ACT['st-sec'] = function (t) { ST.sec = t.dataset.s; rerender(); };
ACT['st-unpublish'] = async function () { try { var r = await sb().from('stores').update({ status: 'draft' }).eq('id', ST.store.id); if (r.error) throw r.error; await load(true); toast('Your store is offline'); } catch (e) { toast(Z.errMsg(e), true); } };

var PH = [], EDIT = null;
function photoBox() {
  var ex = ((EDIT && EDIT.store_product_images) || []).slice().sort(function (a, b) { return a.sort_order - b.sort_order; }), n = ex.length + PH.length;
  var cell = 'width:76px;height:76px;border-radius:10px;object-fit:cover;background:var(--surface2);display:block';
  var x = 'position:absolute;top:-7px;right:-7px;width:22px;height:22px;border-radius:99px;border:0;background:#c33;color:#fff;font-size:14px;line-height:1';
  var cells = ex.map(function (i) { return '<span style="position:relative"><img alt="" style="' + cell + '" src="' + esc(img(i.path)) + '"><button type="button" aria-label="Remove photo" data-act="st-delimg" data-id="' + esc(i.id) + '" data-path="' + esc(i.path) + '" style="' + x + '">×</button></span>'; }).join('') +
    PH.map(function (p, k) { return '<span style="position:relative"><img alt="" style="' + cell + '" src="' + esc(p.url) + '"><button type="button" aria-label="Remove photo" data-act="st-pend-rm" data-i="' + k + '" style="' + x + '">×</button></span>'; }).join('');
  var add = n < 6 ? '<label for="p_files" style="width:76px;height:76px;border:1.5px dashed var(--line);border-radius:10px;display:grid;place-items:center;text-align:center;font-size:12px;line-height:1.3;color:var(--gold);cursor:pointer;font-weight:600">+<br>Add photos</label>' : '';
  return '<div style="display:flex;gap:10px;flex-wrap:wrap;padding-top:6px">' + cells + add + '</div><span class="hint" style="margin:6px 0 0;display:block">' + n + ' of 6 photos. The first one is the cover.</span>';
}
function photoRefresh() { var e = document.getElementById('p_photos'); if (e) e.innerHTML = photoBox(); }
function photosReset() { PH.forEach(function (p) { try { URL.revokeObjectURL(p.url); } catch (e) { } }); PH = []; }
function prodForm(p) {
  p = p || {};
  return '<div style="display:flex;flex-direction:column;gap:12px">' +
    '<div class="field"><label>Photos</label><div id="p_photos">' + photoBox() + '</div><input id="p_files" type="file" accept="image/*" multiple style="position:absolute;left:-9999px;width:1px;height:1px;opacity:0"></div>' +
    '<div class="field"><label for="p_name">Name *</label><input class="in" id="p_name" maxlength="120" value="' + esc(p.name || '') + '"></div>' +
    '<div class="field"><label for="p_price">Price (' + esc(ST.store.currency) + ') *</label><input id="p_price" class="in money" type="text" inputmode="decimal" autocomplete="off" value="' + (p.price_minor != null ? Z.fmtNum(p.price_minor / 100) : '') + '"></div>' +
    '<div class="field"><label for="p_cat">Section (picked for you, change if needed)</label><input class="in" id="p_cat" maxlength="40" list="p_cats" value="' + esc(p.category || '') + '"><datalist id="p_cats">' + sections().map(function (c) { return '<option value="' + esc(c) + '">'; }).join('') + '</datalist></div>' +
    '<div class="field"><label for="p_desc">Description</label><button type="button" class="link-btn" data-act="st-suggest" style="align-self:flex-start;margin-bottom:6px">Write it for me</button><textarea class="in" id="p_desc" maxlength="1000">' + esc(p.description || '') + '</textarea></div>' +
    '<div class="two"><div class="field"><label for="p_stock">Availability</label><select class="in" id="p_stock">' + opts([['in_stock', 'In stock'], ['out_of_stock', 'Out of stock'], ['made_to_order', 'Made to order']], p.stock_status || 'in_stock') + '</select></div>' +
    '<div class="field"><label for="p_status">Visibility</label><select class="in" id="p_status">' + opts([['published', 'Shown'], ['draft', 'Hidden']], p.status || 'published') + '</select></div></div>' +
    '<div class="err" id="p_err" role="alert"></div><div class="btn-row"><button class="btn btn-gold btn-grow" data-act="st-save" data-id="' + esc(p.id || '') + '">Save product</button>' + (p.id ? '<button class="btn btn-danger" data-act="st-del" data-id="' + esc(p.id) + '">Remove</button>' : '') + '</div></div>';
}

/* ---- photo processing: tolerant of big phone photos and odd formats ---- */
function toBlob(c, type, q) { return new Promise(function (res) { try { c.toBlob(function (b) { res(b); }, type, q); } catch (e) { res(null); } }); }
function loadImg(src) { return new Promise(function (res, rej) { var im = new Image(); im.onload = function () { res(im); }; im.onerror = function () { rej(new Error('decode')); }; im.src = src; }); }
function readDataURL(file) { return new Promise(function (res, rej) { var fr = new FileReader(); fr.onload = function () { res(fr.result); }; fr.onerror = function () { rej(new Error('read')); }; fr.readAsDataURL(file); }); }
async function decodeImage(file) {
  if (window.createImageBitmap) {
    try { return await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch (e1) { }
    try { return await createImageBitmap(file); } catch (e2) { }
  }
  var u = URL.createObjectURL(file);
  try { return await loadImg(u); } catch (e3) { } finally { URL.revokeObjectURL(u); }
  try { return await loadImg(await readDataURL(file)); } catch (e4) { }
  if (window.createImageBitmap) { try { return await createImageBitmap(file, { resizeWidth: 1600, resizeQuality: 'medium' }); } catch (e5) { } }
  throw new Error('decode');
}
async function prepImage(file, max) {
  if (!file || !file.size) throw new Error('That photo is empty. If it is in Google Photos, download it to your phone first.');
  var src;
  try { src = await decodeImage(file); } catch (e) {
    if (/hei[cf]/i.test((file.type || '') + ' ' + (file.name || ''))) throw new Error('HEIC photos are not supported. Pick a JPG or PNG, or set your camera to JPG.');
    throw new Error('This photo could not be read. Try another photo, or take a screenshot of it and add that.');
  }
  var w = src.width || src.naturalWidth, h = src.height || src.naturalHeight;
  if (!w || !h) throw new Error('This photo could not be read. Try another photo.');
  var s = Math.min(1, max / Math.max(w, h)), q = 0.8, b = null;
  for (var i = 0; i < 5; i++) {
    var c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w * s)); c.height = Math.max(1, Math.round(h * s));
    var ctx = c.getContext('2d'); ctx.drawImage(src, 0, 0, c.width, c.height);
    b = await toBlob(c, 'image/webp', q);
    if (!b || b.type !== 'image/webp') { ctx.globalCompositeOperation = 'destination-over'; ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); b = await toBlob(c, 'image/jpeg', q); }
    if (b && b.size <= 900000) break;
    s *= 0.8; q = Math.max(0.5, q - 0.1);
  }
  if (src.close) { try { src.close(); } catch (e) { } }
  if (!b || b.size > 1000000) throw new Error('This photo is too large to process. Try a smaller one.');
  return { blob: b, type: b.type, ext: b.type === 'image/webp' ? 'webp' : 'jpg', url: URL.createObjectURL(b) };
}
async function putLogoPrepared(p, storeId, old) {
  var path = storeId + '/logo-' + Date.now() + '.' + p.ext, c = sb();
  var up = await c.storage.from('store-media').upload(path, p.blob, { contentType: p.type }); if (up.error) throw up.error;
  var r = await c.from('stores').update({ logo_path: path }).eq('id', storeId);
  if (r.error) { try { await c.storage.from('store-media').remove([path]); } catch (e) { } throw r.error; }
  if (old) { try { await c.storage.from('store-media').remove([old]); } catch (e) { } }
}
async function putLogo(file, storeId, old) { var p = await prepImage(file, 512); try { await putLogoPrepared(p, storeId, old); } finally { URL.revokeObjectURL(p.url); } }
document.addEventListener('change', async function (e) {
  var t = e.target; if (!t || t.id !== 'p_files') return;
  var files = Array.prototype.slice.call(t.files || []), errs = []; t.value = '';
  var room = Math.max(0, 6 - ((EDIT && EDIT.store_product_images) || []).length - PH.length);
  if (files.length > room) { errs.push(room ? 'Only ' + room + ' more photo' + (room > 1 ? 's' : '') + ' fit, so the rest were skipped.' : 'A product can have up to 6 photos.'); files = files.slice(0, room); }
  perr('p_err', ''); var sv = document.querySelector('[data-act="st-save"]'); if (sv) sv.disabled = true;
  for (var i = 0; i < files.length; i++) {
    try { var p = await prepImage(files[i], 1280); p.name = files[i].name; PH.push(p); } catch (er) { errs.push((files[i].name ? files[i].name + ': ' : '') + er.message); }
    photoRefresh();
  }
  sv = document.querySelector('[data-act="st-save"]'); if (sv) sv.disabled = false;
  if (errs.length) perr('p_err', errs.join(' '));
});
function perr(id, t) { var e = document.getElementById(id); if (e) e.textContent = t; }
var KW = [['Dresses', /dress|gown|abaya|kaftan|skirt|jumpsuit/i], ['Shoes', /shoe|sneaker|sandal|heel|slide|boot|loafer|slipper/i], ['Bags', /\bbag|purse|handbag|clutch|backpack|tote/i], ['Tops', /\btop\b|shirt|blouse|tee\b|t-shirt|hoodie|sweater|polo/i], ['Trousers', /trouser|jean|short|pant|legging/i], ['Hair', /wig|hair|weave|braid|bundle|closure|frontal/i], ['Beauty', /cream|serum|perfume|lotion|makeup|lip|soap|oil|skincare|fragrance/i], ['Jewellery', /ring|necklace|bracelet|earring|chain|jewel|watch/i], ['Phones & Gadgets', /phone|iphone|samsung|laptop|charger|earbud|airpod|speaker|cable|power ?bank/i], ['Food & Drinks', /cake|chops|rice|jollof|snack|juice|drink|bread|pastry|meal|pizza|chicken|zobo/i], ['Home', /bed|pillow|curtain|rug|kitchen|pot|plate|cup|furniture|decor/i], ['Kids', /baby|kids?|child|toy|diaper/i]];
function guessSection(n) { for (var i = 0; i < KW.length; i++) if (KW[i][1].test(n)) { var ex = sections().filter(function (c) { return c.toLowerCase() === KW[i][0].toLowerCase(); })[0]; return ex || KW[i][0]; } return ''; }
function guessDesc(n, cat, price) {
  var nm = n.trim(); if (!nm) return '';
  var tail = { Dresses: 'Well finished, comfortable to wear and made to look good on you.', Shoes: 'Comfortable, durable and neat. Check the size list or ask us for your size.', Bags: 'Roomy, sturdy and stylish for everyday use.', Hair: 'Soft, full and easy to style. Ask us about length and colour.', Beauty: 'Gentle on the skin and made for daily use.', Food: 'Freshly made. Order early for same-day delivery.' };
  var k = Object.keys(tail).filter(function (x) { return (cat || '').indexOf(x) === 0; })[0];
  return nm + ' — quality you can trust. ' + (k ? tail[k] : 'Carefully selected and ready to order.') + ' Message us on WhatsApp to order or ask any question.';
}
function sections() { var o = {}; ST.prods.forEach(function (p) { if (p.category) o[p.category] = 1; }); return Object.keys(o); }
function byId(id) { return ST.prods.filter(function (p) { return p.id === id; })[0]; }

ACT['st-reload'] = function () { ST.loaded = false; load(); };
function vidCard() { return '<button class="card" data-act="st-guide" style="width:100%;text-align:left;display:flex;gap:12px;align-items:center;margin-top:0;border-color:var(--gold)"><span style="width:44px;height:44px;border-radius:99px;background:var(--gold);color:#000;display:grid;place-items:center;font-size:20px;flex:none">☰</span><span><b>Quick guide</b><span class="hint" style="display:block;margin:2px 0 0">8 pictures. Swipe through in one minute</span></span></button>'; }
var GUIDE = [['Start here', 'Type your store name and your WhatsApp number. Pick what you sell. Tap Next.'], ['Tell people about you', 'Add one short line about your business. This shows on your store.'], ['Your dashboard', 'See sales, orders and customers. Quick buttons sit right under.'], ['Add a product', 'Add a photo, a name and a price. The section and description fill in by themselves.'], ['Make it yours', 'Pick a colour and a font that fits your logo, then save.'], ['Publish', 'Tap Publish. We check everything first, then your store goes live.'], ['Orders', 'When a customer orders, it shows here and you get an alert.'], ['Quick invoice', 'Type the name, what it is for and the amount. Tap Create & share.']];
ACT['st-guide'] = function () {
  var slides = GUIDE.map(function (g, i) { return '<div style="flex:0 0 100%;scroll-snap-align:center;display:flex;flex-direction:column;align-items:center;gap:10px;padding:0 2px"><img src="/guide/' + (i + 1) + '.jpg" alt="' + esc(g[0]) + '" loading="' + (i < 2 ? 'eager' : 'lazy') + '" style="width:100%;max-height:52vh;object-fit:contain;border-radius:14px;border:1px solid var(--line);background:#000"><b style="font-size:18px">' + (i + 1) + '. ' + esc(g[0]) + '</b><span style="color:var(--muted);text-align:center;max-width:320px">' + esc(g[1]) + '</span></div>'; }).join('');
  Z.openSheet('Quick guide', '<div id="gd" class="noswipe" style="display:flex;overflow-x:auto;scroll-snap-type:x mandatory;gap:12px;-webkit-overflow-scrolling:touch;scrollbar-width:none">' + slides + '</div><div id="gd_dots" style="display:flex;justify-content:center;gap:6px">' + GUIDE.map(function (g, i) { return '<span style="width:' + (i ? 7 : 18) + 'px;height:7px;border-radius:9px;background:' + (i ? 'var(--line)' : 'var(--gold)') + ';transition:all .2s"></span>'; }).join('') + '</div><div class="btn-row"><button class="btn btn-grow" data-act="gd-prev">Back</button><button class="btn btn-gold btn-grow" data-act="gd-next">Next</button></div>');
  var gd = document.getElementById('gd'); if (!gd) return;
  gd.addEventListener('scroll', function () { var k = Math.round(gd.scrollLeft / gd.clientWidth), d = document.querySelectorAll('#gd_dots span'); Array.prototype.forEach.call(d, function (x, n) { x.style.width = n === k ? '18px' : '7px'; x.style.background = n === k ? 'var(--gold)' : 'var(--line)'; }); var nb = document.querySelector('[data-act=gd-next]'); if (nb) nb.textContent = k >= GUIDE.length - 1 ? 'Done' : 'Next'; }, { passive: true });
  try { localStorage.setItem('zs_vid', '1'); } catch (e) { }
};
ACT['gd-next'] = function () { var gd = document.getElementById('gd'); if (!gd) return; var k = Math.round(gd.scrollLeft / gd.clientWidth); if (k >= GUIDE.length - 1) Z.closeSheet(); else gd.scrollTo({ left: (k + 1) * gd.clientWidth, behavior: 'smooth' }); };
ACT['gd-prev'] = function () { var gd = document.getElementById('gd'); if (!gd) return; var k = Math.round(gd.scrollLeft / gd.clientWidth); gd.scrollTo({ left: Math.max(0, k - 1) * gd.clientWidth, behavior: 'smooth' }); };
ACT['st-copy'] = function () { var u = link(ST.store); function ok() { toast('Link copied'); } function fb() { var i = document.createElement('input'); i.value = u; document.body.appendChild(i); i.select(); try { document.execCommand('copy'); ok(); } catch (e) { toast(u); } i.remove(); } if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(u).then(ok, fb); else fb(); };
ACT['st-share'] = function () { window.open('https://wa.me/?text=' + encodeURIComponent('Shop ' + ST.store.name + ' here: ' + link(ST.store)), '_blank'); };
ACT['st-new'] = function () { photosReset(); EDIT = { store_product_images: [] }; Z.openSheet('New product', prodForm()); };
ACT['st-edit'] = function (t) { var p = byId(t.dataset.id); if (!p) return; photosReset(); EDIT = Object.assign({}, p, { store_product_images: (p.store_product_images || []).slice() }); Z.openSheet('Edit product', prodForm(EDIT)); };
ACT['st-pend-rm'] = function (t) { var p = PH.splice(parseInt(t.dataset.i, 10), 1)[0]; if (p) { try { URL.revokeObjectURL(p.url); } catch (e) { } } photoRefresh(); };
ACT['st-suggest'] = function () { var n = val('p_name'); if (!n) return perr('p_err', 'Type the product name first'); perr('p_err', ''); var d = document.getElementById('p_desc'); d.value = guessDesc(n, val('p_cat'), 0); d.dataset.auto = '1'; };
document.addEventListener('input', function (e) {
  var t = e.target; if (!t) return;
  if (t.id === 'p_cat') { t.dataset.touched = '1'; return; }
  if (t.id === 'p_desc') { t.dataset.auto = ''; return; }
  if (t.id !== 'p_name') return;
  var c = document.getElementById('p_cat'), d = document.getElementById('p_desc');
  if (c && !c.dataset.touched && (!c.value || c.dataset.auto)) { var g = guessSection(t.value); c.value = g; c.dataset.auto = g ? '1' : ''; }
  if (d && (!d.value || d.dataset.auto) && !d.dataset.off && t.value.trim().length > 2) { d.value = guessDesc(t.value, c ? c.value : '', 0); d.dataset.auto = '1'; }
});
ACT['st-save'] = async function (t) {
  if (t.disabled || t.dataset.busy) return; t.dataset.busy = '1';
  var id = t.dataset.id, name = val('p_name'), price = Z.num(val('p_price'));
  if (!name) { delete t.dataset.busy; return perr('p_err', 'Enter a product name'); } if (!(price >= 0) || price > 1e9) { delete t.dataset.busy; return perr('p_err', 'Enter a valid price'); }
  t.disabled = true; t.textContent = 'Saving…'; perr('p_err', '');
  try {
    var c = sb(), row = { name: name, description: val('p_desc'), category: val('p_cat') || null, price_minor: Math.round(price * 100), stock_status: val('p_stock'), status: val('p_status') }, pid = id;
    if (id) { var u = await c.from('store_products').update(row).eq('id', id); if (u.error) throw u.error; }
    else { row.store_id = ST.store.id; row.slug = slugify(name) + '-' + Math.random().toString(36).slice(2, 6); var n = await c.from('store_products').insert(row).select('id').single(); if (n.error) throw n.error; pid = n.data.id; t.dataset.id = pid; EDIT.id = pid; }
    var pos = (EDIT.store_product_images || []).length;
    while (PH.length) {
      var ph = PH[0], path = ST.store.id + '/' + pid + '/' + Date.now() + '-' + pos + '.' + ph.ext;
      var up = await c.storage.from('store-media').upload(path, ph.blob, { contentType: ph.type }); if (up.error) throw up.error;
      var ins = await c.from('store_product_images').insert({ product_id: pid, store_id: ST.store.id, path: path, sort_order: pos }).select('id,path,sort_order').single();
      if (ins.error) { try { await c.storage.from('store-media').remove([path]); } catch (e) { } throw ins.error; }
      EDIT.store_product_images.push(ins.data); PH.shift(); pos++; try { URL.revokeObjectURL(ph.url); } catch (e) { }
    }
    Z.closeSheet(); await load(true); toast('Product saved');
  } catch (e) { delete t.dataset.busy; t.disabled = false; t.textContent = 'Save product'; photoRefresh(); perr('p_err', 'Could not save everything: ' + Z.errMsg(e) + ' Tap Save again to retry.'); }
};
ACT['st-delimg'] = async function (t) {
  try {
    var c = sb(); var r = await c.from('store_product_images').delete().eq('id', t.dataset.id); if (r.error) throw r.error;
    try { await c.storage.from('store-media').remove([t.dataset.path]); } catch (e) { }
    if (EDIT) EDIT.store_product_images = (EDIT.store_product_images || []).filter(function (i) { return i.id !== t.dataset.id; });
    photoRefresh(); load(true); toast('Photo removed');
  } catch (e) { toast(Z.errMsg(e), true); }
};
ACT['st-del'] = function (t) { var p = byId(t.dataset.id); Z.openSheet('Remove this product?', '<p style="margin:0;color:var(--muted)">“' + esc(p ? p.name : 'This product') + '” will disappear from your store. Past orders keep their record.</p><div class="btn-row"><button class="btn btn-grow" data-act="sheet-close">Keep it</button><button class="btn btn-danger btn-grow" data-act="st-del-yes" data-id="' + esc(t.dataset.id) + '">Remove</button></div>'); };
ACT['st-del-yes'] = async function (t) { if (t.disabled) return; t.disabled = true; try { var r = await sb().from('store_products').update({ status: 'archived' }).eq('id', t.dataset.id); if (r.error) throw r.error; Z.closeSheet(); await load(true); toast('Product removed'); } catch (e) { t.disabled = false; toast(Z.errMsg(e), true); } };
ACT['st-ord'] = async function (t) { try { var r = await sb().rpc('set_store_order_status', { p_order: t.dataset.id, p_status: t.dataset.s }); if (r.error) throw r.error; await load(true); toast('Order updated'); } catch (e) { toast(Z.errMsg(e), true); } };
var PUBBUSY = false;
function readiness() {
  var st = ST.store, live = ST.prods.filter(function (p) { return p.status === 'published'; }), block = [], tips = [];
  if (!st.name || st.name.trim().length < 2) block.push('Add your store name (Customise your store, then Edit store name).');
  if (!st.whatsapp || !/^[0-9]{8,15}$/.test(String(st.whatsapp).replace(/\D/g, ''))) block.push('Add a valid WhatsApp number so customers can reach you.');
  if (!live.length) block.push('Add at least one product and set it to Shown.');
  live.forEach(function (p) { if (!(p.price_minor >= 0)) block.push('“' + p.name + '” needs a valid price.'); });
  var nop = live.filter(function (p) { return !(p.store_product_images || []).length; }).length;
  if (nop) tips.push(nop + ' product' + (nop > 1 ? 's have' : ' has') + ' no photo. Photos help sell.');
  if (!st.logo_path) tips.push('Add your logo in Theme Studio so your store looks like your brand.');
  if (!st.description) tips.push('Add a short “about” line so customers know who you are.');
  return { block: block, tips: tips };
}
async function doPublish() {
  if (PUBBUSY) return; PUBBUSY = true;
  try { var r = await sb().from('stores').update({ status: 'published' }).eq('id', ST.store.id).select('status').single(); if (r.error) throw r.error; if (!r.data || r.data.status !== 'published') throw new Error('Publishing did not complete'); Z.closeSheet(); await load(true); toast('Your store is live'); }
  catch (e) { toast('Could not publish: ' + Z.errMsg(e), true); } finally { PUBBUSY = false; }
}
ACT['st-publish'] = function () {
  var rd = readiness(), li = function (x, c) { return '<div style="display:flex;gap:10px;align-items:flex-start"><span style="color:' + c + ';font-weight:700">' + (c === 'var(--ruby)' ? '✕' : '•') + '</span><span>' + esc(x) + '</span></div>'; };
  if (rd.block.length) { Z.openSheet('Almost ready', '<p style="margin:0;color:var(--muted)">Fix these before you publish:</p>' + rd.block.map(function (x) { return li(x, 'var(--ruby)'); }).join('') + '<button class="btn btn-gold btn-block" data-act="sheet-close">Okay</button>'); return; }
  if (rd.tips.length) { Z.openSheet('Ready to publish', '<p style="margin:0;color:var(--muted)">Nothing is blocking you. A few tips to make it better:</p>' + rd.tips.map(function (x) { return li(x, 'var(--gold)'); }).join('') + '<div class="btn-row"><button class="btn btn-grow" data-act="sheet-close">Fix first</button><button class="btn btn-gold btn-grow" data-act="st-publish-go">Publish now</button></div>'); return; }
  doPublish();
};
ACT['st-publish-go'] = function () { doPublish(); };
ACT['st-settings'] = function () {
  var s = ST.store; if (!s) { location.hash = '#/home'; return; }
  Z.openSheet('Store settings', '<div style="display:flex;flex-direction:column;gap:12px">' +
    '<div style="display:flex;gap:12px;align-items:center">' + logoEl(56) + '<div class="field" style="flex:1"><label for="e_logo">Store logo</label><input class="in" id="e_logo" type="file" accept="image/*"></div></div>' +
    '<div class="field"><label for="e_name">Store name</label><input class="in" id="e_name" maxlength="60" value="' + esc(s.name) + '"></div>' +
    '<div class="field"><label for="e_desc">About</label><textarea class="in" id="e_desc" maxlength="500">' + esc(s.description || '') + '</textarea></div>' +
    phoneField('e_wa', 'WhatsApp number for orders', s.whatsapp) +
    '<div class="field"><label for="e_ig">Instagram</label><input class="in" id="e_ig" maxlength="40" value="' + esc(s.instagram || '') + '"></div>' +
    '<div class="field"><label for="e_addr">Area / address</label><input class="in" id="e_addr" maxlength="200" value="' + esc(s.address || '') + '"></div>' +
    '<div class="err" id="e_err" role="alert"></div><button class="btn btn-gold btn-block" data-act="st-saveset">Save</button></div>');
};
ACT['st-saveset'] = async function (t) {
  var wa = getPhone('e_wa'); if (!wa) return perr('e_err', 'Enter a valid WhatsApp number'); t.disabled = true;
  try { var lf = document.getElementById('e_logo').files[0]; if (lf) await putLogo(lf, ST.store.id, ST.store.logo_path);
    var r = await sb().from('stores').update({ name: val('e_name'), description: val('e_desc'), whatsapp: wa, instagram: val('e_ig'), address: val('e_addr') }).eq('id', ST.store.id); if (r.error) throw r.error; Z.closeSheet(); await load(true); toast('Saved'); }
  catch (e) { t.disabled = false; perr('e_err', Z.errMsg(e)); }
};
if (S.user && S.loaded) rerender();
/*TS*/
/* ---------------- Theme Studio ---------------- */
var TS = null, TSV = 'mobile';
function tsDirty() { if (!TS || !ST.store) return false; var b = ZTheme.normalize(ST.store.theme, ST.store.category), k = ['primary', 'mode', 'font', 'radius', 'button']; return k.some(function (x) { return String(TS[x]) !== String(b[x]); }); }
function tsState() { var d = tsDirty(); return '<span class="pill ' + (d ? '' : 'paid') + '">' + (d ? 'Unsaved changes' : 'Saved') + '</span>'; }
function tsInit() { var st = ST.store; TS = ZTheme.normalize(st.theme, st.category); TS.preset = (st.theme && st.theme.preset) || ''; }
function styleStr(tk) { var v = ZTheme.cssVars(tk); return Object.keys(v).map(function (k) { return k + ':' + v[k]; }).join(';'); }
function tsPreviewHTML(tk) {
  var st = ST.store, ps = ST.prods.filter(function (p) { return p.status === 'published'; }).slice(0, 2), btn = tk.button === 'outline' ? 'background:transparent;color:var(--acc);border:2px solid var(--acc)' : 'background:var(--acc);color:var(--onacc);border:2px solid var(--acc)';
  var logo = st.logo_path ? '<img alt="" src="' + esc(img(st.logo_path)) + '" style="width:40px;height:40px;object-fit:cover;border-radius:calc(var(--r) - 4px)">' : '<span style="width:40px;height:40px;border-radius:calc(var(--r) - 4px);background:var(--acc);color:var(--onacc);display:grid;place-items:center;font-weight:800">' + esc(st.name.charAt(0).toUpperCase()) + '</span>';
  var desk = TSV === 'desktop'; if (desk) ps = ST.prods.filter(function (p) { return p.status === 'published'; }).slice(0, 4);
  function tile(p) { var im = p && (p.store_product_images || [])[0]; return '<div style="flex:1;min-width:0"><div style="aspect-ratio:4/5;background:var(--surface);border:1px solid var(--line);border-radius:var(--r);overflow:hidden">' + (im ? '<img alt="" style="width:100%;height:100%;object-fit:cover" src="' + esc(img(im.path)) + '">' : '') + '</div><div style="font-size:12px;margin-top:5px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + (p ? esc(p.name) : 'Your product') + '</div><div style="font-size:12px;color:var(--acc);font-weight:700">' + (p ? m(p.price_minor, st.currency) : '') + '</div></div>'; }
  return '<div style="' + styleStr(tk) + ';background:var(--bg);color:var(--tx);font-family:var(--font);border:1px solid var(--line);border-radius:18px;padding:' + (desk ? '22px;min-width:620px;font-size:15px' : '16px') + ';display:flex;flex-direction:column;gap:12px"><div style="display:flex;gap:10px;align-items:center">' + logo + '<b style="font-size:17px;letter-spacing:-.02em">' + esc(st.name) + '</b></div>' +
    '<div style="color:var(--mut);font-size:13px">' + esc(st.description || 'Your products, your brand.') + '</div><div style="display:flex;gap:10px">' + (desk ? [0, 1, 2, 3].map(function (k) { return tile(ps[k]); }).join('') : tile(ps[0]) + tile(ps[1])) + '</div>' +
    '<div style="' + btn + ';border-radius:var(--rb);padding:11px;text-align:center;font-weight:700;font-size:14px">Add to order</div></div>';
}
function tsRefresh() {
  var tk = ZTheme.build(TS, ST.store.category), pv = document.getElementById('ts_prev'); if (!pv) return;
  pv.innerHTML = tsPreviewHTML(tk); var sp = document.getElementById('ts_state'); if (sp) sp.innerHTML = tsState();
  var w = document.getElementById('ts_warn'); if (w) w.innerHTML = tk.notes.length ? tk.notes.map(function (n) { return '<div class="hint" style="margin:0;color:var(--gold)">• ' + esc(n) + '</div>'; }).join('') : '<div class="hint" style="margin:0">✓ Text and buttons are easy to read (contrast ' + tk.contrast.text + ':1).</div>';
  var hx = document.getElementById('ts_hex'), co = document.getElementById('ts_col'); if (hx && document.activeElement !== hx) hx.value = TS.primary; if (co) co.value = TS.primary;
  Array.prototype.forEach.call(document.querySelectorAll('[data-ts]'), function (b) { var k = b.dataset.ts, v = b.dataset.v; b.setAttribute('aria-pressed', String(k === 'preset' ? TS.preset === v : TS[k] === v)); });
}
function seg(key, items) { return '<div class="seg" style="grid-template-columns:repeat(' + items.length + ',1fr)">' + items.map(function (i) { return '<button type="button" data-act="ts-set" data-ts="' + key + '" data-v="' + i[0] + '" aria-pressed="' + (TS[key] === i[0]) + '">' + i[1] + '</button>'; }).join('') + '</div>'; }
SCR.theme = function () {
  var g = gate(); if (g) return shell('Theme Studio', g, { back: true }) + H.navHTML('home');
  if (!ST.store) return setup();
  if (!TS) tsInit();
  var tk = ZTheme.build(TS, ST.store.category), st = ST.store;
  return '<div class="screen">' + H.bar('Theme Studio') + '<p class="hint" style="margin:0 0 12px">Pick a look. Your whole store updates to match. Nothing is live until you save.</p><button class="link-btn" data-act="st-settings" style="margin:-6px 0 8px">Edit store name, WhatsApp, about and address</button>' +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><div class="seg" style="width:190px"><button type="button" data-act="ts-view" data-v="mobile" aria-pressed="' + (TSV === 'mobile') + '">Mobile</button><button type="button" data-act="ts-view" data-v="desktop" aria-pressed="' + (TSV === 'desktop') + '">Desktop</button></div><span id="ts_state">' + tsState() + '</span></div>' +
    '<div id="ts_prev" style="' + (TSV === 'desktop' ? 'overflow-x:auto' : '') + '">' + tsPreviewHTML(tk) + '</div>' +
    '<div class="card" style="display:flex;flex-direction:column;gap:12px;margin-top:12px"><span class="lbl">Quick look</span><div class="chiprow">' + ZTheme.PRESETS.map(function (p) { return '<button class="chip" data-act="ts-preset" data-ts="preset" data-v="' + p.id + '" aria-pressed="' + (TS.preset === p.id) + '"><span style="display:inline-block;width:10px;height:10px;border-radius:99px;background:' + p.primary + ';margin-right:6px"></span>' + p.name + '</button>'; }).join('') + '</div>' +
    '<div class="field"><label for="ts_hex">Main colour</label><div style="display:grid;grid-template-columns:56px 1fr;gap:8px"><input class="in" id="ts_col" type="color" value="' + TS.primary + '" style="padding:4px;height:46px"><input class="in" id="ts_hex" maxlength="7" value="' + TS.primary + '" placeholder="#10B981" autocapitalize="off" spellcheck="false"></div><span class="hint" style="margin:0">Pick one colour. The rest of the palette is built for you.</span></div>' +
    '<div class="field"><label>Mode</label>' + seg('mode', [['dark', 'Dark'], ['light', 'Light']]) + '</div><div id="ts_warn"></div></div>' +
    '<div class="card" style="display:flex;gap:12px;align-items:center">' + logoEl(52) + '<div style="flex:1;min-width:0" class="field"><label for="ts_logo">Store logo</label><input class="in" id="ts_logo" type="file" accept="image/*"></div>' + (st.logo_path ? '<button class="btn" data-act="ts-logo-rm" type="button">Remove</button>' : '') + '</div>' +
    '<details class="card" style="padding:14px"><summary style="cursor:pointer;font-weight:600">Advanced: fonts, corners, buttons</summary><div style="display:flex;flex-direction:column;gap:12px;margin-top:12px">' +
    '<div class="field"><label>Font style</label>' + seg('font', [['modern', 'Modern'], ['classic', 'Classic'], ['friendly', 'Friendly']]) + '<select class="in" id="ts_fontsel" style="margin-top:8px" aria-label="More fonts"><option value="">More fonts (' + fontCount() + ' to choose from)…</option>' + Object.keys(ZTheme.GF).map(function (g) { return '<optgroup label="' + esc(g) + '">' + ZTheme.GF[g].map(function (n) { return '<option value="g:' + esc(n) + '"' + (TS.font === 'g:' + n ? ' selected' : '') + '>' + esc(n) + '</option>'; }).join('') + '</optgroup>'; }).join('') + '</select>' +
      '<div style="display:grid;grid-template-columns:1fr auto;gap:8px;margin-top:8px"><input class="in" id="ts_fontin" maxlength="40" placeholder="Or type any Google Font name" value="' + esc(/^g:/.test(TS.font) && !fontInList(TS.font) ? TS.font.slice(2) : '') + '" autocapitalize="words" spellcheck="false"><button type="button" class="btn" data-act="ts-fontgo">Use</button></div><span class="hint" style="margin:0">Pick one that matches your logo. Any name from fonts.google.com works, about 1,500 fonts.</span></div>' +
    '<div class="field"><label>Corners</label>' + seg('radius', [['sharp', 'Sharp'], ['soft', 'Soft'], ['round', 'Round']]) + '</div>' +
    '<div class="field"><label>Buttons</label>' + seg('button', [['solid', 'Solid'], ['outline', 'Outline']]) + '</div></div></details>' +
    '<div class="err" id="ts_err" role="alert"></div><div class="btn-row" style="margin-top:6px"><button class="btn btn-grow" data-act="ts-reset">Reset</button><button class="btn btn-gold btn-grow" data-act="ts-save">Save theme</button></div>' +
    '<p class="hint" style="text-align:center;margin-top:10px">Saved themes apply to your public store ' + (st.status === 'published' ? 'straight away.' : 'once you publish.') + '</p></div>' + H.navHTML('home');
};
function fontCount() { return Object.keys(ZTheme.GF).reduce(function (a, g) { return a + ZTheme.GF[g].length; }, 3); }
function fontInList(f) { return Object.keys(ZTheme.GF).some(function (g) { return ZTheme.GF[g].indexOf(f.slice(2)) > -1; }); }
function tsFont(v) { if (!ZTheme.validFont(v)) { toast('Use letters and numbers only for a font name', true); return; } TS.font = v; ZTheme.loadFont(v); tsRefresh(); }
ACT['ts-fontgo'] = function () { var n = (document.getElementById('ts_fontin').value || '').trim().replace(/\s+/g, ' '); if (!n) return; tsFont('g:' + n.replace(/\b\w/g, function (c) { return c.toUpperCase(); })); };
document.addEventListener('change', function (e) { if (e.target && e.target.id === 'ts_fontsel' && e.target.value) tsFont(e.target.value); });
ACT['ts-set'] = function (t) { TS[t.dataset.ts] = t.dataset.v; if (t.dataset.ts !== 'preset') TS.preset = TS.preset; tsRefresh(); };
ACT['ts-preset'] = function (t) { var p = ZTheme.PRESETS.filter(function (x) { return x.id === t.dataset.v; })[0]; if (!p) return; TS = { preset: p.id, primary: p.primary, mode: p.mode, font: p.font, radius: p.radius, button: p.button }; rerender(); };
ACT['ts-reset'] = function () { TS = null; tsInit(); TS = Object.assign(ZTheme.defaults(ST.store.category), { preset: '' }); rerender(); toast('Back to your category look. Tap Save to apply.'); };
ACT['ts-view'] = function (t) { TSV = t.dataset.v; rerender(); };
ACT['ts-save'] = async function (t) {
  t.disabled = true; perr('ts_err', '');
  try {
    var c = sb(), lf = document.getElementById('ts_logo').files[0]; if (lf) await putLogo(lf, ST.store.id, ST.store.logo_path);
    var th = { primary: TS.primary, mode: TS.mode, font: TS.font, radius: TS.radius, button: TS.button }; if (TS.preset) th.preset = TS.preset;
    var r = await c.from('stores').update({ theme: th }).eq('id', ST.store.id); if (r.error) throw r.error;
    TS = null; await load(true); toast('Theme saved');
  } catch (e) { t.disabled = false; perr('ts_err', Z.errMsg(e)); }
};
ACT['ts-logo-rm'] = async function () { try { var old = ST.store.logo_path; var r = await sb().from('stores').update({ logo_path: null }).eq('id', ST.store.id); if (r.error) throw r.error; if (old) await sb().storage.from('store-media').remove([old]); await load(true); toast('Logo removed'); } catch (e) { toast(Z.errMsg(e), true); } };
document.addEventListener('input', function (e) {
  var i = e.target && e.target.id; if (!TS || !ST.store) return;
  if (i === 'ts_col') { TS.primary = e.target.value; TS.preset = ''; tsRefresh(); }
  if (i === 'ts_hex') { var v = e.target.value.trim(); if (v.charAt(0) !== '#') v = '#' + v; if (/^#[0-9a-fA-F]{6}$/.test(v)) { TS.primary = v.toLowerCase(); TS.preset = ''; tsRefresh(); } }
  if (i === 'ts_logo' && e.target.files[0]) { var f = e.target.files[0], u = URL.createObjectURL(f); ST.store._previewLogo = u; }
});

Z.storeReset = function () { TS = null; SU = null; ST = { loaded: false, loading: false, store: null, sub: null, prods: [], orders: [], q: '', sec: '', err: '' }; };
/* ---- order alerts: only for real new orders ---- */
var NT = { seen: null, on: false }, AUTOVID = false;
setInterval(function () { if (AUTOVID || !S.user || !ST.loaded || /^#\/(new|edit|inv|theme)/.test(location.hash)) return; var seen = false; try { seen = localStorage.getItem('zs_vid'); } catch (e) { } if (!ST.store) return; AUTOVID = true; if (!seen && !document.querySelector('#scrim.on')) setTimeout(function () { ACT['st-guide'](); }, 1200); }, 2500);
function canNotify() { return 'Notification' in window; }
function alertCard() {
  if (!canNotify()) return '';
  if (Notification.permission === 'granted') return '<p class="hint" style="margin:0 0 10px">Order alerts are on while Zyron Studio is open.</p>';
  if (Notification.permission === 'denied') return '';
  return '<button class="card" data-act="st-alerts" style="width:100%;text-align:left;margin-top:0"><b>Get an alert for new orders</b><span class="hint" style="display:block;margin:2px 0 0">We only notify you when a customer places an order.</span></button>';
}
ACT['st-inv'] = function (t) { var o = ST.orders.filter(function (x) { return x.id === t.dataset.id; })[0]; if (!o) return; window.ZPRE = { cur: ST.store.currency, notes: 'Order ' + o.reference + ' · ' + o.customer_name + ' · ' + o.customer_phone, items: (o.store_order_items || []).map(function (i) { return { d: i.name_snapshot, q: String(i.quantity), p: String(i.unit_price_minor / 100) }; }) }; Z.go ? Z.go('#/new') : (location.hash = '#/new'); };
ACT['st-alerts'] = async function () { try { var r = await Notification.requestPermission(); toast(r === 'granted' ? 'Order alerts on' : 'Alerts not allowed'); } catch (e) { } rerender(); };
async function pollOrders() {
  if (!S.user || !ST.store || document.visibilityState !== 'visible') return;
  try {
    var r = await sb().from('store_orders').select('id,reference,total_minor,currency,customer_name,created_at').eq('store_id', ST.store.id).order('created_at', { ascending: false }).limit(20);
    if (r.error || !r.data) return;
    var ids = r.data.map(function (o) { return o.id; });
    if (NT.seen === null) { NT.seen = ids; return; }
    var fresh = r.data.filter(function (o) { return NT.seen.indexOf(o.id) < 0; });
    NT.seen = ids;
    if (fresh.length) {
      var o = fresh[0], msg = 'New order ' + o.reference + ' — ' + (o.customer_name || 'customer') + ', ' + m(o.total_minor, o.currency);
      toast(fresh.length > 1 ? fresh.length + ' new orders' : msg);
      try { if (canNotify() && Notification.permission === 'granted') new Notification('Zyron Studio', { body: msg, icon: '/icon-192.png' }); } catch (e) { }
      await load(true); var ae = document.activeElement; if (!ae || !/INPUT|TEXTAREA|SELECT/.test(ae.tagName)) rerender();
    }
  } catch (e) { }
}
setInterval(pollOrders, 45000);
document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') pollOrders(); });

/* ---- feedback: stored in the database, emailed by the server ---- */
var FB = { r: 0 };
function fbStars() { var h = ''; for (var i = 1; i <= 5; i++) h += '<button type="button" data-act="fb-star" data-v="' + i + '" aria-label="' + i + ' star' + (i > 1 ? 's' : '') + '" style="background:none;border:0;font-size:34px;line-height:1;padding:4px;color:' + (i <= FB.r ? 'var(--gold-a)' : 'var(--line)') + '">★</button>'; return h; }
ACT['fb-open'] = function () { FB.r = 0; Z.openSheet('Give feedback', '<p style="margin:0;color:var(--muted)">How is Zyron Studio working for you? Your message goes straight to the team.</p><div id="fb_stars" style="display:flex;justify-content:center">' + fbStars() + '</div><div class="field"><label for="fb_msg">What should we improve? (optional)</label><textarea class="in" id="fb_msg" maxlength="1000" placeholder="Tell us anything: what you like, what confused you, what is missing"></textarea></div><div class="err" id="fb_err" role="alert"></div><button class="btn btn-gold btn-block" data-act="fb-send">Send feedback</button>'); };
ACT['fb-star'] = function (t) { FB.r = parseInt(t.dataset.v, 10); var e = document.getElementById('fb_stars'); if (e) e.innerHTML = fbStars(); };
ACT['fb-send'] = async function (t) {
  if (t.disabled) return; if (!FB.r) return perr('fb_err', 'Tap a star to rate us first.'); perr('fb_err', '');
  t.disabled = true; t.textContent = 'Sending…';
  try {
    var r = await sb().functions.invoke('submit-feedback', { body: { rating: FB.r, message: val('fb_msg') } });
    if (r.error) { var m2 = ''; try { var j = await r.error.context.json(); m2 = j.error; } catch (e) { } throw new Error(m2 || 'Could not send. Check your connection and try again.'); }
    if (!r.data || !r.data.ok) throw new Error((r.data && r.data.error) || 'Could not send.');
    Z.closeSheet(); toast('Thank you! Your feedback was sent');
  } catch (e) { t.disabled = false; t.textContent = 'Send feedback'; perr('fb_err', e.message); }
};
})();
