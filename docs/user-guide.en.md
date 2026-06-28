# Squirrel User Guide

[Chinese version](user-guide.md)

Squirrel is a local-first task board that runs in the browser. It has no
application backend: the PCF route or local development server only serves the
static app. Workspace data, including tasks, projects, and attachments, is stored
either in a local folder selected by the user or in the browser's private
storage.

## Ways To Use Squirrel

Squirrel supports two usage paths.

### 1. Use The Hosted Web Version

Open the PCF route in a supported desktop browser:

```text
https://<pcf-url-to-be-added>
```

The URL is intentionally left as a placeholder for the deployment owner to fill
in later. The hosted web version loads the Squirrel frontend app only; it does
not upload workspace data to a server.

Use desktop Chrome or Microsoft Edge if you want data to be saved as ordinary
files in a visible folder. Use desktop Safari only if the browser-private
workspace fallback is acceptable for your workflow.

### 2. Clone And Run Locally

Prerequisites:

- Node.js
- Git
- A supported desktop browser

Run:

```bash
git clone <repo-url>
cd Squirrel
npm install
npm start
```

Then open:

```text
http://127.0.0.1:6670/
```

For local usage, open Squirrel from `127.0.0.1` or `localhost`. For deployed
usage, open it from an HTTPS route. Do not use port `6666` for browser testing,
because Chromium blocks it as an unsafe port.

## Browser Support

Squirrel does not hard-code browser names for capability checks. It detects the
required local storage APIs at runtime:

- Local folder workspaces require `window.showDirectoryPicker`.
- Browser-private workspaces require `navigator.storage.getDirectory`.

The v1 product-supported browsers are:

| Browser | Supported mode | Data location | Available features | Usage difference |
| --- | --- | --- | --- | --- |
| Desktop Chrome | Local folder workspace | A real folder selected by the user | Full workflow: projects, tasks, attachments, recent workspaces, Markdown mirror files | Recommended experience; data files are user-visible |
| Desktop Microsoft Edge | Local folder workspace | A real folder selected by the user | Same experience as Chrome on Chromium-based Edge | Legacy Edge is not supported |
| Desktop Safari | Browser Workspace fallback | Browser-private OPFS storage under the current origin | Projects, tasks, attachments, settings, backup export and import | Cannot open or continuously mirror a real user-selected folder |
| iOS/iPadOS Safari and iOS browsers | Not supported in v1 | N/A | No supported workflow promised | Use a desktop browser |
| Other desktop browsers | Not a validated v1 target | Depends on exposed APIs | May be unavailable, or may only expose browser-private storage | Local folder workflow is not promised |

If the browser exposes neither the folder picker API nor browser-private file
storage, Squirrel shows an unsupported-browser message.

## Workspace Mode Differences

### Local Folder Workspace

This is the recommended mode. It is available in desktop Chrome and
Chromium-based desktop Edge.

After clicking **Open Workspace Folder**, choose an empty folder to create a new
workspace, or choose an existing Squirrel workspace folder to continue. Squirrel
writes JSON data, attachments, derived index files, and Markdown mirror files
into that folder.

Typical folder layout:

```text
workspace.json
preferences.json
projects/
inbox/
archive/
exports/markdown/
.gtd-lite/
```

The folder is user-visible and can be backed up with normal file backup tools.
When reopening a recent workspace, the browser may ask for folder permission
again.

### Browser Workspace

This fallback is intended for desktop Safari.

When the browser cannot access a real folder but does support browser-private
file storage, Squirrel opens a **Browser Workspace**. It uses the same workspace
structure, but the data is stored in OPFS under the current app origin instead
of in a visible folder.

Important differences:

- The workspace is tied to the current browser, browser profile, and app origin.
- Each origin has one default browser-private workspace.
- These files are not intended to be opened directly from Finder or Windows
  Explorer.
- Clearing website data for the app origin may delete the workspace.
- To move or protect this data, use **Settings -> Workspace -> Export Backup**
  and **Import Backup**.

## First-Time Setup

1. Open Squirrel from the PCF route or from `http://127.0.0.1:6670/`.
2. In Chrome or Edge, click **Open Workspace Folder** and select an empty folder
   or an existing Squirrel workspace folder.
3. In desktop Safari, click **Open Browser Workspace**.
4. Squirrel creates a default workspace and a `Default` project.
5. To send quick-captured tasks to another project, change **Settings ->
   Workspace -> Default project**.

## Core Workflow

### Quick Capture

Use the top input to create tasks quickly. By default, Quick Capture creates
tasks in the default project with `Todo` status.

If **Settings -> Workspace -> Paste to create task** is enabled, you can also
paste content into the workspace to create tasks. Pasted images create tasks
with attachments.

### Projects

Projects appear in the left sidebar. You can create, edit, delete, and reorder
projects.

Project names must be unique within a workspace, ignoring case. Deleting a
project permanently deletes its tasks and requires confirmation.

### Tasks

Open a task to edit:

- Title
- Markdown description
- Status
- Project
- Assignee
- Due date and start date
- Priority and importance
- Tags
- Attachments
- Subtasks

Deleting tasks and subtasks is permanent and requires confirmation.

### Dashboard, Lists, Board, And Timeline

The left navigation provides several views:

- **Dashboard**: overdue, due today, due soon, completion, and project summary.
- **All Tasks**, **Overdue**, **Today**, **Upcoming**, **Waiting**, **Blocked**,
  and **Done**: focused task views by status or time.
- Project views: tasks scoped to one project. Board-capable project views can
  switch between board and list layouts.
- **Timeline**: task history by creation time or completion time, with tag
  filtering.

## Settings

### Profile

Set the nickname shown in the sidebar. Avatar editing is a low-frequency action
and is available from the **Change avatar** button in the Profile panel.

### Appearance

Choose light, dark, or auto theme. Auto mode switches dark mode based on the
configured start and end times.

### Task Metadata

Manage reusable tags and assignees. Deleting a tag removes it from saved tasks.
Deleting an assignee clears that assignee from saved tasks.

### Workspace

Workspace settings include:

- Switching workspaces when folder access is available.
- Exporting and importing backups in Browser Workspace mode.
- Paste-to-create-task toggle.
- Default project selection.
- Workspace name, storage mode, schema version, project count, task count, and
  Markdown mirror status.
- Recent workspace list.

## Backup And Migration

For local folder workspaces, back up the entire workspace folder directly.

In Browser Workspace mode, export backups regularly. The exported JSON contains
workspace state and attachment content. Use **Import Backup** to restore or move
browser-private workspace data.

## FAQ

### The App Says My Browser Is Unsupported

Use desktop Chrome, desktop Microsoft Edge, or desktop Safari. The full local
folder workflow requires Chrome or Chromium-based Edge.

### Chrome Or Edge Asks For Folder Permission Again

Grant access again when prompted. Folder handles and permissions are managed by
the browser, and the browser may require permission to be refreshed.

### I Cannot Find Safari Workspace Files On Disk

This is expected. Browser Workspace mode uses OPFS. The data is private to the
current site origin and is not a user-browsable folder. Export a backup when you
need a portable file.

### The Local Development URL Does Not Open

Confirm that the development server is running:

```bash
npm start
```

Then open:

```text
http://127.0.0.1:6670/
```

Do not use port `6666` for Chromium browser testing.
