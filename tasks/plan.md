# Implementation Plan: Local AI Short-Video Workbench Replica

Detailed implementation specification: `docs/implementation-design.md`

## Overview

Build a newly branded, local-first desktop-style web application that reproduces the observed workflow of AVMarker: channel templates and projects in a resizable sidebar; script drafting and revision; staged AI production; media/file management; and assisted publishing. The first release must support both macOS and Windows and serve its UI only on `127.0.0.1`. Visual behavior and production output should closely match the inspected interface. Existing channel prompts may be used as source material with brand-specific sales language, product names, help links, certificates, and artwork replaced by the new brand.

## Approved Product Decisions

- **Platforms:** macOS and Windows are both required in version 1.
- **Branding:** ship as “镜序工坊 / JINGXU STUDIO” using mirror teal `#0F766E`, deep navy `#0F172A`, and creative coral `#FF6B57`.
- **Channel prompts:** reuse the existing channel templates/prompts as authorized source material, then replace old-brand identifiers, trial upsells, URLs, and license language. Replace the fixed trial closing line with the configurable new-brand line “本期内容由镜序工坊辅助创作，从灵感到成片，一条线完成。”
- **Publishing:** automatically open and fill platform forms; the user performs the final publish action.
- **Cloud/licensing:** exclude cloud configuration sync, memberships, trials, certificates, licensing, and auto-update from version 1.
- **Output parity:** match the reference system's video resolution, subtitle rendering, scene timing, transitions, voice/BGM mix, and encoding behavior.
- **Provider parity:** retain the reference provider choices described below.
- **Supported systems:** Apple Silicon macOS 13+; Windows 10 22H2 and Windows 11 x64; no Intel Mac or 32-bit Windows build.
- **Capacity:** calculate project warnings and production concurrency from available CPU, RAM, disk space, active workloads, and provider limits.

## Confirmed Reference Behavior

- Two-pane workspace: approximately 320 px resizable sidebar and a flexible main area.
- Four project routes/states: Script, Production, Results, Publishing.
- Channel hierarchy with project status, count, search, pin/reorder, trash, and folder actions.
- Script brief, AI generation, source references, scoring tools, Markdown preview/editing, and version restore.
- Staged pipeline: audio, subtitles, scene timeline, scene images, covers, and final video.
- Drag-and-drop asset ingestion with aspect-ratio routing for 16:9, 4:3, and 3:4 images.
- Real-time job logs, progress, cancellation, elapsed time, and artifact reuse.
- Artifact grid for video, audio, image, Markdown, JSON, and SRT files.
- Platform-specific accounts and assisted form filling for Douyin, Xiaohongshu, and WeChat Channels.
- Global secrets/configuration plus per-channel prompt, voice, cover, tag, and BGM overrides.
- Local SQLite metadata and filesystem-based media artifacts.

## Architecture Decisions

- **Frontend:** React + TypeScript + Vite + Ant Design. This is the closest maintainable match to the inspected React/Ant Design bundle.
- **Backend:** Python 3.11+ with FastAPI and Pydantic. Serve the compiled SPA and JSON API from one localhost process.
- **Persistence:** SQLite for projects, jobs, publishing accounts/tasks, and release links. Store large artifacts on disk rather than as database blobs.
- **Task execution:** A bounded local worker queue. Persist job state and stream normalized progress events over SSE.
- **Pipeline adapters:** Define stable interfaces for text generation, search, image generation, TTS, ASR, timeline planning, FFmpeg composition, and publishing automation. Version 1 ships with the same provider families as the reference while keeping vendor implementations replaceable.
- **Provider set:** DeepSeek for content; Doubao Search Custom and Tavily for research; Volcengine Ark/Doubao Seedream plus GPT-Image-2 through APIYi and Shengsuanyun for images; Doubao Podcast TTS and Doubao ASR for speech.
- **Security:** Bind to `127.0.0.1`; redact secrets from API responses and logs; store secrets with macOS Keychain and Windows Credential Manager when packaged. Never expose raw keys to the frontend.
- **Publishing:** Automate opening and filling platform pages, but keep the final publish click under user control.
- **Packaging:** Start with a development launcher; package the backend, static frontend, FFmpeg, platform-appropriate Chinese fonts, browser automation, and migrations for both macOS and Windows after the local flow is stable.
- **Brand/IP boundary:** Match layout and interaction behavior. Channel prompt logic is approved for reuse, but remove or replace the original product name, logo, help content, license checks, trial messaging, and fixed original-brand calls to action.

## Reference-Compatible Provider Defaults

| Capability | Version-1 providers and defaults |
|---|---|
| Text generation | DeepSeek API; model ID configurable; thinking and reasoning effort configurable |
| Web search | Doubao Search Custom or Tavily; topic modes `general`, `news`, `finance`; reference caps 10/20/40/60/80 |
| Image generation | Volcengine Ark/Doubao Seedream; GPT-Image-2 through APIYi; GPT-Image-2 through Shengsuanyun |
| Speech synthesis | Doubao Podcast TTS with one- or two-speaker modes, selectable voices, speech rate, random/fixed order |
| Speech recognition | Doubao ASR; may reuse TTS credentials or accept dedicated ASR credentials |
| Composition | Bundled FFmpeg with Pillow subtitle-frame fallback when `drawtext` is unavailable |
| Publishing | App-owned Chrome profile; Windows may fall back to Edge; never read the user's daily browser profile |

## Reference Video Baseline

The inspected reference output establishes the initial golden preset:

- MP4 container with H.264 video and AAC audio.
- 1920×1080, 30 fps, `yuvj420p` pixel format.
- Reference sample video bitrate approximately 929 kbps; final encoder setting must be derived by comparing multiple outputs rather than hard-coding this observed average.
- AAC mono, 24 kHz; reference sample approximately 107 kbps.
- Podcast volume multiplier `1.30`; BGM multiplier `0.09`.
- Opening cover and scene durations come from `scene_timeline.json`; the inspected sample used an 8.1-second cover followed by 10 scene segments across a 219.5-second program.
- Chinese subtitles are pre-rendered through Pillow when FFmpeg lacks `drawtext`; platform-specific font resolution must preserve the same visible metrics.
- Exact subtitle font size, outline/shadow, line wrapping, transition curve, and encoder-quality flags still require golden-frame comparison during Task 1.

## Repository Shape

```text
apps/web/                 React frontend
apps/server/              FastAPI application
packages/contracts/       Generated API types / shared schemas
pipeline/                 AI and FFmpeg adapters
tests/                    API, pipeline, and end-to-end tests
tasks/                    Plan and implementation checklist
```

## Dependency Graph

```text
Product decisions and golden screenshots
        |
        +--> App shell and design tokens
        |
        +--> SQLite schema --> API contracts --> project/template flows
                                      |
                                      +--> job engine + SSE
                                              |
                                              +--> pipeline adapters
                                              |       |
                                              |       +--> artifacts/results
                                              |
                                              +--> production UI
                                                      |
                                                      +--> publishing assistant
                                                              |
                                                              +--> packaging
```

## Task List

### Phase 0: Scope and Reference Contract

#### Task 1: Freeze the replica contract

**Description:** Turn the observed product into a versioned behavior contract containing routes, screenshots, visual tokens, UI states, and the exact MVP/non-MVP boundary.

**Acceptance criteria:**
- [ ] The contract covers sidebar, Script, Production, Results, Publishing, channel configuration, and global settings.
- [ ] Empty, loading, success, failure, disabled, and destructive-action states are listed.
- [ ] Brand/IP replacements and explicitly authorized original assets are recorded.

**Verification:**
- [ ] Manual review: every visible reference control maps to a contract item or an explicit exclusion.
- [ ] Manual review: target viewport and supported operating systems are stated.

**Dependencies:** None

**Files likely touched:**
- `docs/product-contract.md`
- `docs/reference-inventory.md`

**Estimated scope:** Small

#### Task 2: Define API and domain contracts

**Description:** Recreate the public resource model for templates, projects, jobs, files, release links, publishing accounts, and settings before implementation.

**Acceptance criteria:**
- [ ] OpenAPI covers the complete MVP flow from project creation to release-link capture.
- [ ] Job and artifact state enums have documented transitions.
- [ ] Error responses use one consistent, typed envelope.

**Verification:**
- [ ] Contract lint succeeds: `npx @redocly/cli lint docs/openapi.yaml`.
- [ ] Manual review: no API response exposes secret values or unrestricted local paths.

**Dependencies:** Task 1

**Files likely touched:**
- `docs/openapi.yaml`
- `docs/domain-model.md`
- `packages/contracts/package.json`

**Estimated scope:** Medium

### Checkpoint: Contract

- [ ] Human approves scope, branding boundary, target platform, and primary AI providers.
- [ ] Every MVP screen and backend resource has a named owner and acceptance path.

### Phase 1: Local-First Foundation

#### Task 3: Bootstrap the local application shell

**Description:** Create the React/FastAPI workspace, health check, SPA fallback routing, configuration loading, and development commands.

**Acceptance criteria:**
- [ ] One command starts the API and web development environment.
- [ ] Deep links such as `/projects/181/results` load the SPA directly.
- [ ] The server listens on localhost only and exposes `/api/ping` and OpenAPI.

**Verification:**
- [ ] Backend tests pass: `pytest tests/server/test_bootstrap.py`.
- [ ] Frontend build succeeds: `npm --prefix apps/web run build`.
- [ ] Manual check: refresh a nested project route without a 404.

**Dependencies:** Task 2

**Files likely touched:**
- `apps/server/main.py`
- `apps/server/config.py`
- `apps/web/src/main.tsx`
- `apps/web/vite.config.ts`
- `Makefile`

**Estimated scope:** Medium

#### Task 4: Implement persistence and artifact directories

**Description:** Add SQLite migrations and a safe filesystem layout for projects, jobs, account metadata, publishing tasks, release links, and generated artifacts.

**Acceptance criteria:**
- [ ] Fresh startup creates and migrates the database idempotently.
- [ ] Project deletion is soft-delete; trash restore and permanent deletion are separate operations.
- [ ] Artifact paths are normalized and cannot escape the configured data root.

**Verification:**
- [ ] Tests pass: `pytest tests/server/test_persistence.py tests/server/test_paths.py`.
- [ ] Manual check: restart preserves project ordering, pin state, and trash state.

**Dependencies:** Task 2

**Files likely touched:**
- `apps/server/db.py`
- `apps/server/migrations/001_initial.sql`
- `apps/server/repositories.py`
- `apps/server/artifacts.py`
- `tests/server/test_persistence.py`

**Estimated scope:** Medium

#### Task 5: Build the shared visual shell

**Description:** Implement the resizable sidebar, project header, four-route segmented navigation, design tokens, cards, and responsive overflow behavior.

**Acceptance criteria:**
- [ ] At 1280×720, sidebar and main workspace match the recorded geometry and hierarchy.
- [ ] Sidebar width persists locally and can collapse/reopen.
- [ ] Keyboard focus, hover, selected, disabled, and status colors are visually distinct.

**Verification:**
- [ ] Component tests pass: `npm --prefix apps/web test -- app-shell`.
- [ ] Visual tests pass at 1280×720: `npm --prefix apps/web run test:visual`.
- [ ] Manual check: all primary controls are keyboard reachable.

**Dependencies:** Tasks 1 and 3

**Files likely touched:**
- `apps/web/src/layout/AppShell.tsx`
- `apps/web/src/layout/Sidebar.tsx`
- `apps/web/src/layout/ProjectHeader.tsx`
- `apps/web/src/styles/tokens.css`
- `apps/web/src/styles/layout.css`

**Estimated scope:** Medium

### Checkpoint: Foundation

- [ ] Fresh database starts cleanly.
- [ ] Nested routes work after refresh.
- [ ] Visual shell passes the golden 1280×720 comparison.
- [ ] No secrets or arbitrary filesystem paths reach the browser.

### Phase 2: Core Vertical Slices

#### Task 6: Deliver channel and project management

**Description:** Implement the complete channel/project slice: list, create, select, search, pin, reorder, soft-delete, trash, restore, and folder-opening request.

**Acceptance criteria:**
- [ ] Creating a topic under a channel immediately selects its Script route.
- [ ] Search, pin, reorder, delete, and restore survive restart.
- [ ] Destructive actions require explicit UI confirmation.

**Verification:**
- [ ] API tests pass: `pytest tests/server/test_projects_api.py`.
- [ ] UI tests pass: `npm --prefix apps/web test -- project-sidebar`.
- [ ] E2E check: create → reorder → trash → restore.

**Dependencies:** Tasks 4 and 5

**Files likely touched:**
- `apps/server/routes/projects.py`
- `apps/server/services/projects.py`
- `apps/web/src/features/projects/ProjectTree.tsx`
- `apps/web/src/features/projects/CreateProject.tsx`
- `tests/server/test_projects_api.py`

**Estimated scope:** Medium

#### Task 7: Deliver channel templates and configuration

**Description:** Implement channel template CRUD and inherited configuration for prompts, release tags, cover settings, voice settings, BGM, and timeline planning.

**Acceptance criteria:**
- [ ] Built-in templates are read-only while user templates can be created and edited.
- [ ] Per-channel values visibly distinguish inherited defaults from overrides.
- [ ] Invalid voice, volume, and cover configurations cannot be saved.

**Verification:**
- [ ] API tests pass: `pytest tests/server/test_templates_api.py`.
- [ ] UI tests pass: `npm --prefix apps/web test -- channel-settings`.
- [ ] Manual check: an override affects only its channel.

**Dependencies:** Tasks 4 and 5

**Files likely touched:**
- `apps/server/routes/templates.py`
- `apps/server/services/templates.py`
- `apps/web/src/features/templates/ChannelSettings.tsx`
- `apps/web/src/features/templates/InheritanceField.tsx`
- `tests/server/test_templates_api.py`

**Estimated scope:** Medium

#### Task 8: Deliver script drafting and revisions

**Description:** Implement brief editing, Markdown content storage, AI generation status, reference display, preview/edit modes, automatic backups, and revision restoration.

**Acceptance criteria:**
- [ ] A user can save a brief, generate content, edit Markdown, and restore an earlier version.
- [ ] Generation can be cancelled and never overwrites an unsaved user edit silently.
- [ ] References and per-project search overrides are preserved with the project.

**Verification:**
- [ ] API tests pass: `pytest tests/server/test_content_api.py`.
- [ ] UI tests pass: `npm --prefix apps/web test -- script-workspace`.
- [ ] E2E check: brief → generate stub → edit → restore.

**Dependencies:** Tasks 6 and 7

**Files likely touched:**
- `apps/server/routes/content.py`
- `apps/server/services/content.py`
- `apps/web/src/features/content/ScriptWorkspace.tsx`
- `apps/web/src/features/content/MarkdownEditor.tsx`
- `tests/server/test_content_api.py`

**Estimated scope:** Medium

#### Task 8A: Deliver portable hotspot-card import

**Description:** Implement JSON, Markdown, and pasted-text hotspot cards with schema-version validation, safe mapping preview, duplicate detection, target-channel selection, and atomic project creation.

**Acceptance criteria:**
- [ ] Validation never creates or modifies a project.
- [ ] Confirmed import creates one project with correctly mapped `brief.md` content and source links.
- [ ] Duplicate title/source detection offers open-existing, create-anyway, and cancel outcomes.

**Verification:**
- [ ] Tests pass: `pytest tests/server/test_hotspot_import.py`.
- [ ] UI tests pass: `npm --prefix apps/web test -- hotspot-import`.
- [ ] E2E check: JSON card → preview → select channel → create project.

**Dependencies:** Tasks 6, 7, and 8

**Files likely touched:**
- `apps/server/routes/hotspot_imports.py`
- `apps/server/services/hotspot_imports.py`
- `apps/web/src/features/import/HotspotImportDialog.tsx`
- `apps/web/src/features/import/useHotspotImport.ts`
- `tests/server/test_hotspot_import.py`

**Estimated scope:** Medium

#### Task 9: Deliver the job engine and live progress

**Description:** Implement persistent staged jobs, bounded concurrency, cancellation, structured log events, SSE reconnect, and orphaned-job recovery after restart.

**Acceptance criteria:**
- [ ] Jobs transition only through documented states and retain their terminal result.
- [ ] SSE reconnect resumes after the last received event without duplicating the displayed log.
- [ ] Cancellation stops pending stages and reports whether a running subprocess was terminated.

**Verification:**
- [ ] Tests pass: `pytest tests/server/test_jobs.py tests/server/test_job_events.py`.
- [ ] Manual check: close/reopen the page during a test job and recover progress.

**Dependencies:** Tasks 3 and 4

**Files likely touched:**
- `apps/server/jobs/engine.py`
- `apps/server/jobs/events.py`
- `apps/server/routes/jobs.py`
- `apps/web/src/features/jobs/useJobEvents.ts`
- `tests/server/test_jobs.py`

**Estimated scope:** Medium

### Checkpoint: Authoring

- [ ] Project creation through script revision works end-to-end.
- [ ] Stub provider runs are deterministic and cost-free in tests.
- [ ] Restart and reconnect behavior is verified.

### Phase 3: Media Production

#### Task 10: Implement reference-compatible providers and safe configuration

**Description:** Create adapters for DeepSeek; Doubao Search Custom/Tavily; Ark Seedream/APIYi/Shengsuanyun image generation; Doubao TTS/ASR; plus redacted global configuration APIs and per-channel override resolution.

**Acceptance criteria:**
- [ ] Each provider family listed in the approved provider set has a fake implementation for tests and a production adapter.
- [ ] Secrets are write-only from the frontend and redacted everywhere else.
- [ ] Timeouts, retries, concurrency, and cost-relevant limits are configurable.

**Verification:**
- [ ] Tests pass: `pytest tests/pipeline/test_providers.py tests/server/test_secrets.py`.
- [ ] Manual check: provider health status distinguishes missing, valid, and failed credentials.

**Dependencies:** Tasks 7 and 9

**Files likely touched:**
- `pipeline/contracts.py`
- `pipeline/providers.py`
- `apps/server/routes/settings.py`
- `apps/web/src/features/settings/GlobalSettings.tsx`
- `tests/pipeline/test_providers.py`

**Estimated scope:** Medium

#### Task 10A: Deliver one-click article conversion

**Description:** Convert the active video script into independently versioned generic, Xiaohongshu, and WeChat Official Account article packages with image mapping, captions, alternative text, partial-success handling, and per-platform retry.

**Acceptance criteria:**
- [ ] Conversion never overwrites `content.md` and creates a manifest tied to the source-script fingerprint.
- [ ] Missing images produce a usable text package marked “待补图”.
- [ ] One platform may fail and retry without discarding successful platform outputs.

**Verification:**
- [ ] Tests pass: `pytest tests/server/test_article_conversion.py`.
- [ ] UI tests pass: `npm --prefix apps/web test -- article-conversion`.
- [ ] E2E check: script → three article outputs → source script changes → stale warning.

**Dependencies:** Tasks 8, 9, and 10

**Files likely touched:**
- `apps/server/routes/article_conversions.py`
- `apps/server/services/article_conversions.py`
- `apps/web/src/features/content/ArticleConversionPanel.tsx`
- `pipeline/stages/article_conversion.py`
- `tests/server/test_article_conversion.py`

**Estimated scope:** Medium

#### Task 11: Implement the staged media pipeline

**Description:** Compose audio, subtitles, timeline, images, covers, and video stages with content-addressed reuse and reproducible outputs.

**Acceptance criteria:**
- [ ] Users can run any valid subset of stages or run the full pipeline.
- [ ] A stage is reused only when its input fingerprint and effective configuration match.
- [ ] FFmpeg output meets the approved resolution, codec, audio, and subtitle specification.

**Verification:**
- [ ] Tests pass: `pytest tests/pipeline/test_pipeline.py`.
- [ ] Media probe passes: `ffprobe` reports the expected duration, streams, codec, dimensions, and frame rate.
- [ ] Manual check: changing one scene prompt regenerates only affected downstream artifacts.

**Dependencies:** Tasks 8, 9, and 10

**Files likely touched:**
- `pipeline/orchestrator.py`
- `pipeline/stages.py`
- `pipeline/fingerprints.py`
- `pipeline/video.py`
- `tests/pipeline/test_pipeline.py`

**Estimated scope:** Medium

#### Task 12: Deliver Production and Results workspaces

**Description:** Implement upload slots, aspect-ratio routing, stage selection, live progress, artifact grid, preview, download, copy, prompt inspection, and batch deletion.

**Acceptance criteria:**
- [ ] Multi-file drops route approved ratios and reject unsupported media with actionable feedback.
- [ ] Production state remains understandable before, during, after, and after failure of a job.
- [ ] Result cards render correct controls for video, audio, image, and text artifacts.

**Verification:**
- [ ] UI tests pass: `npm --prefix apps/web test -- production results`.
- [ ] E2E check: upload → generate with fake providers → preview → download.
- [ ] Manual check: batch delete never removes files outside the selected project.

**Dependencies:** Tasks 9 and 11

**Files likely touched:**
- `apps/server/routes/files.py`
- `apps/web/src/features/production/ProductionWorkspace.tsx`
- `apps/web/src/features/production/UploadPanel.tsx`
- `apps/web/src/features/results/ArtifactGrid.tsx`
- `tests/e2e/production.spec.ts`

**Estimated scope:** Medium

### Checkpoint: Production

- [ ] One reference topic produces audio, subtitles, scene timeline, covers, MP4, and the three article outputs.
- [ ] Generated artifacts survive restart and appear in Results.
- [ ] Failure, retry, cancellation, and reuse paths are tested.

### Phase 4: Publishing and Distribution

#### Task 13: Deliver assisted publishing and release tracking

**Description:** Implement per-channel platform accounts, login verification, publishing preparation, browser profile isolation, safe form filling, publishing task status, and release-link capture.

**Acceptance criteria:**
- [ ] Douyin, Xiaohongshu, and WeChat Channels accounts are isolated by channel and platform.
- [ ] The app validates video, title, tags, covers, and originality selection before opening automation.
- [ ] Automation stops before the final publish action and clearly hands control to the user.

**Verification:**
- [ ] Tests pass: `pytest tests/server/test_publishing.py`.
- [ ] Browser adapter tests pass against local fixture pages.
- [ ] Manual sandbox check: login state and filled fields stay isolated between two channels.

**Dependencies:** Tasks 6 and 12

**Files likely touched:**
- `apps/server/routes/publishing.py`
- `apps/server/services/publishing.py`
- `pipeline/publishing/browser_adapter.py`
- `apps/web/src/features/publishing/PublishingWorkspace.tsx`
- `tests/server/test_publishing.py`

**Estimated scope:** Medium

#### Task 13A: Deliver maintenance and repair center

**Description:** Add read-only scans for orphan projects, missing/corrupt artifacts, stale temporary output, invalid templates, and abandoned publishing profiles; provide previewed, backed-up, scoped, and reversible repair operations.

**Acceptance criteria:**
- [ ] Scanning does not modify the database or filesystem.
- [ ] Every repair shows target, impact, recoverability, and expected reclaimed space before confirmation.
- [ ] Repair rejects stale scan versions and creates a backup plus human-readable report.

**Verification:**
- [ ] Tests pass: `pytest tests/server/test_maintenance.py`.
- [ ] UI tests pass: `npm --prefix apps/web test -- maintenance-center`.
- [ ] E2E check: orphan directory → scan → restore → undo.

**Dependencies:** Tasks 4, 6, 12, and 13

**Files likely touched:**
- `apps/server/routes/maintenance.py`
- `apps/server/services/maintenance.py`
- `apps/web/src/features/maintenance/MaintenanceCenter.tsx`
- `apps/web/src/features/maintenance/RepairPreview.tsx`
- `tests/server/test_maintenance.py`

**Estimated scope:** Medium

#### Task 14: Package and harden the macOS release

**Description:** Package the local server and frontend for macOS, add single-instance startup, Keychain-backed secrets, data-location migration, backups, log rotation, and recovery documentation. Version 1 does not include cloud sync, license enforcement, or auto-update.

**Acceptance criteria:**
- [ ] A clean Mac can install, launch, reopen, and uninstall without losing user data unexpectedly.
- [ ] Data migration verifies disk space and integrity before switching roots.
- [ ] Startup never binds publicly, logs contain no secrets, and an interrupted migration is recoverable.

**Verification:**
- [ ] Packaging smoke test passes on a clean macOS user account.
- [ ] Security tests cover traversal, malicious filenames, localhost binding, and secret redaction.
- [ ] Manual check: backup → migrate → restart → restore.

**Dependencies:** Tasks 10, 12, and 13

**Files likely touched:**
- `packaging/build.py`
- `packaging/macos.spec`
- `apps/server/launcher.py`
- `apps/server/services/data_migration.py`
- `docs/recovery.md`

**Estimated scope:** Medium

#### Task 15: Package and validate the Windows release

**Description:** Package the same localhost application for Windows with Credential Manager secrets, bundled FFmpeg/fonts, Chrome-to-Edge publishing fallback, Windows paths, and installer lifecycle handling.

**Acceptance criteria:**
- [ ] A clean Windows 11 machine can install, launch, reopen, and uninstall without losing its data directory unexpectedly.
- [ ] Chinese subtitles and filenames match the macOS golden output within the approved visual tolerance.
- [ ] Publishing automation uses an app-owned Chrome or Edge profile and never reads the user's daily profile.

**Verification:**
- [ ] Windows packaging smoke test passes in a clean Windows 11 VM.
- [ ] Cross-platform golden media comparison passes for the same fixture project.
- [ ] Manual check: backup → migrate data location → restart → restore.

**Dependencies:** Tasks 10, 12, 13, and 14

**Files likely touched:**
- `packaging/windows.spec`
- `packaging/windows-installer.iss`
- `apps/server/platform/windows.py`
- `pipeline/video_fonts.py`
- `docs/windows-installation.md`

**Estimated scope:** Medium

### Checkpoint: Release Candidate

- [ ] All automated tests and production build pass.
- [ ] Golden-path project completes from creation through assisted publishing.
- [ ] Maintenance scanning and reversible repair pass against corrupted fixtures.
- [ ] Accessibility, visual, security, recovery, and installer checks pass.
- [ ] Original product branding is absent; reused prompt logic has completed the new-brand rewrite review.

## Project-Wide Definition of Done

Every task counts as complete only when:

- Acceptance criteria and focused automated tests pass.
- Frontend type-check/build and backend tests remain green.
- New behavior has failure, empty, and retry states where applicable.
- Logs and UI do not reveal secrets or unnecessary personal/local-path information.
- Destructive actions are scoped, confirmed, and recoverable where practical.
- User-facing strings and keyboard interactions are reviewed.
- The plan/checklist is updated with actual decisions and deviations.

## Parallelization Opportunities

- After Task 2: persistence (Task 4) and visual shell (Task 5) can proceed in parallel.
- After the Foundation checkpoint: project management (Task 6), templates (Task 7), and job engine (Task 9) can proceed in parallel if API contracts are frozen.
- Provider adapters in Task 10 can be developed independently per vendor behind one interface.
- Publishing platform adapters can be parallelized only after the common publishing contract and fixture-page tests are stable.
- Packaging must remain late because it depends on stable artifact, browser, and configuration behavior.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Platform publishing pages change | High | Semantic locators, adapter isolation, fixture tests, and human final publish |
| API expenses grow unexpectedly | High | Fake providers in tests, per-provider limits, concurrency caps, and cost warnings |
| AI outputs break downstream parsing | High | Strict schemas, repair/validation step, versioned prompts, and visible validation errors |
| Long FFmpeg jobs fail or hang | High | Timeouts, cancellable subprocess groups, temporary outputs, and atomic final rename |
| User secrets leak through logs/UI | High | Keychain storage, write-only fields, centralized redaction, and security tests |
| Local files are accidentally deleted | High | Root confinement, soft delete, explicit confirmation, and path traversal tests |
| Exact branding creates IP conflict | Medium | Replaceable theme/assets and written authorization gate |
| macOS behavior diverges on Windows | High | Keep OS integrations behind adapters and require cross-platform golden media tests before version 1 ships |
| Visual parity drifts during implementation | Medium | Golden screenshots and visual regression tests at fixed viewports |

## Remaining Open Questions

1. What is the formal help-site domain for 镜序工坊?
2. Should different channel templates default the new-brand closing line on or off?
3. Does the new brand need distinct disclaimer presets by content category?
4. Complete trademark, domain, and app-store name checks before commercial release.

## Recommended MVP Boundary

Include Tasks 1–15. Develop and test against fake providers first, then connect every approved reference-compatible provider. Keep publishing against local fixture pages until the media pipeline is stable, then validate assisted filling on the three real platforms. Explicitly exclude cloud sync, licensing, trials, certificates, and auto-update. Both macOS and Windows installers are release-blocking for version 1.
