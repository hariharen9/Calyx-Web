("use strict");
import { $ } from "./helpers.js";

let toastT = null;
let toastUndo = null;

export function toast(msg, undo) {
  const m = $("#toastmsg");
  if (m) m.textContent = msg;
  toastUndo = undo || null;
  const a = $("#toastact");
  if (a) a.style.display = undo ? "" : "none";
  const t = $("#toast");
  if (t) {
    t.classList.add("show");
    clearTimeout(toastT);
    toastT = setTimeout(() => t.classList.remove("show"), 4200);
  }
}

export function getToastUndo() {
  return toastUndo;
}

export function clearToastUndo() {
  toastUndo = null;
}
