import { describe, it, expect } from "vitest";
import { merge3 } from "./sync.js";
import { postponeTask } from "./taskGroups.jsx";

const T = (id, title, due, extra = {}) => ({ id, title, due, done: false, goalId: null, ...extra });
const base = () => ({
  goals: [{ id: "g1", title: "TOEIC", type: "goal" }],
  tasks: [T("a", "英会話", "2026-11-17"), T("b", "簿記", "2026-11-17"), T("c", "卒論", null)],
  sessions: [{ date: "2026-11-16", minutes: 25, taskId: "a", fish: "🐟" }],
  archive: [], collection: { "🐟": 1 }, memos: {}, settings: { work: 25, hourlyReminder: false },
  escapes: 0, escapesDate: "2026-11-17", groups: [],
});
const clone = (x) => structuredClone(x);

describe("merge3 — 複数端末の変更を重ねる", () => {
  it("古い画面（PC）の変更が、スマホの新しい変更を消さない", () => {
    const b = base();
    const phone = clone(b);                       // スマホ：aを完了＋集中記録＋魚
    phone.tasks[0].done = true;
    phone.sessions.push({ date: "2026-11-17", minutes: 25, taskId: "a", fish: "🐟" });
    phone.collection["🐟"] = 2;
    const pc = clone(b);                          // PC（古いまま）：cの名前だけ変更
    pc.tasks[2].title = "卒論 第4章";
    const m = merge3(b, pc, phone);
    expect(m.tasks.find((t) => t.id === "a").done).toBe(true);
    expect(m.tasks.find((t) => t.id === "c").title).toBe("卒論 第4章");
    expect(m.sessions).toHaveLength(2);
    expect(m.collection["🐟"]).toBe(2);
  });
  it("何も変えていない古い画面は、そのままサーバーの最新になる", () => {
    const b = base(); const phone = clone(b);
    phone.tasks.push(T("d", "新タスク", "2026-11-18"));
    phone.settings.hourlyReminder = true;
    expect(merge3(b, clone(b), phone)).toEqual(phone);
  });
  it("両端末での追加・削除をどちらも反映", () => {
    const b = base();
    const pc = clone(b); pc.tasks = pc.tasks.filter((t) => t.id !== "b"); pc.tasks.push(T("p", "PC追加", null));
    const phone = clone(b); phone.tasks.push(T("s", "スマホ追加", null));
    const ids = merge3(b, pc, phone).tasks.map((t) => t.id);
    expect(ids).toEqual(["a", "c", "s", "p"]);
  });
  it("片方で消しても、もう片方で変更されていたら残す", () => {
    const b = base();
    const pc = clone(b); pc.tasks = pc.tasks.filter((t) => t.id !== "a"); // 自動スキップ等で削除
    const phone = clone(b); phone.tasks[0].done = true;                  // スマホでは完了していた
    expect(merge3(b, pc, phone).tasks.find((t) => t.id === "a").done).toBe(true);
  });
  it("他端末で消されたものは、この端末で触っていなければ復活しない", () => {
    const b = base();
    const phone = clone(b); phone.tasks = phone.tasks.filter((t) => t.id !== "b");
    expect(merge3(b, clone(b), phone).tasks.map((t) => t.id)).toEqual(["a", "c"]);
  });
  it("同じ内容のセッションが両端末で増えても両方残る", () => {
    const b = base();
    const s = { date: "2026-11-17", minutes: 25, taskId: "a", fish: "🐟" };
    const pc = clone(b); pc.sessions.push(clone(s)); pc.collection["🐟"] = 2;
    const phone = clone(b); phone.sessions.push(clone(s)); phone.collection["🐟"] = 2;
    const m = merge3(b, pc, phone);
    expect(m.sessions).toHaveLength(3);
    expect(m.collection["🐟"]).toBe(3);
  });
  it("メモ・設定はキーごと、逃げた魚は新しい日付/多い方", () => {
    const b = base();
    const pc = clone(b); pc.memos.a = "PCメモ"; pc.settings.work = 50; pc.escapes = 1;
    const phone = clone(b); phone.memos.b = "スマホメモ"; phone.settings.hourlyReminder = true; phone.escapes = 2;
    const m = merge3(b, pc, phone);
    expect(m.memos).toEqual({ a: "PCメモ", b: "スマホメモ" });
    expect(m.settings).toEqual({ work: 50, hourlyReminder: true });
    expect(m.escapes).toBe(2);
    const next = clone(b); next.escapesDate = "2026-11-18"; next.escapes = 0;
    expect(merge3(b, pc, next).escapes).toBe(0);
  });
  it("サーバーにデータが無ければこの端末のまま", () => {
    const b = base(); expect(merge3(null, b, null)).toBe(b);
  });
});

describe("postponeTask — 明日へ回す", () => {
  it("単発タスクは期限を明日に", () => {
    const d = { tasks: [T("a", "簿記", "2026-11-17")] };
    expect(postponeTask(d, "a", "2026-11-17")).toBe("moved");
    expect(d.tasks[0].due).toBe("2026-11-18");
  });
  it("期限超過も今日基準で明日に（月末も繰り上がる）", () => {
    const d = { tasks: [T("a", "簿記", "2026-11-20")] };
    postponeTask(d, "a", "2026-11-30");
    expect(d.tasks[0].due).toBe("2026-12-01");
  });
  it("明日に同じ系列の回があれば今日の回は片付ける（重ならない）", () => {
    const d = { tasks: [T("a", "英会話", "2026-11-17", { repeatGroup: "g" }), T("b", "英会話", "2026-11-18", { repeatGroup: "g" })] };
    expect(postponeTask(d, "a", "2026-11-17")).toBe("skipped");
    expect(d.tasks.map((t) => t.id)).toEqual(["b"]);
  });
  it("進捗がある回は消さずに移す", () => {
    const d = { tasks: [T("a", "英会話", "2026-11-17", { repeatGroup: "g", progress: 30 }), T("b", "英会話", "2026-11-18", { repeatGroup: "g" })] };
    expect(postponeTask(d, "a", "2026-11-17")).toBe("moved");
    expect(d.tasks).toHaveLength(2);
  });
  it("完了済み・存在しないタスクは何もしない", () => {
    const d = { tasks: [T("a", "x", "2026-11-17", { done: true })] };
    expect(postponeTask(d, "a", "2026-11-17")).toBeNull();
    expect(postponeTask(d, "zz", "2026-11-17")).toBeNull();
  });
});
