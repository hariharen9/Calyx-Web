("use strict");
import {
  $,
  $$,
  todayKey,
  esc,
  pd,
  MONTHS,
  DAYS,
  MIN,
  HM,
  pad,
  now,
} from "../utils/helpers.js";
import { ic } from "../utils/icons.js";
import { toast } from "../utils/toast.js";
import { pushStateToCloud } from "../supabase.js";
import { endOf, segHtml } from "../queries/queries.js";
import { ev } from "../data/seed.js";

export const DATA_KEY = "calyx.data.v1";

export const S = {
  tab: "home",
  calView: "month",
  cal: { y: 2026, m: 9 },
  sel: "2026-10-14",
  taskTab: "today",
  trackTab: "since",
  filter: "all",
  agendaStart: "2026-10-12",
  agendaDays: 30,
  logId: null,
  rollId: null,
  prefs: {
    theme: "calm",
    mode: "system",
    hour: "24h",
    week: 1,
    haptics: "full",
    reduce: false,
    density: "comfortable",
    alarm: "standard",
    snooze: 10,
    seen: false,
  },
  items: [],
  logs: [],
  cds: [],
  pages: [],
  folders: [],
  user: null,
};

let _refreshAllFn = () => {};
export function setStateRefreshFn(fn) {
  _refreshAllFn = fn;
}

export function loadPrefs() {
  try {
    const p = JSON.parse(localStorage.getItem("calyx.prefs") || "null");
    if (p) Object.assign(S.prefs, p);
  } catch (e) {}
}

export function savePrefs() {
  try {
    localStorage.setItem("calyx.prefs", JSON.stringify(S.prefs));
  } catch (e) {}
}

export const reduced = () =>
  S.prefs.reduce || matchMedia("(prefers-reduced-motion: reduce)").matches;

export const buzz = (n) => {
  if (S.prefs.haptics === "off") return;
  try {
    navigator.vibrate &&
      navigator.vibrate(S.prefs.haptics === "full" ? n : Math.max(4, n / 2));
  } catch (e) {}
};

export function getResolvedMode() {
  const m = S.prefs.mode || "system";
  if (m === "system") {
    return window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return m;
}

export function applyPrefs() {
  const h = document.documentElement;
  h.dataset.theme = S.prefs.theme || "calm";
  h.dataset.density = S.prefs.density || "comfortable";
  const resolvedMode = getResolvedMode();
  h.dataset.mode = resolvedMode;
  h.classList.toggle("rm", !!S.prefs.reduce);

  // Sync theme-color meta tag for browser chrome/mobile address bar
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) {
    const isDark = resolvedMode === "dark";
    const themeBgMap = {
      calm: isDark ? "#131918" : "#2e6f68",
      editorial: isDark ? "#0c0c0e" : "#1f3dff",
      friendly: isDark ? "#16102a" : "#6c4bff",
      focus: isDark ? "#0b0c10" : "#5053e8",
    };
    metaTheme.content = themeBgMap[S.prefs.theme] || (isDark ? "#0b0c10" : "#ffffff");
  }

  // Sync desktop quick mode button if present
  const qmLbl = $("#deskQuickModeLabel");
  if (qmLbl) {
    qmLbl.textContent = resolvedMode === "dark" ? "Dark Mode" : "Light Mode";
  }
}

if (typeof window !== "undefined" && window.matchMedia) {
  try {
    window
      .matchMedia("(prefers-color-scheme: dark)")
      .addEventListener("change", () => {
        if ((S.prefs.mode || "system") === "system") {
          applyPrefs();
          if (_refreshAllFn) _refreshAllFn();
        }
      });
  } catch (e) {}
}

let syncTimer = null;

export function scheduleCloudSync(delay = 1200) {
  if (!S.user) return;
  clearTimeout(syncTimer);
  const dot = $("#deskSyncDot");
  if (dot) dot.classList.add("syncing");
  syncTimer = setTimeout(async () => {
    try {
      await pushStateToCloud(S);
    } catch (e) {
      console.warn("Auto-sync error:", e);
    } finally {
      const d = $("#deskSyncDot");
      if (d) d.classList.remove("syncing");
    }
  }, delay);
}

window.addEventListener("beforeunload", () => {
  if (syncTimer) {
    clearTimeout(syncTimer);
    pushStateToCloud(S).catch(() => {});
  }
});

export function saveState() {
  try {
    const data = {
      items: S.items,
      logs: S.logs,
      cds: S.cds,
      pages: S.pages,
      folders: S.folders,
      prefs: S.prefs,
    };
    localStorage.setItem(DATA_KEY, JSON.stringify(data));
    scheduleCloudSync();
    updateDeskBadges();
  } catch (e) {
    console.error("saveState error:", e);
  }
}

export function loadState() {
  loadPrefs();
  try {
    const raw = localStorage.getItem(DATA_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (Array.isArray(data.items)) S.items = data.items;
      if (Array.isArray(data.logs)) S.logs = data.logs;
      if (Array.isArray(data.cds)) S.cds = data.cds;
      if (Array.isArray(data.pages)) S.pages = data.pages;
      if (Array.isArray(data.folders)) S.folders = data.folders;
      if (data.prefs && typeof data.prefs === "object")
        Object.assign(S.prefs, data.prefs);
      return true;
    }
  } catch (e) {
    console.error("loadState error:", e);
  }
  return false;
}

export function updateDeskBadges() {
  const tb = $("#deskTaskBadge");
  if (tb) {
    const openTasks = S.items.filter(
      (i) => i.type === "task" && !i.done,
    ).length;
    tb.textContent = openTasks;
  }
  const pb = $("#deskPagesBadge");
  if (pb) {
    pb.textContent = S.pages ? S.pages.length : 0;
  }
  const trb = $("#deskTrackBadge");
  if (trb) {
    const total = (S.logs ? S.logs.length : 0) + (S.cds ? S.cds.length : 0);
    trb.textContent = total;
  }

  const fl = $("#deskFoldersList");
  if (fl && S.folders && S.pages) {
    fl.innerHTML = S.folders
      .map((f) => {
        const cnt = S.pages.filter((p) => p.folder === f.id).length;
        return `<button class="desk-folder-item press" data-act="deskfolder" data-id="${f.id}">
        <span class="fe">${f.emoji}</span>
        <span>${esc(f.name)}</span>
        <small>${cnt}</small>
      </button>`;
      })
      .join("");
  }

  updateSyncStatus();
}

export function updateSyncStatus() {
  const dot = $("#deskSyncDot");
  const lbl = $("#deskSyncLabel");
  const mobDot = $("#mobSyncDot");
  const mobLbl = $("#mobSyncLabel");
  if (dot && lbl) {
    if (S.user) {
      dot.classList.add("online");
      lbl.textContent = S.user.email.split("@")[0];
      lbl.title = S.user.email;
    } else {
      dot.classList.remove("online");
      lbl.textContent = "Local (Offline)";
      lbl.title = "Click to connect Supabase";
    }
  }
  if (mobDot && mobLbl) {
    if (S.user) {
      mobDot.classList.add("online");
      mobLbl.textContent = S.user.email.split("@")[0];
    } else {
      mobDot.classList.remove("online");
      mobLbl.textContent = "Local";
    }
  }
}

export function updateDeskTopbar() {
  const title = $("#deskViewTitle");
  const sub = $("#deskViewSub");
  const acts = $("#deskTopbarActions");
  if (!title || !acts) return;

  const n = now();
  const k = todayKey();

  if (S.tab === "home") {
    title.textContent = `${n.getDate()} ${MONTHS[n.getMonth()]}`;
    sub.textContent = `${DAYS[n.getDay()]}, ${n.getFullYear()}`;
    acts.innerHTML = `
      <button class="pillbtn press" data-act="compose" data-date="${k}">${ic("plus", 16)}New Entry</button>
      <button class="ibtn press" data-act="settings" aria-label="Settings">${ic("settings", 18)}</button>
    `;
  } else if (S.tab === "cal") {
    title.textContent = "Calendar";
    sub.textContent = `${MONTHS[pd(S.sel).getMonth()]} ${pd(S.sel).getFullYear()}`;
    acts.innerHTML = `
      <div class="desk-topbar-seg">${segHtml(
        "calView",
        [
          ["month", "Month"],
          ["week", "Week"],
          ["agenda", "Agenda"],
        ],
        S.calView,
        "sm",
      )}</div>
      <button class="pillbtn press" data-act="todayjump">Today</button>
      <button class="pillbtn press" data-act="compose" data-date="${S.sel}">${ic("plus", 16)}Add Event</button>
      <button class="ibtn press" data-act="cmd" aria-label="Search">${ic("search", 18)}</button>
    `;
  } else if (S.tab === "tasks") {
    title.textContent = "Tasks";
    const openCount = S.items.filter(
      (i) => i.type === "task" && !i.done,
    ).length;
    sub.textContent = `${openCount} open tasks`;
    acts.innerHTML = `
      <div class="desk-topbar-seg">${segHtml(
        "taskTab",
        [
          ["today", "Today"],
          ["upcoming", "Upcoming"],
          ["anytime", "Anytime"],
          ["done", "Done"],
        ],
        S.taskTab,
        "sm",
      )}</div>
      <button class="pillbtn press" data-act="compose" data-type="task">${ic("plus", 16)}Add Task</button>
    `;
  } else if (S.tab === "pages") {
    title.textContent = "Pages";
    sub.textContent = `${S.pages ? S.pages.length : 0} notes & docs`;
    acts.innerHTML = `
      <button class="pillbtn press" data-act="newfolder">${ic("folder", 16)}New Folder</button>
      <button class="pillbtn press" data-act="newpage">${ic("plus", 16)}New Page</button>
    `;
  } else if (S.tab === "track") {
    title.textContent = "Track";
    sub.textContent = "Habits & countdowns";
    acts.innerHTML = `
      <div class="desk-topbar-seg">${segHtml(
        "trackTab",
        [
          ["since", "Days since"],
          ["until", "Days until"],
        ],
        S.trackTab,
        "sm",
      )}</div>
      <button class="pillbtn press" data-act="${S.trackTab === "since" ? "newlog" : "newcd"}">${ic("plus", 16)}${S.trackTab === "since" ? "New Log" : "New Countdown"}</button>
    `;
  }
}

export function exportJsonBackup() {
  const payload = {
    app: "Calyx",
    version: "1.0",
    exportedAt: new Date().toISOString(),
    data: {
      items: S.items,
      logs: S.logs,
      cds: S.cds,
      pages: S.pages,
      folders: S.folders,
      prefs: S.prefs,
    },
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `calyx-backup-${todayKey()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  toast("Backup exported successfully");
}

export function triggerImportJson() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json,application/json";
  input.onchange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result);
        const d = parsed.data || parsed;
        if (!Array.isArray(d.items) && !Array.isArray(d.logs)) {
          throw new Error("Invalid Calyx backup format");
        }
        if (Array.isArray(d.items)) S.items = d.items;
        if (Array.isArray(d.logs)) S.logs = d.logs;
        if (Array.isArray(d.cds)) S.cds = d.cds;
        if (Array.isArray(d.pages)) S.pages = d.pages;
        if (Array.isArray(d.folders)) S.folders = d.folders;
        if (d.prefs) Object.assign(S.prefs, d.prefs);
        savePrefs();
        saveState();
        _refreshAllFn();
        toast("Backup restored successfully!");
      } catch (err) {
        toast("Failed to import: " + err.message);
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

export function exportIcsCalendar() {
  const events = S.items.filter(
    (i) => i.type === "event" || i.type === "birthday" || i.type === "reminder",
  );
  if (!events.length) {
    toast("No calendar events to export");
    return;
  }
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Calyx//Time Management//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  events.forEach((e) => {
    const dStr = (e.date || todayKey()).replace(/-/g, "");
    let dtstart = "",
      dtend = "";
    if (e.allDay || !e.start) {
      dtstart = `;VALUE=DATE:${dStr}`;
      dtend = `;VALUE=DATE:${dStr}`;
    } else {
      const s = (e.start || "09:00").replace(":", "") + "00";
      const en = (e.end || endOf(e) || "10:00").replace(":", "") + "00";
      dtstart = `:${dStr}T${s}`;
      dtend = `:${dStr}T${en}`;
    }

    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${e.id}@calyx.app`);
    lines.push(`DTSTAMP:${todayKey().replace(/-/g, "")}T000000Z`);
    lines.push(`DTSTART${dtstart}`);
    lines.push(`DTEND${dtend}`);
    lines.push(`SUMMARY:${(e.title || "Untitled").replace(/[\\,;]/g, "\\$&")}`);
    if (e.loc) lines.push(`LOCATION:${e.loc.replace(/[\\,;]/g, "\\$&")}`);
    if (e.notes)
      lines.push(
        `DESCRIPTION:${e.notes.replace(/\n/g, "\\n").replace(/[\\,;]/g, "\\$&")}`,
      );
    if (e.repeat) {
      const u = e.repeat.unit;
      const freq =
        u === "day"
          ? "DAILY"
          : u === "week"
            ? "WEEKLY"
            : u === "month"
              ? "MONTHLY"
              : "YEARLY";
      lines.push(
        `RRULE:FREQ=${freq}${e.repeat.every > 1 ? `;INTERVAL=${e.repeat.every}` : ""}`,
      );
    }
    lines.push("END:VEVENT");
  });

  lines.push("END:VCALENDAR");
  const blob = new Blob([lines.join("\r\n")], {
    type: "text/calendar;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `calyx-calendar-${todayKey()}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  toast("Calendar exported (.ics)");
}

export function triggerImportIcs() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".ics,text/calendar";
  input.onchange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target.result;
        const vevents = text.split(/BEGIN:VEVENT/i).slice(1);
        let added = 0;
        vevents.forEach((block) => {
          const summaryM = /SUMMARY:(.*?)(\r?\n[A-Z]|$)/is.exec(block);
          const dtstartM = /DTSTART(?:;[^:]+)?:(\d{8})(?:T(\d{4}))?/i.exec(
            block,
          );
          const dtendM = /DTEND(?:;[^:]+)?:(\d{8})(?:T(\d{4}))?/i.exec(block);
          const locM = /LOCATION:(.*?)(\r?\n[A-Z]|$)/is.exec(block);
          const descM = /DESCRIPTION:(.*?)(\r?\n[A-Z]|$)/is.exec(block);

          if (summaryM && dtstartM) {
            const rawTitle = summaryM[1].replace(/\\([\\,;])/g, "$1").trim();
            const dStr = dtstartM[1];
            const date = `${dStr.slice(0, 4)}-${dStr.slice(4, 6)}-${dStr.slice(6, 8)}`;
            const start = dtstartM[2]
              ? `${dtstartM[2].slice(0, 2)}:${dtstartM[2].slice(2, 4)}`
              : null;
            let end =
              dtendM && dtendM[2]
                ? `${dtendM[2].slice(0, 2)}:${dtendM[2].slice(2, 4)}`
                : null;
            if (start && (!end || MIN(end) <= MIN(start)))
              end = HM(MIN(start) + 60);

            const item = ev(
              rawTitle || "Imported Event",
              date,
              start,
              end,
              (S.items.length % 5) + 1,
              {
                loc: locM ? locM[1].replace(/\\([\\,;])/g, "$1").trim() : "",
                notes: descM
                  ? descM[1]
                      .replace(/\\n/g, "\n")
                      .replace(/\\([\\,;])/g, "$1")
                      .trim()
                  : "",
                allDay: !start,
              },
            );
            S.items.push(item);
            added++;
          }
        });
        if (added > 0) {
          saveState();
          _refreshAllFn();
          toast(`Imported ${added} event${added > 1 ? "s" : ""}`);
        } else {
          toast("No events found in .ics file");
        }
      } catch (err) {
        toast("Failed to parse .ics file: " + err.message);
      }
    };
    reader.readAsText(file);
  };
  input.click();
}
