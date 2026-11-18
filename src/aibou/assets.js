// 長く使うもの（固定資産）・借入金・在庫の計算
// 減価償却の率は耐用年数省令の別表第八（定額法）・第十（200%定率法、平成24年4月1日以後取得）による。
// ここで出す数字は経営判断用の見込み。正式な扱いは税理士の申告で決まる。

// ── 資産の種類（法定耐用年数の案） ───────────────────────────────────────────
// sl: 定額法しか選べない（建物・建物附属設備・無形） / intangible: 0円まで償却（1円を残さない） / land: 償却しない
export const ASSET_KINDS = [
  { id: "land", label: "土地", life: 0, land: true },
  { id: "bldg_wood_office", label: "木造の建物（事務所）", life: 24, sl: true },
  { id: "bldg_wood_shop", label: "木造の建物（店舗）", life: 22, sl: true },
  { id: "bldg_rc_office", label: "鉄筋コンクリートの建物（事務所）", life: 50, sl: true },
  { id: "bldg_rc_shop", label: "鉄筋コンクリートの建物（店舗）", life: 39, sl: true },
  { id: "bldg_light", label: "建物の照明設備", life: 15, sl: true },
  { id: "car", label: "普通自動車", life: 6 },
  { id: "kei", label: "軽自動車", life: 4 },
  { id: "truck", label: "トラック（ダンプ以外）", life: 5 },
  { id: "pc", label: "パソコン", life: 4 },
  { id: "copier", label: "コピー機・複合機", life: 5 },
  { id: "desk_metal", label: "机・椅子（金属製）", life: 15 },
  { id: "software", label: "ソフトウェア（自社で使う）", life: 5, sl: true, intangible: true },
  { id: "other", label: "その他（年数を入れる）", life: 5 },
];
export const kindOf = (id) => ASSET_KINDS.find((k) => k.id === id) || ASSET_KINDS[ASSET_KINDS.length - 1];

// 扱い（会計の処理）
export const TREATMENTS = {
  pending: "税理士と決める（判断待ち）",
  normal: "通常の減価償却（何年かに分ける）",
  lump3: "一括償却資産（3年で均等）",
  small: "少額減価償却資産の特例（その年に全額）",
  expense: "その年の経費（10万円未満）",
};

// 定額法の償却率：1÷耐用年数を小数第3位で切り上げ（別表第八と一致）
export const slRate = (life) => Math.ceil((1 / life) * 1000 - 1e-9) / 1000;
// 200%定率法：償却率・改定償却率・保証率（別表第十）
const DB = {
  2: [1.0, null, null], 3: [0.667, 1.0, 0.11089], 4: [0.5, 1.0, 0.12499], 5: [0.4, 0.5, 0.108], 6: [0.333, 0.334, 0.09911],
  7: [0.286, 0.334, 0.0868], 8: [0.25, 0.334, 0.07909], 9: [0.222, 0.25, 0.07126], 10: [0.2, 0.25, 0.06552],
  11: [0.182, 0.2, 0.05992], 12: [0.167, 0.2, 0.05566], 15: [0.133, 0.143, 0.04565],
};
export const hasDbTable = (life) => !!DB[life];

// ── 年月の扱い ───────────────────────────────────────────────────────────────
// "2026年11月" / "2026-11" / "2026-11-18" → { y, m }
export const ymOf = (v) => {
  const s = String(v || "");
  let m = s.match(/^(\d{4})年(\d{1,2})月/); if (m) return { y: +m[1], m: +m[2] };
  m = s.match(/^(\d{4})-(\d{1,2})/); if (m) return { y: +m[1], m: +m[2] };
  return null;
};
export const ymLabel = ({ y, m }) => `${y}年${m}月`;
const idx = ({ y, m }) => y * 12 + (m - 1);
const fromIdx = (i) => ({ y: Math.floor(i / 12), m: (i % 12) + 1 });
// その月が入る決算期の始まりの年
export const fyStartYear = ({ y, m }, startMonth) => (m >= startMonth ? y : y - 1);
const fyFirstIdx = (fy, startMonth) => fy * 12 + (startMonth - 1);

// 法人か個人かと資産の種類から、通常の償却方法の初期値（届出がない場合）
export function defaultMethod(asset, profile) {
  const k = kindOf(asset.kind);
  if (k.sl) return "sl";
  return profile && profile.type === "個人事業主" ? "sl" : "db";
}
// 実際に計算に使う扱い（判断待ちは、通常の減価償却で見込みを出す）
export const effectiveTreatment = (a) => (a.treatment && a.treatment !== "pending" ? a.treatment : "normal");

// ── 減価償却の年ごとの表 ─────────────────────────────────────────────────────
// 戻り値：[{ fy, months, amount, bookStart, bookEnd, note }]（fy は決算期の始まりの年）
export function depreciationYears(asset, startMonth, profile) {
  const k = kindOf(asset.kind);
  const cost = Math.round(Number(asset.cost || 0));
  const start = ymOf(asset.start || asset.acquired);
  if (!start || cost <= 0 || k.land) return [];
  const t = effectiveTreatment(asset);
  const fy0 = fyStartYear(start, startMonth);
  const firstMonths = fyFirstIdx(fy0, startMonth) + 12 - idx(start); // 使い始めた月から期末まで（端数は1か月）
  if (t === "expense" || t === "small") return [{ fy: fy0, months: firstMonths, amount: cost, bookStart: cost, bookEnd: 0 }];
  if (t === "lump3") {
    const per = Math.floor(cost / 3);
    return [0, 1, 2].map((i) => {
      const amount = i < 2 ? per : cost - per * 2;
      return { fy: fy0 + i, months: 12, amount, bookStart: cost - per * i, bookEnd: cost - per * i - amount };
    });
  }
  // 通常の減価償却
  const life = Number(asset.life || k.life);
  const floor = k.intangible ? 0 : 1;
  let method = asset.method || defaultMethod(asset, profile);
  if (method === "db" && !hasDbTable(life)) method = "sl";
  const out = []; let book = cost; let switched = null;
  for (let i = 0; i < 80 && book > floor; i++) {
    const months = i === 0 ? firstMonths : 12;
    let annual;
    if (method === "sl") annual = cost * slRate(life);
    else {
      const [rate, revised, guar] = DB[life];
      const adjusted = Math.floor(book * rate);
      if (switched === null && guar !== null && adjusted < Math.floor(cost * guar)) switched = book;
      annual = switched !== null ? switched * revised : adjusted;
    }
    let amount = Math.floor((annual * months) / 12);
    if (amount > book - floor || amount <= 0) amount = book - floor;
    out.push({ fy: fy0 + i, months, amount, bookStart: book, bookEnd: book - amount, method });
    book -= amount;
  }
  return out;
}

// ある月の減価償却費（その期の額を、その期に使っていた月に均等に割り振る。端数は最後の月）
export function depreciationForMonth(asset, monthLabel, startMonth, profile) {
  const ym = ymOf(monthLabel); const start = ymOf(asset.start || asset.acquired);
  if (!ym || !start || idx(ym) < idx(start)) return 0;
  const fy = fyStartYear(ym, startMonth);
  const row = depreciationYears(asset, startMonth, profile).find((r) => r.fy === fy);
  if (!row) return 0;
  const t = effectiveTreatment(asset);
  if (t === "expense" || t === "small") return idx(ym) === idx(start) ? row.amount : 0;
  const first = Math.max(fyFirstIdx(fy, startMonth), idx(start));
  const n = fyFirstIdx(fy, startMonth) + 12 - first; // その期に使っていた月数
  const pos = idx(ym) - first;
  if (pos < 0 || pos >= n) return 0;
  const per = Math.floor(row.amount / n);
  return pos === n - 1 ? row.amount - per * (n - 1) : per;
}
export const depreciationForMonths = (assets, months, startMonth, profile) =>
  assets.map((a) => ({ a, v: months.reduce((t, m) => t + depreciationForMonth(a, m, startMonth, profile), 0) })).filter((x) => x.v);

// その月の末の帳簿価額（土地は取得価額のまま）
export function bookValueAt(asset, monthLabel, startMonth, profile) {
  const cost = Math.round(Number(asset.cost || 0));
  const ym = ymOf(monthLabel); const start = ymOf(asset.acquired || asset.start);
  if (!ym || !start || idx(ym) < idx(start)) return 0;
  if (kindOf(asset.kind).land) return cost;
  const s = ymOf(asset.start || asset.acquired);
  let used = 0;
  for (let i = idx(s); i <= idx(ym); i++) used += depreciationForMonth(asset, ymLabel(fromIdx(i)), startMonth, profile);
  return cost - used;
}

// 10万円以上の経費は「長く使うものか」を確かめる。金額から扱いの候補を出す
export function treatmentOptions(cost, profile, acquired) {
  const c = Number(cost || 0);
  const after = String(acquired || "") >= "2026-04-01";
  const smallLimit = after ? 400000 : 300000; // 令和8年度改正：2026年4月1日以後の取得は40万円未満
  const canSmall = !!(profile && profile.aoiro) && (profile.employees === "" || profile.employees === undefined || Number(profile.employees) <= (after ? 400 : 500));
  const opts = [];
  if (c < 100000) opts.push("expense");
  if (c >= 100000 && c < 200000) opts.push("lump3");
  if (c < smallLimit && canSmall) opts.push("small");
  opts.push("normal");
  return { opts, smallLimit, canSmall };
}

// ── 借入金 ───────────────────────────────────────────────────────────────────
// loan: { amount, date, start(初回返済の月), monthly(毎月の元金), rate(年利%) }
const repaidCount = (loan, monthLabel) => {
  const s = ymOf(loan.start); const ym = ymOf(monthLabel);
  if (!s || !ym || idx(ym) < idx(s)) return 0;
  return idx(ym) - idx(s) + 1;
};
export function loanBalanceAt(loan, monthLabel) {
  const d = ymOf(loan.date); const ym = ymOf(monthLabel);
  if (!d || !ym || idx(ym) < idx(d)) return 0;
  return Math.max(0, Number(loan.amount || 0) - Number(loan.monthly || 0) * repaidCount(loan, monthLabel));
}
// その月の返済（元金と利息）。利息は月初の残高×年利÷12
export function loanPaymentFor(loan, monthLabel) {
  const ym = ymOf(monthLabel); const s = ymOf(loan.start);
  if (!ym || !s || idx(ym) < idx(s)) return { principal: 0, interest: 0 };
  const before = loanBalanceAt(loan, ymLabel(fromIdx(idx(ym) - 1)));
  if (before <= 0) return { principal: 0, interest: 0 };
  const principal = Math.min(before, Number(loan.monthly || 0));
  const interest = Math.round((before * Number(loan.rate || 0)) / 100 / 12);
  return { principal, interest };
}
export const interestForMonths = (loans, months) => loans.reduce((t, l) => t + months.reduce((u, m) => u + loanPaymentFor(l, m).interest, 0), 0);

// ── 在庫 ─────────────────────────────────────────────────────────────────────
// inventory: { "2026年11月": 月末の在庫の金額 }
export function inventoryAt(inventory, monthLabel) {
  const ym = ymOf(monthLabel); if (!ym) return null;
  let best = null, bi = -1;
  for (const [k, v] of Object.entries(inventory || {})) {
    const p = ymOf(k); if (!p) continue;
    if (idx(p) <= idx(ym) && idx(p) > bi) { bi = idx(p); best = Number(v); }
  }
  return best;
}
// 期間の売上原価の調整：売上原価 ＝ 期首の在庫 ＋ 仕入れ − 期末の在庫
export function inventoryAdjust(inventory, months) {
  if (!months.length) return null;
  const last = months[months.length - 1];
  const closing = inventory && inventory[last] !== undefined && inventory[last] !== "" ? Number(inventory[last]) : null;
  if (closing === null) return null; // 期末の在庫が入っていなければ調整しない
  const firstIdx = idx(ymOf(months[0]));
  const before = ymLabel(fromIdx(firstIdx - 1));
  const opening = inventoryAt(inventory, before) ?? 0;
  return { opening, closing };
}

// 会社の設定から、税金と減価償却の前提を取り出す
export const profileOf = (master) => ({
  type: master.company.type || "法人",
  aoiro: master.company.aoiro === undefined ? null : master.company.aoiro,
  employees: master.company.employees ?? "",
  deprMode: master.company.deprMode || "zeirishi",
});
