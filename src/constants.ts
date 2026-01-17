/**
 * Centralized constants for the game
 *
 * This file contains magic numbers and configuration values
 * that are used across the codebase.
 */

// ========================================
// AUDIO SETTINGS
// ========================================

/** Master volume level (0.0 - 1.0) */
export const MASTER_VOLUME = 0.75;

/** Default speech rate for TTS (0.1 - 2.0) */
export const SPEECH_RATE = 0.95;

/** Default speech pitch for TTS (0.0 - 2.0) */
export const SPEECH_PITCH = 0.5;

/** Speech volume (0.0 - 1.0) */
export const SPEECH_VOLUME = 1.0;

// ========================================
// SONAR TIMING (milliseconds)
// ========================================

/** Echo delay for wall (close obstacle) */
export const SONAR_ECHO_WALL_DELAY = 150;

/** Echo delay for passage (open space) */
export const SONAR_ECHO_PASSAGE_DELAY = 450;

/** Delay after echo before playing lock hint sound */
export const SONAR_LOCK_SOUND_DELAY = 400;

// ========================================
// MOVEMENT TIMING
// ========================================

/** Interval between footsteps in seconds */
export const FOOTSTEP_INTERVAL = 0.75;

/** Number of footsteps per movement */
export const FOOTSTEP_COUNT = 4;

/** Duration of a single footstep sound in seconds */
export const FOOTSTEP_DURATION = 0.15;

// ========================================
// UI LAYOUT
// ========================================

/** Minimap cell size in pixels */
export const MINIMAP_CELL_SIZE = 24;

/** Minimap node size in pixels */
export const MINIMAP_NODE_SIZE = 20;

/** Minimap connection size in pixels */
export const MINIMAP_CONN_SIZE = 4;

// ========================================
// GAME MECHANICS
// ========================================

/** Delay before room narration starts (ms) */
export const NARRATION_DELAY = 1000;

/** Delay before starting room narration on game start (ms) */
export const INITIAL_NARRATION_DELAY = 500;

/** Hint system cooldown in milliseconds */
export const HINT_COOLDOWN = 30000;

/** Delay before tutorial narration starts (ms) */
export const TUTORIAL_DELAY_BASE = 600;

/** Extra delay for lock tutorial to let signature sound play first (ms) */
export const TUTORIAL_DELAY_AFTER_LOCK = 800;

/** Delay for item presence tutorial after chime (ms) */
export const TUTORIAL_DELAY_AFTER_ITEM = 800;

/** Delay for interaction result narration (ms) */
export const INTERACTION_NARRATION_DELAY = 300;

/** Delay for inventory item name speech before signature (ms) */
export const INVENTORY_SPEECH_DELAY = 600;

// ========================================
// AUDIO FREQUENCIES (Hz)
// ========================================

export const FREQUENCIES = {
  // Footstep filter
  FOOTSTEP_LOWPASS: 800,

  // Sonar ping
  PING_START: 1200,
  PING_END: 800,

  // Echo filter
  ECHO_PASSAGE_FILTER: 600,
  ECHO_WALL_FILTER: 1000,

  // Pickup arpeggio (C5, E5, G5)
  PICKUP_NOTES: [523, 659, 784],

  // Item presence shimmer
  ITEM_PRESENCE_NOTES: [800, 1000, 1200],

  // Save confirmation chime
  SAVE_CONFIRM_NOTES: [600, 900],

  // Victory fanfare chord (C4, E4, G4, C5)
  VICTORY_CHORD: [261.63, 329.63, 392.00, 523.25],

  // Victory arpeggio (C5, E5, G5, C6)
  VICTORY_ARPEGGIO: [523.25, 659.26, 783.99, 1046.50],

  // Electric buzz base frequency
  ELECTRIC_HUM: 60,

  // Temple bell fundamental
  TEMPLE_BELL: 180,
};

// ========================================
// AUDIO DURATIONS (seconds)
// ========================================

export const DURATIONS = {
  // Basic sounds
  OBSTACLE: 0.2,
  ERROR: 0.2,
  PING: 0.15,
  EMPTY_PICKUP: 0.15,
  LOCK_PRESENCE: 0.12,

  // Item signatures
  GLASS_CHIME: 0.3,
  METAL_SCRAPE: 0.2,
  ROPE_SWISH: 0.4,
  CRYSTAL_RESONANCE: 0.5,
  ALIEN_CRYSTAL: 0.55,
  ELECTRIC_BUZZ: 0.3,
  LIQUID_GURGLE: 0.35,
  TEMPLE_BELL: 1.5,
  STONE_GRIND: 0.4,
  MONK_CHANT: 0.8,
  CHALICE_RING: 0.6,
  CRYSTAL_HUM: 0.5,
  VOID_WHISPER: 0.7,
  HARMONIC_TONE: 0.6,
  STARLIGHT_PULSE: 0.5,
  COSMIC_RESONANCE: 0.8,

  // Victory sequence phases
  IGNITION: 2,
  POWER_SURGE: 2,
  LIFTOFF: 4,
  ACCELERATION: 4,
  VICTORY_FANFARE: 3,

  // Surprise effects
  DISTANT_THUNDER: 2,
  METAL_GROAN: 1.5,
  ETHEREAL_CHOIR: 3,
  STATIC_BURST: 0.3,
  DEEP_RUMBLE: 2.5,
  WIND_GUST: 5,
  DISTANT_VOICES: 6,
  MACHINE_AWAKEN: 3,
  COSMIC_HUM: 4,
};

// ========================================
// GAIN VALUES
// ========================================

export const GAINS = {
  FOOTSTEP: 0.45,
  OBSTACLE: 0.4,
  PING: 0.4,
  PICKUP: 0.3,
  ERROR: 0.25,
  ITEM_PRESENCE: 0.5,
  SAVE_CONFIRM: 0.25,
  ECHO_PASSAGE: 0.2,
  ECHO_WALL: 0.3,
  LOCK_PRESENCE: 0.15,
  SIGNATURE_ECHO_BOOST: 1.2,
};
