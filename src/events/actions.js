import { S, saveState, savePrefs, applyPrefs, getResolvedMode, reduced, buzz, exportJsonBackup, triggerImportJson, exportIcsCalendar, triggerImportIcs } from "../state/state.js";
import { signInWithEmail, signUpWithEmail, signOutUser, pushStateToCloud, pullStateFromCloud, saveSupabaseConfig } from "../supabase.js";
import { $, $$, esc, todayKey, pd, ymd, addKey, uid } from "../utils/helpers.js";
import { ic } from "../utils/icons.js";
import { toast, getToastUndo, clearToastUndo } from "../utils/toast.js";
import { playChime, requestNotificationPermission, sendNotification } from "../utils/audio.js";
import { repKey, seedAll, tk, B, loadMockData, unloadMockData, getMockDataStats } from "../data/seed.js";
import { parseNL } from "../nlp/nlp.js";
import { UI, openSheet, closeSheet, paintSheet, openPage, closePage, paintPage, render, refreshAll, openItem, openLog, cdSheet, backdateSheet, authSheetHtml, showWelcome, ripple, logNow } from "../components/overlays.js";
import { C, openComposer, saveComposer, fillTimes } from "../components/composer.js";
import { CMD, openCmd, closeCmd, paintCmd, quickAdd } from "../components/command-bar.js";
import { dayList, shiftMonth, slideWeek } from "../views/calendar.js";
import { settingsHtml, setTheme, setMode } from "../views/settings.js";
import { PG, FS, setFS, curPage, touchPage, autosize, updWc, renderBlocks, openPageEditor, newPage, pickSlash, blocksToMd, pageMenuHtml, moveHtml, emojiHtml, folderSheetHtml, turnHtml } from "../views/pages.js";
import {
  openAuthModal,
  setAuthMode,
  doSignIn,
  doSignUp,
  doForgotPass,
  doSaveConfig,
  doTestConnection,
  doUseOffline,
  doResetConfig,
  doSignOut,
  doSyncNow,
  togglePasswordVisibility,
} from "../components/auth-modal.js";

/* ================= NAVIGATION ================= */
export function go(t, force) {
  if (t === S.tab && !force) {
    const v = $("#view");
    if (v) v.scrollTo({ top: 0, behavior: reduced() ? "auto" : "smooth" });
    return;
  }
  S.tab = t;
  buzz(8);
  render({ anim: true });
}

/* ================= SEGMENT HANDLERS ================= */
export const SEGH = {
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
  mode: (v, ev) => {
    setMode(v, ev);
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

/* ================= ACTIONS REGISTRY ================= */
export const ACT = {
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
    if (!i) return;
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
    if (row) {
      row.classList.toggle("done", t.done);
      el.classList.remove("pop");
      void el.offsetWidth;
      el.classList.add("pop");
    }
    const leave =
      row &&
      row.dataset.leave &&
      S.tab === "tasks" &&
      ((S.taskTab !== "done" && t.done) || (S.taskTab === "done" && !t.done));
    if (t.done && !UI.sheet)
      toast("Task completed", () => {
        t.done = false;
      });
    setTimeout(
      () => {
        if (leave && row && row.isConnected && !reduced()) {
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
    if (row) {
      row.classList.toggle("done", s.d);
      el.classList.remove("pop");
      void el.offsetWidth;
      el.classList.add("pop");
    }
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
    const t = new Date();
    S.sel = todayKey();
    S.cal = { y: t.getFullYear(), m: t.getMonth() };
    buzz(8);
    render({ anim: S.calView === "week" });
  },
  slot(el, e) {
    const r = el.getBoundingClientRect();
    const H0 = 6, HH = 56;
    let m = H0 * 60 + ((e.clientY - r.top) / HH) * 60;
    m = Math.min(22 * 60, Math.max(H0 * 60, Math.floor(m / 30) * 30));
    const pad = (n) => String(n).padStart(2, "0");
    const HM = (min) => `${pad(((Math.floor(min / 60) % 24) + 24) % 24)}:${pad(((min % 60) + 60) % 60)}`;
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
  cdedit(el) {
    const c = S.cds.find((x) => x.id === el.dataset.id);
    if (!c) return;
    closeSheet();
    openComposer({
      type: "countdown",
      editId: c.id,
      title: c.title,
      date: c.date,
      emoji: c.emoji,
    });
  },
  deskfolder(el) {
    const id = el.dataset.id;
    go("pages");
    const fold = S.folders.find((f) => f.id === id);
    if (fold) {
      fold.open = true;
      saveState();
      render();
      setTimeout(() => {
        const foldEl = document.querySelector(`[data-id="${id}"]`);
        if (foldEl) foldEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }, 80);
    }
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
  quickmode(el, e) {
    const resolved = getResolvedMode();
    const next = resolved === "dark" ? "light" : "dark";
    setMode(next, e);
    buzz(12);
  },
  tgreduce() {
    S.prefs.reduce = !S.prefs.reduce;
    applyPrefs();
    savePrefs();
    paintPage();
  },
  async notifhealth() {
    if (!("Notification" in window)) {
      toast("Notifications not supported in this browser");
      return;
    }
    if (Notification.permission === "granted") {
      playChime(S.prefs.alarm === "loud");
      buzz([40, 80]);
      sendNotification(
        "Calyx Notification Test",
        "Exact alarms and sound alerts are working!"
      );
      toast("Permissions active! Test chime & notification sent");
    } else if (Notification.permission === "denied") {
      toast("Notifications blocked in browser site permissions");
    } else {
      const res = await requestNotificationPermission();
      if (res === "granted") {
        playChime(S.prefs.alarm === "loud");
        buzz([40, 80]);
        sendNotification(
          "Calyx Notifications Enabled",
          "You will receive timely reminders and event alerts!"
        );
        toast("Permission granted! Test chime played");
      } else {
        toast("Notification permission was not granted");
      }
    }
  },
  openauth(el) {
    const initialMode = el?.dataset?.mode;
    openAuthModal(initialMode);
  },
  "auth-tab"(el) {
    const mode = el?.dataset?.mode || "signin";
    setAuthMode(mode);
  },
  "auth-signin"() {
    doSignIn();
  },
  "auth-signup"() {
    doSignUp();
  },
  "auth-forgot"() {
    doForgotPass();
  },
  "auth-testcfg"() {
    doTestConnection();
  },
  "auth-savecfg"() {
    doSaveConfig();
  },
  "auth-resetcfg"() {
    doResetConfig();
  },
  "auth-offline"() {
    doUseOffline();
  },
  "auth-signout"() {
    doSignOut();
  },
  "auth-syncnow"() {
    doSyncNow();
  },
  "auth-togglepass"() {
    togglePasswordVisibility();
  },
  editsbcfg() {
    openAuthModal("config");
  },
  savesbcfg() {
    doSaveConfig();
  },
  signin() {
    doSignIn();
  },
  signup() {
    doSignUp();
  },
  signout() {
    doSignOut();
  },
  syncnow() {
    doSyncNow();
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
  async loadmock() {
    loadMockData();
    saveState();
    refreshAll();
    paintPage();
    buzz(16);
    if (S.user) {
      toast("Mock data loaded & syncing with cloud...");
      try {
        const res = await pushStateToCloud(S);
        if (res.synced) {
          toast("Mock data loaded & synced to cloud!");
        } else {
          toast(`Loaded locally. Cloud warning: ${res.error || res.reason}`);
        }
      } catch (e) {
        toast("Loaded locally");
      }
    } else {
      toast("Sample schedule & notes loaded");
    }
    paintPage();
  },
  async unloadmock() {
    const stats = getMockDataStats();
    if (stats.total === 0) {
      toast("No mock data found to unload");
      return;
    }
    unloadMockData();
    saveState();
    refreshAll();
    paintPage();
    buzz([14, 30, 14]);
    if (S.user) {
      toast(`Unloading ${stats.total} mock items & syncing with cloud...`);
      try {
        const res = await pushStateToCloud(S);
        if (res.synced) {
          toast(`Unloaded ${stats.total} mock items (cleared from cloud sync)`);
        } else {
          toast(`Unloaded locally. Cloud warning: ${res.error || res.reason}`);
        }
      } catch (e) {
        toast(`Unloaded ${stats.total} mock items locally`);
      }
    } else {
      toast(`Unloaded ${stats.total} mock items from device`);
    }
    paintPage();
  },
  demo() {
    this.loadmock();
  },
  async clear() {
    const a = [S.items, S.logs, S.cds, S.pages, S.folders];
    S.items = [];
    S.logs = [];
    S.cds = [];
    S.pages = [];
    S.folders = [];
    saveState();
    refreshAll();
    paintPage();
    buzz(24);
    if (S.user) {
      pushStateToCloud(S).catch(() => {});
    }
    toast("Everything cleared & cloud synced", () => {
      [S.items, S.logs, S.cds, S.pages, S.folders] = a;
      saveState();
      refreshAll();
      paintPage();
      if (S.user) pushStateToCloud(S).catch(() => {});
    });
  },
  welcome() {
    closePage();
    showWelcome();
  },
  welcomego() {
    const w = $("#welcome");
    S.prefs.seen = true;
    savePrefs();
    if (w) {
      w.classList.add("out");
      setTimeout(() => w.remove(), 600);
    }
    render({ anim: true });
  },
  toastact() {
    const undo = getToastUndo();
    if (undo) {
      undo();
      clearToastUndo();
    }
    const t = $("#toast");
    if (t) t.classList.remove("show");
    refreshAll();
  },

  /* Pages actions */
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
    const foldEl = el.closest(".fold");
    if (foldEl) foldEl.classList.toggle("open", f.open);
    buzz(6);
  },
  newfolder(el) {
    setFS({
      id: null,
      name: "",
      emoji: "📁",
      moveId: (el && el.dataset.move) || null,
    });
    openSheet(folderSheetHtml);
    setTimeout(() => {
      const n = $("#fname");
      n && n.focus();
    }, 480);
  },
  foldmenu(el) {
    const f = S.folders.find((x) => x.id === el.dataset.id);
    if (!f) return;
    setFS({ id: f.id, name: f.name, emoji: f.emoji });
    openSheet(folderSheetHtml);
  },
  fememoji(el) {
    if (FS) {
      FS.emoji = el.dataset.v;
      paintSheet();
    }
  },
  foldsave() {
    if (!FS) return;
    const name = FS.name.trim();
    if (!name) {
      const n = $("#fname");
      if (n) {
        n.classList.remove("err");
        void n.offsetWidth;
        n.classList.add("err");
        n.focus();
      }
      buzz(30);
      return;
    }
    if (FS.id) {
      const f = S.folders.find((x) => x.id === FS.id);
      if (f) {
        f.name = name;
        f.emoji = FS.emoji;
      }
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
    if (!FS) return;
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
    const p = curPage();
    if (!p) return;
    const b = p.blocks[+el.dataset.i];
    b.d = !b.d;
    touchPage();
    buzz(b.d ? [10, 30, 10] : 8);
    const bw = el.closest(".bw");
    if (bw) bw.classList.toggle("done", b.d);
    el.classList.remove("pop");
    void el.offsetWidth;
    el.classList.add("pop");
  },
  blkadd() {
    const p = curPage();
    if (!p) return;
    const last = p.blocks[p.blocks.length - 1];
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
    const p = curPage();
    const b = p && p.blocks[PG.active];
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
    if (p && i > 0) {
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
    if (p && i < p.blocks.length - 1) {
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
      b = p && p.blocks[i];
    if (p && b) {
      p.blocks.splice(i + 1, 0, { ...b, id: uid() });
      PG.active = i + 1;
      touchPage();
      renderBlocks(i + 1);
      buzz(8);
    }
  },
  blkdel() {
    const p = curPage(),
      i = PG.active;
    if (!p) return;
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
    const sl = $("#slash");
    if (sl) sl.classList.remove("show");
    renderBlocks();
    if (document.activeElement && document.activeElement.blur)
      document.activeElement.blur();
  },
  slashpick(el) {
    pickSlash(el.dataset.t);
  },
};
