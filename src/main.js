import {
  getCurrentUser,
  pullStateFromCloud,
  subscribeToStateChanges,
} from "./supabase.js";
import { S, loadPrefs, savePrefs, applyPrefs, loadState, saveState, updateSyncStatus, setStateRefreshFn, DATA_KEY, buzz } from "./state/state.js";
import { setAlarmCallbacks, checkAlarms } from "./utils/audio.js";
import { seedAll } from "./data/seed.js";
import { ic } from "./utils/icons.js";
import { toast } from "./utils/toast.js";
import { $, $$, pad, clamp, now, nowMin, todayKey } from "./utils/helpers.js";
import { curNext, freeLeft, cdParts, fmtT, fmtLeft, dur, RC } from "./queries/queries.js";
import { S0, SPAN, relIn } from "./views/home.js";
import { H0, HH, setCalRenderFn } from "./views/calendar.js";
import { setSettingsRefreshFn } from "./views/settings.js";
import { setPagesOverlayCallbacks } from "./views/pages.js";
import {
  UI,
  openPage,
  closePage,
  paintPage,
  openSheet,
  closeSheet,
  paintSheet,
  render,
  refreshAll,
  openItem,
  openLog,
  cdSheet,
  logNow,
  showWelcome,
} from "./components/overlays.js";
import { setComposerOverlayCallbacks } from "./components/composer.js";
import { setCmdCallbacks } from "./components/command-bar.js";
import { go } from "./events/actions.js";
import { initEventListeners } from "./events/listeners.js";

/* ================= HOOK CROSS-MODULE CALLBACKS ================= */
setStateRefreshFn(refreshAll);
setSettingsRefreshFn(refreshAll);
setCalRenderFn(() => render());
setAlarmCallbacks({ saveState, refreshAll, fmtT, buzz, getItems: () => S.items, getPrefs: () => S.prefs });
setComposerOverlayCallbacks({ openSheet, closeSheet, paintSheet, refreshAll });
setCmdCallbacks({ openPage, openSheet, openItem, openLog, cdSheet, logNow, refreshAll, go, UI });
setPagesOverlayCallbacks({ openPage, closePage, paintPage, openSheet, closeSheet, renderApp: () => render() });

/* ================= CLOCK TICKER ================= */
let lastSig = "";
export function tick() {
  checkAlarms();
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

/* ================= REALTIME SYNC ================= */
let stopRealtimeSync = null;
export function setupRealtimeSync() {
  if (!S.user) return;
  if (stopRealtimeSync) {
    stopRealtimeSync();
    stopRealtimeSync = null;
  }
  stopRealtimeSync = subscribeToStateChanges((cloudData) => {
    if (!cloudData) return;
    let changed = false;
    if (
      cloudData.items &&
      JSON.stringify(cloudData.items) !== JSON.stringify(S.items)
    ) {
      S.items = cloudData.items;
      changed = true;
    }
    if (
      cloudData.logs &&
      JSON.stringify(cloudData.logs) !== JSON.stringify(S.logs)
    ) {
      S.logs = cloudData.logs;
      changed = true;
    }
    if (
      cloudData.cds &&
      JSON.stringify(cloudData.cds) !== JSON.stringify(S.cds)
    ) {
      S.cds = cloudData.cds;
      changed = true;
    }
    if (
      cloudData.pages &&
      JSON.stringify(cloudData.pages) !== JSON.stringify(S.pages)
    ) {
      S.pages = cloudData.pages;
      changed = true;
    }
    if (
      cloudData.folders &&
      JSON.stringify(cloudData.folders) !== JSON.stringify(S.folders)
    ) {
      S.folders = cloudData.folders;
      changed = true;
    }
    if (cloudData.prefs) {
      Object.assign(S.prefs, cloudData.prefs);
      savePrefs();
      applyPrefs();
      changed = true;
    }
    if (changed) {
      try {
        localStorage.setItem(
          DATA_KEY,
          JSON.stringify({
            items: S.items,
            logs: S.logs,
            cds: S.cds,
            pages: S.pages,
            folders: S.folders,
            prefs: S.prefs,
          }),
        );
      } catch (e) {}
      refreshAll();
      toast("Synced from another device");
    }
  });
}

/* ================= APP INITIALIZATION ================= */
export function init() {
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
  if (tabsEl && !tabsEl.querySelector(".tab"))
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

  initEventListeners();
  render({ anim: true });
  setInterval(tick, 1000);
  if (!S.prefs.seen) showWelcome();

  // Register Service Worker for offline PWA
  if (
    "serviceWorker" in navigator &&
    window.location.protocol.startsWith("http")
  ) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        console.warn("ServiceWorker registration failed:", err);
      });
    });
  }

  getCurrentUser()
    .then((user) => {
      if (user) {
        S.user = user;
        updateSyncStatus();
        setupRealtimeSync();
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
