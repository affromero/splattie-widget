# `.splattie` Format Specification

A `.splattie` file is a ZIP archive that bundles a 3D Gaussian Splatting
avatar with the metadata, skeleton, weights, expression basis, and
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
avatar.splattie
├── manifest.json             # required, MUST be present
├── <splat>.ply | <splat>.spz # required, gaussian splats
├── bone_tree.json            # optional, FLAME skeleton
├── lbs_weight_20k.json       # optional, per-splat bone weights
├── expression_basis.bin      # optional, FLAME blendshape basis
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
  "formatVersion": "0.2.0",
  "assetType": "head",                   // "head" | "body" | "object"

  "generator": {
    "method": "lam",                     // "lam" (head) | "lhm" (body) | ...
    "methodVersion": "20k-siggraph2025", // optional, free-form
    "tool": "generate_splattie_batch.py",
    "createdAt": "2026-05-27T18:00:00Z"  // ISO-8601 UTC
  },

  "avatar": {
    "splat": {
      "file": "avatar.ply",               // ZIP entry name
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
| `generator.method` | yes | Identifies the asset-generation pipeline (`lam` heads, `lhm` bodies, …) |
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

| Role | `head` (FLAME rig) | `body` (SMPL-X rig) |
|------|--------------------|---------------------|
| Look-at root | `neck` | `head` |
| Left / right eye | `leftEye` / `rightEye` | `left_eye_smplhf` / `right_eye_smplhf` |
| Jaw | `jaw` | `jaw` (unused for cursor) |
| Left arm chain | n/a | `left_collar → left_shoulder → left_elbow → left_wrist` |
| Right arm chain | n/a | `right_collar → right_shoulder → right_elbow → right_wrist` |

- `animation.skeleton.rig` is `"flame"` for heads and `"smpl-x"` for bodies.
- FLAME per-splat expression basis (`animation.expression.basis`) is **head-only**;
  body manifests set it to `null` and the widget ignores any `expression-basis`
  attribute for non-head bundles.

### Tracking fields (`WidgetConfig.states[*].tracking`)

| Field | Asset type | Meaning |
|-------|-----------|---------|
| `eyes` | all | Eye-gaze cursor follow strength |
| `head` | all | Head/neck turn strength |
| `armReach` | body | How far the nearer arm reaches toward the cursor (CCD IK) |
| `shoulderFollow` | body | How much the shoulders rotate to follow head yaw |

### Editor ↔ skinning expression contract (body)

Body editor sliders write `state.expression[key]`; the widget's body skinning
consumes the same keys (summed with cursor motion, defaults `0`). Source of truth:

| Expression key | SMPL-X joint | Mechanism |
|----------------|--------------|-----------|
| `bodyYaw` / `bodyTilt` | `spine3` | torso Y / X rotation |
| `shoulderRaiseL` / `shoulderRaiseR` | `left_collar` / `right_collar` | shrug (summed with cursor `shoulderFollow`) |
| `elbowBendL` / `elbowBendR` | `left_elbow` / `right_elbow` | bend (post-multiplied after IK on the active arm) |

> Body skinning + these editor controls land in Phase 1.D / 1.E. Phase 1.A
> ships the `assetType` plumbing; loading a body bundle today errors loudly
> until the body code path exists.

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
silently rendering a half-broken avatar.

Migration path: regenerate the `.splattie` against the new widget
version. The bundled
[`add_manifest_to_splattie.py`](../../backend/scripts/add_manifest_to_splattie.py)
script can update existing bundles in-place without re-running the
head-generation pipeline as long as the underlying assets are still
compatible.

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
# from backend/vendor/LAM/
python ../../scripts/generate_splattie_batch.py \
    --images-dir /tmp/portraits \
    --output-dir /tmp/splattie_out
```

This calls LAM inference per image, parses the PLY header for the
gaussian count, hashes the source image, and writes a manifest with the
current widget version pulled from `packages/splattie-widget/package.json`.

### Re-bundle an existing `.splattie`

If you already have the raw PLY + bone files in a ZIP (the pre-manifest
layout), wrap a manifest around it without re-running inference:

```bash
python backend/scripts/add_manifest_to_splattie.py \
    --splatties-dir apps/web/public/demos \
    --thumbs-dir apps/web/public/demos/thumbs
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
unzip -p avatar.splattie manifest.json | jq
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
| Generator (GPU) | [`backend/scripts/generate_splattie_batch.py`](../../backend/scripts/generate_splattie_batch.py) |
| Re-bundler (CPU) | [`backend/scripts/add_manifest_to_splattie.py`](../../backend/scripts/add_manifest_to_splattie.py) |
| Editor re-export | [`apps/web/public/editor.html`](../../apps/web/public/editor.html) |
