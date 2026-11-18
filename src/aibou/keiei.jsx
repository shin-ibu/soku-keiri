// AIBOU 経営の画面：案件・損益計算書（PL）・貸借対照表（BS）
// 数字の名前と式は機能一覧14章「案件と利益の定義」に合わせる。粗利と利益を混ぜない。
import { useState } from "react";
import { color } from "../ui/tokens.js";
import { PROJECT_STATUSES, ACTIVE, COMMON, sum, useProjectNumbers, openingCashOf } from "./keieiLogic.js";

const pct = (a, b) => (b ? `${Math.round((a / b) * 1000) / 10}%` : "—");

const K = {
  ink: color.ink, sub: color.sub, line: color.line, soft: color.bg,
  pri: color.pri, priSoft: color.priSoft, ok: color.ok, okSoft: color.okSoft, warn: color.warnInk, warnSoft: color.warnSoft, err: color.err, errSoft: color.errSoft,
};
// 入力欄：案件（案件あり／共通費（案件なし）／未設定）
export function ProjectField({ kind, value, suggestion, onChange, projects, setProjects, client, inputStyle, compact }) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const shown = value !== undefined ? value : suggestion ? suggestion.value : null;
  const enc = (v) => (v === null || v === undefined ? "" : String(v));
  const dec = (s) => (s === "" ? null : s === COMMON ? COMMON : Number(s));
  const active = projects.filter(ACTIVE);
  const others = projects.filter((p) => !ACTIVE(p));
  const add = () => {
    const n = name.trim(); if (!n) return;
    const p = { id: Date.now(), name: n, client: client || "", status: "進行中", created: new Date().toISOString().slice(0, 10) };
    setProjects((ps) => [...ps, p]); onChange(p.id); setName(""); setAdding(false);
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <select aria-label="案件" style={inputStyle} value={enc(shown)} onChange={(e) => (e.target.value === "__new" ? setAdding(true) : onChange(dec(e.target.value)))}>
        <option value="">未設定（あとで決める）</option>
        {active.length > 0 && <optgroup label="見積中・進行中">{active.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</optgroup>}
        {others.length > 0 && <optgroup label="完了・失注">{others.map((p) => <option key={p.id} value={p.id}>{p.name}（{p.status}）</option>)}</optgroup>}
        <option value={COMMON}>{kind === "sale" ? "案件なし（その他の売上）" : "共通費（どの案件にも属さない）"}</option>
        {!compact && <option value="__new">＋ 新しい案件を作る</option>}
      </select>
      {value === undefined && suggestion && <span style={{ fontSize: 13, color: K.ok, background: K.okSoft, borderRadius: 8, padding: "4px 10px", alignSelf: "flex-start" }}>AIBOUの提案：{suggestion.why}</span>}
      {adding && (
        <div style={{ display: "flex", gap: 8 }}>
          <input style={{ ...inputStyle, flex: 1 }} value={name} onChange={(e) => setName(e.target.value)} placeholder="案件名（例：鈴木様 キッチン改修）" aria-label="新しい案件名" autoFocus />
          <button type="button" className="btn-sub sm" onClick={add}>作る</button>
          <button type="button" className="btn-sub sm" onClick={() => { setAdding(false); setName(""); }}>やめる</button>
        </div>
      )}
    </div>
  );
}

const Back = ({ onClick }) => (
  <button className="icon-btn" aria-label="もどる" onClick={onClick}>
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>
  </button>
);
const Head = ({ title, onBack, right }) => (<div className="scr-head">{onBack ? <Back onClick={onBack} /> : <span />}<h1>{title}</h1>{right || <span />}</div>);
const Tab = ({ items, value, onChange }) => (
  <div className="seg" role="tablist">{items.map(([id, label]) => <button key={id} role="tab" aria-selected={value === id} className={value === id ? "on" : ""} onClick={() => onChange(id)}>{label}</button>)}</div>
);
// 「これは何？」の説明
function Why({ label, children }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" aria-label={`${label}とは`} aria-expanded={open} onClick={() => setOpen((v) => !v)} style={{ width: 22, height: 22, borderRadius: 11, border: "none", background: K.priSoft, color: K.pri, fontSize: 13, fontWeight: 700, cursor: "pointer", padding: 0, flexShrink: 0 }}>?</button>
      {open && <div style={{ gridColumn: "1 / -1", fontSize: 14, lineHeight: 1.7, color: "#1E3A6E", background: K.priSoft, borderRadius: 8, padding: "8px 12px", whiteSpace: "pre-line" }}>{children}</div>}
    </>
  );
}
const Num = ({ v, onClick, style }) => <button type="button" onClick={onClick} className="num" style={{ border: "none", background: "none", padding: 0, font: "inherit", cursor: "pointer", borderBottom: `1.5px dashed ${K.line}`, color: "inherit", ...style }}>{v}</button>;

// ── 案件 ──────────────────────────────────────────────────────────────────────
export function ProjectsScreen(p) {
  const { projects, setProjects, sales, setSales, expenses, setExpenses, val, setModal, setScreen, fiscalMonths, master, showToast } = p;
  const months = fiscalMonths;
  const num = useProjectNumbers({ projects, sales, expenses, months });
  const [open, setOpen] = useState(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", client: "", status: "進行中" });
  const fiscalNum = master.company.fiscalNum || 1;
  const setRec = (kind, id, project) => {
    (kind === "sale" ? setSales : setExpenses)((rs) => rs.map((r) => (r.id === id ? { ...r, project } : r)));
    showToast(project === null ? "未設定に戻しました" : "案件を設定しました");
  };
  const addProject = () => {
    if (!form.name.trim()) { showToast("案件名を入れてください", "error"); return; }
    setProjects((ps) => [...ps, { id: Date.now(), name: form.name.trim(), client: form.client.trim(), status: form.status, created: new Date().toISOString().slice(0, 10) }]);
    setForm({ name: "", client: "", status: "進行中" }); setAdding(false); showToast("案件を作りました");
  };
  const unsetCount = num.unsetS.length + num.unsetE.length;
  const inp = { width: "100%", border: `1px solid ${K.line}`, borderRadius: 8, padding: "10px 12px", fontSize: 16, background: "#fff", color: K.ink, boxSizing: "border-box", minHeight: 44 };
  const recRow = (kind, r) => (
    <div key={`${kind}-${r.id}`} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 8, padding: "12px 16px", borderBottom: `1px solid #EEF2F6`, alignItems: "center" }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 700 }}>{kind === "sale" ? "売上" : "経費"}・{r.client}</div>
        <div style={{ fontSize: 13, color: K.sub }}>{r.month}分{r.account ? `・${r.account}` : ""}{r.memo ? `・${r.memo}` : ""}</div>
      </div>
      <div style={{ fontWeight: 700, textAlign: "right" }}>{val(r.amount)}</div>
      <div style={{ gridColumn: "1 / -1" }}>
        <ProjectField kind={kind} value={r.project === undefined ? null : r.project} projects={projects} setProjects={setProjects} client={r.client} inputStyle={inp} compact onChange={(v) => setRec(kind, r.id, v)} />
      </div>
    </div>
  );
  const detail = (r) => ({
    title: `${r.p.name}　案件粗利`, amount: val(r.gross),
    formula: `案件の売上 ${val(r.sale)}\nー 案件原価 ${val(r.cost)}\n＝ 案件粗利 ${val(r.gross)}\n\n共通費の配賦 ${val(r.alloc)}（売上の比率で割り振り）\n＝ 案件利益 ${val(r.profit)}`,
    rows: [...r.ps.map((x) => ({ 種類: "売上", 相手先: x.client, 何月分: x.month, 金額: val(x.amount) })), ...r.pe.map((x) => ({ 種類: "原価", 相手先: x.client, 何月分: x.month, 金額: val(x.amount) }))],
    note: "経営判断用の数字です。決算書の粗利とは分け方が違います。",
  });

  return (
    <div className="screen-wrap b-screen">
      <Head title="案件" onBack={() => setScreen("talk")} right={<button className="btn-sub sm" onClick={() => setScreen("partners")}>取引先</button>} />
      <p className="muted" style={{ margin: "0 0 12px" }}>第{fiscalNum}期（{months[0]}〜{months[11]}）の数字です。経営判断用の数字で、決算書の粗利とは分け方が違います。</p>

      {unsetCount > 0 && (
        <>
          <h2 className="sec-h" style={{ color: K.warn }}>案件が未設定　{unsetCount}件</h2>
          <p className="muted" style={{ marginTop: 0 }}>どの案件のものか決めてください。決めるまでは、案件の数字に入りません。</p>
          <div className="card list" style={{ background: "#FFFDF7" }}>
            {num.unsetS.map((r) => recRow("sale", r))}
            {num.unsetE.map((r) => recRow("expense", r))}
          </div>
        </>
      )}

      <h2 className="sec-h" style={{ justifyContent: "space-between" }}><span>案件ごとの数字</span><button className="btn-sub sm" onClick={() => setAdding((v) => !v)}>＋ 新しい案件</button></h2>
      {adding && (
        <div className="card pad" style={{ display: "grid", gap: 10 }}>
          <label style={{ display: "grid", gap: 4, fontWeight: 700, fontSize: 14 }}>案件名<input style={inp} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="例：鈴木様 キッチン改修" /></label>
          <label style={{ display: "grid", gap: 4, fontWeight: 700, fontSize: 14 }}>取引先<input style={inp} list="aibou-cps" value={form.client} onChange={(e) => setForm({ ...form, client: e.target.value })} placeholder="名前の一部を入れると出てきます" /></label>
          <datalist id="aibou-cps">{(master.counterparties || []).map((c) => <option key={c.id} value={c.name} />)}</datalist>
          <label style={{ display: "grid", gap: 4, fontWeight: 700, fontSize: 14 }}>状態<select style={inp} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>{PROJECT_STATUSES.map((s) => <option key={s}>{s}</option>)}</select></label>
          <button className="btn-main" style={{ marginTop: 4 }} onClick={addProject}>この案件を作る</button>
        </div>
      )}
      {projects.length === 0 && <div className="card"><div className="empty">まだ案件はありません。「＋ 新しい案件」から作るか、売上・経費の入力中に作れます。</div></div>}
      <div style={{ display: "grid", gap: 12 }}>
        {num.rows.map((r) => (
          <div key={r.p.id} className="card" style={{ padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <b style={{ fontSize: 16 }}>{r.p.name}</b>
              <span style={{ fontSize: 13, color: K.sub }}>{r.p.client}</span>
              <select aria-label={`${r.p.name}の状態`} value={r.p.status} onChange={(e) => setProjects((ps) => ps.map((x) => (x.id === r.p.id ? { ...x, status: e.target.value } : x)))} style={{ marginLeft: "auto", border: `1px solid ${K.line}`, borderRadius: 999, padding: "4px 10px", fontSize: 13, background: ACTIVE(r.p) ? K.priSoft : K.soft, color: K.ink }}>
                {PROJECT_STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 8, marginTop: 12 }}>
              {[["案件の売上", r.sale], ["案件原価", r.cost], ["案件粗利", r.gross]].map(([l, v]) => (
                <div key={l} style={{ background: K.soft, borderRadius: 8, padding: "8px 10px" }}><div style={{ fontSize: 12, color: K.sub }}>{l}</div><div style={{ fontWeight: 700 }}><Num v={val(v)} onClick={() => setModal(detail(r))} /></div></div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 10, fontSize: 14 }}>
              <span>案件粗利率 <b style={{ color: r.sale && r.gross / r.sale < 0.2 ? K.warn : K.ok }}>{pct(r.gross, r.sale)}</b></span>
              <span>共通費配賦後の案件利益 <b>{val(r.profit)}</b>（案件利益率 {pct(r.profit, r.sale)}）</span>
            </div>
            <button type="button" className="btn-sub sm" style={{ marginTop: 10 }} onClick={() => setOpen(open === r.p.id ? null : r.p.id)} aria-expanded={open === r.p.id}>{open === r.p.id ? "明細を閉じる" : `明細を見る（${r.ps.length + r.pe.length}件）`}</button>
            {open === r.p.id && <div className="card list" style={{ marginTop: 10 }}>{r.ps.map((x) => recRow("sale", x))}{r.pe.map((x) => recRow("expense", x))}{r.ps.length + r.pe.length === 0 && <div className="empty">この期間の記録はまだありません</div>}</div>}
          </div>
        ))}
      </div>

      <h2 className="sec-h">共通費　<span className="muted">{val(num.commonTotal)}（{num.common.length}件）</span></h2>
      <div className="card pad">
        <p className="muted" style={{ margin: 0 }}>家賃や通信費など、どの案件にも属さない経費です。各案件の売上の比率で割り振って「共通費配賦後の案件利益」を出しています（この期間に案件の売上がないときは割り振りません）。</p>
      </div>

      <h2 className="sec-h">言葉の意味</h2>
      <div className="card pad" style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 8, alignItems: "center", fontSize: 15 }}>
        <span>案件原価</span><Why label="案件原価">{"その案件のためだけに使った経費（材料、外注、その案件の交通費など）。\n勘定科目が何であっても、案件に紐付けた経費はここに入ります。"}</Why>
        <span>案件粗利・案件粗利率</span><Why label="案件粗利">{"案件粗利 ＝ 案件の売上 − 案件原価\n案件粗利率 ＝ 案件粗利 ÷ 案件の売上\nその仕事自体でいくら残ったか、仕事どうしの利幅を比べる数字です。"}</Why>
        <span>共通費・配賦</span><Why label="共通費と配賦">{"共通費：どの案件にも属さない経費（家賃・通信費など）。\n配賦：共通費を案件に割り振ること。ここでは案件の売上の比率で割り振ります。"}</Why>
        <span>案件利益・案件利益率</span><Why label="案件利益">{"案件利益 ＝ 案件粗利 − 配賦した共通費\n家賃なども含めて、その仕事が本当に儲かったかを見る数字です。"}</Why>
      </div>
    </div>
  );
}

// ── 損益計算書（PL） ──────────────────────────────────────────────────────────
export function PLLearnScreen(p) {
  const { setScreen, selMonth, setSelMonth, val, setModal, master, fiscalMonths, sales, expenses } = p;
  const [mode, setMode] = useState("monthly");
  const fiscalNum = master.company.fiscalNum || 1;
  const months = mode === "annual" ? fiscalMonths : [selMonth];
  const S = sales.filter((r) => months.includes(r.month)), E = expenses.filter((r) => months.includes(r.month));
  const revenue = sum(S);
  const cogsRows = E.filter((e) => e.account === "売上原価");
  const cogs = sum(cogsRows);
  const gross = revenue - cogs;
  const sgaByAcc = master.accounts.filter((a) => a.category === "sga").map((a) => ({ label: a.label, rows: E.filter((e) => e.account === a.label) })).map((x) => ({ ...x, v: sum(x.rows) })).filter((x) => x.v);
  const other = E.filter((e) => e.account !== "売上原価" && !master.accounts.some((a) => a.category === "sga" && a.label === e.account));
  if (other.length) sgaByAcc.push({ label: "その他", rows: other, v: sum(other) });
  const sga = sgaByAcc.reduce((s, x) => s + x.v, 0);
  const op = gross - sga;
  const nonOp = 0;
  const ordinary = op + nonOp;
  const taxRate = Number(master.company.taxRate || 25);
  const tax = ordinary > 0 ? Math.round((ordinary * taxRate) / 100) : 0;
  const net = ordinary - tax;
  const period = mode === "annual" ? `第${fiscalNum}期 年間累計（${fiscalMonths[0]}〜${fiscalMonths[11]}）` : `${selMonth}分`;

  const lines = [
    { k: "rev", label: "売上高", v: revenue, kind: "total", why: "本業で得た収入の合計。ここから費用を順に引いて、5つの利益を出していきます。", rows: S.map((r) => ({ 相手先: r.client, 何月分: r.month, 金額: val(r.amount) })) },
    { k: "cogs", label: "売上原価", v: cogs, kind: "minus", why: "売上を作るために直接かかった費用（仕入れ・材料など）。勘定科目「売上原価」の合計です。", rows: cogsRows.map((r) => ({ 相手先: r.client, 何月分: r.month, 金額: val(r.amount) })) },
    { k: "gross", label: "売上総利益（粗利）", v: gross, kind: "profit", ratio: ["粗利率", gross], why: "売上高 − 売上原価。商品やサービスそのものが稼ぐ力です。\n粗利率が下がったら、値付けか仕入れを見直すサインです。", formula: `売上高 ${val(revenue)}\nー 売上原価 ${val(cogs)}\n＝ ${val(gross)}` },
    { k: "sga", label: "販売費及び一般管理費（販管費）", v: sga, kind: "minus", why: "会社を動かすためにかかる費用（家賃・通信・広告・外注など）。売上原価以外の経費です。", rows: sgaByAcc.map((x) => ({ 科目: x.label, 件数: `${x.rows.length}件`, 金額: val(x.v) })), sub: sgaByAcc },
    { k: "op", label: "営業利益", v: op, kind: "profit", ratio: ["営業利益率", op], why: "売上総利益 − 販管費。本業でいくら儲かったかを示す、いちばん大事な利益です。", formula: `売上総利益 ${val(gross)}\nー 販管費 ${val(sga)}\n＝ ${val(op)}` },
    { k: "nonop", label: "営業外収益・費用", v: nonOp, kind: "minus", why: "本業以外のお金の出入り（預金の利息、借入の支払利息など）。\n今のAIBOUではまだ記録していないので 0 円です。" },
    { k: "ord", label: "経常利益", v: ordinary, kind: "profit", why: "営業利益 ± 営業外の損益。借入の利息なども含めた、ふだんの事業活動の儲けです。", formula: `営業利益 ${val(op)}\n± 営業外 ${val(nonOp)}\n＝ ${val(ordinary)}` },
    { k: "tax", label: `法人税等（見込み・税率${taxRate}%）`, v: tax, kind: "minus", why: `利益にかかる税金の概算です。経常利益 × ${taxRate}%（会社・口座・科目の設定）で計算しています。\n実際の税額は税理士の申告で決まります。`, formula: `経常利益 ${val(ordinary)} × ${taxRate}%\n＝ ${val(tax)}（利益がマイナスなら 0）` },
    { k: "net", label: "当期純利益（見込み）", v: net, kind: "profit", big: true, why: "最終的に会社に残る利益。貸借対照表の「利益の積み上げ（純資産）」を増やします。", formula: `経常利益 ${val(ordinary)}\nー 法人税等 ${val(tax)}\n＝ ${val(net)}` },
  ];
  const downloadCsv = () => {
    const out = [["項目", "金額（円）"], ...lines.flatMap((l) => [[l.label, l.v], ...(l.sub || []).map((x) => [`　${x.label}`, x.v])])];
    const csv = "﻿" + [`損益計算書 ${period}`, ...out.map((r) => r.join(","))].join("\r\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); a.download = `損益計算書_${mode === "annual" ? `第${fiscalNum}期` : selMonth}.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  return (
    <div className="screen-wrap b-screen">
      <Head title="損益計算書（PL）" onBack={() => setScreen("talk")} right={<button className="btn-sub sm" onClick={downloadCsv}>CSVで保存</button>} />
      <div className="card pad" style={{ background: K.priSoft, border: "none" }}>
        <b>損益計算書とは</b>
        <p style={{ margin: "6px 0 0", fontSize: 14, lineHeight: 1.7 }}>一定の期間（月・年）の成績表です。売上から費用を段階的に引いて、性格の違う5つの利益を出します。行の「?」を押すと、その数字の意味が出ます。</p>
      </div>
      <Tab items={[["monthly", "月ごと"], ["annual", "1年の累計"]]} value={mode} onChange={setMode} />
      {mode === "monthly" && (
        <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, fontSize: 14, fontWeight: 700 }}>何月分
          <select value={selMonth} onChange={(e) => setSelMonth(e.target.value)} style={{ border: `1px solid ${K.line}`, borderRadius: 8, padding: "8px 10px", fontSize: 16 }}>{fiscalMonths.map((m) => <option key={m} value={m}>{m}分</option>)}</select>
        </label>
      )}
      <div className="card" style={{ overflow: "hidden" }}>
        <div style={{ padding: "10px 16px", background: K.soft, fontSize: 13, color: K.sub, fontWeight: 700 }}>{period}</div>
        {lines.map((l) => (
          <div key={l.k} style={{ borderTop: `1px solid #EEF2F6`, background: l.kind === "profit" ? (l.big ? "#DDE6F6" : "#F1F5FB") : "#fff" }}>
            <div style={{ display: "grid", gridTemplateColumns: "28px minmax(0,1fr) auto auto", gap: 8, alignItems: "center", padding: "12px 16px" }}>
              <span aria-hidden="true" style={{ fontWeight: 700, color: K.sub, textAlign: "center" }}>{l.kind === "minus" ? "−" : l.kind === "profit" ? "＝" : ""}</span>
              <span style={{ fontWeight: l.kind === "minus" ? 500 : 700, fontSize: l.big ? 16 : 15 }}>{l.label}</span>
              <Num v={val(l.v)} onClick={() => setModal({ title: l.label, amount: val(l.v), formula: l.formula, rows: l.rows, note: l.k === "tax" ? "概算です。実際の税額は税理士の申告で決まります。" : undefined })} style={{ fontWeight: 700, fontSize: l.big ? 18 : 15, color: l.kind === "profit" ? (l.v < 0 ? K.err : K.ok) : K.ink }} />
              <Why label={l.label}>{l.why}</Why>
            </div>
            {l.sub && l.sub.length > 0 && (
              <div style={{ padding: "0 16px 10px 52px", display: "grid", gap: 4 }}>
                {l.sub.map((x) => <div key={x.label} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: K.sub }}><span>└ {x.label}</span><span>{val(x.v)}</span></div>)}
              </div>
            )}
            {l.ratio && <div style={{ padding: "0 16px 10px 52px", fontSize: 13, color: K.sub }}>{l.ratio[0]}：<b style={{ color: K.ink }}>{pct(l.ratio[1], revenue)}</b>（売上高に対する割合）</div>}
          </div>
        ))}
      </div>
      <div className="card pad" style={{ marginTop: 16 }}>
        <b>PLとBSのつながり</b>
        <p className="muted" style={{ margin: "6px 0 10px" }}>当期純利益は、貸借対照表（BS）の純資産を増やします。PLで稼いだ結果が、BSの「会社の財産」に積み上がっていきます。</p>
        <button className="btn-sub sm" onClick={() => setScreen("bs")}>貸借対照表を見る</button>
      </div>
    </div>
  );
}

// ── 貸借対照表（BS） ──────────────────────────────────────────────────────────

export function BSScreen(p) {
  const { setScreen, val, setModal, master, setMaster, fiscalMonths, sales, expenses, showToast } = p;
  const opening = openingCashOf(master);
  const [edit, setEdit] = useState(opening === null);
  const [cashIn, setCashIn] = useState(opening === null ? "" : String(opening));
  const [capIn, setCapIn] = useState(String(master.company.capital || ""));
  const inFy = (r) => fiscalMonths.includes(r.month);
  const received = sales.filter((r) => inFy(r) && r.status === "入金済");
  const paid = expenses.filter((r) => inFy(r) && r.status === "支払済");
  const cash = (opening || 0) + sum(received) - sum(paid);
  const arRows = sales.filter((r) => r.status === "未入金"), apRows = expenses.filter((r) => r.status === "未払い");
  const ar = sum(arRows), ap = sum(apRows);
  const assets = cash + ar, liab = ap, equity = assets - liab;
  const capital = Number(master.company.capital || 0);
  const retained = equity - capital;
  const save = () => {
    const c = cashIn.replace(/[,，円¥\s]/g, ""); const k = capIn.replace(/[,，円¥\s]/g, "");
    if (c === "" || isNaN(Number(c))) { showToast("期首の現金・預金の残高を数字で入れてください", "error"); return; }
    setMaster((m) => ({ ...m, company: { ...m.company, openingCash: Number(c), capital: k } }));
    setEdit(false); showToast("期首の残高を保存しました。資金繰りの計算にも使います");
  };
  const inp = { width: "100%", border: `1px solid ${K.line}`, borderRadius: 8, padding: "10px 12px", fontSize: 16, boxSizing: "border-box", minHeight: 44 };
  const total = Math.max(assets, liab + Math.max(equity, 0), 1);
  const block = (label, v, bg, fg, onClick) => (
    <button type="button" onClick={onClick} style={{ flex: `${Math.max(v, 0) / total} 0 auto`, minHeight: 56, border: "none", borderRadius: 8, background: bg, color: fg, padding: "8px 10px", textAlign: "left", font: "inherit", cursor: "pointer", display: "flex", flexDirection: "column", justifyContent: "center" }}>
      <span style={{ fontSize: 12 }}>{label}</span><b style={{ fontSize: 15 }}>{val(v)}</b>
    </button>
  );
  return (
    <div className="screen-wrap b-screen">
      <Head title="貸借対照表（BS）" onBack={() => setScreen("talk")} />
      <div className="card pad" style={{ background: K.priSoft, border: "none" }}>
        <b>貸借対照表とは</b>
        <p style={{ margin: "6px 0 0", fontSize: 14, lineHeight: 1.7 }}>ある時点で会社が何を持っていて（資産）、そのお金がどこから来たか（負債と純資産）を表す一覧です。左と右は必ず同じ金額になります。</p>
      </div>
      {(edit || opening === null) ? (
        <div className="card pad" style={{ display: "grid", gap: 10 }}>
          <b>はじめに、期のはじめ（{fiscalMonths[0]}）の数字を入れてください</b>
          <label style={{ display: "grid", gap: 4, fontSize: 14, fontWeight: 700 }}>期首の現金・預金の残高（通帳と手元の現金の合計）<input style={inp} inputMode="numeric" value={cashIn} onChange={(e) => setCashIn(e.target.value)} placeholder="例：1500000" /></label>
          <label style={{ display: "grid", gap: 4, fontSize: 14, fontWeight: 700 }}>資本金（個人事業主なら空でかまいません）<input style={inp} inputMode="numeric" value={capIn} onChange={(e) => setCapIn(e.target.value)} placeholder="例：1000000" /></label>
          <button className="btn-main" style={{ marginTop: 4 }} onClick={save}>保存する</button>
        </div>
      ) : (
        <p className="muted">期首の現金・預金 {val(opening)}・資本金 {val(capital)}　<button className="btn-sub sm" onClick={() => setEdit(true)}>直す</button></p>
      )}

      <h2 className="sec-h">今日時点の見込み</h2>
      <div className="card pad">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 10 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: K.sub, marginBottom: 6 }}>資産（持っているもの）</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, height: 260 }}>
              {block("現金・預金", cash, "#DCE7F7", "#16295E", () => setModal({ title: "現金・預金（見込み）", amount: val(cash), formula: `期首の残高 ${val(opening || 0)}\n＋ 今期に入金済の売上 ${val(sum(received))}\nー 今期に支払済の経費 ${val(sum(paid))}\n＝ ${val(cash)}`, note: "記録をもとにした見込みです。通帳の残高と合わないときは、記録の漏れがないか確かめてください。" }))}
              {block("売掛金（未入金）", ar, "#EEF3FB", "#16295E", () => setModal({ title: "売掛金", amount: val(ar), rows: arRows.map((r) => ({ 相手先: r.client, 何月分: r.month, 金額: val(r.amount) })) }))}
            </div>
            <div style={{ marginTop: 8, fontWeight: 700 }}>資産の合計 {val(assets)}</div>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: K.sub, marginBottom: 6 }}>負債と純資産（お金の出どころ）</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, height: 260 }}>
              {block("未払金（負債）", ap, "#FBE9E7", "#7A2018", () => setModal({ title: "未払金", amount: val(ap), rows: apRows.map((r) => ({ 相手先: r.client, 科目: r.account, 金額: val(r.amount) })) }))}
              {block("資本金（純資産）", capital, "#E3F3EC", "#0F5640", () => setModal({ title: "資本金", amount: val(capital), note: "会社を作ったときなどに入れたお金です。「会社・口座・科目」の設定の値を使っています。" }))}
              {block("利益の積み上げ（純資産）", retained, retained < 0 ? "#FBE4E2" : "#D2EDE1", retained < 0 ? "#7A2018" : "#0F5640", () => setModal({ title: "利益の積み上げ（利益剰余金）", amount: val(retained), formula: `資産の合計 ${val(assets)}\nー 負債（未払金）${val(liab)}\nー 資本金 ${val(capital)}\n＝ ${val(retained)}`, note: "これまでに会社に残った利益の合計にあたります。PLの当期純利益が出るほど増えます。" }))}
            </div>
            <div style={{ marginTop: 8, fontWeight: 700 }}>負債と純資産の合計 {val(liab + equity)}</div>
          </div>
        </div>
      </div>

      <h2 className="sec-h">読み方のポイント</h2>
      <div className="card pad" style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 8, alignItems: "center", fontSize: 15 }}>
        <span>資産</span><Why label="資産">{"会社が持っているもの。現金・預金、まだ入金されていない売上（売掛金）など。\nお金の「使い道」を表します。"}</Why>
        <span>負債</span><Why label="負債">{"いずれ払わなければならないもの。未払金、借入金など。\n他人から来たお金です。"}</Why>
        <span>純資産</span><Why label="純資産">{"資本金と、これまでに残った利益の積み上げ。返さなくてよい、自分のお金です。\n純資産 ＝ 資産 − 負債"}</Why>
        <span>PLとのつながり</span><Why label="PLとのつながり">{"PLで当期純利益が出ると、その分だけ純資産（利益の積み上げ）が増えます。\n赤字が続くと純資産が減り、マイナスになると「債務超過」です。"}</Why>
      </div>
      <p className="muted">借入金・設備（固定資産）・在庫は、まだ記録していません。今は「現金・預金」「売掛金」「未払金」から作る簡易版です。</p>
      <button className="btn-sub sm" onClick={() => setScreen("pl")}>損益計算書を見る</button>
    </div>
  );
}
