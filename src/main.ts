import { audioEngine } from './audio/AudioEngine';
import { Sonar } from './audio/Sonar';
import { AmbienceManager } from './audio/AmbienceManager';
import { RoomNarrator } from './audio/RoomNarrator';
import { SurpriseEventManager } from './audio/SurpriseEventManager';
import { BinauralAudio } from './audio/BinauralAudio';
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
import type { LevelData, SaveData, GameMode } from './types';
import { NARRATION_DELAY, INITIAL_NARRATION_DELAY } from './constants';

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
const binauralAudioCheckbox = getRequiredElement('binaural-audio') as HTMLInputElement;
const modeEasyRadio = getRequiredElement('mode-easy') as HTMLInputElement;
const modeHardRadio = getRequiredElement('mode-hard') as HTMLInputElement;

// Global state
let gameState: GameState;
let movement: Movement;
let inputHandler: InputHandler;
let minimap: Minimap;
let inventoryUI: InventoryUI;
let roomInfoUI: RoomInfoUI;
let roomNarrator: RoomNarrator;
let surpriseEventManager: SurpriseEventManager;
let binauralAudio: BinauralAudio | null = null;

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
 * Get the selected game mode from radio buttons
 */
function getSelectedGameMode(): GameMode {
  return modeHardRadio.checked ? 'hard' : 'easy';
}

/**
 * Initialize game systems with given state
 */
async function initializeGame(state: GameState, saveData?: SaveData): Promise<void> {
  gameState = state;

  // Set game mode from UI selection (or restore from save data)
  const gameMode = saveData?.gameMode || getSelectedGameMode();
  gameState.setGameMode(gameMode);

  // Initialize movement system
  movement = new Movement(gameState);

  // Initialize binaural/HRTF audio if enabled
  const hrtfEnabled = binauralAudioCheckbox.checked;
  const context = audioEngine.getContext();
  if (context && hrtfEnabled) {
    binauralAudio = new BinauralAudio(context);
    binauralAudio.updateListenerOrientation(gameState.orientation);
    // Connect binaural audio to audioEngine for HRTF spatial sounds
    audioEngine.setBinauralAudio(binauralAudio);
    console.log('BinauralAudio (HRTF) initialized');
  }

  // Initialize sonar system
  const sonar = new Sonar(audioEngine, graphWorld, gameState);
  if (binauralAudio) {
    sonar.setBinauralAudio(binauralAudio);
  }
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
  inputHandler.setGameMode(gameMode);
  inputHandler.enable();

  // Set up room change listener for narration, surprise events, and item idle sounds
  gameState.onRoomChange((newRoomId, oldRoomId) => {
    // Stop all item idle loops from previous room
    if (oldRoomId) {
      audioEngine.stopAllItemIdleLoops();
    }

    // Start item idle loop for new room if it has an uncollected item
    const newNode = graphWorld.getNode(newRoomId);
    if (newNode?.item && !newNode.item.collected) {
      // Start idle loop with slight delay to let other sounds settle
      setTimeout(() => {
        audioEngine.playItemIdleLoop(newNode.item!.soundSignature, 0, 0);
      }, 1500);
    }

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
      // Delay narration so item chime is heard first
      setTimeout(() => {
        roomNarrator.narrateRoom(
          newRoomId,
          roomName,
          orientation,
          description
        );
      }, NARRATION_DELAY);
    }
  });

  // Update UI and show game screen
  startScreen.classList.remove('active');
  gameScreen.classList.add('active');

  // Show/hide UI elements based on game mode
  if (gameMode === 'easy') {
    controlsHelpElement.classList.add('active');
    inventoryElement.classList.add('active');
    roomInfoUI.setVisible(true);
    minimap.setVisible(true);
  } else {
    // HARD mode: hide all visual UI
    controlsHelpElement.classList.remove('active');
    inventoryElement.classList.remove('active');
    roomInfoUI.setVisible(false);
    minimap.setVisible(false);
  }
  updateUI();

  // Item presence feedback in starting room (only for new game)
  if (!saveData && currentNode?.item && !currentNode.item.collected) {
    audioEngine.playItemPresence();
  }

  // Start item idle loop for starting room if it has an uncollected item
  if (currentNode?.item && !currentNode.item.collected) {
    setTimeout(() => {
      audioEngine.playItemIdleLoop(currentNode.item!.soundSignature, 0, 0);
    }, 2000);
  }

  // Start surprise events for starting room
  surpriseEventManager.onRoomEnter(gameState.currentNode);

  // In HARD mode, speak controls first, then room narration
  // In EASY mode, just narrate the room
  if (gameMode === 'hard') {
    // Speak controls first
    setTimeout(() => {
      audioEngine.speakControls();
    }, INITIAL_NARRATION_DELAY);

    // Then narrate room after controls (with longer delay)
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
      }, INITIAL_NARRATION_DELAY + 12000); // Wait for controls to finish (~12s)
    }
  } else {
    // EASY mode: just narrate starting room if enabled
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
      }, INITIAL_NARRATION_DELAY);
    }
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
  console.log('New game started! Use arrow keys to face directions, Tab to walk.');
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

  // Restore game mode selection in UI
  if (saveData.gameMode === 'hard') {
    modeHardRadio.checked = true;
  } else {
    modeEasyRadio.checked = true;
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
  startNewGame().catch((error) => {
    console.error('Failed to start new game:', error);
  });
});

btnLoadGame.addEventListener('click', (e) => {
  e.preventDefault();
  e.stopPropagation();
  loadSavedGame().catch((error) => {
    console.error('Failed to load saved game:', error);
  });
});

console.log('In The Dark - Select an option to start');
