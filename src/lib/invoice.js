import { pad2, today } from "./format.js";


export const endOfMonth = (y, m0) => { const d = new Date(y, m0+1, 0); return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`; };
export const dueFromTerms = (terms, ymd) => {
  const [y,m,d] = String(ymd||"").split("-").map(Number); if (!y||!m) return "";
  if (terms==="月末締め翌月末払い") return endOfMonth(y, m);
  if (terms==="月末締め翌々月末払い") return endOfMonth(y, m+1);
  if (terms==="20日締め翌月末払い") return endOfMonth(y, d<=20 ? m : m+1);
  return "";
};

// ── 請求書の計算 ──────────────────────────────────────────────────────────────
// 消費税は「1枚の請求書ごと・税率ごとに1回だけ」端数を切り捨てる（国税庁のインボイスのルール）
export const lineAmount = (it) => Math.round(Number(it.qty||0) * Number(it.price||0));
export const calcInvoice = (items) => {
  const rates = [10, 8, 0].map(rate => {
    const base = items.filter(it => Number(it.tax ?? 10) === rate).reduce((s,it) => s + lineAmount(it), 0);
    return { rate, base, tax: Math.floor(base * rate / 100) };
  }).filter(r => r.base !== 0);
  const subtotal = rates.reduce((s,r) => s + r.base, 0);
  const taxTotal = rates.reduce((s,r) => s + r.tax, 0);
  return { rates, subtotal, taxTotal, total: subtotal + taxTotal };
};
export const nextInvoiceNo = (invoices, invoiceSeq, ymd) => {
  const year = String(ymd||today()).slice(0,4);
  const used = invoices.filter(v => v.year === year).map(v => v.seq);
  const seq = Math.max(invoiceSeq[year] || 0, ...used, 0) + 1;
  return { year, seq, no: `${year}-${String(seq).padStart(3,"0")}` };
};
export const newId = () => Date.now();
export const safeFileName = (s) => String(s||"").replace(/[\\/:*?"<>|\s]+/g, "_").slice(0, 40);
export const invoiceFileName = (inv) => `請求書_${inv.no}_${safeFileName(inv.client)}.pdf`;
export const downloadFile = (file) => {
  const url = URL.createObjectURL(file);
  const a = document.createElement("a"); a.href = url; a.download = file.name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 15000);
};
// スマホ：共有シート（ファイルに保存・LINE・メール）／PC：ダウンロード
export const canShareFile = (file) => { try { return !!(navigator.canShare && navigator.canShare({ files:[file] }) && window.matchMedia("(pointer:coarse)").matches); } catch { return false; } };

// ── INVOICE SCREEN ────────────────────────────────────────────────────────────
export const blankItem = () => ({ desc:"", qty:1, unit:"式", price:"", tax:10 });
export const blankInvForm = () => ({ cpId:null, client:"", honorific:"御中", clientAddr:"", contact:"", issueDate:today(), dueDate:"", subject:"", memo:"" });
