# Love Toolbox — love-toolbox

An all-in-one toolbox for Mena and Ammar: one quiet page holding every little
helper we reach for — calculators, converters, text and dev tools, random
generators, notes, timers, finance and health helpers, flashcards and more.

Live: https://menaammarpro.github.io/love-toolbox/

- **One page, hash router.** `#/` is the dashboard, `#/tool/<id>` opens a tool,
  `#/settings` holds preferences and backup. Deep-link any tool.
- **Command palette.** Press **Ctrl+K** (or **Cmd+K**) anywhere to fuzzy-search
  every tool by name.
- **Offline & private.** Everything is computed in the browser and saved only on
  your device (`localStorage`, key `mena-toolbox`). No accounts, no tracking, no
  network requests. Installable as a PWA.
- **Backup / restore.** Download the whole state as JSON and paste it back in
  from the Settings page.

## Storage

`mena-toolbox` — `{ v, settings, favorites, recent, usage, data }` where
`data[<toolId>]` holds that tool's own state.

## Tools

The shell and each tool are added one at a time; see the dashboard for the live
list (`window.MenaToolbox.list()`).

## Development

No build step. Everything is plain HTML + CSS + vanilla JS.

```sh
node --check js/app.js js/tools/*.js sw.js
node test/harness.js
```

The Node harness loads `js/app.js` plus every tool file into a fake DOM and
asserts the pure functions of each tool.

Made with love, just for you ♥
