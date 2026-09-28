#  API Inspector — Frontend Network Lens

> A lightweight, focused Chrome Extension (Manifest V3) that intercepts and visualizes `fetch` and `XMLHttpRequest` API calls in real time. Designed specifically for frontend engineers and API debugging.

![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue.svg)
![Vanilla JS](https://img.shields.io/badge/Stack-Vanilla%20JS%20%7C%20CSS3-green.svg)
![Status](https://img.shields.io/badge/Status-Production%20Ready-brightgreen.svg)

---

# Idea behind these project 

Chrome DevTools' Network panel is powerful, but it shows **everything** — HTML chunks, CSS, web fonts, tracking pixels, WebSockets, and media assets.

**API Inspector** gives you a dedicated, noise-free feed of strictly **your app's API traffic (`fetch` & `XHR`)**:
- ⏱️ **Instant Latency & Status:** Spot slow endpoints and `4xx` / `5xx` errors at a glance.
- 📋 **1-Click "Copy as cURL":** Instantly replay failing requests directly in your terminal, Postman, or Thunder Client.
- 🔍 **Payload & Response Inspector:** Expand any request card to see formatted Request Payloads, Response JSON, and Headers.

---

## 🚀 How to Install in 30 Seconds (Free, Unpacked)

1. Open **Google Chrome** (or Brave / Edge).
2. In the URL bar, go to:
   ```
   chrome://extensions
   ```
3. Enable **"Developer mode"** (toggle in the top-right corner).
4. Click **"Load unpacked"** (top-left button).
5. Select these downloaded folder from your computer:
6. **Done!** Pin the ⚡ **API Inspector** icon to your toolbar.
7. Open any website (e.g. `github.com` or `youtube.com`) or your local React app, click the icon, and watch live API calls populate!

