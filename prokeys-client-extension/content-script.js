// Pro Keys Client — Session Injector + Dashboard Detection

const isDashboard = window.location.hostname === 'localhost' || 
                    window.location.hostname.includes('vercel.app')

if (isDashboard) {
  // Inject flag directly — page can read it without waiting for messages
  window.__PK_EXT_READY__ = true

  // Send ready immediately
  window.postMessage({ type: 'PK_EXTENSION_READY', version: '1.1.0' }, '*')
  
  // Also send after DOM loaded (React might not be ready yet)
  if (document.readyState !== 'complete') {
    window.addEventListener('load', () => {
      window.postMessage({ type: 'PK_EXTENSION_READY', version: '1.1.0' }, '*')
    })
  }

  // Listen for requests
  window.addEventListener('message', (e) => {
    if (e.source !== window) return
    if (!e.data?.type?.startsWith('PK_')) return

    // Respond to ping — React uses this to detect extension
    if (e.data.type === 'PK_PING') {
      window.postMessage({ type: 'PK_EXTENSION_READY', version: '1.1.0' }, '*')
    }

    if (e.data.type === 'PK_GET_STATE') {
      chrome.runtime.sendMessage({ type: 'GET_STATE' }, res => {
        window.postMessage({ type: 'PK_STATE', state: res?.state || {} }, '*')
      })
    }

    if (e.data.type === 'PK_INJECT_REQUEST') {
      chrome.runtime.sendMessage({
        type: 'INJECT_FROM_DASHBOARD',
        toolName:    e.data.toolName,
        sessionData: e.data.sessionData,
        sessionId:   e.data.serverId,
        serverId:    e.data.serverId,
        proxy:       e.data.proxy || null,
        dashboardUrl: window.location.origin,
      }, res => {
        window.postMessage({ type: 'PK_INJECT_RESULT', success: res?.success, error: res?.error }, '*')
      })
    }

    if (e.data.type === 'PK_DISCONNECT_REQUEST') {
      chrome.runtime.sendMessage({ type: 'DISCONNECT' }, () => {
        window.postMessage({ type: 'PK_DISCONNECT_RESULT', success: true }, '*')
      })
    }
  })

  // Background sends this when tab is closed or navigated away — relay to React page
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'PK_AUTO_DISCONNECTED') {
      window.postMessage({ type: 'PK_DISCONNECT_RESULT', success: true }, '*')
    }
  })
}

// ── Tool pages injection ─────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'INJECT_STORAGE') {
    injectAll(msg.storage || {}, msg.idb || {}).then(() => sendResponse({ success: true }))
    return true
  }
  if (msg.type === 'CLEAR_SESSION') {
    clearAll().then(() => sendResponse({ success: true }))
    return true
  }
  if (msg.type === 'PING') {
    sendResponse({ pong: true, url: window.location.href })
  }
})

async function injectAll(storage, idb) {
  try {
    Object.entries(storage).forEach(([k, v]) => {
      localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v))
    })
  } catch(e) { console.warn('[ProKeys] localStorage inject failed:', e) }
  if (Object.keys(idb).length > 0) await injectIndexedDB(idb)
}

async function clearAll() {
  try { localStorage.clear() } catch(e) {}
}

async function injectIndexedDB(idbData) {
  for (const [dbName, stores] of Object.entries(idbData)) {
    await new Promise((resolve, reject) => {
      const req = indexedDB.open(dbName)
      req.onsuccess = (e) => {
        try {
          const db = e.target.result
          for (const [storeName, records] of Object.entries(stores)) {
            if (!db.objectStoreNames.contains(storeName)) continue
            const tx    = db.transaction(storeName, 'readwrite')
            const store = tx.objectStore(storeName)
            records.forEach(({key, value}) => { try { store.put(value, key) } catch{} })
            tx.oncomplete = resolve
            tx.onerror    = reject
          }
        } catch(err) { reject(err) }
      }
      req.onerror = reject
    }).catch(e => console.warn('[ProKeys] IDB inject error:', e))
  }
}
