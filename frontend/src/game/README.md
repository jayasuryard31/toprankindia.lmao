# TopRankIndia — In-City Game Layer

Third-person playable layer that runs **inside the exact same `ThreeCityEngine`
scene** used by the map. Nothing here forks the city — the player walks the same
districts, roads, ranked landmarks, coastline and harbor the map renders.

```
src/game/
  characters/
    loadCharacter.js        # GLTF-ready character adapter (procedural fallback now)
    player/PlayerModel.js    # procedural low-poly humanoid + walk/run/idle poses
    npcs/                    # (reserved — NPC crowds live in map/three/cityProps for now)
    models/                  # drop .glb files here later
    animations/              # (reserved)
  world/
    VacantPlots.js           # fenced "available land" markers on undeveloped lots
    buildings/ vehicles/ props/ trees/ roads/ harbor/ ships/   # (reserved)
  systems/
    movement/PlayerController.js   # camera-relative move, accel, gravity, jump, crouch, collision
    camera/ThirdPersonCamera.js    # damped follow cam, pointer-lock look, wall push-in
    interaction/InteractionSystem.js # nearest ranked landmark / vacant plot
    traffic/ npc/ multiplayer/ audio/   # (reserved — architecture stubs)
  GameController.js          # orchestrator: cinematic enter, per-frame update, exit
  components/
    GameMode.jsx             # React host: input, pointer lock, HUD wiring
    GameHUD.jsx              # minimal HUD (district / online / hints / minimap)
    GameMinimap.jsx          # bottom-right radar
    LandmarkPrompt.jsx       # "[E] View Details" + landmark / plot panel
    EnterCityButton.jsx      # the "Enter City" CTA
```

## Extending later
- **Real models**: implement the `loadCharacter(url)` contract with `GLTFLoader`
  (`{ group, update(dt, {state,speed}), dispose() }`) — gameplay code is untouched.
- **NPCs / traffic lights / audio / multiplayer**: each has a reserved `systems/`
  folder. `GameController.update()` is the single per-frame entry point to add them.
- **Multiplayer**: `systems/multiplayer/` — add a WS client that feeds remote
  player transforms into a pooled avatar list rendered in the same scene.
