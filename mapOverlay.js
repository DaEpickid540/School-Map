// mapOverlay.js — draws route lines on all 3 floor canvases simultaneously
// Coordinates are stored in image pixel space; converted to canvas pixels at draw time.

import { coordinates_floor1 } from "./coordinates_floor1.js";
import { coordinates_floor2 } from "./coordinates_floor2.js";
import { coordinates_floor3 } from "./coordinates_floor3.js";
import { getNodeFloor, STAIR_NODES } from "./schoolGraph.js";

const IMG_W = { 1: 2000, 2: 2000, 3: 2000 };
const IMG_H = { 1: 1428, 2: 1428, 3: 1363 };

function getCoords(floor) {
  return floor === 3
    ? coordinates_floor3
    : floor === 2
      ? coordinates_floor2
      : coordinates_floor1;
}

function getCanvas(floor) {
  return document.getElementById(`canvas-floor-${floor}`);
}
function getImg(floor) {
  return document.getElementById(`map-floor-${floor}`);
}

// Per-floor zoom levels managed by slider
const floorZoom = { 1: 1, 2: 1, 3: 1 };
const floorPan = { 1: { x: 0, y: 0 }, 2: { x: 0, y: 0 }, 3: { x: 0, y: 0 } };

export function setFloorZoom(floor, zoom) {
  floorZoom[floor] = zoom;
}

function syncCanvas(floor) {
  const canvas = getCanvas(floor);
  const img = getImg(floor);
  if (!canvas || !img) return null;
  let w = img.offsetWidth,
    h = img.offsetHeight;
  if (w === 0) {
    const wrap = canvas.closest(".map-floor-wrapper") || canvas.parentElement;
    w = wrap ? wrap.offsetWidth : 800;
    h = Math.round((w * IMG_H[floor]) / IMG_W[floor]);
  }
  canvas.width = w;
  canvas.height = h;
  return { w, h, sx: w / IMG_W[floor], sy: h / IMG_H[floor] };
}

export function clearAllCanvases() {
  [1, 2, 3].forEach((f) => {
    const c = getCanvas(f);
    if (!c) return;
    const ctx = c.getContext("2d");
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, c.width, c.height);
  });
}

// ── Path splitting by floor ─────────────────────────────────────
export function splitPathByFloor(fullPath) {
  if (!fullPath || !fullPath.length) return [];
  const segs = [];
  let cur = null;

  for (let i = 0; i < fullPath.length; i++) {
    const node = fullPath[i];
    if (STAIR_NODES.has(node)) {
      if (cur) {
        cur.nodes.push(node);
        segs.push(cur);
        cur = null;
      }
      const nextFloor =
        i + 1 < fullPath.length ? (getNodeFloor(fullPath[i + 1]) ?? 1) : 1;
      cur = { floor: nextFloor, nodes: [node] };
      continue;
    }
    const floor = getNodeFloor(node) ?? 1;
    if (!cur || cur.floor !== floor) {
      if (cur) segs.push(cur);
      cur = { floor, nodes: [node] };
    } else {
      cur.nodes.push(node);
    }
  }
  if (cur) segs.push(cur);
  return segs;
}

// ── Zoom to route bounding box ──────────────────────────────────
function computeZoom(pts, W, H, padFrac = 0.35) {
  if (!pts.length) return null;
  let x0 = Infinity,
    y0 = Infinity,
    x1 = -Infinity,
    y1 = -Infinity;
  for (const p of pts) {
    if (p.x < x0) x0 = p.x;
    if (p.y < y0) y0 = p.y;
    if (p.x > x1) x1 = p.x;
    if (p.y > y1) y1 = p.y;
  }
  const pw = Math.max((x1 - x0) * padFrac, W * 0.1);
  const ph = Math.max((y1 - y0) * padFrac, H * 0.1);
  x0 = Math.max(0, x0 - pw);
  y0 = Math.max(0, y0 - ph);
  x1 = Math.min(W, x1 + pw);
  y1 = Math.min(H, y1 + ph);
  const bw = x1 - x0,
    bh = y1 - y0;
  if (bw <= 0 || bh <= 0) return null;
  const s = Math.min(W / bw, H / bh, 6);
  return {
    s,
    tx: W / 2 - ((x0 + x1) / 2) * s,
    ty: H / 2 - ((y0 + y1) / 2) * s,
  };
}

// ── Animation ────────────────────────────────────────────────────
let _cancelFns = [];

function animateFloor(ctx, pts, W, onDone) {
  if (pts.length < 2) {
    onDone && onDone();
    return () => {};
  }
  const COLOR = "#00d45a";
  const LW = Math.max(2.5, W / 350);
  let cancelled = false,
    segIdx = 0,
    prog = 0,
    lastTs = null;
  const SPEED = W * 2.5;

  function frame(ts) {
    if (cancelled) return;
    if (!lastTs) lastTs = ts;
    const dt = Math.min((ts - lastTs) / 1000, 0.05);
    lastTs = ts;
    prog += SPEED * dt;

    while (segIdx < pts.length - 1) {
      const len = Math.hypot(
        pts[segIdx + 1].x - pts[segIdx].x,
        pts[segIdx + 1].y - pts[segIdx].y,
      );
      if (prog >= len) {
        prog -= len;
        segIdx++;
      } else break;
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // glow pass
    ctx.strokeStyle = "rgba(0,212,90,0.2)";
    ctx.lineWidth = LW * 6;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    drawUpTo(ctx, pts, segIdx, prog);
    // main line
    ctx.strokeStyle = COLOR;
    ctx.lineWidth = LW;
    drawUpTo(ctx, pts, segIdx, prog);
    // start dot (white circle)
    dot(ctx, pts[0].x, pts[0].y, LW * 3, "#ffffff", COLOR, LW);

    if (segIdx >= pts.length - 1) {
      onDone && onDone(LW, COLOR);
    } else {
      requestAnimationFrame(frame);
    }
  }
  requestAnimationFrame(frame);
  return () => {
    cancelled = true;
  };
}

function drawUpTo(ctx, pts, segIdx, prog) {
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i <= segIdx && i < pts.length; i++)
    ctx.lineTo(pts[i].x, pts[i].y);
  if (segIdx < pts.length - 1) {
    const dx = pts[segIdx + 1].x - pts[segIdx].x;
    const dy = pts[segIdx + 1].y - pts[segIdx].y;
    const len = Math.hypot(dx, dy);
    const t = len > 0 ? prog / len : 0;
    ctx.lineTo(pts[segIdx].x + dx * t, pts[segIdx].y + dy * t);
  }
  ctx.stroke();
}

function dot(ctx, x, y, r, fill, stroke, sw) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = sw;
    ctx.stroke();
  }
}

// ── Main draw entry ──────────────────────────────────────────────
export function drawAllSegments(segments) {
  _cancelFns.forEach((fn) => fn());
  _cancelFns = [];
  clearAllCanvases();
  if (!segments || !segments.length) return;

  const byFloor = {};
  for (const seg of segments) {
    if (!byFloor[seg.floor]) byFloor[seg.floor] = [];
    byFloor[seg.floor].push(seg);
  }
  for (const [fs, segs] of Object.entries(byFloor)) {
    drawFloorNow(parseInt(fs), segs);
  }
}

function drawFloorNow(floor, segs) {
  const canvas = getCanvas(floor);
  if (!canvas) return;
  const scale = syncCanvas(floor);
  if (!scale) {
    setTimeout(() => drawFloorNow(floor, segs), 80);
    return;
  }

  const { w: W, h: H, sx, sy } = scale;
  const coordMap = getCoords(floor);
  const ctx = canvas.getContext("2d");

  function toCanvas(node) {
    const c = coordMap[node];
    if (!c) return null;
    return { x: c.x * sx, y: c.y * sy };
  }

  const allPts = [];
  for (const seg of segs)
    for (const n of seg.nodes) {
      const p = toCanvas(n);
      if (p) allPts.push(p);
    }
  if (!allPts.length) return;

  const zoom = computeZoom(allPts, W, H) || { s: 1, tx: 0, ty: 0 };

  function toPx(node) {
    const p = toCanvas(node);
    if (!p) return null;
    return { x: p.x * zoom.s + zoom.tx, y: p.y * zoom.s + zoom.ty };
  }

  // Flatten all segments into one continuous polyline
  const allZoomed = [];
  for (const seg of segs)
    for (const n of seg.nodes) {
      const p = toPx(n);
      if (p) allZoomed.push(p);
    }
  if (allZoomed.length < 2) {
    // Single point: just draw a dot
    const COLOR = "#00d45a";
    const LW = Math.max(2.5, W / 350);
    dot(
      ctx,
      allZoomed[0]?.x || W / 2,
      allZoomed[0]?.y || H / 2,
      LW * 3,
      COLOR,
      "#fff",
      LW,
    );
    return;
  }

  const cancel = animateFloor(ctx, allZoomed, W, (lw, color) => {
    const COLOR = "#00d45a";
    const LW = lw || Math.max(2.5, W / 350);
    // Draw destination marker at end
    const last = allZoomed[allZoomed.length - 1];
    const isStair = STAIR_NODES.has(
      segs[segs.length - 1].nodes[segs[segs.length - 1].nodes.length - 1],
    );
    if (isStair) {
      dot(ctx, last.x, last.y, LW * 3.5, "#ff9900", "#fff", LW * 0.8);
      ctx.fillStyle = "#fff";
      ctx.font = `bold ${Math.max(10, LW * 2.2)}px Arial`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("▲", last.x, last.y);
    } else {
      dot(ctx, last.x, last.y, LW * 3.5, COLOR, "#fff", LW * 0.8);
      ctx.fillStyle = "#fff";
      ctx.font = `bold ${Math.max(10, LW * 2)}px Arial`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("★", last.x, last.y);
    }
  });
  _cancelFns.push(cancel);
}

// Legacy compat
export function drawFloorSegment(segments) {
  drawAllSegments(segments);
}
export function clearCanvas() {
  clearAllCanvases();
}
