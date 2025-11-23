# Development Specification: TelePrompt

## 1. Project Overview

A system to seamlessly transfer text and screenshots from PC A to PC B (or within the same PC) into Generative AI interfaces (Gemini, ChatGPT, Claude).
**"TelePrompt"** acts as both a "Collector (Sender)" on any Web page and an "Auto-Input (Receiver)" on AI service pages.
The Receiver function operates only when explicitly enabled by the user via the extension popup.

## 2. Directory Structure (Monorepo)

```text
/tele-prompt
  ├── server/              # Relay Server (Hono + tsx)
  │    ├── src/
  │    │    └── index.ts
  │    ├── .env            # Environment Variables (API Key)
  │    ├── package.json
  │    ├── README.md       # English
  │    └── tsconfig.json
  └── extension/           # Chrome Extension (esbuild)
       ├── src/
       │    ├── background.ts  # Network Proxy & Logic Hub
       │    ├── content.ts     # UI Events & DOM Manipulation
       │    ├── popup.ts       # Toggle Switch Logic
       │    ├── options.ts     # Settings Logic
       │    ├── receiver.ts    # AI Strategy Logic
       │    └── utils.ts
       ├── public/
       │    ├── manifest.json
       │    ├── popup.html
       │    ├── options.html
       │    └── icons/
       ├── package.json
       ├── README.md       # English
       └── tsconfig.json
```

## 3. Tech Stack & Constraints

- **Server**: Node.js, tsx, Hono
- **Extension**: TypeScript, esbuild, Manifest V3
- **Communication**: `fetch` API (Must be executed in Background Script)
- **Language Requirement**:
  - **Code Comments**: English only.
  - **README.md**: English only.

## 4. Common Specs: Data & Auth

- **Auth**: HTTP Header `X-Api-Key`.
- **Payload**:
  ```typescript
  interface Payload {
    image?: string; // Base64 Data URL
    text?: string; // Text content
    timestamp: number; // stamped by server on receipt
  }
  ```

## 5. Component: Relay Server (`/server`)

- **Environment Variables**:
  - Create a `.env` file in the root of `/server`.
  - Variable: `API_KEY` (The secret key used for validation).
  - Optional: `PORT` (default `5858`).
- **Functions**:
  - `POST /upload`: Validates the `X-Api-Key` header against `process.env.API_KEY`. Stores the latest payload in memory and stamps `timestamp` server-side.
  - `GET /fetch`: Returns the payload and clears memory. Returns `found: false` if empty.
  - `GET /health`: Health check ("OK").
- **CORS**: **Not required**. The Chrome Extension (Background Script) bypasses CORS restrictions due to `host_permissions` configured in the manifest.

## 6. Component: Extension (`/extension`)

**Manifest V3 Settings (`manifest.json`):**

- `permissions`: `contextMenus`, `activeTab`, `storage`, `scripting`, `tabs`, `windows`
- `host_permissions`: `<all_urls>`
- `action`: `default_popup`: `popup.html`
- `background`: `service_worker` (`dist/background.js`)
- `content_scripts`: injected on all frames (`all_frames: true`)

**A. Background Script (`background.ts` - Central Hub):**

- **Crucial Role**: Acts as a **Network Proxy** to avoid Mixed Content errors (HTTPS page requesting HTTP localhost) and leverage `host_permissions` to bypass CORS.
- **Message Handlers**:
  - `CMD_UPLOAD`: Receives payload, executes `POST /upload`.
  - `CMD_CAPTURE`: Executes `chrome.tabs.captureVisibleTab`, returns Base64 image.
  - `CMD_SET_RECEIVING`: Toggle receiving state for a tab (only supported on Gemini/ChatGPT/Claude).
- **Polling/Fan-out**: Background polls `/fetch` every second only if there is at least one receiving tab, and broadcasts a single payload to all receiving tabs (`CMD_PAYLOAD`).

**B. Settings (`options.ts`):**

- Manage via `chrome.storage.sync`:
  1.  `serverUrl` (Default: `http://localhost:5858`)
  2.  `apiKey` (This will be sent in the `X-Api-Key` header)
  3.  `targetSelectors`: Array of `{ urlPattern: string, selector: string }`. Default points to `https://github.com/m4i/tele-prompt/blob/main/sample.md` with `article.markdown-body > div`.

**C. Popup (`popup.ts`):**

- Per-tab toggle for Receiver Mode (only on supported AI hosts).
- Displays a list of receiving tabs with ability to focus/disable each.
- Receiving state stored in `chrome.storage.local` as a map of tab IDs.

**D. Sender Logic:**

- **Context Menu (Text)**:
  - Created in `background.ts`.
  - On click: Gets selection -> `POST /upload` (inside background).
- **Double Click (Image) (`content.ts`)**:
  - Listens for `dblclick`. Checks against `targetSelectors`.
  - If matched:
    1.  Get element coordinates.
    2.  `runtime.sendMessage({ type: 'CMD_CAPTURE' })`.
    3.  Crop image using Canvas in Content Script.
    4.  `runtime.sendMessage({ type: 'CMD_UPLOAD', payload })`.

**E. Receiver Logic (`receiver.ts` loaded by `content.ts`):**

- **Delivery**:
  - Listens for `CMD_PAYLOAD` broadcast from background; no polling in content scripts.
- **DOM Strategy**:
  - **Gemini**: `div[contenteditable="true"]` -> Paste Image -> Insert Text -> Wait -> Click send button.
  - **ChatGPT**: Contenteditable area -> Paste Image -> Insert Text -> Wait -> Click send button.
  - **Claude**: Contenteditable text insert + attach image via `input#chat-input-file-upload-bottom` -> Wait -> Click send button.

## 7. Implementation Tasks

1.  Initialize Monorepo (`/tele-prompt`).
2.  Implement Server (Hono) with `.env` support.
3.  Implement Extension Background (Proxy, Context Menu).
4.  Implement Extension Options & Popup.
5.  Implement Extension Content Script (Capture, Crop, Polling, DOM Manipulation).
6.  Create README (English).
