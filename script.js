import { schoolGraph } from "./schoolGraph.js";
import { findShortestPath } from "./pathfinding.js";
import { drawPathOnMap } from "./mapOverlay.js";
import { displayRooms } from "./displayRooms.js";

document.addEventListener("DOMContentLoaded", () => {
  const startInput = document.getElementById("start");
  const endInput = document.getElementById("end");
  const datalist = document.getElementById("rooms");

  // Auto-uppercase
  [startInput, endInput].forEach((input) => {
    input.addEventListener("input", () => {
      input.value = input.value.toUpperCase();
    });
  });

  // Populate dropdown
  Object.entries(displayRooms).forEach(([room, label]) => {
    const opt = document.createElement("option");
    opt.value = room;
    opt.textContent = label;
    datalist.appendChild(opt);
  });

  // Floor switching
  const floorButtons = document.querySelectorAll(".floor-btn");
  const floorImages = {
    1: document.getElementById("map-floor-1"),
    2: document.getElementById("map-floor-2"),
    3: document.getElementById("map-floor-3"),
  };

  let currentFloor = 1;

  floorButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const floor = Number(btn.dataset.floor);
      currentFloor = floor;

      floorButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      Object.values(floorImages).forEach((img) => img.classList.add("hidden"));
      floorImages[floor].classList.remove("hidden");

      drawPathOnMap(lastDrawnPath, currentFloor);
    });
  });

  // Multi-floor path storage
  let lastDrawnPath = [];

  // Navigation button
  document.getElementById("goBtn").addEventListener("click", () => {
    const start = startInput.value.trim();
    const end = endInput.value.trim();

    if (!start || !end) {
      document.getElementById("directions").innerText =
        "Please enter both rooms.";
      return;
    }

    const path = findShortestPath(schoolGraph, start, end);

    if (!path) {
      document.getElementById("directions").innerText = "No route found.";
      return;
    }

    lastDrawnPath = path;

    // Multi-floor segmentation
    const segments = splitPathByFloor(path);

    document.getElementById("directions").innerHTML =
      formatSegmentsForDisplay(segments);

    // Auto-switch to first floor segment
    const firstFloor = segments[0].floor;
    currentFloor = firstFloor;

    floorButtons.forEach((b) => b.classList.remove("active"));
    document
      .querySelector(`button[data-floor="${firstFloor}"]`)
      .classList.add("active");

    Object.values(floorImages).forEach((img) => img.classList.add("hidden"));
    floorImages[firstFloor].classList.remove("hidden");

    drawPathOnMap(path, firstFloor);
  });
});

// Determine floor from node name
function getFloorFromNode(node) {
  if (/_1$/.test(node)) return 1;
  if (/_2$/.test(node)) return 2;
  if (/_3$/.test(node)) return 3;

  const match = node.match(/^([A-Z])(\d)/);
  if (match) return Number(match[2]);

  return 1;
}

// Split path into floor segments
function splitPathByFloor(path) {
  const segments = [];
  let currentFloor = getFloorFromNode(path[0]);
  let currentSegment = { floor: currentFloor, nodes: [] };

  path.forEach((node) => {
    const floor = getFloorFromNode(node);
    if (floor !== currentFloor) {
      segments.push(currentSegment);
      currentFloor = floor;
      currentSegment = { floor, nodes: [] };
    }
    currentSegment.nodes.push(node);
  });

  segments.push(currentSegment);
  return segments;
}

// Display multi-floor steps
function formatSegmentsForDisplay(segments) {
  return segments
    .map(
      (seg) => `<strong>Floor ${seg.floor}:</strong> ${seg.nodes.join(" → ")}`,
    )
    .join("<br><br>");
}
