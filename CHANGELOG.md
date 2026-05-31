# Changelog

## [0.3.0] - 2026-05-31

### Added
- Object `.splattie` support with arbitrary skeletons, binary sparse LBS weights, root/joint cursor-follow, and drag-to-pose skeleton handles.
- Object-aware editor controls for camera, rotation, follow, rig joint sliders, and direct pose editing.
- Runtime APIs for object rig inspection and handle solving: `rigJoints()`, `objectRigGraph()`, `objectPoseHandles()`, and `solveObjectHandleToScreen()`.

### Changed
- `.splattie` format `0.3.0` now covers heads, bodies, and general-purpose rigged objects under the same custom element.
- README and format documentation now describe object bundles and the binary object weight contract.
- Object defaults use asset-specific framing and follow behavior instead of inheriting avatar expression controls.

### Fixed
- Object bundles render upright with the production viewer transform and no longer expose head-only smile/jaw controls in the editor.

## [0.2.0] - 2026-05-31

### Added
- Full body `.splattie` support with SMPL-X skeletons, linear blend skinning weights, posed-rest handling, and body-aware camera framing.
- Body editing controls for shoulder follow, arm reach, pose overrides, and head/torso look-at tracking.
- Test coverage gates for deterministic renderer/util modules, including reduced-motion rendering and body IK regression coverage.

### Changed
- `.splattie` format `0.2.0` requires `manifest.assetType`, enabling heads, bodies, and future general-purpose objects to share one loader.
- Expression-basis and PLY loading now handle compressed/body bundles with smaller generated assets.
- Runtime motion defaults are calmer for static/reduced-motion contexts while preserving interactive tracking.

### Fixed
- Body skinning/rest-pose issues that caused stretched arms or unstable T-pose behavior.
- Reduced-motion static render paths that could leave the widget blank.
- Body IK hit-testing and handle visibility regressions in the inline editor.

## [0.1.1] - 2026-05-28

### Added
- `manifest.json` is now required inside every `.splattie` ZIP. Declares `formatVersion`, generator info, asset paths (splat / skeleton / weights / expression basis), animation type, and metadata. Full spec: `FORMAT.md`.
- Strict format-version locking: the widget refuses files whose `manifest.formatVersion` does not equal the widget version. Hard error with actionable message ("rebuild and re-bundle"). Pre-1.0 strict-equality policy.
- `VERSION` export from the package, injected at build time via Vite `define` from `package.json`.
- Bone lookups inside the renderer use names from `bone_tree.json` (`neck`, `jaw`, `leftEye`, `rightEye`) instead of hardcoded indices. Decouples from any specific FLAME bone ordering and makes the format method-agnostic.
- `expression-basis` HTML attribute is now honoured even when the file is a `.splattie` (used to be limited to the loose-file path). Lets the 12 MB FLAME PCA basis live as a shared asset alongside many small `.splattie` files.

### Fixed
- Widget dev demo (`packages/splattie-widget/public/`) replaced with a Pexels-licensed `demo.splattie`; old PII demo removed.

### Changed
- `WidgetConfig.version` field removed (the format version now lives in `manifest.json`).
- File discovery inside the ZIP no longer uses `String.includes()` pattern matching; the loader reads exact file paths from the manifest.

## [0.1.0] - 2026-05-27

Initial public release. `<splattie-widget>` web component with FLAME SplatSkinning, expression basis, state machine, and `.splattie` ZIP loading.
