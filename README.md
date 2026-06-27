# Squirrel

Squirrel is a local-first personal workspace task board. It runs in the browser and saves real data either into a local workspace folder chosen by the user or into browser-private storage when folder access is unavailable.

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

Open Squirrel from `localhost`, `127.0.0.1`, or an HTTPS route when deployed. Local file and OPFS storage APIs require a secure browser context.

## Browser Support

Squirrel checks browser storage capabilities at runtime. The experience depends on which local storage APIs the browser exposes:

| Browser | Workspace mode | What works | Limitations |
| --- | --- | --- | --- |
| Chrome desktop | Local folder | Open a real workspace folder, persist files directly, reopen recent folders, attachments, markdown mirror files | None expected for the supported local workflow |
| Microsoft Edge desktop | Local folder | Same as Chrome when running on Chromium Edge | Legacy Edge is not supported |
| Desktop Safari with OPFS | Browser private storage | Create and reopen one private browser workspace, tasks, attachments, backup export/import | Cannot open or continuously mirror a user-selected real folder |
| iOS/iPadOS Safari or iOS browsers | Not supported for v1 | None promised | Folder access and this app's Safari fallback are not supported in v1 |
| Browsers without folder access or OPFS | Not supported | None | Squirrel will show an unsupported browser message |

Chrome and desktop Edge are still the best fit when you want Squirrel data saved as normal files in a folder you choose. Desktop Safari uses a single private browser workspace instead; use **Export Backup** and **Import Backup** in Settings to move or protect that data.

## Workspace Data

In Chrome or desktop Edge, choose or create a local workspace folder. Squirrel writes data into that folder:

```text
workspace.json
preferences.json
projects/
archive/
exports/markdown/
.gtd-lite/
```

In desktop Safari's Browser Workspace mode, the same workspace files are stored in the browser's private OPFS storage instead of a user-visible folder. Browser storage is also used for small app-level preferences such as recent workspace metadata.
Older workspaces may still contain `inbox/`; Squirrel reads it during migration and moves those tasks into the default project's Todo status.
