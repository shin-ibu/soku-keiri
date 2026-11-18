import { font } from "./tokens.js";

export const M = {
  overlay:    { position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:24 },
  box:        { background:"#fff", borderRadius:16, width:"100%", maxWidth:520, maxHeight:"82vh", overflowY:"auto" },
  hdr:        { display:"flex", alignItems:"flex-start", justifyContent:"space-between", padding:"22px 22px 16px", borderBottom:"1px solid #EEF0F3" },
  hdrlabel:   { fontSize:12, color:"#999", marginBottom:4, fontWeight:600 },
  hdramt:     { fontSize:26, fontWeight:800, letterSpacing:-1 },
  xbtn:       { background:"#F2F4F6", border:"none", borderRadius:12, width:34, height:34, fontSize:16, cursor:"pointer", color:"#666", flexShrink:0, marginLeft:12 },
  formula:    { margin:"16px 22px 0", background:"#E6EBF7", borderRadius:10, padding:"12px 16px", borderLeft:"3px solid #16295E" },
  formulalabel:{ fontSize:10, color:"#16295E", fontWeight:700, marginBottom:6 },
  formulatext:{ fontSize:13, color:"#16295E", lineHeight:2, margin:0, whiteSpace:"pre-wrap", fontFamily:"inherit" },
  rowswrap:   { margin:"16px 22px 0" },
  rowslabel:  { fontSize:11, color:"#aaa", fontWeight:700, marginBottom:8 },
  tbl:        { width:"100%", borderCollapse:"collapse" },
  th:         { fontSize:10, color:"#bbb", fontWeight:700, padding:"6px 8px", borderBottom:"1px solid #EEF0F3", background:"#F7F8FA" },
  td:         { fontSize:12, color:"#333", padding:"9px 8px", borderBottom:"1px solid #F2F4F6" },
  note:       { margin:"14px 22px 0", fontSize:12, color:"#666", background:"#FFFBF2", borderRadius:12, padding:"10px 14px", lineHeight:1.8, borderLeft:"3px solid #B7791F" },
  closebottom:{ display:"block", width:"calc(100% - 44px)", margin:"18px 22px 22px", padding:"12px", borderRadius:12, border:"1px solid #DCE3F5", background:"transparent", color:"#555", fontSize:14, fontWeight:600, cursor:"pointer" },
};

// ── OP UPSELL MODAL ───────────────────────────────────────────────────────────
export const SHEET_FONT = "'Hiragino Sans','Hiragino Kaku Gothic ProN','Noto Sans JP','Noto Sans CJK JP','Yu Gothic','YuGothic','Meiryo',sans-serif";
export const T = { bg:"#F2F4F6", pri:"#233E8B", priDark:"#16295E", priSoft:"#E6EBF7", text:"#17212B", sub:"#5B6573", faint:"#8A93A0", line:"#DFE3E8", card:"#FFFFFF", ok:"#17795E", okSoft:"#E3F3EC", warn:"#B7791F", warnSoft:"#FDF1D6", err:"#B3261E", errSoft:"#FBE4E2", shadow:"0 1px 2px rgba(23,33,43,0.04)" };
export const ICONS = {
  home:"M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z",
  chat:"M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9l-5 4v-4H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z",
  list:"M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zM8 9h8M8 13h8M8 17h5",
  plus:"M12 5v14M5 12h14",
  chart:"M5 20V12M10 20V7M15 20v-5M20 20V4",
  gear:"M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM19.4 13.5l1.6 1.2-2 3.4-1.9-.7a7.6 7.6 0 0 1-1.7 1l-.3 2h-4l-.3-2a7.6 7.6 0 0 1-1.7-1l-1.9.7-2-3.4 1.6-1.2a7.7 7.7 0 0 1 0-3l-1.6-1.2 2-3.4 1.9.7a7.6 7.6 0 0 1 1.7-1l.3-2h4l.3 2a7.6 7.6 0 0 1 1.7 1l1.9-.7 2 3.4-1.6 1.2a7.7 7.7 0 0 1 0 3z",
  chev:"M9 6l6 6-6 6", back:"M15 6l-6 6 6 6", x:"M6 6l12 12M18 6 6 18", down:"M6 9l6 6 6-6",
  people:"M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20c.6-3.5 3.4-5.5 6.5-5.5s5.9 2 6.5 5.5M16 11a3 3 0 1 0 0-6M17.5 14.6c2.3.5 3.7 2.4 4 5.4",
  doc:"M7 3h7l5 5v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM14 3v5h5M9 13h6M9 17h6",
  yen:"M6 4l6 8 6-8M12 12v8M8 13h8M8 16h8",
};
export const s = {
  screenWrap:   { padding:"24px 24px 48px" },
  pageHeader:   { display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16, gap:8, flexWrap:"wrap" },
  pageTitle:    { fontSize:22, fontWeight:700, color:T.text },
  statCard:     { background:T.card, border:`1px solid ${T.line}`, borderRadius:12, padding:"16px", boxShadow:T.shadow },
  statLabel:    { fontSize:14, color:T.sub, marginBottom:6, fontWeight:500 },
  taxSwitch:    { display:"flex", background:"#E9ECF0", borderRadius:12, padding:3, gap:2 },
  taxBtn:       { padding:"8px 14px", borderRadius:6, fontSize:14, border:"none", background:"transparent", color:T.sub, cursor:"pointer" },
  taxActive:    { background:"#fff", color:T.priDark, fontWeight:700 },
  formCard:     { background:T.card, border:`1px solid ${T.line}`, borderRadius:12, padding:16, marginBottom:16, boxShadow:T.shadow },
  formTitle:    { fontSize:16, fontWeight:700, color:T.text, marginBottom:16 },
  formGrid:     { display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16 },
  inp:          { width:"100%", border:`1px solid ${T.line}`, borderRadius:12, padding:"12px", fontSize:16, background:"#fff", color:T.text, outline:"none", boxSizing:"border-box", minHeight:48 },
  aiSug:        { marginTop:6, fontSize:14, color:"#0F5640", background:T.okSoft, borderRadius:12, padding:"6px 10px" },
  alertBox:     { marginTop:12, background:T.warnSoft, border:`1px solid ${T.warn}`, borderRadius:12, padding:"12px 14px", fontSize:14, color:"#7A4F00", display:"flex", alignItems:"center", justifyContent:"space-between", gap:8, lineHeight:1.6 },
  alertDis:     { fontSize:14, color:"#7A4F00", background:"#fff", border:`1px solid ${T.warn}`, borderRadius:12, padding:"4px 10px", cursor:"pointer" },
  formBtns:     { display:"flex", gap:8, marginTop:16, justifyContent:"flex-end" },
  btnP:         { padding:"12px 20px", borderRadius:12, border:"none", background:T.pri, color:"#fff", fontSize:15, fontWeight:700, cursor:"pointer", minHeight:44 },
  btnS:         { padding:"12px 16px", borderRadius:12, border:`1px solid ${T.line}`, background:"#fff", color:T.text, fontSize:15, cursor:"pointer", minHeight:44 },
  delBtn:       { border:`1px solid #F0B8B3`, background:"#fff", color:"#B3261E", borderRadius:12, padding:"6px 12px", fontSize:14, cursor:"pointer" },
  tblWrap:      { background:T.card, border:`1px solid ${T.line}`, borderRadius:12, overflow:"hidden", marginBottom:16, boxShadow:T.shadow },
  tbl:          { width:"100%", borderCollapse:"collapse" },
  th:           { background:"#F7F8FA", fontSize:13, fontWeight:600, color:T.sub, padding:"10px 12px", borderBottom:`1px solid ${T.line}`, textAlign:"right", whiteSpace:"nowrap" },
  td:           { fontSize:15, color:T.text, padding:"12px", borderBottom:`1px solid #EEF0F3`, whiteSpace:"nowrap", fontVariantNumeric:"tabular-nums" },
  tr:           { transition:"background 0.1s" },
  badge:        { display:"inline-block", fontSize:12, padding:"2px 8px", borderRadius:6, fontWeight:700 },
  bGreen:       { background:T.okSoft, color:"#0F5640" },
  bAmber:       { background:T.warnSoft, color:"#7A4F00" },
  bRed:         { background:T.errSoft, color:"#B3261E" },
  paidBtn:      { fontSize:14, padding:"6px 12px", borderRadius:12, border:`1px solid ${T.pri}`, background:"#fff", color:T.priDark, cursor:"pointer", fontWeight:700, whiteSpace:"nowrap" },
  plWrap:       { background:T.card, border:`1px solid ${T.line}`, borderRadius:12, overflow:"hidden", marginBottom:16, boxShadow:T.shadow },
  plHdr:        { background:"#F7F8FA", padding:"12px 16px", borderBottom:`1px solid ${T.line}`, display:"flex", justifyContent:"space-between", alignItems:"center", fontSize:15, fontWeight:700, color:T.text },
  plRow:        { display:"flex", justifyContent:"space-between", alignItems:"center", padding:"12px 16px", borderBottom:`1px solid #EEF0F3` },
  secTitle:     { fontSize:16, fontWeight:700, color:T.text, marginBottom:8 },
  secTitleSub:  { fontSize:14, fontWeight:700, color:T.sub, marginBottom:8, marginTop:16 },
  pickList:     { position:"absolute", top:"100%", left:0, right:0, zIndex:50, marginTop:4, background:"#fff", border:`1px solid ${T.line}`, borderRadius:12, boxShadow:"0 8px 24px rgba(17,24,39,0.10)", maxHeight:280, overflowY:"auto" },
  pickItem:     { display:"flex", alignItems:"center", flexWrap:"wrap", width:"100%", textAlign:"left", padding:"12px", border:"none", borderBottom:`1px solid #EEF0F3`, background:"#fff", fontSize:16, color:T.text, cursor:"pointer", minHeight:48 },
  hint13:       { fontSize:14, color:T.sub, lineHeight:1.7 },
  errText:      { fontSize:14, color:"#B3261E", marginTop:4 },
};
export const css = `
  *{box-sizing:border-box;}
  body{margin:0;background:#F2F4F6;color:#17212B;font-family:${font};-webkit-font-smoothing:antialiased;}
  button{font-family:inherit;}
  button{ transition:background-color .12s ease, box-shadow .12s ease, transform .08s ease, opacity .12s ease; }
  button:hover{opacity:0.92;}
  button:active{ transform:scale(0.98); }
  @keyframes aibouIn{ from{ opacity:0; transform:translateY(6px); } to{ opacity:1; transform:none; } }
  @keyframes aibouUp{ from{ transform:translateY(24px); opacity:0; } to{ transform:none; opacity:1; } }
  @media (prefers-reduced-motion: reduce){ *{ animation:none !important; transition:none !important; } }
  button:focus-visible,select:focus-visible,input:focus-visible{outline:2px solid #233E8B;outline-offset:2px;}
  tr:hover td{background:#F7F8FA!important;}
  input:focus,select:focus{border-color:#233E8B!important;outline:none;}
  ::-webkit-scrollbar{width:5px;height:5px;}
  ::-webkit-scrollbar-thumb{background:#DFE3E8;border-radius:3px;}
  .sidebar{flex-shrink:0;}
  .num,.v,.amt,.a,.bv,.cnt,.month-total,.grand b{font-variant-numeric:tabular-nums;}

  .demo-bar{ display:flex; flex-wrap:nowrap; align-items:center; justify-content:space-between; gap:8px 12px; padding:8px 24px; background:#FDF1D6; border-bottom:1px solid #EBCB8B; color:#7A4F00; font-size:14px; line-height:1.6; }
  .demo-bar button{ flex-shrink:0; border:1px solid #B7791F; background:#fff; color:#7A4F00; border-radius:999px; padding:6px 12px; font-size:13px; min-height:36px; font-weight:700; cursor:pointer; }
  .toast{ position:fixed; top:16px; left:50%; transform:translateX(-50%); z-index:400; padding:12px 18px; border-radius:12px; border:1px solid; font-size:15px; font-weight:700; box-shadow:0 8px 24px rgba(23,33,43,0.12); animation:aibouIn .18s ease; max-width:calc(100vw - 32px); }

  /* B案 共通 */
  .screen-wrap{ padding:24px 32px 48px; animation:aibouIn .18s ease; }
  .b-screen{ max-width:960px; }
  .card{ background:#fff; border:1px solid #DFE3E8; border-radius:16px; box-shadow:0 1px 2px rgba(23,33,43,0.04); }
  .card.pad{ padding:16px; margin-bottom:16px; }
  .card.center{ text-align:center; }
  button.card{ font:inherit; color:inherit; text-align:left; cursor:pointer; width:100%; }
  .muted{ color:#5B6573; font-size:14px; line-height:1.6; }
  .faint{ color:#8A93A0; }
  .two{ display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:16px; }
  .sec-h{ font-size:17px; font-weight:700; margin:24px 0 8px; display:flex; align-items:center; gap:8px; }
  .sec-h .muted{ font-weight:400; }
  .badge-n{ font-size:13px; font-weight:700; color:#16295E; background:#E6EBF7; border-radius:999px; padding:2px 10px; }
  .icon-btn{ width:44px; height:44px; border:none; background:transparent; color:#17212B; border-radius:22px; display:inline-flex; align-items:center; justify-content:center; cursor:pointer; }
  .scr-head{ display:grid; grid-template-columns:48px 1fr auto; align-items:center; min-height:48px; margin:-8px 0 16px; }
  .scr-head h1{ font-size:18px; font-weight:700; text-align:center; margin:0; }
  .scr-head > span:last-child{ width:48px; }
  .month-pill{ position:relative; display:inline-flex; align-items:center; gap:4px; background:#fff; border:1px solid #DFE3E8; border-radius:999px; padding:8px 12px 8px 16px; font-size:15px; font-weight:700; color:#17212B; min-height:44px; cursor:pointer; white-space:nowrap; }
  .month-pill select{ position:absolute; inset:0; opacity:0; cursor:pointer; width:100%; font-size:16px; }
  .seg{ display:flex; background:#E9ECF0; border-radius:12px; padding:4px; gap:2px; margin-bottom:16px; }
  .seg button{ flex:1; border:none; background:transparent; border-radius:9px; padding:10px 8px; font-size:15px; color:#5B6573; cursor:pointer; min-height:40px; }
  .seg button.on{ background:#fff; color:#17212B; font-weight:700; box-shadow:0 1px 3px rgba(23,33,43,0.10); }
  .btn-main{ display:block; width:100%; margin-top:16px; border:none; background:#233E8B; color:#fff; border-radius:999px; min-height:52px; font-size:17px; font-weight:700; cursor:pointer; }
  .btn-pri,.btn-sub,.btn-del{ border-radius:999px; font-size:15px; font-weight:700; cursor:pointer; padding:10px 16px; min-height:44px; white-space:nowrap; }
  .btn-pri{ border:none; background:#233E8B; color:#fff; }
  .btn-sub{ border:1px solid #C3CDEA; background:#fff; color:#233E8B; }
  .btn-sub:hover{ background:#F4F6FC; opacity:1; }
  .btn-del{ border:1px solid #F0B8B3; background:#fff; color:#B3261E; }
  .inv-grid,.item-grid,.two{ grid-template-columns:repeat(2,minmax(0,1fr)); }
  .inv-grid > *, .item-grid > *, .two > *, .form-grid > *{ min-width:0; }
  input[type=date]{ min-width:0; max-width:100%; }
  .sm{ padding:8px 12px; min-height:40px; font-size:14px; }
  .empty{ padding:24px 16px; color:#5B6573; font-size:15px; text-align:center; line-height:1.7; }

  /* ホーム */
  .hello{ display:flex; justify-content:space-between; align-items:center; gap:8px; margin-bottom:4px; }
  .hello small{ display:block; font-size:14px; color:#5B6573; }
  .hello b{ font-size:20px; font-weight:700; }
  .fiscal{ margin-bottom:16px; font-size:13px; }
  .hero{ position:relative; display:flex; flex-direction:column; gap:6px; padding:20px 48px 20px 20px; margin-bottom:8px; background:#fff; }
  .hero .l{ font-size:15px; color:#3D4756; font-weight:500; }
  .hero .l small{ color:#5B6573; font-size:13px; }
  .hero .v{ font-size:32px; font-weight:700; letter-spacing:-0.5px; color:#17212B; line-height:1.2; }
  .hero .go{ position:absolute; right:14px; top:50%; transform:translateY(-50%); color:#8A93A0; }
  .kpi{ padding:14px; display:flex; flex-direction:column; gap:4px; min-width:0; }
  .kpi > span:first-child{ font-size:14px; color:#5B6573; }
  .kpi > span:first-child small{ font-size:12px; }
  .kpi .num{ font-size:20px; font-weight:700; color:#17212B; }
  .kpi .cnt{ font-size:14px; font-weight:700; color:#16295E; }
  .kpi .cnt small{ font-size:12px; margin-left:1px; }
  .group{ margin-bottom:8px; overflow:hidden; }
  .g-h{ padding:12px 16px; font-size:15px; font-weight:700; border-bottom:1px solid #EEF0F3; }
  .late{ color:#B3261E; font-weight:700; }
  .todo{ display:grid; grid-template-columns:1fr auto auto; align-items:center; gap:8px; padding:12px 16px; border-bottom:1px solid #EEF0F3; }
  .todo:last-child{ border-bottom:none; }
  .todo .c{ display:flex; flex-wrap:wrap; align-items:baseline; gap:2px 8px; min-width:0; }
  .todo .c b{ font-size:15px; }
  .todo .c .amt{ font-size:15px; font-weight:700; }
  .todo .c small{ width:100%; color:#5B6573; font-size:13px; }
  .todo .m{ display:flex; flex-direction:column; align-items:flex-end; gap:2px; font-size:12px; color:#5B6573; }
  .tag{ font-size:12px; font-weight:700; border-radius:999px; padding:2px 8px; }
  .tag.err{ background:#FBE4E2; color:#B3261E; }
  .more{ display:block; width:100%; border:none; background:#fff; color:#16295E; font-size:14px; font-weight:700; padding:12px; cursor:pointer; border-top:1px solid #EEF0F3; }
  .legend{ display:flex; gap:12px; font-size:13px; color:#5B6573; margin-bottom:8px; }
  .legend i{ display:inline-block; width:10px; height:10px; border-radius:2px; margin-right:4px; vertical-align:-1px; }
  .quick-grid{ display:grid; grid-template-columns:repeat(4,1fr); gap:8px; margin-top:16px; }
  .qb{ display:flex; align-items:center; gap:8px; padding:14px; font-size:15px; font-weight:700; color:#16295E; }

  /* 記録・リスト */
  .month-row{ display:flex; justify-content:space-between; align-items:center; gap:8px; margin-bottom:8px; flex-wrap:wrap; }
  .month-total{ font-size:15px; color:#3D4756; }
  .list{ overflow:hidden; margin-bottom:16px; }
  .rec{ border-bottom:1px solid #EEF0F3; }
  .rec:last-child{ border-bottom:none; }
  .rec-main{ display:grid; grid-template-columns:64px 1fr auto; gap:8px; align-items:center; width:100%; border:none; background:#fff; text-align:left; padding:14px 16px; cursor:pointer; font:inherit; color:inherit; min-height:60px; }
  .rec.open .rec-main{ background:#F7F8FA; }
  .rec-main .d{ font-size:13px; color:#5B6573; }
  .rec-main .c, .menu-row .c, .cp-main .c{ display:flex; flex-direction:column; gap:2px; min-width:0; }
  .rec-main .c b, .menu-row .c b, .cp-main .c b{ font-size:15px; font-weight:700; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .rec-main .c small, .menu-row .c small, .cp-main .c small{ font-size:13px; color:#5B6573; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .rec-main .a{ display:flex; flex-direction:column; align-items:flex-end; gap:4px; font-size:16px; font-weight:700; }
  .st{ font-style:normal; font-size:12px; font-weight:700; border-radius:999px; padding:1px 8px; }
  .st.warn{ background:#FDF1D6; color:#7A4F00; }
  .st.ok{ background:#E3F3EC; color:#0F5640; }
  .rec-act{ display:flex; justify-content:space-between; align-items:center; gap:8px; flex-wrap:wrap; padding:8px 16px 14px; background:#F7F8FA; }
  .rec-act > div{ display:flex; gap:8px; }
  .stat{ padding:14px; display:flex; flex-direction:column; gap:4px; }
  .stat span{ font-size:14px; color:#5B6573; }
  .stat b{ font-size:17px; }
  .stat b small{ font-size:12px; margin-right:6px; }
  .menu-row{ display:flex; align-items:center; gap:12px; width:100%; border:none; border-bottom:1px solid #EEF0F3; background:#fff; padding:14px 16px; text-align:left; cursor:pointer; font:inherit; color:inherit; min-height:60px; }
  .menu-row:last-child{ border-bottom:none; }
  .menu-row .ic{ width:36px; height:36px; border-radius:10px; background:#E6EBF7; color:#16295E; display:inline-flex; align-items:center; justify-content:center; flex-shrink:0; }
  .menu-row .c{ flex:1; }
  .menu-row .n{ font-size:14px; color:#5B6573; }
  .menu-row .a{ font-size:16px; font-weight:700; }
  .inl{ font-weight:400; font-size:13px; color:#5B6573; }

  /* 入力フォーム・下から出る窓 */
  .bform{ display:flex; flex-direction:column; gap:16px; }
  .bform .two{ margin-bottom:0; gap:12px; }
  .amt-field .lbl{ font-size:14px; font-weight:700; margin-bottom:6px; }
  .amt-field .lbl span{ font-weight:400; color:#5B6573; }
  .amt-field .box{ display:flex; align-items:center; gap:6px; border:1px solid #DFE3E8; border-radius:12px; padding:6px 10px 6px 14px; background:#fff; }
  .amt-field .box:focus-within{ border-color:#233E8B; }
  .amt-field .yen{ font-size:24px; font-weight:700; color:#5B6573; }
  .amt-field input{ flex:1; min-width:0; border:none; outline:none; font-size:32px !important; font-weight:700; color:#17212B; font-variant-numeric:tabular-nums; background:transparent; padding:4px 0; }
  .amt-field .clr{ width:32px; height:32px; border:none; border-radius:16px; background:#E9ECF0; color:#5B6573; display:inline-flex; align-items:center; justify-content:center; cursor:pointer; }
  .sel-wrap{ position:relative; }
  .auto-tag{ position:absolute; right:36px; top:50%; transform:translateY(-50%); font-size:12px; font-weight:700; color:#0F5640; background:#E3F3EC; border-radius:999px; padding:2px 8px; pointer-events:none; }
  .sheet-dim{ position:fixed; inset:0; z-index:250; background:rgba(23,33,43,0.40); display:flex; align-items:flex-end; justify-content:center; }
  .sheet{ width:100%; max-width:560px; max-height:92vh; overflow-y:auto; background:#F2F4F6; border-radius:20px 20px 0 0; padding:8px 16px calc(24px + env(safe-area-inset-bottom,0px)); animation:aibouUp .22s ease; }
  .sheet-head{ display:grid; grid-template-columns:44px 1fr 44px; align-items:center; margin-bottom:8px; }
  .sheet-head h2{ margin:0; text-align:center; font-size:17px; font-weight:700; }
  @media(min-width:769px){ .sheet-dim{ align-items:center; } .sheet{ border-radius:20px; } }

  /* お金の流れ */
  .chart-t{ font-size:15px; font-weight:700; margin-bottom:12px; }
  .chart-t small{ font-weight:400; color:#5B6573; font-size:13px; margin-left:4px; }
  .bars{ display:flex; align-items:flex-end; gap:6px; }
  .bar{ flex:1; display:flex; flex-direction:column; align-items:center; justify-content:flex-end; gap:4px; height:100%; border:none; background:transparent; cursor:pointer; padding:0; min-width:0; font:inherit; }
  .bar i{ display:block; width:70%; max-width:36px; background:#C3CDEA; border-radius:6px 6px 2px 2px; }
  .bar.on i{ background:#233E8B; }
  .bar.neg i{ background:#F0B8B3; }
  .bar.neg.on i{ background:#B3261E; }
  .bar .bv{ font-size:10px; color:#5B6573; white-space:nowrap; }
  .bar.on .bv{ color:#17212B; font-weight:700; }
  .bar .bm{ font-size:12px; color:#5B6573; }
  .bar.on .bm{ color:#17212B; font-weight:700; }
  .note-warn{ margin:12px 0 0; font-size:13px; line-height:1.6; color:#7A4F00; background:#FDF1D6; border-radius:12px; padding:10px 12px; }
  .tbl-b{ margin-bottom:16px; overflow:hidden; }
  .t-h{ padding:12px 16px; font-size:15px; font-weight:700; border-bottom:1px solid #EEF0F3; background:#F7F8FA; }
  .t-r{ display:flex; justify-content:space-between; align-items:center; padding:14px 16px; border-bottom:1px solid #EEF0F3; font-size:15px; }
  .t-r:last-child{ border-bottom:none; }
  .t-r .num{ font-weight:700; font-size:16px; }
  .t-r.total{ background:#E6EBF7; }
  .t-r.total .num{ font-size:20px; color:#17212B; }

  /* 請求書 */
  .steps{ display:flex; align-items:center; gap:4px; margin-bottom:16px; flex-wrap:wrap; }
  .st-wrap{}
  .steps .st{ display:flex; align-items:center; gap:6px; font-size:14px; color:#8A93A0; background:none; padding:0; }
  .steps .st i{ font-style:normal; width:26px; height:26px; border-radius:13px; background:#E9ECF0; color:#8A93A0; display:inline-flex; align-items:center; justify-content:center; font-size:13px; font-weight:700; }
  .steps .st.on{ color:#17212B; font-weight:700; }
  .steps .st.on i{ background:#233E8B; color:#fff; }
  .steps .st em{ display:inline-block; width:24px; height:2px; background:#DFE3E8; margin:0 4px; }
  .steps .no{ margin-left:auto; font-size:13px; color:#5B6573; }
  .tax-tbl{ background:#F7F8FA; border:1px solid #DFE3E8; border-radius:12px; padding:12px; }
  .tax-tbl .t-cap{ font-size:14px; font-weight:700; margin-bottom:8px; }
  .tax-tbl .tr{ display:grid; grid-template-columns:0.6fr 1fr 1fr 1fr; gap:4px; font-size:14px; padding:6px 0; border-bottom:1px solid #EEF0F3; font-variant-numeric:tabular-nums; }
  .tax-tbl .tr span:not(:first-child){ text-align:right; }
  .tax-tbl .tr.th{ font-size:12px; color:#5B6573; }
  .tax-tbl .grand{ display:flex; justify-content:space-between; align-items:center; margin-top:12px; background:#233E8B; color:#fff; border-radius:12px; padding:12px 14px; font-size:15px; font-weight:700; }
  .tax-tbl .grand b{ font-size:22px; }

  /* 取引先 */
  .search{ display:flex; align-items:center; gap:8px; background:#fff; border:1px solid #DFE3E8; border-radius:12px; padding:0 12px; margin-bottom:12px; }
  .search input{ flex:1; border:none; outline:none; font-size:16px; min-height:48px; background:transparent; }
  .cp-row{ display:flex; align-items:center; border-bottom:1px solid #EEF0F3; padding-right:12px; }
  .cp-row:last-child{ border-bottom:none; }
  .cp-main{ flex:1; min-width:0; display:flex; align-items:center; gap:8px; border:none; background:#fff; text-align:left; padding:14px 8px 14px 16px; cursor:pointer; font:inherit; color:inherit; }
  .cp-main .c{ flex:1; }
  .cp-main .c b{ display:flex; align-items:center; gap:6px; }
  .kind{ font-style:normal; font-size:11px; font-weight:700; color:#16295E; background:#E6EBF7; border-radius:999px; padding:1px 6px; flex-shrink:0; }
  .kind.sample{ color:#7A4F00; background:#FDF1D6; }
  .hon{ font-size:14px; color:#5B6573; }

  .bottom-nav{ display:none; position:fixed; left:0; right:0; bottom:0; z-index:200; background:#fff; border-top:1px solid #DFE3E8; padding:6px 4px calc(6px + env(safe-area-inset-bottom,0px)); justify-content:space-around; align-items:center; }
  .bottom-nav button{ flex:1; display:flex; flex-direction:column; align-items:center; gap:2px; border:none; background:transparent; color:#8A93A0; font-size:11px; padding:4px 0; cursor:pointer; min-height:48px; justify-content:center; }
  .bottom-nav button.on{ color:#16295E; font-weight:700; }
  .bottom-nav button.plus{ flex:0 0 auto; width:56px; height:56px; border-radius:28px; background:#233E8B; color:#fff; margin-top:-22px; box-shadow:0 4px 12px rgba(35,62,139,0.28); }

  .ar-tabs{ display:none; }
  @media(max-width:768px){
    .ar-tabs{ display:block; margin-bottom:16px; }
    .ar-col[data-off]{ display:none; }
    .sidebar{ display:none !important; }
    .bottom-nav{ display:flex !important; }
    .pc-only{ display:none !important; }
    .main-area{ margin-left:0 !important; padding-bottom:calc(76px + env(safe-area-inset-bottom,0px)); }
    .screen-wrap{ padding:16px 16px 32px !important; }
    .demo-bar{ padding:8px 16px; font-size:13px; }
    .kpi-row{ flex-direction:column; }
    .charts-row{ grid-template-columns:1fr !important; }
    .form-grid{ grid-template-columns:1fr !important; }
    .inv-grid{ grid-template-columns:repeat(2,minmax(0,1fr)) !important; }
    .item-grid{ grid-template-columns:repeat(2,minmax(0,1fr)) !important; }
    .item-desc{ grid-column:1 / -1; }
    .master-grid{ grid-template-columns:minmax(0,1fr) !important; }
    .master-grid > *{ min-width:0; }
    /* 入力欄が16px未満だと、iPhoneでは触るたびに画面が勝手に拡大する */
    input, select, textarea{ font-size:16px !important; min-height:44px; }
    .tbl-wrap{ overflow-x:auto !important; -webkit-overflow-scrolling:touch; }
    .t-sales th:nth-child(2), .t-sales td:nth-child(2), .t-sales th:nth-child(4), .t-sales td:nth-child(4), .t-sales th:nth-child(6), .t-sales td:nth-child(6), .t-sales th:nth-child(7), .t-sales td:nth-child(7),
    .t-exp th:nth-child(2), .t-exp td:nth-child(2), .t-exp th:nth-child(5), .t-exp td:nth-child(5), .t-exp th:nth-child(7), .t-exp td:nth-child(7){ display:none; }
    .t-sales th, .t-sales td, .t-exp th, .t-exp td{ padding-left:8px !important; padding-right:8px !important; }
    .tax-tbl .tr{ font-size:13px; }
  }
`;
