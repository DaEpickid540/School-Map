// script.js
import { schoolGraph, getRoomFloor, STAIR_NODES } from "./schoolGraph.js";
import { findShortestPath } from "./pathfinding.js";
import {
  splitPathByFloor,
  drawAllSegments,
  clearAllCanvases,
} from "./mapOverlay.js";
import { displayRooms } from "./displayRooms.js";

document.addEventListener("DOMContentLoaded", () => {
  const startInput = document.getElementById("start");
  const endInput = document.getElementById("end");
  const datalist = document.getElementById("rooms");
  const goBtn = document.getElementById("goBtn");
  const dirBox = document.getElementById("directions");

  // ── Populate autocomplete ───────────────────────────────────────
  const sortedRooms = Object.entries(displayRooms).sort(([a], [b]) =>
    a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }),
  );
  sortedRooms.forEach(([room, label]) => {
    const opt = document.createElement("option");
    opt.value = room;
    opt.textContent = label;
    datalist.appendChild(opt);
  });

  // ── Auto-uppercase ──────────────────────────────────────────────
  [startInput, endInput].forEach((inp) => {
    inp.addEventListener("input", () => {
      const pos = inp.selectionStart;
      inp.value = inp.value.toUpperCase();
      inp.setSelectionRange(pos, pos);
    });
  });

  // ── Zoom sliders ────────────────────────────────────────────────
  [1, 2, 3].forEach((floor) => {
    const slider = document.getElementById(`zoom-floor-${floor}`);
    const wrapper = document.getElementById(`wrapper-floor-${floor}`);
    const img = document.getElementById(`map-floor-${floor}`);
    if (!slider || !wrapper || !img) return;

    let isDragging = false,
      startX,
      startY,
      startLeft,
      startTop;
    let currentZoom = 1;
    let panX = 0,
      panY = 0;

    function applyTransform() {
      img.style.transform = `scale(${currentZoom}) translate(${panX / currentZoom}px, ${panY / currentZoom}px)`;
      img.style.transformOrigin = "top left";
      // Resize canvas to match
      const canvas = document.getElementById(`canvas-floor-${floor}`);
      if (canvas) {
        canvas.style.transform = img.style.transform;
        canvas.style.transformOrigin = img.style.transformOrigin;
      }
    }

    slider.addEventListener("input", () => {
      currentZoom = parseFloat(slider.value);
      panX = 0;
      panY = 0;
      applyTransform();
    });

    // Pan via mouse drag when zoomed
    wrapper.addEventListener("mousedown", (e) => {
      if (currentZoom <= 1) return;
      isDragging = true;
      startX = e.clientX - panX;
      startY = e.clientY - panY;
      wrapper.style.cursor = "grabbing";
    });
    window.addEventListener("mousemove", (e) => {
      if (!isDragging) return;
      panX = e.clientX - startX;
      panY = e.clientY - startY;
      applyTransform();
    });
    window.addEventListener("mouseup", () => {
      isDragging = false;
      wrapper.style.cursor = currentZoom > 1 ? "grab" : "default";
    });
    // Touch pan
    wrapper.addEventListener(
      "touchstart",
      (e) => {
        if (currentZoom <= 1 || e.touches.length !== 1) return;
        startX = e.touches[0].clientX - panX;
        startY = e.touches[0].clientY - panY;
      },
      { passive: true },
    );
    wrapper.addEventListener(
      "touchmove",
      (e) => {
        if (currentZoom <= 1 || e.touches.length !== 1) return;
        panX = e.touches[0].clientX - startX;
        panY = e.touches[0].clientY - startY;
        applyTransform();
      },
      { passive: true },
    );
  });

  // ── Get Directions ──────────────────────────────────────────────
  goBtn.addEventListener("click", go);
  [startInput, endInput].forEach((inp) =>
    inp.addEventListener("keydown", (e) => {
      if (e.key === "Enter") go();
    }),
  );

  function go() {
    const start = startInput.value.trim().toUpperCase();
    const end = endInput.value.trim().toUpperCase();

    clearAllCanvases();
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

    const segments = splitPathByFloor(path);
    requestAnimationFrame(() => drawAllSegments(segments));

    // Scroll start floor into view
    const startFloor = getRoomFloor(start) || 1;
    document
      .getElementById(`map-floor-${startFloor}`)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });

    renderInstructions(path, start, end, segments);
  }

  function showError(msg) {
    dirBox.className = "directions-box dir-error";
    dirBox.innerHTML = `<p>⚠️ ${msg}</p>`;
  }

  function renderInstructions(path, start, end, segments) {
    const startFloor = getRoomFloor(start) || 1;
    const endFloor = getRoomFloor(end) || 1;
    const steps = [];
    let step = 1;

    steps.push(
      `<li><strong>${step++}.</strong> Start at <strong>${start}</strong> (Floor ${startFloor}).</li>`,
    );

    let prevFloor = startFloor;
    for (let i = 1; i < path.length; i++) {
      const node = path[i];
      if (STAIR_NODES.has(node)) {
        let toFloor = prevFloor;
        for (let j = i + 1; j < path.length; j++) {
          const f = getRoomFloor(path[j]);
          if (f !== null) {
            toFloor = f;
            break;
          }
        }
        const dir = toFloor > prevFloor ? "up" : "down";
        const label = node.replace("_Stair", "");
        steps.push(
          `<li><strong>${step++}.</strong> Take the <strong>${label} stairwell</strong> ${dir} to Floor ${toFloor}.</li>`,
        );
        prevFloor = toFloor;
        continue;
      }
      if (/^[A-Z]_Pod_\d$/.test(node)) {
        steps.push(
          `<li><strong>${step++}.</strong> Walk through the <strong>${node.replace("_Pod_" + node.slice(-1), "")} Pod</strong> hallway.</li>`,
        );
        continue;
      }
      if (/^Commons_\d$/.test(node)) {
        steps.push(
          `<li><strong>${step++}.</strong> Pass through the <strong>Commons</strong>.</li>`,
        );
        continue;
      }
      if (/^[A-Z]_Wing_\d$/.test(node)) {
        steps.push(
          `<li><strong>${step++}.</strong> Walk through <strong>${node.replace(/_/g, " ")}</strong>.</li>`,
        );
        continue;
      }
      if (node === end) {
        steps.push(
          `<li><strong>${step++}.</strong> Arrive at <strong>${end}</strong> (Floor ${endFloor}). 🎉</li>`,
        );
      }
    }

    const floors = [...new Set(segments.map((s) => s.floor))].sort();
    let hint = "";
    if (floors.length > 1) {
      hint = `<p class="dir-hint">📍 Route crosses floors ${floors.join(", ")}. Lines are shown on each floor's map.</p>`;
    }

    dirBox.className = "directions-box dir-success";
    dirBox.innerHTML =
      `<div class="dir-header">Route: <strong>${start}</strong> → <strong>${end}</strong></div>` +
      hint +
      `<ol class="dir-steps">${steps.join("")}</ol>`;
  }
});
