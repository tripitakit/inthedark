import type { Direction } from '../types';

// Frequenze bussola per ogni direzione cardinale
// Nord/Sud = Do (C) a un'ottava di distanza
// Est/Ovest = Sol (G) a un'ottava di distanza
const COMPASS_FREQUENCIES: Record<Direction, number> = {
  north: 523, // C5 (Do alto)
  south: 262, // C4 (Do basso)
  east: 784,  // G5 (Sol alto)
  west: 392,  // G4 (Sol basso)
};

/**
 * AudioEngine - Gestione Web Audio API
 * Inizializza il contesto audio e fornisce metodi per la sintesi sonora
 */
export class AudioEngine {
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;

  /**
   * Ottiene il contesto audio (necessario per SpatialAudio e Sonar)
   */
  getContext(): AudioContext | null {
    return this.context;
  }

  /**
   * Ottiene il master gain node per connettere altri nodi
   */
  getMasterGain(): GainNode | null {
    return this.masterGain;
  }

  /**
   * Inizializza l'AudioContext (deve essere chiamato dopo user gesture)
   */
  async init(): Promise<void> {
    this.context = new AudioContext();
    this.masterGain = this.context.createGain();
    this.masterGain.gain.value = 0.5;
    this.masterGain.connect(this.context.destination);

    // Resume context se sospeso
    if (this.context.state === 'suspended') {
      await this.context.resume();
    }

    console.log('AudioEngine inizializzato');
  }

  /**
   * Verifica se l'engine è pronto
   */
  isReady(): boolean {
    return this.context !== null && this.context.state === 'running';
  }

  /**
   * Riproduce suono di passi (sintesi procedurale)
   */
  playFootstep(): void {
    if (!this.context || !this.masterGain) return;

    const now = this.context.currentTime;

    // Noise burst per simulare passo
    const duration = 0.15;
    const bufferSize = this.context.sampleRate * duration;
    const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
    const data = buffer.getChannelData(0);

    // Genera rumore con inviluppo
    for (let i = 0; i < bufferSize; i++) {
      const t = i / bufferSize;
      const envelope = Math.exp(-t * 15); // Decay veloce
      data[i] = (Math.random() * 2 - 1) * envelope;
    }

    const source = this.context.createBufferSource();
    source.buffer = buffer;

    // Filtro passa-basso per suono più naturale
    const filter = this.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 800;

    const gain = this.context.createGain();
    gain.gain.value = 0.3;

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    source.start(now);
    source.stop(now + duration);
  }

  /**
   * Riproduce suono di ostacolo/muro (sintesi procedurale)
   */
  playObstacle(): void {
    if (!this.context || !this.masterGain) return;

    const now = this.context.currentTime;

    // Tono basso con decay
    const osc = this.context.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.2);

    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.2);
  }

  /**
   * Riproduce tono bussola per direzione
   */
  playCompassTone(direction: Direction): void {
    if (!this.context || !this.masterGain) return;

    const now = this.context.currentTime;

    const frequency = COMPASS_FREQUENCIES[direction];

    const osc = this.context.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = frequency;

    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.setValueAtTime(0.2, now + 0.15);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.3);
  }

  /**
   * Riproduce il ping del sonar (suono emesso dal giocatore)
   * Suono breve e distintivo che "parte" dal giocatore
   */
  playPing(): void {
    if (!this.context || !this.masterGain) return;

    const now = this.context.currentTime;

    // Ping: tono acuto breve con sweep discendente
    const osc = this.context.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.1);

    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.15);
  }

  /**
   * Riproduce l'eco del sonar (stesso suono del ping ma filtrato/attutito)
   * @param isPassage Se true, il suono ha viaggiato lontano (più attutito)
   */
  playEchoFiltered(isPassage: boolean): void {
    if (!this.context || !this.masterGain) return;

    const now = this.context.currentTime;

    // Stesso pattern del ping: sweep 1200 → 800 Hz
    const osc = this.context.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.1);

    // Filtro passa-basso per simulare il viaggio del suono
    // - Passaggio: suono ha viaggiato lontano → più filtrato
    // - Muro: suono è rimbalzato vicino → meno filtrato
    const filter = this.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = isPassage ? 600 : 1000;
    filter.Q.value = 1;

    // Volume ridotto rispetto al ping originale
    // - Passaggio: più attutito (ha viaggiato di più)
    // - Muro: leggermente più forte (rimbalzo vicino)
    const gain = this.context.createGain();
    const volume = isPassage ? 0.2 : 0.3;
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

    // Connessioni: osc → filter → gain → master
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.15);
  }
}

// Singleton instance
export const audioEngine = new AudioEngine();
