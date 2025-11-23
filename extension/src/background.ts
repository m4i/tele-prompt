import { buildAuthHeaders, getSettings, nowTimestamp, Payload } from './utils';

const CMD_UPLOAD = 'CMD_UPLOAD';
const CMD_FETCH = 'CMD_FETCH';
const CMD_CAPTURE = 'CMD_CAPTURE';

const contextMenuId = 'teleprompt-upload-selection';

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

  return false;
});

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
