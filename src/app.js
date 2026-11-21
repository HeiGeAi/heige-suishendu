/* 随身读 · 高性价比人生指南（读者做的非官方阅读站）
 * 原生 JS 单页应用，hash 路由。数据在 data/，由 scripts/build.mjs 从原书稿生成。
 * 阅读进度、收藏、设置都只存在这台设备的 localStorage 里，不登录、不上传。 */
(() => {
  'use strict';

  // ---------- 小工具 ----------
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pad = (n) => String(n).padStart(2, '0');
  const now = () => Math.floor(Date.now() / 1000);
  const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const smooth = () => (reduce() ? 'auto' : 'smooth');
  const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  const view = $('#view');
  const chrome = $('#chrome');
  let routeSeq = 0;

  const KOU = { life: '寿命', money: '钱', time: '时间精力', free: '人身自由' };
  const KOU_T = { life: 't-life', money: 't-money', time: 't-blue', free: 't-violet' };
  const LENS_LETTER = { l: 'life', m: 'money', t: 'time', f: 'free' };
  const LENS_DOT = { life: '#B9F25A', money: '#FF8A5C', time: '#5FB4FF', free: '#B39BFF' };
  const GRADE_DOT = { A: '#B9F25A', B: '#7CC8FF', C: '#C3A8FF' };
  const MONEY = { '0': '0 元', '少': '花钱少', '多': '花钱多' };
  const TIME = { '少': '几分钟', '中': '要些时间', '多': '花时间多' };
  const WILL = { '否': '不费毅力', '些': '要些毅力', '是': '要毅力' };
  const LEVEL = { '大': '收益大', '中': '收益中', '小': '收益小' };

  // ---------- 图标 ----------
  const I = {
    search: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/>',
    back: '<path d="M15 5l-7 7 7 7"/>',
    arrow: '<path d="M5 12h14"/><path d="M13 6l6 6-6 6"/>',
    down: '<path d="M12 5v13"/><path d="M6 12l6 6 6-6"/>',
    chev: '<path d="M5 9l7 7 7-7"/>',
    right: '<path d="M9 5l7 7-7 7"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    star: '<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/>',
    share: '<path d="M12 3v12"/><path d="M7 8l5-5 5 5"/><path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/>',
    book: '<path d="M12 6.5c-1.8-1.4-4.3-2-7.5-2v13c3.2 0 5.7.6 7.5 2 1.8-1.4 4.3-2 7.5-2v-13c-3.2 0-5.7.6-7.5 2z"/><path d="M12 6.5v13"/>',
    aid: '<rect x="3.5" y="6" width="17" height="13.5" rx="3"/><path d="M9 6V4.5h6V6"/><path d="M12 9.8v6"/><path d="M9 12.8h6"/>',
    user: '<circle cx="12" cy="8.5" r="3.8"/><path d="M4.5 20c1.2-3.6 4.1-5.5 7.5-5.5s6.3 1.9 7.5 5.5"/>',
    shuffle: '<path d="M3 7h3c5 0 7 10 12 10h3"/><path d="M3 17h3c2 0 3.5-1.6 4.7-3.6"/><path d="M13.3 10.6C14.5 8.6 16 7 18 7h3"/><path d="M18 4l3 3-3 3"/><path d="M18 14l3 3-3 3"/>',
    plus: '<path d="M12 6v12"/><path d="M6 12h12"/>',
    refresh: '<path d="M20 12a8 8 0 1 1-2.34-5.66"/><path d="M20 4v5h-5"/>',
    dl: '<path d="M12 4v11"/><path d="M7 10l5 5 5-5"/><path d="M5 20h14"/>',
    device: '<rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/><path d="M11 18.5h2"/>',
    send: '<path d="M20.5 3.5L10 14"/><path d="M20.5 3.5l-6.5 17-4-6.5-6.5-4z"/>',
    moon: '<path d="M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10z"/>',
    warn: '<path d="M12 4.5l8.5 15h-17z"/><path d="M12 10v4.5"/><path d="M12 17.2v.3"/>',
    x: '<path d="M6 6l12 12"/><path d="M18 6L6 18"/>',
    spark: '<path d="M12 3v4"/><path d="M12 17v4"/><path d="M3 12h4"/><path d="M17 12h4"/><path d="M6.3 6.3l2.5 2.5"/><path d="M15.2 15.2l2.5 2.5"/><path d="M17.7 6.3l-2.5 2.5"/><path d="M8.8 15.2l-2.5 2.5"/>',
    sound: '<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16.5 8.5a5 5 0 0 1 0 7"/><path d="M19 6a8.5 8.5 0 0 1 0 12"/>',
  };
  const svg = (k, w = 20, sw = 1.9, extra = '') => `<svg aria-hidden="true" width="${w}" height="${w}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"${extra}>${I[k]}</svg>`;

  // 一个玻璃物件：投影 + 通透外壳 + 深色内芯
  function glass({ tag = 'div', cls = '', t = 't-ink', proj = 'caustic', attrs = '', core = '', coreCls = '', coreAttrs = '' }) {
    const pj = proj ? proj.split(' ').map((p) => `<span aria-hidden="true" class="proj ${p}"></span>`).join('') : '';
    return `<${tag} class="g ${t} ${cls}" ${attrs}>${pj}<span class="shell"><span class="core ${coreCls}" ${coreAttrs}>${core}</span></span></${tag}>`;
  }
  // 一块内容玻璃（第 5 版）：一条建议、一组行、一份列表都装进一块里，彩光只从底边透出来
  function slab({ tag = 'div', t = 't-ink', cls = '', attrs = '', core = '', proj = 'shade caustic' }) {
    const pj = proj ? proj.split(' ').map((p) => `<span aria-hidden="true" class="proj ${p}"></span>`).join('') : '';
    const box = tag === 'button' ? 'span' : 'div';
    return `<${tag} class="g slab ${t} ${cls}" ${attrs}>${pj}<${box} class="shell"><${box} class="core">${core}</${box}></${box}></${tag}>`;
  }
  const tagS = (label, dot, cls = '') => `<span class="tag ${cls}">${dot ? `<span class="dot" style="background:${dot};box-shadow:0 0 8px ${dot}"></span>` : ''}${label}</span>`;
  const gradeTag = (g) => tagS(`证据 ${g}`, GRADE_DOT[g] || '#ccc');
  const SEP = '<span class="sep" aria-hidden="true"></span>';
  const goIcon = (k = 'right') => `<span class="go">${svg(k, 18, 2, k === 'chev' ? ' class="chev"' : '')}</span>`;
  const icon = (k, w = 20) => `<span class="ic" aria-hidden="true">${svg(k, w)}</span>`;
  // 一行：图标 + 标题 + 小字 + 右边的东西。tg 决定它是链接、按钮还是普通一行
  const lrow = ({ tg = 'a', attrs = '', ic = '', title, sub = '', right = '' }) => `<${tg} class="lrow" ${attrs}>${ic}<span class="tx"><b>${title}</b>${sub ? `<small>${sub}</small>` : ''}</span>${right}</${tg}>`;
  const textSlab = (html, t = 't-ink', cls = '') => slab({ t, cls: `textslab ${cls}`, proj: 'caustic', core: `<p>${html}</p>` });
  // 说人话里的百分比、倍数和首页大数字用同一种光
  const NUM_GLOW = /\d+(?:\.\d+)?\s?(?:%|倍)/g;
  const glowNums = (h) => h.replace(/(<[^>]*>)|([^<]+)/g, (all, tg, text) => tg || text.replace(NUM_GLOW, '<span class="hl">$&</span>'));

  // ---------- 本机存储 ----------
  const KEY = 'ssd:v1';
  let S;
  try { S = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { S = null; }
  if (!S || S.v !== 1) S = { v: 1, resume: null, read: {}, fav: {}, done: {}, prefs: { theme: 'auto', fs: 'm', lite: false }, visits: 0, dismiss: {} };
  S.prefs = Object.assign({ theme: 'auto', fs: 'm', lite: false }, S.prefs);
  S.dismiss = S.dismiss || {};
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* 隐私模式存不了也照常能读 */ } };
  S.visits = (S.visits || 0) + 1;
  save();

  // ---------- 主题、字号、简化特效 ----------
  const mqDark = matchMedia('(prefers-color-scheme: dark)');
  const autoLite = (navigator.deviceMemory && navigator.deviceMemory <= 2) || matchMedia('(prefers-reduced-transparency: reduce)').matches;
  const isDark = () => document.documentElement.dataset.theme === 'dark';
  function applyPrefs() {
    const d = document.documentElement;
    const dark = S.prefs.theme === 'dark' || (S.prefs.theme === 'auto' && mqDark.matches);
    d.dataset.theme = dark ? 'dark' : 'light';
    d.dataset.fs = S.prefs.fs || 'm';
    if (S.prefs.lite || autoLite) d.dataset.lite = '1'; else delete d.dataset.lite;
    const tc = $('meta[name="theme-color"]');
    if (tc) tc.content = dark ? '#0D0D12' : '#EEEEF1';
  }
  mqDark.addEventListener && mqDark.addEventListener('change', () => { if (S.prefs.theme === 'auto') { applyPrefs(); syncSwitches(); } });

  // ---------- 数据 ----------
  // 目录要的那一小份（各节标题和条数、口径、统计、处境、急救）构建时直接写进了 index.html，
  // 不等任何请求就能画出首页；每条的标题和术语表在 data/meta.json，首屏画完再在后台取。
  let META = null, INDEX = null, UPDATES = null;
  const CH = new Map();
  let CHAP = new Map();
  let fullMeta = null;
  const getJSON = async (u) => { const r = await fetch(u, { cache: 'no-cache' }); if (!r.ok) throw new Error(`${u} ${r.status}`); return r.json(); };
  function readBoot() {
    try { META = JSON.parse($('#boot').textContent); } catch (e) { META = null; }
    if (META) CHAP = new Map(META.chapters.map((c) => [c.n, c]));
    return !!META;
  }
  function loadMeta() {
    if (!fullMeta) {
      fullMeta = getJSON('data/meta.json').then((m) => {
        for (const cm of META.chapters) {
          const t = m.titles && m.titles[cm.n];
          if (t && t.length === cm.cnt) cm.titles = t;
        }
        META.gloss = m.gloss || [];
        buildGloss();
        return META;
      });
      fullMeta.catch(() => { fullMeta = null; });
    }
    return fullMeta;
  }
  const chap = (c) => CHAP.get(+c);
  let indexP = null, updatesP = null;
  function loadIndex() {
    if (!indexP) {
      indexP = getJSON('data/index.json').then((raw) => (INDEX = raw.map((r) => { const [c, n] = r[0].split('-').map(Number); return { id: r[0], c, n, t: r[1], p: r[2], cost: r[3], g: r[4], m: r[5], tm: r[6], w: r[7], lv: r[8], k: r[9], d: r[10], r: r[11] }; })));
      indexP.catch(() => { indexP = null; });
    }
    return indexP;
  }
  function loadUpdates() {
    if (!updatesP) updatesP = getJSON('data/updates.json').catch(() => ({ since: '', items: {} })).then((u) => (UPDATES = u));
    return updatesP;
  }
  // 同一节同时只取一次：点得快、或者后台已经在取，都等同一个请求
  function loadChapter(c) {
    if (!CH.has(c)) {
      const p = getJSON(`data/ch/${pad(c)}.json`);
      CH.set(c, p);
      p.catch(() => CH.delete(c));
    }
    return CH.get(c);
  }
  const lensAt = (c, n) => LENS_LETTER[(chap(c)?.lens || '')[n - 1]] || chap(c)?.k || 'money';
  const titleAt = (c, n) => (chap(c)?.titles || [])[n - 1] || '';

  // ---------- 进度 ----------
  const readCount = () => Object.keys(S.read).length;
  function readInChapter(c) {
    const cm = chap(c); let k = 0;
    for (let n = 1; n <= cm.cnt; n++) if (S.read[`${c}-${n}`]) k++;
    return k;
  }
  function firstUnread(c) {
    const cm = chap(c);
    for (let n = 1; n <= cm.cnt; n++) if (!S.read[`${c}-${n}`]) return n;
    return 1;
  }
  function markRead(id) { S.read[id] = now(); save(); }
  const dayEnd = (d) => Math.floor(new Date(`${d}T23:59:59+08:00`).getTime() / 1000);
  const fmtDate = (d) => { const m = /^\d{4}-(\d{2})-(\d{2})$/.exec(d || ''); return m ? `${+m[1]} 月 ${+m[2]} 日` : d; };
  function changedSinceRead() {
    if (!UPDATES) return [];
    const out = [];
    for (const [id, ts] of Object.entries(S.read)) {
      const u = UPDATES.items[id];
      if (u && u.changed && dayEnd(u.changed) > ts) out.push({ id, ...u });
    }
    return out.sort((a, b) => b.changed.localeCompare(a.changed));
  }
  function updBadge(id) {
    const u = UPDATES && UPDATES.items[id];
    if (!u) return '';
    if (u.changed && S.read[id] && dayEnd(u.changed) > S.read[id]) return '<span class="badge">改过</span>';
    if (u.added && Date.now() - new Date(`${u.added}T00:00:00+08:00`).getTime() < 30 * 864e5) return '<span class="badge new">新</span>';
    return '';
  }

  // ---------- 文字：加粗、交叉引用、术语 ----------
  let GLOSS_RE = null, GLOSS = new Map();
  function buildGloss() {
    if (!META.gloss || !META.gloss.length) return;
    GLOSS = new Map(META.gloss.map((g) => [g.t, g.m]));
    const parts = META.gloss.map((g) => {
      const e = g.t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return /^[A-Za-z0-9%. ]+$/.test(g.t) ? `(?<![A-Za-z0-9&#])${e}(?![A-Za-z0-9;])` : e;
    });
    try { GLOSS_RE = new RegExp(parts.join('|'), 'g'); } catch (e) { GLOSS_RE = null; }
  }
  function inline(s, c, withGloss) {
    let h = esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
    h = h.replace(/(本节|第\s*(\d{1,2})\s*节)\s*第\s*(\d{1,3})\s*条/g, (m, _a, cc, nn) => {
      const target = cc ? +cc : c;
      const cm = chap(target);
      return cm && +nn >= 1 && +nn <= cm.cnt ? `<a class="xref" href="#/read/${target}/${+nn}">${m}</a>` : m;
    });
    if (withGloss && GLOSS_RE) {
      const seen = new Set();
      h = h.replace(/(<[^>]*>)|([^<]+)/g, (all, tag, text) => tag || text.replace(GLOSS_RE, (m) => {
        if (seen.has(m)) return m;
        seen.add(m);
        return `<button type="button" class="term" data-term="${esc(m)}">${m}</button>`;
      }));
    }
    return h;
  }
  function hl(text, terms) {
    const s = String(text ?? '');
    const list = terms.filter(Boolean);
    if (!list.length) return esc(s);
    const re = new RegExp(list.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'gi');
    let out = '', last = 0;
    for (const m of s.matchAll(re)) {
      out += esc(s.slice(last, m.index)) + `<mark>${esc(m[0])}</mark>`;
      last = m.index + m[0].length;
    }
    return out + esc(s.slice(last));
  }

  // ---------- 外框：标签栏、阅读工具条、底部渐隐 ----------
  const FADE = '<div class="fadebot" aria-hidden="true"></div>';
  function tabbarHTML(active) {
    const tab = (key, href, icon, label, extra = '') => `<a href="${href}" class="tab ${extra}" ${active === key ? 'aria-current="page"' : ''}>${svg(icon, 21)}<span>${label}</span></a>`;
    return FADE + glass({ tag: 'nav', cls: 'tabbar float', t: 't-sea', proj: 'caustic', attrs: 'aria-label="主导航"',
      core: tab('toc', '#/', 'book', '目录') + tab('sos', '#/sos', 'aid', '急救', 'sos') + tab('me', '#/me', 'user', '我的') });
  }
  // 阅读底栏：收藏、做到了、分享和白色的「下一条」合成一整条，颜色跟这一节走
  function dockHTML(t = 't-sea') {
    return FADE + glass({ tag: 'nav', cls: 'dockbar float', t, proj: 'shade caustic', attrs: 'aria-label="这一条"', core: `
      <button class="act star" id="dock-fav" data-act="fav" aria-pressed="false">${svg('star', 21)}<span class="off">收藏</span><span class="on">已收藏</span></button>
      <button class="act done" id="dock-done" data-act="done" aria-pressed="false">${svg('check', 21, 2.1)}<span class="off">做到了</span><span class="on">已做到</span></button>
      <button class="act" data-act="share">${svg('share', 21)}<span>分享</span></button>
      <button class="nextbtn" data-act="next">${svg('down', 18, 2.4)}<span>下一条</span></button>` });
  }
  function setChrome(kind, active) {
    if (kind === 'tabs') chrome.innerHTML = tabbarHTML(active);
    else if (kind === 'dock') chrome.innerHTML = dockHTML(active);
    else if (kind === 'fade') chrome.innerHTML = FADE;
    else chrome.innerHTML = '';
  }

  // ---------- 常用片段 ----------
  const searchOrb = () => glass({ tag: 'a', cls: 'orb58 pj-orb', t: 't-blue', proj: 'caustic', attrs: 'href="#/search" aria-label="搜索"', core: svg('search', 22, 2) });
  const backOrb = (href) => glass({ tag: 'a', cls: 'orb56 pj-orb', t: 't-ink', proj: 'shade', attrs: `href="${href || '#/'}" data-act="back" aria-label="返回"`, core: svg('back', 20, 2.2) });
  const pageHead = (title, sub, withSearch) => `<header class="phead in d1"><div><h1>${title}</h1><p>${sub}</p></div>${withSearch ? searchOrb() : ''}</header>`;
  const chapT = (cm) => (cm.n === 13 ? 't-red' : KOU_T[cm.k] || 't-ink');
  const errHTML = (msg) => `<div class="err"><p>${msg}</p><button class="whitepill" data-act="retry">再试一次</button></div>`;

  // ---------- 加到主屏幕 ----------
  const UA = navigator.userAgent;
  const isIOS = /iPhone|iPad|iPod/.test(UA) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isWeChat = /MicroMessenger/i.test(UA);
  const isStandalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  let installEvt = null;
  addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvt = e; const t = $('#installtxt'); if (t) t.innerHTML = installHelp(); });
  addEventListener('appinstalled', () => { installEvt = null; toast('加好了，以后从桌面图标打开'); });
  function installHelp() {
    if (isStandalone) return '<p>你已经是从主屏幕打开的了，进度不会被清。</p>';
    if (isWeChat) return '<p>微信里加不了主屏幕。点右上角的「···」，选「在浏览器打开」，再按浏览器里的办法加。</p><p>也可以先点「···」收藏这一页，下次从微信收藏里打开，进度也还在。</p>';
    if (isIOS) return '<h4>iPhone、iPad</h4><p>用 Safari 打开这一页，点底部的分享按钮，往下找「添加到主屏幕」。</p><h4>为什么要加</h4><p>iPhone 上，网站如果在你用 Safari 的 7 天里一直没被打开，它存的进度会被清掉；加到主屏幕的不受影响。</p>';
    if (installEvt) return '<p>装到手机桌面上，下次一点就开，断网也能读。</p><button class="whitepill" data-act="install" style="margin-top:12px">安装到桌面</button>';
    return '<p>在浏览器菜单里找「添加到主屏幕」或「安装应用」。装好以后从桌面图标打开，下次一点就开。</p>';
  }
  function installBanner() {
    if (isStandalone || S.dismiss.install || S.visits < 2) return '';
    return slab({ t: 't-blue', cls: 'list banner in d5', proj: 'caustic', core: `<div class="lrow">${icon('device')}<a href="#/me" class="tx"><b>加到主屏幕</b><small>下次一点就开，进度也不会被清</small></a><button class="x" data-act="dismiss-install" aria-label="不再提示">${svg('x', 18, 2)}</button></div>` });
  }

  // ---------- 视图：阅读 ----------
  let readCtx = null;
  const chevLens = () => `<span class="mlens" aria-hidden="true">${svg('chev', 16, 2, ' class="chev"')}</span>`;
  function noteHTML(e) {
    const long = e.note.join('').length > 80;
    const warm = !!e.d;
    return `<div class="note${warm ? ' warm' : ''}${long ? ' clamp' : ''}"><small>${warm ? '<span class="dot" style="background:#FFB547;box-shadow:0 0 8px #FF9F1C"></span>' : ''}备注</small><p class="note-text">${e.note.map((x) => inline(x, e.c)).join('<br>')}</p>${long ? '<button class="more-btn" data-act="note">展开全文</button>' : ''}</div>`;
  }
  // 一条建议一块玻璃：抬头、标题、花掉/换回、说人话、备注、来源都在里面。
  // 折起来的「成本 · 收益原文 · 来源」单独一份文件（data/foot/），正文画出来以后再补进去
  function entryHTML(e) {
    const dot = LENS_DOT[e.k] || '#B9F25A';
    const tags = gradeTag(e.g) + (e.d ? tagS('争议', '#FFB547', 'amber') : '') + (e.r === '极高' ? tagS('性价比极高', '', 'hot') : '');
    return slab({ tag: 'article', t: KOU_T[e.k], cls: 'entry', attrs: `id="e-${e.id}" data-id="${e.id}" data-n="${e.n}"`, core: `
      <div class="ehead"><div class="lft"><span class="num">${e.n}</span><span class="where">第 ${e.c} 节 · 第 ${e.n} 条${updBadge(e.id)}</span></div><div class="tags">${tags}</div></div>
      <h2 class="etitle">${inline(e.t, e.c)}</h2>
      <div class="ledger">
        <div class="cell"><small>花掉</small><b>${MONEY[e.m] || esc(e.m)} · ${TIME[e.tm] || esc(e.tm)}<br>${WILL[e.w] || esc(e.w)}</b></div>
        <div class="cell"><small><span class="dot" style="width:6px;height:6px;background:${dot};box-shadow:0 0 6px ${dot}"></span>换回</small><b>${KOU[e.k]}<br>${LEVEL[e.lv] || esc(e.lv)}</b></div>
      </div>
      <span class="lbl">说人话</span>
      <p class="para">${glowNums(inline(e.plain, e.c))}</p>
      ${e.note.length ? noteHTML(e) : ''}
      <details class="foot">
        <summary><span>成本 · 收益原文 · 来源</span>${chevLens()}</summary>
        <div class="fbody" data-foot="${e.n}"><p class="wait">正在载入…</p></div>
      </details>` });
  }
  function footBody(c, [cost, gain, srcs]) {
    const src = srcs.map((s) => `<li>${esc(s.t)}${s.u.map((u, i) => ` <a href="${esc(u)}" target="_blank" rel="noopener">原文${s.u.length > 1 ? i + 1 : ''}</a>`).join('')}</li>`).join('');
    return `${cost ? `<h4>成本</h4><p>${inline(cost, c)}</p>` : ''}${gain.length ? `<h4>收益</h4>${gain.map((x) => `<p>${inline(x, c, true)}</p>`).join('')}` : ''}${src ? `<h4>来源</h4><ol class="srcs">${src}</ol>` : ''}`;
  }
  const FOOT = new Map();
  function loadFoot(c) {
    if (!FOOT.has(c)) {
      const p = getJSON(`data/foot/${pad(c)}.json`);
      FOOT.set(c, p);
      p.catch(() => FOOT.delete(c));
    }
    return FOOT.get(c);
  }
  function fillFoots(c) {
    loadFoot(c).then((f) => {
      if (+view.dataset.c !== c) return;
      for (const box of $$('.fbody[data-foot]', view)) {
        const x = f[box.dataset.foot];
        if (!x) continue;
        box.innerHTML = footBody(c, x);
        box.removeAttribute('data-foot');
      }
    }).catch(() => {
      if (+view.dataset.c !== c) return;
      for (const box of $$('.fbody[data-foot]', view)) box.innerHTML = '<p class="wait">成本、收益原文和来源还没存到手机上，连上网再展开就能看。</p>';
    });
  }
  // 没取到的时候，下次展开再取一次
  document.addEventListener('toggle', (ev) => {
    const d = ev.target;
    if (d.open && d.classList && d.classList.contains('foot') && $('.fbody[data-foot]', d) && view.dataset.c) fillFoots(+view.dataset.c);
  }, true);
  function chapterEnd(c) {
    const nx = chap(c + 1);
    const next = nx ? slab({ tag: 'a', t: chapT(nx), cls: 'list', attrs: `href="#/read/${nx.n}/1"`, proj: 'caustic', core: `<span class="lrow">${icon('arrow')}<span class="tx"><b>下一节：${esc(nx.s)}</b><small>第 ${nx.n} 节 · ${nx.cnt} 条</small></span>${goIcon()}</span>` }) : '<p>全书就到这里。</p>';
    return `<section class="cend"><p>第 ${c} 节到这里就完了</p>${next}<a class="linkline" href="#/toc">回目录</a></section>`;
  }
  async function viewRead(c, n, seq) {
    const cm = chap(c);
    if (!cm) { location.replace('#/toc'); return; }
    let ch;
    const terms = loadMeta().catch(() => null); // 术语解释要用，和正文一起取；没取到也照常显示正文
    try { ch = await loadChapter(c); } catch (err) {
      if (seq !== routeSeq) return;
      view.className = 'page'; view.innerHTML = errHTML('这一节还没存到手机上，连上网再打开一次就好。'); setChrome('tabs', 'toc'); return;
    }
    await Promise.all([terms, loadUpdates()]);
    if (seq !== routeSeq) return;
    const t = chapT(cm);
    const rc = readInChapter(c);
    view.className = 'page read';
    view.dataset.c = c;
    view.innerHTML = `
      <div class="fadetop" aria-hidden="true"></div>
      ${glass({ tag: 'header', cls: 'rbar float in d1', t, proj: 'shade caustic', core: `
        <a class="lensbtn" href="#/toc" aria-label="回目录">${svg('back', 19, 2.2)}</a>
        <span class="tbmid"><span class="tbtitle"><span class="rpt">第 ${c} 节 · ${esc(cm.s)}</span><span class="rpn" id="rpn"></span></span><span class="thin" aria-hidden="true"><i id="rbar" style="width:0"></i></span></span>
        <button class="lensbtn" data-act="settings" aria-label="阅读设置">Aa</button>` })}
      ${slab({ tag: 'section', t, cls: 'cover in d2', attrs: `aria-label="第 ${c} 节"`, core: `
        <div class="ctop">${tagS(`第 ${c} 节 · ${cm.cnt} 条`)}<span class="where">${rc === cm.cnt ? '读完了' : `已读 ${rc} / ${cm.cnt}`}</span></div>
        <h1>${esc(cm.t)}</h1>
        <span class="thin grow" aria-hidden="true"><i style="width:${(rc / cm.cnt * 100).toFixed(1)}%"></i></span>
        ${ch.intro.length ? `<details class="foot"><summary><span>本节导读</span>${chevLens()}</summary><div class="fbody intro">${ch.intro.map((p) => `<p>${inline(p, c)}</p>`).join('')}</div></details>` : ''}` })}
      ${ch.entries.map(entryHTML).join('')}
      ${chapterEnd(c)}`;
    setChrome('dock', t);
    const target = n || (S.resume && S.resume.c === c ? S.resume.n : firstUnread(c));
    const el = document.getElementById(`e-${c}-${target}`);
    if (el && target > 1) el.scrollIntoView({ block: 'start' }); else window.scrollTo(0, 0);
    startReading(c, cm.cnt, el && target > 1 ? el : null);
    fillFoots(c);
  }
  function startReading(c, cnt, initEl) {
    const arts = $$('.entry', view);
    const ctx = readCtx = { c, cnt, current: null, dwell: 0, io: null };
    const setCur = (a) => {
      if (ctx.current === a) return;
      const prev = ctx.current;
      ctx.current = a;
      const n = +a.dataset.n, id = a.dataset.id;
      if (prev && +prev.dataset.n < n) markRead(prev.dataset.id);
      S.resume = { c, n, at: now() };
      save();
      if (location.hash !== `#/read/${c}/${n}`) history.replaceState(null, '', `#/read/${c}/${n}`);
      const rpn = $('#rpn'), bar = $('#rbar');
      if (rpn) rpn.textContent = `${n} / ${cnt}`;
      if (bar) bar.style.width = `${(n / cnt * 100).toFixed(1)}%`;
      updateDock(id);
      clearTimeout(ctx.dwell);
      ctx.dwell = setTimeout(() => markRead(id), 6000);
    };
    ctx.setCur = setCur;
    ctx.io = new IntersectionObserver((list) => { for (const it of list) if (it.isIntersecting) setCur(it.target); }, { rootMargin: '-34% 0px -60% 0px' });
    arts.forEach((a) => ctx.io.observe(a));
    if (arts.length) setCur(initEl || arts[0]);
  }
  function updateDock(id) {
    const f = $('#dock-fav'), d = $('#dock-done');
    if (f) f.setAttribute('aria-pressed', S.fav[id] ? 'true' : 'false');
    if (d) d.setAttribute('aria-pressed', S.done[id] ? 'true' : 'false');
  }
  function toggleMark(kind, btn) {
    const id = readCtx && readCtx.current && readCtx.current.dataset.id;
    if (!id) return;
    const map = kind === 'fav' ? S.fav : S.done;
    if (map[id]) delete map[id]; else map[id] = now();
    save();
    updateDock(id);
    btn.classList.remove('popping'); void btn.offsetWidth; btn.classList.add('popping');
    if (kind === 'fav') toast(map[id] ? '收好了，在「我的」里能找到' : '取消收藏了');
    else toast(map[id] ? '记上了，做到一条' : '取消了');
  }
  function nextEntry() {
    const cur = readCtx && readCtx.current;
    if (!cur) return;
    markRead(cur.dataset.id);
    let nx = cur.nextElementSibling;
    while (nx && !nx.classList.contains('entry')) nx = nx.classList.contains('cend') ? null : nx.nextElementSibling;
    if (nx) nx.scrollIntoView({ behavior: smooth(), block: 'start' });
    else if (chap(readCtx.c + 1)) location.hash = `#/read/${readCtx.c + 1}/1`;
    else toast('全书读完了');
  }
  async function shareEntry(id) {
    const [c, n] = id.split('-').map(Number);
    const title = titleAt(c, n) || `第 ${c} 节第 ${n} 条`;
    const url = `${location.origin}${location.pathname}#/read/${c}/${n}`;
    const text = `${title}（《高性价比人生指南》第 ${c} 节第 ${n} 条）`;
    if (navigator.share) {
      try { await navigator.share({ title, text, url }); return; } catch (e) { if (e.name === 'AbortError') return; }
    }
    await copyText(`${text} ${url}`);
    toast('链接已复制');
  }
  function randomEntry() {
    const top = [], rest = [];
    for (const cm of META.chapters) for (let n = 1; n <= cm.cnt; n++) {
      if (S.read[`${cm.n}-${n}`]) continue;
      (cm.tiers[n - 1] === 'X' ? top : rest).push([cm.n, n]);
    }
    const pool = top.length ? top : rest.length ? rest : [[1, 1]];
    const [c, n] = pool[Math.floor(Math.random() * pool.length)];
    location.hash = `#/read/${c}/${n}`;
  }

  // ---------- 视图：目录（打开就是这一页） ----------
  // 从上往下：上次读到哪（读过才有）、按处境找、按换回什么筛、34 节；别的读法放在目录底下
  const TOC_KEYS = [['all', '全部'], ['life', '寿命'], ['money', '钱'], ['time', '时间精力'], ['free', '人身自由']];
  function resumeHTML() {
    const r = S.resume, cm = r && chap(r.c);
    if (!cm) return '';
    const n = Math.min(Math.max(1, r.n), cm.cnt);
    const rc = readInChapter(r.c);
    return slab({ t: KOU_T[lensAt(r.c, n)], cls: 'list tocgrp resumegrp in d2', proj: 'caustic', attrs: 'aria-label="上次读到"', core: `
      <a class="lrow resumerow" href="#/read/${r.c}/${n}"><span class="bead ${chapT(cm)}">${r.c}</span><span class="tx"><b id="rsttl">${esc(titleAt(r.c, n) || `第 ${r.c} 节 · ${cm.s}`)}</b><small>上次读到第 ${n} 条${rc ? ` · 本节读了 ${rc}` : ''}</small></span><span class="rgo">接着读</span></a>` });
  }
  // 目录画完以后再补两样：上次那条的标题（在 meta.json 里）、原书改动的条数（在 updates.json 里）
  function fillToc(seq) {
    const r = S.resume, cm = r && chap(r.c);
    if (cm && !titleAt(r.c, r.n)) {
      loadMeta().then(() => {
        if (seq !== routeSeq) return;
        const el = $('#rsttl'), t = titleAt(r.c, Math.min(Math.max(1, r.n), cm.cnt));
        if (el && t) el.textContent = t;
      }).catch(() => {});
    }
    loadUpdates().then(() => {
      if (seq !== routeSeq) return;
      const lab = $('#updlabel'), sub = $('#updsub'), cnt = $('#updcount');
      if (!sub) return;
      const added = Object.values(UPDATES.items).filter((v) => v.added).length;
      const changed = changedSinceRead().length;
      const grp = $('.resumegrp .core');
      if (changed && grp) {
        grp.insertAdjacentHTML('beforeend', `${SEP}${lrow({ tg: 'a', attrs: 'href="#/updates"', ic: icon('spark'), title: '读过的改了', sub: '你读过的条目，原书后来改了', right: `<span class="cnt">${changed}</span>` })}`);
      } else if (changed) {
        lab.textContent = '读过的改了'; sub.textContent = '你读过的条目，原书后来改了'; cnt.textContent = changed;
        return;
      }
      sub.textContent = UPDATES.since ? `${fmtDate(UPDATES.since)}以来新增的条目` : '新增和改过的条目';
      if (added) cnt.textContent = added; else cnt.remove();
    });
  }
  async function viewToc(seq) {
    let f = 'all';
    try { f = sessionStorage.getItem('tocf') || 'all'; } catch (e) { /* 忽略 */ }
    const st = META.stats, read = readCount();
    view.className = 'page live';
    view.innerHTML = `
      ${pageHead('高性价比人生指南', `随身读 · ${META.chapters.length} 节 · ${read ? `已读 ${read} / ${st.entries}` : `${st.entries} 条建议`}`, true)}
      ${resumeHTML()}
      ${slab({ tag: 'nav', t: 't-money', cls: 'scenes in d2', attrs: 'aria-label="按处境找"', proj: 'caustic', core: `<span class="lbl">按处境找</span><div class="tagwrap">${META.content.scenes.map((s) => { const d = LENS_DOT[s.k] || '#FF8A5C'; return `<a class="tag lg" href="${s.to}"><span class="dot" style="background:${d};box-shadow:0 0 8px ${d}"></span>${esc(s.label)}</a>`; }).join('')}</div>` })}
      ${glass({ tag: 'div', cls: 'segwrap tocseg in d3', t: 't-ink', proj: 'shade', coreCls: 'seg', coreAttrs: 'id="tocseg" role="group" aria-label="按换回什么筛" style="grid-template-columns:repeat(5,minmax(0,1fr))"',
        core: `<span class="seglens" aria-hidden="true" style="width:calc((100% - 10px) / 5)"></span>${TOC_KEYS.map(([k, l]) => `<button data-act="tocf" data-k="${k}" aria-pressed="${k === f}">${l}</button>`).join('')}` })}
      ${slab({ t: 't-ink', cls: 'list tocslab in d4', proj: 'caustic', core: '<div id="tocrows"></div>' })}
      ${slab({ t: 't-sea', cls: 'list tocgrp in d5', proj: 'caustic', attrs: 'aria-label="别的读法"', core: `
        ${lrow({ tg: 'button', attrs: 'data-act="random"', ic: icon('shuffle'), title: '随手翻一条', sub: '先挑你没读过的、性价比极高的', right: goIcon() })}
        ${SEP}
        ${lrow({ tg: 'a', attrs: 'href="#/search?f=top"', ic: icon('spark'), title: `先看性价比最高的 ${st.top} 条`, sub: '不花钱、不费事，换回又大', right: goIcon() })}
        ${SEP}
        ${lrow({ tg: 'a', attrs: 'href="#/updates"', ic: icon('refresh'), title: '<span id="updlabel">原书最近的改动</span>', sub: '<span id="updsub">新增和改过的条目</span>', right: '<span class="cnt" id="updcount" aria-hidden="true">·</span>' })}` })}
      ${installBanner()}
      <p class="tagline">不用全做，挑走一两条就算数。</p>`;
    renderToc(f);
    setChrome('tabs', 'toc');
    fillToc(seq);
  }
  function renderToc(f) {
    try { sessionStorage.setItem('tocf', f); } catch (e) { /* 忽略 */ }
    const i = Math.max(0, TOC_KEYS.findIndex(([k]) => k === f));
    const lens = $('#tocseg .seglens');
    if (lens) lens.style.transform = `translateX(${i * 100}%)`;
    $$('#tocseg button').forEach((b) => b.setAttribute('aria-pressed', b.dataset.k === f ? 'true' : 'false'));
    const letter = { life: 'l', money: 'm', time: 't', free: 'f' }[f];
    $('#tocrows').innerHTML = META.chapters.map((cm) => {
      const cnt = letter ? [...cm.lens].filter((x) => x === letter).length : cm.cnt;
      if (!cnt) return '';
      const rc = readInChapter(cm.n);
      const here = S.resume && S.resume.c === cm.n;
      const first = letter ? [...cm.lens].indexOf(letter) + 1 : (here ? S.resume.n : firstUnread(cm.n));
      const meta = letter ? `${cnt} 条换回${KOU[f]}` : `${cm.cnt} 条${here ? ` · 读到第 ${S.resume.n} 条` : rc ? (rc === cm.cnt ? ' · 读完了' : ` · 已读 ${rc}`) : ''}`;
      return `<a class="lrow" href="#/read/${cm.n}/${first}"><span class="bead ${chapT(cm)}">${cm.n}</span><span class="tx"><b>${esc(cm.t)}</b><small>${meta}</small>${rc && !letter ? `<span class="minitube ${KOU_T[cm.k]}"><i style="width:${(rc / cm.cnt * 100).toFixed(1)}%"></i></span>` : ''}</span>${goIcon()}</a>`;
    }).filter(Boolean).join(SEP);
  }

  // ---------- 视图：搜索 ----------
  const FILTERS = [['a', '证据 A', 't-life'], ['free', '不花钱', 't-money'], ['easy', '不费毅力', 't-blue'], ['top', '性价比极高', 't-life'], ['k-life', '寿命', 't-life'], ['k-money', '钱', 't-money'], ['k-time', '时间精力', 't-blue'], ['k-free', '人身自由', 't-violet']];
  let SS = null;
  function rcard(e, terms) {
    return slab({ tag: 'a', t: KOU_T[e.k], cls: 'rcard', attrs: `href="#/read/${e.c}/${e.n}"`, core: `
      <div class="tagrow">${tagS(`第 ${e.c} 节 · 第 ${e.n} 条`)}${gradeTag(e.g)}${e.m === '0' ? tagS('0 元') : ''}${e.r === '极高' ? tagS('性价比极高', '', 'hot') : ''}</div>
      <span class="ct">${hl(e.t, terms)}</span>
      <span class="cp">${hl(e.p, terms)}</span>` });
  }
  async function viewSearch(params, seq) {
    SS = { q: params.get('q') || '', fs: new Set((params.get('f') || '').split(',').filter(Boolean)), shown: 30, res: [] };
    view.className = 'page live';
    view.innerHTML = `
      <div class="backrow in d1">
        ${backOrb('#/')}
        ${glass({ tag: 'label', cls: 'clear sfield', t: 't-clear', proj: 'shade caustic', core: `<input class="qin" id="q" type="search" enterkeyhint="search" placeholder="搜一条建议" aria-label="搜一条建议" autocomplete="off" value="${esc(SS.q)}"><span class="chevbox" aria-hidden="true" style="width:46px;height:42px;border-radius:14px">${svg('search', 20, 2)}</span>` })}
      </div>
      ${slab({ t: 't-ink', cls: 'ftags in d2', attrs: 'role="group" aria-label="只看这些"', proj: 'caustic', core: `<span class="lbl">只看</span><div class="tagwrap">${FILTERS.map(([k, l, t]) => `<button class="tag lg ${t}" data-act="filter" data-k="${k}" aria-pressed="${SS.fs.has(k)}">${l}</button>`).join('')}</div>` })}
      <p class="hint in d3" id="hint"></p>
      <div class="cards" id="results"></div>
      <div class="morelist" id="more"></div>`;
    setChrome('fade');
    const input = $('#q');
    input.addEventListener('input', debounce(() => { SS.shown = 30; doSearch(); }, 160));
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') input.blur(); });
    $('#hint').textContent = '正在载入全书索引…';
    await loadIndex();
    if (seq !== routeSeq) return;
    doSearch();
    if (!SS.q && matchMedia('(pointer: fine)').matches) input.focus();
  }
  function runSearch(q, fs) {
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    const lens = ['k-life', 'k-money', 'k-time', 'k-free'].filter((k) => fs.has(k)).map((k) => k.slice(2));
    const list = INDEX.filter((e) => (!fs.has('a') || e.g === 'A') && (!fs.has('free') || e.m === '0') && (!fs.has('easy') || e.w === '否') && (!fs.has('top') || e.r === '极高') && (!lens.length || lens.includes(e.k)));
    if (!terms.length) return { list, terms };
    const scored = [];
    for (const e of list) {
      const t = e.t.toLowerCase(), p = e.p.toLowerCase(), c = e.cost.toLowerCase();
      let s = 0, ok = true;
      for (const w of terms) {
        const v = (t.includes(w) ? 6 : 0) + (p.includes(w) ? 3 : 0) + (c.includes(w) ? 1 : 0);
        if (!v) { ok = false; break; }
        s += v;
      }
      if (ok) scored.push([s, e]);
    }
    scored.sort((a, b) => b[0] - a[0] || a[1].c - b[1].c || a[1].n - b[1].n);
    return { list: scored.map((x) => x[1]), terms };
  }
  function doSearch() {
    const input = $('#q');
    if (!input || !INDEX) return;
    SS.q = input.value.trim();
    const qs = new URLSearchParams();
    if (SS.q) qs.set('q', SS.q);
    if (SS.fs.size) qs.set('f', [...SS.fs].join(','));
    history.replaceState(null, '', `#/search${qs.toString() ? `?${qs}` : ''}`);
    if (!SS.q && !SS.fs.size) {
      $('#hint').textContent = '可以搜病、事、钱的名目，也可以只点上面的标签筛。';
      $('#results').innerHTML = slab({ t: 't-sea', cls: 'suggest', proj: 'caustic', core: `<span class="lbl">可以这样搜</span><div class="tagwrap">${['低钠盐', '失业', '押金', '自动续费', '止付', 'HPV', '房贷', '孩子'].map((w) => `<button class="tag lg" data-act="suggest" data-q="${w}">${w}</button>`).join('')}</div>` });
      $('#more').innerHTML = '';
      return;
    }
    const { list, terms } = runSearch(SS.q, SS.fs);
    SS.res = list; SS.terms = terms;
    $('#hint').textContent = list.length ? `找到 ${list.length} 条` : '没找到，换个说法试试，或者少点几个标签';
    renderResults();
  }
  function renderResults() {
    $('#results').innerHTML = SS.res.slice(0, SS.shown).map((e) => rcard(e, SS.terms)).join('');
    $('#more').innerHTML = SS.res.length > SS.shown ? `<button class="whitepill" data-act="more-results">再显示 30 条</button>` : '';
  }

  // ---------- 视图：读过的改了 ----------
  let addedList = [], addedShown = 20;
  const FIELD_ORDER = ['标题', '成本', '说人话', '收益', '证据等级', '来源', '备注'];
  async function viewUpdates(seq) {
    await Promise.all([loadUpdates(), loadMeta().catch(() => null)]);
    if (seq !== routeSeq) return;
    const changed = changedSinceRead();
    const totalChanged = Object.values(UPDATES.items).filter((v) => v.changed).length;
    addedList = Object.entries(UPDATES.items).filter(([, v]) => v.added).sort((a, b) => b[1].added.localeCompare(a[1].added));
    addedShown = 20;
    const ucard = (u, i) => {
      const [c, n] = u.id.split('-').map(Number);
      const fields = FIELD_ORDER.filter((f) => (u.fields || []).includes(f));
      return slab({ tag: 'a', t: 't-violet', cls: `rcard in d${Math.min(8, i + 2)}`, attrs: `href="#/read/${c}/${n}"`, core: `
        <div class="tagrow">${tagS(`${fmtDate(u.changed)}改`)}${tagS(`第 ${c} 节 · 第 ${n} 条`)}</div>
        <span class="ct">${esc(titleAt(c, n))}</span>
        <div class="tagrow" style="margin-top:12px">${fields.map((f) => `<span class="fp">${f}</span>`).join('')}</div>` });
    };
    view.className = 'page live';
    view.innerHTML = `
      <div class="backrow in d1">${backOrb('#/')}<div><h1>读过的改了</h1><p>${changed.length ? `你读过的条目里，有 ${changed.length} 条后来改过` : '你读过的条目里，暂时没有改过的'}</p></div></div>
      <div class="cards">${changed.length ? changed.slice(0, 60).map(ucard).join('') : textSlab(`原书改得很勤，${fmtDate(UPDATES.since)}以来改过 ${totalChanged} 条。你读过的条目以后要是改了，会出现在这里，还会标出改的是哪一栏。`, 't-violet', 'in d2')}</div>
      <h2 class="sechead in d3">${fmtDate(UPDATES.since)}以来新增 ${addedList.length} 条</h2>
      <div class="cards" id="addlist"></div>
      <div class="morelist" id="addmore"></div>`;
    renderAdded();
    setChrome('fade');
  }
  function renderAdded() {
    $('#addlist').innerHTML = addedList.slice(0, addedShown).map(([id, v]) => {
      const [c, n] = id.split('-').map(Number);
      return slab({ tag: 'a', t: KOU_T[lensAt(c, n)], cls: 'rcard', attrs: `href="#/read/${c}/${n}"`, core: `
        <div class="tagrow">${tagS(`${fmtDate(v.added)}新增`)}${tagS(`第 ${c} 节 · 第 ${n} 条`)}</div>
        <span class="ct">${esc(titleAt(c, n))}</span>` });
    }).join('');
    $('#addmore').innerHTML = addedList.length > addedShown ? '<button class="whitepill" data-act="more-added">再显示 20 条</button>' : '';
  }

  // ---------- 视图：急救、按压 ----------
  let cacheStatus = null;
  function offlineBadge() {
    if (!('serviceWorker' in navigator)) return '<span class="dot" style="background:#FFC93D;box-shadow:0 0 8px #FFB020"></span>联网时可看';
    if (cacheStatus && cacheStatus.done === cacheStatus.total) return '<span class="dot" style="background:#22C55E;box-shadow:0 0 8px #22C55E"></span>已存到手机';
    return '<span class="dot" style="background:#FFC93D;box-shadow:0 0 8px #FFB020"></span>正在存到手机';
  }
  async function viewSOS() {
    view.className = 'page live';
    view.innerHTML = `
      <header class="phead in d1"><div><h1>急救</h1><p>几分钟内要做的事 · <span id="offbadge">${offlineBadge()}</span></p></div></header>
      ${slab({ tag: 'section', t: 't-red', cls: 'sosgrid in d2', attrs: 'aria-label="先做什么"', core: `
        <div class="sgrid">${META.content.sos.map((s) => {
          const [c, n] = s.id.split('-');
          return `<a class="scell${s.tone === 'red' ? ' hot' : ''}" href="${s.href || `#/read/${c}/${n}`}"><b>${esc(s.label)}</b><span>${esc(s.line)}</span></a>`;
        }).join('')}</div>
        <a class="footrow" href="#/read/13/1"><span>看第 13 节全部 ${chap(13) ? chap(13).cnt : ''} 条</span>${goIcon()}</a>` })}`;
    setChrome('tabs', 'sos');
    askCacheStatus();
  }
  let beepTimer = null, actx = null, wakeLock = null;
  async function keepAwake(on) {
    try {
      if (on && 'wakeLock' in navigator) wakeLock = await navigator.wakeLock.request('screen');
      else if (!on && wakeLock) { await wakeLock.release(); wakeLock = null; }
    } catch (e) { /* 不支持就算了 */ }
  }
  function stopBeep() {
    if (beepTimer) { clearInterval(beepTimer); beepTimer = null; }
    const b = $('[data-act="beep"]');
    if (b) { b.setAttribute('aria-pressed', 'false'); b.lastChild.textContent = ' 打开节拍声'; }
  }
  function toggleBeep(btn) {
    if (beepTimer) { stopBeep(); return; }
    try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { toast('这个浏览器放不了声音'); return; }
    const tick = () => {
      const o = actx.createOscillator(), g = actx.createGain(), t = actx.currentTime;
      o.frequency.value = 880;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.35, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
      o.connect(g).connect(actx.destination);
      o.start(t); o.stop(t + 0.13);
    };
    actx.resume && actx.resume();
    const m = $('#metro'), r = $('#metroring');
    [m, r].forEach((x) => { if (x) { x.style.animation = 'none'; void x.offsetWidth; x.style.animation = ''; } });
    tick();
    beepTimer = setInterval(tick, 500);
    btn.setAttribute('aria-pressed', 'true');
    btn.lastChild.textContent = ' 关掉节拍声';
  }
  async function viewCPR() {
    const p = META.content.cpr;
    view.className = 'page live';
    view.innerHTML = `
      <div class="backrow in d1">${backOrb('#/sos')}${glass({ tag: 'a', cls: 'rpill', t: 't-red', proj: 'caustic', attrs: 'href="#/read/13/1"', core: `<span class="rpt">第 13 节 · 第 1 条</span><span class="rpn">证据 A</span>` })}</div>
      <h1 class="cprt in d2">${esc(p.title)}</h1>
      <p class="cprl in d2">${esc(p.line)}</p>
      <div class="metro t-red in d3"><span aria-hidden="true" class="proj caustic"></span><span aria-hidden="true" class="ring beatring" id="metroring"></span>${glass({ tag: 'div', cls: 'beat', t: 't-red', proj: '', attrs: 'id="metro" role="img" aria-label="按压节奏：每秒约 2 次"', core: '<b>按</b><small>每秒约 2 次</small>' })}</div>
      <div class="metrotools in d3"><button data-act="beep" aria-pressed="false">${svg('sound', 16, 2)}<span> 打开节拍声</span></button></div>
      ${slab({ tag: 'section', t: 't-red', cls: 'cprslab in d4', attrs: 'aria-label="怎么按"', core: `
        <span class="lbl">怎么按</span>
        <div class="steps">${p.steps.map((s, i) => `<div class="step"><span class="stepn">${i + 1}</span><span>${inline(s, 13)}</span></div>`).join('')}</div>
        <div class="warnp">${svg('warn', 16, 2)}<span>${esc(p.dont)}</span></div>
        <p class="infant">${inline(p.infant, 13)}</p>` })}`;
    setChrome('fade');
    keepAwake(true);
  }

  // ---------- 视图：我的 ----------
  let swWaiting = null;
  function switchHTML(key, on, label) {
    return `<button class="switch" role="switch" aria-checked="${on ? 'true' : 'false'}" aria-label="${label}" data-act="switch" data-k="${key}"><span class="track"></span><span class="knob"></span></button>`;
  }
  // 字号：刻在玻璃里的凹槽，亮镜片滑到选中的那一格
  function fsSeg() {
    const idx = { s: 0, m: 1, l: 2 }[S.prefs.fs] ?? 1;
    return `<div class="eseg" data-seg="fs" role="group" aria-label="字号"><span class="seglens" aria-hidden="true" style="transform:translateX(${idx * 100}%)"></span>${[['s', '小'], ['m', '中'], ['l', '大']].map(([v, l]) => `<button data-act="fs" data-v="${v}" aria-pressed="${S.prefs.fs === v}">${l}</button>`).join('')}</div>`;
  }
  const themeSub = () => (S.prefs.theme === 'auto' ? '跟着手机设置走' : isDark() ? '已打开' : '已关掉');
  async function viewMe() {
    const total = readCount(), fav = Object.keys(S.fav).length, done = Object.keys(S.done).length;
    const dots = META.chapters.map((cm) => {
      const rc = readInChapter(cm.n);
      if (!rc) return '<i></i>';
      const col = LENS_DOT[cm.k];
      const p = rc / cm.cnt * 100;
      return p >= 100 ? `<i style="background:${col};box-shadow:0 0 6px ${col}"></i>` : `<i style="background:conic-gradient(${col} 0 ${p.toFixed(0)}%,rgba(255,255,255,.14) 0)"></i>`;
    }).join('');
    view.className = 'page live';
    view.innerHTML = `
      ${pageHead('我的', '不用登录 · 进度存在这台手机上', false)}
      ${slab({ tag: 'section', t: 't-sea', cls: 'mecard in d2', attrs: 'aria-label="阅读进度"', core: `
        <div class="r1"><span class="rl"><span class="num">${total}</span><span class="of">/ ${META.stats.entries} 条已读</span></span><span class="rr"><a class="tag" href="#/list/fav">收藏 ${fav}</a><a class="tag" href="#/list/done">做到了 ${done}</a></span></div>
        <span class="tube dark grow" aria-hidden="true"><i style="width:${Math.max(total ? 1.5 : 0, total / META.stats.entries * 100).toFixed(1)}%"></i></span>
        <span class="dots" aria-hidden="true">${dots}</span>` })}
      ${swWaiting ? slab({ tag: 'button', t: 't-money', cls: 'list megrp in d3', attrs: 'data-act="update"', proj: 'caustic', core: `<span class="lrow">${icon('refresh')}<span class="tx"><b>有新内容</b><small>点一下换上新版本，读到哪还在哪</small></span>${goIcon()}</span>` }) : ''}
      ${slab({ t: 't-ink', cls: 'list megrp in d3', attrs: 'aria-label="存到手机"', proj: 'caustic', core: `
        ${lrow({ tg: 'div', ic: icon('dl'), title: '全书存到手机', sub: '<span id="cachetxt">正在检查…</span>', right: '<span class="dot" id="cachedot" style="width:10px;height:10px;background:#888"></span>' })}
        ${SEP}
        <details>${lrow({ tg: 'summary', ic: icon('device'), title: '加到主屏幕', sub: isStandalone ? '已经加好了' : '一点就开，进度不会被清', right: goIcon('chev') })}<div class="dbody" id="installtxt">${installHelp()}</div></details>
        ${SEP}
        ${lrow({ tg: 'button', attrs: 'data-act="export"', ic: icon('send'), title: '把进度发给自己', sub: '换手机、换浏览器都能接上', right: goIcon() })}` })}
      ${slab({ t: 't-ink', cls: 'list megrp in d4', attrs: 'aria-label="阅读设置"', proj: 'caustic', core: `
        ${lrow({ tg: 'div', ic: icon('moon', 19), title: '夜间模式', sub: `<span id="themesub">${themeSub()}</span>`, right: switchHTML('theme', isDark(), '夜间模式') })}
        ${SEP}
        ${lrow({ tg: 'div', ic: '<span class="ic" aria-hidden="true" style="font-size:15px;font-weight:700">Aa</span>', title: '字号', right: fsSeg() })}
        ${SEP}
        ${lrow({ tg: 'div', ic: icon('spark'), title: '简化特效', sub: autoLite ? '这台设备已自动简化' : '旧手机上滑起来更顺', right: switchHTML('lite', !!S.prefs.lite, '简化特效') })}` })}
      <p class="foot">内容来自《高性价比人生指南》（<a href="https://github.com/eternity4719/HowToLiveBetter" target="_blank" rel="noopener">eternity4719/HowToLiveBetter</a>），按 <a href="https://creativecommons.org/licenses/by/4.0/deed.zh-hans" target="_blank" rel="noopener">CC BY 4.0</a> 使用。条目正文没有改动，排版、分组和急救页的摘要由本站整理。这是读者做的非官方页面，同步于 ${META.synced.slice(0, 4)} 年 ${fmtDate(META.synced)}的版本（${META.commit}），以原仓库为准；原文有错请到原仓库提 issue。</p>`;
    setChrome('tabs', 'me');
    refreshCacheUI();
    askCacheStatus();
  }
  async function viewList(kind, seq) {
    await loadIndex();
    if (seq !== routeSeq) return;
    const map = kind === 'fav' ? S.fav : S.done;
    const by = new Map(INDEX.map((e) => [e.id, e]));
    const list = Object.entries(map).sort((a, b) => b[1] - a[1]).map(([id]) => by.get(id)).filter(Boolean);
    view.className = 'page live';
    view.innerHTML = `
      <div class="backrow in d1">${backOrb('#/me')}<div><h1>${kind === 'fav' ? '我的收藏' : '做到了'}</h1><p>${list.length} 条</p></div></div>
      <div class="cards">${list.map((e) => rcard(e, [])).join('') || textSlab(kind === 'fav' ? '读到想留着的，点底下的星星，就会收在这里。' : '做到一条，点「做到了」记一笔。挑走一两条就算数。', kind === 'fav' ? 't-life' : 't-blue', 'in d2')}</div>`;
    setChrome('fade');
  }

  // ---------- 进度链接：不用账号，把已读、收藏、位置压成一个链接 ----------
  const b64u = (bytes) => { let s = ''; bytes.forEach((b) => { s += String.fromCharCode(b); }); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
  const unb64u = (s) => { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; const bin = atob(s); return Uint8Array.from(bin, (ch) => ch.charCodeAt(0)); };
  function encodeProgress() {
    const parts = [];
    for (const cm of META.chapters) {
      const bytes = new Uint8Array(Math.ceil(cm.cnt / 8));
      let any = false;
      for (let n = 1; n <= cm.cnt; n++) if (S.read[`${cm.n}-${n}`]) { bytes[(n - 1) >> 3] |= 128 >> ((n - 1) & 7); any = true; }
      if (any) parts.push(`${cm.n}.${b64u(bytes)}`);
    }
    const payload = ['1', parts.join('~'), Object.keys(S.fav).join('~'), Object.keys(S.done).join('~'), S.resume ? `${S.resume.c}-${S.resume.n}` : ''].join('|');
    return b64u(new TextEncoder().encode(payload));
  }
  function decodeProgress(code) {
    const [v, r, f, d, p] = new TextDecoder().decode(unb64u(code)).split('|');
    if (v !== '1') throw new Error('版本不对');
    const read = {};
    for (const part of (r || '').split('~').filter(Boolean)) {
      const [c, b] = part.split('.');
      const cm = chap(+c);
      if (!cm || !b) continue;
      const bytes = unb64u(b);
      for (let i = 0; i < cm.cnt; i++) if (bytes[i >> 3] & (128 >> (i & 7))) read[`${cm.n}-${i + 1}`] = 1;
    }
    const ids = (x) => (x || '').split('~').map((id) => /^(\d+)-(\d+)$/.exec(id)).filter((m) => {
      if (!m) return false;
      const cm = chap(+m[1]), n = +m[2];
      return cm && n >= 1 && n <= cm.cnt;
    }).map((m) => `${+m[1]}-${+m[2]}`);
    const pm = /^(\d+)-(\d+)$/.exec(p || '');
    const rcm = pm && chap(+pm[1]);
    const rn = pm ? +pm[2] : 0;
    const resume = rcm && rn >= 1 && rn <= rcm.cnt ? { c: rcm.n, n: rn } : null;
    return { read, fav: ids(f), done: ids(d), resume };
  }
  let exportURL = '';
  function exportProgress() {
    exportURL = `${location.origin}${location.pathname}#/p/${encodeProgress()}`;
    openSheet(`<div class="sh"><b>把进度发给自己</b><button class="whitepill" data-act="close-sheet">完成</button></div>
      <p>把这个链接发到「文件传输助手」或者存进备忘录。在另一台手机、另一个浏览器里打开它，已读、收藏和上次读到的位置都能接上。</p>
      <div class="linkbox">${esc(exportURL)}</div>
      <div class="acts"><button class="whitepill" data-act="copy-link">复制链接</button>${navigator.share ? '<button class="whitepill" data-act="share-link">发出去</button>' : ''}</div>`, '把进度发给自己');
  }
  async function viewImport(code) {
    let data;
    try { data = decodeProgress(code); } catch (e) { view.className = 'page'; view.innerHTML = errHTML('这个进度链接打不开，可能复制得不完整。'); setChrome('none'); return; }
    view.className = 'page live';
    view.innerHTML = `
      <div class="backrow in d1">${backOrb('#/')}<div><h1>接上进度</h1><p>从另一台手机或浏览器带过来的</p></div></div>
      ${textSlab(`这个链接里有 <b>${Object.keys(data.read).length}</b> 条已读、<b>${data.fav.length}</b> 条收藏、<b>${data.done.length}</b> 条做到了${data.resume ? `，上次读到第 ${data.resume.c} 节第 ${data.resume.n} 条` : ''}。合并以后，这台手机上原来的记录也会留着。`, 't-sea', 'in d2')}
      <div class="morelist"><button class="whitepill" data-act="import" data-code="${esc(code)}">合并到这台手机</button></div>`;
    setChrome('none');
  }
  function doImport(code) {
    const d = decodeProgress(code), t = now();
    for (const id of Object.keys(d.read)) if (!S.read[id]) S.read[id] = t;
    for (const id of d.fav) if (!S.fav[id]) S.fav[id] = t;
    for (const id of d.done) if (!S.done[id]) S.done[id] = t;
    if (d.resume && !S.resume) S.resume = { ...d.resume, at: t };
    save();
    toast('接上了');
    location.hash = '#/';
  }
  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); return true; } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = text; ta.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); } catch (e2) { /* 忽略 */ }
      ta.remove();
      return true;
    }
  }

  // ---------- 弹层、提示 ----------
  let toastT = 0;
  function toast(msg, ms = 2200) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastT);
    toastT = setTimeout(() => el.classList.remove('show'), ms);
  }
  function openSheet(html, label) {
    const root = $('#sheet-root');
    root.innerHTML = `<div class="scrim" data-act="close-sheet"></div><div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(label)}">${html}</div>`;
    root.classList.add('open');
    const f = $('.sheet button, .sheet a', root);
    if (f) f.focus({ preventScroll: true });
  }
  function closeSheet() {
    const root = $('#sheet-root');
    root.classList.remove('open');
    root.innerHTML = '';
  }
  function openSettings() {
    openSheet(`<div class="sh"><b>阅读设置</b><button class="whitepill" data-act="close-sheet">完成</button></div>
      <div class="srow"><span>字号</span>${fsSeg()}</div>
      <div class="srow"><span>夜间模式</span>${switchHTML('theme', isDark(), '夜间模式')}</div>
      <div class="srow"><span>简化特效</span>${switchHTML('lite', !!S.prefs.lite, '简化特效')}</div>`, '阅读设置');
  }
  function syncSwitches() {
    $$('[data-act="switch"][data-k="theme"]').forEach((b) => b.setAttribute('aria-checked', isDark() ? 'true' : 'false'));
    $$('[data-act="switch"][data-k="lite"]').forEach((b) => b.setAttribute('aria-checked', S.prefs.lite ? 'true' : 'false'));
    const ts = $('#themesub');
    if (ts) ts.textContent = themeSub();
  }
  function setFs(v) {
    S.prefs.fs = v; save(); applyPrefs();
    const idx = { s: 0, m: 1, l: 2 }[v];
    $$('[data-seg="fs"]').forEach((seg) => {
      const lens = $('.seglens', seg);
      if (lens) lens.style.transform = `translateX(${idx * 100}%)`;
      $$('button', seg).forEach((b) => b.setAttribute('aria-pressed', b.dataset.v === v ? 'true' : 'false'));
    });
  }

  // ---------- 点击 ----------
  let navCount = 0;
  document.addEventListener('click', (ev) => {
    const term = ev.target.closest('.term');
    if (term) {
      ev.preventDefault();
      const m = GLOSS.get(term.dataset.term);
      if (m) openSheet(`<div class="sh"><b>${esc(term.dataset.term)}</b><button class="whitepill" data-act="close-sheet">知道了</button></div><p>${esc(m)}</p>`, term.dataset.term);
      return;
    }
    const el = ev.target.closest('[data-act]');
    if (!el) return;
    const act = el.dataset.act;
    switch (act) {
      case 'random': randomEntry(); break;
      case 'settings': openSettings(); break;
      case 'close-sheet': closeSheet(); break;
      case 'fav': case 'done': toggleMark(act, el); break;
      case 'share': if (readCtx && readCtx.current) shareEntry(readCtx.current.dataset.id); break;
      case 'next': nextEntry(); break;
      case 'note': { const n = el.closest('.note'); n.classList.toggle('open'); el.textContent = n.classList.contains('open') ? '收起' : '展开全文'; break; }
      case 'tocf': renderToc(el.dataset.k); break;
      case 'filter': {
        const k = el.dataset.k;
        if (SS.fs.has(k)) SS.fs.delete(k); else SS.fs.add(k);
        el.setAttribute('aria-pressed', SS.fs.has(k) ? 'true' : 'false');
        SS.shown = 30; doSearch();
        break;
      }
      case 'suggest': $('#q').value = el.dataset.q; SS.shown = 30; doSearch(); break;
      case 'more-results': SS.shown += 30; renderResults(); break;
      case 'more-added': addedShown += 20; renderAdded(); break;
      case 'back': ev.preventDefault(); if (navCount > 0) history.back(); else location.hash = el.getAttribute('href') || '#/'; break;
      case 'switch': {
        if (el.dataset.k === 'theme') S.prefs.theme = isDark() ? 'light' : 'dark';
        if (el.dataset.k === 'lite') S.prefs.lite = !S.prefs.lite;
        save(); applyPrefs(); syncSwitches();
        break;
      }
      case 'fs': setFs(el.dataset.v); break;
      case 'export': exportProgress(); break;
      case 'copy-link': copyText(exportURL).then(() => toast('链接已复制')); break;
      case 'share-link': navigator.share({ title: '随身读进度', url: exportURL }).catch(() => {}); break;
      case 'import': doImport(el.dataset.code); break;
      case 'install': if (installEvt) { installEvt.prompt(); installEvt.userChoice.finally(() => { installEvt = null; }); } break;
      case 'dismiss-install': S.dismiss.install = 1; save(); el.closest('.banner')?.remove(); break;
      case 'update': if (swWaiting) { reloading = true; swWaiting.postMessage({ type: 'skip' }); } break;
      case 'beep': toggleBeep(el); break;
      case 'retry': route(); break;
      default: break;
    }
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSheet(); });

  // ---------- 离线缓存 ----------
  let reloading = false;
  function askCacheStatus() {
    if (navigator.serviceWorker && navigator.serviceWorker.controller) navigator.serviceWorker.controller.postMessage({ type: 'status' });
  }
  function refreshCacheUI() {
    const s = cacheStatus;
    const full = s && s.done === s.total;
    const txt = $('#cachetxt'), dot = $('#cachedot'), badge = $('#offbadge');
    if (txt) txt.textContent = !('serviceWorker' in navigator) ? '这个浏览器存不了，联网时可看' : !s ? '正在检查…' : full ? `${fmtDate(META.synced)}的版本 · 断网也能读全书` : `已存 ${s.done} / ${s.total} 节，联网时会接着存`;
    if (dot) dot.style.cssText = `width:10px;height:10px;background:${full ? '#7CF0A8' : '#FFC93D'};box-shadow:0 0 10px ${full ? '#4ADE80' : '#FFB020'}`;
    if (badge) badge.innerHTML = offlineBadge();
  }
  function listenSW() {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.addEventListener('message', (e) => {
      if (e.data && e.data.type === 'cached') { cacheStatus = e.data; refreshCacheUI(); }
    });
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (reloading) location.reload(); });
  }
  function registerSW() {
    if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
    navigator.serviceWorker.register('sw.js').then((reg) => {
      const track = (w) => w && w.addEventListener('statechange', () => {
        if (w.state === 'installed' && navigator.serviceWorker.controller) { swWaiting = w; toast('有新内容了，去「我的」点一下就能换上', 3500); }
      });
      if (reg.waiting && navigator.serviceWorker.controller) { swWaiting = reg.waiting; }
      // 浏览器打开页面时自己已经开始装新版本的话，「发现新版本」那一下早过去了，这里接着盯正在装的那个
      track(reg.installing);
      reg.addEventListener('updatefound', () => track(reg.installing));
    }).catch(() => {});
    navigator.serviceWorker.ready.then((reg) => {
      const go = () => reg.active && reg.active.postMessage({ type: 'precache' });
      if ('requestIdleCallback' in window) requestIdleCallback(go, { timeout: 1000 }); else setTimeout(go, 500);
    });
    if (isStandalone && navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
  }

  // ---------- 路由 ----------
  const ROUTES = [
    [/^#?\/?$/, (seq) => viewToc(seq)],
    [/^#\/toc$/, (seq) => viewToc(seq)],
    [/^#\/(?:home|intro)$/, () => location.replace('#/')], // 以前的首页地址，收藏过的也能打开
    [/^#\/read\/(\d+)(?:\/(\d+))?$/, (c, n, seq) => viewRead(+c, n ? +n : 0, seq)],
    [/^#\/search(?:\?(.*))?$/, (qs, seq) => viewSearch(new URLSearchParams(qs || ''), seq)],
    [/^#\/updates$/, (seq) => viewUpdates(seq)],
    [/^#\/sos$/, () => viewSOS()],
    [/^#\/cpr$/, () => viewCPR()],
    [/^#\/me$/, () => viewMe()],
    [/^#\/list\/(fav|done)$/, (k, seq) => viewList(k, seq)],
    [/^#\/p\/([A-Za-z0-9_-]+)$/, (code) => viewImport(code)],
  ];
  function teardown() {
    if (readCtx) { readCtx.io && readCtx.io.disconnect(); clearTimeout(readCtx.dwell); readCtx = null; }
    stopBeep();
    keepAwake(false);
    closeSheet();
    delete view.dataset.c;
  }
  async function route() {
    const h = location.hash || '#/';
    // 同一节里点交叉引用：不重画整节，直接滑过去
    const same = /^#\/read\/(\d+)\/(\d+)$/.exec(h);
    if (same && readCtx && readCtx.c === +same[1]) {
      const el = document.getElementById(`e-${same[1]}-${same[2]}`);
      if (el) { el.scrollIntoView({ behavior: smooth(), block: 'start' }); return; }
    }
    const seq = ++routeSeq;
    teardown();
    if (!h.startsWith('#/read/')) window.scrollTo(0, 0);
    for (const [re, fn] of ROUTES) {
      const m = re.exec(h);
      if (m) {
        try { await fn(...m.slice(1), seq); } catch (err) {
          if (seq !== routeSeq) return;
          console.error(err); view.className = 'page'; view.innerHTML = errHTML('页面没打开，可能是网络断了。');
        }
        return;
      }
    }
    location.replace('#/');
  }
  addEventListener('hashchange', () => { navCount++; route(); });

  // ---------- 启动 ----------
  // 用页面里自带的那份数据马上画出目录；每条的标题、术语表和更新记录画完再取。
  // 这两份取完再装离线缓存：不和首屏抢网速，也不会同一个文件取两遍；补存接着开始，连接一直在用，
  // 服务器那边不会因为空闲把发送速度降回起步值，点开第一节时更快。
  (async () => {
    applyPrefs();
    if (!readBoot()) { view.innerHTML = errHTML('页面没打开完整，刷新一下再试。'); return; }
    listenSW();
    await route();
    Promise.allSettled([loadMeta(), loadUpdates()]).then(registerSW);
  })();
})();
