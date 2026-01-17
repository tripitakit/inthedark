import type { Direction } from '../types';
import {
  calculateDistanceGain,
  calculateDistanceFilter,
  applyDirectionalAttenuation,
  AttenuationConfig,
  DEFAULT_ATTENUATION,
} from './DistanceAttenuation';

// Ordine delle direzioni in senso orario
const DIRECTIONS: Direction[] = ['north', 'east', 'south', 'west'];

/**
 * Interpolated pan values for more precise spatial positioning
 * Maps relative angle (0-3) to pan value with diagonal support
 */
const INTERPOLATED_PAN: Record<number, number> = {
  0: 0,      // Front → center
  1: 1,      // Right → hard right
  2: 0,      // Behind → center
  3: -1,     // Left → hard left
};

/**
 * Diagonal pan values for 45-degree angles
 * Front-left, front-right, back-left, back-right
 */
export const DIAGONAL_PAN = {
  frontLeft: -0.7,
  frontRight: 0.7,
  backLeft: -0.5,
  backRight: 0.5,
};

/**
 * SpatialAudio - Gestisce la spazializzazione stereo con distance attenuation
 * Calcola il pan relativo in base all'orientamento del giocatore
 * e applica attenuazione basata sulla distanza
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
   * Create a complete spatial audio chain with pan, gain, and optional filter
   * @param pan Stereo pan value (-1 to +1)
   * @param gain Volume multiplier (0 to 1)
   * @param filterFreq Optional lowpass filter frequency for distance
   * @returns Object with nodes to connect: input, output, and individual nodes
   */
  createSpatialChain(
    pan: number,
    gain: number,
    filterFreq?: number
  ): {
    input: AudioNode;
    output: AudioNode;
    panner: StereoPannerNode;
    gainNode: GainNode;
    filter?: BiquadFilterNode;
  } {
    const panner = this.createPanner(pan);
    const gainNode = this.context.createGain();
    gainNode.gain.value = Math.max(0, Math.min(1, gain));

    if (filterFreq && filterFreq < 20000) {
      const filter = this.context.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = filterFreq;
      filter.Q.value = 0.7;

      // Chain: input → filter → panner → gain → output
      panner.connect(gainNode);
      filter.connect(panner);

      return {
        input: filter,
        output: gainNode,
        panner,
        gainNode,
        filter,
      };
    }

    // Chain: input → panner → gain → output
    panner.connect(gainNode);

    return {
      input: panner,
      output: gainNode,
      panner,
      gainNode,
    };
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

    return INTERPOLATED_PAN[diff];
  }

  /**
   * Get pan and gain values with distance attenuation
   *
   * @param echoFrom Direction sound is coming from
   * @param facing Player's facing direction
   * @param distance Distance in room units (0 = same room)
   * @param config Attenuation configuration
   * @returns Object with pan, gain, and filter frequency
   */
  getSpatialParams(
    echoFrom: Direction,
    facing: Direction,
    distance: number,
    config: AttenuationConfig = DEFAULT_ATTENUATION
  ): { pan: number; gain: number; filterFreq: number } {
    const pan = this.getRelativePan(echoFrom, facing);
    const isBehind = this.isBehind(echoFrom, facing);

    // Calculate distance-based gain
    let gain = calculateDistanceGain(distance, config);

    // Apply directional attenuation (sounds behind are quieter)
    gain = applyDirectionalAttenuation(gain, isBehind, 0.5);

    // Calculate distance-based filter (distant sounds lose highs)
    const filterFreq = calculateDistanceFilter(distance);

    return { pan, gain, filterFreq };
  }

  /**
   * Get interpolated pan for diagonal directions
   * Useful for sounds that aren't exactly cardinal directions
   *
   * @param angle Angle in degrees (0 = front, 90 = right, 180 = back, 270 = left)
   * @returns Pan value from -1 to +1
   */
  getPanFromAngle(angle: number): number {
    // Normalize to 0-360
    const normalizedAngle = ((angle % 360) + 360) % 360;

    // Convert to radians and calculate sin for pan
    // Front (0) = 0, Right (90) = 1, Back (180) = 0, Left (270) = -1
    const radians = (normalizedAngle * Math.PI) / 180;
    return Math.sin(radians);
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
