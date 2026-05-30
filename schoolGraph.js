// schoolGraph.js
import { A_Rooms } from "./A_Rooms.js";
import { B_Rooms } from "./B_Rooms.js";
import { C_Rooms } from "./C_Rooms.js";
import { Z_Rooms } from "./Z_Rooms.js";
import { D_Rooms } from "./D_Rooms.js";
import { E_Rooms } from "./E_Rooms.js";
import { F_Rooms } from "./F_Rooms.js";

export const allRooms = {
  ...A_Rooms,
  ...B_Rooms,
  ...C_Rooms,
  ...Z_Rooms,
  ...D_Rooms,
  ...E_Rooms,
  ...F_Rooms,
};

// ── Stair node registry ──────────────────────────────────────────
// Primary stairs: inside each pod, connect all 3 floors
// Secondary stairs: connector hallways between adjacent pods
// Front_Stair: unnamed stair in the front office/lobby area,
//              connects floor 1 lobby (Lobby_1) to floor 2 lobby (Lobby_2)
export const STAIR_NODES = new Set([
  "A_Stair",
  "B_Stair",
  "C_Stair",
  "Z_Stair", // primary pod stairs
  "Z2",
  "A2",
  "B2", // cross-pod connector stairs
  "Front_Stair", // front office lobby stair (F1↔F2 only)
]);

export const schoolGraph = {
  // ── Floor 1 ───────────────────────────────────────────────────
  //
  // Front office lobby (Lobby_1) is a real walkable node.
  // Physical layout:
  //   A_Pod_1 → [display cases hallway] → Lobby_1
  //   C_Pod_1 → [past Harvard Room hallway] → Lobby_1
  //   Lobby_1 contains A11 (front desk) and admin rooms A14-A31
  //   A32 (Nurse's Office) connects via A100 corridor, not the lobby
  //   Lobby_1 → Front_Stair → Lobby_2 (floor 2 lobby)
  //
  Lobby_1: ["A_Pod_1", "C_Pod_1", "Front_Stair"],
  Commons_1: ["C_Pod_1", "D_Wing_1", "Z_Pod_1", "B_Pod_1"],
  A_Pod_1: ["A_Stair", "B_Pod_1", "Z_Pod_1", "Z2", "A2", "Lobby_1"],
  B_Pod_1: ["Commons_1", "B_Stair", "A_Pod_1", "C_Pod_1", "A2", "B2"],
  C_Pod_1: ["Commons_1", "C_Stair", "B_Pod_1", "D_Wing_1", "B2", "Lobby_1"],
  Z_Pod_1: ["Commons_1", "Z_Stair", "A_Pod_1", "Z2"],
  D_Wing_1: ["Commons_1", "C_Pod_1", "E_Wing_1", "F_Wing_1"],
  E_Wing_1: ["D_Wing_1"],
  F_Wing_1: ["D_Wing_1"],

  // ── Floor 2 ───────────────────────────────────────────────────
  //
  // Lobby_2 mirrors Lobby_1 one floor up.
  // The two hallways from A200 and C200 meet at the 2nd floor lobby,
  // where an unnamed stair descends to the front office lobby below.
  // Admin rooms A51-A71 are accessed from Lobby_2.
  //
  Lobby_2: ["A_Pod_2", "C_Pod_2", "Front_Stair"],
  Commons_2: ["C_Pod_2", "D_Wing_2", "Z_Pod_2", "B_Pod_2"],
  A_Pod_2: ["A_Stair", "B_Pod_2", "Z_Pod_2", "Z2", "A2", "Lobby_2"],
  B_Pod_2: ["Commons_2", "B_Stair", "A_Pod_2", "C_Pod_2", "A2", "B2"],
  C_Pod_2: ["Commons_2", "C_Stair", "B_Pod_2", "B2", "Lobby_2"],
  Z_Pod_2: ["Commons_2", "Z_Stair", "A_Pod_2", "Z2"],
  D_Wing_2: ["Commons_2"],

  // ── Floor 3 ───────────────────────────────────────────────────
  // No lobby on floor 3 — front stair only goes to floors 1 and 2
  Commons_3: ["C_Pod_3", "Z_Pod_3", "B_Pod_3"],
  A_Pod_3: ["A_Stair", "B_Pod_3", "Z_Pod_3", "Z2", "A2"],
  B_Pod_3: ["Commons_3", "B_Stair", "A_Pod_3", "C_Pod_3", "A2", "B2"],
  C_Pod_3: ["Commons_3", "C_Stair", "B_Pod_3", "B2"],
  Z_Pod_3: ["Commons_3", "Z_Stair", "A_Pod_3", "Z2"],

  // ── Primary stairs (inside each pod, all 3 floors) ────────────
  A_Stair: ["A_Pod_1", "A_Pod_2", "A_Pod_3"],
  B_Stair: ["B_Pod_1", "B_Pod_2", "B_Pod_3"],
  C_Stair: ["C_Pod_1", "C_Pod_2", "C_Pod_3"],
  Z_Stair: ["Z_Pod_1", "Z_Pod_2", "Z_Pod_3"],

  // ── Secondary cross-pod stairs (same floor, between pods) ─────
  Z2: ["Z_Pod_1", "A_Pod_1", "Z_Pod_2", "A_Pod_2", "Z_Pod_3", "A_Pod_3"],
  A2: ["A_Pod_1", "B_Pod_1", "A_Pod_2", "B_Pod_2", "A_Pod_3", "B_Pod_3"],
  B2: ["B_Pod_1", "C_Pod_1", "B_Pod_2", "C_Pod_2", "B_Pod_3", "C_Pod_3"],

  // ── Front office stair (lobby area, floors 1–2 only) ──────────
  Front_Stair: ["Lobby_1", "Lobby_2"],
};

// Auto-inject every room → its pod (bidirectional)
for (const [room, pod] of Object.entries(allRooms)) {
  schoolGraph[room] = [pod];
  if (!schoolGraph[pod]) schoolGraph[pod] = [];
  if (!schoolGraph[pod].includes(room)) schoolGraph[pod].push(room);
}

// ── Front office rooms ────────────────────────────────────────────
// Any A-room with exactly 2 digits (A10–A99, plus lettered suffixes like
// A51A/A53B) is a FRONT OFFICE room located at the building front / main
// lobby — NOT inside the A Pod classroom diamond (those are 3-digit, A100+).
// These connect to the lobby on their floor, reached from A Pod or C Pod
// via the shortcut hallway past the trophy case / Harvard Room.
export function isFrontOfficeRoom(room) {
  return /^A\d{2}[A-Z]?$/.test(room);
}

for (const room of Object.keys(allRooms)) {
  if (!isFrontOfficeRoom(room)) continue;
  // A32 (Nurse's Office) is the one 2-digit exception: the original map
  // accesses it from the A100 inter-pod corridor, not the lobby. Left as-is.
  if (room === "A32") continue;
  const lobby = getRoomFloor(room) === 2 ? "Lobby_2" : "Lobby_1";
  schoolGraph[room] = [lobby];
  if (!schoolGraph[lobby]) {
    schoolGraph[lobby] =
      lobby === "Lobby_2"
        ? ["A_Pod_2", "C_Pod_2", "Front_Stair"]
        : ["A_Pod_1", "C_Pod_1", "Front_Stair"];
  }
  if (!schoolGraph[lobby].includes(room)) schoolGraph[lobby].push(room);

  // Strip the office room out of every pod's neighbor list so the ONLY
  // way the pathfinder can reach it is through the lobby (which forces the
  // trophy-case / Harvard Room shortcut directions to be generated).
  for (const node of Object.keys(schoolGraph)) {
    if (node === lobby) continue;
    schoolGraph[node] = schoolGraph[node].filter((nb) => nb !== room);
  }
}

export function getRoomFloor(room) {
  const pod = allRooms[room];
  if (!pod) return null;
  if (pod.endsWith("_3")) return 3;
  if (pod.endsWith("_2")) return 2;
  return 1;
}

export function getNodeFloor(node) {
  if (allRooms[node] !== undefined) return getRoomFloor(node);
  if (STAIR_NODES.has(node)) return null;
  if (node === "Lobby_1") return 1;
  if (node === "Lobby_2") return 2;
  if (node.endsWith("_3")) return 3;
  if (node.endsWith("_2")) return 2;
  if (node.endsWith("_1")) return 1;
  return 1;
}
