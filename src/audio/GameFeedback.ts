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

  /** Play a single footstep at a specific time */
  playFootstepAt(startTime: number): void {
    const duration = 0.15;
    const bufferSize = Math.floor(this.context.sampleRate * duration);
    const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      const t = i / bufferSize;
      const envelope = Math.exp(-t * 15);
      data[i] = (Math.random() * 2 - 1) * envelope;
    }

    const source = this.context.createBufferSource();
    source.buffer = buffer;

    const filter = this.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 800;

    const gain = this.context.createGain();
    gain.gain.value = 0.45;

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    source.start(startTime);
    source.stop(startTime + duration);
  }

  /** Play a single footstep immediately */
  playFootstep(): void {
    this.playFootstepAt(this.context.currentTime);
  }

  /** Play 4 footsteps with interval */
  playFootsteps(): Promise<void> {
    const now = this.context.currentTime;
    const stepInterval = 0.75;
    const stepCount = 4;
    const stepDuration = 0.15;

    for (let i = 0; i < stepCount; i++) {
      this.playFootstepAt(now + i * stepInterval);
    }

    const totalDuration = (stepCount - 1) * stepInterval + stepDuration;
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
}
