// AIBOU 経営の計算（画面から切り離した部分）
import { useMemo } from "react";

export const PROJECT_STATUSES = ["見積中", "進行中", "完了", "失注"];
export const ACTIVE = (p) => p.status === "見積中" || p.status === "進行中";
export const COMMON = "common";
export const sum = (rows) => rows.reduce((s, r) => s + (r.amount || 0), 0);

// 案件の欄の表示名
export const projectLabel = (rec, projects, kind) => {
  if (rec.project === COMMON) return kind === "sale" ? "案件なし" : "共通費";
  const p = projects.find((x) => x.id === rec.project);
  return p ? p.name : "未設定";
};

// AIBOUの提案：前回と同じ扱い、または取引先の進行中の案件
export function suggestProject({ kind, client, account, sales, expenses, projects }) {
  if (!client) return null;
  if (kind === "expense" && account && expenses.some((e) => e.client === client && e.account === account && e.project === COMMON))
    return { value: COMMON, why: "前回と同じく共通費" };
  const past = [...sales, ...expenses].filter((r) => r.client === client && typeof r.project === "number").sort((a, b) => String(b.date).localeCompare(String(a.date)));
  for (const r of past) { const p = projects.find((x) => x.id === r.project && ACTIVE(x)); if (p) return { value: p.id, why: "この取引先の進行中の案件" }; }
  const byClient = projects.filter((p) => ACTIVE(p) && p.client === client);
  if (byClient.length === 1) return { value: byClient[0].id, why: "この取引先の進行中の案件" };
  return null;
}

// 期間内の案件の数字（機能一覧14章の式）
export function projectNumbers({ projects, sales, expenses, months }) {
  const inP = (r) => months.includes(r.month);
  const S = sales.filter(inP), E = expenses.filter(inP);
  const isUnset = (r) => r.project === undefined || r.project === null;
  const common = E.filter((e) => e.project === COMMON);
  const rows = projects.map((p) => {
    const ps = S.filter((r) => r.project === p.id), pe = E.filter((r) => r.project === p.id);
    const sale = sum(ps), cost = sum(pe);
    return { p, ps, pe, sale, cost, gross: sale - cost };
  });
  const linkedSales = rows.reduce((t, r) => t + r.sale, 0);
  const commonTotal = sum(common);
  rows.forEach((r) => { r.alloc = linkedSales ? Math.round((commonTotal * r.sale) / linkedSales) : 0; r.profit = r.gross - r.alloc; });
  return { rows, common, commonTotal, unsetS: S.filter(isUnset), unsetE: E.filter(isUnset), linkedSales };
}
export function useProjectNumbers(args) {
  const { projects, sales, expenses, months } = args;
  return useMemo(() => projectNumbers({ projects, sales, expenses, months }), [projects, sales, expenses, months]);
}

// 損益計算書（PL）：売上高から当期純利益（見込み）まで
export function plNumbers({ sales, expenses, accounts, months, taxRate = 25 }) {
  const S = sales.filter((r) => months.includes(r.month)), E = expenses.filter((r) => months.includes(r.month));
  const revenue = sum(S);
  const cogsRows = E.filter((e) => e.account === "売上原価");
  const cogs = sum(cogsRows);
  const gross = revenue - cogs;
  const sgaAcc = accounts.filter((a) => a.category === "sga");
  const sgaByAcc = sgaAcc.map((a) => ({ label: a.label, rows: E.filter((e) => e.account === a.label) })).map((x) => ({ ...x, v: sum(x.rows) })).filter((x) => x.v);
  const other = E.filter((e) => e.account !== "売上原価" && !sgaAcc.some((a) => a.label === e.account));
  if (other.length) sgaByAcc.push({ label: "その他", rows: other, v: sum(other) });
  const sga = sgaByAcc.reduce((t, x) => t + x.v, 0);
  const op = gross - sga;
  const nonOp = 0;
  const ordinary = op + nonOp;
  const rate = Number(taxRate || 0);
  const tax = ordinary > 0 ? Math.round((ordinary * rate) / 100) : 0;
  return { S, E, revenue, cogsRows, cogs, gross, sgaByAcc, sga, op, nonOp, ordinary, taxRate: rate, tax, net: ordinary - tax };
}

// 貸借対照表（BS）の簡易版：現金・預金、売掛金、未払金から作る。純資産は差額
export function bsNumbers({ sales, expenses, months, openingCash, capital }) {
  const inFy = (r) => months.includes(r.month);
  const received = sales.filter((r) => inFy(r) && r.status === "入金済");
  const paid = expenses.filter((r) => inFy(r) && r.status === "支払済");
  const cash = (openingCash || 0) + sum(received) - sum(paid);
  const arRows = sales.filter((r) => r.status === "未入金"), apRows = expenses.filter((r) => r.status === "未払い");
  const ar = sum(arRows), ap = sum(apRows);
  const assets = cash + ar, liab = ap, equity = assets - liab;
  const cap = Number(capital || 0);
  return { received, paid, cash, arRows, apRows, ar, ap, assets, liab, equity, capital: cap, retained: equity - cap };
}

export function openingCashOf(master) { const v = master?.company?.openingCash; return v === "" || v === undefined || v === null ? null : Number(v); }
