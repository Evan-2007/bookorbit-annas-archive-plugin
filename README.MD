

# Anna's Archive plugin for BookOrbit

A BookOrbit indexer plugin that searches [Anna's Archive](https://annas-archive.gl) for ebooks and downloads them, using the members' fast download API when your account has a membership and falling back to Library Genesis when it doesn't.

## Features

- Search by title, author and ISBN.
- Results include title, author, format, language, file size and publication year.
- Downloads through Anna's Archive fast download for donator accounts.
- Automatic fallback to Library Genesis (`libgen.li`, then `libgen.bz`) for free accounts, when your daily fast downloads run out, or when a file isn't on the fast servers.

## Requirements

- An Anna's Archive account key. A key is needed even for free accounts to bypass DDoS protection.
- A donator account is optional. Without one, downloads come from Library Genesis, which has most but not all files.
- Clicking view files will count as a fast downlaod for donators.

## Installation

1. Download `index.mjs` from the [latest release](../../releases/latest).
2. Install it in BookOrbit:
   - Upload it via **Settings > Requests > Install plugin**, or
   - Copy it to `<APP_DATA_PATH>/plugins/indexers/my-source/index.mjs` (`APP_DATA_PATH` is `/data` in Docker).
3. fill in the settings below, then click **Test**.

## Settings

| Setting | Description |
| --- | --- |
| Base URL | The Anna's Archive address to use. Defaults to `https://annas-archive.gl`. |
| Account Key | Your Anna's Archive secret key, found on your account page. |

## TODO

- [ ] Signed auto updates


