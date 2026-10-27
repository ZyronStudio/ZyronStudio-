const V='zyron-v23';
self.addEventListener('install',e=>{self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==V).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET'||new URL(r.url).origin!==location.origin)return;
e.respondWith(fetch(r).then(res=>{const c=res.clone();caches.open(V).then(ch=>ch.put(r,c));return res}).catch(()=>caches.match(r).then(m=>m||caches.match('/'))))});
self.addEventListener('push',e=>{let d={};try{d=e.data.json()}catch(_){d={title:'Zyron',body:e.data?e.data.text():''}}
e.waitUntil(self.registration.showNotification(String(d.title||'Zyron').slice(0,80),{body:String(d.body||'').slice(0,200),icon:'icon-192.png',data:{url:String(d.url||'#/home')},tag:'zyron-'+String(d.url||'home')}))});
self.addEventListener('notificationclick',e=>{e.notification.close();const raw=(e.notification.data&&e.notification.data.url)||'#/home';const u=new URL(/^#/.test(raw)?raw:'#/home',self.registration.scope).href;
e.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(l=>{for(const c of l){if(c.url.startsWith(self.registration.scope)){return c.focus().then(()=>c.navigate?c.navigate(u):undefined).catch(()=>clients.openWindow(u))}}return clients.openWindow(u)}))});
