// inpage.js - Runs in the MAIN world of the webpage.
// Intercepts window.fetch and XMLHttpRequest without breaking website logic.

(function () {
  if (window.__API_INSPECTOR_ACTIVE__) return;
  window.__API_INSPECTOR_ACTIVE__ = true;

  function emitApiCall(details) {
    try {
      window.postMessage(
        {
          source: '__API_INSPECTOR__',
          payload: details
        },
        '*'
      );
    } catch (e) {
      // Silently prevent errors if postMessage fails on strange objects
    }
  }

  // ================= 1. INTERCEPT FETCH =================
  const originalFetch = window.fetch;
  window.fetch = async function (...args) {
    const startTime = performance.now();
    const id = 'req_' + Math.random().toString(36).slice(2, 9);

    let url = typeof args[0] === 'string' ? args[0] : args[0]?.url || '';
    let method = (
      args[1]?.method ||
      (typeof args[0] === 'object' && args[0]?.method) ||
      'GET'
    ).toUpperCase();

    let requestHeaders =
      args[1]?.headers ||
      (typeof args[0] === 'object' && args[0]?.headers) ||
      {};
    let requestBody =
      args[1]?.body ||
      (typeof args[0] === 'object' && args[0]?.body) ||
      null;

    if (requestBody && typeof requestBody !== 'string') {
      try {
        requestBody = JSON.stringify(requestBody);
      } catch (err) {
        requestBody = '[Object / FormData]';
      }
    }

    try {
      const response = await originalFetch.apply(this, args);
      const duration = Math.round(performance.now() - startTime);

      // Clone response so webpage can still consume original body stream
      let responseBody = '';
      try {
        const clone = response.clone();
        const text = await clone.text();
        try {
          responseBody = JSON.parse(text);
        } catch {
          responseBody = text.slice(0, 10000); // Truncate giant payloads
        }
      } catch (cloneErr) {
        responseBody = '[Binary or Unreadable Body]';
      }

      emitApiCall({
        id,
        type: 'fetch',
        url,
        method,
        status: response.status,
        statusText: response.statusText || (response.status === 200 ? 'OK' : ''),
        duration,
        timestamp: new Date().toLocaleTimeString(),
        requestHeaders,
        requestBody,
        responseBody
      });

      return response;
    } catch (error) {
      const duration = Math.round(performance.now() - startTime);
      emitApiCall({
        id,
        type: 'fetch',
        url,
        method,
        status: 0,
        statusText: 'Failed / Network Error',
        duration,
        timestamp: new Date().toLocaleTimeString(),
        requestHeaders,
        requestBody,
        responseBody: error.message || 'Network request failed'
      });
      throw error;
    }
  };

  // ================= 2. INTERCEPT XMLHTTPREQUEST =================
  const OriginalXHR = window.XMLHttpRequest;
  function InterceptedXHR() {
    const xhr = new OriginalXHR();
    let startTime = 0;
    let method = 'GET';
    let url = '';
    let requestBody = null;
    let requestHeaders = {};

    const originalOpen = xhr.open;
    xhr.open = function (m, u, ...rest) {
      method = (m || 'GET').toUpperCase();
      url = u;
      return originalOpen.apply(xhr, [m, u, ...rest]);
    };

    const originalSetRequestHeader = xhr.setRequestHeader;
    xhr.setRequestHeader = function (header, value) {
      requestHeaders[header] = value;
      return originalSetRequestHeader.apply(xhr, [header, value]);
    };

    const originalSend = xhr.send;
    xhr.send = function (body) {
      startTime = performance.now();
      requestBody = body;

      xhr.addEventListener('loadend', function () {
        const duration = Math.round(performance.now() - startTime);
        let responseBody = '';
        try {
          responseBody = JSON.parse(xhr.responseText);
        } catch {
          responseBody = (xhr.responseText || '').slice(0, 10000);
        }

        emitApiCall({
          id: 'req_' + Math.random().toString(36).slice(2, 9),
          type: 'xhr',
          url: url.toString(),
          method,
          status: xhr.status,
          statusText: xhr.statusText || (xhr.status === 200 ? 'OK' : ''),
          duration,
          timestamp: new Date().toLocaleTimeString(),
          requestHeaders,
          requestBody:
            typeof requestBody === 'string'
              ? requestBody
              : requestBody
              ? '[Payload]'
              : null,
          responseBody
        });
      });

      return originalSend.apply(xhr, [body]);
    };

    return xhr;
  }

  InterceptedXHR.prototype = OriginalXHR.prototype;
  window.XMLHttpRequest = InterceptedXHR;
})();
