import { DEFAULT_SETTINGS, getSettings, saveSettings, TargetSelector } from './utils';

document.addEventListener('DOMContentLoaded', async () => {
  const serverUrlInput = document.getElementById('serverUrl') as HTMLInputElement;
  const apiKeyInput = document.getElementById('apiKey') as HTMLInputElement;
  const targetSelectorsInput = document.getElementById('targetSelectors') as HTMLTextAreaElement;
  const status = document.getElementById('status');

  const settings = await getSettings();
  serverUrlInput.value = settings.serverUrl || DEFAULT_SETTINGS.serverUrl;
  apiKeyInput.value = settings.apiKey || '';
  targetSelectorsInput.value = JSON.stringify(settings.targetSelectors, null, 2);

  document.getElementById('save')?.addEventListener('click', async () => {
    try {
      const parsedSelectors = JSON.parse(targetSelectorsInput.value || '[]') as TargetSelector[];
      await saveSettings({
        serverUrl: serverUrlInput.value || DEFAULT_SETTINGS.serverUrl,
        apiKey: apiKeyInput.value || '',
        targetSelectors: parsedSelectors
      });
      if (status) status.textContent = 'Saved.';
    } catch (error) {
      if (status) status.textContent = 'Invalid target selectors JSON.';
      console.error('Failed to save settings', error);
    }
  });
});
