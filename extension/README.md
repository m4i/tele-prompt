# TelePrompt Chrome Extension

Chrome extension that collects text or screenshots from any page and auto-fills AI chat inputs (Gemini, ChatGPT, Claude).

## Build

```bash
npm install
npm run build
```

This bundles scripts into `public/dist`. Load the unpacked extension from the `extension/public` folder in Chrome.

## Features

- Background proxy to call the relay server with CORS bypass.
- Context menu: select text → send to relay.
- Double-click target element → capture, crop, and send screenshot + text (runs in all frames).
- Receiver mode is toggled per tab from the popup (only on supported AI hosts). Background polls the server once and broadcasts payloads to receiving tabs.
- Claude images are attached via file input; Gemini/ChatGPT images are pasted. After a short wait, send buttons are clicked automatically.
- Options page to configure server URL, API key, and target selectors.

## Default Settings

- Server URL: `http://localhost:5858`
- Target selectors: `https://github.com/m4i/tele-prompt/blob/main/sample.md` with selector `article.markdown-body > div`

Set your API key in the options page; it is sent as `X-Api-Key`. Adjust target selectors to your own pages as needed.
