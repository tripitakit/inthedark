import { ROTATION_LEFT, ROTATION_RIGHT } from '../types';
import type { Direction, SurfaceType } from '../types';
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
  private visitedRooms: Set<string> = new Set();

  constructor(gameState: GameState) {
    this.gameState = gameState;
    // Mark starting room as visited
    this.visitedRooms.add(gameState.currentNode);
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

      // Get source and target node data for audio cues
      const sourceNode = graphWorld.getNode(currentNode);
      const targetNodeData = graphWorld.getNode(targetNode);

      // Determine surface type for footsteps
      const surface: SurfaceType = targetNodeData?.surface ?? 'stone';

      // Movimento valido: annuncia direzione e riproduci passi
      audioEngine.playWalkingDirection(direction);
      await audioEngine.playFootsteps(surface);

      // Discover the edge we're walking through (both directions)
      this.gameState.discoverEdge(currentNode, direction);
      const oppositeDirection = ROTATION_RIGHT[ROTATION_RIGHT[direction]];
      this.gameState.discoverEdge(targetNode, oppositeDirection);

      // Ora entra nel nuovo nodo
      this.gameState.setCurrentNode(targetNode);

      // Check if environment type changed - play room transition
      const fromEnv = sourceNode?.ambience?.type;
      const toEnv = targetNodeData?.ambience?.type;
      if (fromEnv && toEnv && fromEnv !== toEnv) {
        audioEngine.playRoomTransition(fromEnv, toEnv);
      }

      // Play discovery chime for first-time room visit
      if (!this.visitedRooms.has(targetNode)) {
        this.visitedRooms.add(targetNode);
        audioEngine.playDiscoveryChime();
      }

      // Trigger ambient transition
      if (this.ambienceManager) {
        if (targetNodeData?.ambience) {
          this.ambienceManager.transitionTo(targetNodeData.ambience);
        }
      }

      // Feedback presenza oggetto nel nuovo nodo
      if (targetNodeData?.item && !targetNodeData.item.collected) {
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

    // Update binaural audio listener orientation
    this.updateBinauralOrientation(newOrientation);

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

    // Update binaural audio listener orientation
    this.updateBinauralOrientation(newOrientation);

    console.log(`Rotazione destra: ${oldOrientation} → ${newOrientation}`);
  }

  /**
   * Ruota di 180° (dietrofront)
   */
  turnAround(): void {
    const oldOrientation = this.gameState.orientation;
    // Due rotazioni a destra = 180°
    const newOrientation = ROTATION_RIGHT[ROTATION_RIGHT[oldOrientation]];

    this.gameState.setOrientation(newOrientation);
    audioEngine.playCompassTone(newOrientation);

    // Update binaural audio listener orientation
    this.updateBinauralOrientation(newOrientation);

    console.log(`Dietrofront: ${oldOrientation} → ${newOrientation}`);
  }

  /**
   * Set orientation to a specific cardinal direction
   */
  setOrientation(direction: Direction): void {
    const oldOrientation = this.gameState.orientation;
    if (oldOrientation === direction) {
      // Already facing this direction, just play compass tone
      audioEngine.playCompassTone(direction);
      return;
    }

    this.gameState.setOrientation(direction);
    audioEngine.playCompassTone(direction);

    // Update binaural audio listener orientation
    this.updateBinauralOrientation(direction);

    console.log(`Orientamento: ${oldOrientation} → ${direction}`);
  }

  /**
   * Update binaural audio listener orientation
   */
  private updateBinauralOrientation(direction: Direction): void {
    const binauralAudio = this.sonar?.getBinauralAudio();
    if (binauralAudio) {
      binauralAudio.updateListenerOrientation(direction);
    }
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
