/* 확통허브 서비스 워커: 오프라인 사용 + 새 버전 알림
 * - 페이지(index.html)는 항상 인터넷에서 먼저 받아오고, 오프라인일 때만 저장본을 보여 줘요.
 * - 외부 라이브러리(Tailwind, KaTeX 등)와 이미지는 한 번 받으면 저장해 두고 오프라인에서도 써요.
 * - 이 파일(sw.js)이 바뀌면 브라우저가 새 서비스 워커로 인식해 '새 버전' 알림이 떠요.
 */
const VERSION = '2026.10.27-1';
const CORE = 'hub-core-' + VERSION;
const RUNTIME = 'hub-runtime-v1';
const PRECACHE = [
  './', './index.html', './manifest.webmanifest',
  './favicon.svg', './favicon.ico', './apple-touch-icon.png',
  './icon-192.png', './icon-512.png', './logo.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CORE).then(c =>
      Promise.all(PRECACHE.map(u => c.add(new Request(u, { cache: 'reload' })).catch(() => {})))
    )
  );
  // skipWaiting은 호출하지 않아요. 사용자가 '지금 업데이트'를 누르면 그때 교체해요.
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CORE && k !== RUNTIME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});

async function networkFirst(req) {
  const cache = await caches.open(CORE);
  try {
    const res = await fetch(req);
    if (res && res.ok) cache.put(req, res.clone());
    return res;
  } catch (err) {
    return (await cache.match(req, { ignoreSearch: true }))
      || (await cache.match('./index.html'))
      || (await cache.match('./'))
      || Response.error();
  }
}

async function staleWhileRevalidate(req, sameOrigin) {
  const cache = await caches.open(sameOrigin ? CORE : RUNTIME);
  const hit = await cache.match(req);
  const net = fetch(req).then(res => {
    if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
    return res;
  }).catch(() => null);
  return hit || (await net) || Response.error();
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (!/^https?:$/.test(url.protocol)) return;
  const sameOrigin = url.origin === self.location.origin;
  if (sameOrigin && url.pathname.endsWith('/sw.js')) return;
  const isPage = req.mode === 'navigate' || (sameOrigin && (url.pathname.endsWith('/') || url.pathname.endsWith('.html')));
  e.respondWith(isPage ? networkFirst(req) : staleWhileRevalidate(req, sameOrigin));
});
