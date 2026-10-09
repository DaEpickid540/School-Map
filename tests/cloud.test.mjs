// Run: node --test tests/cloud.test.mjs
// Shared routes are publicly writable, so cleanStops() must reject anything
// that isn't a plausible list of room keys before it reaches the page.
import test from "node:test";
import assert from "node:assert/strict";
import { cleanStops } from "../cloud.js";

test("accepts normal routes", () => {
  assert.deepEqual(cleanStops(["A115", "B101"]), ["A115", "B101"]);
  assert.deepEqual(cleanStops(["Front_Stair", "C-101", "Z_Pod_2"]), ["Front_Stair", "C-101", "Z_Pod_2"]);
});

test("rejects markup, oversized and malformed input", () => {
  for (const bad of [
    ["<img src=x onerror=alert(1)>", "A115"],
    ["A115", "x".repeat(25)],
    Array(11).fill("A115"),
    ["A115"],
    "A115",
    null,
    [{ toString: () => "<b>" }, "A115"],
  ]) assert.equal(cleanStops(bad), null, JSON.stringify(bad));
});
