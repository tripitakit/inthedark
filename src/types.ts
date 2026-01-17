// Direzioni cardinali
export type Direction = 'north' | 'east' | 'south' | 'west';

// Game modes
export type GameMode = 'easy' | 'hard';

// Surface types for footstep sounds
export type SurfaceType = 'stone' | 'metal' | 'grass' | 'water' | 'wood' | 'carpet' | 'crystal';

// Connessioni di un nodo (null se non c'è passaggio)
export interface NodeConnections {
  north: string | null;
  east: string | null;
  south: string | null;
  west: string | null;
}

// Tipi di generatori ambientali procedurali
export type AmbientSoundType =
  // Base
  | 'waterDrip' | 'electricHum' | 'mechanicalBreath' | 'wind'
  // Foresta
  | 'birdSong' | 'rustlingLeaves' | 'crickets' | 'streamFlow'
  // Grotte
  | 'caveEcho' | 'poolRipple' | 'deepWind' | 'deepRumble' | 'alienPulse'
  // Astronave
  | 'airlockSeal' | 'pipesCreak' | 'dormantConsole' | 'computerBeep'
  | 'dormantMotor' | 'hydraulics' | 'alienReactor' | 'energyPulse'
  | 'shipAmbient' | 'metalCreak' | 'staticBurst' | 'alienVoice' | 'etherealMusic'
  // Temple
  | 'stoneEcho' | 'chantingWhisper' | 'corridorWind' | 'ritualBells'
  | 'ancientHum' | 'stoneDrip'
  // Celestial
  | 'crystalHarmonic' | 'voidWhisper' | 'energyStream' | 'cosmicPulse'
  | 'harmonicResonance' | 'etherealShimmer';

// Carattere del riverbero
export type ReverbCharacter = 'natural' | 'metallic' | 'stone' | 'ethereal';

// Suono ambientale posizionato
export interface AmbientSound {
  id: string;
  type: AmbientSoundType;
  volume: number;
}

// Proprietà audio ambiente
export interface AmbienceConfig {
  type: string;
  reverbDecay: number;
  reverbWet: number;
  reverbCharacter: ReverbCharacter;
  sounds: AmbientSound[];
}

// Tipo di firma sonora per oggetti
export type ItemSoundSignature =
  // Original items
  | 'glassChime'      // lanterna
  | 'metalScrape'     // coltello
  | 'ropeSwish'       // corda
  | 'crystalResonance'// gemma_blu
  | 'alienCrystal'    // cristallo_alieno
  | 'electricBuzz'    // power_cell
  | 'liquidGurgle'    // fuel_cell
  | 'techBeep'        // activation_key
  // Temple items
  | 'templeBell'      // ritual_bell
  | 'stoneGrind'      // stone_tablet
  | 'monkChant'       // monk_medallion
  | 'chaliceRing'     // offering_chalice
  // Celestial items
  | 'crystalHum'      // crystal_shard
  | 'voidWhisper'     // void_essence
  | 'memoryEcho'      // memory_fragment
  | 'harmonicTone'    // harmonic_key
  | 'starlightPulse'  // starlight_core
  | 'cosmicResonance';// cosmic_sigil

// Oggetto raccoglibile
export interface GameItem {
  id: string;
  sound: string;
  soundSignature: ItemSoundSignature;
  collected: boolean;
}

// Serratura (single or multi-item)
export interface Lock {
  id: string;
  requiredItem: string;
  requiredSignature: ItemSoundSignature; // Firma sonora dell'oggetto richiesto (hint)
  requiredItem2?: string;                // Second item for multi-item locks
  requiredSignature2?: ItemSoundSignature;
  unlocks: string;
  unlocked: boolean;
}

// Sequence puzzle definition
export interface SequencePuzzle {
  id: string;
  roomId: string;                     // Room where puzzle is active
  type: 'sonar' | 'rotation' | 'visit'; // Type of action sequence
  sequence: Direction[];              // Required sequence of directions
  requiredItem?: string;              // Item that must be held during sequence
  reward: 'unlock' | 'reveal' | 'item'; // What happens on completion
  rewardTarget: string;               // ID of lock/room/item affected
  completed: boolean;
}

// Surprise audio event
export interface SurpriseEvent {
  id: string;
  type: 'random' | 'proximity' | 'story';
  rooms: string[];                    // Rooms where event can trigger
  probability?: number;               // For random events (0-1)
  intervalMin?: number;               // Min seconds between triggers
  intervalMax?: number;               // Max seconds between triggers
  proximityTarget?: string;           // Room to be near (for proximity)
  proximityDistance?: number;         // Max distance in rooms
  condition?: string;                 // Game state condition
  once?: boolean;                     // Only trigger once per game
  soundType: 'effect' | 'ambient' | 'voice';
  soundId?: string;                   // For effect/ambient
  voiceText?: string;                 // For voice narration
  triggered?: boolean;                // Track if already triggered (for once)
}

// Riddle hint for puzzles
export interface PuzzleHint {
  puzzleId: string;                   // Lock or sequence puzzle ID
  roomContext: string[];              // Rooms where hint is relevant
  hints: string[];                    // Progressive hints (0=vague, higher=clearer)
}

// Nodo del grafo
export interface GameNode {
  id: string;
  name: string;
  description?: string;
  connections: NodeConnections;
  ambience?: AmbienceConfig;
  surface?: SurfaceType;  // Floor surface for footstep sounds
  item?: GameItem | null;
  lock?: Lock | null;
}

// Stato del giocatore
export interface PlayerState {
  currentNode: string;
  orientation: Direction;
  inventory: GameItem[];      // Array di oggetti raccolti
  selectedIndex: number;      // Indice oggetto selezionato (-1 = nessuno)
  unlockedPassages: string[];
  visitedNodes: string[];
  discoveredEdges: string[]; // Formato: "nodeId:direction"
}

// Definizione livello
export interface LevelData {
  id: string;
  name: string;
  startNode: string;
  startOrientation: Direction;
  nodes: GameNode[];
}

// Save game data
export interface SaveData {
  currentNode: string;
  orientation: Direction;
  inventory: GameItem[];
  selectedIndex: number;
  unlockedPassages: string[];
  visitedNodes: string[];
  discoveredEdges: string[];
  collectedItems: string[];       // Item IDs collected from nodes
  triggeredEvents: string[];      // Story event IDs that have been triggered
  completedSequences: string[];   // Sequence puzzle IDs that are completed
  hintLevels: Record<string, number>; // Hint progression per puzzle
  gameMode: GameMode;             // Game difficulty mode
  timestamp: number;
}

// Rotazioni
export const ROTATION_LEFT: Record<Direction, Direction> = {
  north: 'west',
  west: 'south',
  south: 'east',
  east: 'north',
};

export const ROTATION_RIGHT: Record<Direction, Direction> = {
  north: 'east',
  east: 'south',
  south: 'west',
  west: 'north',
};
