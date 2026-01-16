import type { Direction, ItemSoundSignature } from '../types';

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
   * Plays confirmation sound when game is saved
   * Ascending two-tone chime: clear and satisfying
   */
  playSaveConfirm(): void {
    if (!this.context || !this.masterGain) return;

    const now = this.context.currentTime;
    const notes = [600, 900]; // Ascending two-note chime
    const noteDuration = 0.15;

    for (let i = 0; i < notes.length; i++) {
      const startTime = now + i * 0.1;

      const osc = this.context.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = notes[i];

      const gain = this.context.createGain();
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.25, startTime + 0.02);
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

  // ========================================
  // FIRME SONORE OGGETTI INVENTARIO
  // ========================================

  /**
   * Riproduce la firma sonora di un oggetto
   */
  playItemSignature(signature: ItemSoundSignature): void {
    switch (signature) {
      case 'glassChime': this.playGlassChime(); break;
      case 'metalScrape': this.playMetalScrape(); break;
      case 'ropeSwish': this.playRopeSwish(); break;
      case 'crystalResonance': this.playCrystalResonance(); break;
      case 'alienCrystal': this.playAlienCrystal(); break;
      case 'electricBuzz': this.playElectricBuzz(); break;
      case 'liquidGurgle': this.playLiquidGurgle(); break;
      case 'techBeep': this.playTechBeep(); break;
      default:
        console.warn(`Unknown item signature: ${signature}`);
    }
  }

  /**
   * Riproduce un eco filtrato della firma sonora (hint per serratura)
   * Suono più smorzato e distante per indicare quale oggetto serve
   */
  playSignatureEcho(signature: ItemSoundSignature): void {
    if (!this.context || !this.masterGain) return;

    console.log(`Playing signature echo: ${signature}`);

    // Boost volume for lock hint - needs to be clearly audible
    const echoGain = this.context.createGain();
    echoGain.gain.value = 1.2; // Boosted for lock hints

    // Gentle lowpass filter - don't muffle too much
    const filter = this.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 2500; // Higher cutoff for clarity
    filter.Q.value = 0.5;

    // Salva il master gain originale e sostituisci temporaneamente
    const originalMaster = this.masterGain;

    // Crea una catena temporanea
    filter.connect(echoGain);
    echoGain.connect(originalMaster);

    // Temporaneamente usa il filtro come destinazione
    this.masterGain = filter;

    // Riproduci la firma attraverso il filtro
    this.playItemSignature(signature);

    // Ripristina il master gain
    this.masterGain = originalMaster;

    // Pulisci dopo un po'
    setTimeout(() => {
      filter.disconnect();
      echoGain.disconnect();
    }, 1000);
  }

  /**
   * Tintinnio cristallino (lanterna) - 2000-3000Hz, armonici puri
   */
  private playGlassChime(): void {
    if (!this.context || !this.masterGain) return;

    const now = this.context.currentTime;
    const frequencies = [2400, 3000, 3600]; // Armonici cristallini

    for (let i = 0; i < frequencies.length; i++) {
      const startTime = now + i * 0.05;
      const osc = this.context.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = frequencies[i];

      const gain = this.context.createGain();
      gain.gain.setValueAtTime(0.15 - i * 0.03, startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(startTime);
      osc.stop(startTime + 0.3);
    }
  }

  /**
   * Raschio metallico (coltello) - 800-1500Hz, noise filtrato tagliente
   */
  private playMetalScrape(): void {
    if (!this.context || !this.masterGain) return;

    const now = this.context.currentTime;
    const duration = 0.2;
    const bufferSize = Math.floor(this.context.sampleRate * duration);
    const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      const t = i / bufferSize;
      const envelope = Math.exp(-t * 8);
      data[i] = (Math.random() * 2 - 1) * envelope;
    }

    const source = this.context.createBufferSource();
    source.buffer = buffer;

    const filter = this.context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(800, now);
    filter.frequency.linearRampToValueAtTime(1500, now + 0.1);
    filter.Q.value = 8;

    const gain = this.context.createGain();
    gain.gain.value = 0.25;

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    source.start(now);
    source.stop(now + duration);
  }

  /**
   * Fruscio fibra (corda) - noise 400-800Hz, distinctive whoosh
   */
  private playRopeSwish(): void {
    if (!this.context || !this.masterGain) return;

    const now = this.context.currentTime;
    const duration = 0.4; // Longer for better audibility
    const bufferSize = Math.floor(this.context.sampleRate * duration);
    const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      const t = i / bufferSize;
      // Envelope che cresce e poi decade (whoosh)
      const envelope = Math.sin(t * Math.PI) * Math.exp(-t * 2);
      data[i] = (Math.random() * 2 - 1) * envelope;
    }

    const source = this.context.createBufferSource();
    source.buffer = buffer;

    const filter = this.context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 800; // Higher for more presence
    filter.Q.value = 1.5;

    const gain = this.context.createGain();
    gain.gain.value = 0.5; // Much louder

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    source.start(now);
    source.stop(now + duration);
  }

  /**
   * Risonanza eterea (gemma_blu) - sine 600Hz + armonici, lungo sustain
   */
  private playCrystalResonance(): void {
    if (!this.context || !this.masterGain) return;

    const now = this.context.currentTime;
    const baseFreq = 600;
    const harmonics = [1, 2, 3, 5]; // Armonici dispari per suono etereo

    for (const harmonic of harmonics) {
      const osc = this.context.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = baseFreq * harmonic;

      const gain = this.context.createGain();
      const volume = 0.12 / harmonic;
      gain.gain.setValueAtTime(volume, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.5);
    }
  }

  /**
   * Pulsazione aliena (cristallo_alieno) - sweep 200-800Hz, distinctive alien sound
   */
  private playAlienCrystal(): void {
    if (!this.context || !this.masterGain) return;

    const now = this.context.currentTime;

    const osc = this.context.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.2);
    osc.frequency.exponentialRampToValueAtTime(300, now + 0.5);

    // Secondo oscillatore per battimenti alieni
    const osc2 = this.context.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(205, now);
    osc2.frequency.exponentialRampToValueAtTime(810, now + 0.2);
    osc2.frequency.exponentialRampToValueAtTime(305, now + 0.5);

    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0.4, now); // Much louder
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.55);

    osc.connect(gain);
    osc2.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.55);
    osc2.start(now);
    osc2.stop(now + 0.55);
  }

  /**
   * Ronzio elettrico (power_cell) - 60Hz + armoniche, buzz costante
   */
  private playElectricBuzz(): void {
    if (!this.context || !this.masterGain) return;

    const now = this.context.currentTime;
    const baseFreq = 60;

    // Fondamentale + armoniche pari (tipiche del ronzio elettrico)
    for (let i = 1; i <= 4; i++) {
      const osc = this.context.createOscillator();
      osc.type = i === 1 ? 'sawtooth' : 'sine';
      osc.frequency.value = baseFreq * i * 2;

      const gain = this.context.createGain();
      const volume = 0.08 / i;
      gain.gain.setValueAtTime(volume, now);
      gain.gain.setValueAtTime(volume, now + 0.2);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.3);
    }
  }

  /**
   * Gorgoglio chimico (fuel_cell) - noise modulato, liquido
   */
  private playLiquidGurgle(): void {
    if (!this.context || !this.masterGain) return;

    const now = this.context.currentTime;
    const duration = 0.35;
    const bufferSize = Math.floor(this.context.sampleRate * duration);
    const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
    const data = buffer.getChannelData(0);

    // Noise con modulazione "gorgogliante"
    for (let i = 0; i < bufferSize; i++) {
      const t = i / this.context.sampleRate;
      const modulation = Math.sin(t * 25) * 0.5 + 0.5; // Gorgoglio a 25Hz
      const envelope = Math.exp(-t * 4);
      data[i] = (Math.random() * 2 - 1) * envelope * modulation;
    }

    const source = this.context.createBufferSource();
    source.buffer = buffer;

    const filter = this.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 400;
    filter.Q.value = 3;

    const gain = this.context.createGain();
    gain.gain.value = 0.25;

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    source.start(now);
    source.stop(now + duration);
  }

  /**
   * Sequenza beep digitali (activation_key) - 800-1200Hz, pattern ritmico
   */
  private playTechBeep(): void {
    if (!this.context || !this.masterGain) return;

    const now = this.context.currentTime;
    const beeps = [
      { freq: 1000, time: 0, dur: 0.06 },
      { freq: 1200, time: 0.08, dur: 0.06 },
      { freq: 800, time: 0.16, dur: 0.06 },
      { freq: 1000, time: 0.24, dur: 0.1 },
    ];

    for (const beep of beeps) {
      const osc = this.context.createOscillator();
      osc.type = 'square';
      osc.frequency.value = beep.freq;

      const filter = this.context.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 2000;

      const gain = this.context.createGain();
      gain.gain.setValueAtTime(0.12, now + beep.time);
      gain.gain.setValueAtTime(0.12, now + beep.time + beep.dur - 0.01);
      gain.gain.linearRampToValueAtTime(0, now + beep.time + beep.dur);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now + beep.time);
      osc.stop(now + beep.time + beep.dur);
    }
  }

  // ========================================
  // SEQUENZA VITTORIA
  // ========================================

  /**
   * Riproduce la sequenza di lancio dell'astronave (vittoria!)
   * Durata totale: ~15 secondi
   */
  playLaunchSequence(): void {
    if (!this.context || !this.masterGain) return;

    const now = this.context.currentTime;

    // 1. IGNITION (0-2s): Rombo crescente basso
    this.playIgnition(now);

    // 2. POWER SURGE (2-4s): Sweep ascendente
    this.playPowerSurge(now + 2);

    // 3. LIFTOFF (4-8s): Rumble sostenuto
    this.playLiftoff(now + 4);

    // 4. ACCELERATION (8-12s): Pitch crescente
    this.playAcceleration(now + 8);

    // 5. VICTORY FANFARE (12-15s): Accordo trionfale
    this.playVictoryFanfare(now + 12);
  }

  private playIgnition(startTime: number): void {
    if (!this.context || !this.masterGain) return;

    const osc = this.context.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(30, startTime);
    osc.frequency.exponentialRampToValueAtTime(60, startTime + 2);

    const filter = this.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 100;

    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(0.4, startTime + 0.5);
    gain.gain.setValueAtTime(0.4, startTime + 1.8);
    gain.gain.linearRampToValueAtTime(0.5, startTime + 2);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(startTime);
    osc.stop(startTime + 2);
  }

  private playPowerSurge(startTime: number): void {
    if (!this.context || !this.masterGain) return;

    const osc = this.context.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(100, startTime);
    osc.frequency.exponentialRampToValueAtTime(800, startTime + 2);

    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0.3, startTime);
    gain.gain.linearRampToValueAtTime(0.5, startTime + 1);
    gain.gain.linearRampToValueAtTime(0.3, startTime + 2);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(startTime);
    osc.stop(startTime + 2);
  }

  private playLiftoff(startTime: number): void {
    if (!this.context || !this.masterGain) return;

    // Noise per rumble
    const duration = 4;
    const bufferSize = Math.floor(this.context.sampleRate * duration);
    const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const source = this.context.createBufferSource();
    source.buffer = buffer;

    const filter = this.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 150;

    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0.4, startTime);
    gain.gain.setValueAtTime(0.4, startTime + 3.5);
    gain.gain.linearRampToValueAtTime(0.2, startTime + 4);

    // Bass oscillator per profondita'
    const bassOsc = this.context.createOscillator();
    bassOsc.type = 'sine';
    bassOsc.frequency.value = 40;

    const bassGain = this.context.createGain();
    bassGain.gain.setValueAtTime(0.3, startTime);
    bassGain.gain.setValueAtTime(0.3, startTime + 3.5);
    bassGain.gain.linearRampToValueAtTime(0.1, startTime + 4);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    bassOsc.connect(bassGain);
    bassGain.connect(this.masterGain);

    source.start(startTime);
    source.stop(startTime + duration);
    bassOsc.start(startTime);
    bassOsc.stop(startTime + duration);
  }

  private playAcceleration(startTime: number): void {
    if (!this.context || !this.masterGain) return;

    const osc = this.context.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(80, startTime);
    osc.frequency.exponentialRampToValueAtTime(400, startTime + 4);

    const filter = this.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(200, startTime);
    filter.frequency.exponentialRampToValueAtTime(2000, startTime + 4);

    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0.25, startTime);
    gain.gain.linearRampToValueAtTime(0.35, startTime + 2);
    gain.gain.linearRampToValueAtTime(0.1, startTime + 4);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(startTime);
    osc.stop(startTime + 4);
  }

  private playVictoryFanfare(startTime: number): void {
    if (!this.context || !this.masterGain) return;

    // Accordo maggiore trionfale: Do-Mi-Sol-Do
    const frequencies = [261.63, 329.63, 392.00, 523.25]; // C4-E4-G4-C5
    const duration = 3;

    for (const freq of frequencies) {
      const osc = this.context.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;

      const gain = this.context.createGain();
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.2, startTime + 0.2);
      gain.gain.setValueAtTime(0.2, startTime + 2);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(startTime);
      osc.stop(startTime + duration);
    }

    // Arpeggio finale
    const arpeggioNotes = [523.25, 659.26, 783.99, 1046.50]; // C5-E5-G5-C6
    for (let i = 0; i < arpeggioNotes.length; i++) {
      const osc = this.context.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = arpeggioNotes[i];

      const gain = this.context.createGain();
      const noteStart = startTime + 0.5 + i * 0.15;
      gain.gain.setValueAtTime(0, noteStart);
      gain.gain.linearRampToValueAtTime(0.15, noteStart + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, noteStart + 0.5);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(noteStart);
      osc.stop(noteStart + 0.5);
    }
  }
}

// Singleton instance
export const audioEngine = new AudioEngine();
