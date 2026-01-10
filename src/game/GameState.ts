import type { Direction, PlayerState, GameItem } from '../types';

/**
 * GameState - Gestisce lo stato corrente del giocatore
 */
export class GameState {
  private state: PlayerState;

  constructor(startNode: string, startOrientation: Direction = 'north') {
    this.state = {
      currentNode: startNode,
      orientation: startOrientation,
      heldItem: null,
      unlockedPassages: [],
      visitedNodes: [startNode],
    };
  }

  get currentNode(): string {
    return this.state.currentNode;
  }

  get orientation(): Direction {
    return this.state.orientation;
  }

  get heldItem(): GameItem | null {
    return this.state.heldItem;
  }

  get visitedNodes(): string[] {
    return [...this.state.visitedNodes];
  }

  /**
   * Aggiorna la posizione corrente
   */
  setCurrentNode(nodeId: string): void {
    this.state.currentNode = nodeId;
    if (!this.state.visitedNodes.includes(nodeId)) {
      this.state.visitedNodes.push(nodeId);
    }
  }

  /**
   * Aggiorna l'orientamento
   */
  setOrientation(direction: Direction): void {
    this.state.orientation = direction;
  }

  /**
   * Raccoglie un oggetto
   */
  pickUpItem(item: GameItem): boolean {
    if (this.state.heldItem !== null) {
      return false; // Già ha un oggetto
    }
    this.state.heldItem = item;
    return true;
  }

  /**
   * Usa/lascia l'oggetto corrente
   */
  dropItem(): GameItem | null {
    const item = this.state.heldItem;
    this.state.heldItem = null;
    return item;
  }

  /**
   * Registra un passaggio sbloccato
   */
  unlockPassage(lockId: string): void {
    if (!this.state.unlockedPassages.includes(lockId)) {
      this.state.unlockedPassages.push(lockId);
    }
  }

  /**
   * Verifica se un passaggio è sbloccato
   */
  isPassageUnlocked(lockId: string): boolean {
    return this.state.unlockedPassages.includes(lockId);
  }

  /**
   * Debug: stampa stato corrente
   */
  debugLog(): void {
    console.log('=== Game State ===');
    console.log(`Posizione: ${this.state.currentNode}`);
    console.log(`Orientamento: ${this.state.orientation}`);
    console.log(`Oggetto: ${this.state.heldItem?.id ?? 'nessuno'}`);
    console.log(`Nodi visitati: ${this.state.visitedNodes.length}`);
  }
}
