#!/usr/bin/env node
// 随身读的构建脚本。
//
// 做两件事：
// 1. 把《高性价比人生指南》书稿（.book/，原仓库的浅克隆）解析成站点数据；
// 2. 把 src/ 里的页面文件连同数据放进 dist/。dist/ 是纯静态文件，放到任何静态托管上都能用。
//
// 用法：
//   node scripts/build.mjs          用 .book/ 里现有的书稿构建（还没有就先克隆）
//   node scripts/build.mjs --sync   先把 .book/ 更新到原仓库最新，再构建
//
// 不依赖任何 npm 包，Node 18 以上即可。
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BOOK = path.join(ROOT, '.book');
const SRC = path.join(ROOT, 'src');
const DIST = path.join(ROOT, 'dist');
const REPO = 'https://github.com/eternity4719/HowToLiveBetter.git';
const args = new Set(process.argv.slice(2));

// ---------- 书稿 ----------
function syncBook() {
  if (!fs.existsSync(path.join(BOOK, '.git'))) {
    console.log('克隆书稿到 .book/ …');
    execFileSync('git', ['clone', '--depth', '1', REPO, BOOK], { stdio: 'inherit' });
  } else if (args.has('--sync')) {
    console.log('更新书稿 …');
    execFileSync('git', ['-C', BOOK, 'fetch', '--depth', '1', 'origin', 'HEAD'], { stdio: 'inherit' });
    execFileSync('git', ['-C', BOOK, 'reset', '--hard', 'FETCH_HEAD'], { stdio: 'inherit' });
  }
  return execFileSync('git', ['-C', BOOK, 'rev-parse', 'HEAD']).toString().trim();
}

const read = p => fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n');

// ---------- 性价比三档：和原仓库 tools/lib/book.mjs、index.html 同一套规则 ----------
const COST_W = {
  money: { '0': 0, '少': 1, '多': 2 },
  time: { '少': 0, '中': 1, '多': 2 },
  will: { '否': 0, '些': 1, '是': 2 },
};
function ratioOf(cost, level) {
  if (level === '大') return cost === 0 ? '极高' : cost <= 2 ? '高' : '一般';
  return level === '中' && cost === 0 ? '高' : '一般';
}
const LENS = { '死亡率': 'life', '金钱': 'money', '时间': 'time', '自由': 'free' };

// ---------- 长段落和来源的拆分：移植自原仓库 tools/lib/split-items.mjs（MIT 许可）----------
const GAIN_MIN_LEN = 300;
const GAIN_MIN_CHUNK = 25;
const GAIN_TOPIC_START = [
  /^[^，。「」《》：；（）的]{1,12}看(《|[^，。「」的]{0,10}法[：「（第])/,
  /^《[^》]{2,40}》/,
  /^(?!该|本|此|这|同|上述|但|而|所以|因此|并且|也)[一-龥]{1,12}法(第[一二三四五六七八九十百零]+条|「)/,
  /^(另一|另有一|还有一|再一|又一)(项|篇)/,
  /^(国内|国外|国内外)也有/,
  /^案例[一二三四五六七八九十]/,
  /^(同一天|同一试验|同一指南|同一研究)/,
  /^(美国|英国|欧洲|世界卫生组织|WHO|中国)[^，。]{0,20}(指南|共识|建议|学会)/,
  /^(先说|再说|最后说|先看|再看|最后看)/,
  /^一(项|篇)[^，。]{0,20}(试验|研究|综述|分析|调查)/,
  /^(芬兰|北欧|英国|美国|日本|韩国|瑞典|丹麦|挪威|德国|法国|澳大利亚|加拿大|荷兰|台湾|香港|上海|北京)[^，。]{0,25}(研究|数据库|试验|队列|调查)/,
];
function splitGain(text) {
  if (!text) return [];
  if (text.length < GAIN_MIN_LEN) return [text];
  const sentences = [];
  let buf = '', depth = 0;
  for (const c of text) {
    if ('「『《（'.includes(c)) depth++;
    else if ('」』》）'.includes(c)) depth = Math.max(0, depth - 1);
    buf += c;
    if (c === '。' && depth === 0) { sentences.push(buf); buf = ''; }
  }
  if (buf) sentences.push(buf);
  const chunks = [];
  for (const s of sentences) {
    if (chunks.length && GAIN_TOPIC_START.some(re => re.test(s))) chunks.push(s);
    else if (chunks.length) chunks[chunks.length - 1] += s;
    else chunks.push(s);
  }
  const out = [];
  for (const c of chunks) {
    if (out.length && c.length < GAIN_MIN_CHUNK) out[out.length - 1] += c;
    else out.push(c);
  }
  if (out.length > 1 && out[0].length < GAIN_MIN_CHUNK) out.splice(0, 2, out[0] + out[1]);
  return out;
}
function splitSrc(text) {
  const parts = []; let buf = '', depth = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if ('「『（'.includes(c)) depth++;
    if ('」』）'.includes(c)) depth = Math.max(0, depth - 1);
    const semi = c === '；' || (c === ';' && /\s/.test(text[i - 1] || '') && /\s/.test(text[i + 1] || ''));
    if (semi && depth === 0) { parts.push(buf); buf = ''; continue; }
    buf += c;
  }
  parts.push(buf);
  return parts.map(s => s.trim()).filter(Boolean);
}

// ---------- 行内 markdown 收拾成纯文本（加粗留 ** 给页面渲染）----------
const clean = s => s
  .replace(/\\([*_`\[\]()<>#])/g, '$1')
  .replace(/`([^`]+)`/g, '$1')
  .replace(/\[([^\]]+)\]\((?:[^()]|\([^)]*\))*\)/g, '$1')
  .trim();

function parseSrcItem(item) {
  const urls = [];
  let t = item.replace(/<(https?:\/\/[^>\s]+)>/g, (_, u) => { urls.push(u); return ''; });
  t = t.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, (_, txt, u) => { urls.push(u); return txt; });
  t = t.replace(/(?<![<(])(https?:\/\/[^\s<>()，。；」]+)/g, (u) => { urls.push(u); return ''; });
  t = clean(t).replace(/\s*[.．。]\s*$/, '').replace(/\s{2,}/g, ' ').trim();
  return { t, u: [...new Set(urls)] };
}

// ---------- 解析一节 ----------
const FIELD = { '成本': 'cost', '说人话': 'plain', '收益': 'gain', '证据等级': 'grade', '来源': 'src', '备注': 'note' };
function parseChapter(md, file) {
  const lines = md.split('\n');
  let head = null, cur = null;
  const intro = [], entries = [];
  for (const raw of lines) {
    const line = raw.trimEnd();
    let m;
    if (!head) {
      if ((m = /^# (\d+)\. (.+)$/.exec(line))) head = { n: +m[1], title: m[2].trim() };
      continue;
    }
    if ((m = /^### (\d+)\. (.+)$/.exec(line))) {
      cur = { n: +m[1], title: m[2].trim(), tags: {}, cost: '', plain: '', gain: '', grade: '', src: '', note: '' };
      entries.push(cur);
      continue;
    }
    if (!cur) {
      if (line && !line.startsWith('[← ')) intro.push(clean(line));
      continue;
    }
    if ((m = /^<!--\s*成本标签:\s*(.*?)\s*-->/.exec(line))) {
      for (const kv of m[1].split(/\s+/)) { const [k, v] = kv.split('='); cur.tags[k] = v; }
      continue;
    }
    if ((m = /^- (成本|说人话|收益|证据等级|来源|备注)：(.*)$/.exec(line))) cur[FIELD[m[1]]] = m[2].trim();
  }
  if (!head) throw new Error(`${file}：找不到「# N. 标题」`);
  return { head, intro, entries };
}

function shortTitle(t) {
  return t.split(/[：:]/)[0].trim();
}

// ---------- 术语表（README「读懂数字」）----------
function parseGlossary(readme) {
  const m = /^## 读懂数字[^\n]*\n([\s\S]*?)(?=^## )/m.exec(readme);
  if (!m) return [];
  const out = [];
  for (const line of m[1].split('\n')) {
    const c = /^\|\s*(.+?)\s*\|\s*(.+?)\s*\|$/.exec(line);
    if (!c || c[1] === '术语' || /^-+$/.test(c[1])) continue;
    for (const t of c[1].split('、')) {
      const term = t.trim();
      if (term) out.push({ t: term, m: clean(c[2]) });
    }
  }
  return out.sort((a, b) => b.t.length - a.t.length);
}

// ---------- 主流程 ----------
const commit = syncBook();
const readme = read(path.join(BOOK, 'README.md'));
const files = fs.readdirSync(path.join(BOOK, 'book')).filter(f => /^\d+-.+\.md$/.test(f)).sort();
if (files.length === 0) throw new Error('.book/book/ 下没有书稿文件');

const chapters = [];
const all = [];
for (const f of files) {
  const { head, intro, entries } = parseChapter(read(path.join(BOOK, 'book', f)), f);
  const c = head.n;
  const list = entries.map(x => {
    const cs = (COST_W.money[x.tags['钱']] ?? 0) + (COST_W.time[x.tags['时间']] ?? 0) + (COST_W.will[x.tags['毅力']] ?? 0);
    const e = {
      id: `${c}-${x.n}`, c, n: x.n,
      t: clean(x.title),
      cost: clean(x.cost),
      plain: clean(x.plain),
      gain: splitGain(clean(x.gain)),
      note: splitGain(clean(x.note)),
      src: splitSrc(x.src).map(parseSrcItem),
      g: (/[ABC]/.exec(x.grade) || [''])[0],
      m: x.tags['钱'] || '', tm: x.tags['时间'] || '', w: x.tags['毅力'] || '',
      lv: x.tags['收益'] || '', k: LENS[x.tags['口径']] || 'money',
      who: x.tags['人群'] || '',
      d: /^争议/.test(x.note) ? 1 : 0,
      r: ratioOf(cs, x.tags['收益']),
    };
    all.push(e);
    return e;
  });
  const lensCount = {};
  for (const e of list) lensCount[e.k] = (lensCount[e.k] || 0) + 1;
  const k = Object.entries(lensCount).sort((a, b) => b[1] - a[1])[0]?.[0] || 'money';
  chapters.push({ n: c, t: head.title, s: shortTitle(head.title), k, intro, entries: list });
}
chapters.sort((a, b) => a.n - b.n);

// 统计，并和 README 里写的数字对一下
const stats = {
  entries: all.length,
  free: all.filter(e => e.m === '0').length,
  A: all.filter(e => e.g === 'A').length,
  B: all.filter(e => e.g === 'B').length,
  C: all.filter(e => e.g === 'C').length,
  disputed: all.filter(e => e.d).length,
  top: all.filter(e => e.r === '极高').length,
  refs: +((/原始文献-(\d+)/.exec(readme) || [])[1] || all.reduce((s, e) => s + e.src.reduce((t, i) => t + i.u.length, 0), 0)),
};
const readmeTotal = +((/条目-(\d+)/.exec(readme) || [])[1] || 0);
if (readmeTotal && readmeTotal !== stats.entries) console.warn(`⚠ 条目数 ${stats.entries} 和 README 写的 ${readmeTotal} 不一致`);

// 编辑精选：处境入口、急救入口、按压引导。急救入口逐条核对引用的条目确实存在。
// content.json 里的 hooks 是以前首页的摘句；2026-11-05 起打开就是目录，摘句不再显示也不再打包，留在源文件里备用。
const content = JSON.parse(read(path.join(SRC, 'content.json')));
const byId = new Map(all.map(e => [e.id, e]));
for (const s of content.sos) if (!byId.get(s.id)) throw new Error(`急救入口引用的条目 ${s.id} 不存在`);

// 更新记录：原仓库的 updates.json，只留现在还在的条目
let updates = { since: '', items: {} };
try {
  const raw = JSON.parse(read(path.join(BOOK, 'updates.json')));
  updates.since = raw.since || '';
  for (const [id, v] of Object.entries(raw.items || {})) if (byId.has(id)) updates.items[id] = v;
} catch { console.warn('⚠ 没读到 updates.json，「读过的改了」会是空的'); }

const synced = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Shanghai', dateStyle: 'short' }).format(new Date());
const gloss = parseGlossary(readme);

const tierCode = { '极高': 'X', '高': 'H', '一般': 'N' };
// boot：目录、急救、我的这几页要的最少数据（各节标题和条数、每条的口径和性价比档位、统计、处境、急救）。
// 构建时直接写进 index.html，打开页面不用再等任何请求就能画出目录。
const boot = {
  synced, commit: commit.slice(0, 7), stats,
  content: { scenes: content.scenes, sos: content.sos, cpr: content.cpr },
  chapters: chapters.map(ch => ({
    n: ch.n, t: ch.t, s: ch.s, k: ch.k, cnt: ch.entries.length,
    tiers: ch.entries.map(e => tierCode[e.r]).join(''),
    lens: ch.entries.map(e => e.k[0]).join(''),
  })),
};
// meta.json：每条的标题（「接着读」「读过的改了」要用）和术语表，页面画完再在后台取。
const meta = { gloss, titles: Object.fromEntries(chapters.map(ch => [ch.n, ch.entries.map(e => e.t)])) };
const index = all.map(e => [e.id, e.t, e.plain, e.cost, e.g, e.m, e.tm, e.w, e.lv, e.k, e.d, e.r]);

// ---------- 输出 ----------
const pad = n => String(n).padStart(2, '0');
const dataFiles = {
  'data/index.json': JSON.stringify(index),
  'data/updates.json': JSON.stringify(updates),
};
// 每节拆成两份：摊开就能看到的（标题、花掉换回、说人话、备注）和折起来的「成本 · 收益原文 · 来源」。
// 后一份占整节的三分之二；点开一节先只取前一份，后一份紧接着在后台补上。
for (const ch of chapters) {
  dataFiles[`data/ch/${pad(ch.n)}.json`] = JSON.stringify({ n: ch.n, t: ch.t, s: ch.s, k: ch.k, intro: ch.intro,
    entries: ch.entries.map(({ cost, gain, src, who, ...open }) => open) });
  dataFiles[`data/foot/${pad(ch.n)}.json`] = JSON.stringify(Object.fromEntries(ch.entries.map(e => [e.n, [e.cost, e.gain, e.src]])));
}

const srcFiles = [];
(function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) walk(p);
    else srcFiles.push(path.relative(SRC, p));
  }
})(SRC);

const hash = createHash('sha256');
for (const [k, v] of Object.entries(dataFiles).sort()) hash.update(k).update(v);
for (const f of srcFiles.sort()) hash.update(f).update(fs.readFileSync(path.join(SRC, f)));
hash.update(JSON.stringify(boot)).update(JSON.stringify(meta));
const VERSION = `${synced}-${hash.digest('hex').slice(0, 8)}`;
boot.v = VERSION;
meta.v = VERSION;
dataFiles['data/meta.json'] = JSON.stringify(meta);

fs.rmSync(DIST, { recursive: true, force: true });
const put = (rel, body) => {
  const p = path.join(DIST, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, body);
};
for (const [rel, body] of Object.entries(dataFiles)) put(rel, body);

const fill = (s) => s.replaceAll('__VERSION__', VERSION).replaceAll('__ENTRIES__', String(stats.entries));

// 页面：样式、脚本和 boot 数据整个写进 index.html。第一次打开只等这一个文件，
// 不用等它下完再去要样式和脚本、脚本跑起来再去要目录数据，省下两次来回。
const inlined = { '/*__CSS__*/': fill(read(path.join(SRC, 'styles.css'))), '/*__APP__*/': fill(read(path.join(SRC, 'app.js'))),
  // JSON 放进 <script> 里，「<」要转义，免得内容里出现 </script> 把标签提前截断
  '__BOOT__': JSON.stringify(boot).replace(/</g, '\\u003c') };
for (const [k, v] of Object.entries(inlined)) {
  if (k !== '__BOOT__' && /<\/(script|style)|<!--/i.test(v)) throw new Error(`${k} 里有 </script>、</style> 或 <!--，不能直接写进页面`);
}
let html = fill(read(path.join(SRC, 'index.html')));
for (const [k, v] of Object.entries(inlined)) {
  if (html.split(k).length !== 2) throw new Error(`index.html 里要有且只有一个 ${k}`);
  html = html.replace(k, () => v); // 用函数替换，脚本里的 $& 这类写法才不会被当成替换模式
}
put('index.html', html);

const SKIP = new Set(['content.json', 'sw.js', 'index.html', 'styles.css', 'app.js']);
for (const f of srcFiles) {
  if (SKIP.has(f) || f.startsWith('.')) continue;
  let body = fs.readFileSync(path.join(SRC, f));
  if (/\.(html|js|css|json)$/.test(f)) body = fill(body.toString());
  put(f, body);
}

// 离线缓存：安装时只存页面和两份小数据；正文和搜索索引等页面空下来再补存，急救那一节（第 13 节）排第一。
// 图标不进缓存：桌面图标由系统在「添加到主屏幕」时自己取。
const shell = ['index.html', 'manifest.json', 'icons/icon.svg', 'data/meta.json', 'data/updates.json'];
const order = [...chapters].sort((a, b) => (b.n === 13) - (a.n === 13) || a.n - b.n);
const chapterUrls = order.map(ch => `data/ch/${pad(ch.n)}.json`);
const footUrls = order.map(ch => `data/foot/${pad(ch.n)}.json`);
put('sw.js', read(path.join(SRC, 'sw.js'))
  .replaceAll('__VERSION__', VERSION)
  .replace('__SHELL__', JSON.stringify(shell))
  .replace('__CHAPTERS__', JSON.stringify(chapterUrls))
  .replace('__FOOTS__', JSON.stringify(footUrls))
  .replace('__EXTRA__', JSON.stringify(['data/index.json'])));
for (const u of [...shell, ...chapterUrls, ...footUrls, 'data/index.json']) if (!fs.existsSync(path.join(DIST, u))) throw new Error(`离线缓存要存的 ${u} 不在 dist/ 里`);

const size = Object.values(dataFiles).reduce((s, b) => s + Buffer.byteLength(b), 0);
const kb = (b) => `${(b / 1024).toFixed(1)} KB`;
const gz = (p) => gzipSync(fs.readFileSync(path.join(DIST, p)), { level: 6 }).length;
console.log(`完成 ${VERSION}：${chapters.length} 节，${stats.entries} 条（A ${stats.A} / B ${stats.B} / C ${stats.C}，争议 ${stats.disputed}，性价比极高 ${stats.top}，不花钱 ${stats.free}）`);
console.log(`数据 ${(size / 1024 / 1024).toFixed(2)} MB，书稿版本 ${commit.slice(0, 7)}，输出在 dist/`);
console.log(`首屏只要 index.html：${kb(Buffer.byteLength(html))}，压缩后 ${kb(gz('index.html'))}；后台再取 meta.json 压缩后 ${kb(gz('data/meta.json'))}`);
const sum = (urls) => urls.reduce((s, u) => s + gz(u), 0);
console.log(`点开一节先取正文：第 1 节压缩后 ${kb(gz('data/ch/01.json'))}（折起来的部分 ${kb(gz('data/foot/01.json'))} 随后补上）；全书正文 ${kb(sum(chapterUrls))}，折起来的部分 ${kb(sum(footUrls))}`);
