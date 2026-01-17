/**
 * ItemSounds - Sound signatures for inventory items
 *
 * Each item has a unique sound signature that helps identify it.
 */

import type { ItemSoundSignature } from '../types';

export class ItemSounds {
  private context: AudioContext;
  private masterGain: GainNode;
  private activeIdleLoops: Map<ItemSoundSignature, ReturnType<typeof setInterval>> = new Map();

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

  /**
   * Play an item's sound signature
   */
  playSignature(signature: ItemSoundSignature): void {
    switch (signature) {
      // Original items
      case 'glassChime': this.playGlassChime(); break;
      case 'metalScrape': this.playMetalScrape(); break;
      case 'ropeSwish': this.playRopeSwish(); break;
      case 'crystalResonance': this.playCrystalResonance(); break;
      case 'alienCrystal': this.playAlienCrystal(); break;
      case 'electricBuzz': this.playElectricBuzz(); break;
      case 'liquidGurgle': this.playLiquidGurgle(); break;
      case 'techBeep': this.playTechBeep(); break;
      // Temple items
      case 'templeBell': this.playTempleBell(); break;
      case 'stoneGrind': this.playStoneGrind(); break;
      case 'monkChant': this.playMonkChant(); break;
      case 'chaliceRing': this.playChaliceRing(); break;
      // Celestial items
      case 'crystalHum': this.playCrystalHum(); break;
      case 'voidWhisper': this.playVoidWhisper(); break;
      case 'memoryEcho': this.playMemoryEcho(); break;
      case 'harmonicTone': this.playHarmonicTone(); break;
      case 'starlightPulse': this.playStarlightPulse(); break;
      case 'cosmicResonance': this.playCosmicResonance(); break;
      default:
        console.warn(`Unknown item signature: ${signature}`);
    }
  }

  /**
   * Play a filtered echo of a signature (for lock hints)
   */
  playSignatureEcho(signature: ItemSoundSignature): void {
    console.log(`Playing signature echo: ${signature}`);

    // Boost volume for lock hint - needs to be clearly audible
    const echoGain = this.context.createGain();
    echoGain.gain.value = 1.2;

    // Gentle lowpass filter - don't muffle too much
    const filter = this.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 2500;
    filter.Q.value = 0.5;

    // Save original master gain and temporarily replace
    const originalMaster = this.masterGain;

    // Create temporary chain
    filter.connect(echoGain);
    echoGain.connect(originalMaster);

    // Temporarily use filter as destination
    this.masterGain = filter;

    // Play signature through filter
    this.playSignature(signature);

    // Restore master gain
    this.masterGain = originalMaster;

    // Cleanup after a bit
    setTimeout(() => {
      filter.disconnect();
      echoGain.disconnect();
    }, 1000);
  }

  // ========================================
  // ORIGINAL ITEMS
  // ========================================

  /** Glass chime (lantern) - 2000-3000Hz crystalline harmonics */
  private playGlassChime(): void {
    const now = this.context.currentTime;
    const frequencies = [2400, 3000, 3600];

    for (let i = 0; i < frequencies.length; i++) {
      const startTime = now + i * 0.05;
      const osc = this.context.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = frequencies[i];

      const gain = this.context.createGain();
      gain.gain.setValueAtTime(0.15 - i * 0.03, startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(startTime);
      osc.stop(startTime + 0.3);
    }
  }

  /** Metal scrape (knife) - 800-1500Hz filtered noise */
  private playMetalScrape(): void {
    const now = this.context.currentTime;
    const duration = 0.2;
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
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(800, now);
    filter.frequency.linearRampToValueAtTime(1500, now + 0.1);
    filter.Q.value = 8;

    const gain = this.context.createGain();
    gain.gain.value = 0.25;

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    source.start(now);
    source.stop(now + duration);
  }

  /** Rope swish - 400-800Hz noise whoosh */
  private playRopeSwish(): void {
    const now = this.context.currentTime;
    const duration = 0.4;
    const bufferSize = Math.floor(this.context.sampleRate * duration);
    const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      const t = i / bufferSize;
      const envelope = Math.sin(t * Math.PI) * Math.exp(-t * 2);
      data[i] = (Math.random() * 2 - 1) * envelope;
    }

    const source = this.context.createBufferSource();
    source.buffer = buffer;

    const filter = this.context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 800;
    filter.Q.value = 1.5;

    const gain = this.context.createGain();
    gain.gain.value = 0.5;

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    source.start(now);
    source.stop(now + duration);
  }

  /** Crystal resonance (blue gem) - 600Hz with harmonics, long sustain */
  private playCrystalResonance(): void {
    const now = this.context.currentTime;
    const baseFreq = 600;
    const harmonics = [1, 2, 3, 5];

    for (const harmonic of harmonics) {
      const osc = this.context.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = baseFreq * harmonic;

      const gain = this.context.createGain();
      const volume = 0.12 / harmonic;
      gain.gain.setValueAtTime(volume, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.5);
    }
  }

  /** Alien crystal - 200-800Hz sweep with beating */
  private playAlienCrystal(): void {
    const now = this.context.currentTime;

    const osc = this.context.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.2);
    osc.frequency.exponentialRampToValueAtTime(300, now + 0.5);

    const osc2 = this.context.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(205, now);
    osc2.frequency.exponentialRampToValueAtTime(810, now + 0.2);
    osc2.frequency.exponentialRampToValueAtTime(305, now + 0.5);

    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.55);

    osc.connect(gain);
    osc2.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.55);
    osc2.start(now);
    osc2.stop(now + 0.55);
  }

  /** Electric buzz (power cell) - 60Hz with even harmonics */
  private playElectricBuzz(): void {
    const now = this.context.currentTime;
    const baseFreq = 60;

    for (let i = 1; i <= 4; i++) {
      const osc = this.context.createOscillator();
      osc.type = i === 1 ? 'sawtooth' : 'sine';
      osc.frequency.value = baseFreq * i * 2;

      const gain = this.context.createGain();
      const volume = 0.08 / i;
      gain.gain.setValueAtTime(volume, now);
      gain.gain.setValueAtTime(volume, now + 0.2);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.3);
    }
  }

  /** Liquid gurgle (fuel cell) - modulated noise */
  private playLiquidGurgle(): void {
    const now = this.context.currentTime;
    const duration = 0.35;
    const bufferSize = Math.floor(this.context.sampleRate * duration);
    const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      const t = i / this.context.sampleRate;
      const modulation = Math.sin(t * 25) * 0.5 + 0.5;
      const envelope = Math.exp(-t * 4);
      data[i] = (Math.random() * 2 - 1) * envelope * modulation;
    }

    const source = this.context.createBufferSource();
    source.buffer = buffer;

    const filter = this.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 400;
    filter.Q.value = 3;

    const gain = this.context.createGain();
    gain.gain.value = 0.25;

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    source.start(now);
    source.stop(now + duration);
  }

  /** Tech beep (activation key) - 800-1200Hz rhythmic pattern */
  private playTechBeep(): void {
    const now = this.context.currentTime;
    const beeps = [
      { freq: 1000, time: 0, dur: 0.06 },
      { freq: 1200, time: 0.08, dur: 0.06 },
      { freq: 800, time: 0.16, dur: 0.06 },
      { freq: 1000, time: 0.24, dur: 0.1 },
    ];

    for (const beep of beeps) {
      const osc = this.context.createOscillator();
      osc.type = 'square';
      osc.frequency.value = beep.freq;

      const filter = this.context.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 2000;

      const gain = this.context.createGain();
      gain.gain.setValueAtTime(0.12, now + beep.time);
      gain.gain.setValueAtTime(0.12, now + beep.time + beep.dur - 0.01);
      gain.gain.linearRampToValueAtTime(0, now + beep.time + beep.dur);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now + beep.time);
      osc.stop(now + beep.time + beep.dur);
    }
  }

  // ========================================
  // TEMPLE ITEMS
  // ========================================

  /** Temple bell (ritual bell) - deep metallic resonance */
  private playTempleBell(): void {
    const now = this.context.currentTime;
    const baseFreq = 180;
    const duration = 1.5;

    const osc1 = this.context.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.value = baseFreq;

    const osc2 = this.context.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = baseFreq * 2.4;

    const osc3 = this.context.createOscillator();
    osc3.type = 'sine';
    osc3.frequency.value = baseFreq * 5.4;

    const gain1 = this.context.createGain();
    gain1.gain.setValueAtTime(0.3, now);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + duration);

    const gain2 = this.context.createGain();
    gain2.gain.setValueAtTime(0.15, now);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + duration * 0.6);

    const gain3 = this.context.createGain();
    gain3.gain.setValueAtTime(0.08, now);
    gain3.gain.exponentialRampToValueAtTime(0.01, now + duration * 0.3);

    osc1.connect(gain1);
    osc2.connect(gain2);
    osc3.connect(gain3);
    gain1.connect(this.masterGain);
    gain2.connect(this.masterGain);
    gain3.connect(this.masterGain);

    osc1.start(now);
    osc2.start(now);
    osc3.start(now);
    osc1.stop(now + duration);
    osc2.stop(now + duration * 0.6);
    osc3.stop(now + duration * 0.3);
  }

  /** Stone grind (stone tablet) - grinding noise */
  private playStoneGrind(): void {
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
    filter.frequency.setValueAtTime(300, now);
    filter.frequency.linearRampToValueAtTime(600, now + duration);
    filter.Q.value = 3;

    const gain = this.context.createGain();
    gain.gain.value = 0.35;

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    source.start(now);
    source.stop(now + duration);
  }

  /** Monk chant (monk medallion) - vocal formant synthesis */
  private playMonkChant(): void {
    const now = this.context.currentTime;
    const duration = 0.8;

    const source = this.context.createOscillator();
    source.type = 'sawtooth';
    source.frequency.value = 120;

    const formants = [300, 800, 2500];
    const masterGainNode = this.context.createGain();
    masterGainNode.gain.setValueAtTime(0, now);
    masterGainNode.gain.linearRampToValueAtTime(0.2, now + 0.1);
    masterGainNode.gain.setValueAtTime(0.2, now + duration - 0.2);
    masterGainNode.gain.linearRampToValueAtTime(0.01, now + duration);

    for (const freq of formants) {
      const filter = this.context.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = freq;
      filter.Q.value = 10;

      const formantGain = this.context.createGain();
      formantGain.gain.value = 0.25;

      source.connect(filter);
      filter.connect(formantGain);
      formantGain.connect(masterGainNode);
    }

    masterGainNode.connect(this.masterGain);

    source.start(now);
    source.stop(now + duration);
  }

  /** Chalice ring (offering chalice) - high metallic resonance */
  private playChaliceRing(): void {
    const now = this.context.currentTime;
    const frequencies = [1800, 2400, 3200];
    const duration = 0.6;

    for (let i = 0; i < frequencies.length; i++) {
      const osc = this.context.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = frequencies[i];

      const gain = this.context.createGain();
      gain.gain.setValueAtTime(0.12 - i * 0.03, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + duration);
    }
  }

  // ========================================
  // CELESTIAL ITEMS
  // ========================================

  /** Crystal hum (crystal shard) - high tone with beating */
  private playCrystalHum(): void {
    const now = this.context.currentTime;
    const duration = 0.5;

    const osc1 = this.context.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.value = 1200;

    const osc2 = this.context.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = 1205;

    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.2, now + 0.05);
    gain.gain.setValueAtTime(0.2, now + duration - 0.1);
    gain.gain.linearRampToValueAtTime(0.01, now + duration);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.masterGain);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + duration);
    osc2.stop(now + duration);
  }

  /** Void whisper (void essence) - ethereal descending tone */
  private playVoidWhisper(): void {
    const now = this.context.currentTime;
    const duration = 0.7;

    const osc = this.context.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + duration);

    const filter = this.context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1000, now);
    filter.frequency.exponentialRampToValueAtTime(300, now + duration);
    filter.Q.value = 5;

    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.15, now + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + duration);
  }

  /** Memory echo (memory fragment) - reverbed arpeggio */
  private playMemoryEcho(): void {
    const now = this.context.currentTime;
    const notes = [440, 550, 660, 550];
    const noteDuration = 0.15;
    const noteGap = 0.1;

    for (let i = 0; i < notes.length; i++) {
      const startTime = now + i * (noteDuration + noteGap);

      const osc = this.context.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = notes[i];

      const gain = this.context.createGain();
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.15 - i * 0.03, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + noteDuration * 2);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(startTime);
      osc.stop(startTime + noteDuration * 2);
    }
  }

  /** Harmonic tone (harmonic key) - celestial chord */
  private playHarmonicTone(): void {
    const now = this.context.currentTime;
    const frequencies = [330, 415, 495, 660]; // E major
    const duration = 0.6;

    for (const freq of frequencies) {
      const osc = this.context.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;

      const gain = this.context.createGain();
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.1, now + 0.05);
      gain.gain.setValueAtTime(0.1, now + duration - 0.15);
      gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + duration);
    }
  }

  /** Starlight pulse (starlight core) - ascending luminous sweep */
  private playStarlightPulse(): void {
    const now = this.context.currentTime;
    const duration = 0.5;

    const osc = this.context.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(1600, now + duration * 0.7);
    osc.frequency.exponentialRampToValueAtTime(1200, now + duration);

    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.25, now + duration * 0.3);
    gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + duration);
  }

  /** Cosmic resonance (cosmic sigil) - otherworldly harmonics */
  private playCosmicResonance(): void {
    const now = this.context.currentTime;
    const frequencies = [220, 293, 366, 488]; // Non-standard ratios
    const duration = 0.8;

    for (let i = 0; i < frequencies.length; i++) {
      const osc = this.context.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = frequencies[i];

      // Slight vibrato
      const lfo = this.context.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = 4 + i;

      const lfoGain = this.context.createGain();
      lfoGain.gain.value = 3;

      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);

      const gain = this.context.createGain();
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.12 - i * 0.02, now + 0.1);
      gain.gain.setValueAtTime(0.12 - i * 0.02, now + duration - 0.2);
      gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      lfo.start(now);
      osc.stop(now + duration);
      lfo.stop(now + duration);
    }
  }

  // ========================================
  // IDLE LOCATOR SOUNDS
  // ========================================

  /**
   * Get idle sound configuration for a signature category
   */
  private getIdleConfig(signature: ItemSoundSignature): { interval: number; variation: number } {
    // Glass/crystal items: higher, shorter interval
    if (['glassChime', 'crystalResonance', 'crystalHum', 'chaliceRing'].includes(signature)) {
      return { interval: 6, variation: 3 };
    }
    // Metal items: medium interval
    if (['metalScrape', 'electricBuzz', 'techBeep', 'templeBell'].includes(signature)) {
      return { interval: 8, variation: 4 };
    }
    // Celestial items: longer, more mysterious interval
    if (['cosmicResonance', 'voidWhisper', 'starlightPulse', 'harmonicTone', 'memoryEcho'].includes(signature)) {
      return { interval: 10, variation: 5 };
    }
    // Default
    return { interval: 7, variation: 3 };
  }

  /**
   * Play a very quiet idle/locator sound for an item
   * These help players find items by ear
   *
   * @param signature The item's sound signature
   * @param pan Stereo pan position (-1 to +1)
   * @param distance Distance in room units (affects volume)
   */
  playIdleLoop(signature: ItemSoundSignature, pan: number = 0, distance: number = 0): void {
    // Stop any existing loop for this signature
    this.stopIdleLoop(signature);

    const config = this.getIdleConfig(signature);
    const baseGain = 0.05; // Very quiet
    const distanceGain = Math.max(0.01, baseGain / (1 + distance * 0.3));

    // Create panner for spatial positioning
    const panner = this.context.createStereoPanner();
    panner.pan.value = pan;

    // Create quiet gain node
    const idleGain = this.context.createGain();
    idleGain.gain.value = distanceGain;

    panner.connect(idleGain);
    idleGain.connect(this.masterGain);

    // Play idle sound function
    const playIdleSound = () => {
      this.playQuietSignature(signature, panner);
    };

    // Initial play
    playIdleSound();

    // Set up interval with variation
    const getNextInterval = () => {
      const variation = (Math.random() - 0.5) * 2 * config.variation;
      return (config.interval + variation) * 1000;
    };

    const scheduleNext = () => {
      const intervalId = setTimeout(() => {
        playIdleSound();
        scheduleNext();
      }, getNextInterval());

      this.activeIdleLoops.set(signature, intervalId);
    };

    scheduleNext();
  }

  /**
   * Stop an idle loop for a signature
   */
  stopIdleLoop(signature: ItemSoundSignature): void {
    const intervalId = this.activeIdleLoops.get(signature);
    if (intervalId) {
      clearTimeout(intervalId);
      this.activeIdleLoops.delete(signature);
    }
  }

  /**
   * Stop all active idle loops
   */
  stopAllIdleLoops(): void {
    for (const [signature] of this.activeIdleLoops) {
      this.stopIdleLoop(signature);
    }
  }

  /**
   * Play a very quiet version of a signature for idle sounds
   */
  private playQuietSignature(signature: ItemSoundSignature, destination: AudioNode): void {
    const now = this.context.currentTime;

    // Create a quiet, short version based on signature category
    switch (signature) {
      // Glass/crystal: soft high chime
      case 'glassChime':
      case 'crystalResonance':
      case 'crystalHum':
      case 'chaliceRing': {
        const freq = signature === 'glassChime' ? 2800 :
                     signature === 'crystalHum' ? 1200 :
                     signature === 'chaliceRing' ? 2000 : 800;
        const osc = this.context.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq;
        const gain = this.context.createGain();
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        osc.connect(gain);
        gain.connect(destination);
        osc.start(now);
        osc.stop(now + 0.15);
        break;
      }

      // Metal/tech: short beep or buzz
      case 'metalScrape':
      case 'electricBuzz':
      case 'techBeep':
      case 'templeBell': {
        const freq = signature === 'templeBell' ? 180 :
                     signature === 'electricBuzz' ? 120 : 800;
        const osc = this.context.createOscillator();
        osc.type = signature === 'electricBuzz' ? 'sawtooth' : 'sine';
        osc.frequency.value = freq;
        const gain = this.context.createGain();
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        osc.connect(gain);
        gain.connect(destination);
        osc.start(now);
        osc.stop(now + 0.2);
        break;
      }

      // Celestial: ethereal shimmer
      case 'cosmicResonance':
      case 'voidWhisper':
      case 'starlightPulse':
      case 'harmonicTone':
      case 'memoryEcho': {
        const osc1 = this.context.createOscillator();
        const osc2 = this.context.createOscillator();
        osc1.type = 'sine';
        osc2.type = 'sine';
        const baseFreq = signature === 'voidWhisper' ? 400 :
                        signature === 'starlightPulse' ? 600 : 500;
        osc1.frequency.value = baseFreq;
        osc2.frequency.value = baseFreq * 1.01; // Slight beating
        const gain = this.context.createGain();
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.06, now + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(destination);
        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.25);
        osc2.stop(now + 0.25);
        break;
      }

      // Default: simple tone
      default: {
        const osc = this.context.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = 600;
        const gain = this.context.createGain();
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        osc.connect(gain);
        gain.connect(destination);
        osc.start(now);
        osc.stop(now + 0.15);
      }
    }
  }
}
