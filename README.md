# Squirrel

Squirrel is a local-first personal workspace task board. It runs in the browser and saves real data into a local workspace folder chosen by the user.

## Quick Start

Prerequisite: install Node.js.

If you receive Squirrel as a packaged folder or zip file:

```bash
cd Squirrel
npm install
npm start
```

Then open:

```text
http://127.0.0.1:6670/
```

Use Chrome or Microsoft Edge. Squirrel uses the File System Access API, so it should be opened from `localhost`, `127.0.0.1`, or an HTTPS route when deployed.

## Workspace Data

On first launch, choose or create a local workspace folder. Squirrel writes data into that folder:

```text
workspace.json
preferences.json
projects/
inbox/
archive/
exports/markdown/
.gtd-lite/
```

Browser storage is only used for small app-level preferences such as recent workspace metadata.
