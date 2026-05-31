<div align="center">

<img src="assets/logo.svg" alt="Splattie" width="100" />

# splattie-widget

**Interactive rigged 3D Gaussian Splatting - like Rive/Lottie for 3D**

[![npm](https://img.shields.io/npm/v/@afromero/splattie-widget?color=blue)](https://www.npmjs.com/package/@afromero/splattie-widget)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue?logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Spark](https://img.shields.io/badge/Spark_2.0-MIT-green)](https://github.com/sparkjsdev/spark)
[![Three.js](https://img.shields.io/badge/Three.js-r170+-black?logo=three.js)](https://threejs.org)
[![Tests](https://img.shields.io/badge/tests-91_passing-brightgreen)]()
[![Bundle](https://img.shields.io/badge/format-.splattie-orange)]()

[Quick Start](#quick-start) · [Format Spec](FORMAT.md) · [API](#api) · [Editor](#visual-editor) · [How It Works](#how-it-works)

</div>

---

<p align="center">
  <img src="assets/demo.gif" alt="Splattie Widget Demo" width="600" />
</p>

A web component that makes Gaussian splats **reactive**. One file, one tag. **Heads** track the cursor with their eyes, blink, and emote on hover/click (FLAME rig); **bodies** turn their head and torso toward visitors and pose with two-bone arm IK (SMPL-X rig); **objects** use arbitrary skeletons and sparse LBS weights for cursor-follow and direct pose editing. 60fps, client-side. The widget branches on the bundle's `assetType` — same tag for heads, bodies, and objects.

**[See it live at afromero.co](https://afromero.co)** | **[Create your own at splattie.app](https://splattie.app)**

## Quick Start

```html
<splattie-widget src="asset.splattie"></splattie-widget>
<script type="module" src="https://unpkg.com/@afromero/splattie-widget"></script>
```

Or via npm:

```bash
npm install @afromero/splattie-widget
```

```typescript
import '@afromero/splattie-widget';
```

## The `.splattie` Format

> **v0.x experimental.** Core files (PLY, FLAME bones) follow established standards. Expression basis and states may evolve.

A ZIP bundle with a required `manifest.json` that declares every asset
and locks the file's `formatVersion` to the widget version. See
[`FORMAT.md`](FORMAT.md) for the full spec.

```
asset.splattie
├── manifest.json             # (required) declares every asset + assetType + formatVersion
├── *.ply or *.spz            # (required) Gaussian splats
│
│  # head (assetType: head) — FLAME rig:
├── bone_tree.json            # (optional) Skeleton for skinning (5 FLAME bones)
├── lbs_weight_20k.json       # (optional) Per-splat bone weights
├── expression_basis.bin      # (optional) Blendshape basis
│
│  # body (assetType: body) — SMPL-X rig:
├── skeleton.json             # (optional) 55-joint SMPL-X skeleton (baked-pose rest)
├── lbs_weights.json          # (optional) Per-gaussian sparse LBS weights
│
│  # object (assetType: object) — arbitrary skeleton rig:
├── skeleton.json             # (optional) Object joint hierarchy + rest positions
├── lbs_weights.bin           # (optional) Binary sparse per-gaussian LBS weights
│
└── states.json               # (optional) Interaction states
```

<details>
<summary><strong>Splat data</strong> (<code>.ply</code> or <code>.spz</code>) - standard 3DGS format</summary>

Each splat has position, scale, rotation, opacity, and SH color. Auto-detected from file header. Works with any 3DGS method (LAM, DreamGaussian, InstantSplat, etc.). Standard format, unlikely to change.
</details>

<details>
<summary><strong>bone_tree.json</strong> - skeleton hierarchy</summary>

5 FLAME bones: root > neck > jaw, leftEye, rightEye. Used for SplatSkinning (dual quaternion).

```json
{
  "bones": [{
    "name": "root",
    "position": [x, y, z],
    "children": [{
      "name": "neck",
      "position": [x, y, z],
      "children": [
        { "name": "jaw", "position": [x, y, z] },
        { "name": "leftEye", "position": [x, y, z] },
        { "name": "rightEye", "position": [x, y, z] }
      ]
    }]
  }]
}
```

Stable structure. Bone names are conventions, not hard requirements. Without it: no eye tracking, no jaw animation.
</details>

<details>
<summary><strong>lbs_weight_20k.json</strong> - per-splat bone weights</summary>

2D array `[num_splats][num_bones]`, each row sums to ~1.0. Widget selects top 4 per splat.

```json
[[0.8, 0.1, 0.05, 0.03, 0.02], ...]
```

Standard LBS format from FLAME. Without it: bones exist but nothing moves.
</details>

<details>
<summary><strong>expression_basis.bin</strong> - FLAME blendshape basis</summary>

Per-splat position displacements for each expression coefficient. Moves all splats coherently for smile, lip shapes, etc.

```
Header: "EXPR" (4B) + num_vertices (u32 LE) + num_expressions (u32 LE)
Data:   float32 LE array, shape (num_vertices, num_expressions, 3)
```

Optional sidecar `expression_basis.json` with semantic labels:
```json
{ "labels": ["jawDown", "lipsUp", "lipsL", ...], "num_expressions": 50 }
```

Experimental format, may add compression. Without it: bone-driven expressions still work.
</details>

<details>
<summary><strong>skeleton.json</strong> + <strong>lbs_weights.json</strong> - SMPL-X body rig (bodies)</summary>

Bodies (`assetType: body`) use a 55-joint SMPL-X skeleton instead of FLAME bones:

```json
// skeleton.json — joints in the BAKED (photographed) rest pose
{ "rig": "smplx", "jointCount": 55, "names": ["Pelvis", "L_Hip", ...],
  "parents": [-1, 0, 0, ...], "restPositions": [[x, y, z], ...] }

// lbs_weights.json — sparse top-K per-gaussian skinning
{ "numGaussians": 40000, "k": 4, "indices": [...], "weights": [...] }
```

The body is exported already posed (arms at rest), so the widget's rest pose is the
identity. From there it drives **head + torso look-at** toward the cursor and a
**two-bone arm IK** for editor posing, composing local joint rotations via SMPL-X
forward kinematics + linear blend skinning. Without these: the gaussians render but
don't articulate.
</details>

<details>
<summary><strong>skeleton.json</strong> + <strong>lbs_weights.bin</strong> - object rig</summary>

Objects (`assetType: object`) use the same manifest-level LBS contract as bodies,
but with an arbitrary joint hierarchy:

```json
// skeleton.json
{ "rig": "puppeteer-object", "jointCount": 12, "names": ["root", "..."],
  "parents": [-1, 0, ...], "restPositions": [[x, y, z], ...] }

// manifest excerpt
{ "weights": { "file": "lbs_weights.bin", "format": "lbsw-v1" } }
```

The binary weights file stores sparse uint16 joint indices and float16 weights for each
Gaussian. The widget projects terminal joints as editor handles, solves simple
joint-chain rotations when you drag a handle, and uses root/joint cursor-follow
settings for lightweight interactivity.
</details>

<details>
<summary><strong>states.json</strong> - interaction state definitions</summary>

Each state (idle, hover, click) sets all 5 dimensions simultaneously.

```json
{
  "defaults": {
    "camera": { "theta": 0, "phi": 75, "radius": 0.5, "fov": 60 },
    "autoBlink": { "interval": [2000, 7000], "duration": 150 }
  },
  "states": {
    "idle": {
      "ghost": { "amplitude": 0.003, "frequency": 0.4, "wobble": 0.2 },
      "expression": { "jawOpen": 0, "smile": 0 },
      "camera": { "theta": 0, "phi": 75, "radius": 0.5, "fov": 60 },
      "rotation": [0, 0, 0],
      "tracking": { "eyes": 1.0, "head": 0.1 }
    },
    "hover": { "..." : "..." },
    "click": { "..." : "..." }
  },
  "transitions": {
    "idle->hover": { "duration": 0.3, "easing": "ease-out" },
    "*->click": { "duration": 0.1, "easing": "snap" }
  }
}
```

Most likely to evolve. Without it: sensible defaults (eyes track, gentle float, auto-blink).
</details>

### Creating Your Own

**Visual editor**: `npm run dev`, adjust sliders, click "Download .splattie".

**From scratch**: ZIP a `.ply` with any combination of the optional files.

**From a photo or object image**: run the Splattie backend pipeline for heads
(LAM), bodies (LHM), or objects (TRELLIS + Puppeteer), then bundle the result.
Try it at [splattie.app](https://splattie.app).

## Five Dimensions of State

| Dimension | Controls | Example |
|-----------|----------|---------|
| **Ghost** | Floating/bobbing | Gentle hover on idle, freeze on click |
| **Expression** | FLAME blendshapes + bones | Smile on hover, surprise on click |
| **Camera** | Spherical position | Zoom in on hover |
| **Rotation** | Pitch/yaw/roll | Tilt head on hover |
| **Tracking** | Cursor-follow intensity | Heads: eyes/head. Bodies: head/torso. Objects: root/joints |

Interpolated between states with configurable easing and duration.

<details>
<summary><strong>Expression system details</strong></summary>

Two layers:

**Bone-driven** (SplatSkinning, 5 FLAME bones):
- Jaw open/close, neck pitch/yaw/roll
- Eye gaze direction (left/right, up/down)
- Brow raise/frown (left/right independently)

**Blendshape-driven** (FLAME expression basis, 10+ PCA coefficients):
- Moves all 20K splats coherently
- Smile, lip shapes, jaw articulation, cheek/nose deformation
- Spatial mask prevents beard/neck from deforming
</details>

## API

| Attribute | Description |
|-----------|-------------|
| `src` | URL to `.splattie` file (or `.ply`/`.spz`) |
| `background` | Background color hex (default: `#0e0e14`) |
| `width` | CSS width (default: `100%`) |
| `height` | CSS height (default: `400px`) |

```javascript
widget.addEventListener('splatload', () => {});   // ready
widget.addEventListener('splathover', () => {});   // cursor over asset
widget.addEventListener('splatclick', () => {});   // clicked asset
widget.addEventListener('splatleave', () => {});   // cursor left
widget.setState('hover');                           // force transition
```

## Visual Editor

```bash
npm run dev  # http://localhost:4002
```

Sliders for all 5 dimensions, camera sphere widget, state tabs with copy-forward, FLAME blendshape controls (heads), on-canvas IK drag handles to pose limbs (bodies), skeleton handles for object pose editing, drag-and-drop `.splattie` upload, export when done.

## How It Works

Built on [Spark 2.0](https://github.com/sparkjsdev/spark) (MIT, World Labs).

<details>
<summary><strong>Architecture</strong></summary>

1. **State machine** with per-dimension interpolation (lerp, slerp, ease curves)
2. **SplatSkinning** (dual quaternion) driving 5 FLAME bones from expression + cursor data (heads)
3. **SMPL-X skinning** (55-joint LBS) for bodies — head/torso look-at + analytic two-bone arm IK, composed via forward kinematics
4. **Generic object skinning** for arbitrary skeletons — root/joint cursor-follow, projected skeleton handles, and drag-to-pose chain solving
5. **Expression basis** - per-splat position offsets written to Spark's packed buffer (half-float, ~20K splats/frame)
6. **Hit detection** via `readPixels` after render (pixel-perfect)
7. **Auto-blink** with randomized interval and sine-curve via SplatEdit
8. **Gyroscope** tracking on mobile (iOS permission prompt included)
</details>

## Mobile

Touch + gyroscope. Eyes follow device orientation on mobile, touch position on tap. Return to center when finger lifts. iOS motion permission requested automatically.

## Browser Support

Chrome, Firefox, Safari, Edge. WebGL 2 required. No COOP/COEP headers needed.

## Acknowledgements

- [LAM](https://github.com/aigc3d/LAM) (SIGGRAPH 2025) - single-image 3DGS heads. Zixuan Zeng et al., AIGC3D team
- [LHM](https://github.com/aigc3d/LHM) (SIGGRAPH 2025) - single-image 3DGS bodies. AIGC3D team
- [TRELLIS](https://github.com/microsoft/TRELLIS) - single-image 3D asset reconstruction. Microsoft.
- [Puppeteer](https://github.com/snap-research/Puppeteer) - automatic skeleton and skinning for generated 3D assets. Snap Research.
- [FLAME](https://flame.is.tue.mpg.de/) - face model (heads). Tianye Li, Timo Bolkart, Michael J. Black, Hao Li, Javier Romero
- [SMPL-X](https://smpl-x.is.tue.mpg.de/) - body model (bodies). Pavlakos, Choutas, Ghorbani, Bolkart, Osman, Tzionas, Black (MPI)
- [Spark 2.0](https://github.com/sparkjsdev/spark) - World Labs (MIT)
- [3D Gaussian Splatting](https://repo-sam.inria.fr/fungraph/3d-gaussian-splatting/) - Kerbl, Kopanas, Leimkuhler, Drettakis (INRIA)

## License

MIT
