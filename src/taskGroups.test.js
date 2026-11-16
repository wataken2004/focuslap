import { describe, it, expect } from "vitest";
import { groupTasksByTitle, nearestOpen, deleteTaskIds, completedToday, dueLabel, titleKey } from "./taskGroups.jsx";

const T = (id, title, due, extra = {}) => ({ id, title, due, done: false, goalId: null, ...extra });

describe("groupTasksByTitle — 同名タスクのまとめ", () => {
  it("同じタイトルを1グループにし、出現順・期限順で並べる", () => {
    const g = groupTasksByTitle([
      T("a", "英会話", "2026-11-19"), T("b", "簿記", "2026-11-17"),
      T("c", "英会話", "2026-11-17"), T("d", "英会話", null),
    ]);
    expect(g.map((x) => x.title)).toEqual(["英会話", "簿記"]);
    expect(g[0].items.map((t) => t.id)).toEqual(["c", "a", "d"]);
  });
  it("前後空白・連続空白・大文字小文字の違いは同じタスク扱い", () => {
    expect(titleKey({ title: " Online  English " })).toBe(titleKey({ title: "online english" }));
    expect(groupTasksByTitle([T("a", "DMM 英会話"), T("b", " dmm  英会話")])).toHaveLength(1);
  });
});

describe("nearestOpen — グループの直近の回", () => {
  const items = [
    T("p", "x", "2026-11-15"), T("q", "x", "2026-11-16"),
    T("r", "x", "2026-11-17"), T("s", "x", "2026-11-18"),
  ];
  it("今日の回があれば今日", () => expect(nearestOpen(items, "2026-11-17").id).toBe("r"));
  it("今日がなければ今日以降で最も近い日", () => expect(nearestOpen(items.filter((t) => t.id !== "r"), "2026-11-17").id).toBe("s"));
  it("すべて過去なら最も新しい期限超過", () => expect(nearestOpen(items.slice(0, 2), "2026-11-17").id).toBe("q"));
  it("完了済みは除外、全部完了ならnull", () => {
    expect(nearestOpen([T("r", "x", "2026-11-17", { done: true }), T("s", "x", "2026-11-18")], "2026-11-17").id).toBe("s");
    expect(nearestOpen([T("r", "x", "2026-11-17", { done: true })], "2026-11-17")).toBeNull();
  });
});

describe("deleteTaskIds — まとめて削除", () => {
  it("指定したタスクだけ消し、アーカイブ・セッションは残す", () => {
    const d = {
      tasks: [T("a", "x", "2026-11-17"), T("b", "x", "2026-11-18"), T("c", "y", "2026-11-18")],
      archive: [{ id: "a", completedAt: "2026-11-17" }], sessions: [{ taskId: "a" }],
    };
    deleteTaskIds(d, ["a", "b"]);
    expect(d.tasks.map((t) => t.id)).toEqual(["c"]);
    expect(d.archive).toHaveLength(1);
    expect(d.sessions).toHaveLength(1);
  });
  it("削除した次回分を指す nextId を掃除する", () => {
    const d = { tasks: [T("a", "x", "2026-11-17", { done: true, nextId: "b" }), T("b", "x", "2026-11-18")] };
    deleteTaskIds(d, ["b"]);
    expect(d.tasks[0].nextId).toBeUndefined();
  });
});

describe("completedToday — 今日完了したタスク", () => {
  it("アーカイブの completedAt が今日で、まだ完了状態のタスクを完了順に返す", () => {
    const data = {
      tasks: [T("a", "A", "2026-11-17", { done: true }), T("b", "B", "2026-11-17", { done: true }), T("c", "C", null, { done: true }), T("e", "E", "2026-11-17", { done: true, kind: "event" })],
      archive: [{ id: "b", completedAt: "2026-11-17" }, { id: "a", completedAt: "2026-11-17" }, { id: "c", completedAt: "2026-11-16" }, { id: "e", completedAt: "2026-11-17" }],
    };
    expect(completedToday(data, "2026-11-17").map((t) => t.id)).toEqual(["b", "a"]);
  });
});

describe("dueLabel", () => {
  it("今日・明日・期限超過・通常日", () => {
    expect(dueLabel("2026-11-17", "2026-11-17")).toBe("今日");
    expect(dueLabel("2026-11-18", "2026-11-17")).toBe("明日");
    expect(dueLabel("2026-11-15", "2026-11-17")).toBe("期限超過 11/15(日)");
    expect(dueLabel("2026-11-20", "2026-11-17")).toBe("11/20(金)");
    expect(dueLabel(null, "2026-11-17")).toBe("期限なし");
  });
  it("月末の翌日も明日になる", () => expect(dueLabel("2026-12-01", "2026-11-30")).toBe("明日"));
});
