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

export interface ReceivingEntry {
  title?: string;
  url?: string;
  windowId?: number;
}

export type ReceivingTabsMap = Record<string, ReceivingEntry>;

export const DEFAULT_SETTINGS: Settings = {
  serverUrl: 'http://localhost:5858',
  apiKey: '',
  targetSelectors: [
    { urlPattern: 'gemini.google.com', selector: 'div[contenteditable="true"]' },
    { urlPattern: 'chatgpt.com', selector: '#prompt-textarea' },
    { urlPattern: 'claude.ai', selector: 'div[contenteditable="true"]' }
  ]
};

export const getSettings = async (): Promise<Settings> => {
  try {
    const stored = await chrome.storage.sync.get(DEFAULT_SETTINGS);
    return {
      serverUrl: stored.serverUrl || DEFAULT_SETTINGS.serverUrl,
      apiKey: stored.apiKey || DEFAULT_SETTINGS.apiKey,
      targetSelectors: Array.isArray(stored.targetSelectors)
        ? stored.targetSelectors
        : DEFAULT_SETTINGS.targetSelectors
    };
  } catch (error) {
    return DEFAULT_SETTINGS;
  }
};

export const saveSettings = async (settings: Partial<Settings>) => {
  return chrome.storage.sync.set(settings);
};

export const getReceivingTabs = async (): Promise<ReceivingTabsMap> => {
  try {
    const { receivingTabs } = await chrome.storage.local.get({ receivingTabs: {} });
    return (receivingTabs || {}) as ReceivingTabsMap;
  } catch (error) {
    return {};
  }
};

export const setReceivingTab = async (tabId: number, enabled: boolean, entry?: ReceivingEntry) => {
  const receivingTabs = await getReceivingTabs();
  const key = String(tabId);
  if (enabled) {
    receivingTabs[key] = entry || {};
  } else {
    delete receivingTabs[key];
  }
  await chrome.storage.local.set({ receivingTabs });
};

export const removeReceivingTab = async (tabId: number) => setReceivingTab(tabId, false);

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

export const isSupportedServiceUrl = (href?: string | null): boolean => {
  if (!href) return false;
  try {
    const url = new URL(href);
    const host = url.hostname;
    return (
      host.endsWith('gemini.google.com') ||
      host.endsWith('chatgpt.com') ||
      host.endsWith('claude.ai')
    );
  } catch (error) {
    return false;
  }
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
