import {test,expect} from '@playwright/test';
test('real failure audio decodes, continues into loss menu and stops on retry in both presets',async({page})=>{
 await page.route('**/music-harness',route=>route.fulfill({contentType:'text/html',body:'<title>Music test</title>'}));
 await page.goto('/music-harness');
 const result=await page.evaluate(async()=>{
  const voices:HTMLAudioElement[]=[];const RealAudio=window.Audio;
  window.Audio=class extends RealAudio{constructor(src?:string){super(src);this.muted=true;voices.push(this);}};
  const url='/src/game/music.ts';const music=await import(url);
  const settingsUrl='/src/game/audioSettings.ts';const settings=await import(settingsUrl);
  settings.saveAudioSettings({enabled:true,music:1});
  const wait=async(test:()=>boolean)=>{for(let i=0;i<150;i++){if(test())return;await new Promise(r=>setTimeout(r,100));}throw new Error('Audio did not begin playback');};
  const outcomes=[];
  for(const preset of ['ocarina','suno']){
   music.setMusicSource(preset);music.musicEnabled(true);music.musicPhase('dying');music.unlockMusic();
   await wait(()=>voices.some(a=>a.src.endsWith('/defeat.m4a')&&!a.paused&&a.currentTime>.7&&a.volume>.01));
   const a=voices.findLast(a=>a.src.endsWith('/defeat.m4a'))!;
   const before=a.currentTime;music.musicPhase('lost');await new Promise(r=>setTimeout(r,250));
   const continues=a.currentTime>before;
   music.musicPhase('playing');await new Promise(r=>setTimeout(r,100));
   outcomes.push({preset,continues,stopped:a.paused,reset:a.currentTime,duration:a.duration,error:a.error?.message});
   music.musicPhase('won',true);
   await wait(()=>voices.some(v=>v.src.endsWith('/victory.m4a')&&!v.paused&&v.currentTime>.7&&v.volume>.01));
   const victory=voices.findLast(v=>v.src.endsWith('/victory.m4a'))!;
   const winBefore=victory.currentTime;music.musicPhase('won',false);
   await new Promise(r=>setTimeout(r,250));
   const winContinues=victory.currentTime>winBefore;
   music.musicPhase('title');await new Promise(r=>setTimeout(r,100));
   outcomes.push({preset,continues:winContinues,stopped:victory.paused,reset:victory.currentTime,duration:victory.duration,error:victory.error?.message});
  }
  music.musicEnabled(false);return outcomes;
 });
 for(const r of result){expect(r.continues).toBe(true);expect(r.stopped).toBe(true);expect(r.reset).toBe(0);expect(r.duration).toBeGreaterThan(120);expect(r.error).toBeUndefined();}
});
