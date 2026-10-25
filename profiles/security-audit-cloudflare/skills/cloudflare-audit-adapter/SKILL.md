---
name: cloudflare-audit-adapter
description: Prepare the pinned Cloudflare security-audit skill for the project's security gate and import a full audit report; use with the security-audit-cloudflare tooling profile.
---

Read the project's `security-gate` skill and `docs/SECURITY_ASSURANCE.md`. This adapter's `provider-lock.json` pins the complete upstream skill and license. It contains acquisition metadata, not installed audit code.

Use the common plan/install workflow after human authorization. Verify discovery of the installed `security-audit` skill; invoke its full audit mode with independent agents, private output, exact source/scope and finite budget. Preserve the upstream source-only/local-sandbox boundary. Import the finished report through the common script, which checks the exact pinned validators and coverage. An absent/partial skill or incomplete campaign is not a clean audit. Do not replace it with checklist review or recommend installing Mantis as routine setup.
