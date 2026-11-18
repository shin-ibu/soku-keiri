import { useState } from "react";
import { fmt, fmtEx } from "../lib/format.js";
import { typeLabel } from "../lib/master.js";
import { SaleForm, ExpenseForm } from "./Entry.jsx";
import { N, MonthBar } from "../ui/parts.jsx";
import { s } from "../ui/theme.js";

export function SalesScreen({ setSales, setSelMonth, selMonth, val, showToast, curSales, setModal, master, fiscalMonths, addCounterparty }) {
  const [showForm, setShowForm] = useState(false);
  const markPaid = (id) => { setSales(p=>p.map(r=>r.id===id?{...r,status:"入金済"}:r)); showToast("入金済にしました"); };
  const markUnpaid = (id) => { setSales(p=>p.map(r=>r.id===id?{...r,status:"未入金"}:r)); showToast("未入金に戻しました"); };
  const total = curSales.reduce((s,r)=>s+r.amount,0);
  return (
    <div className="screen-wrap" style={s.screenWrap}>
      <div style={s.pageHeader}><div style={s.pageTitle}>売上入力</div><button style={s.btnP} onClick={()=>setShowForm(true)}>＋ 新規入力</button></div>
      <MonthBar selMonth={selMonth} setSelMonth={setSelMonth} fiscalMonths={fiscalMonths} />
      {showForm && <div style={s.formCard}><div style={s.formTitle}>売上を入力する</div><SaleForm setSales={setSales} setSelMonth={setSelMonth} showToast={showToast} curSales={curSales} master={master} fiscalMonths={fiscalMonths} addCounterparty={addCounterparty} onDone={()=>setShowForm(false)} /></div>}
      <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:8, gap:6, alignItems:"center" }}>
        <span style={{ fontSize:12, color:"#aaa" }}>合計</span>
        <N v={val(total)} setModal={setModal} style={{ fontSize:16, fontWeight:800, color:"#17795E" }} modal={{ title:`${selMonth}　売上合計`, amount:val(total), color:"#17795E", rows:curSales.map(r=>({ "日付":r.date,"相手先":r.client,"区分":typeLabel(r.type),"金額":val(r.amount),"状態":r.status })) }} />
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
                <td style={{ ...s.td, textAlign:"right" }}><N v={val(r.amount)} setModal={setModal} style={{ fontWeight:700, color:"#17795E" }} modal={{ title:`${r.client}への売上`, amount:val(r.amount), color:"#17795E", formula:`税込 ${fmt(r.amount)}${r.tax>0?`\n（税抜 ${fmtEx(r.amount)}）`:""}`, rows:[{ "相手先":r.client,"日付":r.date,"反映月":r.month,"区分":typeLabel(r.type),"備考":r.memo||"—","状態":r.status }] }} /></td>
                <td style={{ ...s.td, textAlign:"center" }}>{r.tax}%</td>
                <td style={{ ...s.td, color:"#aaa" }}>{r.memo}</td>
                <td style={s.td}><span style={{ ...s.badge, ...(r.status==="入金済"?s.bGreen:s.bAmber) }}>{r.status}</span></td>
                <td style={{ ...s.td, whiteSpace:"nowrap" }}>{r.status==="未入金"&&<button style={s.paidBtn} onClick={()=>markPaid(r.id)}>入金済にする</button>}{r.status==="入金済"&&<button style={s.paidBtn} onClick={()=>markUnpaid(r.id)}>未入金に戻す</button>} <button style={s.delBtn} aria-label={`${r.client}の売上を消す`} onClick={()=>{ if (window.confirm(`${r.client} ${fmt(r.amount)} を消します。よろしいですか？`)) { setSales(p=>p.filter(x=>x.id!==r.id)); showToast("消しました"); } }}>消す</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── EXPENSES ──────────────────────────────────────────────────────────────────
export function ExpenseScreen({ setExpenses, setSelMonth, selMonth, val, showToast, curExp, setModal, master, fiscalMonths, addCounterparty }) {
  const [showForm, setShowForm] = useState(false);
  const markPaid = (id) => { setExpenses(p=>p.map(e=>e.id===id?{...e,status:"支払済"}:e)); showToast("支払済にしました"); };
  const markUnpaid = (id) => { setExpenses(p=>p.map(e=>e.id===id?{...e,status:"未払い"}:e)); showToast("未払いに戻しました"); };
  const total = curExp.reduce((s,r)=>s+r.amount,0);
  return (
    <div className="screen-wrap" style={s.screenWrap}>
      <div style={s.pageHeader}><div style={s.pageTitle}>経費入力</div><button style={s.btnP} onClick={()=>setShowForm(true)}>＋ 新規入力</button></div>
      <MonthBar selMonth={selMonth} setSelMonth={setSelMonth} fiscalMonths={fiscalMonths} />
      {showForm && <div style={s.formCard}><div style={s.formTitle}>経費を入力する</div><ExpenseForm setExpenses={setExpenses} setSelMonth={setSelMonth} showToast={showToast} curExp={curExp} master={master} fiscalMonths={fiscalMonths} addCounterparty={addCounterparty} onDone={()=>setShowForm(false)} /></div>}
      <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:8, gap:6, alignItems:"center" }}>
        <span style={{ fontSize:12, color:"#aaa" }}>合計</span>
        <N v={val(total)} setModal={setModal} style={{ fontSize:16, fontWeight:800, color:"#B3261E" }} modal={{ title:`${selMonth}　経費合計`, amount:val(total), color:"#B3261E", rows:curExp.map(r=>({ "相手先":r.client,"科目":r.account,"金額":val(r.amount),"状態":r.status })) }} />
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
                <td style={{ ...s.td, whiteSpace:"nowrap" }}>{r.status==="未払い"&&<button style={{ ...s.paidBtn, borderColor:"#F0B8B3", color:"#B3261E" }} onClick={()=>markPaid(r.id)}>支払済にする</button>}{r.status==="支払済"&&<button style={s.paidBtn} onClick={()=>markUnpaid(r.id)}>未払いに戻す</button>} <button style={s.delBtn} aria-label={`${r.client}の経費を消す`} onClick={()=>{ if (window.confirm(`${r.client} ${fmt(r.amount)} を消します。よろしいですか？`)) { setExpenses(p=>p.filter(x=>x.id!==r.id)); showToast("消しました"); } }}>消す</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── PL ────────────────────────────────────────────────────────────────────────
// ── AR/AP ─────────────────────────────────────────────────────────────────────
