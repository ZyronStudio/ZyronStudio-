'use client';
import { useEffect, useState, use } from 'react';
import { getSB, money, imgUrl } from '../../lib-sb';

const PRESET = {
  fashion: { tag: 'New in', cta: 'Add to order' }, shoes_accessories: { tag: 'Fresh pairs', cta: 'Add to order' },
  beauty_wigs: { tag: 'Beauty edit', cta: 'Add to order' }, perfume_cosmetics: { tag: 'Signature scents', cta: 'Add to order' },
  electronics: { tag: 'Latest gear', cta: 'Add to order' }, general: { tag: 'Shop', cta: 'Add to order' },
};

export default function Storefront({ params }) {
  const { slug } = use(params);
  const [d, setD] = useState(undefined), [draft, setDraft] = useState(false), [cart, setCart] = useState({}), [open, setOpen] = useState(null), [co, setCo] = useState(false), [done, setDone] = useState(null), [err, setErr] = useState(''), [busy, setBusy] = useState(false), [sb, setSb] = useState(null);

  useEffect(() => { (async () => {
    const c = await getSB(); setSb(c);
    const { data } = await c.rpc('get_public_store', { p_slug: slug });
    if (data) return setD(data);
    const { data: s } = await c.auth.getSession();
    if (s.session) {
      const { data: st } = await c.from('stores').select('*').eq('slug', slug).eq('owner_id', s.session.user.id).maybeSingle();
      if (st) { const { data: p } = await c.from('store_products').select('*, store_product_images(path,sort_order)').eq('store_id', st.id).eq('status', 'published');
        setDraft(true); return setD({ store: st, products: (p || []).map(x => ({ ...x, images: (x.store_product_images || []).sort((a, b) => a.sort_order - b.sort_order).map(i => i.path) })) }); }
    }
    setD(null);
  })().catch(() => setD(null)); }, [slug]);

  if (d === undefined) return <p className="mut c">Loading…</p>;
  if (!d) return <div className="c"><h1>Store not found</h1><p className="mut">This store may not be open yet.</p></div>;
  const { store, products } = d, P = PRESET[store.category] || PRESET.general, acc = store.brand_color || '#d4af37';
  const lines = Object.entries(cart).map(([id, q]) => ({ p: products.find(x => x.id === id), q })).filter(l => l.p);
  const total = lines.reduce((a, l) => a + l.p.price_minor * l.q, 0), count = lines.reduce((a, l) => a + l.q, 0);
  const add = (id, n = 1) => setCart(c => { const q = Math.max(0, Math.min(50, (c[id] || 0) + n)), x = { ...c }; if (q) x[id] = q; else delete x[id]; return x; });

  async function order(e) {
    e.preventDefault(); if (draft) return setErr('This is a preview. Publish your store to take orders.');
    const f = new FormData(e.target); setBusy(true); setErr('');
    const { data, error } = await sb.rpc('place_store_order', { p_slug: slug, p_items: lines.map(l => ({ product_id: l.p.id, quantity: l.q })), p_name: f.get('name'), p_phone: f.get('phone'), p_note: f.get('note') || null, p_address: f.get('address') || null });
    setBusy(false); if (error) return setErr(error.message);
    setDone(data); setCart({}); setCo(false);
    const text = 'Hello ' + data.store_name + ', I just placed order ' + data.reference + ':\n' + data.items.map(i => i.quantity + '× ' + i.name).join('\n') + '\nTotal: ' + money(data.total_minor, data.currency) + '\nName: ' + f.get('name');
    window.open('https://wa.me/' + data.whatsapp + '?text=' + encodeURIComponent(text), '_blank');
  }

  return (<div style={{ '--acc': acc }}>
    {draft && <div className="banner">Preview — only you can see this. Publish from your dashboard.</div>}
    <header className="hero"><h1>{store.name}</h1>{store.description && <p>{store.description}</p>}
      <div className="meta">{store.address && <span>{store.address}</span>}{store.instagram && <a href={'https://instagram.com/' + store.instagram.replace('@', '')} target="_blank" rel="noreferrer">@{store.instagram.replace('@', '')}</a>}</div></header>
    <h2 className="tag">{P.tag}</h2>
    <div className="grid">{products.map(p => (<button className="pc" key={p.id} onClick={() => setOpen(p)}>
      <div className="ph">{p.images[0] && <img loading="lazy" decoding="async" src={imgUrl(p.images[0])} alt={p.name} />}{p.stock_status === 'out_of_stock' && <i>Sold out</i>}</div>
      <b>{p.name}</b><span>{money(p.price_minor, store.currency)}</span>{p.stock_status === 'made_to_order' && <small>Made to order</small>}</button>))}</div>
    {!products.length && <p className="mut c">Products coming soon.</p>}

    {count > 0 && !co && <button className="bar" onClick={() => setCo(true)}>Review order · {count} item{count > 1 ? 's' : ''} · {money(total, store.currency)}</button>}

    {open && <div className="modal" onClick={e => e.target === e.currentTarget && setOpen(null)}><div className="sheet">
      <div className="gal">{open.images.map(i => <img key={i} loading="lazy" src={imgUrl(i)} alt="" />)}</div>
      <h2>{open.name}</h2><p className="pr">{money(open.price_minor, store.currency)}</p>{open.description && <p className="mut">{open.description}</p>}
      {open.stock_status === 'made_to_order' && <p className="mut">Made to order — the seller will confirm timing.</p>}
      <button className="btn gold" disabled={open.stock_status === 'out_of_stock'} onClick={() => { add(open.id); setOpen(null); }}>{open.stock_status === 'out_of_stock' ? 'Sold out' : P.cta}</button></div></div>}

    {co && <div className="modal" onClick={e => e.target === e.currentTarget && setCo(false)}><form className="sheet" onSubmit={order}>
      <h2>Your order</h2>
      {lines.map(l => <div className="ln" key={l.p.id}><span>{l.p.name}</span><span className="qty"><button type="button" onClick={() => add(l.p.id, -1)}>−</button>{l.q}<button type="button" onClick={() => add(l.p.id, 1)}>+</button></span><span>{money(l.p.price_minor * l.q, store.currency)}</span></div>)}
      <p className="tot">Total <b>{money(total, store.currency)}</b></p>
      <input name="name" placeholder="Your name" required maxLength={80} /><input name="phone" placeholder="Your WhatsApp number" inputMode="tel" required />
      <input name="address" placeholder="Delivery address (optional)" maxLength={300} /><textarea name="note" placeholder="Note, size, colour… (optional)" maxLength={500} />
      <p className="mut">Sending this does not pay or confirm anything. {store.name} will confirm on WhatsApp, including delivery and payment.</p>
      {err && <p className="err">{err}</p>}
      <button className="btn gold" disabled={busy || !lines.length}>{busy ? 'Sending…' : 'Send order on WhatsApp'}</button></form></div>}

    {done && <div className="modal"><div className="sheet"><h2>Order sent</h2><p>Reference <b>{done.reference}</b></p><p className="mut">Status: awaiting confirmation from {done.store_name}. If WhatsApp did not open, message them with your reference.</p>
      <a className="btn gold" href={'https://wa.me/' + done.whatsapp + '?text=' + encodeURIComponent('Hello, my order reference is ' + done.reference)} target="_blank" rel="noreferrer">Open WhatsApp</a><button className="btn" onClick={() => setDone(null)}>Close</button></div></div>}
    <footer className="ft">Store by <a href="/">Zyron</a></footer>
  </div>);
}
