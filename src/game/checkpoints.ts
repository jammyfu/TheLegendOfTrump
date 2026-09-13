export type Checkpoint = {
  schema: 1;
  id: string;
  run: string;
  createdAt: number;
  reason: "before" | "after";
  enemies: string[];
  zone: string;
  difficulty: string;
  elapsed: number;
  hp: number;
  state: Record<string, unknown>;
};

type DirectoryHandle = {
  name: string;
  queryPermission?: (options: {
    mode: "readwrite";
  }) => Promise<PermissionState>;
  getDirectoryHandle: (
    name: string,
    options?: { create?: boolean },
  ) => Promise<DirectoryHandle>;
  getFileHandle: (
    name: string,
    options?: { create?: boolean },
  ) => Promise<{
    getFile: () => Promise<File>;
    createWritable: () => Promise<{
      write: (data: Blob | string) => Promise<void>;
      close: () => Promise<void>;
      abort?: () => Promise<void>;
    }>;
  }>;
  values: () => AsyncIterable<{
    kind: string;
    name: string;
    getFile?: () => Promise<File>;
  }>;
};

declare global {
  interface Window {
    showDirectoryPicker?: (options?: {
      mode: "readwrite";
    }) => Promise<DirectoryHandle>;
  }
}

const SETTINGS_DB = "legend-save-folder";
const SETTINGS_KEY = "active-folder";
const FOLDERS = new Set(["checkpoints", "recordings"]);
const localEndpoint = "/thelegendoftrump/__local-saves";
const localMode = () =>
  !!import.meta.env?.DEV &&
  typeof location !== "undefined" &&
  ["localhost", "127.0.0.1"].includes(location.hostname);
export const usesProjectSaveFolder = localMode;
async function localRequest(path = "", body?: Blob | string) {
  const response = await fetch(
    `${localEndpoint}${path}`,
    body === undefined
      ? undefined
      : { method: "POST", headers: { "X-Legend-Save": "1" }, body },
  );
  if (!response.ok) {
    const detail = await response.json().catch(() => ({}));
    throw new Error(detail.error ?? `本地存档服务异常（${response.status}）`);
  }
  return response;
}

const database = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(SETTINGS_DB, 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore("settings", { keyPath: "id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

async function getSetting(): Promise<DirectoryHandle | null> {
  if (typeof indexedDB === "undefined") return null;
  const db = await database();
  try {
    return await new Promise((resolve, reject) => {
      const request = db
        .transaction("settings")
        .objectStore("settings")
        .get(SETTINGS_KEY);
      request.onsuccess = () =>
        resolve(
          (request.result?.handle as DirectoryHandle | undefined) ?? null,
        );
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}

async function setSetting(handle: DirectoryHandle) {
  const db = await database();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("settings", "readwrite");
      tx.objectStore("settings").put({ id: SETTINGS_KEY, handle });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

export const encodeSaveData = (value: unknown) =>
  JSON.stringify(value, (_key, item) =>
    item === undefined
      ? { $undefined: true }
      : Object.is(item, -0)
        ? { $negativeZero: true }
        : item instanceof Set
          ? { $set: [...item] }
          : item instanceof Map
            ? { $map: [...item] }
            : item,
  );
export const decodeSaveData = (source: string): unknown => {
  const decode = (item: any): any => {
    if (!item || typeof item !== "object") return item;
    if (item.$undefined === true) return undefined;
    if (item.$negativeZero === true) return -0;
    if (Array.isArray(item.$set)) return new Set(item.$set.map(decode));
    if (Array.isArray(item.$map)) return new Map(item.$map.map(decode));
    if (Array.isArray(item)) return item.map(decode);
    return Object.fromEntries(
      Object.entries(item).map(([key, value]) => [key, decode(value)]),
    );
  };
  return decode(JSON.parse(source));
};

export async function chooseSaveFolder() {
  if (localMode()) return (await (await localRequest()).json()).path as string;
  if (!window.showDirectoryPicker)
    throw new Error(
      "当前浏览器不支持本地存档文件夹，请使用最新版 Chrome 或 Edge。",
    );
  const handle = await window.showDirectoryPicker({ mode: "readwrite" });
  await setSetting(handle);
  return handle.name;
}

export async function saveFolderName() {
  if (localMode()) return (await (await localRequest()).json()).path as string;
  const handle = await getSetting();
  return handle?.name ?? null;
}

async function folder(store: string) {
  if (!FOLDERS.has(store)) throw new Error("未知存档类型");
  const handle = await getSetting();
  if (!handle) throw new Error("请先选择本地存档文件夹");
  if (
    handle.queryPermission &&
    (await handle.queryPermission({ mode: "readwrite" })) !== "granted"
  )
    throw new Error("本地存档文件夹尚未授权，请在调试面板重新选择文件夹");
  return handle.getDirectoryHandle(store, { create: true });
}

/** Append-only: each checkpoint gets an immutable, separately named local file. */
export async function appendRecord(
  value: { id: string; createdAt?: number; data?: Blob },
  store = "checkpoints",
): Promise<void> {
  if (!FOLDERS.has(store) || !/^[a-zA-Z0-9_-]+$/.test(value.id))
    throw new Error("无效存档标识");
  const filename = `${value.id}.${store === "recordings" ? (value.data ? "replay.gz" : "replay.json") : "save.json"}`;
  if (localMode()) {
    await localRequest(
      `/${store}/${filename}`,
      value.data ?? encodeSaveData(value),
    );
    return;
  }
  const parent = await folder(store);
  try {
    await parent.getFileHandle(filename);
    throw new Error("存档标识重复，未覆盖原文件");
  } catch (error) {
    if (!(error instanceof DOMException && error.name === "NotFoundError"))
      throw error;
  }
  const file = await parent.getFileHandle(filename, { create: true });
  const writable = await file.createWritable();
  try {
    await writable.write(value.data ?? encodeSaveData(value));
    await writable.close();
  } catch (error) {
    await writable.abort?.().catch(() => {});
    throw error;
  }
}

export async function listRecords<T>(store: string): Promise<T[]> {
  if (!FOLDERS.has(store)) throw new Error("未知存档类型");
  const read = async (name: string, file: Blob) =>
    name.endsWith(".replay.gz")
      ? ({ encoding: "gzip-json", data: file } as T)
      : (decodeSaveData(await file.text()) as T);
  if (localMode()) {
    const names = (await (await localRequest(`/${store}`)).json()) as string[];
    return Promise.all(
      names.map(async (name) =>
        read(name, await (await localRequest(`/${store}/${name}`)).blob()),
      ),
    );
  }
  const parent = await folder(store);
  const values: T[] = [];
  for await (const entry of parent.values()) {
    if (entry.kind !== "file" || !entry.getFile) continue;
    const file = await entry.getFile();
    if (!file.size) continue; // An interrupted new file is never a usable save.
    if (store === "recordings" && file.name.endsWith(".replay.gz"))
      values.push({ encoding: "gzip-json", data: file } as T);
    else if (store === "recordings" && file.name.endsWith(".replay.json"))
      values.push(decodeSaveData(await file.text()) as T);
    else if (store === "checkpoints" && file.name.endsWith(".save.json"))
      values.push(decodeSaveData(await file.text()) as T);
  }
  return values;
}

export const appendCheckpoint = (value: Checkpoint) => appendRecord(value);
export const listCheckpoints = async () =>
  (await listRecords<Checkpoint>("checkpoints")).sort(
    (a, b) => b.createdAt - a.createdAt,
  );
export const checkpointId = () =>
  globalThis.crypto?.randomUUID?.() ??
  `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
