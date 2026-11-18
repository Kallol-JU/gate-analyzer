import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { API_BASE_URL } from '../src/api/baseUrl.js';

const clientDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(path.join(clientDir, p), 'utf8');

test('API base URL is the relative same-origin /api/v1 path', () => {
  assert.equal(API_BASE_URL, '/api/v1');
});

test('axios instance does not read VITE_API_BASE_URL and keeps credentials + CSRF header', () => {
  const src = read('src/api/axios.js');
  assert.ok(!src.includes('VITE_API_BASE_URL'));
  assert.match(src, /withCredentials:\s*true/);
  assert.match(src, /'X-Requested-With':\s*'gate-cbt'/);
});

test('endpoint paths never repeat /api/v1 (no duplicated prefix)', () => {
  const dir = path.join(clientDir, 'src/api');
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.api.js'))) {
    const src = readFileSync(path.join(dir, file), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, ''); // ignore comments
    assert.ok(!src.includes('/api/v1'), `${file} must use paths relative to the base URL`);
    for (const m of src.matchAll(/api\.(?:get|post|put|patch|delete)\(\s*[`'"]([^`'"]*)/g)) {
      assert.ok(m[1].startsWith('/') && !m[1].startsWith('//'), `${file}: ${m[1]}`);
    }
  }
});

for (const file of ['vercel.json', '../vercel.json']) {
  test(`${file} proxies /api/v1/* to Render before the SPA fallback`, () => {
    const cfg = JSON.parse(read(file));
    const [api, spa] = cfg.rewrites;
    assert.equal(api.source, '/api/v1/:path*');
    assert.equal(api.destination, 'https://gate-analyzer.onrender.com/api/v1/:path*');
    assert.equal(spa.destination, '/index.html');
    assert.ok(new RegExp(`^${spa.source}$`).test('/tests'), 'fallback must catch app routes');
    assert.ok(!new RegExp(`^${spa.source}$`).test('/api/v1/auth/me'), 'fallback must not catch API paths');
  });
}
