import { useState, useEffect } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";

const fmt = (n) => "¥" + Math.round(n || 0).toLocaleString("ja-JP");
const fmtEx = (n) => "¥" + Math.round((n || 0) / 1.1).toLocaleString("ja-JP");
const pad2 = (n) => String(n).padStart(2, "0");
// 日本の今日（UTCではなく、使っている人の時計で）
const today = () => { const d = new Date(); return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`; };
const monthLabel = (d) => `${d.getFullYear()}年${d.getMonth()+1}月`;
const monthOfDate = (ymd) => { const [y,m] = String(ymd||"").split("-").map(Number); return y && m ? `${y}年${m}月` : monthLabel(new Date()); };
const thisMonth = () => monthLabel(new Date());

const getFiscalMonths = (startMonth, year) => {
  const months = [];
  for (let i = 0; i < 12; i++) {
    const m = ((startMonth - 1 + i) % 12) + 1;
    const y = year + Math.floor((startMonth - 1 + i) / 12);
    months.push(`${y}年${m}月`);
  }
  return months;
};

const getFiscalYear = (startMonth, fiscalNum) => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const baseYear = currentMonth >= startMonth ? currentYear : currentYear - 1;
  return baseYear - (fiscalNum - 1);
};

const LOAD_KEY = "sokuKeiriV4";
const load = () => { try { const r = localStorage.getItem(LOAD_KEY); return r ? JSON.parse(r) : null; } catch { return null; } };
const saveAll = (d) => { try { localStorage.setItem(LOAD_KEY, JSON.stringify(d)); } catch {} };

const DEFAULT_MASTER = {
  company: { name:"", type:"法人", established:"", capital:"", taxRate:25, fiscalMonth:4, fiscalNum:1, addr:"", tel:"", email:"", regNo:"", bankName:"", bankBranch:"", bankType:"普通", bankNo:"", bankHolder:"" },
  accounts: [
    { id:"uriage",  label:"売上高",     category:"revenue", examples:"商品・サービスの販売収入、コンサルティング料、制作費" },
    { id:"genka",   label:"売上原価",   category:"cogs",    examples:"仕入れ費用、製造原材料、商品原価" },
    { id:"koukoku", label:"広告宣伝費", category:"sga",     examples:"チラシ、SNS広告、看板、HP制作" },
    { id:"sotuke",  label:"外注費",     category:"sga",     examples:"フリーランスへの発注、業務委託、制作外注" },
    { id:"tsushin", label:"通信費",     category:"sga",     examples:"スマホ代、インターネット、切手・宅配" },
    { id:"yachin",  label:"地代家賃",   category:"sga",     examples:"事務所家賃、店舗家賃、駐車場代" },
    { id:"kotsu",   label:"旅費交通費", category:"sga",     examples:"電車・タクシー、出張費、高速代" },
    { id:"settai",  label:"交際費",     category:"sga",     examples:"取引先との飲食、接待、お中元・お歳暮" },
    { id:"shoumou", label:"消耗品費",   category:"sga",     examples:"文具、備品（10万円未満）、コーヒー等" },
    { id:"hoken",   label:"保険料",     category:"sga",     examples:"損害保険、生命保険（法人契約）" },
    { id:"sonota",  label:"その他経費", category:"sga",     examples:"上記に当てはまらない経費" },
  ],
  // 相手先（取引先）。sample:true は見本。「見本を消す」でいっしょに消える
  counterparties: [
    { id:1, name:"㈱〇〇商事", honorific:"御中", addr:"東京都渋谷区〇〇1-2-3", contact:"", terms:"月末締め翌月末払い", kind:"売り先", regNo:"", bankName:"〇〇銀行", bankBranch:"渋谷支店", bankType:"普通", bankNo:"1234567", bankHolder:"カ)マルマルショウジ", sample:true },
    { id:2, name:"□□デザイン", honorific:"御中", addr:"東京都新宿区△△4-5-6", contact:"", terms:"月末締め翌月末払い", kind:"両方", regNo:"", bankName:"△△銀行", bankBranch:"新宿支店", bankType:"普通", bankNo:"7654321", bankHolder:"カクカクデザイン", sample:true },
  ],
};

// ── 相手先 ────────────────────────────────────────────────────────────────────
const CP_BLANK = { name:"", honorific:"御中", addr:"", contact:"", terms:"月末締め翌月末払い", kind:"売り先", regNo:"", bankName:"", bankBranch:"", bankType:"普通", bankNo:"", bankHolder:"" };
const TERMS_PRESETS = ["月末締め翌月末払い","月末締め翌々月末払い","20日締め翌月末払い","都度"];
const CP_KINDS = ["売り先","支払い先","両方"];
const SAMPLE_CLIENT_NAMES = ["㈱〇〇商事","□□デザイン"];
// 全角→半角・大文字にして、ハイフンや空白を取る
const normRegNo = (v) => String(v||"").replace(/[０-９Ａ-Ｚａ-ｚ]/g, c=>String.fromCharCode(c.charCodeAt(0)-0xFEE0)).toUpperCase().replace(/[\s\-‐－ー]/g,"");
const isValidRegNo = (v) => /^T\d{13}$/.test(normRegNo(v));
// 以前の「取引先（master.clients）」を、何も落とさずに「相手先」へ移す
const migrateMaster = (m) => {
  if (!m) return DEFAULT_MASTER;
  const out = { ...m, company: { ...DEFAULT_MASTER.company, ...(m.company||{}) } };
  if (!Array.isArray(out.counterparties)) {
    out.counterparties = (m.clients||[]).map(c => ({ ...CP_BLANK, kind:"両方", ...c, sample: c.sample ?? SAMPLE_CLIENT_NAMES.includes(c.name) }));
  }
  delete out.clients;
  return out;
};
// 支払条件から支払期限を出す（決まらないときは空）
const endOfMonth = (y, m0) => { const d = new Date(y, m0+1, 0); return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`; };
const dueFromTerms = (terms, ymd) => {
  const [y,m,d] = String(ymd||"").split("-").map(Number); if (!y||!m) return "";
  if (terms==="月末締め翌月末払い") return endOfMonth(y, m);
  if (terms==="月末締め翌々月末払い") return endOfMonth(y, m+1);
  if (terms==="20日締め翌月末払い") return endOfMonth(y, d<=20 ? m : m+1);
  return "";
};

// ── 請求書の計算 ──────────────────────────────────────────────────────────────
// 消費税は「1枚の請求書ごと・税率ごとに1回だけ」端数を切り捨てる（国税庁のインボイスのルール）
const lineAmount = (it) => Math.round(Number(it.qty||0) * Number(it.price||0));
const calcInvoice = (items) => {
  const rates = [10, 8, 0].map(rate => {
    const base = items.filter(it => Number(it.tax ?? 10) === rate).reduce((s,it) => s + lineAmount(it), 0);
    return { rate, base, tax: Math.floor(base * rate / 100) };
  }).filter(r => r.base !== 0);
  const subtotal = rates.reduce((s,r) => s + r.base, 0);
  const taxTotal = rates.reduce((s,r) => s + r.tax, 0);
  return { rates, subtotal, taxTotal, total: subtotal + taxTotal };
};
const nextInvoiceNo = (invoices, invoiceSeq, ymd) => {
  const year = String(ymd||today()).slice(0,4);
  const used = invoices.filter(v => v.year === year).map(v => v.seq);
  const seq = Math.max(invoiceSeq[year] || 0, ...used, 0) + 1;
  return { year, seq, no: `${year}-${String(seq).padStart(3,"0")}` };
};
const newId = () => Date.now();
const safeFileName = (s) => String(s||"").replace(/[\\/:*?"<>|\s]+/g, "_").slice(0, 40);

const DEMO_SALES = [
  { id:1, date:"2025-05-02", month:"2025年5月", type:"売掛", client:"㈱〇〇商事", amount:110000, tax:10, memo:"Web制作費", status:"未入金" },
  { id:2, date:"2025-05-05", month:"2025年5月", type:"売掛", client:"□□デザイン", amount:220000, tax:10, memo:"ロゴ制作", status:"未入金" },
  { id:3, date:"2025-05-08", month:"2025年5月", type:"現金", client:"△△工務店", amount:55000, tax:10, memo:"コンサル", status:"入金済" },
  { id:4, date:"2025-05-09", month:"2025年5月", type:"売掛", client:"◇◇㈱", amount:330000, tax:10, memo:"システム開発", status:"未入金" },
  { id:5, date:"2025-04-28", month:"2025年4月", type:"売掛", client:"㈱△△", amount:165000, tax:10, memo:"保守費", status:"入金済" },
  { id:6, date:"2025-04-10", month:"2025年4月", type:"現金", client:"〇×商会", amount:88000, tax:10, memo:"コンサル", status:"入金済" },
];
const DEMO_EXP = [
  { id:1, date:"2025-05-01", month:"2025年5月", type:"買掛", client:"〇〇ビル",   account:"地代家賃",   amount:50000,  tax:10, memo:"5月家賃",    status:"支払済" },
  { id:2, date:"2025-05-02", month:"2025年5月", type:"カード", client:"△△通信", account:"通信費",     amount:12000,  tax:10, memo:"スマホ代",   status:"支払済" },
  { id:3, date:"2025-05-03", month:"2025年5月", type:"買掛", client:"□□制作所", account:"外注費",     amount:95000,  tax:10, memo:"LP制作外注", status:"未払い" },
  { id:4, date:"2025-05-05", month:"2025年5月", type:"買掛", client:"◇◇広告",   account:"広告宣伝費", amount:38000,  tax:10, memo:"SNS広告",    status:"未払い" },
  { id:5, date:"2025-05-07", month:"2025年5月", type:"現金", client:"文具店",    account:"消耗品費",   amount:3300,   tax:10, memo:"コピー用紙", status:"支払済" },
  { id:6, date:"2025-04-01", month:"2025年4月", type:"買掛", client:"〇〇ビル",  account:"地代家賃",   amount:50000,  tax:10, memo:"4月家賃",    status:"支払済" },
  { id:7, date:"2025-04-15", month:"2025年4月", type:"カード", client:"◇◇広告", account:"広告宣伝費", amount:30000,  tax:10, memo:"広告費",    status:"支払済" },
];

// 見本データの日付を、開いた日の「今月・先月」に置きかえる（初めて開いた人に、空の画面や去年の数字を見せない）
const shiftDemo = (rows) => {
  const now = new Date(); const prev = new Date(now.getFullYear(), now.getMonth()-1, 1);
  const ym = (d) => `${d.getFullYear()}-${pad2(d.getMonth()+1)}`;
  return rows.map(r => { const isCur = r.month === "2025年5月"; const d = isCur ? now : prev;
    return { ...r, demo:true, month: monthLabel(d), date: `${ym(d)}-${r.date.slice(8)}`, memo: r.memo.replace("5月", `${now.getMonth()+1}月`).replace("4月", `${prev.getMonth()+1}月`) }; });
};

const AI_SUGGEST = { "電車":"旅費交通費","タクシー":"旅費交通費","交通":"旅費交通費","出張":"旅費交通費","家賃":"地代家賃","賃料":"地代家賃","広告":"広告宣伝費","チラシ":"広告宣伝費","sns":"広告宣伝費","外注":"外注費","委託":"外注費","フリー":"外注費","スマホ":"通信費","携帯":"通信費","ネット":"通信費","飲食":"交際費","接待":"交際費","ランチ":"交際費","文具":"消耗品費","備品":"消耗品費","adobe":"消耗品費","サブスク":"消耗品費","仕入":"売上原価","材料":"売上原価","保険":"保険料" };
const getSuggestion = (t) => { const l = t.toLowerCase(); for (const [k,v] of Object.entries(AI_SUGGEST)) { if (l.includes(k)) return v; } return null; };

// ── DRILL-DOWN MODAL ──────────────────────────────────────────────────────────
function DrillModal({ modal, onClose }) {
  useEffect(() => {
    if (!modal) return;
    const h = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [modal, onClose]);
  if (!modal) return null;
  const { title, amount, formula, rows, note, color } = modal;
  return (
    <div style={M.overlay} onClick={onClose}>
      <div style={M.box} onClick={e => e.stopPropagation()}>
        <div style={M.hdr}>
          <div>
            <div style={M.hdrlabel}>{title}</div>
            <div style={{ ...M.hdramt, color: color || "#185FA5" }}>{amount}</div>
          </div>
          <button style={M.xbtn} onClick={onClose}>✕</button>
        </div>
        {formula && <div style={M.formula}><div style={M.formulalabel}>計算式・根拠</div><pre style={M.formulatext}>{formula}</pre></div>}
        {rows && rows.length > 0 && (
          <div style={M.rowswrap}>
            <div style={M.rowslabel}>内訳　{rows.length}件</div>
            <table style={M.tbl}>
              <thead><tr>{Object.keys(rows[0]).map(k => <th key={k} style={{ ...M.th, textAlign:k==="金額"?"right":"left" }}>{k}</th>)}</tr></thead>
              <tbody>{rows.map((row,i) => <tr key={i} style={{ background:i%2===0?"#fff":"#fafafa" }}>{Object.entries(row).map(([k,v]) => <td key={k} style={{ ...M.td, textAlign:k==="金額"?"right":"left", fontWeight:k==="金額"?600:400 }}>{v}</td>)}</tr>)}</tbody>
            </table>
          </div>
        )}
        {note && <div style={M.note}>{note}</div>}
        <button style={M.closebottom} onClick={onClose}>閉じる</button>
      </div>
    </div>
  );
}
const M = {
  overlay:    { position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:24 },
  box:        { background:"#fff", borderRadius:16, width:"100%", maxWidth:520, maxHeight:"82vh", overflowY:"auto" },
  hdr:        { display:"flex", alignItems:"flex-start", justifyContent:"space-between", padding:"22px 22px 16px", borderBottom:"1px solid #edf0f7" },
  hdrlabel:   { fontSize:12, color:"#999", marginBottom:4, fontWeight:600 },
  hdramt:     { fontSize:26, fontWeight:800, letterSpacing:-1 },
  xbtn:       { background:"#F5F8FB", border:"none", borderRadius:8, width:34, height:34, fontSize:16, cursor:"pointer", color:"#666", flexShrink:0, marginLeft:12 },
  formula:    { margin:"16px 22px 0", background:"#E8F0F7", borderRadius:10, padding:"12px 16px", borderLeft:"3px solid #4A7BA3" },
  formulalabel:{ fontSize:10, color:"#4A7BA3", fontWeight:700, marginBottom:6 },
  formulatext:{ fontSize:13, color:"#1a3a6d", lineHeight:2, margin:0, whiteSpace:"pre-wrap", fontFamily:"inherit" },
  rowswrap:   { margin:"16px 22px 0" },
  rowslabel:  { fontSize:11, color:"#aaa", fontWeight:700, marginBottom:8 },
  tbl:        { width:"100%", borderCollapse:"collapse" },
  th:         { fontSize:10, color:"#bbb", fontWeight:700, padding:"6px 8px", borderBottom:"1px solid #edf0f7", background:"#f7f9fc" },
  td:         { fontSize:12, color:"#333", padding:"9px 8px", borderBottom:"1px solid #f2f4f9" },
  note:       { margin:"14px 22px 0", fontSize:12, color:"#666", background:"#fffbf0", borderRadius:8, padding:"10px 14px", lineHeight:1.8, borderLeft:"3px solid #EF9F27" },
  closebottom:{ display:"block", width:"calc(100% - 44px)", margin:"18px 22px 22px", padding:"12px", borderRadius:8, border:"1px solid #dce3f0", background:"transparent", color:"#555", fontSize:14, fontWeight:600, cursor:"pointer" },
};

// ── OP UPSELL MODAL ───────────────────────────────────────────────────────────
function OPModal({ onClose, onContract }) {
  useEffect(() => {
    const h = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);
  return (
    <div style={M.overlay} onClick={onClose}>
      <div style={{ ...M.box, maxWidth:440 }} onClick={e => e.stopPropagation()}>
        <div style={{ padding:"28px 28px 0" }}>
          <div style={{ fontSize:11, fontWeight:700, color:"#854F0B", letterSpacing:1, marginBottom:8 }}>OPTION</div>
          <div style={{ fontSize:22, fontWeight:800, color:"#111", marginBottom:8, letterSpacing:-0.5 }}>請求書作成オプション</div>
          <div style={{ fontSize:13, color:"#666", lineHeight:1.9, marginBottom:20 }}>スマホ・PCどちらからでも、プロクオリティの請求書を即座に作成できます。</div>
          {[["🧾","インボイス（登録番号・税率ごとの消費税）に対応"],["📄","その場でPDFにできる"],["📧","PDFをLINE・メールで送れる"],["📊","発行と同時に未入金・損益に自動反映"]].map(([ic,t],i) => (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:12, marginBottom:10, padding:"8px 12px", background:"#fafbfd", borderRadius:8 }}>
              <span style={{ fontSize:18 }}>{ic}</span><span style={{ fontSize:13, color:"#333" }}>{t}</span>
            </div>
          ))}
          <div style={{ background:"#E8F0F7", borderRadius:10, padding:"14px 16px", margin:"16px 0 0", border:"1px solid #C9DAE8" }}>
            <div style={{ fontSize:11, color:"#6a9fd4", marginBottom:4, fontWeight:600 }}>料金</div>
            <div style={{ display:"flex", alignItems:"baseline", gap:6 }}><span style={{ fontSize:26, fontWeight:800, color:"#4A7BA3" }}>¥1,000</span><span style={{ fontSize:13, color:"#6a9fd4" }}>/ 月　1社あたり（税別）</span></div>
          </div>
        </div>
        <div style={{ padding:"16px 28px 28px", display:"flex", gap:10 }}>
          <button style={{ flex:1, padding:"11px", borderRadius:8, border:"1px solid #dce3f0", background:"transparent", color:"#888", fontSize:13, cursor:"pointer" }} onClick={onClose}>閉じる</button>
          <button style={{ flex:2, padding:"11px", borderRadius:8, border:"none", background:"#4A7BA3", color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer" }} onClick={onContract}>✦ このオプションを契約する（デモ）</button>
        </div>
      </div>
    </div>
  );
}

// ── CLICKABLE NUMBER ──────────────────────────────────────────────────────────
function N({ v, modal, setModal, style }) {
  return <span className="num" style={{ cursor:"pointer", borderBottom:`1.5px dashed ${T.line}`, paddingBottom:1, ...style }} onClick={() => setModal(modal)} title="クリックで根拠を表示">{v}</span>;
}

// ── SIDEBAR ───────────────────────────────────────────────────────────────────
function Sidebar({ screen, setScreen, taxMode, setTaxMode, opInvoice, showOPModal, master, selMonth, setSelMonth, fiscalMonths }) {
  const coName = master?.company?.name || "Soku経理";
  const navItems = [
    { id:"home",     icon:"◈", label:"ホーム" },
    { id:"records",  icon:"≣", label:"記録" },
    { id:"sales",    icon:"↑", label:"売上の一覧" },
    { id:"expenses", icon:"↓", label:"経費の一覧" },
    { id:"pl",       icon:"≡", label:"損益計算書" },
    { id:"ar",       icon:"◎", label:"未入金・未払金" },
    { id:"cashflow", icon:"⇄", label:"資金繰り" },
    { id:"partners", icon:"☺", label:"取引先" },
    { id:"master",   icon:"⚙", label:"会社・口座・科目" },
  ];
  return (
    <div className="sidebar" style={{ width:240, minHeight:"100vh", background:"#fff", borderRight:`1px solid ${T.line}`, position:"fixed", top:0, left:0, display:"flex", flexDirection:"column", zIndex:100 }}>
      <div style={{ padding:"28px 20px 16px" }}>
        <div style={{ fontSize:21, fontWeight:700, color:T.text, letterSpacing:-0.3 }}>
          {coName.length > 10 ? "Soku経理" : coName}
        </div>
        <div style={{ fontSize:12, color:T.sub, marginTop:3 }}>スマホでかんたん経理</div>
      </div>
      <nav style={{ flex:1, padding:"4px 12px" }}>
        {navItems.map(item => (
          <button key={item.id} onClick={() => setScreen(item.id)} style={{
            display:"flex", alignItems:"center", gap:12, width:"100%",
            padding:"10px 14px", borderRadius:8, border:"none", cursor:"pointer",
            background: screen === item.id ? T.priSoft : "transparent",
            color: screen === item.id ? T.priDark : T.sub,
            fontSize:15, fontWeight: screen === item.id ? 600 : 400,
            marginBottom:2, textAlign:"left", transition:"all 0.15s",
          }}>
            <span style={{ fontSize:15, width:20, textAlign:"center" }}>{item.icon}</span>
            {item.label}
            {screen === item.id && <span style={{ marginLeft:"auto", width:3, height:18, borderRadius:2, background:T.pri, display:"block" }} />}
          </button>
        ))}
        {opInvoice
          ? <button onClick={() => setScreen("invoice")} style={{ display:"flex", alignItems:"center", gap:12, width:"100%", padding:"10px 14px", borderRadius:8, border:"none", cursor:"pointer", background: screen==="invoice" ? T.priSoft : "transparent", color: screen==="invoice" ? T.priDark : T.sub, fontSize:15, fontWeight:600, marginBottom:2, textAlign:"left" }}>
              <span style={{ fontSize:15, width:20, textAlign:"center" }}>✦</span>
              請求書
              {screen === "invoice" && <span style={{ marginLeft:"auto", width:3, height:18, borderRadius:2, background:T.pri, display:"block" }} />}
            </button>
          : <button onClick={showOPModal} style={{ display:"flex", alignItems:"center", gap:12, width:"100%", padding:"10px 14px", borderRadius:8, border:"none", cursor:"pointer", background:"transparent", color:T.faint, fontSize:15, marginBottom:2, textAlign:"left" }}>
              <span style={{ fontSize:15, width:20, textAlign:"center" }}>🔒</span>
              請求書
            </button>
        }
      </nav>
      {fiscalMonths && setSelMonth && (
        <div style={{ padding:"12px 20px 0", borderTop:`1px solid ${T.line}` }}>
          <div style={{ fontSize:13, color:T.sub, fontWeight:700, marginBottom:6 }}>何月分を見るか</div>
          <select value={selMonth} onChange={e=>setSelMonth(e.target.value)} style={{ width:"100%", background:"#fff", border:`1px solid ${T.line}`, color:T.text, borderRadius:8, padding:"10px 10px", fontSize:15, cursor:"pointer", outline:"none" }}>
            {fiscalMonths.map(m=><option key={m} value={m}>{m}分</option>)}
          </select>
        </div>
      )}
      <div style={{ padding:"14px 20px 24px", borderTop:"none" }}>
        <div style={{ fontSize:13, color:T.sub, fontWeight:700, marginBottom:8, marginTop:14 }}>金額の見せ方</div>
        <div style={{ display:"flex", background:T.bg, borderRadius:8, padding:3, gap:2 }}>
          <button onClick={() => setTaxMode("inc")} style={{ flex:1, padding:"5px 0", borderRadius:4, border:"none", background:taxMode==="inc"?"#fff":"transparent", color:taxMode==="inc"?T.text:T.sub, fontSize:14, cursor:"pointer", fontWeight:taxMode==="inc"?700:400 }}>税込</button>
          <button onClick={() => setTaxMode("exc")} style={{ flex:1, padding:"5px 0", borderRadius:4, border:"none", background:taxMode==="exc"?"#fff":"transparent", color:taxMode==="exc"?T.text:T.sub, fontSize:14, cursor:"pointer", fontWeight:taxMode==="exc"?700:400 }}>税抜</button>
        </div>
        <div style={{ fontSize:13, color:T.faint, marginTop:10 }}>数字を押すと根拠が出ます</div>
      </div>
    </div>
  );
}

// ── BOTTOM NAV (mobile) ───────────────────────────────────────────────────────
function BottomNav({ screen, setScreen, onPlus }) {
  const on = (ids) => ids.includes(screen);
  const items = [
    ["home","home","ホーム",["home"]], ["records","list","記録",["records","sales","expenses"]], null,
    ["cashflow","chart","お金の流れ",["cashflow"]], ["settings","gear","設定",["settings","partners","pl","ar","master","invoice","invoice-new"]],
  ];
  return (
    <nav className="bottom-nav" aria-label="メニュー">
      {items.map((it) => it === null
        ? <button key="plus" className="plus" aria-label="記録を追加" onClick={onPlus}><Ic n="plus" size={28} sw={2.4} /></button>
        : <button key={it[0]} className={on(it[3]) ? "on" : ""} aria-current={on(it[3]) ? "page" : undefined} onClick={() => setScreen(it[0])}><Ic n={it[1]} /><span>{it[2]}</span></button>)}
    </nav>
  );
}

// ── MONTH BAR ─────────────────────────────────────────────────────────────────
function MonthBar({ selMonth, setSelMonth, fiscalMonths }) {
  return (
    <div style={{ display:"flex", gap:4, marginBottom:16, flexWrap:"wrap" }}>
      {fiscalMonths.map(m => (
        <button key={m} style={{ padding:"6px 12px", borderRadius:8, border:"1px solid", borderColor:selMonth===m?T.pri:T.line, background:selMonth===m?T.pri:"#fff", color:selMonth===m?"#fff":T.sub, fontSize:13, cursor:"pointer", fontWeight:selMonth===m?700:400 }} onClick={() => setSelMonth(m)}>{m}分</button>
      ))}
    </div>
  );
}

// ── CHART HELPERS ─────────────────────────────────────────────────────────────
const fmtK = (n) => n >= 1000000 ? (n/1000000).toFixed(1)+"M" : n >= 1000 ? Math.round(n/1000)+"K" : String(Math.round(n));

function LineChart({ months, salesData, expData }) {
  const VW = 500, VH = 190;
  const PL = 46, PR = 10, PT = 16, PB = 28;
  const CW = VW - PL - PR, CH = VH - PT - PB;
  const maxV = Math.max(...salesData, ...expData, 1);
  const toX = (i) => PL + (i / (months.length - 1)) * CW;
  const toY = (v) => PT + CH - (v / maxV) * CH;
  const gridVals = [0, 0.33, 0.66, 1];
  const salesPts = salesData.map((v,i) => `${toX(i)},${toY(v)}`).join(" ");
  const expPts   = expData.map((v,i)   => `${toX(i)},${toY(v)}`).join(" ");
  const salesArea = `M${toX(0)},${toY(salesData[0])} ${salesData.map((v,i)=>`L${toX(i)},${toY(v)}`).join(" ")} L${toX(salesData.length-1)},${PT+CH} L${toX(0)},${PT+CH} Z`;
  const expArea   = `M${toX(0)},${toY(expData[0])}   ${expData.map((v,i)=>`L${toX(i)},${toY(v)}`).join(" ")}   L${toX(expData.length-1)},${PT+CH} L${toX(0)},${PT+CH} Z`;

  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} width="100%" style={{ display:"block" }}>
      <defs>
        <linearGradient id="gradS" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#5B8FB9" stopOpacity="0.18"/><stop offset="100%" stopColor="#5B8FB9" stopOpacity="0"/></linearGradient>
        <linearGradient id="gradE" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#F59E0B" stopOpacity="0.14"/><stop offset="100%" stopColor="#F59E0B" stopOpacity="0"/></linearGradient>
      </defs>
      {gridVals.map((r,i) => {
        const y = PT + CH - r * CH;
        return <g key={i}>
          <line x1={PL} y1={y} x2={PL+CW} y2={y} stroke="#edf0f7" strokeWidth={1}/>
          <text x={PL-4} y={y+4} textAnchor="end" fontSize={10} fill="#9CA3AF">{fmtK(maxV*r)}</text>
        </g>;
      })}
      {months.map((m,i) => (
        <text key={i} x={toX(i)} y={VH-6} textAnchor="middle" fontSize={10} fill="#6B7280">{m.replace(/\d{4}年/,"")}</text>
      ))}
      <path d={salesArea} fill="url(#gradS)"/>
      <path d={expArea}   fill="url(#gradE)"/>
      <polyline points={salesPts} fill="none" stroke="#5B8FB9" strokeWidth={2.2} strokeLinejoin="round"/>
      <polyline points={expPts}   fill="none" stroke="#F59E0B" strokeWidth={2.2} strokeLinejoin="round"/>
      {salesData.map((v,i) => <circle key={i} cx={toX(i)} cy={toY(v)} r={3.5} fill="#fff" stroke="#5B8FB9" strokeWidth={2}/>)}
      {expData.map((v,i)   => <circle key={i} cx={toX(i)} cy={toY(v)} r={3.5} fill="#fff" stroke="#F59E0B" strokeWidth={2}/>)}
    </svg>
  );
}

function BarChart({ months, profitData }) {
  const VW = 300, VH = 190;
  const PL = 42, PR = 8, PT = 16, PB = 28;
  const CW = VW - PL - PR, CH = VH - PT - PB;
  const minV = Math.min(...profitData, 0);
  const maxV = Math.max(...profitData, 1);
  const range = maxV - minV || 1;
  const toY = (v) => PT + CH - ((v - minV) / range) * CH;
  const zeroY = toY(0);
  const n = months.length;
  const slot = CW / n;
  const bw = slot * 0.55;

  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} width="100%" style={{ display:"block" }}>
      <line x1={PL} y1={zeroY} x2={PL+CW} y2={zeroY} stroke="#e8ecf3" strokeWidth={1}/>
      {[0, 0.5, 1].map((r,i) => {
        const v = minV + r * range;
        const y = toY(v);
        return <g key={i}>
          <line x1={PL} y1={y} x2={PL+CW} y2={y} stroke="#f2f4f9" strokeWidth={1}/>
          <text x={PL-4} y={y+4} textAnchor="end" fontSize={10} fill="#9CA3AF">{fmtK(v)}</text>
        </g>;
      })}
      {profitData.map((v,i) => {
        const x = PL + i * slot + (slot - bw) / 2;
        const top = toY(Math.max(v,0)), bot = toY(Math.min(v,0));
        const h = Math.max(bot - top, 2);
        return <g key={i}>
          <defs>
            <linearGradient id={`bg${i}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={v>=0?"#7FA9CC":"#F5B5B5"}/>
              <stop offset="100%" stopColor={v>=0?"#5B8FB9":"#EF4444"}/>
            </linearGradient>
          </defs>
          <rect x={x} y={top} width={bw} height={h} fill={`url(#bg${i})`} rx={3}/>
          <text x={x+bw/2} y={VH-6} textAnchor="middle" fontSize={10} fill="#6B7280">{months[i].replace(/\d{4}年/,"")}</text>
        </g>;
      })}
    </svg>
  );
}

// ── DONUT CHART ───────────────────────────────────────────────────────────────
function DonutChart({ sales, expenses, size, setModal, val }) {
  const sz = size || 240;
  const total = sales + expenses;
  const cx = sz / 2, cy = sz / 2;
  const r = sz * 0.37;
  const stroke = sz * 0.14;
  const circ = 2 * Math.PI * r;
  const profitRatio = sales > 0 ? Math.round((sales - expenses) / sales * 100) : 0;

  if (total === 0) return (
    <div style={{ width:sz, height:sz, borderRadius:"50%", background:"#e8ecf3", display:"flex", alignItems:"center", justifyContent:"center", color:"#bbb", fontSize:13 }}>データなし</div>
  );

  const salesRatio = sales / total;
  const salesDash = circ * salesRatio;
  const expDash = circ * (expenses / total);

  return (
    <div style={{ position:"relative", width:sz, height:sz, flexShrink:0 }}>
      <svg width={sz} height={sz} style={{ transform:"rotate(-90deg)" }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e8ecf3" strokeWidth={stroke} />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#FCEBEB" strokeWidth={stroke}
          strokeDasharray={`${expDash} ${circ - expDash}`}
          strokeDashoffset={-salesDash} strokeLinecap="butt" />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#4A7BA3" strokeWidth={stroke}
          strokeDasharray={`${salesDash} ${circ - salesDash}`} strokeLinecap="butt" />
      </svg>
      <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", pointerEvents:"none" }}>
        <div style={{ fontSize:11, color:"#999", marginBottom:2, fontWeight:600 }}>利益率</div>
        <div style={{ fontSize:36, fontWeight:900, color:profitRatio >= 0 ? "#185FA5" : "#A32D2D", letterSpacing:-2, lineHeight:1 }}>{profitRatio}<span style={{ fontSize:16 }}>%</span></div>
      </div>
    </div>
  );
}

// ── ROOT ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [saved] = useState(load);
  const [screen,      setScreen]      = useState("home");
  const [taxMode,     setTaxMode]     = useState("inc");
  const [sales,       setSales]       = useState(saved?.sales || shiftDemo(DEMO_SALES));
  const [expenses,    setExpenses]    = useState(saved?.expenses || shiftDemo(DEMO_EXP));
  const [master,      setMaster]      = useState(() => migrateMaster(saved?.master));
  const [invoices,    setInvoices]    = useState(saved?.invoices || []);
  const [invoiceSeq,  setInvoiceSeq]  = useState(saved?.invoiceSeq || {});
  const [selMonth,    setSelMonth]    = useState(thisMonth());
  const [toast,       setToast]       = useState(null);
  const [modal,       setModal]       = useState(null);
  const [opInvoice,   setOpInvoice]   = useState(!!saved?.opInvoice);
  const [showOPModal, setShowOPModal] = useState(false);
  const [entry,       setEntry]       = useState(null);   // 記録を追加（下から出る）："sales" | "expenses" | null

  useEffect(() => { saveAll({ sales, expenses, master, invoices, invoiceSeq, opInvoice }); }, [sales, expenses, master, invoices, invoiceSeq, opInvoice]);
  const showToast = (msg, type="success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };
  // 入力欄から、その場で相手先に足す
  const addCounterparty = (name, kind="売り先") => {
    const cp = { ...CP_BLANK, id: Date.now(), name: name.trim(), kind };
    setMaster(m => ({ ...m, counterparties: [...m.counterparties, cp] }));
    showToast(`「${cp.name}」を相手先に足しました`);
    return cp;
  };

  const fiscalMonths = getFiscalMonths(master.company.fiscalMonth || 4, getFiscalYear(master.company.fiscalMonth || 4, master.company.fiscalNum || 1));

  const curSales    = sales.filter(s => s.month === selMonth);
  const curExp      = expenses.filter(e => e.month === selMonth);
  const totalSales  = curSales.reduce((s,r) => s + r.amount, 0);
  const totalExp    = curExp.reduce((s,r) => s + r.amount, 0);
  const genka       = curExp.filter(e => e.account === "売上原価").reduce((s,r) => s + r.amount, 0);
  const sga         = curExp.filter(e => e.account !== "売上原価").reduce((s,r) => s + r.amount, 0);
  const grossProfit = totalSales - genka;
  const opProfit    = grossProfit - sga;
  const ar        = sales.filter(s => s.status === "未入金").reduce((s,r) => s + r.amount, 0);
  const ap          = expenses.filter(e => e.status === "未払い").reduce((s,r) => s + r.amount, 0);
  const val         = (n) => taxMode === "inc" ? fmt(n) : fmtEx(n);

  const shared = { screen, setScreen, taxMode, setTaxMode, sales, setSales, expenses, setExpenses, master, setMaster, selMonth, setSelMonth, totalSales, totalExp, grossProfit, opProfit, ar, ap, val, curSales, curExp, showToast, genka, sga, setModal, opInvoice, showOPModal: () => setShowOPModal(true), fiscalMonths, invoices, setInvoices, invoiceSeq, setInvoiceSeq, addCounterparty };
  const Screens = { home:HomeScreen, records:RecordsScreen, settings:SettingsScreen, sales:SalesScreen, expenses:ExpenseScreen, pl:PLScreen, ar:ARScreen, cashflow:CashflowScreen, invoice:InvoiceScreen, "invoice-new":InvoiceNew, partners:PartnersScreen, master:MasterScreen };
  const Screen = Screens[screen] || HomeScreen;
  const hasDemo = sales.some(r=>r.demo) || expenses.some(r=>r.demo) || master.counterparties.some(c=>c.sample);
  const clearDemo = () => { setSales(p=>p.filter(r=>!r.demo)); setExpenses(p=>p.filter(r=>!r.demo)); setMaster(m=>({ ...m, counterparties: m.counterparties.filter(c=>!c.sample) })); showToast("見本を消しました。自分の数字を入れられます"); };

  return (
    <div style={{ fontFamily:"'Noto Sans JP','Hiragino Sans',sans-serif", fontSize:16, color:T.text, display:"flex", minHeight:"100vh", background:T.bg }}>
      <style>{css}</style>
      {toast && <div role="status" className="toast" style={{ background:toast.type==="error"?T.errSoft:T.okSoft, color:toast.type==="error"?"#B42318":"#05603A", borderColor:toast.type==="error"?"#F5B5B5":"#A6E4CC" }}>{toast.msg}</div>}
      <DrillModal modal={modal} onClose={() => setModal(null)} />
      {showOPModal && <OPModal onClose={() => setShowOPModal(false)} onContract={() => { setOpInvoice(true); setShowOPModal(false); setScreen("invoice"); showToast("請求書オプションを契約しました！"); }} />}
      <Sidebar screen={screen} setScreen={setScreen} taxMode={taxMode} setTaxMode={setTaxMode} opInvoice={opInvoice} showOPModal={() => setShowOPModal(true)} master={master} selMonth={selMonth} setSelMonth={setSelMonth} fiscalMonths={fiscalMonths} />
      <div className="main-area" style={{ marginLeft:240, flex:1, background:T.bg, minHeight:"100vh", overflowX:"hidden" }}>
        {hasDemo && (
          <div className="demo-bar" role="status">
            <span><b>見本の数字が入っています。</b>どんな画面になるかを見るためのものです。</span>
            <button onClick={clearDemo}>見本を消して、自分の数字で始める</button>
          </div>
        )}
        <Screen {...shared} />
      </div>
      <BottomNav screen={screen} setScreen={setScreen} onPlus={() => setEntry("sales")} />
      {entry && <EntrySheet tab={entry} setTab={setEntry} onClose={() => setEntry(null)} {...shared} />}
    </div>
  );
}

// ── HOME ──────────────────────────────────────────────────────────────────────
function HomeScreen({ setScreen, totalSales, totalExp, opProfit, ar, ap, val, sales, setSales, expenses, setExpenses, selMonth, setSelMonth, setModal, curSales, curExp, grossProfit, genka, sga, fiscalMonths, master, opInvoice, showOPModal, invoices, showToast }) {
  const unpS = sales.filter(s=>s.status==="未入金"), unpE = expenses.filter(e=>e.status==="未払い");
  const arCount = unpS.length, apCount = unpE.length;
  const fiscalIdx = fiscalMonths.indexOf(selMonth);
  const fiscalLabel = fiscalIdx >= 0 ? `第${master.company.fiscalNum || 1}期 ${fiscalIdx+1}か月目` : "";

  // chart data (6 months)
  const endIdx = Math.max(fiscalIdx, 0); const ms6 = fiscalMonths.slice(Math.max(0, endIdx-5), Math.max(0, endIdx-5)+6);
  const salesData  = ms6.map(m => sales.filter(r=>r.month===m).reduce((s,r)=>s+r.amount,0));
  const expData    = ms6.map(m => expenses.filter(r=>r.month===m).reduce((s,r)=>s+r.amount,0));
  const profitData = salesData.map((v,i) => v - expData[i]);

  const mSales = { title:`${selMonth}分　売上合計`,   amount:val(totalSales), rows:curSales.map(r=>({ "日付":r.date,"相手先":r.client,"金額":val(r.amount),"状態":r.status })), note:`${curSales.length}件の合計です。` };
  const mExp   = { title:`${selMonth}分　経費合計`,   amount:val(totalExp), formula:`売上原価 ${val(genka)}\n＋ 販管費 ${val(sga)}\n＝ 経費合計 ${val(totalExp)}`, rows:curExp.map(r=>({ "相手先":r.client,"科目":r.account,"金額":val(r.amount) })) };
  const mOp    = { title:`${selMonth}分の利益（営業利益）`, amount:val(opProfit), formula:`売上高 ${val(totalSales)}\nー 売上原価 ${val(genka)}\n＝ 粗利 ${val(grossProfit)}\nー 販管費 ${val(sga)}\n＝ 営業利益 ${val(opProfit)}`, note:"まだ入金されていない売上・まだ払っていない経費も含めた見込みです。口座にあるお金とは違います。" };
  const mAr    = { title:"未入金の合計", amount:val(ar), rows:unpS.map(r=>({ "相手先":r.client,"何月分":r.month,"金額":val(r.amount) })), note:`${arCount}件が未入金です。` };
  const mAp    = { title:"未払金の合計", amount:val(ap), rows:unpE.map(r=>({ "相手先":r.client,"科目":r.account,"金額":val(r.amount) })), note:`${apCount}件が未払いです。` };

  // 今日やること：入金の確認（請求書の期限があるものは期限超過を出す）・支払い
  const td = today();
  const dueOf = (r) => { const inv = r.invoiceId && invoices.find(v => v.id === r.invoiceId); return inv && inv.dueDate ? inv.dueDate : ""; };
  const inList = unpS.map(r => ({ r, due: dueOf(r) })).sort((a,b) => (a.due||"9") .localeCompare(b.due||"9"));
  const late = inList.filter(x => x.due && x.due < td).length;
  const mdJp = (d) => { const [, m, dd] = String(d||"").split("-").map(Number); return m ? `${m}月${dd}日` : ""; };
  const markIn = (id) => { setSales(p=>p.map(r=>r.id===id?{...r,status:"入金済"}:r)); showToast("入金済みにしました"); };
  const markOut = (id) => { setExpenses(p=>p.map(e=>e.id===id?{...e,status:"支払済"}:e)); showToast("支払済みにしました"); };
  const todo = Math.min(inList.length, 3) + Math.min(unpE.length, 3);
  const mo = monthShort(selMonth);

  return (
    <div className="screen-wrap b-screen home">
      <div className="hello">
        <div><small>{greeting()}</small><b>{master.company.name ? `${master.company.name}さん` : "Soku経理"}</b></div>
        <MonthPill selMonth={selMonth} setSelMonth={setSelMonth} fiscalMonths={fiscalMonths} />
      </div>
      {fiscalLabel && <div className="muted fiscal">{fiscalLabel}</div>}

      <button className="card hero" onClick={() => setScreen("cashflow")} aria-label={`${mo}の利益。お金の流れを開く`}>
        <span className="l">{mo}の利益<small>（見込み）</small></span>
        <span className="v" onClick={e => { e.stopPropagation(); setModal(mOp); }}>{val(opProfit)}</span>
        <span className="go"><Ic n="chev" /></span>
      </button>

      <div className="two">
        <div className="card kpi"><span>{mo}の売上</span><N v={val(totalSales)} setModal={setModal} modal={mSales} style={{ borderBottom:"none" }} /></div>
        <div className="card kpi"><span>{mo}の経費</span><N v={val(totalExp)} setModal={setModal} modal={mExp} style={{ borderBottom:"none" }} /></div>
        <div className="card kpi"><span>未入金<small>（全期間）</small></span><b className="cnt">{arCount}<small>件</small></b><N v={val(ar)} setModal={setModal} modal={mAr} style={{ borderBottom:"none" }} /></div>
        <div className="card kpi"><span>未払金<small>（全期間）</small></span><b className="cnt">{apCount}<small>件</small></b><N v={val(ap)} setModal={setModal} modal={mAp} style={{ borderBottom:"none" }} /></div>
      </div>

      <h2 className="sec-h">今日やること <span className="badge-n">{todo}件</span></h2>
      {todo === 0 && <div className="card pad muted">いま、やることはありません。</div>}
      {inList.length > 0 && (
        <div className="card group">
          <div className="g-h">入金の確認 {late > 0 && <span className="late">（期限超過 {late}件）</span>}</div>
          {inList.slice(0,3).map(({ r, due }) => (
            <div key={r.id} className="todo">
              <div className="c"><b>{r.client}</b><span className="amt">{val(r.amount)}</span><small>{r.month}分{r.memo ? `・${r.memo}` : ""}</small></div>
              <div className="m">{due ? (due < td ? <span className="tag err">期限超過</span> : null) : null}{due && <small>期限：{mdJp(due)}</small>}</div>
              <button className="btn-pri sm" onClick={() => markIn(r.id)}>入金された</button>
            </div>
          ))}
          {inList.length > 3 && <button className="more" onClick={() => setScreen("ar")}>ほか{inList.length-3}件を見る</button>}
        </div>
      )}
      {unpE.length > 0 && (
        <div className="card group">
          <div className="g-h">支払いの予定（未払金）</div>
          {unpE.slice(0,3).map(r => (
            <div key={r.id} className="todo">
              <div className="c"><b>{r.client}</b><span className="amt">{val(r.amount)}</span><small>{r.month}分・{r.account}</small></div>
              <div className="m" />
              <button className="btn-sub sm" onClick={() => markOut(r.id)}>払った</button>
            </div>
          ))}
          {unpE.length > 3 && <button className="more" onClick={() => setScreen("ar")}>ほか{unpE.length-3}件を見る</button>}
        </div>
      )}

      <h2 className="sec-h">売上と経費の動き<span className="muted">（{monthShort(ms6[0])}〜{monthShort(ms6[ms6.length-1])}）</span></h2>
      <div className="charts-row" style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:16 }}>
        <div className="card pad">
          <div className="legend"><span><i style={{ background:T.pri }} />売上</span><span><i style={{ background:T.warn }} />経費</span></div>
          <LineChart months={ms6} salesData={salesData} expData={expData} />
        </div>
        <div className="card pad">
          <div className="legend"><span>月ごとの利益</span></div>
          <BarChart months={ms6} profitData={profitData} />
        </div>
      </div>

      {/* PCだけ：よく使う画面へのボタン（スマホは下のメニューと設定から） */}
      <div className="quick-grid pc-only">
        {[
          { id:"records", icon:"list", label:"記録" }, { id:"cashflow", icon:"chart", label:"お金の流れ" },
          { id:"invoice", icon:"doc", label:"請求書" }, { id:"partners", icon:"people", label:"取引先" },
          { id:"pl", icon:"list", label:"損益計算書" }, { id:"ar", icon:"yen", label:"未入金・未払金" }, { id:"master", icon:"gear", label:"会社・口座" },
        ].map(m => <button key={m.id} className="card qb" onClick={() => (m.id==="invoice" && !opInvoice) ? showOPModal() : setScreen(m.id)}><Ic n={m.icon} /><span>{m.label}</span></button>)}
      </div>
    </div>
  );
}


// 画面に出す言葉（中のデータは「売掛」「買掛」のまま。こわさないため）
const TYPE_LABEL = { "売掛":"あとで入金", "買掛":"あとで払う" };
const typeLabel = (t) => TYPE_LABEL[t] || t;

// ── 相手先をえらぶ入力欄（打つと絞りこみ・なければその場で足せる） ─────────────
function CpPicker({ value, onChange, onPick, counterparties, addCounterparty, kind="売り先", placeholder="名前の一部を入れると出てきます" }) {
  const [open, setOpen] = useState(false);
  const q = String(value||"").trim();
  const usable = counterparties.filter(c => c.kind==="両方" || c.kind===kind || !c.kind);
  const list = (q ? usable.filter(c => c.name.toLowerCase().includes(q.toLowerCase())) : usable).slice(0, 8);
  const exact = counterparties.some(c => c.name === q);
  const pick = (c) => { onChange(c.name); if (onPick) onPick(c); setOpen(false); };
  return (
    <div style={{ position:"relative" }}>
      <input style={s.inp} value={value} placeholder={placeholder} autoComplete="off"
        onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)}
        onChange={e => { onChange(e.target.value); setOpen(true); }} />
      {open && (list.length > 0 || (q && !exact)) && (
        <div style={s.pickList} role="listbox">
          {list.map(c => (
            <button key={c.id} type="button" style={s.pickItem} onMouseDown={e => e.preventDefault()} onClick={() => pick(c)}>
              <span style={{ fontWeight:600 }}>{c.name}</span>
              {c.terms && c.terms!=="都度" && <span style={{ fontSize:13, color:"#999", marginLeft:8 }}>{c.terms}</span>}
            </button>
          ))}
          {q && !exact && (
            <button type="button" style={{ ...s.pickItem, color:"#4A7BA3", fontWeight:700 }} onMouseDown={e => e.preventDefault()} onClick={() => pick(addCounterparty(q, kind))}>
              ＋「{q}」を相手先に足す
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── SALES ─────────────────────────────────────────────────────────────────────
function SalesScreen({ setSales, setSelMonth, selMonth, val, showToast, curSales, setModal, master, fiscalMonths, addCounterparty }) {
  const [showForm, setShowForm] = useState(false);
  const markPaid = (id) => { setSales(p=>p.map(r=>r.id===id?{...r,status:"入金済"}:r)); showToast("入金済みにしました"); };
  const total = curSales.reduce((s,r)=>s+r.amount,0);
  return (
    <div className="screen-wrap" style={s.screenWrap}>
      <div style={s.pageHeader}><div style={s.pageTitle}>売上入力</div><button style={s.btnP} onClick={()=>setShowForm(true)}>＋ 新規入力</button></div>
      <MonthBar selMonth={selMonth} setSelMonth={setSelMonth} fiscalMonths={fiscalMonths} />
      {showForm && <div style={s.formCard}><div style={s.formTitle}>売上を入力する</div><SaleForm setSales={setSales} setSelMonth={setSelMonth} showToast={showToast} curSales={curSales} master={master} fiscalMonths={fiscalMonths} addCounterparty={addCounterparty} onDone={()=>setShowForm(false)} /></div>}
      <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:8, gap:6, alignItems:"center" }}>
        <span style={{ fontSize:12, color:"#aaa" }}>合計</span>
        <N v={val(total)} setModal={setModal} style={{ fontSize:16, fontWeight:800, color:"#0F6E56" }} modal={{ title:`${selMonth}　売上合計`, amount:val(total), color:"#0F6E56", rows:curSales.map(r=>({ "日付":r.date,"相手先":r.client,"区分":typeLabel(r.type),"金額":val(r.amount),"状態":r.status })) }} />
      </div>
      <div className="tbl-wrap" style={s.tblWrap}>
        <table className="t-sales" style={s.tbl}>
          <thead><tr>{["日付","反映月","相手先","区分","金額","税率","備考","状態",""].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead>
          <tbody>
            {curSales.length===0 ? <tr><td colSpan={9} style={{ ...s.td, textAlign:"center", color:"#bbb", padding:32 }}>まだ売上データがありません</td></tr>
            : curSales.map(r=>(
              <tr key={r.id} style={s.tr}>
                <td style={s.td}>{r.date}</td><td style={s.td}>{r.month}</td>
                <td style={{ ...s.td, fontWeight:500 }}>{r.client}</td>
                <td style={s.td}><span style={{ ...s.badge, ...(r.type==="売掛"?s.bAmber:s.bGreen) }}>{typeLabel(r.type)}</span></td>
                <td style={{ ...s.td, textAlign:"right" }}><N v={val(r.amount)} setModal={setModal} style={{ fontWeight:700, color:"#0F6E56" }} modal={{ title:`${r.client}への売上`, amount:val(r.amount), color:"#0F6E56", formula:`税込 ${fmt(r.amount)}${r.tax>0?`\n（税抜 ${fmtEx(r.amount)}）`:""}`, rows:[{ "相手先":r.client,"日付":r.date,"反映月":r.month,"区分":typeLabel(r.type),"備考":r.memo||"—","状態":r.status }] }} /></td>
                <td style={{ ...s.td, textAlign:"center" }}>{r.tax}%</td>
                <td style={{ ...s.td, color:"#aaa" }}>{r.memo}</td>
                <td style={s.td}><span style={{ ...s.badge, ...(r.status==="入金済"?s.bGreen:s.bAmber) }}>{r.status}</span></td>
                <td style={{ ...s.td, whiteSpace:"nowrap" }}>{r.status==="未入金"&&<button style={s.paidBtn} onClick={()=>markPaid(r.id)}>入金済にする</button>} <button style={s.delBtn} aria-label={`${r.client}の売上を消す`} onClick={()=>{ if (window.confirm(`${r.client} ${fmt(r.amount)} を消します。よろしいですか？`)) { setSales(p=>p.filter(x=>x.id!==r.id)); showToast("消しました"); } }}>消す</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── EXPENSES ──────────────────────────────────────────────────────────────────
function ExpenseScreen({ setExpenses, setSelMonth, selMonth, val, showToast, curExp, setModal, master, fiscalMonths, addCounterparty }) {
  const [showForm, setShowForm] = useState(false);
  const markPaid = (id) => { setExpenses(p=>p.map(e=>e.id===id?{...e,status:"支払済"}:e)); showToast("支払済みにしました"); };
  const total = curExp.reduce((s,r)=>s+r.amount,0);
  return (
    <div className="screen-wrap" style={s.screenWrap}>
      <div style={s.pageHeader}><div style={s.pageTitle}>経費入力</div><button style={s.btnP} onClick={()=>setShowForm(true)}>＋ 新規入力</button></div>
      <MonthBar selMonth={selMonth} setSelMonth={setSelMonth} fiscalMonths={fiscalMonths} />
      {showForm && <div style={s.formCard}><div style={s.formTitle}>経費を入力する</div><ExpenseForm setExpenses={setExpenses} setSelMonth={setSelMonth} showToast={showToast} curExp={curExp} master={master} fiscalMonths={fiscalMonths} addCounterparty={addCounterparty} onDone={()=>setShowForm(false)} /></div>}
      <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:8, gap:6, alignItems:"center" }}>
        <span style={{ fontSize:12, color:"#aaa" }}>合計</span>
        <N v={val(total)} setModal={setModal} style={{ fontSize:16, fontWeight:800, color:"#A32D2D" }} modal={{ title:`${selMonth}　経費合計`, amount:val(total), color:"#A32D2D", rows:curExp.map(r=>({ "相手先":r.client,"科目":r.account,"金額":val(r.amount),"状態":r.status })) }} />
      </div>
      <div className="tbl-wrap" style={s.tblWrap}>
        <table className="t-exp" style={s.tbl}>
          <thead><tr>{["日付","反映月","相手先","勘定科目","区分","金額","備考","状態",""].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead>
          <tbody>
            {curExp.length===0 ? <tr><td colSpan={9} style={{ ...s.td, textAlign:"center", color:"#bbb", padding:32 }}>まだ経費データがありません</td></tr>
            : curExp.map(r=>(
              <tr key={r.id} style={s.tr}>
                <td style={s.td}>{r.date}</td><td style={s.td}>{r.month}</td>
                <td style={{ ...s.td, fontWeight:500 }}>{r.client}</td>
                <td style={{ ...s.td, color:"#666" }}>{r.account}</td>
                <td style={s.td}><span style={{ ...s.badge, ...(r.type==="買掛"?s.bRed:s.bGreen) }}>{typeLabel(r.type)}</span></td>
                <td style={{ ...s.td, textAlign:"right" }}><N v={val(r.amount)} setModal={setModal} style={{ fontWeight:700 }} modal={{ title:`${r.client} / ${r.account}`, amount:val(r.amount), formula:`税込 ${fmt(r.amount)}\n勘定科目：${r.account}\n区分：${typeLabel(r.type)}`, rows:[{ "相手先":r.client,"日付":r.date,"反映月":r.month,"科目":r.account,"備考":r.memo||"—","状態":r.status }] }} /></td>
                <td style={{ ...s.td, color:"#aaa" }}>{r.memo}</td>
                <td style={s.td}><span style={{ ...s.badge, ...(r.status==="支払済"?s.bGreen:s.bRed) }}>{r.status}</span></td>
                <td style={{ ...s.td, whiteSpace:"nowrap" }}>{r.status==="未払い"&&<button style={{ ...s.paidBtn, borderColor:"#f09595", color:"#A32D2D" }} onClick={()=>markPaid(r.id)}>支払済にする</button>} <button style={s.delBtn} aria-label={`${r.client}の経費を消す`} onClick={()=>{ if (window.confirm(`${r.client} ${fmt(r.amount)} を消します。よろしいですか？`)) { setExpenses(p=>p.filter(x=>x.id!==r.id)); showToast("消しました"); } }}>消す</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── PL ────────────────────────────────────────────────────────────────────────
function PLScreen({ setScreen, selMonth, setSelMonth, val, totalSales, genka, grossProfit, sga, opProfit, curExp, setModal, master, fiscalMonths, sales, expenses }) {
  const [viewMode, setViewMode] = useState("monthly");
  const fiscalNum = master.company.fiscalNum || 1;
  const fiscalIdx = fiscalMonths.indexOf(selMonth);

  const annualSales = fiscalMonths.reduce((s,m)=>s+sales.filter(r=>r.month===m).reduce((a,r)=>a+r.amount,0),0);
  const annualExp   = fiscalMonths.reduce((s,m)=>s+expenses.filter(r=>r.month===m).reduce((a,r)=>a+r.amount,0),0);
  const annualGenka = fiscalMonths.reduce((s,m)=>s+expenses.filter(r=>r.month===m&&r.account==="売上原価").reduce((a,r)=>a+r.amount,0),0);
  const annualSga   = annualExp - annualGenka;
  const annualGross = annualSales - annualGenka;
  const annualOp    = annualGross - annualSga;

  const plRows = (tSales, gk, gross, sg, op) => [
    { label:"売上高",           v:tSales, lv:0, color:"#0F6E56", bold:true },
    { label:"売上原価",         v:gk,     lv:1 },
    { label:"粗利",             v:gross,  lv:0, color:gross>0?"#185FA5":"#A32D2D", bold:true, hl:true },
    ...master.accounts.filter(a=>a.category==="sga").map(a=>{
      const amt = viewMode==="annual"
        ? fiscalMonths.reduce((s,m)=>s+expenses.filter(e=>e.month===m&&e.account===a.label).reduce((x,r)=>x+r.amount,0),0)
        : curExp.filter(e=>e.account===a.label).reduce((s,r)=>s+r.amount,0);
      return { label:a.label, v:amt, lv:1, hide:amt===0 };
    }).filter(r=>!r.hide),
    { label:"販管費 計",        v:sg,     lv:1, bold:true },
    { label:"営業利益",         v:op,     lv:0, color:op>0?"#0F6E56":"#A32D2D", bold:true, hl:true, big:true },
  ];

  const monthlyRows = plRows(totalSales, genka, grossProfit, sga, opProfit);
  const annualRows  = plRows(annualSales, annualGenka, annualGross, annualSga, annualOp);
  const rows = viewMode==="annual" ? annualRows : monthlyRows;

  return (
    <div className="screen-wrap b-screen">
      <ScreenHead title="損益計算書" onBack={() => setScreen("settings")} />
      <div style={s.pageHeader}>
        <div>
          <div style={{ fontSize:14, color:T.sub }}>第{fiscalNum}期　{fiscalMonths[0]}〜{fiscalMonths[11]}</div>
        </div>
        <div style={{ display:"flex", gap:10, alignItems:"center" }}>
          <div style={s.taxSwitch}>
            <button style={{ ...s.taxBtn, ...(viewMode==="monthly"?s.taxActive:{}) }} onClick={()=>setViewMode("monthly")}>月次</button>
            <button style={{ ...s.taxBtn, ...(viewMode==="annual"?s.taxActive:{}) }} onClick={()=>setViewMode("annual")}>年間累計</button>
          </div>
          <button style={s.btnS}>CSV出力</button>
        </div>
      </div>
      {viewMode==="monthly" && <MonthBar selMonth={selMonth} setSelMonth={setSelMonth} fiscalMonths={fiscalMonths} />}
      <div style={s.plWrap}>
        <div style={s.plHdr}>
          <span>{viewMode==="annual" ? `第${fiscalNum}期　年間累計` : `${selMonth}　${fiscalIdx>=0?`第${fiscalNum}期 ${fiscalIdx+1}ヶ月目`:""}`}</span>
        </div>
        {rows.map((r,i) => (
          <div key={i} style={{ ...s.plRow, background:r.hl?(r.big?"#E8F0F7":"#E8F0F7"):i%2===0?"#fff":"#fafafa", borderTop:r.hl?"1px solid #C9DAE8":undefined }}>
            <span style={{ paddingLeft:r.lv*24, fontSize:r.big?15:13, fontWeight:r.bold?600:400, color:r.color||(r.lv===1?"#777":"#222") }}>
              {r.lv===1&&<span style={{ marginRight:6, color:"#ddd" }}>└</span>}{r.label}
            </span>
            <N v={val(r.v)} setModal={setModal} modal={{ title:r.label, amount:val(r.v), color:r.color }} style={{ fontSize:r.big?18:14, fontWeight:r.bold?800:500, color:r.color||"#222" }} />
          </div>
        ))}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:12 }}>
        {[
          { l:"粗利率",     v:(viewMode==="annual"?annualSales:totalSales)?Math.round((viewMode==="annual"?annualGross:grossProfit)/(viewMode==="annual"?annualSales:totalSales)*100)+"%":"—", c:"#185FA5" },
          { l:"営業利益率", v:(viewMode==="annual"?annualSales:totalSales)?Math.round((viewMode==="annual"?annualOp:opProfit)/(viewMode==="annual"?annualSales:totalSales)*100)+"%":"—", c:"#0F6E56" },
        ].map((c,i) => <div key={i} style={s.statCard}><div style={s.statLabel}>{c.l}</div><div style={{ fontSize:24, fontWeight:800, color:c.c }}>{c.v}</div></div>)}
      </div>
    </div>
  );
}

// ── AR/AP ─────────────────────────────────────────────────────────────────────
function ARScreen({ sales, setSales, expenses, setExpenses, val, showToast, setModal, setScreen }) {
  const unpS=sales.filter(s=>s.status==="未入金"), paidS=sales.filter(s=>s.status==="入金済");
  const unpE=expenses.filter(e=>e.status==="未払い"), paidE=expenses.filter(e=>e.status==="支払済");
  const arT=unpS.reduce((s,r)=>s+r.amount,0), apT=unpE.reduce((s,r)=>s+r.amount,0);
  const mS=(id)=>{setSales(p=>p.map(r=>r.id===id?{...r,status:"入金済"}:r));showToast("入金済みにしました");};
  const mE=(id)=>{setExpenses(p=>p.map(e=>e.id===id?{...e,status:"支払済"}:e));showToast("支払済みにしました");};
  const Row = ({ r, sub, btn, onBtn, done, color, kind }) => (
    <div className="todo">
      <div className="c"><b>{r.client}</b><small>{sub}</small></div>
      <div className="m"><N v={val(r.amount)} setModal={setModal} style={{ fontSize:16, fontWeight:700, color: done ? T.sub : color, borderBottom:"none" }} modal={{ title:`${r.client}　${kind}`, amount:val(r.amount), rows:[{ "相手先":r.client, "何月分":r.month, "内容":r.account || r.memo || "—" }] }} /></div>
      {btn ? <button className="btn-sub sm" onClick={onBtn}>{btn}</button> : <span className="st ok">{done}</span>}
    </div>
  );
  return (
    <div className="screen-wrap b-screen">
      <ScreenHead title="未入金・未払金" onBack={() => setScreen("settings")} />
      <div className="master-grid" style={{ display:"grid", gridTemplateColumns:"repeat(2,minmax(0,1fr))", gap:16 }}>
        <div style={{ minWidth:0 }}>
          <h2 className="sec-h" style={{ marginTop:0, justifyContent:"space-between" }}><span>未入金<span className="inl">（まだ入っていないお金）</span></span><N v={val(arT)} setModal={setModal} style={{ color:"#8A5300" }} modal={{ title:"未入金の合計", amount:val(arT), rows:unpS.map(r=>({ "相手先":r.client,"何月分":r.month,"金額":val(r.amount) })) }} /></h2>
          <div className="card list">
            {unpS.length===0 && <div className="empty">未入金はありません</div>}
            {unpS.map(r => <Row key={r.id} r={r} sub={`${r.month}分・${typeLabel(r.type)}`} btn="入金された" onBtn={()=>mS(r.id)} color="#8A5300" kind="未入金" />)}
          </div>
          <h2 className="sec-h">入金済み</h2>
          <div className="card list">
            {paidS.length===0 && <div className="empty">まだありません</div>}
            {paidS.map(r => <Row key={r.id} r={r} sub={`${r.month}分${r.memo ? `・${r.memo}` : ""}`} done="入金済" kind="入金済" />)}
          </div>
        </div>
        <div style={{ minWidth:0 }}>
          <h2 className="sec-h" style={{ marginTop:0, justifyContent:"space-between" }}><span>未払金<span className="inl">（まだ払っていないお金）</span></span><N v={val(apT)} setModal={setModal} style={{ color:"#B42318" }} modal={{ title:"未払金の合計", amount:val(apT), rows:unpE.map(r=>({ "相手先":r.client,"科目":r.account,"金額":val(r.amount) })) }} /></h2>
          <div className="card list">
            {unpE.length===0 && <div className="empty">未払金はありません</div>}
            {unpE.map(r => <Row key={r.id} r={r} sub={`${r.month}分・${r.account}`} btn="払った" onBtn={()=>mE(r.id)} color="#B42318" kind="未払金" />)}
          </div>
          <h2 className="sec-h">支払済み</h2>
          <div className="card list">
            {paidE.length===0 && <div className="empty">まだありません</div>}
            {paidE.map(r => <Row key={r.id} r={r} sub={`${r.month}分・${r.account}`} done="支払済" kind="支払済" />)}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── CASHFLOW ──────────────────────────────────────────────────────────────────
function CashflowScreen({ val, sales, expenses, setModal, fiscalMonths, setScreen, ar, ap, selMonth, setSelMonth }) {
  const ms = fiscalMonths;
  const dIn  = ms.map(m=>sales.filter(r=>r.month===m).reduce((s,r)=>s+r.amount,0));
  const dOut = ms.map(m=>expenses.filter(r=>r.month===m).reduce((s,r)=>s+r.amount,0));
  const bal  = dIn.map((v,i)=>{ let b=1000000; for(let j=0;j<=i;j++) b+=dIn[j]-dOut[j]; return b; });
  const mkIn =(i)=>({ title:`${ms[i]}分　入金合計`,amount:val(dIn[i]),rows:sales.filter(r=>r.month===ms[i]).map(r=>({ "相手先":r.client,"金額":val(r.amount) })) });
  const mkOut=(i)=>({ title:`${ms[i]}分　支払合計`,amount:val(dOut[i]),rows:expenses.filter(r=>r.month===ms[i]).map(r=>({ "相手先":r.client,"科目":r.account,"金額":val(r.amount) })) });
  const mkBal=(i)=>({ title:`${ms[i]}　月末残高`,amount:val(bal[i]),formula:i===0?`期首の残高 ¥1,000,000（仮の値）\n＋ 入金 ${val(dIn[0])}\nー 支払 ${val(dOut[0])}\n＝ ${val(bal[0])}`:`前月残高 ${val(bal[i-1])}\n＋ 入金 ${val(dIn[i])}\nー 支払 ${val(dOut[i])}\n＝ ${val(bal[i])}` });
  const selIdx = Math.max(0, ms.indexOf(selMonth) >= 0 ? ms.indexOf(selMonth) : ms.length - 1);
  const start = Math.max(0, Math.min(selIdx - 5, ms.length - 6));
  const idx6 = ms.slice(start, start + 6).map((_, k) => start + k);
  const sel = selIdx;
  const setSel = (i) => setSelMonth(ms[i]);
  const short = (v) => { const a = Math.abs(v); const t = a >= 10000 ? `${Math.round(a/10000).toLocaleString("ja-JP")}万` : a.toLocaleString("ja-JP"); return (v < 0 ? "−" : "") + t; };
  const unpS = sales.filter(s=>s.status==="未入金"), unpE = expenses.filter(e=>e.status==="未払い");
  const max = Math.max(...idx6.map(i => Math.abs(bal[i])), 1);
  const H = 150;
  return (
    <div className="screen-wrap b-screen">
      <ScreenHead title="資金繰り（見込み）" onBack={() => setScreen("home")} />
      <div className="month-row"><MonthPill selMonth={selMonth} setSelMonth={setSelMonth} fiscalMonths={fiscalMonths} /><span className="muted">棒を押すと、その月に切りかわります</span></div>
      <div className="card pad">
        <div className="chart-t">月末に手元にあるお金の見込み<small>（{ms[idx6[0]]}〜{monthShort(ms[idx6[idx6.length-1]])}）</small></div>
        <div className="bars" style={{ height:H + 44 }}>
          {idx6.map(i => { const v = bal[i]; return (
            <button key={i} className={`bar ${i===sel?"on":""} ${v<0?"neg":""}`} onClick={() => setSel(i)} aria-label={`${ms[i]} 月末 ${val(v)}`}>
              <span className="bv">{short(v)}</span>
              <i style={{ height: Math.max(3, Math.abs(v) / max * H) }} />
              <span className="bm">{monthShort(ms[i])}</span>
            </button>
          ); })}
        </div>
        <p className="note-warn">期のはじめ（{ms[0]}）の残高は、仮に ¥1,000,000 として計算しています（本当の残高を入れる欄はまだありません）。</p>
      </div>
      <div className="card tbl-b">
        <div className="t-h">{ms[sel]}分の見込み</div>
        <div className="t-r"><span>月はじめの残高</span><N v={val(sel===0 ? 1000000 : bal[sel-1])} setModal={setModal} modal={sel===0 ? mkBal(0) : mkBal(sel-1)} style={{ borderBottom:"none" }} /></div>
        <div className="t-r"><span>入るお金（売上）</span><N v={val(dIn[sel])} setModal={setModal} modal={mkIn(sel)} style={{ borderBottom:"none" }} /></div>
        <div className="t-r"><span>出るお金（経費）</span><N v={"－" + val(dOut[sel])} setModal={setModal} modal={mkOut(sel)} style={{ borderBottom:"none" }} /></div>
        <div className="t-r total"><span>月末の残高（見込み）</span><N v={val(bal[sel])} setModal={setModal} modal={mkBal(sel)} style={{ borderBottom:"none" }} /></div>
      </div>
      <div className="card list">
        <button className="menu-row" onClick={() => setScreen("ar")}><span className="c"><b>未入金<small className="inl">（入金の予定）</small></b></span><span className="n">{unpS.length}件</span><span className="a">{val(ar)}</span><Ic n="chev" size={20} color={T.faint} /></button>
        <button className="menu-row" onClick={() => setScreen("ar")}><span className="c"><b>未払金<small className="inl">（支払いの予定）</small></b></span><span className="n">{unpE.length}件</span><span className="a">{val(ap)}</span><Ic n="chev" size={20} color={T.faint} /></button>
      </div>
    </div>
  );
}


// ── INVOICE SHEET（画面の確認用と、PDF用のA4を同じ部品で描く） ────────────────
const SHEET_FONT = "'Hiragino Sans','Hiragino Kaku Gothic ProN','Noto Sans JP','Noto Sans CJK JP','Yu Gothic','YuGothic','Meiryo',sans-serif";
const yen = (n) => "¥" + Math.round(n || 0).toLocaleString("ja-JP");
const jpDate = (ymd) => { const [y,m,d] = String(ymd||"").split("-").map(Number); return y ? `${y}年${m}月${d}日` : ""; };
const bankLine = (b) => b && (b.bankName || b.bankNo) ? `${b.bankName||""} ${b.bankBranch||""}\u3000${b.bankType||""} ${b.bankNo||""}${b.bankHolder?`\u3000名義：${b.bankHolder}`:""}`.trim() : "";

function InvoiceSheet({ inv, paper }) {
  const c = inv.calc;
  const has8 = inv.items.some(it => Number(it.tax) === 8);
  const P = paper;
  const cell = { padding: P ? "4px 8px" : "7px 6px", borderBottom:"1px solid #e3e8f0", fontSize:13, lineHeight: P ? 1.45 : 1.6, verticalAlign:"top" };
  const head = { ...cell, background:"#eef4fc", color:"#1a4f8f", fontWeight:700, borderBottom:"1px solid #C9DAE8", whiteSpace:"nowrap" };
  const sumRow = { display:"flex", justifyContent:"space-between", gap:12, fontSize:13, padding: P ? "2px 0" : "4px 0", color:"#333" };
  return (
    <div style={{ fontFamily:SHEET_FONT, color:"#111", background:"#fff", width: P ? 794 : "100%", minHeight: P ? 1123 : undefined, padding: P ? "40px 52px 36px" : "18px 16px", boxSizing:"border-box", lineHeight: P ? 1.5 : 1.6 }}>
      <div style={{ textAlign:"center", fontSize: P ? 28 : 22, fontWeight:800, letterSpacing: P ? 14 : 8, marginBottom: P ? 10 : 12 }}>請求書</div>
      <div style={{ display:"flex", flexWrap:"wrap", justifyContent:"space-between", gap:16, marginBottom: P ? 12 : 16 }}>
        <div style={{ flex:"1 1 300px", minWidth:0 }}>
          <div style={{ fontSize: P ? 20 : 18, fontWeight:700, borderBottom:"1.5px solid #111", paddingBottom:4, marginBottom:6, wordBreak:"break-all" }}>{inv.client}{"　"}{inv.honorific}</div>
          {inv.clientAddr && <div style={{ fontSize:13, color:"#444" }}>{inv.clientAddr}</div>}
          {inv.contact && <div style={{ fontSize:13, color:"#444" }}>ご担当：{inv.contact} 様</div>}
          <div style={{ fontSize:13, color:"#444", marginTop:8 }}>下記のとおりご請求申し上げます。</div>
          {inv.subject && <div style={{ fontSize:14, marginTop:4 }}>件名：{inv.subject}</div>}
          <div style={{ display:"flex", alignItems:"baseline", gap:12, marginTop:8, padding:"8px 14px", background:"#eef4fc", border:"1px solid #C9DAE8", borderRadius:4 }}>
            <span style={{ fontSize:14, fontWeight:700 }}>ご請求金額（税込）</span>
            <span style={{ fontSize: P ? 26 : 22, fontWeight:800, color:"#1a4f8f", marginLeft:"auto" }}>{yen(c.total)}</span>
          </div>
          {inv.dueDate && <div style={{ fontSize:13, marginTop:6 }}>お支払期限：{jpDate(inv.dueDate)}</div>}
        </div>
        <div style={{ flex:"0 1 260px", fontSize:13, color:"#333", minWidth:0, wordBreak:"break-all" }}>
          <div style={{ textAlign:"right", marginBottom:10 }}>
            <div>請求番号：{inv.no}</div>
            <div>請求日：{jpDate(inv.issueDate)}</div>
          </div>
          <div style={{ fontSize:15, fontWeight:700, color:"#111", marginBottom:2 }}>{inv.issuer.name || "（会社名が未設定です）"}</div>
          {inv.issuer.addr && <div>{inv.issuer.addr}</div>}
          {inv.issuer.tel && <div>TEL：{inv.issuer.tel}</div>}
          {inv.issuer.email && <div>{inv.issuer.email}</div>}
          {inv.issuer.regNo && <div style={{ marginTop:4, fontWeight:700 }}>登録番号：{inv.issuer.regNo}</div>}
        </div>
      </div>
      <table style={{ width:"100%", borderCollapse:"collapse", marginBottom:10, tableLayout: P ? "fixed" : "auto" }}>
        <thead><tr>
          <th style={{ ...head, textAlign:"left", width: P ? "50%" : undefined }}>品名・内容</th>
          <th style={{ ...head, textAlign:"right", width: P ? "10%" : undefined }}>数量</th>
          <th style={{ ...head, textAlign:"right", width: P ? "13%" : undefined }}>単価</th>
          <th style={{ ...head, textAlign:"center", width: P ? "9%" : undefined }}>税率</th>
          <th style={{ ...head, textAlign:"right", width: P ? "18%" : undefined }}>金額（税抜）</th>
        </tr></thead>
        <tbody>
          {inv.items.map((it, i) => (
            <tr key={i} data-row="1">
              <td style={{ ...cell, wordBreak:"break-all" }}>{it.desc}{Number(it.tax)===8 && " ※"}</td>
              <td style={{ ...cell, textAlign:"right", whiteSpace:"nowrap" }}>{Number(it.qty).toLocaleString("ja-JP")}{it.unit}</td>
              <td style={{ ...cell, textAlign:"right", whiteSpace:"nowrap" }}>{yen(it.price)}</td>
              <td style={{ ...cell, textAlign:"center", whiteSpace:"nowrap" }}>{Number(it.tax)}%</td>
              <td style={{ ...cell, textAlign:"right", whiteSpace:"nowrap" }}>{yen(lineAmount(it))}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div data-row="1" style={{ display:"flex", flexWrap:"wrap", justifyContent:"space-between", gap:12, marginBottom: P ? 10 : 14 }}>
        <div style={{ fontSize:13, color:"#555", flex:"1 1 200px" }}>{has8 && "※は軽減税率（8%）の対象です。"}</div>
        <div style={{ flex:"0 1 330px", minWidth:240 }}>
          {c.rates.map(r => (
            <div key={r.rate} style={{ ...sumRow, borderBottom:"1px dashed #e3e8f0" }}>
              <span>{r.rate === 0 ? "0%（非課税など）対象" : `${r.rate}%対象`}{"　"}{yen(r.base)}</span>
              <span>{r.rate === 0 ? "消費税 ¥0" : `消費税 ${yen(r.tax)}`}</span>
            </div>
          ))}
          <div style={sumRow}><span>小計（税抜）</span><span>{yen(c.subtotal)}</span></div>
          <div style={sumRow}><span>消費税</span><span>{yen(c.taxTotal)}</span></div>
          <div style={{ ...sumRow, fontSize:16, fontWeight:800, borderTop:"2px solid #1a4f8f", paddingTop:6, marginTop:2 }}><span>合計（税込）</span><span>{yen(c.total)}</span></div>
        </div>
      </div>
      {(bankLine(inv.issuer.bank) || inv.memo) && (
        <div data-row="1" style={{ border:"1px solid #e3e8f0", borderRadius:4, padding: P ? "8px 14px" : "10px 14px", fontSize:13, color:"#333" }}>
          {bankLine(inv.issuer.bank) && <><div style={{ fontWeight:700 }}>お振込先</div><div style={{ wordBreak:"break-all" }}>{bankLine(inv.issuer.bank)}</div></>}
          {inv.memo && <><div style={{ fontWeight:700, marginTop: bankLine(inv.issuer.bank) ? 8 : 0 }}>備考</div><div style={{ whiteSpace:"pre-wrap", wordBreak:"break-all" }}>{inv.memo}</div></>}
        </div>
      )}
    </div>
  );
}

// ── PDF を作る（ライブラリは押したときだけ読みこむ） ──────────────────────────
async function makeInvoicePdf(inv) {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas"), import("jspdf")]);
  const host = document.createElement("div");
  host.style.cssText = "position:absolute;left:-10000px;top:0;width:794px;background:#fff;";
  document.body.appendChild(host);
  const root = createRoot(host);
  try {
    flushSync(() => root.render(<InvoiceSheet inv={inv} paper />));
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    const node = host.firstChild;
    const canvas = await html2canvas(node, { scale: 2.5, backgroundColor: "#ffffff", logging: false });
    const k = canvas.width / 794;            // 1px あたりの画素
    const PAGE_H = 1123, TOP = 40;            // A4 = 794×1123px（96dpi）
    const totalH = node.offsetHeight;
    const top0 = node.getBoundingClientRect().top;
    const cuts = [...node.querySelectorAll("[data-row]")].map(el => el.getBoundingClientRect().bottom - top0);
    const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait", compress: true });
    let start = 0, page = 0;
    while (start < totalH - 2) {
      const offY = page === 0 ? 0 : TOP;
      let end = Math.min(start + PAGE_H - offY, totalH);
      // 行のとちゅうで切らない
      if (end < totalH) { const b = cuts.filter(y => y > start + 80 && y <= end).pop(); if (b) end = b; }
      const sheet = document.createElement("canvas");
      sheet.width = canvas.width; sheet.height = Math.round(PAGE_H * k);
      const ctx = sheet.getContext("2d");
      ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, sheet.width, sheet.height);
      ctx.drawImage(canvas, 0, Math.round(start * k), canvas.width, Math.round((end - start) * k), 0, Math.round(offY * k), canvas.width, Math.round((end - start) * k));
      if (page > 0) pdf.addPage();
      pdf.addImage(sheet.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, 210, 297);
      start = end; page++;
    }
    pdf.setProperties({ title: `請求書 ${inv.no}` });
    return pdf.output("blob");
  } finally {
    root.unmount(); host.remove();
  }
}
const invoiceFileName = (inv) => `請求書_${inv.no}_${safeFileName(inv.client)}.pdf`;
const downloadFile = (file) => {
  const url = URL.createObjectURL(file);
  const a = document.createElement("a"); a.href = url; a.download = file.name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 15000);
};
// スマホ：共有シート（ファイルに保存・LINE・メール）／PC：ダウンロード
const canShareFile = (file) => { try { return !!(navigator.canShare && navigator.canShare({ files:[file] }) && window.matchMedia("(pointer:coarse)").matches); } catch { return false; } };

// ── INVOICE SCREEN ────────────────────────────────────────────────────────────
const blankItem = () => ({ desc:"", qty:1, unit:"式", price:"", tax:10 });
const blankInvForm = () => ({ cpId:null, client:"", honorific:"御中", clientAddr:"", contact:"", issueDate:today(), dueDate:"", subject:"", memo:"" });

function InvoiceScreen({ setScreen, master, sales, setSales, showToast, invoices, setInvoices, invoiceSeq, setInvoiceSeq, addCounterparty, embed, startNew: startNewProp }) {
  const [mode, setMode] = useState(embed ? "list" : startNewProp ? "new" : (invoices.length ? "list" : "new"));
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(blankInvForm);
  const [items, setItems] = useState([blankItem()]);
  const [doneInv, setDoneInv] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [readyFile, setReadyFile] = useState(null);   // 共有の前にもう一度押してもらうとき
  const sf = (k,v) => setForm(f => ({ ...f, [k]: v }));
  const setItem = (i,k,v) => setItems(p => p.map((it,idx) => idx===i ? { ...it, [k]: v } : it));
  const co = master.company;
  const cleanItems = items.filter(it => String(it.desc).trim() || Number(it.price)).map(it => ({ desc:String(it.desc).trim(), qty:Number(it.qty||0), unit:it.unit, price:Number(it.price||0), tax:Number(it.tax) }));
  const calc = calcInvoice(cleanItems);
  const nextNo = nextInvoiceNo(invoices, invoiceSeq, form.issueDate).no;
  const cp = master.counterparties.find(c => c.id === form.cpId);
  const lastInv = [...invoices].reverse().find(v => (form.cpId && v.cpId === form.cpId) || (form.client && v.client === form.client));

  const pickCp = (c) => setForm(f => ({ ...f, cpId:c.id, client:c.name, honorific:c.honorific || "御中", clientAddr:c.addr || "", contact:c.contact || "", dueDate: dueFromTerms(c.terms, f.issueDate) || f.dueDate }));
  const onIssueDate = (v) => setForm(f => ({ ...f, issueDate:v, dueDate: (cp && dueFromTerms(cp.terms, v)) || f.dueDate }));
  const copyLast = () => { if (!lastInv) return; sf("subject", lastInv.subject); setItems(lastInv.items.map(it => ({ ...it }))); showToast(`前回（${lastInv.no}）の件名と明細を入れました`); };
  const issuer = () => ({ name:co.name||"", addr:co.addr||"", tel:co.tel||"", email:co.email||"", regNo: isValidRegNo(co.regNo) ? normRegNo(co.regNo) : "", bank:{ bankName:co.bankName, bankBranch:co.bankBranch, bankType:co.bankType, bankNo:co.bankNo, bankHolder:co.bankHolder } });
  const draft = { no:nextNo, ...form, items:cleanItems, calc, issuer:issuer() };

  const goStep3 = () => { if (!form.client.trim()) { showToast("請求先を入れてください","error"); return; } if (cleanItems.length===0) { showToast("明細を1行以上入れてください","error"); return; } setStep(3); window.scrollTo(0,0); };
  const doIssue = () => {
    const { year, seq, no } = nextInvoiceNo(invoices, invoiceSeq, form.issueDate);
    const saleId = newId(), invId = saleId + 1;
    const rates = calc.rates.map(r => r.rate);
    const inv = { id:invId, no, year, seq, ...form, client:form.client.trim(), items:cleanItems, calc, issuer:issuer(), saleId, createdAt:new Date().toISOString() };
    setSales(p => [...p, { id:saleId, date:form.issueDate, month:monthOfDate(form.issueDate), type:"売掛", client:inv.client, amount:calc.total, tax: rates.length===1 ? rates[0] : 10, memo:`請求書 ${no}${form.subject?` ${form.subject}`:""}`, status:"未入金", invoiceId:invId }]);
    setInvoices(p => [...p, inv]);
    setInvoiceSeq(p => ({ ...p, [year]: seq }));
    setDoneInv(inv); setMode("done");
    showToast(`請求書 ${no} を発行しました`);
  };
  const startNew = () => { setForm(blankInvForm()); setItems([blankItem()]); setStep(1); setMode("new"); };

  const outputPdf = async (inv) => {
    setBusyId(inv.id);
    try {
      const blob = await makeInvoicePdf(inv);
      const file = new File([blob], invoiceFileName(inv), { type:"application/pdf" });
      if (canShareFile(file)) {
        try { await navigator.share({ files:[file], title:file.name }); }
        catch (e) {
          if (e && e.name === "NotAllowedError") setReadyFile(file);   // 時間がかかって押した扱いが切れたとき
          else if (!(e && e.name === "AbortError")) downloadFile(file);
        }
      } else {
        downloadFile(file);
        showToast("PDFを保存しました");
      }
    } catch (e) {
      console.error(e);
      showToast("PDFが作れませんでした。もう一度押してください","error");
    } finally { setBusyId(null); }
  };
  const shareReady = async () => {
    const f = readyFile; setReadyFile(null);
    try { await navigator.share({ files:[f], title:f.name }); } catch (e) { if (!(e && e.name === "AbortError")) downloadFile(f); }
  };
  const statusOf = (inv) => { const sale = sales.find(x => x.id === inv.saleId); return sale ? sale.status : "売上を消しました"; };
  const markPaid = (inv) => { setSales(p => p.map(r => r.id === inv.saleId ? { ...r, status:"入金済" } : r)); showToast("入金済にしました"); };
  const pdfBtn = (inv, big) => (
    <button style={big ? { ...s.btnP, flex:2, fontSize:15, padding:"13px" } : { ...s.btnS, fontSize:13, padding:"8px 14px", whiteSpace:"nowrap" }} disabled={busyId===inv.id} onClick={() => outputPdf(inv)}>
      {busyId===inv.id ? "PDFを作っています…" : "PDFで出す"}
    </button>
  );
  const stepNames = ["入力","確認","完了"];
  const curStep = mode === "done" ? 3 : step === 3 ? 2 : 1;

  return (
    <div className={embed ? "" : "screen-wrap b-screen"}>
      {readyFile && (
        <div style={M.overlay} onClick={() => setReadyFile(null)}>
          <div style={{ ...M.box, maxWidth:380, padding:24, textAlign:"center" }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize:16, fontWeight:700, marginBottom:8 }}>PDFができました</div>
            <div style={{ ...s.hint13, marginBottom:16 }}>下のボタンを押すと「ファイルに保存」「LINE」「メール」などを選べます。</div>
            <button style={{ ...s.btnP, width:"100%", padding:"13px", fontSize:15 }} onClick={shareReady}>送る・保存する</button>
            <button style={{ ...s.btnS, width:"100%", marginTop:10 }} onClick={() => { downloadFile(readyFile); setReadyFile(null); }}>この端末にダウンロード</button>
          </div>
        </div>
      )}
      {!embed && <ScreenHead title={mode === "list" ? "請求書" : step === 3 && mode === "new" ? "請求書プレビュー" : mode === "done" ? "請求書を発行しました" : "請求書の作成"} onBack={() => { if (mode === "new" && step === 3) setStep(1); else if (mode === "list") setScreen("settings"); else setMode("list"); }} />}
      <div style={{ display:"flex", gap:8, flexWrap:"wrap", justifyContent: embed ? "flex-end" : "flex-start", marginBottom:12 }}>
        {!embed && <button style={s.btnS} onClick={() => setScreen("partners")}>取引先</button>}
        {mode !== "list" && <button style={s.btnS} onClick={() => setMode("list")}>発行した請求書</button>}
        {mode === "list" && <button style={s.btnP} onClick={() => embed ? setScreen("invoice-new") : startNew()}>＋ 請求書を作る</button>}
      </div>

      {mode === "list" && (
        <div style={{ maxWidth:760 }}>
          {invoices.length === 0 ? (
            <div style={{ ...s.formCard, textAlign:"center", color:"#888", fontSize:14 }}>まだ請求書はありません。「＋ 新しく作る」から作れます。</div>
          ) : (
            <div style={{ background:"#fff", border:"1px solid #e8ecf3", borderRadius:12, overflow:"hidden" }}>
              {[...invoices].reverse().map(inv => {
                const st = statusOf(inv);
                return (
                  <div key={inv.id} style={{ display:"flex", flexWrap:"wrap", alignItems:"center", gap:"6px 12px", padding:"12px 14px", borderBottom:"1px solid #f2f4f9" }}>
                    <div style={{ flex:"1 1 220px", minWidth:0 }}>
                      <div style={{ fontSize:13, color:"#888" }}>{inv.no}{"　"}{inv.issueDate}</div>
                      <div style={{ fontSize:15, fontWeight:700, color:"#222", wordBreak:"break-all" }}>{inv.client} {inv.honorific}</div>
                      {inv.subject && <div style={{ fontSize:13, color:"#888" }}>{inv.subject}</div>}
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <span style={{ fontSize:16, fontWeight:800, color:"#0F6E56" }}>{fmt(inv.calc.total)}</span>
                      <span style={{ ...s.badge, fontSize:13, ...(st==="入金済"?s.bGreen:st==="未入金"?s.bAmber:s.bRed) }}>{st}</span>
                    </div>
                    <div style={{ display:"flex", gap:6, marginLeft:"auto" }}>
                      {st === "未入金" && <button style={{ ...s.paidBtn, fontSize:13, padding:"8px 10px" }} onClick={() => markPaid(inv)}>入金済にする</button>}
                      {pdfBtn(inv)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div style={{ ...s.hint13, marginTop:10 }}>「PDFで出す」は、発行したときと同じ中身のPDFを何度でも出せます。</div>
        </div>
      )}

      {mode === "done" && doneInv && (
        <div style={{ maxWidth:480, margin:"24px auto", textAlign:"center" }}>
          <div style={{ width:72, height:72, borderRadius:36, background:"#EAF3DE", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px", fontSize:36 }}>✓</div>
          <div style={{ fontSize:20, fontWeight:700, marginBottom:8 }}>請求書を発行しました</div>
          <div style={{ fontSize:14, color:"#666", marginBottom:20, lineHeight:1.8 }}>{doneInv.no}{"　"}{fmt(doneInv.calc.total)}<br/>{doneInv.client} {doneInv.honorific}</div>
          <div style={{ display:"flex", gap:10, marginBottom:16 }}>{pdfBtn(doneInv, true)}</div>
          <div style={{ background:"#f7f9fc", borderRadius:12, padding:"14px 18px", marginBottom:16, textAlign:"left" }}>
            {["売上に「未入金」で入れました","未入金の一覧に出ます","損益計算書に入りました"].map((t,i) => <div key={i} style={{ display:"flex", gap:10, marginBottom:6, fontSize:13, color:"#555" }}><span style={{ color:"#3B6D11", fontWeight:700 }}>✓</span>{t}</div>)}
          </div>
          <div style={{ display:"flex", gap:10 }}>
            <button style={{ ...s.btnS, flex:1 }} onClick={startNew}>続けて作る</button>
            <button style={{ ...s.btnS, flex:1 }} onClick={() => setMode("list")}>一覧を見る</button>
          </div>
        </div>
      )}

      {mode !== "list" && (
          <div className="steps" style={{ maxWidth:640 }}>
            {[1,2,3].map(n => <div key={n} className={`st ${curStep>=n ? "on" : ""}`}><i>{n}</i><span>{stepNames[n-1]}</span>{n<3 && <em />}</div>)}
            {mode === "new" && <span className="no">番号 {nextNo}</span>}
          </div>
      )}
      {mode === "new" && (
        <div style={{ maxWidth:640 }}>

          {step < 3 && (<>
            <div style={s.formCard}>
              <div style={s.formTitle}>だれに<span style={{ fontWeight:400, color:T.sub }}>（取引先）</span></div>
              <div className="inv-grid" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <div style={{ gridColumn:"1 / -1" }}>
                  <FR label="請求先（相手先）">
                    <CpPicker value={form.client} onChange={v => setForm(f => ({ ...f, client:v, cpId: f.cpId && master.counterparties.find(c => c.id===f.cpId)?.name===v ? f.cpId : null }))} onPick={pickCp} counterparties={master.counterparties} addCounterparty={addCounterparty} kind="売り先" />
                  </FR>
                </div>
                <FR label="敬称"><select style={s.inp} value={form.honorific} onChange={e => sf("honorific", e.target.value)}><option>御中</option><option>様</option></select></FR>
                <FR label="ご担当者（なくてもOK）"><input style={s.inp} value={form.contact} onChange={e => sf("contact", e.target.value)} placeholder="山田" /></FR>
                <div style={{ gridColumn:"1 / -1" }}><FR label="相手の住所（なくてもOK）"><input style={s.inp} value={form.clientAddr} onChange={e => sf("clientAddr", e.target.value)} placeholder="東京都…" /></FR></div>
                <FR label="請求日"><input type="date" style={s.inp} value={form.issueDate} onChange={e => onIssueDate(e.target.value)} /></FR>
                <FR label="お支払期限" hint={"相手先の支払条件から自動で入ります。\n直してもかまいません。"}><input type="date" style={s.inp} value={form.dueDate} onChange={e => sf("dueDate", e.target.value)} /></FR>
                <div style={{ gridColumn:"1 / -1" }}><FR label="件名"><input style={s.inp} value={form.subject} onChange={e => sf("subject", e.target.value)} placeholder="Webサイト制作費 11月分" /></FR></div>
              </div>
              {cp && cp.terms && <div style={{ ...s.hint13, marginTop:8 }}>支払条件：{cp.terms}</div>}
              {lastInv && <button style={{ ...s.btnS, width:"100%", marginTop:12, color:"#4A7BA3", borderColor:"#C9DAE8", background:"#E8F0F7", fontWeight:700 }} onClick={copyLast}>↻ 前回と同じ内容を入れる（{lastInv.no}）</button>}
            </div>
          </>)}

          {step < 3 && (<>
            <div style={s.formCard}>
              <div style={s.formTitle}>なにを<span style={{ fontWeight:400, color:T.sub }}>（請求内容・単価は税抜）</span></div>
              {items.map((it,i) => (
                <div key={i} style={{ border:"1px solid #e8ecf3", borderRadius:8, padding:"12px 14px", marginBottom:10, background:"#fafbfd" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                    <span style={{ fontSize:13, fontWeight:600, color:"#888" }}>明細 {i+1}</span>
                    {items.length > 1 && <button style={{ ...s.delBtn, fontSize:13 }} onClick={() => setItems(p => p.filter((_,idx) => idx!==i))}>この行を消す</button>}
                  </div>
                  <div className="item-grid" style={{ display:"grid", gridTemplateColumns:"3fr 1fr 1fr 1.6fr 1.3fr", gap:8 }}>
                    <div className="item-desc"><FR label="品名・内容"><input style={s.inp} value={it.desc} onChange={e => setItem(i,"desc",e.target.value)} placeholder="Webサイト制作" /></FR></div>
                    <FR label="数量"><input type="number" inputMode="decimal" style={s.inp} value={it.qty} onChange={e => setItem(i,"qty",e.target.value)} /></FR>
                    <FR label="単位"><select style={s.inp} value={it.unit} onChange={e => setItem(i,"unit",e.target.value)}>{["式","個","時間","日","月","回","件","kg","本","枚"].map(u => <option key={u}>{u}</option>)}</select></FR>
                    <FR label="単価（税抜）"><input type="number" inputMode="numeric" style={s.inp} value={it.price} onChange={e => setItem(i,"price",e.target.value)} placeholder="0" /></FR>
                    <FR label="税率"><select style={s.inp} value={it.tax} onChange={e => setItem(i,"tax",Number(e.target.value))}><option value={10}>10%</option><option value={8}>8%（軽減）</option><option value={0}>0%</option></select></FR>
                  </div>
                  <div style={{ textAlign:"right", fontSize:13, color:"#888", marginTop:6 }}>金額：{fmt(lineAmount(it))}（税抜）</div>
                </div>
              ))}
              <button style={{ width:"100%", padding:"11px", borderRadius:8, border:"1px dashed #C9DAE8", background:"#E8F0F7", color:"#4A7BA3", fontSize:14, fontWeight:600, cursor:"pointer", marginBottom:16 }} onClick={() => setItems(p => [...p, blankItem()])}>＋ 明細を足す</button>
              <div className="tax-tbl">
                <div className="t-cap">税率別の集計</div>
                <div className="tr th"><span>税率</span><span>小計（税抜）</span><span>消費税</span><span>合計（税込）</span></div>
                {calc.rates.length === 0 && <div className="tr"><span>—</span><span>¥0</span><span>¥0</span><span>¥0</span></div>}
                {calc.rates.map(r => <div key={r.rate} className="tr"><span>{r.rate}%</span><span>{fmt(r.base)}</span><span>{fmt(r.tax)}</span><span>{fmt(r.base + r.tax)}</span></div>)}
                <div className="grand"><span>請求合計</span><b>{fmt(calc.total)}</b></div>
                <div style={{ ...s.hint13, marginTop:6 }}>消費税は税率ごとに合計してから1円未満を切り捨てています。</div>
              </div>
              <div style={{ marginTop:12 }}><FR label="備考"><textarea style={{ ...s.inp, minHeight:60, fontFamily:"inherit" }} value={form.memo} onChange={e => sf("memo", e.target.value)} placeholder="振込手数料はご負担ください" /></FR></div>
            </div>
            <button className="btn-main" onClick={goStep3}>プレビューを確認</button>
          </>)}

          {step === 3 && (<>
            {!draft.issuer.regNo && <div style={{ ...s.alertBox, display:"block", marginTop:0, marginBottom:10, fontSize:13 }}>登録番号（T＋13けた）が未設定なので、番号なしで出します。免税事業者の方はこのままでOKです。<button style={{ ...s.alertDis, fontSize:13, marginLeft:6 }} onClick={() => setScreen("master")}>設定する</button></div>}
            {!bankLine(draft.issuer.bank) && <div style={{ ...s.alertBox, display:"block", marginTop:0, marginBottom:10, fontSize:13 }}>振込先の口座が未設定です。マスター設定で入れると請求書に出ます。</div>}
            <div style={{ border:`1px solid ${T.line}`, borderRadius:8, overflow:"hidden", marginBottom:16, background:"#fff", boxShadow:T.shadow }}><InvoiceSheet inv={draft} /></div>
            <div style={{ display:"flex", gap:10 }}>
              <button style={{ ...s.btnS, minHeight:52 }} onClick={() => setStep(1)}>直す</button>
              <button className="btn-main" style={{ flex:1, marginTop:0 }} onClick={doIssue}>この内容で発行する</button>
            </div>
            <div style={{ ...s.hint13, marginTop:8 }}>発行すると番号が決まり、売上に「未入金」で入ります。続けて「PDFで出す」を押せます。</div>
          </>)}
        </div>
      )}
    </div>
  );
}

const InvoiceNew = (props) => <InvoiceScreen {...props} startNew />;

// ── 相手先 SCREEN ─────────────────────────────────────────────────────────────
function PartnersScreen({ master, setMaster, sales, setSales, expenses, setExpenses, invoices, showToast, setScreen }) {
  const [editing, setEditing] = useState(null);
  const [kindTab, setKindTab] = useState("all");   // null | 相手先オブジェクト（id:null は新規）
  const [q, setQ] = useState("");
  const [err, setErr] = useState({});
  const cps = master.counterparties;
  const usage = (c) => ({
    s: sales.filter(r => r.client === c.name).length,
    e: expenses.filter(r => r.client === c.name).length,
    i: invoices.filter(v => v.cpId === c.id || v.client === c.name).length,
  });
  const list = cps.filter(c => !q.trim() || c.name.toLowerCase().includes(q.trim().toLowerCase())).filter(c => kindTab === "all" || c.kind === "両方" || (kindTab === "sell" ? (c.kind || "売り先") === "売り先" : c.kind === "支払い先"));
  const KIND_JP = { "売り先":"売上先", "支払い先":"支払先", "両方":"売上先・支払先" };
  const ef = (k,v) => setEditing(e => ({ ...e, [k]: v }));
  const openNew = () => { setErr({}); setEditing({ ...CP_BLANK, id:null }); window.scrollTo(0,0); };
  const openEdit = (c) => { setErr({}); setEditing({ ...CP_BLANK, ...c }); window.scrollTo(0,0); };
  const save = () => {
    const name = editing.name.trim();
    const e = {};
    if (!name) e.name = "名前を入れてください";
    else if (cps.some(c => c.name === name && c.id !== editing.id)) e.name = "同じ名前の相手先がもうあります";
    if (editing.regNo && !isValidRegNo(editing.regNo)) e.regNo = "「T」＋数字13けたで入れてください（例：T1234567890123）";
    setErr(e); if (Object.keys(e).length) return;
    const rec = { ...editing, name, regNo: editing.regNo ? normRegNo(editing.regNo) : "" };
    if (rec.id == null) {
      rec.id = newId();
      setMaster(m => ({ ...m, counterparties: [...m.counterparties, rec] }));
      showToast("相手先を足しました");
    } else {
      const old = cps.find(c => c.id === rec.id);
      if (old && old.name !== name) {   // 名前を変えたら、売上・経費の相手先名もそろえる（発行ずみの請求書はそのまま）
        setSales(p => p.map(r => r.client === old.name ? { ...r, client:name } : r));
        setExpenses(p => p.map(r => r.client === old.name ? { ...r, client:name } : r));
      }
      setMaster(m => ({ ...m, counterparties: m.counterparties.map(c => c.id === rec.id ? { ...rec, sample:false } : c) }));
      showToast("相手先を直しました");
    }
    setEditing(null);
  };
  const remove = (c) => {
    const u = usage(c);
    const used = u.s + u.e + u.i > 0;
    const msg = used
      ? `「${c.name}」は使われています（売上${u.s}件・経費${u.e}件・請求書${u.i}件）。\n相手先の一覧から消しても、これまでの記録は残ります。\n消しますか？`
      : `「${c.name}」を消します。よろしいですか？`;
    if (!window.confirm(msg)) return;
    setMaster(m => ({ ...m, counterparties: m.counterparties.filter(x => x.id !== c.id) }));
    showToast("消しました");
  };
  const isPreset = TERMS_PRESETS.includes(editing?.terms);
  return (
    <div className="screen-wrap b-screen">
      <ScreenHead title="取引先" onBack={() => setScreen("settings")} right={<button style={{ ...s.btnP, padding:"8px 14px" }} onClick={openNew}>＋ 足す</button>} />

      {editing && (
        <div style={s.formCard}>
          <div style={s.formTitle}>{editing.id == null ? "相手先を足す" : "相手先を直す"}</div>
          <div className="form-grid" style={s.formGrid}>
            <FR label="名前（会社名・屋号）"><input style={s.inp} value={editing.name} onChange={e => ef("name", e.target.value)} placeholder="株式会社〇〇" />{err.name && <div style={s.errText}>{err.name}</div>}</FR>
            <FR label="敬称"><select style={s.inp} value={editing.honorific} onChange={e => ef("honorific", e.target.value)}><option>御中</option><option>様</option></select></FR>
            <FR label="種類"><select style={s.inp} value={editing.kind} onChange={e => ef("kind", e.target.value)}>{CP_KINDS.map(k => <option key={k}>{k}</option>)}</select></FR>
            <FR label="住所"><input style={s.inp} value={editing.addr} onChange={e => ef("addr", e.target.value)} placeholder="東京都…" /></FR>
            <FR label="ご担当者"><input style={s.inp} value={editing.contact} onChange={e => ef("contact", e.target.value)} placeholder="山田" /></FR>
            <FR label="支払条件" hint={"請求書の支払期限を自動で入れるのに使います"}>
              <select style={s.inp} value={isPreset ? editing.terms : "__other"} onChange={e => ef("terms", e.target.value === "__other" ? "" : e.target.value)}>
                {TERMS_PRESETS.map(t => <option key={t}>{t}</option>)}
                <option value="__other">そのほか（自分で書く）</option>
              </select>
              {!isPreset && <input style={{ ...s.inp, marginTop:6 }} value={editing.terms} onChange={e => ef("terms", e.target.value)} placeholder="例：15日締め当月末払い" />}
            </FR>
            <FR label="登録番号（インボイス）" hint={"相手がインボイス登録をしていれば\nT＋数字13けた。わからなければ空でOK"}><input style={s.inp} value={editing.regNo} onChange={e => ef("regNo", e.target.value)} placeholder="T1234567890123" />{err.regNo && <div style={s.errText}>{err.regNo}</div>}</FR>
          </div>
          <div style={{ ...s.formTitle, fontSize:14, marginTop:16 }}>相手の口座（支払うときに使う）</div>
          <div className="form-grid" style={s.formGrid}>
            <FR label="銀行名"><input style={s.inp} value={editing.bankName} onChange={e => ef("bankName", e.target.value)} placeholder="〇〇銀行" /></FR>
            <FR label="支店名"><input style={s.inp} value={editing.bankBranch} onChange={e => ef("bankBranch", e.target.value)} placeholder="〇〇支店" /></FR>
            <FR label="口座種別"><select style={s.inp} value={editing.bankType} onChange={e => ef("bankType", e.target.value)}><option>普通</option><option>当座</option></select></FR>
            <FR label="口座番号"><input style={s.inp} inputMode="numeric" value={editing.bankNo} onChange={e => ef("bankNo", e.target.value)} placeholder="1234567" /></FR>
            <FR label="口座名義"><input style={s.inp} value={editing.bankHolder} onChange={e => ef("bankHolder", e.target.value)} placeholder="カ)マルマル" /></FR>
          </div>
          <div style={s.formBtns}><button style={s.btnS} onClick={() => setEditing(null)}>やめる</button><button style={s.btnP} onClick={save}>保存する</button></div>
        </div>
      )}

      <div className="search"><Ic n="list" size={18} color={T.faint} /><input aria-label="取引先名で検索" value={q} onChange={e => setQ(e.target.value)} placeholder="取引先名で検索" /></div>
      <Seg items={[["all","すべて"],["sell","売上先"],["pay","支払先"]]} value={kindTab} onChange={setKindTab} />
      <div className="card list">
        {list.length === 0 && <div className="empty">{cps.length ? "見つかりません" : "まだ取引先はありません。「＋ 足す」から入れてください。"}</div>}
        {list.map(c => {
          const u = usage(c);
          const bank = [c.bankName, c.bankBranch, c.bankNo ? `${c.bankType||""} ${c.bankNo}` : ""].filter(Boolean).join("　");
          return (
            <div key={c.id} className="cp-row">
              <button className="cp-main" onClick={() => openEdit(c)}>
                <span className="c">
                  <b>{c.name}<em className="kind">{KIND_JP[c.kind || "売り先"]}</em>{c.sample && <em className="kind sample">見本</em>}</b>
                  <small>{bank || "振込先の口座：未登録"}</small>
                  <small className="faint">売上{u.s}件・経費{u.e}件・請求書{u.i}件{c.regNo ? `・登録番号 ${c.regNo}` : ""}</small>
                </span>
                <span className="hon">{c.honorific}</span>
                <Ic n="chev" size={20} color={T.faint} />
              </button>
              <button className="btn-del sm" aria-label={`${c.name}を消す`} onClick={() => remove(c)}>消す</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── MASTER SCREEN ─────────────────────────────────────────────────────────────
function MasterScreen({ master, setMaster, showToast, setScreen }) {
  const [tab, setTab] = useState("company");
  const [co, setCo] = useState(master.company);
  const [accounts, setAccounts] = useState(master.accounts);
  const [newAccount, setNewAccount] = useState({ label:"", category:"sga", examples:"" });
  const regNoBad = !!co.regNo && !isValidRegNo(co.regNo);

  const saveMaster = () => {
    if (regNoBad) { showToast("登録番号は「T」＋数字13けたで入れてください","error"); return; }
    const company = { ...co, regNo: co.regNo ? normRegNo(co.regNo) : "" };
    setCo(company);
    setMaster(m => ({ ...m, company, accounts }));
    showToast("マスター情報を保存しました");
  };

  return (
    <div className="screen-wrap b-screen">
      <ScreenHead title="会社・口座・科目" onBack={() => setScreen("settings")} right={<button style={{ ...s.btnP, padding:"8px 14px" }} onClick={saveMaster}>保存する</button>} />

      <div style={{ display:"flex", gap:8, marginBottom:16 }}>
        {[["company","会社情報"],["accounts","勘定科目"]].map(([id,label]) => (
          <button key={id} style={{ ...s.taxBtn, ...(tab===id?s.taxActive:{}), border:"1px solid", borderColor:tab===id?"#4A7BA3":"#dce3f0", borderRadius:8, padding:"8px 16px", fontSize:13 }} onClick={() => setTab(id)}>{label}</button>
        ))}
        <button style={{ ...s.taxBtn, border:"1px solid #dce3f0", borderRadius:8, padding:"8px 16px", fontSize:13 }} onClick={() => setScreen("partners")}>相手先 ›</button>
      </div>

      {tab === "company" && (
        <div className="master-grid" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
          <div style={s.formCard}>
            <div style={s.formTitle}>基本情報</div>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              <FR label="会社名・屋号"><input style={s.inp} value={co.name} onChange={e=>setCo({...co,name:e.target.value})} placeholder="株式会社〇〇" /></FR>
              <FR label="法人 / 個人事業主"><select style={s.inp} value={co.type} onChange={e=>setCo({...co,type:e.target.value})}><option>法人</option><option>個人事業主</option></select></FR>
              <FR label="設立年"><input style={s.inp} value={co.established} onChange={e=>setCo({...co,established:e.target.value})} placeholder="2020" /></FR>
              <FR label="資本金"><input style={s.inp} value={co.capital} onChange={e=>setCo({...co,capital:e.target.value})} placeholder="1000000" /></FR>
              <FR label="住所"><input style={s.inp} value={co.addr} onChange={e=>setCo({...co,addr:e.target.value})} placeholder="東京都〇〇区..." /></FR>
              <FR label="電話番号"><input style={s.inp} value={co.tel} onChange={e=>setCo({...co,tel:e.target.value})} placeholder="03-0000-0000" /></FR>
              <FR label="メール"><input style={s.inp} value={co.email} onChange={e=>setCo({...co,email:e.target.value})} placeholder="info@example.com" /></FR>
              <FR label="登録番号（インボイス）" hint={"インボイス登録をしている場合だけ、T＋数字13けたを入れます。\n空なら番号なしの請求書になります（免税事業者の方はそのままでOK）"}>
                <input style={s.inp} value={co.regNo||""} onChange={e=>setCo({...co,regNo:e.target.value})} placeholder="T1234567890123" />
                {regNoBad && <div style={s.errText}>「T」＋数字13けたで入れてください</div>}
              </FR>
            </div>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            <div style={s.formCard}>
              <div style={s.formTitle}>決算の設定</div>
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                <FR label="決算月（開始月）" hint="例）3月決算なら「4月」が期首になります">
                  <select style={s.inp} value={co.fiscalMonth} onChange={e=>setCo({...co,fiscalMonth:Number(e.target.value)})}>
                    {[1,2,3,4,5,6,7,8,9,10,11,12].map(m=><option key={m} value={m}>{m}月始まり（{m===1?12:m-1}月決算）</option>)}
                  </select>
                </FR>
                <FR label="第何期目"><input type="number" style={s.inp} value={co.fiscalNum} onChange={e=>setCo({...co,fiscalNum:Number(e.target.value)})} placeholder="1" min="1" /></FR>
              </div>
            </div>
            <div style={s.formCard}>
              <div style={s.formTitle}>振込先口座（請求書に出ます）</div>
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                <FR label="銀行名"><input style={s.inp} value={co.bankName} onChange={e=>setCo({...co,bankName:e.target.value})} placeholder="〇〇銀行" /></FR>
                <FR label="支店名"><input style={s.inp} value={co.bankBranch} onChange={e=>setCo({...co,bankBranch:e.target.value})} placeholder="〇〇支店" /></FR>
                <FR label="口座種別"><select style={s.inp} value={co.bankType} onChange={e=>setCo({...co,bankType:e.target.value})}><option>普通</option><option>当座</option></select></FR>
                <FR label="口座番号"><input style={s.inp} value={co.bankNo} onChange={e=>setCo({...co,bankNo:e.target.value})} placeholder="1234567" /></FR>
                <FR label="口座名義"><input style={s.inp} value={co.bankHolder} onChange={e=>setCo({...co,bankHolder:e.target.value})} placeholder="カ)マルマル" /></FR>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "accounts" && (
        <div>
          <div className="tbl-wrap" style={s.tblWrap}>
            <table style={s.tbl}>
              <thead><tr>{["科目名","分類","使用例",""].map(h=><th key={h} style={{ ...s.th, textAlign:"left" }}>{h}</th>)}</tr></thead>
              <tbody>
                {accounts.map((a,i) => (
                  <tr key={a.id} style={s.tr}>
                    <td style={{ ...s.td, fontWeight:500 }}>{a.label}</td>
                    <td style={s.td}><span style={{ ...s.badge, ...(a.category==="revenue"?s.bGreen:a.category==="cogs"?s.bAmber:s.bGreen) }}>{a.category==="revenue"?"売上":a.category==="cogs"?"原価":"販管費"}</span></td>
                    <td style={{ ...s.td, color:"#888", fontSize:11 }}>{a.examples}</td>
                    <td style={s.td}><input style={{ ...s.inp, width:200, fontSize:11 }} value={a.examples} onChange={e=>setAccounts(prev=>prev.map((ac,idx)=>idx===i?{...ac,examples:e.target.value}:ac))} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={s.formCard}>
            <div style={s.formTitle}>勘定科目を追加</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 2fr auto", gap:10, alignItems:"end" }}>
              <FR label="科目名"><input style={s.inp} value={newAccount.label} onChange={e=>setNewAccount({...newAccount,label:e.target.value})} placeholder="新しい科目名" /></FR>
              <FR label="分類"><select style={s.inp} value={newAccount.category} onChange={e=>setNewAccount({...newAccount,category:e.target.value})}><option value="revenue">売上</option><option value="cogs">原価</option><option value="sga">販管費</option></select></FR>
              <FR label="使用例"><input style={s.inp} value={newAccount.examples} onChange={e=>setNewAccount({...newAccount,examples:e.target.value})} placeholder="例：〇〇費、△△代など" /></FR>
              <button style={{ ...s.btnP, height:36 }} onClick={() => { if (!newAccount.label) return; setAccounts(prev=>[...prev,{ ...newAccount, id:`custom_${Date.now()}` }]); setNewAccount({ label:"", category:"sga", examples:"" }); }}>追加</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// ── FORM ROW ──────────────────────────────────────────────────────────────────
function FR({ label, hint, children }) {
  const [show, setShow] = useState(false);
  return (
    <div data-label={label} style={{ display:"flex", flexDirection:"column", gap:6 }}>
      <div style={{ fontSize:14, color:T.text, fontWeight:700, display:"flex", alignItems:"center", gap:6 }}>
        {label}
        {hint && <button type="button" aria-label={`${label}の説明`} style={{ width:22,height:22,borderRadius:11,border:"none",background:T.priSoft,color:T.priDark,fontSize:13,fontWeight:700,display:"inline-flex",alignItems:"center",justifyContent:"center",cursor:"pointer",padding:0 }} onClick={()=>setShow(v=>!v)}>?</button>}
      </div>
      {show && hint && <div style={{ fontSize:14,color:T.priDark,background:T.priSoft,borderRadius:8,padding:"8px 12px",lineHeight:1.7,whiteSpace:"pre-line",fontWeight:400 }}>{hint}</div>}
      {children}
    </div>
  );
}

// ── B案デザイン：共通の値・アイコン・部品 ──────────────────────────────────────
const T = { bg:"#F5F8FB", pri:"#5B8FB9", priDark:"#4A7BA3", priSoft:"#E8F0F7", text:"#111827", sub:"#6B7280", faint:"#9CA3AF", line:"#E5EAF0", card:"#FFFFFF", ok:"#10B981", okSoft:"#E7F7F0", warn:"#F59E0B", warnSoft:"#FEF3E2", err:"#EF4444", errSoft:"#FDECEC", shadow:"0 1px 2px rgba(17,24,39,0.04)" };
const ICONS = {
  home:"M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z",
  list:"M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zM8 9h8M8 13h8M8 17h5",
  plus:"M12 5v14M5 12h14",
  chart:"M5 20V12M10 20V7M15 20v-5M20 20V4",
  gear:"M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM19.4 13.5l1.6 1.2-2 3.4-1.9-.7a7.6 7.6 0 0 1-1.7 1l-.3 2h-4l-.3-2a7.6 7.6 0 0 1-1.7-1l-1.9.7-2-3.4 1.6-1.2a7.7 7.7 0 0 1 0-3l-1.6-1.2 2-3.4 1.9.7a7.6 7.6 0 0 1 1.7-1l.3-2h4l.3 2a7.6 7.6 0 0 1 1.7 1l1.9-.7 2 3.4-1.6 1.2a7.7 7.7 0 0 1 0 3z",
  chev:"M9 6l6 6-6 6", back:"M15 6l-6 6 6 6", x:"M6 6l12 12M18 6 6 18", down:"M6 9l6 6 6-6",
  people:"M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20c.6-3.5 3.4-5.5 6.5-5.5s5.9 2 6.5 5.5M16 11a3 3 0 1 0 0-6M17.5 14.6c2.3.5 3.7 2.4 4 5.4",
  doc:"M7 3h7l5 5v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM14 3v5h5M9 13h6M9 17h6",
  yen:"M6 4l6 8 6-8M12 12v8M8 13h8M8 16h8",
};
const Ic = ({ n, size=22, sw=1.8, color="currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={ICONS[n]} /></svg>;
const monthShort = (m) => String(m||"").replace(/^\d{4}年/, "");

// 何月分かを、どの画面でもはっきり出す（押すと月を選べる）
function MonthPill({ selMonth, setSelMonth, fiscalMonths }) {
  const opts = fiscalMonths.includes(selMonth) ? fiscalMonths : [selMonth, ...fiscalMonths];
  return (
    <label className="month-pill">
      <span>{selMonth}分</span>
      <Ic n="down" size={18} />
      <select aria-label="何月分を見るか" value={selMonth} onChange={e => setSelMonth(e.target.value)}>{opts.map(m => <option key={m} value={m}>{m}分</option>)}</select>
    </label>
  );
}
const Seg = ({ items, value, onChange }) => (
  <div className="seg" role="tablist">{items.map(([id, label]) => <button key={id} role="tab" aria-selected={value===id} className={value===id ? "on" : ""} onClick={() => onChange(id)}>{label}</button>)}</div>
);
const ScreenHead = ({ title, onBack, right }) => (
  <div className="scr-head">
    {onBack ? <button className="icon-btn" aria-label="もどる" onClick={onBack}><Ic n="back" /></button> : <span />}
    <h1>{title}</h1>
    {right || <span />}
  </div>
);
const greeting = () => { const h = new Date().getHours(); return h < 11 ? "おはようございます" : h < 18 ? "こんにちは" : "おつかれさまです"; };

// ── 入力：売上（もとは売上入力の画面の中にあった。処理はそのまま） ─────────────
function SaleForm({ setSales, setSelMonth, showToast, curSales, master, fiscalMonths, addCounterparty, onDone }) {
  const [form, setForm] = useState({ date:today(), month:monthOfDate(today()), type:"売掛", client:"", amount:"", tax:10, memo:"", status:"未入金" });
  const [showAlert, setShowAlert] = useState(false);
  const sf = (k,v) => setForm(f=>({...f,[k]:v}));
  // 金額がこの月の平均と大きく違うときは、保存の前に一度だけ確かめる
  const isOutlier = () => {
    if (!form.amount || curSales.length===0) return false;
    const avg = curSales.reduce((s,r)=>s+r.amount,0)/curSales.length;
    return Number(form.amount)>avg*3||Number(form.amount)<avg*0.2;
  };
  const doSave = (force) => {
    if (!form.client||!form.amount) { showToast("相手先と金額は必須です","error"); return; }
    if (force!==true && !showAlert && isOutlier()) { setShowAlert(true); return; }
    setShowAlert(false);
    setSales(p=>[...p,{ ...form,id:Date.now(),amount:Number(form.amount),status: form.type==="現金" ? "入金済" : "未入金" }]); setSelMonth(form.month);
    setForm({ date:today(),month:monthOfDate(today()),type:"売掛",client:"",amount:"",tax:10,memo:"",status:"未入金" });
    showToast(form.type==="現金" ? "売上を保存しました（入金済み）" : "売上を保存しました（未入金）");
    if (onDone) onDone();
  };
  return (
    <div className="bform">
      <AmountField value={form.amount} onChange={v=>sf("amount",v)} />
      <FR label="取引先（だれからの売上か）"><CpPicker value={form.client} onChange={v=>sf("client",v)} counterparties={master.counterparties} addCounterparty={addCounterparty} kind="売り先" /></FR>
      <div className="two">
        <FR label="取引日"><input type="date" style={s.inp} value={form.date} onChange={e=>{ const v=e.target.value; setForm(f=>({ ...f, date:v, month: fiscalMonths.includes(monthOfDate(v)) ? monthOfDate(v) : f.month })); }} /></FR>
        <FR label="何月分の売上か" hint={"この売上は何月の仕事ですか？\n例）3月納品 → 3月　4月に請求しても3月と入力"}>
          <select style={s.inp} value={form.month} onChange={e=>sf("month",e.target.value)}>{fiscalMonths.map(m=><option key={m} value={m}>{m}分</option>)}</select>
        </FR>
      </div>
      <FR label="売上の内容"><input style={s.inp} value={form.memo} onChange={e=>sf("memo",e.target.value)} placeholder="Webサイト制作など" /></FR>
      <div className="two">
        <FR label="入金のしかた" hint={"現金：その場で受け取った → 入金済みで入ります\nあとで入金・カード：まだ受け取っていない → 未入金で入ります"}><select style={s.inp} value={form.type} onChange={e=>sf("type",e.target.value)}>{["現金","売掛","カード"].map(t=><option key={t} value={t}>{typeLabel(t)}</option>)}</select></FR>
        <FR label="消費税"><select style={s.inp} value={form.tax} onChange={e=>sf("tax",Number(e.target.value))}><option value={10}>税率 10%（標準）</option><option value={8}>税率 8%（軽減）</option><option value={0}>0%（非課税）</option></select></FR>
      </div>
      {showAlert && <div style={s.alertBox} role="alert">この月のほかの金額と大きく違います。金額が合っていれば、もう一度「この内容で保存」を押してください。</div>}
      <button className="btn-main" onClick={()=>doSave(showAlert)}>この内容で保存</button>
    </div>
  );
}

// ── 入力：経費（もとは経費入力の画面の中にあった。処理はそのまま） ─────────────
function ExpenseForm({ setExpenses, setSelMonth, showToast, curExp, master, fiscalMonths, addCounterparty, onDone }) {
  const [form, setForm] = useState({ date:today(), month:monthOfDate(today()), type:"現金", client:"", account:"", amount:"", tax:10, memo:"", status:"未払い" });
  const [freeText, setFreeText] = useState("");
  const [suggestion, setSuggestion] = useState(null);
  const [showAlert, setShowAlert] = useState(false);
  const sf = (k,v) => setForm(f=>({...f,[k]:v}));
  const onFree = (v) => { setFreeText(v); const sug=getSuggestion(v); setSuggestion(sug); if(sug) sf("account",sug); };
  const isOutlier = () => {
    if (!form.amount||curExp.length===0) return false;
    const avg = curExp.reduce((s,r)=>s+r.amount,0)/curExp.length;
    return Number(form.amount)>avg*3||Number(form.amount)<avg*0.1;
  };
  const doSave = (force) => {
    if (!form.client||!form.amount||!form.account) { showToast("相手先・科目・金額は必須です","error"); return; }
    if (force!==true && !showAlert && isOutlier()) { setShowAlert(true); return; }
    setShowAlert(false);
    setExpenses(p=>[...p,{ ...form,id:Date.now(),amount:Number(form.amount),status: form.type==="現金" ? "支払済" : "未払い" }]); setSelMonth(form.month);
    setFreeText(""); setSuggestion(null);
    setForm({ date:today(),month:monthOfDate(today()),type:"現金",client:"",account:"",amount:"",tax:10,memo:"",status:"未払い" });
    showToast(form.type==="現金" ? "経費を保存しました（支払済み）" : "経費を保存しました（未払金）");
    if (onDone) onDone();
  };
  const accountOptions = master.accounts.filter(a=>a.category!=="revenue");
  return (
    <div className="bform">
      <AmountField value={form.amount} onChange={v=>sf("amount",v)} />
      <FR label="支払先（だれに払ったか）"><CpPicker value={form.client} onChange={v=>sf("client",v)} counterparties={master.counterparties} addCounterparty={addCounterparty} kind="支払い先" placeholder="〇〇ビルなど（一部でもOK）" /></FR>
      <div className="two">
        <FR label="取引日"><input type="date" style={s.inp} value={form.date} onChange={e=>{ const v=e.target.value; setForm(f=>({ ...f, date:v, month: fiscalMonths.includes(monthOfDate(v)) ? monthOfDate(v) : f.month })); }} /></FR>
        <FR label="何月分の経費か" hint={"この経費は何月分ですか？\n例）4月の家賃を5月に払う場合 → 4月と入力"}>
          <select style={s.inp} value={form.month} onChange={e=>sf("month",e.target.value)}>{fiscalMonths.map(m=><option key={m} value={m}>{m}分</option>)}</select>
        </FR>
      </div>
      <FR label="何に使いましたか" hint="入力すると勘定科目を自動で選びます"><input style={s.inp} value={freeText} onChange={e=>onFree(e.target.value)} placeholder="例：電車代、接待ランチ、Adobe代など" /></FR>
      <FR label="勘定科目">
        <div className="sel-wrap">
          <select style={s.inp} value={form.account} onChange={e=>sf("account",e.target.value)}>
            <option value="">選んでください</option>
            {accountOptions.map(a=><option key={a.id} value={a.label}>{a.label}（例：{a.examples.split("、")[0]}）</option>)}
          </select>
          {suggestion && form.account===suggestion && <span className="auto-tag">自動選択</span>}
        </div>
      </FR>
      <div className="two">
        <FR label="支払いのしかた" hint={"現金：その場で払った → 支払済みで入ります\nあとで払う・カード：まだ払っていない → 未払金で入ります"}><select style={s.inp} value={form.type} onChange={e=>sf("type",e.target.value)}>{["現金","買掛","カード"].map(t=><option key={t} value={t}>{typeLabel(t)}</option>)}</select></FR>
        <FR label="消費税"><select style={s.inp} value={form.tax} onChange={e=>sf("tax",Number(e.target.value))}><option value={10}>税率 10%（標準）</option><option value={8}>税率 8%（軽減）</option><option value={0}>0%（非課税）</option></select></FR>
      </div>
      {showAlert && <div style={s.alertBox} role="alert">この月のほかの金額と大きく違います。金額が合っていれば、もう一度「この内容で保存」を押してください。</div>}
      <button className="btn-main" onClick={()=>doSave(showAlert)}>この内容で保存</button>
    </div>
  );
}
function AmountField({ value, onChange }) {
  return (
    <div className="amt-field">
      <div className="lbl">金額<span>（税込）</span></div>
      <div className="box">
        <span className="yen">¥</span>
        <input aria-label="金額（税込）" inputMode="numeric" value={value ? Number(value).toLocaleString("ja-JP") : ""} onChange={e => onChange(e.target.value.replace(/[^\d]/g, ""))} placeholder="0" />
        {value && <button type="button" className="clr" aria-label="金額を消す" onClick={() => onChange("")}><Ic n="x" size={16} sw={2.4} /></button>}
      </div>
    </div>
  );
}

// ── 記録を追加（下から出る） ───────────────────────────────────────────────────
function EntrySheet({ tab, setTab, onClose, opInvoice, showOPModal, setScreen, ...p }) {
  useEffect(() => { const h = (e) => { if (e.key === "Escape") onClose(); }; window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h); }, [onClose]);
  const pick = (id) => {
    if (id === "invoice") { onClose(); if (opInvoice) setScreen("invoice-new"); else showOPModal(); return; }
    setTab(id);
  };
  return (
    <div className="sheet-dim" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label="記録を追加" onClick={e => e.stopPropagation()}>
        <div className="sheet-head"><span /><h2>記録を追加</h2><button className="icon-btn" aria-label="閉じる" onClick={onClose}><Ic n="x" /></button></div>
        <Seg items={[["sales","売上"],["expenses","経費"],["invoice","請求書"]]} value={tab} onChange={pick} />
        {tab === "sales" ? <SaleForm {...p} onDone={onClose} /> : <ExpenseForm {...p} onDone={onClose} />}
      </div>
    </div>
  );
}

// ── 記録（売上・経費・請求書） ─────────────────────────────────────────────────
function RecordsScreen(p) {
  const { sales, setSales, setExpenses, selMonth, setSelMonth, fiscalMonths, curSales, curExp, val, setModal, showToast, invoices, opInvoice, showOPModal } = p;
  const [tab, setTab] = useState("sales");
  const [openId, setOpenId] = useState(null);
  const rows = (tab === "sales" ? curSales : curExp).slice().sort((a,b) => String(b.date).localeCompare(String(a.date)));
  const total = rows.reduce((s,r) => s + r.amount, 0);
  const dateJp = (d) => { const [, m, dd] = String(d||"").split("-").map(Number); return m ? `${m}月${dd}日` : ""; };
  const del = (r) => { if (window.confirm(`${r.client} ${fmt(r.amount)} を消します。よろしいですか？`)) { (tab==="sales" ? setSales : setExpenses)(q => q.filter(x => x.id !== r.id)); setOpenId(null); showToast("消しました"); } };
  const paid = (r) => { if (tab === "sales") { setSales(q=>q.map(x=>x.id===r.id?{...x,status:"入金済"}:x)); showToast("入金済みにしました"); } else { setExpenses(q=>q.map(x=>x.id===r.id?{...x,status:"支払済"}:x)); showToast("支払済みにしました"); } };
  const invSt = (inv) => { const sale = sales.find(x => x.id === inv.saleId); return sale ? sale.status : null; };
  const invU = invoices.filter(v => invSt(v) === "未入金"), invP = invoices.filter(v => invSt(v) === "入金済");
  return (
    <div className="screen-wrap b-screen">
      <ScreenHead title="記録" />
      <Seg items={[["sales","売上"],["expenses","経費"],["invoice","請求書"]]} value={tab} onChange={(t) => { setTab(t); setOpenId(null); }} />
      {tab === "invoice" ? (
        opInvoice ? <InvoiceScreen {...p} embed="list" /> : (
          <div className="card pad center"><p className="muted">請求書はオプションです。</p><button className="btn-main" onClick={showOPModal}>くわしく見る</button></div>
        )
      ) : (<>
        <div className="month-row">
          <MonthPill selMonth={selMonth} setSelMonth={setSelMonth} fiscalMonths={fiscalMonths} />
          <div className="month-total">月計：<N v={val(total)} setModal={setModal} modal={{ title:`${selMonth}分　${tab==="sales"?"売上":"経費"}の合計`, amount:val(total), rows:rows.map(r=>({ "日付":r.date,"相手先":r.client,"金額":val(r.amount),"状態":r.status })) }} style={{ fontWeight:700 }} /></div>
        </div>
        <div className="card list">
          {rows.length === 0 && <div className="empty">{selMonth}分の{tab==="sales"?"売上":"経費"}はまだありません。下の＋から入れられます。</div>}
          {rows.map(r => {
            const open = openId === r.id; const unpaid = tab==="sales" ? r.status==="未入金" : r.status==="未払い";
            return (
              <div key={r.id} className={`rec ${open ? "open" : ""}`}>
                <button className="rec-main" aria-expanded={open} onClick={() => setOpenId(open ? null : r.id)}>
                  <span className="d">{dateJp(r.date)}</span>
                  <span className="c"><b>{r.client}</b><small>{tab==="sales" ? (r.memo || "—") : `${r.account}${r.memo ? `・${r.memo}` : ""}`}</small></span>
                  <span className="a">{val(r.amount)}<em className={unpaid ? "st warn" : "st ok"}>{tab==="sales" ? (unpaid ? "未入金" : "入金済") : (unpaid ? "未払金" : "支払済")}</em></span>
                </button>
                {open && (
                  <div className="rec-act">
                    <span className="muted">{typeLabel(r.type)}・税率{r.tax}%・{r.month}分</span>
                    <div>
                      {unpaid && <button className="btn-sub" onClick={() => paid(r)}>{tab==="sales" ? "入金された" : "払った"}</button>}
                      <button className="btn-del" onClick={() => del(r)}>消す</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {tab === "sales" && opInvoice && invoices.length > 0 && (<>
          <h2 className="sec-h">請求書の状況</h2>
          <div className="two">
            <button className="card stat" onClick={() => setTab("invoice")}><span>未入金</span><b>{invU.length}<small>件</small> {fmt(invU.reduce((s,v)=>s+v.calc.total,0))}</b></button>
            <button className="card stat" onClick={() => setTab("invoice")}><span>入金済</span><b>{invP.length}<small>件</small> {fmt(invP.reduce((s,v)=>s+v.calc.total,0))}</b></button>
          </div>
        </>)}
      </>)}
    </div>
  );
}

// ── 設定（B案の7画面に入らない機能をここにまとめる） ─────────────────────────
function SettingsScreen({ setScreen, taxMode, setTaxMode, opInvoice, showOPModal, master }) {
  const items = [
    ["partners","people","取引先","名前・敬称・振込先口座"],
    ["invoice","doc","請求書", opInvoice ? "発行した請求書・新しく作る" : "オプション（未契約）"],
    ["pl","list","損益計算書","月ごと・1年の利益"],
    ["ar","yen","未入金・未払金","まとめて確認する"],
    ["master","gear","会社・口座・勘定科目","請求書に出る情報など"],
  ];
  return (
    <div className="screen-wrap b-screen">
      <ScreenHead title="設定" />
      <div className="card list">
        {items.map(([id, ic, t, sub]) => (
          <button key={id} className="menu-row" onClick={() => (id==="invoice" && !opInvoice) ? showOPModal() : setScreen(id)}>
            <span className="ic"><Ic n={ic} /></span><span className="c"><b>{t}</b><small>{sub}</small></span><Ic n="chev" size={20} color={T.faint} />
          </button>
        ))}
      </div>
      <h2 className="sec-h">金額の見せ方</h2>
      <div className="card pad">
        <Seg items={[["inc","税込で見る"],["exc","税抜で見る"]]} value={taxMode} onChange={setTaxMode} />
        <p className="muted" style={{ marginTop:8 }}>数字を押すと、計算の根拠が出ます。</p>
      </div>
      <p className="muted" style={{ textAlign:"center", marginTop:24 }}>{master.company.name || "会社名は未設定です"}</p>
    </div>
  );
}

// ── STYLES ────────────────────────────────────────────────────────────────────
const s = {
  screenWrap:   { padding:"24px 24px 48px" },
  pageHeader:   { display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16, gap:8, flexWrap:"wrap" },
  pageTitle:    { fontSize:22, fontWeight:700, color:T.text },
  statCard:     { background:T.card, border:`1px solid ${T.line}`, borderRadius:8, padding:"16px", boxShadow:T.shadow },
  statLabel:    { fontSize:14, color:T.sub, marginBottom:6, fontWeight:500 },
  taxSwitch:    { display:"flex", background:"#EDF1F5", borderRadius:8, padding:3, gap:2 },
  taxBtn:       { padding:"8px 14px", borderRadius:6, fontSize:14, border:"none", background:"transparent", color:T.sub, cursor:"pointer" },
  taxActive:    { background:"#fff", color:T.priDark, fontWeight:700 },
  formCard:     { background:T.card, border:`1px solid ${T.line}`, borderRadius:8, padding:16, marginBottom:16, boxShadow:T.shadow },
  formTitle:    { fontSize:16, fontWeight:700, color:T.text, marginBottom:16 },
  formGrid:     { display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16 },
  inp:          { width:"100%", border:`1px solid ${T.line}`, borderRadius:8, padding:"12px", fontSize:16, background:"#fff", color:T.text, outline:"none", boxSizing:"border-box", minHeight:48 },
  aiSug:        { marginTop:6, fontSize:14, color:"#05603A", background:T.okSoft, borderRadius:8, padding:"6px 10px" },
  alertBox:     { marginTop:12, background:T.warnSoft, border:`1px solid ${T.warn}`, borderRadius:8, padding:"12px 14px", fontSize:14, color:"#7A4A00", display:"flex", alignItems:"center", justifyContent:"space-between", gap:8, lineHeight:1.6 },
  alertDis:     { fontSize:14, color:"#7A4A00", background:"#fff", border:`1px solid ${T.warn}`, borderRadius:8, padding:"4px 10px", cursor:"pointer" },
  formBtns:     { display:"flex", gap:8, marginTop:16, justifyContent:"flex-end" },
  btnP:         { padding:"12px 20px", borderRadius:8, border:"none", background:T.pri, color:"#fff", fontSize:15, fontWeight:700, cursor:"pointer", minHeight:44 },
  btnS:         { padding:"12px 16px", borderRadius:8, border:`1px solid ${T.line}`, background:"#fff", color:T.text, fontSize:15, cursor:"pointer", minHeight:44 },
  delBtn:       { border:`1px solid #F5C2C2`, background:"#fff", color:"#B42318", borderRadius:8, padding:"6px 12px", fontSize:14, cursor:"pointer" },
  tblWrap:      { background:T.card, border:`1px solid ${T.line}`, borderRadius:8, overflow:"hidden", marginBottom:16, boxShadow:T.shadow },
  tbl:          { width:"100%", borderCollapse:"collapse" },
  th:           { background:"#F8FAFC", fontSize:13, fontWeight:600, color:T.sub, padding:"10px 12px", borderBottom:`1px solid ${T.line}`, textAlign:"right", whiteSpace:"nowrap" },
  td:           { fontSize:15, color:T.text, padding:"12px", borderBottom:`1px solid #EEF2F6`, whiteSpace:"nowrap", fontVariantNumeric:"tabular-nums" },
  tr:           { transition:"background 0.1s" },
  badge:        { display:"inline-block", fontSize:12, padding:"2px 8px", borderRadius:6, fontWeight:700 },
  bGreen:       { background:T.okSoft, color:"#05603A" },
  bAmber:       { background:T.warnSoft, color:"#8A5300" },
  bRed:         { background:T.errSoft, color:"#B42318" },
  paidBtn:      { fontSize:14, padding:"6px 12px", borderRadius:8, border:`1px solid ${T.pri}`, background:"#fff", color:T.priDark, cursor:"pointer", fontWeight:700, whiteSpace:"nowrap" },
  plWrap:       { background:T.card, border:`1px solid ${T.line}`, borderRadius:8, overflow:"hidden", marginBottom:16, boxShadow:T.shadow },
  plHdr:        { background:"#F8FAFC", padding:"12px 16px", borderBottom:`1px solid ${T.line}`, display:"flex", justifyContent:"space-between", alignItems:"center", fontSize:15, fontWeight:700, color:T.text },
  plRow:        { display:"flex", justifyContent:"space-between", alignItems:"center", padding:"12px 16px", borderBottom:`1px solid #EEF2F6` },
  secTitle:     { fontSize:16, fontWeight:700, color:T.text, marginBottom:8 },
  secTitleSub:  { fontSize:14, fontWeight:700, color:T.sub, marginBottom:8, marginTop:16 },
  pickList:     { position:"absolute", top:"100%", left:0, right:0, zIndex:50, marginTop:4, background:"#fff", border:`1px solid ${T.line}`, borderRadius:8, boxShadow:"0 8px 24px rgba(17,24,39,0.10)", maxHeight:280, overflowY:"auto" },
  pickItem:     { display:"flex", alignItems:"center", flexWrap:"wrap", width:"100%", textAlign:"left", padding:"12px", border:"none", borderBottom:`1px solid #EEF2F6`, background:"#fff", fontSize:16, color:T.text, cursor:"pointer", minHeight:48 },
  hint13:       { fontSize:14, color:T.sub, lineHeight:1.7 },
  errText:      { fontSize:14, color:"#B42318", marginTop:4 },
};

const css = `
  *{box-sizing:border-box;}
  body{margin:0;background:#F5F8FB;color:#111827;font-family:'Noto Sans JP','Hiragino Sans',sans-serif;-webkit-font-smoothing:antialiased;}
  button{font-family:inherit;}
  button:hover{opacity:0.9;}
  button:focus-visible,select:focus-visible,input:focus-visible{outline:2px solid #5B8FB9;outline-offset:2px;}
  tr:hover td{background:#F8FAFC!important;}
  input:focus,select:focus{border-color:#5B8FB9!important;outline:none;}
  ::-webkit-scrollbar{width:5px;height:5px;}
  ::-webkit-scrollbar-thumb{background:#DCE3EA;border-radius:3px;}
  .sidebar{flex-shrink:0;}
  .num,.v,.amt,.a,.bv,.cnt,.month-total,.grand b{font-variant-numeric:tabular-nums;}

  .demo-bar{ display:flex; flex-wrap:wrap; align-items:center; gap:8px 16px; padding:12px 24px; background:#FEF3E2; border-bottom:1px solid #F7D9A6; color:#7A4A00; font-size:14px; line-height:1.6; }
  .demo-bar button{ border:1px solid #F59E0B; background:#fff; color:#7A4A00; border-radius:8px; padding:8px 14px; font-size:14px; font-weight:700; cursor:pointer; }
  .toast{ position:fixed; top:16px; left:50%; transform:translateX(-50%); z-index:400; padding:12px 18px; border-radius:8px; border:1px solid; font-size:15px; font-weight:700; box-shadow:0 6px 20px rgba(17,24,39,0.10); max-width:calc(100vw - 32px); }

  /* B案 共通 */
  .screen-wrap{ padding:24px 32px 48px; }
  .b-screen{ max-width:960px; }
  .card{ background:#fff; border:1px solid #E5EAF0; border-radius:8px; box-shadow:0 1px 2px rgba(17,24,39,0.04); }
  .card.pad{ padding:16px; margin-bottom:16px; }
  .card.center{ text-align:center; }
  button.card{ font:inherit; color:inherit; text-align:left; cursor:pointer; width:100%; }
  .muted{ color:#6B7280; font-size:14px; line-height:1.6; }
  .faint{ color:#9CA3AF; }
  .two{ display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:16px; }
  .sec-h{ font-size:17px; font-weight:700; margin:24px 0 8px; display:flex; align-items:center; gap:8px; }
  .sec-h .muted{ font-weight:400; }
  .badge-n{ font-size:13px; font-weight:700; color:#4A7BA3; background:#E8F0F7; border-radius:999px; padding:2px 10px; }
  .icon-btn{ width:44px; height:44px; border:none; background:transparent; color:#111827; border-radius:8px; display:inline-flex; align-items:center; justify-content:center; cursor:pointer; }
  .scr-head{ display:grid; grid-template-columns:48px 1fr auto; align-items:center; min-height:48px; margin:-8px 0 16px; }
  .scr-head h1{ font-size:18px; font-weight:700; text-align:center; margin:0; }
  .scr-head > span:last-child{ width:48px; }
  .month-pill{ position:relative; display:inline-flex; align-items:center; gap:4px; background:#fff; border:1px solid #E5EAF0; border-radius:8px; padding:8px 10px 8px 14px; font-size:15px; font-weight:700; color:#111827; min-height:44px; cursor:pointer; white-space:nowrap; }
  .month-pill select{ position:absolute; inset:0; opacity:0; cursor:pointer; width:100%; font-size:16px; }
  .seg{ display:flex; background:#EDF1F5; border-radius:8px; padding:3px; gap:2px; margin-bottom:16px; }
  .seg button{ flex:1; border:none; background:transparent; border-radius:6px; padding:10px 8px; font-size:15px; color:#6B7280; cursor:pointer; min-height:40px; }
  .seg button.on{ background:#fff; color:#111827; font-weight:700; box-shadow:0 1px 2px rgba(17,24,39,0.08); }
  .btn-main{ display:block; width:100%; margin-top:16px; border:none; background:#5B8FB9; color:#fff; border-radius:8px; min-height:52px; font-size:17px; font-weight:700; cursor:pointer; }
  .btn-pri,.btn-sub,.btn-del{ border-radius:8px; font-size:15px; font-weight:700; cursor:pointer; padding:10px 16px; min-height:44px; white-space:nowrap; }
  .btn-pri{ border:none; background:#5B8FB9; color:#fff; }
  .btn-sub{ border:1px solid #5B8FB9; background:#fff; color:#4A7BA3; }
  .btn-del{ border:1px solid #F5C2C2; background:#fff; color:#B42318; }
  .inv-grid,.item-grid,.two{ grid-template-columns:repeat(2,minmax(0,1fr)); }
  .inv-grid > *, .item-grid > *, .two > *, .form-grid > *{ min-width:0; }
  input[type=date]{ min-width:0; max-width:100%; }
  .sm{ padding:8px 12px; min-height:40px; font-size:14px; }
  .empty{ padding:24px 16px; color:#6B7280; font-size:15px; text-align:center; line-height:1.7; }

  /* ホーム */
  .hello{ display:flex; justify-content:space-between; align-items:center; gap:8px; margin-bottom:4px; }
  .hello small{ display:block; font-size:14px; color:#6B7280; }
  .hello b{ font-size:20px; font-weight:700; }
  .fiscal{ margin-bottom:16px; font-size:13px; }
  .hero{ position:relative; display:flex; flex-direction:column; gap:6px; padding:20px 48px 20px 20px; margin-bottom:8px; background:#fff; }
  .hero .l{ font-size:15px; color:#374151; font-weight:500; }
  .hero .l small{ color:#6B7280; font-size:13px; }
  .hero .v{ font-size:32px; font-weight:700; letter-spacing:-0.5px; color:#111827; line-height:1.2; }
  .hero .go{ position:absolute; right:14px; top:50%; transform:translateY(-50%); color:#9CA3AF; }
  .kpi{ padding:14px; display:flex; flex-direction:column; gap:4px; min-width:0; }
  .kpi > span:first-child{ font-size:14px; color:#6B7280; }
  .kpi > span:first-child small{ font-size:12px; }
  .kpi .num{ font-size:20px; font-weight:700; color:#111827; }
  .kpi .cnt{ font-size:14px; font-weight:700; color:#4A7BA3; }
  .kpi .cnt small{ font-size:12px; margin-left:1px; }
  .group{ margin-bottom:8px; overflow:hidden; }
  .g-h{ padding:12px 16px; font-size:15px; font-weight:700; border-bottom:1px solid #EEF2F6; }
  .late{ color:#B42318; font-weight:700; }
  .todo{ display:grid; grid-template-columns:1fr auto auto; align-items:center; gap:8px; padding:12px 16px; border-bottom:1px solid #EEF2F6; }
  .todo:last-child{ border-bottom:none; }
  .todo .c{ display:flex; flex-wrap:wrap; align-items:baseline; gap:2px 8px; min-width:0; }
  .todo .c b{ font-size:15px; }
  .todo .c .amt{ font-size:15px; font-weight:700; }
  .todo .c small{ width:100%; color:#6B7280; font-size:13px; }
  .todo .m{ display:flex; flex-direction:column; align-items:flex-end; gap:2px; font-size:12px; color:#6B7280; }
  .tag{ font-size:12px; font-weight:700; border-radius:6px; padding:2px 8px; }
  .tag.err{ background:#FDECEC; color:#B42318; }
  .more{ display:block; width:100%; border:none; background:#fff; color:#4A7BA3; font-size:14px; font-weight:700; padding:12px; cursor:pointer; border-top:1px solid #EEF2F6; }
  .legend{ display:flex; gap:12px; font-size:13px; color:#6B7280; margin-bottom:8px; }
  .legend i{ display:inline-block; width:10px; height:10px; border-radius:2px; margin-right:4px; vertical-align:-1px; }
  .quick-grid{ display:grid; grid-template-columns:repeat(4,1fr); gap:8px; margin-top:16px; }
  .qb{ display:flex; align-items:center; gap:8px; padding:14px; font-size:15px; font-weight:700; color:#4A7BA3; }

  /* 記録・リスト */
  .month-row{ display:flex; justify-content:space-between; align-items:center; gap:8px; margin-bottom:8px; flex-wrap:wrap; }
  .month-total{ font-size:15px; color:#374151; }
  .list{ overflow:hidden; margin-bottom:16px; }
  .rec{ border-bottom:1px solid #EEF2F6; }
  .rec:last-child{ border-bottom:none; }
  .rec-main{ display:grid; grid-template-columns:64px 1fr auto; gap:8px; align-items:center; width:100%; border:none; background:#fff; text-align:left; padding:14px 16px; cursor:pointer; font:inherit; color:inherit; min-height:60px; }
  .rec.open .rec-main{ background:#F8FAFC; }
  .rec-main .d{ font-size:13px; color:#6B7280; }
  .rec-main .c, .menu-row .c, .cp-main .c{ display:flex; flex-direction:column; gap:2px; min-width:0; }
  .rec-main .c b, .menu-row .c b, .cp-main .c b{ font-size:15px; font-weight:700; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .rec-main .c small, .menu-row .c small, .cp-main .c small{ font-size:13px; color:#6B7280; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .rec-main .a{ display:flex; flex-direction:column; align-items:flex-end; gap:4px; font-size:16px; font-weight:700; }
  .st{ font-style:normal; font-size:12px; font-weight:700; border-radius:6px; padding:1px 8px; }
  .st.warn{ background:#FEF3E2; color:#8A5300; }
  .st.ok{ background:#E7F7F0; color:#05603A; }
  .rec-act{ display:flex; justify-content:space-between; align-items:center; gap:8px; flex-wrap:wrap; padding:8px 16px 14px; background:#F8FAFC; }
  .rec-act > div{ display:flex; gap:8px; }
  .stat{ padding:14px; display:flex; flex-direction:column; gap:4px; }
  .stat span{ font-size:14px; color:#6B7280; }
  .stat b{ font-size:17px; }
  .stat b small{ font-size:12px; margin-right:6px; }
  .menu-row{ display:flex; align-items:center; gap:12px; width:100%; border:none; border-bottom:1px solid #EEF2F6; background:#fff; padding:14px 16px; text-align:left; cursor:pointer; font:inherit; color:inherit; min-height:60px; }
  .menu-row:last-child{ border-bottom:none; }
  .menu-row .ic{ width:36px; height:36px; border-radius:8px; background:#E8F0F7; color:#4A7BA3; display:inline-flex; align-items:center; justify-content:center; flex-shrink:0; }
  .menu-row .c{ flex:1; }
  .menu-row .n{ font-size:14px; color:#6B7280; }
  .menu-row .a{ font-size:16px; font-weight:700; }
  .inl{ font-weight:400; font-size:13px; color:#6B7280; }

  /* 入力フォーム・下から出る窓 */
  .bform{ display:flex; flex-direction:column; gap:16px; }
  .bform .two{ margin-bottom:0; gap:12px; }
  .amt-field .lbl{ font-size:14px; font-weight:700; margin-bottom:6px; }
  .amt-field .lbl span{ font-weight:400; color:#6B7280; }
  .amt-field .box{ display:flex; align-items:center; gap:6px; border:1px solid #E5EAF0; border-radius:8px; padding:6px 10px 6px 14px; background:#fff; }
  .amt-field .box:focus-within{ border-color:#5B8FB9; }
  .amt-field .yen{ font-size:24px; font-weight:700; color:#6B7280; }
  .amt-field input{ flex:1; min-width:0; border:none; outline:none; font-size:32px !important; font-weight:700; color:#111827; font-variant-numeric:tabular-nums; background:transparent; padding:4px 0; }
  .amt-field .clr{ width:32px; height:32px; border:none; border-radius:16px; background:#EDF1F5; color:#6B7280; display:inline-flex; align-items:center; justify-content:center; cursor:pointer; }
  .sel-wrap{ position:relative; }
  .auto-tag{ position:absolute; right:36px; top:50%; transform:translateY(-50%); font-size:12px; font-weight:700; color:#05603A; background:#E7F7F0; border-radius:6px; padding:2px 8px; pointer-events:none; }
  .sheet-dim{ position:fixed; inset:0; z-index:250; background:rgba(17,24,39,0.35); display:flex; align-items:flex-end; justify-content:center; }
  .sheet{ width:100%; max-width:560px; max-height:92vh; overflow-y:auto; background:#F5F8FB; border-radius:16px 16px 0 0; padding:8px 16px calc(24px + env(safe-area-inset-bottom,0px)); }
  .sheet-head{ display:grid; grid-template-columns:44px 1fr 44px; align-items:center; margin-bottom:8px; }
  .sheet-head h2{ margin:0; text-align:center; font-size:17px; font-weight:700; }
  @media(min-width:769px){ .sheet-dim{ align-items:center; } .sheet{ border-radius:12px; } }

  /* お金の流れ */
  .chart-t{ font-size:15px; font-weight:700; margin-bottom:12px; }
  .chart-t small{ font-weight:400; color:#6B7280; font-size:13px; margin-left:4px; }
  .bars{ display:flex; align-items:flex-end; gap:6px; }
  .bar{ flex:1; display:flex; flex-direction:column; align-items:center; justify-content:flex-end; gap:4px; height:100%; border:none; background:transparent; cursor:pointer; padding:0; min-width:0; font:inherit; }
  .bar i{ display:block; width:70%; max-width:36px; background:#C9DAE8; border-radius:4px 4px 0 0; }
  .bar.on i{ background:#5B8FB9; }
  .bar.neg i{ background:#F5B5B5; }
  .bar.neg.on i{ background:#EF4444; }
  .bar .bv{ font-size:10px; color:#6B7280; white-space:nowrap; }
  .bar.on .bv{ color:#111827; font-weight:700; }
  .bar .bm{ font-size:12px; color:#6B7280; }
  .bar.on .bm{ color:#111827; font-weight:700; }
  .note-warn{ margin:12px 0 0; font-size:13px; line-height:1.6; color:#7A4A00; background:#FEF3E2; border-radius:8px; padding:8px 12px; }
  .tbl-b{ margin-bottom:16px; overflow:hidden; }
  .t-h{ padding:12px 16px; font-size:15px; font-weight:700; border-bottom:1px solid #EEF2F6; background:#F8FAFC; }
  .t-r{ display:flex; justify-content:space-between; align-items:center; padding:14px 16px; border-bottom:1px solid #EEF2F6; font-size:15px; }
  .t-r:last-child{ border-bottom:none; }
  .t-r .num{ font-weight:700; font-size:16px; }
  .t-r.total{ background:#E8F0F7; }
  .t-r.total .num{ font-size:20px; color:#111827; }

  /* 請求書 */
  .steps{ display:flex; align-items:center; gap:4px; margin-bottom:16px; flex-wrap:wrap; }
  .st-wrap{}
  .steps .st{ display:flex; align-items:center; gap:6px; font-size:14px; color:#9CA3AF; background:none; padding:0; }
  .steps .st i{ font-style:normal; width:26px; height:26px; border-radius:13px; background:#EDF1F5; color:#9CA3AF; display:inline-flex; align-items:center; justify-content:center; font-size:13px; font-weight:700; }
  .steps .st.on{ color:#111827; font-weight:700; }
  .steps .st.on i{ background:#5B8FB9; color:#fff; }
  .steps .st em{ display:inline-block; width:24px; height:2px; background:#E5EAF0; margin:0 4px; }
  .steps .no{ margin-left:auto; font-size:13px; color:#6B7280; }
  .tax-tbl{ background:#F8FAFC; border:1px solid #E5EAF0; border-radius:8px; padding:12px; }
  .tax-tbl .t-cap{ font-size:14px; font-weight:700; margin-bottom:8px; }
  .tax-tbl .tr{ display:grid; grid-template-columns:0.6fr 1fr 1fr 1fr; gap:4px; font-size:14px; padding:6px 0; border-bottom:1px solid #EEF2F6; font-variant-numeric:tabular-nums; }
  .tax-tbl .tr span:not(:first-child){ text-align:right; }
  .tax-tbl .tr.th{ font-size:12px; color:#6B7280; }
  .tax-tbl .grand{ display:flex; justify-content:space-between; align-items:center; margin-top:12px; background:#5B8FB9; color:#fff; border-radius:8px; padding:12px 14px; font-size:15px; font-weight:700; }
  .tax-tbl .grand b{ font-size:22px; }

  /* 取引先 */
  .search{ display:flex; align-items:center; gap:8px; background:#fff; border:1px solid #E5EAF0; border-radius:8px; padding:0 12px; margin-bottom:12px; }
  .search input{ flex:1; border:none; outline:none; font-size:16px; min-height:48px; background:transparent; }
  .cp-row{ display:flex; align-items:center; border-bottom:1px solid #EEF2F6; padding-right:12px; }
  .cp-row:last-child{ border-bottom:none; }
  .cp-main{ flex:1; min-width:0; display:flex; align-items:center; gap:8px; border:none; background:#fff; text-align:left; padding:14px 8px 14px 16px; cursor:pointer; font:inherit; color:inherit; }
  .cp-main .c{ flex:1; }
  .cp-main .c b{ display:flex; align-items:center; gap:6px; }
  .kind{ font-style:normal; font-size:11px; font-weight:700; color:#4A7BA3; background:#E8F0F7; border-radius:6px; padding:1px 6px; flex-shrink:0; }
  .kind.sample{ color:#8A5300; background:#FEF3E2; }
  .hon{ font-size:14px; color:#6B7280; }

  .bottom-nav{ display:none; position:fixed; left:0; right:0; bottom:0; z-index:200; background:#fff; border-top:1px solid #E5EAF0; padding:6px 4px calc(6px + env(safe-area-inset-bottom,0px)); justify-content:space-around; align-items:center; }
  .bottom-nav button{ flex:1; display:flex; flex-direction:column; align-items:center; gap:2px; border:none; background:transparent; color:#9CA3AF; font-size:11px; padding:4px 0; cursor:pointer; min-height:48px; justify-content:center; }
  .bottom-nav button.on{ color:#4A7BA3; font-weight:700; }
  .bottom-nav button.plus{ flex:0 0 auto; width:56px; height:56px; border-radius:28px; background:#5B8FB9; color:#fff; margin-top:-22px; box-shadow:0 4px 12px rgba(91,143,185,0.35); }

  @media(max-width:768px){
    .sidebar{ display:none !important; }
    .bottom-nav{ display:flex !important; }
    .pc-only{ display:none !important; }
    .main-area{ margin-left:0 !important; padding-bottom:calc(76px + env(safe-area-inset-bottom,0px)); }
    .screen-wrap{ padding:16px 16px 32px !important; }
    .demo-bar{ padding:12px 16px; }
    .kpi-row{ flex-direction:column; }
    .charts-row{ grid-template-columns:1fr !important; }
    .form-grid{ grid-template-columns:1fr !important; }
    .inv-grid{ grid-template-columns:repeat(2,minmax(0,1fr)) !important; }
    .item-grid{ grid-template-columns:repeat(2,minmax(0,1fr)) !important; }
    .item-desc{ grid-column:1 / -1; }
    .master-grid{ grid-template-columns:minmax(0,1fr) !important; }
    .master-grid > *{ min-width:0; }
    /* 入力欄が16px未満だと、iPhoneでは触るたびに画面が勝手に拡大する */
    input, select, textarea{ font-size:16px !important; min-height:44px; }
    .tbl-wrap{ overflow-x:auto !important; -webkit-overflow-scrolling:touch; }
    .t-sales th:nth-child(2), .t-sales td:nth-child(2), .t-sales th:nth-child(4), .t-sales td:nth-child(4), .t-sales th:nth-child(6), .t-sales td:nth-child(6), .t-sales th:nth-child(7), .t-sales td:nth-child(7),
    .t-exp th:nth-child(2), .t-exp td:nth-child(2), .t-exp th:nth-child(5), .t-exp td:nth-child(5), .t-exp th:nth-child(7), .t-exp td:nth-child(7){ display:none; }
    .t-sales th, .t-sales td, .t-exp th, .t-exp td{ padding-left:8px !important; padding-right:8px !important; }
    .tax-tbl .tr{ font-size:13px; }
  }
`;
