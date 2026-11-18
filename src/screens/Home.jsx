import { today, monthShort, greeting } from "../lib/format.js";
import { N, LineChart, BarChart, Ic, MonthPill } from "../ui/parts.jsx";
import { T } from "../ui/theme.js";

export function HomeScreen({ setScreen, totalSales, totalExp, opProfit, ar, ap, val, sales, setSales, expenses, setExpenses, selMonth, setSelMonth, setModal, curSales, curExp, grossProfit, genka, sga, fiscalMonths, master, opInvoice, showOPModal, invoices, showToast }) {
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
  const mOp    = { title:`${selMonth}分の利益（営業利益）`, amount:val(opProfit), formula:`売上高 ${val(totalSales)}\nー 売上原価 ${val(genka)}\n＝ 粗利 ${val(grossProfit)}\nー 販管費 ${val(sga)}\n＝ 営業利益 ${val(opProfit)}`, note:"未入金の売上・未払いの経費も含めた見込みです。口座にあるお金とは違います。" };
  const mAr    = { title:"未入金の合計", amount:val(ar), rows:unpS.map(r=>({ "相手先":r.client,"何月分":r.month,"金額":val(r.amount) })), note:`${arCount}件が未入金です。` };
  const mAp    = { title:"未払金の合計", amount:val(ap), rows:unpE.map(r=>({ "相手先":r.client,"科目":r.account,"金額":val(r.amount) })), note:`${apCount}件が未払いです。` };

  // 今日やること：入金の確認（請求書の期限があるものは期限超過を出す）・支払い
  const td = today();
  const dueOf = (r) => { const inv = r.invoiceId && invoices.find(v => v.id === r.invoiceId); return inv && inv.dueDate ? inv.dueDate : ""; };
  const inList = unpS.map(r => ({ r, due: dueOf(r) })).sort((a,b) => (a.due||"9") .localeCompare(b.due||"9"));
  const late = inList.filter(x => x.due && x.due < td).length;
  const mdJp = (d) => { const [, m, dd] = String(d||"").split("-").map(Number); return m ? `${m}月${dd}日` : ""; };
  const markIn = (id) => { setSales(p=>p.map(r=>r.id===id?{...r,status:"入金済"}:r)); showToast("入金済にしました"); };
  const markOut = (id) => { setExpenses(p=>p.map(e=>e.id===id?{...e,status:"支払済"}:e)); showToast("支払済にしました"); };
  const todo = Math.min(inList.length, 3) + Math.min(unpE.length, 3);
  const mo = monthShort(selMonth);

  return (
    <div className="screen-wrap b-screen home">
      <div className="hello">
        <div><small>{greeting()}</small><b>{master.company.name ? `${master.company.name}さん` : "社長"}</b></div>
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
              <button className="btn-pri sm" onClick={() => markIn(r.id)}>入金済にする</button>
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
              <button className="btn-sub sm" onClick={() => markOut(r.id)}>支払済にする</button>
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
