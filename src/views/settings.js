import { S, savePrefs, applyPrefs, reduced, buzz } from "../state/state.js";
import { ic } from "../utils/icons.js";
import { esc } from "../utils/helpers.js";
import { segHtml } from "../queries/queries.js";
import { getMockDataStats } from "../data/seed.js";

/* ================= SETTINGS ================= */
export const THEMES = [
  ["calm", "Calm"],
  ["editorial", "Editorial"],
  ["friendly", "Friendly"],
  ["focus", "Focus"],
];

export const tog = (on, act) =>
  `<button class="tg ${on ? "on" : ""}" data-act="${act}" role="switch" aria-checked="${on}"></button>`;

let _refreshAllFn = null;
export function setSettingsRefreshFn(fn) {
  _refreshAllFn = fn;
}

export function setTheme(t, ev) {
  const apply = () => {
    document.documentElement.dataset.theme = t;
    S.prefs.theme = t;
    savePrefs();
    if (_refreshAllFn) _refreshAllFn();
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

export function settingsHtml() {
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
  h += `<div class="ssec">Cloud Sync (Supabase)</div><section class="card"><div class="srow"><div><b>${S.user ? "Synced with Supabase" : "Offline / Local Only"}</b><small>${S.user ? esc(S.user.email) : "Connect Supabase to sync across devices"}</small></div><button class="addbtn press" data-act="openauth">${S.user ? "Account" : "Connect"}</button></div>${S.user ? '<div class="srow"><div><b>Cloud Sync</b><small>Push local changes to cloud</small></div><button class="addbtn press" data-act="syncnow">Sync now</button></div>' : ""}</section>`;

  const mockStats = getMockDataStats();
  h += `<div class="ssec">Your data</div><section class="card">
    <div class="srow">
      <div><b>Backup (.json)</b><small>Export or restore all data</small></div>
      <span style="display:flex;gap:8px">
        <button class="addbtn press" data-act="exportjson">Export</button>
        <button class="addbtn press" data-act="importjson">Import</button>
      </span>
    </div>
    <div class="srow">
      <div><b>Calendar file (.ics)</b><small>Works with Apple/Google calendar</small></div>
      <span style="display:flex;gap:8px">
        <button class="addbtn press" data-act="exportics">Export</button>
        <button class="addbtn press" data-act="importics">Import</button>
      </span>
    </div>
    <div class="srow">
      <div>
        <b>Sample data</b>
        <small>${mockStats.total > 0 ? `${mockStats.total} sample entries loaded` : "Starter schedule, notes & habits"}</small>
      </div>
      <span style="display:flex;gap:8px">
        <button class="addbtn press" data-act="loadmock">${mockStats.total > 0 ? "Reload" : "Load"}</button>
        ${mockStats.total > 0 ? `<button class="addbtn press" data-act="unloadmock" style="color:var(--muted)">Unload</button>` : ""}
      </span>
    </div>
    <div class="srow">
      <div><b style="color:var(--hi)">Clear all data</b><small>Removes all items, logs, and notes (local & cloud)</small></div>
      <button class="addbtn press" style="color:var(--hi)" data-act="clear">Clear All</button>
    </div>
  </section>`;
  h += `<div class="about"><b class="disp">Calyx</b>Version 1.0 · Local-first<br>Zero telemetry. Offline ready.<br><button class="addbtn press" style="margin-top:12px" data-act="welcome">Replay welcome</button></div></div>`;
  return h;
}
