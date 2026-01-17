/**
 * VoiceSelector - Centralized voice selection for Web Speech API
 *
 * Provides consistent English voice selection across the application.
 * Prefers male voices with a specific priority order.
 */

/** Preferred voices in priority order */
const PREFERRED_VOICES = [
  'Microsoft David',  // Windows - male, deep voice
  'Daniel',           // macOS UK - male
  'Alex',             // macOS - male
  'Google UK English Male',
  'Microsoft Mark',   // Windows - male
  'Thomas',           // macOS - male
  'English (America)',    // Linux espeak
  'English (Great Britain)',
];

/** Cached selected voice */
let cachedVoice: SpeechSynthesisVoice | null = null;
let voicesLoaded = false;

/**
 * Check if voices have been loaded
 */
export function areVoicesLoaded(): boolean {
  return voicesLoaded;
}

/**
 * Select the best available English voice
 * Returns cached voice if already selected
 */
export function selectEnglishVoice(): SpeechSynthesisVoice | null {
  if (!('speechSynthesis' in window)) {
    return null;
  }

  const voices = speechSynthesis.getVoices();
  if (voices.length === 0) {
    return cachedVoice;
  }

  voicesLoaded = true;

  // Return cached voice if still available
  if (cachedVoice && voices.includes(cachedVoice)) {
    return cachedVoice;
  }

  // Try to find a preferred voice
  for (const preferred of PREFERRED_VOICES) {
    const found = voices.find(
      (v) =>
        v.name.includes(preferred) ||
        v.lang.startsWith(preferred) ||
        v.lang === preferred
    );
    if (found) {
      cachedVoice = found;
      console.log(`VoiceSelector: Selected voice: ${found.name} (${found.lang})`);
      return cachedVoice;
    }
  }

  // Fallback: find any English male voice (avoid female voices)
  const englishVoices = voices.filter(
    (v) => v.lang.startsWith('en-') || v.lang.startsWith('en_')
  );

  // Prefer voices with "male" in name, or without "female" in name
  const maleVoice =
    englishVoices.find(
      (v) =>
        v.name.toLowerCase().includes('male') &&
        !v.name.toLowerCase().includes('female')
    ) ||
    englishVoices.find((v) => !v.name.toLowerCase().includes('female')) ||
    englishVoices[0];

  if (maleVoice) {
    cachedVoice = maleVoice;
    console.log(
      `VoiceSelector: Using fallback English voice: ${maleVoice.name} (${maleVoice.lang})`
    );
    return cachedVoice;
  }

  // Last resort: use first available voice
  if (voices.length > 0) {
    cachedVoice = voices[0];
    console.log(
      `VoiceSelector: No English voice found, using: ${voices[0].name} (${voices[0].lang})`
    );
    return cachedVoice;
  }

  return null;
}

/**
 * Wait for voices to load (with timeout)
 * @param timeoutMs Timeout in milliseconds (default 1000)
 */
export function waitForVoices(timeoutMs: number = 1000): Promise<void> {
  return new Promise((resolve) => {
    if (voicesLoaded) {
      resolve();
      return;
    }

    const checkVoices = () => {
      const voices = speechSynthesis.getVoices();
      if (voices.length > 0) {
        voicesLoaded = true;
        selectEnglishVoice();
        resolve();
      }
    };

    // Check immediately
    checkVoices();

    if (!voicesLoaded) {
      // Set up listener for async loading (Firefox, Safari)
      speechSynthesis.onvoiceschanged = () => {
        checkVoices();
      };

      // Timeout fallback
      setTimeout(() => {
        resolve();
      }, timeoutMs);
    }
  });
}

/**
 * Configure an utterance with the selected voice and standard settings
 */
export function configureUtterance(
  utterance: SpeechSynthesisUtterance,
  options: {
    rate?: number;
    pitch?: number;
    volume?: number;
  } = {}
): void {
  const { rate = 0.95, pitch = 0.5, volume = 1.0 } = options;

  utterance.rate = rate;
  utterance.pitch = pitch;
  utterance.volume = volume;
  utterance.lang = 'en-US';

  const voice = selectEnglishVoice();
  if (voice) {
    utterance.voice = voice;
  }
}

/**
 * Create and speak an utterance with the selected voice
 */
export function speak(
  text: string,
  options: {
    rate?: number;
    pitch?: number;
    volume?: number;
    cancelPending?: boolean;
  } = {}
): void {
  if (!('speechSynthesis' in window)) {
    return;
  }

  const { cancelPending = false, ...utteranceOptions } = options;

  if (cancelPending) {
    speechSynthesis.cancel();
  }

  const utterance = new SpeechSynthesisUtterance(text);
  configureUtterance(utterance, utteranceOptions);
  speechSynthesis.speak(utterance);
}
