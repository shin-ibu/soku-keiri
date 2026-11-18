export const LOAD_KEY = "sokuKeiriV4";
export const load = () => { try { const r = localStorage.getItem(LOAD_KEY); return r ? JSON.parse(r) : null; } catch { return null; } };
export const saveAll = (d) => { try { localStorage.setItem(LOAD_KEY, JSON.stringify(d)); } catch { /* 保存できない端末（プライベートモードなど）では、その場だけ残す */ } };
