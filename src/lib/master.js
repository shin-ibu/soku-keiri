

export const DEFAULT_MASTER = {
  company: { name:"", type:"法人", established:"", capital:"", taxRate:25, fiscalMonth:4, fiscalNum:1, addr:"", tel:"", email:"", regNo:"", bankName:"", bankBranch:"", bankType:"普通", bankNo:"", bankHolder:"" },
  accounts: [
    { id:"uriage",  label:"売上高",     category:"revenue", examples:"商品・サービスの販売収入、コンサルティング料、制作費" },
    { id:"genka",   label:"売上原価",   category:"cogs",    examples:"仕入れ費用、製造原材料、商品原価" },
    { id:"koukoku", label:"広告宣伝費", category:"sga",     examples:"チラシ、SNS広告、看板、HP制作" },
    { id:"sotuke",  label:"外注費",     category:"sga",     examples:"フリーランスへの発注、業務委託、制作外注" },
    { id:"tsushin", label:"通信費",     category:"sga",     examples:"スマホ代、インターネット、切手・宅配" },
    { id:"yachin",  label:"地代家賃",   category:"sga",     examples:"事務所家賃、店舗家賃、駐車場代" },
    { id:"kotsu",   label:"旅費交通費", category:"sga",     examples:"電車・タクシー、出張費、高速代" },
    { id:"settai",  label:"交際費",     category:"sga",     examples:"取引先との飲食、接待、お中元・お歳暮" },
    { id:"shoumou", label:"消耗品費",   category:"sga",     examples:"文具、備品（10万円未満）、コーヒー等" },
    { id:"hoken",   label:"保険料",     category:"sga",     examples:"損害保険、生命保険（法人契約）" },
    { id:"sonota",  label:"その他経費", category:"sga",     examples:"上記に当てはまらない経費" },
  ],
  // 相手先（取引先）。sample:true は見本。「見本を消す」でいっしょに消える
  counterparties: [
    { id:1, name:"㈱〇〇商事", honorific:"御中", addr:"東京都渋谷区〇〇1-2-3", contact:"", terms:"月末締め翌月末払い", kind:"売り先", regNo:"", bankName:"〇〇銀行", bankBranch:"渋谷支店", bankType:"普通", bankNo:"1234567", bankHolder:"カ)マルマルショウジ", sample:true },
    { id:2, name:"□□デザイン", honorific:"御中", addr:"東京都新宿区△△4-5-6", contact:"", terms:"月末締め翌月末払い", kind:"両方", regNo:"", bankName:"△△銀行", bankBranch:"新宿支店", bankType:"普通", bankNo:"7654321", bankHolder:"カクカクデザイン", sample:true },
  ],
};

// ── 相手先 ────────────────────────────────────────────────────────────────────
export const CP_BLANK = { name:"", honorific:"御中", addr:"", contact:"", terms:"月末締め翌月末払い", kind:"売り先", regNo:"", bankName:"", bankBranch:"", bankType:"普通", bankNo:"", bankHolder:"" };
export const TERMS_PRESETS = ["月末締め翌月末払い","月末締め翌々月末払い","20日締め翌月末払い","都度"];
export const CP_KINDS = ["売り先","支払い先","両方"];
export const SAMPLE_CLIENT_NAMES = ["㈱〇〇商事","□□デザイン"];
// 全角→半角・大文字にして、ハイフンや空白を取る
export const normRegNo = (v) => String(v||"").replace(/[０-９Ａ-Ｚａ-ｚ]/g, c=>String.fromCharCode(c.charCodeAt(0)-0xFEE0)).toUpperCase().replace(/[\s\-‐－ー]/g,"");
export const isValidRegNo = (v) => /^T\d{13}$/.test(normRegNo(v));
// 以前の「取引先（master.clients）」を、何も落とさずに「相手先」へ移す
export const migrateMaster = (m) => {
  if (!m) return DEFAULT_MASTER;
  const out = { ...m, company: { ...DEFAULT_MASTER.company, ...(m.company||{}) } };
  if (!Array.isArray(out.counterparties)) {
    out.counterparties = (m.clients||[]).map(c => ({ ...CP_BLANK, kind:"両方", ...c, sample: c.sample ?? SAMPLE_CLIENT_NAMES.includes(c.name) }));
  }
  delete out.clients;
  return out;
};
// 支払条件から支払期限を出す（決まらないときは空）
export const AI_SUGGEST = { "電車":"旅費交通費","タクシー":"旅費交通費","交通":"旅費交通費","出張":"旅費交通費","家賃":"地代家賃","賃料":"地代家賃","広告":"広告宣伝費","チラシ":"広告宣伝費","sns":"広告宣伝費","外注":"外注費","委託":"外注費","フリー":"外注費","スマホ":"通信費","携帯":"通信費","ネット":"通信費","飲食":"交際費","接待":"交際費","ランチ":"交際費","文具":"消耗品費","備品":"消耗品費","adobe":"消耗品費","サブスク":"消耗品費","仕入":"売上原価","材料":"売上原価","保険":"保険料" };
export const getSuggestion = (t) => { const l = t.toLowerCase(); for (const [k,v] of Object.entries(AI_SUGGEST)) { if (l.includes(k)) return v; } return null; };

// ── DRILL-DOWN MODAL ──────────────────────────────────────────────────────────
export const TYPE_LABEL = { "売掛":"売掛（後日入金）", "買掛":"買掛（後日支払）" };
export const typeLabel = (t) => TYPE_LABEL[t] || t;

// ── 相手先をえらぶ入力欄（打つと絞りこみ・なければその場で足せる） ─────────────
