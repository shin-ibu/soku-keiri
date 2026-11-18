
import { Ic, Seg, ScreenHead } from "../ui/parts.jsx";
import { T } from "../ui/theme.js";

export function SettingsScreen({ setScreen, taxMode, setTaxMode, opInvoice, showOPModal, master }) {
  const items = [
    ["partners","people","取引先","名前・敬称・振込先口座"],
    ["invoice","doc","請求書", opInvoice ? "発行した請求書・新しく作る" : "オプション（未契約）"],
    ["home","home","数字のまとめ","今月の利益・未入金・今日やること"],
    ["projects","doc","案件","案件ごとの粗利・利益、未設定の確認"],
    ["pl","list","損益計算書（PL）","月ごと・1年の成績表と5つの利益"],
    ["bs","list","貸借対照表（BS）","会社の財産の一覧（資産・負債・純資産）"],
    ["assets","doc","資産・借入・在庫","長く使うもの・借入金・月末の在庫"],
    ["zeirishi","doc","税理士に確認すること","判断待ちの扱いと聞きたいことの一覧"],
    ["ar","yen","未入金・未払金","まとめて確認する"],
    ["master","gear","会社・口座・勘定科目","請求書に出る情報など"],
  ];
  return (
    <div className="screen-wrap b-screen">
      <ScreenHead title="設定" />
      <div className="card list">
        {items.map(([id, ic, t, sub]) => (
          <button key={id} className="menu-row" onClick={() => (id==="invoice" && !opInvoice) ? showOPModal() : setScreen(id)}>
            <span className="ic"><Ic n={ic} /></span><span className="c"><b>{t}</b><small>{sub}</small></span><Ic n="chev" size={20} color={T.faint} />
          </button>
        ))}
      </div>
      <h2 className="sec-h">金額の見せ方</h2>
      <div className="card pad">
        <Seg items={[["inc","税込で見る"],["exc","税抜で見る"]]} value={taxMode} onChange={setTaxMode} />
        <p className="muted" style={{ marginTop:8 }}>数字を押すと、計算の根拠が出ます。</p>
      </div>
      <p className="muted" style={{ textAlign:"center", marginTop:24 }}>{master.company.name || "会社名は未設定です"}</p>
    </div>
  );
}

// ── STYLES ────────────────────────────────────────────────────────────────────
