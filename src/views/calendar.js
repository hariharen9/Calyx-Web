import { S, reduced, buzz } from "../state/state.js";
import { itemsOn, dotsFor, col, longDate, emptyBox, stg, segHtml, endOf, dur, fmtT } from "../queries/queries.js";
import { todayKey, MONTHS, MS, DAYS, DS, pd, ymd, addD, addKey, MIN, pad, esc, now, nowMin, $, $$ } from "../utils/helpers.js";
import { ic } from "../utils/icons.js";
import { taskRow } from "./tasks.js";

export const H0 = 6;
export const H1 = 24;
export const HH = 56;

let _renderFn = null;
export function setCalRenderFn(fn) {
  _renderFn = fn;
}

export function itemRow(it, k) {
  if (it.type === "task") return taskRow(it, false);
  const s = it.start ? MIN(it.start) : null,
    sub =
      it.type === "event"
        ? `${dur(MIN(endOf(it)) - s)}${it.loc ? " · " + esc(it.loc) : ""}`
        : it.type === "reminder"
          ? "Reminder"
          : "Birthday";
  return `<button class="irow press" data-act="open" data-id="${it.id}" data-date="${k}" style="--c:${col(it)}"><span class="bar"></span><span class="tm num">${it.allDay ? "All day" : fmtT(it.start)}</span><span class="tx"><b>${esc(it.title)}</b><small>${sub}</small></span>${it.repeat ? `<span style="color:var(--muted)">${ic("repeat", 16)}</span>` : ""}</button>`;
}

/* ================= CALENDAR ================= */
export function dayList(k) {
  const its = itemsOn(k);
  return `<div class="dayhead"><div><h3 class="disp">${k === todayKey() ? "Today" : longDate(k)}</h3><small>${its.length ? `${its.length} ${its.length > 1 ? "items" : "item"}${k === todayKey() ? " · " + longDate(k) : ""}` : "Nothing planned yet"}</small></div><button class="addbtn press" data-act="compose" data-date="${k}">${ic("plus", 16)}Add</button></div><section class="card list">${its.length ? its.map((i) => itemRow(i, k)).join("") : emptyBox("cal", "A clear day. Tap Add to plan something.")}</section>`;
}

export function vCal() {
  let h = `<div class="mobile-cal-head">
    <header class="top ${stg(0)}">
      <div>
        <div class="sub">${MONTHS[pd(S.sel).getMonth()]} ${pd(S.sel).getFullYear()}</div>
        <h1 class="disp h1">Calendar</h1>
      </div>
      <div class="top-actions">
        <button class="pillbtn press" data-act="todayjump">Today</button>
        <button class="ibtn press" data-act="cmd" aria-label="Search">${ic("search")}</button>
      </div>
    </header>
    <div class="${stg(1)}" style="margin-bottom: 14px;">
      ${segHtml(
        "calView",
        [
          ["month", "Month"],
          ["week", "Week"],
          ["agenda", "Agenda"],
        ],
        S.calView,
      )}
    </div>
  </div>`;
  h +=
    S.calView === "month"
      ? vMonth()
      : S.calView === "week"
        ? vWeek()
        : vAgenda();
  return h;
}

export function vMonth() {
  const { y, m } = S.cal,
    ws = S.prefs.week,
    first = new Date(y, m, 1),
    off = (first.getDay() - ws + 7) % 7,
    start = addD(first, -off),
    t = todayKey(),
    L = ["S", "M", "T", "W", "T", "F", "S"];
  let dow = "",
    cells = "";
  for (let i = 0; i < 7; i++) dow += `<span>${L[(ws + i) % 7]}</span>`;
  for (let i = 0; i < 42; i++) {
    const d = addD(start, i),
      k = ymd(d);
    cells += `<button class="day ${d.getMonth() !== m ? "dim" : ""} ${k === t ? "today" : ""} ${k === S.sel ? "sel" : ""}" data-act="seldate" data-date="${k}" aria-label="${longDate(k)}"><span class="dn">${d.getDate()}</span><span class="dots">${dotsFor(k)}</span></button>`;
  }
  return `<div class="desk-cal-split"><div class="desk-cal-main"><div class="${stg(2)}"><div class="mhead"><h2 class="disp">${MONTHS[m]} ${y}</h2><div class="nav"><button data-act="mprev" aria-label="Previous month">${ic("chevL", 18)}</button><button data-act="mnext" aria-label="Next month">${ic("chevR", 18)}</button></div></div><div class="dow">${dow}</div><div class="mgrid" id="mgrid">${cells}</div></div></div><div class="desk-cal-side ${stg(3)}" id="daylist">${dayList(S.sel)}</div></div>`;
}

export function layoutCols(evs) {
  evs.sort((a, b) => a.s - b.s || b.e - a.e);
  const out = [];
  let cl = [],
    ce = 0;
  const flush = () => {
    const cols = [];
    cl.forEach((c) => {
      let i = 0;
      while (cols[i] !== undefined && cols[i] > c.s) i++;
      cols[i] = c.e;
      c.col = i;
    });
    cl.forEach((c) => (c.n = cols.length));
    out.push(...cl);
    cl = [];
  };
  evs.forEach((c) => {
    if (cl.length && c.s >= ce) flush();
    cl.push(c);
    ce = Math.max(ce, c.e);
  });
  if (cl.length) flush();
  return out;
}

export function vWeek() {
  const ws = S.prefs.week,
    sd = pd(S.sel),
    off = (sd.getDay() - ws + 7) % 7,
    start = addD(sd, -off),
    t = todayKey(),
    end = addD(start, 6);
  const range =
    start.getMonth() === end.getMonth()
      ? `${start.getDate()} – ${end.getDate()} ${MS[end.getMonth()]}`
      : `${start.getDate()} ${MS[start.getMonth()]} – ${end.getDate()} ${MS[end.getMonth()]}`;
  let strip = "";
  for (let i = 0; i < 7; i++) {
    const d = addD(start, i),
      k = ymd(d);
    strip += `<button class="wd ${k === t ? "today" : ""} ${k === S.sel ? "sel" : ""}" data-act="seldate" data-date="${k}"><small>${DS[d.getDay()]}</small><b>${d.getDate()}</b><span class="dots">${dotsFor(k).replace(/<em>.*?<\/em>/, "")}</span></button>`;
  }
  const its = itemsOn(S.sel),
    allday = its.filter((i) => i.allDay || i.type === "task");
  const timed = layoutCols(
    its
      .filter((i) => !i.allDay && i.type !== "task" && i.start)
      .map((i) => ({
        it: i,
        s: MIN(i.start),
        e: i.type === "event" ? MIN(endOf(i)) : MIN(i.start) + 30,
      })),
  );
  let lines = "";
  for (let h = H0; h < H1; h++)
    lines += `<div class="hline" style="top:${(h - H0) * HH}px"><span>${S.prefs.hour === "24h" ? pad(h) + ":00" : (h % 12 || 12) + (h >= 12 ? " pm" : " am")}</span></div>`;
  const blocks = timed
    .map((c) => {
      const top = Math.max(0, ((c.s - H0 * 60) / 60) * HH),
        hgt = Math.max(28, ((c.e - c.s) / 60) * HH - 3);
      return `<button class="evb" data-act="open" data-id="${c.it.id}" data-date="${S.sel}" style="--c:${col(c.it)};top:${top}px;height:${hgt}px;left:calc(${(c.col / c.n) * 100}% + 2px);width:calc(${100 / c.n}% - 4px)"><b>${esc(c.it.title)}</b>${hgt > 40 ? `<small>${fmtT(c.it.start)}${c.it.type === "event" ? " – " + fmtT(endOf(c.it)) : ""}</small>` : ""}</button>`;
    })
    .join("");
  const nowl =
    S.sel === t
      ? `<div class="nowline" id="nowline" style="top:${((nowMin() - H0 * 60) / 60) * HH}px"></div>`
      : "";
  const ad = allday.length
    ? `<div class="adchips">${allday.map((i) => `<button class="adchip press" style="--c:${col(i)}" data-act="open" data-id="${i.id}" data-date="${S.sel}">${ic(i.type === "task" ? "tasks" : "gift", 16)}${esc(i.title)}</button>`).join("")}</div>`
    : "";
  return `<div class="${stg(2)}"><div class="mhead"><h2 class="disp">${range}</h2><div class="nav"><button data-act="wprev" aria-label="Previous week">${ic("chevL", 18)}</button><button data-act="wnext" aria-label="Next week">${ic("chevR", 18)}</button></div></div><div class="wstrip">${strip}</div>${ad}</div><section class="card dview ${stg(3)}" style="padding:12px 0"><div class="dgrid" id="dgrid" data-act="slot" style="height:${(H1 - H0) * HH}px">${lines}${blocks}${nowl}</div></section>`;
}

export function vAgenda() {
  const f = S.filter,
    t = todayKey();
  let body = "";
  for (let i = 0; i < S.agendaDays; i++) {
    const k = addKey(S.agendaStart, i);
    const its = itemsOn(k).filter(
      (x) =>
        f === "all" ||
        (f === "events" && (x.type === "event" || x.type === "birthday")) ||
        (f === "tasks" && x.type === "task") ||
        (f === "reminders" && x.type === "reminder"),
    );
    if (!its.length) continue;
    const d = pd(k);
    body += `<div class="agd ${k === t ? "today" : ""} ${k < t ? "past" : ""}"><div class="dcol"><b class="disp">${d.getDate()}</b><small>${DS[d.getDay()]}</small>${k === t ? '<span class="tagnow">Today</span>' : ""}</div><div class="card list">${its.map((x) => itemRow(x, k)).join("")}</div></div>`;
  }
  return `<div class="chips ${stg(2)}">${[
    ["all", "All"],
    ["events", "Events"],
    ["tasks", "Tasks"],
    ["reminders", "Reminders"],
  ]
    .map(
      ([v, l]) =>
        `<button class="chip ${f === v ? "on" : ""}" data-seg="filter" data-val="${v}">${l}</button>`,
    )
    .join(
      "",
    )}</div><button class="ghost press ${stg(3)}" data-act="agearlier">${ic("chevL", 16)}Show earlier</button><div class="${stg(4)}">${body || emptyBox("cal", "Nothing matches this filter in the next few weeks.")}</div><button class="ghost press" data-act="agmore">Show more days</button>`;
}

export function shiftMonth(n) {
  const d = new Date(S.cal.y, S.cal.m + n, 1);
  S.cal = { y: d.getFullYear(), m: d.getMonth() };
  const t = now();
  S.sel =
    d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth()
      ? todayKey()
      : ymd(d);
  if (_renderFn) _renderFn();
  const g = $("#mgrid");
  if (g && !reduced()) g.classList.add(n > 0 ? "sl-l" : "sl-r");
  buzz(6);
}

export function slideWeek(n) {
  S.sel = addKey(S.sel, 7 * n);
  if (_renderFn) _renderFn();
  const s = $(".wstrip");
  if (s && !reduced())
    s.animate(
      [
        { opacity: 0, transform: `translateX(${n > 0 ? 36 : -36}px)` },
        { opacity: 1, transform: "none" },
      ],
      { duration: 420, easing: "cubic-bezier(.22,.9,.3,1)" },
    );
  buzz(6);
}
