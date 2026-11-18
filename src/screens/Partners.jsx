import { useState } from "react";
import { newId } from "../lib/invoice.js";
import { CP_BLANK, TERMS_PRESETS, CP_KINDS, normRegNo, isValidRegNo } from "../lib/master.js";
import { FR, Ic, Seg, ScreenHead } from "../ui/parts.jsx";
import { T, s } from "../ui/theme.js";

export function PartnersScreen({ master, setMaster, sales, setSales, expenses, setExpenses, invoices, showToast, setScreen }) {
  const [editing, setEditing] = useState(null);
  const [kindTab, setKindTab] = useState("all");   // null | 相手先オブジェクト（id:null は新規）
  const [q, setQ] = useState("");
  const [err, setErr] = useState({});
  const cps = master.counterparties;
  const usage = (c) => ({
    s: sales.filter(r => r.client === c.name).length,
    e: expenses.filter(r => r.client === c.name).length,
    i: invoices.filter(v => v.cpId === c.id || v.client === c.name).length,
  });
  const list = cps.filter(c => !q.trim() || c.name.toLowerCase().includes(q.trim().toLowerCase())).filter(c => kindTab === "all" || c.kind === "両方" || (kindTab === "sell" ? (c.kind || "売り先") === "売り先" : c.kind === "支払い先"));
  const KIND_JP = { "売り先":"売上先", "支払い先":"支払先", "両方":"売上先・支払先" };
  const ef = (k,v) => setEditing(e => ({ ...e, [k]: v }));
  const openNew = () => { setErr({}); setEditing({ ...CP_BLANK, id:null }); window.scrollTo(0,0); };
  const openEdit = (c) => { setErr({}); setEditing({ ...CP_BLANK, ...c }); window.scrollTo(0,0); };
  const save = () => {
    const name = editing.name.trim();
    const e = {};
    if (!name) e.name = "名前を入れてください";
    else if (cps.some(c => c.name === name && c.id !== editing.id)) e.name = "同じ名前の相手先がもうあります";
    if (editing.regNo && !isValidRegNo(editing.regNo)) e.regNo = "「T」＋数字13けたで入れてください（例：T1234567890123）";
    setErr(e); if (Object.keys(e).length) return;
    const rec = { ...editing, name, regNo: editing.regNo ? normRegNo(editing.regNo) : "" };
    if (rec.id == null) {
      rec.id = newId();
      setMaster(m => ({ ...m, counterparties: [...m.counterparties, rec] }));
      showToast("相手先を足しました");
    } else {
      const old = cps.find(c => c.id === rec.id);
      if (old && old.name !== name) {   // 名前を変えたら、売上・経費の相手先名もそろえる（発行ずみの請求書はそのまま）
        setSales(p => p.map(r => r.client === old.name ? { ...r, client:name } : r));
        setExpenses(p => p.map(r => r.client === old.name ? { ...r, client:name } : r));
      }
      setMaster(m => ({ ...m, counterparties: m.counterparties.map(c => c.id === rec.id ? { ...rec, sample:false } : c) }));
      showToast("相手先を直しました");
    }
    setEditing(null);
  };
  const remove = (c) => {
    const u = usage(c);
    const used = u.s + u.e + u.i > 0;
    const msg = used
      ? `「${c.name}」は使われています（売上${u.s}件・経費${u.e}件・請求書${u.i}件）。\n相手先の一覧から消しても、これまでの記録は残ります。\n消しますか？`
      : `「${c.name}」を消します。よろしいですか？`;
    if (!window.confirm(msg)) return;
    setMaster(m => ({ ...m, counterparties: m.counterparties.filter(x => x.id !== c.id) }));
    showToast("消しました");
  };
  const isPreset = TERMS_PRESETS.includes(editing?.terms);
  return (
    <div className="screen-wrap b-screen">
      <ScreenHead title="取引先" onBack={() => setScreen("settings")} right={<button style={{ ...s.btnP, padding:"8px 14px" }} onClick={openNew}>＋ 足す</button>} />

      {editing && (
        <div style={s.formCard}>
          <div style={s.formTitle}>{editing.id == null ? "相手先を足す" : "相手先を直す"}</div>
          <div className="form-grid" style={s.formGrid}>
            <FR label="名前（会社名・屋号）"><input style={s.inp} value={editing.name} onChange={e => ef("name", e.target.value)} placeholder="株式会社〇〇" />{err.name && <div style={s.errText}>{err.name}</div>}</FR>
            <FR label="敬称"><select style={s.inp} value={editing.honorific} onChange={e => ef("honorific", e.target.value)}><option>御中</option><option>様</option></select></FR>
            <FR label="種類"><select style={s.inp} value={editing.kind} onChange={e => ef("kind", e.target.value)}>{CP_KINDS.map(k => <option key={k}>{k}</option>)}</select></FR>
            <FR label="住所"><input style={s.inp} value={editing.addr} onChange={e => ef("addr", e.target.value)} placeholder="東京都…" /></FR>
            <FR label="ご担当者"><input style={s.inp} value={editing.contact} onChange={e => ef("contact", e.target.value)} placeholder="山田" /></FR>
            <FR label="支払条件" hint={"請求書の支払期限を自動で入れるのに使います"}>
              <select style={s.inp} value={isPreset ? editing.terms : "__other"} onChange={e => ef("terms", e.target.value === "__other" ? "" : e.target.value)}>
                {TERMS_PRESETS.map(t => <option key={t}>{t}</option>)}
                <option value="__other">そのほか（自分で書く）</option>
              </select>
              {!isPreset && <input style={{ ...s.inp, marginTop:6 }} value={editing.terms} onChange={e => ef("terms", e.target.value)} placeholder="例：15日締め当月末払い" />}
            </FR>
            <FR label="登録番号（インボイス）" hint={"相手がインボイス登録をしていれば\nT＋数字13けた。わからなければ空でOK"}><input style={s.inp} value={editing.regNo} onChange={e => ef("regNo", e.target.value)} placeholder="T1234567890123" />{err.regNo && <div style={s.errText}>{err.regNo}</div>}</FR>
          </div>
          <div style={{ ...s.formTitle, fontSize:14, marginTop:16 }}>相手の口座（支払うときに使う）</div>
          <div className="form-grid" style={s.formGrid}>
            <FR label="銀行名"><input style={s.inp} value={editing.bankName} onChange={e => ef("bankName", e.target.value)} placeholder="〇〇銀行" /></FR>
            <FR label="支店名"><input style={s.inp} value={editing.bankBranch} onChange={e => ef("bankBranch", e.target.value)} placeholder="〇〇支店" /></FR>
            <FR label="口座種別"><select style={s.inp} value={editing.bankType} onChange={e => ef("bankType", e.target.value)}><option>普通</option><option>当座</option></select></FR>
            <FR label="口座番号"><input style={s.inp} inputMode="numeric" value={editing.bankNo} onChange={e => ef("bankNo", e.target.value)} placeholder="1234567" /></FR>
            <FR label="口座名義"><input style={s.inp} value={editing.bankHolder} onChange={e => ef("bankHolder", e.target.value)} placeholder="カ)マルマル" /></FR>
          </div>
          <div style={s.formBtns}><button style={s.btnS} onClick={() => setEditing(null)}>やめる</button><button style={s.btnP} onClick={save}>保存する</button></div>
        </div>
      )}

      <div className="search"><Ic n="list" size={18} color={T.faint} /><input aria-label="取引先名で検索" value={q} onChange={e => setQ(e.target.value)} placeholder="取引先名で検索" /></div>
      <Seg items={[["all","すべて"],["sell","売上先"],["pay","支払先"]]} value={kindTab} onChange={setKindTab} />
      <div className="card list">
        {list.length === 0 && <div className="empty">{cps.length ? "見つかりません" : "まだ取引先はありません。「＋ 足す」から入れてください。"}</div>}
        {list.map(c => {
          const u = usage(c);
          const bank = [c.bankName, c.bankBranch, c.bankNo ? `${c.bankType||""} ${c.bankNo}` : ""].filter(Boolean).join("　");
          return (
            <div key={c.id} className="cp-row">
              <button className="cp-main" onClick={() => openEdit(c)}>
                <span className="c">
                  <b>{c.name}<em className="kind">{KIND_JP[c.kind || "売り先"]}</em>{c.sample && <em className="kind sample">見本</em>}</b>
                  <small>{bank || "振込先の口座：未登録"}</small>
                  <small className="faint">売上{u.s}件・経費{u.e}件・請求書{u.i}件{c.regNo ? `・登録番号 ${c.regNo}` : ""}</small>
                </span>
                <span className="hon">{c.honorific}</span>
                <Ic n="chev" size={20} color={T.faint} />
              </button>
              <button className="btn-del sm" aria-label={`${c.name}を消す`} onClick={() => remove(c)}>消す</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── MASTER SCREEN ─────────────────────────────────────────────────────────────
