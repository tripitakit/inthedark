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
    super(context, 0.85);
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

// ========================================
// GENERATORI FORESTA
// ========================================

/**
 * BirdSong - Cinguettii casuali
 *
 * Sequenze di 2-4 note sinusoidali (2000-4000Hz) a intervalli casuali
 */
class BirdSong extends BaseAmbientGenerator {
  private nextBirdTimeout: number | null = null;

  constructor(context: AudioContext) {
    super(context, 0.15);
  }

  start(): void {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.scheduleBird();
  }

  stop(): void {
    this.isPlaying = false;
    if (this.nextBirdTimeout !== null) {
      clearTimeout(this.nextBirdTimeout);
      this.nextBirdTimeout = null;
    }
  }

  private scheduleBird(): void {
    if (!this.isPlaying) return;

    this.playBirdCall();

    // Random interval: 2-6 seconds
    const delay = 2000 + Math.random() * 4000;
    this.nextBirdTimeout = window.setTimeout(() => this.scheduleBird(), delay);
  }

  private playBirdCall(): void {
    const now = this.context.currentTime;
    const noteCount = 2 + Math.floor(Math.random() * 3); // 2-4 notes
    const baseFreq = 2000 + Math.random() * 1500; // 2000-3500Hz base

    for (let i = 0; i < noteCount; i++) {
      const noteTime = now + i * 0.12;
      const freq = baseFreq * (1 + (Math.random() - 0.5) * 0.3);
      const duration = 0.08 + Math.random() * 0.06;

      const osc = this.context.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, noteTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.9, noteTime + duration);

      const gain = this.context.createGain();
      gain.gain.setValueAtTime(0, noteTime);
      gain.gain.linearRampToValueAtTime(0.3, noteTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.01, noteTime + duration);

      osc.connect(gain);
      gain.connect(this.output);

      osc.start(noteTime);
      osc.stop(noteTime + duration);
    }
  }
}

/**
 * RustlingLeaves - Fruscio foglie
 *
 * Pink noise filtrato (800-2000Hz) con LFO lento per movimento
 */
class RustlingLeaves extends BaseAmbientGenerator {
  private noiseSource: AudioBufferSourceNode | null = null;
  private lfo: OscillatorNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  constructor(context: AudioContext) {
    super(context, 0.25);
    this.noiseBuffer = createPinkNoiseBuffer(context, 10);
  }

  start(): void {
    if (this.isPlaying) return;
    this.isPlaying = true;

    const now = this.context.currentTime;

    this.noiseSource = this.context.createBufferSource();
    this.noiseSource.buffer = this.noiseBuffer;
    this.noiseSource.loop = true;

    // Bandpass per carattere "foglie"
    const filter = this.context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1200;
    filter.Q.value = 0.8;

    // LFO lento per movimento
    this.lfo = this.context.createOscillator();
    this.lfo.type = 'sine';
    this.lfo.frequency.value = 0.15; // ~7 second cycle

    const lfoGain = this.context.createGain();
    lfoGain.gain.value = 0.35;

    const leafGain = this.context.createGain();
    leafGain.gain.value = 0.65;

    // LFO modula filtro
    const lfoToFilter = this.context.createGain();
    lfoToFilter.gain.value = 400;

    this.lfo.connect(lfoGain);
    lfoGain.connect(leafGain.gain);

    this.lfo.connect(lfoToFilter);
    lfoToFilter.connect(filter.frequency);

    this.noiseSource.connect(filter);
    filter.connect(leafGain);
    leafGain.connect(this.output);

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
 * Crickets - Grilli notturni
 *
 * Oscillazione ritmica (4000-6000Hz) con pattern on/off
 */
class Crickets extends BaseAmbientGenerator {
  private oscillator: OscillatorNode | null = null;
  private tremolo: OscillatorNode | null = null;

  constructor(context: AudioContext) {
    super(context, 0.22);
  }

  start(): void {
    if (this.isPlaying) return;
    this.isPlaying = true;

    const now = this.context.currentTime;

    // Oscillatore principale (alta frequenza)
    this.oscillator = this.context.createOscillator();
    this.oscillator.type = 'sine';
    this.oscillator.frequency.value = 4500 + Math.random() * 1000;

    // Tremolo rapido per effetto "cri-cri"
    this.tremolo = this.context.createOscillator();
    this.tremolo.type = 'square';
    this.tremolo.frequency.value = 15 + Math.random() * 10; // 15-25Hz

    const tremoloGain = this.context.createGain();
    tremoloGain.gain.value = 0.5;

    const cricketGain = this.context.createGain();
    cricketGain.gain.value = 0.5;

    // Collegamento tremolo
    this.tremolo.connect(tremoloGain);
    tremoloGain.connect(cricketGain.gain);

    this.oscillator.connect(cricketGain);
    cricketGain.connect(this.output);

    this.oscillator.start(now);
    this.tremolo.start(now);
  }

  stop(): void {
    if (!this.isPlaying) return;
    this.isPlaying = false;

    const now = this.context.currentTime;

    if (this.oscillator) {
      this.oscillator.stop(now);
      this.oscillator = null;
    }
    if (this.tremolo) {
      this.tremolo.stop(now);
      this.tremolo = null;
    }
  }
}

/**
 * StreamFlow - Flusso ruscello
 *
 * White noise filtrato (300-800Hz) con modulazione irregolare
 */
class StreamFlow extends BaseAmbientGenerator {
  private noiseSource: AudioBufferSourceNode | null = null;
  private lfo1: OscillatorNode | null = null;
  private lfo2: OscillatorNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  constructor(context: AudioContext) {
    super(context, 0.25);
    this.noiseBuffer = createWhiteNoiseBuffer(context, 10);
  }

  start(): void {
    if (this.isPlaying) return;
    this.isPlaying = true;

    const now = this.context.currentTime;

    this.noiseSource = this.context.createBufferSource();
    this.noiseSource.buffer = this.noiseBuffer;
    this.noiseSource.loop = true;

    // Bandpass per carattere "acqua"
    const filter = this.context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 500;
    filter.Q.value = 1.5;

    // Due LFO a velocità diverse per movimento organico
    this.lfo1 = this.context.createOscillator();
    this.lfo1.type = 'sine';
    this.lfo1.frequency.value = 0.3;

    this.lfo2 = this.context.createOscillator();
    this.lfo2.type = 'sine';
    this.lfo2.frequency.value = 0.13;

    const lfo1Gain = this.context.createGain();
    lfo1Gain.gain.value = 100;

    const lfo2Gain = this.context.createGain();
    lfo2Gain.gain.value = 0.15;

    const streamGain = this.context.createGain();
    streamGain.gain.value = 0.85;

    this.lfo1.connect(lfo1Gain);
    lfo1Gain.connect(filter.frequency);

    this.lfo2.connect(lfo2Gain);
    lfo2Gain.connect(streamGain.gain);

    this.noiseSource.connect(filter);
    filter.connect(streamGain);
    streamGain.connect(this.output);

    this.noiseSource.start(now);
    this.lfo1.start(now);
    this.lfo2.start(now);
  }

  stop(): void {
    if (!this.isPlaying) return;
    this.isPlaying = false;

    const now = this.context.currentTime;

    if (this.noiseSource) {
      this.noiseSource.stop(now);
      this.noiseSource = null;
    }
    if (this.lfo1) {
      this.lfo1.stop(now);
      this.lfo1 = null;
    }
    if (this.lfo2) {
      this.lfo2.stop(now);
      this.lfo2 = null;
    }
  }
}

// ========================================
// GENERATORI GROTTE
// ========================================

/**
 * CaveEcho - Eco distante
 *
 * Burst di noise occasionali con lungo decay per simulare eco
 */
class CaveEcho extends BaseAmbientGenerator {
  private nextEchoTimeout: number | null = null;

  constructor(context: AudioContext) {
    super(context, 0.22);
  }

  start(): void {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.scheduleEcho();
  }

  stop(): void {
    this.isPlaying = false;
    if (this.nextEchoTimeout !== null) {
      clearTimeout(this.nextEchoTimeout);
      this.nextEchoTimeout = null;
    }
  }

  private scheduleEcho(): void {
    if (!this.isPlaying) return;

    this.playEcho();

    // Random interval: 3-8 seconds
    const delay = 3000 + Math.random() * 5000;
    this.nextEchoTimeout = window.setTimeout(() => this.scheduleEcho(), delay);
  }

  private playEcho(): void {
    const now = this.context.currentTime;
    const duration = 0.8 + Math.random() * 0.4;

    const bufferSize = Math.floor(this.context.sampleRate * 0.05);
    const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / bufferSize * 3);
    }

    const source = this.context.createBufferSource();
    source.buffer = buffer;

    const filter = this.context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 400 + Math.random() * 400;
    filter.Q.value = 3;

    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.output);

    source.start(now);
    source.stop(now + duration);
  }
}

/**
 * PoolRipple - Increspature acqua
 *
 * Noise basso (200-600Hz) con modulazione irregolare
 */
class PoolRipple extends BaseAmbientGenerator {
  private noiseSource: AudioBufferSourceNode | null = null;
  private lfo: OscillatorNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  constructor(context: AudioContext) {
    super(context, 0.15);
    this.noiseBuffer = createWhiteNoiseBuffer(context, 10);
  }

  start(): void {
    if (this.isPlaying) return;
    this.isPlaying = true;

    const now = this.context.currentTime;

    this.noiseSource = this.context.createBufferSource();
    this.noiseSource.buffer = this.noiseBuffer;
    this.noiseSource.loop = true;

    const filter = this.context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 350;
    filter.Q.value = 2;

    this.lfo = this.context.createOscillator();
    this.lfo.type = 'sine';
    this.lfo.frequency.value = 0.4;

    const lfoGain = this.context.createGain();
    lfoGain.gain.value = 100;

    const rippleGain = this.context.createGain();
    rippleGain.gain.value = 0.6;

    this.lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);

    this.noiseSource.connect(filter);
    filter.connect(rippleGain);
    rippleGain.connect(this.output);

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
 * DeepWind - Vento dalle profondita'
 *
 * Pink noise molto basso (50-150Hz) per sensazione di profondita'
 */
class DeepWind extends BaseAmbientGenerator {
  private noiseSource: AudioBufferSourceNode | null = null;
  private lfo: OscillatorNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  constructor(context: AudioContext) {
    super(context, 0.2);
    this.noiseBuffer = createPinkNoiseBuffer(context, 10);
  }

  start(): void {
    if (this.isPlaying) return;
    this.isPlaying = true;

    const now = this.context.currentTime;

    this.noiseSource = this.context.createBufferSource();
    this.noiseSource.buffer = this.noiseBuffer;
    this.noiseSource.loop = true;

    const filter = this.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 120;
    filter.Q.value = 1;

    this.lfo = this.context.createOscillator();
    this.lfo.type = 'sine';
    this.lfo.frequency.value = 0.05; // Very slow

    const lfoGain = this.context.createGain();
    lfoGain.gain.value = 0.25;

    const windGain = this.context.createGain();
    windGain.gain.value = 0.75;

    this.lfo.connect(lfoGain);
    lfoGain.connect(windGain.gain);

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
 * DeepRumble - Rombo geologico
 *
 * Sub-bass (20-60Hz) molto lento per sensazione di instabilita'
 */
class DeepRumble extends BaseAmbientGenerator {
  private oscillator: OscillatorNode | null = null;
  private lfo: OscillatorNode | null = null;

  constructor(context: AudioContext) {
    super(context, 0.15);
  }

  start(): void {
    if (this.isPlaying) return;
    this.isPlaying = true;

    const now = this.context.currentTime;

    this.oscillator = this.context.createOscillator();
    this.oscillator.type = 'sine';
    this.oscillator.frequency.value = 35;

    this.lfo = this.context.createOscillator();
    this.lfo.type = 'sine';
    this.lfo.frequency.value = 0.03; // Very very slow

    const lfoToFreq = this.context.createGain();
    lfoToFreq.gain.value = 15; // 20-50Hz range

    const lfoToGain = this.context.createGain();
    lfoToGain.gain.value = 0.3;

    const rumbleGain = this.context.createGain();
    rumbleGain.gain.value = 0.7;

    this.lfo.connect(lfoToFreq);
    lfoToFreq.connect(this.oscillator.frequency);

    this.lfo.connect(lfoToGain);
    lfoToGain.connect(rumbleGain.gain);

    this.oscillator.connect(rumbleGain);
    rumbleGain.connect(this.output);

    this.oscillator.start(now);
    this.lfo.start(now);
  }

  stop(): void {
    if (!this.isPlaying) return;
    this.isPlaying = false;

    const now = this.context.currentTime;

    if (this.oscillator) {
      this.oscillator.stop(now);
      this.oscillator = null;
    }
    if (this.lfo) {
      this.lfo.stop(now);
      this.lfo = null;
    }
  }
}

/**
 * AlienPulse - Pulsazione aliena
 *
 * Sweep sinusoidale lento (3-4s) per atmosfera misteriosa
 */
class AlienPulse extends BaseAmbientGenerator {
  private oscillator: OscillatorNode | null = null;
  private lfo: OscillatorNode | null = null;

  constructor(context: AudioContext) {
    super(context, 0.25);
  }

  start(): void {
    if (this.isPlaying) return;
    this.isPlaying = true;

    const now = this.context.currentTime;

    this.oscillator = this.context.createOscillator();
    this.oscillator.type = 'sine';
    this.oscillator.frequency.value = 200;

    this.lfo = this.context.createOscillator();
    this.lfo.type = 'sine';
    this.lfo.frequency.value = 0.25; // ~4 second cycle

    const lfoToFreq = this.context.createGain();
    lfoToFreq.gain.value = 150; // 50-350Hz sweep

    const lfoToGain = this.context.createGain();
    lfoToGain.gain.value = 0.4;

    const pulseGain = this.context.createGain();
    pulseGain.gain.value = 0.6;

    this.lfo.connect(lfoToFreq);
    lfoToFreq.connect(this.oscillator.frequency);

    this.lfo.connect(lfoToGain);
    lfoToGain.connect(pulseGain.gain);

    this.oscillator.connect(pulseGain);
    pulseGain.connect(this.output);

    this.oscillator.start(now);
    this.lfo.start(now);
  }

  stop(): void {
    if (!this.isPlaying) return;
    this.isPlaying = false;

    const now = this.context.currentTime;

    if (this.oscillator) {
      this.oscillator.stop(now);
      this.oscillator = null;
    }
    if (this.lfo) {
      this.lfo.stop(now);
      this.lfo = null;
    }
  }
}

// ========================================
// GENERATORI ASTRONAVE
// ========================================

/**
 * AirlockSeal - Sigillo pressurizzazione
 *
 * Hiss + click metallici per effetto camera stagna
 */
class AirlockSeal extends BaseAmbientGenerator {
  private nextSealTimeout: number | null = null;

  constructor(context: AudioContext) {
    super(context, 0.22);
  }

  start(): void {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.scheduleSeal();
  }

  stop(): void {
    this.isPlaying = false;
    if (this.nextSealTimeout !== null) {
      clearTimeout(this.nextSealTimeout);
      this.nextSealTimeout = null;
    }
  }

  private scheduleSeal(): void {
    if (!this.isPlaying) return;
    this.playSeal();
    const delay = 4000 + Math.random() * 6000;
    this.nextSealTimeout = window.setTimeout(() => this.scheduleSeal(), delay);
  }

  private playSeal(): void {
    const now = this.context.currentTime;

    // Hiss (noise filtrato)
    const bufferSize = Math.floor(this.context.sampleRate * 0.3);
    const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      const t = i / bufferSize;
      data[i] = (Math.random() * 2 - 1) * Math.exp(-t * 5);
    }

    const source = this.context.createBufferSource();
    source.buffer = buffer;

    const filter = this.context.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 2000;

    const gain = this.context.createGain();
    gain.gain.value = 0.3;

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.output);

    source.start(now);
    source.stop(now + 0.3);

    // Click metallico
    setTimeout(() => {
      const osc = this.context.createOscillator();
      osc.type = 'square';
      osc.frequency.value = 1500;

      const clickGain = this.context.createGain();
      clickGain.gain.setValueAtTime(0.2, now + 0.25);
      clickGain.gain.exponentialRampToValueAtTime(0.01, now + 0.28);

      osc.connect(clickGain);
      clickGain.connect(this.output);

      osc.start(now + 0.25);
      osc.stop(now + 0.28);
    }, 0);
  }
}

/**
 * PipesCreak - Scricchiolio tubi
 *
 * Noise burst metallico con Q alto
 */
class PipesCreak extends BaseAmbientGenerator {
  private nextCreakTimeout: number | null = null;

  constructor(context: AudioContext) {
    super(context, 0.2);
  }

  start(): void {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.scheduleCreak();
  }

  stop(): void {
    this.isPlaying = false;
    if (this.nextCreakTimeout !== null) {
      clearTimeout(this.nextCreakTimeout);
      this.nextCreakTimeout = null;
    }
  }

  private scheduleCreak(): void {
    if (!this.isPlaying) return;
    this.playCreak();
    const delay = 5000 + Math.random() * 10000;
    this.nextCreakTimeout = window.setTimeout(() => this.scheduleCreak(), delay);
  }

  private playCreak(): void {
    const now = this.context.currentTime;
    const duration = 0.15 + Math.random() * 0.1;

    const bufferSize = Math.floor(this.context.sampleRate * duration);
    const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      const t = i / bufferSize;
      data[i] = (Math.random() * 2 - 1) * Math.sin(t * Math.PI);
    }

    const source = this.context.createBufferSource();
    source.buffer = buffer;

    const filter = this.context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 800 + Math.random() * 600;
    filter.Q.value = 15;

    const gain = this.context.createGain();
    gain.gain.value = 0.4;

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.output);

    source.start(now);
    source.stop(now + duration);
  }
}

/**
 * DormantConsole - Console dormiente
 *
 * Beep acuti quieti e static occasionale
 */
class DormantConsole extends BaseAmbientGenerator {
  private nextBeepTimeout: number | null = null;

  constructor(context: AudioContext) {
    super(context, 0.18);
  }

  start(): void {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.scheduleBeep();
  }

  stop(): void {
    this.isPlaying = false;
    if (this.nextBeepTimeout !== null) {
      clearTimeout(this.nextBeepTimeout);
      this.nextBeepTimeout = null;
    }
  }

  private scheduleBeep(): void {
    if (!this.isPlaying) return;
    this.playBeep();
    const delay = 3000 + Math.random() * 5000;
    this.nextBeepTimeout = window.setTimeout(() => this.scheduleBeep(), delay);
  }

  private playBeep(): void {
    const now = this.context.currentTime;

    const osc = this.context.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 1800 + Math.random() * 400;

    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

    osc.connect(gain);
    gain.connect(this.output);

    osc.start(now);
    osc.stop(now + 0.1);
  }
}

/**
 * ComputerBeep - Beep computer
 *
 * Sequenze di beep 800-1200Hz random
 */
class ComputerBeep extends BaseAmbientGenerator {
  private nextBeepTimeout: number | null = null;

  constructor(context: AudioContext) {
    super(context, 0.2);
  }

  start(): void {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.scheduleBeep();
  }

  stop(): void {
    this.isPlaying = false;
    if (this.nextBeepTimeout !== null) {
      clearTimeout(this.nextBeepTimeout);
      this.nextBeepTimeout = null;
    }
  }

  private scheduleBeep(): void {
    if (!this.isPlaying) return;
    this.playBeepSequence();
    const delay = 4000 + Math.random() * 8000;
    this.nextBeepTimeout = window.setTimeout(() => this.scheduleBeep(), delay);
  }

  private playBeepSequence(): void {
    const now = this.context.currentTime;
    const beepCount = 1 + Math.floor(Math.random() * 3);

    for (let i = 0; i < beepCount; i++) {
      const beepTime = now + i * 0.15;
      const osc = this.context.createOscillator();
      osc.type = 'square';
      osc.frequency.value = 800 + Math.random() * 400;

      const filter = this.context.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 1500;

      const gain = this.context.createGain();
      gain.gain.setValueAtTime(0.12, beepTime);
      gain.gain.setValueAtTime(0.12, beepTime + 0.08);
      gain.gain.linearRampToValueAtTime(0, beepTime + 0.1);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.output);

      osc.start(beepTime);
      osc.stop(beepTime + 0.1);
    }
  }
}

/**
 * DormantMotor - Motore in standby
 *
 * Hum 30-50Hz con wobble lento
 */
class DormantMotor extends BaseAmbientGenerator {
  private oscillator: OscillatorNode | null = null;
  private lfo: OscillatorNode | null = null;

  constructor(context: AudioContext) {
    super(context, 0.15);
  }

  start(): void {
    if (this.isPlaying) return;
    this.isPlaying = true;

    const now = this.context.currentTime;

    this.oscillator = this.context.createOscillator();
    this.oscillator.type = 'sawtooth';
    this.oscillator.frequency.value = 40;

    this.lfo = this.context.createOscillator();
    this.lfo.type = 'sine';
    this.lfo.frequency.value = 0.2;

    const lfoToFreq = this.context.createGain();
    lfoToFreq.gain.value = 5;

    const filter = this.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 80;

    const motorGain = this.context.createGain();
    motorGain.gain.value = 0.8;

    this.lfo.connect(lfoToFreq);
    lfoToFreq.connect(this.oscillator.frequency);

    this.oscillator.connect(filter);
    filter.connect(motorGain);
    motorGain.connect(this.output);

    this.oscillator.start(now);
    this.lfo.start(now);
  }

  stop(): void {
    if (!this.isPlaying) return;
    this.isPlaying = false;

    const now = this.context.currentTime;

    if (this.oscillator) {
      this.oscillator.stop(now);
      this.oscillator = null;
    }
    if (this.lfo) {
      this.lfo.stop(now);
      this.lfo = null;
    }
  }
}

/**
 * Hydraulics - Idraulica
 *
 * Whoosh occasionali con sweep
 */
class Hydraulics extends BaseAmbientGenerator {
  private nextWhooshTimeout: number | null = null;

  constructor(context: AudioContext) {
    super(context, 0.25);
  }

  start(): void {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.scheduleWhoosh();
  }

  stop(): void {
    this.isPlaying = false;
    if (this.nextWhooshTimeout !== null) {
      clearTimeout(this.nextWhooshTimeout);
      this.nextWhooshTimeout = null;
    }
  }

  private scheduleWhoosh(): void {
    if (!this.isPlaying) return;
    this.playWhoosh();
    const delay = 6000 + Math.random() * 8000;
    this.nextWhooshTimeout = window.setTimeout(() => this.scheduleWhoosh(), delay);
  }

  private playWhoosh(): void {
    const now = this.context.currentTime;
    const duration = 0.4;

    const bufferSize = Math.floor(this.context.sampleRate * duration);
    const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      const t = i / bufferSize;
      const envelope = Math.sin(t * Math.PI);
      data[i] = (Math.random() * 2 - 1) * envelope;
    }

    const source = this.context.createBufferSource();
    source.buffer = buffer;

    const filter = this.context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(200, now);
    filter.frequency.exponentialRampToValueAtTime(800, now + duration / 2);
    filter.frequency.exponentialRampToValueAtTime(200, now + duration);
    filter.Q.value = 3;

    const gain = this.context.createGain();
    gain.gain.value = 0.5;

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.output);

    source.start(now);
    source.stop(now + duration);
  }
}

/**
 * AlienReactor - Reattore alieno
 *
 * Hum complesso 60Hz + armonici con carattere alieno
 */
class AlienReactor extends BaseAmbientGenerator {
  private oscillators: OscillatorNode[] = [];
  private lfo: OscillatorNode | null = null;

  constructor(context: AudioContext) {
    super(context, 0.18);
  }

  start(): void {
    if (this.isPlaying) return;
    this.isPlaying = true;

    const now = this.context.currentTime;
    const baseFreq = 60;

    // Armonici alieni (non standard)
    const harmonics = [1, 1.5, 2.3, 3.7, 5.1];

    for (const h of harmonics) {
      const osc = this.context.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = baseFreq * h;

      const gain = this.context.createGain();
      gain.gain.value = 0.15 / h;

      osc.connect(gain);
      gain.connect(this.output);

      osc.start(now);
      this.oscillators.push(osc);
    }

    // LFO per pulsazione
    this.lfo = this.context.createOscillator();
    this.lfo.type = 'sine';
    this.lfo.frequency.value = 0.5;

    const lfoGain = this.context.createGain();
    lfoGain.gain.value = 0.3;

    this.lfo.connect(lfoGain);
    lfoGain.connect(this.output.gain);

    this.lfo.start(now);
  }

  stop(): void {
    if (!this.isPlaying) return;
    this.isPlaying = false;

    const now = this.context.currentTime;

    for (const osc of this.oscillators) {
      osc.stop(now);
    }
    this.oscillators = [];

    if (this.lfo) {
      this.lfo.stop(now);
      this.lfo = null;
    }
  }
}

/**
 * EnergyPulse - Flusso energia
 *
 * Sweep ascendente/discendente continuo
 */
class EnergyPulse extends BaseAmbientGenerator {
  private oscillator: OscillatorNode | null = null;
  private lfo: OscillatorNode | null = null;

  constructor(context: AudioContext) {
    super(context, 0.22);
  }

  start(): void {
    if (this.isPlaying) return;
    this.isPlaying = true;

    const now = this.context.currentTime;

    this.oscillator = this.context.createOscillator();
    this.oscillator.type = 'sine';
    this.oscillator.frequency.value = 300;

    this.lfo = this.context.createOscillator();
    this.lfo.type = 'triangle';
    this.lfo.frequency.value = 0.3;

    const lfoToFreq = this.context.createGain();
    lfoToFreq.gain.value = 200;

    const pulseGain = this.context.createGain();
    pulseGain.gain.value = 0.6;

    this.lfo.connect(lfoToFreq);
    lfoToFreq.connect(this.oscillator.frequency);

    this.oscillator.connect(pulseGain);
    pulseGain.connect(this.output);

    this.oscillator.start(now);
    this.lfo.start(now);
  }

  stop(): void {
    if (!this.isPlaying) return;
    this.isPlaying = false;

    const now = this.context.currentTime;

    if (this.oscillator) {
      this.oscillator.stop(now);
      this.oscillator = null;
    }
    if (this.lfo) {
      this.lfo.stop(now);
      this.lfo = null;
    }
  }
}

/**
 * ShipAmbient - Ambiente nave base
 *
 * Mix di hum + aria per background costante
 */
class ShipAmbient extends BaseAmbientGenerator {
  private noiseSource: AudioBufferSourceNode | null = null;
  private oscillator: OscillatorNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  constructor(context: AudioContext) {
    super(context, 0.25);
    this.noiseBuffer = createPinkNoiseBuffer(context, 10);
  }

  start(): void {
    if (this.isPlaying) return;
    this.isPlaying = true;

    const now = this.context.currentTime;

    // Noise per aria
    this.noiseSource = this.context.createBufferSource();
    this.noiseSource.buffer = this.noiseBuffer;
    this.noiseSource.loop = true;

    const noiseFilter = this.context.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = 400;
    noiseFilter.Q.value = 0.5;

    const noiseGain = this.context.createGain();
    noiseGain.gain.value = 0.3;

    // Hum basso
    this.oscillator = this.context.createOscillator();
    this.oscillator.type = 'sine';
    this.oscillator.frequency.value = 55;

    const humGain = this.context.createGain();
    humGain.gain.value = 0.4;

    this.noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.output);

    this.oscillator.connect(humGain);
    humGain.connect(this.output);

    this.noiseSource.start(now);
    this.oscillator.start(now);
  }

  stop(): void {
    if (!this.isPlaying) return;
    this.isPlaying = false;

    const now = this.context.currentTime;

    if (this.noiseSource) {
      this.noiseSource.stop(now);
      this.noiseSource = null;
    }
    if (this.oscillator) {
      this.oscillator.stop(now);
      this.oscillator = null;
    }
  }
}

/**
 * MetalCreak - Scricchiolio metallo
 *
 * Risonanza metallica random
 */
class MetalCreak extends BaseAmbientGenerator {
  private nextCreakTimeout: number | null = null;

  constructor(context: AudioContext) {
    super(context, 0.2);
  }

  start(): void {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.scheduleCreak();
  }

  stop(): void {
    this.isPlaying = false;
    if (this.nextCreakTimeout !== null) {
      clearTimeout(this.nextCreakTimeout);
      this.nextCreakTimeout = null;
    }
  }

  private scheduleCreak(): void {
    if (!this.isPlaying) return;
    this.playCreak();
    const delay = 8000 + Math.random() * 12000;
    this.nextCreakTimeout = window.setTimeout(() => this.scheduleCreak(), delay);
  }

  private playCreak(): void {
    const now = this.context.currentTime;
    const freq = 200 + Math.random() * 300;

    const osc = this.context.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.7, now + 0.2);

    const filter = this.context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = freq;
    filter.Q.value = 20;

    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.output);

    osc.start(now);
    osc.stop(now + 0.25);
  }
}

/**
 * StaticBurst - Scarica statica
 *
 * White noise burst brevi
 */
class StaticBurst extends BaseAmbientGenerator {
  private nextBurstTimeout: number | null = null;

  constructor(context: AudioContext) {
    super(context, 0.18);
  }

  start(): void {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.scheduleBurst();
  }

  stop(): void {
    this.isPlaying = false;
    if (this.nextBurstTimeout !== null) {
      clearTimeout(this.nextBurstTimeout);
      this.nextBurstTimeout = null;
    }
  }

  private scheduleBurst(): void {
    if (!this.isPlaying) return;
    this.playBurst();
    const delay = 5000 + Math.random() * 10000;
    this.nextBurstTimeout = window.setTimeout(() => this.scheduleBurst(), delay);
  }

  private playBurst(): void {
    const now = this.context.currentTime;
    const duration = 0.1 + Math.random() * 0.2;

    const bufferSize = Math.floor(this.context.sampleRate * duration);
    const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1);
    }

    const source = this.context.createBufferSource();
    source.buffer = buffer;

    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

    source.connect(gain);
    gain.connect(this.output);

    source.start(now);
    source.stop(now + duration);
  }
}

/**
 * AlienVoice - Voci aliene
 *
 * Formant synthesis con suoni vocali distorti
 */
class AlienVoice extends BaseAmbientGenerator {
  private nextVoiceTimeout: number | null = null;

  constructor(context: AudioContext) {
    super(context, 0.15);
  }

  start(): void {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.scheduleVoice();
  }

  stop(): void {
    this.isPlaying = false;
    if (this.nextVoiceTimeout !== null) {
      clearTimeout(this.nextVoiceTimeout);
      this.nextVoiceTimeout = null;
    }
  }

  private scheduleVoice(): void {
    if (!this.isPlaying) return;
    this.playVoice();
    const delay = 4000 + Math.random() * 6000;
    this.nextVoiceTimeout = window.setTimeout(() => this.scheduleVoice(), delay);
  }

  private playVoice(): void {
    const now = this.context.currentTime;
    const duration = 0.5 + Math.random() * 0.5;

    // Formant frequencies per suono "alieno"
    const formants = [300, 700, 1500, 2500];

    const source = this.context.createOscillator();
    source.type = 'sawtooth';
    source.frequency.setValueAtTime(80 + Math.random() * 40, now);
    source.frequency.linearRampToValueAtTime(60 + Math.random() * 50, now + duration);

    const masterGain = this.context.createGain();
    masterGain.gain.setValueAtTime(0.2, now);
    masterGain.gain.linearRampToValueAtTime(0.01, now + duration);

    for (const freq of formants) {
      const filter = this.context.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = freq * (0.8 + Math.random() * 0.4);
      filter.Q.value = 8 + Math.random() * 5;

      const formantGain = this.context.createGain();
      formantGain.gain.value = 0.25;

      source.connect(filter);
      filter.connect(formantGain);
      formantGain.connect(masterGain);
    }

    masterGain.connect(this.output);

    source.start(now);
    source.stop(now + duration);
  }
}

/**
 * EtherealMusic - Musica eterea
 *
 * Pad sintetici lenti con armonici alieni
 */
class EtherealMusic extends BaseAmbientGenerator {
  private oscillators: OscillatorNode[] = [];
  private lfo: OscillatorNode | null = null;

  constructor(context: AudioContext) {
    super(context, 0.22);
  }

  start(): void {
    if (this.isPlaying) return;
    this.isPlaying = true;

    const now = this.context.currentTime;

    // Accordo etereo (frequenze non standard)
    const frequencies = [220, 277, 330, 415, 554];

    for (const freq of frequencies) {
      const osc = this.context.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;

      const gain = this.context.createGain();
      gain.gain.value = 0.08;

      osc.connect(gain);
      gain.connect(this.output);

      osc.start(now);
      this.oscillators.push(osc);
    }

    // LFO per shimmer
    this.lfo = this.context.createOscillator();
    this.lfo.type = 'sine';
    this.lfo.frequency.value = 0.1;

    const lfoGain = this.context.createGain();
    lfoGain.gain.value = 0.2;

    this.lfo.connect(lfoGain);
    lfoGain.connect(this.output.gain);

    this.lfo.start(now);
  }

  stop(): void {
    if (!this.isPlaying) return;
    this.isPlaying = false;

    const now = this.context.currentTime;

    for (const osc of this.oscillators) {
      osc.stop(now);
    }
    this.oscillators = [];

    if (this.lfo) {
      this.lfo.stop(now);
      this.lfo = null;
    }
  }
}

// ========================================
// GENERATORI TEMPIO ANTICO
// ========================================

/**
 * StoneEcho - Eco di pietra con riverbero lungo
 *
 * Noise burst occasionali con decay 2-4s per simulare eco in stanze di pietra
 */
class StoneEcho extends BaseAmbientGenerator {
  private nextEchoTimeout: number | null = null;

  constructor(context: AudioContext) {
    super(context, 0.25);
  }

  start(): void {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.scheduleEcho();
  }

  stop(): void {
    this.isPlaying = false;
    if (this.nextEchoTimeout !== null) {
      clearTimeout(this.nextEchoTimeout);
      this.nextEchoTimeout = null;
    }
  }

  private scheduleEcho(): void {
    if (!this.isPlaying) return;
    this.playEcho();
    const delay = 4000 + Math.random() * 6000;
    this.nextEchoTimeout = window.setTimeout(() => this.scheduleEcho(), delay);
  }

  private playEcho(): void {
    const now = this.context.currentTime;
    const duration = 2 + Math.random() * 2; // 2-4 seconds decay

    const bufferSize = Math.floor(this.context.sampleRate * 0.08);
    const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / bufferSize * 4);
    }

    const source = this.context.createBufferSource();
    source.buffer = buffer;

    // Stone-like bandpass filter
    const filter = this.context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 300 + Math.random() * 300;
    filter.Q.value = 2;

    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.output);

    source.start(now);
    source.stop(now + duration);
  }
}

/**
 * ChantingWhisper - Voci cantanti distanti
 *
 * Formant synthesis con intervalli atonali per atmosfera mistica
 */
class ChantingWhisper extends BaseAmbientGenerator {
  private nextChantTimeout: number | null = null;

  constructor(context: AudioContext) {
    super(context, 0.2);
  }

  start(): void {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.scheduleChant();
  }

  stop(): void {
    this.isPlaying = false;
    if (this.nextChantTimeout !== null) {
      clearTimeout(this.nextChantTimeout);
      this.nextChantTimeout = null;
    }
  }

  private scheduleChant(): void {
    if (!this.isPlaying) return;
    this.playChant();
    const delay = 3000 + Math.random() * 5000;
    this.nextChantTimeout = window.setTimeout(() => this.scheduleChant(), delay);
  }

  private playChant(): void {
    const now = this.context.currentTime;
    const duration = 1.5 + Math.random() * 1.5;

    // Atonal formant frequencies
    const formants = [250, 600, 1200, 2400];
    const baseFreq = 100 + Math.random() * 50;

    const source = this.context.createOscillator();
    source.type = 'sawtooth';
    source.frequency.setValueAtTime(baseFreq, now);
    source.frequency.linearRampToValueAtTime(baseFreq * 0.9, now + duration);

    const masterGain = this.context.createGain();
    masterGain.gain.setValueAtTime(0, now);
    masterGain.gain.linearRampToValueAtTime(0.15, now + 0.3);
    masterGain.gain.setValueAtTime(0.15, now + duration - 0.3);
    masterGain.gain.linearRampToValueAtTime(0.01, now + duration);

    for (const freq of formants) {
      const filter = this.context.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = freq * (0.85 + Math.random() * 0.3);
      filter.Q.value = 12;

      const formantGain = this.context.createGain();
      formantGain.gain.value = 0.2;

      source.connect(filter);
      filter.connect(formantGain);
      formantGain.connect(masterGain);
    }

    masterGain.connect(this.output);

    source.start(now);
    source.stop(now + duration);
  }
}

/**
 * CorridorWind - Vento nei corridoi
 *
 * Pink noise filtrato basso (100-400Hz) con LFO lento per effetto sinistro
 */
class CorridorWind extends BaseAmbientGenerator {
  private noiseSource: AudioBufferSourceNode | null = null;
  private lfo: OscillatorNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  constructor(context: AudioContext) {
    super(context, 0.18);
    this.noiseBuffer = createPinkNoiseBuffer(context, 10);
  }

  start(): void {
    if (this.isPlaying) return;
    this.isPlaying = true;

    const now = this.context.currentTime;

    this.noiseSource = this.context.createBufferSource();
    this.noiseSource.buffer = this.noiseBuffer;
    this.noiseSource.loop = true;

    // Low bandpass for eerie corridor wind
    const filter = this.context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 200;
    filter.Q.value = 1;

    // Slow LFO for movement
    this.lfo = this.context.createOscillator();
    this.lfo.type = 'sine';
    this.lfo.frequency.value = 0.06;

    const lfoGain = this.context.createGain();
    lfoGain.gain.value = 0.35;

    const windGain = this.context.createGain();
    windGain.gain.value = 0.65;

    const lfoToFilter = this.context.createGain();
    lfoToFilter.gain.value = 100;

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
 * RitualBells - Campane rituali
 *
 * Sine 400-800Hz con lungo decay per risonanza metallica occasionale
 */
class RitualBells extends BaseAmbientGenerator {
  private nextBellTimeout: number | null = null;

  constructor(context: AudioContext) {
    super(context, 0.25);
  }

  start(): void {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.scheduleBell();
  }

  stop(): void {
    this.isPlaying = false;
    if (this.nextBellTimeout !== null) {
      clearTimeout(this.nextBellTimeout);
      this.nextBellTimeout = null;
    }
  }

  private scheduleBell(): void {
    if (!this.isPlaying) return;
    this.playBell();
    const delay = 6000 + Math.random() * 10000;
    this.nextBellTimeout = window.setTimeout(() => this.scheduleBell(), delay);
  }

  private playBell(): void {
    const now = this.context.currentTime;
    const baseFreq = 400 + Math.random() * 400;
    const duration = 2 + Math.random() * 1.5;

    // Main bell tone
    const osc1 = this.context.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.value = baseFreq;

    // Overtone
    const osc2 = this.context.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = baseFreq * 2.4;

    // Third partial
    const osc3 = this.context.createOscillator();
    osc3.type = 'sine';
    osc3.frequency.value = baseFreq * 5.4;

    const gain1 = this.context.createGain();
    gain1.gain.setValueAtTime(0.25, now);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + duration);

    const gain2 = this.context.createGain();
    gain2.gain.setValueAtTime(0.12, now);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + duration * 0.7);

    const gain3 = this.context.createGain();
    gain3.gain.setValueAtTime(0.06, now);
    gain3.gain.exponentialRampToValueAtTime(0.01, now + duration * 0.4);

    osc1.connect(gain1);
    osc2.connect(gain2);
    osc3.connect(gain3);
    gain1.connect(this.output);
    gain2.connect(this.output);
    gain3.connect(this.output);

    osc1.start(now);
    osc2.start(now);
    osc3.start(now);
    osc1.stop(now + duration);
    osc2.stop(now + duration * 0.7);
    osc3.stop(now + duration * 0.4);
  }
}

/**
 * AncientHum - Energia antica del tempio
 *
 * 40Hz base con armonici alieni per atmosfera mistica tecnologica
 */
class AncientHum extends BaseAmbientGenerator {
  private oscillators: OscillatorNode[] = [];
  private lfo: OscillatorNode | null = null;

  constructor(context: AudioContext) {
    super(context, 0.15);
  }

  start(): void {
    if (this.isPlaying) return;
    this.isPlaying = true;

    const now = this.context.currentTime;
    const baseFreq = 40;

    // Ancient non-standard harmonics
    const harmonics = [1, 1.618, 2.618, 4.236]; // Golden ratio based

    for (const h of harmonics) {
      const osc = this.context.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = baseFreq * h;

      const gain = this.context.createGain();
      gain.gain.value = 0.15 / h;

      osc.connect(gain);
      gain.connect(this.output);

      osc.start(now);
      this.oscillators.push(osc);
    }

    // Slow pulsation LFO
    this.lfo = this.context.createOscillator();
    this.lfo.type = 'sine';
    this.lfo.frequency.value = 0.08;

    const lfoGain = this.context.createGain();
    lfoGain.gain.value = 0.25;

    this.lfo.connect(lfoGain);
    lfoGain.connect(this.output.gain);

    this.lfo.start(now);
  }

  stop(): void {
    if (!this.isPlaying) return;
    this.isPlaying = false;

    const now = this.context.currentTime;

    for (const osc of this.oscillators) {
      osc.stop(now);
    }
    this.oscillators = [];

    if (this.lfo) {
      this.lfo.stop(now);
      this.lfo = null;
    }
  }
}

/**
 * StoneDrip - Gocce su pietra
 *
 * Simile a WaterDrip ma con pitch più alto e risonanza per superficie di pietra
 */
class StoneDrip extends BaseAmbientGenerator {
  private nextDripTimeout: number | null = null;

  constructor(context: AudioContext) {
    super(context, 0.8);
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
    const delay = 800 + Math.random() * 3000;
    this.nextDripTimeout = window.setTimeout(() => this.scheduleDrip(), delay);
  }

  private playDrip(): void {
    const now = this.context.currentTime;
    const duration = 0.04 + Math.random() * 0.03;

    const bufferSize = Math.floor(this.context.sampleRate * duration);
    const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      const t = i / bufferSize;
      const envelope = Math.exp(-t * 25);
      data[i] = (Math.random() * 2 - 1) * envelope;
    }

    const source = this.context.createBufferSource();
    source.buffer = buffer;

    // Higher pitched filter for stone resonance
    const filter = this.context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 2000 + Math.random() * 2000;
    filter.Q.value = 15;

    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0.4 + Math.random() * 0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + duration * 2);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.output);

    source.start(now);
    source.stop(now + duration * 2);
  }
}

// ========================================
// GENERATORI REGNO CELESTE
// ========================================

/**
 * CrystalHarmonic - Armonici cristallini
 *
 * Multiple sine detuned per letto tonale costante e celestiale
 */
class CrystalHarmonic extends BaseAmbientGenerator {
  private oscillators: OscillatorNode[] = [];

  constructor(context: AudioContext) {
    super(context, 0.22);
  }

  start(): void {
    if (this.isPlaying) return;
    this.isPlaying = true;

    const now = this.context.currentTime;

    // Crystal frequencies with slight detuning
    const baseFreqs = [880, 1100, 1320, 1760, 2200];
    const detune = [-8, 3, -5, 7, -3];

    for (let i = 0; i < baseFreqs.length; i++) {
      const osc = this.context.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = baseFreqs[i];
      osc.detune.value = detune[i];

      const gain = this.context.createGain();
      gain.gain.value = 0.08 - i * 0.01;

      osc.connect(gain);
      gain.connect(this.output);

      osc.start(now);
      this.oscillators.push(osc);
    }
  }

  stop(): void {
    if (!this.isPlaying) return;
    this.isPlaying = false;

    const now = this.context.currentTime;

    for (const osc of this.oscillators) {
      osc.stop(now);
    }
    this.oscillators = [];
  }
}

/**
 * VoidWhisper - Sussurri del vuoto
 *
 * Formant invertiti molto quieti per voci incomprensibili
 */
class VoidWhisper extends BaseAmbientGenerator {
  private nextWhisperTimeout: number | null = null;

  constructor(context: AudioContext) {
    super(context, 0.18);
  }

  start(): void {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.scheduleWhisper();
  }

  stop(): void {
    this.isPlaying = false;
    if (this.nextWhisperTimeout !== null) {
      clearTimeout(this.nextWhisperTimeout);
      this.nextWhisperTimeout = null;
    }
  }

  private scheduleWhisper(): void {
    if (!this.isPlaying) return;
    this.playWhisper();
    const delay = 5000 + Math.random() * 8000;
    this.nextWhisperTimeout = window.setTimeout(() => this.scheduleWhisper(), delay);
  }

  private playWhisper(): void {
    const now = this.context.currentTime;
    const duration = 1 + Math.random() * 1.5;

    // Reversed formant effect - high to low
    const source = this.context.createOscillator();
    source.type = 'sawtooth';
    source.frequency.setValueAtTime(150, now);
    source.frequency.linearRampToValueAtTime(80, now + duration);

    const filter1 = this.context.createBiquadFilter();
    filter1.type = 'bandpass';
    filter1.frequency.setValueAtTime(2000, now);
    filter1.frequency.linearRampToValueAtTime(400, now + duration);
    filter1.Q.value = 8;

    const filter2 = this.context.createBiquadFilter();
    filter2.type = 'bandpass';
    filter2.frequency.setValueAtTime(1200, now);
    filter2.frequency.linearRampToValueAtTime(200, now + duration);
    filter2.Q.value = 6;

    const masterGain = this.context.createGain();
    masterGain.gain.setValueAtTime(0, now);
    masterGain.gain.linearRampToValueAtTime(0.12, now + 0.2);
    masterGain.gain.setValueAtTime(0.12, now + duration - 0.3);
    masterGain.gain.linearRampToValueAtTime(0.01, now + duration);

    source.connect(filter1);
    source.connect(filter2);
    filter1.connect(masterGain);
    filter2.connect(masterGain);
    masterGain.connect(this.output);

    source.start(now);
    source.stop(now + duration);
  }
}

/**
 * EnergyStream - Flusso di energia
 *
 * Sweep filtrato 200-1000Hz per effetto energia direzionale
 */
class EnergyStream extends BaseAmbientGenerator {
  private noiseSource: AudioBufferSourceNode | null = null;
  private lfo: OscillatorNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  constructor(context: AudioContext) {
    super(context, 0.25);
    this.noiseBuffer = createPinkNoiseBuffer(context, 10);
  }

  start(): void {
    if (this.isPlaying) return;
    this.isPlaying = true;

    const now = this.context.currentTime;

    this.noiseSource = this.context.createBufferSource();
    this.noiseSource.buffer = this.noiseBuffer;
    this.noiseSource.loop = true;

    const filter = this.context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 500;
    filter.Q.value = 2;

    // LFO sweeps the filter
    this.lfo = this.context.createOscillator();
    this.lfo.type = 'triangle';
    this.lfo.frequency.value = 0.15;

    const lfoToFilter = this.context.createGain();
    lfoToFilter.gain.value = 350;

    const streamGain = this.context.createGain();
    streamGain.gain.value = 0.6;

    this.lfo.connect(lfoToFilter);
    lfoToFilter.connect(filter.frequency);

    this.noiseSource.connect(filter);
    filter.connect(streamGain);
    streamGain.connect(this.output);

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
 * CosmicPulse - Pulsazioni cosmiche
 *
 * 20-40Hz pulsazioni profonde con ciclo 4-8s
 */
class CosmicPulse extends BaseAmbientGenerator {
  private oscillator: OscillatorNode | null = null;
  private lfo: OscillatorNode | null = null;

  constructor(context: AudioContext) {
    super(context, 0.18);
  }

  start(): void {
    if (this.isPlaying) return;
    this.isPlaying = true;

    const now = this.context.currentTime;

    this.oscillator = this.context.createOscillator();
    this.oscillator.type = 'sine';
    this.oscillator.frequency.value = 30;

    // Very slow LFO for cosmic rhythm
    this.lfo = this.context.createOscillator();
    this.lfo.type = 'sine';
    this.lfo.frequency.value = 0.15; // ~6-7 second cycle

    const lfoToFreq = this.context.createGain();
    lfoToFreq.gain.value = 10; // 20-40Hz range

    const lfoToGain = this.context.createGain();
    lfoToGain.gain.value = 0.4;

    const pulseGain = this.context.createGain();
    pulseGain.gain.value = 0.6;

    this.lfo.connect(lfoToFreq);
    lfoToFreq.connect(this.oscillator.frequency);

    this.lfo.connect(lfoToGain);
    lfoToGain.connect(pulseGain.gain);

    this.oscillator.connect(pulseGain);
    pulseGain.connect(this.output);

    this.oscillator.start(now);
    this.lfo.start(now);
  }

  stop(): void {
    if (!this.isPlaying) return;
    this.isPlaying = false;

    const now = this.context.currentTime;

    if (this.oscillator) {
      this.oscillator.stop(now);
      this.oscillator = null;
    }
    if (this.lfo) {
      this.lfo.stop(now);
      this.lfo = null;
    }
  }
}

/**
 * HarmonicResonance - Risonanza armonica ultraterrena
 *
 * Intervalli non standard per atmosfera celestiale aliena
 */
class HarmonicResonance extends BaseAmbientGenerator {
  private oscillators: OscillatorNode[] = [];
  private lfo: OscillatorNode | null = null;

  constructor(context: AudioContext) {
    super(context, 0.22);
  }

  start(): void {
    if (this.isPlaying) return;
    this.isPlaying = true;

    const now = this.context.currentTime;

    // Non-standard harmonic series (microtonal)
    const frequencies = [220, 293, 366, 440, 550, 660];

    for (const freq of frequencies) {
      const osc = this.context.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;

      const gain = this.context.createGain();
      gain.gain.value = 0.06;

      osc.connect(gain);
      gain.connect(this.output);

      osc.start(now);
      this.oscillators.push(osc);
    }

    // Slow shimmer
    this.lfo = this.context.createOscillator();
    this.lfo.type = 'sine';
    this.lfo.frequency.value = 0.05;

    const lfoGain = this.context.createGain();
    lfoGain.gain.value = 0.15;

    this.lfo.connect(lfoGain);
    lfoGain.connect(this.output.gain);

    this.lfo.start(now);
  }

  stop(): void {
    if (!this.isPlaying) return;
    this.isPlaying = false;

    const now = this.context.currentTime;

    for (const osc of this.oscillators) {
      osc.stop(now);
    }
    this.oscillators = [];

    if (this.lfo) {
      this.lfo.stop(now);
      this.lfo = null;
    }
  }
}

/**
 * EtherealShimmer - Scintillio etereo
 *
 * Alte frequenze (3000-8000Hz) per effetto scintillante celestiale
 */
class EtherealShimmer extends BaseAmbientGenerator {
  private nextShimmerTimeout: number | null = null;

  constructor(context: AudioContext) {
    super(context, 0.18);
  }

  start(): void {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.scheduleShimmer();
  }

  stop(): void {
    this.isPlaying = false;
    if (this.nextShimmerTimeout !== null) {
      clearTimeout(this.nextShimmerTimeout);
      this.nextShimmerTimeout = null;
    }
  }

  private scheduleShimmer(): void {
    if (!this.isPlaying) return;
    this.playShimmer();
    const delay = 200 + Math.random() * 400;
    this.nextShimmerTimeout = window.setTimeout(() => this.scheduleShimmer(), delay);
  }

  private playShimmer(): void {
    const now = this.context.currentTime;
    const freq = 3000 + Math.random() * 5000;
    const duration = 0.1 + Math.random() * 0.15;

    const osc = this.context.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;

    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.08 + Math.random() * 0.06, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

    osc.connect(gain);
    gain.connect(this.output);

    osc.start(now);
    osc.stop(now + duration);
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
    // Base
    case 'waterDrip':
      return new WaterDrip(context);
    case 'electricHum':
      return new ElectricHum(context);
    case 'mechanicalBreath':
      return new MechanicalBreath(context);
    case 'wind':
      return new Wind(context);
    // Foresta
    case 'birdSong':
      return new BirdSong(context);
    case 'rustlingLeaves':
      return new RustlingLeaves(context);
    case 'crickets':
      return new Crickets(context);
    case 'streamFlow':
      return new StreamFlow(context);
    // Grotte
    case 'caveEcho':
      return new CaveEcho(context);
    case 'poolRipple':
      return new PoolRipple(context);
    case 'deepWind':
      return new DeepWind(context);
    case 'deepRumble':
      return new DeepRumble(context);
    case 'alienPulse':
      return new AlienPulse(context);
    // Astronave
    case 'airlockSeal':
      return new AirlockSeal(context);
    case 'pipesCreak':
      return new PipesCreak(context);
    case 'dormantConsole':
      return new DormantConsole(context);
    case 'computerBeep':
      return new ComputerBeep(context);
    case 'dormantMotor':
      return new DormantMotor(context);
    case 'hydraulics':
      return new Hydraulics(context);
    case 'alienReactor':
      return new AlienReactor(context);
    case 'energyPulse':
      return new EnergyPulse(context);
    case 'shipAmbient':
      return new ShipAmbient(context);
    case 'metalCreak':
      return new MetalCreak(context);
    case 'staticBurst':
      return new StaticBurst(context);
    case 'alienVoice':
      return new AlienVoice(context);
    case 'etherealMusic':
      return new EtherealMusic(context);
    // Temple
    case 'stoneEcho':
      return new StoneEcho(context);
    case 'chantingWhisper':
      return new ChantingWhisper(context);
    case 'corridorWind':
      return new CorridorWind(context);
    case 'ritualBells':
      return new RitualBells(context);
    case 'ancientHum':
      return new AncientHum(context);
    case 'stoneDrip':
      return new StoneDrip(context);
    // Celestial
    case 'crystalHarmonic':
      return new CrystalHarmonic(context);
    case 'voidWhisper':
      return new VoidWhisper(context);
    case 'energyStream':
      return new EnergyStream(context);
    case 'cosmicPulse':
      return new CosmicPulse(context);
    case 'harmonicResonance':
      return new HarmonicResonance(context);
    case 'etherealShimmer':
      return new EtherealShimmer(context);
    // Fallback
    default:
      console.warn(`Generator '${type}' not implemented, using wind as fallback`);
      return new Wind(context);
  }
}
