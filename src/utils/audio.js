("use strict");
import { nowMin, todayKey, HM, pad, $ } from "./helpers.js";
import { TYPELABEL } from "./icons.js";
import { toast } from "./toast.js";

let _audioCtx = null;
export function getAudioCtx() {
  if (!_audioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) _audioCtx = new AC();
  }
  if (_audioCtx && _audioCtx.state === "suspended") {
    _audioCtx.resume().catch(() => {});
  }
  return _audioCtx;
}

export function playChime(loud = false) {
  try {
    const ctx = getAudioCtx();
    if (!ctx) return;
    const t0 = ctx.currentTime;
    if (loud) {
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, t0 + idx * 0.12);
        gain.gain.setValueAtTime(0.25, t0 + idx * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, t0 + idx * 0.12 + 0.5);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t0 + idx * 0.12);
        osc.stop(t0 + idx * 0.12 + 0.5);
      });
    } else {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, t0);
      osc.frequency.exponentialRampToValueAtTime(880, t0 + 0.08);
      gain.gain.setValueAtTime(0.2, t0);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.55);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + 0.55);
    }
  } catch (err) {
    console.warn("Audio playback error:", err);
  }
}

export async function requestNotificationPermission() {
  if (!("Notification" in window)) return "unsupported";
  if (Notification.permission === "granted") return "granted";
  try {
    const res = await Notification.requestPermission();
    return res;
  } catch (e) {
    return Notification.permission;
  }
}

export function sendNotification(title, body, tag) {
  if ("Notification" in window && Notification.permission === "granted") {
    try {
      new Notification(title, {
        body,
        icon: "/icon.svg",
        tag: tag || "calyx-alert",
        renotify: true,
      });
    } catch (e) {
      if (navigator.serviceWorker && navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready
          .then((reg) => {
            reg.showNotification(title, {
              body,
              icon: "/icon.svg",
              tag: tag || "calyx-alert",
            });
          })
          .catch(() => {});
      }
    }
  }
}

export const firedAlarms = new Set();

let alarmCallbacks = {
  getPrefs: () => ({ alarm: "standard", snooze: 10 }),
  getItems: () => [],
  buzz: () => {},
  saveState: () => {},
  refreshAll: () => {},
  fmtT: (t) => t,
};

export function setAlarmCallbacks(cbs) {
  Object.assign(alarmCallbacks, cbs);
}

export function triggerAlarm(it) {
  const prefs = alarmCallbacks.getPrefs();
  playChime(prefs.alarm === "loud");
  alarmCallbacks.buzz([40, 100, 40, 100, 60]);
  const timeStr = it.start ? alarmCallbacks.fmtT(it.start) : "";
  const subTitle = `${TYPELABEL[it.type] || "Reminder"}${timeStr ? " · " + timeStr : ""}`;
  sendNotification(it.title, subTitle, `calyx-${it.id}`);

  const snoozeMins = prefs.snooze || 10;
  toast(`🔔 ${it.title} (${timeStr})`, () => {
    snoozeItem(it.id, snoozeMins);
  });
  const toastAct = $("#toastact");
  if (toastAct) toastAct.textContent = `Snooze ${snoozeMins}m`;
}

export function snoozeItem(id, mins = 10) {
  const items = alarmCallbacks.getItems();
  const it = items.find((x) => x.id === id);
  if (!it) return;
  const newMin = nowMin() + mins;
  it.start = HM(Math.round(newMin));
  it.date = todayKey();
  alarmCallbacks.saveState();
  alarmCallbacks.refreshAll();
  toast(`Snoozed for ${mins} minutes`);
}

export function checkAlarms() {
  const t = todayKey();
  const curHM = HM(nowMin());
  const items = alarmCallbacks.getItems();
  if (!items || !items.length) return;
  items.forEach((it) => {
    if (
      (it.type === "reminder" || it.type === "event") &&
      it.date === t &&
      it.start &&
      it.start === curHM
    ) {
      const alarmKey = `${it.id}-${t}-${curHM}`;
      if (!firedAlarms.has(alarmKey)) {
        firedAlarms.add(alarmKey);
        triggerAlarm(it);
      }
    }
  });
}
