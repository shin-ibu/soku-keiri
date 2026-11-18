// AIBOU トーク画面
// 社長と相棒（AIBOU）のやり取りの場。報告・連絡・相談を出し、社長の言葉には必ず返事をする。
// 今はAIにつながる前の版：返事はキーワードに応じた決まった文で返す。
import { useEffect, useMemo, useRef, useState } from "react";

const C = {
  bg: "#F2F4F6", card: "#FFFFFF", ink: "#17212B", sub: "#5B6573", line: "#DFE3E8",
  pri: "#233E8B", priDark: "#16295E", priSoft: "#E6EBF7",
  ok: "#17795E", okSoft: "#E3F3EC", warn: "#7A4F00", warnSoft: "#FDF1D6", err: "#B3261E", errSoft: "#FBE4E2",
  tagSoft: "#EEF0F3", tagInk: "#3D4756",
};
const TALK_KEY = "aibouTalkV1";
const pad2 = (n) => String(n).padStart(2, "0");
const todayYmd = () => { const d = new Date(); return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; };
const yen = (n) => Math.round(n || 0).toLocaleString("ja-JP") + "円";
const man = (n) => { const v = Math.round((n || 0) / 10000); return v === 0 && n ? "1万円未満" : `約${v.toLocaleString("ja-JP")}万円`; };
const md = (ymd) => { const [, m, d] = String(ymd || "").split("-").map(Number); return m ? `${m}/${d}` : ""; };
const daysUntil = (ymd) => { if (!ymd) return null; const t = new Date(todayYmd()); const d = new Date(ymd); return Math.round((d - t) / 86400000); };
const nowHm = () => { const d = new Date(); return `${d.getHours()}:${pad2(d.getMinutes())}`; };

const loadTalk = () => { try { return JSON.parse(localStorage.getItem(TALK_KEY)) || []; } catch { return []; } };
const saveTalk = (log) => { try { localStorage.setItem(TALK_KEY, JSON.stringify(log.slice(-200))); } catch { /* 保存できない端末では、その場だけ残す */ } };

const TAG = {
  報告: { bg: C.tagSoft, fg: C.tagInk },
  連絡: { bg: C.warnSoft, fg: C.warn },
  相談: { bg: C.pri, fg: "#FFFFFF" },
};

// 画面の上の「今日の会社の状態」
function useStatus({ sales, opProfit, selMonth, invoices }) {
  return useMemo(() => {
    const dueOf = (r) => { const inv = r.invoiceId && invoices.find((v) => v.id === r.invoiceId); return inv && inv.dueDate ? inv.dueDate : ""; };
    const overdue = sales.filter((r) => r.status === "未入金" && dueOf(r) && daysUntil(dueOf(r)) < 0);
    if (opProfit < 0) return { level: "red", label: "注意", text: `${selMonth}は${man(-opProfit)}の赤字の見込みです` };
    if (overdue.length) return { level: "yellow", label: "確認", text: `期限を過ぎた入金が${overdue.length}件あります` };
    return { level: "green", label: "順調", text: `${selMonth}の利益は${man(opProfit)}の見込みです` };
  }, [sales, opProfit, selMonth, invoices]);
}

// AIBOUから今日伝えること（データから毎回作る）
function buildBriefing({ sales, expenses, invoices, totalSales, totalExp, selMonth, hasDemo }) {
  const out = [];
  const dueOf = (r) => { const inv = r.invoiceId && invoices.find((v) => v.id === r.invoiceId); return inv && inv.dueDate ? inv.dueDate : ""; };
  out.push({ id: "b-report", who: "aibou", tag: "報告", text: `${selMonth}の売上は${man(totalSales)}、経費は${man(totalExp)}です。` });

  const unpaid = sales.filter((r) => r.status === "未入金");
  const soon = unpaid.filter((r) => { const d = daysUntil(dueOf(r)); return d !== null && d <= 7; })
    .sort((a, b) => String(dueOf(a)).localeCompare(String(dueOf(b))));
  soon.slice(0, 2).forEach((r) => {
    const d = daysUntil(dueOf(r));
    const when = d < 0 ? `期限（${md(dueOf(r))}）を${-d}日過ぎています` : d === 0 ? "今日が入金期限です" : `${md(dueOf(r))}が入金期限です`;
    out.push({ id: `b-ar-${r.id}`, who: "aibou", tag: "連絡", text: `${r.client}の${yen(r.amount)}、${when}。`, actions: [{ label: "入金された", act: "markPaid", id: r.id, primary: true }, { label: "詳しく", act: "go", to: "ar" }] });
  });
  const restAr = unpaid.length - soon.slice(0, 2).length;
  if (restAr > 0) out.push({ id: "b-ar-rest", who: "aibou", tag: "連絡", text: `まだ入金されていない売上が、ほかに${restAr}件あります（合計${yen(unpaid.filter((r) => !soon.slice(0, 2).includes(r)).reduce((s, r) => s + r.amount, 0))}）。`, actions: [{ label: "一覧を見る", act: "go", to: "ar" }] });

  const ap = expenses.filter((e) => e.status === "未払い");
  if (ap.length) out.push({ id: "b-ap", who: "aibou", tag: "連絡", text: `まだ払っていない経費が${ap.length}件、合計${yen(ap.reduce((s, e) => s + e.amount, 0))}あります。`, actions: [{ label: "一覧を見る", act: "go", to: "ar" }] });

  if (hasDemo) out.push({ id: "b-demo", who: "aibou", tag: "相談", waiting: true, text: "今は見本の数字が入っています。見本を消して、自分の数字で始めますか？", actions: [{ label: "消して始める", act: "clearDemo", primary: true }, { label: "このまま見る", act: "say", text: "このまま見る" }] });
  return out;
}

// 社長の言葉への返事（AIにつながるまでの決まった返事）。どんな言葉にも必ず返す。
function replyTo(text, ctx) {
  const t = text.replace(/\s/g, "");
  if (/見本.*(消|始)|消して始める/.test(t)) return { text: "見本を消しました。これからは自分の数字で見られます。", act: "clearDemo" };
  if (/このまま見る/.test(t)) return { text: "わかりました。見本はいつでも「設定」から消せます。" };
  if (/請求書/.test(t)) return { text: "請求書の画面を開きます。", go: "invoice" };
  if (/経費|レシート|領収書|払った/.test(t)) return { text: "経費の入力を開きます。入れ終わったら、こちらに戻ってきてください。", entry: "expenses" };
  if (/売上|売り上げ/.test(t)) return { text: "売上の入力を開きます。", entry: "sales" };
  if (/未入金|入金/.test(t)) return { text: `まだ入金されていない売上は${ctx.arCount}件、合計${yen(ctx.ar)}です。一覧を開きます。`, go: "ar" };
  if (/利益|収支|もうか|儲/.test(t)) return { text: `${ctx.selMonth}の利益は${man(ctx.opProfit)}の見込みです。詳しい画面を開きます。`, go: "home" };
  if (/資金|残高|お金の流れ/.test(t)) return { text: "お金の流れの画面を開きます。", go: "cashflow" };
  if (/取引先|相手先/.test(t)) return { text: "取引先の一覧を開きます。", go: "partners" };
  if (/ありがと/.test(t)) return { text: "どういたしまして。ほかにもあれば、いつでもどうぞ。" };
  return { text: `「${text}」を受け取りました。まだAIにつながる前の版なので、今は「売上」「経費」「請求書」「入金」「利益」「お金の流れ」「取引先」などの言葉で動けます。` };
}

const Mark = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.2" strokeLinejoin="round" aria-hidden="true"><path d="M3 8h11v5H3z" /><path d="M10 13v4h11v-5h-7" /></svg>
);
const Icon = ({ d, size = 24, color = C.pri }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>
);
const IC = {
  cal: <><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></>,
  yen: <><circle cx="12" cy="12" r="9" /><path d="M8.5 7l3.5 4.5L15.5 7M12 11.5V18M9 13h6M9 15.5h6" /></>,
  chart: <><path d="M3 3v18h18" /><path d="M8 15v3M13 10v8M18 6v12" /></>,
  inbox: <><path d="M22 12h-6l-2 3h-4l-2-3H2" /><path d="M5.5 5.1L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.9A2 2 0 0 0 16.8 4H7.2a2 2 0 0 0-1.7 1.1z" /></>,
  people: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" /></>,
  camera: <><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></>,
  mic: <><rect x="9" y="2" width="6" height="12" rx="3" /><path d="M19 10v1a7 7 0 0 1-14 0v-1" /><path d="M12 18v4" /></>,
  speaker: <><path d="M11 5L6 9H2v6h4l5 4V5z" /><path d="M15.5 8.5a5 5 0 0 1 0 7" /><path d="M19 5a10 10 0 0 1 0 14" /></>,
  menu: <><path d="M4 6h16M4 12h16M4 18h16" /></>,
  send: <><path d="M22 2L11 13" /><path d="M22 2l-7 20-4-9-9-4 20-7z" /></>,
};

function Bubble({ m, onAction }) {
  if (m.who === "me") {
    return (
      <div style={{ alignSelf: "flex-end", maxWidth: "80%", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
        <div style={{ background: C.pri, color: "#fff", borderRadius: "16px 4px 16px 16px", padding: "10px 12px", fontSize: 15, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{m.text}</div>
        {m.at && <span style={{ fontSize: 11, color: C.sub }}>{m.at}</span>}
      </div>
    );
  }
  const tag = m.tag && TAG[m.tag];
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "flex-start", maxWidth: "88%" }}>
      <div style={{ width: 32, height: 32, flexShrink: 0, borderRadius: 16, background: C.pri, display: "flex", alignItems: "center", justifyContent: "center" }}><Mark /></div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
        <div style={{ background: C.card, border: m.tag === "相談" ? `2px solid ${C.pri}` : `1px solid ${C.line}`, borderRadius: "4px 16px 16px 16px", padding: "10px 12px" }}>
          {tag && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: tag.bg, color: tag.fg }}>{m.tag}</span>
              {m.waiting && <span style={{ fontSize: 12, fontWeight: 700, color: C.pri }}>返事待ち</span>}
            </div>
          )}
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6, whiteSpace: "pre-wrap", color: C.ink }}>{m.text}</p>
        </div>
        {m.actions && m.actions.length > 0 && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {m.actions.map((a, i) => (
              <button key={i} type="button" onClick={() => onAction(a, m)} className="aibou-chip" data-primary={a.primary ? "1" : undefined}>{a.label}</button>
            ))}
          </div>
        )}
        {m.at && <span style={{ fontSize: 11, color: C.sub }}>{m.at}</span>}
      </div>
    </div>
  );
}

export default function TalkScreen(p) {
  const { sales, setSales, expenses, invoices, master, totalSales, totalExp, opProfit, ar, selMonth, setScreen, onEntry, clearDemo, hasDemo } = p;
  const [log, setLog] = useState(loadTalk);
  const [draft, setDraft] = useState("");
  const [listening, setListening] = useState(false);
  const endRef = useRef(null);
  const recRef = useRef(null);
  const status = useStatus({ sales, opProfit, selMonth, invoices });
  const briefing = useMemo(() => buildBriefing({ sales, expenses, invoices, totalSales, totalExp, selMonth, hasDemo }), [sales, expenses, invoices, totalSales, totalExp, selMonth, hasDemo]);
  const owner = master?.company?.name ? `${master.company.name}の相棒` : "社長の相棒";

  useEffect(() => { saveTalk(log); }, [log]);
  useEffect(() => { endRef.current?.scrollIntoView({ block: "end" }); }, [log.length, briefing.length]);

  const push = (...msgs) => setLog((l) => [...l, ...msgs.map((m) => ({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, at: nowHm(), ...m }))]);

  const run = (r) => {
    if (r.act === "clearDemo") clearDemo();
    if (r.go) setTimeout(() => setScreen(r.go), 600);
    if (r.entry) setTimeout(() => onEntry(r.entry), 600);
  };

  const send = (text) => {
    const t = String(text || "").trim();
    if (!t) return;
    const r = replyTo(t, { ar, arCount: sales.filter((s) => s.status === "未入金").length, opProfit, selMonth });
    push({ who: "me", text: t }, { who: "aibou", text: r.text });
    setDraft("");
    run(r);
  };

  const onAction = (a, m) => {
    if (a.act === "go") { push({ who: "me", text: a.label }, { who: "aibou", text: "画面を開きます。" }); setTimeout(() => setScreen(a.to), 400); return; }
    if (a.act === "markPaid") {
      const row = sales.find((s) => s.id === a.id);
      setSales((prev) => prev.map((s) => (s.id === a.id ? { ...s, status: "入金済" } : s)));
      push({ who: "me", text: a.label }, { who: "aibou", tag: "報告", text: row ? `${row.client}の${yen(row.amount)}を入金済みにしました。` : "入金済みにしました。" });
      return;
    }
    if (a.act === "clearDemo") { push({ who: "me", text: a.label }, { who: "aibou", text: "見本を消しました。これからは自分の数字で見られます。" }); clearDemo(); return; }
    if (a.act === "say") { send(a.text); return; }
    if (a.act === "entry") { push({ who: "me", text: a.label }, { who: "aibou", text: "入力を開きます。" }); setTimeout(() => onEntry(a.to), 400); return; }
    void m;
  };

  const notReady = (name, extra) => push({ who: "me", text: name }, { who: "aibou", text: `「${name}」はまだ準備中です。${extra || ""}`, actions: name === "撮る" ? [{ label: "今は手で経費を入れる", act: "entry", to: "expenses" }] : undefined });

  const speak = () => {
    const synth = typeof window !== "undefined" && window.speechSynthesis;
    if (!synth) { push({ who: "aibou", text: "この端末では読み上げが使えません。" }); return; }
    synth.cancel();
    const text = [status.text, ...briefing.map((b) => b.text)].join("。");
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "ja-JP"; u.rate = 1.05;
    synth.speak(u);
    push({ who: "aibou", text: "今日のお知らせを読み上げています。" });
  };

  const listen = () => {
    const SR = typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);
    if (!SR) { push({ who: "aibou", text: "この端末のブラウザでは、声での入力がまだ使えません。下の欄に文字で送ってください。" }); return; }
    if (listening) { recRef.current?.stop(); return; }
    const rec = new SR();
    rec.lang = "ja-JP"; rec.interimResults = true; rec.continuous = false;
    rec.onresult = (e) => { const t = Array.from(e.results).map((r) => r[0].transcript).join(""); setDraft(t); if (e.results[e.results.length - 1].isFinal) { rec.stop(); send(t); } };
    rec.onerror = () => { setListening(false); push({ who: "aibou", text: "うまく聞き取れませんでした。もう一度お願いします。" }); };
    rec.onend = () => setListening(false);
    recRef.current = rec; setListening(true); rec.start();
  };

  const signal = { green: [C.okSoft, C.ok], yellow: [C.warnSoft, C.warn], red: [C.errSoft, C.err] }[status.level];
  const arCount = sales.filter((s) => s.status === "未入金").length;
  const tiles = [
    { label: "予定", sub: "準備中", icon: IC.cal, on: () => notReady("予定", "本業の予定と経営の仕事を一緒に並べる画面を作っています。") },
    { label: "入金・支払", sub: arCount ? `未入金 ${arCount}件` : "未入金なし", icon: IC.yen, on: () => setScreen("ar") },
    { label: "収支", sub: status.label, icon: IC.chart, on: () => setScreen("home") },
    { label: "受け箱", sub: "準備中", icon: IC.inbox, on: () => notReady("受け箱", "請求書やレシートの写真を読み取る仕組みを作っています。") },
    { label: "取引先", sub: `${(master?.counterparties || []).length}件`, icon: IC.people, on: () => setScreen("partners") },
    { label: "撮る", sub: "レシート・請求書", icon: IC.camera, on: () => notReady("撮る", "写真から読み取る機能は、受け箱と一緒に作ります。"), dark: true },
  ];

  return (
    <div className="aibou" style={{ height: "100dvh", display: "flex", flexDirection: "column", background: C.bg, color: C.ink }}>
      <style>{css}</style>
      <header style={{ height: 60, flexShrink: 0, display: "flex", alignItems: "center", gap: 12, padding: "0 12px 0 16px", background: C.card, borderBottom: `1px solid ${C.line}` }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: C.pri, display: "flex", alignItems: "center", justifyContent: "center" }}><Mark size={22} /></div>
        <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
          <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: "0.08em" }}>AIBOU</span>
          <span style={{ fontSize: 12, color: C.sub, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{owner}</span>
        </div>
        <button type="button" className="aibou-icon" aria-label="今日のお知らせを読み上げる" onClick={speak} style={{ marginLeft: "auto" }}><Icon d={IC.speaker} size={22} /></button>
        <button type="button" className="aibou-icon" aria-label="メニュー（設定と経理の画面）" onClick={() => setScreen("settings")}><Icon d={IC.menu} size={22} /></button>
      </header>

      <button type="button" onClick={() => setScreen("home")} className="aibou-status">
        <span style={{ width: 52, height: 52, flexShrink: 0, borderRadius: 26, background: signal[0], display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3 }}>
          <span style={{ width: 14, height: 14, borderRadius: 7, background: signal[1] }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: signal[1] }}>{status.label}</span>
        </span>
        <span style={{ display: "flex", flexDirection: "column", gap: 2, textAlign: "left" }}>
          <span style={{ fontSize: 12, color: C.sub }}>今日の会社の状態</span>
          <span style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.5 }}>{status.text}</span>
        </span>
      </button>

      <main style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "12px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ alignSelf: "center", fontSize: 12, color: C.sub, background: "#E4E8ED", padding: "3px 12px", borderRadius: 999 }}>今日のお知らせ</div>
        {briefing.map((m) => <Bubble key={m.id} m={m} onAction={onAction} />)}
        {log.length > 0 && <div style={{ alignSelf: "center", fontSize: 12, color: C.sub, background: "#E4E8ED", padding: "3px 12px", borderRadius: 999 }}>やり取り</div>}
        {log.map((m) => <Bubble key={m.id} m={m} onAction={onAction} />)}
        <div ref={endRef} />
      </main>

      <form onSubmit={(e) => { e.preventDefault(); send(draft); }} style={{ flexShrink: 0, padding: "8px 12px", display: "flex", gap: 8, alignItems: "center", background: C.card, borderTop: `1px solid ${C.line}` }}>
        <label htmlFor="aibou-msg" className="aibou-sr">AIBOUへのメッセージ</label>
        <input id="aibou-msg" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={listening ? "聞いています…" : "文字でも送れます"} className="aibou-input" autoComplete="off" />
        {draft.trim()
          ? <button type="submit" className="aibou-round" aria-label="送る"><Icon d={IC.send} size={24} color="#FFFFFF" /></button>
          : <button type="button" className="aibou-round" aria-label={listening ? "聞くのをやめる" : "AIBOUに話しかける"} data-on={listening ? "1" : undefined} onClick={listen}><Icon d={IC.mic} size={26} color="#FFFFFF" /></button>}
      </form>

      <nav aria-label="AIBOUのメニュー" style={{ flexShrink: 0, display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8, padding: "4px 12px calc(16px + env(safe-area-inset-bottom))", background: C.card }}>
        {tiles.map((t) => (
          <button key={t.label} type="button" onClick={t.on} className="aibou-tile" data-dark={t.dark ? "1" : undefined}>
            <Icon d={t.icon} color={t.dark ? "#FFFFFF" : C.pri} />
            <span style={{ fontSize: 14, fontWeight: 700 }}>{t.label}</span>
            <span className="aibou-tile-sub">{t.sub}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

const css = `
.aibou{ font-family:'Hiragino Sans','Hiragino Kaku Gothic ProN','Noto Sans JP',sans-serif; max-width:640px; margin:0 auto; }
.aibou button{ font-family:inherit; cursor:pointer; }
.aibou-sr{ position:absolute; width:1px; height:1px; overflow:hidden; clip:rect(0 0 0 0); }
.aibou-icon{ width:44px; height:44px; border-radius:22px; border:1px solid ${C.line}; background:#fff; display:flex; align-items:center; justify-content:center; }
.aibou-status{ margin:12px 16px 0; padding:12px 14px; flex-shrink:0; background:#fff; border:1px solid ${C.line}; border-radius:16px; display:flex; gap:12px; align-items:center; color:${C.ink}; }
.aibou-chip{ height:44px; padding:0 16px; border-radius:22px; border:1px solid #C9D0DA; background:#fff; font-size:14px; font-weight:700; color:${C.pri}; }
.aibou-chip[data-primary]{ background:${C.pri}; border-color:${C.pri}; color:#fff; }
.aibou-input{ flex:1; min-width:0; height:44px; box-sizing:border-box; border-radius:22px; border:1px solid ${C.line}; background:${C.bg}; padding:0 16px; font:inherit; font-size:16px; color:${C.ink}; }
.aibou-round{ width:56px; height:56px; flex-shrink:0; border-radius:28px; border:none; background:${C.pri}; display:flex; align-items:center; justify-content:center; }
.aibou-round[data-on]{ background:${C.err}; }
.aibou-tile{ height:76px; border-radius:14px; border:none; background:${C.bg}; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:3px; color:${C.ink}; }
.aibou-tile-sub{ font-size:11px; color:${C.sub}; }
.aibou-tile[data-dark]{ background:${C.pri}; color:#fff; }
.aibou-tile[data-dark] .aibou-tile-sub{ color:#DCE3F5; }
.aibou button:focus-visible, .aibou input:focus-visible{ outline:3px solid #9DB0DA; outline-offset:2px; }
`;
