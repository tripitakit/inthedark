import { VoiceSynthesizer } from './VoiceSynthesizer';
import type { AudioEngine } from './AudioEngine';

/**
 * RoomNarrator - Speaks room information using Web Speech API
 *
 * Features:
 * - Toggle on/off with P key
 * - Automatically narrates when entering a new room
 * - Speaks room name and description
 * - Won't interrupt itself if already speaking
 */
export class RoomNarrator {
  private voiceSynth: VoiceSynthesizer;
  private enabled: boolean;
  private lastNarratedRoom: string = '';

  constructor(audioEngine: AudioEngine, enabled: boolean = false) {
    this.voiceSynth = new VoiceSynthesizer(audioEngine);
    this.enabled = enabled;
    // Use slightly lower pitch for room narration
    this.voiceSynth.setPitch(100);
  }

  /**
   * Check if narration is enabled
   */
  get isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Check if currently speaking
   */
  get isSpeaking(): boolean {
    return this.voiceSynth.speaking;
  }

  /**
   * Enable voice narration
   */
  enable(): void {
    this.enabled = true;
    console.log('RoomNarrator: Enabled');
  }

  /**
   * Disable voice narration
   */
  disable(): void {
    this.enabled = false;
    console.log('RoomNarrator: Disabled');
  }

  /**
   * Toggle voice narration on/off
   * @returns The new enabled state
   */
  toggle(): boolean {
    this.enabled = !this.enabled;
    console.log(`RoomNarrator: ${this.enabled ? 'Enabled' : 'Disabled'}`);
    return this.enabled;
  }

  /**
   * Set enabled state
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Compose full narration text from room info
   */
  private composeNarration(
    roomName: string,
    description: string
  ): string {
    // Format: "Room Name. Description..."
    return `${roomName}. ${description}`;
  }

  /**
   * Narrate a room with full context
   * Will only speak if:
   * - Narration is enabled
   * - Not currently speaking
   * - Room is different from last narrated (prevents repeat on rotation)
   *
   * @param roomId The room identifier
   * @param roomName The display name of the room
   * @param direction The player's facing direction
   * @param description The room description to speak
   * @param force Force narration even if same room (for manual trigger)
   */
  async narrateRoom(
    roomId: string,
    roomName: string,
    _direction: unknown,
    description: string,
    force: boolean = false
  ): Promise<void> {
    if (!this.enabled) {
      return;
    }

    if (this.voiceSynth.speaking) {
      console.log('RoomNarrator: Already speaking, skipping');
      return;
    }

    // Don't repeat the same room unless forced
    if (!force && roomId === this.lastNarratedRoom) {
      return;
    }

    if (!description || description.trim().length === 0) {
      return;
    }

    this.lastNarratedRoom = roomId;
    const fullNarration = this.composeNarration(roomName, description);
    console.log(`RoomNarrator: Speaking for ${roomId}: "${fullNarration.substring(0, 60)}..."`);

    await this.voiceSynth.speak(fullNarration);
  }

  /**
   * Force narrate current room (for manual P key trigger while in a room)
   */
  async narrateNow(
    roomId: string,
    roomName: string,
    description: string
  ): Promise<void> {
    if (this.voiceSynth.speaking) {
      return;
    }

    if (!description || description.trim().length === 0) {
      return;
    }

    this.lastNarratedRoom = roomId;
    const fullNarration = this.composeNarration(roomName, description);
    await this.voiceSynth.speak(fullNarration);
  }

  /**
   * Reset last narrated room (useful when loading a save)
   */
  reset(): void {
    this.lastNarratedRoom = '';
  }
}
