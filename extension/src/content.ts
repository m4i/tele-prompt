import { findMatchingSelector, getSettings, nowTimestamp, Payload } from './utils';
import { initReceiver } from './receiver';

const CMD_UPLOAD = 'CMD_UPLOAD';
const CMD_CAPTURE = 'CMD_CAPTURE';

let isUploading = false;

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

document.addEventListener('dblclick', async (event) => {
  if (isUploading) return;

  const settings = await getSettings();
  const selector = findMatchingSelector(window.location.href, settings.targetSelectors);
  if (!selector) return;

  const target = (event.target as HTMLElement | null)?.closest(selector) as HTMLElement | null;
  if (!target) return;

  isUploading = true;
  try {
    const rect = target.getBoundingClientRect();
    const captureResponse = await sendMessage<{ ok: boolean; image?: string; error?: string }>({ type: CMD_CAPTURE });
    if (!captureResponse?.ok || !captureResponse.image) {
      console.error('Capture failed', captureResponse?.error);
      return;
    }

    const croppedImage = await cropImage(captureResponse.image, rect);
    const payload: Payload = {
      image: croppedImage,
      text: target.innerText?.trim() || undefined,
      timestamp: nowTimestamp()
    };

    const uploadResponse = await sendMessage<{ ok: boolean; error?: string }>({ type: CMD_UPLOAD, payload });
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
