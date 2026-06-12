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
    width: "100%", boxSizing: "border-box", padding: "11px 12px",
    borderRadius: 10, border: `1px solid ${C.line}`, fontSize: 14, marginBottom: 8,
  };

  return (
    <div style={{
      minHeight: "100vh", background: C.deck, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", padding: 24,
      fontFamily: "'Hiragino Kaku Gothic ProN','Noto Sans JP',sans-serif",
    }}>
      <style>{`
        @keyframes loginBob { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes loginBubble { 0%{transform:translateY(0);opacity:0} 15%{opacity:.7} 100%{transform:translateY(-70px);opacity:0} }
      `}</style>
      <div style={{ position: "relative", marginBottom: 10 }}>
        {[[-26, 4.2, 0], [96, 3.4, 1.1], [40, 5, 2.2]].map(([x, dur, delay], i) => (
          <div key={i} style={{ position: "absolute", left: x, bottom: 10, width: 7 + i * 2, height: 7 + i * 2, borderRadius: 999, border: `2px solid #7FD6D4`, opacity: 0, animation: `loginBubble ${dur}s ease-out ${delay}s infinite` }} />
        ))}
        <div style={{ animation: "loginBob 2.6s ease-in-out infinite" }}>
          <FishSVG type="🐠" size={110} />
        </div>
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color: C.ink, marginBottom: 4 }}>FocusLap</div>
      <div style={{ fontSize: 13, color: C.sub, marginBottom: 28, textAlign: "center" }}>
        集中すると魚が増えるタスク管理アプリ
      </div>

      <div style={{ width: "100%", maxWidth: 360, background: C.card, borderRadius: 20, padding: 24, border: `1px solid ${C.line}` }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: C.ink, marginBottom: 4 }}>
          {mode === "signup" ? "新規登録" : "ログイン"}
        </div>
        <div style={{ fontSize: 12, color: C.sub, marginBottom: 16 }}>
          アカウントがあれば複数端末でデータを同期できます。
        </div>

        {isFirebaseConfigured ? (
          <>
            <button onClick={loginWithGoogle} disabled={loading}
              style={{ width: "100%", padding: "13px 0", borderRadius: 12, border: `1px solid ${C.line}`, background: "#fff", color: C.ink, fontWeight: 800, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 14 }}>
              <span style={{ fontSize: 18 }}>G</span>
              {loading ? "処理中…" : "Googleでログイン"}
            </button>

            {/* 区切り */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "2px 0 12px" }}>
              <div style={{ flex: 1, height: 1, background: C.line }} />
              <span style={{ fontSize: 11, color: C.sub }}>または</span>
              <div style={{ flex: 1, height: 1, background: C.line }} />
            </div>

            {/* メール/パスワード */}
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
                {mode === "signup" ? "ログインはこちら" : "新規登録はこちら"}
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
          style={{ width: "100%", padding: "11px 0", borderRadius: 12, border: `1px solid ${C.line}`, background: "transparent", color: C.sub, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
          ゲストとして使う（このブラウザのみ保存）
        </button>

        {error && <div style={{ marginTop: 12, fontSize: 12, color: C.red, textAlign: "center" }}>{error}</div>}
        {info && <div style={{ marginTop: 12, fontSize: 12, color: C.deepAqua, textAlign: "center" }}>{info}</div>}
      </div>
    </div>
  );
}
