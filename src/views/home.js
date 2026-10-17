import { S } from "../state/state.js";
import { itemsOn, curNext, freeLeft, logStats, cdParts, col, stg, ringHtml, dur, fmtT, fmtLeft, endOf, RC, emptyBox } from "../queries/queries.js";
import { now, todayKey, nowMin, MIN, MONTHS, DAYS, clamp, diffD, esc } from "../utils/helpers.js";
import { ic } from "../utils/icons.js";
import { taskRow } from "./tasks.js";
import { pinCard, byUpd } from "./pages.js";

export const S0 = 7 * 60;
export const SPAN = 16 * 60;

export const relIn = (min) =>
  min < 60 ? `in ${min}m` : `in ${(min / 60).toFixed(1)}h`;

/* ================= HOME ================= */
export function heroHtml(cur, next, k) {
  const nm = nowMin();
  if (cur) {
    const s = MIN(cur.start),
      e = MIN(endOf(cur)),
      left = (e - nm) * 60;
    return `<button class="hero press ${stg(2)}" data-act="open" data-id="${cur.id}" data-date="${k}" data-hero="cur" data-s="${s}" data-e="${e}"><div><div class="hl"><span class="live-dot"></span>Happening now</div><h2 class="disp">${esc(cur.title)}</h2><div class="hl2">${fmtT(cur.start)} – ${fmtT(endOf(cur))}${cur.loc ? " · " + esc(cur.loc) : ""}</div>${next ? `<div class="hnext">Next: <b>${esc(next.title)}</b> at ${fmtT(next.start)}</div>` : `<div class="hnext">Nothing else on the calendar today</div>`}</div>${ringHtml(left / 60 / (e - s), fmtLeft(left), "left")}</button>`;
  }
  if (next) {
    const s = MIN(next.start),
      until = s - nm;
    return `<button class="hero press ${stg(2)}" data-act="open" data-id="${next.id}" data-date="${k}" data-hero="next" data-s="${s}"><div><div class="hl"><span class="live-dot"></span>Up next</div><h2 class="disp">${esc(next.title)}</h2><div class="hl2">${fmtT(next.start)} – ${fmtT(endOf(next))}${next.loc ? " · " + esc(next.loc) : ""}</div><div class="hnext">Starts <b id="hrel">${relIn(until)}</b></div></div>${ringHtml(until / 180, fmtLeft(until * 60), "to start")}</button>`;
  }
  return `<div class="hero ${stg(2)}"><div><div class="hl">Today</div><h2 class="disp">You're all clear</h2><div class="hl2">Nothing left on the calendar. Enjoy the evening.</div></div><div class="ring"><svg viewBox="0 0 100 100"><circle class="trk" cx="50" cy="50" r="44"/><circle class="prg" cx="50" cy="50" r="44" stroke-dasharray="${RC}" stroke-dashoffset="0"/></svg><div class="rt" style="color:var(--hero-ring)">${ic("check", 34)}</div></div></div>`;
}

export function vHome() {
  const n = now(),
    k = todayKey(),
    nm = nowMin(),
    { cur, next } = curNext(),
    day = itemsOn(k);
  const evs = day.filter((i) => i.type === "event"),
    hr = n.getHours(),
    part = hr < 12 ? "morning" : hr < 17 ? "afternoon" : "evening";
  const tTasks = S.items.filter((i) => i.type === "task" && i.date === k);
  const dueTasks = S.items.filter(
    (i) =>
      i.type === "task" && (i.date === k || (!i.done && i.date && i.date < k)),
  );

  let col1 = `<header class="top ${stg(0)}"><div><div class="sub">${DAYS[n.getDay()]} ${part}</div><h1 class="disp h1">${n.getDate()} ${MONTHS[n.getMonth()]}</h1></div><div class="top-actions"><button class="ibtn press" data-act="settings" aria-label="Settings">${ic("settings")}</button></div></header>`;
  col1 += `<button class="cmdpill press ${stg(1)}" data-act="cmd">${ic("spark", 20)}<span>Add or find anything</span><kbd>dentist fri 4pm</kbd></button>`;
  col1 += heroHtml(cur, next, k);
  const blocks = evs
    .filter((e) => e.start)
    .map((e) => {
      const s = Math.max(MIN(e.start), S0),
        en = Math.min(MIN(endOf(e)), S0 + SPAN);
      if (en <= s) return "";
      return `<button class="blk ${en <= nm ? "past" : ""}" data-act="open" data-id="${e.id}" data-date="${k}" style="left:${((s - S0) / SPAN) * 100}%;width:${((en - s) / SPAN) * 100}%;--c:${col(e)}" aria-label="${esc(e.title)}"></button>`;
    })
    .join("");
  const hrs = [9, 12, 15, 18, 21]
    .map(
      (x) =>
        `<span style="left:${((x * 60 - S0) / SPAN) * 100}%">${S.prefs.hour === "24h" ? x : (x % 12 || 12) + (x >= 12 ? "p" : "a")}</span>`,
    )
    .join("");
  const free = freeLeft();
  col1 += `<section class="card glance ${stg(3)}"><div class="sh"><h3 class="disp">Today at a glance</h3><button data-act="tab" data-tab="cal">Calendar</button></div><div class="strip">${blocks}<span class="nowm" id="dsnow" style="left:${clamp(((nm - S0) / SPAN) * 100, 0, 100)}%"></span></div><div class="hrs">${hrs}</div><div class="stats"><div><b class="disp" data-count="${evs.length}">${evs.length}</b><small>events</small></div><div><b class="disp">${tTasks.filter((t) => t.done).length}/${tTasks.length}</b><small>tasks done</small></div><div><b class="disp" id="freeval">${dur(free)}</b><small>free today</small></div></div></section>`;
  const tl = day.filter((i) => i.type !== "task");
  col1 += `<div class="sh ${stg(4)}"><h3 class="disp">Timeline</h3><button data-act="compose" data-date="${k}">Add</button></div>`;
  col1 += `<section class="card tl ${stg(5)}">${
    tl.length
      ? tl
          .map((i) => {
            const s = i.allDay ? 0 : MIN(i.start),
              e = i.allDay ? 0 : MIN(endOf(i));
            const past = !i.allDay && (i.type === "event" ? e <= nm : s < nm),
              isCur = i.type === "event" && s <= nm && nm < e;
            const sub =
              i.type === "event"
                ? `${dur(e - s)}${i.loc ? " · " + esc(i.loc) : ""}`
                : i.type === "reminder"
                  ? "Reminder"
                  : "Birthday";
            return `<button class="tl-row ${past ? "past" : ""} ${isCur ? "cur" : ""}" data-act="open" data-id="${i.id}" data-date="${k}" style="--c:${col(i)}"><span class="tl-t num">${i.allDay ? "All day" : fmtT(i.start)}</span><span class="tl-dot"></span><span class="tl-body"><b>${esc(i.title)}</b><small>${sub}</small></span></button>`;
          })
          .join("")
      : emptyBox("cal", "Nothing scheduled today.")
  }</section>`;

  let col2 = `<div class="sh ${stg(6)}"><h3 class="disp">Due today</h3><button data-act="tab" data-tab="tasks">All tasks</button></div>`;
  col2 += `<section class="card list ${stg(7)}">${dueTasks.length ? dueTasks.map((t) => taskRow(t, false)).join("") : emptyBox("tasks", "No tasks due. Nice.")}</section>`;
  const lg = S.logs
    .map((l) => ({ l, st: logStats(l) }))
    .sort((a, b) => b.st.ratio - a.st.ratio)
    .slice(0, 5);
  col2 += `<div class="sh ${stg(8)}"><h3 class="disp">Days since</h3><button data-act="tab" data-tab="track" data-sub="since">All logs</button></div>`;
  col2 += `<div class="hs ${stg(9)}">${lg.length ? lg.map(({ l, st }) => `<div class="mini card" style="--c:var(--k${l.k})"><button class="hit" data-act="logopen" data-id="${l.id}" aria-label="${esc(l.name)}"></button><div class="mt">${ic(l.icon, 16)}<span>${esc(l.name)}</span></div><div class="mn disp">${st.since}<span style="font-size:14px;font-family:var(--font-body);font-weight:700;color:var(--muted);text-transform:none;letter-spacing:0"> d</span></div><div class="mb"><i style="width:${clamp(st.ratio * 100, 4, 100)}%;${st.ratio >= 1 ? "background:var(--hi)" : ""}"></i></div><small>${st.ratio >= 1 ? (st.since === l.target ? "Due today" : `${st.since - l.target}d overdue`) : `due in ${l.target - st.since}d`}</small><button class="mp" data-act="lognow" data-id="${l.id}" aria-label="Log now">${ic("plus", 16)}</button></div>`).join("") : emptyBox("track", "No logs yet.")}</div>`;
  const cd = S.cds
    .filter((c) => c.date >= k)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 4);
  if (cd.length)
    col2 += `<div class="sh ${stg(10)}"><h3 class="disp">Counting down</h3><button data-act="tab" data-tab="track" data-sub="until">All</button></div><div class="hs ${stg(11)}">${cd.map((c) => `<button class="cdm card press" data-act="cdopen" data-id="${c.id}"><span class="e">${c.emoji}</span><b class="disp">${diffD(k, c.date)}</b><small>days to ${esc(c.title)}</small></button>`).join("")}</div>`;

  const r = [...(S.pages || [])].sort(byUpd).slice(0, 4);
  if (r.length)
    col2 += `<div class="sh ${stg(12)}"><h3 class="disp">Jump back in</h3><button data-act="tab" data-tab="pages">All pages</button></div><div class="hs ${stg(13)}">${r.map(pinCard).join("")}</div>`;

  return `<div class="desk-home-grid"><div class="desk-home-col1">${col1}</div><div class="desk-home-col2">${col2}</div></div>`;
}
