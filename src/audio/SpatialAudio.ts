import type { Direction } from '../types';

// Ordine delle direzioni in senso orario
const DIRECTIONS: Direction[] = ['north', 'east', 'south', 'west'];

/**
 * SpatialAudio - Gestisce la spazializzazione stereo
 * Calcola il pan relativo in base all'orientamento del giocatore
 */
export class SpatialAudio {
  private context: AudioContext;

  constructor(context: AudioContext) {
    this.context = context;
  }

  /**
   * Crea un nodo StereoPanner con il valore di pan specificato
   * @param pan Valore da -1 (sinistra) a +1 (destra)
   */
  createPanner(pan: number): StereoPannerNode {
    const panner = this.context.createStereoPanner();
    panner.pan.value = Math.max(-1, Math.min(1, pan));
    return panner;
  }

  /**
   * Calcola il pan relativo di una direzione rispetto all'orientamento del giocatore
   *
   * @param echoFrom Direzione da cui proviene l'eco (in termini assoluti)
   * @param facing Direzione verso cui guarda il giocatore
   * @returns Pan value: -1 (sinistra), 0 (centro), +1 (destra)
   *
   * Esempi:
   * - Guardo Nord, eco da Est → +1 (destra)
   * - Guardo Nord, eco da Ovest → -1 (sinistra)
   * - Guardo Est, eco da Nord → -1 (sinistra, Nord è alla mia sinistra)
   * - Guardo Est, eco da Sud → +1 (destra, Sud è alla mia destra)
   */
  getRelativePan(echoFrom: Direction, facing: Direction): number {
    const facingIndex = DIRECTIONS.indexOf(facing);
    const echoIndex = DIRECTIONS.indexOf(echoFrom);

    // Calcola la differenza angolare (0-3)
    // 0 = davanti, 1 = destra, 2 = dietro, 3 = sinistra
    const diff = (echoIndex - facingIndex + 4) % 4;

    // Mappa la differenza angolare al pan stereo
    const panMap: Record<number, number> = {
      0: 0,   // Davanti → centro
      1: 1,   // Destra → pan destra
      2: 0,   // Dietro → centro (ma con volume ridotto, gestito altrove)
      3: -1,  // Sinistra → pan sinistra
    };

    return panMap[diff];
  }

  /**
   * Verifica se una direzione è "dietro" rispetto all'orientamento
   * Utile per ridurre il volume degli echi posteriori
   */
  isBehind(echoFrom: Direction, facing: Direction): boolean {
    const facingIndex = DIRECTIONS.indexOf(facing);
    const echoIndex = DIRECTIONS.indexOf(echoFrom);
    const diff = (echoIndex - facingIndex + 4) % 4;
    return diff === 2;
  }

  /**
   * Verifica se una direzione è "davanti" rispetto all'orientamento
   */
  isAhead(echoFrom: Direction, facing: Direction): boolean {
    const facingIndex = DIRECTIONS.indexOf(facing);
    const echoIndex = DIRECTIONS.indexOf(echoFrom);
    const diff = (echoIndex - facingIndex + 4) % 4;
    return diff === 0;
  }
}
