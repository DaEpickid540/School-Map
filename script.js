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

  floorButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const floor = btn.dataset.floor;

      floorButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      Object.values(floorImages).forEach((img) => img.classList.add("hidden"));
      floorImages[floor].classList.remove("hidden");
    });
  });

  // Navigation
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

    document.getElementById("directions").innerText =
      `Path: ${path.join(" → ")}`;

    drawPathOnMap(path);
  });
});
