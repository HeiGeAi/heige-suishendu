// 随身读的离线缓存。构建时 scripts/build.mjs 会把下面的占位换成真实值。
// 规则：
// - 安装时只存页面本身（样式、脚本、目录数据都已经写在页面里）和两份小数据。
// - 34 节正文、折起来的「成本 · 收益原文 · 来源」和搜索索引随后补存：同时最多取 2 个；用户自己点开的内容先走，
//   补存在旁边等着。顺序是急救那一节、各节正文、各节折起来的部分、搜索索引。存满以后断网也能读全书。
// - 同一个版本内一律先读缓存，不等网络；新版本装好后先等着，用户点「更新」或下次打开才换上，读到一半不会突然变。
// - 换上新版本以后，正文按新版本重新存一遍（没改的文件服务器只回一句「没变」）；存齐之前，断网时先拿旧版本的顶着。
const VERSION = '__VERSION__';
const CACHE = 'ssd-' + VERSION;
const SHELL = __SHELL__;
const CHAPTERS = __CHAPTERS__; // 各节正文，急救那一节排第一
const FOOTS = __FOOTS__;       // 和 CHAPTERS 一一对应的折起来的部分
const LATER = [CHAPTERS[0], FOOTS[0], ...CHAPTERS.slice(1), ...FOOTS.slice(1), ...__EXTRA__];

self.addEventListener('install', (e) => {
  // no-cache：绕过浏览器自己的 HTTP 缓存去服务器核对，免得新版本存进旧文件
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL.map((u) => new Request(u, { cache: 'no-cache' })))));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim());
});

// 页面自己正在取的数据（刚点开的那一节、搜索索引）：补存先停一停，把网速让给它
let busy = 0;
const whenFree = () => new Promise((r) => { const t = () => (busy ? setTimeout(t, 120) : r()); t(); });

// 一节的正文和折起来的部分都存好了，才算这一节存好了
async function status() {
  const c = await caches.open(CACHE);
  let done = 0;
  for (let i = 0; i < CHAPTERS.length; i++) if ((await c.match(CHAPTERS[i])) && (await c.match(FOOTS[i]))) done++;
  return { type: 'cached', done, total: CHAPTERS.length, version: VERSION };
}
let lastReport = 0;
async function report(force) {
  if (!force && Date.now() - lastReport < 400) return;
  lastReport = Date.now();
  const msg = await status();
  for (const cl of await self.clients.matchAll()) cl.postMessage(msg);
}

let running = null;
async function fill() {
  const c = await caches.open(CACHE);
  const todo = [];
  for (const u of LATER) if (!(await c.match(u))) todo.push(u);
  let i = 0;
  const worker = async () => {
    while (i < todo.length) {
      const u = todo[i++];
      await whenFree();
      try {
        // priority: 'low'：支持的浏览器会把带宽先给页面自己的请求
        const res = await fetch(new Request(u, { cache: 'no-cache', priority: 'low' }));
        if (res.ok) await c.put(u, res);
      } catch (err) { /* 断网时先跳过，下次再补 */ }
      await report(false);
    }
  };
  await Promise.all([worker(), worker()]);
  // 新版本存齐了，旧版本的缓存就可以丢了
  let complete = true;
  for (const u of LATER) if (!(await c.match(u))) { complete = false; break; }
  if (complete) {
    const old = (await caches.keys()).filter((k) => k.startsWith('ssd-') && k !== CACHE);
    await Promise.all(old.map((k) => caches.delete(k)));
  }
  await report(true);
}
const precache = () => running || (running = fill().finally(() => { running = null; }));

self.addEventListener('message', (e) => {
  const d = e.data || {};
  if (d.type === 'skip') self.skipWaiting();
  if (d.type === 'precache') e.waitUntil(precache());
  if (d.type === 'status') e.waitUntil(status().then((msg) => e.source && e.source.postMessage(msg)));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (req.mode === 'navigate') {
    e.respondWith((async () => (await (await caches.open(CACHE)).match('index.html')) || (await caches.match('index.html', { ignoreSearch: true })) || fetch(req))());
    return;
  }
  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    const hit = await c.match(req, { ignoreSearch: true });
    if (hit) return hit;
    const data = url.pathname.includes('/data/');
    if (!data) return fetch(req);
    busy++;
    let res;
    try { res = await fetch(req); } catch (err) {
      busy--;
      // 断网，新版本又还没存到这一份：先拿旧版本存的顶着
      const old = await caches.match(req, { ignoreSearch: true });
      if (old) return old;
      throw err;
    }
    if (res.ok) {
      const put = c.put(req, res.clone()).catch(() => {}).finally(() => { busy--; });
      try { e.waitUntil(put); } catch (err) { /* 个别浏览器这时不让再延长，存不存都不影响这次显示 */ }
    } else busy--;
    return res;
  })());
});
