# Changelog

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
