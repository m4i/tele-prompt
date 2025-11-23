import {
  dataUrlToFile,
  dispatchInputEvent,
  getIsReceiving,
  Payload
} from './utils';

const CMD_FETCH = 'CMD_FETCH';

let intervalId: number | null = null;

export const initReceiver = () => {
  if (intervalId !== null) return;
  intervalId = window.setInterval(tick, 1000);
};

const sendMessage = <T,>(payload: any) =>
  new Promise<T>((resolve, reject) => {
    chrome.runtime.sendMessage(payload, (response) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
        return;
      }
      resolve(response as T);
    });
  });

async function tick() {
  const isReceiving = await getIsReceiving();
  if (!isReceiving) return;

  const service = detectService();
  if (!service) return;

  try {
    const response = await sendMessage<{ ok: boolean; found?: boolean; payload?: Payload; error?: string }>(
      {
        type: CMD_FETCH
      }
    );

    if (!response?.ok) {
      if (response?.error) console.error('Fetch error', response.error);
      return;
    }

    if (response.found && response.payload) {
      await applyPayload(service, response.payload);
    }
  } catch (error) {
    console.error('Receiver tick failed', error);
  }
}

type Service = 'gemini' | 'chatgpt' | 'claude';

function detectService(): Service | null {
  const href = window.location.href;
  if (href.includes('gemini.google.com')) return 'gemini';
  if (href.includes('chatgpt.com')) return 'chatgpt';
  if (href.includes('claude.ai')) return 'claude';
  return null;
}

async function applyPayload(service: Service, payload: Payload) {
  if (service === 'gemini') {
    await handleContentEditable('div[contenteditable="true"]', payload);
    return;
  }

  if (service === 'claude') {
    await handleContentEditable('div[contenteditable="true"]', payload);
    return;
  }

  if (service === 'chatgpt') {
    await handleChatGpt(payload);
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

async function handleChatGpt(payload: Payload) {
  const textarea = document.querySelector<HTMLTextAreaElement>('#prompt-textarea');
  if (!textarea) return;

  if (payload.image) {
    await pasteImage(textarea, payload.image);
  }

  if (payload.text !== undefined) {
    textarea.value = payload.text;
    dispatchInputEvent(textarea);
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
    bubbles: true
  });

  element.dispatchEvent(event);
}
