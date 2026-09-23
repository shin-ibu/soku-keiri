import { useState, useEffect } from "react";

const fmt = (n) => "¥" + Math.round(n || 0).toLocaleString("ja-JP") + "円";
const fmtEx = (n) => "¥" + Math.round((n || 0) / 1.1).toLocaleString("ja-JP") + "円";
const today = () => new Date().toISOString().split("T")[0];

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
  company: { name:"", type:"法人", established:"", capital:"", taxRate:25, fiscalMonth:4, fiscalNum:1, addr:"", tel:"", email:"", bankName:"", bankBranch:"", bankType:"普通", bankNo:"", bankHolder:"" },
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
  clients: [
    { id:1, name:"㈱〇〇商事", addr:"東京都渋谷区〇〇1-2-3", bankName:"〇〇銀行", bankBranch:"渋谷支店", bankType:"普通", bankNo:"1234567", bankHolder:"カ)マルマルショウジ" },
    { id:2, name:"□□デザイン", addr:"東京都新宿区△△4-5-6", bankName:"△△銀行", bankBranch:"新宿支店", bankType:"普通", bankNo:"7654321", bankHolder:"カクカクデザイン" },
  ],
};

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
          {[["🏢","複数会社の切り替えが一タップ"],["🔴","角印を自動捺印してPDF生成"],["📧","そのままメール送付も可能"],["📊","発行と同時に売掛・損益に自動反映"]].map(([ic,t],i) => (
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
    { id:"ar",       icon:"◎", label:"売掛・買掛" },
    { id:"cashflow", icon:"⇄", label:"資金繰り" },
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
  const saved = load();
  const [screen,      setScreen]      = useState("home");
  const [taxMode,     setTaxMode]     = useState("inc");
  const [sales,       setSales]       = useState(saved?.sales || DEMO_SALES);
  const [expenses,    setExpenses]    = useState(saved?.expenses || DEMO_EXP);
  const [master,      setMaster]      = useState(saved?.master || DEFAULT_MASTER);
  const [selMonth,    setSelMonth]    = useState("2025年5月");
  const [toast,       setToast]       = useState(null);
  const [modal,       setModal]       = useState(null);
  const [opInvoice,   setOpInvoice]   = useState(false);
  const [showOPModal, setShowOPModal] = useState(false);

  useEffect(() => { saveAll({ sales, expenses, master }); }, [sales, expenses, master]);
  const showToast = (msg, type="success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  const fiscalMonths = getFiscalMonths(master.company.fiscalMonth || 4, getFiscalYear(master.company.fiscalMonth || 4, master.company.fiscalNum || 1));

  const curSales    = sales.filter(s => s.month === selMonth);
  const curExp      = expenses.filter(e => e.month === selMonth);
  const totalSales  = curSales.reduce((s,r) => s + r.amount, 0);
  const totalExp    = curExp.reduce((s,r) => s + r.amount, 0);
  const genka       = curExp.filter(e => e.account === "売上原価").reduce((s,r) => s + r.amount, 0);
  const sga         = curExp.filter(e => e.account !== "売上原価").reduce((s,r) => s + r.amount, 0);
  const grossProfit = totalSales - genka;
  const opProfit    = grossProfit - sga;
  const taxRate     = master.company.taxRate || 25;
  const taxAmt      = Math.round(opProfit * taxRate / 100);
  const netProfit   = opProfit - taxAmt;
  const ar          = sales.filter(s => s.status === "未入金").reduce((s,r) => s + r.amount, 0);
  const ap          = expenses.filter(e => e.status === "未払い").reduce((s,r) => s + r.amount, 0);
  const val         = (n) => taxMode === "inc" ? fmt(n) : fmtEx(n);

  const shared = { screen, setScreen, taxMode, setTaxMode, sales, setSales, expenses, setExpenses, master, setMaster, selMonth, setSelMonth, totalSales, totalExp, grossProfit, opProfit, taxAmt, netProfit, ar, ap, val, curSales, curExp, showToast, genka, sga, setModal, opInvoice, showOPModal: () => setShowOPModal(true), fiscalMonths, taxRate };
  const Screens = { home:HomeScreen, sales:SalesScreen, expenses:ExpenseScreen, pl:PLScreen, ar:ARScreen, cashflow:CashflowScreen, invoice:InvoiceScreen, master:MasterScreen };
  const Screen = Screens[screen] || HomeScreen;

  return (
    <div style={{ fontFamily:"'Hiragino Sans','Noto Sans JP',sans-serif", fontSize:13, display:"flex", minHeight:"100vh" }}>
      <style>{css}</style>
      {toast && <div style={{ position:"fixed", top:16, right:16, zIndex:300, padding:"10px 16px", borderRadius:8, border:"1px solid", fontSize:13, fontWeight:500, background:toast.type==="error"?"#FCEBEB":"#EAF3DE", color:toast.type==="error"?"#A32D2D":"#27500A", borderColor:toast.type==="error"?"#F09595":"#97C459" }}>{toast.type==="error"?"⚠ ":"✓ "}{toast.msg}</div>}
      <DrillModal modal={modal} onClose={() => setModal(null)} />
      {showOPModal && <OPModal onClose={() => setShowOPModal(false)} onContract={() => { setOpInvoice(true); setShowOPModal(false); setScreen("invoice"); showToast("請求書オプションを契約しました！"); }} />}
      <Sidebar screen={screen} setScreen={setScreen} taxMode={taxMode} setTaxMode={setTaxMode} opInvoice={opInvoice} showOPModal={() => setShowOPModal(true)} master={master} selMonth={selMonth} setSelMonth={setSelMonth} fiscalMonths={fiscalMonths} />
      <div className="main-area" style={{ marginLeft:240, flex:1, background:"#f4f6fb", minHeight:"100vh", overflowX:"hidden" }}>
        <Screen {...shared} />
      </div>
      <BottomNav screen={screen} setScreen={setScreen} opInvoice={opInvoice} showOPModal={() => setShowOPModal(true)} />
    </div>
  );
}

// ── HOME ──────────────────────────────────────────────────────────────────────
function HomeScreen({ setScreen, totalSales, totalExp, opProfit, netProfit, ar, ap, val, sales, expenses, selMonth, setModal, curSales, curExp, grossProfit, taxAmt, genka, sga, taxRate, fiscalMonths, master }) {
  const arCount = sales.filter(s=>s.status==="未入金").length;
  const apCount = expenses.filter(e=>e.status==="未払い").length;
  const fiscalIdx = fiscalMonths.indexOf(selMonth);
  const fiscalLabel = fiscalIdx >= 0 ? `第${master.company.fiscalNum || 1}期 ${fiscalIdx+1}ヶ月目` : "";

  // chart data (6 months)
  const ms6 = fiscalMonths.slice(0, 6);
  const salesData  = ms6.map(m => sales.filter(r=>r.month===m).reduce((s,r)=>s+r.amount,0));
  const expData    = ms6.map(m => expenses.filter(r=>r.month===m).reduce((s,r)=>s+r.amount,0));
  const profitData = salesData.map((v,i) => v - expData[i]);

  // 4 gradient cards + 2 plain cards
  const gradKpis = [
    { label:"今月売上",   v:val(totalSales), sub:`${curSales.length}件`,            grad:"linear-gradient(135deg,#1a6fd4,#4a9fe4)", modal:{ title:`${selMonth}　売上合計`,   amount:val(totalSales), color:"#1a6fd4", rows:curSales.map(r=>({ "日付":r.date,"相手先":r.client,"金額":val(r.amount),"状態":r.status })), note:`${curSales.length}件の合計です。` }},
    { label:"今月経費",   v:val(totalExp),   sub:`${curExp.length}件`,              grad:"linear-gradient(135deg,#EF9F27,#f4c05a)", modal:{ title:`${selMonth}　経費合計`,   amount:val(totalExp),   color:"#EF9F27", formula:`売上原価 ${val(genka)}\n＋ 販管費 ${val(sga)}\n＝ 経費合計 ${val(totalExp)}`, rows:curExp.map(r=>({ "相手先":r.client,"科目":r.account,"金額":val(r.amount) })) }},
    { label:"営業利益",   v:val(opProfit),   sub:`利益率 ${totalSales?Math.round(opProfit/totalSales*100):0}%`, grad:"linear-gradient(135deg,#0F6E56,#2ecc8f)", modal:{ title:"営業利益", amount:val(opProfit), color:"#0F6E56", formula:`売上高 ${val(totalSales)}\nー 売上原価 ${val(genka)}\n＝ 粗利 ${val(grossProfit)}\nー 販管費 ${val(sga)}\n＝ 営業利益 ${val(opProfit)}`, note:"本業で稼いだ利益です。" }},
    { label:"売掛残高",   v:val(ar),         sub:`${arCount}件 未入金`,             grad:"linear-gradient(135deg,#854F0B,#c47a2e)", modal:{ title:"売掛残高",               amount:val(ar),         color:"#854F0B", rows:sales.filter(s=>s.status==="未入金").map(r=>({ "相手先":r.client,"反映月":r.month,"金額":val(r.amount) })), note:`${arCount}件が未入金です。` }},
  ];
  const plainKpis = [
    { label:"予定経常利益", v:val(netProfit), color:netProfit>=0?"#0F6E56":"#A32D2D", sub:`納税${taxRate}%控除後`, modal:{ title:"予定経常利益", amount:val(netProfit), color:"#0F6E56", formula:`営業利益 ${val(opProfit)}\nー 予定納税（${taxRate}%） ${val(taxAmt)}\n＝ 予定経常利益 ${val(netProfit)}` }},
    { label:"買掛残高",     v:val(ap),        color:"#A32D2D",                        sub:`${apCount}件 未払い`,    modal:{ title:"買掛残高",               amount:val(ap),         color:"#A32D2D", rows:expenses.filter(e=>e.status==="未払い").map(r=>({ "相手先":r.client,"科目":r.account,"金額":val(r.amount) })), note:`${apCount}件が未払いです。` }},
  ];

  return (
    <div style={{ padding:"24px 24px 40px" }}>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
        <div>
          <div style={{ fontSize:22, fontWeight:800, color:"#111", letterSpacing:-0.5 }}>ダッシュボード</div>
          {fiscalLabel && <div style={{ fontSize:12, color:"#aaa", marginTop:2 }}>{selMonth}　{fiscalLabel}</div>}
        </div>
        <div style={{ fontSize:12, color:"#bbb" }}>{master.company.name || "会社名未設定"}</div>
      </div>

      {/* KPI row: 4 gradient + 2 plain */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr) repeat(2,1fr)", gap:12, marginBottom:20 }}>
        {gradKpis.map((c,i) => (
          <div key={i} style={{ background:c.grad, borderRadius:16, padding:"18px 16px", boxShadow:"0 4px 16px rgba(0,0,0,0.12)", position:"relative", overflow:"hidden" }}>
            <div style={{ position:"absolute", right:-14, top:-14, width:80, height:80, borderRadius:"50%", background:"rgba(255,255,255,0.08)" }}/>
            <div style={{ fontSize:10, color:"rgba(255,255,255,0.75)", fontWeight:700, marginBottom:10, letterSpacing:0.3 }}>{c.label}</div>
            <N v={c.v} modal={c.modal} setModal={setModal} style={{ fontSize:18, fontWeight:900, color:"#fff", display:"block", marginBottom:6, letterSpacing:-0.5, whiteSpace:"nowrap" }} />
            <div style={{ fontSize:10, color:"rgba(255,255,255,0.6)" }}>{c.sub}</div>
          </div>
        ))}
        {plainKpis.map((c,i) => (
          <div key={i} style={{ background:"#fff", border:"1px solid #e8ecf3", borderRadius:16, padding:"18px 16px", boxShadow:"0 1px 4px rgba(0,0,0,0.04)" }}>
            <div style={{ fontSize:10, color:"#999", fontWeight:700, marginBottom:10 }}>{c.label}</div>
            <N v={c.v} modal={c.modal} setModal={setModal} style={{ fontSize:18, fontWeight:900, color:c.color, display:"block", marginBottom:6, letterSpacing:-0.5, whiteSpace:"nowrap" }} />
            <div style={{ fontSize:10, color:"#bbb" }}>{c.sub}</div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:16, marginBottom:20 }}>
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
      <div style={{ display:"grid", gridTemplateColumns:"repeat(6,1fr)", gap:10 }}>
        {[
          { id:"sales",    icon:"↑", label:"売上入力",   bg:"#E1F5EE", ic:"#0F6E56" },
          { id:"expenses", icon:"↓", label:"経費入力",   bg:"#FAECE7", ic:"#993C1D" },
          { id:"pl",       icon:"≡", label:"損益計算書", bg:"#E6F1FB", ic:"#185FA5" },
          { id:"ar",       icon:"◎", label:"売掛・買掛", bg:"#FAEEDA", ic:"#854F0B" },
          { id:"cashflow", icon:"⇄", label:"資金繰り",   bg:"#EEEDFE", ic:"#534AB7" },
          { id:"master",   icon:"⚙", label:"マスター",   bg:"#f0f0f0", ic:"#555"    },
        ].map(m => (
          <button key={m.id} style={{ background:"#fff", border:"1px solid #e8ecf3", borderRadius:14, padding:"14px 8px", textAlign:"center", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:7, boxShadow:"0 1px 3px rgba(0,0,0,0.04)" }} onClick={() => setScreen(m.id)}>
            <div style={{ width:40, height:40, borderRadius:10, background:m.bg, color:m.ic, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, fontWeight:700 }}>{m.icon}</div>
            <div style={{ fontSize:11, fontWeight:700, color:"#333" }}>{m.label}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── SALES ─────────────────────────────────────────────────────────────────────
function SalesScreen({ setScreen, taxMode, setTaxMode, sales, setSales, selMonth, setSelMonth, val, showToast, curSales, setModal, opInvoice, showOPModal, master, fiscalMonths }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ date:today(), month:selMonth, type:"売掛", client:"", amount:"", tax:10, memo:"", status:"未入金" });
  const [showAlert, setShowAlert] = useState(false);
  const sf = (k,v) => setForm(f=>({...f,[k]:v}));
  const clientOptions = master.clients.map(c=>c.name);
  const onAmountBlur = () => {
    if (!form.amount || curSales.length===0) return;
    const avg = curSales.reduce((s,r)=>s+r.amount,0)/curSales.length;
    if (Number(form.amount)>avg*3||Number(form.amount)<avg*0.2) setShowAlert(true);
  };
  const doSave = () => {
    if (!form.client||!form.amount) { showToast("相手先と金額は必須です","error"); return; }
    setSales(p=>[...p,{ ...form,id:Date.now(),amount:Number(form.amount) }]);
    setShowForm(false); setForm({ date:today(),month:selMonth,type:"売掛",client:"",amount:"",tax:10,memo:"",status:"未入金" });
    showToast("売上を保存しました");
  };
  const markPaid = (id) => { setSales(p=>p.map(r=>r.id===id?{...r,status:"入金済"}:r)); showToast("入金済みにしました"); };
  const total = curSales.reduce((s,r)=>s+r.amount,0);
  return (
    <div style={s.screenWrap}>
      <div style={s.pageHeader}><div style={s.pageTitle}>売上入力</div><button style={s.btnP} onClick={()=>setShowForm(true)}>＋ 新規入力</button></div>
      <MonthBar selMonth={selMonth} setSelMonth={setSelMonth} fiscalMonths={fiscalMonths} />
      {showForm && (
        <div style={s.formCard}>
          <div style={s.formTitle}>売上を入力する</div>
          <div style={s.formGrid}>
            <FR label="日付"><input type="date" style={s.inp} value={form.date} onChange={e=>sf("date",e.target.value)} /></FR>
            <FR label="反映月" hint={"この売上は何月の仕事ですか？\n例）3月納品 → 3月　4月に請求しても3月と入力"}>
              <select style={s.inp} value={form.month} onChange={e=>sf("month",e.target.value)}>{fiscalMonths.map(m=><option key={m}>{m}</option>)}</select>
            </FR>
            <FR label="区分"><select style={s.inp} value={form.type} onChange={e=>sf("type",e.target.value)}>{["現金","売掛","カード"].map(t=><option key={t}>{t}</option>)}</select></FR>
            <FR label="相手先">
              <select style={s.inp} value={form.client} onChange={e=>sf("client",e.target.value)}>
                <option value="">選択または直接入力</option>
                {clientOptions.map(c=><option key={c}>{c}</option>)}
              </select>
            </FR>
            <FR label="金額（税込）"><input type="number" style={s.inp} value={form.amount} onChange={e=>sf("amount",e.target.value)} onBlur={onAmountBlur} placeholder="110000" /></FR>
            <FR label="税率"><select style={s.inp} value={form.tax} onChange={e=>sf("tax",Number(e.target.value))}><option value={10}>10%（標準）</option><option value={8}>8%（軽減）</option><option value={0}>0%（非課税）</option></select></FR>
            <FR label="備考"><input style={s.inp} value={form.memo} onChange={e=>sf("memo",e.target.value)} placeholder="Web制作費 5月分など" /></FR>
          </div>
          {showAlert && <div style={s.alertBox}>⚠ 先月の平均と大きく異なります。金額を確認してください。<button style={s.alertDis} onClick={()=>setShowAlert(false)}>確認しました</button></div>}
          <div style={s.formBtns}><button style={s.btnS} onClick={()=>setShowForm(false)}>キャンセル</button><button style={s.btnP} onClick={doSave}>保存する</button></div>
        </div>
      )}
      <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:8, gap:6, alignItems:"center" }}>
        <span style={{ fontSize:12, color:"#aaa" }}>合計</span>
        <N v={val(total)} setModal={setModal} style={{ fontSize:16, fontWeight:800, color:"#0F6E56" }} modal={{ title:`${selMonth}　売上合計`, amount:val(total), color:"#0F6E56", rows:curSales.map(r=>({ "日付":r.date,"相手先":r.client,"区分":r.type,"金額":val(r.amount),"状態":r.status })) }} />
      </div>
      <div style={s.tblWrap}>
        <table style={s.tbl}>
          <thead><tr>{["日付","反映月","相手先","区分","金額","税率","備考","状態",""].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead>
          <tbody>
            {curSales.length===0 ? <tr><td colSpan={9} style={{ ...s.td, textAlign:"center", color:"#bbb", padding:32 }}>まだ売上データがありません</td></tr>
            : curSales.map(r=>(
              <tr key={r.id} style={s.tr}>
                <td style={s.td}>{r.date}</td><td style={s.td}>{r.month}</td>
                <td style={{ ...s.td, fontWeight:500 }}>{r.client}</td>
                <td style={s.td}><span style={{ ...s.badge, ...(r.type==="売掛"?s.bAmber:s.bGreen) }}>{r.type}</span></td>
                <td style={{ ...s.td, textAlign:"right" }}><N v={val(r.amount)} setModal={setModal} style={{ fontWeight:700, color:"#0F6E56" }} modal={{ title:`${r.client}への売上`, amount:val(r.amount), color:"#0F6E56", formula:`税込 ${fmt(r.amount)}${r.tax>0?`\n（税抜 ${fmtEx(r.amount)}）`:""}`, rows:[{ "相手先":r.client,"日付":r.date,"反映月":r.month,"区分":r.type,"備考":r.memo||"—","状態":r.status }] }} /></td>
                <td style={{ ...s.td, textAlign:"center" }}>{r.tax}%</td>
                <td style={{ ...s.td, color:"#aaa" }}>{r.memo}</td>
                <td style={s.td}><span style={{ ...s.badge, ...(r.status==="入金済"?s.bGreen:s.bAmber) }}>{r.status}</span></td>
                <td style={s.td}>{r.status==="未入金"&&<button style={s.paidBtn} onClick={()=>markPaid(r.id)}>入金済</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── EXPENSES ──────────────────────────────────────────────────────────────────
function ExpenseScreen({ expenses, setExpenses, selMonth, setSelMonth, val, showToast, curExp, setModal, master, fiscalMonths }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ date:today(), month:selMonth, type:"現金", client:"", account:"", amount:"", tax:10, memo:"", status:"未払い" });
  const [freeText, setFreeText] = useState("");
  const [suggestion, setSuggestion] = useState(null);
  const [showAlert, setShowAlert] = useState(false);
  const sf = (k,v) => setForm(f=>({...f,[k]:v}));
  const onFree = (v) => { setFreeText(v); const sug=getSuggestion(v); setSuggestion(sug); if(sug) sf("account",sug); };
  const onAmountBlur = () => {
    if (!form.amount||curExp.length===0) return;
    const avg = curExp.reduce((s,r)=>s+r.amount,0)/curExp.length;
    if (Number(form.amount)>avg*3||Number(form.amount)<avg*0.1) setShowAlert(true);
  };
  const doSave = () => {
    if (!form.client||!form.amount||!form.account) { showToast("相手先・科目・金額は必須です","error"); return; }
    setExpenses(p=>[...p,{ ...form,id:Date.now(),amount:Number(form.amount) }]);
    setShowForm(false); setFreeText(""); setSuggestion(null);
    setForm({ date:today(),month:selMonth,type:"現金",client:"",account:"",amount:"",tax:10,memo:"",status:"未払い" });
    showToast("経費を保存しました");
  };
  const markPaid = (id) => { setExpenses(p=>p.map(e=>e.id===id?{...e,status:"支払済"}:e)); showToast("支払済みにしました"); };
  const total = curExp.reduce((s,r)=>s+r.amount,0);
  const accountOptions = master.accounts.filter(a=>a.category!=="revenue");
  return (
    <div style={s.screenWrap}>
      <div style={s.pageHeader}><div style={s.pageTitle}>経費入力</div><button style={s.btnP} onClick={()=>setShowForm(true)}>＋ 新規入力</button></div>
      <MonthBar selMonth={selMonth} setSelMonth={setSelMonth} fiscalMonths={fiscalMonths} />
      {showForm && (
        <div style={s.formCard}>
          <div style={s.formTitle}>経費を入力する</div>
          <div style={s.formGrid}>
            <FR label="日付"><input type="date" style={s.inp} value={form.date} onChange={e=>sf("date",e.target.value)} /></FR>
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
            <FR label="区分"><select style={s.inp} value={form.type} onChange={e=>sf("type",e.target.value)}>{["現金","買掛","カード"].map(t=><option key={t}>{t}</option>)}</select></FR>
            <FR label="相手先"><input style={s.inp} value={form.client} onChange={e=>sf("client",e.target.value)} placeholder="〇〇ビルなど" /></FR>
            <FR label="金額（税込）"><input type="number" style={s.inp} value={form.amount} onChange={e=>sf("amount",e.target.value)} onBlur={onAmountBlur} placeholder="50000" /></FR>
            <FR label="税率"><select style={s.inp} value={form.tax} onChange={e=>sf("tax",Number(e.target.value))}><option value={10}>10%（標準）</option><option value={8}>8%（軽減）</option><option value={0}>0%（非課税）</option></select></FR>
          </div>
          {showAlert && <div style={s.alertBox}>⚠ 先月の平均と大きく異なります。金額を確認してください。<button style={s.alertDis} onClick={()=>setShowAlert(false)}>確認しました</button></div>}
          <div style={s.formBtns}><button style={s.btnS} onClick={()=>setShowForm(false)}>キャンセル</button><button style={s.btnP} onClick={doSave}>保存する</button></div>
        </div>
      )}
      <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:8, gap:6, alignItems:"center" }}>
        <span style={{ fontSize:12, color:"#aaa" }}>合計</span>
        <N v={val(total)} setModal={setModal} style={{ fontSize:16, fontWeight:800, color:"#A32D2D" }} modal={{ title:`${selMonth}　経費合計`, amount:val(total), color:"#A32D2D", rows:curExp.map(r=>({ "相手先":r.client,"科目":r.account,"金額":val(r.amount),"状態":r.status })) }} />
      </div>
      <div style={s.tblWrap}>
        <table style={s.tbl}>
          <thead><tr>{["日付","反映月","相手先","勘定科目","区分","金額","備考","状態",""].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead>
          <tbody>
            {curExp.length===0 ? <tr><td colSpan={9} style={{ ...s.td, textAlign:"center", color:"#bbb", padding:32 }}>まだ経費データがありません</td></tr>
            : curExp.map(r=>(
              <tr key={r.id} style={s.tr}>
                <td style={s.td}>{r.date}</td><td style={s.td}>{r.month}</td>
                <td style={{ ...s.td, fontWeight:500 }}>{r.client}</td>
                <td style={{ ...s.td, color:"#666" }}>{r.account}</td>
                <td style={s.td}><span style={{ ...s.badge, ...(r.type==="買掛"?s.bRed:s.bGreen) }}>{r.type}</span></td>
                <td style={{ ...s.td, textAlign:"right" }}><N v={val(r.amount)} setModal={setModal} style={{ fontWeight:700 }} modal={{ title:`${r.client} / ${r.account}`, amount:val(r.amount), formula:`税込 ${fmt(r.amount)}\n勘定科目：${r.account}\n区分：${r.type}`, rows:[{ "相手先":r.client,"日付":r.date,"反映月":r.month,"科目":r.account,"備考":r.memo||"—","状態":r.status }] }} /></td>
                <td style={{ ...s.td, color:"#aaa" }}>{r.memo}</td>
                <td style={s.td}><span style={{ ...s.badge, ...(r.status==="支払済"?s.bGreen:s.bRed) }}>{r.status}</span></td>
                <td style={s.td}>{r.status==="未払い"&&<button style={{ ...s.paidBtn, borderColor:"#f09595", color:"#A32D2D" }} onClick={()=>markPaid(r.id)}>支払済</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── PL ────────────────────────────────────────────────────────────────────────
function PLScreen({ selMonth, setSelMonth, val, totalSales, genka, grossProfit, sga, opProfit, taxAmt, netProfit, curSales, curExp, setModal, master, fiscalMonths, sales, expenses, taxRate }) {
  const [viewMode, setViewMode] = useState("monthly");
  const fiscalNum = master.company.fiscalNum || 1;
  const fiscalIdx = fiscalMonths.indexOf(selMonth);

  const annualSales = fiscalMonths.reduce((s,m)=>s+sales.filter(r=>r.month===m).reduce((a,r)=>a+r.amount,0),0);
  const annualExp   = fiscalMonths.reduce((s,m)=>s+expenses.filter(r=>r.month===m).reduce((a,r)=>a+r.amount,0),0);
  const annualGenka = fiscalMonths.reduce((s,m)=>s+expenses.filter(r=>r.month===m&&r.account==="売上原価").reduce((a,r)=>a+r.amount,0),0);
  const annualSga   = annualExp - annualGenka;
  const annualGross = annualSales - annualGenka;
  const annualOp    = annualGross - annualSga;
  const annualTax   = Math.round(annualOp * taxRate / 100);
  const annualNet   = annualOp - annualTax;

  const plRows = (tSales, gk, gross, sg, op, tx, net) => [
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
    { label:"営業利益",         v:op,     lv:0, color:op>0?"#185FA5":"#A32D2D", bold:true, hl:true },
    { label:`予定納税額（${taxRate}%）`, v:tx, lv:1, color:"#A32D2D" },
    { label:"予定経常利益",     v:net,    lv:0, color:net>0?"#0F6E56":"#A32D2D", bold:true, hl:true, big:true },
  ];

  const monthlyRows = plRows(totalSales, genka, grossProfit, sga, opProfit, taxAmt, netProfit);
  const annualRows  = plRows(annualSales, annualGenka, annualGross, annualSga, annualOp, annualTax, annualNet);
  const rows = viewMode==="annual" ? annualRows : monthlyRows;

  return (
    <div style={s.screenWrap}>
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
            <N v={(r.label.includes("予定納税")?"▲":"")+val(r.v)} setModal={setModal} modal={{ title:r.label, amount:val(r.v), color:r.color }} style={{ fontSize:r.big?18:14, fontWeight:r.bold?800:500, color:r.color||"#222" }} />
          </div>
        ))}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12 }}>
        {[
          { l:"粗利率",     v:(viewMode==="annual"?annualSales:totalSales)?Math.round((viewMode==="annual"?annualGross:grossProfit)/(viewMode==="annual"?annualSales:totalSales)*100)+"%":"—", c:"#185FA5" },
          { l:"営業利益率", v:(viewMode==="annual"?annualSales:totalSales)?Math.round((viewMode==="annual"?annualOp:opProfit)/(viewMode==="annual"?annualSales:totalSales)*100)+"%":"—", c:"#0F6E56" },
          { l:"経常利益率", v:(viewMode==="annual"?annualSales:totalSales)?Math.round((viewMode==="annual"?annualNet:netProfit)/(viewMode==="annual"?annualSales:totalSales)*100)+"%":"—", c:"#0F6E56" },
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
    <div style={s.screenWrap}>
      <div style={s.pageHeader}><div style={s.pageTitle}>売掛・買掛管理</div></div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
        <div>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
            <div style={s.secTitle}>売掛（未入金）</div>
            <N v={val(arT)} setModal={setModal} style={{ fontSize:16, fontWeight:800, color:"#854F0B" }} modal={{ title:"売掛残高", amount:val(arT), color:"#854F0B", rows:unpS.map(r=>({ "相手先":r.client,"反映月":r.month,"金額":val(r.amount) })) }} />
          </div>
          <div style={s.tblWrap}><table style={s.tbl}><thead><tr>{["相手先","金額","区分",""].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead><tbody>
            {unpS.length===0?<tr><td colSpan={4} style={{ ...s.td,textAlign:"center",color:"#bbb",padding:20 }}>✓ 未入金なし</td></tr>
            :unpS.map(r=><tr key={r.id} style={s.tr}><td style={{ ...s.td,fontWeight:500 }}>{r.client}</td><td style={{ ...s.td,textAlign:"right" }}><N v={val(r.amount)} setModal={setModal} style={{ fontWeight:700,color:"#854F0B" }} modal={{ title:`${r.client}　未入金`,amount:val(r.amount),color:"#854F0B",rows:[{ "相手先":r.client,"反映月":r.month,"区分":r.type,"備考":r.memo||"—" }],note:"「入金済」ボタンで消込できます。" }} /></td><td style={s.td}><span style={{ ...s.badge,...s.bAmber }}>{r.type}</span></td><td style={s.td}><button style={s.paidBtn} onClick={()=>mS(r.id)}>入金済</button></td></tr>)}
          </tbody></table></div>
          <div style={s.secTitleSub}>入金済（消込済）</div>
          <div style={s.tblWrap}><table style={s.tbl}><thead><tr>{["相手先","金額",""].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead><tbody>{paidS.map(r=><tr key={r.id} style={{ ...s.tr,opacity:0.5 }}><td style={s.td}>{r.client}</td><td style={{ ...s.td,textAlign:"right" }}>{val(r.amount)}</td><td style={s.td}><span style={{ ...s.badge,...s.bGreen }}>✓ 入金済</span></td></tr>)}</tbody></table></div>
        </div>
        <div>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
            <div style={{ ...s.secTitle,color:"#A32D2D" }}>買掛（未払い）</div>
            <N v={val(apT)} setModal={setModal} style={{ fontSize:16, fontWeight:800, color:"#A32D2D" }} modal={{ title:"買掛残高", amount:val(apT), color:"#A32D2D", rows:unpE.map(r=>({ "相手先":r.client,"科目":r.account,"金額":val(r.amount) })) }} />
          </div>
          <div style={s.tblWrap}><table style={s.tbl}><thead><tr>{["相手先","科目","金額",""].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead><tbody>
            {unpE.length===0?<tr><td colSpan={4} style={{ ...s.td,textAlign:"center",color:"#bbb",padding:20 }}>✓ 未払いなし</td></tr>
            :unpE.map(r=><tr key={r.id} style={s.tr}><td style={{ ...s.td,fontWeight:500 }}>{r.client}</td><td style={{ ...s.td,color:"#666" }}>{r.account}</td><td style={{ ...s.td,textAlign:"right" }}><N v={val(r.amount)} setModal={setModal} style={{ fontWeight:700,color:"#A32D2D" }} modal={{ title:`${r.client}　未払い`,amount:val(r.amount),color:"#A32D2D",rows:[{ "相手先":r.client,"科目":r.account,"備考":r.memo||"—" }],note:"「支払済」ボタンで消込できます。" }} /></td><td style={s.td}><button style={{ ...s.paidBtn,borderColor:"#f09595",color:"#A32D2D" }} onClick={()=>mE(r.id)}>支払済</button></td></tr>)}
          </tbody></table></div>
          <div style={s.secTitleSub}>支払済（消込済）</div>
          <div style={s.tblWrap}><table style={s.tbl}><thead><tr>{["相手先","科目","金額"].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead><tbody>{paidE.map(r=><tr key={r.id} style={{ ...s.tr,opacity:0.5 }}><td style={s.td}>{r.client}</td><td style={{ ...s.td,color:"#666" }}>{r.account}</td><td style={{ ...s.td,textAlign:"right" }}>{val(r.amount)}</td></tr>)}</tbody></table></div>
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
    <div style={s.screenWrap}>
      <div style={s.pageHeader}><div style={s.pageTitle}>資金繰り表</div><button style={s.btnS}>CSV出力</button></div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:16 }}>
        {[
          { l:"最新月末残高", v:bal[bal.length-1]||0, c:"#0F6E56", mo:mkBal(ms6.length-1) },
          { l:"直近入金合計", v:dIn[dIn.length-1]||0, c:"#185FA5", mo:mkIn(ms6.length-1) },
          { l:"直近支払合計", v:dOut[dOut.length-1]||0, c:"#333", mo:mkOut(ms6.length-1) },
          { l:"直近当月収支", v:(dIn[dIn.length-1]||0)-(dOut[dOut.length-1]||0), c:"#0F6E56", mo:mkBal(ms6.length-1) },
        ].map((c,i)=><div key={i} style={s.statCard}><div style={s.statLabel}>{c.l}</div><N v={val(c.v)} setModal={setModal} modal={c.mo} style={{ color:c.c,fontSize:20,fontWeight:800,display:"block",marginTop:4 }} /></div>)}
      </div>
      <div style={s.tblWrap}>
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

// ── INVOICE SCREEN ────────────────────────────────────────────────────────────
function InvoiceScreen({ screen, setScreen, opInvoice, showOPModal, master, sales, setSales, showToast, setModal, val }) {
  const companies = [
    { id:"a", name: master.company.name||"自社", addr:master.company.addr||"", bank:`${master.company.bankName||""} ${master.company.bankBranch||""} ${master.company.bankType||""} ${master.company.bankNo||""}`, stamp:(master.company.name||"自")[0] },
  ];
  const [step,setStep]=useState(1);
  const [selCo,setSelCo]=useState(companies[0]);
  const [form,setForm]=useState({ client:"",issueDate:today(),dueDate:"",subject:"" });
  const [items,setItems]=useState([{ desc:"",qty:1,unit:"式",price:0 }]);
  const [taxRate2,setTaxRate2]=useState(10);
  const [memo,setMemo]=useState("");
  const [completed,setCompleted]=useState(false);
  const [invNum]=useState("INV-0026");
  const sf=(k,v)=>setForm(f=>({...f,[k]:v}));
  const setItem=(i,k,v)=>setItems(p=>p.map((it,idx)=>idx===i?{...it,[k]:v}:it));
  const addItem=()=>setItems(p=>[...p,{ desc:"",qty:1,unit:"式",price:0 }]);
  const removeItem=(i)=>{ if(items.length>1) setItems(p=>p.filter((_,idx)=>idx!==i)); };
  const subtotal=items.reduce((s,it)=>s+Number(it.qty||0)*Number(it.price||0),0);
  const tax2=Math.round(subtotal*taxRate2/100);
  const total=subtotal+tax2;
  const clientOptions = master.clients.map(c=>c.name);
  const doComplete=()=>{
    setSales(p=>[...p,{ id:Date.now(),date:form.issueDate,month:`${new Date(form.issueDate).getFullYear()}年${new Date(form.issueDate).getMonth()+1}月`,type:"売掛",client:form.client,amount:total,tax:taxRate2,memo:form.subject,status:"未入金" }]);
    setCompleted(true); showToast("請求書を発行しました。売掛・損益に自動反映されました。");
  };
  const doReset=()=>{ setStep(1);setCompleted(false);setForm({ client:"",issueDate:today(),dueDate:"",subject:"" });setItems([{ desc:"",qty:1,unit:"式",price:0 }]); };
  return (
    <div style={s.screenWrap}>
      <div style={s.pageHeader}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={s.pageTitle}>請求書作成</div>
          <span style={{ fontSize:11, fontWeight:700, color:"#1a6fd4", background:"#E6F1FB", borderRadius:10, padding:"2px 10px" }}>✦ OP</span>
        </div>
        {!completed&&<div style={{ display:"flex", gap:8, alignItems:"center" }}>{[1,2,3].map(n=><div key={n} style={{ display:"flex",alignItems:"center",gap:4 }}><div style={{ width:24,height:24,borderRadius:12,background:step>=n?"#1a6fd4":"#e8ecf3",color:step>=n?"#fff":"#aaa",fontSize:11,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center" }}>{n}</div><span style={{ fontSize:11,color:step===n?"#1a6fd4":"#bbb",fontWeight:step===n?700:400 }}>{["会社・基本情報","明細入力","プレビュー"][n-1]}</span>{n<3&&<span style={{ color:"#ddd",margin:"0 2px" }}>›</span>}</div>)}</div>}
      </div>
      {completed ? (
        <div style={{ maxWidth:480,margin:"40px auto",textAlign:"center" }}>
          <div style={{ width:72,height:72,borderRadius:36,background:"#EAF3DE",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 20px",fontSize:36 }}>✓</div>
          <div style={{ fontSize:20,fontWeight:700,marginBottom:8 }}>請求書を発行しました</div>
          <div style={{ fontSize:13,color:"#888",marginBottom:24,lineHeight:1.8 }}>{invNum}　{fmt(total)}<br/>{form.client} 宛</div>
          <div style={{ background:"#f7f9fc",borderRadius:12,padding:"16px 20px",marginBottom:20,textAlign:"left" }}>
            <div style={{ fontSize:11,color:"#aaa",marginBottom:10,fontWeight:600 }}>自動反映済み</div>
            {[["✓","売上入力シートに追加"],["✓","売掛管理に追加（未入金）"],["✓","損益計算書に反映"]].map(([ic,t],i)=><div key={i} style={{ display:"flex",alignItems:"center",gap:10,marginBottom:8 }}><span style={{ color:"#3B6D11",fontWeight:700 }}>{ic}</span><span style={{ fontSize:13,color:"#555" }}>{t}</span></div>)}
          </div>
          <div style={{ display:"flex",gap:10 }}>
            <button style={{ flex:1,padding:"11px",borderRadius:8,border:"1px solid #dce3f0",background:"#fff",color:"#555",fontSize:13,cursor:"pointer" }} onClick={doReset}>続けて作成</button>
            <button style={{ flex:1,padding:"11px",borderRadius:8,border:"none",background:"#1a6fd4",color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer" }} onClick={()=>setScreen("ar")}>売掛管理を確認</button>
          </div>
        </div>
      ) : step===1 ? (
        <div style={{ maxWidth:600,margin:"0 auto" }}>
          <div style={s.formCard}>
            <div style={s.formTitle}>請求元を選択</div>
            {companies.map(co=><div key={co.id} style={{ padding:"12px 14px",borderRadius:10,border:"2px solid #1a6fd4",background:"#E6F1FB",marginBottom:16 }}><div style={{ display:"flex",alignItems:"center",gap:10 }}><div style={{ width:32,height:32,borderRadius:6,background:"#1a6fd4",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700 }}>{co.stamp}</div><div><div style={{ fontSize:13,fontWeight:600 }}>{co.name}</div><div style={{ fontSize:11,color:"#6a9fd4" }}>{co.addr}</div></div></div></div>)}
            <div style={s.formTitle}>基本情報</div>
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}>
              <FR label="請求先">
                <select style={s.inp} value={form.client} onChange={e=>sf("client",e.target.value)}>
                  <option value="">選択してください</option>
                  {clientOptions.map(c=><option key={c}>{c}</option>)}
                </select>
              </FR>
              <FR label="請求日"><input type="date" style={s.inp} value={form.issueDate} onChange={e=>sf("issueDate",e.target.value)} /></FR>
              <FR label="支払期限"><input type="date" style={s.inp} value={form.dueDate} onChange={e=>sf("dueDate",e.target.value)} /></FR>
              <FR label="件名"><input style={s.inp} value={form.subject} onChange={e=>sf("subject",e.target.value)} placeholder="Webサイト制作費" /></FR>
            </div>
          </div>
          <div style={{ textAlign:"right" }}><button style={s.btnP} onClick={()=>setStep(2)} disabled={!form.client}>次へ：明細入力 ›</button></div>
        </div>
      ) : step===2 ? (
        <div style={{ maxWidth:600,margin:"0 auto" }}>
          <div style={s.formCard}>
            <div style={s.formTitle}>明細</div>
            {items.map((it,i)=>(
              <div key={i} style={{ border:"1px solid #e8ecf3",borderRadius:8,padding:"12px 14px",marginBottom:10,background:"#fafbfd" }}>
                <div style={{ display:"flex",justifyContent:"space-between",marginBottom:8 }}><span style={{ fontSize:12,fontWeight:600,color:"#888" }}>明細 {i+1}</span><button style={{ background:"none",border:"none",color:"#ccc",cursor:"pointer" }} onClick={()=>removeItem(i)}>✕</button></div>
                <div style={{ display:"grid",gridTemplateColumns:"2fr 1fr 1fr 2fr",gap:8 }}>
                  <FR label="品名"><input style={s.inp} value={it.desc} onChange={e=>setItem(i,"desc",e.target.value)} placeholder="Webサイト制作" /></FR>
                  <FR label="数量"><input type="number" style={s.inp} value={it.qty} onChange={e=>setItem(i,"qty",e.target.value)} /></FR>
                  <FR label="単位"><select style={s.inp} value={it.unit} onChange={e=>setItem(i,"unit",e.target.value)}>{["式","個","時間","日","月","回","件"].map(u=><option key={u}>{u}</option>)}</select></FR>
                  <FR label="単価"><input type="number" style={s.inp} value={it.price} onChange={e=>setItem(i,"price",e.target.value)} /></FR>
                </div>
                <div style={{ textAlign:"right",fontSize:12,color:"#888",marginTop:6 }}>小計：{fmt(Number(it.qty||0)*Number(it.price||0))}</div>
              </div>
            ))}
            <button style={{ width:"100%",padding:"10px",borderRadius:8,border:"1px dashed #c5d8f5",background:"#f0f6ff",color:"#1a6fd4",fontSize:13,fontWeight:600,cursor:"pointer",marginBottom:16 }} onClick={addItem}>＋ 明細を追加</button>
            <div style={{ background:"#f7f9fc",borderRadius:8,padding:"12px 14px" }}>
              <div style={{ display:"flex",justifyContent:"space-between",fontSize:13,color:"#888",marginBottom:6 }}><span>小計</span><span>{fmt(subtotal)}</span></div>
              <div style={{ display:"flex",justifyContent:"space-between",fontSize:13,color:"#888",marginBottom:8 }}>
                <span>消費税</span>
                <span style={{ display:"flex",alignItems:"center",gap:8 }}>
                  <select style={{ ...s.inp,width:120,height:28,fontSize:12 }} value={taxRate2} onChange={e=>setTaxRate2(Number(e.target.value))}><option value={10}>10%</option><option value={8}>8%</option><option value={0}>0%</option></select>
                  {fmt(tax2)}
                </span>
              </div>
              <div style={{ display:"flex",justifyContent:"space-between",fontSize:16,fontWeight:800,color:"#1a6fd4",borderTop:"1px solid #e8ecf3",paddingTop:8 }}><span>合計（税込）</span><span>{fmt(total)}</span></div>
            </div>
            <div style={{ marginTop:12 }}><FR label="備考"><input style={s.inp} value={memo} onChange={e=>setMemo(e.target.value)} placeholder="振込手数料はご負担ください" /></FR></div>
          </div>
          <div style={{ display:"flex",gap:10,justifyContent:"space-between" }}>
            <button style={s.btnS} onClick={()=>setStep(1)}>‹ 戻る</button>
            <button style={s.btnP} onClick={()=>setStep(3)}>プレビューを確認 ›</button>
          </div>
        </div>
      ) : (
        <div style={{ maxWidth:560,margin:"0 auto" }}>
          <div style={{ background:"#fff",border:"1px solid #e8ecf3",borderRadius:12,overflow:"hidden",marginBottom:16 }}>
            <div style={{ background:"#1a6fd4",padding:"14px 18px",display:"flex",justifyContent:"space-between",alignItems:"center" }}>
              <div style={{ fontSize:16,fontWeight:700,color:"#fff",letterSpacing:4 }}>請　求　書</div>
              <div style={{ fontSize:12,color:"#aad0f5" }}>{invNum}</div>
            </div>
            <div style={{ padding:"16px 18px" }}>
              <div style={{ display:"flex",justifyContent:"space-between",marginBottom:16 }}>
                <div><div style={{ fontSize:16,fontWeight:700 }}>{form.client} 御中</div><div style={{ fontSize:12,color:"#888",marginTop:4,lineHeight:1.8 }}>発行日：{form.issueDate}{form.dueDate&&<><br/>支払期限：{form.dueDate}</>}</div></div>
                <div style={{ textAlign:"right" }}>
                  <div style={{ width:44,height:44,borderRadius:22,border:"2px solid #A32D2D",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:"#A32D2D",fontWeight:700,marginLeft:"auto",marginBottom:4 }}>角印</div>
                  <div style={{ fontSize:11,color:"#666",lineHeight:1.7 }}>{selCo.name}<br/>{selCo.addr}</div>
                </div>
              </div>
              {form.subject&&<div style={{ fontSize:13,fontWeight:600,marginBottom:12 }}>件名：{form.subject}</div>}
              <table style={{ width:"100%",borderCollapse:"collapse",marginBottom:12,fontSize:12 }}>
                <thead><tr style={{ background:"#f0f6ff" }}><th style={{ padding:"7px 8px",textAlign:"left",color:"#1a6fd4",fontWeight:600 }}>品名</th><th style={{ padding:"7px 8px",textAlign:"center",color:"#1a6fd4",fontWeight:600 }}>数量</th><th style={{ padding:"7px 8px",textAlign:"right",color:"#1a6fd4",fontWeight:600 }}>単価</th><th style={{ padding:"7px 8px",textAlign:"right",color:"#1a6fd4",fontWeight:600 }}>金額</th></tr></thead>
                <tbody>{items.filter(it=>it.desc).map((it,i)=><tr key={i} style={{ borderBottom:"1px solid #f2f4f9" }}><td style={{ padding:"7px 8px" }}>{it.desc}</td><td style={{ padding:"7px 8px",textAlign:"center" }}>{it.qty}{it.unit}</td><td style={{ padding:"7px 8px",textAlign:"right" }}>{fmt(it.price)}</td><td style={{ padding:"7px 8px",textAlign:"right",fontWeight:600 }}>{fmt(Number(it.qty)*Number(it.price))}</td></tr>)}</tbody>
              </table>
              <div style={{ textAlign:"right",fontSize:12,color:"#888",marginBottom:4 }}>消費税（{taxRate2}%）　{fmt(tax2)}</div>
              <div style={{ display:"flex",justifyContent:"space-between",fontSize:16,fontWeight:800,color:"#1a6fd4",borderTop:"2px solid #1a6fd4",paddingTop:8,marginBottom:12 }}><span>合計（税込）</span><span>{fmt(total)}</span></div>
              {selCo.bank&&<div style={{ background:"#f7f9fc",borderRadius:8,padding:"10px 12px",fontSize:12,color:"#666",lineHeight:1.8,marginBottom:8 }}><div style={{ fontWeight:600,marginBottom:2 }}>お振込先</div><div>{selCo.bank}</div>{memo&&<><div style={{ fontWeight:600,marginTop:6,marginBottom:2 }}>備考</div><div>{memo}</div></>}</div>}
            </div>
          </div>
          <div style={{ display:"flex",gap:10 }}>
            <button style={s.btnS} onClick={()=>setStep(2)}>‹ 修正</button>
            <button style={{ ...s.btnS,flex:1 }}>⬇ PDF保存</button>
            <button style={{ ...s.btnP,flex:2 }} onClick={doComplete}>✦ 発行・送付する</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── MASTER SCREEN ─────────────────────────────────────────────────────────────
function MasterScreen({ master, setMaster, showToast }) {
  const [tab, setTab] = useState("company");
  const [co, setCo] = useState(master.company);
  const [accounts, setAccounts] = useState(master.accounts);
  const [clients, setClients] = useState(master.clients);
  const [newClient, setNewClient] = useState({ name:"", addr:"", bankName:"", bankBranch:"", bankType:"普通", bankNo:"", bankHolder:"" });
  const [newAccount, setNewAccount] = useState({ label:"", category:"sga", examples:"" });

  const saveMaster = () => {
    setMaster({ ...master, company:co, accounts, clients });
    showToast("マスター情報を保存しました");
  };

  return (
    <div style={s.screenWrap}>
      <div style={s.pageHeader}>
        <div style={s.pageTitle}>マスター設定</div>
        <button style={s.btnP} onClick={saveMaster}>保存する</button>
      </div>

      <div style={{ display:"flex", gap:8, marginBottom:16 }}>
        {[["company","会社情報"],["accounts","勘定科目"],["clients","取引先"]].map(([id,label]) => (
          <button key={id} style={{ ...s.taxBtn, ...(tab===id?s.taxActive:{}), border:"1px solid", borderColor:tab===id?"#1a6fd4":"#dce3f0", borderRadius:8, padding:"8px 16px", fontSize:13 }} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>

      {tab === "company" && (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
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
            </div>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            <div style={s.formCard}>
              <div style={s.formTitle}>決算・税務設定</div>
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                <FR label="決算月（開始月）" hint="例）3月決算なら「4月」が期首になります">
                  <select style={s.inp} value={co.fiscalMonth} onChange={e=>setCo({...co,fiscalMonth:Number(e.target.value)})}>
                    {[1,2,3,4,5,6,7,8,9,10,11,12].map(m=><option key={m} value={m}>{m}月始まり（{m===1?12:m-1}月決算）</option>)}
                  </select>
                </FR>
                <FR label="第何期目"><input type="number" style={s.inp} value={co.fiscalNum} onChange={e=>setCo({...co,fiscalNum:Number(e.target.value)})} placeholder="1" min="1" /></FR>
                <FR label="予定税率（%）" hint="法人税・住民税・事業税の合計。中小企業は約25〜35%が目安です">
                  <select style={s.inp} value={co.taxRate} onChange={e=>setCo({...co,taxRate:Number(e.target.value)})}>
                    {[15,20,25,30,33,35,40].map(r=><option key={r} value={r}>{r}%</option>)}
                  </select>
                </FR>
              </div>
            </div>
            <div style={s.formCard}>
              <div style={s.formTitle}>振込先口座</div>
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
          <div style={s.tblWrap}>
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

      {tab === "clients" && (
        <div>
          <div style={s.tblWrap}>
            <table style={s.tbl}>
              <thead><tr>{["会社名","住所","銀行","口座番号","名義",""].map(h=><th key={h} style={{ ...s.th, textAlign:"left" }}>{h}</th>)}</tr></thead>
              <tbody>
                {clients.map((c,i) => (
                  <tr key={c.id} style={s.tr}>
                    <td style={{ ...s.td, fontWeight:500 }}>{c.name}</td>
                    <td style={{ ...s.td, color:"#888", fontSize:11 }}>{c.addr}</td>
                    <td style={{ ...s.td, fontSize:11 }}>{c.bankName} {c.bankBranch}</td>
                    <td style={{ ...s.td, fontSize:11 }}>{c.bankType} {c.bankNo}</td>
                    <td style={{ ...s.td, fontSize:11 }}>{c.bankHolder}</td>
                    <td style={s.td}><button style={{ ...s.btnS, fontSize:11, padding:"3px 10px", color:"#A32D2D", borderColor:"#f09595" }} onClick={() => setClients(prev=>prev.filter((_,idx)=>idx!==i))}>削除</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={s.formCard}>
            <div style={s.formTitle}>取引先を追加</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10 }}>
              <FR label="会社名"><input style={s.inp} value={newClient.name} onChange={e=>setNewClient({...newClient,name:e.target.value})} placeholder="㈱〇〇商事" /></FR>
              <FR label="住所"><input style={s.inp} value={newClient.addr} onChange={e=>setNewClient({...newClient,addr:e.target.value})} placeholder="東京都..." /></FR>
              <FR label="銀行名"><input style={s.inp} value={newClient.bankName} onChange={e=>setNewClient({...newClient,bankName:e.target.value})} placeholder="〇〇銀行" /></FR>
              <FR label="支店名"><input style={s.inp} value={newClient.bankBranch} onChange={e=>setNewClient({...newClient,bankBranch:e.target.value})} placeholder="〇〇支店" /></FR>
              <FR label="口座種別"><select style={s.inp} value={newClient.bankType} onChange={e=>setNewClient({...newClient,bankType:e.target.value})}><option>普通</option><option>当座</option></select></FR>
              <FR label="口座番号"><input style={s.inp} value={newClient.bankNo} onChange={e=>setNewClient({...newClient,bankNo:e.target.value})} placeholder="1234567" /></FR>
              <FR label="口座名義"><input style={s.inp} value={newClient.bankHolder} onChange={e=>setNewClient({...newClient,bankHolder:e.target.value})} placeholder="カ)マルマル" /></FR>
            </div>
            <div style={{ textAlign:"right", marginTop:10 }}>
              <button style={s.btnP} onClick={() => { if (!newClient.name) return; setClients(prev=>[...prev,{ ...newClient, id:Date.now() }]); setNewClient({ name:"", addr:"", bankName:"", bankBranch:"", bankType:"普通", bankNo:"", bankHolder:"" }); }}>追加する</button>
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
    <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
      <div style={{ fontSize:11, color:"#666", fontWeight:600, display:"flex", alignItems:"center", gap:6 }}>
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

  @media(max-width:768px){
    .sidebar{ display:none !important; }
    .bottom-nav{ display:flex !important; }
    .main-area{ margin-left:0 !important; padding-bottom:58px; }
  }
`;
