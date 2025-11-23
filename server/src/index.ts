import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import dotenv from 'dotenv';

dotenv.config();

interface Payload {
  image?: string;
  text?: string;
  timestamp: number;
}

const API_KEY = process.env.API_KEY;
let storedPayload: Payload | null = null;

const app = new Hono();

const isAuthorized = (providedKey?: string | null) => {
  if (!API_KEY) return false;
  return providedKey === API_KEY;
};

app.get('/health', (c) => c.text('OK'));

app.post('/upload', async (c) => {
  if (!isAuthorized(c.req.header('X-Api-Key'))) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  let body: Payload;
  try {
    body = await c.req.json<Payload>();
  } catch (error) {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  storedPayload = {
    image: body.image,
    text: body.text,
    timestamp: Date.now()
  };
  return c.json({ ok: true });
});

app.get('/fetch', (c) => {
  if (!isAuthorized(c.req.header('X-Api-Key'))) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  if (!storedPayload) {
    return c.json({ found: false });
  }

  const payload = storedPayload;
  storedPayload = null;
  return c.json({ found: true, payload });
});

const port = Number(process.env.PORT) || 5858;

serve({
  fetch: app.fetch,
  port,
});

console.log(`TelePrompt Relay Server listening on http://localhost:${port}`);
