/**
 * BinauralAudio - True 3D audio positioning using HRTF
 *
 * Provides binaural/head-related transfer function processing
 * for immersive headphone listening. Uses Web Audio API's
 * PannerNode with HRTF panning model.
 */

import type { Direction } from '../types';

/**
 * Direction to angle mapping (in radians)
 * Front is 0, right is -PI/2, back is PI, left is PI/2
 */
const DIRECTION_ANGLES: Record<Direction, number> = {
  north: 0,
  east: -Math.PI / 2,
  south: Math.PI,
  west: Math.PI / 2,
};

/**
 * Position in 3D space
 */
export interface Position3D {
  x: number;  // Left/Right (-1 to 1)
  y: number;  // Up/Down (-1 to 1)
  z: number;  // Front/Back (-1 to 1, negative is front)
}

/**
 * Spatial audio configuration
 */
export interface SpatialConfig {
  refDistance: number;      // Distance at full volume
  maxDistance: number;      // Distance at min volume
  rolloffFactor: number;    // How quickly volume drops
  coneInnerAngle: number;   // Full volume cone (degrees)
  coneOuterAngle: number;   // Zero volume cone (degrees)
  coneOuterGain: number;    // Gain outside outer cone
}

const DEFAULT_SPATIAL_CONFIG: SpatialConfig = {
  refDistance: 1,
  maxDistance: 10,
  rolloffFactor: 1,
  coneInnerAngle: 360,
  coneOuterAngle: 360,
  coneOuterGain: 0,
};

/**
 * BinauralAudio class - manages HRTF-based spatial audio
 */
export class BinauralAudio {
  private context: AudioContext;
  private listener: AudioListener;
  private enabled: boolean = true;
  private currentOrientation: Direction = 'north';

  constructor(context: AudioContext) {
    this.context = context;
    this.listener = context.listener;
    this.initListener();
  }

  /**
   * Initialize the audio listener (player's ears)
   */
  private initListener(): void {
    // Position listener at origin
    if (this.listener.positionX) {
      // Modern API
      this.listener.positionX.value = 0;
      this.listener.positionY.value = 0;
      this.listener.positionZ.value = 0;
    } else {
      // Legacy API
      this.listener.setPosition(0, 0, 0);
    }

    // Set initial orientation (looking north = negative Z)
    this.updateListenerOrientation('north');
  }

  /**
   * Update listener orientation based on player facing direction
   */
  updateListenerOrientation(facing: Direction): void {
    this.currentOrientation = facing;
    const angle = DIRECTION_ANGLES[facing];

    // Forward vector (where we're looking)
    const forwardX = Math.sin(angle);
    const forwardZ = -Math.cos(angle);

    // Up vector (always Y-up)
    const upX = 0;
    const upY = 1;
    const upZ = 0;

    if (this.listener.forwardX) {
      // Modern API
      const now = this.context.currentTime;
      this.listener.forwardX.setValueAtTime(forwardX, now);
      this.listener.forwardY.setValueAtTime(0, now);
      this.listener.forwardZ.setValueAtTime(forwardZ, now);
      this.listener.upX.setValueAtTime(upX, now);
      this.listener.upY.setValueAtTime(upY, now);
      this.listener.upZ.setValueAtTime(upZ, now);
    } else {
      // Legacy API
      this.listener.setOrientation(forwardX, 0, forwardZ, upX, upY, upZ);
    }
  }

  /**
   * Create a spatial audio source (PannerNode with HRTF)
   */
  createSpatialSource(config: Partial<SpatialConfig> = {}): PannerNode {
    const panner = this.context.createPanner();

    // Use HRTF for binaural processing
    panner.panningModel = this.enabled ? 'HRTF' : 'equalpower';
    panner.distanceModel = 'inverse';

    // Apply configuration
    const fullConfig = { ...DEFAULT_SPATIAL_CONFIG, ...config };
    panner.refDistance = fullConfig.refDistance;
    panner.maxDistance = fullConfig.maxDistance;
    panner.rolloffFactor = fullConfig.rolloffFactor;
    panner.coneInnerAngle = fullConfig.coneInnerAngle;
    panner.coneOuterAngle = fullConfig.coneOuterAngle;
    panner.coneOuterGain = fullConfig.coneOuterGain;

    return panner;
  }

  /**
   * Position a panner node at a 3D location
   */
  setSourcePosition(panner: PannerNode, position: Position3D): void {
    if (panner.positionX) {
      // Modern API
      const now = this.context.currentTime;
      panner.positionX.setValueAtTime(position.x, now);
      panner.positionY.setValueAtTime(position.y, now);
      panner.positionZ.setValueAtTime(position.z, now);
    } else {
      // Legacy API
      panner.setPosition(position.x, position.y, position.z);
    }
  }

  /**
   * Move a panner node smoothly to a new position
   */
  moveSourceTo(panner: PannerNode, position: Position3D, duration: number): void {
    const now = this.context.currentTime;

    if (panner.positionX) {
      panner.positionX.setValueAtTime(panner.positionX.value, now);
      panner.positionX.linearRampToValueAtTime(position.x, now + duration);

      panner.positionY.setValueAtTime(panner.positionY.value, now);
      panner.positionY.linearRampToValueAtTime(position.y, now + duration);

      panner.positionZ.setValueAtTime(panner.positionZ.value, now);
      panner.positionZ.linearRampToValueAtTime(position.z, now + duration);
    }
  }

  /**
   * Convert direction and distance to 3D position
   * Uses the player's current orientation
   */
  directionToPosition(direction: Direction, distance: number = 1): Position3D {
    const angle = DIRECTION_ANGLES[direction];
    const orientationAngle = DIRECTION_ANGLES[this.currentOrientation];

    // Relative angle from player's perspective
    const relativeAngle = angle - orientationAngle;

    return {
      x: Math.sin(relativeAngle) * distance,
      y: 0,
      z: -Math.cos(relativeAngle) * distance,
    };
  }

  /**
   * Create elevation cues using shelf filters
   * High sounds feel "above", low sounds feel "below"
   */
  createElevationFilter(elevation: number): BiquadFilterNode {
    const filter = this.context.createBiquadFilter();

    if (elevation > 0) {
      // Above: boost highs, cut lows
      filter.type = 'highshelf';
      filter.frequency.value = 2000;
      filter.gain.value = elevation * 6; // Up to +6dB for sounds above
    } else if (elevation < 0) {
      // Below: boost lows, cut highs
      filter.type = 'lowshelf';
      filter.frequency.value = 500;
      filter.gain.value = -elevation * 4; // Up to +4dB for sounds below
    } else {
      // Level: neutral
      filter.type = 'allpass';
    }

    return filter;
  }

  /**
   * Enable or disable HRTF processing
   * When disabled, falls back to simple stereo panning
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Check if HRTF is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Get current player orientation
   */
  getCurrentOrientation(): Direction {
    return this.currentOrientation;
  }

  /**
   * Create a complete spatial audio chain for a sound source
   */
  createSpatialChain(
    direction: Direction,
    distance: number = 1,
    elevation: number = 0
  ): {
    panner: PannerNode;
    elevationFilter: BiquadFilterNode;
    input: AudioNode;
    output: AudioNode;
  } {
    const panner = this.createSpatialSource();
    const position = this.directionToPosition(direction, distance);
    position.y = elevation;
    this.setSourcePosition(panner, position);

    const elevationFilter = this.createElevationFilter(elevation);

    // Chain: input → elevationFilter → panner → output
    elevationFilter.connect(panner);

    return {
      panner,
      elevationFilter,
      input: elevationFilter,
      output: panner,
    };
  }
}
