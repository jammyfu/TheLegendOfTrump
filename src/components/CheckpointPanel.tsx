import { useEffect, useRef, useState } from "react";
import { game } from "../game/simulation";
import { clearInput, releaseMouse } from "../game/input";
import { listCheckpoints, type Checkpoint } from "../game/checkpoints";
import {
  recorder,
  recordingFrameCount,
  type RecordingRecord,
} from "../game/recording";
import "./CheckpointPanel.css";

export function CheckpointPanel() {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [saves, setSaves] = useState<Checkpoint[]>([]);
  const [chunks, setChunks] = useState<RecordingRecord[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [, render] = useState(0);
  const refresh = async () => {
    setBusy(true);
    setError("");
    try {
      const [s, r] = await Promise.all([
        listCheckpoints(),
        recorder?.list() ?? [],
      ]);
      setSaves(s);
      setChunks(r);
    } catch {
      setError("无法读取本地存储，请检查浏览器权限或存储空间。");
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
          仅保存在当前浏览器。接敌前 /
          击败后独立存档，旧记录不会覆盖。加载后暂停，按 Esc 继续。
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
