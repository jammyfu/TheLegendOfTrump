# Automatic targeting and render budget

Sword acquisition: 12 m outdoors / 18 m indoors; bow: 22 m. Candidates must be visible, generally in front of the camera; threats within 5 m also qualify behind the player. A living lock is sticky. Acquisition runs at 5 Hz, and a defeated target is replaced. Existing 30 m release hysteresis remains. Q releases for four seconds; an attack resumes assistance immediately. Tab still cycles manually.

Render changes:
- Batch static forecourt trees, lamps, flags, benches and fences by compatible material.
- Batch loaded interaction props separately from LidPivot / HandlePivot so doors and levers still animate.
- Memoize the simulation scene subtree to avoid full scene reconciliation on 80 ms HUD updates.
- Use 1024² shadow maps and cap initial DPR at 1; sustained slow frames reduce 3D DPR to 0.85 then 0.7. Eight seconds of fast frames permit gradual recovery. DOM HUD resolution is unchanged.

Controlled browser sampling: Chrome headless, SwiftShader software WebGL, 1280×720, development server, hero at (0,115), yaw 0, pitch 0.3. Each sample contains 60 animation frames; optimized sample warmed up for eight seconds to allow resolution adaptation. These are diagnostic measurements, not hardware FPS guarantees or production benchmarks.

| Metric | Before | After |
| --- | ---: | ---: |
| Draw calls / frame (including shadows) | 1222.4 | 630.7 |
| Median frame duration | 103.6 ms | 76.8 ms |
| P95 frame duration | 132.7 ms | 98.0 ms |
| Simulation update | 0.19 ms | 0.24 ms |
| Render buffer width | 1280 | 896 |

Simulation was not the bottleneck. Draw submissions fell about 48%; software frame duration improved with adaptive resolution. The tradeoff is softer 3D edges on overloaded devices, while scenery, collision and HUD remain intact. Original meshes stay hidden for reversible batching and are restored on cleanup; merged geometry is disposed on unmount.

Validation: 81 logic tests (including automatic acquisition, sticky targets, manual release, wall occlusion, bow range, indoor boss and batching/pivot cleanup); production build; browser automatic reticle/free look, jointed combo and interaction traversal checks.
