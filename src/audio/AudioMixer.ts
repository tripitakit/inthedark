/**
 * AudioMixer - Bus-based audio routing with ducking support
 *
 * Provides automatic ducking of background audio when speech plays,
 * and priority-based mixing for different sound categories.
 */

export type BusId = 'speech' | 'effects' | 'ambience' | 'music';

interface AudioBus {
  id: BusId;
  gain: GainNode;
  priority: number;
  baseVolume: number;
  currentVolume: number;
}

/**
 * Ducking configuration
 */
interface DuckConfig {
  /** Target volume when ducked (0-1) */
  duckLevel: number;
  /** Time to ramp down (seconds) */
  attackTime: number;
  /** Time to ramp back up (seconds) */
  releaseTime: number;
}

const DEFAULT_DUCK_CONFIG: Record<BusId, DuckConfig> = {
  speech: { duckLevel: 1.0, attackTime: 0, releaseTime: 0 },      // Never ducked
  effects: { duckLevel: 0.5, attackTime: 0.1, releaseTime: 0.4 }, // Partially ducked
  ambience: { duckLevel: 0.3, attackTime: 0.1, releaseTime: 0.4 }, // Heavily ducked
  music: { duckLevel: 0.4, attackTime: 0.15, releaseTime: 0.5 },   // Heavily ducked
};

/**
 * Priority levels for sounds
 * Lower number = higher priority
 */
export enum SoundPriority {
  CRITICAL = 0,    // Speech, unlock sounds
  HIGH = 1,        // Footsteps, sonar
  NORMAL = 2,      // Item signatures
  LOW = 3,         // Ambient layers
  BACKGROUND = 4,  // Continuous drones
}

/**
 * AudioMixer class - manages audio buses and ducking
 */
export class AudioMixer {
  private context: AudioContext;
  private masterGain: GainNode;
  private buses: Map<BusId, AudioBus> = new Map();
  private duckingActive: boolean = false;
  private duckTimeoutId: ReturnType<typeof setTimeout> | null = null;

  constructor(context: AudioContext, masterGain: GainNode) {
    this.context = context;
    this.masterGain = masterGain;
    this.createBuses();
  }

  /**
   * Create all audio buses
   */
  private createBuses(): void {
    const busConfigs: Array<{ id: BusId; priority: number; baseVolume: number }> = [
      { id: 'speech', priority: SoundPriority.CRITICAL, baseVolume: 1.0 },
      { id: 'effects', priority: SoundPriority.HIGH, baseVolume: 1.0 },
      { id: 'ambience', priority: SoundPriority.LOW, baseVolume: 0.8 },
      { id: 'music', priority: SoundPriority.BACKGROUND, baseVolume: 0.6 },
    ];

    for (const config of busConfigs) {
      const gain = this.context.createGain();
      gain.gain.value = config.baseVolume;
      gain.connect(this.masterGain);

      this.buses.set(config.id, {
        id: config.id,
        gain,
        priority: config.priority,
        baseVolume: config.baseVolume,
        currentVolume: config.baseVolume,
      });
    }
  }

  /**
   * Get a bus's gain node for connecting audio sources
   */
  getBus(busId: BusId): GainNode | null {
    return this.buses.get(busId)?.gain ?? null;
  }

  /**
   * Get all buses for connecting multiple sources
   */
  getAllBuses(): Map<BusId, GainNode> {
    const result = new Map<BusId, GainNode>();
    for (const [id, bus] of this.buses) {
      result.set(id, bus.gain);
    }
    return result;
  }

  /**
   * Duck specified buses (reduce their volume)
   *
   * @param targetBuses Buses to duck
   * @param customConfig Optional custom ducking configuration
   */
  duck(
    targetBuses: BusId[] = ['ambience', 'music', 'effects'],
    customConfig?: Partial<Record<BusId, DuckConfig>>
  ): void {
    if (this.duckingActive) return;
    this.duckingActive = true;

    const now = this.context.currentTime;

    for (const busId of targetBuses) {
      const bus = this.buses.get(busId);
      if (!bus) continue;

      const config = customConfig?.[busId] ?? DEFAULT_DUCK_CONFIG[busId];
      const targetVolume = bus.baseVolume * config.duckLevel;

      // Smooth ramp down
      bus.gain.gain.cancelScheduledValues(now);
      bus.gain.gain.setValueAtTime(bus.currentVolume, now);
      bus.gain.gain.linearRampToValueAtTime(targetVolume, now + config.attackTime);
      bus.currentVolume = targetVolume;
    }
  }

  /**
   * Unduck buses (restore their volume)
   *
   * @param targetBuses Buses to restore
   * @param customConfig Optional custom release configuration
   */
  unduck(
    targetBuses: BusId[] = ['ambience', 'music', 'effects'],
    customConfig?: Partial<Record<BusId, DuckConfig>>
  ): void {
    if (!this.duckingActive) return;
    this.duckingActive = false;

    const now = this.context.currentTime;

    for (const busId of targetBuses) {
      const bus = this.buses.get(busId);
      if (!bus) continue;

      const config = customConfig?.[busId] ?? DEFAULT_DUCK_CONFIG[busId];

      // Smooth ramp up
      bus.gain.gain.cancelScheduledValues(now);
      bus.gain.gain.setValueAtTime(bus.currentVolume, now);
      bus.gain.gain.linearRampToValueAtTime(bus.baseVolume, now + config.releaseTime);
      bus.currentVolume = bus.baseVolume;
    }
  }

  /**
   * Duck with automatic unduck after speech ends
   * Useful for TTS where you know the approximate duration
   *
   * @param estimatedDuration Estimated speech duration in seconds
   * @param targetBuses Buses to duck
   */
  duckForDuration(
    estimatedDuration: number,
    targetBuses: BusId[] = ['ambience', 'music', 'effects']
  ): void {
    // Clear any pending unduck
    if (this.duckTimeoutId) {
      clearTimeout(this.duckTimeoutId);
      this.duckTimeoutId = null;
    }

    this.duck(targetBuses);

    // Schedule unduck after speech + a small buffer
    const bufferTime = 0.2; // 200ms buffer after speech
    this.duckTimeoutId = setTimeout(() => {
      this.unduck(targetBuses);
      this.duckTimeoutId = null;
    }, (estimatedDuration + bufferTime) * 1000);
  }

  /**
   * Set base volume for a bus
   */
  setBusVolume(busId: BusId, volume: number): void {
    const bus = this.buses.get(busId);
    if (!bus) return;

    const clampedVolume = Math.max(0, Math.min(1, volume));
    bus.baseVolume = clampedVolume;

    // If not currently ducked, update immediately
    if (!this.duckingActive) {
      const now = this.context.currentTime;
      bus.gain.gain.setValueAtTime(bus.gain.gain.value, now);
      bus.gain.gain.linearRampToValueAtTime(clampedVolume, now + 0.1);
      bus.currentVolume = clampedVolume;
    }
  }

  /**
   * Check if ducking is currently active
   */
  isDucking(): boolean {
    return this.duckingActive;
  }

  /**
   * Force stop ducking (useful for cleanup)
   */
  stopDucking(): void {
    if (this.duckTimeoutId) {
      clearTimeout(this.duckTimeoutId);
      this.duckTimeoutId = null;
    }
    this.unduck();
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.stopDucking();
    for (const bus of this.buses.values()) {
      bus.gain.disconnect();
    }
    this.buses.clear();
  }
}

// Singleton instance (created when AudioEngine initializes)
let mixerInstance: AudioMixer | null = null;

export function createMixer(context: AudioContext, masterGain: GainNode): AudioMixer {
  mixerInstance = new AudioMixer(context, masterGain);
  return mixerInstance;
}

export function getMixer(): AudioMixer | null {
  return mixerInstance;
}
