# Local AI Short-Video Workbench — Task Checklist

## Confirmed decisions

- [x] Version 1 supports both macOS and Windows.
- [x] Use a new brand and replace original product identity, URLs, licensing, and trial language.
- [x] Match the reference providers: DeepSeek; Doubao/Tavily search; Ark Seedream/APIYi/Shengsuanyun images; Doubao TTS/ASR.
- [x] Reuse existing channel template and prompt logic with a new-brand rewrite.
- [x] Match reference video composition behavior and establish exact values through golden-output tests.
- [x] Use assisted publishing: automatic form filling, human final publication.
- [x] Exclude cloud sync, licensing, trials, certificates, and auto-update from version 1.

## Remaining decisions

- [x] Brand: 镜序工坊 / JINGXU STUDIO; teal, navy, and coral palette; Logo source files created.
- [x] Replace the old fixed trial line with a configurable 镜序工坊 closing line.
- [x] Determine project capacity, concurrency, and storage warnings adaptively from the system.
- [x] Support Apple Silicon macOS 13+; do not support Intel Mac.
- [x] Support Windows 10 22H2 and Windows 11 x64.
- [ ] Choose the formal help-site domain.
- [ ] Complete trademark, domain, and app-store name checks before commercial release.

## Phase 0: Contract

- [ ] Task 1 — Freeze replica contract and reference-state inventory.
- [ ] Task 2 — Define OpenAPI, domain types, error envelope, and state machines.
- [ ] Checkpoint — Human approves scope, visual target, and provider choices.

## Phase 1: Foundation

- [ ] Task 3 — Bootstrap React/FastAPI local application shell.
- [ ] Task 4 — Add SQLite migrations and safe artifact directories.
- [ ] Task 5 — Build resizable sidebar, header, routes, and design tokens.
- [ ] Checkpoint — Persistence, deep links, localhost binding, and golden shell pass.

## Phase 2: Authoring

- [ ] Task 6 — Channel and project create/search/pin/reorder/trash/restore flow.
- [ ] Task 7 — Channel templates and inherited configuration.
- [ ] Task 8 — Brief, AI script generation, Markdown editing, references, and revision restore.
- [ ] Task 8A — JSON/Markdown/text hotspot-card validation, preview, duplicate detection, and import.
- [ ] Task 9 — Persistent staged jobs, SSE progress, logs, reconnect, and cancellation.
- [ ] Checkpoint — Create project → generate/edit script → restore version works.

## Phase 3: Production

- [ ] Task 10 — Reference-compatible provider adapters, fakes, safe secrets, and effective configuration.
- [ ] Task 10A — One-click generic, Xiaohongshu, and WeChat article conversion with independent versions.
- [ ] Task 11 — Audio, subtitle, timeline, image, cover, and FFmpeg pipeline.
- [ ] Task 12 — Upload routing, Production UI, artifact grid, previews, downloads, and deletion.
- [ ] Checkpoint — One complete topic produces validated media artifacts end-to-end.

## Phase 4: Publishing and release

- [ ] Task 13 — Assisted publishing, isolated accounts, status, and release-link tracking.
- [ ] Task 13A — Maintenance scans, repair preview, backup, quarantine, and undo.
- [ ] Task 14 — macOS packaging, migration, Keychain integration, recovery, and hardening.
- [ ] Task 15 — Windows packaging, Credential Manager integration, Edge fallback, and golden-output validation.
- [ ] Checkpoint — Release candidate passes golden-path, security, recovery, and installer checks.

## Suggested build order for the MVP

- [ ] Sprint 1: Tasks 1–5.
- [ ] Sprint 2: Tasks 6–9, including Task 8A hotspot import.
- [ ] Sprint 3: Tasks 10–12, including Task 10A article conversion, using fake providers first.
- [ ] Sprint 4: Connect all reference-compatible providers and calibrate output.
- [ ] Sprint 5: Task 13 publishing plus Task 13A maintenance and repair center.
- [ ] Sprint 6: Tasks 14–15 macOS/Windows packaging and cross-platform golden tests.

## Standing quality gates

- [ ] `pytest` passes.
- [ ] Frontend tests and type-check pass.
- [ ] Production frontend build succeeds.
- [ ] Visual regression passes at approved viewports.
- [ ] No API key appears in responses, logs, screenshots, or test fixtures.
- [ ] All filesystem operations remain inside the configured data root.
- [ ] Destructive UI actions require confirmation.
- [ ] Long-running work is cancellable and recovers after restart.
- [ ] Original product branding is absent and reused prompt logic has passed the new-brand rewrite review.
