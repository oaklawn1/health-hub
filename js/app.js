// User interface: five tabs (Today, Food, Training, Body, Insights) + Settings.
const S = { tab: "today", date: U.today(), bodyTab: "weight", trRange: 7, range: 30, cloud: false, signedIn: true };
const $ = s => document.querySelector(s);
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const cssv = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const MEALS = ["Breakfast", "Lunch", "Snacks", "Dinner"];
const MEASURES = [["waist", "Waist"], ["chest", "Chest"], ["shoulders", "Shoulders"], ["biceps", "Biceps"], ["forearm", "Forearm"], ["hips", "Hips"], ["thigh", "Thigh"], ["calf", "Calf"]];
const MEDICAL = { "HbA1c": "%", "Fasting blood sugar": "mg/dL", "Post-meal blood sugar": "mg/dL", "Blood pressure": "mmHg", "Total cholesterol": "mg/dL", "LDL cholesterol": "mg/dL", "HDL cholesterol": "mg/dL", "Triglycerides": "mg/dL", "Vitamin D": "ng/mL", "Vitamin B12": "pg/mL", "Haemoglobin": "g/dL", "TSH": "mIU/L", "Uric acid": "mg/dL", "Creatinine": "mg/dL", "Injury": "", "Other note": "" };

let charts = [];
function toast(msg) { const t = $("#toast"); t.textContent = msg; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => t.hidden = true, 2600); }
async function safe(fn) { try { await fn(); } catch (e) { console.error(e); toast(e.message || "Something went wrong"); } }

function mkChart(id, type, labels, datasets, o) {
  const el = document.getElementById(id); if (!el || !window.Chart) return;
  o = o || {};
  const muted = cssv("--muted"), line = cssv("--line");
  datasets.forEach(d => { if ((d.type || type) === "line") Object.assign(d, { spanGaps: true, tension: 0.3, borderWidth: 2, pointRadius: labels.length > 31 ? 0 : 2, pointHoverRadius: 4 }, d); else Object.assign(d, { borderRadius: 4, maxBarThickness: 26 }, d); });
  charts.push(new Chart(el, {
    type, data: { labels, datasets },
    options: {
      responsive: true, maintainAspectRatio: false, animation: false, interaction: { mode: "index", intersect: false },
      plugins: { legend: { display: datasets.length > 1, labels: { color: muted, boxWidth: 10, boxHeight: 10, font: { size: 11 } } } },
      scales: {
        x: { ticks: { color: muted, font: { size: 10 }, maxRotation: 0, autoSkipPadding: 14 }, grid: { display: false } },
        y: { ticks: { color: muted, font: { size: 10 }, maxTicksLimit: 6 }, grid: { color: line }, beginAtZero: !!o.zero, suggestedMin: o.min, suggestedMax: o.max },
      },
    },
  }));
}
const lineDs = (label, data, color) => ({ label, data, borderColor: cssv(color), backgroundColor: cssv(color) });

// ---------- shared pieces ----------
function dateBar() {
  const t = U.today(), lbl = S.date === t ? "Today" : S.date === U.addDays(t, -1) ? "Yesterday" : U.nice(S.date);
  return `<div class="datebar"><button data-act="day" data-n="-1" aria-label="Previous day">‹</button>
    <div class="lbl">${lbl}<input type="date" id="pick-date" value="${S.date}" max="${t}" aria-label="Pick a date"></div>
    <button data-act="day" data-n="1" aria-label="Next day" ${S.date >= t ? "disabled" : ""}>›</button></div>`;
}
const insHtml = i => `<div class="ins ${i.level}"><i></i><div><span class="tag">${esc(i.area)}</span><h3>${esc(i.title)}</h3>${i.text ? `<p>${esc(i.text)}</p>` : ""}</div></div>`;
const seg = (act, opts, cur) => `<div class="seg">${opts.map(([v, l]) => `<button data-act="${act}" data-v="${v}" class="${String(v) === String(cur) ? "on" : ""}">${l}</button>`).join("")}</div>`;
const hasAny = () => ["garmin_daily", "food", "weight", "hevy_workout"].some(c => Store.all(c).length);

function balanceCard(date) {
  const i = D.intake(date), b = D.burn(date), p = D.profile(), isToday = date === U.today();
  if (!b && !i) return `<div class="card hero"><h2>Calorie balance</h2><p class="muted">No data yet for this day. Log food in the Food tab, and connect Garmin (or fill in your profile in Settings) to see calories burned.</p></div>`;
  const eaten = i ? i.kcal : 0, burned = b ? b.kcal : null;
  let head = `<div class="big">${U.r(eaten)}<small>kcal eaten</small></div>`, note = "";
  if (burned != null) {
    const bal = eaten - burned, target = +p.balance_target || 0;
    const ok = p.goal === "gain" ? bal >= target - 150 : p.goal === "maintain" ? Math.abs(bal) <= 250 : bal <= target + 150;
    const cls = !i ? "" : ok ? "good-t" : "warn-t";
    head = `<div class="big ${cls}">${bal > 0 ? "+" : "−"}${U.r(Math.abs(bal))}<small>kcal ${bal > 0 ? "surplus" : "deficit"}</small></div>`;
    note = !i ? "No food logged yet - this is just what you have burned." :
      isToday ? "Running total - calories burned keeps rising until midnight." :
        `Your target is ${target > 0 ? "+" : target < 0 ? "−" : ""}${Math.abs(target)} kcal/day (${p.goal === "lose" ? "fat loss" : p.goal === "gain" ? "muscle gain" : "maintenance"}).`;
    if (b.est) note += " Burn is an estimate from your profile (no Garmin data for this day).";
  } else note = "Connect Garmin, or add weight, height and age in Settings, to see calories burned.";
  const pt = D.proteinTarget();
  const macro = (k, lbl, tgt, limit) => { const v = i ? i[k] : 0, over = limit && v > tgt; return `<div><span>${lbl}</span><b class="${over ? "warn-t" : ""}">${U.r(v)}${tgt ? `<small class="muted" style="font-weight:500;font-size:11px">/${tgt}</small>` : `<small class="muted" style="font-weight:500;font-size:12px"> g</small>`}</b>${tgt ? `<div class="bar ${over ? "over" : ""}"><i style="width:${Math.min(100, v / tgt * 100)}%"></i></div>` : ""}</div>`; };
  return `<div class="card hero"><h2>Calorie balance ${b && !b.est && isToday ? "<small>so far today</small>" : ""}</h2>${head}
    <div class="eq"><div><b>${U.r(eaten)}</b><span>eaten</span></div><i>−</i><div><b>${burned != null ? U.r(burned) : "–"}</b><span>burned${b && U.num(b.active) ? ` (${U.r(b.active)} active)` : ""}</span></div></div>
    <p class="muted small" style="margin-top:10px">${note}</p>
    <div class="macros" title="grams eaten / goal (sugar: limit)">${macro("protein", "Protein", pt)}${macro("carbs", "Carbs")}${macro("fat", "Fat")}${macro("fiber", "Fibre", 28)}${macro("sugar", "Sugar", D.sugarLimit(), true)}</div>
    ${pt ? "" : `<p class="muted small" style="margin-top:8px">Protein goal: log your weight, or set a fixed goal in Settings.</p>`}</div>`;
}

function tilesHtml(date) {
  const g = D.garmin(date);
  if (!g) return `<div class="card"><h2>Garmin</h2><p class="muted">No Garmin data for this day${Store.all("garmin_daily").length ? "" : " yet. Open Settings (top right) to see how to connect your Garmin account"}.</p></div>`;
  const goal = D.stepGoal(date), tile = (k, v, unit, s, pct) => `<div class="tile"><div class="k">${k}</div><div class="v">${v}${unit ? ` <small>${unit}</small>` : ""}</div><div class="s">${s || "&nbsp;"}</div>${pct != null ? `<div class="bar"><i style="width:${Math.max(0, Math.min(100, pct))}%"></i></div>` : ""}</div>`;
  const stress = v => !U.num(v) ? "" : v <= 25 ? "Resting" : v <= 50 ? "Low" : v <= 75 ? "Medium" : "High";
  const ready = v => !U.num(v) ? "" : v >= 75 ? "High - go hard" : v >= 50 ? "Moderate" : v >= 25 ? "Low - go easy" : "Poor - rest";
  const title = s => s ? String(s).toLowerCase().replace(/_/g, " ").replace(/^\w/, c => c.toUpperCase()) : "";
  return `<div class="tiles">
    ${tile("Steps", U.r(g.steps), "", `Goal ${U.r(goal)}${U.num(g.distance_m) ? " · " + U.r(g.distance_m / 1000, 1) + " km" : ""}`, U.num(g.steps) ? g.steps / goal * 100 : 0)}
    ${tile("Body Battery", U.r(g.body_battery_high), "peak", `Lowest ${U.r(g.body_battery_low)}`, g.body_battery_high)}
    ${tile("Sleep", U.hm(g.sleep_seconds), "", U.num(g.sleep_score) ? `Score ${g.sleep_score}${U.num(g.deep_seconds) ? " · deep " + U.hm(g.deep_seconds) : ""}` : "", U.num(g.sleep_seconds) ? g.sleep_seconds / 28800 * 100 : 0)}
    ${tile("HRV (overnight)", U.r(g.hrv), "ms", [title(g.hrv_status), U.num(g.hrv_weekly) ? "7-day " + g.hrv_weekly : ""].filter(Boolean).join(" · "))}
    ${tile("Resting heart rate", U.r(g.resting_hr), "bpm", U.num(g.max_hr) ? `Day range ${U.r(g.min_hr)}–${U.r(g.max_hr)}` : "")}
    ${tile("Stress", U.r(g.stress_avg), "avg", stress(g.stress_avg), g.stress_avg)}
    ${tile("Training readiness", U.r(g.training_readiness), "", ready(g.training_readiness), g.training_readiness)}
    ${tile("Training status", `<span style="font-size:19px">${esc(title(g.training_status) || "–")}</span>`, "", U.num(g.vo2max) ? "VO₂ max " + U.r(g.vo2max) : "")}
  </div>`;
}

// This week (last 7 complete days) vs the 7 days before. better: +1 if higher is better, -1 if lower is better, 0 neutral.
function weekCard() {
  const end = U.addDays(U.today(), -1), a = D.week(end), b = D.week(U.addDays(end, -7));
  const rows = [
    ["Calories eaten / day", "eaten", v => U.r(v), 0], ["Calories burned / day", "burned", v => U.r(v), 0],
    ["Balance / day", "balance", v => (v > 0 ? "+" : "") + U.r(v), D.profile().goal === "gain" ? 1 : -1], ["Protein / day", "protein", v => U.r(v) + " g", 1],
    ["Steps / day", "steps", v => U.r(v), 1], ["Sleep", "sleep", U.hm, 1], ["HRV", "hrv", v => U.r(v) + " ms", 1], ["Resting HR", "rhr", v => U.r(v), -1],
    ["Body Battery peak", "bb", v => U.r(v), 1], ["Stress", "stress", v => U.r(v), -1], ["Strength sessions", "sessions", v => U.r(v), 1],
    ["Working sets", "sets", v => U.r(v), 1], ["Days with alcohol", "drinks", v => U.r(v), -1],
  ].filter(([, k]) => U.num(a[k]) || U.num(b[k]));
  const cell = (r) => {
    const [label, k, f, better] = r, x = a[k], y = b[k];
    let arrow = "";
    if (U.num(x) && U.num(y) && x !== y) {
      const good = better === 0 ? null : (x > y) === (better > 0);
      arrow = `<span class="${good == null ? "muted" : good ? "good-t" : "warn-t"}">${x > y ? "▲" : "▼"}</span>`;
    }
    return `<tr><td>${label}</td><td>${U.num(x) ? f(x) : "–"} ${arrow}</td><td class="muted">${U.num(y) ? f(y) : "–"}</td></tr>`;
  };
  return `<div class="card"><h2>This week vs last week <small>food logged ${a.logged}/7 · ${b.logged}/7 days</small></h2>
    <table class="wk-table"><thead><tr><th></th><th>Last 7 days</th><th>7 days before</th></tr></thead><tbody>${rows.map(cell).join("")}</tbody></table></div>`;
}

function strengthCard() {
  const prog = D.strengthProgress();
  if (!prog.length) return "";
  return `<div class="card"><h2>Strength progress <small>best set, last 4 wks vs 8 wks before</small></h2><div class="list">
    ${prog.slice(0, 10).map(p => `<div class="item"><div class="t"><b>${esc(p.name)}</b><span>${p.recent.kg} kg × ${p.recent.reps} (was ${p.old.kg} kg × ${p.old.reps})</span></div>
      <div class="n ${p.change >= 2.5 ? "good-t" : p.change <= -5 ? "warn-t" : ""}">${p.change > 0 ? "+" : ""}${U.r(p.change)}%<span>est. 1-rep max ${U.r(p.recent.e1rm)} kg</span></div></div>`).join("")}
    </div></div>`;
}

function ago(iso) {
  if (!iso) return "never";
  const m = (Date.now() - new Date(iso)) / 60000;
  const rel = m < 2 ? "just now" : m < 60 ? Math.round(m) + " min ago" : m < 48 * 60 ? Math.round(m / 60) + " h ago" : Math.round(m / 1440) + " days ago";
  return rel + " · " + new Date(iso).toLocaleString(undefined, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}
function hevyLast() {
  const w = Store.all("hevy_workout").slice(-1)[0];
  return w ? (w.start || w.date + "T12:00:00") : null;
}
function sourcesHtml() {
  const g = Store.get("meta", "sync");
  const lastG = Store.all("garmin_daily").slice(-1)[0], lastH = hevyLast();
  const gFail = g && /^failed/.test(g.garmin || "");
  return `<div class="card"><h2>Data sources</h2><div class="sources">
    <div><span><b>Garmin</b> · ${gFail ? `<span class="warn-t">last sync failed</span>` : "synced " + ago(g && g.at)}</span><span>${lastG ? "data to " + U.short(lastG.date) : ""}</span></div>
    <div><span><b>Hevy</b> · ${lastH ? "last workout " + ago(lastH) : "not imported yet"}</span><span>${Store.get("meta", "hevy_import") ? "imported " + U.short(Store.get("meta", "hevy_import").at.slice(0, 10)) : ""}</span></div>
    <p class="small muted">Garmin syncs automatically at 6 am, 12 pm, 6 pm and 11 pm. Hevy needs a fresh export → Settings → Import Hevy CSV.</p>
    <button class="btn sm ghost sync-now" data-act="garmin-sync">${S.syncing ? "Syncing Garmin…" : "Sync Garmin now"}</button>
  </div></div>`;
}

function muscleHtml(from, to) {
  const m = D.muscleSets(from, to), max = Math.max(1, ...Object.values(m));
  return Muscles.groups.map(g => `<div class="mrow ${m[g] ? "" : "zero"}"><span>${g}</span><div class="bar"><i style="width:${m[g] / max * 100}%"></i></div><b>${U.r(m[g])}</b></div>`).join("");
}

// ---------- views ----------
const views = {
  today() {
    const date = S.date, d7 = U.days(7, date), d14 = U.days(14, date);
    const ins = Insights.build().filter(i => i.level !== "good" || i.area === "Calories").slice(0, 3);
    const banner = !hasAny() ? `<div class="banner"><b>Welcome to Health Hub</b>Nothing here yet. Load sample data to see how everything looks, or just start logging food and weight.<div class="gap"><button class="btn sm" data-act="demo-load">Load sample data</button><button class="btn sm ghost" data-act="settings">Settings & setup</button></div></div>`
      : Demo.present() ? `<div class="banner"><b>You are looking at sample data</b>Remove it before logging your own.<div class="gap"><button class="btn sm ghost" data-act="demo-clear">Remove sample data</button></div></div>` : "";
    const wts = Store.all("weight").filter(w => w.date >= U.addDays(date, -60) && w.date <= date);
    $("#view").innerHTML = `${dateBar()}${banner}${balanceCard(date)}${tilesHtml(date)}
      <div class="card"><h2>What your data says <button class="btn sm ghost" data-act="tab" data-v="insights">See all</button></h2>${ins.map(insHtml).join("") || `<p class="muted">Insights appear once there are a few days of data.</p>`}</div>
      <div class="grid cols2">
        <div class="card"><h2>Calories · 7 days <small id="wk-net"></small></h2><div class="chart"><canvas id="c-cal"></canvas></div></div>
        <div class="card"><h2>Muscle groups · 7 days <small>sets</small></h2>${Store.all("hevy_workout").length ? muscleHtml(d7[0], date) : `<p class="muted">No strength workouts yet. Connect Hevy or import your Hevy CSV in Settings.</p>`}</div>
        <div class="card"><h2>Steps · 14 days</h2><div class="chart"><canvas id="c-steps"></canvas></div></div>
        <div class="card"><h2>Weight · 60 days</h2>${wts.length ? `<div class="chart"><canvas id="c-wt"></canvas></div>` : `<p class="muted">Log your weight in the Body tab.</p>`}</div>
      </div>${sourcesHtml()}`;
    const eaten = d7.map(d => { const i = D.intake(d); return i ? Math.round(i.kcal) : null; }), burned = d7.map(d => { const b = D.burn(d); return b ? Math.round(b.kcal) : null; });
    mkChart("c-cal", "bar", d7.map(U.short), [{ label: "Eaten", data: eaten, backgroundColor: cssv("--c3") }, { label: "Burned", data: burned, backgroundColor: cssv("--c2") }], { zero: true });
    const net = U.sum(d7.map(d => D.balance(d)));
    if (d7.some(d => U.num(D.balance(d)))) $("#wk-net").textContent = `net ${net > 0 ? "+" : "−"}${U.r(Math.abs(net))} kcal`;
    const goal = D.stepGoal(date), steps = d14.map(d => (D.garmin(d) || {}).steps ?? null);
    mkChart("c-steps", "bar", d14.map(U.short), [{ label: "Steps", data: steps, backgroundColor: steps.map(s => s >= goal ? cssv("--c1") : cssv("--c2")) }], { zero: true });
    if (wts.length) mkChart("c-wt", "line", wts.map(w => U.short(w.date)), [lineDs("Weight (kg)", wts.map(w => w.kg), "--c1")]);
  },

  food() {
    const date = S.date, rows = Store.on("food", date), nSets = Store.all("meal_set").length;
    const meal = m => {
      const items = rows.filter(r => r.meal === m), kc = U.sum(items.map(r => r.kcal));
      return `<div class="card"><h2>${m} <small>${items.length ? U.r(kc) + " kcal" : ""}</small></h2><div class="list">
        ${items.map(r => `<div class="item"><div class="t"><b>${esc(r.name)}</b><span>${esc(r.qty)} × ${esc(r.unit)} · P ${U.r(r.protein)} · C ${U.r(r.carbs)} · F ${U.r(r.fat)}</span></div><div class="row"><div class="n">${U.r(r.kcal)}<span>kcal</span></div><button class="x" data-act="food-del" data-id="${esc(r.id)}" aria-label="Remove">×</button></div></div>`).join("")}
        </div><div class="gap btnrow" style="margin-top:${items.length ? 8 : 0}px"><button class="btn ghost sm" data-act="food-add" data-v="${m}">+ Add food</button><button class="btn ghost sm" data-act="set-list" data-v="${m}">Saved meals${nSets ? ` (${nSets})` : ""}</button>${items.length ? `<button class="btn ghost sm" data-act="set-save" data-v="${m}">Save as meal</button>` : ""}</div></div>`;
    };
    const ydayRows = Store.on("food", U.addDays(date, -1));
    $("#view").innerHTML = `${dateBar()}${balanceCard(date)}${MEALS.map(meal).join("")}
      ${!rows.length && ydayRows.length ? `<button class="btn ghost block" data-act="food-copy">Copy everything from the previous day</button>` : ""}
      <p class="muted small center">Nutrition values are typical estimates for home-style North Indian food (based on IFCT 2017). Packaged foods come from Open Food Facts.</p>`;
  },

  training() {
    const n = S.trRange, to = U.today(), from = U.addDays(to, -(n - 1));
    const ws = D.workouts(from, to).reverse(), linked = D.linkedGarminIds(U.addDays(from, -1), U.addDays(to, 1));
    const acts = Store.all("garmin_activity").filter(a => a.date >= from && a.date <= to && !linked.has(a.id)).reverse();
    const strengthKcal = U.sum(ws.map(w => (D.garminFor(w) || {}).calories));
    const vol = w => U.sum((w.exercises || []).flatMap(e => (e.sets || []).map(s => (s.kg || 0) * (s.reps || 0))));
    const wk = w => `<details class="wk"><summary><div class="t"><b>${esc(w.title || "Workout")}</b><span class="muted small">${U.nice(w.date)}${w.duration_min ? " · " + w.duration_min + " min" : ""} · ${(w.exercises || []).length} exercises</span>${(() => { const g = D.garminFor(w); return g ? `<span class="linked">Garmin: ${U.r(g.calories)} kcal${g.avg_hr ? ` · avg ${U.r(g.avg_hr)} bpm` : ""}${g.max_hr ? ` · max ${U.r(g.max_hr)}` : ""}</span>` : `<span class="linked">Not recorded on Garmin</span>`; })()}</div><div class="n small muted">${U.r(vol(w))} kg<br>volume</div></summary>
      ${(w.exercises || []).map(e => `<div class="ex"><b>${esc(e.name)}</b> <span>· ${esc(Muscles.norm(e.muscle))}</span><br><span>${(e.sets || []).map(s => s.kg ? `${s.kg}×${s.reps ?? "?"}` : s.reps ? `${s.reps} reps` : s.dur ? Math.round(s.dur / 60) + " min" : "set").join("  ·  ")}</span></div>`).join("")}</details>`;
    const act = a => `<div class="item"><div class="t"><b>${esc(a.name || a.type)}</b><span>${U.nice(a.date)} · ${U.hm(a.duration_s)}${a.distance_m ? " · " + U.r(a.distance_m / 1000, 1) + " km" : ""}${a.avg_hr ? " · avg " + U.r(a.avg_hr) + " bpm" : ""}</span></div><div class="n">${U.r(a.calories)}<span>kcal</span></div></div>`;
    $("#view").innerHTML = `${seg("tr-range", [[7, "7 days"], [14, "14 days"], [30, "30 days"]], n)}
      <div class="grid cols2">
      <div class="card"><h2>Muscle groups trained <small>working sets</small></h2>${muscleHtml(from, to)}<p class="muted small" style="margin-top:8px">A set counts fully for the main muscle and half for helper muscles. Aim for roughly 10–20 sets per muscle each week.</p></div>
      <div class="card"><h2>Volume per session <small>kg lifted</small></h2><div class="chart"><canvas id="c-vol"></canvas></div></div></div>
      ${strengthCard()}
      <div class="card"><h2>Strength workouts (Hevy) <small>${ws.length} sessions${strengthKcal ? " · " + U.r(strengthKcal) + " kcal on Garmin" : ""}</small></h2>${ws.map(wk).join("") || `<p class="muted">No Hevy workouts in this period.</p>`}
        <div class="gap" style="margin-top:10px"><button class="btn sm ghost" data-act="hevy-csv">Import Hevy CSV export</button></div><input type="file" id="hevy-file" accept=".csv,text/csv" hidden></div>
      <div class="card"><h2>Other Garmin activities <small>${acts.length ? U.r(U.sum(acts.map(a => a.calories))) + " kcal" : ""}</small></h2><div class="list">${acts.map(act).join("") || `<p class="muted">No Garmin activities in this period.</p>`}</div></div>`;
    const asc = ws.slice().reverse();
    mkChart("c-vol", "bar", asc.map(w => U.short(w.date)), [{ label: "Volume (kg)", data: asc.map(vol), backgroundColor: cssv("--c4") }], { zero: true });
  },

  body() {
    const tab = S.bodyTab, today = U.today();
    let html = seg("body-tab", [["weight", "Weight"], ["measure", "Measurements"], ["medical", "Medical"]], tab);
    if (tab === "weight") {
      const w = Store.all("weight");
      html += `<form class="card grid" data-form="weight"><h2>Log weight</h2><div class="fgrid3">
          <label class="f">Date<input type="date" name="date" value="${today}" max="${today}" required></label>
          <label class="f">Weight (kg)<input type="number" name="kg" step="0.1" min="20" max="300" inputmode="decimal" required></label>
          <label class="f">Body fat % (optional)<input type="number" name="bodyfat" step="0.1" min="2" max="70" inputmode="decimal"></label></div>
          <button class="btn">Save</button></form>
        <div class="card"><h2>Trend</h2>${w.length ? `<div class="chart tall"><canvas id="c-w"></canvas></div>` : `<p class="muted">No entries yet.</p>`}</div>
        <div class="card"><h2>History</h2><div class="list">${w.slice().reverse().slice(0, 60).map(r => `<div class="item"><div class="t"><b>${U.r(r.kg, 1)} kg</b><span>${U.nice(r.date)}${U.num(r.bodyfat) ? " · " + r.bodyfat + "% fat" : ""}</span></div><button class="x" data-act="del" data-c="weight" data-id="${esc(r.id)}" aria-label="Delete">×</button></div>`).join("") || `<p class="muted">Nothing logged.</p>`}</div></div>`;
    } else if (tab === "measure") {
      const ms = Store.all("measure"), first = ms[0];
      const line = (r) => MEASURES.filter(([k]) => U.num(r[k])).map(([k, l]) => { const d = first && first !== r && U.num(first[k]) ? r[k] - first[k] : 0; return `${l} ${r[k]}${d ? ` (${d > 0 ? "+" : ""}${U.r(d, 1)})` : ""}`; }).join(" · ");
      html += `<form class="card grid" data-form="measure"><h2>Log measurements <small>cm - fill what you measured</small></h2>
          <label class="f">Date<input type="date" name="date" value="${today}" max="${today}" required></label>
          <div class="fgrid">${MEASURES.map(([k, l]) => `<label class="f">${l}<input type="number" name="${k}" step="0.1" min="5" max="250" inputmode="decimal"></label>`).join("")}</div>
          <button class="btn">Save</button></form>
        <div class="card"><h2>Trend</h2>${ms.length > 1 ? `<div class="chart tall"><canvas id="c-m"></canvas></div>` : `<p class="muted">Add two or more entries to see a trend.</p>`}</div>
        <div class="card"><h2>History <small>change vs first entry in brackets</small></h2><div class="list">${ms.slice().reverse().map(r => `<div class="item"><div class="t"><b>${U.nice(r.date)}</b><span style="white-space:normal">${line(r)}</span></div><button class="x" data-act="del" data-c="measure" data-id="${esc(r.id)}" aria-label="Delete">×</button></div>`).join("") || `<p class="muted">Nothing logged.</p>`}</div></div>`;
    } else {
      const med = Store.all("medical").slice().reverse();
      const row = r => r.kind === "Injury"
        ? `<div class="item"><div class="t"><b>${esc(r.notes || "Injury")}</b><span>Injury · ${U.nice(r.date)} · ${r.status === "resolved" ? "resolved" : "active"}</span></div><div class="row"><button class="btn sm ghost" data-act="injury-toggle" data-id="${esc(r.id)}">${r.status === "resolved" ? "Reopen" : "Mark healed"}</button><button class="x" data-act="del" data-c="medical" data-id="${esc(r.id)}" aria-label="Delete">×</button></div></div>`
        : `<div class="item"><div class="t"><b>${esc(r.kind)}${U.num(r.value) ? ": " + r.value + (U.num(r.value2) ? "/" + r.value2 : "") + " " + esc(r.unit || "") : ""}</b><span style="white-space:normal">${U.nice(r.date)}${r.notes ? " · " + esc(r.notes) : ""}</span></div><button class="x" data-act="del" data-c="medical" data-id="${esc(r.id)}" aria-label="Delete">×</button></div>`;
      html += `<form class="card grid" data-form="medical"><h2>Log medical data</h2><div class="fgrid">
          <label class="f">What<select name="kind" id="med-kind">${Object.keys(MEDICAL).map(k => `<option>${k}</option>`).join("")}</select></label>
          <label class="f">Date<input type="date" name="date" value="${today}" max="${today}" required></label></div>
          <div class="fgrid" id="med-vals"></div>
          <label class="f">Notes<input name="notes" id="med-notes" placeholder="Optional"></label>
          <button class="btn">Save</button></form>
        <div class="card"><h2>Blood sugar trend</h2>${med.some(m => m.kind === "HbA1c") ? `<div class="chart"><canvas id="c-a1c"></canvas></div>` : `<p class="muted">Log HbA1c results to see the trend.</p>`}</div>
        <div class="card"><h2>History</h2><div class="list">${med.map(row).join("") || `<p class="muted">Nothing logged.</p>`}</div></div>`;
    }
    $("#view").innerHTML = html;
    if (tab === "weight") { const w = Store.all("weight"); if (w.length) mkChart("c-w", "line", w.map(r => U.short(r.date)), [lineDs("Weight (kg)", w.map(r => r.kg), "--c1")]); }
    if (tab === "measure") {
      const ms = Store.all("measure"), cols = ["--c1", "--c2", "--c3", "--c4", "--c5"];
      const keys = MEASURES.filter(([k]) => ms.filter(m => U.num(m[k])).length > 1).slice(0, 5);
      if (ms.length > 1) mkChart("c-m", "line", ms.map(r => U.short(r.date)), keys.map(([k, l], i) => lineDs(l, ms.map(m => { const f = ms.find(x => U.num(x[k])); return U.num(m[k]) ? +(m[k] - f[k]).toFixed(1) : null; }), cols[i])));
    }
    if (tab === "medical") {
      medFields();
      const a = Store.all("medical").filter(m => m.kind === "HbA1c" && U.num(m.value));
      if (a.length) mkChart("c-a1c", "line", a.map(r => U.short(r.date)), [Object.assign(lineDs("HbA1c %", a.map(r => r.value), "--c5"), { pointRadius: 4 })], { min: 5, max: 7 });
    }
  },

  insights() {
    const n = S.range, days = U.days(n), lab = days.map(U.short), all = Insights.build();
    const gk = k => D.series(days, d => (D.garmin(d) || {})[k]);
    const groups = {}; all.forEach(i => (groups[i.area] = groups[i.area] || []).push(i));
    const counts = { warn: all.filter(i => i.level === "warn").length, good: all.filter(i => i.level === "good").length };
    const ch = (id, title) => `<div class="card"><h2>${title}</h2><div class="chart"><canvas id="${id}"></canvas></div></div>`;
    $("#view").innerHTML = `<div class="card"><h2>Summary</h2><p><b class="warn-t">${counts.warn}</b> thing${counts.warn === 1 ? "" : "s"} to work on · <b class="good-t">${counts.good}</b> going well</p></div>
      ${weekCard()}
      ${Object.keys(groups).map(a => `<div class="card grouped"><h2>${esc(a)}</h2>${groups[a].map(insHtml).join("")}</div>`).join("")}
      <h2 style="font-size:16px;margin-top:6px">Trends</h2>${seg("range", [[7, "7 days"], [30, "30 days"], [90, "90 days"], [365, "1 year"]], n)}
      <div class="grid cols2">${ch("t-bal", "Calorie balance (eaten − burned)")}${ch("t-sleep", "Sleep (hours)")}${ch("t-hrv", "HRV & resting heart rate")}${ch("t-bb", "Body Battery")}${ch("t-stress", "Stress & training readiness")}${ch("t-steps", "Steps")}</div>
      <p class="muted small center">These are automated observations from your own data, not medical advice. Discuss medical results and injuries with your doctor.</p>`;
    const bal = days.map(d => { const v = D.balance(d); return U.num(v) ? Math.round(v) : null; });
    mkChart("t-bal", "bar", lab, [{ label: "kcal", data: bal, backgroundColor: bal.map(v => v > 0 ? cssv("--c3") : cssv("--c1")) }]);
    mkChart("t-sleep", "bar", lab, [{ label: "Hours", data: gk("sleep_seconds").map(v => v == null ? null : +(v / 3600).toFixed(1)), backgroundColor: cssv("--c4") }], { zero: true });
    mkChart("t-hrv", "line", lab, [lineDs("HRV (ms)", gk("hrv"), "--c1"), lineDs("Resting HR (bpm)", gk("resting_hr"), "--c5")]);
    mkChart("t-bb", "line", lab, [lineDs("Peak", gk("body_battery_high"), "--c2"), lineDs("Lowest", gk("body_battery_low"), "--c3")], { min: 0, max: 100 });
    mkChart("t-stress", "line", lab, [lineDs("Stress", gk("stress_avg"), "--c3"), lineDs("Readiness", gk("training_readiness"), "--c1")], { min: 0, max: 100 });
    mkChart("t-steps", "bar", lab, [{ label: "Steps", data: gk("steps"), backgroundColor: cssv("--c2") }], { zero: true });
  },

  login() {
    $("#view").innerHTML = `<form class="card grid" data-form="login" style="max-width:420px;margin:30px auto;width:100%"><h2>Sign in</h2>
      <label class="f">Email<input type="email" name="email" autocomplete="username" required></label>
      <label class="f">Password<input type="password" name="password" autocomplete="current-password" required></label>
      <button class="btn">Sign in</button><p class="muted small">Use the login you created in your Supabase project (see SETUP.md).</p></form>`;
  },
};

function medFields() {
  const kind = $("#med-kind").value, box = $("#med-vals"), unit = MEDICAL[kind];
  if (kind === "Injury" || kind === "Other note") { box.innerHTML = ""; $("#med-notes").placeholder = kind === "Injury" ? "e.g. Left knee pain on squats" : "Describe"; $("#med-notes").required = true; return; }
  $("#med-notes").required = false; $("#med-notes").placeholder = "Optional (lab, fasting, etc.)";
  box.innerHTML = kind === "Blood pressure"
    ? `<label class="f">Systolic (upper)<input type="number" name="value" inputmode="decimal" required></label><label class="f">Diastolic (lower)<input type="number" name="value2" inputmode="decimal" required></label>`
    : `<label class="f">Value (${unit})<input type="number" name="value" step="any" inputmode="decimal" required></label>`;
}

function render() {
  charts.forEach(c => c.destroy()); charts = [];
  const tab = S.cloud && !S.signedIn ? "login" : S.tab;
  document.querySelectorAll("#tabs button").forEach(b => b.classList.toggle("on", b.dataset.tab === tab));
  $("#tabs").hidden = tab === "login";
  $("#title").textContent = { today: "Health Hub", food: "Food log", training: "Training", body: "Body & medical", insights: "Insights", login: "Health Hub" }[tab];
  const meta = Store.get("meta", "sync"), pill = $("#sync-pill");
  if (meta && meta.at) { const h = (Date.now() - new Date(meta.at)) / 36e5; pill.textContent = (/^failed/.test(meta.garmin || "") ? "Garmin sync failed " : "Synced ") + (h < 1 ? "just now" : h < 48 ? Math.round(h) + "h ago" : Math.round(h / 24) + "d ago"); pill.hidden = false; }
  else { pill.textContent = S.cloud ? "Cloud" : "This device only"; pill.hidden = tab === "login"; }
  views[tab]();
}

// ---------- sheets ----------
function openSheet(html) { $("#sheet-card").innerHTML = html; $("#sheet").hidden = false; }
function closeSheet() { $("#sheet").hidden = true; $("#sheet-card").innerHTML = ""; }

let foodCtx = { meal: "Breakfast", list: [], food: null };
function foodSearchSheet(meal) {
  foodCtx.meal = meal;
  openSheet(`<h2>Add to ${esc(meal)} <button class="x" data-close>×</button></h2>
    <input id="food-q" type="search" placeholder="Search: roti, dal, paneer, chai…" autocomplete="off">
    <div class="results list" id="food-results"></div>
    <div class="gap"><button class="btn sm ghost" data-act="food-online">Search packaged foods online</button><button class="btn sm ghost" data-act="food-custom">+ Create my own food</button></div>`);
  foodResults("");
}
function foodResults(q, online) {
  let list = online || Foods.search(q);
  if (!q && !online) { // show recently used first
    const recent = [...new Set(Store.all("food").slice(-80).reverse().map(r => r.name))].slice(0, 8);
    list = recent.map(n => list.find(f => f.name === n)).filter(Boolean).concat(list.filter(f => !recent.includes(f.name)));
  }
  foodCtx.list = list.slice(0, 60);
  $("#food-results").innerHTML = foodCtx.list.map((f, i) => `<button class="item" data-act="food-pick" data-i="${i}"><div class="t"><b>${esc(f.name)}</b><span>1 ${esc(f.unit)}${f.grams && !/\bg\b/.test(f.unit) ? " (~" + f.grams + " g)" : ""} · ${esc(f.source)}</span></div><div class="n">${U.r(f.kcal)}<span>kcal</span></div></button>`).join("")
    || `<p class="muted pad center">No match. Try "Search packaged foods online" or create your own food.</p>`;
}
function foodDetailSheet(f) {
  foodCtx.food = f;
  const units = [f.unit].concat(f.grams ? ["grams"] : []);
  openSheet(`<h2>${esc(f.name)} <button class="x" data-close>×</button></h2>
    <div class="fgrid3"><label class="f">How much<input type="number" id="fd-qty" value="1" min="0" step="0.25" inputmode="decimal"></label>
      <label class="f">Unit<select id="fd-unit">${units.map(u => `<option>${esc(u)}</option>`).join("")}</select></label>
      <label class="f">Meal<select id="fd-meal">${MEALS.map(m => `<option ${m === foodCtx.meal ? "selected" : ""}>${m}</option>`).join("")}</select></label></div>
    <div class="nutri" id="fd-n"></div>
    <button class="btn" data-act="food-save">Add to log</button><button class="btn ghost" data-act="food-back">Back to search</button>`);
  foodCalc();
}
function foodCalc() {
  const f = foodCtx.food, qty = parseFloat($("#fd-qty").value) || 0, unit = $("#fd-unit").value;
  const k = unit === "grams" ? qty / f.grams : qty;
  const v = { kcal: Math.round(f.kcal * k), protein: +(f.protein * k).toFixed(1), carbs: +(f.carbs * k).toFixed(1), fat: +(f.fat * k).toFixed(1), fiber: +(f.fiber * k).toFixed(1), sugar: +((+f.sugar || 0) * k).toFixed(1) };
  $("#fd-n").innerHTML = [["kcal", "kcal"], ["protein", "protein"], ["carbs", "carbs"], ["fat", "fat"], ["fiber", "fibre"], ["sugar", "sugar"]].map(([key, l]) => `<div><b>${v[key]}${key === "kcal" ? "" : "g"}</b><span>${l}</span></div>`).join("");
  return Object.assign({ qty, unit: unit === "grams" ? "g" : f.unit }, v);
}
function foodCustomSheet() {
  openSheet(`<h2>Create my own food <button class="x" data-close>×</button></h2><form class="grid" data-form="custom-food">
    <label class="f">Name<input name="name" required placeholder="e.g. Mom's besan ladoo"></label>
    <div class="fgrid"><label class="f">Serving name<input name="unit" required placeholder="piece, katori, 100 g…"></label><label class="f">Calories per serving<input type="number" name="kcal" step="any" inputmode="decimal" required></label></div>
    <div class="fgrid"><label class="f">Protein (g)<input type="number" name="protein" step="any" inputmode="decimal"></label><label class="f">Carbs (g)<input type="number" name="carbs" step="any" inputmode="decimal"></label>
    <label class="f">Fat (g)<input type="number" name="fat" step="any" inputmode="decimal"></label><label class="f">Fibre (g)<input type="number" name="fiber" step="any" inputmode="decimal"></label><label class="f">Sugar (g)<input type="number" name="sugar" step="any" inputmode="decimal"></label></div>
    <button class="btn">Save food</button></form>`);
}

// ---------- saved meals (add a whole standard breakfast / lunch in one tap) ----------
const setKcal = st => U.sum((st.items || []).map(i => i.kcal));
function mealSetListSheet(meal) {
  foodCtx.meal = meal;
  const sets = Store.all("meal_set").sort((a, b) => (a.meal === meal ? 0 : 1) - (b.meal === meal ? 0 : 1) || String(a.name).localeCompare(b.name));
  openSheet(`<h2>Saved meals → ${esc(meal)} <button class="x" data-close>×</button></h2>
    <div class="results list">${sets.map(st => `<div class="item"><button class="item" style="border:0;padding:0" data-act="set-add" data-id="${esc(st.id)}"><div class="t"><b>${esc(st.name)}</b><span style="white-space:normal">${(st.items || []).map(i => esc(i.name)).join(", ")}</span></div><div class="n">${U.r(setKcal(st))}<span>kcal</span></div></button><button class="x" data-act="set-del" data-id="${esc(st.id)}" aria-label="Delete saved meal">×</button></div>`).join("")
      || `<p class="muted pad center">No saved meals yet. Log a meal once, then tap “Save as meal” under it. After that the whole meal is one tap.</p>`}</div>
    <p class="muted small">Tap a saved meal to add all its items to ${esc(meal)} on ${U.nice(S.date)}. You can then remove or change single items as usual.</p>`);
}
function mealSetSaveSheet(meal) {
  const items = Store.on("food", S.date).filter(r => r.meal === meal);
  openSheet(`<h2>Save as meal <button class="x" data-close>×</button></h2><form class="grid" data-form="meal-set">
    <input type="hidden" name="meal" value="${esc(meal)}">
    <label class="f">Name<input name="name" required value="My usual ${esc(meal.toLowerCase())}" autocomplete="off"></label>
    <p class="muted small">${items.length} items · ${U.r(U.sum(items.map(i => i.kcal)))} kcal: ${items.map(i => esc(i.name)).join(", ")}</p>
    <button class="btn">Save</button></form>`);
}

function settingsSheet() {
  const p = D.profile(), meta = Store.get("meta", "sync");
  const sel = (name, opts, cur) => `<select name="${name}">${opts.map(([v, l]) => `<option value="${v}" ${String(v) === String(cur) ? "selected" : ""}>${l}</option>`).join("")}</select>`;
  openSheet(`<h2>Settings <button class="x" data-close>×</button></h2>
    <form class="grid" data-form="profile"><b>Your profile & goal</b>
      <div class="fgrid3"><label class="f">Sex${sel("sex", [["male", "Male"], ["female", "Female"]], p.sex)}</label><label class="f">Age<input type="number" name="age" value="${p.age ?? ""}" inputmode="numeric"></label><label class="f">Height (cm)<input type="number" name="height_cm" value="${p.height_cm ?? ""}" step="0.5" inputmode="decimal"></label></div>
      <div class="fgrid"><label class="f">Goal${sel("goal", [["lose", "Lose fat"], ["maintain", "Maintain"], ["gain", "Gain muscle"]], p.goal)}</label><label class="f">Daily calorie target (− deficit / + surplus)<input type="number" name="balance_target" value="${p.balance_target ?? ""}" step="50" inputmode="numeric"></label>
      <label class="f">Protein goal${sel("protein_mode", [["auto", "Automatic (from my weight)"], ["manual", "Fixed number I choose"]], p.protein_mode || "auto")}</label>
      <label class="f">Automatic: grams per kg<input type="number" name="protein_per_kg" value="${p.protein_per_kg ?? 1.6}" step="0.1" inputmode="decimal"></label>
      <label class="f">Fixed: grams per day<input type="number" name="protein_g" value="${p.protein_g ?? ""}" step="5" inputmode="numeric" placeholder="e.g. 120"></label>
      <label class="f">Daily sugar limit (g)<input type="number" name="sugar_limit" value="${p.sugar_limit ?? 50}" step="5" inputmode="numeric"></label><label class="f">Step goal (blank = Garmin's)<input type="number" name="step_goal" value="${p.step_goal ?? ""}" step="500" inputmode="numeric"></label></div>
      <button class="btn">Save profile</button></form>
    <div class="card"><b>Connections</b>
      <p class="small muted" style="margin-top:4px">Storage: ${S.cloud ? "your Supabase cloud database (available on all your devices)" : "this browser only. Follow SETUP.md to move to the free cloud database so your phone and laptop share data"}.</p>
      <p class="small muted" style="margin-top:4px">Garmin: synced ${ago(meta && meta.at)}${meta && meta.garmin && meta.garmin !== "ok" ? " (" + esc(meta.garmin) + ")" : ""}. Hevy: ${hevyLast() ? "last workout " + ago(hevyLast()) : "not imported yet"}.</p>
      <div class="gap" style="margin-top:8px"><button class="btn sm ghost" data-act="garmin-sync">${S.syncing ? "Syncing Garmin…" : "Sync Garmin now"}</button></div>
      <p class="small muted" style="margin-top:4px">No Hevy Pro? Export a CSV from the Hevy app (Profile → Settings → Export & Import Data) and import it here.</p>
      <div class="gap" style="margin-top:8px"><button class="btn sm ghost" data-act="hevy-csv">Import Hevy CSV</button><button class="btn sm ghost" data-act="reload">Refresh data</button></div><input type="file" id="hevy-file" accept=".csv,text/csv" hidden></div>
    <div class="card"><b>Data</b><div class="gap" style="margin-top:8px">
      <button class="btn sm ghost" data-act="export">Download backup</button>
      ${Demo.present() ? `<button class="btn sm ghost" data-act="demo-clear">Remove sample data</button>` : `<button class="btn sm ghost" data-act="demo-load">Load sample data</button>`}
      ${S.cloud && Store.hasDeviceData() ? `<button class="btn sm ghost" data-act="to-cloud">Copy this device's data to the cloud</button>` : ""}
      ${S.cloud ? `<button class="btn sm danger" data-act="signout">Sign out</button>` : ""}</div></div>`);
}

// ---------- Hevy CSV import ----------
function parseCsv(text) {
  const rows = []; let row = [], cur = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
    else if (c === '"') q = true;
    else if (c === ",") { row.push(cur); cur = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(cur); cur = ""; if (row.length > 1 || row[0]) rows.push(row); row = []; }
    else cur += c;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows;
}
function parseHevyDate(s) {
  const m = /(\d{1,2}) (\w{3})\w* (\d{4}),? (\d{1,2}):(\d{2})/.exec(s || "");
  if (m) { const mon = "janfebmaraprmayjunjulaugsepoctnovdec".indexOf(m[2].toLowerCase()) / 3; if (mon >= 0 && Number.isInteger(mon)) return new Date(+m[3], mon, +m[1], +m[4], +m[5]); }
  const u = /(\w{3})\w* (\d{1,2}),? (\d{4}),? (\d{1,2}):(\d{2})\s*([AP]M)?/i.exec(s || ""); // "Nov 17, 2026, 9:34 AM"
  if (u) { const mon = "janfebmaraprmayjunjulaugsepoctnovdec".indexOf(u[1].toLowerCase()) / 3; let h = +u[4] % (u[6] ? 12 : 24); if (/pm/i.test(u[6] || "")) h += 12; if (mon >= 0 && Number.isInteger(mon)) return new Date(+u[3], mon, +u[2], h, +u[5]); }
  const d = new Date(s); return isNaN(d) ? null : d;
}
async function importHevyCsv(file) {
  const rows = parseCsv(await file.text()), head = rows.shift().map(h => h.trim().toLowerCase()), col = n => head.indexOf(n);
  if (col("exercise_title") < 0 || col("start_time") < 0) throw new Error("This does not look like a Hevy export (CSV)");
  const num = v => v === "" || v == null || isNaN(+v) ? null : +v, map = {};
  rows.forEach(r => {
    const g = n => col(n) >= 0 ? r[col(n)] : "", start = parseHevyDate(g("start_time")); if (!start) return;
    const end = parseHevyDate(g("end_time")), id = "csv-" + start.getTime();
    const w = map[id] = map[id] || { id, date: U.ymd(start), title: g("title"), start: start.toISOString(), duration_min: end ? Math.round((end - start) / 60000) : null, exercises: [], source: "csv" };
    const name = g("exercise_title"); let ex = w.exercises[w.exercises.length - 1];
    if (!ex || ex.name !== name) { ex = Object.assign({ name, sets: [] }, Muscles.guess(name)); w.exercises.push(ex); }
    const kg = num(g("weight_kg")) ?? (num(g("weight_lbs")) != null ? +(num(g("weight_lbs")) * 0.4536).toFixed(1) : null);
    ex.sets.push({ type: g("set_type") || "normal", kg, reps: num(g("reps")), dur: num(g("duration_seconds")), dist: num(g("distance_km")) });
  });
  const list = Object.values(map);
  // do not duplicate workouts already synced through the Hevy API (same start minute)
  const have = new Set(Store.all("hevy_workout").filter(w => w.source !== "csv" && w.start).map(w => Math.floor(new Date(w.start) / 60000)));
  const fresh = list.filter(w => !have.has(Math.floor(new Date(w.start) / 60000)));
  await Store.putMany("hevy_workout", fresh);
  await Store.put("meta", { id: "hevy_import", at: new Date().toISOString(), count: fresh.length });
  toast(`Imported ${fresh.length} workouts`); closeSheet(); render();
}

// ---------- actions ----------
const actions = {
  tab: el => { S.tab = el.dataset.v; render(); window.scrollTo(0, 0); },
  day: el => { S.date = U.addDays(S.date, +el.dataset.n); if (S.date > U.today()) S.date = U.today(); render(); },
  "tr-range": el => { S.trRange = +el.dataset.v; render(); },
  range: el => { S.range = +el.dataset.v; render(); },
  "body-tab": el => { S.bodyTab = el.dataset.v; render(); },
  settings: settingsSheet,
  "garmin-sync": () => safe(async () => {
    if (S.syncing) return toast("Already syncing - takes about a minute");
    let r; try { r = await Store.rpc("request_garmin_sync"); } catch (e) { r = "error"; }
    if (r !== "ok") { const url = "https://github.com/oaklawn1/health-hub/actions/workflows/sync.yml"; if (!window.open(url, "_blank")) location.href = url; return toast("Opened GitHub - tap “Run workflow” there"); }
    const before = (Store.get("meta", "sync") || {}).at;
    S.syncing = true; render(); toast("Garmin sync started - takes about a minute");
    for (let n = 0; n < 16; n++) {   // check every 15 s for up to 4 minutes
      await new Promise(res => setTimeout(res, 15000));
      await Store.load();
      if ((Store.get("meta", "sync") || {}).at !== before) { S.syncing = false; closeSheet(); render(); return toast("Garmin synced"); }
    }
    S.syncing = false; render(); toast("Sync is taking longer than usual - check back in a few minutes");
  }),
  reload: () => safe(async () => { await Store.load(); closeSheet(); render(); toast("Data refreshed"); }),
  "demo-load": () => safe(async () => { await Demo.load(); closeSheet(); render(); toast("Sample data loaded"); }),
  "demo-clear": () => safe(async () => { await Demo.clear(); closeSheet(); render(); toast("Sample data removed"); }),
  "to-cloud": () => safe(async () => { toast("Copying to the cloud…"); const n = await Store.importDevice(); closeSheet(); render(); toast(`Copied ${n} records to the cloud`); }),
  signout: () => safe(async () => { await Store.signOut(); S.signedIn = false; closeSheet(); render(); }),
  export: () => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([JSON.stringify(Store.exportAll(), null, 1)], { type: "application/json" })); a.download = "health-hub-backup-" + U.today() + ".json"; a.click(); },
  "hevy-csv": () => $("#hevy-file").click(),
  del: el => safe(async () => { if (!confirm("Delete this entry?")) return; await Store.remove(el.dataset.c, el.dataset.id); render(); }),
  "injury-toggle": el => safe(async () => { const r = Store.get("medical", el.dataset.id); r.status = r.status === "resolved" ? "active" : "resolved"; await Store.put("medical", r); render(); }),
  "food-add": el => foodSearchSheet(el.dataset.v),
  "set-list": el => mealSetListSheet(el.dataset.v),
  "set-save": el => mealSetSaveSheet(el.dataset.v),
  "set-add": el => safe(async () => {
    const st = Store.get("meal_set", el.dataset.id); if (!st) return;
    const rows = (st.items || []).map(i => Object.assign({}, i, { id: Store.uid(), date: S.date, meal: foodCtx.meal }));
    await Store.putMany("food", rows); closeSheet(); render(); toast(`Added ${st.name} (${rows.length} items)`);
  }),
  "set-del": el => safe(async () => { if (!confirm("Delete this saved meal? Your food log is not affected.")) return; await Store.remove("meal_set", el.dataset.id); mealSetListSheet(foodCtx.meal); render(); mealSetListSheet(foodCtx.meal); }),
  "food-del": el => safe(async () => { await Store.remove("food", el.dataset.id); render(); }),
  "food-copy": () => safe(async () => { const rows = Store.on("food", U.addDays(S.date, -1)).map(r => Object.assign({}, r, { id: Store.uid(), date: S.date, demo: undefined })); await Store.putMany("food", rows); render(); toast("Copied " + rows.length + " items"); }),
  "food-pick": el => foodDetailSheet(foodCtx.list[+el.dataset.i]),
  "food-back": () => foodSearchSheet(foodCtx.meal),
  "food-custom": foodCustomSheet,
  "food-online": () => safe(async () => {
    const q = $("#food-q").value.trim(); if (q.length < 3) return toast("Type a product name first");
    $("#food-results").innerHTML = `<p class="muted pad center">Searching Open Food Facts…</p>`;
    foodResults(q, await Foods.searchOnline(q));
  }),
  "food-save": () => safe(async () => {
    const v = foodCalc(); if (!v.qty) return toast("Enter how much you ate");
    await Store.put("food", Object.assign({ date: S.date, meal: $("#fd-meal").value, name: foodCtx.food.name }, v));
    closeSheet(); render(); toast("Added");
  }),
};

const forms = {
  async login(d) { await Store.signIn(d.email, d.password); S.signedIn = true; $("#view").innerHTML = `<p class="muted center pad">Loading…</p>`; await Store.load(); },
  async weight(d) { await Store.put("weight", { id: d.date, date: d.date, kg: d.kg, bodyfat: d.bodyfat }); toast("Weight saved"); },
  async measure(d) { if (!MEASURES.some(([k]) => U.num(d[k]))) throw new Error("Enter at least one measurement"); await Store.put("measure", Object.assign({}, Store.get("measure", d.date) || {}, d, { id: d.date })); toast("Measurements saved"); },
  async medical(d) { d.unit = MEDICAL[d.kind]; if (d.kind === "Injury") d.status = "active"; await Store.put("medical", d); toast("Saved"); },
  async profile(d) { await Store.put("profile", Object.assign({}, d, { id: "me" })); closeSheet(); toast("Profile saved"); },
  async "meal-set"(d) {
    const items = Store.on("food", S.date).filter(r => r.meal === d.meal).map(r => ({ name: r.name, qty: r.qty, unit: r.unit, kcal: r.kcal, protein: r.protein, carbs: r.carbs, fat: r.fat, fiber: r.fiber, sugar: +Foods.sugarOf(r).toFixed(1) }));
    if (!items.length) throw new Error("This meal has no items to save");
    await Store.put("meal_set", { name: d.name, meal: d.meal, items }); closeSheet(); toast("Saved - find it under “Saved meals”");
  },
  async "custom-food"(d) { const f = await Store.put("custom_food", Object.assign({ protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0 }, d)); foodDetailSheet(Object.assign({ source: "my food" }, f)); return "keep"; },
};

document.addEventListener("click", e => {
  if (e.target.closest("[data-close]")) return closeSheet();
  const tabBtn = e.target.closest("#tabs button"); if (tabBtn) { S.tab = tabBtn.dataset.tab; render(); window.scrollTo(0, 0); return; }
  if (e.target.closest("#btn-settings")) return settingsSheet();
  const el = e.target.closest("[data-act]"); if (el && actions[el.dataset.act]) { e.preventDefault(); actions[el.dataset.act](el); }
});
document.addEventListener("submit", e => {
  const f = e.target.closest("[data-form]"); if (!f) return; e.preventDefault();
  const d = {}; new FormData(f).forEach((v, k) => { const inp = f.elements[k]; if (v === "") return; d[k] = inp && inp.type === "number" ? parseFloat(v) : v; });
  safe(async () => { const r = await forms[f.dataset.form](d); if (r !== "keep") render(); });
});
document.addEventListener("input", e => {
  if (e.target.id === "food-q") foodResults(e.target.value);
  if (e.target.id === "fd-qty") foodCalc();
});
document.addEventListener("change", e => {
  if (e.target.id === "pick-date" && e.target.value) { S.date = e.target.value; render(); }
  if (e.target.id === "fd-unit") { $("#fd-qty").value = e.target.value === "grams" ? foodCtx.food.grams : 1; foodCalc(); }
  if (e.target.id === "med-kind") medFields();
  if (e.target.id === "hevy-file" && e.target.files[0]) safe(() => importHevyCsv(e.target.files[0]));
});

(async function start() {
  try {
    const st = await Store.init(); S.cloud = st.cloud; S.signedIn = st.signedIn;
    if (S.signedIn) await Store.load();
    render();
  } catch (e) {
    console.error(e);
    $("#view").innerHTML = `<div class="card"><h2>Could not start</h2><p>${esc(e.message || e)}</p><p class="muted small" style="margin-top:6px">Check your internet connection and the settings in js/config.js.</p></div>`;
  }
})();
