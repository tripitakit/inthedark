import { ROTATION_LEFT, ROTATION_RIGHT } from '../types';
import type { Direction } from '../types';
import { GameState } from './GameState';
import { graphWorld } from './GraphWorld';
import { audioEngine } from '../audio/AudioEngine';
import type { Sonar } from '../audio/Sonar';

// Label leggibili per le direzioni
const DIRECTION_LABELS: Record<Direction, string> = {
  north: 'Nord',
  east: 'Est',
  south: 'Sud',
  west: 'Ovest',
};

/**
 * Movement - Gestisce movimento e rotazione del giocatore
 */
export class Movement {
  private gameState: GameState;
  private sonar: Sonar | null = null;

  constructor(gameState: GameState) {
    this.gameState = gameState;
  }

  /**
   * Imposta l'istanza Sonar da usare
   */
  setSonar(sonar: Sonar): void {
    this.sonar = sonar;
  }

  /**
   * Tenta di muoversi avanti nella direzione corrente
   * @returns true se il movimento è riuscito
   */
  moveForward(): boolean {
    const currentNode = this.gameState.currentNode;
    const direction = this.gameState.orientation;

    const targetNode = graphWorld.getConnection(currentNode, direction);

    if (targetNode) {
      // Movimento valido
      this.gameState.setCurrentNode(targetNode);
      audioEngine.playFootstep();

      console.log(`Movimento: ${currentNode} → ${targetNode} (${direction})`);
      this.gameState.debugLog();

      return true;
    } else {
      // Movimento bloccato
      audioEngine.playObstacle();
      console.log(`Movimento bloccato: nessun passaggio a ${direction}`);

      return false;
    }
  }

  /**
   * Ruota a sinistra di 90°
   */
  rotateLeft(): void {
    const oldOrientation = this.gameState.orientation;
    const newOrientation = ROTATION_LEFT[oldOrientation];

    this.gameState.setOrientation(newOrientation);
    audioEngine.playCompassTone(newOrientation);

    console.log(`Rotazione sinistra: ${oldOrientation} → ${newOrientation}`);
  }

  /**
   * Ruota a destra di 90°
   */
  rotateRight(): void {
    const oldOrientation = this.gameState.orientation;
    const newOrientation = ROTATION_RIGHT[oldOrientation];

    this.gameState.setOrientation(newOrientation);
    audioEngine.playCompassTone(newOrientation);

    console.log(`Rotazione destra: ${oldOrientation} → ${newOrientation}`);
  }

  /**
   * Attiva il sonar completo (bussola + ping + echi)
   */
  activateSonar(): void {
    if (this.sonar) {
      this.sonar.activate();
    } else {
      // Fallback se Sonar non è configurato
      const direction = this.gameState.orientation;
      audioEngine.playCompassTone(direction);
      console.log(`Sonar (fallback) - orientamento: ${direction}`);
    }
  }

  /**
   * Ottiene la direzione corrente come stringa leggibile
   */
  getOrientationLabel(): string {
    return DIRECTION_LABELS[this.gameState.orientation];
  }
}
