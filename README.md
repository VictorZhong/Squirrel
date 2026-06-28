# Squirrel

Squirrel is a local-first personal workspace task board. It runs in the browser and saves real data either into a local workspace folder chosen by the user or into browser-private storage when folder access is unavailable.

## User Guide

See the full user guides for browser support, workspace mode differences, backup guidance, and local development instructions:

- [English user guide](docs/user-guide.en.md)
- [中文用户指南](docs/user-guide.md)

## Usage Options

### Hosted Web Version

Open the PCF route in a supported browser:

```text
https://<pcf-url-to-be-added>
```

The hosted route serves the static app. Workspace data remains local to the selected folder or browser-private storage.

### Local Clone

Prerequisite: install Node.js and Git.

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

Open Squirrel from `localhost`, `127.0.0.1`, or an HTTPS route when deployed. Local file and OPFS storage APIs require a secure browser context. Do not use port `6666` for browser testing because Chromium blocks it as an unsafe port.

## Browser Support

Squirrel checks browser storage capabilities at runtime. The experience depends on which local storage APIs the browser exposes:

| Browser | Workspace mode | What works | Limitations |
| --- | --- | --- | --- |
| Chrome desktop | Local folder | Open a real workspace folder, persist files directly, reopen recent folders, attachments, markdown mirror files | None expected for the supported local workflow |
| Microsoft Edge desktop | Local folder | Same as Chrome when running on Chromium Edge | Legacy Edge is not supported |
| Desktop Safari with OPFS | Browser private storage | Create and reopen one private browser workspace, tasks, attachments, backup export/import | Cannot open or continuously mirror a user-selected real folder |
| iOS/iPadOS Safari or iOS browsers | Not supported for v1 | None promised | Folder access and this app's Safari fallback are not supported in v1 |
| Other desktop browsers | Not a validated v1 target | Depends on exposed APIs | No local folder workflow is promised |
| Browsers without folder access or OPFS | Not supported | None | Squirrel shows an unsupported browser message |

Chrome and desktop Edge are the best fit when you want Squirrel data saved as normal files in a folder you choose. Desktop Safari uses a single private browser workspace instead; use **Export Backup** and **Import Backup** in Settings to move or protect that data. See the [user guide](docs/user-guide.md#browser-support) for the full browser and workflow matrix.

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
