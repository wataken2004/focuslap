import { useState, useEffect } from "react";
import { onAuthStateChanged, signOut, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth, isFirebaseConfigured } from "./firebase.js";
import { loadUserData, saveUserData } from "./storage.js";
import { C, todayStr } from "./shared.jsx";
import { FocusTab } from "./tabs/FocusTab.jsx";
import { TasksTab } from "./tabs/TasksTab.jsx";
import { CalendarTab } from "./tabs/CalendarTab.jsx";
import { GoalsTab } from "./tabs/GoalsTab.jsx";
import { TankTab } from "./tabs/TankTab.jsx";
import { LoginScreen } from "./auth/LoginScreen.jsx";
import { IconFocus, IconTasks, IconCal, IconGoals, IconTank } from "./icons.jsx";

// アプリ内通知（許可済みのときだけ）
const appNotify = (msg) => {
  try {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("FocusLap", { body: msg, icon: "./icon.svg" });
    }
  } catch { /* 非対応ブラウザは無視 */ }
};

/* ---- タブごとの使い方説明 ---- */
const HELP = {
  focus: [
    "魚カードをタップして集中時間を選び、スタート。長い時間ほどレアな魚が獲れます",
    "1分以上アプリを離れると魚が逃げます（📱スマホ学習モードON中は逃げません）",
    "🔁繰り返しモードONで、休憩が終わると自動で次の集中が始まります",
    "タイマーを使わなかった勉強は「✏️あとから記録」で追加できます",
  ],
  tasks: [
    "フォームからタスクを追加。期限・開始時刻・目標との紐付けは任意です",
    "開始時刻を設定すると、5分前に通知が届きます（通知許可が必要）",
    "🔔をONにすると、未完了タスクがある間1時間ごとにお知らせします",
    "各タスクの⏱ボタンで、すぐにそのタスクの集中を始められます",
  ],
  cal: [
    "月・週・日でビューを切り替え、日付をタップするとその日のタスクが見えます",
    "「＋この日に追加」で新規タスク、「既存タスクを割り振る」で期限の変更ができます",
    "Googleカレンダー同期をONにすると予定が表示され、タスク化もできます",
  ],
  goals: [
    "🎯目標 / 💼仕事を追加し、タスクを紐付けて進捗を管理します",
    "目標ごとに合計集中時間と獲得した魚が表示されます",
    "残り日数は期限が近づくと赤くなります",
  ],
  tank: [
    "泳いでいる魚や図鑑をタップすると、大きく観察できます",
    "図鑑は長い時間集中するほどレアな魚で埋まっていきます",
    "完了したタスク・達成した目標に振り返りメモを残せます",
  ],
};

function HelpSheet({ tab, title, onClose }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 998, background: "rgba(6,18,32,0.6)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 480, background: "#fff", borderRadius: "20px 20px 0 0", padding: "20px 20px 28px" }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: C.ink, marginBottom: 12 }}>💡「{title}」タブの使い方</div>
        {HELP[tab].map((h, i) => (
          <div key={i} style={{ display: "flex", gap: 8, marginBottom: 10, fontSize: 13, color: C.ink, lineHeight: 1.6 }}>
            <span style={{ color: C.aqua, fontWeight: 800 }}>•</span>
            <span>{h}</span>
          </div>
        ))}
        <button onClick={onClose} style={{ width: "100%", marginTop: 8, padding: "12px 0", borderRadius: 12, border: "none", background: C.aqua, color: "#fff", fontWeight: 800, fontSize: 14, cursor: "pointer" }}>閉じる</button>
      </div>
    </div>
  );
}

const DEFAULT_DATA = {
  goals: [
    { id: "g1", title: "英語力アップ",   date: null, type: "goal" },
    { id: "g2", title: "資格・試験対策", date: null, type: "goal" },
    { id: "g3", title: "健康・運動習慣", date: null, type: "goal" },
  ],
  tasks: [
    { id: "t1", title: "英語リスニング 30分",  goalId: "g1", due: todayStr(), done: false },
    { id: "t2", title: "単語帳 50問",           goalId: "g1", due: todayStr(), done: false },
    { id: "t3", title: "参考書 1章",            goalId: "g2", due: null,        done: false },
    { id: "t4", title: "ストレッチ・運動",      goalId: "g3", due: null,        done: false },
    { id: "t5", title: "読書 20分",             goalId: null, due: null,        done: false },
  ],
  sessions: [],
  settings: { work: 25, rest: 5 },
  collection: {},
  escapes: 0,
  memos: {},
};

function migrateData(d) {
  // collection を配列→オブジェクト形式に移行
  if (Array.isArray(d.collection)) {
    const obj = {};
    d.collection.forEach((e) => { obj[e] = (obj[e] || 0) + 1; });
    d.collection = obj;
  }
  if (!d.collection) d.collection = {};
  if (!d.memos) d.memos = {};
  if (typeof d.escapes !== "number") d.escapes = 0;
  if (!d.settings) d.settings = { work: 25, rest: 5 };
  if (typeof d.settings.phoneMode !== "boolean") d.settings.phoneMode = false;
  if (typeof d.settings.autoRepeat !== "boolean") d.settings.autoRepeat = false;
  if (typeof d.settings.hourlyReminder !== "boolean") d.settings.hourlyReminder = false;
  // 逃げた魚カウントは日ごとにリセット
  if (d.escapesDate !== todayStr()) { d.escapes = 0; d.escapesDate = todayStr(); }
  d.goals.forEach((g) => { if (!g.type) g.type = "goal"; });
  // sessions に fish フィールドがなければスキップ（古いデータ互換）
  return d;
}

export default function FocusLapApp() {
  const [user, setUser] = useState(undefined);         // undefined = 読み込み中
  const [guestMode, setGuestMode] = useState(false);
  const [googleAccessToken, setGoogleAccessToken] = useState(null);
  const [data, setData] = useState(null);
  const [tab, setTab] = useState("focus");
  const [focusTaskId, setFocusTaskId] = useState("");
  const [help, setHelp] = useState(false);

  // Firebase Auth の状態監視
  useEffect(() => {
    if (!isFirebaseConfigured) {
      setUser(null);
      return;
    }
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      // Google のアクセストークンを取得してカレンダー連携に使う
      if (u) {
        // アクセストークンはログイン時のみ取れるため sessionStorage にキャッシュ
        const cached = sessionStorage.getItem("focuslap:gat");
        if (cached) setGoogleAccessToken(cached);
      } else {
        setGoogleAccessToken(null);
      }
    });
    return unsub;
  }, []);

  // 画面が隠れている間は全アニメーションを停止（バッテリー節約）
  useEffect(() => {
    const onVis = () => document.documentElement.classList.toggle("app-paused", document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  // 通知スケジューラ：開始時刻5分前の通知＆1時間ごとの未完了リマインド
  useEffect(() => {
    if (!data) return;
    const tick = () => {
      const now = new Date();
      const today = todayStr();
      const nowMin = now.getHours() * 60 + now.getMinutes();
      // 開始予定時刻の5分前に通知
      data.tasks.forEach((t) => {
        if (t.done || !t.startTime || t.due !== today) return;
        const [h, m] = t.startTime.split(":").map(Number);
        const startMin = h * 60 + m;
        const key = `focuslap:ntf:${today}:${t.id}`;
        if (nowMin >= startMin - 5 && nowMin <= startMin && !localStorage.getItem(key)) {
          localStorage.setItem(key, "1");
          appNotify(`⏰ まもなく開始：${t.title}（${t.startTime}〜）`);
        }
      });
      // 1時間ごとの未完了リマインド
      if (data.settings.hourlyReminder) {
        const open = data.tasks.filter((t) => !t.done).length;
        const last = +localStorage.getItem("focuslap:lastHourly") || 0;
        if (open > 0 && Date.now() - last >= 3600000) {
          localStorage.setItem("focuslap:lastHourly", String(Date.now()));
          appNotify(`📝 未完了のタスクが${open}件あります`);
        }
      }
    };
    tick();
    const iv = setInterval(tick, 30000);
    return () => clearInterval(iv);
  }, [data]);

  // ユーザーが決まったらデータをロード
  useEffect(() => {
    if (user === undefined) return;
    const uid = user?.uid ?? (guestMode ? "guest" : null);
    if (uid === null && !guestMode) return;
    (async () => {
      try {
        const raw = await loadUserData(user?.uid ?? null);
        const d = raw ?? DEFAULT_DATA;
        setData(migrateData(d));
      } catch { setData(DEFAULT_DATA); }
    })();
  }, [user, guestMode]);

  // データが変わったら保存（400ms デバウンス）
  useEffect(() => {
    if (!data) return;
    const t = setTimeout(() => {
      saveUserData(user?.uid ?? null, data).catch((e) => console.error("save failed", e));
    }, 400);
    return () => clearTimeout(t);
  }, [data, user]);

  // ── ローディング中 ──
  if (user === undefined) {
    return (
      <div style={{ minHeight: "100vh", background: C.deck, display: "flex", alignItems: "center", justifyContent: "center", color: C.sub, fontFamily: "sans-serif" }}>
        読み込み中…
      </div>
    );
  }

  // ── 未ログイン かつ ゲストモードでもない ──
  if (!user && !guestMode) {
    return (
      <LoginScreen
        onGuestLogin={() => setGuestMode(true)}
        onGoogleToken={(token) => {
          sessionStorage.setItem("focuslap:gat", token);
          setGoogleAccessToken(token);
        }}
      />
    );
  }

  // ── データロード中 ──
  if (!data) {
    return (
      <div style={{ minHeight: "100vh", background: C.deck, display: "flex", alignItems: "center", justifyContent: "center", color: C.sub, fontFamily: "sans-serif" }}>
        データを読み込み中…
      </div>
    );
  }

  const update = (fn) => setData((d) => fn(structuredClone(d)));
  const growthOf = (taskId) => data.sessions.filter((s) => s.taskId === taskId).length;
  const goFocus = (id) => { setFocusTaskId(id); setTab("focus"); };

  // カレンダー同期用にGoogleカレンダーのスコープを追加で要求
  const requestCalendarAccess = async () => {
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope("https://www.googleapis.com/auth/calendar.events");
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        sessionStorage.setItem("focuslap:gat", credential.accessToken);
        setGoogleAccessToken(credential.accessToken);
        return true;
      }
    } catch (e) {
      console.error("Calendar auth failed", e);
    }
    return false;
  };

  const titles = { focus: "集中する", tasks: "タスク", cal: "カレンダー", goals: "目標・仕事", tank: "水槽" };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(180deg,#F4FAFA 0%,#E2F1F3 45%,#D3E9ED 100%)",
      color: C.ink,
      fontFamily: "'Hiragino Kaku Gothic ProN','Noto Sans JP',sans-serif",
      display: "flex", flexDirection: "column", maxWidth: 480, margin: "0 auto",
    }}>
      <style>{`
        @keyframes bob    { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        @keyframes bubble { 0%{transform:translateY(0);opacity:.7} 100%{transform:translateY(-120px);opacity:0} }
        @keyframes drift  { 0%,100%{transform:translateX(0) scaleX(-1)} 48%{transform:translateX(26px) scaleX(-1)} 50%{transform:translateX(26px) scaleX(1)} 98%{transform:translateX(0) scaleX(1)} }
        @keyframes floatUp { 0%{transform:translateY(0);opacity:0} 8%{opacity:1} 100%{transform:translateY(-130vh);opacity:.5} }
        .app-paused * { animation-play-state: paused !important; }
        button { transition: transform .08s ease, filter .15s ease; }
        button:active { transform: scale(.96); }
        button:hover { filter: brightness(1.05); }
        @media (prefers-reduced-motion:reduce){ *{animation:none !important;transition:none !important} }
      `}</style>

      {/* 背景に漂う泡（水中演出） */}
      <div aria-hidden style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
        {[[8, 75, 44, 38], [76, 95, 80, 55], [54, 82, 28, 30], [28, 92, 60, 47]].map(([l, t, s, dur], i) => (
          <div key={i} style={{
            position: "absolute", left: `${l}%`, top: `${t}%`, width: s, height: s, borderRadius: 999,
            border: "2px solid rgba(20,163,161,0.10)", background: "rgba(127,214,212,0.07)",
            animation: `floatUp ${dur}s linear ${i * 7}s infinite`,
          }} />
        ))}
      </div>

      <header style={{ padding: "18px 20px 10px", display: "flex", justifyContent: "space-between", alignItems: "flex-end", position: "relative", zIndex: 1 }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: "0.18em", color: C.sub, fontWeight: 600 }}>FOCUS LAP</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ fontSize: 22, fontWeight: 800 }}>{titles[tab]}</div>
            <button onClick={() => setHelp(true)} title="このタブの使い方"
              style={{ width: 22, height: 22, borderRadius: 999, border: "1.5px solid #9FBCC4", color: C.sub, background: "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: 800, cursor: "pointer", lineHeight: "19px", padding: 0 }}>?</button>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
          {user ? (
            <>
              <span style={{ fontSize: 11, color: C.sub }}>{user.displayName || user.email}</span>
              <button onClick={() => signOut(auth)}
                style={{ fontSize: 11, color: C.sub, background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>
                ログアウト
              </button>
            </>
          ) : (
            <span style={{ fontSize: 11, color: C.sub }}>ゲストモード</span>
          )}
        </div>
      </header>

      <main style={{ flex: 1, padding: "0 16px 96px", position: "relative", zIndex: 1 }}>
        {tab === "focus" && (
          <FocusTab data={data} update={update} growthOf={growthOf} taskId={focusTaskId} setTaskId={setFocusTaskId} />
        )}
        {tab === "tasks" && <TasksTab data={data} update={update} growthOf={growthOf} onFocus={goFocus} uid={user?.uid} />}
        {tab === "cal"   && <CalendarTab data={data} update={update} growthOf={growthOf} onFocus={goFocus} googleAccessToken={googleAccessToken} onRequestCalendarAccess={requestCalendarAccess} />}
        {tab === "goals" && <GoalsTab data={data} update={update} growthOf={growthOf} onFocus={goFocus} />}
        {tab === "tank"  && <TankTab data={data} update={update} />}
      </main>

      {help && <HelpSheet tab={tab} title={titles[tab]} onClose={() => setHelp(false)} />}

      <nav style={{ position: "fixed", bottom: 0, left: 0, right: 0, maxWidth: 480, margin: "0 auto", background: "rgba(255,255,255,0.9)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", borderTop: `1px solid ${C.line}`, display: "flex", zIndex: 10 }}>
        {[["focus", IconFocus, "集中"], ["tasks", IconTasks, "タスク"], ["cal", IconCal, "予定"], ["goals", IconGoals, "目標"], ["tank", IconTank, "水槽"]].map(([k, Icon, label]) => (
          <button key={k} onClick={() => setTab(k)}
            style={{ flex: 1, padding: "8px 0 12px", background: "none", border: "none", cursor: "pointer", color: tab === k ? C.deepAqua : C.sub, fontWeight: tab === k ? 800 : 500, fontSize: 11 }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 2 }}>
              <div style={{ padding: "3px 14px", borderRadius: 999, background: tab === k ? "#D9F0EF" : "transparent", transition: "background .2s" }}>
                <Icon size={20} />
              </div>
            </div>
            {label}
          </button>
        ))}
      </nav>
    </div>
  );
}
