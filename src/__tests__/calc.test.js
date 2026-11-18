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

// ── 固定資産・借入金・在庫 ─────────────────────────────────────────────────
import { depreciationYears, depreciationForMonth, bookValueAt, slRate, treatmentOptions, loanBalanceAt, loanPaymentFor, inventoryAdjust, defaultMethod } from "../aibou/assets.js";
const corp = { type: "法人", aoiro: true, employees: 3 };

describe("減価償却（国税庁の計算例と一致するか）", () => {
  const base = { cost: 1000000, acquired: "2026-04-01", start: "2026-04", kind: "other", life: 10, treatment: "normal" };
  it("定額法の償却率（1÷年数を小数第3位で切り上げ）", () => {
    expect(slRate(6)).toBe(0.167); expect(slRate(3)).toBe(0.334); expect(slRate(9)).toBe(0.112); expect(slRate(24)).toBe(0.042);
  });
  it("定額法：100万円・10年は毎年10万円、最後は99,999円で1円残す", () => {
    const y = depreciationYears({ ...base, method: "sl" }, 4, corp);
    expect(y).toHaveLength(10);
    expect(y.slice(0, 9).every((r) => r.amount === 100000)).toBe(true);
    expect(y[9].amount).toBe(99999); expect(y[9].bookEnd).toBe(1);
  });
  it("200%定率法：100万円・10年は1年目20万円、7〜9年目65,536円、最後65,535円", () => {
    const y = depreciationYears({ ...base, method: "db" }, 4, corp).map((r) => r.amount);
    expect(y).toEqual([200000, 160000, 128000, 102400, 81920, 65536, 65536, 65536, 65536, 65535]);
  });
  it("300万円の普通自動車（定額法・6年）は毎年501,000円、最後494,999円", () => {
    const y = depreciationYears({ cost: 3000000, start: "2026-04", kind: "car", treatment: "normal", method: "sl" }, 4, corp).map((r) => r.amount);
    expect(y).toEqual([501000, 501000, 501000, 501000, 501000, 494999]);
  });
  it("期の途中で使い始めたら月割（10月から3月までの6か月）", () => {
    const y = depreciationYears({ ...base, start: "2026-10", method: "sl" }, 4, corp);
    expect(y[0].months).toBe(6); expect(y[0].amount).toBe(50000);
  });
  it("毎月の減価償却費を足すと、その期の額になる", () => {
    const a = { ...base, start: "2026-10", method: "db" };
    const months = ["2026年10月", "2026年11月", "2026年12月", "2027年1月", "2027年2月", "2027年3月"];
    const total = months.reduce((t, m) => t + depreciationForMonth(a, m, 4, corp), 0);
    expect(total).toBe(depreciationYears(a, 4, corp)[0].amount);
    expect(depreciationForMonth(a, "2026年9月", 4, corp)).toBe(0);
  });
  it("一括償却資産は3年で均等（月割しない）", () => {
    const y = depreciationYears({ cost: 150000, start: "2026-12", kind: "pc", treatment: "lump3" }, 4, corp).map((r) => r.amount);
    expect(y).toEqual([50000, 50000, 50000]);
  });
  it("少額の特例は使い始めた月に全額", () => {
    const a = { cost: 350000, start: "2026-11", acquired: "2026-11-05", kind: "pc", treatment: "small" };
    expect(depreciationForMonth(a, "2026年11月", 4, corp)).toBe(350000);
    expect(depreciationForMonth(a, "2026年12月", 4, corp)).toBe(0);
  });
  it("土地は償却せず、ずっと買った金額", () => {
    const land = { cost: 20000000, acquired: "2026-05-01", start: "2026-05", kind: "land", treatment: "normal" };
    expect(depreciationYears(land, 4, corp)).toEqual([]);
    expect(bookValueAt(land, "2030年1月", 4, corp)).toBe(20000000);
  });
  it("帳簿価額 ＝ 取得価額 − ここまでの減価償却費", () => {
    const a = { ...base, method: "sl" };
    expect(bookValueAt(a, "2027年3月", 4, corp)).toBe(900000);
    expect(bookValueAt(a, "2026年3月", 4, corp)).toBe(0); // 買う前
  });
  it("判断待ちは通常の減価償却で見込みを出す", () => {
    const y = depreciationYears({ ...base, method: "sl", treatment: "pending" }, 4, corp);
    expect(y[0].amount).toBe(100000);
  });
  it("償却方法の初期値：法人の車は定率法、建物とソフトは定額法、個人は定額法", () => {
    expect(defaultMethod({ kind: "car" }, corp)).toBe("db");
    expect(defaultMethod({ kind: "bldg_wood_office" }, corp)).toBe("sl");
    expect(defaultMethod({ kind: "software" }, corp)).toBe("sl");
    expect(defaultMethod({ kind: "car" }, { type: "個人事業主" })).toBe("sl");
  });
  it("ソフトウェアは0円まで償却", () => {
    const y = depreciationYears({ cost: 500000, start: "2026-04", kind: "software", treatment: "normal" }, 4, corp);
    expect(y[y.length - 1].bookEnd).toBe(0);
  });
  it("金額からの扱いの候補（2026年4月以後は40万円未満まで特例）", () => {
    expect(treatmentOptions(150000, corp, "2026-11-01").opts).toEqual(["lump3", "small", "normal"]);
    expect(treatmentOptions(350000, corp, "2026-11-01").opts).toEqual(["small", "normal"]);
    expect(treatmentOptions(350000, corp, "2026-03-01").opts).toEqual(["normal"]);
    expect(treatmentOptions(350000, { ...corp, aoiro: false }, "2026-11-01").opts).toEqual(["normal"]);
  });
});

describe("借入金", () => {
  const loan = { amount: 1200000, date: "2026-04-10", start: "2026-05", monthly: 100000, rate: 2.4 };
  it("残高は借りた額 − 返した元金", () => {
    expect(loanBalanceAt(loan, "2026年4月")).toBe(1200000);
    expect(loanBalanceAt(loan, "2026年5月")).toBe(1100000);
    expect(loanBalanceAt(loan, "2027年4月")).toBe(0);
  });
  it("利息は月初の残高×年利÷12", () => {
    expect(loanPaymentFor(loan, "2026年5月")).toEqual({ principal: 100000, interest: 2400 });
    expect(loanPaymentFor(loan, "2026年6月").interest).toBe(2200);
  });
});

describe("在庫で売上原価を直す", () => {
  it("期首の在庫 ＋ 仕入れ − 期末の在庫", () => {
    expect(inventoryAdjust({ "2026年10月": 200000, "2026年11月": 300000 }, ["2026年11月"])).toEqual({ opening: 200000, closing: 300000 });
  });
  it("期末の在庫が入っていなければ直さない", () => {
    expect(inventoryAdjust({ "2026年10月": 200000 }, ["2026年11月"])).toBe(null);
  });
});

describe("PL・BSに固定資産・借入金・在庫を反映", () => {
  const ext = {
    startMonth: 4, profile: corp,
    assets: [{ id: 9, name: "社用車", cost: 3000000, acquired: "2026-11-01", start: "2026-11", kind: "car", treatment: "normal", method: "sl" }],
    loans: [{ amount: 1200000, date: "2026-11-01", start: "2026-12", monthly: 100000, rate: 2.4 }],
    inventory: { "2026年10月": 0, "2026年11月": 50000 },
  };
  const buy = { id: 99, month: "2026年11月", client: "車屋", account: "その他経費", amount: 3000000, status: "支払済", asset: 9 };
  const pl = plNumbers({ sales, expenses: [...expenses, buy], accounts, months: M, taxRate: 25, ext });
  it("車の購入は費用にせず、その月の減価償却費だけを入れる", () => {
    expect(pl.depTotal).toBe(depreciationForMonth(ext.assets[0], "2026年11月", 4, corp));
    expect(pl.sgaByAcc.find((x) => x.label === "その他")).toBeUndefined();
  });
  it("在庫の分だけ売上原価が減る", () => { expect(pl.cogs).toBe(120000 - 50000); });
  const bs = bsNumbers({ sales, expenses: [...expenses, buy], months: M, openingCash: 5000000, capital: 0, now: "2026年11月", ext });
  it("BSに固定資産・在庫・借入金が載り、左右が一致する", () => {
    expect(bs.fixed).toBe(3000000 - pl.depTotal);
    expect(bs.stock).toBe(50000);
    expect(bs.loanBal).toBe(1200000);
    expect(bs.cash).toBe(5000000 + 150000 - 203000 - 3000000 + 1200000);
    expect(bs.assets).toBe(bs.liab + bs.equity);
  });
});
