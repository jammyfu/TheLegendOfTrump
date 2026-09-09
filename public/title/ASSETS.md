# Interactive title artwork

Generated with the built-in imagegen tool (no CLI fallback), using `public/title-screen.jpg` as a visual reference. Sword, shield and reference lettering preserve transparent PNG alpha. Logo and English menu lettering are separate image layers with accessible labels; Chinese menu subtitles remain live text.

## Reference lettering prompts

### wordmark.png
Reconstruct ONLY the complete gold text logo from reference on genuine transparent alpha background. Exact text THE LEGEND OF above TRUMP and MAKE AMERICA GREAT AGAIN below. Faithfully preserve the reference's bold tall medieval wedge-serif TRUMP letterforms, huge elongated T descending below other letters with three diamond cutouts, thick irregular chipped edges, engraved gold floral texture and bright antique gold. All other letters tall condensed heavy serif. Layout exactly like reference logo, no sword, shield, tapestry, shadows outside lettering or background. Wide tightly framed complete logo.

### press-start.png
Extract/recreate ONLY exact words PRESS START from reference on genuine transparent alpha background. Match original tall condensed extremely bold wedge serif engraved gold lettering, irregular slightly chipped edges, rich warm bright gold. Single straight horizontal line, tightly framed with small transparent padding. No other objects or words.

### controls.png
Create ONLY exact word CONTROLS on genuine transparent alpha background, same font treatment as PRESS START in reference: tall condensed extremely bold wedge serif antique gold letters, lightly chipped engraved gold texture. Single straight horizontal line with small transparent padding. No other objects or words.


## Prompts

### sword.png
Create a standalone game title asset matching the sword in reference: full medieval silver blade pointing straight DOWN, royal blue winged crossguard, emerald wrapped grip, violet blue pommel. Front view, centered vertical entire sword with generous transparent margin. Rich polished 3D painted fantasy game render. ONLY the sword, no shield, no letters, no background, genuinely transparent alpha background. Reconstruct obscured blade. Reference is style reference.

### shield.png
Create standalone game title asset matching shield in reference: front facing full blue kite shield, thick beveled silver rim, angular silver ornaments and red stylized bird crest, small golden crest. Rich polished 3D painted fantasy game render. Entire shield centered with transparent margin. ONLY shield, no sword, no letters, no background, genuinely transparent alpha background. Reconstruct portions hidden by text. Reference is style reference.

### background.png
Create landscape 1536x1024 background for fantasy game title screen. Use reference ONLY for the ancient tapestry background style: dark umber and bronze woven fabric, richly etched ancient symmetrical mythic figures, moss green faded threads and muted red pattern, weathered fine woven texture. Entire image is continuous textile mural, front-on, soft warm light across center, dark but visible detailed edges. NO words, NO logo, NO sword, NO shield, NO foreground objects. Restrained authentic antique surface.

## Integration
`src/components/TitleScreen.tsx` and `TitleScreen.css`: independent pointer/touch parallax, tapestry drift, animated gold lettering, equipment highlights, floating dust, accessible menu buttons and reduced-motion support.
