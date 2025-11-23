# TelePrompt

Seamlessly send text and screenshots between pages and auto-fill AI chat inputs (Gemini, ChatGPT, Claude).

## Structure

- `server/` – Hono relay server (Node.js + tsx). Handles `POST /upload`, `GET /fetch`, and `GET /health` with `X-Api-Key` auth. Timestamps are stamped server-side on upload. Default port `5858`.
- `extension/` – Chrome extension (Manifest V3 + esbuild) with sender/receiver logic. Background polls the server once and broadcasts payloads to receiving tabs; receiving can be toggled per tab on supported hosts (Gemini/ChatGPT/Claude).

## Setup

### Server

1. `cd server`
2. `npm install`
3. Set `API_KEY` in `.env` (copy the placeholder file). Optional: adjust `PORT` (default `5858`).
4. Run `npm run dev` or `npm start`.

### Extension

1. `cd extension`
2. `npm install`
3. `npm run build` (outputs to `public/dist`).
4. Load unpacked extension from `extension/public` in Chrome.
5. Open the options page to set the same server URL/API key and adjust target selectors if needed.
- Default target selector points to the sample prompts page in this repo (`sample.md` on GitHub, selector `.markdown-body`). Update to your own targets as needed.

## Usage

- **Sender**
  - Context menu on selected text → uploads payload.
  - Double-click a configured element → captures visible tab, crops to the element, and uploads image + text.
- **Receiver**
  - Toggle Receiver Mode per tab in the popup (only on Gemini/ChatGPT/Claude). Background polls the server and broadcasts the latest payload to all receiving tabs. Text is inserted; images are pasted (Gemini/ChatGPT) or attached via file input (Claude); then the send button is clicked after a short wait.

Payload format:

```ts
interface Payload {
  image?: string; // Base64 data URL
  text?: string;  // Text content
  timestamp: number; // set by server on receipt
}
```

Auth header: `X-Api-Key` must match the server `.env` value.
