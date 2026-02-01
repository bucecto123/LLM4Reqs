# Sprint Plan (Sprints 5–7, 3 weeks each)

## Sprint 5 — Foundations + MVP Delivery

**Theme:** Shared project access foundation, user-story graph MVP, fix normal chat file upload.

### LLM Team

**Goal:** Produce a reliable story-graph output contract and MVP endpoint.

- Define output schema for “user story graph”
  - Nodes: user/persona, feature/epic, story, acceptance criteria
  - Edges: user→story, story→feature, dependency edges
  - Include `id`, `label`, `type`, optional `metadata` (priority, risk)
  - Provide JSON schema + example payload
- Implement endpoint `POST /api/story-graph/generate`
  - Input: project_id, requirements list, optional chat context
  - Output: JSON graph + optional Mermaid string
  - Include validation + error messages for malformed model output
- Prompt engineering
  - Add system prompt with role constraints
  - Add few-shot examples to standardize output
- Add Mermaid export utility (server-side)
  - Convert graph JSON into Mermaid flowchart or sequence diagram
- Add tests
  - Schema validation tests
  - Prompt parsing robustness tests

**Acceptance:** Graph endpoint returns valid JSON schema for 10+ sample requirements; Mermaid output renders correctly in sample file.

### Backend Team

**Goal:** Provide secure sharing model and LLM graph orchestration; fix upload.

- Data model + migration
  - Create `project_users` table with role (owner/editor/viewer)
  - Add indices and cascade rules
- Authorization layer
  - Policies for project resource access
  - Protect docs, requirements, conflicts, chat history routes
- APIs for sharing
  - Invite / add member
  - Remove member
  - Update role
  - List members with roles
- LLM story-graph integration
  - Add backend endpoint to call LLM service
  - Store graph result (optional) for caching
- Fix file upload bug in normal chat
  - Identify root cause (likely request payload or disk write path)
  - Add regression test for upload

**Acceptance:** Viewer can read shared project data; editors can modify; upload works in chat with unit/regression coverage.

### Frontend Team

**Goal:** Build sharing UX and graph rendering MVP.

- Share project UI
  - Member list, invite form, role dropdown
  - Remove member flow with confirmation
  - Inline validation and error states
- Shared access gating
  - Read-only views for viewer role
  - Hide or disable write actions for non-editors
- Graph viewer MVP
  - Render Mermaid or basic graph view
  - Add “Generate graph” button and status states

**Acceptance:** A user can share a project and see the graph rendered in UI with loading/error states.

**Sprint 5 Demo Checklist**

- Invite another user and access shared docs/requirements/conflicts.
- Generate user story graph and render in UI.
- Upload file in normal chat without errors.

---

## Sprint 6 — Build-out + Usability

**Theme:** Role-based workflows, richer graphs, and better UX.

### LLM Team

- Add agentic tools for DB context (requirements, conflicts, chat summaries)
- Improve graph quality
  - Actor grouping and swimlanes
  - Story sequencing and dependency labeling
- Support partial updates (delta graph regeneration)

### Backend Team

- Enforce write permissions across all routes
- Add sharing notifications (in-app or email)
- Add graph export endpoints (JSON + Mermaid download)
- Add caching for graph results by project

### Frontend Team

- Graph interactions
  - Zoom, pan, filter by persona/feature
  - Export graph button (PNG/SVG/Mermaid)
- Sharing UX polish
  - Activity log for access changes
  - Search and sort members

**Sprint 6 Demo Checklist**

- Show role-based edit restrictions.
- Graph export and filters work.
- Regenerate graph from updated requirements.

---

## Sprint 7 — Hardening + Release

**Theme:** Stability, security, and release readiness.

### LLM Team

- Performance tuning and caching
- Defensive parsing for malformed outputs
- Add fallback to simple graph when LLM fails

### Backend Team

- Security review + rate limiting
- Audit trails for sharing events
- E2E tests for sharing + graph endpoints

### Frontend Team

- Accessibility pass and UI polish
- End-to-end tests for sharing + graph flows
- Error recovery UX for graph generation failures

**Sprint 7 Demo Checklist**

- E2E flow from share → update requirements → regenerate graph.
- Performance metrics and error rates documented.
