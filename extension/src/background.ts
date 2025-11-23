import {
  buildAuthHeaders,
  getReceivingTabs,
  getSettings,
  isSupportedServiceUrl,
  nowTimestamp,
  Payload,
  removeReceivingTab,
  setReceivingTab
} from './utils';

const CMD_UPLOAD = 'CMD_UPLOAD';
const CMD_FETCH = 'CMD_FETCH';
const CMD_CAPTURE = 'CMD_CAPTURE';
const CMD_PAYLOAD = 'CMD_PAYLOAD';
const CMD_SET_RECEIVING = 'CMD_SET_RECEIVING';

const contextMenuId = 'teleprompt-upload-selection';

let isFetching = false;
let lastReceivingCount = 0;

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: contextMenuId,
    title: 'Send selection to TelePrompt',
    contexts: ['selection']
  });
});

chrome.contextMenus.onClicked.addListener(async (info) => {
  if (info.menuItemId !== contextMenuId || !info.selectionText) return;
  await uploadPayload({ text: info.selectionText, timestamp: nowTimestamp() });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === CMD_UPLOAD) {
    uploadPayload(message.payload)
      .then((result) => sendResponse(result))
      .catch((error) => sendResponse({ ok: false, error: String(error) }));
    return true;
  }

  if (message?.type === CMD_FETCH) {
    fetchPayload()
      .then((result) => sendResponse(result))
      .catch((error) => sendResponse({ ok: false, error: String(error) }));
    return true;
  }

  if (message?.type === CMD_CAPTURE) {
    captureVisibleTab()
      .then((image) => sendResponse({ ok: true, image }))
      .catch((error) => sendResponse({ ok: false, error: String(error) }));
    return true;
  }

  if (message?.type === CMD_SET_RECEIVING) {
    const tabId = sender?.tab?.id ?? message.tabId;
    if (tabId === undefined) {
      sendResponse({ ok: false, error: 'No tabId provided' });
      return true;
    }
    const enabled = Boolean(message.enabled);
    const entry = message.entry;
    if (enabled && !isSupportedServiceUrl(entry?.url)) {
      sendResponse({ ok: false, error: 'Unsupported page for receiver' });
      return true;
    }
    setReceivingTab(tabId, enabled, entry)
      .then(() => {
        console.debug(`TelePrompt BG: tab ${tabId} ${enabled ? 'enabled' : 'disabled'}`);
        sendResponse({ ok: true });
      })
      .catch((error) => sendResponse({ ok: false, error: String(error) }));
    return true;
  }

  return false;
});

// Poll server once and fan-out to tabs, to avoid multiple tabs consuming the payload.
setInterval(() => {
  void pollAndBroadcast();
}, 1000);

async function pollAndBroadcast() {
  if (isFetching) return;
  isFetching = true;

  try {
    const receivingTabs = await getReceivingTabs();
    const entries = Object.entries(receivingTabs);
    const currentCount = entries.length;

    if (currentCount === 0) {
      if (lastReceivingCount > 0) {
        console.debug('TelePrompt BG: stopping fetch, no receiving tabs');
      }
      lastReceivingCount = 0;
      return;
    }

    if (lastReceivingCount === 0 && currentCount > 0) {
      console.debug('TelePrompt BG: starting fetch loop, receiving tabs:', entries.map(([id]) => Number(id)));
    }
    lastReceivingCount = currentCount;

    const result = await fetchPayload();
    if (result?.found && result.payload) {
      console.debug('TelePrompt BG: payload received from server', {
        hasImage: Boolean(result.payload.image),
        hasText: Boolean(result.payload.text),
        timestamp: result.payload.timestamp,
        tabs: entries.map(([tabId]) => Number(tabId)),
      });
      await broadcastPayload(
        result.payload,
        entries.map(([tabId]) => Number(tabId))
      );
    }
  } catch (error) {
    console.error('Poll/broadcast failed', error);
  } finally {
    isFetching = false;
  }
}

async function broadcastPayload(payload: Payload, tabIds: number[]) {
  await Promise.all(
    tabIds.map(async (tabId) => {
      try {
        await chrome.tabs.sendMessage(tabId, { type: CMD_PAYLOAD, payload });
      } catch (error) {
        console.warn('TelePrompt BG: failed to send payload to tab', tabId, error);
      }
    })
  );
}

async function uploadPayload(payload: Payload) {
  const settings = await getSettings();
  const response = await fetch(`${settings.serverUrl}/upload`, {
    method: 'POST',
    headers: buildAuthHeaders(settings.apiKey),
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Upload failed (${response.status}): ${message}`);
  }

  return { ok: true };
}

async function fetchPayload() {
  const settings = await getSettings();
  const response = await fetch(`${settings.serverUrl}/fetch`, {
    method: 'GET',
    headers: buildAuthHeaders(settings.apiKey)
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Fetch failed (${response.status}): ${message}`);
  }

  const data = await response.json();
  return { ok: true, ...data };
}

async function captureVisibleTab(): Promise<string> {
  const image = await chrome.tabs.captureVisibleTab({ format: 'png' });
  if (!image) {
    throw new Error('Unable to capture tab');
  }
  return image;
}

// Clean up receiving tabs when they are closed.
chrome.tabs.onRemoved.addListener(async (tabId) => {
  await removeReceivingTab(tabId);
});
