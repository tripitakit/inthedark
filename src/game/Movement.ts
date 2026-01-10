import { ROTATION_LEFT, ROTATION_RIGHT } from '../types';
import type { Direction } from '../types';
import { GameState } from './GameState';
import { graphWorld } from './GraphWorld';
import { audioEngine } from '../audio/AudioEngine';
import type { Sonar } from '../audio/Sonar';
import type { AmbienceManager } from '../audio/AmbienceManager';

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
  private ambienceManager: AmbienceManager | null = null;

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
   * Imposta l'istanza AmbienceManager da usare
   */
  setAmbienceManager(ambienceManager: AmbienceManager): void {
    this.ambienceManager = ambienceManager;
  }

  /**
   * Tenta di muoversi avanti nella direzione corrente
   * @returns Promise<true> se il movimento è riuscito, Promise<false> altrimenti
   */
  async moveForward(): Promise<boolean> {
    const currentNode = this.gameState.currentNode;
    const direction = this.gameState.orientation;

    const targetNode = graphWorld.getConnection(currentNode, direction);

    if (targetNode) {
      // Verifica se il passaggio è bloccato da una serratura
      const lock = graphWorld.getLock(currentNode, direction);
      if (lock && !this.gameState.isPassageUnlocked(lock.id)) {
        audioEngine.playObstacle();
        console.log(`Passaggio bloccato da serratura: ${lock.id}`);
        return false;
      }

      // Movimento valido: riproduci 4 passi prima di entrare nel nuovo nodo
      await audioEngine.playFootsteps();

      // Ora entra nel nuovo nodo
      this.gameState.setCurrentNode(targetNode);

      // Trigger ambient transition
      if (this.ambienceManager) {
        const node = graphWorld.getNode(targetNode);
        if (node?.ambience) {
          this.ambienceManager.transitionTo(node.ambience);
        }
      }

      // Feedback presenza oggetto nel nuovo nodo
      const node = graphWorld.getNode(targetNode);
      if (node?.item && !node.item.collected) {
        audioEngine.playItemPresence();
      }

      console.log(`Movimento: ${currentNode} → ${targetNode} (${direction})`);
      this.gameState.debugLog();

      return true;
    } else {
      // Movimento bloccato (nessun passaggio)
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
