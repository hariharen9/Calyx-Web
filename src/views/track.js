import { S } from "../state/state.js";
import { todayKey, diffD, clamp, pad, esc } from "../utils/helpers.js";
import { logStats, cdParts, longDate, emptyBox, stg, segHtml } from "../queries/queries.js";
import { ic } from "../utils/icons.js";

/* ================= TRACK ================= */
export function vTrack() {
  let h = `<header class="top ${stg(0)}"><div><div class="sub">Time since and time until</div><h1 class="disp h1">Track</h1></div><button class="addbtn press" data-act="${S.trackTab === "since" ? "newlog" : "newcd"}">${ic("plus", 16)}${S.trackTab === "since" ? "New log" : "New countdown"}</button></header>`;
  h += `<div class="${stg(1)}">${segHtml(
    "trackTab",
    [
      ["since", "Days since", S.logs.length],
      ["until", "Days until", S.cds.length],
    ],
    S.trackTab,
  )}</div>`;
  return h + (S.trackTab === "since" ? vSince() : vUntil());
}

export function vSince() {
  if (!S.logs.length)
    return `<section class="card">${emptyBox("track", "Track anything you repeat, like haircuts or oil changes. Tap New log to start.")}</section>`;
  return `<div class="lgrid">${S.logs
    .map((l, i) => {
      const st = logStats(l),
        due = st.ratio >= 1,
        C = 125.66;
      return `<div class="lcard card ${due ? "due" : ""} ${stg(i + 2)}"><button class="hit" data-act="logopen" data-id="${l.id}" aria-label="${esc(l.name)} details"></button><div class="top2" style="--c:var(--k${l.k})">${ic(l.icon, 18)}<span>${esc(l.name)}</span></div><div class="nv disp" data-num="${l.id}">${st.since}</div><div class="nl">days since</div><div class="ft"><span>avg ${st.avg}d</span><button class="pr" data-act="lognow" data-id="${l.id}" style="--c:var(--k${l.k})" aria-label="Log ${esc(l.name)} now"><svg viewBox="0 0 44 44"><circle class="a" cx="22" cy="22" r="20"/><circle class="b" cx="22" cy="22" r="20" stroke-dasharray="${C}" stroke-dashoffset="${(C * (1 - clamp(st.ratio, 0, 1))).toFixed(1)}"/></svg>${ic("plus", 16)}</button></div></div>`;
    })
    .join("")}</div>`;
}

export function vUntil() {
  if (!S.cds.length)
    return `<section class="card">${emptyBox("hourglass", "Count down to anything that matters. Tap New countdown.")}</section>`;
  const t = todayKey(),
    list = [...S.cds].sort((a, b) => a.date.localeCompare(b.date)),
    firstFuture = list.find((c) => c.date >= t);
  return list
    .map((c, i) => {
      const total = Math.max(1, diffD(c.created, c.date)),
        gone = clamp(diffD(c.created, t) / total, 0, 1),
        days = diffD(t, c.date),
        big = c === firstFuture,
        p = cdParts(c);
      const value = big
        ? `<span data-cd="${c.id}">${p.d}d ${pad(p.h)}:${pad(p.m)}:${pad(p.s)}</span>`
        : days < 0
          ? `${-days}<em>days ago</em>`
          : `${days}<em>${days === 1 ? "day" : "days"}</em>`;
      return `<button class="cdc card press ${big ? "big" : ""} ${stg(i + 2)}" data-act="cdopen" data-id="${c.id}"><div class="em">${c.emoji}</div><div><h4 class="disp">${esc(c.title)}</h4><small>${longDate(c.date)}</small><div class="dv disp">${value}</div></div><div class="pb"><i style="width:${(gone * 100).toFixed(1)}%"></i></div></button>`;
    })
    .join("");
}
