// AIBOU の経営画面で使う小さな部品
import { useState } from "react";
import { color } from "../ui/tokens.js";

export const Back = ({ onClick }) => (
  <button className="icon-btn" aria-label="もどる" onClick={onClick}>
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>
  </button>
);
export const Head = ({ title, onBack, right }) => (<div className="scr-head">{onBack ? <Back onClick={onBack} /> : <span />}<h1>{title}</h1>{right || <span />}</div>);
export const Tab = ({ items, value, onChange }) => (
  <div className="seg" role="tablist">{items.map(([id, label]) => <button key={id} role="tab" aria-selected={value === id} className={value === id ? "on" : ""} onClick={() => onChange(id)}>{label}</button>)}</div>
);
// 「これは何？」の説明
export function Why({ label, children }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" aria-label={`${label}とは`} aria-expanded={open} onClick={() => setOpen((v) => !v)} style={{ width: 22, height: 22, borderRadius: 11, border: "none", background: color.priSoft, color: color.pri, fontSize: 13, fontWeight: 700, cursor: "pointer", padding: 0, flexShrink: 0 }}>?</button>
      {open && <div style={{ gridColumn: "1 / -1", fontSize: 14, lineHeight: 1.7, color: "#1E3A6E", background: color.priSoft, borderRadius: 8, padding: "8px 12px", whiteSpace: "pre-line" }}>{children}</div>}
    </>
  );
}
export const Num = ({ v, onClick, style }) => <button type="button" onClick={onClick} className="num" style={{ border: "none", background: "none", padding: 0, font: "inherit", cursor: "pointer", borderBottom: `1.5px dashed ${color.line}`, color: "inherit", ...style }}>{v}</button>;

