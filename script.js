import { schoolGraph } from "./schoolGraph.js";
import { findShortestPath } from "./pathfinding.js";
import { drawPathOnMap } from "./mapOverlay.js";

// Wait for DOM to load so inputs exist
document.addEventListener("DOMContentLoaded", () => {
  // Auto-uppercase for room inputs
  const startInput = document.getElementById("start");
  const endInput = document.getElementById("end");

  [startInput, endInput].forEach((input) => {
    input.addEventListener("input", () => {
      input.value = input.value.toUpperCase();
    });
  });

  // Button click handler
  document.getElementById("goBtn").addEventListener("click", () => {
    const start = startInput.value.trim();
    const end = endInput.value.trim();

    const path = findShortestPath(schoolGraph, start, end);

    if (!path) {
      document.getElementById("directions").innerText = "No route found.";
      return;
    }

    document.getElementById("directions").innerText =
      `Path: ${path.join(" → ")}`;

    drawPathOnMap(path, coordinates);
  });
});

// Placeholder coordinates until real map is added
const coordinates = {
  120: { x: 50, y: 300 },
  HallC: { x: 150, y: 300 },
  Stair2: { x: 250, y: 250 },
  "2F_Landing": { x: 250, y: 150 },
  245: { x: 350, y: 150 },
};
