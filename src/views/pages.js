import { S, saveState, buzz, reduced } from "../state/state.js";
import { ic } from "../utils/icons.js";
import { esc, uid, todayKey, now, DS, MS, $ as doc$, $$ as doc$$ } from "../utils/helpers.js";
import { dayLabel, emptyBox, CHK, stg } from "../queries/queries.js";
import { toast } from "../utils/toast.js";
import { B, PEMOJI, FEMOJI, PH, SLASH } from "../data/seed.js";
export const LISTY = ["ul", "ol", "todo"];

/* ================= PAGES STATE ================= */
export const PG = { id: null, active: null, mode: "blocks", slash: null, q: "" };
export let FS = null;
export function setFS(val) {
  FS = val;
}

// Overlay callbacks that will be wired from overlays module
let _openPage = null;
let _closePage = null;
let _paintPage = null;
let _openSheet = null;
let _closeSheet = null;
let _renderApp = null;

export function setPagesOverlayCallbacks(cbs) {
  if (cbs.openPage) _openPage = cbs.openPage;
  if (cbs.closePage) _closePage = cbs.closePage;
  if (cbs.paintPage) _paintPage = cbs.paintPage;
  if (cbs.openSheet) _openSheet = cbs.openSheet;
  if (cbs.closeSheet) _closeSheet = cbs.closeSheet;
  if (cbs.renderApp) _renderApp = cbs.renderApp;
}

/* ----- helpers ----- */
export const curPage = () => S.pages.find((p) => p.id === PG.id);

export const pageWords = (p) =>
  p.blocks.reduce(
    (n, b) => n + (b.x.trim() ? b.x.trim().split(/\s+/).length : 0),
    0,
  );

export const snip = (p) => {
  const b = p.blocks.find((b) => b.x && b.x.trim() && b.t !== "hr");
  return b
    ? b.x
        .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
        .replace(/[*_`~]/g, "")
        .slice(0, 90)
    : "";
};

export function inl(s) {
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

export function mdShortcut(x) {
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

export function mdToBlocks(md) {
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

export function blocksToMd(p) {
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
export function pageRow(p) {
  return `<div class="prow"><button class="phit press" data-act="pgopen" data-id="${p.id}"><span class="pe">${p.icon}</span><span class="pt"><b>${esc(p.title || "Untitled")}</b><small>${esc(snip(p)) || "Empty page"}</small></span><span class="pd">${dayLabel(p.updated, true)}</span></button><button class="pmore" data-act="pgmenu" data-id="${p.id}" aria-label="Page options">${ic("more", 18)}</button></div>`;
}

export const pinCard = (p) =>
  `<button class="pincard card press" data-act="pgopen" data-id="${p.id}"><span class="pe">${p.icon}</span><b class="disp">${esc(p.title || "Untitled")}</b><small>${esc(snip(p)) || "Empty page"}</small></button>`;

export const byUpd = (a, b) => b.updated.localeCompare(a.updated);

export function folderHtml(f) {
  const ps = S.pages.filter((p) => p.folder === f.id).sort(byUpd);
  return `<section class="card fold ${f.open ? "open" : ""}"><div class="frow"><button class="fhit press" data-act="foldtog" data-id="${f.id}"><span class="fchev">${ic("chevR", 18)}</span><span class="fe">${f.emoji}</span><b>${esc(f.name)}</b><small>${ps.length}</small></button><button class="pmore" data-act="foldmenu" data-id="${f.id}" aria-label="Folder options">${ic("more", 18)}</button></div><div class="fold-body"><div>${ps.length ? ps.map(pageRow).join("") : `<div class="empty" style="padding:12px 18px 18px">No pages in this folder yet.<br><button class="addbtn press" style="margin-top:10px" data-act="newpage" data-folder="${f.id}">${ic("plus", 16)}Add a page</button></div>`}</div></div></section>`;
}

export function pagesBody(q) {
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

export function vPages() {
  return `<header class="top ${stg(0)}"><div><div class="sub">${S.pages.length} ${S.pages.length === 1 ? "page" : "pages"} in ${S.folders.length} ${S.folders.length === 1 ? "folder" : "folders"}</div><h1 class="disp h1">Pages</h1></div><button class="addbtn press" data-act="newpage">${ic("plus", 16)}New page</button></header><div class="psearch ${stg(1)}">${ic("search", 18)}<input id="psq" placeholder="Search pages" value="${esc(PG.q)}" autocomplete="off"></div><div id="pbody" class="${stg(2)}">${pagesBody(PG.q)}</div>`;
}

/* ----- editor ----- */
export function blockHtml(b, i, num) {
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

export function blocksHtml(p) {
  let n = 0;
  return p.blocks
    .map((b, i) => {
      n = b.t === "ol" ? n + 1 : 0;
      return blockHtml(b, i, n);
    })
    .join("");
}

export const barHtml = () =>
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

export function editorHtml() {
  const p = curPage();
  if (!p) return "";
  const f = S.folders.find((x) => x.id === p.folder),
    md = PG.mode === "md";
  return `<div class="phead"><button class="ibtn press" data-act="back" aria-label="Back">${ic("chevL")}</button><button class="fchip press" data-act="pgmove">${ic("folder", 16)}<span>${f ? esc(f.emoji + " " + f.name) : "Unfiled"}</span></button><span style="flex:1"></span><button class="ibtn press ${md ? "on" : ""}" data-act="pgmode" aria-label="Toggle Markdown view">${ic("code", 20)}</button><button class="ibtn press" data-act="pgmore" aria-label="More">${ic("more")}</button></div><div class="pbody" id="edbody"><div class="ptitle"><button class="pemoji press" data-act="pgemoji" aria-label="Change icon">${p.icon}</button><textarea id="pgtitle" rows="1" placeholder="Untitled" spellcheck="false">${esc(p.title)}</textarea></div><div class="pmeta">Edited ${dayLabel(p.updated).toLowerCase()} · <span id="wc">${pageWords(p)} words</span></div>${md ? `<div class="mdhint">${ic("code", 16)}Raw Markdown. Edits convert to blocks as you type.</div><textarea id="mdraw" class="mdraw" spellcheck="false">${esc(blocksToMd(p))}</textarea>` : `<div id="blocks">${blocksHtml(p)}</div><button class="addblk press" data-act="blkadd">${ic("plus", 16)}Add a block</button>`}<div style="height:40px"></div></div><div class="edbar ${!md && PG.active !== null ? "show" : ""}" id="edbar">${barHtml()}</div><div class="slash" id="slash"></div>`;
}

export const autosize = (t) => {
  t.style.height = "auto";
  t.style.height = t.scrollHeight + "px";
};

export const autosizeAll = () => doc$$("#edbody textarea").forEach(autosize);

export const touchPage = () => {
  const p = curPage();
  if (p) p.updated = todayKey();
};

export const updWc = () => {
  const p = curPage(),
    w = doc$("#wc");
  if (p && w) w.textContent = pageWords(p) + " words";
};

export function renderBlocks(fi, caret) {
  const p = curPage(),
    el = doc$("#blocks");
  if (!p || !el) return;
  el.innerHTML = blocksHtml(p);
  const edbar = doc$("#edbar");
  if (edbar) edbar.classList.toggle("show", PG.active !== null);
  autosizeAll();
  if (fi != null) {
    const t = doc$(`#blocks textarea[data-i="${fi}"]`);
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

export function openPageEditor(id, focusTitle) {
  PG.id = id;
  PG.active = null;
  PG.mode = "blocks";
  PG.slash = null;
  buzz(8);
  if (_openPage) _openPage(editorHtml);
  setTimeout(autosizeAll, 80);
  const p = curPage();
  if (p && !p.title && p.blocks.length <= 1 && !p.blocks[0].x)
    setTimeout(() => {
      if (focusTitle) {
        const t = doc$("#pgtitle");
        t && t.focus();
      } else {
        PG.active = 0;
        renderBlocks(0);
      }
    }, 540);
}

export function newPage(folderId, title) {
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
  if (_renderApp) _renderApp();
  openPageEditor(p.id, !title);
}

export function slashMenu(x) {
  const el = doc$("#slash");
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

export function pickSlash(t) {
  const p = curPage(),
    i = PG.active,
    b = p && p.blocks[i];
  if (!b) return;
  PG.slash = null;
  const slEl = doc$("#slash");
  if (slEl) slEl.classList.remove("show");
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

export function blockInput(t) {
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

export function focusBlock(i, c) {
  PG.active = i;
  renderBlocks(i, c);
}

export function blockKey(e) {
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
export const menuRow = (a, id, i, l, d) =>
  `<button class="irow press" style="--c:${d ? "var(--hi)" : "var(--accent)"}" data-act="${a}" data-id="${id}"><span style="color:var(--c);display:grid">${ic(i, 20)}</span><span class="tx"><b style="${d ? "color:var(--hi)" : ""}">${l}</b></span></button>`;

export function pageMenuHtml(id) {
  const p = S.pages.find((x) => x.id === id);
  if (!p) return "";
  return `<div class="shead"><div class="pe" style="width:54px;height:54px;font-size:30px">${p.icon}</div><div><h2 class="disp">${esc(p.title || "Untitled")}</h2><small>${pageWords(p)} words · edited ${dayLabel(p.updated).toLowerCase()}</small></div></div><section class="card list">${menuRow("pgpin", id, "pin", p.fav ? "Unpin from top" : "Pin to top")}${menuRow("pgmovesheet", id, "folder", "Move to folder")}${menuRow("pgdup", id, "copy", "Duplicate")}${menuRow("pgcopy", id, "code", "Copy as Markdown")}${menuRow("pgdel", id, "trash", "Delete page", true)}</section>`;
}

export function moveHtml(id) {
  const p = S.pages.find((x) => x.id === id);
  if (!p) return "";
  const row = (fid, e, n) =>
    `<button class="irow press" style="--c:var(--accent)" data-act="pgmoveto" data-id="${id}" data-f="${fid}"><span style="font-size:22px">${e}</span><span class="tx"><b>${esc(n)}</b></span>${(p.folder || "") === fid ? `<span style="color:var(--accent)">${ic("check", 20)}</span>` : ""}</button>`;
  return `<div class="shead"><div><h2 class="disp">Move to folder</h2><small>${esc(p.title || "Untitled")}</small></div></div><section class="card list">${row("", "📄", "Unfiled")}${S.folders.map((f) => row(f.id, f.emoji, f.name)).join("")}<button class="irow press" style="--c:var(--accent)" data-act="newfolder" data-move="${id}"><span style="color:var(--accent);display:grid">${ic("plus", 22)}</span><span class="tx"><b>New folder…</b></span></button></section>`;
}

export const emojiHtml = () =>
  `<div class="shead"><div><h2 class="disp">Page icon</h2><small>Pick something recognisable</small></div></div><div class="emjs">${PEMOJI.map((e) => `<button data-act="pgseticon" data-v="${e}">${e}</button>`).join("")}</div>`;

const fld = (l, i) => `<div class="fld"><label>${l}</label>${i}</div>`;

export function folderSheetHtml() {
  const edit = !!FS.id;
  return `<div class="shead"><div><h2 class="disp">${edit ? "Edit folder" : "New folder"}</h2><small>Group related pages together</small></div></div>${fld("Name", `<input class="inp" id="fname" value="${esc(FS.name)}" placeholder="e.g. Projects" autocomplete="off">`)}${fld("Icon", `<div class="emjs">${FEMOJI.map((e) => `<button class="${FS.emoji === e ? "on" : ""}" data-act="fememoji" data-v="${e}">${e}</button>`).join("")}</div>`)}<div class="sgroup"><button class="btn press" data-act="foldsave">${ic("check", 20)}${edit ? "Save folder" : "Create folder"}</button></div>${edit ? `<div class="sgroup" style="margin-top:10px"><button class="btn dng sm press" data-act="folddel">${ic("trash", 17)}Delete folder (pages stay unfiled)</button></div>` : ""}`;
}

export const turnHtml = () =>
  `<div class="shead"><div><h2 class="disp">Turn into</h2><small>Keeps your text</small></div></div><section class="card list" style="padding:6px">${SLASH.filter(
    (s) => !["hr", "date"].includes(s[0]),
  )
    .map(
      (s) =>
        `<button class="sl" data-act="turnto" data-t="${s[0]}"><span class="si">${ic(s[2], 18)}</span><span><b>${s[1]}</b><small>${s[3]}</small></span></button>`,
    )
    .join("")}</section>`;
