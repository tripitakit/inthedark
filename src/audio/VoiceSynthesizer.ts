import type { AudioEngine } from './AudioEngine';

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
  private voice: SpeechSynthesisVoice | null = null;
  private voicesLoaded: boolean = false;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(_audioEngine: AudioEngine) {
    // AudioEngine kept for interface compatibility but not used
    this.loadVoices();
  }

  /**
   * Load and select an English voice
   */
  private loadVoices(): void {
    if (!('speechSynthesis' in window)) {
      return;
    }

    const selectEnglishVoice = () => {
      const voices = speechSynthesis.getVoices();
      if (voices.length === 0) return;

      console.log(
        'VoiceSynthesizer: Available voices:',
        voices.map((v) => `${v.name} (${v.lang})`).join(', ')
      );

      // Priority order for English male/baritone voices
      const preferredVoices = [
        'Microsoft David', // Windows - male, deep voice
        'Daniel', // macOS UK - male
        'Alex', // macOS - male
        'Google UK English Male',
        'Microsoft Mark', // Windows - male
        'Thomas', // macOS - male
        'English (America)', // Linux espeak
        'English (Great Britain)',
      ];

      // Try to find a preferred voice
      for (const preferred of preferredVoices) {
        const found = voices.find(
          (v) =>
            v.name.includes(preferred) ||
            v.lang.startsWith(preferred) ||
            v.lang === preferred
        );
        if (found) {
          this.voice = found;
          console.log(`VoiceSynthesizer: Selected voice: ${found.name} (${found.lang})`);
          this.voicesLoaded = true;
          return;
        }
      }

      // Fallback: find any English male voice (avoid female voices)
      const englishVoices = voices.filter(
        (v) => v.lang.startsWith('en-') || v.lang.startsWith('en_')
      );
      // Prefer voices with "male" in name, or without "female" in name
      const maleVoice = englishVoices.find(
        (v) => v.name.toLowerCase().includes('male') && !v.name.toLowerCase().includes('female')
      ) || englishVoices.find(
        (v) => !v.name.toLowerCase().includes('female')
      ) || englishVoices[0];

      if (maleVoice) {
        this.voice = maleVoice;
        console.log(
          `VoiceSynthesizer: Using fallback English voice: ${maleVoice.name} (${maleVoice.lang})`
        );
        this.voicesLoaded = true;
        return;
      }

      // Last resort: use first available voice
      if (voices.length > 0) {
        this.voice = voices[0];
        console.log(
          `VoiceSynthesizer: No English voice found, using: ${voices[0].name} (${voices[0].lang})`
        );
        this.voicesLoaded = true;
      }
    };

    // Try immediately (Chrome loads voices synchronously)
    selectEnglishVoice();

    // Also listen for async voice loading (Firefox, Safari)
    if (!this.voicesLoaded) {
      speechSynthesis.onvoiceschanged = () => {
        if (!this.voicesLoaded) {
          selectEnglishVoice();
        }
      };
    }
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
    if (!this.voicesLoaded) {
      await this.waitForVoices();
    }

    return new Promise((resolve) => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = this.rate;
      utterance.pitch = this.pitch;
      utterance.volume = this.volume;
      utterance.lang = 'en-US'; // Force English

      // Set voice if available
      if (this.voice) {
        utterance.voice = this.voice;
      }

      this.isSpeaking = true;

      console.log(
        `VoiceSynthesizer: Speaking "${text.substring(0, 50)}..." (voice: ${this.voice?.name || 'default'}, pitch: ${this.pitch.toFixed(2)}, rate: ${this.rate})`
      );

      utterance.onend = () => {
        console.log('VoiceSynthesizer: Speech complete');
        this.isSpeaking = false;
        resolve();
      };

      utterance.onerror = (event) => {
        console.log('VoiceSynthesizer: Speech error', event.error);
        this.isSpeaking = false;
        resolve();
      };

      speechSynthesis.speak(utterance);
    });
  }

  /**
   * Wait for voices to load (with timeout)
   */
  private waitForVoices(): Promise<void> {
    return new Promise((resolve) => {
      if (this.voicesLoaded) {
        resolve();
        return;
      }

      const checkVoices = () => {
        const voices = speechSynthesis.getVoices();
        if (voices.length > 0) {
          this.loadVoices();
          resolve();
        }
      };

      // Check immediately
      checkVoices();

      // Set up listener
      speechSynthesis.onvoiceschanged = () => {
        checkVoices();
      };

      // Timeout after 1 second
      setTimeout(() => {
        resolve();
      }, 1000);
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
