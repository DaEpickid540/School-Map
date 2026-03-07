import { coordinates_floor1 } from "./coordinates_floor1.js";
import { coordinates_floor2 } from "./coordinates_floor2.js";
import { coordinates_floor3 } from "./coordinates_floor3.js";

const canvas = document.createElement("canvas");
canvas.id = "mapCanvas";
canvas.style.position = "absolute";
canvas.style.top = "0";
canvas.style.left = "0";
canvas.style.pointerEvents = "none";

function getFloorForPath(path) {
  const has3 = path.some((n) => /_3$/.test(n)) || path.includes("Commons_3");
  const has2 = path.some((n) => /_2$/.test(n)) || path.includes("Commons_2");

  if (has3) return 3;
  if (has2) return 2;
  return 1; // default to floor 1
}

function getCoordinatesForFloor(floor) {
  if (floor === 2) return coordinates_floor2;
  if (floor === 3) return coordinates_floor3;
  return coordinates_floor1;
}

export function drawPathOnMap(path) {
  const floor = getFloorForPath(path);
  const coords = getCoordinatesForFloor(floor);

  const mapContainer = document.querySelector(".map-container");
  const img = document.getElementById(`map-floor-${floor}`);

  // Ensure correct floor image is visible
  document
    .querySelectorAll(".map-image")
    .forEach((i) => i.classList.add("hidden"));
  img.classList.remove("hidden");

  // Resize canvas to image
  canvas.width = img.clientWidth;
  canvas.height = img.clientHeight;

  if (!canvas.parentElement) {
    mapContainer.style.position = "relative";
    mapContainer.appendChild(canvas);
  }

  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "#ff0000";
  ctx.lineWidth = 4;
  ctx.lineJoin = "round";

  ctx.beginPath();

  path.forEach((node, i) => {
    const coord = coords[node];
    if (!coord) return;

    const x = (coord.x / 6300) * canvas.width;
    const y = (coord.y / 4500) * canvas.height;

    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });

  ctx.stroke();
}
