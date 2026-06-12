import { useMemo, useState } from "react";
import { C, FISHES, Stat, todayStr } from "../shared.jsx";
import { FishSVG } from "../fish.jsx";

/* ---- 魚スポットライト（タップした魚が大きく泳ぐ） ---- */
function FishSpotlight({ fish, count, onClose }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 999, background: "rgba(6,18,32,0.85)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, cursor: "pointer" }}>
      <style>{`@keyframes spotSwim { 0%{left:-28%;transform:scaleX(-1)} 49%{left:74%;transform:scaleX(-1)} 50%{left:74%;transform:scaleX(1)} 99%{left:-28%;transform:scaleX(1)} 100%{left:-28%;transform:scaleX(-1)} }`}</style>
      <div style={{ width: "min(92vw, 420px)", borderRadius: 20, overflow: "hidden", background: "#0B2C4C", border: "1px solid rgba(255,255,255,0.15)" }}>
        <div style={{ position: "relative", height: 190, background: "linear-gradient(180deg,#1B6FA8 0%,#11497A 60%,#0B2C4C 100%)", overflow: "hidden" }}>
          {[16, 42, 68, 88].map((x, i) => (
            <div key={i} style={{ position: "absolute", left: `${x}%`, bottom: 0, width: 5 + (i % 2) * 3, height: 5 + (i % 2) * 3, borderRadius: 999, background: "rgba(255,255,255,0.3)", animation: `bubble ${3 + i}s linear infinite`, animationDelay: `${i * 0.8}s` }} />
          ))}
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 16, background: "#C9B07A" }} />
          <div style={{ position: "absolute", bottom: 10, left: 14, fontSize: 20 }}>🪸</div>
          <div style={{ position: "absolute", bottom: 10, right: 16, fontSize: 18 }}>🌿</div>
          <div style={{ position: "absolute", top: 40, left: "-28%", animation: "spotSwim 9s ease-in-out infinite" }}>
            <div style={{ animation: "bob 2.2s ease-in-out infinite" }}>
              <FishSVG type={fish.e} size={140} style={fish.owned === false ? { filter: "grayscale(1) brightness(0.35)" } : undefined} />
            </div>
          </div>
        </div>
        <div style={{ padding: "14px 16px 16px", textAlign: "center" }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#fff" }}>{fish.owned === false ? "？？？" : fish.name}</div>
          <div style={{ fontSize: 12, color: "#9FD9D8", marginTop: 4 }}>
            {fish.owned === false
              ? `${fish.minutes}分以上の集中で出会えるかも…`
              : `${fish.minutes}分以上の集中で獲得 ・ 所持 ${count}匹`}
          </div>
          <div style={{ fontSize: 11, color: "#7593A8", marginTop: 10 }}>タップで閉じる</div>
        </div>
      </div>
    </div>
  );
}

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
  const [spotlight, setSpotlight] = useState(null);    // タップされた魚

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

  // 図鑑：獲得済みの魚をグリッドの中央寄りに配置する
  const dexCells = useMemo(() => {
    const cols4 = 4;
    const rows = Math.ceil(FISHES.length / cols4);
    // 各マスの「グリッド中心からの距離」順（近い順）
    const order = [...Array(rows * cols4)]
      .map((_, i) => {
        const r = Math.floor(i / cols4), c = i % cols4;
        return { i, d: Math.hypot(r - (rows - 1) / 2, c - (cols4 - 1) / 2) };
      })
      .sort((a, b) => a.d - b.d)
      .map((x) => x.i);
    const owned = FISHES.filter((f) => (col[f.e] || 0) > 0);
    const unowned = FISHES.filter((f) => (col[f.e] || 0) === 0);
    const cells = Array(rows * cols4).fill(null);
    [...owned, ...unowned].forEach((f, idx) => { cells[order[idx]] = f; });
    return cells;
  }, [col]);
  const ownedKinds = FISHES.filter((f) => (col[f.e] || 0) > 0).length;

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
      {spotlight && (
        <FishSpotlight fish={spotlight} count={col[spotlight.e] || 0} onClose={() => setSpotlight(null)} />
      )}

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
          <div key={`${f.e}-${f.idx}`}
            onClick={() => setSpotlight({ ...f, owned: true })}
            style={{
              position: "absolute",
              top: `${12 + (f.idx * 47) % 160}px`,
              left: `${(f.idx * 29) % 72 + 4}%`,
              animation: `drift ${7 + (f.idx % 4) * 2}s ease-in-out infinite, bob ${2 + (f.idx % 3)}s ease-in-out infinite`,
              animationDelay: `${f.idx * 0.5}s`,
              cursor: "pointer",
            }} title={f.name}>
            <FishSVG type={f.e} size={38} />
          </div>
        ))}
      </div>

      {/* 統計 */}
      <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
        <Stat label="獲得した魚" value={`${totalFish}匹`} accent />
        <Stat label="累計セッション" value={`${totalSessions}回`} />
        <Stat label="累計集中時間" value={`${Math.floor(totalMin / 60)}時間${totalMin % 60}分`} />
      </div>

      {/* 魚ずかん（水中パネル：獲得した魚は中央に集まる） */}
      <div style={{ borderRadius: 20, padding: 16, marginBottom: 14, background: "linear-gradient(180deg,#11497A 0%,#0B2C4C 100%)", border: "1px solid #1B4A6E", position: "relative", overflow: "hidden" }}>
        {/* 飾りの泡 */}
        <div style={{ position: "absolute", top: -20, right: -20, width: 96, height: 96, borderRadius: 999, background: "rgba(127,214,212,0.08)" }} />
        <div style={{ position: "absolute", bottom: -28, left: -16, width: 80, height: 80, borderRadius: 999, background: "rgba(127,214,212,0.05)" }} />

        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8 }}>
          <div style={{ fontSize: 13, color: "#fff", fontWeight: 800 }}>📖 魚ずかん</div>
          <div style={{ fontSize: 11, color: "#9FD9D8", fontWeight: 700 }}>{ownedKinds}/{FISHES.length} 種類</div>
        </div>

        {/* コンプリート進捗 */}
        <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,0.12)", overflow: "hidden", marginBottom: 14 }}>
          <div style={{ width: `${(ownedKinds / FISHES.length) * 100}%`, height: "100%", background: "linear-gradient(90deg,#14A3A1,#7FD6D4)", transition: "width .4s" }} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, position: "relative" }}>
          {dexCells.map((f, i) => {
            if (!f) return <div key={`empty-${i}`} style={{ borderRadius: 14, background: "rgba(255,255,255,0.03)" }} />;
            const count = col[f.e] || 0;
            const owned = count > 0;
            return owned ? (
              <div key={f.e} onClick={() => setSpotlight({ ...f, owned: true })}
                style={{
                  textAlign: "center", padding: "10px 4px 8px", borderRadius: 14, cursor: "pointer", position: "relative",
                  background: "radial-gradient(circle at 50% 35%, rgba(127,214,212,0.22), rgba(255,255,255,0.05) 70%)",
                  border: "1px solid rgba(127,214,212,0.55)",
                  boxShadow: "0 0 12px rgba(127,214,212,0.25)",
                }}>
                {count > 1 && (
                  <div style={{ position: "absolute", top: 4, right: 4, fontSize: 9, fontWeight: 800, color: "#0B2C4C", background: "#F5BE3D", borderRadius: 999, padding: "1px 6px" }}>×{count}</div>
                )}
                <div style={{ height: 30, display: "flex", alignItems: "center", justifyContent: "center", animation: `bob ${2.2 + (i % 3) * 0.5}s ease-in-out infinite`, animationDelay: `${i * 0.2}s` }}>
                  <FishSVG type={f.e} size={40} />
                </div>
                <div style={{ fontSize: 9.5, color: "#fff", fontWeight: 800, marginTop: 4 }}>{f.name}</div>
                <div style={{ fontSize: 8.5, color: "#9FD9D8" }}>{f.minutes}分〜</div>
              </div>
            ) : (
              <div key={f.e} onClick={() => setSpotlight({ ...f, owned: false })}
                style={{ textAlign: "center", padding: "10px 4px 8px", borderRadius: 14, cursor: "pointer", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)" }}>
                <div style={{ height: 30, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <FishSVG type={f.e} size={40} style={{ filter: "grayscale(1) brightness(0) invert(0.42)", opacity: 0.55 }} />
                </div>
                <div style={{ fontSize: 9.5, color: "rgba(255,255,255,0.45)", fontWeight: 700, marginTop: 4 }}>？？？</div>
                <div style={{ fontSize: 8.5, color: "rgba(159,217,216,0.5)" }}>{f.minutes}分〜</div>
              </div>
            );
          })}
        </div>

        <div style={{ fontSize: 10, color: "#7FB3C8", marginTop: 12, textAlign: "center" }}>
          長く集中するほど珍しい魚に出会えます — タップで観察
        </div>
      </div>

      {/* ===== 振り返りセクション ===== */}
      <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 16, padding: 16, marginBottom: 14 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: C.ink, marginBottom: 4 }}>🔍 振り返り・メモ</div>
        <div style={{ fontSize: 11, color: C.sub, marginBottom: 12 }}>メモは完了したタスク・達成した目標に書けます</div>

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
                  <div style={{ fontSize: 11, color: C.sub }}>タスク {done}/{linked.length} 完了（{pct}%）</div>
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
