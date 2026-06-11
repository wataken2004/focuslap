import { useMemo } from "react";
import { C, FISHES, Stat } from "../shared.jsx";

export function TankTab({ data }) {
  // collection は { [emoji]: count } 形式
  const collection = data.collection || {};
  const totalFish = Object.values(collection).reduce((a, b) => a + b, 0);
  const totalSessions = data.sessions.length;
  const totalMin = data.sessions.reduce((a, s) => a + s.minutes, 0);

  // 水槽に泳がせる魚リスト（獲得数 > 0 のもの）
  const swimmingFish = useMemo(() => {
    const list = [];
    FISHES.forEach((f) => {
      const count = collection[f.e] || 0;
      for (let i = 0; i < Math.min(count, 5); i++) list.push({ ...f, idx: list.length });
    });
    return list;
  }, [collection]);

  return (
    <div>
      {/* 水槽 */}
      <div style={{
        position: "relative", height: 280, borderRadius: 20,
        background: "linear-gradient(180deg,#1B6FA8 0%,#11497A 50%,#0B2C4C 100%)",
        overflow: "hidden", marginBottom: 14,
      }}>
        {[10, 28, 50, 72, 90].map((x, i) => (
          <div key={i} style={{
            position: "absolute", left: `${x}%`, bottom: 0,
            width: 5 + (i % 3) * 3, height: 5 + (i % 3) * 3, borderRadius: 999,
            background: "rgba(255,255,255,0.3)",
            animation: `bubble ${3.5 + i * 0.8}s linear infinite`, animationDelay: `${i * 0.7}s`,
          }} />
        ))}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 22, background: "#C9B07A" }} />
        <div style={{ position: "absolute", bottom: 14, left: 16, fontSize: 26 }}>🪸</div>
        <div style={{ position: "absolute", bottom: 14, right: 22, fontSize: 24 }}>🌿</div>
        <div style={{ position: "absolute", bottom: 12, left: "44%", fontSize: 20 }}>🐚</div>

        {swimmingFish.length === 0 && (
          <div style={{ position: "absolute", top: "42%", left: 0, right: 0, textAlign: "center", color: "#9FD9D8", fontSize: 13 }}>
            まだ魚がいません。<br />集中セッションを完了すると魚が増えます。
          </div>
        )}

        {swimmingFish.map((f) => (
          <div key={`${f.e}-${f.idx}`} style={{
            position: "absolute",
            top: `${12 + (f.idx * 47) % 190}px`,
            left: `${(f.idx * 29) % 72 + 4}%`,
            fontSize: 24,
            animation: `drift ${7 + (f.idx % 4) * 2}s ease-in-out infinite, bob ${2 + (f.idx % 3)}s ease-in-out infinite`,
            animationDelay: `${f.idx * 0.5}s`,
          }} title={f.name}>{f.e}</div>
        ))}
      </div>

      {/* 統計 */}
      <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
        <Stat label="獲得した魚" value={`${totalFish}匹`} accent />
        <Stat label="累計セッション" value={`${totalSessions}回`} />
        <Stat label="累計集中時間" value={`${Math.floor(totalMin / 60)}時間${totalMin % 60}分`} />
      </div>

      {/* 魚ずかん */}
      <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 16, padding: 16, marginBottom: 14 }}>
        <div style={{ fontSize: 12, color: C.sub, fontWeight: 800, marginBottom: 10 }}>
          📖 魚ずかん — 集中時間が長いほど珍しい魚が獲れます
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
          {FISHES.map((f) => {
            const count = collection[f.e] || 0;
            return (
              <div key={f.e} style={{
                textAlign: "center", padding: "10px 4px", borderRadius: 12,
                background: count > 0 ? "#FFF7E0" : "#F0F5F5",
                border: `1px solid ${count > 0 ? C.yellow : C.line}`,
              }}>
                <div style={{ fontSize: 24, filter: count > 0 ? "none" : "grayscale(1) brightness(0.4)", opacity: count > 0 ? 1 : 0.4 }}>
                  {count > 0 ? f.e : "❓"}
                </div>
                <div style={{ fontSize: 10, color: count > 0 ? C.ink : C.sub, fontWeight: count > 0 ? 800 : 500, marginTop: 2 }}>
                  {count > 0 ? f.name : "???"}
                </div>
                {count > 0 && (
                  <div style={{ fontSize: 10, color: C.deepAqua, fontWeight: 800 }}>×{count}</div>
                )}
                <div style={{ fontSize: 9, color: C.sub, marginTop: 1 }}>{f.minutes}分〜</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 魚ごとの集中時間内訳 */}
      {Object.keys(collection).length > 0 && (
        <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 16, padding: 16 }}>
          <div style={{ fontSize: 12, color: C.sub, fontWeight: 800, marginBottom: 10 }}>獲得履歴</div>
          {FISHES.filter((f) => (collection[f.e] || 0) > 0).map((f) => (
            <div key={f.e} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
              <div style={{ fontSize: 24 }}>{f.e}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{f.name}</div>
                <div style={{ fontSize: 11, color: C.sub }}>{f.minutes}分以上のセッション</div>
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: C.deepAqua }}>×{collection[f.e]}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
