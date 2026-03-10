import { A_Rooms } from "./A_Rooms.js";
import { B_Rooms } from "./B_Rooms.js";
import { C_Rooms } from "./C_Rooms.js";
import { Z_Rooms } from "./Z_Rooms.js";
import { D_Rooms } from "./D_Rooms.js";
import { E_Rooms } from "./E_Rooms.js";
import { F_Rooms } from "./F_Rooms.js";

const specialNames = {
  A10: "A10 – Front Entrance / Lobby",
  A11: "A11 – Front Desk",
  A12: "A12 – Counseling",
  A32: "A32 – Office",
  C100: "C100 – Commons / Food Court",
  C111: "C111 – Media Center",
  C121: "C121 – Auditorium Lobby",
  D138: "D138 – Auditorium",
  D150: "D150 – Main Commons / Lunchroom",
  D123: "D123 – Field House / Gym",
  B125: "B125 – Dream Center",
  Z122: "Z122 – Attendance Office",
};

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
    .sort(([a], [b]) =>
      a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }),
    )
    .map(([room]) => [room, specialNames[room] || room]),
);
