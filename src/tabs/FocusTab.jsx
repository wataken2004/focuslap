import { useState, useEffect, useRef, useMemo } from "react";
import { C, FISHES, fishForMinutes, fmt, todayStr, addDays, uid, stageOf, numInput, Stat } from "../shared.jsx";

export function FocusTab({ data, update, growthOf, taskId, setTaskId }) {
  const { settings } = data;
  const [mode, setMode] = useState("work");
  const [secs, setSecs] = useState(settings.work * 60);
  const [running, setRunning] = useState(false);
  const [quickTitle, setQuickTitle] = useState("");
  const [banner, setBanner] = useState(null);
  const ref = useRef();

  const total = (mode === "work" ? settings.work : settings.rest) * 60;
  const progress = 1 - secs / total;
  const earnedFish = fishForMinutes(settings.work);

  // タイマー本体
  useEffect(() => {
    if (!running) return;
    ref.current = setInterval(() => setSecs((s) => s - 1), 1000);
    return () => clearInterval(ref.current);
  }, [running]);

  // アプリ切り替えを検知してタイマー停止
  useEffect(() => {
    if (!running) return;
    const onVisibility = () => {
      if (document.hidden) {
        clearInterval(ref.current);
        setRunning(false);
        flash("📱 アプリを離れたためタイマーを停止しました", C.red);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [running]);

  const flash = (text, color) => {
    setBanner({ text, color });
    setTimeout(() => setBanner(null), 4000);
  };

  // タイマーが0になったとき
  useEffect(() => {
    if (secs > 0) return;
    clearInterval(ref.current);
    setRunning(false);
    if (mode === "work") {
      const fish = fishForMinutes(settings.work);
      update((d) => {
        d.sessions.push({ date: todayStr(), minutes: settings.work, taskId: taskId || null, fish: fish.e });
        d.collection[fish.e] = (d.collection[fish.e] || 0) + 1;
        return d;
      });
      flash(`✨ ${fish.e} ${fish.name}を獲得！`, C.yellow);
      setMode("rest");
      setSecs(settings.rest * 60);
    } else {
      setMode("work");
      setSecs(settings.work * 60);
    }
  }, [secs]);

  const reset = (m = mode) => {
    if (mode === "work" && secs < total && secs > 0 && running) {
      update((d) => { d.escapes += 1; return d; });
      flash("💨 集中を中断…魚が逃げてしまった", C.red);
    }
    clearInterval(ref.current);
    setRunning(false);
    setMode(m);
    setSecs((m === "work" ? settings.work : settings.rest) * 60);
  };

  const quickAdd = () => {
    if (!quickTitle.trim()) return;
    const id = uid();
    update((d) => { d.tasks.unshift({ id, title: quickTitle.trim(), goalId: null, due: null, done: false }); return d; });
    setTaskId(id);
    setQuickTitle("");
  };

  const task = data.tasks.find((t) => t.id === taskId);
  const growth = task ? growthOf(task.id) : 0;
  const stage = stageOf(growth);

  const todaySessions = data.sessions.filter((s) => s.date === todayStr());
  const minutes = todaySessions.reduce((a, s) => a + s.minutes, 0);
  const openTasks = data.tasks.filter((t) => !t.done);

  const week = useMemo(() => [...Array(7)].map((_, i) => {
    const d = addDays(new Date(), -(6 - i));
    const key = fmt(d);
    return {
      label: "日月火水木金土"[d.getDay()],
      min: data.sessions.filter((s) => s.date === key).reduce((a, s) => a + s.minutes, 0),
    };
  }), [data.sessions]);
  const maxMin = Math.max(...week.map((w) => w.min), 1);

  const mm = String(Math.floor(secs / 60)).padStart(2, "0");
  const ss = String(secs % 60).padStart(2, "0");

  // 今日獲得した魚
  const todayFishCounts = todaySessions.reduce((acc, s) => {
    if (s.fish) acc[s.fish] = (acc[s.fish] || 0) + 1;
    return acc;
  }, {});

  return (
    <div>
      {/* タスク選択 */}
      <select value={taskId} onChange={(e) => setTaskId(e.target.value)}
        style={{ width: "100%", padding: "12px 14px", borderRadius: 12, border: `1px solid ${C.line}`, background: C.card, fontSize: 14, color: C.ink, marginBottom: 8 }}>
        <option value="">— 取り組むタスクを選ぶ —</option>
        {openTasks.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
      </select>

      {/* クイック追加 */}
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        <input value={quickTitle} onChange={(e) => setQuickTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && quickAdd()}
          placeholder="タスクをすぐ追加"
          style={{ flex: 1, minWidth: 0, padding: "10px 12px", borderRadius: 10, border: `1px solid ${C.line}`, fontSize: 13 }} />
        <button onClick={quickAdd}
          style={{ padding: "10px 14px", borderRadius: 10, border: "none", background: C.aqua, color: "#fff", fontWeight: 800, cursor: "pointer" }}>追加</button>
      </div>

      {/* タイマーパネル */}
      <div style={{ background: C.ink, borderRadius: 20, padding: "22px 20px 20px", color: "#fff", textAlign: "center" }}>
        <div style={{ fontSize: 12, letterSpacing: "0.2em", color: mode === "work" ? "#7FD6D4" : C.yellow, fontWeight: 700 }}>
          {mode === "work" ? "WORK — 集中タイム" : "REST — 休憩タイム"}
        </div>
        <div style={{ fontSize: 58, fontWeight: 800, fontVariantNumeric: "tabular-nums", margin: "4px 0 8px" }}>{mm}:{ss}</div>

        {/* 今回獲得できる魚のプレビュー */}
        {mode === "work" && (
          <div style={{ fontSize: 12, color: "#9FD9D8", marginBottom: 12 }}>
            このセッションで獲得：{earnedFish.e} <strong>{earnedFish.name}</strong>
          </div>
        )}

        {/* ミニ水槽 */}
        <div style={{ position: "relative", height: 100, borderRadius: 16, background: "linear-gradient(180deg,#155A8A 0%,#0E3A60 60%,#0B2C4C 100%)", overflow: "hidden", marginBottom: 14 }}>
          {[14, 38, 70, 88].map((x, i) => (
            <div key={i} style={{ position: "absolute", left: `${x}%`, bottom: 0, width: 6, height: 6, borderRadius: 999, background: "rgba(255,255,255,0.35)", animation: `bubble ${3 + i}s linear infinite`, animationDelay: `${i * 0.9}s` }} />
          ))}
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 14, background: "#C9B07A", opacity: 0.85 }} />
          <div style={{ position: "absolute", bottom: 6, left: 14, fontSize: 18 }}>🪸</div>
          <div style={{ position: "absolute", bottom: 6, right: 18, fontSize: 16 }}>🌿</div>

          {task ? (
            <div style={{
              position: "absolute", top: 22,
              left: running || progress > 0 ? `calc(${(progress * 80).toFixed(1)}% + 4%)` : "40%",
              fontSize: Math.max(stage.size, 20),
              transition: "left 1s linear",
              animation: "bob 2.4s ease-in-out infinite",
              filter: banner?.color === C.yellow ? "drop-shadow(0 0 8px #F5BE3D)" : "none",
            }}>{earnedFish.e}</div>
          ) : (
            <div style={{ position: "absolute", top: 36, left: 0, right: 0, fontSize: 11, color: "#9FD9D8" }}>タスクを選ぶと魚が現れます</div>
          )}
          {banner && (
            <div style={{ position: "absolute", top: 6, left: 0, right: 0, fontSize: 11, color: banner.color, fontWeight: 800 }}>{banner.text}</div>
          )}
        </div>

        {/* コントロール */}
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button onClick={() => setRunning((r) => !r)}
            style={{ flex: 1, maxWidth: 180, padding: "13px 0", borderRadius: 14, border: "none", background: running ? C.yellow : C.aqua, color: C.ink, fontWeight: 800, fontSize: 15, cursor: "pointer" }}>
            {running ? "一時停止" : secs < total ? "再開" : "スタート"}
          </button>
          <button onClick={() => reset()}
            style={{ padding: "13px 16px", borderRadius: 14, border: "1px solid rgba(255,255,255,0.3)", background: "transparent", color: "#fff", cursor: "pointer" }}>リセット</button>
        </div>
        <div style={{ fontSize: 10, color: "#7593A8", marginTop: 8 }}>
          ※ 作業中にリセット・アプリ切替するとタイマーが止まります
        </div>
        <button onClick={() => reset(mode === "work" ? "rest" : "work")}
          style={{ marginTop: 6, background: "none", border: "none", color: "#9FD9D8", fontSize: 12, cursor: "pointer", textDecoration: "underline" }}>
          {mode === "work" ? "休憩に切り替え" : "ワークに切り替え"}
        </button>
      </div>

      {/* 今日の獲得魚 */}
      {Object.keys(todayFishCounts).length > 0 && (
        <div style={{ background: C.card, borderRadius: 16, padding: "12px 16px", marginTop: 14, border: `1px solid ${C.line}` }}>
          <div style={{ fontSize: 11, color: C.sub, fontWeight: 700, marginBottom: 8 }}>今日獲得した魚</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {Object.entries(todayFishCounts).map(([fish, count]) => (
              <div key={fish} style={{ background: "#E6F5F5", borderRadius: 10, padding: "4px 10px", fontSize: 13, fontWeight: 700, color: C.deepAqua }}>
                {fish} × {count}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 統計 */}
      <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
        <Stat label="今日のセッション" value={`${todaySessions.length}回`} />
        <Stat label="今日の集中" value={`${minutes}分`} />
        <Stat label="逃げた魚" value={`${data.escapes}匹`} />
      </div>

      {/* 週間グラフ */}
      <div style={{ background: C.card, borderRadius: 16, padding: 16, marginTop: 14, border: `1px solid ${C.line}` }}>
        <div style={{ fontSize: 12, color: C.sub, fontWeight: 700, marginBottom: 10 }}>直近7日の集中時間</div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 70 }}>
          {week.map((w, i) => (
            <div key={i} style={{ flex: 1, textAlign: "center" }}>
              <div style={{ height: 56, display: "flex", alignItems: "flex-end" }}>
                <div style={{ width: "100%", height: `${(w.min / maxMin) * 100}%`, minHeight: w.min ? 4 : 2, borderRadius: 4, background: i === 6 ? C.aqua : "#BFDEDE" }} />
              </div>
              <div style={{ fontSize: 10, color: C.sub, marginTop: 4 }}>{w.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* タイマー設定 */}
      <div style={{ background: C.card, borderRadius: 16, padding: 16, marginTop: 14, border: `1px solid ${C.line}`, display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ fontSize: 12, color: C.sub, fontWeight: 700 }}>タイマー設定</span>
        <label style={{ fontSize: 13 }}>作業
          <input type="number" min="5" max="120" value={data.settings.work}
            onChange={(e) => update((d) => { d.settings.work = +e.target.value || 25; return d; })}
            style={numInput} />分
        </label>
        <label style={{ fontSize: 13 }}>休憩
          <input type="number" min="1" max="30" value={data.settings.rest}
            onChange={(e) => update((d) => { d.settings.rest = +e.target.value || 5; return d; })}
            style={numInput} />分
        </label>
        <div style={{ fontSize: 11, color: C.sub }}>→ {earnedFish.e} {earnedFish.name}が獲得できます</div>
      </div>
    </div>
  );
}
