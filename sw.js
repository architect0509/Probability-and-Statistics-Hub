/* 확통허브 서비스 워커: 오프라인 사용 + 새 버전 알림
 * - 페이지(index.html)는 항상 인터넷에서 먼저 받아오고, 오프라인일 때만 저장본을 보여 줘요.
 * - 스크립트·스타일(js, css)도 인터넷에서 먼저 받아요. 페이지와 버전이 어긋나지 않게 하려는 거예요.
 * - 외부 라이브러리(Tailwind, KaTeX 등)와 이미지는 한 번 받으면 저장해 두고 오프라인에서도 써요.
 * - 이 파일(sw.js)이 바뀌면 브라우저가 새 서비스 워커로 인식해 '새 버전' 알림이 떠요.
 */
const VERSION = '2026.11.27-33';
const CORE = 'hub-core-' + VERSION;
const RUNTIME = 'hub-runtime-v1';
const PRECACHE = [
  './', './index.html', './thaniya-intro.js', './hub-mark.svg', './manifest.webmanifest',
  './favicon.svg', './favicon.ico', './apple-touch-icon.png',
  './icon-192.png', './icon-512.png', './icon-maskable-512.png', './logo.png',
  // 벨레스타 연대기 (game/)
  './game/index.html', './game/js/art.js', './game/js/maps.js', './game/js/content.js', './game/js/silly.js',
  './game/js/help.js', './game/js/glossary.js', './game/js/story.js', './game/js/audio.js', './game/js/engine.js', './game/js/world2.js', './game/js/concepts.js', './game/js/cinema.js', './game/js/boot.js', './game/js/looks.js', './game/js/haunt.js', './game/js/cards.js', './game/js/costume.js', './game/js/quizgen.js', './game/css/game.css', './game/assets/portraits_cut.webp'
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

async function networkFirst(req, isPage) {
  const cache = await caches.open(CORE);
  try {
    const res = await fetch(req, isPage ? undefined : { cache: 'no-cache' });
    if (res && res.ok) cache.put(req, res.clone());
    return res;
  } catch (err) {
    const hit = await cache.match(req, { ignoreSearch: true });
    if (hit || !isPage) return hit || Response.error();
    return (await cache.match('./index.html')) || (await cache.match('./')) || Response.error();
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
  // 스크립트·스타일은 페이지와 버전이 어긋나면 화면이 멈추므로, 항상 인터넷에서 먼저 받는다 (오프라인일 때만 저장본)
  const isCode = sameOrigin && /\.(js|css|webmanifest)$/.test(url.pathname);
  e.respondWith(isPage || isCode ? networkFirst(req, isPage) : staleWhileRevalidate(req, sameOrigin));
});
