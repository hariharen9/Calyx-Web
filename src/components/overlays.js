import { S, saveState, reduced, buzz, updateDeskBadges, updateDeskTopbar } from "../state/state.js";
import { getSupabase, getSupabaseConfig } from "../supabase.js";
import { $, $$, esc, todayKey, nowMin, diffD, clamp, pad, MIN, addKey } from "../utils/helpers.js";
import { ic, TYPELABEL } from "../utils/icons.js";
import { toast } from "../utils/toast.js";
import { logStats, cdParts, longDate, fmtT, dur, col, CHK, endOf, dayLabel } from "../queries/queries.js";
import { repLabel } from "../data/seed.js";
import { fld } from "./composer.js";
import { vHome } from "../views/home.js";
import { vCal, H0, HH } from "../views/calendar.js";
import { vTasks } from "../views/tasks.js";
import { vTrack } from "../views/track.js";
import { vPages, PG, curPage, autosizeAll } from "../views/pages.js";
import { THEMES } from "../views/settings.js";
import { authModalHtml } from "./auth-modal.js";

/* ================= OVERLAYS ================= */
export const UI = { sheet: null, page: null, cmd: null };

export const VIEWS = {
  home: vHome,
  cal: vCal,
  tasks: vTasks,
  track: vTrack,
  pages: vPages,
};

export function paintSheet() {
  if (!UI.sheet) return;
  const b = $(".sbody", UI.sheet.el),
    st = UI.sheet.el.querySelector(".sheet").scrollTop;
  b.innerHTML = UI.sheet.render();
  UI.sheet.el.querySelector(".sheet").scrollTop = st;
}

export function openSheet(render) {
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

export function closeSheet(now) {
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

export function paintPage() {
  if (!UI.page) return;
  const b = $(".pbody", UI.page.el),
    st = b ? b.scrollTop : 0;
  UI.page.el.innerHTML = UI.page.render();
  const nb = $(".pbody", UI.page.el);
  if (nb) nb.scrollTop = st;
  if (PG.id) setTimeout(autosizeAll, 30);
}

export function openPage(render) {
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

export function closePage() {
  const p = UI.page;
  if (!p) return;
  if (PG.id) {
    const page = curPage();
    if (
      page &&
      !page.title.trim() &&
      page.blocks.every((b) => !b.x.trim() && b.t !== "hr")
    )
      S.pages = S.pages.filter((x) => x !== page);
    PG.id = null;
    PG.active = null;
    PG.slash = null;
  }
  UI.page = null;
  S.logId = null;
  p.el.classList.remove("open");
  setTimeout(() => p.el.remove(), 560);
  setTimeout(() => render(), 60);
}

export function rollIn(id) {
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

export function refreshAll() {
  const id = S.rollId;
  S.rollId = null;
  saveState();
  render();
  if (UI.page) paintPage();
  if (UI.sheet) paintSheet();
  rollIn(id);
}

export function countUp(root) {
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

export function render(o = {}) {
  const v = $("#view");
  if (!v) return;
  const st = v.scrollTop;
  if (VIEWS[S.tab]) {
    v.innerHTML = VIEWS[S.tab]();
  }
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

export function syncDock() {
  const order = ["home", "cal", "tasks", "pages", "track"];
  const tabs = $("#tabs");
  if (tabs) tabs.style.setProperty("--idx", order.indexOf(S.tab));
  $$("#tabs .tab").forEach((b) =>
    b.classList.toggle("on", b.dataset.tab === S.tab),
  );
  $$(".desk-nav-item").forEach((b) =>
    b.classList.toggle("on", b.dataset.tab === S.tab),
  );
  const qa = $("#qa");
  if (qa) qa.classList.toggle("show", S.tab === "tasks");
  const main = $("#main");
  if (main) main.classList.toggle("tq", S.tab === "tasks");

  updateDeskBadges();
  updateDeskTopbar();
}

export function ripple(btn) {
  const r = btn.getBoundingClientRect(),
    s = document.createElement("span"),
    sz = r.width * 2.4;
  s.className = "ripple";
  s.style.cssText = `width:${sz}px;height:${sz}px;left:${r.width / 2 - sz / 2}px;top:${r.height / 2 - sz / 2}px`;
  btn.appendChild(s);
  setTimeout(() => s.remove(), 650);
}

export function showWelcome() {
  const el = document.createElement("div");
  el.className = "welcome";
  el.id = "welcome";
  el.innerHTML = `<div class="logo">${ic("hourglass", 28)}</div><h1 class="disp">Every date.<br>Every deadline.</h1><p>Events, tasks, countdowns, logs and pages in one fast place. Everything stays on your phone.</p><div class="lab">Pick a look. You can change it any time.</div><div class="tcards" style="margin:0 -22px;padding:4px 22px 14px">${THEMES.map(([id, n]) => `<button class="tcard ${S.prefs.theme === id ? "sel" : ""}" data-theme="${id}" data-act="theme" data-t="${id}"><div class="mh"></div><div class="ml"></div><div class="ml s"></div><div class="mn disp">14</div><div class="nm">${n}</div></button>`).join("")}</div><button class="btn press" data-act="welcomego">Get started</button>`;
  $("#app").appendChild(el);
}

/* ================= ITEM DETAIL ================= */
export function itemHtml(id, date) {
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

export function openItem(id, date) {
  buzz(8);
  openSheet(() => itemHtml(id, date));
}

/* ================= LOG & COUNTDOWN SHEETS ================= */
export function logNow(id, date) {
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

export function logPageHtml(id) {
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

export function openLog(id) {
  S.logId = id;
  buzz(8);
  openPage(() => logPageHtml(id));
}

export function cdSheet(id) {
  const c = S.cds.find((x) => x.id === id);
  if (!c) return "";
  const p = cdParts(c),
    days = diffD(todayKey(), c.date);
  return `<div class="shead"><div style="font-size:44px;line-height:1">${c.emoji}</div><div><h2 class="disp">${esc(c.title)}</h2><small>${longDate(c.date)}</small></div></div><section class="card dl"><div class="mrow"><span>${days >= 0 ? "Time left" : "Passed"}</span><span class="num">${days >= 0 ? `${p.d}d ${p.h}h ${p.m}m` : `${-days} days ago`}</span></div><div class="mrow"><span>Weeks</span><span class="num">${(Math.abs(days) / 7).toFixed(1)}</span></div><div class="mrow"><span>Started</span><span class="num">${c.created}</span></div></section><div class="sgroup" style="display:flex;gap:10px"><button class="btn sec press" style="flex:1" data-act="cdedit" data-id="${c.id}">${ic("edit", 18)}Edit</button><button class="btn dng press" style="flex:1" data-act="cddel" data-id="${c.id}">${ic("trash", 18)}Delete</button></div>`;
}

export function backdateSheet(id) {
  return `<div class="shead"><div><h2 class="disp">Backdate entry</h2><small>When did it happen?</small></div></div>${fld("Date", `<input class="inp" type="date" id="bd-date" max="${todayKey()}" value="${addKey(todayKey(), -1)}">`)}<div class="sgroup"><button class="btn press" data-act="bdsave" data-id="${id}">${ic("check", 20)}Add entry</button></div>`;
}

export function authSheetHtml() {
  return authModalHtml();
}
