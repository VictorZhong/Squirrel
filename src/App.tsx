import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  ConfigProvider,
  Empty,
  Input,
  Layout,
  Menu,
  Modal,
  Popconfirm,
  Segmented,
  Select,
  Space,
  Switch,
  TimePicker,
  Tooltip,
  Typography,
  App as AntApp,
  theme as antdTheme,
} from "antd";
import type { MenuProps } from "antd";
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  AlertCircle,
  Blocks,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FolderKanban,
  GripVertical,
  History,
  ListChecks,
  LayoutDashboard,
  ListTodo,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  Plus,
  Repeat2,
  Search,
  Settings,
  ShieldCheck,
  Sun,
  Trash2,
  TimerReset,
} from "lucide-react";
import dayjs from "dayjs";
import { appConfig } from "./config/appConfig";
import {
  PROJECT_COLOR_OPTIONS,
  randomProjectColor,
  resolveProjectColor,
} from "./domain/models/projectColors";
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
  WorkspaceThemePreferences,
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
import { filterTasksBySearch } from "./utils/taskSearch";
import { filterTasksByTags } from "./utils/taskTags";
import {
  EffectiveTheme,
  resolveWorkspaceTheme,
} from "./utils/themePreference";

const { Sider, Content } = Layout;
const CLIPBOARD_TASK_TITLE_LIMIT = 120;
const DEFAULT_THEME_PREFERENCES: WorkspaceThemePreferences = {
  mode: "light",
  darkStart: "20:00",
  darkEnd: "07:00",
};
const CLOCK_TIME_FORMAT = "HH:mm";

type RouteKey =
  | "dashboard"
  | "all"
  | "todo"
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

function useEffectiveWorkspaceTheme(
  preferences?: WorkspaceThemePreferences,
): EffectiveTheme {
  const resolvedPreferences = preferences ?? DEFAULT_THEME_PREFERENCES;
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    setNow(new Date());
  }, [
    resolvedPreferences.mode,
    resolvedPreferences.darkStart,
    resolvedPreferences.darkEnd,
  ]);

  useEffect(() => {
    if (resolvedPreferences.mode !== "auto") {
      return;
    }

    const interval = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(interval);
  }, [
    resolvedPreferences.mode,
    resolvedPreferences.darkStart,
    resolvedPreferences.darkEnd,
  ]);

  return useMemo(
    () => resolveWorkspaceTheme(resolvedPreferences, now),
    [resolvedPreferences, now],
  );
}

function createAntdThemeConfig(effectiveTheme: EffectiveTheme) {
  return {
    algorithm:
      effectiveTheme === "dark"
        ? antdTheme.darkAlgorithm
        : antdTheme.defaultAlgorithm,
    token: {
      colorPrimary: "#f97316",
      borderRadius: 8,
      fontFamily:
        'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    },
  };
}

function clockTimeValue(value: string) {
  return dayjs(`2026-01-01T${value}:00`);
}

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
  const [projectDraft, setProjectDraft] = useState(() => ({
    name: "",
    description: "",
    color: randomProjectColor(),
  }));
  const [isOpening, setIsOpening] = useState(false);
  const [, setAppPreferences] = useState(loadAppPreferences);
  const [recentWorkspaces, setRecentWorkspaces] = useState<RecentWorkspace[]>([]);
  const [selectedBoardTags, setSelectedBoardTags] = useState<string[]>([]);
  const [taskSearchQuery, setTaskSearchQuery] = useState("");

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
  const taskViewRoute = isTaskViewRoute(route);
  const searchedPageTasks = useMemo(
    () =>
      state && taskViewRoute
        ? filterTasksBySearch(pageTasks, taskSearchQuery, state.projects)
        : pageTasks,
    [pageTasks, state, taskSearchQuery, taskViewRoute],
  );
  const boardFilteredTasks = useMemo(
    () => filterTasksByTags(searchedPageTasks, selectedBoardTags),
    [searchedPageTasks, selectedBoardTags],
  );
  const pageTitle = state ? getRouteTitle(route, state.projects) : "Squirrel";
  const boardCapable = isBoardCapableRoute(route);
  const hasSearchQuery = taskViewRoute && taskSearchQuery.trim().length > 0;
  const hasBoardTagFilters =
    taskViewRoute && boardCapable && viewMode === "board" && selectedBoardTags.length > 0;
  const visibleTaskCount = hasBoardTagFilters ? boardFilteredTasks.length : searchedPageTasks.length;
  const hasTaskFilters = hasSearchQuery || hasBoardTagFilters;
  const pageSubtitle =
    route === "settings"
      ? state?.workspace.name
      : hasTaskFilters
        ? `${visibleTaskCount}/${pageTasks.length} tasks`
        : `${pageTasks.length} tasks`;
  const effectiveTheme = useEffectiveWorkspaceTheme(state?.preferences.theme);
  const antdThemeConfig = useMemo(
    () => createAntdThemeConfig(effectiveTheme),
    [effectiveTheme],
  );

  useEffect(() => {
    document.documentElement.dataset.theme = effectiveTheme;
  }, [effectiveTheme]);

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

  useEffect(() => {
    setSelectedBoardTags((current) =>
      state ? current.filter((tag) => state.preferences.tags.includes(tag)) : [],
    );
  }, [state?.preferences.tags]);

  useEffect(() => {
    if (!state || !repository || !state.preferences.globalPasteCaptureEnabled) {
      return;
    }

    function handleWorkspacePaste(event: ClipboardEvent) {
      if (event.defaultPrevented || isEditablePasteTarget(event.target)) {
        return;
      }

      const clipboard = event.clipboardData;
      if (!clipboard) {
        return;
      }

      const imageFiles = Array.from(clipboard.files).filter((file) =>
        file.type.startsWith("image/"),
      );
      const text = clipboard.getData("text/plain");

      if (imageFiles.length > 0) {
        const content = createClipboardTaskContent(text);
        event.preventDefault();
        void handleCreateAttachmentTask(content?.title, imageFiles, content?.description);
        return;
      }

      const content = createClipboardTaskContent(text);
      if (!content) {
        return;
      }

      event.preventDefault();
      void handleCreateClipboardTextTask(text);
    }

    window.addEventListener("paste", handleWorkspacePaste);
    return () => window.removeEventListener("paste", handleWorkspacePaste);
  }, [repository, selectedProjectId, state]);

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
    setSelectedBoardTags([]);
    setTaskSearchQuery("");
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

  async function persistProjects(changedProjects: Project[]) {
    if (!repository || !state || changedProjects.length === 0) {
      return;
    }

    const changed = new Map(changedProjects.map((project) => [project.id, project]));
    const previousProjects = new Map(
      changedProjects.map((project) => [
        project.id,
        state.projects.find((item) => item.id === project.id)!,
      ]),
    );
    const nextState = {
      ...state,
      projects: state.projects.map((project) => changed.get(project.id) ?? project),
    };
    setState(nextState);

    try {
      await repository.saveProjects(changedProjects, nextState, previousProjects);
    } catch (error) {
      setState(state);
      void message.error(error instanceof Error ? error.message : "Failed to save project order");
    }
  }

  async function handleCreateTextTask(title: string) {
    if (!state) {
      return;
    }
    const projectId = getDefaultTaskProjectId(state, selectedProjectId);
    const task = createTask({
      title,
      projectId,
      status: "todo",
      sortOrder: firstSortOrder(state.tasks, "todo", projectId),
    });

    const nextState = await persistTask(task);
    if (nextState) {
      void message.success("Task created");
      setSelectedTaskId(task.id);
    }
  }

  async function handleCreateClipboardTextTask(text: string) {
    if (!state) {
      return;
    }
    const content = createClipboardTaskContent(text);
    if (!content) {
      return;
    }
    const projectId = getDefaultTaskProjectId(state, selectedProjectId);
    const task = createTask({
      title: content.title,
      description: content.description,
      projectId,
      status: "todo",
      sortOrder: firstSortOrder(state.tasks, "todo", projectId),
    });

    const nextState = await persistTask(task);
    if (nextState) {
      void message.success("Task created");
      setSelectedTaskId(task.id);
    }
  }

  async function handleCreateAttachmentTask(
    title: string | undefined,
    files: File[],
    description?: string,
  ) {
    if (!state || !repository) {
      return;
    }
    const projectId = getDefaultTaskProjectId(state, selectedProjectId);
    const baseTask = createTask({
      title: title || createScreenshotTaskTitle(),
      description,
      projectId,
      status: "todo",
      sortOrder: firstSortOrder(state.tasks, "todo", projectId),
    });

    let updatedTask = baseTask;
    for (const file of files) {
      const attachment = await repository.createAttachment(updatedTask, file);
      updatedTask = appendAttachment(updatedTask, attachment);
    }

    const nextState = await persistTask(updatedTask);
    if (nextState) {
      void message.success("Task created");
      setSelectedTaskId(updatedTask.id);
    }
  }

  async function handleSaveTask(task: Task, options?: { notify?: boolean }) {
    const previous = state?.tasks.find((item) => item.id === task.id);
    const nextState = await persistTask(task, previous);
    if (nextState && options?.notify !== false) {
      void message.success(taskSaveSuccessText(previous));
    }
    return Boolean(nextState);
  }

  async function handleDeleteTask(task: Task): Promise<boolean> {
    if (!repository || !state) {
      return false;
    }

    const tasksToDelete = collectTaskTree(task.id, state.tasks);
    if (tasksToDelete.length === 0) {
      return false;
    }
    const previousSelectedTaskId = selectedTaskId;
    const deletingIds = new Set(tasksToDelete.map((item) => item.id));
    const nextState = {
      ...state,
      tasks: state.tasks.filter((item) => !deletingIds.has(item.id)),
    };
    setState(nextState);
    setSelectedTaskId((current) => (current && deletingIds.has(current) ? undefined : current));

    try {
      await repository.deleteTasks(tasksToDelete, nextState);
      void message.success(
        tasksToDelete.length === 1 ? "Task deleted" : "Task and subtasks deleted",
      );
      return true;
    } catch (error) {
      setState(state);
      setSelectedTaskId(previousSelectedTaskId);
      void message.error(error instanceof Error ? error.message : "Failed to delete task");
      return false;
    }
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

  async function handleDeleteAttachment(task: Task, attachment: Attachment): Promise<Task> {
    if (!repository || !state) {
      return task;
    }
    if (!task.attachments.some((item) => item.id === attachment.id)) {
      return task;
    }

    const previous = state.tasks.find((item) => item.id === task.id) ?? task;
    const updatedTask = {
      ...task,
      attachments: task.attachments.filter((item) => item.id !== attachment.id),
      updatedAt: new Date().toISOString(),
    };
    const nextState = {
      ...state,
      tasks: state.tasks.map((item) => (item.id === updatedTask.id ? updatedTask : item)),
    };
    setState(nextState);

    try {
      await repository.deleteAttachment(updatedTask, previous, attachment, nextState);
      void message.success("Attachment deleted");
      return updatedTask;
    } catch (error) {
      setState(state);
      void message.error(error instanceof Error ? error.message : "Failed to delete attachment");
      return task;
    }
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

  async function handleSaveDefaultProject(defaultProjectId: string) {
    if (!state || !repository) {
      return;
    }

    const nextDefaultProject = state.projects.find(
      (project) => project.id === defaultProjectId && project.status !== "archived",
    );
    if (!nextDefaultProject) {
      void message.error("Choose an active project as the default");
      return;
    }

    const nextState = {
      ...state,
      preferences: {
        ...state.preferences,
        defaultProjectId: nextDefaultProject.id,
      },
    };
    setState(nextState);
    try {
      await repository.savePreferences(nextState);
      void message.success("Default project updated");
    } catch (error) {
      setState(state);
      void message.error(error instanceof Error ? error.message : "Failed to save default project");
    }
  }

  async function handleSaveShowProjectNameOnBoard(showProjectNameOnBoard: boolean) {
    if (!state || !repository) {
      return;
    }

    const nextState = {
      ...state,
      preferences: {
        ...state.preferences,
        showProjectNameOnBoard,
      },
    };
    setState(nextState);
    try {
      await repository.savePreferences(nextState);
    } catch (error) {
      setState(state);
      void message.error(
        error instanceof Error ? error.message : "Failed to save board preference",
      );
    }
  }

  async function handleSaveGlobalPasteCaptureEnabled(globalPasteCaptureEnabled: boolean) {
    if (!state || !repository) {
      return;
    }

    const nextState = {
      ...state,
      preferences: {
        ...state.preferences,
        globalPasteCaptureEnabled,
      },
    };
    setState(nextState);
    try {
      await repository.savePreferences(nextState);
    } catch (error) {
      setState(state);
      void message.error(
        error instanceof Error ? error.message : "Failed to save paste preference",
      );
    }
  }

  async function handleSaveTheme(themePreferences: WorkspaceThemePreferences) {
    if (!state || !repository) {
      return;
    }

    const nextState = {
      ...state,
      preferences: {
        ...state.preferences,
        theme: themePreferences,
      },
    };
    setState(nextState);
    try {
      await repository.savePreferences(nextState);
    } catch (error) {
      setState(state);
      void message.error(
        error instanceof Error ? error.message : "Failed to save appearance preference",
      );
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
    setProjectDraft({ name: "", description: "", color: randomProjectColor() });
    setProjectModalOpen(true);
  }

  function openEditProjectModal(project: Project) {
    setEditingProjectId(project.id);
    setProjectDraft({
      name: project.name,
      description: project.description ?? "",
      color: resolveProjectColor(project),
    });
    setProjectModalOpen(true);
  }

  async function handleSaveProject() {
    if (!repository || !state || !projectDraft.name.trim()) {
      return;
    }

    const nextProjectName = projectDraft.name.trim();
    if (hasDuplicateProjectName(state.projects, nextProjectName, editingProjectId)) {
      void message.error("Project name already exists in this workspace");
      return;
    }

    const previous = editingProjectId
      ? state.projects.find((project) => project.id === editingProjectId)
      : undefined;
    const project = previous
      ? {
          ...previous,
          name: nextProjectName,
          description: projectDraft.description.trim() || undefined,
          color: projectDraft.color,
          updatedAt: new Date().toISOString(),
        }
      : createProject({
          name: nextProjectName,
          description: projectDraft.description.trim() || undefined,
          color: projectDraft.color,
          sortOrder: state.projects.length,
        });

    const nextState = {
      ...state,
      preferences:
        !previous && !state.preferences.defaultProjectId
          ? {
              ...state.preferences,
              defaultProjectId: project.id,
            }
          : state.preferences,
      projects: previous
        ? state.projects.map((item) => (item.id === project.id ? project : item))
        : [...state.projects, project],
    };
    setState(nextState);

    try {
      await repository.saveProject(project, nextState, previous);
      if (!previous && !state.preferences.defaultProjectId) {
        await repository.savePreferences(nextState);
      }
      setProjectDraft({ name: "", description: "", color: randomProjectColor() });
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
    if (state.preferences.defaultProjectId === project.id) {
      void message.warning("Default project cannot be deleted. Choose another default project first.");
      return;
    }

    const nextProjects = state.projects.filter((item) => item.id !== project.id);
    const nextState = {
      ...state,
      projects: nextProjects,
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
      <ConfigProvider theme={antdThemeConfig}>
        <WorkspaceGate
          supported={LocalWorkspaceRepository.isSupported()}
          loading={isOpening}
          recentWorkspaces={recentWorkspaces}
          onOpenWorkspace={openWorkspace}
          onOpenRecentWorkspace={openRecentWorkspace}
        />
      </ConfigProvider>
    );
  }

  const mainMenuItems = createMenuItems();
  const subtasks = selectedTask
    ? state.tasks.filter((task) => task.parentTaskId === selectedTask.id)
    : [];
  const boardTasks = hasBoardTagFilters ? boardFilteredTasks : searchedPageTasks;
  const viewTasks =
    boardCapable && viewMode === "board" ? boardTasks : searchedPageTasks;

  return (
    <ConfigProvider theme={antdThemeConfig}>
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
        <ProjectNav
          projects={state.projects}
          defaultProjectId={state.preferences.defaultProjectId}
          selectedRoute={route}
          collapsed={sidebarCollapsed}
          onSelect={(project) => setRoute(`project:${project.id}`)}
          onNewProject={openCreateProjectModal}
          onEditProject={openEditProjectModal}
          onDeleteProject={(project) => {
            void handleDeleteProject(project);
          }}
          onReorderProjects={(projects) => void persistProjects(projects)}
        />
      </Sider>
      <Layout>
        <Content className="app-content">
          <header className="topbar">
            <div>
              <Typography.Title level={1}>{pageTitle}</Typography.Title>
              <span className="page-subtitle">{pageSubtitle}</span>
            </div>
            <QuickCapture
              disabled={!repository}
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
              onToggleSubtask={handleToggleSubtask}
              onOpenRoute={(nextRoute) => setRoute(nextRoute)}
            />
          ) : route === "settings" ? (
            <SettingsView
              state={state}
              recentWorkspaces={recentWorkspaces}
              onSwitchWorkspace={openWorkspace}
              onOpenRecentWorkspace={openRecentWorkspace}
              onSaveProfile={handleSaveProfile}
              onSaveDefaultProject={handleSaveDefaultProject}
              onSaveGlobalPasteCaptureEnabled={handleSaveGlobalPasteCaptureEnabled}
              onSaveTheme={handleSaveTheme}
              onCreateTag={handleCreateTag}
              onDeleteTag={handleDeleteTag}
            />
          ) : route === "timeline" ? (
            <TimelineView
              tasks={state.tasks}
              projects={state.projects}
              availableTags={state.preferences.tags}
              onOpenTask={(task) => setSelectedTaskId(task.id)}
            />
          ) : (
            <section className="workspace-view">
              <div className="view-toolbar">
                <Space className="view-toolbar-controls" wrap>
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
                  {boardCapable && viewMode === "board" ? (
                    <span className="board-project-name-toggle">
                      <Switch
                        size="small"
                        checked={state.preferences.showProjectNameOnBoard}
                        onChange={(checked) => void handleSaveShowProjectNameOnBoard(checked)}
                      />
                      <span>Project name</span>
                    </span>
                  ) : null}
                </Space>
                <div className="view-toolbar-right">
                  {selectedProject ? (
                    <span className="project-description">{selectedProject.description}</span>
                  ) : null}
                  <Input
                    className="task-search-input"
                    allowClear
                    prefix={<Search size={14} />}
                    value={taskSearchQuery}
                    placeholder="Search tasks"
                    onChange={(event) => setTaskSearchQuery(event.target.value)}
                  />
                  {boardCapable && viewMode === "board" && state.preferences.tags.length > 0 ? (
                    <Select
                      className="board-tag-filter"
                      mode="multiple"
                      allowClear
                      maxTagCount="responsive"
                      value={selectedBoardTags}
                      placeholder="Tags"
                      onChange={(tags) => setSelectedBoardTags(tags)}
                      options={state.preferences.tags.map((tag) => ({
                        value: tag,
                        label: tag,
                      }))}
                    />
                  ) : null}
                  {hasBoardTagFilters ? (
                    <span className="task-filter-count">
                      {boardTasks.length}/{pageTasks.length}
                    </span>
                  ) : null}
                </div>
              </div>
              {pageTasks.length === 0 ? (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
              ) : viewTasks.length === 0 ? (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No matching tasks" />
              ) : boardCapable && viewMode === "board" ? (
                <KanbanBoard
                  tasks={boardTasks.filter((task) => !task.parentTaskId)}
                  orderingTasks={pageTasks.filter((task) => !task.parentTaskId)}
                  allTasks={state.tasks}
                  projects={state.projects}
                  showProjectName={state.preferences.showProjectNameOnBoard}
                  onOpenTask={(task) => setSelectedTaskId(task.id)}
                  onToggleSubtask={handleToggleSubtask}
                  onTasksChange={persistTasks}
                  onOpenDoneRoute={() => setRoute("done")}
                />
              ) : (
                <TaskList
                  tasks={sortTasksForDisplay(searchedPageTasks)}
                  projects={state.projects}
                  onOpenTask={(task) => setSelectedTaskId(task.id)}
                />
              )}
            </section>
          )}
          <footer className="app-footer">
            <a href={appConfig.userGuideUrl} target="_blank" rel="noreferrer">
              Built by Squirrel team
            </a>
          </footer>
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
        onDeleteAttachment={handleDeleteAttachment}
        onRegisterTags={handleRegisterTags}
        onCreateSubtask={handleCreateSubtask}
        onPromoteSubtask={handlePromoteSubtask}
        onDeleteTask={handleDeleteTask}
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
          <div className="project-color-field">
            <span>Color</span>
            <div className="project-color-grid">
              {PROJECT_COLOR_OPTIONS.map((color) => (
                <button
                  type="button"
                  key={color.value}
                  className={`project-color-swatch ${
                    projectDraft.color === color.value ? "project-color-swatch-selected" : ""
                  }`}
                  style={{ backgroundColor: color.value }}
                  title={color.label}
                  aria-label={color.label}
                  onClick={() =>
                    setProjectDraft((draft) => ({ ...draft, color: color.value }))
                  }
                />
              ))}
            </div>
          </div>
        </div>
      </Modal>
      </Layout>
    </ConfigProvider>
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
        <div className="local-data-highlight">
          <ShieldCheck size={18} />
          <span>
            Your data is saved only in the local folder you choose. Squirrel does not
            upload workspace data to any server.
          </span>
        </div>
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
  onSaveDefaultProject,
  onSaveGlobalPasteCaptureEnabled,
  onSaveTheme,
  onCreateTag,
  onDeleteTag,
}: {
  state: WorkspaceState;
  recentWorkspaces: RecentWorkspace[];
  onSwitchWorkspace: () => Promise<void>;
  onOpenRecentWorkspace: (workspace: RecentWorkspace) => Promise<void>;
  onSaveProfile: (nickname: string, avatarPresetId?: string) => Promise<void>;
  onSaveDefaultProject: (defaultProjectId: string) => Promise<void>;
  onSaveGlobalPasteCaptureEnabled: (enabled: boolean) => Promise<void>;
  onSaveTheme: (themePreferences: WorkspaceThemePreferences) => Promise<void>;
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
          <h2>Appearance</h2>
          <span>
            {resolveWorkspaceTheme(state.preferences.theme) === "dark"
              ? "Dark"
              : "Light"}
          </span>
        </div>
        <div className="settings-field">
          <span>Mode</span>
          <Segmented
            value={state.preferences.theme.mode}
            onChange={(mode) =>
              void onSaveTheme({
                ...state.preferences.theme,
                mode: mode as WorkspaceThemePreferences["mode"],
              })
            }
            options={[
              {
                value: "light",
                label: (
                  <span className="segmented-icon-label">
                    <Sun size={14} />
                    Light
                  </span>
                ),
              },
              {
                value: "dark",
                label: (
                  <span className="segmented-icon-label">
                    <Moon size={14} />
                    Dark
                  </span>
                ),
              },
              {
                value: "auto",
                label: (
                  <span className="segmented-icon-label">
                    <Clock3 size={14} />
                    Auto
                  </span>
                ),
              },
            ]}
          />
        </div>
        <div className="settings-time-grid">
          <div className="settings-field">
            <span>Dark start</span>
            <TimePicker
              className="full-width-control"
              format={CLOCK_TIME_FORMAT}
              minuteStep={15}
              value={clockTimeValue(state.preferences.theme.darkStart)}
              disabled={state.preferences.theme.mode !== "auto"}
              onChange={(time) =>
                void onSaveTheme({
                  ...state.preferences.theme,
                  darkStart: time
                    ? time.format(CLOCK_TIME_FORMAT)
                    : state.preferences.theme.darkStart,
                })
              }
            />
          </div>
          <div className="settings-field">
            <span>Dark end</span>
            <TimePicker
              className="full-width-control"
              format={CLOCK_TIME_FORMAT}
              minuteStep={15}
              value={clockTimeValue(state.preferences.theme.darkEnd)}
              disabled={state.preferences.theme.mode !== "auto"}
              onChange={(time) =>
                void onSaveTheme({
                  ...state.preferences.theme,
                  darkEnd: time
                    ? time.format(CLOCK_TIME_FORMAT)
                    : state.preferences.theme.darkEnd,
                })
              }
            />
          </div>
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
          <span>Paste to create task</span>
          <Switch
            checked={state.preferences.globalPasteCaptureEnabled}
            onChange={(checked) => void onSaveGlobalPasteCaptureEnabled(checked)}
          />
        </div>
        <div className="settings-field">
          <span>Default project</span>
          <Select
            value={state.preferences.defaultProjectId}
            placeholder="Select project"
            onChange={(projectId) => void onSaveDefaultProject(projectId)}
            options={state.projects
              .filter((project) => project.status !== "archived")
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((project) => ({
                value: project.id,
                label: project.name,
              }))}
          />
        </div>
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

      <section className="settings-panel">
        <div className="section-heading">
          <h2>Help</h2>
        </div>
        <Button
          icon={<BookOpen size={16} />}
          href={appConfig.userGuideUrl}
          target="_blank"
          rel="noreferrer"
        >
          User guide
        </Button>
      </section>
    </section>
  );
}

function ProjectNav({
  projects,
  defaultProjectId,
  selectedRoute,
  collapsed,
  onSelect,
  onNewProject,
  onEditProject,
  onDeleteProject,
  onReorderProjects,
}: {
  projects: Project[];
  defaultProjectId?: string;
  selectedRoute: RouteKey;
  collapsed: boolean;
  onSelect: (project: Project) => void;
  onNewProject: () => void;
  onEditProject: (project: Project) => void;
  onDeleteProject: (project: Project) => void;
  onReorderProjects: (projects: Project[]) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  );
  const visibleProjects = projects
    .filter((project) => project.status !== "archived")
    .sort((a, b) => a.sortOrder - b.sortOrder);

  function handleDragEnd(event: DragEndEvent) {
    const activeId = String(event.active.id);
    const overId = event.over ? String(event.over.id) : undefined;
    if (!overId || activeId === overId) {
      return;
    }
    const activeIndex = visibleProjects.findIndex((project) => project.id === activeId);
    const overIndex = visibleProjects.findIndex((project) => project.id === overId);
    if (activeIndex < 0 || overIndex < 0) {
      return;
    }

    const reordered = [...visibleProjects];
    const [moved] = reordered.splice(activeIndex, 1);
    reordered.splice(overIndex, 0, moved);
    const now = new Date().toISOString();
    const changed = reordered
      .map((project, index) => ({
        ...project,
        sortOrder: index,
        updatedAt: project.sortOrder === index ? project.updatedAt : now,
      }))
      .filter((project) => {
        const previous = projects.find((item) => item.id === project.id);
        return previous?.sortOrder !== project.sortOrder;
      });

    onReorderProjects(changed);
  }

  return (
    <section className={`project-nav ${collapsed ? "project-nav-collapsed" : ""}`}>
      {!collapsed ? (
        <div className="project-nav-heading">
          <span>Projects</span>
          <Button
            type="text"
            size="small"
            icon={<Plus size={14} />}
            onClick={onNewProject}
          />
        </div>
      ) : null}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext
          items={visibleProjects.map((project) => project.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="project-nav-list">
            {visibleProjects.map((project) => (
              <SortableProjectNavItem
                key={project.id}
                project={project}
                selected={selectedRoute === `project:${project.id}`}
                collapsed={collapsed}
                isDefaultProject={project.id === defaultProjectId}
                onSelect={onSelect}
                onEdit={onEditProject}
                onDelete={onDeleteProject}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </section>
  );
}

function SortableProjectNavItem({
  project,
  selected,
  collapsed,
  isDefaultProject,
  onSelect,
  onEdit,
  onDelete,
}: {
  project: Project;
  selected: boolean;
  collapsed: boolean;
  isDefaultProject: boolean;
  onSelect: (project: Project) => void;
  onEdit: (project: Project) => void;
  onDelete: (project: Project) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: project.id });

  return (
    <div
      ref={setNodeRef}
      className={`project-nav-item-wrap ${isDragging ? "project-nav-item-dragging" : ""}`}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
    >
      <div
        className={`project-nav-item ${selected ? "project-nav-item-selected" : ""}`}
        title={project.name}
      >
        <span className="project-drag-handle" {...attributes} {...listeners}>
          <GripVertical size={14} />
        </span>
        <button
          type="button"
          className="project-nav-select"
          onClick={() => onSelect(project)}
        >
          <FolderKanban size={16} />
          {!collapsed ? <span className="project-nav-name">{project.name}</span> : null}
        </button>
        {!collapsed ? (
          <span className="project-menu-actions">
            <Button
              type="text"
              size="small"
              icon={<Pencil size={13} />}
              onClick={() => onEdit(project)}
            />
            {isDefaultProject ? (
              <Tooltip title="Default project cannot be deleted. Choose another default project first.">
                <span>
                  <Button type="text" size="small" disabled icon={<Trash2 size={13} />} />
                </span>
              </Tooltip>
            ) : (
              <Popconfirm
                title="Delete project permanently?"
                description="This deletes the project and its tasks. It cannot be recovered."
                okText="Delete"
                okButtonProps={{ danger: true }}
                onConfirm={() => onDelete(project)}
              >
                <Button type="text" size="small" icon={<Trash2 size={13} />} />
              </Popconfirm>
            )}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function createMenuItems(): MenuProps["items"] {
  return [
    { key: "dashboard", icon: <LayoutDashboard size={16} />, label: "Dashboard" },
    { key: "all", icon: <ListChecks size={16} />, label: "All Tasks" },
    { key: "todo", icon: <ListTodo size={16} />, label: statusLabel.todo },
    { key: "overdue", icon: <AlertCircle size={16} />, label: "Overdue" },
    { key: "today", icon: <TimerReset size={16} />, label: "Today" },
    { key: "upcoming", icon: <CalendarDays size={16} />, label: "Upcoming" },
    { key: "waiting", icon: <Clock3 size={16} />, label: statusLabel.waiting },
    { key: "blocked", icon: <Blocks size={16} />, label: statusLabel.blocked },
    { key: "done", icon: <CheckCircle2 size={16} />, label: statusLabel.done },
    { key: "timeline", icon: <History size={16} />, label: "Timeline" },
    { key: "settings", icon: <Settings size={16} />, label: "Settings" },
  ];
}

function createClipboardTaskContent(
  text: string,
): { title: string; description?: string } | undefined {
  const description = text.trim();
  const normalizedTitle = description.replace(/\s+/g, " ").trim();
  if (!normalizedTitle) {
    return undefined;
  }

  const titleCharacters = Array.from(normalizedTitle);
  if (titleCharacters.length <= CLIPBOARD_TASK_TITLE_LIMIT) {
    return { title: normalizedTitle };
  }

  return {
    title: `${titleCharacters.slice(0, CLIPBOARD_TASK_TITLE_LIMIT - 3).join("").trimEnd()}...`,
    description,
  };
}

function isEditablePasteTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) {
    return false;
  }

  const editable = target.closest("input, textarea, [contenteditable]");
  if (!(editable instanceof HTMLElement)) {
    return false;
  }

  return editable.getAttribute("contenteditable") !== "false";
}

function getRouteTitle(route: RouteKey, projects: Project[]): string {
  if (route.startsWith("project:")) {
    return projects.find((project) => project.id === route.slice("project:".length))?.name ?? "Project";
  }

  const titles: Record<Exclude<RouteKey, `project:${string}`>, string> = {
    dashboard: "Dashboard",
    all: "All Tasks",
    todo: "Todo",
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
    case "todo":
      return tasks.filter((task) => task.status === "todo");
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
  return route === "all" || route.startsWith("project:");
}

function isTaskViewRoute(route: RouteKey): boolean {
  return route !== "dashboard" && route !== "timeline" && route !== "settings";
}

function getDefaultTaskProjectId(
  state: WorkspaceState,
  selectedProjectId?: string,
): string | undefined {
  const candidate =
    selectedProjectId ??
    state.preferences.defaultProjectId ??
    state.preferences.screenshotTaskDefaultProjectId;

  return state.projects.some(
    (project) => project.id === candidate && project.status !== "archived",
  )
    ? candidate
    : state.projects
        .filter((project) => project.status !== "archived")
        .sort((a, b) => a.sortOrder - b.sortOrder)[0]?.id;
}

function collectTaskTree(taskId: string, tasks: Task[]): Task[] {
  const descendants = new Set<string>([taskId]);
  let grew = true;

  while (grew) {
    grew = false;
    for (const task of tasks) {
      if (task.parentTaskId && descendants.has(task.parentTaskId) && !descendants.has(task.id)) {
        descendants.add(task.id);
        grew = true;
      }
    }
  }

  return tasks.filter((task) => descendants.has(task.id));
}

function hasDuplicateProjectName(
  projects: Project[],
  name: string,
  currentProjectId?: string,
): boolean {
  const normalized = normalizeProjectName(name);
  return projects.some(
    (project) =>
      project.id !== currentProjectId && normalizeProjectName(project.name) === normalized,
  );
}

function normalizeProjectName(name: string): string {
  return name.trim().toLocaleLowerCase();
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

function firstSortOrder(
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
    : Math.min(...siblings.map((task) => task.sortOrder)) - 1;
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

function taskSaveSuccessText(previous?: Task): string {
  if (!previous) {
    return "Task created";
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
