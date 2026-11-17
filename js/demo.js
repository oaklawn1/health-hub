// Sample data so you can explore the app before connecting Garmin / Hevy.
// Every demo record is tagged demo:true and can be removed in one tap from Settings.
const Demo = (() => {
  let seed = 42;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
  const rb = (a, b) => a + rnd() * (b - a), ri = (a, b) => Math.round(rb(a, b));

  const plans = [
    ["Push day", [["Bench Press (Barbell)", "chest", ["triceps", "shoulders"], 80], ["Incline Bench Press (Dumbbell)", "chest", ["shoulders"], 26], ["Overhead Press (Dumbbell)", "shoulders", ["triceps"], 20], ["Lateral Raise (Dumbbell)", "shoulders", [], 9], ["Triceps Pushdown", "triceps", [], 32]]],
    ["Pull day", [["Lat Pulldown (Cable)", "lats", ["biceps"], 60], ["Seated Cable Row", "upper_back", ["biceps"], 55], ["Bicep Curl (Dumbbell)", "biceps", ["forearms"], 14], ["Face Pull", "shoulders", [], 25]]],
    ["Upper body", [["Bench Press (Barbell)", "chest", ["triceps", "shoulders"], 82], ["Bent Over Row (Barbell)", "upper_back", ["biceps"], 60], ["Shoulder Press (Machine)", "shoulders", ["triceps"], 40], ["Hammer Curl (Dumbbell)", "biceps", ["forearms"], 14], ["Crunch (Cable)", "abdominals", [], 30]]],
  ];
  const meals = [
    ["Breakfast", [["Aloo paratha", 2], ["Curd / Dahi", 1], ["Chai (milk + sugar)", 1]], [["Poha", 1], ["Egg (boiled)", 2], ["Chai (milk + sugar)", 1]], [["Besan chilla", 2], ["Chai (milk, no sugar)", 1], ["Banana", 1]]],
    ["Lunch", [["Roti / Chapati (plain)", 3], ["Dal tadka (arhar / toor)", 1], ["Aloo gobi", 1], ["Salad (cucumber, tomato, onion)", 1]], [["Rajma chawal", 1], ["Curd / Dahi", 1]], [["Roti with ghee", 2], ["Chole / Chana masala", 1], ["Rice (steamed, white)", 1]]],
    ["Snacks", [["Chai (milk + sugar)", 1], ["Biscuits (Marie)", 1]], [["Samosa", 1], ["Chai (milk + sugar)", 1]], [["Roasted chana", 1], ["Apple", 1]], [["Whey protein", 1], ["Banana", 1]]],
    ["Dinner", [["Roti / Chapati (plain)", 2], ["Palak paneer", 1], ["Moong dal", 1]], [["Roti / Chapati (plain)", 3], ["Chicken curry", 1], ["Salad (cucumber, tomato, onion)", 1]], [["Khichdi (dal + rice)", 2], ["Curd / Dahi", 1], ["Papad (roasted)", 1]], [["Butter naan", 2], ["Dal makhani", 1], ["Paneer butter masala", 1]]],
  ];

  async function load() {
    seed = 42;
    const days = U.days(45), rec = { garmin_daily: [], garmin_activity: [], hevy_workout: [], food: [], weight: [], measure: [], medical: [] };
    let weight = 82.4, plan = 0;
    days.forEach((date, i) => {
      const dow = U.parse(date).getDay(), lift = [1, 3, 5].includes(dow) && rnd() > 0.12, walk = rnd() > 0.45;
      const sleep = rb(5.4, 8.1) * 3600, steps = ri(4200, 12500) + (walk ? 2500 : 0);
      const active = Math.round(steps * 0.04 + (lift ? rb(230, 330) : 0) + rb(60, 180));
      const hrv = Math.round(44 + (sleep / 3600 - 6.8) * 5 + rb(-5, 5) - (lift ? 2 : 0));
      const bb = Math.max(35, Math.min(100, Math.round(52 + (sleep / 3600 - 6) * 18 + rb(-6, 6))));
      const today = i === days.length - 1;
      rec.garmin_daily.push({
        id: date, date, demo: true, steps: today ? Math.round(steps * 0.55) : steps, step_goal: 9000, distance_m: Math.round(steps * 0.74),
        calories_bmr: 1760, calories_active: today ? Math.round(active * 0.5) : active, calories_total: today ? Math.round(1760 * 0.6 + active * 0.5) : 1760 + active,
        resting_hr: ri(54, 60) + (sleep < 6.2 * 3600 ? 3 : 0), min_hr: ri(47, 52), max_hr: lift ? ri(148, 168) : ri(105, 135),
        stress_avg: Math.round(rb(24, 40) + (sleep < 6.2 * 3600 ? 9 : 0)), stress_max: ri(70, 96),
        body_battery_high: bb, body_battery_low: ri(8, 28), body_battery_now: ri(25, 70),
        sleep_seconds: Math.round(sleep), deep_seconds: Math.round(sleep * rb(0.13, 0.21)), rem_seconds: Math.round(sleep * rb(0.18, 0.24)),
        light_seconds: Math.round(sleep * 0.58), awake_seconds: ri(600, 2400), sleep_score: Math.max(40, Math.min(96, Math.round(40 + (sleep / 3600 - 5) * 16 + rb(-5, 5)))),
        hrv, hrv_weekly: 45, hrv_status: hrv < 40 ? "UNBALANCED" : "BALANCED",
        training_readiness: Math.max(15, Math.min(98, Math.round(bb * 0.8 + rb(-8, 10) - (lift ? 6 : 0)))),
        training_status: i > 30 ? "Productive" : "Maintaining", vo2max: 44, intensity_minutes: lift ? ri(25, 55) : ri(0, 20),
      });
      if (lift) {
        const [title, exs] = plans[plan++ % plans.length], start = date + "T07:" + String(ri(5, 40)).padStart(2, "0") + ":00";
        rec.garmin_activity.push({ id: "demo-a-" + date, date, demo: true, name: "Strength", type: "strength_training", start, duration_s: ri(2900, 3900), calories: ri(240, 340), avg_hr: ri(102, 118), max_hr: ri(145, 165) });
        rec.hevy_workout.push({
          id: "demo-w-" + date, date, demo: true, title, start, duration_min: ri(48, 65),
          exercises: exs.map(([name, muscle, secondary, kg]) => ({ name, muscle, secondary, sets: [0, 1, 2, 3].slice(0, ri(3, 4)).map(n => ({ type: "normal", kg: Math.round(kg * (1 + i / 400)), reps: ri(7, 12) - n })) })),
        });
      }
      if (walk) rec.garmin_activity.push({ id: "demo-c-" + date, date, demo: true, name: "Evening Walk", type: "walking", start: date + "T19:10:00", duration_s: ri(1500, 2700), distance_m: ri(2200, 4200), calories: ri(110, 210), avg_hr: ri(96, 112), max_hr: ri(118, 132) });
      if (!today || true) meals.forEach(([meal, ...opts]) => {
        if (today && (meal === "Dinner" || meal === "Snacks")) return;
        if (rnd() < 0.04) return;
        opts[ri(0, opts.length - 1)].forEach(([name, qty]) => {
          const f = Foods.search(name).find(x => x.name === name); if (!f) return;
          rec.food.push({ id: "demo-f-" + date + "-" + rec.food.length, date, demo: true, meal, name, qty, unit: f.unit, kcal: Math.round(f.kcal * qty), protein: +(f.protein * qty).toFixed(1), carbs: +(f.carbs * qty).toFixed(1), fat: +(f.fat * qty).toFixed(1), fiber: +(f.fiber * qty).toFixed(1) });
        });
      });
      weight += rb(-0.14, 0.09);
      if (i % 3 === 0 || today) rec.weight.push({ id: date, date, demo: true, kg: +weight.toFixed(1) });
      if (i % 14 === 2) rec.measure.push({ id: date, date, demo: true, waist: +(94 - i * 0.05).toFixed(1), chest: 102, biceps: +(35.5 + i * 0.012).toFixed(1), hips: 100, thigh: 57, calf: 37.5 });
    });
    rec.medical.push({ id: "demo-m1", date: days[2], demo: true, kind: "HbA1c", value: 5.9, unit: "%" });
    rec.medical.push({ id: "demo-m2", date: days[40], demo: true, kind: "HbA1c", value: 5.7, unit: "%" });
    rec.medical.push({ id: "demo-m3", date: days[40], demo: true, kind: "Fasting blood sugar", value: 98, unit: "mg/dL" });
    rec.medical.push({ id: "demo-m4", date: days[30], demo: true, kind: "Injury", notes: "Left knee pain on squats", status: "active" });
    for (const c of Object.keys(rec)) await Store.putMany(c, rec[c]);
    if (!Store.get("profile", "me")) await Store.put("profile", { id: "me", demo: true, sex: "male", age: 36, height_cm: 175, goal: "lose", balance_target: -400, protein_per_kg: 1.6 });
  }
  const clear = () => Store.removeWhere(r => r.demo === true);
  const present = () => ["garmin_daily", "food", "weight", "hevy_workout"].some(c => Store.all(c).some(r => r.demo));
  return { load, clear, present };
})();
