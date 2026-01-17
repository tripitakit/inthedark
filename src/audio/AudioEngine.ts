import type { Direction, ItemSoundSignature, SurfaceType } from '../types';
import { speak } from './VoiceSelector';
import { ItemSounds } from './ItemSounds';
import { GameFeedback } from './GameFeedback';
import { VictorySequence } from './VictorySequence';
import { SurpriseEffects } from './SurpriseEffects';
import { createMixer, AudioMixer } from './AudioMixer';
import { BinauralAudio } from './BinauralAudio';
import { MASTER_VOLUME } from '../constants';

// Spoken direction names for compass
const DIRECTION_SPEECH: Record<Direction, string> = {
  north: 'North',
  east: 'East',
  south: 'South',
  west: 'West',
};

/**
 * AudioEngine - Main audio orchestrator
 *
 * Manages the Web Audio API context and delegates to specialized modules
 * for different sound categories.
 */
export class AudioEngine {
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;

  // Specialized sound modules
  private itemSounds: ItemSounds | null = null;
  private gameFeedback: GameFeedback | null = null;
  private victorySequence: VictorySequence | null = null;
  private surpriseEffects: SurpriseEffects | null = null;
  private mixer: AudioMixer | null = null;

  // Flag to protect controls speech from being cancelled
  private speakingControls: boolean = false;

  /**
   * Check if controls help is currently being spoken
   */
  isSpeakingControls(): boolean {
    return this.speakingControls;
  }

  /**
   * Get the audio context (needed for SpatialAudio and Sonar)
   */
  getContext(): AudioContext | null {
    return this.context;
  }

  /**
   * Get the master gain node for connecting other nodes
   */
  getMasterGain(): GainNode | null {
    return this.masterGain;
  }

  /**
   * Get the audio mixer for bus routing and ducking
   */
  getMixer(): AudioMixer | null {
    return this.mixer;
  }

  /**
   * Set binaural audio processor for HRTF spatial audio
   * When set, spatial sounds will use HRTF instead of stereo panning
   */
  setBinauralAudio(binaural: BinauralAudio | null): void {
    this.itemSounds?.setBinauralAudio(binaural);
  }

  /**
   * Initialize the AudioContext (must be called after user gesture)
   */
  async init(): Promise<void> {
    this.context = new AudioContext();
    this.masterGain = this.context.createGain();
    this.masterGain.gain.value = MASTER_VOLUME;
    this.masterGain.connect(this.context.destination);

    // Initialize mixer for ducking support
    this.mixer = createMixer(this.context, this.masterGain);

    // Initialize specialized modules
    this.itemSounds = new ItemSounds(this.context, this.masterGain);
    this.gameFeedback = new GameFeedback(this.context, this.masterGain);
    this.victorySequence = new VictorySequence(this.context, this.masterGain);
    this.surpriseEffects = new SurpriseEffects(this.context, this.masterGain);

    // Resume context if suspended
    if (this.context.state === 'suspended') {
      await this.context.resume();
    }

    console.log('AudioEngine initialized');
  }

  /**
   * Check if the engine is ready
   */
  isReady(): boolean {
    return this.context !== null && this.context.state === 'running';
  }

  // ========================================
  // MOVEMENT & FEEDBACK SOUNDS
  // ========================================

  playFootstep(surface: SurfaceType = 'stone'): void {
    this.gameFeedback?.playFootstep(surface);
  }

  playFootsteps(surface: SurfaceType = 'stone'): Promise<void> {
    return this.gameFeedback?.playFootsteps(surface) ?? Promise.resolve();
  }

  playObstacle(): void {
    this.gameFeedback?.playObstacle();
  }

  playPing(): void {
    this.gameFeedback?.playPing();
  }

  playEchoFiltered(isPassage: boolean): void {
    this.gameFeedback?.playEchoFiltered(isPassage);
  }

  playPickup(): void {
    this.gameFeedback?.playPickup();
  }

  playUnlock(): void {
    this.gameFeedback?.playUnlock();
  }

  playError(): void {
    this.gameFeedback?.playError();
  }

  playItemPresence(): void {
    this.gameFeedback?.playItemPresence();
  }

  playSaveConfirm(): void {
    this.gameFeedback?.playSaveConfirm();
    this.speakSaveConfirm();
  }

  /**
   * Speak "Game saved" using the female voice
   */
  private speakSaveConfirm(): void {
    const voices = speechSynthesis.getVoices();
    const femaleVoice = this.selectFemaleVoice(voices);

    const utterance = new SpeechSynthesisUtterance('Game saved');
    utterance.rate = 0.85;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    utterance.lang = 'en-US';

    if (femaleVoice) {
      utterance.voice = femaleVoice;
    }

    speechSynthesis.speak(utterance);
  }

  playEmptyPickup(): void {
    this.gameFeedback?.playEmptyPickup();
  }

  playLockPresence(): void {
    this.gameFeedback?.playLockPresence();
  }

  playRoomTransition(fromEnv?: string, toEnv?: string): void {
    this.gameFeedback?.playRoomTransition(fromEnv, toEnv);
  }

  playDoorOpen(): void {
    this.gameFeedback?.playDoorOpen();
  }

  playDiscoveryChime(): void {
    this.gameFeedback?.playDiscoveryChime();
  }

  // ========================================
  // SPEECH
  // ========================================

  playCompassTone(direction: Direction): void {
    this.speakDirection('Facing', direction);
  }

  playWalkingDirection(direction: Direction): void {
    this.speakDirection('Walking', direction);
  }

  speakPickup(itemName: string): void {
    speak(`You picked up a ${itemName}`);
  }

  private speakDirection(prefix: string, direction: Direction): void {
    // Don't cancel if controls are being spoken
    if (this.speakingControls) {
      return; // Skip direction speech while controls are playing
    }
    speak(`${prefix} ${DIRECTION_SPEECH[direction]}`, { cancelPending: true });
  }

  speakToggle(feature: string, enabled: boolean): void {
    speak(`${feature} ${enabled ? 'on' : 'off'}`);
  }

  playVoiceNarration(text: string): void {
    speak(text);
  }

  speakControls(): void {
    // Set flag to protect from direction speech cancellation
    this.speakingControls = true;

    // Cancel any pending speech first
    speechSynthesis.cancel();

    const controlLines = [
      'Controls.',
      'Arrow Up faces North. Arrow Down faces South.',
      'Arrow Left faces West. Arrow Right faces East.',
      'Tab walks forward.',
      'Enter activates sonar. Walls echo short, passages echo long.',
      'Space picks up or uses items. Control cycles inventory.',
      'S saves. H hints. P toggles narration. Escape repeats controls.',
    ];

    // Select a female voice for controls help
    const voices = speechSynthesis.getVoices();
    const femaleVoice = this.selectFemaleVoice(voices);

    // Queue all lines with error handling on each utterance
    controlLines.forEach((line, index) => {
      const utterance = new SpeechSynthesisUtterance(line);
      utterance.rate = 0.85; // Slower, like narrator
      utterance.pitch = 1.0; // Normal pitch for female voice
      utterance.volume = 1.0;
      utterance.lang = 'en-US';

      if (femaleVoice) {
        utterance.voice = femaleVoice;
      }

      // Add error handler to ALL utterances to prevent flag getting stuck
      utterance.onerror = () => {
        this.speakingControls = false;
      };

      // On last utterance, also clear on successful end
      if (index === controlLines.length - 1) {
        utterance.onend = () => {
          this.speakingControls = false;
        };
      }

      speechSynthesis.speak(utterance);
    });
  }

  /**
   * Select a female English voice for controls help
   */
  private selectFemaleVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
    // Preferred female voices in priority order
    const preferredFemale = [
      'Microsoft Zira',    // Windows - female
      'Samantha',          // macOS - female
      'Victoria',          // macOS - female
      'Karen',             // macOS Australian - female
      'Google UK English Female',
      'Google US English', // Often female
      'Fiona',             // macOS Scottish - female
    ];

    // Try to find a preferred female voice
    for (const preferred of preferredFemale) {
      const found = voices.find(
        (v) => v.name.includes(preferred) && (v.lang.startsWith('en-') || v.lang.startsWith('en_'))
      );
      if (found) {
        return found;
      }
    }

    // Fallback: find any English female voice
    const englishVoices = voices.filter(
      (v) => v.lang.startsWith('en-') || v.lang.startsWith('en_')
    );

    const femaleVoice = englishVoices.find(
      (v) => v.name.toLowerCase().includes('female')
    ) || englishVoices.find(
      (v) => !v.name.toLowerCase().includes('male')
    );

    return femaleVoice || null;
  }

  // ========================================
  // ITEM SOUND SIGNATURES
  // ========================================

  playItemSignature(signature: ItemSoundSignature): void {
    this.itemSounds?.playSignature(signature);
  }

  playSignatureEcho(signature: ItemSoundSignature): void {
    this.itemSounds?.playSignatureEcho(signature);
  }

  playItemIdleLoop(signature: ItemSoundSignature, pan: number = 0, distance: number = 0): void {
    this.itemSounds?.playIdleLoop(signature, pan, distance);
  }

  stopItemIdleLoop(signature: ItemSoundSignature): void {
    this.itemSounds?.stopIdleLoop(signature);
  }

  stopAllItemIdleLoops(): void {
    this.itemSounds?.stopAllIdleLoops();
  }

  // ========================================
  // VICTORY SEQUENCE
  // ========================================

  playLaunchSequence(): void {
    this.victorySequence?.play();
  }

  // ========================================
  // SURPRISE EFFECTS
  // ========================================

  playSurpriseEffect(soundId: string): void {
    this.surpriseEffects?.playEffect(soundId);
  }

  playSurpriseAmbient(soundId: string): void {
    this.surpriseEffects?.playAmbient(soundId);
  }
}

// Singleton instance
export const audioEngine = new AudioEngine();
