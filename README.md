# The Legend of Trump · 白宫奇遇记

[简体中文](README.md) · [繁體中文（香港）](README.zh-HK.md) · [English](README.en.md) · [日本語](README.ja.md) · [한국어](README.ko.md)

基于 **React 19、Three.js、React Three Fiber、TypeScript 与 Vite** 的低多边形第三人称冒险游戏。角色、装备与场景为独立重建资产；这是非官方独立作品，不包含参考视频或原作模型。

![标题画面](artifacts/title-fairies-desktop.png)

## 运行

需要 Node.js 22.12+ 和支持 WebGL 2 的现代浏览器。

```bash
npm ci
npm run dev
npm run build
npm test
```

终端会输出本地访问地址。`dist/` 可直接部署为静态站点，无需后端。

## 玩法

收集 8 枚翡翠，进入白宫，击败铁甲统领，再到书桌完成章节。普通守卫会预警攻击；正面举盾可格挡，翻滚或跳跃可躲开危险。Boss 的横扫、重砸与冲击波分别对应格挡、翻滚与跳跃；半血后会加速并召唤守卫。

宝箱提供剑盾、弓和箭矢。三段剑击、蓄力旋转斩、拉弓射击、锁定目标和体力管理均支持桌面与触屏操作。暂停或失焦会暂停模拟，当前进度只在本次会话中保存。

![剑盾与移动](artifacts/adventure-equipment-back.png)
![椭圆办公室 Boss 战](artifacts/oval-boss-arena.png)

| 操作 | 键位 |
| --- | --- |
| 移动 / 视角 | WASD 或方向键 / 鼠标或中键拖动 |
| 跳跃 / 翻滚 | Space / Shift + 方向 |
| 攻击 / 格挡或瞄准 | 左键或 J / 右键或 F |
| 锁定 / 切换武器 / 交互 | Q / X / E |
| 暂停 / 重置镜头 | Esc / R |

手机端使用左摇杆移动、右侧滑动视角和屏幕操作按钮。标题页或暂停菜单可切换简体中文、English、日本語、한국어，并调整音量和镜头。

## 项目与验证

`src/game/` 包含移动、碰撞、战斗、AI、音频与任务状态；`src/components/` 包含 Three.js 场景、角色、敌人、HUD 与菜单；`assets/blender/` 保存可再生成的 Blender 资产。

```bash
npm test
npm run build
GAME_URL=http://127.0.0.1:4439 npm run test:e2e
```

测试覆盖核心模拟、触屏输入、战斗、Boss、碰撞与浏览器画面。最新项目截图保存在 `artifacts/`。

## 音乐

默认配乐为项目内置的原创生成曲目；也可在设置中选择本地《塞尔达传说：时之笛》曲目。曲目与来源链接见 [音频说明](public/audio/README.md)。
