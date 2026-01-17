import type { SurfaceType } from '../types';

/**
 * Surface-specific footstep parameters
 */
interface SurfaceParams {
  filterType: BiquadFilterType;
  filterFreq: number;
  filterQ: number;
  decay: number;        // Envelope decay rate
  duration: number;     // Sound duration
  gain: number;         // Volume
  pitchOffset: number;  // Adds tonal component (0 = none)
}

/**
 * Footstep sound parameters by surface type
 */
const SURFACE_PARAMS: Record<SurfaceType, SurfaceParams> = {
  stone: {
    filterType: 'bandpass',
    filterFreq: 500,
    filterQ: 2,
    decay: 20,
    duration: 0.12,
    gain: 0.5,
    pitchOffset: 0,
  },
  metal: {
    filterType: 'highpass',
    filterFreq: 800,
    filterQ: 3,
    decay: 12,
    duration: 0.18,
    gain: 0.45,
    pitchOffset: 1200,  // Metallic ring
  },
  grass: {
    filterType: 'lowpass',
    filterFreq: 400,
    filterQ: 0.5,
    decay: 30,
    duration: 0.08,
    gain: 0.35,
    pitchOffset: 0,
  },
  water: {
    filterType: 'bandpass',
    filterFreq: 350,
    filterQ: 1,
    decay: 8,
    duration: 0.25,
    gain: 0.4,
    pitchOffset: 0,
  },
  wood: {
    filterType: 'bandpass',
    filterFreq: 800,
    filterQ: 4,
    decay: 15,
    duration: 0.15,
    gain: 0.45,
    pitchOffset: 300,  // Hollow resonance
  },
  carpet: {
    filterType: 'lowpass',
    filterFreq: 200,
    filterQ: 0.5,
    decay: 35,
    duration: 0.06,
    gain: 0.25,
    pitchOffset: 0,
  },
  crystal: {
    filterType: 'highpass',
    filterFreq: 2000,
    filterQ: 5,
    decay: 6,
    duration: 0.3,
    gain: 0.35,
    pitchOffset: 2400,  // High crystalline ring
  },
};

/**
 * GameFeedback - UI and game feedback sounds
 *
 * Sounds for movement, item pickup, unlocking, errors, etc.
 */
export class GameFeedback {
  private context: AudioContext;
  private masterGain: GainNode;

  constructor(context: AudioContext, masterGain: GainNode) {
    this.context = context;
    this.masterGain = masterGain;
  }

  /**
   * Update the audio context reference
   */
  setContext(context: AudioContext, masterGain: GainNode): void {
    this.context = context;
    this.masterGain = masterGain;
  }

  // ========================================
  // MOVEMENT SOUNDS
  // ========================================

  /** Play a single footstep at a specific time with surface-specific sound */
  playFootstepAt(startTime: number, surface: SurfaceType = 'stone'): void {
    const params = SURFACE_PARAMS[surface];
    const bufferSize = Math.floor(this.context.sampleRate * params.duration);
    const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
    const data = buffer.getChannelData(0);

    // Generate noise with surface-specific envelope
    for (let i = 0; i < bufferSize; i++) {
      const t = i / bufferSize;
      const envelope = Math.exp(-t * params.decay);
      data[i] = (Math.random() * 2 - 1) * envelope;
    }

    const source = this.context.createBufferSource();
    source.buffer = buffer;

    // Surface-specific filter
    const filter = this.context.createBiquadFilter();
    filter.type = params.filterType;
    filter.frequency.value = params.filterFreq;
    filter.Q.value = params.filterQ;

    const gain = this.context.createGain();
    gain.gain.value = params.gain;

    source.connect(filter);
    filter.connect(gain);

    // Add tonal component for resonant surfaces (metal, wood, crystal)
    if (params.pitchOffset > 0) {
      const osc = this.context.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = params.pitchOffset;

      const oscGain = this.context.createGain();
      oscGain.gain.setValueAtTime(params.gain * 0.3, startTime);
      oscGain.gain.exponentialRampToValueAtTime(0.01, startTime + params.duration);

      osc.connect(oscGain);
      oscGain.connect(this.masterGain);

      osc.start(startTime);
      osc.stop(startTime + params.duration);
    }

    gain.connect(this.masterGain);

    source.start(startTime);
    source.stop(startTime + params.duration);
  }

  /** Play a single footstep immediately */
  playFootstep(surface: SurfaceType = 'stone'): void {
    this.playFootstepAt(this.context.currentTime, surface);
  }

  /** Play 4 footsteps with interval */
  playFootsteps(surface: SurfaceType = 'stone'): Promise<void> {
    const now = this.context.currentTime;
    const stepInterval = 0.75;
    const stepCount = 4;
    const params = SURFACE_PARAMS[surface];

    for (let i = 0; i < stepCount; i++) {
      this.playFootstepAt(now + i * stepInterval, surface);
    }

    const totalDuration = (stepCount - 1) * stepInterval + params.duration;
    return new Promise(resolve => {
      setTimeout(resolve, totalDuration * 1000);
    });
  }

  /** Play obstacle/wall collision sound */
  playObstacle(): void {
    const now = this.context.currentTime;

    const osc = this.context.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.2);

    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.2);
  }

  // ========================================
  // SONAR SOUNDS
  // ========================================

  /** Play the outgoing sonar ping */
  playPing(): void {
    const now = this.context.currentTime;

    const osc = this.context.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.1);

    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.15);
  }

  /** Play filtered sonar echo */
  playEchoFiltered(isPassage: boolean): void {
    const now = this.context.currentTime;

    const osc = this.context.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.1);

    const filter = this.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = isPassage ? 600 : 1000;
    filter.Q.value = 1;

    const gain = this.context.createGain();
    const volume = isPassage ? 0.2 : 0.3;
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.15);
  }

  // ========================================
  // ITEM INTERACTION SOUNDS
  // ========================================

  /** Play item pickup arpeggio (C5-E5-G5) */
  playPickup(): void {
    const now = this.context.currentTime;
    const notes = [523, 659, 784]; // C5, E5, G5
    const noteDuration = 0.1;
    const noteGap = 0.08;

    for (let i = 0; i < notes.length; i++) {
      const startTime = now + i * (noteDuration + noteGap);

      const osc = this.context.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = notes[i];

      const gain = this.context.createGain();
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.3, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + noteDuration);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(startTime);
      osc.stop(startTime + noteDuration);
    }
  }

  /** Play unlock sound - click + ascending sweep */
  playUnlock(): void {
    const now = this.context.currentTime;

    // Metallic click
    const clickDuration = 0.05;
    const clickBufferSize = Math.floor(this.context.sampleRate * clickDuration);
    const clickBuffer = this.context.createBuffer(1, clickBufferSize, this.context.sampleRate);
    const clickData = clickBuffer.getChannelData(0);

    for (let i = 0; i < clickBufferSize; i++) {
      const t = i / clickBufferSize;
      const envelope = Math.exp(-t * 40);
      clickData[i] = (Math.random() * 2 - 1) * envelope;
    }

    const clickSource = this.context.createBufferSource();
    clickSource.buffer = clickBuffer;

    const clickFilter = this.context.createBiquadFilter();
    clickFilter.type = 'bandpass';
    clickFilter.frequency.value = 2000;
    clickFilter.Q.value = 5;

    const clickGain = this.context.createGain();
    clickGain.gain.value = 0.4;

    clickSource.connect(clickFilter);
    clickFilter.connect(clickGain);
    clickGain.connect(this.masterGain);

    clickSource.start(now);
    clickSource.stop(now + clickDuration);

    // Ascending sweep
    const sweepStart = now + 0.05;
    const osc = this.context.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, sweepStart);
    osc.frequency.exponentialRampToValueAtTime(400, sweepStart + 0.15);

    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0.3, sweepStart);
    gain.gain.exponentialRampToValueAtTime(0.01, sweepStart + 0.2);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(sweepStart);
    osc.stop(sweepStart + 0.2);
  }

  /** Play error/rejection sound */
  playError(): void {
    const now = this.context.currentTime;

    const osc = this.context.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.2);

    const filter = this.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 400;

    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.2);
  }

  /** Play shimmer for item presence */
  playItemPresence(): void {
    const now = this.context.currentTime;
    const notes = [800, 1000, 1200];
    const noteDuration = 0.18;
    const noteGap = 0.08;

    for (let i = 0; i < notes.length; i++) {
      const startTime = now + i * (noteDuration + noteGap);

      const osc = this.context.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = notes[i];

      const gain = this.context.createGain();
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.5, startTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + noteDuration);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(startTime);
      osc.stop(startTime + noteDuration);
    }
  }

  /** Play save confirmation chime */
  playSaveConfirm(): void {
    const now = this.context.currentTime;
    const notes = [600, 900];
    const noteDuration = 0.15;

    for (let i = 0; i < notes.length; i++) {
      const startTime = now + i * 0.1;

      const osc = this.context.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = notes[i];

      const gain = this.context.createGain();
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.25, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + noteDuration);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(startTime);
      osc.stop(startTime + noteDuration);
    }
  }

  /** Play hollow sound for empty pickup attempt */
  playEmptyPickup(): void {
    const now = this.context.currentTime;

    const osc = this.context.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(100, now);
    osc.frequency.exponentialRampToValueAtTime(70, now + 0.15);

    const filter = this.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 200;

    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.15);
  }

  /** Play metallic lock presence sound */
  playLockPresence(): void {
    const now = this.context.currentTime;

    const osc1 = this.context.createOscillator();
    osc1.type = 'square';
    osc1.frequency.setValueAtTime(1800, now);
    osc1.frequency.exponentialRampToValueAtTime(1200, now + 0.08);

    const osc2 = this.context.createOscillator();
    osc2.type = 'square';
    osc2.frequency.setValueAtTime(1850, now);
    osc2.frequency.exponentialRampToValueAtTime(1250, now + 0.08);

    const filter = this.context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1500;
    filter.Q.value = 5;

    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc1.start(now);
    osc1.stop(now + 0.12);
    osc2.start(now);
    osc2.stop(now + 0.12);
  }

  // ========================================
  // ROOM TRANSITION SOUNDS
  // ========================================

  /**
   * Play room transition whoosh when changing environments
   * Different sounds for different environment types
   */
  playRoomTransition(_fromEnv?: string, toEnv?: string): void {
    const now = this.context.currentTime;
    const duration = 0.4;

    // Create whoosh noise
    const bufferSize = Math.floor(this.context.sampleRate * duration);
    const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
    const data = buffer.getChannelData(0);

    // Generate pink-ish noise with fade in/out
    for (let i = 0; i < bufferSize; i++) {
      const t = i / bufferSize;
      // Bell curve envelope
      const envelope = Math.sin(t * Math.PI) * 0.5;
      data[i] = (Math.random() * 2 - 1) * envelope;
    }

    const source = this.context.createBufferSource();
    source.buffer = buffer;

    // Filter sweep based on environment
    const filter = this.context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 2;

    // Sweep filter frequency for movement feel
    const startFreq = 300;
    const endFreq = toEnv === 'temple' ? 200 : toEnv === 'spaceship' ? 600 : 400;
    filter.frequency.setValueAtTime(startFreq, now);
    filter.frequency.exponentialRampToValueAtTime(endFreq, now + duration);

    const gain = this.context.createGain();
    gain.gain.value = 0.25;

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    source.start(now);
    source.stop(now + duration);

    // Add environment-specific accent
    if (toEnv === 'temple') {
      this.playStoneAccent(now + 0.1);
    } else if (toEnv === 'spaceship') {
      this.playAirlockAccent(now + 0.15);
    }
  }

  /** Stone grinding accent for temple transitions */
  private playStoneAccent(startTime: number): void {
    const duration = 0.3;
    const bufferSize = Math.floor(this.context.sampleRate * duration);
    const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      const t = i / bufferSize;
      const envelope = Math.exp(-t * 5);
      data[i] = (Math.random() * 2 - 1) * envelope;
    }

    const source = this.context.createBufferSource();
    source.buffer = buffer;

    const filter = this.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 400;
    filter.Q.value = 3;

    const gain = this.context.createGain();
    gain.gain.value = 0.15;

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    source.start(startTime);
    source.stop(startTime + duration);
  }

  /** Airlock hiss accent for spaceship transitions */
  private playAirlockAccent(startTime: number): void {
    const duration = 0.25;
    const bufferSize = Math.floor(this.context.sampleRate * duration);
    const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      const t = i / bufferSize;
      const envelope = Math.exp(-t * 8);
      data[i] = (Math.random() * 2 - 1) * envelope;
    }

    const source = this.context.createBufferSource();
    source.buffer = buffer;

    const filter = this.context.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 2000;

    const gain = this.context.createGain();
    gain.gain.value = 0.2;

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    source.start(startTime);
    source.stop(startTime + duration);
  }

  /** Play door opening sound after unlock */
  playDoorOpen(): void {
    const now = this.context.currentTime;

    // Creaking noise sweep
    const duration = 0.5;
    const bufferSize = Math.floor(this.context.sampleRate * duration);
    const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      const t = i / bufferSize;
      const envelope = Math.sin(t * Math.PI * 0.5) * Math.exp(-t * 2);
      data[i] = (Math.random() * 2 - 1) * envelope;
    }

    const source = this.context.createBufferSource();
    source.buffer = buffer;

    const filter = this.context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(300, now);
    filter.frequency.exponentialRampToValueAtTime(600, now + duration);
    filter.Q.value = 8;

    const gain = this.context.createGain();
    gain.gain.value = 0.3;

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    source.start(now);
    source.stop(now + duration);

    // Add hinge squeak
    const osc = this.context.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(400, now + 0.1);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.3);

    const oscFilter = this.context.createBiquadFilter();
    oscFilter.type = 'bandpass';
    oscFilter.frequency.value = 500;
    oscFilter.Q.value = 10;

    const oscGain = this.context.createGain();
    oscGain.gain.setValueAtTime(0, now + 0.1);
    oscGain.gain.linearRampToValueAtTime(0.1, now + 0.15);
    oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

    osc.connect(oscFilter);
    oscFilter.connect(oscGain);
    oscGain.connect(this.masterGain);

    osc.start(now + 0.1);
    osc.stop(now + 0.35);
  }

  /** Play discovery chime when entering a new room for the first time */
  playDiscoveryChime(): void {
    const now = this.context.currentTime;
    // Ascending major third arpeggio
    const notes = [440, 554, 659]; // A4, C#5, E5
    const noteDuration = 0.12;
    const noteGap = 0.06;

    for (let i = 0; i < notes.length; i++) {
      const startTime = now + i * (noteDuration + noteGap);

      const osc = this.context.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = notes[i];

      // Add subtle vibrato
      const vibrato = this.context.createOscillator();
      vibrato.frequency.value = 5;
      const vibratoGain = this.context.createGain();
      vibratoGain.gain.value = 3;
      vibrato.connect(vibratoGain);
      vibratoGain.connect(osc.frequency);
      vibrato.start(startTime);
      vibrato.stop(startTime + noteDuration);

      const gain = this.context.createGain();
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.2, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + noteDuration);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(startTime);
      osc.stop(startTime + noteDuration);
    }
  }
}
