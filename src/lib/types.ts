export type Vec3 = [number, number, number];

export type MeshData = {
  positions: Float32Array;
  indices: Uint32Array;
};

export type MoldParams = {
  wallThickness: number;
  clearance: number;
  spoutDiameter: number;
  funnelDiameter: number;
  funnelHeight: number;
  keyDiameter: number;
  keyHeight: number;
  keyClearance: number;
  ventDiameter: number;
  partingZ?: number;
};

export const DEFAULT_MOLD_PARAMS: MoldParams = {
  wallThickness: 4,
  clearance: 0.15,
  spoutDiameter: 6,
  funnelDiameter: 12,
  funnelHeight: 6,
  keyDiameter: 4,
  keyHeight: 4,
  keyClearance: 0.18,
  ventDiameter: 2,
};

export type SampleId = "pawn" | "gem" | "bead" | "ring";

export type MoldHalfName = "lower" | "upper";

export type MoldResult = {
  name: string;
  units: "mm";
  usedRunner: boolean;
  usedVent: boolean;
  partingZ: number;
  keyPositions: Array<[number, number]>;
  spoutAxis: [number, number];
  runnerTarget: Vec3 | null;
  ventXY: [number, number] | null;
  model: MeshData;
  lower: MeshData;
  upper: MeshData;
  modelVolume: number;
  lowerVolume: number;
  upperVolume: number;
};

export type SolidManifold = {
  delete(): void;
  boundingBox(): { min: Vec3; max: Vec3 };
  volume(): number;
  isEmpty(): boolean;
  getMesh(): {
    numProp: number;
    numVert: number;
    vertProperties: Float32Array;
    triVerts: Uint32Array;
  };
  translate(v: Vec3): SolidManifold;
  rotate(v: Vec3): SolidManifold;
  add(other: SolidManifold): SolidManifold;
  subtract(other: SolidManifold): SolidManifold;
  intersect(other: SolidManifold): SolidManifold;
  splitByPlane(normal: Vec3, originOffset: number): [SolidManifold, SolidManifold];
};

export type ManifoldApi = {
  Manifold: {
    cube(size: Vec3, center?: boolean): SolidManifold;
    cylinder(
      height: number,
      radiusLow: number,
      radiusHigh?: number,
      circularSegments?: number,
      center?: boolean,
    ): SolidManifold;
    sphere(radius: number, circularSegments?: number): SolidManifold;
    union(parts: SolidManifold[]): SolidManifold;
    revolve(
      section: { delete(): void; translate(v: [number, number]): unknown },
      segments?: number,
    ): SolidManifold;
  };
  CrossSection: {
    circle(radius: number, circularSegments?: number): {
      delete(): void;
      translate(v: [number, number]): {
        delete(): void;
      };
    };
  };
};
