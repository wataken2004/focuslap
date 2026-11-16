import { describe, it, expect } from "vitest";
import { skipMissedDaily, isMissedDaily, countMissedDaily } from "./daily.js";
import { groupTasksByTitle, sameSeries } from "./taskGroups.jsx";
import { weekStart, weekSummary } from "./review.jsx";
import { countTitles } from "./brief.jsx";

const T = (id, title, due, extra = {}) => ({ id, title, due, done: false, goalId: null, ...extra });
const D = (tasks, settings = {}) => ({ tasks, settings: { ...settings } });
const today = "2026-11-17";

describe("skipMissedDaily — やらなかった毎日タスク", () => {
  it("事前生成の系列：過去の未着手回を削除し、今日以降は残す", () => {
    const d = D([
      T("a", "英会話", "2026-11-15", { repeat: "daily", repeatGroup: "g" }),
      T("b", "英会話", "2026-11-16", { repeat: "daily", repeatGroup: "g" }),
      T("c", "英会話", "2026-11-17", { repeat: "daily", repeatGroup: "g" }),
    ]);
    const r = skipMissedDaily(d, today);
    expect(d.tasks.map((t) => t.id)).toEqual(["c"]);
    expect(r.removed).toEqual(["英会話", "英会話"]);
  });
  it("完了で次を作る系列：消さずに今日へ繰り越す", () => {
    const d = D([T("a", "筋トレ", "2026-11-14", { repeat: "daily" })]);
    const r = skipMissedDaily(d, today);
    expect(d.tasks[0].due).toBe(today);
    expect(r.moved).toEqual(["筋トレ"]);
  });
  it("最終日を過ぎた繰り越し系列は片付ける", () => {
    const d = D([T("a", "筋トレ", "2026-11-14", { repeat: "daily", repeatUntil: "2026-11-15" })]);
    skipMissedDaily(d, today);
    expect(d.tasks).toHaveLength(0);
  });
  it("完了・進捗あり・引き継ぎメモあり・毎週・予定・単発は触らない", () => {
    const keep = [
      T("1", "x", "2026-11-10", { repeat: "daily", repeatGroup: "g", done: true }),
      T("2", "x", "2026-11-10", { repeat: "daily", repeatGroup: "g", progress: 30 }),
      T("3", "x", "2026-11-10", { repeat: "daily", repeatGroup: "g", progressNote: "続きはp.20" }),
      T("4", "y", "2026-11-10", { repeat: "weekly", repeatGroup: "h" }),
      T("5", "z", "2026-11-10", { kind: "event", repeat: "daily" }),
      T("6", "w", "2026-11-10"),
    ];
    const d = D(keep.map((t) => ({ ...t })));
    skipMissedDaily(d, today);
    expect(d.tasks).toEqual(keep);
  });
  it("設定OFFなら何もしない", () => {
    const d = D([T("a", "英会話", "2026-11-15", { repeat: "daily", repeatGroup: "g" })], { skipMissedDaily: false });
    skipMissedDaily(d, today);
    expect(d.tasks).toHaveLength(1);
    expect(countMissedDaily(d, today)).toBe(0);
  });
  it("削除した回を指す nextId を掃除", () => {
    const d = D([T("p", "英会話", "2026-11-14", { done: true, nextId: "a" }), T("a", "英会話", "2026-11-15", { repeat: "daily", repeatGroup: "g" })]);
    skipMissedDaily(d, today);
    expect(d.tasks[0].nextId).toBeUndefined();
  });
  it("isMissedDaily は今日の回を対象にしない", () => expect(isMissedDaily(T("a", "x", today, { repeat: "daily" }), today)).toBe(false));
});

describe("系列キー — 名前を変えても同じ繰り返し系列はまとまる", () => {
  it("repeatGroup が同じなら名前違いでも1グループ、表示名は最新の回", () => {
    const tasks = [
      T("a", "英会話", "2026-11-17", { repeatGroup: "g" }),
      T("b", "DMM英会話", "2026-11-18", { repeatGroup: "g" }),
      T("c", "簿記", "2026-11-17"),
    ];
    const g = groupTasksByTitle(tasks);
    expect(g).toHaveLength(2);
    expect(g[0].items.map((t) => t.id)).toEqual(["a", "b"]);
    expect(g[0].title).toBe("DMM英会話");
  });
  it("同名・別系列もつながり、絞り込んだ一覧でも全体のキーで束ねる", () => {
    const all = [
      T("a", "英会話", "2026-11-17", { repeatGroup: "g1" }),
      T("b", "英会話", "2026-11-18", { repeatGroup: "g2" }),
      T("c", "英会話(朝)", "2026-11-19", { repeatGroup: "g2" }),
    ];
    expect(groupTasksByTitle([all[0], all[2]], all)).toHaveLength(1);
    expect(sameSeries(all, all[0]).map((t) => t.id)).toEqual(["a", "b", "c"]);
  });
  it("予定（event）は系列に含めない", () => {
    const all = [T("a", "会議", "2026-11-17"), T("b", "会議", "2026-11-18", { kind: "event" })];
    expect(sameSeries(all, all[0]).map((t) => t.id)).toEqual(["a"]);
  });
});

describe("weekSummary — 週のふりかえり", () => {
  it("weekStart は月曜はじまり（日曜は前週）", () => {
    expect(weekStart("2026-11-17")).toBe("2026-11-16");
    expect(weekStart("2026-11-22")).toBe("2026-11-16");
    expect(weekStart("2026-11-16")).toBe("2026-11-16");
  });
  it("日別・先週比・目標別（削除済みタスクはアーカイブから）・完了・魚", () => {
    const data = {
      goals: [{ id: "g1", title: "TOEIC", type: "goal" }],
      tasks: [T("t1", "英会話", "2026-11-17", { goalId: "g1" }), T("t2", "簿記", null)],
      archive: [
        { id: "gone", title: "卒論", goalTitle: "卒業", goalType: "work", completedAt: "2026-11-18" },
        { id: "old", title: "古い", completedAt: "2026-11-09" },
      ],
      sessions: [
        { date: "2026-11-16", minutes: 25, taskId: "t1", fish: "🐟" },
        { date: "2026-11-17", minutes: 50, taskId: "gone", fish: "🐟" },
        { date: "2026-11-17", minutes: 10, taskId: null, fish: "🐠" },
        { date: "2026-11-18", minutes: 30, taskId: "t2", fish: "🐠" },
        { date: "2026-11-10", minutes: 40, taskId: "t1", fish: "🐟" },
        { date: "2026-11-23", minutes: 99, taskId: "t1", fish: "🐟" },
      ],
    };
    const w = weekSummary(data, "2026-11-16");
    expect(w.minutes).toBe(115);
    expect(w.prevMinutes).toBe(40);
    expect(w.days.map((d) => d.minutes)).toEqual([25, 60, 30, 0, 0, 0, 0]);
    expect(w.best.date).toBe("2026-11-17");
    expect(w.activeDays).toBe(3);
    expect(w.byGoal).toEqual([
      { title: "卒業", type: "work", minutes: 50 },
      { title: "目標なし", type: null, minutes: 40 },
      { title: "TOEIC", type: "goal", minutes: 25 },
    ]);
    expect(w.byTask[0]).toEqual({ title: "卒論", minutes: 50, sessions: 1 });
    expect(w.completed.map((a) => a.id)).toEqual(["gone"]);
    expect(w.fish).toEqual({ "🐟": 2, "🐠": 2 });
  });
});

describe("weekSummary — 週の途中の先週比", () => {
  it("今週の途中なら先週の同じ曜日までと比べる", () => {
    const data = { goals: [], tasks: [], archive: [], sessions: [
      { date: "2026-11-09", minutes: 30 }, { date: "2026-11-10", minutes: 20 }, { date: "2026-11-12", minutes: 99 },
      { date: "2026-11-17", minutes: 10 },
    ] };
    const w = weekSummary(data, "2026-11-16", "2026-11-17");
    expect(w.partial).toBe(true);
    expect(w.prevMinutes).toBe(50);
    expect(weekSummary(data, "2026-11-16").prevMinutes).toBe(149);
  });
});

describe("countTitles", () => {
  it("同名を ×n にまとめる", () => expect(countTitles(["英会話", "簿記", "英会話"])).toEqual(["英会話 ×2", "簿記"]));
});
