#!/usr/bin/env node
// 生成应用图标：用本机 Chrome 无头截 scripts/icon.html，再用 macOS 自带的 sips 缩成各个尺寸。
// 图标一般不用重做；改了 icon.html 才需要跑：node scripts/make-icons.mjs
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'src', 'icons');
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
fs.mkdirSync(OUT, { recursive: true });
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'ssd-icon-'));
const big = path.join(OUT, 'icon-512.png');
execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', `--user-data-dir=${profile}`,
  '--window-size=512,512', '--force-device-scale-factor=1', `--screenshot=${big}`, pathToFileURL(path.join(ROOT, 'scripts', 'icon.html')).href], { stdio: 'ignore' });
fs.copyFileSync(big, path.join(OUT, 'icon-maskable-512.png'));
for (const s of [192, 180]) execFileSync('sips', ['-z', String(s), String(s), big, '--out', path.join(OUT, `icon-${s}.png`)], { stdio: 'ignore' });
fs.rmSync(profile, { recursive: true, force: true });
console.log('图标已生成到 src/icons/');
