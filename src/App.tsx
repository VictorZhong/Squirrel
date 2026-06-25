import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  Empty,
  Input,
  Layout,
  Menu,
  Modal,
  Popconfirm,
  Segmented,
  Space,
  Tooltip,
  Typography,
  App as AntApp,
} from "antd";
import type { MenuProps } from "antd";
import {
  AlertCircle,
  Blocks,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FolderKanban,
  History,
  Inbox,
  LayoutDashboard,
  ListTodo,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  Plus,
  Repeat2,
  Settings,
  Trash2,
  TimerReset,
} from "lucide-react";
import { SquirrelIcon } from "./components/brand/SquirrelIcon";
import { QuickCapture } from "./components/capture/QuickCapture";
import { DashboardView } from "./components/dashboard/DashboardView";
import { KanbanBoard } from "./components/kanban/KanbanBoard";
import { avatarPresets } from "./components/profile/avatarPresets";
import { UserAvatar } from "./components/profile/UserAvatar";
import { TaskDrawer } from "./components/task/TaskDrawer";
import { TaskList } from "./components/task/TaskList";
import { TimelineView } from "./components/timeline/TimelineView";
import {
  Attachment,
  Project,
  RecentWorkspace,
  Task,
  WorkspaceState,
  statusLabel,
} from "./domain/models/types";
import { addDays, isDateInRange, toDateOnly } from "./domain/rules/dateRules";
import {
  appendAttachment,
  createProject,
  createScreenshotTaskTitle,
  createTask,
  promoteSubtask,
} from "./domain/rules/taskRules";
import { calculateDashboard } from "./services/DashboardService";
import { LocalWorkspaceRepository } from "./repositories/LocalWorkspaceRepository";
import {
  loadAppPreferences,
  rememberWorkspace,
} from "./repositories/AppPreferencesRepository";
import {
  getRecentWorkspaceHandle,
  loadRecentWorkspaces,
  rememberWorkspaceHandle,
} from "./repositories/RecentWorkspaceRepository";
import { parentTasks, sortTasksForDisplay } from "./utils/taskDisplay";

const { Sider, Content } = Layout;

type RouteKey =
  | "dashboard"
  | "all"
  | "inbox"
  | "overdue"
  | "today"
  | "upcoming"
  | "waiting"
  | "blocked"
  | "done"
  | "timeline"
  | "settings"
  | `project:${string}`;

type ViewMode = "board" | "list";

export default function App() {
  const { message } = AntApp.useApp();
  const [repository, setRepository] = useState<LocalWorkspaceRepository | null>(null);
  const [state, setState] = useState<WorkspaceState | null>(null);
  const [route, setRoute] = useState<RouteKey>("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("board");
  const [selectedTaskId, setSelectedTaskId] = useState<string>();
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string>();
  const [projectDraft, setProjectDraft] = useState({ name: "", description: "" });
  const [isOpening, setIsOpening] = useState(false);
  const [, setAppPreferences] = useState(loadAppPreferences);
  const [recentWorkspaces, setRecentWorkspaces] = useState<RecentWorkspace[]>([]);

  const selectedTask = state?.tasks.find((task) => task.id === selectedTaskId);
  const selectedProjectId = route.startsWith("project:") ? route.slice("project:".length) : undefined;
  const selectedProject = selectedProjectId
    ? state?.projects.find((project) => project.id === selectedProjectId)
    : undefined;
  const dashboard = useMemo(
    () =>
      state
        ? calculateDashboard(state.tasks, state.projects, new Date(), state.preferences.dueSoonDays)
        : undefined,
    [state],
  );
  const pageTasks = useMemo(
    () => (state ? getRouteTasks(route, state) : []),
    [route, state],
  );
  const pageTitle = state ? getRouteTitle(route, state.projects) : "Squirrel";
  const boardCapable = isBoardCapableRoute(route);
  const scopeLabel = selectedProject?.name;

  useEffect(() => {
    let cancelled = false;
    void loadRecentWorkspaces().then((workspaces) => {
      if (!cancelled) {
        setRecentWorkspaces(workspaces);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const resolveAttachmentUrl = useCallback(
    (attachment: Attachment) => {
      if (!repository) {
        return Promise.resolve("");
      }
      return repository.getAttachmentUrl(attachment);
    },
    [repository],
  );

  async function openWorkspace() {
    setIsOpening(true);
    try {
      const nextRepository = await LocalWorkspaceRepository.pickDirectory();
      await loadWorkspace(nextRepository);
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        void message.error(error instanceof Error ? error.message : "Failed to open workspace");
      }
    } finally {
      setIsOpening(false);
    }
  }

  async function openRecentWorkspace(workspace: RecentWorkspace) {
    setIsOpening(true);
    try {
      const handle = await getRecentWorkspaceHandle(workspace.id);
      if (!handle) {
        throw new Error("This workspace needs to be opened from its folder again.");
      }
      await loadWorkspace(LocalWorkspaceRepository.fromDirectoryHandle(handle));
    } catch (error) {
      void message.error(
        error instanceof Error ? error.message : "Failed to open recent workspace",
      );
    } finally {
      setIsOpening(false);
    }
  }

  async function loadWorkspace(nextRepository: LocalWorkspaceRepository) {
    const nextState = await nextRepository.loadOrInitialize();
    const workspace = {
      id: nextState.workspace.id,
      name: nextState.workspace.name,
      lastOpenedAt: new Date().toISOString(),
    };
    repository?.disposeObjectUrls();
    setRepository(nextRepository);
    setState(nextState);
    setRoute(nextState.preferences.defaultView === "dashboard" ? "dashboard" : "all");
    setSelectedTaskId(undefined);
    setAppPreferences(rememberWorkspace(workspace));
    void rememberWorkspaceHandle(workspace, nextRepository.directoryHandle).then(
      setRecentWorkspaces,
    );
    void message.success("Workspace opened");
  }

  async function persistTask(
    task: Task,
    previous?: Task,
    sourceState = state,
  ): Promise<WorkspaceState | undefined> {
    if (!repository || !sourceState) {
      return undefined;
    }

    const nextTasks = previous
      ? sourceState.tasks.map((item) => (item.id === task.id ? task : item))
      : [...sourceState.tasks, task];
    const nextState = { ...sourceState, tasks: nextTasks };
    setState(nextState);

    try {
      await repository.saveTask(task, nextState, previous);
      return nextState;
    } catch (error) {
      setState(sourceState);
      void message.error(error instanceof Error ? error.message : "Failed to save task");
      return undefined;
    }
  }

  async function persistTasks(changedTasks: Task[], previousTasks: Map<string, Task>) {
    if (!repository || !state) {
      return;
    }

    const changed = new Map(changedTasks.map((task) => [task.id, task]));
    const nextState = {
      ...state,
      tasks: state.tasks.map((task) => changed.get(task.id) ?? task),
    };
    setState(nextState);

    try {
      await repository.saveTasks(changedTasks, nextState, previousTasks);
    } catch (error) {
      setState(state);
      void message.error(error instanceof Error ? error.message : "Failed to save board order");
    }
  }

  async function handleCreateTextTask(title: string) {
    if (!state) {
      return;
    }
    const projectId = selectedProjectId;
    const status = route === "inbox" || !projectId ? "inbox" : "todo";
    const task = createTask({
      title,
      projectId,
      status,
      sortOrder: nextSortOrder(state.tasks, status, projectId),
    });

    const nextState = await persistTask(task);
    if (nextState) {
      void message.success(task.status === "inbox" ? "Task added to Inbox" : "Task created");
      setSelectedTaskId(task.id);
    }
  }

  async function handleCreateAttachmentTask(title: string | undefined, files: File[]) {
    if (!state || !repository) {
      return;
    }
    const projectId = selectedProjectId ?? state.preferences.screenshotTaskDefaultProjectId;
    const status = projectId ? "todo" : "inbox";
    const baseTask = createTask({
      title: title || createScreenshotTaskTitle(),
      projectId,
      status,
      sortOrder: nextSortOrder(state.tasks, status, projectId),
    });

    const stateWithBase = await persistTask(baseTask);
    if (!stateWithBase) {
      return;
    }

    let updatedTask = baseTask;
    for (const file of files) {
      const attachment = await repository.createAttachment(updatedTask, file);
      updatedTask = appendAttachment(updatedTask, attachment);
    }

    const nextState = await persistTask(updatedTask, baseTask, stateWithBase);
    if (nextState) {
      void message.success(
        updatedTask.status === "inbox" ? "Task added to Inbox" : "Task created",
      );
      setSelectedTaskId(updatedTask.id);
    }
  }

  async function handleSaveTask(task: Task, options?: { notify?: boolean }) {
    const previous = state?.tasks.find((item) => item.id === task.id);
    const nextState = await persistTask(task, previous);
    if (nextState && options?.notify !== false) {
      void message.success(taskSaveSuccessText(task, previous));
    }
    return Boolean(nextState);
  }

  async function handleAttachFiles(task: Task, files: File[]): Promise<Task> {
    if (!repository || !state) {
      return task;
    }

    let updatedTask = task;
    for (const file of files) {
      const attachment = await repository.createAttachment(updatedTask, file);
      updatedTask = appendAttachment(updatedTask, attachment);
    }
    await persistTask(updatedTask, task);
    return updatedTask;
  }

  async function handleCreateSubtask(parent: Task, title: string) {
    if (!state) {
      return;
    }
    const status = parent.status === "done" ? "todo" : parent.status;
    const task = createTask({
      title,
      projectId: parent.projectId,
      parentTaskId: parent.id,
      status,
      sortOrder: nextSortOrder(state.tasks, status, parent.projectId, parent.id),
    });
    await persistTask(task);
  }

  async function handlePromoteSubtask(task: Task) {
    if (!state) {
      return;
    }
    const promoted = {
      ...promoteSubtask(task),
      sortOrder: nextSortOrder(state.tasks, task.status, task.projectId),
    };
    await persistTask(promoted, task);
    setSelectedTaskId(promoted.id);
  }

  async function handleToggleSubtask(task: Task, done: boolean) {
    await handleSaveTask(
      {
        ...task,
        status: done ? "done" : "todo",
        completedAt: done ? task.completedAt ?? new Date().toISOString() : undefined,
        updatedAt: new Date().toISOString(),
      },
      { notify: false },
    );
  }

  async function handleRegisterTags(tags: string[]) {
    if (!state || !repository) {
      return;
    }
    const nextTags = mergeTags(state.preferences.tags, tags);
    if (nextTags.join("\n") === state.preferences.tags.join("\n")) {
      return;
    }
    const nextState = {
      ...state,
      preferences: {
        ...state.preferences,
        tags: nextTags,
      },
    };
    setState(nextState);
    try {
      await repository.savePreferences(nextState);
    } catch (error) {
      setState(state);
      void message.error(error instanceof Error ? error.message : "Failed to save tags");
    }
  }

  async function handleSaveProfile(nickname: string, avatarPresetId?: string) {
    if (!state || !repository) {
      return;
    }
    const nextState = {
      ...state,
      preferences: {
        ...state.preferences,
        userProfile: {
          nickname: nickname.trim() || "Local user",
          avatarPresetId,
        },
      },
    };
    setState(nextState);
    try {
      await repository.savePreferences(nextState);
    } catch (error) {
      setState(state);
      void message.error(error instanceof Error ? error.message : "Failed to save profile");
    }
  }

  async function handleCreateTag(tag: string) {
    await handleRegisterTags([tag]);
  }

  async function handleDeleteTag(tag: string) {
    if (!state || !repository) {
      return;
    }
    const nextTags = state.preferences.tags.filter((item) => item !== tag);
    const affectedTasks = state.tasks
      .filter((task) => task.tags.includes(tag))
      .map((task) => ({
        ...task,
        tags: task.tags.filter((item) => item !== tag),
        updatedAt: new Date().toISOString(),
      }));
    const changed = new Map(
      affectedTasks.map((task) => [task.id, state.tasks.find((item) => item.id === task.id)!]),
    );
    const updatedTasks = new Map(affectedTasks.map((task) => [task.id, task]));
    const nextState = {
      ...state,
      preferences: {
        ...state.preferences,
        tags: nextTags,
      },
      tasks: state.tasks.map((task) => updatedTasks.get(task.id) ?? task),
    };
    setState(nextState);
    try {
      await repository.savePreferences(nextState);
      if (affectedTasks.length > 0) {
        await repository.saveTasks(affectedTasks, nextState, changed);
      }
    } catch (error) {
      setState(state);
      void message.error(error instanceof Error ? error.message : "Failed to delete tag");
    }
  }

  function openCreateProjectModal() {
    setEditingProjectId(undefined);
    setProjectDraft({ name: "", description: "" });
    setProjectModalOpen(true);
  }

  function openEditProjectModal(project: Project) {
    setEditingProjectId(project.id);
    setProjectDraft({
      name: project.name,
      description: project.description ?? "",
    });
    setProjectModalOpen(true);
  }

  async function handleSaveProject() {
    if (!repository || !state || !projectDraft.name.trim()) {
      return;
    }

    const previous = editingProjectId
      ? state.projects.find((project) => project.id === editingProjectId)
      : undefined;
    const project = previous
      ? {
          ...previous,
          name: projectDraft.name.trim(),
          description: projectDraft.description.trim() || undefined,
          updatedAt: new Date().toISOString(),
        }
      : createProject({
          name: projectDraft.name.trim(),
          description: projectDraft.description.trim() || undefined,
          sortOrder: state.projects.length,
        });

    const nextState = {
      ...state,
      projects: previous
        ? state.projects.map((item) => (item.id === project.id ? project : item))
        : [...state.projects, project],
    };
    setState(nextState);

    try {
      await repository.saveProject(project, nextState, previous);
      setProjectDraft({ name: "", description: "" });
      setEditingProjectId(undefined);
      setProjectModalOpen(false);
      setRoute(`project:${project.id}`);
    } catch (error) {
      setState(state);
      void message.error(error instanceof Error ? error.message : "Failed to save project");
    }
  }

  async function handleDeleteProject(project: Project) {
    if (!repository || !state) {
      return;
    }
    const nextState = {
      ...state,
      projects: state.projects.filter((item) => item.id !== project.id),
      tasks: state.tasks.filter((task) => task.projectId !== project.id),
    };
    setState(nextState);
    setSelectedTaskId((current) =>
      current && state.tasks.find((task) => task.id === current)?.projectId === project.id
        ? undefined
        : current,
    );
    if (route === `project:${project.id}`) {
      setRoute("all");
    }

    try {
      await repository.deleteProject(project, nextState);
    } catch (error) {
      setState(state);
      void message.error(error instanceof Error ? error.message : "Failed to delete project");
    }
  }

  if (!state || !repository) {
    return (
      <WorkspaceGate
        supported={LocalWorkspaceRepository.isSupported()}
        loading={isOpening}
        recentWorkspaces={recentWorkspaces}
        onOpenWorkspace={openWorkspace}
        onOpenRecentWorkspace={openRecentWorkspace}
      />
    );
  }

  const mainMenuItems = createMenuItems(
    state.projects,
    openCreateProjectModal,
    openEditProjectModal,
    (project) => {
      void handleDeleteProject(project);
    },
    sidebarCollapsed,
  );
  const subtasks = selectedTask
    ? state.tasks.filter((task) => task.parentTaskId === selectedTask.id)
    : [];

  return (
    <Layout className="app-layout">
      <Sider
        width={264}
        collapsedWidth={92}
        collapsed={sidebarCollapsed}
        className="app-sidebar"
      >
        <div className="brand-block">
          <UserAvatar profile={state.preferences.userProfile} size={36} />
          {!sidebarCollapsed ? (
            <div>
              <strong>{state.preferences.userProfile.nickname}</strong>
              <span>{state.workspace.name}</span>
            </div>
          ) : null}
          <Tooltip title={sidebarCollapsed ? "Expand" : "Collapse"}>
            <Button
              className="sidebar-collapse-button"
              type="text"
              icon={sidebarCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
              onClick={() => setSidebarCollapsed((value) => !value)}
            />
          </Tooltip>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[route]}
          items={mainMenuItems}
          onClick={({ key }) => setRoute(key as RouteKey)}
        />
      </Sider>
      <Layout>
        <Content className="app-content">
          <header className="topbar">
            <div>
              <Typography.Title level={1}>{pageTitle}</Typography.Title>
              <span className="page-subtitle">{pageTasks.length} tasks</span>
            </div>
            <QuickCapture
              disabled={!repository}
              scopeLabel={scopeLabel}
              onCreateTextTask={handleCreateTextTask}
              onCreateAttachmentTask={handleCreateAttachmentTask}
            />
          </header>

          {route === "dashboard" && dashboard ? (
            <DashboardView
              dashboard={dashboard}
              tasks={state.tasks}
              projects={state.projects}
              onOpenTask={(task) => setSelectedTaskId(task.id)}
              onOpenProject={(projectId) => setRoute(`project:${projectId}`)}
              onOpenRoute={(nextRoute) => setRoute(nextRoute)}
            />
          ) : route === "settings" ? (
            <SettingsView
              state={state}
              recentWorkspaces={recentWorkspaces}
              onSwitchWorkspace={openWorkspace}
              onOpenRecentWorkspace={openRecentWorkspace}
              onSaveProfile={handleSaveProfile}
              onCreateTag={handleCreateTag}
              onDeleteTag={handleDeleteTag}
            />
          ) : route === "timeline" ? (
            <TimelineView
              tasks={state.tasks}
              projects={state.projects}
              onOpenTask={(task) => setSelectedTaskId(task.id)}
            />
          ) : (
            <section className="workspace-view">
              <div className="view-toolbar">
                <Space>
                  {boardCapable ? (
                    <Segmented
                      value={viewMode}
                      onChange={(value) => setViewMode(value as ViewMode)}
                      options={[
                        { label: "Board", value: "board" },
                        { label: "List", value: "list" },
                      ]}
                    />
                  ) : null}
                </Space>
                {selectedProject ? (
                  <span className="project-description">{selectedProject.description}</span>
                ) : null}
              </div>
              {pageTasks.length === 0 ? (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
              ) : boardCapable && viewMode === "board" ? (
                <KanbanBoard
                  tasks={pageTasks.filter((task) => !task.parentTaskId)}
                  allTasks={state.tasks}
                  onOpenTask={(task) => setSelectedTaskId(task.id)}
                  onToggleSubtask={handleToggleSubtask}
                  onTasksChange={persistTasks}
                />
              ) : (
                <TaskList
                  tasks={sortTasksForDisplay(pageTasks)}
                  projects={state.projects}
                  onOpenTask={(task) => setSelectedTaskId(task.id)}
                />
              )}
            </section>
          )}
        </Content>
      </Layout>

      <TaskDrawer
        open={Boolean(selectedTask)}
        task={selectedTask}
        subtasks={subtasks}
        projects={state.projects}
        availableTags={state.preferences.tags}
        resolveAttachmentUrl={resolveAttachmentUrl}
        onClose={() => setSelectedTaskId(undefined)}
        onSave={handleSaveTask}
        onAttachFiles={handleAttachFiles}
        onRegisterTags={handleRegisterTags}
        onCreateSubtask={handleCreateSubtask}
        onPromoteSubtask={handlePromoteSubtask}
      />

      <Modal
        title={editingProjectId ? "Edit Project" : "New Project"}
        open={projectModalOpen}
        onCancel={() => {
          setProjectModalOpen(false);
          setEditingProjectId(undefined);
        }}
        onOk={() => void handleSaveProject()}
        okButtonProps={{ disabled: !projectDraft.name.trim() }}
      >
        <div className="modal-stack">
          <Input
            autoFocus
            value={projectDraft.name}
            placeholder="Project name"
            onChange={(event) =>
              setProjectDraft((draft) => ({ ...draft, name: event.target.value }))
            }
            onPressEnter={() => void handleSaveProject()}
          />
          <Input.TextArea
            value={projectDraft.description}
            placeholder="Description"
            autoSize={{ minRows: 3, maxRows: 6 }}
            onChange={(event) =>
              setProjectDraft((draft) => ({
                ...draft,
                description: event.target.value,
              }))
            }
          />
        </div>
      </Modal>
    </Layout>
  );
}

function WorkspaceGate({
  supported,
  loading,
  recentWorkspaces,
  onOpenWorkspace,
  onOpenRecentWorkspace,
}: {
  supported: boolean;
  loading: boolean;
  recentWorkspaces: RecentWorkspace[];
  onOpenWorkspace: () => Promise<void>;
  onOpenRecentWorkspace: (workspace: RecentWorkspace) => Promise<void>;
}) {
  return (
    <main className="workspace-gate">
      <section className="workspace-gate-panel">
        <div className="workspace-gate-brand">
          <SquirrelIcon size={64} />
          <div>
            <Typography.Title level={1}>Squirrel</Typography.Title>
            <Typography.Text className="workspace-gate-subtitle">
              Local Workspace Task Board
            </Typography.Text>
          </div>
        </div>
        <Typography.Paragraph className="workspace-gate-description">
          Open an empty folder to start a new workspace, or open an existing Squirrel
          folder to continue with the same local data.
        </Typography.Paragraph>
        <Button
          type="primary"
          size="large"
          disabled={!supported}
          loading={loading}
          icon={<FolderKanban size={18} />}
          onClick={() => void onOpenWorkspace()}
        >
          Open Workspace Folder
        </Button>
        {!supported ? (
          <Typography.Text type="danger">
            Use a Chromium browser on localhost.
          </Typography.Text>
        ) : null}
        {recentWorkspaces.length > 0 ? (
          <div className="recent-workspace-list">
            <span>Recent workspaces</span>
            {recentWorkspaces.map((workspace) => (
              <button
                type="button"
                key={workspace.id}
                className="recent-workspace-button"
                onClick={() => void onOpenRecentWorkspace(workspace)}
              >
                <strong>{workspace.name}</strong>
                <small>{formatRecentDate(workspace.lastOpenedAt)}</small>
              </button>
            ))}
          </div>
        ) : null}
      </section>
    </main>
  );
}

function SettingsView({
  state,
  recentWorkspaces,
  onSwitchWorkspace,
  onOpenRecentWorkspace,
  onSaveProfile,
  onCreateTag,
  onDeleteTag,
}: {
  state: WorkspaceState;
  recentWorkspaces: RecentWorkspace[];
  onSwitchWorkspace: () => Promise<void>;
  onOpenRecentWorkspace: (workspace: RecentWorkspace) => Promise<void>;
  onSaveProfile: (nickname: string, avatarPresetId?: string) => Promise<void>;
  onCreateTag: (tag: string) => Promise<void>;
  onDeleteTag: (tag: string) => Promise<void>;
}) {
  const [nickname, setNickname] = useState(state.preferences.userProfile.nickname);
  const [avatarPresetId, setAvatarPresetId] = useState(
    state.preferences.userProfile.avatarPresetId,
  );
  const [tagDraft, setTagDraft] = useState("");

  useEffect(() => {
    setNickname(state.preferences.userProfile.nickname);
    setAvatarPresetId(state.preferences.userProfile.avatarPresetId);
  }, [state.preferences.userProfile]);

  return (
    <section className="settings-view">
      <section className="settings-panel">
        <div className="section-heading">
          <h2>Profile</h2>
        </div>
        <div className="profile-settings">
          <UserAvatar profile={{ nickname, avatarPresetId }} size={56} />
          <Input
            value={nickname}
            placeholder="Nickname"
            onChange={(event) => setNickname(event.target.value)}
          />
          <Button
            type="primary"
            onClick={() => void onSaveProfile(nickname, avatarPresetId)}
          >
            Save
          </Button>
        </div>
        <div className="avatar-preset-grid">
          <button
            type="button"
            className={`avatar-preset-item ${!avatarPresetId ? "avatar-preset-selected" : ""}`}
            onClick={() => setAvatarPresetId(undefined)}
          >
            <SquirrelIcon size={42} />
          </button>
          {avatarPresets.map((preset) => (
            <button
              type="button"
              key={preset.id}
              className={`avatar-preset-item ${
                avatarPresetId === preset.id ? "avatar-preset-selected" : ""
              }`}
              onClick={() => setAvatarPresetId(preset.id)}
            >
              <UserAvatar profile={{ nickname, avatarPresetId: preset.id }} size={42} />
            </button>
          ))}
        </div>
      </section>

      <section className="settings-panel">
        <div className="section-heading">
          <h2>Tags</h2>
          <span>{state.preferences.tags.length}</span>
        </div>
        <div className="tag-manager-create">
          <Input
            value={tagDraft}
            placeholder="New tag"
            onChange={(event) => setTagDraft(event.target.value)}
            onPressEnter={() => {
              if (tagDraft.trim()) {
                void onCreateTag(tagDraft.trim()).then(() => setTagDraft(""));
              }
            }}
          />
          <Button
            icon={<Plus size={16} />}
            disabled={!tagDraft.trim()}
            onClick={() =>
              void onCreateTag(tagDraft.trim()).then(() => setTagDraft(""))
            }
          />
        </div>
        <div className="tag-manager-list">
          {state.preferences.tags.map((tag) => (
            <span className="tag-manager-item" key={tag}>
              {tag}
              <Popconfirm
                title="Delete tag?"
                description="This removes the tag from saved tasks."
                okText="Delete"
                okButtonProps={{ danger: true }}
                onConfirm={() => void onDeleteTag(tag)}
              >
                <Button type="text" icon={<Trash2 size={14} />} />
              </Popconfirm>
            </span>
          ))}
          {state.preferences.tags.length === 0 ? (
            <span className="empty-line">No tags</span>
          ) : null}
        </div>
      </section>

      <section className="settings-panel">
        <div className="section-heading">
          <h2>Workspace</h2>
        </div>
        <Button icon={<Repeat2 size={16} />} onClick={() => void onSwitchWorkspace()}>
          Switch workspace
        </Button>
        <div className="settings-row">
          <span>Workspace</span>
          <strong>{state.workspace.name}</strong>
        </div>
        <div className="settings-row">
          <span>Schema</span>
          <strong>v{state.workspace.schemaVersion}</strong>
        </div>
        <div className="settings-row">
          <span>Projects</span>
          <strong>{state.projects.length}</strong>
        </div>
        <div className="settings-row">
          <span>Tasks</span>
          <strong>{state.tasks.length}</strong>
        </div>
        <div className="settings-row">
          <span>Markdown mirror</span>
          <strong>{state.preferences.markdownExportEnabled ? "On" : "Off"}</strong>
        </div>
        {recentWorkspaces.length > 0 ? (
          <div className="settings-recent-list">
            <span>Recent workspaces</span>
            {recentWorkspaces.map((workspace) => (
              <button
                type="button"
                key={workspace.id}
                className="recent-workspace-button"
                onClick={() => void onOpenRecentWorkspace(workspace)}
              >
                <strong>{workspace.name}</strong>
                <small>{formatRecentDate(workspace.lastOpenedAt)}</small>
              </button>
            ))}
          </div>
        ) : null}
      </section>
    </section>
  );
}

function createMenuItems(
  projects: Project[],
  onNewProject: () => void,
  onEditProject: (project: Project) => void,
  onDeleteProject: (project: Project) => void,
  collapsed: boolean,
): MenuProps["items"] {
  return [
    { key: "dashboard", icon: <LayoutDashboard size={16} />, label: "Dashboard" },
    { key: "inbox", icon: <Inbox size={16} />, label: "Inbox" },
    { key: "all", icon: <ListTodo size={16} />, label: "All Tasks" },
    { key: "overdue", icon: <AlertCircle size={16} />, label: "Overdue" },
    { key: "today", icon: <TimerReset size={16} />, label: "Today" },
    { key: "upcoming", icon: <CalendarDays size={16} />, label: "Upcoming" },
    { key: "waiting", icon: <Clock3 size={16} />, label: statusLabel.waiting },
    { key: "blocked", icon: <Blocks size={16} />, label: statusLabel.blocked },
    { key: "done", icon: <CheckCircle2 size={16} />, label: statusLabel.done },
    { key: "timeline", icon: <History size={16} />, label: "Timeline" },
    { key: "settings", icon: <Settings size={16} />, label: "Settings" },
    {
      key: "projects",
      type: "group",
      label: collapsed ? undefined : (
        <span className="menu-group-label">
          Projects
          <Button
            type="text"
            size="small"
            icon={<Plus size={14} />}
            onClick={(event) => {
              event.stopPropagation();
              onNewProject();
            }}
          />
        </span>
      ),
      children: projects
        .filter((project) => project.status !== "archived")
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((project) => ({
          key: `project:${project.id}`,
          icon: <FolderKanban size={16} />,
          label: collapsed ? (
            project.name
          ) : (
            <span className="project-menu-item">
              <span>{project.name}</span>
              <span className="project-menu-actions">
                <Button
                  type="text"
                  size="small"
                  icon={<Pencil size={13} />}
                  onClick={(event) => {
                    event.stopPropagation();
                    onEditProject(project);
                  }}
                />
                <Popconfirm
                  title="Delete project permanently?"
                  description="This deletes the project and its tasks. It cannot be recovered."
                  okText="Delete"
                  okButtonProps={{ danger: true }}
                  onConfirm={() => onDeleteProject(project)}
                >
                  <Button
                    type="text"
                    size="small"
                    icon={<Trash2 size={13} />}
                    onClick={(event) => event.stopPropagation()}
                  />
                </Popconfirm>
              </span>
            </span>
          ),
        })),
    },
  ];
}

function getRouteTitle(route: RouteKey, projects: Project[]): string {
  if (route.startsWith("project:")) {
    return projects.find((project) => project.id === route.slice("project:".length))?.name ?? "Project";
  }

  const titles: Record<Exclude<RouteKey, `project:${string}`>, string> = {
    dashboard: "Dashboard",
    all: "All Tasks",
    inbox: "Inbox",
    overdue: "Overdue",
    today: "Today",
    upcoming: "Upcoming",
    waiting: "Waiting",
    blocked: "Blocked",
    done: "Done",
    timeline: "Timeline",
    settings: "Settings",
  };

  return titles[route as keyof typeof titles];
}

function getRouteTasks(route: RouteKey, state: WorkspaceState): Task[] {
  const tasks = parentTasks(state.tasks).filter(
    (task) => task.status !== "archived" && task.status !== "cancelled",
  );
  const today = toDateOnly();
  const soon = addDays(today, state.preferences.dueSoonDays);

  if (route.startsWith("project:")) {
    const projectId = route.slice("project:".length);
    return tasks.filter((task) => task.projectId === projectId);
  }

  switch (route) {
    case "dashboard":
    case "all":
      return tasks;
    case "inbox":
      return tasks.filter((task) => task.status === "inbox");
    case "overdue":
      return tasks.filter(
        (task) => task.dueDate && task.status !== "done" && task.dueDate < today,
      );
    case "today":
      return tasks.filter((task) => task.dueDate === today);
    case "upcoming":
      return tasks.filter(
        (task) => task.dueDate && isDateInRange(task.dueDate, today, soon),
      );
    case "waiting":
      return tasks.filter((task) => task.status === "waiting");
    case "blocked":
      return tasks.filter((task) => task.status === "blocked");
    case "done":
      return tasks.filter((task) => task.status === "done");
    case "timeline":
      return tasks.filter((task) => task.status === "done");
    case "settings":
      return [];
  }

  return [];
}

function isBoardCapableRoute(route: RouteKey): boolean {
  return route === "all" || route === "inbox" || route.startsWith("project:");
}

function nextSortOrder(
  tasks: Task[],
  status: Task["status"],
  projectId?: string,
  parentTaskId?: string,
): number {
  const siblings = tasks.filter(
    (task) =>
      task.status === status &&
      task.projectId === projectId &&
      task.parentTaskId === parentTaskId,
  );
  return siblings.length === 0
    ? 0
    : Math.max(...siblings.map((task) => task.sortOrder)) + 1;
}

function mergeTags(existing: string[], incoming: string[]): string[] {
  const byLower = new Map<string, string>();
  for (const tag of [...existing, ...incoming]) {
    const normalized = tag.trim();
    if (!normalized) {
      continue;
    }
    const key = normalized.toLocaleLowerCase();
    if (!byLower.has(key)) {
      byLower.set(key, normalized);
    }
  }
  return Array.from(byLower.values()).sort((a, b) => a.localeCompare(b));
}

function taskSaveSuccessText(task: Task, previous?: Task): string {
  if (!previous) {
    return task.status === "inbox" ? "Task added to Inbox" : "Task created";
  }

  if (task.status === "inbox" && previous.status !== "inbox") {
    return "Task moved to Inbox";
  }

  return "Task updated";
}

function formatRecentDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
