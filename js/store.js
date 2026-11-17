// Data layer. Every piece of data is a "record": {collection, id, date, ...fields}.
// Cloud mode  -> one Supabase table called "records" (behind your login).
// Device mode -> this browser's storage, plus data/sync.json if the sync script wrote one.
const Store = (() => {
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem("hh_cfg") || "{}"); } catch (e) {}
  const cfg = Object.assign({}, window.HH_CONFIG || {});
  if (!cfg.supabaseUrl && saved.supabaseUrl) Object.assign(cfg, saved);
  const cloud = !!(cfg.supabaseUrl && cfg.supabaseKey);
  const LS_KEY = "hh_records";
  let sb = null;
  let cache = {}; // collection -> {id: row}

  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  function loadScript(src) {
    return new Promise((res, rej) => {
      const s = document.createElement("script");
      s.src = src; s.onload = res; s.onerror = () => rej(new Error("Could not load " + src));
      document.head.appendChild(s);
    });
  }

  async function init() {
    if (!cloud) return { cloud: false, signedIn: true };
    await loadScript("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js");
    sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey);
    const { data } = await sb.auth.getSession();
    return { cloud: true, signedIn: !!data.session };
  }

  async function signIn(email, password) {
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }
  async function signOut() { if (sb) await sb.auth.signOut(); }

  function setRow(c, row) { (cache[c] = cache[c] || {})[row.id] = row; }

  function saveLocal() {
    try { localStorage.setItem(LS_KEY, JSON.stringify(cache)); }
    catch (e) { console.error("Could not save to browser storage", e); }
  }

  async function load() {
    cache = {};
    if (cloud) {
      const page = 1000;
      for (let from = 0; ; from += page) {
        const { data, error } = await sb.from("records")
          .select("collection,id,date,data")
          .order("collection").order("id")
          .range(from, from + page - 1);
        if (error) throw error;
        data.forEach(r => setRow(r.collection, Object.assign({}, r.data, { id: r.id, date: r.date })));
        if (data.length < page) break;
      }
    } else {
      try { cache = JSON.parse(localStorage.getItem(LS_KEY) || "{}"); } catch (e) { cache = {}; }
      // Overlay Garmin/Hevy data written by `sync.py --local`, if present.
      try {
        const r = await fetch("data/sync.json", { cache: "no-store" });
        if (r.ok) {
          const j = await r.json();
          Object.keys(j).forEach(c => j[c].forEach(row => setRow(c, row)));
        }
      } catch (e) { /* no local sync file - fine */ }
    }
  }

  const all = c => Object.values(cache[c] || {}).sort((a, b) => (a.date || "") < (b.date || "") ? -1 : (a.date || "") > (b.date || "") ? 1 : 0);
  const get = (c, id) => (cache[c] || {})[id] || null;
  const on = (c, date) => all(c).filter(r => r.date === date);

  async function putMany(c, rows) {
    rows.forEach(r => { if (!r.id) r.id = uid(); setRow(c, r); });
    if (!cloud) return saveLocal();
    const payload = rows.map(r => {
      const data = Object.assign({}, r); delete data.id; delete data.date;
      return { collection: c, id: String(r.id), date: r.date || null, data, updated_at: new Date().toISOString() };
    });
    for (let i = 0; i < payload.length; i += 500) {
      const { error } = await sb.from("records").upsert(payload.slice(i, i + 500));
      if (error) throw error;
    }
  }
  const put = (c, row) => putMany(c, [row]).then(() => row);

  async function remove(c, id) {
    if (cache[c]) delete cache[c][id];
    if (!cloud) return saveLocal();
    const { error } = await sb.from("records").delete().eq("collection", c).eq("id", String(id));
    if (error) throw error;
  }

  async function removeWhere(pred) {
    const doomed = [];
    Object.keys(cache).forEach(c => Object.values(cache[c]).forEach(r => { if (pred(r, c)) doomed.push([c, r.id]); }));
    for (const [c, id] of doomed) delete cache[c][id];
    if (!cloud) return saveLocal();
    const byColl = {};
    doomed.forEach(([c, id]) => (byColl[c] = byColl[c] || []).push(String(id)));
    for (const c of Object.keys(byColl)) {
      for (let i = 0; i < byColl[c].length; i += 200) {
        const { error } = await sb.from("records").delete().eq("collection", c).in("id", byColl[c].slice(i, i + 200));
        if (error) throw error;
      }
    }
  }

  const exportAll = () => JSON.parse(JSON.stringify(cache));

  // One-time move: copy what this device holds (browser storage + data/sync.json) into the cloud database.
  const hasDeviceData = () => { try { return Object.keys(JSON.parse(localStorage.getItem(LS_KEY) || "{}")).length > 0; } catch (e) { return false; } };
  async function importDevice() {
    if (!cloud) throw new Error("Cloud is not set up yet");
    const colls = {};
    const add = (c, rows) => { colls[c] = colls[c] || {}; rows.forEach(r => { if (r && r.id != null && !r.demo) colls[c][r.id] = r; }); };
    try { const j = await (await fetch("data/sync.json", { cache: "no-store" })).json(); Object.keys(j).forEach(c => add(c, j[c])); } catch (e) { /* no local sync file */ }
    let local = {}; try { local = JSON.parse(localStorage.getItem(LS_KEY) || "{}"); } catch (e) {}
    Object.keys(local).forEach(c => add(c, Object.values(local[c])));
    let n = 0;
    for (const c of Object.keys(colls)) { const rows = Object.values(colls[c]); if (rows.length) { await putMany(c, rows); n += rows.length; } }
    return n;
  }

  return { init, load, signIn, signOut, all, get, on, put, putMany, remove, removeWhere, exportAll, importDevice, hasDeviceData, uid, isCloud: cloud };
})();
