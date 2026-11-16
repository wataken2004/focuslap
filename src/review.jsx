/* 週の振り返り（水槽タブ）
   - weekSummary: 月曜はじまりの1週間の集中時間・日別・目標別・タスク別・完了タスク・獲得魚を集計
   - WeeklyReview: 前週／次週を切り替えて表示するカード */
import { useState, useMemo } from "react";
import { C, fmt, addDays, todayStr } from "./shared.jsx";
import { G } from "./glyphs.jsx";
import { FishSVG } from "./fish.jsx";

const WD = "日月火水木金土";

// その日を含む週の月曜（YYYY-MM-DD）
export function weekStart(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return fmt(addDays(d, -((d.getDay() + 6) % 7)));
}

// today がこの週の中なら、先週は「同じ曜日まで」で比べる（週の途中で不利にならないように）
export function weekSummary(data, start, today = null) {
  const s0 = new Date(start + "T00:00:00");
  const days = [...Array(7)].map((_, i) => fmt(addDays(s0, i)));
  const end = days[6];
  const prevStart = fmt(addDays(s0, -7));
  const inWeek = (d) => d >= start && d <= end;
  const sessions = (data.sessions || []).filter((s) => inWeek(s.date));
  const partial = !!today && today >= start && today < end;
  const prevEnd = partial ? fmt(addDays(new Date(today + "T00:00:00"), -7)) : fmt(addDays(s0, -1));
  const prevMinutes = (data.sessions || [])
    .filter((s) => s.date >= prevStart && s.date <= prevEnd)
    .reduce((a, s) => a + s.minutes, 0);

  const archiveById = new Map((data.archive || []).map((a) => [a.id, a]));
  const taskById = new Map((data.tasks || []).map((t) => [t.id, t]));
  const goalById = new Map((data.goals || []).map((g) => [g.id, g]));

  // セッション → タスク名・目標名（タスクや目標を消していてもアーカイブから引く）
  const infoOf = (taskId) => {
    if (!taskId) return { task: null, goal: null, type: null };
    const t = taskById.get(taskId), a = archiveById.get(taskId);
    const g = t?.goalId ? goalById.get(t.goalId) : null;
    return {
      task: t?.title ?? a?.title ?? null,
      goal: g?.title ?? a?.goalTitle ?? null,
      type: g?.type ?? a?.goalType ?? null,
    };
  };

  const perDay = days.map((d) => ({ date: d, minutes: 0 }));
  const goalMap = new Map(), taskMap = new Map(), fish = {};
  sessions.forEach((s) => {
    perDay[days.indexOf(s.date)].minutes += s.minutes;
    const info = infoOf(s.taskId);
    const gk = info.goal ?? "目標なし";
    const ge = goalMap.get(gk) || { title: gk, type: info.goal ? info.type : null, minutes: 0 };
    ge.minutes += s.minutes; goalMap.set(gk, ge);
    if (info.task) {
      const te = taskMap.get(info.task) || { title: info.task, minutes: 0, sessions: 0 };
      te.minutes += s.minutes; te.sessions += 1; taskMap.set(info.task, te);
    }
    if (s.fish) fish[s.fish] = (fish[s.fish] || 0) + 1;
  });

  const minutes = perDay.reduce((a, d) => a + d.minutes, 0);
  const completed = (data.archive || []).filter((a) => a.completedAt && inWeek(a.completedAt))
    .sort((a, b) => a.completedAt.localeCompare(b.completedAt));
  const best = perDay.reduce((b, d) => (d.minutes > (b?.minutes ?? 0) ? d : b), null);

  return {
    start, end, days: perDay, minutes, prevMinutes, partial,
    sessions: sessions.length,
    activeDays: perDay.filter((d) => d.minutes > 0).length,
    best,
    byGoal: [...goalMap.values()].sort((a, b) => b.minutes - a.minutes),
    byTask: [...taskMap.values()].sort((a, b) => b.minutes - a.minutes).slice(0, 5),
    completed,
    fish,
  };
}

const hm = (m) => (m >= 60 ? `${Math.floor(m / 60)}時間${m % 60 ? `${m % 60}分` : ""}` : `${m}分`);
const md = (d) => { const x = new Date(d + "T00:00:00"); return `${x.getMonth() + 1}/${x.getDate()}`; };

export function WeeklyReview({ data }) {
  const today = todayStr();
  const thisWeek = weekStart(today);
  const [start, setStart] = useState(thisWeek);
  const [showDone, setShowDone] = useState(false);
  const w = useMemo(() => weekSummary(data, start, today), [data, start, today]);
  const shift = (n) => setStart((s) => fmt(addDays(new Date(s + "T00:00:00"), n * 7)));
  const isThis = start === thisWeek;
  const max = Math.max(60, ...w.days.map((d) => d.minutes));
  const diff = w.minutes - w.prevMinutes;
  const goalMax = Math.max(1, ...w.byGoal.map((g) => g.minutes));

  const navBtn = (label, onClick, disabled) => (
    <button onClick={onClick} disabled={disabled} aria-label={label}
      style={{ width: 30, height: 30, borderRadius: 999, border: `1px solid ${C.line}`, background: "#fff", color: disabled ? C.line : C.deepAqua, cursor: disabled ? "default" : "pointer", fontSize: 14, fontWeight: 800, flexShrink: 0 }}>
      {label === "前の週" ? "‹" : "›"}
    </button>
  );
  const sub = { fontSize: 11, fontWeight: 800, color: C.sub, margin: "14px 0 6px" };

  return (
    <div className="wcard" style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 18, padding: 14, marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: C.ink }}><G n="chart" size={15} style={{ color: C.aqua }} /> {isThis ? "今週" : "週"}のふりかえり</div>
          <div style={{ fontSize: 11, color: C.sub }}>{md(w.start)}(月)〜{md(w.end)}(日)</div>
        </div>
        {navBtn("前の週", () => shift(-1), false)}
        {navBtn("次の週", () => shift(1), isThis)}
      </div>

      {/* 合計と先週比 */}
      <div style={{ display: "flex", alignItems: "flex-end", gap: 12, margin: "12px 0 4px" }}>
        <div>
          <div className="num" style={{ fontSize: 28, color: C.deepAqua, lineHeight: 1 }}>{hm(w.minutes)}</div>
          <div style={{ fontSize: 11, color: C.sub, marginTop: 3 }}>
            {w.sessions}セッション・{w.activeDays}日集中
          </div>
        </div>
        <div style={{ marginLeft: "auto", textAlign: "right", fontSize: 11, color: C.sub }}>
          {w.partial ? "先週の同じ曜日まで" : "先週"} {hm(w.prevMinutes)}
          <div style={{ fontSize: 13, fontWeight: 800, color: diff > 0 ? C.deepAqua : diff < 0 ? C.red : C.sub }}>
            {diff === 0 ? "±0分" : `${diff > 0 ? "+" : "−"}${hm(Math.abs(diff))}`}
          </div>
        </div>
      </div>

      {/* 日別 */}
      <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 86, marginTop: 10 }}>
        {w.days.map((d) => {
          const isToday = d.date === today, future = d.date > today;
          const best = w.best && d.date === w.best.date;
          return (
            <div key={d.date} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, height: "100%", justifyContent: "flex-end" }}>
              <div className="num" style={{ fontSize: 9, color: best ? C.deepAqua : C.sub, minHeight: 11 }}>{d.minutes || ""}</div>
              <div style={{ width: "100%", maxWidth: 26, height: `${Math.max(d.minutes ? 6 : 2, (d.minutes / max) * 56)}px`, borderRadius: "6px 6px 2px 2px",
                background: d.minutes ? (best ? `linear-gradient(180deg,${C.yellow},#E9A23B)` : `linear-gradient(180deg,${C.aqua},${C.deepAqua})`) : future ? "transparent" : C.line,
                border: future ? `1px dashed ${C.line}` : "none", boxSizing: "border-box" }} />
              <div style={{ fontSize: 10, fontWeight: isToday ? 800 : 600, color: isToday ? C.deepAqua : C.sub }}>
                {WD[new Date(d.date + "T00:00:00").getDay()]}
              </div>
            </div>
          );
        })}
      </div>

      {w.minutes === 0 && (
        <div style={{ fontSize: 12, color: C.sub, textAlign: "center", padding: "10px 0 2px" }}>
          {isThis ? "今週はまだ集中記録がありません" : "この週の集中記録はありません"}
        </div>
      )}

      {/* 目標別 */}
      {w.byGoal.length > 0 && (
        <>
          <div style={sub}>目標ごとの時間</div>
          {w.byGoal.map((g) => (
            <div key={g.title} style={{ marginBottom: 7 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.ink, fontWeight: 700 }}>
                {g.type && <G n={g.type === "work" ? "work" : "goal"} size={13} style={{ color: C.deepAqua }} />}
                <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: g.type ? C.ink : C.sub }}>{g.title}</span>
                <span className="num" style={{ fontSize: 12, color: C.deepAqua }}>{hm(g.minutes)}</span>
              </div>
              <div style={{ height: 6, borderRadius: 3, background: "#E4EFEF", marginTop: 3, overflow: "hidden" }}>
                <div style={{ width: `${(g.minutes / goalMax) * 100}%`, height: "100%", background: g.type ? C.aqua : "#B8CDD0" }} />
              </div>
            </div>
          ))}
        </>
      )}

      {/* よく取り組んだタスク */}
      {w.byTask.length > 0 && (
        <>
          <div style={sub}>よく取り組んだタスク</div>
          {w.byTask.map((t, i) => (
            <div key={t.title} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0", fontSize: 12 }}>
              <span className="num" style={{ width: 16, color: i === 0 ? C.yellow : C.sub, fontSize: 12 }}>{i + 1}</span>
              <span style={{ flex: 1, minWidth: 0, color: C.ink, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</span>
              <span style={{ color: C.sub, fontSize: 11 }}>{t.sessions}回</span>
              <span className="num" style={{ color: C.deepAqua, width: 64, textAlign: "right" }}>{hm(t.minutes)}</span>
            </div>
          ))}
        </>
      )}

      {/* 獲得した魚 */}
      {Object.keys(w.fish).length > 0 && (
        <>
          <div style={sub}>この週に獲れた魚</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {Object.entries(w.fish).map(([e, n]) => (
              <div key={e} style={{ display: "flex", alignItems: "center", gap: 3, background: "#F4FAFA", borderRadius: 999, padding: "2px 9px 2px 4px" }}>
                <FishSVG type={e} size={24} /><span className="num" style={{ fontSize: 12, color: C.deepAqua }}>×{n}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* 完了タスク */}
      <button onClick={() => setShowDone((s) => !s)} disabled={!w.completed.length}
        style={{ display: "flex", alignItems: "center", width: "100%", gap: 6, marginTop: 14, padding: "10px 12px", borderRadius: 12, border: `1px solid ${C.line}`, background: "#F4FAFA", cursor: w.completed.length ? "pointer" : "default", color: C.ink, fontSize: 12, fontWeight: 800 }}>
        <G n="done" size={14} style={{ color: C.aqua }} />
        <span style={{ flex: 1, textAlign: "left" }}>終わったタスク</span>
        <span className="num" style={{ color: C.deepAqua, fontSize: 14 }}>{w.completed.length}</span>
        {w.completed.length > 0 && <span style={{ color: C.sub, fontSize: 11 }}>{showDone ? "閉じる" : "見る"}</span>}
      </button>
      {showDone && (
        <div style={{ marginTop: 6 }}>
          {w.completed.map((a) => (
            <div key={a.id + a.completedAt} style={{ display: "flex", gap: 8, padding: "5px 4px", fontSize: 12, borderBottom: `1px dashed ${C.line}` }}>
              <span style={{ color: C.sub, width: 70, flexShrink: 0 }}>{md(a.completedAt)}({WD[new Date(a.completedAt + "T00:00:00").getDay()]})</span>
              <span style={{ flex: 1, minWidth: 0, color: C.ink, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.title}</span>
              {a.goalTitle && <span style={{ color: C.deepAqua, fontSize: 11, flexShrink: 0, maxWidth: 90, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.goalTitle}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
