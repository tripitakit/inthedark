/**
 * AtmosphericLayerManager - Manages multiple ambient sound layers
 *
 * Provides layered soundscapes with independent volume modulation,
 * weather effects, and time-based variation.
 */

import type { AmbientSoundType } from '../types';

/**
 * Configuration for a single atmospheric layer
 */
export interface AtmosphericLayer {
  id: string;
  soundType: AmbientSoundType;
  baseVolume: number;
  variation?: {
    minVolume: number;
    maxVolume: number;
    cycleTime: number;  // Seconds for one volume oscillation
  };
  fadeInTime?: number;
  fadeOutTime?: number;
}

/**
 * Weather intensity configuration
 */
export interface WeatherConfig {
  wind: number;      // 0-1 wind intensity
  rain: number;      // 0-1 rain intensity
  thunder: number;   // 0-1 thunder probability
}

/**
 * Active layer state
 */
interface ActiveLayer {
  config: AtmosphericLayer;
  gainNode: GainNode;
  oscillatorId?: ReturnType<typeof setInterval>;
  currentVolume: number;
}

/**
 * AtmosphericLayerManager class
 */
export class AtmosphericLayerManager {
  private context: AudioContext;
  private masterGain: GainNode;
  private layers: Map<string, ActiveLayer> = new Map();
  private weatherConfig: WeatherConfig = { wind: 0, rain: 0, thunder: 0 };
  private weatherUpdateId: ReturnType<typeof setInterval> | null = null;

  constructor(context: AudioContext, masterGain: GainNode) {
    this.context = context;
    this.masterGain = masterGain;
  }

  /**
   * Add a new atmospheric layer
   */
  addLayer(config: AtmosphericLayer): GainNode {
    // Remove existing layer with same id
    if (this.layers.has(config.id)) {
      this.removeLayer(config.id);
    }

    // Create gain node for this layer
    const gainNode = this.context.createGain();
    gainNode.gain.value = 0; // Start silent for fade-in
    gainNode.connect(this.masterGain);

    const activeLayer: ActiveLayer = {
      config,
      gainNode,
      currentVolume: 0,
    };

    this.layers.set(config.id, activeLayer);

    // Fade in
    const fadeTime = config.fadeInTime ?? 1.0;
    const now = this.context.currentTime;
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(config.baseVolume, now + fadeTime);
    activeLayer.currentVolume = config.baseVolume;

    // Set up volume oscillation if configured
    if (config.variation) {
      this.startVolumeOscillation(config.id);
    }

    return gainNode;
  }

  /**
   * Remove an atmospheric layer
   */
  removeLayer(id: string, fadeTime: number = 1.0): void {
    const layer = this.layers.get(id);
    if (!layer) return;

    // Stop oscillation
    if (layer.oscillatorId) {
      clearInterval(layer.oscillatorId);
    }

    // Fade out and disconnect
    const now = this.context.currentTime;
    layer.gainNode.gain.setValueAtTime(layer.currentVolume, now);
    layer.gainNode.gain.linearRampToValueAtTime(0, now + fadeTime);

    // Disconnect after fade
    setTimeout(() => {
      layer.gainNode.disconnect();
      this.layers.delete(id);
    }, fadeTime * 1000 + 100);
  }

  /**
   * Get a layer's gain node for connecting sound sources
   */
  getLayerGain(id: string): GainNode | null {
    return this.layers.get(id)?.gainNode ?? null;
  }

  /**
   * Set volume for a specific layer
   */
  setLayerVolume(id: string, volume: number, fadeTime: number = 0.5): void {
    const layer = this.layers.get(id);
    if (!layer) return;

    const now = this.context.currentTime;
    layer.gainNode.gain.setValueAtTime(layer.currentVolume, now);
    layer.gainNode.gain.linearRampToValueAtTime(volume, now + fadeTime);
    layer.currentVolume = volume;
    layer.config.baseVolume = volume;
  }

  /**
   * Start volume oscillation for a layer
   */
  private startVolumeOscillation(id: string): void {
    const layer = this.layers.get(id);
    if (!layer || !layer.config.variation) return;

    const { minVolume, maxVolume, cycleTime } = layer.config.variation;
    const updateInterval = 100; // ms
    let phase = 0;
    const phaseIncrement = (2 * Math.PI * updateInterval) / (cycleTime * 1000);

    layer.oscillatorId = setInterval(() => {
      phase += phaseIncrement;
      if (phase > 2 * Math.PI) phase -= 2 * Math.PI;

      // Sinusoidal volume modulation
      const t = (Math.sin(phase) + 1) / 2; // 0-1
      const volume = minVolume + t * (maxVolume - minVolume);

      layer.gainNode.gain.setValueAtTime(volume, this.context.currentTime);
      layer.currentVolume = volume;
    }, updateInterval);
  }

  /**
   * Set weather intensity (affects wind and rain layers)
   */
  setWeather(config: Partial<WeatherConfig>, transitionTime: number = 2.0): void {
    this.weatherConfig = { ...this.weatherConfig, ...config };

    // Update wind layer if exists
    const windLayer = this.layers.get('weather_wind');
    if (windLayer && config.wind !== undefined) {
      const now = this.context.currentTime;
      const targetVolume = 0.3 * config.wind;
      windLayer.gainNode.gain.setValueAtTime(windLayer.currentVolume, now);
      windLayer.gainNode.gain.linearRampToValueAtTime(targetVolume, now + transitionTime);
      windLayer.currentVolume = targetVolume;
    }

    // Update rain layer if exists
    const rainLayer = this.layers.get('weather_rain');
    if (rainLayer && config.rain !== undefined) {
      const now = this.context.currentTime;
      const targetVolume = 0.25 * config.rain;
      rainLayer.gainNode.gain.setValueAtTime(rainLayer.currentVolume, now);
      rainLayer.gainNode.gain.linearRampToValueAtTime(targetVolume, now + transitionTime);
      rainLayer.currentVolume = targetVolume;
    }

    // Handle thunder probability
    if (config.thunder !== undefined) {
      this.updateThunderSchedule();
    }
  }

  /**
   * Update thunder scheduling based on probability
   */
  private updateThunderSchedule(): void {
    // Clear existing schedule
    if (this.weatherUpdateId) {
      clearInterval(this.weatherUpdateId);
      this.weatherUpdateId = null;
    }

    if (this.weatherConfig.thunder > 0) {
      // Check for thunder every 10-30 seconds
      const checkInterval = 10000 + Math.random() * 20000;

      this.weatherUpdateId = setInterval(() => {
        if (Math.random() < this.weatherConfig.thunder) {
          this.playThunder();
        }
      }, checkInterval);
    }
  }

  /**
   * Play a thunder sound
   */
  private playThunder(): void {
    const now = this.context.currentTime;
    const duration = 2.0 + Math.random() * 1.5;

    // Low rumble
    const osc = this.context.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(30 + Math.random() * 20, now);
    osc.frequency.exponentialRampToValueAtTime(20, now + duration);

    // Noise burst
    const bufferSize = Math.floor(this.context.sampleRate * duration);
    const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      const t = i / bufferSize;
      // Multiple decay phases for rolling thunder
      const envelope = Math.exp(-t * 2) * 0.7 + Math.exp(-t * 0.5) * 0.3;
      data[i] = (Math.random() * 2 - 1) * envelope;
    }

    const noiseSource = this.context.createBufferSource();
    noiseSource.buffer = buffer;

    const filter = this.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 200;

    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0.4 * this.weatherConfig.thunder, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

    osc.connect(filter);
    noiseSource.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    noiseSource.start(now);
    osc.stop(now + duration);
    noiseSource.stop(now + duration);
  }

  /**
   * Create preset weather layers (wind and rain generators)
   */
  createWeatherLayers(): void {
    // Wind layer
    this.addLayer({
      id: 'weather_wind',
      soundType: 'wind',
      baseVolume: 0,
      variation: {
        minVolume: 0,
        maxVolume: 0.1,
        cycleTime: 8,
      },
    });

    // Rain layer would need a continuous rain generator
    // For now, we'll set up the structure
    this.addLayer({
      id: 'weather_rain',
      soundType: 'waterDrip', // Placeholder
      baseVolume: 0,
    });
  }

  /**
   * Get all active layer IDs
   */
  getActiveLayers(): string[] {
    return Array.from(this.layers.keys());
  }

  /**
   * Clear all layers
   */
  clearAllLayers(fadeTime: number = 1.0): void {
    for (const id of this.layers.keys()) {
      this.removeLayer(id, fadeTime);
    }

    if (this.weatherUpdateId) {
      clearInterval(this.weatherUpdateId);
      this.weatherUpdateId = null;
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.clearAllLayers(0);
  }
}
