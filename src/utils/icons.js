("use strict");

export const ICONS = {
  home: '<path d="M3.5 11 12 3.5 20.5 11"/><path d="M5.5 9.5V20h13V9.5"/><path d="M10 20v-5.5h4V20"/>',
  cal: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  tasks:
    '<rect x="3" y="3" width="18" height="18" rx="5"/><path d="m8 12.2 2.8 2.8L16 9.5"/>',
  track: '<path d="M3 17.5 8.5 11l4 3.2L20 6"/><path d="M14.5 6H20v5.5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
  settings:
    '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2.2"/><circle cx="9" cy="17" r="2.2"/>',
  chevL: '<path d="m15 5-7 7 7 7"/>',
  chevR: '<path d="m9 5 7 7-7 7"/>',
  x: '<path d="m6 6 12 12M18 6 6 18"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  scissors:
    '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="m8.4 8 11.1 9M8.4 16l11.1-9"/>',
  drop: '<path d="M12 3s6.5 6.5 6.5 11.2a6.5 6.5 0 0 1-13 0C5.5 9.5 12 3 12 3z"/>',
  car: '<path d="M4 15v-3.2L6.2 6.5h11.6L20 11.8V15"/><rect x="3" y="15" width="18" height="4.5" rx="1.5"/><path d="M7 17.2h.01M17 17.2h.01"/>',
  dumbbell:
    '<path d="M6.5 6.5v11M17.5 6.5v11M3.5 9.5v5M20.5 9.5v5M6.5 12h11"/>',
  fuel: '<path d="M4.5 20.5V5.5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v15M3 20.5h13M14.5 9H17a2 2 0 0 1 2 2v5a1.6 1.6 0 0 0 3.2 0V9L19 5.8"/><path d="M7 8h5"/>',
  leaf: '<path d="M5 19.5C5 10 10.5 4.5 20 4.5c0 9.5-5 15-14.500 15z"/><path d="M5 19.5c3-5.500 6-8.500 10-10.500"/>',
  pill: '<rect x="3" y="8.5" width="18" height="7" rx="3.5" transform="rotate(-35 12 12)"/><path d="m9.500 9.500 5 5" />',
  book: '<path d="M5 4.5h10a3 3 0 0 1 3 3v12H8a3 3 0 0 1-3-3z"/><path d="M5 16.5a3 3 0 0 1 3-3h10"/>',
  bell: '<path d="M6 16.5V11a6 6 0 0 1 12 0v5.500l1.800 1.800H4.200z"/><path d="M10 21h4"/>',
  gift: '<rect x="3.5" y="9" width="17" height="11.500" rx="2"/><path d="M12 9v11.500M3.500 14h17"/><path d="M12 9C10.500 5 6.500 5.500 7 7.500 7.500 9 10 9 12 9zm0 0c1.500-4 5.500-3.500 5-1.500-.5 1.500-3 1.500-5 1.500z"/>',
  repeat:
    '<path d="m17 3 3 3-3 3"/><path d="M4 11V9.500A3.500 3.500 0 0 1 7.500 6H20"/><path d="m7 21-3-3 3-3"/><path d="M20 13v1.500a3.500 3.500 0 0 1-3.500 3.500H4"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 12.500h10L18 7M9 7V4h6v3"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  hourglass:
    '<path d="M6 3h12M6 21h12M7 3c0 5.500 5 6.500 5 9s-5 3.500-5 9M17 3c0 5.500-5 6.500-5 9s5 3.500 5 9"/>',
  spark:
    '<path d="m12 3 1.900 5.100L19 10l-5.100 1.900L12 17l-1.900-5.100L5 10l5.100-1.900z"/><path d="M19 16v4M17 18h4"/>',
  globe:
    '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
  pin: '<path d="M12 21s6.500-5.800 6.500-11a6.500 6.500 0 0 0-13 0C5.500 15.200 12 21 12 21z"/><circle cx="12" cy="10" r="2.300"/>',
  note: '<path d="M5 4h14v12l-5 5H5z"/><path d="M14 21v-5h5M8.500 9h7M8.500 13h4"/>',
  more: '<path d="M5 12h.01M12 12h.01M19 12h.01"/>',
  edit: '<path d="M4 20h4L19 9a2.800 2.800 0 0 0-4-4L4 16z"/>',
  flag: '<path d="M5.500 21V4M5.500 4.500h12l-2.500 4 2.500 4h-12"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.600 5.600 7 7M17 17l1.400 1.400M18.400 5.600 17 7M7 17l-1.400 1.400"/>',
  undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>',
  // Pages & Editor icons
  code: '<path d="m8 7-5 5 5 5M16 7l5 5-5 5M14 4l-4 16"/>',
  folder:
    '<path d="M3 7.500A2.500 2.500 0 0 1 5.500 5H10l2 2.500h6.500A2.500 2.500 0 0 1 21 10v7.500a2.500 2.500 0 0 1-2.500 2.500h-13A2.500 2.500 0 0 1 3 17.500z"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2.500"/><path d="M16 8V6.500A2.500 2.500 0 0 0 13.500 4h-7A2.500 2.500 0 0 0 4 6.500v7A2.500 2.500 0 0 0 6.500 16H8"/>',
  up: '<path d="m6 14 6-6 6 6"/>',
  down: '<path d="m6 10 6 6 6-6"/>',
  bold: '<path d="M7 5h6a3.500 3.500 0 0 1 0 7H7zM7 12h7a3.500 3.500 0 0 1 0 7H7z"/>',
  italic: '<path d="M14 5h-4M14 19h-4M15 5l-6 14"/>',
  strike:
    '<path d="M4 12h16M8 7.500C8.500 6 10 5 12 5c2.500 0 4 1.200 4 3M16 16c0 2-1.800 3-4 3-2.200 0-3.800-1-4-3"/>',
  type: '<path d="M3 19 8 6l5 13M5 15h6M15 19l3.500-8 3 8M16.500 16.500h4"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11M4.500 6h.01M4.500 12h.01M4.500 18h.01"/>',
  quote: '<path d="M7 7h4v5a4 4 0 0 1-4 4M15 7h4v5a4 4 0 0 1-4 4"/>',
  minus: '<path d="M5 12h14"/>',
};

export const ic = (n, s = 20) =>
  `<svg class="ic" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">${ICONS[n] || ""}</svg>`;

export const LOGICONS = [
  "scissors",
  "car",
  "dumbbell",
  "drop",
  "fuel",
  "leaf",
  "pill",
  "book",
];

export const TYPELABEL = {
  event: "Event",
  task: "Task",
  reminder: "Reminder",
  birthday: "Birthday",
};

export const TYPEICON = {
  event: "cal",
  task: "tasks",
  reminder: "bell",
  birthday: "gift",
};
