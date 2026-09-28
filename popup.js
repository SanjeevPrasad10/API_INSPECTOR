// popup.js - Manages the API Inspector UI, filtering, card rendering, and cURL generation.

document.addEventListener('DOMContentLoaded', async () => {
  const callsListEl = document.getElementById('callsList');
  const emptyStateEl = document.getElementById('emptyState');
  const callCountEl = document.getElementById('callCount');
  const tabInfoEl = document.getElementById('tabInfo');
  const clearBtn = document.getElementById('clearBtn');
  const pauseBtn = document.getElementById('pauseBtn');
  const searchInput = document.getElementById('searchInput');
  const filterPills = document.querySelectorAll('.filter-pill');
  const toastEl = document.getElementById('toast');

  let currentTabId = null;
  let allCalls = [];
  let currentFilter = 'all';
  let searchQuery = '';
  let isPaused = false;
  const expandedCallIds = new Set();

  // 1. Get Active Tab
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.id) {
      currentTabId = tab.id;
      const url = new URL(tab.url || 'http://localhost');
      tabInfoEl.textContent = `Monitoring: ${url.hostname}`;
    }
  } catch (err) {
    tabInfoEl.textContent = 'Monitoring Active Tab';
  }

  // 2. Load Intercepted Calls for Active Tab
  async function loadCalls() {
    if (!currentTabId) return;
    const storageKey = `tab_${currentTabId}`;
    const result = await chrome.storage.local.get(storageKey);
    allCalls = result[storageKey] || [];
    render();
  }

  // 3. Render Calls
  function render() {
    callCountEl.textContent = `${allCalls.length} Call${allCalls.length === 1 ? '' : 's'}`;

    // Filter calls
    const filtered = allCalls.filter((call) => {
      // Filter by type or errors
      if (currentFilter === 'errors') {
        if (call.status < 400 && call.status !== 0) return false;
      } else if (currentFilter === 'fetch' && call.type !== 'fetch') {
        return false;
      } else if (currentFilter === 'xhr' && call.type !== 'xhr') {
        return false;
      }

      // Filter by search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesUrl = (call.url || '').toLowerCase().includes(query);
        const matchesMethod = (call.method || '').toLowerCase().includes(query);
        if (!matchesUrl && !matchesMethod) return false;
      }

      return true;
    });

    if (filtered.length === 0) {
      callsListEl.innerHTML = '';
      emptyStateEl.style.display = 'block';
      callsListEl.appendChild(emptyStateEl);
      return;
    }

    emptyStateEl.style.display = 'none';
    callsListEl.innerHTML = '';

    filtered.forEach((call) => {
      const card = createCallCard(call);
      callsListEl.appendChild(card);
    });
  }

  // Helper to determine status color class
  function getStatusClass(status) {
    if (status === 0) return 'status-0';
    if (status >= 200 && status < 300) return 'status-2xx';
    if (status >= 300 && status < 400) return 'status-3xx';
    if (status >= 400 && status < 500) return 'status-4xx';
    if (status >= 500) return 'status-5xx';
    return 'status-2xx';
  }

  // Generate clean cURL command
  function generateCurl(call) {
    let curl = `curl -X ${call.method} "${call.url}"`;
    if (call.requestHeaders && typeof call.requestHeaders === 'object') {
      for (const [key, val] of Object.entries(call.requestHeaders)) {
        if (typeof val === 'string') {
          curl += ` \\\n  -H "${key}: ${val}"`;
        }
      }
    }
    if (call.requestBody) {
      const body =
        typeof call.requestBody === 'string'
          ? call.requestBody
          : JSON.stringify(call.requestBody);
      curl += ` \\\n  --data-raw '${body.replace(/'/g, "\\'")}'`;
    }
    return curl;
  }

  function showToast(text = 'Copied to clipboard!') {
    toastEl.textContent = text;
    toastEl.classList.add('show');
    setTimeout(() => {
      toastEl.classList.remove('show');
    }, 1800);
  }

  // Build Card DOM Element
  function createCallCard(call) {
    const card = document.createElement('div');
    card.className = 'call-card';

    const isExpanded = expandedCallIds.has(call.id);

    // Format clean relative path or host
    let displayPath = call.url;
    try {
      const parsed = new URL(call.url);
      displayPath = parsed.pathname + parsed.search;
      if (displayPath === '' || displayPath === '/') displayPath = parsed.hostname;
    } catch (e) {
      // Keep as-is
    }

    const summary = document.createElement('div');
    summary.className = 'card-summary';

    const left = document.createElement('div');
    left.className = 'card-summary-left';
    left.innerHTML = `
      <span class="chevron ${isExpanded ? 'open' : ''}">▶</span>
      <span class="method-tag method-${call.method}">${call.method}</span>
      <span class="status-badge ${getStatusClass(call.status)}">${call.status || 'ERR'}</span>
      <span class="url-path" title="${call.url}">${escapeHtml(displayPath)}</span>
    `;

    const right = document.createElement('div');
    right.className = 'card-summary-right';
    right.innerHTML = `
      <span class="duration-tag">${call.duration}ms</span>
    `;

    const curlBtn = document.createElement('button');
    curlBtn.className = 'curl-btn';
    curlBtn.textContent = 'cURL';
    curlBtn.title = 'Copy request as cURL command';
    curlBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const curlCmd = generateCurl(call);
      navigator.clipboard.writeText(curlCmd);
      showToast('cURL copied!');
    });
    right.appendChild(curlBtn);

    summary.appendChild(left);
    summary.appendChild(right);

    // Accordion Details View
    const details = document.createElement('div');
    details.className = `card-details ${isExpanded ? 'open' : ''}`;

    const fullUrlFormatted = `<strong>URL:</strong> ${escapeHtml(call.url)} <br><strong>Timestamp:</strong> ${call.timestamp} • ${call.type.toUpperCase()}`;

    let reqBodyContent = 'None';
    let reqBodyRaw = '';
    if (call.requestBody) {
      reqBodyRaw =
        typeof call.requestBody === 'object'
          ? JSON.stringify(call.requestBody, null, 2)
          : call.requestBody;
      reqBodyContent = reqBodyRaw;
    }

    let resBodyContent = 'Empty response';
    let resBodyRaw = '';
    if (call.responseBody) {
      resBodyRaw =
        typeof call.responseBody === 'object'
          ? JSON.stringify(call.responseBody, null, 2)
          : String(call.responseBody);
      resBodyContent = resBodyRaw;
    }

    details.innerHTML = `
      <div class="detail-section">
        <div class="detail-title">Request Info</div>
        <div class="code-block">${fullUrlFormatted}</div>
      </div>
      ${
        call.requestBody
          ? `<div class="detail-section">
              <div class="detail-title">
                <span>Request Payload</span>
                <button class="copy-mini-btn copy-req-btn">Copy</button>
              </div>
              <div class="code-block">${escapeHtml(reqBodyContent)}</div>
            </div>`
          : ''
      }
      <div class="detail-section">
        <div class="detail-title">
          <span>Response Data (${call.statusText || 'OK'})</span>
          ${resBodyRaw ? '<button class="copy-mini-btn copy-res-btn">Copy JSON</button>' : ''}
        </div>
        <div class="code-block">${escapeHtml(resBodyContent)}</div>
      </div>
    `;

    // Copy handlers for payload and response
    const copyReqBtn = details.querySelector('.copy-req-btn');
    if (copyReqBtn) {
      copyReqBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(reqBodyRaw);
        showToast('Payload copied!');
      });
    }

    const copyResBtn = details.querySelector('.copy-res-btn');
    if (copyResBtn) {
      copyResBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(resBodyRaw);
        showToast('Response JSON copied!');
      });
    }

    // Toggle accordion on summary click
    summary.addEventListener('click', () => {
      const chevron = left.querySelector('.chevron');
      if (details.classList.contains('open')) {
        details.classList.remove('open');
        chevron.classList.remove('open');
        expandedCallIds.delete(call.id);
      } else {
        details.classList.add('open');
        chevron.classList.add('open');
        expandedCallIds.add(call.id);
      }
    });

    card.appendChild(summary);
    card.appendChild(details);
    return card;
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  // 4. Clear Handler
  clearBtn.addEventListener('click', async () => {
    if (!currentTabId) return;
    const storageKey = `tab_${currentTabId}`;
    await chrome.storage.local.remove(storageKey);
    await chrome.action.setBadgeText({ text: '', tabId: currentTabId });
    allCalls = [];
    expandedCallIds.clear();
    render();
    showToast('Cleared recorded calls');
  });

  // 5. Pause Handler
  pauseBtn.addEventListener('click', () => {
    isPaused = !isPaused;
    if (isPaused) {
      pauseBtn.textContent = '▶️ Resume';
      pauseBtn.classList.add('paused');
      showToast('Live feed paused');
    } else {
      pauseBtn.textContent = '⏸️ Pause';
      pauseBtn.classList.remove('paused');
      showToast('Live feed resumed');
      loadCalls();
    }
  });

  // 6. Search Handler
  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value.trim();
    render();
  });

  // 7. Filter Pills Handler
  filterPills.forEach((pill) => {
    pill.addEventListener('click', () => {
      filterPills.forEach((p) => p.classList.remove('active'));
      pill.classList.add('active');
      currentFilter = pill.getAttribute('data-filter');
      render();
    });
  });

  // 8. Live storage listener with debouncing
  let renderDebounceTimer = null;
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && currentTabId && changes[`tab_${currentTabId}`]) {
      if (isPaused) return; // Don't interrupt developer while paused!
      allCalls = changes[`tab_${currentTabId}`].newValue || [];
      clearTimeout(renderDebounceTimer);
      renderDebounceTimer = setTimeout(() => {
        render();
      }, 100);
    }
  });

  // Initial load
  await loadCalls();
});
