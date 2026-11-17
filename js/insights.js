// Small helpers (U), data access (D) and the rule-based analysis engine (Insights).
// Everything runs in your browser - no paid AI service involved.
const U = {
  ymd(d) { return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); },
  today() { return U.ymd(new Date()); },
  parse(s) { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); },
  addDays(s, n) { const d = U.parse(s); d.setDate(d.getDate() + n); return U.ymd(d); },
  days(n, end) { end = end || U.today(); const out = []; for (let i = n - 1; i >= 0; i--) out.push(U.addDays(end, -i)); return out; },
  diffDays(a, b) { return Math.round((U.parse(b) - U.parse(a)) / 86400000); },
  nice(s) { return U.parse(s).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" }); },
  short(s) { return U.parse(s).toLocaleDateString(undefined, { day: "numeric", month: "short" }); },
  num(v) { return typeof v === "number" && isFinite(v); },
  avg(a) { a = a.filter(U.num); return a.length ? a.reduce((x, y) => x + y, 0) / a.length : null; },
  sum(a) { return a.filter(U.num).reduce((x, y) => x + y, 0); },
  r(v, dp) { if (!U.num(v)) return "–"; const f = Math.pow(10, dp || 0); return (Math.round(v * f) / f).toLocaleString(); },
  hm(sec) { if (!U.num(sec)) return "–"; const m = Math.round(sec / 60); return Math.floor(m / 60) + "h " + String(m % 60).padStart(2, "0") + "m"; },
  corr(xs, ys) {
    const n = xs.length; if (n < 3) return null;
    const mx = U.avg(xs), my = U.avg(ys); let a = 0, b = 0, c = 0;
    for (let i = 0; i < n; i++) { a += (xs[i] - mx) * (ys[i] - my); b += (xs[i] - mx) ** 2; c += (ys[i] - my) ** 2; }
    return b && c ? a / Math.sqrt(b * c) : null;
  },
  slope(points) { // [[x,y]...] least squares slope (y per x)
    const n = points.length; if (n < 2) return null;
    const mx = U.avg(points.map(p => p[0])), my = U.avg(points.map(p => p[1])); let a = 0, b = 0;
    points.forEach(p => { a += (p[0] - mx) * (p[1] - my); b += (p[0] - mx) ** 2; });
    return b ? a / b : null;
  },
};

const D = {
  profile() {
    return Object.assign({ sex: "male", age: null, height_cm: null, goal: "lose", balance_target: -400, protein_per_kg: 1.6, step_goal: null }, Store.get("profile", "me") || {});
  },
  garmin(date) { return Store.get("garmin_daily", date); },
  weightOn(date) { // latest weight on or before date
    const w = Store.all("weight").filter(r => r.date <= date && U.num(r.kg));
    return w.length ? w[w.length - 1].kg : null;
  },
  intake(date) {
    const rows = Store.on("food", date);
    if (!rows.length) return null;
    const t = { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, items: rows.length };
    rows.forEach(r => { ["kcal", "protein", "carbs", "fat", "fiber"].forEach(k => t[k] += +r[k] || 0); t.sugar += Foods.sugarOf(r); });
    return t;
  },
  bmr(date) {
    const p = D.profile(), w = D.weightOn(date || U.today());
    if (!w || !p.height_cm || !p.age) return null;
    return 10 * w + 6.25 * p.height_cm - 5 * p.age + (p.sex === "female" ? -161 : 5);
  },
  // Calories burned: Garmin's total (resting + active). Falls back to an estimate from your profile.
  burn(date) {
    const g = D.garmin(date);
    if (g && U.num(g.calories_total) && g.calories_total > 0) return { kcal: g.calories_total, active: g.calories_active, est: false };
    const b = D.bmr(date);
    return b ? { kcal: Math.round(b * 1.35), active: null, est: true } : null;
  },
  balance(date) {
    const i = D.intake(date), b = D.burn(date);
    return i && b ? i.kcal - b.kcal : null;
  },
  stepGoal(date) { const p = D.profile(), g = D.garmin(date); return p.step_goal || (g && g.step_goal) || 8000; },
  // Protein goal: "manual" = a fixed number of grams; otherwise automatic = latest weight × grams per kg (updates as weight changes).
  proteinTarget() {
    const p = D.profile();
    if (p.protein_mode === "manual" && +p.protein_g > 0) return Math.round(+p.protein_g);
    const w = D.weightOn(U.today()); return w ? Math.round(w * (+p.protein_per_kg || 1.6)) : null;
  },
  proteinBasis() { const p = D.profile(); return p.protein_mode === "manual" && +p.protein_g > 0 ? "set manually" : `${+p.protein_per_kg || 1.6} g per kg body weight`; },
  sugarLimit() { return +D.profile().sugar_limit || 50; },
  workouts(from, to) { return Store.all("hevy_workout").filter(w => w.date >= from && w.date <= to); },
  // Working sets per muscle group. Primary muscle = 1 set, secondary muscles = half a set.
  muscleSets(from, to) {
    const out = {}; Muscles.groups.forEach(g => out[g] = 0);
    D.workouts(from, to).forEach(w => (w.exercises || []).forEach(ex => {
      const sets = (ex.sets || []).filter(s => s.type !== "warmup").length;
      const p = Muscles.norm(ex.muscle);
      if (p in out) out[p] += sets;
      (ex.secondary || []).map(Muscles.norm).forEach(s => { if (s in out && s !== p) out[s] += sets * 0.5; });
    }));
    return out;
  },
  // Alcohol logged in the food log on a date (kcal, 0 if none). Matches drink names.
  alcohol(date) {
    const rows = Store.on("food", date).filter(r => /whisk|\brum\b|old monk|beer|wine|vodka|\bgin\b|tequila|brandy|alcohol|peg/i.test(r.name || ""));
    return rows.length ? U.sum(rows.map(r => r.kcal)) : 0;
  },
  // Best estimated one-rep max per exercise per workout: kg × (1 + reps/30), working sets with 1–15 reps.
  strength(from, to) {
    const out = {};
    D.workouts(from, to).forEach(w => (w.exercises || []).forEach(ex => {
      let best = null;
      (ex.sets || []).forEach(s => {
        if (s.type === "warmup" || !(s.kg > 0) || !(s.reps >= 1 && s.reps <= 15)) return;
        const e = s.kg * (1 + s.reps / 30);
        if (!best || e > best.e1rm) best = { e1rm: e, kg: s.kg, reps: s.reps };
      });
      if (best) (out[ex.name] = out[ex.name] || []).push(Object.assign({ date: w.date }, best));
    }));
    return out;
  },
  // Compare best lift in the last 28 days with the best in the 8 weeks before that.
  strengthProgress() {
    const today = U.today(), recentFrom = U.addDays(today, -27), oldFrom = U.addDays(today, -83);
    const all = D.strength(oldFrom, today), res = [];
    Object.keys(all).forEach(name => {
      const recent = all[name].filter(x => x.date >= recentFrom), old = all[name].filter(x => x.date < recentFrom);
      if (!recent.length || !old.length) return;
      const r = recent.reduce((a, b) => b.e1rm > a.e1rm ? b : a), o = old.reduce((a, b) => b.e1rm > a.e1rm ? b : a);
      res.push({ name, recent: r, old: o, change: (r.e1rm - o.e1rm) / o.e1rm * 100, sessions: all[name].length });
    });
    return res.sort((a, b) => b.sessions - a.sessions);
  },
  // Averages for a 7-day window ending on `end` (inclusive).
  week(end) {
    const days = U.days(7, end), g = k => U.avg(days.map(d => (D.garmin(d) || {})[k]).filter(U.num));
    const intakes = days.map(D.intake).filter(Boolean);
    const sets = U.sum(Object.values(D.muscleSets(days[0], end)));
    return {
      eaten: U.avg(intakes.map(i => i.kcal)), burned: U.avg(days.map(d => (D.burn(d) || {}).kcal).filter(U.num)),
      balance: U.avg(days.map(D.balance).filter(U.num)), protein: U.avg(intakes.map(i => i.protein)), logged: intakes.length,
      steps: g("steps"), sleep: g("sleep_seconds"), hrv: g("hrv"), rhr: g("resting_hr"), bb: g("body_battery_high"), stress: g("stress_avg"),
      sessions: D.workouts(days[0], end).length, sets, drinks: days.filter(d => D.alcohol(d) > 0).length,
    };
  },
  // Garmin strength activity recorded for the same session as a Hevy workout (same day, starts within 90 min).
  isStrength: a => /strength|weight|gym|hiit|indoor_cardio/i.test((a.type || "") + " " + (a.name || "")),
  garminFor(w) {
    if (!w || !w.start) return null;
    const ws = new Date(w.start).getTime();
    let best = null, gap = 90 * 60000;
    Store.all("garmin_activity").forEach(a => {
      if (!a.start || !D.isStrength(a) || Math.abs(new Date(a.start).getTime() - ws) > 24 * 3600000) return;
      const g = Math.abs(new Date(a.start).getTime() - ws);
      if (g <= gap) { gap = g; best = a; }
    });
    return best;
  },
  linkedGarminIds(from, to) { return new Set(D.workouts(from, to).map(D.garminFor).filter(Boolean).map(a => a.id)); },
  series(dates, fn) { return dates.map(d => { const v = fn(d); return U.num(v) ? v : null; }); },
};

const Insights = (() => {
  function build() {
    const out = [];
    const add = (level, area, title, text) => out.push({ level, area, title, text });
    const today = U.today(), yday = U.addDays(today, -1);
    const d7 = U.days(7, yday), d14 = U.days(14, yday), d28 = U.days(28, yday);
    const g = k => d => { const r = D.garmin(d); return r ? r[k] : null; };
    const a7 = k => U.avg(D.series(d7, g(k))), a28 = k => U.avg(D.series(d28, g(k)));
    const p = D.profile();

    // ---- Energy balance ----
    const balDays = d14.map(d => D.balance(d)).filter(U.num);
    if (balDays.length >= 3) {
      const avgBal = U.avg(balDays), perWeek = avgBal * 7 / 7700;
      const word = avgBal < 0 ? "deficit" : "surplus";
      let level = "info", tail = "";
      if (p.goal === "lose") { level = avgBal < -100 ? "good" : "warn"; tail = avgBal < -100 ? " That fits your fat-loss goal." : " To lose fat you need a consistent deficit - trim portions or add activity."; if (avgBal < -900) { level = "warn"; tail = " That is an aggressive deficit; it risks muscle loss and poor recovery. Consider eating a little more."; } }
      if (p.goal === "gain") { level = avgBal > 100 ? "good" : "warn"; tail = avgBal > 100 ? " That supports muscle gain." : " To gain muscle you need a small surplus (about +250 to +400 kcal)."; }
      if (p.goal === "maintain") { level = Math.abs(avgBal) < 250 ? "good" : "warn"; tail = Math.abs(avgBal) < 250 ? " You are close to maintenance." : " You are drifting away from maintenance."; }
      add(level, "Calories", `Average daily ${word}: ${U.r(Math.abs(avgBal))} kcal`,
        `Over ${balDays.length} logged days in the last two weeks you ate ${U.r(Math.abs(avgBal))} kcal ${avgBal < 0 ? "less" : "more"} than you burned per day. At this pace that is about ${U.r(Math.abs(perWeek), 2)} kg ${perWeek < 0 ? "lost" : "gained"} per week.${tail}`);

      // Compare with what the scale says
      const w = Store.all("weight").filter(r => r.date >= U.addDays(today, -28) && U.num(r.kg));
      if (w.length >= 4 && U.diffDays(w[0].date, w[w.length - 1].date) >= 10) {
        const s = U.slope(w.map(r => [U.diffDays(w[0].date, r.date), r.kg])) * 7;
        if (Math.abs(s - perWeek) > 0.35) {
          add("warn", "Calories", "Scale and food log disagree",
            `Your weight is changing by about ${s > 0 ? "+" : ""}${U.r(s, 2)} kg/week, but your logged calories predict ${perWeek > 0 ? "+" : ""}${U.r(perWeek, 2)} kg/week. ${s > perWeek ? "You are probably under-logging food (oil, ghee, snacks and chai add up) or Garmin is over-estimating burn." : "You may be over-estimating portions, or water weight is shifting."}`);
        } else {
          add("good", "Calories", "Scale matches your food log", `Weight trend (${s > 0 ? "+" : ""}${U.r(s, 2)} kg/week) lines up with your logged calorie balance - your logging looks accurate.`);
        }
      }
    } else {
      add("info", "Calories", "Log food to unlock calorie analysis", "Log everything you eat for at least 3 days and the app will work out your true deficit or surplus against Garmin's calories burned.");
    }

    // ---- Protein & fibre ----
    const intakes = d7.map(d => D.intake(d)).filter(Boolean);
    if (intakes.length >= 3) {
      const prot = U.avg(intakes.map(i => i.protein)), target = D.proteinTarget();
      if (target) {
        if (prot < target * 0.8) add("warn", "Nutrition", `Protein is low: ${U.r(prot)} g/day`, `Your target is about ${target} g/day (${D.proteinBasis()}). You are ${U.r(target - prot)} g short on average. Easy North-Indian fixes: an extra katori of dal or curd, paneer/soya chunks, eggs, roasted chana, or a whey scoop.`);
        else add("good", "Nutrition", `Protein on track: ${U.r(prot)} g/day`, `Close to your ${target} g/day target, which supports muscle while ${p.goal === "lose" ? "losing fat" : "training"}.`);
      }
      const fib = U.avg(intakes.map(i => i.fiber));
      if (fib < 22) add("warn", "Nutrition", `Fibre is low: ${U.r(fib)} g/day`, "Aim for 25-30 g. Add salad, sabzi, whole fruit, dal with skin, or swap some rice for roti.");
      const sug = U.avg(intakes.map(i => i.sugar)), sLim = D.sugarLimit();
      const sweetDays = intakes.filter(i => i.sugar > sLim).length;
      if (sug > sLim) add("warn", "Nutrition", `Sugar is high: ${U.r(sug)} g/day`, `Above your ${sLim} g/day limit on ${sweetDays} of ${intakes.length} logged days. The usual North-Indian sources are sugar in chai, sweets/mithai, sweet lassi, juices and soft drinks. Milk and fruit sugar counts here too, so cut added sugar first.`);
      else add("good", "Nutrition", `Sugar under control: ${U.r(sug)} g/day`, `Within your ${sLim} g/day limit (this includes natural sugar from milk and fruit).`);
      const fatPct = U.avg(intakes.map(i => i.kcal ? i.fat * 9 / i.kcal * 100 : null));
      if (fatPct > 40) add("warn", "Nutrition", `${U.r(fatPct)}% of calories come from fat`, "That is on the high side - usually from ghee, oil, paneer gravies and fried snacks. Cutting cooking fat is the easiest calorie saving.");
    }

    // ---- Strength training ----
    const t7 = U.addDays(today, -6), t14 = U.addDays(today, -13), ws7 = D.workouts(t7, today), ws14 = D.workouts(t14, today);
    if (Store.all("hevy_workout").length) {
      const m7 = D.muscleSets(t7, today), m14 = D.muscleSets(t14, today);
      const missed = Muscles.groups.filter(x => m14[x] === 0 && x !== "Forearms");
      const low = Muscles.groups.filter(x => m7[x] > 0 && m7[x] < 6 && !["Forearms", "Calves", "Core"].includes(x));
      const top = Muscles.groups.filter(x => m7[x] > 0).sort((a, b) => m7[b] - m7[a]).slice(0, 3);
      if (!ws7.length) add("warn", "Training", "No strength workout in the last 7 days", "Two to four sessions a week maintain and build muscle - especially important when in a calorie deficit.");
      else add(ws7.length >= 3 ? "good" : "info", "Training", `${ws7.length} strength session${ws7.length > 1 ? "s" : ""} this week`, top.length ? `Most trained: ${top.map(x => `${x} (${U.r(m7[x])} sets)`).join(", ")}.` : "");
      if (missed.length && ws14.length) add("warn", "Training", `Not trained in 2 weeks: ${missed.join(", ")}`, "Each muscle group grows best with roughly 10-20 hard sets a week. Add an exercise or two for these.");
      if (low.length) add("info", "Training", `Low volume this week: ${low.join(", ")}`, "These got fewer than 6 sets in the last 7 days. Around 10+ weekly sets per muscle is a good target.");
      const push = m7.Chest + m7.Shoulders + m7.Triceps, pull = m7.Back + m7.Biceps;
      if (push > 8 && pull < push * 0.6) add("warn", "Training", "Push work outweighs pull work", `About ${U.r(push)} push sets vs ${U.r(pull)} pull sets this week. Add rows / pulldowns to protect your shoulders and posture.`);
      const legs = m7.Quads + m7.Hamstrings + m7.Glutes, upper = push + pull;
      if (upper > 20 && legs < upper * 0.3) add("warn", "Training", "Legs are being skipped", `Only ${U.r(legs)} lower-body sets vs ${U.r(upper)} upper-body sets this week.`);
    }

    // ---- Sleep ----
    const sl7 = a7("sleep_seconds");
    if (sl7) {
      const h = sl7 / 3600, sc = a7("sleep_score");
      if (h < 6.5) add("warn", "Sleep", `Sleep is short: ${U.hm(sl7)} average`, "Under 7 hours hurts recovery, hunger control and HRV. Try a fixed bedtime and no screens 30 minutes before.");
      else if (h < 7) add("info", "Sleep", `Sleep is slightly short: ${U.hm(sl7)} average`, "Another 20-30 minutes would help recovery.");
      else add("good", "Sleep", `Sleep is solid: ${U.hm(sl7)} average`, sc ? `Average sleep score ${U.r(sc)}.` : "");
      const deep = a7("deep_seconds");
      if (deep && deep / sl7 < 0.12) add("info", "Sleep", "Deep sleep is on the low side", `Deep sleep is ${U.r(deep / sl7 * 100)}% of your sleep (15-20% is typical). Late meals, alcohol and late training reduce it.`);
    }

    // ---- Recovery: HRV, resting HR, body battery, stress ----
    const hrv7 = a7("hrv"), hrv28 = a28("hrv");
    if (hrv7 && hrv28 && d28.filter(d => U.num(g("hrv")(d))).length >= 10) {
      const ch = (hrv7 - hrv28) / hrv28 * 100;
      if (ch < -8) add("warn", "Recovery", `HRV is down ${U.r(-ch)}% vs your 4-week normal`, `7-day average ${U.r(hrv7)} ms vs ${U.r(hrv28)} ms. This usually means accumulated fatigue, poor sleep, stress, alcohol or oncoming illness. Ease training for a couple of days.`);
      else if (ch > 6) add("good", "Recovery", `HRV is up ${U.r(ch)}%`, `7-day average ${U.r(hrv7)} ms vs ${U.r(hrv28)} ms - you are recovering well.`);
      else add("good", "Recovery", "HRV is stable", `7-day average ${U.r(hrv7)} ms, in line with your 4-week normal (${U.r(hrv28)} ms).`);
    }
    const rhr7 = a7("resting_hr"), rhr28 = a28("resting_hr");
    if (rhr7 && rhr28) {
      if (rhr7 - rhr28 >= 3) add("warn", "Recovery", `Resting heart rate is up ${U.r(rhr7 - rhr28)} bpm`, `${U.r(rhr7)} bpm this week vs ${U.r(rhr28)} bpm normally. A raised resting HR often signals fatigue, dehydration, stress or illness.`);
      else if (rhr28 - rhr7 >= 2) add("good", "Recovery", `Resting heart rate is down ${U.r(rhr28 - rhr7)} bpm`, "A falling resting HR is a sign of improving fitness.");
    }
    const bb7 = a7("body_battery_high");
    if (bb7) {
      if (bb7 < 60) add("warn", "Recovery", `Body Battery only recharges to ${U.r(bb7)}`, "You are starting most days under-recovered. Prioritise sleep and take an easier day.");
      else if (bb7 >= 80) add("good", "Recovery", `Body Battery recharges to ${U.r(bb7)} on average`, "You are recovering well overnight.");
    }
    const st7 = a7("stress_avg");
    if (st7 && st7 > 40) add("warn", "Recovery", `Average stress is high: ${U.r(st7)}`, "Garmin stress above ~40 across the day means little rest time. Short walks, breathing breaks and earlier dinners help.");

    const rd = D.garmin(today) || D.garmin(yday);
    if (rd && U.num(rd.training_readiness)) {
      if (rd.training_readiness < 40) add("warn", "Recovery", `Training readiness is low (${rd.training_readiness})`, "Keep today light - a walk, mobility or an easy session.");
      else if (rd.training_readiness >= 75) add("good", "Recovery", `Training readiness is high (${rd.training_readiness})`, "A good day for a hard session.");
    }
    if (rd && rd.training_status) {
      const s = String(rd.training_status).toLowerCase();
      if (/overreach|strain/.test(s)) add("warn", "Training", "Garmin training status: " + rd.training_status, "Your load is higher than your body is absorbing. Schedule recovery.");
      else if (/detrain|unproductive/.test(s)) add("warn", "Training", "Garmin training status: " + rd.training_status, s.includes("detrain") ? "Training load has dropped - fitness is starting to decline." : "Load is fine but fitness is not improving - usually a recovery (sleep / food) problem.");
      else if (/productive|peaking/.test(s)) add("good", "Training", "Garmin training status: " + rd.training_status, "Your training is improving your fitness.");
    }

    // ---- Steps ----
    const steps7 = a7("steps");
    if (steps7) {
      const goal = D.stepGoal(yday), hit = d7.filter(d => (g("steps")(d) || 0) >= goal).length;
      add(steps7 >= goal ? "good" : steps7 >= goal * 0.75 ? "info" : "warn", "Activity", `${U.r(steps7)} steps/day average`, `Goal ${U.r(goal)} - reached on ${hit} of the last 7 days.${steps7 < goal ? ` A ${U.r((goal - steps7) / 110)} minute walk a day closes the gap.` : ""}`);
    }

    // ---- Patterns between metrics ----
    const pairs = U.days(60, yday).map(d => { const a = D.garmin(d); return a && U.num(a.sleep_seconds) && U.num(a.body_battery_high) ? [a.sleep_seconds / 3600, a.body_battery_high] : null; }).filter(Boolean);
    if (pairs.length >= 12) {
      const c = U.corr(pairs.map(x => x[0]), pairs.map(x => x[1]));
      const good = pairs.filter(x => x[0] >= 7).map(x => x[1]), bad = pairs.filter(x => x[0] < 6.5).map(x => x[1]);
      if (c > 0.35 && good.length >= 3 && bad.length >= 3) add("info", "Patterns", "Sleep drives your Body Battery", `On nights with 7+ hours you wake up at ${U.r(U.avg(good))}; after under 6.5 hours only ${U.r(U.avg(bad))}.`);
    }
    const eatAfter = { short: [], ok: [] };
    U.days(45, yday).forEach(d => { const a = D.garmin(d), i = D.intake(d); if (a && U.num(a.sleep_seconds) && i) (a.sleep_seconds < 6.5 * 3600 ? eatAfter.short : eatAfter.ok).push(i.kcal); });
    if (eatAfter.short.length >= 3 && eatAfter.ok.length >= 3) {
      const diff = U.avg(eatAfter.short) - U.avg(eatAfter.ok);
      if (diff > 120) add("info", "Patterns", `You eat ~${U.r(diff)} kcal more after short sleep`, "On days following under 6.5 hours of sleep your intake is noticeably higher. Protecting sleep is one of the easiest ways to hold a deficit.");
    }
    const hard = U.days(45, yday).filter(d => D.workouts(d, d).length);
    if (hard.length >= 5) {
      const nextHrv = hard.map(d => g("hrv")(U.addDays(d, 1))).filter(U.num), base = a28("hrv");
      if (nextHrv.length >= 5 && base && U.avg(nextHrv) < base * 0.93) add("info", "Patterns", "Strength days dent next-morning HRV", `HRV averages ${U.r(U.avg(nextHrv))} ms the night after lifting vs ${U.r(base)} ms normally. Avoid stacking hard days back to back.`);
    }

    // ---- Alcohol vs next night's recovery (Garmin's data for day d+1 = the night after drinking on d) ----
    const logged = U.days(60, yday).filter(d => Store.on("food", d).length);
    const drinkDays = logged.filter(d => D.alcohol(d) > 0), dryDays = logged.filter(d => !D.alcohol(d));
    if (drinkDays.length >= 3) {
      const next = (list, k) => U.avg(list.map(d => (D.garmin(U.addDays(d, 1)) || {})[k]).filter(U.num));
      const kcal = U.avg(drinkDays.map(D.alcohol));
      const share = `Alcohol logged on ${drinkDays.length} of ${logged.length} food-logged days (about ${U.r(kcal)} kcal each time).`;
      const hD = next(drinkDays, "hrv"), sD = next(drinkDays, "sleep_seconds"), bD = next(drinkDays, "body_battery_high");
      if (dryDays.length >= 3) {
        const hN = next(dryDays, "hrv"), sN = next(dryDays, "sleep_seconds"), bN = next(dryDays, "body_battery_high");
        const worse = (hD && hN && hD < hN * 0.95) || (bD && bN && bD < bN - 5);
        add(worse ? "warn" : "info", "Patterns", worse ? "Drinking nights cost you recovery" : "Alcohol vs recovery",
          `${share} After drinking: HRV ${U.r(hD)} ms, Body Battery ${U.r(bD)}, sleep ${U.hm(sD)}. After alcohol-free days: HRV ${U.r(hN)} ms, Body Battery ${U.r(bN)}, sleep ${U.hm(sN)}.`);
      } else {
        const base = (k, n) => U.avg(U.days(n, yday).map(d => (D.garmin(d) || {})[k]).filter(U.num));
        add(drinkDays.length / logged.length >= 0.7 ? "warn" : "info", "Patterns", `Alcohol on ${drinkDays.length} of ${logged.length} logged days`,
          `${share} The nights after: HRV ${U.r(hD)} ms and Body Battery ${U.r(bD)}, vs your 60-day averages of ${U.r(base("hrv", 60))} ms and ${U.r(base("body_battery_high", 60))}. Log a few alcohol-free days and the app will show the direct difference.`);
      }
    }

    // ---- Strength progress (Hevy) ----
    const prog = D.strengthProgress().slice(0, 12);
    if (prog.length >= 3) {
      const up = prog.filter(p => p.change >= 2.5), down = prog.filter(p => p.change <= -5);
      const lvl = up.length >= down.length * 2 ? "good" : down.length > up.length ? "warn" : "info";
      add(lvl, "Training", `Stronger on ${up.length} of ${prog.length} main lifts`,
        (up.length ? `Up: ${up.slice(0, 4).map(p => `${p.name} +${U.r(p.change)}%`).join(", ")}. ` : "") +
        (down.length ? `Down: ${down.slice(0, 3).map(p => `${p.name} ${U.r(p.change)}%`).join(", ")}${p.goal === "lose" ? " - some loss is normal in a deficit; keep protein high." : "."}` : "No meaningful drops.") +
        " Compares your best set in the last 4 weeks with the 8 weeks before.");
    }

    // ---- Body ----
    const wAll = Store.all("weight").filter(r => U.num(r.kg));
    if (wAll.length >= 2) {
      const last = wAll[wAll.length - 1], ref = wAll.filter(r => r.date <= U.addDays(last.date, -25)).pop() || wAll[0];
      const diff = last.kg - ref.kg, days = U.diffDays(ref.date, last.date);
      if (days >= 7) {
        const ok = (p.goal === "lose" && diff < -0.2) || (p.goal === "gain" && diff > 0.2) || (p.goal === "maintain" && Math.abs(diff) < 1);
        add(ok ? "good" : "info", "Body", `Weight ${diff > 0 ? "up" : "down"} ${U.r(Math.abs(diff), 1)} kg in ${days} days`, `${U.r(ref.kg, 1)} kg → ${U.r(last.kg, 1)} kg.` + (p.goal === "lose" && diff / days * 7 < -1 ? " That is faster than 1 kg/week - slow down to protect muscle." : ""));
      }
      if (p.height_cm) {
        const bmi = last.kg / (p.height_cm / 100) ** 2;
        add(bmi < 23 ? "good" : bmi < 25 ? "info" : "warn", "Body", `BMI ${U.r(bmi, 1)}`, bmi < 18.5 ? "Underweight range." : bmi < 23 ? "Healthy range for Indian adults (18.5-22.9)." : bmi < 25 ? "Overweight range by Indian guidelines (23-24.9)." : "Obese range by Indian guidelines (25+). Note BMI over-reads for muscular people - waist is a better guide.");
      }
    } else add("info", "Body", "Log your weight", "Weigh yourself 2-3 mornings a week so the app can check your calorie balance against reality.");

    const ms = Store.all("measure");
    const lastWaist = ms.filter(m => U.num(m.waist)).pop();
    if (lastWaist) {
      if (p.height_cm) {
        const r = lastWaist.waist / p.height_cm;
        add(r < 0.5 ? "good" : "warn", "Body", `Waist-to-height ratio ${U.r(r, 2)}`, r < 0.5 ? "Under 0.5 - low risk zone." : "Above 0.5 is linked to higher metabolic risk (important for blood sugar). Waist is the number to bring down.");
      }
      const first = ms.filter(m => U.num(m.waist))[0];
      if (first !== lastWaist) {
        const dw = lastWaist.waist - first.waist;
        const w0 = D.weightOn(first.date), w1 = D.weightOn(lastWaist.date);
        let extra = "";
        if (w0 && w1 && dw < -0.5 && w1 - w0 > -0.5) extra = " Waist is shrinking while weight holds - a sign of losing fat and gaining muscle.";
        add(dw <= 0 ? "good" : "warn", "Body", `Waist ${dw <= 0 ? "down" : "up"} ${U.r(Math.abs(dw), 1)} cm since ${U.short(first.date)}`, `${first.waist} → ${lastWaist.waist} cm.${extra}`);
      }
      const arms = ms.filter(m => U.num(m.biceps));
      if (arms.length >= 2) { const da = arms[arms.length - 1].biceps - arms[0].biceps; if (Math.abs(da) >= 0.5) add(da > 0 ? "good" : "info", "Body", `Biceps ${da > 0 ? "up" : "down"} ${U.r(Math.abs(da), 1)} cm`, `${arms[0].biceps} → ${arms[arms.length - 1].biceps} cm since ${U.short(arms[0].date)}.`); }
    }

    // ---- Medical ----
    const med = Store.all("medical");
    const latest = kind => med.filter(m => m.kind === kind && U.num(m.value)).pop();
    const a1c = latest("HbA1c");
    if (a1c) {
      const v = a1c.value, prev = med.filter(m => m.kind === "HbA1c" && U.num(m.value) && m !== a1c).pop();
      const trend = prev ? ` Previous: ${prev.value}% (${U.short(prev.date)}) - ${v < prev.value ? "improving" : v > prev.value ? "rising" : "unchanged"}.` : "";
      const age = U.diffDays(a1c.date, today);
      add(v < 5.7 ? "good" : "warn", "Medical", `HbA1c ${v}% (${U.short(a1c.date)})`, (v < 5.7 ? "Normal range (below 5.7%)." : v < 6.5 ? "Pre-diabetes range (5.7-6.4%). Fat loss around the waist, strength training, walking after meals and fewer refined carbs (rice, maida, sugar) all bring this down." : "Diabetes range (6.5%+). Please follow up with your doctor.") + trend + (age > 120 ? " It has been over 4 months - worth re-testing." : ""));
    }
    const fbs = latest("Fasting blood sugar");
    if (fbs) add(fbs.value < 100 ? "good" : "warn", "Medical", `Fasting sugar ${fbs.value} mg/dL (${U.short(fbs.date)})`, fbs.value < 100 ? "Normal (below 100)." : fbs.value < 126 ? "Impaired fasting glucose range (100-125)." : "Diabetes range (126+). Please follow up with your doctor.");
    const bp = med.filter(m => m.kind === "Blood pressure" && U.num(m.value) && U.num(m.value2)).pop();
    if (bp) add(bp.value < 130 && bp.value2 < 85 ? "good" : "warn", "Medical", `Blood pressure ${bp.value}/${bp.value2} (${U.short(bp.date)})`, bp.value < 120 && bp.value2 < 80 ? "Normal." : bp.value < 130 && bp.value2 < 85 ? "High-normal." : "Elevated - re-check on a calm morning and discuss with your doctor if it stays up.");
    const ldl = latest("LDL cholesterol");
    if (ldl && ldl.value >= 130) add("warn", "Medical", `LDL cholesterol ${ldl.value} mg/dL`, "Above 130 is borderline-high. Fibre, less fried food / ghee, and regular cardio help.");
    const vitd = latest("Vitamin D");
    if (vitd && vitd.value < 30) add("warn", "Medical", `Vitamin D ${vitd.value} ng/mL`, vitd.value < 20 ? "Deficient (below 20) - very common in India; ask your doctor about supplementation." : "Insufficient (20-30).");
    med.filter(m => m.kind === "Injury" && m.status !== "resolved").forEach(m =>
      add("warn", "Medical", "Active injury: " + (m.notes || "injury"), `Logged ${U.short(m.date)}. Train around it and mark it resolved in Body → Medical when healed.`));

    const order = { warn: 0, info: 1, good: 2 };
    return out.sort((a, b) => order[a.level] - order[b.level]);
  }
  return { build };
})();
