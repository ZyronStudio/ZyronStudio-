'use client';
import { useEffect, useState, use } from 'react';
import { getSB, money, imgUrl, loadTheme } from '../../lib-sb';

const PRESET = {
  fashion: { tag: 'New in', acc: '#e7c4b0', ratio: '4/5', cols: 2 }, shoes_accessories: { tag: 'Fresh pairs', acc: '#7fb2ff', ratio: '1/1', cols: 2 },
  beauty_wigs: { tag: 'Beauty edit', acc: '#f0a6ca', ratio: '4/5', cols: 2 }, perfume_cosmetics: { tag: 'Signature scents', acc: '#c7a8ff', ratio: '3/4', cols: 2 },
  electronics: { tag: 'Latest gear', acc: '#4fe0cf', ratio: '1/1', cols: 2 }, general: { tag: 'Shop', acc: '#d4af37', ratio: '1/1', cols: 2 },
  restaurant: { tag: 'Our menu', acc: '#ff9f43', ratio: '1/1', list: 1, cta: 'Add to order' }, rental: { tag: 'Available now', acc: '#4fa3ff', ratio: '16/10', cta: 'Request this' }, services: { tag: 'Our services', acc: '#b794f6', ratio: '4/3', list: 1, cta: 'Book this' },
};

export default function Storefront({ params }) {
  const { slug } = use(params);
  const [tk, setTk] = useState(null), [q, setQ] = useState(''), [sec, setSec] = useState(''), [d, setD] = useState(undefined), [draft, setDraft] = useState(false), [cart, setCart] = useState({}), [open, setOpen] = useState(null), [co, setCo] = useState(false), [done, setDone] = useState(null), [err, setErr] = useState(''), [busy, setBusy] = useState(false), [sb, setSb] = useState(null);

  useEffect(() => { if (!tk || !window.ZTheme) return; const v = window.ZTheme.cssVars(tk), r = document.documentElement; Object.entries(v).forEach(([k, x]) => r.style.setProperty(k, x)); document.body.style.background = tk.bg; document.body.style.color = tk.text; }, [tk]);
  useEffect(() => { (async () => {
    const c = await getSB(); setSb(c); const ZT = await loadTheme();
    const { data } = await c.rpc('get_public_store', { p_slug: slug });
    if (data) { if (ZT) setTk(ZT.build(data.store.theme, data.store.category)); return setD(data); }
    const { data: s } = await c.auth.getSession();
    if (s.session) {
      const { data: st } = await c.from('stores').select('*').eq('slug', slug).eq('owner_id', s.session.user.id).maybeSingle();
      if (st) { const { data: p } = await c.from('store_products').select('*, store_product_images(path,sort_order)').eq('store_id', st.id).eq('status', 'published');
        if (ZT) setTk(ZT.build(st.theme, st.category)); setDraft(true); return setD({ store: st, products: (p || []).map(x => ({ ...x, images: (x.store_product_images || []).sort((a, b) => a.sort_order - b.sort_order).map(i => i.path) })) }); }
    }
    setD(null);
  })().catch(() => setD(null)); }, [slug]);

  if (d === undefined) return <p className="mut c">Loading…</p>;
  if (!d) return <div className="c"><h1>Store not found</h1><p className="mut">This store may not be open yet.</p></div>;
  const { store, products: all } = d, P = PRESET[store.category] || PRESET.general, cta = P.cta || 'Add to order', vars = tk && window.ZTheme ? window.ZTheme.cssVars(tk) : { '--acc': P.acc };
  const secs = [...new Set(all.map(p => p.category).filter(Boolean))];
  const products = all.filter(p => (!sec || p.category === sec) && (!q || (p.name + ' ' + (p.description || '')).toLowerCase().includes(q.toLowerCase())));
  const lines = Object.entries(cart).map(([id, n]) => ({ p: all.find(x => x.id === id), q: n })).filter(l => l.p);
  const total = lines.reduce((a, l) => a + l.p.price_minor * l.q, 0), count = lines.reduce((a, l) => a + l.q, 0);
  const add = (id, n = 1) => setCart(c => { const q = Math.max(0, Math.min(50, (c[id] || 0) + n)), x = { ...c }; if (q) x[id] = q; else delete x[id]; return x; });

  async function order(e) {
    e.preventDefault(); if (busy) return;
    if (draft) return setErr('This is a preview of your own store. Open the public link in a private tab to test an order.');
    if (!lines.length) return setErr('Your order is empty. Add a product first.');
    const f = new FormData(e.target); setBusy(true); setErr('');
    try {
      const { data, error } = await sb.rpc('place_store_order', { p_slug: slug, p_items: lines.map(l => ({ product_id: l.p.id, quantity: l.q })), p_name: String(f.get('name') || '').trim(), p_phone: f.get('cc') + String(f.get('phone')).replace(/\D/g, '').replace(/^0+/, ''), p_note: f.get('note') || null, p_address: f.get('address') || null });
      if (error || !data) throw new Error((error && error.message) || 'No response');
      const text = 'Hello ' + data.store_name + ', I just placed order ' + data.reference + ':\n' + data.items.map(i => i.quantity + '× ' + i.name).join('\n') + '\nTotal: ' + money(data.total_minor, data.currency) + '\nName: ' + f.get('name');
      setDone({ ...data, text }); setCart({}); setCo(false);
    } catch (ex) { setErr('Could not send your order: ' + (ex.message || 'check your connection') + '. Please try again.'); }
    finally { setBusy(false); }
  }

  return (<div className={tk && tk.button === 'outline' ? 'outline' : ''} style={{ ...vars, '--ratio': P.ratio }}>
    {draft && <div className="pvbanner">Preview — only you can see this. Publish from your dashboard.</div>}
    <header className="hero">{store.logo_path ? <img className="logo" src={imgUrl(store.logo_path)} alt={store.name} /> : null}<h1>{store.name}</h1>{store.description && <p>{store.description}</p>}
      <div className="meta">{store.address && <span>{store.address}</span>}{store.instagram && <a href={'https://instagram.com/' + store.instagram.replace('@', '')} target="_blank" rel="noreferrer">@{store.instagram.replace('@', '')}</a>}</div></header>
    {all.length > 4 && <input className="srch" placeholder="Search products" value={q} onChange={e => setQ(e.target.value)} />}
    {secs.length > 0 && <div className="secs"><button className={!sec ? 'on' : ''} onClick={() => setSec('')}>All</button>{secs.map(c => <button key={c} className={sec === c ? 'on' : ''} onClick={() => setSec(c)}>{c}</button>)}</div>}
    <h2 className="tag">{P.tag}</h2>
    <div className={'grid' + (P.list ? ' list' : '')}>{products.map(p => (<button className="pc" key={p.id} onClick={() => setOpen(p)}>
      <div className="ph">{p.images[0] && <img loading="lazy" decoding="async" src={imgUrl(p.images[0])} alt={p.name} />}{p.stock_status === 'out_of_stock' && <i>Sold out</i>}</div>
      <b>{p.name}</b><span>{money(p.price_minor, store.currency)}</span>{p.stock_status === 'made_to_order' && <small>Made to order</small>}</button>))}</div>
    {!products.length && <p className="mut c">{all.length ? 'No products match.' : 'Products coming soon.'}</p>}

    {count > 0 && !co && <button className="bar" onClick={() => setCo(true)}>Review order · {count} item{count > 1 ? 's' : ''} · {money(total, store.currency)}</button>}

    {open && <div className="smodal" onClick={e => e.target === e.currentTarget && setOpen(null)}><div className="ssheet">
      <div className="gal">{open.images.map(i => <img key={i} loading="lazy" src={imgUrl(i)} alt="" />)}</div>
      <h2>{open.name}</h2><p className="pr">{money(open.price_minor, store.currency)}</p>{open.description && <p className="mut">{open.description}</p>}
      {open.stock_status === 'made_to_order' && <p className="mut">Made to order — the seller will confirm timing.</p>}
      <button className="btn gold" disabled={open.stock_status === 'out_of_stock'} onClick={() => { add(open.id); setOpen(null); }}>{open.stock_status === 'out_of_stock' ? 'Sold out' : cta}</button></div></div>}

    {co && <div className="smodal" onClick={e => e.target === e.currentTarget && setCo(false)}><form className="ssheet" onSubmit={order}>
      <h2>Your order</h2>
      {lines.map(l => <div className="ln" key={l.p.id}><span>{l.p.name}</span><span className="qty"><button type="button" onClick={() => add(l.p.id, -1)}>−</button>{l.q}<button type="button" onClick={() => add(l.p.id, 1)}>+</button></span><span>{money(l.p.price_minor * l.q, store.currency)}</span></div>)}
      <p className="tot">Total <b>{money(total, store.currency)}</b></p>
      <input name="name" placeholder="Your name" required maxLength={80} /><div className="ph2"><select name="cc" defaultValue="234" aria-label="Country code"><option value="234">Nigeria +234</option><option value="233">Ghana +233</option><option value="254">Kenya +254</option><option value="27">South Africa +27</option><option value="1">USA/Canada +1</option><option value="44">UK +44</option><option value="971">UAE +971</option></select><input name="phone" placeholder="801 234 5678" inputMode="tel" required /></div>
      <input name="address" placeholder="Delivery address (optional)" maxLength={300} /><textarea name="note" placeholder="Note, size, colour… (optional)" maxLength={500} />
      <p className="mut">Sending this does not pay or confirm anything. {store.name} will confirm on WhatsApp, including delivery and payment.</p>
      {err && <p className="err">{err}</p>}
      <button type="submit" className="btn gold sticky" disabled={busy}>{busy ? 'Sending…' : 'Send order on WhatsApp'}</button></form></div>}

    {done && <div className="smodal"><div className="ssheet"><h2>Order sent</h2><p>Reference <b>{done.reference}</b></p><p className="mut">Your order is saved and awaiting confirmation from {done.store_name}. Tap the button to send the details to them on WhatsApp.</p>
      <a className="btn gold" href={'https://wa.me/' + done.whatsapp + '?text=' + encodeURIComponent(done.text)} target="_blank" rel="noreferrer">Send details on WhatsApp</a><button className="btn" onClick={() => setDone(null)}>Close</button></div></div>}
    <footer className="ft">Store by <a href="/">Zyron</a></footer>
  </div>);
}
