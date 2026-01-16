import { AudioEngine } from './AudioEngine';
import { GraphWorld } from '../game/GraphWorld';
import { GameState } from '../game/GameState';
import type { ItemSoundSignature } from '../types';

// Timing della sequenza sonar (in millisecondi)
const TIMING = {
  ECHO_WALL_DELAY: 150,    // Eco breve = muro vicino (no passaggio)
  ECHO_PASSAGE_DELAY: 450, // Eco lungo = spazio aperto (passaggio)
  LOCK_SOUND_DELAY: 400,   // Delay dopo eco - gives time for echo to finish
};

/**
 * Sonar - Orchestra la sequenza completa del sonar
 *
 * Nuova logica:
 * - L'eco arriva solo dalla direzione frontale
 * - Eco veloce = muro vicino (nessun passaggio)
 * - Eco lento = spazio aperto (passaggio disponibile)
 * - Il suono dell'eco è il ping filtrato/attutito
 */
export class Sonar {
  private audioEngine: AudioEngine;
  private graphWorld: GraphWorld;
  private gameState: GameState;

  constructor(
    audioEngine: AudioEngine,
    graphWorld: GraphWorld,
    gameState: GameState
  ) {
    this.audioEngine = audioEngine;
    this.graphWorld = graphWorld;
    this.gameState = gameState;
  }

  /**
   * Attiva la sequenza sonar completa
   * 1. Ping di andata
   * 2. Eco di ritorno (solo frontale)
   * 3. Suono serratura (se presente lock chiuso)
   */
  activate(): void {
    const context = this.audioEngine.getContext();
    if (!context) {
      console.warn('Sonar: AudioContext non disponibile');
      return;
    }

    const orientation = this.gameState.orientation;
    const currentNode = this.gameState.currentNode;

    // Verifica se c'è un passaggio e se c'è una serratura
    const targetNode = this.graphWorld.getConnection(currentNode, orientation);
    let hasPassageAhead = targetNode !== null;
    let hasLockedDoor = false;
    let lockSignature: ItemSoundSignature | null = null;

    // Se c'è connessione, verifica se è bloccata da lock
    if (hasPassageAhead && targetNode) {
      // Scopri l'edge sulla minimap
      this.gameState.discoverEdge(currentNode, orientation);

      const lock = this.graphWorld.getLock(currentNode, orientation);
      console.log(`Sonar lock check: ${currentNode} → ${orientation}, lock:`, lock);
      if (lock && !this.gameState.isPassageUnlocked(lock.id)) {
        hasPassageAhead = false; // Passaggio bloccato = muro
        hasLockedDoor = true;    // Ma c'è una serratura
        lockSignature = lock.requiredSignature; // Firma dell'oggetto richiesto
        console.log(`Sonar detected locked door, signature hint: ${lockSignature}`);
      }
    }

    // 1. Ping (immediate)
    this.audioEngine.playPing();

    // 2. Eco di ritorno (solo frontale)
    // - Delay breve se c'è un muro (suono rimbalza subito)
    // - Delay lungo se c'è passaggio (suono viaggia lontano)
    const echoDelay = hasPassageAhead ? TIMING.ECHO_PASSAGE_DELAY : TIMING.ECHO_WALL_DELAY;

    setTimeout(() => {
      this.audioEngine.playEchoFiltered(hasPassageAhead);
    }, echoDelay);

    // 3. Eco firma oggetto richiesto (se c'è lock chiuso)
    if (hasLockedDoor && lockSignature) {
      setTimeout(() => {
        this.audioEngine.playSignatureEcho(lockSignature!);
      }, echoDelay + TIMING.LOCK_SOUND_DELAY);
    }

    // Log per debug
    if (hasPassageAhead) {
      console.log(`Sonar: ${orientation} - passaggio aperto (eco lento)`);
    } else if (hasLockedDoor) {
      console.log(`Sonar: ${orientation} - serratura chiusa (eco veloce + lock)`);
    } else {
      console.log(`Sonar: ${orientation} - muro (eco veloce)`);
    }
  }

  /**
   * Aggiorna il riferimento a GameState (se cambia)
   */
  setGameState(gameState: GameState): void {
    this.gameState = gameState;
  }
}
