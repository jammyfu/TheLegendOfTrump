import type { Language } from "./i18n";

type SeoCopy = {
  language: string;
  title: string;
  description: string;
  keywords: string;
  name: string;
};

const copy: Record<Language, SeoCopy> = {
  zh: {
    language: "zh-CN",
    title: "AI 制作的 3D 浏览器动作冒险｜The Legend of Trump",
    description:
      "AI 协作开发的 3D 浏览器动作冒险：探索白宫庄园，体验空手蓄力重拳、耐力格挡、剑盾弓箭与 Boss 战。支持 5 种语言，无需下载。",
    keywords:
      "AI做的游戏,AI制作游戏,AI协作开发,AI游戏开发,AI辅助游戏开发,3D浏览器游戏,WebGL动作冒险,空手蓄力重拳,耐力格挡,白宫奇遇记",
    name: "The Legend of Trump · 白宫奇遇记",
  },
  "zh-HK": {
    language: "zh-HK",
    title: "AI 製作的 3D 瀏覽器動作冒險｜The Legend of Trump",
    description:
      "AI 協作開發的 3D 瀏覽器動作冒險：探索白宮莊園，體驗空手蓄力重拳、耐力格擋、劍盾弓箭與 Boss 戰。支援 5 種語言，毋須下載。",
    keywords:
      "AI製作遊戲,AI協作開發,AI遊戲開發,AI輔助遊戲開發,3D瀏覽器遊戲,WebGL動作冒險,空手蓄力重拳,耐力格擋,白宮奇遇記",
    name: "The Legend of Trump · 白宮奇遇記",
  },
  en: {
    language: "en",
    title: "AI-Assisted 3D Browser Action Adventure | The Legend of Trump",
    description:
      "An AI-assisted 3D browser action-adventure with unarmed charged punches, stamina guarding, sword, shield, bow and a boss encounter—no download required.",
    keywords:
      "AI-made game,AI-assisted game development,AI game development,3D browser game,WebGL action adventure,charged punch,stamina guard,React Three Fiber game",
    name: "The Legend of Trump · A White House Adventure",
  },
  ja: {
    language: "ja",
    title: "AI協働開発の3Dブラウザアクションアドベンチャー｜The Legend of Trump",
    description:
      "AI協働開発による3Dブラウザアクションアドベンチャー。素手の溜め重拳、スタミナガード、剣・盾・弓、Boss戦をダウンロード不要で遊べます。",
    keywords:
      "AIで作ったゲーム,AIゲーム開発,AI協働開発,ブラウザ3Dゲーム,WebGLアクションアドベンチャー,溜め重拳,スタミナガード",
    name: "The Legend of Trump · ホワイトハウスの冒険",
  },
  ko: {
    language: "ko",
    title: "AI 협업 개발 3D 브라우저 액션 어드벤처 | The Legend of Trump",
    description:
      "AI 협업 개발 3D 브라우저 액션 어드벤처입니다. 맨손 강펀치 충전, 스태미나 방어, 검·방패·활과 Boss 전투를 다운로드 없이 즐길 수 있습니다.",
    keywords:
      "AI로 만든 게임,AI 게임 개발,AI 협업 개발,브라우저 3D 게임,WebGL 액션 어드벤처,강펀치 충전,스태미나 방어",
    name: "The Legend of Trump · 백악관 모험",
  },
};

function setMeta(selector: string, value: string) {
  const element = document.querySelector<HTMLMetaElement>(selector);
  if (element) element.content = value;
}

/** Keeps share snippets accurate when a player changes the in-game language. */
export function syncSeoMetadata(language: Language) {
  const next = copy[language];
  document.title = next.title;
  setMeta('meta[name="description"]', next.description);
  setMeta('meta[name="keywords"]', next.keywords);
  setMeta('meta[property="og:title"]', next.title);
  setMeta('meta[property="og:description"]', next.description);
  setMeta('meta[name="twitter:title"]', next.title);
  setMeta('meta[name="twitter:description"]', next.description);
  setMeta('meta[property="og:locale"]', next.language.replace("-", "_"));

  const schema = document.querySelector<HTMLScriptElement>("#game-schema");
  if (!schema?.textContent) return;
  try {
    const structuredData = JSON.parse(schema.textContent) as Record<string, unknown>;
    structuredData.name = next.name;
    structuredData.description = next.description;
    structuredData.inLanguage = next.language;
    structuredData.keywords = next.keywords;
    schema.textContent = JSON.stringify(structuredData);
  } catch {
    // Metadata remains useful even if a host rewrites the optional schema block.
  }
}
