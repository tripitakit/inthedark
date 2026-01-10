import { Movement } from '../game/Movement';

/**
 * InputHandler - Gestisce gli input da tastiera
 */
export class InputHandler {
  private movement: Movement;
  private onAction?: () => void;
  private enabled: boolean = false;
  private isMoving: boolean = false; // Previene input durante movimento

  constructor(movement: Movement, onAction?: () => void) {
    this.movement = movement;
    this.onAction = onAction;
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
        // Spazio per interazione (da implementare in Milestone 4)
        event.preventDefault();
        console.log('Interazione - non ancora implementata');
        this.onAction?.();
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
