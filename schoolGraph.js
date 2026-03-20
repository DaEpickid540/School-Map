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

export const STAIR_NODES = new Set([
  "A_Stair",
  "B_Stair",
  "C_Stair",
  "Z_Stair", // primary vertical stairs
  "Z2",
  "A2",
  "B2", // secondary cross-pod stairs
]);

export const schoolGraph = {
  // ── Floor 1 ───────────────────────────────────────────────────
  Commons_1: ["C_Pod_1", "D_Wing_1", "Z_Pod_1", "B_Pod_1"],
  A_Pod_1: ["A_Stair", "B_Pod_1", "Z_Pod_1", "Z2", "A2"],
  B_Pod_1: ["Commons_1", "B_Stair", "A_Pod_1", "C_Pod_1", "A2", "B2"],
  C_Pod_1: ["Commons_1", "C_Stair", "B_Pod_1", "D_Wing_1", "B2"],
  Z_Pod_1: ["Commons_1", "Z_Stair", "A_Pod_1", "Z2"],
  D_Wing_1: ["Commons_1", "C_Pod_1", "E_Wing_1", "F_Wing_1"],
  E_Wing_1: ["D_Wing_1"],
  F_Wing_1: ["D_Wing_1"],

  // ── Floor 2 ───────────────────────────────────────────────────
  Commons_2: ["C_Pod_2", "D_Wing_2", "Z_Pod_2", "B_Pod_2"],
  A_Pod_2: ["A_Stair", "B_Pod_2", "Z_Pod_2", "Z2", "A2"],
  B_Pod_2: ["Commons_2", "B_Stair", "A_Pod_2", "C_Pod_2", "A2", "B2"],
  C_Pod_2: ["Commons_2", "C_Stair", "B_Pod_2", "B2"],
  Z_Pod_2: ["Commons_2", "Z_Stair", "A_Pod_2", "Z2"],
  D_Wing_2: ["Commons_2"],

  // ── Floor 3 ───────────────────────────────────────────────────
  Commons_3: ["C_Pod_3", "Z_Pod_3", "B_Pod_3"],
  A_Pod_3: ["A_Stair", "B_Pod_3", "Z_Pod_3", "Z2", "A2"],
  B_Pod_3: ["Commons_3", "B_Stair", "A_Pod_3", "C_Pod_3", "A2", "B2"],
  C_Pod_3: ["Commons_3", "C_Stair", "B_Pod_3", "B2"],
  Z_Pod_3: ["Commons_3", "Z_Stair", "A_Pod_3", "Z2"],

  // ── Primary stairs (connect all 3 floors) ─────────────────────
  A_Stair: ["A_Pod_1", "A_Pod_2", "A_Pod_3"],
  B_Stair: ["B_Pod_1", "B_Pod_2", "B_Pod_3"],
  C_Stair: ["C_Pod_1", "C_Pod_2", "C_Pod_3"],
  Z_Stair: ["Z_Pod_1", "Z_Pod_2", "Z_Pod_3"],

  // ── Secondary stairs (cross-pod, same floor level) ────────────
  Z2: ["Z_Pod_1", "A_Pod_1", "Z_Pod_2", "A_Pod_2", "Z_Pod_3", "A_Pod_3"],
  A2: ["A_Pod_1", "B_Pod_1", "A_Pod_2", "B_Pod_2", "A_Pod_3", "B_Pod_3"],
  B2: ["B_Pod_1", "C_Pod_1", "B_Pod_2", "C_Pod_2", "B_Pod_3", "C_Pod_3"],
};

// Auto-inject every room → its pod (bidirectional)
for (const [room, pod] of Object.entries(allRooms)) {
  schoolGraph[room] = [pod];
  if (!schoolGraph[pod]) schoolGraph[pod] = [];
  if (!schoolGraph[pod].includes(room)) schoolGraph[pod].push(room);
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
  if (node.endsWith("_3")) return 3;
  if (node.endsWith("_2")) return 2;
  if (node.endsWith("_1")) return 1;
  return 1;
}
