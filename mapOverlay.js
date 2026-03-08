import { coordinates_floor1 } from "./coordinates_floor1.js";
import { coordinates_floor2 } from "./coordinates_floor2.js";
import { coordinates_floor3 } from "./coordinates_floor3.js";

const canvas = document.createElement("canvas");
canvas.id = "mapCanvas";
canvas.style.position = "absolute";
canvas.style.top = "0";
canvas.style.left = "0";
canvas.style.pointerEvents = "none";

function getCoordsForFloor(floor) {
  if (floor === 2) return coordinates_floor2;
  if (floor === 3) return coordinates_floor3;
  return coordinates_floor1;
}

export function drawPathOnMap(path, floor) {
  const coords = getCoordsForFloor(floor);
  const mapContainer = document.querySelector(".map-container");
  const img = document.getElementById(`map-floor-${floor}`);

  if (!img) return;

  canvas.width = img.clientWidth;
  canvas.height = img.clientHeight;

  if (!canvas.parentElement) {
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
