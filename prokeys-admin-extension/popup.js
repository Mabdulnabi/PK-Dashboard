// Pro Keys - Popup Script v4

const TOOLS = [
  { name: "Turnitin",  url: "https://www.turnitin.com",    icon: "📝" },
  { name: "Ahrefs",    url: "https://app.ahrefs.com",      icon: "📊" },
  { name: "SEMrush",   url: "https://www.semrush.com",     icon: "🔍" },
  { name: "QuillBot",  url: "https://quillbot.com",        icon: "✍️"  },
  { name: "Grammarly", url: "https://app.grammarly.com",   icon: "✅" },
  { name: "ChatGPT",   url: "https://chatgpt.com",         icon: "🤖" },
  { name: "Canva",     url: "https://www.canva.com",       icon: "🎨" },
  { name: "Gemini",    url: "https://gemini.google.com",   icon: "💎" },
];

// ========== INIT ==========
document.addEventListener("DOMContentLoaded", () => {

  // TABS
  document.querySelectorAll(".tab").forEach(tab => {
    tab.addEventListener("click", () => switchTab(tab.dataset.tab));
  });

  // SESSIONS
  document.getElementById("btnCapture").addEventListener("click", autoCaptureFromTab);
  document.getElementById("btnSaveSession").addEventListener("click", saveSession);

  // PROXY
  document.getElementById("btnEnableProxy").addEventListener("click", enableProxy);
  document.getElementById("btnDisableProxy").addEventListener("click", disableProxy);

  // COPY
  document.getElementById("btnCopySession").addEventListener("click", copySessionToClipboard);

  // BUILD UI
  buildSessionSelect();
  buildToolsGrid();
  loadSessionsList();
  loadSavedProxy();
  refreshStatus();
});

// ========== TABS ==========
function switchTab(name) {
  document.querySelectorAll(".tab").forEach(t => {
    t.classList.toggle("active", t.dataset.tab === name);
  });
  document.querySelectorAll(".panel").forEach(p => p.classList.remove("active"));
  document.getElementById("tab-" + name).classList.add("active");
  if (name === "sessions") loadSessionsList();
}

// ========== CHROME STORAGE ==========
function getSessions(cb) {
  chrome.storage.local.get("pk_sessions", d => cb(d.pk_sessions || {}));
}
function setSessions(sessions, cb) {
  chrome.storage.local.set({ pk_sessions: sessions }, cb);
}

// ========== TOOLS GRID ==========
function buildToolsGrid() {
  getSessions(sessions => {
    const grid = document.getElementById("toolsGrid");
    grid.innerHTML = "";
    TOOLS.forEach(tool => {
      const hasSess = !!sessions[tool.name];
      const card = document.createElement("div");
      card.className = "tool-card" + (hasSess ? " has-session" : "");
      card.innerHTML = `
        <span class="tool-icon">${tool.icon}</span>
        <span class="tool-name">${tool.name}</span>
        <span class="${hasSess ? "session-badge" : "no-session-badge"}">${hasSess ? "✓ Session" : "بدون session"}</span>
      `;
      card.addEventListener("click", () => handleToolClick(tool, hasSess, sessions));
      grid.appendChild(card);
    });
  });
}

function handleToolClick(tool, hasSess, sessions) {
  if (hasSess) {
    const sess = sessions[tool.name];
    chrome.runtime.sendMessage({
      type: "LOGIN_WITH_SESSION",
      toolName: tool.name,
      toolUrl: tool.url,
      cookies: sess.cookies || [],
      localStorage: sess.localStorage || {},
      indexedDB: sess.indexedDB || []
    }, res => {
      if (chrome.runtime.lastError) { showToast("خطأ في الاتصال", "err"); return; }
      if (res && res.success) {
        showToast("✅ تم تسجيل الدخول لـ " + tool.name, "ok");
        document.getElementById("activeTool").textContent = "● " + tool.name;
      } else {
        showToast("فشل: " + (res?.error || "غير معروف"), "err");
      }
    });
  } else {
    chrome.tabs.create({ url: tool.url });
    showToast("🚀 فتح " + tool.name, "info");
  }
}

// ========== SESSIONS ==========
function buildSessionSelect() {
  const sel = document.getElementById("sessionTool");
  TOOLS.forEach(t => {
    const opt = document.createElement("option");
    opt.value = t.name;
    opt.textContent = t.icon + " " + t.name;
    sel.appendChild(opt);
  });
}

function saveSession() {
  const toolName = document.getElementById("sessionTool").value;
  const rawData = document.getElementById("sessionCookies").value.trim();
  if (!toolName) { showToast("اختار الأداة", "err"); return; }
  if (!rawData) { showToast("أدخل البيانات", "err"); return; }

  let parsed;
  try { parsed = JSON.parse(rawData); } catch { showToast("⚠️ صيغة JSON غلط", "err"); return; }

  // support both formats: array of cookies OR {cookies, localStorage}
  let sessionObj;
  if (Array.isArray(parsed)) {
    sessionObj = { cookies: parsed, localStorage: {} };
  } else if (parsed.cookies) {
    sessionObj = parsed;
  } else {
    showToast("⚠️ صيغة غير معروفة", "err"); return;
  }
  sessionObj.savedAt = new Date().toLocaleDateString("ar-EG");

  getSessions(sessions => {
    sessions[toolName] = sessionObj;
    setSessions(sessions, () => {
      document.getElementById("sessionTool").value = "";
      document.getElementById("sessionCookies").value = "";
      showToast("✅ تم حفظ Session بتاع " + toolName, "ok");
      loadSessionsList();
      buildToolsGrid();
    });
  });
}

function deleteSession(toolName) {
  getSessions(sessions => {
    delete sessions[toolName];
    setSessions(sessions, () => {
      showToast("🗑️ تم حذف " + toolName, "info");
      loadSessionsList();
      buildToolsGrid();
    });
  });
}

function loadSessionsList() {
  getSessions(sessions => {
    const list = document.getElementById("sessionsList");
    const keys = Object.keys(sessions);
    if (keys.length === 0) {
      list.innerHTML = '<div class="empty-state">مفيش sessions محفوظة</div>';
      return;
    }
    list.innerHTML = keys.map(name => {
      const tool = TOOLS.find(t => t.name === name) || { icon: "🔧" };
      const sess = sessions[name];
      return `<div class="session-item">
        <span class="session-item-icon">${tool.icon}</span>
        <div class="session-item-info">
          <div class="session-item-name">${name}</div>
          <div class="session-item-date">${sess.cookies.length} cookies • ${sess.savedAt}</div>
        </div>
        <button class="icon-btn del" data-tool="${name}">✕</button>
      </div>`;
    }).join("");

    // bind delete buttons
    list.querySelectorAll(".icon-btn.del").forEach(btn => {
      btn.addEventListener("click", () => deleteSession(btn.dataset.tool));
    });
  });
}

// ========== EXTRA SUBDOMAINS PER TOOL ==========
const EXTRA_SUBDOMAINS = {
  "grammarly.com": ["app.grammarly.com", "coda.grammarly.com", "capi.grammarly.com"],
};
function getExtraSubdomains(rootDomain) {
  return EXTRA_SUBDOMAINS[rootDomain] || [];
}

// ========== AUTO CAPTURE ==========
function autoCaptureFromTab() {
  const statusEl = document.getElementById("captureStatus");
  statusEl.textContent = "جاري السحب...";
  statusEl.style.color = "#f0a500";

  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    if (!tabs || tabs.length === 0) {
      statusEl.textContent = "❌ مش قادر يوصل للتاب";
      statusEl.style.color = "#ef4444";
      return;
    }

    const tabUrl = tabs[0].url;
    const hostname = new URL(tabUrl).hostname;
    const parts = hostname.split(".");
    const rootDomain = parts.slice(-2).join(".");
    const detectedTool = TOOLS.find(t => hostname.includes(new URL(t.url).hostname.replace("app.", "")));

    // hostname الحالي + extra subdomains (Grammarly: app + coda + capi)
    const extraSubdomains = [hostname, ...getExtraSubdomains(rootDomain)];

    // { url } يمسك hostOnly cookies على الـ tab الحالي
    chrome.cookies.getAll({ url: tabUrl }, mainCookies => {
      const allCookies = mainCookies || [];

      const fetchExtra = (subs, done) => {
        if (subs.length === 0) { done(allCookies); return; }
        const [sub, ...rest] = subs;
        chrome.cookies.getAll({ url: "https://" + sub + "/" }, subCookies => {
          (subCookies || []).forEach(c => {
            if (!allCookies.some(x => x.name === c.name && x.domain === c.domain))
              allCookies.push(c);
          });
          fetchExtra(rest, done);
        });
      };

      fetchExtra(extraSubdomains, merged => {
        if (merged.length === 0) {
          statusEl.textContent = "❌ مش لاقي cookies — تأكد إنك logged in";
          statusEl.style.color = "#ef4444";
          return;
        }
        finalizeCookies(merged, rootDomain, detectedTool, statusEl);
      });
    });
  });
}

function finalizeCookies(cookies, hostname, detectedTool, statusEl) {
  const formatted = cookies.map(c => ({
    name: c.name, value: c.value, domain: c.domain,
    path: c.path || "/", secure: c.secure, httpOnly: c.httpOnly, hostOnly: c.hostOnly
  }));

  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    if (!tabs[0]) return;
    const tabId = tabs[0].id;

    // سحب localStorage
    chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        const d = {};
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          d[k] = localStorage.getItem(k);
        }
        return d;
      }
    }, lsResults => {
      const lsData = lsResults?.[0]?.result || {};

      // سحب IndexedDB بـ executeScript
      chrome.scripting.executeScript({
        target: { tabId },
        func: () => {
          return new Promise(resolve => {
            const req = indexedDB.open("firebaseLocalStorageDb");
            req.onerror = () => resolve([]);
            req.onsuccess = e => {
              try {
                const db = e.target.result;
                const tx = db.transaction("firebaseLocalStorage", "readonly");
                tx.objectStore("firebaseLocalStorage").getAll().onsuccess = e2 => {
                  resolve(e2.target.result || []);
                };
              } catch(err) { resolve([]); }
            };
          });
        }
      }, idbResults => {
        const idbData = idbResults?.[0]?.result || [];

        const sessionData = {
          cookies: formatted,
          localStorage: lsData,
          indexedDB: idbData,
          capturedAt: new Date().toISOString()
        };

        statusEl.textContent = "✅ " + formatted.length + " cookies + " + Object.keys(lsData).length + " LS + " + idbData.length + " IDB";
        statusEl.style.color = "#22c55e";
        if (detectedTool) document.getElementById("sessionTool").value = detectedTool.name;
        document.getElementById("sessionCookies").value = JSON.stringify(sessionData, null, 2);
        document.getElementById("btnCopySession").style.display = "block";
        showToast("✅ تم السحب الكامل — اضغط حفظ", "ok");
      });
    });
  });
}

// ========== PROXY ==========
function enableProxy() {
  const host = document.getElementById("proxyHost").value.trim();
  const port = document.getElementById("proxyPort").value.trim();
  const user = document.getElementById("proxyUser").value.trim();
  const pass = document.getElementById("proxyPass").value.trim();
  if (!host || !port) { showToast("أدخل Host و Port", "err"); return; }
  chrome.runtime.sendMessage({ type: "ENABLE_PROXY", host, port, username: user, password: pass }, () => {
    showToast("✅ تم تفعيل الـ Proxy", "ok");
    chrome.storage.local.set({ savedHost: host, savedPort: port });
    refreshStatus();
  });
}

function disableProxy() {
  chrome.runtime.sendMessage({ type: "DISABLE_PROXY" }, () => {
    showToast("🔴 تم إيقاف الـ Proxy", "err");
    refreshStatus();
  });
}

function loadSavedProxy() {
  chrome.storage.local.get(["savedHost", "savedPort"], d => {
    if (d.savedHost) document.getElementById("proxyHost").value = d.savedHost;
    if (d.savedPort) document.getElementById("proxyPort").value = d.savedPort;
  });
}

function refreshStatus() {
  chrome.runtime.sendMessage({ type: "GET_STATUS" }, res => {
    if (chrome.runtime.lastError || !res) return;
    document.getElementById("dot").className = "dot " + (res.proxyActive ? "on" : "off");
    document.getElementById("statusText").textContent = res.proxyActive ? "Proxy متصل" : "غير متصل";
  });
}

// ========== COPY TO CLIPBOARD ==========
function copySessionToClipboard() {
  const val = document.getElementById("sessionCookies").value.trim();
  if (!val) { showToast("مفيش بيانات للنسخ", "err"); return; }
  navigator.clipboard.writeText(val).then(() => {
    showToast("✅ تم النسخ — الصق في Admin → Servers", "ok");
  }).catch(() => {
    // fallback
    const el = document.getElementById("sessionCookies");
    el.select();
    document.execCommand("copy");
    showToast("✅ تم النسخ", "ok");
  });
}

// ========== TOAST ==========
function showToast(msg, type) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.className = "show " + (type || "ok");
  setTimeout(() => t.className = "", 2800);
}
