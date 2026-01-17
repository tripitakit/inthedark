/**
 * VictorySequence - Spaceship launch sequence sounds
 *
 * Plays a 15-second victory sequence when the player wins.
 */

export class VictorySequence {
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
   * Play the full launch sequence (victory!)
   * Duration: ~15 seconds
   */
  play(): void {
    const now = this.context.currentTime;

    // 1. IGNITION (0-2s): Rumbling low buildup
    this.playIgnition(now);

    // 2. POWER SURGE (2-4s): Ascending sweep
    this.playPowerSurge(now + 2);

    // 3. LIFTOFF (4-8s): Sustained rumble
    this.playLiftoff(now + 4);

    // 4. ACCELERATION (8-12s): Rising pitch
    this.playAcceleration(now + 8);

    // 5. VICTORY FANFARE (12-15s): Triumphant chord
    this.playVictoryFanfare(now + 12);
  }

  private playIgnition(startTime: number): void {
    const osc = this.context.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(30, startTime);
    osc.frequency.exponentialRampToValueAtTime(60, startTime + 2);

    const filter = this.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 100;

    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(0.4, startTime + 0.5);
    gain.gain.setValueAtTime(0.4, startTime + 1.8);
    gain.gain.linearRampToValueAtTime(0.5, startTime + 2);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(startTime);
    osc.stop(startTime + 2);
  }

  private playPowerSurge(startTime: number): void {
    const osc = this.context.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(100, startTime);
    osc.frequency.exponentialRampToValueAtTime(800, startTime + 2);

    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0.3, startTime);
    gain.gain.linearRampToValueAtTime(0.5, startTime + 1);
    gain.gain.linearRampToValueAtTime(0.3, startTime + 2);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(startTime);
    osc.stop(startTime + 2);
  }

  private playLiftoff(startTime: number): void {
    const duration = 4;
    const bufferSize = Math.floor(this.context.sampleRate * duration);
    const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const source = this.context.createBufferSource();
    source.buffer = buffer;

    const filter = this.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 150;

    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0.4, startTime);
    gain.gain.setValueAtTime(0.4, startTime + 3.5);
    gain.gain.linearRampToValueAtTime(0.2, startTime + 4);

    // Bass oscillator for depth
    const bassOsc = this.context.createOscillator();
    bassOsc.type = 'sine';
    bassOsc.frequency.value = 40;

    const bassGain = this.context.createGain();
    bassGain.gain.setValueAtTime(0.3, startTime);
    bassGain.gain.setValueAtTime(0.3, startTime + 3.5);
    bassGain.gain.linearRampToValueAtTime(0.1, startTime + 4);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    bassOsc.connect(bassGain);
    bassGain.connect(this.masterGain);

    source.start(startTime);
    source.stop(startTime + duration);
    bassOsc.start(startTime);
    bassOsc.stop(startTime + duration);
  }

  private playAcceleration(startTime: number): void {
    const osc = this.context.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(80, startTime);
    osc.frequency.exponentialRampToValueAtTime(400, startTime + 4);

    const filter = this.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(200, startTime);
    filter.frequency.exponentialRampToValueAtTime(2000, startTime + 4);

    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0.25, startTime);
    gain.gain.linearRampToValueAtTime(0.35, startTime + 2);
    gain.gain.linearRampToValueAtTime(0.1, startTime + 4);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(startTime);
    osc.stop(startTime + 4);
  }

  private playVictoryFanfare(startTime: number): void {
    // Triumphant major chord: C-E-G-C
    const frequencies = [261.63, 329.63, 392.00, 523.25]; // C4-E4-G4-C5
    const duration = 3;

    for (const freq of frequencies) {
      const osc = this.context.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;

      const gain = this.context.createGain();
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.2, startTime + 0.2);
      gain.gain.setValueAtTime(0.2, startTime + 2);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(startTime);
      osc.stop(startTime + duration);
    }

    // Final arpeggio
    const arpeggioNotes = [523.25, 659.26, 783.99, 1046.50]; // C5-E5-G5-C6
    for (let i = 0; i < arpeggioNotes.length; i++) {
      const osc = this.context.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = arpeggioNotes[i];

      const gain = this.context.createGain();
      const noteStart = startTime + 0.5 + i * 0.15;
      gain.gain.setValueAtTime(0, noteStart);
      gain.gain.linearRampToValueAtTime(0.15, noteStart + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, noteStart + 0.5);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(noteStart);
      osc.stop(noteStart + 0.5);
    }
  }
}
