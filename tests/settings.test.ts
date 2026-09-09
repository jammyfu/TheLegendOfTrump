import test from "node:test";
import assert from "node:assert/strict";
import {
  getLanguage,
  setLanguage,
  subscribeLanguage,
  t,
} from "../src/game/i18n";
import {
  sanitizeAudio,
  saveAudioSettings,
  getAudioSettings,
} from "../src/game/audioSettings";
import translations from "../src/game/translations.json";
test("all language catalogs are complete and switch synchronously", () => {
  for (const values of Object.values(translations)) {
    assert.equal(values.length, 3);
    assert.ok(values.every((v) => v.trim().length > 0));
  }
  let updates = 0;
  const off = subscribeLanguage(() => updates++);
  for (const [language, expected] of [
    ["zh", "设置"],
    ["en", "Settings"],
    ["ja", "設定"],
    ["ko", "설정"],
  ] as const) {
    setLanguage(language);
    assert.equal(getLanguage(), language);
    assert.equal(t("设置"), expected);
  }
  assert.equal(updates, 4);
  off();
  setLanguage("zh");
  assert.equal(updates, 4);
});
test("dynamic gem and health messages retain values", () => {
  setLanguage("en");
  assert.equal(t("还需要 5 枚翡翠"), "Need 5 more gems");
  assert.equal(t("生命值 2 / 3"), "Health 2 / 3");
  assert.equal(t("Title Theme"), "Title Theme");
  setLanguage("zh");
});
test("volume settings clamp safely and music and effects stay independent", () => {
  assert.deepEqual(sanitizeAudio({ music: -1, effects: 3 }), {
    enabled: true,
    music: 0,
    effects: 1,
  });
  assert.equal(sanitizeAudio({ music: NaN }).music, 1);
  saveAudioSettings({ enabled: false, music: 0.25, effects: 0.8 });
  saveAudioSettings({ music: 0 });
  assert.deepEqual(getAudioSettings(), {
    enabled: false,
    music: 0,
    effects: 0.8,
  });
  saveAudioSettings({ enabled: true, music: 1, effects: 1 });
});
