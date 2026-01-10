import { Movement } from '../game/Movement';

/**
 * InputHandler - Gestisce gli input da tastiera
 */
export class InputHandler {
  private movement: Movement;
  private onAction?: () => void;
  private enabled: boolean = false;

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

    let handled = false;

    switch (event.key) {
      case 'ArrowUp':
        event.preventDefault();
        this.movement.moveForward();
        handled = true;
        break;

      case 'ArrowLeft':
        event.preventDefault();
        this.movement.rotateLeft();
        handled = true;
        break;

      case 'ArrowRight':
        event.preventDefault();
        this.movement.rotateRight();
        handled = true;
        break;

      case 'Enter':
        event.preventDefault();
        this.movement.activateSonar();
        handled = true;
        break;

      case ' ':
        // Spazio per interazione (da implementare in Milestone 4)
        event.preventDefault();
        console.log('Interazione - non ancora implementata');
        handled = true;
        break;
    }

    if (handled && this.onAction) {
      this.onAction();
    }
  };
}
