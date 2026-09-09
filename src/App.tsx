import { Component, useEffect, useState, type ReactNode } from "react";
import { Scene } from "./components/Scene";
import { Hud } from "./components/Hud";
import { Crest } from "./components/Icons";
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
  render() {
    return this.state.failed ? (
      <div className="render-error">
        <h2>无法启动 3D 场景</h2>
        <p>请启用浏览器硬件加速，然后重新加载。</p>
        <button className="primary" onClick={() => location.reload()}>
          重新加载
        </button>
      </div>
    ) : (
      this.props.children
    );
  }
}
export default function App() {
  const [, render] = useState(0);
  const [help, setHelp] = useState(false),
    [sound, setSound] = useState(true);
  useEffect(() => {
    const unbind = bindInput();
    const tick = setInterval(() => render((n) => n + 1), 80);
    return () => {
      unbind();
      clearInterval(tick);
    };
  }, []);
  useEffect(() => {
    if (!help) return;
    clearInput();
    const block = (e: KeyboardEvent) => {
      e.stopImmediatePropagation();
      if (e.code === "Escape") {
        e.preventDefault();
        setHelp(false);
      }
    };
    window.addEventListener("keydown", block, true);
    return () => window.removeEventListener("keydown", block, true);
  }, [help]);
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
    <main className={title ? "game title-mode" : "game"}>
      <SceneError>
        <Scene />
      </SceneError>
      <div className="film-grain" />
      <div className="vignette" />
      {title ? (
        <section className="reference-title" aria-label="游戏标题画面">
          <h1 className="sr-only">TRUMP</h1>
          <div className="reference-title-image">
            <img
              src={import.meta.env.BASE_URL + "title-screen.jpg"}
              alt="The Legend of Trump：金色标题、蓝色盾牌与宝剑，深褐色古典纹理背景"
            />
            <button
              className="reference-start"
              aria-label="开始冒险"
              onClick={start}
            >
              <span className="sr-only">PRESS START · 开始冒险</span>
            </button>
            <button className="reference-help" onClick={() => setHelp(true)}>
              操作指南 · CONTROLS
            </button>
          </div>
          <button
            className="reference-audio small-button"
            onClick={() => {
              setSound(!sound);
              setAudio(!sound);
            }}
            aria-label={sound ? "关闭音效" : "打开音效"}
          >
            {sound ? "♪" : "♩"}
          </button>
          <p className="reference-caption">REACT + THREE.JS · 可玩重制版</p>
        </section>
      ) : (
        <>
          {game.phase === "intro" && (
            <div className="intro-overlay">
              <div className="intro-location">
                <span>THE WHITE HOUSE</span>
                <strong>华盛顿，哥伦比亚特区</strong>
              </div>
              <button onClick={() => game.skipIntro()}>跳过片头 · E</button>
            </div>
          )}
          {game.phase === "playing" && <Hud />}
          {game.phase === "paused" && (
            <div className="modal-shade">
              <section className="menu-panel">
                <span className="eyebrow">TAKE A BREATH</span>
                <h2>冒险暂停</h2>
                <p>南草坪的风，依然为你而吹。</p>
                <button className="primary" onClick={resume}>
                  继续冒险 <span>→</span>
                </button>
                <button className="secondary" onClick={() => setHelp(true)}>
                  操作指南
                </button>
                <button
                  className="secondary"
                  onClick={() => {
                    setSound(!sound);
                    setAudio(!sound);
                  }}
                >
                  音效：{sound ? "开启" : "关闭"}
                </button>
                <button
                  className="text-button"
                  onClick={() => {
                    game.returnToTitle();
                    clearInput();
                  }}
                >
                  返回标题
                </button>
              </section>
            </div>
          )}
          {game.phase === "dialogue" && (
            <div className="dialogue">
              <span className="eyebrow">THE OVAL OFFICE</span>
              <h2>新的篇章，由你书写。</h2>
              <p>
                南草坪的翡翠已经集齐。放下旅途的风尘，签署你的第一份冒险宣言。
              </p>
              <button className="primary" onClick={() => game.interact()}>
                签署宣言 <kbd>E</kbd>
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
                    ? "传奇，才刚刚开始。"
                    : "胜负未定，再来一次。"}
                </h2>
                <p>
                  {game.phase === "won"
                    ? "你已完成南草坪的试炼，开启白宫的新篇章。"
                    : "避开巡逻守卫，或挥剑将它们解除。"}
                </p>
                <div className="result-stats">
                  <div>
                    <strong>{game.gems}</strong>
                    <span>收集翡翠</span>
                  </div>
                  <div>
                    <strong>
                      {Math.floor(game.elapsed / 60)}:
                      {String(Math.floor(game.elapsed % 60)).padStart(2, "0")}
                    </strong>
                    <span>冒险用时</span>
                  </div>
                </div>
                <button className="primary" onClick={start}>
                  再冒险一次 <span>↻</span>
                </button>
                <button
                  className="text-button"
                  onClick={() => {
                    game.returnToTitle();
                    clearInput();
                  }}
                >
                  返回标题
                </button>
              </section>
            </div>
          )}
        </>
      )}
      {help && (
        <div className="modal-shade help-shade">
          <section className="menu-panel help-panel">
            <button
              className="close-button"
              aria-label="关闭指南"
              onClick={() => setHelp(false)}
            >
              ×
            </button>
            <span className="eyebrow">YOUR FIRST ADVENTURE</span>
            <h2>准备好出发了吗？</h2>
            <p>
              收集 8
              枚翡翠，进入白宫，在办公室书桌前签署宣言。陶罐里也藏着翡翠。
            </p>
            <dl>
              <div>
                <dt>
                  <kbd>W A S D</kbd> / 方向键
                </dt>
                <dd>移动角色</dd>
              </div>
              <div>
                <dt>
                  <kbd>SHIFT</kbd>
                </dt>
                <dd>按住奔跑</dd>
              </div>
              <div>
                <dt>
                  <kbd>SPACE</kbd> / <kbd>J</kbd>
                </dt>
                <dd>挥剑 · 击碎陶罐 / 解除守卫</dd>
              </div>
              <div>
                <dt>
                  <kbd>E</kbd>
                </dt>
                <dd>进入大门 / 与书桌交互</dd>
              </div>
              <div>
                <dt>
                  鼠标拖拽 / <kbd>R</kbd>
                </dt>
                <dd>环绕视角 / 视角复位</dd>
              </div>
              <div>
                <dt>
                  <kbd>ESC</kbd>
                </dt>
                <dd>暂停或继续</dd>
              </div>
            </dl>
            <p className="help-note">
              手机 /
              平板：左侧摇杆移动，右侧按钮挥剑与交互。三颗爱心耗尽后可重新开始。
            </p>
            <button className="primary" onClick={() => setHelp(false)}>
              明白了 <span>→</span>
            </button>
          </section>
        </div>
      )}
    </main>
  );
}
