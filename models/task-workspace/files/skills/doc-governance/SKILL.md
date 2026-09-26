---
name: doc-governance
description: Use when deciding where task-workspace information belongs or promoting session and output knowledge into durable sources.
---

# Task Workspace Document Governance

1. Identify whether the content is a durable fact, decision, case output, session record, reference, or untriaged idea.
2. Keep case- and period-specific content in `outputs/`.
3. Keep decisions and resume context in `sessions/` and `SESSION_HANDOFF.md`.
4. Promote content into `context/` only after checking evidence, scope, and whether it remains useful across cases.
5. Separate user-provided facts, externally verified facts, interpretations, and hypotheses.
6. Do not silently delete old durable facts; record why they changed.
7. Do not copy full chats, emails, secrets, or private source content into durable documents.
8. Show the proposed target and semantic change before updating a source of truth.
