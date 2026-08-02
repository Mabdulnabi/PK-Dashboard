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

  // 2. Clear ALL old cookies
  const parentDomain = domain.split('.').slice(-2).join('.')
  const allOld = await chrome.cookies.getAll({ domain: parentDomain })
  console.log('CLEAR:', allOld.length, 'cookies for', parentDomain)
  await Promise.all(allOld.map(c => {
    const p = { url: `https://${c.domain.replace(/^\./, '')}${c.path}`, name: c.name }
    if (c.storeId) p.storeId = c.storeId
    return chrome.cookies.remove(p).catch(() => null)
  }))
  console.log('CLEAR: done')

  // 3. Inject cookies NOW — before opening the tab
  //    Tab will open ALREADY authenticated, no redirect dance needed
  const stores = await chrome.cookies.getAllCookieStores()
  const storeId = stores[0]?.id
  // Skip Cloudflare cookies — they are IP-bound and break sessions on other devices
  const SKIP_COOKIES = new Set(['cf_clearance', '__cf_bm', '__cflb', '__cf_mitigated'])
  const cookiesToInject = (sessionData.cookies || []).filter(c => !SKIP_COOKIES.has(c.name))
  const { ok, fail } = await setCookies(cookiesToInject, storeId)
  console.log(`SET: ${ok} ok, ${fail} failed out of ${(sessionData.cookies||[]).length}`)

  const saved = await chrome.cookies.getAll({ domain: parentDomain })
  console.log(`VERIFY: ${saved.length} cookies in store`)

  // 4. Store localStorage/IDB for later injection via onUpdated
  const needsIdb = Array.isArray(sessionData.indexedDB) && sessionData.indexedDB.length > 0
  const needsLs  = sessionData.localStorage && Object.keys(sessionData.localStorage).length > 0
  if (needsIdb || needsLs) {
    await setState({ pending_inject: { toolName, sessionData } })
  }

  // 5. Open/reload the tool tab — it opens WITH cookies already in store
  const toolUrl = TOOL_URLS[toolName] || `https://${domain}/`
  const existingTabs = await chrome.tabs.query({ url: `https://*.${parentDomain}/*` })
  if (existingTabs.length > 0) {
    await chrome.tabs.update(existingTabs[0].id, { active: true, url: toolUrl })
  } else {
    await chrome.tabs.create({ url: toolUrl })
  }

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
  await setState({ active_tool: null, session_data: null, session_id: null, server_id: null, pending_inject: null })
  chrome.action.setBadgeText({ text: '' })
}

// onUpdated only handles localStorage + IDB injection (cookies already set before tab opened)
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

    await chrome.scripting.executeScript({
      target: { tabId },
      func: () => { setTimeout(() => location.reload(), 300) }
    }).catch(() => {})
  }

  console.log('onUpdated: LS/IDB inject done for', toolName)
})

// Track rotating tokens (grauth, etc.) — update stored session_data when server rotates them
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

  const updated = [...state.session_data.cookies]
  updated[idx] = { ...updated[idx], value: cookie.value, expirationDate: cookie.expirationDate }
  await setState({ session_data: { ...state.session_data, cookies: updated } })
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
