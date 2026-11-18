// 計算の正しさを一つずつ確かめるテスト。数字に関わる部分を直したら必ず npm test を通す。
import { describe, it, expect } from "vitest";
import { fmt, fmtEx, monthOfDate, getFiscalMonths, getFiscalYear } from "../lib/format.js";
import { dueFromTerms, calcInvoice, nextInvoiceNo, lineAmount } from "../lib/invoice.js";
import { normRegNo, isValidRegNo, getSuggestion, typeLabel } from "../lib/master.js";
import { projectNumbers, suggestProject, plNumbers, bsNumbers, openingCashOf, COMMON } from "../aibou/keieiLogic.js";

describe("金額と日付の表示", () => {
  it("円の表示（税込・税抜）", () => {
    expect(fmt(1234567)).toBe("¥1,234,567");
    expect(fmt(null)).toBe("¥0");
    expect(fmtEx(110000)).toBe("¥100,000");
  });
  it("日付から何月分かを出す", () => {
    expect(monthOfDate("2026-11-18")).toBe("2026年11月");
  });
});

describe("決算期", () => {
  it("4月始まりなら4月〜翌3月の12か月", () => {
    const m = getFiscalMonths(4, 2026);
    expect(m).toHaveLength(12);
    expect(m[0]).toBe("2026年4月");
    expect(m[11]).toBe("2027年3月");
  });
  it("1月始まりはその年の1〜12月", () => {
    expect(getFiscalMonths(1, 2026)[11]).toBe("2026年12月");
  });
  it("今の決算期の始まりの年（期首月より前なら前の年）", () => {
    expect(getFiscalYear(4, 1, new Date(2026, 10, 18))).toBe(2026); // 11月
    expect(getFiscalYear(4, 1, new Date(2027, 1, 10))).toBe(2026);  // 翌年2月
  });
  it("第何期を変えても、期間はずれない（以前の不具合）", () => {
    const d = new Date(2026, 10, 18);
    expect(getFiscalYear(4, 3, d)).toBe(getFiscalYear(4, 1, d));
  });
});

describe("支払期限（支払条件から）", () => {
  it("月末締め翌月末払い", () => expect(dueFromTerms("月末締め翌月末払い", "2026-11-18")).toBe("2026-12-31"));
  it("月末締め翌々月末払い（年をまたぐ）", () => expect(dueFromTerms("月末締め翌々月末払い", "2026-11-18")).toBe("2027-01-31"));
  it("20日締め：20日までは翌月末", () => expect(dueFromTerms("20日締め翌月末払い", "2026-11-20")).toBe("2026-12-31"));
  it("20日締め：21日からは翌々月末", () => expect(dueFromTerms("20日締め翌月末払い", "2026-11-21")).toBe("2027-01-31"));
  it("2月の月末", () => expect(dueFromTerms("月末締め翌月末払い", "2028-01-10")).toBe("2028-02-29"));
  it("都度は自動で入れない", () => expect(dueFromTerms("都度", "2026-11-18")).toBe(""));
});

describe("請求書の金額（インボイス）", () => {
  it("明細の金額は数量×単価", () => expect(lineAmount({ qty: 3, price: 1500 })).toBe(4500));
  it("消費税は税率ごとに1回だけ切り捨て", () => {
    const r = calcInvoice([
      { qty: 1, price: 999, tax: 10 }, { qty: 1, price: 999, tax: 10 }, // 1,998円 → 199.8 → 199円
      { qty: 1, price: 1001, tax: 8 },                                   // 1,001円 → 80.08 → 80円
    ]);
    expect(r.subtotal).toBe(2999);
    expect(r.rates.find((x) => x.rate === 10).tax).toBe(199);
    expect(r.rates.find((x) => x.rate === 8).tax).toBe(80);
    expect(r.taxTotal).toBe(279);
    expect(r.total).toBe(3278);
  });
  it("非課税は消費税0", () => {
    const r = calcInvoice([{ qty: 2, price: 5000, tax: 0 }]);
    expect(r.taxTotal).toBe(0); expect(r.total).toBe(10000);
  });
  it("請求番号は年ごとの連番", () => {
    expect(nextInvoiceNo([], {}, "2026-11-18").no).toBe("2026-001");
    expect(nextInvoiceNo([{ year: "2026", seq: 4 }], { 2026: 2 }, "2026-12-01").no).toBe("2026-005");
    expect(nextInvoiceNo([{ year: "2026", seq: 4 }], {}, "2027-01-05").no).toBe("2027-001");
  });
});

describe("登録番号・科目・種類", () => {
  it("全角でも登録番号として扱う", () => {
    expect(normRegNo("ｔ１２３４５６７８９０１２３")).toBe("T1234567890123");
    expect(isValidRegNo("T1234567890123")).toBe(true);
    expect(isValidRegNo("T123")).toBe(false);
  });
  it("メモから勘定科目を提案", () => expect(getSuggestion("タクシー代")).toBe("旅費交通費"));
  it("種類の表示は正式な言葉", () => {
    expect(typeLabel("売掛")).toBe("売掛（後日入金）");
    expect(typeLabel("買掛")).toBe("買掛（後日支払）");
  });
});

// 見本：11月の数字
const M = ["2026年11月"];
const projects = [{ id: 1, name: "A案件", client: "A社", status: "進行中" }, { id: 2, name: "B案件", client: "B社", status: "進行中" }];
const sales = [
  { id: 1, month: "2026年11月", client: "A社", amount: 300000, status: "未入金", project: 1 },
  { id: 2, month: "2026年11月", client: "B社", amount: 100000, status: "入金済", project: 2 },
  { id: 3, month: "2026年11月", client: "C社", amount: 50000, status: "入金済" }, // 未設定
  { id: 4, month: "2026年10月", client: "A社", amount: 999999, status: "入金済", project: 1 }, // 期間外
];
const expenses = [
  { id: 1, month: "2026年11月", client: "材料店", account: "売上原価", amount: 120000, status: "支払済", project: 1 },
  { id: 2, month: "2026年11月", client: "外注さん", account: "外注費", amount: 30000, status: "未払い", project: 2 },
  { id: 3, month: "2026年11月", client: "ビル", account: "地代家賃", amount: 80000, status: "支払済", project: COMMON },
  { id: 4, month: "2026年11月", client: "文具店", account: "消耗品費", amount: 3000, status: "支払済" }, // 未設定
];
const accounts = [
  { label: "売上高", category: "revenue" }, { label: "売上原価", category: "cogs" },
  { label: "外注費", category: "sga" }, { label: "地代家賃", category: "sga" }, { label: "消耗品費", category: "sga" },
];

describe("案件の数字（機能一覧14章）", () => {
  const n = projectNumbers({ projects, sales, expenses, months: M });
  const a = n.rows.find((r) => r.p.id === 1), b = n.rows.find((r) => r.p.id === 2);
  it("案件粗利 ＝ 案件の売上 − 案件原価（期間外は入れない）", () => {
    expect(a.sale).toBe(300000); expect(a.cost).toBe(120000); expect(a.gross).toBe(180000);
    expect(b.gross).toBe(70000);
  });
  it("共通費は売上の比率で配賦（3:1）", () => {
    expect(n.commonTotal).toBe(80000);
    expect(a.alloc).toBe(60000); expect(b.alloc).toBe(20000);
    expect(a.profit).toBe(120000); expect(b.profit).toBe(50000);
  });
  it("未設定はどの案件にも入らず、別に数える", () => {
    expect(n.unsetS.map((r) => r.id)).toEqual([3]);
    expect(n.unsetE.map((r) => r.id)).toEqual([4]);
  });
  it("案件の売上がない期間は配賦しない", () => {
    const z = projectNumbers({ projects, sales: [], expenses, months: M });
    expect(z.rows.every((r) => r.alloc === 0)).toBe(true);
  });
});

describe("案件の提案", () => {
  it("同じ支払先・科目を前に共通費にしていれば共通費", () => {
    expect(suggestProject({ kind: "expense", client: "ビル", account: "地代家賃", sales, expenses, projects })).toEqual({ value: COMMON, why: "前回と同じく共通費" });
  });
  it("同じ取引先の進行中の案件を提案", () => {
    expect(suggestProject({ kind: "sale", client: "A社", sales, expenses, projects }).value).toBe(1);
  });
  it("完了した案件は提案しない", () => {
    const done = projects.map((p) => (p.id === 1 ? { ...p, status: "完了" } : p));
    expect(suggestProject({ kind: "sale", client: "A社", sales, expenses, projects: done })).toBe(null);
  });
  it("取引先がなければ提案しない", () => expect(suggestProject({ kind: "sale", client: "", sales, expenses, projects })).toBe(null));
});

describe("損益計算書（PL）", () => {
  const pl = plNumbers({ sales, expenses, accounts, months: M, taxRate: 25 });
  it("売上高 → 粗利 → 営業利益", () => {
    expect(pl.revenue).toBe(450000);
    expect(pl.cogs).toBe(120000);
    expect(pl.gross).toBe(330000);
    expect(pl.sga).toBe(113000);
    expect(pl.op).toBe(217000);
  });
  it("法人税等は経常利益×税率の概算、当期純利益はその残り", () => {
    expect(pl.ordinary).toBe(217000);
    expect(pl.tax).toBe(54250);
    expect(pl.net).toBe(162750);
  });
  it("赤字なら税金は0", () => {
    const r = plNumbers({ sales: [], expenses, accounts, months: M, taxRate: 25 });
    expect(r.op).toBeLessThan(0); expect(r.tax).toBe(0); expect(r.net).toBe(r.ordinary);
  });
  it("設定にない科目は販管費の「その他」に入る", () => {
    const r = plNumbers({ sales, expenses: [...expenses, { month: "2026年11月", account: "謎の科目", amount: 1000 }], accounts, months: M });
    expect(r.sgaByAcc.find((x) => x.label === "その他").v).toBe(1000);
  });
});

describe("貸借対照表（BS）", () => {
  const bs = bsNumbers({ sales, expenses, months: M, openingCash: 1000000, capital: "300000" });
  it("現金・預金 ＝ 期首 ＋ 入金済の売上 − 支払済の経費（期間内）", () => {
    expect(bs.cash).toBe(1000000 + 150000 - 203000);
  });
  it("売掛金と未払金", () => { expect(bs.ar).toBe(300000); expect(bs.ap).toBe(30000); });
  it("資産 ＝ 負債 ＋ 純資産（左右が一致）", () => {
    expect(bs.assets).toBe(bs.liab + bs.equity);
    expect(bs.equity).toBe(bs.capital + bs.retained);
  });
  it("期首の残高の読み取り（未入力は null）", () => {
    expect(openingCashOf({ company: { openingCash: "" } })).toBe(null);
    expect(openingCashOf({ company: { openingCash: 1500000 } })).toBe(1500000);
  });
});
