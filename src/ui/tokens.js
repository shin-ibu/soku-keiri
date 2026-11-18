// AIBOU デザインの決まり（色・文字・角丸・影）
// 画面の色は必ずここから使う。新しい色を足すときは、ここに名前を付けて足す。
export const color = {
  // 文字
  ink: "#17212B",      // 本文・見出し
  sub: "#5B6573",      // 補足の文字（白地でコントラスト5.9:1）
  faint: "#8A93A0",    // アイコン・区切りの記号だけに使う（文字には使わない）
  // 面と線
  bg: "#F2F4F6",       // 画面の地
  card: "#FFFFFF",     // カード
  well: "#F7F8FA",     // カードの中のくぼみ
  line: "#DFE3E8",     // 枠線
  lineSoft: "#EEF0F3", // リストの区切り
  // 主色（藍）
  pri: "#233E8B", priDark: "#16295E", priSoft: "#E6EBF7", priLine: "#C3CDEA", priMid: "#4A63A8",
  // 状態
  ok: "#17795E", okInk: "#0F5640", okSoft: "#E3F3EC", okLine: "#A9D9C3",
  warn: "#B7791F", warnInk: "#7A4F00", warnSoft: "#FDF1D6", warnLine: "#EBCB8B",
  err: "#B3261E", errInk: "#8C1D18", errSoft: "#FBE4E2", errLine: "#F0B8B3",
};
export const font = "'Hiragino Sans','Hiragino Kaku Gothic ProN','Noto Sans JP','Yu Gothic',sans-serif";
export const radius = { sm: 8, md: 12, lg: 16, pill: 999 };
export const shadow = { card: "0 1px 2px rgba(23,33,43,0.04)", pop: "0 8px 24px rgba(23,33,43,0.12)" };
