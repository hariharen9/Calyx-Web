("use strict");
import {
  todayKey,
  pd,
  addD,
  addKey,
  diffD,
  MIN,
  HM,
  pad,
  nowMin,
  MS,
  uid,
} from "../utils/helpers.js";
import { longDate, fmtT } from "../queries/queries.js";
import { REP, ev, tk } from "../data/seed.js";
import { S } from "../state/state.js";
import { TYPELABEL } from "../utils/icons.js";
import { dayLabel } from "../queries/queries.js";

export const WDR =
  "(monday|mon|tuesday|tues|tue|wednesday|wed|thursday|thurs|thu|friday|fri|saturday|sat|sunday|sun)";

export const MR =
  "(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sept|sep|october|oct|november|nov|december|dec)";

export const wdIdx = (s) =>
  ["sun", "mon", "tue", "wed", "thu", "fri", "sat"].indexOf(
    s.slice(0, 3).toLowerCase(),
  );

export const moIdx = (s) =>
  MS.findIndex((m) => m.toLowerCase() === s.slice(0, 3).toLowerCase());

export function nextWd(idx, from, inclusive) {
  let d = pd(from);
  if (!inclusive) d = addD(d, 1);
  while (d.getDay() !== idx) d = addD(d, 1);
  return todayKey ? addKey(from, diffD(from, ymdDate(d))) : ymdDate(d);
}

function ymdDate(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function to24(h, m, ap) {
  h = +h;
  m = +(m || 0);
  if (ap) {
    ap = ap.toLowerCase();
    if (ap === "pm" && h < 12) h += 12;
    if (ap === "am" && h === 12) h = 0;
  }
  return HM(h * 60 + m);
}

export function addMonths(k, n) {
  const d = pd(k);
  d.setMonth(d.getMonth() + n);
  return ymdDate(d);
}

export function mdKey(mo, day) {
  const t = todayKey(),
    y = pd(t).getFullYear();
  let k = `${y}-${pad(mo + 1)}-${pad(day)}`;
  if (k < t) k = `${y + 1}-${pad(mo + 1)}-${pad(day)}`;
  return k;
}

export function parseNL(raw) {
  let t = " " + raw.trim() + " ";
  const o = {
      type: null,
      title: "",
      date: null,
      start: null,
      end: null,
      repeat: null,
      pri: null,
      repWd: null,
    },
    today = todayKey();
  const eat = (re, fn) => {
    const m = re.exec(t);
    if (!m) return false;
    t = t.slice(0, m.index) + " " + t.slice(m.index + m[0].length);
    fn(m);
    return true;
  };
  eat(/^\s*(task|todo|to-do)\b[:\s]*/i, () => (o.type = "task")) ||
    eat(
      /^\s*(remind me to|remind me|reminder|remind)\b[:\s]*/i,
      () => (o.type = "reminder"),
    ) ||
    eat(
      /^\s*(countdown to|countdown|count down to)\b[:\s]*/i,
      () => (o.type = "countdown"),
    ) ||
    eat(/^\s*(bday|birthday)\b[:\s]*/i, () => (o.type = "birthday")) ||
    eat(/^\s*(event|meeting)\b[:\s]*/i, () => (o.type = "event"));
  eat(
    /\s!(high|medium|med|low|h|m|l)\b/i,
    (m) => (o.pri = { h: "high", m: "med", l: "low" }[m[1][0].toLowerCase()]),
  );
  eat(/\bevery\s+weekdays?\b/i, () => (o.repeat = REP.weekdays)) ||
    eat(
      /\bevery\s+(\d+)\s*(day|week|month|year)s?\b/i,
      (m) => (o.repeat = { unit: m[2].toLowerCase(), every: +m[1] }),
    ) ||
    eat(new RegExp("\\bevery\\s+" + WDR + "\\b", "i"), (m) => {
      o.repWd = wdIdx(m[1]);
      o.repeat = { unit: "week", every: 1, days: [o.repWd] };
    }) ||
    eat(
      /\bevery\s+(day|week|month|year)\b/i,
      (m) => (o.repeat = { unit: m[1].toLowerCase(), every: 1 }),
    ) ||
    eat(
      /\b(daily|weekly|monthly|yearly|annually)\b/i,
      (m) =>
        (o.repeat = {
          daily: REP.daily,
          weekly: REP.weekly,
          monthly: REP.monthly,
          yearly: REP.yearly,
          annually: REP.yearly,
        }[m[1].toLowerCase()]),
    );
  eat(/\bin\s+(\d+)\s*(m|min|mins|minutes?|h|hr|hrs|hours?)\b/i, (m) => {
    const n = +m[1],
      mins = /^h/i.test(m[2]) ? n * 60 : n;
    let tot = Math.ceil(nowMin()) + mins,
      dd = today;
    if (tot >= 1440) {
      dd = addKey(today, Math.floor(tot / 1440));
      tot %= 1440;
    }
    o.date = dd;
    o.start = HM(tot);
  });
  eat(/\bin\s+(\d+)\s*(d|days?|w|weeks?)\b/i, (m) => {
    o.date = addKey(today, +m[1] * (/^w/i.test(m[2]) ? 7 : 1));
  });
  eat(/\bnext\s+(week|month)\b/i, (m) => {
    o.date = /week/i.test(m[1]) ? addKey(today, 7) : addMonths(today, 1);
  });
  eat(/\b(\d{4})-(\d{2})-(\d{2})\b/, (m) => (o.date = m[0]));
  eat(
    /\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*(?:-|–|to)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i,
    (m) => {
      const a2 = m[6],
        a1 = m[3] || a2;
      o.start = to24(m[1], m[2], a1);
      o.end = to24(m[4], m[5], a2);
    },
  );
  if (!o.start)
    eat(
      /\b(?:at\s+)?(\d{1,2}):(\d{2})\s*(am|pm)?(?!\w)/i,
      (m) => (o.start = to24(m[1], m[2], m[3])),
    ) ||
      eat(
        /\b(?:at\s+)?(\d{1,2})\s*(am|pm)\b/i,
        (m) => (o.start = to24(m[1], 0, m[2])),
      ) ||
      eat(/\bat\s+(\d{1,2})\b(?!\s*(?:st|nd|rd|th))/i, (m) => {
        let h = +m[1];
        if (h >= 1 && h <= 6) h += 12;
        o.start = HM(h * 60);
      }) ||
      eat(/\bnoon\b/i, () => (o.start = "12:00")) ||
      eat(/\bmidnight\b/i, () => (o.start = "00:00"));
  eat(/\b(today|tomorrow|tmrw|tmr|tonight)\b/i, (m) => {
    const w = m[1].toLowerCase();
    o.date = w === "today" || w === "tonight" ? today : addKey(today, 1);
    if (w === "tonight" && !o.start) o.start = "20:00";
  });
  if (!o.date)
    eat(
      new RegExp("\\b(?:(?:on|next|this)\\s+)?" + WDR + "\\b", "i"),
      (m) => (o.date = nextWd(wdIdx(m[1]), today)),
    );
  if (!o.date)
    eat(
      new RegExp("\\b" + MR + "\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b", "i"),
      (m) => (o.date = mdKey(moIdx(m[1]), +m[2])),
    ) ||
      eat(
        new RegExp(
          "\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?" + MR + "\\b",
          "i",
        ),
        (m) => (o.date = mdKey(moIdx(m[2]), +m[1])),
      );
  if (o.repWd !== null && !o.date) o.date = nextWd(o.repWd, today, true);
  let ti = t.replace(/\s+/g, " ").trim();
  for (let i = 0; i < 2; i++)
    ti = ti
      .replace(/^(?:on|at|by|for|from|in|to|the|this|next)\s+/i, "")
      .replace(/\s+(?:on|at|by|for|from|to|in|this|next|every|the)$/i, "")
      .trim();
  o.title = ti ? ti[0].toUpperCase() + ti.slice(1) : "";
  const hasT = !!o.start;
  if (!o.type) o.type = hasT ? "event" : "task";
  if (o.type === "event") {
    o.date = o.date || today;
    if (!o.start) o.start = "09:00";
    if (!o.end) o.end = HM(MIN(o.start) + 60);
  }
  if (o.type === "reminder") {
    o.date = o.date || today;
    if (!o.start)
      o.start =
        o.date === today ? HM(Math.ceil((nowMin() + 30) / 30) * 30) : "09:00";
  }
  if (o.type === "birthday") {
    o.date = o.date || today;
    o.repeat = REP.yearly;
  }
  if (o.type === "task") {
    o.start = null;
    o.end = null;
  }
  o.valid = !!o.title && (o.type !== "countdown" || !!o.date);
  o.pure = !o.title && !!o.date && !hasT && !o.repeat;
  return o;
}

export const TZ = {
  ist: 330,
  utc: 0,
  gmt: 0,
  est: -300,
  edt: -240,
  pst: -480,
  pdt: -420,
  cet: 60,
  cest: 120,
  jst: 540,
  sgt: 480,
  aest: 600,
  aedt: 660,
  gst: 240,
  bst: 60,
};

export const CITY = {
  "new york": -240,
  ny: -240,
  nyc: -240,
  london: 60,
  tokyo: 540,
  sydney: 660,
  dubai: 240,
  sf: -420,
  "san francisco": -420,
  la: -420,
  "los angeles": -420,
  singapore: 480,
  berlin: 120,
  paris: 120,
  india: 330,
  delhi: 330,
  mumbai: 330,
  bengaluru: 330,
  bangalore: 330,
  utc: 0,
};

export const titleCase = (s) => s.replace(/\b\w/g, (c) => c.toUpperCase());

export function tryMath(raw) {
  const q = raw.trim(),
    t = todayKey();
  let m;
  if (
    (m = /^(?:how many\s+)?days?\s+(until|till|to|since|from)\s+(.+)$/i.exec(q))
  ) {
    const p = parseNL(m[2]);
    if (p.date) {
      const n = diffD(t, p.date),
        since = /since|from/i.test(m[1]);
      const v = since ? -n : n;
      return {
        big: `${Math.abs(v)} ${Math.abs(v) === 1 ? "day" : "days"}`,
        small: since
          ? v >= 0
            ? `since ${longDate(p.date)}`
            : `until ${longDate(p.date)}`
          : v >= 0
            ? `until ${longDate(p.date)}`
            : `since ${longDate(p.date)}`,
      };
    }
  }
  if (
    (m = /^(\d+)\s*(day|week|month|year)s?\s+(from|after)\s+(.+)$/i.exec(q))
  ) {
    const bp = /^(today|now)$/i.test(m[4].trim()) ? { date: t } : parseNL(m[4]);
    if (bp.date) {
      const n = +m[1],
        u = m[2].toLowerCase();
      const r =
        u === "day"
          ? addKey(bp.date, n)
          : u === "week"
            ? addKey(bp.date, n * 7)
            : addMonths(bp.date, u === "month" ? n : n * 12);
      return {
        big: longDate(r),
        small: `${n} ${u}${n > 1 ? "s" : ""} from ${bp.date === t ? "today" : longDate(bp.date)}`,
        date: r,
      };
    }
  }
  if (
    (m =
      /^(\d+)\s*(day|week|month|year)s?\s+(ago|before)(?:\s+(?:today|now))?$/i.exec(
        q,
      ))
  ) {
    const n = +m[1],
      u = m[2].toLowerCase();
    const r =
      u === "day"
        ? addKey(t, -n)
        : u === "week"
          ? addKey(t, -n * 7)
          : addMonths(t, -(u === "month" ? n : n * 12));
    return {
      big: longDate(r),
      small: `${n} ${u}${n > 1 ? "s" : ""} ago`,
      date: r,
    };
  }
  if (
    (m =
      /^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*(ist|utc|gmt|est|edt|pst|pdt|cet|cest|jst|sgt|aest|aedt|gst|bst)\s+(?:in|to)\s+([a-z ]+?)\s*$/i.exec(
        q,
      ))
  ) {
    const dst = CITY[m[5].toLowerCase()];
    if (dst !== undefined) {
      const src = TZ[m[4].toLowerCase()],
        tot = MIN(to24(m[1], m[2], m[3])) - src + dst,
        sh = Math.floor(tot / 1440),
        tt = ((tot % 1440) + 1440) % 1440;
      return {
        big: fmtT(HM(tt)),
        small: `${fmtT(to24(m[1], m[2], m[3]))} ${m[4].toUpperCase()} is this time in ${titleCase(m[5])}${sh > 0 ? " (next day)" : sh < 0 ? " (previous day)" : ""}`,
      };
    }
  }
  if ((m = /^(?:time|now)\s+in\s+([a-z ]+?)\s*$/i.exec(q))) {
    const dst = CITY[m[1].toLowerCase()];
    if (dst !== undefined) {
      const tot = Math.floor(nowMin()) - 330 + dst,
        sh = Math.floor(tot / 1440),
        tt = ((tot % 1440) + 1440) % 1440;
      return {
        big: fmtT(HM(tt)),
        small: `Right now in ${titleCase(m[1])}${sh > 0 ? " (tomorrow)" : sh < 0 ? " (yesterday)" : ""}`,
      };
    }
  }
  return null;
}

export function createFromParse(p) {
  const T = p.type;
  if (T === "countdown") {
    const e = {
      id: uid(),
      title: p.title,
      date: p.date,
      emoji: "🎯",
      created: todayKey(),
    };
    S.cds.push(e);
    S.trackTab = "until";
    return {
      msg: `Counting down to ${p.title}`,
      undo: () => {
        S.cds = S.cds.filter((x) => x !== e);
      },
    };
  }
  let e;
  if (T === "event")
    e = ev(p.title, p.date, p.start, p.end, (S.items.length % 5) + 1, {
      repeat: p.repeat,
    });
  else if (T === "reminder")
    e = {
      id: uid(),
      type: "reminder",
      title: p.title,
      date: p.date,
      start: p.start,
      k: (S.items.length % 5) + 1,
      repeat: p.repeat,
    };
  else if (T === "birthday")
    e = {
      id: uid(),
      type: "birthday",
      title: p.title,
      date: p.date,
      allDay: true,
      k: 4,
      repeat: REP.yearly,
    };
  else e = tk(p.title, p.date, p.pri || "med");

  S.items.push(e);
  if (p.date && T === "event") S.sel = p.date;
  return {
    msg: `${TYPELABEL[T]} added${p.date ? " · " + dayLabel(p.date, true) : ""}`,
    undo: () => {
      S.items = S.items.filter((x) => x !== e);
    },
  };
}
