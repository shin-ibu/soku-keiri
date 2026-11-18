// AIBOU：長く使うもの（固定資産）・借入金・在庫の画面と、税理士に確認することの画面
import { useState } from "react";
import { color } from "../ui/tokens.js";
import { Head, Tab, Why } from "./ui.jsx";
import {
  ASSET_KINDS, kindOf, TREATMENTS, depreciationYears, depreciationForMonth, bookValueAt, treatmentOptions, defaultMethod, hasDbTable,
  loanBalanceAt, loanPaymentFor, effectiveTreatment, profileOf,
} from "./assets.js";

const inp = { width: "100%", border: `1px solid ${color.line}`, borderRadius: 12, padding: "10px 12px", fontSize: 16, background: "#fff", color: color.ink, boxSizing: "border-box", minHeight: 44 };
const Lbl = ({ t, children, hint }) => (
  <label style={{ display: "grid", gap: 4, fontSize: 14, fontWeight: 700 }}>
    <span>{t}{hint && <span style={{ fontWeight: 400, color: color.sub }}>　{hint}</span>}</span>{children}
  </label>
);
const today = () => new Date().toISOString().slice(0, 10);
const thisMonthLabel = () => { const d = new Date(); return `${d.getFullYear()}年${d.getMonth() + 1}月`; };
const ymToLabel = (ym) => { const [y, m] = String(ym || "").split("-").map(Number); return y && m ? `${y}年${m}月` : ""; };
// ── 資産・借入・在庫 ──────────────────────────────────────────────────────────
export function AssetsScreen(p) {
  const { assets, setAssets, loans, setLoans, inventory, setInventory, expenses, setExpenses, master, fiscalMonths, val, showToast, setScreen, assetDraft, setAssetDraft, assetsTab = "assets", setAssetsTab } = p;
  const tab = assetsTab;
  const setTab = setAssetsTab || (() => {});
  const startMonth = master.company.fiscalMonth || 4;
  const profile = profileOf(master);
  const now = thisMonthLabel();
  const months = fiscalMonths;
  const [open, setOpen] = useState(null);
  const blank = { name: "", kind: "pc", life: 4, cost: "", acquired: today(), start: today().slice(0, 7), treatment: profile.deprMode === "self" ? "" : "pending", method: "", expenseId: null };
  const [form, setForm] = useState(assetDraft ? { ...blank, ...assetDraft } : null);
  const [loanForm, setLoanForm] = useState(null);
  const sf = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const opt = form ? treatmentOptions(form.cost, profile, form.acquired) : null;

  const saveAsset = () => {
    const cost = Number(String(form.cost).replace(/[,，円¥\s]/g, ""));
    if (!form.name.trim() || !cost) { showToast("名前と金額を入れてください", "error"); return; }
    if (profile.deprMode === "self" && !form.treatment && !kindOf(form.kind).land) { showToast("扱いを選んでください", "error"); return; }
    const a = { id: Date.now(), name: form.name.trim(), kind: form.kind, life: Number(form.life || kindOf(form.kind).life), cost, acquired: form.acquired, start: form.start || form.acquired.slice(0, 7), treatment: kindOf(form.kind).land ? "normal" : (form.treatment || "pending"), method: form.method || "", expenseId: form.expenseId || null };
    setAssets((xs) => [...xs, a]);
    if (a.expenseId) setExpenses((es) => es.map((e) => (e.id === a.expenseId ? { ...e, asset: a.id, assetChecked: true } : e)));
    setForm(null); if (setAssetDraft) setAssetDraft(null);
    showToast(a.treatment === "pending" ? "登録しました。扱いは税理士に確認する一覧に入れました" : "登録しました");
  };
  const removeAsset = (a) => {
    if (!window.confirm(`「${a.name}」を一覧から外しますか？（元の経費はそのまま残ります）`)) return;
    setAssets((xs) => xs.filter((x) => x.id !== a.id));
    setExpenses((es) => es.map((e) => (e.asset === a.id ? { ...e, asset: undefined } : e)));
    showToast("外しました");
  };
  const saveLoan = () => {
    const n = (v) => Number(String(v || "").replace(/[,，円¥%\s]/g, ""));
    if (!loanForm.lender.trim() || !n(loanForm.amount)) { showToast("借入先と金額を入れてください", "error"); return; }
    setLoans((ls) => [...ls, { id: Date.now(), lender: loanForm.lender.trim(), amount: n(loanForm.amount), date: loanForm.date, start: loanForm.start, monthly: n(loanForm.monthly), rate: n(loanForm.rate) }]);
    setLoanForm(null); showToast("借入金を登録しました");
  };
  const hasPurchases = expenses.some((e) => e.account === "売上原価");

  return (
    <div className="screen-wrap b-screen">
      <Head title="資産・借入・在庫" onBack={() => setScreen("talk")} right={<button className="btn-sub sm" onClick={() => setScreen("zeirishi")}>税理士に確認</button>} />
      <Tab items={[["assets", "長く使うもの"], ["loans", "借入金"], ["stock", "在庫"]]} value={tab} onChange={setTab} />

      {tab === "assets" && (
        <>
          <div className="card pad" style={{ background: color.priSoft, border: "none" }}>
            <b>長く使うもの（固定資産）とは</b>
            <p style={{ margin: "6px 0 0", fontSize: 14, lineHeight: 1.7 }}>車・パソコン・設備・建物など、何年も使うもの。買ったときにお金は一度に出ますが、費用は使う年数に分けて少しずつ入れます（減価償却）。土地は減らないので費用にしません。</p>
          </div>
          {!form && <button className="btn-main" style={{ marginTop: 0, marginBottom: 16 }} onClick={() => setForm(blank)}>＋ 長く使うものを登録する</button>}
          {form && (
            <div className="card pad" style={{ display: "grid", gap: 12 }}>
              <b>{form.expenseId ? "経費から登録" : "長く使うものを登録"}</b>
              <Lbl t="名前"><input style={inp} value={form.name} onChange={(e) => sf("name", e.target.value)} placeholder="例：社用車（ハイエース）" /></Lbl>
              <Lbl t="種類" hint="使う年数（耐用年数）の案が入ります">
                <select style={inp} value={form.kind} onChange={(e) => { const k = kindOf(e.target.value); setForm((f) => ({ ...f, kind: k.id, life: k.life })); }}>
                  {ASSET_KINDS.map((k) => <option key={k.id} value={k.id}>{k.label}{k.life ? `（${k.life}年）` : ""}</option>)}
                </select>
              </Lbl>
              {!kindOf(form.kind).land && <Lbl t="使う年数（耐用年数）" hint="法律で決まった年数の案。税理士に確かめてください"><input style={inp} inputMode="numeric" value={form.life} onChange={(e) => sf("life", e.target.value.replace(/\D/g, ""))} /></Lbl>}
              <div className="two" style={{ marginBottom: 0 }}>
                <Lbl t="金額"><input style={inp} inputMode="numeric" value={form.cost} onChange={(e) => sf("cost", e.target.value)} placeholder="例：3000000" /></Lbl>
                <Lbl t="買った日"><input style={inp} type="date" value={form.acquired} onChange={(e) => setForm((f) => ({ ...f, acquired: e.target.value, start: e.target.value.slice(0, 7) }))} /></Lbl>
              </div>
              <Lbl t="使い始めた月"><input style={inp} type="month" value={form.start} onChange={(e) => sf("start", e.target.value)} /></Lbl>
              {!kindOf(form.kind).land && (profile.deprMode === "self" ? (
                <>
                  <Lbl t="扱い">
                    <select style={inp} value={form.treatment} onChange={(e) => sf("treatment", e.target.value)}>
                      <option value="">選んでください</option>
                      {opt.opts.map((o) => <option key={o} value={o}>{TREATMENTS[o]}</option>)}
                      <option value="pending">{TREATMENTS.pending}</option>
                    </select>
                  </Lbl>
                  {form.treatment === "normal" && !kindOf(form.kind).sl && (
                    <Lbl t="償却の方法" hint={`届出がない場合：${defaultMethod(form, profile) === "db" ? "定率法" : "定額法"}`}>
                      <select style={inp} value={form.method} onChange={(e) => sf("method", e.target.value)}>
                        <option value="">届出がない場合の方法</option>
                        <option value="sl">定額法（毎年同じ額）</option>
                        {hasDbTable(Number(form.life)) && <option value="db">定率法（最初に多く）</option>}
                      </select>
                    </Lbl>
                  )}
                </>
              ) : (
                <p className="muted" style={{ margin: 0, background: color.well, borderRadius: 12, padding: "10px 12px" }}>扱いは<b>税理士と決めます</b>。それまでは何年かに分ける通常の減価償却で見込みを出し、「税理士に確認すること」に入れておきます。</p>
              ))}
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn-pri" style={{ flex: 1 }} onClick={saveAsset}>登録する</button>
                <button className="btn-sub" onClick={() => { setForm(null); if (setAssetDraft) setAssetDraft(null); }}>やめる</button>
              </div>
            </div>
          )}
          {assets.length === 0 && !form && <div className="card"><div className="empty">まだ登録はありません。10万円以上の経費を入れると、AIBOUが「長く使うものですか？」と確認します。</div></div>}
          <div style={{ display: "grid", gap: 12 }}>
            {assets.map((a) => {
              const k = kindOf(a.kind);
              const depThisFy = months.reduce((t, m) => t + depreciationForMonth(a, m, startMonth, profile), 0);
              const book = bookValueAt(a, now, startMonth, profile);
              const rows = depreciationYears(a, startMonth, profile);
              return (
                <div key={a.id} className="card" style={{ padding: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <b style={{ fontSize: 16 }}>{a.name}</b><span style={{ fontSize: 13, color: color.sub }}>{k.label}{k.land ? "" : `・${a.life}年`}</span>
                    {a.treatment === "pending" && <span className="st warn" style={{ marginLeft: "auto" }}>税理士と決める</span>}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 8, marginTop: 10 }}>
                    {[["取得価額", val(a.cost)], ["今期の減価償却費", k.land ? "なし" : val(depThisFy)], ["今の帳簿価額", val(book)]].map(([l, v]) => (
                      <div key={l} style={{ background: color.well, borderRadius: 10, padding: "8px 10px" }}><div style={{ fontSize: 12, color: color.sub }}>{l}</div><b>{v}</b></div>
                    ))}
                  </div>
                  <p className="muted" style={{ margin: "8px 0 0" }}>{k.land ? "土地は減価償却しません。" : `扱い：${TREATMENTS[a.treatment] || TREATMENTS.normal}${effectiveTreatment(a) === "normal" ? `（${(rows[0] && rows[0].method) === "db" ? "定率法" : "定額法"}）` : ""}`}</p>
                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    {!k.land && <button className="btn-sub sm" onClick={() => setOpen(open === a.id ? null : a.id)} aria-expanded={open === a.id}>{open === a.id ? "年ごとの表を閉じる" : "年ごとの表を見る"}</button>}
                    <button className="btn-del sm" onClick={() => removeAsset(a)}>外す</button>
                  </div>
                  {open === a.id && (
                    <div style={{ marginTop: 10, overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, fontVariantNumeric: "tabular-nums" }}>
                        <thead><tr style={{ color: color.sub }}><th style={{ textAlign: "left", padding: 6 }}>決算期</th><th style={{ textAlign: "right", padding: 6 }}>月数</th><th style={{ textAlign: "right", padding: 6 }}>減価償却費</th><th style={{ textAlign: "right", padding: 6 }}>期末の帳簿価額</th></tr></thead>
                        <tbody>{rows.map((r) => <tr key={r.fy} style={{ borderTop: `1px solid ${color.lineSoft}` }}><td style={{ padding: 6 }}>{r.fy}年{startMonth}月〜</td><td style={{ textAlign: "right", padding: 6 }}>{r.months}</td><td style={{ textAlign: "right", padding: 6 }}>{val(r.amount)}</td><td style={{ textAlign: "right", padding: 6 }}>{val(r.bookEnd)}</td></tr>)}</tbody>
                      </table>
                      <p className="muted" style={{ margin: "6px 0 0" }}>経営判断用の見込みです。正式な計算は税理士の申告で決まります。</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <h2 className="sec-h">言葉の意味</h2>
          <div className="card pad" style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 8, alignItems: "center", fontSize: 15 }}>
            <span>減価償却</span><Why label="減価償却">{"長く使うものの金額を、使う年数に分けて少しずつ費用にすること。\n買った年に全額を費用にしないので、買った月だけ大赤字に見えることがありません。"}</Why>
            <span>定額法・定率法</span><Why label="定額法と定率法">{"定額法：毎年同じ額を費用にする。\n定率法：最初の年に多く、だんだん少なく費用にする。\n届出をしていない場合、法人の車・機械・備品は定率法、個人事業主と建物は定額法です。"}</Why>
            <span>帳簿価額</span><Why label="帳簿価額">{"取得価額から、これまでに費用にした減価償却費を引いた残り。貸借対照表の「固定資産」に載ります。"}</Why>
            <span>一括償却資産・少額の特例</span><Why label="一括償却資産と少額の特例">{"10万円以上20万円未満なら、3年で均等に費用にできます（一括償却資産）。\n青色申告の中小企業・個人事業主は、2026年4月以後に買った40万円未満のものを、その年に全額費用にできます（年300万円まで）。\nどちらにするかは税理士と決めましょう。"}</Why>
          </div>
        </>
      )}

      {tab === "loans" && (
        <>
          <div className="card pad" style={{ background: color.priSoft, border: "none" }}>
            <b>借入金とは</b>
            <p style={{ margin: "6px 0 0", fontSize: 14, lineHeight: 1.7 }}>銀行などから借りたお金。返す元金は費用ではなく借入金（負債）を減らします。費用になるのは利息だけで、損益計算書の「営業外費用」に入ります。</p>
          </div>
          {!loanForm && <button className="btn-main" style={{ marginTop: 0, marginBottom: 16 }} onClick={() => setLoanForm({ lender: "", amount: "", date: today(), start: today().slice(0, 7), monthly: "", rate: "" })}>＋ 借入金を登録する</button>}
          {loanForm && (
            <div className="card pad" style={{ display: "grid", gap: 12 }}>
              <Lbl t="借入先"><input style={inp} value={loanForm.lender} onChange={(e) => setLoanForm({ ...loanForm, lender: e.target.value })} placeholder="例：〇〇信用金庫" /></Lbl>
              <div className="two" style={{ marginBottom: 0 }}>
                <Lbl t="借りた金額"><input style={inp} inputMode="numeric" value={loanForm.amount} onChange={(e) => setLoanForm({ ...loanForm, amount: e.target.value })} placeholder="例：3000000" /></Lbl>
                <Lbl t="借りた日"><input style={inp} type="date" value={loanForm.date} onChange={(e) => setLoanForm({ ...loanForm, date: e.target.value })} /></Lbl>
              </div>
              <div className="two" style={{ marginBottom: 0 }}>
                <Lbl t="毎月返す元金"><input style={inp} inputMode="numeric" value={loanForm.monthly} onChange={(e) => setLoanForm({ ...loanForm, monthly: e.target.value })} placeholder="例：50000" /></Lbl>
                <Lbl t="年利（%）"><input style={inp} inputMode="decimal" value={loanForm.rate} onChange={(e) => setLoanForm({ ...loanForm, rate: e.target.value })} placeholder="例：1.5" /></Lbl>
              </div>
              <Lbl t="最初に返す月"><input style={inp} type="month" value={loanForm.start} onChange={(e) => setLoanForm({ ...loanForm, start: e.target.value })} /></Lbl>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn-pri" style={{ flex: 1 }} onClick={saveLoan}>登録する</button>
                <button className="btn-sub" onClick={() => setLoanForm(null)}>やめる</button>
              </div>
            </div>
          )}
          {loans.length === 0 && !loanForm && <div className="card"><div className="empty">借入金の登録はありません。</div></div>}
          <div style={{ display: "grid", gap: 12 }}>
            {loans.map((l) => {
              const bal = loanBalanceAt(l, now);
              const intFy = months.reduce((t, m) => t + loanPaymentFor(l, m).interest, 0);
              return (
                <div key={l.id} className="card" style={{ padding: 16 }}>
                  <b style={{ fontSize: 16 }}>{l.lender}</b>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 8, marginTop: 10 }}>
                    {[["借りた金額", val(l.amount)], ["今の残高", val(bal)], ["今期の利息（見込み）", val(intFy)]].map(([t, v]) => (
                      <div key={t} style={{ background: color.well, borderRadius: 10, padding: "8px 10px" }}><div style={{ fontSize: 12, color: color.sub }}>{t}</div><b>{v}</b></div>
                    ))}
                  </div>
                  <p className="muted" style={{ margin: "8px 0 0" }}>毎月の元金 {val(l.monthly)}・年利 {l.rate}%・{ymToLabel(l.start)}から返済</p>
                  <button className="btn-del sm" style={{ marginTop: 8 }} onClick={() => { if (window.confirm(`「${l.lender}」の借入金を外しますか？`)) { setLoans((ls) => ls.filter((x) => x.id !== l.id)); showToast("外しました"); } }}>外す</button>
                </div>
              );
            })}
          </div>
          <p className="muted">利息は月初の残高×年利÷12の見込みです。正確な額は返済予定表で確かめてください。</p>
        </>
      )}

      {tab === "stock" && (
        <>
          <div className="card pad" style={{ background: color.priSoft, border: "none" }}>
            <b>在庫とは</b>
            <p style={{ margin: "6px 0 0", fontSize: 14, lineHeight: 1.7 }}>仕入れて、まだ売れていない商品や材料。売れるまでは費用ではなく資産です。月末に「いくら分残っているか」を1つの数字で入れると、売上原価を「期首の在庫＋仕入れ−期末の在庫」で正しく計算し直します。</p>
          </div>
          {!hasPurchases && <p className="muted">仕入れ（勘定科目「売上原価」）の記録がまだないので、在庫は入れなくてもかまいません。</p>}
          <div className="card list">
            {months.filter((m) => { const [y, mm] = m.match(/\d+/g).map(Number); const [ny, nm] = now.match(/\d+/g).map(Number); return y * 12 + mm <= ny * 12 + nm; }).map((m) => (
              <div key={m} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", borderBottom: `1px solid ${color.lineSoft}` }}>
                <span style={{ width: 110, fontWeight: 700 }}>{m}末</span>
                <input aria-label={`${m}末の在庫`} style={{ ...inp, flex: 1 }} inputMode="numeric" value={inventory[m] ?? ""} placeholder="未入力" onChange={(e) => { const v = e.target.value.replace(/[^\d]/g, ""); setInventory((iv) => { const n = { ...iv }; if (v === "") delete n[m]; else n[m] = Number(v); return n; }); }} />
              </div>
            ))}
          </div>
          <p className="muted">数え方（仕入れた値段で数える、など）は税理士に確認してください。</p>
        </>
      )}
    </div>
  );
}

// ── 税理士に確認すること ──────────────────────────────────────────────────────
export function ZeirishiScreen(p) {
  const { assets, setAssets, notes, setNotes, master, setMaster, fiscalMonths, val, showToast, setScreen } = p;
  const startMonth = master.company.fiscalMonth || 4;
  const profile = profileOf(master);
  const [q, setQ] = useState("");
  const taxRate = Number(master.company.taxRate || 25);
  const pendingAssets = assets.filter((a) => a.treatment === "pending");
  const fy0 = fiscalMonths[0];
  const smallUsed = assets.filter((a) => a.treatment === "small" && fiscalMonths.includes(ymToLabel(a.start))).reduce((t, a) => t + Number(a.cost || 0), 0);
  const openNotes = notes.filter((n) => !n.answered);
  const setCo = (k, v) => setMaster((m) => ({ ...m, company: { ...m.company, [k]: v } }));

  const answer = (a, t, method) => {
    setAssets((xs) => xs.map((x) => (x.id === a.id ? { ...x, treatment: t, method: method || x.method || "" } : x)));
    showToast(`「${a.name}」を「${TREATMENTS[t].replace(/（.*）/, "")}${method ? `（${method === "db" ? "定率法" : "定額法"}）` : ""}」にしました`);
  };
  const shareText = () => {
    const lines = [`【税理士さんへの確認事項】${master.company.name || ""}　${new Date().toLocaleDateString("ja-JP")}`, ""];
    pendingAssets.forEach((a, i) => {
      const k = kindOf(a.kind);
      lines.push(`${i + 1}. 長く使うものの扱い：${a.name}（${k.label}）`);
      lines.push(`   取得価額 ${Number(a.cost).toLocaleString("ja-JP")}円／買った日 ${a.acquired}／使い始め ${ymToLabel(a.start)}／耐用年数の案 ${a.life}年`);
      lines.push(`   候補：${treatmentOptions(a.cost, profile, a.acquired).opts.map((o) => TREATMENTS[o]).join("・")}`);
    });
    openNotes.forEach((n, i) => lines.push(`${pendingAssets.length + i + 1}. ${n.text}`));
    lines.push("", `前提：${profile.type}／青色申告 ${profile.aoiro === null ? "未確認" : profile.aoiro ? "あり" : "なし"}／従業員 ${profile.employees === "" ? "未確認" : `${profile.employees}人`}／今期すでに少額の特例 ${smallUsed.toLocaleString("ja-JP")}円`);
    const text = lines.join("\n");
    try { navigator.clipboard.writeText(text); showToast("確認事項をコピーしました。メールやLINEに貼り付けて送れます"); }
    catch { showToast("コピーできませんでした", "error"); }
  };
  const addNote = () => { if (!q.trim()) return; setNotes((ns) => [...ns, { id: Date.now(), text: q.trim(), answered: false, answer: "" }]); setQ(""); showToast("一覧に入れました"); };

  return (
    <div className="screen-wrap b-screen">
      <Head title="税理士に確認すること" onBack={() => setScreen("talk")} right={<button className="btn-pri sm" onClick={shareText}>まとめてコピー</button>} />
      <p className="muted" style={{ marginTop: 0 }}>判断が必要なことは、ここにたまります。打ち合わせのときにこの画面を見せるか、「まとめてコピー」で送ってください。答えが出たら、ボタンで反映できます。</p>

      <h2 className="sec-h">前提（毎月確認します）</h2>
      <div className="card pad" style={{ display: "grid", gap: 12 }}>
        <div className="two" style={{ marginBottom: 0 }}>
          <Lbl t="法人／個人事業主"><select style={inp} value={profile.type} onChange={(e) => setCo("type", e.target.value)}><option>法人</option><option>個人事業主</option></select></Lbl>
          <Lbl t="青色申告"><select style={inp} value={profile.aoiro === null ? "" : profile.aoiro ? "yes" : "no"} onChange={(e) => setCo("aoiro", e.target.value === "" ? undefined : e.target.value === "yes")}><option value="">分からない</option><option value="yes">している</option><option value="no">していない</option></select></Lbl>
        </div>
        <div className="two" style={{ marginBottom: 0 }}>
          <Lbl t="従業員数（常時）"><input style={inp} inputMode="numeric" value={profile.employees} onChange={(e) => setCo("employees", e.target.value.replace(/\D/g, ""))} placeholder="例：3" /></Lbl>
          <Lbl t="減価償却の扱い"><select style={inp} value={profile.deprMode} onChange={(e) => setCo("deprMode", e.target.value)}><option value="zeirishi">税理士と決める</option><option value="self">自分で決める</option></select></Lbl>
        </div>
      </div>

      <h2 className="sec-h">長く使うものの扱い　<span className="muted">{pendingAssets.length}件</span></h2>
      {pendingAssets.length === 0 && <div className="card"><div className="empty">判断待ちのものはありません。</div></div>}
      <div style={{ display: "grid", gap: 12 }}>
        {pendingAssets.map((a) => {
          const k = kindOf(a.kind);
          const o = treatmentOptions(a.cost, profile, a.acquired);
          const fyDep = (method) => fiscalMonths.reduce((t, m) => t + depreciationForMonth({ ...a, treatment: "normal", method }, m, startMonth, profile), 0);
          const canChoose = !k.sl && hasDbTable(Number(a.life));
          const dm = defaultMethod(a, profile);
          const normalThisFy = fyDep(a.method || dm);
          const fullThisFy = fiscalMonths.includes(ymToLabel(a.start)) ? Number(a.cost) : 0;
          const diff = fullThisFy - normalThisFy;
          return (
            <div key={a.id} className="card" style={{ padding: 16 }}>
              <b style={{ fontSize: 16 }}>{a.name}</b>
              <p className="muted" style={{ margin: "4px 0 0" }}>{k.label}・取得価額 {val(a.cost)}・{a.acquired}に購入・{ymToLabel(a.start)}から使用・耐用年数の案 {a.life}年</p>
              <div style={{ background: color.well, borderRadius: 12, padding: "10px 12px", marginTop: 10, fontSize: 14, lineHeight: 1.7 }}>
                <b>判断の材料（今期 {fy0}〜）</b><br />
                {canChoose ? <>
                  ・何年かに分ける場合、今期の費用は 定率法なら {val(fyDep("db"))}、定額法なら {val(fyDep("sl"))}<br />
                  ・届出をしていなければ{dm === "db" ? "定率法" : "定額法"}になります（{profile.type}）<br />
                </> : <>・何年かに分ける場合（定額法）、今期の費用は {val(normalThisFy)}<br /></>}
                {o.opts.includes("small") && <>・少額の特例で今年に全額なら、今期の費用は {val(fullThisFy)}（利益が {val(diff)} 減り、税金はおよそ {val(Math.round((diff * taxRate) / 100))} 減る見込み）<br /></>}
                {o.opts.includes("lump3") && <>・一括償却資産なら、毎年 {val(Math.floor(a.cost / 3))} ずつ3年<br /></>}
                {o.opts.includes("small") && <>・今期すでに特例を使った合計：{val(smallUsed)}（年300万円まで）<br /></>}
                {!o.canSmall && <>・青色申告・従業員数が未確認か対象外のため、少額の特例は候補に入れていません<br /></>}
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                <span style={{ width: "100%", fontSize: 13, fontWeight: 700 }}>税理士の答え</span>
                {o.opts.filter((t) => t !== "expense" && t !== "normal").map((t) => <button key={t} className="btn-pri sm" onClick={() => answer(a, t)}>{TREATMENTS[t].replace(/（.*）/, "")}</button>)}
                {canChoose
                  ? <><button className="btn-sub sm" onClick={() => answer(a, "normal", "db")}>通常の減価償却（定率法）</button><button className="btn-sub sm" onClick={() => answer(a, "normal", "sl")}>通常の減価償却（定額法）</button></>
                  : <button className="btn-sub sm" onClick={() => answer(a, "normal", "sl")}>通常の減価償却（定額法）</button>}
              </div>
            </div>
          );
        })}
      </div>

      <h2 className="sec-h">聞きたいこと　<span className="muted">{openNotes.length}件</span></h2>
      <div className="card pad" style={{ display: "flex", gap: 8 }}>
        <input style={{ ...inp, flex: 1 }} value={q} onChange={(e) => setQ(e.target.value)} placeholder="例：この交際費は全額経費にできる？" aria-label="税理士に聞きたいこと" />
        <button className="btn-pri sm" onClick={addNote}>入れる</button>
      </div>
      <div className="card list">
        {notes.length === 0 && <div className="empty">まだありません。AIBOUに「税理士に〇〇を聞きたい」と話しても入ります。</div>}
        {notes.map((n) => (
          <div key={n.id} style={{ padding: "12px 16px", borderBottom: `1px solid ${color.lineSoft}`, display: "grid", gap: 6 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}><span className={n.answered ? "st ok" : "st warn"}>{n.answered ? "回答済" : "未回答"}</span><b style={{ fontSize: 15 }}>{n.text}</b></div>
            <input style={inp} value={n.answer} placeholder="税理士の答えをメモ" aria-label="税理士の答え" onChange={(e) => setNotes((ns) => ns.map((x) => (x.id === n.id ? { ...x, answer: e.target.value } : x)))} />
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn-sub sm" onClick={() => setNotes((ns) => ns.map((x) => (x.id === n.id ? { ...x, answered: !x.answered } : x)))}>{n.answered ? "未回答に戻す" : "回答済にする"}</button>
              <button className="btn-del sm" onClick={() => setNotes((ns) => ns.filter((x) => x.id !== n.id))}>消す</button>
            </div>
          </div>
        ))}
      </div>
      <p className="muted">AIBOUは判断の材料をそろえるところまでを行います。税務の判断と申告は税理士の仕事です。</p>
    </div>
  );
}
