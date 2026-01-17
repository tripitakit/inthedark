import { audioEngine } from './audio/AudioEngine';
import { Sonar } from './audio/Sonar';
import { AmbienceManager } from './audio/AmbienceManager';
import { RoomNarrator } from './audio/RoomNarrator';
import { SurpriseEventManager } from './audio/SurpriseEventManager';
import { GameState } from './game/GameState';
import { graphWorld } from './game/GraphWorld';
import { Movement } from './game/Movement';
import { Interaction } from './game/Interaction';
import { HintSystem } from './game/HintSystem';
import { InputHandler } from './input/InputHandler';
import { Minimap } from './ui/Minimap';
import { InventoryUI } from './ui/InventoryUI';
import { RoomInfoUI } from './ui/RoomInfoUI';
import alienAdventure from './data/levels/alien-adventure.json';
import { SURPRISE_EVENTS } from './data/surpriseEvents';
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
const voiceNarrationCheckbox = getRequiredElement('voice-narration') as HTMLInputElement;

// Global state
let gameState: GameState;
let movement: Movement;
let inputHandler: InputHandler;
let minimap: Minimap;
let inventoryUI: InventoryUI;
let roomInfoUI: RoomInfoUI;
let roomNarrator: RoomNarrator;
let surpriseEventManager: SurpriseEventManager;

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

  // Initialize hint system
  const hintSystem = new HintSystem(gameState, audioEngine);

  // Initialize surprise event manager for atmospheric effects
  surpriseEventManager = new SurpriseEventManager(audioEngine, gameState);
  surpriseEventManager.registerEvents(SURPRISE_EVENTS);

  // Initialize room narrator with checkbox state
  const narrationEnabled = voiceNarrationCheckbox.checked;
  roomNarrator = new RoomNarrator(audioEngine, narrationEnabled);

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
  inputHandler.setHintSystem(hintSystem);
  inputHandler.setRoomNarrator(roomNarrator);
  inputHandler.setOnSave(handleSaveGame);
  inputHandler.setOnNarrationToggle((enabled) => {
    voiceNarrationCheckbox.checked = enabled;
  });
  inputHandler.enable();

  // Set up room change listener for narration and surprise events
  gameState.onRoomChange((newRoomId, oldRoomId) => {
    // Trigger surprise events for room transition
    if (oldRoomId) {
      surpriseEventManager.onRoomLeave();
    }
    surpriseEventManager.onRoomEnter(newRoomId);

    // Narrate the new room (with delay to let item presence sound play first)
    const node = graphWorld.getNode(newRoomId);
    if (node?.description) {
      const roomName = node.name || newRoomId;
      const orientation = gameState.orientation;
      const description = node.description;
      // Delay narration by 1s so item chime is heard first
      setTimeout(() => {
        roomNarrator.narrateRoom(
          newRoomId,
          roomName,
          orientation,
          description
        );
      }, 1000);
    }
  });

  // Update UI and show game screen
  startScreen.classList.add('hidden');
  gameScreen.classList.add('active');
  controlsHelpElement.classList.add('active');
  inventoryElement.classList.add('active');
  roomInfoUI.setVisible(true);
  updateUI();

  // Item presence feedback in starting room (only for new game)
  if (!saveData && currentNode?.item && !currentNode.item.collected) {
    audioEngine.playItemPresence();
  }

  // Start surprise events for starting room
  surpriseEventManager.onRoomEnter(gameState.currentNode);

  // Narrate starting room if enabled (with a small delay to let audio init)
  if (narrationEnabled && currentNode?.description) {
    const startRoomName = currentNode.name || gameState.currentNode;
    const startDescription = currentNode.description;
    setTimeout(() => {
      roomNarrator.narrateRoom(
        gameState.currentNode,
        startRoomName,
        gameState.orientation,
        startDescription,
        true
      );
    }, 500);
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
