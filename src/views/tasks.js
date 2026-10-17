import { S } from "../state/state.js";
import { todayKey, diffD, esc } from "../utils/helpers.js";
import { dayLabel, emptyBox, CHK, stg, segHtml } from "../queries/queries.js";
import { ic } from "../utils/icons.js";

/* ================= TASKS ================= */
export function taskRow(t, leave) {
  const k = todayKey(),
    subs = t.subs || [],
    sd = subs.filter((s) => s.d).length,
    over = !t.done && t.date && t.date < k;
  const due = t.date
    ? `<span class="meta ${over ? "over" : ""}">${ic("clock", 13)}${over ? "Overdue · " : ""}${dayLabel(t.date, true)}</span>`
    : "";
  const p = t.pri || "med",
    pri = `<span class="pri" style="--c:var(--${{ high: "hi", med: "md", low: "lo" }[p]})">${{ high: "High", med: "Medium", low: "Low" }[p]}</span>`;
  const sub = subs.length
    ? `<span class="meta">${ic("tasks", 13)}${sd}/${subs.length}</span>`
    : "";
  return `<div class="trow ${t.done ? "done" : ""}" id="t-${t.id}" ${leave ? 'data-leave="1"' : ""}><button class="chk" data-act="tcheck" data-id="${t.id}" aria-label="Complete task">${CHK}</button><button class="tbody" data-act="open" data-id="${t.id}"><span><span class="ttl">${esc(t.title)}</span></span><span class="metas">${due}${pri}${sub}</span></button></div>`;
}

export function taskGroups() {
  const k = todayKey(),
    T = S.items.filter((i) => i.type === "task"),
    open = T.filter((i) => !i.done);
  const pr = { high: 0, med: 1, low: 2 };
  const byPri = (a, b) =>
    (a.date || "9").localeCompare(b.date || "9") ||
    pr[a.pri || "med"] - pr[b.pri || "med"];
  return {
    open,
    today: open.filter((i) => i.date && i.date <= k).sort(byPri),
    upcoming: open.filter((i) => i.date && i.date > k).sort(byPri),
    anytime: open.filter((i) => !i.date).sort(byPri),
    done: T.filter((i) => i.done).sort((a, b) =>
      (b.date || "").localeCompare(a.date || ""),
    ),
  };
}

export function vTasks() {
  const g = taskGroups(),
    k = todayKey();
  let body = "";
  if (S.taskTab === "today") {
    const od = g.today.filter((t) => t.date < k),
      td = g.today.filter((t) => t.date === k);
    if (od.length)
      body += `<div class="sbh">Overdue</div><section class="card list">${od.map((t) => taskRow(t, true)).join("")}</section>`;
    if (td.length)
      body += `<div class="sbh">${od.length ? "Due today" : "Today"}</div><section class="card list">${td.map((t) => taskRow(t, true)).join("")}</section>`;
    if (!body)
      body = `<section class="card">${emptyBox("tasks", "You are all caught up for today.")}</section>`;
  } else if (S.taskTab === "upcoming") {
    const days = [...new Set(g.upcoming.map((t) => t.date))];
    body =
      days
        .map(
          (d) =>
            `<div class="sbh">${dayLabel(d)}${diffD(k, d) > 1 ? "" : ""}</div><section class="card list">${g.upcoming
              .filter((t) => t.date === d)
              .map((t) => taskRow(t, true))
              .join("")}</section>`,
        )
        .join("") ||
      `<section class="card">${emptyBox("tasks", "Nothing scheduled ahead.")}</section>`;
  } else if (S.taskTab === "anytime") {
    body = g.anytime.length
      ? `<section class="card list">${g.anytime.map((t) => taskRow(t, true)).join("")}</section>`
      : `<section class="card">${emptyBox("tasks", "No open-ended tasks. Add one below.")}</section>`;
  } else {
    body = g.done.length
      ? `<section class="card list">${g.done.map((t) => taskRow(t, true)).join("")}</section>`
      : `<section class="card">${emptyBox("check", "Completed tasks will land here.")}</section>`;
  }
  const tabsData = [
    ["today", "Today", g.today.length],
    ["upcoming", "Upcoming", g.upcoming.length],
    ["anytime", "Anytime", g.anytime.length],
    ["done", "Done", g.done.length],
  ];

  return `<div class="tasks-page">
    <div class="mobile-tasks-head">
      <div class="thead ${stg(0)}">
        <div class="big disp" data-count="${g.open.length}">${g.open.length}</div>
        <p>open tasks<small>${g.today.length} due today or overdue</small></p>
      </div>
      <div class="${stg(1)}" style="margin-bottom: 14px;">
        ${segHtml("taskTab", tabsData, S.taskTab)}
      </div>
    </div>

    <div class="desk-tasks-bar card ${stg(0)}">
      <div class="desk-tasks-stats">
        <div class="dt-stat">
          <span class="dt-stat-val disp">${g.open.length}</span>
          <span class="dt-stat-lbl">Open</span>
        </div>
        <div class="dt-stat-sep"></div>
        <div class="dt-stat">
          <span class="dt-stat-val disp" style="color: var(--hi);">${g.today.length}</span>
          <span class="dt-stat-lbl">Due Today</span>
        </div>
        <div class="dt-stat-sep"></div>
        <div class="dt-stat">
          <span class="dt-stat-val disp" style="color: var(--k2);">${g.done.length}</span>
          <span class="dt-stat-lbl">Done</span>
        </div>
      </div>
      <div class="desk-tasks-quick">
        <input id="qain-desk" class="inp" placeholder="Add a task, e.g. 'Renew passport fri !high'..." autocomplete="off">
        <button class="pillbtn press" data-act="qaadd-desk">${ic("plus", 16)}<span>Add</span></button>
      </div>
    </div>

    <div class="tasks-content ${stg(2)}">
      ${body}
    </div>
  </div>`;
}
