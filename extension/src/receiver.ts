import { dataUrlToFile, dispatchInputEvent, isSupportedServiceUrl, Payload } from './utils';

const CMD_PAYLOAD = 'CMD_PAYLOAD';

export const initReceiver = () => {
  chrome.runtime.onMessage.addListener(async (message, _sender, _sendResponse) => {
    if (message?.type !== CMD_PAYLOAD) return;
    const service = detectService();
    if (!service) return;

    try {
      await applyPayload(service, message.payload as Payload);
    } catch (error) {
      console.error('Receiver apply failed', error);
    }
  });
};

type Service = 'gemini' | 'chatgpt' | 'claude';

function detectService(): Service | null {
  const href = window.location.href;
  if (!isSupportedServiceUrl(href)) return null;
  try {
    const host = new URL(href).hostname;
    if (host.endsWith('gemini.google.com')) return 'gemini';
    if (host.endsWith('chatgpt.com')) return 'chatgpt';
    if (host.endsWith('claude.ai')) return 'claude';
  } catch (error) {
    return null;
  }
  return null;
  }

async function applyPayload(service: Service, payload: Payload) {
  if (service === 'gemini') {
    await handleContentEditable('div[contenteditable="true"]', payload);
    await wait(payload.image ? 5000 : 1000);
    await clickSendButton(['button.send-button']);
    return;
  }

  if (service === 'claude') {
    await handleClaudePayload(payload);
    await wait(payload.image ? 5000 : 1000);
    await clickSendButton(['button[aria-label="メッセージを送信"]']);
    return;
  }

  if (service === 'chatgpt') {
    await handleContentEditable('div[contenteditable="true"]', payload);
    await wait(payload.image ? 5000 : 1000);
    await clickSendButton(['#composer-submit-button']);
    return;
  }
}

async function handleContentEditable(selector: string, payload: Payload) {
  const target = document.querySelector<HTMLElement>(selector);
  if (!target) return;

  if (payload.image) {
    await pasteImage(target, payload.image);
  }

  if (payload.text) {
    focusAndInsertText(target, payload.text);
  }
}

async function handleClaudePayload(payload: Payload) {
  const target = document.querySelector<HTMLElement>('div[contenteditable="true"]');
  if (payload.image) {
    await attachClaudeImage(payload.image);
  }

  if (payload.text && target) {
    focusAndInsertText(target, payload.text);
  }
}

function focusAndInsertText(element: HTMLElement, text: string) {
  element.focus({ preventScroll: true });
  const inserted = document.execCommand('insertText', false, text);
  if (!inserted) {
    element.textContent = text;
  }
  dispatchInputEvent(element);
}

async function pasteImage(element: Element, dataUrl: string) {
  const file = await dataUrlToFile(dataUrl, `teleprompt-${Date.now()}.png`);
  const dataTransfer = new DataTransfer();
  dataTransfer.items.add(file);

  const event = new ClipboardEvent('paste', {
    clipboardData: dataTransfer,
    bubbles: true,
  });

  element.dispatchEvent(event);
}

async function clickSendButton(selectors: string[]) {
  for (const selector of selectors) {
    const button = document.querySelector<HTMLButtonElement>(selector);
    if (button) {
      button.click();
      return;
    }
  }
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function attachClaudeImage(dataUrl: string) {
  const input = document.querySelector<HTMLInputElement>('#chat-input-file-upload-bottom');
  if (!input) return;

  const file = await dataUrlToFile(dataUrl, `teleprompt-${Date.now()}.png`);
  const dataTransfer = new DataTransfer();
  dataTransfer.items.add(file);
  input.files = dataTransfer.files;

  const changeEvent = new Event('change', { bubbles: true });
  input.dispatchEvent(changeEvent);
}
