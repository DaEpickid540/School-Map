// script.js
import {
  schoolGraph,
  getRoomFloor,
  STAIR_NODES,
  allRooms,
} from "./schoolGraph.js";
import { findShortestPath } from "./pathfinding.js";
import { displayRooms } from "./displayRooms.js";
import { GROQ_API_KEY, GROQ_MODEL, GROQ_ENDPOINT } from "./aiConfig.js";

const POD_NAMES = {
  A_Pod: "A Pod",
  B_Pod: "B Pod",
  C_Pod: "C Pod",
  Z_Pod: "Z Pod",
  D_Wing: "D Wing",
  E_Wing: "E Wing",
  F_Wing: "F Wing",
  Commons: "Commons",
};

const SECONDARY_STAIRS = new Set(["Z2", "A2", "B2"]);

// ── Pod wall-paint colors ────────────────────────────────────────
// Every classroom pod has its interior walls painted a distinct color.
// This is the single fastest landmark for confirming you're in the right
// pod, so we surface it everywhere the route enters or arrives at a pod.
//   A Pod → RED   ·   Z Pod → YELLOW   ·   B Pod → BLUE   ·   C Pod → ORANGE
const POD_COLORS = {
  A_Pod: { name: "RED", hex: "#e23b3b" },
  Z_Pod: { name: "YELLOW", hex: "#e0a800" },
  B_Pod: { name: "BLUE", hex: "#2f6bd6" },
  C_Pod: { name: "ORANGE", hex: "#e8801a" },
};

// B Pod sits directly across from the Dream Center (B125). Per request, we
// always surface this landmark whenever the route touches B Pod.
const DREAM_CENTER_NOTE =
  `🚪 <strong>B Pod is directly across from the Dream Center.</strong> Use the Dream Center as your landmark — B Pod's entrance is right opposite it.`;

// Accepts a pod key ("A_Pod"), pod node ("A_Pod_1"), or room name and returns
// the color record, or null for color-less areas (Commons, Lobby, D/E/F Wings).
function getPodColor(podKeyOrNode) {
  if (!podKeyOrNode) return null;
  if (POD_COLORS[podKeyOrNode]) return POD_COLORS[podKeyOrNode];
  const key = getPodKey(podKeyOrNode);
  if (key && POD_COLORS[key]) return POD_COLORS[key];
  // Fall back to first letter ONLY for actual room names like "B125" (a pod
  // letter immediately followed by a digit). This avoids matching area names
  // such as "Commons" (which starts with C but is not the C Pod).
  const node = String(podKeyOrNode);
  if (/^[A-Z]\d/.test(node)) {
    const guess = `${node[0]}_Pod`;
    return POD_COLORS[guess] || null;
  }
  return null;
}

// A colored inline swatch + label, e.g. a blue "BLUE" pill.
function colorSwatch(color) {
  return `<strong style="color:${color.hex}">${color.name}</strong>`;
}

// Sentence telling the user to confirm the pod by its wall color.
function podColorConfirm(podKeyOrNode, podLabel) {
  const c = getPodColor(podKeyOrNode);
  if (!c) return null;
  return `🎨 ${podLabel || "This pod"} has walls painted ${colorSwatch(
    c,
  )} — if the walls aren't ${c.name.toLowerCase()}, you're in the wrong pod.`;
}

// Appends pod-color confirmation (and the Dream Center landmark for B Pod) to
// a piece of guidance text. `podKeyOrNode` identifies the pod being entered.
function decoratePodCues(text, podKeyOrNode) {
  const key = getPodKey(podKeyOrNode) || podKeyOrNode;
  const podLabel = POD_NAMES[key] || (key ? key.replace(/_/g, " ") : null);
  const extras = [];
  const colorLine = podColorConfirm(podKeyOrNode, podLabel);
  if (colorLine) extras.push(colorLine);
  if (key === "B_Pod") extras.push(DREAM_CENTER_NOTE);
  return extras.length ? `${text} ${extras.join(" ")}` : text;
}

// ── Room number helpers ──────────────────────────────────────────
function getRoomInPodNum(roomName) {
  const num = parseInt(roomName.replace(/[^0-9]/g, ""), 10);
  if (isNaN(num)) return null;
  return num % 100;
}

function isInnerHallwayRoom(roomName) {
  // Rooms X01–X14 are on the inner hallway (water fountain / locker path)
  const n = getRoomInPodNum(roomName);
  return n !== null && n >= 1 && n <= 14;
}

function isInterPodCorridorRoom(roomName) {
  // Rooms X15–X30+ including X122, X125–X127 are on the inter-pod corridor side
  // or special rooms like X118(bath), X119(node), X115(node), X122(entry), X125-X127
  const n = getRoomInPodNum(roomName);
  return n !== null && (n === 0 || n >= 15);
}

function isAdminRoom(roomName) {
  // A14–A32 (floor 1 admin) and A51A/B, A52–A71 (floor 2 admin)
  if (!roomName.startsWith("A")) return false;
  const n = parseInt(roomName.replace(/[^0-9]/g, ""), 10);
  if (isNaN(n)) return false;
  return (n >= 14 && n <= 32) || (n >= 51 && n <= 71);
}

// Any A-room with exactly 2 digits is a FRONT OFFICE room at the building
// front / main lobby — NOT inside the A Pod classroom diamond (3-digit rooms).
function isFrontOfficeRoom(roomName) {
  return /^A\d{2}[A-Z]?$/.test(roomName);
}

// Music rooms — reached through the cafeteria / commons. NOTE: inferred from
// the floor plan (Music Entry + Music/Dining Entry). Adjust this list if any
// room is wrong.
const MUSIC_ROOMS = new Set(["C131", "D102", "D158", "D167", "D168"]);

// ── After-stair navigation hint ──────────────────────────────────
// Called after the user has arrived at the secondary stair landing.
// Returns guidance on which direction to walk to reach the destination.
function getAfterSecondaryStairHint(stairNode, destRoom, destPod) {
  const podLetter = destRoom[0]; // 'A', 'B', 'C', 'Z'
  const inPodNum = getRoomInPodNum(destRoom);

  if (stairNode === "A2") {
    // A2 is in the connector between B Pod and A Pod
    // Going up: B Pod is on the RIGHT, A Pod is on the LEFT
    if (destPod.startsWith("B_Pod")) {
      if (isInnerHallwayRoom(destRoom)) {
        return `At the top of A2, turn <strong>RIGHT</strong> into B Pod. Walk down the hallway toward the water fountain and lockers — ${destRoom} is along this path (B101–B114 side).`;
      }
      return `At the top of A2, turn <strong>RIGHT</strong> into B Pod. Follow the inter-pod corridor toward B100 — ${destRoom} is off this corridor.`;
    }
    if (destPod.startsWith("A_Pod")) {
      if (isAdminRoom(destRoom)) {
        return `At A2, turn <strong>LEFT</strong> into A Pod. Pass through A Pod toward A11 (Front Desk). The admin rooms (A14–A32 / A51–A71) are on the <strong>right side path behind A11</strong>, opposite the A1 stairwell entrance.`;
      }
      if (isInnerHallwayRoom(destRoom)) {
        return `At A2, turn <strong>LEFT</strong> into A Pod. Walk down the hallway toward the water fountain and lockers — ${destRoom} is along this path (A101–A114 side).`;
      }
      return `At A2, turn <strong>LEFT</strong> into A Pod. Follow the inter-pod corridor toward A100 — ${destRoom} is off this corridor.`;
    }
  }

  if (stairNode === "Z2") {
    // Z2 is in the connector between A Pod and Z Pod
    if (destPod.startsWith("A_Pod")) {
      if (isAdminRoom(destRoom)) {
        return `At Z2, enter A Pod. Pass through toward A11 (Front Desk). Admin rooms are on the <strong>right side path behind A11</strong>, opposite the A1 stairwell entrance.`;
      }
      if (isInnerHallwayRoom(destRoom)) {
        return `At Z2, enter A Pod and walk toward the water fountain / lockers — ${destRoom} is along this path (A101–A114 side).`;
      }
      return `At Z2, enter A Pod and follow the inter-pod corridor toward A100 — ${destRoom} is off this corridor.`;
    }
    if (destPod.startsWith("Z_Pod")) {
      if (isInnerHallwayRoom(destRoom)) {
        return `At Z2, enter Z Pod and walk toward the water fountain / lockers — ${destRoom} is along this path (Z101–Z114 side).`;
      }
      return `At Z2, enter Z Pod and follow the inter-pod corridor toward Z100 — ${destRoom} is off this corridor.`;
    }
  }

  if (stairNode === "B2") {
    // B2 is in the connector between B Pod and C Pod
    if (destPod.startsWith("B_Pod")) {
      if (isInnerHallwayRoom(destRoom)) {
        return `At B2, enter B Pod and walk toward the water fountain / lockers — ${destRoom} is along this path (B101–B114 side).`;
      }
      return `At B2, enter B Pod and follow the inter-pod corridor toward B100 — ${destRoom} is off this corridor.`;
    }
    if (destPod.startsWith("C_Pod")) {
      if (isInnerHallwayRoom(destRoom)) {
        return `At B2, enter C Pod and walk toward the water fountain / lockers — ${destRoom} is along this path (C101–C114 side).`;
      }
      return `At B2, enter C Pod and follow the inter-pod corridor toward C100 — ${destRoom} is off this corridor.`;
    }
  }

  return null;
}

// ── After-primary-stair navigation hint ─────────────────────────
// When using the pod's own staircase (A1/B1/C1/Z1), landing inside that pod.
function getAfterPrimaryStairHint(stairNode, destRoom, destPod) {
  const podLetter = stairNode.replace("_Stair", "")[0]; // 'A','B','C','Z'
  const podFloor = getRoomFloor(destRoom) || 1;
  const inPodNum = getRoomInPodNum(destRoom);

  if (!destPod) return null;

  // The primary stair lands INSIDE the pod (e.g. B1 red dot near B115/B108)
  // After landing, rooms B01–B14 → go toward water fountain/lockers
  // Rooms B15+ / B118 / B122 / B125–B127 / B128 → go toward inter-pod corridor
  // Admin rooms → right side behind front desk

  if (isAdminRoom(destRoom)) {
    return `You are now inside A Pod at the A${
      podFloor === 1 ? "1" : podFloor === 2 ? "" : ""
    }  stairwell. The admin rooms are on the <strong>right side path behind A11 (Front Desk)</strong>, opposite to where you entered. Walk toward A11 and take the right-side corridor.`;
  }
  if (isInnerHallwayRoom(destRoom)) {
    return `You are now inside ${podLetter} Pod at the main stairwell. Walk toward the <strong>water fountain and lockers</strong> — ${destRoom} is along this hallway path (${podLetter}101–${podLetter}114 side).`;
  }
  if (inPodNum !== null && inPodNum >= 15) {
    return `You are now inside ${podLetter} Pod at the main stairwell. Walk toward the <strong>inter-pod corridor</strong> (the hallway that connects all pods via their 100-series nodes) — ${destRoom} is off this corridor.`;
  }
  return null;
}

// ── Pod key helpers ──────────────────────────────────────────────
function getPodKey(node) {
  if (!node) return null;
  const m = node.match(/^([A-Z](?:_Pod|_Wing))_\d$/);
  if (m) return m[1];
  if (node.startsWith("Commons_")) return "Commons";
  return null;
}

function podDisplayName(node) {
  if (!node) return "";
  if (node === "Lobby_1" || node === "Lobby_2")
    return "Front Office / Main Lobby";
  const key = getPodKey(node);
  return key
    ? POD_NAMES[key] || key.replace(/_/g, " ")
    : node.replace(/_/g, " ");
}

function floorLabel(f) {
  return f === 1 ? "1st floor" : f === 2 ? "2nd floor" : "3rd floor";
}

// ── Walk descriptions between pods ──────────────────────────────
function getWalkDescription(fromNode, toNode, floor) {
  const resolve = (n) => {
    if (n === "Lobby_1" || n === "Lobby_2") return "Lobby";
    return getPodKey(n) || (n?.startsWith("Commons") ? "Commons" : n);
  };
  const from = resolve(fromNode);
  const to = resolve(toNode);
  const f = floor || 1;

  const interPodCorridor = {
    1: "inter-pod corridor (Z100 → A100 → B100 → C100 → ends at D150 Large Cafeteria)",
    2: "inter-pod corridor (Z200 → A200 → B200 → C200 → ends at D213 Weight Room)",
    3: "inter-pod corridor (Z300 → A300 → B300 → C300)",
  };

  const desc = {
    "C_Pod->Commons": `Walk south through C Pod. Pass through C100 (Food Court hub) into the main Commons hallway. You are using the ${interPodCorridor[f]}.`,
    "Commons->C_Pod": `Enter C Pod heading north from the Commons through C100 into the main C Pod hallway.`,
    "B_Pod->Commons": `Walk west from B Pod through B100 into the Commons. The Commons connects C Pod, B Pod, and D Wing.`,
    "Commons->B_Pod": `Walk east from the Commons into B Pod through B100.`,
    "B_Pod->C_Pod": `Walk northwest from B Pod toward C Pod. Pass through the B114 area near the B Stairwell (B1, the <em>inside</em> stairwell near B115/B108) at the B Pod / Commons junction.`,
    "C_Pod->B_Pod": `Walk southeast from C Pod toward B Pod, passing through the C101/C102 area near the C Pod / Commons junction.`,
    "A_Pod->B_Pod": `Walk northwest through the A–B connector hallway. <strong>Note:</strong> the A2 stairwell (blue dot) is located in this connector between B Pod and A Pod — B Pod is on the right at the top of A2, A Pod is on the left. The A Stairwell (A1, the <em>inside</em> stairwell) is also accessible from within A Pod near A115/A108. Pass near B100 and B125b (Maker Space).`,
    "B_Pod->A_Pod": `Walk southeast through the connector hallway from B Pod into A Pod. <strong>Note:</strong> the A2 stairwell (blue dot) is in this connector — B Pod is on the right at the top of A2, A Pod is on the left. Pass near B100 / B125b (Maker Space).`,
    "A_Pod->Z_Pod": `Walk south through A Pod toward the lobby area. Pass through the A Pod entrance (near A11 Front Desk / A122). The Z Stairwell (Z1) is at this A Pod / Z Pod junction near A122 / Z127. The Z2 stairwell (secondary) is also in this connector area.`,
    "Z_Pod->A_Pod": `Walk north through Z Pod past the lobby (near Z122 / A11 Front Desk). The Z1 stairwell and Z2 secondary stairwell are both at this junction.`,
    "Commons->D_Wing": `Walk west from the Commons into D Wing. <strong>Shortcut:</strong> from C Pod, use the cutthrough hallway at C115 which leads directly in front of D101 (Small Cafeteria), bypassing the main Commons.`,
    "D_Wing->Commons": `Walk east through D Wing back into the Commons. D Wing contains the auditorium (D138), gym (D123), pool (D136), and cafeteria (D150 / D101).`,
    "D_Wing->E_Wing": `Continue west through D Wing past the gym area into E Wing.`,
    "E_Wing->D_Wing": `Walk east through E Wing back into D Wing.`,
    "D_Wing->F_Wing": `Continue west through D Wing into F Wing.`,
    "F_Wing->D_Wing": `Walk east through F Wing back into D Wing.`,
    "Z_Pod->Commons": `Walk north through Z Pod, through the Z Pod / A Pod junction, continue north through A Pod, through the A–B connector (past A2 stairwell), into the Commons via B Pod.`,
    "Commons->Z_Pod": `From the Commons, walk south through B Pod, through the A–B connector (past A2 stairwell), through A Pod, and south through the A Pod / Z Pod junction into Z Pod.`,

    // ── Front office / lobby shortcut (floors 1 & 2) ───────────────
    // The A Pod ↔ front office and C Pod ↔ front office hops use the
    // shortcut hallway that runs past the trophy case and the Harvard Room.
    "A_Pod->Lobby": `Take the <strong>shortcut hallway</strong> from A Pod toward the front office / building front. <strong>Walk past the trophy case and the Harvard Room</strong> — this hallway leads straight to the main lobby and front desk.`,
    "Lobby->A_Pod": `From the front office / main lobby, take the <strong>shortcut hallway</strong> toward A Pod. <strong>Go past the Harvard Room and the trophy case</strong> — the hallway opens into the A Pod classroom area.`,
    "C_Pod->Lobby": `Take the <strong>shortcut hallway</strong> from C Pod toward the front office / building front. <strong>Walk past the Harvard Room and the trophy case</strong> — this hallway leads straight to the main lobby and front desk.`,
    "Lobby->C_Pod": `From the front office / main lobby, take the <strong>shortcut hallway</strong> toward C Pod. <strong>Go past the trophy case and the Harvard Room</strong> — the hallway opens into C Pod.`,
  };

  const baseText =
    desc[`${from}->${to}`] ||
    `Walk from ${podDisplayName(fromNode)} to ${podDisplayName(toNode)}`;

  // Layer in the destination pod's wall color (and the Dream Center landmark
  // for B Pod) so the walker can confirm they've arrived in the right pod.
  return decoratePodCues(baseText, to);
}

// ── Stair descriptions ───────────────────────────────────────────
const STAIR_LOCATIONS = {
  // Primary stairs — INSIDE each pod (red dot equivalent)
  A_Stair:
    "the A Stairwell (A1) — the <strong>inside stairwell</strong> located within A Pod near A115 and A108",
  B_Stair:
    "the B Stairwell (B1) — the <strong>inside stairwell</strong> located within B Pod near B115 and B108",
  C_Stair:
    "the C Stairwell (C1) — the <strong>inside stairwell</strong> located within C Pod near C115 and C108",
  Z_Stair:
    "the Z Stairwell (Z1) — the <strong>inside stairwell</strong> located within Z Pod near Z115 and Z108",
};

const SECONDARY_STAIR_DESC = {
  // Secondary stairs — BETWEEN pods in connector hallways (blue dot equivalent)
  Z2: {
    loc:
      "the Z2 stairwell — the <strong>connector stairwell between Z Pod and A Pod</strong>, located in the hallway between the two pods",
    label: "Z2",
    orientation:
      'Z Pod (<strong style="color:#e0a800">YELLOW</strong> walls) is on one side, A Pod (<strong style="color:#e23b3b">RED</strong> walls) is on the other',
  },
  A2: {
    loc:
      "the A2 stairwell — the <strong>connector stairwell between A Pod and B Pod</strong>, located in the hallway between the two pods (near B126/B126c below, above A Pod)",
    label: "A2",
    orientation:
      'going up: B Pod (<strong style="color:#2f6bd6">BLUE</strong> walls) is on the RIGHT, A Pod (<strong style="color:#e23b3b">RED</strong> walls) is on the LEFT',
  },
  B2: {
    loc:
      "the B2 stairwell — the <strong>connector stairwell between B Pod and C Pod</strong>, located in the hallway between the two pods",
    label: "B2",
    orientation:
      'B Pod (<strong style="color:#2f6bd6">BLUE</strong> walls) is on one side, C Pod (<strong style="color:#e8801a">ORANGE</strong> walls) is on the other',
  },
};

function getStairDescription(stairNode, fromFloor, toFloor) {
  const dir = toFloor > fromFloor ? "up" : toFloor < fromFloor ? "down" : null;
  const fLabel = floorLabel(toFloor);

  if (SECONDARY_STAIRS.has(stairNode)) {
    const d = SECONDARY_STAIR_DESC[stairNode];
    if (dir) {
      return {
        main: `Take ${d.loc} <strong>${dir}</strong> to the <strong>${fLabel}</strong>`,
        sub: `Orientation: ${d.orientation} · Look for signs labeled "${d.label}"`,
      };
    }
    return {
      main: `Pass through ${d.loc} to cross between pods`,
      sub: `Orientation: ${d.orientation} · Look for the passageway labeled "${d.label}"`,
    };
  }

  const loc =
    STAIR_LOCATIONS[stairNode] ||
    `the ${stairNode.replace("_Stair", "")} stairwell`;
  return {
    main: `Take ${loc} <strong>${
      dir || "to"
    }</strong> the <strong>${fLabel}</strong>`,
    sub: `This is the stairwell <em>inside</em> the pod · Look for signs labeled "${stairNode.replace(
      "_Stair",
      "",
    )}"`,
  };
}

// ── Room arrival hints ───────────────────────────────────────────
const ROOM_HINTS = {
  A11: "Front Desk — near the main A Pod entrance, right side path",
  A100: "Hallway hub — inter-pod corridor intersection of A Pod",
  A115: "Hallway node — mid-hallway intersection in A Pod",
  A118: "Bathroom — near A115 hallway node",
  A119: "Hallway node — end of A Pod hallway",
  A122: "A Pod hallway area — near the Z Pod / A Pod junction",
  A125: "Wing end, past A119",
  A126: "Wing end, past A119",
  A127: "Wing end, past A119",

  Z100: "Hallway hub — inter-pod corridor intersection of Z Pod",
  Z115: "Hallway node — mid-hallway intersection in Z Pod",
  Z118: "Bathroom — near Z115 hallway node",
  Z119: "Hallway node — end of Z Pod hallway",
  Z122:
    "Student Entry / Attendance — main student entrance, accessible from the Z Pod side",
  Z125: "Wing end, past Z119",
  Z126: "Wing end, past Z119",
  Z127: "Wing end, past Z119",

  B100: "Hallway hub — inter-pod corridor intersection of B Pod",
  B115: "Hallway node — mid-hallway intersection in B Pod",
  B118: "Bathroom — near B115 hallway node",
  B119: "Hallway node — end of B Pod hallway",
  B122: "B Pod hallway area",
  B125:
    "Dream Center — on the OPPOSITE side of B Pod from the main hallway, past B1/B115 stairwell",
  B125b:
    "Maker Space — in the A–B connector hallway area near the A2 stairwell",
  B125c: "Comet Cafe seating / Library — in the A–B connector hallway area",
  B126: "Wing end, past B119",
  B127: "Wing end, past B119",
  B128: "Comet Cafe (purchase counter) — near B115/B1 stairwell area",
  B129:
    "Dream Center Annex — ONLY accessible through Dream Center (B125). Enter B125 first.",

  C100: "Hallway hub — inter-pod corridor intersection / Food Court area",
  C115:
    "Hallway node — mid-hallway intersection. Cutthrough hallway here leads directly to D101.",
  C118: "Bathroom — near C115 hallway node",
  C119: "Hallway node — end of C Pod main hallway",
  C121: "Curved lobby / auditorium lobby — micro-hallway cluster with C122",
  C121A: "Curved lobby — part of C121 cluster",
  C122: "Curved lobby — micro-hallway cluster with C121",
  C122A: "Curved lobby — part of C122 cluster",
  C123: "Curved lobby area — NOT on the main straight hallway",
  C123A: "Curved lobby area — NOT on the main straight hallway",
  C124: "Curved lobby area — NOT on the main straight hallway",
  C125: "Harvard Room — auditorium-style, NOT on the main hallway",
  C126: "Inner hallway — C126 sub-rooms (A–P) connect only through C126",
  C126A: "Internal to C126 — enter through C126 first",
  C126B: "Internal to C126",
  C126C: "Internal to C126",
  C126D: "Internal to C126",
  C126E: "Internal to C126",
  C126F: "Internal to C126",
  C126G: "Internal to C126",
  C126H: "Internal to C126",
  C126J: "Internal to C126",
  C126K: "Internal to C126",
  C126L: "Internal to C126",
  C126M: "Internal to C126",
  C126N: "Internal to C126",
  C126P: "Internal to C126",
  C130: "Curved lobby area — NOT on the main straight hallway",

  D101:
    "Small Cafeteria — accessible via the C115 cutthrough hallway OR through the Commons",
  D123: "Field House / Gym — deep in D Wing, west side",
  D136: "Pool — deep in D Wing, west side",
  D138: "Auditorium — D Wing, south side",
  D150:
    "Large Commons / Cafeteria — end of the 1st floor inter-pod corridor (Z100→A100→B100→C100→D150)",
  D152: "Cafeteria purchase area — adjacent to D150",
  D158: "Music private rooms — D Wing near auditorium",
  D160: "Lunch purchase counters — near D150 cafeteria",
  D212: "Drama Room — Floor 2, D Wing",
  D213:
    "Weight Room — end of the 2nd floor inter-pod corridor (Z200→A200→B200→C200→D213)",
};

// Admin rooms share the same hint
const ADMIN_HINT =
  "Admin suite — on the RIGHT-SIDE PATH behind A11 (Front Desk), opposite from the A1 stairwell entrance. Walk past A11 and take the right corridor.";
for (let i = 14; i <= 32; i++) ROOM_HINTS[`A${i}`] = ADMIN_HINT;
ROOM_HINTS["A32"] =
  "Nurse's Office — accessible from A100 (the inter-pod corridor outside the main A Pod hallway)";
const adminF2 = ["A51A", "A51B", "A52", "A53", "A53A", "A53B", "A53C", "A53D"];
for (let i = 54; i <= 71; i++) adminF2.push(`A${i}`);
adminF2.forEach((r) => {
  ROOM_HINTS[r] =
    "Admin suite (Floor 2) — on the right-side path behind the admin area. Access via A Pod 2nd floor.";
});

// Generic inner-hallway rooms (B/A/C/Z 101–114) get water fountain hint
["A", "B", "C", "Z"].forEach((pod) => {
  [1, 2, 3].forEach((floor) => {
    const prefix = floor === 1 ? "" : floor.toString();
    for (let n = 1; n <= 14; n++) {
      const key = `${pod}${floor > 1 ? floor * 100 + n : n < 10 ? n : n}`;
      // Build actual key: A101, A201, A301, B101, etc.
      const roomKey = `${pod}${
        floor === 1 ? (n < 10 ? "10" + n : "1" + n) : floor * 100 + n
      }`;
      if (!ROOM_HINTS[roomKey]) {
        ROOM_HINTS[
          roomKey
        ] = `Inner hallway (${pod}101–${pod}114 side) — walk toward the water fountain and lockers after entering the pod`;
      }
    }
  });
});

function getArrivalHint(roomName) {
  if (ROOM_HINTS[roomName]) return ROOM_HINTS[roomName];
  // Front office rooms (2-digit A) live at the building front, not the pod
  if (isFrontOfficeRoom(roomName))
    return "Front office / main lobby — reached via the shortcut hallway past the trophy case and Harvard Room, not inside the A Pod classrooms";
  const n = getRoomInPodNum(roomName);
  if (n === null) return null;
  if (n === 0) return "Hallway hub — inter-pod corridor intersection";
  if (n <= 14)
    return "Inner hallway — walk toward the water fountain and lockers after entering the pod";
  if (n === 15) return "Mid-hallway node";
  if (n <= 19) return "Near the hallway end node";
  return "Near the wing end / inter-pod corridor side";
}

// ── Directions generator ─────────────────────────────────────────
function generateSteps(path, start, end) {
  const steps = [];
  const startFloor = getRoomFloor(start) || 1;
  const endFloor = getRoomFloor(end) || 1;
  let prevFloor = startFloor;
  let prevPodNode = schoolGraph[start]?.[0] || null;

  const startColor = getPodColor(prevPodNode);
  steps.push({
    icon: "📍",
    text: `Start at <strong>${displayRooms[start] || start}</strong>${
      startColor
        ? `<br><span style="font-size:0.9em">You're starting in ${podDisplayName(
            prevPodNode,
          )} — the pod with ${colorSwatch(startColor)} walls.</span>`
        : ""
    }`,
    sub: [
      floorLabel(startFloor),
      podDisplayName(prevPodNode),
      getArrivalHint(start),
    ]
      .filter(Boolean)
      .join(" · "),
  });

  let stairCount = 0;
  let lastStair = null;

  for (let i = 1; i < path.length; i++) {
    const node = path[i];

    // ── Stair node ──────────────────────────────────────────────
    if (STAIR_NODES.has(node)) {
      stairCount++;
      let toFloor = prevFloor;
      for (let j = i + 1; j < path.length; j++) {
        const f = getRoomFloor(path[j]);
        if (f !== null) {
          toFloor = f;
          break;
        }
      }
      const desc = getStairDescription(node, prevFloor, toFloor);
      const isUp = toFloor > prevFloor;
      const isDown = toFloor < prevFloor;
      steps.push({
        icon: isUp ? "⬆️" : isDown ? "⬇️" : "↔️",
        text: desc.main,
        sub: desc.sub,
      });
      prevFloor = toFloor;
      lastStair = node;

      // After secondary stair, add orientation hint if next room is the destination
      if (SECONDARY_STAIRS.has(node) && i + 1 < path.length) {
        const nextNode = path[i + 1];
        // Find the eventual destination pod
        const destPod = allRooms[end];
        if (destPod) {
          const hint = getAfterSecondaryStairHint(node, end, destPod);
          if (hint) {
            steps.push({
              icon: "↩️",
              text: decoratePodCues(hint, destPod),
              sub: `Navigating within ${podDisplayName(
                destPod,
              )} after exiting stairwell`,
            });
          }
        }
      }
      continue;
    }

    // ── Pod / wing hub (incl. front office lobby) ───────────────
    if (
      /^[A-Z](?:_Pod|_Wing)_\d$/.test(node) ||
      /^Commons_\d$/.test(node) ||
      node === "Lobby_1" ||
      node === "Lobby_2"
    ) {
      const resolveKey = (n) =>
        n === "Lobby_1" || n === "Lobby_2"
          ? "Lobby"
          : getPodKey(n) || (n?.startsWith("Commons") ? "Commons" : null);
      const pk = resolveKey(prevPodNode);
      const ck = resolveKey(node);
      if (pk && ck && pk === ck) {
        prevPodNode = node;
        continue;
      }
      steps.push({
        icon: "🚶",
        text: getWalkDescription(prevPodNode, node, prevFloor),
        sub: `${floorLabel(prevFloor)} · heading toward ${podDisplayName(
          node,
        )}`,
      });
      prevPodNode = node;
      continue;
    }

    // ── Destination ─────────────────────────────────────────────
    if (node === end) {
      const endPodName = podDisplayName(schoolGraph[end]?.[0] || "");
      const hint = getArrivalHint(end);

      // Special access warnings
      const accessNote =
        end === "B129"
          ? "⚠ B129 is ONLY accessible through Dream Center (B125) — enter B125 first."
          : end.startsWith("C126") && end !== "C126"
          ? `⚠ ${end} is internal to C126 — enter through C126 first.`
          : end === "C125"
          ? "Note: Harvard Room (C125) is auditorium-style, not on the main hallway."
          : end === "C123" || end === "C124" || end === "C130"
          ? "Note: This room is in the curved lobby area, not the main straight hallway."
          : null;

      // After-primary-stair hint (if last stair used was a primary stair)
      let primaryStairHint = null;
      if (lastStair && !SECONDARY_STAIRS.has(lastStair)) {
        const destPod = allRooms[end];
        if (destPod)
          primaryStairHint = getAfterPrimaryStairHint(lastStair, end, destPod);
      }

      // Music rooms are reached through the cafeteria: head toward the
      // Music/Dining exit, past the music note on the floor, then turn right
      // just before the exit door.
      const musicNote = MUSIC_ROOMS.has(end)
        ? `🎵 Coming through the cafeteria: walk past the <strong>music note on the floor</strong> heading toward the exit, then <strong>turn right just before the door</strong> to reach the music rooms.`
        : null;

      // Destination pod wall-color confirmation + Dream Center landmark for B.
      const endPodNode = schoolGraph[end]?.[0] || "";
      const endColor = getPodColor(endPodNode);
      const endColorNote = endColor
        ? `🎨 ${endPodName} has walls painted ${colorSwatch(
            endColor,
          )} — confirming the wall color is the quickest way to know you've arrived in the right pod.`
        : null;
      const dreamNote =
        getPodKey(endPodNode) === "B_Pod" ? DREAM_CENTER_NOTE : null;

      steps.push({
        icon: "🎯",
        text: `Arrive at <strong>${displayRooms[end] || end}</strong>${
          accessNote
            ? `<br><span style="color:#ffaa00;font-size:0.9em">${accessNote}</span>`
            : ""
        }${
          musicNote
            ? `<br><span style="color:#7cc4ff;font-size:0.9em">${musicNote}</span>`
            : ""
        }${
          primaryStairHint
            ? `<br><span style="font-size:0.9em">${primaryStairHint}</span>`
            : ""
        }${
          endColorNote
            ? `<br><span style="font-size:0.9em">${endColorNote}</span>`
            : ""
        }${
          dreamNote
            ? `<br><span style="font-size:0.9em">${dreamNote}</span>`
            : ""
        }`,
        sub: [floorLabel(endFloor), endPodName, hint]
          .filter(Boolean)
          .join(" · "),
      });
    }
  }

  const floors = [...new Set([startFloor, endFloor])].sort();
  return { steps, stairCount, floors };
}

// ── Breadcrumb landmark trail ────────────────────────────────────
// A compact, scannable trail of the major landmarks a route passes
// through — pods (color-coded), stairwells, the Commons and the front
// office — so the walker can confirm at a glance they're on track.
function breadcrumbForNode(node) {
  if (STAIR_NODES.has(node)) {
    if (node === "Front_Stair") return { icon: "🪜", label: "Front Office stairs" };
    const lbl = node.replace("_Stair", "");
    return { icon: "🪜", label: SECONDARY_STAIRS.has(node) ? `${lbl} connector stairs` : `${lbl} stairs` };
  }
  if (node === "Lobby_1" || node === "Lobby_2")
    return { icon: "🏛️", label: "Front Office" };
  if (/^Commons_\d$/.test(node)) return { icon: "🍴", label: "Commons" };
  const key = getPodKey(node);
  if (key) {
    const c = POD_COLORS[key];
    return {
      icon: c ? "🎨" : "📍", // 🎨 only for color-coded pods; wings get a pin
      label: POD_NAMES[key] || key.replace(/_/g, " "),
      hex: c ? c.hex : null,
    };
  }
  return null;
}

function buildBreadcrumb(path, start, end) {
  const crumbs = [];
  const push = (c) => {
    if (!c) return;
    const last = crumbs[crumbs.length - 1];
    if (last && last.label === c.label) return; // collapse repeats
    crumbs.push(c);
  };
  push({ icon: "🟢", label: start });
  // Intermediate hub/stair nodes only (skip the endpoint room nodes).
  for (let i = 1; i < path.length - 1; i++) push(breadcrumbForNode(path[i]));
  push({ icon: "🏁", label: end });
  return crumbs;
}

function renderBreadcrumb(crumbs) {
  if (!crumbs || crumbs.length < 2) return "";
  const items = crumbs
    .map(
      (c) =>
        `<span class="crumb"${
          c.hex ? ` style="--crumb:${c.hex}"` : ""
        }><span class="crumb-icon">${c.icon}</span>${c.label}</span>`,
    )
    .join('<span class="crumb-sep">›</span>');
  return `<div class="dir-breadcrumb" aria-label="Route landmarks">${items}</div>`;
}

// ── HTML → speakable plain text (for text-to-speech) ─────────────
function stripHtml(html) {
  if (!html) return "";
  const tmp = document.createElement("div");
  tmp.innerHTML = String(html).replace(/<br\s*\/?>/gi, ". ");
  return (tmp.textContent || tmp.innerText || "").replace(/\s+/g, " ").trim();
}

// ── DOM ──────────────────────────────────────────────────────────
const startInput = document.getElementById("start");
const endInput = document.getElementById("end");
const datalist = document.getElementById("rooms");
const goBtn = document.getElementById("goBtn");
const dirBox = document.getElementById("directions");
const a11yToggle = document.getElementById("a11yToggle");
const aiQuery = document.getElementById("aiQuery");
const aiAskBtn = document.getElementById("aiAskBtn");
const aiKeyInput = document.getElementById("aiKey");
const aiKeySave = document.getElementById("aiKeySave");
const aiResult = document.getElementById("aiResult");
const aiStatus = document.getElementById("aiStatus");

Object.entries(displayRooms)
  .sort(([a], [b]) =>
    a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }),
  )
  .forEach(([room, label]) => {
    const opt = document.createElement("option");
    opt.value = room;
    opt.textContent = label;
    datalist.appendChild(opt);
  });

[startInput, endInput].forEach((inp) => {
  inp.addEventListener("input", () => {
    const pos = inp.selectionStart;
    inp.value = inp.value.toUpperCase();
    inp.setSelectionRange(pos, pos);
  });
});

goBtn.addEventListener("click", go);
[startInput, endInput].forEach((inp) =>
  inp.addEventListener("keydown", (e) => {
    if (e.key === "Enter") go();
  }),
);

// Keeps the most recent route's steps around for text-to-speech.
let lastSteps = [];

function go() {
  const start = startInput.value.trim().toUpperCase();
  const end = endInput.value.trim().toUpperCase();
  renderRoute(start, end);
}

// ── Route rendering ──────────────────────────────────────────────
// Validates the two rooms, computes the path, and paints the directions
// (breadcrumb + steps + share / read-aloud actions). Returns true on success.
function renderRoute(start, end, { speak } = {}) {
  stopSpeaking();
  dirBox.className = "directions-box";
  dirBox.innerHTML = "";
  lastSteps = [];

  if (!start || !end) {
    showError("Please enter both a start room and destination.");
    return false;
  }
  if (start === end) {
    showError("You're already there! 🎉");
    return false;
  }
  if (!schoolGraph[start]) {
    showError(`Room "${start}" not found. Check the spelling.`);
    return false;
  }
  if (!schoolGraph[end]) {
    showError(`Room "${end}" not found. Check the spelling.`);
    return false;
  }

  const path = findShortestPath(schoolGraph, start, end);
  if (!path) {
    showError("No route could be found between those rooms.");
    return false;
  }

  const { steps, stairCount, floors } = generateSteps(path, start, end);
  lastSteps = steps;

  const floorBadge =
    floors.length > 1
      ? `<span class="badge badge-warn">Floors ${floors.join(" → ")}</span>`
      : `<span class="badge badge-ok">Floor ${floors[0]}</span>`;
  const stairBadge =
    stairCount > 0
      ? `<span class="badge badge-stair">🪜 ${stairCount} stairwell${
          stairCount > 1 ? "s" : ""
        }</span>`
      : "";

  // ── Wall-color legend ───────────────────────────────────────────
  // Collect every colored pod this route passes through (start, end, and any
  // pod hub along the way) so the user can match wall paint to pod as they go.
  const routePodKeys = new Set();
  const addPodKey = (node) => {
    const k = getPodKey(node) || getPodKey(allRooms[node] || "");
    if (k && POD_COLORS[k]) routePodKeys.add(k);
  };
  path.forEach(addPodKey);
  addPodKey(start);
  addPodKey(end);

  const legend = routePodKeys.size
    ? `<div class="dir-legend">${[...routePodKeys]
        .map((k) => {
          const c = POD_COLORS[k];
          return `<span class="legend-item"><span class="legend-dot" style="background:${c.hex}"></span>${POD_NAMES[k]} = ${c.name} walls</span>`;
        })
        .join("")}</div>`
    : "";

  const breadcrumb = renderBreadcrumb(buildBreadcrumb(path, start, end));

  const actions = `
    <div class="dir-actions">
      <button type="button" class="dir-action" id="readBtn">🔊 Read aloud</button>
      <button type="button" class="dir-action" id="shareBtn">🔗 Share route</button>
    </div>`;

  let html = `
    <div class="dir-header">
      <div class="dir-title">Route: <strong>${
        displayRooms[start] || start
      }</strong> → <strong>${displayRooms[end] || end}</strong></div>
      <div class="dir-badges">${floorBadge}${stairBadge}</div>
      ${legend}
      ${breadcrumb}
      ${actions}
    </div>
    <ol class="dir-steps">`;

  steps.forEach((step) => {
    html += `
      <li class="dir-step">
        <span class="step-icon">${step.icon}</span>
        <div class="step-body">
          <div class="step-main">${step.text}</div>
          ${step.sub ? `<div class="step-sub">${step.sub}</div>` : ""}
        </div>
      </li>`;
  });

  html += `</ol>`;
  dirBox.className = "directions-box dir-success";
  dirBox.innerHTML = html;

  // Wire the contextual action buttons (re-created on every render).
  dirBox.querySelector("#readBtn")?.addEventListener("click", toggleSpeaking);
  dirBox
    .querySelector("#shareBtn")
    ?.addEventListener("click", () => shareRoute(start, end));

  // Reflect the chosen route in the URL so it can be shared / bookmarked.
  updateUrl(start, end);

  // Auto-read aloud when accessibility mode is on (or when asked explicitly).
  if (speak ?? accessibilityOn()) speakRoute();

  return true;
}

function showError(msg) {
  stopSpeaking();
  dirBox.className = "directions-box dir-error";
  dirBox.innerHTML = `<p>⚠️ ${msg}</p>`;
}

// ── Accessibility mode + text-to-speech ──────────────────────────
function accessibilityOn() {
  return localStorage.getItem("a11yMode") === "1";
}

function applyAccessibility(on) {
  document.body.classList.toggle("a11y", on);
  if (a11yToggle) a11yToggle.checked = on;
}

if (a11yToggle) {
  applyAccessibility(accessibilityOn());
  a11yToggle.addEventListener("change", () => {
    localStorage.setItem("a11yMode", a11yToggle.checked ? "1" : "0");
    applyAccessibility(a11yToggle.checked);
    if (a11yToggle.checked && lastSteps.length) speakRoute();
    else if (!a11yToggle.checked) stopSpeaking();
  });
}

const ttsSupported = "speechSynthesis" in window;

function speakRoute() {
  if (!ttsSupported || !lastSteps.length) return;
  window.speechSynthesis.cancel();
  const text = lastSteps
    .map((s, i) => {
      const main = stripHtml(s.text);
      const sub = s.sub ? `. ${stripHtml(s.sub)}` : "";
      return `Step ${i + 1}. ${main}${sub}`;
    })
    .join(". ");
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 0.97;
  u.onend = () => setReadButton(false);
  u.onerror = () => setReadButton(false);
  window.speechSynthesis.speak(u);
  setReadButton(true);
}

function stopSpeaking() {
  if (ttsSupported) window.speechSynthesis.cancel();
  setReadButton(false);
}

function toggleSpeaking() {
  if (!ttsSupported) {
    toast("Text-to-speech isn't supported in this browser.");
    return;
  }
  if (window.speechSynthesis.speaking) stopSpeaking();
  else speakRoute();
}

function setReadButton(speaking) {
  const btn = dirBox.querySelector("#readBtn");
  if (!btn) return;
  btn.textContent = speaking ? "⏹ Stop reading" : "🔊 Read aloud";
  btn.classList.toggle("active", speaking);
}

// ── Route sharing ────────────────────────────────────────────────
function buildShareUrl(start, end) {
  const u = new URL(window.location.href);
  u.search = `?from=${encodeURIComponent(start)}&to=${encodeURIComponent(end)}`;
  u.hash = "";
  return u.toString();
}

function updateUrl(start, end) {
  try {
    history.replaceState(null, "", buildShareUrl(start, end));
  } catch {
    /* replaceState can throw on file:// — non-fatal */
  }
}

async function shareRoute(start, end) {
  const url = buildShareUrl(start, end);
  const label = `${displayRooms[start] || start} → ${displayRooms[end] || end}`;
  if (navigator.share) {
    try {
      await navigator.share({
        title: "Mason Navigator route",
        text: `Walking directions: ${label}`,
        url,
      });
      return;
    } catch {
      /* user cancelled or share failed — fall through to copy */
    }
  }
  try {
    await navigator.clipboard.writeText(url);
    toast("Route link copied to clipboard!");
  } catch {
    toast(url);
  }
}

// ── Tiny toast ───────────────────────────────────────────────────
let toastTimer = null;
function toast(msg) {
  let el = document.getElementById("toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "toast";
    el.className = "toast";
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 3200);
}

// ── AI mode (Groq) ───────────────────────────────────────────────
function getGroqKey() {
  return (localStorage.getItem("groqApiKey") || GROQ_API_KEY || "").trim();
}

// Lock state lives in localStorage as { until: <ms epoch>, reason: <text> }.
function getAiLock() {
  try {
    const raw = JSON.parse(localStorage.getItem("groqLock") || "null");
    if (raw && raw.until && Date.now() < raw.until) return raw;
  } catch {
    /* corrupt value — ignore */
  }
  localStorage.removeItem("groqLock");
  return null;
}

function setAiLock(until, reason) {
  localStorage.setItem("groqLock", JSON.stringify({ until, reason }));
  refreshAiUI();
}

function startOfNextDay() {
  const d = new Date();
  d.setHours(24, 0, 5, 0); // a few seconds past local midnight
  return d.getTime();
}

// Decide how long to lock based on the 429 response. A daily-quota hit locks
// until tomorrow; a short per-minute rate limit locks only briefly.
function lockFromRateLimit(res, body) {
  const msg = (body?.error?.message || "").toLowerCase();
  const retryAfter = parseFloat(res.headers.get("retry-after")) || 0;
  if (msg.includes("day") || msg.includes("daily") || retryAfter > 3600) {
    setAiLock(startOfNextDay(), "Daily free Groq quota used up");
  } else {
    const ms = retryAfter ? retryAfter * 1000 : 60000;
    setAiLock(Date.now() + ms, "Groq rate limit — give it a moment");
  }
}

function fmtUnlock(ts) {
  const d = new Date(ts);
  const sameDay = d.toDateString() === new Date().toDateString();
  return sameDay
    ? `~${d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`
    : d.toLocaleString([], {
        weekday: "short",
        hour: "numeric",
        minute: "2-digit",
      });
}

// Reflect lock / key state in the AI panel.
function refreshAiUI() {
  if (!aiAskBtn) return;
  const lock = getAiLock();
  if (lock) {
    aiAskBtn.disabled = true;
    if (aiQuery) aiQuery.disabled = true;
    if (aiStatus) {
      aiStatus.textContent = `🔒 Locked`;
      aiStatus.className = "ai-status locked";
      aiStatus.title = `${lock.reason}. Unlocks ${fmtUnlock(lock.until)}.`;
    }
  } else {
    aiAskBtn.disabled = false;
    if (aiQuery) aiQuery.disabled = false;
    if (aiStatus) {
      const ready = !!getGroqKey();
      aiStatus.textContent = ready ? "● Ready" : "○ No key";
      aiStatus.className = `ai-status ${ready ? "ready" : ""}`;
      aiStatus.title = ready
        ? "AI mode is ready."
        : "Add a free Groq API key in API key settings to enable AI mode.";
    }
  }
}

// Build a compact catalog of the named landmarks so the model can map words
// like "gym" or "dream center" to real room codes.
function buildRoomCatalog() {
  return Object.entries(displayRooms)
    .filter(([code, label]) => /[ –-]/.test(label) && label.toUpperCase() !== code)
    .map(([code, label]) => `${code} = ${label.replace(/\s*–\s*/g, " - ")}`)
    .join("\n");
}

const AI_SYSTEM_PROMPT = `You translate a student's plain-English request into a start room and a destination room at Mason High School. The app then computes the actual walking route — you do NOT describe directions yourself.

Reply with ONLY a JSON object, no prose:
{"start": "<ROOM CODE or empty string>", "end": "<ROOM CODE or empty string>", "note": "<one short friendly sentence>"}

Room codes look like A115, B210, C305, Z101, D123. The first digit of the number is the floor (1xx = floor 1, 2xx = floor 2, 3xx = floor 3). Use a named location's code when the user names a place (e.g. "the gym", "front desk", "dream center"). If you cannot identify a room, set it to "" and explain in note. Never invent codes that are not real.

Named locations:
`;

async function callGroq(query) {
  const key = getGroqKey();
  if (!key) throw { type: "nokey" };

  const res = await fetch(GROQ_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      temperature: 0.1,
      max_tokens: 180,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: AI_SYSTEM_PROMPT + buildRoomCatalog() },
        { role: "user", content: query },
      ],
    }),
  });

  if (!res.ok) {
    let body = null;
    try {
      body = await res.json();
    } catch {
      /* no JSON body */
    }
    if (res.status === 429) {
      lockFromRateLimit(res, body);
      throw { type: "locked" };
    }
    if (res.status === 401 || res.status === 403) throw { type: "badkey" };
    throw { type: "http", status: res.status, body };
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content || "{}";
  try {
    return JSON.parse(content);
  } catch {
    throw { type: "parse", content };
  }
}

async function askAI() {
  if (!aiResult) return;
  if (getAiLock()) {
    refreshAiUI();
    const lock = getAiLock();
    aiResult.className = "ai-result warn";
    aiResult.innerHTML = `🔒 AI mode is locked — ${lock.reason}. It unlocks ${fmtUnlock(
      lock.until,
    )}. You can still use the room boxes above.`;
    return;
  }

  const query = (aiQuery?.value || "").trim();
  if (!query) {
    aiResult.className = "ai-result warn";
    aiResult.textContent = "Type a question first, e.g. “how do I get from B210 to the gym?”";
    return;
  }

  if (!getGroqKey()) {
    aiResult.className = "ai-result warn";
    aiResult.innerHTML =
      "No Groq API key set. Open <strong>API key settings</strong> below and paste a free key from console.groq.com/keys.";
    document.querySelector(".ai-advanced")?.setAttribute("open", "");
    return;
  }

  aiAskBtn.disabled = true;
  aiResult.className = "ai-result loading";
  aiResult.textContent = "🤔 Thinking…";

  try {
    const out = await callGroq(query);
    const start = String(out.start || "").trim().toUpperCase();
    const end = String(out.end || "").trim().toUpperCase();

    if (!start || !end) {
      aiResult.className = "ai-result warn";
      aiResult.textContent =
        out.note ||
        "I couldn't tell which rooms you meant. Try naming the room numbers, e.g. A115 to B210.";
      return;
    }
    if (!schoolGraph[start] || !schoolGraph[end]) {
      aiResult.className = "ai-result warn";
      aiResult.innerHTML = `I read that as <strong>${start} → ${end}</strong>, but ${
        !schoolGraph[start] ? start : end
      } isn't a room I know. Try a different name or use the boxes above.`;
      return;
    }

    startInput.value = start;
    endInput.value = end;
    aiResult.className = "ai-result ok";
    aiResult.innerHTML = `✨ ${
      out.note ? stripHtml(out.note) + " " : ""
    }Routing <strong>${displayRooms[start] || start}</strong> → <strong>${
      displayRooms[end] || end
    }</strong>…`;
    renderRoute(start, end);
    dirBox.scrollIntoView({ behavior: "smooth", block: "nearest" });
  } catch (err) {
    if (err.type === "locked") {
      const lock = getAiLock();
      aiResult.className = "ai-result warn";
      aiResult.innerHTML = `🔒 Out of free Groq capacity — ${
        lock?.reason || "rate limited"
      }. AI mode is locked until ${fmtUnlock(
        lock?.until || Date.now(),
      )}. The room boxes above still work.`;
    } else if (err.type === "nokey") {
      aiResult.className = "ai-result warn";
      aiResult.textContent = "No Groq API key set.";
    } else if (err.type === "badkey") {
      aiResult.className = "ai-result warn";
      aiResult.textContent =
        "That Groq API key was rejected. Double-check it in API key settings.";
    } else {
      aiResult.className = "ai-result warn";
      aiResult.textContent =
        "AI request failed. Check your connection and try again.";
    }
  } finally {
    refreshAiUI();
  }
}

if (aiAskBtn) {
  aiAskBtn.addEventListener("click", askAI);
  aiQuery?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) askAI();
  });
}

if (aiKeyInput) {
  aiKeyInput.value = localStorage.getItem("groqApiKey") || "";
  aiKeySave?.addEventListener("click", () => {
    const v = aiKeyInput.value.trim();
    if (v) localStorage.setItem("groqApiKey", v);
    else localStorage.removeItem("groqApiKey");
    toast(v ? "Groq API key saved in this browser." : "Groq API key cleared.");
    refreshAiUI();
  });
}

refreshAiUI();

// ── Deep-link: run a shared route from ?from=&to= on load ────────
(function loadFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const from = (params.get("from") || "").trim().toUpperCase();
  const to = (params.get("to") || "").trim().toUpperCase();
  if (from && to) {
    startInput.value = from;
    endInput.value = to;
    renderRoute(from, to);
  }
})();
