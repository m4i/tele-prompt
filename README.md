# TelePrompt

Seamlessly send text and screenshots between pages and auto-fill AI chat inputs (Gemini, ChatGPT, Claude).

## Structure

- `server/` – Hono relay server (Node.js + tsx). Handles `POST /upload`, `GET /fetch`, and `GET /health` with `X-Api-Key` auth.
- `extension/` – Chrome extension (Manifest V3 + esbuild) with sender/receiver logic.

## Setup

### Server

1. `cd server`
2. `npm install`
3. Set `API_KEY` in `.env` (copy the placeholder file). Optional: adjust `PORT`.
4. Run `npm run dev` or `npm start`.

### Extension

1. `cd extension`
2. `npm install`
3. `npm run build` (outputs to `public/dist`).
4. Load unpacked extension from `extension/public` in Chrome.
5. Open the options page to set the same server URL/API key and adjust target selectors if needed.

## Usage

- **Sender**
  - Context menu on selected text → uploads payload.
  - Double-click a configured element → captures visible tab, crops to the element, and uploads image + text.
- **Receiver**
  - Toggle Receiver Mode in the popup. When on supported AI pages, it polls every second, fetches payloads, pastes images, and inserts text into the chat input.

Payload format:

```ts
interface Payload {
  image?: string; // Base64 data URL
  text?: string;  // Text content
  timestamp: number;
}
```

Auth header: `X-Api-Key` must match the server `.env` value.
