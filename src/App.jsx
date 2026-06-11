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
      minHeight: "100vh", background: C.deck, color: C.ink,
      fontFamily: "'Hiragino Kaku Gothic ProN','Noto Sans JP',sans-serif",
      display: "flex", flexDirection: "column", maxWidth: 480, margin: "0 auto",
    }}>
      <style>{`
        @keyframes bob    { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        @keyframes bubble { 0%{transform:translateY(0);opacity:.7} 100%{transform:translateY(-120px);opacity:0} }
        @keyframes drift  { 0%,100%{transform:translateX(0) scaleX(1)} 48%{transform:translateX(26px) scaleX(1)} 50%{transform:translateX(26px) scaleX(-1)} 98%{transform:translateX(0) scaleX(-1)} }
        button { transition: transform .08s ease, filter .15s ease; }
        button:active { transform: scale(.96); }
        button:hover { filter: brightness(1.05); }
        @media (prefers-reduced-motion:reduce){ *{animation:none !important;transition:none !important} }
      `}</style>

      <header style={{ padding: "18px 20px 10px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: "0.18em", color: C.sub, fontWeight: 600 }}>FOCUS LAP</div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>{titles[tab]}</div>
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

      <main style={{ flex: 1, padding: "0 16px 96px" }}>
        {tab === "focus" && (
          <FocusTab data={data} update={update} growthOf={growthOf} taskId={focusTaskId} setTaskId={setFocusTaskId} />
        )}
        {tab === "tasks" && <TasksTab data={data} update={update} growthOf={growthOf} onFocus={goFocus} />}
        {tab === "cal"   && <CalendarTab data={data} update={update} growthOf={growthOf} onFocus={goFocus} googleAccessToken={googleAccessToken} onRequestCalendarAccess={requestCalendarAccess} />}
        {tab === "goals" && <GoalsTab data={data} update={update} growthOf={growthOf} onFocus={goFocus} />}
        {tab === "tank"  && <TankTab data={data} update={update} />}
      </main>

      <nav style={{ position: "fixed", bottom: 0, left: 0, right: 0, maxWidth: 480, margin: "0 auto", background: C.card, borderTop: `1px solid ${C.line}`, display: "flex" }}>
        {[["focus","⏱️","集中"],["tasks","☑️","タスク"],["cal","📅","予定"],["goals","🎯","目標"],["tank","🐠","水槽"]].map(([k, icon, label]) => (
          <button key={k} onClick={() => setTab(k)}
            style={{ flex: 1, padding: "10px 0 14px", background: "none", border: "none", cursor: "pointer", color: tab === k ? C.deepAqua : C.sub, fontWeight: tab === k ? 800 : 500, fontSize: 11 }}>
            <div style={{ fontSize: 19 }}>{icon}</div>{label}
          </button>
        ))}
      </nav>
    </div>
  );
}
