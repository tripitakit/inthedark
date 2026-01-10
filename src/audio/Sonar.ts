import { AudioEngine } from './AudioEngine';
import { GraphWorld } from '../game/GraphWorld';
import { GameState } from '../game/GameState';

// Timing della sequenza sonar (in millisecondi)
const TIMING = {
  COMPASS_DURATION: 300,   // Durata tono bussola
  PING_DELAY: 350,         // Delay prima del ping
  ECHO_WALL_DELAY: 150,    // Eco breve = muro vicino (no passaggio)
  ECHO_PASSAGE_DELAY: 450, // Eco lungo = spazio aperto (passaggio)
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
   * 1. Tono bussola (direzione corrente)
   * 2. Ping di andata
   * 3. Eco di ritorno (solo frontale)
   */
  activate(): void {
    const context = this.audioEngine.getContext();
    if (!context) {
      console.warn('Sonar: AudioContext non disponibile');
      return;
    }

    const orientation = this.gameState.orientation;
    const currentNode = this.gameState.currentNode;

    // Verifica se c'è un passaggio nella direzione frontale
    const hasPassageAhead = this.graphWorld.getConnection(currentNode, orientation) !== null;

    // 1. Tono bussola (immediato)
    this.audioEngine.playCompassTone(orientation);

    // 2. Ping dopo delay
    setTimeout(() => {
      this.audioEngine.playPing();
    }, TIMING.PING_DELAY);

    // 3. Eco di ritorno (solo frontale)
    // - Delay breve se c'è un muro (suono rimbalza subito)
    // - Delay lungo se c'è passaggio (suono viaggia lontano)
    const echoDelay = hasPassageAhead ? TIMING.ECHO_PASSAGE_DELAY : TIMING.ECHO_WALL_DELAY;

    setTimeout(() => {
      this.audioEngine.playEchoFiltered(hasPassageAhead);
    }, TIMING.PING_DELAY + echoDelay);

    // Log per debug
    if (hasPassageAhead) {
      console.log(`Sonar: ${orientation} - passaggio aperto (eco lento)`);
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
