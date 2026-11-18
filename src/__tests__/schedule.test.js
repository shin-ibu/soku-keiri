import { describe, it, expect } from "vitest";
import { occursOn, parseScheduleText, autoItems, itemsForDay, isRestDay, DEFAULT_WORK } from "../aibou/schedule.js";

const TODAY = "2026-11-18"; // 水曜日

describe("くり返し", () => {
  it("毎週・毎月・毎月末", () => {
    expect(occursOn({ date: "2026-11-02", repeat: "weekly" }, "2026-11-16")).toBe(true);
    expect(occursOn({ date: "2026-11-02", repeat: "weekly" }, "2026-11-17")).toBe(false);
    expect(occursOn({ date: "2026-10-31", repeat: "monthly" }, "2026-11-30")).toBe(true); // 31日は月末に寄せる
    expect(occursOn({ date: "2026-11-01", repeat: "monthEnd" }, "2026-11-30")).toBe(true);
    expect(occursOn({ date: "2026-11-20", repeat: "weekly" }, "2026-11-13")).toBe(false); // 始まる前は出さない
  });
  it("休みの曜日", () => {
    expect(isRestDay("2026-11-21", DEFAULT_WORK)).toBe(true);
    expect(isRestDay("2026-11-18", DEFAULT_WORK)).toBe(false);
  });
});

describe("話し言葉から予定を作る", () => {
  it("明日10時に打ち合わせ", () => {
    expect(parseScheduleText("明日10時に山田さんと打ち合わせ", TODAY)).toEqual({ date: "2026-11-19", time: "10:00", title: "山田さんと打ち合わせ", type: "event" });
  });
  it("日付と午後・半", () => {
    const r = parseScheduleText("11月25日 午後2時半 現場確認の予定を入れて", TODAY);
    expect(r.date).toBe("2026-11-25"); expect(r.time).toBe("14:30"); expect(r.title).toBe("現場確認");
  });
  it("曜日（今週・来週）", () => {
    expect(parseScheduleText("金曜に見積もりを送る", TODAY)).toMatchObject({ date: "2026-11-20", type: "task", title: "見積もりを送る" });
    expect(parseScheduleText("来週の月曜 9時 定例", TODAY)).toMatchObject({ date: "2026-11-23", time: "09:00" });
    expect(parseScheduleText("水曜に電話", TODAY).date).toBe("2026-11-25");
  });
  it("過ぎた日付は来年・来月にする", () => {
    expect(parseScheduleText("1月5日 仕事始め", TODAY).date).toBe("2027-01-05");
    expect(parseScheduleText("3日に支払", TODAY).date).toBe("2026-12-03");
  });
  it("くり返し", () => {
    expect(parseScheduleText("毎週月曜 9時 定例", TODAY)).toEqual({ date: "2026-11-23", time: "09:00", title: "定例", type: "event", repeat: "weekly" });
    expect(parseScheduleText("毎月末に在庫を数える", TODAY)).toMatchObject({ date: "2026-11-30", repeat: "monthEnd", title: "在庫を数える" });
    expect(parseScheduleText("毎月25日に給与を払う", TODAY)).toMatchObject({ date: "2026-11-25", repeat: "monthly", type: "task" });
  });
  it("日付がなければ予定にしない", () => {
    expect(parseScheduleText("打ち合わせ", TODAY)).toBeNull();
  });
});

describe("経営の仕事を自動で並べる", () => {
  const sales = [{ id: 1, status: "未入金" }, { id: 2, status: "入金済" }];
  const invoices = [{ id: 10, saleId: 1, client: "A社", no: "2026-001", dueDate: "2026-11-30", calc: { total: 110000 } }, { id: 11, saleId: 2, client: "B社", no: "2026-002", dueDate: "2026-11-30", calc: { total: 5 } }];
  const estimates = [{ id: 20, status: "見積中", client: "C社", no: "Q-1", issueDate: "2026-11-01", validUntil: "2026-12-01", calc: { total: 1 } }];
  it("未入金の入金期限・見積もりの追いかけと期限", () => {
    const a = autoItems({ sales, invoices, estimates, today: TODAY });
    expect(a.map((x) => x.kind).sort()).toEqual(["入金期限", "見積期限", "追いかけ"]);
    expect(a.find((x) => x.kind === "追いかけ").date).toBe("2026-11-15");
  });
  it("その日の並び：時刻順 → 時刻なし → 経営の仕事", () => {
    const events = [{ id: 1, date: TODAY, time: "15:00", title: "B" }, { id: 2, date: TODAY, time: "09:00", title: "A" }, { id: 3, date: TODAY, title: "C", type: "task", doneDates: [TODAY] }];
    const r = itemsForDay(TODAY, { events, auto: [{ id: "x", auto: true, date: TODAY, title: "D" }] });
    expect(r.map((x) => x.title)).toEqual(["A", "B", "C", "D"]);
    expect(r[2].done).toBe(true);
  });
});
