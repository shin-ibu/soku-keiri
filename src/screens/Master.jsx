import { useState } from "react";
import { normRegNo, isValidRegNo } from "../lib/master.js";
import { FR, ScreenHead } from "../ui/parts.jsx";
import { s } from "../ui/theme.js";

export function MasterScreen({ master, setMaster, showToast, setScreen }) {
  const [tab, setTab] = useState("company");
  const [co, setCo] = useState(master.company);
  const [accounts, setAccounts] = useState(master.accounts);
  const [newAccount, setNewAccount] = useState({ label:"", category:"sga", examples:"" });
  const regNoBad = !!co.regNo && !isValidRegNo(co.regNo);

  const saveMaster = () => {
    if (regNoBad) { showToast("登録番号は「T」＋数字13けたで入れてください","error"); return; }
    const company = { ...co, regNo: co.regNo ? normRegNo(co.regNo) : "" };
    setCo(company);
    setMaster(m => ({ ...m, company, accounts }));
    showToast("マスター情報を保存しました");
  };

  return (
    <div className="screen-wrap b-screen">
      <ScreenHead title="会社・口座・科目" onBack={() => setScreen("settings")} right={<button style={{ ...s.btnP, padding:"8px 14px" }} onClick={saveMaster}>保存する</button>} />

      <div style={{ display:"flex", gap:8, marginBottom:16 }}>
        {[["company","会社情報"],["accounts","勘定科目"]].map(([id,label]) => (
          <button key={id} style={{ ...s.taxBtn, ...(tab===id?s.taxActive:{}), border:"1px solid", borderColor:tab===id?"#16295E":"#DCE3F5", borderRadius:12, padding:"8px 16px", fontSize:13 }} onClick={() => setTab(id)}>{label}</button>
        ))}
        <button style={{ ...s.taxBtn, border:"1px solid #DCE3F5", borderRadius:12, padding:"8px 16px", fontSize:13 }} onClick={() => setScreen("partners")}>相手先 ›</button>
      </div>

      {tab === "company" && (
        <div className="master-grid" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
          <div style={s.formCard}>
            <div style={s.formTitle}>基本情報</div>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              <FR label="会社名・屋号"><input style={s.inp} value={co.name} onChange={e=>setCo({...co,name:e.target.value})} placeholder="株式会社〇〇" /></FR>
              <FR label="法人 / 個人事業主"><select style={s.inp} value={co.type} onChange={e=>setCo({...co,type:e.target.value})}><option>法人</option><option>個人事業主</option></select></FR>
              <FR label="設立年"><input style={s.inp} value={co.established} onChange={e=>setCo({...co,established:e.target.value})} placeholder="2020" /></FR>
              <FR label="資本金"><input style={s.inp} value={co.capital} onChange={e=>setCo({...co,capital:e.target.value})} placeholder="1000000" /></FR>
              <FR label="住所"><input style={s.inp} value={co.addr} onChange={e=>setCo({...co,addr:e.target.value})} placeholder="東京都〇〇区..." /></FR>
              <FR label="電話番号"><input style={s.inp} value={co.tel} onChange={e=>setCo({...co,tel:e.target.value})} placeholder="03-0000-0000" /></FR>
              <FR label="メール"><input style={s.inp} value={co.email} onChange={e=>setCo({...co,email:e.target.value})} placeholder="info@example.com" /></FR>
              <FR label="登録番号（インボイス）" hint={"インボイス登録をしている場合だけ、T＋数字13けたを入れます。\n空なら番号なしの請求書になります（免税事業者の方はそのままでOK）"}>
                <input style={s.inp} value={co.regNo||""} onChange={e=>setCo({...co,regNo:e.target.value})} placeholder="T1234567890123" />
                {regNoBad && <div style={s.errText}>「T」＋数字13けたで入れてください</div>}
              </FR>
            </div>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            <div style={s.formCard}>
              <div style={s.formTitle}>決算の設定</div>
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                <FR label="決算月（開始月）" hint="例）3月決算なら「4月」が期首になります">
                  <select style={s.inp} value={co.fiscalMonth} onChange={e=>setCo({...co,fiscalMonth:Number(e.target.value)})}>
                    {[1,2,3,4,5,6,7,8,9,10,11,12].map(m=><option key={m} value={m}>{m}月始まり（{m===1?12:m-1}月決算）</option>)}
                  </select>
                </FR>
                <FR label="第何期目"><input type="number" style={s.inp} value={co.fiscalNum} onChange={e=>setCo({...co,fiscalNum:Number(e.target.value)})} placeholder="1" min="1" /></FR>
              </div>
            </div>
            <div style={s.formCard}>
              <div style={s.formTitle}>振込先口座（請求書に出ます）</div>
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                <FR label="銀行名"><input style={s.inp} value={co.bankName} onChange={e=>setCo({...co,bankName:e.target.value})} placeholder="〇〇銀行" /></FR>
                <FR label="支店名"><input style={s.inp} value={co.bankBranch} onChange={e=>setCo({...co,bankBranch:e.target.value})} placeholder="〇〇支店" /></FR>
                <FR label="口座種別"><select style={s.inp} value={co.bankType} onChange={e=>setCo({...co,bankType:e.target.value})}><option>普通</option><option>当座</option></select></FR>
                <FR label="口座番号"><input style={s.inp} value={co.bankNo} onChange={e=>setCo({...co,bankNo:e.target.value})} placeholder="1234567" /></FR>
                <FR label="口座名義"><input style={s.inp} value={co.bankHolder} onChange={e=>setCo({...co,bankHolder:e.target.value})} placeholder="カ)マルマル" /></FR>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "accounts" && (
        <div>
          <div className="tbl-wrap" style={s.tblWrap}>
            <table style={s.tbl}>
              <thead><tr>{["科目名","分類","使用例",""].map(h=><th key={h} style={{ ...s.th, textAlign:"left" }}>{h}</th>)}</tr></thead>
              <tbody>
                {accounts.map((a,i) => (
                  <tr key={a.id} style={s.tr}>
                    <td style={{ ...s.td, fontWeight:500 }}>{a.label}</td>
                    <td style={s.td}><span style={{ ...s.badge, ...(a.category==="revenue"?s.bGreen:a.category==="cogs"?s.bAmber:s.bGreen) }}>{a.category==="revenue"?"売上":a.category==="cogs"?"原価":"販管費"}</span></td>
                    <td style={{ ...s.td, color:"#888", fontSize:11 }}>{a.examples}</td>
                    <td style={s.td}><input style={{ ...s.inp, width:200, fontSize:11 }} value={a.examples} onChange={e=>setAccounts(prev=>prev.map((ac,idx)=>idx===i?{...ac,examples:e.target.value}:ac))} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={s.formCard}>
            <div style={s.formTitle}>勘定科目を追加</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 2fr auto", gap:10, alignItems:"end" }}>
              <FR label="科目名"><input style={s.inp} value={newAccount.label} onChange={e=>setNewAccount({...newAccount,label:e.target.value})} placeholder="新しい科目名" /></FR>
              <FR label="分類"><select style={s.inp} value={newAccount.category} onChange={e=>setNewAccount({...newAccount,category:e.target.value})}><option value="revenue">売上</option><option value="cogs">原価</option><option value="sga">販管費</option></select></FR>
              <FR label="使用例"><input style={s.inp} value={newAccount.examples} onChange={e=>setNewAccount({...newAccount,examples:e.target.value})} placeholder="例：〇〇費、△△代など" /></FR>
              <button style={{ ...s.btnP, height:36 }} onClick={() => { if (!newAccount.label) return; setAccounts(prev=>[...prev,{ ...newAccount, id:`custom_${Date.now()}` }]); setNewAccount({ label:"", category:"sga", examples:"" }); }}>追加</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// ── FORM ROW ──────────────────────────────────────────────────────────────────
