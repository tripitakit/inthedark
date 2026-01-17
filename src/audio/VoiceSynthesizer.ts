import { audioEngine } from './AudioEngine';
import {
  selectEnglishVoice,
  areVoicesLoaded,
  waitForVoices as waitForVoicesShared,
} from './VoiceSelector';
import { getMixer } from './AudioMixer';

/**
 * VoiceSynthesizer - Text-to-speech using Web Speech API
 *
 * Uses the browser's native SpeechSynthesis for clear, intelligible speech.
 * Explicitly selects an English voice for consistency.
 * Lower pitch creates a more robotic/mechanical tone.
 */
export class VoiceSynthesizer {
  private isSpeaking: boolean = false;
  private rate: number = 0.95; // Slightly slower than normal
  private pitch: number = 0.7; // Lower pitch for mechanical tone
  private volume: number = 1.0;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(_audioEngine: unknown) {
    // AudioEngine kept for interface compatibility but not used
    // Voice selection is handled by VoiceSelector
    selectEnglishVoice();
  }

  /**
   * Check if currently speaking
   */
  get speaking(): boolean {
    return this.isSpeaking;
  }

  /**
   * Speak a text string using Web Speech API
   */
  async speak(text: string): Promise<void> {
    // Don't interrupt controls help speech
    if (audioEngine.isSpeakingControls()) {
      console.log('VoiceSynthesizer: Controls help is speaking, skipping');
      return;
    }

    if (this.isSpeaking) {
      console.log('VoiceSynthesizer: Already speaking');
      return;
    }

    if (!('speechSynthesis' in window)) {
      console.log('VoiceSynthesizer: Web Speech API not supported');
      return;
    }

    // Cancel any pending speech
    speechSynthesis.cancel();

    // Wait for voices if not loaded yet
    if (!areVoicesLoaded()) {
      await waitForVoicesShared();
    }

    const voice = selectEnglishVoice();

    return new Promise((resolve) => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = this.rate;
      utterance.pitch = this.pitch;
      utterance.volume = this.volume;
      utterance.lang = 'en-US'; // Force English

      // Set voice if available
      if (voice) {
        utterance.voice = voice;
      }

      this.isSpeaking = true;

      // Duck background audio when speech starts
      const mixer = getMixer();
      if (mixer) {
        mixer.duck(['ambience', 'effects']);
      }

      console.log(
        `VoiceSynthesizer: Speaking "${text.substring(0, 50)}..." (voice: ${voice?.name || 'default'}, pitch: ${this.pitch.toFixed(2)}, rate: ${this.rate})`
      );

      utterance.onend = () => {
        console.log('VoiceSynthesizer: Speech complete');
        this.isSpeaking = false;
        // Restore background audio when speech ends
        if (mixer) {
          mixer.unduck(['ambience', 'effects']);
        }
        resolve();
      };

      utterance.onerror = (event) => {
        console.log('VoiceSynthesizer: Speech error', event.error);
        this.isSpeaking = false;
        // Restore background audio on error too
        if (mixer) {
          mixer.unduck(['ambience', 'effects']);
        }
        resolve();
      };

      speechSynthesis.speak(utterance);
    });
  }

  /**
   * Set the pitch of the voice
   * Maps old frequency range (60-200) to Web Speech pitch (0.3-1.0)
   * Lower values = deeper, more mechanical tone
   */
  setPitch(frequency: number): void {
    // Clamp frequency to expected range
    const clampedFreq = Math.max(60, Math.min(200, frequency));
    // Map to a lower Web Speech pitch range (0.3-1.0) for robotic effect
    this.pitch = 0.3 + ((clampedFreq - 60) / 140) * 0.7;
    console.log(
      `VoiceSynthesizer: Pitch set to ${this.pitch.toFixed(2)} (from frequency ${frequency})`
    );
  }

  /**
   * Set the speech rate
   */
  setRate(rate: number): void {
    this.rate = Math.max(0.1, Math.min(2.0, rate));
  }

  /**
   * Set the volume
   */
  setVolume(vol: number): void {
    this.volume = Math.max(0, Math.min(1, vol));
  }

  /**
   * Stop any current speech
   */
  stop(): void {
    speechSynthesis.cancel();
    this.isSpeaking = false;
  }
}
