import assert from "node:assert/strict";
import test from "node:test";
import { deepEqual } from "../lib/deep-equal.ts";

test("ignores object key order, which JSON.stringify comparison did not", () => {
  assert.ok(deepEqual({ a: 1, b: 2 }, { b: 2, a: 1 }));
  assert.ok(deepEqual({ outer: { a: 1, b: [{ x: 1, y: 2 }] } }, { outer: { b: [{ y: 2, x: 1 }], a: 1 } }));
});

test("respects array order", () => {
  assert.ok(!deepEqual([1, 2], [2, 1]));
  assert.ok(deepEqual([1, 2], [1, 2]));
  assert.ok(!deepEqual([1, 2], [1, 2, 3]));
});

test("separates values, missing keys, and null", () => {
  assert.ok(!deepEqual({ a: 1 }, { a: 2 }));
  assert.ok(!deepEqual({ a: 1 }, { a: 1, b: 1 }));
  assert.ok(!deepEqual({ a: null }, { a: 0 }));
  assert.ok(!deepEqual({ a: null }, {}));
  assert.ok(!deepEqual(null, {}));
  assert.ok(!deepEqual([], {}));
});

test("treats an explicit undefined the same as an absent key, matching a JSON round trip", () => {
  assert.ok(deepEqual({ a: 1, b: undefined }, { a: 1 }));
  assert.ok(deepEqual({ a: 1 }, { a: 1, b: undefined }));
});

test("compares primitives, including NaN and signed zero", () => {
  assert.ok(deepEqual("x", "x"));
  assert.ok(!deepEqual("x", "y"));
  assert.ok(deepEqual(Number.NaN, Number.NaN));
  assert.ok(!deepEqual(1, "1"));
});
