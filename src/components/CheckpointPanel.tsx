import { useEffect, useRef, useState } from "react";
import { game } from "../game/simulation";
import { clearInput, releaseMouse } from "../game/input";
import {
  chooseSaveFolder,
  listCheckpoints,
  saveFolderName,
  type Checkpoint,
} from "../game/checkpoints";
import {
  recorder,
  recordingFrameCount,
  type RecordingChunk,
} from "../game/recording";
import "./CheckpointPanel.css";

export function CheckpointPanel() {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [saves, setSaves] = useState<Checkpoint[]>([]);
  const [chunks, setChunks] = useState<RecordingChunk[]>([]);
  const [folder, setFolder] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [, render] = useState(0);
  const refresh = async () => {
    setBusy(true);
    setError("");
    try {
      const [s, r, selectedFolder] = await Promise.all([
        listCheckpoints(),
        recorder?.list() ?? [],
        saveFolderName(),
      ]);
      setSaves(s);
      setChunks(r);
      setFolder(selectedFolder);
    } catch {
      setError("无法读取本地存档文件夹，请重新选择并授权文件夹。");
    } finally {
      setBusy(false);
    }
  };
  const close = () => {
    dialog.current?.close();
    setOpen(false);
    clearInput();
  };
  const show = () => {
    if (recorder?.playing) recorder.stop();
    clearInput();
    releaseMouse();
    if (game.phase === "playing" || game.phase === "obtaining") game.pause();
    setOpen(true);
    void refresh();
  };
  useEffect(() => {
    if (open) dialog.current?.showModal();
  }, [open]);
  useEffect(() => {
    const timer = setInterval(() => render((n) => n + 1), 200);
    const key = (event: KeyboardEvent) => {
      if (event.code === "F8") {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (event.type === "keydown" && !event.repeat) open ? close() : show();
        return;
      }
      if (!open && !recorder?.playing) return;
      event.stopImmediatePropagation();
      if (event.code === "Escape") {
        event.preventDefault();
        if (open) close();
        else recorder?.stop();
      }
    };
    window.addEventListener("keydown", key, true);
    window.addEventListener("keyup", key, true);
    return () => {
      clearInterval(timer);
      window.removeEventListener("keydown", key, true);
      window.removeEventListener("keyup", key, true);
    };
  }, [open]);
  const sessions = [
    ...new Set(
      chunks.sort((a, b) => b.createdAt - a.createdAt).map((c) => c.session),
    ),
  ];
  return (
    <>
      <button className="checkpoint-toggle" onClick={show}>
        DEBUG · 存档 / 回放 · F8
      </button>
      {recorder?.playing && (
        <div className="checkpoint-replay-shield">
          <div className="checkpoint-playback">
            <span>
              回放 {recorder.position.toFixed(1)} /{" "}
              {recorder.duration.toFixed(1)} 秒
            </span>
            <button
              onClick={() => {
                if (recorder) recorder.paused = !recorder.paused;
              }}
            >
              {" "}
              {recorder.paused ? "播放" : "暂停"}{" "}
            </button>
            <button
              onClick={() => {
                recorder?.stop();
                clearInput();
              }}
            >
              退出回放
            </button>
          </div>
        </div>
      )}
      <dialog
        ref={dialog}
        className="checkpoint-panel"
        onCancel={(e) => {
          e.preventDefault();
          close();
        }}
      >
        <header>
          <h2>存档与操作回放</h2>
          <button onClick={close}>关闭</button>
        </header>
        <p>
          文件保存在所选本地文件夹的 checkpoints / recordings
          子目录中。浏览器只保存文件夹授权；旧记录不会覆盖。加载后暂停，按 Esc
          继续。
        </p>
        <p>
          操作记录每 5
          秒追加保存；回放包含输入和状态变化，不是视频。强制关闭页面可能丢失最后
          5 秒。
        </p>
        <p role="status">
          {error || recorder?.status || game.checkpointStatus}
        </p>
        <button disabled={busy} onClick={() => void refresh()}>
          {busy ? "读取中…" : "刷新记录"}
        </button>
        <button
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError("");
            try {
              setFolder(await chooseSaveFolder());
              await refresh();
            } catch (e) {
              setError(e instanceof Error ? e.message : "选择存档文件夹失败");
            } finally {
              setBusy(false);
            }
          }}
        >
          {folder ? `更改存档文件夹（${folder}）` : "选择本地存档文件夹"}
        </button>
        <h3>存档（{saves.length}）</h3>
        {!saves.length && <p>暂无存档，接近敌人后自动生成。</p>}
        <ul>
          {saves.map((save) => (
            <li key={save.id}>
              <span>
                {new Date(save.createdAt).toLocaleString()} ·{" "}
                {save.reason === "before" ? "接敌前" : "击败后"} ·{" "}
                {save.enemies.join("、")}
                <small>
                  {save.zone} · {save.difficulty} · ♥ {save.hp} ·{" "}
                  {save.elapsed.toFixed(1)}s
                </small>
              </span>
              <button
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await recorder?.flush();
                    clearInput();
                    game.loadCheckpoint(save);
                    close();
                  } catch (e) {
                    setError(e instanceof Error ? e.message : "读档失败");
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                加载
              </button>
            </li>
          ))}
        </ul>
        <h3>操作记录（{sessions.length}）</h3>
        <ul>
          {sessions.map((session) => {
            const parts = chunks.filter((c) => c.session === session);
            return (
              <li key={session}>
                <span>
                  {new Date(
                    Math.min(...parts.map((c) => c.createdAt)),
                  ).toLocaleString()}
                  <small>
                    {parts.reduce((n, c) => n + recordingFrameCount(c), 0)} 帧 ·{" "}
                    {parts.length} 段
                  </small>
                </span>
                <button
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      clearInput();
                      await recorder?.play(parts);
                      dialog.current?.close();
                      setOpen(false);
                    } catch (e) {
                      setError(e instanceof Error ? e.message : "回放失败");
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  回放
                </button>
              </li>
            );
          })}
        </ul>
      </dialog>
    </>
  );
}
