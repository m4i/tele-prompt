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
- Double-click target element → capture, crop, and send screenshot + text.
- Receiver mode toggle in popup; when enabled it polls every second for new payloads and injects them into AI chat inputs.
- Options page to configure server URL, API key, and target selectors.

## Default Settings

- Server URL: `http://localhost:5000`
- Target selectors: Gemini contenteditable, ChatGPT `#prompt-textarea`, Claude contenteditable.

Set your API key in the options page; it is sent as `X-Api-Key`.
