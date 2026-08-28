/**
 * timeOfDay.js - the city's clock.
 *
 * Velora Harbor runs on the VIEWER'S real local time (the device clock, which
 * already carries their timezone), collapsed into three authored looks:
 *
 *   day      05:30 – 17:00   high sun, clean blue sky, lights off
 *   evening  17:00 – 20:00   low golden sun, warm haze, lights warming up
 *   night    20:00 – 05:30   moon + stars, deep blue dome, everything lit
 *
 * Every atmospheric value the engine reads (sky, sun, fog, exposure, clouds,
 * window glow, lamp output, signage brightness) comes from one preset here, so
 * the three modes stay internally consistent and are trivial to re-tune.
 */

/** "day" | "evening" | "night" for a given moment (defaults to right now). */
export function currentTimeOfDay(date = new Date()) {
  const h = date.getHours() + date.getMinutes() / 60;
  if (h >= 5.5 && h < 17) return "day";
  if (h >= 17 && h < 20) return "evening";
  return "night";
}

/**
 * How far through the current phase we are, 0 → 1. Used to drift the sun a
 * little across the phase so 6am and 4pm aren't the identical picture.
 */
export function phaseProgress(date = new Date()) {
  const h = date.getHours() + date.getMinutes() / 60;
  if (h >= 5.5 && h < 17) return (h - 5.5) / 11.5;
  if (h >= 17 && h < 20) return (h - 17) / 3;
  const n = h >= 20 ? h - 20 : h + 4; // 20:00 → 05:30 wrapped
  return n / 9.5;
}

export const TOD_PRESETS = {
  day: {
    id: "day",
    label: "Day",
    dark: false,

    // Sky dome (three/addons Sky uniforms)
    turbidity: 3.0,
    rayleigh: 2.1,
    mieCoefficient: 0.004,
    mieDirectionalG: 0.84,
    skyElevation: 46,
    skyAzimuth: 122,

    // Key light. `sunElevation` also drives shadow length.
    sunElevation: 46,
    sunAzimuth: 122,
    sunColor: 0xfff4e2,
    // Deliberately restrained: the old 3.0 blew the pale stone paths and the
    // park lawn into pure white under ACES.
    sunIntensity: 2.1,

    hemiSky: 0xcfe2f5,
    hemiGround: 0x9c8f78,
    hemiIntensity: 0.85,

    exposure: 0.92,
    fogColor: 0xdbe6ef,

    cloudCount: 16,
    cloudColor: 0xffffff,
    cloudOpacity: 0.72,

    // Artificial light - off in daylight.
    windowEmissive: 0.06,
    lampIntensity: 0.12,
    lampVisible: false,
    neonIntensity: 0.45,
    signEmissive: 0.32,
    signEdgeEmissive: 0.4,
    starsVisible: false,

    // Ground-material tinting (multiplied over the textures).
    grassTint: 0xd9e6cf,
    islandTint: 0xdfe8d8,
    paverTint: 0xc4bcae,
    brickPathTint: 0xbdb1a3,
    plazaPaveTint: 0xd8cec2,
  },

  evening: {
    id: "evening",
    label: "Evening",
    dark: false,

    turbidity: 8.5,
    rayleigh: 3.4,
    mieCoefficient: 0.009,
    mieDirectionalG: 0.88,
    skyElevation: 4.5,
    skyAzimuth: 255,

    sunElevation: 7,
    sunAzimuth: 255,
    sunColor: 0xffb26b,
    sunIntensity: 1.55,

    hemiSky: 0xf6b98a,
    hemiGround: 0x4a3d38,
    hemiIntensity: 0.7,

    exposure: 0.98,
    fogColor: 0xe0a878,

    cloudCount: 14,
    cloudColor: 0xffc79a,
    cloudOpacity: 0.7,

    windowEmissive: 0.42,
    lampIntensity: 1.1,
    lampVisible: true,
    neonIntensity: 0.9,
    signEmissive: 0.5,
    signEdgeEmissive: 0.6,
    starsVisible: false,

    grassTint: 0xc2b79c,
    islandTint: 0xcabda2,
    paverTint: 0xc9b096,
    brickPathTint: 0xb8977c,
    plazaPaveTint: 0xd3ab88,
  },

  night: {
    id: "night",
    label: "Night",
    dark: true,

    turbidity: 6,
    rayleigh: 0.5,
    mieCoefficient: 0.006,
    mieDirectionalG: 0.85,
    skyElevation: -6, // sun parked below the horizon → deep blue dome
    skyAzimuth: 250,

    // The moon (and the key light) live on their own vector, well above.
    sunElevation: 46,
    sunAzimuth: 44,
    sunColor: 0x9ab8ff,
    sunIntensity: 0.5,

    hemiSky: 0x2a3652,
    hemiGround: 0x0b0f16,
    hemiIntensity: 0.55,

    exposure: 0.9,
    fogColor: 0x0b1526,

    cloudCount: 9,
    cloudColor: 0x8b95ac,
    cloudOpacity: 0.3,

    windowEmissive: 0.55,
    lampIntensity: 1.8,
    lampVisible: true,
    neonIntensity: 1.15,
    signEmissive: 0.72,
    signEdgeEmissive: 0.85,
    starsVisible: true,

    grassTint: 0x8fa08a,
    islandTint: 0x8fa08a,
    paverTint: 0x8d8d93,
    brickPathTint: 0x8a8078,
    plazaPaveTint: 0x9a8f88,
  },
};

/** Preset for a time-of-day id, falling back to day. */
export function presetFor(tod) {
  return TOD_PRESETS[tod] || TOD_PRESETS.day;
}
