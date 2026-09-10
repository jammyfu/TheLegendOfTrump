import { EndingReward } from "./components/EndingReward";
import { t } from "./game/i18n";
import { PICKUP_LABELS } from "./game/pickup";
import './components/PickupPresentation.css';
import { uiClickFeedback, uiPointerFeedback } from "./game/uiFeedback";
import { SettingsPanel } from "./components/SettingsPanel";
import { getAudioSettings } from "./game/audioSettings";
import { getLanguage, subscribeLanguage } from "./game/i18n";
import { syncSeoMetadata } from "./game/seo";
import {
  Component,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { Scene } from "./components/Scene";
import { Hud } from "./components/Hud";
import { TitleScreen } from "./components/TitleScreen";
import { GameLoading } from "./components/GameLoading";
import { failLoading, getLoadingState } from "./game/loading";
import { setZoneLoading } from "./game/zoneLoading";
import { Crest, GameIcon } from "./components/Icons";
import { game } from "./game/simulation";
import { bindInput, clearInput } from "./game/input";
import { setAudio, unlockAudio } from "./game/audio";
class SceneError extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error) {
    setZoneLoading(null);
    failLoading(error.message);
  }
  render() {
    // During startup GameLoading owns the error/retry UI. Avoid placing the
    // legacy render-error layer over its button; retain it for runtime faults.
    if (this.state.failed && getLoadingState().active) return null;
    return this.state.failed ? (
      <div className="render-error">
        <h2>{t("无法启动 3D 场景")}</h2>
        <p>{t("请启用浏览器硬件加速，然后重新加载。")}</p>
        <button className="primary" onClick={() => location.reload()}>
          {t("重新加载")}
        </button>
      </div>
    ) : (
      this.props.children
    );
  }
}
export default function App() {
  const [, render] = useState(0);
  const [settings, setSettings] = useState(false);
  const [help, setHelp] = useState(false);
  const sound = getAudioSettings().enabled;
  const language = useSyncExternalStore(subscribeLanguage, getLanguage);
  useEffect(() => {
    document.documentElement.lang = language === "zh" ? "zh-CN" : language;
    syncSeoMetadata(language);
  }, [language]);
  useEffect(() => {
    game.launchDebug();
    const unbind = bindInput();
    const activateAudio = () => unlockAudio();
    window.addEventListener("pointerdown", activateAudio, { once: true });
    window.addEventListener("keydown", activateAudio, { once: true });
    const tick = setInterval(() => render((n) => n + 1), 80);
    return () => {
      unbind();
      window.removeEventListener("pointerdown", activateAudio);
      window.removeEventListener("keydown", activateAudio);
      clearInterval(tick);
    };
  }, []);
  useEffect(() => {
    if (!help && !settings) return;
    clearInput();
    const block = (e: KeyboardEvent) => {
      e.stopImmediatePropagation();
      if (e.code === "Escape") {
        e.preventDefault();
        setHelp(false);
        setSettings(false);
      }
    };
    window.addEventListener("keydown", block, true);
    return () => window.removeEventListener("keydown", block, true);
  }, [help, settings]);
  const start = () => {
    unlockAudio();
    clearInput();
    game.beginIntro();
  };
  const resume = () => {
    clearInput();
    game.pause();
  };
  const title = game.phase === "title";
  return (
    <main
      className={title ? "game title-mode" : "game"}
      onClick={(event) => uiClickFeedback(event.target, event.detail)}
      onPointerDownCapture={(event) =>
        uiPointerFeedback(event.target, event.button)
      }
      onDragStart={(event) => event.preventDefault()}
    >
      <GameLoading />
      <SceneError>
        <Scene />
      </SceneError>
      <div className="film-grain" />
      <div className="vignette" />
      {title ? (
        <TitleScreen
          onStart={start}
          onHelp={() => setHelp(true)}
          onSettings={() => setSettings(true)}
          sound={sound}
          onToggleSound={() => {
            setAudio(!sound);
          }}
        />
      ) : (
        <>
          {game.phase === "intro" && (
            <div className="intro-overlay">
              <div className="intro-location">
                <span>THE WHITE HOUSE</span>
                <strong>{t("华盛顿，哥伦比亚特区")}</strong>
              </div>
              <button onClick={() => game.skipIntro()}>
                <GameIcon name="arrow" />
                {t("跳过片头 · E")}
              </button>
            </div>
          )}
          {game.phase === "playing" && <Hud />}
          {game.phase === 'obtaining' && <div className="pickup-caption">
            <span>✦ ITEM ACQUIRED ✦</span>
            <h2>{t(PICKUP_LABELS[game.pickupItem])}</h2>
            <button onClick={()=>game.interact()}>{t('继续冒险')} · E</button>
          </div>}
          {game.phase === "paused" && (
            <div className="modal-shade">
              <section className="menu-panel">
                <span className="eyebrow">TAKE A BREATH</span>
                <h2>{t("冒险暂停")}</h2>
                <p>{t("南草坪的风，依然为你而吹。")}</p>
                <button className="secondary" onClick={() => setSettings(true)}>
                  <GameIcon name="settings" />
                  {t("设置")}
                </button>
                <button className="primary" onClick={resume}>
                  {t("继续冒险")}
                  <GameIcon name="arrow" />
                </button>
                <button className="secondary" onClick={() => setHelp(true)}>
                  <GameIcon name="book" />
                  {t("操作指南")}
                </button>
                <button
                  className="secondary"
                  onClick={() => {
                    setAudio(!sound);
                  }}
                >
                  <GameIcon name={sound ? "sound" : "mute"} />
                  {t("音效：")}
                  {sound ? t("开启") : t("关闭")}
                </button>
                <button
                  className="text-button"
                  onClick={() => {
                    game.returnToTitle();
                    clearInput();
                  }}
                >
                  {t("返回标题")}
                </button>
              </section>
            </div>
          )}
          {game.phase === "reading" && (
            <div className="modal-shade">
              <section className="menu-panel">
                <span className="eyebrow">EXPLORER NOTES</span>
                <h2>{t(game.reading.title)}</h2>
                <p>{t(game.reading.text)}</p>
                <button className="primary" onClick={() => game.interact()}>
                  {t("继续冒险")}
                  <kbd>E</kbd>
                </button>
              </section>
            </div>
          )}
          {game.phase === "dialogue" && (
            <div className="dialogue">
              <span className="eyebrow">THE OVAL OFFICE</span>
              <h2>{t("新的篇章，由你书写。")}</h2>
              <p>
                {t(
                  "南草坪的翡翠已经集齐。放下旅途的风尘，签署你的第一份冒险宣言。",
                )}
              </p>
              <button className="primary" onClick={() => game.interact()}>
                {t("签署宣言")}
                <kbd>E</kbd>
              </button>
            </div>
          )}
          {(game.phase === "won" || game.phase === "lost") && (
            <div className="modal-shade">
              <section className="menu-panel result-panel">
                <Crest />
                <span className="eyebrow">
                  {game.phase === "won" ? "CHAPTER COMPLETE" : "TRY AGAIN"}
                </span>
                <h2>
                  {game.phase === "won"
                    ? t("传奇，才刚刚开始。")
                    : t("胜负未定，再来一次。")}
                </h2>
                <p>
                  {game.phase === "won"
                    ? t("你已完成南草坪的试炼，开启白宫的新篇章。")
                    : t("避开巡逻守卫，或挥剑将它们解除。")}
                </p>
                {game.phase === "won" && game.fcUnlocked && <EndingReward />}
                <div className="result-stats">
                  <div>
                    <strong>{game.gems}</strong>
                    <span>{t("收集翡翠")}</span>
                  </div>
                  <div>
                    <strong>
                      {Math.floor(game.elapsed / 60)}:
                      {String(Math.floor(game.elapsed % 60)).padStart(2, "0")}
                    </strong>
                    <span>{t("冒险用时")}</span>
                  </div>
                </div>
                <button
                  className="primary"
                  onClick={() => {
                    if (game.phase === "lost") {
                      clearInput();
                      game.retry();
                    } else start();
                  }}
                >
                  {t(game.phase === "won" ? "开始高难度冒险" : "再冒险一次")}
                  <GameIcon name="roll" />
                </button>
                <button
                  className="text-button"
                  onClick={() => {
                    game.returnToTitle();
                    clearInput();
                  }}
                >
                  {t("返回标题")}
                </button>
              </section>
            </div>
          )}
        </>
      )}
      {settings && (
        <div className="modal-shade help-shade">
          <section
            className="menu-panel"
            role="dialog"
            aria-modal="true"
            aria-label={t("设置")}
          >
            <span className="eyebrow">SOUND OF ADVENTURE</span>
            <h2>{t("设置")}</h2>
            <SettingsPanel />
            <button
              autoFocus
              className="primary"
              onClick={() => setSettings(false)}
            >
              {t("完成")}
            </button>
          </section>
        </div>
      )}
      {help && (
        <div className="modal-shade help-shade">
          <section className="menu-panel help-panel">
            <button
              className="close-button"
              aria-label={t("关闭指南")}
              onClick={() => setHelp(false)}
            >
              <GameIcon name="close" />
            </button>
            <span className="eyebrow">YOUR FIRST ADVENTURE</span>
            <h2>{t("准备好出发了吗？")}</h2>
            <p>
              {t(
                "收集 8 枚翡翠，进入白宫，在办公室书桌前签署宣言。陶罐里也藏着翡翠。",
              )}
            </p>
            <dl>
              {[
                [t("WASD / 方向键"), t("按镜头方向移动")],
                [t("中键按住 / 滚轮"), t("转动视角 / 调整距离")],
                [t("左键 / J"), t("拔剑攻击")],
                [t("右键 / F"), t("举盾防御（按住）")],
                ["Space / Shift", t("跳跃 / 冲刺（按住）")],
                ["Shift + 方向 + Space", t("组合翻滚；单按跳跃键则跳跃")],
                ["E / Q", t("互动 / 锁定目标")],
                ["Esc / R", t("暂停、释放鼠标 / 镜头复位")],
              ].map(([key, label]) => (
                <div key={key}>
                  <dt>
                    <kbd>{key}</kbd>
                  </dt>
                  <dd>{label}</dd>
                </div>
              ))}
            </dl>
            <p className="help-note">
              {t(
                "桌面左键仅攻击，按住中键拖动视角，松开停止，滚轮调整距离。暂停菜单可设置视野、距离与灵敏度。手机左摇杆移动，推满自动冲刺；右半屏滑动视角，右侧四键为攻击、防御、跳跃、翻滚，翻滚需要同时输入跑步与方向，否则为普通跳跃；顶部切换锁定，防御需按住。剑盾不用时背在身后；冲刺、翻滚、攻击和格挡消耗体力；普通跳跃不消耗体力。",
              )}
            </p>
            <button className="primary" onClick={() => setHelp(false)}>
              {t("明白了")}
              <GameIcon name="arrow" />
            </button>
          </section>
        </div>
      )}
    </main>
  );
}
