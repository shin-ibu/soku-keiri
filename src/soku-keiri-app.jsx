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
  xbtn:       { background:"#f4f6fb", border:"none", borderRadius:8, width:34, height:34, fontSize:16, cursor:"pointer", color:"#666", flexShrink:0, marginLeft:12 },
  formula:    { margin:"16px 22px 0", background:"#f0f6ff", borderRadius:10, padding:"12px 16px", borderLeft:"3px solid #1a6fd4" },
  formulalabel:{ fontSize:10, color:"#1a6fd4", fontWeight:700, marginBottom:6 },
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
          <div style={{ background:"#E6F1FB", borderRadius:10, padding:"14px 16px", margin:"16px 0 0", border:"1px solid #c5d8f5" }}>
            <div style={{ fontSize:11, color:"#6a9fd4", marginBottom:4, fontWeight:600 }}>料金</div>
            <div style={{ display:"flex", alignItems:"baseline", gap:6 }}><span style={{ fontSize:26, fontWeight:800, color:"#1a6fd4" }}>¥1,000</span><span style={{ fontSize:13, color:"#6a9fd4" }}>/ 月　1社あたり（税別）</span></div>
          </div>
        </div>
        <div style={{ padding:"16px 28px 28px", display:"flex", gap:10 }}>
          <button style={{ flex:1, padding:"11px", borderRadius:8, border:"1px solid #dce3f0", background:"transparent", color:"#888", fontSize:13, cursor:"pointer" }} onClick={onClose}>閉じる</button>
          <button style={{ flex:2, padding:"11px", borderRadius:8, border:"none", background:"#1a6fd4", color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer" }} onClick={onContract}>✦ このオプションを契約する（デモ）</button>
        </div>
      </div>
    </div>
  );
}

// ── CLICKABLE NUMBER ──────────────────────────────────────────────────────────
function N({ v, modal, setModal, style }) {
  return <span style={{ cursor:"pointer", borderBottom:"1.5px dashed #c5d0e0", paddingBottom:1, ...style }} onClick={() => setModal(modal)} title="クリックで根拠を表示">{v}</span>;
}

// ── SIDEBAR ───────────────────────────────────────────────────────────────────
function Sidebar({ screen, setScreen, taxMode, setTaxMode, opInvoice, showOPModal, master, selMonth, setSelMonth, fiscalMonths }) {
  const coName = master?.company?.name || "Soku経理";
  const navItems = [
    { id:"home",     icon:"◈", label:"ダッシュボード" },
    { id:"sales",    icon:"↑", label:"売上入力" },
    { id:"expenses", icon:"↓", label:"経費入力" },
    { id:"pl",       icon:"≡", label:"損益計算書" },
    { id:"ar",       icon:"◎", label:"未入金・未払金" },
    { id:"cashflow", icon:"⇄", label:"資金繰り" },
    { id:"partners", icon:"☺", label:"相手先" },
    { id:"master",   icon:"⚙", label:"マスター設定" },
  ];
  return (
    <div className="sidebar" style={{ width:240, minHeight:"100vh", background:"#1a2340", position:"fixed", top:0, left:0, display:"flex", flexDirection:"column", zIndex:100 }}>
      <div style={{ padding:"28px 20px 16px" }}>
        <div style={{ fontSize:21, fontWeight:800, color:"#fff", letterSpacing:-0.5 }}>
          {coName.length > 10 ? "Soku経理" : coName}
        </div>
        <div style={{ fontSize:11, color:"#4d6a99", marginTop:3 }}>経営管理クラウド</div>
      </div>
      <nav style={{ flex:1, padding:"4px 12px" }}>
        {navItems.map(item => (
          <button key={item.id} onClick={() => setScreen(item.id)} style={{
            display:"flex", alignItems:"center", gap:12, width:"100%",
            padding:"10px 14px", borderRadius:8, border:"none", cursor:"pointer",
            background: screen === item.id ? "rgba(255,255,255,0.13)" : "transparent",
            color: screen === item.id ? "#fff" : "#7a95bb",
            fontSize:13, fontWeight: screen === item.id ? 600 : 400,
            marginBottom:2, textAlign:"left", transition:"all 0.15s",
          }}>
            <span style={{ fontSize:15, width:20, textAlign:"center" }}>{item.icon}</span>
            {item.label}
            {screen === item.id && <span style={{ marginLeft:"auto", width:3, height:18, borderRadius:2, background:"#4d9ef7", display:"block" }} />}
          </button>
        ))}
        {opInvoice
          ? <button onClick={() => setScreen("invoice")} style={{ display:"flex", alignItems:"center", gap:12, width:"100%", padding:"10px 14px", borderRadius:8, border:"none", cursor:"pointer", background: screen==="invoice" ? "#1a6fd4" : "rgba(26,111,212,0.18)", color: screen==="invoice" ? "#fff" : "#7bb8f5", fontSize:13, fontWeight:600, marginBottom:2, textAlign:"left" }}>
              <span style={{ fontSize:15, width:20, textAlign:"center" }}>✦</span>
              請求書
              {screen === "invoice" && <span style={{ marginLeft:"auto", width:3, height:18, borderRadius:2, background:"#fff", display:"block" }} />}
            </button>
          : <button onClick={showOPModal} style={{ display:"flex", alignItems:"center", gap:12, width:"100%", padding:"10px 14px", borderRadius:8, border:"none", cursor:"pointer", background:"transparent", color:"#3d5474", fontSize:13, marginBottom:2, textAlign:"left" }}>
              <span style={{ fontSize:15, width:20, textAlign:"center" }}>🔒</span>
              請求書
            </button>
        }
      </nav>
      {fiscalMonths && setSelMonth && (
        <div style={{ padding:"12px 20px 0", borderTop:"1px solid rgba(255,255,255,0.07)" }}>
          <div style={{ fontSize:10, color:"#4d6a99", fontWeight:600, marginBottom:6, letterSpacing:0.5 }}>対象月</div>
          <select value={selMonth} onChange={e=>setSelMonth(e.target.value)} style={{ width:"100%", background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.14)", color:"#fff", borderRadius:7, padding:"7px 10px", fontSize:12, cursor:"pointer", outline:"none" }}>
            {fiscalMonths.map(m=><option key={m} value={m} style={{ background:"#1a2340", color:"#fff" }}>{m}</option>)}
          </select>
        </div>
      )}
      <div style={{ padding:"14px 20px 24px", borderTop:"none" }}>
        <div style={{ fontSize:10, color:"#4d6a99", fontWeight:600, marginBottom:8, letterSpacing:0.5, marginTop:14 }}>表示モード</div>
        <div style={{ display:"flex", background:"rgba(0,0,0,0.25)", borderRadius:6, padding:3, gap:2 }}>
          <button onClick={() => setTaxMode("inc")} style={{ flex:1, padding:"5px 0", borderRadius:4, border:"none", background:taxMode==="inc"?"rgba(255,255,255,0.18)":"transparent", color:taxMode==="inc"?"#fff":"#4d6a99", fontSize:12, cursor:"pointer", fontWeight:taxMode==="inc"?700:400 }}>税込</button>
          <button onClick={() => setTaxMode("exc")} style={{ flex:1, padding:"5px 0", borderRadius:4, border:"none", background:taxMode==="exc"?"rgba(255,255,255,0.18)":"transparent", color:taxMode==="exc"?"#fff":"#4d6a99", fontSize:12, cursor:"pointer", fontWeight:taxMode==="exc"?700:400 }}>税抜</button>
        </div>
        <div style={{ fontSize:10, color:"#2d3d56", marginTop:10 }}>数字をクリックで根拠表示</div>
      </div>
    </div>
  );
}

// ── BOTTOM NAV (mobile) ───────────────────────────────────────────────────────
function BottomNav({ screen, setScreen, opInvoice, showOPModal }) {
  const items = [
    { id:"home",     label:"ホーム",   icon:"◈" },
    { id:"sales",    label:"売上",     icon:"↑" },
    { id:"expenses", label:"経費",     icon:"↓" },
    { id:"pl",       label:"損益",     icon:"≡" },
    { id:"ar",       label:"消込",     icon:"◎" },
    { id:"partners", label:"相手先",   icon:"☺" },
  ];
  return (
    <div className="bottom-nav" style={{ position:"fixed", bottom:0, left:0, right:0, background:"#fff", borderTop:"1px solid #e8ecf3", display:"none", zIndex:100, height:58, boxShadow:"0 -2px 12px rgba(0,0,0,0.06)" }}>
      {items.map(item => (
        <button key={item.id} onClick={() => setScreen(item.id)} style={{
          flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
          border:"none", background:"transparent", cursor:"pointer",
          color: screen === item.id ? "#1a6fd4" : "#aaa",
          fontSize:10, fontWeight: screen===item.id ? 700 : 400, gap:3, height:"100%",
        }}>
          <span style={{ fontSize:18, lineHeight:1 }}>{item.icon}</span>
          {item.label}
        </button>
      ))}
    </div>
  );
}

// ── MONTH BAR ─────────────────────────────────────────────────────────────────
function MonthBar({ selMonth, setSelMonth, fiscalMonths }) {
  return (
    <div style={{ display:"flex", gap:4, marginBottom:16, flexWrap:"wrap" }}>
      {fiscalMonths.map(m => (
        <button key={m} style={{ padding:"5px 12px", borderRadius:20, border:"1px solid", borderColor:selMonth===m?"#1a6fd4":"#e0e0e0", background:selMonth===m?"#1a6fd4":"#fff", color:selMonth===m?"#fff":"#777", fontSize:11, cursor:"pointer", fontWeight:selMonth===m?700:400 }} onClick={() => setSelMonth(m)}>{m}</button>
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
        <linearGradient id="gradS" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#1a6fd4" stopOpacity="0.18"/><stop offset="100%" stopColor="#1a6fd4" stopOpacity="0"/></linearGradient>
        <linearGradient id="gradE" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#EF9F27" stopOpacity="0.14"/><stop offset="100%" stopColor="#EF9F27" stopOpacity="0"/></linearGradient>
      </defs>
      {gridVals.map((r,i) => {
        const y = PT + CH - r * CH;
        return <g key={i}>
          <line x1={PL} y1={y} x2={PL+CW} y2={y} stroke="#edf0f7" strokeWidth={1}/>
          <text x={PL-4} y={y+4} textAnchor="end" fontSize={9} fill="#ccc">{fmtK(maxV*r)}</text>
        </g>;
      })}
      {months.map((m,i) => (
        <text key={i} x={toX(i)} y={VH-6} textAnchor="middle" fontSize={9} fill="#bbb">{m.replace(/\d{4}年/,"")}</text>
      ))}
      <path d={salesArea} fill="url(#gradS)"/>
      <path d={expArea}   fill="url(#gradE)"/>
      <polyline points={salesPts} fill="none" stroke="#1a6fd4" strokeWidth={2.2} strokeLinejoin="round"/>
      <polyline points={expPts}   fill="none" stroke="#EF9F27" strokeWidth={2.2} strokeLinejoin="round"/>
      {salesData.map((v,i) => <circle key={i} cx={toX(i)} cy={toY(v)} r={3.5} fill="#fff" stroke="#1a6fd4" strokeWidth={2}/>)}
      {expData.map((v,i)   => <circle key={i} cx={toX(i)} cy={toY(v)} r={3.5} fill="#fff" stroke="#EF9F27" strokeWidth={2}/>)}
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
          <text x={PL-4} y={y+4} textAnchor="end" fontSize={9} fill="#ccc">{fmtK(v)}</text>
        </g>;
      })}
      {profitData.map((v,i) => {
        const x = PL + i * slot + (slot - bw) / 2;
        const top = toY(Math.max(v,0)), bot = toY(Math.min(v,0));
        const h = Math.max(bot - top, 2);
        return <g key={i}>
          <defs>
            <linearGradient id={`bg${i}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={v>=0?"#2ecc8f":"#f09595"}/>
              <stop offset="100%" stopColor={v>=0?"#0F6E56":"#A32D2D"}/>
            </linearGradient>
          </defs>
          <rect x={x} y={top} width={bw} height={h} fill={`url(#bg${i})`} rx={3}/>
          <text x={x+bw/2} y={VH-6} textAnchor="middle" fontSize={9} fill="#bbb">{months[i].replace(/\d{4}年/,"")}</text>
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
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1a6fd4" strokeWidth={stroke}
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
  const Screens = { home:HomeScreen, sales:SalesScreen, expenses:ExpenseScreen, pl:PLScreen, ar:ARScreen, cashflow:CashflowScreen, invoice:InvoiceScreen, partners:PartnersScreen, master:MasterScreen };
  const Screen = Screens[screen] || HomeScreen;
  const hasDemo = sales.some(r=>r.demo) || expenses.some(r=>r.demo) || master.counterparties.some(c=>c.sample);
  const clearDemo = () => { setSales(p=>p.filter(r=>!r.demo)); setExpenses(p=>p.filter(r=>!r.demo)); setMaster(m=>({ ...m, counterparties: m.counterparties.filter(c=>!c.sample) })); showToast("見本を消しました。自分の数字を入れられます"); };

  return (
    <div style={{ fontFamily:"'Hiragino Sans','Noto Sans JP',sans-serif", fontSize:13, display:"flex", minHeight:"100vh" }}>
      <style>{css}</style>
      {toast && <div style={{ position:"fixed", top:16, right:16, zIndex:300, padding:"10px 16px", borderRadius:8, border:"1px solid", fontSize:13, fontWeight:500, background:toast.type==="error"?"#FCEBEB":"#EAF3DE", color:toast.type==="error"?"#A32D2D":"#27500A", borderColor:toast.type==="error"?"#F09595":"#97C459" }}>{toast.type==="error"?"⚠ ":"✓ "}{toast.msg}</div>}
      <DrillModal modal={modal} onClose={() => setModal(null)} />
      {showOPModal && <OPModal onClose={() => setShowOPModal(false)} onContract={() => { setOpInvoice(true); setShowOPModal(false); setScreen("invoice"); showToast("請求書オプションを契約しました！"); }} />}
      <Sidebar screen={screen} setScreen={setScreen} taxMode={taxMode} setTaxMode={setTaxMode} opInvoice={opInvoice} showOPModal={() => setShowOPModal(true)} master={master} selMonth={selMonth} setSelMonth={setSelMonth} fiscalMonths={fiscalMonths} />
      <div className="main-area" style={{ marginLeft:240, flex:1, background:"#f4f6fb", minHeight:"100vh", overflowX:"hidden" }}>
        {hasDemo && (
          <div className="demo-bar" role="status">
            <span><b>見本の数字が入っています。</b>どんな画面になるかを見るためのものです。</span>
            <button onClick={clearDemo}>見本を消して、自分の数字で始める</button>
          </div>
        )}
        <Screen {...shared} />
      </div>
      <BottomNav screen={screen} setScreen={setScreen} opInvoice={opInvoice} showOPModal={() => setShowOPModal(true)} />
    </div>
  );
}

// ── HOME ──────────────────────────────────────────────────────────────────────
function HomeScreen({ setScreen, totalSales, totalExp, opProfit, ar, val, sales, expenses, selMonth, setModal, curSales, curExp, grossProfit, genka, sga, fiscalMonths, master, opInvoice, showOPModal }) {
  const arCount = sales.filter(s=>s.status==="未入金").length;
  const fiscalIdx = fiscalMonths.indexOf(selMonth);
  const fiscalLabel = fiscalIdx >= 0 ? `第${master.company.fiscalNum || 1}期 ${fiscalIdx+1}ヶ月目` : "";

  // chart data (6 months)
  const endIdx = Math.max(fiscalIdx, 0); const ms6 = fiscalMonths.slice(Math.max(0, endIdx-5), Math.max(0, endIdx-5)+6);
  const salesData  = ms6.map(m => sales.filter(r=>r.month===m).reduce((s,r)=>s+r.amount,0));
  const expData    = ms6.map(m => expenses.filter(r=>r.month===m).reduce((s,r)=>s+r.amount,0));
  const profitData = salesData.map((v,i) => v - expData[i]);

  // 4 gradient cards + 2 plain cards
  const gradKpis = [
    { label:"今月の売上", v:val(totalSales), sub:`売上件数：${curSales.length}件`,                              grad:"linear-gradient(135deg,#1a6fd4,#4a9fe4)", modal:{ title:`${selMonth}　売上合計`,   amount:val(totalSales), color:"#1a6fd4", rows:curSales.map(r=>({ "日付":r.date,"相手先":r.client,"金額":val(r.amount),"状態":r.status })), note:`${curSales.length}件の合計です。` }},
    { label:"今月経費",   v:val(totalExp),   sub:`経費件数：${curExp.length}件`,                               grad:"linear-gradient(135deg,#EF9F27,#f4c05a)", modal:{ title:`${selMonth}　経費合計`,   amount:val(totalExp),   color:"#EF9F27", formula:`売上原価 ${val(genka)}\n＋ 販管費 ${val(sga)}\n＝ 経費合計 ${val(totalExp)}`, rows:curExp.map(r=>({ "相手先":r.client,"科目":r.account,"金額":val(r.amount) })) }},
    { label:"営業利益",   v:val(opProfit),   sub:`売上利益率：${totalSales?Math.round(opProfit/totalSales*100):0}%`, grad:"linear-gradient(135deg,#0F6E56,#2ecc8f)", modal:{ title:"営業利益", amount:val(opProfit), color:"#0F6E56", formula:`売上高 ${val(totalSales)}\nー 売上原価 ${val(genka)}\n＝ 粗利 ${val(grossProfit)}\nー 販管費 ${val(sga)}\n＝ 営業利益 ${val(opProfit)}`, note:"本業で稼いだ利益です。" }},
    { label:"未入金",     v:val(ar),         sub:`まだ入金がない：${arCount}件`,                                     grad:"linear-gradient(135deg,#854F0B,#c47a2e)", modal:{ title:"未入金の合計",               amount:val(ar),         color:"#854F0B", rows:sales.filter(s=>s.status==="未入金").map(r=>({ "相手先":r.client,"反映月":r.month,"金額":val(r.amount) })), note:`${arCount}件が未入金です。` }},
  ];

  return (
    <div className="screen-wrap" style={{ padding:"24px 24px 40px" }}>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
        <div>
          <div style={{ fontSize:22, fontWeight:800, color:"#111", letterSpacing:-0.5 }}>ダッシュボード</div>
          {fiscalLabel && <div style={{ fontSize:12, color:"#aaa", marginTop:2 }}>{selMonth}　{fiscalLabel}</div>}
        </div>
        <div style={{ fontSize:12, color:"#bbb" }}>{master.company.name || "会社名未設定"}</div>
      </div>

      {/* KPI cards — 縦積み3行 */}
      {(() => {
        const [kSales, kExp, kOp, kAr] = gradKpis; // 今月の売上, 今月経費, 営業利益, 未入金
        const GCard = ({ c, amtSize=32, pad="20px", style={} }) => (
          <div style={{ background:c.grad, borderRadius:16, padding:pad, boxShadow:"0 4px 16px rgba(0,0,0,0.12)", position:"relative", overflow:"hidden", textAlign:"center", ...style }}>
            <div style={{ position:"absolute", right:-16, top:-16, width:90, height:90, borderRadius:"50%", background:"rgba(255,255,255,0.07)" }}/>
            <div style={{ fontSize:12, color:"rgba(255,255,255,0.8)", fontWeight:600, marginBottom:8 }}>{c.label}</div>
            <N v={c.v} modal={c.modal} setModal={setModal} style={{ fontSize:amtSize, fontWeight:800, color:"#fff", letterSpacing:-1, whiteSpace:"nowrap" }} />
            <div style={{ fontSize:13, color:"rgba(255,255,255,0.75)", marginTop:8 }}>{c.sub}</div>
          </div>
        );
        return (
          <div style={{ display:"flex", flexDirection:"column", gap:12, marginBottom:20 }}>
            {/* 行1: 今月の売上(flex:2) + 売掛残高(flex:1) */}
            <div className="kpi-row" style={{ display:"flex", gap:12 }}>
              <GCard c={kSales} style={{ flex:2 }} />
              <GCard c={kAr}    style={{ flex:1 }} />
            </div>
            {/* 行2: 今月経費 */}
            <GCard c={kExp} style={{ width:"100%" }} />
            {/* 行3: 営業利益 — 一番大きく */}
            <GCard c={kOp} amtSize={36} pad="24px" style={{ width:"100%" }} />
          </div>
        );
      })()}

      {/* Charts row */}
      <div className="charts-row" style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:16, marginBottom:20 }}>
        {/* Line chart */}
        <div style={{ background:"#fff", border:"1px solid #e8ecf3", borderRadius:16, padding:"18px 20px", boxShadow:"0 1px 4px rgba(0,0,0,0.04)" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
            <div style={{ fontSize:12, fontWeight:700, color:"#333" }}>売上・経費トレンド（6ヶ月）</div>
            <div style={{ display:"flex", gap:14 }}>
              <div style={{ display:"flex", alignItems:"center", gap:5 }}><div style={{ width:12, height:3, borderRadius:2, background:"#1a6fd4" }}/><span style={{ fontSize:10, color:"#999" }}>売上</span></div>
              <div style={{ display:"flex", alignItems:"center", gap:5 }}><div style={{ width:12, height:3, borderRadius:2, background:"#EF9F27" }}/><span style={{ fontSize:10, color:"#999" }}>経費</span></div>
            </div>
          </div>
          <LineChart months={ms6} salesData={salesData} expData={expData} />
        </div>

        {/* Bar chart */}
        <div style={{ background:"#fff", border:"1px solid #e8ecf3", borderRadius:16, padding:"18px 20px", boxShadow:"0 1px 4px rgba(0,0,0,0.04)" }}>
          <div style={{ fontSize:12, fontWeight:700, color:"#333", marginBottom:14 }}>月別営業利益</div>
          <BarChart months={ms6} profitData={profitData} />
        </div>
      </div>

      {/* Quick actions */}
      <div className="quick-grid" style={{ display:"grid", gridTemplateColumns:"repeat(8,1fr)", gap:10 }}>
        {[
          { id:"sales",    icon:"↑", label:"売上入力",   bg:"#E1F5EE", ic:"#0F6E56" },
          { id:"expenses", icon:"↓", label:"経費入力",   bg:"#FAECE7", ic:"#993C1D" },
          { id:"pl",       icon:"≡", label:"損益計算書", bg:"#E6F1FB", ic:"#185FA5" },
          { id:"ar",       icon:"◎", label:"未入金・未払金", bg:"#FAEEDA", ic:"#854F0B" },
          { id:"cashflow", icon:"⇄", label:"資金繰り",   bg:"#EEEDFE", ic:"#534AB7" },
          { id:"invoice",  icon:opInvoice?"✦":"🔒", label:"請求書", bg:"#E6F1FB", ic:"#1a6fd4" },
          { id:"partners", icon:"☺", label:"相手先",     bg:"#E1F5EE", ic:"#0F6E56" },
          { id:"master",   icon:"⚙", label:"マスター",   bg:"#f0f0f0", ic:"#555"    },
        ].map(m => (
          <button key={m.id} style={{ background:"#fff", border:"1px solid #e8ecf3", borderRadius:14, padding:"14px 8px", textAlign:"center", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:7, boxShadow:"0 1px 3px rgba(0,0,0,0.04)" }} onClick={() => (m.id==="invoice" && !opInvoice) ? showOPModal() : setScreen(m.id)}>
            <div style={{ width:40, height:40, borderRadius:10, background:m.bg, color:m.ic, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, fontWeight:700 }}>{m.icon}</div>
            <div style={{ fontSize:11, fontWeight:700, color:"#333" }}>{m.label}</div>
          </button>
        ))}
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
            <button type="button" style={{ ...s.pickItem, color:"#1a6fd4", fontWeight:700 }} onMouseDown={e => e.preventDefault()} onClick={() => pick(addCounterparty(q, kind))}>
              ＋「{q}」を相手先に足す
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── SALES ─────────────────────────────────────────────────────────────────────
function SalesScreen({ setSales, selMonth, setSelMonth, val, showToast, curSales, setModal, master, fiscalMonths, addCounterparty }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ date:today(), month:monthOfDate(today()), type:"売掛", client:"", amount:"", tax:10, memo:"", status:"未入金" });
  const [showAlert, setShowAlert] = useState(false);
  const sf = (k,v) => setForm(f=>({...f,[k]:v}));
  // 金額がこの月の平均と大きく違うときは、保存の前に一度だけ確かめる（入力の途中では出さない：ボタンの位置がずれて押し損ねるため）
  const isOutlier = () => {
    if (!form.amount || curSales.length===0) return false;
    const avg = curSales.reduce((s,r)=>s+r.amount,0)/curSales.length;
    return Number(form.amount)>avg*3||Number(form.amount)<avg*0.2;
  };
  const doSave = (force) => {
    if (!form.client||!form.amount) { showToast("相手先と金額は必須です","error"); return; }
    if (force!==true && !showAlert && isOutlier()) { setShowAlert(true); return; }
    setShowAlert(false);
    setSales(p=>[...p,{ ...form,id:Date.now(),amount:Number(form.amount) }]); setSelMonth(form.month);
    setShowForm(false); setForm({ date:today(),month:monthOfDate(today()),type:"売掛",client:"",amount:"",tax:10,memo:"",status:"未入金" });
    showToast("売上を保存しました");
  };
  const markPaid = (id) => { setSales(p=>p.map(r=>r.id===id?{...r,status:"入金済"}:r)); showToast("入金済みにしました"); };
  const total = curSales.reduce((s,r)=>s+r.amount,0);
  return (
    <div className="screen-wrap" style={s.screenWrap}>
      <div style={s.pageHeader}><div style={s.pageTitle}>売上入力</div><button style={s.btnP} onClick={()=>setShowForm(true)}>＋ 新規入力</button></div>
      <MonthBar selMonth={selMonth} setSelMonth={setSelMonth} fiscalMonths={fiscalMonths} />
      {showForm && (
        <div style={s.formCard}>
          <div style={s.formTitle}>売上を入力する</div>
          <div className="form-grid" style={s.formGrid}>
            <FR label="日付"><input type="date" style={s.inp} value={form.date} onChange={e=>{ const v=e.target.value; setForm(f=>({ ...f, date:v, month: fiscalMonths.includes(monthOfDate(v)) ? monthOfDate(v) : f.month })); }} /></FR>
            <FR label="反映月" hint={"この売上は何月の仕事ですか？\n例）3月納品 → 3月　4月に請求しても3月と入力"}>
              <select style={s.inp} value={form.month} onChange={e=>sf("month",e.target.value)}>{fiscalMonths.map(m=><option key={m}>{m}</option>)}</select>
            </FR>
            <FR label="区分"><select style={s.inp} value={form.type} onChange={e=>sf("type",e.target.value)}>{["現金","売掛","カード"].map(t=><option key={t} value={t}>{typeLabel(t)}</option>)}</select></FR>
            <FR label="相手先">
              <CpPicker value={form.client} onChange={v=>sf("client",v)} counterparties={master.counterparties} addCounterparty={addCounterparty} kind="売り先" />
            </FR>
            <FR label="金額（税込）"><input type="number" style={s.inp} value={form.amount} onChange={e=>sf("amount",e.target.value)} placeholder="110000" /></FR>
            <FR label="税率"><select style={s.inp} value={form.tax} onChange={e=>sf("tax",Number(e.target.value))}><option value={10}>10%（標準）</option><option value={8}>8%（軽減）</option><option value={0}>0%（非課税）</option></select></FR>
            <FR label="備考"><input style={s.inp} value={form.memo} onChange={e=>sf("memo",e.target.value)} placeholder="Web制作費 5月分など" /></FR>
          </div>
          {showAlert && <div style={s.alertBox} role="alert">⚠ この月のほかの金額と大きく違います。金額が合っていれば、もう一度「保存する」を押してください。</div>}
          <div style={s.formBtns}><button style={s.btnS} onClick={()=>setShowForm(false)}>キャンセル</button><button style={s.btnP} onClick={()=>doSave(showAlert)}>保存する</button></div>
        </div>
      )}
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
function ExpenseScreen({ setExpenses, selMonth, setSelMonth, val, showToast, curExp, setModal, master, fiscalMonths, addCounterparty }) {
  const [showForm, setShowForm] = useState(false);
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
    setExpenses(p=>[...p,{ ...form,id:Date.now(),amount:Number(form.amount) }]); setSelMonth(form.month);
    setShowForm(false); setFreeText(""); setSuggestion(null);
    setForm({ date:today(),month:monthOfDate(today()),type:"現金",client:"",account:"",amount:"",tax:10,memo:"",status:"未払い" });
    showToast("経費を保存しました");
  };
  const markPaid = (id) => { setExpenses(p=>p.map(e=>e.id===id?{...e,status:"支払済"}:e)); showToast("支払済みにしました"); };
  const total = curExp.reduce((s,r)=>s+r.amount,0);
  const accountOptions = master.accounts.filter(a=>a.category!=="revenue");
  return (
    <div className="screen-wrap" style={s.screenWrap}>
      <div style={s.pageHeader}><div style={s.pageTitle}>経費入力</div><button style={s.btnP} onClick={()=>setShowForm(true)}>＋ 新規入力</button></div>
      <MonthBar selMonth={selMonth} setSelMonth={setSelMonth} fiscalMonths={fiscalMonths} />
      {showForm && (
        <div style={s.formCard}>
          <div style={s.formTitle}>経費を入力する</div>
          <div className="form-grid" style={s.formGrid}>
            <FR label="日付"><input type="date" style={s.inp} value={form.date} onChange={e=>{ const v=e.target.value; setForm(f=>({ ...f, date:v, month: fiscalMonths.includes(monthOfDate(v)) ? monthOfDate(v) : f.month })); }} /></FR>
            <FR label="反映月" hint={"この経費は何月分ですか？\n例）4月の家賃を5月に払う場合 → 4月と入力"}>
              <select style={s.inp} value={form.month} onChange={e=>sf("month",e.target.value)}>{fiscalMonths.map(m=><option key={m}>{m}</option>)}</select>
            </FR>
            <FR label="何に使いましたか？" hint="入力すると勘定科目を自動提案します">
              <div>
                <input style={s.inp} value={freeText} onChange={e=>onFree(e.target.value)} placeholder="例：電車代、接待ランチ、Adobe代など" />
                {suggestion && <div style={s.aiSug}>✦ AIの提案：<strong>{suggestion}</strong> に分類しました</div>}
              </div>
            </FR>
            <FR label="勘定科目">
              <select style={s.inp} value={form.account} onChange={e=>sf("account",e.target.value)}>
                <option value="">選択してください</option>
                {accountOptions.map(a=><option key={a.id} value={a.label}>{a.label}（例：{a.examples.split("、")[0]}）</option>)}
              </select>
            </FR>
            <FR label="区分"><select style={s.inp} value={form.type} onChange={e=>sf("type",e.target.value)}>{["現金","買掛","カード"].map(t=><option key={t} value={t}>{typeLabel(t)}</option>)}</select></FR>
            <FR label="相手先"><CpPicker value={form.client} onChange={v=>sf("client",v)} counterparties={master.counterparties} addCounterparty={addCounterparty} kind="支払い先" placeholder="〇〇ビルなど（一部でもOK）" /></FR>
            <FR label="金額（税込）"><input type="number" style={s.inp} value={form.amount} onChange={e=>sf("amount",e.target.value)} placeholder="50000" /></FR>
            <FR label="税率"><select style={s.inp} value={form.tax} onChange={e=>sf("tax",Number(e.target.value))}><option value={10}>10%（標準）</option><option value={8}>8%（軽減）</option><option value={0}>0%（非課税）</option></select></FR>
          </div>
          {showAlert && <div style={s.alertBox} role="alert">⚠ この月のほかの金額と大きく違います。金額が合っていれば、もう一度「保存する」を押してください。</div>}
          <div style={s.formBtns}><button style={s.btnS} onClick={()=>setShowForm(false)}>キャンセル</button><button style={s.btnP} onClick={()=>doSave(showAlert)}>保存する</button></div>
        </div>
      )}
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
function PLScreen({ selMonth, setSelMonth, val, totalSales, genka, grossProfit, sga, opProfit, curExp, setModal, master, fiscalMonths, sales, expenses }) {
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
    <div className="screen-wrap" style={s.screenWrap}>
      <div style={s.pageHeader}>
        <div>
          <div style={s.pageTitle}>損益計算書</div>
          <div style={{ fontSize:12, color:"#aaa", marginTop:2 }}>第{fiscalNum}期　{fiscalMonths[0]}〜{fiscalMonths[11]}</div>
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
          <div key={i} style={{ ...s.plRow, background:r.hl?(r.big?"#E6F1FB":"#f0f6ff"):i%2===0?"#fff":"#fafafa", borderTop:r.hl?"1px solid #c5d8f5":undefined }}>
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
function ARScreen({ sales, setSales, expenses, setExpenses, val, showToast, setModal }) {
  const unpS=sales.filter(s=>s.status==="未入金"), paidS=sales.filter(s=>s.status==="入金済");
  const unpE=expenses.filter(e=>e.status==="未払い"), paidE=expenses.filter(e=>e.status==="支払済");
  const arT=unpS.reduce((s,r)=>s+r.amount,0), apT=unpE.reduce((s,r)=>s+r.amount,0);
  const mS=(id)=>{setSales(p=>p.map(r=>r.id===id?{...r,status:"入金済"}:r));showToast("入金済みにしました");};
  const mE=(id)=>{setExpenses(p=>p.map(e=>e.id===id?{...e,status:"支払済"}:e));showToast("支払済みにしました");};
  return (
    <div className="screen-wrap" style={s.screenWrap}>
      <div style={s.pageHeader}><div style={s.pageTitle}>未入金・未払金</div></div>
      <div className="master-grid" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
        <div>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
            <div style={s.secTitle}>未入金（まだ入っていないお金）</div>
            <N v={val(arT)} setModal={setModal} style={{ fontSize:16, fontWeight:800, color:"#854F0B" }} modal={{ title:"未入金の合計", amount:val(arT), color:"#854F0B", rows:unpS.map(r=>({ "相手先":r.client,"反映月":r.month,"金額":val(r.amount) })) }} />
          </div>
          <div className="tbl-wrap" style={s.tblWrap}><table style={s.tbl}><thead><tr>{["相手先","金額","区分",""].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead><tbody>
            {unpS.length===0?<tr><td colSpan={4} style={{ ...s.td,textAlign:"center",color:"#bbb",padding:20 }}>✓ 未入金なし</td></tr>
            :unpS.map(r=><tr key={r.id} style={s.tr}><td style={{ ...s.td,fontWeight:500 }}>{r.client}</td><td style={{ ...s.td,textAlign:"right" }}><N v={val(r.amount)} setModal={setModal} style={{ fontWeight:700,color:"#854F0B" }} modal={{ title:`${r.client}　未入金`,amount:val(r.amount),color:"#854F0B",rows:[{ "相手先":r.client,"反映月":r.month,"区分":typeLabel(r.type),"備考":r.memo||"—" }],note:"「入金済」ボタンで消込できます。" }} /></td><td style={s.td}><span style={{ ...s.badge,...s.bAmber }}>{typeLabel(r.type)}</span></td><td style={s.td}><button style={s.paidBtn} onClick={()=>mS(r.id)}>入金済</button></td></tr>)}
          </tbody></table></div>
          <div style={s.secTitleSub}>入金済（消込済）</div>
          <div className="tbl-wrap" style={s.tblWrap}><table style={s.tbl}><thead><tr>{["相手先","金額",""].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead><tbody>{paidS.map(r=><tr key={r.id} style={{ ...s.tr,opacity:0.5 }}><td style={s.td}>{r.client}</td><td style={{ ...s.td,textAlign:"right" }}>{val(r.amount)}</td><td style={s.td}><span style={{ ...s.badge,...s.bGreen }}>✓ 入金済</span></td></tr>)}</tbody></table></div>
        </div>
        <div>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
            <div style={{ ...s.secTitle,color:"#A32D2D" }}>未払金（まだ払っていないお金）</div>
            <N v={val(apT)} setModal={setModal} style={{ fontSize:16, fontWeight:800, color:"#A32D2D" }} modal={{ title:"未払金の合計", amount:val(apT), color:"#A32D2D", rows:unpE.map(r=>({ "相手先":r.client,"科目":r.account,"金額":val(r.amount) })) }} />
          </div>
          <div className="tbl-wrap" style={s.tblWrap}><table style={s.tbl}><thead><tr>{["相手先","科目","金額",""].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead><tbody>
            {unpE.length===0?<tr><td colSpan={4} style={{ ...s.td,textAlign:"center",color:"#bbb",padding:20 }}>✓ 未払いなし</td></tr>
            :unpE.map(r=><tr key={r.id} style={s.tr}><td style={{ ...s.td,fontWeight:500 }}>{r.client}</td><td style={{ ...s.td,color:"#666" }}>{r.account}</td><td style={{ ...s.td,textAlign:"right" }}><N v={val(r.amount)} setModal={setModal} style={{ fontWeight:700,color:"#A32D2D" }} modal={{ title:`${r.client}　未払い`,amount:val(r.amount),color:"#A32D2D",rows:[{ "相手先":r.client,"科目":r.account,"備考":r.memo||"—" }],note:"「支払済」ボタンで消込できます。" }} /></td><td style={s.td}><button style={{ ...s.paidBtn,borderColor:"#f09595",color:"#A32D2D" }} onClick={()=>mE(r.id)}>支払済</button></td></tr>)}
          </tbody></table></div>
          <div style={s.secTitleSub}>支払済（消込済）</div>
          <div className="tbl-wrap" style={s.tblWrap}><table style={s.tbl}><thead><tr>{["相手先","科目","金額"].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead><tbody>{paidE.map(r=><tr key={r.id} style={{ ...s.tr,opacity:0.5 }}><td style={s.td}>{r.client}</td><td style={{ ...s.td,color:"#666" }}>{r.account}</td><td style={{ ...s.td,textAlign:"right" }}>{val(r.amount)}</td></tr>)}</tbody></table></div>
        </div>
      </div>
    </div>
  );
}

// ── CASHFLOW ──────────────────────────────────────────────────────────────────
function CashflowScreen({ val, sales, expenses, setModal, fiscalMonths }) {
  const ms6 = fiscalMonths.slice(0,6);
  const dIn  = ms6.map(m=>sales.filter(r=>r.month===m).reduce((s,r)=>s+r.amount,0));
  const dOut = ms6.map(m=>expenses.filter(r=>r.month===m).reduce((s,r)=>s+r.amount,0));
  const bal  = dIn.map((v,i)=>{ let b=1000000; for(let j=0;j<=i;j++) b+=dIn[j]-dOut[j]; return b; });
  const mkIn =(i)=>({ title:`${ms6[i]}　入金合計`,amount:val(dIn[i]),color:"#0F6E56",rows:sales.filter(r=>r.month===ms6[i]).map(r=>({ "相手先":r.client,"金額":val(r.amount) })) });
  const mkOut=(i)=>({ title:`${ms6[i]}　支払合計`,amount:val(dOut[i]),color:"#A32D2D",rows:expenses.filter(r=>r.month===ms6[i]).map(r=>({ "相手先":r.client,"科目":r.account,"金額":val(r.amount) })) });
  const mkBal=(i)=>({ title:`${ms6[i]}　月末残高`,amount:val(bal[i]),color:"#185FA5",formula:i===0?`前月残高 ¥1,000,000\n＋ 入金 ${val(dIn[0])}\nー 支払 ${val(dOut[0])}\n＝ ${val(bal[0])}`:`前月残高 ${val(bal[i-1])}\n＋ 入金 ${val(dIn[i])}\nー 支払 ${val(dOut[i])}\n＝ ${val(bal[i])}` });
  const tRows=[
    { label:"入金合計", vals:dIn,  color:"#0F6E56",bold:true,mk:mkIn },
    { label:"支払合計", vals:dOut, color:"#A32D2D",bold:true,mk:mkOut },
    { label:"当月収支", vals:dIn.map((v,i)=>v-dOut[i]), color:"#185FA5",bold:true,mk:(i)=>({ title:`${ms6[i]}　当月収支`,amount:val(dIn[i]-dOut[i]),formula:`入金 ${val(dIn[i])}\nー 支払 ${val(dOut[i])}\n＝ ${val(dIn[i]-dOut[i])}` }) },
    { label:"月末残高", vals:bal,  color:"#185FA5",bold:true,hl:true,mk:mkBal },
  ];
  return (
    <div className="screen-wrap" style={s.screenWrap}>
      <div style={s.pageHeader}><div style={s.pageTitle}>資金繰り表</div><button style={s.btnS}>CSV出力</button></div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:16 }}>
        {[
          { l:"最新月末残高", v:bal[bal.length-1]||0, c:"#0F6E56", mo:mkBal(ms6.length-1) },
          { l:"直近入金合計", v:dIn[dIn.length-1]||0, c:"#185FA5", mo:mkIn(ms6.length-1) },
          { l:"直近支払合計", v:dOut[dOut.length-1]||0, c:"#333", mo:mkOut(ms6.length-1) },
          { l:"直近当月収支", v:(dIn[dIn.length-1]||0)-(dOut[dOut.length-1]||0), c:"#0F6E56", mo:mkBal(ms6.length-1) },
        ].map((c,i)=><div key={i} style={s.statCard}><div style={s.statLabel}>{c.l}</div><N v={val(c.v)} setModal={setModal} modal={c.mo} style={{ color:c.c,fontSize:20,fontWeight:800,display:"block",marginTop:4 }} /></div>)}
      </div>
      <div className="tbl-wrap" style={s.tblWrap}>
        <table style={s.tbl}>
          <thead><tr><th style={{ ...s.th,textAlign:"left",width:140 }}>項目</th>{ms6.map(m=><th key={m} style={s.th}>{m}</th>)}</tr></thead>
          <tbody>
            {tRows.map((row,ri)=>(
              <tr key={ri} style={{ background:row.hl?"#E6F1FB":ri%2===0?"#fff":"#fafafa" }}>
                <td style={{ ...s.td,textAlign:"left",fontWeight:row.bold?600:400,color:row.color||"#333",fontSize:12 }}>{row.label}</td>
                {row.vals.map((v,ci)=><td key={ci} style={{ ...s.td,textAlign:"right",fontSize:12 }}><N v={val(v)} setModal={setModal} modal={row.mk(ci)} style={{ fontWeight:row.bold?700:500,color:row.hl?"#185FA5":row.color||"#333" }} /></td>)}
              </tr>
            ))}
          </tbody>
        </table>
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
  const head = { ...cell, background:"#eef4fc", color:"#1a4f8f", fontWeight:700, borderBottom:"1px solid #c5d8f5", whiteSpace:"nowrap" };
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
          <div style={{ display:"flex", alignItems:"baseline", gap:12, marginTop:8, padding:"8px 14px", background:"#eef4fc", border:"1px solid #c5d8f5", borderRadius:4 }}>
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

function InvoiceScreen({ setScreen, master, sales, setSales, showToast, invoices, setInvoices, invoiceSeq, setInvoiceSeq, addCounterparty }) {
  const [mode, setMode] = useState(invoices.length ? "list" : "new");
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

  const goStep2 = () => { if (!form.client.trim()) { showToast("請求先を入れてください","error"); return; } setStep(2); };
  const goStep3 = () => { if (cleanItems.length===0) { showToast("明細を1行以上入れてください","error"); return; } setStep(3); };
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
      {busyId===inv.id ? "PDFを作っています…" : "📄 PDFで出す"}
    </button>
  );
  const stepNames = ["請求先","明細","確認"];

  return (
    <div className="screen-wrap" style={s.screenWrap}>
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
      <div style={{ ...s.pageHeader, flexWrap:"wrap", gap:10 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={s.pageTitle}>請求書</div>
          <span style={{ fontSize:13, fontWeight:700, color:"#1a6fd4", background:"#E6F1FB", borderRadius:10, padding:"2px 10px" }}>✦ OP</span>
        </div>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          <button style={s.btnS} onClick={() => setScreen("partners")}>☺ 相手先</button>
          {mode !== "list" && <button style={s.btnS} onClick={() => setMode("list")}>発行した請求書</button>}
          {mode === "list" && <button style={s.btnP} onClick={startNew}>＋ 新しく作る</button>}
        </div>
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

      {mode === "new" && (
        <div style={{ maxWidth:640 }}>
          <div style={{ display:"flex", gap:6, alignItems:"center", marginBottom:14, flexWrap:"wrap" }}>
            {[1,2,3].map(n => <div key={n} style={{ display:"flex", alignItems:"center", gap:4 }}>
              <div style={{ width:24, height:24, borderRadius:12, background:step>=n?"#1a6fd4":"#e8ecf3", color:step>=n?"#fff":"#aaa", fontSize:13, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center" }}>{n}</div>
              <span style={{ fontSize:13, color:step===n?"#1a6fd4":"#999", fontWeight:step===n?700:400 }}>{stepNames[n-1]}</span>
              {n<3 && <span style={{ color:"#ccc", margin:"0 2px" }}>›</span>}
            </div>)}
            <span style={{ marginLeft:"auto", fontSize:13, color:"#888" }}>番号 {nextNo}</span>
          </div>

          {step === 1 && (<>
            <div style={s.formCard}>
              <div style={s.formTitle}>だれに出しますか</div>
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
              {lastInv && <button style={{ ...s.btnS, width:"100%", marginTop:12, color:"#1a6fd4", borderColor:"#c5d8f5", background:"#f0f6ff", fontWeight:700 }} onClick={copyLast}>↻ 前回と同じ内容を入れる（{lastInv.no}）</button>}
            </div>
            <div style={{ textAlign:"right" }}><button style={s.btnP} onClick={goStep2}>次へ：明細 ›</button></div>
          </>)}

          {step === 2 && (<>
            <div style={s.formCard}>
              <div style={s.formTitle}>明細（単価は税抜で入れます）</div>
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
              <button style={{ width:"100%", padding:"11px", borderRadius:8, border:"1px dashed #c5d8f5", background:"#f0f6ff", color:"#1a6fd4", fontSize:14, fontWeight:600, cursor:"pointer", marginBottom:16 }} onClick={() => setItems(p => [...p, blankItem()])}>＋ 明細を足す</button>
              <div style={{ background:"#f7f9fc", borderRadius:8, padding:"12px 14px" }}>
                {calc.rates.map(r => <div key={r.rate} style={{ display:"flex", justifyContent:"space-between", fontSize:13, color:"#666", marginBottom:4 }}><span>{r.rate}%対象 {fmt(r.base)}</span><span>消費税 {fmt(r.tax)}</span></div>)}
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:16, fontWeight:800, color:"#1a6fd4", borderTop:"1px solid #e8ecf3", paddingTop:8, marginTop:4 }}><span>合計（税込）</span><span>{fmt(calc.total)}</span></div>
                <div style={{ ...s.hint13, marginTop:4 }}>消費税は税率ごとに合計してから1円未満を切り捨てています。</div>
              </div>
              <div style={{ marginTop:12 }}><FR label="備考"><textarea style={{ ...s.inp, minHeight:60, fontFamily:"inherit" }} value={form.memo} onChange={e => sf("memo", e.target.value)} placeholder="振込手数料はご負担ください" /></FR></div>
            </div>
            <div style={{ display:"flex", gap:10, justifyContent:"space-between" }}>
              <button style={s.btnS} onClick={() => setStep(1)}>‹ 戻る</button>
              <button style={s.btnP} onClick={goStep3}>確認する ›</button>
            </div>
          </>)}

          {step === 3 && (<>
            {!draft.issuer.regNo && <div style={{ ...s.alertBox, display:"block", marginTop:0, marginBottom:10, fontSize:13 }}>登録番号（T＋13けた）が未設定なので、番号なしで出します。免税事業者の方はこのままでOKです。<button style={{ ...s.alertDis, fontSize:13, marginLeft:6 }} onClick={() => setScreen("master")}>設定する</button></div>}
            {!bankLine(draft.issuer.bank) && <div style={{ ...s.alertBox, display:"block", marginTop:0, marginBottom:10, fontSize:13 }}>振込先の口座が未設定です。マスター設定で入れると請求書に出ます。</div>}
            <div style={{ border:"1px solid #e8ecf3", borderRadius:12, overflow:"hidden", marginBottom:16 }}><InvoiceSheet inv={draft} /></div>
            <div style={{ display:"flex", gap:10 }}>
              <button style={s.btnS} onClick={() => setStep(2)}>‹ 直す</button>
              <button style={{ ...s.btnP, flex:1, fontSize:15 }} onClick={doIssue}>✦ 発行する</button>
            </div>
            <div style={{ ...s.hint13, marginTop:8 }}>発行すると番号が決まり、売上に「未入金」で入ります。そのあと「PDFで出す」を押してください。</div>
          </>)}
        </div>
      )}
    </div>
  );
}

// ── 相手先 SCREEN ─────────────────────────────────────────────────────────────
function PartnersScreen({ master, setMaster, sales, setSales, expenses, setExpenses, invoices, showToast, setScreen }) {
  const [editing, setEditing] = useState(null);   // null | 相手先オブジェクト（id:null は新規）
  const [q, setQ] = useState("");
  const [err, setErr] = useState({});
  const cps = master.counterparties;
  const usage = (c) => ({
    s: sales.filter(r => r.client === c.name).length,
    e: expenses.filter(r => r.client === c.name).length,
    i: invoices.filter(v => v.cpId === c.id || v.client === c.name).length,
  });
  const list = cps.filter(c => !q.trim() || c.name.toLowerCase().includes(q.trim().toLowerCase()));
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
    <div className="screen-wrap" style={s.screenWrap}>
      <div style={{ ...s.pageHeader, flexWrap:"wrap", gap:10 }}>
        <div style={s.pageTitle}>相手先</div>
        <div style={{ display:"flex", gap:8 }}>
          <button style={s.btnS} onClick={() => setScreen("invoice")}>請求書へ</button>
          <button style={s.btnP} onClick={openNew}>＋ 新しく足す</button>
        </div>
      </div>
      <div style={{ ...s.hint13, marginBottom:12 }}>売上・経費・請求書で使う相手（お客さん・仕入れ先など）です。ここに入れておくと、名前の一部を打つだけで選べます。</div>

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

      <input style={{ ...s.inp, marginBottom:10, maxWidth:360, fontSize:14 }} value={q} onChange={e => setQ(e.target.value)} placeholder="🔍 名前でさがす" />
      <div style={{ background:"#fff", border:"1px solid #e8ecf3", borderRadius:12, overflow:"hidden" }}>
        {list.length === 0 && <div style={{ padding:24, textAlign:"center", color:"#999", fontSize:14 }}>{cps.length ? "見つかりません" : "まだ相手先はありません。「＋ 新しく足す」から入れてください。"}</div>}
        {list.map(c => {
          const u = usage(c);
          return (
            <div key={c.id} style={{ display:"flex", flexWrap:"wrap", gap:"6px 12px", alignItems:"center", padding:"12px 14px", borderBottom:"1px solid #f2f4f9" }}>
              <div style={{ flex:"1 1 240px", minWidth:0 }}>
                <div style={{ fontSize:15, fontWeight:700, color:"#222", wordBreak:"break-all" }}>
                  {c.name} <span style={{ fontWeight:400, color:"#888", fontSize:13 }}>{c.honorific}</span>
                  <span style={{ ...s.badge, fontSize:13, marginLeft:6, ...(c.kind==="支払い先"?s.bRed:c.kind==="両方"?s.bAmber:s.bGreen) }}>{c.kind || "売り先"}</span>
                  {c.sample && <span style={{ ...s.badge, fontSize:13, marginLeft:6, background:"#FFF7E0", color:"#5C4300" }}>見本</span>}
                </div>
                <div style={{ fontSize:13, color:"#888", wordBreak:"break-all" }}>{[c.terms, c.addr].filter(Boolean).join(" / ")}{c.regNo && <span style={{ whiteSpace:"nowrap", marginLeft:8 }}>登録番号 {c.regNo}</span>}</div>
                <div style={{ fontSize:13, color:"#aaa" }}>売上{u.s}件・経費{u.e}件・請求書{u.i}件</div>
              </div>
              <div style={{ display:"flex", gap:6, marginLeft:"auto" }}>
                <button style={{ ...s.btnS, fontSize:13, padding:"8px 14px" }} onClick={() => openEdit(c)}>直す</button>
                <button style={{ ...s.delBtn, fontSize:13, padding:"8px 12px" }} onClick={() => remove(c)}>消す</button>
              </div>
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
    <div className="screen-wrap" style={s.screenWrap}>
      <div style={s.pageHeader}>
        <div style={s.pageTitle}>マスター設定</div>
        <button style={s.btnP} onClick={saveMaster}>保存する</button>
      </div>

      <div style={{ display:"flex", gap:8, marginBottom:16 }}>
        {[["company","会社情報"],["accounts","勘定科目"]].map(([id,label]) => (
          <button key={id} style={{ ...s.taxBtn, ...(tab===id?s.taxActive:{}), border:"1px solid", borderColor:tab===id?"#1a6fd4":"#dce3f0", borderRadius:8, padding:"8px 16px", fontSize:13 }} onClick={() => setTab(id)}>{label}</button>
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
    <div data-label={label} style={{ display:"flex", flexDirection:"column", gap:4 }}>
      <div style={{ fontSize:13, color:"#666", fontWeight:600, display:"flex", alignItems:"center", gap:6 }}>
        {label}
        {hint && <span style={{ width:16,height:16,borderRadius:8,background:"#e8f0fb",color:"#1a6fd4",fontSize:10,fontWeight:700,display:"inline-flex",alignItems:"center",justifyContent:"center",cursor:"pointer" }} onClick={()=>setShow(v=>!v)}>?</span>}
      </div>
      {show && hint && <div style={{ fontSize:11,color:"#1a6fd4",background:"#e8f0fb",borderRadius:6,padding:"6px 10px",lineHeight:1.7,whiteSpace:"pre-line" }}>{hint}</div>}
      {children}
    </div>
  );
}

// ── STYLES ────────────────────────────────────────────────────────────────────
const s = {
  screenWrap:   { padding:"28px 28px 60px" },
  pageHeader:   { display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 },
  pageTitle:    { fontSize:22, fontWeight:800, color:"#111", letterSpacing:-0.5 },
  statCard:     { background:"#fff", border:"1px solid #e8ecf3", borderRadius:12, padding:"16px 18px", boxShadow:"0 1px 4px rgba(0,0,0,0.04)" },
  statLabel:    { fontSize:11, color:"#999", marginBottom:6, fontWeight:600 },
  taxSwitch:    { display:"flex", background:"#f0f0f0", borderRadius:6, padding:2, gap:2 },
  taxBtn:       { padding:"5px 14px", borderRadius:4, fontSize:12, border:"none", background:"transparent", color:"#888", cursor:"pointer" },
  taxActive:    { background:"#fff", color:"#1a6fd4", fontWeight:700 },
  formCard:     { background:"#fff", border:"1px solid #dce3f0", borderRadius:12, padding:20, marginBottom:16 },
  formTitle:    { fontSize:14, fontWeight:700, color:"#111", marginBottom:14 },
  formGrid:     { display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12 },
  inp:          { width:"100%", border:"1px solid #dce3f0", borderRadius:7, padding:"8px 10px", fontSize:13, background:"#fafbfd", outline:"none", boxSizing:"border-box" },
  aiSug:        { marginTop:5, fontSize:11, color:"#0F6E56", background:"#E1F5EE", borderRadius:6, padding:"5px 10px" },
  alertBox:     { marginTop:10, background:"#FAEEDA", border:"1px solid #EF9F27", borderRadius:8, padding:"10px 14px", fontSize:12, color:"#633806", display:"flex", alignItems:"center", justifyContent:"space-between" },
  alertDis:     { fontSize:11, color:"#854F0B", background:"#fff", border:"1px solid #EF9F27", borderRadius:5, padding:"3px 10px", cursor:"pointer" },
  formBtns:     { display:"flex", gap:10, marginTop:14, justifyContent:"flex-end" },
  btnP:         { padding:"9px 22px", borderRadius:8, border:"none", background:"#1a6fd4", color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer" },
  btnS:         { padding:"9px 16px", borderRadius:8, border:"1px solid #dce3f0", background:"#fff", color:"#555", fontSize:13, cursor:"pointer" },
  delBtn:       { border:"1px solid #e3c9c9", background:"#fff", color:"#A32D2D", borderRadius:6, padding:"4px 10px", fontSize:11, cursor:"pointer" },
  tblWrap:      { background:"#fff", border:"1px solid #e8ecf3", borderRadius:12, overflow:"hidden", marginBottom:14 },
  tbl:          { width:"100%", borderCollapse:"collapse" },
  th:           { background:"#f7f9fc", fontSize:11, fontWeight:600, color:"#aaa", padding:"9px 12px", borderBottom:"1px solid #edf0f7", textAlign:"right", whiteSpace:"nowrap" },
  td:           { fontSize:12, color:"#333", padding:"10px 12px", borderBottom:"1px solid #f2f4f9", whiteSpace:"nowrap" },
  tr:           { transition:"background 0.1s" },
  badge:        { display:"inline-block", fontSize:10, padding:"2px 8px", borderRadius:10, fontWeight:600 },
  bGreen:       { background:"#EAF3DE", color:"#3B6D11" },
  bAmber:       { background:"#FAEEDA", color:"#854F0B" },
  bRed:         { background:"#FCEBEB", color:"#A32D2D" },
  paidBtn:      { fontSize:11, padding:"4px 12px", borderRadius:5, border:"1px solid #9FE1CB", background:"#E1F5EE", color:"#0F6E56", cursor:"pointer", fontWeight:600, whiteSpace:"nowrap" },
  plWrap:       { background:"#fff", border:"1px solid #e8ecf3", borderRadius:12, overflow:"hidden", marginBottom:16 },
  plHdr:        { background:"#f7f9fc", padding:"12px 16px", borderBottom:"1px solid #edf0f7", display:"flex", justifyContent:"space-between", alignItems:"center", fontSize:13, fontWeight:600, color:"#333" },
  plRow:        { display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 16px", borderBottom:"1px solid #f2f4f9" },
  secTitle:     { fontSize:14, fontWeight:700, color:"#333", marginBottom:8 },
  secTitleSub:  { fontSize:12, fontWeight:600, color:"#aaa", marginBottom:8, marginTop:14 },
  pickList:     { position:"absolute", top:"100%", left:0, right:0, zIndex:50, marginTop:4, background:"#fff", border:"1px solid #dce3f0", borderRadius:8, boxShadow:"0 6px 20px rgba(0,0,0,0.12)", maxHeight:280, overflowY:"auto" },
  pickItem:     { display:"flex", alignItems:"center", flexWrap:"wrap", width:"100%", textAlign:"left", padding:"11px 12px", border:"none", borderBottom:"1px solid #f2f4f9", background:"#fff", fontSize:14, color:"#222", cursor:"pointer", minHeight:44 },
  hint13:       { fontSize:13, color:"#888", lineHeight:1.7 },
  errText:      { fontSize:13, color:"#A32D2D", marginTop:4 },
};

const css = `
  *{box-sizing:border-box;}
  button:hover{opacity:0.82;}
  tr:hover td{background:#f8faff!important;}
  input:focus,select:focus{border-color:#1a6fd4!important;outline:none;}
  .sidebar select:focus{border-color:rgba(255,255,255,0.4)!important;}
  ::-webkit-scrollbar{width:5px;height:5px;}
  ::-webkit-scrollbar-thumb{background:#ddd;border-radius:3px;}
  .sidebar{flex-shrink:0;}

  .demo-bar{ display:flex; flex-wrap:wrap; align-items:center; gap:10px 16px; padding:12px 24px; background:#FFF7E0; border-bottom:1px solid #F0DCA0; color:#5C4300; font-size:13px; line-height:1.6; }
  .demo-bar button{ border:1px solid #C9A227; background:#fff; color:#5C4300; border-radius:8px; padding:8px 14px; font-size:13px; font-weight:700; cursor:pointer; }

  @media(max-width:768px){
    .sidebar{ display:none !important; }
    .bottom-nav{ display:flex !important; }
    .main-area{ margin-left:0 !important; padding-bottom:calc(58px + env(safe-area-inset-bottom,0px)); }
    .screen-wrap{ padding:18px 14px 32px !important; }
    .demo-bar{ padding:12px 14px; }
    .kpi-row{ flex-direction:column; }
    .charts-row{ grid-template-columns:1fr !important; }
    .quick-grid{ grid-template-columns:repeat(4,1fr) !important; gap:8px !important; }
    .form-grid{ grid-template-columns:1fr !important; }
    .inv-grid{ grid-template-columns:1fr 1fr !important; }
    .item-grid{ grid-template-columns:1fr 1fr !important; }
    .item-desc{ grid-column:1 / -1; }
    .master-grid{ grid-template-columns:1fr !important; }
    /* 入力欄が16px未満だと、iPhoneでは触るたびに画面が勝手に拡大する */
    input, select, textarea{ font-size:16px !important; min-height:44px; }
    .tbl-wrap{ overflow-x:auto !important; -webkit-overflow-scrolling:touch; }
    /* スマホの一覧は、日付・相手先・区分・金額・状態だけ見せる（反映月・税率・備考は隠す） */
    .t-sales th:nth-child(2), .t-sales td:nth-child(2), .t-sales th:nth-child(4), .t-sales td:nth-child(4), .t-sales th:nth-child(6), .t-sales td:nth-child(6), .t-sales th:nth-child(7), .t-sales td:nth-child(7),
    .t-exp th:nth-child(2), .t-exp td:nth-child(2), .t-exp th:nth-child(5), .t-exp td:nth-child(5), .t-exp th:nth-child(7), .t-exp td:nth-child(7){ display:none; }
    .t-sales th, .t-sales td, .t-exp th, .t-exp td{ padding-left:8px !important; padding-right:8px !important; }
  }
`;
