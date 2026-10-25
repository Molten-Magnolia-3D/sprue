import type { ManifoldToplevel } from "manifold-3d";
import {
  boxCenter,
  closestVertexToAxis,
  highestVertex,
  meshFromManifold,
} from "./mesh";
import { makeSample } from "./samples";
import type {
  MeshData,
  MoldParams,
  MoldResult,
  SampleId,
  Vec3,
} from "./types";
import { DEFAULT_MOLD_PARAMS } from "./types";

type Solid = ReturnType<ManifoldToplevel["Manifold"]["cube"]>;

class Heap {
  readonly items: Array<{ delete(): void }> = [];

  keep<T extends { delete(): void }>(item: T): T {
    this.items.push(item);
    return item;
  }

  drop(): void {
    for (const item of this.items) {
      try {
        item.delete();
      } catch {
        // already freed
      }
    }
    this.items.length = 0;
  }
}

function rotationFromZ(dx: number, dy: number, dz: number): Vec3 {
  const yaw = (Math.atan2(dx, dz) * 180) / Math.PI;
  const pitch = (-Math.atan2(dy, Math.hypot(dx, dz)) * 180) / Math.PI;
  return [pitch, yaw, 0];
}

function cylinderBetween(
  wasm: ManifoldToplevel,
  heap: Heap,
  a: Vec3,
  b: Vec3,
  radius: number,
): Solid {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const dz = b[2] - a[2];
  const length = Math.hypot(dx, dy, dz);
  const cyl = heap.keep(
    wasm.Manifold.cylinder(Math.max(length, 0.2), radius, radius, 28),
  );
  const rotated = heap.keep(cyl.rotate(rotationFromZ(dx, dy, dz)));
  return heap.keep(rotated.translate(a));
}

function probeHit(
  wasm: ManifoldToplevel,
  heap: Heap,
  solid: Solid,
  point: Vec3,
  size = 0.35,
): boolean {
  const cube = heap.keep(wasm.Manifold.cube([size, size, size], true));
  const placed = heap.keep(cube.translate(point));
  const hit = heap.keep(solid.intersect(placed));
  return !hit.isEmpty();
}

function solidFromMesh(wasm: ManifoldToplevel, mesh: MeshData): Solid {
  const { Mesh, Manifold } = wasm;
  return new Manifold(
    new Mesh({
      numProp: 3,
      vertProperties: mesh.positions,
      triVerts: mesh.indices,
    }),
  );
}

function cavityOf(
  wasm: ManifoldToplevel,
  heap: Heap,
  model: Solid,
  clearance: number,
): Solid {
  if (clearance <= 0.001) return model;
  const box = model.boundingBox();
  const mid = boxCenter(box.min as Vec3, box.max as Vec3);
  const radii = [
    (box.max[0] - box.min[0]) / 2,
    (box.max[1] - box.min[1]) / 2,
    (box.max[2] - box.min[2]) / 2,
  ];
  const avg = (radii[0] + radii[1] + radii[2]) / 3 || 1;
  const scale = 1 + clearance / avg;
  const shifted = heap.keep(
    model.translate([-mid[0], -mid[1], -mid[2]]),
  );
  const grown = heap.keep(shifted.scale(scale));
  return heap.keep(grown.translate(mid));
}

function keySites(
  min: Vec3,
  max: Vec3,
  inset: number,
): Array<[number, number]> {
  return [
    [min[0] + inset, min[1] + inset],
    [max[0] - inset, min[1] + inset],
    [min[0] + inset, max[1] - inset],
    [max[0] - inset, max[1] - inset],
  ];
}

export async function makeMouldFromSample(
  wasm: ManifoldToplevel,
  id: SampleId,
  params: Partial<MoldParams> = {},
): Promise<MoldResult> {
  const model = makeSample(wasm, id);
  try {
    return makeMould(wasm, model, id, params);
  } finally {
    model.delete();
  }
}

export async function makeMouldFromMesh(
  wasm: ManifoldToplevel,
  mesh: MeshData,
  name: string,
  params: Partial<MoldParams> = {},
): Promise<MoldResult> {
  const model = solidFromMesh(wasm, mesh);
  try {
    return makeMould(wasm, model, name, params);
  } finally {
    model.delete();
  }
}

export function makeMould(
  wasm: ManifoldToplevel,
  model: Solid,
  name: string,
  params: Partial<MoldParams> = {},
): MoldResult {
  const p = { ...DEFAULT_MOLD_PARAMS, ...params };
  const heap = new Heap();
  const { Manifold } = wasm;

  try {
    const modelMesh = meshFromManifold(model);
    const box = model.boundingBox();
    const minM = box.min as Vec3;
    const maxM = box.max as Vec3;
    const mid = boxCenter(minM, maxM);
    const partingZ = p.partingZ ?? mid[2];
    const wall = p.wallThickness;
    const extraTop = Math.max(p.funnelHeight + 2, 8);

    const blankMin: Vec3 = [minM[0] - wall, minM[1] - wall, minM[2] - wall];
    const blankMax: Vec3 = [
      maxM[0] + wall,
      maxM[1] + wall,
      maxM[2] + extraTop,
    ];
    const size: Vec3 = [
      blankMax[0] - blankMin[0],
      blankMax[1] - blankMin[1],
      blankMax[2] - blankMin[2],
    ];
    const blank = heap.keep(
      heap.keep(Manifold.cube(size, false)).translate(blankMin),
    );
    const cavity = cavityOf(wasm, heap, model, p.clearance);
    let body = heap.keep(blank.subtract(cavity));

    const cx = mid[0];
    const cy = mid[1];
    const spoutR = p.spoutDiameter / 2;
    const funnelR = p.funnelDiameter / 2;

    const trialSpoutH = Math.max(blankMax[2] - (maxM[2] - 1.2), 4);
    const trialSpout = heap.keep(
      heap
        .keep(Manifold.cylinder(trialSpoutH, spoutR, spoutR, 32))
        .translate([cx, cy, maxM[2] - 1.2]),
    );
    const spoutHit = heap.keep(model.intersect(trialSpout));
    const usedRunner = spoutHit.isEmpty();

    let runnerTarget: Vec3 | null = null;
    const channels: Solid[] = [];

    if (usedRunner) {
      runnerTarget = closestVertexToAxis(modelMesh, cx, cy);
      const runnerZ = runnerTarget[2];
      const inward: Vec3 = [
        runnerTarget[0] + (runnerTarget[0] - cx) * 0.08,
        runnerTarget[1] + (runnerTarget[1] - cy) * 0.08,
        runnerZ,
      ];
      const spoutBottom = runnerZ - spoutR;
      const spoutH = blankMax[2] - spoutBottom;
      channels.push(
        heap.keep(
          heap
            .keep(Manifold.cylinder(spoutH, spoutR, spoutR, 32))
            .translate([cx, cy, spoutBottom]),
        ),
      );
      channels.push(
        cylinderBetween(
          wasm,
          heap,
          [cx, cy, runnerZ],
          inward,
          Math.max(spoutR * 0.85, 1.4),
        ),
      );
    } else {
      const spoutBottom = maxM[2] - 1.6;
      const spoutH = blankMax[2] - spoutBottom;
      channels.push(
        heap.keep(
          heap
            .keep(Manifold.cylinder(spoutH, spoutR, spoutR, 32))
            .translate([cx, cy, spoutBottom]),
        ),
      );
    }

    const funnel = heap.keep(
      heap
        .keep(
          Manifold.cylinder(p.funnelHeight, spoutR, funnelR, 32),
        )
        .translate([cx, cy, blankMax[2] - p.funnelHeight]),
    );
    channels.push(funnel);

    const high = highestVertex(modelMesh);
    let ventXY: [number, number] | null = null;
    let usedVent = false;
    const ventClear = Math.hypot(high[0] - cx, high[1] - cy) > spoutR + 3;
    if (ventClear) {
      const ventR = p.ventDiameter / 2;
      const ventBottom = high[2] - 0.8;
      const ventH = blankMax[2] - ventBottom;
      channels.push(
        heap.keep(
          heap
            .keep(Manifold.cylinder(ventH, ventR, ventR, 20))
            .translate([high[0], high[1], ventBottom]),
        ),
      );
      ventXY = [high[0], high[1]];
      usedVent = true;
    }

    const channel = heap.keep(Manifold.union(channels));
    body = heap.keep(body.subtract(channel));

    const [upper0, lower0] = body.splitByPlane([0, 0, 1], partingZ);
    heap.keep(upper0);
    heap.keep(lower0);
    let upper = upper0;
    let lower = lower0;

    const inset = wall * 0.55;
    const keyPositions: Array<[number, number]> = [];
    for (const [x, y] of keySites(blankMin, blankMax, inset)) {
      const keyProbe = heap.keep(
        heap
          .keep(
            Manifold.cylinder(p.keyHeight + 2, p.keyDiameter / 2 + 0.4, undefined, 20),
          )
          .translate([x, y, partingZ - 1]),
      );
      if (!heap.keep(cavity.intersect(keyProbe)).isEmpty()) continue;
      keyPositions.push([x, y]);

      const pin = heap.keep(
        heap
          .keep(
            Manifold.cylinder(
              p.keyHeight + 1.2,
              p.keyDiameter / 2,
              p.keyDiameter / 2,
              24,
            ),
          )
          .translate([x, y, partingZ - 1.2]),
      );
      const hole = heap.keep(
        heap
          .keep(
            Manifold.cylinder(
              p.keyHeight + 1.4,
              p.keyDiameter / 2 + p.keyClearance,
              p.keyDiameter / 2 + p.keyClearance,
              24,
            ),
          )
          .translate([x, y, partingZ - 0.15]),
      );
      const nextLower = lower.add(pin);
      const nextUpper = upper.subtract(hole);
      heap.keep(nextLower);
      heap.keep(nextUpper);
      lower = nextLower;
      upper = nextUpper;
    }

    if (lower.isEmpty() || upper.isEmpty()) {
      throw new Error("The mould split produced an empty half.");
    }

    return {
      name,
      units: "mm",
      usedRunner,
      usedVent,
      partingZ,
      keyPositions,
      spoutAxis: [cx, cy],
      runnerTarget,
      ventXY,
      model: modelMesh,
      lower: meshFromManifold(lower),
      upper: meshFromManifold(upper),
      modelVolume: model.volume(),
      lowerVolume: lower.volume(),
      upperVolume: upper.volume(),
    };
  } finally {
    heap.drop();
  }
}

export function containsPoint(
  wasm: ManifoldToplevel,
  mesh: MeshData,
  point: Vec3,
  size = 0.4,
): boolean {
  const heap = new Heap();
  const solid = heap.keep(solidFromMesh(wasm, mesh));
  try {
    return probeHit(wasm, heap, solid, point, size);
  } finally {
    heap.drop();
  }
}
