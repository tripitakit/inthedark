import { audioEngine } from './audio/AudioEngine';
import { Sonar } from './audio/Sonar';
import { AmbienceManager } from './audio/AmbienceManager';
import { GameState } from './game/GameState';
import { graphWorld } from './game/GraphWorld';
import { Movement } from './game/Movement';
import { Interaction } from './game/Interaction';
import { InputHandler } from './input/InputHandler';
import { Minimap } from './ui/Minimap';
import testLevel from './data/levels/test-level.json';
import type { LevelData } from './types';

/**
 * In The Dark - Audio Game
 * Entry point principale
 */

// Elementi DOM (con validazione)
function getRequiredElement(id: string): HTMLElement {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Elemento DOM richiesto non trovato: #${id}`);
  }
  return element;
}

const startScreen = getRequiredElement('start-screen');
const gameScreen = getRequiredElement('game-screen');
const minimapElement = getRequiredElement('minimap');

// Stato globale
let gameState: GameState;
let movement: Movement;
let inputHandler: InputHandler;
let minimap: Minimap;

/**
 * Aggiorna la UI (minimap)
 */
function updateUI(): void {
  if (minimap) {
    minimap.render();
  }
}

/**
 * Inizializza il gioco dopo l'interazione utente
 */
async function startGame(): Promise<void> {
  console.log('Avvio gioco...');

  // Inizializza audio
  await audioEngine.init();

  // Carica livello di test
  graphWorld.loadLevel(testLevel as LevelData);
  graphWorld.debugLog();

  // Inizializza stato giocatore
  gameState = new GameState(
    graphWorld.getStartNode(),
    graphWorld.getStartOrientation()
  );
  gameState.debugLog();

  // Inizializza sistema movimento
  movement = new Movement(gameState);

  // Inizializza sistema sonar
  const sonar = new Sonar(audioEngine, graphWorld, gameState);
  movement.setSonar(sonar);

  // Inizializza sistema ambiente
  const ambienceManager = new AmbienceManager(audioEngine);
  ambienceManager.init();
  movement.setAmbienceManager(ambienceManager);

  // Imposta ambiente iniziale
  const startNode = graphWorld.getNode(graphWorld.getStartNode());
  if (startNode?.ambience) {
    ambienceManager.setAmbience(startNode.ambience);
  }

  // Inizializza sistema interazione
  const interaction = new Interaction(gameState, graphWorld);

  // Inizializza minimap
  minimap = new Minimap(minimapElement, graphWorld, gameState);

  // Inizializza input handler con callback per aggiornare UI
  inputHandler = new InputHandler(movement, updateUI);
  inputHandler.setInteraction(interaction);
  inputHandler.setMinimap(minimap);
  inputHandler.enable();

  // Aggiorna UI
  startScreen.classList.add('hidden');
  gameScreen.classList.add('active');
  updateUI();

  // Feedback presenza oggetto nel nodo iniziale
  if (startNode?.item && !startNode.item.collected) {
    audioEngine.playItemPresence();
  }

  console.log('Gioco avviato! Usa le frecce per muoverti.');
}

// Event listener per avvio gioco
function handleStart(event: Event): void {
  event.preventDefault();

  // Rimuovi listener dopo primo input
  startScreen.removeEventListener('click', handleStart);
  document.removeEventListener('keydown', handleStartKey);

  startGame();
}

function handleStartKey(event: KeyboardEvent): void {
  handleStart(event);
}

// Attendi interazione utente per avviare
startScreen.addEventListener('click', handleStart);
document.addEventListener('keydown', handleStartKey);

console.log('In The Dark - Premi un tasto per iniziare');
