'use client';
import { useEffect } from 'react';

const SCRIPTS = [
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js',
  '/app/qr.js', '/app/core.js', '/app/screens.js', '/app/extra.js', '/app/actions.js', '/app/store.js', '/app/pdf.js',
];

function load(src) {
  return new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = src; s.async = false;
    s.onload = res; s.onerror = () => rej(new Error('Failed to load ' + src));
    document.body.appendChild(s);
  });
}

export default function Loader() {
  useEffect(() => {
    if (window.__zyronLoaded) return;
    window.__zyronLoaded = true;
    // Windows/desktop: Escape closes whatever sheet is open
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && window.Z && window.Z.isSheetOpen && window.Z.isSheetOpen()) window.Z.closeSheet();
    });
    (async () => { for (const src of SCRIPTS) await load(src); })().catch(console.error);
  }, []);
  return null;
}
