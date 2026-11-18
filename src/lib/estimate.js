// 見積書と請求書・売上のつながり
// 見積書 → 受注 → 請求書（1回または分割）→ 入金。見積もりのない請求もある。

export const ESTIMATE_STATUSES = ["見積中", "受注", "請求済", "失注"];

// その見積書に紐付いた請求の合計（税込）。請求書を出さずに売上として入れたものも数える
export const invoicedTotal = (est, invoices, sales = []) =>
  invoices.filter((v) => v.estimateId === est.id).reduce((t, v) => t + (v.calc ? v.calc.total : 0), 0) +
  sales.filter((r) => r.estimateId === est.id && !r.invoiceId).reduce((t, r) => t + (r.amount || 0), 0);
export const remainingOf = (est, invoices, sales = []) => Math.max(0, est.calc.total - invoicedTotal(est, invoices, sales));

// 見積もりの状態を、請求の進み具合に合わせて決める（失注は手で決めたまま）
export function estimateStatusAfter(est, invoices, sales = []) {
  if (est.status === "失注") return "失注";
  const done = invoicedTotal(est, invoices, sales);
  if (done >= est.calc.total && est.calc.total > 0) return "請求済";
  if (done > 0) return "受注";
  return est.status || "見積中";
}

const norm = (s) => String(s || "").replace(/[\s\u3000]/g, "").replace(/株式会社|㈱|\(株\)|（株）|有限会社|㈲/g, "");
const sameClient = (est, { client, cpId }) => (cpId && est.cpId === cpId) || (client && norm(est.client) === norm(client));

// 請求・売上の金額から、「これですか？」の候補を出す
// 戻り値：[{ est, kind: "same"|"near"|"part", remaining, diff, label }]（近い順）
export function matchEstimates(estimates, invoices, { client, cpId, amount }, sales = []) {
  const amt = Number(amount || 0);
  const cands = estimates.filter((e) => e.status !== "失注" && e.status !== "請求済" && sameClient(e, { client, cpId }) && remainingOf(e, invoices, sales) > 0);
  const out = cands.map((est) => {
    const remaining = remainingOf(est, invoices, sales);
    const diff = amt - remaining;
    let kind;
    if (amt > 0 && diff === 0) kind = "same";
    else if (amt > 0 && Math.abs(diff) <= Math.max(remaining * 0.1, 1000)) kind = "near";
    else if (amt > 0 && amt < remaining) kind = "part";
    else if (!amt) kind = "open"; // 金額がまだ入っていない
    else kind = "over";
    const yen = (n) => `${Math.round(Math.abs(n)).toLocaleString("ja-JP")}円`;
    const label = kind === "same" ? "同じ金額です"
      : kind === "near" ? (diff > 0 ? `見積もりより${yen(diff)}多いです（追加分？）` : `見積もりより${yen(diff)}少ないです（値引き？）`)
      : kind === "part" ? `見積もりのうちの一部（着手金・分割など）ですか？　残りは${yen(remaining - amt)}になります`
      : kind === "over" ? `見積もりより${yen(diff)}多いです`
      : `未請求の見積もり（残り${yen(remaining)}）`;
    return { est, kind, remaining, diff, label };
  });
  const rank = { same: 0, near: 1, part: 2, open: 3, over: 4 };
  return out.sort((a, b) => rank[a.kind] - rank[b.kind] || Math.abs(a.diff) - Math.abs(b.diff) || String(b.est.issueDate).localeCompare(String(a.est.issueDate)));
}

// 見積書の有効期限（見積日から30日）
export const defaultValidUntil = (ymd) => {
  const d = new Date(`${ymd}T00:00:00`); if (isNaN(d)) return "";
  d.setDate(d.getDate() + 30);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
