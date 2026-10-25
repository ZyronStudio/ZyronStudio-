'use client';
import { useEffect, useState, useCallback } from 'react';
import { getSB, money, imgUrl, toWebp } from '../lib-sb';

const CATS = [['fashion', 'Fashion'], ['shoes_accessories', 'Shoes & accessories'], ['beauty_wigs', 'Beauty & wigs'], ['perfume_cosmetics', 'Perfume & cosmetics'], ['electronics', 'Electronics'], ['general', 'General']];
const slugify = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);

export default function Dashboard() {
  const [sb, setSb] = useState(null), [user, setUser] = useState(undefined), [store, setStore] = useState(null), [subs, setSubs] = useState(null);
  const [prods, setProds] = useState([]), [orders, setOrders] = useState([]), [msg, setMsg] = useState(''), [tab, setTab] = useState('products'), [edit, setEdit] = useState(null), [busy, setBusy] = useState(false);
  const say = (m) => { setMsg(m); setTimeout(() => setMsg(''), 4000); };

  useEffect(() => { getSB().then(c => { setSb(c); c.auth.getSession().then(({ data }) => setUser(data.session ? data.session.user : null)); c.auth.onAuthStateChange((_e, s) => setUser(s ? s.user : null)); }); }, []);

  const load = useCallback(async () => {
    if (!sb || !user) return;
    const { data: s } = await sb.from('stores').select('*').eq('owner_id', user.id).maybeSingle();
    setStore(s);
    if (!s) return;
    const [{ data: sub }, { data: p }, { data: o }] = await Promise.all([
      sb.from('store_subscriptions').select('*').eq('owner_id', user.id).maybeSingle(),
      sb.from('store_products').select('*, store_product_images(id,path,sort_order)').eq('store_id', s.id).neq('status', 'archived').order('created_at', { ascending: false }),
      sb.from('store_orders').select('*, store_order_items(*)').eq('store_id', s.id).order('created_at', { ascending: false }).limit(50)]);
    setSubs(sub); setProds(p || []); setOrders(o || []);
  }, [sb, user]);
  useEffect(() => { load(); }, [load]);

  const google = () => sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + '/dashboard' } });

  async function createStore(e) {
    e.preventDefault(); const f = new FormData(e.target); setBusy(true);
    const name = f.get('name').trim(), slug = slugify(f.get('slug') || name);
    const { data: ok } = await sb.rpc('store_slug_available', { p_slug: slug });
    if (!ok) { setBusy(false); return say('That store link is taken or not allowed. Try another.'); }
    const { error } = await sb.from('stores').insert({ owner_id: user.id, name, slug, category: f.get('category'), whatsapp: f.get('whatsapp').replace(/\D/g, ''), currency: f.get('currency') });
    setBusy(false); if (error) return say(error.message); load();
  }
  async function saveStore(patch) { const { error } = await sb.from('stores').update(patch).eq('id', store.id); if (error) say(error.message); else { say('Saved'); load(); } }

  async function saveProduct(e) {
    e.preventDefault(); const f = new FormData(e.target); setBusy(true);
    try {
      const row = { store_id: store.id, name: f.get('name').trim(), slug: slugify(f.get('name')) + '-' + Math.random().toString(36).slice(2, 6), description: f.get('description'), price_minor: Math.round(parseFloat(f.get('price')) * 100), stock_status: f.get('stock'), status: f.get('status') };
      let id = edit.id;
      if (id) { delete row.slug; delete row.store_id; const { error } = await sb.from('store_products').update(row).eq('id', id); if (error) throw error; }
      else { const { data, error } = await sb.from('store_products').insert(row).select('id').single(); if (error) throw error; id = data.id; }
      const files = [...e.target.querySelector('input[type=file]').files].slice(0, 6);
      let pos = (edit.store_product_images || []).length;
      for (const file of files) {
        const blob = await toWebp(file), path = store.id + '/' + id + '/' + Date.now() + '-' + pos + '.webp';
        const up = await sb.storage.from('store-media').upload(path, blob, { contentType: 'image/webp' }); if (up.error) throw up.error;
        const { error } = await sb.from('store_product_images').insert({ product_id: id, store_id: store.id, path, sort_order: pos++ }); if (error) throw error;
      }
      setEdit(null); say('Product saved'); load();
    } catch (er) { say(er.message || 'Could not save'); }
    setBusy(false);
  }
  async function delImg(im) { await sb.storage.from('store-media').remove([im.path]); await sb.from('store_product_images').delete().eq('id', im.id); setEdit(null); load(); }
  async function archive(p) { await sb.from('store_products').update({ status: 'archived' }).eq('id', p.id); load(); }
  async function setStatus(o, s) { const { error } = await sb.rpc('set_store_order_status', { p_order: o.id, p_status: s }); if (error) say(error.message); else load(); }
  async function publish() { const { error } = await sb.from('stores').update({ status: 'published' }).eq('id', store.id); if (error) say(error.message.includes('violates') || error.message ? error.message : 'Could not publish'); else { say('Your store is live'); load(); } }

  if (user === undefined) return <p className="mut">Loading…</p>;
  if (!user) return (<div className="auth"><h1>Zyron <span>Store</span></h1><p className="mut">A premium online store for your business, ready in minutes.</p><button className="btn gold" onClick={google}>Continue with Google</button></div>);
  if (!store) return (
    <form className="card" onSubmit={createStore}><h1>Set up your store</h1>
      <label>Store name<input name="name" required maxLength={60} placeholder="Maison Adé" /></label>
      <label>Store link<input name="slug" placeholder="maison-ade" /><small>zyronstudio.vercel.app/store/…</small></label>
      <label>What do you sell?<select name="category">{CATS.map(c => <option key={c[0]} value={c[0]}>{c[1]}</option>)}</select></label>
      <label>WhatsApp number (with country code)<input name="whatsapp" required inputMode="tel" placeholder="2348012345678" /></label>
      <label>Currency<select name="currency">{['NGN', 'USD', 'GBP', 'EUR', 'CAD', 'AUD'].map(c => <option key={c}>{c}</option>)}</select></label>
      <button className="btn gold" disabled={busy}>Create store</button>{msg && <p className="err">{msg}</p>}</form>);

  const live = store.status === 'published', trialEnd = subs && subs.trial_ends_at ? new Date(subs.trial_ends_at) : null;
  return (<div>
    <header className="top"><div><h1>{store.name}</h1><p className="mut">{live ? 'Live' : store.status === 'suspended' ? 'Suspended' : 'Draft'}{trialEnd && subs.status === 'trialing' ? ' · free trial until ' + trialEnd.toLocaleDateString() : ''}</p></div>
      <div className="row"><a className="btn" href={'/store/' + store.slug} target="_blank" rel="noreferrer">{live ? 'View store' : 'Preview'}</a>{!live && store.status !== 'suspended' && <button className="btn gold" onClick={publish}>Publish</button>}</div></header>
    {live && <p className="card mut">Share: <b>{location.origin}/store/{store.slug}</b> <button className="btn sm" onClick={() => { navigator.clipboard.writeText(location.origin + '/store/' + store.slug); say('Link copied'); }}>Copy</button></p>}
    <nav className="tabs">{['products', 'orders', 'settings'].map(t => <button key={t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>{t[0].toUpperCase() + t.slice(1)}{t === 'orders' && orders.filter(o => o.status === 'awaiting_confirmation').length ? ' •' : ''}</button>)}</nav>
    {msg && <p className="toast">{msg}</p>}

    {tab === 'products' && <>
      <button className="btn gold" onClick={() => setEdit({ store_product_images: [], stock_status: 'in_stock', status: 'published' })}>+ Add product</button>
      <div className="grid">{prods.map(p => { const im = (p.store_product_images || []).sort((a, b) => a.sort_order - b.sort_order)[0]; return (
        <div className="pc" key={p.id}><div className="ph">{im && <img loading="lazy" src={imgUrl(im.path)} alt="" />}</div><b>{p.name}</b><span>{money(p.price_minor, store.currency)}</span><small className="mut">{p.status === 'draft' ? 'Hidden · ' : ''}{p.stock_status.replace(/_/g, ' ')}</small>
          <div className="row"><button className="btn sm" onClick={() => setEdit(p)}>Edit</button><button className="btn sm" onClick={() => archive(p)}>Remove</button></div></div>); })}</div>
      {!prods.length && <p className="mut">No products yet. Add your first one — a clear photo, a name and a price is enough.</p>}</>}

    {tab === 'orders' && <div>{orders.map(o => (<div className="card" key={o.id}><b>{o.reference}</b> · {money(o.total_minor, store.currency)} <span className="pill">{o.status.replace(/_/g, ' ')}</span>
      <p className="mut">{o.customer_name} · <a href={'https://wa.me/' + o.customer_phone.replace(/\D/g, '')} target="_blank" rel="noreferrer">{o.customer_phone}</a></p>
      <ul>{(o.store_order_items || []).map(i => <li key={i.id}>{i.quantity}× {i.name_snapshot}</li>)}</ul>
      <div className="row">{{ awaiting_confirmation: ['confirmed', 'cancelled'], confirmed: ['preparing', 'cancelled'], preparing: ['ready'], ready: ['completed'] }[o.status]?.map(s => <button key={s} className="btn sm" onClick={() => setStatus(o, s)}>Mark {s}</button>)}</div></div>))}
      {!orders.length && <p className="mut">No orders yet. Orders arrive here and on your WhatsApp.</p>}</div>}

    {tab === 'settings' && <form className="card" onSubmit={e => { e.preventDefault(); const f = new FormData(e.target); saveStore({ name: f.get('name'), description: f.get('description'), whatsapp: f.get('whatsapp').replace(/\D/g, ''), instagram: f.get('instagram'), address: f.get('address'), brand_color: f.get('color') }); }}>
      <label>Store name<input name="name" defaultValue={store.name} required /></label>
      <label>About<textarea name="description" defaultValue={store.description || ''} maxLength={500} /></label>
      <label>WhatsApp<input name="whatsapp" defaultValue={store.whatsapp || ''} required /></label>
      <label>Instagram handle<input name="instagram" defaultValue={store.instagram || ''} /></label>
      <label>Address / area<input name="address" defaultValue={store.address || ''} /></label>
      <label>Accent colour<input type="color" name="color" defaultValue={store.brand_color || '#d4af37'} /></label>
      <button className="btn gold">Save</button></form>}

    {edit && <div className="modal" onClick={e => e.target === e.currentTarget && setEdit(null)}><form className="card sheet" onSubmit={saveProduct}><h2>{edit.id ? 'Edit product' : 'New product'}</h2>
      <label>Name<input name="name" defaultValue={edit.name} required maxLength={120} /></label>
      <label>Price ({store.currency})<input name="price" type="number" step="0.01" min="0" defaultValue={edit.price_minor != null ? edit.price_minor / 100 : ''} required /></label>
      <label>Description<textarea name="description" defaultValue={edit.description || ''} maxLength={1000} /></label>
      <label>Availability<select name="stock" defaultValue={edit.stock_status}><option value="in_stock">In stock</option><option value="out_of_stock">Out of stock</option><option value="made_to_order">Made to order</option></select></label>
      <label>Visibility<select name="status" defaultValue={edit.status}><option value="published">Shown in store</option><option value="draft">Hidden</option></select></label>
      <div className="thumbs">{(edit.store_product_images || []).map(im => <span key={im.id}><img src={imgUrl(im.path)} alt="" /><button type="button" onClick={() => delImg(im)}>×</button></span>)}</div>
      <label>Photos (up to 6)<input type="file" accept="image/*" multiple /></label>
      <div className="row"><button type="button" className="btn" onClick={() => setEdit(null)}>Cancel</button><button className="btn gold" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button></div></form></div>}
    <p className="mut foot"><button className="link" onClick={() => sb.auth.signOut()}>Sign out</button></p>
  </div>);
}
