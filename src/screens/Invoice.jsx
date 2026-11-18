import { useState } from "react";
import { ProjectField } from "../aibou/keiei.jsx";
import { suggestProject } from "../aibou/keieiLogic.js";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { fmt, monthOfDate, yen, jpDate, bankLine } from "../lib/format.js";
import { dueFromTerms, lineAmount, calcInvoice, nextInvoiceNo, newId, invoiceFileName, downloadFile, canShareFile, blankItem, blankInvForm } from "../lib/invoice.js";
import { normRegNo, isValidRegNo } from "../lib/master.js";
import { CpPicker, FR, ScreenHead } from "../ui/parts.jsx";
import { M, SHEET_FONT, T, s } from "../ui/theme.js";

export function InvoiceSheet({ inv, paper }) {
  const c = inv.calc;
  const has8 = inv.items.some(it => Number(it.tax) === 8);
  const P = paper;
  const cell = { padding: P ? "4px 8px" : "7px 6px", borderBottom:"1px solid #E4E8ED", fontSize:13, lineHeight: P ? 1.45 : 1.6, verticalAlign:"top" };
  const head = { ...cell, background:"#EEF2FA", color:"#16295E", fontWeight:700, borderBottom:"1px solid #C3CDEA", whiteSpace:"nowrap" };
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
          <div style={{ display:"flex", alignItems:"baseline", gap:12, marginTop:8, padding:"8px 14px", background:"#EEF2FA", border:"1px solid #C3CDEA", borderRadius:4 }}>
            <span style={{ fontSize:14, fontWeight:700 }}>ご請求金額（税込）</span>
            <span style={{ fontSize: P ? 26 : 22, fontWeight:800, color:"#16295E", marginLeft:"auto" }}>{yen(c.total)}</span>
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
            <div key={r.rate} style={{ ...sumRow, borderBottom:"1px dashed #E4E8ED" }}>
              <span>{r.rate === 0 ? "0%（非課税など）対象" : `${r.rate}%対象`}{"　"}{yen(r.base)}</span>
              <span>{r.rate === 0 ? "消費税 ¥0" : `消費税 ${yen(r.tax)}`}</span>
            </div>
          ))}
          <div style={sumRow}><span>小計（税抜）</span><span>{yen(c.subtotal)}</span></div>
          <div style={sumRow}><span>消費税</span><span>{yen(c.taxTotal)}</span></div>
          <div style={{ ...sumRow, fontSize:16, fontWeight:800, borderTop:"2px solid #16295E", paddingTop:6, marginTop:2 }}><span>合計（税込）</span><span>{yen(c.total)}</span></div>
        </div>
      </div>
      {(bankLine(inv.issuer.bank) || inv.memo) && (
        <div data-row="1" style={{ border:"1px solid #E4E8ED", borderRadius:4, padding: P ? "8px 14px" : "10px 14px", fontSize:13, color:"#333" }}>
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
export function InvoiceScreen({ setScreen, master, sales, setSales, showToast, invoices, setInvoices, invoiceSeq, setInvoiceSeq, addCounterparty, embed, startNew: startNewProp, expenses=[], projects=[], setProjects=()=>{} }) {
  const [mode, setMode] = useState(embed ? "list" : startNewProp ? "new" : (invoices.length ? "list" : "new"));
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(blankInvForm);
  const invSug = suggestProject({ kind:"sale", client:form.client, sales, expenses, projects });
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
    setSales(p => [...p, { id:saleId, date:form.issueDate, month:monthOfDate(form.issueDate), type:"売掛", client:inv.client, amount:calc.total, tax: rates.length===1 ? rates[0] : 10, project: form.project !== undefined ? form.project : (invSug ? invSug.value : null), memo:`請求書 ${no}${form.subject?` ${form.subject}`:""}`, status:"未入金", invoiceId:invId }]);
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
            <div style={{ background:"#fff", border:"1px solid #E4E8ED", borderRadius:12, overflow:"hidden" }}>
              {[...invoices].reverse().map(inv => {
                const st = statusOf(inv);
                return (
                  <div key={inv.id} style={{ display:"flex", flexWrap:"wrap", alignItems:"center", gap:"6px 12px", padding:"12px 14px", borderBottom:"1px solid #F2F4F6" }}>
                    <div style={{ flex:"1 1 220px", minWidth:0 }}>
                      <div style={{ fontSize:13, color:"#888" }}>{inv.no}{"　"}{inv.issueDate}</div>
                      <div style={{ fontSize:15, fontWeight:700, color:"#222", wordBreak:"break-all" }}>{inv.client} {inv.honorific}</div>
                      {inv.subject && <div style={{ fontSize:13, color:"#888" }}>{inv.subject}</div>}
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <span style={{ fontSize:16, fontWeight:800, color:"#17795E" }}>{fmt(inv.calc.total)}</span>
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
          <div style={{ width:72, height:72, borderRadius:36, background:"#E3F3EC", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px", fontSize:36 }}>✓</div>
          <div style={{ fontSize:20, fontWeight:700, marginBottom:8 }}>請求書を発行しました</div>
          <div style={{ fontSize:14, color:"#666", marginBottom:20, lineHeight:1.8 }}>{doneInv.no}{"　"}{fmt(doneInv.calc.total)}<br/>{doneInv.client} {doneInv.honorific}</div>
          <div style={{ display:"flex", gap:10, marginBottom:16 }}>{pdfBtn(doneInv, true)}</div>
          <div style={{ background:"#F7F8FA", borderRadius:12, padding:"14px 18px", marginBottom:16, textAlign:"left" }}>
            {["売上に「未入金」で入れました","未入金の一覧に出ます","損益計算書に入りました"].map((t,i) => <div key={i} style={{ display:"flex", gap:10, marginBottom:6, fontSize:13, color:"#555" }}><span style={{ color:"#0F5640", fontWeight:700 }}>✓</span>{t}</div>)}
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
                <div style={{ gridColumn:"1 / -1" }}><FR label="案件" hint={"どの仕事の請求かを選びます。\n請求書から作られる売上に、この案件が付きます。"}><ProjectField kind="sale" value={form.project} suggestion={invSug} onChange={v => sf("project", v)} projects={projects} setProjects={setProjects} client={form.client} inputStyle={s.inp} /></FR></div>
                <FR label="敬称"><select style={s.inp} value={form.honorific} onChange={e => sf("honorific", e.target.value)}><option>御中</option><option>様</option></select></FR>
                <FR label="ご担当者（なくてもOK）"><input style={s.inp} value={form.contact} onChange={e => sf("contact", e.target.value)} placeholder="山田" /></FR>
                <div style={{ gridColumn:"1 / -1" }}><FR label="相手の住所（なくてもOK）"><input style={s.inp} value={form.clientAddr} onChange={e => sf("clientAddr", e.target.value)} placeholder="東京都…" /></FR></div>
                <FR label="請求日"><input type="date" style={s.inp} value={form.issueDate} onChange={e => onIssueDate(e.target.value)} /></FR>
                <FR label="お支払期限" hint={"相手先の支払条件から自動で入ります。\n直してもかまいません。"}><input type="date" style={s.inp} value={form.dueDate} onChange={e => sf("dueDate", e.target.value)} /></FR>
                <div style={{ gridColumn:"1 / -1" }}><FR label="件名"><input style={s.inp} value={form.subject} onChange={e => sf("subject", e.target.value)} placeholder="Webサイト制作費 11月分" /></FR></div>
              </div>
              {cp && cp.terms && <div style={{ ...s.hint13, marginTop:8 }}>支払条件：{cp.terms}</div>}
              {lastInv && <button style={{ ...s.btnS, width:"100%", marginTop:12, color:"#16295E", borderColor:"#C3CDEA", background:"#E6EBF7", fontWeight:700 }} onClick={copyLast}>↻ 前回と同じ内容を入れる（{lastInv.no}）</button>}
            </div>
          </>)}

          {step < 3 && (<>
            <div style={s.formCard}>
              <div style={s.formTitle}>なにを<span style={{ fontWeight:400, color:T.sub }}>（請求内容・単価は税抜）</span></div>
              {items.map((it,i) => (
                <div key={i} style={{ border:"1px solid #E4E8ED", borderRadius:12, padding:"12px 14px", marginBottom:10, background:"#F7F8FA" }}>
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
              <button style={{ width:"100%", padding:"11px", borderRadius:12, border:"1px dashed #C3CDEA", background:"#E6EBF7", color:"#16295E", fontSize:14, fontWeight:600, cursor:"pointer", marginBottom:16 }} onClick={() => setItems(p => [...p, blankItem()])}>＋ 明細を足す</button>
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
            <div style={{ border:`1px solid ${T.line}`, borderRadius:12, overflow:"hidden", marginBottom:16, background:"#fff", boxShadow:T.shadow }}><InvoiceSheet inv={draft} /></div>
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
export const InvoiceNew = (props) => <InvoiceScreen {...props} startNew />;

// ── 相手先 SCREEN ─────────────────────────────────────────────────────────────
