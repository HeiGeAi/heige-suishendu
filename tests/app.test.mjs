import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const APP_SRC = fs.readFileSync(path.join(ROOT, 'src', 'app.js'), 'utf8');

function createHarness({ boot, fetchImpl, initialHash = '#/' }) {
  const storage = new Map();
  const winListeners = new Map();
  const docListeners = new Map();

  const makeEl = (id = '') => {
    const el = {
      id,
      className: '',
      innerHTML: '',
      textContent: '',
      value: '',
      dataset: {},
      style: {},
      attributes: new Map(),
      classList: {
        _set: new Set(),
        add(c) { this._set.add(c); },
        remove(c) { this._set.delete(c); },
        contains(c) { return this._set.has(c); },
        toggle(c) { this._set.has(c) ? this._set.delete(c) : this._set.add(c); },
      },
      setAttribute(k, v) { this.attributes.set(k, String(v)); },
      getAttribute(k) { return this.attributes.get(k) ?? null; },
      removeAttribute(k) { this.attributes.delete(k); },
      addEventListener() {},
      scrollIntoView() {},
      focus() {},
      blur() {},
      remove() {},
      closest() { return null; },
      insertAdjacentHTML(_pos, html) { this.innerHTML += html; },
      querySelector(sel) { return query(sel, this); },
      querySelectorAll(sel) { return queryAll(sel, this); },
    };
    return el;
  };

  const view = makeEl('view');
  const chrome = makeEl('chrome');
  const toast = makeEl('toast');
  const sheetRoot = makeEl('sheet-root');
  const bootEl = makeEl('boot');
  bootEl.textContent = JSON.stringify(boot);
  const inputQ = makeEl('q');
  const hintEl = makeEl('hint');
  const resultsEl = makeEl('results');
  const moreEl = makeEl('more');
  const tocRows = makeEl('tocrows');
  const updLabel = makeEl('updlabel');
  const updSub = makeEl('updsub');
  const updCount = makeEl('updcount');

  const byId = new Map([
    ['view', view],
    ['chrome', chrome],
    ['toast', toast],
    ['sheet-root', sheetRoot],
    ['boot', bootEl],
    ['q', inputQ],
    ['hint', hintEl],
    ['results', resultsEl],
    ['more', moreEl],
    ['tocrows', tocRows],
    ['updlabel', updLabel],
    ['updsub', updSub],
    ['updcount', updCount],
  ]);

  function query(sel) {
    if (sel.startsWith('#')) return byId.get(sel.slice(1)) || null;
    if (sel === 'meta[name="theme-color"]') return { content: '' };
    return null;
  }
  function queryAll(sel) {
    if (sel === '.entry') {
      const matches = [...view.innerHTML.matchAll(/id="(e-\d+-\d+)" data-id="(\d+-\d+)" data-n="(\d+)"/g)];
      return matches.map((m) => {
        const el = makeEl(m[1]);
        el.dataset = { id: m[2], n: m[3] };
        return el;
      });
    }
    return [];
  }

  let currentHash = initialHash;
  const dispatchWin = (type) => {
    for (const fn of winListeners.get(type) || []) fn();
  };

  const location = {
    origin: 'http://127.0.0.1:5173',
    pathname: '/',
    protocol: 'http:',
    get hash() { return currentHash; },
    set hash(v) {
      currentHash = v.startsWith('#') ? v : '#' + v;
      dispatchWin('hashchange');
    },
    replace(v) {
      currentHash = v.startsWith('#') ? v : '#' + v;
      dispatchWin('hashchange');
    },
    reload() {},
  };

  const history = {
    replaceState(_s, _t, url) {
      const idx = String(url).indexOf('#');
      if (idx >= 0) currentHash = String(url).slice(idx);
    },
    back() {},
  };

  const document = {
    documentElement: { dataset: {} },
    querySelector: query,
    querySelectorAll: queryAll,
    getElementById: (id) => byId.get(id) || null,
    addEventListener(type, fn) {
      if (!docListeners.has(type)) docListeners.set(type, []);
      docListeners.get(type).push(fn);
    },
    createElement: () => makeEl(),
    body: { appendChild() {} },
  };

  const localStorage = {
    getItem: (k) => (storage.has(k) ? storage.get(k) : null),
    setItem: (k, v) => storage.set(k, String(v)),
  };

  const timers = new Set();
  const sandbox = {
    window: null,
    document,
    location,
    history,
    localStorage,
    sessionStorage: localStorage,
    navigator: { userAgent: 'TestBrowser', platform: 'Linux', maxTouchPoints: 0 },
    matchMedia: () => ({ matches: false, addEventListener() {} }),
    IntersectionObserver: class {
      observe() {}
      disconnect() {}
    },
    URLSearchParams,
    TextEncoder,
    TextDecoder,
    btoa,
    atob,
    console,
    setTimeout: (fn, ms) => {
      const id = setTimeout(() => { timers.delete(id); fn(); }, ms);
      timers.add(id);
      return id;
    },
    clearTimeout: (id) => { timers.delete(id); clearTimeout(id); },
    setInterval,
    clearInterval,
    addEventListener(type, fn) {
      if (!winListeners.has(type)) winListeners.set(type, []);
      winListeners.get(type).push(fn);
    },
    scrollTo() {},
    fetch: fetchImpl,
  };
  sandbox.window = sandbox;

  vm.runInNewContext(APP_SRC, sandbox, { filename: 'src/app.js' });

  return {
    view,
    chrome,
    inputQ,
    resultsEl,
    location,
    localStorage,
    click(attrs) {
      const target = {
        closest(sel) {
          if (sel === '[data-act]') return { dataset: attrs, classList: makeEl().classList, getAttribute: () => null };
          return null;
        },
      };
      for (const fn of docListeners.get('click') || []) fn({ target, preventDefault() {} });
    },
    cleanup() {
      for (const id of timers) clearTimeout(id);
      timers.clear();
    },
  };
}

const SAMPLE_BOOT = {
  v: '2026-11-21-test',
  synced: '2026-11-21',
  commit: 'abcdef0',
  stats: { entries: 3, free: 2, A: 2, B: 1, C: 0, disputed: 0, top: 1, refs: 3 },
  content: {
    scenes: [{ label: '测试处境', to: '#/read/1', k: 'life' }],
    sos: [{ id: '1-1', label: '紧急情况', line: '立刻处理', tone: 'red' }],
    cpr: { id: '1-1', title: '按压', line: '立刻按压', steps: ['第一步'], dont: '不要停', infant: '见第 1 节第 1 条' },
  },
  chapters: [
    { n: 1, t: '第一章', s: '第一章', k: 'life', cnt: 2, tiers: 'XH', lens: 'll' },
    { n: 2, t: '第二章', s: '第二章', k: 'money', cnt: 1, tiers: 'H', lens: 'm' },
  ],
};

function deferred() {
  let resolve, reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

const okJson = (data) => ({ ok: true, status: 200, json: async () => data });
const flush = () => new Promise((r) => setTimeout(r, 20));

test('stale viewRead resolution does not hijack a newer route (#/sos)', async () => {
  const ch1 = deferred();
  const h = createHarness({
    boot: SAMPLE_BOOT,
    fetchImpl: async (url) => {
      if (url === 'data/ch/01.json') return okJson(await ch1.promise);
      if (url === 'data/foot/01.json') return okJson({ 1: ['', [], []], 2: ['', [], []] });
      if (url === 'data/meta.json') return okJson({ gloss: [], titles: { 1: ['条目一', '条目二'], 2: ['条目三'] } });
      if (url === 'data/updates.json') return okJson({ since: '2026-11-01', items: {} });
      throw new Error(`unexpected fetch ${url}`);
    },
  });
  try {
    await flush();
    h.location.hash = '#/read/1/1';
    await flush();
    h.location.hash = '#/sos';
    await flush();
    assert.match(h.view.innerHTML, /<h1>急救<\/h1>/);

    // Resolve slow chapter 1 after user already moved to #/sos
    ch1.resolve({
      n: 1, t: '第一章', s: '第一章', k: 'life', intro: [],
      entries: [{ id: '1-1', c: 1, n: 1, t: '条目一', plain: '正文', note: [], g: 'A', m: '0', tm: '少', w: '否', lv: '大', k: 'life', d: 0, r: '极高' }],
    });
    await flush();

    assert.equal(h.location.hash, '#/sos');
    assert.match(h.view.innerHTML, /<h1>急救<\/h1>/);
    assert.match(h.chrome.innerHTML, /tabbar/);
  } finally {
    h.cleanup();
  }
});

test('stale viewRead failure does not overwrite a newer route with error page', async () => {
  const ch1 = deferred();
  const h = createHarness({
    boot: SAMPLE_BOOT,
    fetchImpl: async (url) => {
      if (url === 'data/ch/01.json') return await ch1.promise;
      if (url === 'data/meta.json') return okJson({ gloss: [], titles: { 1: ['条目一', '条目二'], 2: ['条目三'] } });
      if (url === 'data/updates.json') return okJson({ since: '2026-11-01', items: {} });
      throw new Error(`unexpected fetch ${url}`);
    },
  });
  try {
    await flush();
    h.location.hash = '#/read/1/1';
    await flush();
    h.location.hash = '#/sos';
    await flush();

    ch1.reject(new Error('network down'));
    await flush();

    assert.equal(h.location.hash, '#/sos');
    assert.match(h.view.innerHTML, /<h1>急救<\/h1>/);
    assert.doesNotMatch(h.view.innerHTML, /还没存到手机上/);
  } finally {
    h.cleanup();
  }
});

test('search highlighting never corrupts HTML entities', async () => {
  const indexData = [
    ['1-1', "R&D < 10% \"quote\" 'single'", '测试正文 A & B', '成本', 'A', '0', '少', '否', '大', 'life', 0, '极高'],
  ];
  const h = createHarness({
    boot: SAMPLE_BOOT,
    fetchImpl: async (url) => {
      if (url === 'data/index.json') return okJson(indexData);
      if (url === 'data/meta.json') return okJson({ gloss: [], titles: { 1: ['条目一', '条目二'], 2: ['条目三'] } });
      if (url === 'data/updates.json') return okJson({ since: '2026-11-01', items: {} });
      throw new Error(`unexpected fetch ${url}`);
    },
  });
  try {
    await flush();
    // Search for entity-name substrings that appear in escaped HTML (&amp; &lt; &quot; &#39;)
    h.inputQ.value = 'R&D';
    h.location.hash = '#/search?q=R%26D';
    await flush();
    assert.match(h.resultsEl.innerHTML, /<mark>R&amp;D<\/mark>/);
    assert.doesNotMatch(h.resultsEl.innerHTML, /&<mark>/);

    // Search for "amp" should NOT match escaped &amp; or break entities
    h.inputQ.value = 'A';
    h.location.hash = '#/search?q=A';
    await flush();
    assert.match(h.resultsEl.innerHTML, /<mark>A<\/mark> &amp; B/);
    assert.doesNotMatch(h.resultsEl.innerHTML, /&<mark>a<\/mark>mp;/i);
  } finally {
    h.cleanup();
  }
});

test('progress import canonicalizes leading-zero chapter IDs and drops out-of-bounds entries', async () => {
  const b64u = (str) => Buffer.from(str, 'utf8').toString('base64url');
  const readBits = Buffer.from([0x80]).toString('base64url'); // entry 1 read
  // Leading zero chapter "01", invalid missing-dot part "badpart", out-of-bounds fav "99-1", out-of-bounds resume "99-5"
  const payload = `1|01.${readBits}~badpart|01-02~99-1|1-1~2-9|99-5`;
  const code = b64u(payload);

  const h = createHarness({
    boot: SAMPLE_BOOT,
    fetchImpl: async (url) => {
      if (url === 'data/meta.json') return okJson({ gloss: [], titles: { 1: ['条目一', '条目二'], 2: ['条目三'] } });
      if (url === 'data/updates.json') return okJson({ since: '2026-11-01', items: {} });
      throw new Error(`unexpected fetch ${url}`);
    },
  });
  try {
    await flush();
    h.location.hash = `#/p/${code}`;
    await flush();
    assert.match(h.view.innerHTML, /这个链接里有 <b>1<\/b> 条已读、<b>1<\/b> 条收藏、<b>1<\/b> 条做到了。/);
    h.click({ act: 'import', code });
    await flush();
    const state = JSON.parse(h.localStorage.getItem('ssd:v1'));
    assert.ok(state.read['1-1'], 'expected canonical key 1-1 in S.read');
    assert.equal(state.read['01-1'], undefined, 'should not store non-canonical key 01-1');
    assert.ok(state.fav['1-2'], 'expected canonical key 1-2 in S.fav');
    assert.equal(state.fav['99-1'], undefined, 'should discard out-of-bounds fav');
    assert.equal(state.done['2-9'], undefined, 'should discard out-of-bounds done');
    assert.equal(state.resume, null, 'should discard out-of-bounds resume');
  } finally {
    h.cleanup();
  }
});

test('deploy.sh passes bash -n and rejects root or relative DEPLOY_PATH', () => {
  const script = path.join(ROOT, 'scripts', 'deploy.sh');
  const syntax = spawnSync('bash', ['-n', script], { encoding: 'utf8' });
  assert.equal(syntax.status, 0, syntax.stderr);

  for (const badPath of ['/', 'var/www/live']) {
    const res = spawnSync('bash', [script], {
      encoding: 'utf8',
      env: {
        PATH: process.env.PATH,
        DEPLOY_HOST: 'example.invalid',
        DEPLOY_PATH: badPath,
        DEPLOY_URL: 'https://example.invalid/live/',
      },
    });
    assert.notEqual(res.status, 0, `expected non-zero exit for DEPLOY_PATH=${badPath}`);
    assert.match(res.stderr, /DEPLOY_PATH 必须是非根目录的绝对路径/);
  }
});
