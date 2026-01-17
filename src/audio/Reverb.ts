import type { ReverbCharacter } from '../types';

// Delay times in seconds for Schroeder reverb
const COMB_DELAYS_NATURAL = [0.029, 0.037, 0.041, 0.043];
const COMB_DELAYS_METALLIC = [0.023, 0.029, 0.033, 0.037];
const COMB_DELAYS_STONE = [0.035, 0.043, 0.051, 0.057];     // Longer for cathedral echo
const COMB_DELAYS_ETHEREAL = [0.017, 0.023, 0.031, 0.037];  // Shorter, more diffuse
const ALLPASS_DELAYS = [0.005, 0.0017];

/**
 * Reverb profile configuration
 */
interface ReverbProfile {
  combDelays: number[];
  decay: number;
  wet: number;
  predelay: number;      // Time before reverb onset (seconds)
  lowpassFreq: number;   // Room EQ - high frequency rolloff
  highpassFreq: number;  // Room EQ - low frequency rolloff
}

/**
 * Predefined reverb profiles for different environments
 */
const REVERB_PROFILES: Record<ReverbCharacter, ReverbProfile> = {
  natural: {
    combDelays: COMB_DELAYS_NATURAL,
    decay: 2.0,
    wet: 0.4,
    predelay: 0,
    lowpassFreq: 8000,
    highpassFreq: 100,
  },
  metallic: {
    combDelays: COMB_DELAYS_METALLIC,
    decay: 1.5,
    wet: 0.5,
    predelay: 0.01,
    lowpassFreq: 12000,
    highpassFreq: 150,
  },
  stone: {
    combDelays: COMB_DELAYS_STONE,
    decay: 3.5,
    wet: 0.6,
    predelay: 0.03,
    lowpassFreq: 3000,
    highpassFreq: 80,
  },
  ethereal: {
    combDelays: COMB_DELAYS_ETHEREAL,
    decay: 5.0,
    wet: 0.7,
    predelay: 0.05,
    lowpassFreq: 6000,
    highpassFreq: 60,
  },
};

/**
 * Reverb - Riverbero algoritmico basato su Schroeder
 *
 * Implementazione:
 * - Predelay for room size simulation
 * - Lowpass/highpass filters for room EQ
 * - 4 comb filters in parallelo
 * - 2 allpass filters in serie
 * - Feedback controllato dal decay time
 */
export class Reverb {
  private context: AudioContext;
  private input: GainNode;
  private output: GainNode;
  private wetGain: GainNode;
  private dryGain: GainNode;

  // Predelay and EQ
  private predelay: DelayNode;
  private lowpassFilter: BiquadFilterNode;
  private highpassFilter: BiquadFilterNode;

  private combFilters: { delay: DelayNode; feedback: GainNode }[] = [];
  private combMixer: GainNode;
  private allpassFilters: { input: GainNode; output: GainNode }[] = [];

  private currentDecay: number = 2.0;
  private currentCharacter: ReverbCharacter = 'natural';

  constructor(context: AudioContext) {
    this.context = context;

    // Create input/output nodes
    this.input = context.createGain();
    this.output = context.createGain();
    this.wetGain = context.createGain();
    this.dryGain = context.createGain();
    this.combMixer = context.createGain();

    // Create predelay
    this.predelay = context.createDelay(0.1);
    this.predelay.delayTime.value = 0;

    // Create EQ filters
    this.lowpassFilter = context.createBiquadFilter();
    this.lowpassFilter.type = 'lowpass';
    this.lowpassFilter.frequency.value = 8000;
    this.lowpassFilter.Q.value = 0.7;

    this.highpassFilter = context.createBiquadFilter();
    this.highpassFilter.type = 'highpass';
    this.highpassFilter.frequency.value = 100;
    this.highpassFilter.Q.value = 0.7;

    // Set initial wet/dry
    this.wetGain.gain.value = 0.4;
    this.dryGain.gain.value = 0.6;
    this.combMixer.gain.value = 0.25; // Mix down 4 comb filters

    // Build the reverb network
    this.buildNetwork();

    // Connect dry path
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);
  }

  private buildNetwork(): void {
    const profile = REVERB_PROFILES[this.currentCharacter];

    // Create 4 comb filters in parallel
    for (const delayTime of profile.combDelays) {
      const comb = this.createCombFilter(delayTime);
      this.combFilters.push(comb);

      // Connect: predelay → comb → combMixer
      this.predelay.connect(comb.delay);
      comb.delay.connect(this.combMixer);
    }

    // Create 2 allpass filters in series
    let prevNode: AudioNode = this.combMixer;
    for (const delayTime of ALLPASS_DELAYS) {
      const allpass = this.createAllpassFilter(delayTime);
      this.allpassFilters.push(allpass);

      prevNode.connect(allpass.input);
      prevNode = allpass.output;
    }

    // Connect: input → highpass → predelay (predelay feeds comb filters above)
    this.input.connect(this.highpassFilter);
    this.highpassFilter.connect(this.predelay);

    // Connect: allpass → lowpass → wetGain → output
    prevNode.connect(this.lowpassFilter);
    this.lowpassFilter.connect(this.wetGain);
    this.wetGain.connect(this.output);

    // Set initial decay
    this.updateFeedback();
  }

  private createCombFilter(delayTime: number): { delay: DelayNode; feedback: GainNode } {
    const delay = this.context.createDelay(1.0);
    delay.delayTime.value = delayTime;

    const feedback = this.context.createGain();
    feedback.gain.value = 0.7; // Will be updated by setDecay

    // Comb filter: delay with feedback loop
    delay.connect(feedback);
    feedback.connect(delay);

    return { delay, feedback };
  }

  /**
   * Crea un vero allpass filter con feedforward e feedback paths.
   *
   * Schema:
   *   input ──┬──► delay ──┬──► (+) ──► output
   *           │            │
   *           │            └──► (*g) ──┐
   *           │                        │
   *           └──► (*-g) ──────────────┴──► (+) ──► delay.input
   *
   * Semplificato con Web Audio API usando gain nodes.
   */
  private createAllpassFilter(delayTime: number): { input: GainNode; output: GainNode } {
    const g = 0.5; // Allpass coefficient

    // Nodes
    const input = this.context.createGain();
    const output = this.context.createGain();
    const delay = this.context.createDelay(0.1);
    delay.delayTime.value = delayTime;

    const feedforward = this.context.createGain();
    feedforward.gain.value = -g; // Negative feedforward

    const feedback = this.context.createGain();
    feedback.gain.value = g;

    // Connections for allpass:
    // 1. Input splits to delay and feedforward
    input.connect(delay);
    input.connect(feedforward);

    // 2. Delay output goes to output and feedback
    delay.connect(output);
    delay.connect(feedback);

    // 3. Feedforward goes directly to output
    feedforward.connect(output);

    // 4. Feedback goes back to delay input (via input node sum)
    feedback.connect(delay);

    return { input, output };
  }

  private updateFeedback(): void {
    // Calculate feedback gain from decay time
    // Longer decay = higher feedback (closer to 1.0)
    // Formula: feedback = 10^(-3 * delayTime / decayTime)
    const decay = Math.max(0.5, this.currentDecay);
    const profile = REVERB_PROFILES[this.currentCharacter];

    for (let i = 0; i < this.combFilters.length; i++) {
      const delayTime = profile.combDelays[i];
      const feedback = Math.pow(10, -3 * delayTime / decay);
      this.combFilters[i].feedback.gain.value = Math.min(0.95, feedback);
    }
  }

  /**
   * Apply a full profile configuration with smooth transitions
   */
  private applyProfile(profile: ReverbProfile, duration: number = 0.5): void {
    const now = this.context.currentTime;

    // Update predelay
    this.predelay.delayTime.setValueAtTime(this.predelay.delayTime.value, now);
    this.predelay.delayTime.linearRampToValueAtTime(profile.predelay, now + duration);

    // Update EQ filters
    this.lowpassFilter.frequency.setValueAtTime(this.lowpassFilter.frequency.value, now);
    this.lowpassFilter.frequency.exponentialRampToValueAtTime(profile.lowpassFreq, now + duration);

    this.highpassFilter.frequency.setValueAtTime(this.highpassFilter.frequency.value, now);
    this.highpassFilter.frequency.exponentialRampToValueAtTime(profile.highpassFreq, now + duration);

    // Update wet/dry
    const targetWet = profile.wet;
    this.wetGain.gain.setValueAtTime(this.wetGain.gain.value, now);
    this.wetGain.gain.linearRampToValueAtTime(targetWet, now + duration);
    this.dryGain.gain.setValueAtTime(this.dryGain.gain.value, now);
    this.dryGain.gain.linearRampToValueAtTime(1 - targetWet, now + duration);

    // Update decay and comb delay times
    this.currentDecay = profile.decay;
    for (let i = 0; i < this.combFilters.length; i++) {
      const delayTime = profile.combDelays[i];
      this.combFilters[i].delay.delayTime.setValueAtTime(
        this.combFilters[i].delay.delayTime.value,
        now
      );
      this.combFilters[i].delay.delayTime.linearRampToValueAtTime(delayTime, now + duration);
    }

    this.updateFeedback();
  }

  /**
   * Set reverb decay time in seconds (0.5 - 5.0)
   */
  setDecay(seconds: number): void {
    this.currentDecay = Math.max(0.5, Math.min(5.0, seconds));
    this.updateFeedback();
  }

  /**
   * Set wet/dry mix (0.0 = dry only, 1.0 = wet only)
   */
  setWetDry(wet: number): void {
    const w = Math.max(0, Math.min(1, wet));
    this.wetGain.gain.value = w;
    this.dryGain.gain.value = 1 - w;
  }

  /**
   * Set reverb character with smooth transition
   * Supports: natural, metallic, stone, ethereal
   */
  setCharacter(character: ReverbCharacter, transitionDuration: number = 0.5): void {
    if (character === this.currentCharacter) return;

    this.currentCharacter = character;
    const profile = REVERB_PROFILES[character];
    this.applyProfile(profile, transitionDuration);
  }

  /**
   * Get current reverb character
   */
  getCharacter(): ReverbCharacter {
    return this.currentCharacter;
  }

  /**
   * Smoothly transition to new parameters
   */
  transitionTo(decay: number, wet: number, duration: number): void {
    const now = this.context.currentTime;

    // Fade wet/dry
    const targetWet = Math.max(0, Math.min(1, wet));
    this.wetGain.gain.setValueAtTime(this.wetGain.gain.value, now);
    this.wetGain.gain.linearRampToValueAtTime(targetWet, now + duration);
    this.dryGain.gain.setValueAtTime(this.dryGain.gain.value, now);
    this.dryGain.gain.linearRampToValueAtTime(1 - targetWet, now + duration);

    // Update decay (feedback changes are instant, not smoothed)
    this.currentDecay = Math.max(0.5, Math.min(5.0, decay));
    this.updateFeedback();
  }

  /**
   * Get input node (connect sources here)
   */
  getInput(): GainNode {
    return this.input;
  }

  /**
   * Get output node (connect to destination)
   */
  getOutput(): GainNode {
    return this.output;
  }
}
