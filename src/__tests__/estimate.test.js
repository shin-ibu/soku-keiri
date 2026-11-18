import { describe, it, expect } from "vitest";
import { matchEstimates, remainingOf, estimateStatusAfter, defaultValidUntil } from "../lib/estimate.js";

const est = (id, client, total, extra = {}) => ({ id, no: `Q-2026-00${id}`, client, cpId: extra.cpId, calc: { total }, status: "見積中", issueDate: "2026-11-01", items: [], ...extra });
const inv = (estimateId, total) => ({ id: Math.random(), estimateId, calc: { total } });

describe("見積もりの照合（これですか？）", () => {
  const ests = [est(1, "株式会社サンプル", 330000), est(2, "サンプル", 110000), est(3, "別の会社", 330000)];

  it("同じ相手・同じ金額は「same」で一番上", () => {
    const r = matchEstimates(ests, [], { client: "サンプル", amount: 330000 });
    expect(r[0].est.id).toBe(1);
    expect(r[0].kind).toBe("same");
    expect(r.find((c) => c.est.id === 3)).toBeUndefined(); // 別の相手は出さない
  });

  it("±10%以内は「near」で差額を出す", () => {
    const r = matchEstimates([est(1, "A社", 330000)], [], { client: "A社", amount: 352000 });
    expect(r[0].kind).toBe("near");
    expect(r[0].diff).toBe(22000);
    expect(r[0].label).toContain("22,000円多い");
  });

  it("少ない金額は「part」（着手金など）で残りを出す", () => {
    const r = matchEstimates([est(1, "A社", 1100000)], [], { client: "A社", amount: 330000 });
    expect(r[0].kind).toBe("part");
    expect(r[0].label).toContain("770,000円");
  });

  it("一部請求したあとは、残りの金額と比べる", () => {
    const e = est(1, "A社", 1100000);
    const invoices = [inv(1, 330000)];
    expect(remainingOf(e, invoices)).toBe(770000);
    const r = matchEstimates([e], invoices, { client: "A社", amount: 770000 });
    expect(r[0].kind).toBe("same");
  });

  it("請求書なしで入れた売上も見積もりの請求に数える", () => {
    const e = est(1, "A社", 500000);
    expect(remainingOf(e, [], [{ estimateId: 1, amount: 200000 }])).toBe(300000);
    expect(remainingOf(e, [], [{ estimateId: 1, amount: 200000, invoiceId: 9 }])).toBe(500000); // 請求書の売上は二重に数えない
  });

  it("失注・請求済の見積もりは候補に出さない", () => {
    const r = matchEstimates([est(1, "A社", 100000, { status: "失注" }), est(2, "A社", 100000, { status: "請求済" })], [], { client: "A社", amount: 100000 });
    expect(r).toHaveLength(0);
  });

  it("相手先IDが同じなら名前の書き方が違っても候補に出す", () => {
    const r = matchEstimates([est(1, "（株）エー", 100000, { cpId: 7 })], [], { client: "エー商事", cpId: 7, amount: 100000 });
    expect(r[0].kind).toBe("same");
  });
});

describe("見積もりの状態", () => {
  it("全額請求で請求済、一部で受注、失注はそのまま", () => {
    const e = est(1, "A社", 300000);
    expect(estimateStatusAfter(e, [inv(1, 300000)])).toBe("請求済");
    expect(estimateStatusAfter(e, [inv(1, 100000)])).toBe("受注");
    expect(estimateStatusAfter(e, [])).toBe("見積中");
    expect(estimateStatusAfter({ ...e, status: "失注" }, [inv(1, 300000)])).toBe("失注");
  });
  it("有効期限は見積日から30日", () => {
    expect(defaultValidUntil("2026-11-18")).toBe("2026-12-18");
    expect(defaultValidUntil("2026-01-31")).toBe("2026-03-02");
  });
});
