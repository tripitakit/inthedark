// Direzioni cardinali
export type Direction = 'north' | 'east' | 'south' | 'west';

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
  | 'shipAmbient' | 'metalCreak' | 'staticBurst' | 'alienVoice' | 'etherealMusic';

// Carattere del riverbero
export type ReverbCharacter = 'natural' | 'metallic';

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
  | 'glassChime'      // lanterna
  | 'metalScrape'     // coltello
  | 'ropeSwish'       // corda
  | 'crystalResonance'// gemma_blu
  | 'alienCrystal'    // cristallo_alieno
  | 'electricBuzz'    // power_cell
  | 'liquidGurgle'    // fuel_cell
  | 'techBeep';       // activation_key

// Oggetto raccoglibile
export interface GameItem {
  id: string;
  sound: string;
  soundSignature: ItemSoundSignature;
  collected: boolean;
}

// Serratura
export interface Lock {
  id: string;
  requiredItem: string;
  requiredSignature: ItemSoundSignature; // Firma sonora dell'oggetto richiesto (hint)
  unlocks: string;
  unlocked: boolean;
}

// Nodo del grafo
export interface GameNode {
  id: string;
  name: string;
  description?: string;
  connections: NodeConnections;
  ambience?: AmbienceConfig;
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
  collectedItems: string[]; // Item IDs collected from nodes
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
