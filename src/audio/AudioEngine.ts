import type { Direction } from '../types';

// Configurazione bussola per ogni direzione cardinale
// Frequenze: Nord/Sud = Do (C), Est/Ovest = Sol (G)
// Timbri, filtri e detune: diversi per massima distinguibilità
interface CompassConfig {
  frequency: number;
  waveform: OscillatorType;
  detuneCents?: number; // Se presente, crea secondo oscillatore detuned
  duration?: number;    // Durata in secondi (default 0.3)
  gain?: number;        // Volume base (default 0.2, o 0.15 se detune)
  filter: {
    type: BiquadFilterType;
    Q: number;
    // Envelope: array di [time, frequency] dove time è relativo (0-1)
    envelope: [number, number][];
  };
}

const COMPASS_CONFIG: Record<Direction, CompassConfig> = {
  north: {
    frequency: 523,           // C5
    waveform: 'sine',         // puro, etereo
    detuneCents: 8,           // secondo osc per battimenti
    duration: 0.45,           // più lungo
    gain: 0.19,               // +25% rispetto a 0.15
    filter: {
      type: 'bandpass',
      Q: 8,
      envelope: [[0, 400], [0.4, 1200], [1, 600]],  // "wah" etereo
    },
  },
  south: {
    frequency: 262,           // C4
    waveform: 'square',       // cavo, profondo
    filter: {
      type: 'lowpass',
      Q: 4,
      envelope: [[0, 2500], [1, 200]],  // chiusura drammatica
    },
  },
  east: {
    frequency: 784,           // G5
    waveform: 'triangle',     // caldo, luminoso
    detuneCents: 6,           // secondo osc per spessore
    filter: {
      type: 'highpass',
      Q: 3,
      envelope: [[0, 200], [1, 1500]],  // apertura luminosa
    },
  },
  west: {
    frequency: 392,           // G4
    waveform: 'sawtooth',     // ronzante
    filter: {
      type: 'lowpass',
      Q: 3,
      envelope: [[0, 1800], [0.4, 500], [1, 1400]],  // dip - "tramonto"
    },
  },
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
   * Riproduce un singolo suono di passo (sintesi procedurale)
   * @param startTime Tempo di inizio nel contesto audio
   */
  private playFootstepAt(startTime: number): void {
    if (!this.context || !this.masterGain) return;

    // Noise burst per simulare passo
    const duration = 0.15;
    const bufferSize = Math.floor(this.context.sampleRate * duration);
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
    gain.gain.value = 0.45;

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    source.start(startTime);
    source.stop(startTime + duration);
  }

  /**
   * Riproduce suono di passi (sintesi procedurale) - singolo passo
   */
  playFootstep(): void {
    if (!this.context) return;
    this.playFootstepAt(this.context.currentTime);
  }

  /**
   * Riproduce 4 passi con intervallo di 0.75 secondi
   * @returns Promise che si risolve quando tutti i passi sono completati
   */
  playFootsteps(): Promise<void> {
    if (!this.context || !this.masterGain) {
      return Promise.resolve();
    }

    const now = this.context.currentTime;
    const stepInterval = 0.75;
    const stepCount = 4;
    const stepDuration = 0.15;

    // Schedula 4 passi
    for (let i = 0; i < stepCount; i++) {
      this.playFootstepAt(now + i * stepInterval);
    }

    // Ritorna Promise che si risolve dopo l'ultimo passo
    const totalDuration = (stepCount - 1) * stepInterval + stepDuration;
    return new Promise(resolve => {
      setTimeout(resolve, totalDuration * 1000);
    });
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
   * Ogni direzione ha frequenza, timbro e envelope filtro distintivi
   */
  playCompassTone(direction: Direction): void {
    if (!this.context || !this.masterGain) return;

    const now = this.context.currentTime;
    const config = COMPASS_CONFIG[direction];
    const duration = config.duration ?? 0.3;

    // Filtro con envelope
    const filter = this.context.createBiquadFilter();
    filter.type = config.filter.type;
    filter.Q.value = config.filter.Q;

    // Applica envelope al cutoff del filtro
    for (const [time, freq] of config.filter.envelope) {
      const absoluteTime = now + time * duration;
      if (time === 0) {
        filter.frequency.setValueAtTime(freq, absoluteTime);
      } else {
        filter.frequency.linearRampToValueAtTime(freq, absoluteTime);
      }
    }

    // Gain envelope
    const gain = this.context.createGain();
    const defaultGain = config.detuneCents ? 0.15 : 0.2;
    const baseGain = config.gain ?? defaultGain;
    gain.gain.setValueAtTime(baseGain, now);
    gain.gain.setValueAtTime(baseGain, now + duration * 0.5);
    gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

    // Connessioni: filter → gain → master
    filter.connect(gain);
    gain.connect(this.masterGain);

    // Oscillatore principale
    const osc1 = this.context.createOscillator();
    osc1.type = config.waveform;
    osc1.frequency.value = config.frequency;
    osc1.connect(filter);
    osc1.start(now);
    osc1.stop(now + duration);

    // Secondo oscillatore detuned (se configurato)
    if (config.detuneCents) {
      const osc2 = this.context.createOscillator();
      osc2.type = config.waveform;
      osc2.frequency.value = config.frequency;
      osc2.detune.value = config.detuneCents;
      osc2.connect(filter);
      osc2.start(now);
      osc2.stop(now + duration);
    }
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

  /**
   * Riproduce suono raccolta oggetto - arpeggio ascendente "magico"
   * Note: C5 (523Hz) → E5 (659Hz) → G5 (784Hz)
   */
  playPickup(): void {
    if (!this.context || !this.masterGain) return;

    const now = this.context.currentTime;
    const notes = [523, 659, 784]; // C5, E5, G5
    const noteDuration = 0.1;
    const noteGap = 0.08;

    for (let i = 0; i < notes.length; i++) {
      const startTime = now + i * (noteDuration + noteGap);

      const osc = this.context.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = notes[i];

      const gain = this.context.createGain();
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.3, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + noteDuration);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(startTime);
      osc.stop(startTime + noteDuration);
    }
  }

  /**
   * Riproduce suono sblocco serratura - click metallico + sweep ascendente
   */
  playUnlock(): void {
    if (!this.context || !this.masterGain) return;

    const now = this.context.currentTime;

    // Click metallico (noise burst filtrato)
    const clickDuration = 0.05;
    const clickBufferSize = Math.floor(this.context.sampleRate * clickDuration);
    const clickBuffer = this.context.createBuffer(1, clickBufferSize, this.context.sampleRate);
    const clickData = clickBuffer.getChannelData(0);

    for (let i = 0; i < clickBufferSize; i++) {
      const t = i / clickBufferSize;
      const envelope = Math.exp(-t * 40);
      clickData[i] = (Math.random() * 2 - 1) * envelope;
    }

    const clickSource = this.context.createBufferSource();
    clickSource.buffer = clickBuffer;

    const clickFilter = this.context.createBiquadFilter();
    clickFilter.type = 'bandpass';
    clickFilter.frequency.value = 2000;
    clickFilter.Q.value = 5;

    const clickGain = this.context.createGain();
    clickGain.gain.value = 0.4;

    clickSource.connect(clickFilter);
    clickFilter.connect(clickGain);
    clickGain.connect(this.masterGain);

    clickSource.start(now);
    clickSource.stop(now + clickDuration);

    // Sweep ascendente (tono di successo)
    const sweepStart = now + 0.05;
    const osc = this.context.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, sweepStart);
    osc.frequency.exponentialRampToValueAtTime(400, sweepStart + 0.15);

    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0.3, sweepStart);
    gain.gain.exponentialRampToValueAtTime(0.01, sweepStart + 0.2);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(sweepStart);
    osc.stop(sweepStart + 0.2);
  }

  /**
   * Riproduce suono errore/rifiuto - tono basso discendente
   */
  playError(): void {
    if (!this.context || !this.masterGain) return;

    const now = this.context.currentTime;

    const osc = this.context.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.2);

    const filter = this.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 400;

    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.2);
  }

  /**
   * Riproduce suono "shimmer" per indicare presenza oggetto nel nodo
   * Arpeggio delicato con note alte: 800Hz, 1000Hz, 1200Hz
   */
  playItemPresence(): void {
    if (!this.context || !this.masterGain) return;

    const now = this.context.currentTime;
    const notes = [800, 1000, 1200];
    const noteDuration = 0.12;
    const noteGap = 0.05;

    for (let i = 0; i < notes.length; i++) {
      const startTime = now + i * (noteDuration + noteGap);

      const osc = this.context.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = notes[i];

      const gain = this.context.createGain();
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.15, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + noteDuration);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(startTime);
      osc.stop(startTime + noteDuration);
    }
  }

  /**
   * Riproduce suono "vuoto/hollow" per pickup fallito
   * Tono basso sordo che indica "niente qui"
   */
  playEmptyPickup(): void {
    if (!this.context || !this.masterGain) return;

    const now = this.context.currentTime;

    // Tono basso sordo
    const osc = this.context.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(100, now);
    osc.frequency.exponentialRampToValueAtTime(70, now + 0.15);

    // Filtro passa-basso per suono più ovattato
    const filter = this.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 200;

    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.15);
  }

  /**
   * Riproduce suono "serratura" per indicare presenza lock nel sonar
   * Suono metallico tipo catena/lucchetto che tintinna
   */
  playLockPresence(): void {
    if (!this.context || !this.masterGain) return;

    const now = this.context.currentTime;

    // Tono metallico alto (simula catena)
    const osc1 = this.context.createOscillator();
    osc1.type = 'square';
    osc1.frequency.setValueAtTime(1800, now);
    osc1.frequency.exponentialRampToValueAtTime(1200, now + 0.08);

    // Secondo tono leggermente sfasato (battimenti metallici)
    const osc2 = this.context.createOscillator();
    osc2.type = 'square';
    osc2.frequency.setValueAtTime(1850, now);
    osc2.frequency.exponentialRampToValueAtTime(1250, now + 0.08);

    // Filtro passa-banda per suono metallico
    const filter = this.context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1500;
    filter.Q.value = 5;

    // Gain con decay rapido
    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc1.start(now);
    osc1.stop(now + 0.12);
    osc2.start(now);
    osc2.stop(now + 0.12);
  }
}

// Singleton instance
export const audioEngine = new AudioEngine();
