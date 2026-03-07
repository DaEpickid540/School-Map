import { A_Rooms } from "./A_Rooms.js";
import { B_Rooms } from "./B_Rooms.js";
import { C_Rooms } from "./C_Rooms.js";
import { Z_Rooms } from "./Z_Rooms.js";
import { D_Rooms } from "./D_Rooms.js";
import { E_Rooms } from "./E_Rooms.js";
import { F_Rooms } from "./F_Rooms.js";

// Rooms to exclude from dropdown
const mechanicalKeywords = [
  "MECH",
  "ELEC",
  "STOR",
  "CUST",
  "JAN",
  "COPY",
  "WORK",
  "CONF",
  "OFFICE",
];

// Special display names
const specialNames = {
  A10: "A10 (Front Entrance)",
  A11: "A11 (Front Desk)",
  C125: "C125 (Harvard Room)",
  C131: "C131 (Small Commons)",
  B125: "B125 (Dream Center)",
  Z122: "Z122 (Attendance Office)",
  D150: "D150 (Large Commons / Lunchroom)",
  D138: "D138 (Auditorium)",
  D201: "D201 (Upstairs Auditorium)",
};

// Community Center rooms (D16x, D17x)
function isCommunityCenter(room) {
  return /^D1(6|7)\d$/.test(room);
}

export const displayRooms = Object.fromEntries(
  Object.entries({
    ...A_Rooms,
    ...B_Rooms,
    ...C_Rooms,
    ...Z_Rooms,
    ...D_Rooms,
    ...E_Rooms,
    ...F_Rooms,
  })
    .filter(([room]) => {
      if (room in specialNames) return true;
      return !mechanicalKeywords.some((k) => room.includes(k));
    })
    .map(([room]) => {
      if (specialNames[room]) return [room, specialNames[room]];
      if (isCommunityCenter(room)) return [room, `${room} (Community Center)`];
      return [room, room];
    }),
);
