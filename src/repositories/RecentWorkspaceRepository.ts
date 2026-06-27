import { RecentWorkspace } from "../domain/models/types";

const DB_NAME = "squirrel.recentWorkspaces";
const DB_VERSION = 1;
const STORE_NAME = "workspaces";

interface StoredRecentWorkspace extends RecentWorkspace {
  handle: FileSystemDirectoryHandle;
}

export async function loadRecentWorkspaces(): Promise<RecentWorkspace[]> {
  const db = await openDatabase();
  if (!db) {
    return [];
  }

  return new Promise((resolve) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const request = transaction.objectStore(STORE_NAME).getAll();

    request.onsuccess = () => {
      const entries = (request.result as StoredRecentWorkspace[])
        .filter((entry) => entry.handle)
        .sort((a, b) => b.lastOpenedAt.localeCompare(a.lastOpenedAt))
        .slice(0, 10)
        .map(({ id, name, lastOpenedAt }) => ({
          id,
          name,
          lastOpenedAt,
          storageMode: "folder" as const,
        }));
      resolve(entries);
    };
    request.onerror = () => resolve([]);
  });
}

export async function rememberWorkspaceHandle(
  workspace: RecentWorkspace,
  handle: FileSystemDirectoryHandle,
): Promise<RecentWorkspace[]> {
  const db = await openDatabase();
  if (!db) {
    return [];
  }

  await new Promise<void>((resolve) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put({ ...workspace, storageMode: "folder", handle });
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => resolve();
  });

  return loadRecentWorkspaces();
}

export async function getRecentWorkspaceHandle(
  workspaceId: string,
): Promise<FileSystemDirectoryHandle | undefined> {
  const db = await openDatabase();
  if (!db) {
    return undefined;
  }

  const entry = await new Promise<StoredRecentWorkspace | undefined>((resolve) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const request = transaction.objectStore(STORE_NAME).get(workspaceId);
    request.onsuccess = () => resolve(request.result as StoredRecentWorkspace | undefined);
    request.onerror = () => resolve(undefined);
  });

  if (!entry?.handle) {
    return undefined;
  }

  await ensureReadWritePermission(entry.handle);
  return entry.handle;
}

async function ensureReadWritePermission(handle: FileSystemDirectoryHandle): Promise<void> {
  const descriptor: FileSystemHandlePermissionDescriptor = { mode: "readwrite" };
  const currentPermission = await handle.queryPermission?.(descriptor);

  if (currentPermission === "granted" || !handle.requestPermission) {
    return;
  }

  const nextPermission = await handle.requestPermission(descriptor);
  if (nextPermission !== "granted") {
    throw new Error("Permission is required to open this workspace.");
  }
}

async function openDatabase(): Promise<IDBDatabase | undefined> {
  if (typeof indexedDB === "undefined") {
    return undefined;
  }

  return new Promise((resolve) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(undefined);
    request.onblocked = () => resolve(undefined);
  });
}
