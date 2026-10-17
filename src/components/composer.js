import { S, buzz } from "../state/state.js";
import { todayKey, nowMin, MIN, HM, pd, esc, $, uid } from "../utils/helpers.js";
import { toast } from "../utils/toast.js";
import { ic, TYPELABEL, LOGICONS } from "../utils/icons.js";
import { segHtml } from "../queries/queries.js";
import { REP, ev, tk, EMOJIS } from "../data/seed.js";

export let C = null;
export function setC(val) {
  C = val;
}

export const fld = (l, i) => `<div class="fld"><label>${l}</label>${i}</div>`;

let _openSheet = null;
let _closeSheet = null;
let _paintSheet = null;
let _refreshAll = null;

export function setComposerOverlayCallbacks(cbs) {
  if (cbs.openSheet) _openSheet = cbs.openSheet;
  if (cbs.closeSheet) _closeSheet = cbs.closeSheet;
  if (cbs.paintSheet) _paintSheet = cbs.paintSheet;
  if (cbs.refreshAll) _refreshAll = cbs.refreshAll;
}

export function fillTimes() {
  if (C.type === "event" || C.type === "reminder") {
    if (!C.start) {
      C.start =
        C.date === todayKey()
          ? HM(Math.ceil((nowMin() + 20) / 30) * 30)
          : "09:00";
    }
    if (C.type === "event" && (!C.end || MIN(C.end) <= MIN(C.start)))
      C.end = HM(MIN(C.start) + 60);
  }
}

export function openComposer(pre = {}) {
  const t = todayKey(),
    k = pre.date || (S.tab === "cal" ? S.sel : t);
  C = {
    type: pre.type || "event",
    title: pre.title || "",
    date: pre.date === null ? "" : k,
    start: pre.start || "",
    end: pre.end || "",
    repeat: pre.repeat || "none",
    pri: pre.pri || "med",
    loc: pre.loc || "",
    notes: pre.notes || "",
    emoji: pre.emoji || "🎯",
    target: pre.target || 14,
    icon: pre.icon || "scissors",
    editId: pre.editId || null,
    k: pre.k || 1,
    last: t,
  };
  if (C.type === "task" && pre.date === undefined && !pre.editId) C.date = t;
  if (!C.editId) fillTimes();
  if (_openSheet) _openSheet(composerHtml);
  setTimeout(() => {
    const f = $("#f-title");
    f && f.focus({ preventScroll: true });
  }, 450);
}

export function composerHtml() {
  if (!C) return "";
  const edit = !!C.editId,
    T = C.type,
    ph = {
      event: "Event name",
      task: "What needs doing?",
      reminder: "Remind me to…",
      countdown: "What are you counting down to?",
      log: "What do you track? e.g. Oil change",
      birthday: "Whose birthday?",
    }[T];
  let h = `<div class="shead"><div><h2 class="disp">${edit ? "Edit " + (TYPELABEL[T] || "").toLowerCase() : "Create something"}</h2><small>${edit ? "Change anything, then save" : "Everything is a time entry"}</small></div></div>`;
  if (!edit)
    h += segHtml(
      "ctype",
      [
        ["event", "Event"],
        ["task", "Task"],
        ["reminder", "Reminder"],
        ["countdown", "Countdown"],
        ["log", "Log"],
      ],
      T,
      "sm",
    );
  h += fld(
    "Title",
    `<input class="inp" id="f-title" data-f="title" value="${esc(C.title)}" placeholder="${ph}" autocomplete="off">`,
  );
  if (
    T === "event" ||
    T === "reminder" ||
    T === "birthday" ||
    T === "countdown"
  )
    h += fld(
      T === "countdown" ? "Target date" : "Date",
      `<input class="inp" type="date" data-f="date" value="${C.date || ""}">`,
    );
  if (T === "event")
    h += `<div class="two"><div class="fld"><label>Starts</label><input class="inp" type="time" data-f="start" value="${C.start}"></div><div class="fld"><label>Ends</label><input class="inp" type="time" data-f="end" value="${C.end}"></div></div>`;
  if (T === "reminder")
    h += fld(
      "Time",
      `<input class="inp" type="time" data-f="start" value="${C.start}">`,
    );
  if (T === "task") {
    h += fld(
      "Due date",
      `<input class="inp" type="date" data-f="date" value="${C.date || ""}"><div class="chips" style="margin:10px 0 0">${[
        ["today", "Today"],
        ["tomorrow", "Tomorrow"],
        ["week", "Next week"],
        ["none", "Anytime"],
      ]
        .map(
          ([v, l]) =>
            `<button class="chip" data-act="cdate" data-v="${v}">${l}</button>`,
        )
        .join("")}</div>`,
    );
    h += fld(
      "Priority",
      segHtml(
        "cpri",
        [
          ["low", "Low"],
          ["med", "Medium"],
          ["high", "High"],
        ],
        C.pri,
        "sm",
      ),
    );
  }
  if (T === "event" || T === "reminder")
    h += fld(
      "Repeat",
      `<select class="inp" data-f="repeat">${[
        ["none", "Does not repeat"],
        ["daily", "Every day"],
        ["weekdays", "Weekdays"],
        ["weekly", "Every week"],
        ["monthly", "Every month"],
        ["yearly", "Every year"],
      ]
        .map(
          ([v, l]) =>
            `<option value="${v}" ${C.repeat === v ? "selected" : ""}>${l}</option>`,
        )
        .join("")}</select>`,
    );
  if (T === "event")
    h += fld(
      "Location",
      `<input class="inp" data-f="loc" value="${esc(C.loc)}" placeholder="Optional" autocomplete="off">`,
    );
  if (T === "event" || T === "reminder")
    h += fld(
      "Colour",
      `<div class="kdots">${[1, 2, 3, 4, 5].map((i) => `<button class="${C.k === i ? "on" : ""}" style="--c:var(--k${i})" data-act="ccolor" data-v="${i}" aria-label="Colour ${i}"></button>`).join("")}</div>`,
    );
  if (T === "event" || T === "task")
    h += fld(
      "Notes",
      `<input class="inp" data-f="notes" value="${esc(C.notes)}" placeholder="Optional" autocomplete="off">`,
    );
  if (T === "countdown")
    h += fld(
      "Icon",
      `<div class="emjs">${EMOJIS.map((e) => `<button class="${C.emoji === e ? "on" : ""}" data-act="cemoji" data-v="${e}">${e}</button>`).join("")}</div>`,
    );
  if (T === "log") {
    h += fld(
      "Icon",
      `<div class="picks">${LOGICONS.map((i) => `<button class="${C.icon === i ? "on" : ""}" data-act="cicon" data-v="${i}" aria-label="${i}">${ic(i, 22)}</button>`).join("")}</div>`,
    );
    h += `<div class="two"><div class="fld"><label>Aim to repeat every (days)</label><input class="inp" type="number" min="1" data-f="target" value="${C.target}"></div><div class="fld"><label>Last done</label><input class="inp" type="date" data-f="last" value="${C.last}"></div></div>`;
  }
  const lab = edit
    ? "Save changes"
    : {
        event: "Add event",
        task: "Add task",
        reminder: "Add reminder",
        countdown: "Start countdown",
        log: "Start tracking",
      }[T] || "Save";
  h += `<div class="sgroup" style="margin-top:8px"><button class="btn press" data-act="csave">${ic("check", 20)}${lab}</button></div>`;
  return h;
}

export function saveComposer() {
  const title = (C.title || "").trim(),
    T = C.type;
  if (!title) {
    const f = $("#f-title");
    if (f) {
      f.classList.remove("err");
      void f.offsetWidth;
      f.classList.add("err");
      f.focus();
    }
    buzz(30);
    return;
  }
  if (
    (T === "countdown" ||
      T === "event" ||
      T === "reminder" ||
      T === "birthday") &&
    !C.date
  ) {
    toast("Pick a date first");
    return;
  }
  fillTimes();
  const rep = REP[C.repeat] || null;
  if (C.editId) {
    if (T === "countdown") {
      const cd = S.cds.find((x) => x.id === C.editId);
      if (cd) {
        cd.title = title;
        cd.date = C.date;
        cd.emoji = C.emoji;
        toast("Countdown updated");
      }
    } else {
      const it = S.items.find((x) => x.id === C.editId);
      if (!it) {
        if (_closeSheet) _closeSheet();
        return;
      }
      Object.assign(it, { title });
      if (T === "event")
        Object.assign(it, {
          date: C.date,
          start: C.start,
          end: C.end,
          loc: C.loc,
          notes: C.notes,
          k: C.k,
          repeat: rep,
        });
      if (T === "reminder")
        Object.assign(it, { date: C.date, start: C.start, k: C.k, repeat: rep });
      if (T === "birthday") it.date = C.date;
      if (T === "task")
        Object.assign(it, { date: C.date || null, pri: C.pri, notes: C.notes });
      toast("Changes saved");
    }
  } else if (T === "event") {
    const e = ev(title, C.date, C.start, C.end, C.k, {
      repeat: rep,
      loc: C.loc,
      notes: C.notes,
    });
    S.items.push(e);
    S.sel = C.date;
    toast("Event added", () => {
      S.items = S.items.filter((x) => x !== e);
    });
  } else if (T === "reminder") {
    const e = {
      id: uid(),
      type: "reminder",
      title,
      date: C.date,
      start: C.start,
      k: C.k,
      repeat: rep,
    };
    S.items.push(e);
    toast("Reminder set", () => {
      S.items = S.items.filter((x) => x !== e);
    });
  } else if (T === "task") {
    const e = tk(title, C.date || null, C.pri, { notes: C.notes });
    S.items.push(e);
    toast("Task added", () => {
      S.items = S.items.filter((x) => x !== e);
    });
  } else if (T === "countdown") {
    const e = {
      id: uid(),
      title,
      date: C.date,
      emoji: C.emoji,
      created: todayKey(),
    };
    S.cds.push(e);
    S.trackTab = "until";
    toast("Countdown started", () => {
      S.cds = S.cds.filter((x) => x !== e);
    });
  } else if (T === "log") {
    const e = {
      id: uid(),
      name: title,
      icon: C.icon,
      target: Math.max(1, +C.target || 14),
      k: (S.logs.length % 5) + 1,
      occ: [{ d: C.last || todayKey(), cost: 0, note: "" }],
    };
    S.logs.push(e);
    S.trackTab = "since";
    toast("Now tracking " + title, () => {
      S.logs = S.logs.filter((x) => x !== e);
    });
  }
  buzz(16);
  if (_closeSheet) _closeSheet();
  if (
    ["event", "reminder", "task"].includes(T) &&
    !C.editId &&
    S.tab === "cal"
  ) {
    const d = pd(S.sel);
    S.cal = { y: d.getFullYear(), m: d.getMonth() };
  }
  if (_refreshAll) _refreshAll();
}
