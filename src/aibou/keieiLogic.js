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
export function useProjectNumbers({ projects, sales, expenses, months }) {
  return useMemo(() => {
    const inP = (r) => months.includes(r.month);
    const S = sales.filter(inP), E = expenses.filter(inP);
    const common = E.filter((e) => e.project === COMMON);
    const unsetS = S.filter((r) => r.project === undefined || r.project === null);
    const unsetE = E.filter((r) => r.project === undefined || r.project === null);
    const rows = projects.map((p) => {
      const ps = S.filter((r) => r.project === p.id), pe = E.filter((r) => r.project === p.id);
      const sale = sum(ps), cost = sum(pe);
      return { p, ps, pe, sale, cost, gross: sale - cost };
    });
    const linkedSales = rows.reduce((s, r) => s + r.sale, 0);
    const commonTotal = sum(common);
    rows.forEach((r) => { r.alloc = linkedSales ? Math.round((commonTotal * r.sale) / linkedSales) : 0; r.profit = r.gross - r.alloc; });
    return { rows, common, commonTotal, unsetS, unsetE, linkedSales };
  }, [projects, sales, expenses, months]);
}

export function openingCashOf(master) { const v = master?.company?.openingCash; return v === "" || v === undefined || v === null ? null : Number(v); }
