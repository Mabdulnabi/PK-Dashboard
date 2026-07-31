// Pro Keys - Content Script v2

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {

  // ========== سحب localStorage ==========
  if (msg.type === "CAPTURE_LOCALSTORAGE") {
    try {
      const data = {};
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        data[k] = localStorage.getItem(k);
      }
      sendResponse({ success: true, data });
    } catch(e) { sendResponse({ success: false, error: e.message }); }
    return true;
  }

  // ========== سحب IndexedDB (Firebase) ==========
  if (msg.type === "CAPTURE_INDEXEDDB") {
    const req = indexedDB.open("firebaseLocalStorageDb");
    req.onsuccess = e => {
      try {
        const db = e.target.result;
        const tx = db.transaction("firebaseLocalStorage", "readonly");
        tx.objectStore("firebaseLocalStorage").getAll().onsuccess = e2 => {
          sendResponse({ success: true, data: e2.target.result });
        };
      } catch(err) { sendResponse({ success: false, error: err.message }); }
    };
    req.onerror = e => sendResponse({ success: false, error: "IndexedDB open failed" });
    return true;
  }

  // ========== حقن IndexedDB (Firebase) ==========
  if (msg.type === "INJECT_INDEXEDDB") {
    const req = indexedDB.open("firebaseLocalStorageDb");
    req.onsuccess = e => {
      try {
        const db = e.target.result;
        const tx = db.transaction("firebaseLocalStorage", "readwrite");
        const store = tx.objectStore("firebaseLocalStorage");
        // امسح القديم
        store.clear().onsuccess = () => {
          // حقن الجديد
          let done = 0;
          for (const item of msg.data) {
            store.put(item).onsuccess = () => {
              done++;
              if (done === msg.data.length) {
                sendResponse({ success: true });
              }
            };
          }
          if (msg.data.length === 0) sendResponse({ success: true });
        };
      } catch(err) { sendResponse({ success: false, error: err.message }); }
    };
    req.onerror = () => sendResponse({ success: false, error: "IndexedDB open failed" });
    return true;
  }

  // ========== حقن localStorage ==========
  if (msg.type === "INJECT_LOCALSTORAGE") {
    try {
      for (const [k, v] of Object.entries(msg.data)) {
        localStorage.setItem(k, v);
      }
      sendResponse({ success: true });
    } catch(e) { sendResponse({ success: false, error: e.message }); }
    return true;
  }

});
