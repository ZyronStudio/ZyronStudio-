'use client';
export const SB_URL = 'https://tnjgkxdjejjvujtteyfx.supabase.co';
export const SB_KEY = 'sb_publishable_i0cGrY8cPpKIN3zsss1a-w_I6qJ8xqK';
let p;
export function getSB() {
  if (typeof window === 'undefined') return Promise.resolve(null);
  if (window.__sb) return Promise.resolve(window.__sb);
  if (!p) p = new Promise((res, rej) => {
    const mk = () => { window.__sb = window.supabase.createClient(SB_URL, SB_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }); res(window.__sb); };
    if (window.supabase && window.supabase.createClient) return mk();
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js';
    s.onload = mk; s.onerror = () => rej(new Error('Could not load'));
    document.head.appendChild(s);
  });
  return p;
}
export const money = (minor, cur) => { try { return new Intl.NumberFormat(cur === 'NGN' || !cur ? 'en-NG' : 'en', { style: 'currency', currency: cur || 'NGN', maximumFractionDigits: 0 }).format((minor || 0) / 100); } catch (e) { return (minor / 100) + ' ' + cur; } };
export const imgUrl = (path) => SB_URL + '/storage/v1/object/public/store-media/' + path;
export function toWebp(file, max = 1280) {
  return new Promise((res, rej) => {
    const im = new Image(), u = URL.createObjectURL(file);
    im.onload = () => {
      const r = Math.min(1, max / Math.max(im.width, im.height)), c = document.createElement('canvas');
      c.width = Math.round(im.width * r); c.height = Math.round(im.height * r);
      c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); URL.revokeObjectURL(u);
      c.toBlob(b => b ? res(b) : rej(new Error('Image failed')), 'image/webp', 0.8);
    };
    im.onerror = () => rej(new Error('Not a valid image'));
    im.src = u;
  });
}

export function loadTheme() {
  if (typeof window === 'undefined') return Promise.resolve(null);
  if (window.ZTheme) return Promise.resolve(window.ZTheme);
  return new Promise((res) => { const s = document.createElement('script'); s.src = '/app/theme.js'; s.onload = () => res(window.ZTheme); s.onerror = () => res(null); document.head.appendChild(s); });
}
