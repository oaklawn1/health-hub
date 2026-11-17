// Muscle-group helpers for strength workouts (Hevy).
const Muscles = (() => {
  const groups = ["Chest", "Back", "Shoulders", "Biceps", "Triceps", "Forearms", "Core", "Quads", "Hamstrings", "Glutes", "Calves"];

  // Hevy API muscle names -> our display groups
  const hevyMap = {
    chest: "Chest", lats: "Back", upper_back: "Back", lower_back: "Back", traps: "Back",
    shoulders: "Shoulders", biceps: "Biceps", triceps: "Triceps", forearms: "Forearms",
    abdominals: "Core", quadriceps: "Quads", hamstrings: "Hamstrings", glutes: "Glutes",
    abductors: "Glutes", adductors: "Quads", calves: "Calves", neck: "Shoulders",
    cardio: "Cardio", full_body: "Full body", other: "Other",
  };
  const norm = g => {
    if (!g) return "Other";
    if (groups.includes(g) || g === "Cardio" || g === "Full body" || g === "Other") return g;
    return hevyMap[String(g).toLowerCase()] || "Other";
  };

  // Used for Hevy CSV exports, which carry exercise names but no muscle info. First match wins.
  const rules = [
    [/treadmill|running|cycling|bike|elliptical|rowing machine|^walk(ing)?$|stair|jump rope|skipping|burpee|high knees|jumping jack|sprint|battle rope/, "Cardio", []],
    [/calf|calves/, "Calves", []],
    [/hanging|crunch|plank|sit.?up|leg raise|knee raise|russian twist|ab wheel|\babs?\b|core|mountain climber|wood ?chop|v.?up|dead bug|toe touch|pallof|flutter|bicycle/, "Core", []],
    [/leg extension/, "Quads", []],
    [/leg curl|hamstring|romanian|\brdl\b|stiff.?leg|good morning|nordic/, "Hamstrings", ["Glutes"]],
    [/hip thrust|kettlebell swing|glute|hip abduction|bridge|pull.?through/, "Glutes", ["Hamstrings"]],
    [/squat|leg press|lunge|step.?up|split|hip adduction|sissy|wall sit/, "Quads", ["Glutes"]],
    [/tricep|pushdown|push.?down|skull|close.?grip|kickback|jm press/, "Triceps", []],
    [/wrist|forearm|farmer|reverse curl|dead hang|gripper/, "Forearms", []],
    [/face pull|rear delt|reverse fly|reverse pec|upright row|lateral raise|front raise|shoulder|overhead press|military|arnold|\bohp\b|delt|landmine press/, "Shoulders", ["Triceps"]],
    [/shrug/, "Back", []],
    [/deadlift|rack pull/, "Back", ["Hamstrings", "Glutes"]],
    [/pull.?up|chin.?up|pulldown|pull.?down|\brow\b|rows|lat |pullover|back extension|hyperextension|superman/, "Back", ["Biceps"]],
    [/curl|bicep/, "Biceps", ["Forearms"]],
    [/bench|chest|push.?up|pec|fly|flye|dip|incline press|decline press|crossover/, "Chest", ["Triceps", "Shoulders"]],
  ];
  function guess(name) {
    const n = (name || "").toLowerCase();
    for (const [re, primary, secondary] of rules) if (re.test(n)) return { muscle: primary, secondary };
    return { muscle: "Other", secondary: [] };
  }

  return { groups, norm, guess };
})();
