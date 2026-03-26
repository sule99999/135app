// 135app Service Worker
// 更新版本号可以让旧缓存失效，触发重新下载
const CACHE_VERSION = 'v1';
const CACHE_NAME = `135app-${CACHE_VERSION}`;

// 需要预缓存的资源（首次安装时下载）
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png',
  'https://unpkg.com/react@18/umd/react.development.js',
  'https://unpkg.com/react-dom@18/umd/react-dom.development.js',
  'https://unpkg.com/@babel/standalone/babel.min.js',
];

// 安装：预缓存所有资源
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// 激活：清理旧版本缓存
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// 请求澢截策略
self.addEventListener('fetch', event => {
  const url = event.request.url;

  // CDN 脚本：缓存优先（这些文件基本不变）
  if (url.includes('unpkg.com') || url.includes('cdnjs.cloudflare.com')) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // 主 HTML 文件：网络优先（确保总能拿到最新版本），网络失败则用缓存
  if (url.endsWith('/') || url.endsWith('/index.html') || url.endsWith('.html')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // 其他资源：缓存优先，缓存没有则请求网络
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});
