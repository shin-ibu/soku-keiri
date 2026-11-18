import { useState } from "react";
import { fmt } from "../lib/format.js";
import { typeLabel } from "../lib/master.js";
import { InvoiceScreen } from "./Invoice.jsx";
import { N, MonthPill, Seg, ScreenHead } from "../ui/parts.jsx";


export function RecordsScreen(p) {
  const { sales, setSales, setExpenses, selMonth, setSelMonth, fiscalMonths, curSales, curExp, val, setModal, showToast, invoices, opInvoice, showOPModal } = p;
  const [tab, setTab] = useState("sales");
  const [openId, setOpenId] = useState(null);
  const rows = (tab === "sales" ? curSales : curExp).slice().sort((a,b) => String(b.date).localeCompare(String(a.date)));
  const total = rows.reduce((s,r) => s + r.amount, 0);
  const dateJp = (d) => { const [, m, dd] = String(d||"").split("-").map(Number); return m ? `${m}月${dd}日` : ""; };
  const del = (r) => { if (window.confirm(`${r.client} ${fmt(r.amount)} を消します。よろしいですか？`)) { (tab==="sales" ? setSales : setExpenses)(q => q.filter(x => x.id !== r.id)); setOpenId(null); showToast("消しました"); } };
  const paid = (r) => { if (tab === "sales") { setSales(q=>q.map(x=>x.id===r.id?{...x,status:"入金済"}:x)); showToast("入金済にしました"); } else { setExpenses(q=>q.map(x=>x.id===r.id?{...x,status:"支払済"}:x)); showToast("支払済にしました"); } };
  const unpaidBack = (r) => { if (tab === "sales") { setSales(q=>q.map(x=>x.id===r.id?{...x,status:"未入金"}:x)); showToast("未入金に戻しました"); } else { setExpenses(q=>q.map(x=>x.id===r.id?{...x,status:"未払い"}:x)); showToast("未払いに戻しました"); } };
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
                      {unpaid && <button className="btn-sub" onClick={() => paid(r)}>{tab==="sales" ? "入金済にする" : "支払済にする"}</button>}
                      {!unpaid && <button className="btn-sub" onClick={() => unpaidBack(r)}>{tab==="sales" ? "未入金に戻す" : "未払いに戻す"}</button>}
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
