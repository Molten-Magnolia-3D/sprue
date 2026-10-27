# Sprue

A phone-installable mould-making web app. Upload a closed 3D mesh and Sprue
builds a two-part shell for pouring wax or resin.

The mould makes its own alignment keys, its own runner when the spout would
miss the cavity, and its own spout and fill hole. Samples are pawn, gem, bead,
and ring. Download or share a zip of both STL halves, in millimetres.

Aimed at a Samsung Galaxy S24 Ultra. On the phone, only the 3D viewer stays
fixed while scrolling. The app name and the share button scroll with the
settings.

British spelling throughout: mould.

## Stack

Next.js, TypeScript, Tailwind, three.js, and manifold-3d.

## Commands

```bash
npm install
npm run dev
```

The dev server is port **43123**.

```bash
npm run test:mold
```

Geometry checks for the four samples: cavity empty, both halves solid, spout
and fill hole open, alignment keys present, and a runner on the ring (the
spout would otherwise fall through the hole).

```bash
npm run build
npm start
```

## Using it

1. Open the app and pick a sample, or upload a watertight STL/OBJ.
2. Set wall thickness, spout diameter, and key size. Units are millimetres.
3. Inspect the model, the assembled mould, or the split halves.
4. Download or share a zip of `*-lower.stl` and `*-upper.stl`.

Install from the browser menu on a phone (`Add to Home screen`) — the app is
a standalone PWA.

## Releases

Everything is on the GitHub releases page:

**https://github.com/Molten-Magnolia-3D/sprue/releases**

- App source (v1.0.0 and latest `main`)
- Sample moulds: pawn, gem, bead, ring, or all four
- Each mould zip has both STL halves, millimetres

In the running app: [Releases](/releases).

## How the mould is built

The mesh sits in a rectangular blank. Sprue subtracts the cavity, punches a
funnelled spout from the top, and opens a small vent when the highest point
is clear of the pour. If a top-centre spout would miss the solid (a ring is
the usual case), it drops a runner from the spout axis into the cavity.
The blank is split at mid-height. Pins rise from the lower half; matching
sockets are cut in the upper half, in the wall, away from the cavity.
