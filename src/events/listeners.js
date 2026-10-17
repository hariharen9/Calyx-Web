import { S, buzz, reduced } from "../state/state.js";
import { $, $$, MIN, HM } from "../utils/helpers.js";
import { UI, closeSheet, closePage, refreshAll } from "../components/overlays.js";
import { C, saveComposer } from "../components/composer.js";
import { CMD, openCmd, closeCmd, paintCmd, quickAdd } from "../components/command-bar.js";
import { shiftMonth } from "../views/calendar.js";
import { PG, FS, curPage, touchPage, autosize, updWc, renderBlocks, blockInput, blockKey, pagesBody, mdToBlocks } from "../views/pages.js";
import { B } from "../data/seed.js";
import { ACT, SEGH } from "./actions.js";

export function initEventListeners() {
  /* ================= CLICK DELEGATION ================= */
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

  /* ================= INPUT DELEGATION ================= */
  document.addEventListener("input", (e) => {
    const t = e.target;
    if (t.id === "cin") {
      CMD.sel = 0;
      paintCmd();
      return;
    }
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
    const f = t.dataset && t.dataset.f;
    if (f && C) C[f] = t.type === "number" ? +t.value : t.value;

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
    } else if (t.matches && t.matches("#blocks textarea")) {
      blockInput(t);
    }
  });

  /* ================= CHANGE DELEGATION ================= */
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

  /* ================= KEYBOARD SHORTCUTS ================= */
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
        if (t) {
          t.subs = t.subs || [];
          t.subs.push({ t: v, d: false });
          buzz(8);
          refreshAll();
          const n = $("#subin");
          n && n.focus();
        }
      }
    }
    if (e.target.id === "f-title" && e.key === "Enter") {
      e.preventDefault();
      saveComposer();
    }

    if (PG.id && e.target.matches) {
      if (e.target.matches("#blocks textarea")) blockKey(e);
      else if (e.target.id === "pgtitle" && e.key === "Enter") {
        e.preventDefault();
        const p = curPage();
        if (p) {
          if (!p.blocks.length) p.blocks.push(B("p", ""));
          PG.active = 0;
          renderBlocks(0, 0);
        }
      }
    }
  });

  /* ================= FOCUS DELEGATION ================= */
  document.addEventListener("focusin", (e) => {
    if (PG.id && e.target.id === "pgtitle" && PG.active !== null) {
      PG.active = null;
      PG.slash = null;
      renderBlocks();
    }
  });

  /* ================= POINTER / TOUCH GESTURES ================= */
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
}

