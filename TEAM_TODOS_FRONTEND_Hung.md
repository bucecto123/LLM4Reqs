# Tasks for Frontend Dev B (RequirementsViewer & ConflictsViewer)

Owner: Frontend Dev B

Purpose: show extracted requirements and detected conflicts for the current project.

## Primary Tasks

- Create `RequirementsViewer` component

  - Location: `frontend/src/components/RequirementsViewer.jsx`
  - Responsibilities:
    - Fetch `GET /api/projects/{id}/requirements` (paginated)
    - Display list with columns: id, type, priority, excerpt, confidence, source document, extracted_at
    - Provide filters: type (functional/non-functional/etc.), priority (high/medium/low), search by text
    - Clicking an item opens a detail panel showing full text and source metadata

- Create `ConflictsViewer` component

  - Location: `frontend/src/components/ConflictsViewer.jsx`
  - Responsibilities:
    - Fetch `GET /api/projects/{id}/conflicts`
    - Display conflict rows with severity and link to involved requirements
    - Allow marking a conflict as reviewed (optional)

- Integrate into Dashboard
  - Add tabs or a sidebar area where users can open Requirements or Conflicts viewers when in project mode.

## Acceptance Criteria

- Requirements list loads and paginates.
- Conflicts list shows items and links back to requirements.

## Dependencies

- Backend Dev B: must implement `GET /api/projects/{id}/requirements` and `GET /api/projects/{id}/conflicts` with the agreed JSON format.

## Quick dev notes

- Use `apiFetch` helper and reuse existing table/list styling in Dashboard.
- Make components accessible and keyboard navigable by default.

## Estimated effort

- RequirementsViewer + ConflictsViewer + integration: 2–3 days.

Reference files to edit: `frontend/src/components/RequirementsViewer.jsx`, `frontend/src/components/ConflictsViewer.jsx`, `frontend/src/pages/DashBoard.jsx`.
