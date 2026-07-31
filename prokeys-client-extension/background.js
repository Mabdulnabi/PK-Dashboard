// Pro Keys Client Extension — Background Service Worker

const TOOL_DOMAINS = {
  'QuillBot':               'quillbot.com',
  'QuillBot Premium - Pro': 'quillbot.com',
  'QuillBot Premium':       'quillbot.com',
  'Grammarly':              'app.grammarly.com',
  'Canva Pro':              'canva.com',
  'Canva':                  'canva.com',
  'Turnitin':               'turnitin.com',
  'Perplexity':             'perplexity.ai',
  'SciSpace':               'scispace.com',
  'Gamma Pro':              'gamma.app',
  'Semrush':                'semrush.com',
  'SEMrush':                'semrush.com',
  'Ahrefs':                 'ahrefs.com',
  'Envato':                 'eu.studio.envato.com',
}

// subdomains إضافية لكل أداة بيها cookies على hostnames منفصلة
const EXTRA_DOMAINS = {
  'app.grammarly.com': ['coda.grammarly.com', 'capi.grammarly.com'],
}
function getExtraDomains(domain) {
  return EXTRA_DOMAINS[domain] || []
}

async function getState()       { return (await chrome.storage.local.get('pk_state')).pk_state || {} }
async function setState(update) {
  const cur = await getState()
  await chrome.storage.local.set({ pk_state: { ...cur, ...update } })
}

async function injectSession(toolName, sessionData, proxy) {
  const domain = TOOL_DOMAINS[toolName] || 
    Object.entries(TOOL_DOMAINS).find(([k]) => toolName.toLowerCase().includes(k.toLowerCase()))?.[1]
  
  console.log('INJECT:', toolName, '→', domain, 'cookies:', sessionData?.cookies?.length)
  if (!domain) return { success: false, error: 'Unknown tool: ' + toolName }

  // 0. Setup proxy FIRST — before opening any tab or setting cookies
  if (proxy?.host) {
    await new Promise(resolve => chrome.proxy.settings.set({
      value: {
        mode: 'fixed_servers',
        rules: {
          singleProxy: { scheme: 'http', host: proxy.host, port: parseInt(proxy.port) },
          bypassList:  ['localhost', '127.0.0.1']
        }
      },
      scope: 'regular'
    }, resolve))
    // Wait for proxy to be active
    await new Promise(r => setTimeout(r, 600))
  }

  // 1. Clear old cookies — domain + parentDomain + extra subdomains (e.g. coda/capi for Grammarly)
  const parentDomain  = domain.split('.').slice(-2).join('.')
  const extraDomains  = getExtraDomains(domain)
  const clearUrls     = [
    `https://${domain}/`,
    `https://${parentDomain}/`,
    ...extraDomains.map(d => `https://${d}/`)
  ]
  const allOldCookies = (await Promise.all(clearUrls.map(u => chrome.cookies.getAll({ url: u })))).flat()
  const seen = new Set()
  await Promise.all(
    allOldCookies
      .filter(c => { const k = c.name + '|' + c.domain; if (seen.has(k)) return false; seen.add(k); return true })
      .map(c => chrome.cookies.remove({ url: `https://${c.domain.replace(/^\./, '')}${c.path}`, name: c.name }))
  )

  // 2. Set new cookies
  if (sessionData.cookies?.length > 0) {
    for (const cookie of sessionData.cookies) {
      const cleanDomain = (cookie.domain || domain).replace(/^\./, '')
      const cookieUrl   = `https://${cleanDomain}`

      // Build cookie params — hostOnly cookies must NOT have domain field
      const cookieParams = {
        url:      cookieUrl,
        name:     cookie.name,
        value:    cookie.value,
        path:     cookie.path || '/',
        secure:   cookie.secure ?? true,
        httpOnly: cookie.httpOnly ?? false,
        sameSite: 'no_restriction',
      }

      // Only add domain for non-hostOnly cookies
      if (!cookie.hostOnly && cookie.domain) {
        cookieParams.domain = cookie.domain
      }

      // Short expiry — 30 minutes (heartbeat will renew every 2 min)
      cookieParams.expirationDate = Math.floor(Date.now() / 1000) + (30 * 60)

      await chrome.cookies.set(cookieParams)
        .catch(e => console.warn('Cookie set failed:', cookie.name, e.message))
    }
  }

  // 3. Find or open tool tab — inject everything BEFORE opening
  // Store pending inject for onUpdated handler
  await setState({ pending_inject: { toolName, sessionData } })

  const tabs = await chrome.tabs.query({ url: `https://*.${domain}/*` })
  if (tabs.length > 0) {
    await chrome.tabs.update(tabs[0].id, { active: true })
    await chrome.tabs.reload(tabs[0].id, { bypassCache: true })
  } else {
    await chrome.tabs.create({ url: `https://${domain}` })
  }

  return { success: true }
}

async function disconnect(toolName) {
  const state = await getState()

  // Expire session in DB
  if (state.server_id && state.dashboard_url) {
    fetch(`${state.dashboard_url}/api/member/servers/session/disconnect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ server_id: state.server_id })
    }).catch(() => {})
  }

  const domain = TOOL_DOMAINS[toolName] ||
    Object.entries(TOOL_DOMAINS).find(([k]) => (toolName||'').toLowerCase().includes(k.toLowerCase()))?.[1]
  if (domain) {
    const cookies = await chrome.cookies.getAll({ domain })
    await Promise.all(cookies.map(c =>
      chrome.cookies.remove({ url: `https://${c.domain.replace(/^\./, '')}${c.path}`, name: c.name })
    ))
  }
  chrome.proxy.settings.clear({ scope: 'regular' })
  chrome.alarms.clear('heartbeat')
  await setState({ active_tool: null, session_data: null, session_id: null, server_id: null })
  chrome.action.setBadgeText({ text: '' })
}

chrome.tabs.onUpdated.addListener(async (tabId, info) => {
  if (info.status !== 'complete') return
  const state = await getState()
  if (!state.pending_inject) return
  // Check if this tab is the tool tab
  const tab = await chrome.tabs.get(tabId).catch(() => null)
  if (!tab) return
  const { toolName, sessionData } = state.pending_inject
  const domain = TOOL_DOMAINS[toolName] ||
    Object.entries(TOOL_DOMAINS).find(([k]) => (toolName||'').toLowerCase().includes(k.toLowerCase()))?.[1]
  if (!domain || !tab.url?.includes(domain)) return
  {
    

    // Inject localStorage via executeScript
    if (sessionData.localStorage && Object.keys(sessionData.localStorage).length > 0) {
      await chrome.scripting.executeScript({
        target: { tabId },
        func: (lsData) => {
          Object.entries(lsData).forEach(([k, v]) => {
            try { localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v)) } catch {}
          })
        },
        args: [sessionData.localStorage]
      }).catch(e => console.warn('LS inject failed:', e.message))
    }

    // Inject Firebase IndexedDB via executeScript
    const idbArray = Array.isArray(sessionData.indexedDB) ? sessionData.indexedDB : []
    if (idbArray.length > 0) {
      await chrome.scripting.executeScript({
        target: { tabId },
        func: (items) => {
          return new Promise((resolve) => {
            const req = indexedDB.open('firebaseLocalStorageDb')
            req.onupgradeneeded = (e) => {
              const db = e.target.result
              if (!db.objectStoreNames.contains('firebaseLocalStorage')) {
                db.createObjectStore('firebaseLocalStorage', { keyPath: 'fbase_key' })
              }
            }
            req.onsuccess = (e) => {
              const db = e.target.result
              if (!db.objectStoreNames.contains('firebaseLocalStorage')) { resolve(false); return }
              const tx = db.transaction('firebaseLocalStorage', 'readwrite')
              const store = tx.objectStore('firebaseLocalStorage')
              items.forEach(item => { try { store.put(item) } catch {} })
              tx.oncomplete = () => resolve(true)
              tx.onerror = () => resolve(false)
            }
            req.onerror = () => resolve(false)
          })
        },
        args: [idbArray]
      }).catch(e => console.warn('IDB inject failed:', e.message))
    }

    await setState({ pending_inject: null })

    // Instead of reload, trigger Firebase to re-read auth from IDB
    await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        // Dispatch storage event to trigger Firebase re-auth
        window.dispatchEvent(new Event('storage'))
        // Also try to reload Firebase auth
        setTimeout(() => {
          try {
            // Force page to re-check auth without full reload
            window.location.href = window.location.href
          } catch {}
        }, 500)
      }
    }).catch(() => {
      chrome.tabs.reload(tabId, { bypassCache: true })
    })
  }
})

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== 'heartbeat') return
  const state = await getState()
  if (!state.server_id || !state.dashboard_url) { chrome.alarms.clear('heartbeat'); return }

  // Check if subscription still valid
  const res = await fetch(`${state.dashboard_url}/api/member/verify`, {
    credentials: 'include'
  }).then(r => r.json()).catch(() => ({ valid: false }))

  if (!res.valid) {
    // Subscription expired or session invalid — disconnect and clear cookies
    await disconnect(state.active_tool)
    chrome.notifications.create({
      type: 'basic', iconUrl: 'icons/icon48.png',
      title: 'Pro Keys', message: 'انتهى اشتراكك. تم قطع الاتصال تلقائياً.'
    })
    return
  }

  // Renew session expiry (keepalive)
  fetch(`${state.dashboard_url}/api/member/servers/session/disconnect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ server_id: state.server_id, action: 'keepalive' })
  }).catch(() => {})

  // Renew cookie expiry — extend by 30 more minutes (including extra subdomains)
  const toolDomain = TOOL_DOMAINS[state.active_tool] ||
    Object.entries(TOOL_DOMAINS).find(([k]) => (state.active_tool||'').toLowerCase().includes(k.toLowerCase()))?.[1]
  if (toolDomain) {
    const renewUrls = [
      `https://${toolDomain}/`,
      ...getExtraDomains(toolDomain).map(d => `https://${d}/`)
    ]
    const allCookies = (await Promise.all(renewUrls.map(u => chrome.cookies.getAll({ url: u })))).flat()
    const newExpiry  = Math.floor(Date.now() / 1000) + (30 * 60)
    for (const cookie of allCookies) {
      await chrome.cookies.set({
        url:            `https://${cookie.domain.replace(/^\./, '')}`,
        name:           cookie.name,
        value:          cookie.value,
        domain:         cookie.hostOnly ? undefined : cookie.domain,
        path:           cookie.path,
        secure:         cookie.secure,
        httpOnly:       cookie.httpOnly,
        sameSite:       'no_restriction',
        expirationDate: newExpiry,
      }).catch(() => {})
    }
  }
})

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  ;(async () => {
    try {
      switch (msg.type) {
        case 'GET_STATE':
          sendResponse({ state: await getState() })
          break

        case 'INJECT_FROM_DASHBOARD': {
          const { toolName, sessionData, sessionId, serverId, proxy, dashboardUrl } = msg
          await setState({
            active_tool:   toolName,
            session_data:  sessionData,
            session_id:    sessionId,
            server_id:     serverId,
            dashboard_url: dashboardUrl,
          })
          // Send response immediately to avoid channel timeout
          sendResponse({ success: true })
          // Inject in background
          injectSession(toolName, sessionData, proxy).then(result => {
            if (result.success) {
              chrome.alarms.create('heartbeat', { periodInMinutes: 2 })
              chrome.action.setBadgeText({ text: 'ON' })
              chrome.action.setBadgeBackgroundColor({ color: '#10B981' })
            }
          })
          break
        }

        case 'REINJECT': {
          const state = await getState()
          if (!state.session_data || !state.active_tool) {
            sendResponse({ success: false, error: 'No active session' }); break
          }
          const result = await injectSession(state.active_tool, state.session_data, null)
          sendResponse(result)
          break
        }

        case 'DISCONNECT': {
          const state = await getState()
          await disconnect(state.active_tool)
          sendResponse({ success: true })
          break
        }
      }
    } catch(e) {
      sendResponse({ error: e.message })
    }
  })()
  return true
})
