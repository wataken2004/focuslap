import { useState } from "react";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider, isFirebaseConfigured } from "../firebase.js";
import { C } from "../shared.jsx";

export function LoginScreen({ onGuestLogin }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loginWithGoogle = async () => {
    setLoading(true);
    setError("");
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e) {
      setError("ログインに失敗しました。もう一度お試しください。");
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh", background: C.deck, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", padding: 24,
      fontFamily: "'Hiragino Kaku Gothic ProN','Noto Sans JP',sans-serif",
    }}>
      <div style={{ fontSize: 52, marginBottom: 8 }}>🐠</div>
      <div style={{ fontSize: 28, fontWeight: 800, color: C.ink, marginBottom: 4 }}>FocusLap</div>
      <div style={{ fontSize: 13, color: C.sub, marginBottom: 40, textAlign: "center" }}>
        集中すると魚が育つ勉強管理アプリ
      </div>

      <div style={{ width: "100%", maxWidth: 360, background: C.card, borderRadius: 20, padding: 28, border: `1px solid ${C.line}` }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: C.ink, marginBottom: 6 }}>ログイン / 新規登録</div>
        <div style={{ fontSize: 12, color: C.sub, marginBottom: 20 }}>
          Googleアカウントでログインすると、複数端末でデータを同期できます。
        </div>

        {isFirebaseConfigured ? (
          <button onClick={loginWithGoogle} disabled={loading}
            style={{ width: "100%", padding: "14px 0", borderRadius: 12, border: `1px solid ${C.line}`, background: "#fff", color: C.ink, fontWeight: 800, fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 12 }}>
            <span style={{ fontSize: 20 }}>G</span>
            {loading ? "ログイン中…" : "Googleでログイン"}
          </button>
        ) : (
          <div style={{ fontSize: 12, color: C.sub, background: "#FFF8E6", border: `1px solid #F5BE3D`, borderRadius: 10, padding: "10px 12px", marginBottom: 12 }}>
            ⚠️ Firebase未設定のため、Googleログインは利用できません。<br />
            <code>.env.local</code> にFirebase設定を追加するとログインが有効になります。
          </div>
        )}

        <button onClick={onGuestLogin}
          style={{ width: "100%", padding: "12px 0", borderRadius: 12, border: `1px solid ${C.line}`, background: "transparent", color: C.sub, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
          ゲストとして使う（このブラウザのみ保存）
        </button>

        {error && <div style={{ marginTop: 12, fontSize: 12, color: C.red, textAlign: "center" }}>{error}</div>}
      </div>
    </div>
  );
}
