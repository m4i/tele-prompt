import { getIsReceiving, setIsReceiving } from './utils';

document.addEventListener('DOMContentLoaded', async () => {
  const toggle = document.getElementById('toggle') as HTMLInputElement;
  const status = document.getElementById('status');
  const openOptions = document.getElementById('openOptions');

  const current = await getIsReceiving();
  toggle.checked = current;
  if (status) status.textContent = current ? 'Receiver is ON' : 'Receiver is OFF';

  toggle.addEventListener('change', async () => {
    await setIsReceiving(toggle.checked);
    if (status) status.textContent = toggle.checked ? 'Receiver is ON' : 'Receiver is OFF';
  });

  openOptions?.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
});
