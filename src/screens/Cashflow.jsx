import { openingCashOf } from "../aibou/keieiLogic.js";
import { monthShort } from "../lib/format.js";
import { N, Ic, MonthPill, ScreenHead } from "../ui/parts.jsx";
import { T } from "../ui/theme.js";

export function CashflowScreen({ val, sales, expenses, setModal, fiscalMonths, setScreen, ar, ap, selMonth, setSelMonth, master }) {
  const ms = fiscalMonths;
  const opening = openingCashOf(master); const open0 = opening ?? 1000000;
  const dIn  = ms.map(m=>sales.filter(r=>r.month===m).reduce((s,r)=>s+r.amount,0));
  const dOut = ms.map(m=>expenses.filter(r=>r.month===m).reduce((s,r)=>s+r.amount,0));
  const bal  = dIn.map((v,i)=>{ let b=open0; for(let j=0;j<=i;j++) b+=dIn[j]-dOut[j]; return b; });
  const mkIn =(i)=>({ title:`${ms[i]}分　入金合計`,amount:val(dIn[i]),rows:sales.filter(r=>r.month===ms[i]).map(r=>({ "相手先":r.client,"金額":val(r.amount) })) });
  const mkOut=(i)=>({ title:`${ms[i]}分　支払合計`,amount:val(dOut[i]),rows:expenses.filter(r=>r.month===ms[i]).map(r=>({ "相手先":r.client,"科目":r.account,"金額":val(r.amount) })) });
  const mkBal=(i)=>({ title:`${ms[i]}　月末残高`,amount:val(bal[i]),formula:i===0?`期首の残高 ${val(open0)}${opening===null?"（仮の値）":""}\n＋ 入金 ${val(dIn[0])}\nー 支払 ${val(dOut[0])}\n＝ ${val(bal[0])}`:`前月残高 ${val(bal[i-1])}\n＋ 入金 ${val(dIn[i])}\nー 支払 ${val(dOut[i])}\n＝ ${val(bal[i])}` });
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
        {opening===null ? <p className="note-warn">期のはじめ（{ms[0]}）の残高が未入力のため、仮に ¥1,000,000 として計算しています。<button className="btn-sub sm" style={{ marginLeft:8 }} onClick={() => setScreen("bs")}>期首の残高を入れる</button></p> : <p className="muted">期のはじめ（{ms[0]}）の残高 {val(opening)} から計算しています。</p>}
      </div>
      <div className="card tbl-b">
        <div className="t-h">{ms[sel]}分の見込み</div>
        <div className="t-r"><span>月はじめの残高</span><N v={val(sel===0 ? open0 : bal[sel-1])} setModal={setModal} modal={sel===0 ? mkBal(0) : mkBal(sel-1)} style={{ borderBottom:"none" }} /></div>
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
