/**
 * Starter template for a BookOrbit indexer plugin (PLUGIN_API_VERSION 1).
 *
 * Install path: <APP_DATA_PATH>/plugins/indexers/my-source/index.mjs   (APP_DATA_PATH is /data in Docker)
 * or upload via Settings > Requests > Install plugin.
 *
 * Rules the loader enforces:
 *   - apiVersion must be 1
 *   - type: lowercase slug matching ^[a-z0-9][a-z0-9-]{0,29}$, not a built-in name (e.g. torznab, newznab)
 *   - version: semver without a leading "v"
 *   - search() and test() are required
 *   - exactly ONE of resolveFile() (source serves the file) or fetchTorrentFile() (credentialed .torrent)
 *   - all network access must go through host.fetch, never the global fetch
 *   - throw host.fail(code, message) for errors, never a custom Error class
 */

import { searchBooks } from './lib/search.mjs';
import { searchLibgen } from './lib/libgen.mjs';
import { fastDownloadUrl, libgenDownloadUrl } from './lib/download.mjs';

export default {
  apiVersion: 1,
  version: '1.2.0',
  type: 'bookorbit-annas-archive-plugin',
  label: "Anna's Archive",

  requiresCredential: false,
  credentialKind: null, // 'apiKey' | 'sessionId' | null
  mediaKinds: ['ebook'], // any of 'ebook' | 'audiobook' | 'comic'
  supportsIsbnSearch: true,
  usesCategories: false,
  seedsBack: false, // true only for torrent sources
  defaultBaseUrl: 'https://annas-archive.gl',
  baseUrlHint: "The Anna's Archive address to search.",
  update: {
    manifestUrl: 'https://raw.githubusercontent.com/Evan-2007/bookorbit-annas-archive-plugin/main/updates/bookorbit-annas-archive-plugin.json',
    ed25519PublicKey: 'YGTfGlp3g5Z1jUlwb6n7GssjoTIOmmjQBfVF1h9arEw',
   },

  settingsFields: [
    // {
    //     key: 'mirrors',
    //     type: 'string',
    //     format: 'list',
    //     label: 'Mirrors',
    //     hint: 'Extra addresses to try, in order, if the main URL fails',
    // },
    {
        key: 'accountKey',
        type: 'string',
        label: 'Account Key',
        hint: 'Your Anna\'s Archive account key. Required for searching and downloading.',
    }
],

  async search(query, config, host, signal) {
    const results =
      (await searchBooks(query, config.settings?.accountKey?.trim(), config.baseUrl, host, signal)) ??
      (await searchLibgen(query, host, signal));
    if (signal.aborted) return [];
    return results.map((r) => ({
      guid: r.md5,
      title: r.title,
      bookTitle: r.bookTitle || undefined,
      author: r.author || undefined,
      format: r.format ?? undefined,
      language: r.language ?? undefined,
      publishedAt: r.year ?? undefined,
      primaryFileCount: 1, // every md5 record is a single file
      fileCount: 1,
      downloadUrl: undefined, // resolved on demand in resolveFile() so searching costs no downloads
      sizeBytes: r.sizeBytes ?? null,
      seeders: null, // null = "not reported", never 0 for a non-torrent source
      leechers: null,
    }));
  },

  async test(config, host) {
    try {
      const results = await searchBooks({ title: 'test', limit: 1 }, config.settings?.accountKey?.trim(), config.baseUrl, host);
      if (results === null) {
        await searchLibgen({ title: 'test', limit: 1 }, host);
        return { success: true, indexerName: "Anna's Archive (free account: searching Library Genesis)" };
      }
      return { success: true, indexerName: "Anna's Archive" };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  },

  async resolveFile(release, config, host, signal) {
    const md5 = release.guid;
    if (!/^[a-f0-9]{32}$/.test(md5 ?? '')) throw host.fail('error', 'That release has no file');

    const url =
      (await fastDownloadUrl(md5, config.settings?.accountKey?.trim(), config.baseUrl, host, signal)) ??
      (await libgenDownloadUrl(md5, host, signal));
    if (!url) throw host.fail('error', 'No download available: fast download needs a membership and libgen does not have this file');

    return {
      url,
      fileName: `${release.title}.${release.format ?? 'epub'}`,
      sizeBytes: release.sizeBytes,
      format: release.format ?? 'epub',
    };
  },
};