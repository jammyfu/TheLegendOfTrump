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

const database = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    let blocked = false;
    const request = indexedDB.open("legend-checkpoints", 2);
    request.onupgradeneeded = () => {
      for (const name of ["checkpoints", "recordings"])
        if (!request.result.objectStoreNames.contains(name))
          request.result.createObjectStore(name, { keyPath: "id" });
    };
    request.onsuccess = () => {
      if (blocked) {
        request.result.close();
        return;
      }
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
    request.onerror = () => reject(request.error);
    request.onblocked = () => {
      blocked = true;
      reject(new Error("存档数据库被其他页面阻塞"));
    };
  });

export async function appendRecord(
  value: { id: string },
  store = "checkpoints",
): Promise<void> {
  const db = await database();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(store, "readwrite");
      // add, never put: even a duplicate identifier cannot replace history.
      tx.objectStore(store).add(value);
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(tx.error ?? new Error("存档写入失败"));
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

export async function listRecords<T>(store: string): Promise<T[]> {
  const db = await database();
  try {
    return await new Promise((resolve, reject) => {
      const request = db.transaction(store).objectStore(store).getAll();
      request.onsuccess = () => resolve(request.result as T[]);
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}

export const appendCheckpoint = (value: Checkpoint) => appendRecord(value);
export const listCheckpoints = async () =>
  (await listRecords<Checkpoint>("checkpoints")).sort(
    (a, b) => b.createdAt - a.createdAt,
  );
export const checkpointId = () =>
  globalThis.crypto?.randomUUID?.() ??
  `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
