# TelePrompt Relay Server

Small Hono server that relays text and screenshots between TelePrompt collectors and receivers.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Configure environment:

- Copy `.env` and set `API_KEY` to your secret key.
- Optional: set `PORT` (default `5858`).

## Running

```bash
npm run dev   # watch mode with tsx
npm start     # run once with tsx
```

## Endpoints

- `GET /health` → `OK` for health checks.
- `POST /upload` → store payload after validating `X-Api-Key` header (server stamps `timestamp` when received).
- `GET /fetch` → retrieve and clear the latest payload, or `{ found: false }` when empty.

Payload shape:

```ts
interface Payload {
  image?: string; // Base64 data URL
  text?: string;  // Text content
  timestamp: number; // set by server on receipt
}
```

CORS is not required because the extension background script calls the server directly.
