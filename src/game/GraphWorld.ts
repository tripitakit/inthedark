import type { GameNode, LevelData, Direction, Lock } from '../types';

/**
 * GraphWorld - Gestisce il grafo del mondo di gioco
 */
export class GraphWorld {
  private nodes: Map<string, GameNode> = new Map();
  private levelData: LevelData | null = null;

  /**
   * Carica un livello dal JSON
   */
  loadLevel(data: LevelData): void {
    this.levelData = data;
    this.nodes.clear();

    for (const node of data.nodes) {
      this.nodes.set(node.id, node);
    }

    console.log(`Livello "${data.name}" caricato con ${data.nodes.length} nodi`);
  }

  /**
   * Ottiene il nodo di partenza
   */
  getStartNode(): string {
    return this.levelData?.startNode ?? '';
  }

  /**
   * Ottiene l'orientamento iniziale
   */
  getStartOrientation(): Direction {
    return this.levelData?.startOrientation ?? 'north';
  }

  /**
   * Ottiene un nodo per ID
   */
  getNode(nodeId: string): GameNode | undefined {
    return this.nodes.get(nodeId);
  }

  /**
   * Verifica se esiste una connessione in una direzione
   */
  getConnection(nodeId: string, direction: Direction): string | null {
    const node = this.nodes.get(nodeId);
    if (!node) return null;
    return node.connections[direction];
  }

  /**
   * Ottiene tutte le connessioni disponibili da un nodo
   */
  getAvailableConnections(nodeId: string): Direction[] {
    const node = this.nodes.get(nodeId);
    if (!node) return [];

    const directions: Direction[] = ['north', 'east', 'south', 'west'];
    return directions.filter((dir) => node.connections[dir] !== null);
  }

  /**
   * Ottiene il lock che blocca una connessione (se esiste)
   * Il lock è definito sul nodo di destinazione
   * Note: locks with unlocks="victory" don't block entry - they're interaction locks
   */
  getLock(nodeId: string, direction: Direction): Lock | null {
    const targetNodeId = this.getConnection(nodeId, direction);
    if (!targetNodeId) return null;

    const targetNode = this.nodes.get(targetNodeId);
    if (!targetNode) return null;

    const lock = targetNode.lock ?? null;

    // Victory locks don't block entry - they're used via interaction inside the room
    if (lock && lock.unlocks === 'victory') {
      return null;
    }

    return lock;
  }

  /**
   * Marks items as collected (used when loading a save)
   */
  markItemsCollected(collectedItemIds: string[]): void {
    for (const [, node] of this.nodes) {
      if (node.item && collectedItemIds.includes(node.item.id)) {
        node.item.collected = true;
      }
    }
  }

  /**
   * Debug: stampa struttura grafo
   */
  debugLog(): void {
    console.log('=== Graph World ===');
    for (const [id, node] of this.nodes) {
      const connections = Object.entries(node.connections)
        .filter(([, target]) => target !== null)
        .map(([dir, target]) => `${dir}→${target}`)
        .join(', ');
      console.log(`${id}: ${connections || 'nessuna connessione'}`);
    }
  }
}

// Singleton instance
export const graphWorld = new GraphWorld();
