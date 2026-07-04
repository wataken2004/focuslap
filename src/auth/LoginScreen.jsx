import { useState } from "react";
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth";
import { auth, googleProvider, isFirebaseConfigured } from "../firebase.js";
import { C } from "../shared.jsx";
import { FishSVG } from "../fish.jsx";

const AUTH_ERRORS = {
  "auth/invalid-email": "メールアドレスの形式が正しくありません。",
  "auth/user-not-found": "このメールアドレスのアカウントが見つかりません。新規登録をお試しください。",
  "auth/wrong-password": "パスワードが違います。",
  "auth/invalid-credential": "メールアドレスまたはパスワードが違います。",
  "auth/email-already-in-use": "このメールアドレスは登録済みです。ログインをお試しください。",
  "auth/weak-password": "パスワードは6文字以上にしてください。",
  "auth/too-many-requests": "試行回数が多すぎます。しばらくしてからお試しください。",
};

// アプリ紹介（未獲得のレア魚はここでも明かさない）
const FEATURES = [
  { icon: "⏱", title: "集中した時間で魚をゲット", desc: "5分のシャボン玉から、長く集中するほどレアな魚まで全11種類。図鑑コンプを目指そう" },
  { icon: "🐠", title: "サボると魚が逃げる", desc: "集中中に1分以上アプリを離れると魚が逃げてしまう。ゲーム感覚でスマホ断ち" },
  { icon: "📊", title: "積み上げが目に見える", desc: "目標ごとの集中時間・タスクの進捗％・振り返りメモ。勉強も仕事もこれ1つで管理" },
  { icon: "📲", title: "通知でリマインド", desc: "タスクの開始前・集中終了・期限切れをお知らせ。アプリを閉じていても届く" },
];

export function LoginScreen({ onGuestLogin }) {
  const [mode, setMode] = useState("login"); // "login" | "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const loginWithGoogle = async () => {
    setLoading(true); setError(""); setInfo("");
    try {
      await signInWithPopup(auth, googleProvider);
    } catch {
      setError("Googleログインに失敗しました。もう一度お試しください。");
      setLoading(false);
    }
  };

  const submitEmail = async () => {
    if (!email.trim() || !password) return;
    setLoading(true); setError(""); setInfo("");
    try {
      if (mode === "signup") {
        await createUserWithEmailAndPassword(auth, email.trim(), password);
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }
    } catch (e) {
      setError(AUTH_ERRORS[e.code] || "ログインに失敗しました。入力内容をご確認ください。");
      setLoading(false);
    }
  };

  const resetPassword = async () => {
    if (!email.trim()) {
      setError("パスワード再設定には、先にメールアドレスを入力してください。");
      return;
    }
    setError(""); setInfo("");
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setInfo("パスワード再設定メールを送信しました。受信箱をご確認ください。");
    } catch (e) {
      setError(AUTH_ERRORS[e.code] || "再設定メールを送れませんでした。");
    }
  };

  const inputStyle = {
    width: "100%", boxSizing: "border-box", padding: "12px",
    borderRadius: 10, border: `1px solid ${C.line}`, fontSize: 14, marginBottom: 8,
    background: "#FBFEFE",
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(180deg,#12507E 0%,#0E3A60 34%,#0B2C4C 68%,#081E33 100%)",
      fontFamily: "'Hiragino Kaku Gothic ProN','Noto Sans JP',sans-serif",
      position: "relative", overflow: "hidden",
    }}>
      <style>{`
        @keyframes loginBob    { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-9px)} }
        @keyframes loginBubble { 0%{transform:translateY(0) scale(1);opacity:0} 12%{opacity:.55} 100%{transform:translateY(-105vh) scale(1.25);opacity:0} }
        @keyframes loginDrift  { 0%,100%{transform:translateX(0)} 50%{transform:translateX(34px)} }
        @media (prefers-reduced-motion:reduce){ *{animation:none !important} }
      `}</style>

      {/* 背景：差し込む光と立ちのぼる泡 */}
      <div aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        <div style={{ position: "absolute", top: -140, left: "10%", width: 150, height: "68vh", background: "linear-gradient(180deg,rgba(159,217,216,0.30),rgba(159,217,216,0))", transform: "rotate(15deg)", filter: "blur(12px)" }} />
        <div style={{ position: "absolute", top: -120, right: "14%", width: 100, height: "56vh", background: "linear-gradient(180deg,rgba(159,217,216,0.22),rgba(159,217,216,0))", transform: "rotate(-16deg)", filter: "blur(12px)" }} />
        {[[8, 5.5, 0, 10], [22, 7, 2.2, 6], [45, 6, 1.1, 12], [68, 8, 3.2, 7], [86, 6.5, 0.6, 9], [58, 9, 4.5, 5]].map(([x, dur, delay, size], i) => (
          <div key={i} style={{
            position: "absolute", left: `${x}%`, bottom: -20, width: size, height: size, borderRadius: 999,
            border: "1.5px solid rgba(159,217,216,0.5)", background: "rgba(127,214,212,0.10)",
            animation: `loginBubble ${dur}s linear ${delay}s infinite`,
          }} />
        ))}
        {/* 奥をゆっくり泳ぐ魚の影（レアはネタバレ防止で出さない） */}
        <div style={{ position: "absolute", top: "16%", left: "6%", opacity: 0.12, animation: "loginDrift 11s ease-in-out infinite" }}>
          <FishSVG type="🐟" size={64} />
        </div>
        <div style={{ position: "absolute", top: "58%", right: "4%", opacity: 0.10, animation: "loginDrift 14s ease-in-out 2s infinite" }}>
          <FishSVG type="🐡" size={52} style={{ transform: "scaleX(-1)" }} />
        </div>
      </div>

      <div style={{ position: "relative", maxWidth: 480, margin: "0 auto", padding: "44px 22px calc(40px + env(safe-area-inset-bottom))" }}>

        {/* ヒーロー */}
        <div style={{ textAlign: "center", marginBottom: 26 }}>
          <div style={{ display: "inline-block", animation: "loginBob 2.8s ease-in-out infinite", filter: "drop-shadow(0 10px 24px rgba(0,0,0,0.35))" }}>
            <FishSVG type="🐠" size={118} />
          </div>
          <div style={{ fontSize: 34, fontWeight: 800, color: "#fff", letterSpacing: "0.02em", marginTop: 6 }}>FocusLap</div>
          <div style={{ fontSize: 14, color: "#9FD9D8", fontWeight: 700, marginTop: 6, lineHeight: 1.7 }}>
            集中すると魚が増える、<br />ポモドーロ式タスク管理アプリ
          </div>
        </div>

        {/* アプリ概要 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 26 }}>
          {FEATURES.map((f) => (
            <div key={f.title} style={{
              display: "flex", gap: 12, alignItems: "flex-start",
              background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.13)",
              borderRadius: 14, padding: "12px 14px",
              backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)",
            }}>
              <div style={{ fontSize: 22, lineHeight: 1, marginTop: 2 }}>{f.icon}</div>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 800, color: "#fff" }}>{f.title}</div>
                <div style={{ fontSize: 12, color: "#A8CBD4", marginTop: 3, lineHeight: 1.6 }}>{f.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ログインカード */}
        <div style={{ background: "#fff", borderRadius: 20, padding: 22, boxShadow: "0 18px 44px rgba(3,12,24,0.45)" }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: C.ink }}>
            {mode === "signup" ? "新規登録" : "はじめる"}
          </div>
          <div style={{ fontSize: 12, color: C.sub, margin: "4px 0 16px", lineHeight: 1.6 }}>
            アカウントを作るとデータがクラウドに保存され、スマホ・PCどこからでも続きができます。
          </div>

          {isFirebaseConfigured ? (
            <>
              <button onClick={loginWithGoogle} disabled={loading}
                style={{ width: "100%", padding: "13px 0", borderRadius: 12, border: `1px solid ${C.line}`, background: "#fff", color: C.ink, fontWeight: 800, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 14 }}>
                <span style={{ fontSize: 18, fontWeight: 800, color: "#4285F4" }}>G</span>
                {loading ? "処理中…" : "Googleでログイン"}
              </button>

              <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "2px 0 12px" }}>
                <div style={{ flex: 1, height: 1, background: C.line }} />
                <span style={{ fontSize: 11, color: C.sub }}>または</span>
                <div style={{ flex: 1, height: 1, background: C.line }} />
              </div>

              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="メールアドレス" autoComplete="email" style={inputStyle} />
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitEmail()}
                placeholder="パスワード（6文字以上）"
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                style={inputStyle} />
              <button onClick={submitEmail} disabled={loading || !email.trim() || !password}
                style={{ width: "100%", padding: "13px 0", borderRadius: 12, border: "none", background: email.trim() && password ? C.aqua : "#BFDEDE", color: "#fff", fontWeight: 800, fontSize: 14, cursor: "pointer", marginBottom: 10 }}>
                {loading ? "処理中…" : mode === "signup" ? "メールアドレスで登録" : "メールアドレスでログイン"}
              </button>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <button onClick={() => { setMode(mode === "signup" ? "login" : "signup"); setError(""); setInfo(""); }}
                  style={{ background: "none", border: "none", color: C.deepAqua, fontSize: 12, fontWeight: 700, cursor: "pointer", textDecoration: "underline", padding: 0 }}>
                  {mode === "signup" ? "ログインはこちら" : "はじめての方：新規登録"}
                </button>
                {mode === "login" && (
                  <button onClick={resetPassword}
                    style={{ background: "none", border: "none", color: C.sub, fontSize: 11, cursor: "pointer", textDecoration: "underline", padding: 0 }}>
                    パスワードを忘れた
                  </button>
                )}
              </div>
            </>
          ) : (
            <div style={{ fontSize: 12, color: C.sub, background: "#FFF8E6", border: `1px solid #F5BE3D`, borderRadius: 10, padding: "10px 12px", marginBottom: 12 }}>
              ⚠️ Firebase未設定のため、ログインは利用できません。
            </div>
          )}

          <div style={{ height: 1, background: C.line, margin: "12px 0" }} />

          <button onClick={onGuestLogin}
            style={{ width: "100%", padding: "12px 0", borderRadius: 12, border: `1px solid ${C.line}`, background: "transparent", color: C.sub, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
            🐟 まずはゲストで試してみる（登録なし）
          </button>

          {error && <div style={{ marginTop: 12, fontSize: 12, color: C.red, textAlign: "center" }}>{error}</div>}
          {info && <div style={{ marginTop: 12, fontSize: 12, color: C.deepAqua, textAlign: "center" }}>{info}</div>}
        </div>

        {/* フッター */}
        <div style={{ textAlign: "center", fontSize: 11, color: "rgba(159,217,216,0.75)", marginTop: 18, lineHeight: 1.9 }}>
          無料・インストール不要・広告なし<br />
          スマホは共有メニューから「ホーム画面に追加」でアプリとして使えます
        </div>
      </div>
    </div>
  );
}
