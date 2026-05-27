<div align="center">

<img src="logo.svg" alt="Splattie" width="100" />

# splattie-widget

**Interactive 3D Gaussian Splatting - like Rive/Lottie for 3D**

[![npm](https://img.shields.io/npm/v/@affromero/splattie-widget?color=blue)](https://www.npmjs.com/package/@affromero/splattie-widget)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue?logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Spark](https://img.shields.io/badge/Spark_2.0-MIT-green)](https://github.com/sparkjsdev/spark)
[![Three.js](https://img.shields.io/badge/Three.js-r170+-black?logo=three.js)](https://threejs.org)
[![Tests](https://img.shields.io/badge/tests-25_passing-brightgreen)]()
[![Bundle](https://img.shields.io/badge/format-.splattie-orange)]()

</div>

---

<p align="center">
  <img src="demo.gif" alt="Splattie Widget Demo" width="600" />
</p>

A web component that makes gaussian splats **reactive**. Upload a 3D head, define interaction states, and embed it anywhere with a single tag. Eyes follow the cursor, face reacts to hover and click, expressions transition smoothly - all client-side at 60fps.

**See it live at [afromero.co](https://afromero.co)** - the circular avatar in the corner is a `<splattie-widget>`.

## Quick Start

```html
<splattie-widget src="avatar.splattie"></splattie-widget>
<script type="module" src="https://unpkg.com/@affromero/splattie-widget"></script>
```

That's it. One file, one tag.

## Install

```bash
npm install @affromero/splattie-widget
```

```typescript
import '@affromero/splattie-widget';
```

```html
<splattie-widget src="avatar.splattie"></splattie-widget>
```

## The `.splattie` Format

> **v0.x - experimental.** The core splat + bone files follow established standards (PLY, FLAME). The expression basis and states format may evolve. Breaking changes will bump the minor version.

A ZIP file containing everything the widget needs. All files except the splat data are optional - the widget degrades gracefully.

```
avatar.splattie
├── *.ply or *.spz            # (required) Gaussian splats
├── bone_tree.json            # (optional) Skeleton for skinning
├── lbs_weight_20k.json       # (optional) Per-splat bone weights
├── expression_basis.bin       # (optional) Blendshape basis
└── states.json               # (optional) Interaction states
```

### File Reference

#### Splat data (`.ply` or `.spz`)

Standard 3DGS format. Each splat has position (x,y,z), scale, rotation, opacity, and spherical harmonics color. The widget auto-detects PLY vs SPZ from the file header.

- **Source**: any 3DGS method (LAM, DreamGaussian, InstantSplat, etc.)
- **Stability**: standard format, unlikely to change

#### `bone_tree.json` - Skeleton

Hierarchical bone tree with positions. Currently 5 FLAME bones: root, neck, jaw, leftEye, rightEye. The widget uses these for SplatSkinning (dual quaternion mode).

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

- **Source**: FLAME model via `export_expression_basis.py`, or any skeleton with named bones
- **Stability**: stable structure, bone names are conventions not hard requirements
- **Without it**: no skinning, no eye tracking, no jaw animation

#### `lbs_weight_20k.json` - Bone Weights

2D array of linear blend skinning weights, shape `[num_splats][num_bones]`. Each row sums to ~1.0. The widget selects the top 4 bones per splat.

```json
[[0.8, 0.1, 0.05, 0.03, 0.02], ...]
```

- **Source**: FLAME model (upsampled to match splat count)
- **Stability**: stable, standard LBS format
- **Without it**: bones exist but nothing moves

#### `expression_basis.bin` - Blendshape Basis

Binary file with per-splat position displacements for each expression coefficient. Enables facial expressions that move all splats coherently (smile, lip shapes, etc.).

```
Header: "EXPR" (4 bytes) + num_vertices (uint32 LE) + num_expressions (uint32 LE)
Data:   float32 LE array, shape (num_vertices, num_expressions, 3)
```

Optional sidecar `expression_basis.json` maps indices to semantic labels:
```json
{ "labels": ["jawDown", "lipsUp", "lipsL", ...], "num_expressions": 50 }
```

- **Source**: `export_expression_basis.py` on a machine with FLAME model weights
- **Stability**: experimental format, may add compression or quantization
- **Without it**: no FLAME blendshape deformation (bone-driven expressions still work)

#### `states.json` - Interaction States

Defines what happens on idle, hover, click. Each state sets all 5 dimensions.

```json
{
  "version": 1,
  "defaults": {
    "camera": { "theta": 0, "phi": 75, "radius": 0.5, "fov": 60 },
    "autoBlink": { "interval": [2000, 7000], "duration": 150 }
  },
  "states": {
    "idle": {
      "ghost": { "amplitude": 0.003, "frequency": 0.4, "wobble": 0.2 },
      "expression": { "jawOpen": 0, "smile": 0, ... },
      "camera": { "theta": 0, "phi": 75, "radius": 0.5, "fov": 60 },
      "rotation": [0, 0, 0],
      "tracking": { "eyes": 1.0, "head": 0.1 }
    },
    "hover": { ... },
    "click": { ... }
  },
  "transitions": {
    "idle->hover": { "duration": 0.3, "easing": "ease-out" },
    "hover->idle": { "duration": 0.5, "easing": "ease-in" },
    "*->click": { "duration": 0.1, "easing": "snap" }
  }
}
```

- **Source**: visual editor at `npm run dev`, or hand-authored
- **Stability**: most likely to evolve as dimensions/features are added
- **Without it**: uses sensible defaults (eyes track cursor, gentle float, auto-blink)

### Creating Your Own `.splattie`

**Easiest**: use the visual editor (`npm run dev`), adjust sliders, click "Download .splattie".

**From scratch**: ZIP any combination of the files above. At minimum you need a `.ply` or `.spz`. The widget works with just splat data (static render) and adds features as it finds more files in the bundle.

**From a photo**: run LAM on a GPU server to generate the splat + FLAME data, then bundle with the export script. See the [Splattie repo](https://github.com/affromero/splattie) for the full pipeline.

Design states in the visual editor, export as `.splattie`, embed anywhere.

## Five Dimensions of State

Each interaction state (idle, hover, click) defines all five dimensions simultaneously:

| Dimension | Controls | Example |
|-----------|----------|---------|
| **Ghost** | Floating/bobbing motion | Gentle hover on idle, freeze on click |
| **Expression** | FLAME blendshapes + bone rotations | Smile on hover, surprise on click |
| **Camera** | Spherical position (θ, φ, radius) | Zoom in on hover |
| **Rotation** | Object pitch/yaw/roll | Tilt head on hover |
| **Tracking** | Cursor-follow intensity | Eyes track on idle, head follows on hover |

The widget interpolates between states with configurable easing and duration.

## Expression System

Two layers work together for natural facial animation:

**Bone-driven** (SplatSkinning, 5 FLAME bones):
- Jaw open/close
- Neck pitch, yaw, roll
- Eye gaze direction (left/right, up/down)
- Brow raise/frown (left/right independently)

**Blendshape-driven** (FLAME expression basis, 10+ PCA coefficients):
- Moves all 20K splats coherently
- Smile, lip shapes, jaw articulation, cheek/nose deformation
- Spatial mask prevents beard/neck from deforming

## API

### Attributes

| Attribute | Description |
|-----------|-------------|
| `src` | URL to `.splattie` file (recommended) or `.ply`/`.spz` |
| `background` | Background color hex (default: `#0e0e14`) |
| `width` | CSS width (default: `100%`) |
| `height` | CSS height (default: `400px`) |

### Events

```javascript
const widget = document.querySelector('splattie-widget');

widget.addEventListener('splatload', () => console.log('Ready'));
widget.addEventListener('splathover', () => console.log('Cursor on face'));
widget.addEventListener('splatclick', () => console.log('Clicked face'));
widget.addEventListener('splatleave', () => console.log('Cursor left face'));
```

### Methods

```javascript
widget.setState('hover');  // Force a state transition
```

## Visual Editor

Run the dev server to open the on-canvas state editor:

```bash
npm run dev  # http://localhost:4002
```

- Sliders for all 5 dimensions with real-time preview
- Camera sphere widget for intuitive positioning
- State tabs (idle/hover/click) with copy-forward
- FLAME blendshape sliders (10 PCA coefficients)
- Export as `.splattie` when done

## How It Works

Built on **[Spark 2.0](https://github.com/sparkjsdev/spark)** (MIT, by World Labs) - a Three.js-based 3D Gaussian Splatting renderer. The widget adds:

1. **State machine** with per-dimension interpolation (lerp, slerp, ease curves)
2. **SplatSkinning** (dual quaternion) driving 5 FLAME bones from expression + cursor data
3. **Expression basis** - per-splat position offsets written directly to Spark's packed buffer (half-float encoding, ~20K splats/frame)
4. **Hit detection** via `readPixels` after render (pixel-perfect, no raycasting needed)
5. **Auto-blink** with randomized interval and sine-curve eyelid animation via SplatEdit

## Mobile

Touch events work out of the box. Eyes follow the touch position and return to center when the finger lifts. Tap triggers click state.

## Browser Support

Works in Chrome, Firefox, Safari, and Edge. Requires WebGL 2. No COOP/COEP headers needed.

## Acknowledgements

- **[LAM](https://github.com/aigc3d/LAM)** (SIGGRAPH 2025) - Single-image 3DGS head generation by Zixuan Zeng et al. and the AIGC3D team
- **[FLAME](https://flame.is.tue.mpg.de/)** - Learned 3D face model by Tianye Li, Timo Bolkart, Michael J. Black, Hao Li, Javier Romero
- **[Spark 2.0](https://github.com/sparkjsdev/spark)** - 3DGS renderer by World Labs (MIT)
- **[3D Gaussian Splatting](https://repo-sam.inria.fr/fungraph/3d-gaussian-splatting/)** - Kerbl, Kopanas, Leimkühler, Drettakis (INRIA)

## License

MIT
