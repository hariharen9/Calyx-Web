("use strict");
import { uid, todayKey, addKey, pd } from "../utils/helpers.js";
import { S } from "../state/state.js";

export const ev = (title, date, start, end, k, x = {}) => ({
  id: uid(),
  type: "event",
  title,
  date,
  start,
  end,
  k,
  ...x,
});

export const tk = (title, date, pri, x = {}) => ({
  id: uid(),
  type: "task",
  title,
  date,
  pri,
  done: false,
  subs: [],
  ...x,
});

export const REP = {
  none: null,
  daily: { unit: "day", every: 1 },
  weekdays: { unit: "week", every: 1, days: [1, 2, 3, 4, 5] },
  weekly: { unit: "week", every: 1 },
  monthly: { unit: "month", every: 1 },
  yearly: { unit: "year", every: 1 },
};

export const repKey = (r) => {
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

export const repLabel = (r) =>
  !r
    ? ""
    : {
        daily: "Every day",
        weekdays: "Weekdays",
        weekly: "Every week",
        monthly: "Every month",
        yearly: "Every year",
      }[repKey(r)] || `Every ${r.every} ${r.unit}s`;

export const EMOJIS = ["🎯", "🚀", "🎂", "🏖️", "✈️", "🪔", "🎓", "💍", "🏆", "🎉"];

export const PEMOJI = [
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

export const FEMOJI = [
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

export const PH = {
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

export const SLASH = [
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

export const B = (t, x = "", extra) => ({ id: uid(), t, x, ...(extra || {}) });

export const SEED_EVENT_TITLES = new Set([
  "Team standup",
  "Piano lesson",
  "Yoga flow",
  "1-on-1 with Lead",
  "Dentist checkup",
  "Sprint planning",
  "Dinner with Meera",
  "Team lunch",
  "Farmers market",
  "Quarterly review",
  "Flight to Delhi",
  "Meera's birthday",
  "Pick up Meera's gift",
  "Call insurance about the claim",
  "Water the plants",
  "Return Amazon package",
  "Pay electric bill",
  "Review PR #42 & merge feature branch",
  "Submit quarterly budget proposal",
  "Order new mechanical keyboard switches",
  "Reply to landlord about renewal",
  "Renew domain registration",
  "Call mom",
  "Plan Q4 roadmap",
  "Book Goa flights",
  "Back up phone photos",
  "Read chapter 7 of the DDIA book",
]);

export const SEED_LOG_NAMES = new Set([
  "Haircut",
  "Car wash",
  "Gym workout",
  "Water filter",
  "Petrol",
  "Water plants",
]);

export const SEED_CD_TITLES = new Set([
  "Product launch",
  "Diwali",
  "Mom's birthday",
  "Goa trip",
  "New Year",
]);

export const SEED_PAGE_TITLES = new Set([
  "Welcome to Pages",
  "Q4 roadmap",
  "1-on-1 notes",
  "Goa trip plan",
  "Home maintenance",
  "Reading list",
  "Scratchpad",
]);

export const SEED_FOLDER_NAMES = new Set(["Work", "Personal", "Learning"]);

export const isMockItem = (i) => Boolean(i && (i.mock || SEED_EVENT_TITLES.has(i.title)));
export const isMockLog = (l) => Boolean(l && (l.mock || SEED_LOG_NAMES.has(l.name)));
export const isMockCd = (c) => Boolean(c && (c.mock || SEED_CD_TITLES.has(c.title)));
export const isMockPage = (p) => Boolean(p && (p.mock || SEED_PAGE_TITLES.has(p.title)));
export const isMockFolder = (f) => Boolean(f && (f.mock || SEED_FOLDER_NAMES.has(f.name)));

export function getMockDataStats() {
  const items = (S.items || []).filter(isMockItem).length;
  const logs = (S.logs || []).filter(isMockLog).length;
  const cds = (S.cds || []).filter(isMockCd).length;
  const pages = (S.pages || []).filter(isMockPage).length;
  const folders = (S.folders || []).filter(isMockFolder).length;
  const total = items + logs + cds + pages + folders;
  return { items, logs, cds, pages, folders, total };
}

export function unloadMockData() {
  const removedMockFolders = (S.folders || []).filter(isMockFolder).map((f) => f.id);

  S.items = (S.items || []).filter((i) => !isMockItem(i));
  S.logs = (S.logs || []).filter((l) => !isMockLog(l));
  S.cds = (S.cds || []).filter((c) => !isMockCd(c));
  S.pages = (S.pages || []).filter((p) => !isMockPage(p));
  S.folders = (S.folders || []).filter((f) => !isMockFolder(f));

  if (S.pages) {
    S.pages.forEach((p) => {
      if (p.folder && removedMockFolders.includes(p.folder)) {
        p.folder = null;
      }
    });
  }
}

export function getSeedPages() {
  const f1 = { id: uid(), name: "Work", emoji: "💼", open: true, mock: true },
    f2 = { id: uid(), name: "Personal", emoji: "🌿", open: true, mock: true },
    f3 = { id: uid(), name: "Learning", emoji: "📚", open: false, mock: true };
  const mockFolders = [f1, f2, f3];
  const P = (title, icon, f, updated, blocks, x) => ({
    id: uid(),
    title,
    icon,
    folder: f ? f.id : null,
    updated,
    blocks,
    fav: false,
    mock: true,
    ...x,
  });
  const mockPages = [
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
  return { mockFolders, mockPages };
}

export function seedPages() {
  const { mockFolders, mockPages } = getSeedPages();
  S.folders = mockFolders;
  S.pages = mockPages;
}

export function getSeedItems(t) {
  return [
    ev("Team standup", addKey(t, -2), "09:30", "09:45", 3, {
      repeat: REP.weekdays,
      loc: "Huddle room 2",
      mock: true,
    }),
    ev("Piano lesson", addKey(t, -3), "17:00", "18:00", 4, {
      repeat: REP.weekly,
      loc: "Studio Gamut",
      mock: true,
    }),
    ev("Yoga flow", addKey(t, 2), "12:00", "13:00", 2, {
      repeat: REP.weekly,
      loc: "Cult, Koramangala",
      mock: true,
    }),
    ev("1-on-1 with Lead", addKey(t, 1), "14:00", "14:45", 1, {
      repeat: REP.weekly,
      notes: "Bring Q4 hiring plan and roadmap draft.",
      mock: true,
    }),
    ev("Dentist checkup", t, "13:00", "14:00", 2, {
      loc: "Dr. Rao's clinic",
      notes: "Cleaning plus a quick x-ray.",
      mock: true,
    }),
    ev("Sprint planning", t, "16:30", "17:30", 5, { loc: "Meet, 4th floor", mock: true }),
    ev("Dinner with Meera", t, "19:30", "21:00", 4, {
      loc: "Toit, Indiranagar",
      mock: true,
    }),
    ev("Team lunch", addKey(t, 2), "13:00", "14:00", 2, { loc: "Truffles", mock: true }),
    ev("Farmers market", addKey(t, 3), "09:00", "10:30", 2, { mock: true }),
    ev("Quarterly review", addKey(t, 6), "11:00", "12:30", 1, {
      loc: "Boardroom",
      mock: true,
    }),
    ev("Flight to Delhi", addKey(t, 14), "06:15", "09:00", 1, {
      notes: "Terminal 1, gate opens 05:30.",
      mock: true,
    }),
    {
      id: uid(),
      type: "birthday",
      title: "Meera's birthday",
      date: addKey(t, 8),
      allDay: true,
      k: 4,
      repeat: REP.yearly,
      mock: true,
    },
    {
      id: uid(),
      type: "reminder",
      title: "Pick up Meera's gift",
      date: t,
      start: "18:00",
      k: 4,
      mock: true,
    },
    {
      id: uid(),
      type: "reminder",
      title: "Call insurance about the claim",
      date: addKey(t, 1),
      start: "10:00",
      k: 3,
      mock: true,
    },
    {
      id: uid(),
      type: "reminder",
      title: "Water the plants",
      date: addKey(t, -2),
      start: "08:00",
      k: 2,
      repeat: REP.weekly,
      mock: true,
    },
    tk("Return Amazon package", addKey(t, -1), "low", { done: true, mock: true }),
    tk("Pay electric bill", t, "med", { mock: true }),
    tk("Review PR #42 & merge feature branch", t, "high", {
      subs: [
        { t: "Read the diff", d: true },
        { t: "Run the test suite", d: true },
        { t: "Merge to main", d: false },
      ],
      mock: true,
    }),
    tk("Submit quarterly budget proposal", t, "high", { done: true, mock: true }),
    tk("Order new mechanical keyboard switches", addKey(t, 1), "low", { mock: true }),
    tk("Reply to landlord about renewal", addKey(t, 1), "med", { mock: true }),
    tk("Renew domain registration", addKey(t, 2), "med", { mock: true }),
    tk("Call mom", addKey(t, 4), "med", { mock: true }),
    tk("Plan Q4 roadmap", addKey(t, 6), "high", {
      subs: [
        { t: "Collect team input", d: false },
        { t: "Draft themes", d: false },
        { t: "Review with Lead", d: false },
      ],
      mock: true,
    }),
    tk("Book Goa flights", null, "med", { mock: true }),
    tk("Back up phone photos", null, "low", { mock: true }),
    tk("Read chapter 7 of the DDIA book", null, "low", { mock: true }),
  ];
}

export function getSeedLogs(t) {
  const mkOcc = (last, gaps, cost, notes) => {
    let d = last;
    const o = [{ d, cost, note: notes[0] }];
    gaps.forEach((g, i) => {
      d = addKey(d, -g);
      o.push({ d, cost, note: notes[(i + 1) % notes.length] });
    });
    return o;
  };

  return [
    {
      id: uid(),
      name: "Haircut",
      icon: "scissors",
      target: 28,
      k: 4,
      mock: true,
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
      mock: true,
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
      mock: true,
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
      mock: true,
      occ: mkOcc(addKey(t, -58), [60, 57, 59], 18, ["Replaced cartridge"]),
    },
    {
      id: uid(),
      name: "Petrol",
      icon: "fuel",
      target: 9,
      k: 3,
      mock: true,
      occ: mkOcc(addKey(t, -8), [8, 9, 7, 10], 42, ["Full tank"]),
    },
    {
      id: uid(),
      name: "Water plants",
      icon: "leaf",
      target: 3,
      k: 2,
      mock: true,
      occ: mkOcc(addKey(t, -3), [3, 4, 3, 3], 0, ["All plants"]),
    },
  ];
}

export function getSeedCds(t) {
  return [
    {
      id: uid(),
      title: "Product launch",
      date: addKey(t, 18),
      emoji: "🚀",
      created: addKey(t, -30),
      mock: true,
    },
    {
      id: uid(),
      title: "Diwali",
      date: addKey(t, 25),
      emoji: "🪔",
      created: addKey(t, -45),
      mock: true,
    },
    {
      id: uid(),
      title: "Mom's birthday",
      date: addKey(t, 48),
      emoji: "🎂",
      created: addKey(t, -14),
      mock: true,
    },
    {
      id: uid(),
      title: "Goa trip",
      date: addKey(t, 65),
      emoji: "🏖️",
      created: addKey(t, -60),
      mock: true,
    },
    {
      id: uid(),
      title: "New Year",
      date: String(pd(t).getFullYear() + 1) + "-01-01",
      emoji: "🎆",
      created: addKey(t, -15),
      mock: true,
    },
  ];
}

export function loadMockData() {
  unloadMockData();
  const t = todayKey();
  const items = getSeedItems(t);
  const logs = getSeedLogs(t);
  const cds = getSeedCds(t);
  const { mockFolders, mockPages } = getSeedPages();

  S.items.push(...items);
  S.logs.push(...logs);
  S.cds.push(...cds);
  S.folders.push(...mockFolders);
  S.pages.push(...mockPages);
}

export function seedAll() {
  S.items = [];
  S.logs = [];
  S.cds = [];
  S.folders = [];
  S.pages = [];
  loadMockData();
}
