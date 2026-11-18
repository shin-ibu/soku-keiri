import { useState, useEffect } from "react";
import { fmtK } from "../lib/format.js";
import { M, T, ICONS, s } from "./theme.js";

export function DrillModal({ modal, onClose }) {
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
            <div style={{ ...M.hdramt, color: color || "#233E8B" }}>{amount}</div>
          </div>
          <button style={M.xbtn} onClick={onClose}>✕</button>
        </div>
        {formula && <div style={M.formula}><div style={M.formulalabel}>計算式・根拠</div><pre style={M.formulatext}>{formula}</pre></div>}
        {rows && rows.length > 0 && (
          <div style={M.rowswrap}>
            <div style={M.rowslabel}>内訳　{rows.length}件</div>
            <table style={M.tbl}>
              <thead><tr>{Object.keys(rows[0]).map(k => <th key={k} style={{ ...M.th, textAlign:k==="金額"?"right":"left" }}>{k}</th>)}</tr></thead>
              <tbody>{rows.map((row,i) => <tr key={i} style={{ background:i%2===0?"#fff":"#F7F8FA" }}>{Object.entries(row).map(([k,v]) => <td key={k} style={{ ...M.td, textAlign:k==="金額"?"right":"left", fontWeight:k==="金額"?600:400 }}>{v}</td>)}</tr>)}</tbody>
            </table>
          </div>
        )}
        {note && <div style={M.note}>{note}</div>}
        <button style={M.closebottom} onClick={onClose}>閉じる</button>
      </div>
    </div>
  );
}
export function OPModal({ onClose, onContract }) {
  useEffect(() => {
    const h = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);
  return (
    <div style={M.overlay} onClick={onClose}>
      <div style={{ ...M.box, maxWidth:440 }} onClick={e => e.stopPropagation()}>
        <div style={{ padding:"28px 28px 0" }}>
          <div style={{ fontSize:11, fontWeight:700, color:"#7A4F00", letterSpacing:1, marginBottom:8 }}>OPTION</div>
          <div style={{ fontSize:22, fontWeight:800, color:"#111", marginBottom:8, letterSpacing:-0.5 }}>請求書作成オプション</div>
          <div style={{ fontSize:13, color:"#666", lineHeight:1.9, marginBottom:20 }}>スマホ・PCどちらからでも、プロクオリティの請求書を即座に作成できます。</div>
          {[["🧾","インボイス（登録番号・税率ごとの消費税）に対応"],["📄","その場でPDFにできる"],["📧","PDFをLINE・メールで送れる"],["📊","発行と同時に未入金・損益に自動反映"]].map(([ic,t],i) => (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:12, marginBottom:10, padding:"8px 12px", background:"#F7F8FA", borderRadius:12 }}>
              <span style={{ fontSize:18 }}>{ic}</span><span style={{ fontSize:13, color:"#333" }}>{t}</span>
            </div>
          ))}
          <div style={{ background:"#E6EBF7", borderRadius:10, padding:"14px 16px", margin:"16px 0 0", border:"1px solid #C3CDEA" }}>
            <div style={{ fontSize:11, color:"#4A63A8", marginBottom:4, fontWeight:600 }}>料金</div>
            <div style={{ display:"flex", alignItems:"baseline", gap:6 }}><span style={{ fontSize:26, fontWeight:800, color:"#16295E" }}>¥1,000</span><span style={{ fontSize:13, color:"#4A63A8" }}>/ 月　1社あたり（税別）</span></div>
          </div>
        </div>
        <div style={{ padding:"16px 28px 28px", display:"flex", gap:10 }}>
          <button style={{ flex:1, padding:"11px", borderRadius:12, border:"1px solid #DCE3F5", background:"transparent", color:"#888", fontSize:13, cursor:"pointer" }} onClick={onClose}>閉じる</button>
          <button style={{ flex:2, padding:"11px", borderRadius:12, border:"none", background:"#16295E", color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer" }} onClick={onContract}>✦ このオプションを契約する（デモ）</button>
        </div>
      </div>
    </div>
  );
}

// ── CLICKABLE NUMBER ──────────────────────────────────────────────────────────
export function N({ v, modal, setModal, style }) {
  return <span className="num" style={{ cursor:"pointer", borderBottom:`1.5px dashed ${T.line}`, paddingBottom:1, ...style }} onClick={() => setModal(modal)} title="クリックで根拠を表示">{v}</span>;
}

// ── SIDEBAR ───────────────────────────────────────────────────────────────────
export function Sidebar({ screen, setScreen, taxMode, setTaxMode, opInvoice, showOPModal, master, selMonth, setSelMonth, fiscalMonths }) {
  const coName = master?.company?.name || "AIBOU";
  const navItems = [
    { id:"talk",     icon:"◆", label:"AIBOU（トーク）" },
    { id:"home",     icon:"◈", label:"ホーム" },
    { id:"records",  icon:"≣", label:"記録" },
    { id:"sales",    icon:"↑", label:"売上の一覧" },
    { id:"expenses", icon:"↓", label:"経費の一覧" },
    { id:"projects", icon:"▦", label:"案件" },
    { id:"pl",       icon:"≡", label:"損益計算書（PL）" },
    { id:"bs",       icon:"⊟", label:"貸借対照表（BS）" },
    { id:"ar",       icon:"◎", label:"未入金・未払金" },
    { id:"cashflow", icon:"⇄", label:"資金繰り" },
    { id:"partners", icon:"☺", label:"取引先" },
    { id:"master",   icon:"⚙", label:"会社・口座・科目" },
  ];
  return (
    <div className="sidebar" style={{ width:240, minHeight:"100vh", background:"#fff", borderRight:`1px solid ${T.line}`, position:"fixed", top:0, left:0, display:"flex", flexDirection:"column", zIndex:100 }}>
      <div style={{ padding:"28px 20px 16px" }}>
        <div style={{ fontSize:21, fontWeight:700, color:T.text, letterSpacing:-0.3 }}>
          {coName.length > 10 ? "AIBOU" : coName}
        </div>
        <div style={{ fontSize:12, color:T.sub, marginTop:3 }}>社長の経営の相棒</div>
      </div>
      <nav style={{ flex:1, padding:"4px 12px" }}>
        {navItems.map(item => (
          <button key={item.id} onClick={() => setScreen(item.id)} style={{
            display:"flex", alignItems:"center", gap:12, width:"100%",
            padding:"10px 14px", borderRadius:12, border:"none", cursor:"pointer",
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
          ? <button onClick={() => setScreen("invoice")} style={{ display:"flex", alignItems:"center", gap:12, width:"100%", padding:"10px 14px", borderRadius:12, border:"none", cursor:"pointer", background: screen==="invoice" ? T.priSoft : "transparent", color: screen==="invoice" ? T.priDark : T.sub, fontSize:15, fontWeight:600, marginBottom:2, textAlign:"left" }}>
              <span style={{ fontSize:15, width:20, textAlign:"center" }}>✦</span>
              請求書
              {screen === "invoice" && <span style={{ marginLeft:"auto", width:3, height:18, borderRadius:2, background:T.pri, display:"block" }} />}
            </button>
          : <button onClick={showOPModal} style={{ display:"flex", alignItems:"center", gap:12, width:"100%", padding:"10px 14px", borderRadius:12, border:"none", cursor:"pointer", background:"transparent", color:T.faint, fontSize:15, marginBottom:2, textAlign:"left" }}>
              <span style={{ fontSize:15, width:20, textAlign:"center" }}>🔒</span>
              請求書
            </button>
        }
      </nav>
      {fiscalMonths && setSelMonth && (
        <div style={{ padding:"12px 20px 0", borderTop:`1px solid ${T.line}` }}>
          <div style={{ fontSize:13, color:T.sub, fontWeight:700, marginBottom:6 }}>何月分を見るか</div>
          <select value={selMonth} onChange={e=>setSelMonth(e.target.value)} style={{ width:"100%", background:"#fff", border:`1px solid ${T.line}`, color:T.text, borderRadius:12, padding:"10px 10px", fontSize:15, cursor:"pointer", outline:"none" }}>
            {fiscalMonths.map(m=><option key={m} value={m}>{m}分</option>)}
          </select>
        </div>
      )}
      <div style={{ padding:"14px 20px 24px", borderTop:"none" }}>
        <div style={{ fontSize:13, color:T.sub, fontWeight:700, marginBottom:8, marginTop:14 }}>金額の見せ方</div>
        <div style={{ display:"flex", background:T.bg, borderRadius:12, padding:3, gap:2 }}>
          <button onClick={() => setTaxMode("inc")} style={{ flex:1, padding:"5px 0", borderRadius:4, border:"none", background:taxMode==="inc"?"#fff":"transparent", color:taxMode==="inc"?T.text:T.sub, fontSize:14, cursor:"pointer", fontWeight:taxMode==="inc"?700:400 }}>税込</button>
          <button onClick={() => setTaxMode("exc")} style={{ flex:1, padding:"5px 0", borderRadius:4, border:"none", background:taxMode==="exc"?"#fff":"transparent", color:taxMode==="exc"?T.text:T.sub, fontSize:14, cursor:"pointer", fontWeight:taxMode==="exc"?700:400 }}>税抜</button>
        </div>
        <div style={{ fontSize:13, color:T.faint, marginTop:10 }}>数字を押すと根拠が出ます</div>
      </div>
    </div>
  );
}

// ── BOTTOM NAV (mobile) ───────────────────────────────────────────────────────
export function BottomNav({ screen, setScreen, onPlus }) {
  const on = (ids) => ids.includes(screen);
  const items = [
    ["talk","chat","AIBOU",["talk","home"]], ["records","list","記録",["records","sales","expenses"]], null,
    ["cashflow","chart","お金の流れ",["cashflow"]], ["settings","gear","設定",["settings","partners","pl","bs","projects","ar","master","invoice","invoice-new"]],
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
export function MonthBar({ selMonth, setSelMonth, fiscalMonths }) {
  return (
    <div style={{ display:"flex", gap:4, marginBottom:16, flexWrap:"wrap" }}>
      {fiscalMonths.map(m => (
        <button key={m} style={{ padding:"6px 12px", borderRadius:12, border:"1px solid", borderColor:selMonth===m?T.pri:T.line, background:selMonth===m?T.pri:"#fff", color:selMonth===m?"#fff":T.sub, fontSize:13, cursor:"pointer", fontWeight:selMonth===m?700:400 }} onClick={() => setSelMonth(m)}>{m}分</button>
      ))}
    </div>
  );
}

// ── CHART HELPERS ─────────────────────────────────────────────────────────────
export function LineChart({ months, salesData, expData }) {
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
        <linearGradient id="gradS" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#233E8B" stopOpacity="0.18"/><stop offset="100%" stopColor="#233E8B" stopOpacity="0"/></linearGradient>
        <linearGradient id="gradE" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#B7791F" stopOpacity="0.14"/><stop offset="100%" stopColor="#B7791F" stopOpacity="0"/></linearGradient>
      </defs>
      {gridVals.map((r,i) => {
        const y = PT + CH - r * CH;
        return <g key={i}>
          <line x1={PL} y1={y} x2={PL+CW} y2={y} stroke="#EEF0F3" strokeWidth={1}/>
          <text x={PL-4} y={y+4} textAnchor="end" fontSize={10} fill="#8A93A0">{fmtK(maxV*r)}</text>
        </g>;
      })}
      {months.map((m,i) => (
        <text key={i} x={toX(i)} y={VH-6} textAnchor="middle" fontSize={10} fill="#5B6573">{m.replace(/\d{4}年/,"")}</text>
      ))}
      <path d={salesArea} fill="url(#gradS)"/>
      <path d={expArea}   fill="url(#gradE)"/>
      <polyline points={salesPts} fill="none" stroke="#233E8B" strokeWidth={2.2} strokeLinejoin="round"/>
      <polyline points={expPts}   fill="none" stroke="#B7791F" strokeWidth={2.2} strokeLinejoin="round"/>
      {salesData.map((v,i) => <circle key={i} cx={toX(i)} cy={toY(v)} r={3.5} fill="#fff" stroke="#233E8B" strokeWidth={2}/>)}
      {expData.map((v,i)   => <circle key={i} cx={toX(i)} cy={toY(v)} r={3.5} fill="#fff" stroke="#B7791F" strokeWidth={2}/>)}
    </svg>
  );
}
export function BarChart({ months, profitData }) {
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
      <line x1={PL} y1={zeroY} x2={PL+CW} y2={zeroY} stroke="#E4E8ED" strokeWidth={1}/>
      {[0, 0.5, 1].map((r,i) => {
        const v = minV + r * range;
        const y = toY(v);
        return <g key={i}>
          <line x1={PL} y1={y} x2={PL+CW} y2={y} stroke="#F2F4F6" strokeWidth={1}/>
          <text x={PL-4} y={y+4} textAnchor="end" fontSize={10} fill="#8A93A0">{fmtK(v)}</text>
        </g>;
      })}
      {profitData.map((v,i) => {
        const x = PL + i * slot + (slot - bw) / 2;
        const top = toY(Math.max(v,0)), bot = toY(Math.min(v,0));
        const h = Math.max(bot - top, 2);
        return <g key={i}>
          <defs>
            <linearGradient id={`bg${i}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={v>=0?"#8EA0D0":"#F0B8B3"}/>
              <stop offset="100%" stopColor={v>=0?"#233E8B":"#B3261E"}/>
            </linearGradient>
          </defs>
          <rect x={x} y={top} width={bw} height={h} fill={`url(#bg${i})`} rx={3}/>
          <text x={x+bw/2} y={VH-6} textAnchor="middle" fontSize={10} fill="#5B6573">{months[i].replace(/\d{4}年/,"")}</text>
        </g>;
      })}
    </svg>
  );
}

// ── DONUT CHART ───────────────────────────────────────────────────────────────
export function DonutChart({ sales, expenses, size }) {
  const sz = size || 240;
  const total = sales + expenses;
  const cx = sz / 2, cy = sz / 2;
  const r = sz * 0.37;
  const stroke = sz * 0.14;
  const circ = 2 * Math.PI * r;
  const profitRatio = sales > 0 ? Math.round((sales - expenses) / sales * 100) : 0;

  if (total === 0) return (
    <div style={{ width:sz, height:sz, borderRadius:"50%", background:"#E4E8ED", display:"flex", alignItems:"center", justifyContent:"center", color:"#bbb", fontSize:13 }}>データなし</div>
  );

  const salesRatio = sales / total;
  const salesDash = circ * salesRatio;
  const expDash = circ * (expenses / total);

  return (
    <div style={{ position:"relative", width:sz, height:sz, flexShrink:0 }}>
      <svg width={sz} height={sz} style={{ transform:"rotate(-90deg)" }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#E4E8ED" strokeWidth={stroke} />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#FBE4E2" strokeWidth={stroke}
          strokeDasharray={`${expDash} ${circ - expDash}`}
          strokeDashoffset={-salesDash} strokeLinecap="butt" />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#16295E" strokeWidth={stroke}
          strokeDasharray={`${salesDash} ${circ - salesDash}`} strokeLinecap="butt" />
      </svg>
      <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", pointerEvents:"none" }}>
        <div style={{ fontSize:11, color:"#999", marginBottom:2, fontWeight:600 }}>利益率</div>
        <div style={{ fontSize:36, fontWeight:900, color:profitRatio >= 0 ? "#233E8B" : "#B3261E", letterSpacing:-2, lineHeight:1 }}>{profitRatio}<span style={{ fontSize:16 }}>%</span></div>
      </div>
    </div>
  );
}

// ── ROOT ──────────────────────────────────────────────────────────────────────
export function CpPicker({ value, onChange, onPick, counterparties, addCounterparty, kind="売り先", placeholder="名前の一部を入れると出てきます" }) {
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
            <button type="button" style={{ ...s.pickItem, color:"#16295E", fontWeight:700 }} onMouseDown={e => e.preventDefault()} onClick={() => pick(addCounterparty(q, kind))}>
              ＋「{q}」を相手先に足す
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── SALES ─────────────────────────────────────────────────────────────────────
export function FR({ label, hint, children }) {
  const [show, setShow] = useState(false);
  return (
    <div data-label={label} style={{ display:"flex", flexDirection:"column", gap:6 }}>
      <div style={{ fontSize:14, color:T.text, fontWeight:700, display:"flex", alignItems:"center", gap:6 }}>
        {label}
        {hint && <button type="button" aria-label={`${label}の説明`} style={{ width:22,height:22,borderRadius:11,border:"none",background:T.priSoft,color:T.priDark,fontSize:13,fontWeight:700,display:"inline-flex",alignItems:"center",justifyContent:"center",cursor:"pointer",padding:0 }} onClick={()=>setShow(v=>!v)}>?</button>}
      </div>
      {show && hint && <div style={{ fontSize:14,color:T.priDark,background:T.priSoft,borderRadius:12,padding:"8px 12px",lineHeight:1.7,whiteSpace:"pre-line",fontWeight:400 }}>{hint}</div>}
      {children}
    </div>
  );
}

// ── B案デザイン：共通の値・アイコン・部品 ──────────────────────────────────────
export const Ic = ({ n, size=22, sw=1.8, color="currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={ICONS[n]} /></svg>;
export function MonthPill({ selMonth, setSelMonth, fiscalMonths }) {
  const opts = fiscalMonths.includes(selMonth) ? fiscalMonths : [selMonth, ...fiscalMonths];
  return (
    <label className="month-pill">
      <span>{selMonth}分</span>
      <Ic n="down" size={18} />
      <select aria-label="何月分を見るか" value={selMonth} onChange={e => setSelMonth(e.target.value)}>{opts.map(m => <option key={m} value={m}>{m}分</option>)}</select>
    </label>
  );
}
export const Seg = ({ items, value, onChange }) => (
  <div className="seg" role="tablist">{items.map(([id, label]) => <button key={id} role="tab" aria-selected={value===id} className={value===id ? "on" : ""} onClick={() => onChange(id)}>{label}</button>)}</div>
);
export const ScreenHead = ({ title, onBack, right }) => (
  <div className="scr-head">
    {onBack ? <button className="icon-btn" aria-label="もどる" onClick={onBack}><Ic n="back" /></button> : <span />}
    <h1>{title}</h1>
    {right || <span />}
  </div>
);
export function AmountField({ value, onChange }) {
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
