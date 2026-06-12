import { useState, useEffect, useRef, useMemo } from "react";
import { C, FISHES, fishForMinutes, fmt, todayStr, addDays, uid, stageOf, Stat } from "../shared.jsx";
import { FishSVG } from "../fish.jsx";

// 完了通知（許可済みのときだけ）
const notify = (msg) => {
  try {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("FocusLap", { body: msg, icon: "./icon.svg" });
    }
  } catch { /* 非対応ブラウザは無視 */ }
};

// 完了音（短いビープ）
const beep = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.frequency.value = 880;
    g.gain.setValueAtTime(0.2, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    o.start(); o.stop(ctx.currentTime + 0.6);
  } catch { /* 非対応ブラウザは無視 */ }
};

// 獲得ファンファーレ（ド→ミ→ソ→ド の上昇アルペジオ）
const chime = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [[523.25, 0], [659.25, 0.12], [783.99, 0.24], [1046.5, 0.36]].forEach(([f, t]) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.type = "sine";
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, ctx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + 0.5);
      o.start(ctx.currentTime + t);
      o.stop(ctx.currentTime + t + 0.55);
    });
  } catch { /* 非対応ブラウザは無視 */ }
};

/* ---- 魚獲得のお祝いオーバーレイ ---- */
function Celebration({ fish, name, count, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3200);
    return () => clearTimeout(t);
  }, []);
  const pieces = useMemo(() => [...Array(20)].map((_, i) => ({
    left: Math.random() * 100,
    delay: Math.random() * 0.8,
    dur: 1.6 + Math.random() * 1.4,
    color: ["#F5BE3D", "#14A3A1", "#7FD6D4", "#E05B5B", "#FFFFFF"][i % 5],
    size: 6 + Math.random() * 6,
    round: i % 3 === 0,
  })), []);
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 999, background: "rgba(6,18,32,0.80)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", overflow: "hidden" }}>
      <style>{`
        @keyframes celebPop  { 0%{transform:scale(0) rotate(-20deg);opacity:0} 60%{transform:scale(1.25) rotate(6deg)} 100%{transform:scale(1) rotate(0)} }
        @keyframes celebFall { 0%{transform:translateY(-12vh) rotate(0)} 100%{transform:translateY(110vh) rotate(720deg)} }
        @keyframes celebRing { 0%{transform:scale(.4);opacity:.8} 100%{transform:scale(2.4);opacity:0} }
        @keyframes celebBob  { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
      `}</style>
      {pieces.map((p, i) => (
        <div key={i} style={{ position: "absolute", top: 0, left: `${p.left}%`, width: p.size, height: p.size, background: p.color, borderRadius: p.round ? 999 : 2, animation: `celebFall ${p.dur}s linear ${p.delay}s forwards` }} />
      ))}
      <div style={{ textAlign: "center", animation: "celebPop .55s cubic-bezier(.2,1.4,.4,1) both" }}>
        <div style={{ position: "relative", display: "inline-block" }}>
          <div style={{ position: "absolute", inset: -18, borderRadius: 999, border: "3px solid #F5BE3D", animation: "celebRing 1.2s ease-out .15s infinite" }} />
          <div style={{ animation: "celebBob 2s ease-in-out infinite", filter: "drop-shadow(0 0 18px rgba(245,190,61,.85))" }}>
            <FishSVG type={fish} size={130} />
          </div>
        </div>
        <div style={{ marginTop: 16, fontSize: 12, letterSpacing: ".3em", color: "#F5BE3D", fontWeight: 800 }}>NEW CATCH!</div>
        <div style={{ fontSize: 26, fontWeight: 800, color: "#fff", marginTop: 4 }}>{name}を獲得！</div>
        <div style={{ fontSize: 13, color: "#9FD9D8", marginTop: 6 }}>通算 {count} 匹目</div>
        <div style={{ fontSize: 11, color: "#7593A8", marginTop: 16 }}>タップで閉じる</div>
      </div>
    </div>
  );
}

export function FocusTab({ data, update, growthOf, taskId, setTaskId }) {
  const { settings } = data;
  const [mode, setMode] = useState("work");
  const [secs, setSecs] = useState(settings.work * 60);
  const [running, setRunning] = useState(false);
  const [quickTitle, setQuickTitle] = useState("");
  const [banner, setBanner] = useState(null);
  const [celebration, setCelebration] = useState(null);
  const [manualMin, setManualMin] = useState(25);
  const ref = useRef();
  const endAtRef = useRef(null);    // タイマー終了予定時刻（実時間基準）
  const hiddenAtRef = useRef(null); // 画面が隠れた時刻

  const total = (mode === "work" ? settings.work : settings.rest) * 60;
  const progress = 1 - secs / total;
  const earnedFish = fishForMinutes(settings.work);
  // 未獲得の魚は名前・姿を隠す（ネタバレ防止）
  const earnedOwned = (data.collection[earnedFish.e] || 0) > 0;
  const manualFish = fishForMinutes(Math.min(300, Math.max(5, parseInt(manualMin) || 5)));
  const manualOwned = (data.collection[manualFish.e] || 0) > 0;

  // タイマー本体（終了時刻との差分で計算：バックグラウンドでも狂わない）
  useEffect(() => {
    if (!running) { endAtRef.current = null; return; }
    endAtRef.current = Date.now() + secs * 1000;
    ref.current = setInterval(() => {
      setSecs(Math.max(0, Math.round((endAtRef.current - Date.now()) / 1000)));
    }, 250);
    return () => clearInterval(ref.current);
  }, [running]);

  // アプリを閉じていても「集中終了」をプッシュ通知できるよう、終了予定をデータに記録
  // （GitHub Actionsが定期的にチェックして通知を送る）
  useEffect(() => {
    if (running && mode === "work" && endAtRef.current) {
      const endAt = endAtRef.current;
      update((d) => { d.pendingSession = { endAt, minutes: settings.work }; return d; });
    } else if (data.pendingSession) {
      update((d) => { delete d.pendingSession; return d; });
    }
  }, [running, mode]);

  // 離脱判定：画面スリープや1分以内の離脱は許す。
  // 1分以上離れて戻ってきたら魚が逃げる（ただし離脱中にタイマー満了していれば獲得扱い）
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) {
        if (running && mode === "work") hiddenAtRef.current = Date.now();
        return;
      }
      if (!hiddenAtRef.current) return;
      const awaySec = (Date.now() - hiddenAtRef.current) / 1000;
      hiddenAtRef.current = null;
      const finished = endAtRef.current && Date.now() >= endAtRef.current;
      // スマホ学習モード中は他アプリの使用を許可
      if (running && mode === "work" && awaySec > 60 && !finished && !settings.phoneMode) {
        clearInterval(ref.current);
        setRunning(false);
        setSecs(settings.work * 60);
        update((d) => { if (d.escapesDate !== todayStr()) { d.escapes = 0; d.escapesDate = todayStr(); } d.escapes += 1; return d; });
        flash("💨 1分以上アプリを離れたため魚が逃げてしまった…", "#FF9B9B");
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [running, mode, settings.work, settings.phoneMode]);

  const flash = (text, color) => {
    setBanner({ text, color });
    setTimeout(() => setBanner(null), 4000);
  };

  // タブタイトルに残り時間を表示
  useEffect(() => {
    document.title = running
      ? `${String(Math.floor(secs / 60)).padStart(2, "0")}:${String(secs % 60).padStart(2, "0")} ${mode === "work" ? "⏱" : "☕"} FocusLap`
      : "FocusLap";
    return () => { document.title = "FocusLap"; };
  }, [secs, running, mode]);

  // タイマーが0になったとき
  useEffect(() => {
    if (secs > 0) return;
    // 繰り返しモード中は止めずに次のセッションへ自動移行
    const repeat = settings.autoRepeat;
    if (!repeat) { clearInterval(ref.current); setRunning(false); }
    if (mode === "work") {
      const fish = fishForMinutes(settings.work);
      const newCount = (data.collection[fish.e] || 0) + 1;
      update((d) => {
        d.sessions.push({ date: todayStr(), minutes: settings.work, taskId: taskId || null, fish: fish.e });
        d.collection[fish.e] = (d.collection[fish.e] || 0) + 1;
        return d;
      });
      setCelebration({ fish: fish.e, name: fish.name, count: newCount });
      chime();
      notify(`${fish.e} ${fish.name}を獲得！休憩しましょう`);
      setMode("rest");
      const nextRest = settings.rest * 60;
      setSecs(nextRest);
      if (repeat) endAtRef.current = Date.now() + nextRest * 1000;
    } else {
      beep();
      notify(repeat ? "休憩終了！次のセッションを開始します" : "休憩終了！次のセッションを始めましょう");
      setMode("work");
      const nextWork = settings.work * 60;
      setSecs(nextWork);
      if (repeat) endAtRef.current = Date.now() + nextWork * 1000;
    }
  }, [secs]);

  // workMin: 設定更新の反映を待たずに新しい作業時間を直接指定できる
  const reset = (m = mode, workMin = settings.work) => {
    if (mode === "work" && secs < total && secs > 0 && running) {
      update((d) => { if (d.escapesDate !== todayStr()) { d.escapes = 0; d.escapesDate = todayStr(); } d.escapes += 1; return d; });
      flash("💨 集中を中断…魚が逃げてしまった", C.red);
    }
    clearInterval(ref.current);
    setRunning(false);
    setMode(m);
    setSecs((m === "work" ? workMin : settings.rest) * 60);
  };

  // アプリ外の勉強時間を手動で記録（魚も獲得）
  const addManual = () => {
    const min = Math.min(300, Math.max(5, parseInt(manualMin) || 0));
    if (!min) return;
    const fish = fishForMinutes(min);
    const newCount = (data.collection[fish.e] || 0) + 1;
    update((d) => {
      d.sessions.push({ date: todayStr(), minutes: min, taskId: taskId || null, fish: fish.e, manual: true });
      d.collection[fish.e] = (d.collection[fish.e] || 0) + 1;
      return d;
    });
    setCelebration({ fish: fish.e, name: fish.name, count: newCount });
    chime();
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
  // タスク選択を見やすくグループ化（今日期限→目標ごと→その他）
  const todayKey = todayStr();
  const dueToday = openTasks.filter((t) => t.due === todayKey);
  const groupedTasks = data.goals
    .map((g) => ({ g, ts: openTasks.filter((t) => t.goalId === g.id && t.due !== todayKey) }))
    .filter((x) => x.ts.length > 0);
  const ungroupedTasks = openTasks.filter((t) => !t.goalId && t.due !== todayKey);

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
      {celebration && (
        <Celebration fish={celebration.fish} name={celebration.name} count={celebration.count} onClose={() => setCelebration(null)} />
      )}

      {/* タスク選択 */}
      <select value={taskId} onChange={(e) => setTaskId(e.target.value)}
        style={{ width: "100%", padding: "12px 14px", borderRadius: 12, border: `1px solid ${C.line}`, background: C.card, fontSize: 14, color: C.ink, marginBottom: 8 }}>
        <option value="">— 取り組むタスクを選ぶ —</option>
        {dueToday.length > 0 && (
          <optgroup label="📅 今日やる">
            {dueToday.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
          </optgroup>
        )}
        {groupedTasks.map(({ g, ts }) => (
          <optgroup key={g.id} label={`${g.type === "work" ? "💼" : "🎯"} ${g.title}`}>
            {ts.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
          </optgroup>
        ))}
        {ungroupedTasks.length > 0 && (
          <optgroup label="その他">
            {ungroupedTasks.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
          </optgroup>
        )}
      </select>

      {/* 今回やることメモ（任意） */}
      {task && (
        <input value={task.note || ""}
          onChange={(e) => { const v = e.target.value; update((d) => { const x = d.tasks.find((x) => x.id === task.id); if (x) x.note = v; return d; }); }}
          placeholder="✏️ 今回やることメモ（任意）例：CH3の問題演習"
          style={{ width: "100%", boxSizing: "border-box", padding: "9px 12px", borderRadius: 10, border: `1px dashed ${C.line}`, fontSize: 12, marginBottom: 8, background: "#FBFEFE" }} />
      )}

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

        {/* 進行バー */}
        <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,0.12)", overflow: "hidden", margin: "0 8px 12px" }}>
          <div style={{ width: `${(progress * 100).toFixed(1)}%`, height: "100%", borderRadius: 3, background: mode === "work" ? "linear-gradient(90deg,#14A3A1,#7FD6D4)" : C.yellow, transition: "width 1s linear" }} />
        </div>

        {/* 今回獲得できる魚のプレビュー */}
        {mode === "work" && (
          <div style={{ fontSize: 12, color: "#9FD9D8", marginBottom: 12 }}>
            このセッションで獲得：{earnedOwned ? <>{earnedFish.e} <strong>{earnedFish.name}</strong></> : <strong>？？？（おたのしみ）</strong>}
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

          {/* タスク未選択でも魚は泳ぐ */}
          <div style={{
            position: "absolute", top: 28,
            left: running || progress > 0 ? `calc(${(progress * 80).toFixed(1)}% + 4%)` : "40%",
            transition: "left 1s linear",
            filter: banner?.color === C.yellow ? "drop-shadow(0 0 8px #F5BE3D)" : "none",
          }}>
            <div style={{ animation: "bob 2.4s ease-in-out infinite" }}>
              <FishSVG type={earnedFish.e} size={Math.max(stage.size, 24) * 1.6}
                style={{ transform: "scaleX(-1)", ...(earnedOwned ? {} : { filter: "grayscale(1) brightness(0) invert(0.45)", opacity: 0.85 }) }} />
            </div>
          </div>
          {banner && (
            <div style={{ position: "absolute", top: 6, left: 0, right: 0, fontSize: 11, color: banner.color, fontWeight: 800 }}>{banner.text}</div>
          )}
        </div>

        {/* コントロール */}
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button onClick={() => {
            if (!running && "Notification" in window && Notification.permission === "default") {
              Notification.requestPermission().catch(() => {});
            }
            setRunning((r) => !r);
          }}
            style={{ flex: 1, maxWidth: 180, padding: "13px 0", borderRadius: 14, border: "none", background: running ? C.yellow : C.aqua, color: C.ink, fontWeight: 800, fontSize: 15, cursor: "pointer" }}>
            {running ? "一時停止" : secs < total ? "再開" : "スタート"}
          </button>
          <button onClick={() => reset()}
            style={{ padding: "13px 16px", borderRadius: 14, border: "1px solid rgba(255,255,255,0.3)", background: "transparent", color: "#fff", cursor: "pointer" }}>リセット</button>
        </div>
        <div style={{ fontSize: 10, color: "#7593A8", marginTop: 8 }}>
          {settings.phoneMode
            ? "※ スマホ学習モード中：他のアプリを使ってもOK"
            : "※ 画面スリープはOK。作業中にリセット、または1分以上アプリを離れると魚が逃げます"}
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
        <Stat label="今日逃げた魚" value={`${data.escapesDate === todayStr() ? data.escapes : 0}匹`} />
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

      {/* タイマー設定：魚カードで時間を選択 */}
      <div style={{ background: C.card, borderRadius: 16, padding: 16, marginTop: 14, border: `1px solid ${C.line}` }}>
        <div style={{ fontSize: 12, color: C.sub, fontWeight: 700, marginBottom: 10 }}>
          集中時間を選ぶ（魚をタップ）
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6, marginBottom: 12 }}>
          {FISHES.map((f) => {
            const selected = data.settings.work === f.minutes;
            const isOwned = (data.collection[f.e] || 0) > 0;
            return (
              <button key={f.e}
                onClick={() => { update((d) => { d.settings.work = f.minutes; return d; }); reset("work", f.minutes); }}
                style={{
                  padding: "8px 4px", borderRadius: 12, cursor: "pointer", textAlign: "center",
                  border: `2px solid ${selected ? C.aqua : C.line}`,
                  background: selected ? "#E6F5F5" : "#fff",
                }}>
                <div style={{ display: "flex", justifyContent: "center" }}>
                  <FishSVG type={f.e} size={38} style={isOwned ? undefined : { filter: "grayscale(1) brightness(0.25)", opacity: 0.45 }} />
                </div>
                <div style={{ fontSize: 10, fontWeight: 800, color: selected ? C.deepAqua : isOwned ? C.ink : C.sub, marginTop: 2 }}>
                  {isOwned ? f.name : "？？？"}
                </div>
                <div style={{ fontSize: 10, color: C.sub }}>{f.minutes}分</div>
              </button>
            );
          })}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 12, color: C.sub }}>休憩</span>
          <input type="number" min="1" max="30" value={data.settings.rest}
            onChange={(e) => { const v = Math.min(30, Math.max(1, parseInt(e.target.value) || 5)); update((d) => { d.settings.rest = v; return d; }); }}
            style={{ width: 56, padding: "6px 8px", borderRadius: 8, border: `1px solid ${C.line}`, textAlign: "center", fontSize: 14 }} />
          <span style={{ fontSize: 12, color: C.sub }}>分</span>
        </div>
      </div>

      {/* スマホ学習モード */}
      <div style={{ background: C.card, borderRadius: 16, padding: 16, marginTop: 14, border: `1px solid ${settings.phoneMode ? C.aqua : C.line}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: C.ink }}>📱 スマホ学習モード</div>
            <div style={{ fontSize: 11, color: C.sub, marginTop: 2 }}>
              単語アプリ・リスニングなどスマホで勉強するとき用。他のアプリを開いても魚が逃げません。
            </div>
          </div>
          <button
            onClick={() => update((d) => { d.settings.phoneMode = !d.settings.phoneMode; return d; })}
            style={{ padding: "8px 16px", borderRadius: 999, border: "none", background: settings.phoneMode ? C.deepAqua : C.line, color: settings.phoneMode ? "#fff" : C.sub, fontWeight: 800, fontSize: 13, cursor: "pointer", flexShrink: 0 }}>
            {settings.phoneMode ? "ON" : "OFF"}
          </button>
        </div>

        <div style={{ height: 1, background: C.line, margin: "12px 0" }} />

        {/* 繰り返しモード */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: C.ink }}>🔁 繰り返しモード</div>
            <div style={{ fontSize: 11, color: C.sub, marginTop: 2 }}>
              休憩が終わると自動で次の集中を開始します。休憩時間を無駄にしません。
            </div>
          </div>
          <button
            onClick={() => update((d) => { d.settings.autoRepeat = !d.settings.autoRepeat; return d; })}
            style={{ padding: "8px 16px", borderRadius: 999, border: "none", background: settings.autoRepeat ? C.deepAqua : C.line, color: settings.autoRepeat ? "#fff" : C.sub, fontWeight: 800, fontSize: 13, cursor: "pointer", flexShrink: 0 }}>
            {settings.autoRepeat ? "ON" : "OFF"}
          </button>
        </div>
      </div>

      {/* アプリ外の勉強をあとから記録 */}
      <div style={{ background: C.card, borderRadius: 16, padding: 16, marginTop: 14, border: `1px solid ${C.line}` }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: C.ink, marginBottom: 4 }}>✏️ あとから記録</div>
        <div style={{ fontSize: 11, color: C.sub, marginBottom: 10 }}>
          タイマーを使わなかった勉強時間を手動で追加できます。上で選択中のタスクに記録されます。
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <input type="number" min="5" max="300" value={manualMin}
            onChange={(e) => setManualMin(e.target.value)}
            style={{ width: 64, padding: "8px", borderRadius: 8, border: `1px solid ${C.line}`, textAlign: "center", fontSize: 14 }} />
          <span style={{ fontSize: 12, color: C.sub }}>分</span>
          <span style={{ fontSize: 12, color: C.sub }}>
            → {manualOwned ? `${manualFish.e} ${manualFish.name}` : "？？？"}を獲得
          </span>
          <button onClick={addManual}
            style={{ marginLeft: "auto", padding: "9px 18px", borderRadius: 10, border: "none", background: C.aqua, color: "#fff", fontWeight: 800, fontSize: 13, cursor: "pointer" }}>
            記録する
          </button>
        </div>
      </div>
    </div>
  );
}
