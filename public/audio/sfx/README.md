# Adventure combat recordings

All source packs list CC0. Edited clips are mono 44.1 kHz MP3 at 96 kbps,
filtered with short fades. Runtime normalization is capped at 3× to avoid raising
recording noise. Per-event gains and a shared compressor preserve mix headroom;
samples share the existing effects volume/mute bus.

| Files | Original recording | Author and source | Edit |
| --- | --- | --- | --- |
| sword-1/2/3.mp3 | Katana Swing.wav | Ben Jaszczak & Brian Nelson — https://opengameart.org/content/medieval-sound-effects-weapon-textures | 4.48, 5.72, 7.90 seconds; 0.36 s takes; +6/+2/0 dB |
| swish-light-1/2.mp3, swish-heavy-1/2.mp3 | Swishes Sound Pack | artisticdude — https://opengameart.org/content/swishes-sound-pack | CC0 takes 1/5 and 7/9; mono 44.1 kHz MP3, high-pass filtered and faded for normal swings and charged spin release. |
| arrow-1/2.mp3 | English Longbow Shoot.wav | Same CC0 weapon textures pack | 0–0.3 s and 0.44–0.72 s |
| bow-draw.mp3 | English Longbow Draw.wav | Same CC0 weapon textures pack | 2.56–3.26 s, +16 dB, 150–6500 Hz |
| roll-1/2.mp3 | cloth1.ogg, cloth2.ogg | Kenney — https://kenney.nl/assets/rpg-audio | First 0.55 s; clothing movement for dodge |
| hit.mp3 | chop.ogg | Kenney — same RPG Audio pack | Legacy, no longer mapped to combat |
| block.mp3 | sword-knife-clash-01.wav | Vehicle / Jan Schupke — https://opengameart.org/content/fantasy-weapons-and-apparel-sfx-library | First 0.8 s |
| body-1/2.mp3 | dropLeather.ogg, bookPlace2.ogg | Kenney — same RPG Audio pack | 0.24/0.22 s, low-pass 1100 Hz; muted body impact Foley |
| armor.mp3 | metalPot1.ogg | Kenney — same RPG Audio pack | 0.26 s, low-pass 2400 Hz; quiet armor contact layer |
| break-wood.mp3 | chop.ogg | Kenney — same RPG Audio pack | 0.35 s; breakable props only |
| coin-1/2.mp3 | handleCoins.ogg, handleCoins2.ogg | Kenney — same RPG Audio pack | 0.5 s |
| door-open.mp3, chest.mp3, latch.mp3 | doorOpen_1.ogg, creak1.ogg, metalLatch.ogg | Kenney — same RPG Audio pack | 0.8/0.65/0.35 s; chest layers hinge and latch |
| equip.mp3 | drawKnife1.ogg | Kenney — same RPG Audio pack | 0.45 s |
| step-1/2.mp3 | footstep00.ogg, footstep02.ogg | Kenney — same RPG Audio pack | 0.25 s |
| jump.mp3, land.mp3, heal.mp3 | cloth3.ogg, dropLeather.ogg, clothBelt.ogg | Kenney — same RPG Audio pack | 0.35/0.35/0.4 s; motion, landing and pouch handling |

License: https://creativecommons.org/publicdomain/zero/1.0/
Kenney's original license is included as `Kenney-License.txt`.
The large source archives were kept outside the game; only these selected clips
are loaded. Missing assets retain the original synthesized combat fallback.

Boss cues layer these clips with short procedural synthesis so attacks are
recognizable before impact: high metallic ascent and release for dart volleys,
three sub pulses then a low hit for the hammer, a broad air cut for the sweep,
and a resonant expanding tone for the shockwave. Summoning uses a rising portal
chord and defeat resolves downward. These cues are synthesized at runtime and
therefore add no download weight.

Playback: alternate takes without immediate repeats; 20-voice ceiling and event
debouncing; damage/defense may replace quiet crowd voices. Bow draw and delayed
spin sounds fade when canceled. Swing sound follows the strike timeline; contact
sounds require an actual hit. Footsteps follow ground travel, and landings fire
once per descent. Combat action buttons do not add a second UI beep.
Charging uses a restrained rising procedural loop, a three-tone ready cue at
full charge, and the heavy swish release; this provides anticipation, confirmation
and payoff without copying any proprietary game's recordings. Summon, defeat and
completion use quiet sine-note cues rather than sharp triangle beeps. Rotor audio
fades with flight and releases nodes after departure.
