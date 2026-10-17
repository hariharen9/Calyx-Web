import {
  getSupabase,
  getSupabaseConfig,
  saveSupabaseConfig,
  getCurrentUser,
  signInWithEmail,
  signUpWithEmail,
  signOutUser,
  pushStateToCloud,
  pullStateFromCloud,
} from "./src/supabase.js";

("use strict");
/* ================= HELPERS ================= */
const $ = (s, r = document) => r.querySelector(s),
  $$ = (s, r = document) => [...r.querySelectorAll(s)];
const pad = (n) => String(n).padStart(2, "0");
const ymd = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const pd = (s) => {
  const [a, b, c] = s.split("-").map(Number);
  return new Date(a, b - 1, c);
};
const addD = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
const addKey = (k, n) => ymd(addD(pd(k), n));
const diffD = (a, b) => Math.round((pd(b) - pd(a)) / 864e5);
const MIN = (t) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};
const HM = (m) =>
  `${pad(((Math.floor(m / 60) % 24) + 24) % 24)}:${pad(((m % 60) + 60) % 60)}`;
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const MS = MONTHS.map((m) => m.slice(0, 3));
const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const DS = DAYS.map((d) => d.slice(0, 3));
const esc = (s) =>
  String(s == null ? "" : s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
let _id = 100;
const uid = () => "i" + ++_id;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/* Real device clock (live local time) */
const now = () => new Date();
const todayKey = () => ymd(now());
const nowMin = () => {
  const n = now();
  return n.getHours() * 60 + n.getMinutes() + n.getSeconds() / 60;
};

/* ================= ICONS ================= */
const ICONS = {
  home: '<path d="M3.5 11 12 3.5 20.5 11"/><path d="M5.5 9.5V20h13V9.5"/><path d="M10 20v-5.5h4V20"/>',
  cal: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  tasks:
    '<rect x="3" y="3" width="18" height="18" rx="5"/><path d="m8 12.2 2.8 2.8L16 9.5"/>',
  track: '<path d="M3 17.5 8.5 11l4 3.2L20 6"/><path d="M14.5 6H20v5.5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
  settings:
    '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2.2"/><circle cx="9" cy="17" r="2.2"/>',
  chevL: '<path d="m15 5-7 7 7 7"/>',
  chevR: '<path d="m9 5 7 7-7 7"/>',
  x: '<path d="m6 6 12 12M18 6 6 18"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  scissors:
    '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="m8.4 8 11.1 9M8.4 16l11.1-9"/>',
  drop: '<path d="M12 3s6.5 6.5 6.5 11.2a6.5 6.5 0 0 1-13 0C5.5 9.5 12 3 12 3z"/>',
  car: '<path d="M4 15v-3.2L6.2 6.5h11.6L20 11.8V15"/><rect x="3" y="15" width="18" height="4.5" rx="1.5"/><path d="M7 17.2h.01M17 17.2h.01"/>',
  dumbbell:
    '<path d="M6.5 6.5v11M17.5 6.5v11M3.5 9.5v5M20.5 9.5v5M6.5 12h11"/>',
  fuel: '<path d="M4.5 20.5V5.5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v15M3 20.5h13M14.5 9H17a2 2 0 0 1 2 2v5a1.6 1.6 0 0 0 3.2 0V9L19 5.8"/><path d="M7 8h5"/>',
  leaf: '<path d="M5 19.5C5 10 10.5 4.5 20 4.5c0 9.5-5 15-14.500 15z"/><path d="M5 19.5c3-5.500 6-8.500 10-10.500"/>',
  pill: '<rect x="3" y="8.5" width="18" height="7" rx="3.5" transform="rotate(-35 12 12)"/><path d="m9.500 9.500 5 5" />',
  book: '<path d="M5 4.5h10a3 3 0 0 1 3 3v12H8a3 3 0 0 1-3-3z"/><path d="M5 16.5a3 3 0 0 1 3-3h10"/>',
  bell: '<path d="M6 16.5V11a6 6 0 0 1 12 0v5.500l1.800 1.800H4.200z"/><path d="M10 21h4"/>',
  gift: '<rect x="3.5" y="9" width="17" height="11.500" rx="2"/><path d="M12 9v11.500M3.500 14h17"/><path d="M12 9C10.500 5 6.500 5.500 7 7.500 7.500 9 10 9 12 9zm0 0c1.500-4 5.500-3.500 5-1.500-.5 1.500-3 1.500-5 1.500z"/>',
  repeat:
    '<path d="m17 3 3 3-3 3"/><path d="M4 11V9.500A3.500 3.500 0 0 1 7.500 6H20"/><path d="m7 21-3-3 3-3"/><path d="M20 13v1.500a3.500 3.500 0 0 1-3.500 3.500H4"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 12.500h10L18 7M9 7V4h6v3"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  hourglass:
    '<path d="M6 3h12M6 21h12M7 3c0 5.500 5 6.500 5 9s-5 3.500-5 9M17 3c0 5.500-5 6.500-5 9s5 3.500 5 9"/>',
  spark:
    '<path d="m12 3 1.900 5.100L19 10l-5.100 1.900L12 17l-1.900-5.100L5 10l5.100-1.900z"/><path d="M19 16v4M17 18h4"/>',
  globe:
    '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
  pin: '<path d="M12 21s6.500-5.800 6.500-11a6.500 6.500 0 0 0-13 0C5.500 15.200 12 21 12 21z"/><circle cx="12" cy="10" r="2.300"/>',
  note: '<path d="M5 4h14v12l-5 5H5z"/><path d="M14 21v-5h5M8.500 9h7M8.500 13h4"/>',
  more: '<path d="M5 12h.01M12 12h.01M19 12h.01"/>',
  edit: '<path d="M4 20h4L19 9a2.800 2.800 0 0 0-4-4L4 16z"/>',
  flag: '<path d="M5.500 21V4M5.500 4.500h12l-2.500 4 2.500 4h-12"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.600 5.600 7 7M17 17l1.400 1.400M18.400 5.600 17 7M7 17l-1.400 1.400"/>',
  undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>',
};
const ic = (n, s = 20) =>
  `<svg class="ic" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">${ICONS[n] || ""}</svg>`;
const LOGICONS = [
  "scissors",
  "car",
  "dumbbell",
  "drop",
  "fuel",
  "leaf",
  "pill",
  "book",
];

/* ================= STATE ================= */
const S = {
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
};
function loadPrefs() {
  try {
    const p = JSON.parse(localStorage.getItem("calyx.prefs") || "null");
    if (p) Object.assign(S.prefs, p);
  } catch (e) {}
}
function savePrefs() {
  try {
    localStorage.setItem("calyx.prefs", JSON.stringify(S.prefs));
  } catch (e) {}
}
const reduced = () =>
  S.prefs.reduce || matchMedia("(prefers-reduced-motion: reduce)").matches;
const buzz = (n) => {
  if (S.prefs.haptics === "off") return;
  try {
    navigator.vibrate &&
      navigator.vibrate(S.prefs.haptics === "full" ? n : Math.max(4, n / 2));
  } catch (e) {}
};

/* ================= PERSISTENCE & DESKTOP SYNC ================= */
const DATA_KEY = "calyx.data.v1";

function saveState() {
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
    if (S.user) {
      pushStateToCloud(S).catch(() => {});
    }
    updateDeskBadges();
  } catch (e) {
    console.error("saveState error:", e);
  }
}

function loadState() {
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

function exportJsonBackup() {
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

function triggerImportJson() {
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
        refreshAll();
        toast("Backup restored successfully!");
      } catch (err) {
        toast("Failed to import: " + err.message);
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

function exportIcsCalendar() {
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

function triggerImportIcs() {
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
          refreshAll();
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

function updateDeskBadges() {
  const tb = $("#deskTaskBadge");
  if (tb) {
    const openTasks = S.items.filter(
      (i) => i.type === "task" && !i.done,
    ).length;
    tb.textContent = openTasks;
    tb.style.display = openTasks > 0 ? "" : "none";
  }
  const pb = $("#deskPagesBadge");
  if (pb) {
    pb.textContent = S.pages ? S.pages.length : 0;
    pb.style.display = S.pages && S.pages.length > 0 ? "" : "none";
  }
  const trb = $("#deskTrackBadge");
  if (trb) {
    const total = (S.logs ? S.logs.length : 0) + (S.cds ? S.cds.length : 0);
    trb.textContent = total;
    trb.style.display = total > 0 ? "" : "none";
  }

  const fl = $("#deskFoldersList");
  if (fl && S.folders && S.pages) {
    fl.innerHTML = S.folders
      .map((f) => {
        const cnt = S.pages.filter((p) => p.folder === f.id).length;
        return `<button class="desk-folder-item press" data-act="tab" data-tab="pages">
        <span class="fe">${f.emoji}</span>
        <span>${esc(f.name)}</span>
        <small>${cnt}</small>
      </button>`;
      })
      .join("");
  }

  updateSyncStatus();
}

function updateSyncStatus() {
  const dot = $("#deskSyncDot");
  const lbl = $("#deskSyncLabel");
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
}

function updateDeskTopbar() {
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

function fmtT(t) {
  if (!t) return "";
  if (S.prefs.hour === "24h") return t;
  const m = MIN(t);
  let h = Math.floor(m / 60) % 24;
  const mm = m % 60,
    ap = h >= 12 ? "pm" : "am";
  h = h % 12 || 12;
  return mm ? `${h}:${pad(mm)} ${ap}` : `${h} ${ap}`;
}
function fmtLeft(sec) {
  sec = Math.max(0, Math.floor(sec));
  const h = Math.floor(sec / 3600),
    m = Math.floor((sec % 3600) / 60),
    s = sec % 60;
  return h ? `${h}h ${pad(m)}m` : `${pad(m)}:${pad(s)}`;
}
function dur(min) {
  const h = Math.floor(min / 60),
    m = Math.round(min % 60);
  return h ? (m ? `${h}h ${m}m` : `${h}h`) : `${m}m`;
}
function dayLabel(k, short) {
  const t = todayKey(),
    d = diffD(t, k);
  if (d === 0) return "Today";
  if (d === 1) return "Tomorrow";
  if (d === -1) return "Yesterday";
  const x = pd(k);
  return `${DS[x.getDay()]} ${x.getDate()}${short && Math.abs(d) <= 6 ? "" : " " + MS[x.getMonth()]}`;
}
function longDate(k) {
  const x = pd(k);
  return `${DAYS[x.getDay()]}, ${x.getDate()} ${MONTHS[x.getMonth()]}`;
}
const col = (it) =>
  it.type === "task"
    ? `var(--${{ high: "hi", med: "md", low: "lo" }[it.pri || "med"]})`
    : `var(--k${it.k || 1})`;
const TYPEICON = {
  event: "cal",
  task: "tasks",
  reminder: "bell",
  birthday: "gift",
};

/* ================= DATA ================= */
const ev = (title, date, start, end, k, x = {}) => ({
  id: uid(),
  type: "event",
  title,
  date,
  start,
  end,
  k,
  ...x,
});
const tk = (title, date, pri, x = {}) => ({
  id: uid(),
  type: "task",
  title,
  date,
  pri,
  done: false,
  subs: [],
  ...x,
});
const REP = {
  none: null,
  daily: { unit: "day", every: 1 },
  weekdays: { unit: "week", every: 1, days: [1, 2, 3, 4, 5] },
  weekly: { unit: "week", every: 1 },
  monthly: { unit: "month", every: 1 },
  yearly: { unit: "year", every: 1 },
};
const repKey = (r) => {
  if (!r) return "none";
  for (const k in REP)
    if (
      REP[k] &&
      JSON.stringify(REP[k]) ===
        JSON.stringify({
          unit: r.unit,
          every: r.every,
          ...(r.days ? { days: r.days } : {}),
        })
    )
      return k;
  return "none";
};
const repLabel = (r) =>
  !r
    ? ""
    : {
        daily: "Every day",
        weekdays: "Weekdays",
        weekly: "Every week",
        monthly: "Every month",
        yearly: "Every year",
      }[repKey(r)] || `Every ${r.every} ${r.unit}s`;
function seedAll() {
  const t = todayKey();
  S.items = [
    ev("Team standup", addKey(t, -2), "09:30", "09:45", 3, {
      repeat: REP.weekdays,
      loc: "Huddle room 2",
    }),
    ev("Piano lesson", addKey(t, -3), "17:00", "18:00", 4, {
      repeat: REP.weekly,
      loc: "Studio Gamut",
    }),
    ev("Yoga flow", addKey(t, 2), "12:00", "13:00", 2, {
      repeat: REP.weekly,
      loc: "Cult, Koramangala",
    }),
    ev("1-on-1 with Lead", addKey(t, 1), "14:00", "14:45", 1, {
      repeat: REP.weekly,
      notes: "Bring Q4 hiring plan and roadmap draft.",
    }),
    ev("Dentist checkup", t, "13:00", "14:00", 2, {
      loc: "Dr. Rao's clinic",
      notes: "Cleaning plus a quick x-ray.",
    }),
    ev("Sprint planning", t, "16:30", "17:30", 5, { loc: "Meet, 4th floor" }),
    ev("Dinner with Meera", t, "19:30", "21:00", 4, {
      loc: "Toit, Indiranagar",
    }),
    ev("Team lunch", addKey(t, 2), "13:00", "14:00", 2, { loc: "Truffles" }),
    ev("Farmers market", addKey(t, 3), "09:00", "10:30", 2),
    ev("Quarterly review", addKey(t, 6), "11:00", "12:30", 1, {
      loc: "Boardroom",
    }),
    ev("Flight to Delhi", addKey(t, 14), "06:15", "09:00", 1, {
      notes: "Terminal 1, gate opens 05:30.",
    }),
    {
      id: uid(),
      type: "birthday",
      title: "Meera's birthday",
      date: addKey(t, 8),
      allDay: true,
      k: 4,
      repeat: REP.yearly,
    },
    {
      id: uid(),
      type: "reminder",
      title: "Pick up Meera's gift",
      date: t,
      start: "18:00",
      k: 4,
    },
    {
      id: uid(),
      type: "reminder",
      title: "Call insurance about the claim",
      date: addKey(t, 1),
      start: "10:00",
      k: 3,
    },
    {
      id: uid(),
      type: "reminder",
      title: "Water the plants",
      date: addKey(t, -2),
      start: "08:00",
      k: 2,
      repeat: REP.weekly,
    },
    tk("Return Amazon package", addKey(t, -1), "low", { done: true }),
    tk("Pay electric bill", t, "med"),
    tk("Review PR #42 & merge feature branch", t, "high", {
      subs: [
        { t: "Read the diff", d: true },
        { t: "Run the test suite", d: true },
        { t: "Merge to main", d: false },
      ],
    }),
    tk("Submit quarterly budget proposal", t, "high", { done: true }),
    tk("Order new mechanical keyboard switches", addKey(t, 1), "low"),
    tk("Reply to landlord about renewal", addKey(t, 1), "med"),
    tk("Renew domain registration", addKey(t, 2), "med"),
    tk("Call mom", addKey(t, 4), "med"),
    tk("Plan Q4 roadmap", addKey(t, 6), "high", {
      subs: [
        { t: "Collect team input", d: false },
        { t: "Draft themes", d: false },
        { t: "Review with Lead", d: false },
      ],
    }),
    tk("Book Goa flights", null, "med"),
    tk("Back up phone photos", null, "low"),
    tk("Read chapter 7 of the DDIA book", null, "low"),
  ];
  const mkOcc = (last, gaps, cost, notes) => {
    let d = last;
    const o = [{ d, cost, note: notes[0] }];
    gaps.forEach((g, i) => {
      d = addKey(d, -g);
      o.push({ d, cost, note: notes[(i + 1) % notes.length] });
    });
    return o;
  };
  S.logs = [
    {
      id: uid(),
      name: "Haircut",
      icon: "scissors",
      target: 28,
      k: 4,
      occ: mkOcc(addKey(t, -27), [27, 28, 27, 28, 27], 35, [
        "Salon cut & trim",
      ]),
    },
    {
      id: uid(),
      name: "Car wash",
      icon: "car",
      target: 14,
      k: 1,
      occ: mkOcc(addKey(t, -13), [12, 14, 13, 15], 12, [
        "Full exterior wash",
        "Wash + vacuum",
      ]),
    },
    {
      id: uid(),
      name: "Gym workout",
      icon: "dumbbell",
      target: 2,
      k: 5,
      occ: mkOcc(addKey(t, -2), [2, 3, 2, 1, 2, 3, 2], 0, [
        "Push day",
        "Pull day",
        "Legs",
        "Cardio",
      ]),
    },
    {
      id: uid(),
      name: "Water filter",
      icon: "drop",
      target: 60,
      k: 2,
      occ: mkOcc(addKey(t, -58), [60, 57, 59], 18, ["Replaced cartridge"]),
    },
    {
      id: uid(),
      name: "Petrol",
      icon: "fuel",
      target: 9,
      k: 3,
      occ: mkOcc(addKey(t, -8), [8, 9, 7, 10], 42, ["Full tank"]),
    },
    {
      id: uid(),
      name: "Water plants",
      icon: "leaf",
      target: 3,
      k: 2,
      occ: mkOcc(addKey(t, -3), [3, 4, 3, 3], 0, ["All plants"]),
    },
  ];
  S.cds = [
    {
      id: uid(),
      title: "Product launch",
      date: addKey(t, 18),
      emoji: "🚀",
      created: addKey(t, -30),
    },
    {
      id: uid(),
      title: "Diwali",
      date: addKey(t, 25),
      emoji: "🪔",
      created: addKey(t, -45),
    },
    {
      id: uid(),
      title: "Mom's birthday",
      date: addKey(t, 48),
      emoji: "🎂",
      created: addKey(t, -14),
    },
    {
      id: uid(),
      title: "Goa trip",
      date: addKey(t, 65),
      emoji: "🏖️",
      created: addKey(t, -60),
    },
    {
      id: uid(),
      title: "New Year",
      date: String(pd(t).getFullYear() + 1) + "-01-01",
      emoji: "🎆",
      created: addKey(t, -15),
    },
  ];
}

/* ================= QUERIES ================= */
function occursOn(it, key) {
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
const sortKey = (i) => (i.allDay ? "00:00" : i.start || "99:99");
function itemsOn(key) {
  return S.items
    .filter((i) => (i.type === "task" ? i.date === key : occursOn(i, key)))
    .sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
}
const endOf = (e) => e.end || HM(MIN(e.start) + 60);
function curNext() {
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
function freeLeft() {
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
function logStats(l) {
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
function cdParts(c) {
  const ms = pd(c.date) - now();
  const a = Math.max(0, ms),
    d = Math.floor(a / 864e5),
    h = Math.floor((a % 864e5) / 36e5),
    m = Math.floor((a % 36e5) / 6e4),
    s = Math.floor((a % 6e4) / 1e3);
  return { ms, d, h, m, s };
}
/* ================= VIEW HELPERS ================= */
const stg = (i) => `stg" style="--i:${i}`;
const CHK =
  '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" pathLength="1"/></svg>';
const segHtml = (key, opts, cur, cls = "") => {
  const idx = Math.max(
    0,
    opts.findIndex((o) => o[0] === cur),
  );
  return `<div class="seg ${cls}" style="--n:${opts.length};--i:${idx}"><span class="thumb"></span>${opts.map(([v, l, b]) => `<button data-seg="${key}" data-val="${v}" class="${v === cur ? "on" : ""}">${l}${b != null ? ` <i>${b}</i>` : ""}</button>`).join("")}</div>`;
};
const RC = 276.46;
function ringHtml(frac, main, small) {
  return `<div class="ring"><svg viewBox="0 0 100 100"><circle class="trk" cx="50" cy="50" r="44"/><circle class="prg" id="hring" cx="50" cy="50" r="44" stroke-dasharray="${RC}" stroke-dashoffset="${(RC * (1 - clamp(frac, 0, 1))).toFixed(1)}"/></svg><div class="rt"><b class="disp" id="htime">${main}</b><small id="hsmall">${small}</small></div></div>`;
}
const relIn = (min) =>
  min < 60 ? `in ${Math.max(1, Math.round(min))}m` : `in ${dur(min)}`;

function taskRow(t, leave) {
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
function itemRow(it, k) {
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
function dotsFor(k) {
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
const emptyBox = (icon, msg, btn) =>
  `<div class="empty">${ic(icon, 28)}<div>${msg}</div>${btn || ""}</div>`;

/* ================= HOME ================= */
function heroHtml(cur, next, k) {
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
const S0 = 7 * 60,
  SPAN = 16 * 60;
function vHome() {
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

/* ================= CALENDAR ================= */
function dayList(k) {
  const its = itemsOn(k);
  return `<div class="dayhead"><div><h3 class="disp">${k === todayKey() ? "Today" : longDate(k)}</h3><small>${its.length ? `${its.length} ${its.length > 1 ? "items" : "item"}${k === todayKey() ? " · " + longDate(k) : ""}` : "Nothing planned yet"}</small></div><button class="addbtn press" data-act="compose" data-date="${k}">${ic("plus", 16)}Add</button></div><section class="card list">${its.length ? its.map((i) => itemRow(i, k)).join("") : emptyBox("cal", "A clear day. Tap Add to plan something.")}</section>`;
}
function vCal() {
  let h = `<header class="top ${stg(0)}"><div><div class="sub">${MONTHS[pd(S.sel).getMonth()]} ${pd(S.sel).getFullYear()}</div><h1 class="disp h1">Calendar</h1></div><div class="top-actions"><button class="pillbtn press" data-act="todayjump">Today</button><button class="ibtn press" data-act="cmd" aria-label="Search">${ic("search")}</button></div></header>`;
  h += `<div class="${stg(1)}">${segHtml(
    "calView",
    [
      ["month", "Month"],
      ["week", "Week"],
      ["agenda", "Agenda"],
    ],
    S.calView,
  )}</div>`;
  h +=
    S.calView === "month"
      ? vMonth()
      : S.calView === "week"
        ? vWeek()
        : vAgenda();
  return h;
}
function vMonth() {
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
const H0 = 6,
  H1 = 24,
  HH = 56;
function layoutCols(evs) {
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
function vWeek() {
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
function vAgenda() {
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

/* ================= TASKS ================= */
function taskGroups() {
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
function vTasks() {
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
  return `<div class="desk-tasks-split">
  <div class="desk-tasks-nav card ${stg(0)}">
    <div class="thead"><div class="big disp" data-count="${g.open.length}">${g.open.length}</div><p>open tasks<small>${g.today.length} due today or overdue</small></p></div>
    <div style="margin:12px 0">${segHtml(
      "taskTab",
      [
        ["today", "Today", g.today.length],
        ["upcoming", "Upcoming", g.upcoming.length],
        ["anytime", "Anytime", g.anytime.length],
        ["done", "Done", g.done.length],
      ],
      S.taskTab,
    )}</div>
    <div class="desk-tasks-quick">
      <input id="qain-desk" class="inp" placeholder="Quick add task..." autocomplete="off">
      <button class="pillbtn press" data-act="qaadd-desk">${ic("plus", 16)}Add</button>
    </div>
  </div>
  <div class="desk-tasks-content ${stg(2)}">${body}</div>
 </div>`;
}

/* ================= TRACK ================= */
function vTrack() {
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
function vSince() {
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
function vUntil() {
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

/* ================= RENDER ORCHESTRATION ================= */
const VIEWS = { home: vHome, cal: vCal, tasks: vTasks, track: vTrack };
function countUp(root) {
  if (reduced()) return;
  $$("[data-count]", root).forEach((el) => {
    const to = +el.dataset.count,
      t0 = performance.now();
    const f = (t) => {
      const p = clamp((t - t0) / 800, 0, 1),
        e = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(to * e);
      if (p < 1) requestAnimationFrame(f);
    };
    el.textContent = "0";
    requestAnimationFrame(f);
  });
}
function render(o = {}) {
  const v = $("#view"),
    st = v.scrollTop;
  v.innerHTML = VIEWS[S.tab]();
  if (o.anim) {
    v.classList.add("entering");
    setTimeout(() => v.classList.remove("entering"), 1000);
    v.scrollTop = 0;
    countUp(v);
  } else v.scrollTop = st;

  if (
    o.anim &&
    S.tab === "cal" &&
    S.calView === "week" &&
    S.sel === todayKey()
  ) {
    const g = $("#dgrid");
    if (g) {
      const y =
        g.getBoundingClientRect().top -
        v.getBoundingClientRect().top +
        v.scrollTop +
        ((nowMin() - H0 * 60) / 60) * HH;
      v.scrollTop = Math.max(0, y - 220);
    }
  }
  syncDock();
}
function syncDock() {
  const order = ["home", "cal", "tasks", "pages", "track"];
  $("#tabs").style.setProperty("--idx", order.indexOf(S.tab));
  $$("#tabs .tab").forEach((b) =>
    b.classList.toggle("on", b.dataset.tab === S.tab),
  );
  $("#qa").classList.toggle("show", S.tab === "tasks");
  $("#main").classList.toggle("tq", S.tab === "tasks");
}
/* ================= OVERLAYS ================= */
const UI = { sheet: null, page: null, cmd: null };
const TYPELABEL = {
  event: "Event",
  task: "Task",
  reminder: "Reminder",
  birthday: "Birthday",
};
function paintSheet() {
  if (!UI.sheet) return;
  const b = $(".sbody", UI.sheet.el),
    st = UI.sheet.el.querySelector(".sheet").scrollTop;
  b.innerHTML = UI.sheet.render();
  UI.sheet.el.querySelector(".sheet").scrollTop = st;
}
function openSheet(render) {
  closeSheet(true);
  const el = document.createElement("div");
  el.className = "layer";
  el.innerHTML =
    '<div class="bd" data-act="closesheet"></div><div class="sheet" role="dialog"><div class="grab"><i></i></div><div class="sbody"></div></div>';
  $("#overlays").appendChild(el);
  UI.sheet = { el, render };
  paintSheet();
  requestAnimationFrame(() =>
    requestAnimationFrame(() => el.classList.add("on", "open")),
  );
  const sh = $(".sheet", el),
    gr = $(".grab", el);
  let y0 = null,
    dy = 0;
  gr.addEventListener("pointerdown", (e) => {
    y0 = e.clientY;
    dy = 0;
    sh.classList.add("drag");
    gr.setPointerCapture(e.pointerId);
  });
  gr.addEventListener("pointermove", (e) => {
    if (y0 === null) return;
    dy = Math.max(0, e.clientY - y0);
    sh.style.setProperty("--dy", dy + "px");
  });
  const end = () => {
    if (y0 === null) return;
    y0 = null;
    sh.classList.remove("drag");
    if (dy > 110) closeSheet();
    else sh.style.setProperty("--dy", "0px");
  };
  gr.addEventListener("pointerup", end);
  gr.addEventListener("pointercancel", end);
}
function closeSheet(now) {
  const s = UI.sheet;
  if (!s) return;
  UI.sheet = null;
  s.el.classList.remove("open");
  if (now) {
    s.el.remove();
    return;
  }
  setTimeout(() => s.el.remove(), 520);
}
function paintPage() {
  if (!UI.page) return;
  const b = $(".pbody", UI.page.el),
    st = b ? b.scrollTop : 0;
  UI.page.el.innerHTML = UI.page.render();
  const nb = $(".pbody", UI.page.el);
  if (nb) nb.scrollTop = st;
}
function openPage(render) {
  if (UI.page) {
    UI.page.el.remove();
  }
  const el = document.createElement("div");
  el.className = "page";
  $("#overlays").appendChild(el);
  UI.page = { el, render };
  paintPage();
  requestAnimationFrame(() =>
    requestAnimationFrame(() => el.classList.add("open")),
  );
}
function closePage() {
  const p = UI.page;
  if (!p) return;
  UI.page = null;
  S.logId = null;
  p.el.classList.remove("open");
  setTimeout(() => p.el.remove(), 560);
}
function rollIn(id) {
  if (!id || reduced()) return;
  $$('[data-num="' + id + '"]').forEach((el) =>
    el.animate(
      [
        { transform: "translateY(55%)", opacity: 0 },
        { transform: "none", opacity: 1 },
      ],
      { duration: 650, easing: "cubic-bezier(.34,1.5,.5,1)" },
    ),
  );
}
function refreshAll() {
  const id = S.rollId;
  S.rollId = null;
  saveState();
  render();
  if (UI.page) paintPage();
  if (UI.sheet) paintSheet();
  rollIn(id);
}
let toastT,
  toastUndo = null;
function toast(msg, undo) {
  $("#toastmsg").textContent = msg;
  toastUndo = undo || null;
  $("#toastact").style.display = undo ? "" : "none";
  const t = $("#toast");
  t.classList.add("show");
  clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.remove("show"), 4200);
}

/* ================= ITEM DETAIL ================= */
function nextOcc(it) {
  const t = todayKey();
  if (it.type === "task" || !it.repeat) return it.date;
  for (let i = 0; i < 400; i++) {
    const k = addKey(t, i);
    if (occursOn(it, k)) return k;
  }
  return it.date;
}
function itemHtml(id, date) {
  const it = S.items.find((x) => x.id === id);
  if (!it) return "";
  const k = date || it.date,
    isT = it.type === "task",
    rows = [];
  if (isT) {
    rows.push(["Due", it.date ? longDate(it.date) : "No due date"]);
    rows.push([
      "Priority",
      { high: "High", med: "Medium", low: "Low" }[it.pri || "med"],
    ]);
  } else if (it.type === "event") {
    rows.push(["Date", longDate(k)]);
    rows.push([
      "Time",
      `${fmtT(it.start)} – ${fmtT(endOf(it))} (${dur(MIN(endOf(it)) - MIN(it.start))})`,
    ]);
  } else if (it.type === "reminder") {
    rows.push(["Date", longDate(k)]);
    rows.push(["Time", fmtT(it.start)]);
    rows.push([
      "Alert",
      S.prefs.alarm === "loud" ? "Loud alarm" : "Standard notification",
    ]);
  } else rows.push(["Date", longDate(k)]);
  if (it.repeat) rows.push(["Repeats", repLabel(it.repeat)]);
  if (it.loc) rows.push(["Where", esc(it.loc)]);
  if (it.notes) rows.push(["Notes", esc(it.notes)]);
  let h = `<div class="shead" style="--c:${col(it)}"><span class="sbar"></span><div><h2 class="disp">${esc(it.title)}</h2><small>${TYPELABEL[it.type]}${isT && it.done ? " · Completed" : ""}</small></div></div>`;
  h += `<section class="card dl">${rows.map(([a, b]) => `<div class="mrow"><span>${a}</span><span>${b}</span></div>`).join("")}</section>`;
  if (isT) {
    h += `<div class="sbh" style="margin-top:0">Steps</div><section class="card subs">${(it.subs || []).map((s, i) => `<div class="trow ${s.d ? "done" : ""}"><button class="chk" data-act="subcheck" data-id="${it.id}" data-i="${i}" aria-label="Toggle step">${CHK}</button><span class="tbody"><span><span class="ttl">${esc(s.t)}</span></span></span></div>`).join("")}<div class="trow"><input class="inp" id="subin" data-id="${it.id}" placeholder="Add a step and press enter" autocomplete="off"></div></section>`;
  }
  h += `<div class="sgroup">${isT ? `<button class="btn press" data-act="itoggle" data-id="${it.id}">${it.done ? "Reopen task" : "Mark as done"}</button>` : ""}<button class="btn sec press" data-act="iedit" data-id="${it.id}">${ic("edit", 18)}Edit</button></div><div class="sgroup" style="margin-top:10px"><button class="btn dng sm press" data-act="idel" data-id="${it.id}">${ic("trash", 17)}Delete${it.repeat ? " series" : ""}</button></div>`;
  return h;
}
function openItem(id, date) {
  buzz(8);
  openSheet(() => itemHtml(id, date));
}

/* ================= COMPOSER ================= */
let C = null;
const EMOJIS = ["🎯", "🚀", "🎂", "🏖️", "✈️", "🪔", "🎓", "💍", "🏆", "🎉"];
function openComposer(pre = {}) {
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
  openSheet(composerHtml);
  setTimeout(() => {
    const f = $("#f-title");
    f && f.focus({ preventScroll: true });
  }, 450);
}
function fillTimes() {
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
const fld = (l, i) => `<div class="fld"><label>${l}</label>${i}</div>`;
function composerHtml() {
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
function saveComposer() {
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
    const it = S.items.find((x) => x.id === C.editId);
    if (!it) return closeSheet();
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
  closeSheet();
  if (
    ["event", "reminder", "task"].includes(T) &&
    !C.editId &&
    S.tab === "cal"
  ) {
    const d = pd(S.sel);
    S.cal = { y: d.getFullYear(), m: d.getMonth() };
  }
  refreshAll();
}

/* ================= LOG DETAIL ================= */
function logNow(id, date) {
  const l = S.logs.find((x) => x.id === id);
  if (!l) return;
  const last = l.occ[0],
    o = {
      d: date || todayKey(),
      cost: last ? last.cost : 0,
      note: last ? last.note : "",
    };
  l.occ.push(o);
  S.rollId = id;
  buzz([18, 40, 18]);
  toast(`${l.name} logged`, () => {
    l.occ = l.occ.filter((x) => x !== o);
  });
}
function ripple(btn) {
  const r = btn.getBoundingClientRect(),
    s = document.createElement("span"),
    sz = r.width * 2.4;
  s.className = "ripple";
  s.style.cssText = `width:${sz}px;height:${sz}px;left:${r.width / 2 - sz / 2}px;top:${r.height / 2 - sz / 2}px`;
  btn.appendChild(s);
  setTimeout(() => s.remove(), 650);
}
function logPageHtml(id) {
  const l = S.logs.find((x) => x.id === id);
  if (!l) return "";
  const st = logStats(l),
    over = st.since > l.target,
    left = l.target - st.since;
  const bars = [
      ...st.gaps.slice(-6).map((v) => ({ v, cur: false })),
      { v: st.since, cur: true },
    ],
    maxV = Math.max(l.target * 1.35, ...bars.map((b) => b.v), 1);
  let h = `<div class="phead"><button class="ibtn press" data-act="back" aria-label="Back">${ic("chevL")}</button><h2 class="disp" style="--c:var(--k${l.k})">${ic(l.icon, 26)}${esc(l.name)}</h2><button class="ibtn press" data-act="logmenu" data-id="${l.id}" aria-label="More">${ic("more")}</button></div><div class="pbody">`;
  h += `<div class="bigk"><div class="nv disp" data-num="${l.id}">${st.since}</div><p>${st.since === 1 ? "day" : "days"} since last ${esc(l.name.toLowerCase())}</p></div>`;
  h += `<section class="card nextbar"><div class="row"><span>${left > 0 ? `Next due in ${left} ${left === 1 ? "day" : "days"}` : left === 0 ? "Due today" : `Overdue by ${-left} ${-left === 1 ? "day" : "days"}`}</span><span style="color:var(--muted)">${dayLabel(st.next)}</span></div><div class="pb"><i class="${over ? "over" : ""}" style="width:${clamp(st.ratio * 100, 3, 100)}%"></i></div></section>`;
  h += `<div class="sbh" style="margin-top:4px">Metrics and cycle</div><section class="card metrics"><div class="mrow"><span>Last occurred</span><span class="num">${st.last || "Never"}</span></div><div class="mrow"><span>Average gap</span><span>${st.avg} days</span></div><div class="mrow"><span>Target interval</span><span class="step"><button data-act="logt" data-id="${l.id}" data-d="-1" aria-label="Decrease">−</button><b class="num">${l.target} days</b><button data-act="logt" data-id="${l.id}" data-d="1" aria-label="Increase">+</button></span></div><div class="mrow"><span>Next due</span><span class="num">${st.next}</span></div><div class="mrow"><span>Count 30 / 90 days / all</span><span class="num">${st.c30} / ${st.c90} / ${st.all}</span></div>${st.spent ? `<div class="mrow"><span>Total spent</span><span class="num">${st.spent.toFixed(2)}</span></div>` : ""}</section>`;
  h += `<div class="sbh">Gap history</div><section class="card"><div class="chart"><div class="tgt" style="bottom:calc(14px + ${((l.target / maxV) * 100).toFixed(1)}px)"><span>target ${l.target}d</span></div>${bars.map((b, i) => `<div class="col ${b.cur ? "cur" : ""}" style="--i:${i}"><span>${b.v}</span><i style="height:${Math.max(4, (b.v / maxV) * 100)}%"></i></div>`).join("")}</div></section>`;
  h += `<div class="sbh">History · ${l.occ.length}</div><section class="card list">${l.occ.map((o, i) => `<div class="hrow"><div class="d"><b class="num">${o.d}</b><small>${esc(o.note || "No note")}</small></div>${o.cost ? `<span class="cost num">${Number(o.cost).toFixed(1)}</span>` : ""}<button class="del" data-act="occdel" data-id="${l.id}" data-i="${i}" aria-label="Delete entry">${ic("trash", 17)}</button></div>`).join("")}</section></div>`;
  h += `<div class="pfoot"><button class="btn press" data-act="lognow" data-id="${l.id}" id="lnbtn" style="position:relative;overflow:hidden">${ic("check", 20)}Log it now</button><button class="btn sec press" data-act="backdate" data-id="${l.id}">Backdate</button></div>`;
  return h;
}
function openLog(id) {
  S.logId = id;
  buzz(8);
  openPage(() => logPageHtml(id));
}
function cdSheet(id) {
  const c = S.cds.find((x) => x.id === id);
  if (!c) return "";
  const p = cdParts(c),
    days = diffD(todayKey(), c.date);
  return `<div class="shead"><div style="font-size:44px;line-height:1">${c.emoji}</div><div><h2 class="disp">${esc(c.title)}</h2><small>${longDate(c.date)}</small></div></div><section class="card dl"><div class="mrow"><span>${days >= 0 ? "Time left" : "Passed"}</span><span class="num">${days >= 0 ? `${p.d}d ${p.h}h ${p.m}m` : `${-days} days ago`}</span></div><div class="mrow"><span>Weeks</span><span class="num">${(Math.abs(days) / 7).toFixed(1)}</span></div><div class="mrow"><span>Started</span><span class="num">${c.created}</span></div></section><div class="sgroup"><button class="btn dng press" data-act="cddel" data-id="${c.id}">${ic("trash", 18)}Delete countdown</button></div>`;
}
function backdateSheet(id) {
  return `<div class="shead"><div><h2 class="disp">Backdate entry</h2><small>When did it happen?</small></div></div>${fld("Date", `<input class="inp" type="date" id="bd-date" max="${todayKey()}" value="${addKey(todayKey(), -1)}">`)}<div class="sgroup"><button class="btn press" data-act="bdsave" data-id="${id}">${ic("check", 20)}Add entry</button></div>`;
}
/* ================= NATURAL LANGUAGE ================= */
const WDR =
  "(monday|mon|tuesday|tues|tue|wednesday|wed|thursday|thurs|thu|friday|fri|saturday|sat|sunday|sun)";
const MR =
  "(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sept|sep|october|oct|november|nov|december|dec)";
const wdIdx = (s) =>
  ["sun", "mon", "tue", "wed", "thu", "fri", "sat"].indexOf(
    s.slice(0, 3).toLowerCase(),
  );
const moIdx = (s) =>
  MS.findIndex((m) => m.toLowerCase() === s.slice(0, 3).toLowerCase());
function nextWd(idx, from, inclusive) {
  let d = pd(from);
  if (!inclusive) d = addD(d, 1);
  while (d.getDay() !== idx) d = addD(d, 1);
  return ymd(d);
}
function to24(h, m, ap) {
  h = +h;
  m = +(m || 0);
  if (ap) {
    ap = ap.toLowerCase();
    if (ap === "pm" && h < 12) h += 12;
    if (ap === "am" && h === 12) h = 0;
  }
  return HM(h * 60 + m);
}
function addMonths(k, n) {
  const d = pd(k);
  d.setMonth(d.getMonth() + n);
  return ymd(d);
}
function mdKey(mo, day) {
  const t = todayKey(),
    y = pd(t).getFullYear();
  let k = `${y}-${pad(mo + 1)}-${pad(day)}`;
  if (k < t) k = `${y + 1}-${pad(mo + 1)}-${pad(day)}`;
  return k;
}
function parseNL(raw) {
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
const TZ = {
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
const CITY = {
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
const titleCase = (s) => s.replace(/\b\w/g, (c) => c.toUpperCase());
function tryMath(raw) {
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
function createFromParse(p) {
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
      k: 4,
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
  if (p.date && T !== "task") {
    S.sel = p.date;
    const d = pd(p.date);
    S.cal = { y: d.getFullYear(), m: d.getMonth() };
  }
  return {
    msg: `${TYPELABEL[T]} added${p.date ? " · " + dayLabel(p.date, true) : ""}`,
    undo: () => {
      S.items = S.items.filter((x) => x !== e);
    },
  };
}

/* ================= SUPABASE AUTH & CLOUD SHEETS ================= */
function authSheetHtml() {
  const sb = getSupabase();
  const cfg = getSupabaseConfig();
  if (!sb) {
    return (
      '<div class="shead"><div><h2 class="disp">Connect Supabase</h2><small>Enter your Supabase project keys to enable cloud sync</small></div></div>' +
      fld(
        "Supabase Project URL",
        '<input class="inp" id="sb-url" placeholder="https://xyzcompany.supabase.co" value="' +
          esc(cfg.url) +
          '">',
      ) +
      fld(
        "Supabase Anon Key",
        '<input class="inp" id="sb-key" placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." value="' +
          esc(cfg.anonKey) +
          '">',
      ) +
      '<div class="sgroup" style="margin-top:12px"><button class="btn press" data-act="savesbcfg">' +
      ic("check", 20) +
      "Save and Connect</button></div>" +
      '<div style="font-size:12px;color:var(--muted);margin-top:14px;line-height:1.5">Tip: You can also specify <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> in a <code>.env</code> file.</div>'
    );
  }

  if (S.user) {
    return (
      '<div class="shead"><div><h2 class="disp">Account</h2><small>Signed in as ' +
      esc(S.user.email) +
      "</small></div></div>" +
      '<section class="card dl" style="margin-bottom:14px"><div class="mrow"><span>User Email</span><b class="num">' +
      esc(S.user.email) +
      '</b></div><div class="mrow"><span>Status</span><span style="color:var(--accent);font-weight:700">Connected</span></div></section>' +
      '<div class="sgroup"><button class="btn press" data-act="syncnow">' +
      ic("spark", 18) +
      'Sync Now</button><button class="btn dng press" data-act="signout">' +
      ic("x", 18) +
      "Sign Out</button></div>"
    );
  }

  return (
    '<div class="shead"><div><h2 class="disp">Cloud Sync</h2><small>Sign in to sync your data across devices</small></div></div>' +
    fld(
      "Email",
      '<input class="inp" type="email" id="auth-email" placeholder="you@domain.com" autocomplete="email">',
    ) +
    fld(
      "Password",
      '<input class="inp" type="password" id="auth-pass" placeholder="••••••••" autocomplete="current-password">',
    ) +
    '<div class="sgroup" style="margin-top:12px"><button class="btn press" data-act="signin">' +
    ic("check", 20) +
    'Sign In</button><button class="btn sec press" data-act="signup">Create Account</button></div>' +
    '<div class="sgroup" style="margin-top:12px"><button class="btn sec sm press" data-act="editsbcfg">' +
    ic("settings", 16) +
    "Change Project Keys</button></div>"
  );
}

/* ================= COMMAND BAR ================= */
const CMD = { acts: [], sel: 0, key: "", prev: new Set(), math: null };
const EXAMPLES = [
  "dentist next tue 4pm",
  "pay rent fri !high",
  "standup every weekday 9:30",
  "remind me in 20m to stretch",
  "days until dec 25",
  "9am ist in new york",
  "log haircut",
];
function chipsFor(p) {
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
function cmdActions(q) {
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
        key: "q5",
        sec: "Go to",
        icon: "settings",
        title: "Settings and themes",
        sub: "Make it look like a different app",
        run: () => {
          closeCmd();
          openPage(settingsHtml);
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
            logNow(l.id);
            refreshAll();
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
          go("cal", true);
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
          refreshAll();
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
          openItem(i.id, d);
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
            openLog(l.id);
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
          openSheet(() => cdSheet(c.id));
        },
      }),
    );
  found.slice(0, 6).forEach((f, i) => {
    if (i === 0) f.sec = "Matches";
    A.push(f);
  });
  return A;
}
function paintCmd() {
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
  res.classList.toggle("still", key === CMD.key);
  res.innerHTML = h;
  CMD.key = key;
  CMD.prev = chipsNow;
}
function openCmd(pre) {
  if (UI.cmd) return;
  buzz(10);
  const el = document.createElement("div");
  el.className = "layer cmdl";
  el.innerHTML = `<div class="bd" data-act="closecmd"></div><div class="cmd" role="dialog" aria-label="Command bar"><div class="ci">${ic("spark", 22)}<input id="cin" placeholder="Type an event, task, date or question" autocomplete="off" enterkeyhint="go" value="${esc(pre || "")}"><button class="cx press" data-act="closecmd" aria-label="Close">${ic("x", 16)}</button></div><div class="cres" id="cres"></div><div class="cfoot"><span><kbd>↵</kbd>select</span><span><kbd>↑↓</kbd>move</span><span><kbd>esc</kbd>close</span></div></div>`;
  $("#overlays").appendChild(el);
  UI.cmd = el;
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
function closeCmd() {
  const el = UI.cmd;
  if (!el) return;
  UI.cmd = null;
  el.classList.remove("open");
  setTimeout(() => el.remove(), 450);
}

/* ================= SETTINGS ================= */
const THEMES = [
  ["calm", "Calm"],
  ["editorial", "Editorial"],
  ["friendly", "Friendly"],
  ["focus", "Focus"],
];
const tog = (on, act) =>
  `<button class="tg ${on ? "on" : ""}" data-act="${act}" role="switch" aria-checked="${on}"></button>`;
function settingsHtml() {
  const P = S.prefs;
  let h = `<div class="phead"><button class="ibtn press" data-act="back" aria-label="Back">${ic("chevL")}</button><h2 class="disp">Settings</h2></div><div class="pbody">`;
  h += `<div class="ssec">Look and feel</div><section class="card" style="padding:14px 0 4px"><div class="tcards" style="margin:0;padding:2px 16px 10px">${THEMES.map(([id, n]) => `<button class="tcard ${P.theme === id ? "sel" : ""}" data-theme="${id}" data-act="theme" data-t="${id}"><div class="mh"></div><div class="ml"></div><div class="ml s"></div><div class="mn disp">14</div><div class="nm">${n}</div></button>`).join("")}</div><div class="srow"><div><b>Reduce motion</b><small>Simpler transitions, no bounce</small></div>${tog(P.reduce, "tgreduce")}</div><div class="srow col"><div><b>Haptics</b><small>Vibration feedback on taps and check-offs</small></div><div style="margin-top:10px">${segHtml(
    "haptics",
    [
      ["off", "Off"],
      ["subtle", "Subtle"],
      ["full", "Full"],
    ],
    P.haptics,
    "sm",
  )}</div></div><div class="srow col"><div><b>Density</b><small>How tightly lists are packed</small></div><div style="margin-top:10px">${segHtml(
    "density",
    [
      ["comfortable", "Comfortable"],
      ["compact", "Compact"],
    ],
    P.density,
    "sm",
  )}</div></div></section>`;
  h += `<div class="ssec">Calendar</div><section class="card"><div class="srow col"><div><b>Week starts on</b></div><div style="margin-top:10px">${segHtml(
    "week",
    [
      [1, "Monday"],
      [0, "Sunday"],
      [6, "Saturday"],
    ].map(([v, l]) => [String(v), l]),
    String(P.week),
    "sm",
  )}</div></div><div class="srow col"><div><b>Time format</b></div><div style="margin-top:10px">${segHtml(
    "hour",
    [
      ["12h", "12-hour"],
      ["24h", "24-hour"],
    ],
    P.hour,
    "sm",
  )}</div></div></section>`;
  h += `<div class="ssec">Reminders and alarms</div><section class="card"><div class="srow col"><div><b>Default reminder style</b><small>Loud alarm rings until you dismiss it</small></div><div style="margin-top:10px">${segHtml(
    "alarm",
    [
      ["standard", "Standard"],
      ["loud", "Loud alarm"],
    ],
    P.alarm,
    "sm",
  )}</div></div><div class="srow col"><div><b>Snooze duration</b></div><div style="margin-top:10px">${segHtml(
    "snooze",
    [
      ["5", "5 min"],
      ["10", "10 min"],
      ["15", "15 min"],
      ["30", "30 min"],
    ],
    String(P.snooze),
    "sm",
  )}</div></div><button class="srow press" style="width:100%" data-act="notifhealth"><div><b>Notification health</b><small>Check exact alarms, battery and permissions</small></div>${ic("chevR", 18)}</button></section>`;
  h += `<div class="ssec">Cloud Sync (Supabase)</div><section class="card"><div class="srow"><div><b>${S.user ? "Synced with Supabase" : "Offline / Local Only"}</b><small>${S.user ? esc(S.user.email) : "Connect Supabase to sync across devices"}</small></div><button class="addbtn press" data-act="openauth">${S.user ? "Account" : "Connect"}</button></div>${S.user ? '<div class="srow"><div><b>Cloud Sync</b><small>Push local changes to cloud</small></div><button class="addbtn press" data-act="syncnow">Sync now</button></div>' : ""}</section>
<div class="ssec">Your data</div><section class="card"><div class="srow"><div><b>Backup (.json)</b><small>Export or restore all data</small></div><span style="display:flex;gap:8px"><button class="addbtn press" data-act="exportjson">Export</button><button class="addbtn press" data-act="importjson">Import</button></span></div><div class="srow"><div><b>Calendar file (.ics)</b><small>Works with Apple/Google calendar</small></div><span style="display:flex;gap:8px"><button class="addbtn press" data-act="exportics">Export</button><button class="addbtn press" data-act="importics">Import</button></span></div><div class="srow"><div><b>Demo data</b><small>Reset to fresh sample schedule</small></div><button class="addbtn press" data-act="demo">Load</button></div><div class="srow"><div><b style="color:var(--hi)">Clear all data</b><small>Removes events, tasks, logs and countdowns</small></div><button class="addbtn press" style="color:var(--hi)" data-act="clear">Clear</button></div></section>`;
  h += `<div class="about"><b class="disp">Calyx</b>Version 1.0 design mock<br>Made without a server. Zero telemetry.<br><button class="addbtn press" style="margin-top:12px" data-act="welcome">Replay welcome</button></div></div>`;
  return h;
}
function setTheme(t, ev) {
  const apply = () => {
    document.documentElement.dataset.theme = t;
    S.prefs.theme = t;
    savePrefs();
    refreshAll();
  };
  if (t === S.prefs.theme) return;
  if (document.startViewTransition && !reduced()) {
    const x = (ev && ev.clientX) || innerWidth / 2,
      y = (ev && ev.clientY) || innerHeight / 2,
      r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    try {
      const tr = document.startViewTransition(apply);
      tr.ready
        .then(() =>
          document.documentElement.animate(
            {
              clipPath: [
                `circle(0px at ${x}px ${y}px)`,
                `circle(${r}px at ${x}px ${y}px)`,
              ],
            },
            {
              duration: 700,
              easing: "cubic-bezier(.4,0,.2,1)",
              pseudoElement: "::view-transition-new(root)",
            },
          ),
        )
        .catch(() => {});
      return;
    } catch (e) {}
  }
  const h = document.documentElement;
  h.classList.add("tx");
  apply();
  setTimeout(() => h.classList.remove("tx"), 550);
}
function applyPrefs() {
  const h = document.documentElement;
  h.dataset.theme = S.prefs.theme;
  h.dataset.density = S.prefs.density;
  h.classList.toggle("rm", !!S.prefs.reduce);
}
function showWelcome() {
  const el = document.createElement("div");
  el.className = "welcome";
  el.id = "welcome";
  el.innerHTML = `<div class="logo">${ic("hourglass", 28)}</div><h1 class="disp">Every date.<br>Every deadline.</h1><p>Events, tasks, countdowns, logs and pages in one fast place. Everything stays on your phone.</p><div class="lab">Pick a look. You can change it any time.</div><div class="tcards" style="margin:0 -22px;padding:4px 22px 14px">${THEMES.map(([id, n]) => `<button class="tcard ${S.prefs.theme === id ? "sel" : ""}" data-theme="${id}" data-act="theme" data-t="${id}"><div class="mh"></div><div class="ml"></div><div class="ml s"></div><div class="mn disp">14</div><div class="nm">${n}</div></button>`).join("")}</div><button class="btn press" data-act="welcomego">Get started</button>`;
  $("#app").appendChild(el);
}
/* ================= ACTIONS ================= */
function go(t, force) {
  if (t === S.tab && !force) {
    $("#view").scrollTo({ top: 0, behavior: reduced() ? "auto" : "smooth" });
    return;
  }
  S.tab = t;
  buzz(8);
  render({ anim: true });
}
const SEGH = {
  calView: (v) => {
    S.calView = v;
    render({ anim: true });
  },
  taskTab: (v) => {
    S.taskTab = v;
    render();
  },
  trackTab: (v) => {
    S.trackTab = v;
    render();
  },
  filter: (v) => {
    S.filter = v;
    render();
  },
  ctype: (v) => {
    if (C) {
      C.type = v;
      if (v === "task" && !C.date) C.date = todayKey();
      fillTimes();
      paintSheet();
      const f = $("#f-title");
      f && f.focus({ preventScroll: true });
    }
  },
  cpri: (v) => {
    if (C) {
      C.pri = v;
    }
  },
  hour: (v) => {
    S.prefs.hour = v;
    savePrefs();
    refreshAll();
  },
  week: (v) => {
    S.prefs.week = +v;
    savePrefs();
    refreshAll();
  },
  density: (v) => {
    S.prefs.density = v;
    applyPrefs();
    savePrefs();
    refreshAll();
  },
  haptics: (v) => {
    S.prefs.haptics = v;
    savePrefs();
    buzz(30);
  },
  alarm: (v) => {
    S.prefs.alarm = v;
    savePrefs();
  },
  snooze: (v) => {
    S.prefs.snooze = +v;
    savePrefs();
  },
};
function shiftMonth(n) {
  const d = new Date(S.cal.y, S.cal.m + n, 1);
  S.cal = { y: d.getFullYear(), m: d.getMonth() };
  const t = now();
  S.sel =
    d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth()
      ? todayKey()
      : ymd(d);
  render();
  const g = $("#mgrid");
  if (g && !reduced()) g.classList.add(n > 0 ? "sl-l" : "sl-r");
  buzz(6);
}
function slideWeek(n) {
  S.sel = addKey(S.sel, 7 * n);
  render();
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
const ACT = {
  tab(el) {
    if (el.dataset.sub) S.trackTab = el.dataset.sub;
    go(el.dataset.tab);
  },
  cmd() {
    openCmd();
  },
  closecmd() {
    closeCmd();
  },
  cmdrun(el) {
    const a = CMD.acts[+el.dataset.i];
    a && a.run();
  },
  cmdex(el) {
    const i = $("#cin");
    i.value = el.dataset.q;
    CMD.sel = 0;
    paintCmd();
    i.focus();
  },
  settings() {
    buzz(8);
    openPage(settingsHtml);
  },
  back() {
    closePage();
  },
  open(el) {
    openItem(el.dataset.id, el.dataset.date);
  },
  closesheet() {
    closeSheet();
  },
  tcheck(el) {
    const t = S.items.find((i) => i.id === el.dataset.id);
    if (!t) return;
    t.done = !t.done;
    buzz(t.done ? [10, 30, 10] : 8);
    const row = el.closest(".trow");
    row.classList.toggle("done", t.done);
    el.classList.remove("pop");
    void el.offsetWidth;
    el.classList.add("pop");
    const leave =
      row.dataset.leave &&
      S.tab === "tasks" &&
      ((S.taskTab !== "done" && t.done) || (S.taskTab === "done" && !t.done));
    if (t.done && !UI.sheet)
      toast("Task completed", () => {
        t.done = false;
      });
    setTimeout(
      () => {
        if (leave && row.isConnected && !reduced()) {
          row.style.maxHeight = row.offsetHeight + "px";
          void row.offsetHeight;
          row.classList.add("leaving");
          setTimeout(refreshAll, 380);
        } else refreshAll();
      },
      reduced() ? 0 : 520,
    );
  },
  subcheck(el) {
    const t = S.items.find((i) => i.id === el.dataset.id);
    if (!t) return;
    const s = t.subs[+el.dataset.i];
    s.d = !s.d;
    buzz(10);
    const row = el.closest(".trow");
    row.classList.toggle("done", s.d);
    el.classList.remove("pop");
    void el.offsetWidth;
    el.classList.add("pop");
    setTimeout(refreshAll, 420);
  },
  itoggle(el) {
    const t = S.items.find((i) => i.id === el.dataset.id);
    if (!t) return;
    t.done = !t.done;
    buzz(14);
    closeSheet();
    toast(t.done ? "Task completed" : "Task reopened", () => {
      t.done = !t.done;
    });
    refreshAll();
  },
  iedit(el) {
    const it = S.items.find((i) => i.id === el.dataset.id);
    if (!it) return;
    openComposer({
      ...it,
      type: it.type,
      repeat: repKey(it.repeat),
      editId: it.id,
      date: it.date,
      start: it.start || "",
      end: it.end || "",
      pri: it.pri,
      k: it.k,
    });
  },
  idel(el) {
    const i = S.items.findIndex((x) => x.id === el.dataset.id);
    if (i < 0) return;
    const it = S.items[i];
    S.items.splice(i, 1);
    buzz(20);
    closeSheet();
    toast(`Deleted “${it.title}”`, () => {
      S.items.splice(i, 0, it);
    });
    refreshAll();
  },
  seldate(el) {
    const k = el.dataset.date;
    S.sel = k;
    buzz(5);
    $$(".day.sel,.wd.sel").forEach((x) => x.classList.remove("sel"));
    el.classList.add("sel");
    const d = pd(k);
    if (S.calView === "month") {
      if (d.getMonth() !== S.cal.m || d.getFullYear() !== S.cal.y) {
        S.cal = { y: d.getFullYear(), m: d.getMonth() };
        setTimeout(() => {
          render();
          const g = $("#mgrid");
          g &&
            !reduced() &&
            g.classList.add(
              d > pd(ymd(new Date(S.cal.y, S.cal.m, 1))) ? "sl-l" : "sl-r",
            );
        }, 120);
      } else {
        const dl = $("#daylist");
        if (dl) {
          dl.innerHTML = dayList(k);
          if (!reduced())
            dl.animate(
              [
                { opacity: 0.3, transform: "translateY(8px)" },
                { opacity: 1, transform: "none" },
              ],
              { duration: 380, easing: "cubic-bezier(.22,.9,.3,1)" },
            );
        }
      }
    } else setTimeout(() => render(), 160);
  },
  mprev() {
    shiftMonth(-1);
  },
  mnext() {
    shiftMonth(1);
  },
  wprev() {
    slideWeek(-1);
  },
  wnext() {
    slideWeek(1);
  },
  todayjump() {
    const t = now();
    S.sel = todayKey();
    S.cal = { y: t.getFullYear(), m: t.getMonth() };
    buzz(8);
    render({ anim: S.calView === "week" });
  },
  slot(el, e) {
    const r = el.getBoundingClientRect();
    let m = H0 * 60 + ((e.clientY - r.top) / HH) * 60;
    m = clamp(Math.floor(m / 30) * 30, H0 * 60, 22 * 60);
    openComposer({ type: "event", date: S.sel, start: HM(m), end: HM(m + 60) });
  },
  agearlier() {
    S.agendaStart = addKey(S.agendaStart, -7);
    S.agendaDays += 7;
    render();
  },
  agmore() {
    S.agendaDays += 30;
    render();
  },
  compose(el) {
    openComposer({ date: el.dataset.date || undefined });
  },
  newlog() {
    openComposer({ type: "log" });
  },
  newcd() {
    openComposer({ type: "countdown" });
  },
  cdate(el) {
    const v = el.dataset.v,
      t = todayKey();
    C.date =
      v === "today"
        ? t
        : v === "tomorrow"
          ? addKey(t, 1)
          : v === "week"
            ? addKey(t, 7)
            : "";
    paintSheet();
  },
  ccolor(el) {
    C.k = +el.dataset.v;
    paintSheet();
  },
  cemoji(el) {
    C.emoji = el.dataset.v;
    paintSheet();
  },
  cicon(el) {
    C.icon = el.dataset.v;
    paintSheet();
  },
  csave() {
    saveComposer();
  },
  logopen(el) {
    openLog(el.dataset.id);
  },
  lognow(el) {
    ripple(el);
    const id = el.dataset.id;
    $$('[data-num="' + id + '"]').forEach((n) => {
      if (!reduced())
        n.animate(
          [
            { transform: "none", opacity: 1 },
            { transform: "translateY(-55%)", opacity: 0 },
          ],
          { duration: 220, easing: "ease-in", fill: "forwards" },
        );
    });
    setTimeout(
      () => {
        logNow(id);
        refreshAll();
      },
      reduced() ? 0 : 230,
    );
  },
  logt(el) {
    const l = S.logs.find((x) => x.id === el.dataset.id);
    if (!l) return;
    l.target = Math.max(1, l.target + +el.dataset.d);
    buzz(6);
    refreshAll();
  },
  logmenu(el) {
    openSheet(
      () =>
        `<div class="shead"><div><h2 class="disp">Manage log</h2><small>${esc((S.logs.find((l) => l.id === el.dataset.id) || {}).name || "")}</small></div></div><div class="sgroup"><button class="btn dng press" data-act="logdel" data-id="${el.dataset.id}">${ic("trash", 18)}Delete this log</button></div>`,
    );
  },
  logdel(el) {
    const i = S.logs.findIndex((l) => l.id === el.dataset.id);
    if (i < 0) return;
    const l = S.logs[i];
    S.logs.splice(i, 1);
    closeSheet();
    closePage();
    toast(`Deleted ${l.name}`, () => {
      S.logs.splice(i, 0, l);
    });
    refreshAll();
  },
  occdel(el) {
    const l = S.logs.find((x) => x.id === el.dataset.id);
    if (!l) return;
    if (l.occ.length < 2) {
      toast("Keep at least one entry, or delete the log");
      return;
    }
    const o = l.occ.splice(+el.dataset.i, 1)[0];
    buzz(14);
    toast("Entry deleted", () => {
      l.occ.push(o);
    });
    refreshAll();
  },
  backdate(el) {
    openSheet(() => backdateSheet(el.dataset.id));
  },
  bdsave(el) {
    const d = $("#bd-date").value;
    if (!d) return;
    const l = S.logs.find((x) => x.id === el.dataset.id),
      last = l.occ[0],
      o = { d, cost: last ? last.cost : 0, note: last ? last.note : "" };
    l.occ.push(o);
    buzz(14);
    closeSheet();
    toast("Entry added", () => {
      l.occ = l.occ.filter((x) => x !== o);
    });
    refreshAll();
  },
  cdopen(el) {
    buzz(8);
    openSheet(() => cdSheet(el.dataset.id));
  },
  cddel(el) {
    const i = S.cds.findIndex((c) => c.id === el.dataset.id);
    if (i < 0) return;
    const c = S.cds[i];
    S.cds.splice(i, 1);
    closeSheet();
    toast(`Deleted ${c.title}`, () => {
      S.cds.splice(i, 0, c);
    });
    refreshAll();
  },
  qaadd() {
    quickAdd();
  },
  "qaadd-desk"() {
    const i = $("#qain-desk");
    if (!i) return;
    const raw = i.value.trim();
    if (!raw) return;
    const p = parseNL("task " + raw);
    if (!p.title) return;
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
    refreshAll();
  },
  theme(el, e) {
    setTheme(el.dataset.t, e);
    $$(".tcard").forEach((c) =>
      c.classList.toggle("sel", c.dataset.t === el.dataset.t),
    );
    buzz(12);
  },
  tgreduce() {
    S.prefs.reduce = !S.prefs.reduce;
    applyPrefs();
    savePrefs();
    paintPage();
  },
  notifhealth() {
    toast(
      "All good: notifications, exact alarms and battery settings are fine",
    );
  },
  openauth() {
    openSheet(authSheetHtml);
  },
  editsbcfg() {
    openSheet(authSheetHtml);
  },
  async savesbcfg() {
    const url = ($("#sb-url") ? $("#sb-url").value : "").trim();
    const key = ($("#sb-key") ? $("#sb-key").value : "").trim();
    if (!url || !key) {
      toast("Please enter both Supabase URL and Anon key");
      return;
    }
    saveSupabaseConfig(url, key);
    closeSheet();
    toast("Supabase connected!");
    paintPage();
  },
  async signin() {
    const email = ($("#auth-email") ? $("#auth-email").value : "").trim();
    const password = ($("#auth-pass") ? $("#auth-pass").value : "").trim();
    if (!email || !password) return toast("Please enter email and password");
    try {
      const { user } = await signInWithEmail(email, password);
      S.user = user;
      closeSheet();
      toast("Signed in as " + user.email);
      const cloudData = await pullStateFromCloud();
      if (cloudData) {
        if (cloudData.items) S.items = cloudData.items;
        if (cloudData.logs) S.logs = cloudData.logs;
        if (cloudData.cds) S.cds = cloudData.cds;
        if (cloudData.pages) S.pages = cloudData.pages;
        if (cloudData.folders) S.folders = cloudData.folders;
        saveState();
        refreshAll();
      }
      paintPage();
    } catch (err) {
      toast(err.message || "Failed to sign in");
    }
  },
  async signup() {
    const email = ($("#auth-email") ? $("#auth-email").value : "").trim();
    const password = ($("#auth-pass") ? $("#auth-pass").value : "").trim();
    if (!email || !password) return toast("Please enter email and password");
    try {
      const { user } = await signUpWithEmail(email, password);
      S.user = user;
      closeSheet();
      toast("Account created!");
      pushStateToCloud(S).catch(() => {});
      paintPage();
    } catch (err) {
      toast(err.message || "Failed to sign up");
    }
  },
  async signout() {
    await signOutUser();
    S.user = null;
    closeSheet();
    toast("Signed out");
    paintPage();
  },
  async syncnow() {
    toast("Syncing with Supabase...");
    const res = await pushStateToCloud(S);
    if (res.synced) {
      toast("Synced to cloud successfully!");
    } else {
      toast("Sync failed: " + (res.error || res.reason));
    }
  },
  exportjson() {
    exportJsonBackup();
  },
  importjson() {
    triggerImportJson();
  },
  exportics() {
    exportIcsCalendar();
  },
  importics() {
    triggerImportIcs();
  },
  demo() {
    seedAll();
    toast("Demo schedule loaded");
    refreshAll();
  },
  clear() {
    const a = [S.items, S.logs, S.cds];
    S.items = [];
    S.logs = [];
    S.cds = [];
    toast("Everything cleared", () => {
      S.items = a[0];
      S.logs = a[1];
      S.cds = a[2];
    });
    refreshAll();
  },
  welcome() {
    closePage();
    showWelcome();
  },
  welcomego() {
    const w = $("#welcome");
    S.prefs.seen = true;
    savePrefs();
    w.classList.add("out");
    setTimeout(() => w.remove(), 600);
    render({ anim: true });
  },
  toastact() {
    if (toastUndo) {
      toastUndo();
      toastUndo = null;
    }
    $("#toast").classList.remove("show");
    refreshAll();
  },
};
function quickAdd() {
  const i = $("#qain"),
    raw = i.value.trim();
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
  refreshAll();
}

/* ================= EVENT WIRING ================= */
document.addEventListener("click", (e) => {
  const seg = e.target.closest("[data-seg]");
  if (seg) {
    const key = seg.dataset.seg,
      val = seg.dataset.val,
      wrap = seg.closest(".seg"),
      group = wrap || seg.parentElement;
    const btns = $$("[data-seg]", group);
    btns.forEach((b) => b.classList.toggle("on", b === seg));
    if (wrap) wrap.style.setProperty("--i", btns.indexOf(seg));
    buzz(6);
    setTimeout(() => SEGH[key] && SEGH[key](val), wrap && !reduced() ? 190 : 0);
    return;
  }
  const el = e.target.closest("[data-act]");
  if (!el) return;
  const f = ACT[el.dataset.act];
  if (f) f(el, e);
});
document.addEventListener("input", (e) => {
  const t = e.target;
  if (t.id === "cin") {
    CMD.sel = 0;
    paintCmd();
    return;
  }
  const f = t.dataset && t.dataset.f;
  if (f && C) C[f] = t.type === "number" ? +t.value : t.value;
});
document.addEventListener("change", (e) => {
  const t = e.target;
  if (t.dataset && t.dataset.f === "start" && C && C.type === "event") {
    if (!C.end || MIN(C.end) <= MIN(C.start)) {
      C.end = HM(MIN(C.start) + 60);
      const en = $("[data-f=end]");
      if (en) en.value = C.end;
    }
  }
});
document.addEventListener("keydown", (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
    e.preventDefault();
    UI.cmd ? closeCmd() : openCmd();
    return;
  }
  if (e.key === "Escape") {
    if (UI.cmd) closeCmd();
    else if (UI.sheet) closeSheet();
    else if (UI.page) closePage();
    return;
  }
  if (e.target.id === "cin") {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const n = CMD.acts.length;
      if (!n) return;
      CMD.sel = (CMD.sel + (e.key === "ArrowDown" ? 1 : -1) + n) % n;
      $$(".crow").forEach((r, i) => {
        r.classList.toggle("sel", i === CMD.sel);
        const k = r.querySelector("kbd");
        k && k.remove();
        if (i === CMD.sel && CMD.acts[i].key !== "hint")
          r.insertAdjacentHTML("beforeend", "<kbd>↵</kbd>");
      });
      const s = $(".crow.sel");
      s && s.scrollIntoView({ block: "nearest" });
    } else if (e.key === "Enter") {
      e.preventDefault();
      const a = CMD.acts[CMD.sel];
      a && a.run();
    }
  }
  if (
    (e.target.id === "qain" || e.target.id === "qain-desk") &&
    e.key === "Enter"
  ) {
    e.preventDefault();
    if (e.target.id === "qain-desk") ACT["qaadd-desk"]();
    else quickAdd();
  }
  if (e.target.id === "subin" && e.key === "Enter") {
    const v = e.target.value.trim();
    if (v) {
      const t = S.items.find((i) => i.id === e.target.dataset.id);
      t.subs = t.subs || [];
      t.subs.push({ t: v, d: false });
      buzz(8);
      refreshAll();
      const n = $("#subin");
      n && n.focus();
    }
  }
  if (e.target.id === "f-title" && e.key === "Enter") {
    e.preventDefault();
    saveComposer();
  }
});
/* month swipe */
let sx = null,
  sy = null;
document.addEventListener("pointerdown", (e) => {
  if (e.target.closest(".mgrid")) {
    sx = e.clientX;
    sy = e.clientY;
  } else sx = null;
});
document.addEventListener("pointerup", (e) => {
  if (sx === null) return;
  const dx = e.clientX - sx,
    dy = e.clientY - sy;
  sx = null;
  if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.6)
    shiftMonth(dx < 0 ? 1 : -1);
});

/* ================= LIVE CLOCK ================= */
let lastSig = "";
function tick() {
  const n = now();
  const sbt = $("#sbt");
  if (sbt)
    sbt.textContent = fmtT(`${pad(n.getHours())}:${pad(n.getMinutes())}`);
  const nm = nowMin();
  if (S.tab === "home") {
    const { cur, next } = curNext(),
      sig = `${cur ? cur.id : "-"}|${next ? next.id : "-"}|${todayKey()}`;
    if (lastSig && sig !== lastSig && !UI.cmd) {
      render();
    }
    lastSig = sig;
    const hero = $("[data-hero]");
    if (hero) {
      const s = +hero.dataset.s,
        r = $("#hring"),
        tm = $("#htime");
      if (hero.dataset.hero === "cur") {
        const e = +hero.dataset.e,
          left = (e - nm) * 60;
        if (tm) tm.textContent = fmtLeft(left);
        if (r)
          r.setAttribute(
            "stroke-dashoffset",
            (RC * (1 - clamp(left / 60 / (e - s), 0, 1))).toFixed(1),
          );
      } else {
        const until = s - nm;
        if (tm) tm.textContent = fmtLeft(until * 60);
        const h = $("#hrel");
        if (h) h.textContent = relIn(until);
        if (r)
          r.setAttribute(
            "stroke-dashoffset",
            (RC * (1 - clamp(until / 180, 0, 1))).toFixed(1),
          );
      }
    }
    const dn = $("#dsnow");
    if (dn) dn.style.left = clamp(((nm - S0) / SPAN) * 100, 0, 100) + "%";
    const fv = $("#freeval");
    if (fv) fv.textContent = dur(freeLeft());
  }
  const nl = $("#nowline");
  if (nl) nl.style.top = ((nm - H0 * 60) / 60) * HH + "px";
  $$("[data-cd]").forEach((el) => {
    const c = S.cds.find((x) => x.id === el.dataset.cd);
    if (c) {
      const p = cdParts(c);
      el.textContent = `${p.d}d ${pad(p.h)}:${pad(p.m)}:${pad(p.s)}`;
    }
  });
}

/* ================= PAGES (notes, docs, folders) ================= */
Object.assign(ICONS, {
  code: '<path d="m8 7-5 5 5 5M16 7l5 5-5 5M14 4l-4 16"/>',
  folder:
    '<path d="M3 7.500A2.500 2.500 0 0 1 5.500 5H10l2 2.500h6.500A2.500 2.500 0 0 1 21 10v7.500a2.500 2.500 0 0 1-2.500 2.500h-13A2.500 2.500 0 0 1 3 17.500z"/>',
  pin: '<path d="M9 4h6l-1 6 3 3H7l3-3zM12 13v8"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2.500"/><path d="M16 8V6.500A2.500 2.500 0 0 0 13.500 4h-7A2.500 2.500 0 0 0 4 6.500v7A2.500 2.500 0 0 0 6.500 16H8"/>',
  up: '<path d="m6 14 6-6 6 6"/>',
  down: '<path d="m6 10 6 6 6-6"/>',
  bold: '<path d="M7 5h6a3.500 3.500 0 0 1 0 7H7zM7 12h7a3.500 3.500 0 0 1 0 7H7z"/>',
  italic: '<path d="M14 5h-4M14 19h-4M15 5l-6 14"/>',
  strike:
    '<path d="M4 12h16M8 7.500C8.500 6 10 5 12 5c2.500 0 4 1.200 4 3M16 16c0 2-1.800 3-4 3-2.200 0-3.800-1-4-3"/>',
  type: '<path d="M3 19 8 6l5 13M5 15h6M15 19l3.500-8 3 8M16.500 16.500h4"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11M4.500 6h.01M4.500 12h.01M4.500 18h.01"/>',
  quote: '<path d="M7 7h4v5a4 4 0 0 1-4 4M15 7h4v5a4 4 0 0 1-4 4"/>',
  minus: '<path d="M5 12h14"/>',
});
S.pages = [];
S.folders = [];
const PG = { id: null, active: null, mode: "blocks", slash: null, q: "" };
let FS = null;
const B = (t, x = "", extra) => ({ id: uid(), t, x, ...(extra || {}) });
const LISTY = ["ul", "ol", "todo"];
const PEMOJI = [
  "📝",
  "🧭",
  "📚",
  "🌿",
  "🏖️",
  "🔧",
  "✨",
  "💡",
  "📌",
  "🎯",
  "🚀",
  "🧠",
  "🗒️",
  "📅",
  "🧾",
  "🛒",
  "🎨",
  "💼",
  "🏠",
  "🍳",
  "✈️",
  "💪",
  "🎵",
  "📈",
  "🧩",
  "🔥",
  "⭐",
  "🪴",
  "📖",
  "🗂️",
];
const FEMOJI = [
  "💼",
  "🌿",
  "📚",
  "🏠",
  "🎯",
  "🧪",
  "🎨",
  "💰",
  "✈️",
  "🍳",
  "🧠",
  "📁",
];
const PH = {
  p: "Type / for blocks",
  h1: "Heading 1",
  h2: "Heading 2",
  h3: "Heading 3",
  ul: "List item",
  ol: "List item",
  todo: "To-do",
  quote: "Quote",
  callout: "Callout",
  code: "Code",
};
const SLASH = [
  ["p", "Text", "type", "Plain paragraph"],
  ["h1", "Heading 1", "type", "Big section title"],
  ["h2", "Heading 2", "type", "Medium heading"],
  ["h3", "Heading 3", "type", "Small heading"],
  ["ul", "Bulleted list", "list", "Simple bullets"],
  ["ol", "Numbered list", "list", "1, 2, 3"],
  ["todo", "To-do", "check", "Checkbox item"],
  ["quote", "Quote", "quote", "Pull a line out"],
  ["callout", "Callout", "spark", "Highlighted note"],
  ["code", "Code", "code", "Monospaced block"],
  ["hr", "Divider", "minus", "Horizontal rule"],
  ["date", "Today’s date", "cal", "Insert the date"],
];

function seedPages() {
  const f1 = { id: uid(), name: "Work", emoji: "💼", open: true },
    f2 = { id: uid(), name: "Personal", emoji: "🌿", open: true },
    f3 = { id: uid(), name: "Learning", emoji: "📚", open: false };
  S.folders = [f1, f2, f3];
  const P = (title, icon, f, updated, blocks, x) => ({
    id: uid(),
    title,
    icon,
    folder: f ? f.id : null,
    updated,
    blocks,
    fav: false,
    ...x,
  });
  S.pages = [
    P(
      "Welcome to Pages",
      "✨",
      null,
      "2026-10-14",
      [
        B("h1", "Write anything. Organise everything."),
        B(
          "p",
          "Pages are notes, docs and checklists that live right next to your calendar. Tap any line to edit it.",
        ),
        B("callout", "Type / on an empty line to pick a block type."),
        B("h2", "Markdown works as you type"),
        B("ul", "`#`, `##`, `###` then a space makes headings"),
        B("ul", "`-` or `*` then a space starts a bullet list"),
        B("ul", "`1.` starts a numbered list, `[]` starts a to-do"),
        B("ul", "`>` makes a quote, and three backticks start a code block"),
        B(
          "p",
          "Inline styles too: **bold**, *italic*, ~~strike~~, `code` and [links](https://example.com).",
        ),
        B("h2", "Try the checklist"),
        B("todo", "Tap the box to check me off", { d: false }),
        B("todo", "Press enter to add another line", { d: false }),
        B("todo", "Tap the code icon up top to see the raw Markdown", {
          d: false,
        }),
        B(
          "quote",
          "The best time to write it down was when you thought of it.",
        ),
        B("hr"),
        B(
          "code",
          '// code blocks keep their spacing\nfunction nextBigThing() {\n  return "Diwali in 25 days";\n}',
        ),
      ],
      { fav: true },
    ),
    P(
      "Q4 roadmap",
      "🧭",
      f1,
      "2026-10-13",
      [
        B("h2", "Themes"),
        B("ul", "Reliability: cut p95 latency by 30%"),
        B("ul", "Onboarding: first run in under 2 minutes"),
        B("ul", "Growth: a simple referral loop"),
        B("h2", "Milestones"),
        B("todo", "Draft themes with the team", { d: true }),
        B("todo", "Review with Lead on Wednesday", { d: false }),
        B("todo", "Lock scope by 30 Oct", { d: false }),
        B("callout", "Lead wants a one-page summary before the review."),
        B("h2", "Risks"),
        B("ol", "Hiring slips into Q1"),
        B("ol", "The migration window is tight"),
        B("ol", "Design capacity"),
      ],
      { fav: true },
    ),
    P("1-on-1 notes", "📝", f1, "2026-10-07", [
      B("h3", "Wins"),
      B("ul", "Shipped the billing fix a day early"),
      B("ul", "Mentored two new joiners"),
      B("h3", "Topics for next time"),
      B("todo", "Promotion timeline", { d: false }),
      B("todo", "Conference budget", { d: true }),
      B("quote", "Say no to the good so you can say yes to the great."),
    ]),
    P(
      "Goa trip plan",
      "🏖️",
      f2,
      "2026-10-10",
      [
        B("h2", "Packing"),
        B("todo", "Sunscreen and hat", { d: true }),
        B("todo", "Swimwear", { d: false }),
        B("todo", "Power bank", { d: false }),
        B("h2", "Itinerary"),
        B("ol", "Arrive, Palolem sunset"),
        B("ol", "Spice farm and Old Goa"),
        B("ol", "Scooter along the coast"),
        B("ol", "Slow morning, then fly back"),
        B(
          "callout",
          "Flights are not booked yet. See the task “Book Goa flights”.",
        ),
      ],
      { fav: true },
    ),
    P("Home maintenance", "🔧", f2, "2026-10-01", [
      B("h2", "Recurring jobs"),
      B("ul", "Water filter every 60 days"),
      B("ul", "Car wash every 2 weeks"),
      B("ul", "Haircut every 4 weeks"),
      B("p", "These live in **Track**, so I get a nudge when they are due."),
    ]),
    P("Reading list", "📖", f3, "2026-09-28", [
      B("todo", "Designing Data-Intensive Applications", { d: false }),
      B("todo", "The Pragmatic Programmer", { d: true }),
      B("todo", "Staff Engineer", { d: false }),
    ]),
    P("Scratchpad", "🗒️", null, "2026-10-14", [
      B("p", "Ideas for the weekend"),
      B("ul", "Farmers market at 9"),
      B("ul", "Finally fix the bike light"),
      B("ul", "Call mom after the Diwali shopping"),
    ]),
  ];
}
const _seedAll = seedAll;
seedAll = function () {
  _seedAll();
  seedPages();
};

/* ----- helpers ----- */
const curPage = () => S.pages.find((p) => p.id === PG.id);
const pageWords = (p) =>
  p.blocks.reduce(
    (n, b) => n + (b.x.trim() ? b.x.trim().split(/\s+/).length : 0),
    0,
  );
const snip = (p) => {
  const b = p.blocks.find((b) => b.x && b.x.trim() && b.t !== "hr");
  return b
    ? b.x
        .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
        .replace(/[*_`~]/g, "")
        .slice(0, 90)
    : "";
};
function inl(s) {
  const codes = [];
  s = esc(s).replace(/`([^`]+)`/g, (m, c) => {
    codes.push(c);
    return "\u0001" + (codes.length - 1) + "\u0001";
  });
  s = s
    .replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>")
    .replace(/__([^_]+)__/g, "<b>$1</b>")
    .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, "$1<i>$2</i>")
    .replace(/(^|\W)_([^_]+)_(?=\W|$)/g, "$1<i>$2</i>")
    .replace(/~~([^~]+)~~/g, "<s>$1</s>")
    .replace(
      /\[([^\]]+)\]\((https?:[^)\s]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener">$1</a>',
    );
  return s.replace(
    /\u0001(\d+)\u0001/g,
    (m, i) => "<code>" + codes[+i] + "</code>",
  );
}
function mdShortcut(x) {
  let m;
  if ((m = /^(#{1,3}) (.*)$/s.exec(x)))
    return { t: "h" + m[1].length, x: m[2] };
  if ((m = /^[-*+] \[( |x)\] (.*)$/is.exec(x)))
    return { t: "todo", x: m[2], d: m[1].toLowerCase() === "x" };
  if ((m = /^\[( |x)?\] (.*)$/is.exec(x)))
    return { t: "todo", x: m[2], d: (m[1] || "").toLowerCase() === "x" };
  if ((m = /^[-*+] (.*)$/s.exec(x))) return { t: "ul", x: m[1] };
  if ((m = /^\d+[.)] (.*)$/s.exec(x))) return { t: "ol", x: m[1] };
  if ((m = /^> ?💡 ?(.*)$/s.exec(x))) return { t: "callout", x: m[1] };
  if ((m = /^> (.*)$/s.exec(x))) return { t: "quote", x: m[1] };
  if (x === "```") return { t: "code", x: "" };
  if (/^(---|\*\*\*)$/.test(x)) return { hr: true };
  return null;
}
function mdToBlocks(md) {
  const lines = md.replace(/\r/g, "").split("\n"),
    out = [];
  let i = 0;
  while (i < lines.length) {
    const ln = lines[i];
    if (/^\s*```/.test(ln)) {
      const buf = [];
      i++;
      while (i < lines.length && !/^\s*```/.test(lines[i]))
        buf.push(lines[i++]);
      i++;
      out.push(B("code", buf.join("\n")));
      continue;
    }
    if (!ln.trim()) {
      i++;
      continue;
    }
    const sc = mdShortcut(ln.trim());
    if (sc) {
      if (sc.hr) out.push(B("hr"));
      else out.push(B(sc.t, sc.x, sc.d !== undefined ? { d: sc.d } : {}));
    } else out.push(B("p", ln.trim()));
    i++;
  }
  if (!out.length) out.push(B("p", ""));
  return out;
}
function blocksToMd(p) {
  let n = 0;
  const out = [];
  p.blocks.forEach((b, k) => {
    n = b.t === "ol" ? n + 1 : 0;
    const x = b.x;
    out.push(
      {
        h1: "# " + x,
        h2: "## " + x,
        h3: "### " + x,
        ul: "- " + x,
        ol: n + ". " + x,
        todo: `- [${b.d ? "x" : " "}] ${x}`,
        quote: "> " + x,
        callout: "> 💡 " + x,
        code: "```\n" + x + "\n```",
        hr: "---",
      }[b.t] ?? x,
    );
    const nx = p.blocks[k + 1];
    if (nx && !(LISTY.includes(b.t) && nx.t === b.t)) out.push("");
  });
  return out.join("\n");
}

/* ----- tab views ----- */
function pageRow(p) {
  return `<div class="prow"><button class="phit press" data-act="pgopen" data-id="${p.id}"><span class="pe">${p.icon}</span><span class="pt"><b>${esc(p.title || "Untitled")}</b><small>${esc(snip(p)) || "Empty page"}</small></span><span class="pd">${dayLabel(p.updated, true)}</span></button><button class="pmore" data-act="pgmenu" data-id="${p.id}" aria-label="Page options">${ic("more", 18)}</button></div>`;
}
const pinCard = (p) =>
  `<button class="pincard card press" data-act="pgopen" data-id="${p.id}"><span class="pe">${p.icon}</span><b class="disp">${esc(p.title || "Untitled")}</b><small>${esc(snip(p)) || "Empty page"}</small></button>`;
const byUpd = (a, b) => b.updated.localeCompare(a.updated);
function folderHtml(f) {
  const ps = S.pages.filter((p) => p.folder === f.id).sort(byUpd);
  return `<section class="card fold ${f.open ? "open" : ""}"><div class="frow"><button class="fhit press" data-act="foldtog" data-id="${f.id}"><span class="fchev">${ic("chevR", 18)}</span><span class="fe">${f.emoji}</span><b>${esc(f.name)}</b><small>${ps.length}</small></button><button class="pmore" data-act="foldmenu" data-id="${f.id}" aria-label="Folder options">${ic("more", 18)}</button></div><div class="fold-body"><div>${ps.length ? ps.map(pageRow).join("") : `<div class="empty" style="padding:12px 18px 18px">No pages in this folder yet.<br><button class="addbtn press" style="margin-top:10px" data-act="newpage" data-folder="${f.id}">${ic("plus", 16)}Add a page</button></div>`}</div></div></section>`;
}
function pagesBody(q) {
  q = (q || "").trim().toLowerCase();
  if (q) {
    const r = S.pages.filter(
      (p) =>
        (p.title || "").toLowerCase().includes(q) ||
        p.blocks.some((b) => b.x.toLowerCase().includes(q)),
    );
    return r.length
      ? `<div class="sh"><h3 class="disp">${r.length} ${r.length > 1 ? "results" : "result"}</h3></div><section class="card list">${r.map(pageRow).join("")}</section>`
      : emptyBox("search", "No pages match that search.");
  }
  let h = "";
  const pin = S.pages.filter((p) => p.fav).sort(byUpd);
  if (pin.length)
    h += `<div class="sh"><h3 class="disp">Pinned</h3></div><div class="hs">${pin.map(pinCard).join("")}</div>`;
  h += `<div class="sh"><h3 class="disp">Folders</h3><button data-act="newfolder">New folder</button></div>`;
  h += S.folders.length
    ? S.folders.map(folderHtml).join("")
    : `<section class="card">${emptyBox("folder", "Folders keep related pages together. Tap New folder.")}</section>`;
  const un = S.pages.filter((p) => !p.folder).sort(byUpd);
  h +=
    `<div class="sh"><h3 class="disp">Unfiled</h3></div>` +
    (un.length
      ? `<section class="card list">${un.map(pageRow).join("")}</section>`
      : `<section class="card">${emptyBox("note", "Everything is filed away. Nice.")}</section>`);
  return h;
}
function vPages() {
  return `<header class="top ${stg(0)}"><div><div class="sub">${S.pages.length} ${S.pages.length === 1 ? "page" : "pages"} in ${S.folders.length} ${S.folders.length === 1 ? "folder" : "folders"}</div><h1 class="disp h1">Pages</h1></div><button class="addbtn press" data-act="newpage">${ic("plus", 16)}New page</button></header><div class="psearch ${stg(1)}">${ic("search", 18)}<input id="psq" placeholder="Search pages" value="${esc(PG.q)}" autocomplete="off"></div><div id="pbody" class="${stg(2)}">${pagesBody(PG.q)}</div>`;
}
VIEWS.pages = vPages;
const _vh = VIEWS.home;
VIEWS.home = () => {
  const r = [...S.pages].sort(byUpd).slice(0, 4);
  return (
    _vh() +
    (r.length
      ? `<div class="sh ${stg(12)}"><h3 class="disp">Jump back in</h3><button data-act="tab" data-tab="pages">All pages</button></div><div class="hs ${stg(13)}">${r.map(pinCard).join("")}</div>`
      : "")
  );
};

/* ----- editor ----- */
function blockHtml(b, i, num) {
  const act = PG.active === i;
  if (b.t === "hr")
    return `<div class="bw hr ${act ? "act" : ""}" data-i="${i}"><button class="hrb" data-act="blkedit" data-i="${i}" aria-label="Divider"><hr></button></div>`;
  let mk = "";
  if (b.t === "ul") mk = '<span class="mk">•</span>';
  else if (b.t === "ol") mk = `<span class="mk">${num}.</span>`;
  else if (b.t === "todo")
    mk = `<button class="chk" data-act="blktodo" data-i="${i}" aria-label="Toggle to-do">${CHK}</button>`;
  else if (b.t === "callout") mk = '<span class="mk">💡</span>';
  const body = act
    ? `<textarea class="bed t-${b.t}" data-i="${i}" rows="1" spellcheck="false" placeholder="${PH[b.t] || ""}">${esc(b.x)}</textarea>`
    : `<div class="bv t-${b.t}" data-act="blkedit" data-i="${i}" data-ph="${b.t === "p" ? "Type / for blocks" : ""}">${b.t === "code" ? esc(b.x) : inl(b.x)}</div>`;
  return `<div class="bw ${b.t} ${b.d ? "done" : ""} ${act ? "act" : ""}" data-i="${i}">${mk}<div class="bt">${body}</div></div>`;
}
function blocksHtml(p) {
  let n = 0;
  return p.blocks
    .map((b, i) => {
      n = b.t === "ol" ? n + 1 : 0;
      return blockHtml(b, i, n);
    })
    .join("");
}
const barHtml = () =>
  [
    ["blkturn", "type", "Turn into", ""],
    ["fmt", "bold", "Bold", "b"],
    ["fmt", "italic", "Italic", "i"],
    ["fmt", "code", "Inline code", "c"],
    ["fmt", "strike", "Strikethrough", "s"],
    ["blkup", "up", "Move up", ""],
    ["blkdown", "down", "Move down", ""],
    ["blkdup", "copy", "Duplicate", ""],
    ["blkdel", "trash", "Delete block", ""],
    ["blkdone", "check", "Done", ""],
  ]
    .map(
      ([a, i, l, k]) =>
        `<button data-act="${a}" data-k="${k}" aria-label="${l}">${ic(i, 20)}</button>`,
    )
    .join("");
function editorHtml() {
  const p = curPage();
  if (!p) return "";
  const f = S.folders.find((x) => x.id === p.folder),
    md = PG.mode === "md";
  return `<div class="phead"><button class="ibtn press" data-act="back" aria-label="Back">${ic("chevL")}</button><button class="fchip press" data-act="pgmove">${ic("folder", 16)}<span>${f ? esc(f.emoji + " " + f.name) : "Unfiled"}</span></button><span style="flex:1"></span><button class="ibtn press ${md ? "on" : ""}" data-act="pgmode" aria-label="Toggle Markdown view">${ic("code", 20)}</button><button class="ibtn press" data-act="pgmore" aria-label="More">${ic("more")}</button></div><div class="pbody" id="edbody"><div class="ptitle"><button class="pemoji press" data-act="pgemoji" aria-label="Change icon">${p.icon}</button><textarea id="pgtitle" rows="1" placeholder="Untitled" spellcheck="false">${esc(p.title)}</textarea></div><div class="pmeta">Edited ${dayLabel(p.updated).toLowerCase()} · <span id="wc">${pageWords(p)} words</span></div>${md ? `<div class="mdhint">${ic("code", 16)}Raw Markdown. Edits convert to blocks as you type.</div><textarea id="mdraw" class="mdraw" spellcheck="false">${esc(blocksToMd(p))}</textarea>` : `<div id="blocks">${blocksHtml(p)}</div><button class="addblk press" data-act="blkadd">${ic("plus", 16)}Add a block</button>`}<div style="height:40px"></div></div><div class="edbar ${!md && PG.active !== null ? "show" : ""}" id="edbar">${barHtml()}</div><div class="slash" id="slash"></div>`;
}
const autosize = (t) => {
  t.style.height = "auto";
  t.style.height = t.scrollHeight + "px";
};
const autosizeAll = () => $$("#edbody textarea").forEach(autosize);
const touchPage = () => {
  const p = curPage();
  if (p) p.updated = todayKey();
};
const updWc = () => {
  const p = curPage(),
    w = $("#wc");
  if (p && w) w.textContent = pageWords(p) + " words";
};
function renderBlocks(fi, caret) {
  const p = curPage(),
    el = $("#blocks");
  if (!p || !el) return;
  el.innerHTML = blocksHtml(p);
  $("#edbar").classList.toggle("show", PG.active !== null);
  autosizeAll();
  if (fi != null) {
    const t = $(`#blocks textarea[data-i="${fi}"]`);
    if (t) {
      t.focus({ preventScroll: true });
      const c = caret == null ? t.value.length : caret;
      t.setSelectionRange(c, c);
      t.scrollIntoView({
        block: "center",
        behavior: reduced() ? "auto" : "smooth",
      });
    }
  }
  updWc();
}
const _pp = paintPage;
paintPage = function () {
  _pp();
  if (PG.id) setTimeout(autosizeAll, 30);
};
const _cp = closePage;
closePage = function () {
  if (PG.id) {
    const p = curPage();
    if (
      p &&
      !p.title.trim() &&
      p.blocks.every((b) => !b.x.trim() && b.t !== "hr")
    )
      S.pages = S.pages.filter((x) => x !== p);
    PG.id = null;
    PG.active = null;
    PG.slash = null;
  }
  _cp();
  setTimeout(() => render(), 60);
};
function openPageEditor(id, focusTitle) {
  PG.id = id;
  PG.active = null;
  PG.mode = "blocks";
  PG.slash = null;
  buzz(8);
  openPage(editorHtml);
  setTimeout(autosizeAll, 80);
  const p = curPage();
  if (p && !p.title && p.blocks.length <= 1 && !p.blocks[0].x)
    setTimeout(() => {
      if (focusTitle) {
        const t = $("#pgtitle");
        t && t.focus();
      } else {
        PG.active = 0;
        renderBlocks(0);
      }
    }, 540);
}
function newPage(folderId, title) {
  const p = {
    id: uid(),
    title: title || "",
    icon: "📄",
    folder: folderId || null,
    updated: todayKey(),
    blocks: [B("p", "")],
    fav: false,
  };
  S.pages.push(p);
  const f = S.folders.find((x) => x.id === folderId);
  if (f) f.open = true;
  render();
  openPageEditor(p.id, !title);
}
function slashMenu(x) {
  const el = $("#slash");
  if (!el) return;
  const m =
    PG.mode === "blocks" && x && x[0] === "/" && !/\s/.test(x)
      ? x.slice(1).toLowerCase()
      : null;
  if (m === null) {
    PG.slash = null;
    el.classList.remove("show");
    return;
  }
  const list = SLASH.filter(
    (s) => s[1].toLowerCase().includes(m) || s[0].startsWith(m),
  );
  PG.slash = list;
  el.innerHTML = list.length
    ? list
        .map(
          (s, i) =>
            `<button class="sl ${i === 0 ? "sel" : ""}" data-act="slashpick" data-t="${s[0]}"><span class="si">${ic(s[2], 18)}</span><span><b>${s[1]}</b><small>${s[3]}</small></span></button>`,
        )
        .join("")
    : `<div class="empty" style="padding:14px">No blocks match</div>`;
  el.classList.add("show");
}
function pickSlash(t) {
  const p = curPage(),
    i = PG.active,
    b = p && p.blocks[i];
  if (!b) return;
  PG.slash = null;
  $("#slash").classList.remove("show");
  touchPage();
  if (t === "date") {
    const n = now();
    b.x = `${DS[n.getDay()]} ${n.getDate()} ${MS[n.getMonth()]} ${n.getFullYear()}`;
    b.t = "p";
    renderBlocks(i);
    return;
  }
  if (t === "hr") {
    b.t = "hr";
    b.x = "";
    p.blocks.splice(i + 1, 0, B("p", ""));
    PG.active = i + 1;
    renderBlocks(i + 1);
    return;
  }
  b.t = t;
  b.x = "";
  if (t === "todo") b.d = false;
  buzz(8);
  renderBlocks(i);
}
function blockInput(t) {
  const p = curPage(),
    i = +t.dataset.i,
    b = p.blocks[i];
  b.x = t.value;
  touchPage();
  if (b.t === "p") {
    const sc = mdShortcut(b.x);
    if (sc) {
      buzz(8);
      if (sc.hr) {
        b.t = "hr";
        b.x = "";
        p.blocks.splice(i + 1, 0, B("p", ""));
        PG.active = i + 1;
        renderBlocks(i + 1);
        return;
      }
      b.t = sc.t;
      b.x = sc.x;
      if (sc.d !== undefined) b.d = sc.d;
      renderBlocks(i);
      return;
    }
  }
  slashMenu(b.x);
  autosize(t);
  updWc();
}
function focusBlock(i, c) {
  PG.active = i;
  renderBlocks(i, c);
}
function blockKey(e) {
  const t = e.target,
    p = curPage(),
    i = +t.dataset.i,
    b = p.blocks[i];
  if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
    if (PG.slash && PG.slash.length) {
      e.preventDefault();
      pickSlash(PG.slash[0][0]);
      return;
    }
    if (b.t === "code") return;
    e.preventDefault();
    const pos = t.selectionStart,
      before = b.x.slice(0, pos),
      after = b.x.slice(t.selectionEnd),
      listy = LISTY.includes(b.t);
    if (listy && !b.x.trim()) {
      b.t = "p";
      renderBlocks(i);
      return;
    }
    b.x = before;
    const nt = listy ? b.t : "p";
    p.blocks.splice(i + 1, 0, B(nt, after, nt === "todo" ? { d: false } : {}));
    PG.active = i + 1;
    touchPage();
    renderBlocks(i + 1, 0);
    buzz(6);
    return;
  }
  if (e.key === "Backspace" && t.selectionStart === 0 && t.selectionEnd === 0) {
    if (b.t !== "p") {
      e.preventDefault();
      b.t = "p";
      renderBlocks(i, 0);
      return;
    }
    if (i > 0) {
      e.preventDefault();
      const pv = p.blocks[i - 1];
      if (pv.t === "hr") {
        p.blocks.splice(i - 1, 1);
        PG.active = i - 1;
        renderBlocks(i - 1, 0);
        return;
      }
      const j = pv.x.length;
      pv.x += b.x;
      p.blocks.splice(i, 1);
      PG.active = i - 1;
      touchPage();
      renderBlocks(i - 1, j);
    }
    return;
  }
  if (e.key === "ArrowUp" && t.selectionStart === 0 && i > 0) {
    e.preventDefault();
    focusBlock(i - 1);
  } else if (
    e.key === "ArrowDown" &&
    t.selectionStart === t.value.length &&
    i < p.blocks.length - 1
  ) {
    e.preventDefault();
    focusBlock(i + 1, 0);
  }
}
/* ----- sheets ----- */
const menuRow = (a, id, i, l, d) =>
  `<button class="irow press" style="--c:${d ? "var(--hi)" : "var(--accent)"}" data-act="${a}" data-id="${id}"><span style="color:var(--c);display:grid">${ic(i, 20)}</span><span class="tx"><b style="${d ? "color:var(--hi)" : ""}">${l}</b></span></button>`;
function pageMenuHtml(id) {
  const p = S.pages.find((x) => x.id === id);
  if (!p) return "";
  return `<div class="shead"><div class="pe" style="width:54px;height:54px;font-size:30px">${p.icon}</div><div><h2 class="disp">${esc(p.title || "Untitled")}</h2><small>${pageWords(p)} words · edited ${dayLabel(p.updated).toLowerCase()}</small></div></div><section class="card list">${menuRow("pgpin", id, "pin", p.fav ? "Unpin from top" : "Pin to top")}${menuRow("pgmovesheet", id, "folder", "Move to folder")}${menuRow("pgdup", id, "copy", "Duplicate")}${menuRow("pgcopy", id, "code", "Copy as Markdown")}${menuRow("pgdel", id, "trash", "Delete page", true)}</section>`;
}
function moveHtml(id) {
  const p = S.pages.find((x) => x.id === id);
  if (!p) return "";
  const row = (fid, e, n) =>
    `<button class="irow press" style="--c:var(--accent)" data-act="pgmoveto" data-id="${id}" data-f="${fid}"><span style="font-size:22px">${e}</span><span class="tx"><b>${esc(n)}</b></span>${(p.folder || "") === fid ? `<span style="color:var(--accent)">${ic("check", 20)}</span>` : ""}</button>`;
  return `<div class="shead"><div><h2 class="disp">Move to folder</h2><small>${esc(p.title || "Untitled")}</small></div></div><section class="card list">${row("", "📄", "Unfiled")}${S.folders.map((f) => row(f.id, f.emoji, f.name)).join("")}<button class="irow press" style="--c:var(--accent)" data-act="newfolder" data-move="${id}"><span style="color:var(--accent);display:grid">${ic("plus", 22)}</span><span class="tx"><b>New folder…</b></span></button></section>`;
}
const emojiHtml = () =>
  `<div class="shead"><div><h2 class="disp">Page icon</h2><small>Pick something recognisable</small></div></div><div class="emjs">${PEMOJI.map((e) => `<button data-act="pgseticon" data-v="${e}">${e}</button>`).join("")}</div>`;
function folderSheetHtml() {
  const edit = !!FS.id;
  return `<div class="shead"><div><h2 class="disp">${edit ? "Edit folder" : "New folder"}</h2><small>Group related pages together</small></div></div>${fld("Name", `<input class="inp" id="fname" value="${esc(FS.name)}" placeholder="e.g. Projects" autocomplete="off">`)}${fld("Icon", `<div class="emjs">${FEMOJI.map((e) => `<button class="${FS.emoji === e ? "on" : ""}" data-act="fememoji" data-v="${e}">${e}</button>`).join("")}</div>`)}<div class="sgroup"><button class="btn press" data-act="foldsave">${ic("check", 20)}${edit ? "Save folder" : "Create folder"}</button></div>${edit ? `<div class="sgroup" style="margin-top:10px"><button class="btn dng sm press" data-act="folddel">${ic("trash", 17)}Delete folder (pages stay unfiled)</button></div>` : ""}`;
}
const turnHtml = () =>
  `<div class="shead"><div><h2 class="disp">Turn into</h2><small>Keeps your text</small></div></div><section class="card list" style="padding:6px">${SLASH.filter(
    (s) => !["hr", "date"].includes(s[0]),
  )
    .map(
      (s) =>
        `<button class="sl" data-act="turnto" data-t="${s[0]}"><span class="si">${ic(s[2], 18)}</span><span><b>${s[1]}</b><small>${s[3]}</small></span></button>`,
    )
    .join("")}</section>`;

/* ----- actions ----- */
Object.assign(ACT, {
  pgopen(el) {
    openPageEditor(el.dataset.id);
  },
  newpage(el) {
    newPage(el.dataset.folder || null);
  },
  pgmenu(el) {
    buzz(8);
    openSheet(() => pageMenuHtml(el.dataset.id));
  },
  pgmore() {
    buzz(8);
    openSheet(() => pageMenuHtml(PG.id));
  },
  pgmove() {
    openSheet(() => moveHtml(PG.id));
  },
  pgmovesheet(el) {
    const id = el.dataset.id;
    openSheet(() => moveHtml(id));
  },
  pgmoveto(el) {
    const p = S.pages.find((x) => x.id === el.dataset.id),
      f = el.dataset.f || null;
    if (!p) return;
    p.folder = f;
    const fo = S.folders.find((x) => x.id === f);
    if (fo) fo.open = true;
    buzz(12);
    closeSheet();
    toast(fo ? `Moved to ${fo.name}` : "Moved to Unfiled");
    refreshAll();
  },
  pgpin(el) {
    const p = S.pages.find((x) => x.id === el.dataset.id);
    if (p) {
      p.fav = !p.fav;
      buzz(10);
      toast(p.fav ? "Pinned to top" : "Unpinned");
      refreshAll();
    }
  },
  pgdup(el) {
    const p = S.pages.find((x) => x.id === el.dataset.id);
    if (!p) return;
    const c = {
      ...p,
      id: uid(),
      title: (p.title || "Untitled") + " copy",
      fav: false,
      updated: todayKey(),
      blocks: p.blocks.map((b) => ({ ...b, id: uid() })),
    };
    S.pages.push(c);
    closeSheet();
    toast("Page duplicated", () => {
      S.pages = S.pages.filter((x) => x !== c);
    });
    refreshAll();
  },
  pgcopy(el) {
    const p = S.pages.find((x) => x.id === el.dataset.id);
    closeSheet();
    try {
      navigator.clipboard.writeText(blocksToMd(p)).then(
        () => toast("Markdown copied"),
        () => toast("Copy is not available here"),
      );
    } catch (e) {
      toast("Copy is not available here");
    }
  },
  pgdel(el) {
    const i = S.pages.findIndex((x) => x.id === el.dataset.id);
    if (i < 0) return;
    const p = S.pages[i];
    S.pages.splice(i, 1);
    buzz(20);
    closeSheet();
    if (PG.id === p.id) closePage();
    toast(`Deleted “${p.title || "Untitled"}”`, () => {
      S.pages.splice(i, 0, p);
    });
    refreshAll();
  },
  pgemoji() {
    openSheet(emojiHtml);
  },
  pgseticon(el) {
    const p = curPage();
    if (!p) return;
    p.icon = el.dataset.v;
    touchPage();
    closeSheet();
    const b = $(".pemoji");
    if (b) b.textContent = p.icon;
    buzz(8);
  },
  pgmode() {
    PG.mode = PG.mode === "md" ? "blocks" : "md";
    PG.active = null;
    PG.slash = null;
    buzz(8);
    paintPage();
    const m = $("#mdraw");
    if (m) autosize(m);
  },
  foldtog(el) {
    const f = S.folders.find((x) => x.id === el.dataset.id);
    if (!f) return;
    f.open = !f.open;
    el.closest(".fold").classList.toggle("open", f.open);
    buzz(6);
  },
  newfolder(el) {
    FS = {
      id: null,
      name: "",
      emoji: "📁",
      moveId: (el && el.dataset.move) || null,
    };
    openSheet(folderSheetHtml);
    setTimeout(() => {
      const n = $("#fname");
      n && n.focus();
    }, 480);
  },
  foldmenu(el) {
    const f = S.folders.find((x) => x.id === el.dataset.id);
    if (!f) return;
    FS = { id: f.id, name: f.name, emoji: f.emoji };
    openSheet(folderSheetHtml);
  },
  fememoji(el) {
    FS.emoji = el.dataset.v;
    paintSheet();
  },
  foldsave() {
    const name = FS.name.trim();
    if (!name) {
      const n = $("#fname");
      n.classList.remove("err");
      void n.offsetWidth;
      n.classList.add("err");
      n.focus();
      buzz(30);
      return;
    }
    if (FS.id) {
      const f = S.folders.find((x) => x.id === FS.id);
      f.name = name;
      f.emoji = FS.emoji;
      toast("Folder saved");
    } else {
      const f = { id: uid(), name, emoji: FS.emoji, open: true };
      S.folders.push(f);
      if (FS.moveId) {
        const p = S.pages.find((x) => x.id === FS.moveId);
        if (p) p.folder = f.id;
      }
      toast("Folder created", () => {
        S.folders = S.folders.filter((x) => x !== f);
        S.pages.forEach((p) => {
          if (p.folder === f.id) p.folder = null;
        });
      });
    }
    buzz(14);
    closeSheet();
    refreshAll();
  },
  folddel() {
    const f = S.folders.find((x) => x.id === FS.id);
    if (!f) return;
    const moved = S.pages.filter((p) => p.folder === f.id);
    moved.forEach((p) => (p.folder = null));
    S.folders = S.folders.filter((x) => x !== f);
    closeSheet();
    toast(`Deleted folder ${f.name}`, () => {
      S.folders.push(f);
      moved.forEach((p) => (p.folder = f.id));
    });
    refreshAll();
  },
  blkedit(el, e) {
    if (e && e.target.closest("a")) return;
    const i = +el.dataset.i;
    PG.active = i;
    renderBlocks(i);
  },
  blktodo(el) {
    const p = curPage(),
      b = p.blocks[+el.dataset.i];
    b.d = !b.d;
    touchPage();
    buzz(b.d ? [10, 30, 10] : 8);
    el.closest(".bw").classList.toggle("done", b.d);
    el.classList.remove("pop");
    void el.offsetWidth;
    el.classList.add("pop");
  },
  blkadd() {
    const p = curPage(),
      last = p.blocks[p.blocks.length - 1];
    let i = p.blocks.length - 1;
    if (!last || last.t !== "p" || last.x) {
      p.blocks.push(B("p", ""));
      i = p.blocks.length - 1;
    }
    PG.active = i;
    renderBlocks(i);
    buzz(6);
  },
  blkturn() {
    openSheet(turnHtml);
  },
  turnto(el) {
    const p = curPage(),
      b = p.blocks[PG.active];
    if (b) {
      b.t = el.dataset.t;
      if (b.t === "todo" && b.d === undefined) b.d = false;
      touchPage();
    }
    buzz(8);
    closeSheet();
    renderBlocks(PG.active);
  },
  fmt(el) {
    const t = $("#blocks textarea");
    if (!t) return;
    const m = { b: "**", i: "*", c: "`", s: "~~" }[el.dataset.k],
      s = t.selectionStart,
      e = t.selectionEnd,
      v = t.value;
    t.value = v.slice(0, s) + m + v.slice(s, e) + m + v.slice(e);
    t.focus();
    t.setSelectionRange(s + m.length, (s === e ? s : e) + m.length);
    t.dispatchEvent(new Event("input", { bubbles: true }));
    buzz(5);
  },
  blkup() {
    const p = curPage(),
      i = PG.active;
    if (i > 0) {
      [p.blocks[i - 1], p.blocks[i]] = [p.blocks[i], p.blocks[i - 1]];
      PG.active = i - 1;
      touchPage();
      renderBlocks(i - 1);
      buzz(6);
    }
  },
  blkdown() {
    const p = curPage(),
      i = PG.active;
    if (i < p.blocks.length - 1) {
      [p.blocks[i + 1], p.blocks[i]] = [p.blocks[i], p.blocks[i + 1]];
      PG.active = i + 1;
      touchPage();
      renderBlocks(i + 1);
      buzz(6);
    }
  },
  blkdup() {
    const p = curPage(),
      i = PG.active,
      b = p.blocks[i];
    p.blocks.splice(i + 1, 0, { ...b, id: uid() });
    PG.active = i + 1;
    touchPage();
    renderBlocks(i + 1);
    buzz(8);
  },
  blkdel() {
    const p = curPage(),
      i = PG.active;
    p.blocks.splice(i, 1);
    if (!p.blocks.length) p.blocks.push(B("p", ""));
    PG.active = Math.min(i, p.blocks.length - 1);
    touchPage();
    renderBlocks(PG.active);
    buzz(14);
  },
  blkdone() {
    PG.active = null;
    PG.slash = null;
    $("#slash").classList.remove("show");
    renderBlocks();
    if (document.activeElement && document.activeElement.blur)
      document.activeElement.blur();
  },
  slashpick(el) {
    pickSlash(el.dataset.t);
  },
  clear() {
    const a = [S.items, S.logs, S.cds, S.pages, S.folders];
    S.items = [];
    S.logs = [];
    S.cds = [];
    S.pages = [];
    S.folders = [];
    toast("Everything cleared", () => {
      [S.items, S.logs, S.cds, S.pages, S.folders] = a;
    });
    refreshAll();
  },
});
/* ----- events ----- */
document.addEventListener("input", (e) => {
  const t = e.target;
  if (t.id === "psq") {
    PG.q = t.value;
    const b = $("#pbody");
    if (b) b.innerHTML = pagesBody(PG.q);
    return;
  }
  if (t.id === "fname" && FS) {
    FS.name = t.value;
    return;
  }
  if (!PG.id) return;
  const p = curPage();
  if (!p) return;
  if (t.id === "pgtitle") {
    p.title = t.value;
    touchPage();
    autosize(t);
  } else if (t.id === "mdraw") {
    p.blocks = mdToBlocks(t.value);
    touchPage();
    autosize(t);
    updWc();
  } else if (t.matches && t.matches("#blocks textarea")) blockInput(t);
});
document.addEventListener("keydown", (e) => {
  const t = e.target;
  if (!PG.id || !t.matches) return;
  if (t.matches("#blocks textarea")) blockKey(e);
  else if (t.id === "pgtitle" && e.key === "Enter") {
    e.preventDefault();
    const p = curPage();
    if (!p.blocks.length) p.blocks.push(B("p", ""));
    PG.active = 0;
    renderBlocks(0, 0);
  }
});
document.addEventListener("focusin", (e) => {
  if (PG.id && e.target.id === "pgtitle" && PG.active !== null) {
    PG.active = null;
    PG.slash = null;
    renderBlocks();
  }
});
["pointerdown", "mousedown"].forEach((n) =>
  document.addEventListener(
    n,
    (e) => {
      if (e.target.closest && e.target.closest(".edbar button,.slash button"))
        e.preventDefault();
    },
    { passive: false },
  ),
);
/* command bar integration */
const _ca = cmdActions;
cmdActions = function (q) {
  const raw = q.trim(),
    A = _ca(q);
  if (!raw) {
    A.splice(4, 0, {
      key: "qp",
      icon: "note",
      title: "New page",
      sub: "Notes, docs and checklists",
      run: () => {
        closeCmd();
        newPage();
      },
    });
    return A;
  }
  const low = raw.toLowerCase(),
    pm = /^(page|note|doc)\s+(.+)$/i.exec(raw);
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
};

/* ================= INIT ================= */
function init() {
  loadPrefs();
  const hasState = loadState();
  if (!hasState) {
    seedAll();
    saveState();
  }
  applyPrefs();
  const tabs = [
    ["home", "Home", "home"],
    ["cal", "Calendar", "cal"],
    ["tasks", "Tasks", "tasks"],
    ["pages", "Pages", "note"],
    ["track", "Track", "track"],
  ];
  const tabsEl = $("#tabs");
  if (tabsEl)
    tabsEl.insertAdjacentHTML(
      "beforeend",
      tabs
        .map(
          ([t, l, i]) =>
            `<button class="tab" data-act="tab" data-tab="${t}" aria-label="${l}">${ic(i, 22)}<span>${l}</span></button>`,
        )
        .join(""),
    );
  const fab = $("#fab");
  if (fab) fab.innerHTML = ic("plus", 30);
  const qaBtn = $("#qa button");
  if (qaBtn) qaBtn.innerHTML = ic("plus", 20);

  render({ anim: true });
  setInterval(tick, 1000);
  if (!S.prefs.seen) showWelcome();

  getCurrentUser()
    .then((user) => {
      if (user) {
        S.user = user;
        updateSyncStatus();
        pullStateFromCloud()
          .then((cloudData) => {
            if (cloudData) {
              if (cloudData.items) S.items = cloudData.items;
              if (cloudData.logs) S.logs = cloudData.logs;
              if (cloudData.cds) S.cds = cloudData.cds;
              if (cloudData.pages) S.pages = cloudData.pages;
              if (cloudData.folders) S.folders = cloudData.folders;
              saveState();
              refreshAll();
            }
          })
          .catch(() => {});
      } else {
        updateSyncStatus();
      }
    })
    .catch(() => {});
}
init();
