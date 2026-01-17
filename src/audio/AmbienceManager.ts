import type { AmbienceConfig, AmbientSound } from '../types';
import { AudioEngine } from './AudioEngine';
import { Reverb } from './Reverb';
import { createAmbientGenerator, type AmbientGenerator } from './AmbientSounds';

// Default transition duration in seconds
const DEFAULT_TRANSITION_DURATION = 1.5;

/**
 * Room EQ configuration
 */
interface RoomEQ {
  lowShelf: { frequency: number; gain: number };
  highShelf: { frequency: number; gain: number };
}

/**
 * Predefined EQ profiles for different environment types
 */
const ROOM_EQ_PRESETS: Record<string, RoomEQ> = {
  cave: {
    lowShelf: { frequency: 200, gain: 4 },
    highShelf: { frequency: 4000, gain: -3 },
  },
  spaceship: {
    lowShelf: { frequency: 80, gain: 2 },
    highShelf: { frequency: 6000, gain: 1 },
  },
  forest: {
    lowShelf: { frequency: 150, gain: -2 },
    highShelf: { frequency: 3000, gain: 3 },
  },
  temple: {
    lowShelf: { frequency: 120, gain: 3 },
    highShelf: { frequency: 5000, gain: -2 },
  },
  celestial: {
    lowShelf: { frequency: 100, gain: 1 },
    highShelf: { frequency: 8000, gain: 4 },
  },
  default: {
    lowShelf: { frequency: 150, gain: 0 },
    highShelf: { frequency: 6000, gain: 0 },
  },
};

/**
 * AmbienceManager - Orchestrazione dell'ambiente sonoro
 *
 * Gestisce:
 * - Riverbero globale con parametri per nodo
 * - Generatori di suoni ambientali
 * - Transizioni graduali tra ambienti
 */
export class AmbienceManager {
  private audioEngine: AudioEngine;
  private reverb: Reverb | null = null;
  private lowShelfFilter: BiquadFilterNode | null = null;
  private highShelfFilter: BiquadFilterNode | null = null;
  private activeGenerators: Map<string, AmbientGenerator> = new Map();
  private pendingStops: Map<string, number> = new Map(); // Timeout IDs for cleanup
  private currentConfig: AmbienceConfig | null = null;
  private currentEQType: string = 'default';

  constructor(audioEngine: AudioEngine) {
    this.audioEngine = audioEngine;
  }

  /**
   * Initialize the ambience system
   * Must be called after AudioEngine.init()
   */
  init(): void {
    const context = this.audioEngine.getContext();
    const masterGain = this.audioEngine.getMasterGain();

    if (!context || !masterGain) {
      console.warn('AmbienceManager: AudioContext not ready');
      return;
    }

    // Create EQ filters
    this.lowShelfFilter = context.createBiquadFilter();
    this.lowShelfFilter.type = 'lowshelf';
    this.lowShelfFilter.frequency.value = 150;
    this.lowShelfFilter.gain.value = 0;

    this.highShelfFilter = context.createBiquadFilter();
    this.highShelfFilter.type = 'highshelf';
    this.highShelfFilter.frequency.value = 6000;
    this.highShelfFilter.gain.value = 0;

    // Create reverb
    this.reverb = new Reverb(context);

    // Chain: reverb output → lowShelf → highShelf → master
    this.reverb.getOutput().connect(this.lowShelfFilter);
    this.lowShelfFilter.connect(this.highShelfFilter);
    this.highShelfFilter.connect(masterGain);

    console.log('AmbienceManager initialized with room EQ');
  }

  /**
   * Get the reverb input node (for connecting game sounds)
   */
  getReverbInput(): GainNode | null {
    return this.reverb?.getInput() ?? null;
  }

  /**
   * Set room EQ based on environment type
   */
  setRoomEQ(envType: string, transitionTime: number = 0.5): void {
    if (!this.lowShelfFilter || !this.highShelfFilter) return;

    const preset = ROOM_EQ_PRESETS[envType] ?? ROOM_EQ_PRESETS.default;
    const context = this.audioEngine.getContext();
    if (!context) return;

    const now = context.currentTime;

    // Transition low shelf
    this.lowShelfFilter.frequency.setValueAtTime(this.lowShelfFilter.frequency.value, now);
    this.lowShelfFilter.frequency.linearRampToValueAtTime(preset.lowShelf.frequency, now + transitionTime);
    this.lowShelfFilter.gain.setValueAtTime(this.lowShelfFilter.gain.value, now);
    this.lowShelfFilter.gain.linearRampToValueAtTime(preset.lowShelf.gain, now + transitionTime);

    // Transition high shelf
    this.highShelfFilter.frequency.setValueAtTime(this.highShelfFilter.frequency.value, now);
    this.highShelfFilter.frequency.linearRampToValueAtTime(preset.highShelf.frequency, now + transitionTime);
    this.highShelfFilter.gain.setValueAtTime(this.highShelfFilter.gain.value, now);
    this.highShelfFilter.gain.linearRampToValueAtTime(preset.highShelf.gain, now + transitionTime);

    this.currentEQType = envType;
  }

  /**
   * Get current EQ type
   */
  getCurrentEQType(): string {
    return this.currentEQType;
  }

  /**
   * Set ambience immediately (no transition)
   */
  setAmbience(config: AmbienceConfig): void {
    if (!this.reverb) {
      console.warn('AmbienceManager: not initialized');
      return;
    }

    // Stop all current generators
    this.stopAllGenerators();

    // Set reverb parameters
    this.reverb.setDecay(config.reverbDecay);
    this.reverb.setWetDry(config.reverbWet);
    this.reverb.setCharacter(config.reverbCharacter);

    // Set room EQ based on environment type
    this.setRoomEQ(config.type, 0.1);

    // Start new generators
    this.startGenerators(config.sounds);

    this.currentConfig = config;
    console.log(`Ambience set: ${config.type}`);
  }

  /**
   * Transition smoothly to new ambience
   */
  transitionTo(config: AmbienceConfig, duration: number = DEFAULT_TRANSITION_DURATION): void {
    if (!this.reverb) {
      console.warn('AmbienceManager: not initialized');
      return;
    }

    const context = this.audioEngine.getContext();
    if (!context) return;

    // Transition reverb parameters
    this.reverb.transitionTo(config.reverbDecay, config.reverbWet, duration);

    // Change character (instant, but reverb tail handles smoothing)
    if (this.currentConfig?.reverbCharacter !== config.reverbCharacter) {
      this.reverb.setCharacter(config.reverbCharacter);
    }

    // Transition room EQ
    if (this.currentEQType !== config.type) {
      this.setRoomEQ(config.type, duration);
    }

    // Cross-fade generators
    this.crossfadeGenerators(config.sounds, duration);

    this.currentConfig = config;
    console.log(`Ambience transitioning to: ${config.type}`);
  }

  private startGenerators(sounds: AmbientSound[]): void {
    const context = this.audioEngine.getContext();
    if (!context || !this.reverb) return;

    for (const sound of sounds) {
      const generator = createAmbientGenerator(sound.type, context);
      generator.setVolume(sound.volume);
      generator.getOutput().connect(this.reverb.getInput());
      generator.start();

      this.activeGenerators.set(sound.id, generator);
    }
  }

  private stopAllGenerators(): void {
    // Clear any pending stop timeouts
    for (const timeoutId of this.pendingStops.values()) {
      clearTimeout(timeoutId);
    }
    this.pendingStops.clear();

    // Stop all generators
    for (const generator of this.activeGenerators.values()) {
      generator.stop();
    }
    this.activeGenerators.clear();
  }

  private crossfadeGenerators(newSounds: AmbientSound[], duration: number): void {
    const context = this.audioEngine.getContext();
    if (!context || !this.reverb) return;

    // Build set of new sound IDs
    const newIds = new Set(newSounds.map(s => s.id));

    // Fade out generators that are not in new config
    for (const [id, generator] of this.activeGenerators) {
      if (!newIds.has(id)) {
        generator.fadeVolume(0, duration);

        // Clear any existing pending stop for this ID
        const existingTimeout = this.pendingStops.get(id);
        if (existingTimeout !== undefined) {
          clearTimeout(existingTimeout);
        }

        // Schedule stop after fade
        const timeoutId = window.setTimeout(() => {
          generator.stop();
          this.activeGenerators.delete(id);
          this.pendingStops.delete(id);
        }, duration * 1000 + 100);

        this.pendingStops.set(id, timeoutId);
      }
    }

    // Update existing or add new generators
    for (const sound of newSounds) {
      const existing = this.activeGenerators.get(sound.id);

      if (existing) {
        // Fade to new volume
        existing.fadeVolume(sound.volume, duration);
      } else {
        // Create new generator and fade in
        const generator = createAmbientGenerator(sound.type, context);
        generator.setVolume(0);
        generator.getOutput().connect(this.reverb.getInput());
        generator.start();
        generator.fadeVolume(sound.volume, duration);

        this.activeGenerators.set(sound.id, generator);
      }
    }
  }

  /**
   * Stop all ambient sounds (e.g., for pause/cleanup)
   */
  stopAll(): void {
    this.stopAllGenerators();
  }
}
