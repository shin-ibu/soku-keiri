import { pad2, monthLabel } from "./format.js";

export const DEMO_SALES = [
  { id:1, date:"2025-05-02", month:"2025年5月", type:"売掛", client:"㈱〇〇商事", amount:110000, tax:10, memo:"Web制作費", status:"未入金", project:9001 },
  { id:2, date:"2025-05-05", month:"2025年5月", type:"売掛", client:"□□デザイン", amount:220000, tax:10, memo:"ロゴ制作", status:"未入金" },
  { id:3, date:"2025-05-08", month:"2025年5月", type:"現金", client:"△△工務店", amount:55000, tax:10, memo:"コンサル", status:"入金済", project:"common" },
  { id:4, date:"2025-05-09", month:"2025年5月", type:"売掛", client:"◇◇㈱", amount:330000, tax:10, memo:"システム開発", status:"未入金", project:9002 },
  { id:5, date:"2025-04-28", month:"2025年4月", type:"売掛", client:"㈱△△", amount:165000, tax:10, memo:"保守費", status:"入金済", project:9001 },
  { id:6, date:"2025-04-10", month:"2025年4月", type:"現金", client:"〇×商会", amount:88000, tax:10, memo:"コンサル", status:"入金済", project:"common" },
];
export const DEMO_EXP = [
  { id:1, date:"2025-05-01", month:"2025年5月", type:"買掛", client:"〇〇ビル",   account:"地代家賃",   amount:50000,  tax:10, memo:"5月家賃",    status:"支払済", project:"common" },
  { id:2, date:"2025-05-02", month:"2025年5月", type:"カード", client:"△△通信", account:"通信費",     amount:12000,  tax:10, memo:"スマホ代",   status:"支払済", project:"common" },
  { id:3, date:"2025-05-03", month:"2025年5月", type:"買掛", client:"□□制作所", account:"外注費",     amount:95000,  tax:10, memo:"LP制作外注", status:"未払い", project:9002 },
  { id:4, date:"2025-05-05", month:"2025年5月", type:"買掛", client:"◇◇広告",   account:"広告宣伝費", amount:38000,  tax:10, memo:"SNS広告",    status:"未払い", project:"common" },
  { id:5, date:"2025-05-07", month:"2025年5月", type:"現金", client:"文具店",    account:"消耗品費",   amount:3300,   tax:10, memo:"コピー用紙", status:"支払済" },
  { id:6, date:"2025-04-01", month:"2025年4月", type:"買掛", client:"〇〇ビル",  account:"地代家賃",   amount:50000,  tax:10, memo:"4月家賃",    status:"支払済", project:"common" },
  { id:7, date:"2025-04-15", month:"2025年4月", type:"カード", client:"◇◇広告", account:"広告宣伝費", amount:30000,  tax:10, memo:"広告費",    status:"支払済", project:"common" },
];
export const DEMO_PROJECTS = [
  { id:9001, name:"Web制作（㈱〇〇商事）", client:"㈱〇〇商事", status:"進行中", demo:true },
  { id:9002, name:"システム開発（◇◇㈱）", client:"◇◇㈱", status:"進行中", demo:true },
];

// 見本データの日付を、開いた日の「今月・先月」に置きかえる（初めて開いた人に、空の画面や去年の数字を見せない）
export const shiftDemo = (rows) => {
  const now = new Date(); const prev = new Date(now.getFullYear(), now.getMonth()-1, 1);
  const ym = (d) => `${d.getFullYear()}-${pad2(d.getMonth()+1)}`;
  return rows.map(r => { const isCur = r.month === "2025年5月"; const d = isCur ? now : prev;
    return { ...r, demo:true, month: monthLabel(d), date: `${ym(d)}-${r.date.slice(8)}`, memo: r.memo.replace("5月", `${now.getMonth()+1}月`).replace("4月", `${prev.getMonth()+1}月`) }; });
};
