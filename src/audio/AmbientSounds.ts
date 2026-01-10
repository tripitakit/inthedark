import type { AmbientSoundType } from '../types';

/**
 * Interface for all ambient sound generators
 */
export interface AmbientGenerator {
  start(): void;
  stop(): void;
  setVolume(volume: number): void;
  fadeVolume(target: number, duration: number): void;
  getOutput(): GainNode;
}

/**
 * Base class for ambient generators with common functionality
 */
abstract class BaseAmbientGenerator implements AmbientGenerator {
  protected context: AudioContext;
  protected output: GainNode;
  protected isPlaying: boolean = false;

  constructor(context: AudioContext, initialVolume: number = 0.3) {
    this.context = context;
    this.output = context.createGain();
    this.output.gain.value = initialVolume;
  }

  abstract start(): void;
  abstract stop(): void;

  setVolume(volume: number): void {
    this.output.gain.value = volume;
  }

  fadeVolume(target: number, duration: number): void {
    const now = this.context.currentTime;
    this.output.gain.setValueAtTime(this.output.gain.value, now);
    this.output.gain.linearRampToValueAtTime(target, now + duration);
  }

  getOutput(): GainNode {
    return this.output;
  }
}

/**
 * Utility: create a white noise buffer (cached)
 */
function createWhiteNoiseBuffer(context: AudioContext, duration: number): AudioBuffer {
  const bufferSize = Math.floor(context.sampleRate * duration);
  const buffer = context.createBuffer(1, bufferSize, context.sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  return buffer;
}

/**
 * Utility: create a pink noise buffer (cached)
 */
function createPinkNoiseBuffer(context: AudioContext, duration: number): AudioBuffer {
  const bufferSize = Math.floor(context.sampleRate * duration);
  const buffer = context.createBuffer(1, bufferSize, context.sampleRate);
  const data = buffer.getChannelData(0);

  // Paul Kellet's pink noise algorithm
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.96900 * b2 + white * 0.1538520;
    b3 = 0.86650 * b3 + white * 0.3104856;
    b4 = 0.55000 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.0168980;
    data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
    b6 = white * 0.115926;
  }

  return buffer;
}

/**
 * WaterDrip - Gocce d'acqua procedurali
 *
 * Genera burst di rumore filtrato a intervalli casuali
 * con pitch randomizzato per simulare gocce d'acqua
 */
class WaterDrip extends BaseAmbientGenerator {
  private nextDripTimeout: number | null = null;

  constructor(context: AudioContext) {
    super(context, 0.3);
  }

  start(): void {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.scheduleDrip();
  }

  stop(): void {
    this.isPlaying = false;
    if (this.nextDripTimeout !== null) {
      clearTimeout(this.nextDripTimeout);
      this.nextDripTimeout = null;
    }
  }

  private scheduleDrip(): void {
    if (!this.isPlaying) return;

    this.playDrip();

    // Random interval: 0.5 - 3 seconds
    const delay = 500 + Math.random() * 2500;
    this.nextDripTimeout = window.setTimeout(() => this.scheduleDrip(), delay);
  }

  private playDrip(): void {
    const now = this.context.currentTime;
    const duration = 0.02 + Math.random() * 0.02; // 20-40ms

    // Create noise burst
    const bufferSize = Math.floor(this.context.sampleRate * duration);
    const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      const t = i / bufferSize;
      const envelope = Math.exp(-t * 30); // Fast decay
      data[i] = (Math.random() * 2 - 1) * envelope;
    }

    const source = this.context.createBufferSource();
    source.buffer = buffer;

    // Bandpass filter with random center frequency
    const filter = this.context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1000 + Math.random() * 1500; // 1000-2500 Hz
    filter.Q.value = 10 + Math.random() * 10;

    // Slight pitch bend down
    const pitch = this.context.createBiquadFilter();
    pitch.type = 'highshelf';
    pitch.frequency.value = 2000;
    pitch.gain.setValueAtTime(0, now);
    pitch.gain.linearRampToValueAtTime(-6, now + duration);

    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0.5 + Math.random() * 0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

    source.connect(filter);
    filter.connect(pitch);
    pitch.connect(gain);
    gain.connect(this.output);

    source.start(now);
    source.stop(now + duration);
  }
}

/**
 * ElectricHum - Ronzio elettrico procedurale
 *
 * Oscillatore a 50Hz con armoniche e modulazione lenta
 */
class ElectricHum extends BaseAmbientGenerator {
  private oscillators: OscillatorNode[] = [];
  private lfo: OscillatorNode | null = null;

  constructor(context: AudioContext) {
    super(context, 0.2);
  }

  start(): void {
    if (this.isPlaying) return;
    this.isPlaying = true;

    const now = this.context.currentTime;

    // Fundamental: 50Hz
    const osc1 = this.context.createOscillator();
    osc1.type = 'sawtooth';
    osc1.frequency.value = 50;

    // Harmonics: 100Hz, 150Hz
    const osc2 = this.context.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = 100;

    const osc3 = this.context.createOscillator();
    osc3.type = 'sine';
    osc3.frequency.value = 150;

    // Gains for harmonics (decreasing)
    const gain1 = this.context.createGain();
    gain1.gain.value = 0.5;

    const gain2 = this.context.createGain();
    gain2.gain.value = 0.3;

    const gain3 = this.context.createGain();
    gain3.gain.value = 0.15;

    // LFO for amplitude modulation
    this.lfo = this.context.createOscillator();
    this.lfo.type = 'sine';
    this.lfo.frequency.value = 0.1; // Very slow modulation

    const lfoGain = this.context.createGain();
    lfoGain.gain.value = 0.3; // Modulation depth

    // Lowpass to soften the sound
    const filter = this.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 200;
    filter.Q.value = 1;

    // Master modulated gain
    const masterGain = this.context.createGain();
    masterGain.gain.value = 1;

    // Connect LFO to master gain
    this.lfo.connect(lfoGain);
    lfoGain.connect(masterGain.gain);

    // Connect oscillators
    osc1.connect(gain1);
    osc2.connect(gain2);
    osc3.connect(gain3);

    gain1.connect(filter);
    gain2.connect(filter);
    gain3.connect(filter);

    filter.connect(masterGain);
    masterGain.connect(this.output);

    // Start
    osc1.start(now);
    osc2.start(now);
    osc3.start(now);
    this.lfo.start(now);

    this.oscillators = [osc1, osc2, osc3];
  }

  stop(): void {
    if (!this.isPlaying) return;
    this.isPlaying = false;

    const now = this.context.currentTime;

    for (const osc of this.oscillators) {
      osc.stop(now);
    }
    if (this.lfo) {
      this.lfo.stop(now);
    }

    this.oscillators = [];
    this.lfo = null;
  }
}

/**
 * MechanicalBreath - Respiro meccanico procedurale
 *
 * Rumore filtrato con LFO lento che simula inspirazione/espirazione
 */
class MechanicalBreath extends BaseAmbientGenerator {
  private noiseSource: AudioBufferSourceNode | null = null;
  private lfo: OscillatorNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  constructor(context: AudioContext) {
    super(context, 0.25);
    // Pre-create noise buffer
    this.noiseBuffer = createWhiteNoiseBuffer(context, 10);
  }

  start(): void {
    if (this.isPlaying) return;
    this.isPlaying = true;

    const now = this.context.currentTime;

    // Use cached noise buffer
    this.noiseSource = this.context.createBufferSource();
    this.noiseSource.buffer = this.noiseBuffer;
    this.noiseSource.loop = true;

    // Bandpass filter for "breath" quality
    const filter = this.context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 400;
    filter.Q.value = 2;

    // LFO for breathing rhythm (4-6 second cycle)
    this.lfo = this.context.createOscillator();
    this.lfo.type = 'sine';
    this.lfo.frequency.value = 0.2; // ~5 second cycle

    const lfoGain = this.context.createGain();
    lfoGain.gain.value = 0.4; // Depth of modulation

    // Modulated gain
    const breathGain = this.context.createGain();
    breathGain.gain.value = 0.6; // Base level

    // LFO modulates the filter frequency for "whooshing" effect
    const lfoToFilter = this.context.createGain();
    lfoToFilter.gain.value = 200; // Filter modulation range

    this.lfo.connect(lfoGain);
    lfoGain.connect(breathGain.gain);

    this.lfo.connect(lfoToFilter);
    lfoToFilter.connect(filter.frequency);

    this.noiseSource.connect(filter);
    filter.connect(breathGain);
    breathGain.connect(this.output);

    this.noiseSource.start(now);
    this.lfo.start(now);
  }

  stop(): void {
    if (!this.isPlaying) return;
    this.isPlaying = false;

    const now = this.context.currentTime;

    if (this.noiseSource) {
      this.noiseSource.stop(now);
      this.noiseSource = null;
    }
    if (this.lfo) {
      this.lfo.stop(now);
      this.lfo = null;
    }
  }
}

/**
 * Wind - Vento procedurale
 *
 * Rumore rosa filtrato con modulazione lenta
 */
class Wind extends BaseAmbientGenerator {
  private noiseSource: AudioBufferSourceNode | null = null;
  private lfo: OscillatorNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  constructor(context: AudioContext) {
    super(context, 0.15);
    // Pre-create pink noise buffer
    this.noiseBuffer = createPinkNoiseBuffer(context, 10);
  }

  start(): void {
    if (this.isPlaying) return;
    this.isPlaying = true;

    const now = this.context.currentTime;

    // Use cached pink noise buffer
    this.noiseSource = this.context.createBufferSource();
    this.noiseSource.buffer = this.noiseBuffer;
    this.noiseSource.loop = true;

    // Bandpass for wind character
    const filter = this.context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 300;
    filter.Q.value = 0.5;

    // LFO for slow intensity variation
    this.lfo = this.context.createOscillator();
    this.lfo.type = 'sine';
    this.lfo.frequency.value = 0.08; // Very slow (~12 second cycle)

    const lfoGain = this.context.createGain();
    lfoGain.gain.value = 0.3;

    const windGain = this.context.createGain();
    windGain.gain.value = 0.7;

    // LFO modulates filter frequency
    const lfoToFilter = this.context.createGain();
    lfoToFilter.gain.value = 150;

    this.lfo.connect(lfoGain);
    lfoGain.connect(windGain.gain);

    this.lfo.connect(lfoToFilter);
    lfoToFilter.connect(filter.frequency);

    this.noiseSource.connect(filter);
    filter.connect(windGain);
    windGain.connect(this.output);

    this.noiseSource.start(now);
    this.lfo.start(now);
  }

  stop(): void {
    if (!this.isPlaying) return;
    this.isPlaying = false;

    const now = this.context.currentTime;

    if (this.noiseSource) {
      this.noiseSource.stop(now);
      this.noiseSource = null;
    }
    if (this.lfo) {
      this.lfo.stop(now);
      this.lfo = null;
    }
  }
}

/**
 * Factory function to create ambient generators
 */
export function createAmbientGenerator(
  type: AmbientSoundType,
  context: AudioContext
): AmbientGenerator {
  switch (type) {
    case 'waterDrip':
      return new WaterDrip(context);
    case 'electricHum':
      return new ElectricHum(context);
    case 'mechanicalBreath':
      return new MechanicalBreath(context);
    case 'wind':
      return new Wind(context);
  }
}
