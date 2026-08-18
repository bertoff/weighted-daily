import { useState, useEffect, useMemo } from "react";
import { ChevronLeft, ChevronRight, Flame, RotateCcw, Dumbbell } from "lucide-react";

if (!window.storage) {
  window.storage = {
    async get(key) {
      const value = localStorage.getItem(key);
      return value ? { value } : null;
    },
    async set(key, value) {
      localStorage.setItem(key, value);
      return true;
    },
  };
}

const BASELINE = { pull: 9, push: 27, squat: 35 };

const WEEK_CONFIG = {
  1: { pull: [6, 4], push: [6, 12], squat: [6, 15], band: [3, 15] },
  2: { pull: [6, 4], push: [6, 12], squat: [6, 15], band: [3, 15] },
  3: { pull: [6, 5], push: [6, 13], squat: [6, 16], band: [3, 16] },
  4: { pull: [6, 5], push: [6, 13], squat: [6, 16], band: [3, 16] },
  5: { pull: [6, 5], push: [6, 15], squat: [6, 19], band: [3, 18] },
  6: { pull: [6, 5], push: [6, 15], squat: [6, 19], band: [3, 18] },
  7: { pull: [6, 6], push: [6, 17], squat: [6, 21], band: [4, 18] },
  8: { pull: [6, 6], push: [6, 17], squat: [6, 21], band: [4, 18] },
  9: { pull: [5, 6], push: [5, 18], squat: [5, 22], band: [4, 18] },
  10: { pull: [5, 6], push: [5, 18], squat: [5, 22], band: [4, 18] },
  11: { pull: [5, 7], push: [5, 20], squat: [5, 24], band: [3, 18] },
};

const PHASES = [
  { label: "Phase 1: Foundation", weeks: [1, 2, 3, 4] },
  { label: "Phase 2: Overload", weeks: [5, 6, 7, 8] },
  { label: "Phase 3: Peak & Retest", weeks: [9, 10, 11, 12] },
];

function phaseForWeek(week) {
  return PHASES.find((p) => p.weeks.includes(week))?.label || "";
}

function buildProgram() {
  const days = [];
  for (let week = 1; week <= 12; week++) {
    for (let d = 1; d <= 7; d++) {
      const dayNum = (week - 1) * 7 + d;
      const phase = phaseForWeek(week);

      if (week === 12) {
        let entry;
        if (d <= 3) {
          entry = {
            day: dayNum, week, phase, type: "taper",
            pull: { sets: 3, reps: 5 }, push: { sets: 3, reps: 5 }, squat: { sets: 3, reps: 5 },
            band: null,
          };
        } else if (d <= 5) {
          entry = { day: dayNum, week, phase, type: "rest" };
        } else if (d === 6) {
          entry = { day: dayNum, week, phase, type: "retest" };
        } else {
          entry = { day: dayNum, week, phase, type: "rest" };
        }
        days.push(entry);
        continue;
      }

      if (d === 7) {
        days.push({ day: dayNum, week, phase, type: "rest" });
        continue;
      }

      const cfg = WEEK_CONFIG[week];
      const isBandDay = d % 2 === 1;
      days.push({
        day: dayNum, week, phase, type: "train",
        pull: { sets: cfg.pull[0], reps: cfg.pull[1] },
        push: { sets: cfg.push[0], reps: cfg.push[1] },
        squat: { sets: cfg.squat[0], reps: cfg.squat[1] },
        band: isBandDay ? { sets: cfg.band[0], reps: cfg.band[1] } : null,
      });
    }
  }
  return days;
}

const PROGRAM = buildProgram();

const PROGRAM_RULES = [
  "Every set is submaximal — stop 3-4 reps short of failure, always. This program only works if you stay fresh; if you're grinding, you're doing it wrong.",
  "If a set starts requiring real effort to finish, drop 1-2 reps rather than push through it.",
  "Train 6 days/week with 1 fixed rest day (pick one, e.g. Sunday, and keep it consistent).",
  "Band lateral raises only go on alternating training days (3x/week), not daily — shoulders need more recovery than the compound lifts do from GTG dosing.",
  "Between sets: ~90s for pull-ups/squats, ~75s for push-ups, ~45s for band raises (the tracker's timer defaults match this) — but these are a starting point, not fixed law.",
  "Reps/sets step up roughly every 2 weeks per the program table — don't freelance additional volume on top of what's scheduled.",
  "Deload happens automatically at week 12's taper (lighter sets, fewer days) — don't skip it even if you're feeling strong.",
  "The vest adds real daily stress to elbows, wrists, and knees that bodyweight GTG doesn't have. Ache that builds day over day — not just normal training fatigue — means take an unscheduled rest day or drop back to a lighter week's numbers.",
  "Joint soreness always overrides the schedule. The plan is a framework, your joints are the final authority.",
  "Week 12: 3 taper days → 2 full rest days → one all-out retest for max reps @10kg on each movement. Don't test tired, and don't test without the rest days first — that's where the real number comes from."
];

function isDayComplete(dayObj, prog) {
  if (!dayObj) return false;
  if (dayObj.type === "rest") return true;
  if (dayObj.type === "retest") return !!(prog && prog.retestDone);
  const p = prog || {};
  const checks = [["pull", dayObj.pull], ["push", dayObj.push], ["squat", dayObj.squat]];
  if (dayObj.band) checks.push(["band", dayObj.band]);
  return checks.every(([key, target]) => (p[key] || 0) >= target.sets);
}

function TallySets({ label, target, filled, onToggle }) {
  const circles = [];
  for (let i = 0; i < target.sets; i++) {
    circles.push(
      <button
        key={i}
        onClick={() => onToggle(i)}
        aria-label={`${label} set ${i + 1}`}
        style={{
          width: 30, height: 30, borderRadius: "50%",
          border: `2px solid ${i < filled ? "#8FA24C" : "#4A4832"}`,
          background: i < filled ? "#8FA24C" : "transparent",
          cursor: "pointer", flexShrink: 0,
        }}
      />
    );
  }
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
        <span style={{ fontFamily: "'Oswald', sans-serif", fontSize: 15, letterSpacing: 1, textTransform: "uppercase", color: "#EDEAE0" }}>
          {label}
        </span>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: "#9C978A" }}>
          {target.sets}×{target.reps}
        </span>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{circles}</div>
    </div>
  );
}

export default function VestTracker() {
  const [currentDay, setCurrentDay] = useState(1);
  const [progressAll, setProgressAll] = useState({});
  const [loading, setLoading] = useState(true);
  const [retestInputs, setRetestInputs] = useState({ pull: "", push: "", squat: "" });
  const [saveError, setSaveError] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const meta = await window.storage.get("meta");
        if (meta && meta.value) setCurrentDay(JSON.parse(meta.value).currentDay || 1);
      } catch (e) {}
      try {
        const prog = await window.storage.get("progress-all");
        if (prog && prog.value) setProgressAll(JSON.parse(prog.value));
      } catch (e) {}
      setLoading(false);
    }
    load();
  }, []);

  async function persistProgress(next) {
    setProgressAll(next);
    try {
      const res = await window.storage.set("progress-all", JSON.stringify(next));
      setSaveError(!res);
    } catch (e) {
      setSaveError(true);
    }
  }

  async function persistMeta(day) {
    setCurrentDay(day);
    try {
      await window.storage.set("meta", JSON.stringify({ currentDay: day }));
    } catch (e) {}
  }

  const dayObj = useMemo(() => PROGRAM.find((d) => d.day === currentDay), [currentDay]);
  const dayProg = progressAll[currentDay] || {};

  function toggleSet(exerciseKey, index) {
    const cur = dayProg[exerciseKey] || 0;
    const next = index < cur ? index : index + 1;
    const nextDay = { ...dayProg, [exerciseKey]: next };
    persistProgress({ ...progressAll, [currentDay]: nextDay });
  }

  function saveRetest() {
    const pull = parseInt(retestInputs.pull, 10);
    const push = parseInt(retestInputs.push, 10);
    const squat = parseInt(retestInputs.squat, 10);
    if (!pull || !push || !squat) return;
    const nextDay = { ...dayProg, retestDone: true, retestPull: pull, retestPush: push, retestSquat: squat };
    persistProgress({ ...progressAll, [currentDay]: nextDay });
  }

  function resetAll() {
    persistProgress({});
    persistMeta(1);
  }

  const week = dayObj?.week || 1;
  const weekDayIndex = ((currentDay - 1) % 7) + 1;
  const weekStartDay = (week - 1) * 7 + 1;

  const totalTrainDays = PROGRAM.filter((d) => d.type !== "rest").length;
  const completedTrainDays = PROGRAM.filter((d) => d.type !== "rest" && isDayComplete(d, progressAll[d.day])).length;

  let streak = 0;
  for (let d = currentDay; d >= 1; d--) {
    const obj = PROGRAM.find((x) => x.day === d);
    if (isDayComplete(obj, progressAll[d])) streak++;
    else break;
  }

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "#9C978A", fontFamily: "sans-serif" }}>
        Loading program...
      </div>
    );
  }

  return (
    <div style={{ background: "#14140F", color: "#EDEAE0", padding: 20, borderRadius: 8, maxWidth: 480, margin: "0 auto", fontFamily: "'Work Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;700&family=Work+Sans:wght@400;500&family=JetBrains+Mono:wght@400;600&display=swap');
      `}</style>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Dumbbell size={20} color="#8FA24C" />
          <span style={{ fontFamily: "'Oswald', sans-serif", fontSize: 18, letterSpacing: 1, textTransform: "uppercase" }}>
            Weighted Daily
          </span>
        </div>
        <button onClick={resetAll} title="Reset all progress" style={{ background: "none", border: "none", color: "#9C978A", cursor: "pointer", display: "flex", alignItems: "center" }}>
          <RotateCcw size={16} />
        </button>
      </div>

      {/* Phase progress bar */}
      <div style={{ display: "flex", gap: 3, marginBottom: 4 }}>
        {Array.from({ length: 12 }, (_, i) => i + 1).map((w) => (
          <div key={w} style={{
            flex: 1, height: 6, borderRadius: 3,
            background: w < week ? "#8FA24C" : w === week ? "#C1602E" : "#2A2920",
          }} />
        ))}
      </div>
      <div style={{ fontSize: 12, color: "#9C978A", marginBottom: 18, fontFamily: "'JetBrains Mono', monospace" }}>
        WEEK {week} / 12 · {dayObj?.phase}
      </div>

      {/* Week strip */}
      <div style={{ display: "flex", gap: 6, marginBottom: 18 }}>
        {Array.from({ length: 7 }, (_, i) => weekStartDay + i).map((d) => {
          const obj = PROGRAM.find((x) => x.day === d);
          const done = isDayComplete(obj, progressAll[d]);
          const isCurrent = d === currentDay;
          return (
            <button key={d} onClick={() => persistMeta(d)} style={{
              flex: 1, height: 34, borderRadius: 4, cursor: "pointer",
              border: isCurrent ? "2px solid #EDEAE0" : "2px solid transparent",
              background: obj?.type === "rest" ? "#2A2920" : done ? "#8FA24C" : "#1F1E17",
              color: done ? "#14140F" : "#9C978A",
              fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
            }}>
              {d}
            </button>
          );
        })}
      </div>

      {/* Day tag card */}
      <div style={{
        background: "#1F1E17", border: "2px dashed #4A4832", borderRadius: 6,
        padding: "18px 18px 16px", marginBottom: 16, position: "relative",
      }}>
        <div style={{ position: "absolute", top: 10, right: 12, width: 8, height: 8, borderRadius: "50%", background: "#4A4832" }} />
        <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 24, letterSpacing: 1, marginBottom: 2 }}>
          DAY {String(currentDay).padStart(3, "0")}
        </div>
        <div style={{ fontSize: 12, color: "#9C978A", marginBottom: 16, fontFamily: "'JetBrains Mono', monospace" }}>
          WEEK {week} · DAY {weekDayIndex} OF 7
        </div>

        {dayObj?.type === "rest" && (
          <div style={{ textAlign: "center", padding: "20px 0", color: "#C1602E", fontFamily: "'Oswald', sans-serif", fontSize: 16, letterSpacing: 1, textTransform: "uppercase" }}>
            Rest Day
          </div>
        )}

        {dayObj?.type === "train" && (
          <>
            <TallySets label="Pull-ups" target={dayObj.pull} filled={dayProg.pull || 0} onToggle={(i) => toggleSet("pull", i)} />
            <TallySets label="Push-ups" target={dayObj.push} filled={dayProg.push || 0} onToggle={(i) => toggleSet("push", i)} />
            <TallySets label="Squats" target={dayObj.squat} filled={dayProg.squat || 0} onToggle={(i) => toggleSet("squat", i)} />
            {dayObj.band && (
              <TallySets label="Band lat raises" target={dayObj.band} filled={dayProg.band || 0} onToggle={(i) => toggleSet("band", i)} />
            )}
          </>
        )}

        {dayObj?.type === "taper" && (
          <>
            <div style={{ fontSize: 12, color: "#C1602E", marginBottom: 12, fontFamily: "'JetBrains Mono', monospace" }}>TAPER — LIGHT EFFORT</div>
            <TallySets label="Pull-ups" target={dayObj.pull} filled={dayProg.pull || 0} onToggle={(i) => toggleSet("pull", i)} />
            <TallySets label="Push-ups" target={dayObj.push} filled={dayProg.push || 0} onToggle={(i) => toggleSet("push", i)} />
            <TallySets label="Squats" target={dayObj.squat} filled={dayProg.squat || 0} onToggle={(i) => toggleSet("squat", i)} />
          </>
        )}

        {dayObj?.type === "retest" && (
          <div>
            <div style={{ fontSize: 12, color: "#C1602E", marginBottom: 12, fontFamily: "'JetBrains Mono', monospace" }}>RETEST DAY — MAX REPS @10KG</div>
            {dayProg.retestDone ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[["Pull-ups", "retestPull", BASELINE.pull], ["Push-ups", "retestPush", BASELINE.push], ["Squats", "retestSquat", BASELINE.squat]].map(([label, key, base]) => (
                  <div key={key} style={{ display: "flex", justifyContent: "space-between", fontFamily: "'JetBrains Mono', monospace", fontSize: 14 }}>
                    <span style={{ color: "#9C978A" }}>{label}</span>
                    <span>{dayProg[key]} <span style={{ color: dayProg[key] > base ? "#8FA24C" : "#9C978A" }}>({dayProg[key] > base ? "+" : ""}{dayProg[key] - base} vs {base})</span></span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[["pull", "Pull-ups"], ["push", "Push-ups"], ["squat", "Squats"]].map(([key, label]) => (
                  <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                    <span style={{ fontSize: 14 }}>{label}</span>
                    <input
                      type="number"
                      min="0"
                      value={retestInputs[key]}
                      onChange={(e) => setRetestInputs({ ...retestInputs, [key]: e.target.value })}
                      style={{
                        width: 70, background: "#14140F", border: "1px solid #4A4832",
                        borderRadius: 4, color: "#EDEAE0", padding: "6px 8px", fontFamily: "'JetBrains Mono', monospace",
                      }}
                    />
                  </div>
                ))}
                <button onClick={saveRetest} style={{
                  marginTop: 6, background: "#8FA24C", border: "none", borderRadius: 4,
                  padding: "10px 0", color: "#14140F", fontFamily: "'Oswald', sans-serif",
                  fontSize: 14, letterSpacing: 1, textTransform: "uppercase", cursor: "pointer",
                }}>
                  Save Retest
                </button>
              </div>
            )}
          </div>
        )}

        {saveError && (
          <div style={{ marginTop: 10, fontSize: 12, color: "#C1602E" }}>
            Couldn't save — try tapping again.
          </div>
        )}
      </div>

      {/* Nav */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 18 }}>
        <button
          onClick={() => persistMeta(Math.max(1, currentDay - 1))}
          disabled={currentDay === 1}
          style={{
            display: "flex", alignItems: "center", gap: 4, background: "none",
            border: "1px solid #4A4832", borderRadius: 4, padding: "8px 14px",
            color: currentDay === 1 ? "#4A4832" : "#EDEAE0", cursor: currentDay === 1 ? "default" : "pointer",
          }}
        >
          <ChevronLeft size={16} /> Prev
        </button>
        <button
          onClick={() => persistMeta(Math.min(84, currentDay + 1))}
          disabled={currentDay === 84}
          style={{
            display: "flex", alignItems: "center", gap: 4, background: "none",
            border: "1px solid #4A4832", borderRadius: 4, padding: "8px 14px",
            color: currentDay === 84 ? "#4A4832" : "#EDEAE0", cursor: currentDay === 84 ? "default" : "pointer",
          }}
        >
          Next <ChevronRight size={16} />
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: "flex", gap: 10 }}>
        <div style={{ flex: 1, background: "#1F1E17", borderRadius: 6, padding: "12px 14px" }}>
          <div style={{ fontSize: 11, color: "#9C978A", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Days Done</div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 20 }}>{completedTrainDays}<span style={{ color: "#9C978A", fontSize: 14 }}>/{totalTrainDays}</span></div>
        </div>
        <div style={{ flex: 1, background: "#1F1E17", borderRadius: 6, padding: "12px 14px" }}>
          <div style={{ fontSize: 11, color: "#9C978A", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4, display: "flex", alignItems: "center", gap: 4 }}>
            <Flame size={12} color="#C1602E" /> Streak
          </div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 20 }}>{streak}</div>
        </div>
      </div>

      {/* Program rules */}
      <div style={{ marginTop: 18, background: "#1F1E17", borderRadius: 6, padding: "14px 14px 12px" }}>
        <div style={{ fontSize: 11, color: "#9C978A", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>
          Program Rules
        </div>
        <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 8, color: "#EDEAE0", fontSize: 12, lineHeight: 1.5 }}>
          {PROGRAM_RULES.map((rule) => (
            <li key={rule} style={{ color: "#EDEAE0" }}>{rule}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
