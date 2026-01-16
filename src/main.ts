import { audioEngine } from './audio/AudioEngine';
import { Sonar } from './audio/Sonar';
import { AmbienceManager } from './audio/AmbienceManager';
import { GameState } from './game/GameState';
import { graphWorld } from './game/GraphWorld';
import { Movement } from './game/Movement';
import { Interaction } from './game/Interaction';
import { InputHandler } from './input/InputHandler';
import { Minimap } from './ui/Minimap';
import { InventoryUI } from './ui/InventoryUI';
import { RoomInfoUI } from './ui/RoomInfoUI';
import alienAdventure from './data/levels/alien-adventure.json';
import type { LevelData, SaveData } from './types';

/**
 * In The Dark - Audio Game
 * Entry point principale
 */

// DOM elements (with validation)
function getRequiredElement(id: string): HTMLElement {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Required DOM element not found: #${id}`);
  }
  return element;
}

const startScreen = getRequiredElement('start-screen');
const gameScreen = getRequiredElement('game-screen');
const minimapElement = getRequiredElement('minimap');
const inventoryElement = getRequiredElement('inventory');
const controlsHelpElement = getRequiredElement('controls-help');
const roomInfoElement = getRequiredElement('room-info');
const btnNewGame = getRequiredElement('btn-new-game') as HTMLButtonElement;
const btnLoadGame = getRequiredElement('btn-load-game') as HTMLButtonElement;

// Global state
let gameState: GameState;
let movement: Movement;
let inputHandler: InputHandler;
let minimap: Minimap;
let inventoryUI: InventoryUI;
let roomInfoUI: RoomInfoUI;

/**
 * Updates all UI components
 */
function updateUI(): void {
  if (minimap) {
    minimap.render();
  }
  if (inventoryUI) {
    inventoryUI.render();
  }
  if (roomInfoUI) {
    roomInfoUI.render();
  }
}

/**
 * Handle save game action
 */
function handleSaveGame(): void {
  if (gameState) {
    const success = gameState.save();
    if (success) {
      audioEngine.playSaveConfirm();
    }
  }
}

/**
 * Initialize game systems with given state
 */
async function initializeGame(state: GameState, saveData?: SaveData): Promise<void> {
  gameState = state;

  // Initialize movement system
  movement = new Movement(gameState);

  // Initialize sonar system
  const sonar = new Sonar(audioEngine, graphWorld, gameState);
  movement.setSonar(sonar);

  // Initialize ambience system
  const ambienceManager = new AmbienceManager(audioEngine);
  ambienceManager.init();
  movement.setAmbienceManager(ambienceManager);

  // Set ambience for current room
  const currentNode = graphWorld.getNode(gameState.currentNode);
  if (currentNode?.ambience) {
    ambienceManager.setAmbience(currentNode.ambience);
  }

  // Initialize interaction system
  const interaction = new Interaction(gameState, graphWorld);

  // Initialize minimap
  minimap = new Minimap(minimapElement, graphWorld, gameState);

  // Initialize inventory UI
  inventoryUI = new InventoryUI(inventoryElement, gameState);

  // Initialize room info UI
  roomInfoUI = new RoomInfoUI(roomInfoElement, gameState, graphWorld);

  // Initialize input handler with callbacks
  inputHandler = new InputHandler(movement, updateUI);
  inputHandler.setInteraction(interaction);
  inputHandler.setGameState(gameState);
  inputHandler.setOnSave(handleSaveGame);
  inputHandler.enable();

  // Update UI and show game screen
  startScreen.classList.add('hidden');
  gameScreen.classList.add('active');
  controlsHelpElement.classList.add('active');
  roomInfoUI.setVisible(true);
  updateUI();

  // Item presence feedback in starting room (only for new game)
  if (!saveData && currentNode?.item && !currentNode.item.collected) {
    audioEngine.playItemPresence();
  }

  console.log('Game initialized!');
}

/**
 * Start new game
 */
async function startNewGame(): Promise<void> {
  console.log('Starting new game...');

  // Initialize audio
  await audioEngine.init();

  // Load level
  graphWorld.loadLevel(alienAdventure as LevelData);
  graphWorld.debugLog();

  // Create new game state
  const state = new GameState(
    graphWorld.getStartNode(),
    graphWorld.getStartOrientation()
  );
  state.debugLog();

  await initializeGame(state);
  console.log('New game started! Use arrow keys to move.');
}

/**
 * Load saved game
 */
async function loadSavedGame(): Promise<void> {
  console.log('Loading saved game...');

  const saveData = GameState.loadSaveData();
  if (!saveData) {
    console.error('No save data found');
    return;
  }

  // Initialize audio
  await audioEngine.init();

  // Load level
  graphWorld.loadLevel(alienAdventure as LevelData);

  // Mark collected items in the world
  graphWorld.markItemsCollected(saveData.collectedItems);

  // Restore game state
  const state = GameState.fromSaveData(saveData);
  state.debugLog();

  await initializeGame(state, saveData);
  console.log('Game loaded!');
}

// Check for saved game on page load
if (GameState.hasSavedGame()) {
  btnLoadGame.classList.remove('hidden');
}

// Event listeners for buttons
btnNewGame.addEventListener('click', (e) => {
  e.preventDefault();
  e.stopPropagation();
  startNewGame();
});

btnLoadGame.addEventListener('click', (e) => {
  e.preventDefault();
  e.stopPropagation();
  loadSavedGame();
});

console.log('In The Dark - Select an option to start');
