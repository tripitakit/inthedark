import type { Direction, ItemSoundSignature } from '../types';

// Spoken direction names for compass
const DIRECTION_SPEECH: Record<Direction, string> = {
  north: 'North',
  east: 'East',
  south: 'South',
  west: 'West',
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
    this.masterGain.gain.value = 0.75; // Increased for better audibility
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
   * Speaks "Facing {direction}" when rotating
   */
  playCompassTone(direction: Direction): void {
    this.speakDirection('Facing', direction);
  }

  /**
   * Speaks "Walking {direction}" when moving forward
   */
  playWalkingDirection(direction: Direction): void {
    this.speakDirection('Walking', direction);
  }

  /**
   * Speaks "You picked up a {item name}" when collecting an item
   */
  speakPickup(itemName: string): void {
    if (!('speechSynthesis' in window)) {
      return;
    }

    const text = `You picked up a ${itemName}`;
    const utterance = new SpeechSynthesisUtterance(text);

    // Configure to match room narrator voice settings
    utterance.rate = 0.95;
    utterance.pitch = 0.5;
    utterance.volume = 1.0;
    utterance.lang = 'en-US';

    // Try to select an English male voice
    const voices = speechSynthesis.getVoices();
    const preferredMaleVoices = [
      'Microsoft David', 'Daniel', 'Alex', 'Google UK English Male',
      'Microsoft Mark', 'Thomas'
    ];

    let selectedVoice: SpeechSynthesisVoice | undefined;
    for (const name of preferredMaleVoices) {
      selectedVoice = voices.find((v) => v.name.includes(name));
      if (selectedVoice) break;
    }

    if (!selectedVoice) {
      const englishVoices = voices.filter(
        (v) => v.lang.startsWith('en-') || v.lang.startsWith('en_')
      );
      selectedVoice = englishVoices.find(
        (v) => v.name.toLowerCase().includes('male') && !v.name.toLowerCase().includes('female')
      ) || englishVoices.find(
        (v) => !v.name.toLowerCase().includes('female')
      ) || englishVoices[0];
    }

    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    speechSynthesis.speak(utterance);
  }

  /**
   * Speaks a direction phrase using Web Speech API
   */
  private speakDirection(prefix: string, direction: Direction): void {
    if (!('speechSynthesis' in window)) {
      console.log('AudioEngine: Web Speech API not supported');
      return;
    }

    // Cancel any pending speech to allow rapid direction changes
    speechSynthesis.cancel();

    const text = `${prefix} ${DIRECTION_SPEECH[direction]}`;
    const utterance = new SpeechSynthesisUtterance(text);

    // Configure to match room narrator voice settings
    utterance.rate = 0.95; // Slightly slower than normal
    utterance.pitch = 0.5; // Low pitch for mechanical tone
    utterance.volume = 1.0;
    utterance.lang = 'en-US';

    // Try to select an English male voice
    const voices = speechSynthesis.getVoices();
    const preferredMaleVoices = [
      'Microsoft David', 'Daniel', 'Alex', 'Google UK English Male',
      'Microsoft Mark', 'Thomas'
    ];

    // First try preferred male voices
    let selectedVoice: SpeechSynthesisVoice | undefined;
    for (const name of preferredMaleVoices) {
      selectedVoice = voices.find((v) => v.name.includes(name));
      if (selectedVoice) break;
    }

    // Fallback to any English male voice
    if (!selectedVoice) {
      const englishVoices = voices.filter(
        (v) => v.lang.startsWith('en-') || v.lang.startsWith('en_')
      );
      selectedVoice = englishVoices.find(
        (v) => v.name.toLowerCase().includes('male') && !v.name.toLowerCase().includes('female')
      ) || englishVoices.find(
        (v) => !v.name.toLowerCase().includes('female')
      ) || englishVoices[0];
    }

    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    speechSynthesis.speak(utterance);
  }

  /**
   * Speaks a toggle state change (e.g., "Narration on" or "Narration off")
   */
  speakToggle(feature: string, enabled: boolean): void {
    if (!('speechSynthesis' in window)) {
      return;
    }

    const text = `${feature} ${enabled ? 'on' : 'off'}`;
    const utterance = new SpeechSynthesisUtterance(text);

    utterance.rate = 0.95;
    utterance.pitch = 0.5;
    utterance.volume = 1.0;
    utterance.lang = 'en-US';

    // Try to select an English male voice
    const voices = speechSynthesis.getVoices();
    const preferredMaleVoices = [
      'Microsoft David', 'Daniel', 'Alex', 'Google UK English Male',
      'Microsoft Mark', 'Thomas'
    ];

    let selectedVoice: SpeechSynthesisVoice | undefined;
    for (const name of preferredMaleVoices) {
      selectedVoice = voices.find((v) => v.name.includes(name));
      if (selectedVoice) break;
    }

    if (!selectedVoice) {
      const englishVoices = voices.filter(
        (v) => v.lang.startsWith('en-') || v.lang.startsWith('en_')
      );
      selectedVoice = englishVoices.find(
        (v) => v.name.toLowerCase().includes('male') && !v.name.toLowerCase().includes('female')
      ) || englishVoices.find(
        (v) => !v.name.toLowerCase().includes('female')
      ) || englishVoices[0];
    }

    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    speechSynthesis.speak(utterance);
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
    const noteDuration = 0.18;
    const noteGap = 0.08;

    for (let i = 0; i < notes.length; i++) {
      const startTime = now + i * (noteDuration + noteGap);

      const osc = this.context.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = notes[i];

      const gain = this.context.createGain();
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.5, startTime + 0.03);
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
      // Original items
      case 'glassChime': this.playGlassChime(); break;
      case 'metalScrape': this.playMetalScrape(); break;
      case 'ropeSwish': this.playRopeSwish(); break;
      case 'crystalResonance': this.playCrystalResonance(); break;
      case 'alienCrystal': this.playAlienCrystal(); break;
      case 'electricBuzz': this.playElectricBuzz(); break;
      case 'liquidGurgle': this.playLiquidGurgle(); break;
      case 'techBeep': this.playTechBeep(); break;
      // Temple items
      case 'templeBell': this.playTempleBell(); break;
      case 'stoneGrind': this.playStoneGrind(); break;
      case 'monkChant': this.playMonkChant(); break;
      case 'chaliceRing': this.playChaliceRing(); break;
      // Celestial items
      case 'crystalHum': this.playCrystalHum(); break;
      case 'voidWhisper': this.playVoidWhisper(); break;
      case 'memoryEcho': this.playMemoryEcho(); break;
      case 'harmonicTone': this.playHarmonicTone(); break;
      case 'starlightPulse': this.playStarlightPulse(); break;
      case 'cosmicResonance': this.playCosmicResonance(); break;
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
  // FIRME SONORE TEMPIO
  // ========================================

  /**
   * Campana del tempio (ritual_bell) - risonanza metallica profonda
   */
  private playTempleBell(): void {
    if (!this.context || !this.masterGain) return;

    const now = this.context.currentTime;
    const baseFreq = 180;
    const duration = 1.5;

    // Main bell strike
    const osc1 = this.context.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.value = baseFreq;

    // Overtones (bell partials)
    const osc2 = this.context.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = baseFreq * 2.4;

    const osc3 = this.context.createOscillator();
    osc3.type = 'sine';
    osc3.frequency.value = baseFreq * 5.4;

    const gain1 = this.context.createGain();
    gain1.gain.setValueAtTime(0.3, now);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + duration);

    const gain2 = this.context.createGain();
    gain2.gain.setValueAtTime(0.15, now);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + duration * 0.6);

    const gain3 = this.context.createGain();
    gain3.gain.setValueAtTime(0.08, now);
    gain3.gain.exponentialRampToValueAtTime(0.01, now + duration * 0.3);

    osc1.connect(gain1);
    osc2.connect(gain2);
    osc3.connect(gain3);
    gain1.connect(this.masterGain);
    gain2.connect(this.masterGain);
    gain3.connect(this.masterGain);

    osc1.start(now);
    osc2.start(now);
    osc3.start(now);
    osc1.stop(now + duration);
    osc2.stop(now + duration * 0.6);
    osc3.stop(now + duration * 0.3);
  }

  /**
   * Pietra che si muove (stone_tablet) - rumore di sfregamento pietroso
   */
  private playStoneGrind(): void {
    if (!this.context || !this.masterGain) return;

    const now = this.context.currentTime;
    const duration = 0.4;
    const bufferSize = Math.floor(this.context.sampleRate * duration);
    const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      const t = i / bufferSize;
      const envelope = Math.sin(t * Math.PI);
      data[i] = (Math.random() * 2 - 1) * envelope;
    }

    const source = this.context.createBufferSource();
    source.buffer = buffer;

    const filter = this.context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(300, now);
    filter.frequency.linearRampToValueAtTime(600, now + duration);
    filter.Q.value = 3;

    const gain = this.context.createGain();
    gain.gain.value = 0.35;

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    source.start(now);
    source.stop(now + duration);
  }

  /**
   * Canto monaco (monk_medallion) - tono vocale mistico
   */
  private playMonkChant(): void {
    if (!this.context || !this.masterGain) return;

    const now = this.context.currentTime;
    const duration = 0.8;

    // Vocal formant synthesis
    const source = this.context.createOscillator();
    source.type = 'sawtooth';
    source.frequency.value = 120;

    const formants = [300, 800, 2500];
    const masterGain = this.context.createGain();
    masterGain.gain.setValueAtTime(0, now);
    masterGain.gain.linearRampToValueAtTime(0.2, now + 0.1);
    masterGain.gain.setValueAtTime(0.2, now + duration - 0.2);
    masterGain.gain.linearRampToValueAtTime(0.01, now + duration);

    for (const freq of formants) {
      const filter = this.context.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = freq;
      filter.Q.value = 10;

      const formantGain = this.context.createGain();
      formantGain.gain.value = 0.25;

      source.connect(filter);
      filter.connect(formantGain);
      formantGain.connect(masterGain);
    }

    masterGain.connect(this.masterGain);

    source.start(now);
    source.stop(now + duration);
  }

  /**
   * Tintinnio calice (offering_chalice) - risonanza metallica alta
   */
  private playChaliceRing(): void {
    if (!this.context || !this.masterGain) return;

    const now = this.context.currentTime;
    const frequencies = [1800, 2400, 3200];
    const duration = 0.6;

    for (let i = 0; i < frequencies.length; i++) {
      const osc = this.context.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = frequencies[i];

      const gain = this.context.createGain();
      gain.gain.setValueAtTime(0.12 - i * 0.03, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + duration);
    }
  }

  // ========================================
  // FIRME SONORE CELESTI
  // ========================================

  /**
   * Ronzio cristallino (crystal_shard) - tono alto costante con battimenti
   */
  private playCrystalHum(): void {
    if (!this.context || !this.masterGain) return;

    const now = this.context.currentTime;
    const duration = 0.5;

    const osc1 = this.context.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.value = 1200;

    const osc2 = this.context.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = 1205; // Slight detune for beating

    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.2, now + 0.05);
    gain.gain.setValueAtTime(0.2, now + duration - 0.1);
    gain.gain.linearRampToValueAtTime(0.01, now + duration);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.masterGain);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + duration);
    osc2.stop(now + duration);
  }

  /**
   * Sussurro del vuoto (void_essence) - suono etereo discendente
   */
  private playVoidWhisper(): void {
    if (!this.context || !this.masterGain) return;

    const now = this.context.currentTime;
    const duration = 0.7;

    const osc = this.context.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + duration);

    const filter = this.context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1000, now);
    filter.frequency.exponentialRampToValueAtTime(300, now + duration);
    filter.Q.value = 5;

    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.15, now + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + duration);
  }

  /**
   * Eco della memoria (memory_fragment) - arpeggio riverberato
   */
  private playMemoryEcho(): void {
    if (!this.context || !this.masterGain) return;

    const now = this.context.currentTime;
    const notes = [440, 550, 660, 550];
    const noteDuration = 0.15;
    const noteGap = 0.1;

    for (let i = 0; i < notes.length; i++) {
      const startTime = now + i * (noteDuration + noteGap);

      const osc = this.context.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = notes[i];

      const gain = this.context.createGain();
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.15 - i * 0.03, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + noteDuration * 2);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(startTime);
      osc.stop(startTime + noteDuration * 2);
    }
  }

  /**
   * Tono armonico (harmonic_key) - accordo puro celestiale
   */
  private playHarmonicTone(): void {
    if (!this.context || !this.masterGain) return;

    const now = this.context.currentTime;
    const frequencies = [330, 415, 495, 660]; // E-G#-B-E (E major)
    const duration = 0.6;

    for (const freq of frequencies) {
      const osc = this.context.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;

      const gain = this.context.createGain();
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.1, now + 0.05);
      gain.gain.setValueAtTime(0.1, now + duration - 0.15);
      gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + duration);
    }
  }

  /**
   * Pulsazione stellare (starlight_core) - sweep luminoso ascendente
   */
  private playStarlightPulse(): void {
    if (!this.context || !this.masterGain) return;

    const now = this.context.currentTime;
    const duration = 0.5;

    const osc = this.context.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(1600, now + duration * 0.7);
    osc.frequency.exponentialRampToValueAtTime(1200, now + duration);

    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.25, now + duration * 0.3);
    gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + duration);
  }

  /**
   * Risonanza cosmica (cosmic_sigil) - armonici ultraterreni
   */
  private playCosmicResonance(): void {
    if (!this.context || !this.masterGain) return;

    const now = this.context.currentTime;
    // Non-standard harmonic ratios for otherworldly feel
    const frequencies = [220, 293, 366, 488];
    const duration = 0.8;

    for (let i = 0; i < frequencies.length; i++) {
      const osc = this.context.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = frequencies[i];

      // Slight vibrato
      const lfo = this.context.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = 4 + i;

      const lfoGain = this.context.createGain();
      lfoGain.gain.value = 3;

      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);

      const gain = this.context.createGain();
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.12 - i * 0.02, now + 0.1);
      gain.gain.setValueAtTime(0.12 - i * 0.02, now + duration - 0.2);
      gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      lfo.start(now);
      osc.stop(now + duration);
      lfo.stop(now + duration);
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

  // ========================================
  // SURPRISE EVENT AUDIO
  // Atmospheric effects for immersion
  // ========================================

  /**
   * Play a surprise sound effect
   * @param soundId Identifier for the effect type
   */
  playSurpriseEffect(soundId: string): void {
    if (!this.context || !this.masterGain) return;
    console.log(`SurpriseEffect: ${soundId}`);

    switch (soundId) {
      case 'distantThunder': this.playDistantThunder(); break;
      case 'creepyWhisper': this.playCreepyWhisper(); break;
      case 'metalGroan': this.playMetalGroan(); break;
      case 'alienChirp': this.playAlienChirp(); break;
      case 'stoneShift': this.playStoneShift(); break;
      case 'etherealChoir': this.playEtherealChoir(); break;
      case 'heartbeat': this.playHeartbeat(); break;
      case 'staticBurst': this.playStaticBurst(); break;
      case 'deepRumble': this.playDeepRumble(); break;
      case 'crystalChime': this.playSurpriseCrystalChime(); break;
      default: this.playGenericSurpriseEffect(); break;
    }
  }

  /**
   * Play a surprise ambient layer
   * @param soundId Identifier for the ambient type
   */
  playSurpriseAmbient(soundId: string): void {
    if (!this.context || !this.masterGain) return;
    console.log(`SurpriseAmbient: ${soundId}`);

    switch (soundId) {
      case 'windGust': this.playWindGust(); break;
      case 'distantVoices': this.playDistantVoices(); break;
      case 'machineAwaken': this.playMachineAwaken(); break;
      case 'cosmicHum': this.playCosmicHum(); break;
      default: this.playGenericSurpriseEffect(); break;
    }
  }

  /**
   * Play voice narration using Web Speech API
   * @param text Text to speak
   */
  playVoiceNarration(text: string): void {
    if (!('speechSynthesis' in window)) {
      console.log(`VoiceNarration: "${text}" (Web Speech API not available)`);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 0.5;
    utterance.volume = 1.0;
    utterance.lang = 'en-US';

    const voices = speechSynthesis.getVoices();
    const preferredMaleVoices = [
      'Microsoft David', 'Daniel', 'Alex', 'Google UK English Male',
      'Microsoft Mark', 'Thomas'
    ];

    let selectedVoice: SpeechSynthesisVoice | undefined;
    for (const name of preferredMaleVoices) {
      selectedVoice = voices.find((v) => v.name.includes(name));
      if (selectedVoice) break;
    }

    if (!selectedVoice) {
      const englishVoices = voices.filter(
        (v) => v.lang.startsWith('en-') || v.lang.startsWith('en_')
      );
      selectedVoice = englishVoices.find(
        (v) => !v.name.toLowerCase().includes('female')
      ) || englishVoices[0];
    }

    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    speechSynthesis.speak(utterance);
  }

  // === SURPRISE EFFECT IMPLEMENTATIONS ===

  private playDistantThunder(): void {
    if (!this.context || !this.masterGain) return;
    const now = this.context.currentTime;

    // Low rumble with noise
    const bufferSize = this.context.sampleRate * 2;
    const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
    }

    const noise = this.context.createBufferSource();
    noise.buffer = buffer;

    const filter = this.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 150;

    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.4, now + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 2);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(now);
    noise.stop(now + 2);
  }

  private playCreepyWhisper(): void {
    if (!this.context || !this.masterGain) return;
    const now = this.context.currentTime;

    // Breathy noise with modulation
    const bufferSize = this.context.sampleRate;
    const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      const env = Math.sin(Math.PI * i / bufferSize);
      data[i] = (Math.random() * 2 - 1) * env * 0.3;
    }

    const noise = this.context.createBufferSource();
    noise.buffer = buffer;

    const filter = this.context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 800;
    filter.Q.value = 2;

    const gain = this.context.createGain();
    gain.gain.value = 0.25;

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(now);
  }

  private playMetalGroan(): void {
    if (!this.context || !this.masterGain) return;
    const now = this.context.currentTime;

    const osc = this.context.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(80, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 1.5);

    const filter = this.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(200, now);
    filter.frequency.exponentialRampToValueAtTime(100, now + 1.5);

    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.3, now + 0.2);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 1.5);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 1.5);
  }

  private playAlienChirp(): void {
    if (!this.context || !this.masterGain) return;
    const now = this.context.currentTime;

    for (let i = 0; i < 3; i++) {
      const osc = this.context.createOscillator();
      osc.type = 'sine';
      const startFreq = 2000 + Math.random() * 1000;
      osc.frequency.setValueAtTime(startFreq, now + i * 0.15);
      osc.frequency.exponentialRampToValueAtTime(startFreq * 0.5, now + i * 0.15 + 0.1);

      const gain = this.context.createGain();
      gain.gain.setValueAtTime(0, now + i * 0.15);
      gain.gain.linearRampToValueAtTime(0.15, now + i * 0.15 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.15 + 0.1);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now + i * 0.15);
      osc.stop(now + i * 0.15 + 0.12);
    }
  }

  private playStoneShift(): void {
    if (!this.context || !this.masterGain) return;
    const now = this.context.currentTime;

    // Grinding noise
    const bufferSize = this.context.sampleRate;
    const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.sin(Math.PI * i / bufferSize);
    }

    const noise = this.context.createBufferSource();
    noise.buffer = buffer;

    const filter = this.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 300;

    const gain = this.context.createGain();
    gain.gain.value = 0.35;

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(now);
  }

  private playEtherealChoir(): void {
    if (!this.context || !this.masterGain) return;
    const now = this.context.currentTime;

    const frequencies = [220, 330, 440, 550];
    for (const freq of frequencies) {
      const osc = this.context.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;

      const gain = this.context.createGain();
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.08, now + 0.5);
      gain.gain.linearRampToValueAtTime(0.08, now + 2);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 3);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 3);
    }
  }

  private playHeartbeat(): void {
    if (!this.context || !this.masterGain) return;
    const now = this.context.currentTime;

    for (let beat = 0; beat < 2; beat++) {
      const osc = this.context.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = 50;

      const gain = this.context.createGain();
      const beatTime = now + beat * 0.3;
      gain.gain.setValueAtTime(0, beatTime);
      gain.gain.linearRampToValueAtTime(0.4, beatTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, beatTime + 0.2);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(beatTime);
      osc.stop(beatTime + 0.25);
    }
  }

  private playStaticBurst(): void {
    if (!this.context || !this.masterGain) return;
    const now = this.context.currentTime;

    const bufferSize = this.context.sampleRate * 0.3;
    const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1);
    }

    const noise = this.context.createBufferSource();
    noise.buffer = buffer;

    const filter = this.context.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 2000;

    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(now);
    noise.stop(now + 0.3);
  }

  private playDeepRumble(): void {
    if (!this.context || !this.masterGain) return;
    const now = this.context.currentTime;

    const osc = this.context.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 30;

    const osc2 = this.context.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = 35;

    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.35, now + 0.5);
    gain.gain.linearRampToValueAtTime(0.35, now + 1.5);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 2.5);

    osc.connect(gain);
    osc2.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc2.start(now);
    osc.stop(now + 2.5);
    osc2.stop(now + 2.5);
  }

  private playSurpriseCrystalChime(): void {
    if (!this.context || !this.masterGain) return;
    const now = this.context.currentTime;

    const frequencies = [1200, 1500, 1800, 2400];
    for (let i = 0; i < frequencies.length; i++) {
      const osc = this.context.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = frequencies[i];

      const gain = this.context.createGain();
      gain.gain.setValueAtTime(0, now + i * 0.1);
      gain.gain.linearRampToValueAtTime(0.12, now + i * 0.1 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.8);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now + i * 0.1);
      osc.stop(now + i * 0.1 + 0.85);
    }
  }

  // === SURPRISE AMBIENT IMPLEMENTATIONS ===

  private playWindGust(): void {
    if (!this.context || !this.masterGain) return;
    const now = this.context.currentTime;

    const bufferSize = this.context.sampleRate * 3;
    const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      const env = Math.sin(Math.PI * i / bufferSize);
      data[i] = (Math.random() * 2 - 1) * env;
    }

    const noise = this.context.createBufferSource();
    noise.buffer = buffer;

    const filter = this.context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 400;
    filter.Q.value = 0.5;

    const gain = this.context.createGain();
    gain.gain.value = 0.25;

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(now);
  }

  private playDistantVoices(): void {
    if (!this.context || !this.masterGain) return;
    const now = this.context.currentTime;

    // Multiple filtered noise layers
    for (let i = 0; i < 3; i++) {
      const bufferSize = this.context.sampleRate * 2;
      const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
      const data = buffer.getChannelData(0);
      for (let j = 0; j < bufferSize; j++) {
        data[j] = (Math.random() * 2 - 1) * Math.sin(Math.PI * j / bufferSize);
      }

      const noise = this.context.createBufferSource();
      noise.buffer = buffer;

      const filter = this.context.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 300 + i * 200;
      filter.Q.value = 5;

      const gain = this.context.createGain();
      gain.gain.value = 0.08;

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      noise.start(now + i * 0.3);
    }
  }

  private playMachineAwaken(): void {
    if (!this.context || !this.masterGain) return;
    const now = this.context.currentTime;

    const osc = this.context.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(20, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 2);

    const filter = this.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(50, now);
    filter.frequency.exponentialRampToValueAtTime(500, now + 2);

    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.25, now + 1);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 3);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 3);
  }

  private playCosmicHum(): void {
    if (!this.context || !this.masterGain) return;
    const now = this.context.currentTime;

    const frequencies = [110, 165, 220, 275];
    for (const freq of frequencies) {
      const osc = this.context.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;

      const gain = this.context.createGain();
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.06, now + 1);
      gain.gain.linearRampToValueAtTime(0.06, now + 3);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 4);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 4);
    }
  }

  /**
   * Generic surprise effect - eerie tone (fallback)
   */
  private playGenericSurpriseEffect(): void {
    if (!this.context || !this.masterGain) return;

    const now = this.context.currentTime;

    const osc = this.context.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.5);

    const filter = this.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 600;

    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.2, now + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.5);
  }
}

// Singleton instance
export const audioEngine = new AudioEngine();
