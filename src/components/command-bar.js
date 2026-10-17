import { S, buzz } from "../state/state.js";
import { clamp, esc, $, $$, todayKey, diffD, pd } from "../utils/helpers.js";
import { toast } from "../utils/toast.js";
import { ic, TYPELABEL, TYPEICON } from "../utils/icons.js";
import { dayLabel, logStats, fmtT, nextOcc, longDate } from "../queries/queries.js";
import { repLabel, tk } from "../data/seed.js";
import { tryMath, parseNL, createFromParse } from "../nlp/nlp.js";
import { snip, newPage, openPageEditor } from "../views/pages.js";
import { openComposer } from "./composer.js";
import { settingsHtml } from "../views/settings.js";

export const CMD = { acts: [], sel: 0, key: "", prev: new Set(), math: null };

export const EXAMPLES = [
  "dentist next tue 4pm",
  "pay rent fri !high",
  "standup every weekday 9:30",
  "remind me in 20m to stretch",
  "days until dec 25",
  "9am ist in new york",
  "log haircut",
];

let _openPage = null;
let _openSheet = null;
let _openItem = null;
let _openLog = null;
let _cdSheet = null;
let _logNow = null;
let _refreshAll = null;
let _go = null;
let _UI = null;

export function setCmdCallbacks(cbs) {
  if (cbs.openPage) _openPage = cbs.openPage;
  if (cbs.openSheet) _openSheet = cbs.openSheet;
  if (cbs.openItem) _openItem = cbs.openItem;
  if (cbs.openLog) _openLog = cbs.openLog;
  if (cbs.cdSheet) _cdSheet = cbs.cdSheet;
  if (cbs.logNow) _logNow = cbs.logNow;
  if (cbs.refreshAll) _refreshAll = cbs.refreshAll;
  if (cbs.go) _go = cbs.go;
  if (cbs.UI) _UI = cbs.UI;
}

export function chipsFor(p) {
  const c = [{ t: 1, l: TYPELABEL[p.type] || "Countdown" }];
  if (p.date) c.push({ l: dayLabel(p.date) });
  else if (p.type === "task") c.push({ l: "Anytime" });
  if (p.start && p.type !== "task")
    c.push({
      l:
        fmtT(p.start) +
        (p.end && p.type === "event" ? " – " + fmtT(p.end) : ""),
    });
  if (p.repeat) c.push({ l: repLabel(p.repeat) || "Repeats" });
  if (p.pri)
    c.push({
      l: { high: "High", med: "Medium", low: "Low" }[p.pri] + " priority",
    });
  return c;
}

export function cmdActions(q) {
  const A = [],
    raw = q.trim(),
    low = raw.toLowerCase();
  CMD.math = null;
  if (!raw) {
    A.push(
      {
        key: "q1",
        sec: "Create",
        icon: "cal",
        title: "New event",
        sub: "Date, time and repeat",
        run: () => {
          closeCmd();
          openComposer({ type: "event" });
        },
      },
      {
        key: "q2",
        icon: "tasks",
        title: "New task",
        sub: "With priority and steps",
        run: () => {
          closeCmd();
          openComposer({ type: "task" });
        },
      },
      {
        key: "q3",
        icon: "track",
        title: "New log",
        sub: "Track days since anything",
        run: () => {
          closeCmd();
          openComposer({ type: "log" });
        },
      },
      {
        key: "q4",
        icon: "hourglass",
        title: "New countdown",
        sub: "Days until something big",
        run: () => {
          closeCmd();
          openComposer({ type: "countdown" });
        },
      },
      {
        key: "qp",
        icon: "note",
        title: "New page",
        sub: "Notes, docs and checklists",
        run: () => {
          closeCmd();
          newPage();
        },
      },
      {
        key: "q5",
        sec: "Go to",
        icon: "settings",
        title: "Settings and themes",
        sub: "Make it look like a different app",
        run: () => {
          closeCmd();
          if (_openPage) _openPage(settingsHtml);
        },
      },
    );
    return A;
  }
  CMD.math = tryMath(raw);
  const lm = /^log\s*(.*)$/i.exec(raw);
  if (lm) {
    S.logs
      .filter(
        (l) => !lm[1] || l.name.toLowerCase().includes(lm[1].toLowerCase()),
      )
      .slice(0, 4)
      .forEach((l) => {
        const st = logStats(l);
        A.push({
          key: "log" + l.id,
          sec: "Log it",
          icon: l.icon,
          title: `Log ${l.name.toLowerCase()} now`,
          sub: `Last ${st.since} ${st.since === 1 ? "day" : "days"} ago`,
          run: () => {
            closeCmd();
            if (_logNow) _logNow(l.id);
            if (_refreshAll) _refreshAll();
          },
        });
      });
  }
  const p = parseNL(raw);
  if (!lm && !CMD.math) {
    if (p.pure)
      A.push({
        key: "jump",
        sec: "Jump",
        icon: "cal",
        title: `Go to ${longDate(p.date)}`,
        sub: "Open in calendar",
        run: () => {
          closeCmd();
          S.sel = p.date;
          const d = pd(p.date);
          S.cal = { y: d.getFullYear(), m: d.getMonth() };
          S.calView = "month";
          if (_go) _go("cal", true);
        },
      });
    else if (p.valid)
      A.push({
        key: "create:" + JSON.stringify([p.type, p.title]),
        sec: "Create",
        icon: TYPEICON[p.type] || "hourglass",
        title: p.title,
        chips: chipsFor(p),
        run: () => {
          const r = createFromParse(p);
          closeCmd();
          buzz(16);
          toast(r.msg, r.undo);
          if (p.type === "task" && S.tab !== "tasks") {
          }
          if (_refreshAll) _refreshAll();
        },
      });
    else
      A.push({
        key: "hint",
        sec: "Create",
        icon: "spark",
        title: "Add a title",
        sub: "For example: “Dentist fri 4pm”",
        run: () => {},
      });
  }
  const found = [];
  S.items
    .filter((i) => i.title.toLowerCase().includes(low))
    .slice(0, 5)
    .forEach((i) => {
      const d = nextOcc(i);
      found.push({
        key: "it" + i.id,
        icon: TYPEICON[i.type],
        title: i.title,
        sub: `${TYPELABEL[i.type]} · ${d ? dayLabel(d) : "Anytime"}${i.start ? " · " + fmtT(i.start) : ""}`,
        run: () => {
          closeCmd();
          if (_openItem) _openItem(i.id, d);
        },
      });
    });
  if (!lm)
    S.logs
      .filter((l) => l.name.toLowerCase().includes(low))
      .forEach((l) =>
        found.push({
          key: "lg" + l.id,
          icon: l.icon,
          title: l.name,
          sub: "Days since log",
          run: () => {
            closeCmd();
            if (_openLog) _openLog(l.id);
          },
        }),
      );
  S.cds
    .filter((c) => c.title.toLowerCase().includes(low))
    .forEach((c) =>
      found.push({
        key: "cd" + c.id,
        icon: "hourglass",
        title: c.title,
        sub: `Countdown · ${diffD(todayKey(), c.date)} days`,
        run: () => {
          closeCmd();
          if (_openSheet && _cdSheet) _openSheet(() => _cdSheet(c.id));
        },
      }),
    );
  found.slice(0, 6).forEach((f, i) => {
    if (i === 0) f.sec = "Matches";
    A.push(f);
  });

  const pm = /^(page|note|doc)\s+(.+)$/i.exec(raw);
  let out = A;
  if (pm) {
    const ti = pm[2][0].toUpperCase() + pm[2].slice(1);
    out = A.filter(
      (a) => !String(a.key).startsWith("create:") && a.key !== "hint",
    );
    out.unshift({
      key: "pg:" + ti,
      sec: "Create",
      icon: "note",
      title: ti,
      sub: "New page",
      run: () => {
        closeCmd();
        newPage(null, ti);
      },
    });
  }
  S.pages
    .filter(
      (p) =>
        (p.title || "").toLowerCase().includes(low) ||
        p.blocks.some((b) => b.x.toLowerCase().includes(low)),
    )
    .slice(0, 4)
    .forEach((p, i) =>
      out.push({
        key: "pgm" + p.id,
        sec: i === 0 ? "Pages" : undefined,
        icon: "note",
        title: p.icon + " " + (p.title || "Untitled"),
        sub: snip(p) || "Page",
        run: () => {
          closeCmd();
          openPageEditor(p.id);
        },
      }),
    );
  return out;
}

export function paintCmd() {
  const inp = $("#cin");
  if (!inp) return;
  const q = inp.value;
  CMD.acts = cmdActions(q);
  CMD.sel = clamp(CMD.sel, 0, Math.max(0, CMD.acts.length - 1));
  const key = CMD.acts.map((a) => a.key).join("|") + (CMD.math ? "m" : "");
  let h = "",
    last = null;
  const chipsNow = new Set();
  if (CMD.math)
    h += `<div class="math"><b class="disp">${esc(CMD.math.big)}</b><small>${esc(CMD.math.small)}</small></div>`;
  CMD.acts.forEach((a, i) => {
    if (a.sec && a.sec !== last) {
      h += `<div class="csec">${a.sec}</div>`;
      last = a.sec;
    }
    const ch = a.chips
      ? `<div class="cchips">${a.chips
          .map((c) => {
            chipsNow.add(c.l);
            return `<span class="cch ${c.t ? "t" : ""} ${CMD.prev.has(c.l) ? "" : "new"}">${esc(c.l)}</span>`;
          })
          .join("")}</div>`
      : "";
    h += `<button class="crow ${i === CMD.sel ? "sel" : ""}" data-act="cmdrun" data-i="${i}" style="--i:${i}"><span class="ci2">${ic(a.icon, 18)}</span><span class="ct"><b>${esc(a.title)}</b>${a.sub ? `<small>${esc(a.sub)}</small>` : ""}${ch}</span>${i === CMD.sel && a.key !== "hint" ? "<kbd>↵</kbd>" : ""}</button>`;
  });
  if (!q.trim())
    h += `<div class="csec">Try typing</div><div class="ex">${EXAMPLES.map((x) => `<button data-act="cmdex" data-q="${esc(x)}">${esc(x)}</button>`).join("")}</div>`;
  else if (!CMD.acts.length && !CMD.math)
    h += `<div class="empty">No matches. Keep typing a date or time to create something.</div>`;
  const res = $("#cres");
  if (res) {
    res.classList.toggle("still", key === CMD.key);
    res.innerHTML = h;
  }
  CMD.key = key;
  CMD.prev = chipsNow;
}

export function openCmd(pre) {
  if (_UI && _UI.cmd) return;
  buzz(10);
  const el = document.createElement("div");
  el.className = "layer cmdl";
  el.innerHTML = `<div class="bd" data-act="closecmd"></div><div class="cmd" role="dialog" aria-label="Command bar"><div class="ci">${ic("spark", 22)}<input id="cin" placeholder="Type an event, task, date or question" autocomplete="off" enterkeyhint="go" value="${esc(pre || "")}"><button class="cx press" data-act="closecmd" aria-label="Close">${ic("x", 16)}</button></div><div class="cres" id="cres"></div><div class="cfoot"><span><kbd>↵</kbd>select</span><span><kbd>↑↓</kbd>move</span><span><kbd>esc</kbd>close</span></div></div>`;
  $("#overlays").appendChild(el);
  if (_UI) _UI.cmd = el;
  CMD.sel = 0;
  CMD.key = "";
  CMD.prev = new Set();
  paintCmd();
  requestAnimationFrame(() =>
    requestAnimationFrame(() => el.classList.add("on", "open")),
  );
  setTimeout(() => {
    const i = $("#cin");
    i && i.focus({ preventScroll: true });
  }, 380);
}

export function closeCmd() {
  const el = _UI ? _UI.cmd : null;
  if (!el) return;
  if (_UI) _UI.cmd = null;
  el.classList.remove("open");
  setTimeout(() => el.remove(), 450);
}

export function quickAdd() {
  const i = $("#qain");
  if (!i) return;
  const raw = i.value.trim();
  if (!raw) return;
  const p = parseNL("task " + raw);
  if (!p.title) {
    return;
  }
  const e = tk(p.title, p.date, p.pri || "med");
  S.items.push(e);
  i.value = "";
  buzz(14);
  if (p.date && p.date <= todayKey()) S.taskTab = "today";
  else if (p.date) S.taskTab = "upcoming";
  else S.taskTab = "anytime";
  toast(
    `Added to ${S.taskTab === "today" ? "Today" : S.taskTab === "upcoming" ? "Upcoming" : "Anytime"}`,
    () => {
      S.items = S.items.filter((x) => x !== e);
    },
  );
  if (_refreshAll) _refreshAll();
}
