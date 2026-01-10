import { audioEngine } from './audio/AudioEngine';
import { Sonar } from './audio/Sonar';
import { GameState } from './game/GameState';
import { graphWorld } from './game/GraphWorld';
import { Movement } from './game/Movement';
import { InputHandler } from './input/InputHandler';
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
const statusElement = getRequiredElement('status');

// Stato globale
let gameState: GameState;
let movement: Movement;
let inputHandler: InputHandler;

/**
 * Aggiorna lo stato visualizzato
 */
function updateStatus(): void {
  if (!gameState || !movement) return;

  const node = graphWorld.getNode(gameState.currentNode);
  const nodeName = node?.name ?? gameState.currentNode;
  const orientation = movement.getOrientationLabel();

  statusElement.textContent = `${nodeName} | Orientamento: ${orientation}`;
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

  // Inizializza input handler con callback per aggiornare UI
  inputHandler = new InputHandler(movement, updateStatus);
  inputHandler.enable();

  // Aggiorna UI
  startScreen.classList.add('hidden');
  gameScreen.classList.add('active');
  updateStatus();

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
