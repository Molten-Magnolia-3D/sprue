"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getManifold } from "@/lib/manifold";
import { makeMouldFromMesh, makeMouldFromSample } from "@/lib/mold";
import { SAMPLE_LABELS } from "@/lib/samples";
import { meshFromObj, parseStl } from "@/lib/stl";
import type { MeshData, MoldParams, MoldResult, SampleId } from "@/lib/types";
import { DEFAULT_MOLD_PARAMS } from "@/lib/types";
import { downloadBlob, mouldFileName, mouldZip, shareOrDownload } from "@/lib/zip";
import Viewer, { type ViewMode } from "./Viewer";

const SAMPLES: SampleId[] = ["pawn", "gem", "bead", "ring"];

export default function SprueApp() {
  const [sample, setSample] = useState<SampleId>("pawn");
  const [params, setParams] = useState<MoldParams>(DEFAULT_MOLD_PARAMS);
  const [liveParams, setLiveParams] = useState<MoldParams>(DEFAULT_MOLD_PARAMS);
  const [result, setResult] = useState<MoldResult | null>(null);
  const [mode, setMode] = useState<ViewMode>("split");
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState("Making the mould…");
  const [upload, setUpload] = useState<{ name: string; mesh: MeshData } | null>(
    null,
  );

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
  }, []);

  useEffect(() => {
    const handle = window.setTimeout(() => setParams(liveParams), 220);
    return () => window.clearTimeout(handle);
  }, [liveParams]);

  const rebuild = useCallback(async () => {
    setBusy(true);
    setError(null);
    setNote("Making the mould…");
    try {
      const wasm = await getManifold();
      const mould = upload
        ? await makeMouldFromMesh(wasm, upload.mesh, upload.name, params)
        : await makeMouldFromSample(wasm, sample, params);
      setResult(mould);
      setNote(statusFor(mould));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not make the mould.");
    } finally {
      setBusy(false);
    }
  }, [params, sample, upload]);

  useEffect(() => {
    void rebuild();
  }, [rebuild]);

  const onUpload = async (file: File) => {
    setBusy(true);
    setError(null);
    setNote("Reading the mesh…");
    try {
      const buffer = await file.arrayBuffer();
      const lower = file.name.toLowerCase();
      const mesh = lower.endsWith(".obj")
        ? meshFromObj(new TextDecoder().decode(buffer))
        : parseStl(buffer);
      setUpload({
        name: file.name.replace(/\.[^.]+$/, ""),
        mesh,
      });
      setMode("split");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "That mesh is not a closed solid. Try a watertight STL.",
      );
      setBusy(false);
    }
  };

  const onShare = async () => {
    if (!result) return;
    const blob = await mouldZip(result);
    await shareOrDownload(blob, mouldFileName(result.name));
  };

  const onDownload = async () => {
    if (!result) return;
    const blob = await mouldZip(result);
    downloadBlob(blob, mouldFileName(result.name));
  };

  const title = useMemo(() => result?.name ?? "Sprue", [result]);

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-foundry text-ink md:flex-row">
      <div className="h-[42dvh] shrink-0 md:h-auto md:min-h-0 md:flex-1">
        <Viewer result={result} mode={mode} />
      </div>

      <section className="min-h-0 flex-1 overflow-y-auto overscroll-contain border-t border-line bg-panel md:w-[24.5rem] md:flex-none md:border-l md:border-t-0">
        <header className="flex items-start justify-between gap-3 border-b border-line px-5 pb-4 pt-[max(1.1rem,env(safe-area-inset-top))]">
          <div>
            <p className="text-[0.68rem] uppercase tracking-[0.22em] text-mute">
              Mould-making
            </p>
            <h1 className="font-display text-[2.15rem] leading-none tracking-tight">
              Sprue
            </h1>
            <p className="mt-1 text-sm text-mute">Two-part shells for wax or resin</p>
          </div>
          <button
            type="button"
            onClick={() => void onShare()}
            disabled={!result || busy}
            className="mt-1 rounded-full border border-copper/70 bg-copper px-3.5 py-2 text-sm text-foundry disabled:opacity-40"
          >
            Share
          </button>
        </header>

        <div className="space-y-6 px-5 py-5 pb-[max(2rem,env(safe-area-inset-bottom))]">
          <p className="text-sm leading-relaxed text-mute">
            Upload a closed mesh, or start from a sample. Sprue builds both
            halves with alignment keys, a spout and fill hole, and a runner
            when the spout would miss the cavity. Downloads are zip files of
            both STL halves, in millimetres.
          </p>

          <fieldset>
            <legend className="mb-2 text-xs uppercase tracking-[0.16em] text-mute">
              Samples
            </legend>
            <div className="grid grid-cols-4 gap-2">
              {SAMPLES.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setUpload(null);
                    setSample(id);
                  }}
                  className={`rounded-lg border px-2 py-2 text-sm ${
                    sample === id && !upload
                      ? "border-copper bg-copper/15 text-ink"
                      : "border-line text-mute"
                  }`}
                >
                  {SAMPLE_LABELS[id]}
                </button>
              ))}
            </div>
          </fieldset>

          <label className="block">
            <span className="mb-2 block text-xs uppercase tracking-[0.16em] text-mute">
              Upload mesh
            </span>
            <input
              type="file"
              accept=".stl,.obj"
              className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-line file:px-3 file:py-1.5 file:text-ink"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void onUpload(file);
              }}
            />
            {upload ? (
              <span className="mt-1 block text-xs text-mute">{upload.name}</span>
            ) : null}
          </label>

          <Slider
            label="Wall thickness"
            unit="mm"
            min={2.5}
            max={8}
            step={0.1}
            value={liveParams.wallThickness}
            onChange={(wallThickness) =>
              setLiveParams((current) => ({ ...current, wallThickness }))
            }
          />
          <Slider
            label="Spout diameter"
            unit="mm"
            min={3}
            max={12}
            step={0.1}
            value={liveParams.spoutDiameter}
            onChange={(spoutDiameter) =>
              setLiveParams((current) => ({ ...current, spoutDiameter }))
            }
          />
          <Slider
            label="Alignment key"
            unit="mm"
            min={2}
            max={7}
            step={0.1}
            value={liveParams.keyDiameter}
            onChange={(keyDiameter) =>
              setLiveParams((current) => ({ ...current, keyDiameter }))
            }
          />

          <fieldset>
            <legend className="mb-2 text-xs uppercase tracking-[0.16em] text-mute">
              View
            </legend>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  ["model", "Model"],
                  ["assembled", "Assembled"],
                  ["split", "Split"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setMode(id)}
                  className={`rounded-lg border px-2 py-2 text-sm ${
                    mode === id
                      ? "border-copper bg-copper/15"
                      : "border-line text-mute"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </fieldset>

          <p className="min-h-10 text-sm text-wax" aria-live="polite">
            {busy ? "Making the mould…" : error ?? note}
          </p>

          <button
            type="button"
            onClick={() => void onDownload()}
            disabled={!result || busy}
            className="w-full rounded-xl bg-ink py-3 text-foundry disabled:opacity-40"
          >
            Download mould zip
          </button>
          <p className="text-center text-xs text-mute">
            {title} · both halves · millimetres
          </p>
        </div>
      </section>
    </div>
  );
}

function statusFor(mould: MoldResult): string {
  const keys = `${mould.keyPositions.length} alignment keys`;
  if (mould.usedRunner) {
    return `Runner added — the spout would have missed the cavity. ${keys}.`;
  }
  return `Spout meets the cavity. ${keys}. Ready in millimetres.`;
}

function Slider({
  label,
  unit,
  min,
  max,
  step,
  value,
  onChange,
}: {
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 flex justify-between text-xs uppercase tracking-[0.16em] text-mute">
        <span>{label}</span>
        <span>
          {value.toFixed(1)} {unit}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full"
      />
    </label>
  );
}
