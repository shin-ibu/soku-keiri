import { useState, useEffect } from "react";
import TalkScreen from "./aibou/TalkScreen.jsx";
import { font } from "./ui/tokens.js";
import { ProjectsScreen, PLLearnScreen, BSScreen } from "./aibou/keiei.jsx";
import { AssetsScreen, ZeirishiScreen } from "./aibou/shisan.jsx";
import { profileOf } from "./aibou/assets.js";
import { DEMO_SALES, DEMO_EXP, DEMO_PROJECTS, shiftDemo } from "./lib/demo.js";
import { fmt, fmtEx, thisMonth, getFiscalMonths, getFiscalYear } from "./lib/format.js";
import { CP_BLANK, migrateMaster } from "./lib/master.js";
import { load, saveAll } from "./lib/storage.js";
import { ARScreen } from "./screens/AR.jsx";
import { CashflowScreen } from "./screens/Cashflow.jsx";
import { EntrySheet } from "./screens/Entry.jsx";
import { HomeScreen } from "./screens/Home.jsx";
import { InvoiceScreen, InvoiceNew, EstimateScreen, EstimateNew } from "./screens/Invoice.jsx";
import { SalesScreen, ExpenseScreen } from "./screens/Lists.jsx";
import { MasterScreen } from "./screens/Master.jsx";
import { PartnersScreen } from "./screens/Partners.jsx";
import { RecordsScreen } from "./screens/Records.jsx";
import { SettingsScreen } from "./screens/Settings.jsx";
import { DrillModal, OPModal, Sidebar, BottomNav } from "./ui/parts.jsx";
import { T, css } from "./ui/theme.js";

export default function App() {
  const [saved] = useState(load);
  const [screen,      setScreen]      = useState("talk");   // AIBOU：最初はトーク画面
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
  const [entry,       setEntry]       = useState(null);   // 記録を追加（下から出る）："sales" | "expenses" | null
  const [arTab,       setArTab]       = useState("in");   // 未入金・未払金：スマホで見せる側
  const [projects,    setProjects]    = useState(saved ? (saved.projects || []) : DEMO_PROJECTS);   // 案件
  const [assets,      setAssets]      = useState(saved?.assets || []);      // 長く使うもの（固定資産）
  const [loans,       setLoans]       = useState(saved?.loans || []);       // 借入金
  const [inventory,   setInventory]   = useState(saved?.inventory || {});   // 月末の在庫 { "2026年11月": 金額 }
  const [notes,       setNotes]       = useState(saved?.notes || []);       // 税理士に聞きたいこと
  const [assetDraft,  setAssetDraft]  = useState(null);   // 経費から「長く使うもの」を登録するときの下書き
  const [assetsTab,   setAssetsTab]   = useState("assets");
  const [estimates,   setEstimates]   = useState(saved?.estimates || []);     // 見積書
  const [estimateSeq, setEstimateSeq] = useState(saved?.estimateSeq || {});
  const [invoiceFromEstimate, setInvoiceFromEstimate] = useState(null);       // 見積書から請求書を作るときの下書き

  useEffect(() => { saveAll({ sales, expenses, master, invoices, invoiceSeq, opInvoice, projects, assets, loans, inventory, notes, estimates, estimateSeq }); }, [sales, expenses, master, invoices, invoiceSeq, opInvoice, projects, assets, loans, inventory, notes, estimates, estimateSeq]);
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

  const shared = { screen, setScreen, taxMode, setTaxMode, sales, setSales, expenses, setExpenses, master, setMaster, selMonth, setSelMonth, totalSales, totalExp, grossProfit, opProfit, ar, ap, val, curSales, curExp, showToast, genka, sga, setModal, opInvoice, showOPModal: () => setShowOPModal(true), fiscalMonths, invoices, setInvoices, invoiceSeq, setInvoiceSeq, addCounterparty, estimates, setEstimates, estimateSeq, setEstimateSeq, invoiceFromEstimate, setInvoiceFromEstimate, arTab, setArTab, projects, setProjects,
    assets, setAssets, loans, setLoans, inventory, setInventory, notes, setNotes, assetDraft, setAssetDraft, assetsTab, setAssetsTab,
    openAssetFromExpense: (e) => { setAssetDraft({ name: e.memo || e.client || "", cost: e.amount, acquired: e.date || "", start: String(e.date || "").slice(0,7), expenseId: e.id }); setAssetsTab("assets"); setScreen("assets"); },
    ext: { assets, loans, inventory, startMonth: master.company.fiscalMonth || 4, profile: profileOf(master) } };
  const Screens = { home:HomeScreen, records:RecordsScreen, settings:SettingsScreen, sales:SalesScreen, expenses:ExpenseScreen, pl:PLLearnScreen, projects:ProjectsScreen, bs:BSScreen, assets:AssetsScreen, zeirishi:ZeirishiScreen, ar:ARScreen, cashflow:CashflowScreen, invoice:InvoiceScreen, "invoice-new":InvoiceNew, estimate:EstimateScreen, "estimate-new":EstimateNew, partners:PartnersScreen, master:MasterScreen };
  const Screen = Screens[screen] || HomeScreen;
  const hasDemo = sales.some(r=>r.demo) || expenses.some(r=>r.demo) || master.counterparties.some(c=>c.sample) || projects.some(p=>p.demo);
  const clearDemo = () => { setSales(p=>p.filter(r=>!r.demo)); setExpenses(p=>p.filter(r=>!r.demo)); setProjects(p=>p.filter(x=>!x.demo)); setMaster(m=>({ ...m, counterparties: m.counterparties.filter(c=>!c.sample) })); showToast("見本を消しました。自分の数字を入れられます"); };

  // AIBOU：トーク画面は全画面で出す（経理の各画面はこれまでどおり）
  if (screen === "talk") return (
    <div style={{ fontSize:16, color:T.text, background:"#F2F4F6", minHeight:"100dvh" }}>
      <style>{css}</style>
      {toast && <div role="status" className="toast" style={{ background:toast.type==="error"?T.errSoft:T.okSoft, color:toast.type==="error"?"#B3261E":"#0F5640", borderColor:toast.type==="error"?"#F0B8B3":"#A9D9C3" }}>{toast.msg}</div>}
      <DrillModal modal={modal} onClose={() => setModal(null)} />
      <TalkScreen {...shared} onEntry={setEntry} clearDemo={clearDemo} hasDemo={hasDemo} />
      {entry && <EntrySheet tab={entry} setTab={setEntry} onClose={() => setEntry(null)} {...shared} />}
    </div>
  );

  return (
    <div style={{ fontFamily:font, fontSize:16, color:T.text, display:"flex", minHeight:"100vh", background:T.bg }}>
      <style>{css}</style>
      {toast && <div role="status" className="toast" style={{ background:toast.type==="error"?T.errSoft:T.okSoft, color:toast.type==="error"?"#B3261E":"#0F5640", borderColor:toast.type==="error"?"#F0B8B3":"#A9D9C3" }}>{toast.msg}</div>}
      <DrillModal modal={modal} onClose={() => setModal(null)} />
      {showOPModal && <OPModal onClose={() => setShowOPModal(false)} onContract={() => { setOpInvoice(true); setShowOPModal(false); setScreen("invoice"); showToast("請求書オプションを契約しました！"); }} />}
      <Sidebar screen={screen} setScreen={setScreen} taxMode={taxMode} setTaxMode={setTaxMode} opInvoice={opInvoice} showOPModal={() => setShowOPModal(true)} master={master} selMonth={selMonth} setSelMonth={setSelMonth} fiscalMonths={fiscalMonths} />
      <div className="main-area" style={{ marginLeft:240, flex:1, background:T.bg, minHeight:"100vh", overflowX:"hidden" }}>
        {hasDemo && (
          <div className="demo-bar" role="status">
            <span><b>見本の数字</b>を表示中</span>
            <button onClick={clearDemo}>消して自分の数字で始める</button>
          </div>
        )}
        <Screen key={screen} {...shared} />
      </div>
      <BottomNav screen={screen} setScreen={setScreen} onPlus={() => setEntry("sales")} />
      {entry && <EntrySheet tab={entry} setTab={setEntry} onClose={() => setEntry(null)} {...shared} />}
    </div>
  );
}

// ── HOME ──────────────────────────────────────────────────────────────────────
