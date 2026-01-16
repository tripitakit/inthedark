import { Movement } from '../game/Movement';
import { audioEngine } from '../audio/AudioEngine';
import type { GameState } from '../game/GameState';
import type { Interaction } from '../game/Interaction';

/**
 * InputHandler - Gestisce gli input da tastiera
 */
export class InputHandler {
  private movement: Movement;
  private gameState: GameState | null = null;
  private interaction: Interaction | null = null;
  private onAction?: () => void;
  private onSave?: () => void;
  private onInventoryChange?: (itemId: string | null) => void;
  private enabled: boolean = false;
  private isMoving: boolean = false; // Previene input durante movimento

  constructor(movement: Movement, onAction?: () => void) {
    this.movement = movement;
    this.onAction = onAction;
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
   * Callback quando cambia oggetto selezionato nell'inventario
   */
  setOnInventoryChange(callback: (itemId: string | null) => void): void {
    this.onInventoryChange = callback;
  }

  /**
   * Attiva la gestione degli input
   */
  enable(): void {
    if (this.enabled) return;

    this.enabled = true;
    document.addEventListener('keydown', this.handleKeyDown);
    console.log('InputHandler attivato');
  }

  /**
   * Disattiva la gestione degli input
   */
  disable(): void {
    this.enabled = false;
    document.removeEventListener('keydown', this.handleKeyDown);
    console.log('InputHandler disattivato');
  }

  /**
   * Handler per eventi keydown
   */
  private handleKeyDown = (event: KeyboardEvent): void => {
    if (!this.enabled) return;

    switch (event.key) {
      case 'ArrowUp':
        event.preventDefault();
        this.handleMoveForward();
        break;

      case 'ArrowLeft':
        event.preventDefault();
        this.movement.rotateLeft();
        this.onAction?.();
        break;

      case 'ArrowRight':
        event.preventDefault();
        this.movement.rotateRight();
        this.onAction?.();
        break;

      case 'ArrowDown':
        event.preventDefault();
        this.movement.turnAround();
        this.onAction?.();
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
    }
  };

  /**
   * Cicla tra gli oggetti dell'inventario (solo oggetti raccolti)
   */
  private cycleInventory(): void {
    if (!this.gameState) return;

    const item = this.gameState.selectNext();

    if (item) {
      // Feedback audio: firma sonora dell'oggetto selezionato
      audioEngine.playItemSignature(item.soundSignature);
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
