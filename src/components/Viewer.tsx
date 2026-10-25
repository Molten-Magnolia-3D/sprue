"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { MeshData, MoldResult } from "@/lib/types";

export type ViewMode = "model" | "assembled" | "split";

type Props = {
  result: MoldResult | null;
  mode: ViewMode;
};

function geometryOf(mesh: MeshData): THREE.BufferGeometry {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(mesh.positions.slice(), 3));
  geo.setIndex(new THREE.BufferAttribute(mesh.indices.slice(), 1));
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  return geo;
}

export default function Viewer({ result, mode }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    controls: OrbitControls;
    group: THREE.Group;
    frame: number;
  } | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x12100d, 1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 2000);
    camera.position.set(48, -56, 38);
    camera.up.set(0, 0, 1);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.target.set(0, 0, 12);

    scene.add(new THREE.HemisphereLight(0xf4efe4, 0x2a2118, 1.1));
    const key = new THREE.DirectionalLight(0xffe4c4, 1.4);
    key.position.set(40, -30, 70);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0x88a0c8, 0.35);
    fill.position.set(-50, 40, 20);
    scene.add(fill);

    const group = new THREE.Group();
    scene.add(group);

    const grid = new THREE.GridHelper(80, 16, 0x3a342c, 0x2a251f);
    grid.rotateX(Math.PI / 2);
    scene.add(grid);

    const resize = () => {
      const w = host.clientWidth;
      const h = host.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / Math.max(h, 1);
      camera.updateProjectionMatrix();
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(host);

    const tick = () => {
      controls.update();
      renderer.render(scene, camera);
      state.frame = requestAnimationFrame(tick);
    };
    const state = { renderer, scene, camera, controls, group, frame: 0 };
    sceneRef.current = state;
    tick();

    return () => {
      cancelAnimationFrame(state.frame);
      observer.disconnect();
      controls.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      sceneRef.current = null;
    };
  }, []);

  useEffect(() => {
    const ctx = sceneRef.current;
    if (!ctx) return;
    while (ctx.group.children.length) {
      const child = ctx.group.children[0];
      ctx.group.remove(child);
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        for (const mat of mats) mat.dispose();
      }
    }
    if (!result) return;

    const wax = new THREE.MeshStandardMaterial({
      color: 0xe7c39a,
      roughness: 0.45,
      metalness: 0.05,
    });
    const plaster = new THREE.MeshStandardMaterial({
      color: 0xcfc6b8,
      roughness: 0.72,
      metalness: 0.02,
    });
    const cope = new THREE.MeshStandardMaterial({
      color: 0xb7c3b0,
      roughness: 0.7,
      metalness: 0.02,
    });

    const add = (mesh: MeshData, material: THREE.Material, z = 0) => {
      const obj = new THREE.Mesh(geometryOf(mesh), material);
      obj.position.z = z;
      ctx.group.add(obj);
    };

    if (mode === "model") {
      add(result.model, wax);
    } else if (mode === "assembled") {
      add(result.lower, plaster);
      add(result.upper, cope);
    } else {
      const gap = 8;
      add(result.lower, plaster, -gap);
      add(result.upper, cope, gap);
    }

    const box = new THREE.Box3().setFromObject(ctx.group);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    ctx.controls.target.copy(center);
    const span = Math.max(size.x, size.y, size.z, 20);
    ctx.camera.position.set(
      center.x + span * 0.9,
      center.y - span * 1.1,
      center.z + span * 0.75,
    );
    ctx.camera.near = span / 100;
    ctx.camera.far = span * 20;
    ctx.camera.updateProjectionMatrix();
  }, [result, mode]);

  return (
    <div
      ref={hostRef}
      className="h-full w-full touch-none bg-[#12100d]"
      aria-label="Mould viewer"
    />
  );
}
