import { snapToSixteenth } from "./architectural-units.ts";
import { MAXIMUM_COORDINATE } from "./box-model.ts";
import type { LinePoint, PlanPoint } from "./cad-line.ts";

export type CircleGeometry = {
  center: LinePoint;
  radius: number;
};

export type CircleTangentConstraint =
  | { kind: "line"; pick: LinePoint; start: LinePoint; end: LinePoint }
  | { center: LinePoint; counterclockwise?: boolean; endAngle?: number; kind: "circle"; pick: LinePoint; radius: number; startAngle?: number };

export type CircleMethod = "center-radius" | "center-diameter" | "two-point" | "three-point" | "tangent-tangent-radius" | "tangent-tangent-tangent";

export const CIRCLE_METHODS: Array<{ description: string; label: string; method: CircleMethod }> = [
  { description: "Specify the center, then a radius", label: "Center, Radius", method: "center-radius" },
  { description: "Specify the center, then a diameter", label: "Center, Diameter", method: "center-diameter" },
  { description: "Specify the two endpoints of a diameter", label: "2-Point", method: "two-point" },
  { description: "Specify three points on the circumference", label: "3-Point", method: "three-point" },
  { description: "Select two tangent objects, then specify a radius", label: "Tangent, Tangent, Radius", method: "tangent-tangent-radius" },
  { description: "Select three objects for a tangent Circle", label: "Tangent, Tangent, Tangent", method: "tangent-tangent-tangent" },
];

export type CircleGrip = "center" | "east" | "north" | "west" | "south";

export const MINIMUM_CIRCLE_RADIUS = 1 / 16;

export function cloneCircleGeometry(circle: CircleGeometry): CircleGeometry {
  return { center: { ...circle.center }, radius: circle.radius };
}

export function circleGeometryIsValid(circle: CircleGeometry): boolean {
  const values = [circle.center.x, circle.center.y, circle.center.z, circle.radius];
  if (!values.every(Number.isFinite) || values.some((value) => Math.abs(value) > MAXIMUM_COORDINATE)) return false;
  if (!values.every((value) => Math.abs(value * 16 - Math.round(value * 16)) < 1e-8)) return false;
  if (circle.radius < MINIMUM_CIRCLE_RADIUS) return false;
  return Math.abs(circle.center.x) + circle.radius <= MAXIMUM_COORDINATE &&
    Math.abs(circle.center.y) + circle.radius <= MAXIMUM_COORDINATE;
}

export function circleGeometriesEqual(a: CircleGeometry, b: CircleGeometry): boolean {
  return a.center.x === b.center.x && a.center.y === b.center.y && a.center.z === b.center.z && a.radius === b.radius;
}

export function circleFromCenterPoint(center: LinePoint, edge: LinePoint): CircleGeometry | null {
  const radius = snapToSixteenth(Math.hypot(edge.x - center.x, edge.y - center.y));
  const circle = { center: { x: snapToSixteenth(center.x), y: snapToSixteenth(center.y), z: snapToSixteenth(center.z) }, radius };
  return circleGeometryIsValid(circle) ? circle : null;
}

export function circleFromCenterRadius(center: LinePoint, radius: number): CircleGeometry | null {
  const snappedCenter = {
    x: snapToSixteenth(center.x),
    y: snapToSixteenth(center.y),
    z: snapToSixteenth(center.z),
  };
  const circle = {
    center: {
      x: Object.is(snappedCenter.x, -0) ? 0 : snappedCenter.x,
      y: Object.is(snappedCenter.y, -0) ? 0 : snappedCenter.y,
      z: Object.is(snappedCenter.z, -0) ? 0 : snappedCenter.z,
    },
    radius: snapToSixteenth(radius),
  };
  return circleGeometryIsValid(circle) ? circle : null;
}

export function circleFromCenterDiameter(center: LinePoint, diameter: number): CircleGeometry | null {
  return circleFromCenterRadius(center, diameter / 2);
}

export function circleFromDiameterPoints(first: LinePoint, second: LinePoint): CircleGeometry | null {
  if (Math.abs(first.z - second.z) >= MINIMUM_CIRCLE_RADIUS) return null;
  return circleFromCenterRadius({
    x: (first.x + second.x) / 2,
    y: (first.y + second.y) / 2,
    z: first.z,
  }, Math.hypot(second.x - first.x, second.y - first.y) / 2);
}

export function circleFromThreePoints(first: LinePoint, second: LinePoint, third: LinePoint): CircleGeometry | null {
  if (Math.abs(first.z - second.z) >= MINIMUM_CIRCLE_RADIUS || Math.abs(first.z - third.z) >= MINIMUM_CIRCLE_RADIUS) return null;
  const determinant = 2 * (first.x * (second.y - third.y) + second.x * (third.y - first.y) + third.x * (first.y - second.y));
  if (Math.abs(determinant) < 1e-8) return null;
  const firstSquared = first.x ** 2 + first.y ** 2;
  const secondSquared = second.x ** 2 + second.y ** 2;
  const thirdSquared = third.x ** 2 + third.y ** 2;
  const center = {
    x: (firstSquared * (second.y - third.y) + secondSquared * (third.y - first.y) + thirdSquared * (first.y - second.y)) / determinant,
    y: (firstSquared * (third.x - second.x) + secondSquared * (first.x - third.x) + thirdSquared * (second.x - first.x)) / determinant,
    z: first.z,
  };
  return circleFromCenterRadius(center, Math.hypot(first.x - center.x, first.y - center.y));
}

type TangentMode = { circleConstant?: number; radiusSign: number; side?: number };

function tangentModes(constraint: CircleTangentConstraint): TangentMode[] {
  return constraint.kind === "line"
    ? [{ radiusSign: 1, side: 1 }, { radiusSign: -1, side: -1 }]
    : [
      { circleConstant: constraint.radius, radiusSign: 1 },
      { circleConstant: constraint.radius, radiusSign: -1 },
      { circleConstant: -constraint.radius, radiusSign: 1 },
    ];
}

function tangentEquation(constraint: CircleTangentConstraint, mode: TangentMode, x: number, y: number, radius: number): [number, number, number, number] | null {
  if (constraint.kind === "line") {
    const dx = constraint.end.x - constraint.start.x;
    const dy = constraint.end.y - constraint.start.y;
    const length = Math.hypot(dx, dy);
    if (length < MINIMUM_CIRCLE_RADIUS) return null;
    const a = -dy / length;
    const b = dx / length;
    const c = -(a * constraint.start.x + b * constraint.start.y);
    return [a * x + b * y + c - (mode.side ?? 1) * radius, a, b, -(mode.side ?? 1)];
  }
  const dx = x - constraint.center.x;
  const dy = y - constraint.center.y;
  const distance = Math.hypot(dx, dy);
  if (distance < 1e-9) return null;
  return [distance - (mode.circleConstant ?? constraint.radius) - mode.radiusSign * radius, dx / distance, dy / distance, -mode.radiusSign];
}

function solveThreeByThree(matrix: number[][], values: number[]): [number, number, number] | null {
  const rows = matrix.map((row, index) => [...row, values[index]]);
  for (let column = 0; column < 3; column += 1) {
    let pivot = column;
    for (let row = column + 1; row < 3; row += 1) if (Math.abs(rows[row][column]) > Math.abs(rows[pivot][column])) pivot = row;
    if (Math.abs(rows[pivot][column]) < 1e-10) return null;
    [rows[column], rows[pivot]] = [rows[pivot], rows[column]];
    const divisor = rows[column][column];
    for (let entry = column; entry < 4; entry += 1) rows[column][entry] /= divisor;
    for (let row = 0; row < 3; row += 1) {
      if (row === column) continue;
      const factor = rows[row][column];
      for (let entry = column; entry < 4; entry += 1) rows[row][entry] -= factor * rows[column][entry];
    }
  }
  return [rows[0][3], rows[1][3], rows[2][3]];
}

function modeCombinations(constraints: CircleTangentConstraint[]): TangentMode[][] {
  return constraints.reduce<TangentMode[][]>((combinations, constraint) =>
    combinations.flatMap((combination) => tangentModes(constraint).map((mode) => [...combination, mode])), [[]]);
}

function normalizedAngle(angle: number): number {
  return ((angle % 360) + 360) % 360;
}

function pointIsOnConstraintArc(constraint: Extract<CircleTangentConstraint, { kind: "circle" }>, point: LinePoint): boolean {
  if (constraint.startAngle === undefined || constraint.endAngle === undefined || constraint.counterclockwise === undefined) return true;
  const angle = normalizedAngle(Math.atan2(point.y - constraint.center.y, point.x - constraint.center.x) * 180 / Math.PI);
  const ccwDistance = (start: number, end: number) => normalizedAngle(end - start);
  const sweep = constraint.counterclockwise ? ccwDistance(constraint.startAngle, constraint.endAngle) : ccwDistance(constraint.endAngle, constraint.startAngle);
  const pointSweep = constraint.counterclockwise ? ccwDistance(constraint.startAngle, angle) : ccwDistance(angle, constraint.startAngle);
  return pointSweep <= sweep + 1e-7;
}

function tangentPickScore(constraint: CircleTangentConstraint, center: LinePoint): number | null {
  if (constraint.kind === "line") {
    const dx = constraint.end.x - constraint.start.x;
    const dy = constraint.end.y - constraint.start.y;
    const lengthSquared = dx * dx + dy * dy;
    if (lengthSquared < MINIMUM_CIRCLE_RADIUS ** 2) return null;
    const t = ((center.x - constraint.start.x) * dx + (center.y - constraint.start.y) * dy) / lengthSquared;
    const tangent = { x: constraint.start.x + dx * t, y: constraint.start.y + dy * t };
    return (tangent.x - constraint.pick.x) ** 2 + (tangent.y - constraint.pick.y) ** 2;
  }
  const dx = center.x - constraint.center.x;
  const dy = center.y - constraint.center.y;
  const distance = Math.hypot(dx, dy);
  if (distance < 1e-9) return null;
  const points = [1, -1].map((sign) => ({
    x: constraint.center.x + dx / distance * constraint.radius * sign,
    y: constraint.center.y + dy / distance * constraint.radius * sign,
    z: constraint.center.z,
  })).filter((point) => pointIsOnConstraintArc(constraint, point));
  if (!points.length) return null;
  return Math.min(...points.map((point) => (point.x - constraint.pick.x) ** 2 + (point.y - constraint.pick.y) ** 2));
}

function solveTangentCircle(constraints: CircleTangentConstraint[], fixedRadius?: number): CircleGeometry | null {
  if (constraints.length !== (fixedRadius === undefined ? 3 : 2)) return null;
  const elevation = constraints[0].pick.z;
  if (constraints.some((constraint) => Math.abs(constraint.pick.z - elevation) >= MINIMUM_CIRCLE_RADIUS ||
      (constraint.kind === "circle" && Math.abs(constraint.center.z - elevation) >= MINIMUM_CIRCLE_RADIUS))) return null;
  if (fixedRadius !== undefined && (!Number.isFinite(fixedRadius) || fixedRadius < MINIMUM_CIRCLE_RADIUS)) return null;
  const average = constraints.reduce((point, constraint) => ({ x: point.x + constraint.pick.x / constraints.length, y: point.y + constraint.pick.y / constraints.length }), { x: 0, y: 0 });
  const scale = Math.max(12, fixedRadius ?? 0, ...constraints.map((constraint) => constraint.kind === "circle" ? constraint.radius : Math.hypot(constraint.end.x - constraint.start.x, constraint.end.y - constraint.start.y)));
  const centerSeeds = [-1, 0, 1].flatMap((x) => [-1, 0, 1].map((y) => ({ x: average.x + x * scale, y: average.y + y * scale })));
  const radiusSeeds = fixedRadius === undefined ? [scale / 4, scale / 2, scale, scale * 2] : [fixedRadius];
  const solutions: Array<{ circle: CircleGeometry; score: number }> = [];
  modeCombinations(constraints).forEach((modes) => centerSeeds.forEach((seed) => radiusSeeds.forEach((radiusSeed) => {
    let x = seed.x;
    let y = seed.y;
    let radius = radiusSeed;
    for (let iteration = 0; iteration < 40; iteration += 1) {
      const equations = constraints.map((constraint, index) => tangentEquation(constraint, modes[index], x, y, radius));
      if (equations.some((equation) => !equation)) return;
      const rows = equations as [number, number, number, number][];
      if (fixedRadius !== undefined) rows.push([radius - fixedRadius, 0, 0, 1]);
      const delta = solveThreeByThree(rows.map((row) => row.slice(1)), rows.map((row) => -row[0]));
      if (!delta) return;
      x += delta[0];
      y += delta[1];
      radius += delta[2];
      if (Math.max(...delta.map(Math.abs)) < 1e-8) break;
    }
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(radius) || radius < MINIMUM_CIRCLE_RADIUS) return;
    const residuals = constraints.map((constraint, index) => tangentEquation(constraint, modes[index], x, y, radius)?.[0] ?? Infinity);
    if (Math.max(...residuals.map(Math.abs)) > 1e-5) return;
    const center = { x, y, z: elevation };
    const scores = constraints.map((constraint) => tangentPickScore(constraint, center));
    if (scores.some((score) => score === null)) return;
    const circle = circleFromCenterRadius(center, radius);
    if (!circle) return;
    const key = `${circle.center.x},${circle.center.y},${circle.radius}`;
    if (solutions.some((solution) => `${solution.circle.center.x},${solution.circle.center.y},${solution.circle.radius}` === key)) return;
    solutions.push({ circle, score: (scores as number[]).reduce((total, score) => total + score, 0) });
  })));
  return solutions.sort((a, b) => a.score - b.score || a.circle.radius - b.circle.radius)[0]?.circle ?? null;
}

export function circleFromTwoTangenciesRadius(first: CircleTangentConstraint, second: CircleTangentConstraint, radius: number): CircleGeometry | null {
  return solveTangentCircle([first, second], radius);
}

export function circleFromThreeTangencies(first: CircleTangentConstraint, second: CircleTangentConstraint, third: CircleTangentConstraint): CircleGeometry | null {
  return solveTangentCircle([first, second, third]);
}

export function circleDiameter(circle: CircleGeometry): number {
  return circle.radius * 2;
}

export function circleCircumference(circle: CircleGeometry): number {
  return 2 * Math.PI * circle.radius;
}

export function circleArea(circle: CircleGeometry): number {
  return Math.PI * circle.radius * circle.radius;
}

export function circlePointAtAngle(circle: CircleGeometry, degrees: number): LinePoint {
  const radians = degrees * Math.PI / 180;
  return {
    x: snapToSixteenth(circle.center.x + Math.cos(radians) * circle.radius),
    y: snapToSixteenth(circle.center.y + Math.sin(radians) * circle.radius),
    z: circle.center.z,
  };
}

export function circleGripPoints(circle: CircleGeometry): Array<{ grip: CircleGrip; point: LinePoint }> {
  return [
    { grip: "center", point: { ...circle.center } },
    { grip: "east", point: circlePointAtAngle(circle, 0) },
    { grip: "north", point: circlePointAtAngle(circle, 90) },
    { grip: "west", point: circlePointAtAngle(circle, 180) },
    { grip: "south", point: circlePointAtAngle(circle, 270) },
  ];
}

export function moveCircleGrip(circle: CircleGeometry, grip: CircleGrip, target: LinePoint | PlanPoint): CircleGeometry | null {
  if (grip === "center") {
    return circleFromCenterRadius({ x: target.x, y: target.y, z: "z" in target ? target.z : circle.center.z }, circle.radius);
  }
  return circleFromCenterRadius(circle.center, Math.hypot(target.x - circle.center.x, target.y - circle.center.y));
}
