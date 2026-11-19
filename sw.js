/* 너와 아케이드 서비스 워커: 한 번 열어 본 게임은 인터넷이 끊겨도 다시 열립니다.
   - 페이지·JS·CSS: 인터넷 먼저(항상 최신), 안 되면 저장본
   - 그림·글꼴: 저장본 먼저 보여 주고 뒤에서 새로 받기
   - 다른 사이트(광고·분석·랭킹 서버)는 건드리지 않습니다.
   캐시 구조를 바꾸면 VERSION 을 올리세요. */
var VERSION = 'neowa-v1';
var CORE = ['/', '/assets/arcade/arcade.css', '/assets/arcade/arcade.js', '/assets/favicon.png', '/manifest.webmanifest'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) { return c.addAll(CORE); }).catch(function () {}));
  self.skipWaiting();
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

function offlinePage() {
  var html = '<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>오프라인 · 너와 아케이드</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#05060c;color:#f4f5fb;' +
    'font-family:system-ui,-apple-system,"Apple SD Gothic Neo","Noto Sans KR",sans-serif;text-align:center;padding:24px;box-sizing:border-box}' +
    'h1{font-size:26px;margin:0 0 10px}p{color:#aab0d4;margin:0 0 24px;line-height:1.6;word-break:keep-all}' +
    'a{display:inline-block;padding:16px 28px;border-radius:16px;background:#5ee7ff;color:#04151b;font-weight:800;text-decoration:none}</style></head>' +
    '<body><div><h1>인터넷 연결이 없어요</h1><p>이 게임은 아직 이 기기에 저장되지 않았어요.<br>한 번이라도 열어 본 게임은 오프라인에서도 할 수 있어요.</p>' +
    '<a href="/">아케이드 홈으로</a></div></body></html>';
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
function put(req, res) {
  if (res && res.ok && res.type === 'basic') { var copy = res.clone(); caches.open(VERSION).then(function (c) { c.put(req, copy); }); }
  return res;
}
self.addEventListener('fetch', function (e) {
  var req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
  if (/\.(?:png|jpe?g|webp|gif|svg|ico|woff2?|ttf|mp3|ogg|wav)$/i.test(url.pathname)) {
    e.respondWith(caches.match(req).then(function (hit) {
      var net = fetch(req).then(function (res) { return put(req, res); }).catch(function () { return hit; });
      return hit || net;
    }));
    return;
  }
  e.respondWith(fetch(req).then(function (res) { return put(req, res); }).catch(function () {
    return caches.match(req, { ignoreSearch: req.mode === 'navigate' }).then(function (hit) {
      if (hit) return hit;
      if (req.mode !== 'navigate') return Response.error();
      return caches.match('/').then(function (home) { return url.pathname === '/' && home ? home : offlinePage(); });
    });
  }));
});
