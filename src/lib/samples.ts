import type { ManifoldToplevel } from "manifold-3d";
import type { SampleId } from "./types";

type Solid = ReturnType<ManifoldToplevel["Manifold"]["cube"]>;

function unionAndForget(
  Manifold: ManifoldToplevel["Manifold"],
  parts: Solid[],
): Solid {
  const result = Manifold.union(parts);
  for (const part of parts) part.delete();
  return result;
}

export function makePawn(wasm: ManifoldToplevel): Solid {
  const { Manifold } = wasm;
  return unionAndForget(Manifold, [
    Manifold.cylinder(2.6, 9.2, 9.2, 48),
    Manifold.cylinder(3.2, 8.6, 6.4, 48).translate([0, 0, 2.6]),
    Manifold.cylinder(15.4, 6.1, 3.3, 48).translate([0, 0, 5.8]),
    Manifold.cylinder(1.8, 5.1, 5.1, 48).translate([0, 0, 21.2]),
    Manifold.cylinder(2.2, 2.7, 2.7, 32).translate([0, 0, 23]),
    Manifold.sphere(4.3, 36).translate([0, 0, 28.6]),
  ]);
}

export function makeGem(wasm: ManifoldToplevel): Solid {
  const { Manifold } = wasm;
  const crown = Manifold.cylinder(7.2, 9.4, 0.05, 8);
  const pavilion = Manifold.cylinder(10.4, 9.4, 0.05, 8)
    .rotate([180, 0, 0])
    .translate([0, 0, 0]);
  const table = Manifold.cylinder(0.8, 2.4, 2.4, 8).translate([0, 0, 6.4]);
  const gem = Manifold.union([crown, pavilion, table]);
  crown.delete();
  pavilion.delete();
  table.delete();
  return gem;
}

export function makeBead(wasm: ManifoldToplevel): Solid {
  const { Manifold } = wasm;
  const ball = Manifold.sphere(8, 48);
  const hole = Manifold.cylinder(22, 2.3, 2.3, 36, true).rotate([90, 0, 0]);
  const bead = ball.subtract(hole);
  ball.delete();
  hole.delete();
  return bead;
}

export function makeRing(wasm: ManifoldToplevel): Solid {
  const { Manifold, CrossSection } = wasm;
  const circle = CrossSection.circle(2.15, 28);
  const profile = circle.translate([9.6, 0]);
  const ring = Manifold.revolve(profile, 72);
  circle.delete();
  profile.delete();
  return ring;
}

export function makeSample(wasm: ManifoldToplevel, id: SampleId): Solid {
  switch (id) {
    case "pawn":
      return makePawn(wasm);
    case "gem":
      return makeGem(wasm);
    case "bead":
      return makeBead(wasm);
    case "ring":
      return makeRing(wasm);
    default:
      throw new Error(`Unknown sample: ${id}`);
  }
}

export const SAMPLE_LABELS: Record<SampleId, string> = {
  pawn: "Pawn",
  gem: "Gem",
  bead: "Bead",
  ring: "Ring",
};
