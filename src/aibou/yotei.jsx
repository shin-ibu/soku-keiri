// 予定の画面：本業の予定と経営の仕事を、1日ずつ一つに並べる
import { useMemo, useState } from "react";
import { color } from "../ui/tokens.js";
import { s } from "../ui/theme.js";
import { FR } from "../ui/parts.jsx";
import { Head, Tab } from "./ui.jsx";
import { ymdOf, addDays, parseYmd, WEEK, dayLabel, workOf, isRestDay, REPEATS, autoItems, itemsForDay, overdueItems, parseScheduleText } from "./schedule.js";

const yen = (n) => `¥${Math.round(n || 0).toLocaleString("ja-JP")}`;
const KIND_STYLE = {
  入金期限: { bg: "#E3F3EC", fg: "#0F5640" },
  支払期限: { bg: "#FBEAE8", fg: "#B3261E" },
  見積期限: { bg: "#FDF1D6", fg: "#7A4F00" },
  追いかけ: { bg: "#FDF1D6", fg: "#7A4F00" },
  月末: { bg: color.priSoft, fg: color.priDark },
};
const blank = (date) => ({ type: "event", title: "", date, time: "", repeat: "none", memo: "" });
const weekStart = (ymd) => { const d = parseYmd(ymd); return addDays(ymd, -((d.getDay() + 6) % 7)); }; // 月曜はじまり

export function YoteiScreen({ setScreen, events = [], setEvents, master, setMaster, sales, expenses, invoices, estimates = [], inventory = {}, showToast, setArTab, setAssetsTab }) {
  const today = ymdOf(new Date());
  const [day, setDay] = useState(today);
  const [tab, setTab] = useState("day");
  const [form, setForm] = useState(null);   // 追加・編集の下書き
  const [quick, setQuick] = useState("");
  const work = workOf(master);
  const auto = useMemo(() => autoItems({ sales, expenses, invoices, estimates, inventory, today }), [sales, expenses, invoices, estimates, inventory, today]);
  const items = itemsForDay(day, { events, auto });
  const late = day === today ? overdueItems(auto, today) : [];
  const ws = weekStart(day);
  const week = Array.from({ length: 7 }, (_, i) => addDays(ws, i));
  const countOn = (d) => itemsForDay(d, { events, auto }).filter((x) => !x.done).length;

  const sf = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const save = () => {
    if (!form.title.trim()) { showToast("件名を入れてください", "error"); return; }
    if (form.id) setEvents((es) => es.map((e) => (e.id === form.id ? { ...e, ...form, title: form.title.trim() } : e)));
    else setEvents((es) => [...es, { ...form, id: Date.now(), title: form.title.trim(), doneDates: [] }]);
    showToast(form.id ? "予定を直しました" : `${dayLabel(form.date)}に入れました`);
    setDay(form.date); setForm(null);
  };
  const remove = (ev) => { if (window.confirm(`「${ev.title}」を削除します。よろしいですか？${ev.repeat && ev.repeat !== "none" ? "\nくり返しの予定は、すべての日から消えます。" : ""}`)) { setEvents((es) => es.filter((e) => e.id !== ev.id)); setForm(null); showToast("削除しました"); } };
  const toggleDone = (ev) => setEvents((es) => es.map((e) => {
    if (e.id !== ev.id) return e;
    const dd = e.doneDates || [];
    return { ...e, doneDates: dd.includes(day) ? dd.filter((x) => x !== day) : [...dd, day] };
  }));
  const openAuto = (a) => { if (a.tab && setArTab) setArTab(a.tab); if (a.sub && setAssetsTab) setAssetsTab(a.sub); setScreen(a.go); };
  const fromQuick = () => {
    const r = parseScheduleText(quick, today);
    if (!r) { showToast("日付が読み取れませんでした。「明日10時に打ち合わせ」のように入れてください", "error"); return; }
    setForm({ ...blank(r.date), ...r }); setQuick("");
  };
  const setWork = (patch) => setMaster((m) => ({ ...m, company: { ...m.company, work: { ...workOf(m), ...patch } } }));

  const Row = ({ it }) => {
    if (it.auto) {
      const st = KIND_STYLE[it.kind] || KIND_STYLE.月末;
      return (
        <div className="todo" style={{ gridTemplateColumns: "56px 1fr auto" }}>
          <span style={{ fontSize: 12, fontWeight: 700, padding: "2px 6px", borderRadius: 999, background: st.bg, color: st.fg, textAlign: "center", whiteSpace: "nowrap" }}>{it.kind}</span>
          <div className="c"><b>{it.title}</b>{it.amount ? <small>{yen(it.amount)}{it.overdue ? `・期限 ${dayLabel(it.date)} を過ぎています` : ""}</small> : it.overdue ? <small>期限 {dayLabel(it.date)} を過ぎています</small> : null}</div>
          <button className="btn-sub sm" onClick={() => openAuto(it)}>開く</button>
        </div>
      );
    }
    const task = it.type === "task";
    return (
      <div className="todo" style={{ gridTemplateColumns: "56px 1fr auto" }}>
        {task
          ? <button aria-label={it.done ? "未完了に戻す" : "済にする"} aria-pressed={it.done} onClick={() => toggleDone(it)} style={{ width: 28, height: 28, borderRadius: 8, border: `2px solid ${it.done ? color.ok : color.line}`, background: it.done ? color.ok : "#fff", color: "#fff", fontSize: 16, fontWeight: 700, cursor: "pointer", justifySelf: "center" }}>{it.done ? "✓" : ""}</button>
          : <span style={{ fontSize: 15, fontWeight: 700, color: it.time ? color.ink : color.sub, textAlign: "center" }}>{it.time || "終日"}</span>}
        <div className="c" style={{ opacity: it.done ? 0.55 : 1 }}>
          <b style={{ textDecoration: it.done ? "line-through" : "none" }}>{it.title}</b>
          <small>{task ? "やること" : "予定"}{it.repeat && it.repeat !== "none" ? `・${REPEATS.find((r) => r[0] === it.repeat)[1]}` : ""}{it.memo ? `・${it.memo}` : ""}</small>
        </div>
        <button className="btn-sub sm" onClick={() => setForm({ ...blank(it.date), ...it })}>直す</button>
      </div>
    );
  };

  return (
    <div className="screen-wrap b-screen">
      <Head title="予定" onBack={() => setScreen("talk")} right={<button className="btn-pri sm" onClick={() => setForm(blank(day))}>＋ 入れる</button>} />
      <Tab items={[["day", "予定"], ["work", "働き方"]]} value={tab} onChange={setTab} />

      {tab === "day" && <>
        {/* 話し言葉で入れる */}
        <div className="card pad" style={{ marginTop: 16, display: "flex", gap: 8 }}>
          <input style={{ ...s.inp, flex: 1 }} value={quick} onChange={(e) => setQuick(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.nativeEvent.isComposing) fromQuick(); }} placeholder="例：明日10時に山田さんと打ち合わせ" aria-label="話し言葉で予定を入れる" />
          <button className="btn-pri sm" onClick={fromQuick}>入れる</button>
        </div>

        {/* 週 */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "4px 0 8px" }}>
          <button className="btn-sub sm" onClick={() => setDay(addDays(day, -7))} aria-label="前の週">‹ 前の週</button>
          {day !== today && <button className="btn-sub sm" onClick={() => setDay(today)}>今日</button>}
          <button className="btn-sub sm" onClick={() => setDay(addDays(day, 7))} aria-label="次の週">次の週 ›</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 16 }}>
          {week.map((d) => {
            const dt = parseYmd(d), on = d === day, rest = isRestDay(d, work), n = countOn(d);
            return (
              <button key={d} onClick={() => setDay(d)} aria-pressed={on} aria-label={`${dayLabel(d)}${n ? `、${n}件` : ""}${rest ? "、休み" : ""}`}
                style={{ border: on ? `2px solid ${color.pri}` : `1px solid ${color.line}`, background: on ? color.priSoft : rest ? "#F2F4F6" : "#fff", borderRadius: 12, padding: "8px 0 6px", cursor: "pointer", display: "grid", gap: 2, justifyItems: "center" }}>
                <span style={{ fontSize: 12, color: dt.getDay() === 0 ? color.err : dt.getDay() === 6 ? color.pri : color.sub }}>{WEEK[dt.getDay()]}</span>
                <span style={{ fontSize: 17, fontWeight: d === today ? 800 : 600, color: d === today ? color.pri : color.ink }}>{dt.getDate()}</span>
                <span style={{ height: 6, width: 6, borderRadius: 3, background: n ? color.pri : "transparent" }} />
              </button>
            );
          })}
        </div>

        {late.length > 0 && (
          <div className="card pad" style={{ borderColor: "#F0B8B3" }}>
            <div style={{ fontWeight: 700, color: color.err, marginBottom: 4 }}>期限を過ぎているもの {late.length}件</div>
            {late.map((it) => <Row key={it.id} it={it} />)}
          </div>
        )}

        <h2 className="sec-h">{dayLabel(day)}{day === today && <span className="muted">今日</span>}{isRestDay(day, work) && <span className="st warn">休みの日</span>}</h2>
        <div className="card">
          {items.length === 0
            ? <div className="empty">この日の予定はありません。<br />上の欄に話し言葉で入れるか、「＋ 入れる」から入れられます。</div>
            : items.map((it) => <Row key={`${it.id}-${day}`} it={it} />)}
        </div>
        <p style={{ fontSize: 13, color: color.sub, lineHeight: 1.7 }}>入金期限・支払期限・見積もりの追いかけなど、経営の仕事は記録から自動で並びます。済にすると、ここからも消えます。</p>
      </>}

      {tab === "work" && (
        <div className="card pad" style={{ marginTop: 16 }}>
          <div style={s.formTitle}>会社の働き方</div>
          <p style={{ fontSize: 14, color: color.sub, lineHeight: 1.7, marginTop: 0 }}>休みの日と仕事の時間を決めておくと、AIBOUが休みの日の期限を前もって知らせ、仕事の時間の中でお知らせします。</p>
          <FR label="休みの曜日">
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
              {WEEK.map((w, i) => { const on = work.restDays.includes(i); return (
                <button key={w} aria-pressed={on} onClick={() => setWork({ restDays: on ? work.restDays.filter((x) => x !== i) : [...work.restDays, i].sort() })}
                  style={{ width: 40, height: 40, borderRadius: 20, border: on ? "none" : `1px solid ${color.line}`, background: on ? color.pri : "#fff", color: on ? "#fff" : color.ink, fontSize: 15, fontWeight: 700, cursor: "pointer" }}>{w}</button>
              ); })}
            </div>
          </FR>
          <div className="two">
            <FR label="仕事を始める時刻"><input type="time" style={s.inp} value={work.start} onChange={(e) => setWork({ start: e.target.value })} /></FR>
            <FR label="仕事を終える時刻"><input type="time" style={s.inp} value={work.end} onChange={(e) => setWork({ end: e.target.value })} /></FR>
          </div>
          <FR label="今日のお知らせを受け取る時刻" hint={"毎朝この時刻に、今日の予定と経営の仕事をまとめて知らせます。\n（お知らせの送信は、アプリの公開版で使えるようになります）"}><input type="time" style={s.inp} value={work.notifyTime} onChange={(e) => setWork({ notifyTime: e.target.value })} /></FR>
        </div>
      )}

      {form && (
        <div className="sheet-dim" onClick={() => setForm(null)}>
          <div className="sheet" role="dialog" aria-modal="true" aria-label={form.id ? "予定を直す" : "予定を入れる"} onClick={(e) => e.stopPropagation()}>
            <div className="sheet-head"><span /><h2>{form.id ? "予定を直す" : "予定を入れる"}</h2><button className="icon-btn" aria-label="閉じる" onClick={() => setForm(null)}>×</button></div>
            <div className="bform">
              <Tab items={[["event", "予定"], ["task", "やること"]]} value={form.type} onChange={(v) => sf("type", v)} />
              <FR label="件名"><input style={s.inp} value={form.title} onChange={(e) => sf("title", e.target.value)} placeholder={form.type === "task" ? "見積書を送る" : "山田さんと打ち合わせ"} autoFocus /></FR>
              <div className="two">
                <FR label="日付"><input type="date" style={s.inp} value={form.date} onChange={(e) => sf("date", e.target.value)} /></FR>
                <FR label="時刻（なくてもOK）"><input type="time" style={s.inp} value={form.time || ""} onChange={(e) => sf("time", e.target.value)} /></FR>
              </div>
              {isRestDay(form.date, work) && <div style={{ fontSize: 14, color: color.warnInk, background: "#FDF1D6", borderRadius: 8, padding: "8px 12px" }}>{dayLabel(form.date)}は休みの日です。このまま入れてもかまいません。</div>}
              <FR label="くり返し"><select style={s.inp} value={form.repeat || "none"} onChange={(e) => sf("repeat", e.target.value)}>{REPEATS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></FR>
              <FR label="メモ（なくてもOK）"><input style={s.inp} value={form.memo || ""} onChange={(e) => sf("memo", e.target.value)} placeholder="場所・持ち物など" /></FR>
              <button className="btn-main" onClick={save}>{form.id ? "この内容で直す" : "この内容で入れる"}</button>
              {form.id && <button className="btn-del" style={{ width: "100%", marginTop: 8 }} onClick={() => remove(form)}>この予定を削除</button>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
