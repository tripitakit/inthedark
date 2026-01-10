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
export type AmbientSoundType = 'waterDrip' | 'electricHum' | 'mechanicalBreath' | 'wind';

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

// Oggetto raccoglibile
export interface GameItem {
  id: string;
  sound: string;
  collected: boolean;
}

// Serratura
export interface Lock {
  id: string;
  requiredItem: string;
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
  heldItem: GameItem | null;
  unlockedPassages: string[];
  visitedNodes: string[];
}

// Definizione livello
export interface LevelData {
  id: string;
  name: string;
  startNode: string;
  startOrientation: Direction;
  nodes: GameNode[];
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
