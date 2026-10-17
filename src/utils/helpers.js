export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];

export function pad(n) {
  return String(n).padStart(2, "0");
}

export function ymd(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function pd(s) {
  const [a, b, c] = s.split("-").map(Number);
  return new Date(a, b - 1, c);
}

export function addD(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function addKey(k, n) {
  return ymd(addD(pd(k), n));
}

export function diffD(a, b) {
  return Math.round((pd(b) - pd(a)) / 864e5);
}

export function MIN(t) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export function HM(m) {
  return `${pad(((Math.floor(m / 60) % 24) + 24) % 24)}:${pad(((m % 60) + 60) % 60)}`;
}

export const MONTHS = [
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

export const MS = MONTHS.map((m) => m.slice(0, 3));

export const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export const DS = DAYS.map((d) => d.slice(0, 3));

export function esc(s) {
  return String(s == null ? "" : s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
}

let _id = 100;
export function uid() {
  return "i" + ++_id;
}

export function clamp(v, a, b) {
  return Math.min(b, Math.max(a, v));
}

export function now() {
  return new Date();
}

export function todayKey() {
  return ymd(now());
}

export function nowMin() {
  const n = now();
  return n.getHours() * 60 + n.getMinutes() + n.getSeconds() / 60;
}
