import assert from "node:assert/strict";
import test from "node:test";
import {
  formatArchitectural,
  formatSignedArchitectural,
  parseArchitectural,
  parseSignedArchitectural,
  snapToSixteenth,
} from "../lib/architectural-units.ts";

test("parses common architectural dimensions", () => {
  assert.equal(parseArchitectural("12'"), 144);
  assert.equal(parseArchitectural("12' 6\""), 150);
  assert.equal(parseArchitectural("12'-6 1/2\""), 150.5);
  assert.equal(parseArchitectural("6 1/2\""), 6.5);
  assert.equal(parseArchitectural("150.5"), 150.5);
});

test("rejects invalid and non-positive-looking input", () => {
  assert.equal(parseArchitectural(""), null);
  assert.equal(parseArchitectural("twelve feet"), null);
  assert.equal(parseArchitectural("-6\""), null);
  assert.equal(parseArchitectural("6/0\""), null);
});

test("parses signed architectural coordinates", () => {
  assert.equal(parseSignedArchitectural("-6\""), -6);
  assert.equal(parseSignedArchitectural("−1'-6 1/2\""), -18.5);
  assert.equal(parseSignedArchitectural("+2'"), 24);
  assert.equal(parseSignedArchitectural("0"), 0);
  assert.equal(parseSignedArchitectural("north"), null);
});

test("formats dimensions to reduced sixteenth-inch fractions", () => {
  assert.equal(formatArchitectural(144), "12'-0\"");
  assert.equal(formatArchitectural(150.5), "12'-6 1/2\"");
  assert.equal(formatArchitectural(6.0625), "0'-6 1/16\"");
  assert.equal(formatSignedArchitectural(-6.5), "−0'-6 1/2\"");
});

test("snaps to the nearest sixteenth inch", () => {
  assert.equal(snapToSixteenth(6.03), 6);
  assert.equal(snapToSixteenth(6.04), 6.0625);
});
