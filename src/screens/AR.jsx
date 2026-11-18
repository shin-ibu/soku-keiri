import { typeLabel } from "../lib/master.js";
import { N, Seg, ScreenHead } from "../ui/parts.jsx";
import { T } from "../ui/theme.js";

export function ARScreen({ sales, setSales, expenses, setExpenses, val, showToast, setModal, setScreen, arTab="in", setArTab=()=>{} }) {
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
      {/* スマホでは入金と支払を切りかえて1つずつ見せる。PCは左右に並べたまま */}
      <div className="ar-tabs"><Seg items={[["in",`入金（未入金 ${unpS.length}件）`],["out",`支払（未払金 ${unpE.length}件）`]]} value={arTab} onChange={setArTab} /></div>
      <div className="master-grid" style={{ display:"grid", gridTemplateColumns:"repeat(2,minmax(0,1fr))", gap:16 }}>
        <div className="ar-col" data-off={arTab!=="in" ? "1" : undefined} style={{ minWidth:0 }}>
          <h2 className="sec-h" style={{ marginTop:0, justifyContent:"space-between" }}><span>未入金<span className="inl">（入金前の売上）</span></span><N v={val(arT)} setModal={setModal} style={{ color:"#7A4F00" }} modal={{ title:"未入金の合計", amount:val(arT), rows:unpS.map(r=>({ "相手先":r.client,"何月分":r.month,"金額":val(r.amount) })) }} /></h2>
          <div className="card list">
            {unpS.length===0 && <div className="empty">未入金はありません</div>}
            {unpS.map(r => <Row key={r.id} r={r} sub={`${r.month}分・${typeLabel(r.type)}`} btn="入金済にする" onBtn={()=>mS(r.id)} color="#7A4F00" kind="未入金" />)}
          </div>
          <h2 className="sec-h">入金済み</h2>
          <div className="card list">
            {paidS.length===0 && <div className="empty">まだありません</div>}
            {paidS.map(r => <Row key={r.id} r={r} sub={`${r.month}分${r.memo ? `・${r.memo}` : ""}`} done="入金済" kind="入金済" />)}
          </div>
        </div>
        <div className="ar-col" data-off={arTab!=="out" ? "1" : undefined} style={{ minWidth:0 }}>
          <h2 className="sec-h" style={{ marginTop:0, justifyContent:"space-between" }}><span>未払金<span className="inl">（支払前の経費）</span></span><N v={val(apT)} setModal={setModal} style={{ color:"#B3261E" }} modal={{ title:"未払金の合計", amount:val(apT), rows:unpE.map(r=>({ "相手先":r.client,"科目":r.account,"金額":val(r.amount) })) }} /></h2>
          <div className="card list">
            {unpE.length===0 && <div className="empty">未払金はありません</div>}
            {unpE.map(r => <Row key={r.id} r={r} sub={`${r.month}分・${r.account}`} btn="支払済にする" onBtn={()=>mE(r.id)} color="#B3261E" kind="未払金" />)}
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
