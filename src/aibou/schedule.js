// 予定：本業の予定と、経営の仕事（入金期限・支払・見積もりの追いかけ・月末の在庫など）を一つに並べる
// 社長が入れる「予定」「やること」と、記録から自動で出す「経営の仕事」の2種類がある。

const pad2 = (n) => String(n).padStart(2, "0");
export const ymdOf = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
export const parseYmd = (s) => { const [y, m, d] = String(s || "").split("-").map(Number); return y ? new Date(y, m - 1, d) : null; };
export const addDays = (ymd, n) => { const d = parseYmd(ymd); d.setDate(d.getDate() + n); return ymdOf(d); };
export const WEEK = ["日", "月", "火", "水", "木", "金", "土"];
export const dayLabel = (ymd) => { const d = parseYmd(ymd); return d ? `${d.getMonth() + 1}月${d.getDate()}日（${WEEK[d.getDay()]}）` : ""; };
const lastDayOfMonth = (ymd) => { const d = parseYmd(ymd); return ymdOf(new Date(d.getFullYear(), d.getMonth() + 1, 0)); };

// 会社の働き方（業種で決めつけず、社長が決める）
export const DEFAULT_WORK = { restDays: [0, 6], start: "09:00", end: "18:00", notifyTime: "08:00" };
export const workOf = (master) => ({ ...DEFAULT_WORK, ...((master && master.company && master.company.work) || {}) });
export const isRestDay = (ymd, work) => { const d = parseYmd(ymd); return !!d && work.restDays.includes(d.getDay()); };

// 繰り返し（なし・毎週・毎月・毎月末）
export const REPEATS = [["none", "くり返さない"], ["weekly", "毎週"], ["monthly", "毎月（同じ日）"], ["monthEnd", "毎月末"]];
export function occursOn(ev, ymd) {
  if (!ev.date || ymd < ev.date) return false;
  if (ev.until && ymd > ev.until) return false;
  const r = ev.repeat || "none";
  if (r === "none") return ev.date === ymd;
  const a = parseYmd(ev.date), b = parseYmd(ymd);
  if (r === "weekly") return a.getDay() === b.getDay();
  if (r === "monthEnd") return lastDayOfMonth(ymd) === ymd;
  if (r === "monthly") {
    const want = Math.min(a.getDate(), parseYmd(lastDayOfMonth(ymd)).getDate()); // 31日指定は月末に寄せる
    return b.getDate() === want;
  }
  return false;
}
// 「やること」の完了は日付ごと（くり返しでも、その日の分だけ済にする）
export const isDone = (ev, ymd) => (ev.doneDates || []).includes(ymd);

// 記録から出す「経営の仕事」
export function autoItems({ sales = [], expenses = [], invoices = [], estimates = [], inventory = {}, today }) {
  const out = [];
  invoices.forEach((v) => {
    const sale = sales.find((r) => r.id === v.saleId);
    if (!sale || sale.status !== "未入金" || !v.dueDate) return;
    out.push({ id: `auto-in-${v.id}`, auto: true, kind: "入金期限", date: v.dueDate, title: `${v.client}から入金（${v.no}）`, amount: v.calc.total, go: "ar", tab: "in", overdue: v.dueDate < today });
  });
  expenses.filter((e) => e.status === "未払い" && e.dueDate).forEach((e) => {
    out.push({ id: `auto-out-${e.id}`, auto: true, kind: "支払期限", date: e.dueDate, title: `${e.client}へ支払`, amount: e.amount, go: "ar", tab: "out", overdue: e.dueDate < today });
  });
  estimates.filter((q) => q.status === "見積中").forEach((q) => {
    if (q.validUntil) out.push({ id: `auto-est-${q.id}`, auto: true, kind: "見積期限", date: q.validUntil, title: `${q.client}の見積もり（${q.subject || q.no}）の有効期限`, amount: q.calc.total, go: "estimate" });
    const follow = addDays(q.issueDate, 14);
    if (!q.validUntil || follow < q.validUntil) out.push({ id: `auto-fol-${q.id}`, auto: true, kind: "追いかけ", date: follow, title: `${q.client}へ見積もりの返事を確認`, go: "estimate" });
  });
  // 月末：在庫を数える（在庫を使っている会社だけ）
  if (Object.keys(inventory).length) {
    const end = lastDayOfMonth(today);
    out.push({ id: `auto-stock-${end}`, auto: true, kind: "月末", date: end, title: "月末の在庫を数える", go: "assets", sub: "stock" });
  }
  return out;
}

// その日に並べるもの（時刻のある予定 → 時刻のない予定・やること → 経営の仕事）
export function itemsForDay(ymd, { events = [], auto = [] }) {
  const own = events.filter((ev) => occursOn(ev, ymd)).map((ev) => ({ ...ev, done: isDone(ev, ymd) }));
  const timed = own.filter((e) => e.time).sort((a, b) => a.time.localeCompare(b.time));
  const untimed = own.filter((e) => !e.time);
  const keiei = auto.filter((a) => a.date === ymd);
  return [...timed, ...untimed, ...keiei];
}
// 期限を過ぎて残っている経営の仕事（今日の画面の先頭に出す）
export const overdueItems = (auto, today) => auto.filter((a) => a.overdue && a.date < today);

// 話し言葉から予定を作る：「明日10時に○○さんと打ち合わせ」「11月25日 14時半 現場」「金曜に見積もりを送る」
export function parseScheduleText(text, today) {
  let t = String(text || "").replace(/\s+/g, " ").trim();
  const z2h = (s) => s.replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0));
  t = z2h(t);
  let date = null;
  const base = parseYmd(today);
  const take = (re) => { const m = t.match(re); if (m) t = t.replace(m[0], " "); return m; };
  let m;
  // くり返し：毎週・毎月末・毎月
  let repeat = "none";
  if (take(/毎月末|月末に毎月/)) { repeat = "monthEnd"; date = lastDayOfMonth(today); }
  else if (take(/毎週/)) repeat = "weekly";
  else if (take(/毎月/)) repeat = "monthly";
  if (date) { /* 毎月末で決まっている */ }
  else if (take(/明後日|あさって/)) date = addDays(today, 2);
  else if (take(/明日|あした/)) date = addDays(today, 1);
  else if (take(/今日|きょう|本日/)) date = today;
  else if ((m = take(/(\d{1,2})[月/](\d{1,2})日?/))) {
    let y = base.getFullYear(); const mo = Number(m[1]), d = Number(m[2]);
    if (ymdOf(new Date(y, mo - 1, d)) < today) y += 1;
    date = ymdOf(new Date(y, mo - 1, d));
  } else if ((m = take(/(来週の?)?([日月火水木金土])曜日?/))) {
    const want = WEEK.indexOf(m[2]);
    if (m[1]) {
      // 来週＝次の月曜日から始まる週
      const toMon = ((8 - base.getDay()) % 7) || 7;
      date = addDays(today, toMon + ((want + 6) % 7));
    } else {
      const diff = (want - base.getDay() + 7) % 7 || 7;   // 同じ曜日なら翌週
      date = addDays(today, diff);
    }
  } else if ((m = take(/(\d{1,2})日/))) {
    const d = Number(m[1]);
    let cand = ymdOf(new Date(base.getFullYear(), base.getMonth(), d));
    if (cand < today) cand = ymdOf(new Date(base.getFullYear(), base.getMonth() + 1, d));
    date = cand;
  }
  let time = "";
  if ((m = take(/(午前|午後)?(\d{1,2})(?:時|:)(半|(\d{1,2})分?)?/))) {
    let h = Number(m[2]); const min = m[3] === "半" ? 30 : m[4] ? Number(m[4]) : 0;
    if (m[1] === "午後" && h < 12) h += 12;
    if (h <= 24 && min < 60) time = `${pad2(h)}:${pad2(min)}`;
  }
  if (!date) return null;
  const title = t.replace(/^[\s、,]*(に|から|の)?/, "").replace(/(に|の)?(予定を?)?(入れて|いれて|登録して|追加して|お願い)(ください)?[。!！]*$/, "").replace(/^(に|から)\s*/, "").replace(/\s+/g, " ").trim().replace(/^(に|、)/, "").trim();
  const task = /(送る|出す|払う|支払|振り込|連絡|電話|確認|作る|提出)/.test(title) && !time;
  const out = { date, time, title: title || "予定", type: task ? "task" : "event" };
  if (repeat !== "none") out.repeat = repeat;
  return out;
}
