import {
  pd,
  diffD,
  addKey,
  MIN,
  HM,
  now,
  todayKey,
  nowMin,
  pad,
  clamp,
  ymd,
  MONTHS,
  DAYS,
  DS,
  MS,
  $,
  $$,
} from "../utils/helpers.js";
import { ic } from "../utils/icons.js";
import { S } from "../state/state.js";

export function occursOn(it, key) {
  if (it.date === key) return true;
  const r = it.repeat;
  if (!r || key < it.date) return false;
  const d = pd(key),
    s = pd(it.date),
    n = diffD(it.date, key);
  if (r.unit === "day") return n % r.every === 0;
  if (r.unit === "week") {
    if (r.days)
      return r.days.includes(d.getDay()) && Math.floor(n / 7) % r.every === 0;
    return n % (7 * r.every) === 0;
  }
  if (r.unit === "month")
    return (
      d.getDate() === s.getDate() &&
      ((d.getFullYear() - s.getFullYear()) * 12 + d.getMonth() - s.getMonth()) %
        r.every ===
        0
    );
  if (r.unit === "year")
    return d.getDate() === s.getDate() && d.getMonth() === s.getMonth();
  return false;
}

export const sortKey = (i) => (i.allDay ? "00:00" : i.start || "99:99");

export function itemsOn(key) {
  return S.items
    .filter((i) => (i.type === "task" ? i.date === key : occursOn(i, key)))
    .sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
}

export const endOf = (e) => e.end || HM(MIN(e.start) + 60);

export function curNext() {
  const k = todayKey(),
    nm = nowMin();
  let cur = null,
    next = null;
  itemsOn(k)
    .filter((i) => i.type === "event" && i.start)
    .forEach((e) => {
      const s = MIN(e.start),
        en = MIN(endOf(e));
      if (s <= nm && nm < en && !cur) cur = e;
      else if (s > nm && !next) next = e;
    });
  return { cur, next };
}

export function freeLeft() {
  const nm = nowMin(),
    end = 23 * 60;
  if (nm >= end) return 0;
  const b = [];
  itemsOn(todayKey())
    .filter((i) => i.type === "event" && i.start)
    .forEach((e) => {
      const s = Math.max(MIN(e.start), nm),
        en = Math.min(MIN(endOf(e)), end);
      if (en > s) b.push([s, en]);
    });
  b.sort((x, y) => x[0] - y[0]);
  let busy = 0,
    cs = null,
    ce = null;
  b.forEach(([s, e]) => {
    if (cs === null) {
      cs = s;
      ce = e;
    } else if (s <= ce) ce = Math.max(ce, e);
    else {
      busy += ce - cs;
      cs = s;
      ce = e;
    }
  });
  if (cs !== null) busy += ce - cs;
  return Math.max(0, end - nm - busy);
}

export function logStats(l) {
  const occ = [...l.occ].sort((a, b) => b.d.localeCompare(a.d));
  l.occ = occ;
  const t = todayKey(),
    last = occ[0] ? occ[0].d : null,
    since = last ? diffD(last, t) : 0;
  const gaps = [];
  for (let i = occ.length - 1; i > 0; i--)
    gaps.push(diffD(occ[i].d, occ[i - 1].d));
  const avg = gaps.length
    ? Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length)
    : l.target;
  const c = (n) => occ.filter((o) => diffD(o.d, t) <= n).length;
  return {
    last,
    since,
    gaps,
    avg,
    next: last ? addKey(last, l.target) : t,
    ratio: since / l.target,
    c30: c(30),
    c90: c(90),
    all: occ.length,
    spent: occ.reduce((a, o) => a + (o.cost || 0), 0),
  };
}

export function cdParts(c) {
  const ms = pd(c.date) - now();
  const a = Math.max(0, ms),
    d = Math.floor(a / 864e5),
    h = Math.floor((a % 864e5) / 36e5),
    m = Math.floor((a % 36e5) / 6e4),
    s = Math.floor((a % 6e4) / 1e3);
  return { ms, d, h, m, s };
}

export function fmtT(t) {
  if (!t) return "";
  let [h, mm] = t.split(":").map(Number);
  if (S.prefs.hour === "24h") return `${pad(h)}:${pad(mm)}`;
  const ap = h >= 12 ? "pm" : "am";
  h = h % 12 || 12;
  return mm ? `${h}:${pad(mm)} ${ap}` : `${h} ${ap}`;
}

export function fmtLeft(sec) {
  sec = Math.max(0, Math.floor(sec));
  const h = Math.floor(sec / 3600),
    m = Math.floor((sec % 3600) / 60),
    s = sec % 60;
  return h ? `${h}h ${pad(m)}m` : `${pad(m)}:${pad(s)}`;
}

export function dur(min) {
  const h = Math.floor(min / 60),
    m = Math.round(min % 60);
  return h ? (m ? `${h}h ${m}m` : `${h}h`) : `${m}m`;
}

export function dayLabel(k, short) {
  const t = todayKey(),
    d = diffD(t, k);
  if (d === 0) return "Today";
  if (d === 1) return "Tomorrow";
  if (d === -1) return "Yesterday";
  const x = pd(k);
  return `${DS[x.getDay()]} ${x.getDate()}${short && Math.abs(d) <= 6 ? "" : " " + MS[x.getMonth()]}`;
}

export function longDate(k) {
  const x = pd(k);
  return `${DAYS[x.getDay()]}, ${x.getDate()} ${MONTHS[x.getMonth()]}`;
}

export const col = (it) =>
  it.type === "task"
    ? `var(--${{ high: "hi", med: "md", low: "lo" }[it.pri || "med"]})`
    : `var(--k${it.k || 1})`;

export const stg = (i) => `stg" style="--i:${i}`;

export const CHK =
  '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" pathLength="1"/></svg>';

export const segHtml = (key, opts, cur, cls = "") => {
  const idx = Math.max(
    0,
    opts.findIndex((o) => o[0] === cur),
  );
  return `<div class="seg ${cls}" style="--n:${opts.length};--i:${idx}"><span class="thumb"></span>${opts.map(([v, l, b]) => `<button data-seg="${key}" data-val="${v}" class="${v === cur ? "on" : ""}">${l}${b != null ? ` <i>${b}</i>` : ""}</button>`).join("")}</div>`;
};

export const RC = 276.46;

export function ringHtml(frac, main, small) {
  const off = (RC * (1 - clamp(frac, 0, 1))).toFixed(1);
  return `<div class="ring"><svg viewBox="0 0 100 100"><circle class="bg" cx="50" cy="50" r="44"/><circle class="fg" id="hring" cx="50" cy="50" r="44" stroke-dashoffset="${off}"/></svg><div class="rt"><b class="disp" id="htime">${main}</b><small id="hrel">${small}</small></div></div>`;
}

export function nextOcc(it) {
  const t = todayKey();
  if (it.type === "task") return it.date;
  if (!it.repeat) return it.date >= t ? it.date : null;
  let d = pd(it.date < t ? t : it.date);
  for (let i = 0; i < 366; i++) {
    const k = ymd(d);
    if (occursOn(it, k)) return k;
    d.setDate(d.getDate() + 1);
  }
  return null;
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

export function dotsFor(k) {
  const its = itemsOn(k).filter((i) => i.type !== "reminder"),
    cs = [];
  its.forEach((i) => {
    const c = col(i);
    if (!cs.includes(c)) cs.push(c);
  });
  return (
    cs
      .slice(0, 3)
      .map((c) => `<i style="--c:${c}"></i>`)
      .join("") + (its.length > 3 ? `<em>+${its.length - 3}</em>` : "")
  );
}

export const emptyBox = (icon, msg, btn) =>
  `<div class="empty">${ic(icon, 28)}<div>${msg}</div>${btn || ""}</div>`;

export function rollIn(id) {
  if (!id) return;
  const el = document.querySelector(`[data-num="${id}"]`);
  if (!el) return;
  const t = +el.textContent;
  if (!Number.isFinite(t)) return;
  const start = Math.max(0, t - 6),
    durMs = 450;
  const t0 = performance.now();
  function f(nowMs) {
    const p = Math.min(1, (nowMs - t0) / durMs);
    el.textContent = Math.round(start + (t - start) * p);
    if (p < 1) requestAnimationFrame(f);
  }
  requestAnimationFrame(f);
}
