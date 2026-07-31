// Pro Keys - Background Service Worker v5

// ========== PROXY ==========
function enableProxy(host, port, username, password) {
  chrome.proxy.settings.set({
    value: {
      mode: "fixed_servers",
      rules: {
        singleProxy: { scheme: "http", host: host, port: parseInt(port) },
        bypassList: ["localhost", "127.0.0.1"]
      }
    },
    scope: "regular"
  }, () => {
    chrome.storage.local.set({ proxyActive: true, proxyHost: host, proxyPort: port, proxyUser: username, proxyPass: password });
  });
}

function disableProxy() {
  chrome.proxy.settings.clear({ scope: "regular" }, () => {
    chrome.storage.local.set({ proxyActive: false });
  });
}

// ========== COOKIE INJECTION ==========
async function injectCookies(cookies) {
  let success = 0;
  let failed = 0;

  for (const cookie of cookies) {
    try {
      // نظف الـ domain من النقط
      let domain = (cookie.domain || "").replace(/^\.+/, "").trim();
      if (!domain) continue;

      // دايما https
      const cookieUrl = "https://" + domain + "/";

      const obj = {
        url:            cookieUrl,
        name:           cookie.name,
        value:          cookie.value || "",
        path:           "/",
        secure:         true,
        httpOnly:       cookie.httpOnly === true,
        sameSite:       "no_restriction",
        expirationDate: Math.floor(Date.now() / 1000) + 86400 * 30
      };

      // نضيف domain عشان يكرر على subdomain
      obj.domain = domain;

      await chrome.cookies.set(obj);
      success++;
    } catch (e) {
      failed++;
      console.warn("[ProKeys] skip cookie:", cookie.name, "|", e.message);
    }
  }

  console.log("[ProKeys] Cookies: " + success + " ok, " + failed + " skipped");
  return success;
}

// ========== WAIT FOR TAB ==========
function waitForTabLoad(tabId, timeout = 6000) {
  return new Promise(resolve => {
    const timer = setTimeout(resolve, timeout);
    function listener(id, info) {
      if (id === tabId && info.status === "complete") {
        clearTimeout(timer);
        chrome.tabs.onUpdated.removeListener(listener);
        setTimeout(resolve, 800);
      }
    }
    chrome.tabs.onUpdated.addListener(listener);
  });
}

// ========== LOGIN WITH SESSION ==========
async function loginWithSession(toolName, toolUrl, cookies, lsData, idbData) {
  // 1. احقن الكوكيز
  await injectCookies(cookies);
  await new Promise(r => setTimeout(r, 400));

  // 2. افتح تاب جديد دايما (أضمن من reload)
  const tab = await chrome.tabs.create({ url: toolUrl });
  const tabId = tab.id;

  // 3. استنى الصفحة تحمل بالكامل
  await waitForTabLoad(tabId);

  // 4. حقن localStorage
  if (lsData && Object.keys(lsData).length > 0) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        func: (data) => {
          for (const [k, v] of Object.entries(data)) {
            try { localStorage.setItem(k, v); } catch(e) {}
          }
        },
        args: [lsData]
      });
    } catch(e) { console.warn("[ProKeys] LS inject failed:", e.message); }
  }

  // 5. حقن IndexedDB (Firebase) — ده الأهم لـ QuillBot
  if (idbData && idbData.length > 0) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        func: (items) => {
          return new Promise(resolve => {
            const req = indexedDB.open("firebaseLocalStorageDb");
            req.onerror = () => resolve(false);
            req.onsuccess = e => {
              try {
                const db = e.target.result;
                const tx = db.transaction("firebaseLocalStorage", "readwrite");
                const store = tx.objectStore("firebaseLocalStorage");
                store.clear().onsuccess = () => {
                  let done = 0;
                  if (items.length === 0) { resolve(true); return; }
                  for (const item of items) {
                    store.put(item).onsuccess = () => {
                      done++;
                      if (done === items.length) resolve(true);
                    };
                  }
                };
              } catch(err) { resolve(false); }
            };
          });
        },
        args: [idbData]
      });
      console.log("[ProKeys] IDB injected:", idbData.length, "records");
    } catch(e) { console.warn("[ProKeys] IDB inject failed:", e.message); }
  }

  // 6. reload نهائي عشان الموقع يقرأ كل حاجة
  await new Promise(r => setTimeout(r, 500));
  await chrome.tabs.reload(tabId);

  return cookies.length;
}

// ========== MESSAGE HANDLER ==========
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  switch (msg.type) {

    case "ENABLE_PROXY":
      enableProxy(msg.host, msg.port, msg.username || "", msg.password || "");
      sendResponse({ success: true });
      break;

    case "DISABLE_PROXY":
      disableProxy();
      sendResponse({ success: true });
      break;

    case "LOGIN_WITH_SESSION":
      loginWithSession(msg.toolName, msg.toolUrl, msg.cookies || [], msg.localStorage || {}, msg.indexedDB || [])
        .then(count => sendResponse({ success: true, count }))
        .catch(e => sendResponse({ success: false, error: e.message }));
      return true;

    case "OPEN_TOOL":
      chrome.tabs.create({ url: msg.url })
        .then(() => sendResponse({ success: true }))
        .catch(e => sendResponse({ success: false, error: e.message }));
      return true;

    case "GET_STATUS":
      chrome.storage.local.get(["proxyActive", "proxyHost", "proxyPort"], d => {
        sendResponse({ proxyActive: d.proxyActive || false, proxyHost: d.proxyHost || "", proxyPort: d.proxyPort || "" });
      });
      return true;

    default:
      sendResponse({ success: false, error: "Unknown message: " + msg.type });
  }
  return true;
});

// Restore proxy on startup
chrome.runtime.onStartup.addListener(async () => {
  const d = await chrome.storage.local.get(["proxyActive", "proxyHost", "proxyPort", "proxyUser", "proxyPass"]);
  if (d.proxyActive && d.proxyHost) {
    enableProxy(d.proxyHost, d.proxyPort, d.proxyUser || "", d.proxyPass || "");
  }
});

console.log("[ProKeys] Background v5 ready");
