import { useMemo, useState } from "react";
import { C, FISHES, Stat, todayStr } from "../shared.jsx";

/* ---- メモ入力コンポーネント ---- */
function MemoField({ id, memos, update }) {
  const [editing, setEditing] = useState(false);
  const text = memos?.[id] ?? "";

  return (
    <div style={{ marginTop: 8 }}>
      {editing ? (
        <div>
          <textarea
            defaultValue={text}
            autoFocus
            onBlur={(e) => {
              update((d) => { if (!d.memos) d.memos = {}; d.memos[id] = e.target.value; return d; });
              setEditing(false);
            }}
            placeholder="メモを入力…"
            style={{
              width: "100%", boxSizing: "border-box", padding: "8px 10px",
              borderRadius: 10, border: `1px solid ${C.aqua}`, fontSize: 13,
              resize: "vertical", minHeight: 64, fontFamily: "inherit",
            }}
          />
          <div style={{ fontSize: 11, color: C.sub, marginTop: 2 }}>フォーカスを外すと保存されます</div>
        </div>
      ) : (
        <button
          onClick={() => setEditing(true)}
          style={{
            width: "100%", textAlign: "left", padding: "8px 10px", borderRadius: 10,
            border: `1px dashed ${text ? C.aqua : C.line}`,
            background: text ? "#F0FAFA" : "transparent",
            color: text ? C.ink : C.sub, fontSize: 13, cursor: "pointer",
          }}
        >
          {text ? text : "✏️ メモを追加…"}
        </button>
      )}
    </div>
  );
}

/* ---- メインコンポーネント ---- */
export function TankTab({ data, update }) {
  const [reviewTab, setReviewTab] = useState("goals"); // "goals" | "tasks"

  const raw = data.collection ?? {};
  const col = typeof raw === "object" && !Array.isArray(raw) ? raw : {};

  const totalFish = Object.values(col).reduce((a, b) => a + b, 0);
  const totalSessions = data.sessions.length;
  const totalMin = data.sessions.reduce((a, s) => a + s.minutes, 0);

  // 水槽に泳がせる魚（獲得数に応じて最大5匹ずつ）
  const swimmingFish = useMemo(() => {
    const list = [];
    FISHES.forEach((f) => {
      const count = col[f.e] || 0;
      for (let i = 0; i < Math.min(count, 5); i++) list.push({ ...f, idx: list.length });
    });
    return list;
  }, [col]);

  // 振り返りデータ
  const completedGoals = data.goals.filter((g) => {
    const linked = data.tasks.filter((t) => t.goalId === g.id);
    return linked.length > 0 && linked.every((t) => t.done);
  });
  const activeGoals = data.goals.filter((g) => !completedGoals.find((c) => c.id === g.id));
  const completedTasks = data.tasks.filter((t) => t.done);
  const allTasks = data.tasks;

  const growthOf = (taskId) => data.sessions.filter((s) => s.taskId === taskId).length;

  return (
    <div>
      {/* 水槽 */}
      <div style={{
        position: "relative", height: 240, borderRadius: 20,
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
        <div style={{ position: "absolute", bottom: 14, left: 16, fontSize: 24 }}>🪸</div>
        <div style={{ position: "absolute", bottom: 14, right: 22, fontSize: 22 }}>🌿</div>
        <div style={{ position: "absolute", bottom: 12, left: "44%", fontSize: 18 }}>🐚</div>

        {swimmingFish.length === 0 && (
          <div style={{ position: "absolute", top: "40%", left: 0, right: 0, textAlign: "center", color: "#9FD9D8", fontSize: 13 }}>
            まだ魚がいません。<br />集中セッションを完了すると魚が増えます。
          </div>
        )}
        {swimmingFish.map((f) => (
          <div key={`${f.e}-${f.idx}`} style={{
            position: "absolute",
            top: `${12 + (f.idx * 47) % 160}px`,
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
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6 }}>
          {FISHES.map((f) => {
            const count = col[f.e] || 0;
            return (
              <div key={f.e} style={{
                textAlign: "center", padding: "8px 4px", borderRadius: 12,
                background: count > 0 ? "#FFF7E0" : "#F0F5F5",
                border: `1px solid ${count > 0 ? C.yellow : C.line}`,
              }}>
                <div style={{ fontSize: 22, filter: count > 0 ? "none" : "grayscale(1) brightness(0.4)", opacity: count > 0 ? 1 : 0.4 }}>
                  {count > 0 ? f.e : "❓"}
                </div>
                <div style={{ fontSize: 10, color: count > 0 ? C.ink : C.sub, fontWeight: count > 0 ? 800 : 500 }}>
                  {count > 0 ? f.name : "???"}
                </div>
                {count > 0 && <div style={{ fontSize: 10, color: C.deepAqua, fontWeight: 800 }}>×{count}</div>}
                <div style={{ fontSize: 9, color: C.sub }}>{f.minutes}分〜</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ===== 振り返りセクション ===== */}
      <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 16, padding: 16, marginBottom: 14 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: C.ink, marginBottom: 12 }}>🔍 振り返り・メモ</div>

        {/* タブ切替 */}
        <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
          {[["goals", "目標"], ["tasks", "タスク"]].map(([k, l]) => (
            <button key={k} onClick={() => setReviewTab(k)}
              style={{
                flex: 1, padding: "8px 0", borderRadius: 10, cursor: "pointer", fontWeight: 700, fontSize: 13,
                border: `1px solid ${reviewTab === k ? C.deepAqua : C.line}`,
                background: reviewTab === k ? C.deepAqua : "#fff",
                color: reviewTab === k ? "#fff" : C.sub,
              }}>{l}</button>
          ))}
        </div>

        {/* 目標タブ */}
        {reviewTab === "goals" && (
          <div>
            {data.goals.length === 0 && (
              <div style={{ textAlign: "center", color: C.sub, fontSize: 13, padding: "20px 0" }}>目標がまだありません。</div>
            )}

            {/* 進行中の目標 */}
            {activeGoals.map((g) => {
              const linked = allTasks.filter((t) => t.goalId === g.id);
              const done = linked.filter((t) => t.done).length;
              const pct = linked.length ? Math.round((done / linked.length) * 100) : 0;
              return (
                <div key={g.id} style={{ marginBottom: 12, padding: 12, borderRadius: 12, background: "#F8FAFA", border: `1px solid ${C.line}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: C.deepAqua, background: "#E6F5F5", padding: "2px 8px", borderRadius: 999 }}>進行中</span>
                    <span style={{ fontSize: 14, fontWeight: 700 }}>{g.title}</span>
                  </div>
                  <div style={{ height: 8, borderRadius: 4, background: "#E4EFEF", overflow: "hidden", marginBottom: 4 }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: `linear-gradient(90deg,${C.aqua},${C.deepAqua})`, transition: "width .4s" }} />
                  </div>
                  <div style={{ fontSize: 11, color: C.sub, marginBottom: 6 }}>タスク {done}/{linked.length} 完了（{pct}%）</div>
                  <MemoField id={g.id} memos={data.memos} update={update} />
                </div>
              );
            })}

            {/* 完了した目標 */}
            {completedGoals.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: C.sub, marginBottom: 8 }}>✅ 達成済みの目標</div>
                {completedGoals.map((g) => {
                  const linked = allTasks.filter((t) => t.goalId === g.id);
                  const totalSess = linked.reduce((a, t) => a + growthOf(t.id), 0);
                  return (
                    <div key={g.id} style={{ marginBottom: 12, padding: 12, borderRadius: 12, background: "#F0FFF8", border: `1px solid #A8DFC4` }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 16 }}>🏆</span>
                        <span style={{ fontSize: 14, fontWeight: 800, color: "#1A6B45" }}>{g.title}</span>
                      </div>
                      <div style={{ fontSize: 11, color: C.sub, marginBottom: 6 }}>
                        タスク {linked.length}件完了・累計 {totalSess} セッション
                        {g.date && ` · 期日 ${g.date}`}
                      </div>
                      <MemoField id={g.id} memos={data.memos} update={update} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* タスクタブ */}
        {reviewTab === "tasks" && (
          <div>
            {allTasks.length === 0 && (
              <div style={{ textAlign: "center", color: C.sub, fontSize: 13, padding: "20px 0" }}>タスクがまだありません。</div>
            )}

            {/* 完了タスク */}
            {completedTasks.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: C.sub, marginBottom: 8 }}>✅ 完了したタスク（{completedTasks.length}件）</div>
                {completedTasks.map((t) => {
                  const g = data.goals.find((x) => x.id === t.goalId);
                  const sessions = growthOf(t.id);
                  const lastFish = [...data.sessions].reverse().find((s) => s.taskId === t.id);
                  return (
                    <div key={t.id} style={{ marginBottom: 10, padding: 12, borderRadius: 12, background: "#F8FAFA", border: `1px solid ${C.line}` }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 18 }}>{lastFish?.fish ?? "🥚"}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: C.sub, textDecoration: "line-through" }}>{t.title}</div>
                          <div style={{ fontSize: 11, color: C.sub }}>
                            {g && <span style={{ color: C.deepAqua }}>● {g.title}　</span>}
                            {sessions}回のセッション{t.due && ` · ${t.due}`}
                          </div>
                        </div>
                      </div>
                      <MemoField id={t.id} memos={data.memos} update={update} />
                    </div>
                  );
                })}
              </div>
            )}

            {/* 未完了タスク */}
            {allTasks.filter((t) => !t.done).length > 0 && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, color: C.sub, marginBottom: 8 }}>⏳ 進行中のタスク</div>
                {allTasks.filter((t) => !t.done).map((t) => {
                  const g = data.goals.find((x) => x.id === t.goalId);
                  const sessions = growthOf(t.id);
                  const lastFish = [...data.sessions].reverse().find((s) => s.taskId === t.id);
                  return (
                    <div key={t.id} style={{ marginBottom: 10, padding: 12, borderRadius: 12, background: "#F8FAFA", border: `1px solid ${C.line}` }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 18 }}>{lastFish?.fish ?? "🥚"}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 700 }}>{t.title}</div>
                          <div style={{ fontSize: 11, color: C.sub }}>
                            {g && <span style={{ color: C.deepAqua }}>● {g.title}　</span>}
                            {sessions}回のセッション{t.due && ` · ${t.due}`}
                          </div>
                        </div>
                      </div>
                      <MemoField id={t.id} memos={data.memos} update={update} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
