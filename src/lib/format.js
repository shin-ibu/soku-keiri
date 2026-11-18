

export const fmt = (n) => "¥" + Math.round(n || 0).toLocaleString("ja-JP");
export const fmtEx = (n) => "¥" + Math.round((n || 0) / 1.1).toLocaleString("ja-JP");
export const pad2 = (n) => String(n).padStart(2, "0");
// 日本の今日（UTCではなく、使っている人の時計で）
export const today = () => { const d = new Date(); return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`; };
export const monthLabel = (d) => `${d.getFullYear()}年${d.getMonth()+1}月`;
export const monthOfDate = (ymd) => { const [y,m] = String(ymd||"").split("-").map(Number); return y && m ? `${y}年${m}月` : monthLabel(new Date()); };
export const thisMonth = () => monthLabel(new Date());
export const getFiscalMonths = (startMonth, year) => {
  const months = [];
  for (let i = 0; i < 12; i++) {
    const m = ((startMonth - 1 + i) % 12) + 1;
    const y = year + Math.floor((startMonth - 1 + i) / 12);
    months.push(`${y}年${m}月`);
  }
  return months;
};
// 今の決算期が始まった年。「第何期」は表示に使うだけで、期間はずらさない
// （以前は第何期の数だけ過去にずれ、第3期と入れると2年前の12か月が出ていた）
export const getFiscalYear = (startMonth, fiscalNum, now = new Date()) => {
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  return currentMonth >= startMonth ? currentYear : currentYear - 1;
};
export const fmtK = (n) => n >= 1000000 ? (n/1000000).toFixed(1)+"M" : n >= 1000 ? Math.round(n/1000)+"K" : String(Math.round(n));
export const yen = (n) => "¥" + Math.round(n || 0).toLocaleString("ja-JP");
export const jpDate = (ymd) => { const [y,m,d] = String(ymd||"").split("-").map(Number); return y ? `${y}年${m}月${d}日` : ""; };
export const bankLine = (b) => b && (b.bankName || b.bankNo) ? `${b.bankName||""} ${b.bankBranch||""}\u3000${b.bankType||""} ${b.bankNo||""}${b.bankHolder?`\u3000名義：${b.bankHolder}`:""}`.trim() : "";
export const monthShort = (m) => String(m||"").replace(/^\d{4}年/, "");

// 何月分かを、どの画面でもはっきり出す（押すと月を選べる）
export const greeting = () => { const h = new Date().getHours(); return h < 11 ? "おはようございます" : h < 18 ? "こんにちは" : "おつかれさまです"; };

// ── 入力：売上（もとは売上入力の画面の中にあった。処理はそのまま） ─────────────
