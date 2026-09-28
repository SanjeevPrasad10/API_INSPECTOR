// background.js - Service worker managing intercepted API calls and badge counters per tab.

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'API_CALL_RECORDED' && sender.tab?.id) {
    const tabId = sender.tab.id;
    const storageKey = `tab_${tabId}`;

    (async () => {
      try {
        const stored = await chrome.storage.local.get(storageKey);
        const calls = stored[storageKey] || [];

        // Add to beginning of array (latest first) and keep last 100 requests
        calls.unshift(message.payload);
        if (calls.length > 100) calls.pop();

        await chrome.storage.local.set({ [storageKey]: calls });

        // Update badge on extension toolbar icon
        await chrome.action.setBadgeText({
          text: String(calls.length),
          tabId: tabId
        });
        await chrome.action.setBadgeBackgroundColor({
          color: '#2563eb',
          tabId: tabId
        });
      } catch (err) {
        console.error('Error recording API call in storage:', err);
      }
    })();
  }
  return true; // Keep message channel open for async operations
});

// Reset storage and badge when user navigates or reloads the tab
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'loading') {
    const storageKey = `tab_${tabId}`;
    chrome.storage.local.remove(storageKey);
    chrome.action.setBadgeText({ text: '', tabId: tabId });
  }
});

// Clean up storage when tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
  const storageKey = `tab_${tabId}`;
  chrome.storage.local.remove(storageKey);
});
