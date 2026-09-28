# Anna's Archive plugin for BookOrbit

> **A donator (member) account is recommended.** Anna's Archive is behind DDoS protection that only member accounts can get past. Free accounts still work, but the plugin searches and downloads from Library Genesis instead, which has most but not all of Anna's Archive's books.

A BookOrbit indexer plugin that searches [Anna's Archive](https://annas-archive.gl) for ebooks and downloads them, using the members' fast download API when your account has a membership and falling back to Library Genesis when it doesn't.

## Features

- Search by title, author and ISBN.
- Results include title, author, format, language, file size and publication year.
- Donator accounts search the full Anna's Archive catalogue and download through its fast download API.
- Free accounts automatically search Library Genesis (`libgen.li`, then `libgen.bz`) instead.
- Downloads fall back to Library Genesis when your daily fast downloads run out, or when a file isn't on the fast servers.

## Requirements

- An Anna's Archive account key. A donator (member) key gets the full catalogue. A free key gets only Library Genesis results.
- Clicking **View files** counts as a fast download for donators.

## Installation

1. Download `index.mjs` from the [latest release](../../releases/latest).
2. Install it in BookOrbit:
   - Upload it via **Settings > Requests > Add source > Install a plugin**, or
   - Copy it to `<APP_DATA_PATH>/plugins/indexers/bookorbit-annas-archive-plugin/index.mjs` (`APP_DATA_PATH` is `/data` in Docker).
3. fill in the settings below, then click **Test**.

## Settings

| Setting | Description |
| --- | --- |
| Base URL | The Anna's Archive address to use. Defaults to `https://annas-archive.gl`. |
| Account Key | Your Anna's Archive secret key, found on your account page. |

## TODO

- [ ] Signed auto updates
