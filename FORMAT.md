# `.splattie` Format Specification

A `.splattie` file is a ZIP archive that bundles a 3D Gaussian Splatting
asset with the metadata, skeleton, weights, expression basis, and
interaction states required to make it reactive in the browser.

The format is intentionally tied to the
[`@afromero/splattie-widget`](https://www.npmjs.com/package/@afromero/splattie-widget)
runtime. Every bundle declares its own `formatVersion`, and the widget
refuses to load a bundle whose `formatVersion` does not match the widget
build it shipped with. There is no silent compatibility shim - if the
versions disagree the widget throws.

> **Pre-1.0 policy.** While the widget is `0.x`, `formatVersion` must
> match exactly (`"0.1.0" === "0.1.0"`). After `1.0`, semver rules apply
> (major mismatch = refuse, minor/patch = accept).

---

## ZIP layout

```
asset.splattie
├── manifest.json             # required, MUST be present
├── <splat>.ply | <splat>.spz # required, gaussian splats
├── bone_tree.json            # optional, FLAME skeleton for heads
├── lbs_weight_20k.json       # optional, JSON per-splat FLAME weights
├── expression_basis.bin      # optional, FLAME blendshape basis for heads
├── skeleton.json             # optional, SMPL-X or object skeleton
├── lbs_weights.json          # optional, JSON sparse body LBS weights
├── lbs_weights.bin           # optional, binary sparse object LBS weights
└── states.json               # optional, interaction states
```

Every file inside the ZIP that the widget consumes must be declared in
`manifest.json`. The widget never guesses filenames; if a referenced
file is missing it errors out.

---

## `manifest.json` schema

```jsonc
{
  "format": "splattie",
  "formatVersion": "0.3.0",
  "assetType": "head",                   // "head" | "body" | "object"

  "generator": {
    "method": "lam",                     // "lam" | "lhm" | "trellis-puppeteer" | ...
    "methodVersion": "20k-siggraph2025", // optional, free-form
    "tool": "splattie-backend",
    "createdAt": "2026-05-27T18:00:00Z"  // ISO-8601 UTC
  },

  "avatar": {
    "splat": {
      "file": "asset.ply",                // ZIP entry name
      "format": "ply",                    // "ply" | "spz"
      "numGaussians": 20018,
      "topology": "flame-20k"             // free-form topology tag
    }
  },

  "animation": {
    "type": "lbs",                        // "lbs" | "blendshape" | "neural"
    "skeleton": { "file": "bone_tree.json", "rig": "flame" },
    "weights":  { "file": "lbs_weight_20k.json" },
    "expression": { "system": "flame-pca", "basis": null }
    // "basis" is either null or the ZIP entry name of an expression_basis.bin
  },

  "widget": {
    "config": "states.json"               // ZIP entry name for the WidgetConfig
  },

  "metadata": {                           // optional, free-form provenance
    "sourceImageHash": "sha256:...",
    "license": "Pexels (free license)",
    "attribution": "Photo by ... on Pexels",
    "author": "Andres Romero",
    "lastEditedAt": "2026-05-27T18:00:00Z",
    "editedBy": "splattie-editor"
  }
}
```

### Field rules

| Field | Required | Notes |
|-------|----------|-------|
| `format` | yes | Always the string `"splattie"` |
| `formatVersion` | yes | MUST equal the widget version exactly (pre-1.0) |
| `assetType` | yes | `"head"`, `"body"`, or `"object"` — selects the widget's skinning code path and rig conventions |
| `generator.method` | yes | Identifies the asset-generation pipeline (`lam` heads, `lhm` bodies, `trellis-puppeteer` objects, …) |
| `generator.tool` | yes | Filename of the producing script |
| `generator.createdAt` | yes | ISO-8601 timestamp |
| `avatar.splat.file` | yes | ZIP entry name, must exist |
| `avatar.splat.format` | yes | `"ply"` or `"spz"` |
| `avatar.splat.numGaussians` | yes | Parsed from the PLY header at build time |
| `avatar.splat.topology` | yes | Free-form, e.g. `"flame-20k"` |
| `animation.type` | yes | `"lbs"`, `"blendshape"`, or `"neural"` |
| `animation.skeleton` | optional | Required for `type: "lbs"` |
| `animation.weights` | optional | Required for `type: "lbs"` |
| `animation.expression` | optional | `basis` is either `null` or a ZIP entry name |
| `widget.config` | yes | ZIP entry name of the `WidgetConfig` JSON |
| `metadata` | optional | Free-form provenance |

---

## Asset types & rig conventions

`assetType` selects which skinning code path the widget runs and which joint
names it expects. Each asset type owns a deterministic path — there is no
cross-type translation.

| Role | `head` (FLAME rig) | `body` (SMPL-X rig) | `object` (arbitrary rig) |
|------|--------------------|---------------------|--------------------------|
| Look-at root | `neck` | `head` | root joint |
| Left / right eye | `leftEye` / `rightEye` | `left_eye_smplhf` / `right_eye_smplhf` | n/a |
| Jaw | `jaw` | `jaw` (unused for cursor) | n/a |
| Left arm chain | n/a | `left_collar → left_shoulder → left_elbow → left_wrist` | terminal joint chain |
| Right arm chain | n/a | `right_collar → right_shoulder → right_elbow → right_wrist` | terminal joint chain |

- `animation.skeleton.rig` is `"flame"` for heads, `"smplx"` for bodies, and
  `"puppeteer-object"` for object bundles.
- FLAME per-splat expression basis (`animation.expression.basis`) is **head-only**;
  body and object manifests set it to `null` and the widget ignores any
  `expression-basis` attribute for non-head bundles.
- Object manifests use `lbs_weights.bin` with `format: "lbsw-v1"`.
  The skeleton joint names are not prescribed; the widget derives root and
  terminal handles from the hierarchy.

### Tracking fields (`WidgetConfig.states[*].tracking`)

| Field | Asset type | Meaning |
|-------|-----------|---------|
| `eyes` | head | Eye-gaze cursor follow strength |
| `head` | head/body/object | Heads and bodies: head/neck turn strength. Objects: terminal-joint follow strength |
| `armReach` | body | How far the nearer arm reaches toward the cursor (CCD IK) |
| `shoulderFollow` | body | How much the shoulders rotate to follow head yaw |
| `torso` | body/object | Bodies: torso follow strength. Objects: root-joint follow strength |

### Editor ↔ skinning expression contract (body)

Body editor sliders write `state.expression[key]`; the widget's body skinning
consumes the same keys (summed with cursor motion, defaults `0`). Source of truth:

| Expression key | SMPL-X joint | Mechanism |
|----------------|--------------|-----------|
| `bodyYaw` / `bodyTilt` | `spine3` | torso Y / X rotation |
| `shoulderRaiseL` / `shoulderRaiseR` | `left_collar` / `right_collar` | shrug (summed with cursor `shoulderFollow`) |
| `elbowBendL` / `elbowBendR` | `left_elbow` / `right_elbow` | bend (post-multiplied after IK on the active arm) |

### Editor ↔ skinning expression contract (object)

Object editor controls write `state.pose[jointName]` quaternions directly. The
widget runs forward kinematics over the arbitrary skeleton, applies sparse LBS
weights, and exposes projected terminal handles through `objectRigGraph()` for
drag-to-pose editing.

---

## Version policy

Pre-1.0 the policy is strict equality:

```
manifest.formatVersion === widget.VERSION
```

Why so strict? The widget bakes its `package.json` version into the
bundle at build time via Vite's `define`. A `.splattie` produced by an
older widget probably reads asset offsets that the newer widget no
longer understands, or vice versa. Failing loud is cheaper than
silently rendering a half-broken asset.

Migration path: regenerate the `.splattie` against the new widget version, or
use the backend `splattie add-manifest` command for compatible manifest-only
stamps.

After 1.0 the policy will relax to standard semver:

| `formatVersion` vs widget | Behavior |
|---------------------------|----------|
| Same major, same minor    | Accept |
| Same major, older minor   | Accept (widget is forward-compatible within major) |
| Same major, newer minor   | Accept with console.warn |
| Different major           | Refuse |

---

## How to generate a `.splattie`

### From the GPU pipeline

```bash
uv run --directory backend splattie generate-splattie-batch \
    --images-dir /tmp/images \
    --output-dir /tmp/splattie_out
```

This runs the selected backend method, parses the PLY header for the Gaussian
count, hashes the source image, and writes a manifest with the current widget
version pulled from `packages/splattie-widget/package.json`.

### Re-bundle an existing `.splattie`

If you already have the raw PLY + rig files in a ZIP (or need to stamp a new
compatible format version), wrap a manifest around it without re-running
inference:

```bash
uv run --directory backend splattie add-manifest \
    --splatties-dir apps/web/public/demos/heads \
    --thumbs-dir apps/web/public/demos/heads \
    --asset-type head
```

The script is idempotent - it skips files that already declare a
matching `formatVersion`.

### From the editor

`apps/web/public/editor.html` reads the original `manifest.json`,
stamps `metadata.lastEditedAt` and `metadata.editedBy`, then re-emits
the bundle with the same manifest plus the user's edited
`states.json`.

---

## How to validate a `.splattie`

Quick manual check:

```bash
unzip -p asset.splattie manifest.json | jq
```

The widget runs the same validation at load time:

1. Reject if `manifest.json` is missing.
2. Reject if `manifest.format !== "splattie"`.
3. Reject if `manifest.formatVersion !== __WIDGET_VERSION__`.
4. Reject if any file declared in the manifest is missing from the ZIP.

Errors are thrown synchronously from `SplatWidget.connectedCallback`
and logged via `console.error`.

---

## Evolution policy

- **Schema additions** (new optional fields) bump `formatVersion`
  patch.
- **Required-field changes** or **renames** bump `formatVersion`
  minor (pre-1.0) or major (post-1.0).
- **Format-breaking changes** to a referenced asset (e.g. new PLY
  layout, new expression-basis header) bump `formatVersion` minor.

There is no backward compatibility shim. Bundles regenerate from the
source photo / mesh; the format is meant to be cheap to recreate.

---

## Reference implementation

| Layer | File |
|-------|------|
| Type definition | [`src/types.ts`](src/types.ts) (`SplattieManifest`) |
| Loader + validation | [`src/SplatWidget.ts`](src/SplatWidget.ts) |
| Default config schema | [`src/state/StateConfig.ts`](src/state/StateConfig.ts) |
| Generator (GPU) | [`backend/src/splattie/cli/batch.py`](../../backend/src/splattie/cli/batch.py) |
| Object bundler | [`backend/src/splattie/cli/object_bundle.py`](../../backend/src/splattie/cli/object_bundle.py) |
| Re-bundler (CPU) | [`backend/src/splattie/cli/bundle_tools.py`](../../backend/src/splattie/cli/bundle_tools.py) |
| Editor re-export | [`apps/web/public/editor.html`](../../apps/web/public/editor.html) |
