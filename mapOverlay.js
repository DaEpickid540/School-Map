// mapOverlay.js
export function drawPathOnMap(path, coordinates) {
  const container = document.getElementById("mapContainer");
  container.innerHTML = ""; // clear old path

  for (let i = 0; i < path.length - 1; i++) {
    const a = coordinates[path[i]];
    const b = coordinates[path[i + 1]];

    if (!a || !b) continue;

    const line = document.createElement("div");
    line.classList.add("path-line");

    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);

    line.style.width = `${length}px`;
    line.style.left = `${a.x}px`;
    line.style.top = `${a.y}px`;
    line.style.transform = `rotate(${angle}deg)`;

    container.appendChild(line);
  }
}
