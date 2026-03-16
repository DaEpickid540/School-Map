// script.js
import { schoolGraph, getRoomFloor, STAIR_NODES } from "./schoolGraph.js";
import { findShortestPath } from "./pathfinding.js";
import { displayRooms } from "./displayRooms.js";

// ── Layout knowledge from studying floor plans ──────────────────
// Physical layout of Mason HS:
// - C Pod: north section, connects directly to Commons (C100 area) and D Wing
// - B Pod: east/northeast, diagonal. Connects to C Pod and Commons
// - A Pod: southeast, horizontal. Connects to B Pod via short hallway (near B100/B125b)
// - Z Pod: south, diagonal. Connects to A Pod (near A10/lobby area)
// - Commons: central hub (C100/D150 area), connects C Pod, B Pod, D Wing
// - D Wing: west, connects Commons to E/F Wing (auditorium, gym, natatorium)
//
// Stairwells (all connect floors 1-2-3):
// - C Stair: inside C Pod near C115/C108 area (upper section of C Pod)
// - B Stair: at the B Pod / C Pod / Commons junction near B114/B129 area
// - A Stair: at the B Pod / A Pod junction near B101/B125b connector
// - Z Stair: at the A Pod / Z Pod junction near A10/Z127 area

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

function getPodKey(node) {
  const m = node.match(/^([A-Z](?:_Pod|_Wing))_\d$/);
  if (m) return m[1];
  if (node.startsWith("Commons_")) return "Commons";
  return null;
}

function podDisplayName(node) {
  if (!node) return "";
  const key = getPodKey(node);
  return key
    ? POD_NAMES[key] || key.replace(/_/g, " ")
    : node.replace(/_/g, " ");
}

function floorLabel(f) {
  return f === 1 ? "1st floor" : f === 2 ? "2nd floor" : "3rd floor";
}

function roomPodKey(room) {
  const pod = schoolGraph[room]?.[0];
  return pod ? getPodKey(pod) : null;
}

// ── Hallway walk descriptions between pods ──────────────────────
// Based on actual floor plan study
function getWalkDescription(fromNode, toNode, floor) {
  const from =
    getPodKey(fromNode) ||
    (fromNode.startsWith("Commons") ? "Commons" : fromNode);
  const to =
    getPodKey(toNode) || (toNode.startsWith("Commons") ? "Commons" : toNode);
  const f = floor || 1;

  const key = `${from}->${to}`;
  const descriptions = {
    // C Pod ↔ Commons
    "C_Pod->Commons":
      "Walk south through C Pod past C100 (Food Court) into the Commons hallway",
    "Commons->C_Pod":
      "Walk north through the Commons past C100 (Food Court) into C Pod",
    // B Pod ↔ Commons
    "B_Pod->Commons": "Walk west through B Pod into the Commons hallway",
    "Commons->B_Pod": "Walk east through the Commons into B Pod",
    // B Pod ↔ C Pod
    "B_Pod->C_Pod":
      "Walk northwest through B Pod toward C Pod (pass B114/B129 area)",
    "C_Pod->B_Pod":
      "Walk southeast through C Pod toward B Pod (pass C101/C102 area)",
    // A Pod ↔ B Pod
    "A_Pod->B_Pod":
      "Walk northwest through the connector hallway from A Pod into B Pod (pass near B100/B125b)",
    "B_Pod->A_Pod":
      "Walk southeast through the connector hallway from B Pod into A Pod (pass near B100/B125b)",
    // A Pod ↔ Z Pod
    "A_Pod->Z_Pod":
      "Walk south through A Pod toward the lobby area (near A10/A11) into Z Pod",
    "Z_Pod->A_Pod":
      "Walk north through Z Pod past the lobby (near A10/A11) into A Pod",
    // Commons ↔ D Wing
    "Commons->D_Wing": "Walk west through the Commons into D Wing",
    "D_Wing->Commons": "Walk east through D Wing into the Commons",
    // D Wing ↔ E/F Wing
    "D_Wing->E_Wing": "Continue west through D Wing into E Wing",
    "E_Wing->D_Wing": "Walk east through E Wing back into D Wing",
    "D_Wing->F_Wing": "Continue west through D Wing into F Wing",
    "F_Wing->D_Wing": "Walk east through F Wing back into D Wing",
    // Z Pod ↔ Commons
    "Z_Pod->Commons":
      "Walk north through Z Pod into A Pod, then continue north through the connector to the Commons",
    "Commons->Z_Pod":
      "Walk south through the Commons into A Pod, then continue south into Z Pod",
  };

  return (
    descriptions[key] ||
    `Walk from ${podDisplayName(fromNode)} to ${podDisplayName(toNode)}`
  );
}

// ── Stair descriptions ──────────────────────────────────────────
function getStairDescription(stairNode, fromFloor, toFloor) {
  const dir = toFloor > fromFloor ? "up" : "down";
  const stairLocations = {
    C_Stair: "the C stairwell (located inside C Pod near rooms C108/C115)",
    B_Stair:
      "the B stairwell (located at the B Pod / Commons junction near B114/B129)",
    A_Stair:
      "the A stairwell (located in the B Pod / A Pod connector hallway near B101)",
    Z_Stair:
      "the Z stairwell (located at the A Pod / Z Pod junction near A10/Z127)",
  };
  const location =
    stairLocations[stairNode] ||
    `the ${stairNode.replace("_Stair", "")} stairwell`;
  return {
    main: `Take ${location} ${dir} to the <strong>${floorLabel(toFloor)}</strong>`,
    sub: `Look for stairwell signs labeled "${stairNode.replace("_Stair", "")}"`,
  };
}

// ── Room side hint ──────────────────────────────────────────────
function getRoomSideHint(roomName) {
  // Based on floor plan study - rooms on each side of hallways
  const num = parseInt(roomName.replace(/[^0-9]/g, ""), 10);
  if (isNaN(num)) return "";
  // In most pods, lower-numbered rooms are on one side, higher on the other
  // This is a rough heuristic - odd vs even within each pod
  const inPodNum = num % 100;
  if (inPodNum === 0) return ""; // hub rooms
  return inPodNum % 2 === 1
    ? "left side of the hallway"
    : "right side of the hallway";
}

// ── Main directions generator ───────────────────────────────────
function generateSteps(path, start, end) {
  const steps = [];
  const startFloor = getRoomFloor(start) || 1;
  const endFloor = getRoomFloor(end) || 1;
  let prevFloor = startFloor;
  let prevPodNode = schoolGraph[start]?.[0]; // the pod node of the start room

  // Step 1: Start
  const startPodName = podDisplayName(prevPodNode);
  steps.push({
    icon: "📍",
    text: `Start at <strong>${displayRooms[start] || start}</strong>`,
    sub: `${floorLabel(startFloor)} · ${startPodName}`,
  });

  let stairCount = 0;

  for (let i = 1; i < path.length; i++) {
    const node = path[i];

    // ── Stairwell ──
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
      steps.push({
        icon: toFloor > prevFloor ? "⬆️" : "⬇️",
        text: desc.main,
        sub: desc.sub,
      });
      prevFloor = toFloor;
      continue;
    }

    // ── Pod / Wing hub ──
    if (/^[A-Z](?:_Pod|_Wing)_\d$/.test(node) || /^Commons_\d$/.test(node)) {
      const walkDesc = getWalkDescription(prevPodNode || node, node, prevFloor);
      steps.push({
        icon: "🚶",
        text: walkDesc,
        sub: `Floor ${prevFloor}`,
      });
      prevPodNode = node;
      continue;
    }

    // ── Destination room ──
    if (node === end) {
      const sideHint = getRoomSideHint(end);
      const endPodName = podDisplayName(schoolGraph[end]?.[0] || "");
      steps.push({
        icon: "🎯",
        text: `Arrive at <strong>${displayRooms[end] || end}</strong>${sideHint ? ` — on the <strong>${sideHint}</strong>` : ""}`,
        sub: `${floorLabel(endFloor)} · ${endPodName}`,
      });
    }
  }

  const floors = [...new Set([startFloor, endFloor])].sort();
  return { steps, startFloor, endFloor, stairCount, floors };
}

// ── DOM ─────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  const startInput = document.getElementById("start");
  const endInput = document.getElementById("end");
  const datalist = document.getElementById("rooms");
  const goBtn = document.getElementById("goBtn");
  const dirBox = document.getElementById("directions");

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

  function go() {
    const start = startInput.value.trim().toUpperCase();
    const end = endInput.value.trim().toUpperCase();
    dirBox.className = "directions-box";
    dirBox.innerHTML = "";

    if (!start || !end)
      return showError("Please enter both a start room and destination.");
    if (start === end) return showError("You're already there! 🎉");
    if (!schoolGraph[start])
      return showError(`Room "${start}" not found. Check the spelling.`);
    if (!schoolGraph[end])
      return showError(`Room "${end}" not found. Check the spelling.`);

    const path = findShortestPath(schoolGraph, start, end);
    if (!path) return showError("No route could be found between those rooms.");

    const { steps, startFloor, endFloor, stairCount, floors } = generateSteps(
      path,
      start,
      end,
    );

    const floorBadge =
      floors.length > 1
        ? `<span class="badge badge-warn">Floors ${floors.join(" → ")}</span>`
        : `<span class="badge badge-ok">Floor ${floors[0]}</span>`;
    const stairBadge =
      stairCount > 0
        ? `<span class="badge badge-stair">🪜 ${stairCount} stairwell${stairCount > 1 ? "s" : ""}</span>`
        : "";

    let html = `
      <div class="dir-header">
        <div class="dir-title">Route: <strong>${displayRooms[start] || start}</strong> → <strong>${displayRooms[end] || end}</strong></div>
        <div class="dir-badges">${floorBadge}${stairBadge}</div>
      </div>
      <ol class="dir-steps">
    `;
    steps.forEach((step) => {
      html += `
        <li class="dir-step">
          <span class="step-icon">${step.icon}</span>
          <div class="step-body">
            <div class="step-main">${step.text}</div>
            ${step.sub ? `<div class="step-sub">${step.sub}</div>` : ""}
          </div>
        </li>
      `;
    });
    html += `</ol>`;
    dirBox.className = "directions-box dir-success";
    dirBox.innerHTML = html;
  }

  function showError(msg) {
    dirBox.className = "directions-box dir-error";
    dirBox.innerHTML = `<p>⚠️ ${msg}</p>`;
  }
});
