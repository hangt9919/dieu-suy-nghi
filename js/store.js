"use strict";
// Lưu trên máy (IndexedDB): bài đang làm dở + danh sách đã làm. Lỗi lưu trữ không được làm hỏng app.
window.DB = (() => {
  let dbp = null;
  function open() {
    if (dbp) return dbp;
    dbp = new Promise((res, rej) => {
      if (!window.indexedDB) return rej(new Error("no idb"));
      const r = indexedDB.open("dieu-suy-nghi", 1);
      r.onupgradeneeded = () => { const d = r.result; d.createObjectStore("kv"); d.createObjectStore("hist", { keyPath: "id" }); };
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    });
    return dbp;
  }
  async function tx(store, mode, fn) {
    try {
      const d = await open();
      return await new Promise((res, rej) => { const t = d.transaction(store, mode), s = t.objectStore(store); const q = fn(s); t.oncomplete = () => res(q && q.result); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error); });
    } catch (e) { console.warn("DB", e); return undefined; }
  }
  return {
    get: k => tx("kv", "readonly", s => s.get(k)),
    set: (k, v) => tx("kv", "readwrite", s => s.put(v, k)),
    del: k => tx("kv", "readwrite", s => s.delete(k)),
    addHist: item => tx("hist", "readwrite", s => s.put(item)),
    delHist: id => tx("hist", "readwrite", s => s.delete(id)),
    listHist: async () => ((await tx("hist", "readonly", s => s.getAll())) || []).sort((a, b) => b.id - a.id),
  };
})();
