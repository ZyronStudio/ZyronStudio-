/* Zyron Store: the online store lives inside the same app, same login, same look. */
(function () {
'use strict';
var Z = window.Z, S = Z.S, esc = Z.esc, ic = Z.ic, SCR = Z.SCR, H = Z.helpers, toast = Z.toast, ACT = window.ZA.ACT;
var SB_URL = 'https://tnjgkxdjejjvujtteyfx.supabase.co';
var CATS = [['fashion', 'Fashion'], ['shoes_accessories', 'Shoes & accessories'], ['beauty_wigs', 'Beauty & wigs'], ['perfume_cosmetics', 'Perfume & cosmetics'], ['electronics', 'Electronics'], ['general', 'General']];
var CURS = ['NGN', 'USD', 'GBP', 'EUR', 'CAD', 'AUD'];
var ST = { loaded: false, loading: false, store: null, sub: null, prods: [], orders: [], tab: 'products', err: '' };
var NEXT = { awaiting_confirmation: ['confirmed', 'cancelled'], confirmed: ['preparing', 'cancelled'], preparing: ['ready'], ready: ['completed'] };
function sb() { return Z.getSB(); }
function val(id) { var e = document.getElementById(id); return e ? String(e.value).trim() : ''; }
function m(minor, cur) { try { return new Intl.NumberFormat('en', { style: 'currency', currency: cur || 'NGN', maximumFractionDigits: 0 }).format((minor || 0) / 100); } catch (e) { return String(minor / 100) + ' ' + cur; } }
function img(p) { return SB_URL + '/storage/v1/object/public/store-media/' + p; }
function slugify(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40); }
function link(s) { return location.origin + '/store/' + s.slug; }
function opts(list, cur) { return list.map(function (c) { var v = c[0] || c, l = c[1] || c; return '<option value="' + v + '"' + (v === cur ? ' selected' : '') + '>' + l + '</option>'; }).join(''); }
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
  return '<div class="screen">' + H.bar('Create your store') +
    '<p class="hint" style="margin:0 0 14px">Your customers browse, pick items and send the order to your WhatsApp. Ready in a minute.</p><div class="card" style="display:flex;flex-direction:column;gap:12px">' +
    '<div class="field"><label for="s_name">Store name *</label><input class="in" id="s_name" maxlength="60" placeholder="Maison Adé"></div>' +
    '<div class="field"><label for="s_slug">Store link</label><input class="in" id="s_slug" maxlength="40" placeholder="maison-ade"><span class="hint" style="margin:0">' + esc(location.host) + '/store/…</span></div>' +
    '<div class="field"><label for="s_cat">What do you sell?</label><select class="in" id="s_cat">' + opts(CATS) + '</select></div>' +
    '<div class="field"><label for="s_wa">WhatsApp number (with country code) *</label><input class="in" id="s_wa" inputmode="tel" placeholder="2348012345678"></div>' +
    '<div class="field"><label for="s_cur">Currency</label><select class="in" id="s_cur">' + opts(CURS, (S.profile && S.profile.currency) || 'NGN') + '</select></div>' +
    '<div class="err" id="s_err" role="alert"></div><button class="btn btn-gold btn-block" data-act="st-create">Create store</button></div></div>' + H.navHTML('store');
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
    (acts ? '<div class="btn-row">' + acts + '</div>' : '') + '</div>';
}

SCR.store = function () {
  if (!ST.loaded) { load(); return ST.err ? '<div class="screen">' + H.bar('Store', { back: false }) + H.empty('Couldn’t load your store', ST.err, '<button class="btn btn-gold" data-act="st-reload">Try again</button>') + '</div>' + H.navHTML('store') : '<div class="screen">' + H.bar('Store', { back: false }) + H.skeleton(4) + '</div>' + H.navHTML('store'); }
  var s = ST.store; if (!s) return setup();
  var live = s.status === 'published', pend = ST.orders.filter(function (o) { return o.status === 'awaiting_confirmation'; }).length;
  var tr = ST.sub && ST.sub.status === 'trialing' && ST.sub.trial_ends_at ? ' · free until ' + new Date(ST.sub.trial_ends_at).toLocaleDateString() : '';
  var h = '<div class="screen">' + H.bar(s.name, { back: false, right: '<button class="icon-btn" data-act="st-settings" aria-label="Store settings">' + ic('user') + '</button>' }) +
    '<div class="card" style="display:flex;flex-direction:column;gap:10px"><div><b>' + (live ? 'Your store is live' : s.status === 'suspended' ? 'Store suspended' : 'Draft, not live yet') + '</b><span class="hint" style="display:block;margin:2px 0 0">' + (live ? esc(link(s)) : 'Add products, then publish') + esc(tr) + '</span></div>' +
    '<div class="btn-row"><a class="btn btn-grow" target="_blank" rel="noopener" href="/store/' + esc(s.slug) + '">' + (live ? 'View store' : 'Preview') + '</a>' +
    (live ? '<button class="btn btn-gold btn-grow" data-act="st-share">Share on WhatsApp</button>' : s.status === 'suspended' ? '' : '<button class="btn btn-gold btn-grow" data-act="st-publish">Publish</button>') + '</div></div>' +
    '<div class="seg" style="margin:12px 0"><button data-act="st-tab" data-t="products" aria-pressed="' + (ST.tab === 'products') + '">Products</button><button data-act="st-tab" data-t="orders" aria-pressed="' + (ST.tab === 'orders') + '">Orders' + (pend ? ' (' + pend + ')' : '') + '</button></div>';
  if (ST.tab === 'products') {
    h += '<button class="btn btn-gold btn-block" data-act="st-new">+ Add product</button>';
    h += ST.prods.length ? '<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-top:12px">' + ST.prods.map(prodCard).join('') + '</div>' : '<div style="margin-top:12px">' + H.empty('No products yet', 'A clear photo, a name and a price is enough to start.', '') + '</div>';
  } else h += ST.orders.length ? ST.orders.map(orderCard).join('') : H.empty('No orders yet', 'Orders appear here and arrive on your WhatsApp.', '');
  return h + '</div>' + H.navHTML('store');
};

function prodForm(p) {
  p = p || {}; var imgs = (p.store_product_images || []).map(function (i) { return '<span style="position:relative"><img alt="" style="width:64px;height:64px;object-fit:cover;border-radius:8px" src="' + esc(img(i.path)) + '"><button type="button" data-act="st-delimg" data-id="' + esc(i.id) + '" data-path="' + esc(i.path) + '" style="position:absolute;top:-6px;right:-6px;width:20px;height:20px;border-radius:99px;border:0;background:#c33;color:#fff">×</button></span>'; }).join('');
  return '<div style="display:flex;flex-direction:column;gap:12px"><div class="field"><label for="p_name">Name *</label><input class="in" id="p_name" maxlength="120" value="' + esc(p.name || '') + '"></div>' +
    '<div class="field"><label for="p_price">Price (' + esc(ST.store.currency) + ') *</label><input class="in" id="p_price" type="number" inputmode="decimal" min="0" step="0.01" value="' + (p.price_minor != null ? p.price_minor / 100 : '') + '"></div>' +
    '<div class="field"><label for="p_desc">Description</label><textarea class="in" id="p_desc" maxlength="1000">' + esc(p.description || '') + '</textarea></div>' +
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
function byId(id) { return ST.prods.filter(function (p) { return p.id === id; })[0]; }

ACT['open-store'] = function () { location.hash = '#/store'; };
ACT['st-reload'] = function () { ST.loaded = false; load(); };
ACT['st-tab'] = function (t) { ST.tab = t.dataset.t; rerender(); };
ACT['st-new'] = function () { Z.openSheet('New product', prodForm()); };
ACT['st-edit'] = function (t) { var p = byId(t.dataset.id); if (p) Z.openSheet('Edit product', prodForm(p)); };
ACT['st-share'] = function () { window.open('https://wa.me/?text=' + encodeURIComponent('Shop ' + ST.store.name + ' here: ' + link(ST.store)), '_blank'); };
ACT['st-create'] = async function (t) {
  var name = val('s_name'), slug = slugify(val('s_slug') || name), wa = val('s_wa').replace(/\D/g, '');
  if (name.length < 2) return perr('s_err', 'Enter your store name'); if (wa.length < 8) return perr('s_err', 'Enter a valid WhatsApp number');
  t.disabled = true; perr('s_err', '');
  try {
    var c = sb(), ok = await c.rpc('store_slug_available', { p_slug: slug }); if (!ok.data) throw new Error('That store link is taken or not allowed. Try another.');
    var r = await c.from('stores').insert({ owner_id: S.user.id, name: name, slug: slug, category: val('s_cat'), whatsapp: wa, currency: val('s_cur') }); if (r.error) throw r.error;
    ST.loaded = false; await load(true); toast('Store created. Add your first product.');
  } catch (e) { t.disabled = false; perr('s_err', Z.errMsg(e)); }
};
ACT['st-save'] = async function (t) {
  var id = t.dataset.id, name = val('p_name'), price = parseFloat(val('p_price'));
  if (!name) return perr('p_err', 'Enter a product name'); if (!(price >= 0)) return perr('p_err', 'Enter a valid price');
  t.disabled = true; t.textContent = 'Saving…'; perr('p_err', '');
  try {
    var c = sb(), row = { name: name, description: val('p_desc'), price_minor: Math.round(price * 100), stock_status: val('p_stock'), status: val('p_status') }, pid = id;
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
  var s = ST.store;
  Z.openSheet('Store settings', '<div style="display:flex;flex-direction:column;gap:12px">' +
    '<div class="field"><label for="e_name">Store name</label><input class="in" id="e_name" maxlength="60" value="' + esc(s.name) + '"></div>' +
    '<div class="field"><label for="e_desc">About</label><textarea class="in" id="e_desc" maxlength="500">' + esc(s.description || '') + '</textarea></div>' +
    '<div class="field"><label for="e_wa">WhatsApp</label><input class="in" id="e_wa" inputmode="tel" value="' + esc(s.whatsapp || '') + '"></div>' +
    '<div class="field"><label for="e_ig">Instagram</label><input class="in" id="e_ig" maxlength="40" value="' + esc(s.instagram || '') + '"></div>' +
    '<div class="field"><label for="e_addr">Area / address</label><input class="in" id="e_addr" maxlength="200" value="' + esc(s.address || '') + '"></div>' +
    '<div class="field"><label for="e_col">Accent colour</label><input class="in" id="e_col" type="color" value="' + esc(s.brand_color || '#d4af37') + '"></div>' +
    '<div class="err" id="e_err" role="alert"></div><button class="btn btn-gold btn-block" data-act="st-saveset">Save</button></div>');
};
ACT['st-saveset'] = async function (t) {
  var wa = val('e_wa').replace(/\D/g, ''); if (wa.length < 8) return perr('e_err', 'Enter a valid WhatsApp number'); t.disabled = true;
  try { var r = await sb().from('stores').update({ name: val('e_name'), description: val('e_desc'), whatsapp: wa, instagram: val('e_ig'), address: val('e_addr'), brand_color: val('e_col') }).eq('id', ST.store.id); if (r.error) throw r.error; Z.closeSheet(); await load(true); toast('Saved'); }
  catch (e) { t.disabled = false; perr('e_err', Z.errMsg(e)); }
};
if (/^#\/store/.test(location.hash) && S.user) rerender();
Z.storeReset = function () { ST = { loaded: false, loading: false, store: null, sub: null, prods: [], orders: [], tab: 'products', err: '' }; };
})();
