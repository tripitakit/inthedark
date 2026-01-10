# Audio Game - Documento di Specifiche Tecniche

## 1. Overview del Progetto

### Concept

Audio-game web-based senza output visivo. Gioco di esplorazione in prima persona attraverso ambienti sonori, con puzzle basati su meccaniche chiave/serratura. Pensato sia per persone non vedenti che per persone vedenti come esperienza di percezione di un mondo virtuale senza la vista.

### Ambientazione

Progressione attraverso tre macro-ambienti con feeling fantascientifico astratto:

1. **Caverna naturale** - suoni organici, gocce d'acqua, riverbero diffuso naturale
2. **Labirinto sotterraneo** - transizione da naturale a costruito, echi più definiti
3. **Astronave sepolta** - ambiente alieno dormiente da millenni, ronzii elettrici, respiri meccanici lenti, riverbero metallico

### Caratteristiche Principali

- Nessun output visivo, solo audio
- Turn-based: il giocatore ha tutto il tempo per orientarsi e decidere
- Mondo definito come grafo di nodi interconnessi
- Puzzle sonori con meccanica oggetto/serratura

---

## 2. Tecnologie

### Stack Tecnologico

- **Piattaforma**: Web browser
- **Audio Engine**: Web Audio API
- **Sintesi Vocale**: Web Speech Synthesis API (fallback) + eventuale servizio cloud per voci di qualità
- **Linguaggio**: TypeScript
- **Asset Audio**: Tutti i suoni generati proceduralmente via Web Audio API (nessun file audio esterno)

### Requisiti Browser

- Supporto Web Audio API
- Interazione utente richiesta prima dell'avvio audio (schermata "Premi per iniziare")

---

## 3. Controlli

| Tasto                | Azione                                                    |
| -------------------- | --------------------------------------------------------- |
| ↑ (Freccia Su)       | Passo avanti di un nodo nella direzione corrente          |
| ← (Freccia Sinistra) | Rotazione di 90° a sinistra (senza avanzare)              |
| → (Freccia Destra)   | Rotazione di 90° a destra (senza avanzare)                |
| ↓ (Freccia Giù)      | Non attiva                                                |
| Enter                | Attiva sonar (bussola + ping ambiente)                    |
| Spazio               | Interazione (raccolta oggetto / uso oggetto su serratura) |

---

## 4. Sistema di Movimento

### Struttura del Mondo

Il mondo è rappresentato come un **grafo orientato**:

- Ogni **nodo** rappresenta una posizione/stanza
- Ogni nodo può avere **uscite** in 4 direzioni: Nord, Est, Sud, Ovest
- Il giocatore ha sempre un **orientamento** corrente (N/E/S/O)
- Il movimento "avanti" segue l'orientamento corrente

### Orientamento

- Il giocatore è sempre orientato verso una delle 4 direzioni cardinali
- Rotazione sinistra/destra cambia l'orientamento di 90°
- Sequenza: Nord → Ovest → Sud → Est → Nord (rotazione sinistra)
- Sequenza: Nord → Est → Sud → Ovest → Nord (rotazione destra)

### Movimento nel Grafo

- "Avanti": segue il collegamento nella direzione di orientamento (se esiste)
- Se il collegamento non esiste: movimento bloccato, suono di ostacolo
- Per tornare indietro il giocatore deve ruotare (2 rotazioni = inversione) e poi avanzare

---

## 5. Sistema Audio

### Layer Audio (3 livelli simultanei)

#### Layer 1: Riverbero Ambientale

- Comunica la "forma" e dimensione dello spazio
- Parametri dinamici per nodo:
  - Decay time (spazio piccolo vs grande)
  - Carattere (naturale/diffuso vs metallico/riflettente)
- Transizione graduale tra zone diverse

#### Layer 2: Audio Ambientale Spazializzato

- Suoni di ambiente posizionati nello spazio 3D
- Forniscono punti di riferimento passivi
- Esempi: acqua che scorre, vento, ronzii elettrici, respiri meccanici
- Usano Web Audio API PannerNode per spazializzazione

#### Layer 3: Sonar Attivo (su richiesta)

Attivato con tasto Enter, restituisce sequenza:

1. **Tono bussola**: indica direzione corrente di orientamento
2. **Ping di andata**: suono emesso dal giocatore (sweep 1200→800 Hz)
3. **Eco di ritorno**: solo dalla direzione frontale, stesso tono del ping ma filtrato

### Sonar - Dettagli Eco di Ritorno

L'eco arriva **solo dalla direzione in cui è rivolto il giocatore** e comunica la presenza o assenza di un passaggio attraverso il **delay temporale**:

| Situazione | Delay eco | Significato |
|------------|-----------|-------------|
| **Muro** (no passaggio) | ~150ms (breve) | Il suono rimbalza subito su una parete vicina |
| **Passaggio** aperto | ~450ms (lungo) | Il suono viaggia lontano prima di tornare |

**Caratteristiche dell'eco:**
- Stesso pattern frequenza del ping (1200→800 Hz)
- Filtro passa-basso applicato (simula il viaggio del suono)
- Passaggio: più filtrato (600 Hz cutoff) e attutito
- Muro: meno filtrato (1000 Hz cutoff) e più forte

### Toni Bussola

4 toni distintivi per le direzioni cardinali, organizzati per assi:

**Asse Nord-Sud: nota Do (C)**
- **Nord**: C5 (Do alto, 523 Hz)
- **Sud**: C4 (Do basso, 262 Hz)

**Asse Est-Ovest: nota Sol (G)**
- **Est**: G5 (Sol alto, 784 Hz)
- **Ovest**: G4 (Sol basso, 392 Hz)

Logica: ogni asse ha un timbro distintivo (Do vs Sol), e all'interno dell'asse il tono alto/basso indica la direzione.

---

## 6. Sistema Oggetti e Puzzle

### Meccanica Chiave/Serratura

- Oggetti sparsi nel mondo fungono da "chiavi"
- Punti specifici nel mondo fungono da "serrature"
- Un oggetto sblocca una specifica serratura (relazione 1:1)
- Sbloccare una serratura può: aprire passaggi, attivare meccanismi, rivelare nuovi oggetti

### Inventario

- **Capacità: 1 solo oggetto alla volta**
- Nessuna gestione inventario complessa
- Ritmo di gioco: trova oggetto → cerca serratura → usa → slot libero → cerca prossimo oggetto

### Interazione con Oggetti (tasto Spazio)

| Stato Giocatore | Contesto Nodo       | Risultato                        |
| --------------- | ------------------- | -------------------------------- |
| Mani vuote      | Oggetto presente    | Raccoglie oggetto                |
| Mani vuote      | Nessun oggetto      | Suono neutro "niente qui"        |
| Ha oggetto      | Serratura corretta  | Usa oggetto, sblocco, mani vuote |
| Ha oggetto      | Serratura sbagliata | Suono neutro "non funziona"      |
| Ha oggetto      | Nessuna serratura   | Suono neutro "non funziona"      |

### Comportamento Oggetto Già in Mano

Se il giocatore ha già un oggetto e ne trova un altro: **non può raccoglierlo**. Deve prima usare o abbandonare (opzionale: tasto per lasciare oggetto) quello corrente.

---

## 7. Feedback Sonori

### Tabella Completa dei Feedback

| Evento                                   | Suono                                                                 |
| ---------------------------------------- | --------------------------------------------------------------------- |
| Movimento valido                         | Suono passi + transizione a nuovo ambiente                            |
| Movimento bloccato (muro/ostacolo)       | Suono impatto/ostacolo                                                |
| Rotazione                                | Tono bussola della nuova direzione                                    |
| Enter (sonar)                            | Tono bussola → Ping andata → Eco ritorno                              |
| Spazio: raccolta oggetto                 | Suono distintivo raccolta + suono caratteristico dell'oggetto         |
| Spazio: niente da raccogliere            | Suono neutro A ("niente qui")                                         |
| Spazio: uso corretto oggetto             | Suono successo/sblocco + effetto ambientale (porta che si apre, ecc.) |
| Spazio: oggetto sbagliato o no serratura | Suono neutro B ("non funziona")                                       |
| Raggiungimento meta finale               | Suono vittoria + eventuale narrazione                                 |

### Sintesi Vocale

Usata per feedback testuali in punti salienti:

- Tutorial iniziale / istruzioni
- Messaggi narrativi chiave
- Conferme importanti (es. "Passaggio sbloccato")
- Suggerimenti opzionali

---

## 8. Struttura Dati Suggerita

### Nodo del Grafo

```javascript
{
  id: "caverna_01",
  name: "Ingresso Caverna",
  description: "Narrazione opzionale per sintesi vocale",

  // Connessioni (null se non esiste passaggio)
  connections: {
    north: "caverna_02",
    east: null,
    south: null,  // o "exit" per ingresso
    west: "caverna_03"
  },

  // Proprietà audio ambiente
  ambience: {
    type: "cave",
    reverbDecay: 2.5,
    reverbWet: 0.4,
    reverbCharacter: "natural",  // "natural" | "metallic"
    sounds: [
      { id: "drip1", type: "waterDrip", volume: 0.3 },
      { id: "wind1", type: "wind", volume: 0.15 }
    ]
  },

  // Oggetto raccoglibile (null se nessuno)
  item: {
    id: "crystal_key",
    sound: "crystal_hum",
    collected: false
  },

  // Serratura (null se nessuna)
  lock: {
    requiredItem: "crystal_key",
    unlocks: "caverna_02",  // o effetto da attivare
    unlocked: false
  }
}
```

### Stato del Giocatore

```javascript
{
  currentNode: "caverna_01",
  orientation: "north",  // north | east | south | west
  heldItem: null,        // o { id, sound }
  unlockedPassages: [],  // lista di lock sbloccati
  visitedNodes: []       // per eventuale mappa mentale / achievements
}
```

---

## 9. Architettura Moduli

### Moduli Principali

```
/src
  /audio
    AudioEngine.ts      # Gestione Web Audio API, contesto, master output, sintesi suoni
    Reverb.ts           # Riverbero algoritmico Schroeder (comb + allpass filters)
    AmbientSounds.ts    # Generatori procedurali (waterDrip, electricHum, mechanicalBreath, wind)
    AmbienceManager.ts  # Orchestrazione ambiente per nodo, transizioni
    Sonar.ts            # Logica sequenza sonar (bussola + ping + eco)
    SpatialAudio.ts     # Panner, calcolo pan relativo

  /game
    GameState.ts        # Stato corrente del gioco
    GraphWorld.ts       # Definizione e navigazione del grafo
    Movement.ts         # Logica movimento, rotazione, trigger transizioni ambiente
    Interaction.ts      # Logica raccolta/uso oggetti (TODO)
    Puzzle.ts           # Gestione chiavi/serrature (TODO)

  /input
    InputHandler.ts     # Gestione tastiera

  /speech
    Narrator.ts         # Sintesi vocale per messaggi (TODO)

  /data
    levels/             # Definizioni JSON dei livelli/grafi

  /types.ts             # Interfacce TypeScript
  main.ts               # Entry point, inizializzazione
  index.html            # Pagina con schermata start
```

---

## 10. Flusso di Gioco

### Avvio

1. Caricamento pagina → schermata iniziale (visivamente minimale o vuota)
2. Riproduzione automatica messaggio vocale introduttivo (breve, evocativo, senza spoiler sulla trama)
3. Messaggio vocale che chiede di premere un tasto per iniziare
4. Input utente → inizializzazione AudioContext
5. Caricamento assets audio
6. Posizionamento nel nodo iniziale, avvio ambiente sonoro

### Testo Introduzione Suggerito (da adattare)

> "Un mondo senza luce. Solo suoni. Ascolta, orientati, esplora. Premi un tasto per iniziare."

### Loop di Gioco

1. Giocatore ascolta ambiente
2. Giocatore preme tasto
3. Sistema processa input:
   - Movimento: aggiorna posizione, cambia ambiente
   - Rotazione: aggiorna orientamento
   - Enter: esegue sequenza sonar
   - Spazio: tenta interazione
4. Sistema riproduce feedback audio appropriato
5. Ritorno a punto 1

### Vittoria

- Raggiungimento nodo finale dopo aver risolto tutti i puzzle necessari
- Sequenza audio di vittoria
- Eventuale narrazione conclusiva

---

## 11. Considerazioni Accessibilità

- Tutti i controlli devono essere utilizzabili solo da tastiera
- Nessuna informazione critica solo visiva
- Sintesi vocale per messaggi testuali importanti
- Suoni distintivi e facilmente distinguibili
- Possibilità di ripetere istruzioni/tutorial
- Volume regolabile (o affidarsi a controlli sistema)
- Considerare supporto screen reader per menu/UI testuale

---

## 12. Suoni Procedurali Implementati

### Suoni di Sistema (AudioEngine.ts)

- [x] Suono passi (noise burst filtrato, 4 passi con intervallo 0.75s)
- [x] Suono ostacolo/muro (tono basso con decay)
- [x] Ping sonar (sweep 1200→800 Hz)
- [x] Eco sonar (ping filtrato, delay semantico)
- [x] Toni bussola (C4/C5 per N/S, G4/G5 per E/O)
- [x] Suono raccolta oggetto (arpeggio C5→E5→G5)
- [x] Suono sblocco serratura (click metallico + sweep ascendente)
- [x] Suono errore/rifiuto (tono basso discendente)
- [ ] Suono neutro A/B (TODO)

### Generatori Ambientali (AmbientSounds.ts)

- [x] **waterDrip**: Gocce d'acqua (noise burst + bandpass + random pitch)
- [x] **electricHum**: Ronzio elettrico (50Hz + armoniche + LFO)
- [x] **mechanicalBreath**: Respiro meccanico (noise + LFO lento 5s ciclo)
- [x] **wind**: Vento (pink noise + bandpass modulato)

### Riverbero Algoritmico (Reverb.ts)

- [x] Schroeder reverb: 4 comb filters + 2 allpass filters
- [x] Parametri dinamici: decay (0.5-5s), wet/dry mix
- [x] Character: "natural" vs "metallic" (delay times diversi)
- [x] Transizioni graduali tra configurazioni

---

## 13. Milestone Sviluppo Suggerite

### Milestone 1: Prototipo Movimento

- Setup progetto e Web Audio API
- Grafo di 4-5 nodi di test
- Movimento base con frecce
- Suono passi e ostacolo

### Milestone 2: Sistema Sonar

- Implementazione bussola
- Ping e eco base
- Spazializzazione audio

### Milestone 3: Ambiente Sonoro

- Riverbero dinamico
- Suoni ambientali spazializzati
- Transizioni tra zone

### Milestone 4: Sistema Puzzle

- Raccolta oggetti
- Meccanica serratura
- Feedback interazione

### Milestone 5: Contenuto

- Design livelli completi
- Assets audio definitivi
- Narrazione e sintesi vocale

### Milestone 6: Polish

- Bilanciamento audio
- Test accessibilità
- Test con utenti

---

## 14. Changelog

### Versione 1.5

**Milestone 4: Sistema Puzzle**

1. **Sistema interazione (Interaction.ts)**:
   - Nuova classe per gestire raccolta oggetti e uso chiavi
   - Logica contestuale: prima pickup, poi use su lock
   - Chiavi consumate quando usate

2. **Nuovi suoni procedurali (AudioEngine.ts)**:
   - `playPickup()`: arpeggio ascendente C5→E5→G5
   - `playUnlock()`: click metallico + sweep 200→400Hz
   - `playError()`: tono sawtooth 150→80Hz

3. **Verifica serrature (Movement.ts)**:
   - Controllo lock prima di muoversi
   - Passaggi bloccati finché non sbloccati con chiave

4. **Supporto lock (GraphWorld.ts)**:
   - Nuovo metodo `getLock(nodeId, direction)`
   - Lock definiti sul nodo di destinazione

5. **Integrazione input (InputHandler.ts)**:
   - Tasto Spazio collegato a `Interaction.interact()`
   - Metodo `setInteraction()` per dependency injection

6. **Configurazione test level**:
   - Centro: chiave_nord
   - Nord: porta bloccata (richiede chiave_nord)
   - Est: chiave_ovest
   - Ovest: porta bloccata (richiede chiave_ovest)

7. **Aggiornamento UI (main.ts)**:
   - Status mostra oggetto tenuto in mano

### Versione 1.4

**Miglioramento suono passi:**

1. **Camminata realistica (AudioEngine.ts)**:
   - Nuovo metodo `playFootsteps()` che riproduce 3 passi con intervallo di 0.5s
   - Metodo privato `playFootstepAt(startTime)` per scheduling preciso
   - Promise-based per sincronizzazione con transizione nodo

2. **Movimento asincrono (Movement.ts)**:
   - `moveForward()` ora è async e restituisce `Promise<boolean>`
   - I passi vengono riprodotti prima di entrare nel nuovo nodo
   - La transizione ambiente avviene solo dopo il completamento della camminata

3. **Prevenzione input multipli (InputHandler.ts)**:
   - Flag `isMoving` per bloccare input durante la camminata
   - Handler separato `handleMoveForward()` per gestione asincrona
   - Rotazioni e sonar restano istantanei

### Versione 1.3

**Milestone 3: Sistema Ambiente Sonoro**

1. **Riverbero algoritmico (Reverb.ts)**:
   - Implementazione Schroeder con 4 comb filters in parallelo + 2 allpass in serie
   - Allpass filters corretti con feedforward (-g) e feedback (+g) paths
   - Parametri dinamici: decay time, wet/dry mix, character (natural/metallic)
   - Transizioni graduali tra configurazioni

2. **Generatori ambientali procedurali (AmbientSounds.ts)**:
   - Base class astratta `BaseAmbientGenerator` per codice comune
   - 4 generatori: `waterDrip`, `electricHum`, `mechanicalBreath`, `wind`
   - Buffer di rumore cachati (white noise, pink noise) per efficienza
   - Fade in/out per transizioni smooth

3. **Orchestrazione ambiente (AmbienceManager.ts)**:
   - Gestione reverb globale + pool generatori attivi
   - Crossfade tra configurazioni durante movimento
   - Cleanup corretto dei timeout pendenti

4. **Integrazione movimento**:
   - `Movement.ts` triggera `transitionTo()` su cambio nodo
   - Ogni nodo ha configurazione ambience distinta

5. **Configurazione test level**:
   - Centro: caverna (gocce + vento, riverbero naturale)
   - Nord: caverna grande (decay maggiore)
   - Est: transizione (gocce + ronzio)
   - Sud: metallico (ronzio elettrico)
   - Ovest: meccanico (respiro lento)

### Versione 1.2

**Modifiche al sistema sonar:**

1. **Eco solo frontale**: L'eco del sonar ora arriva solo dalla direzione in cui il giocatore è rivolto, non più da tutte le direzioni.

2. **Delay semantico**: Il ritardo dell'eco comunica informazioni:
   - Eco veloce (~150ms) = muro vicino, nessun passaggio
   - Eco lento (~450ms) = spazio aperto, passaggio disponibile

3. **Eco come ping filtrato**: L'eco usa lo stesso pattern sonoro del ping (sweep 1200→800 Hz) ma con filtro passa-basso applicato per simulare il viaggio del suono.

### Versione 1.1

**Modifiche al sistema audio bussola:**

1. **Rotazione con feedback bussola**: La rotazione (frecce ← →) ora riproduce il tono bussola della nuova direzione raggiunta, invece di un suono generico di rotazione. Questo permette al giocatore di conoscere immediatamente il nuovo orientamento.

2. **Riorganizzazione frequenze bussola**: I toni sono ora organizzati per assi cardinali con note musicali specifiche:
   - Asse Nord-Sud: nota **Do (C)** a un'ottava di distanza (Nord = C5 alto, Sud = C4 basso)
   - Asse Est-Ovest: nota **Sol (G)** a un'ottava di distanza (Est = G5 alto, Ovest = G4 basso)

   Questa organizzazione rende più intuitivo distinguere gli assi (timbro diverso) e le direzioni all'interno di ogni asse (altezza diversa).

---

_Documento generato per utilizzo con claude-code_
_Versione: 1.5_
