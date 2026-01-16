import type { Direction, PlayerState, GameItem, SaveData } from '../types';

const SAVE_KEY = 'inthedark_save';

/**
 * GameState - Gestisce lo stato corrente del giocatore
 */
export class GameState {
  private state: PlayerState;
  private collectedItems: Set<string> = new Set();

  constructor(startNode: string, startOrientation: Direction = 'north') {
    this.state = {
      currentNode: startNode,
      orientation: startOrientation,
      inventory: [],
      selectedIndex: -1,
      unlockedPassages: [],
      visitedNodes: [startNode],
      discoveredEdges: [],
    };
  }

  get currentNode(): string {
    return this.state.currentNode;
  }

  get orientation(): Direction {
    return this.state.orientation;
  }

  get inventory(): GameItem[] {
    return [...this.state.inventory];
  }

  get selectedIndex(): number {
    return this.state.selectedIndex;
  }

  get selectedItem(): GameItem | null {
    if (this.state.selectedIndex < 0 || this.state.selectedIndex >= this.state.inventory.length) {
      return null;
    }
    return this.state.inventory[this.state.selectedIndex];
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
   * Aggiunge un oggetto all'inventario
   */
  addToInventory(item: GameItem): void {
    this.state.inventory.push(item);
    this.collectedItems.add(item.id);
    // Se è il primo oggetto, selezionalo automaticamente
    if (this.state.inventory.length === 1) {
      this.state.selectedIndex = 0;
    }
  }

  /**
   * Checks if an item has been collected (even if consumed)
   */
  wasItemCollected(itemId: string): boolean {
    return this.collectedItems.has(itemId);
  }

  /**
   * Seleziona l'oggetto successivo nell'inventario
   * @returns L'oggetto selezionato o null se inventario vuoto
   */
  selectNext(): GameItem | null {
    if (this.state.inventory.length === 0) {
      return null;
    }
    this.state.selectedIndex = (this.state.selectedIndex + 1) % this.state.inventory.length;
    return this.selectedItem;
  }

  /**
   * Seleziona l'oggetto precedente nell'inventario
   * @returns L'oggetto selezionato o null se inventario vuoto
   */
  selectPrev(): GameItem | null {
    if (this.state.inventory.length === 0) {
      return null;
    }
    this.state.selectedIndex = this.state.selectedIndex <= 0
      ? this.state.inventory.length - 1
      : this.state.selectedIndex - 1;
    return this.selectedItem;
  }

  /**
   * Rimuove l'oggetto selezionato dall'inventario (dopo uso su lock)
   * @returns L'oggetto rimosso o null
   */
  removeSelectedItem(): GameItem | null {
    if (this.state.selectedIndex < 0 || this.state.selectedIndex >= this.state.inventory.length) {
      return null;
    }
    const [removed] = this.state.inventory.splice(this.state.selectedIndex, 1);
    // Aggiusta l'indice se necessario
    if (this.state.inventory.length === 0) {
      this.state.selectedIndex = -1;
    } else if (this.state.selectedIndex >= this.state.inventory.length) {
      this.state.selectedIndex = this.state.inventory.length - 1;
    }
    return removed;
  }

  /**
   * Verifica se l'inventario contiene un oggetto con un certo ID
   */
  hasItem(itemId: string): boolean {
    return this.state.inventory.some(item => item.id === itemId);
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
   * Scopre un edge (corridoio) dal nodo corrente in una direzione
   */
  discoverEdge(nodeId: string, direction: Direction): void {
    const edgeKey = `${nodeId}:${direction}`;
    if (!this.state.discoveredEdges.includes(edgeKey)) {
      this.state.discoveredEdges.push(edgeKey);
    }
  }

  /**
   * Verifica se un edge è stato scoperto
   */
  isEdgeDiscovered(nodeId: string, direction: Direction): boolean {
    return this.state.discoveredEdges.includes(`${nodeId}:${direction}`);
  }

  /**
   * Debug: stampa stato corrente
   */
  debugLog(): void {
    console.log('=== Game State ===');
    console.log(`Posizione: ${this.state.currentNode}`);
    console.log(`Orientamento: ${this.state.orientation}`);
    console.log(`Inventario: ${this.state.inventory.map(i => i.id).join(', ') || 'vuoto'}`);
    console.log(`Selezionato: ${this.selectedItem?.id ?? 'nessuno'}`);
    console.log(`Nodi visitati: ${this.state.visitedNodes.length}`);
  }

  /**
   * Saves current game state to localStorage
   */
  save(): boolean {
    try {
      const saveData: SaveData = {
        currentNode: this.state.currentNode,
        orientation: this.state.orientation,
        inventory: this.state.inventory,
        selectedIndex: this.state.selectedIndex,
        unlockedPassages: this.state.unlockedPassages,
        visitedNodes: this.state.visitedNodes,
        discoveredEdges: this.state.discoveredEdges,
        collectedItems: Array.from(this.collectedItems),
        timestamp: Date.now(),
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
      console.log('Game saved successfully');
      return true;
    } catch (e) {
      console.error('Failed to save game:', e);
      return false;
    }
  }

  /**
   * Checks if a saved game exists
   */
  static hasSavedGame(): boolean {
    return localStorage.getItem(SAVE_KEY) !== null;
  }

  /**
   * Loads saved game data from localStorage
   */
  static loadSaveData(): SaveData | null {
    try {
      const data = localStorage.getItem(SAVE_KEY);
      if (!data) return null;
      return JSON.parse(data) as SaveData;
    } catch (e) {
      console.error('Failed to load save data:', e);
      return null;
    }
  }

  /**
   * Creates a GameState from saved data
   */
  static fromSaveData(saveData: SaveData): GameState {
    const state = new GameState(saveData.currentNode, saveData.orientation);
    state.state.inventory = saveData.inventory;
    state.state.selectedIndex = saveData.selectedIndex;
    state.state.unlockedPassages = saveData.unlockedPassages;
    state.state.visitedNodes = saveData.visitedNodes;
    state.state.discoveredEdges = saveData.discoveredEdges;
    state.collectedItems = new Set(saveData.collectedItems);
    return state;
  }

  /**
   * Deletes saved game
   */
  static deleteSave(): void {
    localStorage.removeItem(SAVE_KEY);
  }
}
