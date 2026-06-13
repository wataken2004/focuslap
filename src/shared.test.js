import { describe, it, expect } from "vitest";
import { fishForMinutes, nextRepeatDate, repeatDates, stageOf, fmt, addDays, FISHES } from "./shared.jsx";

describe("fishForMinutes — 集中時間 → 獲得魚", () => {
  it("各しきい値ちょうどで対応する魚を返す", () => {
    expect(fishForMinutes(5).e).toBe("🫧");
    expect(fishForMinutes(10).e).toBe("🐠");
    expect(fishForMinutes(15).e).toBe("🐟");
    expect(fishForMinutes(25).e).toBe("🐡");
    expect(fishForMinutes(30).e).toBe("🐙");
    expect(fishForMinutes(40).e).toBe("🦑");
    expect(fishForMinutes(50).e).toBe("🐬");
    expect(fishForMinutes(60).e).toBe("🦈");
    expect(fishForMinutes(75).e).toBe("🦭");
    expect(fishForMinutes(90).e).toBe("🐳");
    expect(fishForMinutes(120).e).toBe("🦕");
  });

  it("しきい値の途中は1つ下の魚になる", () => {
    expect(fishForMinutes(14).e).toBe("🐠");
    expect(fishForMinutes(24).e).toBe("🐟");
    expect(fishForMinutes(59).e).toBe("🐬");
    expect(fishForMinutes(119).e).toBe("🐳");
  });

  it("最小未満は最小の魚、最大超過は最大の魚を返す", () => {
    expect(fishForMinutes(4).e).toBe("🫧");
    expect(fishForMinutes(0).e).toBe("🫧");
    expect(fishForMinutes(999).e).toBe("🦕");
  });

  it("FISHESは分数の昇順で定義されている", () => {
    for (let i = 1; i < FISHES.length; i++) {
      expect(FISHES[i].minutes).toBeGreaterThan(FISHES[i - 1].minutes);
    }
  });
});

describe("nextRepeatDate — 繰り返しの次回日付", () => {
  it("daily / weekly / biweekly", () => {
    expect(nextRepeatDate("2026-06-13", "daily")).toBe("2026-06-14");
    expect(nextRepeatDate("2026-06-13", "weekly")).toBe("2026-06-20");
    expect(nextRepeatDate("2026-06-13", "biweekly")).toBe("2026-06-27");
  });

  it("monthly / bimonthly は同じ日に進む", () => {
    expect(nextRepeatDate("2026-06-13", "monthly")).toBe("2026-07-13");
    expect(nextRepeatDate("2026-06-13", "bimonthly")).toBe("2026-08-13");
  });

  it("月またぎは月末に丸める（1/31 → 2/28）", () => {
    expect(nextRepeatDate("2026-01-31", "monthly")).toBe("2026-02-28");
    expect(nextRepeatDate("2024-12-31", "bimonthly")).toBe("2025-02-28");
  });

  it("日や月を正しく繰り上げる", () => {
    expect(nextRepeatDate("2026-12-31", "daily")).toBe("2027-01-01");
    expect(nextRepeatDate("2026-12-15", "monthly")).toBe("2027-01-15");
  });
});

describe("repeatDates — 最終日までの全回分", () => {
  it("初回〜最終日を含む全日付を返す", () => {
    expect(repeatDates("2026-06-13", "weekly", "2026-07-11")).toEqual([
      "2026-06-13", "2026-06-20", "2026-06-27", "2026-07-04", "2026-07-11",
    ]);
  });

  it("最終日が初回より前なら空配列", () => {
    expect(repeatDates("2026-06-13", "daily", "2026-06-10")).toEqual([]);
  });

  it("初回=最終日なら1件", () => {
    expect(repeatDates("2026-06-13", "daily", "2026-06-13")).toEqual(["2026-06-13"]);
  });

  it("暴走防止に370件で打ち切る", () => {
    const r = repeatDates("2020-01-01", "daily", "2030-01-01");
    expect(r.length).toBe(370);
  });
});

describe("stageOf — セッション回数 → 成長ステージ", () => {
  it("回数ごとのラベル", () => {
    expect(stageOf(0).label).toBe("たまご");
    expect(stageOf(1).label).toBe("稚魚");
    expect(stageOf(2).label).toBe("稚魚");
    expect(stageOf(3).label).toBe("若魚");
    expect(stageOf(4).label).toBe("若魚");
    expect(stageOf(5).label).toBe("成魚");
    expect(stageOf(7).label).toBe("成魚");
    expect(stageOf(8).label).toBe("大物");
  });

  it("大物のサイズは52で頭打ち", () => {
    expect(stageOf(8).size).toBe(42);
    expect(stageOf(100).size).toBe(52);
  });
});

describe("日付ユーティリティ", () => {
  it("fmt はローカル時刻でゼロ埋めYYYY-MM-DD", () => {
    expect(fmt(new Date(2026, 0, 5))).toBe("2026-01-05");
    expect(fmt(new Date(2026, 11, 31))).toBe("2026-12-31");
  });

  it("addDays は月・年をまたいで繰り上げる", () => {
    expect(fmt(addDays(new Date(2026, 5, 30), 1))).toBe("2026-07-01");
    expect(fmt(addDays(new Date(2026, 11, 31), 1))).toBe("2027-01-01");
    expect(fmt(addDays(new Date(2026, 5, 13), -1))).toBe("2026-06-12");
  });
});
