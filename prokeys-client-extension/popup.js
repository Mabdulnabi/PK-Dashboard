chrome.runtime.sendMessage({ type: 'GET_STATE' }, res => {
  const state = res?.state || {}
  const dot  = document.getElementById('dot')
  const text = document.getElementById('statusText')
  if (state.active_tool) {
    dot.className  = 'dot on'
    text.textContent = '● ' + state.active_tool + ' — متصل'
    text.style.color = '#10b981'
  } else {
    dot.className  = 'dot'
    text.textContent = 'غير متصل'
    text.style.color = '#6b7280'
  }
})
