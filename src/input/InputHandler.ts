import { Movement } from '../game/Movement';
import { audioEngine } from '../audio/AudioEngine';
import { speak } from '../audio/VoiceSelector';
import { getSpokenName } from '../data/itemNames';
import { INVENTORY_SPEECH_DELAY } from '../constants';
import type { GameState } from '../game/GameState';
import type { Interaction } from '../game/Interaction';
import type { HintSystem } from '../game/HintSystem';
import type { RoomNarrator } from '../audio/RoomNarrator';

/**
 * InputHandler - Gestisce gli input da tastiera
 */
export class InputHandler {
  private movement: Movement;
  private gameState: GameState | null = null;
  private interaction: Interaction | null = null;
  private hintSystem: HintSystem | null = null;
  private roomNarrator: RoomNarrator | null = null;
  private onAction?: () => void;
  private onSave?: () => void;
  private onInventoryChange?: (itemId: string | null) => void;
  private onNarrationToggle?: (enabled: boolean) => void;
  private enabled: boolean = false;
  private isMoving: boolean = false; // Previene input durante movimento
  private boundHandleKeyDown: ((event: KeyboardEvent) => void) | null = null;

  constructor(movement: Movement, onAction?: () => void) {
    this.movement = movement;
    this.onAction = onAction;
    // Bind the handler once to ensure we can remove it later
    this.boundHandleKeyDown = this.handleKeyDown.bind(this);
  }

  /**
   * Callback when save is triggered
   */
  setOnSave(callback: () => void): void {
    this.onSave = callback;
  }

  /**
   * Imposta l'istanza Interaction da usare
   */
  setInteraction(interaction: Interaction): void {
    this.interaction = interaction;
  }

  /**
   * Imposta l'istanza GameState da usare
   */
  setGameState(gameState: GameState): void {
    this.gameState = gameState;
  }

  /**
   * Set the HintSystem instance
   */
  setHintSystem(hintSystem: HintSystem): void {
    this.hintSystem = hintSystem;
  }

  /**
   * Set the RoomNarrator instance
   */
  setRoomNarrator(roomNarrator: RoomNarrator): void {
    this.roomNarrator = roomNarrator;
  }

  /**
   * Callback quando cambia oggetto selezionato nell'inventario
   */
  setOnInventoryChange(callback: (itemId: string | null) => void): void {
    this.onInventoryChange = callback;
  }

  /**
   * Callback when narration is toggled
   */
  setOnNarrationToggle(callback: (enabled: boolean) => void): void {
    this.onNarrationToggle = callback;
  }

  /**
   * Attiva la gestione degli input
   */
  enable(): void {
    if (this.enabled) return;
    if (!this.boundHandleKeyDown) return;

    this.enabled = true;
    document.addEventListener('keydown', this.boundHandleKeyDown);
    console.log('InputHandler attivato');
  }

  /**
   * Disattiva la gestione degli input
   */
  disable(): void {
    if (!this.enabled) return;
    if (!this.boundHandleKeyDown) return;

    this.enabled = false;
    document.removeEventListener('keydown', this.boundHandleKeyDown);
    console.log('InputHandler disattivato');
  }

  /**
   * Cleanup all event listeners and references
   * Call this when the InputHandler is no longer needed
   */
  destroy(): void {
    this.disable();
    this.boundHandleKeyDown = null;
    this.gameState = null;
    this.interaction = null;
    this.hintSystem = null;
    this.roomNarrator = null;
    this.onAction = undefined;
    this.onSave = undefined;
    this.onInventoryChange = undefined;
    this.onNarrationToggle = undefined;
    console.log('InputHandler destroyed');
  }

  /**
   * Handler per eventi keydown
   */
  private handleKeyDown(event: KeyboardEvent): void {
    if (!this.enabled) return;

    switch (event.key) {
      case 'ArrowUp':
        event.preventDefault();
        this.movement.setOrientation('north');
        this.onAction?.();
        break;

      case 'ArrowDown':
        event.preventDefault();
        this.movement.setOrientation('south');
        this.onAction?.();
        break;

      case 'ArrowLeft':
        event.preventDefault();
        this.movement.setOrientation('west');
        this.onAction?.();
        break;

      case 'ArrowRight':
        event.preventDefault();
        this.movement.setOrientation('east');
        this.onAction?.();
        break;

      case 'Tab':
        event.preventDefault();
        this.handleMoveForward();
        break;

      case 'Enter':
        event.preventDefault();
        this.movement.activateSonar();
        this.onAction?.();
        break;

      case ' ':
        event.preventDefault();
        if (this.interaction) {
          this.interaction.interact();
        }
        this.onAction?.();
        break;

      case 'Control':
        event.preventDefault();
        this.cycleInventory();
        break;

      case 's':
      case 'S':
        event.preventDefault();
        this.onSave?.();
        break;

      case 'h':
      case 'H':
        event.preventDefault();
        this.requestHint();
        break;

      case 'p':
      case 'P':
        event.preventDefault();
        this.toggleNarration();
        break;

      case 'Escape':
        event.preventDefault();
        this.speakControlsHelp();
        break;
    }
  }

  /**
   * Speak controls help (only in HARD mode)
   */
  private speakControlsHelp(): void {
    if (this.gameState?.gameMode === 'hard') {
      audioEngine.speakControls();
    }
  }

  /**
   * Request a hint from the hint system
   */
  private async requestHint(): Promise<void> {
    if (!this.hintSystem) {
      console.log('HintSystem not available');
      return;
    }

    const hintProvided = await this.hintSystem.requestHint();
    if (!hintProvided) {
      // Play cooldown sound or nothing
      audioEngine.playError();
    }
  }

  /**
   * Toggle room narration on/off
   */
  private toggleNarration(): void {
    if (!this.roomNarrator) {
      console.log('RoomNarrator not available');
      return;
    }

    const enabled = this.roomNarrator.toggle();
    this.onNarrationToggle?.(enabled);

    // Speak the new state
    audioEngine.speakToggle('Narration', enabled);
  }

  /**
   * Cicla tra gli oggetti dell'inventario (solo oggetti raccolti)
   */
  private cycleInventory(): void {
    if (!this.gameState) return;

    const item = this.gameState.selectNext();

    if (item) {
      // In HARD mode, speak item name first, then play signature
      const itemName = getSpokenName(item.id);

      if (this.gameState?.gameMode === 'hard') {
        // Speak item name first
        speak(itemName);
        // Then play signature sound after a short delay
        setTimeout(() => {
          audioEngine.playItemSignature(item.soundSignature);
        }, INVENTORY_SPEECH_DELAY);
      } else {
        // EASY mode: just play signature
        audioEngine.playItemSignature(item.soundSignature);
      }

      console.log(`Inventario: selezionato ${item.id}`);
      this.onInventoryChange?.(item.id);
    } else {
      console.log('Inventario vuoto');
      this.onInventoryChange?.(null);
    }

    // Aggiorna UI
    this.onAction?.();
  }

  /**
   * Gestisce il movimento in avanti (asincrono)
   */
  private async handleMoveForward(): Promise<void> {
    // Previeni input multipli durante il movimento
    if (this.isMoving) return;

    this.isMoving = true;
    try {
      await this.movement.moveForward();
      this.onAction?.();
    } finally {
      this.isMoving = false;
    }
  }
}
