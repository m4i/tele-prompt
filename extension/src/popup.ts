import { getReceivingTabs, isSupportedServiceUrl } from './utils';

const CMD_SET_RECEIVING = 'CMD_SET_RECEIVING';

document.addEventListener('DOMContentLoaded', async () => {
  const toggle = document.getElementById('toggle') as HTMLInputElement;
  const status = document.getElementById('status');
  const openOptions = document.getElementById('openOptions');
  const receivingList = document.getElementById('receivingList');

  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const tabId = activeTab?.id;

  const refreshList = async () => {
    if (!receivingList) return;
    const map = await getReceivingTabs();
    receivingList.innerHTML = '';
    Object.entries(map).forEach(([id, meta]) => {
      const li = document.createElement('li');
      const title = document.createElement('span');
      title.className = 'title';
      title.textContent = meta.title || meta.url || `Tab ${id}`;

      const actions = document.createElement('div');
      actions.className = 'actions';

      const switchBtn = document.createElement('button');
      switchBtn.className = 'link-btn';
      switchBtn.textContent = 'Switch';
      switchBtn.addEventListener('click', async () => {
        const targetTabId = Number(id);
        try {
          const tab = await chrome.tabs.get(targetTabId);
          await chrome.tabs.update(targetTabId, { active: true });
          if (tab.windowId !== undefined) {
            try {
              await chrome.windows.update(tab.windowId, { focused: true });
            } catch (error) {
              // Ignore if windows permission is missing or focus fails.
            }
          }
        } catch (error) {
          console.error('Failed to focus tab', error);
        }
      });

      const disableBtn = document.createElement('button');
      disableBtn.className = 'link-btn';
      disableBtn.textContent = 'Disable';
      disableBtn.addEventListener('click', async () => {
        const targetTabId = Number(id);
        await sendSetReceiving(targetTabId, false);
      });

      actions.appendChild(switchBtn);
      actions.appendChild(disableBtn);

      li.appendChild(title);
      li.appendChild(actions);
      receivingList.appendChild(li);
    });
  };

  const setToggleState = async () => {
    if (tabId === undefined) return;
    const map = await getReceivingTabs();
    const isOn = Boolean(map[String(tabId)]);
    toggle.checked = isOn;
    if (status) status.textContent = isOn ? 'Receiver is ON' : 'Receiver is OFF';
    if (!isSupportedServiceUrl(activeTab?.url) && status) {
      status.textContent = 'Not available on this site';
    }
  };

  await setToggleState();
  await refreshList();

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || !changes.receivingTabs) return;
    void setToggleState();
    void refreshList();
  });

  toggle.addEventListener('change', async () => {
    if (tabId === undefined) return;
    if (!isSupportedServiceUrl(activeTab?.url)) {
      toggle.checked = false;
      if (status) status.textContent = 'Not available on this site';
      return;
    }
    await sendSetReceiving(tabId, toggle.checked, {
      title: activeTab?.title,
      url: activeTab?.url,
      windowId: activeTab?.windowId
    });
  });

  openOptions?.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
});

const sendSetReceiving = async (tabId: number, enabled: boolean, entry?: Record<string, any>) => {
  await chrome.runtime.sendMessage({ type: CMD_SET_RECEIVING, tabId, enabled, entry });
};
