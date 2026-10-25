---
name: osv-dependency-adapter
description: Install the pinned OSV-Scanner after authorization and perform a dependency scan for the project's security gate using reviewed lockfiles and network mode.
---

Read the project's `security-gate` skill and `docs/SECURITY_ASSURANCE.md`. `provider-lock.json` pins version 2.7.0 binaries, published SHA-256 digests, checksum manifest and provenance. Download them only through the reviewed common install plan. The installer checks the published digests and retains provenance; it does not claim to cryptographically verify SLSA provenance itself.

Use `run-osv` for explicit inputs in the snapshot, with a reviewed online/offline choice. Offline DB acquisition is a separate approved preparation; supply its directory and acquisition time. Never auto-fallback online. Keep the JSON, context, raw advisory severities and inventory in the private output root. Missing/unsupported inventory and exit 127/128/129/130 are not clean scans. Do not run fix, package scripts or a live credential check. Findings with missing severity need review rather than guessed low priority.
