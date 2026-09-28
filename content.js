// content.js - Bridges messages from the webpage (inpage.js) to the Chrome extension.

window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  if (!event.data || event.data.source !== '__API_INSPECTOR__') return;

  try {
    chrome.runtime.sendMessage({
      type: 'API_CALL_RECORDED',
      payload: event.data.payload
    });
  } catch (error) {
    // Context may be invalidated if extension is reloaded
  }
});
