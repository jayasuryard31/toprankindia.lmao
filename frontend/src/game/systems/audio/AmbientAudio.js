/**
 * AmbientAudio - reserved extension point (not wired this build).
 *
 * WebAudio-only (the artifact/CSP context blocks external audio files), so
 * ambience is synthesised: filtered noise beds for wind / ocean / city hum,
 * short click-trains for footsteps, doppler-ish panning for passing cars.
 *
 *   const audio = new AmbientAudio(listener /* THREE.AudioListener *\/);
 *   audio.setZone("harbor" | "downtown" | "residential" | "park")  // crossfade beds
 *   audio.footstep(surface, speed)
 *   audio.dispose()
 *
 * Attach a THREE.AudioListener to the game camera and PositionalAudio to the
 * harbor / fountain / busy intersections for spatialisation.
 */
export class AmbientAudio {
  constructor() {
    this.enabled = false;
  }
  setZone() {}
  footstep() {}
  dispose() {}
}
