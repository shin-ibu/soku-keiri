import { useState, useEffect } from "react";
import { ProjectField } from "../aibou/keiei.jsx";
import { matchEstimates, remainingOf, estimateStatusAfter } from "../lib/estimate.js";
import { suggestProject } from "../aibou/keieiLogic.js";
import { today, monthOfDate, fmt } from "../lib/format.js";
import { getSuggestion, typeLabel } from "../lib/master.js";
import { CpPicker, FR, Ic, Seg, AmountField } from "../ui/parts.jsx";
import { s } from "../ui/theme.js";

export function SaleForm({ setSales, setSelMonth, showToast, curSales, master, fiscalMonths, addCounterparty, onDone, sales=[], expenses=[], projects=[], setProjects=()=>{}, estimates=[], setEstimates=()=>{}, invoices=[] }) {
  const [form, setForm] = useState({ date:today(), month:monthOfDate(today()), type:"売掛", client:"", amount:"", tax:10, memo:"", status:"未入金" });
  const [showAlert, setShowAlert] = useState(false);
  const [dismissed, setDismissed] = useState([]);
  const [noEst, setNoEst] = useState(false);
  // 見積もりとの照合（「これですか？」）。売上は税込で入るので、見積もりの税込額と比べる
  const linkedEst = form.estimateId ? estimates.find(x => x.id === form.estimateId) : null;
  const cands = (!linkedEst && !noEst && form.client && Number(form.amount) > 0) ? matchEstimates(estimates, invoices, { client:form.client, amount:Number(form.amount) }, sales).filter(c => c.kind !== "open" && c.kind !== "over" && !dismissed.includes(c.est.id)).slice(0, 2) : [];
  const pickEst = (est) => { setForm(f => ({ ...f, estimateId:est.id, client: est.client, project: est.projectId ?? f.project, memo: f.memo || est.subject || "" })); showToast(`見積もり ${est.no} とつなげました`); };
  const sf = (k,v) => setForm(f=>({...f,[k]:v}));
  const sug = suggestProject({ kind:"sale", client:form.client, sales, expenses, projects });
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
    const project = form.project !== undefined ? form.project : (sug ? sug.value : null);
    const rec = { ...form,id:Date.now(),amount:Number(form.amount),status: form.type==="現金" ? "入金済" : "未入金", project };
    setSales(p=>[...p,rec]); setSelMonth(form.month);
    if (form.estimateId) {
      setEstimates(es => es.map(x => x.id === form.estimateId ? { ...x, status: estimateStatusAfter(x, invoices, [...sales, rec]) } : x));
      if (linkedEst && linkedEst.projectId) setProjects(ps => ps.map(x => x.id === linkedEst.projectId && x.status === "見積中" ? { ...x, status:"進行中" } : x));
    }
    setDismissed([]); setNoEst(false);
    setForm({ date:today(),month:monthOfDate(today()),type:"売掛",client:"",amount:"",tax:10,memo:"",status:"未入金" });
    showToast((form.type==="現金" ? "売上を保存しました（入金済）" : "売上を保存しました（未入金）") + (project===null ? "。案件は未設定です" : ""));
    if (onDone) onDone();
  };
  return (
    <div className="bform">
      <AmountField value={form.amount} onChange={v=>sf("amount",v)} />
      <FR label="取引先（だれからの売上か）"><CpPicker value={form.client} onChange={v=>sf("client",v)} counterparties={master.counterparties} addCounterparty={addCounterparty} kind="売り先" /></FR>
      <FR label="案件" hint={"どの仕事の売上かを選びます。\n案件ごとの粗利を出すのに使います。\n決まっていなければ「未設定」のままで、あとでAIBOUが確認します。"}><ProjectField kind="sale" value={form.project} suggestion={sug} onChange={v=>sf("project",v)} projects={projects} setProjects={setProjects} client={form.client} inputStyle={s.inp} /></FR>
      <div className="two">
        <FR label="取引日"><input type="date" style={s.inp} value={form.date} onChange={e=>{ const v=e.target.value; setForm(f=>({ ...f, date:v, month: fiscalMonths.includes(monthOfDate(v)) ? monthOfDate(v) : f.month })); }} /></FR>
        <FR label="何月分の売上か" hint={"この売上は何月の仕事ですか？\n例）3月納品 → 3月　4月に請求しても3月と入力"}>
          <select style={s.inp} value={form.month} onChange={e=>sf("month",e.target.value)}>{fiscalMonths.map(m=><option key={m} value={m}>{m}分</option>)}</select>
        </FR>
      </div>
      <FR label="売上の内容"><input style={s.inp} value={form.memo} onChange={e=>sf("memo",e.target.value)} placeholder="Webサイト制作など" /></FR>
      <div className="two">
        <FR label="入金のしかた" hint={"現金：その場で入金 → 入金済で登録します\n売掛（後日入金）・カード：入金前 → 未入金で登録します"}><select style={s.inp} value={form.type} onChange={e=>sf("type",e.target.value)}>{["現金","売掛","カード"].map(t=><option key={t} value={t}>{typeLabel(t)}</option>)}</select></FR>
        <FR label="消費税"><select style={s.inp} value={form.tax} onChange={e=>sf("tax",Number(e.target.value))}><option value={10}>税率 10%（標準）</option><option value={8}>税率 8%（軽減）</option><option value={0}>0%（非課税）</option></select></FR>
      </div>
      {linkedEst && (
        <div style={{ background:"#E3F3EC", border:"1px solid #A9D9C3", borderRadius:12, padding:"10px 14px", fontSize:14, lineHeight:1.6, marginTop:4 }}>
          見積もり <b>{linkedEst.no}</b>（{linkedEst.subject || linkedEst.client}・{fmt(linkedEst.calc.total)}）の売上として入れます。
          {Number(form.amount) !== remainingOf(linkedEst, invoices, sales) && <><br />見積もりの残り {fmt(remainingOf(linkedEst, invoices, sales))} との差：{fmt(Number(form.amount) - remainingOf(linkedEst, invoices, sales))}</>}
          <button className="btn-sub sm" style={{ marginLeft:8 }} onClick={() => sf("estimateId", undefined)}>外す</button>
        </div>
      )}
      {cands.length > 0 && (
        <div className="card pad" style={{ border:"2px solid #233E8B", marginTop:4 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}><span style={{ fontSize:12, fontWeight:700, padding:"2px 8px", borderRadius:999, background:"#233E8B", color:"#fff" }}>AIBOU</span><b>この見積もりの売上ですか？</b></div>
          {cands.map(c => (
            <div key={c.est.id} style={{ borderTop:"1px solid #EEF0F3", padding:"8px 0", display:"grid", gap:6 }}>
              <div style={{ fontSize:15 }}><b>{c.est.no}</b>　{c.est.subject || "（件名なし）"}　{fmt(c.est.calc.total)}</div>
              <div style={{ fontSize:14, color: c.kind === "same" ? "#0F5640" : "#7A4F00" }}>{c.label}</div>
              <div style={{ display:"flex", gap:8 }}><button className="btn-pri sm" onClick={() => pickEst(c.est)}>これです</button><button className="btn-sub sm" onClick={() => setDismissed(d => [...d, c.est.id])}>違う</button></div>
            </div>
          ))}
          <button className="btn-sub sm" style={{ marginTop:4 }} onClick={() => setNoEst(true)}>見積もりなし</button>
        </div>
      )}
      {showAlert && <div style={s.alertBox} role="alert">この月のほかの金額と大きく違います。金額が合っていれば、もう一度「この内容で保存」を押してください。</div>}
      <button className="btn-main" onClick={()=>doSave(showAlert)}>この内容で保存</button>
    </div>
  );
}

// ── 入力：経費（もとは経費入力の画面の中にあった。処理はそのまま） ─────────────
export function ExpenseForm({ setExpenses, setSelMonth, showToast, curExp, master, fiscalMonths, addCounterparty, onDone, sales=[], expenses=[], projects=[], setProjects=()=>{}, openAssetFromExpense }) {
  const [longUse, setLongUse] = useState(false);   // 長く使うもの（10万円以上）
  const [form, setForm] = useState({ date:today(), month:monthOfDate(today()), type:"現金", client:"", account:"", amount:"", tax:10, memo:"", status:"未払い" });
  const [freeText, setFreeText] = useState("");
  const [suggestion, setSuggestion] = useState(null);
  const [showAlert, setShowAlert] = useState(false);
  const sf = (k,v) => setForm(f=>({...f,[k]:v}));
  const onFree = (v) => { setFreeText(v); const sug=getSuggestion(v); setSuggestion(sug); if(sug) sf("account",sug); };
  const pSug = suggestProject({ kind:"expense", client:form.client, account:form.account, sales, expenses, projects });
  const isOutlier = () => {
    if (!form.amount||curExp.length===0) return false;
    const avg = curExp.reduce((s,r)=>s+r.amount,0)/curExp.length;
    return Number(form.amount)>avg*3||Number(form.amount)<avg*0.1;
  };
  const doSave = (force) => {
    if (!form.client||!form.amount||!form.account) { showToast("相手先・科目・金額は必須です","error"); return; }
    if (force!==true && !showAlert && isOutlier()) { setShowAlert(true); return; }
    setShowAlert(false);
    const project = form.project !== undefined ? form.project : (pSug ? pSug.value : null);
    const rec = { ...form,id:Date.now(),amount:Number(form.amount),status: form.type==="現金" ? "支払済" : "未払い", project, assetChecked: Number(form.amount) >= 100000 ? longUse : undefined };
    setExpenses(p=>[...p,rec]); setSelMonth(form.month);
    setFreeText(""); setSuggestion(null);
    setForm({ date:today(),month:monthOfDate(today()),type:"現金",client:"",account:"",amount:"",tax:10,memo:"",status:"未払い" });
    showToast((form.type==="現金" ? "経費を保存しました（支払済）" : "経費を保存しました（未払金）") + (project===null ? "。案件は未設定です" : ""));
    if (onDone) onDone();
    if (longUse && openAssetFromExpense) { openAssetFromExpense({ ...rec, memo: freeText || rec.memo }); setLongUse(false); }
  };
  const accountOptions = master.accounts.filter(a=>a.category!=="revenue");
  return (
    <div className="bform">
      <AmountField value={form.amount} onChange={v=>sf("amount",v)} />
      <FR label="支払先"><CpPicker value={form.client} onChange={v=>sf("client",v)} counterparties={master.counterparties} addCounterparty={addCounterparty} kind="支払い先" placeholder="〇〇ビルなど（一部でもOK）" /></FR>
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
      <FR label="案件" hint={"どの仕事のための経費かを選びます。\n家賃や通信費など、どの案件にも属さないものは「共通費」です。\n決まっていなければ「未設定」のままで、あとでAIBOUが確認します。"}><ProjectField kind="expense" value={form.project} suggestion={pSug} onChange={v=>sf("project",v)} projects={projects} setProjects={setProjects} client={form.client} inputStyle={s.inp} /></FR>
      <div className="two">
        <FR label="支払いのしかた" hint={"現金：その場で支払 → 支払済で登録します\n買掛（後日支払）・カード：支払前 → 未払金で登録します"}><select style={s.inp} value={form.type} onChange={e=>sf("type",e.target.value)}>{["現金","買掛","カード"].map(t=><option key={t} value={t}>{typeLabel(t)}</option>)}</select></FR>
        <FR label="消費税"><select style={s.inp} value={form.tax} onChange={e=>sf("tax",Number(e.target.value))}><option value={10}>税率 10%（標準）</option><option value={8}>税率 8%（軽減）</option><option value={0}>0%（非課税）</option></select></FR>
      </div>
      {Number(form.amount) >= 100000 && (
        <label style={{ display:"flex", gap:10, alignItems:"flex-start", background:"#F7F8FA", border:"1px solid #DFE3E8", borderRadius:12, padding:"12px 14px", fontSize:15, lineHeight:1.6, cursor:"pointer" }}>
          <input type="checkbox" checked={longUse} onChange={e=>setLongUse(e.target.checked)} style={{ width:22, height:22, minHeight:22, marginTop:2 }} />
          <span><b>長く使うもの</b>（車・パソコン・設備・建物など）<br /><span style={{ color:"#5B6573", fontSize:13 }}>チェックすると、保存のあとに「長く使うもの」として登録します。費用は使う年数に分けて入ります。</span></span>
        </label>
      )}
      {showAlert && <div style={s.alertBox} role="alert">この月のほかの金額と大きく違います。金額が合っていれば、もう一度「この内容で保存」を押してください。</div>}
      <button className="btn-main" onClick={()=>doSave(showAlert)}>この内容で保存</button>
    </div>
  );
}
export function EntrySheet({ tab, setTab, onClose, opInvoice, showOPModal, setScreen, ...p }) {
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
