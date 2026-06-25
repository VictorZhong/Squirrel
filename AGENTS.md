# Squirrel Agent Notes

## Project Overview

Squirrel is a local-first React task board. It runs in the browser, uses the File
System Access API, and saves workspace data into a local folder selected by the
user. There is no application backend in this repo.

Use Chromium-based browsers for local testing. The app relies on local file
access, so `localhost`, `127.0.0.1`, or an HTTPS deployment route is required.

## Commands

```bash
npm install
npm start
npm test
npm run build
```

Local dev runs at:

```text
http://127.0.0.1:6670/
```

Do not use port `6666` for browser testing. Chromium blocks it as an unsafe
port (`net::ERR_UNSAFE_PORT`).

## Deployment Notes

The Vite config uses `base: "./"` so built assets work under non-root routes.
`vite preview` reads `process.env.PORT` when present, which is useful for PCF.
The user plans to provide the PCF manifest separately.

## Architecture

- `src/App.tsx` owns most workspace state, routing, project modals, task saves,
  deletion flows, and settings.
- `src/domain/models/types.ts` contains shared domain types and labels.
- `src/domain/rules/taskRules.ts` contains pure task/project creation and status
  helpers.
- `src/repositories/LocalWorkspaceRepository.ts` is the persistence boundary for
  File System Access API reads/writes.
- `src/services/WorkspaceService.ts` creates new workspace defaults.
- `src/services/SerializationService.ts` parses stored JSON defensively.
- `src/services/DashboardService.ts` computes dashboard buckets and project
  summary data.
- UI is split under `src/components/*`, with reusable task presentation in
  `src/components/task/TaskCard.tsx`.

## Data Model And Storage

New workspaces create a `Default` project and set it as
`preferences.defaultProjectId`.

Workspace folder layout:

```text
workspace.json
preferences.json
projects/
inbox/
archive/
exports/markdown/
.gtd-lite/
```

Tasks are still stored as individual JSON files under either `inbox/` or
`projects/<projectId>/tasks/`. Derived files include `.gtd-lite/index.json`,
`.gtd-lite/activity-log.jsonl`, and markdown exports.

Current persistence is acceptable for testing, but a larger task/project count
will make many small file reads and full derived-file rewrites more expensive.
Future search work should consider a lightweight local index or snapshot format.

## Product Conventions

- Task and subtask deletion is permanent and should remain confirm-gated.
- Project names are unique per workspace, case-insensitive.
- Quick capture creates tasks in the selected/default project's `inbox` status.
- `assignee` is optional and is displayed on task cards only when the task is
  `waiting` or `blocked`.
- Task cards show second-line metadata in this order: due date, priority,
  importance. Due dates on cards use month/day only.
- Dashboard task lanes should reuse `TaskCard` so their visual treatment stays
  consistent with the board.
- Project order is user-controlled via drag and drop in the left sidebar.

## UI Notes

The app uses Ant Design and lucide-react. Keep controls compact and operational;
this is a workspace tool rather than a marketing site.

Styles live in `src/styles.css`. Avoid broad refactors unless needed. When
adding local visual states, prefer extending existing classes over introducing a
parallel design language.

## Testing Notes

Run both before handing off changes:

```bash
npm test
npm run build
```

The build may warn that the main JS chunk exceeds 500 kB. That warning is
currently expected and not caused by routine feature work.
