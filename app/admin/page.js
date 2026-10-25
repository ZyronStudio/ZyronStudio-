'use client';
import { useEffect, useState, useCallback } from 'react';
import { getSB } from '../lib-sb';

export default function Admin() {
  const [sb, setSb] = useState(null), [ok, setOk] = useState(undefined), [stats, setStats] = useState(null), [stores, setStores] = useState([]), [act, setAct] = useState([]), [msg, setMsg] = useState('');
  useEffect(() => { getSB().then(async c => { setSb(c); const { data } = await c.auth.getSession(); if (!data.session) return setOk(null); const r = await c.rpc('is_platform_admin'); setOk(r.data === true); }); }, []);
  const load = useCallback(async () => {
    if (!sb || !ok) return;
    const [a, b, d] = await Promise.all([sb.rpc('admin_stats'), sb.rpc('admin_list_stores', { p_limit: 100, p_offset: 0 }), sb.rpc('admin_recent_activity', { p_limit: 30 })]);
    setStats(a.data); setStores(b.data || []); setAct(d.data || []);
  }, [sb, ok]);
  useEffect(() => { load(); }, [load]);
  async function setS(id, s) { const reason = s === 'suspended' ? prompt('Reason for suspending?') : null; if (s === 'suspended' && !reason) return; const { error } = await sb.rpc('admin_set_store_status', { p_store: id, p_status: s, p_reason: reason }); setMsg(error ? error.message : 'Updated'); load(); }
  if (ok === undefined) return <p className="mut">Loading…</p>;
  if (ok === null) return <div className="auth"><h1>Admin</h1><button className="btn gold" onClick={() => sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + '/admin' } })}>Sign in with Google</button></div>;
  if (!ok) return <div className="auth"><h1>Not found</h1></div>;
  return (<div><h1>Platform admin</h1>{msg && <p className="toast">{msg}</p>}
    <pre className="card mut" style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(stats, null, 2)}</pre>
    <h2>Stores</h2>{stores.map(s => (<div className="card" key={s.id}><b>{s.name}</b> <span className="pill">{s.status}</span> <small className="mut">/{s.slug} · {s.owner_email || ''} · sub: {s.subscription_status || '-'}</small>
      <div className="row">{s.status !== 'suspended' ? <button className="btn sm" onClick={() => setS(s.id, 'suspended')}>Suspend</button> : <button className="btn sm" onClick={() => setS(s.id, 'draft')}>Restore</button>}<a className="btn sm" href={'/store/' + s.slug} target="_blank" rel="noreferrer">Open</a></div></div>))}
    <h2>Recent activity</h2><pre className="card mut" style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(act, null, 1)}</pre></div>);
}
