import { findMatchingSelector, getSettings, nowTimestamp, Payload } from './utils';
import { initReceiver } from './receiver';

const CMD_UPLOAD = 'CMD_UPLOAD';
const CMD_CAPTURE = 'CMD_CAPTURE';

let isUploading = false;

const sendMessage = <T>(payload: any) =>
  new Promise<T>((resolve, reject) => {
    chrome.runtime.sendMessage(payload, (response) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
        return;
      }
      resolve(response as T);
    });
  });

document.addEventListener('dblclick', async (event) => {
  if (isUploading) return;
  const settings = await getSettings();
  const selector = findMatchingSelector(document.location.href, settings.targetSelectors);
  if (!selector) return;

  const target = (event.target as HTMLElement | null)?.closest(selector) as HTMLElement | null;
  if (!target) return;

  isUploading = true;
  try {
    const rect = getViewportRect(target);
    console.debug('TelePrompt: dblclick target matched', { selector, rect });
    const captureResponse = await sendMessage<{ ok: boolean; image?: string; error?: string }>({
      type: CMD_CAPTURE,
    });
    if (!captureResponse?.ok || !captureResponse.image) {
      console.error('Capture failed', captureResponse?.error);
      return;
    }

    const croppedImage = await cropImage(captureResponse.image, rect);
    const payload: Payload = {
      image: croppedImage,
      text: target.innerText?.trim() || undefined,
      timestamp: nowTimestamp(),
    };
    console.debug('TelePrompt: uploading payload', {
      hasImage: Boolean(payload.image),
      hasText: Boolean(payload.text),
      timestamp: payload.timestamp,
    });

    const uploadResponse = await sendMessage<{ ok: boolean; error?: string }>({
      type: CMD_UPLOAD,
      payload,
    });
    if (!uploadResponse?.ok) {
      console.error('Upload failed', uploadResponse?.error);
    }
  } catch (error) {
    console.error('TelePrompt double click failed', error);
  } finally {
    isUploading = false;
  }
});

initReceiver();

// Convert an element's bounding rect to the top-level viewport, accounting for nested iframes.
function getViewportRect(target: HTMLElement): DOMRect {
  let rect = target.getBoundingClientRect();
  let currentWindow: Window | null = window;

  try {
    while (currentWindow !== currentWindow.parent && currentWindow.frameElement) {
      const frameRect = currentWindow.frameElement.getBoundingClientRect();
      rect = new DOMRect(
        rect.left + frameRect.left,
        rect.top + frameRect.top,
        rect.width,
        rect.height
      );
      currentWindow = currentWindow.parent;
    }
  } catch (error) {
    console.warn('TelePrompt: failed to walk frame chain for rect', error);
  }

  return rect;
}

async function cropImage(dataUrl: string, rect: DOMRect): Promise<string> {
  const image = await loadImage(dataUrl);
  const dpr = window.devicePixelRatio || 1;
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(rect.width * dpr));
  canvas.height = Math.max(1, Math.round(rect.height * dpr));

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');

  ctx.drawImage(
    image,
    rect.x * dpr,
    rect.y * dpr,
    rect.width * dpr,
    rect.height * dpr,
    0,
    0,
    canvas.width,
    canvas.height
  );

  return canvas.toDataURL('image/png');
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = (error) => reject(error);
    img.src = src;
  });
}
