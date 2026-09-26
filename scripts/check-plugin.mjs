import fs from 'node:fs';

const src = fs.readFileSync('dist/index.mjs', 'utf8');
const mod = await import('../dist/index.mjs');
const plugin = mod.default;

const errors = [];

if (/^import /m.test(src)) {
  errors.push('dist/index.mjs still contains an import statement — not fully bundled.');
}

const hasLocalFetch = /\bfunction\s+fetch\s*\(/.test(src);
if (/\bglobalThis\.fetch\(/.test(src) || (!hasLocalFetch && /(?<!host\.)\bfetch\(/.test(src))) {
  errors.push('Found a call to global fetch — all network access must go through host.fetch.');
}
if (/class\s+\w+\s+extends\s+Error/.test(src)) {
  errors.push('Found a custom Error subclass — throw host.fail(code, message) instead.');
}
if (plugin.apiVersion !== 1) {
  errors.push(`apiVersion must be 1, got ${plugin.apiVersion}`);
}
if (!/^[a-z0-9][a-z0-9-]{0,29}$/.test(plugin.type)) {
  errors.push(`type "${plugin.type}" does not match ^[a-z0-9][a-z0-9-]{0,29}$`);
}
if (/^v/.test(plugin.version)) {
  errors.push(`version "${plugin.version}" should not have a leading "v"`);
}
if (typeof plugin.search !== 'function') errors.push('search() is missing');
if (typeof plugin.test !== 'function') errors.push('test() is missing');

const hasResolve = typeof plugin.resolveFile === 'function';
const hasFetchTorrent = typeof plugin.fetchTorrentFile === 'function';
if (hasResolve === hasFetchTorrent) {
  errors.push('Plugin must implement exactly ONE of resolveFile() or fetchTorrentFile().');
}

if (errors.length) {
  console.error('Plugin check failed:\n' + errors.map((e) => ` - ${e}`).join('\n'));
  process.exit(1);
}
console.log('Plugin check passed.');