import type { AmbienceConfig, AmbientSound } from '../types';
import { AudioEngine } from './AudioEngine';
import { Reverb } from './Reverb';
import { createAmbientGenerator, type AmbientGenerator } from './AmbientSounds';

// Default transition duration in seconds
const DEFAULT_TRANSITION_DURATION = 1.5;

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
  private activeGenerators: Map<string, AmbientGenerator> = new Map();
  private pendingStops: Map<string, number> = new Map(); // Timeout IDs for cleanup
  private currentConfig: AmbienceConfig | null = null;

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

    // Create reverb and connect to master
    this.reverb = new Reverb(context);
    this.reverb.getOutput().connect(masterGain);

    console.log('AmbienceManager initialized');
  }

  /**
   * Get the reverb input node (for connecting game sounds)
   */
  getReverbInput(): GainNode | null {
    return this.reverb?.getInput() ?? null;
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
