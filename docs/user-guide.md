# Squirrel 用户指南

[English version](user-guide.en.md)

Squirrel 是一个本地优先的任务看板。它运行在浏览器里，没有应用后端：
PCF 或本地开发服务器只负责提供静态页面，任务、项目、附件等工作区数据会
保存在用户选择的本地文件夹，或者保存在浏览器自己的私有存储中。

## 使用方式

Squirrel 支持两种使用方式。

### 1. 直接使用 Web 版

使用支持的桌面浏览器打开 PCF 地址：

```text
https://<pcf-url-to-be-added>
```

这个地址后续由维护者补充。Web 版只是加载 Squirrel 前端应用，不会把工作区
数据上传到服务端。

如果你希望数据以普通文件形式保存在一个可见文件夹里，推荐使用桌面版 Chrome
或 Microsoft Edge。如果你使用桌面版 Safari，只能使用浏览器私有工作区，
不能选择一个真实文件夹并持续同步。

### 2. Clone 到本地运行

准备条件：

- Node.js
- Git
- 支持的桌面浏览器

运行方式：

```bash
git clone <repo-url>
cd Squirrel
npm install
npm start
```

然后打开：

```text
http://127.0.0.1:6670/
```

本地运行时请使用 `127.0.0.1` 或 `localhost`。部署后请使用 HTTPS 地址。
不要用 `6666` 端口做浏览器测试，因为 Chromium 会把它拦截为不安全端口。

## 浏览器支持

Squirrel 不是按浏览器名称硬编码判断能力，而是在运行时检测浏览器是否提供
需要的本地存储 API：

- 本地文件夹工作区依赖 `window.showDirectoryPicker`。
- 浏览器私有工作区依赖 `navigator.storage.getDirectory`。

v1 版本建议和承诺支持的浏览器如下：

| 浏览器 | 支持模式 | 数据位置 | 可用功能 | 使用差异 |
| --- | --- | --- | --- | --- |
| 桌面版 Chrome | 本地文件夹工作区 | 用户选择的真实文件夹 | 完整工作流：项目、任务、附件、最近工作区、Markdown 镜像文件 | 推荐体验，数据文件用户可见 |
| 桌面版 Microsoft Edge | 本地文件夹工作区 | 用户选择的真实文件夹 | 与 Chromium Edge 上的 Chrome 体验一致 | 不支持 Legacy Edge |
| 桌面版 Safari | Browser Workspace fallback | 当前站点 origin 下的浏览器私有 OPFS 存储 | 项目、任务、附件、设置、备份导出和导入 | 不能打开或持续镜像到用户选择的真实文件夹 |
| iOS/iPadOS Safari 和 iOS 浏览器 | v1 不支持 | 不适用 | 不承诺可用工作流 | 请使用桌面浏览器 |
| 其他桌面浏览器 | v1 未验证 | 取决于浏览器暴露的 API | 可能不可用，也可能只能进入浏览器私有工作区 | 不承诺本地文件夹工作流 |

如果浏览器既不支持文件夹选择 API，也不支持浏览器私有文件存储，Squirrel 会
显示浏览器不支持的提示。

## 工作区模式差异

### 本地文件夹工作区

这是推荐模式，适用于桌面版 Chrome 和基于 Chromium 的桌面版 Edge。

点击 **Open Workspace Folder** 后，可以选择一个空文件夹创建新工作区，也可以
选择已有的 Squirrel 工作区继续使用。Squirrel 会在该文件夹里写入 JSON 数据、
附件、派生索引文件和 Markdown 镜像文件。

典型目录结构：

```text
workspace.json
preferences.json
projects/
inbox/
archive/
exports/markdown/
.gtd-lite/
```

这个文件夹对用户可见，也可以用普通文件备份工具备份。重新打开最近工作区时，
浏览器可能会再次要求授予文件夹访问权限。

### 浏览器私有工作区

这是为桌面版 Safari 准备的 fallback 模式。

当浏览器没有真实文件夹访问能力，但支持浏览器私有文件存储时，Squirrel 会打开
**Browser Workspace**。它仍然使用同样的工作区结构，但数据会存入当前应用
origin 下的 OPFS，而不是写入用户可见的文件夹。

需要注意：

- 工作区绑定到当前浏览器、浏览器 profile 和应用 origin。
- 每个 origin 默认只有一个浏览器私有工作区。
- 这些文件不是给用户直接从 Finder 或 Windows Explorer 打开的。
- 清理该站点的网站数据可能会删除这个工作区。
- 需要迁移或保护数据时，使用 **Settings -> Workspace -> Export Backup** 和
  **Import Backup**。

## 首次使用

1. 从 PCF 地址或 `http://127.0.0.1:6670/` 打开 Squirrel。
2. 在 Chrome 或 Edge 中，点击 **Open Workspace Folder**，选择一个空文件夹
   或已有 Squirrel 工作区文件夹。
3. 在桌面版 Safari 中，点击 **Open Browser Workspace**。
4. Squirrel 会创建一个默认工作区，并创建一个 `Default` 项目。
5. 如果希望快速捕获进入其他项目，到 **Settings -> Workspace ->
   Default project** 修改默认项目。

## 核心工作流

### Quick Capture

顶部输入框用于快速创建任务。默认情况下，Quick Capture 会把任务创建到默认项目，
状态为 `Todo`。

如果 **Settings -> Workspace -> Paste to create task** 开启，也可以直接在
工作区粘贴内容创建任务。粘贴图片会创建带附件的任务。

### Projects

项目显示在左侧边栏。可以创建、编辑、删除和拖拽排序项目。

同一个工作区内项目名称必须唯一，不区分大小写。删除项目会永久删除该项目下的
任务，操作前会要求确认。

### Tasks

打开任务后可以编辑：

- 标题
- Markdown 描述
- 状态
- 所属项目
- Assignee
- Due date 和 start date
- Priority 和 importance
- Tags
- Attachments
- Subtasks

删除任务和子任务都是永久操作，操作前会要求确认。

### Dashboard、列表、看板和 Timeline

左侧导航提供多个视图：

- **Dashboard**：查看 overdue、due today、due soon、完成情况和项目摘要。
- **All Tasks**、**Overdue**、**Today**、**Upcoming**、**Waiting**、
  **Blocked**、**Done**：按任务状态或时间聚焦查看。
- 项目视图：查看某个项目下的任务；适合看板的项目视图可以在 board/list
  之间切换。
- **Timeline**：按创建时间或完成时间查看任务历史，并支持 tag 过滤。

## Settings

### Profile

设置侧边栏展示的昵称。头像属于低频操作，通过 Profile 区域的
**Change avatar** 按钮进入弹窗修改。

### Appearance

可选择 light、dark 或 auto 主题。Auto 模式会根据设置的开始和结束时间自动
切换深色模式。

### Task Metadata

管理可复用的 tags 和 assignees。删除 tag 会从已保存任务中清除该 tag；删除
assignee 会从已保存任务中清除该 assignee。

### Workspace

Workspace 设置包含：

- 在浏览器支持文件夹访问时切换工作区。
- Browser Workspace 模式下导出和导入备份。
- Paste-to-create-task 开关。
- 默认项目选择。
- 工作区名称、存储模式、schema 版本、项目数、任务数和 Markdown mirror 状态。
- 最近工作区列表。

## 备份和迁移

本地文件夹工作区可以直接备份整个工作区文件夹。

Browser Workspace 模式下，建议定期使用 **Export Backup**。导出的 JSON 包含
工作区状态和附件内容。需要恢复或迁移浏览器私有工作区时，使用
**Import Backup**。

## 常见问题

### 页面提示浏览器不支持

请使用桌面版 Chrome、桌面版 Microsoft Edge 或桌面版 Safari。完整的本地文件夹
工作流需要 Chrome 或基于 Chromium 的 Edge。

### Chrome 或 Edge 重新要求文件夹权限

按提示重新授权即可。文件夹 handle 和权限由浏览器管理，浏览器可能会要求重新
确认访问权限。

### 在 Safari 里找不到工作区文件

这是预期行为。Browser Workspace 模式使用 OPFS，数据对当前站点 origin 私有，
不是用户可直接浏览的文件夹。需要可迁移文件时，请导出备份。

### 本地开发地址打不开

确认开发服务器正在运行：

```bash
npm start
```

然后打开：

```text
http://127.0.0.1:6670/
```

不要使用 `6666` 端口做 Chromium 浏览器测试。
