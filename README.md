<div align="center">

<img src="logo.svg" alt="Splattie" width="100" />

# splattie-widget

**Interactive 3D Gaussian Splatting — like Rive/Lottie for 3D**

[![npm](https://img.shields.io/npm/v/@affromero/splattie-widget?color=blue)](https://www.npmjs.com/package/@affromero/splattie-widget)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue?logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Spark](https://img.shields.io/badge/Spark_2.0-MIT-green)](https://github.com/sparkjsdev/spark)
[![Three.js](https://img.shields.io/badge/Three.js-r170+-black?logo=three.js)](https://threejs.org)
[![Tests](https://img.shields.io/badge/tests-25_passing-brightgreen)]()
[![Bundle](https://img.shields.io/badge/format-.splattie-orange)]()

</div>

---

A web component that makes gaussian splats **reactive**. Upload a 3D head, define interaction states, and embed it anywhere with a single tag. Eyes follow the cursor, face reacts to hover and click, expressions transition smoothly — all client-side at 60fps.

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

A single ZIP file containing everything the widget needs:

```
avatar.splattie
├── model.ply                 # 20K gaussian splats (or .spz)
├── bone_tree.json            # 5 FLAME skeleton bones
├── lbs_weight_20k.json       # Per-splat LBS weights
├── expression_basis.bin      # FLAME blendshape basis (10+ PCA coefficients)
└── states.json               # Interaction state definitions
```

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

Built on **[Spark 2.0](https://github.com/sparkjsdev/spark)** (MIT, by World Labs) — a Three.js-based 3D Gaussian Splatting renderer. The widget adds:

1. **State machine** with per-dimension interpolation (lerp, slerp, ease curves)
2. **SplatSkinning** (dual quaternion) driving 5 FLAME bones from expression + cursor data
3. **Expression basis** — per-splat position offsets written directly to Spark's packed buffer (half-float encoding, ~20K splats/frame)
4. **Hit detection** via `readPixels` after render (pixel-perfect, no raycasting needed)
5. **Auto-blink** with randomized interval and sine-curve eyelid animation via SplatEdit

## Mobile

Touch events work out of the box. Eyes follow the touch position and return to center when the finger lifts. Tap triggers click state.

## Browser Support

Works in Chrome, Firefox, Safari, and Edge. Requires WebGL 2. No COOP/COEP headers needed.

## Acknowledgements

- **[LAM](https://github.com/aigc3d/LAM)** (SIGGRAPH 2025) — Single-image 3DGS head generation by Zixuan Zeng et al. and the AIGC3D team
- **[FLAME](https://flame.is.tue.mpg.de/)** — Learned 3D face model by Tianye Li, Timo Bolkart, Michael J. Black, Hao Li, Javier Romero
- **[Spark 2.0](https://github.com/sparkjsdev/spark)** — 3DGS renderer by World Labs (MIT)
- **[3D Gaussian Splatting](https://repo-sam.inria.fr/fungraph/3d-gaussian-splatting/)** — Kerbl, Kopanas, Leimkühler, Drettakis (INRIA)

## License

MIT
