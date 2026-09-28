
import crypto from 'node:crypto';
import fs from 'node:fs';

const sourceUrl = process.argv[2];
if (!sourceUrl?.startsWith('https://')) {
  console.error('Usage: node scripts/sign-update.mjs <https sourceUrl>');
  process.exit(1);
}

const keyInput = process.env.BOOKORBIT_PLUGIN_SIGNING_KEY;
if (!keyInput) {
  console.error('Set BOOKORBIT_PLUGIN_SIGNING_KEY to the private key PEM or a path to it.');
  process.exit(1);
}
const privateKey = crypto.createPrivateKey(
  keyInput.includes('-----BEGIN') ? keyInput : fs.readFileSync(keyInput)
);

const bytes = fs.readFileSync('dist/index.mjs');
const plugin = (await import('../dist/index.mjs')).default;

const signature = crypto.sign(null, bytes, privateKey);

const embedded = plugin.update?.ed25519PublicKey;
const publicKey = crypto.createPublicKey({ key: { kty: 'OKP', crv: 'Ed25519', x: embedded ?? '' }, format: 'jwk' });
if (!embedded || !crypto.verify(null, bytes, publicKey, signature)) {
  console.error('Signing key does not match update.ed25519PublicKey in the plugin. Not writing a manifest.');
  process.exit(1);
}

const manifest = {
  schemaVersion: 1,
  type: plugin.type,
  version: plugin.version,
  sourceUrl,
  sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
  signature: signature.toString('base64'),
};

fs.mkdirSync('updates', { recursive: true });
const out = `updates/${plugin.type}.json`;
fs.writeFileSync(out, JSON.stringify(manifest, null, 2) + '\n');
console.log(`Wrote ${out} for ${plugin.type} ${plugin.version}`);
