import { AudioEngine } from './AudioEngine';
import { GraphWorld } from '../game/GraphWorld';
import { GameState } from '../game/GameState';
import { BinauralAudio } from './BinauralAudio';
import type { ItemSoundSignature } from '../types';
import {
  SONAR_ECHO_WALL_DELAY,
  SONAR_ECHO_PASSAGE_DELAY,
  SONAR_LOCK_SOUND_DELAY,
} from '../constants';

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
  private binauralAudio: BinauralAudio | null = null;

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
   * Set the binaural audio processor for HRTF
   */
  setBinauralAudio(binaural: BinauralAudio): void {
    this.binauralAudio = binaural;
  }

  /**
   * Get the binaural audio processor
   */
  getBinauralAudio(): BinauralAudio | null {
    return this.binauralAudio;
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

    // Update binaural audio listener orientation
    if (this.binauralAudio) {
      this.binauralAudio.updateListenerOrientation(orientation);
    }
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
    const echoDelay = hasPassageAhead ? SONAR_ECHO_PASSAGE_DELAY : SONAR_ECHO_WALL_DELAY;

    setTimeout(() => {
      this.audioEngine.playEchoFiltered(hasPassageAhead);
    }, echoDelay);

    // 3. Eco firma oggetto richiesto (se c'è lock chiuso)
    if (hasLockedDoor && lockSignature) {
      setTimeout(() => {
        this.audioEngine.playSignatureEcho(lockSignature!);
      }, echoDelay + SONAR_LOCK_SOUND_DELAY);
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
