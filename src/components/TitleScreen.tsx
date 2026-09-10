import { useTitleEntrance } from "./useTitleEntrance";
import { GameIcon } from "./Icons";
import { TitleMagic } from "./TitleMagic";
import { t } from "../game/i18n";
import { mobileRenderProfile } from "../game/renderQuality";
import { useEffect, useRef, useSyncExternalStore, type CSSProperties, type PointerEvent } from "react";
import { failLoading, markInterfaceReady, getLoadingState, subscribeLoading } from "../game/loading";
import "./TitleScreen.css";

type Props = {
  onStart: () => void;
  onHelp: () => void;
  onSettings: () => void;
  sound: boolean;
  onToggleSound: () => void;
};

/** Independent title layers keep the artwork responsive without rerendering the game. */
export function TitleScreen({
  onStart,
  onHelp,
  onSettings,
  sound,
  onToggleSound,
}: Props) {
  const surface = useRef<HTMLElement>(null);
  const loading = useSyncExternalStore(subscribeLoading, getLoadingState);
  useTitleEntrance(surface);
  useEffect(() => {
    const images = Array.from(surface.current?.querySelectorAll("img") ?? []);
    Promise.all([
      ...images.map((img) => img.decode()),
      document.fonts.ready,
    ]).then(() => {
      // This completion is deliberately independent of the title component's
      // lifetime. Desktop debug links can launch directly into a scene and
      // unmount this screen before font/image decoding settles; cancelling the
      // callback in that case left the startup gate permanently at "interface".
      markInterfaceReady();
    }).catch(() => {
      failLoading("Title artwork could not be loaded");
    });
  }, []);
  const base = import.meta.env.BASE_URL + "title/";
  const move = (event: PointerEvent<HTMLElement>) => {
    if (mobileRenderProfile || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width;
    const y = (event.clientY - bounds.top) / bounds.height;
    const style = surface.current?.style;
    style?.setProperty("--mx", String((x - 0.5) * 2));
    style?.setProperty("--my", String((y - 0.5) * 2));
    style?.setProperty("--light-x", `${x * 100}%`);
    style?.setProperty("--light-y", `${y * 100}%`);
  };
  const reset = () => {
    surface.current?.style.setProperty("--mx", "0");
    surface.current?.style.setProperty("--my", "0");
  };
  return (
    <section
      ref={surface}
      className="living-title"
      inert={loading.active}
      aria-label={t("游戏标题画面")}
      onPointerMove={move}
      onPointerLeave={reset}
      onPointerUp={reset}
      onPointerCancel={reset}
    >
      <div className="lt-tapestry" aria-hidden="true">
        <img src={base + "background.webp"} alt="" />
      </div>
      <div className="lt-light" aria-hidden="true" />
      <div className="lt-rays" aria-hidden="true" />
      <TitleMagic />
      <div className="lt-frame" aria-hidden="true" />
      <p className="lt-overline">AN UNLIKELY HERO. AN UNTOLD LEGEND.</p>
      <div className="lt-emblem">
        <div className="lt-halo" aria-hidden="true" />
        <div className="lt-sword" aria-hidden="true">
          <img src={base + "sword.webp"} alt="" />
        </div>
        <div className="lt-shield" aria-hidden="true">
          <img src={base + "shield.webp"} alt="" />
        </div>
        <div className="lt-wordmark">
          <h1
            className="lt-logo-art"
            aria-label="THE LEGEND OF TRUMP — MAKE AMERICA GREAT AGAIN"
            style={
              { "--letter-mask": `url("${base}wordmark.webp")` } as CSSProperties
            }
          >
            <img src={base + "wordmark.webp"} alt="" />
          </h1>
        </div>
      </div>
      <div className="lt-dust" aria-hidden="true">
        {Array.from({ length: mobileRenderProfile ? 7 : 18 }, (_, i) => (
          <i
            key={i}
            style={{
              left: `${(i * 37 + 7) % 100}%`,
              top: `${(i * 23 + 11) % 100}%`,
              animationDelay: `${-i * 1.7}s`,
              animationDuration: `${12 + (i % 7)}s`,
            }}
          />
        ))}
      </div>
      <nav className="lt-menu" aria-label={t("主菜单")}>
        <button className="lt-start" onClick={onStart}>
          <GameIcon name="spark" className="lt-diamond" />
          <span>
            <span className="lt-menu-label">{t("开始冒险")}</span>
          </span>
          <GameIcon name="spark" className="lt-diamond" />
        </button>
        <button className="lt-controls" onClick={onHelp}>
          <span className="lt-menu-label">{t("操作指南")}</span>
        </button>
      </nav>
      <footer className="lt-footer">
        <button onClick={onSettings}>
          <GameIcon name="settings" />
          <span>{t("设置")}</span>
        </button>
        <a
          className="lt-about"
          href={import.meta.env.BASE_URL + "ai-game-development.html"}
        >
          {t("AI 制作说明")}
        </a>
        <button
          onClick={onToggleSound}
          aria-label={sound ? t("关闭音效") : t("打开音效")}
          aria-pressed={sound}
        >
          <GameIcon name={sound ? "sound" : "mute"} />
          <span>{t("音效：")} {t(sound ? "开启" : "关闭")}</span>
        </button>
      </footer>
    </section>
  );
}
