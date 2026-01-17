/**
 * SurpriseEffects - Atmospheric sound effects for immersion
 *
 * These effects are triggered by the SurpriseEventManager to add
 * atmosphere and variety to the game.
 */

export class SurpriseEffects {
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

  /**
   * Play a surprise sound effect
   */
  playEffect(soundId: string): void {
    console.log(`SurpriseEffect: ${soundId}`);

    switch (soundId) {
      case 'distantThunder': this.playDistantThunder(); break;
      case 'creepyWhisper': this.playCreepyWhisper(); break;
      case 'metalGroan': this.playMetalGroan(); break;
      case 'alienChirp': this.playAlienChirp(); break;
      case 'stoneShift': this.playStoneShift(); break;
      case 'etherealChoir': this.playEtherealChoir(); break;
      case 'heartbeat': this.playHeartbeat(); break;
      case 'staticBurst': this.playStaticBurst(); break;
      case 'deepRumble': this.playDeepRumble(); break;
      case 'crystalChime': this.playCrystalChime(); break;
      default: this.playGenericEffect(); break;
    }
  }

  /**
   * Play a surprise ambient layer
   */
  playAmbient(soundId: string): void {
    console.log(`SurpriseAmbient: ${soundId}`);

    switch (soundId) {
      case 'windGust': this.playWindGust(); break;
      case 'distantVoices': this.playDistantVoices(); break;
      case 'machineAwaken': this.playMachineAwaken(); break;
      case 'cosmicHum': this.playCosmicHum(); break;
      default: this.playGenericEffect(); break;
    }
  }

  // ========================================
  // SURPRISE EFFECTS
  // ========================================

  private playDistantThunder(): void {
    const now = this.context.currentTime;

    const bufferSize = this.context.sampleRate * 2;
    const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
    }

    const noise = this.context.createBufferSource();
    noise.buffer = buffer;

    const filter = this.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 150;

    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.4, now + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 2);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(now);
    noise.stop(now + 2);
  }

  private playCreepyWhisper(): void {
    const now = this.context.currentTime;

    const bufferSize = this.context.sampleRate;
    const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      const env = Math.sin(Math.PI * i / bufferSize);
      data[i] = (Math.random() * 2 - 1) * env * 0.3;
    }

    const noise = this.context.createBufferSource();
    noise.buffer = buffer;

    const filter = this.context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 800;
    filter.Q.value = 2;

    const gain = this.context.createGain();
    gain.gain.value = 0.25;

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(now);
  }

  private playMetalGroan(): void {
    const now = this.context.currentTime;

    const osc = this.context.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(80, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 1.5);

    const filter = this.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(200, now);
    filter.frequency.exponentialRampToValueAtTime(100, now + 1.5);

    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.3, now + 0.2);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 1.5);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 1.5);
  }

  private playAlienChirp(): void {
    const now = this.context.currentTime;

    for (let i = 0; i < 3; i++) {
      const osc = this.context.createOscillator();
      osc.type = 'sine';
      const startFreq = 2000 + Math.random() * 1000;
      osc.frequency.setValueAtTime(startFreq, now + i * 0.15);
      osc.frequency.exponentialRampToValueAtTime(startFreq * 0.5, now + i * 0.15 + 0.1);

      const gain = this.context.createGain();
      gain.gain.setValueAtTime(0, now + i * 0.15);
      gain.gain.linearRampToValueAtTime(0.15, now + i * 0.15 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.15 + 0.1);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now + i * 0.15);
      osc.stop(now + i * 0.15 + 0.12);
    }
  }

  private playStoneShift(): void {
    const now = this.context.currentTime;

    const bufferSize = this.context.sampleRate;
    const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.sin(Math.PI * i / bufferSize);
    }

    const noise = this.context.createBufferSource();
    noise.buffer = buffer;

    const filter = this.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 300;

    const gain = this.context.createGain();
    gain.gain.value = 0.35;

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(now);
  }

  private playEtherealChoir(): void {
    const now = this.context.currentTime;

    const frequencies = [220, 330, 440, 550];
    for (const freq of frequencies) {
      const osc = this.context.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;

      const gain = this.context.createGain();
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.08, now + 0.5);
      gain.gain.linearRampToValueAtTime(0.08, now + 2);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 3);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 3);
    }
  }

  private playHeartbeat(): void {
    const now = this.context.currentTime;

    for (let beat = 0; beat < 2; beat++) {
      const osc = this.context.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = 50;

      const gain = this.context.createGain();
      const beatTime = now + beat * 0.3;
      gain.gain.setValueAtTime(0, beatTime);
      gain.gain.linearRampToValueAtTime(0.4, beatTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, beatTime + 0.2);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(beatTime);
      osc.stop(beatTime + 0.25);
    }
  }

  private playStaticBurst(): void {
    const now = this.context.currentTime;

    const bufferSize = this.context.sampleRate * 0.3;
    const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1);
    }

    const noise = this.context.createBufferSource();
    noise.buffer = buffer;

    const filter = this.context.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 2000;

    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(now);
    noise.stop(now + 0.3);
  }

  private playDeepRumble(): void {
    const now = this.context.currentTime;

    const osc = this.context.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 30;

    const osc2 = this.context.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = 35;

    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.35, now + 0.5);
    gain.gain.linearRampToValueAtTime(0.35, now + 1.5);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 2.5);

    osc.connect(gain);
    osc2.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc2.start(now);
    osc.stop(now + 2.5);
    osc2.stop(now + 2.5);
  }

  private playCrystalChime(): void {
    const now = this.context.currentTime;

    const frequencies = [1200, 1500, 1800, 2400];
    for (let i = 0; i < frequencies.length; i++) {
      const osc = this.context.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = frequencies[i];

      const gain = this.context.createGain();
      gain.gain.setValueAtTime(0, now + i * 0.1);
      gain.gain.linearRampToValueAtTime(0.12, now + i * 0.1 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.8);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now + i * 0.1);
      osc.stop(now + i * 0.1 + 0.85);
    }
  }

  // ========================================
  // SURPRISE AMBIENT
  // ========================================

  private playWindGust(): void {
    const now = this.context.currentTime;

    const duration = 5;
    const bufferSize = this.context.sampleRate * duration;
    const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
    const data = buffer.getChannelData(0);

    const attackEnd = 0.5 / duration;
    const sustainEnd = 1.5 / duration;

    for (let i = 0; i < bufferSize; i++) {
      const t = i / bufferSize;
      let env: number;

      if (t < attackEnd) {
        env = t / attackEnd;
      } else if (t < sustainEnd) {
        env = 1.0;
      } else {
        const fadeProgress = (t - sustainEnd) / (1 - sustainEnd);
        env = Math.pow(1 - fadeProgress, 2);
      }

      data[i] = (Math.random() * 2 - 1) * env;
    }

    const noise = this.context.createBufferSource();
    noise.buffer = buffer;

    const filter = this.context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 400;
    filter.Q.value = 0.5;

    const gain = this.context.createGain();
    gain.gain.value = 0.25;

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(now);
  }

  private playDistantVoices(): void {
    const now = this.context.currentTime;
    const duration = 6;

    const voiceFreqs = [110, 115, 165, 170, 220];

    voiceFreqs.forEach((baseFreq, voiceIndex) => {
      const harmonics = [1, 2, 3, 4];

      harmonics.forEach((harmonic, hIndex) => {
        const osc = this.context.createOscillator();
        const detune = (Math.random() - 0.5) * 20;
        osc.frequency.value = baseFreq * harmonic + detune;
        osc.type = harmonic === 1 ? 'sawtooth' : 'triangle';

        const formant = this.context.createBiquadFilter();
        formant.type = 'bandpass';
        const formantFreqs = [700, 1200, 2500];
        formant.frequency.value = formantFreqs[hIndex % formantFreqs.length];
        formant.Q.value = 8;

        const gain = this.context.createGain();
        const baseGain = 0.04 / (harmonic * harmonic);
        gain.gain.setValueAtTime(0, now);

        const phaseOffset = voiceIndex * 0.4;
        const riseTime = 1.5;
        const holdTime = 2;
        const fallTime = 2.5;

        gain.gain.linearRampToValueAtTime(baseGain, now + phaseOffset + riseTime);
        gain.gain.setValueAtTime(baseGain, now + phaseOffset + riseTime + holdTime);
        gain.gain.exponentialRampToValueAtTime(0.001, now + phaseOffset + riseTime + holdTime + fallTime);

        osc.connect(formant);
        formant.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now + phaseOffset);
        osc.stop(now + duration + phaseOffset);
      });
    });

    // Reverb tail
    const reverbDelay = this.context.createDelay();
    reverbDelay.delayTime.value = 0.3;

    const reverbFilter = this.context.createBiquadFilter();
    reverbFilter.type = 'lowpass';
    reverbFilter.frequency.value = 800;

    const reverbOsc = this.context.createOscillator();
    reverbOsc.frequency.value = 130;
    reverbOsc.type = 'sine';

    const reverbEnv = this.context.createGain();
    reverbEnv.gain.setValueAtTime(0, now);
    reverbEnv.gain.linearRampToValueAtTime(0.06, now + 2);
    reverbEnv.gain.setValueAtTime(0.06, now + 4);
    reverbEnv.gain.exponentialRampToValueAtTime(0.001, now + duration + 1);

    reverbOsc.connect(reverbDelay);
    reverbDelay.connect(reverbFilter);
    reverbFilter.connect(reverbEnv);
    reverbEnv.connect(this.masterGain);

    reverbOsc.start(now);
    reverbOsc.stop(now + duration + 1);
  }

  private playMachineAwaken(): void {
    const now = this.context.currentTime;

    const osc = this.context.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(20, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 2);

    const filter = this.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(50, now);
    filter.frequency.exponentialRampToValueAtTime(500, now + 2);

    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.25, now + 1);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 3);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 3);
  }

  private playCosmicHum(): void {
    const now = this.context.currentTime;

    const frequencies = [110, 165, 220, 275];
    for (const freq of frequencies) {
      const osc = this.context.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;

      const gain = this.context.createGain();
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.06, now + 1);
      gain.gain.linearRampToValueAtTime(0.06, now + 3);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 4);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 4);
    }
  }

  /** Generic fallback effect */
  private playGenericEffect(): void {
    const now = this.context.currentTime;

    const osc = this.context.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.5);

    const filter = this.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 600;

    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.2, now + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.5);
  }
}
