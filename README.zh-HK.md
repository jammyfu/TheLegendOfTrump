# The Legend of Trump · 白宮奇遇記

[简体中文](README.md) · [繁體中文（香港）](README.zh-HK.md) · [English](README.en.md) · [日本語](README.ja.md) · [한국어](README.ko.md)

基於 **React 19、Three.js、React Three Fiber、TypeScript 與 Vite** 的低多邊形第三人稱冒險遊戲。角色、裝備與場景均為獨立重建資產；這是非官方獨立作品，不包含參考影片或原作模型。

![標題畫面](artifacts/title-fairies-desktop.png)

## 啟動

需要 Node.js 22.12+ 與支援 WebGL 2 的現代瀏覽器。

```bash
npm ci
npm run dev
npm run build
npm test
```

終端會輸出本機網址。`dist/` 可直接部署為靜態網站，無需後端。

## 玩法

收集 8 枚翡翠、進入白宮、擊敗鐵甲統領，再前往書桌完成章節。普通守衛會預警攻擊；可以正面舉盾格擋、翻滾離開，或跳過危險。Boss 的橫掃、重砸與衝擊波分別對應格擋、翻滾與跳躍；半血後會加速並召喚守衛。

寶箱提供劍盾、弓與箭矢。三段劍擊、蓄力旋轉斬、拉弓射擊、鎖定目標與體力管理均支援桌面及觸控操作。暫停或失焦會暫停模擬；進度只保存於本次會話。

![劍盾與移動](artifacts/adventure-equipment-back.png)
![橢圓辦公室 Boss 戰](artifacts/oval-boss-arena.png)

| 操作 | 鍵位 |
| --- | --- |
| 移動 / 視角 | WASD 或方向鍵 / 滑鼠或中鍵拖動 |
| 跳躍 / 翻滾 | Space / Shift + 方向 |
| 攻擊 / 格擋或瞄準 | 左鍵或 J / 右鍵或 F |
| 鎖定 / 切換武器 / 互動 | Q / X / E |
| 暫停 / 重置鏡頭 | Esc / R |

手機端使用左搖桿移動、右側滑動視角與螢幕按鈕。標題頁或暫停選單可切換简体中文、English、日本語、한국어，並調整音量和鏡頭。

## 專案與驗證

`src/game/` 包含移動、碰撞、戰鬥、AI、音訊與任務狀態；`src/components/` 包含 Three.js 場景、角色、敵人、HUD 與選單；`assets/blender/` 保存可重新生成的 Blender 資產。

```bash
npm test
npm run build
GAME_URL=http://127.0.0.1:4439 npm run test:e2e
```

測試覆蓋核心模擬、觸控輸入、戰鬥、Boss、碰撞與瀏覽器畫面。最新專案截圖保存在 `artifacts/`。

## 音樂

預設配樂為內置的原創生成曲目；也可在設定中選擇本機《薩爾達傳說：時之笛》曲目。曲名與來源連結見 [音訊說明](public/audio/README.md)。
