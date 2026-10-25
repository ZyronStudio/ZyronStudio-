/* Zyron Store: the online store lives inside the same app, same login, same look. */
(function () {
'use strict';
var Z = window.Z, S = Z.S, esc = Z.esc, ic = Z.ic, SCR = Z.SCR, H = Z.helpers, toast = Z.toast, ACT = window.ZA.ACT;
var SB_URL = 'https://tnjgkxdjejjvujtteyfx.supabase.co';
var CATS = [['fashion', 'Fashion'], ['shoes_accessories', 'Shoes & accessories'], ['beauty_wigs', 'Beauty & wigs'], ['perfume_cosmetics', 'Perfume & cosmetics'], ['electronics', 'Electronics'], ['general', 'General']];
var CURS = [['NGN', '₦ Nigerian Naira (NGN)'], ['USD', '$ US Dollar (USD)'], ['GBP', '£ British Pound (GBP)'], ['EUR', '€ Euro (EUR)'], ['CAD', '$ Canadian Dollar (CAD)'], ['AUD', '$ Australian Dollar (AUD)']];
var ACC = { fashion: '#e7c4b0', shoes_accessories: '#7fb2ff', beauty_wigs: '#f0a6ca', perfume_cosmetics: '#c7a8ff', electronics: '#4fe0cf', general: '#d4af37' };
var ST = { loaded: false, loading: false, store: null, sub: null, prods: [], orders: [], q: '', sec: '', err: '' };
var NEXT = { awaiting_confirmation: ['confirmed', 'cancelled'], confirmed: ['preparing', 'cancelled'], preparing: ['ready'], ready: ['completed'] };
var CC = [['234', 'Nigeria +234'], ['233', 'Ghana +233'], ['254', 'Kenya +254'], ['27', 'South Africa +27'], ['1', 'USA / Canada +1'], ['44', 'United Kingdom +44'], ['971', 'UAE +971']];
function phoneField(id, label, full) {
  full = String(full || '').replace(/\D/g, ''); var cc = '234', no = full;
  CC.slice().sort(function (a, b) { return b[0].length - a[0].length; }).some(function (c) { if (full.indexOf(c[0]) === 0 && full.length > c[0].length + 6) { cc = c[0]; no = full.slice(c[0].length); return true; } });
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
async function putLogo(file, storeId, old) {
  var blob = await toWebp(file, 512), path = storeId + '/logo-' + Date.now() + '.webp', c = sb();
  var up = await c.storage.from('store-media').upload(path, blob, { contentType: 'image/webp' }); if (up.error) throw up.error;
  var r = await c.from('stores').update({ logo_path: path }).eq('id', storeId); if (r.error) throw r.error;
  if (old) await c.storage.from('store-media').remove([old]);
}
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

function setup() {
  return '<div class="screen">' + H.bar('Create your store', { back: false }) +
    '<p class="hint" style="margin:0 0 14px">Your customers browse, pick items and send the order to your WhatsApp. Ready in a minute.</p><div class="card" style="display:flex;flex-direction:column;gap:12px">' +
    '<div class="field"><label for="s_name">Store name *</label><input class="in" id="s_name" maxlength="60" placeholder="Maison Adé"></div>' +
    '<div class="field"><label for="s_slug">Store link</label><input class="in" id="s_slug" maxlength="40" placeholder="maison-ade"><span class="hint" style="margin:0">' + esc(location.host) + '/store/…</span></div>' +
    '<div class="field"><label for="s_cat">What do you sell?</label><select class="in" id="s_cat">' + opts(CATS) + '</select></div>' +
    phoneField('s_wa', 'WhatsApp number for orders *', '') +
    '<div class="field"><label for="s_cur">Currency your prices are in</label><select class="in" id="s_cur">' + opts(CURS, (S.profile && S.profile.currency) || 'NGN') + '</select></div>' +
    '<div class="field"><label for="s_logo">Store logo (optional)</label><input class="in" id="s_logo" type="file" accept="image/*"><span class="hint" style="margin:0">No logo? We show your store name in a clean style.</span></div>' +
    '<div class="err" id="s_err" role="alert"></div><button class="btn btn-gold btn-block" data-act="st-create">Create store</button></div></div>' + H.navHTML('home');
}

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
    (acts ? '<div class="btn-row">' + acts + '</div>' : '') + '<button class="link-btn" style="align-self:flex-start" data-act="go" data-to="#/new">Create an invoice for this customer</button></div>';
}

function shell(title, body, opt) { return '<div class="screen">' + H.bar(title, Object.assign({ back: false }, opt || {})) + body + '</div>'; }
function gate() {
  if (!ST.loaded) { load(); return ST.err ? H.empty('Couldn’t load your store', ST.err, '<button class="btn btn-gold" data-act="st-reload">Try again</button>') : H.skeleton(4); }
  return null;
}
function tile(n, label) { return '<div class="card" style="padding:14px;margin:0"><b style="font-size:26px;letter-spacing:-.02em">' + n + '</b><span class="hint" style="display:block;margin:2px 0 0">' + label + '</span></div>'; }
SCR.shome = function () {
  var g = gate(); if (g) return shell('Home', g) + H.navHTML('home');
  var s = ST.store; if (!s) return setup();
  var live = s.status === 'published', pend = ST.orders.filter(function (o) { return o.status === 'awaiting_confirmation'; }), pub = ST.prods.filter(function (p) { return p.status === 'published'; }).length;
  var tr = ST.sub && ST.sub.status === 'trialing' && ST.sub.trial_ends_at ? 'Free trial until ' + new Date(ST.sub.trial_ends_at).toLocaleDateString() : '';
  var unpaid = (S.invoices || []).filter(function (i) { return ['sent', 'viewed', 'partial', 'overdue'].indexOf(i.status) > -1; }).length;
  var h = '<div class="card" style="display:flex;gap:14px;align-items:center">' + logoEl(56) + '<div style="min-width:0"><b style="font-size:19px;display:block;overflow-wrap:anywhere">' + esc(s.name) + '</b><span class="pill ' + (live ? 'paid' : '') + '">' + (live ? 'Live' : s.status === 'suspended' ? 'Suspended' : 'Not published') + '</span></div></div>' +
    '<div class="card" style="display:flex;flex-direction:column;gap:12px"><span class="lbl">Your store link</span><b style="overflow-wrap:anywhere;color:var(--gold)">' + esc(location.host + '/store/' + s.slug) + '</b>' +
    '<div class="btn-row"><a class="btn btn-grow" target="_blank" rel="noopener" href="/store/' + esc(s.slug) + '">' + (live ? 'View store' : 'Preview') + '</a>' + (live ? '<button class="btn btn-gold btn-grow" data-act="st-share">Share link</button>' : s.status === 'suspended' ? '' : '<button class="btn btn-gold btn-grow" data-act="st-publish">Publish</button>') + '</div>' +
    (!live && s.status !== 'suspended' && !pub ? '<span class="hint" style="margin:0">Add at least one product, then publish.</span>' : '') + (live ? '<button class="link-btn" style="align-self:flex-start" data-act="st-unpublish">Take store offline</button>' : '') + '</div>' +
    '<button class="card" data-act="go" data-to="#/theme" style="width:100%;text-align:left;display:flex;justify-content:space-between;align-items:center;margin-top:0"><span><b>Customise your store</b><span class="hint" style="display:block;margin:2px 0 0">Theme, colours, logo and style</span></span><span style="font-size:20px">›</span></button>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:12px 0">' + tile(pub, 'Products in store') + tile(pend.length, 'Orders to confirm') + '</div>';
  if (unpaid) h += '<button class="card" data-act="go" data-to="#/billing" style="width:100%;text-align:left;display:flex;justify-content:space-between"><span><b>' + unpaid + ' unpaid invoice' + (unpaid > 1 ? 's' : '') + '</b><span class="hint" style="display:block;margin:2px 0 0">Tap to follow up</span></span><span>›</span></button>';
  h += '<div class="lbl" style="margin:16px 0 8px">Recent orders</div>' + (ST.orders.length ? ST.orders.slice(0, 3).map(orderCard).join('') + '<button class="link-btn" data-act="go" data-to="#/orders">See all orders</button>' : '<p class="hint">No orders yet. Share your link and they will show up here.</p>');
  if (tr) h += '<p class="hint" style="text-align:center;margin-top:18px">' + esc(tr) + '</p>';
  return shell(s.name, h, { right: '<button class="icon-btn" data-act="st-settings" aria-label="Store settings">' + ic('user') + '</button>' }) + H.navHTML('home');
};
function gridHTML() {
  var q = (ST.q || '').toLowerCase(), list = ST.prods.filter(function (p) { return (!ST.sec || p.category === ST.sec) && (!q || (p.name + ' ' + (p.category || '')).toLowerCase().indexOf(q) > -1); });
  return list.length ? list.map(prodCard).join('') : '<p class="hint" style="grid-column:1/-1">' + (ST.prods.length ? 'No products match.' : 'No products yet. Tap “Add product” to start.') + '</p>';
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
  return shell('Orders', ST.orders.length ? ST.orders.map(orderCard).join('') : H.empty('No orders yet', 'When a customer orders from your store, it appears here and on your WhatsApp.', '')) + H.navHTML('orders');
};
document.addEventListener('input', function (e) { if (e.target && e.target.id === 'st_q') { ST.q = e.target.value; var g = document.getElementById('st_grid'); if (g) g.innerHTML = gridHTML(); } });
ACT['st-sec'] = function (t) { ST.sec = t.dataset.s; rerender(); };
ACT['st-unpublish'] = async function () { try { var r = await sb().from('stores').update({ status: 'draft' }).eq('id', ST.store.id); if (r.error) throw r.error; await load(true); toast('Your store is offline'); } catch (e) { toast(Z.errMsg(e), true); } };

function prodForm(p) {
  p = p || {}; var imgs = (p.store_product_images || []).map(function (i) { return '<span style="position:relative"><img alt="" style="width:64px;height:64px;object-fit:cover;border-radius:8px" src="' + esc(img(i.path)) + '"><button type="button" data-act="st-delimg" data-id="' + esc(i.id) + '" data-path="' + esc(i.path) + '" style="position:absolute;top:-6px;right:-6px;width:20px;height:20px;border-radius:99px;border:0;background:#c33;color:#fff">×</button></span>'; }).join('');
  return '<div style="display:flex;flex-direction:column;gap:12px"><div class="field"><label for="p_name">Name *</label><input class="in" id="p_name" maxlength="120" value="' + esc(p.name || '') + '"></div>' +
    '<div class="field"><label for="p_price">Price (' + esc(ST.store.currency) + ') *</label><input class="in" id="p_price" type="number" inputmode="decimal" min="0" step="0.01" value="' + (p.price_minor != null ? p.price_minor / 100 : '') + '"></div>' +
    '<div class="field"><label for="p_desc">Description</label><textarea class="in" id="p_desc" maxlength="1000">' + esc(p.description || '') + '</textarea></div>' +
    '<div class="field"><label for="p_cat">Section (e.g. Dresses, Bags)</label><input class="in" id="p_cat" maxlength="40" list="p_cats" value="' + esc(p.category || '') + '"><datalist id="p_cats">' + sections().map(function (c) { return '<option value="' + esc(c) + '">'; }).join('') + '</datalist></div>' +
    '<div class="two"><div class="field"><label for="p_stock">Availability</label><select class="in" id="p_stock">' + opts([['in_stock', 'In stock'], ['out_of_stock', 'Out of stock'], ['made_to_order', 'Made to order']], p.stock_status || 'in_stock') + '</select></div>' +
    '<div class="field"><label for="p_status">Visibility</label><select class="in" id="p_status">' + opts([['published', 'Shown'], ['draft', 'Hidden']], p.status || 'published') + '</select></div></div>' +
    (imgs ? '<div style="display:flex;gap:8px;flex-wrap:wrap">' + imgs + '</div>' : '') +
    '<div class="field"><label for="p_files">Photos (up to 6)</label><input class="in" id="p_files" type="file" accept="image/*" multiple></div>' +
    '<div class="err" id="p_err" role="alert"></div><div class="btn-row"><button class="btn btn-gold btn-grow" data-act="st-save" data-id="' + esc(p.id || '') + '">Save product</button>' + (p.id ? '<button class="btn btn-danger" data-act="st-del" data-id="' + esc(p.id) + '">Remove</button>' : '') + '</div></div>';
}
function toWebp(file, max) {
  return new Promise(function (res, rej) {
    var im = new Image(), u = URL.createObjectURL(file);
    im.onload = function () { var r = Math.min(1, max / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = Math.round(im.width * r); c.height = Math.round(im.height * r); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); URL.revokeObjectURL(u); c.toBlob(function (b) { b ? res(b) : rej(new Error('Image failed')); }, 'image/webp', 0.8); };
    im.onerror = function () { rej(new Error('That file is not a valid image')); }; im.src = u;
  });
}
function perr(id, t) { var e = document.getElementById(id); if (e) e.textContent = t; }
function sections() { var o = {}; ST.prods.forEach(function (p) { if (p.category) o[p.category] = 1; }); return Object.keys(o); }
function byId(id) { return ST.prods.filter(function (p) { return p.id === id; })[0]; }

ACT['st-reload'] = function () { ST.loaded = false; load(); };
ACT['st-new'] = function () { Z.openSheet('New product', prodForm()); };
ACT['st-edit'] = function (t) { var p = byId(t.dataset.id); if (p) Z.openSheet('Edit product', prodForm(p)); };
ACT['st-share'] = function () { window.open('https://wa.me/?text=' + encodeURIComponent('Shop ' + ST.store.name + ' here: ' + link(ST.store)), '_blank'); };
ACT['st-create'] = async function (t) {
  var name = val('s_name'), slug = slugify(val('s_slug') || name), wa = getPhone('s_wa');
  if (name.length < 2) return perr('s_err', 'Enter your store name'); if (!wa) return perr('s_err', 'Enter a valid WhatsApp number');
  t.disabled = true; perr('s_err', '');
  try {
    var c = sb(), ok = await c.rpc('store_slug_available', { p_slug: slug }); if (!ok.data) throw new Error('That store link is taken or not allowed. Try another.');
    var r = await c.from('stores').insert({ owner_id: S.user.id, name: name, slug: slug, category: val('s_cat'), whatsapp: wa, currency: val('s_cur') }).select('id').single(); if (r.error) throw r.error;
    var lf = document.getElementById('s_logo').files[0]; if (lf) { try { await putLogo(lf, r.data.id, null); } catch (e2) { toast('Store created, but the logo could not upload. Add it in settings.', true); } }
    ST.loaded = false; await load(true); toast('Store created. Add your first product.');
  } catch (e) { t.disabled = false; perr('s_err', Z.errMsg(e)); }
};
ACT['st-save'] = async function (t) {
  var id = t.dataset.id, name = val('p_name'), price = parseFloat(val('p_price'));
  if (!name) return perr('p_err', 'Enter a product name'); if (!(price >= 0)) return perr('p_err', 'Enter a valid price');
  t.disabled = true; t.textContent = 'Saving…'; perr('p_err', '');
  try {
    var c = sb(), row = { name: name, description: val('p_desc'), category: val('p_cat') || null, price_minor: Math.round(price * 100), stock_status: val('p_stock'), status: val('p_status') }, pid = id;
    if (id) { var u = await c.from('store_products').update(row).eq('id', id); if (u.error) throw u.error; }
    else { row.store_id = ST.store.id; row.slug = slugify(name) + '-' + Math.random().toString(36).slice(2, 6); var n = await c.from('store_products').insert(row).select('id').single(); if (n.error) throw n.error; pid = n.data.id; }
    var files = Array.prototype.slice.call(document.getElementById('p_files').files, 0, 6), pos = id ? (byId(id).store_product_images || []).length : 0;
    for (var i = 0; i < files.length; i++) {
      var blob = await toWebp(files[i], 1280), path = ST.store.id + '/' + pid + '/' + Date.now() + '-' + pos + '.webp';
      var up = await c.storage.from('store-media').upload(path, blob, { contentType: 'image/webp' }); if (up.error) throw up.error;
      var ins = await c.from('store_product_images').insert({ product_id: pid, store_id: ST.store.id, path: path, sort_order: pos++ }); if (ins.error) throw ins.error;
    }
    Z.closeSheet(); await load(true); toast('Product saved');
  } catch (e) { t.disabled = false; t.textContent = 'Save product'; perr('p_err', Z.errMsg(e)); }
};
ACT['st-delimg'] = async function (t) { try { var c = sb(); await c.storage.from('store-media').remove([t.dataset.path]); await c.from('store_product_images').delete().eq('id', t.dataset.id); Z.closeSheet(); await load(true); toast('Photo removed'); } catch (e) { toast(Z.errMsg(e), true); } };
ACT['st-del'] = async function (t) { try { var r = await sb().from('store_products').update({ status: 'archived' }).eq('id', t.dataset.id); if (r.error) throw r.error; Z.closeSheet(); await load(true); toast('Product removed'); } catch (e) { toast(Z.errMsg(e), true); } };
ACT['st-ord'] = async function (t) { try { var r = await sb().rpc('set_store_order_status', { p_order: t.dataset.id, p_status: t.dataset.s }); if (r.error) throw r.error; await load(true); toast('Order updated'); } catch (e) { toast(Z.errMsg(e), true); } };
ACT['st-publish'] = async function () { try { var r = await sb().from('stores').update({ status: 'published' }).eq('id', ST.store.id); if (r.error) throw r.error; await load(true); toast('Your store is live'); } catch (e) { toast(Z.errMsg(e), true); } };
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
var TS = null;
function tsInit() { var st = ST.store; TS = ZTheme.normalize(st.theme, st.category); TS.preset = (st.theme && st.theme.preset) || ''; }
function styleStr(tk) { var v = ZTheme.cssVars(tk); return Object.keys(v).map(function (k) { return k + ':' + v[k]; }).join(';'); }
function tsPreviewHTML(tk) {
  var st = ST.store, ps = ST.prods.filter(function (p) { return p.status === 'published'; }).slice(0, 2), btn = tk.button === 'outline' ? 'background:transparent;color:var(--acc);border:2px solid var(--acc)' : 'background:var(--acc);color:var(--onacc);border:2px solid var(--acc)';
  var logo = st.logo_path ? '<img alt="" src="' + esc(img(st.logo_path)) + '" style="width:40px;height:40px;object-fit:cover;border-radius:calc(var(--r) - 4px)">' : '<span style="width:40px;height:40px;border-radius:calc(var(--r) - 4px);background:var(--acc);color:var(--onacc);display:grid;place-items:center;font-weight:800">' + esc(st.name.charAt(0).toUpperCase()) + '</span>';
  function tile(p) { var im = p && (p.store_product_images || [])[0]; return '<div style="flex:1;min-width:0"><div style="aspect-ratio:4/5;background:var(--surface);border:1px solid var(--line);border-radius:var(--r);overflow:hidden">' + (im ? '<img alt="" style="width:100%;height:100%;object-fit:cover" src="' + esc(img(im.path)) + '">' : '') + '</div><div style="font-size:12px;margin-top:5px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + (p ? esc(p.name) : 'Your product') + '</div><div style="font-size:12px;color:var(--acc);font-weight:700">' + (p ? m(p.price_minor, st.currency) : '') + '</div></div>'; }
  return '<div style="' + styleStr(tk) + ';background:var(--bg);color:var(--tx);font-family:var(--font);border:1px solid var(--line);border-radius:18px;padding:16px;display:flex;flex-direction:column;gap:12px"><div style="display:flex;gap:10px;align-items:center">' + logo + '<b style="font-size:17px;letter-spacing:-.02em">' + esc(st.name) + '</b></div>' +
    '<div style="color:var(--mut);font-size:13px">' + esc(st.description || 'Your products, your brand.') + '</div><div style="display:flex;gap:10px">' + tile(ps[0]) + tile(ps[1]) + '</div>' +
    '<div style="' + btn + ';border-radius:var(--rb);padding:11px;text-align:center;font-weight:700;font-size:14px">Add to order</div></div>';
}
function tsRefresh() {
  var tk = ZTheme.build(TS, ST.store.category), pv = document.getElementById('ts_prev'); if (!pv) return;
  pv.innerHTML = tsPreviewHTML(tk);
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
  return '<div class="screen">' + H.bar('Theme Studio') + '<p class="hint" style="margin:0 0 12px">Pick a look. Your whole store updates to match. Nothing is live until you save.</p>' +
    '<div id="ts_prev">' + tsPreviewHTML(tk) + '</div>' +
    '<div class="card" style="display:flex;flex-direction:column;gap:12px;margin-top:12px"><span class="lbl">Quick look</span><div class="chiprow">' + ZTheme.PRESETS.map(function (p) { return '<button class="chip" data-act="ts-preset" data-ts="preset" data-v="' + p.id + '" aria-pressed="' + (TS.preset === p.id) + '"><span style="display:inline-block;width:10px;height:10px;border-radius:99px;background:' + p.primary + ';margin-right:6px"></span>' + p.name + '</button>'; }).join('') + '</div>' +
    '<div class="field"><label for="ts_hex">Main colour</label><div style="display:grid;grid-template-columns:56px 1fr;gap:8px"><input class="in" id="ts_col" type="color" value="' + TS.primary + '" style="padding:4px;height:46px"><input class="in" id="ts_hex" maxlength="7" value="' + TS.primary + '" placeholder="#10B981" autocapitalize="off" spellcheck="false"></div><span class="hint" style="margin:0">Pick one colour. The rest of the palette is built for you.</span></div>' +
    '<div class="field"><label>Mode</label>' + seg('mode', [['dark', 'Dark'], ['light', 'Light']]) + '</div><div id="ts_warn"></div></div>' +
    '<div class="card" style="display:flex;gap:12px;align-items:center">' + logoEl(52) + '<div style="flex:1;min-width:0" class="field"><label for="ts_logo">Store logo</label><input class="in" id="ts_logo" type="file" accept="image/*"></div>' + (st.logo_path ? '<button class="btn" data-act="ts-logo-rm" type="button">Remove</button>' : '') + '</div>' +
    '<details class="card" style="padding:14px"><summary style="cursor:pointer;font-weight:600">Advanced: fonts, corners, buttons</summary><div style="display:flex;flex-direction:column;gap:12px;margin-top:12px">' +
    '<div class="field"><label>Font</label>' + seg('font', [['modern', 'Modern'], ['classic', 'Classic'], ['friendly', 'Friendly']]) + '</div>' +
    '<div class="field"><label>Corners</label>' + seg('radius', [['sharp', 'Sharp'], ['soft', 'Soft'], ['round', 'Round']]) + '</div>' +
    '<div class="field"><label>Buttons</label>' + seg('button', [['solid', 'Solid'], ['outline', 'Outline']]) + '</div></div></details>' +
    '<div class="err" id="ts_err" role="alert"></div><div class="btn-row" style="margin-top:6px"><button class="btn btn-grow" data-act="ts-reset">Reset</button><button class="btn btn-gold btn-grow" data-act="ts-save">Save theme</button></div>' +
    '<p class="hint" style="text-align:center;margin-top:10px">Saved themes apply to your public store ' + (st.status === 'published' ? 'straight away.' : 'once you publish.') + '</p></div>' + H.navHTML('home');
};
ACT['ts-set'] = function (t) { TS[t.dataset.ts] = t.dataset.v; if (t.dataset.ts !== 'preset') TS.preset = TS.preset; tsRefresh(); };
ACT['ts-preset'] = function (t) { var p = ZTheme.PRESETS.filter(function (x) { return x.id === t.dataset.v; })[0]; if (!p) return; TS = { preset: p.id, primary: p.primary, mode: p.mode, font: p.font, radius: p.radius, button: p.button }; rerender(); };
ACT['ts-reset'] = function () { TS = null; tsInit(); TS = Object.assign(ZTheme.defaults(ST.store.category), { preset: '' }); rerender(); toast('Back to your category look. Tap Save to apply.'); };
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

Z.storeReset = function () { TS = null; ST = { loaded: false, loading: false, store: null, sub: null, prods: [], orders: [], q: '', sec: '', err: '' }; };
})();
