# Security

`@afromero/splattie-widget` is a browser library that renders `.splattie`
Gaussian-splat bundles. If you find a vulnerability, open a private security
advisory on this repository (or contact the maintainer directly) rather than
a public issue.

## Model

- The widget runs entirely client-side. It fetches a `.splattie` bundle from
  the URL the host page provides and never sends data anywhere else. No
  cookies, storage, or credentials are read or written.
- Bundles are parsed as binary data, not executed. The loader checks
  `formatVersion`, weights-file version, and skeleton/weights length
  consistency and throws on mismatch; a malformed bundle fails to load
  rather than rendering partially.
- Host pages control what the widget can touch: it only draws into the
  element it is attached to and only listens to pointer, touch, and device
  orientation events on that element (gyro permission is requested on a user
  gesture, never at load).
- The CDN build is a single self-contained ES module; no runtime dependency
  fetches.
- Supply chain: CodeQL, gitleaks, and Dependabot (weekly, 7-day cooldown, one
  grouped PR per ecosystem) run on every push. Workflow actions are pinned by
  commit SHA. npm publishes go through the `publish-npm` workflow only.
