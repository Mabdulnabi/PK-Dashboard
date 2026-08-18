// Pro Keys Client Extension — Background Service Worker

const TOOL_DOMAINS = {
  'QuillBot':               'quillbot.com',
  'QuillBot Premium - Pro': 'quillbot.com',
  'QuillBot Premium':       'quillbot.com',
  'Grammarly':              'grammarly.com',
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

// Where to actually navigate after cookie injection (may differ from cookie domain)
const TOOL_URLS = {
  'Grammarly': 'https://app.grammarly.com/',
}

async function getState()       { return (await chrome.storage.local.get('pk_state')).pk_state || {} }
async function setState(update) {
  const cur = await getState()
  await chrome.storage.local.set({ pk_state: { ...cur, ...update } })
}

function getDomain(toolName) {
  return TOOL_DOMAINS[toolName] ||
    Object.entries(TOOL_DOMAINS).find(([k]) => (toolName||'').toLowerCase().includes(k.toLowerCase()))?.[1]
}

function prepareCookie(cookie, storeId) {
  const cleanDomain = (cookie.domain || '').replace(/^\./, '')
  const url = `https://${cleanDomain || 'localhost'}/`

  const now = Math.floor(Date.now() / 1000)
  const expiry = (cookie.expirationDate && cookie.expirationDate > now + 30)
    ? cookie.expirationDate
    : (now + 30 * 60)

  const newCookie = {
    url,
    name:           cookie.name  || '',
    value:          cookie.value || '',
    path:           cookie.path  || '/',
    secure:         cookie.secure  ? true : null,
    httpOnly:       cookie.httpOnly ? true : null,
    expirationDate: expiry,
    storeId:        storeId || null,
    domain:         cookie.hostOnly ? null : (cookie.domain || null),
  }

  let sameSite = cookie.sameSite
  if (!sameSite || sameSite === 'unspecified') sameSite = null
  newCookie.sameSite = sameSite || undefined
  if (newCookie.sameSite === 'no_restriction') newCookie.secure = true

  return Object.fromEntries(Object.entries(newCookie).filter(([, v]) => v != null && v !== undefined && v !== ''))
}

async function setCookies(cookies, storeId) {
  let ok = 0, fail = 0
  for (const cookie of cookies) {
    const params = prepareCookie(cookie, storeId)
    const result = await chrome.cookies.set(params).catch(() => null)
    if (result) {
      ok++
    } else {
      const fallback = { ...params }
      delete fallback.domain
      const r2 = await chrome.cookies.set(fallback).catch(() => null)
      if (r2) { ok++ }
      else { fail++; console.warn('SET FAIL:', cookie.name) }
    }
  }
  return { ok, fail }
}

// Wait for a specific tab to finish loading
function waitForTabLoad(tabId, timeout = 10000) {
  return new Promise(resolve => {
    const timer = setTimeout(resolve, timeout)
    function listener(id, info) {
      if (id === tabId && info.status === 'complete') {
        clearTimeout(timer)
        chrome.tabs.onUpdated.removeListener(listener)
        setTimeout(resolve, 400)
      }
    }
    chrome.tabs.onUpdated.addListener(listener)
  })
}

async function injectSession(toolName, sessionData, proxy) {
  const domain = getDomain(toolName)
  console.log('INJECT:', toolName, '→', domain, 'cookies:', sessionData?.cookies?.length)
  if (!domain) return { success: false, error: 'Unknown tool: ' + toolName }

  // 1. Setup proxy FIRST
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
    await new Promise(r => setTimeout(r, 600))
  }

  // 2. Only clear cookies we're about to replace — preserve device fingerprint cookies
  //    (clearing ALL cookies removes device IDs like CCDA/CDI which causes sites to ask for password)
  const parentDomain = domain.split('.').slice(-2).join('.')
  const SKIP_COOKIES = new Set(['cf_clearance', '__cf_bm', '__cflb', '__cf_mitigated', 'redirect_location', 'browser_info', 'funnelType'])
  const cookiesToInject = (sessionData.cookies || []).filter(c => !SKIP_COOKIES.has(c.name))
  const injectNames = new Set(cookiesToInject.map(c => c.name))
  const allOld = await chrome.cookies.getAll({ domain: parentDomain })
  const toRemove = allOld.filter(c => injectNames.has(c.name))
  console.log('CLEAR:', toRemove.length, 'auth cookies for', parentDomain, '(keeping', allOld.length - toRemove.length, 'device cookies)')
  await Promise.all(toRemove.map(c => {
    const p = { url: `https://${c.domain.replace(/^\./, '')}${c.path}`, name: c.name }
    if (c.storeId) p.storeId = c.storeId
    return chrome.cookies.remove(p).catch(() => null)
  }))

  // 3. Inject cookies NOW — before opening the tab
  //    Tab will open ALREADY authenticated, no redirect dance needed
  const stores = await chrome.cookies.getAllCookieStores()
  const storeId = stores[0]?.id
  const { ok, fail } = await setCookies(cookiesToInject, storeId)
  console.log(`SET: ${ok} ok, ${fail} failed out of ${(sessionData.cookies||[]).length}`)

  const saved = await chrome.cookies.getAll({ domain: parentDomain })
  console.log(`VERIFY: ${saved.length} cookies in store:`, saved.map(c => c.name + '@' + c.domain).join(', '))

  // Also check specific subdomains that might have host-only cookies
  const savedApp  = await chrome.cookies.getAll({ domain: 'app.'  + parentDomain }).catch(() => [])
  const savedCapi = await chrome.cookies.getAll({ domain: 'capi.' + parentDomain }).catch(() => [])
  const savedCoda = await chrome.cookies.getAll({ domain: 'coda.' + parentDomain }).catch(() => [])
  const allSaved  = [...new Map([...saved, ...savedApp, ...savedCapi, ...savedCoda].map(c => [c.name + '|' + c.domain, c])).values()]
  console.log(`VERIFY ALL subdomains: ${allSaved.length} total unique cookies`)

  // 4. Store localStorage/IDB for later injection via onUpdated
  const needsIdb = Array.isArray(sessionData.indexedDB) && sessionData.indexedDB.length > 0
  const needsLs  = sessionData.localStorage && Object.keys(sessionData.localStorage).length > 0
  if (needsIdb || needsLs) {
    await setState({ pending_inject: { toolName, sessionData } })
  }

  // 5. Open/reload the tool tab — it opens WITH cookies already in store
  const toolUrl = TOOL_URLS[toolName] || `https://${domain}/`
  const existingTabs = await chrome.tabs.query({ url: `https://*.${parentDomain}/*` })
  let toolTabId
  if (existingTabs.length > 0) {
    await chrome.tabs.update(existingTabs[0].id, { active: true, url: toolUrl })
    toolTabId = existingTabs[0].id
  } else {
    const tab = await chrome.tabs.create({ url: toolUrl })
    toolTabId = tab.id
  }

  // Track which tab is the active tool tab for instant disconnect on close/navigate
  await setState({ tool_tab_id: toolTabId })

  return { success: true }
}

async function disconnect(toolName) {
  const state = await getState()

  if (state.server_id && state.dashboard_url) {
    fetch(`${state.dashboard_url}/api/member/servers/session/disconnect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ server_id: state.server_id })
    }).catch(() => {})
  }

  const domain = getDomain(toolName)
  if (domain) {
    const parentDomain = domain.split('.').slice(-2).join('.')
    const cookies = await chrome.cookies.getAll({ domain: parentDomain })
    await Promise.all(cookies.map(c =>
      chrome.cookies.remove({ url: `https://${c.domain.replace(/^\./, '')}${c.path}`, name: c.name })
    ))
  }
  chrome.proxy.settings.clear({ scope: 'regular' })
  chrome.alarms.clear('heartbeat')
  await setState({ active_tool: null, session_data: null, session_id: null, server_id: null, pending_inject: null, tool_tab_id: null, session_dirty: false })
  chrome.action.setBadgeText({ text: '' })

  // Only push cookies back to server if they actually rotated during this session.
  // Pushing stale cookies on every disconnect would overwrite a freshly-captured admin session.
  if (state.session_dirty && state.server_id && state.dashboard_url && state.session_data?.cookies?.length) {
    fetch(`${state.dashboard_url}/api/member/servers/session/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        server_id:       state.server_id,
        updated_cookies: state.session_data.cookies,
      })
    }).catch(() => {})
  }

  // Notify the dashboard tab so it updates instantly without waiting for a poll
  if (state.dashboard_url) {
    const dashTabs = await chrome.tabs.query({ url: `${state.dashboard_url}/*` }).catch(() => [])
    for (const tab of dashTabs) {
      chrome.tabs.sendMessage(tab.id, { type: 'PK_AUTO_DISCONNECTED' }).catch(() => {})
    }
  }
}

// onUpdated: inject localStorage + IDB ONLY on the correct tool subdomain
chrome.tabs.onUpdated.addListener(async (tabId, info) => {
  if (info.status !== 'complete') return
  const state = await getState()
  if (!state.pending_inject) return

  const tab = await chrome.tabs.get(tabId).catch(() => null)
  if (!tab?.url) return

  const { toolName, sessionData } = state.pending_inject
  const domain = getDomain(toolName)
  if (!domain) return

  const parentDomain = domain.split('.').slice(-2).join('.')
  if (!tab.url.includes(parentDomain)) return

  // Determine the exact subdomain the tool lives on (e.g. app.grammarly.com)
  const toolUrl = TOOL_URLS[toolName] || `https://${domain}/`
  const toolHostname = new URL(toolUrl).hostname

  // If we're on the wrong subdomain (e.g. www.grammarly.com instead of app.grammarly.com),
  // navigate to the correct one WITHOUT clearing pending_inject.
  // The injection will fire properly on the next onUpdated for the right subdomain.
  if (!tab.url.includes(toolHostname)) {
    await chrome.tabs.update(tabId, { url: toolUrl }).catch(() => {})
    return
  }

  await setState({ pending_inject: null })

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

  const idbArray = Array.isArray(sessionData.indexedDB) ? sessionData.indexedDB : []
  if (idbArray.length > 0) {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: (items) => {
        return new Promise((resolve) => {
          const req = indexedDB.open('firebaseLocalStorageDb')
          req.onupgradeneeded = (e) => {
            const db = e.target.result
            if (!db.objectStoreNames.contains('firebaseLocalStorage'))
              db.createObjectStore('firebaseLocalStorage', { keyPath: 'fbase_key' })
          }
          req.onsuccess = (e) => {
            const db = e.target.result
            if (!db.objectStoreNames.contains('firebaseLocalStorage')) { resolve(false); return }
            const tx = db.transaction('firebaseLocalStorage', 'readwrite')
            const store = tx.objectStore('firebaseLocalStorage')
            items.forEach(item => { try { store.put(item) } catch {} })
            tx.oncomplete = () => resolve(true)
            tx.onerror   = () => resolve(false)
          }
          req.onerror = () => resolve(false)
        })
      },
      args: [idbArray]
    }).catch(e => console.warn('IDB inject failed:', e.message))
  }

  // After injecting LS/IDB on the correct subdomain, reload so the site
  // picks up the freshly-injected localStorage on its next boot.
  await new Promise(r => setTimeout(r, 200))
  await chrome.tabs.reload(tabId).catch(() => {})

  console.log('onUpdated: LS/IDB inject done for', toolName, '→ navigating to', toolUrl)
})

// Track rotating tokens (grauth, etc.) — update stored session_data when server rotates them
// Only mark session_dirty=true when a cookie actually changes value during an active session.
// disconnect() only pushes cookies back to server if session_dirty is set,
// preventing stale/invalid cookies from overwriting a freshly-captured admin session.
chrome.cookies.onChanged.addListener(async ({ cookie, removed }) => {
  if (removed) return
  const state = await getState()
  if (!state.session_data?.cookies || !state.active_tool) return

  const domain = getDomain(state.active_tool)
  if (!domain) return
  const parentDomain = domain.split('.').slice(-2).join('.')
  const cookieDomain = (cookie.domain || '').replace(/^\./, '')
  if (!cookieDomain.endsWith(parentDomain)) return

  const idx = state.session_data.cookies.findIndex(c => c.name === cookie.name && (c.domain || '').replace(/^\./, '') === cookieDomain)
  if (idx === -1) return

  const existing = state.session_data.cookies[idx]
  if (existing.value === cookie.value) return // no real change

  const updated = [...state.session_data.cookies]
  updated[idx] = { ...existing, value: cookie.value, expirationDate: cookie.expirationDate }
  await setState({ session_data: { ...state.session_data, cookies: updated }, session_dirty: true })
})

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== 'heartbeat') return
  const state = await getState()
  if (!state.server_id || !state.dashboard_url) { chrome.alarms.clear('heartbeat'); return }

  const res = await fetch(`${state.dashboard_url}/api/member/verify`, {
    credentials: 'include'
  }).then(r => r.json()).catch(() => ({ valid: false }))

  if (!res.valid) {
    await disconnect(state.active_tool)
    chrome.notifications.create({
      type: 'basic', iconUrl: 'icons/icon48.png',
      title: 'Pro Keys', message: 'انتهى اشتراكك. تم قطع الاتصال تلقائياً.'
    })
    return
  }

  fetch(`${state.dashboard_url}/api/member/servers/session/disconnect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ server_id: state.server_id, action: 'keepalive' })
  }).catch(() => {})

  const toolDomain = getDomain(state.active_tool)
  if (toolDomain) {
    const parentDomain = toolDomain.split('.').slice(-2).join('.')
    const allCookies = await chrome.cookies.getAll({ domain: parentDomain })
    const newExpiry  = Math.floor(Date.now() / 1000) + (30 * 60)
    const stores     = await chrome.cookies.getAllCookieStores()
    const storeId    = stores[0]?.id
    for (const cookie of allCookies) {
      await chrome.cookies.set({
        url:            `https://${cookie.domain.replace(/^\./, '')}${cookie.path}`,
        name:           cookie.name,
        value:          cookie.value,
        domain:         cookie.hostOnly ? undefined : cookie.domain,
        path:           cookie.path,
        secure:         cookie.secure,
        httpOnly:       cookie.httpOnly,
        sameSite:       cookie.sameSite || undefined,
        expirationDate: newExpiry,
        storeId,
      }).catch(() => {})
    }
  }
})

// Instant disconnect when user closes the tool tab
chrome.tabs.onRemoved.addListener(async (tabId) => {
  const state = await getState()
  if (!state.active_tool || state.tool_tab_id !== tabId) return
  console.log('Tool tab closed — disconnecting')
  await disconnect(state.active_tool)
})

// Instant disconnect when user navigates away from the tool domain
chrome.tabs.onUpdated.addListener(async (tabId, info) => {
  if (info.status !== 'complete') return
  const state = await getState()
  if (!state.active_tool || state.tool_tab_id !== tabId) return
  const domain = getDomain(state.active_tool)
  if (!domain) return
  const parentDomain = domain.split('.').slice(-2).join('.')
  const tab = await chrome.tabs.get(tabId).catch(() => null)
  if (!tab?.url) return
  // Only disconnect if navigated completely off the tool domain
  if (!tab.url.includes(parentDomain)) {
    console.log('Navigated away from tool domain — disconnecting')
    await disconnect(state.active_tool)
  }
})

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  ;(async () => {
    try {
      switch (msg.type) {
        case 'GET_STATE':
          sendResponse({ state: await getState() })
          break

        case 'PK_GET_PENDING_LS': {
          // Content script asks for localStorage to inject at document_start
          const state = await getState()
          const pi = state.pending_inject
          if (!pi) { sendResponse({ localStorage: null }); break }
          const ls = pi.sessionData?.localStorage || null
          const toolUrl = TOOL_URLS[pi.toolName] || `https://${getDomain(pi.toolName)}/`
          sendResponse({
            localStorage: ls && Object.keys(ls).length > 0 ? ls : null,
            toolHostname: new URL(toolUrl).hostname,
          })
          break
        }

        case 'INJECT_FROM_DASHBOARD': {
          const { toolName, sessionData, sessionId, serverId, proxy, dashboardUrl } = msg
          await setState({
            active_tool:   toolName,
            session_data:  sessionData,
            session_id:    sessionId,
            server_id:     serverId,
            dashboard_url: dashboardUrl,
          })
          sendResponse({ success: true })
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
