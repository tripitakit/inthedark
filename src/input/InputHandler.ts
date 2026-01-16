import { Movement } from '../game/Movement';
import type { Interaction } from '../game/Interaction';
import type { Minimap } from '../ui/Minimap';

/**
 * InputHandler - Gestisce gli input da tastiera
 */
export class InputHandler {
  private movement: Movement;
  private interaction: Interaction | null = null;
  private minimap: Minimap | null = null;
  private onAction?: () => void;
  private enabled: boolean = false;
  private isMoving: boolean = false; // Previene input durante movimento

  constructor(movement: Movement, onAction?: () => void) {
    this.movement = movement;
    this.onAction = onAction;
  }

  /**
   * Imposta l'istanza Interaction da usare
   */
  setInteraction(interaction: Interaction): void {
    this.interaction = interaction;
  }

  /**
   * Imposta l'istanza Minimap da usare
   */
  setMinimap(minimap: Minimap): void {
    this.minimap = minimap;
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

      case 'm':
      case 'M':
        event.preventDefault();
        if (this.minimap) {
          this.minimap.toggle();
        }
        break;
    }
  };

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
