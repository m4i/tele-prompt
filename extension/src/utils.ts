export interface Payload {
  image?: string;
  text?: string;
  timestamp: number;
}

export interface TargetSelector {
  urlPattern: string;
  selector: string;
}

export interface Settings {
  serverUrl: string;
  apiKey: string;
  targetSelectors: TargetSelector[];
}

export const DEFAULT_SETTINGS: Settings = {
  serverUrl: 'http://localhost:5000',
  apiKey: '',
  targetSelectors: [
    { urlPattern: 'gemini.google.com', selector: 'div[contenteditable="true"]' },
    { urlPattern: 'chatgpt.com', selector: '#prompt-textarea' },
    { urlPattern: 'claude.ai', selector: 'div[contenteditable="true"]' }
  ]
};

export const getSettings = async (): Promise<Settings> => {
  const stored = await chrome.storage.sync.get(DEFAULT_SETTINGS);
  return {
    serverUrl: stored.serverUrl || DEFAULT_SETTINGS.serverUrl,
    apiKey: stored.apiKey || DEFAULT_SETTINGS.apiKey,
    targetSelectors: Array.isArray(stored.targetSelectors)
      ? stored.targetSelectors
      : DEFAULT_SETTINGS.targetSelectors
  };
};

export const saveSettings = async (settings: Partial<Settings>) => {
  return chrome.storage.sync.set(settings);
};

export const getIsReceiving = async (): Promise<boolean> => {
  const { isReceiving } = await chrome.storage.local.get({ isReceiving: false });
  return Boolean(isReceiving);
};

export const setIsReceiving = async (value: boolean) => chrome.storage.local.set({ isReceiving: value });

export const urlMatchesPattern = (href: string, pattern: string): boolean => {
  try {
    const regexp = new RegExp(pattern);
    return regexp.test(href);
  } catch (error) {
    return href.includes(pattern);
  }
};

export const findMatchingSelector = (href: string, selectors: TargetSelector[]): string | null => {
  const match = selectors.find((entry) => urlMatchesPattern(href, entry.urlPattern));
  return match ? match.selector : null;
};

export const buildAuthHeaders = (apiKey: string): Record<string, string> => ({
  'Content-Type': 'application/json',
  'X-Api-Key': apiKey || ''
});

export const nowTimestamp = () => Date.now();

export const dataUrlToFile = async (dataUrl: string, fileName: string): Promise<File> => {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return new File([blob], fileName, { type: blob.type || 'image/png' });
};

export const dispatchInputEvent = (target: HTMLElement | HTMLTextAreaElement) => {
  const inputEvent = new Event('input', { bubbles: true });
  target.dispatchEvent(inputEvent);
};
